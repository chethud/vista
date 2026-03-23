ALLOWED_EXTENSIONS = {
    "audio": {"wav", "mp3", "flac", "m4a", "ogg", "aac"},
    "video": {"mp4", "avi", "mov", "mkv", "webm", "wmv", "flv"},
}


def allowed_file(filename: str) -> bool:
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    all_ext = ALLOWED_EXTENSIONS["audio"] | ALLOWED_EXTENSIONS["video"]
    return ext in all_ext


def get_file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    if ext in ALLOWED_EXTENSIONS["audio"]:
        return "audio"
    if ext in ALLOWED_EXTENSIONS["video"]:
        return "video"
    return "unknown"
