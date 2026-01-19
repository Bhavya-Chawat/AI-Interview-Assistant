"""
Supabase Database Service - Complete Session & Attempt Management

This module provides all database operations using Supabase's REST API.
Only requires SUPABASE_URL and SUPABASE_KEY (anon key).

Features:
- Session CRUD (create, get, update, complete)
- Attempt CRUD with session linking
- User profile management
- Dashboard statistics
- Custom question pool management

Author: AI Interview Assistant Team
"""

import logging
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid

from app.models.supabase_client import get_supabase

logger = logging.getLogger(__name__)


# ===========================================
# Session CRUD Operations
# ===========================================

async def create_session(
    user_id: str,
    domain: str,
    total_questions: int,
    question_ids: list[int] | None = None,
    job_title: str | None = None,
    job_description: str | None = None,
    difficulty: str = "medium",
    jd_keywords: list[str] | None = None,
    session_name: str | None = None,
) -> dict:
    """Create a new interview session."""
    try:
        supabase = get_supabase()
    except Exception as e:
        logger.error(f"Failed to get Supabase client: {e}")
        return {"id": None, "error": str(e)}
    
    session_id = str(uuid.uuid4())
    
    data = {
        "id": session_id,
        "user_id": user_id,
        "domain": domain,
        "total_questions": total_questions,
        "completed_questions": 0,
        "status": "in_progress",
        "session_name": session_name,
    }
    
    if job_description:
        data["job_description"] = job_description
    if job_title:
        data["job_title"] = job_title
    if jd_keywords:
        data["jd_keywords"] = jd_keywords
    if question_ids:
        data["question_ids"] = question_ids
    
    try:
        result = supabase.table("interview_sessions").insert(data).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"Created session {session_id} for user {user_id}")
            return result.data[0]
        else:
            logger.warning("Session insert returned no data")
            return {"id": session_id, **data}
            
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        return {"id": None, "error": str(e)}


async def get_session_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    """Get a session by ID."""
    try:
        supabase = get_supabase()
        result = supabase.table("interview_sessions")\
            .select("*")\
            .eq("id", session_id)\
            .single()\
            .execute()
        return result.data
    except Exception as e:
        logger.error(f"Failed to get session {session_id}: {e}")
        return None


