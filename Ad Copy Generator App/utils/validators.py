import re
from urllib.parse import urlparse
from typing import List, Optional, Tuple
from werkzeug.datastructures import FileStorage

def validate_url(url: str) -> Tuple[bool, str]:
    """
    Validate if the provided string is a valid URL.
    
    Args:
        url: The URL string to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not url or not url.strip():
        return False, "URL cannot be empty"
    
    url = url.strip()
    
    # Basic URL pattern validation
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    if not url_pattern.match(url):
        return False, "Invalid URL format"
    
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False, "URL must include scheme and domain"
    except Exception:
        return False, "Invalid URL structure"
    
    return True, ""

def validate_keywords(keywords: str) -> Tuple[bool, str]:
    """
    Validate keyword input.
    
    Args:
        keywords: Comma-separated keywords string
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not keywords or not keywords.strip():
        return False, "Keywords cannot be empty"
    
    # Remove extra whitespace and split
    keyword_list = [kw.strip() for kw in keywords.split(',') if kw.strip()]
    
    if not keyword_list:
        return False, "At least one keyword is required"
    
    # Check for reasonable keyword length
    for keyword in keyword_list:
        if len(keyword) < 2:
            return False, f"Keyword '{keyword}' is too short (minimum 2 characters)"
        if len(keyword) > 100:
            return False, f"Keyword '{keyword}' is too long (maximum 100 characters)"
    
    return True, ""

def validate_brand_name(brand_name: str) -> Tuple[bool, str]:
    """
    Validate brand name input.
    
    Args:
        brand_name: The brand name string
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not brand_name or not brand_name.strip():
        return False, "Brand name cannot be empty"
    
    brand_name = brand_name.strip()
    
    if len(brand_name) < 2:
        return False, "Brand name must be at least 2 characters long"
    
    if len(brand_name) > 50:
        return False, "Brand name must be 50 characters or less"
    
    # Check for reasonable characters
    if not re.match(r'^[a-zA-Z0-9\s\-&\.]+$', brand_name):
        return False, "Brand name contains invalid characters"
    
    return True, ""

def validate_file_upload(file: FileStorage, allowed_extensions: set) -> Tuple[bool, str]:
    """
    Validate uploaded file.
    
    Args:
        file: The uploaded file object
        allowed_extensions: Set of allowed file extensions
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not file or not file.filename:
        return False, "No file selected"
    
    # Check file extension
    if '.' not in file.filename:
        return False, "File must have an extension"
    
    extension = file.filename.rsplit('.', 1)[1].lower()
    if extension not in allowed_extensions:
        return False, f"File type '{extension}' is not allowed. Allowed types: {', '.join(allowed_extensions)}"
    
    # Check file size (basic check)
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset to beginning
    
    max_size = 10 * 1024 * 1024  # 10MB
    if size > max_size:
        return False, f"File size ({size / 1024 / 1024:.1f}MB) exceeds maximum allowed size (10MB)"
    
    return True, ""

def validate_csv_content(content: str) -> Tuple[bool, str]:
    """
    Validate CSV content structure.
    
    Args:
        content: CSV content as string
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not content or not content.strip():
        return False, "CSV content cannot be empty"
    
    lines = content.strip().split('\n')
    if len(lines) < 2:
        return False, "CSV must have at least a header row and one data row"
    
    # Check if first line has commas (basic CSV validation)
    if ',' not in lines[0]:
        return False, "CSV must be comma-separated"
    
    return True, ""

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent injection attacks.
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\']', '', text)
    
    # Limit length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized.strip()
