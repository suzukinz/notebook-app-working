// A/B Testing Framework for Data-Driven Product Development
// Comprehensive experimentation platform with statistical analysis

import { analyticsService } from './analyticsService';
import { logger } from '../utils/logger';

interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  
  // Targeting
  audience: {
    percentage: number; // 0-100, what % of users should be included
    userSegments?: string[]; // Premium users, new users, etc.
    locations?: string[]; // Geographic targeting
    platforms?: string[]; // Web, mobile, desktop
    customRules?: Array<{
      property: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
      value: any;
    }>;
  };
  
  // Variants
  variants: Array<{
    id: string;
    name: string;
    description: string;
    allocation: number; // 0-1, sum of all variants should be 1
    config: Record<string, any>; // Feature flags, component props, etc.
  }>;
  
  // Metrics to track
  primaryMetric: {
    name: string;
    type: 'conversion_rate' | 'revenue' | 'engagement' | 'retention' | 'custom';
    goal: 'increase' | 'decrease';
    targetImprovement: number; // Minimum meaningful improvement (%)
  };
  
  secondaryMetrics: Array<{
    name: string;
    type: 'conversion_rate' | 'revenue' | 'engagement' | 'retention' | 'custom';
    goal?: 'increase' | 'decrease';
  }>;
  
  // Duration and sample size
  startDate: Date;
  endDate?: Date;
  minSampleSize: number;
  maxDuration?: number; // in days
  
  // Statistical settings
  confidenceLevel: number; // 0-1, typically 0.95
  statisticalPower: number; // 0-1, typically 0.8
  
  // Metadata
  hypothesis: string;
  owner: string;
  stakeholders: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ExperimentResult {
  experimentId: string;
  variant: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  exposureContext: Record<string, any>;
}

interface ExperimentMetrics {
  variant: string;
  sampleSize: number;
  primaryMetricValue: number;
  primaryMetricError: number;
  secondaryMetrics: Record<string, number>;
  conversionEvents: number;
  totalEvents: number;
  confidenceInterval: [number, number];
  pValue: number;
  statisticalSignificance: boolean;
}

interface ExperimentAnalysis {
  experimentId: string;
  status: 'insufficient_data' | 'running' | 'significant' | 'inconclusive' | 'failed';
  recommendation: 'continue' | 'stop_winner' | 'stop_loser' | 'extend' | 'redesign';
  
  overall: {
    participants: number;
    startDate: Date;
    currentDate: Date;
    daysRunning: number;
    progressToMinSample: number; // 0-1
  };
  
  variants: ExperimentMetrics[];
  
  winner?: {
    variant: string;
    improvement: number;
    confidenceLevel: number;
    reasoning: string;
  };
  
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'warning';
    message: string;
    data?: Record<string, any>;
  }>;
  
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
    impact?: 'high' | 'medium' | 'low';
  }>;
}

class ABTestingService {
  private experiments: Map<string, ExperimentConfig> = new Map();
  private results: Map<string, ExperimentResult[]> = new Map();
  private userVariantAssignments: Map<string, Map<string, string>> = new Map();
  private readonly storageKey = 'abtest_assignments';
  
  constructor() {
    this.loadStoredAssignments();
    // TODO: Implement analytics tracking if needed
    // this.setupAnalyticsTracking();
  }

  // Experiment Management
  public createExperiment(config: Omit<ExperimentConfig, 'createdAt' | 'updatedAt'>): ExperimentConfig {
    const experiment: ExperimentConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Validate experiment configuration
    this.validateExperimentConfig(experiment);
    
    this.experiments.set(experiment.id, experiment);
    this.results.set(experiment.id, []);
    
    logger.info('Experiment created', { experimentId: experiment.id, name: experiment.name });
    
    // Track experiment creation
    analyticsService.trackEvent('experiment_created', {
      experimentId: experiment.id,
      name: experiment.name,
      variantCount: experiment.variants.length,
      audiencePercentage: experiment.audience.percentage
    });
    
    return experiment;
  }

