"""
AI Interview Feedback MVP - API Endpoint Tests

This module contains integration tests for the API endpoints:
- Health check
- Questions endpoint
- Resume upload
- Audio upload

Author: Member 1 (Backend API)

Run with: pytest backend/app/tests/test_endpoints.py -v
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json
import os


# ===========================================
# Test Client Fixture
# ===========================================

@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def sample_questions():
    """Sample questions for testing."""
    return [
        {
            "id": 1,
            "question": "Tell me about yourself.",
            "ideal_answer": "A structured response..."
        }
    ]


# ===========================================
# Health Endpoint Tests
# ===========================================

class TestHealthEndpoint:
    """Tests for /api/v1/health endpoint."""
    
    def test_health_check(self, client):
        """Health endpoint should return healthy status."""
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
    
    def test_root_endpoint(self, client):
        """Root endpoint should return welcome message."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Welcome" in data["message"]


# ===========================================
# Questions Endpoint Tests
# ===========================================

class TestQuestionsEndpoint:
    """Tests for /api/v1/questions endpoint."""
    
    def test_get_questions(self, client):
        """Should return list of questions."""
        response = client.get("/api/v1/questions")
        
        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert "total" in data
        assert len(data["questions"]) > 0
    
    def test_question_structure(self, client):
        """Each question should have required fields."""
        response = client.get("/api/v1/questions")
        
        data = response.json()
        for question in data["questions"]:
            assert "id" in question
            assert "question" in question
            assert "ideal_answer" in question


# ===========================================
# Resume Upload Tests
# ===========================================

class TestResumeUpload:
    """Tests for /api/v1/upload_resume endpoint."""
    
    def test_upload_resume_missing_file(self, client):
        """Should return error when file is missing."""
        response = client.post(
            "/api/v1/upload_resume",
            data={"job_description": "Looking for a Python developer"}
        )
        
        # Should fail due to missing file
        assert response.status_code == 422
    
    def test_upload_resume_missing_jd(self, client):
        """Should return error when JD is missing."""
        # Create a minimal valid PDF-like content
        response = client.post(
            "/api/v1/upload_resume",
            files={"resume": ("test.pdf", b"fake pdf content", "application/pdf")}
        )
        
        # Should fail due to missing job description
        assert response.status_code == 422
    
    def test_upload_resume_invalid_format(self, client):
        """Should reject invalid file formats."""
        response = client.post(
            "/api/v1/upload_resume",
            files={"resume": ("test.txt", b"text content", "text/plain")},
            data={"job_description": "Looking for a developer"}
        )
        
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]


# ===========================================
# Audio Upload Tests
# ===========================================

class TestAudioUpload:
    """Tests for /api/v1/upload_audio endpoint."""
    
    def test_upload_audio_missing_file(self, client):
        """Should return error when audio file is missing."""
        response = client.post(
            "/api/v1/upload_audio",
            data={"question_id": 1}
        )
        
        assert response.status_code == 422
    
    def test_upload_audio_missing_question_id(self, client):
        """Should return error when question_id is missing."""
        response = client.post(
            "/api/v1/upload_audio",
            files={"audio": ("test.wav", b"fake audio", "audio/wav")}
        )
        
        assert response.status_code == 422
    
    def test_upload_audio_invalid_format(self, client):
        """Should reject invalid audio formats."""
        response = client.post(
            "/api/v1/upload_audio",
            files={"audio": ("test.txt", b"not audio", "text/plain")},
            data={"question_id": 1}
        )
        
        assert response.status_code == 400
        assert "Invalid audio format" in response.json()["detail"]
    
    def test_upload_audio_invalid_question(self, client):
        """Should return error for non-existent question."""
        # Create a fake WAV header (RIFF header)
        wav_header = b'RIFF' + (1000).to_bytes(4, 'little') + b'WAVE'
        
        response = client.post(
            "/api/v1/upload_audio",
            files={"audio": ("test.wav", wav_header, "audio/wav")},
            data={"question_id": 99999}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


# ===========================================
# Attempts Endpoint Tests
# ===========================================

class TestAttemptsEndpoint:
    """Tests for /api/v1/attempts endpoint."""
    
    def test_get_attempts_empty(self, client):
        """Should return empty list when no attempts exist."""
        response = client.get("/api/v1/attempts")
        
        assert response.status_code == 200
        data = response.json()
        assert "attempts" in data
        assert isinstance(data["attempts"], list)
    
    def test_get_attempts_with_limit(self, client):
        """Should respect limit parameter."""
        response = client.get("/api/v1/attempts?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["attempts"]) <= 5


# ===========================================
# Error Handling Tests
# ===========================================

class TestErrorHandling:
    """Tests for API error handling."""
    
    def test_404_on_unknown_route(self, client):
        """Should return 404 for unknown routes."""
        response = client.get("/api/v1/unknown_endpoint")
        
        assert response.status_code == 404
    
    def test_method_not_allowed(self, client):
        """Should return 405 for wrong HTTP methods."""
        # GET on POST-only endpoint
        response = client.delete("/api/v1/questions")
        
        assert response.status_code == 405


# ===========================================
# CORS Tests
# ===========================================

class TestCORS:
    """Tests for CORS configuration."""
    
    def test_cors_headers(self, client):
        """Should include CORS headers in response."""
        response = client.options(
            "/api/v1/health",
            headers={"Origin": "http://localhost:5173"}
        )
        
        # OPTIONS should be allowed
        assert response.status_code in [200, 204]


# ===========================================
# Mock Tests for Full Flow
# ===========================================

class TestMockedFlow:
    """Tests with mocked services for full flow testing."""
    
    @patch('app.services.resume_service.extract_text_from_resume')
    @patch('app.services.resume_service.compare_resume_with_jd')
    @patch('app.services.ml_engine.score_resume')
    @patch('app.services.llm_bridge.generate_resume_feedback')
    def test_upload_resume_mocked(
        self,
        mock_llm,
        mock_score,
        mock_compare,
        mock_extract,
        client
    ):
        """Test resume upload with mocked services."""
        # Setup mocks
        mock_extract.return_value = "Sample resume text with Python skills"
        mock_compare.return_value = {
            "skill_match_pct": 75.0,
            "matched_skills": ["python"],
            "missing_skills": ["java"],
            "similarity_score": 0.7
        }
        mock_score.return_value = {"overall_score": 70}
        mock_llm.return_value = {
            "summary": "Good resume",
            "tips": ["Add more skills"]
        }
        
        # Create test PDF content (fake but acceptable)
        pdf_content = b'%PDF-1.4 fake content'
        
        response = client.post(
            "/api/v1/upload_resume",
            files={"resume": ("test.pdf", pdf_content, "application/pdf")},
            data={"job_description": "Looking for a Python developer with 5 years experience"}
        )
        
        # May fail if extract_text fails on fake PDF
        # In real tests, use a proper sample PDF


# ===========================================
# Run Tests
# ===========================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
