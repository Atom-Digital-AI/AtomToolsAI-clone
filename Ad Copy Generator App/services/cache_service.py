import json
import hashlib
import time
import logging
from typing import Any, Optional, Dict, Union
from functools import wraps
import redis
from cachetools import TTLCache, LRUCache
from config import Config

logger = logging.getLogger(__name__)

class CacheService:
    """Service for managing caching operations."""
    
    def __init__(self):
        """Initialize the cache service."""
        self.redis_client = None
        self.memory_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour TTL
        self.lru_cache = LRUCache(maxsize=500)
        
        # Try to connect to Redis
        try:
            redis_url = getattr(Config, 'REDIS_URL', 'redis://localhost:6379/0')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            logger.info("Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"Redis not available, using in-memory cache only: {e}")
            self.redis_client = None
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a cache key from arguments."""
        # Create a string representation of the arguments
        key_data = f"{prefix}:{str(args)}:{str(sorted(kwargs.items()))}"
        # Generate hash for consistent key length
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from cache."""
        try:
            # Try Redis first
            if self.redis_client:
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
            
            # Fallback to memory cache
            if key in self.memory_cache:
                return self.memory_cache[key]
            
            return default
            
        except Exception as e:
            logger.error(f"Error getting from cache: {e}")
            return default
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set a value in cache."""
        try:
            # Try Redis first
            if self.redis_client:
                serialized_value = json.dumps(value)
                self.redis_client.setex(key, ttl, serialized_value)
                return True
            
            # Fallback to memory cache
            self.memory_cache[key] = value
            return True
            
        except Exception as e:
            logger.error(f"Error setting cache: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete a value from cache."""
        try:
            # Try Redis first
            if self.redis_client:
                self.redis_client.delete(key)
            
            # Remove from memory cache
            if key in self.memory_cache:
                del self.memory_cache[key]
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting from cache: {e}")
            return False
    
    def clear(self) -> bool:
        """Clear all cache."""
        try:
            # Clear Redis
            if self.redis_client:
                self.redis_client.flushdb()
            
            # Clear memory cache
            self.memory_cache.clear()
            self.lru_cache.clear()
            
            return True
            
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    def get_or_set(self, key: str, default_func, ttl: int = 3600) -> Any:
        """Get a value from cache or set it using the default function."""
        value = self.get(key)
        if value is None:
            value = default_func()
            self.set(key, value, ttl)
        return value
    
    def cache_result(self, prefix: str = "cache", ttl: int = 3600):
        """Decorator for caching function results."""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = self._generate_key(prefix, func.__name__, *args, **kwargs)
                
                # Try to get from cache
                cached_result = self.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache hit for {cache_key}")
                    return cached_result
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl)
                logger.debug(f"Cache miss for {cache_key}, stored result")
                
                return result
            return wrapper
        return decorator

# Global cache service instance
cache_service = CacheService()

def cache_url_content(ttl: int = 3600):
    """Decorator for caching URL content."""
    return cache_service.cache_result(prefix="url_content", ttl=ttl)

def cache_api_response(ttl: int = 1800):
    """Decorator for caching API responses."""
    return cache_service.cache_result(prefix="api_response", ttl=ttl)

def cache_seo_content(ttl: int = 7200):
    """Decorator for caching SEO content."""
    return cache_service.cache_result(prefix="seo_content", ttl=ttl)

def cache_ad_copy(ttl: int = 7200):
    """Decorator for caching ad copy."""
    return cache_service.cache_result(prefix="ad_copy", ttl=ttl)
