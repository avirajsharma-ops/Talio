// Simple in-memory cache for API queries
// Cache expires after specified TTL (time-to-live)

class QueryCache {
    constructor() {
        this.cache = new Map();
        this.ttls = new Map();
    }

    /**
     * Generate cache key from multiple parameters
     */
    generateKey(...params) {
        return JSON.stringify(params);
    }

    /**
     * Get cached value
     */
    get(key) {
        const ttl = this.ttls.get(key);

        // Check if cache expired
        if (ttl && Date.now() > ttl) {
            this.cache.delete(key);
            this.ttls.delete(key);
            return null;
        }

        return this.cache.get(key);
    }

    /**
     * Set cache value with TTL in milliseconds
     */
    set(key, value, ttl = 60000) { // Default 60 seconds
        this.cache.set(key, value);
        this.ttls.set(key, Date.now() + ttl);
    }

    /**
     * Delete specific cache entry
     */
    delete(key) {
        this.cache.delete(key);
        this.ttls.delete(key);
    }

    /**
     * Clear all cache entries matching a pattern
     */
    clearPattern(pattern) {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                this.ttls.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.ttls.clear();
    }

    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
}

// Global cache instance
const queryCache = global.queryCache || new QueryCache();
if (!global.queryCache) {
    global.queryCache = queryCache;
}

export default queryCache;
