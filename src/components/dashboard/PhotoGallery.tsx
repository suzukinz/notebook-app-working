import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Image, Calendar, FileText, ExternalLink, ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';

interface Photo {
  id: string;
  src: string;
  timestamp: string;
  source: 'timeline' | 'note';
  title?: string;
  noteTitle?: string;
  noteId?: number;
  pageId?: number;
  folderPath?: string;
}

interface PhotoGalleryProps {
  selectedDate?: Date | null;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ selectedDate }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [centerIndex, setCenterIndex] = useState(0);
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notesData, setSelectedNote, setCurrentPage, setShowDashboard } = useNotebookStore();

  // ユーザー登録写真をローカルストレージから読み込み
  useEffect(() => {
    const savedUserPhotos = localStorage.getItem('dashboard-user-photos');
    if (savedUserPhotos) {
      try {
        setUserPhotos(JSON.parse(savedUserPhotos));
      } catch (error) {
        console.error('Error parsing user photos:', error);
        setUserPhotos([]);
      }
    }
  }, []);

  // ユーザー写真が変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('dashboard-user-photos', JSON.stringify(userPhotos));
  }, [userPhotos]);

  // ローカルストレージから画像を収集
  useEffect(() => {
    const collectPhotos = () => {
      const collectedPhotos: Photo[] = [...userPhotos]; // ユーザー登録写真を最初に追加

      // タイムラインの投稿から画像を収集
      try {
        const timelineData = localStorage.getItem('dashboard-timeline');
        
        if (timelineData) {
          const timelineEntries = JSON.parse(timelineData);
          
          if (Array.isArray(timelineEntries)) {
            timelineEntries.forEach((entry: any) => {
              if (entry && entry.images && Array.isArray(entry.images) && entry.images.length > 0) {
                entry.images.forEach((image: string, index: number) => {
                  if (image && typeof image === 'string') {
                    collectedPhotos.push({
                      id: `timeline-${entry.id}-${index}`,
                      src: image,
                      timestamp: entry.timestamp,
                      source: 'timeline',
                      title: entry.content ? entry.content.slice(0, 50) + (entry.content.length > 50 ? '...' : '') : 'タイムライン投稿'
                    });
                  }
                });
              }
            });
          }
        }
      } catch (error) {
        console.warn('タイムラインデータの読み込みに失敗しました:', error);
      }

      // ノートからの画像を収集
      Object.entries(notesData).forEach(([folderPath, notes]) => {
        notes.forEach((note) => {
          note.pages.forEach((page) => {
            
            // 重複を避けるためにSetを使用
            const foundImages = new Set<string>();
            
            // より広範囲な画像抽出パターン
            const patterns = [
              // Markdown形式
              /!\[.*?\]\((data:image\/[^)]+)\)/g,
              // HTML img タグ
              /<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/g,
              // base64データの直接検索
              /(data:image\/[^;\s]+;base64,[A-Za-z0-9+/=]+)/g,
              // Quillエディタ形式も考慮
              /"(data:image\/[^"]+)"/g
            ];
            
            let imageIndex = 0;
            patterns.forEach((pattern) => {
              // パターンごとにlastIndexをリセット
              pattern.lastIndex = 0;
              let match;
              while ((match = pattern.exec(page.content)) !== null) {
                const imageSrc = match[1];
                
                if (imageSrc && imageSrc.startsWith('data:image/') && !foundImages.has(imageSrc)) {
                  foundImages.add(imageSrc);
                  collectedPhotos.push({
                    id: `note-${note.id}-${page.id}-${imageIndex}`,
                    src: imageSrc,
                    timestamp: note.updatedAt || note.createdAt,
                    source: 'note',
                    title: `${note.title} - ${page.title}`,
                    noteTitle: note.title,
                    noteId: note.id,
                    pageId: page.id,
                    folderPath: folderPath
                  });
                  imageIndex++;
                }
              }
            });
          });
        });
      });

      // 日付でソート（新しい順）
      collectedPhotos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setPhotos(collectedPhotos);
    };

    collectPhotos();
    
    // タイムラインが更新された時にも再読み込み（頻度を下げる）
    const interval = setInterval(collectPhotos, 5000);
    return () => clearInterval(interval);
  }, [notesData, userPhotos]); // notesDataとuserPhotosが変更された時も再実行

  // 写真アップロード処理
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            const newPhoto: Photo = {
              id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              src: result,
              timestamp: new Date().toISOString(),
              source: 'timeline',
              title: `アップロード写真 - ${file.name}`,
            };
            setUserPhotos(prev => [newPhoto, ...prev]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowUploadForm(false);
  };

  // 写真削除
  const deleteUserPhoto = (photoId: string) => {
    setUserPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  // 選択された日付に基づいてフィルタリング
  const filteredPhotos = useMemo(() => {
    if (!selectedDate) return photos.slice(0, 24); // 最新24枚に増やす
    
    return photos.filter(photo => {
      const photoDate = new Date(photo.timestamp);
      return photoDate.toDateString() === selectedDate.toDateString();
    });
  }, [photos, selectedDate]);

  // 初期中央インデックス設定
  useEffect(() => {
    if (filteredPhotos.length > 0) {
      setCenterIndex(0);
      // 初期スクロール位置を設定
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [filteredPhotos.length]);

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredPhotos.length === 0) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newIndex = Math.max(0, centerIndex - 1);
        setCenterIndex(newIndex);
        if (scrollContainerRef.current) {
          const itemWidth = 190;
          const scrollLeft = newIndex * itemWidth - scrollContainerRef.current.clientWidth / 2 + 80;
          scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newIndex = Math.min(filteredPhotos.length - 1, centerIndex + 1);
        setCenterIndex(newIndex);
        if (scrollContainerRef.current) {
          const itemWidth = 190;
          const scrollLeft = newIndex * itemWidth - scrollContainerRef.current.clientWidth / 2 + 80;
          scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (filteredPhotos[centerIndex]) {
          setSelectedPhoto(filteredPhotos[centerIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [centerIndex, filteredPhotos]);

  // スクロール位置に基づく中央計算
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = 190; // 160px + 30px margin
    const containerWidth = container.clientWidth;
    const centerOffset = containerWidth / 2;
    
    const newCenterIndex = Math.round((scrollLeft + centerOffset - 80) / itemWidth);
    setCenterIndex(Math.max(0, Math.min(newCenterIndex, filteredPhotos.length - 1)));
  }, [filteredPhotos.length]);

  // Cover Flow スタイル計算
  const getCoverFlowStyle = useCallback((index: number) => {
    const distance = index - centerIndex;
    const absDistance = Math.abs(distance);
    
    if (absDistance === 0) {
      // 中央のアイテム
      return {
        transform: 'rotateY(0deg) scale(1.1) translateZ(50px)',
        zIndex: 10,
        filter: 'brightness(1)',
        opacity: 1
      };
    } else if (absDistance === 1) {
      // 隣接アイテム
      const rotateY = distance > 0 ? -45 : 45;
      return {
        transform: `rotateY(${rotateY}deg) scale(0.9) translateZ(20px) translateX(${distance > 0 ? 20 : -20}px)`,
        zIndex: 5,
        filter: 'brightness(0.8)',
        opacity: 0.9
      };
    } else if (absDistance === 2) {
      // 2つ離れたアイテム
      const rotateY = distance > 0 ? -65 : 65;
      return {
        transform: `rotateY(${rotateY}deg) scale(0.75) translateZ(-10px) translateX(${distance > 0 ? 40 : -40}px)`,
        zIndex: 2,
        filter: 'brightness(0.6)',
        opacity: 0.7
      };
    } else {
      // 遠くのアイテム
      const rotateY = distance > 0 ? -75 : 75;
      return {
        transform: `rotateY(${rotateY}deg) scale(0.6) translateZ(-30px) translateX(${distance > 0 ? 60 : -60}px)`,
        zIndex: 1,
        filter: 'brightness(0.4)',
        opacity: 0.5
      };
    }
  }, [centerIndex]);

  // ナビゲーション関数
  const goToPrevious = useCallback(() => {
    if (filteredPhotos.length === 0) return;
    const newIndex = Math.max(0, centerIndex - 1);
    setCenterIndex(newIndex);
    if (scrollContainerRef.current) {
      const itemWidth = 190;
      const scrollLeft = newIndex * itemWidth - scrollContainerRef.current.clientWidth / 2 + 80;
      scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [centerIndex, filteredPhotos.length]);

  const goToNext = useCallback(() => {
    if (filteredPhotos.length === 0) return;
    const newIndex = Math.min(filteredPhotos.length - 1, centerIndex + 1);
    setCenterIndex(newIndex);
    if (scrollContainerRef.current) {
      const itemWidth = 190;
      const scrollLeft = newIndex * itemWidth - scrollContainerRef.current.clientWidth / 2 + 80;
      scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [centerIndex, filteredPhotos.length]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ノートに飛ぶ関数
  const navigateToNote = (photo: Photo) => {
    if (photo.source === 'note' && photo.noteId && photo.folderPath) {
      // ノートデータからノートを検索
      const notes = notesData[photo.folderPath] || [];
      const note = notes.find(n => n.id === photo.noteId);
      
      if (note) {
        // ページ番号を取得（photo.pageIdに基づいて）
        const pageIndex = note.pages.findIndex(p => p.id === photo.pageId);
        
        setSelectedNote(note);
        setCurrentPage(pageIndex >= 0 ? pageIndex : 0);
        setShowDashboard(false); // ダッシュボードを閉じる
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full relative overflow-hidden">
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center space-x-3">
          <Image className="w-5 h-5 text-purple-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">フォトギャラリー</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedDate 
                ? `${selectedDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}の写真` 
                : '思い出の写真'
              } ({filteredPhotos.length}枚)
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedDate && (
            <div className="text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
              <Calendar className="w-4 h-4 inline mr-1" />
              {selectedDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
            </div>
          )}
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>写真追加</span>
          </button>
        </div>
      </div>

      {/* 写真アップロードフォーム */}
      {showUploadForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">新しい写真を追加</h3>
            <button
              onClick={() => setShowUploadForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">写真をドラッグ＆ドロップまたは</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
              >
                ファイルを選択
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">JPG, PNG, GIF形式対応</p>
            </div>
          </div>
        </div>
      )}

      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16 relative z-10">
          <div className="p-4 bg-white bg-opacity-30 rounded-full inline-block mb-6">
            <Image className="w-16 h-16 text-gray-400 mx-auto" />
          </div>
          <p className="text-gray-600 text-lg font-medium mb-2">
            {selectedDate ? 'この日の写真はありません' : '写真がまだありません'}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            「写真追加」ボタンから思い出の写真をアップロードしてみましょう
          </p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>最初の写真を追加</span>
          </button>
        </div>
      ) : (
        <>
          {/* 3D Cover Flow Gallery */}
          <div className="relative z-10" style={{ perspective: '1500px', perspectiveOrigin: 'center center' }}>
            {/* ガラス効果背景 */}
            <div 
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                zIndex: 0
              }}
            />
            
            {/* 左ナビゲーションボタン */}
            <button
              onClick={goToPrevious}
              disabled={centerIndex === 0}
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full transition-all duration-300 ${
                centerIndex === 0
                  ? 'bg-white bg-opacity-30 text-gray-400 cursor-not-allowed'
                  : 'bg-white bg-opacity-70 text-purple-700 shadow-lg hover:shadow-xl hover:scale-110 hover:bg-opacity-90'
              }`}
              style={{ backdropFilter: 'blur(15px)' }}
              title="前の写真"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* 右ナビゲーションボタン */}
            <button
              onClick={goToNext}
              disabled={centerIndex === filteredPhotos.length - 1}
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full transition-all duration-300 ${
                centerIndex === filteredPhotos.length - 1
                  ? 'bg-white bg-opacity-30 text-gray-400 cursor-not-allowed'
                  : 'bg-white bg-opacity-70 text-purple-700 shadow-lg hover:shadow-xl hover:scale-110 hover:bg-opacity-90'
              }`}
              style={{ backdropFilter: 'blur(15px)' }}
              title="次の写真"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div 
              ref={scrollContainerRef}
              className="overflow-x-auto overflow-y-hidden py-16 px-4 scrollbar-hide"
              style={{
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              onScroll={handleScroll}
            >
              <div className="inline-flex items-center" style={{ gap: '30px', paddingLeft: '50%', paddingRight: '50%' }}>
                {filteredPhotos.map((photo, index) => {
                  const coverFlowStyle = getCoverFlowStyle(index);
                  
                  return (
                    <div 
                      key={photo.id}
                      className="relative cursor-pointer group flex-shrink-0"
                      style={{
                        width: '160px',
                        height: '160px',
                        scrollSnapAlign: 'center',
                        transformStyle: 'preserve-3d',
                        transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
                        transformOrigin: 'center center',
                        ...coverFlowStyle
                      }}
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setCenterIndex(index);
                      }}
                    >
                      <div className="relative">
                        <img 
                          src={photo.src} 
                          alt={photo.title || `Photo ${index + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover rounded-xl transition-all duration-500"
                          style={{
                            boxShadow: index === centerIndex 
                              ? '0 25px 50px rgba(147, 51, 234, 0.3), 0 10px 25px rgba(147, 51, 234, 0.2)'
                              : '0 10px 20px rgba(0, 0, 0, 0.1), 0 5px 10px rgba(0, 0, 0, 0.05)',
                            border: index === centerIndex ? '3px solid rgba(255, 255, 255, 0.8)' : '2px solid rgba(255, 255, 255, 0.4)'
                          }}
                        />
                        {/* リフレクション効果 */}
                        <div 
                          className="absolute top-full left-0 w-full h-1/3 overflow-hidden rounded-b-xl"
                          style={{
                            background: `url(${photo.src})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center top',
                            transform: 'scaleY(-1)',
                            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 80%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 80%)',
                            filter: 'blur(0.5px) brightness(0.6)',
                            opacity: index === centerIndex ? 0.4 : 0.2
                          }}
                        />
                      </div>
                      
                      <div 
                        className={`absolute bottom-0 left-0 right-0 text-white p-2 rounded-b-lg text-xs transition-opacity duration-500 ${
                          index === centerIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent)'
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium truncate flex-1 mr-2">{photo.title || 'Untitled'}</div>
                          <span className={`px-1 py-0.5 text-xs rounded ${
                            photo.source === 'timeline' 
                              ? 'bg-blue-500/70 text-white' 
                              : 'bg-green-500/70 text-white'
                          }`}>
                            {photo.source === 'timeline' ? '📸' : '📝'}
                          </span>
                        </div>
                        <div className="opacity-80">{formatDate(photo.timestamp)}</div>
                        {photo.source === 'note' && (
                          <div className="mt-1 text-xs opacity-90 truncate">{photo.folderPath}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* ナビゲーションインジケーター */}
              <div className="flex justify-center mt-4 space-x-2">
                {filteredPhotos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCenterIndex(index);
                      if (scrollContainerRef.current) {
                        const itemWidth = 190;
                        const scrollLeft = index * itemWidth - scrollContainerRef.current.clientWidth / 2 + 80;
                        scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                      }
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === centerIndex 
                        ? 'bg-purple-500 scale-125' 
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-purple-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* コントロールと統計 */}
          <div className="mt-6 pt-4 border-t border-white border-opacity-30 relative z-10">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <span className="font-medium">{filteredPhotos.length}枚の写真</span>
              <div className="flex items-center space-x-4">
                <span className="px-2 py-1 bg-white bg-opacity-40 rounded-full text-xs">📸 {filteredPhotos.filter(p => p.source === 'timeline').length}</span>
                <span className="px-2 py-1 bg-white bg-opacity-40 rounded-full text-xs">📝 {filteredPhotos.filter(p => p.source === 'note').length}</span>
              </div>
            </div>
            
            {/* キーボードナビゲーションヒント */}
            <div className="text-xs text-gray-500 text-center">
              <span className="hidden md:inline">← → キーでナビゲーション | </span>
              <span className="md:hidden">スワイプでナビゲーション | </span>
              クリックで詳細表示
            </div>
          </div>
        </>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] p-4">
          <div 
            className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white bg-opacity-70 text-gray-700 rounded-full hover:bg-opacity-90 transition-all backdrop-blur-sm"
            >
              ×
            </button>
            <img
              src={selectedPhoto.src}
              alt={selectedPhoto.title || 'Photo'}
              className="max-w-full max-h-[80vh] object-contain rounded-t-2xl"
            />
            <div className="p-6 border-t border-white border-opacity-30">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {selectedPhoto.title || 'Untitled'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(selectedPhoto.timestamp)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                    selectedPhoto.source === 'timeline' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {selectedPhoto.source === 'timeline' ? 'タイムライン' : 'ノート'}
                  </span>
                  {selectedPhoto.source === 'note' && (
                    <button 
                      onClick={() => navigateToNote(selectedPhoto)}
                      className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white text-xs rounded-full hover:bg-purple-700 transition-colors"
                      title="ノートを開く"
                    >
                      <FileText className="w-3 h-3" />
                      <span>ノートを開く</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  {selectedPhoto.id.startsWith('user-') && (
                    <button
                      onClick={() => {
                        if (window.confirm('この写真を削除しますか？')) {
                          deleteUserPhoto(selectedPhoto.id);
                          setSelectedPhoto(null);
                        }
                      }}
                      className="p-1 text-red-500 hover:text-red-700 transition-colors"
                      title="写真を削除"
                    >
                      <span className="text-sm">🗑️</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;