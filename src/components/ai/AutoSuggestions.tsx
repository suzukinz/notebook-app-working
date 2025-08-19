import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLightweightAI } from '../../services/ai/LightweightAIService';
import { debounce } from 'lodash';
import './AutoSuggestions.css';

interface Suggestion {
  id: string;
  type: 'completion' | 'improvement' | 'tag' | 'related';
  text: string;
  confidence: number;
  context?: string;
  action?: () => void;
}

interface AutoSuggestionsProps {
  content: string;
  cursorPosition?: number;
  selectedText?: string;
  onApplySuggestion?: (suggestion: Suggestion) => void;
  onInsertText?: (text: string, position?: number) => void;
  onAddTag?: (tag: string) => void;
  isEnabled?: boolean;
  maxSuggestions?: number;
  enabledTypes?: Suggestion['type'][];
  position?: 'inline' | 'sidebar' | 'floating';
}

export const AutoSuggestions: React.FC<AutoSuggestionsProps> = ({
  content,
  cursorPosition = 0,
  selectedText,
  onApplySuggestion,
  onInsertText,
  onAddTag,
  isEnabled = true,
  maxSuggestions = 5,
  enabledTypes = ['completion', 'improvement', 'tag'],
  position = 'floating'
}) => {
  const ai = useLightweightAI();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate text completion suggestions
  const generateCompletions = useCallback(async (text: string, position: number): Promise<Suggestion[]> => {
    if (!enabledTypes.includes('completion') || text.length < 10) return [];

    try {
      // Get the context around cursor position
      const beforeCursor = text.slice(Math.max(0, position - 100), position);
      // const afterCursor = text.slice(position, position + 50);
      
      // Find if we're in the middle of a sentence
      const currentSentence = beforeCursor.split(/[.!?]+/).pop()?.trim() || '';
      
      if (currentSentence.length < 3) return [];

      // Use AI to suggest completions
      const prompt = `Continue this text naturally:\n\n"${currentSentence.slice(-50)}"\n\nProvide 2-3 short, natural continuations (each under 20 words):`;
      
      const response = await ai.improve(prompt, 'clarity');
      
      // Parse completions from response
      const completions = response.improved
        .split('\n')
        .filter(line => line.trim() && !line.includes(':'))
        .slice(0, 3)
        .map((completion, index) => ({
          id: `completion-${index}`,
          type: 'completion' as const,
          text: completion.trim(),
          confidence: 0.8 - (index * 0.1),
          context: 'Text completion'
        }));

      return completions;
    } catch (error) {
      console.warn('Completion generation failed:', error);
      return [];
    }
  }, [ai, enabledTypes]);

  // Generate improvement suggestions
  const generateImprovements = useCallback(async (_text: string): Promise<Suggestion[]> => {
    if (!enabledTypes.includes('improvement') || !selectedText) return [];

    try {
      const improvements = await Promise.all([
        ai.improve(selectedText, 'grammar'),
        ai.improve(selectedText, 'clarity'),
        ai.improve(selectedText, 'tone')
      ]);

      return improvements
        .filter(improvement => improvement.improved !== selectedText)
        .map((improvement, index) => {
          const types = ['grammar', 'clarity', 'tone'];
          return {
            id: `improvement-${index}`,
            type: 'improvement' as const,
            text: improvement.improved,
            confidence: 0.9 - (index * 0.1),
            context: `${types[index]} improvement`,
            action: () => {
              if (onInsertText) {
                onInsertText(improvement.improved, cursorPosition - selectedText.length);
              }
            }
          };
        });
    } catch (error) {
      console.warn('Improvement generation failed:', error);
      return [];
    }
  }, [ai, enabledTypes, selectedText, onInsertText, cursorPosition]);

  // Generate tag suggestions
  const generateTagSuggestions = useCallback(async (text: string): Promise<Suggestion[]> => {
    if (!enabledTypes.includes('tag') || text.length < 50) return [];

    try {
      const tags = await ai.generateTags(text, 3);
      
      return tags.map((tag, index) => ({
        id: `tag-${index}`,
        type: 'tag' as const,
        text: `#${tag}`,
        confidence: 0.8 - (index * 0.1),
        context: 'Auto-generated tag',
        action: () => {
          if (onAddTag) {
            onAddTag(tag);
          }
        }
      }));
    } catch (error) {
      console.warn('Tag generation failed:', error);
      return [];
    }
  }, [ai, enabledTypes, onAddTag]);

  // Generate related content suggestions
  const generateRelatedSuggestions = useCallback(async (text: string): Promise<Suggestion[]> => {
    if (!enabledTypes.includes('related') || text.length < 100) return [];

    try {
      // Extract key concepts from the text
      const classification = await ai.classify(text, ['question', 'idea', 'task', 'note']);
      
      const suggestions: Suggestion[] = [];
      
      // Suggest related questions or follow-ups
      if (classification.category === 'idea') {
        suggestions.push({
          id: 'related-questions',
          type: 'related',
          text: 'Add implementation steps',
          confidence: 0.7,
          context: 'Related content',
          action: () => {
            if (onInsertText) {
              onInsertText('\n\n## Implementation Steps\n1. \n2. \n3. ');
            }
          }
        });
      }
      
      if (classification.category === 'question') {
        suggestions.push({
          id: 'related-answer',
          type: 'related',
          text: 'Add answer section',
          confidence: 0.7,
          context: 'Related content',
          action: () => {
            if (onInsertText) {
              onInsertText('\n\n## Answer\n');
            }
          }
        });
      }

      return suggestions;
    } catch (error) {
      console.warn('Related suggestions generation failed:', error);
      return [];
    }
  }, [ai, enabledTypes, onInsertText]);

  // Generate all suggestions
  const generateSuggestions = useCallback(async () => {
    if (!isEnabled || !content.trim()) {
      setSuggestions([]);
      return;
    }

    // Avoid re-analyzing the same content
    if (content === lastAnalyzedContent) return;
    setLastAnalyzedContent(content);

    setIsLoading(true);
    
    try {
      const [completions, improvements, tags, related] = await Promise.all([
        generateCompletions(content, cursorPosition),
        generateImprovements(content),
        generateTagSuggestions(content),
        generateRelatedSuggestions(content)
      ]);

      const allSuggestions = [...completions, ...improvements, ...tags, ...related]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxSuggestions);

      setSuggestions(allSuggestions);
      setIsVisible(allSuggestions.length > 0);
    } catch (error) {
      console.error('Suggestion generation failed:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [content, cursorPosition, lastAnalyzedContent, isEnabled, maxSuggestions, generateCompletions, generateImprovements, generateTagSuggestions, generateRelatedSuggestions]);

  // Debounced suggestion generation
  const debouncedGenerateSuggestions = useCallback(
    debounce(generateSuggestions, 1000),
    [generateSuggestions]
  );

  // Effect to trigger suggestion generation
  useEffect(() => {
    if (content.trim()) {
      debouncedGenerateSuggestions();
    } else {
      setSuggestions([]);
      setIsVisible(false);
    }
  }, [content, selectedText, debouncedGenerateSuggestions]);

  // Handle suggestion application
  const applySuggestion = useCallback((suggestion: Suggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
    
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
    }
    
    // Hide suggestions after applying
    setIsVisible(false);
    setActiveIndex(-1);
  }, [onApplySuggestion]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex(prev => prev <= 0 ? suggestions.length - 1 : prev - 1);
          break;
        case 'Enter':
          if (activeIndex >= 0 && suggestions[activeIndex]) {
            event.preventDefault();
            applySuggestion(suggestions[activeIndex]!);
          }
          break;
        case 'Escape':
          setIsVisible(false);
          setActiveIndex(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, suggestions, activeIndex, applySuggestion]);

  // Get suggestion type icon
  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'completion': return '📝';
      case 'improvement': return '✨';
      case 'tag': return '🏷️';
      case 'related': return '🔗';
      default: return '💡';
    }
  };

  // Get suggestion type color
  const getSuggestionColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'completion': return '#667eea';
      case 'improvement': return '#48bb78';
      case 'tag': return '#f6ad55';
      case 'related': return '#4fd1c7';
      default: return '#a0aec0';
    }
  };

  if (!isEnabled || (!isVisible && !isLoading)) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`auto-suggestions auto-suggestions--${position}`}
    >
      {isLoading && (
        <div className="suggestions-loading">
          <div className="loading-spinner"></div>
          <span>Analyzing content...</span>
        </div>
      )}

      {isVisible && suggestions.length > 0 && (
        <div className="suggestions-container">
          <div className="suggestions-header">
            <h4>AI Suggestions</h4>
            <button 
              className="close-suggestions"
              onClick={() => setIsVisible(false)}
              title="Close suggestions"
            >
              ✕
            </button>
          </div>
          
          <div className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`suggestion-item ${
                  index === activeIndex ? 'suggestion-item--active' : ''
                }`}
                onClick={() => applySuggestion(suggestion)}
                style={{ 
                  borderLeftColor: getSuggestionColor(suggestion.type) 
                }}
              >
                <div className="suggestion-header">
                  <div className="suggestion-type">
                    <span className="suggestion-icon">
                      {getSuggestionIcon(suggestion.type)}
                    </span>
                    <span className="suggestion-context">
                      {suggestion.context}
                    </span>
                  </div>
                  <div className="suggestion-confidence">
                    {Math.round(suggestion.confidence * 100)}%
                  </div>
                </div>
                
                <div className="suggestion-content">
                  {suggestion.text}
                </div>
              </div>
            ))}
          </div>
          
          <div className="suggestions-footer">
            <div className="keyboard-hint">
              <kbd>↑</kbd><kbd>↓</kbd> Navigate • <kbd>Enter</kbd> Apply • <kbd>Esc</kbd> Close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoSuggestions;