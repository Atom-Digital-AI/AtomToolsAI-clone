#!/usr/bin/env python3
"""
Test script to verify that all improvements are working correctly
"""

import sys
import os
import unittest
from unittest.mock import Mock, patch

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all new modules can be imported."""
    print("Testing imports...")
    
    try:
        from config import Config
        print("✓ Config module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import Config: {e}")
        return False
    
    try:
        from utils.validators import validate_url, validate_keywords, validate_brand_name
        print("✓ Validators module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import validators: {e}")
        return False
    
    try:
        from utils.logger import setup_logger
        print("✓ Logger module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import logger: {e}")
        return False
    
    try:
        from services.openai_service import OpenAIService
        print("✓ OpenAI service module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import OpenAI service: {e}")
        return False
    
    return True

def test_validators():
    """Test the validation functions."""
    print("\nTesting validators...")
    
    from utils.validators import validate_url, validate_keywords, validate_brand_name
    
    # Test URL validation
    assert validate_url("https://example.com")[0] == True, "Valid URL should pass"
    assert validate_url("not-a-url")[0] == False, "Invalid URL should fail"
    print("✓ URL validation working")
    
    # Test keyword validation
    assert validate_keywords("software, business tools")[0] == True, "Valid keywords should pass"
    assert validate_keywords("")[0] == False, "Empty keywords should fail"
    print("✓ Keyword validation working")
    
    # Test brand name validation
    assert validate_brand_name("TechCorp")[0] == True, "Valid brand name should pass"
    assert validate_brand_name("")[0] == False, "Empty brand name should fail"
    print("✓ Brand name validation working")

def test_config():
    """Test the configuration module."""
    print("\nTesting configuration...")
    
    from config import Config
    
    # Test that config has required attributes
    assert hasattr(Config, 'SECRET_KEY'), "Config should have SECRET_KEY"
    assert hasattr(Config, 'OPENAI_API_KEY'), "Config should have OPENAI_API_KEY"
    print("✓ Configuration structure correct")

def test_logger():
    """Test the logging functionality."""
    print("\nTesting logger...")
    
    from utils.logger import setup_logger
    
    # Test logger creation
    logger = setup_logger('test_logger')
    assert logger is not None, "Logger should be created"
    print("✓ Logger creation working")

def test_app_integration():
    """Test that the app can be imported and basic functionality works."""
    print("\nTesting app integration...")
    
    try:
        # Import the app (this will test all the new integrations)
        from app import app, fetch_url_content, extract_text_from_html
        
        # Test that the app is created
        assert app is not None, "Flask app should be created"
        print("✓ Flask app created successfully")
        
        # Test that new functions are available
        assert callable(fetch_url_content), "fetch_url_content should be callable"
        assert callable(extract_text_from_html), "extract_text_from_html should be callable"
        print("✓ New functions available")
        
    except Exception as e:
        print(f"✗ App integration test failed: {e}")
        return False
    
    return True

def test_backward_compatibility():
    """Test that the app maintains backward compatibility."""
    print("\nTesting backward compatibility...")
    
    try:
        from app import get_openai_api_key, detect_language, get_language_prompt
        
        # Test that legacy functions still exist
        assert callable(get_openai_api_key), "get_openai_api_key should still exist"
        assert callable(detect_language), "detect_language should still exist"
        assert callable(get_language_prompt), "get_language_prompt should still exist"
        print("✓ Legacy functions still available")
        
    except Exception as e:
        print(f"✗ Backward compatibility test failed: {e}")
        return False
    
    return True

def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing Ad Copy Generator App Improvements")
    print("=" * 60)
    
    tests = [
        ("Import Tests", test_imports),
        ("Validator Tests", test_validators),
        ("Config Tests", test_config),
        ("Logger Tests", test_logger),
        ("App Integration Tests", test_app_integration),
        ("Backward Compatibility Tests", test_backward_compatibility),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * 40)
        try:
            if test_func():
                passed += 1
                print(f"✓ {test_name} PASSED")
            else:
                print(f"✗ {test_name} FAILED")
        except Exception as e:
            print(f"✗ {test_name} FAILED with exception: {e}")
    
    print("\n" + "=" * 60)
    print(f"Test Results: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("🎉 All tests passed! Improvements are working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
