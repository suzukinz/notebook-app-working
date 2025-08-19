import React, { useState, useEffect, useCallback } from 'react';
// import type { ClassificationResult } from '../../services/aiService';
import { useAIClassification } from '../../hooks/useAI';
import { LoadingSpinner } from '../common/SuspenseWrapper';

interface SmartClassificationProps {
  title: string;
  content: string;
  currentTags: string[];
  currentCategory?: string;
  existingTags: string[];
  onTagsChange: (tags: string[]) => void;
  onCategoryChange: (category: string, subcategory?: string) => void;
  isVisible?: boolean;
  autoClassify?: boolean;
}

interface TagSuggestionProps {
  tag: string;
  confidence?: number;
  isExisting: boolean;
  isSelected: boolean;
  onToggle: (tag: string) => void;
}

const TagSuggestion: React.FC<TagSuggestionProps> = ({
  tag,
  confidence,
  isExisting,
  isSelected,
  onToggle
}) => {
  const getTagColor = () => {
    if (isSelected) return 'bg-blue-600 text-white border-blue-600';
    if (isExisting) return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
    return 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100';
  };

  return (
    <button
      onClick={() => onToggle(tag)}
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ${getTagColor()}`}
    >
      <span>{tag}</span>
      {confidence && (
        <span className="ml-1 text-xs opacity-75">
          {Math.round(confidence * 100)}%
        </span>
      )}
      {!isExisting && !isSelected && (
        <svg className="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      )}
      {isSelected && (
        <svg className="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};

const SmartClassification: React.FC<SmartClassificationProps> = ({
  title,
  content,
  currentTags,
  currentCategory,
  existingTags,
  onTagsChange,
  onCategoryChange,
  isVisible = true,
  autoClassify = true
}) => {
  const { classify, result, isLoading, error } = useAIClassification();
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [customTag, setCustomTag] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [lastClassifiedContent, setLastClassifiedContent] = useState('');

  // Auto-classify when content changes (debounced)
  useEffect(() => {
    if (!autoClassify || !isVisible) return;

    const contentToAnalyze = title + ' ' + content;
    if (contentToAnalyze.length < 30 || contentToAnalyze === lastClassifiedContent) return;

    const timeoutId = setTimeout(() => {
      setLastClassifiedContent(contentToAnalyze);
      classify(content, title, existingTags);
    }, 3000); // Wait 3 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [title, content, existingTags, autoClassify, isVisible, classify, lastClassifiedContent]);

  const handleManualClassify = useCallback(() => {
    if (title || content) {
      classify(content, title, existingTags);
    }
  }, [classify, content, title, existingTags]);

  const handleTagToggle = useCallback((tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    onTagsChange(newTags);
  }, [selectedTags, onTagsChange]);

  const handleCategorySelect = useCallback((category: string, subcategory?: string) => {
    onCategoryChange(category, subcategory);
  }, [onCategoryChange]);

  const handleAddCustomTag = useCallback(() => {
    const tag = customTag.trim();
    if (tag && !selectedTags.includes(tag)) {
      const newTags = [...selectedTags, tag];
      setSelectedTags(newTags);
      onTagsChange(newTags);
      setCustomTag('');
      setShowCustomInput(false);
    }
  }, [customTag, selectedTags, onTagsChange]);

  const handleApplyAllSuggestions = useCallback(() => {
    if (!result) return;

    // Apply category
    if (result.category) {
      handleCategorySelect(result.category, result.subcategory);
    }

    // Apply all suggested tags
    const newTags = [...new Set([...selectedTags, ...result.tags])];
    setSelectedTags(newTags);
    onTagsChange(newTags);
  }, [result, selectedTags, onTagsChange, handleCategorySelect]);

  if (!isVisible) return null;

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Smart Classification</h3>
          {result && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
              {Math.round(result.confidence * 100)}% confident
            </span>
          )}
        </div>
        
        <div className="flex space-x-2">
          {result && (
            <button
              onClick={handleApplyAllSuggestions}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Apply All
            </button>
          )}
          <button
            onClick={handleManualClassify}
            disabled={isLoading || (!title && !content)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center">
                <LoadingSpinner size="small" />
                <span className="ml-1">Classifying...</span>
              </div>
            ) : (
              'Classify'
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Category Suggestions */}
      {result?.category && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Category</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategorySelect(result.category, result.subcategory)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                currentCategory === result.category
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
              }`}
            >
              <span>{result.category}</span>
              {result.subcategory && (
                <span className="ml-1 text-xs opacity-75">/ {result.subcategory}</span>
              )}
            </button>
          </div>
          {result.reasoning && (
            <p className="mt-2 text-xs text-gray-600 italic">
              Reasoning: {result.reasoning}
            </p>
          )}
        </div>
      )}

      {/* Tag Management */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Tags</h4>
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add Custom Tag
          </button>
        </div>

        {/* Custom Tag Input */}
        {showCustomInput && (
          <div className="mb-3 flex space-x-2">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Enter custom tag..."
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
            />
            <button
              onClick={handleAddCustomTag}
              disabled={!customTag.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}

        {/* AI Suggested Tags */}
        {result?.tags && result.tags.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">AI Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {result.tags.map((tag: string) => (
                <TagSuggestion
                  key={tag}
                  tag={tag}
                  confidence={result.confidence}
                  isExisting={existingTags.includes(tag)}
                  isSelected={selectedTags.includes(tag)}
                  onToggle={handleTagToggle}
                />
              ))}
            </div>
          </div>
        )}

        {/* Existing Tags */}
        {existingTags.length > 0 && (
          <div>
            <p className="text-xs text-gray-600 mb-2">Available Tags:</p>
            <div className="flex flex-wrap gap-2">
              {existingTags
                .filter(tag => !result?.tags.includes(tag)) // Don't show already suggested tags
                .slice(0, 20) // Limit display
                .map(tag => (
                  <TagSuggestion
                    key={tag}
                    tag={tag}
                    isExisting={true}
                    isSelected={selectedTags.includes(tag)}
                    onToggle={handleTagToggle}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Currently Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Selected Tags ({selectedTags.length}):</p>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                >
                  {tag}
                  <button
                    onClick={() => handleTagToggle(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
            <span className="ml-2 text-sm text-gray-600">
              Analyzing content for smart classification...
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !result && !error && (title || content) && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-center">
          <p className="text-sm text-gray-600">
            Write some content and click "Classify" to get AI-powered suggestions.
          </p>
        </div>
      )}
    </div>
  );
};

export default SmartClassification;