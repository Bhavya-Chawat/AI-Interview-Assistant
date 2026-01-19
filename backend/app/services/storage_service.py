"""
Storage Service - Supabase Storage Integration

This module handles file storage using Supabase Storage:
- Audio file uploads (interview recordings)
- Resume file uploads (PDF, DOCX)
- File retrieval and URL generation
- File deletion

Author: AI Interview Assistant Team
"""

import os
import uuid
import logging
from typing import Optional, Tuple, BinaryIO
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import UploadFile, HTTPException

from app.config import settings

logger = logging.getLogger(__name__)


# Storage bucket names (from config)
AUDIO_BUCKET = settings.storage_bucket_audio
RESUME_BUCKET = settings.storage_bucket_resumes


# ===========================================
# Supabase Storage Client
# ===========================================

_storage_client = None


def get_storage_client():
    """Get Supabase storage client with service role key (bypasses RLS)."""
    global _storage_client
    
    if _storage_client is None:
        if not settings.supabase_url:
            logger.warning("Supabase URL not configured. Using local storage fallback.")
            return None
        
        # Prefer service role key for server-side storage (bypasses RLS)
        key_to_use = None
        key_type = "none"
        
        if settings.supabase_service_role_key:
            key_to_use = settings.supabase_service_role_key.strip()
            key_type = "service_role"
        elif settings.supabase_key:
            key_to_use = settings.supabase_key.strip()
            key_type = "anon"
            logger.warning("Using anon key for storage - RLS policies will apply!")
        
        if not key_to_use:
            logger.warning("No Supabase key configured. Using local storage fallback.")
            return None
        
        try:
            from supabase import create_client
            client = create_client(
                settings.supabase_url,
                key_to_use
            )
            _storage_client = client.storage
            logger.info(f"Supabase storage client initialized with {key_type} key")
        except ImportError:
            logger.error("Supabase library not installed")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize Supabase storage: {e}")
            return None
    
    return _storage_client


# ===========================================
# File Upload Functions
# ===========================================

async def upload_audio_file(
    file: UploadFile,
    user_id: Optional[str] = None,
    question_id: Optional[int] = None
) -> Tuple[str, str]:
    """
    Upload audio file to Supabase Storage.
    
    Args:
        file: FastAPI UploadFile object
        user_id: Optional user ID for organizing files
        question_id: Optional question ID for file naming
    
    Returns:
        Tuple of (file_path, public_url)
    
    Raises:
        HTTPException: If upload fails
    """
    storage = get_storage_client()
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_extension = Path(file.filename).suffix or ".wav"
    unique_id = str(uuid.uuid4())[:8]
    
    if user_id:
        file_path = f"{user_id}/{timestamp}_{question_id or 'q'}_{unique_id}{file_extension}"
    else:
        file_path = f"anonymous/{timestamp}_{question_id or 'q'}_{unique_id}{file_extension}"
    
    # If Supabase is available, upload to cloud
    if storage:
        try:
            # Read file content
            content = await file.read()
            
            # Upload to Supabase Storage
            result = storage.from_(AUDIO_BUCKET).upload(
                file_path,
                content,
                file_options={
                    "content-type": file.content_type or "audio/wav"
                }
            )
            
            # Get public URL
            public_url = storage.from_(AUDIO_BUCKET).get_public_url(file_path)
            
            logger.info(f"Uploaded audio to Supabase: {file_path}")
            return file_path, public_url
        
        except Exception as e:
            logger.error(f"Supabase audio upload failed to bucket '{AUDIO_BUCKET}': {e}")
            logger.error(f"  File path: {file_path}")
            logger.error(f"  Exception type: {type(e).__name__}")
            # Check for common issues
            if "bucket" in str(e).lower():
                logger.error(f"  TIP: Make sure bucket '{AUDIO_BUCKET}' exists in Supabase Storage")
            if "permission" in str(e).lower() or "policy" in str(e).lower():
                logger.error("  TIP: Check bucket RLS policies - may need public insert or service role")
            # Fall through to local storage
    
    # Fallback: Local storage
    logger.warning(f"Using local storage fallback for audio file: {file_path}")
    return await _local_upload(file, "audio", file_path)


