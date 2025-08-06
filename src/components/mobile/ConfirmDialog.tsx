import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  type = 'warning'
}) => {
  const { tapFeedback, successFeedback, errorFeedback } = useHaptics();

  const handleConfirm = () => {
    if (type === 'danger') {
      errorFeedback();
    } else {
      successFeedback();
    }
    onConfirm();
  };

  const handleCancel = () => {
    tapFeedback();
    onClose();
  };

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-red-500',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          iconBg: 'bg-red-100 dark:bg-red-900/20'
        };
      case 'info':
        return {
          iconColor: 'text-blue-500',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20'
        };
      default:
        return {
          iconColor: 'text-yellow-500',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm transform transition-transform scale-100">
        {/* アイコン */}
        <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center mx-auto mb-4`}>
          <AlertTriangle size={32} className={styles.iconColor} />
        </div>

        {/* タイトル */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
          {title}
        </h2>

        {/* メッセージ */}
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6 leading-relaxed">
          {message}
        </p>

        {/* ボタン */}
        <div className="flex space-x-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 px-4 font-medium rounded-xl transition-colors ${styles.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;