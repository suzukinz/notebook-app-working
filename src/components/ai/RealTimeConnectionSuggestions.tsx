// Real-Time Connection Suggestions Component
// Provides live suggestions and smart linking as users type

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Link, 
  ArrowRight, 
  Zap, 
  Clock, 
  Tag, 
  BookOpen, 
  Eye, 
  EyeOff,
  Plus,
  X,
  Target,
  Lightbulb
} from 'lucide-react';
import { 
  intelligentConnectionService, 
  type Note, 
  type NoteConnection 
} from '../../services/ai/IntelligentConnectionService';
import { useLightweightAI } from '../../services/ai/LightweightAIService';
import './RealTimeConnectionSuggestions.css';

interface RealTimeConnectionSuggestionsProps {
  currentNote: Note;
  allNotes: Note[];
  onNoteSelect?: (noteId: string) => void;
  onCreateConnection?: (sourceId: string, targetId: string) => void;
  onInsertReference?: (text: string) => void;
  position?: 'sidebar' | 'floating' | 'inline';
  enabled?: boolean;
  maxSuggestions?: number;
}

interface LiveSuggestion {
  note: Note;
  connection: NoteConnection;
  relevanceScore: number;
  reason: string;
  snippet: string;
  isNew: boolean;
}

interface ContextualKeyword {
  word: string;
  frequency: number;
  relevance: number;
  relatedNotes: string[];
}

interface SuggestionTrigger {
  type: 'keyword' | 'phrase' | 'concept' | 'context';
  value: string;
  position: number;
  confidence: number;
}

