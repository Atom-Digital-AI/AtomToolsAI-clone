from flask import request, jsonify
from flask_restx import Api, Resource, fields, Namespace
from marshmallow import Schema, fields as ma_fields, ValidationError
import time
from typing import Dict, Any, Optional

from services.openai_service import OpenAIService
from services.cache_service import cache_service
from services.monitoring import monitoring_service
from utils.validators import validate_url, validate_keywords, validate_brand_name
from utils.logger import log_performance

# Create API namespace
api = Namespace('api', description='Ad Copy Generator API')

# Create API instance
api_app = Api(
    title='Ad Copy Generator API',
    version='2.0.0',
    description='A comprehensive API for generating Google Ads copy and SEO content',
    doc='/docs',
    authorizations={
        'apikey': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'X-API-Key'
        }
    },
    security='apikey'
)

# Add namespace to API
api_app.add_namespace(api)

# Define request/response models
ad_copy_request = api.model('AdCopyRequest', {
    'url_content': fields.String(required=True, description='Content from the target URL'),
    'target_keywords': fields.String(required=True, description='Comma-separated target keywords'),
    'brand_name': fields.String(required=True, description='Brand name for the ad'),
    'selling_points': fields.String(description='Optional selling points'),
    'case_type': fields.String(enum=['sentence', 'title', 'uppercase', 'lowercase'], 
                              default='sentence', description='Text case type')
})

ad_copy_response = api.model('AdCopyResponse', {
    'success': fields.Boolean(description='Whether the request was successful'),
    'headline': fields.String(description='Generated headline'),
    'description1': fields.String(description='First description line'),
    'description2': fields.String(description='Second description line'),
    'call_to_action': fields.String(description='Call to action'),
    'duration': fields.Float(description='Processing time in seconds'),
    'task_id': fields.String(description='Task ID for async processing')
})

seo_request = api.model('SEORequest', {
    'url_content': fields.String(required=True, description='Content from the target URL'),
    'target_keywords': fields.String(required=True, description='Comma-separated target keywords'),
    'brand_name': fields.String(required=True, description='Brand name'),
    'selling_points': fields.String(description='Optional selling points'),
    'content_type': fields.String(enum=['titles', 'descriptions', 'both'], 
                                default='both', description='Type of content to generate'),
    'num_variations': fields.Integer(min=1, max=10, default=3, 
                                   description='Number of variations to generate'),
    'case_type': fields.String(enum=['sentence', 'title', 'uppercase', 'lowercase'], 
                              default='sentence', description='Text case type')
})

seo_response = api.model('SEOResponse', {
    'success': fields.Boolean(description='Whether the request was successful'),
    'titles': fields.List(fields.String, description='Generated page titles'),
    'descriptions': fields.List(fields.String, description='Generated meta descriptions'),
    'duration': fields.Float(description='Processing time in seconds'),
    'task_id': fields.String(description='Task ID for async processing')
})

error_response = api.model('ErrorResponse', {
    'success': fields.Boolean(description='Always false for errors'),
    'error': fields.String(description='Error message'),
    'details': fields.String(description='Additional error details')
})

@api.route('/ad-copy')
class AdCopyAPI(Resource):
    """API endpoint for generating ad copy."""
    
    @api.doc('generate_ad_copy')
    @api.expect(ad_copy_request)
    @api.marshal_with(ad_copy_response, code=200)
    @api.response(400, 'Validation Error', error_response)
    @api.response(500, 'Internal Server Error', error_response)
    def post(self):
        """Generate Google Ads copy."""
        start_time = time.time()
        
        try:
            # Get request data
            data = request.get_json()
            
            # Validate inputs
            url_content = data.get('url_content', '').strip()
            target_keywords = data.get('target_keywords', '').strip()
            brand_name = data.get('brand_name', '').strip()
            selling_points = data.get('selling_points', '').strip()
            case_type = data.get('case_type', 'sentence')
            
            # Validate required fields
            if not url_content:
                return {'success': False, 'error': 'URL content is required'}, 400
            
            if not target_keywords:
                return {'success': False, 'error': 'Target keywords are required'}, 400
            
            if not brand_name:
                return {'success': False, 'error': 'Brand name is required'}, 400
            
            # Validate brand name
            is_valid, error = validate_brand_name(brand_name)
            if not is_valid:
                return {'success': False, 'error': f'Brand name error: {error}'}, 400
            
            # Validate keywords
            is_valid, error = validate_keywords(target_keywords)
            if not is_valid:
                return {'success': False, 'error': f'Keywords error: {error}'}, 400
            
            # Check cache first
            cache_key = f"ad_copy:{hash(f'{url_content}:{target_keywords}:{brand_name}:{selling_points}')}"
            cached_result = cache_service.get(cache_key)
            
            if cached_result:
                monitoring_service.record_cache_hit('ad_copy')
                duration = time.time() - start_time
                return {
                    'success': True,
                    **cached_result,
                    'duration': duration,
                    'cached': True
                }
            
            monitoring_service.record_cache_miss('ad_copy')
            
            # Generate ad copy
            openai_service = OpenAIService()
            result = openai_service.generate_ad_copy(
                url_content, target_keywords, brand_name, selling_points
            )
            
            if not result:
                return {'success': False, 'error': 'Failed to generate ad copy'}, 500
            
            # Cache the result
            cache_service.set(cache_key, result, ttl=7200)  # 2 hours
            
            duration = time.time() - start_time
            log_performance(monitoring_service.logger, "api_ad_copy", duration,
                          keywords=target_keywords, brand=brand_name)
            
            return {
                'success': True,
                **result,
                'duration': duration,
                'cached': False
            }
            
        except Exception as e:
            duration = time.time() - start_time
            monitoring_service.logger.error(f"Error in ad copy API: {e}")
            return {'success': False, 'error': str(e)}, 500

