import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent

# Load .env file from backend or root
env_path = BASE_DIR / ".env"
if not env_path.exists():
    env_path = BASE_DIR.parent / ".env"

load_dotenv(dotenv_path=env_path)

# API Keys and Settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "").strip()
_default_db = (
    "sqlite:////tmp/medivoice.db"
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV")
    else f"sqlite:///{BASE_DIR / 'medivoice.db'}"
)
DATABASE_URL = os.getenv("DATABASE_URL", _default_db).strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if (os.getenv("VERCEL") or os.getenv("VERCEL_ENV")) and DATABASE_URL.startswith("sqlite:///./"):
    DATABASE_URL = "sqlite:////tmp/medivoice.db"

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://medivoice-ai-one.vercel.app").strip()
HOST = os.getenv("HOST", "0.0.0.0").strip()
PORT = int(os.getenv("PORT", "8080").strip() if os.getenv("PORT") else 8080)

def is_valid_key(key: str) -> bool:
    if not key:
        return False
    placeholders = [
        "your_rotated_gemini_key",
        "your_rotated_elevenlabs_key",
        "your_gemini_api_key_here",
        "your_elevenlabs_api_key_here",
        "placeholder",
        "none",
        "todo"
    ]
    return key.lower() not in placeholders and len(key) >= 10

def is_gemini_configured() -> bool:
    return is_valid_key(GEMINI_API_KEY)

def is_elevenlabs_configured() -> bool:
    return is_valid_key(ELEVENLABS_API_KEY)

# Safe status representation that never leaks secrets
def get_safe_status():
    return {
        "gemini_configured": is_gemini_configured(),
        "elevenlabs_configured": is_elevenlabs_configured(),
        "database_url_type": "sqlite" if "sqlite" in DATABASE_URL else "other",
        "host": HOST,
        "port": PORT
    }
