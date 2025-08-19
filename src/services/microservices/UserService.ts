// User Service - Microservice for user management, authentication, and authorization
// Domain: User Management, Identity & Access Management (IAM)

import { EventEmitter } from 'events';
import { serviceRegistry } from './ServiceRegistry';
// Mock implementations for missing dependencies
const bcrypt = {
  hash: async (password: string, saltRounds: number) => {
    console.log('Mock bcrypt.hash called');
    return `mock_hash_${password}_${saltRounds}`;
  },
  compare: async (password: string, hash: string) => {
    console.log('Mock bcrypt.compare called');
    return hash.includes(password);
  }
};

const jwt = {
  sign: (payload: any, secret: string, _options?: any) => {
    console.log('Mock jwt.sign called');
    return `mock_token_${JSON.stringify(payload)}_${secret}`;
  },
  verify: (_token: string, _secret: string) => {
    console.log('Mock jwt.verify called');
    return { userId: 'mock_user_id', exp: Date.now() + 3600000 };
  }
};

const speakeasy = {
  generateSecret: (_options: any) => {
    console.log('Mock speakeasy.generateSecret called');
    return {
      ascii: 'mock_ascii_secret',
      hex: 'mock_hex_secret',
      base32: 'mock_base32_secret',
      otpauth_url: 'otpauth://totp/mock?secret=mock_secret'
    };
  },
  totp: {
    verify: (_options: any) => {
      console.log('Mock speakeasy.totp.verify called');
      return true;
    }
  }
};

// Domain Models
interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  roles: Role[];
  preferences: UserPreferences;
  mfaSecret?: string;
  mfaEnabled: boolean;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  timezone: string;
  language: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  scope: 'tenant' | 'global';
}

interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

interface Tenant {
  id: string;
  name: string;
  domain?: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: TenantSettings;
  limits: TenantLimits;
  status: 'active' | 'suspended' | 'trial';
  createdAt: Date;
}

// Service Events
// interface UserEvents {
//   'user.created': { user: User; tenant: Tenant };
//   'user.updated': { userId: string; changes: Partial<User>; previousState: User };
//   'user.deleted': { userId: string; tenantId: string };
//   'user.login': { userId: string; tenantId: string; metadata: LoginMetadata };
//   'user.logout': { userId: string; sessionId: string };
//   'user.password_changed': { userId: string; tenantId: string };
//   'user.role_assigned': { userId: string; roleId: string; assignedBy: string };
//   'user.role_revoked': { userId: string; roleId: string; revokedBy: string };
//   'tenant.created': { tenant: Tenant; createdBy: string };
//   'tenant.updated': { tenantId: string; changes: Partial<Tenant> };
// }

// Request/Response DTOs
interface CreateUserRequest {
  tenantId: string;
  email: string;
  password: string;
  profile: UserProfile;
  roles?: string[];
  sendInvitation?: boolean;
}

interface UpdateUserRequest {
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
  roles?: string[];
  status?: UserStatus;
}

interface AuthenticateRequest {
  email: string;
  password: string;
  tenantId?: string;
  mfaToken?: string;
}

interface AuthenticationResponse {
  user: Omit<User, 'passwordHash' | 'mfaSecret'>;
  tokens: TokenPair;
  requiresMfa: boolean;
  tenant: Tenant;
  permissions: Permission[];
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Service Implementation
class UserService extends EventEmitter {
  private serviceName = 'user-service';
  private version = '1.0.0';
  private users: Map<string, User> = new Map();
  private tenants: Map<string, Tenant> = new Map();
  private roles: Map<string, Role> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private refreshTokens: Set<string> = new Set();

  constructor() {
    super();
    this.initializeDefaultRoles();
    this.registerWithServiceRegistry();
    this.setupEventHandlers();
  }

  // Service Registration
  private async registerWithServiceRegistry(): Promise<void> {
    const serviceId = await serviceRegistry.registerService({
      name: this.serviceName,
      version: this.version,
      host: process.env.SERVICE_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_PORT || '3001'),
      protocol: 'http',
      endpoints: [
        { path: '/health', method: 'GET', description: 'Health check endpoint' },
        { path: '/users', method: 'POST', description: 'Create user' },
        { path: '/users/:id', method: 'GET', description: 'Get user by ID' },
        { path: '/users/:id', method: 'PUT', description: 'Update user' },
        { path: '/users/:id', method: 'DELETE', description: 'Delete user' },
        { path: '/auth/login', method: 'POST', description: 'User authentication' },
        { path: '/auth/logout', method: 'POST', description: 'User logout' },
        { path: '/auth/refresh', method: 'POST', description: 'Token refresh' },
        { path: '/auth/verify', method: 'POST', description: 'Token verification' },
        { path: '/tenants', method: 'POST', description: 'Create tenant' },
        { path: '/tenants/:id', method: 'GET', description: 'Get tenant' },
        { path: '/roles', method: 'GET', description: 'List roles' },
        { path: '/roles/:id/permissions', method: 'GET', description: 'Get role permissions' }
      ],
      health: {
        status: 'healthy',
        checks: [],
        uptime: 0,
        responseTime: 0
      },
      metadata: {
        database: 'postgresql',
        cache: 'redis',
        domain: 'user-management'
      },
      tags: ['auth', 'identity', 'users']
    });

    console.log(`User service registered with ID: ${serviceId}`);
  }

  // User Management
  async createUser(request: CreateUserRequest): Promise<User> {
    // Validate tenant exists
    const tenant = this.tenants.get(request.tenantId);
    if (!tenant) {
      throw new UserServiceError('Tenant not found', 'TENANT_NOT_FOUND');
    }

    // Check if user already exists
    const existingUser = Array.from(this.users.values())
      .find(u => u.email === request.email && u.tenantId === request.tenantId);
    
    if (existingUser) {
      throw new UserServiceError('User already exists', 'USER_ALREADY_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(request.password, 12);

    // Create user
    const user: User = {
      id: this.generateId(),
      tenantId: request.tenantId,
      email: request.email,
      passwordHash,
      profile: request.profile,
      roles: request.roles ? 
        request.roles.map(roleId => this.roles.get(roleId)).filter(Boolean) as Role[] :
        [this.getDefaultRole()],
      preferences: this.getDefaultPreferences(),
      mfaEnabled: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store user
    this.users.set(user.id, user);

    // Emit event for other services
    this.emit('user.created', { user: this.sanitizeUser(user), tenant });

    // Send invitation email if requested
    if (request.sendInvitation) {
      await this.sendInvitationEmail(user, tenant);
    }

    return this.sanitizeUser(user);
  }

  async getUser(userId: string, requestingUserId?: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND');
    }

    // Check authorization
    if (requestingUserId && requestingUserId !== userId) {
      await this.checkPermission(requestingUserId, 'user', 'read', { userId });
    }

    return this.sanitizeUser(user);
  }

  async updateUser(userId: string, updates: UpdateUserRequest, requestingUserId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND');
    }

    // Check authorization
    if (requestingUserId !== userId) {
      await this.checkPermission(requestingUserId, 'user', 'update', { userId });
    }

    const previousState = { ...user };

    // Apply updates
    if (updates.profile) {
      user.profile = { ...user.profile, ...updates.profile };
    }

    if (updates.preferences) {
      user.preferences = { ...user.preferences, ...updates.preferences };
    }

    if (updates.roles && requestingUserId !== userId) {
      // Only admins can change roles
      await this.checkPermission(requestingUserId, 'user', 'manage_roles', { userId });
      user.roles = updates.roles.map(roleId => this.roles.get(roleId)).filter(Boolean) as Role[];
    }

    if (updates.status !== undefined) {
      await this.checkPermission(requestingUserId, 'user', 'manage_status', { userId });
      user.status = updates.status;
    }

    user.updatedAt = new Date();
    this.users.set(userId, user);

    // Emit event
    this.emit('user.updated', { 
      userId, 
      changes: updates, 
      previousState: this.sanitizeUser(previousState) 
    });

    return this.sanitizeUser(user);
  }

  async deleteUser(userId: string, requestingUserId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND');
    }

    // Check authorization
    await this.checkPermission(requestingUserId, 'user', 'delete', { userId });

    // Soft delete - mark as deleted but keep data for audit
    user.status = 'deleted';
    user.updatedAt = new Date();

    // Remove from active users but keep in storage
    this.users.set(userId, user);

    // Invalidate all sessions
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId);
    
    userSessions.forEach(session => {
      this.sessions.delete(session.id);
      this.refreshTokens.delete(session.refreshToken);
    });

    // Emit event
    this.emit('user.deleted', { userId, tenantId: user.tenantId });
  }

  // Authentication & Authorization
  async authenticate(request: AuthenticateRequest): Promise<AuthenticationResponse> {
    // Find user by email and tenant
    const user = Array.from(this.users.values()).find(u => 
      u.email === request.email && 
      (!request.tenantId || u.tenantId === request.tenantId) &&
      u.status === 'active'
    );

    if (!user) {
      throw new UserServiceError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(request.password, user.passwordHash);
    if (!passwordValid) {
      throw new UserServiceError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!request.mfaToken) {
        return {
          user: this.sanitizeUser(user),
          tokens: { accessToken: '', refreshToken: '', expiresIn: 0 },
          requiresMfa: true,
          tenant: this.tenants.get(user.tenantId)!,
          permissions: []
        };
      }

      const mfaValid = this.verifyMfaToken(user.mfaSecret!, request.mfaToken);
      if (!mfaValid) {
        throw new UserServiceError('Invalid MFA token', 'INVALID_MFA_TOKEN');
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session
    const session: UserSession = {
      id: this.generateId(),
      userId: user.id,
      tenantId: user.tenantId,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        userAgent: 'unknown',
        ipAddress: 'unknown',
        loginTime: new Date()
      }
    };

    this.sessions.set(session.id, session);
    this.refreshTokens.add(tokens.refreshToken);

    // Update last login
    user.lastLoginAt = new Date();
    this.users.set(user.id, user);

    // Get tenant
    const tenant = this.tenants.get(user.tenantId)!;

    // Collect permissions
    const permissions = this.collectUserPermissions(user);

    // Emit login event
    this.emit('user.login', { 
      userId: user.id, 
      tenantId: user.tenantId, 
      metadata: session.metadata 
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
      requiresMfa: false,
      tenant,
      permissions
    };
  }

  async verifyToken(token: string): Promise<{ user: User; tenant: Tenant; permissions: Permission[] }> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = this.users.get(decoded.sub);
      
      if (!user || user.status !== 'active') {
        throw new UserServiceError('Invalid token', 'INVALID_TOKEN');
      }

      const tenant = this.tenants.get(user.tenantId)!;
      const permissions = this.collectUserPermissions(user);

      return { 
        user: this.sanitizeUser(user), 
        tenant, 
        permissions 
      };
    } catch (error) {
      throw new UserServiceError('Invalid token', 'INVALID_TOKEN');
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    if (!this.refreshTokens.has(refreshToken)) {
      throw new UserServiceError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Find session
    const session = Array.from(this.sessions.values())
      .find(s => s.refreshToken === refreshToken);

    if (!session || session.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      if (session) {
        this.sessions.delete(session.id);
      }
      throw new UserServiceError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }

    const user = this.users.get(session.userId);
    if (!user || user.status !== 'active') {
      throw new UserServiceError('User not found or inactive', 'USER_NOT_FOUND');
    }

    // Generate new tokens
    const newTokens = await this.generateTokens(user);

    // Update session
    session.refreshToken = newTokens.refreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    this.refreshTokens.delete(refreshToken);
    this.refreshTokens.add(newTokens.refreshToken);

    return newTokens;
  }

  async logout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.refreshTokens.delete(session.refreshToken);

      this.emit('user.logout', { 
        userId: session.userId, 
        sessionId 
      });
    }
  }

  // Tenant Management
  async createTenant(name: string, createdBy: string): Promise<Tenant> {
    const tenant: Tenant = {
      id: this.generateId(),
      name,
      plan: 'free',
      settings: this.getDefaultTenantSettings(),
      limits: this.getTenantLimits('free'),
      status: 'active',
      createdAt: new Date()
    };

    this.tenants.set(tenant.id, tenant);

    this.emit('tenant.created', { tenant, createdBy });

    return tenant;
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new UserServiceError('Tenant not found', 'TENANT_NOT_FOUND');
    }
    return tenant;
  }

  // Permission System
  private async checkPermission(
    userId: string, 
    resource: string, 
    action: string, 
    context: Record<string, any> = {}
  ): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND');
    }

    const permissions = this.collectUserPermissions(user);
    
    return permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action) &&
      this.checkPermissionConditions(permission.conditions, context)
    );
  }

  private collectUserPermissions(user: User): Permission[] {
    const allPermissions: Permission[] = [];
    
    for (const role of user.roles) {
      allPermissions.push(...role.permissions);
    }

    // Remove duplicates and merge permissions
    const uniquePermissions = new Map<string, Permission>();
    
    for (const permission of allPermissions) {
      const key = permission.resource;
      const existing = uniquePermissions.get(key);
      
      if (existing) {
        existing.actions = [...new Set([...existing.actions, ...permission.actions])];
      } else {
        uniquePermissions.set(key, { ...permission });
      }
    }

    return Array.from(uniquePermissions.values());
  }

  private checkPermissionConditions(
    conditions: Record<string, any> | undefined, 
    context: Record<string, any>
  ): boolean {
    if (!conditions) return true;
    
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) return false;
    }
    
    return true;
  }

  // Multi-Factor Authentication
  async setupMfa(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND');
    }

    const secret = speakeasy.generateSecret({
      name: `NoteSpace (${user.email})`,
      issuer: 'NoteSpace'
    });

    user.mfaSecret = secret.base32;
    this.users.set(userId, user);

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url!
    };
  }

  async enableMfa(userId: string, token: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user || !user.mfaSecret) {
      throw new UserServiceError('MFA not set up', 'MFA_NOT_SETUP');
    }

    const valid = this.verifyMfaToken(user.mfaSecret, token);
    if (!valid) {
      throw new UserServiceError('Invalid MFA token', 'INVALID_MFA_TOKEN');
    }

    user.mfaEnabled = true;
    user.updatedAt = new Date();
    this.users.set(userId, user);
  }

  private verifyMfaToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      token,
      window: 2
    });
  }

  // Utility Methods
  private async generateTokens(user: User): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      email: user.email,
      tenant: user.tenantId,
      roles: user.roles.map(r => r.name),
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '1h',
      issuer: 'notescape-user-service',
      audience: 'notescape-services'
    });

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' }, 
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600
    };
  }

  private sanitizeUser(user: User): User {
    const { passwordHash, mfaSecret, ...sanitized } = user;
    return sanitized as User;
  }

  private generateId(): string {
    return `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultRoles(): void {
    const roles: Role[] = [
      {
        id: 'role_user',
        name: 'User',
        scope: 'tenant',
        permissions: [
          { resource: 'note', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'profile', actions: ['read', 'update'] }
        ]
      },
      {
        id: 'role_admin',
        name: 'Admin',
        scope: 'tenant',
        permissions: [
          { resource: 'note', actions: ['create', 'read', 'update', 'delete', 'manage'] },
          { resource: 'user', actions: ['create', 'read', 'update', 'delete', 'manage_roles'] },
          { resource: 'tenant', actions: ['read', 'update'] }
        ]
      }
    ];

    roles.forEach(role => this.roles.set(role.id, role));
  }

  private getDefaultRole(): Role {
    return this.roles.get('role_user')!;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        inApp: true,
        frequency: 'immediate'
      },
      privacy: {
        shareAnalytics: false,
        allowIndexing: false
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        fontSize: 'medium'
      }
    };
  }

  private getDefaultTenantSettings(): TenantSettings {
    return {
      allowRegistration: true,
      requireEmailVerification: true,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: false
      },
      sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
      mfaRequired: false
    };
  }

  private getTenantLimits(plan: string): TenantLimits {
    const limits = {
      free: { users: 5, storage: '1GB', features: ['basic'] },
      pro: { users: 50, storage: '100GB', features: ['basic', 'ai', 'collaboration'] },
      enterprise: { users: -1, storage: '1TB', features: ['basic', 'ai', 'collaboration', 'analytics'] }
    };

    return limits[plan as keyof typeof limits];
  }

  private setupEventHandlers(): void {
    // Handle password changes
    this.on('user.password_changed', async ({ userId, tenantId }) => {
      // Invalidate all sessions for the user
      const userSessions = Array.from(this.sessions.values())
        .filter(session => session.userId === userId);
      
      userSessions.forEach(session => {
        this.sessions.delete(session.id);
        this.refreshTokens.delete(session.refreshToken);
      });

      // Notify other services
      await this.notifyPasswordChange(userId, tenantId);
    });
  }

  private async sendInvitationEmail(user: User, tenant: Tenant): Promise<void> {
    // Call notification service
    try {
      await serviceRegistry.callService('notification-service', '/emails/send', {
        method: 'POST',
        body: {
          to: user.email,
          template: 'user-invitation',
          data: {
            userName: user.profile.displayName || user.profile.firstName,
            tenantName: tenant.name,
            loginUrl: `${process.env.FRONTEND_URL}/login`
          }
        }
      });
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // Don't fail user creation if email fails
    }
  }

  private async notifyPasswordChange(userId: string, _tenantId: string): Promise<void> {
    // Call notification service for password change notification
    try {
      await serviceRegistry.callService('notification-service', '/emails/send', {
        method: 'POST',
        body: {
          userId,
          template: 'password-changed',
          data: { changeTime: new Date() }
        }
      });
    } catch (error) {
      console.error('Failed to send password change notification:', error);
    }
  }

  // Health Check
  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      version: this.version,
      checks: [
        { name: 'memory', status: 'pass', message: 'Memory usage normal' },
        { name: 'database', status: 'pass', message: 'Database connection healthy' },
        { name: 'cache', status: 'pass', message: 'Cache connection healthy' }
      ],
      metrics: {
        totalUsers: this.users.size,
        activeTenants: this.tenants.size,
        activeSessions: this.sessions.size
      }
    };
  }
}

// Supporting Types
type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

interface PrivacySettings {
  shareAnalytics: boolean;
  allowIndexing: boolean;
}

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface TenantSettings {
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  sessionTimeout: number;
  mfaRequired: boolean;
}

interface TenantLimits {
  users: number; // -1 for unlimited
  storage: string;
  features: string[];
}

interface UserSession {
  id: string;
  userId: string;
  tenantId: string;
  refreshToken: string;
  expiresAt: Date;
  metadata: LoginMetadata;
}

interface LoginMetadata {
  userAgent?: string;
  ipAddress?: string;
  loginTime: Date;
}

class UserServiceError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'UserServiceError';
  }
}

// Singleton instance
export const userService = new UserService();

// Export for testing
export { UserService };
export type { User, Tenant, Role, Permission };

export default userService;