"""
AI Interview Feedback MVP - ML Engine

This is the CORE ML logic module that handles all machine learning operations:
- Semantic similarity using sentence transformers (relevance scoring)
- Filler word detection
- Words per minute (WPM) calculation
- Grammar error estimation using LanguageTool
- Speech analysis using Parselmouth (pitch variation, speaking rate)
- Answer and resume scoring

Pipeline: Whisper → SentenceTransformer → Parselmouth → LanguageTool → GPT

Author: Member 2 (ML Engine)

Key Functions:
    - load_models(): Load sentence transformer model
    - semantic_similarity(text1, text2): Calculate embedding similarity
    - count_fillers(transcript): Count filler words
    - compute_wpm(transcript, duration): Calculate speaking rate
    - estimate_grammar_errors(transcript): Estimate grammar issues using LanguageTool
    - analyze_speech_audio(audio_path): Analyze pitch and speaking rate with Parselmouth
    - score_answer(transcript, duration, ideal_answer): Full answer scoring
    - score_resume(resume_text, jd_text): Resume relevance scoring
"""

import re
from typing import Dict, List, Tuple, Optional
from functools import lru_cache

from app.logging_config import get_logger

logger = get_logger(__name__)

# ML Libraries
import numpy as np

from app.config import (
    SCORE_WEIGHTS,
    FILLER_WORDS,
    FILLER_PENALTY_PER_WORD,
    MAX_FILLER_PENALTY,
    OPTIMAL_WPM_MIN,
    OPTIMAL_WPM_MAX,
    WPM_TOO_SLOW,
    WPM_TOO_FAST,
    GRAMMAR_PENALTY_PER_ERROR,
    MAX_GRAMMAR_PENALTY,
    MIN_SIMILARITY_THRESHOLD,
    SIMILARITY_MULTIPLIER,
    MIN_SCORE,
    MAX_SCORE,
    # Enhanced Communication Scoring
    COMMUNICATION_WEIGHTS,
    TTR_EXCELLENT,
    TTR_GOOD,
    TTR_POOR,
    SENTENCE_LENGTH_MIN,
    SENTENCE_LENGTH_MAX,
    SENTENCE_LENGTH_OPTIMAL_MIN,
    SENTENCE_LENGTH_OPTIMAL_MAX,
    TRANSITION_WORDS,
    PROFESSIONAL_TERMS,
    CLARITY_INDICATORS,
    MIN_WORDS_FOR_ANALYSIS,
    # NEW: 6-Score System Weights
    VOICE_WEIGHTS,
    CONFIDENCE_WEIGHTS,
    STRUCTURE_WEIGHTS,
    CONTENT_WEIGHTS,
    DELIVERY_WEIGHTS,
    # NEW: STAR Method Keywords
    STAR_SITUATION_KEYWORDS,
    STAR_TASK_KEYWORDS,
    STAR_ACTION_KEYWORDS,
    STAR_RESULT_KEYWORDS,
    # NEW: Quality Gates
    QUALITY_GATES,
    NONSENSE_PATTERNS,
    MIN_COHERENCE_SCORE,
    SCORE_CAPS
)


# ===========================================
# Model Loading (Lazy Loading Pattern)
# ===========================================

# Global variable to hold the loaded model
_sentence_model = None


def load_models() -> None:
    """
    Load the sentence transformer model.
    
    Uses the 'all-MiniLM-L6-v2' model which provides a good balance
    between quality and speed for semantic similarity tasks.
    
    This function uses lazy loading - the model is only loaded
    when first needed, not on application startup.
    """
    global _sentence_model
    
    if _sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("📊 Loading sentence transformer model...")
            _sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("✅ Model loaded successfully!")
        except Exception as e:
            print(f"⚠️ Warning: Could not load sentence transformer model: {e}")
            print("   Using fallback similarity calculation")


def get_model():
    """
    Get the loaded sentence transformer model.
    
    Ensures model is loaded before returning.
    
    Returns:
        SentenceTransformer or None: The loaded model
    """
    global _sentence_model
    if _sentence_model is None:
        load_models()
    return _sentence_model


# ===========================================
# Semantic Similarity
# ===========================================

def semantic_similarity(text1: str, text2: str) -> float:
    """
    Calculate semantic similarity between two texts using embeddings.
    
    Uses sentence-transformers to create embeddings and computes
    cosine similarity between them.
    
    Args:
        text1: First text to compare
        text2: Second text to compare
    
    Returns:
        float: Similarity score between 0 and 1
            - 0.0 = completely different
            - 1.0 = identical meaning
    
    Example:
        >>> similarity = semantic_similarity(
        ...     "I have experience in Python programming",
        ...     "I know how to code in Python"
        ... )
        >>> print(f"Similarity: {similarity:.2f}")  # ~0.75
    """
    if not text1 or not text2:
        return 0.0
    
    model = get_model()
    
    if model is None:
        # Fallback to simple word overlap if model not available
        return _fallback_similarity(text1, text2)
    
    try:
        # Generate embeddings for both texts
        embeddings = model.encode([text1, text2], convert_to_numpy=True)
        
        # Calculate cosine similarity
        similarity = _cosine_similarity(embeddings[0], embeddings[1])
        
        # Ensure result is between 0 and 1
        return max(0.0, min(1.0, float(similarity)))
    
    except Exception as e:
        print(f"Error in semantic similarity: {e}")
        return _fallback_similarity(text1, text2)


