"""FFmpeg Runner API — RainFlow Backend
Upload video/audio, jalankan FFmpeg BenAlus di VPS, download hasil.
"""

import asyncio
import os
import re
import shutil
import time
import uuid
from pathlib import Path
from typing import Dict, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.logger import logger

router = APIRouter()

# ── Config ──
WORK_DIR = Path("/root/rainflow_jobs")
WORK_DIR.mkdir(parents=True, exist_ok=True)

# ── Job Store (in-memory) ──
jobs: Dict[str, dict] = {}


# ── Models ──

class ProcessRequest(BaseModel):
    videos: list[str]          # nama video tanpa _raw.mp4, misal ["rain_sunset", "forest"]
    mode: str = "standard"     # "standard" | "benalus"
    loop_duration: int = 10800 # detik (default 3 jam)
    video_duration: float = 6.0
    fade_duration: float = 0.8
    deflicker: bool = True
    audio_file: Optional[str] = None  # nama file audio di WORK_DIR
    job_dir: Optional[str] = None     # subdirektori job (dari upload)


class JobStatus(BaseModel):
    job_id: str
    status: str   # queued | running | done | error
    progress: int # 0-100
    message: str
    output_file: Optional[str] = None
    error: Optional[str] = None


# ── Helpers ──

def get_job_dir(job_id: str) -> Path:
    d = WORK_DIR / job_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def build_standard_script(job_dir: Path, videos: list, cfg: ProcessRequest) -> str:
    """2-step: loop + merge audio"""
    lines = ["#!/bin/bash", "set -e", f"cd {job_dir}", ""]
    for v in videos:
        raw = f"{v}_raw.mp4"
        out = f"{v}.mp4"
        n_loops = max(1, int(cfg.loop_duration / max(cfg.video_duration, 1)))
        lines += [
            f"# === {v} ===",
            f"printf '%s\\n' $(yes {raw} | head -{n_loops}) > /tmp/list_{v}.txt",
            f"ffmpeg -y -f concat -safe 0 -i /tmp/list_{v}.txt -c copy /tmp/{v}_loop.mp4",
        ]
        if cfg.audio_file:
            lines.append(
                f"ffmpeg -y -i /tmp/{v}_loop.mp4 -i {cfg.audio_file} "
                f"-map 0:v -map 1:a -c:v copy -c:a aac -shortest {out}"
            )
        else:
            lines.append(f"mv /tmp/{v}_loop.mp4 {out}")
        lines.append("")
    lines.append('echo "DONE"')
    return "\n".join(lines)


def build_benalus_script(job_dir: Path, videos: list, cfg: ProcessRequest) -> str:
    """4-step BenAlus: deflicker → fade → concat loop → merge audio"""
    fd = cfg.fade_duration
    vd = cfg.video_duration
    n_loops = max(1, int(cfg.loop_duration / max(vd, 1)))
    lines = ["#!/bin/bash", "set -e", f"cd {job_dir}", ""]

    for v in videos:
        raw = f"{v}_raw.mp4"
        out = f"{v}.mp4"
        lines.append(f"# === BenAlus: {v} ===")

        # Step 1: Deflicker
        if cfg.deflicker:
            lines.append(
                f"ffmpeg -y -i {raw} "
                f"-vf 'deflicker=mode=pm:size=10' "
                f"-c:v libx264 -preset fast -crf 18 -an /tmp/{v}_defl.mp4"
            )
            src = f"/tmp/{v}_defl.mp4"
        else:
            src = raw

        # Step 2: Alpha fade in/out
        lines.append(
            f"ffmpeg -y -i {src} "
            f"-vf 'fade=t=in:st=0:d={fd},fade=t=out:st={vd-fd}:d={fd}' "
            f"-c:v libx264 -preset fast -crf 18 -an /tmp/{v}_fade.mp4"
        )

        # Step 3: Concat loop
        lines += [
            f"printf 'file /tmp/{v}_fade.mp4\\n%.0s' $(seq 1 {n_loops}) > /tmp/list_{v}.txt",
            f"ffmpeg -y -f concat -safe 0 -i /tmp/list_{v}.txt -c copy /tmp/{v}_loop.mp4",
        ]

        # Step 4: Merge audio
        if cfg.audio_file:
            lines.append(
                f"ffmpeg -y -i /tmp/{v}_loop.mp4 -i {cfg.audio_file} "
                f"-map 0:v -map 1:a -c:v copy -c:a aac -shortest {out}"
            )
        else:
            lines.append(f"mv /tmp/{v}_loop.mp4 {out}")

        lines.append("")

    lines.append('echo "DONE"')
    return "\n".join(lines)


