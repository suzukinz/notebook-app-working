import React from 'react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { Note, SubFolder } from '../../types';

interface MiniMindMapProps {
  className?: string;
  currentNote?: Note | null;
  onNodeClick?: (nodeId: string, nodeType: string) => void;
}

const MiniMindMap: React.FC<MiniMindMapProps> = ({ className = '', currentNote, onNodeClick }) => {
  const {
    selectedWorkspace,
    selectedNotebook,
    selectedSubFolder,
    notesData,
    subFoldersData,
    workspaces,
    notebooks,
    setSelectedNote,
    setCurrentPage,
    setShowMindMap,
    setMindMapLevel,
    setMindMapFocus
  } = useNotebookStore();

  // 縮小版用のデータ生成（全体構造を常に表示・関連性も表示）
  const generateMiniMindMapData = () => {
    const nodes: any[] = [];
    const connections: any[] = [];
    const relationConnections: any[] = [];
    
    // 中心にワークスペース
    const workspace = workspaces.find(w => w.id === selectedWorkspace);
    if (workspace) {
      nodes.push({
        id: workspace.id,
        type: 'workspace',
        x: 90,
        y: 20,
        width: 40,
        height: 40,
        label: workspace.name.length > 4 ? workspace.name.substring(0, 4) + '...' : workspace.name,
        icon: workspace.icon,
        color: workspace.color,
        radius: 20,
        isActive: true
      });

      // 全てのノートブックを表示
      const currentNotebooks = notebooks[selectedWorkspace] || [];
      currentNotebooks.forEach((notebook, index) => {
        const notebookX = 30 + index * 60;
        const notebookY = 65;
        
        nodes.push({
          id: notebook.id,
          type: 'notebook',
          x: notebookX,
          y: notebookY,
          width: 45,
          height: 15,
          label: notebook.name.length > 5 ? notebook.name.substring(0, 5) + '...' : notebook.name,
          icon: '📚',
          color: notebook.color,
          isActive: selectedNotebook === notebook.id
        });

        connections.push({
          from: { x: 90, y: 40 },
          to: { x: notebookX, y: notebookY },
          key: `workspace-${notebook.id}`,
          type: 'hierarchy'
        });

        // 選択中のノートブックのサブフォルダのみ表示
        if (selectedNotebook === notebook.id) {
          const subFolders = subFoldersData[notebook.id] || [];
          subFolders.forEach((subFolder: SubFolder, sfIndex: number) => {
            const subFolderX = notebookX - 20 + sfIndex * 40;
            const subFolderY = 100;
            
            nodes.push({
              id: subFolder.id,
              type: 'subfolder',
              x: subFolderX,
              y: subFolderY,
              width: 35,
              height: 12,
              label: subFolder.name.length > 4 ? subFolder.name.substring(0, 4) + '...' : subFolder.name,
              icon: '📁',
              color: subFolder.color,
              isActive: selectedSubFolder === subFolder.id
            });

            connections.push({
              from: { x: notebookX, y: notebookY + 7 },
              to: { x: subFolderX, y: subFolderY },
              key: `notebook-${subFolder.id}`,
              type: 'hierarchy'
            });

            // 選択中のサブフォルダのノートのみ表示
            if (selectedSubFolder === subFolder.id) {
              const notes = notesData[subFolder.id] || [];
              notes.slice(0, 4).forEach((note: Note, noteIndex: number) => {
                const noteX = subFolderX - 15 + noteIndex * 30;
                const noteY = 135;
                
                nodes.push({
                  id: note.id,
                  type: 'note',
                  x: noteX,
                  y: noteY,
                  width: 20,
                  height: 10,
                  label: note.title.length > 3 ? note.title.substring(0, 3) + '...' : note.title,
                  icon: note.isPinned ? '📌' : '📄',
                  color: 'white',
                  isActive: currentNote?.id === note.id,
                  note: note
                });

                connections.push({
                  from: { x: subFolderX, y: subFolderY + 6 },
                  to: { x: noteX, y: noteY },
                  key: `subfolder-${note.id}`,
                  type: 'hierarchy'
                });
              });

              // 残りのノートがある場合は「...」を表示
              if (notes.length > 4) {
                nodes.push({
                  id: 'more',
                  type: 'more',
                  x: subFolderX + 45,
                  y: 135,
                  width: 15,
                  height: 10,
                  label: '...',
                  icon: '',
                  color: 'lightgray',
                  isActive: false
                });
              }
            }
          });
        }
      });

      // 関連性の矢印を追加
      if (currentNote) {
        const allNotes = Object.values(notesData).flat();
        const relatedNotes = allNotes.filter(note => {
          if (note.id === currentNote.id) return false;
          
          // 共通タグがある場合
          const commonTags = note.tags.filter(tag => currentNote.tags.includes(tag));
          if (commonTags.length > 0) return true;
          
          // 同じ日に更新された場合
          if (note.updatedAt === currentNote.updatedAt) return true;
          
          // お気に入り同士の場合
          if (note.isFavorite && currentNote.isFavorite) return true;
          
          return false;
        });

        // 関連ノートとの関係線を追加
        relatedNotes.forEach(relatedNote => {
          const relatedNodeInMap = nodes.find(node => node.id === relatedNote.id);
          const currentNodeInMap = nodes.find(node => node.id === currentNote.id);
          
          if (relatedNodeInMap && currentNodeInMap) {
            const commonTags = relatedNote.tags.filter(tag => currentNote.tags.includes(tag));
            const relationType = commonTags.length > 0 ? 'tag' : 
                               (relatedNote.updatedAt === currentNote.updatedAt ? 'recent' : 'favorite');
            
            relationConnections.push({
              from: { x: currentNodeInMap.x, y: currentNodeInMap.y },
              to: { x: relatedNodeInMap.x, y: relatedNodeInMap.y },
              key: `relation-${currentNote.id}-${relatedNote.id}`,
              type: relationType,
              tags: commonTags
            });
          }
        });
      }
    }

    return { nodes, connections, relationConnections };
  };

  const { nodes, connections, relationConnections } = generateMiniMindMapData();

  const getNodeColor = (color: string) => {
    const colors = {
      blue: '#3b82f6',
      green: '#10b981',
      purple: '#8b5cf6',
      yellow: '#f59e0b',
      red: '#ef4444',
      orange: '#f97316',
      pink: '#ec4899',
      gray: '#6b7280',
      white: '#ffffff',
      lightgray: '#f3f4f6'
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  const handleNodeClick = (node: any) => {
    if (node.type === 'more') {
      // 全体マインドマップを開く
      setMindMapLevel('subfolder');
      setMindMapFocus(selectedSubFolder);
      setShowMindMap(true);
      return;
    }

    if (node.type === 'note' && node.note) {
      setSelectedNote(node.note);
      setCurrentPage(0);
      if (onNodeClick) {
        onNodeClick(node.id, node.type);
      }
    } else if (node.type === 'notebook') {
      // ノートブックを選択（状態を更新するだけ）
      const { setSelectedNotebook } = useNotebookStore.getState();
      setSelectedNotebook(node.id);
    } else if (node.type === 'subfolder') {
      // サブフォルダを選択（状態を更新するだけ）
      const { setSelectedSubFolder } = useNotebookStore.getState();
      setSelectedSubFolder(node.id);
    }
  };

  const openFullMindMap = () => {
    setMindMapLevel('workspace');
    setMindMapFocus(null);
    setShowMindMap(true);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-2 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-gray-700">構造</h3>
        <button
          onClick={openFullMindMap}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          詳細
        </button>
      </div>
      
      <div className="w-full h-48 overflow-hidden">
        <svg 
          width="180" 
          height="180"
          viewBox="0 0 180 180"
          className="w-full h-full"
        >
          {/* 階層接続線 */}
          {connections.map((conn) => (
            <line
              key={conn.key}
              x1={conn.from.x}
              y1={conn.from.y}
              x2={conn.to.x}
              y2={conn.to.y}
              stroke="#e5e7eb"
              strokeWidth="1"
              className="transition-all duration-300"
            />
          ))}
          
          {/* 関連性接続線 */}
          {relationConnections.map((conn) => {
            const strokeStyle = conn.type === 'tag' ? '#3b82f6' : 
                              conn.type === 'recent' ? '#10b981' : '#f59e0b';
            const strokeDasharray = conn.type === 'tag' ? '3,3' : 
                                  conn.type === 'recent' ? '2,2' : '4,2';
            return (
              <line
                key={conn.key}
                x1={conn.from.x}
                y1={conn.from.y}
                x2={conn.to.x}
                y2={conn.to.y}
                stroke={strokeStyle}
                strokeWidth="1"
                strokeDasharray={strokeDasharray}
                className="transition-all duration-300"
                opacity="0.7"
              />
            );
          })}
          
          {/* ノード */}
          {nodes.map((node) => (
            <g key={node.id}>
              {node.type === 'workspace' ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={getNodeColor(node.color)}
                  stroke={node.isActive ? "#1f2937" : "#ffffff"}
                  strokeWidth={node.isActive ? "2" : "1"}
                  className="transition-all duration-300 cursor-pointer hover:opacity-80"
                  onClick={() => handleNodeClick(node)}
                />
              ) : (
                <rect
                  x={node.x - node.width / 2}
                  y={node.y - node.height / 2}
                  width={node.width}
                  height={node.height}
                  fill={getNodeColor(node.color)}
                  stroke={node.isActive ? "#1f2937" : getNodeColor(node.color)}
                  strokeWidth={node.isActive ? "2" : "1"}
                  rx="3"
                  className="transition-all duration-300 cursor-pointer hover:opacity-80"
                  onClick={() => handleNodeClick(node)}
                />
              )}
              
              {/* ノードラベル */}
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-medium fill-gray-900 pointer-events-none"
                fontSize="6"
              >
                {node.icon && (
                  <tspan className="text-xs">{node.icon}</tspan>
                )}
                {node.label && node.icon && " "}
                {node.label}
              </text>
              
              {/* アクティブノードの強調表示 */}
              {node.isActive && (
                <circle
                  cx={node.x + node.width / 2 - 3}
                  cy={node.y - node.height / 2 + 3}
                  r="2"
                  fill="#10b981"
                  className="pointer-events-none"
                />
              )}
            </g>
          ))}
        </svg>
      </div>
      
      {currentNote && (
        <div className="mt-1 p-1 bg-gray-50 rounded text-xs">
          <div className="font-medium text-gray-900 truncate text-xs">
            {currentNote.title}
          </div>
          <div className="text-gray-600 text-xs mt-0.5">
            {currentNote.pages.length}p
          </div>
        </div>
      )}
      
      {/* 関連性の凡例 */}
      {relationConnections.length > 0 && (
        <div className="mt-1 p-1 bg-gray-50 rounded text-xs">
          <div className="font-medium text-gray-700 text-xs mb-1">関連性</div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <div className="w-3 h-px bg-blue-500" style={{borderTop: '1px dashed #3b82f6'}}></div>
              <span className="text-xs text-gray-600">同じタグ</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-px bg-green-500" style={{borderTop: '1px dashed #10b981'}}></div>
              <span className="text-xs text-gray-600">同日更新</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-px bg-yellow-500" style={{borderTop: '1px dashed #f59e0b'}}></div>
              <span className="text-xs text-gray-600">お気に入り</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniMindMap;