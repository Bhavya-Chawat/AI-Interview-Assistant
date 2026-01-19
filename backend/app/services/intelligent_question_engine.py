"""
AI Interview Assistant - Intelligent Question Selection Engine

This module implements a sophisticated question selection algorithm that:
- Analyzes user performance history to identify weak areas
- Uses JD as OPTIONAL weight (not mandatory)
- Ensures balanced difficulty progression
- Avoids repetition intelligently
- Tracks skill coverage and improvement areas

Algorithm Overview:
1. Load user's attempt history and calculate skill-wise performance
2. Identify weak areas (content, delivery, communication, etc.)
3. Score questions based on multiple weighted factors:
   - User weakness targeting (40%)
   - Domain relevance (25%)
   - JD keyword match - OPTIONAL (20%)
   - Difficulty progression (15%)
4. Balance across categories while prioritizing improvement areas
5. Ensure variety with intelligent randomization

Author: AI Interview Assistant Team
"""

import random
import math
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from collections import defaultdict
from datetime import datetime, timedelta

from app.logging_config import get_logger

logger = get_logger(__name__)


# ===========================================
# Configuration Constants
# ===========================================

# Selection algorithm weights (must sum to 100)
SELECTION_WEIGHTS = {
    "weakness_targeting": 40,    # Prioritize questions for weak areas
    "domain_relevance": 25,      # Match question domain to target
    "jd_keyword_match": 20,      # OPTIONAL - JD keyword alignment
    "difficulty_balance": 15,    # Progressive difficulty
}

# Skill score thresholds for weakness detection
SKILL_THRESHOLDS = {
    "weak": 50,      # Below 50 = needs improvement
    "moderate": 70,  # 50-70 = room for growth
    "strong": 85,    # 70-85 = good
    "excellent": 100 # 85+ = mastery
}

# Score category mapping to question types
SCORE_TO_QUESTION_CATEGORY = {
    "content": ["technical", "situational"],      # Low content → technical depth
    "delivery": ["behavioral", "general"],         # Low delivery → practice speaking
    "communication": ["behavioral", "general"],    # Low communication → structured responses
    "structure": ["behavioral", "situational"],    # Low structure → STAR practice
    "confidence": ["general", "behavioral"],       # Low confidence → comfort questions
    "voice": ["general", "behavioral"],            # Low voice → speaking practice
}

# Default difficulty progression for interview flow
DIFFICULTY_PROGRESSION = {
    "start": "easy",    # First 20% of questions
    "middle": "medium", # Middle 60%
    "end": "hard",      # Final 20%
}

# Maximum questions to consider from history
MAX_HISTORY_QUESTIONS = 100


# ===========================================
# Data Classes
# ===========================================

@dataclass
class UserPerformanceProfile:
    """User's aggregated performance across all attempts."""
    user_id: str
    total_attempts: int
    
    # Average scores by category (0-100)
    avg_content: float = 0.0
    avg_delivery: float = 0.0
    avg_communication: float = 0.0
    avg_voice: float = 0.0
    avg_confidence: float = 0.0
    avg_structure: float = 0.0
    avg_final: float = 0.0
    
    # Trend indicators (-100 to +100, negative = declining)
    content_trend: float = 0.0
    delivery_trend: float = 0.0
    communication_trend: float = 0.0
    
    # Weak areas identified
    weak_areas: List[str] = field(default_factory=list)
    strong_areas: List[str] = field(default_factory=list)
    
    # Questions already attempted
    attempted_question_ids: List[int] = field(default_factory=list)
    
    # Last practice session
    last_practice_date: Optional[datetime] = None
    practice_streak: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class QuestionScore:
    """Scored question with selection rationale."""
    question_id: int
    question_text: str
    category: str
    domain: str
    difficulty: str
    keywords: List[str]
    ideal_answer: str
    time_limit_seconds: int
    
    # Selection scores (0-100)
    weakness_score: float = 0.0      # How well it targets user's weak areas
    domain_score: float = 0.0        # Domain relevance
    jd_score: float = 0.0            # JD keyword match
    difficulty_score: float = 0.0     # Difficulty appropriateness
    
    # Final weighted score
    total_score: float = 0.0
    
    # Selection rationale
    selection_reasons: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.question_id,
            "question": self.question_text,
            "category": self.category,
            "domain": self.domain,
            "difficulty": self.difficulty,
            "keywords": self.keywords,
            "ideal_answer": self.ideal_answer,
            "time_limit_seconds": self.time_limit_seconds,
            "selection_score": round(self.total_score, 2),
            "selection_reasons": self.selection_reasons
        }


