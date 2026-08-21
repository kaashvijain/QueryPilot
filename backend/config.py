from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "QueryPilot API"
    environment: str = "development"
    debug: bool = True
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # LLM Provider Configuration (Loaded safely from environment / .env file)
    gemini_api_key: str = ""
    llm_model: str = "gemini-3.6-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


def get_settings() -> Settings:
    """Returns an instance of application settings loaded from .env."""
    return Settings()
