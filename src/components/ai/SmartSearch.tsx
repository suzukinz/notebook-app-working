import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLightweightAI } from '../../services/ai/LightweightAIService';
import { debounce } from 'lodash';
import './SmartSearch.css';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResult {
  note: Note;
  score: number;
  highlights: string[];
  relevanceType: 'semantic' | 'keyword' | 'tag' | 'hybrid';
}

interface SmartSearchProps {
  notes: Note[];
  onSelectNote?: (note: Note) => void;
  placeholder?: string;
  maxResults?: number;
  enableSemanticSearch?: boolean;
  position?: 'top' | 'sidebar' | 'modal';
}

export const SmartSearch: React.FC<SmartSearchProps> = ({
  notes,
  onSelectNote,
  placeholder = "Search notes with AI...",
  maxResults = 10,
  enableSemanticSearch = true,
  position = 'top'
}) => {
  const ai = useLightweightAI();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'smart' | 'keyword' | 'semantic'>('smart');
  const [isExpanded, setIsExpanded] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to recent searches
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)]
      .slice(0, 10); // Keep only 10 recent searches
    
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Keyword-based search
  const keywordSearch = useCallback((searchQuery: string): SearchResult[] => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    
    notes.forEach(note => {
      let score = 0;
      const highlights: string[] = [];
      
      // Title match (highest weight)
      if (note.title.toLowerCase().includes(query)) {
        score += 100;
        highlights.push(note.title);
      }
      
      // Content match
      const contentMatches = note.content.toLowerCase().match(new RegExp(query, 'g'));
      if (contentMatches) {
        score += contentMatches.length * 10;
        // Extract context around matches
        const sentences = note.content.split(/[.!?]+/);
        sentences.forEach(sentence => {
          if (sentence.toLowerCase().includes(query)) {
            highlights.push(sentence.trim());
          }
        });
      }
      
      // Tag match
      note.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          score += 50;
          highlights.push(`#${tag}`);
        }
      });
      
      if (score > 0) {
        results.push({
          note,
          score,
          highlights: highlights.slice(0, 3), // Limit highlights
          relevanceType: 'keyword'
        });
      }
    });
    
    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }, [notes, maxResults]);

  // Semantic search using AI
  const semanticSearch = useCallback(async (searchQuery: string): Promise<SearchResult[]> => {
    if (!enableSemanticSearch || !searchQuery.trim()) return [];
    
    try {
      const documents = notes.map(note => ({
        id: note.id,
        content: `${note.title}\n\n${note.content}\n\nTags: ${note.tags.join(', ')}`
      }));
      
      const similarDocs = await ai.searchSimilar(searchQuery, documents);
      
      return similarDocs.map(doc => {
        const note = notes.find(n => n.id === doc.id)!;
        return {
          note,
          score: Math.round(doc.score * 100),
          highlights: [note.title],
          relevanceType: 'semantic' as const
        };
      }).slice(0, maxResults);
    } catch (error) {
      console.warn('Semantic search failed:', error);
      return [];
    }
  }, [ai, notes, maxResults, enableSemanticSearch]);

  // Hybrid search combining keyword and semantic
  const hybridSearch = useCallback(async (searchQuery: string): Promise<SearchResult[]> => {
    const [keywordResults, semanticResults] = await Promise.all([
      keywordSearch(searchQuery),
      semanticSearch(searchQuery)
    ]);
    
    // Merge and deduplicate results
    const mergedMap = new Map<string, SearchResult>();
    
    // Add keyword results
    keywordResults.forEach(result => {
      mergedMap.set(result.note.id, result);
    });
    
    // Add or merge semantic results
    semanticResults.forEach(result => {
      const existing = mergedMap.get(result.note.id);
      if (existing) {
        // Combine scores and mark as hybrid
        existing.score = Math.max(existing.score, result.score);
        existing.relevanceType = 'hybrid';
        existing.highlights = [...existing.highlights, ...result.highlights]
          .slice(0, 3); // Limit highlights
      } else {
        mergedMap.set(result.note.id, result);
      }
    });
    
    return Array.from(mergedMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }, [keywordSearch, semanticSearch, maxResults]);

  // Main search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      let searchResults: SearchResult[] = [];
      
      switch (searchMode) {
        case 'keyword':
          searchResults = keywordSearch(searchQuery);
          break;
        case 'semantic':
          searchResults = await semanticSearch(searchQuery);
          break;
        case 'smart':
        default:
          searchResults = await hybridSearch(searchQuery);
          break;
      }
      
      setResults(searchResults);
      saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchMode, keywordSearch, semanticSearch, hybridSearch]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  );

  // Handle query change
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setIsExpanded(true);
      debouncedSearch(value);
    } else {
      setResults([]);
      setIsExpanded(false);
    }
  };

  // Handle note selection
  const handleNoteSelect = (note: Note) => {
    if (onSelectNote) {
      onSelectNote(note);
    }
    setQuery('');
    setResults([]);
    setIsExpanded(false);
  };

  // Handle recent search selection
  const handleRecentSearchSelect = (recentQuery: string) => {
    setQuery(recentQuery);
    performSearch(recentQuery);
    setIsExpanded(true);
  };

  // Get relevance type icon
  const getRelevanceIcon = (type: SearchResult['relevanceType']) => {
    switch (type) {
      case 'semantic': return '🧠';
      case 'keyword': return '🔍';
      case 'tag': return '🏷️';
      case 'hybrid': return '⚡';
      default: return '📄';
    }
  };

  // Highlight text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  return (
    <div className={`smart-search smart-search--${position}`}>
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="search-input"
            onFocus={() => setIsExpanded(true)}
          />
          
          <div className="search-controls">
            <button
              className={`search-mode-btn ${
                searchMode === 'smart' ? 'search-mode-btn--active' : ''
              }`}
              onClick={() => setSearchMode('smart')}
              title="Smart Search (Hybrid)"
            >
              ⚡
            </button>
            <button
              className={`search-mode-btn ${
                searchMode === 'keyword' ? 'search-mode-btn--active' : ''
              }`}
              onClick={() => setSearchMode('keyword')}
              title="Keyword Search"
            >
              🔍
            </button>
            {enableSemanticSearch && (
              <button
                className={`search-mode-btn ${
                  searchMode === 'semantic' ? 'search-mode-btn--active' : ''
                }`}
                onClick={() => setSearchMode('semantic')}
                title="Semantic Search (AI)"
              >
                🧠
              </button>
            )}
            
            {isSearching && (
              <div className="search-spinner"></div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="search-results-container">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="recent-searches">
              <h4 className="recent-searches-title">Recent Searches</h4>
              <div className="recent-searches-list">
                {recentSearches.map((recentQuery, index) => (
                  <button
                    key={index}
                    className="recent-search-item"
                    onClick={() => handleRecentSearchSelect(recentQuery)}
                  >
                    🕐 {recentQuery}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="search-results">
              <div className="search-results-header">
                <span className="results-count">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
                <span className="search-mode-indicator">
                  {searchMode === 'smart' ? 'Smart Search' :
                   searchMode === 'semantic' ? 'AI Search' : 'Keyword Search'}
                </span>
              </div>
              
              <div className="search-results-list">
                {results.map((result) => (
                  <div
                    key={result.note.id}
                    className="search-result-item"
                    onClick={() => handleNoteSelect(result.note)}
                  >
                    <div className="result-header">
                      <div className="result-title">
                        <span 
                          dangerouslySetInnerHTML={{ 
                            __html: highlightText(result.note.title, query) 
                          }}
                        />
                      </div>
                      <div className="result-meta">
                        <span className="relevance-type" title={result.relevanceType}>
                          {getRelevanceIcon(result.relevanceType)}
                        </span>
                        <span className="result-score">
                          {result.score}%
                        </span>
                      </div>
                    </div>
                    
                    {result.highlights.length > 0 && (
                      <div className="result-highlights">
                        {result.highlights.map((highlight, index) => (
                          <div 
                            key={index} 
                            className="highlight"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightText(highlight, query) 
                            }}
                          />
                        ))}
                      </div>
                    )}
                    
                    {result.note.tags.length > 0 && (
                      <div className="result-tags">
                        {result.note.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="result-tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {query && !isSearching && results.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-text">
                No notes found for "<strong>{query}</strong>"
              </div>
              <div className="no-results-suggestions">
                <p>Try:</p>
                <ul>
                  <li>Different keywords</li>
                  <li>Switching search modes</li>
                  <li>Checking spelling</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="search-overlay"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default SmartSearch;