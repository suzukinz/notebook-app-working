// AI Service Layer - OpenAI Integration with Smart Caching and Rate Limiting

import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { debounce } from '../utils/debounce';

// AI Configuration
interface AIConfig {
  apiKey?: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

const DEFAULT_CONFIG: AIConfig = {
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  maxTokens: 2000,
  temperature: 0.7,
  rateLimit: {
    requestsPerMinute: 60,
    tokensPerMinute: 90000
  }
};

// AI Request/Response Types
interface AIRequest {
  prompt: string;
  context?: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

interface ClassificationResult {
  category: string;
  subcategory?: string;
  tags: string[];
  confidence: number;
  reasoning: string;
}

export interface EnhancementSuggestion {
  type: 'grammar' | 'style' | 'structure' | 'content';
  suggestion: string;
  original: string;
  improved: string;
  explanation: string;
  confidence: number;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  wordCount: {
    original: number;
    summary: number;
    reduction: number;
  };
}

// Rate Limiting and Caching
class RateLimiter {
  private requests: number[] = [];
  private tokens: number[] = [];

  canMakeRequest(tokens: number, config: AIConfig): boolean {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Remove old entries
    this.requests = this.requests.filter(time => now - time < oneMinute);
    this.tokens = this.tokens.filter(time => now - time < oneMinute);

    // Check limits
    if (this.requests.length >= config.rateLimit.requestsPerMinute) {
      return false;
    }

    const currentTokens = this.tokens.length * (config.maxTokens / 2); // Estimate
    if (currentTokens + tokens > config.rateLimit.tokensPerMinute) {
      return false;
    }

    return true;
  }

  recordRequest(_tokens: number): void {
    const now = Date.now();
    this.requests.push(now);
    this.tokens.push(now);
  }
}

class AICache {
  private cache = new Map<string, { result: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

  private generateKey(prompt: string, context?: string): string {
    return btoa(`${prompt}:${context || ''}`).slice(0, 32);
  }

  get<T>(prompt: string, context?: string): T | null {
    const key = this.generateKey(prompt, context);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  set<T>(prompt: string, result: T, context?: string, ttl = this.DEFAULT_TTL): void {
    const key = this.generateKey(prompt, context);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });

    // Clean up old entries periodically
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Main AI Service Class
export class AIService {
  private config: AIConfig;
  private rateLimiter = new RateLimiter();
  private cache = new AICache();
  private isInitialized = false;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Initialize with API key (from environment or user input)
  initialize(apiKey?: string): boolean {
    try {
      this.config.apiKey = apiKey || process.env.REACT_APP_OPENAI_API_KEY || '';
      
      if (!this.config.apiKey) {
        logger.warn('AI Service: No API key provided, AI features will be disabled');
        return false;
      }

      this.isInitialized = true;
      logger.info('AI Service initialized successfully');
      return true;
    } catch (error) {
      handleError(error, 'AI Service Initialization');
      return false;
    }
  }

  // Generic AI request with caching and rate limiting
  private async makeAIRequest(request: AIRequest): Promise<AIResponse> {
    if (!this.isInitialized || !this.config.apiKey) {
      throw new Error('AI Service not initialized');
    }

    // Check cache first
    const cached = this.cache.get<AIResponse>(request.prompt, request.context);
    if (cached) {
      logger.info('AI Service: Serving cached response');
      return cached;
    }

    // Check rate limits
    const estimatedTokens = Math.ceil(request.prompt.length / 4); // Rough estimate
    if (!this.rateLimiter.canMakeRequest(estimatedTokens, this.config)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            ...(request.systemMessage ? [{ role: 'system', content: request.systemMessage }] : []),
            ...(request.context ? [{ role: 'user', content: `Context: ${request.context}` }] : []),
            { role: 'user', content: request.prompt }
          ],
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`AI API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const aiResponse: AIResponse = {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        model: data.model,
        finishReason: data.choices[0]?.finish_reason || 'unknown'
      };

      // Record request for rate limiting
      this.rateLimiter.recordRequest(aiResponse.usage.totalTokens);

      // Cache the result
      this.cache.set(request.prompt, aiResponse, request.context);

      logger.info(`AI Service: Request completed. Tokens used: ${aiResponse.usage.totalTokens}`);

      return aiResponse;
    } catch (error) {
      handleError(error, 'AI Service Request');
      throw error;
    }
  }

  // Smart Classification - Automatically categorize notes
  async classifyNote(content: string, title: string, existingTags: string[] = []): Promise<ClassificationResult> {
    const systemMessage = `You are an expert content classifier. Analyze the given note and provide structured classification.
    
    Existing tags in the system: ${existingTags.join(', ')}
    
    Respond in JSON format with:
    {
      "category": "main category",
      "subcategory": "specific subcategory if applicable",
      "tags": ["tag1", "tag2", "tag3"],
      "confidence": 0.95,
      "reasoning": "Brief explanation of classification"
    }`;

    const prompt = `Title: ${title}

Content: ${content.slice(0, 2000)}...

Classify this note content.`;

    try {
      const response = await this.makeAIRequest({
        prompt,
        systemMessage,
        temperature: 0.3 // Lower temperature for consistent classification
      });

      const result = JSON.parse(response.content) as ClassificationResult;
      logger.info('AI Classification completed', { category: result.category, confidence: result.confidence });
      
      return result;
    } catch (error) {
      logger.error('AI Classification failed', error);
      
      // Fallback classification
      return {
        category: 'General',
        tags: [],
        confidence: 0.1,
        reasoning: 'Automatic classification failed, using fallback'
      };
    }
  }

  // Content Enhancement - Writing assistance and improvements
  async enhanceContent(content: string, type: 'grammar' | 'style' | 'structure' | 'all' = 'all'): Promise<EnhancementSuggestion[]> {
    const systemMessage = `You are an expert writing assistant. Analyze the content and provide specific improvement suggestions.

    Focus on: ${type === 'all' ? 'grammar, style, structure, and content' : type}
    
    Respond in JSON format with an array of suggestions:
    [
      {
        "type": "grammar|style|structure|content",
        "suggestion": "Brief description of improvement",
        "original": "original text segment",
        "improved": "improved version",
        "explanation": "Why this improvement helps",
        "confidence": 0.95
      }
    ]`;

    const prompt = `Please analyze this content and provide improvement suggestions:

${content}`;

    try {
      const response = await this.makeAIRequest({
        prompt,
        systemMessage,
        temperature: 0.4
      });

      const suggestions = JSON.parse(response.content) as EnhancementSuggestion[];
      logger.info(`AI Enhancement completed with ${suggestions.length} suggestions`);
      
      return suggestions;
    } catch (error) {
      logger.error('AI Enhancement failed', error);
      return [];
    }
  }

  // Auto Summarization - Generate summaries and key points
  async summarizeContent(content: string, targetLength: 'brief' | 'medium' | 'detailed' = 'medium'): Promise<SummaryResult> {
    const lengthMap = {
      brief: 100,
      medium: 200,
      detailed: 400
    };

    const systemMessage = `You are an expert summarizer. Create a concise, accurate summary that captures the key information and insights.

    Target length: approximately ${lengthMap[targetLength]} words
    
    Respond in JSON format:
    {
      "summary": "comprehensive summary text",
      "keyPoints": ["key point 1", "key point 2", "key point 3"],
      "wordCount": {
        "original": ${content.split(' ').length},
        "summary": 0,
        "reduction": 0
      }
    }`;

    const prompt = `Please summarize the following content:

${content}`;

    try {
      const response = await this.makeAIRequest({
        prompt,
        systemMessage,
        temperature: 0.3
      });

      const result = JSON.parse(response.content) as SummaryResult;
      
      // Calculate actual word counts
      const summaryWordCount = result.summary.split(' ').length;
      const originalWordCount = content.split(' ').length;
      
      result.wordCount = {
        original: originalWordCount,
        summary: summaryWordCount,
        reduction: Math.round((1 - summaryWordCount / originalWordCount) * 100)
      };

      logger.info(`AI Summarization completed. Reduction: ${result.wordCount.reduction}%`);
      
      return result;
    } catch (error) {
      logger.error('AI Summarization failed', error);
      
      // Fallback summary
      return {
        summary: content.slice(0, 200) + '...',
        keyPoints: [],
        wordCount: {
          original: content.split(' ').length,
          summary: 50,
          reduction: 75
        }
      };
    }
  }

  // Smart Search - Semantic search with AI understanding
  async smartSearch(query: string, notes: any[], limit: number = 10): Promise<any[]> {
    const systemMessage = `You are an intelligent search assistant. Given a search query and note content, rank the relevance of each note.

    Consider:
    - Semantic meaning, not just keyword matching
    - Context and intent of the query  
    - Content relevance and quality

    Respond with JSON array of note IDs ranked by relevance:
    [{"id": "note-id", "relevanceScore": 0.95, "reasoning": "why this note is relevant"}]`;

    const notesSummary = notes.slice(0, 50).map(note => 
      `ID: ${note.id}, Title: ${note.title}, Content: ${note.pages[0]?.content?.slice(0, 200) || ''}...`
    ).join('\n\n');

    const prompt = `Search Query: "${query}"

Notes to search:
${notesSummary}

Rank these notes by relevance to the query.`;

    try {
      const response = await this.makeAIRequest({
        prompt,
        systemMessage,
        temperature: 0.2
      });

      const rankings = JSON.parse(response.content);
      
      // Sort by relevance score and return note objects
      const rankedNotes = rankings
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
        .map((ranking: any) => notes.find(note => note.id === ranking.id))
        .filter(Boolean);

      logger.info(`AI Smart Search completed. Found ${rankedNotes.length} relevant notes`);
      
      return rankedNotes;
    } catch (error) {
      logger.error('AI Smart Search failed', error);
      
      // Fallback to simple text search
      const fallbackResults = notes.filter(note => 
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.pages[0]?.content?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);

      return fallbackResults;
    }
  }

  // Debounced versions for real-time features
  debouncedClassify = debounce(this.classifyNote.bind(this), 2000);
  debouncedEnhance = debounce(this.enhanceContent.bind(this), 1500);
  debouncedSearch = debounce(this.smartSearch.bind(this), 500);

  // Health check
  async healthCheck(): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      await this.makeAIRequest({
        prompt: 'Hello',
        systemMessage: 'Respond with just "OK"',
        maxTokens: 5
      });
      return true;
    } catch {
      return false;
    }
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.isInitialized,
      cacheSize: this.cache['cache'].size,
      model: this.config.model,
      rateLimit: this.config.rateLimit
    };
  }
}

// Singleton instance
export const aiService = new AIService();

// Export types
export type { ClassificationResult, AIRequest, AIResponse };

export default AIService;