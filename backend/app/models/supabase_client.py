"""
Supabase Client for REST API access
Uses service_role key for server-side operations (bypasses RLS)
"""

import logging
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger(__name__)

supabase: Client = None

def init_supabase() -> Client:
    """Initialize Supabase client with service_role key (preferred) or anon key."""
    global supabase
    
    if not settings.supabase_url:
        raise ValueError("SUPABASE_URL not set in .env")
    
    # Prefer service_role key for server-side operations
    if settings.supabase_service_role_key:
        key_to_use = settings.supabase_service_role_key.strip()
        print("✓ Supabase: Using service_role key")
    elif settings.supabase_key:
        key_to_use = settings.supabase_key.strip()
        print("⚠ Supabase: Using anon key (may have RLS restrictions)")
    else:
        raise ValueError("No Supabase key configured in .env")
    
    supabase = create_client(settings.supabase_url, key_to_use)
    return supabase

def get_supabase() -> Client:
    """Get the Supabase client instance."""
    global supabase
    if supabase is None:
        supabase = init_supabase()
    return supabase

def test_supabase_connection() -> dict:
    """Test the Supabase connection."""
    try:
        client = get_supabase()
        result = client.table("questions").select("id", count="exact").limit(1).execute()
        return {
            "status": "connected",
            "questions_count": result.count if hasattr(result, 'count') else "unknown"
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

