"""
AI Interview Feedback MVP - LLM Bridge

This module handles all LLM (Large Language Model) integrations:
- Google Gemini models (primary, free tier available)
- OpenAI GPT models
- Hugging Face models
- Structured prompt generation
- Feedback response parsing

Author: Member 3 (Frontend + LLM Prompts)

Key Functions:
    - generate_answer_feedback(): Get feedback on interview answers
    - generate_resume_feedback(): Get feedback on resume-JD match
"""

import json
from typing import Dict, Any, List, Optional

from app.config import settings


# ===========================================
# Prompt Templates
# ===========================================

ANSWER_FEEDBACK_PROMPT = """You are an expert interview coach providing HIGHLY SPECIFIC and COMPREHENSIVE feedback on a candidate's interview answer.

IMPORTANT: Your feedback must quote EXACT words and sentences from the candidate's answer. Generic feedback is NOT acceptable.

## Interview Question
{question}

## Candidate's EXACT Answer (Transcribed)
"{transcript}"

## Ideal Answer Reference
{ideal_answer}

## Job Description Context
{job_context}

## ML-Calculated Scores (6-Score System)
- Content Relevance: {content_score}/100 (How well they addressed the question)
- Delivery: {delivery_score}/100 (Speaking pace: {wpm} WPM, Filler words used: {filler_count})
- Communication: {communication_score}/100 (Grammar issues found: {grammar_errors})
- Voice Quality: {voice_score}/100 (Pitch variation, energy, pauses)
- Confidence: {confidence_score}/100 (Composure and assertiveness)
- Structure: {structure_score}/100 (STAR method and organization)
- Overall Score: {final_score}/100
- Semantic Match to Ideal: {relevance:.0%}

## Your Task - BE EXTREMELY SPECIFIC AND COMPREHENSIVE!
Provide a detailed analysis covering:
1. **What they actually did** - Retrospective analysis of their performance
2. **Specific quotes** - Reference exact phrases they said
3. **STAR Method breakdown** - Complete analysis of structure
4. **Sentence-by-sentence improvements** - Pick 2-3 weak sentences and rewrite them
5. **Detailed improvement roadmap** - Actionable steps they can take
6. **Missing keywords and concepts** - What key terms they should have used
7. **What worked vs what didn't** - Compare strong moments to weak moments

Respond in JSON format ONLY:
{{
    "summary": "Comprehensive 3-4 sentence assessment. Start with 'In your answer, you [describe what they did].' Then analyze effectiveness. Quote specific phrases. Example: 'You opened with \\"[exact quote]\\" which was effective/ineffective because...'",
    
    "what_you_did": {{
        "opening": "How they started: Quote their first 1-2 sentences and analyze the approach",
        "main_content": "What they covered in the middle: List the 3-4 main points they made with brief quotes",
        "closing": "How they concluded: Quote their ending and assess its impact",
        "overall_approach": "Overall strategy analysis: Was it chronological, problem-solution, STAR, scattered, etc?"
    }},
    
    "strengths": [
        "Specific strength with EXACT QUOTE: 'When you said \\"[exact quote from transcript]\\", this demonstrated [specific skill/quality]'",
        "Another strength with quote and explanation of why it worked",
        "Third strength - be specific about what made this effective"
    ],
    
    "weaknesses": [
        "Specific weakness with EXACT QUOTE: 'The phrase \\"[exact quote]\\\" weakened your answer because [specific reason]'",
        "Another weakness with quote and explanation of the problem",
        "Third weakness with specific impact on overall impression"
    ],
    
    "improvements": [
        "Detailed improvement #1: Instead of [what they said], they should [specific action] to [specific benefit]",
        "Detailed improvement #2: Add [specific content/structure] to strengthen [specific aspect]",
        "Detailed improvement #3: Remove/reduce [specific behavior] and replace with [specific alternative]",
        "Detailed improvement #4: Incorporate [specific missing element] to better address [specific requirement]"
    ],
    
    "star_analysis": {{
        "situation": "Yes/No/Partial - Quote EXACTLY what they said for context or state 'Missing - did not establish situation.' If partial, explain what was included and what was missing.",
        "task": "Yes/No/Partial - Quote their EXACT words describing their role/responsibility or state 'Missing - did not clarify their specific task.' If partial, explain.",
        "action": "Yes/No/Partial - Quote SPECIFIC actions they mentioned or state 'Missing/Vague - did not detail specific actions taken.' List what was vague.",
        "result": "Yes/No/Partial - Quote EXACT metrics/outcomes mentioned or state 'Missing - did not quantify results.' Explain what metrics would strengthen this."
    }},
    
    "sentence_feedback": [
        {{
            "original": "EXACT sentence #1 from their transcript that needs improvement",
            "improved": "Professional rewrite with specific enhancements (stronger verbs, metrics, clearer structure)",
            "reason": "Detailed explanation: This improves [specific aspect] by [specific change]. For example, [specific benefit].",
            "impact": "How this change affects their overall answer impression"
        }},
        {{
            "original": "EXACT sentence #2 from transcript",
            "improved": "Professional rewrite",
            "reason": "Detailed explanation of improvements made",
            "impact": "Impact of this change"
        }},
        {{
            "original": "EXACT sentence #3 from transcript",
            "improved": "Professional rewrite",
            "reason": "Detailed explanation",
            "impact": "Impact of this change"
        }}
    ],
    
    "comparison": {{
        "what_worked": [
            "Specific moment that was strong: Quote exact phrase and explain why it was effective",
            "Another effective moment with quote and analysis"
        ],
        "what_didnt_work": [
            "Specific moment that was weak: Quote exact phrase and explain the problem",
            "Another weak moment with quote and analysis of what went wrong"
        ]
    }},
    
    "keyword_analysis": "COMPREHENSIVE analysis: You successfully mentioned [list 3-5 keywords they used]. However, you completely missed critical terms like [list 5-7 specific missing keywords]. To strengthen your answer, you should have incorporated: [3-4 specific terms with brief context of where they would fit]. Industry-specific terms you should use: [2-3 technical terms].",
    
    "improvement_roadmap": [
        "[Specific action] - Start by [concrete example]. Practice [specific exercise].",
        "[Specific action] - Next, focus on [concrete example]. This will help with [specific benefit].",
        "[Specific action] - Then, work on [concrete example]. Measure progress by [specific metric].",
        "[Specific action] - Finally, refine [concrete example]. The goal is to [specific outcome]."
    ],
    
    "tips": [
        "Specific tip: Instead of saying '[exact phrase they used]', try '[stronger alternative with context]' because [specific reason]",
        "Actionable tip: Add [specific element] to your answers. For this question, you could have said '[example phrase]'",
        "Practice tip: Next time, use [specific technique]. For example: '[concrete example sentence]'",
        "Delivery tip: [Specific behavioral adjustment]. This will make you sound [specific quality improvement]"
    ],
    
    "example_answer": "A complete 6-8 sentence STAR-format answer to this EXACT question, demonstrating: clear situation setup (1-2 sentences), specific task description (1 sentence), detailed actions with strong verbs and metrics (2-3 sentences), and quantified results (1-2 sentences). Use professional language, industry terms, and concrete numbers throughout."
}}
"""



RESUME_FEEDBACK_PROMPT = """You are an expert career coach reviewing a resume against a job description.

## Resume Content
{resume_text}

## Job Description
{jd_text}

## ML Analysis Results
- Skill Match Percentage: {skill_match_pct}%
- Matched Skills: {matched_skills}
- Missing Skills: {missing_skills}
- Semantic Similarity: {similarity_score:.0%}

## Your Task
Analyze the resume content strictly. First, check if this is a valid resume. If it is gibberish, too short, or unrelated to a professional profile, mark it as invalid.

Then, provide actionable feedback to help the candidate improve their resume for this specific role.

Respond in the following JSON format ONLY (no additional text):
{{
    "validity_score": 0-100 (Score < 50 means likely fake/invalid),
    "is_valid_resume": boolean,
    "summary": "2-3 sentence executive summary of the candidate's fit",
    "strengths": ["Specific strong point 1", "Specific strong point 2"],
    "gaps": ["Critical missing skill or experience 1", "Weakness 2"],
    "tips": [
        "Actionable tip 1",
        "Actionable tip 2",
        "Actionable tip 3"
    ],
    "priority_skills": ["Top skill to acquire 1", "Top skill to acquire 2"],
    "experience_feedback": "Specific feedback on their work experience section (e.g., 'Use more metrics', 'Clarify role')",
    "formatting_feedback": "Feedback on structure/clarity (inferred from content flow)"
}}
"""


# ===========================================
# Main Feedback Generation Functions
# ===========================================

def generate_answer_feedback(
    question: str,
    transcript: str,
    ideal_answer: str,
    ml_scores: Dict[str, Any],
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate LLM feedback for an interview answer.
    
    Takes the transcript and ML scores, sends to LLM for
    human-readable feedback with tips and example.
    
    Args:
        question: The interview question
        transcript: Transcribed answer text
        ideal_answer: Reference ideal answer
        ml_scores: Dictionary with content, delivery, communication scores
        job_description: Optional job description for contextual feedback
    
    Returns:
        dict: Feedback including:
            - summary: Overall assessment
            - strengths: List of positives
            - improvements: Areas to work on
            - tips: Actionable advice
            - example_answer: Improved version
    
    Example:
        >>> feedback = generate_answer_feedback(
        ...     question="Tell me about yourself",
        ...     transcript="I am a developer...",
        ...     ideal_answer="...",
        ...     ml_scores={"content": 70, ...}
        ... )
    """
    # Build job context section
    if job_description and len(job_description.strip()) > 10:
        job_context = f"The candidate is applying for a role with this description:\n{job_description[:1000]}"
    else:
        job_context = "No specific job description provided. Give general interview feedback."
    
    # Format the prompt with all variables (6-score system)
    prompt = ANSWER_FEEDBACK_PROMPT.format(
        question=question,
        transcript=transcript,
        ideal_answer=ideal_answer,
        job_context=job_context,
        content_score=ml_scores.get("content", 0),
        delivery_score=ml_scores.get("delivery", 0),
        communication_score=ml_scores.get("communication", 0),
        voice_score=ml_scores.get("voice", 70),
        confidence_score=ml_scores.get("confidence", 70),
        structure_score=ml_scores.get("structure", 0),
        final_score=ml_scores.get("final", 0),
        wpm=ml_scores.get("wpm", 0),
        filler_count=ml_scores.get("filler_count", 0),
        grammar_errors=ml_scores.get("grammar_errors", 0),
        relevance=ml_scores.get("relevance", 0)
    )
    
    # Call LLM
    response = _call_llm(prompt)
    
    # Parse response
    feedback = _parse_json_response(response, default_answer_feedback())
    
    return feedback


def generate_resume_feedback(
    resume_text: str,
    jd_text: str,
    ml_scores: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate LLM feedback for resume analysis.
    
    Takes the resume-JD comparison results and generates
    actionable feedback for improvement.
    
    Args:
        resume_text: Extracted text from resume
        jd_text: Job description text
        ml_scores: Dictionary with skill match results
    
    Returns:
        dict: Feedback including:
            - summary: Overall assessment
            - strengths: Positive aspects
            - gaps: Areas lacking
            - tips: Improvement suggestions
            - priority_skills: Most important skills to add
    """
    # Truncate texts if too long (to avoid token limits)
    max_text_length = 3000
    resume_text = resume_text[:max_text_length] if len(resume_text) > max_text_length else resume_text
    jd_text = jd_text[:max_text_length] if len(jd_text) > max_text_length else jd_text
    
    # Format matched/missing skills
    matched_skills = ", ".join(ml_scores.get("matched_skills", [])) or "None identified"
    missing_skills = ", ".join(ml_scores.get("missing_skills", [])) or "None identified"
    
    prompt = RESUME_FEEDBACK_PROMPT.format(
        resume_text=resume_text,
        jd_text=jd_text,
        skill_match_pct=ml_scores.get("skill_match_pct", 0),
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        similarity_score=ml_scores.get("similarity_score", 0)
    )
    
    # Call LLM
    response = _call_llm(prompt)
    
    # Parse response
    feedback = _parse_json_response(response, default_resume_feedback())
    
    return feedback


# ===========================================
# LLM API Call Functions
# ===========================================

def _call_llm(prompt: str) -> str:
    """
    Call the configured LLM provider.
    
    Routes to OpenAI, Gemini, or Hugging Face based on settings.
    
    Args:
        prompt: The prompt to send to LLM
    
    Returns:
        str: LLM response text
    """
    provider = settings.llm_provider.lower()
    
    if provider == "openai":
        return _call_openai(prompt)
    elif provider == "gemini":
        return _call_gemini(prompt)
    elif provider == "huggingface":
        return _call_huggingface(prompt)
    else:
        # Default to Gemini (free tier available)
        print(f"Unknown LLM provider: {provider}, defaulting to Gemini")
        return _call_gemini(prompt)


def _call_openai(prompt: str) -> str:
    """
    Call OpenAI's GPT API.
    
    Args:
        prompt: The prompt to send
    
    Returns:
        str: GPT response
    """
    try:
        from openai import OpenAI
        
        if not settings.llm_api_key:
            print("Warning: OpenAI API key not configured")
            return ""
        
        client = OpenAI(api_key=settings.llm_api_key)
        
        response = client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert interview and career coach. Always respond with valid JSON only, no additional text."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    except ImportError:
        print("OpenAI library not installed")
        return ""
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return ""


# Global LLM status tracking
_llm_status = {
    "is_working": None,
    "last_error": None,
    "last_check": None,
    "provider": None
}

def get_llm_working_status() -> dict:
    """Get the current LLM working status."""
    return _llm_status.copy()

def _call_gemini(prompt: str) -> str:
    """
    Call Google's Gemini API with automatic key rotation.
    
    Uses the KeyManager for multi-key rotation and failover.
    Falls back to single key if rotation is not configured.
    
    Args:
        prompt: The prompt to send
    
    Returns:
        str: Gemini response
    """
    global _llm_status
    from datetime import datetime
    
    try:
        import google.generativeai as genai
        from app.services.key_manager import get_key_manager
        
        # Try to use key manager for rotation
        use_rotation = False
        api_key = None
        key_id = None
        
        try:
            key_manager = get_key_manager()
            api_key, key_id = key_manager.get_next_healthy_key()
            use_rotation = True
        except RuntimeError as e:
            # Key manager not initialized or all keys exhausted
            if "not initialized" not in str(e):
                # All keys exhausted
                helpful_msg = (
                    "All API keys exhausted. "
                    "Solutions: 1) Add more keys to .env (LLM_API_KEY_2, LLM_API_KEY_3, etc.), "
                    "2) Wait for quota reset (midnight PT), "
                    "3) Enable billing for unlimited access. "
                    f"Details: {e}"
                )
                _llm_status = {
                    "is_working": False,
                    "last_error": helpful_msg,
                    "last_check": datetime.utcnow().isoformat(),
                    "provider": "gemini"
                }
                print(f"✗ All Gemini API keys exhausted: {e}")
                return ""
            
            # Fall back to single key from settings
            if not settings.llm_api_key:
                _llm_status = {
                    "is_working": False,
                    "last_error": "Gemini API key not configured. Set LLM_API_KEY in .env",
                    "last_check": datetime.utcnow().isoformat(),
                    "provider": "gemini"
                }
                print("Warning: Gemini API key not configured")
                return ""
            
            api_key = settings.llm_api_key
            key_id = 1
        
        # Configure and call Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(settings.llm_model)
        
        response = model.generate_content(
            f"You are an expert interview and career coach. Always respond with valid JSON only.\n\n{prompt}"
        )
        
        # Mark success in key manager
        if use_rotation:
            try:
                key_manager.mark_call_result(key_id, success=True)
            except:
                pass
        
        _llm_status = {
            "is_working": True,
            "last_error": None,
            "last_check": datetime.utcnow().isoformat(),
            "provider": "gemini",
            "key_id": key_id,
            "rotation_enabled": use_rotation
        }
        return response.text
    
    except ImportError:
        _llm_status = {
            "is_working": False,
            "last_error": "Google Generative AI library not installed. Run: pip install google-generativeai",
            "last_check": datetime.utcnow().isoformat(),
            "provider": "gemini"
        }
        print("Google Generative AI library not installed")
        return ""
    except Exception as e:
        error_msg = str(e)
        
        # Mark failure in key manager
        if use_rotation and key_id is not None:
            try:
                key_manager.mark_call_result(key_id, success=False, error=error_msg)
            except:
                pass
        
        # Provide helpful error messages based on error type
        if "429" in error_msg or "ResourceExhausted" in error_msg or "Quota exceeded" in error_msg:
            helpful_msg = (
                "Gemini API quota exceeded. "
                f"Key #{key_id} entering cooldown for 1 hour. "
                "Solutions: 1) System will auto-rotate to next available key, "
                "2) Add more keys to .env (LLM_API_KEY_2, LLM_API_KEY_3, etc.), "
                "3) Wait for quota reset at midnight Pacific Time, "
                "or 4) Enable billing for unlimited access."
            )
        elif "400" in error_msg or "API_KEY_INVALID" in error_msg:
            helpful_msg = (
                "Gemini API key is invalid. "
                "Please create a new API key at https://aistudio.google.com/apikey "
                "and update LLM_API_KEY in your .env file."
            )
        elif "403" in error_msg or "PermissionDenied" in error_msg:
            helpful_msg = (
                "Gemini API permission denied. "
                "Enable 'Generative Language API' in Google Cloud Console "
                "or create a new API key at https://aistudio.google.com/apikey"
            )
        else:
            helpful_msg = f"Gemini API error: {error_msg}"
        
        _llm_status = {
            "is_working": False,
            "last_error": helpful_msg,
            "last_check": datetime.utcnow().isoformat(),
            "provider": "gemini",
            "key_id": key_id if key_id else None,
            "rotation_enabled": use_rotation
        }
        print(f"✗ Gemini API error (Key #{key_id}): {e}")
        print(f"💡 Help: {helpful_msg}")
        return ""


# Note: Ollama support removed - using cloud-based Gemini (free tier) instead


def _call_huggingface(prompt: str) -> str:
    """
    Call Hugging Face Inference API with Meta LLaMA 3.
    
    Uses the Hugging Face serverless inference API.
    Requires a Hugging Face API token.
    
    Supported models:
    - meta-llama/Meta-Llama-3-8B-Instruct
    - meta-llama/Meta-Llama-3-70B-Instruct
    
    Args:
        prompt: The prompt to send
    
    Returns:
        str: LLaMA 3 response
    """
    import requests
    
    try:
        api_key = settings.llm_api_key
        model = settings.llm_model or "meta-llama/Meta-Llama-3-8B-Instruct"
        
        if not api_key:
            print("Warning: Hugging Face API token not configured")
            print("Set LLM_API_KEY in your .env file with your Hugging Face token")
            return ""
        
        # Hugging Face Inference API endpoint
        url = f"https://api-inference.huggingface.co/models/{model}"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Format prompt for LLaMA 3 Instruct format
        formatted_prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are an expert interview and career coach. Always respond with valid JSON only, no additional text.
<|eot_id|><|start_header_id|>user<|end_header_id|>
{prompt}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""
        
        payload = {
            "inputs": formatted_prompt,
            "parameters": {
                "max_new_tokens": 1000,
                "temperature": 0.7,
                "top_p": 0.9,
                "do_sample": True,
                "return_full_text": False
            }
        }
        
        print(f"[Hugging Face] Calling model '{model}'...")
        
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                return result[0].get("generated_text", "")
            return str(result)
        elif response.status_code == 503:
            print(f"Hugging Face: Model is loading, please wait and try again")
            return ""
        else:
            print(f"Hugging Face error: {response.status_code} - {response.text}")
            return ""
    
    except requests.exceptions.Timeout:
        print("Hugging Face: Request timed out (model may be loading)")
        return ""
    except Exception as e:
        print(f"Hugging Face API error: {e}")
        return ""


def _fallback_response(prompt: str) -> str:
    """
    Generate a fallback response when LLM is not available.
    
    Returns a reasonable default response based on the prompt type.
    """
    # Check if it's an answer or resume feedback request
    if "Interview Question" in prompt:
        return json.dumps(default_answer_feedback())
    else:
        return json.dumps(default_resume_feedback())


# ===========================================
# Response Parsing
# ===========================================

def _parse_json_response(response: str, default: Dict) -> Dict:
    """
    Parse JSON from LLM response, with fallback.
    
    LLMs sometimes include extra text around JSON.
    This function attempts to extract and parse the JSON.
    
    Args:
        response: Raw LLM response
        default: Default dict to return on failure
    
    Returns:
        dict: Parsed response or default
    """
    if not response:
        return default
    
    # Try direct parsing first
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON in the response
    try:
        # Find content between first { and last }
        start = response.find('{')
        end = response.rfind('}')
        
        if start != -1 and end != -1 and end > start:
            json_str = response[start:end + 1]
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass
    
    print(f"Could not parse LLM response, using default")
    return default


# ===========================================
# Default Responses
# ===========================================

def default_answer_feedback() -> Dict[str, Any]:
    """Generate default feedback when LLM is unavailable."""
    return {
        "summary": "Your answer shows effort but could be improved with more specific examples and structured delivery. (Note: AI analysis is currently unavailable, showing basic feedback only.)",
        "what_you_did": {
            "opening": "Unable to analyze - AI service unavailable",
            "main_content": "Unable to analyze - AI service unavailable", 
            "closing": "Unable to analyze - AI service unavailable",
            "overall_approach": "Unable to analyze - AI service unavailable"
        },
        "strengths": [
            "Attempted to address the question",
            "Showed some relevant knowledge"
        ],
        "weaknesses": [
            "Could provide more specific examples",
            "Structure could be improved"
        ],
        "improvements": [
            "Provide more specific examples with concrete details",
            "Structure your response using STAR method (Situation, Task, Action, Result)",
            "Reduce filler words for clarity",
            "Incorporate industry-specific keywords"
        ],
        "comparison": {
            "what_worked": ["Addressed the core question"],
            "what_didnt_work": ["Lacked specific examples and metrics"]
        },
        "keyword_analysis": "Unable to perform detailed keyword analysis - AI service unavailable. Please ensure your API key is configured correctly.",
        "improvement_roadmap": [
            "Practice structuring answers using STAR method",
            "Prepare specific examples with quantifiable results",
            "Record yourself and review for filler words",
            "Research industry-specific terminology for this role"
        ],
        "tips": [
            "Start with a brief overview, then provide details",
            "Use specific numbers and outcomes when possible",
            "Practice speaking at a steady pace (130-160 WPM)",
            "Prepare 2-3 strong examples for common questions"
        ],
        "star_analysis": {
            "situation": "Unable to analyze - AI service unavailable",
            "task": "Unable to analyze - AI service unavailable",
            "action": "Unable to analyze - AI service unavailable",
            "result": "Unable to analyze - AI service unavailable"
        },
        "sentence_feedback": [
            {
                "original": "Unable to analyze specific sentences - AI service unavailable",
                "improved": "Please configure AI service for detailed feedback",
                "reason": "AI analysis requires valid API key",
                "impact": "Without AI, only basic scoring is available"
            }
        ],
        "example_answer": "Consider structuring your answer as: 'In my role at [Company], I faced [Situation]. My responsibility was [Task]. I took [Action] which resulted in [Result with metrics].' This STAR format makes your answer more compelling. (Note: For personalized example answers, please configure AI service.)",
        "llm_failed": True,
        "llm_error": _llm_status.get("last_error", "LLM service unavailable. Please check your API key configuration in backend/.env")
    }


def default_resume_feedback() -> Dict[str, Any]:
    """Generate default resume feedback when LLM is unavailable."""
    return {
        "validity_score": 100,
        "is_valid_resume": True,
        "summary": "Your resume shows relevant experience but could be better tailored to this specific role.",
        "strengths": [
            "Has relevant work experience",
            "Includes technical skills"
        ],
        "gaps": [
            "Some key skills from the job description are missing",
            "Could include more quantifiable achievements"
        ],
        "tips": [
            "Add the specific technologies mentioned in the job description",
            "Quantify your achievements with numbers and percentages",
            "Tailor your summary to match the role requirements"
        ],
        "priority_skills": [
            "Focus on acquiring the top 3 missing skills from the job description"
        ],
        "experience_feedback": "Ensure your experience bullet points follow the 'Action + Context + Result' format.",
        "formatting_feedback": "Verify that your resume is easy to scan.",
        "llm_failed": True,
        "llm_error": _llm_status.get("last_error", "LLM service unavailable")
    }


# ===========================================
# Utility Functions
# ===========================================

def get_llm_status() -> Dict[str, Any]:
    """
    Get the current LLM configuration status.
    
    Returns:
        dict: Status information
    """
    return {
        "provider": settings.llm_provider,
        "model": settings.llm_model,
        "api_key_configured": bool(settings.llm_api_key),
        "available_providers": ["openai", "gemini", "huggingface"]
    }


def test_llm_connection() -> Dict[str, Any]:
    """
    Test the LLM connection with a simple prompt.
    
    Returns:
        dict: Test results
    """
    result = {
        "status": "unknown",
        "provider": settings.llm_provider,
        "error": None
    }
    
    try:
        response = _call_llm("Respond with just: {\"test\": \"ok\"}")
        if response:
            result["status"] = "connected"
            result["response_preview"] = response[:100]
        else:
            result["status"] = "no_response"
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
    
    return result