async def get_user_sessions(
    user_id: str,
    limit: int = 20,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get all sessions for a user."""
    try:
        supabase = get_supabase()
        query = supabase.table("interview_sessions")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)
        
        if status:
            query = query.eq("status", status)
        
        result = query.execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get sessions for user {user_id}: {e}")
        return []


async def update_session(
    session_id: str,
    updates: Dict[str, Any]
) -> Dict[str, Any]:
    """Update session fields."""
    try:
        supabase = get_supabase()
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = supabase.table("interview_sessions")\
            .update(updates)\
            .eq("id", session_id)\
            .execute()
        
        return result.data[0] if result.data else {}
    except Exception as e:
        logger.error(f"Failed to update session {session_id}: {e}")
        return {"error": str(e)}


async def increment_session_progress(session_id: str) -> None:
    """Update completed question count based on actual attempts."""
    try:
        # Get actual count of attempts to ensure accuracy
        attempts = await get_session_attempts(session_id)
        
        # Count UNIQUE completed question IDs to handle retries correctly
        unique_question_ids = set()
        for attempt in attempts:
            if attempt.get("question_id"):
                unique_question_ids.add(attempt["question_id"])
        
        count = len(unique_question_ids)
        
        session = await get_session_by_id(session_id)
        if session:
            # Ensure we don't exceed total (just as a safeguard)
            total = session.get("total_questions", 10)
            final_count = min(count, total)
            
            await update_session(session_id, {"completed_questions": final_count})
    except Exception as e:
        logger.error(f"Failed to update session progress: {e}")


async def complete_session(session_id: str) -> Dict[str, Any]:
    """
    Mark session as completed and calculate aggregate scores.
    
    Returns:
        Updated session with aggregate scores
    """
    try:
        supabase = get_supabase()
        
        # Get all attempts for this session
        attempts = await get_session_attempts(session_id)
        
        # Filter only scored attempts (not skipped)
        scored_attempts = [a for a in attempts if not a.get("is_skipped", False)]
        
        if not scored_attempts:
            # No scored attempts, just mark as completed
            return await update_session(session_id, {
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat()
            })
        
        # Calculate aggregate scores
        def safe_avg(field):
            values = [a.get(field, 0) or 0 for a in scored_attempts]
            return round(sum(values) / len(values), 2) if values else 0
        
        # Count UNIQUE question IDs to handle retries correctly
        unique_question_ids = set()
        for attempt in attempts:
            if attempt.get("question_id"):
                unique_question_ids.add(attempt["question_id"])
        
        # Get total questions to cap the completed count
        session = await get_session_by_id(session_id)
        total_questions = session.get("total_questions", 10) if session else 10
        completed_count = min(len(unique_question_ids), total_questions)
        
        updates = {
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "completed_questions": completed_count,
            "avg_content_score": safe_avg("content_score"),
            "avg_delivery_score": safe_avg("delivery_score"),
            "avg_communication_score": safe_avg("communication_score"),
            "avg_voice_score": safe_avg("voice_score"),
            "avg_confidence_score": safe_avg("confidence_score"),
            "avg_structure_score": safe_avg("structure_score"),
            "avg_final_score": safe_avg("final_score"),
        }
        
        # Identify strengths and weaknesses
        score_categories = {
            "Content": updates["avg_content_score"],
            "Delivery": updates["avg_delivery_score"],
            "Communication": updates["avg_communication_score"],
            "Voice": updates["avg_voice_score"],
            "Confidence": updates["avg_confidence_score"],
            "Structure": updates["avg_structure_score"],
        }
        
        sorted_cats = sorted(score_categories.items(), key=lambda x: x[1], reverse=True)
        strengths = [cat for cat, score in sorted_cats[:2] if score >= 60]
        improvements = [cat for cat, score in sorted_cats[-2:] if score < 70]
        
        updates["strengths"] = strengths
        updates["improvements"] = improvements
        
        result = await update_session(session_id, updates)
        logger.info(f"Completed session {session_id} with avg score {updates['avg_final_score']}")
        
        # Update user stats (including streak) after session completion
        if session:
            user_id = session.get("user_id")
            if user_id:
                await update_user_stats(user_id)
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to complete session {session_id}: {e}")
        return {"error": str(e)}


# ===========================================
# Attempt CRUD Operations
# ===========================================

async def create_attempt(
    user_id: str,
    session_id: str,
    question_id: int,
    question_order: int,
    transcript: str,
    duration_seconds: float,
    scores: Dict[str, float],
    question_text: str,
    ideal_answer: str = "",
    llm_feedback: Optional[Dict] = None,
    domain: str = "general",
    difficulty: str = "medium",
    is_skipped: bool = False
) -> Dict[str, Any]:
    """
    Create a new attempt record linked to a session.
    
    Args:
        user_id: User's UUID (required)
        session_id: Session UUID (required)
        question_id: Question ID being answered
        question_order: Position in session (1-10)
        transcript: User's answer transcript
        duration_seconds: Answer duration
        scores: Dictionary of scores (content, delivery, etc.)
        question_text: The question text (snapshot)
        ideal_answer: The ideal answer (snapshot)
        llm_feedback: LLM-generated feedback
        domain: Question domain
        difficulty: Question difficulty
        is_skipped: Whether question was skipped
    
    Returns:
        Created attempt record with ID
    """
    try:
        supabase = get_supabase()
    except Exception as e:
        logger.error(f"Failed to get Supabase client: {e}")
        return {"id": 0, "error": str(e)}
    
    # Prepare data
    data = {
        "user_id": user_id,
        "session_id": session_id,
        "question_id": question_id,
        "question_order": question_order,
        "question_text": question_text or "No question text provided",
        "ideal_answer": ideal_answer or "",
        "transcript": transcript if not is_skipped else "SKIPPED",
        "audio_duration": float(duration_seconds) if duration_seconds else 0.0,
        "domain": domain,
        "difficulty": difficulty,
    }
    
    # Add scores
    if not is_skipped:
        data.update({
            "content_score": float(scores.get("content", 0) or 0),
            "delivery_score": float(scores.get("delivery", 0) or 0),
            "communication_score": float(scores.get("communication", 0) or 0),
            "voice_score": float(scores.get("voice", 0) or 0),
            "confidence_score": float(scores.get("confidence", 0) or 0),
            "structure_score": float(scores.get("structure", 0) or 0),
            "final_score": float(scores.get("final", 0) or 0),
        })
    else:
        # Skipped questions have 0 scores
        data.update({
            "content_score": 0,
            "delivery_score": 0,
            "communication_score": 0,
            "voice_score": 0,
            "confidence_score": 0,
            "structure_score": 0,
            "final_score": 0,
        })
    
    # Serialize JSON fields
    try:
        data["ml_scores"] = json.dumps(scores) if isinstance(scores, dict) else "{}"
    except Exception:
        data["ml_scores"] = "{}"
    
    try:
        data["llm_feedback"] = json.dumps(llm_feedback) if isinstance(llm_feedback, dict) else "{}"
    except Exception:
        data["llm_feedback"] = "{}"
    
    try:
        result = supabase.table("attempts").insert(data).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"Attempt saved with ID: {result.data[0].get('id')}, session: {session_id}")
            
            # Increment session progress
            await increment_session_progress(session_id)
            
            return result.data[0]
        else:
            logger.warning("Insert returned no data")
            return {"id": 0, **data}
            
    except Exception as e:
        logger.error(f"Failed to save attempt: {e}")
        return {"id": 0, **data, "error": str(e)}


async def skip_attempt(
    user_id: str,
    session_id: str,
    question_id: int,
    question_order: int,
    question_text: str,
    domain: str = "general",
    difficulty: str = "medium"
) -> Dict[str, Any]:
    """Record a skipped question."""
    return await create_attempt(
        user_id=user_id,
        session_id=session_id,
        question_id=question_id,
        question_order=question_order,
        transcript="SKIPPED",
        duration_seconds=0,
        scores={},
        question_text=question_text,
        ideal_answer="",
        domain=domain,
        difficulty=difficulty,
        is_skipped=True
    )


async def get_session_attempts(session_id: str) -> List[Dict[str, Any]]:
    """Get all attempts for a session, ordered by question order."""
    try:
        supabase = get_supabase()
        result = supabase.table("attempts")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("question_order", desc=False)\
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get session attempts: {e}")
        return []


async def get_user_attempts(
    user_id: str,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get attempts for a user, ordered by newest first."""
    try:
        supabase = get_supabase()
        result = supabase.table("attempts")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get user attempts: {e}")
        return []


async def get_attempt_by_id(attempt_id: int) -> Optional[Dict[str, Any]]:
    """Get a single attempt by ID."""
    try:
        supabase = get_supabase()
        result = supabase.table("attempts")\
            .select("*")\
            .eq("id", attempt_id)\
            .single()\
            .execute()
        return result.data
    except Exception as e:
        logger.error(f"Failed to get attempt {attempt_id}: {e}")
        return None


async def update_attempt_audio_url(attempt_id: int, audio_url: str) -> bool:
    """Update an attempt record with its audio storage URL."""
    try:
        supabase = get_supabase()
        result = supabase.table("attempts")\
            .update({"audio_file_url": audio_url})\
            .eq("id", attempt_id)\
            .execute()
        return len(result.data) > 0
    except Exception as e:
        logger.error(f"Failed to update audio URL for attempt {attempt_id}: {e}")
        return False


async def count_user_attempts(user_id: str) -> int:
    """Count total attempts for a user."""
    try:
        supabase = get_supabase()
        result = supabase.table("attempts")\
            .select("id", count="exact")\
            .eq("user_id", user_id)\
            .execute()
        return result.count or 0
    except Exception as e:
        logger.error(f"Failed to count attempts: {e}")
        return 0


# ===========================================
# User Profile Operations
# ===========================================

async def get_or_create_user(user_id: str, email: str, full_name: Optional[str] = None) -> Dict[str, Any]:
    """Get or create a user profile."""
    try:
        supabase = get_supabase()
        
        # Try to get existing user
        result = supabase.table("users")\
            .select("*")\
            .eq("id", user_id)\
            .execute()
        
        if result.data:
            return result.data[0]
        
        # Create new user
        data = {
            "id": user_id,
            "email": email,
            "full_name": full_name or email.split("@")[0],
        }
        result = supabase.table("users").insert(data).execute()
        return result.data[0] if result.data else data
    except Exception as e:
        logger.error(f"Failed to get/create user: {e}")
        return {"id": user_id, "email": email}


async def update_user_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update user profile."""
    try:
        supabase = get_supabase()
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = supabase.table("users")\
            .update(updates)\
            .eq("id", user_id)\
            .execute()
        return result.data[0] if result.data else {}
    except Exception as e:
        logger.error(f"Failed to update user: {e}")
        return {}


async def update_user_stats(user_id: str) -> None:
    """Update user aggregate statistics based on all attempts."""
    try:
        attempts = await get_user_attempts(user_id, limit=1000)
        
        if not attempts:
            return
        
        final_scores = [a.get("final_score", 0) or 0 for a in attempts]
        
        # Calculate current streak
        streak = await calculate_practice_streak(user_id)
        
        updates = {
            "total_attempts": len(attempts),
            "average_score": round(sum(final_scores) / len(final_scores), 2),
            "best_score": max(final_scores),
            "current_streak": streak,
        }
        
        await update_user_profile(user_id, updates)
        logger.info(f"Updated user stats for {user_id}: streak={streak}")
    except Exception as e:
        logger.error(f"Failed to update user stats: {e}")


# ===========================================
# Dashboard Statistics
# ===========================================

async def get_dashboard_stats(user_id: str) -> Dict[str, Any]:
    """Get dashboard statistics for a user."""
    try:
        supabase = get_supabase()
        
        # Get all attempts for stats
        result = supabase.table("attempts")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        
        attempts = result.data or []
        
        # Filter out skipped attempts for scoring
        scored_attempts = [a for a in attempts if a.get("transcript") != "SKIPPED"]
        total_attempts = len(scored_attempts)
        
        if total_attempts == 0:
            return {
                "total_attempts": 0,
                "total_sessions": 0,
                "average_score": 0,
                "best_score": 0,
                "practice_streak": 0,
                "score_trend": "stable",
                "strengths": [],
                "weaknesses": [],
                "recent_attempts": []
            }
        
        # Calculate scores
        final_scores = [a.get("final_score", 0) or 0 for a in scored_attempts]
        average_score = sum(final_scores) / len(final_scores)
        best_score = max(final_scores)
        
        # Calculate trend (compare recent vs older)
        if len(final_scores) >= 5:
            recent_avg = sum(final_scores[:5]) / 5
            older_count = min(5, len(final_scores) - 5)
            older_avg = sum(final_scores[5:5+older_count]) / older_count if older_count > 0 else recent_avg
            if recent_avg > older_avg + 5:
                trend = "improving"
            elif recent_avg < older_avg - 5:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"
        
        # Calculate practice streak
        streak = await calculate_practice_streak(user_id)
        
        # Identify strengths and weaknesses
        strengths, weaknesses = analyze_score_patterns(scored_attempts[:20])
        
        # Get session count
        sessions = await get_user_sessions(user_id, limit=1000)
        
        return {
            "total_attempts": total_attempts,
            "total_sessions": len(sessions),
            "average_score": round(average_score, 1),
            "best_score": round(best_score, 1),
            "practice_streak": streak,
            "score_trend": trend,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recent_sessions": sessions[:5]
        }
    except Exception as e:
        logger.error(f"Failed to get dashboard stats: {e}")
        return {
            "total_attempts": 0,
            "total_sessions": 0,
            "average_score": 0,
            "best_score": 0,
            "practice_streak": 0,
            "score_trend": "stable",
            "strengths": [],
            "weaknesses": [],
            "recent_attempts": []
        }


async def calculate_practice_streak(user_id: str) -> int:
    """Calculate consecutive days of practice."""
    try:
        supabase = get_supabase()
        
        # Get attempts from last 30 days
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        result = supabase.table("attempts")\
            .select("created_at")\
            .eq("user_id", user_id)\
            .gte("created_at", thirty_days_ago)\
            .order("created_at", desc=True)\
            .execute()
        
        if not result.data:
            return 0
        
        # Get unique dates
        dates = set()
        for attempt in result.data:
            created = attempt.get("created_at", "")
            if created:
                date = created[:10]  # Get YYYY-MM-DD
                dates.add(date)
        
        # Count consecutive days from today
        streak = 0
        current = datetime.utcnow().date()
        
        for i in range(30):
            check_date = (current - timedelta(days=i)).isoformat()
            if check_date in dates:
                streak += 1
            elif i > 0:  # Allow today to be missed
                break
        
        return streak
    except Exception as e:
        logger.error(f"Failed to calculate streak: {e}")
        return 0


def analyze_score_patterns(attempts: List[Dict]) -> tuple:
    """Analyze score patterns to identify strengths and weaknesses."""
    if not attempts:
        return [], []
    
    score_categories = ["content", "delivery", "communication", "voice", "confidence", "structure"]
    category_labels = {
        "content": "Answer Relevance",
        "delivery": "Speaking Fluency",
        "communication": "Clear Communication",
        "voice": "Voice Quality",
        "confidence": "Confidence",
        "structure": "Answer Structure"
    }
    
    # Calculate averages for each category
    averages = {}
    for cat in score_categories:
        scores = [a.get(f"{cat}_score", 0) or 0 for a in attempts]
        if scores:
            averages[cat] = sum(scores) / len(scores)
        else:
            averages[cat] = 0
    
    # Sort by score
    sorted_cats = sorted(averages.items(), key=lambda x: x[1], reverse=True)
    
    # Top 2 are strengths (if above 60)
    strengths = [category_labels[cat] for cat, score in sorted_cats[:2] if score >= 60]
    
    # Bottom 2 are weaknesses (if below 70)
    weaknesses = [category_labels[cat] for cat, score in sorted_cats[-2:] if score < 70]
    
    return strengths, weaknesses


# ===========================================
# Report Operations
# ===========================================

async def save_report(
    user_id: str,
    session_id: str,
    report_data: Dict[str, Any],
    report_type: str = "session"
) -> Dict[str, Any]:
    """Save a generated report to database."""
    try:
        supabase = get_supabase()
        
        data = {
            "user_id": user_id,
            "session_id": session_id,
            "report_type": report_type,
            "report_title": report_data.get("title", "Interview Report"),
            "report_data": json.dumps(report_data),
            "status": "generated"
        }
        
        result = supabase.table("interview_reports").insert(data).execute()
        
        if result.data:
            logger.info(f"Report saved for session {session_id}")
            return result.data[0]
        return {"error": "Failed to save report"}
    except Exception as e:
        logger.error(f"Failed to save report: {e}")
        return {"error": str(e)}


async def get_session_report(session_id: str) -> Optional[Dict[str, Any]]:
    """Get report for a session."""
    try:
        supabase = get_supabase()
        result = supabase.table("interview_reports")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if result.data:
            report = result.data[0]
            # Parse report_data back to dict
            if isinstance(report.get("report_data"), str):
                report["report_data"] = json.loads(report["report_data"])
            return report
        return None
    except Exception as e:
        logger.error(f"Failed to get session report: {e}")
        return None


async def get_user_reports(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get all reports for a user."""
    try:
        supabase = get_supabase()
        result = supabase.table("interview_reports")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get user reports: {e}")
        return []


# ===========================================
# Questions Operations
# ===========================================

async def get_questions(
    domain: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get questions from Supabase."""
    try:
        supabase = get_supabase()
        query = supabase.table("questions").select("*").eq("is_active", True)
        
        if domain and domain != "general":
            query = query.eq("domain", domain)
        if category:
            query = query.eq("category", category)
        if difficulty:
            query = query.eq("difficulty", difficulty)
        
        query = query.limit(limit)
        result = query.execute()
        
        return result.data or []
    except Exception as e:
        logger.warning(f"Supabase questions not available: {e}")
        return await _get_fallback_questions(domain, category, limit)


async def get_question_by_id(question_id: int) -> Optional[Dict[str, Any]]:
    """Get a question by ID."""
    try:
        supabase = get_supabase()
        result = supabase.table("questions")\
            .select("*")\
            .eq("id", question_id)\
            .single()\
            .execute()
        if result.data:
            return result.data
    except Exception:
        pass
    
    # Fallback to local JSON
    return await _get_question_from_local(question_id)


async def add_question_to_pool(
    question: str,
    ideal_answer: str,
    keywords: List[str],
    category: str = "behavioral",
    domain: str = "general",
    difficulty: str = "medium",
    uploaded_by: Optional[str] = None
) -> Dict[str, Any]:
    """Add a custom question to the pool."""
    try:
        supabase = get_supabase()
        
        data = {
            "question": question,
            "ideal_answer": ideal_answer,
            "keywords": keywords,
            "category": category,
            "domain": domain,
            "difficulty": difficulty,
            "is_custom": True,
            "is_active": True,
        }
        
        if uploaded_by:
            data["uploaded_by"] = uploaded_by
        
        result = supabase.table("questions").insert(data).execute()
        
        if result.data:
            logger.info(f"Added custom question: {question[:50]}...")
            return result.data[0]
        return {"error": "Failed to add question"}
    except Exception as e:
        logger.error(f"Failed to add question: {e}")
        return {"error": str(e)}


async def add_questions_bulk(
    questions: List[Dict[str, Any]],
    uploaded_by: Optional[str] = None
) -> Dict[str, Any]:
    """Add multiple questions to the pool."""
    try:
        supabase = get_supabase()
        
        data_list = []
        for q in questions:
            data = {
                "question": q.get("question", ""),
                "ideal_answer": q.get("ideal_answer", ""),
                "keywords": q.get("keywords", []),
                "category": q.get("category", "behavioral"),
                "domain": q.get("domain", "general"),
                "difficulty": q.get("difficulty", "medium"),
                "is_custom": True,
                "is_active": True,
            }
            if uploaded_by:
                data["uploaded_by"] = uploaded_by
            data_list.append(data)
        
        result = supabase.table("questions").insert(data_list).execute()
        
        return {
            "success": True,
            "added_count": len(result.data) if result.data else 0
        }
    except Exception as e:
        logger.error(f"Failed to add questions bulk: {e}")
        return {"error": str(e)}


# ===========================================
# Fallback/Helper Functions
# ===========================================

async def _get_fallback_questions(
    domain: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Fallback to local JSON for questions."""
    try:
        import os
        json_path = os.path.join(os.path.dirname(__file__), "..", "data", "questions.json")
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            questions = data if isinstance(data, list) else data.get("questions", [])
            
            if domain and domain != "general":
                questions = [q for q in questions if q.get("domain", "").lower() == domain.lower()]
            if category:
                questions = [q for q in questions if q.get("category", "") == category]
            
            return questions[:limit]
    except Exception as e:
        logger.error(f"Failed to load fallback questions: {e}")
        return []


async def _get_question_from_local(question_id: int) -> Optional[Dict[str, Any]]:
    """Get a question from local JSON by ID."""
    try:
        import os
        json_path = os.path.join(os.path.dirname(__file__), "..", "data", "questions.json")
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            questions = data if isinstance(data, list) else data.get("questions", [])
            for q in questions:
                if q.get("id") == question_id:
                    return q
    except Exception:
        pass
    return None


async def get_session_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    """Get a single session by ID."""
    try:
        supabase = get_supabase()
        result = supabase.table("interview_sessions")\
            .select("*")\
            .eq("id", session_id)\
            .single()\
            .execute()
        return result.data
    except Exception as e:
        logger.error(f"Failed to get session {session_id}: {e}")
        return None


async def get_session_detail(session_id: str) -> Optional[Dict[str, Any]]:
    """Get full details of a session including questions and attempts."""
    session = await get_session_by_id(session_id)
    if not session:
        return None
    
    attempts = await get_session_attempts(session_id)
    
    # Calculate completed count
    completed_count = len(attempts)
    skipped_count = len([a for a in attempts if a.get("is_skipped")])
    
    return {
        "session": session,
        "attempts": attempts,
        "completed_count": completed_count,
        "skipped_count": skipped_count
    }


# ===========================================
# Resume Analysis CRUD
# ===========================================

async def save_resume_analysis(
    user_id: Optional[str],
    file_name: str,
    file_url: str,
    file_size_bytes: int,
    resume_text: str,
    job_description: str,
    domain: str,
    skill_match_pct: float,
    similarity_score: float,
    matched_skills: list,
    missing_skills: list,
    feedback: dict
) -> Optional[Dict[str, Any]]:
    """
    Save resume analysis results to database.
    
    Args:
        user_id: User's UUID (optional for anonymous)
        file_name: Original filename
        file_url: Storage URL
        file_size_bytes: File size
        resume_text: Extracted text
        job_description: JD used for analysis
        domain: Interview domain
        skill_match_pct: Match percentage
        similarity_score: Semantic similarity
        matched_skills: List of matched skills
        missing_skills: List of missing skills
        feedback: LLM feedback dict
    
    Returns:
        Created record or None on failure
    """
    try:
        supabase = get_supabase()
    except Exception as e:
        logger.error(f"Failed to get Supabase client for resume analysis: {e}")
        return None
    
    analysis_id = str(uuid.uuid4())
    
    data = {
        "id": analysis_id,
        "file_name": file_name,
        "file_url": file_url,
        "file_size_bytes": file_size_bytes,
        "resume_text": resume_text[:10000] if resume_text else None,  # Truncate for DB
        "job_description": job_description[:5000] if job_description else None,
        "detected_domain": domain,
        "skill_match_pct": skill_match_pct,
        "similarity_score": similarity_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "feedback": feedback,
        "strengths": feedback.get("strengths", []),
        "improvements": feedback.get("gaps", []),
        "status": "completed"
    }
    
    # Only add user_id if provided (for RLS)
    if user_id:
        data["user_id"] = user_id
    
    try:
        result = supabase.table("resume_analyses").insert(data).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"Saved resume analysis {analysis_id}")
            return result.data[0]
        else:
            logger.warning("Resume analysis insert returned no data")
            return {"id": analysis_id, **data}
            
    except Exception as e:
        logger.error(f"Failed to save resume analysis: {e}")
        return None