async def upload_resume_file(
    file: UploadFile,
    user_id: Optional[str] = None
) -> Tuple[str, str]:
    """
    Upload resume file to Supabase Storage.
    
    Args:
        file: FastAPI UploadFile object (PDF, DOCX)
        user_id: Optional user ID for organizing files
    
    Returns:
        Tuple of (file_path, public_url)
    
    Raises:
        HTTPException: If upload fails
    """
    storage = get_storage_client()
    
    # Validate file type
    allowed_extensions = [".pdf", ".docx", ".doc", ".txt"]
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    
    if user_id:
        file_path = f"{user_id}/{timestamp}_resume_{unique_id}{file_extension}"
    else:
        file_path = f"anonymous/{timestamp}_resume_{unique_id}{file_extension}"
    
    # If Supabase is available, upload to cloud
    if storage:
        try:
            content = await file.read()
            
            # Determine content type
            content_types = {
                ".pdf": "application/pdf",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".doc": "application/msword",
                ".txt": "text/plain"
            }
            
            result = storage.from_(RESUME_BUCKET).upload(
                file_path,
                content,
                file_options={
                    "content-type": content_types.get(file_extension, "application/octet-stream")
                }
            )
            
            public_url = storage.from_(RESUME_BUCKET).get_public_url(file_path)
            
            logger.info(f"Uploaded resume to Supabase: {file_path}")
            return file_path, public_url
        
        except Exception as e:
            logger.error(f"Supabase resume upload failed to bucket '{RESUME_BUCKET}': {e}")
            logger.error(f"  File path: {file_path}")
            logger.error(f"  Exception type: {type(e).__name__}")
            # Check for common issues
            if "bucket" in str(e).lower():
                logger.error(f"  TIP: Make sure bucket '{RESUME_BUCKET}' exists in Supabase Storage")
            if "permission" in str(e).lower() or "policy" in str(e).lower():
                logger.error("  TIP: Check bucket RLS policies - may need public insert or service role")
    
    # Fallback: Local storage
    logger.warning(f"Using local storage fallback for resume file: {file_path}")
    return await _local_upload(file, "resumes", file_path)


async def upload_resume_bytes(
    content: bytes,
    filename: str,
    user_id: Optional[str] = None
) -> Tuple[str, str]:
    """
    Upload resume file content (bytes) to Supabase Storage.
    
    Use this when you already have the file content as bytes.
    
    Args:
        content: File content as bytes
        filename: Original filename (for extension)
        user_id: Optional user ID for organizing files
    
    Returns:
        Tuple of (file_path, public_url)
    """
    storage = get_storage_client()
    
    # Get file extension
    file_extension = Path(filename).suffix.lower()
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    
    if user_id:
        file_path = f"{user_id}/{timestamp}_resume_{unique_id}{file_extension}"
    else:
        file_path = f"anonymous/{timestamp}_resume_{unique_id}{file_extension}"
    
    # If Supabase is available, upload to cloud
    if storage:
        try:
            # Determine content type
            content_types = {
                ".pdf": "application/pdf",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".doc": "application/msword",
                ".txt": "text/plain"
            }
            
            result = storage.from_(RESUME_BUCKET).upload(
                file_path,
                content,
                file_options={
                    "content-type": content_types.get(file_extension, "application/octet-stream")
                }
            )
            
            public_url = storage.from_(RESUME_BUCKET).get_public_url(file_path)
            
            logger.info(f"Uploaded resume bytes to Supabase: {file_path}")
            return file_path, public_url
        
        except Exception as e:
            logger.error(f"Supabase resume upload failed to bucket '{RESUME_BUCKET}': {e}")
            logger.error(f"  File path: {file_path}")
            logger.error(f"  Exception type: {type(e).__name__}")
            if "bucket" in str(e).lower():
                logger.error(f"  TIP: Make sure bucket '{RESUME_BUCKET}' exists in Supabase Storage")
            if "permission" in str(e).lower() or "policy" in str(e).lower():
                logger.error("  TIP: Check bucket RLS policies - may need public insert or service role")
            raise  # Re-raise to let caller know it failed
    
    # Fallback: save locally
    logger.warning(f"Using local storage fallback for resume bytes: {file_path}")
    local_dir = UPLOAD_BASE_DIR / "resumes"
    local_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = file_path.replace("/", "_")
    full_path = local_dir / safe_filename
    
    with open(full_path, "wb") as f:
        f.write(content)
    
    return safe_filename, f"/uploads/resumes/{safe_filename}"


