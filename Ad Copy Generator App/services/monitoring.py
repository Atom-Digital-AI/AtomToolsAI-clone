import time
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import structlog

logger = structlog.get_logger()

@dataclass
class MetricData:
    """Data class for metric information."""
    name: str
    value: float
    labels: Dict[str, str]
    timestamp: datetime

class MonitoringService:
    """Service for monitoring and observability."""
    
    def __init__(self):
        """Initialize the monitoring service."""
        # Prometheus metrics
        self.request_counter = Counter(
            'ad_copy_generator_requests_total',
            'Total number of requests',
            ['endpoint', 'method', 'status']
        )
        
        self.request_duration = Histogram(
            'ad_copy_generator_request_duration_seconds',
            'Request duration in seconds',
            ['endpoint', 'method']
        )
        
        self.api_call_counter = Counter(
            'ad_copy_generator_api_calls_total',
            'Total number of API calls',
            ['service', 'status']
        )
        
        self.api_call_duration = Histogram(
            'ad_copy_generator_api_call_duration_seconds',
            'API call duration in seconds',
            ['service']
        )
        
        self.active_tasks = Gauge(
            'ad_copy_generator_active_tasks',
            'Number of active tasks',
            ['task_type']
        )
        
        self.cache_hits = Counter(
            'ad_copy_generator_cache_hits_total',
            'Total number of cache hits',
            ['cache_type']
        )
        
        self.cache_misses = Counter(
            'ad_copy_generator_cache_misses_total',
            'Total number of cache misses',
            ['cache_type']
        )
        
        # In-memory metrics storage for custom metrics
        self.custom_metrics: List[MetricData] = []
        self.performance_data: Dict[str, List[float]] = {}
        
        logger.info("Monitoring service initialized")
    
    def record_request(self, endpoint: str, method: str, status: int, duration: float):
        """Record a request metric."""
        self.request_counter.labels(endpoint=endpoint, method=method, status=status).inc()
        self.request_duration.labels(endpoint=endpoint, method=method).observe(duration)
        
        logger.info("Request recorded", 
                   endpoint=endpoint, 
                   method=method, 
                   status=status, 
                   duration=duration)
    
    def record_api_call(self, service: str, status: str, duration: float):
        """Record an API call metric."""
        self.api_call_counter.labels(service=service, status=status).inc()
        self.api_call_duration.labels(service=service).observe(duration)
        
        logger.info("API call recorded", 
                   service=service, 
                   status=status, 
                   duration=duration)
    
    def record_task_start(self, task_type: str):
        """Record a task start."""
        self.active_tasks.labels(task_type=task_type).inc()
        
        logger.info("Task started", task_type=task_type)
    
    def record_task_end(self, task_type: str):
        """Record a task end."""
        self.active_tasks.labels(task_type=task_type).dec()
        
        logger.info("Task ended", task_type=task_type)
    
    def record_cache_hit(self, cache_type: str):
        """Record a cache hit."""
        self.cache_hits.labels(cache_type=cache_type).inc()
        
        logger.debug("Cache hit recorded", cache_type=cache_type)
    
    def record_cache_miss(self, cache_type: str):
        """Record a cache miss."""
        self.cache_misses.labels(cache_type=cache_type).inc()
        
        logger.debug("Cache miss recorded", cache_type=cache_type)
    
    def record_custom_metric(self, name: str, value: float, labels: Dict[str, str] = None):
        """Record a custom metric."""
        metric = MetricData(
            name=name,
            value=value,
            labels=labels or {},
            timestamp=datetime.utcnow()
        )
        self.custom_metrics.append(metric)
        
        # Keep only last 1000 metrics
        if len(self.custom_metrics) > 1000:
            self.custom_metrics = self.custom_metrics[-1000:]
        
        logger.debug("Custom metric recorded", name=name, value=value, labels=labels)
    
    def record_performance(self, operation: str, duration: float):
        """Record performance data."""
        if operation not in self.performance_data:
            self.performance_data[operation] = []
        
        self.performance_data[operation].append(duration)
        
        # Keep only last 1000 performance records per operation
        if len(self.performance_data[operation]) > 1000:
            self.performance_data[operation] = self.performance_data[operation][-1000:]
        
        logger.debug("Performance recorded", operation=operation, duration=duration)
    
    def get_performance_stats(self, operation: str) -> Dict[str, float]:
        """Get performance statistics for an operation."""
        if operation not in self.performance_data or not self.performance_data[operation]:
            return {}
        
        durations = self.performance_data[operation]
        return {
            'count': len(durations),
            'mean': sum(durations) / len(durations),
            'min': min(durations),
            'max': max(durations),
            'p95': sorted(durations)[int(len(durations) * 0.95)],
            'p99': sorted(durations)[int(len(durations) * 0.99)]
        }
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of all metrics."""
        summary = {
            'timestamp': datetime.utcnow().isoformat(),
            'custom_metrics': [asdict(metric) for metric in self.custom_metrics[-100:]],
            'performance_stats': {}
        }
        
        for operation in self.performance_data:
            summary['performance_stats'][operation] = self.get_performance_stats(operation)
        
        return summary
    
    def get_prometheus_metrics(self) -> str:
        """Get Prometheus metrics in text format."""
        return generate_latest()
    
    def cleanup_old_metrics(self, days: int = 7):
        """Clean up old metrics."""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Clean up custom metrics
        self.custom_metrics = [
            metric for metric in self.custom_metrics 
            if metric.timestamp > cutoff_date
        ]
        
        # Clean up performance data (keep only last 1000 records per operation)
        for operation in self.performance_data:
            if len(self.performance_data[operation]) > 1000:
                self.performance_data[operation] = self.performance_data[operation][-1000:]
        
        logger.info("Old metrics cleaned up", cutoff_date=cutoff_date.isoformat())

# Global monitoring service instance
monitoring_service = MonitoringService()

def monitor_request(endpoint: str, method: str):
    """Decorator for monitoring requests."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                status = 200
                return result
            except Exception as e:
                status = 500
                raise
            finally:
                duration = time.time() - start_time
                monitoring_service.record_request(endpoint, method, status, duration)
        return wrapper
    return decorator

def monitor_api_call(service: str):
    """Decorator for monitoring API calls."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                duration = time.time() - start_time
                monitoring_service.record_api_call(service, status, duration)
        return wrapper
    return decorator

def monitor_task(task_type: str):
    """Decorator for monitoring tasks."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            monitoring_service.record_task_start(task_type)
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                monitoring_service.record_task_end(task_type)
        return wrapper
    return decorator
