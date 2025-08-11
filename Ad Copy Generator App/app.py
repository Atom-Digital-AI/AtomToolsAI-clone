import os
import sys
import time
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import requests
from bs4 import BeautifulSoup
import pandas as pd
from io import StringIO
import csv
import json
import langdetect
from langdetect import detect
from typing import Optional, Dict, Any, List

# Import our new modules
try:
    from config import Config
    from utils.validators import (
        validate_url, validate_keywords, validate_brand_name,
        validate_file_upload, validate_csv_content, sanitize_input
    )
    from utils.logger import setup_logger, log_user_action, log_performance
    from services.openai_service import OpenAIService
    from services.cache_service import cache_service, cache_url_content, cache_ad_copy, cache_seo_content
    from services.monitoring import monitoring_service, monitor_request, monitor_api_call
    from services.celery_app import celery_app
    from services.tasks import generate_ad_copy_async, generate_seo_content_async, process_bulk_csv_async
    from api.routes import api_app
except ImportError as e:
    print(f"Warning: Could not import new modules: {e}")
    print("Falling back to original implementation...")
    # Fallback imports for backward compatibility
    from dotenv import load_dotenv
    load_dotenv()

# Initialize Flask app with proper configuration
app = Flask(__name__)

# Try to use new config, fallback to old method
try:
    Config.validate_config()
    app.secret_key = Config.SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH
    logger = setup_logger('ad_copy_generator', log_file='logs/app.log')
except Exception as e:
    print(f"Warning: Could not load new config: {e}")
    # Fallback to old configuration
    app.secret_key = os.getenv('SECRET_KEY') or 'your_secret_key_please_change_in_production'
    logger = None

# Initialize OpenAI service
try:
    openai_service = OpenAIService()
except Exception as e:
    print(f"Warning: Could not initialize OpenAI service: {e}")
    openai_service = None

# Register API routes if available
try:
    api_app.init_app(app)
    print("✓ API routes registered successfully")
except Exception as e:
    print(f"Warning: Could not register API routes: {e}")

def get_openai_api_key():
    """Get OpenAI API key with multiple fallback methods (legacy support)"""
    if hasattr(Config, 'OPENAI_API_KEY') and Config.OPENAI_API_KEY:
        return Config.OPENAI_API_KEY
    
    # Fallback to old method
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        if logger:
            logger.info("OpenAI API key loaded from environment")
        return api_key
    
    # Try reading from .env file directly
    env_paths = ['.env', os.path.join(os.path.dirname(__file__), '.env')]
    for env_path in env_paths:
        try:
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('OPENAI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        if api_key:
                            if logger:
                                logger.info(f"OpenAI API key loaded from {env_path}")
                            return api_key
        except Exception as e:
            if logger:
                logger.warning(f"Could not read {env_path}: {e}")
    
    if logger:
        logger.error("No OpenAI API key found!")
    return None

@cache_url_content(ttl=3600)
def fetch_url_content(url: str) -> Optional[str]:
    """Fetch the HTML content of the provided URL."""
    start_time = time.time()
    
    try:
        # Validate URL first
        is_valid, error = validate_url(url)
        if not is_valid:
            if logger:
                logger.error(f"Invalid URL provided: {error}")
            return None
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=Config.REQUEST_TIMEOUT if hasattr(Config, 'REQUEST_TIMEOUT') else 30)
        response.raise_for_status()
        
        duration = time.time() - start_time
        if logger:
            log_performance(logger, "fetch_url_content", duration, url=url)
        
        return response.text
    except Exception as e:
        duration = time.time() - start_time
        if logger:
            logger.error(f"Error fetching URL {url}: {e}")
            log_performance(logger, "fetch_url_content", duration, error=str(e), url=url)
        return None

def extract_text_from_html(html: str) -> str:
    """Extract and return visible text content from HTML."""
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Extract text from various content elements
        content_elements = soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span'])
        texts = []
        
        for element in content_elements:
            text = element.get_text(strip=True)
            if text and len(text) > 10:  # Only include substantial text
                texts.append(text)
        
        text = ' '.join(texts)
        return text.strip()
    except Exception as e:
        if logger:
            logger.error(f"Error extracting text from HTML: {e}")
        return ""

def detect_language(text: str) -> str:
    """
    Detect the language of the given text using langdetect.
    Returns the language code (e.g., 'en', 'de', 'fr', etc.)
    """
    try:
        if not text or len(text.strip()) < 10:
            return 'en'  # Default to English for short texts
        
        detected_lang = detect(text)
        if logger:
            logger.info(f"Detected language: {detected_lang} for text: {text[:50]}...")
        return detected_lang
    except Exception as e:
        if logger:
            logger.warning(f"Language detection failed: {e}, defaulting to English")
        return 'en'

