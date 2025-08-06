import React from 'react';
import { FileText, Clock } from 'lucide-react';
import { DashboardStats } from '../../utils/analytics';
import { useNotebookStore } from '../../store/useNotebookStore';

interface RecentNotesProps {
  notes: DashboardStats['recentNotes'];
  onNoteClick?: (note: any) => void;
}

const RecentNotes: React.FC<RecentNotesProps> = ({ notes, onNoteClick }) => {
  const { 
    setSelectedWorkspace, 
    setSelectedNotebook, 
    setSelectedSubFolder, 
    setSelectedNote,
    setShowDashboard,
    notebooks,
    subFoldersData,
    notesData
  } = useNotebookStore();
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'たった今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}時間前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}日前`;
    
    return date.toLocaleDateString('ja-JP');
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">最近のノートがありません</p>
      </div>
    );
  }

  const handleNoteClick = (note: any) => {
    // ノートのIDから実際のノートオブジェクトを取得
    let actualNote = null;
    let foundSubFolder: string | null = null;
    
    Object.entries(notesData).forEach(([subFolderId, notesInFolder]) => {
      const found = notesInFolder.find(n => n.id === note.id);
      if (found) {
        actualNote = found;
        foundSubFolder = subFolderId;
      }
    });
    
    if (actualNote && foundSubFolder) {
      // サブフォルダを見つけてノートブックを特定
      let foundNotebook: string | null = null;
      Object.entries(subFoldersData).forEach(([notebookId, folders]) => {
        if (folders.some(f => f.id === foundSubFolder)) {
          foundNotebook = notebookId;
        }
      });
      
      if (foundNotebook) {
        // ノートブックからワークスペースを特定
        const notebook = Object.values(notebooks).flat().find(nb => nb.id === foundNotebook);
        if (notebook) {
          setSelectedWorkspace(notebook.workspaceId);
          setSelectedNotebook(foundNotebook);
          setSelectedSubFolder(foundSubFolder);
          setSelectedNote(actualNote);
          setShowDashboard(false);
        }
      }
    }
    
    if (onNoteClick) {
      onNoteClick(note);
    }
  };

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div 
          key={note.id}
          className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          onClick={() => handleNoteClick(note)}
        >
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {note.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {note.workspaceName} / {note.notebookName}
            </p>
            <div className="flex items-center mt-1 text-xs text-gray-400">
              <Clock className="w-3 h-3 mr-1" />
              {formatRelativeTime(note.lastModified)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentNotes;