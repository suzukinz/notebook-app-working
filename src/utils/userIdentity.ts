import { nanoid } from 'nanoid';
import { logger } from './logger';

export interface UserIdentity {
  userId: string;
  userName: string;
  userAvatar: string;
  syncKey: string;
  createdAt: number;
}

export interface SyncPermission {
  userId: string;
  deviceId: string;
  userName: string;
  isApproved: boolean;
  approvedAt?: number;
  requestedAt: number;
}

class UserIdentityManager {
  private static instance: UserIdentityManager;
  private userIdentity: UserIdentity | null = null;
  private approvedUsers: Map<string, SyncPermission> = new Map();
  private pendingRequests: Map<string, SyncPermission> = new Map();
  private permissionCallbacks: Array<(requests: SyncPermission[]) => void> = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): UserIdentityManager {
    if (!UserIdentityManager.instance) {
      UserIdentityManager.instance = new UserIdentityManager();
    }
    return UserIdentityManager.instance;
  }

  // ユーザー識別情報を初期化または取得
  public initializeUser(): UserIdentity {
    if (this.userIdentity) {
      return this.userIdentity;
    }

    // 既存のユーザー情報を読み込み
    const stored = this.loadFromStorage();
    if (stored) {
      this.userIdentity = stored;
      return stored;
    }

    // 新しいユーザーを作成
    this.userIdentity = {
      userId: nanoid(),
      userName: this.generateUserName(),
      userAvatar: this.generateAvatar(),
      syncKey: this.generateSyncKey(),
      createdAt: Date.now()
    };

    this.saveToStorage();
    logger.info('New user identity created:', this.userIdentity.userId);
    
    return this.userIdentity;
  }

  // ユーザー情報を更新
  public updateUser(updates: Partial<Pick<UserIdentity, 'userName' | 'userAvatar'>>): void {
    if (!this.userIdentity) {
      throw new Error('User identity not initialized');
    }

    this.userIdentity = {
      ...this.userIdentity,
      ...updates
    };

    this.saveToStorage();
    logger.info('User identity updated');
  }

  // 同期キーを再生成（セキュリティのため）
  public regenerateSyncKey(): string {
    if (!this.userIdentity) {
      throw new Error('User identity not initialized');
    }

    this.userIdentity.syncKey = this.generateSyncKey();
    this.saveToStorage();
    
    // 既存の承認も無効化
    this.approvedUsers.clear();
    this.savePermissions();
    
    logger.info('Sync key regenerated');
    return this.userIdentity.syncKey;
  }

  // 現在のユーザー情報を取得
  public getCurrentUser(): UserIdentity | null {
    return this.userIdentity;
  }

  // 同期リクエストを送信（他のデバイス用の情報）
  public createSyncRequest(): any {
    const user = this.getCurrentUser();
    if (!user) throw new Error('User not initialized');

    return {
      type: 'sync-request',
      userId: user.userId,
      userName: user.userName,
      userAvatar: user.userAvatar,
      syncKey: user.syncKey,
      timestamp: Date.now()
    };
  }

  // 同期リクエストを検証
  public validateSyncRequest(request: any): boolean {
    if (!request || typeof request !== 'object') return false;
    
    return !!(
      request.type === 'sync-request' &&
      request.userId &&
      request.userName &&
      request.syncKey &&
      request.timestamp &&
      typeof request.userId === 'string' &&
      typeof request.userName === 'string' &&
      typeof request.syncKey === 'string' &&
      typeof request.timestamp === 'number'
    );
  }

  // 同期リクエストを処理
  public handleSyncRequest(deviceId: string, request: any): 'approved' | 'pending' | 'rejected' {
    if (!this.validateSyncRequest(request)) {
      logger.warn('Invalid sync request received');
      return 'rejected';
    }

    const userId = request.userId;
    
    // 既に承認済みか確認
    if (this.approvedUsers.has(userId)) {
      logger.info(`Sync request from approved user: ${request.userName}`);
      return 'approved';
    }

    // 自分自身の他のデバイスか確認（同じsyncKeyなら自動承認）
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.syncKey === request.syncKey) {
      const permission: SyncPermission = {
        userId,
        deviceId,
        userName: request.userName,
        isApproved: true,
        approvedAt: Date.now(),
        requestedAt: request.timestamp
      };
      
      this.approvedUsers.set(userId, permission);
      this.savePermissions();
      logger.info(`Auto-approved sync request from own device: ${request.userName}`);
      return 'approved';
    }

    // ペンディングリストに追加
    const permission: SyncPermission = {
      userId,
      deviceId,
      userName: request.userName,
      isApproved: false,
      requestedAt: request.timestamp
    };

    this.pendingRequests.set(userId, permission);
    this.notifyPermissionCallbacks();
    logger.info(`New sync request from: ${request.userName}`);
    
    return 'pending';
  }

  // ペンディングリクエストを承認
  public approveUser(userId: string): boolean {
    const pending = this.pendingRequests.get(userId);
    if (!pending) return false;

    const permission: SyncPermission = {
      ...pending,
      isApproved: true,
      approvedAt: Date.now()
    };

    this.approvedUsers.set(userId, permission);
    this.pendingRequests.delete(userId);
    this.savePermissions();
    this.notifyPermissionCallbacks();
    
    logger.info(`User approved: ${permission.userName}`);
    return true;
  }

  // ペンディングリクエストを拒否
  public rejectUser(userId: string): boolean {
    const success = this.pendingRequests.delete(userId);
    if (success) {
      this.notifyPermissionCallbacks();
      logger.info(`User rejected: ${userId}`);
    }
    return success;
  }

  // 承認済みユーザーを取り消し
  public revokeUser(userId: string): boolean {
    const success = this.approvedUsers.delete(userId);
    if (success) {
      this.savePermissions();
      logger.info(`User access revoked: ${userId}`);
    }
    return success;
  }

  // ペンディングリクエスト一覧を取得
  public getPendingRequests(): SyncPermission[] {
    return Array.from(this.pendingRequests.values());
  }

  // 承認済みユーザー一覧を取得
  public getApprovedUsers(): SyncPermission[] {
    return Array.from(this.approvedUsers.values());
  }

  // ユーザーが承認済みかチェック
  public isUserApproved(userId: string): boolean {
    return this.approvedUsers.has(userId);
  }

  // 許可変更の通知を受け取る
  public onPermissionChange(callback: (requests: SyncPermission[]) => void): () => void {
    this.permissionCallbacks.push(callback);
    return () => {
      const index = this.permissionCallbacks.indexOf(callback);
      if (index > -1) {
        this.permissionCallbacks.splice(index, 1);
      }
    };
  }

  // ストレージから読み込み
  private loadFromStorage(): UserIdentity | null {
    try {
      const userData = localStorage.getItem('notespace-user-identity');
      const permissionsData = localStorage.getItem('notespace-sync-permissions');
      
      if (userData) {
        const user = JSON.parse(userData);
        this.userIdentity = user;
      }
      
      if (permissionsData) {
        const permissions = JSON.parse(permissionsData);
        this.approvedUsers = new Map(permissions.approved || []);
        this.pendingRequests = new Map(permissions.pending || []);
      }
      
      return this.userIdentity;
    } catch (error) {
      logger.error('Failed to load user identity from storage:', error);
      return null;
    }
  }

  // ストレージに保存
  private saveToStorage(): void {
    try {
      if (this.userIdentity) {
        localStorage.setItem('notespace-user-identity', JSON.stringify(this.userIdentity));
      }
    } catch (error) {
      logger.error('Failed to save user identity to storage:', error);
    }
  }

  // 権限情報をストレージに保存
  private savePermissions(): void {
    try {
      const permissions = {
        approved: Array.from(this.approvedUsers.entries()),
        pending: Array.from(this.pendingRequests.entries())
      };
      localStorage.setItem('notespace-sync-permissions', JSON.stringify(permissions));
    } catch (error) {
      logger.error('Failed to save permissions to storage:', error);
    }
  }

  // 権限変更の通知
  private notifyPermissionCallbacks(): void {
    const requests = this.getPendingRequests();
    this.permissionCallbacks.forEach(callback => {
      try {
        callback(requests);
      } catch (error) {
        logger.error('Permission callback error:', error);
      }
    });
  }

  // ユーザー名を生成
  private generateUserName(): string {
    const adjectives = ['快適な', '効率的な', '創造的な', '集中した', '活発な', 'スマートな'];
    const nouns = ['ライター', 'プランナー', 'クリエイター', 'シンカー', 'オーガナイザー', 'アーティスト'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}${noun}`;
  }

  // アバター（絵文字）を生成
  private generateAvatar(): string {
    const avatars = ['👤', '🧑', '👨', '👩', '🧑‍💻', '👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🎨', '👩‍🎨', '📝', '💡', '🎨', '📚', '🗂️', '📋'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  // 同期キーを生成（16文字の英数字）
  private generateSyncKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const userIdentityManager = UserIdentityManager.getInstance();