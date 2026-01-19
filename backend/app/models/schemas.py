"""
AI Interview Feedback MVP - Pydantic Schemas

This module contains Pydantic models for request/response validation
and API documentation.

Author: Member 1 (Backend API)
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# ===========================================
# Health Check Schemas
# ===========================================

class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str = Field(..., description="Health status", example="healthy")
    timestamp: str = Field(..., description="Current timestamp", example="2024-01-15T10:30:00")
    version: str = Field(..., description="API version", example="1.0.0")


# ===========================================
# Question Schemas
# ===========================================

class Question(BaseModel):
    """Model representing an interview question."""
    id: int = Field(..., description="Unique question ID", example=1)
    question: str = Field(..., description="The interview question text", example="Tell me about yourself.")
    ideal_answer: str = Field(..., description="An ideal answer for reference")
    category: str = Field(default="General", description="Question category", example="Behavioral")


class QuestionsResponse(BaseModel):
    """Response model for questions list endpoint."""
    questions: List[Question] = Field(..., description="List of available questions")
    total: int = Field(..., description="Total number of questions", example=10)


# ===========================================
# ML Scores Schemas (6-SCORE SYSTEM)
# ===========================================

class MLScores(BaseModel):
    """Model representing ML-calculated scores for an answer (0-100 scale) - 6 Score System."""
    content: float = Field(..., ge=0, le=100, description="Content relevance score (0-100)", example=75.5)
    delivery: float = Field(..., ge=0, le=100, description="Delivery score (WPM, fillers) (0-100)", example=82.0)
    communication: float = Field(..., ge=0, le=100, description="Communication score (grammar) (0-100)", example=88.0)
    voice: float = Field(default=70.0, ge=0, le=100, description="Voice quality score (pitch, energy, pauses) (0-100)", example=75.0)
    confidence: float = Field(default=70.0, ge=0, le=100, description="Confidence score (composure, assertiveness) (0-100)", example=78.0)
    structure: float = Field(default=70.0, ge=0, le=100, description="Structure score (STAR method, organization) (0-100)", example=72.0)
    final: float = Field(..., ge=0, le=100, description="Final weighted score (0-100)", example=79.3)
    wpm: float = Field(..., ge=0, description="Words per minute", example=142)
    filler_count: int = Field(..., ge=0, description="Number of filler words detected", example=3)
    grammar_errors: int = Field(..., ge=0, description="Number of grammar errors detected", example=2)
    relevance: float = Field(..., ge=0, le=1, description="Semantic similarity to ideal answer", example=0.78)


class VoiceAnalysis(BaseModel):
    """Model for detailed voice analysis results."""
    pitch_variation: float = Field(default=70.0, ge=0, le=100, description="Pitch expressiveness score")
    energy_projection: float = Field(default=70.0, ge=0, le=100, description="Voice projection score")
    pause_appropriateness: float = Field(default=70.0, ge=0, le=100, description="Natural pause usage score")
    energy_consistency: float = Field(default=70.0, ge=0, le=100, description="Energy stability score")
    rhythm_stability: float = Field(default=70.0, ge=0, le=100, description="Pacing consistency score")
    feedback: List[str] = Field(default=[], description="Voice improvement feedback")


class StructureAnalysis(BaseModel):
    """Model for answer structure analysis (STAR method)."""
    star_components: List[str] = Field(default=[], description="STAR components found (situation, task, action, result)")
    star_score: float = Field(default=0.0, ge=0, le=100, description="STAR method usage score")
    organization_score: float = Field(default=0.0, ge=0, le=100, description="Logical organization score")
    conclusion_score: float = Field(default=0.0, ge=0, le=100, description="Clear conclusion score")
    feedback: List[str] = Field(default=[], description="Structure improvement feedback")


class ConfidenceAnalysis(BaseModel):
    """Model for confidence analysis from voice and video."""
    voice_confidence: float = Field(default=70.0, ge=0, le=100, description="Confidence from voice")
    eye_contact: float = Field(default=70.0, ge=0, le=100, description="Eye contact score from video")
    body_stability: float = Field(default=70.0, ge=0, le=100, description="Body stability score from video")
    emotion_positivity: float = Field(default=70.0, ge=0, le=100, description="Positive emotion score")
    feedback: List[str] = Field(default=[], description="Confidence improvement feedback")


# ===========================================
# Resume Analysis Schemas
# ===========================================

class LLMFeedback(BaseModel):
    """Model for LLM-generated feedback."""
    summary: str = Field(..., description="Summary of the analysis")
    tips: List[str] = Field(..., description="List of improvement tips")
    example_answer: Optional[str] = Field(None, description="Example improved answer")


class ResumeAnalysisResponse(BaseModel):
    """Response model for resume analysis endpoint."""
    skill_match_pct: float = Field(..., ge=0, le=100, description="Percentage of skills matched", example=72.5)
    missing_skills: List[str] = Field(..., description="Skills in JD but not in resume", example=["REST API", "SQL"])
    matched_skills: List[str] = Field(..., description="Skills matched between resume and JD", example=["Python", "Machine Learning"])
    resume_score: float = Field(..., ge=0, le=100, description="Overall resume relevance score", example=68.0)
    similarity_score: float = Field(..., ge=0, le=1, description="Semantic similarity between resume and JD", example=0.65)
    feedback: Dict[str, Any] = Field(..., description="LLM-generated feedback")


# ===========================================
# Audio Feedback Schemas
# ===========================================

class AudioFeedbackResponse(BaseModel):
    """Response model for audio answer feedback endpoint."""
    attempt_id: int = Field(..., description="ID of the saved attempt", example=1)
    question_id: int = Field(..., description="ID of the question answered", example=1)
    question_text: str = Field(..., description="The question that was answered")
    transcript: str = Field(..., description="Transcribed text from audio")
    duration_seconds: float = Field(..., ge=0, description="Duration of the recording", example=45.5)
    scores: MLScores = Field(..., description="ML-calculated scores (0-10 scale)")
    feedback: Dict[str, Any] = Field(..., description="LLM-generated feedback with tips")
    keywords_found: List[str] = Field(default=[], description="Keywords from ideal answer found in transcript")
    keywords_missing: List[str] = Field(default=[], description="Keywords from ideal answer missing from transcript")


# ===========================================
# Request Schemas
# ===========================================

class ResumeUploadRequest(BaseModel):
    """Request model for resume upload (form data alternative)."""
    job_description: str = Field(..., min_length=50, description="Job description text")


class AudioUploadRequest(BaseModel):
    """Request model for audio upload (form data alternative)."""
    question_id: int = Field(..., gt=0, description="ID of the question being answered")


# ===========================================
# Error Schemas
# ===========================================

class ErrorResponse(BaseModel):
    """Standard error response model."""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code for programmatic handling")

# ===========================================
# Authentication Schemas (NEW)
# ===========================================

class UserCreate(BaseModel):
    """Request model for user registration."""
    email: str = Field(..., description="User email address", example="user@example.com")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    full_name: Optional[str] = Field(None, description="User's full name", example="John Doe")


class UserLogin(BaseModel):
    """Request model for user login."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    """Response model for user data."""
    id: str = Field(..., description="User ID (UUID)")
    email: str = Field(..., description="User email")
    full_name: Optional[str] = Field(None, description="User's full name")
    created_at: Optional[datetime] = Field(None, description="Account creation timestamp")


class TokenResponse(BaseModel):
    """Response model for authentication tokens."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user: UserResponse = Field(..., description="Authenticated user data")


