import { useMemo } from 'react';
import { searchIndex } from '../utils/searchIndex';
import { useNotebookStore } from '../store/useNotebookStore';

export const useSearchIndex = () => {
  const { notesData } = useNotebookStore();
  
  // 検索統計情報
  const stats = useMemo(() => {
    return searchIndex.getStats();
  }, [notesData]);
  
  // 手動でインデックスをリビルド
  const rebuildIndex = () => {
    searchIndex.rebuild(notesData);
  };
  
  // 検索実行
  const search = (query: string, options?: { 
    limit?: number; 
    subFolderId?: string;
    tags?: string[];
  }) => {
    return searchIndex.search(query, options);
  };
  
  return {
    stats,
    rebuildIndex,
    search
  };
};