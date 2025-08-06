import { nanoid } from 'nanoid';
import { compare, applyPatch } from 'fast-json-patch';
import { logger } from './logger';
import { NotebookState } from '../types';
import { userIdentityManager } from './userIdentity';
import { useNotebookStore } from '../store/useNotebookStore';
import { conflictResolver, ConflictInfo } from './conflictResolver';

export interface SyncDevice {
  deviceId: string;
  deviceName: string;
  ip: string;
  port: number;
  lastSeen: number;
  status: 'online' | 'offline' | 'syncing' | 'pending' | 'unauthorized';
  userId?: string;
  userName?: string;
  syncPermission?: 'approved' | 'pending' | 'rejected';
}

export interface SyncOperation {
  id: string;
  type: 'state-change' | 'note-update' | 'folder-create' | 'workspace-add';
  timestamp: number;
  deviceId: string;
  data: any;
  patches?: any[];
}

export interface ConflictResolution {
  itemId: string;
  itemType: 'note' | 'workspace' | 'folder';
  localVersion: any;
  remoteVersion: any;
  resolution: 'local' | 'remote' | 'merge' | 'manual';
}

class AutoSyncManager {
  private static instance: AutoSyncManager;
  private isEnabled: boolean = false;
  private isApplyingRemoteChange: boolean = false;
  private devices: Map<string, SyncDevice> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private lastStateSnapshot: NotebookState | null = null;
  private deviceId: string;
  private deviceName: string;
  private syncPort: number = 3001;
  private wsPort: number = 3002;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private statusCallbacks: Array<(devices: SyncDevice[]) => void> = [];
  private conflictCallbacks: Array<(conflicts: ConflictResolution[]) => void> = [];
  private conflictInfoCallbacks: Array<(conflicts: ConflictInfo[]) => void> = [];

