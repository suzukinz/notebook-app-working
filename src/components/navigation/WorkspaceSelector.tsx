import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import WorkspaceContextMenu from '../dialogs/WorkspaceContextMenu';

interface WorkspaceSelectorProps {
  selectedWorkspace: string;
  onWorkspaceChange: (workspace: string) => void;
  onEditWorkspace?: (workspace: { id: string; name: string; icon: string; color: string }) => void;
  className?: string;
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  selectedWorkspace,
  onWorkspaceChange,
  onEditWorkspace,
  className = ''
}) => {
  const { workspaces } = useNotebookStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    workspace: { id: string; name: string; icon: string; color: string };
  } | null>(null);
  
  const getWorkspaceStyle = (workspaceId: string, isContainer: boolean = false) => {
    const isSelected = selectedWorkspace === workspaceId;
    const workspace = workspaces.find(w => w.id === workspaceId);
    
    if (isContainer) {
      const containerClasses = {
        blue: isSelected ? 'bg-blue-100 border-blue-300' : 'hover:bg-blue-50',
        green: isSelected ? 'bg-green-100 border-green-300' : 'hover:bg-green-50',
        purple: isSelected ? 'bg-purple-100 border-purple-300' : 'hover:bg-purple-50',
        red: isSelected ? 'bg-red-100 border-red-300' : 'hover:bg-red-50',
        orange: isSelected ? 'bg-orange-100 border-orange-300' : 'hover:bg-orange-50',
        yellow: isSelected ? 'bg-yellow-100 border-yellow-300' : 'hover:bg-yellow-50',
        pink: isSelected ? 'bg-pink-100 border-pink-300' : 'hover:bg-pink-50',
        indigo: isSelected ? 'bg-indigo-100 border-indigo-300' : 'hover:bg-indigo-50',
        gray: isSelected ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'
      };
      return containerClasses[workspace?.color as keyof typeof containerClasses] || containerClasses.blue;
    }
    
    const textClasses = {
      blue: isSelected ? 'text-blue-800' : 'text-blue-600',
      green: isSelected ? 'text-green-800' : 'text-green-600',
      purple: isSelected ? 'text-purple-800' : 'text-purple-600',
      red: isSelected ? 'text-red-800' : 'text-red-600',
      orange: isSelected ? 'text-orange-800' : 'text-orange-600',
      yellow: isSelected ? 'text-yellow-800' : 'text-yellow-600',
      pink: isSelected ? 'text-pink-800' : 'text-pink-600',
      indigo: isSelected ? 'text-indigo-800' : 'text-indigo-600',
      gray: isSelected ? 'text-gray-800' : 'text-gray-600'
    };
    
    return textClasses[workspace?.color as keyof typeof textClasses] || textClasses.blue;
  };

  const handleContextMenu = (e: React.MouseEvent, workspace: { id: string; name: string; icon: string; color: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      workspace
    });
  };

  const handleEdit = () => {
    if (contextMenu && onEditWorkspace) {
      onEditWorkspace(contextMenu.workspace);
      setContextMenu(null);
    }
  };

  const handleDelete = () => {
    if (contextMenu) {
      const { deleteWorkspace } = useNotebookStore.getState();
      if (window.confirm(`ワークスペース「${contextMenu.workspace.name}」を削除しますか？\n関連するすべてのノートブックとノートも削除されます。`)) {
        deleteWorkspace(contextMenu.workspace.id);
        setContextMenu(null);
      }
    }
  };

  return (
    <>
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {workspaces.map(workspace => (
          <div key={workspace.id} className="relative group">
            <div
              className={`flex items-center px-2 py-1 rounded-md text-xs font-medium transition-all ${getWorkspaceStyle(workspace.id, true)}`}
            >
              <div
                onClick={() => onWorkspaceChange(workspace.id)}
                onContextMenu={(e) => handleContextMenu(e, workspace)}
                className={`flex items-center flex-1 cursor-pointer ${getWorkspaceStyle(workspace.id)}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onWorkspaceChange(workspace.id);
                  }
                }}
              >
                <span className="mr-1 text-sm">{workspace.icon}</span>
                <span className="truncate max-w-16">{workspace.name}</span>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, workspace);
                }}
                className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity cursor-pointer"
                aria-label="ワークスペースオプション"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // キーボードイベントの場合、マウスイベントを模擬
                    const mockMouseEvent = {
                      clientX: 0,
                      clientY: 0,
                      preventDefault: () => {},
                      stopPropagation: () => {}
                    } as React.MouseEvent<Element, MouseEvent>;
                    handleContextMenu(mockMouseEvent, workspace);
                  }
                }}
              >
                <MoreVertical size={10} />
              </div>
            </div>
          </div>
        ))}
        
      </div>

      {contextMenu && (
        <WorkspaceContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
          canDelete={workspaces.length > 1}
        />
      )}
    </>
  );
};

export default WorkspaceSelector;