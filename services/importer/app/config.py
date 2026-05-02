from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://contactdex:contactdex@localhost:5432/importer"
    redis_url: str = "redis://localhost:6379/0"
    rq_queue_name: str = "ingestion"

    # Bridge to Next.js ContactDex (Path A push)
    contactdex_bridge_url: str | None = None  # e.g. http://host.docker.internal:3000/api/contacts/import/linkedin
    contactdex_import_secret: str | None = None

    api_host: str = "0.0.0.0"
    api_port: int = 8010


@lru_cache
def get_settings() -> Settings:
    return Settings()
