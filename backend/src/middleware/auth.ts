import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'ユーザーが見つかりません' });
      return;
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'トークンの有効期限が切れています' });
      return;
    }
    res.status(401).json({ error: '無効なトークンです' });
  }
};