import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { registerSchema, loginSchema, refreshTokenSchema, AuthResponse } from '../types/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('DUPLICATE_EMAIL');
    }

    const passwordHash = await hashPassword(data.password);
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const response: AuthResponse = {
      user,
      tokens: { accessToken, refreshToken },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await verifyPassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;
    
    const response: AuthResponse = {
      user: userWithoutPassword,
      tokens: { accessToken, refreshToken },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: data.refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: '無効なリフレッシュトークンです' });
    }

    try {
      const payload = verifyRefreshToken(data.refreshToken);
      
      const accessToken = generateAccessToken({
        userId: payload.userId,
        email: payload.email,
      });

      res.json({ accessToken });
    } catch {
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      return res.status(401).json({ error: '無効なリフレッシュトークンです' });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && req.userId) {
      await prisma.refreshToken.deleteMany({
        where: { userId: req.userId },
      });
    }
    
    res.json({ message: 'ログアウトしました' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;