"""
AI Interview Assistant - Question Service

Unified service for all question operations:
- Fetch questions from Supabase database
- Intelligent question selection (uses IntelligentQuestionEngine)
- Admin operations (add/upload questions)
- JD analysis

All questions are stored in the 'questions' table in Supabase.

Author: AI Interview Assistant Team
"""

import re
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from app.models.supabase_client import get_supabase
from app.logging_config import get_logger
from app.services.ml_engine import detect_nonsense

logger = get_logger(__name__)


# ===========================================
# Constants
# ===========================================

CATEGORIES = ["general", "behavioral", "technical", "management", "situational"]

DOMAIN_KEYWORDS = {
    "software_engineering": [
        "software", "developer", "engineer", "programming", "code", "python", "java",
        "javascript", "react", "node", "backend", "frontend", "fullstack", "api",
        "database", "sql", "cloud", "aws", "azure", "devops", "agile", "scrum"
    ],
    "finance": [
        "finance", "banking", "investment", "analyst", "trading", "accounting",
        "portfolio", "equity", "derivatives", "risk", "valuation", "dcf", "m&a"
    ],
    "management": [
        "manager", "director", "lead", "head", "vp", "chief", "leadership",
        "team", "strategy", "budget", "stakeholder", "executive", "operations"
    ],
    "sales": [
        "sales", "account", "business development", "revenue", "quota", "pipeline",
        "crm", "salesforce", "client", "customer", "b2b", "b2c", "closing"
    ],
    "teaching": [
        "teacher", "professor", "instructor", "education", "curriculum", "classroom",
        "student", "lesson", "pedagogy", "assessment", "learning"
    ]
}


# ===========================================
# Data Classes
# ===========================================

@dataclass
class Question:
    """Represents a single interview question."""
    id: int
    question: str
    ideal_answer: str
    keywords: List[str] = field(default_factory=list)
    category: str = "general"
    domain: str = "general"
    difficulty: str = "medium"
    time_limit_seconds: int = 120
    is_custom: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "question": self.question,
            "ideal_answer": self.ideal_answer,
            "keywords": self.keywords,
            "category": self.category,
            "domain": self.domain,
            "difficulty": self.difficulty,
            "time_limit_seconds": self.time_limit_seconds,
            "is_custom": self.is_custom
        }
    
    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "Question":
        return cls(
            id=row.get("id", 0),
            question=row.get("question", ""),
            ideal_answer=row.get("ideal_answer", ""),
            keywords=row.get("keywords", []) or [],
            category=row.get("category", "general"),
            domain=row.get("domain", "general"),
            difficulty=row.get("difficulty", "medium"),
            time_limit_seconds=row.get("time_limit_seconds", 120),
            is_custom=row.get("is_custom", False)
        )


@dataclass
class JDAnalysis:
    """Analysis of a job description."""
    keywords: List[str]
    skills: List[str]
    domain: str
    seniority: str
    is_management: bool
    is_valid: bool = True
    validation_reason: str = ""


# ===========================================
# Database Operations
# ===========================================

async def get_all_questions(
    domain: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 100
) -> List[Question]:
    """
    Fetch questions from database with optional filters.
    """
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
        
        questions = [Question.from_db_row(row) for row in result.data]
        logger.info(f"Fetched {len(questions)} questions from database")
        return questions
        
    except Exception as e:
        logger.error(f"Failed to fetch questions: {e}")
        return []


def get_question_by_id(question_id: int) -> Optional[Question]:
    """Get a single question by ID."""
    try:
        supabase = get_supabase()
        result = supabase.table("questions")\
            .select("*")\
            .eq("id", question_id)\
            .single()\
            .execute()
        
        if result.data:
            return Question.from_db_row(result.data)
        return None
        
    except Exception as e:
        logger.error(f"Failed to fetch question {question_id}: {e}")
        return None


def add_question_to_pool(
    question: str,
    ideal_answer: str,
    keywords: List[str],
    category: str = "behavioral",
    domain: str = "general",
    difficulty: str = "medium",
    uploaded_by: Optional[str] = None,
    is_custom: bool = True
) -> Optional[int]:
    """
    Add a new question to the database pool.
    Custom questions have is_custom=True and go to pool (NOT asked immediately).
    """
    try:
        supabase = get_supabase()
        
        data = {
            "question": question.strip(),
            "ideal_answer": ideal_answer.strip(),
            "keywords": keywords,
            "category": category.lower(),
            "domain": domain.lower(),
            "difficulty": difficulty.lower(),
            "is_custom": is_custom,
            "uploaded_by": uploaded_by,
            "is_active": True
        }
        
        result = supabase.table("questions").insert(data).execute()
        
        if result.data:
            question_id = result.data[0].get("id")
            logger.info(f"Added question to pool: ID={question_id}")
            return question_id
        return None
        
    except Exception as e:
        logger.error(f"Failed to add question: {e}")
        return None


