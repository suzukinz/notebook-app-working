import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, AlignLeft, AlignCenter, AlignRight, X, Check, Edit3 } from 'lucide-react';
import { MarkdownTable, MarkdownTableEditor } from '../../utils/tableEditor';
import { useHaptics } from '../../hooks/useHaptics';

interface MarkdownTableEditorProps {
  table: MarkdownTable;
  onSave: (table: MarkdownTable) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const MarkdownTableEditorComponent: React.FC<MarkdownTableEditorProps> = ({
  table,
  onSave,
  onCancel,
  isOpen
}) => {
  const [editingTable, setEditingTable] = useState<MarkdownTable>(table);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState('');
  const { tapFeedback, successFeedback } = useHaptics();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditingTable(table);
  }, [table]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    tapFeedback();
    const content = rowIndex === -1 
      ? editingTable.headers[colIndex]?.content || ''
      : editingTable.rows[rowIndex]?.cells[colIndex]?.content || '';
    
    setEditingCell({ row: rowIndex, col: colIndex });
    setCellValue(content);
  };

  const handleCellSave = () => {
    if (editingCell) {
      const updatedTable = MarkdownTableEditor.updateCell(
        editingTable,
        editingCell.row,
        editingCell.col,
        cellValue
      );
      setEditingTable(updatedTable);
      setEditingCell(null);
      setCellValue('');
      successFeedback();
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setCellValue('');
    tapFeedback();
  };

  const handleAddColumn = (index?: number) => {
    tapFeedback();
    const updatedTable = MarkdownTableEditor.addColumn(editingTable, index);
    setEditingTable(updatedTable);
  };

  const handleRemoveColumn = (index: number) => {
    tapFeedback();
    const updatedTable = MarkdownTableEditor.removeColumn(editingTable, index);
    setEditingTable(updatedTable);
  };

  const handleAddRow = (index?: number) => {
    tapFeedback();
    const updatedTable = MarkdownTableEditor.addRow(editingTable, index);
    setEditingTable(updatedTable);
  };

  const handleRemoveRow = (index: number) => {
    tapFeedback();
    const updatedTable = MarkdownTableEditor.removeRow(editingTable, index);
    setEditingTable(updatedTable);
  };

  const handleAlignmentChange = (colIndex: number, alignment: 'left' | 'center' | 'right') => {
    tapFeedback();
    const updatedTable = MarkdownTableEditor.updateColumnAlignment(editingTable, colIndex, alignment);
    setEditingTable(updatedTable);
  };

  const handleSave = () => {
    successFeedback();
    onSave(editingTable);
  };

  const handleCancel = () => {
    tapFeedback();
    onCancel();
  };

  const getAlignmentIcon = (alignment: 'left' | 'center' | 'right') => {
    switch (alignment) {
      case 'left': return <AlignLeft size={16} />;
      case 'center': return <AlignCenter size={16} />;
      case 'right': return <AlignRight size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Edit3 size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              テーブル編集
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
            >
              <Check size={16} className="mr-1" />
              保存
            </button>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* テーブル編集エリア */}
        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              {/* ヘッダー */}
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  {editingTable.headers.map((header, colIndex) => (
                    <th key={colIndex} className="relative border border-gray-300 dark:border-gray-600 p-2 min-w-[120px]">
                      {/* 列操作ボタン */}
                      <div className="absolute -top-8 left-0 right-0 flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleAddColumn(colIndex)}
                          className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                          title="列を挿入"
                        >
                          <Plus size={12} />
                        </button>
                        {editingTable.headers.length > 1 && (
                          <button
                            onClick={() => handleRemoveColumn(colIndex)}
                            className="p-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                            title="列を削除"
                          >
                            <Minus size={12} />
                          </button>
                        )}
                      </div>

                      {/* セル内容 */}
                      {editingCell?.row === -1 && editingCell?.col === colIndex ? (
                        <div className="flex items-center space-x-1">
                          <input
                            ref={inputRef}
                            type="text"
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') handleCellCancel();
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={handleCellSave}
                            className="p-1 bg-green-600 hover:bg-green-700 text-white rounded"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={handleCellCancel}
                            className="p-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleCellClick(-1, colIndex)}
                          className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 p-1 rounded min-h-[24px] flex items-center font-semibold text-gray-900 dark:text-white"
                        >
                          {header.content || '(空)'}
                        </div>
                      )}

                      {/* アライメントボタン */}
                      <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center space-x-1">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => handleAlignmentChange(colIndex, align)}
                            className={`p-1 rounded text-xs ${
                              header.alignment === align
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                            }`}
                            title={`${align === 'left' ? '左' : align === 'center' ? '中央' : '右'}寄せ`}
                          >
                            {getAlignmentIcon(align)}
                          </button>
                        ))}
                      </div>
                    </th>
                  ))}
                  <th className="border border-gray-300 dark:border-gray-600 p-2 w-12">
                    <button
                      onClick={() => handleAddColumn()}
                      className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded w-full"
                      title="列を追加"
                    >
                      <Plus size={16} />
                    </button>
                  </th>
                </tr>
              </thead>

              {/* データ行 */}
              <tbody>
                {editingTable.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {row.cells.map((cell, colIndex) => (
                      <td key={colIndex} className="border border-gray-300 dark:border-gray-600 p-2 relative">
                        {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                          <div className="flex items-center space-x-1">
                            <input
                              ref={inputRef}
                              type="text"
                              value={cellValue}
                              onChange={(e) => setCellValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave();
                                if (e.key === 'Escape') handleCellCancel();
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                            <button
                              onClick={handleCellSave}
                              className="p-1 bg-green-600 hover:bg-green-700 text-white rounded"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={handleCellCancel}
                              className="p-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded min-h-[24px] flex items-center text-gray-900 dark:text-white"
                            style={{ textAlign: cell.alignment }}
                          >
                            {cell.content || '(空)'}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="border border-gray-300 dark:border-gray-600 p-2 w-12">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleAddRow(rowIndex + 1)}
                          className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                          title="行を挿入"
                        >
                          <Plus size={12} />
                        </button>
                        {editingTable.rows.length > 1 && (
                          <button
                            onClick={() => handleRemoveRow(rowIndex)}
                            className="p-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                            title="行を削除"
                          >
                            <Minus size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={editingTable.headers.length} className="border border-gray-300 dark:border-gray-600 p-2 text-center">
                    <button
                      onClick={() => handleAddRow()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center mx-auto"
                    >
                      <Plus size={16} className="mr-1" />
                      行を追加
                    </button>
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 w-12"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* プレビュー */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Markdownプレビュー:</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono text-gray-900 dark:text-white overflow-x-auto">
              {MarkdownTableEditor.tableToMarkdown(editingTable)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownTableEditorComponent;