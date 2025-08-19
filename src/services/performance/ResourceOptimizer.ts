// Resource Optimization System
// Intelligent resource loading, preloading, and optimization

interface ResourceConfig {
  preload: {
    enabled: boolean;
    priority: 'high' | 'medium' | 'low';
    resources: string[];
  };
  lazyLoading: {
    enabled: boolean;
    threshold: number; // pixels before viewport
    rootMargin: string;
  };
  bundleOptimization: {
    enabled: boolean;
    chunkSize: number;
    maxChunks: number;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'auto';
    level: number;
  };
  caching: {
    enabled: boolean;
    maxAge: number;
    staleWhileRevalidate: number;
  };
}

interface ResourceMetrics {
  totalSize: number;
  compressedSize: number;
  loadTime: number;
  cacheHits: number;
  cacheMisses: number;
  optimizationSavings: number;
}

class ResourceOptimizer {
  private config: ResourceConfig;
  private metrics: ResourceMetrics;
  private intersectionObserver?: IntersectionObserver;
  private preloadedResources: Set<string> = new Set();
  private loadingQueue: Map<string, Promise<any>> = new Map();
  private resourceCache: Map<string, any> = new Map();
  
  constructor(config?: Partial<ResourceConfig>) {
    this.config = {
      preload: {
        enabled: true,
        priority: 'high',
        resources: [],
        ...config?.preload
      },
      lazyLoading: {
        enabled: true,
        threshold: 100,
        rootMargin: '100px',
        ...config?.lazyLoading
      },
      bundleOptimization: {
        enabled: true,
        chunkSize: 250000, // 250KB
        maxChunks: 10,
        ...config?.bundleOptimization
      },
      compression: {
        enabled: true,
        algorithm: 'auto',
        level: 6,
        ...config?.compression
      },
      caching: {
        enabled: true,
        maxAge: 86400000, // 24 hours
        staleWhileRevalidate: 3600000, // 1 hour
        ...config?.caching
      }
    };
    
    this.metrics = {
      totalSize: 0,
      compressedSize: 0,
      loadTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      optimizationSavings: 0
    };
    
    this.initialize();
  }

  private initialize(): void {
    // Setup intersection observer for lazy loading
    if (this.config.lazyLoading.enabled && typeof window !== 'undefined') {
      this.setupLazyLoading();
    }
    
    // Setup service worker for advanced caching
    if (this.config.caching.enabled && 'serviceWorker' in navigator) {
      this.setupServiceWorker();
    }
    
    // Preload critical resources
    if (this.config.preload.enabled) {
      this.preloadResources();
    }
    
    console.log('⚡ Resource optimizer initialized');
  }