@dataclass
class SelectionResult:
    """Result of question selection with full context."""
    questions: List[QuestionScore]
    total_time_seconds: int
    
    # Distribution stats
    category_distribution: Dict[str, int]
    difficulty_distribution: Dict[str, int]
    
    # Selection metadata
    user_weak_areas_targeted: List[str]
    jd_keywords_used: List[str]
    domain_focus: str
    
    # Algorithm transparency
    selection_algorithm_version: str = "2.0"
    selection_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


# ===========================================
# Performance Analysis Functions
# ===========================================

async def analyze_user_performance(
    user_id: str,
    attempts: List[Dict[str, Any]]
) -> UserPerformanceProfile:
    """
    Analyze user's historical performance to build a profile.
    
    Calculates:
    - Average scores across all categories
    - Trend analysis (improving/declining)
    - Weak/strong area identification
    - Question history for repetition avoidance
    
    Args:
        user_id: User's unique identifier
        attempts: List of attempt records from database
    
    Returns:
        UserPerformanceProfile with complete analysis
    """
    logger.debug(f"Analyzing performance for user {user_id} with {len(attempts)} attempts")
    
    profile = UserPerformanceProfile(
        user_id=user_id,
        total_attempts=len(attempts)
    )
    
    if not attempts:
        logger.info(f"No history for user {user_id} - returning default profile")
        return profile
    
    # Calculate average scores
    score_fields = [
        ("content_score", "avg_content"),
        ("delivery_score", "avg_delivery"),
        ("communication_score", "avg_communication"),
        ("voice_score", "avg_voice"),
        ("confidence_score", "avg_confidence"),
        ("structure_score", "avg_structure"),
        ("final_score", "avg_final"),
    ]
    
    for db_field, profile_field in score_fields:
        values = [a.get(db_field, 0) or 0 for a in attempts]
        if values:
            setattr(profile, profile_field, sum(values) / len(values))
    
    # Calculate trends (compare first half to second half of attempts)
    if len(attempts) >= 4:
        mid = len(attempts) // 2
        recent = attempts[:mid]  # Assuming ordered by newest first
        older = attempts[mid:]
        
        for db_field, trend_field in [
            ("content_score", "content_trend"),
            ("delivery_score", "delivery_trend"),
            ("communication_score", "communication_trend"),
        ]:
            recent_avg = sum(a.get(db_field, 0) or 0 for a in recent) / len(recent)
            older_avg = sum(a.get(db_field, 0) or 0 for a in older) / len(older)
            trend = recent_avg - older_avg
            setattr(profile, trend_field, round(trend, 2))
    
    # Identify weak and strong areas
    score_map = {
        "content": profile.avg_content,
        "delivery": profile.avg_delivery,
        "communication": profile.avg_communication,
        "voice": profile.avg_voice,
        "confidence": profile.avg_confidence,
        "structure": profile.avg_structure,
    }
    
    profile.weak_areas = [
        area for area, score in score_map.items()
        if score < SKILL_THRESHOLDS["moderate"]
    ]
    
    profile.strong_areas = [
        area for area, score in score_map.items()
        if score >= SKILL_THRESHOLDS["strong"]
    ]
    
    # Get attempted question IDs
    profile.attempted_question_ids = [
        a.get("question_id") for a in attempts
        if a.get("question_id")
    ][:MAX_HISTORY_QUESTIONS]
    
    # Get last practice info
    if attempts:
        latest = attempts[0]
        if latest.get("created_at"):
            try:
                profile.last_practice_date = datetime.fromisoformat(
                    str(latest["created_at"]).replace("Z", "+00:00")
                )
            except:
                pass
    
    logger.info(
        f"User {user_id} profile: weak_areas={profile.weak_areas}, "
        f"strong_areas={profile.strong_areas}, attempts={profile.total_attempts}"
    )
    
    return profile


