// Advanced Caching System for Performance Optimization
// Multi-layer caching with intelligent invalidation and memory management

import { EventEmitter } from 'events';

// Cache Configuration Types
interface CacheConfig {
  // Memory Cache Settings
  memoryCache: {
    enabled: boolean;
    maxSize: number; // in MB
    ttl: number; // in milliseconds
    maxEntries: number;
  };
  
  // Redis Cache Settings
  redisCache: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    ttl: number;
    keyPrefix: string;
  };
  
  // Browser Cache Settings
  browserCache: {
    enabled: boolean;
    maxSize: number; // in MB
    ttl: number;
  };
  
  // AI Response Cache Settings
  aiCache: {
    enabled: boolean;
    ttl: number;
    maxEntries: number;
    compressionEnabled: boolean;
  };
}

interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
  metadata?: Record<string, any>;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  totalEntries: number;
  averageAccessTime: number;
  topKeys: Array<{ key: string; accessCount: number }>;
}

class MultiLayerCacheManager extends EventEmitter {
  public config: CacheConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private browserCache?: Cache;
  private redisClient?: any; // Redis client instance
  private stats: CacheStats;
  private compressionWorker?: Worker;
  
  constructor(config: Partial<CacheConfig> = {}) {
    super();
    
    this.config = {
      memoryCache: {
        enabled: true,
        maxSize: 100, // 100MB
        ttl: 3600000, // 1 hour
        maxEntries: 1000,
        ...config.memoryCache
      },
      redisCache: {
        enabled: false,
        host: 'localhost',
        port: 6379,
        ttl: 86400000, // 24 hours
        keyPrefix: 'notescape:',
        ...config.redisCache
      },
      browserCache: {
        enabled: true,
        maxSize: 50, // 50MB
        ttl: 1800000, // 30 minutes
        ...config.browserCache
      },
      aiCache: {
        enabled: true,
        ttl: 7200000, // 2 hours
        maxEntries: 500,
        compressionEnabled: true,
        ...config.aiCache
      }
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      totalEntries: 0,
      averageAccessTime: 0,
      topKeys: []
    };
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Initialize browser cache
    if (this.config.browserCache.enabled && typeof window !== 'undefined') {
      try {
        this.browserCache = await caches.open('notescape-cache-v1');
      } catch (error) {
        console.warn('Browser cache initialization failed:', error);
      }
    }

    // Initialize Redis cache
    if (this.config.redisCache.enabled) {
      try {
        // Redis client would be initialized here
        // this.redisClient = new Redis(this.config.redisCache);
      } catch (error) {
        console.warn('Redis cache initialization failed:', error);
      }
    }

    // Initialize compression worker
    if (this.config.aiCache.compressionEnabled) {
      this.initializeCompressionWorker();
    }

    // Start cleanup interval
    setInterval(() => this.cleanup(), 300000); // Every 5 minutes
    
    // Start stats calculation interval
    setInterval(() => this.calculateStats(), 60000); // Every minute
    
    this.emit('initialized');
  }

  private initializeCompressionWorker(): void {
    try {
      const workerCode = `
        self.onmessage = function(e) {
          const { action, data, id } = e.data;
          
          if (action === 'compress') {
            try {
              const compressed = JSON.stringify(data); // Simple JSON compression
              // In real implementation, use actual compression like pako or lz-string
              self.postMessage({ id, result: compressed, success: true });
            } catch (error) {
              self.postMessage({ id, error: error.message, success: false });
            }
          } else if (action === 'decompress') {
            try {
              const decompressed = JSON.parse(data);
              self.postMessage({ id, result: decompressed, success: true });
            } catch (error) {
              self.postMessage({ id, error: error.message, success: false });
            }
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn('Compression worker initialization failed:', error);
    }
  }

  // Main cache operations
  async get<T = any>(key: string, options: {
    useMemory?: boolean;
    useRedis?: boolean;
    useBrowser?: boolean;
    refreshTTL?: boolean;
  } = {}): Promise<T | null> {
    const startTime = Date.now();
    
    const opts = {
      useMemory: true,
      useRedis: true,
      useBrowser: true,
      refreshTTL: false,
      ...options
    };

    try {
      // Check memory cache first (fastest)
      if (opts.useMemory && this.config.memoryCache.enabled) {
        const memoryResult = await this.getFromMemory<T>(key);
        if (memoryResult !== null) {
          this.recordHit(key, Date.now() - startTime);
          return memoryResult;
        }
      }

      // Check Redis cache (medium speed)
      if (opts.useRedis && this.config.redisCache.enabled && this.redisClient) {
        const redisResult = await this.getFromRedis<T>(key);
        if (redisResult !== null) {
          // Store in memory for faster future access
          if (opts.useMemory) {
            await this.setInMemory(key, redisResult, this.config.memoryCache.ttl);
          }
          this.recordHit(key, Date.now() - startTime);
          return redisResult;
        }
      }

      // Check browser cache (slowest but persistent)
      if (opts.useBrowser && this.config.browserCache.enabled && this.browserCache) {
        const browserResult = await this.getFromBrowser<T>(key);
        if (browserResult !== null) {
          // Store in memory and Redis for faster future access
          if (opts.useMemory) {
            await this.setInMemory(key, browserResult, this.config.memoryCache.ttl);
          }
          if (opts.useRedis && this.redisClient) {
            await this.setInRedis(key, browserResult, this.config.redisCache.ttl);
          }
          this.recordHit(key, Date.now() - startTime);
          return browserResult;
        }
      }

      // Cache miss
      this.recordMiss(key, Date.now() - startTime);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.recordMiss(key, Date.now() - startTime);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number, options: {
    useMemory?: boolean;
    useRedis?: boolean;
    useBrowser?: boolean;
    compress?: boolean;
    metadata?: Record<string, any>;
  } = {}): Promise<void> {
    const opts = {
      useMemory: true,
      useRedis: true,
      useBrowser: false,
      compress: false,
      ...options
    };

    try {
      let processedValue = value;
      
      // Apply compression if enabled
      if (opts.compress && this.compressionWorker) {
        processedValue = await this.compress(value);
      }

      // Set in memory cache
      if (opts.useMemory && this.config.memoryCache.enabled) {
        await this.setInMemory(key, processedValue, ttl || this.config.memoryCache.ttl, opts.metadata);
      }

      // Set in Redis cache
      if (opts.useRedis && this.config.redisCache.enabled && this.redisClient) {
        await this.setInRedis(key, processedValue, ttl || this.config.redisCache.ttl);
      }

      // Set in browser cache
      if (opts.useBrowser && this.config.browserCache.enabled && this.browserCache) {
        await this.setInBrowser(key, processedValue, ttl || this.config.browserCache.ttl);
      }

      this.emit('set', { key, value: processedValue, ttl, options: opts });
    } catch (error) {
      console.error('Cache set error:', error);
      this.emit('error', { operation: 'set', key, error });
    }
  }

  // Memory cache operations
  private async getFromMemory<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Decompress if needed
    if (entry.compressed && this.compressionWorker) {
      return await this.decompress(entry.value);
    }

    return entry.value;
  }

  private async setInMemory<T>(key: string, value: T, ttl: number, metadata?: Record<string, any>): Promise<void> {
    const size = this.calculateSize(value);
    
    // Check memory limits
    if (this.getMemoryUsage() + size > this.config.memoryCache.maxSize * 1024 * 1024) {
      await this.evictLeastUsed();
    }

    if (this.memoryCache.size >= this.config.memoryCache.maxEntries) {
      await this.evictLeastUsed();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl,
      size,
      accessCount: 0,
      lastAccessed: Date.now(),
      ...(metadata && { metadata })
    };

    this.memoryCache.set(key, entry);
  }

  // Redis cache operations
  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redisClient) return null;
    
    try {
      const fullKey = this.config.redisCache.keyPrefix + key;
      const data = await this.redisClient.get(fullKey);
      
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  private async setInRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      const fullKey = this.config.redisCache.keyPrefix + key;
      const data = JSON.stringify(value);
      
      await this.redisClient.setex(fullKey, Math.floor(ttl / 1000), data);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  // Browser cache operations
  private async getFromBrowser<T>(key: string): Promise<T | null> {
    if (!this.browserCache) return null;
    
    try {
      const response = await this.browserCache.match(key);
      if (!response) return null;
      
      const data = await response.json();
      
      // Check TTL
      if (Date.now() - data.timestamp > data.ttl) {
        await this.browserCache.delete(key);
        return null;
      }
      
      return data.value;
    } catch (error) {
      console.error('Browser cache get error:', error);
      return null;
    }
  }

  private async setInBrowser<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.browserCache) return;
    
    try {
      const data = {
        value,
        timestamp: Date.now(),
        ttl
      };
      
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      await this.browserCache.put(key, response);
    } catch (error) {
      console.error('Browser cache set error:', error);
    }
  }

  // Compression utilities
  private async compress<T>(value: T): Promise<T> {
    if (!this.compressionWorker) return value;
    
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2);
      
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handler);
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };
      
      this.compressionWorker?.addEventListener('message', handler);
      this.compressionWorker?.postMessage({ action: 'compress', data: value, id });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.compressionWorker!.removeEventListener('message', handler);
        reject(new Error('Compression timeout'));
      }, 5000);
    });
  }

  private async decompress<T>(value: T): Promise<T> {
    if (!this.compressionWorker) return value;
    
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2);
      
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handler);
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };
      
      this.compressionWorker?.addEventListener('message', handler);
      this.compressionWorker?.postMessage({ action: 'decompress', data: value, id });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.compressionWorker!.removeEventListener('message', handler);
        reject(new Error('Decompression timeout'));
      }, 5000);
    });
  }

  // Cache management
  async invalidate(pattern: string): Promise<void> {
    const keys = Array.from(this.memoryCache.keys()).filter(key => 
      key.includes(pattern) || key.match(new RegExp(pattern))
    );
    
    // Remove from memory
    keys.forEach(key => this.memoryCache.delete(key));
    
    // Remove from Redis
    if (this.redisClient) {
      try {
        const redisKeys = await this.redisClient.keys(this.config.redisCache.keyPrefix + '*' + pattern + '*');
        if (redisKeys.length > 0) {
          await this.redisClient.del(...redisKeys);
        }
      } catch (error) {
        console.error('Redis invalidation error:', error);
      }
    }
    
    // Remove from browser cache
    if (this.browserCache) {
      try {
        const browserKeys = await this.browserCache.keys();
        const matchingKeys = browserKeys.filter(request => 
          request.url.includes(pattern)
        );
        await Promise.all(matchingKeys.map(key => this.browserCache!.delete(key)));
      } catch (error) {
        console.error('Browser cache invalidation error:', error);
      }
    }
    
    this.emit('invalidate', { pattern, keysInvalidated: keys.length });
  }

  private async evictLeastUsed(): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => {
        // Sort by access count (ascending) and last accessed time (ascending)
        const accessDiff = a.accessCount - b.accessCount;
        if (accessDiff === 0) {
          return a.lastAccessed - b.lastAccessed;
        }
        return accessDiff;
      });
    
    // Remove 25% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.25));
    
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        this.memoryCache.delete(entry[0]);
      }
    }
    
    this.emit('evict', { entriesRemoved: toRemove });
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      this.emit('cleanup', { expiredKeys: expiredKeys.length });
    }
  }

  // Statistics and monitoring
  private recordHit(key: string, responseTime: number): void {
    this.stats.hits++;
    this.updateAccessStats(key, responseTime);
  }

  private recordMiss(key: string, responseTime: number): void {
    this.stats.misses++;
    this.updateAccessStats(key, responseTime);
  }

  private updateAccessStats(_key: string, responseTime: number): void {
    // Update average access time
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.averageAccessTime = 
      (this.stats.averageAccessTime * (totalRequests - 1) + responseTime) / totalRequests;
  }

  private calculateStats(): void {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    this.stats.memoryUsage = this.getMemoryUsage();
    this.stats.totalEntries = this.memoryCache.size;
    
    // Calculate top accessed keys
    this.stats.topKeys = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }));
  }

  private getMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private calculateSize<T>(value: T): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      // Fallback size estimation
      return JSON.stringify(value).length * 2; // Rough estimate for UTF-16
    }
  }

  // Public API
  getStats(): CacheStats {
    return { ...this.stats };
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(this.config.redisCache.keyPrefix + '*');
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
    
    if (this.browserCache) {
      try {
        const keys = await this.browserCache.keys();
        await Promise.all(keys.map(key => this.browserCache!.delete(key)));
      } catch (error) {
        console.error('Browser cache clear error:', error);
      }
    }
    
    this.emit('clear');
  }

  destroy(): void {
    this.clear();
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    if (this.redisClient) {
      // Close Redis connection
      // this.redisClient.disconnect();
    }
    
    this.removeAllListeners();
  }
}

// Specialized caches for different use cases
export class AICacheManager extends MultiLayerCacheManager {
  constructor(config?: Partial<CacheConfig>) {
    super({
      ...config,
      aiCache: {
        enabled: true,
        ttl: 7200000, // 2 hours for AI responses
        maxEntries: 1000,
        compressionEnabled: true,
        ...config?.aiCache
      }
    });
  }

  async cacheAIResponse(prompt: string, model: string, response: any): Promise<void> {
    const key = this.generateAIKey(prompt, model);
    await this.set(key, response, this.config.aiCache.ttl, {
      compress: true,
      useMemory: true,
      useRedis: true,
      metadata: {
        model,
        promptLength: prompt.length,
        responseType: typeof response,
        timestamp: Date.now()
      }
    });
  }

  async getAIResponse(prompt: string, model: string): Promise<any | null> {
    const key = this.generateAIKey(prompt, model);
    return await this.get(key);
  }

  private generateAIKey(prompt: string, model: string): string {
    // Create a deterministic key based on prompt content and model
    const hash = this.simpleHash(prompt + model);
    return `ai:${model}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Singleton instances
export const cacheManager = new MultiLayerCacheManager();
export const aiCacheManager = new AICacheManager();

export { MultiLayerCacheManager };
export type { CacheConfig, CacheEntry, CacheStats };