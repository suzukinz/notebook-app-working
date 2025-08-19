import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Heart, MessageCircle, Repeat2, Share, Trash2, Image, Send, Calendar } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  timestamp: string;
}

interface TimelineEntry {
  id: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: Comment[];
  retweets: number;
  isLiked: boolean;
  tags: string[];
  images?: string[];
}

interface TimelineProps {
  selectedDate?: Date | null;
  onTimelineEntriesChange?: (dates: Date[]) => void;
}

const Timeline: React.FC<TimelineProps> = ({ selectedDate, onTimelineEntriesChange }) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<{[key: string]: string}>({});
  const [viewingDate, setViewingDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // タイムラインに投稿がある日付を取得する関数
  const getEntriesDateList = useCallback((): Date[] => {
    const dates = new Set<string>();
    entries.forEach(entry => {
      const entryDate = new Date(entry.timestamp);
      const dateString = `${entryDate.getFullYear()}-${entryDate.getMonth()}-${entryDate.getDate()}`;
      dates.add(dateString);
    });
    
    return Array.from(dates).map(dateString => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year!, month!, day!);
    });
  }, [entries]);

  // ローカルストレージからエントリを読み込む
  useEffect(() => {
    const savedEntries = localStorage.getItem('dashboard-timeline');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  // エントリが変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('dashboard-timeline', JSON.stringify(entries));
    
    // 親コンポーネントにタイムライン投稿がある日付を通知
    if (onTimelineEntriesChange) {
      onTimelineEntriesChange(getEntriesDateList());
    }
  }, [entries, onTimelineEntriesChange, getEntriesDateList]);

  // 外部からの日付選択を反映
  useEffect(() => {
    if (selectedDate) {
      setViewingDate(selectedDate);
    }
  }, [selectedDate]);

  // 外側をクリックしたときに日付選択を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDatePicker && !target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDatePicker]);

  // 選択された日付のエントリのみをフィルタリング
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    const compareDate = viewingDate;
    
    // 日付フィルター
    const dateMatches = (
      entryDate.getFullYear() === compareDate.getFullYear() &&
      entryDate.getMonth() === compareDate.getMonth() &&
      entryDate.getDate() === compareDate.getDate()
    );
    
    // 検索フィルター
    const searchMatches = !searchTerm || 
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // タグフィルター
    const tagMatches = !selectedTag || entry.tags.includes(selectedTag);
    
    return dateMatches && searchMatches && tagMatches;
  });

  const addEntry = () => {
    if (newEntry.trim() || selectedImages.length > 0) {
      // 選択された日付の時刻にエントリを作成
      const entryDate = new Date(viewingDate);
      entryDate.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());
      
      const entry: TimelineEntry = {
        id: Date.now().toString(),
        content: newEntry,
        timestamp: entryDate.toISOString(),
        likes: 0,
        comments: [],
        retweets: 0,
        isLiked: false,
        tags: extractTags(newEntry),
        ...(selectedImages.length > 0 && { images: [...selectedImages] })
      };
      setEntries([entry, ...entries]);
      setNewEntry('');
      setSelectedImages([]);
      setShowComposer(false);
    }
  };

  const extractTags = (content: string): string[] => {
    const tagRegex = /#[\w\u3042-\u3096\u30A1-\u30FC\u4E00-\u9FAF\uFF01-\uFF60\u3000-\u303F]+/g;
    const tags = content.match(tagRegex) || [];
    return [...new Set(tags)];
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const toggleLike = (id: string) => {
    setEntries(entries.map(entry =>
      entry.id === id 
        ? { ...entry, isLiked: !entry.isLiked, likes: entry.isLiked ? entry.likes - 1 : entry.likes + 1 }
        : entry
    ));
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}秒前`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
    
    const diffInDays = Math.floor(diffInSeconds / 86400);
    if (diffInDays < 7) return `${diffInDays}日前`;
    
    return time.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const formatContent = (content: string) => {
    // ハッシュタグを青色にする
    let formatted = content.replace(/#[\w\u3042-\u3096\u30A1-\u30FC\u4E00-\u9FAF\uFF01-\uFF60\u3000-\u303F]+/g, 
      '<span class="text-blue-500 dark:text-blue-400 font-medium cursor-pointer hover:underline">$&</span>'
    );
    // URLをリンク化
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 dark:text-blue-400 underline hover:text-blue-600 dark:hover:text-blue-300">$1</a>'
    );
    // 改行を<br>タグに変換
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const promises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(promises).then(results => {
        setSelectedImages([...selectedImages, ...results]);
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const addComment = (entryId: string) => {
    const comment = newComment[entryId];
    if (comment?.trim()) {
      const newCommentObj: Comment = {
        id: Date.now().toString(),
        content: comment,
        timestamp: new Date().toISOString()
      };
      
      setEntries(entries.map(entry => 
        entry.id === entryId 
          ? { ...entry, comments: [...entry.comments, newCommentObj] }
          : entry
      ));
      
      setNewComment({ ...newComment, [entryId]: '' });
    }
  };

  const toggleComments = (entryId: string) => {
    setShowCommentsFor(showCommentsFor === entryId ? null : entryId);
  };

  // タグ一覧を取得
  const getAllTags = (): string[] => {
    const allTags = new Set<string>();
    entries.forEach(entry => {
      entry.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  };

  // ハッシュタグクリックハンドラ
  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <MessageSquare className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">タイムライン</h2>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {viewingDate.toLocaleDateString('ja-JP', { 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'short'
                })}の記録
              </p>
              <button
                onClick={() => {
                  const today = new Date();
                  setViewingDate(today);
                }}
                className="text-xs text-blue-500 hover:text-blue-600 underline"
              >
                今日
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative date-picker-container">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="日付を選択"
            >
              <Calendar className="w-4 h-4" />
            </button>
            {showDatePicker && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                <input
                  type="date"
                  value={viewingDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    setViewingDate(new Date(e.target.value));
                    setShowDatePicker(false);
                  }}
                  className="bg-transparent text-sm text-gray-900 dark:text-white outline-none border-none"
                  autoFocus
                />
              </div>
            )}
          </div>
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>投稿</span>
          </button>
        </div>
      </div>

      {/* 検索フィルター */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="投稿を検索..."
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* タグフィルター */}
        {getAllTags().length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">タグ:</span>
            {getAllTags().slice(0, 5).map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600 hover:bg-red-200 dark:hover:bg-red-800"
              >
                クリア
              </button>
            )}
          </div>
        )}
      </div>

      {/* 新しい投稿作成 */}
      {showComposer && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <div className="flex space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">Me</span>
            </div>
            <div className="flex-1">
              <textarea
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder="今何してる？ #ハッシュタグ で分類できます"
                className="w-full px-3 py-3 border-none resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none text-lg"
                rows={4}
                maxLength={500}
              />
              {/* 選択した画像のプレビュー */}
              {selectedImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={image} 
                        alt={`選択画像${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <Image className="w-5 h-5" />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                  <div className="text-sm text-gray-500">
                    {newEntry.length}/500
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowComposer(false);
                      setSelectedImages([]);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={addEntry}
                    disabled={!newEntry.trim() && selectedImages.length === 0}
                    className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    投稿
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* タイムライン */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {selectedDate ? 'この日' : 'まだ'}の投稿はありません
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              最初の投稿をしてみましょう！
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="border-b border-gray-100 dark:border-gray-700 pb-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors"
            >
              <div className="flex space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">Me</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900 dark:text-white">あなた</span>
                    <span className="text-gray-500 dark:text-gray-400">@me</span>
                    <span className="text-gray-500 dark:text-gray-400">·</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {formatTimeAgo(entry.timestamp)}
                    </span>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <div 
                      className="text-gray-900 dark:text-white leading-relaxed prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: formatContent(entry.content) }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'SPAN' && target.textContent?.startsWith('#')) {
                          handleTagClick(target.textContent);
                        }
                      }}
                    />
                  </div>

                  {/* 画像表示 */}
                  {entry.images && entry.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
                      {entry.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`投稿画像${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(image, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* アクションボタン */}
                  <div className="flex items-center justify-between mt-3 max-w-md">
                    <button 
                      onClick={() => toggleComments(entry.id)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors group"
                    >
                      <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{entry.comments.length}</span>
                    </button>
                    
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-green-500 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-900/20">
                        <Repeat2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{entry.retweets}</span>
                    </button>
                    
                    <button 
                      onClick={() => toggleLike(entry.id)}
                      className={`flex items-center space-x-1 transition-colors group ${
                        entry.isLiked 
                          ? 'text-red-500' 
                          : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <div className="p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-900/20">
                        <Heart className={`w-4 h-4 ${entry.isLiked ? 'fill-current' : ''}`} />
                      </div>
                      <span className="text-sm">{entry.likes}</span>
                    </button>
                    
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                        <Share className="w-4 h-4" />
                      </div>
                    </button>
                  </div>

                  {/* コメントセクション */}
                  {showCommentsFor === entry.id && (
                    <div className="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                      {/* コメント一覧 */}
                      {entry.comments.length > 0 && (
                        <div className="space-y-2">
                          {entry.comments.map((comment) => (
                            <div key={comment.id} className="flex space-x-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-semibold">C</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900 dark:text-white">{comment.content}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {formatTimeAgo(comment.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* コメント入力 */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newComment[entry.id] || ''}
                          onChange={(e) => setNewComment({ ...newComment, [entry.id]: e.target.value })}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addComment(entry.id);
                            }
                          }}
                          placeholder="コメントを入力..."
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => addComment(entry.id)}
                          disabled={!newComment[entry.id]?.trim()}
                          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* フッター統計 */}
      {filteredEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{filteredEntries.length}件の投稿</span>
            <div className="flex items-center space-x-4">
              <span>❤️ {filteredEntries.reduce((sum, entry) => sum + entry.likes, 0)}</span>
              <span>💬 {filteredEntries.reduce((sum, entry) => sum + entry.comments.length, 0)}</span>
              <span>🔄 {filteredEntries.reduce((sum, entry) => sum + entry.retweets, 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;