def get_language_prompt(language_code: str) -> str:
    """
    Get language-specific prompt instructions based on detected language.
    """
    language_prompts = {
        'en': "Write in English.",
        'de': "Write in German (Deutsch).",
        'fr': "Write in French (Français).",
        'es': "Write in Spanish (Español).",
        'it': "Write in Italian (Italiano).",
        'pt': "Write in Portuguese (Português).",
        'nl': "Write in Dutch (Nederlands).",
        'pl': "Write in Polish (Polski).",
        'ru': "Write in Russian (Русский).",
        'ja': "Write in Japanese (日本語).",
        'ko': "Write in Korean (한국어).",
        'zh': "Write in Chinese (中文).",
        'ar': "Write in Arabic (العربية).",
        'hi': "Write in Hindi (हिन्दी).",
        'tr': "Write in Turkish (Türkçe).",
        'sv': "Write in Swedish (Svenska).",
        'da': "Write in Danish (Dansk).",
        'no': "Write in Norwegian (Norsk).",
        'fi': "Write in Finnish (Suomi)."
    }
    
    return language_prompts.get(language_code, "Write in English.")

@cache_ad_copy(ttl=7200)
@monitor_api_call('openai')
def generate_ad_copy(url_content: str, target_keywords: str, brand_name: str, selling_points: str = "") -> Optional[Dict[str, Any]]:
    """
    Generate ad copy using OpenAI API.
    """
    start_time = time.time()
    
    try:
        # Validate inputs
        if not url_content or not target_keywords or not brand_name:
            if logger:
                logger.error("Missing required parameters for ad copy generation")
            return None
        
        # Sanitize inputs
        url_content = sanitize_input(url_content, 2000)
        target_keywords = sanitize_input(target_keywords, 500)
        brand_name = sanitize_input(brand_name, 100)
        selling_points = sanitize_input(selling_points, 500)
        
        # Use new service if available
        if openai_service:
            result = openai_service.generate_ad_copy(url_content, target_keywords, brand_name, selling_points)
        else:
            # Fallback to old implementation
            result = _generate_ad_copy_legacy(url_content, target_keywords, brand_name, selling_points)
        
        duration = time.time() - start_time
        if logger:
            log_performance(logger, "generate_ad_copy", duration, 
                          keywords=target_keywords, brand=brand_name)
        
        return result
        
    except Exception as e:
        duration = time.time() - start_time
        if logger:
            logger.error(f"Error generating ad copy: {e}")
            log_performance(logger, "generate_ad_copy", duration, error=str(e))
        return None

