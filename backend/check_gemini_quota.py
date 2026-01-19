"""
Gemini API Quota Checker

This utility script tests your Gemini API connection and displays quota status.
Run this script whenever you suspect quota issues.

Usage:
    python check_gemini_quota.py
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    import google.generativeai as genai
    from app.config import settings
except ImportError as e:
    print("❌ Error: Missing required packages")
    print(f"   {e}")
    print("\n💡 Solution: Run 'pip install google-generativeai python-dotenv pydantic-settings'")
    sys.exit(1)


def check_quota():
    """Test Gemini API and display status."""
    
    print("=" * 70)
    print("🔍 GEMINI API QUOTA CHECKER")
    print("=" * 70)
    
    # Check API key configuration
    print("\n📋 Configuration:")
    print(f"   Provider: {settings.llm_provider}")
    print(f"   Model: {settings.llm_model}")
    
    if not settings.llm_api_key:
        print("   API Key: ❌ NOT CONFIGURED")
        print("\n💡 Solution:")
        print("   1. Create a .env file in the backend/ directory")
        print("   2. Add: LLM_API_KEY=your_gemini_api_key_here")
        print("   3. Get your key from: https://aistudio.google.com/apikey")
        return
    
    print(f"   API Key: ✅ Configured ({settings.llm_api_key[:20]}...)")
    
    # Test API connection
    print("\n🧪 Testing API Connection:")
    print("   Sending test request to Gemini...")
    
    try:
        genai.configure(api_key=settings.llm_api_key)
        model = genai.GenerativeModel(settings.llm_model)
        
        response = model.generate_content(
            "Respond with just the word 'SUCCESS' if you can read this.",
            generation_config={"max_output_tokens": 10}
        )
        
        print(f"   Response: {response.text.strip()}")
        print("\n✅ SUCCESS: Gemini API is working!")
        print("\n📊 Quota Status:")
        print("   Status: ACTIVE - You have remaining quota")
        print("   Free Tier Limits:")
        print("      • 15 requests per minute")
        print("      • 1,500 requests per day")
        print("      • 1 million tokens per minute")
        print("\n💡 Your AI feedback should work now!")
        
    except Exception as e:
        error_msg = str(e)
        print(f"   ❌ Error: {error_msg}")
        
        # Parse specific error types
        if "429" in error_msg or "ResourceExhausted" in error_msg or "Quota exceeded" in error_msg:
            print("\n🚨 QUOTA EXCEEDED:")
            print("   Your free tier daily limit (1,500 requests) has been reached.")
            
            if "limit: 0" in error_msg:
                print("   Current limit: 0 requests remaining")
            
            print("\n💡 Solutions (Choose ONE):")
            print("\n   Option 1: Create New API Key (RECOMMENDED - Immediate)")
            print("   ─────────────────────────────────────────────")
            print("      1. Go to: https://aistudio.google.com/apikey")
            print("      2. Click 'Create API key in new project'")
            print("      3. Copy the new key")
            print("      4. Update backend/.env:")
            print("         LLM_API_KEY=your_new_api_key_here")
            print("      5. Restart your backend server")
            print("      ✅ Fresh 1,500 requests/day quota immediately")
            
            print("\n   Option 2: Wait for Reset (Automatic)")
            print("   ─────────────────────────────────────────────")
            print("      • Quota resets at midnight Pacific Time (PST/PDT)")
            print("      • No action needed, just wait")
            print("      • Check back in a few hours")
            
            print("\n   Option 3: Enable Billing (Unlimited)")
            print("   ─────────────────────────────────────────────")
            print("      1. Go to: https://console.cloud.google.com/")
            print("      2. Select your project")
            print("      3. Go to 'Billing' and enable it")
            print("      4. Very low cost (~$0.00025 per 1K tokens)")
            print("      5. No more daily limits")
            
        elif "400" in error_msg or "API_KEY_INVALID" in error_msg or "InvalidArgument" in error_msg:
            print("\n🚨 INVALID API KEY:")
            print("   The API key is not valid or doesn't have access to this model.")
            print("\n💡 Solution:")
            print("      1. Go to: https://aistudio.google.com/apikey")
            print("      2. Create a new API key")
            print("      3. Make sure you're using gemini-2.0-flash model")
            print("      4. Update backend/.env:")
            print("         LLM_API_KEY=your_new_api_key_here")
            print("         LLM_MODEL=gemini-2.0-flash")
            
        elif "403" in error_msg or "PermissionDenied" in error_msg:
            print("\n🚨 PERMISSION DENIED:")
            print("   The API key doesn't have permission to use Gemini API.")
            print("\n💡 Solution:")
            print("      1. Go to: https://console.cloud.google.com/")
            print("      2. Enable 'Generative Language API'")
            print("      3. Or create a new API key at: https://aistudio.google.com/apikey")
            
        else:
            print("\n🚨 UNKNOWN ERROR:")
            print("   An unexpected error occurred.")
            print("\n💡 Solution:")
            print("      1. Check your internet connection")
            print("      2. Try creating a new API key: https://aistudio.google.com/apikey")
            print("      3. Verify the model name in backend/.env: LLM_MODEL=gemini-2.0-flash")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    check_quota()
