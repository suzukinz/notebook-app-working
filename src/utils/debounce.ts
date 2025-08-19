// Enhanced debounce with flush capability
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  flush(): void;
  cancel(): void;
}

// Debounce utility functions
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const later = () => {
    timeout = null;
    if (!immediate && lastArgs) {
      func(...lastArgs);
      lastArgs = null;
    }
  };

  const executedFunction = function(...args: Parameters<T>) {
    lastArgs = args;
    const callNow = immediate && !timeout;

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  } as DebouncedFunction<T>;

  // Flush function: execute immediately if pending
  executedFunction.flush = function() {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
      if (!immediate && lastArgs) {
        func(...lastArgs);
        lastArgs = null;
      }
    }
  };

  // Cancel function: clear timeout and pending args
  executedFunction.cancel = function() {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
      lastArgs = null;
    }
  };

  return executedFunction;
}

// Throttle utility function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Debounced async function utility
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let resolveRef: ((value: ReturnType<T>) => void) | null = null;
  let rejectRef: ((reason?: any) => void) | null = null;

  return function executedFunction(...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      const later = async () => {
        timeout = null;
        try {
          const result = await func(...args);
          resolveRef?.(result);
        } catch (error) {
          rejectRef?.(error);
        }
      };

      if (timeout !== null) {
        clearTimeout(timeout);
      }

      resolveRef = resolve;
      rejectRef = reject;
      timeout = setTimeout(later, wait);
    });
  };
}