def _generate_ad_copy_legacy(url_content: str, target_keywords: str, brand_name: str, selling_points: str = "") -> Optional[Dict[str, Any]]:
    """Legacy ad copy generation method (fallback)"""
    try:
        import openai
        
        # Get API key
        api_key = get_openai_api_key()
        if not api_key:
            return None
        
        openai.api_key = api_key
        
        # Detect language
        content_for_detection = f"{url_content} {target_keywords} {brand_name} {selling_points}"
        detected_lang = detect_language(content_for_detection)
        language_instruction = get_language_prompt(detected_lang)
        
        prompt = f"""
        Based on the following content and requirements, generate compelling Google Ads copy:

        CONTENT FROM WEBSITE:
        {url_content[:2000]}...

        TARGET KEYWORDS: {target_keywords}
        BRAND NAME: {brand_name}
        SELLING POINTS: {selling_points}
        LANGUAGE: {language_instruction}

        Please generate:
        1. A compelling headline (max 30 characters)
        2. Two description lines (max 90 characters each)
        3. A call-to-action

        Format your response as JSON:
        {{
            "headline": "Your headline here",
            "description1": "First description line",
            "description2": "Second description line",
            "call_to_action": "Your CTA here"
        }}
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert copywriter specializing in Google Ads."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        if '{' in content and '}' in content:
            start = content.find('{')
            end = content.rfind('}') + 1
            json_str = content[start:end]
            return json.loads(json_str)
        
        return None
        
    except Exception as e:
        if logger:
            logger.error(f"Legacy ad copy generation failed: {e}")
        return None

def clean_keyword(keyword: str) -> str:
    """Remove match type symbols and trim whitespace."""
    # Handle non-string values
    if pd.isna(keyword):  # This will catch None, NaN, etc.
        return ''
    
    # Convert to string if not already
    keyword_str = str(keyword).strip()
    
    # Remove match type symbols
    match_symbols = ['"', '[', ']', '+', 'broad', 'phrase', 'exact']
    for symbol in match_symbols:
        keyword_str = keyword_str.replace(symbol, '')
    
    return keyword_str.strip()

def get_csv_headers(file_content: bytes) -> List[str]:
    """Extract headers from CSV content."""
    try:
        content = file_content.decode('utf-8')
        lines = content.strip().split('\n')
        if lines:
            headers = [h.strip() for h in lines[0].split(',')]
            return headers
        return []
    except Exception as e:
        if logger:
            logger.error(f"Error extracting CSV headers: {e}")
        return []

def process_csv_data(file_content: bytes, column_mapping: Dict[str, str]) -> pd.DataFrame:
    """Process CSV data with the provided column mapping."""
    try:
        content = file_content.decode('utf-8')
        
        # Validate CSV content
        is_valid, error = validate_csv_content(content)
        if not is_valid:
            raise ValueError(f"Invalid CSV content: {error}")
        
        # Read CSV into DataFrame
        df = pd.read_csv(StringIO(content))
        
        # Validate required columns exist
        required_columns = ['Campaign Name', 'Ad Group Name', 'Target Keyword']
        missing_columns = []
        
        for required_col in required_columns:
            if required_col not in df.columns:
                missing_columns.append(required_col)
        
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
        
        # Clean keywords
        if 'Target Keyword' in df.columns:
            df['Target Keyword'] = df['Target Keyword'].apply(clean_keyword)
        
        return df
        
    except Exception as e:
        if logger:
            logger.error(f"Error processing CSV data: {e}")
        raise

def apply_case_type(text: str, case_type: str) -> str:
    """Apply the specified case type to the text."""
    if not text:
        return text
    
    case_type = case_type.lower()
    if case_type == 'title':
        return text.title()
    elif case_type == 'uppercase':
        return text.upper()
    elif case_type == 'lowercase':
        return text.lower()
    else:  # sentence case (default)
        return text.capitalize()

def format_ad_copy(ad_copy_json: Dict[str, Any], case_type: str, brand_name: str) -> Dict[str, str]:
    """Format the ad copy JSON with the specified case type."""
    try:
        if not ad_copy_json:
            return {}
        
        formatted_copy = {}
        
        # Handle different JSON structures
        if 'headlines' in ad_copy_json and 'descriptions' in ad_copy_json:
            # New format
            headlines = ad_copy_json.get('headlines', [])
            descriptions = ad_copy_json.get('descriptions', [])
            
            for i, headline in enumerate(headlines[:3], 1):
                formatted_copy[f'headline{i}'] = apply_case_type(headline, case_type)
            
            for i, description in enumerate(descriptions[:2], 1):
                formatted_copy[f'description{i}'] = apply_case_type(description, case_type)
                
        elif 'headline' in ad_copy_json:
            # Legacy format
            formatted_copy['headline1'] = apply_case_type(ad_copy_json.get('headline', ''), case_type)
            formatted_copy['description1'] = apply_case_type(ad_copy_json.get('description1', ''), case_type)
            formatted_copy['description2'] = apply_case_type(ad_copy_json.get('description2', ''), case_type)
        
        return formatted_copy
        
    except Exception as e:
        if logger:
            logger.error(f"Error formatting ad copy: {e}")
        return {}

def create_ads_editor_csv(campaign_data: pd.DataFrame, ad_copies: Dict[str, Dict[str, str]]) -> tuple:
    """Create Google Ads Editor compatible CSV."""
    try:
        headers = [
            'Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Headline 1', 
            'Headline 2', 'Headline 3', 'Description 1', 'Description 2'
        ]
        
        output_data = []
        
        for _, row in campaign_data.iterrows():
            campaign_name = row['Campaign Name']
            ad_group_name = row['Ad Group Name']
            keyword = row['Target Keyword']
            
            # Get ad copy for this ad group
            ad_copy_key = f"{campaign_name}_{ad_group_name}"
            ad_copy = ad_copies.get(ad_copy_key, {})
            
            output_row = [
                campaign_name,
                ad_group_name,
                keyword,
                'broad',  # Default match type
                ad_copy.get('headline1', ''),
                ad_copy.get('headline2', ''),
                ad_copy.get('headline3', ''),
                ad_copy.get('description1', ''),
                ad_copy.get('description2', '')
            ]
            
            output_data.append(output_row)
        
        return headers, output_data
        
    except Exception as e:
        if logger:
            logger.error(f"Error creating Ads Editor CSV: {e}")
        raise

def find_best_column_match(headers: List[str], target: str) -> Optional[str]:
    """Find the best matching column for the target."""
    target_lower = target.lower()
    
    # Exact match
    for header in headers:
        if header.lower() == target_lower:
            return header
    
    # Partial match
    for header in headers:
        header_lower = header.lower()
        if target_lower in header_lower or header_lower in target_lower:
            return header
    
    # Fuzzy match for common variations
    variations = {
        'campaign': ['campaign', 'campaign name', 'campaign_name'],
        'adgroup': ['ad group', 'adgroup', 'ad group name', 'adgroup_name'],
        'keyword': ['keyword', 'target keyword', 'target_keyword', 'keywords']
    }
    
    for key, variants in variations.items():
        if target_lower in key or any(variant in target_lower for variant in variants):
            for header in headers:
                header_lower = header.lower()
                if any(variant in header_lower for variant in variants):
                    return header
    
    return None

def get_suggested_mappings(headers: List[str]) -> Dict[str, str]:
    """Get suggested column mappings based on headers."""
    suggestions = {}
    
    # Define target columns and their possible variations
    targets = {
        'Campaign Name': ['campaign', 'campaign name', 'campaign_name'],
        'Ad Group Name': ['ad group', 'adgroup', 'ad group name', 'adgroup_name'],
        'Target Keyword': ['keyword', 'target keyword', 'target_keyword', 'keywords']
    }
    
    for target, variations in targets.items():
        for header in headers:
            header_lower = header.lower()
            if any(variant in header_lower for variant in variations):
                suggestions[target] = header
                break
    
    return suggestions

@cache_seo_content(ttl=7200)
@monitor_api_call('openai')
def generate_seo_content(url_content: str, target_keywords: str, brand_name: str, 
                        selling_points: str = "", case_type: str = 'sentence', 
                        content_type: str = 'both', num_variations: int = 3) -> Dict[str, List[str]]:
    """Generate SEO content using OpenAI API."""
    start_time = time.time()
    
    try:
        # Validate inputs
        if not url_content or not target_keywords or not brand_name:
            if logger:
                logger.error("Missing required parameters for SEO content generation")
            return {'titles': [], 'descriptions': []}
        
        # Sanitize inputs
        url_content = sanitize_input(url_content, 2000)
        target_keywords = sanitize_input(target_keywords, 500)
        brand_name = sanitize_input(brand_name, 100)
        selling_points = sanitize_input(selling_points, 500)
        
        # Use new service if available
        if openai_service:
            result = openai_service.generate_seo_content(
                url_content, target_keywords, brand_name, selling_points,
                case_type, content_type, num_variations
            )
        else:
            # Fallback to old implementation
            result = _generate_seo_content_legacy(
                url_content, target_keywords, brand_name, selling_points,
                case_type, content_type, num_variations
            )
        
        duration = time.time() - start_time
        if logger:
            log_performance(logger, "generate_seo_content", duration,
                          keywords=target_keywords, brand=brand_name, content_type=content_type)
        
        return result or {'titles': [], 'descriptions': []}
        
    except Exception as e:
        duration = time.time() - start_time
        if logger:
            logger.error(f"Error generating SEO content: {e}")
            log_performance(logger, "generate_seo_content", duration, error=str(e))
        return {'titles': [], 'descriptions': []}

def _generate_seo_content_legacy(url_content: str, target_keywords: str, brand_name: str,
                                selling_points: str = "", case_type: str = 'sentence',
                                content_type: str = 'both', num_variations: int = 3) -> Optional[Dict[str, List[str]]]:
    """Legacy SEO content generation method (fallback)"""
    try:
        import openai
        
        # Get API key
        api_key = get_openai_api_key()
        if not api_key:
            return None
        
        openai.api_key = api_key
        
        # Detect language
        content_for_detection = f"{url_content} {target_keywords} {brand_name} {selling_points}"
        detected_lang = detect_language(content_for_detection)
        language_instruction = get_language_prompt(detected_lang)
        
        prompt = f"""
        Based on the following content, generate SEO-optimized content:

        CONTENT FROM WEBSITE:
        {url_content[:2000]}...

        TARGET KEYWORDS: {target_keywords}
        BRAND NAME: {brand_name}
        SELLING POINTS: {selling_points}
        LANGUAGE: {language_instruction}

        Generate {num_variations} variations of:
        - Page titles (50-60 characters, include primary keywords)
        - Meta descriptions (150-160 characters, compelling and informative)

        Format your response as JSON:
        {{
            "titles": ["Title 1", "Title 2", "Title 3"],
            "descriptions": ["Description 1", "Description 2", "Description 3"]
        }}
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert SEO copywriter."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.8
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        if '{' in content and '}' in content:
            start = content.find('{')
            end = content.rfind('}') + 1
            json_str = content[start:end]
            return json.loads(json_str)
        
        return None
        
    except Exception as e:
        if logger:
            logger.error(f"Legacy SEO content generation failed: {e}")
        return None

def extract_keywords_from_content(content, max_keywords=5):
    """Extract keywords from content using OpenAI."""
    try:
        if not content or len(content.strip()) < 50:
            return []
        
        # Use OpenAI to extract keywords
        prompt = f"""
        Extract the top {max_keywords} most relevant keywords from the following content.
        Return only the keywords, separated by commas:

        Content: {content[:1000]}...

        Keywords:
        """
        
        if openai_service:
            # Use the service if available
            result = openai_service.generate_ad_copy(content, "keyword extraction", "extract", "")
            if result and 'headline' in result:
                keywords = result['headline'].split(',')
                return [kw.strip() for kw in keywords if kw.strip()][:max_keywords]
        
        # Fallback: simple keyword extraction
        import re
        words = re.findall(r'\b\w+\b', content.lower())
        word_freq = {}
        for word in words:
            if len(word) > 3:  # Only words longer than 3 characters
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top keywords
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:max_keywords]]
        
    except Exception as e:
        if logger:
            logger.error(f"Error extracting keywords: {e}")
        return []

def process_bulk_seo_csv(file_content, default_brand_name, default_selling_points, case_type, content_type='both', num_variations=3):
    """Process bulk SEO CSV file."""
    try:
        import pandas as pd
        from io import StringIO
        
        # Read CSV
        df = pd.read_csv(StringIO(file_content.decode('utf-8')))
        results = []
        total_rows = len(df)
        
        if logger:
            logger.info(f"Starting bulk SEO processing for {total_rows} rows")
        
        for index, row in df.iterrows():
            try:
                url = row.get('url', '')
                keywords = row.get('keywords', '')
                brand_name = row.get('brand_name', default_brand_name)
                
                if logger:
                    logger.info(f"Processing row {index + 1}/{total_rows}: {url}")
                
                if url and keywords:
                    # Fetch content from URL
                    html_content = fetch_url_content(url)
                    if html_content:
                        url_text = extract_text_from_html(html_content)
                        
                        # Generate SEO content
                        seo_content = generate_seo_content(
                            url_text, keywords, brand_name, default_selling_points,
                            case_type, content_type, num_variations
                        )
                        
                        results.append({
                            'url': url,
                            'keywords': keywords,
                            'brand_name': brand_name,
                            **seo_content
                        })
                        
                        if logger:
                            logger.info(f"Successfully processed row {index + 1}/{total_rows}")
                    else:
                        error_msg = 'Failed to fetch content from URL'
                        if logger:
                            logger.warning(f"Failed to fetch content for {url}: {error_msg}")
                        
                        results.append({
                            'url': url,
                            'error': error_msg
                        })
                else:
                    error_msg = 'Missing URL or keywords'
                    if logger:
                        logger.warning(f"Missing data for row {index + 1}: {error_msg}")
                    
                    results.append({
                        'url': url,
                        'error': error_msg
                    })
                    
            except Exception as e:
                error_msg = str(e)
                if logger:
                    logger.error(f"Error processing row {index + 1}: {error_msg}")
                
                results.append({
                    'url': row.get('url', ''),
                    'error': error_msg
                })
        
        if logger:
            logger.info(f"Completed bulk SEO processing. Processed {len(results)} rows successfully.")
        
        return results
        
    except Exception as e:
        if logger:
            logger.error(f"Error processing bulk SEO CSV: {e}")
        raise

