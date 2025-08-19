// Analytics Service for Data-Driven Development
// Comprehensive metrics collection and user behavior tracking

interface UserEvent {
  eventType: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  context: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    referrer?: string;
  };
}

interface SessionData {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  userId?: string;
  events: UserEvent[];
  duration?: number;
  pageViews: string[];
  features: string[];
}

interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  context?: Record<string, any>;
}

// Removed unused interfaces to fix TypeScript warnings

interface UserFeedback {
  type: 'rating' | 'comment' | 'bug_report' | 'feature_request';
  content: string;
  rating?: number;
  userId?: string;
  timestamp: Date;
  context: Record<string, any>;
  resolved?: boolean;
}

class AnalyticsService {
  private events: UserEvent[] = [];
  private metrics: MetricData[] = [];
  private sessions: Map<string, SessionData> = new Map();
  private currentSessionId: string;
  private userId?: string;
  private isEnabled: boolean = true;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  // Removed unused field to fix TypeScript warnings

  // Event buffer for offline/failed requests
  private eventBuffer: UserEvent[] = [];
  private metricsBuffer: MetricData[] = [];

  constructor() {
    this.currentSessionId = this.generateSessionId();
    this.initializeSession();
    this.startPerformanceTracking();
    this.setupAutoFlush();
    this.setupVisibilityTracking();
    this.setupErrorTracking();
  }

  // Session Management
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeSession(): void {
    const session: SessionData = {
      sessionId: this.currentSessionId,
      startTime: new Date(),
      events: [],
      pageViews: [],
      features: []
    };
    
    this.sessions.set(this.currentSessionId, session);
    this.trackEvent('session_start', { sessionId: this.currentSessionId });
  }

  public setUserId(userId: string): void {
    this.userId = userId;
    const currentSession = this.sessions.get(this.currentSessionId);
    if (currentSession) {
      currentSession.userId = userId;
    }
    this.trackEvent('user_identified', { userId });
  }

  // Core Event Tracking
  public trackEvent(eventType: string, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    const eventData: UserEvent = {
      eventType,
      properties: {
        ...properties,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.currentSessionId,
      context: this.getContext()
    };
    
    if (this.userId) {
      eventData.userId = this.userId;
    }
    
    const event = eventData;

    this.events.push(event);
    this.addEventToSession(event);
    this.bufferEvent(event);

    // Auto-flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  private addEventToSession(event: UserEvent): void {
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.events.push(event);
      
      // Track page views
      if (event.eventType === 'page_view') {
        session.pageViews.push(event.properties.page);
      }
      
      // Track feature usage
      if (event.properties.feature) {
        if (!session.features.includes(event.properties.feature)) {
          session.features.push(event.properties.feature);
        }
      }
    }
  }

  // Metrics Collection
  public trackMetric(name: string, value: number, unit: string = 'count', tags: Record<string, string> = {}): void {
    if (!this.isEnabled) return;

    const metric: MetricData = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags: {
        ...tags,
        sessionId: this.currentSessionId,
        userId: this.userId || 'anonymous'
      }
    };

