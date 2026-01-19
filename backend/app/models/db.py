"""
AI Interview Feedback MVP - Database Models (Supabase REST API Only)

This module provides data models for the application using ONLY Supabase REST API.
No SQLAlchemy, no direct PostgreSQL connections - pure Supabase client.

All database operations are handled through app/services/supabase_db.py

Author: Member 1 (Backend API)
"""

from datetime import datetime
from typing import Dict, Any, Optional
import json

from app.config import settings


# ===========================================
# Note: SQLAlchemy Removed - Using Supabase REST API
# ===========================================

# This application uses Supabase''s REST API exclusively.
# No database connection string (DATABASE_URL) is required.
# Only SUPABASE_URL and SUPABASE_KEY are needed.

# All database operations are in: app/services/supabase_db.py


# ===========================================
# Data Models (Schema Reference Only)
# ===========================================

class User:
    """
    User model schema (reference only).
    
    Actual database operations use Supabase REST API.
    See: app/services/supabase_db.py
    """
    pass


class Attempt:
    """
    Attempt model schema (reference only).
    
    Actual database operations use Supabase REST API.
    See: app/services/supabase_db.py
    """
    pass


class ResumeAnalysis:
    """
    Resume Analysis model schema (reference only).
    
    Actual database operations use Supabase REST API.
    See: app/services/supabase_db.py
    """
    pass


class PracticeSession:
    """
    Practice Session model schema (reference only).
    
    Actual database operations use Supabase REST API.
    See: app/services/supabase_db.py
    """
    pass


# ===========================================
# Database Initialization (Supabase Only)
# ===========================================

def init_db() -> None:
    """
    Initialize database connection.
    
    For Supabase REST API mode, this only verifies the connection.
    Tables are created via Supabase Dashboard using SQL schema.
    
    No SQLAlchemy migrations needed!
    """
    from app.models.supabase_client import get_supabase
    try:
        supabase = get_supabase()
        # Test connection with a simple query
        supabase.table("users").select("id").limit(1).execute()
        print(" Supabase connection verified (REST API mode)")
    except Exception as e:
        print(f" Supabase connection test failed: {e}")
        print("  Make sure SUPABASE_URL and SUPABASE_KEY are set in .env")


def get_db():
    """
    Legacy function kept for compatibility.
    
    This application uses Supabase REST API directly.
    No database session injection needed.
    
    All database operations are in app/services/supabase_db.py
    """
    raise NotImplementedError(
        "SQLAlchemy sessions not used. "
        "Use app/services/supabase_db.py functions instead."
    )
