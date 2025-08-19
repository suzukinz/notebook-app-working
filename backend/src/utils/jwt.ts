import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export const generateAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  };
  return jwt.sign(payload, JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};