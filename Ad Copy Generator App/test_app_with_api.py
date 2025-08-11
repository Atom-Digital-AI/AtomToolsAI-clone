#!/usr/bin/env python3
"""
Test script to verify the app works with API key properly loaded
"""

import os
import sys
from dotenv import load_dotenv

def test_app_with_api():
    """Test the app with API key properly loaded"""
    
    print("Testing app with API key...")
    print("=" * 40)
    
    # Load environment variables
    load_dotenv()
    
    # Check API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: No API key found in environment!")
        print("Please check your .env file")
        return False
    
    print(f"✓ API key loaded (length: {len(api_key)})")
    
    # Import and test the app
    try:
        from app import app, generate_ad_copy, detect_language, get_language_prompt
        
        print("✓ App imported successfully")
        
        # Test language detection
        test_text = "Hello world, this is a test"
        detected_lang = detect_language(test_text)
        print(f"✓ Language detection works: '{test_text}' -> {detected_lang}")
        
        # Test language prompt
        prompt = get_language_prompt(detected_lang)
        print(f"✓ Language prompt works: {prompt}")
        
        # Test API call with minimal content
        print("\nTesting API call...")
        result = generate_ad_copy(
            url_content="Test content for API call",
            target_keywords="test, demo",
            brand_name="TestBrand",
            selling_points="Easy to use"
        )
        
        if result:
            print("✓ API call successful!")
            print(f"Result preview: {result[:100]}...")
            return True
        else:
            print("✗ API call failed - no result returned")
            return False
            
    except Exception as e:
        print(f"✗ Error testing app: {e}")
        return False

if __name__ == "__main__":
    success = test_app_with_api()
    if success:
        print("\n✓ All tests passed! The app should work correctly.")
        print("You can now run: python3 run_app.py")
    else:
        print("\n✗ Tests failed. Please check the error messages above.") 