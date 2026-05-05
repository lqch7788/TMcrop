/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// JWT 密钥（生产环境应从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'yuanxingtu-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// JWT Payload 类型
export interface JwtPayload {
  userId: string;
  aid: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * 生成 JWT token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

/**
 * 验证 JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * 认证中间件
 * 验证请求头中的 Bearer token
 * 验证失败返回 401 Unauthorized
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  // 检查格式：Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: '认证令牌格式无效' });
    return;
  }

  const token = parts[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: '认证令牌无效或已过期' });
    return;
  }

  // 将用户信息附加到请求对象
  req.user = payload;
  next();
}

/**
 * 可选认证中间件
 * 如果请求中包含有效token，则解析用户信息；否则继续
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next();
    return;
  }

  const token = parts[1];
  const payload = verifyToken(token);

  if (payload) {
    req.user = payload;
  }

  next();
}

export default authenticate;
