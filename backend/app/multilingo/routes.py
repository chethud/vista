"""FastAPI routes compatible with the MultiLingo static UI (`/process`, `/status`, `/download`)."""

from __future__ import annotations

import logging
import os
import shutil
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from werkzeug.utils import secure_filename

from app.multilingo.config import MAX_CONTENT_LENGTH, UPLOAD_FOLDER
from app.multilingo.constants import INDIAN_LANGUAGES, LANGUAGE_DETAILS
from app.multilingo.file_utils import allowed_file
from app.multilingo.pipeline import process_file_async
from app.multilingo.state import executor, processing_status

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/process")
async def process_file(
    file: UploadFile = File(...),
    target_language: str = Form("hi"),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use audio or video formats.",
        )

    if target_language not in INDIAN_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {target_language}")

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    safe_name = secure_filename(file.filename) or "upload.bin"
    task_id = str(uuid.uuid4())
    unique_name = f"{task_id}_{safe_name}"
    filepath = os.path.join(UPLOAD_FOLDER, unique_name)

    try:
        with open(filepath, "wb") as out:
            shutil.copyfileobj(file.file, out)
    finally:
        await file.close()

    size = os.path.getsize(filepath)
    if size < 1000:
        try:
            os.remove(filepath)
        except OSError:
            pass
        raise HTTPException(status_code=400, detail="File too small or empty")
    if size > MAX_CONTENT_LENGTH:
        try:
            os.remove(filepath)
        except OSError:
            pass
        raise HTTPException(status_code=400, detail="File exceeds 500MB limit")

    executor.submit(process_file_async, task_id, filepath, target_language, safe_name)

    return {
        "task_id": task_id,
        "message": f"Processing started for {INDIAN_LANGUAGES.get(target_language)}",
        "filename": safe_name,
        "file_size": size,
        "target_language": target_language,
        "estimated_time": "2-5 minutes",
    }


@router.get("/status/{task_id}")
def get_status(task_id: str):
    status = processing_status.get(task_id)
    if not status:
        return {"status": "not_found"}
    if status.get("status") == "completed":
        out = dict(status)
        out["success"] = True
        out["files_ready"] = len(status.get("outputs", []))
        return out
    return status


@router.get("/download/{task_id}/{filename}")
def download_file(task_id: str, filename: str):
    status = processing_status.get(task_id)
    if not status or status.get("status") != "completed":
        raise HTTPException(status_code=404, detail="Not ready or not found")

    safe_fn = os.path.basename(filename)
    for output in status.get("outputs", []):
        if output.get("filename") == safe_fn:
            path = output.get("path")
            if path and os.path.isfile(path):
                return FileResponse(
                    path,
                    filename=safe_fn,
                    media_type="application/octet-stream",
                )
    raise HTTPException(status_code=404, detail="File not found")


@router.get("/api/languages")
def api_languages():
    languages_info = {}
    for code, name in INDIAN_LANGUAGES.items():
        d = LANGUAGE_DETAILS.get(code, {})
        languages_info[code] = {
            "name": name,
            "native": d.get("native", ""),
            "english": d.get("english", ""),
            "speakers": d.get("speakers", ""),
            "supported": True,
        }
    return {
        "languages": languages_info,
        "total_supported": len(languages_info),
        "features": [
            "Whisper ASR",
            "Google Translate (deep-translator)",
            "gTTS",
            "Video sync (MoviePy)",
        ],
    }


@router.get("/health")
def multilingo_health():
    from app.multilingo.model_manager import model_manager

    return {
        "status": "healthy",
        "services": {
            "whisper": "ready" if getattr(model_manager, "whisper_model", None) else "lazy",
            "translation": "ready",
            "gtts": "ready",
        },
        "supported_languages": len(INDIAN_LANGUAGES),
    }
