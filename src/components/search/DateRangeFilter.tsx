// 日付範囲フィルタコンポーネント
import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, Clock, ChevronDown, X, RotateCcw } from 'lucide-react';

interface DateRange {
  start?: string | undefined;
  end?: string | undefined;
  field: 'createdAt' | 'updatedAt' | 'lastAccessedAt';
}

interface DateRangeFilterProps {
  dateRange?: { start?: string | undefined; end?: string | undefined; field: 'createdAt' | 'updatedAt' | 'lastAccessedAt' } | undefined;
  onDateRangeChange: (range?: { start?: string | undefined; end?: string | undefined; field: 'createdAt' | 'updatedAt' | 'lastAccessedAt' } | undefined) => void;
  className?: string;
}

// プリセット日付範囲
interface DatePreset {
  label: string;
  getValue: () => DateRange;
  description: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onDateRangeChange,
  className = ''
}) => {
  // 状態管理
  const [showDropdown, setShowDropdown] = useState(false);
  const [customStart, setCustomStart] = useState(dateRange?.start || '');
  const [customEnd, setCustomEnd] = useState(dateRange?.end || '');
  const [selectedField, setSelectedField] = useState<'createdAt' | 'updatedAt' | 'lastAccessedAt'>(
    dateRange?.field || 'updatedAt'
  );

  // プリセット日付範囲の定義
  const datePresets = useMemo((): DatePreset[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 日付計算ヘルパー
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
    const addMonths = (date: Date, months: number) => {
      const result = new Date(date);
      result.setMonth(result.getMonth() + months);
      return result;
    };

    return [
      {
        label: '今日',
        description: '今日作成/更新されたノート',
        getValue: () => ({
          start: formatDate(today),
          end: formatDate(addDays(today, 1)),
          field: selectedField
        })
      },
      {
        label: '昨日',
        description: '昨日作成/更新されたノート',
        getValue: () => ({
          start: formatDate(addDays(today, -1)),
          end: formatDate(today),
          field: selectedField
        })
      },
      {
        label: '過去7日間',
        description: '過去1週間のノート',
        getValue: () => ({
          start: formatDate(addDays(today, -7)),
          end: formatDate(addDays(today, 1)),
          field: selectedField
        })
      },
      {
        label: '過去30日間',
        description: '過去1ヶ月のノート',
        getValue: () => ({
          start: formatDate(addDays(today, -30)),
          end: formatDate(addDays(today, 1)),
          field: selectedField
        })
      },
      {
        label: '今月',
        description: '今月のノート',
        getValue: () => ({
          start: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
          end: formatDate(addDays(new Date(now.getFullYear(), now.getMonth() + 1, 1), 0)),
          field: selectedField
        })
      },
      {
        label: '先月',
        description: '先月のノート',
        getValue: () => ({
          start: formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
          end: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
          field: selectedField
        })
      },
      {
        label: '過去3ヶ月',
        description: '過去3ヶ月のノート',
        getValue: () => ({
          start: formatDate(addMonths(today, -3)),
          end: formatDate(addDays(today, 1)),
          field: selectedField
        })
      },
      {
        label: '今年',
        description: '今年のノート',
        getValue: () => ({
          start: formatDate(new Date(now.getFullYear(), 0, 1)),
          end: formatDate(new Date(now.getFullYear() + 1, 0, 1)),
          field: selectedField
        })
      }
    ];
  }, [selectedField]);

  // フィールドラベル
  const fieldLabels = {
    createdAt: '作成日',
    updatedAt: '更新日',
    lastAccessedAt: '最終アクセス日'
  };

  // プリセット選択
  const handlePresetSelect = useCallback((preset: DatePreset) => {
    const range = preset.getValue();
    onDateRangeChange(range);
    setCustomStart(range.start || '');
    setCustomEnd(range.end || '');
    setShowDropdown(false);
  }, [onDateRangeChange]);

  // カスタム日付範囲適用
  const handleCustomDateApply = useCallback(() => {
    if (customStart || customEnd) {
      const range: DateRange = {
        start: customStart || undefined,
        end: customEnd || undefined,
        field: selectedField
      };
      onDateRangeChange(range);
    } else {
      onDateRangeChange(undefined);
    }
    setShowDropdown(false);
  }, [customStart, customEnd, selectedField, onDateRangeChange]);

  // フィルタクリア
  const handleClear = useCallback(() => {
    onDateRangeChange(undefined);
    setCustomStart('');
    setCustomEnd('');
    setShowDropdown(false);
  }, [onDateRangeChange]);

  // フィールド変更
  const handleFieldChange = useCallback((field: 'createdAt' | 'updatedAt' | 'lastAccessedAt') => {
    setSelectedField(field);
    if (dateRange) {
      onDateRangeChange({
        ...dateRange,
        field
      });
    }
  }, [dateRange, onDateRangeChange]);

  // 現在の日付範囲を表示用フォーマット
  const formatDateRange = useCallback((range?: DateRange): string => {
    if (!range) return '日付範囲を選択';
    
    const fieldLabel = fieldLabels[range.field];
    
    if (range.start && range.end) {
      const start = new Date(range.start).toLocaleDateString('ja-JP');
      const end = new Date(range.end).toLocaleDateString('ja-JP');
      return `${fieldLabel}: ${start} 〜 ${end}`;
    } else if (range.start) {
      const start = new Date(range.start).toLocaleDateString('ja-JP');
      return `${fieldLabel}: ${start} 以降`;
    } else if (range.end) {
      const end = new Date(range.end).toLocaleDateString('ja-JP');
      return `${fieldLabel}: ${end} 以前`;
    }
    
    return `${fieldLabel}でフィルタ`;
  }, [fieldLabels]);

  // 外部クリックでドロップダウンを閉じる
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.date-filter-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showDropdown]);

  // アクティブなプリセットを検出
  const activePreset = useMemo(() => {
    if (!dateRange) return null;
    
    return datePresets.find(preset => {
      const presetRange = preset.getValue();
      return presetRange.start === dateRange.start && 
             presetRange.end === dateRange.end &&
             presetRange.field === dateRange.field;
    });
  }, [dateRange, datePresets]);

  return (
    <div className={`date-filter-container relative ${className}`}>
      {/* メインボタン */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
          dateRange 
            ? 'border-blue-500 bg-blue-50 text-blue-700' 
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span className="text-sm font-medium">
          {formatDateRange(dateRange)}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        {dateRange && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-1 hover:bg-blue-200 rounded-full p-1 transition-colors"
            title="日付フィルタをクリア"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* ドロップダウン */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* フィールド選択 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                フィルタ対象
              </label>
              <div className="flex gap-1">
                {Object.entries(fieldLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleFieldChange(key as any)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedField === key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* プリセット */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                クイック選択
              </label>
              <div className="grid grid-cols-2 gap-2">
                {datePresets.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-2 text-left text-xs rounded border transition-colors ${
                      activePreset?.label === preset.label
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    title={preset.description}
                  >
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-gray-500 text-xs">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* カスタム日付範囲 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                カスタム日付範囲
              </label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">開始日</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">終了日</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2">
              <button
                onClick={handleCustomDateApply}
                className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                適用
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
                title="フィルタをクリア"
              >
                <RotateCcw className="w-3 h-3" />
                クリア
              </button>
            </div>

            {/* 現在の設定表示 */}
            {dateRange && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3" />
                    <span>現在のフィルタ</span>
                  </div>
                  <div className="text-gray-800 font-medium">
                    {formatDateRange(dateRange)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;