  private constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.deviceName = this.getDeviceName();
  }

  public static getInstance(): AutoSyncManager {
    if (!AutoSyncManager.instance) {
      AutoSyncManager.instance = new AutoSyncManager();
    }
    return AutoSyncManager.instance;
  }

  // 自動同期を開始
  public async start(): Promise<void> {
    if (this.isEnabled) return;

    this.isEnabled = true;
    logger.info('Starting auto sync manager...');

    try {
      // ユーザー識別情報を初期化
      const user = userIdentityManager.initializeUser();
      logger.info('User identity initialized:', { userId: user.userId, userName: user.userName });

      // Electronから同期情報を取得
      if (window.electronAPI?.getSyncInfo) {
        const syncInfo = await window.electronAPI.getSyncInfo();
        this.syncPort = syncInfo.port;
        this.wsPort = syncInfo.wsPort;
        logger.info('Sync info received:', syncInfo);
      }

      // デバイス検出を開始
      await this.startDeviceDiscovery();

      // IPC リスナーを設定
      this.setupIPCListeners();

      // 競合解決コールバックを設定
      conflictResolver.onConflict((conflicts) => {
        this.notifyConflictCallbacks(conflicts);
      });

      logger.info('Auto sync manager started successfully');
    } catch (error) {
      logger.error('Failed to start auto sync manager:', error);
      this.isEnabled = false;
    }
  }

  // 自動同期を停止
  public stop(): void {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    logger.info('Stopping auto sync manager...');

    // 発見タイマーを停止
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    // WebSocket接続を閉じる
    this.websockets.forEach((ws) => {
      ws.close();
    });
    this.websockets.clear();

    // デバイス一覧をクリア
    this.devices.clear();

    logger.info('Auto sync manager stopped');
  }

  // デバイス検出を開始
  private async startDeviceDiscovery(): Promise<void> {
    // 即座に一度実行
    await this.discoverDevices();

    // 30秒ごとにデバイス検出
    this.discoveryInterval = setInterval(async () => {
      await this.discoverDevices();
    }, 30000);
  }

  // ローカルネットワーク内のデバイス検出
  private async discoverDevices(): Promise<void> {
    if (!this.isEnabled) return;

    logger.info('Discovering devices...');
    const activeDevices = new Set<string>();

    // ローカルIPレンジをスキャン（192.168.x.x と 10.0.x.x）
    const ipRanges = [
      { base: '192.168.1', start: 1, end: 254 },
      { base: '192.168.0', start: 1, end: 254 },
      { base: '10.0.0', start: 1, end: 254 }
    ];

    const promises: Promise<void>[] = [];

    for (const range of ipRanges) {
      for (let i = range.start; i <= range.end; i++) {
        const ip = `${range.base}.${i}`;
        promises.push(this.checkDevice(ip, activeDevices));
        
        // 並行処理数を制限（一度に20台まで）
        if (promises.length >= 20) {
          await Promise.allSettled(promises);
          promises.length = 0;
        }
      }
    }

    // 残りの promises を処理
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    // 見つからなかったデバイスをオフラインに設定
    this.devices.forEach((device, deviceId) => {
      if (!activeDevices.has(deviceId)) {
        device.status = 'offline';
        device.lastSeen = Date.now();
      }
    });

    this.notifyStatusChange();
    logger.info(`Device discovery completed. Found ${activeDevices.size} devices`);
  }

  // 個別デバイスをチェック
  private async checkDevice(ip: string, activeDevices: Set<string>): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://${ip}:${this.syncPort}/discover`, {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const deviceInfo = await response.json();
        
        if (deviceInfo.appName === 'NoteSpace' && deviceInfo.deviceId !== this.deviceId) {
          activeDevices.add(deviceInfo.deviceId);
          
          const existingDevice = this.devices.get(deviceInfo.deviceId);
          
          // デバイス情報にユーザー情報が含まれている場合のチェック
          let syncPermission: 'approved' | 'pending' | 'rejected' = 'pending';
          let status: SyncDevice['status'] = 'pending';
          
          if (deviceInfo.userId && deviceInfo.syncKey) {
            // ユーザー認証を確認
            const currentUser = userIdentityManager.getCurrentUser();
            if (currentUser?.syncKey === deviceInfo.syncKey) {
              // 同じ同期キー = 自分の他のデバイス
              syncPermission = 'approved';
              status = 'online';
            } else if (userIdentityManager.isUserApproved(deviceInfo.userId)) {
              // 承認済みユーザー
              syncPermission = 'approved';
              status = 'online';
            } else {
              // 未承認ユーザー - 同期リクエストを送信
              const mockRequest = {
                type: 'sync-request',
                userId: deviceInfo.userId,
                userName: deviceInfo.userName || deviceInfo.deviceName,
                syncKey: deviceInfo.syncKey,
                timestamp: Date.now()
              };
              
              const result = userIdentityManager.handleSyncRequest(deviceInfo.deviceId, mockRequest);
              syncPermission = result === 'approved' ? 'approved' : 'pending';
              status = result === 'approved' ? 'online' : 'unauthorized';
            }
          }
          
          const device: SyncDevice = {
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            ip,
            port: deviceInfo.port,
            lastSeen: Date.now(),
            status,
            userId: deviceInfo.userId,
            userName: deviceInfo.userName,
            syncPermission
          };

          this.devices.set(deviceInfo.deviceId, device);

          // 承認済みデバイスのみ接続を確立
          if (!existingDevice && syncPermission === 'approved') {
            logger.info(`New authorized device found: ${device.deviceName} (${ip})`);
            await this.connectToDevice(device);
          } else if (!existingDevice) {
            logger.info(`New unauthorized device found: ${device.deviceName} (${ip}) - awaiting approval`);
          }
        }
      }
    } catch (error) {
      // タイムアウトやネットワークエラーは正常（デバイスがない）
    }
  }

  // デバイスへのWebSocket接続を確立
  private async connectToDevice(device: SyncDevice): Promise<void> {
    try {
      const wsUrl = `ws://${device.ip}:${this.wsPort}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info(`WebSocket connected to ${device.deviceName}`);
        this.websockets.set(device.deviceId, ws);
        
        // 接続完了メッセージを送信
        ws.send(JSON.stringify({
          type: 'hello',
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          timestamp: Date.now()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(device.deviceId, data);
        } catch (error) {
          logger.error('WebSocket message parse error:', error);
        }
      };

      ws.onclose = () => {
        logger.info(`WebSocket disconnected from ${device.deviceName}`);
        this.websockets.delete(device.deviceId);
      };

      ws.onerror = (error) => {
        logger.error(`WebSocket error with ${device.deviceName}:`, error);
        this.websockets.delete(device.deviceId);
      };

    } catch (error) {
      logger.error(`Failed to connect to device ${device.deviceName}:`, error);
    }
  }

  // WebSocketメッセージを処理
  private handleWebSocketMessage(deviceId: string, data: any): void {
    switch (data.type) {
      case 'hello':
        logger.info(`Received hello from ${data.deviceName}`);
        break;
        
      case 'sync-operation':
        this.handleSyncOperation(deviceId, data.operation);
        break;
        
      case 'state-sync':
        this.handleStateSync(deviceId, data.state, data.timestamp);
        break;
        
      default:
        logger.warn('Unknown WebSocket message type:', data.type);
    }
  }

  // 同期操作を処理
  private handleSyncOperation(deviceId: string, operation: SyncOperation): void {
    logger.info(`Received sync operation from ${deviceId}:`, operation.type);
    
    // デバイスが承認済みか確認
    const device = this.devices.get(deviceId);
    if (!device || device.syncPermission !== 'approved') {
      logger.warn(`Ignoring sync operation from unauthorized device: ${deviceId}`);
      return;
    }

    // 操作タイプに応じて処理
    switch (operation.type) {
      case 'state-change':
        this.applyStateChange(operation);
        break;
      case 'note-update':
        this.applyNoteUpdate(operation);
        break;
      case 'folder-create':
        this.applyFolderCreate(operation);
        break;
      case 'workspace-add':
        this.applyWorkspaceAdd(operation);
        break;
      default:
        logger.warn('Unknown operation type:', operation.type);
    }
  }

  // 状態同期を処理
  private handleStateSync(deviceId: string, _remoteState: NotebookState, timestamp: number): void {
    logger.info(`Received state sync from ${deviceId} at ${timestamp}`);
    
    // ここで状態のマージを行う
    // 詳細は次のフェーズで実装
  }

  // 状態変更を適用
  private applyStateChange(operation: SyncOperation): void {
    if (!operation.patches || operation.patches.length === 0) {
      logger.debug('No patches to apply');
      return;
    }

    try {
      // fast-json-patchを使用して差分を適用
      const currentState = useNotebookStore.getState();
      const newState = JSON.parse(JSON.stringify(currentState));
      
      applyPatch(newState, operation.patches);
      
      // ストアを更新（ただし、ブロードキャストは無効化）
      this.isApplyingRemoteChange = true;
      useNotebookStore.setState(newState);
      this.isApplyingRemoteChange = false;
      
      logger.info(`Applied ${operation.patches.length} patches from remote`);
    } catch (error) {
      logger.error('Failed to apply state change:', error);
    }
  }

  // ノート更新を適用（競合チェック付き）
  private applyNoteUpdate(operation: SyncOperation): void {
    const { noteId, updates } = operation.data;
    if (!noteId || !updates) {
      logger.warn('Invalid note update operation:', operation);
      return;
    }

    try {
      const currentState = useNotebookStore.getState();
      
      // 現在のノートを検索
      let currentNote = null;
      
      Object.keys(currentState.notesData).forEach(sfId => {
        const notes = currentState.notesData[sfId] || [];
        const found = notes.find(n => n.id === noteId);
        if (found) {
          currentNote = found;
        }
      });

      if (!currentNote) {
        logger.warn(`Note not found for update: ${noteId}`);
        return;
      }

      // リモートノートを構築  
      const remoteNote = Object.assign({}, currentNote, updates);
      
      // 競合解決を実行
      const resolution = conflictResolver.resolveNoteConflict(currentNote, remoteNote);
      
      if (resolution.success && resolution.mergedData) {
        // 成功した場合、マージされたデータを適用
        this.isApplyingRemoteChange = true;
        const { updateNote } = useNotebookStore.getState();
        updateNote(noteId, resolution.mergedData);
        this.isApplyingRemoteChange = false;
        
        logger.info(`Applied merged note update for note ${noteId}`);
      } else if (resolution.requiresManualResolution) {
        // 手動解決が必要な場合
        logger.warn(`Manual conflict resolution required for note ${noteId}`);
        
        // 競合マーカー付きでデータを適用
        this.isApplyingRemoteChange = true;
        const { updateNote } = useNotebookStore.getState();
        updateNote(noteId, resolution.mergedData || updates);
        this.isApplyingRemoteChange = false;
      } else {
        // 解決失敗の場合、リモート版を適用
        this.isApplyingRemoteChange = true;
        const { updateNote } = useNotebookStore.getState();
        updateNote(noteId, updates);
        this.isApplyingRemoteChange = false;
        
        logger.info(`Applied remote note update for note ${noteId}`);
      }
    } catch (error) {
      logger.error('Failed to apply note update:', error);
    }
  }

  // フォルダ作成を適用
  private applyFolderCreate(operation: SyncOperation): void {
    const { notebookId, subFolder } = operation.data;
    if (!notebookId || !subFolder) {
      logger.warn('Invalid folder create operation:', operation);
      return;
    }

    try {
      this.isApplyingRemoteChange = true;
      const { addSubFolder } = useNotebookStore.getState();
      addSubFolder(notebookId, subFolder);
      this.isApplyingRemoteChange = false;
      
      logger.info(`Applied folder creation: ${subFolder.name}`);
    } catch (error) {
      logger.error('Failed to apply folder create:', error);
    }
  }

  // ワークスペース追加を適用
  private applyWorkspaceAdd(operation: SyncOperation): void {
    const { workspace } = operation.data;
    if (!workspace) {
      logger.warn('Invalid workspace add operation:', operation);
      return;
    }

    try {
      this.isApplyingRemoteChange = true;
      const { addWorkspace } = useNotebookStore.getState();
      addWorkspace(workspace);
      this.isApplyingRemoteChange = false;
      
      logger.info(`Applied workspace creation: ${workspace.name}`);
    } catch (error) {
      logger.error('Failed to apply workspace add:', error);
    }
  }

  // 状態変更を他のデバイスにブロードキャスト
  public broadcastStateChange(currentState: NotebookState): void {
    if (!this.isEnabled || this.websockets.size === 0 || this.isApplyingRemoteChange) return;

    const operation: SyncOperation = {
      id: nanoid(),
      type: 'state-change',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      data: currentState,
      patches: this.lastStateSnapshot ? compare(this.lastStateSnapshot, currentState) : []
    };

    // 差分がある場合のみブロードキャスト
    if (!this.lastStateSnapshot || operation.patches!.length > 0) {
      const message = JSON.stringify({
        type: 'sync-operation',
        operation
      });

      this.websockets.forEach((ws, deviceId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          logger.debug(`Broadcasted state change to ${deviceId}`);
        }
      });

      this.lastStateSnapshot = JSON.parse(JSON.stringify(currentState));
    }
  }

  // IPC リスナーを設定
  private setupIPCListeners(): void {
    if (window.electronAPI) {
      // 同期サーバー準備完了の通知を受信
      window.electronAPI.onSyncServerReady?.((info: any) => {
        logger.info('Sync server ready:', info);
        this.syncPort = info.port;
      });

      // 同期データ受信の通知
      window.electronAPI.onSyncReceiveData?.((data: any) => {
        logger.info('Received sync data via IPC:', data);
        
        // HTTP API経由で受信したデータを処理
        if (data && data.data) {
          const { data: syncData, timestamp } = data;
          
          // 競合チェックと解決
          if (this.lastStateSnapshot && timestamp) {
            const localTimestamp = Date.now();
            const timeDiff = Math.abs(localTimestamp - timestamp);
            
            // 5秒以内の変更は競合の可能性があり、競合解決が必要
            if (timeDiff < 5000) {
              logger.warn('Possible sync conflict detected, time difference:', timeDiff);
              this.resolveStateConflicts(syncData, this.lastStateSnapshot, timestamp);
              return;
            }
          }
          
          // 競合なしの場合、そのまま状態を適用
          this.isApplyingRemoteChange = true;
          useNotebookStore.setState(syncData);
          this.isApplyingRemoteChange = false;
          
          logger.info('Applied sync data from HTTP API');
        }
      });

      // WebSocketメッセージの受信
      window.electronAPI.onSyncWebSocketMessage?.((data: any) => {
        logger.info('Received WebSocket message via IPC:', data);
      });

      // ユーザー情報リクエストの処理
      window.electronAPI?.onSyncRequestUserInfo?.(() => {
        const currentUser = userIdentityManager.getCurrentUser();
        window.electronAPI?.sendSyncUserInfoResponse(currentUser);
      });
    }
  }

  // デバイスID を取得または生成
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('notespace-device-id');
    if (!deviceId) {
      deviceId = nanoid();
      localStorage.setItem('notespace-device-id', deviceId);
    }
    return deviceId;
  }

  // デバイス名を取得
  private getDeviceName(): string {
    const storedName = localStorage.getItem('notespace-device-name');
    if (storedName) return storedName;
    
    // ブラウザ情報からデバイス名を生成
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    
    let deviceName = 'Unknown Device';
    if (platform.includes('Win')) deviceName = 'Windows PC';
    else if (platform.includes('Mac')) deviceName = 'Mac';
    else if (platform.includes('Linux')) deviceName = 'Linux PC';
    else if (userAgent.includes('Mobile')) deviceName = 'Mobile Device';
    
    deviceName += ` (${this.deviceId.substring(0, 4)})`;
    localStorage.setItem('notespace-device-name', deviceName);
    
    return deviceName;
  }

  // ステータス変更を通知
  private notifyStatusChange(): void {
    const deviceList = Array.from(this.devices.values());
    this.statusCallbacks.forEach(callback => {
      try {
        callback(deviceList);
      } catch (error) {
        logger.error('Status callback error:', error);
      }
    });
  }

  // Public API
  public getDevices(): SyncDevice[] {
    return Array.from(this.devices.values());
  }

  public isRunning(): boolean {
    return this.isEnabled;
  }

  public onStatusChange(callback: (devices: SyncDevice[]) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  public onConflict(callback: (conflicts: ConflictResolution[]) => void): () => void {
    this.conflictCallbacks.push(callback);
    return () => {
      const index = this.conflictCallbacks.indexOf(callback);
      if (index > -1) {
        this.conflictCallbacks.splice(index, 1);
      }
    };
  }

  public onConflictInfo(callback: (conflicts: ConflictInfo[]) => void): () => void {
    this.conflictInfoCallbacks.push(callback);
    return () => {
      const index = this.conflictInfoCallbacks.indexOf(callback);
      if (index > -1) {
        this.conflictInfoCallbacks.splice(index, 1);
      }
    };
  }

  // 個別操作のブロードキャスト用メソッド
  public broadcastNoteUpdate(noteId: number, updates: any): void {
    if (!this.isEnabled || this.websockets.size === 0 || this.isApplyingRemoteChange) return;

    const operation: SyncOperation = {
      id: nanoid(),
      type: 'note-update',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      data: { noteId, updates }
    };

    this.sendOperation(operation);
  }

  public broadcastFolderCreate(notebookId: string, subFolder: any): void {
    if (!this.isEnabled || this.websockets.size === 0 || this.isApplyingRemoteChange) return;

    const operation: SyncOperation = {
      id: nanoid(),
      type: 'folder-create',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      data: { notebookId, subFolder }
    };

    this.sendOperation(operation);
  }

  public broadcastWorkspaceAdd(workspace: any): void {
    if (!this.isEnabled || this.websockets.size === 0 || this.isApplyingRemoteChange) return;

    const operation: SyncOperation = {
      id: nanoid(),
      type: 'workspace-add',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      data: { workspace }
    };

    this.sendOperation(operation);
  }

  // 操作を送信
  private sendOperation(operation: SyncOperation): void {
    const message = JSON.stringify({
      type: 'sync-operation',
      operation
    });

    this.websockets.forEach((ws, deviceId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        logger.debug(`Sent ${operation.type} to ${deviceId}`);
      }
    });
  }

  // 状態競合を解決
  private resolveStateConflicts(remoteState: NotebookState, localState: NotebookState, remoteTimestamp: number): void {
    logger.info('Resolving state conflicts between local and remote');
    
    try {
      let hasConflicts = false;
      const resolvedState = { ...localState };

      // ノートデータの競合解決
      Object.keys(remoteState.notesData || {}).forEach(subFolderId => {
        const remoteNotes = remoteState.notesData[subFolderId] || [];
        const localNotes = localState.notesData[subFolderId] || [];

        remoteNotes.forEach(remoteNote => {
          const localNote = localNotes.find(n => n.id === remoteNote.id);
          
          if (localNote) {
            // 既存ノートの競合解決
            const resolution = conflictResolver.resolveNoteConflict(localNote, remoteNote);
            
            if (resolution.success && resolution.mergedData) {
              // マージされたノートで更新
              if (!resolvedState.notesData[subFolderId]) {
                resolvedState.notesData[subFolderId] = [];
              }
              const noteIndex = resolvedState.notesData[subFolderId].findIndex(n => n.id === remoteNote.id);
              if (noteIndex >= 0) {
                resolvedState.notesData[subFolderId][noteIndex] = resolution.mergedData;
              }
            } else if (resolution.conflicts) {
              hasConflicts = true;
            }
          } else {
            // 新しいノート（リモートのみ）を追加
            if (!resolvedState.notesData[subFolderId]) {
              resolvedState.notesData[subFolderId] = [];
            }
            resolvedState.notesData[subFolderId].push(remoteNote);
          }
        });
      });

      // ワークスペース競合解決
      if (remoteState.workspaces) {
        const resolvedWorkspaces = [...resolvedState.workspaces];
        
        remoteState.workspaces.forEach(remoteWs => {
          const localWs = resolvedWorkspaces.find(w => w.id === remoteWs.id);
          if (localWs) {
            const resolution = conflictResolver.resolveWorkspaceConflict(localWs, remoteWs);
            if (resolution.success && resolution.mergedData) {
              const wsIndex = resolvedWorkspaces.findIndex(w => w.id === remoteWs.id);
              if (wsIndex >= 0) {
                resolvedWorkspaces[wsIndex] = resolution.mergedData;
              }
            }
          } else {
            resolvedWorkspaces.push(remoteWs);
          }
        });
        
        resolvedState.workspaces = resolvedWorkspaces;
      }

      // 解決された状態を適用
      this.isApplyingRemoteChange = true;
      useNotebookStore.setState(resolvedState);
      this.isApplyingRemoteChange = false;
      
      if (hasConflicts) {
        logger.warn('State merge completed with conflicts requiring manual resolution');
      } else {
        logger.info('State merge completed successfully');
      }

    } catch (error) {
      logger.error('Failed to resolve state conflicts:', error);
      // エラーの場合は従来通り時刻比較でフォールバック
      const useRemote = remoteTimestamp > Date.now() - 30000; // 30秒以内なら新しいとみなす
      
      this.isApplyingRemoteChange = true;
      if (useRemote) {
        useNotebookStore.setState(remoteState);
        logger.info('Applied remote state due to conflict resolution error');
      }
      this.isApplyingRemoteChange = false;
    }
  }

  // 競合情報コールバックを通知
  private notifyConflictCallbacks(conflicts: ConflictInfo[]): void {
    this.conflictInfoCallbacks.forEach(callback => {
      try {
        callback(conflicts);
      } catch (error) {
        logger.error('Conflict info callback error:', error);
      }
    });
  }

  // 競合を手動で解決
  public resolveConflict(itemId: string | number, itemType: string, resolution: 'local' | 'remote' | 'merge'): boolean {
    return conflictResolver.resolveConflict(itemId, itemType, resolution);
  }

  // ペンディング競合を取得
  public getPendingConflicts(): ConflictInfo[] {
    return conflictResolver.getPendingConflicts();
  }
}

export const autoSyncManager = AutoSyncManager.getInstance();