// 基本的な型定義
export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Notebook {
  id: string;
  workspaceId: string;
  name: string;
  count: number;
  color: string;
  description?: string;
  image?: string; // Base64画像データ
}

export interface SubFolder {
  id: string;
  name: string;
  count: number;
  color: string;
  image?: string; // Base64画像データ
}

export interface Page {
  id: number;
  title: string;
  content: string;
}

export interface Note {
  id: number;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isFavorite: boolean;
  pages: Page[];
  editorType?: 'rich' | 'markdown'; // エディタタイプ
  color?: string; // ノートカードの色
}


export interface Tag {
  name: string;
  color: string;
  count: number;
}

export interface Activity {
  id: string;
  type: 'created' | 'updated' | 'deleted';
  noteTitle: string;
  timestamp: string;
  folder: string;
}

// 状態管理の型定義
export interface NotebookState {
  // 選択状態
  selectedWorkspace: string;
  selectedNotebook: string;
  selectedSubFolder: string;
  selectedNote: Note | null;
  currentPage: number;
  isSyncing: boolean;
  
  // 検索・フィルタ
  searchQuery: string;
  selectedTags: string[];
  viewMode: 'list' | 'grid';
  
  // 展開状態
  expandedNotebooks: string[];
  expandedSubFolders: string[];
  
  // マインドマップ
  showMindMap: boolean;
  showDashboard: boolean;
  mindMapZoom: number;
  mindMapLevel: 'workspace' | 'notebook' | 'subfolder' | 'note';
  mindMapFocus: string | null;
  mindMapHistory: string[];
  
  // プレビュー
  previewNote: Note | null;
  previewPage: number;
  
  // データ
  notesData: Record<string, Note[]>;
  subFoldersData: Record<string, SubFolder[]>;
  
  // ダイアログ
  showAddFolderDialog: boolean;
  newFolderName: string;
  newFolderColor: string;
  
  // 編集状態
  editableTitle: string;
  editablePageTitle: string;
  editableContent: string;
  previewEditableTitle: string;
  previewEditablePageTitle: string;
  previewEditableContent: string;
  
  // 動的データ
  workspaces: Workspace[];
  notebooks: Record<string, Notebook[]>;
  
  // マインドマップノード位置
  mindMapNodePositions: Record<string, NodePosition>;
}

// アクション型定義
export interface NotebookActions {
  // 選択関連
  setSelectedWorkspace: (workspace: string) => void;
  setSelectedNotebook: (notebook: string) => void;
  setSelectedSubFolder: (subFolder: string) => void;
  setSelectedNote: (note: Note | null) => void;
  setCurrentPage: (page: number) => void;
  
  // 検索・フィルタ
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  
  // 展開状態
  toggleNotebookExpanded: (notebook: string) => void;
  toggleSubFolderExpanded: (subFolder: string) => void;
  
  // マインドマップ
  setShowMindMap: (show: boolean) => void;
  setShowDashboard: (show: boolean) => void;
  setMindMapZoom: (zoom: number) => void;
  setMindMapLevel: (level: 'workspace' | 'notebook' | 'subfolder' | 'note') => void;
  setMindMapFocus: (focus: string | null) => void;
  addToMindMapHistory: (item: string) => void;
  
  // プレビュー
  setPreviewNote: (note: Note | null) => void;
  setPreviewPage: (page: number) => void;
  
  // データ更新
  updateNote: (noteId: number, updates: Partial<Note>) => void;
  addNote: (subFolderId: string, note: Omit<Note, 'id'>) => void;
  addNoteToSubFolder: (subFolderId: string, editorType?: 'rich' | 'markdown') => void;
  deleteNote: (noteId: number) => void;
  addSubFolder: (notebookId: string, subFolder: Omit<SubFolder, 'id'>) => void;
  deleteSubFolder: (subFolderId: string) => void;
  deleteNotebook: (notebookId: string) => void;
  
  // ダイアログ
  setShowAddFolderDialog: (show: boolean) => void;
  setNewFolderName: (name: string) => void;
  setNewFolderColor: (color: string) => void;
  
  // 編集状態
  setEditableTitle: (title: string) => void;
  setEditablePageTitle: (title: string) => void;
  setEditableContent: (content: string) => void;
  setPreviewEditableTitle: (title: string) => void;
  setPreviewEditablePageTitle: (title: string) => void;
  setPreviewEditableContent: (content: string) => void;
  
  // 動的データ操作
  addWorkspace: (workspace: { name: string; icon: string; color: string }) => void;
  addNotebook: (notebook: { name: string; color: string; description?: string; image?: string }) => void;
  editWorkspace: (workspaceId: string, updates: { name: string; icon: string; color: string }) => void;
  deleteWorkspace: (workspaceId: string) => void;
  
  // データ管理
  exportAllData: () => void;
  importAllData: () => Promise<void>;
  
  // Supabase同期
  syncWithSupabase?: (userId: string) => Promise<void>;
  
  // マインドマップノード位置
  setMindMapNodePosition: (nodeId: string, position: NodePosition) => void;
  clearMindMapNodePositions: () => void;
}

// 統合型
export type NotebookStore = NotebookState & NotebookActions;


// カラーパレット
export const COLORS = [
  'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'indigo', 'gray'
];

// 表示モード
export const VIEW_MODES = ['list', 'grid'] as const;
export type ViewMode = typeof VIEW_MODES[number];

// マインドマップレベル
export const MINDMAP_LEVELS = ['workspace', 'notebook', 'subfolder', 'note'] as const;
export type MindMapLevel = typeof MINDMAP_LEVELS[number];

// マインドマップ型定義
export interface MindMapNode {
  id: string;
  type: 'workspace' | 'notebook' | 'subfolder' | 'note' | 'more';
  x: number;
  y: number;
  radius: number;
  color: string;
  clickable?: boolean;
  isActive?: boolean;
  isPinned?: boolean;
  isFavorite?: boolean;
  note?: Note;
  tooltip: string;
  depth: number;
}

export interface MindMapConnection {
  from: { x: number; y: number; nodeId: string };
  to: { x: number; y: number; nodeId: string };
  key: string;
  type: 'hierarchy' | 'relation' | 'tag' | 'recent' | 'favorite';
  depth?: number;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeVelocity {
  x: number;
  y: number;
}

export interface DragState {
  isDragging: boolean;
  draggedNode: MindMapNode | null;
  dragOffset: { x: number; y: number };
}

// Electron API type definitions
export interface ElectronAPI {
  getSyncInfo?: () => Promise<{ port: number; wsPort: number }>;
  onSyncServerReady?: (callback: (info: { port: number; wsPort: number }) => void) => void;
  onSyncReceiveData?: (callback: (data: any) => void) => void;
  onSyncWebSocketMessage?: (callback: (data: any) => void) => void;
  onSyncRequestUserInfo?: (callback: () => void) => void;
  sendSyncUserInfoResponse?: (userInfo: any) => void;
}