def create_seo_csv(results, content_type='both'):
    """Create a CSV file with the generated SEO content."""
    try:
        output = StringIO()
        writer = csv.writer(output)
        
        if not results:
            # Handle empty results
            headers = ['URL', 'Keywords', 'Brand Name', 'Error']
            writer.writerow(headers)
            writer.writerow(['No data', 'No data', 'No data', 'No results generated'])
            return output.getvalue()
        
        # Prepare headers based on content type
        headers = ['URL', 'Keywords', 'Brand Name']
        
        # Determine the maximum number of titles and descriptions
        max_titles = 0
        max_descriptions = 0
        
        for result in results:
            if 'titles' in result and isinstance(result['titles'], list):
                max_titles = max(max_titles, len(result['titles']))
            if 'descriptions' in result and isinstance(result['descriptions'], list):
                max_descriptions = max(max_descriptions, len(result['descriptions']))
        
        if content_type in ['both', 'titles']:
            headers.extend([f'Title {i+1}' for i in range(max_titles)])
        if content_type in ['both', 'descriptions']:
            headers.extend([f'Description {i+1}' for i in range(max_descriptions)])
        
        writer.writerow(headers)
        
        # Write data
        for result in results:
            if 'error' in result:
                # Handle error rows
                row = [result.get('url', ''), 'ERROR', result.get('brand_name', ''), result['error']]
                # Pad with empty values for titles/descriptions
                if content_type in ['both', 'titles']:
                    row.extend([''] * max_titles)
                if content_type in ['both', 'descriptions']:
                    row.extend([''] * max_descriptions)
                writer.writerow(row)
            else:
                # Handle successful rows
                row = [
                    result.get('url', ''),
                    result.get('keywords', ''),
                    result.get('brand_name', '')
                ]
                
                if content_type in ['both', 'titles']:
                    titles = result.get('titles', [])
                    # Pad with empty strings if needed
                    while len(titles) < max_titles:
                        titles.append('')
                    row.extend(titles[:max_titles])
                
                if content_type in ['both', 'descriptions']:
                    descriptions = result.get('descriptions', [])
                    # Pad with empty strings if needed
                    while len(descriptions) < max_descriptions:
                        descriptions.append('')
                    row.extend(descriptions[:max_descriptions])
                
                writer.writerow(row)
        
        csv_content = output.getvalue()
        
        if logger:
            logger.info(f"Generated CSV with {len(results)} rows")
        
        return csv_content
        
    except Exception as e:
        if logger:
            logger.error(f"Error creating SEO CSV: {e}")
        # Return a basic error CSV
        error_output = StringIO()
        error_writer = csv.writer(error_output)
        error_writer.writerow(['Error'])
        error_writer.writerow([f'Failed to generate CSV: {str(e)}'])
        return error_output.getvalue()

