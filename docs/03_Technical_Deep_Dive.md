# 🏗️ AI Interview Assistant - Technical Master Reference

> **Version:** 3.0 (System Bible)
> **Last Updated:** January 2026

This document is the definitive technical reference for the AI Interview Assistant. It contains **every** critical detail required to understand, develop, and deploy the system, including full architecture flows, configuration references, API specifications, and internal logic breakdowns.

---

## 1. System Architecture & Flows

The system is a **Modular Monolith** built on FastAPI, designed for high performance and privacy. It separates concerns between the stateless API/AI layer and the stateful Database layer.

### 1.1 High-Level Architecture Diagram
```text
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT SIDE                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     React Frontend                          │    │
│  │   [ Dashboard ]   [ Recorder ]   [ Analysis ]   [ Auth ]    │    │
│  │         │               │              │            │       │    │
│  │   (AuthContext)   (MediaRecorder)  (Recharts)  (SupabaseJS) │    │
│  └─────────┬───────────────┬──────────────┬────────────┬───────┘    │
│            │               │              │            │            │
│  ┌─────────▼───────────────▼──────────────▼────────────▼───────┐    │
│  │                      Backend API                            │    │
│  │                (FastAPI / Python 3.10+)                     │    │
│  └─────────────────────────┬───────────────────────────────────┘    │
└────────────────────────────│────────────────────────────────────────┘
                             │ REST (JSON) + Multipart (Audio)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVICES                           │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐    │
│  │  Transcript  │   │   ML Scoring │   │      LLM Bridge       │    │
│  │   Service    │   │    Engine    │   │      (Gemini)         │    │
│  │ (Faster-     │   │ (Deterministic│   │ (Structured Prompts)  │    │
│  │  Whisper)    │   │   6-Scores)  │   │     (Key Rotation)    │    │
│  └──────┬───────┘   └──────┬───────┘   └───────────┬───────────┘    │
│         │                  │                       │                │
│         ▼                  ▼                       ▼                │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐    │
│  │  Local AI    │   │  Sentence    │   │     Google Gemini     │    │
│  │  Models      │   │  Transformers│   │       1.5 Flash       │    │
│  └──────────────┘   └──────────────┘   └───────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ SQL (RLS-Protected)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                DATABASE LAYER (Supabase PostgreSQL)                 │
│  ┌───────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Users   │  │   Sessions   │  │  Questions  │  │   Attempts  │  │
│  └───────────┘  └──────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Interview Loop Sequence
This diagram details the exact checkout flow for a single question.

```text
       USER                 FRONTEND                   BACKEND API                  DATABASE
        │                       │                           │                           │
        │ 1. Request Question   │                           │                           │
        │──────────────────────>│  POST /active_session/next│                           │
        │                       │──────────────────────────>│                           │
        │                       │                           │  Fetch User History       │
        │                       │                           │──────────────────────────>│
        │                       │                           │<──────────────────────────│
        │                       │                           │                           │
        │                       │                           │  [Intelligent Selection]  │
        │                       │                           │  (Weakness + Domain + JD) │
        │                       │  Returns Question JSON    │                           │
        │<──────────────────────│<──────────────────────────│                           │
        │                       │                           │                           │
        │ 2. Records Answer     │                           │                           │
        │──────────────────────>│                           │                           │
        │                       │  POST /submit_answer      │                           │
        │                       │  (Audio Blob + Q_ID)      │                           │
        │                       │──────────────────────────>│                           │
        │                       │                           │                           │
        │                       │                           │  ┌─────────────────────┐  │
        │                       │                           │  │ PROCESSING PIPELINE │  │
        │                       │                           │  │ 1. Transcribe (Local│  │
        │                       │                           │  │ 2. ML Scores (Local)│  │
        │                       │                           │  │ 3. LLM (Cloud)      │  │
        │                       │                           │  └─────────────────────┘  │
        │                       │                           │                           │
        │                       │                           │  INSERT INTO attempts     │
        │                       │                           │──────────────────────────>│
        │                       │  Returns Analysis JSON    │  (Triggers Update Stats)  │
        │ Displays Feedback     │<──────────────────────────│                           │
        │<──────────────────────│                           │                           │
```

---

## 2. Directory Structure & Key Files

A complete map of the codebase.

```plaintext
/
├── backend/
│   ├── app/
│   │   ├── api/                    # API Route Controllers
│   │   │   ├── v1.py               # Main Answer/Question routes
│   │   │   ├── auth.py             # Auth verification
│   │   │   └── dashboard.py        # Analytics endpoints
│   │   ├── services/               # Core Business Logic
│   │   │   ├── ml_engine.py        # 6-Score Calculation
│   │   │   ├── llm_bridge.py       # Gemini Integration
│   │   │   ├── transcript.py       # Whisper Wrapper
│   │   │   └── question_engine.py  # Selection Algorithm
│   │   ├── models/                 # Pydantic Schemas
│   │   ├── main.py                 # App Entry Point
│   │   └── config.py               # Configuration & Constants
│   ├── database/                   # SQL Schemas
│   └── uploads/                    # Temp storage for audio/resumes
├── frontend/
│   ├── src/
│   │   ├── api/                    # Axios API Client
│   │   ├── components/             # React Components (UI)
│   │   ├── context/                # AuthContext (State)
│   │   ├── pages/                  # Page Views (Dashboard, etc)
│   │   └── types/                  # TypeScript Interfaces
│   └── package.json
└── docs/                           # Documentation
```

---

## 3. Backend Logic & Services

### 3.1 ML Engine (`ml_engine.py`)
Calculates the **6-Score System** (0-100) locally.

| Score | Weight | Calculation Logic |
|-------|--------|-------------------|
| **Content** | 30% | `CosineSimilarity(Answer_Vector, Ideal_Vector)` using `sentence-transformers/all-MiniLM-L6-v2`. |
| **Delivery** | 15% | Penalizes deviations from optimal WPM (130-160) and filler word count. `Score = 100 - WPM_Penalty - (Fillers * 2)`. |
| **Communication** | 15% | NLP heuristics for grammar errors (`language-tool`) and sentence complexity/length. |
| **Voice** | 15% | Uses audio variance (Standard Deviation of volume/pitch) to detect monotony vs energy. |
| **Confidence** | 15% | Combination of Voice metrics and textual sentiment analysis (positive assertive language). |
| **Structure** | 10% | Regex search for STAR keywords: "Situation", "Task", "Action", "Result" (and variants). |

### 3.2 Intelligent Question Engine (`intelligent_question_engine.py`)
Selects the "next best question" using a weighted algorithm:
1.  **Weakness Ranking (40%)**: Prioritizes categories where the user's average score is < 70%.
2.  **Domain Relevance (25%)**: Boosts questions matching the User's target role.
3.  **JD Keyword Match (20%)**: (Optional) if Resume/JD provided, boosts questions containing matching keywords.
4.  **Difficulty Curve (15%)**: Forces progression: Easy -> Medium -> Hard based on session progress.

**Randomization**: A 20% random noise factor is added to score to prevent identical question sequences.

### 3.3 Transcription Service (`transcript_service.py`)
*   **Primary**: `faster-whisper` (Int8 quantized). Runs on CPU. Speed: ~4x realtime.
*   **Fallback**: OpenAI Whisper API (if local model fails or is disabled via config).
*   **Logic**: Audio is converted to 16kHz Mono WAV before processing.

---

## 4. Frontend Architecture

### 4.1 State Management
*   **`AuthContext.tsx`**: Manages user session via Supabase `onAuthStateChange`.
    *   Exposes: `user`, `session`, `signIn`, `signOut`.
    *   Wraps the entire App.
*   **Local State**: Used for recorder status, current question, and temporary form data.

### 4.2 Key Components
*   **`Recorder.tsx`**: Uses browser `MediaRecorder` API. Visualizes audio using `AudioContext` and `AnalyserNode` (Canvas waveform).
*   **`Dashboard.tsx`**: Fetches aggregated stats from `user_progress_overview` view. Uses `Recharts` for visualization.
*   **`FeedbackCard.tsx`**: Renders the score scores with animated progress bars (`framer-motion`).

---

## 5. Database Schema & Security

### 5.1 Tables (PostgreSQL / Supabase)
*   **`users`**: Extends `auth.users`. Contains `full_name`, `avatar_url`, `preferences`.
*   **`questions`**: usage stats (`times_asked`, `avg_score`).
*   **`interview_sessions`**: Grouping entity. Contains `job_description` and `consolidated_feedback`.
*   **`attempts`**: The detailed record. `transcript`, `audio_url`, `scores` (JSONB), `llm_feedback` (JSONB).

### 5.2 Row Level Security (RLS)
RLS is **ENABLED** on all tables.
*   **SELECT**: `auth.uid() = user_id` (Users see only their data).
*   **INSERT**: `auth.uid() = user_id` (Users create data only for themselves).
*   **Service Role**: The Backend uses the `service_role` key, bypassing RLS to calculate aggregations and manage data globally if needed (though standard API calls use user context where possible).

---

## 6. Configuration & Environment Variables

These variables control the system behavior (`.env`).

### AI & Models
*   `LLM_PROVIDER`: `gemini` (default) or `openai`.
*   `LLM_API_KEY`: Primary API Key.
*   `LLM_API_KEY_2`...`_12`: specific keys for the **Key Rotation** system.
*   `TRANSCRIPTION_PROVIDER`: `faster_whisper` (default).
*   `WHISPER_MODEL_SIZE`: `small` (default), `base`, `medium`.

### Database (Supabase)
*   `SUPABASE_URL`: Project URL.
*   `SUPABASE_KEY`: Anon/Public key (Frontend).
*   `SUPABASE_SERVICE_ROLE_KEY`: Admin key (Backend).

### Business Logic
*   `SCORE_WEIGHTS`: JSON string overrides for scoring (optional).
*   `OPTIMAL_WPM_MIN`: `130`.
*   `OPTIMAL_WPM_MAX`: `160`.

---

## 7. API Reference (Core Endpoints)

### `POST /api/v1/sessions/start`
Starts a new session context.
*   **Input**: `{ "domain": "software_engineering", "job_description": "..." }`
*   **Output**: `{ "session_id": "uuid", "created_at": "..." }`

### `POST /api/v1/questions/smart`
Gets the next question.
*   **Input**: `{ "session_id": "uuid" }`
*   **Output**:
    ```json
    {
      "id": 123,
      "question": "Tell me about a time...",
      "time_limit": 120,
      "selection_reason": "Weakness Targeting: Structure"
    }
    ```

### `POST /api/v1/submit_answer`
The main analysis pipeline.
*   **Input (Multipart)**:
    *   `audio_file`: (Binary)
    *   `question_id`: (Int)
    *   `session_id`: (UUID)
*   **Output**:
    ```json
    {
      "transcript": "...",
      "scores": { "content": 85, "delivery": 70, ... },
      "feedback": {
        "summary": "...",
        "strengths": [...],
        "improvements": [...]
      }
    }
    ```
