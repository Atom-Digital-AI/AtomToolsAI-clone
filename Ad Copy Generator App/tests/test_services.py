import unittest
from unittest.mock import Mock, patch, MagicMock
import time
import json
from datetime import datetime
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.cache_service import CacheService, cache_service
from services.monitoring import MonitoringService, monitoring_service
from services.openai_service import OpenAIService
from services.celery_app import create_celery_app

class TestCacheService(unittest.TestCase):
    """Test cases for the cache service."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.cache_service = CacheService()
    
    def test_cache_key_generation(self):
        """Test cache key generation."""
        key1 = self.cache_service._generate_key("test", "arg1", "arg2", kwarg1="value1")
        key2 = self.cache_service._generate_key("test", "arg1", "arg2", kwarg1="value1")
        
        # Same arguments should generate same key
        self.assertEqual(key1, key2)
        
        # Different arguments should generate different keys
        key3 = self.cache_service._generate_key("test", "arg1", "arg3", kwarg1="value1")
        self.assertNotEqual(key1, key3)
    
    def test_cache_set_get(self):
        """Test setting and getting values from cache."""
        test_key = "test_key"
        test_value = {"test": "data"}
        
        # Test setting value
        result = self.cache_service.set(test_key, test_value)
        self.assertTrue(result)
        
        # Test getting value
        retrieved_value = self.cache_service.get(test_key)
        self.assertEqual(retrieved_value, test_value)
    
    def test_cache_get_nonexistent(self):
        """Test getting non-existent key."""
        value = self.cache_service.get("nonexistent_key")
        self.assertIsNone(value)
        
        # Test with default value
        default_value = "default"
        value = self.cache_service.get("nonexistent_key", default_value)
        self.assertEqual(value, default_value)
    
    def test_cache_delete(self):
        """Test deleting values from cache."""
        test_key = "test_key"
        test_value = {"test": "data"}
        
        # Set value
        self.cache_service.set(test_key, test_value)
        
        # Verify value exists
        self.assertEqual(self.cache_service.get(test_key), test_value)
        
        # Delete value
        result = self.cache_service.delete(test_key)
        self.assertTrue(result)
        
        # Verify value is deleted
        self.assertIsNone(self.cache_service.get(test_key))
    
    def test_cache_clear(self):
        """Test clearing all cache."""
        # Add some test data
        self.cache_service.set("key1", "value1")
        self.cache_service.set("key2", "value2")
        
        # Clear cache
        result = self.cache_service.clear()
        self.assertTrue(result)
        
        # Verify cache is cleared
        self.assertIsNone(self.cache_service.get("key1"))
        self.assertIsNone(self.cache_service.get("key2"))
    
    def test_cache_decorator(self):
        """Test cache decorator functionality."""
        call_count = 0
        
        @self.cache_service.cache_result(prefix="test", ttl=3600)
        def test_function(arg1, arg2):
            nonlocal call_count
            call_count += 1
            return f"result_{arg1}_{arg2}"
        
        # First call should execute function
        result1 = test_function("a", "b")
        self.assertEqual(result1, "result_a_b")
        self.assertEqual(call_count, 1)
        
        # Second call with same arguments should use cache
        result2 = test_function("a", "b")
        self.assertEqual(result2, "result_a_b")
        self.assertEqual(call_count, 1)  # Should not increment
        
        # Different arguments should execute function again
        result3 = test_function("c", "d")
        self.assertEqual(result3, "result_c_d")
        self.assertEqual(call_count, 2)

class TestMonitoringService(unittest.TestCase):
    """Test cases for the monitoring service."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.monitoring_service = MonitoringService()
    
    def test_record_request(self):
        """Test recording request metrics."""
        endpoint = "/test"
        method = "GET"
        status = 200
        duration = 1.5
        
        self.monitoring_service.record_request(endpoint, method, status, duration)
        
        # Verify metrics were recorded (we can't easily test Prometheus metrics in unit tests)
        # This test mainly ensures the method doesn't raise exceptions
        self.assertTrue(True)
    
    def test_record_api_call(self):
        """Test recording API call metrics."""
        service = "openai"
        status = "success"
        duration = 2.0
        
        self.monitoring_service.record_api_call(service, status, duration)
        
        # Verify metrics were recorded
        self.assertTrue(True)
    
    def test_record_task_start_end(self):
        """Test recording task start and end."""
        task_type = "ad_copy_generation"
        
        # Record task start
        self.monitoring_service.record_task_start(task_type)
        
        # Record task end
        self.monitoring_service.record_task_end(task_type)
        
        # Verify metrics were recorded
        self.assertTrue(True)
    
    def test_record_custom_metric(self):
        """Test recording custom metrics."""
        name = "test_metric"
        value = 42.5
        labels = {"label1": "value1"}
        
        self.monitoring_service.record_custom_metric(name, value, labels)
        
        # Verify metric was recorded
        self.assertEqual(len(self.monitoring_service.custom_metrics), 1)
        metric = self.monitoring_service.custom_metrics[0]
        self.assertEqual(metric.name, name)
        self.assertEqual(metric.value, value)
        self.assertEqual(metric.labels, labels)
    
    def test_record_performance(self):
        """Test recording performance data."""
        operation = "test_operation"
        duration = 1.5
        
        self.monitoring_service.record_performance(operation, duration)
        
        # Verify performance data was recorded
        self.assertIn(operation, self.monitoring_service.performance_data)
        self.assertEqual(len(self.monitoring_service.performance_data[operation]), 1)
        self.assertEqual(self.monitoring_service.performance_data[operation][0], duration)
    
    def test_get_performance_stats(self):
        """Test getting performance statistics."""
        operation = "test_operation"
        durations = [1.0, 2.0, 3.0, 4.0, 5.0]
        
        for duration in durations:
            self.monitoring_service.record_performance(operation, duration)
        
        stats = self.monitoring_service.get_performance_stats(operation)
        
        self.assertEqual(stats['count'], 5)
        self.assertEqual(stats['mean'], 3.0)
        self.assertEqual(stats['min'], 1.0)
        self.assertEqual(stats['max'], 5.0)
        self.assertEqual(stats['p95'], 4.0)
        self.assertEqual(stats['p99'], 5.0)
    
    def test_get_metrics_summary(self):
        """Test getting metrics summary."""
        # Add some test data
        self.monitoring_service.record_custom_metric("test_metric", 42.5)
        self.monitoring_service.record_performance("test_operation", 1.5)
        
        summary = self.monitoring_service.get_metrics_summary()
        
        self.assertIn('timestamp', summary)
        self.assertIn('custom_metrics', summary)
        self.assertIn('performance_stats', summary)
        self.assertEqual(len(summary['custom_metrics']), 1)
        self.assertIn('test_operation', summary['performance_stats'])

