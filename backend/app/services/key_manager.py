"""
Gemini API Key Rotation Manager

Intelligent key rotation system that:
- Manages multiple Gemini API keys
- Automatically rotates on quota exhaustion
- Tracks health status of each key
- Uses round-robin with health-aware fallback
- Provides monitoring endpoints

Author: AI Interview Assistant Team
"""

import os
import time
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from threading import Lock
import google.generativeai as genai

logger = logging.getLogger(__name__)


@dataclass
class KeyStatus:
    """Track status of a single API key."""
    key: str
    key_id: int
    is_healthy: bool = True
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    failure_count: int = 0
    success_count: int = 0
    quota_exceeded_count: int = 0
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    
    # Cooldown tracking
    cooldown_until: Optional[datetime] = None
    
    def mark_success(self):
        """Mark a successful API call."""
        self.last_success = datetime.utcnow()
        self.success_count += 1
        self.consecutive_failures = 0
        self.is_healthy = True
        self.last_error = None
        self.cooldown_until = None
        
    def mark_failure(self, error: str, is_quota_error: bool = False):
        """Mark a failed API call."""
        self.last_failure = datetime.utcnow()
        self.failure_count += 1
        self.consecutive_failures += 1
        self.last_error = error
        
        if is_quota_error:
            self.quota_exceeded_count += 1
            # Quota exceeded - put in cooldown for 1 hour
            self.cooldown_until = datetime.utcnow() + timedelta(hours=1)
            self.is_healthy = False
            logger.warning(f"Key {self.key_id} quota exceeded. Cooldown until {self.cooldown_until}")
        elif self.consecutive_failures >= 3:
            # Too many consecutive failures - mark unhealthy
            self.is_healthy = False
            logger.warning(f"Key {self.key_id} marked unhealthy after {self.consecutive_failures} failures")
    
    def is_in_cooldown(self) -> bool:
        """Check if key is in cooldown period."""
        if self.cooldown_until:
            return datetime.utcnow() < self.cooldown_until
        return False
    
    def is_usable(self) -> bool:
        """Check if key can be used right now."""
        return self.is_healthy and not self.is_in_cooldown()
    
    def get_masked_key(self) -> str:
        """Return masked version of key for logging."""
        if len(self.key) > 20:
            return f"{self.key[:20]}..."
        return "***"


class GeminiKeyManager:
    """
    Manages rotation and health monitoring of multiple Gemini API keys.
    
    Features:
    - Round-robin rotation with health awareness
    - Automatic fallback on quota/errors
    - Health monitoring and recovery
    - Cooldown periods for quota-exceeded keys
    - Thread-safe operations
    """
    
    def __init__(self, api_keys: List[str]):
        """
        Initialize key manager.
        
        Args:
            api_keys: List of Gemini API keys
        """
        if not api_keys or len(api_keys) == 0:
            raise ValueError("At least one API key is required")
        
        # Remove empty/None keys
        self.api_keys = [key.strip() for key in api_keys if key and key.strip()]
        
        if not self.api_keys:
            raise ValueError("No valid API keys provided")
        
        # Initialize key status tracking
        self.key_statuses: List[KeyStatus] = [
            KeyStatus(key=key, key_id=i+1)
            for i, key in enumerate(self.api_keys)
        ]
        
        # Rotation state
        self.current_index = 0
        self.lock = Lock()
        
        # Stats
        self.total_calls = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.rotation_count = 0
        
        logger.info(f"✓ Initialized GeminiKeyManager with {len(self.api_keys)} keys")
    
    def get_next_healthy_key(self) -> Tuple[str, int]:
        """
        Get the next healthy API key using round-robin with health checks.
        
        Returns:
            Tuple of (api_key, key_id)
            
        Raises:
            RuntimeError: If no healthy keys available
        """
        with self.lock:
            # Try current index first
            attempts = 0
            max_attempts = len(self.key_statuses)
            
            while attempts < max_attempts:
                status = self.key_statuses[self.current_index]
                
                if status.is_usable():
                    key = status.key
                    key_id = status.key_id
                    logger.debug(f"Using key #{key_id} (success: {status.success_count}, failures: {status.failure_count})")
                    
                    # Move to next key for next call (round-robin)
                    self.current_index = (self.current_index + 1) % len(self.key_statuses)
                    if self.current_index == 0:
                        self.rotation_count += 1
                    
                    return key, key_id
                
                # Key not usable, try next
                logger.debug(f"Key #{status.key_id} not usable (healthy: {status.is_healthy}, cooldown: {status.is_in_cooldown()})")
                self.current_index = (self.current_index + 1) % len(self.key_statuses)
                attempts += 1
            
            # No healthy keys available
            # Check if any keys are just in cooldown (might recover soon)
            cooldown_keys = [s for s in self.key_statuses if s.is_in_cooldown()]
            if cooldown_keys:
                earliest_recovery = min(cooldown_keys, key=lambda s: s.cooldown_until)
                raise RuntimeError(
                    f"All {len(self.api_keys)} API keys exhausted. "
                    f"Earliest recovery: Key #{earliest_recovery.key_id} at {earliest_recovery.cooldown_until}"
                )
            
            # All keys unhealthy for other reasons
            raise RuntimeError(
                f"All {len(self.api_keys)} API keys are unhealthy. "
                f"Check your API keys or wait for recovery."
            )
    
    def mark_call_result(self, key_id: int, success: bool, error: Optional[str] = None):
        """
        Mark the result of an API call.
        
        Args:
            key_id: ID of the key that was used
            success: Whether the call succeeded
            error: Error message if failed
        """
        with self.lock:
            self.total_calls += 1
            
            # Find the key status
            status = next((s for s in self.key_statuses if s.key_id == key_id), None)
            if not status:
                logger.error(f"Unknown key_id: {key_id}")
                return
            
            if success:
                status.mark_success()
                self.successful_calls += 1
                logger.debug(f"✓ Key #{key_id} call successful")
            else:
                self.failed_calls += 1
                
                # Check if it's a quota error
                is_quota_error = error and any(
                    indicator in error.lower() 
                    for indicator in ['429', 'quota', 'resource exhausted', 'rate limit']
                )
                
                status.mark_failure(error or "Unknown error", is_quota_error)
                
                if is_quota_error:
                    logger.warning(f"✗ Key #{key_id} quota exceeded: {error}")
                else:
                    logger.error(f"✗ Key #{key_id} call failed: {error}")
    
    def check_all_keys_health(self) -> Dict[str, any]:
        """
        Perform health check on all keys.
        
        Returns:
            Dictionary with health status of all keys
        """
        results = {
            "total_keys": len(self.key_statuses),
            "healthy_keys": 0,
            "cooldown_keys": 0,
            "unhealthy_keys": 0,
            "keys": []
        }
        
        for status in self.key_statuses:
            key_info = {
                "key_id": status.key_id,
                "masked_key": status.get_masked_key(),
                "is_healthy": status.is_healthy,
                "is_usable": status.is_usable(),
                "is_in_cooldown": status.is_in_cooldown(),
                "cooldown_until": status.cooldown_until.isoformat() if status.cooldown_until else None,
                "success_count": status.success_count,
                "failure_count": status.failure_count,
                "quota_exceeded_count": status.quota_exceeded_count,
                "consecutive_failures": status.consecutive_failures,
                "last_success": status.last_success.isoformat() if status.last_success else None,
                "last_failure": status.last_failure.isoformat() if status.last_failure else None,
                "last_error": status.last_error
            }
            
            results["keys"].append(key_info)
            
            if status.is_usable():
                results["healthy_keys"] += 1
            elif status.is_in_cooldown():
                results["cooldown_keys"] += 1
            else:
                results["unhealthy_keys"] += 1
        
        results["statistics"] = {
            "total_calls": self.total_calls,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls,
            "success_rate": (self.successful_calls / self.total_calls * 100) if self.total_calls > 0 else 0,
            "rotation_count": self.rotation_count,
            "current_index": self.current_index
        }
        
        # Add aggregate counts
        results["keys_in_cooldown"] = results["cooldown_keys"]
        results["all_keys_usable"] = results["healthy_keys"] == results["total_keys"]
        
        return results
    
    def reset_key_health(self, key_id: int):
        """Manually reset health status of a key."""
        with self.lock:
            status = next((s for s in self.key_statuses if s.key_id == key_id), None)
            if status:
                status.is_healthy = True
                status.consecutive_failures = 0
                status.cooldown_until = None
                status.last_error = None
                logger.info(f"✓ Reset health for key #{key_id}")
            else:
                logger.error(f"Key #{key_id} not found")


# Global instance (initialized in config)
_key_manager: Optional[GeminiKeyManager] = None


def initialize_key_manager(api_keys: List[str]):
    """Initialize the global key manager."""
    global _key_manager
    _key_manager = GeminiKeyManager(api_keys)
    logger.info(f"✓ Global key manager initialized with {len(api_keys)} keys")


def get_key_manager() -> GeminiKeyManager:
    """Get the global key manager instance."""
    if _key_manager is None:
        raise RuntimeError("Key manager not initialized. Call initialize_key_manager() first.")
    return _key_manager
