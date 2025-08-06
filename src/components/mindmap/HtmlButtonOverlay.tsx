import React from 'react';
import { MindMapNode } from '../../types';

interface HtmlButtonOverlayProps {
  nodes: MindMapNode[];
  zoom: number;
  svgViewBox: { width: number; height: number };
  containerSize: { width: number; height: number };
  onDragStart: (nodeId: string, event: React.MouseEvent) => void;
  onOpenNote: (noteId: string) => void;
}

const HtmlButtonOverlay: React.FC<HtmlButtonOverlayProps> = ({
  nodes,
  zoom,
  svgViewBox,
  containerSize,
  onDragStart,
  onOpenNote
}) => {
  // SVG座標をHTML座標に変換
  const svgToHtml = (x: number, y: number) => {
    const scaleX = containerSize.width / svgViewBox.width;
    const scaleY = containerSize.height / svgViewBox.height;
    const scale = Math.min(scaleX, scaleY);
    
    return {
      x: (x * scale * zoom) + (containerSize.width - svgViewBox.width * scale) / 2,
      y: (y * scale * zoom) + (containerSize.height - svgViewBox.height * scale) / 2
    };
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {nodes.map((node) => {
        if (node.type === 'more') return null;

        const nodeWidth = node.type === 'note' ? 140 : 180;
        const position = svgToHtml(node.x, node.y);

        return (
          <div key={`html-buttons-${node.id}`} className="absolute">
            {/* ドラッグボタン */}
            <button
              className="absolute bg-red-500 hover:bg-red-600 text-white p-2 rounded cursor-move shadow-lg pointer-events-auto transition-all"
              style={{
                left: position.x - nodeWidth / 2 - 50,
                top: position.y - 20,
                width: '40px',
                height: '40px',
                zIndex: 1000
              }}
              onClick={(e) => {
                console.log('🔴 HTML RED BUTTON CLICKED!', node.id);
                alert('HTML赤ボタンがクリックされました: ' + node.id);
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                onDragStart(node.id, e);
              }}
              title={`ドラッグ: ${node.tooltip}`}
            >
              ⋮⋮
            </button>

            {/* ノート開くボタン */}
            {node.type === 'note' && (
              <button
                className="absolute bg-green-500 hover:bg-green-600 text-white p-2 rounded cursor-pointer shadow-lg pointer-events-auto transition-all"
                style={{
                  left: position.x + nodeWidth / 2 + 10,
                  top: position.y - 20,
                  width: '40px',
                  height: '40px',
                  zIndex: 1000
                }}
                onClick={(e) => {
                  console.log('🟢 HTML GREEN BUTTON CLICKED!', node.note?.title);
                  alert('HTML緑ボタンがクリックされました: ' + node.note?.title);
                  if (node.note?.id) {
                    onOpenNote(node.note.id.toString());
                  }
                  e.preventDefault();
                  e.stopPropagation();
                }}
                title={`開く: ${node.note?.title || 'Untitled'}`}
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

export default HtmlButtonOverlay;