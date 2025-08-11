#!/usr/bin/env python3
"""
Test script for language detection functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import detect_language, get_language_prompt

def test_language_detection():
    """Test language detection with various languages"""
    
    test_cases = [
        ("Hello world, this is a test", "en"),
        ("Hallo Welt, das ist ein Test", "de"),
        ("Bonjour le monde, c'est un test", "fr"),
        ("Hola mundo, esto es una prueba", "es"),
        ("Ciao mondo, questo è un test", "it"),
        ("Olá mundo, isto é um teste", "pt"),
        ("Hallo wereld, dit is een test", "nl"),
        ("Cześć świecie, to jest test", "pl"),
        ("Привет мир, это тест", "ru"),
        ("こんにちは世界、これはテストです", "ja"),
        ("안녕하세요 세계, 이것은 테스트입니다", "ko"),
        ("你好世界，这是一个测试", "zh"),
        ("مرحبا بالعالم، هذا اختبار", "ar"),
        ("नमस्ते दुनिया, यह एक परीक्षण है", "hi"),
        ("Merhaba dünya, bu bir test", "tr"),
        ("Hej världen, detta är ett test", "sv"),
        ("Hej verden, dette er en test", "da"),
        ("Hei verden, dette er en test", "no"),
        ("Hei maailma, tämä on testi", "fi"),
        ("Ahoj světe, toto je test", "cs"),
        ("Ahoj svet, toto je test", "sk"),
        ("Üdvözlet világ, ez egy teszt", "hu"),
        ("Salut lume, acesta este un test", "ro"),
        ("Здравей свят, това е тест", "bg"),
        ("Pozdrav svijete, ovo je test", "hr"),
        ("Pozdravljen svet, to je test", "sl"),
        ("Tere maailm, see on test", "et"),
        ("Sveiki pasauli, tai yra testas", "lt"),
        ("Sveiki, pasauli, šis ir tests", "lv"),
        ("Bonġu dinja, dan huwa test", "mt"),
        ("Γεια σου κόσμε, αυτό είναι ένα τεστ", "el"),
        ("שלום עולם, זהו מבחן", "he"),
        ("สวัสดีชาวโลก นี่คือการทดสอบ", "th"),
        ("Xin chào thế giới, đây là một bài kiểm tra", "vi"),
        ("Halo dunia, ini adalah tes", "id"),
        ("Halo dunia, ini adalah ujian", "ms"),
        ("Hello world, ito ay isang pagsubok", "tl"),
        ("হ্যালো বিশ্ব, এটি একটি পরীক্ষা", "bn"),
        ("ہیلو دنیا، یہ ایک ٹیسٹ ہے", "ur"),
        ("سلام دنیا، این یک تست است", "fa"),
        ("नमस्ते संसार, यो एक परीक्षण हो", "ne"),
        ("ආයුබෝවන් ලෝකය, මෙය පරීක්ෂණයකි", "si"),
        ("မင်္ဂလာပါကမ္ဘာလောက၊ ဒါဟာ စမ်းသပ်မှုတစ်ခုပါ", "my"),
        ("សួostរបស់ពិភពលោក នេះគឺជាការធ្វើតេស្ត", "km"),
        ("ສະບາຍດີໂລກ, ນີ້ແມ່ນການທົດສອບ", "lo"),
        ("Сайн байна уу дэлхий, энэ бол тест юм", "mn"),
        ("გამარჯობა მსოფლიო, ეს არის ტესტი", "ka"),
        ("ሊት አዝማች ነው፣ ይህ ፈተና ነው", "am"),
        ("Hujambo ulimwengu, hii ni jaribio", "swef"),
        ("Sawubona mhlaba, lokhu kuhlolo", "zu"),
        ("Hallo wêreld, dit is 'n toets", "af"),
        ("Halló heimur, þetta er prófun", "is"),
        ("Dia duit a domhain, is tástáil é seo", "ga"),
        ("Helo byd, mae hwn yn brawf", "cy"),
        ("Kaixo mundua, hau proba bat da", "eu"),
        ("Hola món, això és una prova", "ca"),
        ("Ola mundo, isto é unha proba", "gl"),
        ("Përshëndetje botë, ky është një test", "sq"),
        ("Здраво свету, ова е тест", "mk"),
        ("Здраво свете, ово је тест", "sr"),
        ("Zdravo svijete, ovo je test", "bs"),
        ("Zdravo svijete, ovo je test", "me")
    ]
    
    print("Testing language detection...")
    print("=" * 50)
    
    correct = 0
    total = len(test_cases)
    
    for text, expected_lang in test_cases:
        detected_lang = detect_language(text)
        prompt = get_language_prompt(detected_lang)
        
        status = "✓" if detected_lang == expected_lang else "✗"
        if detected_lang == expected_lang:
            correct += 1
            
        print(f"{status} Text: {text[:30]}...")
        print(f"   Expected: {expected_lang}, Detected: {detected_lang}")
        print(f"   Prompt: {prompt}")
        print()
    
    accuracy = (correct / total) * 100
    print(f"Accuracy: {correct}/{total} ({accuracy:.1f}%)")
    
    if accuracy >= 80:
        print("✓ Language detection is working well!")
    elif accuracy >= 60:
        print("⚠ Language detection is working but could be improved.")
    else:
        print("✗ Language detection needs improvement.")

if __name__ == "__main__":
    test_language_detection() 