# ===========================================
# Question Scoring Functions
# ===========================================

def score_question_for_user(
    question: Dict[str, Any],
    user_profile: UserPerformanceProfile,
    jd_keywords: Optional[List[str]] = None,
    target_domain: str = "general",
    position_in_interview: float = 0.5  # 0=start, 1=end
) -> QuestionScore:
    """
    Score a single question based on user profile and context.
    
    Scoring breakdown:
    - Weakness targeting (40%): Does this question help weak areas?
    - Domain relevance (25%): Does question match target domain?
    - JD keyword match (20%): OPTIONAL - JD alignment
    - Difficulty balance (15%): Appropriate difficulty for position
    
    Args:
        question: Question data dictionary
        user_profile: User's performance profile
        jd_keywords: Optional list of JD keywords
        target_domain: Target domain for the interview
        position_in_interview: Position (0=start, 1=end) for difficulty
    
    Returns:
        QuestionScore with all scores calculated
    """
    q_score = QuestionScore(
        question_id=question.get("id", 0),
        question_text=question.get("question", ""),
        category=question.get("category", "general"),
        domain=question.get("domain", "general"),
        difficulty=question.get("difficulty", "medium"),
        keywords=question.get("keywords", []),
        ideal_answer=question.get("ideal_answer", ""),
        time_limit_seconds=question.get("time_limit_seconds", 120),
    )
    
    reasons = []
    
    # --- Score 1: Weakness Targeting (40%) ---
    weakness_score = 0.0
    q_category = q_score.category.lower()
    
    for weak_area in user_profile.weak_areas:
        # Check if question category helps this weak area
        helpful_categories = SCORE_TO_QUESTION_CATEGORY.get(weak_area, [])
        if q_category in helpful_categories:
            weakness_score += 25
            reasons.append(f"Targets weak area: {weak_area}")
    
    # Bonus if user hasn't practiced this category much
    if user_profile.total_attempts < 5:
        weakness_score += 20
        reasons.append("New user - varied practice")
    
    q_score.weakness_score = min(100, weakness_score)
    
    # --- Score 2: Domain Relevance (25%) ---
    domain_score = 0.0
    q_domain = q_score.domain.lower()
    target_domain_lower = target_domain.lower()
    
    if q_domain == target_domain_lower:
        domain_score = 100
        reasons.append(f"Exact domain match: {target_domain}")
    elif q_domain == "general":
        domain_score = 50
        reasons.append("General question - universally applicable")
    elif target_domain_lower == "general":
        domain_score = 70
        reasons.append("No specific domain required")
    else:
        domain_score = 20
    
    q_score.domain_score = domain_score
    
    # --- Score 3: JD Keyword Match (20%) - OPTIONAL ---
    jd_score = 50  # Default neutral score if no JD
    
    if jd_keywords:
        jd_keywords_lower = set(kw.lower() for kw in jd_keywords)
        q_keywords_lower = set(kw.lower() for kw in q_score.keywords)
        q_text_lower = q_score.question_text.lower()
        
        # Keyword overlap
        keyword_matches = len(jd_keywords_lower & q_keywords_lower)
        text_matches = sum(1 for kw in jd_keywords_lower if kw in q_text_lower)
        
        total_matches = keyword_matches + text_matches
        if total_matches > 0:
            jd_score = min(100, 40 + total_matches * 10)
            reasons.append(f"JD keyword matches: {total_matches}")
    else:
        reasons.append("No JD - using balanced selection")
    
    q_score.jd_score = jd_score
    
    # --- Score 4: Difficulty Balance (15%) ---
    difficulty_score = 50.0  # Default
    q_difficulty = q_score.difficulty.lower()
    
    # Determine expected difficulty based on position
    if position_in_interview < 0.2:
        expected = "easy"
    elif position_in_interview > 0.8:
        expected = "hard"
    else:
        expected = "medium"
    
    difficulty_map = {"easy": 1, "medium": 2, "hard": 3}
    expected_val = difficulty_map.get(expected, 2)
    actual_val = difficulty_map.get(q_difficulty, 2)
    
    diff = abs(expected_val - actual_val)
    if diff == 0:
        difficulty_score = 100
        reasons.append(f"Perfect difficulty for position: {expected}")
    elif diff == 1:
        difficulty_score = 60
    else:
        difficulty_score = 20
    
    q_score.difficulty_score = difficulty_score
    
    # --- Calculate Weighted Total ---
    q_score.total_score = (
        q_score.weakness_score * (SELECTION_WEIGHTS["weakness_targeting"] / 100) +
        q_score.domain_score * (SELECTION_WEIGHTS["domain_relevance"] / 100) +
        q_score.jd_score * (SELECTION_WEIGHTS["jd_keyword_match"] / 100) +
        q_score.difficulty_score * (SELECTION_WEIGHTS["difficulty_balance"] / 100)
    )
    
    q_score.selection_reasons = reasons
    
    return q_score


