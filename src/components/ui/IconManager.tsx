import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { 
  downloadAllIcons, 
  generateFavicon,
  generateAppleTouchIcon,
  downloadIcon,
  NOTESPACE_SVG,
  ICON_SIZES
} from '../../utils/iconGenerator';
import Modal from './Modal';

interface IconManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const IconManager: React.FC<IconManagerProps> = ({ isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewIcons, setPreviewIcons] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState(0);

  // プレビューアイコンを生成
  const generatePreviews = useCallback(async () => {
    setIsGenerating(true);
    setProgress(0);
    
    const previewMap = new Map<string, string>();
    const previewSizes = [
      { width: 16, height: 16, name: '16x16' },
      { width: 32, height: 32, name: '32x32' },
      { width: 48, height: 48, name: '48x48' },
      { width: 72, height: 72, name: '72x72' },
      { width: 96, height: 96, name: '96x96' },
      { width: 128, height: 128, name: '128x128' },
      { width: 192, height: 192, name: '192x192' },
      { width: 512, height: 512, name: '512x512' },
    ];

    for (let i = 0; i < previewSizes.length; i++) {
      const size = previewSizes[i];
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = size.width;
          canvas.height = size.height;

          const img = document.createElement('img');
          await new Promise((resolve, reject) => {
            img.onload = () => {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.clearRect(0, 0, size.width, size.height);
              ctx.drawImage(img, 0, 0, size.width, size.height);
              
              const dataUrl = canvas.toDataURL('image/png');
              previewMap.set(size.name, dataUrl);
              resolve(dataUrl);
            };
            img.onerror = reject;
            
            const svgBlob = new Blob([NOTESPACE_SVG], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            img.src = url;
          });
        }
        
        setProgress(((i + 1) / previewSizes.length) * 100);
      } catch (error) {
        console.error(`Failed to generate preview for ${size.name}:`, error);
      }
    }

    setPreviewIcons(previewMap);
    setIsGenerating(false);
    setProgress(0);
  }, []);

  // コンポーネントマウント時にプレビュー生成
  useEffect(() => {
    if (isOpen && previewIcons.size === 0) {
      generatePreviews();
    }
  }, [isOpen, previewIcons.size, generatePreviews]);

  // 個別アイコンのダウンロード
  const handleDownloadSingle = async (width: number, height: number, name: string) => {
    try {
      setIsGenerating(true);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      canvas.width = width;
      canvas.height = height;

      const img = document.createElement('img');
      await new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              downloadIcon(blob, name);
              resolve(blob);
            } else {
              reject(new Error('Failed to generate blob'));
            }
          }, 'image/png');
        };
        img.onerror = reject;
        
        const svgBlob = new Blob([NOTESPACE_SVG], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        img.src = url;
      });
    } catch (error) {
      console.error('Failed to download icon:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 全アイコンのダウンロード
  const handleDownloadAll = async () => {
    try {
      setIsGenerating(true);
      await downloadAllIcons();
    } catch (error) {
      console.error('Failed to download all icons:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 特別なアイコンのダウンロード
  const handleDownloadFavicon = async () => {
    try {
      setIsGenerating(true);
      const blob = await generateFavicon();
      downloadIcon(blob, 'favicon.png');
    } catch (error) {
      console.error('Failed to download favicon:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAppleIcon = async () => {
    try {
      setIsGenerating(true);
      const blob = await generateAppleTouchIcon();
      downloadIcon(blob, 'apple-touch-icon.png');
    } catch (error) {
      console.error('Failed to download Apple touch icon:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎨 アプリアイコン管理" size="xl">
      <div className="space-y-6">
        {/* SVGプレビュー */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SVG デザインプレビュー</h3>
          <div className="flex items-center justify-center">
            <div 
              className="w-32 h-32"
              dangerouslySetInnerHTML={{ __html: NOTESPACE_SVG }}
            />
          </div>
          <p className="text-sm text-gray-600 text-center mt-2">
            NoteSpace のカスタムデザイン - ノートブック、フォルダ、マインドマップを表現
          </p>
        </div>

        {/* 生成進捗 */}
        {isGenerating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="animate-spin text-blue-600" size={20} />
              <div className="flex-1">
                <p className="text-blue-800 font-medium">アイコンを生成中...</p>
                {progress > 0 && (
                  <div className="mt-2">
                    <div className="bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">{Math.round(progress)}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* クイックダウンロード */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 クイックダウンロード</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleDownloadFavicon}
              disabled={isGenerating}
              className="flex items-center justify-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Monitor size={20} className="text-blue-600" />
              <span>Favicon (32x32)</span>
            </button>
            
            <button
              onClick={handleDownloadAppleIcon}
              disabled={isGenerating}
              className="flex items-center justify-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Smartphone size={20} className="text-gray-700" />
              <span>Apple Touch (180x180)</span>
            </button>
            
            <button
              onClick={handleDownloadAll}
              disabled={isGenerating}
              className="flex items-center justify-center space-x-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={20} />
              <span>全サイズ</span>
            </button>
          </div>
        </div>

        {/* プレビューグリッド */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 サイズプレビュー</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from(previewIcons.entries()).map(([sizeName, dataUrl]) => {
              const [width, height] = sizeName.split('x').map(Number);
              const iconSize = ICON_SIZES.find(size => size.width === width && size.height === height);
              
              return (
                <div key={sizeName} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2" style={{ height: '80px' }}>
                    <img 
                      src={dataUrl} 
                      alt={`Icon ${sizeName}`}
                      className="max-w-full max-h-full"
                      style={{ 
                        width: `${Math.min(width, 64)}px`, 
                        height: `${Math.min(height, 64)}px`,
                        imageRendering: width <= 32 ? 'pixelated' : 'auto'
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{sizeName}</p>
                  <p className="text-xs text-gray-500 mb-2">{width}×{height}</p>
                  <button
                    onClick={() => iconSize && handleDownloadSingle(width, height, iconSize.name)}
                    disabled={isGenerating}
                    className="flex items-center justify-center space-x-1 w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download size={12} />
                    <span>DL</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 使用方法 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">💡 使用方法</h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p><strong>1. PWA用:</strong> 192x192 と 512x512 を public/ フォルダに配置</p>
            <p><strong>2. Favicon用:</strong> favicon.png を favicon.ico に変換して配置</p>
            <p><strong>3. iOS用:</strong> apple-touch-icon.png を public/ フォルダに配置</p>
            <p><strong>4. Android用:</strong> 各種サイズを manifest.json で指定</p>
          </div>
        </div>

        {/* 閉じるボタン */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default IconManager;