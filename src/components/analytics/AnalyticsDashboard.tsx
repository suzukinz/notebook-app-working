// Comprehensive Analytics Dashboard
// Data visualization and insights for data-driven development

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAnalytics } from '../../services/analyticsService';
import { useABTest } from '../../services/abTestingService';
import type { ExperimentConfig, ExperimentAnalysis } from '../../services/abTestingService';

interface DashboardProps {
  dateRange?: {
    start: Date;
    end: Date;
  };
  refreshInterval?: number; // milliseconds
  showDevMetrics?: boolean;
  compact?: boolean;
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  trend?: Array<{ date: string; value: number }>;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  icon?: React.ReactNode;
}

// interface ChartData {
//   labels: string[];
//   datasets: Array<{
//     label: string;
//     data: number[];
//     backgroundColor?: string;
//     borderColor?: string;
//     type?: 'line' | 'bar';
//   }>;
// }

const AnalyticsDashboard: React.FC<DashboardProps> = ({
  dateRange,
  refreshInterval = 30000,
  compact = false
}) => {
  const analytics = useAnalytics();
  const abTesting = useABTest();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'performance' | 'experiments' | 'features'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [experiments, setExperiments] = useState<ExperimentConfig[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get analytics insights
      const insights = analytics.getInsights();
      
      // Get A/B testing data
      const experimentsData = abTesting.listExperiments();
      setExperiments(experimentsData);

      // Mock additional analytics data (in production, this would come from your backend)
      const mockData = {
        overview: {
          totalUsers: 12847,
          activeUsers: 8234,
          sessions: insights.sessionCount,
          avgSessionDuration: insights.averageSessionDuration,
          bounceRate: 0.32,
          conversionRate: 0.048,
          revenue: 142850,
          pageViews: 45623
        },
        performance: {
          avgLoadTime: 1200,
          firstContentfulPaint: 800,
          largestContentfulPaint: 1500,
          cumulativeLayoutShift: 0.1,
          firstInputDelay: 12,
          errorRate: insights.errorRate,
          crashRate: 0.02,
          performanceScore: insights.performanceScore
        },
        userBehavior: {
          topPages: [
            { path: '/notes', views: 15234, uniqueUsers: 8456 },
            { path: '/editor', views: 12456, uniqueUsers: 7234 },
            { path: '/dashboard', views: 8765, uniqueUsers: 5432 }
          ],
          topFeatures: insights.topFeatures,
          heatmapData: generateMockHeatmapData(),
          scrollDepth: [
            { depth: '0-25%', users: 100 },
            { depth: '25-50%', users: 85 },
            { depth: '50-75%', users: 62 },
            { depth: '75-100%', users: 38 }
          ]
        },
        timeline: generateTimelineData()
      };

      setDashboardData(mockData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [analytics, abTesting, dateRange]);

  // Auto-refresh data
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchDashboardData, refreshInterval]);

  // Generate overview metrics
  const overviewMetrics = useMemo((): MetricCard[] => {
    if (!dashboardData) return [];

    return [
      {
        title: 'Total Users',
        value: dashboardData.overview.totalUsers.toLocaleString(),
        change: { value: 12.5, direction: 'up', period: 'vs last month' },
        color: 'blue',
        icon: <UsersIcon />
      },
      {
        title: 'Active Sessions',
        value: dashboardData.overview.sessions.toLocaleString(),
        change: { value: 8.2, direction: 'up', period: 'vs yesterday' },
        color: 'green',
        icon: <ActivityIcon />
      },
      {
        title: 'Avg Session Duration',
        value: `${Math.round(dashboardData.overview.avgSessionDuration / 1000 / 60)}m`,
        change: { value: -3.1, direction: 'down', period: 'vs last week' },
        color: 'yellow',
        icon: <ClockIcon />
      },
      {
        title: 'Conversion Rate',
        value: `${(dashboardData.overview.conversionRate * 100).toFixed(1)}%`,
        change: { value: 15.3, direction: 'up', period: 'vs last month' },
        color: 'purple',
        icon: <TrendingUpIcon />
      },
      {
        title: 'Performance Score',
        value: dashboardData.performance.performanceScore,
        change: { value: 5.7, direction: 'up', period: 'vs last week' },
        color: dashboardData.performance.performanceScore > 80 ? 'green' : 'red',
        icon: <SpeedIcon />
      },
      {
        title: 'Error Rate',
        value: `${dashboardData.performance.errorRate.toFixed(2)}%`,
        change: { value: -12.4, direction: 'down', period: 'vs last week' },
        color: dashboardData.performance.errorRate < 1 ? 'green' : 'red',
        icon: <AlertIcon />
      }
    ];
  }, [dashboardData]);

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white ${compact ? 'p-4' : 'p-6'} rounded-lg shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600">
            Real-time insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          )}
          
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
          
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
            { id: 'users', label: 'User Behavior', icon: <UsersIcon /> },
            { id: 'performance', label: 'Performance', icon: <SpeedIcon /> },
            { id: 'experiments', label: 'A/B Tests', icon: <ExperimentIcon /> },
            { id: 'features', label: 'Feature Usage', icon: <FeaturesIcon /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <OverviewTab metrics={overviewMetrics} dashboardData={dashboardData} compact={compact} />
        )}
        
        {activeTab === 'users' && (
          <UserBehaviorTab data={dashboardData?.userBehavior} compact={compact} />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceTab data={dashboardData?.performance} compact={compact} />
        )}
        
        {activeTab === 'experiments' && (
          <ExperimentsTab experiments={experiments} abTesting={abTesting} compact={compact} />
        )}
        
        {activeTab === 'features' && (
          <FeaturesTab data={dashboardData?.userBehavior?.topFeatures} compact={compact} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ metrics: MetricCard[]; dashboardData: any; compact: boolean }> = ({ 
  metrics, 
  dashboardData,
  compact 
}) => (
  <div className="space-y-6">
    {/* Key Metrics */}
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
      {metrics.map((metric, index) => (
        <MetricCardComponent key={index} metric={metric} />
      ))}
    </div>
    
    {/* Charts */}
    <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">User Activity</h3>
        <SimpleChart data={dashboardData?.timeline} />
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
        <FunnelChart />
      </div>
    </div>
  </div>
);

// User Behavior Tab Component
const UserBehaviorTab: React.FC<{ data: any; compact: boolean }> = ({ data, compact }) => (
  <div className="space-y-6">
    <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
      {/* Top Pages */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Top Pages</h3>
        <div className="space-y-2">
          {data?.topPages?.map((page: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium">{page.path}</span>
              <div className="text-right">
                <div className="text-sm font-semibold">{page.views.toLocaleString()} views</div>
                <div className="text-xs text-gray-500">{page.uniqueUsers.toLocaleString()} users</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Top Features */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Feature Usage</h3>
        <div className="space-y-2">
          {data?.topFeatures?.map((feature: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium">{feature.name}</span>
              <span className="text-sm font-semibold">{feature.count} uses</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    
    {/* Scroll Depth Chart */}
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Scroll Depth Analysis</h3>
      <ScrollDepthChart data={data?.scrollDepth} />
    </div>
  </div>
);

// Performance Tab Component
const PerformanceTab: React.FC<{ data: any; compact: boolean }> = ({ data, compact }) => (
  <div className="space-y-6">
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
      <MetricCardComponent 
        metric={{
          title: 'Avg Load Time',
          value: `${data?.avgLoadTime}ms`,
          color: data?.avgLoadTime > 2000 ? 'red' : data?.avgLoadTime > 1000 ? 'yellow' : 'green'
        }}
      />
      <MetricCardComponent 
        metric={{
          title: 'First Contentful Paint',
          value: `${data?.firstContentfulPaint}ms`,
          color: data?.firstContentfulPaint > 1000 ? 'red' : 'green'
        }}
      />
      <MetricCardComponent 
        metric={{
          title: 'Largest Contentful Paint',
          value: `${data?.largestContentfulPaint}ms`,
          color: data?.largestContentfulPaint > 2500 ? 'red' : 'green'
        }}
      />
      <MetricCardComponent 
        metric={{
          title: 'Cumulative Layout Shift',
          value: data?.cumulativeLayoutShift?.toFixed(3),
          color: data?.cumulativeLayoutShift > 0.25 ? 'red' : data?.cumulativeLayoutShift > 0.1 ? 'yellow' : 'green'
        }}
      />
    </div>
    
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Performance Timeline</h3>
      <div className="h-64 flex items-center justify-center text-gray-500">
        Performance chart would be rendered here
      </div>
    </div>
  </div>
);

// Experiments Tab Component
const ExperimentsTab: React.FC<{ experiments: ExperimentConfig[]; abTesting: any; compact: boolean }> = ({ 
  experiments, 
  abTesting,
  compact: _compact
}) => {
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [experimentAnalysis, setExperimentAnalysis] = useState<ExperimentAnalysis | null>(null);

  useEffect(() => {
    if (selectedExperiment) {
      try {
        const analysis = abTesting.analyzeExperiment(selectedExperiment);
        setExperimentAnalysis(analysis);
      } catch (error) {
        console.error('Failed to analyze experiment:', error);
      }
    }
  }, [selectedExperiment, abTesting]);

  return (
    <div className="space-y-6">
      {/* Experiments List */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Active Experiments</h3>
        <div className="space-y-2">
          {experiments.filter(exp => exp.status === 'running').map(experiment => (
            <div 
              key={experiment.id} 
              className={`p-3 bg-white rounded-lg cursor-pointer border-2 ${
                selectedExperiment === experiment.id ? 'border-blue-500' : 'border-transparent'
              }`}
              onClick={() => setSelectedExperiment(experiment.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{experiment.name}</h4>
                  <p className="text-sm text-gray-600">{experiment.description}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {experiment.status}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    {experiment.variants.length} variants
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Experiment Analysis */}
      {experimentAnalysis && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Experiment Analysis</h3>
          <ExperimentAnalysisView analysis={experimentAnalysis} />
        </div>
      )}
    </div>
  );
};

// Features Tab Component
const FeaturesTab: React.FC<{ data: any; compact: boolean }> = ({ data, compact }) => (
  <div className="space-y-6">
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Feature Adoption</h3>
      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        {data?.map((feature: any, index: number) => (
          <div key={index} className="p-4 bg-white rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{feature.name}</span>
              <span className="text-2xl font-bold text-blue-600">{feature.count}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min((feature.count / 100) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Utility Components
const MetricCardComponent: React.FC<{ metric: MetricCard }> = ({ metric }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900'
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses[metric.color || 'blue']}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{metric.title}</p>
          <p className="text-2xl font-bold">{metric.value}</p>
          {metric.change && (
            <p className={`text-xs flex items-center mt-1 ${
              metric.change.direction === 'up' ? 'text-green-600' : 
              metric.change.direction === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {metric.change.direction === 'up' ? '↗' : metric.change.direction === 'down' ? '↘' : '→'}
              {metric.change.value}% {metric.change.period}
            </p>
          )}
        </div>
        {metric.icon && (
          <div className="opacity-75">
            {metric.icon}
          </div>
        )}
      </div>
    </div>
  );
};

const SimpleChart: React.FC<{ data: any }> = ({ data }) => (
  <div className="h-32 flex items-end justify-between space-x-1">
    {data?.map((point: any, index: number) => (
      <div
        key={index}
        className="bg-blue-600 rounded-t"
        style={{
          height: `${(point.value / Math.max(...data.map((p: any) => p.value))) * 100}%`,
          width: `${100 / data.length - 1}%`
        }}
      />
    ))}
  </div>
);

const FunnelChart: React.FC = () => (
  <div className="space-y-2">
    {[
      { stage: 'Visitors', count: 10000, rate: 100 },
      { stage: 'Sign-ups', count: 2500, rate: 25 },
      { stage: 'Active Users', count: 1500, rate: 15 },
      { stage: 'Conversions', count: 450, rate: 4.5 }
    ].map((stage, index) => (
      <div key={index} className="flex items-center space-x-4">
        <div className="w-20 text-sm font-medium">{stage.stage}</div>
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-6">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
              style={{ width: `${stage.rate}%` }}
            >
              <span className="text-white text-xs font-medium">{stage.rate}%</span>
            </div>
          </div>
        </div>
        <div className="w-16 text-sm text-right">{stage.count.toLocaleString()}</div>
      </div>
    ))}
  </div>
);

const ScrollDepthChart: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-2">
    {data?.map((depth: any, index: number) => (
      <div key={index} className="flex items-center space-x-4">
        <div className="w-16 text-sm font-medium">{depth.depth}</div>
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-green-600 h-4 rounded-full"
              style={{ width: `${depth.users}%` }}
            />
          </div>
        </div>
        <div className="w-12 text-sm text-right">{depth.users}%</div>
      </div>
    ))}
  </div>
);

const ExperimentAnalysisView: React.FC<{ analysis: ExperimentAnalysis }> = ({ analysis }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{analysis.overall.participants}</div>
        <div className="text-sm text-gray-600">Participants</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{analysis.overall.daysRunning}</div>
        <div className="text-sm text-gray-600">Days Running</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">
          {Math.round(analysis.overall.progressToMinSample * 100)}%
        </div>
        <div className="text-sm text-gray-600">Progress</div>
      </div>
    </div>
    
    {analysis.winner && (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-900">Winner: {analysis.winner.variant}</h4>
        <p className="text-sm text-green-800">
          {analysis.winner.improvement.toFixed(1)}% improvement with {analysis.winner.confidenceLevel.toFixed(1)}% confidence
        </p>
      </div>
    )}
    
    <div className="space-y-2">
      <h4 className="font-semibold">Variant Performance</h4>
      {analysis.variants.map(variant => (
        <div key={variant.variant} className="flex justify-between items-center p-2 bg-white rounded">
          <span className="font-medium">{variant.variant}</span>
          <div className="text-right">
            <div className="text-sm font-semibold">
              {(variant.primaryMetricValue * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              {variant.sampleSize} samples
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Mock data generators
function generateMockHeatmapData() {
  return Array.from({ length: 50 }, (_, _i) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    intensity: Math.random(),
    timestamp: new Date(Date.now() - Math.random() * 86400000)
  }));
}

function generateTimelineData() {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => ({
    time: new Date(now.getTime() - (23 - i) * 60 * 60 * 1000).toISOString(),
    value: Math.floor(Math.random() * 1000) + 500
  }));
}

// Icon Components
const UsersIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
);

const SpeedIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
  </svg>
);

const ExperimentIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" />
  </svg>
);

const FeaturesIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
  </svg>
);

export default AnalyticsDashboard;