@api.route('/seo-content')
class SEOContentAPI(Resource):
    """API endpoint for generating SEO content."""
    
    @api.doc('generate_seo_content')
    @api.expect(seo_request)
    @api.marshal_with(seo_response, code=200)
    @api.response(400, 'Validation Error', error_response)
    @api.response(500, 'Internal Server Error', error_response)
    def post(self):
        """Generate SEO content (titles and descriptions)."""
        start_time = time.time()
        
        try:
            # Get request data
            data = request.get_json()
            
            # Validate inputs
            url_content = data.get('url_content', '').strip()
            target_keywords = data.get('target_keywords', '').strip()
            brand_name = data.get('brand_name', '').strip()
            selling_points = data.get('selling_points', '').strip()
            content_type = data.get('content_type', 'both')
            num_variations = data.get('num_variations', 3)
            case_type = data.get('case_type', 'sentence')
            
            # Validate required fields
            if not url_content:
                return {'success': False, 'error': 'URL content is required'}, 400
            
            if not target_keywords:
                return {'success': False, 'error': 'Target keywords are required'}, 400
            
            if not brand_name:
                return {'success': False, 'error': 'Brand name is required'}, 400
            
            # Validate brand name
            is_valid, error = validate_brand_name(brand_name)
            if not is_valid:
                return {'success': False, 'error': f'Brand name error: {error}'}, 400
            
            # Validate keywords
            is_valid, error = validate_keywords(target_keywords)
            if not is_valid:
                return {'success': False, 'error': f'Keywords error: {error}'}, 400
            
            # Validate num_variations
            if not isinstance(num_variations, int) or num_variations < 1 or num_variations > 10:
                return {'success': False, 'error': 'num_variations must be between 1 and 10'}, 400
            
            # Check cache first
            cache_key = f"seo_content:{hash(f'{url_content}:{target_keywords}:{brand_name}:{content_type}:{num_variations}')}"
            cached_result = cache_service.get(cache_key)
            
            if cached_result:
                monitoring_service.record_cache_hit('seo_content')
                duration = time.time() - start_time
                return {
                    'success': True,
                    **cached_result,
                    'duration': duration,
                    'cached': True
                }
            
            monitoring_service.record_cache_miss('seo_content')
            
            # Generate SEO content
            openai_service = OpenAIService()
            result = openai_service.generate_seo_content(
                url_content, target_keywords, brand_name, selling_points,
                content_type, num_variations
            )
            
            if not result:
                return {'success': False, 'error': 'Failed to generate SEO content'}, 500
            
            # Cache the result
            cache_service.set(cache_key, result, ttl=7200)  # 2 hours
            
            duration = time.time() - start_time
            log_performance(monitoring_service.logger, "api_seo_content", duration,
                          keywords=target_keywords, brand=brand_name, content_type=content_type)
            
            return {
                'success': True,
                **result,
                'duration': duration,
                'cached': False
            }
            
        except Exception as e:
            duration = time.time() - start_time
            monitoring_service.logger.error(f"Error in SEO content API: {e}")
            return {'success': False, 'error': str(e)}, 500

@api.route('/health')
class HealthAPI(Resource):
    """API endpoint for health checks."""
    
    @api.doc('health_check')
    def get(self):
        """Check API health status."""
        return {
            'status': 'healthy',
            'timestamp': time.time(),
            'version': '2.0.0',
            'services': {
                'openai': 'available',
                'cache': 'available' if cache_service.redis_client else 'memory_only',
                'monitoring': 'available'
            }
        }

@api.route('/metrics')
class MetricsAPI(Resource):
    """API endpoint for metrics."""
    
    @api.doc('get_metrics')
    def get(self):
        """Get application metrics."""
        return monitoring_service.get_metrics_summary()

@api.route('/cache/clear')
class CacheClearAPI(Resource):
    """API endpoint for clearing cache."""
    
    @api.doc('clear_cache')
    def post(self):
        """Clear all cache."""
        try:
            success = cache_service.clear()
            return {
                'success': success,
                'message': 'Cache cleared successfully' if success else 'Failed to clear cache'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}, 500
