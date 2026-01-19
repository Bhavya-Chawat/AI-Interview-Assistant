# 🛠️ Detailed Setup Guide

This guide walks you through setting up the AI Interview Assistant from scratch.

---

## Prerequisites

### Required Software

| Software | Minimum Version | Download |
|----------|-----------------|----------|
| Python | 3.10+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Git | Any | [git-scm.com](https://git-scm.com) |

### Required Accounts

| Service | Purpose | Link |
|---------|---------|------|
| Google AI Studio | Gemini API Key | [aistudio.google.com](https://aistudio.google.com/apikey) |
| Supabase | Database & Auth | [supabase.com](https://supabase.com) |

---

## Step 1: Get Your API Keys

### 1.1 Get Gemini API Key (Required)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select **"Create API key in new project"**
5. Copy the key (starts with `AIza...`)

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- Resets at midnight Pacific Time

### 1.2 Setup Supabase (Required for persistence)

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** and sign up
3. Click **"New Project"**
4. Fill in:
   - **Name:** `ai-interview-assistant`
   - **Database Password:** (save this!)
   - **Region:** Choose closest to you
5. Wait 2-3 minutes for project creation

**Get your keys:**
1. Go to **Settings → API**
2. Copy **Project URL** (for `SUPABASE_URL`)
3. Copy **anon public** key (for frontend `VITE_SUPABASE_ANON_KEY`)
4. Copy **service_role** key (for backend `SUPABASE_KEY`)

⚠️ **Never expose the service_role key in frontend code!**

---

## Step 2: Clone the Repository

```bash
# Clone
git clone <your-repo-url>
cd "AI Interview Assistant"
```

---

## Step 3: Backend Setup

### 3.1 Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3.2 Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- FastAPI (web framework)
- Faster-Whisper (transcription)
- Sentence-Transformers (ML scoring)
- Google Generative AI (Gemini)
- And more...

**First install takes 5-10 minutes** (downloads ML models).

### 3.3 Configure Environment

```bash
cd backend
copy .env.example .env    # Windows
# cp .env.example .env    # Mac/Linux
```

**Edit `backend/.env`:**

```env
# ===========================================
# Required: LLM Configuration
# ===========================================
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash
LLM_API_KEY=YOUR_GEMINI_API_KEY_HERE

# ===========================================
# Required: Supabase Database
# ===========================================
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_service_role_key_here

# ===========================================
# Optional: Transcription Settings
# ===========================================
TRANSCRIPTION_PROVIDER=faster_whisper
WHISPER_MODEL=base
```

### 3.4 Setup Database Schema

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Click **"New query"**
4. Copy contents of `backend/database/final_schema.sql`
5. Paste into the editor
6. Click **"Run"**

You should see "Success" after a few seconds.

---

## Step 4: Frontend Setup

### 4.1 Install Dependencies

```bash
cd frontend   # (or cd ../frontend if in backend)
npm install
```

### 4.2 Configure Environment

```bash
copy .env.example .env    # Windows
# cp .env.example .env    # Mac/Linux
```

**Edit `frontend/.env`:**

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here

# Backend URL (default for local dev)
VITE_API_URL=http://localhost:8000
```

---

## Step 5: Run the Application

### 5.1 Start Backend (Terminal 1)

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
```

### 5.2 Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 5.3 Open in Browser

- **App:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs

---

## Step 6: Create Your First Account

1. Open http://localhost:5173
2. Click **"Get Started"** or **"Sign Up"**
3. Enter your email and password
4. Check your email for verification link
5. Click the link to verify
6. Log in and start practicing!

---

## Common Setup Issues

### "Module not found" Error

```bash
pip install -r requirements.txt
```

### "CUDA not available" Warning

This is fine! The app uses CPU for transcription. CUDA is optional for faster GPU processing.

### "Supabase connection refused"

1. Check your `SUPABASE_URL` is correct
2. Verify your `SUPABASE_KEY` (use service_role, not anon)
3. Make sure database schema was applied

### "Gemini API Error 429"

You've hit the free tier limit. Solutions:
1. Wait until midnight Pacific Time
2. Create new API key in new Google Cloud project
3. Use multiple keys (comma-separated in `.env`)

### "Audio not recording"

1. Allow microphone access when prompted
2. Check browser console for errors
3. Try Chrome (best supported)
4. Make sure no other app is using the mic

---

## Multiple API Keys (Optional)

For heavy usage, use multiple Gemini keys:

```env
LLM_API_KEY=key1,key2,key3
```

The system automatically rotates between keys when one hits rate limits.

Test rotation:
```bash
cd backend
python test_key_rotation.py
```

---

## Production Deployment

For production, you'll need to:

1. Set `DEBUG=false` in backend
2. Use proper SSL certificates
3. Configure CORS for your domain
4. Use production Supabase instance
5. Consider paid Gemini tier for unlimited requests

See [Deployment Guide](./DEPLOYMENT.md) for detailed instructions.

---

## Next Steps

- Read the [User Guide](./USER_GUIDE.md) to learn how to use the app
- Check [API Reference](./API.md) for integration details
- Review main [README](../README.md) for quick reference
