/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// JWT 密钥配置
// 演示模式（默认）：如果未设置 DEMO_MODE 或 DEMO_MODE != 'false'，则启用演示模式
// 生产模式：设置 DEMO_MODE=false 且必须配置 JWT_SECRET 环境变量
const DEMO_MODE = process.env.DEMO_MODE === 'false' ? false : true; // 默认为演示模式

let JWT_SECRET: string;
if (DEMO_MODE) {
  // 演示模式：使用默认密钥（用于陆启闯等演示账号）
  JWT_SECRET = process.env.JWT_SECRET || 'yuanxingtu-secret-key-2026';
} else {
  // 生产模式：必须设置 JWT_SECRET
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET 环境变量必须设置（非演示模式）');
  }
  JWT_SECRET = process.env.JWT_SECRET;
}
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
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

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
 * 演示模式：陆启闯等演示账号跳过认证
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // 演示模式白名单 - 跳过认证的用户
  const DEMO_USERS = ['陆启闯', 'admin', '演示用户'];

  // 检查是否有 Authorization 头
  if (!authHeader) {
    // 演示模式下，白名单用户可以不带 token 访问
    if (DEMO_MODE) {
      // 为演示用户设置默认信息
      req.user = {
        userId: 'demo_user',
        aid: 'demo_aid',
        name: '陆启闯',
        role: 'admin'
      };
      next();
      return;
    }
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
