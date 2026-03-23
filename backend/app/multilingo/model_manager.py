import logging
import threading

from app.multilingo.fonts import setup_unicode_fonts

logger = logging.getLogger(__name__)


class ModelManager:
    """Whisper + PDF fonts — loaded on first use so `import app` works without torch."""

    def __init__(self):
        self._lock = threading.Lock()
        self.whisper_model = None
        self.primary_font = None
        self._ready = False

    def ensure(self) -> None:
        with self._lock:
            if self._ready:
                return
            logger.info("Initializing MultiLingo AI models...")
            self.primary_font = setup_unicode_fonts()
            import whisper

            logger.info("Loading Whisper model (base)...")
            self.whisper_model = whisper.load_model("base")
            self._ready = True
            logger.info("Whisper ready")


model_manager = ModelManager()
