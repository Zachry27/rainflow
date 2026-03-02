"""Video & Image Generation API — RainFlow Backend"""

import time
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.security import require_api_key
from app.core.logger import logger
from app.services.grok_client import grok_client

router = APIRouter()


# ── Models ──

class VideoRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    model: Optional[str] = "grok-2-video"
    aspect_ratio: Optional[str] = "16:9"
    duration_seconds: Optional[int] = 6
    resolution: Optional[str] = "480p"
    preset: Optional[str] = "normal"
    image: Optional[str] = None          # Base64 data URL referensi
    output_filename: Optional[str] = None


class ImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    model: Optional[str] = "grok-2-image"
    n: Optional[int] = 1
    aspect_ratio: Optional[str] = "16:9"
    output_filename: Optional[str] = None


class MediaData(BaseModel):
    url: Optional[str] = None


class MediaResponse(BaseModel):
    created: int
    data: List[MediaData]


# ── Helper ──

ALLOWED_RATIOS = {"1:1", "2:3", "3:2", "9:16", "16:9"}


def validate_ratio(ratio: str):
    if ratio not in ALLOWED_RATIOS:
        raise HTTPException(400, f"aspect_ratio tidak valid. Pilihan: {', '.join(ALLOWED_RATIOS)}")


# ── Routes ──

@router.post("/videos/generations", response_model=MediaResponse)
async def generate_video(
    req: VideoRequest,
    _: bool = Depends(require_api_key)
):
    """Generate video dari gambar referensi menggunakan Grok AI"""
    validate_ratio(req.aspect_ratio or "16:9")

    if req.duration_seconds not in [6, 10]:
        raise HTTPException(400, "duration_seconds harus 6 atau 10")
    if req.resolution not in ["480p", "720p"]:
        raise HTTPException(400, "resolution harus 480p atau 720p")
    if req.preset not in ["fun", "normal", "spicy", "custom"]:
        raise HTTPException(400, "preset harus fun/normal/spicy/custom")

    logger.info(f"[Video] Prompt: {req.prompt[:60]}... ref_image={'ya' if req.image else 'tidak'}")

    result = await grok_client.generate_video(
        prompt=req.prompt,
        aspect_ratio=req.aspect_ratio,
        duration_seconds=req.duration_seconds,
        resolution=req.resolution,
        preset=req.preset,
        enable_nsfw=True,
        image_url=req.image,
        output_filename=req.output_filename,
    )

    if not result.get("success"):
        err = result.get("error", "Video generation failed")
        code = result.get("error_code", "")
        if code == "rate_limit_exceeded":
            raise HTTPException(429, err)
        raise HTTPException(500, err)

    urls = result.get("urls", [])
    return MediaResponse(
        created=int(time.time()),
        data=[MediaData(url=u) for u in urls]
    )


@router.post("/images/generations", response_model=MediaResponse)
async def generate_image(
    req: ImageRequest,
    _: bool = Depends(require_api_key)
):
    """Generate gambar menggunakan Grok AI"""
    validate_ratio(req.aspect_ratio or "16:9")

    logger.info(f"[Image] Prompt: {req.prompt[:60]}...")

    result = await grok_client.generate(
        prompt=req.prompt,
        aspect_ratio=req.aspect_ratio,
        n=req.n,
        enable_nsfw=True,
        output_filename=req.output_filename,
    )

    if not result.get("success"):
        err = result.get("error", "Image generation failed")
        raise HTTPException(500, err)

    urls = result.get("urls", [])
    return MediaResponse(
        created=int(time.time()),
        data=[MediaData(url=u) for u in urls]
    )


@router.get("/health")
async def health():
    """Health check"""
    from app.services.sso_manager import sso_manager
    status = sso_manager.get_status()
    return {
        "status": "ok",
        "service": "RainFlow Backend",
        "sso_keys": status["total_keys"],
        "sso_failed": status["failed_count"],
    }


@router.get("/sso/status")
async def sso_status(_: bool = Depends(require_api_key)):
    """Status SSO keys"""
    from app.services.sso_manager import sso_manager
    return sso_manager.get_status()


class SsoAddRequest(BaseModel):
    token: str


