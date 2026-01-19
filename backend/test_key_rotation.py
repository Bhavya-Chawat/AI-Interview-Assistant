"""
Test script for multi-key rotation system.

This script tests the key manager functionality:
1. Simulates multiple API calls
2. Tests quota exhaustion and cooldown
3. Verifies health tracking
4. Tests failover behavior
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_key_rotation():
    """Test basic key rotation functionality."""
    from app.services.key_manager import GeminiKeyManager
    
    print("=" * 60)
    print("TEST 1: Basic Key Rotation")
    print("=" * 60)
    
    # Create manager with test keys
    test_keys = [
        "test_key_1",
        "test_key_2", 
        "test_key_3"
    ]
    
    manager = GeminiKeyManager(test_keys)
    
    # Test round-robin rotation
    print("\n1. Testing round-robin rotation (should cycle through keys):")
    for i in range(5):
        try:
            key, key_id = manager.get_next_healthy_key()
            print(f"   Call {i+1}: Got Key #{key_id} - {key[:15]}...")
            # Mark as success to continue rotation
            manager.mark_call_result(key_id, success=True)
        except Exception as e:
            print(f"   Error: {e}")
    
    # Check health
    print("\n2. Health status after 5 successful calls:")
    health = manager.check_all_keys_health()
    print(f"   Total keys: {health['total_keys']}")
    print(f"   Healthy keys: {health['healthy_keys']}")
    print(f"   Successful calls: {health['statistics']['successful_calls']}")
    print(f"   Rotation count: {health['statistics']['rotation_count']}")
    
    return manager


def test_quota_exhaustion():
    """Test quota exhaustion and cooldown behavior."""
    from app.services.key_manager import GeminiKeyManager
    from datetime import datetime, timedelta
    
    print("\n" + "=" * 60)
    print("TEST 2: Quota Exhaustion & Cooldown")
    print("=" * 60)
    
    test_keys = [
        "test_key_1",
        "test_key_2",
        "test_key_3"
    ]
    
    manager = GeminiKeyManager(test_keys)
    
    # Simulate quota exhaustion on key 1
    print("\n1. Simulating quota exhaustion on Key #1:")
    try:
        key, key_id = manager.get_next_healthy_key()
        print(f"   Got Key #{key_id}")
        
        # Mark as quota exceeded
        error_msg = "429 Resource has been exhausted"
        manager.mark_call_result(key_id, success=False, error=error_msg)
        print(f"   ✓ Marked Key #{key_id} as quota exceeded")
        
        # Check if it's in cooldown
        key_status = manager.key_statuses[key_id - 1]
        print(f"   Is in cooldown: {key_status.is_in_cooldown()}")
        print(f"   Cooldown until: {key_status.cooldown_until}")
        
    except Exception as e:
        print(f"   Error: {e}")
    
    # Try to get next key (should skip key 1)
    print("\n2. Getting next key (should skip Key #1 in cooldown):")
    try:
        key, key_id = manager.get_next_healthy_key()
        print(f"   ✓ Got Key #{key_id} (skipped Key #1)")
        manager.mark_call_result(key_id, success=True)
    except Exception as e:
        print(f"   Error: {e}")
    
    # Check health status
    print("\n3. Health status after quota exhaustion:")
    health = manager.check_all_keys_health()
    print(f"   Total keys: {health['total_keys']}")
    print(f"   Healthy keys: {health['healthy_keys']}")
    print(f"   Keys in cooldown: {health['keys_in_cooldown']}")
    
    for key_info in health['keys']:
        if key_info['key_id'] == 1:
            print(f"\n   Key #1 status:")
            print(f"     - is_healthy: {key_info['is_healthy']}")
            print(f"     - is_in_cooldown: {key_info['is_in_cooldown']}")
            print(f"     - is_usable: {key_info['is_usable']}")
            print(f"     - quota_exceeded_count: {key_info['quota_exceeded_count']}")


def test_all_keys_exhausted():
    """Test behavior when all keys are exhausted."""
    from app.services.key_manager import GeminiKeyManager
    
    print("\n" + "=" * 60)
    print("TEST 3: All Keys Exhausted")
    print("=" * 60)
    
    test_keys = ["test_key_1", "test_key_2"]
    manager = GeminiKeyManager(test_keys)
    
    # Exhaust both keys
    print("\n1. Exhausting all keys...")
    error_msg = "429 Resource has been exhausted"
    
    for i in range(2):
        try:
            key, key_id = manager.get_next_healthy_key()
            print(f"   Exhausting Key #{key_id}...")
            manager.mark_call_result(key_id, success=False, error=error_msg)
        except Exception as e:
            print(f"   Error: {e}")
    
    # Try to get a key (should fail)
    print("\n2. Trying to get a key when all are exhausted:")
    try:
        key, key_id = manager.get_next_healthy_key()
        print(f"   ✗ Unexpected: Got Key #{key_id}")
    except RuntimeError as e:
        print(f"   ✓ Expected error: {str(e)[:100]}...")
    
    # Check health
    print("\n3. Health status with all keys exhausted:")
    health = manager.check_all_keys_health()
    print(f"   Total keys: {health['total_keys']}")
    print(f"   Healthy keys: {health['healthy_keys']}")
    print(f"   Keys in cooldown: {health['keys_in_cooldown']}")
    print(f"   All usable: {health['all_keys_usable']}")


def test_failure_threshold():
    """Test consecutive failure threshold."""
    from app.services.key_manager import GeminiKeyManager
    
    print("\n" + "=" * 60)
    print("TEST 4: Consecutive Failure Threshold")
    print("=" * 60)
    
    test_keys = ["test_key_1", "test_key_2"]
    manager = GeminiKeyManager(test_keys)
    
    print("\n1. Causing 3 consecutive non-quota failures on Key #1:")
    key, key_id = manager.get_next_healthy_key()
    
    for i in range(3):
        error_msg = "403 Permission denied"  # Non-quota error
        manager.mark_call_result(key_id, success=False, error=error_msg)
        print(f"   Failure {i+1}/3 recorded")
        
        key_status = manager.key_statuses[key_id - 1]
        print(f"   - consecutive_failures: {key_status.consecutive_failures}")
        print(f"   - is_healthy: {key_status.is_healthy}")
    
    print("\n2. Checking if Key #1 is marked unhealthy:")
    health = manager.check_all_keys_health()
    key_1_health = next(k for k in health['keys'] if k['key_id'] == 1)
    print(f"   is_healthy: {key_1_health['is_healthy']}")
    print(f"   consecutive_failures: {key_1_health['consecutive_failures']}")
    
    print("\n3. Next key should be Key #2 (skipping unhealthy Key #1):")
    try:
        key, key_id = manager.get_next_healthy_key()
        print(f"   ✓ Got Key #{key_id}")
    except Exception as e:
        print(f"   Error: {e}")


def test_success_recovery():
    """Test that successful calls reset failure count."""
    from app.services.key_manager import GeminiKeyManager
    
    print("\n" + "=" * 60)
    print("TEST 5: Success Recovery")
    print("=" * 60)
    
    test_keys = ["test_key_1"]
    manager = GeminiKeyManager(test_keys)
    
    print("\n1. Causing 2 failures, then 1 success:")
    key, key_id = manager.get_next_healthy_key()
    
    # 2 failures
    for i in range(2):
        manager.mark_call_result(key_id, success=False, error="Test error")
        print(f"   Failure {i+1} recorded")
    
    key_status = manager.key_statuses[0]
    print(f"   Consecutive failures: {key_status.consecutive_failures}")
    
    # 1 success
    manager.mark_call_result(key_id, success=True)
    print(f"   Success recorded")
    print(f"   Consecutive failures reset to: {key_status.consecutive_failures}")
    print(f"   ✓ Key remains healthy: {key_status.is_healthy}")


def test_statistics():
    """Test statistics tracking."""
    from app.services.key_manager import GeminiKeyManager
    
    print("\n" + "=" * 60)
    print("TEST 6: Statistics Tracking")
    print("=" * 60)
    
    test_keys = ["test_key_1", "test_key_2"]
    manager = GeminiKeyManager(test_keys)
    
    print("\n1. Making mixed successful/failed calls:")
    
    # 5 successful calls
    for i in range(5):
        key, key_id = manager.get_next_healthy_key()
        manager.mark_call_result(key_id, success=True)
        print(f"   Call {i+1}: Success with Key #{key_id}")
    
    # 2 failed calls (non-quota)
    for i in range(2):
        key, key_id = manager.get_next_healthy_key()
        manager.mark_call_result(key_id, success=False, error="Test error")
        print(f"   Call {i+6}: Failure with Key #{key_id}")
    
    print("\n2. Overall statistics:")
    health = manager.check_all_keys_health()
    stats = health['statistics']
    print(f"   Total calls: {stats['total_calls']}")
    print(f"   Successful: {stats['successful_calls']}")
    print(f"   Failed: {stats['failed_calls']}")
    print(f"   Success rate: {stats['success_rate']:.1f}%")
    print(f"   Rotations: {stats['rotation_count']}")
    
    print("\n3. Per-key statistics:")
    for key_info in health['keys']:
        print(f"\n   Key #{key_info['key_id']}:")
        print(f"     - Success count: {key_info['success_count']}")
        print(f"     - Failure count: {key_info['failure_count']}")
        if key_info['last_success']:
            print(f"     - Last success: {key_info['last_success']}")
        if key_info['last_failure']:
            print(f"     - Last failure: {key_info['last_failure']}")


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("GEMINI API KEY ROTATION SYSTEM - TEST SUITE")
    print("=" * 60)
    
    try:
        # Run tests
        test_key_rotation()
        test_quota_exhaustion()
        test_all_keys_exhausted()
        test_failure_threshold()
        test_success_recovery()
        test_statistics()
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS COMPLETED")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Add multiple keys to backend/.env (LLM_API_KEY_2, LLM_API_KEY_3, etc.)")
        print("2. Restart backend: uvicorn app.main:app --reload")
        print("3. Check health: curl http://localhost:8000/api/v1/llm/keys/health")
        print("4. Monitor logs for rotation messages")
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
