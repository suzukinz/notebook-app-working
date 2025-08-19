// Knowledge Graph Visualization Component
// Interactive network visualization of note connections and insights

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Network, 
  BookOpen, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Settings,
  Info,
  Zap,
  Target,
} from 'lucide-react';
import { 
  intelligentConnectionService, 
  type ConnectionGraph, 
  type Note, 
 
  type ConnectionInsight,
  ConnectionType 
} from '../../services/ai/IntelligentConnectionService';
import './KnowledgeGraphVisualization.css';

interface KnowledgeGraphVisualizationProps {
  notes: Note[];
  selectedNoteId?: string;
  onNoteSelect?: (noteId: string) => void;
  onConnectionExplore?: (sourceId: string, targetId: string) => void;
  maxNodes?: number;
  enableClustering?: boolean;
}

interface GraphNode {
  id: string;
  label: string;
  title: string;
  size: number;
  color: string;
  x?: number;
  y?: number;
  cluster?: string;
  connections: number;
  lastModified: Date;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  width: number;
  color: string;
  type: ConnectionType;
  strength: number;
  label?: string;
}

interface ClusterInfo {
  id: string;
  name: string;
  theme: string;
  nodeCount: number;
  strength: number;
  color: string;
  visible: boolean;
}

const KnowledgeGraphVisualization: React.FC<KnowledgeGraphVisualizationProps> = ({
  notes,
  selectedNoteId,
  onNoteSelect,
  onConnectionExplore: _onConnectionExplore,
  maxNodes = 50,
  enableClustering: _enableClustering = true
}) => {
  // State Management
  const [knowledgeGraph, setKnowledgeGraph] = useState<ConnectionGraph | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'network' | 'clusters' | 'insights'>('network');
  const [filterType, setFilterType] = useState<ConnectionType | 'all'>('all');
  const [minStrength, setMinStrength] = useState(0.6);
  const [showLabels, setShowLabels] = useState(true);
  const [clusterVisibility, setClusterVisibility] = useState<Map<string, boolean>>(new Map());
  const [selectedInsight, setSelectedInsight] = useState<ConnectionInsight | null>(null);
  const [networkStats, setNetworkStats] = useState<{
    nodeCount: number;
    edgeCount: number;
    clusterCount: number;
    avgConnections: number;
  } | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkInstanceRef = useRef<any>(null);

  // Graph Building
  const buildGraphData = useMemo(() => {
    if (!knowledgeGraph) return { nodes: [], edges: [], clusters: [] };

    const filteredNotes = notes.slice(0, maxNodes);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const clusterColors = generateClusterColors(knowledgeGraph.clusters.length);
    
    // Build nodes
    filteredNotes.forEach((note) => {
      const connections = knowledgeGraph.edges.filter(
        edge => edge.sourceId === note.id || edge.targetId === note.id
      );
      
      const cluster = knowledgeGraph.clusters.find(c => c.noteIds.includes(note.id));
      const clusterColor = cluster ? clusterColors[knowledgeGraph.clusters.indexOf(cluster)] || '#64748b' : '#64748b';
      
      nodes.push({
        id: note.id,
        label: showLabels ? note.title.slice(0, 20) : '',
        title: `${note.title}\n${connections.length} connections\nLast modified: ${note.updatedAt?.toLocaleDateString() || 'Unknown'}`,
        size: Math.max(10, Math.min(25, 10 + connections.length * 2)),
        color: selectedNoteId === note.id ? '#ef4444' : clusterColor,
        ...(cluster && { cluster: cluster.id }),
        connections: connections.length,
        lastModified: note.updatedAt || new Date()
      });
    });

    // Build edges (filtered)
    knowledgeGraph.edges.forEach(edge => {
      if (edge.strength < minStrength) return;
      if (filterType !== 'all' && edge.type !== filterType) return;
      
      const sourceExists = filteredNotes.some(n => n.id === edge.sourceId);
      const targetExists = filteredNotes.some(n => n.id === edge.targetId);
      
      if (sourceExists && targetExists) {
        edges.push({
          id: `${edge.sourceId}-${edge.targetId}`,
          from: edge.sourceId,
          to: edge.targetId,
          width: Math.max(1, edge.strength * 5),
          color: getConnectionTypeColor(edge.type, edge.strength),
          type: edge.type,
          strength: edge.strength,
          ...(showLabels && { label: `${Math.round(edge.strength * 100)}%` })
        });
      }
    });

    // Build cluster info
    const clusterInfo: ClusterInfo[] = knowledgeGraph.clusters.map((cluster, index) => ({
      id: cluster.id,
      name: cluster.name,
      theme: cluster.theme,
      nodeCount: cluster.noteIds.filter(id => filteredNotes.some(n => n.id === id)).length,
      strength: cluster.strength,
      color: clusterColors[index] || '#64748b',
      visible: clusterVisibility.get(cluster.id) ?? true
    }));

    return { nodes, edges, clusters: clusterInfo };
  }, [knowledgeGraph, notes, maxNodes, selectedNoteId, showLabels, filterType, minStrength, clusterVisibility]);

  // Load Knowledge Graph
  const loadKnowledgeGraph = useCallback(async () => {
    if (notes.length === 0) return;
    
    setIsLoading(true);
    try {
      const graph = await intelligentConnectionService.buildKnowledgeGraph(notes);
      setKnowledgeGraph(graph);
      
      // Calculate network statistics
      const stats = {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        clusterCount: graph.clusters.length,
        avgConnections: graph.edges.length > 0 ? (graph.edges.length * 2) / graph.nodes.length : 0
      };
      setNetworkStats(stats);
      
      // Initialize cluster visibility
      const visibility = new Map<string, boolean>();
      graph.clusters.forEach(cluster => visibility.set(cluster.id, true));
      setClusterVisibility(visibility);
      
    } catch (error) {
      console.error('Failed to build knowledge graph:', error);
    } finally {
      setIsLoading(false);
    }
  }, [notes]);

  // Effects
  useEffect(() => {
    loadKnowledgeGraph();
  }, [loadKnowledgeGraph]);

  useEffect(() => {
    if (!canvasRef.current || !knowledgeGraph) return;

    // Initialize network visualization (placeholder for actual network library)
    initializeNetworkVisualization();
    
    return () => {
      if (networkInstanceRef.current) {
        networkInstanceRef.current.destroy();
      }
    };
  }, [buildGraphData]);

  // Network Visualization (placeholder implementation)
  const initializeNetworkVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple canvas-based visualization
    const { nodes, edges } = buildGraphData;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Simple force-directed layout simulation
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Position nodes in a circle layout for demo
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = Math.min(canvas.width, canvas.height) / 3;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });
    
    // Draw edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode && fromNode.x !== undefined && fromNode.y !== undefined && 
          toNode.x !== undefined && toNode.y !== undefined) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = edge.width;
        ctx.stroke();
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw labels
        if (showLabels && node.label) {
          ctx.fillStyle = '#1f2937';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y + node.size + 15);
        }
      }
    });
  };

  // Event Handlers
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onNoteSelect) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked node
    const clickedNode = buildGraphData.nodes.find(node => {
      if (node.x === undefined || node.y === undefined) return false;
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      return distance <= node.size;
    });

    if (clickedNode) {
      onNoteSelect(clickedNode.id);
    }
  };

  const toggleClusterVisibility = (clusterId: string) => {
    setClusterVisibility(prev => {
      const newVisibility = new Map(prev);
      newVisibility.set(clusterId, !prev.get(clusterId));
      return newVisibility;
    });
  };

  // Utility Functions
  const generateClusterColors = (count: number): string[] => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      if (color) result.push(color);
    }
    return result;
  };

  const getConnectionTypeColor = (type: ConnectionType, strength: number): string => {
    const alpha = strength;
    const colors = {
      [ConnectionType.SEMANTIC]: `rgba(59, 130, 246, ${alpha})`,
      [ConnectionType.THEMATIC]: `rgba(16, 185, 129, ${alpha})`,
      [ConnectionType.CONTEXTUAL]: `rgba(245, 158, 11, ${alpha})`,
      [ConnectionType.TEMPORAL]: `rgba(139, 92, 246, ${alpha})`,
      [ConnectionType.STRUCTURAL]: `rgba(107, 114, 128, ${alpha})`,
      [ConnectionType.COLLABORATIVE]: `rgba(236, 72, 153, ${alpha})`
    };
    return colors[type] || `rgba(100, 116, 139, ${alpha})`;
  };

  const getInsightIcon = (type: ConnectionInsight['type']) => {
    switch (type) {
      case 'trending_topic': return <TrendingUp className="w-4 h-4" />;
      case 'isolated_note': return <AlertCircle className="w-4 h-4" />;
      case 'emerging_theme': return <Zap className="w-4 h-4" />;
      case 'knowledge_gap': return <Target className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="knowledge-graph-container">
      {/* Header */}
      <div className="knowledge-graph-header">
        <div className="header-title">
          <Network className="w-5 h-5 text-blue-500" />
          <h3>Knowledge Graph</h3>
          {networkStats && (
            <span className="stats-badge">
              {networkStats.nodeCount} notes • {networkStats.edgeCount} connections
            </span>
          )}
        </div>
        
        <div className="header-controls">
          <div className="view-mode-selector">
            <button
              onClick={() => setViewMode('network')}
              className={`mode-btn ${viewMode === 'network' ? 'active' : ''}`}
            >
              <Network className="w-4 h-4" />
              Network
            </button>
            <button
              onClick={() => setViewMode('clusters')}
              className={`mode-btn ${viewMode === 'clusters' ? 'active' : ''}`}
            >
              <Users className="w-4 h-4" />
              Clusters
            </button>
            <button
              onClick={() => setViewMode('insights')}
              className={`mode-btn ${viewMode === 'insights' ? 'active' : ''}`}
            >
              <Info className="w-4 h-4" />
              Insights
            </button>
          </div>
          
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="control-btn"
            title="Toggle Labels"
          >
            {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={loadKnowledgeGraph}
            className="control-btn"
            disabled={isLoading}
            title="Refresh Graph"
          >
            <Settings className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="knowledge-graph-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Building knowledge graph...</p>
          </div>
        ) : (
          <>
            {viewMode === 'network' && (
              <div className="network-view">
                {/* Controls Panel */}
                <div className="network-controls">
                  <div className="control-group">
                    <label>Connection Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as ConnectionType | 'all')}
                      className="control-select"
                    >
                      <option value="all">All Types</option>
                      <option value={ConnectionType.SEMANTIC}>Semantic</option>
                      <option value={ConnectionType.THEMATIC}>Thematic</option>
                      <option value={ConnectionType.CONTEXTUAL}>Contextual</option>
                      <option value={ConnectionType.TEMPORAL}>Temporal</option>
                      <option value={ConnectionType.STRUCTURAL}>Structural</option>
                    </select>
                  </div>
                  
                  <div className="control-group">
                    <label>Min Strength: {Math.round(minStrength * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={minStrength}
                      onChange={(e) => setMinStrength(parseFloat(e.target.value))}
                      className="control-slider"
                    />
                  </div>
                </div>

                {/* Network Canvas */}
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="network-canvas"
                  onClick={handleCanvasClick}
                />

                {/* Connection Legend */}
                <div className="connection-legend">
                  <h4>Connection Types</h4>
                  <div className="legend-items">
                    {Object.values(ConnectionType).map(type => (
                      <div key={type} className="legend-item">
                        <div 
                          className="legend-color"
                          style={{ backgroundColor: getConnectionTypeColor(type, 1) }}
                        />
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'clusters' && (
              <div className="clusters-view">
                <div className="clusters-grid">
                  {buildGraphData.clusters.map(cluster => (
                    <div key={cluster.id} className="cluster-card">
                      <div className="cluster-header">
                        <div className="cluster-info">
                          <div 
                            className="cluster-color"
                            style={{ backgroundColor: cluster.color }}
                          />
                          <div>
                            <h4>{cluster.theme}</h4>
                            <p>{cluster.nodeCount} notes</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleClusterVisibility(cluster.id)}
                          className="visibility-btn"
                        >
                          {cluster.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      <div className="cluster-strength">
                        <div className="strength-bar">
                          <div 
                            className="strength-fill"
                            style={{ 
                              width: `${cluster.strength * 100}%`,
                              backgroundColor: cluster.color 
                            }}
                          />
                        </div>
                        <span>{Math.round(cluster.strength * 100)}% strength</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'insights' && knowledgeGraph && (
              <div className="insights-view">
                <div className="insights-list">
                  {knowledgeGraph.insights.map((insight, index) => (
                    <div 
                      key={index} 
                      className={`insight-card ${selectedInsight === insight ? 'selected' : ''}`}
                      onClick={() => setSelectedInsight(insight)}
                    >
                      <div className="insight-header">
                        <div className="insight-icon">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="insight-title">
                          <h4>{insight.title}</h4>
                          <span className={`insight-priority priority-${insight.priority > 0.7 ? 'high' : insight.priority > 0.4 ? 'medium' : 'low'}`}>
                            {insight.priority > 0.7 ? 'High' : insight.priority > 0.4 ? 'Medium' : 'Low'} Priority
                          </span>
                        </div>
                      </div>
                      
                      <p className="insight-description">{insight.description}</p>
                      
                      {insight.relevantNotes.length > 0 && (
                        <div className="insight-notes">
                          <span>{insight.relevantNotes.length} related notes</span>
                        </div>
                      )}
                      
                      {insight.actionable && (
                        <div className="insight-actions">
                          <button className="action-btn">
                            <Target className="w-3 h-3" />
                            Take Action
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedInsight && (
                  <div className="insight-detail">
                    <h3>{selectedInsight.title}</h3>
                    <p>{selectedInsight.description}</p>
                    
                    {selectedInsight.relevantNotes.length > 0 && (
                      <div className="related-notes">
                        <h4>Related Notes</h4>
                        <div className="notes-list">
                          {selectedInsight.relevantNotes.slice(0, 5).map(noteId => {
                            const note = notes.find(n => n.id === noteId);
                            return note ? (
                              <div 
                                key={noteId} 
                                className="note-item"
                                onClick={() => onNoteSelect?.(noteId)}
                              >
                                <BookOpen className="w-4 h-4" />
                                <span>{note.title}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraphVisualization;