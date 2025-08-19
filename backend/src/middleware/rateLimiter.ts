import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'リクエスト数が上限に達しました。しばらくしてから再度お試しください。',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: '認証試行回数が上限に達しました。15分後に再度お試しください。',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});