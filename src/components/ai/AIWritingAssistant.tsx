import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EnhancementSuggestion } from '../../services/aiService';
import { useAIEnhancement } from '../../hooks/useAI';
import { LoadingSpinner } from '../common/SuspenseWrapper';

interface AIWritingAssistantProps {
  content: string;
  onContentChange: (newContent: string) => void;
  isVisible: boolean;
  onToggle: () => void;
}

interface SuggestionItemProps {
  suggestion: EnhancementSuggestion;
  onApply: () => void;
  onDismiss: () => void;
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, onApply, onDismiss }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'grammar': return 'bg-red-100 text-red-800 border-red-200';
      case 'style': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'structure': return 'bg-green-100 text-green-800 border-green-200';
      case 'content': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'style':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
        );
      case 'structure':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13V12a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        );
      case 'content':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getTypeColor(suggestion.type)}`}>
            {getTypeIcon(suggestion.type)}
            <span className="ml-1 capitalize">{suggestion.type}</span>
          </span>
          <span className="text-xs text-gray-500">
            Confidence: {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={onApply}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-700 mb-3">{suggestion.suggestion}</p>
      
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium text-red-600">Original:</span>
          <p className="text-sm bg-red-50 p-2 rounded border-l-4 border-red-200 italic">
            "{suggestion.original}"
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-green-600">Improved:</span>
          <p className="text-sm bg-green-50 p-2 rounded border-l-4 border-green-200 font-medium">
            "{suggestion.improved}"
          </p>
        </div>
      </div>
      
      {suggestion.explanation && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-600">{suggestion.explanation}</p>
        </div>
      )}
    </div>
  );
};

const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({
  content,
  onContentChange,
  isVisible,
  onToggle
}) => {
  const { enhance, suggestions, isLoading, error, applySuggestion } = useAIEnhancement();
  const [enhancementType, setEnhancementType] = useState<'grammar' | 'style' | 'structure' | 'all'>('all');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const lastAnalyzedContent = useRef<string>('');
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-analyze content changes (debounced)
  useEffect(() => {
    if (!isVisible || content === lastAnalyzedContent.current || content.length < 50) {
      return;
    }

    // Clear existing timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Set new timeout for analysis
    analysisTimeoutRef.current = setTimeout(() => {
      lastAnalyzedContent.current = content;
      enhance(content, enhancementType);
    }, 2000); // Wait 2 seconds after user stops typing

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [content, enhancementType, enhance, isVisible]);

  const handleManualAnalysis = useCallback(() => {
    if (content.trim()) {
      enhance(content, enhancementType);
    }
  }, [content, enhancementType, enhance]);

  const handleApplySuggestion = useCallback((suggestion: EnhancementSuggestion) => {
    const newContent = applySuggestion(content, suggestion);
    onContentChange(newContent);
    
    // Remove applied suggestion from the list
    setDismissedSuggestions(prev => new Set([...prev, suggestion.original]));
  }, [content, onContentChange, applySuggestion]);

  const handleDismissSuggestion = useCallback((suggestion: EnhancementSuggestion) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestion.original]));
  }, []);

  const handleApplyAllSuggestions = useCallback(() => {
    const activeSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.original));
    let newContent = content;
    
    // Apply all suggestions in sequence
    activeSuggestions.forEach(suggestion => {
      newContent = applySuggestion(newContent, suggestion);
    });
    
    onContentChange(newContent);
    setDismissedSuggestions(new Set(suggestions.map(s => s.original)));
  }, [suggestions, dismissedSuggestions, content, onContentChange, applySuggestion]);

  const activeSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.original));

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 bottom-20 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors z-40"
        title="Open AI Writing Assistant"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
        {activeSuggestions.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeSuggestions.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 w-96 bg-white border rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
          <h3 className="font-semibold">AI Writing Assistant</h3>
          {activeSuggestions.length > 0 && (
            <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
              {activeSuggestions.length} suggestions
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Analysis Type:</label>
          <select
            value={enhancementType}
            onChange={(e) => setEnhancementType(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Issues</option>
            <option value="grammar">Grammar</option>
            <option value="style">Style</option>
            <option value="structure">Structure</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleManualAnalysis}
            disabled={isLoading || !content.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="small" />
                <span className="ml-2">Analyzing...</span>
              </div>
            ) : (
              'Analyze Now'
            )}
          </button>
          
          {activeSuggestions.length > 0 && (
            <button
              onClick={handleApplyAllSuggestions}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
            >
              Apply All
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="p-4 text-center">
            <LoadingSpinner />
            <p className="text-sm text-gray-600 mt-2">Analyzing your content...</p>
          </div>
        )}

        {!isLoading && !error && activeSuggestions.length === 0 && suggestions.length > 0 && (
          <div className="p-4 text-center">
            <svg className="w-12 h-12 mx-auto text-green-500 mb-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-gray-600">All suggestions have been applied or dismissed!</p>
          </div>
        )}

        {!isLoading && !error && activeSuggestions.length === 0 && suggestions.length === 0 && content.length > 50 && (
          <div className="p-4 text-center">
            <svg className="w-12 h-12 mx-auto text-green-500 mb-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-gray-600">Your content looks great! No suggestions at the moment.</p>
          </div>
        )}

        {activeSuggestions.length > 0 && (
          <div className="p-4 space-y-3">
            {activeSuggestions.map((suggestion, index) => (
              <SuggestionItem
                key={`${suggestion.original}-${index}`}
                suggestion={suggestion}
                onApply={() => handleApplySuggestion(suggestion)}
                onDismiss={() => handleDismissSuggestion(suggestion)}
              />
            ))}
          </div>
        )}

        {!isLoading && !error && content.length < 50 && (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Write at least 50 characters to get AI suggestions.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIWritingAssistant;