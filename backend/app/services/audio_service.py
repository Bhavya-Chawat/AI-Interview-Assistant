"""
AI Interview Feedback MVP - Audio Service

This module handles audio file processing:
- Audio format detection and conversion
- Duration calculation
- Audio validation

Author: Member 2 (ML Engine)

Key Functions:
    - convert_audio_if_needed(path): Convert to WAV if needed
    - get_audio_duration(path): Get audio duration in seconds
    - validate_audio_file(path): Validate audio file
"""

import os
import wave
import struct
from typing import Optional, Tuple


# ===========================================
# Audio Duration Calculation
# ===========================================

def get_audio_duration(file_path: str) -> float:
    """
    Get the duration of an audio file in seconds.
    
    Supports WAV files natively. For other formats,
    attempts to use pydub for conversion.
    
    Args:
        file_path: Path to the audio file
    
    Returns:
        float: Duration in seconds
    
    Example:
        >>> duration = get_audio_duration("recording.wav")
        >>> print(f"Duration: {duration:.2f} seconds")
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")
    
    ext = os.path.splitext(file_path)[1].lower()
    
    # Try WAV-specific handling first
    if ext == '.wav':
        return _get_wav_duration(file_path)
    
    # For other formats, try pydub
    return _get_duration_with_pydub(file_path)


def _get_wav_duration(file_path: str) -> float:
    """
    Get duration of a WAV file using wave module.
    
    Args:
        file_path: Path to WAV file
    
    Returns:
        float: Duration in seconds
    """
    try:
        with wave.open(file_path, 'rb') as wav:
            frames = wav.getnframes()
            rate = wav.getframerate()
            duration = frames / float(rate)
            return duration
    except Exception as e:
        print(f"Error reading WAV file: {e}")
        # Fallback to pydub
        return _get_duration_with_pydub(file_path)


def _get_duration_with_pydub(file_path: str) -> float:
    """
    Get duration using pydub (supports multiple formats).
    
    Args:
        file_path: Path to audio file
    
    Returns:
        float: Duration in seconds
    """
    try:
        from pydub import AudioSegment
        
        ext = os.path.splitext(file_path)[1].lower().replace('.', '')
        
        # Map extensions to pydub format names
        format_map = {
            'wav': 'wav',
            'mp3': 'mp3',
            'm4a': 'm4a',
            'webm': 'webm',
            'ogg': 'ogg'
        }
        
        audio_format = format_map.get(ext, ext)
        
        audio = AudioSegment.from_file(file_path, format=audio_format)
        duration_seconds = len(audio) / 1000.0
        
        return duration_seconds
    
    except Exception as e:
        print(f"Error getting audio duration with pydub: {e}")
        # Return a default duration for fallback
        return 30.0  # Assume 30 seconds as fallback


# ===========================================
# Audio Format Conversion
# ===========================================

def convert_audio_if_needed(file_path: str) -> str:
    """
    Convert audio file to WAV format if needed.
    
    Speech recognition works best with WAV format at 16kHz.
    This function converts other formats to WAV.
    
    Args:
        file_path: Path to the audio file
    
    Returns:
        str: Path to the WAV file (same as input if already WAV)
    
    Example:
        >>> wav_path = convert_audio_if_needed("recording.mp3")
        >>> print(f"WAV file: {wav_path}")
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    # If already WAV, return as-is
    if ext == '.wav':
        return file_path
    
    # Convert to WAV
    return _convert_to_wav(file_path)


def _convert_to_wav(file_path: str) -> str:
    """
    Convert an audio file to WAV format using pydub.
    
    Args:
        file_path: Path to source audio file
    
    Returns:
        str: Path to converted WAV file
    """
    try:
        from pydub import AudioSegment
        
        ext = os.path.splitext(file_path)[1].lower().replace('.', '')
        
        # Load audio file
        audio = AudioSegment.from_file(file_path, format=ext)
        
        # Convert to mono 16kHz for better speech recognition
        audio = audio.set_channels(1)
        audio = audio.set_frame_rate(16000)
        
        # Generate output path
        output_path = os.path.splitext(file_path)[0] + "_converted.wav"
        
        # Export as WAV
        audio.export(output_path, format="wav")
        
        return output_path
    
    except Exception as e:
        print(f"Error converting audio to WAV: {e}")
        # Return original path if conversion fails
        return file_path


