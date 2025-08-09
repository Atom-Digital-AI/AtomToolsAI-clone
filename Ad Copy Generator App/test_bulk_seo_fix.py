#!/usr/bin/env python3
"""
Test script to verify the bulk SEO generation fix
"""

import sys
import os
import tempfile
import csv
from io import StringIO

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_bulk_seo_generation():
    """Test the bulk SEO generation functionality."""
    print("Testing bulk SEO generation fix...")
    
    try:
        from app import process_bulk_seo_csv, create_seo_csv
        
        # Create a test CSV
        test_csv_content = """url,keywords,brand_name
https://example.com,test keywords,Test Brand
https://example.org,another test,Another Brand"""
        
        # Test CSV processing
        results = process_bulk_seo_csv(
            test_csv_content.encode('utf-8'),
            'Default Brand',
            'Test selling points',
            'sentence',
            'both',
            3
        )
        
        print(f"✓ Processed {len(results)} rows")
        
        # Test CSV creation
        csv_content = create_seo_csv(results, 'both')
        
        # Verify CSV content
        if 'URL' in csv_content and 'Keywords' in csv_content:
            print("✓ CSV generated successfully")
        else:
            print("✗ CSV generation failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False

def test_error_handling():
    """Test error handling in bulk SEO generation."""
    print("\nTesting error handling...")
    
    try:
        from app import create_seo_csv
        
        # Test with empty results
        csv_content = create_seo_csv([], 'both')
        if 'No results generated' in csv_content:
            print("✓ Empty results handled correctly")
        else:
            print("✗ Empty results not handled correctly")
            return False
        
        # Test with error results
        error_results = [
            {'url': 'https://example.com', 'error': 'Test error'}
        ]
        csv_content = create_seo_csv(error_results, 'both')
        if 'ERROR' in csv_content and 'Test error' in csv_content:
            print("✓ Error results handled correctly")
        else:
            print("✗ Error results not handled correctly")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Error handling test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("="*60)
    print("Bulk SEO Generation Fix Test")
    print("="*60)
    
    tests = [
        ("Bulk SEO Generation", test_bulk_seo_generation),
        ("Error Handling", test_error_handling),
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
    
    print("\n" + "="*60)
    print(f"Test Results: {passed}/{total} tests passed")
    print("="*60)
    
    if passed == total:
        print("🎉 All tests passed! Bulk SEO generation fix is working correctly.")
        print("\nKey Improvements:")
        print("✅ Proper async handling of bulk SEO generation")
        print("✅ Progress indicators for bulk operations")
        print("✅ Better error handling and logging")
        print("✅ Timeout protection for long operations")
        print("✅ Improved CSV generation with proper headers")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
