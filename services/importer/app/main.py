"""FastAPI ingress: Bearer auth, idempotent batches, enqueue RQ worker."""

from __future__ import annotations

from redis import Redis
from rq import Queue
from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from app.auth import get_ingestion_user
from app.config import get_settings
from app.db import get_db
from app.models import IngestionBatch, IngestionBatchStatus, IngestionUser
from app.schemas import WebhookAccepted, WebhookBody
from app.tasks import process_batch

app = FastAPI(title="ContactDex aggregator ingest")


def _queue() -> Queue:
    s = get_settings()
    return Queue(s.rq_queue_name, connection=Redis.from_url(s.redis_url))


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/webhooks/connections", response_model=WebhookAccepted)
def ingest_connections(
    body: WebhookBody,
    user: IngestionUser = Depends(get_ingestion_user),
    db: Session = Depends(get_db),
) -> WebhookAccepted:
    payload_connections = [
        c.model_dump(mode="json", by_alias=True, exclude_none=False)
        for c in body.connections
    ]

    existing = (
        db.query(IngestionBatch)
        .filter(
            IngestionBatch.user_id == user.id,
            IngestionBatch.idempotency_key == body.idempotency_key,
        )
        .one_or_none()
    )
    if existing is not None:
        return WebhookAccepted(
            batch_id=str(existing.id),
            queued=False,
            message="idempotent replay: batch already recorded",
        )

    batch = IngestionBatch(
        user_id=user.id,
        idempotency_key=body.idempotency_key,
        payload={"connections": payload_connections},
        status=IngestionBatchStatus.pending.value,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    _queue().enqueue(process_batch, str(batch.id))

    return WebhookAccepted(
        batch_id=str(batch.id),
        queued=True,
        message="batch enqueued",
    )
