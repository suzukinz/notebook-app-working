import React, { useCallback } from 'react';
import { ChevronRight, ChevronDown, BookOpen, Folder, Plus, FolderPlus, BookPlus, Trash2 } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useIndexedDBStore } from '../../store/useIndexedDBStore';

interface NotebookTreeProps {
  selectedWorkspace: string;
  selectedNotebook: string;
  selectedSubFolder: string;
  expandedNotebooks: string[];
  expandedSubFolders: string[];
  onNotebookSelect: (notebook: string) => void;
  onSubFolderSelect: (subFolder: string) => void;
  onNotebookToggle: (notebook: string) => void;
  onSubFolderToggle: (subFolder: string) => void;
  onAddFolderClick: () => void;
  onAddNotebookClick?: () => void;
  className?: string;
}

const NotebookTree: React.FC<NotebookTreeProps> = ({
  selectedWorkspace,
  selectedNotebook,
  selectedSubFolder,
  expandedNotebooks,
  expandedSubFolders,
  onNotebookSelect,
  onSubFolderSelect,
  onNotebookToggle,
  onSubFolderToggle,
  onAddFolderClick,
  onAddNotebookClick,
  className = ''
}) => {
  const { subFoldersData, addNoteToSubFolder, notebooks, deleteNotebook, deleteSubFolder, notesData } = useNotebookStore();
  const { setViewMode } = useIndexedDBStore();
  
  // 実際のノート数を計算する関数
  const getActualNoteCount = (subFolderId: string) => {
    const notes = notesData[subFolderId] || [];
    return notes.length;
  };
  
  // ノートブックの実際のサブフォルダ数を計算
  const getActualSubFolderCount = (notebookId: string) => {
    const subFolders = subFoldersData[notebookId] || [];
    return subFolders.length;
  };
  
  console.log('🌳 NotebookTree render:', {
    selectedWorkspace,
    selectedNotebook,
    selectedSubFolder,
    notebooks: notebooks[selectedWorkspace] || [],
    subFoldersData: subFoldersData[selectedNotebook] || [],
    notesDataKeys: Object.keys(notesData),
    notesDataSample: Object.entries(notesData).slice(0, 3)
  });
  
  const handleDeleteNotebook = useCallback((e: React.MouseEvent, notebookId: string) => {
    e.stopPropagation();
    if (window.confirm('このノートブックとすべての内容を削除しますか？この操作は取り消せません。')) {
      deleteNotebook(notebookId);
    }
  }, [deleteNotebook]);
  
  const handleDeleteSubFolder = useCallback((e: React.MouseEvent, subFolderId: string) => {
    e.stopPropagation();
    if (window.confirm('このフォルダとすべてのノートを削除しますか？この操作は取り消せません。')) {
      deleteSubFolder(subFolderId);
    }
  }, [deleteSubFolder]);
  
  const getNotebookStyle = (notebookId: string) => {
    const isSelected = selectedNotebook === notebookId;
    const notebook = notebooks[selectedWorkspace]?.find(n => n.id === notebookId);
    
    const colorClasses = {
      blue: isSelected ? 'bg-blue-100 text-blue-800' : 'text-blue-600',
      green: isSelected ? 'bg-green-100 text-green-800' : 'text-green-600',
      yellow: isSelected ? 'bg-yellow-100 text-yellow-800' : 'text-yellow-600',
      purple: isSelected ? 'bg-purple-100 text-purple-800' : 'text-purple-600',
      pink: isSelected ? 'bg-pink-100 text-pink-800' : 'text-pink-600',
      red: isSelected ? 'bg-red-100 text-red-800' : 'text-red-600',
      orange: isSelected ? 'bg-orange-100 text-orange-800' : 'text-orange-600',
      indigo: isSelected ? 'bg-indigo-100 text-indigo-800' : 'text-indigo-600',
      gray: isSelected ? 'bg-gray-100 text-gray-800' : 'text-gray-600'
    };
    
    return colorClasses[notebook?.color as keyof typeof colorClasses] || colorClasses.gray;
  };

  const getSubFolderStyle = (subFolderId: string) => {
    const isSelected = selectedSubFolder === subFolderId;
    const subFolder = subFoldersData[selectedNotebook]?.find(sf => sf.id === subFolderId);
    
    const colorClasses = {
      blue: isSelected ? 'bg-blue-50 text-blue-700' : 'text-blue-600',
      green: isSelected ? 'bg-green-50 text-green-700' : 'text-green-600',
      yellow: isSelected ? 'bg-yellow-50 text-yellow-700' : 'text-yellow-600',
      purple: isSelected ? 'bg-purple-50 text-purple-700' : 'text-purple-600',
      pink: isSelected ? 'bg-pink-50 text-pink-700' : 'text-pink-600',
      red: isSelected ? 'bg-red-50 text-red-700' : 'text-red-600',
      orange: isSelected ? 'bg-orange-50 text-orange-700' : 'text-orange-600',
      indigo: isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-indigo-600',
      gray: isSelected ? 'bg-gray-50 text-gray-700' : 'text-gray-600'
    };
    
    return colorClasses[subFolder?.color as keyof typeof colorClasses] || colorClasses.gray;
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {onAddNotebookClick && (
        <button
          onClick={onAddNotebookClick}
          className="w-full flex items-center p-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors mb-2"
        >
          <BookPlus size={14} className="mr-2" />
          ノートブック追加
        </button>
      )}
      
      {notebooks[selectedWorkspace]?.map(notebook => (
        <div key={notebook.id}>
          <div
            className={`group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors ${getNotebookStyle(notebook.id)}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNotebookToggle(notebook.id);
              }}
              className="mr-2 p-1 rounded hover:bg-gray-200 transition-colors"
            >
              {expandedNotebooks.includes(notebook.id) ? 
                <ChevronDown size={14} /> : 
                <ChevronRight size={14} />
              }
            </button>
            <div 
              className="flex items-center min-w-0 flex-1 cursor-pointer"
              onClick={() => {
                onNotebookSelect(notebook.id);
                onSubFolderSelect(''); // サブフォルダを選択解除してフォルダ選択モードに
                setViewMode('notes'); // ノートブックを選択したらnotesモードに切り替え
              }}
            >
              {notebook.image ? (
                <img 
                  src={notebook.image} 
                  alt={notebook.name}
                  className="w-5 h-5 mr-2 flex-shrink-0 rounded object-cover"
                />
              ) : (
                <BookOpen size={20} className="mr-2 flex-shrink-0" />
              )}
              <span className="text-sm font-medium truncate">{notebook.name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => handleDeleteNotebook(e, notebook.id)}
                className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                title="ノートブックを削除"
              >
                <Trash2 size={14} />
              </button>
              <span className="text-xs text-gray-500">{getActualSubFolderCount(notebook.id)}</span>
            </div>
          </div>
          
          {expandedNotebooks.includes(notebook.id) && (
            <div className="ml-6 mt-1 space-y-1">
              {subFoldersData[notebook.id]?.map(subFolder => (
                <div key={subFolder.id}>
                  <div
                    className={`group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors ${getSubFolderStyle(subFolder.id)}`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSubFolderToggle(subFolder.id);
                      }}
                      className="mr-2 p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      {expandedSubFolders.includes(subFolder.id) ? 
                        <ChevronDown size={12} /> : 
                        <ChevronRight size={12} />
                      }
                    </button>
                    <div 
                      className="flex items-center min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        onSubFolderSelect(subFolder.id);
                        setViewMode('notes'); // サブフォルダを選択したらnotesモードに切り替え
                      }}
                    >
                      {subFolder.image ? (
                        <img 
                          src={subFolder.image} 
                          alt={subFolder.name}
                          className="w-4 h-4 mr-2 flex-shrink-0 rounded object-cover"
                        />
                      ) : (
                        <Folder size={16} className="mr-2 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{subFolder.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addNoteToSubFolder(subFolder.id);
                        }}
                        className="p-1 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={`${subFolder.name}にノートを追加`}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSubFolder(e, subFolder.id)}
                        className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="フォルダを削除"
                      >
                        <Trash2 size={12} />
                      </button>
                      <span className="text-xs text-gray-500">{getActualNoteCount(subFolder.id)}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={onAddFolderClick}
                className="w-full flex items-center p-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FolderPlus size={14} className="mr-2" />
                フォルダ追加
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotebookTree;