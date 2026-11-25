# 🏥 MediVoice AI

> **SDE Intern – Round 1 Assignment Submission**
>
> AI-powered voice receptionist for doctor appointment management — built with Pipecat, ElevenLabs, Google Gemini, React, and FastAPI.

---

## 🌐 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend** | https://medivoice-ai-one.vercel.app |
| **Backend API** | https://medivoice-ai-backend-wnve.onrender.com |
| **Health Check** | https://medivoice-ai-backend-wnve.onrender.com/api/health |
| **GitHub** | https://github.com/mohdasmabegum/MEDIVOICE-AI |

---

## 📋 Project Overview

MediVoice AI is a real-time voice-based medical receptionist that lets patients call in and manage appointments entirely through natural spoken conversation. A caller speaks to the AI assistant (Alex), who understands their intent, checks doctor availability from a live database, confirms the caller's identity using their spoken phone number, books or cancels appointments, and reads back all confirmations in a natural voice.

The system combines a React dashboard for clinic staff with a fully automated voice pipeline for patients — no typing, no forms.

---

## ❗ Problem Statement

Hospital reception desks are frequently overwhelmed. Patients wait on hold, miss appointments, and staff spend significant time on routine scheduling tasks. MediVoice AI automates first-line reception through voice AI, reducing wait times and freeing staff for clinical work.

---

## ✨ Key Features

| Feature | Status |
|---------|--------|
| Real-time two-way voice conversation | ✅ |
| Caller identification via spoken phone number | ✅ |
| Doctor availability lookup (live DB) | ✅ |
| Appointment booking with slot management | ✅ |
| Appointment cancellation + slot restoration | ✅ |
| Live call transcript on dashboard | ✅ |
| Appointment confirmation PDF download | ✅ |
| Multi-turn conversation with context memory | ✅ |
| Echo cancellation & voice activity detection | ✅ |
| Staff dashboard (doctors, appointments, call history) | ✅ |
| PostgreSQL persistent database on Render | ✅ |
| Vercel frontend + Render backend deployment | ✅ |

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5.6 | Type safety |
| Vite | 5.4 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| Recharts | 2.13 | Analytics charts |
| Lucide React | 1.16 | Icons |
| Web Audio API | Browser native | Microphone + VAD |
| WebSocket API | Browser native | Real-time backend transport |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.135 | REST API + WebSocket server |
| Python | 3.11 | Backend runtime |
| Uvicorn | 0.54 | ASGI server |
| SQLAlchemy | 2.1 | ORM |
| PostgreSQL | 16 | Production database (Render) |
| Pipecat AI | 1.17 | Voice pipeline orchestration |
| ElevenLabs SDK | 2.80 | Speech-to-Text + Text-to-Speech |
| Google GenAI SDK | 3.6 | Gemini LLM + function calling |
| psycopg2-binary + psycopg[binary] | — | PostgreSQL drivers |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Patient)                     │
│  Microphone → WebSocket Client → Audio() Playback       │
└─────────────────────┬───────────────────────────────────┘
                      │  wss://render-backend/ws/call
