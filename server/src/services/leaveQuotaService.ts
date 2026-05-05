/**
 * 请假额度服务
 * 处理请假、加班、入职、离职等审批相关的额度管理
 */

import { getDatabase, saveDatabase } from '../db/index';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function deductLeaveQuota(db: any, leaveRecord: Record<string, unknown>): boolean {
  try {
    const { worker_id, leave_type, days } = leaveRecord;
    if (!worker_id || !leave_type || !days) {
      console.error('[Quota] deductLeaveQuota: missing params', { worker_id, leave_type, days });
      return false;
    }

    const year = new Date().getFullYear();
    const leaveCategory = normalizeLeaveCategory(String(leave_type));

    const stmt = db.prepare('SELECT * FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?');
    stmt.bind([String(worker_id), Number(year), String(leaveCategory)]);
    const quota = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();

    if (!quota) {
      console.error('[Quota] No quota found:', { worker_id, year, leaveCategory });
      return false;
    }

    const currentRemaining = Number(quota.remaining_days) || 0;
    const currentFrozen = Number(quota.frozen_days) || 0;
    const currentUsed = Number(quota.used_days) || 0;
    const deductDays = Number(days);

    const newUsedDays = currentUsed + deductDays;
    const newFrozenDays = Math.max(0, currentFrozen - deductDays);
    const newRemainingDays = currentRemaining + newFrozenDays - newUsedDays;

    db.run(
      'UPDATE leave_quotas SET used_days = ?, frozen_days = ?, remaining_days = ?, update_time = ? WHERE worker_id = ? AND year = ? AND leave_category = ?',
      [newUsedDays, newFrozenDays, newRemainingDays, new Date().toISOString(), worker_id, year, leaveCategory]
    );

    console.log(`[Quota] Leave quota deducted: worker=${worker_id}, category=${leaveCategory}, days=${days}`);
    return true;
  } catch (e) {
    console.error('[Quota] deductLeaveQuota failed:', e);
    return false;
  }
}

export function deductOvertimeQuota(db: any, overtimeRecord: Record<string, unknown>): boolean {
  try {
    const { worker_id, hours } = overtimeRecord;
    if (!worker_id || !hours) {
      console.error('[Quota] deductOvertimeQuota: missing params', { worker_id, hours });
      return false;
    }

    const year = new Date().getFullYear();
    const leaveCategory = 'overtime';

    const stmt = db.prepare('SELECT * FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?');
    stmt.bind([String(worker_id), Number(year), String(leaveCategory)]);
    const quota = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();

    if (!quota) {
      const newId = generateId('LQ');
      const now = new Date().toISOString();
      db.run(
        'INSERT INTO leave_quotas (id, worker_id, worker_name, year, leave_category, total_days, used_days, frozen_days, remaining_days, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newId, worker_id, overtimeRecord.worker_name || '', year, leaveCategory, 0, Number(hours), 0, 0, now, now]
      );
      console.log(`[Quota] Overtime quota created: worker=${worker_id}, hours=${hours}`);
      return true;
    }

    const currentUsed = Number(quota.used_days) || 0;
    const newUsedHours = currentUsed + Number(hours);

    db.run(
      'UPDATE leave_quotas SET used_days = ?, update_time = ? WHERE worker_id = ? AND year = ? AND leave_category = ?',
      [newUsedHours, new Date().toISOString(), worker_id, year, leaveCategory]
    );

    console.log(`[Quota] Overtime quota deducted: worker=${worker_id}, hours=${hours}`);
    return true;
  } catch (e) {
    console.error('[Quota] deductOvertimeQuota failed:', e);
    return false;
  }
}

export function initEmployeeQuotas(db: any, employeeId: string, employeeName: string, year?: number): boolean {
  try {
    const targetYear = year || new Date().getFullYear();
    const now = new Date().toISOString();

    const defaultLeaveCategories = [
      { category: 'annual', totalDays: 0 },
      { category: 'sick', totalDays: 0 },
      { category: 'personal', totalDays: 0 },
      { category: 'marriage', totalDays: 0 },
      { category: 'maternity', totalDays: 0 },
      { category: 'paternity', totalDays: 0 },
      { category: 'funeral', totalDays: 0 },
    ];

    for (const { category, totalDays } of defaultLeaveCategories) {
      const checkStmt = db.prepare('SELECT id FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?');
      checkStmt.bind([employeeId, targetYear, category]);
      const exists = checkStmt.step();
      checkStmt.free();

      if (!exists) {
        const newId = generateId('LQ');
        db.run(
          'INSERT INTO leave_quotas (id, worker_id, worker_name, year, leave_category, total_days, used_days, frozen_days, remaining_days, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newId, employeeId, employeeName, targetYear, category, totalDays, 0, 0, totalDays, now, now]
        );
      }
    }

    const checkOvertimeStmt = db.prepare('SELECT id FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?');
    checkOvertimeStmt.bind([employeeId, targetYear, 'overtime']);
    const overtimeExists = checkOvertimeStmt.step();
    checkOvertimeStmt.free();

    if (!overtimeExists) {
      const newId = generateId('LQ');
      db.run(
        'INSERT INTO leave_quotas (id, worker_id, worker_name, year, leave_category, total_days, used_days, frozen_days, remaining_days, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newId, employeeId, employeeName, targetYear, 'overtime', 0, 0, 0, 0, now, now]
      );
    }

    console.log(`[Quota] Employee quotas initialized: worker=${employeeId}, year=${targetYear}`);
    return true;
  } catch (e) {
    console.error('[Quota] initEmployeeQuotas failed:', e);
    return false;
  }
}

