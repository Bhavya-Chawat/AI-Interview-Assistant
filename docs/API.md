# 🔌 API Reference

Complete API documentation for the AI Interview Assistant backend.

**Base URL:** `http://localhost:8000/api/v1`

**Interactive Docs:** http://localhost:8000/docs

---

## Table of Contents

- [Authentication](#authentication)
- [Health & Status](#health--status)
- [Questions](#questions)
- [Sessions](#sessions)
- [Answer Submission](#answer-submission)
- [Resume Analysis](#resume-analysis)
- [Error Handling](#error-handling)

---

## Authentication

Most endpoints require a valid user ID. The frontend handles authentication via Supabase, and passes the user ID in request bodies.

For server-to-server calls, use the Supabase service role key.

---

## Health & Status

### Check API Health

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "api": true,
    "transcription": true,
    "llm": true,
    "database": true
  },
  "version": "1.0.0",
  "timestamp": "2024-01-19T12:00:00Z"
}
```

---

## Questions

### Get Interview Domains

```http
GET /domains
```

**Response:**
```json
[
  {
    "id": "software_engineering",
    "name": "Software Engineering",
    "description": "Technical and behavioral questions for developers",
    "icon": "💻"
  },
  {
    "id": "management",
    "name": "Management",
    "description": "Leadership and team management scenarios",
    "icon": "💼"
  }
  // ... more domains
]
```

### Get Smart Questions

```http
POST /questions/smart
```

**Request Body:**
```json
{
  "domain": "software_engineering",
  "difficulty": "medium",
  "count": 10,
  "job_description": "Senior React Developer position...",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": "uuid",
      "question": "Tell me about a time you debugged a complex issue.",
      "ideal_answer": "Expected answer with key points...",
      "category": "behavioral",
      "difficulty": "medium",
      "keywords": ["debugging", "problem-solving", "systematic"],
      "time_limit_seconds": 120
    }
    // ... more questions
  ],
  "domain": "software_engineering",
  "total_count": 10
}
```

### Get Random Questions

```http
GET /questions/random?domain=management&count=5
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| domain | string | required | Interview domain |
| count | integer | 10 | Number of questions |
| difficulty | string | "medium" | easy/medium/hard |

---

## Sessions

### Create Session

```http
POST /sessions/create
```

**Request Body:**
```json
{
  "user_id": "uuid",
  "domain": "software_engineering",
  "job_description": "Optional job description...",
  "job_title": "Senior Developer",
  "num_questions": 10,
  "session_name": "Google Interview Prep"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "in_progress",
  "created_at": "2024-01-19T12:00:00Z"
}
```

### Get Session Details

```http
GET /sessions/{session_id}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "domain": "software_engineering",
    "status": "in_progress",
    "total_questions": 10,
    "completed_count": 5,
    "skipped_count": 2,
    "avg_final_score": 75.5,
    "created_at": "2024-01-19T12:00:00Z",
    "questions": [...]
  },
  "attempts": [
    {
      "id": "uuid",
      "question_id": "uuid",
      "question_text": "Tell me about...",
      "transcript": "My answer was...",
      "final_score": 78,
      "content_score": 80,
      "delivery_score": 75,
      "is_skipped": false,
      "ml_scores": {...},
      "llm_feedback": {...}
    }
  ]
}
```

### Get User Sessions

```http
GET /sessions/user/{user_id}?status=completed&limit=10
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | null | Filter by status |
| limit | integer | 50 | Max results |
| offset | integer | 0 | Pagination offset |

### Skip Question

```http
POST /sessions/{session_id}/skip
```

**Request Body:**
```json
{
  "question_id": "uuid",
  "question_text": "The question being skipped"
}
```

### Complete Session

```http
POST /sessions/{session_id}/complete
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "final_score": 76.5,
  "completed_count": 8,
  "skipped_count": 2
}
```

---

## Answer Submission

### Submit Audio Answer

```http
POST /submit_answer
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| audio_file | File | Yes | WAV/MP3/WebM audio |
| question | string | Yes | Question text |
| ideal_answer | string | Yes | Expected answer |
| domain | string | Yes | Interview domain |
| session_id | string | Yes | Session UUID |
| question_id | string | Yes | Question UUID |
| user_id | string | Yes | User UUID |
| job_description | string | No | JD for context |
| category | string | No | Question category |

**Response:**
```json
{
  "attempt_id": "uuid",
  "question_id": "uuid",
  "question_text": "Tell me about...",
  "transcript": "Transcribed answer text...",
  "duration_seconds": 95,
  "scores": {
    "content": 80,
    "delivery": 75,
    "communication": 78,
    "voice": 72,
    "confidence": 76,
    "structure": 70,
    "final": 77,
    "wpm": 145,
    "filler_count": 3,
    "grammar_errors": 1,
    "relevance": 0.82
  },
  "feedback": {
    "summary": "Good answer with clear examples...",
    "strengths": ["Strong opening", "Used STAR method"],
    "improvements": ["Add more specific metrics"],
    "tips": ["Practice reducing filler words"],
    "example_answer": "Here's how you could improve...",
    "star_analysis": {
      "situation": "Good - clearly set context",
      "task": "Partial - could be more specific",
      "action": "Good - detailed steps",
      "result": "Good - included metrics"
    }
  },
  "keywords_found": ["debugging", "systematic"],
  "keywords_missing": ["root cause"],
  "voice_feedback": ["Good pace", "Confident tone"],
  "confidence_feedback": ["Steady delivery"]
}
```

### Submit Text Answer (Development)

```http
POST /submit_text_answer
```

**Request Body:**
```json
{
  "transcript": "My typed answer...",
  "question": "The question",
  "ideal_answer": "Expected answer",
  "domain": "software_engineering",
  "duration_seconds": 90,
  "session_id": "uuid",
  "question_id": "uuid",
  "user_id": "uuid"
}
```

---

## Resume Analysis

### Upload and Analyze Resume

```http
POST /analyze_resume_for_domain
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| resume | File | Yes | PDF or DOCX |
| job_description | string | Yes | Target JD |
| domain | string | Yes | Interview domain |

**Response:**
```json
{
  "skill_match_pct": 75,
  "matched_skills": ["Python", "React", "AWS"],
  "missing_skills": ["Kubernetes", "GraphQL"],
  "experience_years": 5,
  "recommendations": [
    "Add Kubernetes experience to strengthen candidacy",
    "Consider highlighting GraphQL projects"
  ]
}
```

### Upload Resume Text Only

```http
POST /upload_resume
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | PDF or DOCX |

**Response:**
```json
{
  "text": "Extracted resume text...",
  "word_count": 450
}
```

---

## Error Handling

### Error Response Format

```json
{
  "detail": "Error message here",
  "error_code": "QUOTA_EXCEEDED",
  "timestamp": "2024-01-19T12:00:00Z"
}
```

### Common Error Codes

| HTTP Code | Error Code | Description |
|-----------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Missing or invalid auth |
| 404 | NOT_FOUND | Resource doesn't exist |
| 429 | QUOTA_EXCEEDED | API rate limit hit |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | External service down |

### Rate Limits

| Tier | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Free Gemini | 15 | 1,500 |
| Paid Gemini | 60 | Unlimited |

---

## Webhooks (Future)

Coming soon: Real-time notifications for:
- Session completed
- Score milestones achieved
- Weekly progress reports

---

## SDK Examples

### Python

```python
import requests

# Submit answer
files = {'audio_file': open('answer.wav', 'rb')}
data = {
    'question': 'Tell me about yourself',
    'ideal_answer': 'Expected answer...',
    'domain': 'general',
    'session_id': 'uuid',
    'question_id': 'uuid',
    'user_id': 'uuid'
}

response = requests.post(
    'http://localhost:8000/api/v1/submit_answer',
    files=files,
    data=data
)

result = response.json()
print(f"Score: {result['scores']['final']}")
```

### JavaScript/TypeScript

```typescript
// Using the included API client
import { submitAnswer, createSession } from './api/apiClient';

// Create session
const { session_id } = await createSession({
  user_id: 'uuid',
  domain: 'software_engineering',
  num_questions: 10
});

// Submit answer
const result = await submitAnswer(
  audioBlob,
  'Tell me about yourself',
  'Expected answer...',
  session_id,
  question_id,
  user_id
);

console.log(`Score: ${result.scores.final}`);
```

---

## Changelog

### v1.0.0 (Current)
- Initial release
- 6-score ML analysis
- Gemini AI coaching
- Session management
- Resume analysis