def add_questions_bulk(questions: List[Dict[str, Any]], uploaded_by: Optional[str] = None) -> int:
    """Add multiple questions to the pool at once."""
    try:
        supabase = get_supabase()
        
        data = []
        for q in questions:
            data.append({
                "question": q.get("question", "").strip(),
                "ideal_answer": q.get("ideal_answer", "").strip(),
                "keywords": q.get("keywords", []),
                "category": q.get("category", "behavioral").lower(),
                "domain": q.get("domain", "general").lower(),
                "difficulty": q.get("difficulty", "medium").lower(),
                "is_custom": True,
                "uploaded_by": uploaded_by,
                "is_active": True
            })
        
        result = supabase.table("questions").insert(data).execute()
        
        count = len(result.data) if result.data else 0
        logger.info(f"Bulk added {count} questions to pool")
        return count
        
    except Exception as e:
        logger.error(f"Failed to bulk add questions: {e}")
        return 0


# ===========================================
# Intelligent Question Selection
# ===========================================

async def get_questions_for_interview(
    user_id: Optional[str] = None,
    domain: str = "general",
    job_description: Optional[str] = None,
    num_questions: int = 5,
    difficulty: str = "medium"
) -> List[Question]:
    """
    Get intelligently selected questions for an interview session.
    Uses IntelligentQuestionEngine for personalized selection.
    """
    try:
        if user_id:
            from app.services.intelligent_question_engine import IntelligentQuestionEngine
            
            engine = IntelligentQuestionEngine()
            selected = await engine.select_questions_intelligently(
                user_id=user_id,
                domain=domain,
                job_description=job_description,
                num_questions=num_questions,
                difficulty=difficulty
            )
            
            if selected:
                return [Question.from_db_row(q) for q in selected]
        
        # Fallback: Basic database fetch with variety
        questions = get_all_questions(domain=domain, limit=50)
        
        # Mix categories for variety
        by_category = {}
        for q in questions:
            if q.category not in by_category:
                by_category[q.category] = []
            by_category[q.category].append(q)
        
        selected = []
        categories = list(by_category.keys())
        idx = 0
        while len(selected) < num_questions and any(by_category.values()):
            cat = categories[idx % len(categories)] if categories else None
            if cat and by_category.get(cat):
                selected.append(by_category[cat].pop(0))
            idx += 1
            if idx > 100:
                break
        
        return selected[:num_questions]
        
    except Exception as e:
        logger.error(f"Failed to get interview questions: {e}")
        return get_all_questions(domain=domain, limit=num_questions)


# ===========================================
# JD Analysis
# ===========================================

def analyze_job_description(jd_text: str) -> JDAnalysis:
    """Analyze a job description to extract keywords, domain, and seniority."""
    if not jd_text:
        return JDAnalysis(
            keywords=[], skills=[], domain="general",
            seniority="mid", is_management=False
        )
    
    jd_lower = jd_text.lower()
    
    # Extract keywords
    words = re.findall(r'\b[a-z]{4,}\b', jd_lower)
    word_freq = {}
    stop_words = {'with', 'that', 'this', 'have', 'from', 'they', 'will', 'would', 'could', 
                  'should', 'being', 'been', 'were', 'what', 'when', 'where', 'which', 'while',
                  'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below'}
    
    for word in words:
        if word not in stop_words:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    keywords = sorted(word_freq.keys(), key=lambda x: word_freq[x], reverse=True)[:20]
    
    # Detect domain
    domain = "general"
    max_score = 0
    for d, d_keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in d_keywords if kw in jd_lower)
        if score > max_score:
            max_score = score
            domain = d
    
    # Detect seniority
    seniority = "mid"
    if any(w in jd_lower for w in ["senior", "lead", "principal", "staff"]):
        seniority = "senior"
    elif any(w in jd_lower for w in ["director", "head", "vp", "chief"]):
        seniority = "lead"
    elif any(w in jd_lower for w in ["junior", "entry", "associate", "graduate"]):
        seniority = "junior"
    
    # Detect management role
    is_management = any(w in jd_lower for w in [
        "manager", "management", "lead team", "direct reports", "supervise"
    ])
    
    # Extract skills
    skill_patterns = [
        r'\b(python|java|javascript|typescript|react|node|sql|aws|azure|docker|kubernetes)\b',
        r'\b(excel|powerpoint|tableau|sql|sas)\b'
    ]
    skills = []
    for pattern in skill_patterns:
        skills.extend(re.findall(pattern, jd_lower))
    skills = list(set(skills))[:10]
    
    # Validate JD content
    validation = detect_nonsense(jd_text)
    is_valid = not validation.get("is_nonsense", False)
    validation_reason = validation.get("reason", "")

    # Additional check: JD specific heuristics
    if is_valid:
         # Check if it has at least some keywords or skills
         if not keywords and not skills:
             is_valid = False
             validation_reason = "No relevant keywords or skills found - likely not a job description"
         
         # Check length
         if len(jd_text.split()) < 10:
             is_valid = False
             validation_reason = "Job description is too short"

    return JDAnalysis(
        keywords=keywords,
        skills=skills,
        domain=domain,
        seniority=seniority,
        is_management=is_management,
        is_valid=is_valid,
        validation_reason=validation_reason
    )


