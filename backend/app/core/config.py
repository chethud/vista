import os
from pathlib import Path

from dotenv import load_dotenv

# Force absolute path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
# Same value as in Supabase Dashboard → Project Settings → API → JWT Secret (verify user access_token)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip() or None

# Comma-separated browser origins allowed to call the API (Vercel preview + production + local).
# Example: https://vista.vercel.app,https://vista-git-main-xxx.vercel.app,http://127.0.0.1:5173
# If unset, defaults to local Vite dev origins (not "*") so CORS + credentials stay valid.
_raw_cors = os.getenv("CORS_ORIGINS", "").strip()
if _raw_cors:
    CORS_ORIGINS = [o.strip().rstrip("/") for o in _raw_cors.split(",") if o.strip()]
else:
    CORS_ORIGINS = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]

DEBUG = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")

if DEBUG:
    print("LOADED ENV:", env_path)
    print("SUPABASE_URL:", SUPABASE_URL)
    print("CORS_ORIGINS:", CORS_ORIGINS)