# ===========================================
# Main Selection Algorithm
# ===========================================

async def select_questions_intelligently(
    all_questions: List[Dict[str, Any]],
    user_id: Optional[str] = None,
    user_attempts: Optional[List[Dict[str, Any]]] = None,
    jd_text: Optional[str] = None,
    jd_keywords: Optional[List[str]] = None,
    target_domain: str = "general",
    num_questions: int = 10,
    allow_repeats: bool = False,
    randomization_factor: float = 0.2  # 20% randomization
) -> SelectionResult:
    """
    Select questions using intelligent multi-factor algorithm.
    
    Algorithm Steps:
    1. Build user performance profile (if history exists)
    2. Score all questions based on weighted factors
    3. Remove recently attempted questions (unless allowed)
    4. Balance across categories
    5. Apply intelligent randomization (not pure random)
    6. Order by interview flow (easy → hard)
    
    Args:
        all_questions: Pool of available questions
        user_id: Optional user identifier
        user_attempts: Optional list of user's previous attempts
        jd_text: Optional job description text
        jd_keywords: Optional pre-extracted JD keywords
        target_domain: Target domain for questions
        num_questions: Number of questions to select
        allow_repeats: Whether to allow repeat questions
        randomization_factor: How much randomization (0-1)
    
    Returns:
        SelectionResult with selected questions and metadata
    """
    logger.info(f"Starting intelligent question selection: target={num_questions}, domain={target_domain}")
    
    # Step 1: Build user profile
    if user_id and user_attempts:
        user_profile = await analyze_user_performance(user_id, user_attempts)
    else:
        user_profile = UserPerformanceProfile(user_id=user_id or "anonymous", total_attempts=0)
    
    # Step 2: Extract JD keywords if text provided
    if jd_text and not jd_keywords:
        jd_keywords = _extract_keywords_from_text(jd_text)
    
    # Step 3: Score all questions
    scored_questions: List[QuestionScore] = []
    excluded_questions: List[QuestionScore] = []
    
    excluded_ids = set(user_profile.attempted_question_ids) if not allow_repeats else set()
    
    for i, q in enumerate(all_questions):
        position = i / max(len(all_questions), 1)
        q_score = score_question_for_user(
            question=q,
            user_profile=user_profile,
            jd_keywords=jd_keywords,
            target_domain=target_domain,
            position_in_interview=position
        )
        
        if q.get("id") in excluded_ids:
            # Keep separate in case we need to fallback
            q_score.total_score -= 50  # Penalty for repetition
            q_score.selection_reasons.append("Repeat question (fallback)")
            excluded_questions.append(q_score)
            continue
            
        scored_questions.append(q_score)
    
    logger.debug(f"Scored {len(scored_questions)} questions after exclusions")
    
    # Fallback: If not enough questions, add from excluded
    if len(scored_questions) < num_questions and excluded_questions:
        logger.info(f"Not enough fresh questions ({len(scored_questions)} < {num_questions}). Adding {min(num_questions - len(scored_questions), len(excluded_questions))} repeats.")
        # Sort excluded by their penalized score
        excluded_questions.sort(key=lambda x: x.total_score, reverse=True)
        # Add enough to reach target
        needed = num_questions - len(scored_questions)
        scored_questions.extend(excluded_questions[:needed])
    
    # Step 4: Sort by score with intelligent randomization
    if randomization_factor > 0:
        # Add controlled randomness to scores
        for q in scored_questions:
            noise = random.uniform(-randomization_factor * 20, randomization_factor * 20)
            q.total_score += noise
    
    scored_questions.sort(key=lambda x: x.total_score, reverse=True)
    
    # Step 5: Balance across categories
    selected = _balance_categories(scored_questions, num_questions, target_domain)
    
    # Step 6: Order for interview flow
    selected = _order_for_interview(selected)
    
    # Build result
    total_time = sum(q.time_limit_seconds for q in selected)
    category_dist = defaultdict(int)
    difficulty_dist = defaultdict(int)
    
    for q in selected:
        category_dist[q.category] += 1
        difficulty_dist[q.difficulty] += 1
    
    result = SelectionResult(
        questions=selected,
        total_time_seconds=total_time,
        category_distribution=dict(category_dist),
        difficulty_distribution=dict(difficulty_dist),
        user_weak_areas_targeted=user_profile.weak_areas,
        jd_keywords_used=jd_keywords or [],
        domain_focus=target_domain
    )
    
    logger.info(
        f"Selected {len(selected)} questions: categories={dict(category_dist)}, "
        f"weak_areas_targeted={user_profile.weak_areas}"
    )
    
    return result


