// パフォーマンス監視システム
interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number;  // Largest Contentful Paint
  FID?: number;  // First Input Delay  
  CLS?: number;  // Cumulative Layout Shift
  
  // 追加メトリクス
  FCP?: number;  // First Contentful Paint
  TTFB?: number; // Time to First Byte
  
  // アプリ固有メトリクス
  searchTime?: number;
  renderTime?: number;
  memoryUsage?: number;
  jsHeapSize?: number;
  
  // ユーザーエクスペリエンス
  pageLoadTime?: number;
  interactionTime?: number;
}

interface PerformanceThresholds {
  LCP: { good: 2500; poor: 4000 };
  FID: { good: 100; poor: 300 };
  CLS: { good: 0.1; poor: 0.25 };
  FCP: { good: 1800; poor: 3000 };
  TTFB: { good: 600; poor: 1500 };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private thresholds: PerformanceThresholds;
  
  constructor() {
    this.thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 600, poor: 1500 }
    };
    
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    if (!this.isSupported()) return;

    // Web Vitals監視
    this.observeWebVitals();
    
    // メモリ使用量監視
    this.observeMemoryUsage();
    
    // ナビゲーション監視
    this.observeNavigation();
    
    // カスタムメトリクス監視
    this.observeCustomMetrics();
  }

  private isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'PerformanceObserver' in window;
  }

  private observeWebVitals() {
    try {
      // LCP監視
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceNavigationTiming;
        this.metrics.LCP = lastEntry.loadEventEnd - lastEntry.loadEventStart;
        this.reportMetric('LCP', this.metrics.LCP);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // FID監視
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'first-input') {
            this.metrics.FID = (entry as any).processingStart - entry.startTime;
            this.reportMetric('FID', this.metrics.FID);
          }
        });
      }).observe({ entryTypes: ['first-input'], buffered: true });

      // CLS監視
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.CLS = clsValue;
        this.reportMetric('CLS', this.metrics.CLS);
      }).observe({ entryTypes: ['layout-shift'], buffered: true });

    } catch (error) {
      console.warn('Web Vitals monitoring setup failed:', error);
    }
  }

  private observeMemoryUsage() {
    // メモリ使用量の定期監視
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;
        this.metrics.jsHeapSize = memory.totalJSHeapSize;
        
        // メモリ使用量が閾値を超えた場合の警告
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        if (usageRatio > 0.8) {
          this.reportWarning('High memory usage detected', {
            usage: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            ratio: usageRatio
          });
        }
      }
    };

    // 初回実行と定期実行
    checkMemory();
    setInterval(checkMemory, 30000); // 30秒間隔
  }

  private observeNavigation() {
    // ナビゲーション情報の監視
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          this.metrics.TTFB = nav.responseStart - nav.requestStart;
          this.metrics.pageLoadTime = nav.loadEventEnd - nav.fetchStart;
          
          this.reportMetric('TTFB', this.metrics.TTFB);
          this.reportMetric('pageLoadTime', this.metrics.pageLoadTime);
        }
      });
    }).observe({ entryTypes: ['navigation'], buffered: true });
  }

  private observeCustomMetrics() {
    // カスタムメトリクスの監視
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (entry.name.startsWith('app-')) {
          const metricName = entry.name.replace('app-', '') as keyof PerformanceMetrics;
          (this.metrics as any)[metricName] = entry.duration;
          this.reportMetric(metricName, entry.duration);
        }
      });
    }).observe({ entryTypes: ['measure'], buffered: true });
  }

  // 検索パフォーマンス測定
  public measureSearchPerformance<T>(searchFn: () => Promise<T>, _query: string): Promise<T> {
    const startTime = performance.now();
    
    return searchFn().then(result => {
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      this.metrics.searchTime = searchTime;
      this.reportMetric('searchTime', searchTime);
      
      // パフォーマンスマークを記録
      performance.mark('search-end');
      performance.measure('app-search', 'search-start', 'search-end');
      
      return result;
    });
  }

  // レンダリングパフォーマンス測定
  public measureRenderPerformance(componentName: string, renderFn: () => void) {
    const startTime = performance.now();
    performance.mark(`render-${componentName}-start`);
    
    renderFn();
    
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      performance.mark(`render-${componentName}-end`);
      performance.measure(`app-render-${componentName}`, 
        `render-${componentName}-start`, 
        `render-${componentName}-end`);
      
      this.metrics.renderTime = renderTime;
      this.reportMetric('renderTime', renderTime);
    });
  }

  // インタラクション遅延測定
  public measureInteraction(interactionType: string, interactionFn: () => void) {
    const startTime = performance.now();
    
    interactionFn();
    
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      performance.measure(`app-interaction-${interactionType}`, {
        start: startTime,
        end: endTime
      });
      
      this.metrics.interactionTime = interactionTime;
      this.reportMetric('interactionTime', interactionTime);
    });
  }

  private reportMetric(metricName: string, value: number) {
    // コンソールにメトリクスを報告
    const status = this.getMetricStatus(metricName, value);
    const color = status === 'good' ? 'green' : status === 'poor' ? 'red' : 'orange';
    
    console.log(
      `%c[Performance] ${metricName}: ${value.toFixed(2)}ms (${status})`,
      `color: ${color}; font-weight: bold;`
    );

    // ローカルストレージに保存（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      const existingMetrics = JSON.parse(
        localStorage.getItem('performance-metrics') || '[]'
      );
      
      existingMetrics.push({
        name: metricName,
        value,
        status,
        timestamp: Date.now(),
        url: window.location.pathname
      });

      // 最新100件のみ保持
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }

      localStorage.setItem('performance-metrics', JSON.stringify(existingMetrics));
    }
  }

  private reportWarning(message: string, data: any) {
    console.warn(`[Performance Warning] ${message}`, data);
    
    // カスタムイベントを発火
    window.dispatchEvent(new CustomEvent('performance-warning', {
      detail: { message, data, timestamp: Date.now() }
    }));
  }

  private getMetricStatus(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = (this.thresholds as any)[metricName];
    if (!thresholds) return 'good';

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  // パフォーマンスサマリー取得
  public getPerformanceSummary(): PerformanceMetrics & { 
    score: number; 
    recommendations: string[] 
  } {
    const recommendations: string[] = [];
    let score = 100;

    // スコア計算とレコメンデーション生成
    Object.entries(this.metrics).forEach(([key, value]) => {
      const status = this.getMetricStatus(key, value);
      if (status === 'poor') {
        score -= 20;
        recommendations.push(`Improve ${key}: currently ${value}ms`);
      } else if (status === 'needs-improvement') {
        score -= 10;
        recommendations.push(`Consider optimizing ${key}: currently ${value}ms`);
      }
    });

    return {
      ...this.metrics,
      score: Math.max(0, score),
      recommendations
    };
  }

  // メトリクスリセット
  public resetMetrics() {
    this.metrics = {};
  }

  // パフォーマンスレポート生成
  public generateReport(): string {
    const summary = this.getPerformanceSummary();
    const timestamp = new Date().toISOString();
    
    return `
Performance Report - ${timestamp}
================================

Core Web Vitals:
- LCP: ${summary.LCP || 'N/A'}ms
- FID: ${summary.FID || 'N/A'}ms  
- CLS: ${summary.CLS || 'N/A'}

Additional Metrics:
- FCP: ${summary.FCP || 'N/A'}ms
- TTFB: ${summary.TTFB || 'N/A'}ms
- Page Load: ${summary.pageLoadTime || 'N/A'}ms
- Memory Usage: ${summary.memoryUsage ? (summary.memoryUsage / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}

App-Specific:
- Search Time: ${summary.searchTime || 'N/A'}ms
- Render Time: ${summary.renderTime || 'N/A'}ms
- Interaction Time: ${summary.interactionTime || 'N/A'}ms

Overall Score: ${summary.score}/100

Recommendations:
${summary.recommendations.map(rec => `- ${rec}`).join('\n')}
`;
  }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();

// React Hook
export const usePerformanceMonitor = () => {
  return {
    measureSearch: performanceMonitor.measureSearchPerformance.bind(performanceMonitor),
    measureRender: performanceMonitor.measureRenderPerformance.bind(performanceMonitor), 
    measureInteraction: performanceMonitor.measureInteraction.bind(performanceMonitor),
    getSummary: performanceMonitor.getPerformanceSummary.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
    resetMetrics: performanceMonitor.resetMetrics.bind(performanceMonitor)
  };
};

// デバッグ用のグローバル公開（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  (window as any).performanceMonitor = performanceMonitor;
}