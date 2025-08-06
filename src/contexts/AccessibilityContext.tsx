import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface AccessibilitySettings {
  highContrast: boolean;
  reduceMotion: boolean;
  increasedFontSize: boolean;
  colorBlindFriendly: boolean;
  focusIndicator: 'default' | 'enhanced' | 'high-contrast';
  colorBlindnessType: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  resetToDefaults: () => void;
  applySystemPreferences: () => void;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reduceMotion: false,
  increasedFontSize: false,
  colorBlindFriendly: false,
  focusIndicator: 'default',
  colorBlindnessType: 'none'
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'notespace-accessibility-settings';

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // 設定をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // 設定を更新
  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // システム設定の検知と適用
  const applySystemPreferences = useCallback(() => {
    const systemPreferences: Partial<AccessibilitySettings> = {};

    // システムの高コントラスト設定を検知
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      systemPreferences.highContrast = true;
    }

    // システムのモーション設定を検知
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      systemPreferences.reduceMotion = true;
    }

    // システムのカラースキーム設定を検知
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      systemPreferences.highContrast = true; // ダークモードでは高コントラストを有効に
    }

    updateSettings(systemPreferences);
  }, [updateSettings]);


  // デフォルトに戻す
  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  // CSS変数とクラスの適用
  useEffect(() => {
    const root = document.documentElement;
    
    // 高コントラストモード
    if (settings.highContrast) {
      root.classList.add('high-contrast');
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-secondary', '#333333');
      root.style.setProperty('--bg-primary', '#FFFFFF');
      root.style.setProperty('--bg-secondary', '#F5F5F5');
      root.style.setProperty('--border-primary', '#000000');
      root.style.setProperty('--focus-ring', '#0066CC');
    } else {
      root.classList.remove('high-contrast');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--bg-primary');
      root.style.removeProperty('--bg-secondary');
      root.style.removeProperty('--border-primary');
      root.style.removeProperty('--focus-ring');
    }

    // モーション設定
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // フォントサイズ設定
    if (settings.increasedFontSize) {
      root.classList.add('large-text');
      root.style.setProperty('--font-size-base', '18px');
      root.style.setProperty('--font-size-sm', '16px');
      root.style.setProperty('--font-size-lg', '22px');
    } else {
      root.classList.remove('large-text');
      root.style.removeProperty('--font-size-base');
      root.style.removeProperty('--font-size-sm');
      root.style.removeProperty('--font-size-lg');
    }

    // カラーブラインド対応
    if (settings.colorBlindFriendly) {
      root.classList.add('colorblind-friendly');
    } else {
      root.classList.remove('colorblind-friendly');
    }

    // フォーカスインジケーター
    root.classList.remove('focus-default', 'focus-enhanced', 'focus-high-contrast');
    root.classList.add(`focus-${settings.focusIndicator}`);

  }, [settings]);

  // システム設定の変更を監視
  useEffect(() => {
    const mediaQueries = [
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-color-scheme: dark)')
    ];

    const handleSystemChange = () => {
      // 自動適用は一度だけ、ユーザーが手動で設定した後は適用しない
      const hasManualSettings = localStorage.getItem(STORAGE_KEY + '-manual');
      if (!hasManualSettings) {
        applySystemPreferences();
      }
    };

    mediaQueries.forEach(mq => {
      mq.addEventListener('change', handleSystemChange);
    });

    return () => {
      mediaQueries.forEach(mq => {
        mq.removeEventListener('change', handleSystemChange);
      });
    };
  }, [applySystemPreferences]);

  // 手動設定の記録
  const updateSettingsWithManualFlag = (newSettings: Partial<AccessibilitySettings>) => {
    updateSettings(newSettings);
    localStorage.setItem(STORAGE_KEY + '-manual', 'true');
  };

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSettings: updateSettingsWithManualFlag,
      resetToDefaults,
      applySystemPreferences
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};