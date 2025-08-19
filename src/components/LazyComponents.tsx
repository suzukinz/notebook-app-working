// 遅延読み込み対象コンポーネントの集約
import { lazy } from 'react';

// 重いコンポーネントの遅延読み込み
export const ObsidianGraphView = lazy(() => 
  import('./mindmap/ObsidianGraphView').then(module => ({ default: module.default }))
);

export const InlineDashboard = lazy(() => 
  import('./dashboard/InlineDashboard').then(module => ({ default: module.default }))
);

export const HomePage = lazy(() => 
  import('./home/HomePage').then(module => ({ default: module.default }))
);

export const Timeline = lazy(() => 
  import('./dashboard/Timeline').then(module => ({ default: module.default }))
);

export const MobileApp = lazy(() => 
  import('./mobile/MobileApp').then(module => ({ default: module.default }))
);

export const RichNoteEditor = lazy(() => 
  import('./notes/RichNoteEditor').then(module => ({ default: module.default }))
);

export const EnhancedSearchInterface = lazy(() => 
  import('./search/EnhancedSearchInterface').then(module => ({ default: module.default }))
);

// ダイアログコンポーネントの遅延読み込み
export const AddFolderDialog = lazy(() => 
  import('./dialogs/AddFolderDialog').then(module => ({ default: module.default }))
);

export const KeyboardShortcutsDialog = lazy(() => 
  import('./dialogs/KeyboardShortcutsDialog').then(module => ({ default: module.default }))
);

export const AccessibilitySettingsDialog = lazy(() => 
  import('./dialogs/AccessibilitySettingsDialog').then(module => ({ default: module.default }))
);

export const DataExportImportDialog = lazy(() => 
  import('./dialogs/DataExportImportDialog').then(module => ({ default: module.default }))
);

// 開発ツールの遅延読み込み
export const SupabaseDebug = lazy(() => 
  import('./auth/SupabaseDebug').then(module => ({ default: module.default }))
);

// AI関連コンポーネントの遅延読み込み
export const AIAssistantPanel = lazy(() => 
  import('./ai/AIAssistantPanel').then(module => ({ default: module.default }))
);

export const KnowledgeGraphVisualization = lazy(() => 
  import('./ai/KnowledgeGraphVisualization').then(module => ({ default: module.default }))
);

// 分析関連コンポーネントの遅延読み込み
export const AnalyticsDashboard = lazy(() => 
  import('./analytics/AnalyticsDashboard').then(module => ({ default: module.default }))
);