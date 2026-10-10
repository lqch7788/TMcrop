/**
 * 审批联动路由
 * 审批完成时自动更新业务表状态
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db/index';
import { applyMaterialInboundApproval } from '../services/materialInboundStock.service';
// 2026-10-09：补录/调拨入库写入时按 stockType 生成符合 ID 规则的 instance_id（IPR/ISE/INS-YYYYMMDD-NNNN）
import { inventoryStockRepository } from '../repositories/inventory.repository';
// 2026-09-28 审批流接入：退料单审批通过时恢复库存 / 审批取消或驳回时回滚（与入库单同等对待）
import { applyReturnStockOnApproval, revertReturnStockOnApproval } from './materialReturn';
import { deductLeaveQuota, deductOvertimeQuota, initEmployeeQuotas, deleteEmployeeQuotas, releaseLeaveQuota } from '../services/leaveQuotaService';
// 2026-10-10：本地日期工具——调拨联动写"日期类字段"（实例ID日期段/入库日期/流水操作日期）必须用本地日期
import { formatLocalDateYYYYMMDD, formatLocalDateISO } from '../utils/dateUtil';

const router = Router();

// ============================================
// 类型定义
// ============================================

interface BusinessLink {
  type: string;
  requestId: string;
  requestCode: string;
  [key: string]: unknown;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 记录操作日志
 */
function logOperation(
  db: any,
  userId: string,
  username: string,
  action: string,
  module: string,
  resourceType: string,
  resourceId: string,
  description: string
): void {
  const now = new Date().toISOString();
  try {
    db.run(`
      INSERT INTO operation_logs (
        id, user_id, username, action, module, resource_type,
        resource_id, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      generateId('LOG'),
      userId || '',
      username || '',
      action,
      module,
      resourceType,
      resourceId,
      description,
      now,
    ]);
  } catch (e) {
    console.error('记录操作日志失败:', e);
  }
}

// ============================================
// 业务表更新函数
// ============================================

/**
 * 从审批单回读"实际审批人 + 审批时间/意见"（2026-09-27 审计修复新增）
 * 用于回写业务表的 reviewer/approved_at/rejectReason——此前这些字段留的是
 * "申请时选的审核人"，与实际操作审批的人无关。
 */
function readApprovalActor(db: any, approvalCode: string): { name: string | null; time: string | null; comment: string | null } {
  try {
    const rows = db.exec('SELECT records FROM approvals WHERE code = ? ORDER BY updated_at DESC LIMIT 1', [approvalCode]);
    if (rows.length === 0 || rows[0].values.length === 0) return { name: null, time: null, comment: null };
    let recs: any[] = [];
    try { const p = JSON.parse(String(rows[0].values[0][0] || '[]')); recs = Array.isArray(p) ? p : []; } catch { recs = []; }
    if (recs.length === 0) return { name: null, time: null, comment: null };
    const last = recs[recs.length - 1];
    return {
      name: last.approverName || null,
      time: last.actionTime || null,
      comment: last.comment || null,
    };
  } catch {
    return { name: null, time: null, comment: null };
  }
}

/**
 * 更新物料申请状态
 * 2026-08-10 修复：原代码更新 `approval_code` / `approved_at` 列，但 material_requests 表没有这两列。
 * 2026-09-27 审计修复：列已由 fixSchemaColumns 补齐，现补写审批元数据（approval_code/approved_at/reviewer），
 *   并加防覆盖保护——已作废/已取消的申请单不再被迟到审批覆盖回 approved（作废丢失防护第二层）。
 */
function updateMaterialRequest(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    // 2026-09-27 审计修复：作废/取消保护——审批单虽已被作废逻辑取消，但审批中心页面上
    // 可能持有陈旧数据继续点"通过"；此处二次拦截，避免已作废单被覆盖回 approved
    const curRows = db.exec('SELECT status FROM material_requests WHERE id = ?', [id]);
    const curStatus = curRows.length > 0 && curRows[0].values.length > 0 ? String(curRows[0].values[0][0] || '') : '';
    if (curStatus === 'voided' || curStatus === 'cancelled') {
      console.warn(`【审批联动】申请单 ${id} 已作废/取消（${curStatus}），跳过状态覆盖`);
      return true;
    }

    const now = new Date().toISOString();
    const actor = status === 'approved' ? readApprovalActor(db, approvalCode) : { name: null, time: null, comment: null };
    // 同步 status（业务主状态）+ approval_status（审批子状态）+ 审批元数据
    db.run(`
      UPDATE material_requests SET
        status = ?,
        approval_status = ?,
        approval_code = ?,
        approved_at = COALESCE(?, approved_at),
        reviewer = COALESCE(?, reviewer),
        update_time = ?
      WHERE id = ?
    `, [status, status, approvalCode, actor.time, actor.name, now, id]);
    console.log(`【审批联动】material_request ${id} 状态已更新为 ${status}${actor.name ? `（审批人 ${actor.name}）` : ''}`);
    return true;
  } catch (e) {
    console.error('更新物料申请失败:', e);
    return false;
  }
}

/**
 * 更新采购计划状态
 */
function updatePurchasePlan(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    // 三重匹配：id / plan_code / requestCode
    const matchIds: string[] = [id];
    if ((extra as any)?.requestCode) matchIds.push((extra as any).requestCode);
    if (id.startsWith('PA')) matchIds.push(id);

    // 审批通过时，联动设置 execution_status = 'pending_execution'（待执行）
    // 其它 action 不动 execution_status
    const executionStatus = status === 'approved' ? 'pending_execution' : null;

    const stmt = db.prepare(`
      UPDATE purchase_plans SET
        status = ?,
        approval_status = ?,
        update_time = ?
      WHERE id = ? OR plan_code = ?
    `);

    // 2026-10-10：fail-loud——统计实际命中行数，0 行匹配不再假装成功
    // （幽灵成功：审批显示"已通过"、业务表纹丝不动；线上 6 条陈年待审批全中）
    let modified = 0;
    for (const matchId of matchIds) {
      stmt.run([status, status, now, matchId, matchId]);
      modified += db.getRowsModified();
    }
    stmt.free();

    // 单独 UPDATE execution_status（仅 approved 时）
    if (executionStatus) {
      const execStmt = db.prepare(`
        UPDATE purchase_plans SET execution_status = ? WHERE id = ? OR plan_code = ?
      `);
      for (const matchId of matchIds) {
        execStmt.run([executionStatus, matchId, matchId]);
        modified += db.getRowsModified();
      }
      execStmt.free();
    }

    return modified > 0;
  } catch (e) {
    console.error('更新采购计划失败:', e);
    return false;
  }
}

/**
 * 更新生产计划状态
 * @param db - 数据库实例
 * @param id - 生产计划ID
 * @param status - 审批状态 (approved/rejected/cancelled)
 * @param approvalCode - 审批编码
 * @param extra - 额外参数，包含 approvalAction 用于区分编辑审批和作废审批
 */
function updateProductionPlan(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    // 映射审批状态到生产计划状态
    // approved -> published (已发布) - 编辑/新增审批通过
    // approved with approvalAction='void' -> cancelled (已作废) - 作废审批通过
    // rejected -> cancelled (已作废)
    // cancelled -> cancelled (已作废)
    let planStatus = status;
    if (status === 'approved') {
      // 检查是否是作废审批
      if (extra?.approvalAction === 'void') {
        planStatus = 'cancelled';
      } else {
        planStatus = 'published';
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      planStatus = 'cancelled';
    }
    db.run(`
      UPDATE production_plans SET
        status = ?,
        batch_status = ?,
        publish_date = COALESCE(NULLIF(publish_date, ''), ?),
        update_time = ?
      WHERE id = ?
    `, [planStatus, planStatus, now, now, id]);
    // 2026-10-10：fail-loud——0 行匹配不再假装成功（幽灵成功治理，同 updatePurchasePlan）
    return db.getRowsModified() > 0;
  } catch (e) {
    console.error('更新生产计划失败:', e);
    return false;
  }
}

/**
 * 更新技术方案状态
 */
function updateTechSolution(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    // 映射审批状态到技术方案状态
    // approved -> published (已发布)
    // rejected -> rejected (已拒绝)
    // cancelled -> cancelled (已作废)
    let solutionStatus = status;
    if (status === 'approved') {
      solutionStatus = 'published';
    } else if (status === 'rejected') {
      solutionStatus = 'rejected';  // 审批拒绝
    } else if (status === 'cancelled') {
      solutionStatus = 'cancelled';  // 用户操作作废
    }
    db.run(`
      UPDATE tech_solutions SET
        status = ?,
        batch_status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [solutionStatus, solutionStatus, approvalCode, now, now, id]);
    // 2026-10-10：fail-loud——0 行匹配不再假装成功（幽灵成功治理，同 updatePurchasePlan）
    return db.getRowsModified() > 0;
  } catch (e) {
    console.error('更新技术方案失败:', e);
    return false;
  }
}

/**
 * 更新农事任务状态
 * 2026-10-10：任务派发审批接线（样板）——
 *   - 审批结果映射为任务状态（不再把 'approved'/'rejected' 原样写进 farm_tasks.status，
 *     任务枚举为 draft/pending/accepted/... 不含审批态）：
 *       通过 → 'pending'（保留执行人，正式派发为「待接受」）
 *       拒绝/作废 → 'pending' 且清空执行人（退回「待派发」，可重新指派）
 *   - fail-loud：0 行匹配返回 false（幽灵成功治理，调用方回滚审批）
 *   注：task_change（变更审批）尚未接入创建入口；接入时需在此区分映射
 */
function updateFarmTask(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    let taskStatus = status;
    let clearAssignee = false;
    if (status === 'approved') {
      taskStatus = 'pending';
    } else if (status === 'rejected' || status === 'cancelled') {
      taskStatus = 'pending';
      clearAssignee = true;
    }
    if (clearAssignee) {
      db.run(`
        UPDATE farm_tasks SET
          status = ?,
          approval_code = ?,
          approved_at = ?,
          assignee_id = NULL,
          assignee_name = NULL,
          update_time = ?
        WHERE id = ?
      `, [taskStatus, approvalCode, now, now, id]);
    } else {
      db.run(`
        UPDATE farm_tasks SET
          status = ?,
          approval_code = ?,
          approved_at = ?,
          update_time = ?
        WHERE id = ?
      `, [taskStatus, approvalCode, now, now, id]);
    }
    return db.getRowsModified() > 0;
  } catch (e) {
    console.error('更新农事任务失败:', e);
    return false;
  }
}

/**
 * 更新采收记录状态
 */
function updateHarvestRecord(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    db.run(`
      UPDATE harvest_records SET
        status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
  } catch (e) {
    console.error('更新采收记录失败:', e);
    return false;
  }
}

/**
 * 更新订单状态
 */
function updateCropOrder(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    db.run(`
      UPDATE crop_orders SET
        status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
  } catch (e) {
    console.error('更新订单失败:', e);
    return false;
  }
}

/**
 * 更新巡查记录状态
 */
function updateInspection(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    db.run(`
      UPDATE inspections SET
        status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
  } catch (e) {
    console.error('更新巡查记录失败:', e);
    return false;
  }
}

/**
 * 更新问题记录状态
 */
function updateProblem(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    db.run(`
      UPDATE problems SET
        status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
  } catch (e) {
    console.error('更新问题记录失败:', e);
    return false;
  }
}

/**
 * 更新人工记录状态（请假/加班/调薪等）
 */
function updateLaborRecord(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    db.run(`
      UPDATE labor_records SET
        status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
  } catch (e) {
    console.error('更新人工记录失败:', e);
    return false;
  }
}

/**
 * 创建请假记录（如果表存在）
 */
function createLeaveRecord(db: any, data: Record<string, unknown>): boolean {
  try {
    // 检查表是否存在
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='leave_records'");
    if (!tableCheck.step()) {
      console.log('leave_records表不存在，跳过');
      return false;
    }
    tableCheck.free();

    const now = new Date().toISOString();
    db.run(`
      INSERT INTO leave_records (
        id, worker_name, leave_type, start_date, end_date,
        reason, status, approval_code, created_at, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.id || generateId('LR'),
      data.workerName || '',
      data.leaveType || '',
      data.startDate || '',
      data.endDate || '',
      data.reason || '',
      data.status || 'pending',
      data.approvalCode || '',
      now,
      now,
    ]);
    return true;
  } catch (e) {
    console.error('创建请假记录失败:', e);
    return false;
  }
}

/**
 * 创建加班记录
 */
function createOvertimeRecord(db: any, data: Record<string, unknown>): boolean {
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='overtime_records'");
    if (!tableCheck.step()) {
      console.log('overtime_records表不存在，跳过');
      return false;
    }
    tableCheck.free();

    const now = new Date().toISOString();
    db.run(`
      INSERT INTO overtime_records (
        id, worker_name, work_date, start_time, end_time,
        hours, reason, status, approval_code, created_at, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.id || generateId('OT'),
      data.workerName || '',
      data.workDate || '',
      data.startTime || '',
      data.endTime || '',
      data.hours || 0,
      data.reason || '',
      data.status || 'pending',
      data.approvalCode || '',
      now,
      now,
    ]);
    return true;
  } catch (e) {
    console.error('创建加班记录失败:', e);
    return false;
  }
}

/**
 * 更新员工状态
 */
function updateEmployee(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    const updates: string[] = ['status = ?', 'update_time = ?'];
    const values: (string | number)[] = [status, now];

    if (status === 'resigned' && extra?.resignedAt) {
      updates.push('resigned_at = ?');
      values.push(extra.resignedAt as string);
    }
    if (status === 'transferred' && extra?.transferredAt) {
      updates.push('transferred_at = ?');
      values.push(extra.transferredAt as string);
    }
    if (approvalCode) {
      updates.push('approval_code = ?');
      values.push(approvalCode);
    }

    values.push(id);
    db.run(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (e) {
    console.error('更新员工失败:', e);
    return false;
  }
}

/**
 * 更新预算状态
 */
function updateBudget(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='budgets'");
    if (!tableCheck.step()) {
      console.log('budgets表不存在，跳过');
      return false;
    }
    tableCheck.free();

    const now = new Date().toISOString();
    db.run(`
      UPDATE budgets SET
        status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
  } catch (e) {
    console.error('更新预算失败:', e);
    return false;
  }
}

/**
 * 更新指标状态
 */
function updateIndicator(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='indicators'");
    if (!tableCheck.step()) {
      console.log('indicators表不存在，跳过');
      return false;
    }
    tableCheck.free();

    const now = new Date().toISOString();
    db.run(`
      UPDATE indicators SET
        status = ?,
        approval_code = ?,
        published_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
  } catch (e) {
    console.error('更新指标失败:', e);
    return false;
  }
}

/**
 * 更新公告状态
 */
function updateAnnouncement(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='announcements'");
    if (!tableCheck.step()) {
      console.log('announcements表不存在，跳过');
      return false;
    }
    tableCheck.free();

    const now = new Date().toISOString();
    db.run(`
      UPDATE announcements SET
        status = ?,
        approval_code = ?,
        published_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
  } catch (e) {
    console.error('更新公告失败:', e);
    return false;
  }
}

// ============================================
// 联动更新主函数
// ============================================

/**
 * 根据业务类型更新业务表
 */