def _balance_categories(
    scored_questions: List[QuestionScore],
    num_questions: int,
    target_domain: str
) -> List[QuestionScore]:
    """
    Balance question selection across categories.
    
    Ensures no single category dominates the selection while
    still prioritizing higher-scored questions.
    """
    # Category limits (as percentage of total)
    category_limits = {
        "general": 0.25,
        "behavioral": 0.30,
        "technical": 0.25,
        "situational": 0.20,
        "management": 0.15,
    }
    
    # Calculate max per category
    max_per_category = {
        cat: max(1, int(num_questions * limit))
        for cat, limit in category_limits.items()
    }
    
    selected = []
    category_counts = defaultdict(int)
    
    for q in scored_questions:
        if len(selected) >= num_questions:
            break
        
        cat = q.category
        if category_counts[cat] < max_per_category.get(cat, 2):
            selected.append(q)
            category_counts[cat] += 1
    
    # If we don't have enough, add more from any category
    if len(selected) < num_questions:
        for q in scored_questions:
            if q not in selected and len(selected) < num_questions:
                selected.append(q)
    
    return selected


def _order_for_interview(questions: List[QuestionScore]) -> List[QuestionScore]:
    """
    Order questions for optimal interview flow.
    
    Pattern:
    1. Start easy with general/intro questions
    2. Build up to behavioral questions
    3. Technical/challenging in the middle
    4. End with situational/wrap-up questions
    """
    category_order = {
        "general": 1,
        "behavioral": 2,
        "technical": 3,
        "management": 4,
        "situational": 5
    }
    
    difficulty_order = {"easy": 1, "medium": 2, "hard": 3}
    
    return sorted(questions, key=lambda q: (
        category_order.get(q.category, 3),
        difficulty_order.get(q.difficulty, 2)
    ))


