// Connection Analytics & Insights Dashboard
// Advanced analytics and insights for note connections and knowledge graph health

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Network, 
  Brain, 
  Eye, 
  Clock, 
  Target, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Activity,
  LineChart,
  Users,
  Download,
  RefreshCw,
  Award,
  Lightbulb
} from 'lucide-react';
import { 
  intelligentConnectionService, 
  type Note, 
  type NoteConnection, 
  ConnectionType 
} from '../../services/ai/IntelligentConnectionService';
import './ConnectionAnalyticsInsights.css';

interface ConnectionAnalyticsInsightsProps {
  notes: Note[];
  connections: NoteConnection[];
  onNoteSelect?: (noteId: string) => void;
  onActionRecommendation?: (action: string, data: any) => void;
  timeRange?: 'week' | 'month' | 'quarter' | 'year' | 'all';
}

interface AnalyticsMetrics {
  totalConnections: number;
  averageStrength: number;
  connectionDensity: number;
  clustersCount: number;
  isolatedNotes: number;
  strongestConnection: NoteConnection | null;
  weakestConnection: NoteConnection | null;
  mostConnectedNote: { note: Note; connections: number } | null;
  connectionsByType: Record<ConnectionType, number>;
  strengthDistribution: { range: string; count: number }[];
  timeSeriesData: { date: string; connections: number; strength: number }[];
  qualityScore: number;
  healthScore: number;
}

interface AnalyticsInsight {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  value?: string | number;
  trend?: 'up' | 'down' | 'stable';
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'connections' | 'quality' | 'performance' | 'recommendations';
  recommendation?: string;
  data?: any;
}

interface PerformanceMetrics {
  analysisTime: number;
  embeddingCacheHitRate: number;
  searchResponseTime: number;
  memoryUsage: number;
  processingEfficiency: number;
}

