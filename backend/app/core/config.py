"""Konfigurasi RainFlow Backend"""

import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

ROOT_DIR = Path(__file__).parents[2]
ENV_FILE_PATH = Path(os.getenv("ENV_FILE_PATH", ROOT_DIR / ".env"))


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 9564
    DEBUG: bool = False
    API_KEY: str = "rainflow-secret"
    
    SECRET_KEY: str = "rainflow-super-secret-jwt-key"
    DATABASE_URL: str = "sqlite:///./data/rainflow.db"

    CF_CLEARANCE: str = ""
    PROXY_URL: Optional[str] = None
    HTTP_PROXY: Optional[str] = None
    HTTPS_PROXY: Optional[str] = None

    # Redis (disabled — RainFlow uses file-based SSO manager)
    REDIS_ENABLED: bool = False
    REDIS_URL: str = "redis://localhost:6379"

    SSO_FILE: Path = ROOT_DIR / "key.txt"
    SSO_ROTATION_STRATEGY: str = "hybrid"
    SSO_DAILY_LIMIT: int = 50

    VIDEOS_DIR: Path = ROOT_DIR / "data" / "videos"
    IMAGES_DIR: Path = ROOT_DIR / "data" / "images"
    BASE_URL: Optional[str] = None

    DEFAULT_ASPECT_RATIO: str = "16:9"
    GENERATION_TIMEOUT: int = 180

    GROK_WS_URL: str = "wss://grok.com/ws/imagine/listen"

    class Config:
        env_file = str(ENV_FILE_PATH)
        env_file_encoding = "utf-8"
        extra = "ignore"

    def get_base_url(self) -> str:
        if self.BASE_URL:
            return self.BASE_URL
        host = "127.0.0.1" if self.HOST == "0.0.0.0" else self.HOST
        return f"http://{host}:{self.PORT}"

    def get_proxy_dict(self):
        if self.PROXY_URL:
            return {"http": self.PROXY_URL, "https": self.PROXY_URL}
        return None


settings = Settings()

# Pastikan direktori video & image ada
settings.VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
settings.IMAGES_DIR.mkdir(parents=True, exist_ok=True)
