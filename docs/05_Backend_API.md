# 🔌 Backend API Reference

> **Scope**: Complete documentation of the FastAPI backend, including configuration, data models, and API endpoints.
> **Source**: `backend/app/api/v1.py`, `backend/app/config.py`

Table of Contents:
1.  [Configuration & Environment](#configuration--environment)
2.  [Data Models (Pydantic)](#data-models-pydantic)
3.  [API Endpoints](#api-endpoints)
4.  [Services Overview](#services-overview)

---

## 1. Configuration & Environment

The following environment variables control the backend behavior (`backend/app/config.py`).

| Variable | Default (Dev) | Description |
|:---|:---|:---|
| `LLM_PROVIDER` | `gemini` | AI Model Provider. |
| `LLM_API_KEY` | - | **Required**. Primary Gemini API Key. |
| `LLM_API_KEY_2`..`_12` | - | Optional keys for automatic rotation. |
| `TRANSCRIPTION_PROVIDER` | `faster_whisper` | `faster_whisper` (local), `openai`, or `assemblyai`. |
| `SUPABASE_URL` | - | **Required**. Supabase Project URL. |
| `SUPABASE_KEY` | - | **Required**. Anon/Public Key. |
| `SUPABASE_SERVICE_ROLE_KEY` | - | **Required**. Admin/Service Key (Bypasses RLS). |
| `OPTIMAL_WPM_MIN` | `130` | Minimum Words Per Minute for good score. |
| `OPTIMAL_WPM_MAX` | `160` | Maximum Words Per Minute for good score. |

---

## 2. Data Models (Pydantic)

### `MLScores` (The 6-Score System)
The core scoring object returned for every answer.
```json
{
  "content": 0-100,      // Semantic match to ideal answer
  "delivery": 0-100,     // WPM and fillers
  "communication": 0-100,// Grammar and vocab
  "voice": 0-100,        // Pitch/Energy (from audio analysis)
  "confidence": 0-100,   // Assertiveness (text + audio)
  "structure": 0-100,    // STAR method usage
  "final": 0-100         // Weighted average
}
```

### `LLMFeedback`
Structured qualitative feedback.
```json
{
  "summary": "String summary...",
  "tips": ["Tip 1", "Tip 2"],
  "strengths": ["Strength 1"],
  "star_analysis": {
    "situation": "...",
    "task": "...",
    "action": "...",
    "result": "..."
  }
}
```

---

## 3. API Endpoints

All endpoints are prefixed with `/api/v1`.

### 🏥 Health & Status
*   `GET /health`: Returns `{ status: "healthy", version: "1.0.0" }`.
*   `GET /llm/status`: Checks Gemini connection.
*   `GET /llm/keys/health`: Status of the Key Rotation system.

### 🧠 Questions Engine
*   `GET /questions`: List all static questions.
*   `POST /questions/smart`: **Core Intelligent Selection**.
    *   **Input**: `{ "job_description": "...", "num_questions": 10, "user_id": "..." }`
    *   **Logic**: Weakness Targeting (40%) + Domain Match (25%) + JD Match (20%).
*   `POST /questions/analyze-jd`: Extract keywords/domain from JD text.

### 🎙️ Interview Flow
*   `POST /submit_answer`: **Main Analysis Pipeline**.
    *   **Input (Multipart)**:
        *   `audio_file`: Binary Blob.
        *   `question_id`: Integer.
        *   `session_id`: UUID.
    *   **Process**:
        1.  `transcribe_audio`: Audio -> Text.
        2.  `score_answer`: Text -> `MLScores`.
        3.  `generate_feedback`: Text + Scores -> `LLMFeedback`.
        4.  `db.save_attempt`: Persist to Supabase.
    *   **Output**: `{ transcript, scores, feedback }`.

### 📄 Resumes
*   `POST /analyze_resume_for_domain`:
    *   **Input**: `resume` (File), `job_description`, `domain`.
    *   **Output**: `{ skill_match_pct, missing_skills, feedback }`.

### 📊 Dashboard (Auth Required)
*   `GET /dashboard/overview`: Stats + Recent Activity.
*   `GET /dashboard/analytics`: Trend analysis (7d/30d).

---

## 4. Services Overview

### `ml_engine.py`
*   **Purpose**: Deterministic scoring logic.
*   **Key Libraries**: `sentence-transformers` (Content), `textstat` (Complexity), `language-tool` (Grammar).

### `transcript_service.py`
*   **Purpose**: Audio-to-text.
*   **Logic**: Tries local `faster-whisper` (Int8/CPU) first. Falls back to OpenAI API if configured/failed.

### `llm_bridge.py`
*   **Purpose**: Formats prompts for Gemini.
*   **Key Manager**: Rotates through `LLM_API_KEY_1`...`_12` to avoid Rate Limits (429).
