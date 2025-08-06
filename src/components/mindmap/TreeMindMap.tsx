import React, { useState, useRef, useCallback, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Globe, Building, Folder, Plus } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { MindMapNode, MindMapConnection } from '../../types';
import RichNoteEditor from '../notes/RichNoteEditor';
import MindMapButtons from './MindMapButtons';

interface TreeMindMapProps {
  className?: string;
}

// ツリーレイアウト設定
const TREE_CONFIG = {
  nodeWidth: 180,
  nodeHeight: 60,
  levelHeight: 160, // 縦の階層間隔を少し幅広に
  horizontalSpacing: 220, // 横のノード間隔を少し幅広に
  rootY: 80, // ルートノードのY位置
  colors: {
    workspace: '#3B82F6',
    notebook: '#10B981',
    subfolder: '#F59E0B',
    note: '#EF4444'
  },
  gradients: {
    workspace: {
      bg: '#1E40AF',
      border: '#3B82F6',
      text: '#FFFFFF'
    },
    notebook: {
      bg: '#059669', 
      border: '#10B981',
      text: '#FFFFFF'
    },
    subfolder: {
      bg: '#D97706',
      border: '#F59E0B', 
      text: '#FFFFFF'
    },
    note: {
      bg: '#DC2626',
      border: '#EF4444',
      text: '#FFFFFF'
    }
  },
  shadows: {
    normal: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
    hover: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
    active: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))'
  }
};

