"""
AI Interview Feedback MVP - ML Scoring Unit Tests

This module contains unit tests for the ML engine functions:
- Semantic similarity
- Filler word counting
- WPM calculation
- Grammar error estimation
- Answer scoring

Author: Member 2 (ML Engine)

Run with: pytest backend/app/tests/test_scoring.py -v
"""

import pytest
from typing import Dict


# ===========================================
# Test Fixtures
# ===========================================

@pytest.fixture
def sample_transcript() -> str:
    """Sample transcript for testing."""
    return """I have extensive experience in software development, 
    particularly in Python and machine learning. In my previous role,
    I led a team of five developers on a data analytics project that
    increased efficiency by thirty percent."""


@pytest.fixture
def ideal_answer() -> str:
    """Sample ideal answer for testing."""
    return """A strong candidate should demonstrate their technical expertise,
    mention specific projects and achievements, and quantify their impact.
    They should mention team leadership and problem-solving skills."""


@pytest.fixture
def transcript_with_fillers() -> str:
    """Transcript with filler words for testing."""
    return """Um, I think, like, the solution is basically, you know, 
    um, to implement a machine learning model, uh, that would actually
    sort of help with the predictions."""


@pytest.fixture
def transcript_with_grammar_errors() -> str:
    """Transcript with grammar errors for testing."""
    return """I has worked on many project. They was very successful.
    Me and my team could of done better but it was still good."""


# ===========================================
# Semantic Similarity Tests
# ===========================================

class TestSemanticSimilarity:
    """Tests for semantic_similarity function."""
    
    def test_identical_texts(self):
        """Identical texts should have similarity close to 1."""
        from app.services.ml_engine import semantic_similarity
        
        text = "I have experience in Python programming"
        similarity = semantic_similarity(text, text)
        
        assert similarity >= 0.95, f"Expected similarity >= 0.95, got {similarity}"
    
    def test_similar_texts(self):
        """Similar texts should have moderate to high similarity."""
        from app.services.ml_engine import semantic_similarity
        
        text1 = "I have experience in Python programming"
        text2 = "I know how to code in Python"
        
        similarity = semantic_similarity(text1, text2)
        
        assert 0.5 <= similarity <= 1.0, f"Expected similarity between 0.5-1.0, got {similarity}"
    
    def test_different_texts(self):
        """Different texts should have lower similarity."""
        from app.services.ml_engine import semantic_similarity
        
        text1 = "I have experience in Python programming"
        text2 = "The weather is nice today"
        
        similarity = semantic_similarity(text1, text2)
        
        assert similarity < 0.5, f"Expected similarity < 0.5 for unrelated texts, got {similarity}"
    
    def test_empty_text(self):
        """Empty text should return 0 similarity."""
        from app.services.ml_engine import semantic_similarity
        
        similarity = semantic_similarity("", "Some text")
        
        assert similarity == 0.0, f"Expected 0 for empty text, got {similarity}"
    
    def test_similarity_range(self):
        """Similarity should always be between 0 and 1."""
        from app.services.ml_engine import semantic_similarity
        
        text1 = "Machine learning is a subset of artificial intelligence"
        text2 = "AI includes ML"
        
        similarity = semantic_similarity(text1, text2)
        
        assert 0.0 <= similarity <= 1.0, f"Similarity {similarity} out of range [0, 1]"


# ===========================================
# Filler Word Counting Tests
# ===========================================

class TestFillerCounting:
    """Tests for count_fillers function."""
    
    def test_count_fillers_basic(self, transcript_with_fillers):
        """Should detect common filler words."""
        from app.services.ml_engine import count_fillers
        
        count, fillers = count_fillers(transcript_with_fillers)
        
        assert count >= 5, f"Expected at least 5 fillers, got {count}"
        assert len(fillers) > 0, "Should return list of found fillers"
    
    def test_count_fillers_clean(self, sample_transcript):
        """Clean transcript should have few or no fillers."""
        from app.services.ml_engine import count_fillers
        
        count, fillers = count_fillers(sample_transcript)
        
        assert count < 3, f"Expected few fillers in clean text, got {count}"
    
    def test_count_fillers_empty(self):
        """Empty transcript should return 0."""
        from app.services.ml_engine import count_fillers
        
        count, fillers = count_fillers("")
        
        assert count == 0
        assert fillers == []
    
    def test_specific_fillers(self):
        """Should detect specific filler words."""
        from app.services.ml_engine import count_fillers
        
        text = "Um, I basically think, like, this is um good"
        count, fillers = count_fillers(text)
        
        # Should find: um (2), basically (1), like (1)
        assert count >= 4


