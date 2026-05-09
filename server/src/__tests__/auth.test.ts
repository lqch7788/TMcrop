/**
 * JWT认证测试
 */

import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from '../middleware/auth';

describe('JWT认证中间件', () => {
  const testPayload = {
    userId: 'user-001',
    aid: 'aid-001',
    name: '测试用户',
    role: 'admin'
  };

  describe('generateToken', () => {
    it('应该成功生成token', () => {
      const token = generateToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT格式: header.payload.signature
    });
  });

  describe('verifyToken', () => {
    it('应该成功验证有效token', () => {
      const token = generateToken(testPayload);
      const payload = verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testPayload.userId);
      expect(payload?.aid).toBe(testPayload.aid);
      expect(payload?.name).toBe(testPayload.name);
      expect(payload?.role).toBe(testPayload.role);
    });

    it('应该拒绝无效token', () => {
      const payload = verifyToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('应该拒绝伪造的token', () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsImFpZCI6ImFpZC0wMDEiLCJuYW1lIjoidGVzdCJ9.fake-signature';
      const payload = verifyToken(fakeToken);
      expect(payload).toBeNull();
    });
  });

  describe('authenticate中间件', () => {
    it('应该拒绝没有authorization头的请求', async () => {
      const req = { headers: {} } as any;
      const res = {
        status: function(code: number) {
          expect(code).toBe(401);
          return this;
        },
        json: function(data: any) {
          expect(data.error).toBe('未提供认证令牌');
        }
      };
      const next = () => {};

      const { authenticate } = await import('../middleware/auth');
      authenticate(req, res as any, next);
    });

    it('应该拒绝格式错误的authorization头', async () => {
      const req = { headers: { authorization: 'InvalidFormat token' } } as any;
      const res = {
        status: function(code: number) {
          expect(code).toBe(401);
          return this;
        },
        json: function(data: any) {
          expect(data.error).toBe('认证令牌格式无效');
        }
      };
      const next = () => {};

      const { authenticate } = await import('../middleware/auth');
      authenticate(req, res as any, next);
    });
  });
});
