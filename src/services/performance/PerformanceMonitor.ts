// Performance Monitoring and Optimization System
// Real-time performance tracking with intelligent optimization

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'render' | 'api' | 'ai' | 'cache' | 'memory' | 'network';
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  render: {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
  api: {
    responseTime: number;
    errorRate: number;
  };
  ai: {
    responseTime: number;
    cacheHitRate: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
  };
}

interface OptimizationSuggestion {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  action?: () => Promise<void>;
  autoFix?: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private thresholds: PerformanceThresholds;
  private suggestions: OptimizationSuggestion[] = [];
  private isMonitoring = false;
  private reportingInterval?: NodeJS.Timeout;
  
  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      render: {
        fcp: 1800, // 1.8s
        lcp: 2500, // 2.5s
        fid: 100, // 100ms
        cls: 0.1, // 0.1
        ...thresholds?.render
      },
      api: {
        responseTime: 1000, // 1s
        errorRate: 0.05, // 5%
        ...thresholds?.api
      },
      ai: {
        responseTime: 3000, // 3s
        cacheHitRate: 0.7, // 70%
        ...thresholds?.ai
      },
      memory: {
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024, // 200MB
        ...thresholds?.memory
      }
    };
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor resource loading
    this.observeResourceTiming();
    
    // Monitor long tasks
    this.observeLongTasks();
    
    // Monitor memory usage
    this.observeMemoryUsage();
    
    // Monitor user interactions
    this.observeUserTiming();
    
    // Start periodic reporting
    this.reportingInterval = setInterval(() => {
      this.analyzePerformance();
    }, 30000); // Every 30 seconds
    
    console.log('📊 Performance monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Clear reporting interval
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    console.log('📊 Performance monitoring stopped');
  }

  private observeWebVitals(): void {
    if (typeof window === 'undefined') return;
    
    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric({
            name: 'FCP',
            value: entry.startTime,
            timestamp: Date.now(),
            category: 'render',
            metadata: { entry: entry.toJSON() }
          });
        }
      }
    });
    
    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', fcpObserver);
    } catch (error) {
      console.warn('FCP observer not supported');
    }

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      if (lastEntry) {
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          category: 'render',
          metadata: { 
            element: (lastEntry as any).element?.tagName,
            size: (lastEntry as any).size
          }
        });
      }
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported');
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      
      this.recordMetric({
        name: 'CLS',
        value: clsValue,
        timestamp: Date.now(),
        category: 'render'
      });
    });
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported');
    }
  }

  private observeResourceTiming(): void {
    if (typeof window === 'undefined') return;
    
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        this.recordMetric({
          name: 'Resource Load Time',
          value: entry.responseEnd - entry.startTime,
          timestamp: Date.now(),
          category: 'network',
          metadata: {
            name: entry.name,
            type: entry.initiatorType,
            size: entry.transferSize,
            cached: entry.transferSize === 0
          }
        });
      }
    });
    
    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch (error) {
      console.warn('Resource timing observer not supported');
    }
  }

  private observeLongTasks(): void {
    if (typeof window === 'undefined') return;
    
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric({
          name: 'Long Task',
          value: entry.duration,
          timestamp: Date.now(),
          category: 'render',
          metadata: {
            startTime: entry.startTime,
            attribution: (entry as any).attribution
          }
        });
      }
    });
    
    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (error) {
      console.warn('Long task observer not supported');
    }
  }

  private observeMemoryUsage(): void {
    if (typeof window === 'undefined') return;
    
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        
        this.recordMetric({
          name: 'Heap Used',
          value: memory.usedJSHeapSize,
          timestamp: Date.now(),
          category: 'memory',
          metadata: {
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          }
        });
      }
    };
    
    // Check memory every 5 seconds
    const memoryInterval = setInterval(checkMemory, 5000);
    
    // Store interval for cleanup
    (this.observers as any).set('memory-interval', memoryInterval);
  }

  private observeUserTiming(): void {
    if (typeof window === 'undefined') return;
    
    const userTimingObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric({
          name: entry.name,
          value: entry.duration || entry.startTime,
          timestamp: Date.now(),
          category: entry.entryType === 'measure' ? 'api' : 'render',
          metadata: {
            entryType: entry.entryType,
            detail: (entry as any).detail
          }
        });
      }
    });
    
    try {
      userTimingObserver.observe({ entryTypes: ['mark', 'measure'] });
      this.observers.set('user-timing', userTimingObserver);
    } catch (error) {
      console.warn('User timing observer not supported');
    }
  }

  // Public API for custom metrics
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    // Check thresholds immediately for critical metrics
    this.checkThresholds(metric);
  }

  measureFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return this.measureAsync(name, fn);
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      
      this.recordMetric({
        name,
        value: performance.now() - startTime,
        timestamp: Date.now(),
        category: 'api',
        metadata: { success: true }
      });
      
      return result;
    } catch (error) {
      this.recordMetric({
        name,
        value: performance.now() - startTime,
        timestamp: Date.now(),
        category: 'api',
        metadata: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });
      
      throw error;
    }
  }

  measureSync<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      
      this.recordMetric({
        name,
        value: performance.now() - startTime,
        timestamp: Date.now(),
        category: 'render',
        metadata: { success: true }
      });
      
      return result;
    } catch (error) {
      this.recordMetric({
        name,
        value: performance.now() - startTime,
        timestamp: Date.now(),
        category: 'render',
        metadata: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });
      
      throw error;
    }
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const suggestions: OptimizationSuggestion[] = [];
    
    switch (metric.name) {
      case 'FCP':
        if (metric.value > this.thresholds.render.fcp) {
          suggestions.push({
            id: 'slow-fcp',
            type: 'warning',
            category: 'render',
            title: 'Slow First Contentful Paint',
            description: `FCP is ${Math.round(metric.value)}ms, which exceeds the recommended ${this.thresholds.render.fcp}ms`,
            impact: 'high',
            difficulty: 'medium',
            autoFix: false
          });
        }
        break;
        
      case 'LCP':
        if (metric.value > this.thresholds.render.lcp) {
          suggestions.push({
            id: 'slow-lcp',
            type: 'critical',
            category: 'render',
            title: 'Slow Largest Contentful Paint',
            description: `LCP is ${Math.round(metric.value)}ms, which significantly impacts user experience`,
            impact: 'high',
            difficulty: 'hard',
            autoFix: false
          });
        }
        break;
        
      case 'CLS':
        if (metric.value > this.thresholds.render.cls) {
          suggestions.push({
            id: 'high-cls',
            type: 'warning',
            category: 'render',
            title: 'High Cumulative Layout Shift',
            description: `CLS is ${metric.value.toFixed(3)}, indicating layout instability`,
            impact: 'medium',
            difficulty: 'medium',
            autoFix: false
          });
        }
        break;
        
      case 'Long Task':
        if (metric.value > 50) {
          suggestions.push({
            id: 'long-task-' + Date.now(),
            type: 'warning',
            category: 'render',
            title: 'Long Task Detected',
            description: `A task took ${Math.round(metric.value)}ms, potentially blocking the main thread`,
            impact: 'medium',
            difficulty: 'medium',
            autoFix: false
          });
        }
        break;
        
      case 'Heap Used':
        if (metric.value > this.thresholds.memory.heapUsed) {
          suggestions.push({
            id: 'high-memory',
            type: 'warning',
            category: 'memory',
            title: 'High Memory Usage',
            description: `Heap usage is ${Math.round(metric.value / 1024 / 1024)}MB, consider optimizing memory usage`,
            impact: 'medium',
            difficulty: 'medium',
            autoFix: true,
            action: async () => {
              // Trigger garbage collection if available
              if ('gc' in window && typeof (window as any).gc === 'function') {
                (window as any).gc();
              }
              
              // Clear caches
              if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                  cacheNames.map(name => caches.delete(name))
                );
              }
            }
          });
        }
        break;
    }
    
    // Add new suggestions
    suggestions.forEach(suggestion => {
      const existing = this.suggestions.find(s => s.id === suggestion.id);
      if (!existing) {
        this.suggestions.push(suggestion);
      }
    });
  }

  private analyzePerformance(): void {
    const recentMetrics = this.metrics.filter(
      m => Date.now() - m.timestamp < 300000 // Last 5 minutes
    );
    
    if (recentMetrics.length === 0) return;
    
    // Generate performance insights
    this.generateInsights(recentMetrics);
    
    // Auto-apply fixable suggestions
    this.autoApplyFixes();
    
    console.log('📊 Performance analysis completed', {
      metrics: recentMetrics.length,
      suggestions: this.suggestions.length
    });
  }

  private generateInsights(metrics: PerformanceMetric[]): void {
    const categories = this.groupByCategory(metrics);
    
    // Analyze render performance
    if (categories.render && categories.render.length > 0) {
      const avgRenderTime = this.calculateAverage(categories.render.map(m => m.value));
      
      if (avgRenderTime > 50) {
        this.suggestions.push({
          id: 'slow-rendering',
          type: 'info',
          category: 'render',
          title: 'Optimize Rendering Performance',
          description: `Average render time is ${Math.round(avgRenderTime)}ms. Consider using React.memo, useMemo, or useCallback`,
          impact: 'medium',
          difficulty: 'easy',
          autoFix: false
        });
      }
    }
    
    // Analyze API performance
    if (categories.api && categories.api.length > 0) {
      const avgApiTime = this.calculateAverage(categories.api.map(m => m.value));
      const errorRate = categories.api.filter(m => m.metadata?.success === false).length / categories.api.length;
      
      if (avgApiTime > this.thresholds.api.responseTime) {
        this.suggestions.push({
          id: 'slow-api',
          type: 'warning',
          category: 'api',
          title: 'Slow API Response Times',
          description: `Average API response time is ${Math.round(avgApiTime)}ms. Consider caching or optimization`,
          impact: 'high',
          difficulty: 'medium',
          autoFix: false
        });
      }
      
      if (errorRate > this.thresholds.api.errorRate) {
        this.suggestions.push({
          id: 'high-error-rate',
          type: 'critical',
          category: 'api',
          title: 'High API Error Rate',
          description: `API error rate is ${Math.round(errorRate * 100)}%. Check network connectivity and API health`,
          impact: 'high',
          difficulty: 'hard',
          autoFix: false
        });
      }
    }
    
    // Analyze memory usage trends
    if (categories.memory && categories.memory.length > 5) {
      const memoryTrend = this.calculateTrend(categories.memory.slice(-10).map(m => m.value));
      
      if (memoryTrend > 0.1) { // 10% increase trend
        this.suggestions.push({
          id: 'memory-leak',
          type: 'critical',
          category: 'memory',
          title: 'Potential Memory Leak',
          description: 'Memory usage is trending upward. Check for memory leaks in components or event listeners',
          impact: 'high',
          difficulty: 'hard',
          autoFix: false
        });
      }
    }
  }

  private async autoApplyFixes(): Promise<void> {
    const fixableSuggestions = this.suggestions.filter(s => s.autoFix && s.action);
    
    for (const suggestion of fixableSuggestions) {
      try {
        await suggestion.action!();
        console.log(`✅ Auto-fixed: ${suggestion.title}`);
        
        // Remove the suggestion after fixing
        this.suggestions = this.suggestions.filter(s => s.id !== suggestion.id);
      } catch (error) {
        console.error(`❌ Failed to auto-fix: ${suggestion.title}`, error);
      }
    }
  }

  // Utility methods
  private groupByCategory(metrics: PerformanceMetric[]): Record<string, PerformanceMetric[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.category]) {
        acc[metric.category] = [];
      }
      acc[metric.category]!.push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    if (!first || !last) return 0;
    
    return (last - first) / first;
  }

  // Public API
  getMetrics(category?: string, limit?: number): PerformanceMetric[] {
    let filtered = category 
      ? this.metrics.filter(m => m.category === category)
      : this.metrics;
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return [...filtered];
  }

  getSuggestions(type?: OptimizationSuggestion['type']): OptimizationSuggestion[] {
    return type 
      ? this.suggestions.filter(s => s.type === type)
      : [...this.suggestions];
  }

  getPerformanceScore(): number {
    // Calculate a simple performance score based on recent metrics
    const recentMetrics = this.metrics.filter(
      m => Date.now() - m.timestamp < 60000 // Last minute
    );
    
    if (recentMetrics.length === 0) return 100;
    
    let score = 100;
    const criticalIssues = this.suggestions.filter(s => s.type === 'critical').length;
    const warnings = this.suggestions.filter(s => s.type === 'warning').length;
    
    score -= criticalIssues * 20;
    score -= warnings * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  clearSuggestions(): void {
    this.suggestions = [];
  }

  exportData(): {
    metrics: PerformanceMetric[];
    suggestions: OptimizationSuggestion[];
    score: number;
    timestamp: number;
  } {
    return {
      metrics: [...this.metrics],
      suggestions: [...this.suggestions],
      score: this.getPerformanceScore(),
      timestamp: Date.now()
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React Hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startMonitoring: () => performanceMonitor.startMonitoring(),
    stopMonitoring: () => performanceMonitor.stopMonitoring(),
    recordMetric: (metric: PerformanceMetric) => performanceMonitor.recordMetric(metric),
    measureAsync: <T>(name: string, fn: () => Promise<T>) => performanceMonitor.measureAsync(name, fn),
    measureSync: <T>(name: string, fn: () => T) => performanceMonitor.measureSync(name, fn),
    getMetrics: (category?: string, limit?: number) => performanceMonitor.getMetrics(category, limit),
    getSuggestions: (type?: OptimizationSuggestion['type']) => performanceMonitor.getSuggestions(type),
    getPerformanceScore: () => performanceMonitor.getPerformanceScore(),
    exportData: () => performanceMonitor.exportData()
  };
};

export { PerformanceMonitor };
export type { PerformanceMetric, OptimizationSuggestion, PerformanceThresholds };