┌─────────────────────▼───────────────────────────────────┐
│              FastAPI Backend (Render)                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Pipecat Voice Pipeline                  │   │
│  │  Audio Buffer → ElevenLabs STT → Gemini LLM     │   │
│  │             → Function Calling                   │   │
│  │             → ElevenLabs TTS → Audio Response    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  REST API (/api/*)   WebSocket (/ws/call)                │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
┌──────────▼──────┐    ┌──────────▼──────────────────────┐
│  PostgreSQL DB   │    │  Staff Dashboard (Vercel/React)  │
│  (Render free)   │    │  Doctors / Appointments / Calls  │
└──────────────────┘    └─────────────────────────────────┘
```

---

## 🎙 Complete Voice Pipeline

```
Browser Microphone
       ↓  (audio/webm;codecs=opus via MediaRecorder)
WebSocket Transport  (wss://render-backend/ws/call)
       ↓  (base64-encoded audio chunks + speech_end signal)
ElevenLabs Scribe STT  (scribe_v1 model)
       ↓  (recognized text, tag_audio_events=False)
Google Gemini LLM  (gemini-3.5-flash / gemini-3.5-flash-lite)
       ↓  (AI response text + optional tool calls)
Function Calling  (check_availability / book / cancel / confirm_phone)
       ↓  (database results injected back into Gemini context)
ElevenLabs TTS  (eleven_flash_v2_5, Alice voice, mp3_44100_64)
       ↓  (MP3 audio bytes as base64)
Browser Audio()  (decoded and played through the speakers)
       ↓
Microphone re-activates for next turn (continuous conversation)
```

### Pipeline Stage Details

#### 1. Browser Microphone Capture
- `navigator.mediaDevices.getUserMedia` with `echoCancellation`, `noiseSuppression`, and `autoGainControl` enabled.
- `MediaRecorder` records in `audio/webm;codecs=opus` segments (250ms intervals).
- Voice Activity Detection (VAD) measures RMS audio energy against a threshold (0.025) every animation frame.
- When the user stops speaking (650ms of silence), the recorder stops and flushes a complete WebM container.
- An echo cooldown (450ms after AI finishes speaking) prevents the AI's own voice from triggering a new STT request.

#### 2. WebSocket Transport (Pipecat)
- The frontend connects to `wss://render-backend/ws/call`.
- JSON control messages: `init`, `audio_chunk` (base64 WebM), `speech_end`, `text_input`, `interrupt`, `ping`, `end_call`.
- JSON server messages: `connection_ready`, `call_state`, `stt_transcript`, `llm_response`, `audio_response`, `booking_confirmed`, `cancellation_confirmed`, `speech_error`.
- An outgoing message queue handles messages sent before the WebSocket opens.
- Audio chunks are only sent when `readyState === OPEN`.

#### 3. ElevenLabs Speech-to-Text (Scribe)
- Model: `scribe_v1`.
- `tag_audio_events=False` prevents non-speech labels like `[outro jingle]` or `[music]` from appearing in the transcript.
- Residual event tags are stripped with a regex before the text reaches Gemini.
- Audio shorter than 800 bytes is discarded (not sent to STT).

#### 4. Google Gemini LLM
- SDK: `google-genai` 3.6.
- Model cascade: `gemini-3.5-flash` → `gemini-3.5-flash-lite` → `gemini-3.8-flash` (tries each on 503/504).
- `AutomaticFunctionCallingConfig(disable=True)` — the pipeline manages tool calls manually in a loop (up to 5 iterations), so tool results are always inspected and injected into the response.
- System instruction tells Alex to identify the caller, collect phone number, check availability, confirm bookings, and never claim success without a database confirmation.

#### 5. Function Calling
Four tools are exposed to Gemini:

| Tool | Action |
|------|--------|
| `confirm_caller_phone` | Normalises and stores the spoken phone number in the active session |
| `check_doctor_availability` | Queries the PostgreSQL doctors table with fuzzy name/specialization matching |
| `book_appointment` | Validates the slot, creates the appointment row, removes the slot from the doctor |
| `cancel_appointment` | Sets the appointment to cancelled, restores the slot to the doctor |

#### 6. ElevenLabs Text-to-Speech
- Voice: Alice (`Xb7hH8MSUJpSbSDYk0k2`) — clear, warm, professional.
- Model: `eleven_flash_v2_5` (low-latency flash model).
- Output format: `mp3_44100_64` (64 kbps, 44.1 kHz — lower latency than 128 kbps).
- Audio bytes are base64-encoded and sent to the browser as a JSON `audio_response` message.

#### 7. Browser Audio Playback
- Decoded from base64 → `Blob` → `URL.createObjectURL` → `new Audio(url).play()`.
- Queued sequentially: each segment plays after the previous ends.
- An interrupt signal (loud speech while AI is speaking) pauses playback immediately.

---

## 🔐 Caller Identification via Spoken Phone Number

The assistant always collects and confirms the caller's phone number before booking or cancelling:

1. **Alex asks**: "Could I please have your phone number?"
2. **Caller speaks digits**: "Five five five, seven three two, nine one zero four."
3. **Alex reads back**: "I have your number as (555) 732-9104. Is that correct?"
4. **Caller confirms**: "Yes."
5. **`confirm_caller_phone` tool is called**: digits are normalised, formatted, and stored in `session_state["confirmed_phone"]`.
6. All subsequent booking and cancellation calls **automatically inject the confirmed phone** — the caller never has to repeat it.

---

## 📅 Appointment Booking Workflow

```
Caller: "I'd like to see Dr. Sarah Chen this afternoon."
  → check_doctor_availability("Dr. Sarah Chen")
  → DB returns: slots ["09:00 AM", "11:30 AM", "02:30 PM", "04:00 PM"]

Alex: "Dr. Chen has 2:30 PM and 4:00 PM available. Which do you prefer?"
Caller: "Two thirty please."

Alex: "Great. May I have your full name?"
Caller: "John Smith."

Alex: "To confirm — John Smith with Dr. Sarah Chen at 2:30 PM today. Shall I go ahead?"
Caller: "Yes."
  → book_appointment(patient_name="John Smith", patient_phone="(555) 732-9104",
                      doctor_id="doc-1", slot="02:30 PM")
  → Slot removed from doctor, appointment row created, booking ID returned.

Alex: "Your appointment is confirmed! Booking reference MED-2026-XXXX, Suite 402 Wing B."
  → Frontend receives booking_confirmed event → shows BookingSuccessModal with PDF download.
```

---

## ❌ Appointment Cancellation Workflow

```
Caller: "I need to cancel my appointment."
  → cancel_appointment(phone="(555) 732-9104")
  → DB finds active appointment for that phone.

Alex: "I found your appointment with Dr. Sarah Chen at 2:30 PM. 
       Shall I cancel it?"
Caller: "Yes, please."
  → cancel_appointment confirmed → status set to "cancelled" → slot restored.

Alex: "Your appointment has been cancelled. The 2:30 PM slot is now available again."
  → Frontend receives cancellation_confirmed event → updates appointments list.
```

---

## 🗄 Database Design

**PostgreSQL on Render** (`medivoice_9oty`).

### `doctors` table
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR PK | e.g. `doc-1` |
| name | VARCHAR | Dr. Sarah Chen |
| specialization | VARCHAR | Cardiology |
| department | VARCHAR | Cardiovascular Medicine |
| status | VARCHAR | available / in_consultation / off_duty |
| slots_today | TEXT (JSON) | `["09:00 AM", "11:30 AM"]` |
| room_number | VARCHAR | Suite 402 - Wing B |
| rating, total_patients, experience_years | FLOAT/INT | — |

### `appointments` table
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR PK | e.g. `MED-2026-7284` |
| patient_name | VARCHAR | John Smith |
| patient_phone | VARCHAR | (555) 732-9104 |
| doctor_id | VARCHAR FK | References doctors.id |
| time_slot | VARCHAR | 02:30 PM |
| date_time | VARCHAR | Today, Nov 25, 2026 |
| status | VARCHAR | confirmed / cancelled / completed |
| booked_via | VARCHAR | ai_voice / patient_portal |
| symptoms | VARCHAR | Consultation note |
| room_number | VARCHAR | Suite 402 - Wing B |

### `call_records` table
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR PK | call-XXXXX |
| caller_phone | VARCHAR | (555) 732-9104 |
| duration_seconds | INT | 78 |
| outcome | VARCHAR | appointment_booked / cancelled / inquiry_answered |
| transcript | TEXT (JSON) | Full conversation turns |
| sentiment | VARCHAR | positive / neutral / negative |

---

## 🖥 Frontend Dashboard

Built in React + TypeScript + Tailwind CSS. Sections:

| Section | Description |
|---------|-------------|
| **Overview** | Live stats cards, recent calls, activity chart |
| **AI Assistant** | Voice call UI — start call, waveform, live transcript, booking modal |
| **Doctors** | Roster with availability, slots, status badges |
| **Appointments** | Active appointments list with cancel button |
| **Call History** | Past calls with transcript viewer |
| **Settings** | Backend URL configuration, theme |

The `BookingSuccessModal` includes a **Download Slip (PDF)** button that generates a styled binary PDF receipt using the custom `appointmentSlipGenerator.ts` utility (no external PDF library required).

---

## 🔌 Backend API

Base URL: `https://medivoice-ai-backend-wnve.onrender.com`

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health, DB status, API key status |
| GET | `/api/doctors` | List all doctors (filter by specialization, status) |
| GET | `/api/doctors/availability` | Doctor availability with open slots |
| GET | `/api/appointments` | List appointments (filter by status, phone) |
| GET | `/api/appointments/{id}` | Single appointment by booking ID |
| POST | `/api/appointments` | Create appointment (staff dashboard) |
| POST | `/api/appointments/{id}/cancel` | Cancel appointment by booking ID |
| GET | `/api/calls` | Call records list |
| POST | `/api/chat` | Text-based Gemini chat (fallback when no WebSocket) |
| POST | `/api/tts` | Trigger ElevenLabs TTS on a text string |

### WebSocket Endpoint

| Path | Description |
|------|-------------|
| `/ws/call` | Full-duplex voice pipeline — audio in, audio out |

---

## ⚙ Environment Variables

### Backend (Render)
```env
GEMINI_API_KEY=your_google_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
DATABASE_URL=postgresql://user:password@host/dbname
FRONTEND_URL=https://medivoice-ai-one.vercel.app
PYTHON_VERSION=3.11.11
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-render-backend.onrender.com/api
VITE_WS_URL=wss://your-render-backend.onrender.com/ws/call
```

> **Never commit `.env` files or actual credentials to Git.**  
> Both `.env` and `backend/.env` are listed in `.gitignore`.

---

## 💻 Local Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- A Google Gemini API key
- An ElevenLabs API key

### 1. Clone the repository
```bash
git clone https://github.com/mohdasmabegum/MEDIVOICE-AI.git
cd MEDIVOICE-AI
```

### 2. Backend setup
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
venv\Scripts\activate          # Windows

# Install backend dependencies
pip install -r backend/requirements.txt

# Create backend environment file
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys:
#   GEMINI_API_KEY=your_key_here
#   ELEVENLABS_API_KEY=your_key_here
```

### 3. Frontend setup
```bash
npm install

# Create frontend environment file
cp .env.example .env
# Edit .env:
#   VITE_API_URL=http://localhost:8080/api
#   VITE_WS_URL=ws://localhost:8080/ws/call
```

### 4. Start the backend
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```

### 5. Start the frontend
```bash
npm run dev
# Open http://localhost:3000
```

The Vite dev server proxies `/api` and `/ws` to `localhost:8080` automatically.

---

## 🚀 Production Deployment

### Architecture
```
Caller's Browser ──wss──→ Render Backend (FastAPI/Uvicorn)
Staff Browser ────https──→ Vercel CDN (React SPA)
Render Backend ───SQL────→ Render PostgreSQL (Free tier)
```

### Backend — Render Web Service
- **Build command**: `pip install -r backend/requirements.txt`
- **Start command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Health check path**: `/api/health`
- **Region**: Oregon (US West)
- Set all five environment variables in the Render dashboard under Environment.

### Frontend — Vercel
- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`
- Set `VITE_API_URL` and `VITE_WS_URL` in Vercel Project → Settings → Environment Variables.
- Rewrites route all paths to `/index.html` (SPA routing).

### Database — Render PostgreSQL (Free)
- Created in the same Render region as the backend service.
- Internal connection string used (no SSL overhead within Render network).
- Tables are created automatically on first startup via SQLAlchemy `create_all`.
- Seed data (5 doctors, sample appointments) is inserted if the tables are empty.

---

## 📁 Project Structure

```
MEDIVOICE-AI/
├── backend/                    # FastAPI Python backend
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, REST routes, WebSocket entry
│   ├── config.py               # Environment variable loading
│   ├── database.py             # SQLAlchemy models, DB init, seed data
│   ├── requirements.txt        # Python dependencies
│   ├── pipeline/
│   │   └── pipecat_pipeline.py # Pipecat voice session + WebSocket handler
│   └── services/
│       ├── gemini_service.py   # Gemini LLM + function calling
│       ├── elevenlabs_service.py  # ElevenLabs STT + TTS
│       └── appointment_service.py # DB-backed appointment CRUD
│
├── src/                        # React TypeScript frontend
│   ├── App.tsx                 # Root component + routing
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── assistant/          # VoiceCallInterface, waveform, transcript
│   │   ├── appointments/       # AppointmentsView, AppointmentCard
│   │   ├── call-history/       # CallHistoryView, TranscriptViewer
│   │   ├── common/             # ToastNotification, LoadingSpinner
│   │   ├── doctors/            # DoctorsView, DoctorCard
│   │   ├── layout/             # Sidebar, Header
│   │   ├── modals/             # BookingSuccessModal, CancellationModal
│   │   ├── overview/           # StatsCards, ActivityChart
│   │   └── settings/           # SettingsView
│   ├── hooks/
│   │   └── useVoiceCall.ts     # WebSocket, VAD, MediaRecorder, audio queue
│   ├── services/
│   │   └── api.ts              # REST API helpers (fetch wrappers)
│   ├── types/                  # TypeScript interfaces
│   └── utils/
│       └── appointmentSlipGenerator.ts  # PDF receipt generator
│
├── api/                        # Vercel serverless stub (health check only)
│   ├── index.py
│   └── requirements.txt
│
├── .env.example                # Frontend env template
├── .gitignore
├── .npmrc                      # npm config (cache, esbuild install-scripts)
├── index.html
├── package.json
├── vite.config.ts
├── vercel.json                 # Vercel deployment config
├── render.yaml                 # Render deployment config
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 🔒 Security Considerations

- API keys are stored exclusively in server-side environment variables — never in frontend code or Git.
- `.env` and `backend/.env` are listed in `.gitignore`.
- CORS is locked to known origins: `localhost`, `medivoice-ai-one.vercel.app`, and all `medivoice*.vercel.app` preview deployments.
- Security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) are set via Vercel.
- WebSocket audio connections are only accepted from known frontend origins.
- Phone numbers are normalised (digits only) before storage; raw audio is never persisted.
- PostgreSQL credentials are accessed via Render's internal connection string (not exposed publicly).

---

## 🔮 Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| Streaming TTS | Stream audio chunks as they are generated to reduce first-word latency |
| Partial transcripts | Display live STT partial results while the caller is still speaking |
| SMS confirmation | Send appointment confirmation SMS after booking |
| Multi-language support | Detect caller language and respond in kind |
| Calendar integration | Sync confirmed appointments to Google Calendar |
| EHR integration | Pull patient history from Electronic Health Records |
| Call queue management | Handle simultaneous callers with a queue system |
| Analytics dashboard | Detailed call analytics, peak hours, outcome tracking |
| Caller ID lookup | Match inbound phone number to patient records automatically |

---

## 📦 Assignment Submission Deliverables

This repository satisfies the three required deliverables for the SDE Intern Round 1 assignment:

### Deliverable 1 — GitHub Repository
Complete source code for both frontend and backend, production deployment configuration, and this README. All features are implemented and deployed.

**Repository:** https://github.com/mohdasmabegum/MEDIVOICE-AI

### Deliverable 2 — Video Demonstration (≤ 3 minutes)
The video demonstrates the complete appointment booking flow:
1. Opening the MediVoice AI dashboard
2. Clicking "Start Call" to connect to the voice backend
3. Hearing the AI greeting ("Good day! Thank you for calling Metropolitan Health Clinic...")
4. Speaking a request ("I'd like to book an appointment with Dr. Sarah Chen")
5. AI checking availability and presenting slots
6. Caller confirming phone number, name, and time slot
7. Booking confirmation with booking ID and room number
8. Appointment appearing on the staff dashboard
9. PDF slip download

### Deliverable 3 — Voice Pipeline Description
The voice pipeline is documented in full in the **Complete Voice Pipeline** section above. In brief:

> The patient's microphone audio is captured by the browser, segmented into WebM/Opus chunks by a MediaRecorder with built-in voice activity detection, and sent over a persistent WebSocket connection to the FastAPI backend. The Pipecat pipeline passes the audio to ElevenLabs Scribe for speech recognition, feeds the resulting text to Gemini with the full conversation history and four callable tools, executes any tool calls (availability checks, bookings, cancellations, phone confirmation) against a PostgreSQL database, then sends the AI's text response to ElevenLabs TTS. The resulting MP3 audio is base64-encoded and sent back over the same WebSocket for the browser to decode and play through the system speakers. The microphone immediately reactivates for the next turn, enabling a continuous natural conversation.

---

## 📄 License

This project was created for the **SDE Intern – Round 1 Assignment** evaluation. All code is original work by the submitting candidate.