def process_urls_list(urls_text):
    """Process a list of URLs from text input."""
    # Split by newlines and clean up
    urls = [url.strip() for url in urls_text.split('\n') if url.strip()]
    # Remove any empty lines and duplicates
    urls = list(set(url for url in urls if url))
    return urls

def process_bulk_seo_urls(urls, default_brand_name, default_selling_points, case_type, content_type='both', num_variations=3):
    """Process a list of URLs for SEO generation."""
    results = []
    for url in urls:
        try:
            # Fetch webpage content
            response = requests.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            url_text = soup.get_text(separator=' ', strip=True)
            
            # Extract keywords from content
            keywords = extract_keywords_from_content(url_text)
            
            # Generate SEO content
            seo_content = generate_seo_content(
                url_text,
                keywords,
                default_brand_name,
                default_selling_points,
                case_type,
                content_type,
                num_variations
            )
            
            results.append({
                'url': url,
                'keywords': keywords,
                'brand_name': default_brand_name,
                **seo_content  # This will include only the requested content types
            })
            
        except Exception as e:
            print(f"Error processing URL {url}: {str(e)}")
            results.append({
                'url': url,
                'error': str(e)
            })
    
    return results

@app.route('/', methods=['GET', 'POST'])
@monitor_request('/', 'POST')
def index():
    """Main route for handling ad copy generation requests."""
    if request.method == 'POST':
        start_time = time.time()
        
        try:
            # Log user action
            if logger:
                user_input = {
                    'form_data': dict(request.form),
                    'files': [f.filename for f in request.files.values() if f.filename]
                }
                log_user_action(logger, "form_submission", user_input, True)
            
            # Check if this is a bulk SEO generation request
            if request.form.get('bulk_seo_generation'):
                return _handle_bulk_seo_generation(request)
            
            # Check if this is a CSV file upload for ad generation
            elif 'csv_file' in request.files:
                return _handle_csv_upload(request)
            
            # If this is the mapping form submission
            elif 'column_mapping' in request.form:
                return _handle_column_mapping(request)
            
            # If this is a regular single ad generation
            elif request.form.get('seo_generation'):
                return _handle_single_seo_generation(request)
            
            # Regular single ad generation
            else:
                return _handle_single_ad_generation(request)
                
        except Exception as e:
            duration = time.time() - start_time
            if logger:
                logger.error(f"Error in main route: {e}")
                log_user_action(logger, "form_submission", {}, False, str(e))
                log_performance(logger, "main_route", duration, error=str(e))
            
            flash(f'An error occurred: {str(e)}')
            return redirect(url_for('index'))
    
    return render_template('index.html')

def _handle_bulk_seo_generation(request) -> Any:
    """Handle bulk SEO generation requests."""
    try:
        # Validate inputs
        default_brand_name = request.form.get('brand_name', '').strip()
        default_selling_points = request.form.get('selling_points', '').strip()
        case_type = request.form.get('case_type', 'sentence')
        content_type = request.form.get('content_type', 'both')
        num_variations = int(request.form.get('variations', 3))
        
        # Validate brand name
        is_valid, error = validate_brand_name(default_brand_name)
        if not is_valid:
            flash(f'Brand name error: {error}')
            return redirect(url_for('index'))
        
        # Validate variations number
        if num_variations < 1 or num_variations > 10:
            flash('Number of variations must be between 1 and 10')
            return redirect(url_for('index'))
        
        # Check if we have a CSV file or URLs text
        bulk_seo_csv = request.files.get('bulk_seo_csv')
        urls_text = request.form.get('urls', '').strip()
        
        if bulk_seo_csv and bulk_seo_csv.filename:
            # Validate file upload
            is_valid, error = validate_file_upload(bulk_seo_csv, Config.ALLOWED_EXTENSIONS if hasattr(Config, 'ALLOWED_EXTENSIONS') else {'csv', 'txt'})
            if not is_valid:
                flash(f'File upload error: {error}')
                return redirect(url_for('index'))
            
            # Process CSV file
            results = process_bulk_seo_csv(
                bulk_seo_csv.read(),
                default_brand_name,
                default_selling_points,
                case_type,
                content_type,
                num_variations
            )
        elif urls_text:
            # Process URLs from text input
            urls = process_urls_list(urls_text)
            if not urls:
                flash('No valid URLs found in the input')
                return redirect(url_for('index'))
            
            results = process_bulk_seo_urls(
                urls,
                default_brand_name,
                default_selling_points,
                case_type,
                content_type,
                num_variations
            )
        else:
            flash('Please either upload a CSV file or paste URLs')
            return redirect(url_for('index'))
        
        # Create and return the CSV file
        csv_content = create_seo_csv(results, content_type)
        
        # Set proper headers for file download
        response = app.response_class(
            csv_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': 'attachment; filename=seo_output.csv',
                'Content-Type': 'text/csv',
                'Access-Control-Expose-Headers': 'Content-Disposition',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        )
        
        # Log successful generation
        if logger:
            log_user_action(logger, "bulk_seo_generation", {
                'brand_name': default_brand_name,
                'content_type': content_type,
                'num_variations': num_variations,
                'results_count': len(results)
            }, True)
        
        return response
        
    except Exception as e:
        if logger:
            logger.error(f'Error in bulk SEO generation: {e}')
        flash(f'Error generating bulk SEO content: {str(e)}')
        return redirect(url_for('index'))

