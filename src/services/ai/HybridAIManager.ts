// Hybrid AI Manager - Local + Cloud Model Orchestration
// Intelligent routing between local models, cloud APIs, and edge computing

import { EventEmitter } from 'events';
// import { serviceRegistry } from '../microservices/ServiceRegistry';

// AI Model Types and Interfaces
interface AIModel {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'edge';
  provider: 'ollama' | 'huggingface' | 'openai' | 'anthropic' | 'custom';
  modelPath?: string; // For local models
  apiEndpoint?: string;
  capabilities: AICapability[];
  performance: ModelPerformance;
  requirements: ModelRequirements;
  metadata: ModelMetadata;
  status: ModelStatus;
}

interface AICapability {
  task: AITask;
  quality: 'low' | 'medium' | 'high' | 'excellent';
  speed: 'slow' | 'medium' | 'fast' | 'realtime';
  languages: string[];
  contextLength: number;
  outputTokens: number;
}

interface ModelPerformance {
  averageLatency: number; // ms
  throughput: number; // tokens/second  
  accuracy: number; // 0-1
  memoryUsage: number; // MB
  diskUsage: number; // MB
  cpuUsage: number; // percentage
  gpuUsage: number; // percentage
}

interface ModelRequirements {
  minRam: number; // GB
  minDisk: number; // GB
  gpuRequired: boolean;
  minGpuMemory?: number; // GB
  architecture: 'x64' | 'arm64' | 'any';
  os: string[];
}

interface ModelMetadata {
  version: string;
  description: string;
  license: string;
  author: string;
  trainingData?: string;
  lastUpdated: Date;
  downloadUrl?: string;
  checksum?: string;
}

interface AIRequest {
  id: string;
  task: AITask;
  input: any;
  options: AIRequestOptions;
  priority: 'low' | 'normal' | 'high' | 'critical';
  privacyLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  userId?: string;
  tenantId?: string;
  context?: Record<string, any>;
}

interface AIRequestOptions {
  preferLocal?: boolean;
  maxLatency?: number;
  minQuality?: 'low' | 'medium' | 'high' | 'excellent';
  fallbackToCloud?: boolean;
  cacheResults?: boolean;
  stream?: boolean;
  categories?: string[];
}

interface AIResponse {
  id: string;
  requestId: string;
  result: any;
  modelUsed: string;
  executionTime: number;
  tokensUsed: number;
  confidence?: number;
  cached: boolean;
  metadata: ResponseMetadata;
}

interface ResponseMetadata {
  modelType: 'local' | 'cloud' | 'edge';
  provider: string;
  processingTime: number;
  queueTime: number;
  cost?: number;
  energyUsed?: number;
}

type AITask = 
  | 'text-classification'
  | 'text-generation'
  | 'text-summarization' 
  | 'text-embedding'
  | 'question-answering'
  | 'code-generation'
  | 'translation'
  | 'sentiment-analysis'
  | 'entity-extraction'
  | 'content-moderation';

type ModelStatus = 'available' | 'loading' | 'updating' | 'error' | 'disabled';

// Model Providers
abstract class ModelProvider extends EventEmitter {
  abstract name: string;
  abstract type: 'local' | 'cloud' | 'edge';
  
  abstract initialize(): Promise<void>;
  abstract loadModel(modelId: string): Promise<boolean>;
  abstract unloadModel(modelId: string): Promise<boolean>;
  abstract execute(request: AIRequest): Promise<AIResponse>;
  abstract getAvailableModels(): Promise<AIModel[]>;
  abstract getModelStatus(modelId: string): Promise<ModelStatus>;
  abstract healthCheck(): Promise<boolean>;
}

// Ollama Provider for Local LLMs
class OllamaProvider extends ModelProvider {
  name = 'ollama';
  type: 'local' = 'local';
  private baseUrl: string;
  private loadedModels: Set<string> = new Set();

