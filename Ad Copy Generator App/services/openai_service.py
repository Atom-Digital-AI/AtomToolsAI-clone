import openai
import time
import logging
from typing import Dict, List, Optional, Any
from tenacity import retry, stop_after_attempt, wait_exponential
from config import Config
from utils.logger import log_api_call

logger = logging.getLogger(__name__)

class OpenAIService:
    """Service class for handling OpenAI API interactions"""
    
    def __init__(self):
        """Initialize the OpenAI service"""
        if not Config.OPENAI_API_KEY:
            raise ValueError("OpenAI API key not configured")
        
        openai.api_key = Config.OPENAI_API_KEY
        self.model = Config.OPENAI_MODEL
        self.max_tokens = Config.OPENAI_MAX_TOKENS
    
    @retry(
        stop=stop_after_attempt(Config.MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def generate_ad_copy(self, 
                        url_content: str,
                        target_keywords: str,
                        brand_name: str,
                        selling_points: str = "") -> Optional[Dict[str, Any]]:
        """
        Generate ad copy using OpenAI API.
        
        Args:
            url_content: Content from the target URL
            target_keywords: Comma-separated target keywords
            brand_name: Brand name for the ad
            selling_points: Optional selling points
            
        Returns:
            Dictionary containing generated ad copy or None if failed
        """
        start_time = time.time()
        
        try:
            # Prepare the prompt
            prompt = self._build_ad_copy_prompt(
                url_content, target_keywords, brand_name, selling_points
            )
            
            # Make API call
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert copywriter specializing in Google Ads."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=0.7
            )
            
            # Extract and parse response
            content = response.choices[0].message.content.strip()
            result = self._parse_ad_copy_response(content)
            
            duration = time.time() - start_time
            log_api_call(
                logger, 
                "generate_ad_copy", 
                True, 
                duration=duration,
                tokens_used=response.usage.total_tokens if hasattr(response, 'usage') else None
            )
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            log_api_call(logger, "generate_ad_copy", False, str(e), duration=duration)
            logger.error(f"Failed to generate ad copy: {e}")
            return None
    
    @retry(
        stop=stop_after_attempt(Config.MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def generate_seo_content(self,
                           url_content: str,
                           target_keywords: str,
                           brand_name: str,
                           selling_points: str = "",
                           content_type: str = 'both',
                           num_variations: int = 3) -> Optional[Dict[str, Any]]:
        """
        Generate SEO content using OpenAI API.
        
        Args:
            url_content: Content from the target URL
            target_keywords: Comma-separated target keywords
            brand_name: Brand name
            selling_points: Optional selling points
            content_type: Type of content to generate ('titles', 'descriptions', 'both')
            num_variations: Number of variations to generate
            
        Returns:
            Dictionary containing generated SEO content or None if failed
        """
        start_time = time.time()
        
        try:
            # Prepare the prompt
            prompt = self._build_seo_prompt(
                url_content, target_keywords, brand_name, selling_points, 
                content_type, num_variations
            )
            
            # Make API call
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert SEO copywriter."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=0.8
            )
            
            # Extract and parse response
            content = response.choices[0].message.content.strip()
            result = self._parse_seo_response(content, content_type)
            
            duration = time.time() - start_time
            log_api_call(
                logger, 
                "generate_seo_content", 
                True, 
                duration=duration,
                tokens_used=response.usage.total_tokens if hasattr(response, 'usage') else None
            )
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            log_api_call(logger, "generate_seo_content", False, str(e), duration=duration)
            logger.error(f"Failed to generate SEO content: {e}")
            return None
    
    def _build_ad_copy_prompt(self, 
                             url_content: str,
                             target_keywords: str,
                             brand_name: str,
                             selling_points: str) -> str:
        """Build the prompt for ad copy generation"""
        prompt = f"""
        Based on the following content and requirements, generate compelling Google Ads copy:

        CONTENT FROM WEBSITE:
        {url_content[:2000]}...

        TARGET KEYWORDS: {target_keywords}
        BRAND NAME: {brand_name}
        SELLING POINTS: {selling_points}

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
        return prompt.strip()
    
    def _build_seo_prompt(self,
                          url_content: str,
                          target_keywords: str,
                          brand_name: str,
                          selling_points: str,
                          content_type: str,
                          num_variations: int) -> str:
        """Build the prompt for SEO content generation"""
        content_instructions = {
            'titles': 'Generate only SEO-optimized page titles',
            'descriptions': 'Generate only meta descriptions',
            'both': 'Generate both SEO-optimized page titles and meta descriptions'
        }
        
        prompt = f"""
        Based on the following content, generate {content_instructions.get(content_type, 'SEO content')}:

        CONTENT FROM WEBSITE:
        {url_content[:2000]}...

        TARGET KEYWORDS: {target_keywords}
        BRAND NAME: {brand_name}
        SELLING POINTS: {selling_points}

        Generate {num_variations} variations.

        Requirements:
        - Titles: 50-60 characters, include primary keywords
        - Descriptions: 150-160 characters, compelling and informative
        - Include brand name where appropriate
        - Optimize for search intent

        Format your response as JSON:
        {{
            "titles": ["Title 1", "Title 2", "Title 3"],
            "descriptions": ["Description 1", "Description 2", "Description 3"]
        }}
        """
        return prompt.strip()
    
    def _parse_ad_copy_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse the ad copy response from OpenAI"""
        try:
            import json
            # Try to extract JSON from the response
            if '{' in content and '}' in content:
                start = content.find('{')
                end = content.rfind('}') + 1
                json_str = content[start:end]
                return json.loads(json_str)
            else:
                logger.warning("Could not parse JSON from OpenAI response")
                return None
        except Exception as e:
            logger.error(f"Failed to parse ad copy response: {e}")
            return None
    
    def _parse_seo_response(self, content: str, content_type: str) -> Optional[Dict[str, Any]]:
        """Parse the SEO content response from OpenAI"""
        try:
            import json
            # Try to extract JSON from the response
            if '{' in content and '}' in content:
                start = content.find('{')
                end = content.rfind('}') + 1
                json_str = content[start:end]
                parsed = json.loads(json_str)
                
                # Ensure we have the expected structure
                if content_type == 'titles' and 'titles' in parsed:
                    return {'titles': parsed['titles'], 'descriptions': []}
                elif content_type == 'descriptions' and 'descriptions' in parsed:
                    return {'titles': [], 'descriptions': parsed['descriptions']}
                elif content_type == 'both':
                    return {
                        'titles': parsed.get('titles', []),
                        'descriptions': parsed.get('descriptions', [])
                    }
                else:
                    logger.warning("Unexpected response structure from OpenAI")
                    return None
            else:
                logger.warning("Could not parse JSON from OpenAI response")
                return None
        except Exception as e:
            logger.error(f"Failed to parse SEO response: {e}")
            return None
