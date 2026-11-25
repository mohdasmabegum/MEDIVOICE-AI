"""
MediVoice AI — Vercel Serverless Entry Point
Adapts the existing FastAPI backend for Vercel's Python serverless runtime.

Vercel rewrites /api/:path* → /api/index (this file).
The FastAPI app already has all routes registered as /api/* so the 
incoming path is preserved correctly by Vercel's ASGI handler.

WebSocket (/ws/call) is NOT available on Vercel's serverless tier.
The frontend gracefully falls back to REST /api/chat when WS fails.
"""

import sys
import os

# Add project root so `backend` package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load local .env for development (no-op in Vercel — uses dashboard env vars)
try:
    from dotenv import load_dotenv
    _root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(_root, "backend", ".env"), override=False)
except Exception:
    pass

# Re-export the FastAPI app — Vercel uses `app` as the ASGI entry point
from backend.database import init_db
from backend.main import app  # noqa: F401

# Ensure SQLite tables and initial doctors are seeded on cold start
init_db()
