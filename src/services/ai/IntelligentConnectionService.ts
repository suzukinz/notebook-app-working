// Intelligent Note Connection Service
// Advanced semantic analysis and knowledge graph generation for note relationships

import { lightweightAI } from './LightweightAIService';
import { EventEmitter } from 'events';

// Core Types
interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  folderPath?: string;
}

interface NoteConnection {
  sourceId: string;
  targetId: string;
  strength: number; // 0-1 similarity score
  type: ConnectionType;
  reasoning: string;
  keywords: string[];
  contexts: string[];
}

enum ConnectionType {
  SEMANTIC = 'semantic',        // Content similarity
  THEMATIC = 'thematic',       // Topic/theme similarity  
  CONTEXTUAL = 'contextual',   // Reference/mention
  TEMPORAL = 'temporal',       // Time-based relationship
  STRUCTURAL = 'structural',   // Format/structure similarity
  COLLABORATIVE = 'collaborative' // User behavior patterns
}

interface ConnectionGraph {
  nodes: Note[];
  edges: NoteConnection[];
  clusters: NoteCluster[];
  insights: ConnectionInsight[];
}

interface NoteCluster {
  id: string;
  name: string;
  theme: string;
  noteIds: string[];
  strength: number;
  keywords: string[];
}

interface ConnectionInsight {
  type: 'trending_topic' | 'knowledge_gap' | 'emerging_theme' | 'isolated_note';
  title: string;
  description: string;
  relevantNotes: string[];
  actionable: boolean;
  priority: number;
}

// Advanced Configuration
interface ConnectionConfig {
  similarityThreshold: number;
  maxConnections: number;
  enableRealTimeAnalysis: boolean;
  analysisDepth: 'shallow' | 'medium' | 'deep';
  connectionTypes: ConnectionType[];
  temporalWeight: number;
  semanticWeight: number;
  thematicWeight: number;
}

class IntelligentConnectionService extends EventEmitter {
  private config: ConnectionConfig;
  private embeddingCache: Map<string, number[]> = new Map();
  private connectionCache: Map<string, NoteConnection[]> = new Map();
  private analysisQueue: Set<string> = new Set();
  private isProcessing = false;
  private knowledgeGraph: ConnectionGraph | null = null;
  // ✅ Interval cleanup対応: タイマーIDを追跡
  private analysisInterval: NodeJS.Timeout | undefined = undefined; // ✅ Timer型修正: 明示的undefined初期化
  private cleanupInterval: NodeJS.Timeout | undefined = undefined; // ✅ Timer型修正: 明示的undefined初期化

  constructor(config?: Partial<ConnectionConfig>) {
    super();
    this.config = {
      similarityThreshold: 0.7,
      maxConnections: 10,
      enableRealTimeAnalysis: true,
      analysisDepth: 'medium',
      connectionTypes: Object.values(ConnectionType),
      temporalWeight: 0.2,
      semanticWeight: 0.5,
      thematicWeight: 0.3,
      ...config
    };
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Setup periodic analysis
    if (this.config.enableRealTimeAnalysis) {
      this.analysisInterval = setInterval(() => this.processAnalysisQueue(), 5000);
    }
    
    // Setup cache cleanup
    this.cleanupInterval = setInterval(() => this.cleanupCaches(), 300000); // 5 minutes
    
    this.emit('initialized');
  }

  // ✅ Interval cleanup対応: disposeメソッド追加
  dispose(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    // Clear caches
    this.embeddingCache.clear();
    this.connectionCache.clear();
    this.analysisQueue.clear();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    console.log('🧹 IntelligentConnectionService disposed - intervals cleaned up');
  }

  // Main Public API
  async discoverConnections(note: Note, allNotes: Note[]): Promise<NoteConnection[]> {
    try {
      const connections: NoteConnection[] = [];
      const noteEmbedding = await this.getOrCreateEmbedding(note);
      
      // Parallel processing for better performance
      const analysisPromises = allNotes
        .filter(n => n.id !== note.id)
        .map(async (targetNote) => {
          const connection = await this.analyzeConnection(note, targetNote, noteEmbedding);
          return connection;
        });

      const results = await Promise.allSettled(analysisPromises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          connections.push(result.value);
        }
      });

