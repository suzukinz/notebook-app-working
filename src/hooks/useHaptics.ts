import { useCallback } from 'react';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const hapticPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 50,
  success: [100, 50, 100],
  error: [200, 100, 200, 100, 200],
  warning: [100, 50, 50, 50, 100]
};

export const useHaptics = () => {
  const vibrate = useCallback((pattern: HapticPattern | number | number[]) => {
    if (!navigator.vibrate) {
      return false;
    }

    try {
      if (typeof pattern === 'string') {
        navigator.vibrate(hapticPatterns[pattern]);
      } else {
        navigator.vibrate(pattern);
      }
      return true;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  }, []);

  const tapFeedback = useCallback(() => vibrate('light'), [vibrate]);
  const successFeedback = useCallback(() => vibrate('success'), [vibrate]);
  const errorFeedback = useCallback(() => vibrate('error'), [vibrate]);
  const selectionFeedback = useCallback(() => vibrate('medium'), [vibrate]);

  return {
    vibrate,
    tapFeedback,
    successFeedback,
    errorFeedback,
    selectionFeedback
  };
};

export default useHaptics;