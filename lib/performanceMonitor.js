// Performance monitoring utility for API routes
// Logs slow queries and helps identify bottlenecks

const SLOW_QUERY_THRESHOLD = 1000 // 1 second

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
    }

    /**
     * Start timing an operation
     */
    start(operationName) {
        const startTime = Date.now();
        return {
            end: () => {
                const duration = Date.now() - startTime;
                this.recordMetric(operationName, duration);

                // Log slow operations
                if (duration > SLOW_QUERY_THRESHOLD) {
                    console.warn(`⚠️ SLOW OPERATION: ${operationName} took ${duration}ms`);
                }

                return duration;
            }
        };
    }

    /**
     * Record metric
     */
    recordMetric(operation, duration) {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                avgTime: 0
            });
        }

        const metric = this.metrics.get(operation);
        metric.count++;
        metric.totalTime += duration;
        metric.minTime = Math.min(metric.minTime, duration);
        metric.maxTime = Math.max(metric.maxTime, duration);
        metric.avgTime = metric.totalTime / metric.count;
    }

    /**
     * Get metrics for an operation
     */
    getMetrics(operation) {
        return this.metrics.get(operation);
    }

    /**
     * Get all metrics
     */
    getAllMetrics() {
        const results = {};
        for (const [operation, metric] of this.metrics.entries()) {
            results[operation] = {
                ...metric,
                avgTime: Math.round(metric.avgTime)
            };
        }
        return results;
    }

    /**
     * Clear all metrics
     */
    clear() {
        this.metrics.clear();
    }

    /**
     * Log performance summary
     */
    logSummary() {
        console.log('\n📊 Performance Summary:');
        console.log('─'.repeat(80));

        const sortedMetrics = Array.from(this.metrics.entries())
            .sort((a, b) => b[1].avgTime - a[1].avgTime);

        for (const [operation, metric] of sortedMetrics) {
            const avg = Math.round(metric.avgTime);
            const emoji = avg > SLOW_QUERY_THRESHOLD ? '🐌' : avg > 500 ? '⚠️' : '✅';
            console.log(`${emoji} ${operation.padEnd(40)} avg: ${avg}ms (min: ${metric.minTime}ms, max: ${metric.maxTime}ms, calls: ${metric.count})`);
        }

        console.log('─'.repeat(80) + '\n');
    }
}

// Global performance monitor instance
const performanceMonitor = global.performanceMonitor || new PerformanceMonitor();
if (!global.performanceMonitor) {
    global.performanceMonitor = performanceMonitor;
}

// Log summary every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        if (performanceMonitor.metrics.size > 0) {
            performanceMonitor.logSummary();
        }
    }, 5 * 60 * 1000);
}

export default performanceMonitor;