# ===========================================
# CSV/JSON Parsing for Bulk Upload
# ===========================================

def parse_questions_from_json(json_content: str) -> List[Question]:
    """Parse and validate questions from JSON upload."""
    import json
    
    try:
        json_data = json.loads(json_content)
        # Handle both list and dict with 'questions' key
        if isinstance(json_data, dict):
            json_data = json_data.get("questions", [])
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format: {e}")
    
    questions = []
    
    for i, item in enumerate(json_data):
        if not item.get("question"):
            continue
        
        questions.append(Question(
            id=item.get("id", i + 1),
            question=str(item.get("question", "")).strip(),
            ideal_answer=str(item.get("ideal_answer", "")).strip(),
            keywords=item.get("keywords", []) if isinstance(item.get("keywords"), list) else [],
            category=str(item.get("category", "behavioral")).lower(),
            domain=str(item.get("domain", "general")).lower(),
            difficulty=str(item.get("difficulty", "medium")).lower(),
            time_limit_seconds=item.get("time_limit_seconds", 120),
            is_custom=True
        ))
    
    return questions


def parse_questions_from_csv(csv_content: str) -> List[Question]:
    """Parse questions from CSV content."""
    import csv
    from io import StringIO
    
    questions = []
    reader = csv.DictReader(StringIO(csv_content))
    
    for i, row in enumerate(reader):
        if not row.get("question"):
            continue
        
        keywords_str = row.get("keywords", "")
        keywords = [k.strip() for k in keywords_str.split(";") if k.strip()]
        
        questions.append(Question(
            id=int(row.get("id", i + 1)) if row.get("id", "").isdigit() else i + 1,
            question=row.get("question", "").strip(),
            ideal_answer=row.get("ideal_answer", "").strip(),
            keywords=keywords,
            category=row.get("category", "behavioral").lower(),
            domain=row.get("domain", "general").lower(),
            difficulty=row.get("difficulty", "medium").lower(),
            time_limit_seconds=int(row.get("time_limit_seconds", 120)) if row.get("time_limit_seconds", "").isdigit() else 120,
            is_custom=True
        ))
    
    return questions


# ===========================================
# Stats
# ===========================================

def get_question_stats() -> Dict[str, Any]:
    """Get statistics about the question pool."""
    try:
        supabase = get_supabase()
        
        result = supabase.table("questions")\
            .select("category, domain, difficulty, is_custom")\
            .eq("is_active", True)\
            .execute()
        
        questions = result.data or []
        
        by_category = {}
        by_domain = {}
        by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
        custom_count = 0
        
        for q in questions:
            cat = q.get("category", "general")
            dom = q.get("domain", "general")
            diff = q.get("difficulty", "medium")
            
            by_category[cat] = by_category.get(cat, 0) + 1
            by_domain[dom] = by_domain.get(dom, 0) + 1
            by_difficulty[diff] = by_difficulty.get(diff, 0) + 1
            
            if q.get("is_custom"):
                custom_count += 1
        
        return {
            "total": len(questions),
            "custom": custom_count,
            "by_category": by_category,
            "by_domain": by_domain,
            "by_difficulty": by_difficulty
        }
        
    except Exception as e:
        logger.error(f"Failed to get question stats: {e}")
        return {"total": 0, "error": str(e)}
