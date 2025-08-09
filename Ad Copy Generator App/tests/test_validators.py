import unittest
from unittest.mock import Mock
import sys
import os

# Add the parent directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.validators import (
    validate_url, validate_keywords, validate_brand_name,
    validate_file_upload, validate_csv_content, sanitize_input
)

class TestValidators(unittest.TestCase):
    """Test cases for validation functions"""
    
    def test_validate_url_valid(self):
        """Test URL validation with valid URLs"""
        valid_urls = [
            "https://example.com",
            "http://www.example.com",
            "https://example.com/path",
            "https://example.com/path?param=value",
            "http://localhost:8080",
            "https://192.168.1.1"
        ]
        
        for url in valid_urls:
            with self.subTest(url=url):
                is_valid, error = validate_url(url)
                self.assertTrue(is_valid, f"URL '{url}' should be valid: {error}")
    
    def test_validate_url_invalid(self):
        """Test URL validation with invalid URLs"""
        invalid_urls = [
            "",
            "not-a-url",
            "ftp://example.com",
            "https://",
            "http://",
            "example.com"
        ]
        
        for url in invalid_urls:
            with self.subTest(url=url):
                is_valid, error = validate_url(url)
                self.assertFalse(is_valid, f"URL '{url}' should be invalid")
                self.assertTrue(error, "Should provide error message")
    
    def test_validate_keywords_valid(self):
        """Test keyword validation with valid keywords"""
        valid_keywords = [
            "software",
            "software, business tools",
            "software, business tools, premium solution",
            "software"
        ]
        
        for keywords in valid_keywords:
            with self.subTest(keywords=keywords):
                is_valid, error = validate_keywords(keywords)
                self.assertTrue(is_valid, f"Keywords '{keywords}' should be valid: {error}")
    
    def test_validate_keywords_invalid(self):
        """Test keyword validation with invalid keywords"""
        invalid_keywords = [
            "",
            "a",  # Too short
            "a" * 101,  # Too long
            "a, b, c"  # All too short
        ]
        
        for keywords in invalid_keywords:
            with self.subTest(keywords=keywords):
                is_valid, error = validate_keywords(keywords)
                self.assertFalse(is_valid, f"Keywords '{keywords}' should be invalid")
                self.assertTrue(error, "Should provide error message")
    
    def test_validate_brand_name_valid(self):
        """Test brand name validation with valid names"""
        valid_names = [
            "TechCorp",
            "My Brand",
            "Brand & Co",
            "Brand123"
        ]
        
        for name in valid_names:
            with self.subTest(name=name):
                is_valid, error = validate_brand_name(name)
                self.assertTrue(is_valid, f"Brand name '{name}' should be valid: {error}")
    
    def test_validate_brand_name_invalid(self):
        """Test brand name validation with invalid names"""
        invalid_names = [
            "",
            "a",  # Too short
            "a" * 51,  # Too long
            "Brand<script>",  # Invalid characters
            "Brand<alert>"
        ]
        
        for name in invalid_names:
            with self.subTest(name=name):
                is_valid, error = validate_brand_name(name)
                self.assertFalse(is_valid, f"Brand name '{name}' should be invalid")
                self.assertTrue(error, "Should provide error message")
    
    def test_validate_file_upload_valid(self):
        """Test file upload validation with valid files"""
        mock_file = Mock()
        mock_file.filename = "test.csv"
        mock_file.seek = Mock()
        mock_file.tell = Mock(return_value=1024)  # 1KB file
        
        is_valid, error = validate_file_upload(mock_file, {'csv', 'txt'})
        self.assertTrue(is_valid, f"File should be valid: {error}")
    
    def test_validate_file_upload_invalid(self):
        """Test file upload validation with invalid files"""
        # Test no file
        is_valid, error = validate_file_upload(None, {'csv'})
        self.assertFalse(is_valid)
        self.assertTrue(error)
        
        # Test invalid extension
        mock_file = Mock()
        mock_file.filename = "test.pdf"
        mock_file.seek = Mock()
        mock_file.tell = Mock(return_value=1024)
        
        is_valid, error = validate_file_upload(mock_file, {'csv'})
        self.assertFalse(is_valid)
        self.assertTrue(error)
        
        # Test file too large
        mock_file = Mock()
        mock_file.filename = "test.csv"
        mock_file.seek = Mock()
        mock_file.tell = Mock(return_value=11 * 1024 * 1024)  # 11MB
        
        is_valid, error = validate_file_upload(mock_file, {'csv'})
        self.assertFalse(is_valid)
        self.assertTrue(error)
    
    def test_validate_csv_content_valid(self):
        """Test CSV content validation with valid content"""
        valid_content = "header1,header2,header3\nvalue1,value2,value3"
        is_valid, error = validate_csv_content(valid_content)
        self.assertTrue(is_valid, f"CSV content should be valid: {error}")
    
    def test_validate_csv_content_invalid(self):
        """Test CSV content validation with invalid content"""
        invalid_content = [
            "",
            "header1",  # No data rows
            "header1\theader2"  # Tab-separated, not comma
        ]
        
        for content in invalid_content:
            with self.subTest(content=content):
                is_valid, error = validate_csv_content(content)
                self.assertFalse(is_valid, f"CSV content should be invalid")
                self.assertTrue(error, "Should provide error message")
    
    def test_sanitize_input(self):
        """Test input sanitization"""
        test_cases = [
            ("<script>alert('xss')</script>", "scriptalertxss"),
            ("Normal text", "Normal text"),
            ("Text with 'quotes'", "Text with quotes"),
            ("Text with \"double quotes\"", "Text with double quotes"),
            ("a" * 2000, "a" * 1000),  # Should be truncated
            ("", "")
        ]
        
        for input_text, expected in test_cases:
            with self.subTest(input_text=input_text):
                result = sanitize_input(input_text)
                self.assertEqual(result, expected)

if __name__ == '__main__':
    unittest.main()
