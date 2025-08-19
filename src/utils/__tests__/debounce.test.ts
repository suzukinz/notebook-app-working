import { debounce, throttle, debounceAsync } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce function calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    // Call multiple times
    debouncedFn('test1');
    debouncedFn('test2');
    debouncedFn('test3');

    // Function should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    // Function should be called once with the last arguments
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('test3');
  });

  it('should handle immediate execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000, true);

    debouncedFn('test');

    // Function should be called immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should flush pending execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('test');

    // Function should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Flush the debounced function
    debouncedFn.flush();

    // Function should be called immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should cancel pending execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('test');

    // Cancel the debounced function
    debouncedFn.cancel();

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    // Function should not be called
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should reset timer on subsequent calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('test1');
    
    // Advance time but not enough to trigger
    jest.advanceTimersByTime(500);
    
    debouncedFn('test2');
    
    // Advance time but still not enough to trigger
    jest.advanceTimersByTime(500);
    
    // Function should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();
    
    // Advance remaining time
    jest.advanceTimersByTime(500);
    
    // Function should be called with the last arguments
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('test2');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should throttle function calls', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 1000);

    // First call should execute immediately
    throttledFn('test1');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('test1');

    // Subsequent calls should be ignored until limit is over
    throttledFn('test2');
    throttledFn('test3');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    // Next call should execute
    throttledFn('test4');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('test4');
  });
});

describe('debounceAsync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce async function calls', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('result');
    const debouncedAsyncFn = debounceAsync(mockAsyncFn, 1000);

    const promise1 = debouncedAsyncFn('test1');
    const promise2 = debouncedAsyncFn('test2');
    const promise3 = debouncedAsyncFn('test3');

    // Function should not have been called yet
    expect(mockAsyncFn).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    // Wait for all promises to resolve
    const results = await Promise.all([promise1, promise2, promise3]);

    // Function should be called once with the last arguments
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    expect(mockAsyncFn).toHaveBeenCalledWith('test3');

    // All promises should resolve to the same result
    expect(results).toEqual(['result', 'result', 'result']);
  });

  it('should handle async function errors', async () => {
    const mockAsyncFn = jest.fn().mockRejectedValue(new Error('test error'));
    const debouncedAsyncFn = debounceAsync(mockAsyncFn, 1000);

    const promise = debouncedAsyncFn('test');

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    // Promise should reject
    await expect(promise).rejects.toThrow('test error');
  });
});