# ===========================================
# WPM Calculation Tests
# ===========================================

class TestWPMCalculation:
    """Tests for compute_wpm function."""
    
    def test_wpm_basic(self):
        """Basic WPM calculation."""
        from app.services.ml_engine import compute_wpm
        
        # 100 words in 60 seconds = 100 WPM
        transcript = " ".join(["word"] * 100)
        wpm = compute_wpm(transcript, 60)
        
        assert abs(wpm - 100) < 1, f"Expected ~100 WPM, got {wpm}"
    
    def test_wpm_fast_speaker(self):
        """Fast speaker WPM calculation."""
        from app.services.ml_engine import compute_wpm
        
        # 180 words in 60 seconds = 180 WPM
        transcript = " ".join(["word"] * 180)
        wpm = compute_wpm(transcript, 60)
        
        assert abs(wpm - 180) < 1
    
    def test_wpm_slow_speaker(self):
        """Slow speaker WPM calculation."""
        from app.services.ml_engine import compute_wpm
        
        # 60 words in 60 seconds = 60 WPM  
        transcript = " ".join(["word"] * 60)
        wpm = compute_wpm(transcript, 60)
        
        assert abs(wpm - 60) < 1
    
    def test_wpm_zero_duration(self):
        """Zero duration should return 0."""
        from app.services.ml_engine import compute_wpm
        
        wpm = compute_wpm("Some words here", 0)
        
        assert wpm == 0.0
    
    def test_wpm_empty_transcript(self):
        """Empty transcript should return 0."""
        from app.services.ml_engine import compute_wpm
        
        wpm = compute_wpm("", 60)
        
        assert wpm == 0.0
    
    def test_wpm_realistic(self, sample_transcript):
        """Realistic transcript WPM calculation."""
        from app.services.ml_engine import compute_wpm
        
        # Sample transcript is about 40 words, assuming 20 seconds
        wpm = compute_wpm(sample_transcript, 20)
        
        assert 80 <= wpm <= 200, f"WPM {wpm} outside realistic range"


# ===========================================
# Grammar Error Estimation Tests
# ===========================================

class TestGrammarErrors:
    """Tests for estimate_grammar_errors function."""
    
    def test_grammar_errors_detected(self, transcript_with_grammar_errors):
        """Should detect grammar errors in text."""
        from app.services.ml_engine import estimate_grammar_errors
        
        errors, descriptions = estimate_grammar_errors(transcript_with_grammar_errors)
        
        # Should find at least some errors
        assert errors >= 1, f"Expected errors in problematic text, got {errors}"
    
    def test_clean_text_few_errors(self, sample_transcript):
        """Clean text should have few grammar errors."""
        from app.services.ml_engine import estimate_grammar_errors
        
        errors, descriptions = estimate_grammar_errors(sample_transcript)
        
        assert errors <= 3, f"Expected few errors in clean text, got {errors}"
    
    def test_empty_text(self):
        """Empty text should return 0 errors."""
        from app.services.ml_engine import estimate_grammar_errors
        
        errors, descriptions = estimate_grammar_errors("")
        
        assert errors == 0
        assert descriptions == []


# ===========================================
# Answer Scoring Tests
# ===========================================

