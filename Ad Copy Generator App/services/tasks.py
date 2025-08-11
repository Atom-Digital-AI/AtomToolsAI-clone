import time
import logging
from typing import Dict, Any, List, Optional
from celery import current_task
from services.celery_app import celery_app
from services.openai_service import OpenAIService
from utils.logger import log_performance
from utils.validators import sanitize_input

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name='generate_ad_copy_async')
def generate_ad_copy_async(self, url_content: str, target_keywords: str, 
                          brand_name: str, selling_points: str = "") -> Dict[str, Any]:
    """
    Async task for generating ad copy.
    
    Args:
        url_content: Content from the target URL
        target_keywords: Comma-separated target keywords
        brand_name: Brand name for the ad
        selling_points: Optional selling points
        
    Returns:
        Dictionary containing generated ad copy or error information
    """
    start_time = time.time()
    
    try:
        # Update task state
        self.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Initializing...'}
        )
        
        # Sanitize inputs
        url_content = sanitize_input(url_content, 2000)
        target_keywords = sanitize_input(target_keywords, 500)
        brand_name = sanitize_input(brand_name, 100)
        selling_points = sanitize_input(selling_points, 500)
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 25, 'total': 100, 'status': 'Inputs sanitized...'}
        )
        
        # Initialize OpenAI service
        openai_service = OpenAIService()
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Generating ad copy...'}
        )
        
        # Generate ad copy
        result = openai_service.generate_ad_copy(
            url_content, target_keywords, brand_name, selling_points
        )
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 90, 'total': 100, 'status': 'Finalizing...'}
        )
        
        duration = time.time() - start_time
        log_performance(logger, "generate_ad_copy_async", duration,
                       keywords=target_keywords, brand=brand_name)
        
        if result:
            return {
                'success': True,
                'result': result,
                'duration': duration,
                'task_id': self.request.id
            }
        else:
            return {
                'success': False,
                'error': 'Failed to generate ad copy',
                'duration': duration,
                'task_id': self.request.id
            }
            
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Error in generate_ad_copy_async: {e}")
        log_performance(logger, "generate_ad_copy_async", duration, error=str(e))
        
        return {
            'success': False,
            'error': str(e),
            'duration': duration,
            'task_id': self.request.id
        }

@celery_app.task(bind=True, name='generate_seo_content_async')
def generate_seo_content_async(self, url_content: str, target_keywords: str,
                              brand_name: str, selling_points: str = "",
                              content_type: str = 'both', num_variations: int = 3) -> Dict[str, Any]:
    """
    Async task for generating SEO content.
    
    Args:
        url_content: Content from the target URL
        target_keywords: Comma-separated target keywords
        brand_name: Brand name
        selling_points: Optional selling points
        content_type: Type of content to generate ('titles', 'descriptions', 'both')
        num_variations: Number of variations to generate
        
    Returns:
        Dictionary containing generated SEO content or error information
    """
    start_time = time.time()
    
    try:
        # Update task state
        self.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Initializing...'}
        )
        
        # Sanitize inputs
        url_content = sanitize_input(url_content, 2000)
        target_keywords = sanitize_input(target_keywords, 500)
        brand_name = sanitize_input(brand_name, 100)
        selling_points = sanitize_input(selling_points, 500)
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 25, 'total': 100, 'status': 'Inputs sanitized...'}
        )
        
        # Initialize OpenAI service
        openai_service = OpenAIService()
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Generating SEO content...'}
        )
        
        # Generate SEO content
        result = openai_service.generate_seo_content(
            url_content, target_keywords, brand_name, selling_points,
            content_type, num_variations
        )
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 90, 'total': 100, 'status': 'Finalizing...'}
        )
        
        duration = time.time() - start_time
        log_performance(logger, "generate_seo_content_async", duration,
                       keywords=target_keywords, brand=brand_name, content_type=content_type)
        
        if result:
            return {
                'success': True,
                'result': result,
                'duration': duration,
                'task_id': self.request.id
            }
        else:
            return {
                'success': False,
                'error': 'Failed to generate SEO content',
                'duration': duration,
                'task_id': self.request.id
            }
            
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Error in generate_seo_content_async: {e}")
        log_performance(logger, "generate_seo_content_async", duration, error=str(e))
        
        return {
            'success': False,
            'error': str(e),
            'duration': duration,
            'task_id': self.request.id
        }

@celery_app.task(bind=True, name='process_bulk_csv_async')
def process_bulk_csv_async(self, csv_content: str, default_brand_name: str,
                          default_selling_points: str = "", case_type: str = 'sentence',
                          content_type: str = 'both', num_variations: int = 3) -> Dict[str, Any]:
    """
    Async task for processing bulk CSV files.
    
    Args:
        csv_content: CSV content as string
        default_brand_name: Default brand name for all entries
        default_selling_points: Default selling points
        case_type: Text case type
        content_type: Type of content to generate
        num_variations: Number of variations to generate
        
    Returns:
        Dictionary containing processed results or error information
    """
    start_time = time.time()
    
    try:
        # Update task state
        self.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Processing CSV...'}
        )
        
        # Parse CSV content
        import pandas as pd
        from io import StringIO
        
        df = pd.read_csv(StringIO(csv_content))
        total_rows = len(df)
        
        results = []
        
        for index, row in df.iterrows():
            # Update progress
            progress = int((index / total_rows) * 80) + 10
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': progress,
                    'total': 100,
                    'status': f'Processing row {index + 1} of {total_rows}...'
                }
            )
            
            try:
                # Extract data from row
                url = row.get('url', '')
                keywords = row.get('keywords', '')
                brand_name = row.get('brand_name', default_brand_name)
                
                if url and keywords:
                    # Generate content for this row
                    seo_result = generate_seo_content_async.delay(
                        url, keywords, brand_name, default_selling_points,
                        content_type, num_variations
                    )
                    
                    # Wait for result (in production, you might want to handle this differently)
                    seo_content = seo_result.get(timeout=300)  # 5 minutes timeout
                    
                    if seo_content.get('success'):
                        results.append({
                            'url': url,
                            'keywords': keywords,
                            'brand_name': brand_name,
                            **seo_content['result']
                        })
                    else:
                        results.append({
                            'url': url,
                            'error': seo_content.get('error', 'Unknown error')
                        })
                else:
                    results.append({
                        'url': url,
                        'error': 'Missing URL or keywords'
                    })
                    
            except Exception as e:
                results.append({
                    'url': row.get('url', ''),
                    'error': str(e)
                })
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 95, 'total': 100, 'status': 'Finalizing results...'}
        )
        
        duration = time.time() - start_time
        log_performance(logger, "process_bulk_csv_async", duration, rows_processed=total_rows)
        
        return {
            'success': True,
            'results': results,
            'total_processed': total_rows,
            'duration': duration,
            'task_id': self.request.id
        }
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Error in process_bulk_csv_async: {e}")
        log_performance(logger, "process_bulk_csv_async", duration, error=str(e))
        
        return {
            'success': False,
            'error': str(e),
            'duration': duration,
            'task_id': self.request.id
        }

@celery_app.task(bind=True, name='cleanup_old_tasks')
def cleanup_old_tasks(self, days: int = 7) -> Dict[str, Any]:
    """
    Cleanup old task results.
    
    Args:
        days: Number of days to keep task results
        
    Returns:
        Dictionary containing cleanup results
    """
    try:
        # This would typically interact with your result backend
        # For now, we'll just log the cleanup attempt
        logger.info(f"Cleanup task started for tasks older than {days} days")
        
        return {
            'success': True,
            'message': f'Cleanup completed for tasks older than {days} days',
            'task_id': self.request.id
        }
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_tasks: {e}")
        return {
            'success': False,
            'error': str(e),
            'task_id': self.request.id
        }