class TokenRefreshRequest(BaseModel):
    """Request model for token refresh."""
    refresh_token: str = Field(..., description="Refresh token for getting new access token")


# ===========================================
# Dashboard Schemas (NEW)
# ===========================================

class SessionSummary(BaseModel):
    """Summary of an interview session."""
    id: str = Field(..., description="Session UUID")
    domain: str = Field(..., description="Interview domain")
    job_title: Optional[str] = Field(None, description="Job title")
    session_name: Optional[str] = Field(None, description="Custom session name")
    status: str = Field(..., description="Session status (in_progress, completed)")
    total_questions: int = Field(..., description="Total questions in session")
    completed_questions: int = Field(..., description="Questions answered so far")
    avg_score: Optional[float] = Field(None, description="Average score across attempts")
    created_at: datetime = Field(..., description="Session creation time")


class DashboardStats(BaseModel):
    """User dashboard statistics."""
    total_attempts: int = Field(..., ge=0, description="Total number of attempts")
    total_sessions: int = Field(default=0, ge=0, description="Total number of sessions")
    average_score: float = Field(..., ge=0, le=100, description="Average final score")
    best_score: float = Field(..., ge=0, le=100, description="Best final score achieved")
    score_trend: str = Field(..., description="Score trend: improving, declining, stable")
    practice_streak: int = Field(..., ge=0, description="Consecutive days of practice")
    strengths: List[str] = Field(default=[], description="User's strongest areas")
    weaknesses: List[str] = Field(default=[], description="Areas needing improvement")


class DashboardResponse(BaseModel):
    """Full dashboard response with stats and history."""
    user: UserResponse = Field(..., description="User info")
    stats: DashboardStats = Field(..., description="Performance statistics")
    recent_sessions: List[SessionSummary] = Field(default=[], description="Recent practice sessions")
    score_history: List[Dict[str, Any]] = Field(default=[], description="Score over time for charts")


class ProgressChartData(BaseModel):
    """Data point for progress chart."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    content: float = Field(..., ge=0, le=100)
    delivery: float = Field(..., ge=0, le=100)
    communication: float = Field(..., ge=0, le=100)
    voice: float = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=100)
    structure: float = Field(..., ge=0, le=100)
    final: float = Field(..., ge=0, le=100)