export function updateBusinessTable(
  db: any,
  businessType: string,
  requestId: string,
  action: 'approved' | 'rejected' | 'cancelled' | 'partially_approved' | 'reject',
  approvalCode: string,
  extra?: Record<string, unknown>
): { success: boolean; message: string } {
  const now = new Date().toISOString();
  let status = 'pending';
  let finalStatus = 'pending';

  // 统一 action 值：reject -> rejected
  const normalizedAction = action === 'reject' ? 'rejected' : action;

  switch (normalizedAction) {
    case 'approved':
      status = 'approved';
      finalStatus = 'approved';
      break;
    case 'rejected':
      status = 'rejected';
      finalStatus = 'rejected';
      break;
    case 'cancelled':
      status = 'cancelled';
      finalStatus = 'cancelled';
      break;
    case 'partially_approved':
      status = 'partially_approved';
      finalStatus = 'partially_approved';
      break;
  }

  // 根据业务类型更新对应的表
  switch (businessType) {
    // ========== 业务审批（10种）==========
    case 'material':
      if (updateMaterialRequest(db, requestId, status, approvalCode, extra)) {
        return { success: true, message: '物料申请状态已更新' };
      }
      break;

    case 'purchase':
      if (updatePurchasePlan(db, requestId, status, approvalCode, extra)) {
        return { success: true, message: '采购计划状态已更新' };
      }
      // 2026-10-10：精确报错（此前落到通用"更新失败"，用户无法知道业务单据不存在）
      return { success: false, message: `采购计划 ${requestId} 不存在或已变更，无法更新` };

    case 'material_inbound':
      // 2026-09-27 修复：此前 UPDATE legacy `inventory` 表（11 行种子数据、无读取方，
      // 目标行永不匹配却恒返回 success —— 幽灵路径），审批结果从未落到真实入库单。
      // 改为真实链路：通过 → 入库单 completed + 库存入账；驳回/取消 → 入库单作废。
      try {
        return applyMaterialInboundApproval(db, String(requestId), status);
      } catch (e) {
        console.error('更新物料入库失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }

    case 'material_transfer':
      // 2026-10-09：库存调拨（AddStockModal transfer 来源 / inventoryTransferApplication 表）
      // 审批通过 → 真做跨仓库：源库存 current_quantity 扣减 + 目标库存 INSERT/累加 + 2 条流水
      // 审批驳回 → UPDATE 申请单 status=rejected，不调拨
      // 注：此前的 UPDATE legacy `inventory` 表路径是"幽灵路径"——目标表无 inventory 列导致 0 行匹配恒返回 success，
      // 审批通过实际未真调拨。详见原 L680-684 注释（已删除）。
      const trRows = db.exec('SELECT * FROM inventory_transfer_applications WHERE id = ?', [requestId]);
      if (trRows.length === 0 || trRows[0].values.length === 0) {
        return { success: false, message: `调拨申请单 ${requestId} 不存在` };
      }
      const trCols = trRows[0].columns;
      const trIdx: Record<string, number> = {};
      trCols.forEach((c: string, i: number) => { trIdx[c] = i; });
      const trVal = trRows[0].values[0];
      const trCode = String(trVal[trIdx['application_code']] || '');
      const trAppStatus = status === 'approved' ? 'approved' : (status === 'rejected' ? 'rejected' : 'voided');
      try {
        if (status === 'approved') {
          const srcWhId = String(trVal[trIdx['source_warehouse_id']] || '');
          const srcWhName = String(trVal[trIdx['source_warehouse_name']] || '');
          const tgtWhId = String(trVal[trIdx['target_warehouse_id']] || '');
          const qty = Number(trVal[trIdx['quantity']]) || 0;
          const unit = String(trVal[trIdx['unit']] || '');
          const matName = String(trVal[trIdx['material_name']] || '');
          const matCode = String(trVal[trIdx['material_code']] || '');
          const appName = String(trVal[trIdx['applicant_name']] || '');
          // 2026-10-10：日期类字段必须用「本地日期」——原 now.slice(0,10) 取的是 UTC 日期，
          // 中国时间 0:00-8:00 创建的调拨行会把实例 ID/入库日期打成"昨天"（项目既有 UTC ID 铁律）
          const localDateCompact = formatLocalDateYYYYMMDD(); // YYYYMMDD（本地，用于实例 ID 日期段）
          const localDateIso = formatLocalDateISO();          // YYYY-MM-DD（本地，用于 inbound_date / operate_date）
          // 2026-10-09：实际扣减的源库存行 id——写入目标行的 source_instance_id（追溯"从哪条源库存调入"）
          let firstDeductedId = '';

          // 1. 源仓库扣减（2026-10-09 增强 + fail loud）
          //    优先级 a) source_stock_id 精确指定 → 扣该行
          //           b) source_warehouse_id 命中系统内仓库 → 按 (warehouse + crop_code) FEFO 找库存行扣减；不足则拒绝
          //           c) 都为空（外部仓库调入语义）→ 跳过并留痕（仅目标仓加）
          const srcStockId = String(trVal[trIdx['source_stock_id']] || '');
          if (srcStockId) {
            const beforeRows = db.exec('SELECT current_quantity, available_quantity FROM inventory_stock WHERE id = ?', [srcStockId]);
            if (beforeRows.length > 0 && beforeRows[0].values.length > 0) {
              const beforeQty = Number(beforeRows[0].values[0][0]) || 0;
              const newQty = beforeQty - qty;
              db.run(`UPDATE inventory_stock SET current_quantity = ?, available_quantity = ?, update_time = ? WHERE id = ?`,
                [newQty, newQty, now, srcStockId]);
              // 2026-10-09：记用户可见 instance_id（同 FEFO 分支口径）
              const instRow = db.exec('SELECT instance_id FROM inventory_stock WHERE id = ?', [srcStockId]);
              firstDeductedId = (instRow.length > 0 && instRow[0].values.length > 0 && instRow[0].values[0][0])
                ? String(instRow[0].values[0][0])
                : srcStockId;
              // 源流水（transfer_out）
              // 2026-10-09 修复：instance_id 必须写「用户可见实例 ID」（firstDeductedId）而非内部主键 srcStockId——
              // 详情弹窗"操作历史"/上下游追溯都按 instance_id 精确查询（inventory-tx.repository.findByInstanceId），
              // 写内部 id 会查不到该调出记录（quantity 同理用负数，与全库既有 transfer_out 惯例一致）
              db.run(`
                INSERT INTO inventory_transaction (
                  id, transaction_id, instance_id, stock_type, transaction_type,
                  quantity, balance_before, balance_after,
                  business_id, business_type, business_code,
                  operator_id, operator_name, operate_date, remarks, create_time
                ) VALUES (?, ?, ?, ?, 'transfer_out', ?, ?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?)
              `, [
                `TXN_OUT_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                `TXN_OUT_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                firstDeductedId,
                'product',
                -qty, beforeQty, newQty,
                requestId, trCode,
                '', appName, localDateIso,
                `调出：${trCode}`, now,
              ]);
            }
          } else if (srcWhId) {
            // b) 系统内源仓库：按 FEFO 找该仓库该作物的库存行（available>0），逐行扣减
            // 2026-10-09：crop_code 前 9 位归一化匹配——库存表存在 9 位历史编码（FR0101001）
            // 与 12 位新编码（FR010100100）两种格式，同品种前 9 位一致；精确匹配会漏掉历史编码库存
            // （与 /inventory/available-by-crop 端点过滤条件完全一致，保证"展示的可用量=实际可扣量"）
            const srcRows = db.exec(`
              SELECT id, instance_id, current_quantity, available_quantity, frozen_quantity FROM inventory_stock
              WHERE warehouse_id = ? AND SUBSTR(crop_code, 1, 9) = SUBSTR(?, 1, 9)
                AND status IN ('in_stock','low_stock')
                AND available_quantity > 0
              ORDER BY inbound_date ASC, id ASC
            `, [srcWhId, matCode]);
            // 2026-10-10：可用量取"存储列"与"实时值(current-frozen)"的较小者——
            // available_quantity 列历史上被部分写入端漏维护（freeze/outbound/PUT 曾不更新），
            // 存储值虚高时 FEFO 按它扣减会把 current 扣成负数；min() 双保险（列修为一致后等价）
            const srcLines: Array<{ id: string; instId: string; cur: number; avail: number }> = srcRows.length > 0
              ? srcRows[0].values.map((v: any[]) => {
                  const cur = Number(v[2]) || 0;
                  const stored = Number(v[3]) || 0;
                  const frozen = Number(v[4]) || 0;
                  return {
                    id: String(v[0]), instId: String(v[1] || ''), cur,
                    avail: Math.max(0, Math.min(stored, cur - frozen)),
                  };
                }).filter((l: { avail: number }) => l.avail > 0)
              : [];
            const totalAvail = srcLines.reduce((s: number, l) => s + l.avail, 0);
            if (totalAvail < qty) {
              // fail loud：源库存不足 → 审批联动失败（approval.ts 硬回滚清单已含 material_transfer，会回滚 409）
              return { success: false, message: `源仓库 ${srcWhId} 的作物 ${matCode || matName} 库存不足（需 ${qty}，可用 ${totalAvail}），调拨未执行` };
            }
            let remaining = qty;
            for (const line of srcLines) {
              if (remaining <= 0) break;
              const deduct = Math.min(line.avail, remaining);
              const newQty = line.cur - deduct;
              // 2026-10-09：记录源行的"用户可见实例 ID"（instance_id，如 ISE-20260619-0004），
              // 而非内部主键 id（STK-...）——列表"实例ID"列与搜索都用 instance_id，展示也须用它才能被搜到
              if (!firstDeductedId) firstDeductedId = line.instId || line.id;
              db.run('UPDATE inventory_stock SET current_quantity = ?, available_quantity = ?, update_time = ? WHERE id = ?',
                [newQty, newQty, now, line.id]);
              // 2026-10-09 修复：流水的 instance_id 列写「用户可见实例 ID」（line.instId），
              // 不能写内部主键 line.id——否则详情弹窗"操作历史"（按 instance_id 精确查询）看不到这笔调出；
              // quantity 用负数（与全库既有 transfer_out 惯例一致，UI 按负号+红色展示扣减）
              db.run(`
                INSERT INTO inventory_transaction (
                  id, transaction_id, instance_id, stock_type, transaction_type,
                  quantity, balance_before, balance_after,
                  business_id, business_type, business_code,
                  operator_id, operator_name, operate_date, remarks, create_time
                ) VALUES (?, ?, ?, 'product', 'transfer_out', ?, ?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?)
              `, [
                `TXN_OUT_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                `TXN_OUT_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                line.instId || line.id,
                -deduct, line.cur, newQty,
                requestId, trCode,
                '', appName, localDateIso,
                `调出（FEFO）：${trCode}`, now,
              ]);
              remaining -= deduct;
            }
          }
          // c) 外部仓库调入：不做源扣减（业务语义：从系统外调入），流转备注会在下方注明

          // 2a. 2026-10-10：读取"属性锚点行"（FEFO 首行 / 精确指定行，即 source_instance_id 记录的那条源库存），
          //     用于下方把源行的作物信息整体继承到目标行——此前目标行只带 crop_code/crop_name，
          //     导致调拨后详情/列表的品种、形态、品质、采收区域、库存类型全空或误标（种苗显示成"成品"）
          let srcAttr: Record<string, any> = {};
          const anchorId = firstDeductedId || srcStockId;
          if (anchorId) {
            const attrRes = db.exec(`
              SELECT stock_type, crop_id, crop_code, crop_name, variety_id, variety_name, grade,
                     source_form, product_form, planting_mode, greenhouse_name, area_name,
                     target_yield, production_plan_code, unit
              FROM inventory_stock WHERE instance_id = ? OR id = ? LIMIT 1
            `, [anchorId, anchorId]);
            if (attrRes.length > 0 && attrRes[0].values.length > 0) {
              const attrCols = attrRes[0].columns;
              const attrVals = attrRes[0].values[0];
              attrCols.forEach((c: string, i: number) => { srcAttr[c] = attrVals[i]; });
            }
          }

          // 2. 目标仓库加：INSERT 新 inventory_stock 行（只覆盖必要字段，其余 DEFAULT）
          // 2026-10-09 修复 ID 格式：调拨目标仓 ID 用 IPR-YYYYMMDD-NNNN（调拨当前仅 product 场景；
          //   未来调拨 seed/seedling 时按 stockType 切换 INS/ISE）
          // 注：sync 函数内不能 await；同步计算 maxInst（同 inventory.ts 逻辑）
          const trPrefixInst = 'IPR';
          // 2026-10-10：ID 日期段用本地日期（原 now 为 UTC——0:00-8:00 会打成昨天）
          const trDateStr = localDateCompact;
          const trExpectedLen = trPrefixInst.length + 1 + 8 + 1 + 4;
          const trStmt = db.prepare(`
            SELECT instance_id FROM inventory_stock
            WHERE instance_id LIKE ? AND LENGTH(instance_id) = ? AND SUBSTR(instance_id, -4) GLOB '[0-9][0-9][0-9][0-9]'
            ORDER BY SUBSTR(instance_id, -4) DESC LIMIT 1
          `);
          trStmt.bind([`${trPrefixInst}-${trDateStr}-____`, trExpectedLen]);
          let trMaxSerial = 0;
          if (trStmt.step()) {
            const r = trStmt.getAsObject() as { instance_id: string };
            const n = parseInt(r.instance_id.slice(-4), 10);
            trMaxSerial = isNaN(n) ? 0 : n;
          }
          trStmt.free();
          const tgtStockId = `${trPrefixInst}-${trDateStr}-${String(trMaxSerial + 1).padStart(4, '0')}`;
          db.run(`
            INSERT INTO inventory_stock (
              id, instance_id, stock_type, business_id, business_type, business_code,
              source_module, source_id, source_type, source_instance_id,
              crop_code, crop_name, crop_id, variety_id, variety_name, grade,
              source_form, product_form, planting_mode, greenhouse_name, area_name, target_yield,
              production_plan_code,
              current_quantity, available_quantity, unit,
              warehouse_id, warehouse_name,
              inbound_date,
              notes, status, version, create_time, update_time
            ) VALUES (?, ?, ?, ?, 'inbound', ?, 'transfer', ?, 'cross_warehouse',
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                      'in_stock', 1, ?, ?)
          `, [
            tgtStockId,                                   // id
            tgtStockId,                                   // instance_id
            // 2026-10-10：库存类型继承源行（种苗调拨不再被误标为"成品"；外部调入无源行时才兜底 product）
            srcAttr.stock_type || 'product',              // stock_type
            // 2026-10-10 修复：状态此前写非法值 'active'（不在任何枚举/@map 内）——连锁后果：
            // 状态筛选查不到、无出库/冻结按钮、FEFO/可用仓过滤（in_stock/low_stock）把它排除导致无法再调拨。
            // 统一写规范状态 'in_stock'（status 位置在下方 VALUES 尾部 'in_stock', 1）
            requestId,                                    // business_id
            trCode,                                       // business_code
            // 2026-10-09：写入实际扣减的源库存行 id（追溯"从哪条源库存调入"；无源扣减=外部调入时为空）
            anchorId || '',                               // source_id
            anchorId || '',                               // source_instance_id
            // 2026-10-09：作物编码截 9 位——前端品种库输出 11 位（FR010100100），库存体系标准 9 位
            // （FR0101001，尾部两位细分层恒 '00'）；保证目标行与同作物历史行编码一致（FEFO 也按前 9 位匹配）
            // 2026-10-10：优先继承源行 crop_code（与 FEFO 匹配口径完全一致）
            srcAttr.crop_code || String(matCode || '').slice(0, 9),  // crop_code
            srcAttr.crop_name || matName,                 // crop_name
            // 2026-10-10：以下 11 个作物属性字段全部继承源行（详情"品种信息"组 + 列表列的数据源）
            srcAttr.crop_id ?? null,                      // crop_id
            srcAttr.variety_id ?? null,                   // variety_id
            srcAttr.variety_name ?? null,                 // variety_name（列表"作物信息"副行）
            srcAttr.grade ?? null,                        // grade（品质等级）
            srcAttr.source_form ?? null,                  // source_form（形态列主字段）
            srcAttr.product_form ?? null,                 // product_form（形态列兜底）
            srcAttr.planting_mode ?? null,                // planting_mode（种植模式）
            srcAttr.greenhouse_name ?? null,              // greenhouse_name（采收区域主）
            srcAttr.area_name ?? null,                    // area_name（采收区域兜底）
            srcAttr.target_yield ?? null,                 // target_yield（目标产量）
            srcAttr.production_plan_code ?? null,         // production_plan_code（生产计划）
            qty, qty,                                     // current/available
            srcAttr.unit || unit,                         // unit（优先源行单位）
            tgtWhId,                                      // warehouse_id
            String(trVal[trIdx['target_warehouse_name']] || ''),  // warehouse_name
            localDateIso,                                 // inbound_date（本地日期）
            `调入：${trCode}${srcWhName ? `（自 ${srcWhName}）` : ''}`,  // notes（含源仓库）
            now,                                          // create_time
            now,                                          // update_time
          ]);
          // 2026-10-09：调拨目标仓的 stock 暂不设 is_supplementary（不是补录）
          // 目标流水（transfer_in）
          db.run(`
            INSERT INTO inventory_transaction (
              id, transaction_id, instance_id, stock_type, transaction_type,
              quantity, balance_before, balance_after,
              business_id, business_type, business_code,
              operator_id, operator_name, operate_date, remarks, create_time
            ) VALUES (?, ?, ?, ?, 'transfer_in', ?, 0, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?)
          `, [
            `TXN_IN_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            `TXN_IN_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            tgtStockId,
            srcAttr.stock_type || 'product',  // 2026-10-10：流水类型与目标库存行保持一致
            qty, qty,
            requestId, trCode,
            '', appName, localDateIso,
            // 2026-10-09：备注含源仓库名——操作历史 tab 直接可见"从哪个仓库调入"
            `调入：${trCode}${srcWhName ? `（自 ${srcWhName}）` : ''}`, now,
          ]);

          // 3. UPDATE 申请单 status='approved'
          db.run(`UPDATE inventory_transfer_applications SET status = ?, update_time = ? WHERE id = ?`,
            ['approved', now, requestId]);
          return { success: true, message: `调拨申请单 ${trCode} 已审批通过并完成跨仓库调拨` };
        } else {
          // rejected / cancelled / voided → 仅改申请单状态
          db.run(`UPDATE inventory_transfer_applications SET status = ?, update_time = ? WHERE id = ?`,
            [trAppStatus, now, requestId]);
          return { success: true, message: `调拨申请单 ${trCode} 状态已更新为 ${trAppStatus}` };
        }
      } catch (e) {
        console.error('更新库存调拨失败:', e);
        return { success: false, message: '调拨联动失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'seed_source_inbound':
      // 种源入库使用 seed_sources 表
      try {
        db.run(`
          UPDATE seed_sources SET
            status = ?,
            approval_code = ?,
            inbound_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '种源入库状态已更新' };
      } catch (e) {
        console.error('更新种源入库失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'seedling_plan':
      // 育苗计划使用 seedlings 表
      try {
        db.run(`
          UPDATE seedlings SET
            status = ?,
            approval_code = ?,
            approved_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '育苗计划状态已更新' };
      } catch (e) {
        console.error('更新育苗计划失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'planting_plan':
      // 种植计划使用 plantings 表
      try {
        db.run(`
          UPDATE plantings SET
            status = ?,
            approval_code = ?,
            approved_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '种植计划状态已更新' };
      } catch (e) {
        console.error('更新种植计划失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'order_create':
    case 'order_change':
      if (updateCropOrder(db, requestId, finalStatus, approvalCode, extra)) {
        return { success: true, message: '订单状态已更新' };
      }
      break;

    // ========== 生产审批（5种）==========
    case 'production':
      // 审批动作 -> 生产计划状态映射
      // approved -> published (已发布)
      // rejected -> cancelled (已作废)
      // cancelled -> cancelled (已作废)
      if (updateProductionPlan(db, requestId, action, approvalCode, extra)) {
        return { success: true, message: '生产计划状态已更新' };
      }
      // 2026-10-10：精确报错（同 purchase case）
      return { success: false, message: `生产计划 ${requestId} 不存在或已变更，无法更新` };

    case 'production_batch':
      // 生产批次使用 crop_instances 表
      try {
        db.run(`
          UPDATE crop_instances SET
            status = ?,
            approval_code = ?,
            approved_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '生产批次状态已更新' };
      } catch (e) {
        console.error('更新生产批次失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'batch_change':
    case 'batch_void':
      // 批次变更/作废使用 crop_instances 表
      try {
        const batchStatus = businessType === 'batch_void' ? 'voided' : status;
        db.run(`
          UPDATE crop_instances SET
            status = ?,
            approval_code = ?,
            update_time = ?
          WHERE id = ?
        `, [batchStatus, approvalCode, now, requestId]);
        return { success: true, message: '批次状态已更新' };
      } catch (e) {
        console.error('更新批次状态失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'tech_solution':
      // 技术方案使用专门的 tech_solutions 表
      if (updateTechSolution(db, requestId, status, approvalCode, extra)) {
        return { success: true, message: '技术方案状态已更新' };
      }
      // 2026-10-10：精确报错（同 purchase case）
      return { success: false, message: `技术方案 ${requestId} 不存在或已变更，无法更新` };

    // ========== 农事审批（4种）==========
    case 'task_dispatch':
    case 'task_change':
      if (updateFarmTask(db, requestId, status, approvalCode, extra)) {
        return { success: true, message: '农事任务状态已更新' };
      }
      break;

    case 'inspection_issue':
      if (updateInspection(db, requestId, status, approvalCode, extra)) {
        return { success: true, message: '巡查问题状态已更新' };
      }
      break;

    case 'issue_resolve':
      if (updateProblem(db, requestId, 'resolved', approvalCode, extra)) {
        return { success: true, message: '问题整改状态已更新' };
      }
      break;

    // ========== 采收审批（1种）==========
    case 'harvest':
      if (updateHarvestRecord(db, requestId, status, approvalCode, extra)) {
        return { success: true, message: '采收申请状态已更新' };
      }
      break;

    // ========== 作物补录审批（3种）==========
    case 'seed_source':
      try {
        db.run(`
          UPDATE seed_sources SET
            status = ?,
            approval_code = ?,
            supplementary_approved_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '种源补录状态已更新' };
      } catch (e) {
        console.error('更新种源补录失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'seedling':
      // 2026-10-09：育苗补录（HarvestRecordModal planting_self_kept → submitSeedlingSupplementaryApplication）
      // 审批通过 → 真做回流：写 planting_harvest_records + UPDATE 申请单 status=approved
      // 审批驳回 → 仅改申请单状态
      const seedRows = db.exec('SELECT * FROM seedling_supplementary_applications WHERE id = ?', [requestId]);
      if (seedRows.length === 0 || seedRows[0].values.length === 0) {
        return { success: false, message: `育苗补录申请单 ${requestId} 不存在` };
      }
      const seedCols = seedRows[0].columns;
      const seedIdx: Record<string, number> = {};
      seedCols.forEach((c: string, i: number) => { seedIdx[c] = i; });
      const seedVal = seedRows[0].values[0];
      const seedAppCode = String(seedVal[seedIdx['application_code']] || '');
      const seedStatus = status === 'approved' ? 'approved' : (status === 'rejected' ? 'rejected' : 'voided');
      try {
        if (status === 'approved') {
          // 1. 写 planting_harvest_records（与 HarvestRecordModal 直入库流程对齐，destination=planting_self_kept）
          const phrId = `PHR_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          db.run(`
            INSERT INTO planting_harvest_records (
              id, planting_id, record_date, destination,
              quantity, unit, notes, source_form, sub_type,
              operator_name, create_by, create_time, update_time
            ) VALUES (?, ?, ?, 'planting_self_kept', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            phrId,
            String(seedVal[seedIdx['source_id']] || ''),
            now.slice(0, 10),
            Number(seedVal[seedIdx['quantity']]) || 0,
            String(seedVal[seedIdx['unit']] || ''),
            String(seedVal[seedIdx['notes']] || ''),
            String(seedVal[seedIdx['seed_form']] || ''),  // 映射到 source_form 列
            String(seedVal[seedIdx['seed_form']] || ''),  // sub_type (与 source_form 同步)
            String(seedVal[seedIdx['operator_name']] || String(seedVal[seedIdx['applicant_name']] || '')),
            String(seedVal[seedIdx['create_by']] || ''),
            now, now,
          ]);
          // 2. UPDATE 申请单 status='approved' + 审批元数据
          db.run(`UPDATE seedling_supplementary_applications SET status = ?, update_time = ? WHERE id = ?`,
            ['approved', now, requestId]);
          return { success: true, message: `育苗补录申请 ${seedAppCode} 已审批通过，回流到种源` };
        } else {
          // rejected / cancelled / voided → 仅改申请单状态
          db.run(`UPDATE seedling_supplementary_applications SET status = ?, update_time = ? WHERE id = ?`,
            [seedStatus, now, requestId]);
          return { success: true, message: `育苗补录申请 ${seedAppCode} 状态已更新为 ${seedStatus}` };
        }
      } catch (e) {
        console.error('更新育苗补录失败:', e);
        return { success: false, message: '育苗补录联动失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'crop_storage':
      // 2026-10-09：作物入库补录（AddStockModal self_produced 来源）
      // 审批通过 → 真正写 inventory_inbound_records + 写流水 + UPDATE 申请单 status=approved
      // 审批驳回 → UPDATE 申请单 status=rejected，不入库
      // 注：此前的 UPDATE legacy `inventory` 表路径是"幽灵路径"——目标表无 inventory 列导致 0 行匹配恒返回 success，
      // 审批通过实际未真正入库。详见 src/routes/approvalLinkage.ts:842-849 注释（已删除）。
      const supRows = db.exec('SELECT * FROM inventory_supplementary_applications WHERE id = ?', [requestId]);
      if (supRows.length === 0 || supRows[0].values.length === 0) {
        return { success: false, message: `补录申请单 ${requestId} 不存在` };
      }
      const supCols = supRows[0].columns;
      const supIdx: Record<string, number> = {};
      supCols.forEach((c: string, i: number) => { supIdx[c] = i; });
      const supVal = supRows[0].values[0];
      const appCode = String(supVal[supIdx['application_code']] || '');
      const appStatus = status === 'approved' ? 'approved' : (status === 'rejected' ? 'rejected' : 'voided');
      try {
        if (status === 'approved') {
          // 1. 写 inventory_inbound_records（与作物库存表对齐）
          const recordId = `INB_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          db.run(`
            INSERT INTO inventory_inbound_records (
              id, record_type, record_date, source_module, source_id, source_code,
              stock_type, source_type, warehouse_id, warehouse_name,
              crop_id, crop_code, crop_name, variety_name,
              quantity, returned_quantity, unit, unit_price, total_amount,
              quality_grade, supplier_id, supplier_name,
              production_plan_id, production_plan_code,
              business_id, notes, operator_name, create_by, create_time, update_time
            ) VALUES (?, 'inbound', ?, 'supplementary', ?, ?, ?, 'self_produced', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            recordId,
            now.slice(0, 10),
            String(supVal[supIdx['source_id']] || ''),
            String(supVal[supIdx['source_code']] || ''),
            String(supVal[supIdx['stock_type']] || 'product'),
            String(supVal[supIdx['warehouse_id']] || ''),
            String(supVal[supIdx['warehouse_name']] || ''),
            String(supVal[supIdx['crop_id']] || ''),
            String(supVal[supIdx['crop_code']] || ''),
            String(supVal[supIdx['crop_name']] || ''),
            String(supVal[supIdx['variety_name']] || ''),
            Number(supVal[supIdx['quantity']]) || 0,
            String(supVal[supIdx['unit']] || ''),
            Number(supVal[supIdx['unit_price']]) || 0,
            Number(supVal[supIdx['total_amount']]) || 0,
            String(supVal[supIdx['quality_grade']] || 'qualified'),
            String(supVal[supIdx['supplier_id']] || ''),
            String(supVal[supIdx['supplier_name']] || ''),
            String(supVal[supIdx['production_plan_id']] || ''),
            String(supVal[supIdx['production_plan_code']] || ''),
            requestId,
            String(supVal[supIdx['notes']] || ''),
            String(supVal[supIdx['operator_name']] || ''),
            String(supVal[supIdx['create_by']] || ''),
            now,
            now,
          ]);
          // 2. 写 inventory_stock（库存主表）
          // 2026-10-09 修复 ID 格式：按 stockType 区分 prefix，与 inventory.ts:255 保持统一（IPR/ISE/INS-YYYYMMDD-NNNN）
          // 同时补录需要 is_supplementary=1，前端 InventoryTable.tsx:325 据此显示"⚙️ 补录"徽章
          // 注：updateBusinessTable 是 sync 函数不能 await，这里直接同步计算 maxInst（沿用 inventory.repository.ts 内部逻辑）
          const stockTypeVal = String(supVal[supIdx['stock_type']] || 'product');
          const prefixInst = stockTypeVal === 'seed' ? 'INS' : stockTypeVal === 'seedling' ? 'ISE' : 'IPR';
          const dateStrInst = now.slice(0, 10).replace(/-/g, '');
          const suppExpectedLen = prefixInst.length + 1 + 8 + 1 + 4; // 17
          const suppStmt = db.prepare(`
            SELECT instance_id FROM inventory_stock
            WHERE instance_id LIKE ? AND LENGTH(instance_id) = ? AND SUBSTR(instance_id, -4) GLOB '[0-9][0-9][0-9][0-9]'
            ORDER BY SUBSTR(instance_id, -4) DESC LIMIT 1
          `);
          suppStmt.bind([`${prefixInst}-${dateStrInst}-____`, suppExpectedLen]);
          let suppMaxSerial = 0;
          if (suppStmt.step()) {
            const r = suppStmt.getAsObject() as { instance_id: string };
            const n = parseInt(r.instance_id.slice(-4), 10);
            suppMaxSerial = isNaN(n) ? 0 : n;
          }
          suppStmt.free();
          // 2026-10-09：占位记录已在 POST 端点写入（status='pending'），现在审批通过只需 UPDATE status='in_stock'
          // 同时查占位 ID 用于写 inventory_transaction
          const placeholderRow = db.exec('SELECT id FROM inventory_stock WHERE business_id = ? AND status = ? LIMIT 1', [requestId, 'pending']);
          const placeholderId = placeholderRow.length > 0 && placeholderRow[0].values.length > 0 ? String(placeholderRow[0].values[0][0]) : '';
          db.run(`
            UPDATE inventory_stock
            SET status = 'in_stock', update_time = ?
            WHERE business_id = ? AND status = 'pending'
          `, [now, requestId]);
          // 3. 写 inventory_transaction（库存流水）
          if (placeholderId) {
            db.run(`
              INSERT INTO inventory_transaction (
                id, transaction_id, instance_id, stock_type, transaction_type,
                quantity, balance_before, balance_after,
                business_id, business_type, business_code,
                operator_id, operator_name, operate_date, remarks, create_time
              ) VALUES (?, ?, ?, ?, 'inbound', ?, 0, ?, ?, 'supplementary', ?, ?, ?, ?, ?, ?)
            `, [
              `TXN_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              `TXN_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              placeholderId,
              String(supVal[supIdx['stock_type']] || 'product'),
              Number(supVal[supIdx['quantity']]) || 0,
              Number(supVal[supIdx['quantity']]) || 0,
              recordId,
              appCode,
              '',
              String(supVal[supIdx['operator_name']] || String(supVal[supIdx['applicant_name']] || '')),
              now.slice(0, 10),
              `补录入库审批通过：${appCode}`,
              now,
            ]);
          }
          // 4. UPDATE 申请单 status='approved' + 写回审批元数据
          db.run(`UPDATE inventory_supplementary_applications SET status = ?, update_time = ? WHERE id = ?`,
            ['approved', now, requestId]);
          return { success: true, message: `补录申请单 ${appCode} 已审批通过并入库` };
        } else {
          // rejected / cancelled / voided → UPDATE 申请单 + inventory_stock status='cancelled'
          db.run(`UPDATE inventory_supplementary_applications SET status = ?, update_time = ? WHERE id = ?`,
            [appStatus, now, requestId]);
          db.run(`UPDATE inventory_stock SET status = 'cancelled', update_time = ? WHERE business_id = ? AND status = 'pending'`,
            [now, requestId]);
          return { success: true, message: `补录申请单 ${appCode} 状态已更新为 ${appStatus}` };
        }
      } catch (e) {
        console.error('更新作物入库补录失败:', e);
        return { success: false, message: '补录联动失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    // ========== 指标/公告审批（2种）==========
    case 'indicator':
      if (updateIndicator(db, requestId, status === 'approved' ? 'published' : status, approvalCode, extra)) {
        return { success: true, message: '指标状态已更新' };
      }
      break;

    case 'announcement':
      if (updateAnnouncement(db, requestId, status === 'approved' ? 'published' : status, approvalCode, extra)) {
        return { success: true, message: '公告状态已更新' };
      }
      break;

    // ========== 成本审批（2种）==========
    case 'budget_create':
    case 'budget_adjust':
      if (updateBudget(db, requestId, status, approvalCode, extra)) {
        return { success: true, message: '预算状态已更新' };
      }
      break;

    // ========== HR审批（11种）==========
    case 'leave':
      // 请假记录
      try {
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='leave_records'");
        if (tableCheck.step()) {
          tableCheck.free();
          db.run(`
            UPDATE leave_records SET
              status = ?,
              approval_code = ?,
              approved_at = ?,
              update_time = ?
            WHERE id = ?
          `, [status, approvalCode, now, now, requestId]);
          
          // 额度服务调用
          if (action === 'approved') {
            // 审批通过，扣减额度
            const leaveRecord = db.prepare('SELECT * FROM leave_records WHERE id = ?').get(requestId);
            if (leaveRecord) {
              deductLeaveQuota(db, leaveRecord);
            }
          } else if (action === 'rejected') {
            // 审批拒绝，释放冻结额度
            const leaveRecord = db.prepare('SELECT * FROM leave_records WHERE id = ?').get(requestId);
            if (leaveRecord) {
              releaseLeaveQuota(db, leaveRecord);
            }
          }
          
          return { success: true, message: '请假记录状态已更新' };
        }
        tableCheck.free();
      } catch (e) {
        console.error('更新请假记录失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'overtime':
      // 加班记录
      try {
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='overtime_records'");
        if (tableCheck.step()) {
          tableCheck.free();
          db.run(`
            UPDATE overtime_records SET
              status = ?,
              approval_code = ?,
              approved_at = ?,
              update_time = ?
            WHERE id = ?
          `, [status, approvalCode, now, now, requestId]);
          
          // 额度服务调用
          if (action === 'approved') {
            // 审批通过，扣减加班额度
            const overtimeRecord = db.prepare('SELECT * FROM overtime_records WHERE id = ?').get(requestId);
            if (overtimeRecord) {
              deductOvertimeQuota(db, overtimeRecord);
            }
          }
          
          return { success: true, message: '加班记录状态已更新' };
        }
        tableCheck.free();
      } catch (e) {
        console.error('更新加班记录失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'resign':
      // 2026-10-10 重构：原实现只更新 employees 表，且**无论通过/驳回都置为 resigned**
      //   （驳回也把员工改离职！），并从不更新 resignation_records → 离职页面状态不同步。
      //   新语义：requestId = resignation_records.id；记录按结果流转；仅通过时联动员工表。
      try {
        const resignRec = db.prepare('SELECT id, worker_id FROM resignation_records WHERE id = ?').get(requestId) as { id: string; worker_id: string } | undefined;
        if (!resignRec) {
          return { success: false, message: `离职记录 ${requestId} 不存在，无法更新` };
        }
        const resignLabel = status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : status === 'cancelled' ? '已取消' : '待审批';
        const resignActor = readApprovalActor(db, approvalCode);
        db.run(`
          UPDATE resignation_records SET
            status = ?, status_label = ?, approver = ?, approve_time = ?, update_time = ?
          WHERE id = ?
        `, [status, resignLabel, resignActor.name || '', now, now, requestId]);
        // 仅审批通过时联动员工表（置离职 + 删额度）
        if (status === 'approved' && resignRec.worker_id) {
          updateEmployee(db, resignRec.worker_id, 'resigned', approvalCode, { resignedAt: now });
          deleteEmployeeQuotas(db, resignRec.worker_id);
        }
        return { success: true, message: '离职状态已更新' };
      } catch (e) {
        console.error('更新离职状态失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'recruitment':
      // 2026-10-10 修复：原实现 UPDATE temp_tasks（错表——招聘记录在 recruitment_records），
      //   属"幽灵路径"：目标行永不匹配却恒返回成功，审批结果从未落到招聘单。
      try {
        const recruitLabel = status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : status === 'cancelled' ? '已取消' : '待审批';
        const recruitActor = readApprovalActor(db, approvalCode);
        db.run(`
          UPDATE recruitment_records SET
            status = ?, status_label = ?, approver = ?, approve_time = ?, update_time = ?
          WHERE id = ?
        `, [status, recruitLabel, recruitActor.name || '', now, now, requestId]);
        return { success: true, message: '招聘状态已更新' };
      } catch (e) {
        console.error('更新招聘状态失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'onboarding':
      // 2026-10-10 修复：原实现仅 updateEmployee('onboarding_completed')——不更新
      //   onboarding_records（页面不同步），且向员工表写一个不存在的状态值。
      //   新语义（对齐 labor 活跃页字典：pending/processing/onboarded）：
      //   通过 → 'onboarded'（已入职）；驳回 → 'processing'（退回办理中，可修正重提）。
      //   员工档案自动建档属后续功能，暂不动 employees。
      try {
        const onboardStatus = status === 'approved' ? 'onboarded' : status === 'rejected' ? 'processing' : status;
        db.run(`
          UPDATE onboarding_records SET
            status = ?, approved_at = ?, update_time = ?
          WHERE id = ?
        `, [onboardStatus, now, now, requestId]);
        return { success: true, message: '入职记录状态已更新' };
      } catch (e) {
        console.error('更新入职状态失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'attendance_repair':
      if (updateLaborRecord(db, requestId, status, approvalCode, extra)) {
        return { success: true, message: '考勤补录状态已更新' };
      }
      break;

    case 'salary_adjustment':
      if (updateEmployee(db, requestId, 'salary_adjusted', approvalCode, extra)) {
        return { success: true, message: '员工调薪状态已更新' };
      }
      break;

    case 'contract_renewal':
      // 2026-10-10 修复：原实现 UPDATE contracts（错表——续签记录在 contract_renewal_records，
      //   且 contracts 表 0 行）→ 审批结果从未落到续签单（幽灵成功）。
      try {
        const renewalLabel = status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : status === 'cancelled' ? '已取消' : '待审批';
        const renewalActor = readApprovalActor(db, approvalCode);
        db.run(`
          UPDATE contract_renewal_records SET
            status = ?, status_label = ?, approver = ?, approve_time = ?, update_time = ?
          WHERE id = ?
        `, [status, renewalLabel, renewalActor.name || '', now, now, requestId]);
        return { success: true, message: '合同续签状态已更新' };
      } catch (e) {
        console.error('更新合同续签失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'salary_budget':
      // 2026-10-10 修复：原实现 UPDATE salary_budgets——该表不存在（实际 salary_budget_records），
      //   审批处理必然失败/无落点。
      try {
        const salaryBudgetLabel = status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : status === 'cancelled' ? '已取消' : '待审批';
        db.run(`
          UPDATE salary_budget_records SET
            status = ?, status_label = ?, update_time = ?
          WHERE id = ?
        `, [status, salaryBudgetLabel, now, requestId]);
        return { success: true, message: '工资预算状态已更新' };
      } catch (e) {
        console.error('更新工资预算失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'transfer':
      if (updateEmployee(db, requestId, 'transferred', approvalCode, extra)) {
        return { success: true, message: '员工转岗状态已更新' };
      }
      break;

    // 退料单
    case 'return':
      try {
        // 2026-09-27 审计修复：原实现 UPDATE material_requests（错表）——退料单 status 永不流转。
        // 改为更新 material_returns（按 id 匹配，兜底按 code），并回写审批人/审批时间/驳回原因。
        const actor = readApprovalActor(db, approvalCode);
        // 2026-09-28 审批流接入：**审批通过才恢复退料库存**（pending 不占库存）。
        // 失败即返回 success:false —— 调用方按"库存联动硬失败"回滚审批终态，
        // 避免出现"审批已通过但库存永远没加回仓库"的账实不符。
        const approved = status === 'approved' || status === 'partially_approved';
        const revoked = status === 'cancelled' || status === 'rejected';
        if (approved) {
          const r = applyReturnStockOnApproval(db, requestId, actor.name || '审批');
          if (!r.changed && r.message) {
            return { success: false, message: `退料库存恢复未执行：${r.message}` };
          }
        } else if (revoked) {
          // 2026-09-28 修复：审批先通过（库存已入库）后被取消/驳回 → 必须回滚库存，
          // 否则出现"审批撤销了但物料还留在仓库"的账实不符
          const r = revertReturnStockOnApproval(db, requestId, actor.name || '审批');
          if (!r.changed && r.message) {
            return { success: false, message: `退料库存回滚未执行：${r.message}` };
          }
        }
        // 状态文案与前端枚举保持一致（此前写 '已批准/已拒绝/已取消'，与前端筛选器不匹配）
        const stText = approved ? '已审批'
          : status === 'rejected' ? '已驳回'
          : status === 'cancelled' ? '已作废' : '待审批';
        db.run(`
          UPDATE material_returns SET
            status = ?,
            statusClass = ?,
            reviewer = COALESCE(?, reviewer),
            reviewDate = COALESCE(?, reviewDate),
            rejectReason = CASE WHEN ? = 'rejected' THEN COALESCE(?, rejectReason) ELSE rejectReason END,
            update_time = ?
          WHERE id = ? OR code = ?
        `, [stText, status, actor.name, actor.time, status, actor.comment, now, requestId, requestId]);
        return { success: true, message: '退料单状态已更新' };
      } catch (e) {
        // 库存恢复异常（物料不存在 / 批次无法回补等）→ 显式失败让调用方回滚审批
        console.error('更新退料单失败:', e);
        return { success: false, message: '退料单联动失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    default:
      console.warn(`未知的业务类型: ${businessType}`);
      return { success: false, message: `未知的业务类型: ${businessType}` };
  }

  return { success: false, message: '更新失败' };
}

// ============================================
// API 路由
// ============================================

/**
 * 审批联动更新
 * POST /api/approval-linkage/update
 */
router.post('/update', (req, res) => {
  try {
    const db = getDatabase();
    const { approvalId, approvalCode, action, businessLink, operatorId, operatorName, extra } = req.body;

    if (!approvalId || !action || !businessLink) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const businessType = businessLink.type;
    const requestId = businessLink.requestId;
    // 从 businessLink 中提取 approvalAction 用于区分编辑审批和作废审批
    const approvalAction = businessLink.approvalAction as string | undefined;
    // 合并 extra 参数，包含 approvalAction
    const mergedExtra = { ...extra, approvalAction };

    console.log(`【审批联动】开始更新业务表: ${businessType}/${requestId}, 动作: ${action}, approvalAction: ${approvalAction}`);

    // 更新业务表
    const result = updateBusinessTable(
      db,
      businessType,
      requestId,
      action,
      approvalCode || '',
      mergedExtra
    );

    if (result.success) {
      // 记录操作日志
      logOperation(
        db,
        operatorId || 'system',
        operatorName || '系统',
        `approval_${action}`,
        'approval',
        businessType,
        requestId,
        `审批${action === 'approved' ? '通过' : action === 'rejected' ? '拒绝' : '取消'}，更新业务表: ${result.message}`
      );

      saveDatabase();

      res.json({
        success: true,
        message: result.message,
        data: {
          businessType,
          requestId,
          action,
          approvalCode,
        },
      });
    } else {
      res.json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    console.error('审批联动更新失败:', error);
    res.status(500).json({ success: false, error: '审批联动更新失败' });
  }
});

/**
 * 批量审批联动更新
 * POST /api/approval-linkage/batch-update
 */
router.post('/batch-update', (req, res) => {
  try {
    const db = getDatabase();
    const { approvals, operatorId, operatorName } = req.body;

    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      return res.status(400).json({ success: false, error: '缺少审批列表' });
    }

    const results: { id: string; success: boolean; message: string }[] = [];

    for (const item of approvals) {
      const { approvalId, approvalCode, action, businessLink, extra } = item;
      const businessType = businessLink?.type;
      const requestId = businessLink?.requestId;

      if (!businessType || !requestId) {
        results.push({ id: approvalId, success: false, message: '业务链接信息不完整' });
        continue;
      }

      const result = updateBusinessTable(
        db,
        businessType,
        requestId,
        action,
        approvalCode || '',
        extra
      );

      if (result.success) {
        logOperation(
          db,
          operatorId || 'system',
          operatorName || '系统',
          `approval_${action}`,
          'approval',
          businessType,
          requestId,
          `批量审批${action}，更新业务表: ${result.message}`
        );
      }

      results.push({ id: approvalId, ...result });
    }

    saveDatabase();

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `批量联动更新完成：成功 ${successCount}，失败 ${failCount}`,
      data: results,
    });
  } catch (error) {
    console.error('批量审批联动更新失败:', error);
    res.status(500).json({ success: false, error: '批量审批联动更新失败' });
  }
});

/**
 * 获取业务表更新状态（用于调试）
 * GET /api/approval-linkage/status/:businessType/:requestId
 */
router.get('/status/:businessType/:requestId', (req, res) => {
  try {
    const db = getDatabase();
    const { businessType, requestId } = req.params;

    let tableName = '';
    const idColumn = 'id';
    const statusColumn = 'status';

    switch (businessType) {
      case 'material':
      case 'purchase':
      case 'return':
        tableName = 'material_requests';
        break;
      case 'production':
        tableName = 'production_plans';
        break;
      case 'task_dispatch':
      case 'task_change':
        tableName = 'farm_tasks';
        break;
      case 'harvest':
        tableName = 'harvest_records';
        break;
      case 'order_create':
      case 'order_change':
        tableName = 'crop_orders';
        break;
      case 'inspection_issue':
        tableName = 'inspections';
        break;
      case 'issue_resolve':
        tableName = 'problems';
        break;
      case 'material_inbound':
      case 'material_transfer':
      case 'seed_source_inbound':
      case 'crop_storage':
        tableName = 'inventory';
        break;
      case 'seedling_plan':
        tableName = 'seedlings';
        break;
      case 'planting_plan':
        tableName = 'plantings';
        break;
      case 'production_batch':
      case 'batch_change':
      case 'batch_void':
        tableName = 'crop_instances';
        break;
      case 'leave':
        tableName = 'leave_records';
        break;
      case 'overtime':
        tableName = 'overtime_records';
        break;
      case 'resign':
      case 'onboarding':
      case 'salary_adjustment':
      case 'transfer':
        tableName = 'employees';
        break;
      case 'contract_renewal':
        tableName = 'contracts';
        break;
      case 'salary_budget':
        tableName = 'salary_budgets';
        break;
      case 'budget_create':
      case 'budget_adjust':
        tableName = 'budgets';
        break;
      case 'indicator':
        tableName = 'indicators';
        break;
      case 'announcement':
        tableName = 'announcements';
        break;
      default:
        return res.status(400).json({ success: false, error: `未知的业务类型: ${businessType}` });
    }

    const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE ${idColumn} = ?`);
    stmt.bind([requestId]);

    if (stmt.step()) {
      const record = stmt.getAsObject();
      stmt.free();
      res.json({ success: true, data: record });
    } else {
      stmt.free();
      res.status(404).json({ success: false, error: '记录不存在' });
    }
  } catch (error) {
    console.error('获取业务表状态失败:', error);
    res.status(500).json({ success: false, error: '获取业务表状态失败' });
  }
});

export default router;
