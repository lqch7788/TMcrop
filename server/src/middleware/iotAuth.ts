/**
 * IoT设备认证中间件 — 三层防护
 * 1. API Key 校验 (X-API-Key header)
 * 2. 设备白名单 (iot_devices 表)
 * 3. 速率限制由 express-rate-limit 在路由层处理
 *
 * 2026-07-16 安全加固：
 * - API Key 比对改用 crypto.timingSafeEqual（防时序攻击）
 * - 仅匹配 device_id，再在应用层 timing-safe 比对 api_key
 * - 后续 TODO：迁移到 bcrypt/scrypt 哈希存储（DB 泄露不再直接失陷）
 */
import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

/** IoT设备白名单记录（queryToObjects 已转 camelCase） */
interface IotDevice {
  deviceId: string;
  apiKey: string;
  deviceName: string;
  isActive: number;
}

/**
 * 常量时间比较两个字符串（防时序攻击）
 * 长度不等直接返回 false（恒定时间，避免长度泄露）
 * 2026-07-16 审核修复：入参防御 — 非 string 直接 false（避免 Buffer.from(undefined) 抛 TypeError）
 */
function safeStringEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** 验证IoT设备API Key */
export function iotAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  const deviceId = req.body?.device_id as string;

  if (!apiKey) {
    res.status(401).json({ success: false, error: '缺少 X-API-Key 认证头' });
    return;
  }

  if (!deviceId) {
    res.status(400).json({ success: false, error: '缺少 device_id 参数' });
    return;
  }

  try {
    const db = getDatabase();
    // 2026-07-16：仅按 device_id 查设备，再在应用层做 timing-safeEqual
    // 这样 SQL 层不泄露 api_key 长度信息（防止按响应时间推断）
    const devices = queryToObjects<IotDevice>(db,
      `SELECT * FROM iot_devices WHERE device_id = ? AND is_active = 1`,
      [deviceId]
    );

    if (devices.length === 0) {
      res.status(403).json({ success: false, error: '设备认证失败：设备未注册或已停用' });
      return;
    }

    // 至少一个设备的 API Key 必须匹配（用 timingSafeEqual 防止时序攻击）
    // 2026-07-16 审核修复：queryToObjects 已转 camelCase → d.apiKey（原 d.api_key 恒 undefined 导致认证全 500）
    const matched = devices.find((d) => safeStringEqual(d.apiKey, apiKey));
    if (!matched) {
      res.status(403).json({ success: false, error: '设备认证失败：API Key无效' });
      return;
    }

    // 将设备信息挂载到请求上下文
    (req as any).iotDevice = matched;
    next();
  } catch (error) {
    // 2026-07-16 审核修复：加日志（原静默吞错让 camelCase bug 难以发现）
    console.error('[iotAuth] 设备认证服务异常:', error);
    res.status(500).json({ success: false, error: '设备认证服务异常' });
  }
}