def _handle_csv_upload(request) -> Any:
    """Handle CSV file uploads."""
    try:
        csv_file = request.files['csv_file']
        
        # Validate file upload
        is_valid, error = validate_file_upload(csv_file, Config.ALLOWED_EXTENSIONS if hasattr(Config, 'ALLOWED_EXTENSIONS') else {'csv', 'txt'})
        if not is_valid:
            flash(f'File upload error: {error}')
            return redirect(url_for('index'))
        
        csv_content = csv_file.read()
        session['csv_content'] = csv_content.decode('utf-8')
        
        headers = get_csv_headers(csv_content)
        suggested_mappings = get_suggested_mappings(headers)
        
        return render_template('column_mapping.html', 
                            headers=headers, 
                            suggested=suggested_mappings)
                            
    except Exception as e:
        if logger:
            logger.error(f'Error in CSV upload: {e}')
        flash(f'Error processing CSV file: {str(e)}')
        return redirect(url_for('index'))

def _handle_column_mapping(request) -> Any:
    """Handle column mapping form submissions."""
    try:
        column_mapping = {
            request.form.get('campaign_col'): 'Campaign Name',
            request.form.get('adgroup_col'): 'Ad Group Name',
            request.form.get('keyword_col'): 'Target Keyword'
        }
        
        # Get other form data
        target_url = request.form.get('target_url', '').strip()
        brand_name = request.form.get('brand_name', '').strip()
        selling_points = request.form.get('selling_points', '').strip()
        case_type = request.form.get('case_type', 'sentence')
        
        # Validate inputs
        is_valid, error = validate_url(target_url)
        if not is_valid:
            flash(f'URL error: {error}')
            return redirect(url_for('index'))
        
        is_valid, error = validate_brand_name(brand_name)
        if not is_valid:
            flash(f'Brand name error: {error}')
            return redirect(url_for('index'))
        
        # Process the stored CSV content with the mapping
        csv_content = session.get('csv_content')
        if not csv_content:
            flash("Please upload the CSV file again.")
            return redirect(url_for('index'))
        
        campaign_data = process_csv_data(csv_content.encode('utf-8'), column_mapping)
        ad_copies = {}
        
        # Fetch and extract content from the target URL
        html_content = fetch_url_content(target_url)
        if not html_content:
            flash("Failed to fetch content from the URL provided.")
            return redirect(url_for('index'))
        
        url_text = extract_text_from_html(html_content)
        
        # Generate ad copy for each ad group
        for _, row in campaign_data.iterrows():
            keywords = row['Target Keyword']
            ad_copy = generate_ad_copy(
                url_content=url_text,
                target_keywords=', '.join(keywords) if isinstance(keywords, list) else str(keywords),
                brand_name=brand_name,
                selling_points=selling_points
            )
            if ad_copy:
                formatted_copy = format_ad_copy(ad_copy, case_type, brand_name)
                ad_copies[f"{row['Campaign Name']}_{row['Ad Group Name']}"] = formatted_copy
        
        # Create Google Ads Editor compatible CSV
        headers, output_data = create_ads_editor_csv(campaign_data, ad_copies)
        
        # Create CSV response
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(output_data)
        
        # Return the CSV file
        output.seek(0)
        return app.response_class(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': 'attachment; filename=ads_output.csv',
                'Content-Type': 'text/csv',
                'Access-Control-Expose-Headers': 'Content-Disposition'
            }
        )
        
    except Exception as e:
        if logger:
            logger.error(f'Error in column mapping: {e}')
        flash(f'Error processing request: {str(e)}')
        return redirect(url_for('index'))

