import React from 'react';
import { Database } from 'lucide-react';

interface DataManagerButtonProps {
  onClick: () => void;
  className?: string;
}

const DataManagerButton: React.FC<DataManagerButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${className}`}
      title="データエクスポート・インポート (Ctrl+Shift+E)"
      aria-label="データエクスポート・インポートを開く"
    >
      <Database size={20} className="text-gray-600 dark:text-gray-300" />
    </button>
  );
};

export default DataManagerButton;