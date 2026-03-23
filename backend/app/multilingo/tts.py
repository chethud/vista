import logging
import os

from gtts import gTTS

from app.multilingo.constants import LANGUAGE_DETAILS
from app.multilingo.text_ops import create_fallback_narration

logger = logging.getLogger(__name__)


def text_to_speech_with_gtts(text: str, output_path: str, language: str = "hi") -> bool:
    try:
        if not text or not text.strip():
            logger.warning("Empty text for TTS")
            return False

        lang_info = LANGUAGE_DETAILS.get(language, LANGUAGE_DETAILS["hi"])
        lang_name = lang_info["english"]

        logger.info("Generating %s speech with gTTS", lang_name)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        clean_text = text.strip()
        if clean_text.startswith("[Translation failed"):
            clean_text = create_fallback_narration(text, language)

        if len(clean_text) > 5000:
            clean_text = clean_text[:4500] + "..."

        tts_attempts = []

        try:
            gtts_lang = lang_info["gtts"]
            tts = gTTS(text=clean_text, lang=gtts_lang, slow=False)
            tts.save(output_path)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                logger.info("Direct %s TTS OK", lang_name)
                return True
            tts_attempts.append("Direct: file too small")
        except Exception as e:
            tts_attempts.append(f"Direct: {e}")
            logger.warning("Direct TTS failed: %s", e)

        try:
            english_narration = create_fallback_narration(text, language)
            tts = gTTS(text=english_narration, lang="en", slow=False)
            tts.save(output_path)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                logger.info("English narration TTS OK")
                return True
            tts_attempts.append("English narration: file too small")
        except Exception as e:
            tts_attempts.append(f"English narration: {e}")
            logger.warning("English narration failed: %s", e)

        try:
            fallback_text = (
                f"Your content has been successfully translated to {lang_name}. "
                "Please check the text files for the complete translation."
            )
            tts = gTTS(text=fallback_text, lang="en", slow=False)
            tts.save(output_path)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                logger.info("Fallback message TTS OK")
                return True
            tts_attempts.append("Fallback: file too small")
        except Exception as e:
            tts_attempts.append(f"Fallback: {e}")
            logger.warning("Fallback message failed: %s", e)

        for i, a in enumerate(tts_attempts, 1):
            logger.error("TTS attempt %s: %s", i, a)
        return False

    except Exception as e:
        logger.error("TTS error: %s", e)
        return False
