// カラーアクセシビリティユーティリティ

export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  luminance: number;
}

export interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'A' | 'FAIL';
  isAccessible: boolean;
}

// HEXからRGBに変換
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  // #を除去
  hex = hex.replace(/^#/, '');
  
  // 3桁の短縮形を6桁に展開
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // 6桁の形式をチェック
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16)
  } : null;
};

// RGBからHEXに変換
export const rgbToHex = (r: number, g: number, b: number): string => {
  // 小数値を整数に変換し、0-255の範囲にクランプ
  r = Math.round(Math.max(0, Math.min(255, r)));
  g = Math.round(Math.max(0, Math.min(255, g)));
  b = Math.round(Math.max(0, Math.min(255, b)));
  
  // 各成分を16進数に変換し、2桁にパディング
  const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  return '#' + hex.toUpperCase();
};

// 相対輝度を計算
export const getLuminance = (r: number, g: number, b: number): number => {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLin = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLin = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLin = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
};

// コントラスト比を計算
export const getContrastRatio = (color1: string, color2: string): ContrastResult => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return { ratio: 1, level: 'FAIL', isAccessible: false };
  }

  const luminance1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const luminance2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  const ratio = (lighter + 0.05) / (darker + 0.05);

  let level: 'AAA' | 'AA' | 'A' | 'FAIL';
  let isAccessible: boolean;

  if (ratio >= 7) {
    level = 'AAA';
    isAccessible = true;
  } else if (ratio >= 4.5) {
    level = 'AA';
    isAccessible = true;
  } else if (ratio >= 3) {
    level = 'A';
    isAccessible = false; // WCAGの最低基準を満たさない
  } else {
    level = 'FAIL';
    isAccessible = false;
  }

  return { ratio, level, isAccessible };
};

// カラーブラインド対応の色パレット
export const colorBlindFriendlyPalette = {
  // 基本色（カラーブラインドに配慮）
  primary: {
    blue: '#0072CE',      // 明るい青
    orange: '#E69F00',    // オレンジ
    green: '#009E73',     // 青みがかった緑
    yellow: '#F0E442',    // 黄色
    purple: '#CC79A7',    // 薄いピンク
    red: '#D55E00',       // 朱色
    black: '#000000',     // 黒
    gray: '#999999'       // グレー
  },
  // ダークモード対応色
  dark: {
    blue: '#4A9EFF',
    orange: '#FF9F33',
    green: '#00C896',
    yellow: '#FFE066',
    purple: '#E6A3CC',
    red: '#FF6B33',
    white: '#FFFFFF',
    gray: '#CCCCCC'
  }
};

// 色の明度を調整
export const adjustBrightness = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const adjust = (value: number) => Math.max(0, Math.min(255, value + amount));

  return rgbToHex(
    adjust(rgb.r),
    adjust(rgb.g),
    adjust(rgb.b)
  );
};

// 高コントラストバージョンの色を生成
export const generateHighContrastColor = (backgroundColor: string, preferDark = true): string => {
  const bgRgb = hexToRgb(backgroundColor);
  if (!bgRgb) return preferDark ? '#000000' : '#FFFFFF';

  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // 背景が明るい場合は暗い色、暗い場合は明るい色を返す
  if (bgLuminance > 0.5) {
    return '#000000'; // 黒
  } else {
    return '#FFFFFF'; // 白
  }
};

// WCAGガイドラインに準拠した色の組み合わせを検証
export const validateColorCombination = (
  foreground: string, 
  background: string, 
  fontSize: number = 16,
  isBold: boolean = false
): { isValid: boolean; suggestions: string[] } => {
  const contrast = getContrastRatio(foreground, background);
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold);
  
  const requiredRatio = isLargeText ? 3 : 4.5; // WCAG AA基準
  const suggestions: string[] = [];

  if (contrast.ratio < requiredRatio) {
    suggestions.push(`コントラスト比が不足しています（現在: ${contrast.ratio.toFixed(2)}、必要: ${requiredRatio}）`);
    
    if (contrast.ratio < 3) {
      suggestions.push('より明るいまたは暗い色に変更してください');
    }
    
    if (isLargeText) {
      suggestions.push('大きなテキストですが、さらにコントラストを高めることをお勧めします');
    } else {
      suggestions.push('通常のテキストサイズには、より高いコントラストが必要です');
    }
  }

  return {
    isValid: contrast.isAccessible && contrast.ratio >= requiredRatio,
    suggestions
  };
};

// 色覚異常シミュレーション
export const simulateColorBlindness = (hex: string, type: 'protanopia' | 'deuteranopia' | 'tritanopia'): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  let { r, g, b } = rgb;
  r /= 255;
  g /= 255;
  b /= 255;

  // 簡易的な色覚異常シミュレーション
  switch (type) {
    case 'protanopia': // 1型色覚（赤色弱）
      r = 0.567 * r + 0.433 * g;
      g = 0.558 * r + 0.442 * g;
      b = 0.242 * g + 0.758 * b;
      break;
    case 'deuteranopia': // 2型色覚（緑色弱）
      r = 0.625 * r + 0.375 * g;
      g = 0.7 * r + 0.3 * g;
      b = 0.3 * g + 0.7 * b;
      break;
    case 'tritanopia': // 3型色覚（青色弱）
      r = 0.95 * r + 0.05 * g;
      g = 0.433 * g + 0.567 * b;
      b = 0.475 * g + 0.525 * b;
      break;
  }

  return rgbToHex(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  );
};

// HEXカラーの有効性を検証
export const isValidHexColor = (hex: string): boolean => {
  const cleanHex = hex.replace(/^#/, '');
  return /^([a-f\d]{3}|[a-f\d]{6})$/i.test(cleanHex);
};

// 背景色に対して適切なコントラストの色を返す
export const getContrastColor = (backgroundColor: string): string => {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  
  // 明度が0.5以上の場合は黒、それ以下の場合は白を返す
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// 色のバリエーションを生成
export const generateColorVariants = (baseColor: string): {
  lighter: string;
  darker: string;
  muted: string;
  bright: string;
} => {
  const rgb = hexToRgb(baseColor);
  
  // 無効な色の場合はデフォルト値を返す
  if (!rgb) {
    return {
      lighter: '#FFFFFF',
      darker: '#000000',
      muted: '#808080',
      bright: '#FF0000'
    };
  }

  const { r, g, b } = rgb;

  // より明るい色 (20%明度アップ)
  const lighter = rgbToHex(
    Math.min(255, Math.round(r + (255 - r) * 0.2)),
    Math.min(255, Math.round(g + (255 - g) * 0.2)),
    Math.min(255, Math.round(b + (255 - b) * 0.2))
  );

  // より暗い色 (20%明度ダウン)
  const darker = rgbToHex(
    Math.max(0, Math.round(r * 0.8)),
    Math.max(0, Math.round(g * 0.8)),
    Math.max(0, Math.round(b * 0.8))
  );

  // くすんだ色 (彩度を下げる)
  const grayValue = Math.round((r + g + b) / 3);
  const muted = rgbToHex(
    Math.round((r + grayValue) / 2),
    Math.round((g + grayValue) / 2),
    Math.round((b + grayValue) / 2)
  );

  // 鮮やかな色 (彩度を上げる)
  const maxComponent = Math.max(r, g, b);
  const bright = rgbToHex(
    Math.min(255, Math.round(r * (255 / maxComponent) * 0.9)),
    Math.min(255, Math.round(g * (255 / maxComponent) * 0.9)),
    Math.min(255, Math.round(b * (255 / maxComponent) * 0.9))
  );

  return {
    lighter,
    darker,
    muted,
    bright
  };
};