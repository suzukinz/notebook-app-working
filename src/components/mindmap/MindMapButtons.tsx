import React from 'react';
import { MindMapNode } from '../../types';

interface MindMapButtonsProps {
  nodes: MindMapNode[];
  mindMapZoom: number;
  mindMapNodePositions: Record<string, { x: number; y: number }>;
  dragState: {
    isDragging: boolean;
    draggedNodeId: string | null;
    currentPosition: { x: number; y: number };
  };
  onDragStart: (nodeId: string, e: React.MouseEvent) => void;
  onOpenNote: (node: MindMapNode) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const MindMapButtons: React.FC<MindMapButtonsProps> = ({
  nodes,
  mindMapZoom,
  mindMapNodePositions,
  dragState,
  onDragStart,
  onOpenNote,
  containerRef
}) => {
  const getButtonPosition = (node: MindMapNode) => {
    // ドラッグ中の場合、カスタム位置を使用
    const isBeingDragged = dragState.draggedNodeId === node.id;
    const customPosition = mindMapNodePositions[node.id];
    const baseX = isBeingDragged ? dragState.currentPosition.x : 
                  customPosition ? customPosition.x : node.x;
    const baseY = isBeingDragged ? dragState.currentPosition.y : 
                  customPosition ? customPosition.y : node.y;

    // SVG座標をHTML座標に変換（ズーム考慮）
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: 0, y: 0 };

    // SVGのviewBox座標をスクリーン座標に変換
    const svgCenterX = containerRect.width / 2;
    const svgCenterY = containerRect.height / 2;
    
    const screenX = svgCenterX + (baseX - 600) * mindMapZoom; // 600はSVGの中心X座標
    const screenY = svgCenterY + (baseY - 300) * mindMapZoom; // 300はSVGの中心Y座標

    return { x: screenX, y: screenY };
  };

  const getNodeWidth = (node: MindMapNode) => {
    if (node.type === 'more') return 40;
    if (node.type === 'note') return 140;
    return 180; // TREE_CONFIG.nodeWidth
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {nodes.map((node) => {
        // moreノードにはボタンを表示しない
        if (node.type === 'more') return null;

        const position = getButtonPosition(node);
        const nodeWidth = getNodeWidth(node);

        return (
          <div key={`button-overlay-${node.id}`} className="absolute">
            {/* ドラッグボタン */}
            <button
              className="absolute bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all duration-200 pointer-events-auto cursor-move border-2 border-red-300 flex items-center justify-center font-bold"
              style={{
                left: position.x - nodeWidth / 2 - 35,
                top: position.y - 25,
                width: 40,
                height: 40,
                zIndex: 1000
              }}
              onMouseDown={(e) => {
                console.log('🔴 HTML DRAG BUTTON CLICKED:', node.id);
                onDragStart(node.id, e);
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                console.log('🔴🔴🔴 HTML DRAG BUTTON ONCLICK:', node.id);
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              ⋮⋮
            </button>

            {/* ノートの場合：開くボタン */}
            {node.type === 'note' && (
              <button
                className="absolute bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-all duration-200 pointer-events-auto cursor-pointer border-2 border-green-300 flex items-center justify-center"
                style={{
                  left: position.x + nodeWidth / 2 + 15,
                  top: position.y - 25,
                  width: 40,
                  height: 40,
                  zIndex: 1000
                }}
                onClick={(e) => {
                  console.log('🟢🟢🟢 HTML OPEN BUTTON CLICKED:', node.note?.title);
                  onOpenNote(node);
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                📖
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MindMapButtons;