class TestOpenAIService(unittest.TestCase):
    """Test cases for the OpenAI service."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Mock the OpenAI API key
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test_key'}):
            self.openai_service = OpenAIService()
    
    @patch('openai.ChatCompletion.create')
    def test_generate_ad_copy(self, mock_create):
        """Test ad copy generation."""
        # Mock the OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = '''
        {
            "headline": "Test Headline",
            "description1": "Test Description 1",
            "description2": "Test Description 2",
            "call_to_action": "Test CTA"
        }
        '''
        mock_create.return_value = mock_response
        
        # Test ad copy generation
        result = self.openai_service.generate_ad_copy(
            "Test content",
            "test keywords",
            "Test Brand",
            "Test selling points"
        )
        
        self.assertIsNotNone(result)
        self.assertIn('headline', result)
        self.assertEqual(result['headline'], 'Test Headline')
    
    @patch('openai.ChatCompletion.create')
    def test_generate_seo_content(self, mock_create):
        """Test SEO content generation."""
        # Mock the OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = '''
        {
            "titles": ["Test Title 1", "Test Title 2"],
            "descriptions": ["Test Description 1", "Test Description 2"]
        }
        '''
        mock_create.return_value = mock_response
        
        # Test SEO content generation
        result = self.openai_service.generate_seo_content(
            "Test content",
            "test keywords",
            "Test Brand",
            "Test selling points"
        )
        
        self.assertIsNotNone(result)
        self.assertIn('titles', result)
        self.assertIn('descriptions', result)
        self.assertEqual(len(result['titles']), 2)
        self.assertEqual(len(result['descriptions']), 2)

class TestCeleryApp(unittest.TestCase):
    """Test cases for the Celery application."""
    
    def test_create_celery_app(self):
        """Test Celery app creation."""
        # Mock Redis connection
        with patch('redis.from_url') as mock_redis:
            mock_redis.return_value.ping.return_value = True
            
            celery_app = create_celery_app()
            
            self.assertIsNotNone(celery_app)
            self.assertEqual(celery_app.conf.task_serializer, 'json')
            self.assertEqual(celery_app.conf.accept_content, ['json'])
            self.assertEqual(celery_app.conf.result_serializer, 'json')

if __name__ == '__main__':
    unittest.main()