# ===========================================
# File Retrieval Functions
# ===========================================

def get_audio_url(file_path: str, expires_in: int = 3600) -> str:
    """
    Get URL for an audio file.
    
    Args:
        file_path: Path to file in storage
        expires_in: URL expiration time in seconds (for signed URLs)
    
    Returns:
        Public or signed URL for the file
    """
    storage = get_storage_client()
    
    if storage:
        try:
            # Try to get signed URL for private buckets
            return storage.from_(AUDIO_BUCKET).create_signed_url(
                file_path,
                expires_in
            )["signedURL"]
        except Exception:
            # Fallback to public URL
            return storage.from_(AUDIO_BUCKET).get_public_url(file_path)
    
    # Local fallback
    return f"/uploads/audio/{file_path}"


def get_resume_url(file_path: str, expires_in: int = 3600) -> str:
    """
    Get URL for a resume file.
    
    Args:
        file_path: Path to file in storage
        expires_in: URL expiration time in seconds
    
    Returns:
        Public or signed URL for the file
    """
    storage = get_storage_client()
    
    if storage:
        try:
            return storage.from_(RESUME_BUCKET).create_signed_url(
                file_path,
                expires_in
            )["signedURL"]
        except Exception:
            return storage.from_(RESUME_BUCKET).get_public_url(file_path)
    
    return f"/uploads/resumes/{file_path}"


# ===========================================
# File Download Functions
# ===========================================

async def download_audio_file(file_path: str) -> bytes:
    """
    Download audio file content.
    
    Args:
        file_path: Path to file in storage
    
    Returns:
        File content as bytes
    
    Raises:
        HTTPException: If download fails
    """
    storage = get_storage_client()
    
    if storage:
        try:
            response = storage.from_(AUDIO_BUCKET).download(file_path)
            return response
        except Exception as e:
            logger.error(f"Failed to download from Supabase: {e}")
            raise HTTPException(status_code=404, detail="File not found")
    
    # Local fallback
    return await _local_download("audio", file_path)


async def download_resume_file(file_path: str) -> bytes:
    """
    Download resume file content.
    
    Args:
        file_path: Path to file in storage
    
    Returns:
        File content as bytes
    """
    storage = get_storage_client()
    
    if storage:
        try:
            response = storage.from_(RESUME_BUCKET).download(file_path)
            return response
        except Exception as e:
            logger.error(f"Failed to download from Supabase: {e}")
            raise HTTPException(status_code=404, detail="File not found")
    
    return await _local_download("resumes", file_path)


# ===========================================
# File Deletion Functions
# ===========================================

async def delete_audio_file(file_path: str) -> bool:
    """
    Delete audio file from storage.
    
    Args:
        file_path: Path to file in storage
    
    Returns:
        True if deleted successfully
    """
    storage = get_storage_client()
    
    if storage:
        try:
            storage.from_(AUDIO_BUCKET).remove([file_path])
            logger.info(f"Deleted audio file: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete from Supabase: {e}")
            return False
    
    return await _local_delete("audio", file_path)


