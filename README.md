# MediVoice AI

Clinical Voice Intelligence Platform built with React, FastAPI, Pipecat, Gemini LLM, ElevenLabs STT/TTS, and SQLAlchemy.

## Production Architecture

| Component | Platform | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Vercel | React + Vite dashboard (`https://medivoice-ai-one.vercel.app`) |
| **Backend** | Render or Railway | FastAPI REST API + persistent WebSocket (`/ws/call`) Pipecat voice pipeline |
| **Database** | PostgreSQL (Render/Railway) | Persistent storage for doctors, appointments, and call history |

> **Why split hosting?** Vercel Serverless Functions do not support persistent WebSockets required for real-time voice streaming (`/ws/call`), and local SQLite is ephemeral in serverless containers. Hosting the backend on Render or Railway with PostgreSQL enables real-time `wss://` voice calls and persistent records.

---

## 1. Local Development

### Backend
```bash
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# Add GEMINI_API_KEY and ELEVENLABS_API_KEY in backend/.env
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080
```

### Frontend
```bash
npm install
npm run dev
```
The Vite dev server runs at `http://localhost:3000` and proxies `/api` and `/ws` to `http://localhost:8080`.

---

## 2. Backend Deployment (Render — Recommended)

This repository includes `render.yaml` (Render Blueprint) for one-click setup with PostgreSQL.

1. Push your repository to GitHub (ensure `.env` and `backend/.env` are **not** committed).
2. In **Render Dashboard**, click **New + → Blueprint** and connect your GitHub repo.
3. Render detects `render.yaml` and creates:
   - **Web Service:** `medivoice-ai-backend`
     - Build Command: `pip install -r backend/requirements.txt`
     - Start Command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
     - Health Check Path: `/api/health`
   - **PostgreSQL Database:** `medivoice-db` (auto-linked via `DATABASE_URL`).
4. In Render **Environment** tab for `medivoice-ai-backend`, set the secret keys:
   - `GEMINI_API_KEY` = `<your Gemini API key>`
   - `ELEVENLABS_API_KEY` = `<your ElevenLabs API key>`
   - `FRONTEND_URL` = `https://medivoice-ai-one.vercel.app`
5. Deploy and note your backend URL (e.g. `https://medivoice-ai-backend.onrender.com`).

### Alternative: Railway
This repository also includes `railway.toml` and `Procfile`.
1. Create a new Railway project from your GitHub repo and add a **PostgreSQL** service.
2. Set environment variables on the backend service:
   - `GEMINI_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `DATABASE_URL` (reference Railway PostgreSQL `${{Postgres.DATABASE_URL}}`)
   - `FRONTEND_URL` = `https://medivoice-ai-one.vercel.app`
3. Railway uses `railway.toml` (`python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`).
4. Generate a public domain in Railway Networking settings (e.g. `https://medivoice-ai-backend.up.railway.app`).

---

## 3. Frontend Deployment (Vercel)

1. Open **Vercel Dashboard → `medivoice-ai` → Settings → Environment Variables**.
2. Add the following **Production** variables pointing to your deployed backend:
   - `VITE_API_URL` = `https://your-backend-domain/api`
   - `VITE_WS_URL` = `wss://your-backend-domain/ws/call`
3. Trigger a production redeployment in Vercel (or run `vercel --prod`).
4. Open `https://medivoice-ai-one.vercel.app` and verify the dashboard loads and **Start AI Call** connects over `wss://`.
