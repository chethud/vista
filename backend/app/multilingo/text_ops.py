import logging
import os
import re
import time
from datetime import datetime

from deep_translator import GoogleTranslator

from app.multilingo.constants import INDIAN_LANGUAGES, LANGUAGE_DETAILS
from app.multilingo.config import OUTPUT_FOLDER
from app.multilingo.model_manager import model_manager

logger = logging.getLogger(__name__)


def filter_teacher_corrections(text: str) -> str:
    correction_patterns = [
        r"\b(sorry|apologies|my mistake|I was wrong|that's wrong|that is wrong|incorrect|actually|let me correct|I meant to say)\b",
        r"\b(this is|that was) wrong\b",
        r"\b(mistake|error).*?(sorry|correct)\b",
        r"\bI.*?said.*?wrong\b",
        r"\b(scratch that|ignore that|disregard that|never mind)\b",
        r"\b(I apologize|I'm sorry).*?(for|about)\b",
    ]
    pattern = re.compile("|".join(correction_patterns), re.IGNORECASE)
    sentences = re.split(r"(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s", text)
    filtered_sentences = []
    i = 0
    while i < len(sentences):
        sentence = sentences[i]
        if pattern.search(sentence):
            i += 1
            if i < len(sentences) and re.match(
                r"^(actually|correction|I mean|rather)", sentences[i], re.IGNORECASE
            ):
                i += 1
            continue
        filtered_sentences.append(sentence)
        i += 1
    return " ".join(filtered_sentences)


def transcribe_audio(audio_path: str) -> str:
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model_manager.ensure()
    logger.info("Transcribing: %s", os.path.basename(audio_path))

    result = model_manager.whisper_model.transcribe(
        audio_path,
        language="en",
        task="transcribe",
        verbose=False,
    )
    text = result["text"].strip()
    if not text:
        raise ValueError("No speech detected in audio file")

    filtered_text = filter_teacher_corrections(text)
    logger.info("Transcription length=%s -> %s", len(text), len(filtered_text))
    return filtered_text


def translate_text_to_indian_language(text: str, target_language: str) -> str:
    try:
        if not text or not text.strip():
            return ""

        if target_language not in INDIAN_LANGUAGES:
            raise ValueError(f"Unsupported language: {target_language}")

        lang_info = LANGUAGE_DETAILS[target_language]
        lang_name = INDIAN_LANGUAGES[target_language]

        logger.info("Translating to %s", lang_name)

        clean_text = text.strip()
        translator = GoogleTranslator(source="en", target=target_language)
        sentences = re.split(r"(?<=[.!?])\s+", clean_text)
        logger.info("Split into %s sentences", len(sentences))

        translated_sentences = []
        for i, sentence in enumerate(sentences):
            if len(sentence.strip()) < 5:
                continue
            logger.info("Sentence %s/%s", i + 1, len(sentences))
            try:
                translated = translator.translate(sentence)
                if translated and translated.strip():
                    translated_sentences.append(translated.strip())
                else:
                    translated_sentences.append(sentence)
                time.sleep(0.3)
            except Exception as e:
                logger.warning("Sentence %s failed: %s", i + 1, e)
                translated_sentences.append(sentence)
                time.sleep(0.5)

        translated_text = " ".join(translated_sentences)
        if not translated_text or translated_text.strip() == "":
            raise ValueError("Translation resulted in empty text")

        debug_path = os.path.join(
            OUTPUT_FOLDER, f"translation_{target_language}_{int(time.time())}.txt"
        )
        try:
            with open(debug_path, "w", encoding="utf-8") as f:
                f.write("=== TRANSLATION ===\n")
                f.write(f"Language: {lang_name}\n")
                f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write("ORIGINAL:\n")
                f.write(clean_text + "\n\n")
                f.write(f"TRANSLATED ({lang_info['english']}):\n")
                f.write(translated_text + "\n")
            logger.info("Debug file: %s", os.path.basename(debug_path))
        except Exception as e:
            logger.warning("Could not save debug file: %s", e)

        return translated_text

    except Exception as e:
        logger.error("Translation error: %s", e)
        return f"[Translation failed for {INDIAN_LANGUAGES.get(target_language, 'Unknown')}: {e}]"


def create_fallback_narration(text: str, target_language: str) -> str:
    lang_info = LANGUAGE_DETAILS.get(target_language, {})
    lang_name = lang_info.get("english", "Indian language")
    narrations = [
        f"This is a {lang_name} version of your English content.",
        f"The original English text has been successfully translated to {lang_name} using Google Translate.",
        f"This translation preserves the meaning and cultural context of your original message.",
        f"The {lang_name} text is now available for download in your preferred format.",
        "Thank you for using MultiLingo AI for Indian language translation.",
    ]
    return " ".join(narrations)
