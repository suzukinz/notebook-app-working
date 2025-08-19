// Service Registry and Discovery for Microservices Architecture
// Centralized service discovery, health monitoring, and load balancing

interface ServiceInstance {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc';
  endpoints: ServiceEndpoint[];
  metadata: Record<string, any>;
  health: HealthStatus;
  registeredAt: Date;
  lastHeartbeat: Date;
  tags: string[];
}

interface ServiceEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  schema?: Record<string, any>;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    timestamp: Date;
  }>;
  uptime: number; // seconds
  responseTime: number; // milliseconds
}

interface LoadBalancingStrategy {
  type: 'round-robin' | 'weighted' | 'least-connections' | 'consistent-hash';
  config?: Record<string, any>;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
  expectedExceptions: string[];
}

class ServiceRegistry {
  private services: Map<string, ServiceInstance[]> = new Map();
  private loadBalancers: Map<string, LoadBalancer> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthCheckInterval: number = 30000; // 30 seconds
  private cleanupInterval: number = 300000; // 5 minutes

  constructor() {
    this.startHealthChecking();
    this.startCleanup();
  }

  // Service Registration
  async registerService(service: Omit<ServiceInstance, 'id' | 'registeredAt' | 'lastHeartbeat'>): Promise<string> {
    const serviceId = this.generateServiceId(service.name);
    const instance: ServiceInstance = {
      ...service,
      id: serviceId,
      registeredAt: new Date(),
      lastHeartbeat: new Date()
    };

    // Validate service before registration
    await this.validateService(instance);

    // Add to registry
    const serviceName = service.name;
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, []);
    }
    
    this.services.get(serviceName)!.push(instance);

    // Initialize load balancer if not exists
    if (!this.loadBalancers.has(serviceName)) {
      this.loadBalancers.set(serviceName, new LoadBalancer({
        type: 'round-robin'
      }));
    }

    // Initialize circuit breaker
    this.circuitBreakers.set(serviceId, new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 60000,
      expectedExceptions: ['TimeoutError', 'ConnectionError']
    }));

    console.log(`Service registered: ${serviceName}:${serviceId} at ${instance.host}:${instance.port}`);
    
    return serviceId;
  }

  async deregisterService(serviceId: string): Promise<void> {
    for (const [serviceName, instances] of this.services.entries()) {
      const index = instances.findIndex(instance => instance.id === serviceId);
      if (index !== -1) {
        instances.splice(index, 1);
        this.circuitBreakers.delete(serviceId);
        
        if (instances.length === 0) {
          this.services.delete(serviceName);
          this.loadBalancers.delete(serviceName);
        }
        
        console.log(`Service deregistered: ${serviceId}`);
        return;
      }
    }
  }

  // Service Discovery
  async discoverService(serviceName: string, criteria?: ServiceSelectionCriteria): Promise<ServiceInstance | null> {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      return null;
    }

    // Filter by criteria
    let availableInstances = instances.filter(instance => 
      this.isServiceHealthy(instance) && 
      this.matchesCriteria(instance, criteria)
    );

    if (availableInstances.length === 0) {
      // Fallback to unhealthy instances if no healthy ones available
      availableInstances = instances.filter(instance => 
        this.matchesCriteria(instance, criteria)
      );
    }

    if (availableInstances.length === 0) {
      return null;
    }

    // Load balancing
    const loadBalancer = this.loadBalancers.get(serviceName);
    return loadBalancer ? loadBalancer.selectInstance(availableInstances) : availableInstances[0] || null;
  }

  async discoverServices(serviceName: string, limit?: number): Promise<ServiceInstance[]> {
    const instances = this.services.get(serviceName);
    if (!instances) return [];

    const healthyInstances = instances
      .filter(this.isServiceHealthy)
      .slice(0, limit);

    return healthyInstances.length > 0 ? healthyInstances : instances.slice(0, limit);
  }

  // Service Communication
  async callService<T = any>(
    serviceName: string, 
    endpoint: string, 
    options: ServiceCallOptions = {}
  ): Promise<ServiceResponse<T>> {
    const instance = await this.discoverService(serviceName, options.criteria);
    if (!instance) {
      throw new ServiceUnavailableError(`No healthy instances of service '${serviceName}' available`);
    }

    const circuitBreaker = this.circuitBreakers.get(instance.id);
    if (circuitBreaker && circuitBreaker.isOpen()) {
      throw new CircuitBreakerOpenError(`Circuit breaker is open for service '${serviceName}'`);
    }

    try {
      const response = await this.makeRequest<T>(instance, endpoint, options);
      
      // Record success for circuit breaker
      circuitBreaker?.recordSuccess();
      
      return response;
    } catch (error) {
      // Record failure for circuit breaker
      const errorObj = error instanceof Error ? error : new Error(String(error));
      circuitBreaker?.recordFailure(errorObj);
      throw error;
    }
  }

  // Health Monitoring
  private async startHealthChecking(): Promise<void> {
    setInterval(async () => {
      for (const [_serviceName, instances] of this.services.entries()) {
        for (const instance of instances) {
          try {
            const health = await this.checkServiceHealth(instance);
            instance.health = health;
            instance.lastHeartbeat = new Date();
          } catch (error) {
            instance.health = {
              status: 'unhealthy',
              checks: [{
                name: 'connectivity',
                status: 'fail',
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date()
              }],
              uptime: 0,
              responseTime: -1
            };
          }
        }
      }
    }, this.healthCheckInterval);
  }

  private async checkServiceHealth(instance: ServiceInstance): Promise<HealthStatus> {
    const startTime = Date.now();
    const healthEndpoint = instance.endpoints.find(e => e.path === '/health') || 
                          { path: '/health', method: 'GET' as const };

    try {
      const response = await fetch(
        `${instance.protocol}://${instance.host}:${instance.port}${healthEndpoint.path}`,
        {
          method: healthEndpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ServiceRegistry/1.0'
          }
        }
      );

      const responseTime = Date.now() - startTime;
      const healthData = await response.json();

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        checks: healthData.checks || [
          {
            name: 'http',
            status: response.ok ? 'pass' : 'fail',
            message: response.ok ? 'Service responding' : `HTTP ${response.status}`,
            timestamp: new Date()
          }
        ],
        uptime: healthData.uptime || 0,
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: [{
          name: 'connectivity',
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        }],
        uptime: 0,
        responseTime: Date.now() - startTime
      };
    }
  }

  // Service Cleanup
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes

      for (const [serviceName, instances] of this.services.entries()) {
        const activeInstances = instances.filter(instance => 
          now - instance.lastHeartbeat.getTime() < maxAge
        );

        if (activeInstances.length !== instances.length) {
          if (activeInstances.length === 0) {
            this.services.delete(serviceName);
            this.loadBalancers.delete(serviceName);
          } else {
            this.services.set(serviceName, activeInstances);
          }
          
          // Clean up circuit breakers for removed instances
          const removedInstances = instances.filter(i => !activeInstances.includes(i));
          removedInstances.forEach(instance => {
            this.circuitBreakers.delete(instance.id);
          });
        }
      }
    }, this.cleanupInterval);
  }

  // Utility Methods
  private generateServiceId(serviceName: string): string {
    return `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async validateService(service: ServiceInstance): Promise<void> {
    // Validate service configuration
    if (!service.name || !service.host || !service.port) {
      throw new Error('Invalid service configuration: name, host, and port are required');
    }

    // Test connectivity
    try {
      const response = await fetch(
        `${service.protocol}://${service.host}:${service.port}/health`,
        { 
          method: 'GET'
        }
      );
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Service health check failed with status ${response.status}`);
      }
    } catch (error) {
      console.warn(`Service validation warning for ${service.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private isServiceHealthy(instance: ServiceInstance): boolean {
    return instance.health.status === 'healthy' || instance.health.status === 'degraded';
  }

  private matchesCriteria(instance: ServiceInstance, criteria?: ServiceSelectionCriteria): boolean {
    if (!criteria) return true;

    // Version matching
    if (criteria.version && instance.version !== criteria.version) {
      return false;
    }

    // Tag matching
    if (criteria.tags && !criteria.tags.every(tag => instance.tags.includes(tag))) {
      return false;
    }

    // Metadata matching
    if (criteria.metadata) {
      for (const [key, value] of Object.entries(criteria.metadata)) {
        if (instance.metadata[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private async makeRequest<T>(
    instance: ServiceInstance, 
    endpoint: string, 
    options: ServiceCallOptions
  ): Promise<ServiceResponse<T>> {
    const url = `${instance.protocol}://${instance.host}:${instance.port}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Request-ID': this.generateRequestId(),
          'X-Service-Source': 'service-registry',
          ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : null
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        responseTime,
        instance: {
          id: instance.id,
          name: instance.name,
          host: instance.host,
          port: instance.port
        }
      };
    } catch (error) {
      throw new ServiceCallError(
        `Failed to call service ${instance.name}: ${error instanceof Error ? error.message : String(error)}`,
        instance,
        endpoint,
        Date.now() - startTime
      );
    }
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API for metrics and monitoring
  getServiceMetrics(serviceName?: string): ServiceMetrics {
    if (serviceName) {
      const instances = this.services.get(serviceName) || [];
      return this.calculateServiceMetrics(serviceName, instances);
    }

    const allMetrics: Record<string, ServiceMetrics> = {};
    for (const [name, instances] of this.services.entries()) {
      allMetrics[name] = this.calculateServiceMetrics(name, instances);
    }

    return {
      services: allMetrics,
      totalServices: this.services.size,
      totalInstances: Array.from(this.services.values()).flat().length,
      healthyInstances: Array.from(this.services.values())
        .flat()
        .filter(this.isServiceHealthy).length
    };
  }

  private calculateServiceMetrics(serviceName: string, instances: ServiceInstance[]): ServiceMetrics {
    const healthyInstances = instances.filter(this.isServiceHealthy);
    const avgResponseTime = instances.length > 0 
      ? instances.reduce((sum, i) => sum + i.health.responseTime, 0) / instances.length 
      : 0;

    return {
      name: serviceName,
      instanceCount: instances.length,
      healthyInstances: healthyInstances.length,
      availabilityPercentage: instances.length > 0 
        ? (healthyInstances.length / instances.length) * 100 
        : 0,
      averageResponseTime: avgResponseTime,
      versions: [...new Set(instances.map(i => i.version))],
      endpoints: instances[0]?.endpoints.map(e => e.path) || []
    };
  }
}

// Load Balancer Implementation
class LoadBalancer {
  private strategy: LoadBalancingStrategy;
  private lastUsedIndex: number = 0;
  private connectionCounts: Map<string, number> = new Map();

  constructor(strategy: LoadBalancingStrategy) {
    this.strategy = strategy;
  }

  selectInstance(instances: ServiceInstance[]): ServiceInstance {
    if (instances.length === 0) {
      throw new Error('No instances available for load balancing');
    }

    if (instances.length === 1) {
      return instances[0]!;
    }

    switch (this.strategy.type) {
      case 'round-robin':
        return this.roundRobinSelection(instances);
      case 'weighted':
        return this.weightedSelection(instances);
      case 'least-connections':
        return this.leastConnectionsSelection(instances);
      case 'consistent-hash':
        return this.consistentHashSelection(instances);
      default:
        return this.roundRobinSelection(instances);
    }
  }

  private roundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    this.lastUsedIndex = (this.lastUsedIndex + 1) % instances.length;
    return instances[this.lastUsedIndex]!;
  }

  private weightedSelection(instances: ServiceInstance[]): ServiceInstance {
    // Use response time as inverse weight (lower response time = higher weight)
    const weights = instances.map(instance => {
      const responseTime = Math.max(instance.health.responseTime, 1);
      return 1000 / responseTime; // Inverse weight
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < instances.length; i++) {
      random -= weights[i] || 0;
      if (random <= 0) {
        return instances[i]!;
      }
    }

    return instances[instances.length - 1]!;
  }

  private leastConnectionsSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((least, current) => {
      const leastConnections = this.connectionCounts.get(least.id) || 0;
      const currentConnections = this.connectionCounts.get(current.id) || 0;
      return currentConnections < leastConnections ? current : least;
    });
  }

  private consistentHashSelection(instances: ServiceInstance[]): ServiceInstance {
    // Simple hash-based selection (in production, use proper consistent hashing)
    const hashKey = this.strategy.config?.hashKey || 'default';
    const hash = this.simpleHash(hashKey);
    const index = hash % instances.length;
    return instances[index]!;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  recordConnection(instanceId: string): void {
    const count = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, count + 1);
  }

  recordDisconnection(instanceId: string): void {
    const count = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, Math.max(0, count - 1));
  }
}

// Circuit Breaker Implementation
class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) { // Reset after 3 successful calls
        this.state = 'closed';
      }
    }
  }

  recordFailure(error: Error): void {
    if (this.isExpectedException(error)) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.config.failureThreshold) {
        this.state = 'open';
      }
    }
  }

  private isExpectedException(error: Error): boolean {
    return this.config.expectedExceptions.some(exceptionType => 
      error.constructor.name === exceptionType || error.message.includes(exceptionType)
    );
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Types and Interfaces
interface ServiceSelectionCriteria {
  version?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface ServiceCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  criteria?: ServiceSelectionCriteria;
}

interface ServiceResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
  responseTime: number;
  instance: {
    id: string;
    name: string;
    host: string;
    port: number;
  };
}

interface ServiceMetrics {
  name?: string;
  instanceCount?: number;
  healthyInstances?: number;
  availabilityPercentage?: number;
  averageResponseTime?: number;
  versions?: string[];
  endpoints?: string[];
  services?: Record<string, ServiceMetrics>;
  totalServices?: number;
  totalInstances?: number;
}

// Custom Errors
class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

class ServiceCallError extends Error {
  constructor(
    message: string, 
    public instance: ServiceInstance, 
    public endpoint: string, 
    public responseTime: number
  ) {
    super(message);
    this.name = 'ServiceCallError';
  }
}

// Singleton instance for global use
export const serviceRegistry = new ServiceRegistry();

// React hook for service discovery
export const useServiceRegistry = () => {
  return {
    discoverService: serviceRegistry.discoverService.bind(serviceRegistry),
    discoverServices: serviceRegistry.discoverServices.bind(serviceRegistry),
    callService: serviceRegistry.callService.bind(serviceRegistry),
    getServiceMetrics: serviceRegistry.getServiceMetrics.bind(serviceRegistry)
  };
};

export default ServiceRegistry;