def _extract_keywords_from_text(text: str, max_keywords: int = 20) -> List[str]:
    """Extract meaningful keywords from text."""
    import re
    
    # Stop words to exclude
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
        'that', 'these', 'those', 'we', 'you', 'your', 'our', 'their',
        'experience', 'required', 'requirements', 'responsibilities', 'ability',
        'work', 'working', 'team', 'company', 'job', 'position', 'candidate'
    }
    
    # Extract words
    words = re.findall(r'\b[a-z]+\b', text.lower())
    
    # Count and filter
    word_counts = defaultdict(int)
    for w in words:
        if w not in stop_words and len(w) > 2:
            word_counts[w] += 1
    
    # Return top keywords
    sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    return [w for w, _ in sorted_words[:max_keywords]]


# ===========================================
# Helper Functions for External Use
# ===========================================

def get_improvement_recommendations(
    user_profile: UserPerformanceProfile
) -> List[Dict[str, Any]]:
    """
    Get actionable improvement recommendations based on user profile.
    
    Returns:
        List of recommendation dictionaries with focus area and advice
    """
    recommendations = []
    
    # Check each score category
    score_advice = {
        "content": {
            "label": "Content & Relevance",
            "tips": [
                "Focus on directly answering the question asked",
                "Include specific examples and metrics",
                "Reference key terms from the question",
            ]
        },
        "delivery": {
            "label": "Delivery & Pace",
            "tips": [
                "Practice speaking at 130-150 words per minute",
                "Eliminate filler words like 'um', 'uh', 'like'",
                "Use deliberate pauses for emphasis",
            ]
        },
        "communication": {
            "label": "Communication & Grammar",
            "tips": [
                "Use complete, well-structured sentences",
                "Avoid run-on sentences and fragments",
                "Expand your professional vocabulary",
            ]
        },
        "structure": {
            "label": "Answer Structure",
            "tips": [
                "Use the STAR method (Situation, Task, Action, Result)",
                "Lead with your key point",
                "End with a clear conclusion",
            ]
        },
        "confidence": {
            "label": "Confidence & Presence",
            "tips": [
                "Maintain steady eye contact",
                "Speak with conviction and certainty",
                "Avoid hedging language ('I think', 'maybe')",
            ]
        },
        "voice": {
            "label": "Voice Quality",
            "tips": [
                "Vary your pitch to maintain interest",
                "Project your voice clearly",
                "Show energy and enthusiasm",
            ]
        },
    }
    
    for weak_area in user_profile.weak_areas:
        if weak_area in score_advice:
            advice = score_advice[weak_area]
            avg_score = getattr(user_profile, f"avg_{weak_area}", 0)
            recommendations.append({
                "area": weak_area,
                "label": advice["label"],
                "current_score": round(avg_score, 1),
                "priority": "high" if avg_score < 50 else "medium",
                "tips": advice["tips"],
            })
    
    # Sort by priority
    recommendations.sort(key=lambda x: x["current_score"])
    
    return recommendations


def calculate_improvement_delta(
    old_attempts: List[Dict[str, Any]],
    new_attempts: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Calculate improvement between two sets of attempts.
    
    Returns:
        Dictionary with delta for each score category
    """
    def avg_score(attempts: List[Dict], field: str) -> float:
        values = [a.get(field, 0) or 0 for a in attempts]
        return sum(values) / len(values) if values else 0
    
    fields = [
        "content_score", "delivery_score", "communication_score",
        "voice_score", "confidence_score", "structure_score", "final_score"
    ]
    
    deltas = {}
    for field in fields:
        old_avg = avg_score(old_attempts, field)
        new_avg = avg_score(new_attempts, field)
        key = field.replace("_score", "")
        deltas[key] = round(new_avg - old_avg, 2)
    
    return deltas
