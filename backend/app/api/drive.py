"""Google Drive Upload API — RainFlow Backend
Upload video ke Google Drive user menggunakan OAuth access token.
"""

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.logger import logger

router = APIRouter()


class DriveUploadRequest(BaseModel):
    video_url: str          # URL video (relatif dari BenAlus atau absolut)
    filename: str           # Nama file output (e.g. "crs0506.mp4")
    access_token: str       # Google OAuth access token
    folder_id: Optional[str] = None  # Optional: folder ID di Google Drive


class DriveUploadResponse(BaseModel):
    success: bool
    drive_url: Optional[str] = None
    file_id: Optional[str] = None
    error: Optional[str] = None


@router.post("/drive/upload", response_model=DriveUploadResponse)
async def upload_to_drive(req: DriveUploadRequest):
    """Download video dari BenAlus backend lalu upload ke Google Drive user."""
    
    try:
        # Step 1: Download video dari BenAlus/internal URL
        video_url = req.video_url
        # Jika URL relatif (dari frontend), konversi ke URL absolut BenAlus
        if video_url.startswith('/downloads/') or video_url.startswith('/api/'):
            video_url = f"http://127.0.0.1:3000{video_url}"
        elif not video_url.startswith('http'):
            video_url = f"http://127.0.0.1:3000{video_url}"
        
        logger.info(f"[Drive Upload] Downloading video from: {video_url}")
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Download video
            video_resp = await client.get(video_url)
            if video_resp.status_code != 200:
                raise HTTPException(400, f"Gagal download video: HTTP {video_resp.status_code}")
            
            video_bytes = video_resp.content
            video_size = len(video_bytes)
            logger.info(f"[Drive Upload] Video downloaded: {video_size / 1024 / 1024:.1f} MB")
            
            # Step 2: Upload ke Google Drive via resumable upload
            # Create file metadata
            metadata = {
                "name": req.filename,
                "mimeType": "video/mp4",
            }
            if req.folder_id:
                metadata["parents"] = [req.folder_id]
            
            # Initiate resumable upload
            init_resp = await client.post(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
                headers={
                    "Authorization": f"Bearer {req.access_token}",
                    "Content-Type": "application/json; charset=UTF-8",
                    "X-Upload-Content-Type": "video/mp4",
                    "X-Upload-Content-Length": str(video_size),
                },
                json=metadata,
            )
            
            if init_resp.status_code not in (200, 308):
                error_text = init_resp.text[:300]
                logger.error(f"[Drive Upload] Init failed: {error_text}")
                raise HTTPException(400, f"Google Drive init gagal: {error_text}")
            
            upload_url = init_resp.headers.get("Location")
            if not upload_url:
                raise HTTPException(500, "Tidak mendapatkan upload URL dari Google Drive")
            
            # Upload video content
            upload_resp = await client.put(
                upload_url,
                content=video_bytes,
                headers={
                    "Content-Type": "video/mp4",
                    "Content-Length": str(video_size),
                },
            )
            
            if upload_resp.status_code not in (200, 201):
                error_text = upload_resp.text[:300]
                logger.error(f"[Drive Upload] Upload failed: {error_text}")
                raise HTTPException(400, f"Upload gagal: {error_text}")
            
            result = upload_resp.json()
            file_id = result.get("id")
            drive_url = f"https://drive.google.com/file/d/{file_id}/view"
            
            logger.info(f"[Drive Upload] Success! File ID: {file_id}, URL: {drive_url}")
            
            return DriveUploadResponse(
                success=True,
                drive_url=drive_url,
                file_id=file_id,
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Drive Upload] Error: {e}")
        return DriveUploadResponse(
            success=False,
            error=str(e)[:300],
        )
