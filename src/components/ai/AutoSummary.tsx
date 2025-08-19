import React, { useState, useCallback, useEffect } from 'react';
import type { SummaryResult } from '../../services/aiService';
import { useAISummary } from '../../hooks/useAI';
import { LoadingSpinner } from '../common/SuspenseWrapper';

interface AutoSummaryProps {
  content: string;
  title: string;
  onSummaryGenerated?: (summary: SummaryResult) => void;
  onSummarySave?: (summary: string, keyPoints: string[]) => void;
  isVisible?: boolean;
  minContentLength?: number;
}

interface SummaryLengthOption {
  value: 'brief' | 'medium' | 'detailed';
  label: string;
  description: string;
  wordTarget: string;
}

const summaryLengthOptions: SummaryLengthOption[] = [
  {
    value: 'brief',
    label: 'Brief',
    description: 'Quick overview',
    wordTarget: '~100 words'
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Balanced summary',
    wordTarget: '~200 words'
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive summary',
    wordTarget: '~400 words'
  }
];

const AutoSummary: React.FC<AutoSummaryProps> = ({
  content,
  onSummaryGenerated,
  onSummarySave,
  isVisible = true,
  minContentLength = 200
}) => {
  const { summarize, summary, isLoading, error } = useAISummary();
  const [selectedLength, setSelectedLength] = useState<'brief' | 'medium' | 'detailed'>('medium');
  const [editableSummary, setEditableSummary] = useState('');
  const [editableKeyPoints, setEditableKeyPoints] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSummaries, setSavedSummaries] = useState<Record<string, SummaryResult>>({});

  // Update editable content when summary changes
  useEffect(() => {
    if (summary) {
      setEditableSummary(summary.summary);
      setEditableKeyPoints([...summary.keyPoints]);
      onSummaryGenerated?.(summary);
    }
  }, [summary, onSummaryGenerated]);

  const handleSummarize = useCallback(async () => {
    if (content.length < minContentLength) return;
    
    const result = await summarize(content, selectedLength);
    if (result) {
      setSavedSummaries(prev => ({
        ...prev,
        [selectedLength]: result
      }));
    }
  }, [content, selectedLength, summarize, minContentLength]);

  const handleSave = useCallback(() => {
    if (editableSummary && editableKeyPoints.length > 0) {
      onSummarySave?.(editableSummary, editableKeyPoints);
      setIsEditing(false);
    }
  }, [editableSummary, editableKeyPoints, onSummarySave]);

  const handleKeyPointChange = useCallback((index: number, value: string) => {
    const newKeyPoints = [...editableKeyPoints];
    newKeyPoints[index] = value;
    setEditableKeyPoints(newKeyPoints);
  }, [editableKeyPoints]);

  const handleAddKeyPoint = useCallback(() => {
    setEditableKeyPoints([...editableKeyPoints, '']);
  }, [editableKeyPoints]);

  const handleRemoveKeyPoint = useCallback((index: number) => {
    const newKeyPoints = editableKeyPoints.filter((_, i) => i !== index);
    setEditableKeyPoints(newKeyPoints);
  }, [editableKeyPoints]);

  const handleLengthChange = useCallback((newLength: 'brief' | 'medium' | 'detailed') => {
    setSelectedLength(newLength);
    
    // Use cached summary if available
    const cachedSummary = savedSummaries[newLength];
    if (cachedSummary) {
      setEditableSummary(cachedSummary.summary);
      setEditableKeyPoints([...cachedSummary.keyPoints]);
    }
  }, [savedSummaries]);

  const getProgressColor = (reduction: number) => {
    if (reduction >= 80) return 'text-green-600';
    if (reduction >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isContentTooShort = content.length < minContentLength;

  if (!isVisible) return null;

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="font-semibold text-gray-900">Auto Summary</h3>
          {summary && (
            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs">
              {summary.wordCount.reduction}% reduction
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {summary && onSummarySave && (
            <button
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              {isEditing ? 'Save' : 'Edit'}
            </button>
          )}
          
          <button
            onClick={handleSummarize}
            disabled={isLoading || isContentTooShort}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center">
                <LoadingSpinner size="small" />
                <span className="ml-1">Summarizing...</span>
              </div>
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>

      {/* Length Selection */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Summary Length:</p>
        <div className="grid grid-cols-3 gap-2">
          {summaryLengthOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleLengthChange(option.value)}
              disabled={isLoading}
              className={`p-3 text-left border rounded-lg transition-colors ${
                selectedLength === option.value
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-gray-600">{option.description}</div>
              <div className="text-xs text-gray-500">{option.wordTarget}</div>
              {savedSummaries[option.value] && (
                <div className="text-xs text-green-600 mt-1">✓ Generated</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Content Too Short Warning */}
      {isContentTooShort && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Content too short for meaningful summarization. Please write at least {minContentLength} characters.
            <span className="text-xs text-yellow-600 block mt-1">
              Current: {content.length} characters
            </span>
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
            <span className="ml-2 text-sm text-gray-600">
              Generating {selectedLength} summary...
            </span>
          </div>
        </div>
      )}

      {/* Summary Results */}
      {summary && !isLoading && (
        <div className="space-y-4">
          {/* Word Count Statistics */}
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Summary Statistics</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Original:</span>
                <span className="ml-1 font-medium">{summary.wordCount.original.toLocaleString()} words</span>
              </div>
              <div>
                <span className="text-gray-600">Summary:</span>
                <span className="ml-1 font-medium">{summary.wordCount.summary.toLocaleString()} words</span>
              </div>
              <div>
                <span className="text-gray-600">Reduction:</span>
                <span className={`ml-1 font-medium ${getProgressColor(summary.wordCount.reduction)}`}>
                  {summary.wordCount.reduction}%
                </span>
              </div>
            </div>
          </div>

          {/* Summary Content */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
            {isEditing ? (
              <textarea
                value={editableSummary}
                onChange={(e) => setEditableSummary(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-sm leading-relaxed resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={6}
                placeholder="Edit summary..."
              />
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-800 leading-relaxed">{editableSummary}</p>
              </div>
            )}
          </div>

          {/* Key Points */}
          {editableKeyPoints.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Key Points</h4>
                {isEditing && (
                  <button
                    onClick={handleAddKeyPoint}
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    + Add Point
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {editableKeyPoints.map((point, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-800 rounded-full text-xs flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    {isEditing ? (
                      <div className="flex-1 flex space-x-2">
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => handleKeyPointChange(index, e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="Enter key point..."
                        />
                        <button
                          onClick={() => handleRemoveKeyPoint(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <p className="flex-1 text-sm text-gray-800">{point}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {isEditing && (
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (summary) {
                    setEditableSummary(summary.summary);
                    setEditableKeyPoints([...summary.keyPoints]);
                  }
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!editableSummary.trim()}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !summary && !error && !isContentTooShort && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-600 mb-2">Ready to generate summary</p>
          <p className="text-xs text-gray-500">
            Click "Generate" to create an AI-powered summary of your content.
          </p>
        </div>
      )}
    </div>
  );
};

export default AutoSummary;