async def run_ffmpeg_job(job_id: str, script_path: Path, output_files: list[str], job_dir: Path):
    """Background task: jalankan bash script dan update job status."""
    jobs[job_id]["status"] = "running"
    jobs[job_id]["message"] = "FFmpeg sedang berjalan..."
    jobs[job_id]["progress"] = 5

    try:
        proc = await asyncio.create_subprocess_exec(
            "bash", str(script_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(job_dir)
        )

        log_lines = []
        progress_per_video = 90 // max(len(output_files), 1)
        current_video = 0

        async for line in proc.stdout:
            text = line.decode("utf-8", errors="replace").strip()
            log_lines.append(text)
            logger.debug(f"[FFmpeg/{job_id}] {text}")

            # Update progress berdasarkan output ffmpeg
            if "=== BenAlus:" in text or "===" in text:
                current_video += 1
                jobs[job_id]["progress"] = 5 + (current_video - 1) * progress_per_video
                jobs[job_id]["message"] = f"Memproses video {current_video}/{len(output_files)}..."
            elif "frame=" in text:
                jobs[job_id]["progress"] = min(
                    5 + current_video * progress_per_video,
                    jobs[job_id]["progress"] + 1
                )

        await proc.wait()

        if proc.returncode == 0:
            # Cek output files ada
            found = [f for f in output_files if (job_dir / f).exists()]
            jobs[job_id].update({
                "status": "done",
                "progress": 100,
                "message": f"Selesai! {len(found)} video berhasil diproses.",
                "output_files": found,
                "output_file": found[0] if found else None,
            })
            logger.info(f"[FFmpeg/{job_id}] DONE — {len(found)} files")
        else:
            raise RuntimeError(f"FFmpeg exit code {proc.returncode}\n" + "\n".join(log_lines[-20:]))

    except Exception as e:
        jobs[job_id].update({
            "status": "error",
            "progress": 0,
            "message": "Gagal!",
            "error": str(e)[:500],
        })
        logger.error(f"[FFmpeg/{job_id}] ERROR: {e}")


# ── Routes ──

@router.post("/ffmpeg/upload")
async def upload_files(
    job_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload satu file (video atau audio) ke folder job."""
    if not re.match(r'^[a-zA-Z0-9_-]+$', job_id):
        raise HTTPException(400, "job_id tidak valid")

    # Sanitize filename
    safe_name = re.sub(r'[^a-zA-Z0-9_.\-]', '_', file.filename or "file.mp4")
    job_dir = get_job_dir(job_id)
    dest = job_dir / safe_name

    try:
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        size_mb = dest.stat().st_size / 1024 / 1024
        logger.info(f"[Upload] {safe_name} → {job_id} ({size_mb:.1f} MB)")
        return {"success": True, "filename": safe_name, "size_mb": round(size_mb, 2), "job_id": job_id}
    except Exception as e:
        raise HTTPException(500, f"Upload gagal: {str(e)}")


@router.post("/ffmpeg/process", response_model=JobStatus)
async def process_videos(req: ProcessRequest, background_tasks: BackgroundTasks):
    """Buat FFmpeg job dan jalankan di background."""
    if not req.videos:
        raise HTTPException(400, "videos tidak boleh kosong")

    job_id = req.job_dir or str(uuid.uuid4())[:8]
    job_dir = get_job_dir(job_id)

    # Cek file _raw.mp4 ada
    missing = [v for v in req.videos if not (job_dir / f"{v}_raw.mp4").exists()]
    if missing:
        raise HTTPException(400, f"File tidak ditemukan di server: {', '.join(f'{m}_raw.mp4' for m in missing)}")

    # Build script
    if req.mode == "benalus":
        script_content = build_benalus_script(job_dir, req.videos, req)
    else:
        script_content = build_standard_script(job_dir, req.videos, req)

    script_path = job_dir / "process.sh"
    script_path.write_text(script_content)
    script_path.chmod(0o755)

    output_files = [f"{v}.mp4" for v in req.videos]

    # Init job
    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "message": "Job dibuat, menunggu antrian...",
        "output_files": output_files,
        "output_file": None,
        "error": None,
        "created_at": time.time(),
    }

    background_tasks.add_task(run_ffmpeg_job, job_id, script_path, output_files, job_dir)
    logger.info(f"[Process] Job {job_id} created — mode={req.mode}, videos={req.videos}")

    return JobStatus(**jobs[job_id])


@router.get("/ffmpeg/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Poll status job FFmpeg."""
    if job_id not in jobs:
        raise HTTPException(404, "Job tidak ditemukan")
    return JobStatus(**jobs[job_id])


@router.get("/ffmpeg/jobs/{job_id}/download/{filename}")
async def download_result(job_id: str, filename: str):
    """Streaming download file hasil."""
    job_dir = get_job_dir(job_id)
    safe = re.sub(r'[^a-zA-Z0-9_.\-]', '_', filename)
    file_path = job_dir / safe

    if not file_path.exists():
        raise HTTPException(404, "File tidak ditemukan")

    def iterfile():
        with open(file_path, "rb") as f:
            while chunk := f.read(1024 * 1024):
                yield chunk

    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={"Content-Disposition": f'attachment; filename="{safe}"'}
    )


@router.get("/ffmpeg/jobs/{job_id}/files")
async def list_job_files(job_id: str):
    """List semua file dalam job directory."""
    job_dir = WORK_DIR / job_id
    if not job_dir.exists():
        return {"files": []}
    files = []
    for f in sorted(job_dir.iterdir()):
        if f.is_file() and not f.name.startswith("."):
            files.append({
                "name": f.name,
                "size_mb": round(f.stat().st_size / 1024 / 1024, 2),
                "is_output": f.suffix == ".mp4" and not f.name.endswith("_raw.mp4"),
            })
    return {"files": files, "job_id": job_id}


@router.delete("/ffmpeg/jobs/{job_id}/files/{filename}")
async def delete_file(job_id: str, filename: str):
    """Hapus file dari job directory."""
    job_dir = WORK_DIR / job_id
    safe = re.sub(r'[^a-zA-Z0-9_.\-]', '_', filename)
    file_path = job_dir / safe
    if not file_path.exists():
        raise HTTPException(404, "File tidak ditemukan")
    file_path.unlink()
    return {"success": True, "deleted": safe}