const RealTimeConnectionSuggestions: React.FC<RealTimeConnectionSuggestionsProps> = ({
  currentNote,
  allNotes,
  onNoteSelect,
  onCreateConnection,
  onInsertReference,
  position = 'sidebar',
  enabled = true,
  maxSuggestions = 5
}) => {
  // State Management
  const [liveSuggestions, setLiveSuggestions] = useState<LiveSuggestion[]>([]);
  const [contextualKeywords, setContextualKeywords] = useState<ContextualKeyword[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestionTriggers, setSuggestionTriggers] = useState<SuggestionTrigger[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<LiveSuggestion | null>(null);
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true);
  const [lastAnalyzedText, setLastAnalyzedText] = useState('');
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    timestamp: number;
    textLength: number;
    suggestionsCount: number;
  }>>([]);

  // Refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnalysisRef = useRef<number>(0);

  // AI Hook
  const ai = useLightweightAI();

  // Real-time Text Analysis
  const analyzeTextForSuggestions = useCallback(async (text: string, fullContent: string) => {
    if (!enabled || !autoSuggestEnabled || text.length < 10) {
      setLiveSuggestions([]);
      return;
    }

    // Prevent duplicate analysis
    if (text === lastAnalyzedText) return;
    
    const now = Date.now();
    if (now - lastAnalysisRef.current < 500) return; // Rate limiting
    
    setIsAnalyzing(true);
    lastAnalysisRef.current = now;
    
    try {
      // Extract analysis context from current position
      const analysisContext = {
        currentText: text,
        fullContent,
        cursorPosition: text.length,
        recentWords: extractRecentWords(text, 5),
        sentences: extractSentences(text)
      };

      // Parallel analysis
      const [suggestions, keywords, triggers] = await Promise.all([
        findRelevantNotes(analysisContext),
        extractContextualKeywords(analysisContext),
        identifyTriggers(analysisContext)
      ]);

      // Update state
      setLiveSuggestions(suggestions);
      setContextualKeywords(keywords);
      setSuggestionTriggers(triggers);
      setLastAnalyzedText(text);
      
      // Update analysis history
      setAnalysisHistory(prev => [...prev.slice(-19), {
        timestamp: now,
        textLength: text.length,
        suggestionsCount: suggestions.length
      }]);

    } catch (error) {
      console.error('Real-time analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [enabled, autoSuggestEnabled, lastAnalyzedText, allNotes]);

  // Debounced analysis trigger
  const debouncedAnalyze = useCallback((text: string, fullContent: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      analyzeTextForSuggestions(text, fullContent);
    }, 300); // 300ms debounce
  }, [analyzeTextForSuggestions]);

  // Text change monitoring
  useEffect(() => {
    if (!currentNote.content) return;
    
    // Trigger analysis on content change
    debouncedAnalyze(currentNote.content, currentNote.content);
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [currentNote.content, debouncedAnalyze]);

  // Find Relevant Notes
  const findRelevantNotes = useCallback(async (context: any): Promise<LiveSuggestion[]> => {
    try {
      // Use intelligent connection service for analysis
      const relatedNotes = await intelligentConnectionService.suggestRelatedNotes(
        currentNote, 
        allNotes.filter(n => n.id !== currentNote.id), 
        maxSuggestions
      );

      // Convert to live suggestions with enhanced data
      const suggestions = await Promise.all(
        relatedNotes.map(async ({ note, connection, relevanceScore }) => {
          const reason = generateSuggestionReason(connection, context);
          const snippet = extractRelevantSnippet(note.content, context.recentWords);
          
          return {
            note,
            connection,
            relevanceScore,
            reason,
            snippet,
            isNew: Date.now() - note.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
          };
        })
      );

      return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      console.error('Failed to find relevant notes:', error);
      return [];
    }
  }, [currentNote, allNotes, maxSuggestions]);

  // Extract Contextual Keywords
  const extractContextualKeywords = useCallback(async (context: any): Promise<ContextualKeyword[]> => {
    try {
      const keywords = await ai.generateTags(context.currentText, 8);
      
      const keywordAnalysis = keywords.map(keyword => {
        const relatedNotes = allNotes.filter(note => 
          note.content.toLowerCase().includes(keyword.toLowerCase()) ||
          note.title.toLowerCase().includes(keyword.toLowerCase())
        ).map(n => n.id);

        const frequency = (context.fullContent.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
        const relevance = Math.min(1, (frequency * 0.3) + (relatedNotes.length * 0.1) + 0.4);

        return {
          word: keyword,
          frequency,
          relevance,
          relatedNotes
        };
      });

      return keywordAnalysis
        .filter(k => k.relevance > 0.3)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5);

    } catch (error) {
      console.error('Failed to extract keywords:', error);
      return [];
    }
  }, [ai, allNotes]);

  // Identify Suggestion Triggers
  const identifyTriggers = useCallback((context: any): SuggestionTrigger[] => {
    const triggers: SuggestionTrigger[] = [];
    const text = context.currentText.toLowerCase();
    
    // Keyword triggers
    contextualKeywords.forEach(keyword => {
      const index = text.lastIndexOf(keyword.word.toLowerCase());
      if (index !== -1 && index > text.length - 50) { // Recent keyword usage
        triggers.push({
          type: 'keyword',
          value: keyword.word,
          position: index,
          confidence: keyword.relevance
        });
      }
    });

    // Phrase triggers (common patterns)
    const phrasePatterns = [
      /similar to/gi,
      /related to/gi,
      /as mentioned in/gi,
      /according to/gi,
      /see also/gi,
      /reference:/gi
    ];

    phrasePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined && match.index > text.length - 100) {
          triggers.push({
            type: 'phrase',
            value: match[0],
            position: match.index,
            confidence: 0.8
          });
        }
      });
    });

    return triggers.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }, [contextualKeywords]);

  // Utility Functions
  const extractRecentWords = useCallback((text: string, count: number): string[] => {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.slice(-count);
  }, []);

  const extractSentences = useCallback((text: string): string[] => {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).slice(-2);
  }, []);

  const generateSuggestionReason = useCallback((connection: NoteConnection, _context: any): string => {
    const reasonTemplates = {
      semantic: 'Similar concepts and themes',
      thematic: 'Related topic and tags',
      contextual: 'Shared terminology and references',
      temporal: 'Created around the same time',
      structural: 'Similar document structure'
    };

    const connectionType = connection.type.toLowerCase() as keyof typeof reasonTemplates;
    return reasonTemplates[connectionType] || 'Related content';
  }, []);

  const extractRelevantSnippet = useCallback((content: string, recentWords: string[]): string => {
    // Find the most relevant sentence based on recent words
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let bestSentence = sentences[0] || '';
    let bestScore = 0;

    sentences.forEach(sentence => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const score = recentWords.reduce((acc, word) => {
        return acc + (sentenceWords.includes(word) ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    });

    return bestSentence.trim().slice(0, 120) + (bestSentence.length > 120 ? '...' : '');
  }, []);

  // Event Handlers
  const handleSuggestionClick = useCallback((suggestion: LiveSuggestion) => {
    setSelectedSuggestion(suggestion);
    if (onNoteSelect) {
      onNoteSelect(suggestion.note.id);
    }
  }, [onNoteSelect]);

  const handleCreateConnection = useCallback((suggestion: LiveSuggestion) => {
    if (onCreateConnection) {
      onCreateConnection(currentNote.id, suggestion.note.id);
    }
  }, [onCreateConnection, currentNote.id]);

  const handleInsertReference = useCallback((suggestion: LiveSuggestion) => {
    if (onInsertReference) {
      const referenceText = `[${suggestion.note.title}](#${suggestion.note.id})`;
      onInsertReference(referenceText);
    }
  }, [onInsertReference]);

  const handleKeywordClick = useCallback((keyword: ContextualKeyword) => {
    // Show notes related to this keyword
    const relatedNotes = allNotes.filter(note => keyword.relatedNotes.includes(note.id));
    console.log('Related notes for keyword:', keyword.word, relatedNotes);
  }, [allNotes]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (analysisHistory.length === 0) return null;
    
    const recent = analysisHistory.slice(-10);
    const avgResponseTime = recent.reduce((acc, entry, index) => {
      if (index === 0) return 0;
      const prevEntry = recent[index - 1];
      return acc + (entry.timestamp - (prevEntry?.timestamp || 0));
    }, 0) / Math.max(recent.length - 1, 1);
    
    const avgSuggestions = recent.reduce((acc, entry) => acc + entry.suggestionsCount, 0) / recent.length;
    
    return {
      avgResponseTime: Math.round(avgResponseTime),
      avgSuggestions: Math.round(avgSuggestions * 10) / 10,
      totalAnalyses: analysisHistory.length
    };
  }, [analysisHistory]);

  if (!enabled) return null;

  return (
    <div className={`realtime-suggestions realtime-suggestions--${position}`}>
      {/* Header */}
      <div className="suggestions-header">
        <div className="header-title">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Smart Connections</span>
          {isAnalyzing && <div className="analyzing-indicator" />}
        </div>
        
        <div className="header-controls">
          <button
            onClick={() => setAutoSuggestEnabled(!autoSuggestEnabled)}
            className={`toggle-btn ${autoSuggestEnabled ? 'active' : ''}`}
            title="Toggle Auto-suggestions"
          >
            {autoSuggestEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          
          {performanceMetrics && (
            <div className="performance-badge" title={`${performanceMetrics.totalAnalyses} analyses`}>
              {performanceMetrics.avgResponseTime}ms
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="suggestions-content">
        {/* Live Suggestions */}
        {liveSuggestions.length > 0 && (
          <div className="suggestions-section">
            <div className="section-header">
              <Target className="w-4 h-4 text-blue-500" />
              <span>Related Notes</span>
              <span className="count-badge">{liveSuggestions.length}</span>
            </div>
            
            <div className="suggestions-list">
              {liveSuggestions.map((suggestion, index) => (
                <div 
                  key={`${suggestion.note.id}-${index}`}
                  className={`suggestion-item ${selectedSuggestion === suggestion ? 'selected' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="suggestion-content">
                    <div className="suggestion-header">
                      <div className="suggestion-title">
                        <BookOpen className="w-3 h-3" />
                        <span>{suggestion.note.title}</span>
                        {suggestion.isNew && <span className="new-badge">New</span>}
                      </div>
                      <div className="relevance-score">
                        {Math.round(suggestion.relevanceScore * 100)}%
                      </div>
                    </div>
                    
                    <div className="suggestion-reason">
                      {suggestion.reason}
                    </div>
                    
                    {suggestion.snippet && (
                      <div className="suggestion-snippet">
                        "{suggestion.snippet}"
                      </div>
                    )}
                  </div>
                  
                  <div className="suggestion-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInsertReference(suggestion);
                      }}
                      className="action-btn action-btn--link"
                      title="Insert Reference"
                    >
                      <Link className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateConnection(suggestion);
                      }}
                      className="action-btn action-btn--connect"
                      title="Create Connection"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contextual Keywords */}
        {contextualKeywords.length > 0 && (
          <div className="suggestions-section">
            <div className="section-header">
              <Tag className="w-4 h-4 text-green-500" />
              <span>Key Concepts</span>
            </div>
            
            <div className="keywords-grid">
              {contextualKeywords.map((keyword, index) => (
                <button
                  key={index}
                  className="keyword-chip"
                  onClick={() => handleKeywordClick(keyword)}
                  title={`${keyword.relatedNotes.length} related notes`}
                >
                  <span className="keyword-text">{keyword.word}</span>
                  <span className="keyword-count">{keyword.relatedNotes.length}</span>
                  <div 
                    className="keyword-relevance"
                    style={{ width: `${keyword.relevance * 100}%` }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggestion Triggers */}
        {suggestionTriggers.length > 0 && (
          <div className="suggestions-section">
            <div className="section-header">
              <Lightbulb className="w-4 h-4 text-purple-500" />
              <span>Triggers</span>
            </div>
            
            <div className="triggers-list">
              {suggestionTriggers.map((trigger, index) => (
                <div key={index} className="trigger-item">
                  <div className="trigger-type">{trigger.type}</div>
                  <div className="trigger-value">"{trigger.value}"</div>
                  <div className="trigger-confidence">
                    {Math.round(trigger.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isAnalyzing && liveSuggestions.length === 0 && contextualKeywords.length === 0 && (
          <div className="empty-state">
            <Clock className="w-8 h-8 text-gray-400" />
            <p>Keep writing to discover connections...</p>
          </div>
        )}
      </div>

      {/* Selected Suggestion Detail */}
      {selectedSuggestion && (
        <div className="suggestion-detail">
          <div className="detail-header">
            <h4>{selectedSuggestion.note.title}</h4>
            <button
              onClick={() => setSelectedSuggestion(null)}
              className="close-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="detail-content">
            <div className="connection-info">
              <div className="connection-type">
                {selectedSuggestion.connection.type} connection
              </div>
              <div className="connection-strength">
                {Math.round(selectedSuggestion.connection.strength * 100)}% similarity
              </div>
            </div>
            
            {selectedSuggestion.connection.reasoning && (
              <div className="connection-reasoning">
                {selectedSuggestion.connection.reasoning}
              </div>
            )}
            
            <div className="detail-actions">
              <button
                onClick={() => handleSuggestionClick(selectedSuggestion)}
                className="detail-action-btn detail-action-btn--primary"
              >
                <ArrowRight className="w-4 h-4" />
                Open Note
              </button>
              <button
                onClick={() => handleInsertReference(selectedSuggestion)}
                className="detail-action-btn"
              >
                <Link className="w-4 h-4" />
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeConnectionSuggestions;