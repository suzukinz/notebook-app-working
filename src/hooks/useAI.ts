// React Hook for AI Services Integration

import { useState, useEffect, useCallback, useRef } from 'react';
import { aiService } from '../services/aiService';
import type { ClassificationResult, EnhancementSuggestion, SummaryResult } from '../services/aiService';
import { logger } from '../utils/logger';
import { handleError } from '../utils/errorHandler';

// AI Hook State Types
interface AIState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface ClassificationState extends AIState {
  result: ClassificationResult | null;
}

interface EnhancementState extends AIState {
  suggestions: EnhancementSuggestion[];
}

interface SummaryState extends AIState {
  summary: SummaryResult | null;
}

interface SearchState extends AIState {
  results: any[];
  query: string;
}

// Main AI Hook
export const useAI = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null);
  const initAttempted = useRef(false);

  // Initialize AI service
  const initialize = useCallback(async (apiKey?: string): Promise<boolean> => {
    if (initAttempted.current) return isInitialized;
    
    try {
      initAttempted.current = true;
      const success = aiService.initialize(apiKey);
      setIsInitialized(success);
      
      if (success) {
        // Check health status
        const health = await aiService.healthCheck();
        setHealthStatus(health);
        logger.info('AI Service initialized and health check completed', { health });
      }
      
      return success;
    } catch (error) {
      handleError(error, 'AI Hook Initialization');
      return false;
    }
  }, [isInitialized]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const getStatus = useCallback(() => {
    return {
      ...aiService.getStatus(),
      health: healthStatus
    };
  }, [healthStatus]);

  return {
    isInitialized,
    healthStatus,
    initialize,
    getStatus
  };
};

// Classification Hook
export const useAIClassification = () => {
  const [state, setState] = useState<ClassificationState>({
    isLoading: false,
    error: null,
    isInitialized: aiService.getStatus().initialized,
    result: null
  });

  const classify = useCallback(async (
    content: string, 
    title: string, 
    existingTags: string[] = []
  ): Promise<ClassificationResult | null> => {
    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'AI service not initialized' }));
      return null;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      const result = await aiService.classifyNote(content, title, existingTags);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        result 
      }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Classification failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      handleError(error, 'AI Classification Hook');
      return null;
    }
  }, [state.isInitialized]);

  // Debounced classification for real-time typing
  const classifyDebounced = useCallback(
    (content: string, title: string, existingTags: string[] = []) => {
      return aiService.debouncedClassify(content, title, existingTags);
    },
    []
  );

  return {
    ...state,
    classify,
    classifyDebounced,
    clearResult: () => setState(prev => ({ ...prev, result: null, error: null }))
  };
};

// Content Enhancement Hook
export const useAIEnhancement = () => {
  const [state, setState] = useState<EnhancementState>({
    isLoading: false,
    error: null,
    isInitialized: aiService.getStatus().initialized,
    suggestions: []
  });

  const enhance = useCallback(async (
    content: string,
    type: 'grammar' | 'style' | 'structure' | 'all' = 'all'
  ): Promise<EnhancementSuggestion[]> => {
    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'AI service not initialized' }));
      return [];
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      const suggestions = await aiService.enhanceContent(content, type);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        suggestions 
      }));
      return suggestions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Enhancement failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage,
        suggestions: []
      }));
      handleError(error, 'AI Enhancement Hook');
      return [];
    }
  }, [state.isInitialized]);

  // Apply a specific suggestion
  const applySuggestion = useCallback((
    originalContent: string, 
    suggestion: EnhancementSuggestion
  ): string => {
    return originalContent.replace(suggestion.original, suggestion.improved);
  }, []);

  // Apply all suggestions
  const applyAllSuggestions = useCallback((
    originalContent: string,
    suggestions: EnhancementSuggestion[]
  ): string => {
    return suggestions.reduce(
      (content, suggestion) => applySuggestion(content, suggestion),
      originalContent
    );
  }, [applySuggestion]);

  return {
    ...state,
    enhance,
    applySuggestion,
    applyAllSuggestions,
    clearSuggestions: () => setState(prev => ({ ...prev, suggestions: [], error: null }))
  };
};

// Summarization Hook
export const useAISummary = () => {
  const [state, setState] = useState<SummaryState>({
    isLoading: false,
    error: null,
    isInitialized: aiService.getStatus().initialized,
    summary: null
  });

  const summarize = useCallback(async (
    content: string,
    targetLength: 'brief' | 'medium' | 'detailed' = 'medium'
  ): Promise<SummaryResult | null> => {
    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'AI service not initialized' }));
      return null;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      const summary = await aiService.summarizeContent(content, targetLength);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        summary 
      }));
      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Summarization failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      handleError(error, 'AI Summary Hook');
      return null;
    }
  }, [state.isInitialized]);

  return {
    ...state,
    summarize,
    clearSummary: () => setState(prev => ({ ...prev, summary: null, error: null }))
  };
};

// Smart Search Hook
export const useAISearch = () => {
  const [state, setState] = useState<SearchState>({
    isLoading: false,
    error: null,
    isInitialized: aiService.getStatus().initialized,
    results: [],
    query: ''
  });

  const search = useCallback(async (
    query: string,
    notes: any[],
    limit: number = 10
  ): Promise<any[]> => {
    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'AI service not initialized' }));
      return [];
    }

    if (!query.trim()) {
      setState(prev => ({ 
        ...prev, 
        results: [], 
        query: '', 
        error: null 
      }));
      return [];
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      query 
    }));

    try {
      const results = await aiService.smartSearch(query, notes, limit);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        results 
      }));
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage,
        results: []
      }));
      handleError(error, 'AI Search Hook');
      return [];
    }
  }, [state.isInitialized]);

  // Debounced search for real-time typing
  const searchDebounced = useCallback(
    (query: string, notes: any[], limit: number = 10) => {
      return aiService.debouncedSearch(query, notes, limit);
    },
    []
  );

  return {
    ...state,
    search,
    searchDebounced,
    clearResults: () => setState(prev => ({ 
      ...prev, 
      results: [], 
      query: '', 
      error: null 
    }))
  };
};

// Combined AI Features Hook (convenience wrapper)
export const useAIFeatures = () => {
  const ai = useAI();
  const classification = useAIClassification();
  const enhancement = useAIEnhancement();
  const summary = useAISummary();
  const search = useAISearch();

  const isAnyLoading = 
    classification.isLoading || 
    enhancement.isLoading || 
    summary.isLoading || 
    search.isLoading;

  const hasAnyError = 
    classification.error || 
    enhancement.error || 
    summary.error || 
    search.error;

  return {
    ai,
    classification,
    enhancement,
    summary,
    search,
    status: {
      isInitialized: ai.isInitialized,
      isLoading: isAnyLoading,
      hasError: !!hasAnyError,
      health: ai.healthStatus
    }
  };
};

// Hook for AI settings and configuration
export const useAIConfig = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);

  const updateApiKey = useCallback(async (newApiKey: string): Promise<boolean> => {
    setApiKey(newApiKey);
    const success = await aiService.initialize(newApiKey);
    setIsConfigured(success);
    
    // Store in localStorage (encrypted in production)
    if (success && typeof window !== 'undefined') {
      localStorage.setItem('ai_configured', 'true');
    }
    
    return success;
  }, []);

  const clearConfig = useCallback(() => {
    setApiKey('');
    setIsConfigured(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ai_configured');
    }
  }, []);

  // Check if previously configured
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasPreviouslyConfigured = localStorage.getItem('ai_configured') === 'true';
      setIsConfigured(wasPreviouslyConfigured);
    }
  }, []);

  return {
    apiKey,
    isConfigured,
    updateApiKey,
    clearConfig
  };
};

export default {
  useAI,
  useAIClassification,
  useAIEnhancement,
  useAISummary,
  useAISearch,
  useAIFeatures,
  useAIConfig
};