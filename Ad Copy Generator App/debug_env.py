#!/usr/bin/env python3
"""
Debug script to test environment variable loading
"""

import os
from dotenv import load_dotenv

def test_env_loading():
    """Test if environment variables are loaded correctly"""
    
    print("Testing environment variable loading...")
    print("=" * 50)
    
    # Check if .env file exists
    if os.path.exists('.env'):
        print("✓ .env file exists")
    else:
        print("✗ .env file not found")
        return
    
    # Load environment variables
    load_dotenv()
    
    # Check if API key is loaded
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        print("✓ OPENAI_API_KEY loaded successfully")
        print(f"   Key starts with: {api_key[:20]}...")
        print(f"   Key length: {len(api_key)} characters")
    else:
        print("✗ OPENAI_API_KEY not found in environment")
    
    # Check other environment variables
    google_ads_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if google_ads_id:
        print("✓ GOOGLE_ADS_CUSTOMER_ID loaded successfully")
    else:
        print("✗ GOOGLE_ADS_CUSTOMER_ID not found")
    
    # List all environment variables that start with OPENAI
    openai_vars = [k for k in os.environ.keys() if k.startswith('OPENAI')]
    print(f"\nOpenAI environment variables: {openai_vars}")
    
    # Test if we can access the API key directly
    try:
        import openai
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if openai.api_key:
            print("✓ OpenAI API key set successfully")
        else:
            print("✗ Failed to set OpenAI API key")
    except Exception as e:
        print(f"✗ Error setting OpenAI API key: {e}")

if __name__ == "__main__":
    test_env_loading() 