      // Filter and rank connections
      return this.rankConnections(connections)
        .slice(0, this.config.maxConnections);

    } catch (error) {
      console.error('Connection discovery failed:', error);
      return [];
    }
  }

  async buildKnowledgeGraph(notes: Note[]): Promise<ConnectionGraph> {
    const startTime = Date.now();
    
    try {
      // Generate all embeddings first (with caching)
      await this.precomputeEmbeddings(notes);
      
      // Discover all connections
      const allConnections: NoteConnection[] = [];
      
      for (let i = 0; i < notes.length; i++) {
        const sourceNote = notes[i];
        if (sourceNote) {
          const connections = await this.discoverConnections(sourceNote, notes);
          allConnections.push(...connections);
        }
      }

      // Remove duplicates and build graph
      const uniqueConnections = this.deduplicateConnections(allConnections);
      const clusters = await this.detectClusters(notes, uniqueConnections);
      const insights = await this.generateInsights(notes, uniqueConnections, clusters);

      this.knowledgeGraph = {
        nodes: notes,
        edges: uniqueConnections,
        clusters,
        insights
      };

      const processingTime = Date.now() - startTime;
      this.emit('graphBuilt', { 
        nodeCount: notes.length, 
        edgeCount: uniqueConnections.length,
        clusterCount: clusters.length,
        processingTime 
      });

      return this.knowledgeGraph;

    } catch (error) {
      console.error('Knowledge graph building failed:', error);
      throw error;
    }
  }

  async suggestRelatedNotes(currentNote: Note, allNotes: Note[], count = 5): Promise<{
    note: Note;
    connection: NoteConnection;
    relevanceScore: number;
  }[]> {
    const connections = await this.discoverConnections(currentNote, allNotes);
    
    return connections
      .map(conn => {
        const relatedNote = allNotes.find(n => n.id === conn.targetId);
        if (!relatedNote) return null;
        
        return {
          note: relatedNote,
          connection: conn,
          relevanceScore: this.calculateRelevanceScore(conn, currentNote, relatedNote)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevanceScore - a!.relevanceScore)
      .slice(0, count) as Array<{
        note: Note;
        connection: NoteConnection;
        relevanceScore: number;
      }>;
  }

  async searchSimilar(query: string, notes: Note[], options: {
    mode?: 'semantic' | 'keyword' | 'hybrid';
    threshold?: number;
    maxResults?: number;
  } = {}): Promise<{
    note: Note;
    score: number;
    matchType: string;
    reasoning: string;
  }[]> {
    const { mode = 'hybrid', threshold = 0.3, maxResults = 10 } = options;
    
    try {
      const results: Array<{
        note: Note;
        score: number;
        matchType: string;
        reasoning: string;
      }> = [];

      if (mode === 'semantic' || mode === 'hybrid') {
        // Create a temporary note for the query to get embedding
        const queryNote: Note = {
          id: 'temp-query',
          title: query,
          content: query,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const queryEmbedding = await this.getOrCreateEmbedding(queryNote);
        
        for (const note of notes) {
          const noteEmbedding = await this.getOrCreateEmbedding(note);
          const similarity = this.calculateCosineSimilarity(queryEmbedding, noteEmbedding);
          
          if (similarity >= threshold) {
            results.push({
              note,
              score: similarity,
              matchType: 'semantic',
              reasoning: `Semantic similarity: ${Math.round(similarity * 100)}%`
            });
          }
        }
      }

      if (mode === 'keyword' || mode === 'hybrid') {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
        
        for (const note of notes) {
          let keywordScore = 0;
          const matchedWords: string[] = [];
          
          // Check title matches
          if (note.title.toLowerCase().includes(queryLower)) {
            keywordScore += 0.8;
            matchedWords.push('title');
          }
          
          // Check content matches
          const contentLower = note.content.toLowerCase();
          let wordMatches = 0;
          
          for (const word of queryWords) {
            if (contentLower.includes(word)) {
              wordMatches++;
              matchedWords.push(word);
            }
          }
          
          keywordScore += (wordMatches / queryWords.length) * 0.6;
          
          // Check tag matches
          for (const tag of note.tags) {
            if (tag.toLowerCase().includes(queryLower)) {
              keywordScore += 0.4;
              matchedWords.push(`tag:${tag}`);
            }
          }
          
          if (keywordScore >= threshold) {
            results.push({
              note,
              score: keywordScore,
              matchType: 'keyword',
              reasoning: `Keyword matches: ${matchedWords.join(', ')}`
            });
          }
        }
      }

      // Remove duplicates and merge scores for hybrid mode
      const noteMap = new Map<string, typeof results[0]>();
      
      for (const result of results) {
        const existing = noteMap.get(result.note.id);
        if (existing) {
          // Combine scores for hybrid mode
          existing.score = Math.max(existing.score, result.score);
          existing.matchType = mode === 'hybrid' ? 'hybrid' : result.matchType;
          existing.reasoning = mode === 'hybrid' 
            ? `${existing.reasoning}; ${result.reasoning}`
            : result.reasoning;
        } else {
          noteMap.set(result.note.id, result);
        }
      }

      return Array.from(noteMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
        
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  // Advanced Analysis Methods
  private async analyzeConnection(
    sourceNote: Note, 
    targetNote: Note, 
    sourceEmbedding?: number[]
  ): Promise<NoteConnection | null> {
    
    const sourceEmbed = sourceEmbedding || await this.getOrCreateEmbedding(sourceNote);
    const targetEmbed = await this.getOrCreateEmbedding(targetNote);
    
    // Calculate semantic similarity
    const semanticSimilarity = this.calculateCosineSimilarity(sourceEmbed, targetEmbed);
    
    if (semanticSimilarity < this.config.similarityThreshold) {
      return null;
    }

    // Multi-dimensional analysis
    const connectionAnalysis = await this.performMultiDimensionalAnalysis(
      sourceNote, 
      targetNote, 
      semanticSimilarity
    );

    if (connectionAnalysis.overallStrength < this.config.similarityThreshold) {
      return null;
    }

    return {
      sourceId: sourceNote.id,
      targetId: targetNote.id,
      strength: connectionAnalysis.overallStrength,
      type: connectionAnalysis.primaryType,
      reasoning: connectionAnalysis.reasoning,
      keywords: connectionAnalysis.sharedKeywords,
      contexts: connectionAnalysis.contexts
    };
  }

  private async performMultiDimensionalAnalysis(
    sourceNote: Note,
    targetNote: Note,
    semanticSimilarity: number
  ): Promise<{
    overallStrength: number;
    primaryType: ConnectionType;
    reasoning: string;
    sharedKeywords: string[];
    contexts: string[];
  }> {
    
    // Semantic Analysis (content similarity)
    const semanticScore = semanticSimilarity;
    
    // Thematic Analysis (topic/tag similarity)
    const thematicScore = this.calculateThematicSimilarity(sourceNote, targetNote);
    
    // Temporal Analysis (time-based relationships)
    const temporalScore = this.calculateTemporalSimilarity(sourceNote, targetNote);
    
    // Contextual Analysis (explicit references)
    const contextualAnalysis = await this.analyzeContextualReferences(sourceNote, targetNote);
    
    // Structural Analysis (format similarity)
    const structuralScore = this.calculateStructuralSimilarity(sourceNote, targetNote);
    
    // Weighted combination
    const overallStrength = (
      semanticScore * this.config.semanticWeight +
      thematicScore * this.config.thematicWeight +
      temporalScore * this.config.temporalWeight +
      contextualAnalysis.score * 0.15 +
      structuralScore * 0.05
    );
    
    // Determine primary connection type
    const scores = {
      [ConnectionType.SEMANTIC]: semanticScore,
      [ConnectionType.THEMATIC]: thematicScore,
      [ConnectionType.TEMPORAL]: temporalScore,
      [ConnectionType.CONTEXTUAL]: contextualAnalysis.score,
      [ConnectionType.STRUCTURAL]: structuralScore,
      [ConnectionType.COLLABORATIVE]: 0 // Placeholder for collaborative analysis
    };
    
    const primaryType = Object.entries(scores).reduce((a, b) => 
      scores[a[0] as ConnectionType] > scores[b[0] as ConnectionType] ? a : b
    )[0] as ConnectionType;
    
    // Generate reasoning
    const reasoning = await this.generateConnectionReasoning(
      sourceNote, 
      targetNote, 
      primaryType, 
      overallStrength
    );
    
    return {
      overallStrength,
      primaryType,
      reasoning,
      sharedKeywords: contextualAnalysis.sharedKeywords,
      contexts: contextualAnalysis.contexts
    };
  }

  private calculateThematicSimilarity(note1: Note, note2: Note): number {
    const tags1 = new Set(note1.tags.map(t => t.toLowerCase()));
    const tags2 = new Set(note2.tags.map(t => t.toLowerCase()));
    
    const intersection = new Set([...tags1].filter(t => tags2.has(t)));
    const union = new Set([...tags1, ...tags2]);
    
    // Jaccard similarity for tags
    const tagSimilarity = union.size > 0 ? intersection.size / union.size : 0;
    
    // Title similarity (simple word overlap)
    const titleWords1 = new Set(note1.title.toLowerCase().split(/\s+/));
    const titleWords2 = new Set(note2.title.toLowerCase().split(/\s+/));
    const titleIntersection = new Set([...titleWords1].filter(w => titleWords2.has(w)));
    const titleUnion = new Set([...titleWords1, ...titleWords2]);
    const titleSimilarity = titleUnion.size > 0 ? titleIntersection.size / titleUnion.size : 0;
    
    return (tagSimilarity * 0.7 + titleSimilarity * 0.3);
  }

  private calculateTemporalSimilarity(note1: Note, note2: Note): number {
    const timeDiff = Math.abs(note1.createdAt.getTime() - note2.createdAt.getTime());
    const maxTime = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    
    // Exponential decay for temporal similarity
    return Math.exp(-timeDiff / maxTime);
  }

  private async analyzeContextualReferences(note1: Note, note2: Note): Promise<{
    score: number;
    sharedKeywords: string[];
    contexts: string[];
  }> {
    
    // Extract keywords and key phrases
    const keywords1 = await this.extractKeywords(note1.content);
    const keywords2 = await this.extractKeywords(note2.content);
    
    const sharedKeywords = keywords1.filter(k => keywords2.includes(k));
    
    // Look for explicit references
    const contexts: string[] = [];
    const score = sharedKeywords.length > 0 ? 
      Math.min(sharedKeywords.length / Math.max(keywords1.length, keywords2.length), 1) : 0;
    
    // Check for title mentions
    if (note1.content.toLowerCase().includes(note2.title.toLowerCase())) {
      contexts.push(`"${note1.title}" references "${note2.title}"`);
    }
    if (note2.content.toLowerCase().includes(note1.title.toLowerCase())) {
      contexts.push(`"${note2.title}" references "${note1.title}"`);
    }
    
    return { score, sharedKeywords, contexts };
  }

  private calculateStructuralSimilarity(note1: Note, note2: Note): number {
    // Analyze document structure patterns
    const getStructureFeatures = (content: string) => ({
      headerCount: (content.match(/^#+\s/gm) || []).length,
      listCount: (content.match(/^[*\-+]\s/gm) || []).length,
      codeBlockCount: (content.match(/```/g) || []).length / 2,
      linkCount: (content.match(/\[.*?\]\(.*?\)/g) || []).length,
      lengthCategory: content.length < 500 ? 'short' : content.length < 2000 ? 'medium' : 'long'
    });
    
    const struct1 = getStructureFeatures(note1.content);
    const struct2 = getStructureFeatures(note2.content);
    
    // Calculate similarity across structural features
    let similarity = 0;
    let featureCount = 0;
    
    // Length category match
    if (struct1.lengthCategory === struct2.lengthCategory) similarity += 0.3;
    featureCount++;
    
    // Header count similarity
    const headerSim = 1 - Math.abs(struct1.headerCount - struct2.headerCount) / 
      Math.max(struct1.headerCount + struct2.headerCount, 1);
    similarity += headerSim * 0.25;
    featureCount++;
    
    // List count similarity
    const listSim = 1 - Math.abs(struct1.listCount - struct2.listCount) / 
      Math.max(struct1.listCount + struct2.listCount, 1);
    similarity += listSim * 0.25;
    featureCount++;
    
    // Code block similarity
    const codeSim = 1 - Math.abs(struct1.codeBlockCount - struct2.codeBlockCount) / 
      Math.max(struct1.codeBlockCount + struct2.codeBlockCount, 1);
    similarity += codeSim * 0.2;
    featureCount++;
    
    return similarity / featureCount;
  }

  private async extractKeywords(content: string): Promise<string[]> {
    try {
      // Use AI service to extract keywords
      const tags = await lightweightAI.generateTags(content, 10);
      return tags;
    } catch {
      // Fallback: simple keyword extraction
      const words = content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      // Remove common stop words
      const stopWords = new Set(['this', 'that', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other']);
      
      return [...new Set(words.filter(word => !stopWords.has(word)))].slice(0, 10);
    }
  }

  private async generateConnectionReasoning(
    _sourceNote: Note,
    _targetNote: Note,
    connectionType: ConnectionType,
    strength: number
  ): Promise<string> {
    
    const strengthDesc = strength > 0.8 ? 'strong' : strength > 0.6 ? 'moderate' : 'weak';
    
    const reasoningTemplates = {
      [ConnectionType.SEMANTIC]: `${strengthDesc} semantic similarity in content themes and concepts`,
      [ConnectionType.THEMATIC]: `${strengthDesc} thematic overlap in topics and tags`,
      [ConnectionType.TEMPORAL]: `${strengthDesc} temporal relationship - created around the same time`,
      [ConnectionType.CONTEXTUAL]: `${strengthDesc} contextual references and shared terminology`,
      [ConnectionType.STRUCTURAL]: `${strengthDesc} structural similarity in document format and organization`,
      [ConnectionType.COLLABORATIVE]: `${strengthDesc} collaborative patterns in user interaction`
    };
    
    return reasoningTemplates[connectionType] || `${strengthDesc} connection detected`;
  }

  // Clustering and Graph Analysis
  private async detectClusters(notes: Note[], connections: NoteConnection[]): Promise<NoteCluster[]> {
    const clusters: NoteCluster[] = [];
    const visited = new Set<string>();
    
    // Build adjacency list
    const graph = new Map<string, string[]>();
    notes.forEach(note => graph.set(note.id, []));
    
    connections.forEach(conn => {
      if (conn.strength > 0.6) { // Only strong connections for clustering
        graph.get(conn.sourceId)?.push(conn.targetId);
        graph.get(conn.targetId)?.push(conn.sourceId);
      }
    });
    
    // DFS-based clustering
    const dfs = (nodeId: string, cluster: string[]): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      cluster.push(nodeId);
      
      graph.get(nodeId)?.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, cluster);
        }
      });
    };
    
    // Find clusters
    for (const note of notes) {
      if (!visited.has(note.id)) {
        const cluster: string[] = [];
        dfs(note.id, cluster);
        
        if (cluster.length >= 2) { // Minimum cluster size
          const clusterNotes = cluster.map(id => notes.find(n => n.id === id)!).filter(Boolean);
          const keywords = await this.extractClusterKeywords(clusterNotes);
          const theme = await this.generateClusterTheme(clusterNotes, keywords);
          
          clusters.push({
            id: `cluster_${clusters.length}`,
            name: `Cluster ${clusters.length + 1}`,
            theme,
            noteIds: cluster,
            strength: this.calculateClusterStrength(cluster, connections),
            keywords
          });
        }
      }
    }
    
    return clusters;
  }

  private async extractClusterKeywords(notes: Note[]): Promise<string[]> {
    const allKeywords: string[] = [];
    
    for (const note of notes) {
      const keywords = await this.extractKeywords(note.content);
      allKeywords.push(...keywords);
    }
    
    // Count frequency and return top keywords
    const keywordCounts = new Map<string, number>();
    allKeywords.forEach(keyword => {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    });
    
    return Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);
  }

  private async generateClusterTheme(notes: Note[], keywords: string[]): Promise<string> {
    try {
      const titles = notes.map(n => n.title).join(', ');
      const keywordStr = keywords.join(', ');
      
      const themePrompt = `Based on these note titles: "${titles}" and keywords: "${keywordStr}", generate a concise theme name (2-4 words):`;
      
      const classification = await lightweightAI.classify(themePrompt, [
        'Work Projects', 'Personal Development', 'Research Topics', 'Meeting Notes', 
        'Ideas & Concepts', 'Technical Documentation', 'Learning Resources'
      ]);
      
      return classification.category;
    } catch {
      return keywords.slice(0, 2).join(' & ') || 'Mixed Topics';
    }
  }

  private calculateClusterStrength(noteIds: string[], connections: NoteConnection[]): number {
    const clusterConnections = connections.filter(conn => 
      noteIds.includes(conn.sourceId) && noteIds.includes(conn.targetId)
    );
    
    if (clusterConnections.length === 0) return 0;
    
    const avgStrength = clusterConnections.reduce((sum, conn) => sum + conn.strength, 0) / 
      clusterConnections.length;
    
    // Consider connection density
    const maxPossibleConnections = (noteIds.length * (noteIds.length - 1)) / 2;
    const density = clusterConnections.length / maxPossibleConnections;
    
    return avgStrength * density;
  }

  // Insight Generation
  private async generateInsights(
    notes: Note[], 
    connections: NoteConnection[], 
    clusters: NoteCluster[]
  ): Promise<ConnectionInsight[]> {
    const insights: ConnectionInsight[] = [];
    
    // Find trending topics
    const trendingInsight = await this.findTrendingTopics(notes, connections);
    if (trendingInsight) insights.push(trendingInsight);
    
    // Identify isolated notes
    const isolatedInsight = this.findIsolatedNotes(notes, connections);
    if (isolatedInsight) insights.push(isolatedInsight);
    
    // Detect emerging themes
    const emergingInsight = await this.findEmergingThemes(clusters, notes);
    if (emergingInsight) insights.push(emergingInsight);
    
    // Find knowledge gaps
    const gapInsight = await this.findKnowledgeGaps(notes, connections);
    if (gapInsight) insights.push(gapInsight);
    
    return insights.sort((a, b) => b.priority - a.priority);
  }

  private async findTrendingTopics(notes: Note[], _connections: NoteConnection[]): Promise<ConnectionInsight | null> {
    // Analyze recent note creation patterns
    const recentNotes = notes
      .filter(n => Date.now() - n.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) // Last 7 days
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (recentNotes.length < 3) return null;
    
    const topKeywords = await this.extractClusterKeywords(recentNotes.slice(0, 5));
    
    return {
      type: 'trending_topic',
      title: `Trending Topic: ${topKeywords[0] || 'Recent Activity'}`,
      description: `${recentNotes.length} notes created recently focusing on ${topKeywords.slice(0, 3).join(', ')}`,
      relevantNotes: recentNotes.slice(0, 5).map(n => n.id),
      actionable: true,
      priority: 0.8
    };
  }

  private findIsolatedNotes(notes: Note[], connections: NoteConnection[]): ConnectionInsight | null {
    const connectedNotes = new Set<string>();
    connections.forEach(conn => {
      connectedNotes.add(conn.sourceId);
      connectedNotes.add(conn.targetId);
    });
    
    const isolatedNotes = notes.filter(n => !connectedNotes.has(n.id));
    
    if (isolatedNotes.length === 0) return null;
    
    return {
      type: 'isolated_note',
      title: `${isolatedNotes.length} Isolated Notes`,
      description: `These notes have no connections to other content and might benefit from linking`,
      relevantNotes: isolatedNotes.slice(0, 5).map(n => n.id),
      actionable: true,
      priority: 0.6
    };
  }

  private async findEmergingThemes(clusters: NoteCluster[], notes: Note[]): Promise<ConnectionInsight | null> {
    const newClusters = clusters.filter(c => {
      const clusterNotes = c.noteIds.map(id => notes.find(n => n.id === id)!);
      const avgAge = clusterNotes.reduce((sum, n) => sum + (Date.now() - n.createdAt.getTime()), 0) / clusterNotes.length;
      return avgAge < 14 * 24 * 60 * 60 * 1000; // Less than 2 weeks old
    });
    
    if (newClusters.length === 0) return null;
    
    const strongestCluster = newClusters.reduce((max, cluster) => 
      cluster.strength > max.strength ? cluster : max
    );
    
    return {
      type: 'emerging_theme',
      title: `Emerging Theme: ${strongestCluster.theme}`,
      description: `New cluster forming around ${strongestCluster.keywords.join(', ')} with ${strongestCluster.noteIds.length} notes`,
      relevantNotes: strongestCluster.noteIds,
      actionable: true,
      priority: 0.7
    };
  }

  private async findKnowledgeGaps(notes: Note[], connections: NoteConnection[]): Promise<ConnectionInsight | null> {
    // Analyze connection patterns to find potential gaps
    const connectionDensity = connections.length / (notes.length * (notes.length - 1) / 2);
    
    if (connectionDensity > 0.3) return null; // No significant gaps
    
    return {
      type: 'knowledge_gap',
      title: 'Knowledge Gaps Detected',
      description: `Low connection density (${Math.round(connectionDensity * 100)}%) suggests potential gaps in knowledge linking`,
      relevantNotes: [],
      actionable: true,
      priority: 0.5
    };
  }

  // Utility Methods
  private async getOrCreateEmbedding(note: Note): Promise<number[]> {
    const cacheKey = `${note.id}_${note.updatedAt.getTime()}`;
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }
    
    const text = `${note.title}\n\n${note.content}`.slice(0, 2000); // Limit text length
    
    // Use pseudo-embedding approach since searchSimilar doesn't return embeddings
    const pseudoEmbedding = this.generatePseudoEmbedding(text);
    
    this.embeddingCache.set(cacheKey, pseudoEmbedding);
    return pseudoEmbedding;
  }

  private generatePseudoEmbedding(text: string): number[] {
    const embedding = new Array(384).fill(0);
    for (let i = 0; i < text.length; i++) {
      embedding[i % 384] += text.charCodeAt(i) / 255;
    }
    return embedding.map(v => v / text.length);
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] || 0;
      const bVal = b[i] || 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private async precomputeEmbeddings(notes: Note[]): Promise<void> {
    const batchSize = 5;
    for (let i = 0; i < notes.length; i += batchSize) {
      const batch = notes.slice(i, i + batchSize);
      await Promise.all(batch.map(note => this.getOrCreateEmbedding(note)));
    }
  }

  private deduplicateConnections(connections: NoteConnection[]): NoteConnection[] {
    const seen = new Set<string>();
    return connections.filter(conn => {
      const key = `${conn.sourceId}_${conn.targetId}`;
      const reverseKey = `${conn.targetId}_${conn.sourceId}`;
      
      if (seen.has(key) || seen.has(reverseKey)) return false;
      seen.add(key);
      return true;
    });
  }

  private rankConnections(connections: NoteConnection[]): NoteConnection[] {
    return connections.sort((a, b) => {
      // Primary sort by strength
      if (Math.abs(a.strength - b.strength) > 0.05) {
        return b.strength - a.strength;
      }
      
      // Secondary sort by connection type priority
      const typePriority = {
        [ConnectionType.CONTEXTUAL]: 5,
        [ConnectionType.SEMANTIC]: 4,
        [ConnectionType.THEMATIC]: 3,
        [ConnectionType.TEMPORAL]: 2,
        [ConnectionType.STRUCTURAL]: 1,
        [ConnectionType.COLLABORATIVE]: 1
      };
      
      return typePriority[b.type] - typePriority[a.type];
    });
  }

  private calculateRelevanceScore(connection: NoteConnection, currentNote: Note, relatedNote: Note): number {
    let score = connection.strength * 0.6;
    
    // Boost score for recent notes
    const daysSinceCreated = (Date.now() - relatedNote.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceCreated < 7) score += 0.2;
    
    // Boost for shared tags
    const sharedTags = currentNote.tags.filter(tag => relatedNote.tags.includes(tag));
    score += sharedTags.length * 0.1;
    
    return Math.min(score, 1);
  }

  private async processAnalysisQueue(): Promise<void> {
    if (this.isProcessing || this.analysisQueue.size === 0) return;
    
    this.isProcessing = true;
    const noteId = this.analysisQueue.values().next().value;
    this.analysisQueue.delete(noteId);
    
    try {
      // Process real-time analysis for this note
      this.emit('noteAnalyzed', { noteId, timestamp: Date.now() });
    } catch (error) {
      console.error('Real-time analysis failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private cleanupCaches(): void {
    const maxCacheSize = 1000;
    
    if (this.embeddingCache.size > maxCacheSize) {
      const keys = Array.from(this.embeddingCache.keys());
      keys.slice(0, keys.length - maxCacheSize).forEach(key => {
        this.embeddingCache.delete(key);
      });
    }
    
    if (this.connectionCache.size > maxCacheSize) {
      const keys = Array.from(this.connectionCache.keys());
      keys.slice(0, keys.length - maxCacheSize).forEach(key => {
        this.connectionCache.delete(key);
      });
    }
  }

  // Public API for queue management
  queueNoteForAnalysis(noteId: string): void {
    this.analysisQueue.add(noteId);
  }

  getKnowledgeGraph(): ConnectionGraph | null {
    return this.knowledgeGraph;
  }

  updateConfig(newConfig: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  async getStatus(): Promise<{
    cacheSize: number;
    queueSize: number;
    isProcessing: boolean;
    config: ConnectionConfig;
  }> {
    return {
      cacheSize: this.embeddingCache.size,
      queueSize: this.analysisQueue.size,
      isProcessing: this.isProcessing,
      config: this.config
    };
  }
}

// Export singleton instance and types
export const intelligentConnectionService = new IntelligentConnectionService();
export type { Note, NoteConnection, ConnectionGraph, ConnectionInsight };
export { ConnectionType };
export default intelligentConnectionService;