class TestAnswerScoring:
    """Tests for score_answer function."""
    
    def test_score_answer_structure(self, sample_transcript, ideal_answer):
        """Score answer should return all expected keys."""
        from app.services.ml_engine import score_answer
        
        scores = score_answer(sample_transcript, 30, ideal_answer)
        
        expected_keys = [
            "content", "delivery", "communication", "final",
            "wpm", "filler_count", "grammar_errors", "relevance"
        ]
        
        for key in expected_keys:
            assert key in scores, f"Missing key: {key}"
    
    def test_score_ranges(self, sample_transcript, ideal_answer):
        """All scores should be in valid ranges."""
        from app.services.ml_engine import score_answer
        
        scores = score_answer(sample_transcript, 30, ideal_answer)
        
        assert 0 <= scores["content"] <= 100
        assert 0 <= scores["delivery"] <= 100
        assert 0 <= scores["communication"] <= 100
        assert 0 <= scores["final"] <= 100
        assert 0 <= scores["relevance"] <= 1
        assert scores["wpm"] >= 0
        assert scores["filler_count"] >= 0
        assert scores["grammar_errors"] >= 0
    
    def test_good_answer_high_score(self, sample_transcript, ideal_answer):
        """Good answer should score reasonably well."""
        from app.services.ml_engine import score_answer
        
        scores = score_answer(sample_transcript, 30, ideal_answer)
        
        # A clean, relevant answer should score above 50
        assert scores["final"] >= 40, f"Expected final >= 40, got {scores['final']}"
    
    def test_empty_answer_low_score(self, ideal_answer):
        """Empty answer should score 0."""
        from app.services.ml_engine import score_answer
        
        scores = score_answer("", 30, ideal_answer)
        
        assert scores["final"] == 0
    
    def test_filler_heavy_answer(self, transcript_with_fillers, ideal_answer):
        """Filler-heavy answer should have lower delivery score."""
        from app.services.ml_engine import score_answer
        
        scores = score_answer(transcript_with_fillers, 30, ideal_answer)
        
        assert scores["filler_count"] >= 5
        # Delivery should be reduced due to fillers
        assert scores["delivery"] < 100


# ===========================================
# Resume Scoring Tests
# ===========================================

class TestResumeScoring:
    """Tests for score_resume function."""
    
    def test_score_resume_structure(self):
        """Score resume should return expected structure."""
        from app.services.ml_engine import score_resume
        
        resume = "Python developer with 5 years experience in machine learning"
        jd = "Looking for Python developer with ML experience"
        
        scores = score_resume(resume, jd)
        
        assert "overall_score" in scores
        assert "similarity" in scores
        assert "assessment" in scores
    
    def test_matching_resume_jd(self):
        """Matching resume and JD should score well."""
        from app.services.ml_engine import score_resume
        
        resume = "Experienced Python developer with machine learning expertise"
        jd = "We need a Python developer for machine learning projects"
        
        scores = score_resume(resume, jd)
        
        assert scores["overall_score"] >= 50
        assert scores["similarity"] > 0.4
    
    def test_empty_inputs(self):
        """Empty inputs should return 0 score."""
        from app.services.ml_engine import score_resume
        
        scores = score_resume("", "Some JD")
        
        assert scores["overall_score"] == 0.0


# ===========================================
# Integration Tests
# ===========================================

class TestIntegration:
    """Integration tests for ML engine."""
    
    def test_full_scoring_pipeline(self, sample_transcript, ideal_answer):
        """Test complete scoring pipeline."""
        from app.services.ml_engine import (
            semantic_similarity,
            count_fillers,
            compute_wpm,
            estimate_grammar_errors,
            score_answer
        )
        
        # Run individual components
        similarity = semantic_similarity(sample_transcript, ideal_answer)
        filler_count, _ = count_fillers(sample_transcript)
        wpm = compute_wpm(sample_transcript, 30)
        grammar_errors, _ = estimate_grammar_errors(sample_transcript)
        
        # Run full scoring
        scores = score_answer(sample_transcript, 30, ideal_answer)
        
        # Verify consistency
        assert abs(scores["relevance"] - similarity) < 0.01
        assert scores["filler_count"] == filler_count
        assert scores["wpm"] == wpm or abs(scores["wpm"] - wpm) < 1


# ===========================================
# Run Tests
# ===========================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
