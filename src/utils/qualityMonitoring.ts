// Quality monitoring and continuous improvement system

import { logger } from './logger';
import { handleError } from './errorHandler';

// Quality metrics interface
export interface QualityMetrics {
  performance: {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
    bundleSize: number;
  };
  reliability: {
    errorRate: number;
    crashRate: number;
    uptime: number;
  };
  usability: {
    taskCompletionRate: number;
    userSatisfaction: number;
    accessibilityScore: number;
  };
  maintainability: {
    codeComplexity: number;
    testCoverage: number;
    technicalDebt: number;
  };
}

// Quality monitoring service
export class QualityMonitor {
  private static instance: QualityMonitor;
  private metrics: Partial<QualityMetrics> = {};
  private observers: ((metrics: QualityMetrics) => void)[] = [];

  static getInstance(): QualityMonitor {
    if (!QualityMonitor.instance) {
      QualityMonitor.instance = new QualityMonitor();
    }
    return QualityMonitor.instance;
  }

  // Performance monitoring
  monitorPerformance(): void {
    if (typeof performance !== 'undefined') {
      // Web Vitals monitoring
      this.measureWebVitals();
      
      // Bundle size monitoring
      this.measureBundleSize();
      
      // Memory usage monitoring
      this.measureMemoryUsage();
    }
  }

  private measureWebVitals(): void {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.updateMetric('performance.loadTime', lastEntry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift (CLS)
    new PerformanceObserver((list) => {
      let cumulativeScore = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          cumulativeScore += (entry as any).value;
        }
      }
      this.updateMetric('performance.renderTime', cumulativeScore);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private measureBundleSize(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const bundleSize = navigationEntry?.transferSize || 0;
      this.updateMetric('performance.bundleSize', bundleSize);
    }
  }

  private measureMemoryUsage(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
      this.updateMetric('performance.memoryUsage', memoryUsage);
    }
  }

  // Error monitoring
  monitorErrors(): void {
    let errorCount = 0;
    let totalRequests = 0;

    // Global error handler
    window.addEventListener('error', (event) => {
      errorCount++;
      this.updateMetric('reliability.errorRate', errorCount / Math.max(totalRequests, 1));
      
      handleError(event.error, 'Global Error Handler');
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      errorCount++;
      this.updateMetric('reliability.errorRate', errorCount / Math.max(totalRequests, 1));
      
      handleError(event.reason, 'Unhandled Promise Rejection');
    });

    // Network request monitoring
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      totalRequests++;
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          errorCount++;
        }
        this.updateMetric('reliability.errorRate', errorCount / totalRequests);
        return response;
      } catch (error) {
        errorCount++;
        this.updateMetric('reliability.errorRate', errorCount / totalRequests);
        throw error;
      }
    };
  }

  // User experience monitoring
  monitorUserExperience(): void {
    // Task completion tracking
    this.trackTaskCompletion();
    
    // Accessibility monitoring
    this.monitorAccessibility();
    
    // User satisfaction surveys
    this.initializeUserFeedback();
  }

  private trackTaskCompletion(): void {
    const taskEvents = ['note-created', 'note-saved', 'note-exported', 'note-imported'];
    let completedTasks = 0;
    let attemptedTasks = 0;

    taskEvents.forEach(event => {
      document.addEventListener(event, () => {
        completedTasks++;
        this.updateMetric('usability.taskCompletionRate', completedTasks / Math.max(attemptedTasks, 1));
      });
    });

    // Track task attempts
    document.addEventListener('task-attempted', () => {
      attemptedTasks++;
      this.updateMetric('usability.taskCompletionRate', completedTasks / attemptedTasks);
    });
  }

  private monitorAccessibility(): void {
    // Basic accessibility checks
    const checkAccessibility = () => {
      let score = 100;
      
      // Check for alt text on images
      const images = document.querySelectorAll('img');
      const imagesWithoutAlt = Array.from(images).filter(img => !img.alt);
      score -= (imagesWithoutAlt.length / images.length) * 20;
      
      // Check for form labels
      const inputs = document.querySelectorAll('input, textarea, select');
      const inputsWithoutLabels = Array.from(inputs).filter(input => 
        !input.hasAttribute('aria-label') && 
        !document.querySelector(`label[for="${input.id}"]`)
      );
      score -= (inputsWithoutLabels.length / inputs.length) * 30;
      
      // Check for heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;
      let hierarchyScore = 100;
      
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1));
        if (level > previousLevel + 1) {
          hierarchyScore -= 10;
        }
        previousLevel = level;
      });
      
      score = Math.max(0, score - (100 - hierarchyScore) * 0.5);
      
      this.updateMetric('usability.accessibilityScore', score);
    };

    // Run accessibility check periodically
    setInterval(checkAccessibility, 30000); // Every 30 seconds
  }

  private initializeUserFeedback(): void {
    // Simple feedback mechanism
    const showFeedbackPrompt = () => {
      const feedback = prompt('Rate your experience (1-5):');
      if (feedback && !isNaN(Number(feedback))) {
        const rating = Math.max(1, Math.min(5, Number(feedback)));
        this.updateMetric('usability.userSatisfaction', rating / 5);
      }
    };

    // Show feedback prompt occasionally
    setTimeout(() => {
      if (Math.random() < 0.1) { // 10% chance
        showFeedbackPrompt();
      }
    }, 60000); // After 1 minute
  }

  // Code quality monitoring
  monitorCodeQuality(): void {
    // This would typically be integrated with build tools
    // For demo purposes, we'll simulate some metrics
    
    const simulateCodeMetrics = () => {
      // Simulate test coverage data
      const coverage = this.getTestCoverage();
      this.updateMetric('maintainability.testCoverage', coverage);
      
      // Simulate complexity score
      const complexity = this.calculateComplexity();
      this.updateMetric('maintainability.codeComplexity', complexity);
      
      // Simulate technical debt
      const debt = this.calculateTechnicalDebt();
      this.updateMetric('maintainability.technicalDebt', debt);
    };

    simulateCodeMetrics();
  }

  private getTestCoverage(): number {
    // In a real implementation, this would fetch actual coverage data
    return 0.75; // 75% coverage
  }

  private calculateComplexity(): number {
    // Simplified complexity calculation
    const components = document.querySelectorAll('[data-component]').length;
    const complexity = Math.min(100, components * 2); // Simple metric
    return complexity;
  }

  private calculateTechnicalDebt(): number {
    // Simplified technical debt calculation
    const todos = document.documentElement.innerHTML.match(/TODO|FIXME|HACK/gi)?.length || 0;
    return Math.min(100, todos * 5);
  }

  // Utility methods
  private updateMetric(path: string, value: number): void {
    const keys = path.split('.');
    let current: any = this.metrics;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]!] = value;
    
    // Notify observers
    this.notifyObservers();
    
    // Log significant changes
    logger.info(`Quality metric updated: ${path} = ${value}`);
  }

  subscribe(callback: (metrics: QualityMetrics) => void): () => void {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => {
      callback(this.metrics as QualityMetrics);
    });
  }

  getMetrics(): Partial<QualityMetrics> {
    return { ...this.metrics };
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    
    return `
# Quality Report

## Performance
- Load Time: ${metrics.performance?.loadTime?.toFixed(2)}ms
- Render Time: ${metrics.performance?.renderTime?.toFixed(2)}ms
- Memory Usage: ${(metrics.performance?.memoryUsage || 0 * 100).toFixed(1)}%
- Bundle Size: ${(metrics.performance?.bundleSize || 0 / 1024).toFixed(1)}KB

## Reliability
- Error Rate: ${(metrics.reliability?.errorRate || 0 * 100).toFixed(2)}%
- Uptime: ${(metrics.reliability?.uptime || 0 * 100).toFixed(1)}%

## Usability
- Task Completion Rate: ${(metrics.usability?.taskCompletionRate || 0 * 100).toFixed(1)}%
- User Satisfaction: ${(metrics.usability?.userSatisfaction || 0 * 100).toFixed(1)}%
- Accessibility Score: ${metrics.usability?.accessibilityScore?.toFixed(1)}/100

## Maintainability
- Test Coverage: ${(metrics.maintainability?.testCoverage || 0 * 100).toFixed(1)}%
- Code Complexity: ${metrics.maintainability?.codeComplexity}
- Technical Debt: ${metrics.maintainability?.technicalDebt}
    `.trim();
  }
}

// Initialize quality monitoring
export const initializeQualityMonitoring = (): QualityMonitor => {
  const monitor = QualityMonitor.getInstance();
  
  // Start monitoring different aspects
  monitor.monitorPerformance();
  monitor.monitorErrors();
  monitor.monitorUserExperience();
  monitor.monitorCodeQuality();
  
  // Log initial state
  logger.info('Quality monitoring initialized');
  
  return monitor;
};

// Export singleton instance
export const qualityMonitor = QualityMonitor.getInstance();

export default QualityMonitor;