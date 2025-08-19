import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'バリデーションエラー',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err.message === 'DUPLICATE_EMAIL') {
    res.status(409).json({
      error: 'このメールアドレスは既に登録されています',
    });
    return;
  }

  if (err.message === 'INVALID_CREDENTIALS') {
    res.status(401).json({
      error: 'メールアドレスまたはパスワードが正しくありません',
    });
    return;
  }

  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};