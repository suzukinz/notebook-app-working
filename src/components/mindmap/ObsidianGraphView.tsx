import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { MindMapNode } from '../../types';
import { GraphConnection } from '../../types/mindmap';
import RichNoteEditor from '../notes/RichNoteEditor';
import { useMindMapLayout } from '../../hooks/useMindMapLayout';
import MindMapLayoutToggle from '../ui/MindMapLayoutToggle';
import MindMapResizeHandle from '../ui/MindMapResizeHandle';

interface ObsidianGraphViewProps {
  className?: string;
}

interface GraphNode extends MindMapNode {
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

// Obsidianスタイルの設定
const GRAPH_CONFIG = {
  simulation: {
    chargeStrength: -2000,  // より強い反発力
    linkDistance: 120,      // より長いリンク距離
    linkStrength: 0.2,      // リンクの強さ
    velocityDecay: 0.6,     // より高い減衰
    alphaDecay: 0.02,       // より速い収束
    centerForce: 0.05,      // 中心への引力を弱める
  },
  node: {
    workspace: { radius: 25, color: '#7c3aed', glow: '#a78bfa' },
    notebook: { radius: 20, color: '#2563eb', glow: '#60a5fa' },
    subfolder: { radius: 15, color: '#0891b2', glow: '#67e8f9' },
    note: { radius: 12, color: '#10b981', glow: '#86efac' },
    more: { radius: 8, color: '#6b7280', glow: '#9ca3af' },
  },
  edge: {
    color: '#4b5563',
    highlightColor: '#9ca3af',
    width: 1.5,
  },
  animation: {
    duration: 300,
  }
};

const ObsidianGraphView: React.FC<ObsidianGraphViewProps> = ({ className = '' }) => {
  const {
    settings: layoutSettings,
    updatePosition,
    updateSize,
    toggleResizeHandle,
    resetToDefault: resetLayout,
    getContainerStyles,
    getResizeHandlePosition
  } = useMindMapLayout();

  const [isMobile, setIsMobile] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'map' | 'note'>('map');

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
    setShowMindMap,
    setMindMapZoom,
    setSelectedWorkspace,
    setSelectedNotebook,
    setSelectedSubFolder,
    setSelectedNote,
    setPreviewNote
  } = useNotebookStore();

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [nodeStartPos, setNodeStartPos] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [svgDimensions, setSvgDimensions] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'full' | 'workspace' | 'grid'>('full');
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(0);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<Record<string, Record<string, {x: number, y: number}>>>({});
  const [currentLayoutName, setCurrentLayoutName] = useState('');
  const [showLayoutManager, setShowLayoutManager] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [userMovedNodes, setUserMovedNodes] = useState<Record<string, {x: number, y: number}>>({});
  const [dragDistance, setDragDistance] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const saveLayoutRef = useRef<((name: string) => void) | null>(null);
  // const animationFrameRef = useRef<number>(); // 削除
  const simulationRef = useRef<GraphNode[]>([]);

  // フォーカス表示のための中心位置計算
  const focusCenter = useMemo(() => {
    if (viewMode === 'full') {
      return { x: 0, y: 0 }; // 全体表示では中心は0,0
    }
    
    // simulationRef.currentが初期化されていない場合は0,0を返す
    if (!simulationRef.current || simulationRef.current.length === 0) {
      return { x: 0, y: 0 };
    }
    
    // フォーカス表示では選択中のノードを中心に
    if (selectedWorkspace) {
      const wsNode = simulationRef.current.find(n => n.id.endsWith(`-${selectedWorkspace}`) && n.type === 'workspace');
      if (wsNode) {
        return { x: -wsNode.x, y: -wsNode.y };
      }
    }
    
    if (selectedNotebook) {
      const nbNode = simulationRef.current.find(n => n.id.endsWith(`-${selectedNotebook}`) && n.type === 'notebook');
      if (nbNode) {
        return { x: -nbNode.x, y: -nbNode.y };
      }
    }
    
    if (selectedSubFolder) {
      const sfNode = simulationRef.current.find(n => n.id.endsWith(`-${selectedSubFolder}`) && n.type === 'subfolder');
      if (sfNode) {
        return { x: -sfNode.x, y: -sfNode.y };
      }
    }
    
    return { x: 0, y: 0 };
  }, [viewMode, selectedWorkspace, selectedNotebook, selectedSubFolder]);

  // ユーザーが移動したノードの位置を適用するヘルパー関数
  const applyUserPosition = useCallback((node: GraphNode): GraphNode => {
    const userPos = userMovedNodes[node.id];
    if (userPos) {
      return { 
        ...node, 
        x: userPos.x, 
        y: userPos.y,
        fx: userPos.x, // 固定位置を設定
        fy: userPos.y  // 固定位置を設定
      };
    }
    return node;
  }, [userMovedNodes]);

  // グラフデータの構築（高速化のため依存関係を最小化）
  // 常に全体マップを生成し、表示時にフィルタリング/フォーカス
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const connections: GraphConnection[] = [];

    if (!workspaces || workspaces.length === 0) {
      return { nodes: [], connections: [] };
    }

