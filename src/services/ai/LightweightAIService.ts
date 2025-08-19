// Lightweight AI Service - Practical 1B-3B Model Integration
// Optimized for real-world usage with minimal resource requirements

import { EventEmitter } from 'events';

// Practical AI Configuration
interface LightweightAIConfig {
  ollama: {
    enabled: boolean;
    baseUrl: string;
    models: {
      fast: string;      // 1B model for instant responses
      balanced: string;  // 3B model for quality tasks
      embedding: string; // Text embedding model
    };
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  fallback: {
    enabled: boolean;
    apiKey?: string;
  };
}

// Request/Response Types
interface AITaskRequest {
  type: 'classify' | 'summarize' | 'generate' | 'embed' | 'improve';
  input: string;
  options?: {
    maxTokens?: number;
    temperature?: number;
    streaming?: boolean;
    language?: string;
  };
}

interface AITaskResponse {
  result: any;
  model: string;
  processingTime: number;
  cached: boolean;
  confidence?: number;
}

// Main Lightweight AI Service
class LightweightAIService extends EventEmitter {
  private config: LightweightAIConfig;
  private cache: Map<string, { result: any; timestamp: number }> = new Map();
  private modelStatus: Map<string, boolean> = new Map();
  private requestQueue: Array<{ request: AITaskRequest; callback: Function }> = [];
  private isProcessing = false;

  constructor(config?: Partial<LightweightAIConfig>) {
    super();
    this.config = this.mergeConfig(config);
    this.initialize();
  }

  private mergeConfig(partial?: Partial<LightweightAIConfig>): LightweightAIConfig {
    return {
      ollama: {
        enabled: true,
        baseUrl: 'http://localhost:11434',
        models: {
          fast: 'llama3.2:1b',
          balanced: 'llama3.2:3b',
          embedding: 'nomic-embed-text',
          ...partial?.ollama?.models
        },
        ...partial?.ollama
      },
      cache: {
        enabled: true,
        ttl: 3600000, // 1 hour
        maxSize: 100,
        ...partial?.cache
      },
      fallback: {
        enabled: false,
        ...partial?.fallback
      }
    };
  }

  private async initialize(): Promise<void> {
    // Check Ollama availability
    if (this.config.ollama.enabled) {
      await this.checkOllamaConnection();
      await this.preloadModels();
    }

    // Start queue processor
    this.startQueueProcessor();

    // Setup cache cleanup
    if (this.config.cache.enabled) {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }

    this.emit('initialized');
  }

  private async checkOllamaConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollama.baseUrl}/api/version`);
      if (response.ok) {
        console.log('✅ Ollama connected');
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Ollama not available, falling back to cloud if enabled');
    }
    return false;
  }

  private async preloadModels(): Promise<void> {
    const models = Object.values(this.config.ollama.models);
    
    for (const model of models) {
      try {
        // Check if model exists
        const response = await fetch(`${this.config.ollama.baseUrl}/api/show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: model })
        });

        if (response.ok) {
          this.modelStatus.set(model, true);
          console.log(`✅ Model ${model} ready`);
        } else {
          console.log(`📥 Pulling model ${model}...`);
          await this.pullModel(model);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to check model ${model}`);
        this.modelStatus.set(model, false);
      }
    }
  }

  private async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.ollama.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: false })
      });

      if (response.ok) {
        this.modelStatus.set(modelName, true);
        console.log(`✅ Model ${modelName} pulled successfully`);
      }
    } catch (error) {
      console.error(`❌ Failed to pull model ${modelName}:`, error);
      this.modelStatus.set(modelName, false);
    }
  }

  // Public API - Simple and Practical
  async classify(text: string, categories?: string[]): Promise<{
    category: string;
    confidence: number;
    reasoning?: string;
  }> {
    const cacheKey = this.getCacheKey('classify', text, categories);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const prompt = categories 
      ? `Classify this text into one of these categories: ${categories.join(', ')}\n\nText: "${text}"\n\nCategory:`
      : `Classify this text into an appropriate category.\n\nText: "${text}"\n\nCategory:`;

    const response = await this.processRequest({
      type: 'classify',
      input: prompt,
      options: { maxTokens: 50, temperature: 0.3 }
    });

    const result = this.parseClassificationResponse(response.result);
    this.setCache(cacheKey, result);
    
    return result;
  }

  async summarize(text: string, maxLength: 'brief' | 'medium' | 'detailed' = 'medium'): Promise<{
    summary: string;
    keyPoints: string[];
    wordCount: number;
  }> {
    const cacheKey = this.getCacheKey('summarize', text, maxLength);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const lengthGuide = {
      brief: '2-3 sentences',
      medium: '1 paragraph',
      detailed: '2-3 paragraphs'
    };

    const prompt = `Summarize the following text in ${lengthGuide[maxLength]}:\n\n${text}\n\nSummary:`;

    const response = await this.processRequest({
      type: 'summarize',
      input: prompt,
      options: { 
        maxTokens: maxLength === 'brief' ? 100 : maxLength === 'medium' ? 200 : 400,
        temperature: 0.5 
      }
    });

    const result = this.parseSummaryResponse(response.result, text);
    this.setCache(cacheKey, result);
    
    return result;
  }

  async improve(text: string, type: 'grammar' | 'clarity' | 'tone' = 'clarity'): Promise<{
    improved: string;
    suggestions: Array<{
      type: string;
      original: string;
      suggestion: string;
    }>;
  }> {
    const cacheKey = this.getCacheKey('improve', text, type);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const prompts = {
      grammar: 'Fix any grammar and spelling errors in this text:',
      clarity: 'Improve the clarity and readability of this text:',
      tone: 'Improve the professional tone of this text:'
    };

    const prompt = `${prompts[type]}\n\n${text}\n\nImproved version:`;

    const response = await this.processRequest({
      type: 'improve',
      input: prompt,
      options: { temperature: 0.7 }
    });

    const result = this.parseImprovementResponse(response.result, text);
    this.setCache(cacheKey, result);
    
    return result;
  }

  async generateTags(text: string, maxTags: number = 5): Promise<string[]> {
    const cacheKey = this.getCacheKey('tags', text, maxTags);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const prompt = `Generate ${maxTags} relevant tags for this text. Return only the tags, separated by commas:\n\n${text}\n\nTags:`;

    const response = await this.processRequest({
      type: 'classify',
      input: prompt,
      options: { maxTokens: 50, temperature: 0.5 }
    });

    const tags = response.result.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    this.setCache(cacheKey, tags);
    
    return tags;
  }

  async searchSimilar(query: string, documents: Array<{ id: string; content: string }>): Promise<Array<{
    id: string;
    score: number;
    content: string;
  }>> {
    // Generate embeddings for query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Generate embeddings for documents (with caching)
    const documentEmbeddings = await Promise.all(
      documents.map(doc => this.generateEmbedding(doc.content))
    );

    // Calculate cosine similarity
    const results = documents.map((doc, index) => ({
      id: doc.id,
      content: doc.content,
      score: this.cosineSimilarity(queryEmbedding, documentEmbeddings[index] || [])
    }));

    // Sort by score
    return results.sort((a, b) => b.score - a.score);
  }

  // Core Processing Logic
  private async processRequest(request: AITaskRequest): Promise<AITaskResponse> {
    const startTime = Date.now();

    // Try Ollama first
    if (this.config.ollama.enabled) {
      try {
        const model = this.selectModel(request);
        if (this.modelStatus.get(model)) {
          const result = await this.callOllama(model, request);
          return {
            result,
            model,
            processingTime: Date.now() - startTime,
            cached: false
          };
        }
      } catch (error) {
        console.warn('Ollama request failed:', error);
      }
    }

    // Fallback to cloud if enabled
    if (this.config.fallback.enabled && this.config.fallback.apiKey) {
      try {
        const result = await this.callCloudAPI(request);
        return {
          result,
          model: 'cloud',
          processingTime: Date.now() - startTime,
          cached: false
        };
      } catch (error) {
        console.error('Cloud API failed:', error);
      }
    }

    // Return error response
    throw new Error('No AI providers available');
  }

  private selectModel(request: AITaskRequest): string {
    // Select appropriate model based on task
    switch (request.type) {
      case 'classify':
      case 'embed':
        return this.config.ollama.models.fast; // Use 1B for speed
      case 'summarize':
      case 'generate':
      case 'improve':
        return this.config.ollama.models.balanced; // Use 3B for quality
      default:
        return this.config.ollama.models.fast;
    }
  }

  private async callOllama(model: string, request: AITaskRequest): Promise<string> {
    const response = await fetch(`${this.config.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: request.input,
        stream: false,
        options: {
          temperature: request.options?.temperature || 0.7,
          num_predict: request.options?.maxTokens || 150,
          top_p: 0.9,
          top_k: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  private async callCloudAPI(request: AITaskRequest): Promise<string> {
    // Simple OpenAI API fallback
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.fallback.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: request.input }],
        max_tokens: request.options?.maxTokens || 150,
        temperature: request.options?.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey('embed', text);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.config.ollama.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.ollama.models.embedding,
          prompt: text
        })
      });

      if (response.ok) {
        const data = await response.json();
        const embedding = data.embedding;
        this.setCache(cacheKey, embedding);
        return embedding;
      }
    } catch (error) {
      console.warn('Embedding generation failed:', error);
    }

    // Fallback: simple hash-based pseudo-embedding
    return this.generatePseudoEmbedding(text);
  }

  private generatePseudoEmbedding(text: string): number[] {
    // Simple pseudo-embedding for fallback
    const embedding = new Array(384).fill(0);
    for (let i = 0; i < text.length; i++) {
      embedding[i % 384] += text.charCodeAt(i) / 255;
    }
    return embedding.map(v => v / text.length);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Response Parsing
  private parseClassificationResponse(response: string): {
    category: string;
    confidence: number;
    reasoning?: string;
  } {
    const lines = response.split('\n').filter(Boolean);
    const category = lines[0]?.replace(/['"]/g, '').trim() || 'unknown';
    
    const reasoningText = lines.slice(1).join(' ').trim();
    const result: { category: string; confidence: number; reasoning?: string } = {
      category,
      confidence: 0.8 // Estimate since Ollama doesn't provide confidence
    };
    if (reasoningText) {
      result.reasoning = reasoningText;
    }
    return result;
  }

  private parseSummaryResponse(response: string, _originalText: string): {
    summary: string;
    keyPoints: string[];
    wordCount: number;
  } {
    const summary = response.trim();
    
    // Extract key points (simple heuristic)
    const sentences = summary.split(/[.!?]+/).filter(Boolean);
    const keyPoints = sentences.slice(0, 3).map(s => s.trim());
    
    return {
      summary,
      keyPoints,
      wordCount: summary.split(/\s+/).length
    };
  }

  private parseImprovementResponse(response: string, originalText: string): {
    improved: string;
    suggestions: Array<{
      type: string;
      original: string;
      suggestion: string;
    }>;
  } {
    const improved = response.trim();
    
    // Simple diff to find changes (basic implementation)
    const suggestions: Array<{ type: string; original: string; suggestion: string }> = [];
    
    const originalWords = originalText.split(/\s+/);
    const improvedWords = improved.split(/\s+/);
    
    // Basic word-level diff
    for (let i = 0; i < Math.min(originalWords.length, improvedWords.length); i++) {
      if (originalWords[i] !== improvedWords[i]) {
        const original = originalWords[i];
        const suggestion = improvedWords[i];
        if (original && suggestion) {
          suggestions.push({
            type: 'word_change',
            original,
            suggestion
          });
        }
        
        if (suggestions.length >= 5) break; // Limit suggestions
      }
    }
    
    return { improved, suggestions };
  }

  // Caching System
  private getCacheKey(...args: any[]): string {
    return JSON.stringify(args);
  }

  private getFromCache(key: string): any {
    if (!this.config.cache.enabled) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cache.ttl) {
      return cached.result;
    }
    
    return null;
  }

  private setCache(key: string, value: any): void {
    if (!this.config.cache.enabled) return;
    
    this.cache.set(key, {
      result: value,
      timestamp: Date.now()
    });
    
    // Enforce max size
    if (this.cache.size > this.config.cache.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cache.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Queue Processing
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.requestQueue.length === 0) return;
      
      this.isProcessing = true;
      const item = this.requestQueue.shift();
      
      if (item) {
        try {
          const result = await this.processRequest(item.request);
          item.callback(null, result);
        } catch (error) {
          item.callback(error, null);
        }
      }
      
      this.isProcessing = false;
    }, 100);
  }

  // Status and Health
  async getStatus(): Promise<{
    ollama: boolean;
    models: Record<string, boolean>;
    cacheSize: number;
    queueSize: number;
  }> {
    const ollamaAvailable = await this.checkOllamaConnection();
    
    return {
      ollama: ollamaAvailable,
      models: Object.fromEntries(this.modelStatus),
      cacheSize: this.cache.size,
      queueSize: this.requestQueue.length
    };
  }
}

// Singleton instance
export const lightweightAI = new LightweightAIService();

// React Hook
export const useLightweightAI = () => {
  return {
    classify: lightweightAI.classify.bind(lightweightAI),
    summarize: lightweightAI.summarize.bind(lightweightAI),
    improve: lightweightAI.improve.bind(lightweightAI),
    generateTags: lightweightAI.generateTags.bind(lightweightAI),
    searchSimilar: lightweightAI.searchSimilar.bind(lightweightAI),
    getStatus: lightweightAI.getStatus.bind(lightweightAI)
  };
};

export default lightweightAI;