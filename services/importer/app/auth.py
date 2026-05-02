"""Validate webhook Authorization: Bearer <token> vs ingestion_users.api_key_sha256."""
from __future__ import annotations

import hashlib

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import IngestionUser


def _sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def get_ingestion_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> IngestionUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Authorization Bearer token required",
        )
    raw = authorization.removeprefix("Bearer ").strip()
    digest = _sha256_hex(raw)
    user = (
        db.query(IngestionUser)
        .filter(
            IngestionUser.api_key_sha256 == digest,
            IngestionUser.active.is_(True),
        )
        .one_or_none()
    )
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        )
    return user