def preprocess_audio_for_transcription(file_path: str) -> str:
    """
    Apply noise reduction and normalization for better transcription.
    
    This function:
    - Normalizes audio volume levels
    - Applies high-pass filter to reduce low-frequency noise (HVAC, rumble)
    - Converts to optimal format for speech recognition
    
    Args:
        file_path: Path to the audio file
    
    Returns:
        str: Path to the preprocessed audio file
    
    Example:
        >>> clean_path = preprocess_audio_for_transcription("recording.wav")
        >>> print(f"Preprocessed file: {clean_path}")
    """
    try:
        from pydub import AudioSegment
        from pydub.effects import normalize, high_pass_filter
        
        # Load audio file
        ext = os.path.splitext(file_path)[1].lower().replace('.', '')
        audio = AudioSegment.from_file(file_path, format=ext if ext else 'wav')
        
        # Convert to mono for speech recognition
        audio = audio.set_channels(1)
        
        # Set optimal sample rate for speech recognition
        audio = audio.set_frame_rate(16000)
        
        # Apply high-pass filter to remove low-frequency noise
        # (removes rumble, HVAC noise, etc. below 100Hz)
        audio = high_pass_filter(audio, cutoff=100)
        
        # Normalize volume to consistent level
        audio = normalize(audio)
        
        # Generate output path
        base_name = os.path.splitext(file_path)[0]
        output_path = f"{base_name}_preprocessed.wav"
        
        # Export as WAV with optimal settings
        audio.export(
            output_path,
            format="wav",
            parameters=["-ac", "1", "-ar", "16000"]  # Mono, 16kHz
        )
        
        print(f"✅ Audio preprocessed: {output_path}")
        return output_path
    
    except ImportError:
        print("⚠️ pydub not available for preprocessing, using original file")
        return file_path
    except Exception as e:
        print(f"⚠️ Audio preprocessing failed: {e}, using original file")
        return file_path


# ===========================================
# Audio Validation
# ===========================================

def validate_audio_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """
    Validate an audio file for processing.
    
    Checks:
    - File exists
    - File is not empty
    - File can be read as audio
    - Duration is reasonable (1 second - 5 minutes)
    
    Args:
        file_path: Path to the audio file
    
    Returns:
        Tuple[bool, Optional[str]]: 
            - True/False for validity
            - Error message if invalid, None if valid
    
    Example:
        >>> is_valid, error = validate_audio_file("recording.wav")
        >>> if not is_valid:
        ...     print(f"Invalid: {error}")
    """
    # Check file exists
    if not os.path.exists(file_path):
        return False, "File does not exist"
    
    # Check file size
    file_size = os.path.getsize(file_path)
    if file_size == 0:
        return False, "File is empty"
    
    if file_size < 1000:  # Less than 1KB
        return False, "File too small to be valid audio"
    
    # Try to get duration
    try:
        duration = get_audio_duration(file_path)
        
        if duration < 1.0:
            return False, "Audio too short (minimum 1 second)"
        
        if duration > 300.0:  # 5 minutes
            return False, "Audio too long (maximum 5 minutes)"
        
    except Exception as e:
        return False, f"Could not read audio file: {str(e)}"
    
    return True, None


def get_audio_info(file_path: str) -> dict:
    """
    Get detailed information about an audio file.
    
    Args:
        file_path: Path to the audio file
    
    Returns:
        dict: Audio file information
    """
    info = {
        "path": file_path,
        "exists": os.path.exists(file_path),
        "size_bytes": 0,
        "duration_seconds": 0,
        "format": "",
        "is_valid": False,
        "error": None
    }
    
    if not info["exists"]:
        info["error"] = "File not found"
        return info
    
    info["size_bytes"] = os.path.getsize(file_path)
    info["format"] = os.path.splitext(file_path)[1].lower().replace('.', '')
    
    try:
        info["duration_seconds"] = get_audio_duration(file_path)
        info["is_valid"] = True
    except Exception as e:
        info["error"] = str(e)
    
    return info


# ===========================================
# Audio Quality Analysis (Optional)
# ===========================================

def estimate_audio_quality(file_path: str) -> dict:
    """
    Estimate the quality of an audio recording.
    
    Provides basic quality metrics that might affect
    transcription accuracy.
    
    Args:
        file_path: Path to audio file
    
    Returns:
        dict: Quality metrics
    """
    quality = {
        "duration_adequate": False,
        "file_size_adequate": False,
        "format_supported": False,
        "overall_quality": "unknown"
    }
    
    try:
        duration = get_audio_duration(file_path)
        quality["duration_adequate"] = 5.0 <= duration <= 120.0
        
        size = os.path.getsize(file_path)
        # Expect at least 1KB per second for reasonable quality
        expected_min_size = duration * 1000
        quality["file_size_adequate"] = size >= expected_min_size
        
        ext = os.path.splitext(file_path)[1].lower()
        quality["format_supported"] = ext in ['.wav', '.mp3', '.m4a', '.webm', '.ogg']
        
        # Calculate overall quality
        checks = [
            quality["duration_adequate"],
            quality["file_size_adequate"],
            quality["format_supported"]
        ]
        
        if all(checks):
            quality["overall_quality"] = "good"
        elif sum(checks) >= 2:
            quality["overall_quality"] = "acceptable"
        else:
            quality["overall_quality"] = "poor"
    
    except Exception as e:
        quality["error"] = str(e)
    
    return quality
