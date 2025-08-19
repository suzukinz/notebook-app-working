// Intelligent Search Interface
// Enhanced search with AI-powered connections and semantic discovery

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  Filter, 
  Clock, 
  Tag, 
  BookOpen, 
  Network,
  Brain,
  Target,
  X,
} from 'lucide-react';
import { 
  intelligentConnectionService, 
  type Note, 
  type NoteConnection,
  ConnectionType 
} from '../../services/ai/IntelligentConnectionService';
import { useLightweightAI } from '../../services/ai/LightweightAIService';
import { searchIndex } from '../../utils/searchIndex';
import './IntelligentSearchInterface.css';

interface IntelligentSearchInterfaceProps {
  notes: Note[];
  onNoteSelect?: (noteId: string) => void;
  onCreateNewNote?: (title: string, content?: string) => void;
  selectedNoteId?: string;
  placeholder?: string;
  maxResults?: number;
  enableAISearch?: boolean;
}

interface SearchResult {
  note: Note;
  score: number;
  matchType: 'traditional' | 'semantic' | 'connection' | 'ai_suggestion';
  snippet: string;
  highlights: string[];
  connection?: NoteConnection;
  reasoning?: string;
}

interface SearchMode {
  type: 'traditional' | 'semantic' | 'hybrid' | 'intelligent';
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface SearchFilter {
  tags: string[];
  dateRange: { start?: Date; end?: Date };
  connectionTypes: ConnectionType[];
  minSimilarity: number;
  sortBy: 'relevance' | 'date' | 'title' | 'connections';
}

const IntelligentSearchInterface: React.FC<IntelligentSearchInterfaceProps> = ({
  notes,
  onNoteSelect,
  onCreateNewNote,
  placeholder = "Search notes intelligently...",
  maxResults = 10,
  enableAISearch = true
}) => {
  // State Management
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode['type']>('hybrid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>({
    tags: [],
    dateRange: {},
    connectionTypes: Object.values(ConnectionType),
    minSimilarity: 0.6,
    sortBy: 'relevance'
  });
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // AI Hook
  const ai = useLightweightAI();

  // Search Modes Configuration
  const searchModes: SearchMode[] = [
    {
      type: 'traditional',
      label: 'Traditional',
      description: 'Keyword-based search using full-text index',
      icon: <Search className="w-4 h-4" />
    },
    {
      type: 'semantic',
      label: 'Semantic',
      description: 'AI-powered meaning-based search',
      icon: <Brain className="w-4 h-4" />
    },
    {
      type: 'hybrid',
      label: 'Hybrid',
      description: 'Combined traditional and semantic search',
      icon: <Sparkles className="w-4 h-4" />
    },
    {
      type: 'intelligent',
      label: 'Intelligent',
      description: 'AI suggestions and connection discovery',
      icon: <Network className="w-4 h-4" />
    }
  ];

