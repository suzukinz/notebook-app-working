import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  displayName: z.string().min(1, '表示名を入力してください').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'リフレッシュトークンが必要です'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  tokens: AuthTokens;
}