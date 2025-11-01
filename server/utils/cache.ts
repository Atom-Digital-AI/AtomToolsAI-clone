import NodeCache from 'node-cache';

// Cache instances with different TTLs
export const userCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone objects for better performance
});

export const productCache = new NodeCache({ 
  stdTTL: 3600, // 1 hour
  checkperiod: 120,
  useClones: false,
});

export const cmsCache = new NodeCache({ 
  stdTTL: 1800, // 30 minutes
  checkperiod: 120,
  useClones: false,
});

export const guidelineCache = new NodeCache({ 
  stdTTL: 600, // 10 minutes
  checkperiod: 60,
  useClones: false,
});

// Cache statistics
export function getCacheStats() {
  return {
    user: userCache.getStats(),
    product: productCache.getStats(),
    cms: cmsCache.getStats(),
    guideline: guidelineCache.getStats(),
  };
}

// Clear all caches
export function clearAllCaches() {
  userCache.flushAll();
  productCache.flushAll();
  cmsCache.flushAll();
  guidelineCache.flushAll();
}
