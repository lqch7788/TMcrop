/**
 * 审批单编码生成（2026-09-27 从 routes/approval.ts 抽出为共享模块）
 *
 * 抽出的原因：materialInboundStock.service 需要为新入库单创建审批记录，
 * 若直接 import routes/approval 会与其联动链（approvalLinkage → service）形成循环依赖。
 *
 * 格式：{prefix}YYYYMMDD-{3位流水}（如 AP20260607-001，共 14 字符）
 * 流水号按当日自增（查询当日 MAX+1），禁止随机数（[[code-generation-contract-rule]]）
 */
import { getDatabase } from '../db';

export function generateApprovalCode(prefix: string = 'AP', dateStr: string = ''): string {
  const effectivePrefix = prefix || 'AP';
  let effectiveDate = dateStr;
  if (!effectiveDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    effectiveDate = `${year}${month}${day}`;
  }

  // 查询当日最大序号: {prefix} + 8位日期 + - + 3位序号 = (2+8+1+3)=14 字符 (AP 前缀)
  // SP-RE 前缀 (5 字符) + 8位日期 + 3位序号 = 16 字符
  const db = getDatabase();
  const pattern = `${effectivePrefix}${effectiveDate}-___`;
  const stmt = db.prepare(`
    SELECT code FROM approvals
    WHERE code LIKE ? AND LENGTH(code) = ?
    ORDER BY code DESC LIMIT 1
  `);
  // 计算精确长度 (SP-RE-YYYYMMDD-XXX = 16 字符, AP-YYYYMMDD-XXX = 14 字符)
  const expectedLength = effectivePrefix.length + 8 + 1 + 3;
  stmt.bind([pattern, expectedLength]);
  let maxSerial = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { code: string };
    maxSerial = parseInt(row.code.slice(-3), 10) || 0;
  }
  stmt.free();

  const seq = String(maxSerial + 1).padStart(3, '0');
  return `${effectivePrefix}${effectiveDate}-${seq}`;
}
