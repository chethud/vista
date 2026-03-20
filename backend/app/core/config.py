import os
from dotenv import load_dotenv
from pathlib import Path

# Force absolute path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
# Same value as in Supabase Dashboard → Project Settings → API → JWT Secret (verify user access_token)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip() or None

print("LOADED ENV:", env_path)
print("SUPABASE_URL:", SUPABASE_URL)