"""Pydantic models for aggregator webhook payloads (flex Clay/Zapier shapes)."""

from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, Field, model_validator


def strip_empty_strings(v):
    return v.strip() if isinstance(v, str) else v


class ConnectionInbound(BaseModel):
    model_config = {"extra": "allow"}

    name: Annotated[str, BeforeValidator(strip_empty_strings)]
    headline: str | None = None
    company: str | None = None
    external_person_key: str | None = Field(default=None)
    profile_url: str | None = Field(default=None, alias="profileUrl")
    linkedin_url: str | None = None
    avatar: str | None = Field(
        default=None,
        description="Portrait URL (demo or CDN); forwarded to Dex when bridge runs.",
    )


class WebhookBody(BaseModel):
    idempotency_key: str = Field(..., min_length=1, max_length=512)
    connections: list[ConnectionInbound] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def unwrap_nested_connections(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        c = data.get("connections")
        if isinstance(c, dict):
            inner = c.get("items") or c.get("data")
            if isinstance(inner, list):
                return {**data, "connections": inner}
        return data


class WebhookAccepted(BaseModel):
    batch_id: str
    queued: bool
    message: str
