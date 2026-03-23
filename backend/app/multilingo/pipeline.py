"""Background job: transcribe → translate → TTS → optional video mux → reports."""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict

from werkzeug.utils import secure_filename

from app.multilingo.config import OUTPUT_FOLDER, UPLOAD_FOLDER
from app.multilingo.constants import INDIAN_LANGUAGES, LANGUAGE_DETAILS
from app.multilingo.file_utils import get_file_type
from app.multilingo.media_ops import extract_audio_from_video, replace_video_audio
from app.multilingo.reports import generate_enhanced_html_report, generate_unicode_pdf_report
from app.multilingo.state import processing_status
from app.multilingo.text_ops import transcribe_audio, translate_text_to_indian_language
from app.multilingo.tts import text_to_speech_with_gtts

logger = logging.getLogger(__name__)


def process_file_async(
    task_id: str,
    filepath: str,
    target_language: str,
    original_filename: str,
) -> None:
    try:
        processing_status[task_id] = {
            "status": "processing",
            "progress": 0,
            "message": "Initializing MultiLingo AI processing...",
            "start_time": time.time(),
        }

        file_type = get_file_type(original_filename)
        base_name = os.path.splitext(original_filename)[0]
        base_name = secure_filename(base_name) or "media"
        lang_info = LANGUAGE_DETAILS.get(target_language, LANGUAGE_DETAILS["hi"])

        logger.info("MultiLingo start: %s (%s) -> %s", original_filename, file_type, target_language)

        processing_status[task_id].update(
            {"progress": 10, "message": f"Extracting audio from {file_type}..."}
        )

        if file_type == "video":
            audio_path = os.path.join(UPLOAD_FOLDER, f"{task_id}_extracted_audio.wav")
            extract_audio_from_video(filepath, audio_path)
        else:
            audio_path = filepath

        processing_status[task_id].update(
            {"progress": 20, "message": "Transcribing English speech with Whisper..."}
        )

        original_text = transcribe_audio(audio_path)

        processing_status[task_id].update(
            {
                "progress": 40,
                "message": f"Translating to {INDIAN_LANGUAGES.get(target_language)}...",
            }
        )

        translated_text = translate_text_to_indian_language(original_text, target_language)

        processing_status[task_id].update(
            {
                "progress": 60,
                "message": f"Generating {lang_info['english']} speech with gTTS...",
            }
        )

        translated_audio_path = os.path.join(
            OUTPUT_FOLDER,
            f"{base_name}_MultiLingo_{target_language}.mp3",
        )

        tts_ok = text_to_speech_with_gtts(translated_text, translated_audio_path, target_language)
        if not tts_ok:
            raise RuntimeError(f"Failed to generate {lang_info['english']} speech")

        outputs: list[Dict[str, Any]] = [
            {
                "type": "audio",
                "filename": os.path.basename(translated_audio_path),
                "path": translated_audio_path,
                "description": f"{INDIAN_LANGUAGES.get(target_language)} Audio",
            }
        ]

        if file_type == "video":
            processing_status[task_id].update(
                {
                    "progress": 80,
                    "message": f"Creating synchronized {lang_info['english']} video...",
                }
            )
            translated_video_path = os.path.join(
                OUTPUT_FOLDER,
                f"{base_name}_MultiLingo_{target_language}.mp4",
            )
            replace_video_audio(filepath, translated_audio_path, translated_video_path)
            outputs.append(
                {
                    "type": "video",
                    "filename": os.path.basename(translated_video_path),
                    "path": translated_video_path,
                    "description": f"{INDIAN_LANGUAGES.get(target_language)} Video",
                }
            )

        processing_status[task_id].update(
            {"progress": 90, "message": "Generating reports..."}
        )

        processing_time = time.time() - processing_status[task_id]["start_time"]

        report_data = {
            "original_file": original_filename,
            "target_language": target_language,
            "original_text": original_text,
            "translated_text": translated_text,
            "processing_time": processing_time,
            "file_type": file_type,
        }

        html_path = os.path.join(
            OUTPUT_FOLDER,
            f"MultiLingo_Report_{base_name}_{target_language}.html",
        )
        pdf_path = os.path.join(
            OUTPUT_FOLDER,
            f"MultiLingo_Report_{base_name}_{target_language}.pdf",
        )

        generate_enhanced_html_report(report_data, html_path)
        generate_unicode_pdf_report(report_data, pdf_path)

        outputs.append(
            {
                "type": "html",
                "filename": os.path.basename(html_path),
                "path": html_path,
                "description": "HTML report",
            }
        )
        outputs.append(
            {
                "type": "pdf",
                "filename": os.path.basename(pdf_path),
                "path": pdf_path,
                "description": "PDF report",
            }
        )

        if file_type == "video" and os.path.exists(audio_path) and audio_path != filepath:
            try:
                os.remove(audio_path)
            except OSError:
                pass

        processing_status[task_id].update(
            {
                "status": "completed",
                "progress": 100,
                "message": f"Complete! {INDIAN_LANGUAGES.get(target_language)} translation ready.",
                "outputs": outputs,
                "original_text": original_text,
                "translated_text": translated_text,
                "processing_time": processing_time,
                "target_language": target_language,
                "statistics": {
                    "original_chars": len(original_text),
                    "translated_chars": len(translated_text),
                    "original_words": len(original_text.split()),
                    "translated_words": len(translated_text.split()),
                    "files_generated": len(outputs),
                },
            }
        )
        logger.info("MultiLingo done task=%s", task_id)

    except Exception as e:
        st = processing_status.get(task_id) or {}
        start = st.get("start_time", time.time())
        processing_time = time.time() - start
        logger.exception("Processing failed: %s", e)
        processing_status[task_id] = {
            "status": "error",
            "progress": 0,
            "message": f"Processing failed: {e!s}",
            "error_details": {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "processing_time": processing_time,
            },
        }