    // 常に全体ビューを生成 - すべてのワークスペースを表示
      const wsSpacing = 400; // ワークスペース間の間隔
      const wsStartX = -(workspaces.length - 1) * wsSpacing / 2;
      
      workspaces.forEach((workspace, wsIndex) => {
        const wsNode: GraphNode = applyUserPosition({
          id: `${viewMode}-${workspace.id}`,
          type: 'workspace',
          x: wsStartX + wsIndex * wsSpacing,
          y: 0,
          vx: 0,
          vy: 0,
          radius: GRAPH_CONFIG.node.workspace.radius,
          color: GRAPH_CONFIG.node.workspace.color,
          clickable: true,
          isActive: selectedWorkspace === workspace.id,
          tooltip: `${workspace.icon} ${workspace.name}`,
          depth: 0
        });
        nodes.push(wsNode);

        const workspaceNotebooks = notebooks[workspace.id] || [];
        
        workspaceNotebooks.forEach((notebook, nbIndex) => {
          const nbNode: GraphNode = applyUserPosition({
            id: `${viewMode}-${notebook.id}`,
            type: 'notebook',
            x: wsNode.x + (nbIndex - (workspaceNotebooks.length - 1) / 2) * 300, // 横に並べる
            y: wsNode.y + 150, // ワークスペースから下に150px
            vx: 0,
            vy: 0,
            radius: GRAPH_CONFIG.node.notebook.radius,
            color: GRAPH_CONFIG.node.notebook.color,
            clickable: true,
            isActive: selectedNotebook === notebook.id,
            tooltip: notebook.name,
            depth: 1
          });
          nodes.push(nbNode);

          connections.push({
            source: `${viewMode}-${workspace.id}`,
            target: `${viewMode}-${notebook.id}`,
            type: 'hierarchy'
          });

          // サブフォルダとノートの追加
          const notebookSubFolders = subFoldersData[notebook.id] || [];
          
          notebookSubFolders.forEach((subFolder, sfIndex) => {
            const sfNode: GraphNode = applyUserPosition({
              id: `${viewMode}-${subFolder.id}`,
              type: 'subfolder',
              x: nbNode.x + (sfIndex - (notebookSubFolders.length - 1) / 2) * 250, // 横に並べる
              y: nbNode.y + 120, // ノートブックから下に120px
              vx: 0,
              vy: 0,
              radius: GRAPH_CONFIG.node.subfolder.radius,
              color: GRAPH_CONFIG.node.subfolder.color,
              clickable: true,
              isActive: selectedSubFolder === subFolder.id,
              tooltip: subFolder.name,
              depth: 2
            });
            nodes.push(sfNode);

            connections.push({
              source: `${viewMode}-${notebook.id}`,
              target: `${viewMode}-${subFolder.id}`,
              type: 'hierarchy'
            });

            // ノートの追加
            const folderNotes = notesData[subFolder.id] || [];
            
            folderNotes.forEach((note, noteIndex) => {
              const noteNode: GraphNode = applyUserPosition({
                id: `${viewMode}-note-${note.id}`,
                type: 'note',
                x: sfNode.x + (noteIndex - (folderNotes.length - 1) / 2) * 180, // 横に並べる
                y: sfNode.y + 100, // サブフォルダーから下に100px
                vx: 0,
                vy: 0,
                radius: GRAPH_CONFIG.node.note.radius,
                color: GRAPH_CONFIG.node.note.color,
                clickable: true,
                isActive: false,
                tooltip: note.title,
                depth: 3,
                note: note
              });
              nodes.push(noteNode);

              connections.push({
                source: `${viewMode}-${subFolder.id}`,
                target: `${viewMode}-note-${note.id}`,
                type: 'hierarchy'
              });
            });
          });
        });
      });

