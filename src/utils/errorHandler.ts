// エラーハンドリングとユーザー通知ユーティリティ
import { logger } from './logger';

export interface AppError {
  code: string;
  message: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class NotebookError extends Error {
  public code: string;
  public severity: AppError['severity'];
  public details?: string;

  constructor(code: string, message: string, severity: AppError['severity'] = 'medium', details?: string) {
    super(message);
    this.name = 'NotebookError';
    this.code = code;
    this.severity = severity;
    if (details) {
      this.details = details;
    }
  }
}

// エラーコード定数
export const ERROR_CODES = {
  STORAGE_FULL: 'STORAGE_FULL',
  STORAGE_ERROR: 'STORAGE_ERROR',
  IMPORT_INVALID_FORMAT: 'IMPORT_INVALID_FORMAT',
  IMPORT_FAILED: 'IMPORT_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  IMAGE_UPLOAD_FAILED: 'IMAGE_UPLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// エラーメッセージのマッピング
const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.STORAGE_FULL]: 'ストレージの容量が不足しています。データを削除してから再試行してください。',
  [ERROR_CODES.STORAGE_ERROR]: 'データの保存に失敗しました。ブラウザの設定を確認してください。',
  [ERROR_CODES.IMPORT_INVALID_FORMAT]: 'インポートファイルの形式が正しくありません。',
  [ERROR_CODES.IMPORT_FAILED]: 'データのインポートに失敗しました。',
  [ERROR_CODES.EXPORT_FAILED]: 'データのエクスポートに失敗しました。',
  [ERROR_CODES.FILE_TOO_LARGE]: 'ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。',
  [ERROR_CODES.IMAGE_UPLOAD_FAILED]: '画像のアップロードに失敗しました。',
  [ERROR_CODES.NETWORK_ERROR]: 'ネットワークエラーが発生しました。接続を確認してください。',
  [ERROR_CODES.UNKNOWN_ERROR]: '予期しないエラーが発生しました。'
};

// エラーハンドラー関数
export const handleError = (error: unknown, context?: string): AppError => {
  let appError: AppError;

  if (error instanceof NotebookError) {
    appError = {
      code: error.code,
      message: error.message,
      severity: error.severity
    };
    if (error.details) {
      appError.details = error.details;
    }
  } else if (error instanceof Error) {
    // 既知のエラーパターンを検出
    if (error.message.includes('quota') || error.message.includes('storage')) {
      appError = {
        code: ERROR_CODES.STORAGE_FULL,
        message: ERROR_MESSAGES[ERROR_CODES.STORAGE_FULL]!,
        details: error.message,
        severity: 'high'
      };
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      appError = {
        code: ERROR_CODES.NETWORK_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR]!,
        details: error.message,
        severity: 'medium'
      };
    } else {
      appError = {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]!,
        details: error.message,
        severity: 'medium'
      };
    }
  } else {
    appError = {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]!,
      details: String(error),
      severity: 'low'
    };
  }

  // ログに記録
  const logMessage = `[${appError.code}] ${appError.message}`;
  const logDetails = {
    context,
    details: appError.details,
    severity: appError.severity
  };

  switch (appError.severity) {
    case 'critical':
    case 'high':
      logger.error(logMessage, logDetails);
      break;
    case 'medium':
      logger.warn(logMessage, logDetails);
      break;
    case 'low':
      logger.info(logMessage, logDetails);
      break;
  }

  return appError;
};

// ユーザー向けエラーメッセージの生成
export const getUserFriendlyMessage = (error: AppError): string => {
  return ERROR_MESSAGES[error.code] || error.message;
};

// 画像アップロード用のエラーハンドリング
export const validateImageFile = (file: File): void => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (file.size > maxSize) {
    throw new NotebookError(
      ERROR_CODES.FILE_TOO_LARGE,
      ERROR_MESSAGES[ERROR_CODES.FILE_TOO_LARGE]!,
      'medium',
      `File size: ${file.size} bytes`
    );
  }

  if (!allowedTypes.includes(file.type)) {
    throw new NotebookError(
      ERROR_CODES.IMAGE_UPLOAD_FAILED,
      '対応していない画像形式です。JPEG, PNG, GIF, WebP形式のファイルを選択してください。',
      'medium',
      `File type: ${file.type}`
    );
  }
};

// ローカルストレージ用のエラーハンドリング
export const handleStorageError = (operation: string, error: unknown): AppError => {
  const appError = handleError(error, `localStorage ${operation}`);
  
  // ストレージエラーの場合は追加の提案を含める
  if (appError.code === ERROR_CODES.STORAGE_FULL) {
    appError.message += ' ブラウザの閲覧履歴やキャッシュを削除することで解決する場合があります。';
  }

  return appError;
};