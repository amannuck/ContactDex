"""Initial importer schema and seeded API user.

Revision ID: 001_initial
Revises:
Create Date: 2026-05-02

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_USER_ID = "00000000-0000-4000-8000-000000000001"
SEED_API_KEY_SHA256 = (
    "5b325d9feb4fd5ad0b2e4d017682473aaac0db18b74e2db3d87ed0225b7f28c0"
)


def upgrade() -> None:
    op.create_table(
        "ingestion_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("api_key_sha256", sa.String(length=64), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("api_key_sha256"),
    )

    op.create_table(
        "ingestion_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=512), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["ingestion_users.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_batch_idempotency"),
    )

    op.create_table(
        "connection_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_person_key", sa.String(length=512), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("headline", sa.Text(), nullable=True),
        sa.Column("company", sa.Text(), nullable=True),
        sa.Column("profile_url", sa.Text(), nullable=True),
        sa.Column(
            "raw_extra",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "captured_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["ingestion_batches.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["ingestion_users.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_snapshots_user_person_time",
        "connection_snapshots",
        ["user_id", "external_person_key", "captured_at"],
        unique=False,
    )

    op.create_table(
        "import_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_person_key", sa.String(length=512), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("bridge_status", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["ingestion_batches.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["ingestion_users.id"],
            ondelete="CASCADE",
        ),
    )

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["ingestion_users.id"],
            ondelete="CASCADE",
        ),
    )

    op.execute(
        sa.text("""
            INSERT INTO ingestion_users (id, label, api_key_sha256, active)
            VALUES (
                CAST(:uid AS UUID),
                'default-aggregator-webhook',
                :sha,
                TRUE
            )
            ON CONFLICT (api_key_sha256) DO NOTHING
        """).bindparams(
            uid=SEED_USER_ID,
            sha=SEED_API_KEY_SHA256,
        ),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_index("ix_snapshots_user_person_time", table_name="connection_snapshots")
    op.drop_table("connection_snapshots")
    op.drop_table("import_events")
    op.drop_table("ingestion_batches")
    op.drop_table("ingestion_users")