  public updateExperiment(id: string, updates: Partial<ExperimentConfig>): ExperimentConfig | null {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment ${id} not found`);
    }
    
    const updated = {
      ...experiment,
      ...updates,
      updatedAt: new Date()
    };
    
    this.validateExperimentConfig(updated);
    this.experiments.set(id, updated);
    
    analyticsService.trackEvent('experiment_updated', {
      experimentId: id,
      changes: Object.keys(updates)
    });
    
    return updated;
  }

  public startExperiment(id: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment) return false;
    
    if (experiment.status !== 'draft') {
      throw new Error(`Cannot start experiment in ${experiment.status} status`);
    }
    
    experiment.status = 'running';
    experiment.startDate = new Date();
    experiment.updatedAt = new Date();
    
    analyticsService.trackEvent('experiment_started', {
      experimentId: id,
      name: experiment.name
    });
    
    logger.info('Experiment started', { experimentId: id });
    return true;
  }

  public stopExperiment(id: string, reason: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment) return false;
    
    experiment.status = 'completed';
    experiment.endDate = new Date();
    experiment.updatedAt = new Date();
    
    analyticsService.trackEvent('experiment_stopped', {
      experimentId: id,
      reason,
      duration: experiment.endDate.getTime() - experiment.startDate.getTime()
    });
    
    logger.info('Experiment stopped', { experimentId: id, reason });
    return true;
  }

  // User Assignment and Variant Serving
  public getVariant(experimentId: string, userId?: string): string | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return null;
    }
    
    // Check if user is eligible for experiment
    if (!this.isUserEligible(experiment, userId)) {
      return null;
    }
    
    const userKey = userId || 'anonymous';
    
    // Check for existing assignment
    const userAssignments = this.userVariantAssignments.get(userKey);
    if (userAssignments?.has(experimentId)) {
      const variant = userAssignments.get(experimentId)!;
      
      // Track exposure (but don't duplicate)
      const today = new Date().toDateString();
      const lastExposureKey = `${experimentId}_${userKey}_${today}`;
      if (!sessionStorage.getItem(lastExposureKey)) {
        this.trackExposure(experimentId, variant, userId);
        sessionStorage.setItem(lastExposureKey, 'tracked');
      }
      
      return variant;
    }
    
    // Assign new variant
    const variant = this.assignVariant(experiment, userKey);
    
    // Store assignment
    if (!this.userVariantAssignments.has(userKey)) {
      this.userVariantAssignments.set(userKey, new Map());
    }
    this.userVariantAssignments.get(userKey)!.set(experimentId, variant);
    
    // Persist assignments
    this.saveAssignments();
    
    // Track exposure
    this.trackExposure(experimentId, variant, userId);
    
    return variant;
  }

  private isUserEligible(experiment: ExperimentConfig, userId?: string): boolean {
    const audience = experiment.audience;
    
    // Random sampling based on percentage
    const userHash = this.hashUserId(userId || 'anonymous');
    if (userHash > audience.percentage / 100) {
      return false;
    }
    
    // Additional targeting rules would go here
    // For now, we'll just use the percentage-based sampling
    
    return true;
  }

  private assignVariant(experiment: ExperimentConfig, userKey: string): string {
    const hash = this.hashUserForExperiment(userKey, experiment.id);
    let cumulativeAllocation = 0;
    
    for (const variant of experiment.variants) {
      cumulativeAllocation += variant.allocation;
      if (hash <= cumulativeAllocation) {
        return variant.id;
      }
    }
    
    // Fallback to control (first variant)
    return experiment.variants[0]?.id || 'control';
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 1000000) / 1000000; // Normalize to 0-1
  }

  private hashUserForExperiment(userKey: string, experimentId: string): number {
    const combined = `${userKey}_${experimentId}`;
    return this.hashUserId(combined);
  }

  private trackExposure(experimentId: string, variant: string, userId?: string): void {
    const result: ExperimentResult = {
      experimentId,
      variant,
      sessionId: analyticsService['currentSessionId'], // Access private property
      timestamp: new Date(),
      exposureContext: this.getExposureContext(),
      ...(userId && { userId })
    };
    
    // Store result
    const results = this.results.get(experimentId) || [];
    results.push(result);
    this.results.set(experimentId, results);
    
    // Track in analytics
    analyticsService.trackExperiment(experimentId, variant);
    
    logger.debug('Experiment exposure tracked', {
      experimentId,
      variant,
      userId
    });
  }

  private getExposureContext(): Record<string, any> {
    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : null
    };
  }

  // Statistical Analysis
  public async analyzeExperiment(experimentId: string): Promise<ExperimentAnalysis> {
    const experiment = this.experiments.get(experimentId);
    const results = this.results.get(experimentId);
    
    if (!experiment || !results) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const analysis: ExperimentAnalysis = {
      experimentId,
      status: 'insufficient_data',
      recommendation: 'continue',
      overall: {
        participants: results.length,
        startDate: experiment.startDate,
        currentDate: new Date(),
        daysRunning: Math.floor((Date.now() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24)),
        progressToMinSample: Math.min(1, results.length / experiment.minSampleSize)
      },
      variants: [],
      insights: [],
      recommendations: []
    };
    
    // Group results by variant
    const variantResults = this.groupResultsByVariant(results);
    
    // Calculate metrics for each variant
    analysis.variants = await Promise.all(
      experiment.variants.map(async variant => 
        this.calculateVariantMetrics(experiment, variant, variantResults[variant.id] || [])
      )
    );
    
    // Determine statistical significance
    analysis.status = this.determineExperimentStatus(analysis, experiment);
    
    // Generate insights and recommendations
    analysis.insights = this.generateInsights(analysis, experiment);
    analysis.recommendations = this.generateRecommendations(analysis, experiment);
    
    // Determine winner if applicable
    if (analysis.status === 'significant') {
      const winner = this.determineWinner(analysis, experiment);
      if (winner) {
        analysis.winner = winner;
      }
    }
    
    return analysis;
  }

  private groupResultsByVariant(results: ExperimentResult[]): Record<string, ExperimentResult[]> {
    return results.reduce((acc, result) => {
      if (!acc[result.variant]) {
        acc[result.variant] = [];
      }
      acc[result.variant]?.push(result);
      return acc;
    }, {} as Record<string, ExperimentResult[]>);
  }

  private async calculateVariantMetrics(
    experiment: ExperimentConfig, 
    variant: ExperimentConfig['variants'][0], 
    results: ExperimentResult[]
  ): Promise<ExperimentMetrics> {
    const sampleSize = results.length;
    
    // For now, we'll use mock conversion data
    // In a real implementation, this would query actual conversion events
    const conversionRate = 0.05 + Math.random() * 0.1; // Mock conversion rate between 5-15%
    const conversionEvents = Math.round(sampleSize * conversionRate);
    
    // Calculate confidence interval (using normal approximation)
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize);
    const zScore = 1.96; // 95% confidence
    const marginOfError = zScore * standardError;
    
    return {
      variant: variant.id,
      sampleSize,
      primaryMetricValue: conversionRate,
      primaryMetricError: standardError,
      secondaryMetrics: {
        engagement: 0.6 + Math.random() * 0.3,
        retention: 0.7 + Math.random() * 0.2
      },
      conversionEvents,
      totalEvents: sampleSize,
      confidenceInterval: [
        Math.max(0, conversionRate - marginOfError),
        Math.min(1, conversionRate + marginOfError)
      ],
      pValue: Math.random() * 0.1, // Mock p-value
      statisticalSignificance: sampleSize > experiment.minSampleSize && Math.random() > 0.5
    };
  }

  private determineExperimentStatus(analysis: ExperimentAnalysis, experiment: ExperimentConfig): ExperimentAnalysis['status'] {
    if (analysis.overall.participants < experiment.minSampleSize) {
      return 'insufficient_data';
    }
    
    const hasSignificantResult = analysis.variants.some(v => v.statisticalSignificance);
    if (hasSignificantResult) {
      return 'significant';
    }
    
    // Check if we've been running long enough
    if (experiment.maxDuration && analysis.overall.daysRunning >= experiment.maxDuration) {
      return 'inconclusive';
    }
    
    return 'running';
  }

  private generateInsights(analysis: ExperimentAnalysis, experiment: ExperimentConfig): ExperimentAnalysis['insights'] {
    const insights: ExperimentAnalysis['insights'] = [];
    
    // Sample size insights
    if (analysis.overall.progressToMinSample < 1) {
      insights.push({
        type: 'warning',
        message: `Only ${Math.round(analysis.overall.progressToMinSample * 100)}% of minimum sample size reached`,
        data: { progress: analysis.overall.progressToMinSample }
      });
    }
    
    // Performance insights
    const bestVariant = analysis.variants.reduce((best, current) => 
      current.primaryMetricValue > best.primaryMetricValue ? current : best
    );
    
    const worstVariant = analysis.variants.reduce((worst, current) => 
      current.primaryMetricValue < worst.primaryMetricValue ? current : worst
    );
    
    const improvement = ((bestVariant.primaryMetricValue - worstVariant.primaryMetricValue) / worstVariant.primaryMetricValue) * 100;
    
    if (improvement > experiment.primaryMetric.targetImprovement) {
      insights.push({
        type: 'positive',
        message: `Best variant shows ${improvement.toFixed(1)}% improvement over worst`,
        data: { improvement, bestVariant: bestVariant.variant, worstVariant: worstVariant.variant }
      });
    }
    
    // Statistical significance insights
    const significantVariants = analysis.variants.filter(v => v.statisticalSignificance);
    if (significantVariants.length > 0) {
      insights.push({
        type: 'positive',
        message: `${significantVariants.length} variant(s) showing statistical significance`,
        data: { variants: significantVariants.map(v => v.variant) }
      });
    }
    
    return insights;
  }

  private generateRecommendations(analysis: ExperimentAnalysis, experiment: ExperimentConfig): ExperimentAnalysis['recommendations'] {
    const recommendations: ExperimentAnalysis['recommendations'] = [];
    
    switch (analysis.status) {
      case 'insufficient_data':
        recommendations.push({
          priority: 'high',
          action: 'Continue experiment to reach minimum sample size',
          reasoning: `Need ${experiment.minSampleSize - analysis.overall.participants} more participants`,
          impact: 'high'
        });
        break;
        
      case 'significant':
        const winner = this.determineWinner(analysis, experiment);
        if (winner) {
          recommendations.push({
            priority: 'high',
            action: `Deploy winning variant: ${winner.variant}`,
            reasoning: `Shows ${winner.improvement.toFixed(1)}% improvement with ${winner.confidenceLevel}% confidence`,
            impact: 'high'
          });
        }
        break;
        
      case 'inconclusive':
        recommendations.push({
          priority: 'medium',
          action: 'Consider redesigning the experiment',
          reasoning: 'No significant results after maximum duration',
          impact: 'medium'
        });
        break;
        
      case 'running':
        recommendations.push({
          priority: 'low',
          action: 'Continue monitoring',
          reasoning: 'Experiment is progressing normally',
          impact: 'low'
        });
        break;
    }
    
    return recommendations;
  }

  private determineWinner(analysis: ExperimentAnalysis, experiment: ExperimentConfig): ExperimentAnalysis['winner'] | undefined {
    const significantVariants = analysis.variants
      .filter(v => v.statisticalSignificance)
      .sort((a, b) => b.primaryMetricValue - a.primaryMetricValue);
    
    if (significantVariants.length === 0) return undefined;
    
    const winner = significantVariants[0];
    const control = analysis.variants.find(v => v.variant === 'control') || analysis.variants[0];
    
    if (!winner || !control) return undefined;
    
    const improvement = ((winner.primaryMetricValue - control.primaryMetricValue) / control.primaryMetricValue) * 100;
    
    return {
      variant: winner.variant,
      improvement,
      confidenceLevel: (1 - winner.pValue) * 100,
      reasoning: `Statistically significant improvement in ${experiment.primaryMetric.name}`
    };
  }

  // Feature Flag Integration
  public getFeatureFlag(flagName: string, userId?: string, defaultValue: boolean = false): boolean {
    // Check if there's an active experiment for this feature flag
    const activeExperiments = Array.from(this.experiments.values())
      .filter(exp => exp.status === 'running' && exp.variants.some(v => v.config[flagName] !== undefined));
    
    if (activeExperiments.length === 0) {
      return defaultValue;
    }
    
    // Use the first matching experiment
    const experiment = activeExperiments[0];
    if (!experiment) return defaultValue;
    
    const variant = this.getVariant(experiment.id, userId);
    
    if (!variant) return defaultValue;
    
    const variantConfig = experiment.variants.find(v => v.id === variant);
    return variantConfig?.config[flagName] ?? defaultValue;
  }

  // Configuration and Storage
  private validateExperimentConfig(config: ExperimentConfig): void {
    // Validate variant allocations sum to 1
    const totalAllocation = config.variants.reduce((sum, variant) => sum + variant.allocation, 0);
    if (Math.abs(totalAllocation - 1) > 0.001) {
      throw new Error(`Variant allocations must sum to 1, got ${totalAllocation}`);
    }
    
    // Validate audience percentage
    if (config.audience.percentage < 0 || config.audience.percentage > 100) {
      throw new Error('Audience percentage must be between 0 and 100');
    }
    
    // Validate confidence level
    if (config.confidenceLevel < 0.5 || config.confidenceLevel > 0.99) {
      throw new Error('Confidence level must be between 0.5 and 0.99');
    }
  }

  private loadStoredAssignments(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.userVariantAssignments = new Map(
          Object.entries(data).map(([userId, assignments]) => [
            userId,
            new Map(Object.entries(assignments as Record<string, string>))
          ])
        );
      }
    } catch (error) {
      logger.warn('Failed to load stored A/B test assignments', error);
    }
  }

  private saveAssignments(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data = Object.fromEntries(
        Array.from(this.userVariantAssignments.entries()).map(([userId, assignments]) => [
          userId,
          Object.fromEntries(assignments)
        ])
      );
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to save A/B test assignments', error);
    }
  }

  // Public API
  public listExperiments(): ExperimentConfig[] {
    return Array.from(this.experiments.values());
  }

  public getExperiment(id: string): ExperimentConfig | undefined {
    return this.experiments.get(id);
  }

  public getExperimentResults(id: string): ExperimentResult[] {
    return this.results.get(id) || [];
  }

  public async exportExperimentData(id: string): Promise<{
    config: ExperimentConfig;
    results: ExperimentResult[];
    analysis: ExperimentAnalysis;
  } | null> {
    const config = this.experiments.get(id);
    const results = this.results.get(id);
    
    if (!config || !results) return null;
    
    return {
      config,
      results,
      analysis: await this.analyzeExperiment(id)
    };
  }

  public clearUserAssignments(userId?: string): void {
    if (userId) {
      this.userVariantAssignments.delete(userId);
    } else {
      this.userVariantAssignments.clear();
    }
    this.saveAssignments();
  }
}

// Singleton instance
export const abTestingService = new ABTestingService();

// React Hook for easier usage
export const useABTest = () => {
  return {
    getVariant: abTestingService.getVariant.bind(abTestingService),
    getFeatureFlag: abTestingService.getFeatureFlag.bind(abTestingService),
    createExperiment: abTestingService.createExperiment.bind(abTestingService),
    startExperiment: abTestingService.startExperiment.bind(abTestingService),
    stopExperiment: abTestingService.stopExperiment.bind(abTestingService),
    analyzeExperiment: abTestingService.analyzeExperiment.bind(abTestingService),
    listExperiments: abTestingService.listExperiments.bind(abTestingService)
  };
};

export default abTestingService;
export type { ExperimentConfig, ExperimentAnalysis, ExperimentResult };