    return { nodes, connections };
  }, [workspaces, notebooks, subFoldersData, notesData, applyUserPosition, selectedWorkspace, selectedNotebook, selectedSubFolder, viewMode]);

  // 初期配置の設定（アニメーションなし）
  useEffect(() => {
    if (graphData.nodes.length === 0) return;
    
    // 既存のノードがない場合のみ初期配置を行う
    if (simulationRef.current.length === 0) {
      simulationRef.current = [...graphData.nodes];
    }
  }, [graphData.nodes]); // graphData.nodes が変更されたときに実行

  // レイアウトをローカルストレージから読み込み
  useEffect(() => {
    const loadSavedLayouts = () => {
      try {
        const saved = localStorage.getItem('obsidian-graph-layouts');
        if (saved) {
          setSavedLayouts(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load saved layouts:', error);
      }
    };
    loadSavedLayouts();
  }, []);

  // SVGサイズを監視してdimensionsを更新
  useEffect(() => {
    const updateSvgDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setSvgDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateSvgDimensions();
    window.addEventListener('resize', updateSvgDimensions);
    return () => window.removeEventListener('resize', updateSvgDimensions);
  }, []);

  // graphDataの更新を監視し、simulationRefを更新（直接更新版）
  useEffect(() => {
    if (graphData.nodes.length === 0) {
      simulationRef.current = [];
      return;
    }
    
    // 重複を除去したノードリストを作成
    const uniqueNodes = graphData.nodes.filter((node, index, self) => 
      self.findIndex(n => n.id === node.id) === index
    );
    
    // 既存のノードマップを作成
    const existingNodesMap = new Map(simulationRef.current.map(n => [n.id, n]));
    
    // 新しいノードリストを作成（位置を保持、重複なし）
    simulationRef.current = uniqueNodes.map(node => {
      const existing = existingNodesMap.get(node.id);
      if (existing) {
        // 既存ノードの位置と速度を保持
        return { 
          ...node, 
          x: existing.x, 
          y: existing.y, 
          vx: existing.vx || 0, 
          vy: existing.vy || 0,
          fx: existing.fx || null,
          fy: existing.fy || null
        };
      }
      // 新規ノードはランダム位置から開始
      return {
        ...node,
        x: node.x + (Math.random() - 0.5) * 10,
        y: node.y + (Math.random() - 0.5) * 10,
        vx: 0,
        vy: 0
      };
    });
  }, [graphData.nodes, viewMode]);

  // ノードクリックハンドラー
  const handleNodeClick = useCallback((node: GraphNode) => {
    // ドラッグ距離が5px以上の場合はクリック処理をスキップ
    if (dragDistance > 5) {
      return;
    }
    
    setSelectedNode(node.id);
    
    if (node.type === 'workspace') {
      const workspaceId = node.id.replace(`${viewMode}-`, '');
      setSelectedWorkspace(workspaceId);
      // ワークスペース選択時はワークスペースビューに切り替え
      setViewMode('workspace');
      // フォーカス表示時にズームレベルを調整
      setMindMapZoom(1.5);
    } else if (node.type === 'notebook') {
      const notebookId = node.id.replace(`${viewMode}-`, '');
      const notebook = Object.values(notebooks).flat().find(nb => nb.id === notebookId);
      if (notebook) {
        setSelectedWorkspace(notebook.workspaceId);
        setSelectedNotebook(notebookId);
        // ノートブック選択時はワークスペースビューに切り替え
        setViewMode('workspace');
        // フォーカス表示時にズームレベルを調整
        setMindMapZoom(2.0);
      }
    } else if (node.type === 'subfolder') {
      const subFolderId = node.id.replace(`${viewMode}-`, '');
      // ノートブックを探して選択
      const notebookId = Object.entries(subFoldersData).find(([, folders]) => 
        folders.some(f => f.id === subFolderId)
      )?.[0];
      if (notebookId) {
        const notebook = Object.values(notebooks).flat().find(nb => nb.id === notebookId);
        if (notebook) {
          setSelectedWorkspace(notebook.workspaceId);
          setSelectedNotebook(notebookId);
        }
      }
      setSelectedSubFolder(subFolderId);
      // サブフォルダー選択時はワークスペースビューに切り替え
      setViewMode('workspace');
      // フォーカス表示時にズームレベルを調整
      setMindMapZoom(2.5);
    } else if (node.type === 'note' && node.note) {
      // フォルダを探して選択
      const folderId = Object.entries(notesData).find(([, notes]) => 
        notes.some(n => n.id === node.note?.id)
      )?.[0];
      if (folderId) {
        const notebookId = Object.entries(subFoldersData).find(([, folders]) => 
          folders.some(f => f.id === folderId)
        )?.[0];
        if (notebookId) {
          const notebook = Object.values(notebooks).flat().find(nb => nb.id === notebookId);
          if (notebook) {
            setSelectedWorkspace(notebook.workspaceId);
            setSelectedNotebook(notebookId);
            setSelectedSubFolder(folderId);
          }
        }
      }
      setSelectedNote(node.note);
      setPreviewNote(node.note);
      // モバイルの場合、ノートモードに切り替え
      if (isMobile) {
        setMobileViewMode('note');
      } else {
        // デスクトップの場合、ワークスペースビューに切り替え
        setViewMode('workspace');
        // フォーカス表示時にズームレベルを調整
        setMindMapZoom(3.0);
      }
    }
  }, [viewMode, setSelectedWorkspace, setSelectedNotebook, setSelectedSubFolder, setSelectedNote, setPreviewNote, notebooks, subFoldersData, notesData, dragDistance, isMobile, setMobileViewMode, setViewMode, setMindMapZoom]);

  // ドラッグハンドラー
  const handleMouseDown = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDraggedNode(node.id);
    setDragDistance(0); // ドラッグ距離をリセット
    
    // マウスとノードの開始位置を記録
    setDragStartPos({ x: e.clientX, y: e.clientY });
    
    const nodeInSim = simulationRef.current.find(n => n.id === node.id);
    if (nodeInSim) {
      setNodeStartPos({ x: nodeInSim.x, y: nodeInSim.y });
      // ノードを固定位置に設定
      nodeInSim.fx = nodeInSim.x;
      nodeInSim.fy = nodeInSim.y;
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && draggedNode) {
      const nodeInSim = simulationRef.current.find(n => n.id === draggedNode);
      if (nodeInSim) {
        // マウスの移動量を計算（スクリーン座標）
        const deltaX = e.clientX - dragStartPos.x;
        const deltaY = e.clientY - dragStartPos.y;
        
        // ドラッグ距離を更新
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        setDragDistance(distance);
        
        // ズームレベルを考慮してグラフ座標系での移動量に変換
        const graphDeltaX = deltaX / mindMapZoom;
        const graphDeltaY = deltaY / mindMapZoom;
        
        // ノードの新しい位置 = 開始位置 + 移動量
        nodeInSim.fx = nodeStartPos.x + graphDeltaX;
        nodeInSim.fy = nodeStartPos.y + graphDeltaY;
        nodeInSim.x = nodeInSim.fx;
        nodeInSim.y = nodeInSim.fy;
      }
    } else if (isPanning) {
      const dx = e.clientX - lastPanPosition.x;
      const dy = e.clientY - lastPanPosition.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, draggedNode, dragStartPos, nodeStartPos, mindMapZoom, isPanning, lastPanPosition]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && draggedNode) {
      const nodeInSim = simulationRef.current.find(n => n.id === draggedNode);
      if (nodeInSim) {
        // ノードの位置を固定（fx, fyを設定して自動移動を防ぐ）
        nodeInSim.fx = nodeInSim.x;
        nodeInSim.fy = nodeInSim.y;
        
        // ユーザーが移動したノードの位置を保存
        setUserMovedNodes(prev => ({
          ...prev,
          [draggedNode]: { x: nodeInSim.x, y: nodeInSim.y }
        }));
        
        // 自動保存が有効な場合は現在のレイアウトを保存
        if (autoSaveEnabled && saveLayoutRef.current) {
          saveLayoutRef.current('__autosave__');
        }
      }
    }
    setIsDragging(false);
    setDraggedNode(null);
    setIsPanning(false);
  }, [isDragging, draggedNode, autoSaveEnabled]);

  // パンハンドラー
  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect') {
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    }
  }, []);

  // ズームハンドラー
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setMindMapZoom(Math.max(0.1, Math.min(5, mindMapZoom * delta)));
  }, [mindMapZoom, setMindMapZoom]);

  const handleZoomIn = () => setMindMapZoom(Math.min(5, mindMapZoom + 0.1));
  const handleZoomOut = () => setMindMapZoom(Math.max(0.1, mindMapZoom - 0.1));
  const handleZoomReset = () => {
    setMindMapZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleResetPositions = () => {
    // 全てのノードの固定位置をクリア
    simulationRef.current.forEach(node => {
      node.fx = null;
      node.fy = null;
    });
    // ユーザーが移動したノードの記録をクリア
    setUserMovedNodes({});
    // 初期配置にリセット
    simulationRef.current = [];
  };


  // 検索機能
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = simulationRef.current
      .filter(node => 
        node.tooltip.toLowerCase().includes(query.toLowerCase()) ||
        (node.note && node.note.title.toLowerCase().includes(query.toLowerCase()))
      )
      .map(node => node.id);
    
    setSearchResults(results);
  }, []);

  // キーボード操作にCtrl+Fの検索を追加
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+F または Cmd+F で検索を開く
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowSearch(true);
      return;
    }

    // 検索中のキーボード操作
    if (showSearch) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }
      return; // 検索中は他のキーボード操作を無効化
    }

    if (!simulationRef.current.length) return;

    const visibleNodes = simulationRef.current;
    const maxIndex = visibleNodes.length - 1;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setIsKeyboardMode(true);
        setKeyboardSelectedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setIsKeyboardMode(true);
        setKeyboardSelectedIndex(prev => Math.min(maxIndex, prev + 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isKeyboardMode && visibleNodes[keyboardSelectedIndex]) {
          const selectedNode = visibleNodes[keyboardSelectedIndex];
          if (selectedNode) {
            handleNodeClick(selectedNode);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsKeyboardMode(false);
        setSelectedNode(null);
        break;
      case 'Tab':
        e.preventDefault();
        setIsKeyboardMode(true);
        if (e.shiftKey) {
          setKeyboardSelectedIndex(prev => Math.max(0, prev - 1));
        } else {
          setKeyboardSelectedIndex(prev => Math.min(maxIndex, prev + 1));
        }
        break;
    }
  }, [isKeyboardMode, keyboardSelectedIndex, handleNodeClick, showSearch]);

  // レイアウト管理機能
  const saveCurrentLayout = useCallback((name: string) => {
    const currentPositions: Record<string, {x: number, y: number}> = {};
    simulationRef.current.forEach(node => {
      if (node.fx !== null && node.fy !== null && node.fx !== undefined && node.fy !== undefined) {
        currentPositions[node.id] = { x: node.fx, y: node.fy };
      } else {
        currentPositions[node.id] = { x: node.x, y: node.y };
      }
    });

    const newLayouts = { ...savedLayouts, [name]: currentPositions };
    setSavedLayouts(newLayouts);
    
    try {
      localStorage.setItem('obsidian-graph-layouts', JSON.stringify(newLayouts));
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }, [savedLayouts]);

  // refを更新
  useEffect(() => {
    saveLayoutRef.current = saveCurrentLayout;
  }, [saveCurrentLayout]);

  const loadLayout = useCallback((name: string) => {
    const layout = savedLayouts[name];
    if (!layout) return;

    simulationRef.current.forEach(node => {
      const savedPos = layout[node.id];
      if (savedPos) {
        node.x = savedPos.x;
        node.y = savedPos.y;
        node.fx = savedPos.x;
        node.fy = savedPos.y;
      }
    });
  }, [savedLayouts]);

  const deleteLayout = useCallback((name: string) => {
    const newLayouts = { ...savedLayouts };
    delete newLayouts[name];
    setSavedLayouts(newLayouts);
    
    try {
      localStorage.setItem('obsidian-graph-layouts', JSON.stringify(newLayouts));
    } catch (error) {
      console.error('Failed to delete layout:', error);
    }
  }, [savedLayouts]);

  // モバイル検出
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // キーボードイベントリスナーを設定
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // エッジのレンダリングをメモ化
  const renderedEdges = useMemo(() => {
    if (simulationRef.current.length === 0) return null;
    
    return graphData.connections.map((connection, index) => {
      const source = simulationRef.current.find(n => n.id === connection.source);
      const target = simulationRef.current.find(n => n.id === connection.target);
      
      if (!source || !target) return null;
      
      const isHighlighted = hoveredNode === source.id || hoveredNode === target.id ||
                           selectedNode === source.id || selectedNode === target.id;
      
      return (
        <line
          key={`edge-${viewMode}-${connection.source}-${connection.target}-${index}`}
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
          stroke={isHighlighted ? GRAPH_CONFIG.edge.highlightColor : GRAPH_CONFIG.edge.color}
          strokeWidth={isHighlighted ? 2 : GRAPH_CONFIG.edge.width}
          opacity={isHighlighted ? 0.8 : 0.3}
          className="transition-all duration-300"
        />
      );
    });
  }, [graphData.connections, hoveredNode, selectedNode, viewMode]);

  if (!showMindMap) return null;

  const containerStyles = getContainerStyles();
  const resizeHandlePosition = getResizeHandlePosition();

  // モバイル版の場合は切り替え表示
  if (isMobile) {
    return (
      <div className={`fixed inset-0 bg-gray-900 z-40 ${className}`} style={{ left: '48px' }}>
        <div className="h-full flex flex-col">
          {/* モバイル用ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMindMap(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold text-gray-100">
                {mobileViewMode === 'map' ? '🌌 マインドマップ' : '📝 ノート編集'}
              </h2>
            </div>
            
            {/* モバイル切り替えボタン */}
            <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setMobileViewMode('map')}
                className={`px-3 py-1 text-sm transition-colors ${
                  mobileViewMode === 'map' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                マップ
              </button>
              <button
                onClick={() => setMobileViewMode('note')}
                className={`px-3 py-1 text-sm transition-colors ${
                  mobileViewMode === 'note' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                ノート
              </button>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="flex-1 overflow-hidden">
            {mobileViewMode === 'map' ? (
              <div className="h-full flex flex-col bg-gray-950">
                {/* マインドマップのツールバー */}
                <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900">
                  <div className="flex items-center space-x-2">
                    {/* ビューモード切り替え */}
                    <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setViewMode('full')}
                        className={`px-2 py-1 text-xs transition-colors ${
                          viewMode === 'full' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        全体
                      </button>
                      <button
                        onClick={() => setViewMode('workspace')}
                        className={`px-2 py-1 text-xs transition-colors ${
                          viewMode === 'workspace' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        WS
                      </button>
                    </div>

                    {/* ズーム表示 */}
                    <span className="text-xs text-gray-400">
                      {Math.round(mindMapZoom * 100)}%
                    </span>
                  </div>

                  {/* ズームボタン */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setMindMapZoom(Math.max(0.1, mindMapZoom - 0.1))}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      onClick={() => setMindMapZoom(Math.min(3, mindMapZoom + 0.1))}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      onClick={() => setMindMapZoom(1)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>

                {/* SVGマップ */}
                <div className="flex-1 relative overflow-hidden" onWheel={handleWheel}>
                  <svg
                    ref={svgRef}
                    className="w-full h-full cursor-move"
                    onMouseDown={handleSvgMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ touchAction: 'none' }}
                  >
                    {/* 背景 */}
                    <rect width="100%" height="100%" fill="#030712" />
                    
                    {/* グリッドパターン */}
                    <defs>
                      <pattern id="grid-mobile" width="50" height="50" patternUnits="userSpaceOnUse">
                        <circle cx="25" cy="25" r="0.5" fill="#1f2937" />
                      </pattern>
                      {Object.entries(GRAPH_CONFIG.node).map(([type]) => (
                        <filter key={`mobile-${type}`} id={`glow-mobile-${type}`}>
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      ))}
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-mobile)" opacity="0.5" />

                    <g transform={`translate(${svgDimensions.width/2 + panOffset.x + focusCenter.x}, ${svgDimensions.height/2 + panOffset.y + focusCenter.y}) scale(${mindMapZoom})`}>
                      {/* エッジ（接続線） */}
                      {renderedEdges}

                      {/* ノード */}
                      {simulationRef.current.length > 0 && simulationRef.current.map((node, index) => {
                        const config = GRAPH_CONFIG.node[node.type];
                        const isHovered = hoveredNode === node.id;
                        const isSelected = selectedNode === node.id;
                        const isKeyboardSelected = isKeyboardMode && keyboardSelectedIndex === index;
                        
                        // 現在選択されている要素とマッチするかチェック
                        let isCurrentlyActive = false;
                        const originalId = node.id.replace(`${viewMode}-`, '');
                        if (node.type === 'workspace' && originalId === selectedWorkspace) {
                          isCurrentlyActive = true;
                        } else if (node.type === 'notebook' && originalId === selectedNotebook) {
                          isCurrentlyActive = true;
                        } else if (node.type === 'subfolder' && originalId === selectedSubFolder) {
                          isCurrentlyActive = true;
                        } else if (node.type === 'note' && node.note && previewNote && node.note.id === previewNote.id) {
                          isCurrentlyActive = true;
                        }
                        
                        const isActive = isCurrentlyActive || isSelected || isKeyboardSelected;
                        
                        return (
                          <g key={`mobile-node-${viewMode}-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
                            {/* ノード本体 */}
                            <circle
                              r={config.radius}
                              fill={config.color}
                              stroke={isActive ? '#ffffff' : 'transparent'}
                              strokeWidth={2}
                              className="cursor-pointer transition-all duration-300"
                              opacity={isHovered || isActive ? 1 : 0.8}
                              onMouseEnter={(e) => {
                                e.stopPropagation();
                                setHoveredNode(node.id);
                              }}
                              onMouseLeave={(e) => {
                                e.stopPropagation();
                                setHoveredNode(null);
                              }}
                              onClick={() => handleNodeClick(node)}
                            />
                            
                            {/* アイコン */}
                            <text
                              textAnchor="middle"
                              y={4}
                              fontSize={node.type === 'note' ? '10' : '12'}
                              fill="white"
                              className="pointer-events-none select-none"
                              opacity={0.9}
                            >
                              {node.type === 'workspace' ? '💼' :
                               node.type === 'notebook' ? '📚' :
                               node.type === 'subfolder' ? '📁' : '📄'}
                            </text>
                            
                            {/* ラベル（簡潔版） */}
                            <text
                              y={config.radius + 15}
                              textAnchor="middle"
                              fontSize="10"
                              fill={isActive ? '#93c5fd' : '#e5e7eb'}
                              className="pointer-events-none select-none"
                              fontWeight={isActive ? 'bold' : 'normal'}
                            >
                              {node.tooltip && node.tooltip.length > 6 ? node.tooltip.substring(0, 6) + '...' : node.tooltip || ''}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="h-full bg-gray-900">
                <RichNoteEditor className="h-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // デスクトップ版は従来通り
  return (
    <div className={`fixed inset-0 bg-gray-900 z-40 ${className}`} style={{ left: '48px' }}>
      <div 
        className="absolute inset-0 flex"
        style={{ flexDirection: containerStyles.flexDirection }}
      >
        {/* マインドマップセクション */}
        <div 
          className="flex flex-col bg-gray-950 border-gray-800"
          style={{
            ...containerStyles.mindMapStyle,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgb(31 41 55)',
            ...(layoutSettings.orientation === 'horizontal' 
              ? (layoutSettings.position === 'left' 
                  ? { borderRightWidth: '1px', borderLeftWidth: '0px' }
                  : { borderLeftWidth: '1px', borderRightWidth: '0px' })
              : (layoutSettings.position === 'top'
                  ? { borderBottomWidth: '1px', borderTopWidth: '0px' }
                  : { borderTopWidth: '1px', borderBottomWidth: '0px' }))
          }}
          data-mindmap-container
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-2 sm:p-4 border-b border-gray-800 bg-gray-900">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-gray-100 truncate">
                🌌 <span className="hidden sm:inline">グラフビュー</span>
              </h2>
              
              {/* ビューモード切り替え */}
              <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    setViewMode('full');
                    setMindMapZoom(1.0); // 全体表示時はズームリセット
                  }}
                  className={`px-2 sm:px-3 py-1 text-xs transition-colors ${
                    viewMode === 'full' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  title="すべてのワークスペースを表示"
                >
                  <span className="hidden sm:inline">全体</span>
                  <span className="sm:hidden">全</span>
                </button>
                <button
                  onClick={() => setViewMode('workspace')}
                  className={`px-2 sm:px-3 py-1 text-xs transition-colors ${
                    viewMode === 'workspace' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  title="選択中のワークスペースを中心に表示"
                >
                  <span className="hidden sm:inline">フォーカス</span>
                  <span className="sm:hidden">FC</span>
                </button>
              </div>

              {/* ズーム表示 */}
              <div className="text-xs text-gray-500 hidden sm:block">
                {Math.round(mindMapZoom * 100)}%
              </div>

              {/* レイアウト切り替え */}
              <div className="ml-auto">
                <MindMapLayoutToggle
                  currentPosition={layoutSettings.position}
                  onPositionChange={updatePosition}
                  onReset={resetLayout}
                  showResizeHandle={layoutSettings.showResizeHandle}
                  onToggleResizeHandle={toggleResizeHandle}
                />
              </div>
            </div>
            
            {/* コントロールボタン */}
            <div className="flex items-center space-x-1 ml-2">
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-200"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-200"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={handleZoomReset}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-200"
                title="ズームリセット"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={handleResetPositions}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors text-yellow-400 hover:text-yellow-300"
                title="ノード位置をリセット"
              >
                🔄
              </button>
              <button
                onClick={() => setShowLayoutManager(true)}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors text-blue-400 hover:text-blue-300"
                title="レイアウト管理"
              >
                💾
              </button>
              <button
                onClick={() => setShowMindMap(false)}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors text-red-400 hover:text-red-300 ml-3"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* グラフビューキャンバス */}
          <div 
            className="flex-1 overflow-hidden relative"
            onWheel={handleWheel}
          >
            <svg
              ref={svgRef}
              className="w-full h-full cursor-move"
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ touchAction: 'none' }}
            >
              {/* 背景 */}
              <rect width="100%" height="100%" fill="#030712" />
              
              {/* グリッドパターン */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <circle cx="25" cy="25" r="0.5" fill="#1f2937" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5" />

              <g transform={`translate(${svgDimensions.width/2 + panOffset.x + focusCenter.x}, ${svgDimensions.height/2 + panOffset.y + focusCenter.y}) scale(${mindMapZoom})`}>
                {/* エッジ（接続線） */}
                {renderedEdges}

                {/* ノード */}
                {simulationRef.current.length > 0 && simulationRef.current.map((node, index) => {
                  const config = GRAPH_CONFIG.node[node.type];
                  const isHovered = hoveredNode === node.id;
                  const isSelected = selectedNode === node.id;
                  const isBeingDragged = isDragging && draggedNode === node.id;
                  const isKeyboardSelected = isKeyboardMode && keyboardSelectedIndex === index;
                  const isSearchResult = searchResults.includes(node.id);
                  
                  // 現在選択されている要素とマッチするかチェック
                  let isCurrentlyActive = false;
                  const originalId = node.id.replace(`${viewMode}-`, '');
                  if (node.type === 'workspace' && originalId === selectedWorkspace) {
                    isCurrentlyActive = true;
                  } else if (node.type === 'notebook' && originalId === selectedNotebook) {
                    isCurrentlyActive = true;
                  } else if (node.type === 'subfolder' && originalId === selectedSubFolder) {
                    isCurrentlyActive = true;
                  } else if (node.type === 'note' && node.note && previewNote && node.note.id === previewNote.id) {
                    isCurrentlyActive = true;
                  }
                  
                  const isActive = isCurrentlyActive || isSelected || isKeyboardSelected;
                  
                  return (
                    <g key={`node-${viewMode}-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
                      {/* グロー効果 */}
                      {(isHovered || isActive || isBeingDragged || isKeyboardSelected || isSearchResult) && (
                        <circle
                          r={node.radius + (isBeingDragged ? 12 : isKeyboardSelected ? 10 : isSearchResult ? 9 : 8)}
                          fill={isBeingDragged ? '#ff6b6b' : isKeyboardSelected ? '#fbbf24' : isSearchResult ? '#10b981' : config.glow}
                          opacity={isBeingDragged ? 0.5 : isKeyboardSelected ? 0.6 : isSearchResult ? 0.7 : 0.3}
                          className="transition-all duration-300"
                        />
                      )}
                      
                      {/* キーボード選択の追加効果 */}
                      {isKeyboardSelected && (
                        <circle
                          r={node.radius + 15}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity={0.8}
                          className="animate-pulse"
                        />
                      )}

                      {/* 検索結果の追加効果 */}
                      {isSearchResult && (
                        <circle
                          r={node.radius + 12}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          opacity={0.9}
                          className="animate-pulse"
                        />
                      )}
                      
                      {/* ノード本体 */}
                      <circle
                        r={node.radius}
                        fill={config.color}
                        stroke={isActive ? '#ffffff' : 'transparent'}
                        strokeWidth={2}
                        className={`${isBeingDragged ? 'cursor-grabbing' : 'cursor-grab'} transition-all duration-300`}
                        opacity={isHovered || isActive ? 1 : 0.8}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          if (hoveredNodeRef.current !== node.id) {
                            hoveredNodeRef.current = node.id;
                            setHoveredNode(node.id);
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          hoveredNodeRef.current = null;
                          setHoveredNode(null);
                        }}
                        onMouseDown={(e) => handleMouseDown(e, node)}
                        onClick={() => handleNodeClick(node)}
                      />
                      
                      {/* アイコン */}
                      <text
                        textAnchor="middle"
                        y={4}
                        fontSize={node.type === 'note' ? '10' : '12'}
                        fill="white"
                        className="pointer-events-none select-none"
                        opacity={0.9}
                      >
                        {node.type === 'workspace' ? '💼' :
                         node.type === 'notebook' ? '📚' :
                         node.type === 'subfolder' ? '📁' : '📄'}
                      </text>
                      
                      {/* ラベル（ホバー時または選択時） */}
                      {(isHovered || isActive) && (
                        <g>
                          <rect
                            x={-60}
                            y={node.radius + 5}
                            width={120}
                            height={24}
                            rx={3}
                            fill="#1f2937"
                            opacity={0.95}
                            stroke={isActive ? '#60a5fa' : 'transparent'}
                            strokeWidth={1}
                          />
                          <text
                            y={node.radius + 20}
                            textAnchor="middle"
                            fontSize="12"
                            fill={isActive ? '#93c5fd' : '#e5e7eb'}
                            className="pointer-events-none select-none"
                            fontWeight={isActive ? 'bold' : 'normal'}
                          >
                            {node.tooltip.length > 20 ? node.tooltip.substring(0, 20) + '...' : node.tooltip}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* 統計情報パネル */}
            <div className="absolute top-4 left-4 bg-gray-900 rounded-lg p-3 shadow-xl backdrop-blur-sm bg-opacity-90">
              <div className="text-xs space-y-1 text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                  <span>ワークスペース: {graphData.nodes.filter(n => n.type === 'workspace').length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span>ノートブック: {graphData.nodes.filter(n => n.type === 'notebook').length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-600"></div>
                  <span>フォルダ: {graphData.nodes.filter(n => n.type === 'subfolder').length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span>ノート: {graphData.nodes.filter(n => n.type === 'note').length}</span>
                </div>
              </div>
            </div>

            {/* 検索UI */}
            {showSearch && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-lg p-4 shadow-xl backdrop-blur-sm bg-opacity-95 z-10">
                <div className="flex items-center space-x-3">
                  <div className="text-white font-semibold">🔍 ノード検索</div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="ノード名で検索..."
                    className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-3 text-sm text-green-400">
                    {searchResults.length}件見つかりました
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div className="mt-3 text-sm text-gray-500">
                    見つかりませんでした
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  Escキーで閉じる
                </div>
              </div>
            )}

            {/* レイアウト管理UI */}
            {showLayoutManager && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-lg p-4 shadow-xl backdrop-blur-sm bg-opacity-95 z-10 min-w-96">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white font-semibold">💾 レイアウト管理</div>
                  <button
                    onClick={() => setShowLayoutManager(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* レイアウト保存 */}
                <div className="mb-4">
                  <div className="text-sm text-gray-300 mb-2">新しいレイアウトを保存</div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={currentLayoutName}
                      onChange={(e) => setCurrentLayoutName(e.target.value)}
                      placeholder="レイアウト名を入力..."
                      className="flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (currentLayoutName.trim() && saveLayoutRef.current) {
                          saveLayoutRef.current(currentLayoutName.trim());
                          setCurrentLayoutName('');
                        }
                      }}
                      disabled={!currentLayoutName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      保存
                    </button>
                  </div>
                </div>

                {/* 自動保存設定 */}
                <div className="mb-4">
                  <label className="flex items-center space-x-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span>ドラッグ後に自動保存</span>
                  </label>
                </div>

                {/* 保存済みレイアウト一覧 */}
                <div>
                  <div className="text-sm text-gray-300 mb-2">保存済みレイアウト</div>
                  {Object.keys(savedLayouts).length === 0 ? (
                    <div className="text-gray-500 text-sm py-4 text-center">
                      保存されたレイアウトはありません
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {Object.keys(savedLayouts).map(layoutName => {
                        const isAutoSave = layoutName === '__autosave__';
                        const displayName = isAutoSave ? '🤖 自動保存' : layoutName;
                        
                        return (
                          <div key={layoutName} className="flex items-center justify-between bg-gray-800 rounded p-2">
                            <span className={`text-sm ${isAutoSave ? 'text-yellow-300' : 'text-gray-200'}`}>
                              {displayName}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  loadLayout(layoutName);
                                  setShowLayoutManager(false);
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                読み込み
                              </button>
                              {!isAutoSave && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`「${layoutName}」を削除しますか？`)) {
                                      deleteLayout(layoutName);
                                    }
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  削除
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  現在のノード配置を保存して、いつでも復元できます
                </div>
              </div>
            )}

            {/* キーボードショートカットヘルプ */}
            <div className="absolute bottom-4 left-4 bg-gray-900 rounded-lg p-3 shadow-xl backdrop-blur-sm bg-opacity-90">
              <div className="text-xs space-y-1 text-gray-400">
                <div className="text-white font-semibold mb-2">⌨️ キーボード操作</div>
                <div>↑↓ / Tab: ノード選択</div>
                <div>Enter / Space: ノード開く</div>
                <div>Ctrl+F: 検索</div>
                <div>💾: レイアウト管理</div>
                <div>Esc: 選択解除</div>
                {isKeyboardMode && (
                  <div className="text-yellow-400 mt-2">
                    選択中: {keyboardSelectedIndex + 1}/{simulationRef.current.length}
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="text-green-400 mt-2">
                    🔍 {searchResults.length}件ヒット
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* リサイズハンドル */}
        {layoutSettings.showResizeHandle && (
          <MindMapResizeHandle
            position={resizeHandlePosition}
            onResize={updateSize}
            minSize={20}
            maxSize={80}
          />
        )}

        {/* エディタセクション */}
        <div 
          className="flex flex-col bg-gray-900"
          style={containerStyles.editorStyle}
        >
          <div className="flex-1">
            <RichNoteEditor className="h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObsidianGraphView;