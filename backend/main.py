"""RainFlow Backend — Main Entry Point"""

from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logger import logger
from app.services.sso_manager import sso_manager
from app.api.generate import router as generate_router
from app.api.ffmpeg import router as ffmpeg_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 50)
    logger.info("🌊 RainFlow Backend Starting...")
    logger.info(f"   Port: {settings.PORT}")

    n = sso_manager.load_sso_list()
    logger.info(f"   SSO Keys: {n} dimuat")
    logger.info("=" * 50)

    yield

    # Shutdown
    logger.info("🌊 RainFlow Backend Stopped.")


app = FastAPI(
    title="RainFlow Backend",
    description="AI Video Generation API untuk RainFlow YouTube Content Creator",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — izinkan frontend (Vite dev + production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(generate_router, prefix="/v1")
app.include_router(ffmpeg_router, prefix="/v1")


@app.get("/")
async def root():
    return {
        "service": "RainFlow Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/v1/health",
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