const TreeMindMap: React.FC<TreeMindMapProps> = ({ className = '' }) => {
  const {
    showMindMap,
    selectedWorkspace,
    selectedNotebook,
    selectedSubFolder,
    mindMapZoom,
    previewNote,
    notesData,
    subFoldersData,
    workspaces,
    notebooks,
    mindMapNodePositions,
    setShowMindMap,
    setMindMapZoom,
    addNoteToSubFolder
    // setMindMapNodePosition
  } = useNotebookStore();

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'workspace' | 'all-workspaces' | 'current-folder'>('workspace');
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedNodeId: string | null;
    startPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
  }>({ isDragging: false, draggedNodeId: null, startPosition: { x: 0, y: 0 }, currentPosition: { x: 0, y: 0 } });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ツリーデータの構築
  const treeData = useMemo(() => {
    
    const nodes: MindMapNode[] = [];
    const connections: MindMapConnection[] = [];

    // データが存在しない場合のフォールバック
    if (!workspaces || workspaces.length === 0) {
      console.log('🗺️ No workspaces found');
      return { nodes: [], connections: [] };
    }

    if (viewMode === 'all-workspaces') {
      console.log('🗺️ Rendering all-workspaces mode');
      // 全ワークスペース表示モード - 縦型ツリー構造
      const centerX = 600;
      const workspaceY = TREE_CONFIG.rootY;
      const workspaceSpacing = TREE_CONFIG.horizontalSpacing;
      const workspaceStartX = centerX - ((workspaces.length - 1) * workspaceSpacing) / 2;

      workspaces.forEach((workspace, wsIndex) => {
        const workspaceX = workspaceStartX + wsIndex * workspaceSpacing;
        
        // ワークスペースノード
        const wsX = workspaceX;
        const wsY = workspaceY;
        nodes.push({
          id: workspace.id,
          type: 'workspace',
          x: wsX,
          y: wsY,
          radius: 35,
          color: TREE_CONFIG.colors.workspace,
          clickable: true,
          isActive: selectedWorkspace === workspace.id,
          tooltip: `${workspace.icon} ${workspace.name}`,
          depth: 0
        });

        // ワークスペース内のノートブック
        const workspaceNotebooks = notebooks[workspace.id] || [];
        const notebookSpacing = Math.min(200, workspaceSpacing / Math.max(1, workspaceNotebooks.length));
        const notebookStartX = workspaceX - ((workspaceNotebooks.length - 1) * notebookSpacing) / 2;

        workspaceNotebooks.forEach((notebook, nbIndex) => {
          const notebookX = notebookStartX + nbIndex * notebookSpacing;
          const notebookY = workspaceY + TREE_CONFIG.levelHeight;

          // ノートブックノード
          const nbX = notebookX;
          const nbY = notebookY;
          nodes.push({
            id: notebook.id,
            type: 'notebook',
            x: nbX,
            y: nbY,
            radius: 25,
            color: TREE_CONFIG.colors.notebook,
            clickable: true,
            isActive: selectedNotebook === notebook.id,
            tooltip: `📚 ${notebook.name} (${notebook.count}ノート)`,
            depth: 1
          });

          // ワークスペース→ノートブック接続
          connections.push({
            from: { x: wsX, y: wsY, nodeId: workspace.id },
            to: { x: nbX, y: nbY, nodeId: notebook.id },
            key: `all-ws-${workspace.id}-nb-${notebook.id}`,
            type: 'hierarchy',
            depth: 1
          });

          // ノートブック内のサブフォルダ
          const subFolders = subFoldersData[notebook.id] || [];
          const folderSpacing = Math.min(150, notebookSpacing / Math.max(1, subFolders.length));
          const folderStartX = notebookX - ((subFolders.length - 1) * folderSpacing) / 2;

          subFolders.forEach((subFolder, sfIndex) => {
            const folderX = folderStartX + sfIndex * folderSpacing;
            const folderY = notebookY + TREE_CONFIG.levelHeight;

            // サブフォルダノード
            const sfX = folderX;
            const sfY = folderY;
            nodes.push({
              id: subFolder.id,
              type: 'subfolder',
              x: sfX,
              y: sfY,
              radius: 20,
              color: TREE_CONFIG.colors.subfolder,
              clickable: true,
              isActive: selectedSubFolder === subFolder.id,
              tooltip: `📁 ${subFolder.name} (${subFolder.count}ノート)`,
              depth: 2
            });

            // ノートブック→サブフォルダ接続
            connections.push({
              from: { x: nbX, y: nbY, nodeId: notebook.id },
              to: { x: sfX, y: sfY, nodeId: subFolder.id },
              key: `all-nb-${notebook.id}-sf-${subFolder.id}`,
              type: 'hierarchy',
              depth: 2
            });

            // サブフォルダ内のノート（最大3個）
            const folderNotes = notesData[subFolder.id] || [];
            const displayNotes = folderNotes.slice(0, 3);
            const noteSpacing = Math.min(100, folderSpacing / Math.max(1, displayNotes.length));
            const noteStartX = folderX - ((displayNotes.length - 1) * noteSpacing) / 2;

            displayNotes.forEach((note, noteIndex) => {
              console.log('🗺️ Adding note in all-workspaces mode:', note.title);
              const noteX = noteStartX + noteIndex * noteSpacing;
              const noteY = folderY + TREE_CONFIG.levelHeight;

              // ノートノード
              const noteNodeX = noteX;
              const noteNodeY = noteY;
              nodes.push({
                id: note.id.toString(),
                type: 'note',
                x: noteNodeX,
                y: noteNodeY,
                radius: 15,
                color: note.isPinned ? '#F59E0B' : (note.isFavorite ? '#EF4444' : TREE_CONFIG.colors.note),
                clickable: true,
                isPinned: note.isPinned,
                isFavorite: note.isFavorite,
                note: note,
                isActive: previewNote?.id === note.id,
                tooltip: `${note.isPinned ? '📌' : '📄'} ${note.title} (${note.pages?.length || 0}p)`,
                depth: 3
              });

              // サブフォルダ→ノート接続
              connections.push({
                from: { x: sfX, y: sfY, nodeId: subFolder.id },
                to: { x: noteNodeX, y: noteNodeY, nodeId: note.id.toString() },
                key: `all-sf-${subFolder.id}-note-${note.id}`,
                type: 'hierarchy',
                depth: 3
              });
            });

            // 3個以上ノートがある場合は「...」表示
            if (folderNotes.length > 3) {
              const moreX = noteStartX + 3 * noteSpacing;
              const moreY = folderY + TREE_CONFIG.levelHeight;
              
              nodes.push({
                id: `more-${subFolder.id}`,
                type: 'more',
                x: moreX,
                y: moreY,
                radius: 8,
                color: '#9CA3AF',
                clickable: true,
                tooltip: `他 ${folderNotes.length - 3} 個のノート`,
                depth: 3
              });
            }
          });
        });
      });

      return { nodes, connections };
    }

    if (viewMode === 'current-folder' && selectedSubFolder) {
      // 現在のフォルダ内ノート表示モード
      const notes = notesData[selectedSubFolder] || [];
      const rootX = 600;
      const rootY = 150;
      const noteSpacing = 200;
      const startX = rootX - ((notes.length - 1) * noteSpacing) / 2;

      // フォルダノード
      const folderNodeX = rootX;
      const folderNodeY = rootY - TREE_CONFIG.levelHeight;
      const subFolder = subFoldersData[selectedNotebook || '']?.find(sf => sf.id === selectedSubFolder);
      
      if (subFolder) {
        nodes.push({
          id: subFolder.id,
          type: 'subfolder',
          x: folderNodeX,
          y: folderNodeY,
          radius: 30,
          color: TREE_CONFIG.colors.subfolder,
          isActive: true,
          tooltip: `📁 ${subFolder.name} (${notes.length}ノート)`,
          depth: 0
        });
      }

      // ノート群
      notes.forEach((note, index) => {
        const noteX = startX + index * noteSpacing;
        const noteNodeX = noteX;
        const noteNodeY = rootY;

        nodes.push({
          id: note.id.toString(),
          type: 'note',
          x: noteNodeX,
          y: noteNodeY,
          radius: 20,
          color: note.isPinned ? '#F59E0B' : (note.isFavorite ? '#EF4444' : TREE_CONFIG.colors.note),
          clickable: true,
          isPinned: note.isPinned,
          isFavorite: note.isFavorite,
          note: note,
          isActive: previewNote?.id === note.id,
          tooltip: `${note.isPinned ? '📌' : '📄'} ${note.title} (${note.pages.length}p)`,
          depth: 1
        });

        if (subFolder) {
          connections.push({
            from: { x: folderNodeX, y: folderNodeY, nodeId: subFolder.id },
            to: { x: noteNodeX, y: noteNodeY, nodeId: note.id.toString() },
            key: `folder-${note.id}`,
            type: 'hierarchy',
            depth: 1
          });
        }
      });

      return { nodes, connections };
    }

    // 現在のワークスペース表示モード
    const targetWorkspace = selectedWorkspace 
      ? workspaces.find(w => w.id === selectedWorkspace) || workspaces[0]
      : workspaces[0];
    
    if (!targetWorkspace) {
      return { nodes, connections };
    }

    return createWorkspaceView(targetWorkspace);

    function createWorkspaceView(workspace: any) {
      const nodes: MindMapNode[] = [];
      const connections: MindMapConnection[] = [];

      // ルートノード（ワークスペース）- 中央に配置
      const rootX = 600;
      const rootY = TREE_CONFIG.rootY;
      
      const workspaceX = rootX;
      const workspaceY = rootY;
      nodes.push({
        id: workspace.id,
        type: 'workspace',
        x: workspaceX,
        y: workspaceY,
        radius: 30,
        color: TREE_CONFIG.colors.workspace,
        isActive: true,
        tooltip: `${workspace.icon} ${workspace.name}`,
        depth: 0
      });

      // ノートブック（レベル1）
      const currentNotebooks = notebooks[workspace.id] || [];
      if (currentNotebooks.length === 0) {
        return { nodes, connections };
      }

      const notebookStartX = rootX - ((currentNotebooks.length - 1) * TREE_CONFIG.horizontalSpacing) / 2;
      
      currentNotebooks.forEach((notebook, index) => {
      const notebookBaseX = notebookStartX + index * TREE_CONFIG.horizontalSpacing;
      const notebookBaseY = rootY + TREE_CONFIG.levelHeight;
      const notebookX = notebookBaseX;
      const notebookY = notebookBaseY;
      
      nodes.push({
        id: notebook.id,
        type: 'notebook',
        x: notebookX,
        y: notebookY,
        radius: 25,
        color: TREE_CONFIG.colors.notebook,
        clickable: true,
        isActive: selectedNotebook === notebook.id,
        tooltip: `📚 ${notebook.name} (${notebook.count}ノート)`,
        depth: 1
      });

      // 接続線
      connections.push({
        from: { x: workspaceX, y: workspaceY, nodeId: workspace.id },
        to: { x: notebookX, y: notebookY, nodeId: notebook.id },
        key: `ws-workspace-${workspace.id}-${notebook.id}`,
        type: 'hierarchy',
        depth: 1
      });

      // サブフォルダ（レベル2） - 全て表示
      const subFolders = subFoldersData[notebook.id] || [];
      const subFolderStartX = notebookX - ((subFolders.length - 1) * (TREE_CONFIG.horizontalSpacing * 0.7)) / 2;
      
      subFolders.forEach((subFolder, sfIndex) => {
        const subFolderBaseX = subFolderStartX + sfIndex * (TREE_CONFIG.horizontalSpacing * 0.7);
        const subFolderBaseY = notebookY + TREE_CONFIG.levelHeight;
        const subFolderX = subFolderBaseX;
        const subFolderY = subFolderBaseY;
        
        nodes.push({
          id: subFolder.id,
          type: 'subfolder',
          x: subFolderX,
          y: subFolderY,
          radius: 20,
          color: TREE_CONFIG.colors.subfolder,
          clickable: true,
          isActive: selectedSubFolder === subFolder.id,
          tooltip: `📁 ${subFolder.name} (${subFolder.count}ノート)`,
          depth: 2
        });

        connections.push({
          from: { x: notebookX, y: notebookY, nodeId: notebook.id },
          to: { x: subFolderX, y: subFolderY, nodeId: subFolder.id },
          key: `ws-notebook-${notebook.id}-${subFolder.id}`,
          type: 'hierarchy',
          depth: 2
        });

        // ノート（レベル3） - 全て表示（最大3個まで）
        const notes = notesData[subFolder.id] || [];
        const displayNotes = notes.slice(0, 3); // 最大3個表示
        const noteSpacing = 100;
        const noteStartX = subFolderX - ((displayNotes.length - 1) * noteSpacing) / 2;
        
        displayNotes.forEach((note, noteIndex) => {
          const noteBaseX = noteStartX + noteIndex * noteSpacing;
          const noteBaseY = subFolderY + TREE_CONFIG.levelHeight;
          const noteX = noteBaseX;
          const noteY = noteBaseY;
          
          nodes.push({
            id: note.id.toString(),
            type: 'note',
            x: noteX,
            y: noteY,
            radius: 15,
            color: note.isPinned ? '#F59E0B' : (note.isFavorite ? '#EF4444' : TREE_CONFIG.colors.note),
            clickable: true,
            isPinned: note.isPinned,
            isFavorite: note.isFavorite,
            note: note,
            isActive: previewNote?.id === note.id,
            tooltip: `${note.isPinned ? '📌' : '📄'} ${note.title} (${note.pages.length}p)`,
            depth: 3
          });

          connections.push({
            from: { x: subFolderX, y: subFolderY, nodeId: subFolder.id },
            to: { x: noteX, y: noteY, nodeId: note.id.toString() },
            key: `ws-subfolder-${subFolder.id}-${note.id}`,
            type: 'hierarchy',
            depth: 3
          });
        });

        // 3個以上ノートがある場合は「...」表示
        if (notes.length > 3) {
          const moreY = subFolderY + TREE_CONFIG.levelHeight;
          const moreX = noteStartX + 3 * noteSpacing;
          
          nodes.push({
            id: `more-${subFolder.id}`,
            type: 'more',
            x: moreX,
            y: moreY,
            radius: 8,
            color: '#9CA3AF',
            clickable: true,
            tooltip: `他 ${notes.length - 3} 個のノート`,
            depth: 3
          });
        }
      });
    });

      return { nodes, connections };
    }
  }, [selectedWorkspace, selectedNotebook, selectedSubFolder, notebooks, subFoldersData, notesData, workspaces, viewMode, previewNote?.id]);


  // 新規ノート作成
  const handleCreateNote = useCallback(() => {
    if (!selectedSubFolder) {
      alert('ノートを作成するには、まずフォルダを選択してください');
      return;
    }
    
    // addNoteToSubFolderを使用（この関数は自動的に新しいノートを作成する）
    addNoteToSubFolder(selectedSubFolder);
    
    // 作成されたノートは自動的に選択されるため、追加の処理は不要
  }, [selectedSubFolder, addNoteToSubFolder]);

  // シンプルなノート選択（マインドマップは開いたまま）

  // ズーム処理
  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(0.5, Math.min(2, mindMapZoom + delta));
    setMindMapZoom(newZoom);
  }, [mindMapZoom, setMindMapZoom]);

  // ドラッグ機能は一時的に無効化 - デバッグ中
  /*
  const handleDragStart = useCallback((nodeId: string, event: React.MouseEvent) => {
    console.log('🔥 DRAG START CALLED!', nodeId);
    event.preventDefault();
    event.stopPropagation();
    
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) {
      console.log('❌ SVG rect not found');
      return;
    }

    const svgX = (event.clientX - svgRect.left) / mindMapZoom;
    const svgY = (event.clientY - svgRect.top) / mindMapZoom;
    
    setDragState({
      isDragging: true,
      draggedNodeId: nodeId,
      startPosition: { x: svgX, y: svgY },
      currentPosition: { x: svgX, y: svgY }
    });

    console.log('✅ Drag started for node:', nodeId, 'at position:', { x: svgX, y: svgY });
  }, [mindMapZoom]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedNodeId) return;
    
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const svgX = (event.clientX - svgRect.left) / mindMapZoom;
    const svgY = (event.clientY - svgRect.top) / mindMapZoom;
    
    setDragState(prev => ({
      ...prev,
      currentPosition: { x: svgX, y: svgY }
    }));
  }, [dragState.isDragging, dragState.draggedNodeId, mindMapZoom]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedNodeId) return;
    
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const svgX = (event.clientX - svgRect.left) / mindMapZoom;
    const svgY = (event.clientY - svgRect.top) / mindMapZoom;
    
    setMindMapNodePosition(dragState.draggedNodeId, { x: svgX, y: svgY });
    
    console.log('Drag ended for node:', dragState.draggedNodeId, 'at position:', { x: svgX, y: svgY });
    
    setDragState({
      isDragging: false,
      draggedNodeId: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    });
  }, [dragState.isDragging, dragState.draggedNodeId, mindMapZoom, setMindMapNodePosition]);
  */

  // ドラッグ開始処理
  const handleDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    console.log('🚀 Starting drag for node:', nodeId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragState({
      isDragging: true,
      draggedNodeId: nodeId,
      startPosition: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      currentPosition: { x: e.clientX - rect.left, y: e.clientY - rect.top }
    });
  }, []);

  // ノート開く処理
  const handleOpenNote = useCallback((node: MindMapNode) => {
    console.log('📖 Opening note:', node.note?.title);
    if (node.note) {
      // ここでノートを開く処理を実装
      alert(`ノートを開きます: ${node.note.title}`);
      // 実際の実装では以下のようにノートエディタを開く
      // setSelectedNote(node.note);
      // setPreviewNote(node.note);
    }
  }, []);

  if (!showMindMap) {
    console.log('🚫 MindMap not shown - showMindMap:', showMindMap);
    return null;
  }
  
  console.log('✅ MindMap is showing - nodes count:', treeData.nodes.length);

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-[99999] ${className}`}>
      <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex">
        {/* 左側: ノートマップ */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                📊 ノートマップ
              </h2>
              
              {/* 表示モード選択 */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('all-workspaces')}
                  className={`px-3 py-1 text-xs flex items-center space-x-1 transition-colors ${
                    viewMode === 'all-workspaces' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="全ワークスペース表示"
                >
                  <Globe size={12} />
                  <span>全体</span>
                </button>
                <button
                  onClick={() => setViewMode('workspace')}
                  className={`px-3 py-1 text-xs flex items-center space-x-1 transition-colors ${
                    viewMode === 'workspace' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="現在のワークスペース"
                >
                  <Building size={12} />
                  <span>WS内</span>
                </button>
                <button
                  onClick={() => setViewMode('current-folder')}
                  className={`px-3 py-1 text-xs flex items-center space-x-1 transition-colors ${
                    viewMode === 'current-folder' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="現在のフォルダ"
                >
                  <Folder size={12} />
                  <span>フォルダ</span>
                </button>
              </div>
              
              <div className="text-sm text-gray-500">
                {Math.round(mindMapZoom * 100)}%
              </div>
            </div>
            
            {/* コントロールボタン */}
            <div className="flex items-center space-x-1">
              {/* 新規ノート作成ボタン */}
              <button
                onClick={handleCreateNote}
                className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mr-3"
                title="新しいノートを作成"
                disabled={!selectedSubFolder}
              >
                <Plus size={16} />
                <span className="text-sm font-medium">新規ノート</span>
              </button>
              
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
              
              <button
                onClick={() => handleZoom(0.1)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="ズームイン"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => handleZoom(-0.1)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="ズームアウト"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => {
                  setMindMapZoom(0.8);
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="リセット"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setShowMindMap(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-red-500"
                title="閉じる"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ノートマップビュー */}
          <div ref={containerRef} className="flex-1 overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
            {/* 背景パターン */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="1" fill="currentColor" className="text-gray-600"/>
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox="0 0 1200 800"
            preserveAspectRatio="xMidYMid meet"
            style={{ 
              cursor: dragState.isDragging ? 'grabbing' : 'default'
            }}
            // Mouse handlers removed - using HTML overlay buttons instead
            onClick={(e) => {
              console.log('🎯 SVG Root clicked:', e.target);
              // バブリングを停止しない - ボタンのイベントが先に処理される
            }}
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.25)"/>
              </filter>
              <filter id="nodeGlow">
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* 接続線のグラデーション */}
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8"/>
              </linearGradient>
              
              {/* カーブ接続線用 */}
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                      refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#8B5CF6" fillOpacity="0.6" />
              </marker>
              
              {/* ノードグラデーション */}
              <linearGradient id="workspaceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="1"/>
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="1"/>
              </linearGradient>
              <linearGradient id="notebookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" stopOpacity="1"/>
                <stop offset="100%" stopColor="#10B981" stopOpacity="1"/>
              </linearGradient>
              <linearGradient id="subfolderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity="1"/>
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="1"/>
              </linearGradient>
              <linearGradient id="noteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F87171" stopOpacity="1"/>
                <stop offset="100%" stopColor="#EF4444" stopOpacity="1"/>
              </linearGradient>
              
              {/* アニメーション */}
              <animate id="pulse" attributeName="r" 
                      values="15;20;15" dur="2s" repeatCount="indefinite"/>
            </defs>

            {treeData.nodes.length === 0 ? (
              <g transform="translate(600, 400)">
                <text 
                  x="0" 
                  y="0" 
                  textAnchor="middle" 
                  className="fill-gray-400 text-lg font-medium"
                >
                  📝 データがありません
                </text>
                <text 
                  x="0" 
                  y="30" 
                  textAnchor="middle" 
                  className="fill-gray-500 text-sm"
                >
                  ワークスペースとノートブックを作成してください
                </text>
              </g>
            ) : (
              <g 
                transform={`scale(${mindMapZoom})`}
              >
                {/* 接続線 */}
                {treeData.connections.map((connection) => {
                  // カーブのコントロールポイントを計算
                  const midY = (connection.from.y + connection.to.y) / 2;
                  
                  const pathData = `M ${connection.from.x} ${connection.from.y} 
                                   C ${connection.from.x} ${midY - 20}, 
                                     ${connection.to.x} ${midY + 20}, 
                                     ${connection.to.x} ${connection.to.y}`;
                  
                  return (
                    <g key={`${viewMode}-conn-${connection.key}`}>
                      {/* 接続線の影 */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="rgba(0,0,0,0.08)"
                        strokeWidth="4"
                        transform="translate(0, 2)"
                      />
                      {/* 接続線のグロー効果 */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="url(#connectionGradient)"
                        strokeWidth="6"
                        opacity="0.3"
                        filter="url(#glow)"
                      />
                      {/* メイン接続線 */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="url(#connectionGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                      {/* アニメーションドット */}
                      <circle r="3" fill="#8B5CF6" opacity="0.8">
                        <animateMotion dur="3s" repeatCount="indefinite">
                          <mpath href={`#path-${connection.key}`} />
                        </animateMotion>
                      </circle>
                      <path
                        id={`path-${connection.key}`}
                        d={pathData}
                        fill="none"
                        style={{ display: 'none' }}
                      />
                    </g>
                  );
                })}

              {/* ノード */}
              {treeData.nodes.map((node) => {
                // ノードサイズを動的に決定
                const nodeWidth = node.type === 'more' ? 40 : 
                                  node.type === 'note' ? 140 : TREE_CONFIG.nodeWidth;
                const nodeHeight = node.type === 'more' ? 25 : 
                                   node.type === 'note' ? 45 : TREE_CONFIG.nodeHeight;
                
                // ドラッグ中の場合、カスタム位置を使用
                const isBeingDragged = dragState.draggedNodeId === node.id;
                const customPosition = mindMapNodePositions[node.id];
                const displayX = isBeingDragged ? dragState.currentPosition.x : 
                               customPosition ? customPosition.x : node.x;
                const displayY = isBeingDragged ? dragState.currentPosition.y : 
                               customPosition ? customPosition.y : node.y;
                
                // ノードの色とグラデーションを取得
                const getNodeFill = (nodeType: string) => {
                  switch(nodeType) {
                    case 'workspace': return 'url(#workspaceGradient)';
                    case 'notebook': return 'url(#notebookGradient)';
                    case 'subfolder': return 'url(#subfolderGradient)';
                    case 'note': return 'url(#noteGradient)';
                    default: return node.color;
                  }
                };

                return (
                  <g key={`${viewMode}-${node.type}-${node.id}`}>
                    {node.type === 'more' ? (
                      // 「もっと見る」ノードの場合は円形で表示
                      <>
                        <circle
                          cx={displayX + 1}
                          cy={displayY + 1}
                          r={node.radius}
                          fill="rgba(0,0,0,0.1)"
                        />
                        <circle
                          cx={displayX}
                          cy={displayY}
                          r={node.radius}
                          fill={node.color}
                          fillOpacity="0.9"
                          stroke="#ffffff"
                          strokeWidth="2"
                          filter="url(#shadow)"
                          className="transition-all duration-300"
                        />
                      </>
                    ) : (
                      // 通常のノードは矩形で表示
                      <>
                        {/* ノードの影 */}
                        <rect
                          x={displayX - nodeWidth / 2 + 2}
                          y={displayY - nodeHeight / 2 + 2}
                          width={nodeWidth}
                          height={nodeHeight}
                          rx={node.type === 'note' ? '10' : '12'}
                          fill="rgba(0,0,0,0.15)"
                          style={{ pointerEvents: 'none' }}
                        />
                        {/* メインノード */}
                        <rect
                          x={displayX - nodeWidth / 2}
                          y={displayY - nodeHeight / 2}
                          width={nodeWidth}
                          height={nodeHeight}
                          rx={node.type === 'note' ? '10' : '12'}
                          fill={getNodeFill(node.type)}
                          stroke={node.isActive ? "#FFD700" : "rgba(255,255,255,0.3)"}
                          strokeWidth={node.isActive ? "3" : "1.5"}
                          filter={hoveredNode === node.id ? "url(#nodeGlow)" : "url(#shadow)"}
                          className={`transition-all duration-300 ${isBeingDragged ? 'opacity-80' : ''}`}
                          style={{
                            opacity: hoveredNode === node.id ? 0.8 : (isBeingDragged ? 0.8 : 1)
                          }}
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                        />

                      </>
                    )}
                    
                    {node.type !== 'more' && (
                      <>
                        {/* アイコン背景 */}
                        <circle
                          cx={displayX - nodeWidth / 2 + (node.type === 'note' ? 22 : 28)}
                          cy={displayY - (node.type === 'note' ? 5 : 8)}
                          r={node.type === 'note' ? 12 : 15}
                          fill="rgba(255,255,255,0.9)"
                          stroke="rgba(255,255,255,0.5)"
                          strokeWidth="1"
                          style={{ pointerEvents: 'none' }}
                        />
                        
                        {/* タイプアイコン */}
                        <text
                          x={displayX - nodeWidth / 2 + (node.type === 'note' ? 22 : 28)}
                          y={displayY - (node.type === 'note' ? 1 : -3)}
                          fill={node.type === 'workspace' ? TREE_CONFIG.gradients.workspace.bg : 
                               node.type === 'notebook' ? TREE_CONFIG.gradients.notebook.bg :
                               node.type === 'subfolder' ? TREE_CONFIG.gradients.subfolder.bg : TREE_CONFIG.gradients.note.bg}
                          fontSize={node.type === 'note' ? '10' : '12'}
                          textAnchor="middle"
                          fontWeight="600"
                          style={{ pointerEvents: 'none' }}
                          className="select-none"
                        >
                          {node.type === 'workspace' ? '🏢' :
                           node.type === 'notebook' ? '📚' :
                           node.type === 'subfolder' ? '📁' : '📄'}
                        </text>
                        
                        {/* ピン留め・お気に入りアイコン */}
                        {(node.isPinned || node.isFavorite) && (
                          <circle
                            cx={displayX + nodeWidth / 2 - 15}
                            cy={displayY - nodeHeight / 2 + 15}
                            r="8"
                            fill="rgba(255,255,255,0.9)"
                            style={{ pointerEvents: 'none' }}
                          />
                        )}
                        {node.isPinned && (
                          <text
                            x={displayX + nodeWidth / 2 - 15}
                            y={displayY - nodeHeight / 2 + 19}
                            fill="#F59E0B"
                            fontSize="10"
                            textAnchor="middle"
                            style={{ pointerEvents: 'none' }}
                            className="select-none"
                          >
                            📌
                          </text>
                        )}
                        {node.isFavorite && !node.isPinned && (
                          <text
                            x={displayX + nodeWidth / 2 - 15}
                            y={displayY - nodeHeight / 2 + 19}
                            fill="#EF4444"
                            fontSize="10"
                            textAnchor="middle"
                            style={{ pointerEvents: 'none' }}
                            className="select-none"
                          >
                            ⭐
                          </text>
                        )}
                        
                        {/* メインタイトル */}
                        <text
                          x={displayX - nodeWidth / 2 + (node.type === 'note' ? 44 : 52)}
                          y={displayY - (node.type === 'note' ? 8 : -2)}
                          fill="white"
                          fontSize={node.type === 'note' ? '12' : '14'}
                          fontWeight="700"
                          style={{ pointerEvents: 'none' }}
                          className="select-none"
                        >
                          {node.type === 'note' ? 
                            (node.note?.title && node.note.title.length > 14 ? 
                              node.note.title.substring(0, 14) + '...' : 
                              (node.note?.title || 'Untitled')
                            ) :
                            (node.tooltip.includes(' ') ? node.tooltip.split(' ')[1] : node.tooltip)
                          }
                        </text>
                        
                        {/* サブテキスト */}
                        <text
                          x={displayX - nodeWidth / 2 + (node.type === 'note' ? 44 : 52)}
                          y={displayY + (node.type === 'note' ? 8 : 14)}
                          fill="rgba(255,255,255,0.85)"
                          fontSize={node.type === 'note' ? '10' : '11'}
                          style={{ pointerEvents: 'none' }}
                          className="select-none"
                        >
                          {node.type === 'workspace' ? 'Workspace' :
                           node.type === 'notebook' ? 'Notebook' :
                           node.type === 'subfolder' ? 'Folder' : 
                           `${node.note?.pages?.length || 0} pages`}
                        </text>
                      </>
                    )}

                    {node.type === 'more' && (
                      <text
                        x={displayX}
                        y={displayY + 4}
                        fill="white"
                        fontSize="12"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                        fontWeight="bold"
                      >
                        ···
                      </text>
                    )}

                    {/* ツールチップ用のタイトル（フルタイトルを表示） */}
                    <title>
                      {node.type === 'note' ? 
                        node.note?.title || node.tooltip : 
                        node.tooltip
                      }
                    </title>
                  </g>
                );
              })}

              {/* SVGボタンを削除 - HTMLオーバーレイに置き換え */}
              </g>
            )}
          </svg>

          {/* HTMLボタンオーバーレイ */}
          <MindMapButtons
            nodes={treeData.nodes}
            mindMapZoom={mindMapZoom}
            mindMapNodePositions={mindMapNodePositions}
            dragState={dragState}
            onDragStart={handleDragStart}
            onOpenNote={handleOpenNote}
            containerRef={containerRef}
          />
        </div>

          {/* コンパクト情報パネル */}
          <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg backdrop-blur-sm bg-opacity-90 max-w-xs">
            <div className="text-xs space-y-1">
              {/* 統計情報を1行にまとめ */}
              <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>WS:{treeData.nodes.filter(n => n.type === 'workspace').length}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>NB:{treeData.nodes.filter(n => n.type === 'notebook').length}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span>FL:{treeData.nodes.filter(n => n.type === 'subfolder').length}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>NT:{treeData.nodes.filter(n => n.type === 'note').length}</span>
                </span>
              </div>
              
            </div>
          </div>
        </div>

        {/* 右側: ノートエディタ */}
        <div className="w-1/2 flex flex-col bg-gray-50 dark:bg-gray-800">
          <div className="flex-1">
            <RichNoteEditor className="h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreeMindMap;