from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_FOLDER = str(BASE_DIR / "static" / "uploads")
OUTPUT_FOLDER = str(BASE_DIR / "static" / "outputs")
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
