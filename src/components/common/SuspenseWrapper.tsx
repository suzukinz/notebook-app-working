import React, { Suspense, ReactNode } from 'react';
import type { ComponentType } from 'react';

import ErrorBoundary from './ErrorBoundary';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

/**
 * Loading Spinner Component
 * Provides visual feedback while lazy components are loading
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message = '読み込み中...',
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50'
    : 'flex items-center justify-center p-4';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-3">
        <div className={`${sizeClasses[size]} animate-spin`}>
          <svg
            className="w-full h-full text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        {message && (
          <p className="text-sm text-gray-600 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for more sophisticated loading states
 */
const SkeletonLoader: React.FC<{ 
  lines?: number; 
  height?: string;
  className?: string 
}> = ({ 
  lines = 3, 
  height = 'h-4',
  className = '' 
}) => (
  <div className={`animate-pulse space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className={`bg-gray-200 rounded ${height} ${
          index === lines - 1 ? 'w-3/4' : 'w-full'
        }`}
      />
    ))}
  </div>
);

/**
 * Loading fallbacks for different component types
 */
export const LoadingFallbacks = {
  // For editor components
  editor: (
    <div className="w-full h-96 border rounded-lg">
      <div className="border-b p-3">
        <SkeletonLoader lines={1} height="h-6" />
      </div>
      <div className="p-4">
        <SkeletonLoader lines={8} />
      </div>
    </div>
  ),

  // For mind map components
  mindMap: (
    <div className="w-full h-96 bg-gray-50 rounded-lg flex items-center justify-center">
      <LoadingSpinner 
        size="large" 
        message="マインドマップを読み込み中..." 
      />
    </div>
  ),

  // For modals
  modal: (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 m-4 max-w-md w-full">
        <LoadingSpinner message="コンポーネントを読み込み中..." />
      </div>
    </div>
  ),

  // For settings panels
  settings: (
    <div className="w-full space-y-6">
      <SkeletonLoader lines={2} height="h-6" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonLoader lines={1} height="h-4" />
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  ),

  // Generic fallback
  generic: <LoadingSpinner />
};

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Comprehensive Suspense Wrapper with Error Boundary
 * Provides loading states and error handling for lazy components
 */
export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  children,
  fallback = <LoadingSpinner />,
  errorFallback,
  onError
}) => (
  <ErrorBoundary 
    fallback={errorFallback} 
    {...(onError && { onError })}
  >
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

/**
 * HOC for wrapping components with Suspense and Error Boundary
 */
export const withSuspense = <P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode,
  errorFallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <SuspenseWrapper fallback={fallback} errorFallback={errorFallback}>
      <Component {...props} />
    </SuspenseWrapper>
  );

  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

/**
 * Hook for managing loading states
 */
export const useLoadingState = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const startLoading = () => {
    setIsLoading(true);
    setError(null);
  };

  const stopLoading = () => {
    setIsLoading(false);
  };

  const setLoadingError = (error: Error) => {
    setError(error);
    setIsLoading(false);
  };

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError
  };
};

export { LoadingSpinner, SkeletonLoader };
export default SuspenseWrapper;