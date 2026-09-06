"""Runtime configuration. Everything is env-driven so the same image runs
locally (mock mode), in staging (live upstream, no model) and in production."""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="NBA_", extra="ignore")

    app_name: str = "NBA Vision API"
    env: Literal["local", "staging", "prod"] = "local"
    debug: bool = True

    # --- storage ---
    database_url: str = "postgresql+psycopg://nba:nba@localhost:5432/nba"
    redis_url: str = "redis://localhost:6379/0"
    cache_dir: str = ".cache"

    # --- upstream ---
    # stats.nba.com blocks datacentre IPs and sends no CORS headers: the browser
    # never talks to it. This service is the only thing that does.
    stats_base: str = "https://stats.nba.com"
    cdn_base: str = "https://cdn.nba.com"
    stats_timeout: float = 20.0
    stats_rate_limit_qps: float = 0.6      # ~1 request every 1.7s, stays under the ban threshold
    sportsdataio_key: str | None = None    # optional structured-JSON fallback
    sportradar_key: str | None = None

    # --- ttls (seconds) ---
    ttl_static: int = 60 * 60 * 24 * 7     # players index, team meta, draft history
    ttl_season: int = 60 * 60 * 12         # season splits, advanced stats
    ttl_live: int = 60                     # scoreboard, injuries
    ttl_contract: int = 60 * 60 * 24       # spotrac / hoopshype scrape

    # --- ml ---
    model_dir: str = "models"
    # When no trained artefact is found the API answers from the calibrated
    # mock generator instead of 500-ing. Flip to False in prod to fail loud.
    allow_mock_inference: bool = True
    playoff_model_suffix: str = "playoffs"

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
