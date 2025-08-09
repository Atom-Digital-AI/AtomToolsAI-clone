#!/usr/bin/env python3
"""
Demonstration script for language detection in ad copy generation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import detect_language, get_language_prompt, generate_ad_copy

def demo_language_detection():
    """Demonstrate language detection with ad generation examples"""
    
    # Example content in different languages
    examples = [
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
        },
        {
            "language": "Spanish",
            "url_content": "Bienvenido a nuestra solución de software premium. Ofrecemos las mejores herramientas para sus necesidades comerciales.",
            "keywords": "software, herramientas comerciales, solución premium",
            "brand": "TechCorp",
            "selling_points": "Fácil de usar, soporte 24/7, precios asequibles"
        },
        {
            "language": "Italian",
            "url_content": "Benvenuto nella nostra soluzione software premium. Offriamo i migliori strumenti per le tue esigenze aziendali.",
            "keywords": "software, strumenti aziendali, soluzione premium",
            "brand": "TechCorp",
            "selling_points": "Facile da usare, supporto 24/7, prezzi accessibili"
        }
    ]
    
    print("Language Detection Demo for Ad Copy Generation")
    print("=" * 60)
    print()
    
    for i, example in enumerate(examples, 1):
        print(f"Example {i}: {example['language']}")
        print("-" * 40)
        
        # Combine content for language detection
        content_for_detection = f"{example['url_content']} {example['keywords']} {example['brand']} {example['selling_points']}"
        
        # Detect language
        detected_lang = detect_language(content_for_detection)
        language_instruction = get_language_prompt(detected_lang)
        
        print(f"Detected Language: {detected_lang}")
        print(f"Language Instruction: {language_instruction}")
        print()
        
        # Show what would be sent to the AI
        print("Content that would be analyzed:")
        print(f"URL Content: {example['url_content'][:100]}...")
        print(f"Keywords: {example['keywords']}")
        print(f"Brand: {example['brand']}")
        print(f"Selling Points: {example['selling_points']}")
        print()
        
        print("Expected behavior:")
        print(f"- The AI will generate ad copy in {example['language']}")
        print(f"- Headlines and descriptions will be in {example['language']}")
        print(f"- The content will be culturally appropriate for {example['language']} speakers")
        print()
        print("=" * 60)
        print()

def demo_mixed_language_csv():
    """Demonstrate how the app handles mixed language CSV files"""
    
    print("Mixed Language CSV Handling Demo")
    print("=" * 50)
    print()
    
    # Simulate a CSV with mixed languages
    mixed_csv_data = [
        {
            "campaign": "English Campaign",
            "adgroup": "Software Tools",
            "keyword": "business software",
            "language": "en"
        },
        {
            "campaign": "German Campaign", 
            "adgroup": "Geschäftstools",
            "keyword": "Geschäftssoftware",
            "language": "de"
        },
        {
            "campaign": "French Campaign",
            "adgroup": "Outils Professionnels", 
            "keyword": "logiciel professionnel",
            "language": "fr"
        },
        {
            "campaign": "Spanish Campaign",
            "adgroup": "Herramientas Comerciales",
            "keyword": "software comercial", 
            "language": "es"
        }
    ]
    
    print("Example CSV with mixed languages:")
    print("Campaign Name, Ad Group Name, Target Keyword, Detected Language")
    print("-" * 80)
    
    for row in mixed_csv_data:
        detected = detect_language(f"{row['campaign']} {row['adgroup']} {row['keyword']}")
        print(f"{row['campaign']}, {row['adgroup']}, {row['keyword']}, {detected}")
    
    print()
    print("How the app handles this:")
    print("1. Each row is processed individually")
    print("2. Language is detected for each row's content")
    print("3. Ad copy is generated in the detected language")
    print("4. Output maintains the original language for each row")
    print("5. No manual language selection needed")

if __name__ == "__main__":
    demo_language_detection()
    print()
    demo_mixed_language_csv() 