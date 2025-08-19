import React, { useState, useCallback, useEffect } from 'react';
import { useLightweightAI } from '../../services/ai/LightweightAIService';
import './AIAssistantPanel.css';

interface AIAssistantPanelProps {
  selectedText?: string;
  noteContent?: string;
  onInsertText?: (text: string) => void;
  onApplyTags?: (tags: string[]) => void;
  position?: 'sidebar' | 'floating' | 'bottom';
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  selectedText,
  noteContent,
  onInsertText,
  onApplyTags,
  position = 'sidebar'
}) => {
  const ai = useLightweightAI();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setActiveFeature] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);

  // Check AI status on mount
  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const status = await ai.getStatus();
      setAiStatus(status);
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  // Auto-generate tags when note content changes
  const handleAutoTag = useCallback(async () => {
    if (!noteContent || isProcessing) return;
    
    setIsProcessing(true);
    setActiveFeature('tags');
    
    try {
      const tags = await ai.generateTags(noteContent, 5);
      setResult({ tags });
      if (onApplyTags) {
        onApplyTags(tags);
      }
    } catch (error) {
      console.error('Tag generation failed:', error);
      setResult({ error: 'Failed to generate tags' });
    } finally {
      setIsProcessing(false);
    }
  }, [noteContent, ai, onApplyTags, isProcessing]);

  // Summarize selected text or entire note
  const handleSummarize = useCallback(async (level: 'brief' | 'medium' | 'detailed') => {
    const textToSummarize = selectedText || noteContent;
    if (!textToSummarize || isProcessing) return;
    
    setIsProcessing(true);
    setActiveFeature('summarize');
    
    try {
      const summary = await ai.summarize(textToSummarize, level);
      setResult(summary);
    } catch (error) {
      console.error('Summarization failed:', error);
      setResult({ error: 'Failed to summarize text' });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedText, noteContent, ai, isProcessing]);

  // Improve selected text
  const handleImprove = useCallback(async (type: 'grammar' | 'clarity' | 'tone') => {
    const textToImprove = selectedText || noteContent;
    if (!textToImprove || isProcessing) return;
    
    setIsProcessing(true);
    setActiveFeature('improve');
    
    try {
      const improvement = await ai.improve(textToImprove, type);
      setResult(improvement);
    } catch (error) {
      console.error('Improvement failed:', error);
      setResult({ error: 'Failed to improve text' });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedText, noteContent, ai, isProcessing]);

  // Classify note content
  const handleClassify = useCallback(async () => {
    if (!noteContent || isProcessing) return;
    
    setIsProcessing(true);
    setActiveFeature('classify');
    
    try {
      const categories = ['Work', 'Personal', 'Ideas', 'Meeting', 'Task', 'Reference'];
      const classification = await ai.classify(noteContent, categories);
      setResult(classification);
    } catch (error) {
      console.error('Classification failed:', error);
      setResult({ error: 'Failed to classify note' });
    } finally {
      setIsProcessing(false);
    }
  }, [noteContent, ai, isProcessing]);

  // Apply improvement to editor
  const applyImprovement = () => {
    if (result?.improved && onInsertText) {
      onInsertText(result.improved);
      setResult(null);
    }
  };

  // Apply summary to editor
  const applySummary = () => {
    if (result?.summary && onInsertText) {
      onInsertText(`\n\n## Summary\n${result.summary}`);
      setResult(null);
    }
  };

  return (
    <div className={`ai-assistant-panel ai-assistant-panel--${position}`}>
      <div className="ai-assistant-header">
        <h3>AI Assistant</h3>
        <div className="ai-status">
          {aiStatus?.ollama ? (
            <span className="status-indicator status-indicator--online">●</span>
          ) : (
            <span className="status-indicator status-indicator--offline">●</span>
          )}
          <span className="status-text">
            {aiStatus?.ollama ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="ai-assistant-features">
        {/* Quick Actions */}
        <div className="feature-section">
          <h4>Quick Actions</h4>
          <div className="action-buttons">
            <button
              onClick={handleAutoTag}
              disabled={!noteContent || isProcessing}
              className="action-btn action-btn--tags"
            >
              🏷️ Auto-Tag
            </button>
            <button
              onClick={handleClassify}
              disabled={!noteContent || isProcessing}
              className="action-btn action-btn--classify"
            >
              📁 Classify
            </button>
          </div>
        </div>

        {/* Text Improvement */}
        <div className="feature-section">
          <h4>Improve Text</h4>
          <div className="action-buttons">
            <button
              onClick={() => handleImprove('grammar')}
              disabled={!selectedText && !noteContent || isProcessing}
              className="action-btn action-btn--grammar"
            >
              ✏️ Grammar
            </button>
            <button
              onClick={() => handleImprove('clarity')}
              disabled={!selectedText && !noteContent || isProcessing}
              className="action-btn action-btn--clarity"
            >
              💡 Clarity
            </button>
            <button
              onClick={() => handleImprove('tone')}
              disabled={!selectedText && !noteContent || isProcessing}
              className="action-btn action-btn--tone"
            >
              🎯 Tone
            </button>
          </div>
        </div>

        {/* Summarization */}
        <div className="feature-section">
          <h4>Summarize</h4>
          <div className="action-buttons">
            <button
              onClick={() => handleSummarize('brief')}
              disabled={!selectedText && !noteContent || isProcessing}
              className="action-btn action-btn--brief"
            >
              📄 Brief
            </button>
            <button
              onClick={() => handleSummarize('medium')}
              disabled={!selectedText && !noteContent || isProcessing}
              className="action-btn action-btn--medium"
            >
              📋 Medium
            </button>
            <button
              onClick={() => handleSummarize('detailed')}
              disabled={!selectedText && !noteContent || isProcessing}
              className="action-btn action-btn--detailed"
            >
              📚 Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      {result && (
        <div className="ai-assistant-results">
          <div className="results-header">
            <h4>Results</h4>
            <button
              onClick={() => setResult(null)}
              className="close-btn"
            >
              ✕
            </button>
          </div>
          
          <div className="results-content">
            {/* Tags Result */}
            {result.tags && (
              <div className="result-tags">
                <div className="tags-list">
                  {result.tags.map((tag: string, index: number) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Classification Result */}
            {result.category && (
              <div className="result-classification">
                <div className="classification-badge">
                  <span className="category">{result.category}</span>
                  <span className="confidence">
                    {Math.round(result.confidence * 100)}% confident
                  </span>
                </div>
                {result.reasoning && (
                  <p className="reasoning">{result.reasoning}</p>
                )}
              </div>
            )}

            {/* Summary Result */}
            {result.summary && (
              <div className="result-summary">
                <div className="summary-text">{result.summary}</div>
                {result.keyPoints && result.keyPoints.length > 0 && (
                  <div className="key-points">
                    <h5>Key Points:</h5>
                    <ul>
                      {result.keyPoints.map((point: string, index: number) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="summary-stats">
                  <span>{result.wordCount} words</span>
                </div>
                <button
                  onClick={applySummary}
                  className="apply-btn"
                >
                  Insert Summary
                </button>
              </div>
            )}

            {/* Improvement Result */}
            {result.improved && (
              <div className="result-improvement">
                <div className="improved-text">{result.improved}</div>
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="suggestions">
                    <h5>Changes Made:</h5>
                    <ul>
                      {result.suggestions.map((s: any, index: number) => (
                        <li key={index}>
                          <span className="original">{s.original}</span>
                          <span className="arrow">→</span>
                          <span className="suggestion">{s.suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={applyImprovement}
                  className="apply-btn"
                >
                  Apply Changes
                </button>
              </div>
            )}

            {/* Error Result */}
            {result.error && (
              <div className="result-error">
                <span className="error-icon">⚠️</span>
                <span className="error-message">{result.error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <span className="processing-text">Processing...</span>
        </div>
      )}
    </div>
  );
};

export default AIAssistantPanel;