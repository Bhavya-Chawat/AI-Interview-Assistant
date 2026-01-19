"""
AI Interview Feedback MVP - Dashboard API Endpoints

This module provides personalized dashboard endpoints for authenticated users:
- Performance statistics
- Score history and trends
- Practice streaks
- Strengths and weaknesses analysis

Uses Supabase REST API (no database connection string needed!)

Author: AI Interview Assistant Team
"""

import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.schemas import (
    DashboardResponse, DashboardStats, SessionSummary,
    ProgressChartData, UserResponse
)
from app.services.auth_service import require_auth
from app.services.supabase_db import get_dashboard_stats, get_user_attempts

# Create router for dashboard endpoints
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ===========================================
# Helper Functions
# ===========================================

def load_question_text(question_id: int) -> str:
    """Load question text from questions.json."""
    import os
    questions_path = os.path.join(
        os.path.dirname(__file__),
        "..", "data", "questions.json"
    )
    try:
        with open(questions_path, "r") as f:
            questions = json.load(f)
            for q in questions:
                if q["id"] == question_id:
                    return q["question"]
    except Exception:
        pass
    return f"Question #{question_id}"


def calculate_trend(scores: List[float]) -> str:
    """
    Calculate score trend from recent attempts.
    
    Args:
        scores: List of final scores, oldest to newest
    
    Returns:
        str: 'improving', 'declining', or 'stable'
    """
    if len(scores) < 3:
        return "stable"
    
    # Compare first half average to second half average
    mid = len(scores) // 2
    first_half_avg = sum(scores[:mid]) / mid
    second_half_avg = sum(scores[mid:]) / (len(scores) - mid)
    
    diff = second_half_avg - first_half_avg
    
    if diff > 5:
        return "improving"
    elif diff < -5:
        return "declining"
    return "stable"


def identify_strengths_weaknesses(attempts: List[Dict]) -> tuple:
    """
    Identify user's strongest and weakest areas based on attempts.
    
    Args:
        attempts: List of attempt dicts from Supabase
    
    Returns:
        Tuple of (strengths list, weaknesses list)
    """
    if not attempts:
        return [], []
    
    # Aggregate scores by category
    categories = {
        "content": [],
        "delivery": [],
        "communication": [],
        "voice": [],
        "confidence": [],
        "structure": []
    }
    
    for attempt in attempts:
        categories["content"].append(attempt.get("content_score") or 0)
        categories["delivery"].append(attempt.get("delivery_score") or 0)
        categories["communication"].append(attempt.get("communication_score") or 0)
        categories["voice"].append(attempt.get("voice_score") or 70)
        categories["confidence"].append(attempt.get("confidence_score") or 70)
        categories["structure"].append(attempt.get("structure_score") or 70)
    
    # Calculate averages
    averages = {
        cat: sum(scores) / len(scores) if scores else 0
        for cat, scores in categories.items()
    }
    
    # Sort by average score
    sorted_cats = sorted(averages.items(), key=lambda x: x[1], reverse=True)
    
    # Top 2 are strengths, bottom 2 are weaknesses
    strengths = [cat.replace("_", " ").title() for cat, avg in sorted_cats[:2] if avg >= 70]
    weaknesses = [cat.replace("_", " ").title() for cat, avg in sorted_cats[-2:] if avg < 70]
    
    return strengths, weaknesses


# ===========================================
# Dashboard Overview (Uses Supabase REST API)
# ===========================================

@router.get("/overview", response_model=DashboardResponse)
async def get_dashboard_overview(
    user: dict = Depends(require_auth)
):
    """
    Get comprehensive dashboard overview for authenticated user.
    
    Uses Supabase REST API - no database connection string needed!
    
    Includes:
    - Performance statistics (total attempts, averages, best score)
    - Score trend (improving, declining, stable)
    - Practice streak (consecutive days)
    - Strengths and weaknesses
    - Recent attempts with scores
    - Score history for charts
    
    Returns:
        DashboardResponse: Complete dashboard data
    
    Raises:
        HTTPException 401: If not authenticated
    """
    user_id = user["id"]
    
    # Get stats from Supabase REST API
    stats = await get_dashboard_stats(user_id)
    
    # Get recent attempts
    attempts = stats.get("recent_attempts", [])
    
    # Calculate statistics
    total_attempts = stats.get("total_attempts", 0)
    average_score = stats.get("average_score", 0)
    best_score = stats.get("best_score", 0)
    trend = stats.get("score_trend", "stable")
    streak = stats.get("practice_streak", 0)
    strengths = stats.get("strengths", [])
    weaknesses = stats.get("weaknesses", [])
    
    # Format recent sessions
    recent_sessions = []
    for s in stats.get("recent_sessions", []):
        try:
            created_at = s.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            
            recent_sessions.append(SessionSummary(
                id=s.get("id"),
                domain=s.get("domain", "general"),
                job_title=s.get("job_title"),
                session_name=s.get("session_name"),
                status=s.get("status", "completed"),
                total_questions=s.get("total_questions", 0),
                completed_questions=s.get("completed_questions", 0),
                avg_score=s.get("avg_final_score"),
                created_at=created_at or datetime.utcnow()
            ))
        except Exception as e:
            # Skip malformed sessions
            continue
    
    # Generate score history for charts (daily averages)
    # We need to fetch attempts separately for charts as they are not in stats anymore
    attempts = await get_user_attempts(user_id, limit=50)
    score_history = generate_score_history(attempts)
    
    return DashboardResponse(
        user=UserResponse(
            id=user_id,
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=None
        ),
        stats=DashboardStats(
            total_attempts=total_attempts,
            total_sessions=stats.get("total_sessions", 0),
            average_score=round(average_score, 1),
            best_score=round(best_score, 1),
            score_trend=trend,
            practice_streak=streak,
            strengths=strengths,
            weaknesses=weaknesses
        ),
        recent_sessions=recent_sessions,
        score_history=score_history
    )


def generate_score_history(attempts: List[Dict], days: int = 30) -> List[Dict[str, Any]]:
    """
    Generate daily score averages for chart data.
    
    Args:
        attempts: List of attempt dicts from Supabase
        days: Number of days to include
    
    Returns:
        List of daily score data points
    """
    if not attempts:
        return []
    
    # Group attempts by date
    daily_scores = defaultdict(lambda: {
        "content": [], "delivery": [], "communication": [],
        "voice": [], "confidence": [], "structure": [], "final": []
    })
    
    today = datetime.utcnow().date()
    cutoff = today - timedelta(days=days)
    
    for attempt in attempts:
        created_at = attempt.get("created_at", "")
        if created_at:
            try:
                attempt_date = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date()
                if attempt_date >= cutoff:
                    date_str = attempt_date.strftime("%Y-%m-%d")
                    daily_scores[date_str]["content"].append(attempt.get("content_score") or 0)
                    daily_scores[date_str]["delivery"].append(attempt.get("delivery_score") or 0)
                    daily_scores[date_str]["communication"].append(attempt.get("communication_score") or 0)
                    daily_scores[date_str]["voice"].append(attempt.get("voice_score") or 70)
                    daily_scores[date_str]["confidence"].append(attempt.get("confidence_score") or 70)
                    daily_scores[date_str]["structure"].append(attempt.get("structure_score") or 70)
                    daily_scores[date_str]["final"].append(attempt.get("final_score") or 0)
            except (ValueError, AttributeError):
                pass
    
    # Calculate daily averages
    history = []
    for date_str in sorted(daily_scores.keys()):
        scores = daily_scores[date_str]
        history.append({
            "date": date_str,
            "content": round(sum(scores["content"]) / len(scores["content"]), 1) if scores["content"] else 0,
            "delivery": round(sum(scores["delivery"]) / len(scores["delivery"]), 1) if scores["delivery"] else 0,
            "communication": round(sum(scores["communication"]) / len(scores["communication"]), 1) if scores["communication"] else 0,
            "voice": round(sum(scores["voice"]) / len(scores["voice"]), 1) if scores["voice"] else 0,
            "confidence": round(sum(scores["confidence"]) / len(scores["confidence"]), 1) if scores["confidence"] else 0,
            "structure": round(sum(scores["structure"]) / len(scores["structure"]), 1) if scores["structure"] else 0,
            "final": round(sum(scores["final"]) / len(scores["final"]), 1) if scores["final"] else 0
        })
    
    return history


# ===========================================
# Detailed Analytics (Uses Supabase REST API)
# ===========================================

@router.get("/analytics")
async def get_detailed_analytics(
    user: dict = Depends(require_auth),
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, all")
):
    """
    Get detailed analytics for the specified time period.
    
    Uses Supabase REST API - no database connection string needed!
    
    Includes:
    - Score breakdown by category
    - Performance over time
    - Question-type performance
    - Improvement recommendations
    
    Args:
        period: Time period filter
    
    Returns:
        dict: Detailed analytics data
    """
    user_id = user["id"]
    
    # Get attempts from Supabase
    all_attempts = await get_user_attempts(user_id, limit=100)
    
    # Parse period
    if period == "7d":
        cutoff = datetime.utcnow() - timedelta(days=7)
    elif period == "30d":
        cutoff = datetime.utcnow() - timedelta(days=30)
    elif period == "90d":
        cutoff = datetime.utcnow() - timedelta(days=90)
    else:
        cutoff = datetime(2000, 1, 1)  # All time
    
    # Filter attempts by period
    attempts = []
    for a in all_attempts:
        created_at = a.get("created_at", "")
        if created_at:
            try:
                attempt_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if attempt_date >= cutoff:
                    attempts.append(a)
            except (ValueError, AttributeError):
                pass
    
    if not attempts:
        return {
            "period": period,
            "total_attempts": 0,
            "score_breakdown": {},
            "recommendations": ["Start practicing to see analytics!"]
        }
    
    # Calculate averages for each score category
    score_breakdown = {
        "content": {"average": 0, "best": 0, "worst": 100, "trend": "stable"},
        "delivery": {"average": 0, "best": 0, "worst": 100, "trend": "stable"},
        "communication": {"average": 0, "best": 0, "worst": 100, "trend": "stable"},
        "voice": {"average": 0, "best": 0, "worst": 100, "trend": "stable"},
        "confidence": {"average": 0, "best": 0, "worst": 100, "trend": "stable"},
        "structure": {"average": 0, "best": 0, "worst": 100, "trend": "stable"}
    }
    
    # Collect scores
    scores = {cat: [] for cat in score_breakdown.keys()}
    for a in attempts:
        scores["content"].append(a.get("content_score") or 0)
        scores["delivery"].append(a.get("delivery_score") or 0)
        scores["communication"].append(a.get("communication_score") or 0)
        scores["voice"].append(a.get("voice_score") or 70)
        scores["confidence"].append(a.get("confidence_score") or 70)
        scores["structure"].append(a.get("structure_score") or 70)
    
    # Calculate stats for each category
    for cat, cat_scores in scores.items():
        if cat_scores:
            score_breakdown[cat]["average"] = round(sum(cat_scores) / len(cat_scores), 1)
            score_breakdown[cat]["best"] = round(max(cat_scores), 1)
            score_breakdown[cat]["worst"] = round(min(cat_scores), 1)
            score_breakdown[cat]["trend"] = calculate_trend(cat_scores)
    
    # Generate recommendations based on weakest areas
    sorted_by_avg = sorted(score_breakdown.items(), key=lambda x: x[1]["average"])
    recommendations = []
    
    for cat, stats in sorted_by_avg[:3]:
        if stats["average"] < 70:
            rec = get_improvement_recommendation(cat, stats)
            recommendations.append(rec)
    
    if not recommendations:
        recommendations.append("Great performance! Keep practicing to maintain your skills.")
    
    return {
        "period": period,
        "total_attempts": len(attempts),
        "score_breakdown": score_breakdown,
        "score_history": generate_score_history(attempts, 
            days=7 if period == "7d" else 30 if period == "30d" else 90),
        "recommendations": recommendations
    }


def get_improvement_recommendation(category: str, stats: dict) -> str:
    """Generate specific recommendation for a category."""
    recommendations = {
        "content": f"Your content scores average {stats['average']}/100. Focus on addressing all key points in the question and using specific examples.",
        "delivery": f"Your delivery scores average {stats['average']}/100. Practice speaking at 130-160 WPM and reduce filler words (um, uh, like).",
        "communication": f"Your communication scores average {stats['average']}/100. Work on grammar, vocabulary diversity, and using transition words.",
        "voice": f"Your voice scores average {stats['average']}/100. Try varying your pitch more and projecting your voice confidently.",
        "confidence": f"Your confidence scores average {stats['average']}/100. Maintain eye contact, reduce fidgeting, and speak with conviction.",
        "structure": f"Your structure scores average {stats['average']}/100. Use the STAR method: Situation, Task, Action, Result."
    }
    return recommendations.get(category, f"Improve your {category} scores.")


# ===========================================
# Attempt History (Uses Supabase REST API)
# ===========================================

@router.get("/attempts")
async def get_attempt_history(
    user: dict = Depends(require_auth),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    question_id: Optional[int] = None
):
    """
    Get paginated list of user's attempts.
    
    Uses Supabase REST API - no database connection string needed!
    
    Args:
        limit: Maximum results per page (1-100)
        offset: Pagination offset
        question_id: Optional filter by question
    
    Returns:
        dict: Paginated attempt list with scores
    """
    user_id = user["id"]
    
    # Get attempts from Supabase
    from app.services.supabase_db import get_user_attempts as fetch_attempts
    attempts = await fetch_attempts(user_id, limit=limit + offset + 10)
    
    # Filter by question if specified
    if question_id:
        attempts = [a for a in attempts if a.get("question_id") == question_id]
    
    total = len(attempts)
    paginated = attempts[offset:offset + limit]
    
    return {
        "attempts": [
            {
                "id": a.get("id"),
                "question_id": a.get("question_id"),
                "question_text": load_question_text(a.get("question_id", 0)),
                "transcript": (a.get("transcript", "")[:200] + "...") if len(a.get("transcript", "")) > 200 else a.get("transcript", ""),
                "scores": {
                    "content": a.get("content_score"),
                    "delivery": a.get("delivery_score"),
                    "communication": a.get("communication_score"),
                    "voice": a.get("voice_score"),
                    "confidence": a.get("confidence_score"),
                    "structure": a.get("structure_score"),
                    "final": a.get("final_score")
                },
                "created_at": a.get("created_at", "")
            }
            for a in paginated
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total
    }


# ===========================================
# Single Attempt Detail (Uses Supabase REST API)
# ===========================================

@router.get("/attempts/{attempt_id}")
async def get_attempt_detail(
    attempt_id: int,
    user: dict = Depends(require_auth)
):
    """
    Get detailed view of a specific attempt.
    
    Uses Supabase REST API - no database connection string needed!
    
    Args:
        attempt_id: ID of the attempt
    
    Returns:
        dict: Complete attempt data with feedback
    
    Raises:
        HTTPException 404: If attempt not found or doesn't belong to user
    """
    user_id = user["id"]
    
    # Get attempt from Supabase
    from app.services.supabase_db import get_attempt_by_id
    attempt = await get_attempt_by_id(attempt_id)
    
    if not attempt or attempt.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Parse ml_scores and feedback
    ml_scores = attempt.get("ml_scores", {})
    if isinstance(ml_scores, str):
        try:
            ml_scores = json.loads(ml_scores)
        except:
            ml_scores = {}
    
    feedback = attempt.get("llm_feedback", {})
    if isinstance(feedback, str):
        try:
            feedback = json.loads(feedback)
        except:
            feedback = {}
    
    return {
        "id": attempt.get("id"),
        "question_id": attempt.get("question_id"),
        "question_text": load_question_text(attempt.get("question_id", 0)),
        "transcript": attempt.get("transcript", ""),
        "duration_seconds": attempt.get("duration_seconds"),
        "scores": {
            "content": attempt.get("content_score"),
            "delivery": attempt.get("delivery_score"),
            "communication": attempt.get("communication_score"),
            "voice": attempt.get("voice_score"),
            "confidence": attempt.get("confidence_score"),
            "structure": attempt.get("structure_score"),
            "final": attempt.get("final_score")
        },
        "ml_scores": ml_scores,
        "feedback": feedback,
        "created_at": attempt.get("created_at", "")
    }
