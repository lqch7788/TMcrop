/**
 * 审批联动路由
 * 审批完成时自动更新业务表状态
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db/index';
import { deductLeaveQuota, deductOvertimeQuota, initEmployeeQuotas, deleteEmployeeQuotas, releaseLeaveQuota } from '../services/leaveQuotaService';

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
 * 更新物料申请状态
 */
function updateMaterialRequest(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    db.run(`
      UPDATE material_requests SET
        status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
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
    db.run(`
      UPDATE purchase_plans SET
        status = ?,
        approval_status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, status, approvalCode, now, now, id]);
    return true;
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
        update_time = ?
      WHERE id = ?
    `, [planStatus, planStatus, now, id]);
    return true;
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
    // rejected -> cancelled (已作废)
    let solutionStatus = status;
    if (status === 'approved') {
      solutionStatus = 'published';
    } else if (status === 'rejected' || status === 'cancelled') {
      solutionStatus = 'cancelled';
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
    return true;
  } catch (e) {
    console.error('更新技术方案失败:', e);
    return false;
  }
}

/**
 * 更新农事任务状态
 */
function updateFarmTask(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
  try {
    const now = new Date().toISOString();
    db.run(`
      UPDATE farm_tasks SET
        status = ?,
        approval_code = ?,
        approved_at = ?,
        update_time = ?
      WHERE id = ?
    `, [status, approvalCode, now, now, id]);
    return true;
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
  action: 'approved' | 'rejected' | 'cancelled' | 'partially_approved',
  approvalCode: string,
  extra?: Record<string, unknown>
): { success: boolean; message: string } {
  const now = new Date().toISOString();
  let status = 'pending';
  let finalStatus = 'pending';

  switch (action) {
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
      break;

    case 'material_inbound':
      // 物料入库使用 inventory 表
      try {
        db.run(`
          UPDATE inventory SET
            status = ?,
            approval_code = ?,
            inbound_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '物料入库状态已更新' };
      } catch (e) {
        console.error('更新物料入库失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'material_transfer':
      // 库存调拨使用 inventory 表
      try {
        db.run(`
          UPDATE inventory SET
            status = ?,
            approval_code = ?,
            transfer_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '库存调拨状态已更新' };
      } catch (e) {
        console.error('更新库存调拨失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
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
      break;

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
      if (updateTechSolution(db, requestId, action, approvalCode, extra)) {
        return { success: true, message: '技术方案状态已更新' };
      }
      break;

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
      try {
        db.run(`
          UPDATE seedlings SET
            status = ?,
            approval_code = ?,
            supplementary_approved_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '育苗补录状态已更新' };
      } catch (e) {
        console.error('更新育苗补录失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'crop_storage':
      try {
        db.run(`
          UPDATE inventory SET
            status = ?,
            approval_code = ?,
            supplementary_approved_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '作物入库补录状态已更新' };
      } catch (e) {
        console.error('更新作物入库补录失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
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
      if (updateEmployee(db, requestId, 'resigned', approvalCode, extra)) {
        // 额度服务调用 - 离职审批通过后删除员工额度
        if (action === 'approved' && extra && extra.worker_id) {
          deleteEmployeeQuotas(db, extra.worker_id as string);
        }
        return { success: true, message: '员工离职状态已更新' };
      }
      break;

    case 'recruitment':
      // 招聘使用临时任务表或专门表
      try {
        db.run(`
          UPDATE temp_tasks SET
            status = ?,
            approval_code = ?,
            approved_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '招聘状态已更新' };
      } catch (e) {
        console.error('更新招聘状态失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'onboarding':
      if (updateEmployee(db, requestId, 'onboarding_completed', approvalCode, extra)) {
        // 额度服务调用 - 入职审批通过后初始化员工额度
        if (action === 'approved' && extra && extra.worker_id) {
          initEmployeeQuotas(db, extra.worker_id as string, (extra.worker_name as string) || '', new Date().getFullYear());
        }
        return { success: true, message: '员工入职状态已更新' };
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
      // 合同续签
      try {
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contracts'");
        if (tableCheck.step()) {
          tableCheck.free();
          db.run(`
            UPDATE contracts SET
              status = ?,
              renewal_approval_code = ?,
              renewed_at = ?,
              update_time = ?
            WHERE id = ?
          `, ['renewed', approvalCode, now, now, requestId]);
          return { success: true, message: '合同续签状态已更新' };
        }
        tableCheck.free();
      } catch (e) {
        console.error('更新合同续签失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
      }
      break;

    case 'salary_budget':
      // 工资预算
      try {
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='salary_budgets'");
        if (tableCheck.step()) {
          tableCheck.free();
          db.run(`
            UPDATE salary_budgets SET
              status = ?,
              approval_code = ?,
              approved_at = ?,
              update_time = ?
            WHERE id = ?
          `, [status, approvalCode, now, now, requestId]);
          return { success: true, message: '工资预算状态已更新' };
        }
        tableCheck.free();
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
        db.run(`
          UPDATE material_requests SET
            status = ?,
            approval_code = ?,
            approved_at = ?,
            update_time = ?
          WHERE id = ?
        `, [status, approvalCode, now, now, requestId]);
        return { success: true, message: '退料单状态已更新' };
      } catch (e) {
        console.error('更新退料单失败:', e);
        return { success: false, message: '数据库更新失败: ' + (e instanceof Error ? e.message : String(e)) };
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
