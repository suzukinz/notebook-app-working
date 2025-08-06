import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { ChevronLeft, ChevronRight, FileText, Edit3, Plus, Check } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import LoadingSpinner from '../ui/LoadingSpinner';
import { logger } from '../../utils/logger';
import { validateNoteTitle } from '../../utils/validation';
import { debounce } from '../../utils/debounce';

// Lazy load heavy components
const RichTextEditor = lazy(() => import('./RichTextEditor'));
const MarkdownEditor = lazy(() => import('./MarkdownEditor'));
const NoteMetadata = lazy(() => import('./NoteMetadata'));

interface RichNoteEditorProps {
  className?: string;
}

const RichNoteEditor: React.FC<RichNoteEditorProps> = React.memo(({ className = '' }) => {
  const {
    selectedNote,
    currentPage,
    setSelectedNote,
    updateNote,
    deleteNote,
    setShowMindMap,
    setCurrentPage
  } = useNotebookStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isEditing] = useState(true); // 常に編集モード
  const [editorType, setEditorType] = useState<'rich' | 'markdown'>('rich');
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // ノートが選択されたときの初期化
  useEffect(() => {
    console.log(`🔄 ノート選択状態変更: selectedNote=${selectedNote?.id || 'null'}`);
    
    if (selectedNote) {
      console.log(`🎯 新しいノートを選択: ID=${selectedNote.id}, title="${selectedNote.title}"`);
      
      // 即座に状態を更新（非同期処理なし）
      setTitle(selectedNote.title);
      setTags(selectedNote.tags || []);
      setEditorType(selectedNote.editorType || 'rich');
      
      // 常に1ページ目から開始
      const firstPageData = selectedNote.pages[0];
      if (firstPageData) {
        console.log(`📄 ノート選択時: ページ 1 のコンテンツを設定: "${firstPageData.content?.substring(0, 50)}..."`);
        setContent(firstPageData.content || '');
      } else {
        console.log(`❌ ページデータが見つかりません: pages.length=${selectedNote.pages.length}`);
        setContent('');
      }
    } else {
      console.log(`🗑️ ノートが選択解除されました`);
      setTitle('');
      setTags([]);
      setContent('');
      setEditorType('rich');
    }
  }, [selectedNote]);

  // ページが変更されたときのコンテンツ更新
  useEffect(() => {
    if (selectedNote && selectedNote.pages[currentPage]) {
      const currentPageData = selectedNote.pages[currentPage];
      console.log(`🔄 ページ切り替え: ${currentPage + 1}/${selectedNote.pages.length}`);
      console.log(`📄 ページ ${currentPage + 1} の内容:`, currentPageData.content?.substring(0, 100) + '...');
      console.log(`🎯 現在のcontent state:`, content.substring(0, 50) + '...');
      setContent(currentPageData.content || '');
      console.log(`✅ content更新完了: ${(currentPageData.content || '').substring(0, 50)}...`);
    } else {
      console.log(`❌ ページデータが見つかりません: currentPage=${currentPage}, selectedNote=${!!selectedNote}, pages=${selectedNote?.pages?.length}`);
    }
  }, [currentPage, selectedNote?.pages]); // selectedNote.pagesを依存配列に追加

  // リアルタイム自動保存（デバウンス）- 1.5秒で素早く保存
  const debouncedSave = useMemo(() => {
    return debounce(() => {
      if (selectedNote && selectedNote.pages[currentPage]) {
        try {
          setSaveStatus('saving');
          console.log(`💾 自動保存開始: ページ ${currentPage + 1}/${selectedNote.pages.length}`);
          updateNote(selectedNote.id, {
            title,
            tags,
            editorType,
            pages: selectedNote.pages.map((page, index) =>
              index === currentPage ? { ...page, content } : page
            )
          });
          setSaveStatus('saved');
          setShowSaveNotification(true);
          setTimeout(() => setShowSaveNotification(false), 1000);
          logger.info('Note auto-saved');
        } catch (error) {
          setSaveStatus('unsaved');
          logger.error('Auto-save failed:', error);
        }
      }
    }, 1500); // 1.5秒のデバウンス - リアルタイムに近い自動保存
  }, [selectedNote, title, content, tags, currentPage, updateNote, editorType]);

  // タイトル変更ハンドラー（デバウンス保存）
  const handleTitleChange = useCallback((newTitle: string) => {
    const validation = validateNoteTitle(newTitle);
    if (validation.isValid) {
      setTitle(newTitle);
      // タイトルもデバウンス保存に変更
      debouncedSave();
      logger.info('タイトルを自動保存キューに追加しました');
    }
  }, [debouncedSave]);

  // コンテンツ変更ハンドラー（リアルタイム自動保存有効）
  const handleContentChange = useCallback((newContent: string) => {
    const startTime = performance.now();
    console.log(`🔄 RichNoteEditor: コンテンツ変更開始`);
    setContent(newContent);
    setSaveStatus('unsaved'); // 変更があったことを示す
    console.log(`🔄 setContent完了: ${(performance.now() - startTime).toFixed(2)}ms`);
    
    // リアルタイム自動保存を有効化（デバウンス1.5秒）
    debouncedSave();
    console.log(`🔄 ハンドラー完了: ${(performance.now() - startTime).toFixed(2)}ms`);
  }, [debouncedSave]);

  // タグ変更ハンドラー
  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
    debouncedSave();
  }, [debouncedSave]);

  // メタデータハンドラー
  const handleToggleFavorite = useCallback(() => {
    if (selectedNote) {
      updateNote(selectedNote.id, {
        isFavorite: !selectedNote.isFavorite
      });
    }
  }, [selectedNote, updateNote]);

  const handleTogglePin = useCallback(() => {
    if (selectedNote) {
      updateNote(selectedNote.id, {
        isPinned: !selectedNote.isPinned
      });
    }
  }, [selectedNote, updateNote]);

  const handleDelete = useCallback(() => {
    if (selectedNote) {
      deleteNote(selectedNote.id);
      setSelectedNote(null);
    }
  }, [selectedNote, deleteNote, setSelectedNote]);

  const handleShowMindMap = useCallback(() => {
    setShowMindMap(true);
  }, [setShowMindMap]);

  // 手動保存関数
  const saveCurrentPage = useCallback(() => {
    if (selectedNote) {
      updateNote(selectedNote.id, {
        title,
        tags,
        editorType,
        pages: selectedNote.pages.map((page, index) =>
          index === currentPage ? { ...page, content } : page
        )
      });
      logger.info('Page manually saved');
      
      // 保存通知を表示
      setShowSaveNotification(true);
      setTimeout(() => {
        setShowSaveNotification(false);
      }, 2000);
    }
  }, [selectedNote, title, tags, editorType, content, currentPage, updateNote]);

  // Ctrl+Sのキーボードショートカット（即座に保存）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Ctrl+S押下時は即座に保存（デバウンスなし）
        if (selectedNote && selectedNote.pages[currentPage]) {
          setSaveStatus('saving');
          updateNote(selectedNote.id, {
            title,
            tags,
            editorType,
            pages: selectedNote.pages.map((page, index) =>
              index === currentPage ? { ...page, content } : page
            )
          });
          setSaveStatus('saved');
          setShowSaveNotification(true);
          setTimeout(() => setShowSaveNotification(false), 1000);
        }
        console.log('📝 Ctrl+Sで即座に保存しました');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNote, title, tags, editorType, content, currentPage, updateNote]);

  // ページナビゲーション - 切り替え前に保存
  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      console.log(`⬅️ 前のページに移動: ${currentPage + 1} → ${currentPage}`);
      saveCurrentPage(); // 現在のページを保存してから移動
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        console.log(`✅ ページ移動完了: ${currentPage}`);
      }, 50);
    }
  }, [currentPage, setCurrentPage, saveCurrentPage]);

  const handleNextPage = useCallback(() => {
    if (selectedNote && currentPage < selectedNote.pages.length - 1) {
      console.log(`➡️ 次のページに移動: ${currentPage + 1} → ${currentPage + 2}`);
      saveCurrentPage(); // 現在のページを保存してから移動
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        console.log(`✅ ページ移動完了: ${currentPage + 1}`);
      }, 50);
    }
  }, [selectedNote, currentPage, setCurrentPage, saveCurrentPage]);

  const handleAddPage = useCallback(() => {
    if (selectedNote) {
      console.log(`🆕 新しいページを追加開始`);
      console.log(`📊 現在の状態: currentPage=${currentPage}, pages.length=${selectedNote.pages.length}`);
      
      // 現在のページを明示的に保存
      const currentPageData = selectedNote.pages[currentPage];
      if (currentPageData) {
        console.log(`💾 現在のページを保存: content="${content.substring(0, 50)}..."`);
        const updatedCurrentPages = selectedNote.pages.map((page, index) =>
          index === currentPage ? { ...page, content } : page
        );
        
        // まず現在のページ内容を保存
        updateNote(selectedNote.id, { pages: updatedCurrentPages });
      }
      
      // 新しいページを追加
      const newPageId = Math.max(...selectedNote.pages.map(p => p.id)) + 1;
      const newPage = {
        id: newPageId,
        title: `ページ ${newPageId}`,
        content: ''
      };
      
      const finalPages = [...selectedNote.pages.map((page, index) =>
        index === currentPage ? { ...page, content } : page
      ), newPage];
      const newPageIndex = finalPages.length - 1;
      
      console.log(`📄 新しいページ追加: ID=${newPageId}, 総ページ数=${finalPages.length}`);
      console.log(`🎯 新しいページインデックス: ${newPageIndex}`);
      
      // 全ページを一度に更新
      updateNote(selectedNote.id, { pages: finalPages });
      
      // ページインデックスを更新
      setCurrentPage(newPageIndex);
      setContent(''); // 新しいページは空のコンテンツ
      
      console.log(`✅ ページ追加完了: 現在のページは ${newPageIndex + 1}/${finalPages.length}`);
    }
  }, [selectedNote, updateNote, setCurrentPage, currentPage, content]);

  if (!selectedNote) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">ノートを選択してください</h2>
          <p className="text-gray-500">左のサイドバーからノートを選択して編集を開始できます</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col bg-white relative ${className}`}>
      {/* 保存通知 */}
      {showSaveNotification && (
        <div className="absolute top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check size={16} />
          <span>保存しました！</span>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6">
        {/* メタデータセクション */}
        <Suspense fallback={<LoadingSpinner size="sm" text="メタデータを読み込み中..." />}>
          <NoteMetadata
            title={title}
            tags={tags}
            isFavorite={selectedNote.isFavorite}
            isPinned={selectedNote.isPinned}
            onTitleChange={handleTitleChange}
            onTagsChange={handleTagsChange}
            onToggleFavorite={handleToggleFavorite}
            onTogglePin={handleTogglePin}
            onDelete={handleDelete}
            onShowMindMap={handleShowMindMap}
            isEditing={isEditing}
          />
        </Suspense>

        {/* エディタセクション */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-gray-700">
                コンテンツ
              </h3>
              
              {/* 自動保存ステータス */}
              <div className="flex items-center px-2 py-1 text-xs rounded">
                {saveStatus === 'saved' && (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-green-600">保存済み</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-blue-600">保存中...</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                    <span className="text-orange-600">未保存</span>
                  </>
                )}
              </div>
              
              {/* ページ情報とナビゲーション */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  ページ {currentPage + 1} / {selectedNote.pages.length}
                </span>
                
                {/* ページ移動ボタン */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                    className="flex items-center justify-center w-5 h-5 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="前のページ"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= selectedNote.pages.length - 1}
                    className="flex items-center justify-center w-5 h-5 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="次のページ"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
                
                <button
                  onClick={handleAddPage}
                  className="flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  title="新しいページを追加"
                >
                  <Plus size={10} className="mr-1" />
                  追加
                </button>
              </div>
              
              {/* エディタタイプ切り替えボタン */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditorType('rich')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    editorType === 'rich'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="リッチテキストエディタ"
                >
                  <Edit3 size={12} />
                  リッチテキスト
                </button>
                <button
                  onClick={() => setEditorType('markdown')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    editorType === 'markdown'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Markdownエディタ"
                >
                  <FileText size={12} />
                  Markdown
                </button>
              </div>
            </div>
          </div>

          <Suspense fallback={<LoadingSpinner text="エディタを読み込み中..." />}>
            {editorType === 'markdown' ? (
              <MarkdownEditor
                content={content}
                onContentChange={handleContentChange}
                isEditing={isEditing}
              />
            ) : (
              <RichTextEditor
                content={content}
                onContentChange={handleContentChange}
                isEditing={isEditing}
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
});

RichNoteEditor.displayName = 'RichNoteEditor';

export default RichNoteEditor;