    this.metrics.push(metric);
    this.bufferMetric(metric);
  }

  // Feature Usage Tracking
  public trackFeatureUsage(featureName: string, action: string = 'used', properties: Record<string, any> = {}): void {
    this.trackEvent('feature_usage', {
      feature: featureName,
      action,
      ...properties
    });

    this.trackMetric(`feature.${featureName}.usage`, 1, 'count', {
      action,
      feature: featureName
    });
  }

  // Performance Tracking
  private startPerformanceTracking(): void {
    // Navigation timing
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => this.collectNavigationTiming(), 0);
      });

      // Resource timing
      this.setupResourceTimingObserver();
      
      // Long task observer
      this.setupLongTaskObserver();
      
      // Layout shift observer
      this.setupLayoutShiftObserver();
    }
  }

  private collectNavigationTiming(): void {
    if (!window.performance || !window.performance.timing) return;

    const timing = window.performance.timing;
    const navigation = window.performance.navigation;
    
    const metrics = {
      // Core Web Vitals
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      
      // Navigation metrics
      dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
      tcpConnection: timing.connectEnd - timing.connectStart,
      serverResponse: timing.responseEnd - timing.requestStart,
      domProcessing: timing.domComplete - timing.domLoading,
      
      // Navigation type
      navigationType: navigation.type,
      redirectCount: navigation.redirectCount
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (typeof value === 'number' && value > 0) {
        this.trackMetric(`performance.${name}`, value, 'ms');
      }
    });
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fpEntry = paintEntries.find(entry => entry.name === 'first-paint');
    return fpEntry ? fpEntry.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? fcpEntry.startTime : 0;
  }

  private setupResourceTimingObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 100) { // Only track slow resources
            this.trackMetric('performance.resource.duration', entry.duration, 'ms', {
              resourceType: (entry as any).initiatorType || 'unknown',
              resourceName: entry.name.split('/').pop() || 'unknown'
            });
          }
        });
      });
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  private setupLongTaskObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.trackMetric('performance.longTask.duration', entry.duration, 'ms');
          this.trackEvent('performance_long_task', {
            duration: entry.duration,
            startTime: entry.startTime
          });
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  private setupLayoutShiftObserver(): void {
    if ('PerformanceObserver' in window) {
      let cumulativeLayoutShift = 0;
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value;
          }
        });
        
        this.trackMetric('performance.cumulativeLayoutShift', cumulativeLayoutShift, 'score');
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }

  // Error and Exception Tracking
  private setupErrorTracking(): void {
    if (typeof window === 'undefined') return;

    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });
  }

  // Visibility and Engagement Tracking
  private setupVisibilityTracking(): void {
    if (typeof document === 'undefined') return;

    let visibilityStart = Date.now();
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const visibilityDuration = Date.now() - visibilityStart;
        this.trackMetric('engagement.visibilityDuration', visibilityDuration, 'ms');
        this.trackEvent('page_blur', { duration: visibilityDuration });
      } else {
        visibilityStart = Date.now();
        this.trackEvent('page_focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Track when user leaves the page
    window.addEventListener('beforeunload', () => {
      this.endCurrentSession();
      this.flush(true); // Force immediate flush
    });
  }

  private endCurrentSession(): void {
    const session = this.sessions.get(this.currentSessionId);
    if (session && !session.endTime) {
      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();
      
      this.trackEvent('session_end', {
        sessionId: this.currentSessionId,
        duration: session.duration,
        eventCount: session.events.length,
        featuresUsed: session.features.length
      });
    }
  }

  // Conversion and Funnel Tracking
  public trackConversion(funnelName: string, step: string, properties: Record<string, any> = {}): void {
    this.trackEvent('funnel_step', {
      funnel: funnelName,
      step,
      ...properties
    });
  }

  public trackPurchase(value: number, currency: string = 'USD', properties: Record<string, any> = {}): void {
    this.trackEvent('purchase', {
      value,
      currency,
      ...properties
    });
    
    this.trackMetric('revenue.purchase', value, currency);
  }

  // User Feedback Collection
  public trackFeedback(feedback: UserFeedback): void {
    this.trackEvent('user_feedback', {
      type: feedback.type,
      content: feedback.content,
      rating: feedback.rating,
      context: feedback.context
    });
    
    if (feedback.rating) {
      this.trackMetric('satisfaction.rating', feedback.rating, 'score', {
        feedbackType: feedback.type
      });
    }
  }

  // A/B Test Support
  public trackExperiment(experimentName: string, variant: string, properties: Record<string, any> = {}): void {
    this.trackEvent('experiment_exposure', {
      experiment: experimentName,
      variant,
      ...properties
    });
    
    // Store in session for consistent experience
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`experiment_${experimentName}`, variant);
    }
  }

  public getExperimentVariant(experimentName: string): string | null {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(`experiment_${experimentName}`);
    }
    return null;
  }

  // Data Export and Analysis
  public exportData(startDate?: Date, endDate?: Date): {
    events: UserEvent[];
    metrics: MetricData[];
    sessions: SessionData[];
  } {
    const filterByDate = (items: any[], dateField: string) => {
      if (!startDate && !endDate) return items;
      
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        return true;
      });
    };

    return {
      events: filterByDate(this.events, 'timestamp'),
      metrics: filterByDate(this.metrics, 'timestamp'),
      sessions: Array.from(this.sessions.values()).filter(session => {
        if (!startDate && !endDate) return true;
        if (startDate && session.startTime < startDate) return false;
        if (endDate && session.startTime > endDate) return false;
        return true;
      })
    };
  }

  // Configuration and Control
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.flush(true);
    }
  }

  public setBatchSize(size: number): void {
    this.batchSize = Math.max(1, size);
  }

  public setFlushInterval(interval: number): void {
    this.flushInterval = Math.max(1000, interval);
  }

  // Private helper methods
  private getContext(): UserEvent['context'] {
    if (typeof window === 'undefined') {
      return {
        url: '',
        userAgent: '',
        viewport: { width: 0, height: 0 }
      };
    }

    const context = {
      url: window.location.href,
      userAgent: window.navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    } as UserEvent['context'];
    
    if (document.referrer) {
      context.referrer = document.referrer;
    }
    
    return context;
  }

  private bufferEvent(event: UserEvent): void {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > 1000) { // Prevent memory leaks
      this.eventBuffer = this.eventBuffer.slice(-500);
    }
  }

  private bufferMetric(metric: MetricData): void {
    this.metricsBuffer.push(metric);
    if (this.metricsBuffer.length > 1000) {
      this.metricsBuffer = this.metricsBuffer.slice(-500);
    }
  }

  private setupAutoFlush(): void {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private async flush(force: boolean = false): Promise<void> {
    if (!force && (!this.events.length && !this.metrics.length)) return;

    try {
      // In a real implementation, this would send data to your analytics backend
      await this.sendToAnalyticsBackend({
        events: [...this.events],
        metrics: [...this.metrics],
        sessionId: this.currentSessionId,
        timestamp: new Date()
      });

      // Clear sent data
      this.events = [];
      this.metrics = [];
      
    } catch (error) {
      console.warn('Analytics flush failed:', error);
      // Keep data for retry
    }
  }

  private async sendToAnalyticsBackend(data: any): Promise<void> {
    // Mock implementation - replace with actual API call
    if (typeof window !== 'undefined' && window.localStorage) {
      const existingData = JSON.parse(localStorage.getItem('analytics_data') || '[]');
      existingData.push(data);
      localStorage.setItem('analytics_data', JSON.stringify(existingData.slice(-100))); // Keep last 100 entries
    }
    
    // In production, replace with:
    // return fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
  }

  // Public API for getting analytics insights
  public getInsights(): {
    sessionCount: number;
    averageSessionDuration: number;
    topFeatures: Array<{ name: string; count: number }>;
    errorRate: number;
    performanceScore: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const validSessions = sessions.filter(s => s.duration);
    
    // Calculate average session duration
    const avgDuration = validSessions.length > 0 
      ? validSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / validSessions.length 
      : 0;

    // Get top features
    const featureUsage = new Map<string, number>();
    this.events.forEach(event => {
      if (event.eventType === 'feature_usage' && event.properties.feature) {
        const count = featureUsage.get(event.properties.feature) || 0;
        featureUsage.set(event.properties.feature, count + 1);
      }
    });
    
    const topFeatures = Array.from(featureUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Calculate error rate
    const errorEvents = this.events.filter(e => 
      e.eventType.includes('error') || e.eventType.includes('exception')
    );
    const errorRate = this.events.length > 0 ? errorEvents.length / this.events.length : 0;

    // Simple performance score (inverse of average load time)
    const performanceMetrics = this.metrics.filter(m => m.name.includes('performance'));
    const avgLoadTime = performanceMetrics.length > 0 
      ? performanceMetrics.reduce((sum, m) => sum + m.value, 0) / performanceMetrics.length 
      : 1000;
    const performanceScore = Math.max(0, 100 - (avgLoadTime / 100));

    return {
      sessionCount: sessions.length,
      averageSessionDuration: Math.round(avgDuration),
      topFeatures,
      errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimals
      performanceScore: Math.round(performanceScore)
    };
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();

// React Hook for easier usage
export const useAnalytics = () => {
  return {
    trackEvent: analyticsService.trackEvent.bind(analyticsService),
    trackMetric: analyticsService.trackMetric.bind(analyticsService),
    trackFeatureUsage: analyticsService.trackFeatureUsage.bind(analyticsService),
    trackConversion: analyticsService.trackConversion.bind(analyticsService),
    trackFeedback: analyticsService.trackFeedback.bind(analyticsService),
    trackExperiment: analyticsService.trackExperiment.bind(analyticsService),
    getExperimentVariant: analyticsService.getExperimentVariant.bind(analyticsService),
    setUserId: analyticsService.setUserId.bind(analyticsService),
    getInsights: analyticsService.getInsights.bind(analyticsService)
  };
};

export default analyticsService;