def _handle_single_seo_generation(request) -> Any:
    """Handle single SEO generation requests."""
    try:
        target_url = request.form.get('target_url', '').strip()
        target_keywords = request.form.get('target_keywords', '').strip()
        brand_name = request.form.get('brand_name', '').strip()
        selling_points = request.form.get('selling_points', '').strip()
        case_type = request.form.get('case_type', 'sentence')

        # Validate inputs
        is_valid, error = validate_url(target_url)
        if not is_valid:
            flash(f'URL error: {error}')
            return redirect(url_for('index'))
        
        is_valid, error = validate_keywords(target_keywords)
        if not is_valid:
            flash(f'Keywords error: {error}')
            return redirect(url_for('index'))
        
        is_valid, error = validate_brand_name(brand_name)
        if not is_valid:
            flash(f'Brand name error: {error}')
            return redirect(url_for('index'))

        # Fetch the webpage content
        try:
            response = requests.get(target_url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            url_text = soup.get_text(separator=' ', strip=True)
        except requests.RequestException as e:
            flash(f'Error fetching URL: {str(e)}')
            return redirect(url_for('index'))

        # Generate SEO content
        seo_content = generate_seo_content(
            url_text,
            target_keywords,
            brand_name,
            selling_points,
            case_type
        )

        # Render the SEO result template
        return render_template(
            'seo_result.html',
            titles=seo_content['titles'],
            descriptions=seo_content['descriptions'],
            target_url=target_url
        )

    except Exception as e:
        if logger:
            logger.error(f'Error in single SEO generation: {e}')
        flash(f'Error generating SEO content: {str(e)}')
        return redirect(url_for('index'))

def _handle_single_ad_generation(request) -> Any:
    """Handle single ad generation requests."""
    try:
        target_url = request.form.get('target_url', '').strip()
        target_keywords = request.form.get('target_keywords', '').strip()
        brand_name = request.form.get('brand_name', '').strip()
        selling_points = request.form.get('selling_points', '').strip()
        case_type = request.form.get('case_type', 'sentence')

        # Validate inputs
        is_valid, error = validate_url(target_url)
        if not is_valid:
            flash(f'URL error: {error}')
            return redirect(url_for('index'))
        
        is_valid, error = validate_keywords(target_keywords)
        if not is_valid:
            flash(f'Keywords error: {error}')
            return redirect(url_for('index'))
        
        is_valid, error = validate_brand_name(brand_name)
        if not is_valid:
            flash(f'Brand name error: {error}')
            return redirect(url_for('index'))

        # Fetch and extract content from the target URL
        html_content = fetch_url_content(target_url)
        if not html_content:
            flash("Failed to fetch content from the URL provided.")
            return redirect(url_for('index'))
        
        url_text = extract_text_from_html(html_content)
        
        ad_copy = generate_ad_copy(
            url_content=url_text,
            target_keywords=target_keywords,
            brand_name=brand_name,
            selling_points=selling_points
        )
        if not ad_copy:
            flash("Failed to generate ad copy.")
            return redirect(url_for('index'))
        
        formatted_copy = format_ad_copy(ad_copy, case_type, brand_name)
        return render_template('result.html', ad_copy=formatted_copy)
        
    except Exception as e:
        if logger:
            logger.error(f'Error in single ad generation: {e}')
        flash(f'Error generating ad copy: {str(e)}')
        return redirect(url_for('index'))

# Add monitoring endpoints
@app.route('/metrics')
def metrics():
    """Get Prometheus metrics."""
    try:
        from services.monitoring import monitoring_service
        return monitoring_service.get_prometheus_metrics(), 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return f"Error getting metrics: {e}", 500

@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'version': '2.0.0',
        'services': {
            'openai': 'available' if openai_service else 'unavailable',
            'cache': 'available' if cache_service.redis_client else 'memory_only',
            'monitoring': 'available'
        }
    })

if __name__ == '__main__':
    # Ensure API key is available before starting the app
    if not openai_service and not get_openai_api_key():
        print("WARNING: No API key found! Trying to reload...")
        api_key = get_openai_api_key()
        if not api_key:
            print("ERROR: Cannot start app without API key!")
            print("Please check your .env file and ensure it contains:")
            print("OPENAI_API_KEY=your_api_key_here")
            sys.exit(1)
    
    print("Starting Flask app...")
    print("Access the app at: http://localhost:8080")
    print("API documentation at: http://localhost:8080/docs")
    print("Metrics at: http://localhost:8080/metrics")
    print("Health check at: http://localhost:8080/health")
    
    # Use configuration if available
    host = Config.HOST if hasattr(Config, 'HOST') else '0.0.0.0'
    port = Config.PORT if hasattr(Config, 'PORT') else 8080
    debug = Config.DEBUG if hasattr(Config, 'DEBUG') else True
    
    app.run(debug=debug, host=host, port=port)