  constructor(baseUrl = 'http://localhost:11434') {
    super();
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama not available at ${this.baseUrl}`);
      }
      console.log('Ollama provider initialized');
    } catch (error) {
      console.error('Failed to initialize Ollama provider:', error);
      throw error;
    }
  }

  async loadModel(modelId: string): Promise<boolean> {
    try {
      // Pull model if not exists
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelId })
      });

      if (response.ok) {
        this.loadedModels.add(modelId);
        this.emit('model.loaded', { modelId, provider: this.name });
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to load Ollama model ${modelId}:`, error);
      return false;
    }
  }

  async unloadModel(modelId: string): Promise<boolean> {
    // Ollama doesn't have explicit unload, but we track loaded models
    this.loadedModels.delete(modelId);
    this.emit('model.unloaded', { modelId, provider: this.name });
    return true;
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const modelId = this.selectModelForTask(request.task);
    
    if (!this.loadedModels.has(modelId)) {
      await this.loadModel(modelId);
    }

    try {
      const ollamaRequest = this.convertToOllamaFormat(request, modelId);
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaRequest)
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      return {
        id: this.generateId(),
        requestId: request.id,
        result: this.parseOllamaResponse(result, request.task),
        modelUsed: modelId,
        executionTime,
        tokensUsed: this.estimateTokens(result.response || ''),
        cached: false,
        metadata: {
          modelType: 'local',
          provider: this.name,
          processingTime: executionTime,
          queueTime: 0,
          energyUsed: this.estimateEnergyUsage(executionTime)
        }
      };
    } catch (error) {
      throw new Error(`Ollama execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getAvailableModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      
      return data.models?.map((model: any) => ({
        id: model.name,
        name: model.name,
        type: 'local',
        provider: 'ollama',
        modelPath: model.name,
        capabilities: this.getModelCapabilities(model.name),
        performance: this.estimatePerformance(model),
        requirements: this.getModelRequirements(model.name),
        metadata: {
          version: model.modified || '1.0.0',
          description: `Ollama model: ${model.name}`,
          license: 'Various',
          author: 'Ollama Community',
          lastUpdated: new Date(model.modified || Date.now())
        },
        status: this.loadedModels.has(model.name) ? 'available' : 'loading'
      })) || [];
    } catch (error) {
      console.error('Failed to get Ollama models:', error);
      return [];
    }
  }

  async getModelStatus(modelId: string): Promise<ModelStatus> {
    return this.loadedModels.has(modelId) ? 'available' : 'loading';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private selectModelForTask(task: AITask): string {
    const taskModelMap: Record<AITask, string> = {
      'text-classification': 'llama3.2:1b',
      'text-generation': 'llama3.2:3b',
      'text-summarization': 'llama3.2:3b',
      'text-embedding': 'nomic-embed-text',
      'question-answering': 'llama3.2:3b',
      'code-generation': 'codellama:7b',
      'translation': 'llama3.2:3b',
      'sentiment-analysis': 'llama3.2:1b',
      'entity-extraction': 'llama3.2:1b',
      'content-moderation': 'llama3.2:1b'
    };

    return taskModelMap[task] || 'llama3.2:3b';
  }

  private convertToOllamaFormat(request: AIRequest, modelId: string): any {
    const baseRequest = {
      model: modelId,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }
    };

    switch (request.task) {
      case 'text-classification':
        return {
          ...baseRequest,
          prompt: `Classify the following text into one of these categories: ${request.options.categories?.join(', ')}.\n\nText: ${request.input.text}\n\nCategory:`
        };
        
      case 'text-summarization':
        return {
          ...baseRequest,
          prompt: `Summarize the following text in ${request.input.length || 'medium'} length:\n\n${request.input.text}\n\nSummary:`
        };

      case 'text-generation':
        return {
          ...baseRequest,
          prompt: request.input.prompt,
          options: {
            ...baseRequest.options,
            num_predict: request.input.max_tokens || 150
          }
        };

      default:
        return {
          ...baseRequest,
          prompt: request.input.text || request.input.prompt
        };
    }
  }

  private parseOllamaResponse(response: any, task: AITask): any {
    const text = response.response;

    switch (task) {
      case 'text-classification':
        return {
          category: text.trim(),
          confidence: 0.8 // Ollama doesn't provide confidence, estimate
        };

      case 'text-summarization':
        return {
          summary: text.trim(),
          length: text.split(' ').length
        };

      case 'text-embedding':
        return {
          embedding: response.embedding || []
        };

      default:
        return {
          text: text.trim(),
          tokens: this.estimateTokens(text)
        };
    }
  }

  private getModelCapabilities(modelName: string): AICapability[] {
    // Model-specific capabilities based on known Ollama models
    const capabilities: Record<string, AICapability[]> = {
      'llama3.2:1b': [{
        task: 'text-classification',
        quality: 'medium',
        speed: 'fast',
        languages: ['en'],
        contextLength: 2048,
        outputTokens: 500
      }],
      'llama3.2:3b': [{
        task: 'text-generation',
        quality: 'high',
        speed: 'medium',
        languages: ['en', 'es', 'fr', 'de', 'it'],
        contextLength: 4096,
        outputTokens: 1000
      }],
      'codellama:7b': [{
        task: 'code-generation',
        quality: 'excellent',
        speed: 'medium',
        languages: ['en'],
        contextLength: 8192,
        outputTokens: 2000
      }]
    };

    return capabilities[modelName] || [{
      task: 'text-generation',
      quality: 'medium',
      speed: 'medium',
      languages: ['en'],
      contextLength: 2048,
      outputTokens: 500
    }];
  }

  private estimatePerformance(model: any): ModelPerformance {
    return {
      averageLatency: 1000,
      throughput: 50,
      accuracy: 0.8,
      memoryUsage: 2048,
      diskUsage: parseInt(model.size) || 1000,
      cpuUsage: 50,
      gpuUsage: 0
    };
  }

  private getModelRequirements(modelName: string): ModelRequirements {
    const sizeMap: Record<string, ModelRequirements> = {
      '1b': { minRam: 2, minDisk: 2, gpuRequired: false, architecture: 'any', os: ['linux', 'macos', 'windows'] },
      '3b': { minRam: 4, minDisk: 4, gpuRequired: false, architecture: 'any', os: ['linux', 'macos', 'windows'] },
      '7b': { minRam: 8, minDisk: 8, gpuRequired: false, architecture: 'any', os: ['linux', 'macos', 'windows'] },
      '13b': { minRam: 16, minDisk: 16, gpuRequired: true, minGpuMemory: 8, architecture: 'any', os: ['linux', 'macos', 'windows'] }
    };

    for (const [size, requirements] of Object.entries(sizeMap)) {
      if (modelName.includes(size)) {
        return requirements;
      }
    }

    return sizeMap['3b'] || { 
      minRam: 4, 
      minDisk: 2, 
      gpuRequired: false,
      architecture: 'any' as const,
      os: ['linux', 'windows', 'darwin']
    }; // Default
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimation
  }

  private estimateEnergyUsage(executionTime: number): number {
    // Rough estimation: 10W average power consumption
    return (executionTime / 1000) * 10; // Watt-seconds
  }

  private generateId(): string {
    return `ollama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Hugging Face Provider for Open Source Models
class HuggingFaceProvider extends ModelProvider {
  name = 'huggingface';
  type: 'local' = 'local';
  private transformers: any;
  private loadedModels: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    try {
      // Dynamic import for Hugging Face Transformers (optional)
      // Commented out until @xenova/transformers is installed
      // this.transformers = await import('@xenova/transformers');
      console.log('Hugging Face provider initialized (transformers disabled)');
    } catch (error) {
      console.warn('Hugging Face transformers not available:', error);
      // Continue without transformers - this is optional
    }
  }

  async loadModel(modelId: string): Promise<boolean> {
    try {
      const taskType = this.getTaskTypeForModel(modelId);
      let model;

      switch (taskType) {
        case 'text-classification':
          const { pipeline } = this.transformers;
          model = await pipeline('text-classification', modelId, {
            device: 'cpu', // or 'gpu' if available
            model_file_name: 'model.onnx'
          });
          break;
        case 'text-generation':
          model = await this.transformers.AutoModelForCausalLM.from_pretrained(modelId);
          break;
        case 'text-embedding':
          model = await this.transformers.AutoModel.from_pretrained(modelId);
          break;
        default:
          throw new Error(`Unsupported task type: ${taskType}`);
      }

      this.loadedModels.set(modelId, model);
      this.emit('model.loaded', { modelId, provider: this.name });
      return true;
    } catch (error) {
      console.error(`Failed to load HuggingFace model ${modelId}:`, error);
      return false;
    }
  }

  async unloadModel(modelId: string): Promise<boolean> {
    const model = this.loadedModels.get(modelId);
    if (model && model.dispose) {
      await model.dispose();
    }
    this.loadedModels.delete(modelId);
    this.emit('model.unloaded', { modelId, provider: this.name });
    return true;
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const modelId = this.selectModelForTask(request.task);
    
    if (!this.loadedModels.has(modelId)) {
      await this.loadModel(modelId);
    }

    const model = this.loadedModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not available`);
    }

    try {
      let result;
      
      switch (request.task) {
        case 'text-classification':
          result = await model(request.input.text);
          break;
        case 'sentiment-analysis':
          result = await model(request.input.text);
          break;
        case 'text-embedding':
          result = await this.generateEmbedding(model, request.input.text);
          break;
        default:
          result = await model(request.input.text || request.input.prompt);
      }

      const executionTime = Date.now() - startTime;

      return {
        id: this.generateId(),
        requestId: request.id,
        result: this.parseHuggingFaceResponse(result, request.task),
        modelUsed: modelId,
        executionTime,
        tokensUsed: this.estimateTokens(request.input.text || ''),
        cached: false,
        metadata: {
          modelType: 'local',
          provider: this.name,
          processingTime: executionTime,
          queueTime: 0,
          energyUsed: this.estimateEnergyUsage(executionTime)
        }
      };
    } catch (error) {
      throw new Error(`HuggingFace execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getAvailableModels(): Promise<AIModel[]> {
    // Predefined list of recommended models
    const recommendedModels = [
      {
        id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        name: 'DistilBERT Sentiment Analysis',
        task: 'sentiment-analysis'
      },
      {
        id: 'Xenova/all-MiniLM-L6-v2',
        name: 'MiniLM Sentence Embedding',
        task: 'text-embedding'
      },
      {
        id: 'Xenova/gpt2',
        name: 'GPT-2 Text Generation',
        task: 'text-generation'
      }
    ];

    return recommendedModels.map(model => ({
      id: model.id,
      name: model.name,
      type: 'local',
      provider: 'huggingface',
      modelPath: model.id,
      capabilities: this.getHFModelCapabilities(model.task),
      performance: this.estimateHFPerformance(model.id),
      requirements: this.getHFModelRequirements(model.id),
      metadata: {
        version: '1.0.0',
        description: `Hugging Face model: ${model.name}`,
        license: 'Apache-2.0',
        author: 'Hugging Face Community',
        lastUpdated: new Date()
      },
      status: this.loadedModels.has(model.id) ? 'available' : 'loading'
    }));
  }

  async getModelStatus(modelId: string): Promise<ModelStatus> {
    return this.loadedModels.has(modelId) ? 'available' : 'loading';
  }

  async healthCheck(): Promise<boolean> {
    return !!this.transformers;
  }

  private selectModelForTask(task: AITask): string {
    const taskModelMap: Record<AITask, string> = {
      'text-classification': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      'sentiment-analysis': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      'text-embedding': 'Xenova/all-MiniLM-L6-v2',
      'text-generation': 'Xenova/gpt2',
      'question-answering': 'Xenova/distilbert-base-cased-distilled-squad',
      'entity-extraction': 'Xenova/bert-base-NER',
      'text-summarization': 'Xenova/distilbart-cnn-6-6',
      'translation': 'Xenova/opus-mt-en-de',
      'code-generation': 'Xenova/gpt2',
      'content-moderation': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    };

    return taskModelMap[task] || 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
  }

  private getTaskTypeForModel(modelId: string): string {
    if (modelId.includes('sst-2') || modelId.includes('sentiment')) return 'text-classification';
    if (modelId.includes('MiniLM') || modelId.includes('embedding')) return 'text-embedding';
    if (modelId.includes('gpt') || modelId.includes('generation')) return 'text-generation';
    return 'text-classification';
  }

  private async generateEmbedding(model: any, text: string): Promise<any> {
    // Simplified embedding generation
    const output = await model.encode(text);
    return { embedding: Array.from(output.data) };
  }

  private parseHuggingFaceResponse(response: any, task: AITask): any {
    switch (task) {
      case 'text-classification':
      case 'sentiment-analysis':
        return {
          category: response[0]?.label || 'unknown',
          confidence: response[0]?.score || 0.5,
          all_scores: response
        };

      case 'text-embedding':
        return {
          embedding: response.embedding,
          dimensions: response.embedding?.length || 0
        };

      default:
        return response;
    }
  }

  private getHFModelCapabilities(task: string): AICapability[] {
    return [{
      task: task as AITask,
      quality: 'high',
      speed: 'fast',
      languages: ['en'],
      contextLength: 512,
      outputTokens: 512
    }];
  }

  private estimateHFPerformance(_modelId: string): ModelPerformance {
    return {
      averageLatency: 100,
      throughput: 200,
      accuracy: 0.85,
      memoryUsage: 500,
      diskUsage: 250,
      cpuUsage: 30,
      gpuUsage: 0
    };
  }

  private getHFModelRequirements(_modelId: string): ModelRequirements {
    return {
      minRam: 1,
      minDisk: 1,
      gpuRequired: false,
      architecture: 'any',
      os: ['linux', 'macos', 'windows']
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private estimateEnergyUsage(executionTime: number): number {
    return (executionTime / 1000) * 5; // 5W average for CPU inference
  }

  private generateId(): string {
    return `hf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Cloud Provider (OpenAI/Anthropic) with Fallback
class CloudProvider extends ModelProvider {
  name = 'cloud';
  type: 'cloud' = 'cloud';
  private openaiApiKey?: string;
  private anthropicApiKey?: string;

  constructor(apiKeys: { openai?: string; anthropic?: string }) {
    super();
    if (apiKeys.openai) this.openaiApiKey = apiKeys.openai;
    if (apiKeys.anthropic) this.anthropicApiKey = apiKeys.anthropic;
  }

  async initialize(): Promise<void> {
    if (!this.openaiApiKey && !this.anthropicApiKey) {
      throw new Error('No cloud API keys provided');
    }
    console.log('Cloud provider initialized');
  }

  async loadModel(_modelId: string): Promise<boolean> {
    // Cloud models don't need explicit loading
    return true;
  }

  async unloadModel(_modelId: string): Promise<boolean> {
    // Cloud models don't need explicit unloading
    return true;
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      let result;
      
      if (this.openaiApiKey) {
        result = await this.executeOpenAI(request);
      } else if (this.anthropicApiKey) {
        result = await this.executeAnthropic(request);
      } else {
        throw new Error('No available cloud providers');
      }

      const executionTime = Date.now() - startTime;

      return {
        id: this.generateId(),
        requestId: request.id,
        result,
        modelUsed: 'gpt-4o-mini',
        executionTime,
        tokensUsed: this.estimateTokens(JSON.stringify(result)),
        cached: false,
        metadata: {
          modelType: 'cloud',
          provider: this.name,
          processingTime: executionTime,
          queueTime: 0,
          cost: this.estimateCost(request.task, executionTime)
        }
      };
    } catch (error) {
      throw new Error(`Cloud execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeOpenAI(request: AIRequest): Promise<any> {
    try {
      // OpenAI module not available, using mock implementation
      console.log('OpenAI provider not available, using mock implementation');

      switch (request.task) {
      case 'text-generation':
        return { text: 'Mock OpenAI response: ' + request.input.prompt };

      case 'text-classification':
        return { category: request.input.categories?.[0] || 'general', confidence: 0.8 };

      case 'text-embedding':
        // Return a mock embedding vector
        return { embedding: Array.from({length: 1536}, () => Math.random()) };

      default:
        throw new Error(`Unsupported task: ${request.task}`);
      }
    } catch (error) {
      throw new Error(`OpenAI execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeAnthropic(_request: AIRequest): Promise<any> {
    // Implementation for Anthropic Claude API
    throw new Error('Anthropic provider not implemented');
  }

  async getAvailableModels(): Promise<AIModel[]> {
    const models = [];
    
    if (this.openaiApiKey) {
      models.push({
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        type: 'cloud' as const,
        provider: 'openai' as const,
        apiEndpoint: 'https://api.openai.com/v1',
        capabilities: [{
          task: 'text-generation' as AITask,
          quality: 'excellent' as const,
          speed: 'fast' as const,
          languages: ['en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh'],
          contextLength: 128000,
          outputTokens: 16384
        }],
        performance: {
          averageLatency: 1500,
          throughput: 100,
          accuracy: 0.95,
          memoryUsage: 0,
          diskUsage: 0,
          cpuUsage: 0,
          gpuUsage: 0
        },
        requirements: {
          minRam: 0,
          minDisk: 0,
          gpuRequired: false,
          architecture: 'any' as const,
          os: ['any']
        },
        metadata: {
          version: '2024-07-18',
          description: 'OpenAI GPT-4o Mini model',
          license: 'Commercial',
          author: 'OpenAI',
          lastUpdated: new Date()
        },
        status: 'available' as const
      });
    }

    return models;
  }

  async getModelStatus(_modelId: string): Promise<ModelStatus> {
    return 'available';
  }

  async healthCheck(): Promise<boolean> {
    return !!(this.openaiApiKey || this.anthropicApiKey);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private estimateCost(task: AITask, _executionTime: number): number {
    // Rough cost estimation for OpenAI API
    const baseCosts = {
      'text-generation': 0.0001, // per token
      'text-classification': 0.00005,
      'text-embedding': 0.00001,
      'text-summarization': 0.0001
    };

    return baseCosts[task as keyof typeof baseCosts] || 0.0001;
  }

  private generateId(): string {
    return `cloud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Main Hybrid AI Manager
class HybridAIManager extends EventEmitter {
  private providers: Map<string, ModelProvider> = new Map();
  private modelRegistry: Map<string, AIModel> = new Map();
  private requestQueue: AIRequest[] = [];
  private responseCache: Map<string, AIResponse> = new Map();
  private routingPolicy: RoutingPolicy;
  private isProcessing = false;

  constructor() {
    super();
    this.routingPolicy = new RoutingPolicy();
    this.startRequestProcessor();
    this.startCacheCleanup();
  }

  async initialize(config: HybridAIConfig): Promise<void> {
    // Initialize providers based on configuration
    if (config.providers.ollama?.enabled) {
      const ollama = new OllamaProvider(config.providers.ollama.baseUrl);
      await ollama.initialize();
      this.providers.set('ollama', ollama);
    }

    if (config.providers.huggingface?.enabled) {
      const hf = new HuggingFaceProvider();
      await hf.initialize();
      this.providers.set('huggingface', hf);
    }

    if (config.providers.cloud?.enabled) {
      const cloud = new CloudProvider(config.providers.cloud.apiKeys || {});
      await cloud.initialize();
      this.providers.set('cloud', cloud);
    }

    // Load available models from all providers
    await this.refreshModelRegistry();

    console.log(`Hybrid AI Manager initialized with ${this.providers.size} providers and ${this.modelRegistry.size} models`);
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    if (request.options.cacheResults && this.responseCache.has(cacheKey)) {
      const cachedResponse = this.responseCache.get(cacheKey)!;
      return { ...cachedResponse, cached: true };
    }

    // Add to queue
    request.id = request.id || this.generateRequestId();
    this.requestQueue.push(request);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, request.options.maxLatency || 30000);

      this.once(`response.${request.id}`, (response: AIResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });

      this.once(`error.${request.id}`, (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async refreshModelRegistry(): Promise<void> {
    this.modelRegistry.clear();

    for (const [providerName, provider] of this.providers) {
      try {
        const models = await provider.getAvailableModels();
        models.forEach(model => {
          this.modelRegistry.set(model.id, model);
        });
      } catch (error) {
        console.error(`Failed to get models from ${providerName}:`, error);
      }
    }
  }

  private startRequestProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.requestQueue.length === 0) return;

      this.isProcessing = true;
      const request = this.requestQueue.shift()!;

      try {
        const response = await this.executeRequest(request);
        
        // Cache if requested
        if (request.options.cacheResults) {
          const cacheKey = this.generateCacheKey(request);
          this.responseCache.set(cacheKey, response);
        }

        this.emit(`response.${request.id}`, response);
      } catch (error) {
        this.emit(`error.${request.id}`, error);
      } finally {
        this.isProcessing = false;
      }
    }, 100); // Process queue every 100ms
  }

  private async executeRequest(request: AIRequest): Promise<AIResponse> {
    // Select best provider and model based on routing policy
    const route = await this.routingPolicy.selectRoute(request, this.modelRegistry, this.providers);
    
    if (!route) {
      throw new Error('No suitable provider found for request');
    }

    const provider = this.providers.get(route.provider);
    if (!provider) {
      throw new Error(`Provider ${route.provider} not available`);
    }

    return await provider.execute(request);
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      // Clean up old cache entries
      const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes
      
      for (const [key, response] of this.responseCache.entries()) {
        if (new Date(response.metadata.processingTime).getTime() < cutoff) {
          this.responseCache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  private generateCacheKey(request: AIRequest): string {
    return `${request.task}_${JSON.stringify(request.input)}_${JSON.stringify(request.options)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API
  getAvailableModels(): AIModel[] {
    return Array.from(this.modelRegistry.values());
  }

  getProviderStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [name, provider] of this.providers) {
      status[name] = provider.healthCheck !== undefined;
    }
    return status;
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const providerStatuses = await Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => ({
        name,
        healthy: await provider.healthCheck(),
        models: await provider.getAvailableModels()
      }))
    );

    return {
      healthy: providerStatuses.every(p => p.healthy),
      providers: providerStatuses,
      totalModels: this.modelRegistry.size,
      queueSize: this.requestQueue.length,
      cacheSize: this.responseCache.size
    };
  }
}

// Routing Policy for Intelligent Model Selection
class RoutingPolicy {
  async selectRoute(
    request: AIRequest, 
    modelRegistry: Map<string, AIModel>, 
    providers: Map<string, ModelProvider>
  ): Promise<RouteSelection | null> {
    const suitableModels = this.findSuitableModels(request, modelRegistry);
    if (suitableModels.length === 0) return null;

    // Priority order: Local (privacy) > Edge > Cloud
    const priorityOrder = this.getPriorityOrder(request);
    
    for (const modelType of priorityOrder) {
      const typeModels = suitableModels.filter(m => m.type === modelType);
      if (typeModels.length === 0) continue;

      // Select best model of this type
      const bestModel = this.selectBestModel(typeModels, request);
      if (bestModel && providers.has(bestModel.provider)) {
        return {
          provider: bestModel.provider,
          model: bestModel,
          reason: `Selected ${bestModel.type} model for ${request.task}`
        };
      }
    }

    return null;
  }

  private findSuitableModels(request: AIRequest, modelRegistry: Map<string, AIModel>): AIModel[] {
    return Array.from(modelRegistry.values()).filter(model => {
      // Check if model supports the task
      const hasCapability = model.capabilities.some(cap => cap.task === request.task);
      if (!hasCapability) return false;

      // Check quality requirements
      if (request.options.minQuality) {
        const capability = model.capabilities.find(cap => cap.task === request.task);
        if (!capability || !this.meetsQualityRequirement(capability.quality, request.options.minQuality)) {
          return false;
        }
      }

      // Check privacy requirements
      if (request.privacyLevel === 'restricted' || request.privacyLevel === 'confidential') {
        return model.type === 'local' || model.type === 'edge';
      }

      return model.status === 'available';
    });
  }

  private getPriorityOrder(request: AIRequest): ('local' | 'edge' | 'cloud')[] {
    // High privacy requirements prefer local processing
    if (request.privacyLevel === 'restricted' || request.privacyLevel === 'confidential') {
      return ['local', 'edge'];
    }

    // Speed-sensitive tasks prefer local if available
    if (request.options.maxLatency && request.options.maxLatency < 1000) {
      return ['local', 'edge', 'cloud'];
    }

    // Quality-sensitive tasks may prefer cloud
    if (request.options.minQuality === 'excellent') {
      return ['cloud', 'local', 'edge'];
    }

    // Default priority
    return request.options.preferLocal 
      ? ['local', 'edge', 'cloud'] 
      : ['local', 'cloud', 'edge'];
  }

  private selectBestModel(models: AIModel[], request: AIRequest): AIModel | null {
    if (models.length === 0) return null;
    if (models.length === 1) return models[0] || null;

    // Score models based on multiple criteria
    const scoredModels = models.map(model => ({
      model,
      score: this.scoreModel(model, request)
    }));

    // Sort by score descending
    scoredModels.sort((a, b) => b.score - a.score);

    return scoredModels[0]?.model || null;
  }

  private scoreModel(model: AIModel, request: AIRequest): number {
    let score = 0;
    const capability = model.capabilities.find(cap => cap.task === request.task);
    if (!capability) return 0;

    // Quality score (0-40 points)
    const qualityScores = { low: 10, medium: 20, high: 30, excellent: 40 };
    score += qualityScores[capability.quality] || 0;

    // Speed score (0-30 points)
    const speedScores = { slow: 5, medium: 15, fast: 25, realtime: 30 };
    score += speedScores[capability.speed] || 0;

    // Privacy bonus for local models (0-20 points)
    if (model.type === 'local' && request.privacyLevel !== 'public') {
      score += 20;
    }

    // Performance score (0-10 points)
    score += Math.min(10, model.performance.accuracy * 10);

    return score;
  }

  private meetsQualityRequirement(modelQuality: string, requiredQuality: string): boolean {
    const qualityLevels = { low: 1, medium: 2, high: 3, excellent: 4 };
    return (qualityLevels[modelQuality as keyof typeof qualityLevels] || 0) >= 
           (qualityLevels[requiredQuality as keyof typeof qualityLevels] || 0);
  }
}

// Configuration and Types
interface HybridAIConfig {
  providers: {
    ollama?: {
      enabled: boolean;
      baseUrl?: string;
    };
    huggingface?: {
      enabled: boolean;
      cacheDir?: string;
    };
    cloud?: {
      enabled: boolean;
      apiKeys?: {
        openai?: string;
        anthropic?: string;
      };
    };
  };
  routing?: {
    preferLocal?: boolean;
    maxLatency?: number;
    cacheEnabled?: boolean;
  };
}

interface RouteSelection {
  provider: string;
  model: AIModel;
  reason: string;
}

interface SystemStatus {
  healthy: boolean;
  providers: Array<{
    name: string;
    healthy: boolean;
    models: AIModel[];
  }>;
  totalModels: number;
  queueSize: number;
  cacheSize: number;
}

// Singleton instance
export const hybridAIManager = new HybridAIManager();

// React Hook for Hybrid AI
export const useHybridAI = () => {
  return {
    processRequest: hybridAIManager.processRequest.bind(hybridAIManager),
    getAvailableModels: hybridAIManager.getAvailableModels.bind(hybridAIManager),
    getSystemStatus: hybridAIManager.getSystemStatus.bind(hybridAIManager),
    getProviderStatus: hybridAIManager.getProviderStatus.bind(hybridAIManager)
  };
};

export default hybridAIManager;
export type { AIModel, AIRequest, AIResponse, HybridAIConfig };