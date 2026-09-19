/**
 * 审计日志服务（v2 设计文档 §5.2）
 * 失败仅 console.error，不抛（CLAUDE.md Fail Loud）
 *
 * 事务语义：必须在主事务 COMMIT 之后调用（避免主表回滚时 audit 已写）
 * 调用模式：
 *   db.exec('BEGIN');
 *   try {
 *     // 写主表 + 子表
 *     db.exec('COMMIT');
 *     writeAuditLog({ ... });  // 事务外
 *   } catch (e) {
 *     db.exec('ROLLBACK');
 *     throw e;
 *   }
 *
 * 2026-09-19 改造：写入目标从 audit_logs 改为 operation_logs
 *   原因：audit_logs 是一张**只写不读**的表 —— 全站没有任何查询/接口/页面读它，
 *   119 条种源/育苗/种植/库存的操作记录等于写进了黑洞，操作日志页完全看不到。
 *   现在统一落到 operation_logs，操作日志页（/settings/audit-log）即可覆盖全系统。
 *   audit_logs 表保留不删（历史数据已迁移脚本搬走），只是不再有新写入。
 */
import { randomUUID } from 'crypto';
import { getDatabase, saveDatabase } from '../db';
import { bumpAuditWriteCount } from '../lib/auditMeta';
import type { AuditBusinessType, AuditAction } from '../lib/auditTypes';

export interface AuditLogInput {
  businessType: AuditBusinessType;
  businessId: string;
  action: AuditAction;
  operatorId?: string;
  operatorName?: string;
  opinion?: string;
}

/**
 * business_type 前缀 → 操作日志页的模块分类
 * 显式表，不做前缀猜测；未命中归入「其他」
 */
const MODULE_BY_BUSINESS_TYPE: Record<string, string> = {
  inventory_stock: '物资管理',
  inventory: '物资管理',
  planting: '作物管理',
  seedling: '作物管理',
  seed_source: '作物管理',
  crop: '作物管理',
};

/** 由 business_type（如 'planting.update'）解析模块分类 */
function resolveModule(businessType: string): string {
  const head = businessType.split('.')[0];
  return MODULE_BY_BUSINESS_TYPE[head] ?? '其他';
}

export function writeAuditLog(input: AuditLogInput): void {
  try {
    const db = getDatabase();
    db.run(
      `INSERT INTO operation_logs (
        id, user_id, username, action, module, resource_type, resource_id,
        description, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success', ?)`,
      [
        `audit_${randomUUID()}`,
        input.operatorId ?? '',
        input.operatorName ?? '',
        input.action,
        resolveModule(input.businessType),
        input.businessType,
        input.businessId,
        input.opinion ?? input.businessType,
        new Date().toISOString(),
      ]
    );
    saveDatabase();
    // 通知 middleware/auditTrail.ts：本请求已写过语义化日志，不要重复记录
    bumpAuditWriteCount();
  } catch (e) {
    // 审计日志失败不能阻断主流程，但必须显式报出来
    console.error('[auditLog] writeAuditLog failed:', (e as Error).message);
  }
}