  private setupLazyLoading(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            this.loadLazyResource(element);
            this.intersectionObserver!.unobserve(element);
          }
        });
      },
      {
        rootMargin: this.config.lazyLoading.rootMargin,
        threshold: 0.1
      }
    );
  }

  private async setupServiceWorker(): Promise<void> {
    // Temporarily disabled to mitigate reload loops during debugging
    return;
  }

  private async preloadResources(): Promise<void> {
    const resources = this.config.preload.resources;
    
    if (resources.length === 0) {
      // Auto-detect critical resources
      this.autoDetectCriticalResources();
      return;
    }
    
    const preloadPromises = resources.map(resource => this.preloadResource(resource));
    await Promise.allSettled(preloadPromises);
  }

  private autoDetectCriticalResources(): void {
    if (typeof window === 'undefined') return;
    
    // Detect critical CSS
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach(sheet => {
      if (sheet.href && !this.preloadedResources.has(sheet.href)) {
        this.preloadResource(sheet.href, 'style');
      }
    });
    
    // Detect critical fonts
    const links = Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'));
    links.forEach(link => {
      const href = (link as HTMLLinkElement).href;
      if (href && !this.preloadedResources.has(href)) {
        this.preloadResource(href, 'font');
      }
    });
    
    // Detect above-the-fold images
    const images = Array.from(document.querySelectorAll('img'));
    const viewportHeight = window.innerHeight;
    
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.top < viewportHeight && img.src && !this.preloadedResources.has(img.src)) {
        this.preloadResource(img.src, 'image');
      }
    });
  }

  private async preloadResource(url: string, type?: string): Promise<void> {
    if (this.preloadedResources.has(url)) return;
    
    this.preloadedResources.add(url);
    
    try {
      // Use link preload for modern browsers
      if (typeof document !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        
        if (type) {
          link.as = type;
        } else {
          // Auto-detect type from URL
          if (url.match(/\.(css)$/)) link.as = 'style';
          else if (url.match(/\.(js)$/)) link.as = 'script';
          else if (url.match(/\.(woff|woff2|ttf|otf)$/)) link.as = 'font';
          else if (url.match(/\.(png|jpg|jpeg|webp|avif)$/)) link.as = 'image';
        }
        
        document.head.appendChild(link);
      }
      
      // Also use fetch for more control
      const response = await fetch(url);
      
      if (response.ok) {
        this.resourceCache.set(url, response.clone());
        console.log(`✅ Preloaded: ${url}`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to preload: ${url}`, error);
    }
  }

  // Lazy loading implementation
  observeForLazyLoading(element: HTMLElement): void {
    if (!this.intersectionObserver) return;
    
    element.setAttribute('data-lazy', 'true');
    this.intersectionObserver.observe(element);
  }

  private async loadLazyResource(element: HTMLElement): Promise<void> {
    const tagName = element.tagName.toLowerCase();
    
    try {
      switch (tagName) {
        case 'img':
          await this.loadLazyImage(element as HTMLImageElement);
          break;
        case 'iframe':
          await this.loadLazyIframe(element as HTMLIFrameElement);
          break;
        case 'video':
          await this.loadLazyVideo(element as HTMLVideoElement);
          break;
        default:
          // Handle custom lazy elements
          await this.loadCustomLazyElement(element);
      }
    } catch (error) {
      console.error('Lazy loading failed:', error);
    }
  }

  private async loadLazyImage(img: HTMLImageElement): Promise<void> {
    const src = img.getAttribute('data-src');
    const srcset = img.getAttribute('data-srcset');
    
    if (!src) return;
    
    // Show loading placeholder
    img.style.filter = 'blur(5px)';
    
    // Load image
    const tempImg = new Image();
    
    await new Promise((resolve, reject) => {
      tempImg.onload = resolve;
      tempImg.onerror = reject;
      
      if (srcset) tempImg.srcset = srcset;
      tempImg.src = src;
    });
    
    // Apply loaded image
    img.src = src;
    if (srcset) img.srcset = srcset;
    
    // Remove blur effect
    img.style.transition = 'filter 0.3s ease';
    img.style.filter = 'none';
    
    // Clean up
    img.removeAttribute('data-src');
    img.removeAttribute('data-srcset');
    img.removeAttribute('data-lazy');
  }

  private async loadLazyIframe(iframe: HTMLIFrameElement): Promise<void> {
    const src = iframe.getAttribute('data-src');
    if (!src) return;
    
    iframe.src = src;
    iframe.removeAttribute('data-src');
    iframe.removeAttribute('data-lazy');
  }

  private async loadLazyVideo(video: HTMLVideoElement): Promise<void> {
    const src = video.getAttribute('data-src');
    const poster = video.getAttribute('data-poster');
    
    if (src) {
      video.src = src;
      video.removeAttribute('data-src');
    }
    
    if (poster) {
      video.poster = poster;
      video.removeAttribute('data-poster');
    }
    
    video.removeAttribute('data-lazy');
  }

  private async loadCustomLazyElement(element: HTMLElement): Promise<void> {
    // Handle custom data attributes
    const attributes = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-lazy-'));
    
    attributes.forEach(attr => {
      const realAttr = attr.name.replace('data-lazy-', '');
      element.setAttribute(realAttr, attr.value);
      element.removeAttribute(attr.name);
    });
    
    element.removeAttribute('data-lazy');
    
    // Trigger custom event
    element.dispatchEvent(new CustomEvent('lazy-loaded'));
  }

  // Advanced loading strategies
  async loadWithPriority<T>(url: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<T> {
    // Check cache first
    if (this.resourceCache.has(url)) {
      this.metrics.cacheHits++;
      return this.resourceCache.get(url);
    }
    
    this.metrics.cacheMisses++;
    
    // Check if already loading
    if (this.loadingQueue.has(url)) {
      return this.loadingQueue.get(url);
    }
    
    // Start loading
    const loadPromise = this.performLoad<T>(url, priority);
    this.loadingQueue.set(url, loadPromise);
    
    try {
      const result = await loadPromise;
      this.resourceCache.set(url, result);
      return result;
    } finally {
      this.loadingQueue.delete(url);
    }
  }

  private async performLoad<T>(url: string, _priority: string): Promise<T> {
    const startTime = performance.now();
    
    const response = await fetch(url, {
      cache: this.config.caching.enabled ? 'force-cache' : 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load resource: ${url}`);
    }
    
    const loadTime = performance.now() - startTime;
    this.metrics.loadTime += loadTime;
    
    // Determine content type and parse accordingly
    const contentType = response.headers.get('content-type') || '';
    
    let result: T;
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else if (contentType.includes('text/')) {
      result = await response.text() as any;
    } else {
      result = await response.blob() as any;
    }
    
    // Update metrics
    const originalSize = response.headers.get('content-length');
    if (originalSize) {
      this.metrics.totalSize += parseInt(originalSize, 10);
      
      // Estimate compressed size
      const actualSize = new Blob([JSON.stringify(result)]).size;
      this.metrics.compressedSize += actualSize;
      this.metrics.optimizationSavings += parseInt(originalSize, 10) - actualSize;
    }
    
    return result;
  }

  // Bundle optimization
  async loadModuleChunk(chunkId: string): Promise<any> {
    const chunkUrl = `/chunks/${chunkId}.js`;
    
    // Check if chunk is already loaded
    if ((window as any).__CHUNKS__ && (window as any).__CHUNKS__[chunkId]) {
      return (window as any).__CHUNKS__[chunkId];
    }
    
    // Load chunk dynamically
    const module = await import(chunkUrl);
    
    // Store in global chunks registry
    if (!(window as any).__CHUNKS__) {
      (window as any).__CHUNKS__ = {};
    }
    (window as any).__CHUNKS__[chunkId] = module;
    
    return module;
  }

  // Progressive loading
  async loadProgressively<T>(urls: string[], onProgress?: (loaded: number, total: number) => void): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      if (!url) continue;
      
      try {
        const result = await this.loadWithPriority<T>(url);
        results.push(result);
        
        if (onProgress) {
          onProgress(i + 1, urls.length);
        }
      } catch (error) {
        console.error(`Failed to load resource ${url}:`, error);
        // Continue loading other resources
      }
    }
    
    return results;
  }

  // Image optimization
  async optimizeImages(container: HTMLElement): Promise<void> {
    const images = Array.from(container.querySelectorAll('img'));
    
    for (const img of images) {
      await this.optimizeImage(img as HTMLImageElement);
    }
  }

  private async optimizeImage(img: HTMLImageElement): Promise<void> {
    // Skip if already optimized
    if (img.getAttribute('data-optimized')) return;
    
    const src = img.src || img.getAttribute('data-src');
    if (!src) return;
    
    try {
      // Generate responsive image URLs
      const sizes = [320, 640, 1024, 1280, 1920];
      const format = this.getSupportedImageFormat();
      
      const srcSet = sizes.map(size => {
        const optimizedUrl = this.generateOptimizedImageUrl(src, size, format);
        return `${optimizedUrl} ${size}w`;
      }).join(', ');
      
      // Set responsive attributes
      if (img.getAttribute('data-src')) {
        img.setAttribute('data-srcset', srcSet);
      } else {
        img.srcset = srcSet;
        img.sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw';
      }
      
      // Add loading attribute
      if ('loading' in HTMLImageElement.prototype) {
        img.loading = 'lazy';
      }
      
      img.setAttribute('data-optimized', 'true');
      
    } catch (error) {
      console.error('Image optimization failed:', error);
    }
  }

  private getSupportedImageFormat(): string {
    // Check for modern format support
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    // Check AVIF support
    if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
      return 'avif';
    }
    
    // Check WebP support
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
      return 'webp';
    }
    
    return 'jpeg';
  }

  private generateOptimizedImageUrl(src: string, width: number, format: string): string {
    // This would typically integrate with an image optimization service
    // For now, return a placeholder URL structure
    const url = new URL(src, window.location.origin);
    url.searchParams.set('w', width.toString());
    url.searchParams.set('f', format);
    url.searchParams.set('q', '80'); // Quality
    return url.toString();
  }

  // Font optimization
  async optimizeFonts(): Promise<void> {
    if (typeof document === 'undefined') return;
    
    // Preload critical fonts
    const fontLinks = Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'));
    
    fontLinks.forEach(link => {
      const href = (link as HTMLLinkElement).href;
      if (href) {
        this.preloadResource(href, 'font');
      }
    });
    
    // Add font-display: swap to improve loading performance
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }

  // Cleanup and utilities
  cleanup(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    this.resourceCache.clear();
    this.loadingQueue.clear();
    this.preloadedResources.clear();
  }

  getMetrics(): ResourceMetrics {
    return { ...this.metrics };
  }

  getOptimizationReport(): {
    metrics: ResourceMetrics;
    recommendations: string[];
    savings: {
      size: number;
      time: number;
      requests: number;
    };
  } {
    const recommendations: string[] = [];
    
    // Analyze metrics and generate recommendations
    if (this.metrics.cacheMisses > this.metrics.cacheHits) {
      recommendations.push('Increase cache usage to improve performance');
    }
    
    if (this.metrics.optimizationSavings < this.metrics.totalSize * 0.3) {
      recommendations.push('Enable compression to reduce transfer sizes');
    }
    
    const averageLoadTime = this.metrics.loadTime / (this.metrics.cacheHits + this.metrics.cacheMisses);
    if (averageLoadTime > 1000) {
      recommendations.push('Optimize resource loading to improve response times');
    }
    
    return {
      metrics: this.getMetrics(),
      recommendations,
      savings: {
        size: this.metrics.optimizationSavings,
        time: this.metrics.loadTime * 0.3, // Estimated time savings
        requests: this.metrics.cacheHits
      }
    };
  }
}

// Singleton instance
export const resourceOptimizer = new ResourceOptimizer();

// React Hook for resource optimization
export const useResourceOptimizer = () => {
  return {
    loadWithPriority: <T>(url: string, priority?: 'high' | 'medium' | 'low') => 
      resourceOptimizer.loadWithPriority<T>(url, priority),
    loadProgressively: <T>(urls: string[], onProgress?: (loaded: number, total: number) => void) => 
      resourceOptimizer.loadProgressively<T>(urls, onProgress),
    observeForLazyLoading: (element: HTMLElement) => 
      resourceOptimizer.observeForLazyLoading(element),
    optimizeImages: (container: HTMLElement) => 
      resourceOptimizer.optimizeImages(container),
    getMetrics: () => resourceOptimizer.getMetrics(),
    getOptimizationReport: () => resourceOptimizer.getOptimizationReport()
  };
};

export { ResourceOptimizer };
export type { ResourceConfig, ResourceMetrics };