def _cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Calculate cosine similarity between two vectors.
    
    Args:
        vec1: First vector
        vec2: Second vector
    
    Returns:
        float: Cosine similarity (-1 to 1, normalized to 0-1)
    """
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    similarity = dot_product / (norm1 * norm2)
    
    # Convert from [-1, 1] to [0, 1]
    return (similarity + 1) / 2


def _fallback_similarity(text1: str, text2: str) -> float:
    """
    Fallback similarity calculation using word overlap (Jaccard similarity).
    
    Used when sentence transformer model is not available.
    
    Args:
        text1: First text
        text2: Second text
    
    Returns:
        float: Jaccard similarity score (0-1)
    """
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    intersection = len(words1 & words2)
    union = len(words1 | words2)
    
    if union == 0:
        return 0.0
    
    return intersection / union


# ===========================================
# Filler Word Detection
# ===========================================

def count_fillers(transcript: str) -> Tuple[int, List[str]]:
    """
    Count the number of filler words in a transcript.
    
    Searches for common filler words and phrases that indicate
    hesitation or lack of preparation.
    
    Args:
        transcript: The text to analyze
    
    Returns:
        Tuple[int, List[str]]: 
            - Total count of filler words found
            - List of fillers found (with counts)
    
    Example:
        >>> count, fillers = count_fillers("Um, I think, like, the solution is basically um simple")
        >>> print(f"Found {count} fillers: {fillers}")
        # Found 4 fillers: ['um (2)', 'like (1)', 'basically (1)']
    """
    if not transcript:
        return 0, []
    
    transcript_lower = transcript.lower()
    found_fillers = []
    total_count = 0
    
    for filler in FILLER_WORDS:
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = re.findall(pattern, transcript_lower)
        count = len(matches)
        
        if count > 0:
            found_fillers.append(f"{filler} ({count})")
            total_count += count
    
    return total_count, found_fillers


# ===========================================
# Words Per Minute Calculation
# ===========================================

def compute_wpm(transcript: str, duration_seconds: float) -> float:
    """
    Calculate the words per minute (WPM) speaking rate.
    
    Professional speaking rate is typically 130-160 WPM.
    Too slow (<100) suggests hesitation or discomfort.
    Too fast (>180) may indicate nervousness or rushing.
    
    Args:
        transcript: The transcribed text
        duration_seconds: Duration of the audio in seconds
    
    Returns:
        float: Words per minute (WPM)
    
    Example:
        >>> wpm = compute_wpm("This is a test sentence", 3.0)
        >>> print(f"Speaking rate: {wpm:.1f} WPM")  # 100 WPM
    """
    if not transcript or duration_seconds <= 0:
        return 0.0
    
    # Count words (split by whitespace)
    words = transcript.split()
    word_count = len(words)
    
    # Convert seconds to minutes
    duration_minutes = duration_seconds / 60.0
    
    if duration_minutes <= 0:
        return 0.0
    
    wpm = word_count / duration_minutes
    
    return round(wpm, 1)


def get_wpm_assessment(wpm: float) -> Tuple[str, int]:
    """
    Assess the WPM and provide feedback.
    
    Args:
        wpm: Words per minute
    
    Returns:
        Tuple[str, int]: 
            - Assessment message
            - Penalty to apply (0-30)
    """
    if wpm < WPM_TOO_SLOW:
        penalty = min(30, int((WPM_TOO_SLOW - wpm) * 0.5))
        return "Speaking too slowly - try to maintain better flow", penalty
    elif wpm > WPM_TOO_FAST:
        penalty = min(30, int((wpm - WPM_TOO_FAST) * 0.3))
        return "Speaking too fast - slow down for clarity", penalty
    elif OPTIMAL_WPM_MIN <= wpm <= OPTIMAL_WPM_MAX:
        return "Good speaking pace", 0
    elif wpm < OPTIMAL_WPM_MIN:
        return "Slightly slow - could pick up the pace a bit", 5
    else:
        return "Slightly fast - could slow down a bit", 5


# ===========================================
# Grammar Error Estimation
# ===========================================

# Cache for language tool to avoid reloading
_language_tool = None


def _get_language_tool():
    """Get or create the language tool instance."""
    global _language_tool
    
    if _language_tool is None:
        try:
            import language_tool_python
            _language_tool = language_tool_python.LanguageTool('en-US')
        except Exception as e:
            print(f"Could not load language tool: {e}")
            return None
    
    return _language_tool


def estimate_grammar_errors(transcript: str) -> Tuple[int, List[str]]:
    """
    Estimate the number of grammar errors in a transcript.
    
    Uses language_tool_python for grammar checking when available,
    falls back to heuristic checking otherwise.
    
    Args:
        transcript: The text to analyze
    
    Returns:
        Tuple[int, List[str]]:
            - Number of grammar errors detected
            - List of error descriptions
    
    Example:
        >>> errors, descriptions = estimate_grammar_errors("I has went to store")
        >>> print(f"Found {errors} errors: {descriptions}")
    """
    if not transcript or len(transcript) < 10:
        return 0, []
    
    tool = _get_language_tool()
    
    if tool is not None:
        try:
            matches = tool.check(transcript)
            # Filter out minor/stylistic issues
            errors = [m for m in matches if m.ruleIssueType in ['grammar', 'typos']]
            descriptions = [f"{m.message}" for m in errors[:5]]  # Limit to 5
            return len(errors), descriptions
        except Exception as e:
            print(f"Language tool error: {e}")
    
    # Fallback: heuristic grammar checking
    return _heuristic_grammar_check(transcript)


def _heuristic_grammar_check(transcript: str) -> Tuple[int, List[str]]:
    """
    Heuristic grammar checking as fallback.
    
    Checks for common grammar issues:
    - Subject-verb agreement (I is, he have)
    - Double negatives
    - Common confusions (their/there/they're)
    
    Args:
        transcript: Text to check
    
    Returns:
        Tuple[int, List[str]]: Error count and descriptions
    """
    errors = 0
    descriptions = []
    text_lower = transcript.lower()
    
    # Common grammar mistakes patterns
    patterns = [
        (r'\bi\s+is\b', "Subject-verb disagreement: 'I is'"),
        (r'\bhe\s+have\b', "Subject-verb disagreement: 'he have'"),
        (r'\bshe\s+have\b', "Subject-verb disagreement: 'she have'"),
        (r'\bthey\s+was\b', "Subject-verb disagreement: 'they was'"),
        (r'\bwe\s+was\b', "Subject-verb disagreement: 'we was'"),
        (r"\bdon't\s+got\b", "Non-standard: \"don't got\""),
        (r'\bcould\s+of\b', "Common error: should be 'could have'"),
        (r'\bwould\s+of\b', "Common error: should be 'would have'"),
        (r'\bshould\s+of\b', "Common error: should be 'should have'"),
    ]
    
    for pattern, description in patterns:
        if re.search(pattern, text_lower):
            errors += 1
            descriptions.append(description)
    
    return errors, descriptions


# ===========================================
# Enhanced Communication Scoring Functions
# ===========================================

def calculate_vocabulary_diversity(transcript: str) -> Dict:
    """
    Calculate vocabulary diversity using Type-Token Ratio (TTR).
    
    TTR = unique_words / total_words
    Higher TTR indicates more diverse vocabulary usage.
    
    Args:
        transcript: The text to analyze
    
    Returns:
        dict: {
            "ttr": 0.0-1.0,
            "unique_words": int,
            "total_words": int,
            "score": 0-100,
            "assessment": str
        }
    """
    result = {
        "ttr": 0.0,
        "unique_words": 0,
        "total_words": 0,
        "score": 0.0,
        "assessment": "insufficient text"
    }
    
    if not transcript:
        return result
    
    # Extract words (3+ characters to filter noise)
    words = re.findall(r'\b[a-zA-Z]{3,}\b', transcript.lower())
    total_words = len(words)
    
    if total_words < MIN_WORDS_FOR_ANALYSIS:
        return result
    
    unique_words = len(set(words))
    ttr = unique_words / total_words if total_words > 0 else 0.0
    
    result["ttr"] = round(ttr, 3)
    result["unique_words"] = unique_words
    result["total_words"] = total_words
    
    # Convert TTR to 0-100 score
    if ttr >= TTR_EXCELLENT:
        score = 85 + (ttr - TTR_EXCELLENT) * 100  # 85-100
        result["assessment"] = "Excellent vocabulary diversity"
    elif ttr >= TTR_GOOD:
        score = 70 + (ttr - TTR_GOOD) / (TTR_EXCELLENT - TTR_GOOD) * 15  # 70-85
        result["assessment"] = "Good vocabulary diversity"
    elif ttr >= TTR_POOR:
        score = 40 + (ttr - TTR_POOR) / (TTR_GOOD - TTR_POOR) * 30  # 40-70
        result["assessment"] = "Moderate vocabulary - try using more varied words"
    else:
        score = ttr / TTR_POOR * 40  # 0-40
        result["assessment"] = "Limited vocabulary - try to avoid repeating the same words"
    
    result["score"] = round(min(100, max(0, score)), 1)
    return result


def analyze_sentence_complexity(transcript: str) -> Dict:
    """
    Analyze sentence structure and complexity.
    
    Evaluates:
    - Average sentence length (optimal: 12-20 words)
    - Sentence length variation (good variation indicates dynamic speech)
    - Sentence count
    
    Args:
        transcript: The text to analyze
    
    Returns:
        dict: {
            "sentence_count": int,
            "avg_length": float,
            "length_std": float,
            "score": 0-100,
            "assessment": str
        }
    """
    result = {
        "sentence_count": 0,
        "avg_length": 0.0,
        "length_std": 0.0,
        "score": 0.0,
        "assessment": "insufficient text"
    }
    
    if not transcript:
        return result
    
    # Split into sentences (handle common patterns)
    sentences = re.split(r'[.!?]+', transcript)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if len(sentences) < 2:
        result["sentence_count"] = len(sentences)
        result["assessment"] = "Need more sentences for analysis"
        result["score"] = 50.0  # Neutral score
        return result
    
    # Calculate sentence lengths
    lengths = [len(s.split()) for s in sentences]
    avg_length = np.mean(lengths)
    length_std = np.std(lengths)
    
    result["sentence_count"] = len(sentences)
    result["avg_length"] = round(avg_length, 1)
    result["length_std"] = round(length_std, 1)
    
    # Score based on optimal range
    score = 100.0
    
    # Penalize if average is too short or too long
    if avg_length < SENTENCE_LENGTH_MIN:
        penalty = (SENTENCE_LENGTH_MIN - avg_length) * 5
        score -= penalty
        result["assessment"] = "Sentences too short - try to elaborate more"
    elif avg_length > SENTENCE_LENGTH_MAX:
        penalty = (avg_length - SENTENCE_LENGTH_MAX) * 3
        score -= penalty
        result["assessment"] = "Sentences too long - try to be more concise"
    elif SENTENCE_LENGTH_OPTIMAL_MIN <= avg_length <= SENTENCE_LENGTH_OPTIMAL_MAX:
        result["assessment"] = "Good sentence structure"
    elif avg_length < SENTENCE_LENGTH_OPTIMAL_MIN:
        score -= 10
        result["assessment"] = "Slightly short sentences - consider adding more detail"
    else:
        score -= 10
        result["assessment"] = "Slightly long sentences - consider being more concise"
    
    # Bonus for good variation (indicates dynamic speech)
    if 3 <= length_std <= 8:
        score += 5
        if "Good" in result["assessment"]:
            result["assessment"] += " with nice variation"
    
    result["score"] = round(min(100, max(0, score)), 1)
    return result


def analyze_coherence(transcript: str) -> Dict:
    """
    Analyze coherence and flow using transition word detection.
    
    Transition words indicate logical flow and organized thinking.
    Examples: "however", "therefore", "additionally", "first", etc.
    
    Args:
        transcript: The text to analyze
    
    Returns:
        dict: {
            "transition_count": int,
            "transitions_found": list,
            "transition_ratio": float,
            "score": 0-100,
            "assessment": str
        }
    """
    result = {
        "transition_count": 0,
        "transitions_found": [],
        "transition_ratio": 0.0,
        "score": 0.0,
        "assessment": "insufficient text"
    }
    
    if not transcript:
        return result
    
    transcript_lower = transcript.lower()
    words = transcript_lower.split()
    total_words = len(words)
    
    if total_words < MIN_WORDS_FOR_ANALYSIS:
        return result
    
    # Find transition words/phrases
    found_transitions = []
    for transition in TRANSITION_WORDS:
        # Use word boundary for single words, substring for phrases
        if ' ' in transition:
            if transition in transcript_lower:
                count = transcript_lower.count(transition)
                found_transitions.append(f"{transition} ({count})")
        else:
            pattern = r'\b' + re.escape(transition) + r'\b'
            matches = re.findall(pattern, transcript_lower)
            if matches:
                found_transitions.append(f"{transition} ({len(matches)})")
    
    transition_count = len(found_transitions)
    transition_ratio = transition_count / (total_words / 50)  # Per 50 words
    
    result["transition_count"] = transition_count
    result["transitions_found"] = found_transitions
    result["transition_ratio"] = round(transition_ratio, 2)
    
    # Score based on transition usage
    if transition_count >= 5:
        score = 90 + min(10, (transition_count - 5) * 2)
        result["assessment"] = "Excellent use of transitions - well-organized speech"
    elif transition_count >= 3:
        score = 75 + (transition_count - 3) * 7.5
        result["assessment"] = "Good use of transitions"
    elif transition_count >= 1:
        score = 50 + (transition_count - 1) * 12.5
        result["assessment"] = "Some transitions used - consider adding more connectors"
    else:
        score = 40
        result["assessment"] = "No transitions detected - use words like 'first', 'however', 'therefore'"
    
    result["score"] = round(min(100, max(0, score)), 1)
    return result


def detect_professional_vocabulary(transcript: str) -> Dict:
    """
    Detect usage of professional vocabulary and power words.
    
    Professional terms are action verbs and business language
    that indicate confident, experienced communication.
    
    Args:
        transcript: The text to analyze
    
    Returns:
        dict: {
            "professional_count": int,
            "professional_words_found": list,
            "pro_ratio": float,
            "score": 0-100,
            "assessment": str
        }
    """
    result = {
        "professional_count": 0,
        "professional_words_found": [],
        "pro_ratio": 0.0,
        "score": 0.0,
        "assessment": "insufficient text"
    }
    
    if not transcript:
        return result
    
    transcript_lower = transcript.lower()
    words = re.findall(r'\b[a-zA-Z]{3,}\b', transcript_lower)
    total_words = len(words)
    
    if total_words < MIN_WORDS_FOR_ANALYSIS:
        return result
    
    # Find professional terms
    found_terms = []
    for term in PROFESSIONAL_TERMS:
        # Check for the term or its common variations (stemming)
        pattern = r'\b' + re.escape(term[:min(6, len(term))]) + r'[a-z]*\b'
        matches = re.findall(pattern, transcript_lower)
        if matches:
            found_terms.extend(matches[:3])  # Limit per term
    
    # Remove duplicates while preserving order
    unique_terms = list(dict.fromkeys(found_terms))
    professional_count = len(unique_terms)
    pro_ratio = professional_count / total_words if total_words > 0 else 0.0
    
    result["professional_count"] = professional_count
    result["professional_words_found"] = unique_terms[:10]  # Top 10
    result["pro_ratio"] = round(pro_ratio, 4)
    
    # Score based on professional vocabulary usage
    if professional_count >= 6:
        score = 90 + min(10, (professional_count - 6) * 2)
        result["assessment"] = "Excellent professional vocabulary"
    elif professional_count >= 4:
        score = 75 + (professional_count - 4) * 7.5
        result["assessment"] = "Good use of professional language"
    elif professional_count >= 2:
        score = 55 + (professional_count - 2) * 10
        result["assessment"] = "Some professional terms - consider using more action verbs"
    elif professional_count >= 1:
        score = 45
        result["assessment"] = "Limited professional vocabulary - use words like 'implemented', 'achieved', 'led'"
    else:
        score = 35
        result["assessment"] = "Consider using professional action verbs (implemented, developed, managed)"
    
    result["score"] = round(min(100, max(0, score)), 1)
    return result


# ===========================================
# NEW: Structure Score Analysis (STAR Method)
# ===========================================

def analyze_star_structure(transcript: str) -> Dict:
    """
    Analyze answer structure using STAR method detection.
    
    STAR = Situation, Task, Action, Result
    This is a common interview technique for behavioral questions.
    
    Args:
        transcript: The answer text to analyze
    
    Returns:
        dict: {
            "star_components_found": list,
            "star_score": 0-100,
            "organization_score": 0-100,
            "conclusion_score": 0-100,
            "final_score": 0-100,
            "feedback": list
        }
    """
    result = {
        "star_components_found": [],
        "star_score": 0.0,
        "organization_score": 0.0,
        "conclusion_score": 0.0,
        "final_score": 0.0,
        "feedback": []
    }
    
    if not transcript or len(transcript) < 20:
        result["feedback"] = ["Answer too short to analyze structure"]
        return result
    
    transcript_lower = transcript.lower()
    
    # Detect STAR components
    star_found = {
        "situation": False,
        "task": False,
        "action": False,
        "result": False
    }
    
    # Check for Situation keywords
    for keyword in STAR_SITUATION_KEYWORDS:
        if keyword in transcript_lower:
            star_found["situation"] = True
            break
    
    # Check for Task keywords
    for keyword in STAR_TASK_KEYWORDS:
        if keyword in transcript_lower:
            star_found["task"] = True
            break
    
    # Check for Action keywords
    for keyword in STAR_ACTION_KEYWORDS:
        if keyword in transcript_lower:
            star_found["action"] = True
            break
    
    # Check for Result keywords
    for keyword in STAR_RESULT_KEYWORDS:
        if keyword in transcript_lower:
            star_found["result"] = True
            break
    
    # Calculate STAR score
    components_count = sum(star_found.values())
    result["star_components_found"] = [k for k, v in star_found.items() if v]
    
    if components_count == 4:
        result["star_score"] = 100.0
        result["feedback"].append("Excellent STAR method usage!")
    elif components_count == 3:
        result["star_score"] = 80.0
        missing = [k for k, v in star_found.items() if not v]
        result["feedback"].append(f"Good structure - consider adding: {missing[0]}")
    elif components_count == 2:
        result["star_score"] = 60.0
        missing = [k for k, v in star_found.items() if not v]
        result["feedback"].append(f"Add more structure - missing: {', '.join(missing)}")
    elif components_count == 1:
        result["star_score"] = 40.0
        result["feedback"].append("Try using the STAR method: Situation, Task, Action, Result")
    else:
        result["star_score"] = 25.0
        result["feedback"].append("Structure your answer using STAR: Situation, Task, Action, Result")
    
    # Organization score (based on sentence flow and transitions)
    sentences = [s.strip() for s in re.split(r'[.!?]+', transcript) if s.strip()]
    
    if len(sentences) >= 3:
        # Good number of sentences indicates organized thought
        result["organization_score"] = min(100, 60 + len(sentences) * 5)
    elif len(sentences) >= 2:
        result["organization_score"] = 50.0
    else:
        result["organization_score"] = 30.0
        result["feedback"].append("Break your answer into multiple clear points")
    
    # Conclusion score (does the answer have a clear ending?)
    conclusion_indicators = [
        "in conclusion", "ultimately", "as a result", "this led to",
        "the outcome was", "i learned", "this taught me", "because of this",
        "this experience", "going forward", "the key takeaway"
    ]
    
    has_conclusion = any(ind in transcript_lower for ind in conclusion_indicators)
    
    # Check if last sentence indicates conclusion
    if sentences:
        last_sentence = sentences[-1].lower()
        has_conclusion = has_conclusion or any(ind in last_sentence for ind in ["result", "learn", "outcome", "achiev", "succe"])
    
    if has_conclusion:
        result["conclusion_score"] = 90.0
    else:
        result["conclusion_score"] = 60.0
        result["feedback"].append("End with a clear conclusion or takeaway")
    
    # Calculate weighted final score
    result["final_score"] = round(
        STRUCTURE_WEIGHTS["star_method"] * result["star_score"] +
        STRUCTURE_WEIGHTS["organization"] * result["organization_score"] +
        STRUCTURE_WEIGHTS["conclusion"] * result["conclusion_score"],
        1
    )
    
    return result


def calculate_structure_score(transcript: str) -> Dict:
    """
    Calculate overall structure score for interview answers.
    
    Uses STAR method detection and organizational analysis.
    
    Args:
        transcript: The answer text
    
    Returns:
        dict with final_score, components, and feedback
    """
    return analyze_star_structure(transcript)


# ===========================================
# NEW: Confidence Score Calculation
# ===========================================

def calculate_confidence_score(
    voice_confidence: float = 70.0,
    eye_contact_score: float = 70.0,
    body_stability_score: float = 70.0,
    emotion_positivity_score: float = 70.0
) -> Dict:
    """
    Calculate overall confidence score from multiple inputs.
    
    Combines:
    - Voice confidence (40%) - from voice analysis
    - Eye contact (30%) - from video analysis
    - Body stability (20%) - from video analysis
    - Emotion positivity (10%) - from facial expressions
    
    Args:
        voice_confidence: Score from voice analysis (0-100)
        eye_contact_score: Score from video analysis (0-100)
        body_stability_score: Score from video analysis (0-100)
        emotion_positivity_score: Score from facial analysis (0-100)
    
    Returns:
        dict: {
            "final_score": 0-100,
            "components": {
                "voice_confidence": float,
                "eye_contact": float,
                "body_stability": float,
                "emotion_positivity": float
            },
            "feedback": list
        }
    """
    result = {
        "final_score": 0.0,
        "components": {
            "voice_confidence": voice_confidence,
            "eye_contact": eye_contact_score,
            "body_stability": body_stability_score,
            "emotion_positivity": emotion_positivity_score
        },
        "feedback": []
    }
    
    # Calculate weighted score
    final = (
        CONFIDENCE_WEIGHTS["voice_confidence"] * voice_confidence +
        CONFIDENCE_WEIGHTS["eye_contact"] * eye_contact_score +
        CONFIDENCE_WEIGHTS["body_stability"] * body_stability_score +
        CONFIDENCE_WEIGHTS["emotion_positivity"] * emotion_positivity_score
    )
    
    result["final_score"] = round(min(100, max(0, final)), 1)
    
    # Generate feedback
    if voice_confidence < 60:
        result["feedback"].append("Project your voice with more confidence")
    if eye_contact_score < 60:
        result["feedback"].append("Maintain better eye contact with the camera")
    if body_stability_score < 60:
        result["feedback"].append("Try to reduce fidgeting and stay more still")
    if emotion_positivity_score < 60:
        result["feedback"].append("Try to appear more positive and engaged")
    
    if result["final_score"] >= 80:
        result["feedback"].insert(0, "You appear confident and composed!")
    elif result["final_score"] >= 60:
        result["feedback"].insert(0, "Good confidence level with room for improvement")
    else:
        result["feedback"].insert(0, "Work on projecting more confidence")
    
    return result


def calculate_enhanced_communication_score(transcript: str) -> Dict:
    """
    Calculate comprehensive communication score using 5 factors.
    
    Combines:
    1. Grammar quality (30%) - via estimate_grammar_errors()
    2. Vocabulary diversity (25%) - Type-Token Ratio
    3. Sentence complexity (15%) - appropriate sentence structure
    4. Coherence/Flow (15%) - transition word usage
    5. Professional vocabulary (15%) - power words and action verbs
    
    Args:
        transcript: The transcribed text to analyze
    
    Returns:
        dict: Comprehensive communication analysis:
            {
                "final_score": 0-100,
                "factors": {
                    "grammar": {"score": 0-100, "weight": 0.30, ...},
                    "vocabulary_diversity": {"score": 0-100, "weight": 0.25, ...},
                    "sentence_complexity": {"score": 0-100, "weight": 0.15, ...},
                    "coherence": {"score": 0-100, "weight": 0.15, ...},
                    "professional_vocab": {"score": 0-100, "weight": 0.15, ...}
                },
                "feedback": [list of improvement tips],
                "strengths": [list of strong areas]
            }
    """
    result = {
        "final_score": 0.0,
        "factors": {},
        "feedback": [],
        "strengths": []
    }
    
    if not transcript or len(transcript.strip()) < 10:
        result["feedback"] = ["Provide more text for accurate communication analysis"]
        return result
    
    # 1. Grammar Analysis
    grammar_errors, grammar_details = estimate_grammar_errors(transcript)
    grammar_score = max(0, 100 - (grammar_errors * GRAMMAR_PENALTY_PER_ERROR))
    grammar_score = min(100, grammar_score)
    
    result["factors"]["grammar"] = {
        "score": round(grammar_score, 1),
        "weight": COMMUNICATION_WEIGHTS["grammar"],
        "errors": grammar_errors,
        "details": grammar_details,
        "assessment": "Good grammar" if grammar_errors <= 2 else f"Found {grammar_errors} grammar issues"
    }
    
    # 2. Vocabulary Diversity
    vocab_analysis = calculate_vocabulary_diversity(transcript)
    result["factors"]["vocabulary_diversity"] = {
        "score": vocab_analysis["score"],
        "weight": COMMUNICATION_WEIGHTS["vocabulary_diversity"],
        "ttr": vocab_analysis["ttr"],
        "unique_words": vocab_analysis["unique_words"],
        "assessment": vocab_analysis["assessment"]
    }
    
    # 3. Sentence Complexity
    sentence_analysis = analyze_sentence_complexity(transcript)
    result["factors"]["sentence_complexity"] = {
        "score": sentence_analysis["score"],
        "weight": COMMUNICATION_WEIGHTS["sentence_complexity"],
        "avg_length": sentence_analysis["avg_length"],
        "sentence_count": sentence_analysis["sentence_count"],
        "assessment": sentence_analysis["assessment"]
    }
    
    # 4. Coherence/Flow
    coherence_analysis = analyze_coherence(transcript)
    result["factors"]["coherence"] = {
        "score": coherence_analysis["score"],
        "weight": COMMUNICATION_WEIGHTS["coherence"],
        "transitions_found": coherence_analysis["transitions_found"],
        "transition_count": coherence_analysis["transition_count"],
        "assessment": coherence_analysis["assessment"]
    }
    
    # 5. Professional Vocabulary
    prof_vocab_analysis = detect_professional_vocabulary(transcript)
    result["factors"]["professional_vocab"] = {
        "score": prof_vocab_analysis["score"],
        "weight": COMMUNICATION_WEIGHTS["professional_vocab"],
        "words_found": prof_vocab_analysis["professional_words_found"],
        "count": prof_vocab_analysis["professional_count"],
        "assessment": prof_vocab_analysis["assessment"]
    }
    
    # Calculate weighted final score
    final_score = 0.0
    for factor_name, factor_data in result["factors"].items():
        final_score += factor_data["score"] * factor_data["weight"]
    
    result["final_score"] = round(final_score, 1)
    
    # Generate feedback (areas to improve)
    for factor_name, factor_data in result["factors"].items():
        if factor_data["score"] < 60:
            result["feedback"].append(factor_data["assessment"])
        elif factor_data["score"] >= 80:
            result["strengths"].append(f"{factor_name.replace('_', ' ').title()}: {factor_data['assessment']}")
    
    # Add specific actionable tips
    if not result["feedback"]:
        result["feedback"].append("Good overall communication - keep it up!")
    
    return result


# ===========================================
# Parselmouth Speech Analysis
# ===========================================

def analyze_speech_audio(audio_path: str) -> Dict:
    """
    Analyze speech characteristics from audio file using Parselmouth.
    
    Parselmouth is a Python interface to Praat, providing advanced
    phonetic analysis capabilities.
    
    Args:
        audio_path: Path to the audio file (WAV format preferred)
    
    Returns:
        dict: Speech analysis results:
            {
                "pitch_mean": float,  # Average pitch in Hz
                "pitch_std": float,   # Pitch variation
                "pitch_range": float, # Range of pitch
                "intensity_mean": float,  # Average loudness
                "speaking_rate_syllables": float,  # Syllables per second
                "pause_ratio": float,  # Ratio of pauses to speech
                "voice_quality": str   # Assessment
            }
    
    Example:
        >>> analysis = analyze_speech_audio("recording.wav")
        >>> print(f"Pitch variation: {analysis['pitch_std']:.1f} Hz")
    """
    result = {
        "pitch_mean": 0.0,
        "pitch_std": 0.0,
        "pitch_range": 0.0,
        "intensity_mean": 0.0,
        "speaking_rate_syllables": 0.0,
        "pause_ratio": 0.0,
        "voice_quality": "unknown"
    }
    
    try:
        import parselmouth
        from parselmouth.praat import call
        
        # Load the sound file
        sound = parselmouth.Sound(audio_path)
        
        # Extract pitch
        pitch = sound.to_pitch()
        pitch_values = pitch.selected_array['frequency']
        pitch_values = pitch_values[pitch_values > 0]  # Remove unvoiced
        
        if len(pitch_values) > 0:
            result["pitch_mean"] = float(np.mean(pitch_values))
            result["pitch_std"] = float(np.std(pitch_values))
            result["pitch_range"] = float(np.max(pitch_values) - np.min(pitch_values))
        
        # Extract intensity (loudness)
        intensity = sound.to_intensity()
        intensity_values = intensity.values[0]
        intensity_values = intensity_values[~np.isnan(intensity_values)]
        
        if len(intensity_values) > 0:
            result["intensity_mean"] = float(np.mean(intensity_values))
        
        # Estimate pause ratio (silence detection)
        # Voiced portions have higher intensity
        threshold = np.percentile(intensity_values, 25) if len(intensity_values) > 0 else 0
        voiced_frames = np.sum(intensity_values > threshold)
        total_frames = len(intensity_values)
        
        if total_frames > 0:
            result["pause_ratio"] = 1.0 - (voiced_frames / total_frames)
        
        # Assess voice quality based on pitch variation
        if result["pitch_std"] > 0:
            if result["pitch_std"] < 20:
                result["voice_quality"] = "monotone - try varying pitch more"
            elif result["pitch_std"] < 40:
                result["voice_quality"] = "good variation"
            elif result["pitch_std"] < 60:
                result["voice_quality"] = "expressive"
            else:
                result["voice_quality"] = "highly expressive"
        
        print(f"[Parselmouth] Analyzed audio: pitch={result['pitch_mean']:.1f}Hz, variation={result['pitch_std']:.1f}Hz")
        
    except ImportError:
        print("[Parselmouth] Library not installed, skipping advanced audio analysis")
    except Exception as e:
        print(f"[Parselmouth] Error analyzing audio: {e}")
    
    return result


def get_speech_feedback(analysis: Dict) -> List[str]:
    """
    Generate feedback tips based on speech analysis.
    
    Args:
        analysis: Results from analyze_speech_audio()
    
    Returns:
        list: Feedback tips for improving speech delivery
    """
    tips = []
    
    # Pitch variation feedback
    if analysis.get("pitch_std", 0) < 20:
        tips.append("Try varying your pitch more to sound more engaging and less monotone")
    elif analysis.get("pitch_std", 0) > 60:
        tips.append("Your pitch variation is good, but ensure it matches your content emphasis")
    
    # Pause ratio feedback
    pause_ratio = analysis.get("pause_ratio", 0)
    if pause_ratio > 0.4:
        tips.append("You have many pauses - practice speaking more fluently while maintaining natural breaks")
    elif pause_ratio < 0.1:
        tips.append("Consider adding more pauses for emphasis and to let key points sink in")
    
    # Intensity feedback
    intensity = analysis.get("intensity_mean", 0)
    if intensity > 0 and intensity < 50:
        tips.append("Speak with more projection and confidence")
    
    return tips


# ===========================================
# Answer Scoring (6-SCORE SYSTEM)
# ===========================================

def score_answer(
    transcript: str,
    duration_seconds: float,
    ideal_answer: str,
    audio_path: str = None,
    video_analysis: Dict = None
) -> Dict:
    """
    Calculate comprehensive scores for an interview answer using 6-SCORE SYSTEM.
    
    This is the main scoring function that combines:
    - Content score (30%): Semantic similarity to ideal answer
    - Delivery score (15%): WPM and filler word usage
    - Communication score (15%): Grammar and vocabulary quality
    - Voice score (15%): Pitch, energy, pauses from audio analysis
    - Confidence score (15%): Voice + video confidence indicators
    - Structure score (10%): STAR method and organization
    
    Args:
        transcript: The transcribed answer text
        duration_seconds: Duration of the audio recording
        ideal_answer: The reference ideal answer
        audio_path: Path to audio file for voice analysis (optional)
        video_analysis: Dict with eye_contact, body_stability, emotion scores (optional)
    
    Returns:
        dict: Comprehensive scoring results with 6 scores and detailed metrics
    
    Example:
        >>> scores = score_answer(
        ...     transcript="I led a team of 5 people...",
        ...     duration_seconds=45.0,
        ...     ideal_answer="Describe leadership experience...",
        ...     audio_path="recording.wav"
        ... )
        >>> print(f"Final score: {scores['final']}")
    """
    logger.debug(f"Scoring answer: transcript_len={len(transcript)}, duration={duration_seconds:.1f}s, audio_path={audio_path}")
    
    # Initialize result with 6-score structure
    result = {
        # Core 6 scores
        "content": 0.0,
        "delivery": 0.0,
        "communication": 0.0,
        "voice": 70.0,  # Default neutral
        "confidence": 70.0,  # Default neutral
        "structure": 0.0,
        "final": 0.0,
        # Metrics
        "wpm": 0.0,
        "filler_count": 0,
        "grammar_errors": 0,
        "relevance": 0.0,
        # Details
        "filler_details": [],
        "grammar_details": [],
        "wpm_feedback": "",
        "voice_feedback": [],
        "structure_feedback": [],
        "confidence_feedback": []
    }
    
    if not transcript or len(transcript.strip()) < 5:
        return result
    
    # ==================
    # 1. CONTENT SCORE (30%)
    # ==================
    # Use hybrid approach: 50% keyword matching + 50% semantic similarity
    content_analysis = calculate_enhanced_content_score(transcript, ideal_answer)
    
    result["content"] = _clamp_score(content_analysis["final_score"])
    result["relevance"] = content_analysis["semantic_similarity"]
    
    # Add detailed content analysis
    result["content_analysis"] = {
        "keyword_coverage": content_analysis["keyword_analysis"].get("keyword_coverage", 0),
        "topics_covered": content_analysis["topics_covered"],
        "topics_missing": content_analysis["topics_missing"],
        "semantic_similarity": content_analysis["semantic_similarity"],
        "feedback": content_analysis["feedback"]
    }
    
    # ==================
    # 2. DELIVERY SCORE (15%)
    # ==================
    delivery_score = 100.0
    
    # Calculate WPM and apply penalties
    wpm = compute_wpm(transcript, duration_seconds)
    result["wpm"] = wpm
    wpm_feedback, wpm_penalty = get_wpm_assessment(wpm)
    result["wpm_feedback"] = wpm_feedback
    delivery_score -= wpm_penalty
    
    # Count fillers and apply penalties
    filler_count, filler_details = count_fillers(transcript)
    result["filler_count"] = filler_count
    result["filler_details"] = filler_details
    
    filler_penalty = min(MAX_FILLER_PENALTY, filler_count * FILLER_PENALTY_PER_WORD)
    delivery_score -= filler_penalty
    
    result["delivery"] = _clamp_score(delivery_score)
    
    # ==================
    # 3. COMMUNICATION SCORE (15%)
    # ==================
    comm_analysis = calculate_enhanced_communication_score(transcript)
    
    result["communication"] = _clamp_score(comm_analysis["final_score"])
    result["grammar_errors"] = comm_analysis["factors"].get("grammar", {}).get("errors", 0)
    result["grammar_details"] = comm_analysis["factors"].get("grammar", {}).get("details", [])
    
    result["communication_analysis"] = {
        "factors": comm_analysis["factors"],
        "feedback": comm_analysis["feedback"],
        "strengths": comm_analysis["strengths"]
    }
    
    # ==================
    # 4. VOICE SCORE (15%) - NEW
    # ==================
    voice_confidence = 70.0  # Default
    
    if audio_path:
        try:
            from .voice_analysis_service import analyze_voice
            voice_result = analyze_voice(audio_path)
            result["voice"] = _clamp_score(voice_result["scores"]["overall"])
            result["voice_feedback"] = voice_result.get("feedback", [])
            voice_confidence = voice_result["scores"].get("voice_confidence", 70.0)
            
            # Add voice metrics
            result["voice_analysis"] = {
                "pitch_variation": voice_result["scores"]["pitch_variation"],
                "energy_projection": voice_result["scores"]["energy_projection"],
                "pause_appropriateness": voice_result["scores"]["pause_appropriateness"],
                "metrics": voice_result["metrics"]
            }
        except Exception as e:
            print(f"Voice analysis failed: {e}")
            result["voice"] = 70.0
            result["voice_feedback"] = ["Voice analysis unavailable"]
    else:
        result["voice"] = 70.0
        result["voice_feedback"] = ["No audio provided for voice analysis"]
    
    # ==================
    # 5. STRUCTURE SCORE (10%) - NEW
    # ==================
    structure_analysis = calculate_structure_score(transcript)
    result["structure"] = _clamp_score(structure_analysis["final_score"])
    result["structure_feedback"] = structure_analysis.get("feedback", [])
    
    result["structure_analysis"] = {
        "star_components": structure_analysis.get("star_components_found", []),
        "star_score": structure_analysis.get("star_score", 0),
        "organization_score": structure_analysis.get("organization_score", 0),
        "conclusion_score": structure_analysis.get("conclusion_score", 0)
    }
    
    # ==================
    # 6. CONFIDENCE SCORE (15%) - NEW
    # ==================
    # Get video analysis scores or use defaults
    eye_contact = 70.0
    body_stability = 70.0
    emotion_positivity = 70.0
    
    if video_analysis:
        eye_contact = video_analysis.get("eye_contact", 70.0)
        body_stability = video_analysis.get("body_stability", 70.0)
        emotion_positivity = video_analysis.get("emotion_positivity", 70.0)
    
    confidence_result = calculate_confidence_score(
        voice_confidence=voice_confidence,
        eye_contact_score=eye_contact,
        body_stability_score=body_stability,
        emotion_positivity_score=emotion_positivity
    )
    
    result["confidence"] = _clamp_score(confidence_result["final_score"])
    result["confidence_feedback"] = confidence_result.get("feedback", [])
    
    result["confidence_analysis"] = confidence_result["components"]
    
    # ==================
    # 7. QUALITY GATES - Apply strict validation
    # ==================
    quality_result = apply_quality_gates(
        transcript=transcript,
        scores=result,
        ideal_answer=ideal_answer
    )
    
    result["quality_issues"] = quality_result["issues"]
    result["quality_penalties"] = quality_result["penalties"]
    
    # ==================
    # 8. FINAL SCORE (Weighted Average with Quality Penalties)
    # ==================
    raw_final_score = (
        result["content"] * SCORE_WEIGHTS["content"] +          # 30%
        result["delivery"] * SCORE_WEIGHTS["delivery"] +        # 15%
        result["communication"] * SCORE_WEIGHTS["communication"] +  # 15%
        result["voice"] * SCORE_WEIGHTS["voice"] +              # 15%
        result["confidence"] * SCORE_WEIGHTS["confidence"] +    # 15%
        result["structure"] * SCORE_WEIGHTS["structure"]        # 10%
    )
    
    # Apply quality penalties
    final_score = raw_final_score - quality_result["total_penalty"]
    
    # Apply score cap if quality is very poor
    if quality_result["score_cap"] is not None:
        final_score = min(final_score, quality_result["score_cap"])
    
    result["final"] = _clamp_score(final_score)
    result["raw_final"] = _clamp_score(raw_final_score)  # Store raw for debugging
    
    return result


# ===========================================
# Quality Gates - Strict Validation System (NEW)
# ===========================================

def detect_nonsense(transcript: str) -> Dict:
    """
    Detect nonsense, gibberish, or test input in transcript.
    
    Checks for:
    - Common test patterns (asdf, qwerty, lorem ipsum)
    - Repeated characters/words
    - Very short meaningless sequences
    - Random character sequences
    
    Args:
        transcript: The text to analyze
        
    Returns:
        dict: {
            "is_nonsense": bool,
            "confidence": 0.0-1.0,
            "patterns_found": list,
            "reason": str
        }
    """
    result = {
        "is_nonsense": False,
        "confidence": 0.0,
        "patterns_found": [],
        "reason": ""
    }
    
    if not transcript or len(transcript.strip()) < 5:
        result["is_nonsense"] = True
        result["confidence"] = 1.0
        result["reason"] = "Input too short"
        return result
    
    transcript_lower = transcript.lower()
    
    # Check for nonsense patterns
    for pattern in NONSENSE_PATTERNS:
        matches = re.findall(pattern, transcript_lower)
        if matches:
            result["patterns_found"].extend(matches[:3])
    
    # Check for excessive repetition
    words = transcript_lower.split()
    if len(words) > 5:
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        # If any single word is > 30% of total, it's repetitive
        max_count = max(word_counts.values())
        if max_count / len(words) > 0.3:
            result["patterns_found"].append(f"word repeated {max_count} times")
    
    # Check for random character sequences
    # Low ratio of dictionary words indicates gibberish
    common_words = {'i', 'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
                    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                    'should', 'can', 'may', 'my', 'your', 'our', 'their', 'this', 'that',
                    'it', 'he', 'she', 'we', 'they', 'you', 'me', 'him', 'her', 'us', 'them',
                    'what', 'when', 'where', 'why', 'how', 'which', 'who', 'whom',
                    'to', 'for', 'with', 'by', 'from', 'at', 'in', 'on', 'of', 'as',
                    'so', 'if', 'then', 'than', 'because', 'while', 'although', 'though',
                    'not', 'no', 'yes', 'just', 'only', 'also', 'very', 'too', 'much',
                    'more', 'most', 'some', 'any', 'all', 'each', 'every', 'both', 'few',
                    'many', 'other', 'another', 'such', 'like', 'even', 'still', 'already',
                    'been', 'being', 'done', 'doing', 'go', 'going', 'get', 'getting',
                    'make', 'making', 'take', 'taking', 'know', 'think', 'see', 'want',
                    'need', 'use', 'find', 'give', 'tell', 'work', 'call', 'try', 'ask',
                    'come', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'help', 'show',
                    'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring',
                    'about', 'into', 'over', 'after', 'before', 'between', 'under', 'again',
                    'there', 'here', 'now', 'always', 'never', 'often', 'sometimes'}
    
    recognized_words = sum(1 for w in words if w in common_words or len(w) > 3)
    recognition_ratio = recognized_words / len(words) if words else 0
    
    if recognition_ratio < 0.3 and len(words) > 10:
        result["patterns_found"].append("low word recognition ratio")
    
    # Calculate confidence
    if result["patterns_found"]:
        result["confidence"] = min(1.0, len(result["patterns_found"]) * 0.3)
        result["is_nonsense"] = result["confidence"] >= 0.5
        result["reason"] = f"Detected patterns: {', '.join(result['patterns_found'][:3])}"
    
    return result


def calculate_answer_coherence(transcript: str) -> float:
    """
    Calculate how coherent/meaningful an answer is.
    
    Uses multiple signals:
    - Sentence structure (has proper sentences)
    - Word diversity (not just repeating)
    - Logical connectors (shows organized thought)
    - Meaningful length
    
    Args:
        transcript: The answer text
        
    Returns:
        float: Coherence score 0-100
    """
    if not transcript or len(transcript.strip()) < 10:
        return 0.0
    
    score = 50.0  # Start at neutral
    
    words = transcript.split()
    word_count = len(words)
    
    # 1. Sentence structure check (+/- 15 points)
    sentences = [s.strip() for s in re.split(r'[.!?]+', transcript) if s.strip()]
    if len(sentences) >= 2:
        score += 15
    elif len(sentences) == 1 and word_count >= 15:
        score += 5
    else:
        score -= 10
    
    # 2. Word diversity check (+/- 15 points)
    unique_words = set(w.lower() for w in words if len(w) > 2)
    diversity_ratio = len(unique_words) / word_count if word_count > 0 else 0
    if diversity_ratio >= 0.6:
        score += 15
    elif diversity_ratio >= 0.4:
        score += 5
    elif diversity_ratio < 0.25:
        score -= 15
    
    # 3. Logical connectors (+/- 10 points)
    connectors = ['because', 'therefore', 'however', 'although', 'while', 'since',
                  'so', 'but', 'and', 'then', 'first', 'second', 'finally']
    transcript_lower = transcript.lower()
    connector_count = sum(1 for c in connectors if c in transcript_lower)
    if connector_count >= 3:
        score += 10
    elif connector_count >= 1:
        score += 5
    
    # 4. Length appropriateness (+/- 10 points)
    if 30 <= word_count <= 200:
        score += 10
    elif word_count < 15:
        score -= 15
    elif word_count > 300:
        score -= 5
    
    return max(0, min(100, score))


def apply_quality_gates(
    transcript: str,
    scores: Dict,
    ideal_answer: str = ""
) -> Dict:
    """
    Apply quality gates to validate answer quality.
    
    This function enforces minimum quality standards and
    applies penalties for poor answers that might otherwise
    get inflated scores.
    
    Args:
        transcript: The answer text
        scores: Dict with current scores (content, delivery, etc.)
        ideal_answer: Reference answer for relevance check
        
    Returns:
        dict: {
            "issues": list of quality issues found,
            "penalties": dict of applied penalties,
            "total_penalty": float,
            "score_cap": int or None if no cap needed
        }
    """
    result = {
        "issues": [],
        "penalties": {},
        "total_penalty": 0.0,
        "score_cap": None
    }
    
    if not transcript:
        result["issues"].append("No answer provided")
        result["score_cap"] = 0
        return result
    
    words = transcript.split()
    word_count = len(words)
    unique_words = set(w.lower() for w in words if len(w) > 2)
    
    # Gate 1: Minimum word count
    min_words = QUALITY_GATES["min_word_count"]["threshold"]
    if word_count < min_words:
        penalty = QUALITY_GATES["min_word_count"]["penalty"]
        result["issues"].append(QUALITY_GATES["min_word_count"]["message"])
        result["penalties"]["short_answer"] = penalty
        result["total_penalty"] += penalty
        
        # Apply strict cap for very short answers
        if word_count < 10:
            result["score_cap"] = SCORE_CAPS["very_short"]
        elif word_count < min_words:
            result["score_cap"] = SCORE_CAPS["short"]
    
    # Gate 2: Minimum unique words (vocabulary)
    min_unique = QUALITY_GATES["min_unique_words"]["threshold"]
    if len(unique_words) < min_unique:
        penalty = QUALITY_GATES["min_unique_words"]["penalty"]
        result["issues"].append(QUALITY_GATES["min_unique_words"]["message"])
        result["penalties"]["low_vocabulary"] = penalty
        result["total_penalty"] += penalty
    
    # Gate 3: Maximum filler ratio
    filler_count = scores.get("filler_count", 0)
    filler_ratio = filler_count / word_count if word_count > 0 else 0
    max_filler = QUALITY_GATES["max_filler_ratio"]["threshold"]
    if filler_ratio > max_filler:
        penalty = QUALITY_GATES["max_filler_ratio"]["penalty"]
        result["issues"].append(QUALITY_GATES["max_filler_ratio"]["message"])
        result["penalties"]["excessive_fillers"] = penalty
        result["total_penalty"] += penalty
    
    # Gate 4: Minimum relevance
    relevance = scores.get("relevance", 0)
    min_relevance = QUALITY_GATES["min_relevance"]["threshold"]
    if relevance < min_relevance and ideal_answer:
        penalty = QUALITY_GATES["min_relevance"]["penalty"]
        result["issues"].append(QUALITY_GATES["min_relevance"]["message"])
        result["penalties"]["off_topic"] = penalty
        result["total_penalty"] += penalty
        result["score_cap"] = min(result["score_cap"] or 100, SCORE_CAPS["off_topic"])
    
    # Gate 5: Repetition check
    if word_count > 10:
        word_counts = {}
        for word in [w.lower() for w in words if len(w) > 3]:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        if word_counts:
            max_repetition = max(word_counts.values()) / len(word_counts)
            max_rep_threshold = QUALITY_GATES["max_repetition"]["threshold"]
            if max_repetition > max_rep_threshold:
                penalty = QUALITY_GATES["max_repetition"]["penalty"]
                result["issues"].append(QUALITY_GATES["max_repetition"]["message"])
                result["penalties"]["repetitive"] = penalty
                result["total_penalty"] += penalty
    
    # Gate 6: Nonsense detection
    nonsense_result = detect_nonsense(transcript)
    if nonsense_result["is_nonsense"]:
        result["issues"].append(f"Answer appears to be nonsense: {nonsense_result['reason']}")
        result["penalties"]["nonsense"] = 50
        result["total_penalty"] += 50
        result["score_cap"] = SCORE_CAPS["nonsense"]
    
    # Gate 7: Coherence check
    coherence = calculate_answer_coherence(transcript)
    if coherence < MIN_COHERENCE_SCORE:
        penalty = 30
        result["issues"].append("Answer lacks coherent structure")
        result["penalties"]["incoherent"] = penalty
        result["total_penalty"] += penalty
    
    # Gate 8: Structure check (no STAR = cap score)
    structure_score = scores.get("structure", 50)
    if structure_score < 30:
        if result["score_cap"] is None or result["score_cap"] > SCORE_CAPS["no_structure"]:
            result["score_cap"] = SCORE_CAPS["no_structure"]
    
    logger.debug(f"Quality gates applied: {len(result['issues'])} issues, total_penalty={result['total_penalty']}, cap={result['score_cap']}")
    
    return result


def _clamp_score(score: float) -> float:
    """Clamp score to valid range and round."""
    return round(max(MIN_SCORE, min(MAX_SCORE, score)), 1)


# ===========================================
# Resume Scoring
# ===========================================

def score_resume(resume_text: str, jd_text: str) -> Dict:
    """
    Calculate a relevance score for a resume against a job description.
    
    Uses semantic similarity to measure how well the resume
    matches the job description requirements.
    
    Args:
        resume_text: Extracted text from the resume
        jd_text: The job description text
    
    Returns:
        dict: Resume scoring results:
            {
                "overall_score": 0-100,
                "similarity": 0.0-1.0,
                "assessment": str
            }
    
    Example:
        >>> score = score_resume(resume_text, job_description)
        >>> print(f"Match score: {score['overall_score']}")
    """
    if not resume_text or not jd_text:
        return {
            "overall_score": 0.0,
            "similarity": 0.0,
            "assessment": "Unable to analyze - missing text"
        }
    
    # Calculate semantic similarity
    similarity = semantic_similarity(resume_text, jd_text)
    
    # Convert to 0-100 score with adjusted scaling
    # Resumes typically should have 0.4-0.7 similarity with JD
    overall_score = min(100, similarity * 120)  # Slightly generous scaling
    
    # Determine assessment
    if overall_score >= 80:
        assessment = "Excellent match - resume aligns very well with the job description"
    elif overall_score >= 65:
        assessment = "Good match - resume covers most key requirements"
    elif overall_score >= 50:
        assessment = "Moderate match - consider highlighting more relevant experience"
    else:
        assessment = "Limited match - consider tailoring resume to this role"
    
    return {
        "overall_score": round(overall_score, 1),
        "similarity": round(similarity, 3),
        "assessment": assessment
    }


# ===========================================
# Utility Functions
# ===========================================

def extract_keywords(text: str, top_n: int = 20) -> List[str]:
    """
    Extract key terms from text for matching.
    
    Simple keyword extraction based on word frequency,
    filtering out common stop words.
    
    Args:
        text: Text to extract keywords from
        top_n: Number of top keywords to return
    
    Returns:
        List[str]: List of extracted keywords
    """
    # Common English stop words to filter out
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
        'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are',
        'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'may', 'might', 'must',
        'that', 'which', 'who', 'whom', 'this', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'when',
        'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
        'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only',
        'own', 'same', 'so', 'than', 'too', 'very', 'can', 'just'
    }
    
    # Tokenize and clean
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    
    # Filter stop words and count
    word_counts = {}
    for word in words:
        if word not in stop_words:
            word_counts[word] = word_counts.get(word, 0) + 1
    
    # Sort by frequency
    sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    
    return [word for word, count in sorted_words[:top_n]]


# ===========================================
# Enhanced Content Scoring (Keyword + Semantic)
# ===========================================

def analyze_content_keywords(transcript: str, ideal_answer: str) -> Dict:
    """
    Analyze content by extracting and matching keywords from ideal answer.
    
    This function:
    1. Extracts important keywords from the ideal answer
    2. Matches those keywords in the transcript
    3. Calculates keyword coverage percentage
    4. Identifies missing key concepts
    
    Args:
        transcript: The user's answer text
        ideal_answer: The reference ideal answer
    
    Returns:
        dict: {
            "keywords_extracted": list,  # From ideal answer
            "keywords_found": list,       # Matched in transcript
            "keywords_missing": list,     # Not found in transcript
            "keyword_coverage": float,    # 0.0-1.0
            "score": 0-100,
            "assessment": str
        }
    """
    result = {
        "keywords_extracted": [],
        "keywords_found": [],
        "keywords_missing": [],
        "keyword_coverage": 0.0,
        "score": 0.0,
        "assessment": "insufficient text"
    }
    
    if not transcript or not ideal_answer:
        return result
    
    # Extract important keywords from the ideal answer
    ideal_keywords = extract_keywords(ideal_answer, top_n=15)
    result["keywords_extracted"] = ideal_keywords
    
    if not ideal_keywords:
        result["assessment"] = "Could not extract keywords from ideal answer"
        return result
    
    # Match keywords in transcript
    keywords_found, keywords_missing = match_keywords(transcript, ideal_keywords)
    
    result["keywords_found"] = keywords_found
    result["keywords_missing"] = keywords_missing
    
    # Calculate keyword coverage
    coverage = len(keywords_found) / len(ideal_keywords) if ideal_keywords else 0.0
    result["keyword_coverage"] = round(coverage, 3)
    
    # Convert to score (0-100)
    if coverage >= 0.8:
        score = 85 + (coverage - 0.8) * 75  # 85-100
        result["assessment"] = "Excellent topic coverage - covered most key concepts"
    elif coverage >= 0.6:
        score = 70 + (coverage - 0.6) * 75  # 70-85
        result["assessment"] = "Good topic coverage - mentioned important keywords"
    elif coverage >= 0.4:
        score = 50 + (coverage - 0.4) * 100  # 50-70
        result["assessment"] = f"Moderate coverage - consider mentioning: {', '.join(keywords_missing[:3])}"
    elif coverage >= 0.2:
        score = 30 + (coverage - 0.2) * 100  # 30-50
        result["assessment"] = f"Limited coverage - missing key topics: {', '.join(keywords_missing[:4])}"
    else:
        score = coverage * 150  # 0-30
        result["assessment"] = "Answer doesn't cover the expected topics"
    
    result["score"] = round(min(100, max(0, score)), 1)
    return result


def calculate_enhanced_content_score(transcript: str, ideal_answer: str) -> Dict:
    """
    Calculate comprehensive content score using hybrid approach.
    
    Combines:
    1. Keyword matching (50%) - Exact words from ideal answer
    2. Semantic similarity (50%) - Overall meaning alignment
    
    This hybrid approach ensures:
    - Specific topic keywords are mentioned
    - Overall meaning aligns with expected answer
    
    Args:
        transcript: The user's answer
        ideal_answer: The reference ideal answer
    
    Returns:
        dict: {
            "final_score": 0-100,
            "keyword_analysis": {...},
            "semantic_similarity": 0.0-1.0,
            "keyword_weight": float,
            "semantic_weight": float,
            "feedback": [list of tips],
            "topics_covered": [matched keywords],
            "topics_missing": [keywords to add]
        }
    """
    result = {
        "final_score": 0.0,
        "keyword_analysis": {},
        "semantic_similarity": 0.0,
        "keyword_weight": 0.5,
        "semantic_weight": 0.5,
        "feedback": [],
        "topics_covered": [],
        "topics_missing": []
    }
    
    if not transcript or len(transcript.strip()) < 10:
        result["feedback"] = ["Provide a more detailed answer"]
        return result
    
    # 1. Keyword Analysis (50%)
    keyword_analysis = analyze_content_keywords(transcript, ideal_answer)
    result["keyword_analysis"] = keyword_analysis
    result["topics_covered"] = keyword_analysis["keywords_found"]
    result["topics_missing"] = keyword_analysis["keywords_missing"]
    
    # 2. Semantic Similarity (50%)
    semantic_sim = semantic_similarity(transcript, ideal_answer)
    result["semantic_similarity"] = round(semantic_sim, 3)
    semantic_score = min(100, semantic_sim * 110)  # Slight boost for good similarity
    
    # 3. Combine scores with weights
    keyword_score = keyword_analysis["score"]
    
    # Adjust weights based on answer length
    word_count = len(transcript.split())
    if word_count < 30:
        # Short answers: weight keywords more (user must hit key points)
        result["keyword_weight"] = 0.6
        result["semantic_weight"] = 0.4
    elif word_count > 100:
        # Long answers: weight semantic more (overall meaning matters)
        result["keyword_weight"] = 0.4
        result["semantic_weight"] = 0.6
    
    final_score = (
        keyword_score * result["keyword_weight"] +
        semantic_score * result["semantic_weight"]
    )
    
    result["final_score"] = round(min(100, max(0, final_score)), 1)
    
    # Generate feedback
    if keyword_analysis["keyword_coverage"] < 0.5:
        result["feedback"].append(f"Try to mention these key topics: {', '.join(result['topics_missing'][:3])}")
    if semantic_sim < 0.5:
        result["feedback"].append("Your answer's overall meaning diverges from the expected response")
    if result["final_score"] >= 75:
        result["feedback"].append("Good job covering the topic!")
    
    return result


# ===========================================
# Keyword-Based Answer Scoring (0-10 Scale)
# ===========================================

def match_keywords(transcript: str, keywords: List[str]) -> Tuple[List[str], List[str]]:
    """
    Match transcript words against a list of ideal keywords.
    
    Uses case-insensitive matching and checks for word stems.
    
    Args:
        transcript: The transcribed answer text
        keywords: List of ideal keywords to match
    
    Returns:
        Tuple[List[str], List[str]]: (keywords_found, keywords_missing)
    """
    if not transcript or not keywords:
        return [], keywords if keywords else []
    
    # Normalize transcript to lowercase words
    transcript_lower = transcript.lower()
    transcript_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', transcript_lower))
    
    keywords_found = []
    keywords_missing = []
    
    for keyword in keywords:
        keyword_lower = keyword.lower()
        
        # Check for exact match
        if keyword_lower in transcript_words:
            keywords_found.append(keyword)
            continue
        
        # Check for stem match (keyword is contained in a transcript word or vice versa)
        stem_found = False
        for word in transcript_words:
            # Check if keyword stem (4+ chars) is in word or word is in keyword
            if len(keyword_lower) >= 4 and keyword_lower[:4] in word:
                stem_found = True
                break
            if len(word) >= 4 and word[:4] in keyword_lower:
                stem_found = True
                break
        
        if stem_found:
            keywords_found.append(keyword)
        else:
            keywords_missing.append(keyword)
    
    return keywords_found, keywords_missing


def score_answer_by_keywords(
    transcript: str,
    keywords: List[str],
    duration_seconds: float,
    ideal_answer: Optional[str] = None
) -> Dict:
    """
    Score an answer based on keyword matching, on 0-100 scale.
    
    This function:
    1. Matches transcript words against ideal keywords
    2. Calculates content score based on keyword match percentage
    3. Analyzes delivery (WPM, filler words)
    4. Checks grammar from transcribed text
    5. Returns all scores on a 0-100 scale
    
    Args:
        transcript: The transcribed answer text
        keywords: List of ideal keywords the answer should contain
        duration_seconds: Duration of the audio recording
        ideal_answer: Optional ideal answer for additional context
    
    Returns:
        dict: Comprehensive scoring results (0-100 scale):
            {
                "content": 0-100,
                "delivery": 0-100,
                "communication": 0-100,
                "final": 0-100,
                "wpm": float,
                "filler_count": int,
                "grammar_errors": int,
                "relevance": 0.0-1.0,
                "keywords_found": [...],
                "keywords_missing": [...],
                "keyword_match_pct": 0-100,
                "filler_details": [...],
                "grammar_details": [...],
                "wpm_feedback": str
            }
    """
    # Initialize result with 0-100 scale scores
    result = {
        "content": 0.0,
        "delivery": 0.0,
        "communication": 0.0,
        "final": 0.0,
        "wpm": 0.0,
        "filler_count": 0,
        "grammar_errors": 0,
        "relevance": 0.0,
        "keywords_found": [],
        "keywords_missing": [],
        "keyword_match_pct": 0.0,
        "filler_details": [],
        "grammar_details": [],
        "wpm_feedback": ""
    }
    
    if not transcript or len(transcript.strip()) < 5:
        return result
    
    # ==================
    # 1. CONTENT SCORE (Keyword Matching) - 0-100 scale
    # ==================
    if keywords and len(keywords) > 0:
        keywords_found, keywords_missing = match_keywords(transcript, keywords)
        result["keywords_found"] = keywords_found
        result["keywords_missing"] = keywords_missing
        
        # Calculate match percentage (this IS the content score 0-100)
        match_pct = (len(keywords_found) / len(keywords)) * 100
        result["keyword_match_pct"] = round(match_pct, 1)
        result["content"] = round(min(100.0, max(0.0, match_pct)), 1)
        result["relevance"] = round(len(keywords_found) / len(keywords), 3)
    else:
        # Fallback: use semantic similarity if no keywords provided
        if ideal_answer:
            relevance = semantic_similarity(transcript, ideal_answer)
            result["relevance"] = round(relevance, 3)
            result["content"] = round(relevance * 100, 1)
        else:
            result["content"] = 50.0  # Default middle score
    
    # ==================
    # 2. DELIVERY SCORE (WPM + Fillers) - 0-100 scale
    # ==================
    # Start with perfect delivery score (100)
    delivery_score = 100.0
    
    # Calculate WPM and apply penalties
    wpm = compute_wpm(transcript, duration_seconds)
    result["wpm"] = wpm
    wpm_feedback, wpm_penalty = get_wpm_assessment(wpm)
    result["wpm_feedback"] = wpm_feedback
    
    # Apply WPM penalty directly (already 0-30 scale)
    delivery_score -= wpm_penalty
    
    # Count fillers and apply penalties
    filler_count, filler_details = count_fillers(transcript)
    result["filler_count"] = filler_count
    result["filler_details"] = filler_details
    
    # Filler penalty (max 20 points off for fillers)
    filler_penalty = min(20.0, filler_count * 3)
    delivery_score -= filler_penalty
    
    result["delivery"] = round(max(0.0, min(100.0, delivery_score)), 1)
    
    # ==================
    # 3. COMMUNICATION SCORE (Enhanced Multi-Factor) - 0-100 scale
    # ==================
    # Use enhanced communication scoring with 5 factors
    comm_analysis = calculate_enhanced_communication_score(transcript)
    
    result["communication"] = round(max(0.0, min(100.0, comm_analysis["final_score"])), 1)
    result["grammar_errors"] = comm_analysis["factors"].get("grammar", {}).get("errors", 0)
    result["grammar_details"] = comm_analysis["factors"].get("grammar", {}).get("details", [])
    
    # Add enhanced communication details
    result["communication_analysis"] = {
        "factors": comm_analysis["factors"],
        "feedback": comm_analysis["feedback"],
        "strengths": comm_analysis["strengths"]
    }
    
    # ==================
    # 4. FINAL SCORE (Weighted Average) - 0-100 scale
    # ==================
    # Using same weights: content=0.6, delivery=0.2, communication=0.2
    final_score = (
        result["content"] * SCORE_WEIGHTS["content"] +
        result["delivery"] * SCORE_WEIGHTS["delivery"] +
        result["communication"] * SCORE_WEIGHTS["communication"]
    )
    
    result["final"] = round(max(0.0, min(100.0, final_score)), 1)
    
    return result


def get_keyword_feedback(result: Dict) -> List[str]:
    """
    Generate feedback tips based on keyword scoring results.
    
    Args:
        result: Results from score_answer_by_keywords()
    
    Returns:
        list: Feedback tips for improving the answer
    """
    tips = []
    
    # Content feedback
    if result.get("keyword_match_pct", 0) < 50:
        missing = result.get("keywords_missing", [])
        if missing:
            tips.append(f"Try to include key concepts: {', '.join(missing[:5])}")
        tips.append("Your answer is missing several important keywords from the ideal response")
    elif result.get("keyword_match_pct", 0) < 75:
        tips.append("Good coverage of key points, but consider adding more specific details")
    
    # Delivery feedback
    if result.get("filler_count", 0) > 3:
        tips.append(f"Reduce filler words ({result['filler_count']} detected) - try pausing instead")
    
    wpm = result.get("wpm", 0)
    if wpm > 0 and wpm < 100:
        tips.append("Speak a bit faster to maintain engagement (aim for 130-160 WPM)")
    elif wpm > 180:
        tips.append("Slow down slightly for better clarity (aim for 130-160 WPM)")
    
    # Grammar feedback
    if result.get("grammar_errors", 0) > 2:
        tips.append("Focus on sentence structure and grammar for clearer communication")
    
    return tips
