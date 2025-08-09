#!/usr/bin/env python3
"""
Test script to verify API functionality with language detection
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import detect_language, get_language_prompt, generate_ad_copy

def test_api_functionality():
    """Test the API functionality with language detection"""
    
    print("Testing API functionality with language detection...")
    print("=" * 60)
    
    # Test cases with different languages
    test_cases = [
        {
            "language": "English",
            "url_content": "Welcome to our premium software solution. We offer the best tools for your business needs.",
            "keywords": "software, business tools, premium solution",
            "brand": "TechCorp",
            "selling_points": "Easy to use, 24/7 support, affordable pricing"
        },
        {
            "language": "German",
            "url_content": "Willkommen bei unserer Premium-Softwarelösung. Wir bieten die besten Tools für Ihre Geschäftsanforderungen.",
            "keywords": "Software, Geschäftstools, Premium-Lösung",
            "brand": "TechCorp",
            "selling_points": "Einfach zu bedienen, 24/7 Support, erschwingliche Preise"
        },
        {
            "language": "French",
            "url_content": "Bienvenue dans notre solution logicielle premium. Nous offrons les meilleurs outils pour vos besoins professionnels.",
            "keywords": "logiciel, outils professionnels, solution premium",
            "brand": "TechCorp",
            "selling_points": "Facile à utiliser, support 24/7, prix abordables"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {test_case['language']}")
        print("-" * 40)
        
        # Detect language
        content_for_detection = f"{test_case['url_content']} {test_case['keywords']} {test_case['brand']} {test_case['selling_points']}"
        detected_lang = detect_language(content_for_detection)
        language_instruction = get_language_prompt(detected_lang)
        
        print(f"Detected Language: {detected_lang}")
        print(f"Language Instruction: {language_instruction}")
        
        # Test API call (with a smaller prompt to save tokens)
        print("Testing API call...")
        try:
            # Use a shorter version for testing
            test_url_content = test_case['url_content'][:100] + "..."
            test_keywords = test_case['keywords'][:50]
            
            result = generate_ad_copy(
                url_content=test_url_content,
                target_keywords=test_keywords,
                brand_name=test_case['brand'],
                selling_points=test_case['selling_points'][:50]
            )
            
            if result:
                print("✓ API call successful!")
                print(f"Result preview: {result[:100]}...")
            else:
                print("✗ API call failed - no result returned")
                
        except Exception as e:
            print(f"✗ API call failed with error: {e}")
        
        print()

if __name__ == "__main__":
    test_api_functionality() 