export function deleteEmployeeQuotas(db: any, employeeId: string): boolean {
  try {
    db.run('DELETE FROM leave_quotas WHERE worker_id = ?', [employeeId]);
    console.log(`[Quota] Employee quotas deleted: worker=${employeeId}`);
    return true;
  } catch (e) {
    console.error('[Quota] deleteEmployeeQuotas failed:', e);
    return false;
  }
}

export function releaseLeaveQuota(db: any, leaveRecord: Record<string, unknown>): boolean {
  try {
    const { worker_id, leave_type, days } = leaveRecord;
    if (!worker_id || !leave_type || !days) {
      console.error('[Quota] releaseLeaveQuota: missing params', { worker_id, leave_type, days });
      return false;
    }

    const year = new Date().getFullYear();
    const leaveCategory = normalizeLeaveCategory(String(leave_type));

    const stmt = db.prepare('SELECT * FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?');
    stmt.bind([String(worker_id), Number(year), String(leaveCategory)]);
    const quota = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();

    if (!quota) {
      console.error('[Quota] No quota found:', { worker_id, year, leaveCategory });
      return false;
    }

    const currentFrozen = Number(quota.frozen_days) || 0;
    const currentUsed = Number(quota.used_days) || 0;
    const currentRemaining = Number(quota.remaining_days) || 0;
    const releaseDays = Number(days);

    const newFrozenDays = Math.max(0, currentFrozen - releaseDays);
    const newRemainingDays = currentRemaining + releaseDays;

    let newUsedDays = currentUsed;
    if (currentFrozen < releaseDays) {
      newUsedDays = Math.max(0, currentUsed - (releaseDays - currentFrozen));
    }

    db.run(
      'UPDATE leave_quotas SET used_days = ?, frozen_days = ?, remaining_days = ?, update_time = ? WHERE worker_id = ? AND year = ? AND leave_category = ?',
      [newUsedDays, newFrozenDays, newRemainingDays, new Date().toISOString(), worker_id, year, leaveCategory]
    );

    console.log(`[Quota] Leave quota released: worker=${worker_id}, category=${leaveCategory}, days=${days}`);
    return true;
  } catch (e) {
    console.error('[Quota] releaseLeaveQuota failed:', e);
    return false;
  }
}

export function freezeLeaveQuota(db: any, leaveRecord: Record<string, unknown>): boolean {
  try {
    const { worker_id, leave_type, days } = leaveRecord;
    if (!worker_id || !leave_type || !days) {
      console.error('[Quota] freezeLeaveQuota: missing params', { worker_id, leave_type, days });
      return false;
    }

    const year = new Date().getFullYear();
    const leaveCategory = normalizeLeaveCategory(String(leave_type));

    const stmt = db.prepare('SELECT * FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?');
    stmt.bind([String(worker_id), Number(year), String(leaveCategory)]);
    const quota = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();

    if (!quota) {
      console.error('[Quota] No quota found:', { worker_id, year, leaveCategory });
      return false;
    }

    const currentFrozen = Number(quota.frozen_days) || 0;
    const currentRemaining = Number(quota.remaining_days) || 0;
    const freezeDays = Number(days);

    if (currentRemaining < freezeDays) {
      console.error('[Quota] Insufficient remaining quota:', { worker_id, leaveCategory, currentRemaining, freezeDays });
      return false;
    }

    const newFrozenDays = currentFrozen + freezeDays;
    const newRemainingDays = currentRemaining - freezeDays;

    db.run(
      'UPDATE leave_quotas SET frozen_days = ?, remaining_days = ?, update_time = ? WHERE worker_id = ? AND year = ? AND leave_category = ?',
      [newFrozenDays, newRemainingDays, new Date().toISOString(), worker_id, year, leaveCategory]
    );

    console.log(`[Quota] Leave quota frozen: worker=${worker_id}, category=${leaveCategory}, days=${days}`);
    return true;
  } catch (e) {
    console.error('[Quota] freezeLeaveQuota failed:', e);
    return false;
  }
}

function normalizeLeaveCategory(leaveType: string): string {
  const typeMap: Record<string, string> = {
    '年假': 'annual',
    '病假': 'sick',
    '事假': 'personal',
    '婚假': 'marriage',
    '产假': 'maternity',
    '陪产假': 'paternity',
    '丧假': 'funeral',
    'annual': 'annual',
    'sick': 'sick',
    'personal': 'personal',
    'marriage': 'marriage',
    'maternity': 'maternity',
    'paternity': 'paternity',
    'funeral': 'funeral',
  };
  return typeMap[leaveType] || leaveType;
}
