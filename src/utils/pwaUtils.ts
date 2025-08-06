// PWA関連のユーティリティ関数

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWAがインストール済みかどうかを判定
export const isPWAInstalled = (): boolean => {
  // スタンドアローンモードで実行されているかチェック
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari の場合
  const isIOSStandalone = (navigator as any).standalone === true;
  
  return isStandalone || isIOSStandalone;
};

// オフライン状態かどうかを判定
export const isOffline = (): boolean => {
  return !navigator.onLine;
};

// Service Worker が利用可能かどうかを判定
export const isServiceWorkerSupported = (): boolean => {
  return 'serviceWorker' in navigator;
};

// データをローカルストレージに保存（オフライン対応）
export const saveDataToStorage = <T>(key: string, data: T): void => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    
    // Service Worker にデータ更新を通知
    if (isServiceWorkerSupported() && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'DATA_UPDATED',
        key,
        data: serializedData
      });
    }
  } catch (error) {
    console.error('Failed to save data to storage:', error);
  }
};

// ローカルストレージからデータを取得
export const loadDataFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) {
      return defaultValue;
    }
    return JSON.parse(serializedData);
  } catch (error) {
    console.error('Failed to load data from storage:', error);
    return defaultValue;
  }
};

// オフライン時の同期待ちデータを管理
export const addToPendingSync = (action: { type: string; data: any }): void => {
  const pending: any[] = loadDataFromStorage('pendingSync', []);
  pending.push({
    ...action,
    timestamp: Date.now()
  });
  saveDataToStorage('pendingSync', pending);
  
  // Background Sync を登録（ServiceWorkerRegistrationの型拡張）
  if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration: any) => {
      return registration.sync?.register('notebook-sync');
    }).catch((error) => {
      console.error('Background sync registration failed:', error);
    });
  }
};

// 同期待ちデータを取得
export const getPendingSync = (): any[] => {
  return loadDataFromStorage('pendingSync', []);
};

// 同期済みデータを削除
export const clearPendingSync = (): void => {
  saveDataToStorage('pendingSync', []);
};

// PWA アップデート通知
export const showUpdateNotification = (): void => {
  if (Notification.permission === 'granted') {
    new Notification('NoteSpace アップデート', {
      body: '新しいバージョンが利用できます。再読み込みしてください。',
      icon: '/logo192.png',
      tag: 'app-update'
    });
  }
};

// 通知許可を要求
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// App Store / Google Play Store のリンクを取得
export const getStoreLink = (): string | null => {
  const userAgent = navigator.userAgent;
  
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    // iOS の場合は App Store リンク（実際のアプリがある場合）
    return null; // PWA なので Store リンクはなし
  }
  
  if (/Android/.test(userAgent)) {
    // Android の場合は Google Play Store リンク（実際のアプリがある場合）
    return null; // PWA なので Store リンクはなし
  }
  
  return null;
};

// デバイス情報を取得
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  
  return {
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
    isChrome: /Chrome/.test(userAgent),
    isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
    isFirefox: /Firefox/.test(userAgent),
    isEdge: /Edge/.test(userAgent),
    platform: navigator.platform,
    language: navigator.language
  };
};