@router.post("/sso/add")
async def add_sso(_: bool = Depends(require_api_key), req: SsoAddRequest = None):
    """Tambah SSO token baru"""
    from app.core.config import settings
    token = req.token.strip()
    if not token:
        raise HTTPException(400, "Token tidak boleh kosong")

    sso_file = settings.SSO_FILE
    existing = []
    if sso_file.exists():
        with open(sso_file, "r", encoding="utf-8") as f:
            existing = [l.strip() for l in f if l.strip() and not l.startswith("#")]

    if token in existing:
        return {"message": "Token sudah ada", "total": len(existing)}

    with open(sso_file, "a", encoding="utf-8") as f:
        f.write(f"\n{token}")

    from app.services.sso_manager import sso_manager
    await sso_manager.reload()

    return {"message": "Token berhasil ditambahkan", "total": len(existing) + 1}


# ── Google Drive Upload ──

class DriveUploadRequest(BaseModel):
    video_url: str = Field(..., description="URL video dari Grok")
    filename: str = Field(..., description="Nama file di Drive (misal: crs0212.mp4)")
    access_token: str = Field(..., description="Google OAuth2 access token dari frontend")


@router.post("/drive/upload")
async def upload_to_drive(
    req: DriveUploadRequest,
    _: bool = Depends(require_api_key)
):
    """Download video dari Grok URL, lalu upload ke Google Drive user"""
    import aiohttp

    logger.info(f"[Drive] Upload: {req.filename}")

    DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
    DRIVE_FOLDER_NAME = "RainFlow Videos"

    drive_headers = {
        "Authorization": f"Bearer {req.access_token}"
    }

    async with aiohttp.ClientSession() as session:
        # 1) Find or create RainFlow Videos folder
        folder_id = None
        try:
            search_url = "https://www.googleapis.com/drive/v3/files"
            search_params = {
                "q": f"name='{DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                "fields": "files(id,name)"
            }
            async with session.get(search_url, headers=drive_headers, params=search_params) as r:
                if r.status == 200:
                    data = await r.json()
                    files = data.get("files", [])
                    if files:
                        folder_id = files[0]["id"]
        except Exception as e:
            logger.warning(f"[Drive] Folder search failed: {e}")

        if not folder_id:
            try:
                folder_meta = {"name": DRIVE_FOLDER_NAME, "mimeType": "application/vnd.google-apps.folder"}
                async with session.post(
                    "https://www.googleapis.com/drive/v3/files",
                    headers={**drive_headers, "Content-Type": "application/json"},
                    json=folder_meta
                ) as r:
                    if r.status == 200:
                        data = await r.json()
                        folder_id = data.get("id")
            except Exception as e:
                logger.warning(f"[Drive] Folder create failed: {e}")

        # 2) Download video from Grok URL
        try:
            async with session.get(req.video_url) as video_resp:
                if video_resp.status != 200:
                    raise HTTPException(502, f"Gagal download video dari sumber: HTTP {video_resp.status}")
                video_bytes = await video_resp.read()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"Download video gagal: {str(e)}")

        # 3) Upload to Google Drive using multipart upload
        import json as json_lib
        metadata = {"name": req.filename, "mimeType": "video/mp4"}
        if folder_id:
            metadata["parents"] = [folder_id]

        boundary = "rainflow_boundary_xyz"
        multipart_body = (
            f"--{boundary}\r\n"
            f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
            f"{json_lib.dumps(metadata)}\r\n"
            f"--{boundary}\r\n"
            f"Content-Type: video/mp4\r\n\r\n"
        ).encode() + video_bytes + f"\r\n--{boundary}--".encode()

        upload_headers = {
            **drive_headers,
            "Content-Type": f"multipart/related; boundary={boundary}",
            "Content-Length": str(len(multipart_body)),
        }

        try:
            async with session.post(
                DRIVE_UPLOAD_URL + "&fields=id,name,webViewLink",
                headers=upload_headers,
                data=multipart_body
            ) as upload_resp:
                if upload_resp.status not in (200, 201):
                    body = await upload_resp.text()
                    raise HTTPException(500, f"Drive upload gagal: {upload_resp.status} {body[:200]}")

                result = await upload_resp.json()
                drive_url = result.get("webViewLink") or f"https://drive.google.com/file/d/{result.get('id')}/view"
                logger.info(f"[Drive] Upload OK: {req.filename} → {drive_url}")
                return {
                    "success": True,
                    "filename": req.filename,
                    "drive_id": result.get("id"),
                    "drive_url": drive_url,
                    "folder": DRIVE_FOLDER_NAME,
                }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Drive upload error: {str(e)}")

