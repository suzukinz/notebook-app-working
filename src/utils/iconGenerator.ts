// アイコン生成ユーティリティ
// ブラウザ上でSVGからPNGアイコンを生成する

export interface IconSize {
  width: number;
  height: number;
  name: string;
}

export const ICON_SIZES: IconSize[] = [
  { width: 16, height: 16, name: 'favicon-16x16.png' },
  { width: 32, height: 32, name: 'favicon-32x32.png' },
  { width: 48, height: 48, name: 'favicon-48x48.png' },
  { width: 72, height: 72, name: 'icon-72x72.png' },
  { width: 96, height: 96, name: 'icon-96x96.png' },
  { width: 128, height: 128, name: 'icon-128x128.png' },
  { width: 144, height: 144, name: 'icon-144x144.png' },
  { width: 152, height: 152, name: 'icon-152x152.png' },
  { width: 192, height: 192, name: 'icon-192x192.png' },
  { width: 384, height: 384, name: 'icon-384x384.png' },
  { width: 512, height: 512, name: 'icon-512x512.png' },
];

// NoteSpaceのSVGアイコンデザイン
export const NOTESPACE_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="paper-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="4" stdDeviation="8" flood-color="#1e40af" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background circle -->
  <circle cx="256" cy="256" r="240" fill="url(#bg-gradient)" filter="url(#shadow)"/>
  
  <!-- Main notebook/folder icon -->
  <g transform="translate(256,256)">
    <!-- Back folder -->
    <path d="M-80,-60 L60,-60 L80,-40 L80,20 L-80,20 Z" 
          fill="#1e40af" opacity="0.7" transform="translate(20,20) scale(0.9)"/>
    
    <!-- Middle folder -->
    <path d="M-80,-60 L60,-60 L80,-40 L80,20 L-80,20 Z" 
          fill="#3b82f6" opacity="0.8" transform="translate(10,10) scale(0.95)"/>
    
    <!-- Front notebook -->
    <rect x="-90" y="-70" width="180" height="140" rx="8" 
          fill="url(#paper-gradient)" stroke="#e2e8f0" stroke-width="2"/>
    
    <!-- Notebook rings -->
    <circle cx="-60" cy="-50" r="4" fill="#6366f1"/>
    <circle cx="-60" cy="-25" r="4" fill="#6366f1"/>
    <circle cx="-60" cy="0" r="4" fill="#6366f1"/>
    <circle cx="-60" cy="25" r="4" fill="#6366f1"/>
    <circle cx="-60" cy="50" r="4" fill="#6366f1"/>
    
    <!-- Text lines -->
    <rect x="-40" y="-45" width="100" height="3" rx="1.5" fill="#94a3b8"/>
    <rect x="-40" y="-30" width="80" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="-40" y="-15" width="90" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="-40" y="0" width="70" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="-40" y="15" width="85" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="-40" y="30" width="75" height="3" rx="1.5" fill="#cbd5e1"/>
    
    <!-- Mind map connection nodes -->
    <circle cx="70" cy="-40" r="6" fill="#10b981" opacity="0.9"/>
    <circle cx="70" cy="0" r="6" fill="#f59e0b" opacity="0.9"/>
    <circle cx="70" cy="40" r="6" fill="#ef4444" opacity="0.9"/>
    
    <!-- Connection lines -->
    <path d="M50,-40 Q60,-40 70,-40" stroke="#10b981" stroke-width="2" fill="none" opacity="0.7"/>
    <path d="M50,0 Q60,0 70,0" stroke="#f59e0b" stroke-width="2" fill="none" opacity="0.7"/>
    <path d="M50,40 Q60,40 70,40" stroke="#ef4444" stroke-width="2" fill="none" opacity="0.7"/>
    
    <!-- Small highlight -->
    <ellipse cx="-40" cy="-45" rx="25" ry="8" fill="#ffffff" opacity="0.3"/>
  </g>
</svg>
`;

// SVGからPNGを生成する関数
export const generateIconFromSVG = async (
  svgString: string, 
  width: number, 
  height: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const img = new Image();
    
    img.onload = () => {
      // 高品質レンダリングの設定
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 背景を透明に設定
      ctx.clearRect(0, 0, width, height);
      
      // SVG画像を描画
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate blob'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load SVG image'));
    };
    
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  });
};

// 全サイズのアイコンを生成する関数
export const generateAllIcons = async (): Promise<Map<string, Blob>> => {
  const iconMap = new Map<string, Blob>();
  
  for (const size of ICON_SIZES) {
    try {
      const blob = await generateIconFromSVG(NOTESPACE_SVG, size.width, size.height);
      iconMap.set(size.name, blob);
    } catch (error) {
      console.error(`Failed to generate ${size.name}:`, error);
    }
  }
  
  return iconMap;
};

// アイコンをダウンロードする関数
export const downloadIcon = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 全アイコンをZIPでダウンロードする関数（簡易版）
export const downloadAllIcons = async (): Promise<void> => {
  const icons = await generateAllIcons();
  
  // 個別にダウンロード（実際のアプリではZIP化が望ましい）
  for (const [filename, blob] of icons.entries()) {
    await new Promise(resolve => setTimeout(resolve, 100)); // 少し間隔を開ける
    downloadIcon(blob, filename);
  }
};

// Favicon用ICOファイル生成（簡易版：複数サイズのPNGを含む）
export const generateFavicon = async (): Promise<Blob> => {
  // 32x32のPNGを生成（シンプルなfavicon）
  return await generateIconFromSVG(NOTESPACE_SVG, 32, 32);
};

// Apple Touch Icon (180x180) 生成
export const generateAppleTouchIcon = async (): Promise<Blob> => {
  const appleSVG = NOTESPACE_SVG.replace(
    'r="240"', 
    'r="220"' // Appleの推奨マージンに合わせて少し小さくする
  );
  return await generateIconFromSVG(appleSVG, 180, 180);
};