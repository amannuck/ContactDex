"""Background job: persist snapshots, diff keys, optional ContactDex bridge (sync httpx)."""

from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime
from uuid import UUID

import httpx
from sqlalchemy import distinct, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_session_factory
from app.models import (
    ConnectionSnapshot,
    ImportEvent,
    ImportEventType,
    IngestionBatch,
    IngestionBatchStatus,
    Notification,
)

log = logging.getLogger(__name__)


def _slug_from_url(url: str) -> str | None:
    u = url.strip().rstrip("/")
    if not u:
        return None
    part = u.split("/")[-1].split("?")[0]
    return part[:512] if part else None


def normalize_external_person_key(record: dict) -> str:
    epk = str(record.get("external_person_key") or "").strip()
    if epk:
        return epk[:512]
    slug_raw = (
        record.get("profile_url")
        or record.get("profileUrl")
        or record.get("linkedin_url")
        or ""
    )
    s = _slug_from_url(str(slug_raw))
    if s:
        return f"linkedin:{s}"
    name = (record.get("name") or "").strip().encode()
    return f"name:{hashlib.sha256(name).hexdigest()}"


def _flatten_connection(row: dict) -> dict:
    name = str(row.get("name") or "").strip()
    if not name:
        raise ValueError("missing name")
    av = row.get("avatar")
    avatar = av.strip() if isinstance(av, str) and av.strip() else None
    return {
        "name": name,
        "headline": row.get("headline") if row.get("headline") not in (None, "") else None,
        "company": row.get("company") if row.get("company") not in (None, "") else None,
        "profile_url": row.get("profile_url")
        or row.get("profileUrl")
        or row.get("linkedin_url"),
        "avatar": avatar,
    }


def _bridge_sync(settings, row: dict) -> str:
    """POST one new contact to Next.js importer route."""
    if not settings.contactdex_bridge_url or not settings.contactdex_import_secret:
        return "skipped:no_bridge_env"
    ek = row["external_person_key"]
    bio_parts = []
    if row.get("headline"):
        bio_parts.append(str(row["headline"]))
    if row.get("company"):
        bio_parts.append(f"Company: {row['company']}")
    bio = ". ".join(bio_parts) if bio_parts else "LinkedIn connection (aggregator import)."
    if row.get("profile_url"):
        bio = f"{bio} Profile: {row['profile_url']}"
    contact_body: dict = {
        "name": row["name"],
        "bio": bio,
        "tags": ["LinkedIn", "Importer"],
        "moveset": [],
        "linkedinExternalKey": ek,
    }
    if row.get("avatar"):
        contact_body["avatar"] = row["avatar"]

    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(
                settings.contactdex_bridge_url.rstrip("/"),
                headers={
                    "Authorization": f"Bearer {settings.contactdex_import_secret}",
                },
                json={"contacts": [contact_body]},
            )
        if r.status_code and 200 <= r.status_code < 300:
            return "ok"
        return f"failed:{r.status_code}:{r.text[:400]}"
    except Exception as e:
        log.warning("bridge error: %s", e)
        return f"failed:exception:{e!s}"[:500]


def _update_bridge_status(sess: Session, batch_id: UUID, ek: str, status: str) -> None:
    ev = sess.execute(
        select(ImportEvent)
        .where(
            ImportEvent.batch_id == batch_id,
            ImportEvent.external_person_key == ek,
            ImportEvent.event_type == ImportEventType.new.value,
        )
        .order_by(ImportEvent.created_at.desc())
        .limit(1),
    ).scalar_one_or_none()
    if ev:
        ev.bridge_status = status
        sess.add(ev)
        sess.commit()


def process_batch(batch_id_str: str) -> None:
    settings = get_settings()
    sid = UUID(batch_id_str)

    sess: Session = get_session_factory()()

    try:
        batch = sess.get(IngestionBatch, sid)
        if batch is None:
            return
        if batch.status == IngestionBatchStatus.done.value:
            return

        batch.status = IngestionBatchStatus.processing.value
        batch.error_message = None
        sess.commit()

        uid = batch.user_id
        prior_stmt = select(distinct(ConnectionSnapshot.external_person_key)).where(
            ConnectionSnapshot.user_id == uid,
        )
        prior_keys = {r[0] for r in sess.execute(prior_stmt).all()}

        incoming = batch.payload.get("connections") or []
        if isinstance(incoming, dict):
            incoming = incoming.get("items") or []

        normalized_count = 0
        news: list[dict] = []
        captured = datetime.now(UTC)

        for raw in incoming:
            if not isinstance(raw, dict):
                continue
            try:
                flat = _flatten_connection(raw)
            except ValueError:
                continue
            ek = normalize_external_person_key(raw)

            sess.add(
                ConnectionSnapshot(
                    user_id=uid,
                    batch_id=batch.id,
                    external_person_key=ek,
                    name=flat["name"],
                    headline=flat.get("headline"),
                    company=flat.get("company"),
                    profile_url=(
                        str(flat["profile_url"]) if flat.get("profile_url") else None
                    ),
                    raw_extra={k: v for k, v in raw.items()},
                    captured_at=captured,
                ),
            )

            ev_type = ImportEventType.noop.value
            merged = {**flat, "external_person_key": ek}
            if ek not in prior_keys:
                ev_type = ImportEventType.new.value
                prior_keys.add(ek)
                news.append(merged)

            sess.add(
                ImportEvent(
                    user_id=uid,
                    batch_id=batch.id,
                    external_person_key=ek,
                    event_type=ev_type,
                    payload={"name": flat["name"], "phase": ev_type},
                ),
            )
            normalized_count += 1

        sess.add(
            Notification(
                user_id=uid,
                kind="connections_batch_processed",
                payload={
                    "batch_id": str(batch.id),
                    "incoming": normalized_count,
                    "new": len(news),
                },
            ),
        )
        sess.commit()

        for row in news:
            st = _bridge_sync(settings, row)
            _update_bridge_status(sess, batch.id, row["external_person_key"], st)

        batch.status = IngestionBatchStatus.done.value
        sess.add(batch)
        sess.commit()

    except Exception as e:
        log.exception("process_batch failed %s", batch_id_str)
        sess.rollback()
        batch = sess.get(IngestionBatch, sid)
        if batch:
            batch.status = IngestionBatchStatus.failed.value
            batch.error_message = str(e)[:2000]
            sess.add(batch)
            sess.commit()
    finally:
        sess.close()
