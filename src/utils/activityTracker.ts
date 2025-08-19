// Activity Tracker for Home Dashboard
// Records user activities for productivity statistics and recent activity display

export interface ActivityEntry {
  id: string;
  type: 'note_created' | 'note_updated' | 'note_deleted' | 'folder_created' | 'workspace_created' | 'pomodoro_completed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    noteId?: string;
    subFolderId?: string;
    notebookId?: string;
    workspaceId?: string;
    duration?: number; // for pomodoro sessions
    [key: string]: any;
  };
}

class ActivityTracker {
  private readonly STORAGE_KEY = 'activity-tracker-data';
  private readonly MAX_ACTIVITIES = 100;

  // Record a new activity
  recordActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void {
    try {
      const activities = this.getActivities();
      
      const newActivity: ActivityEntry = {
        ...entry,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };
      
      // Add to beginning of array (newest first)
      activities.unshift(newActivity);
      
      // Keep only the most recent activities
      const trimmedActivities = activities.slice(0, this.MAX_ACTIVITIES);
      
      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedActivities));
      
      // Trigger real-time updates
      this.notifyActivityUpdate(newActivity);
      
      console.debug('Activity recorded:', newActivity);
    } catch (error) {
      console.warn('Failed to record activity:', error);
    }
  }

  // Event system for real-time updates
  private listeners: Set<(activity: ActivityEntry) => void> = new Set();

  // Subscribe to activity updates
  subscribe(listener: (activity: ActivityEntry) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners of new activity
  private notifyActivityUpdate(activity: ActivityEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(activity);
      } catch (error) {
        console.warn('Activity listener error:', error);
      }
    });
  }

  // Get all activities
  getActivities(): ActivityEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load activities:', error);
      return [];
    }
  }

  // Get activities from a specific date range
  getActivitiesInRange(startDate: Date, endDate?: Date): ActivityEntry[] {
    const activities = this.getActivities();
    const end = endDate || new Date();
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= startDate && activityDate <= end;
    });
  }

  // Get today's activities
  getTodayActivities(): ActivityEntry[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return this.getActivitiesInRange(today, tomorrow);
  }

  // Get this week's activities
  getWeekActivities(): ActivityEntry[] {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    
    return this.getActivitiesInRange(weekStart);
  }

  // Clear all activities (for testing or reset)
  clearActivities(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Convenience methods for common activities
  recordNoteCreated(noteTitle: string, metadata: ActivityEntry['metadata'] = {}): void {
    this.recordActivity({
      type: 'note_created',
      title: 'ノート作成',
      description: `「${noteTitle}」を作成しました`,
      metadata
    });
  }

  recordNoteUpdated(noteTitle: string, metadata: ActivityEntry['metadata'] = {}): void {
    this.recordActivity({
      type: 'note_updated',
      title: 'ノート編集',
      description: `「${noteTitle}」を更新しました`,
      metadata
    });
  }

  recordNoteDeleted(noteTitle: string, metadata: ActivityEntry['metadata'] = {}): void {
    this.recordActivity({
      type: 'note_deleted',
      title: 'ノート削除',
      description: `「${noteTitle}」を削除しました`,
      metadata
    });
  }

  recordFolderCreated(folderName: string, metadata: ActivityEntry['metadata'] = {}): void {
    this.recordActivity({
      type: 'folder_created',
      title: 'フォルダ作成',
      description: `フォルダ「${folderName}」を作成しました`,
      metadata
    });
  }

  recordWorkspaceCreated(workspaceName: string, metadata: ActivityEntry['metadata'] = {}): void {
    this.recordActivity({
      type: 'workspace_created',
      title: 'ワークスペース作成',
      description: `ワークスペース「${workspaceName}」を作成しました`,
      metadata
    });
  }

  recordPomodoroCompleted(duration: number, sessionType: 'work' | 'break'): void {
    this.recordActivity({
      type: 'pomodoro_completed',
      title: 'ポモドーロ完了',
      description: sessionType === 'work' 
        ? `${duration}分間の集中時間を完了しました` 
        : `${duration}分間の休憩を完了しました`,
      metadata: { duration, sessionType }
    });
  }

  // デバッグ用メソッド
  debug(): void {
    console.log('🔍 ActivityTracker Debug Info:');
    console.log('📊 Total activities:', this.getActivities().length);
    console.log('📅 Recent activities:', this.getActivities().slice(0, 5));
    console.log('🎧 Active listeners:', this.listeners.size);
    console.log('💾 Raw localStorage data:', localStorage.getItem(this.STORAGE_KEY));
  }

  // テスト用メソッド
  testActivity(): void {
    console.log('🧪 Testing activity tracking...');
    this.recordNoteCreated('テストノート', { noteId: 'test-123' });
    console.log('✅ Test activity recorded');
  }

  // 古い競合データを清理するメソッド
  migrateFromOldStorage(): void {
    try {
      // 古いキー（dashboard-timeline）からアクティビティデータを確認
      const oldTimelineData = localStorage.getItem('dashboard-timeline');
      const currentActivities = this.getActivities();
      
      console.log('🔄 Checking for old activity data migration...');
      console.log('📊 Current activities count:', currentActivities.length);
      
      if (oldTimelineData) {
        console.log('⚠️ Found old timeline data that may have been mixed with activities');
        
        // dashboard-timelineデータを解析して、実際のアクティビティかタイムライン投稿かを判別
        try {
          const oldData = JSON.parse(oldTimelineData);
          const suspiciousEntries = oldData.filter((entry: any) => 
            entry.type && (entry.type.includes('note_') || entry.type === 'pomodoro_completed')
          );
          
          if (suspiciousEntries.length > 0) {
            console.log('🧹 Found', suspiciousEntries.length, 'suspicious activity entries mixed in timeline data');
            console.log('💡 Recommendation: Clear old activities and start fresh');
          }
        } catch (e) {
          console.log('📝 Timeline data appears to be in correct format');
        }
      }
      
      console.log('✅ Migration check completed');
    } catch (error) {
      console.warn('Failed to migrate old storage:', error);
    }
  }

  // 開発環境用：すべてのアクティビティ関連データをリセット
  resetAllActivityData(): void {
    console.log('🧹 Resetting all activity data...');
    
    // 現在のアクティビティを削除
    this.clearActivities();
    
    // 古い可能性のあるキーもチェック
    const keysToCheck = ['dashboard-timeline-activities', 'activity-data', 'recent-activities'];
    keysToCheck.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`🗑️ Removing old key: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ All activity data reset completed');
    console.log('💡 You can now create notes to test fresh activity tracking');
  }
}

// Singleton instance
export const activityTracker = new ActivityTracker();

// デバッグのためグローバルに公開（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).activityTracker = activityTracker;
  console.log('🔧 ActivityTracker available globally as window.activityTracker');
  console.log('💡 Use activityTracker.debug() to see current state');
  console.log('🧪 Use activityTracker.testActivity() to test tracking');
}

// Export for React components
export default activityTracker;