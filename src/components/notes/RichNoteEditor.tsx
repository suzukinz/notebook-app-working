import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, FileText, Edit3, Plus, Check } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
// LoadingSpinner removed as it's no longer needed after removing Suspense
import { logger } from '../../utils/logger';
import { validateNoteTitle } from '../../utils/validation';
import { debounce, DebouncedFunction } from '../../utils/debounce';

// Import components directly to avoid chunk loading conflicts
import RichTextEditor from './RichTextEditor';
import MarkdownEditor from './MarkdownEditor';
import NoteMetadata from './NoteMetadata';

interface RichNoteEditorProps {
  className?: string;
}

const RichNoteEditor: React.FC<RichNoteEditorProps> = ({ className = '' }) => {
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
  
  // ✅ SuperClaude修正: UI同期用の実際のページ数トラッキング
  const [actualPageCount, setActualPageCount] = useState<number>(1);

  // 前回のselectedNoteを追跡するためのref
  const prevSelectedNoteRef = useRef(selectedNote);
  const prevCurrentPageRef = useRef(currentPage);
  const prevTitleRef = useRef(title);
  const prevContentRef = useRef(content);
  const prevTagsRef = useRef(tags);
  const prevEditorTypeRef = useRef(editorType);

  // 🔥 ノート切り替え時の保存処理 - CRITICAL FIX
  useEffect(() => {
    const prevNote = prevSelectedNoteRef.current;
    const prevPage = prevCurrentPageRef.current;
    
    // ノートまたはページが変更された場合、前の編集内容を保存
    if (prevNote && (prevNote.id !== selectedNote?.id || prevPage !== currentPage)) {
      console.log(`🚨 CRITICAL: ノート/ページ切り替え検出 - 前の編集内容を即座に保存`);
      console.log(`   前: Note=${prevNote.id}, Page=${prevPage}`);
      console.log(`   後: Note=${selectedNote?.id || 'null'}, Page=${currentPage}`);
      
      // デバウンス中の保存を即座に実行
      debouncedSave.flush();
      
      // さらに、現在のstateで明示的に保存（double safety）
      if (prevNote.pages && prevNote.pages[prevPage]) {
        try {
          console.log(`💾 EMERGENCY SAVE: 明示的保存実行`);
          // 緊急保存は同期実行（Promiseは待たない）
          updateNote(prevNote.id, {
            title: prevTitleRef.current,
            tags: prevTagsRef.current,
            editorType: prevEditorTypeRef.current,
            pages: prevNote.pages.map((page, index) =>
              index === prevPage ? { ...page, content: prevContentRef.current } : page
            )
          }).catch((error) => {
            console.error(`❌ EMERGENCY SAVE失敗:`, error);
          });
          console.log(`✅ EMERGENCY SAVE実行開始`);
        } catch (error) {
          console.error(`❌ EMERGENCY SAVE失敗:`, error);
        }
      }
    }
    
    // refを更新
    prevSelectedNoteRef.current = selectedNote;
    prevCurrentPageRef.current = currentPage;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote, currentPage, updateNote]); // debouncedSave is intentionally excluded to avoid hoisting issues

  // refの値を更新
  useEffect(() => {
    prevTitleRef.current = title;
    prevContentRef.current = content;
    prevTagsRef.current = tags;
    prevEditorTypeRef.current = editorType;
  }, [title, content, tags, editorType]);

  // ノートが選択されたときの初期化
  useEffect(() => {
    console.log(`🔄 ノート選択状態変更: selectedNote=${selectedNote?.id || 'null'}`);
    
    if (selectedNote) {
      console.log(`🎯 新しいノートを選択: ID=${selectedNote.id}, title="${selectedNote.title}"`);
      
      // 即座に状態を更新（非同期処理なし）
      setTitle(selectedNote.title);
      setTags(selectedNote.tags || []);
      setEditorType(selectedNote.editorType || 'rich');
      
      // ✅ SuperClaude修正: ページ数も即座に更新
      setActualPageCount(selectedNote.pages.length);
      
      // ⭐️ 決定的修正: currentPageを0にリセット＋ページ1のコンテンツ設定
      if (currentPage !== 0) {
        console.log(`🎯 currentPageを${currentPage}から0にリセット`);
        setCurrentPage(0);
      }
      
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
      setActualPageCount(1);
      setCurrentPage(0);
    }
  }, [selectedNote?.id]); // ⭐️ selectedNote.idのみ監視でループ防止
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // ページが変更されたときのコンテンツ更新（無限ループ防止版）
  useEffect(() => {
    console.log(`🔄 [TRACE] ページ変更useEffect起動: currentPage=${currentPage}, selectedNote.id=${selectedNote?.id}`);
    console.log(`🔄 [TRACE] useEffect詳細状態:`);
    console.log(`   - selectedNote: ${!!selectedNote}`);
    console.log(`   - selectedNote.pages: ${!!selectedNote?.pages}`);
    console.log(`   - pages.length: ${selectedNote?.pages?.length}`);
    console.log(`   - currentPage: ${currentPage}`);
    
    if (selectedNote && selectedNote.pages && selectedNote.pages.length > 0) {
      const safeCurrentPage = Math.min(currentPage, selectedNote.pages.length - 1);
      const currentPageData = selectedNote.pages[safeCurrentPage];
      
      console.log(`📄 [TRACE] ページデータロード: page=${safeCurrentPage}, hasData=${!!currentPageData}`);
      console.log(`📄 [TRACE] safeCurrentPage計算: Math.min(${currentPage}, ${selectedNote.pages.length - 1}) = ${safeCurrentPage}`);
      
      if (currentPageData) {
        const pageContent = currentPageData.content || '';
        console.log(`📝 [TRACE] コンテンツ設定: "${pageContent.substring(0, 30)}..."`);
        console.log(`📝 [TRACE] setContent実行前: 新しいコンテンツ長=${pageContent.length}`);
        setContent(pageContent);
        console.log(`📝 [TRACE] setContent実行後`);
      } else {
        console.log(`❌ [TRACE] ページデータなし、空コンテンツ設定`);
        setContent('');
      }
    } else {
      console.log(`🗑️ [TRACE] selectedNoteまたはpagesなし、空コンテンツ設定`);
      setContent('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedNote?.id]); // ⭐️ pages.lengthを削除してループを防止
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // ✅ SuperClaude修正: actualPageCountとselectedNote.pages.lengthの同期
  useEffect(() => {
    if (selectedNote && selectedNote.pages) {
      const currentStorePageCount = selectedNote.pages.length;
      if (currentStorePageCount !== actualPageCount) {
        console.log(`🔄 [SYNC] ページ数同期: ${actualPageCount} → ${currentStorePageCount}`);
        setActualPageCount(currentStorePageCount);
      }
    }
  }, [selectedNote?.pages?.length, actualPageCount]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // ⭐️ SuperClaude修正: ストアとローカルステートの同期
  useEffect(() => {
    if (selectedNote && selectedNote.pages) {
      const currentStorePageCount = selectedNote.pages.length;
      if (actualPageCount !== currentStorePageCount) {
        console.log(`🔄 [SYNC] ページ数同期: ${actualPageCount} → ${currentStorePageCount}`);
        setActualPageCount(currentStorePageCount);
      }
    }
  }, [selectedNote?.pages?.length, actualPageCount]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // リアルタイム自動保存（デバウンス）- 1.5秒で素早く保存
  const debouncedSave: DebouncedFunction<() => void> = useMemo(() => {
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
          }).then(() => {
            setSaveStatus('saved');
            setShowSaveNotification(true);
            setTimeout(() => setShowSaveNotification(false), 1000);
            logger.info('Note auto-saved');
          }).catch((error) => {
            setSaveStatus('unsaved');
            logger.error('Auto-save failed:', error);
          });
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
  const handleToggleFavorite = useCallback(async () => {
    if (selectedNote) {
      await updateNote(selectedNote.id, {
        isFavorite: !selectedNote.isFavorite
      });
    }
  }, [selectedNote, updateNote]);

  const handleTogglePin = useCallback(async () => {
    if (selectedNote) {
      await updateNote(selectedNote.id, {
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

  // 手動保存関数 - 現在は使用しないがCtrl+S保存で利用
  // const saveCurrentPage = useCallback(() => { ... }, [...]);

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
          }).then(() => {
            setSaveStatus('saved');
            setShowSaveNotification(true);
            setTimeout(() => setShowSaveNotification(false), 1000);
          }).catch((error) => {
            console.error('❌ Ctrl+S保存失敗:', error);
            setSaveStatus('unsaved');
          });
        }
        console.log('📝 Ctrl+Sで即座に保存しました');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNote, title, tags, editorType, content, currentPage, updateNote]);

  // ページ離脱時・アンマウント時の保存 - CRITICAL SAFETY
  useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      // デバウンス中の保存を即座に実行
      debouncedSave.flush();
      
      // 現在編集中の内容を保存
      if (selectedNote && selectedNote.pages[currentPage]) {
        // beforeunloadでは同期実行（Promiseは待たない）
        updateNote(selectedNote.id, {
          title,
          tags,
          editorType,
          pages: selectedNote.pages.map((page, index) =>
            index === currentPage ? { ...page, content } : page
          )
        }).catch((error) => {
          console.error('❌ BEFOREUNLOAD保存失敗:', error);
        });
        console.log('🚨 BEFOREUNLOAD: 緊急保存実行');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // コンポーネントアンマウント時の保存
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // アンマウント時も保存
      debouncedSave.flush();
      if (selectedNote && selectedNote.pages && selectedNote.pages[currentPage]) {
        // unmountでは同期実行（Promiseは待たない）
        updateNote(selectedNote.id, {
          title,
          tags,
          editorType,
          pages: selectedNote.pages.map((page, index) =>
            index === currentPage ? { ...page, content } : page
          )
        }).catch((error) => {
          console.error('❌ UNMOUNT保存失敗:', error);
        });
        console.log('🚨 UNMOUNT: 緊急保存実行');
      }
    };
  }, [selectedNote, title, tags, editorType, content, currentPage, updateNote, debouncedSave]);

  // ページナビゲーション - 切り替え前に保存
  const handlePrevPage = useCallback(async () => {
    console.log(`🔍 [TRACE] handlePrevPage開始: currentPage=${currentPage}, pages.length=${selectedNote?.pages.length}`);
    
    if (currentPage > 0 && selectedNote && selectedNote.pages.length > 0) {
      const targetPage = currentPage - 1;
      console.log(`📍 [TRACE] 前のページに移動: ${currentPage} → ${targetPage}`);
      
      // 現在のページ内容を保存
      if (selectedNote.pages[currentPage] && content) {
        console.log(`💾 [TRACE] ページ移動前保存: currentPage=${currentPage}, content.length=${content.length}`);
        const updatedPages = selectedNote.pages.map((page, index) =>
          index === currentPage ? { ...page, content } : page
        );
        await updateNote(selectedNote.id, { pages: updatedPages });
        console.log(`✅ [TRACE] 保存完了: pages.length=${updatedPages.length}`);
      }
      
      // ページ切り替えを実行（コンテンツはuseEffectに任せる）
      setCurrentPage(targetPage);
      console.log(`🎯 [TRACE] handlePrevPage完了: ページ${targetPage + 1}に移動`);
    } else {
      console.log(`❌ [TRACE] handlePrevPage条件不一致: currentPage=${currentPage}, hasNote=${!!selectedNote}, pages.length=${selectedNote?.pages.length}`);
    }
  }, [currentPage, selectedNote, content, updateNote, setCurrentPage]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleNextPage = useCallback(async () => {
    console.log(`🔍 [TRACE] handleNextPage開始: currentPage=${currentPage}, pages.length=${selectedNote?.pages.length}`);
    console.log(`🔍 [TRACE] 条件チェック詳細:`);
    console.log(`   - selectedNote: ${!!selectedNote}`);
    console.log(`   - currentPage: ${currentPage}`);
    console.log(`   - actualPageCount: ${actualPageCount}`);
    console.log(`   - pages.length: ${selectedNote?.pages.length}`);
    console.log(`   - currentPage < actualPageCount - 1: ${currentPage} < ${actualPageCount - 1} = ${currentPage < actualPageCount - 1}`);
    console.log(`   - 計算: ${currentPage} < ${actualPageCount - 1} = ${currentPage < actualPageCount - 1}`);
    
    if (selectedNote && currentPage < actualPageCount - 1) {
      const targetPage = currentPage + 1;
      console.log(`📍 [TRACE] 次のページに移動: ${currentPage} → ${targetPage}`);
      
      // 現在のページ内容を保存
      if (selectedNote.pages[currentPage] && content) {
        console.log(`💾 [TRACE] ページ移動前保存: currentPage=${currentPage}, content.length=${content.length}`);
        const updatedPages = selectedNote.pages.map((page, index) =>
          index === currentPage ? { ...page, content } : page
        );
        await updateNote(selectedNote.id, { pages: updatedPages });
        console.log(`✅ [TRACE] 保存完了: pages.length=${updatedPages.length}`);
      }
      
      // ページ切り替えを実行（コンテンツはuseEffectに任せる）
      console.log(`🎯 [TRACE] setCurrentPage(${targetPage})実行前`);
      setCurrentPage(targetPage);
      console.log(`🎯 [TRACE] setCurrentPage(${targetPage})実行後`);
      console.log(`🎯 [TRACE] handleNextPage完了: ページ${targetPage + 1}に移動`);
    } else {
      console.log(`❌ [TRACE] handleNextPage条件不一致: currentPage=${currentPage}, hasNote=${!!selectedNote}, pages.length=${selectedNote?.pages.length}`);
      if (selectedNote) {
        console.log(`❌ [TRACE] 条件詳細分析:`);
        console.log(`   - 条件1 selectedNote: ${!!selectedNote} ✅`);
        console.log(`   - 条件2 currentPage < actualPageCount - 1: ${currentPage} < ${actualPageCount - 1} = ${currentPage < actualPageCount - 1} ${currentPage < actualPageCount - 1 ? '✅' : '❌'}`);
        if (currentPage >= actualPageCount - 1) {
          console.log(`❌ [TRACE] 最後のページに到達: ${currentPage + 1}/${actualPageCount}`);
        }
      }
    }
  }, [currentPage, actualPageCount, selectedNote, content, updateNote, setCurrentPage]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleAddPage = useCallback(async () => {
    console.log(`🔍 [TRACE] handleAddPage開始`);
    
    if (!selectedNote) {
      console.log(`❌ [TRACE] selectedNoteが存在しません`);
      return;
    }
    
    try {
      console.log(`🆕 [TRACE] 新しいページを追加開始`);
      console.log(`📊 [TRACE] 現在の状態: currentPage=${currentPage}, pages.length=${selectedNote.pages.length}`);
      
      // ✅ ID統一修正: string ID生成（空配列対応）
      const maxId = selectedNote.pages.length > 0 
        ? Math.max(...selectedNote.pages.map(p => parseInt(p.id) || 0))
        : 0;
      const newPageId = (maxId + 1).toString();
      console.log(`🆔 [TRACE] 新しいページID生成: ${newPageId}`);
      
      // 現在のページ内容を保存した状態で新しいページを追加
      const updatedPages = selectedNote.pages.map((page, index) =>
        index === currentPage ? { ...page, content } : page
      );
      console.log(`📝 [TRACE] 現在のページ内容保存: currentPage=${currentPage}, content.length=${content.length}`);
      
      const newPage = {
        id: newPageId,
        title: `ページ ${newPageId}`,
        content: ''
      };
      
      const finalPages = [...updatedPages, newPage];
      const newPageIndex = finalPages.length - 1;
      
      console.log(`📄 [TRACE] 新しいページ追加: ID=${newPageId}, 総ページ数=${finalPages.length}, newPageIndex=${newPageIndex}`);
      
      // ✅ SuperClaude修正: UI即座更新 + Promise-based updateNoteで確実に状態更新を待つ
      setActualPageCount(finalPages.length); // UI即座更新
      
      console.log(`💾 [TRACE] updateNote実行開始: noteId=${selectedNote.id}`);
      await updateNote(selectedNote.id, { pages: finalPages });
      console.log(`✅ [TRACE] updateNote実行完了 - Promiseで同期保証`);
      
      // ✅ 修正: updateNoteのPromise完了後に確実にページ移動
      console.log(`🎯 [TRACE] setCurrentPage(${newPageIndex})実行`);
      setCurrentPage(newPageIndex);
      
      console.log(`📝 [TRACE] setContent('')実行`);
      setContent('');
      
      console.log(`✅ [TRACE] ページ追加完了: 現在のページは ${newPageIndex + 1}/${finalPages.length}`);
      
    } catch (error) {
      console.error('❌ [TRACE] ページ追加エラー:', error);
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
                  ページ {currentPage + 1} / {actualPageCount}
                </span>
                
                {/* ページ移動ボタン */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`🔍 [TRACE] 前のページボタンクリック`);
                      handlePrevPage();
                    }}
                    disabled={currentPage === 0}
                    className="flex items-center justify-center w-5 h-5 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="前のページ"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`🔍 [TRACE] 次のページボタンクリック`);
                      console.log(`🔍 [TRACE] ボタン状態チェック: currentPage=${currentPage}, actualPageCount=${actualPageCount}, pages.length=${selectedNote.pages.length}`);
                      console.log(`🔍 [TRACE] disabled計算: ${currentPage} >= ${actualPageCount - 1} = ${currentPage >= actualPageCount - 1}`);
                      handleNextPage();
                    }}
                    disabled={currentPage >= actualPageCount - 1}
                    className="flex items-center justify-center w-5 h-5 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="次のページ"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🔍 [TRACE] ページ追加ボタンクリック`);
                    handleAddPage();
                  }}
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
        </div>
      </div>
    </div>
  );
};

RichNoteEditor.displayName = 'RichNoteEditor';

// ⭐️ 決定的修正: React.memoで不必要な再マウントを完全防止
export default React.memo(RichNoteEditor);