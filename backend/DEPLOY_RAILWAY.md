# MediVoice AI — Railway Backend Deployment

## Deploy to Railway in 3 steps

Railway is the recommended host for the MediVoice AI backend.
It supports Python, FastAPI, WebSockets, and persistent SQLite.

### Step 1 — Install Railway CLI (if not installed)
```bash
npm install -g @railway/cli
```

### Step 2 — Login and deploy
```bash
# Login to Railway
railway login

# From the MEDIVOICE AI/backend directory:
cd backend
railway init          # Creates new Railway project (name it: medivoice-ai-backend)
railway up            # Deploys the backend
```

### Step 3 — Set environment variables in Railway dashboard
Go to https://railway.com → Your project → Variables tab and add:

```
GEMINI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
DATABASE_URL=sqlite:///./medivoice.db
PORT=8080
HOST=0.0.0.0
```

### Step 4 — Get your Railway URL
After deployment, Railway gives you a URL like:
`https://medivoice-ai-backend.up.railway.app`

### Step 5 — Update Vercel frontend env var
In Vercel Dashboard → medivoice-ai → Settings → Environment Variables:
```
VITE_API_URL = https://medivoice-ai-backend.up.railway.app/api
```

Then redeploy the Vercel frontend:
```bash
vercel --prod
```