async def delete_resume_file(file_path: str) -> bool:
    """
    Delete resume file from storage.
    
    Args:
        file_path: Path to file in storage
    
    Returns:
        True if deleted successfully
    """
    storage = get_storage_client()
    
    if storage:
        try:
            storage.from_(RESUME_BUCKET).remove([file_path])
            logger.info(f"Deleted resume file: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete from Supabase: {e}")
            return False
    
    return await _local_delete("resumes", file_path)


# ===========================================
# Local Storage Fallback
# ===========================================

from app.config import UPLOAD_DIR
UPLOAD_BASE_DIR = Path(UPLOAD_DIR)


async def _local_upload(
    file: UploadFile,
    folder: str,
    file_path: str
) -> Tuple[str, str]:
    """
    Fallback local file upload.
    
    Args:
        file: UploadFile object
        folder: Subfolder (audio, resumes)
        file_path: Target file path
    
    Returns:
        Tuple of (file_path, local_url)
    """
    local_dir = UPLOAD_BASE_DIR / folder
    local_dir.mkdir(parents=True, exist_ok=True)
    
    # Flatten path for local storage
    safe_filename = file_path.replace("/", "_")
    full_path = local_dir / safe_filename
    
    try:
        # Reset file position
        await file.seek(0)
        content = await file.read()
        
        with open(full_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Saved file locally: {full_path}")
        return safe_filename, f"/uploads/{folder}/{safe_filename}"
    
    except Exception as e:
        logger.error(f"Local upload failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to save file"
        )


async def _local_download(folder: str, file_path: str) -> bytes:
    """
    Fallback local file download.
    
    Args:
        folder: Subfolder (audio, resumes)
        file_path: File path
    
    Returns:
        File content as bytes
    """
    safe_filename = file_path.replace("/", "_")
    full_path = UPLOAD_BASE_DIR / folder / safe_filename
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(full_path, "rb") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Local download failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to read file")


async def _local_delete(folder: str, file_path: str) -> bool:
    """
    Fallback local file deletion.
    
    Args:
        folder: Subfolder (audio, resumes)
        file_path: File path
    
    Returns:
        True if deleted successfully
    """
    safe_filename = file_path.replace("/", "_")
    full_path = UPLOAD_BASE_DIR / folder / safe_filename
    
    try:
        if full_path.exists():
            os.remove(full_path)
            logger.info(f"Deleted local file: {full_path}")
            return True
        return False
    except Exception as e:
        logger.error(f"Local delete failed: {e}")
        return False


# ===========================================
# Storage Bucket Initialization
# ===========================================

def init_storage_buckets():
    """
    Initialize storage buckets if they don't exist.
    
    Call this on application startup.
    """
    storage = get_storage_client()
    
    if not storage:
        # Create local directories as fallback
        (UPLOAD_BASE_DIR / "audio").mkdir(parents=True, exist_ok=True)
        (UPLOAD_BASE_DIR / "resumes").mkdir(parents=True, exist_ok=True)
        logger.info("Created local upload directories")
        return
    
    try:
        # List existing buckets
        existing = [b.name for b in storage.list_buckets()]
        
        # Create audio bucket if needed
        if AUDIO_BUCKET not in existing:
            storage.create_bucket(AUDIO_BUCKET, options={
                "public": False,  # Private bucket
                "file_size_limit": 50 * 1024 * 1024  # 50MB limit
            })
            logger.info(f"Created storage bucket: {AUDIO_BUCKET}")
        
        # Create resume bucket if needed
        if RESUME_BUCKET not in existing:
            storage.create_bucket(RESUME_BUCKET, options={
                "public": False,
                "file_size_limit": 10 * 1024 * 1024  # 10MB limit
            })
            logger.info(f"Created storage bucket: {RESUME_BUCKET}")
    
    except Exception as e:
        logger.error(f"Failed to initialize storage buckets: {e}")
        # Create local fallback
        (UPLOAD_BASE_DIR / "audio").mkdir(parents=True, exist_ok=True)
        (UPLOAD_BASE_DIR / "resumes").mkdir(parents=True, exist_ok=True)