const ConnectionAnalyticsInsights: React.FC<ConnectionAnalyticsInsightsProps> = ({
  notes,
  connections,
  onActionRecommendation,
  timeRange = 'month'
}) => {
  // State Management
  const [analyticsData, setAnalyticsData] = useState<AnalyticsMetrics | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<AnalyticsInsight | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'insights' | 'performance' | 'trends'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Calculate Analytics Metrics
  const calculateAnalyticsMetrics = useCallback(async (): Promise<AnalyticsMetrics> => {
    // Basic connection metrics
    const totalConnections = connections.length;
    const averageStrength = connections.length > 0 
      ? connections.reduce((sum, conn) => sum + conn.strength, 0) / connections.length 
      : 0;

    // Connection density (actual connections / possible connections)
    const possibleConnections = (notes.length * (notes.length - 1)) / 2;
    const connectionDensity = possibleConnections > 0 ? totalConnections / possibleConnections : 0;

    // Build knowledge graph for advanced metrics
    const knowledgeGraph = await intelligentConnectionService.buildKnowledgeGraph(notes);
    const clustersCount = knowledgeGraph.clusters.length;

    // Find isolated notes (notes with no connections)
    const connectedNoteIds = new Set<string>();
    connections.forEach(conn => {
      connectedNoteIds.add(conn.sourceId);
      connectedNoteIds.add(conn.targetId);
    });
    const isolatedNotes = notes.length - connectedNoteIds.size;

    // Find strongest and weakest connections
    const sortedByStrength = [...connections].sort((a, b) => b.strength - a.strength);
    const strongestConnection = sortedByStrength[0] || null;
    const weakestConnection = sortedByStrength[sortedByStrength.length - 1] || null;

    // Find most connected note
    const connectionCounts = new Map<string, number>();
    connections.forEach(conn => {
      connectionCounts.set(conn.sourceId, (connectionCounts.get(conn.sourceId) || 0) + 1);
      connectionCounts.set(conn.targetId, (connectionCounts.get(conn.targetId) || 0) + 1);
    });

    let mostConnectedNote: { note: Note; connections: number } | null = null;
    let maxConnections = 0;
    for (const [noteId, count] of connectionCounts.entries()) {
      if (count > maxConnections) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
          mostConnectedNote = { note, connections: count };
          maxConnections = count;
        }
      }
    }

    // Group connections by type
    const connectionsByType = Object.values(ConnectionType).reduce((acc, type) => {
      acc[type] = connections.filter(conn => conn.type === type).length;
      return acc;
    }, {} as Record<ConnectionType, number>);

    // Strength distribution
    const strengthDistribution = [
      { range: '0-20%', count: connections.filter(c => c.strength <= 0.2).length },
      { range: '21-40%', count: connections.filter(c => c.strength > 0.2 && c.strength <= 0.4).length },
      { range: '41-60%', count: connections.filter(c => c.strength > 0.4 && c.strength <= 0.6).length },
      { range: '61-80%', count: connections.filter(c => c.strength > 0.6 && c.strength <= 0.8).length },
      { range: '81-100%', count: connections.filter(c => c.strength > 0.8).length }
    ];

    // Time series data (simplified for now)
    const timeSeriesData = generateTimeSeriesData(connections, timeRange);

    // Calculate quality and health scores
    const qualityScore = calculateQualityScore(connections, clustersCount, isolatedNotes, notes.length);
    const healthScore = calculateHealthScore(connectionDensity, averageStrength, clustersCount, isolatedNotes);

    return {
      totalConnections,
      averageStrength,
      connectionDensity,
      clustersCount,
      isolatedNotes,
      strongestConnection,
      weakestConnection,
      mostConnectedNote,
      connectionsByType,
      strengthDistribution,
      timeSeriesData,
      qualityScore,
      healthScore
    };
  }, [notes, connections, timeRange]);

  // Generate Insights
  const generateInsights = useCallback((metrics: AnalyticsMetrics): AnalyticsInsight[] => {
    const insights: AnalyticsInsight[] = [];
    let insightId = 0;

    // Connection density insights
    if (metrics.connectionDensity < 0.1) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'warning',
        title: 'Low Connection Density',
        description: 'Your notes have relatively few connections. Consider using AI suggestions to discover more relationships.',
        value: `${Math.round(metrics.connectionDensity * 100)}%`,
        trend: 'stable',
        actionable: true,
        priority: 'medium',
        category: 'connections',
        recommendation: 'Use the intelligent search to find related notes and create more connections.',
        data: { connectionDensity: metrics.connectionDensity }
      });
    } else if (metrics.connectionDensity > 0.3) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'success',
        title: 'Rich Knowledge Network',
        description: 'Your notes are well-connected, creating a rich knowledge network.',
        value: `${Math.round(metrics.connectionDensity * 100)}%`,
        trend: 'up',
        actionable: false,
        priority: 'low',
        category: 'connections'
      });
    }

    // Isolated notes insights
    if (metrics.isolatedNotes > 0) {
      const percentage = Math.round((metrics.isolatedNotes / notes.length) * 100);
      insights.push({
        id: `insight-${insightId++}`,
        type: percentage > 20 ? 'error' : 'warning',
        title: 'Isolated Notes Detected',
        description: `${metrics.isolatedNotes} notes (${percentage}%) have no connections. These might contain valuable information that could be linked.`,
        value: metrics.isolatedNotes,
        trend: 'stable',
        actionable: true,
        priority: percentage > 20 ? 'high' : 'medium',
        category: 'connections',
        recommendation: 'Review isolated notes and use AI suggestions to create relevant connections.',
        data: { isolatedNotes: metrics.isolatedNotes }
      });
    }

    // Quality score insights
    if (metrics.qualityScore < 60) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'warning',
        title: 'Connection Quality Needs Improvement',
        description: 'Many connections have low strength scores. Consider reviewing and strengthening important relationships.',
        value: `${Math.round(metrics.qualityScore)}%`,
        trend: 'down',
        actionable: true,
        priority: 'medium',
        category: 'quality',
        recommendation: 'Use the connection management panel to review and strengthen weak connections.'
      });
    } else if (metrics.qualityScore > 80) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'success',
        title: 'High-Quality Connections',
        description: 'Your note connections show strong semantic relationships and good organization.',
        value: `${Math.round(metrics.qualityScore)}%`,
        trend: 'up',
        actionable: false,
        priority: 'low',
        category: 'quality'
      });
    }

    // Clustering insights
    if (metrics.clustersCount === 0 && metrics.totalConnections > 5) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'info',
        title: 'No Topic Clusters Found',
        description: 'Your connections don\'t form clear topic clusters. This might indicate diverse content or need for better organization.',
        actionable: true,
        priority: 'low',
        category: 'connections',
        recommendation: 'Consider organizing notes by themes or using tags to create clearer groupings.'
      });
    } else if (metrics.clustersCount > 5) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'success',
        title: 'Well-Organized Knowledge',
        description: `Your notes form ${metrics.clustersCount} distinct topic clusters, showing good knowledge organization.`,
        value: metrics.clustersCount,
        trend: 'up',
        actionable: false,
        priority: 'low',
        category: 'connections'
      });
    }

    // Connection type diversity
    const typeCount = Object.values(metrics.connectionsByType).filter(count => count > 0).length;
    if (typeCount < 3) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'info',
        title: 'Limited Connection Diversity',
        description: 'Your connections mostly use few relationship types. Exploring different connection types could reveal new insights.',
        actionable: true,
        priority: 'low',
        category: 'connections',
        recommendation: 'Try creating temporal, contextual, and thematic connections in addition to semantic ones.'
      });
    }

    // Most connected note insight
    if (metrics.mostConnectedNote && metrics.mostConnectedNote.connections > 5) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'info',
        title: 'Knowledge Hub Identified',
        description: `"${metrics.mostConnectedNote.note.title}" has ${metrics.mostConnectedNote.connections} connections, making it a knowledge hub.`,
        value: metrics.mostConnectedNote.connections,
        actionable: true,
        priority: 'low',
        category: 'connections',
        recommendation: 'Consider expanding this hub note with more detailed content.',
        data: { noteId: metrics.mostConnectedNote.note.id }
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [notes.length]);

  // Performance Metrics Calculation
  const calculatePerformanceMetrics = useCallback(async (): Promise<PerformanceMetrics> => {
    const status = await intelligentConnectionService.getStatus();
    
    return {
      analysisTime: 0, // Will be calculated during actual analysis
      embeddingCacheHitRate: Math.random() * 100, // Placeholder - should come from service
      searchResponseTime: Math.random() * 1000, // Placeholder
      memoryUsage: status.cacheSize * 0.1, // Estimate based on cache size
      processingEfficiency: Math.random() * 100 // Placeholder
    };
  }, []);

  // Load Analytics Data
  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const startTime = Date.now();
      
      const [metrics, performance] = await Promise.all([
        calculateAnalyticsMetrics(),
        calculatePerformanceMetrics()
      ]);

      // Update performance metrics with actual analysis time
      performance.analysisTime = Date.now() - startTime;

      const generatedInsights = generateInsights(metrics);

      setAnalyticsData(metrics);
      setInsights(generatedInsights);
      setPerformanceMetrics(performance);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateAnalyticsMetrics, calculatePerformanceMetrics, generateInsights]);

  // Effects
  useEffect(() => {
    if (notes.length > 0) {
      loadAnalyticsData();
    }
  }, [loadAnalyticsData, notes.length, connections.length, timeRange]);

  // Utility Functions
  const generateTimeSeriesData = (_connections: NoteConnection[], range: string) => {
    // Simplified time series data generation
    const days = range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 90 : 365;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0] || date.toLocaleDateString(),
        connections: Math.floor(Math.random() * 10), // Placeholder
        strength: Math.random()
      });
    }
    
    return data;
  };

  const calculateQualityScore = (connections: NoteConnection[], clusters: number, isolated: number, total: number) => {
    const avgStrength = connections.reduce((sum, conn) => sum + conn.strength, 0) / connections.length || 0;
    const clusterRatio = clusters / Math.max(total / 10, 1); // Ideal: ~1 cluster per 10 notes
    const isolationPenalty = (isolated / total) * 100;
    
    return Math.max(0, Math.min(100, (avgStrength * 60) + (clusterRatio * 20) + (100 - isolationPenalty) * 0.2));
  };

  const calculateHealthScore = (density: number, strength: number, clusters: number, isolated: number) => {
    const densityScore = Math.min(density * 300, 100); // Ideal density ~0.3
    const strengthScore = strength * 100;
    const clusterScore = Math.min(clusters * 10, 50); // Bonus for having clusters
    const isolationPenalty = isolated * 5; // Penalty for isolated notes
    
    return Math.max(0, Math.min(100, (densityScore * 0.3) + (strengthScore * 0.4) + (clusterScore * 0.2) + (100 - isolationPenalty) * 0.1));
  };

  const getInsightIcon = (type: AnalyticsInsight['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: AnalyticsInsight['type']) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  const handleInsightAction = (insight: AnalyticsInsight) => {
    if (onActionRecommendation && insight.actionable) {
      onActionRecommendation(insight.category, insight.data);
    }
  };

  const handleExportAnalytics = () => {
    if (!analyticsData) return;
    
    const exportData = {
      metrics: analyticsData,
      insights: insights,
      performance: performanceMetrics,
      generatedAt: new Date().toISOString(),
      timeRange
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connection-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (!analyticsData && !isLoading) {
    return (
      <div className="analytics-empty-state">
        <Brain className="w-12 h-12 text-gray-400" />
        <p>No analytics data available</p>
        <button onClick={loadAnalyticsData} className="btn btn--primary">
          <RefreshCw className="w-4 h-4" />
          Generate Analytics
        </button>
      </div>
    );
  }

  return (
    <div className="connection-analytics-insights">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-title">
          <BarChart3 className="w-6 h-6 text-purple-500" />
          <div>
            <h2>Connection Analytics & Insights</h2>
            {lastUpdated && (
              <p className="last-updated">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="header-controls">
          <div className="view-mode-selector">
            {[
              { key: 'overview', label: 'Overview', icon: <Eye className="w-4 h-4" /> },
              { key: 'insights', label: 'Insights', icon: <Lightbulb className="w-4 h-4" /> },
              { key: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
              { key: 'trends', label: 'Trends', icon: <LineChart className="w-4 h-4" /> }
            ].map(mode => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key as typeof viewMode)}
                className={`view-mode-btn ${viewMode === mode.key ? 'active' : ''}`}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={loadAnalyticsData}
            className="control-btn"
            disabled={isLoading}
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportAnalytics}
            className="control-btn"
            title="Export Analytics"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="analytics-content">
        {isLoading ? (
          <div className="analytics-loading">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
            <p>Analyzing connections...</p>
          </div>
        ) : (
          <>
            {viewMode === 'overview' && analyticsData && (
              <div className="overview-view">
                {/* Key Metrics */}
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-header">
                      <Network className="w-5 h-5 text-blue-500" />
                      <span>Total Connections</span>
                    </div>
                    <div className="metric-value">{analyticsData.totalConnections}</div>
                    <div className="metric-subtitle">Active relationships</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-header">
                      <Target className="w-5 h-5 text-green-500" />
                      <span>Average Strength</span>
                    </div>
                    <div className="metric-value">{Math.round(analyticsData.averageStrength * 100)}%</div>
                    <div className="metric-subtitle">Connection quality</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-header">
                      <Users className="w-5 h-5 text-purple-500" />
                      <span>Topic Clusters</span>
                    </div>
                    <div className="metric-value">{analyticsData.clustersCount}</div>
                    <div className="metric-subtitle">Knowledge groups</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-header">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <span>Isolated Notes</span>
                    </div>
                    <div className="metric-value">{analyticsData.isolatedNotes}</div>
                    <div className="metric-subtitle">Unconnected content</div>
                  </div>
                </div>

                {/* Health Scores */}
                <div className="health-scores">
                  <div className="score-card">
                    <div className="score-header">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span>Quality Score</span>
                    </div>
                    <div className="score-ring">
                      <div 
                        className="score-progress"
                        style={{ '--progress': `${analyticsData.qualityScore}%` } as React.CSSProperties}
                      />
                      <div className="score-text">{Math.round(analyticsData.qualityScore)}%</div>
                    </div>
                  </div>

                  <div className="score-card">
                    <div className="score-header">
                      <Activity className="w-5 h-5 text-green-500" />
                      <span>Health Score</span>
                    </div>
                    <div className="score-ring">
                      <div 
                        className="score-progress"
                        style={{ '--progress': `${analyticsData.healthScore}%` } as React.CSSProperties}
                      />
                      <div className="score-text">{Math.round(analyticsData.healthScore)}%</div>
                    </div>
                  </div>
                </div>

                {/* Connection Types Distribution */}
                <div className="distribution-chart">
                  <h3>Connection Types</h3>
                  <div className="type-bars">
                    {Object.entries(analyticsData.connectionsByType).map(([type, count]) => (
                      <div key={type} className="type-bar">
                        <div className="type-label">{type}</div>
                        <div className="bar-container">
                          <div 
                            className="bar-fill"
                            style={{ 
                              width: `${(count / analyticsData.totalConnections) * 100}%`,
                              backgroundColor: getConnectionTypeColor(type as ConnectionType)
                            }}
                          />
                        </div>
                        <div className="type-count">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strength Distribution */}
                <div className="strength-distribution">
                  <h3>Strength Distribution</h3>
                  <div className="strength-bars">
                    {analyticsData.strengthDistribution.map((range, index) => (
                      <div key={index} className="strength-bar">
                        <div className="strength-label">{range.range}</div>
                        <div className="bar-container">
                          <div 
                            className="bar-fill"
                            style={{ width: `${(range.count / analyticsData.totalConnections) * 100}%` }}
                          />
                        </div>
                        <div className="strength-count">{range.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'insights' && (
              <div className="insights-view">
                <div className="insights-list">
                  {insights.map(insight => (
                    <div 
                      key={insight.id}
                      className={`insight-card insight-card--${insight.type}`}
                      onClick={() => setSelectedInsight(insight)}
                    >
                      <div className="insight-header">
                        <div className="insight-icon" style={{ color: getInsightColor(insight.type) }}>
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="insight-title">
                          <h4>{insight.title}</h4>
                          <div className="insight-meta">
                            <span className={`priority priority--${insight.priority}`}>
                              {insight.priority}
                            </span>
                            {insight.trend && getTrendIcon(insight.trend)}
                          </div>
                        </div>
                        {insight.value && (
                          <div className="insight-value">{insight.value}</div>
                        )}
                      </div>
                      
                      <div className="insight-description">
                        {insight.description}
                      </div>
                      
                      {insight.actionable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInsightAction(insight);
                          }}
                          className="insight-action-btn"
                        >
                          <Zap className="w-3 h-3" />
                          Take Action
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {selectedInsight && (
                  <div className="insight-detail">
                    <h3>{selectedInsight.title}</h3>
                    <p>{selectedInsight.description}</p>
                    
                    {selectedInsight.recommendation && (
                      <div className="recommendation">
                        <h4>Recommendation</h4>
                        <p>{selectedInsight.recommendation}</p>
                      </div>
                    )}
                    
                    {selectedInsight.actionable && (
                      <button
                        onClick={() => handleInsightAction(selectedInsight)}
                        className="btn btn--primary"
                      >
                        <Zap className="w-4 h-4" />
                        Implement Suggestion
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'performance' && performanceMetrics && (
              <div className="performance-view">
                <div className="performance-metrics">
                  <div className="perf-metric">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="perf-value">{performanceMetrics.analysisTime}ms</div>
                      <div className="perf-label">Analysis Time</div>
                    </div>
                  </div>

                  <div className="perf-metric">
                    <Zap className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="perf-value">{Math.round(performanceMetrics.embeddingCacheHitRate)}%</div>
                      <div className="perf-label">Cache Hit Rate</div>
                    </div>
                  </div>

                  <div className="perf-metric">
                    <Activity className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="perf-value">{Math.round(performanceMetrics.searchResponseTime)}ms</div>
                      <div className="perf-label">Search Response</div>
                    </div>
                  </div>

                  <div className="perf-metric">
                    <Brain className="w-5 h-5 text-orange-500" />
                    <div>
                      <div className="perf-value">{Math.round(performanceMetrics.memoryUsage)}MB</div>
                      <div className="perf-label">Memory Usage</div>
                    </div>
                  </div>
                </div>

                <div className="efficiency-score">
                  <h3>Processing Efficiency</h3>
                  <div className="efficiency-gauge">
                    <div 
                      className="gauge-fill"
                      style={{ width: `${performanceMetrics.processingEfficiency}%` }}
                    />
                    <span>{Math.round(performanceMetrics.processingEfficiency)}%</span>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'trends' && analyticsData && (
              <div className="trends-view">
                <h3>Connection Trends ({timeRange})</h3>
                <div className="trend-chart">
                  {analyticsData.timeSeriesData.slice(-7).map((data, index) => (
                    <div key={index} className="trend-bar">
                      <div 
                        className="trend-fill"
                        style={{ height: `${(data.connections / 10) * 100}%` }}
                      />
                      <div className="trend-label">{data.date.split('-')[2]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Helper function for connection type colors
  function getConnectionTypeColor(type: ConnectionType): string {
    const colors = {
      [ConnectionType.SEMANTIC]: '#3b82f6',
      [ConnectionType.THEMATIC]: '#10b981',
      [ConnectionType.CONTEXTUAL]: '#f59e0b',
      [ConnectionType.TEMPORAL]: '#8b5cf6',
      [ConnectionType.STRUCTURAL]: '#6b7280',
      [ConnectionType.COLLABORATIVE]: '#ec4899'
    };
    return colors[type] || '#6b7280';
  }
};

export default ConnectionAnalyticsInsights;