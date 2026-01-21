# 🏗️ AI Interview Assistant - Technical Master Reference

> **Version:** 3.0 (System Bible)
> **Last Updated:** January 2026

This document is the definitive technical reference for the AI Interview Assistant. It contains **every** critical detail required to understand, develop, and deploy the system, including full architecture flows, configuration references, API specifications, and internal logic breakdowns.

> **Detailed Reference Documentation**:
> *   [🗄️ Database Schema Reference](04_Database_Schema.md) - Full SQL, RLS, & Triggers.
> *   [🔌 Backend API Reference](05_Backend_API.md) - Endpoints, Config, & Models.
> *   [💻 Frontend Architecture](06_Frontend_Architecture.md) - Component Tree & State.

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

### 1.2 "Multimodal Analysis" System Pipeline
 This diagram visualizes how the system fuses Audio, Video, and Text signals using specific AI models.
 
 ```text
 ╔═══════════════════════════╗      ╔════════════════════════════════════════════════════════════════════╗
 ║        USER INPUT         ║      ║                            FRONTEND                                ║
 ║ [Microphone] + [WebCam]   ║─────►║ • Framework: React + Vite + Typescript                             ║
 ║                           ║      ║ • Capture: MediaRecorder API (Blob Generation)                     ║
 ╚═══════════════════════════╝      ║ • Comp. Vision: TensorFlow.js / MediaPipe (Face/Eye Tracking)      ║
                                    ║ • State: AuthContext (Session Management)                          ║
                                    ╚════════════════════════════════╦═══════════════════════════════════╝
                                                                     │
                                             (HTTPS POST / Multipart Form Data)
                                                                     ▼
 ╔═══════════════════════════════════════════════════════════════════▼═══════════════════════════════════╗
 ║                                           BACKEND API (FastAPI)                                       ║
 ╠═══════════════════════════════════════════════════════════════════════════════════════════════════════╣
 ║  1. VALIDATION LAYER                                                                                  ║
 ║     • Schema: Pydantic (File Size, MIME Type checks)                                                  ║
 ║     • Auth: Supabase JWT Verification                                                                 ║
 ║                                                                                                       ║
 ║  2. MULTIMODAL PROCESSING ENGINE (Parallel Execution)                                                 ║
 ║     │                                                                                                 ║
 ║     ├─► [ TRACK A: VISUAL SIGNAL ] ────────────────────────────────────────────────────────┐          ║
 ║     │     • Input: Eye Contact Metadata from Frontend                                      │          ║
 ║     │     • Logic: Confidence Heuristic Calculation                                        │          ║
 ║     │     • Output: `ConfidenceScore` (0-100)                                              │          ║
 ║     │                                                                                      │          ║
 ║     ├─► [ TRACK B: AUDIO SIGNAL ] ─────────────────────────────────────────────────────────┤          ║
 ║     │     • Tool: FFmpeg (Convert to 16kHz WAV)                                            │          ║
 ║     │     • Logic: Librosa/Scipy (Energy, Pitch Variance, Pause Rate)                      │          ║
 ║     │     • Output: `VoiceScore` (Monotony vs. Expressiveness)                             │          ║
 ║     │                                                                                      │          ║
 ║     └─► [ TRACK C: SEMANTIC SIGNAL ] ──────────────────────────────────────────────────────┤          ║
 ║           • Model: `faster-whisper` (Int8 Quantized Transformer)                           │          ║
 ║           • Action: Speech-to-Text Transcription                                           │          ║
 ║           │                                                                                │          ║
 ║           ▼ (Text)                                                                         ▼          ║
 ║         [ NLP ANALYZER ]                                                            [ FUSION LAYER ]  ║
 ║           • Semantic Match: `sentence-transformers/all-MiniLM-L6-v2` (BERT)   ◄──── • Weighted Sum  ║
 ║             -> CosineSimilarity(UserAnswer, IdealAnswer)                            • Content: 30%  ║
 ║           • Grammar: `language-tool-python`                                         • Voice:   15%  ║
 ║           • Structure: Regex Pattern Matching (STAR Method)                         • Visual:  15%  ║
 ║           • Output: `ContentScore`, `StructureScore`, `CommunicationScore`          • Delivery:15%  ║
 ║                                                                                                       ║
 ║  3. FEEDBACK GENERATION                                                                               ║
 ║     • Service: Google Gemini 1.5 Flash (via `google-generativeai`)                                    ║
 ║     • Prompt: Context-Aware System Instruction + Transcript + Scores                                  ║
 ║     • Output: Structured JSON (Tips, Strengths, Weaknesses)                                           ║
 ╚═══════════════════════════════════════════════════════════════════╦═══════════════════════════════════╝
                                                                     │
                                             (Async Database Transaction)
                                                                     ▼
 ╔═══════════════════════════════════════════════════════════════════▼═══════════════════════════════════╗
 ║                                      DATABASE (Supabase / PostgreSQL)                                 ║
 ╠═══════════════════════════════════════════════════════════════════════════════════════════════════════╣
 ║  TABLE: public.attempts                                                                               ║
 ║  ──────────────────────                                                                               ║
 ║  + id (UUID)                                                                                          ║
 ║  + audio_url (Storage/S3)                                                                             ║
 ║  + transcript (Text)                                                                                  ║
 ║  + ml_scores (JSONB) <──[Persisted]                                                                   ║
 ║  + video_metadata (JSONB)                                                                             ║
 ║                                                                                                       ║
 ║  [ AUTOMATED TRIGGERS ]                                                                               ║
 ║  1. `update_user_stats()` ──► Increment Total Attempts, Update Streaks                                ║
 ║  2. `update_skill_prog()` ──► Recalculate Rolling Averages per Skill                                  ║
 ║  3. `update_quest_hist()` ──► Track Difficulty & Frequency for Question Engine                        ║
 ╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
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