  // Available Tags for Filtering
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Intelligent Search Function
  const performIntelligentSearch = useCallback(async (searchQuery: string): Promise<SearchResult[]> => {
    if (!searchQuery.trim()) return [];

    setIsSearching(true);

    try {
      const results: SearchResult[] = [];

      // Traditional Search
      if (searchMode === 'traditional' || searchMode === 'hybrid') {
        const searchOptions: { limit: number; subFolderId?: string; tags?: string[]; } = {
          limit: maxResults
        };
        if (searchFilter.tags.length > 0) {
          searchOptions.tags = searchFilter.tags;
        }
        const traditionalResults = searchIndex.search(searchQuery, searchOptions);

        const traditionalSearchResults = traditionalResults.map(noteId => {
          const note = notes.find(n => n.id === noteId.toString());
          if (!note) return null;

          return {
            note,
            score: 0.8, // Base score for traditional search
            matchType: 'traditional' as const,
            snippet: extractSnippet(note.content, searchQuery),
            highlights: extractHighlights(note, searchQuery),
            reasoning: 'Keyword match in title or content'
          };
        }).filter(Boolean) as SearchResult[];

        results.push(...traditionalSearchResults);
      }

      // Semantic Search
      if ((searchMode === 'semantic' || searchMode === 'hybrid') && enableAISearch) {
        try {
          const semanticResults = await intelligentConnectionService.searchSimilar(
            searchQuery,
            notes
          );

          const semanticSearchResults = semanticResults
            .filter(result => result.score >= searchFilter.minSimilarity)
            .slice(0, maxResults)
            .map(result => {
              return {
                note: result.note,
                score: result.score,
                matchType: 'semantic' as const,
                snippet: result.note.content.slice(0, 150) + '...',
                highlights: [],
                reasoning: result.reasoning
              };
            }) as SearchResult[];

          results.push(...semanticSearchResults);
        } catch (error) {
          console.error('Semantic search failed:', error);
        }
      }

      // Intelligent Connection Discovery
      if (searchMode === 'intelligent' && enableAISearch) {
        try {
          // Create a temporary note for the search query
          const queryNote: Note = {
            id: 'search-query',
            title: searchQuery,
            content: searchQuery,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const connectionResults = await intelligentConnectionService.suggestRelatedNotes(
            queryNote,
            notes,
            maxResults
          );

          const intelligentSearchResults = connectionResults.map(({ note, connection, relevanceScore }) => ({
            note,
            score: relevanceScore,
            matchType: 'connection' as const,
            snippet: extractSnippet(note.content, searchQuery),
            highlights: connection.keywords || [],
            connection,
            reasoning: connection.reasoning || 'Intelligent connection discovered'
          }));

          results.push(...intelligentSearchResults);
        } catch (error) {
          console.error('Intelligent search failed:', error);
        }
      }

      // Deduplicate and sort results
      const uniqueResults = deduplicateResults(results);
      const sortedResults = sortResults(uniqueResults, searchFilter.sortBy);
      const filteredResults = applyFilters(sortedResults, searchFilter);

      return filteredResults.slice(0, maxResults);

    } catch (error) {
      console.error('Search failed:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [searchMode, notes, maxResults, enableAISearch, searchFilter]);

  // AI Suggestions Generation
  const generateAISuggestions = useCallback(async (query: string) => {
    if (!enableAISearch || query.length < 3) {
      setAiSuggestions([]);
      return;
    }

    try {
      // Generate query suggestions based on existing notes
      const suggestions = await ai.improve(query, 'clarity');
      if (suggestions.improved && suggestions.improved !== query) {
        setAiSuggestions([suggestions.improved]);
      }

      // Add related concept suggestions
      const tags = await ai.generateTags(query, 3);
      const conceptSuggestions = tags.map(tag => `${query} ${tag}`);
      setAiSuggestions(prev => [...prev, ...conceptSuggestions].slice(0, 5));

    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    }
  }, [ai, enableAISearch]);

  // Debounced Search
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (searchQuery.trim()) {
        const results = await performIntelligentSearch(searchQuery);
        setSearchResults(results);
        

        // Generate AI suggestions
        generateAISuggestions(searchQuery);
      } else {
        setSearchResults([]);
        setAiSuggestions([]);
      }
    }, 300);
  }, [performIntelligentSearch, generateAISuggestions]);

  // Search Effect
  useEffect(() => {
    debouncedSearch(query);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, debouncedSearch]);

  // Utility Functions
  const extractSnippet = useCallback((content: string, searchQuery: string): string => {
    const queryWords = searchQuery.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Find sentence with most query word matches
    let bestSentence = sentences[0] || '';
    let maxMatches = 0;

    sentences.forEach(sentence => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const matches = queryWords.reduce((count, word) => {
        return count + sentenceWords.filter(sw => sw.includes(word)).length;
      }, 0);

      if (matches > maxMatches) {
        maxMatches = matches;
        bestSentence = sentence;
      }
    });

    return bestSentence.trim().slice(0, 120) + (bestSentence.length > 120 ? '...' : '');
  }, []);

  const extractHighlights = useCallback((note: Note, searchQuery: string): string[] => {
    const queryWords = searchQuery.toLowerCase().split(/\s+/);
    const highlights: string[] = [];
    
    // Check title
    queryWords.forEach(word => {
      if (note.title.toLowerCase().includes(word)) {
        highlights.push(word);
      }
    });

    // Check tags
    note.tags.forEach(tag => {
      if (queryWords.some(word => tag.toLowerCase().includes(word))) {
        highlights.push(tag);
      }
    });

    return [...new Set(highlights)];
  }, []);

  const deduplicateResults = useCallback((results: SearchResult[]): SearchResult[] => {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.note.id)) return false;
      seen.add(result.note.id);
      return true;
    });
  }, []);

  const sortResults = useCallback((results: SearchResult[], sortBy: SearchFilter['sortBy']): SearchResult[] => {
    return [...results].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.score - a.score;
        case 'date':
          return new Date(b.note.updatedAt).getTime() - new Date(a.note.updatedAt).getTime();
        case 'title':
          return a.note.title.localeCompare(b.note.title);
        case 'connections':
          return (b.connection?.strength || 0) - (a.connection?.strength || 0);
        default:
          return b.score - a.score;
      }
    });
  }, []);

  const applyFilters = useCallback((results: SearchResult[], filter: SearchFilter): SearchResult[] => {
    return results.filter(result => {
      // Tag filter
      if (filter.tags.length > 0) {
        const hasAllTags = filter.tags.every(tag => result.note.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      // Date range filter
      if (filter.dateRange.start || filter.dateRange.end) {
        const noteDate = new Date(result.note.updatedAt);
        if (filter.dateRange.start && noteDate < filter.dateRange.start) return false;
        if (filter.dateRange.end && noteDate > filter.dateRange.end) return false;
      }

      // Connection type filter
      if (result.connection && !filter.connectionTypes.includes(result.connection.type)) {
        return false;
      }

      // Minimum similarity filter
      if (result.score < filter.minSimilarity) return false;

      return true;
    });
  }, []);

  // Event Handlers
  const handleSearchChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    setSelectedResult(result);
    if (onNoteSelect) {
      onNoteSelect(result.note.id);
    }
  }, [onNoteSelect]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setAiSuggestions([]);
  }, []);

  const handleCreateNote = useCallback(() => {
    if (onCreateNewNote && query.trim()) {
      onCreateNewNote(query.trim());
      setQuery('');
    }
  }, [onCreateNewNote, query]);

  const getMatchTypeIcon = useCallback((matchType: SearchResult['matchType']) => {
    switch (matchType) {
      case 'traditional':
        return <Search className="w-3 h-3" />;
      case 'semantic':
        return <Brain className="w-3 h-3" />;
      case 'connection':
        return <Network className="w-3 h-3" />;
      case 'ai_suggestion':
        return <Sparkles className="w-3 h-3" />;
      default:
        return <Search className="w-3 h-3" />;
    }
  }, []);

  const getMatchTypeColor = useCallback((matchType: SearchResult['matchType']) => {
    switch (matchType) {
      case 'traditional':
        return '#3b82f6';
      case 'semantic':
        return '#8b5cf6';
      case 'connection':
        return '#10b981';
      case 'ai_suggestion':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  }, []);

  return (
    <div className="intelligent-search-interface">
      {/* Search Header */}
      <div className="search-header">
        <div className="search-input-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={placeholder}
              className="search-input"
            />
            {isSearching && <div className="searching-indicator" />}
            {query && (
              <button
                onClick={() => setQuery('')}
                className="clear-search-btn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Mode Selector */}
          <div className="search-modes">
            {searchModes.map(mode => (
              <button
                key={mode.type}
                onClick={() => setSearchMode(mode.type)}
                className={`search-mode-btn ${searchMode === mode.type ? 'active' : ''}`}
                title={mode.description}
                disabled={mode.type !== 'traditional' && !enableAISearch}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="search-controls">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`control-btn ${showFilters ? 'active' : ''}`}
              title="Search Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="ai-suggestions">
            <div className="suggestions-header">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>AI Suggestions</span>
            </div>
            <div className="suggestions-list">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-btn"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Filters */}
        {showFilters && (
          <div className="search-filters">
            <div className="filter-section">
              <label>Tags</label>
              <div className="tag-filter">
                {availableTags.slice(0, 10).map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchFilter(prev => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter(t => t !== tag)
                          : [...prev.tags, tag]
                      }));
                    }}
                    className={`tag-filter-btn ${searchFilter.tags.includes(tag) ? 'active' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <label>Minimum Similarity: {Math.round(searchFilter.minSimilarity * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={searchFilter.minSimilarity}
                onChange={(e) => setSearchFilter(prev => ({
                  ...prev,
                  minSimilarity: parseFloat(e.target.value)
                }))}
                className="similarity-slider"
              />
            </div>

            <div className="filter-section">
              <label>Sort By</label>
              <select
                value={searchFilter.sortBy}
                onChange={(e) => setSearchFilter(prev => ({
                  ...prev,
                  sortBy: e.target.value as SearchFilter['sortBy']
                }))}
                className="sort-select"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="connections">Connections</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="search-results">
        {searchResults.length > 0 && (
          <div className="results-header">
            <span>{searchResults.length} results</span>
            {query.trim() && onCreateNewNote && (
              <button
                onClick={handleCreateNote}
                className="create-note-btn"
              >
                <Target className="w-3 h-3" />
                Create "{query}"
              </button>
            )}
          </div>
        )}

        <div className="results-list">
          {searchResults.map((result, index) => (
            <div
              key={`${result.note.id}-${index}`}
              className={`search-result-item ${selectedResult === result ? 'selected' : ''}`}
              onClick={() => handleResultClick(result)}
            >
              <div className="result-header">
                <div className="result-title">
                  <BookOpen className="w-4 h-4" />
                  <span>{result.note.title}</span>
                </div>
                <div className="result-meta">
                  <div 
                    className="match-type-badge"
                    style={{ backgroundColor: getMatchTypeColor(result.matchType) }}
                    title={result.matchType}
                  >
                    {getMatchTypeIcon(result.matchType)}
                  </div>
                  <div className="result-score">
                    {Math.round(result.score * 100)}%
                  </div>
                </div>
              </div>

              {result.snippet && (
                <div className="result-snippet">
                  {result.snippet}
                </div>
              )}

              {result.highlights.length > 0 && (
                <div className="result-highlights">
                  {result.highlights.map((highlight, i) => (
                    <span key={i} className="highlight-tag">
                      {highlight}
                    </span>
                  ))}
                </div>
              )}

              {result.reasoning && (
                <div className="result-reasoning">
                  {result.reasoning}
                </div>
              )}

              <div className="result-footer">
                <div className="result-tags">
                  {result.note.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="result-tag">
                      <Tag className="w-2 h-2" />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="result-date">
                  <Clock className="w-3 h-3" />
                  {new Date(result.note.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {query.trim() && !isSearching && searchResults.length === 0 && (
          <div className="no-results">
            <Target className="w-8 h-8 text-gray-400" />
            <p>No notes found for "{query}"</p>
            {onCreateNewNote && (
              <button
                onClick={handleCreateNote}
                className="create-note-btn create-note-btn--primary"
              >
                <Target className="w-4 h-4" />
                Create New Note
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!query.trim() && (
          <div className="empty-search-state">
            <Brain className="w-8 h-8 text-gray-400" />
            <p>Start typing to search intelligently...</p>
            <div className="search-tips">
              <div className="tip">
                <Search className="w-3 h-3" />
                <span>Traditional keyword search</span>
              </div>
              <div className="tip">
                <Brain className="w-3 h-3" />
                <span>AI-powered semantic search</span>
              </div>
              <div className="tip">
                <Network className="w-3 h-3" />
                <span>Intelligent connection discovery</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligentSearchInterface;