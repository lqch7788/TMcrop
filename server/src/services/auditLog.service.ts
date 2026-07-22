/**
 * 审计日志服务（v2 设计文档 §5.2）
 * 失败仅 console.error，不抛（CLAUDE.md Fail Loud 铁律）
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
 */

import { randomUUID } from 'crypto';
import { getDatabase, saveDatabase } from '../db';
import type { AuditBusinessType, AuditAction } from '../lib/auditTypes';

export interface AuditLogInput {
  businessType: AuditBusinessType;
  businessId: string;
  action: AuditAction;
  operatorId?: string;
  operatorName?: string;
  opinion?: string;
}

export function writeAuditLog(input: AuditLogInput): void {
  try {
    const db = getDatabase();
    db.run(
      `INSERT INTO audit_logs (id, business_type, business_id, action, operator_id, operator_name, opinion, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.businessType,
        input.businessId,
        input.action,
        input.operatorId ?? null,
        input.operatorName ?? '',
        input.opinion ?? null,
        new Date().toISOString(),
      ]
    );
    saveDatabase();
  } catch (e) {
    // 审计日志失败不能阻断主流程
    console.error('[auditLog] writeAuditLog failed:', (e as Error).message);
  }
}