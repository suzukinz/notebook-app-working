import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { COLORS } from '../../types';

interface EditWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (workspace: { id: string; name: string; icon: string; color: string }) => void;
  workspace: { id: string; name: string; icon: string; color: string } | null;
}

const EditWorkspaceDialog: React.FC<EditWorkspaceDialogProps> = ({
  isOpen,
  onClose,
  onEdit,
  workspace
}) => {
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceIcon, setWorkspaceIcon] = useState('💼');
  const [workspaceColor, setWorkspaceColor] = useState('blue');

  const commonIcons = ['💼', '🏠', '📚', '🎨', '🔬', '🏥', '🏪', '🎯', '🚀', '⚡', '🌟', '💡'];

  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
      setWorkspaceIcon(workspace.icon);
      setWorkspaceColor(workspace.color);
    }
  }, [workspace]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceName.trim() && workspace) {
      onEdit({
        id: workspace.id,
        name: workspaceName.trim(),
        icon: workspaceIcon,
        color: workspaceColor
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setWorkspaceName('');
    setWorkspaceIcon('💼');
    setWorkspaceColor('blue');
    onClose();
  };

  const getColorClasses = (color: string) => {
    const colorClasses = {
      red: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500' },
      green: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600', dot: 'bg-pink-500' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', dot: 'bg-indigo-500' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-500' }
    };
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ワークスペースを編集"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 mb-1">
            ワークスペース名
          </label>
          <input
            type="text"
            id="workspaceName"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e);
              } else if (e.key === 'Escape') {
                handleClose();
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例: マイプロジェクト"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            アイコン
          </label>
          <div className="grid grid-cols-6 gap-2">
            {commonIcons.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setWorkspaceIcon(icon)}
                className={`p-3 rounded-lg border-2 transition-all text-lg ${
                  workspaceIcon === icon
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カラー
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setWorkspaceColor(color)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  workspaceColor === color
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                title={color}
              >
                <div className={`w-6 h-6 rounded ${getColorClasses(color).dot}`}></div>
              </button>
            ))}
          </div>
        </div>

        {/* プレビュー */}
        {workspaceName && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">プレビュー:</p>
            <div className="flex items-center">
              <div className={`p-2 rounded-lg mr-3 ${getColorClasses(workspaceColor).bg}`}>
                <span className="text-xl">{workspaceIcon}</span>
              </div>
              <span className="font-medium text-gray-900">{workspaceName}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!workspaceName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            変更を保存
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditWorkspaceDialog;