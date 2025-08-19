import React from 'react';
import type { ReactNode } from 'react';

import { handleError, getUserFriendlyMessage } from '../../utils/errorHandler';
import { safeReload } from '../../utils/safeReload';
import { logger } from '../../utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * React Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state to show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Handle the error
    handleError(error, 'React Error Boundary');
    
    logger.error('React Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    });

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReload = (): void => {
    safeReload();
  };

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const { error } = this.state;
      const appError = error ? handleError(error, 'Error Boundary Render') : null;

      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            
            <h2 className="error-boundary__title">申し訳ございません</h2>
            <p className="error-boundary__message">
              {appError 
                ? getUserFriendlyMessage(appError)
                : 'アプリケーションで予期しないエラーが発生しました。'
              }
            </p>

            <div className="error-boundary__details">
              {process.env.NODE_ENV === 'development' && error && (
                <details className="error-boundary__error-details">
                  <summary>技術的な詳細 (開発環境のみ)</summary>
                  <pre className="error-boundary__error-stack">
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="error-boundary__actions">
              <button
                onClick={this.handleRetry}
                className="error-boundary__button error-boundary__button--primary"
              >
                再試行
              </button>
              <button
                onClick={this.handleReload}
                className="error-boundary__button error-boundary__button--secondary"
              >
                ページを再読み込み
              </button>
            </div>

            <div className="error-boundary__help">
              <p>問題が解決しない場合:</p>
              <ul>
                <li>ブラウザを再起動してください</li>
                <li>ブラウザのキャッシュをクリアしてください</li>
                <li>別のブラウザでお試しください</li>
              </ul>
            </div>
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 2rem;
              background-color: #f8fafc;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .error-boundary__container {
              max-width: 500px;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              text-align: center;
            }

            .error-boundary__icon {
              color: #ef4444;
              margin-bottom: 1rem;
            }

            .error-boundary__title {
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 1rem;
              color: #1f2937;
            }

            .error-boundary__message {
              font-size: 1rem;
              color: #6b7280;
              margin-bottom: 1.5rem;
              line-height: 1.6;
            }

            .error-boundary__details {
              margin-bottom: 2rem;
            }

            .error-boundary__error-details {
              text-align: left;
              background-color: #f3f4f6;
              border-radius: 4px;
              padding: 1rem;
              margin-top: 1rem;
            }

            .error-boundary__error-details summary {
              cursor: pointer;
              font-weight: 500;
              color: #374151;
            }

            .error-boundary__error-stack {
              margin-top: 0.5rem;
              font-size: 0.875rem;
              font-family: 'Courier New', monospace;
              white-space: pre-wrap;
              color: #1f2937;
              background: white;
              padding: 0.5rem;
              border-radius: 4px;
              overflow-x: auto;
            }

            .error-boundary__actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              margin-bottom: 2rem;
            }

            .error-boundary__button {
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
              border: none;
            }

            .error-boundary__button--primary {
              background-color: #3b82f6;
              color: white;
            }

            .error-boundary__button--primary:hover {
              background-color: #2563eb;
            }

            .error-boundary__button--secondary {
              background-color: #f3f4f6;
              color: #374151;
              border: 1px solid #d1d5db;
            }

            .error-boundary__button--secondary:hover {
              background-color: #e5e7eb;
            }

            .error-boundary__help {
              text-align: left;
              background-color: #f9fafb;
              padding: 1rem;
              border-radius: 6px;
              font-size: 0.875rem;
              color: #6b7280;
            }

            .error-boundary__help p {
              margin-bottom: 0.5rem;
              font-weight: 500;
              color: #374151;
            }

            .error-boundary__help ul {
              margin: 0;
              padding-left: 1rem;
            }

            .error-boundary__help li {
              margin-bottom: 0.25rem;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ErrorBoundary;