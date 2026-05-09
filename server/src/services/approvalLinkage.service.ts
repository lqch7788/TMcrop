/**
 * 审批联动服务
 * 审批完成时自动更新业务表状态
 */

import { getDatabase, saveDatabase } from '../db';
import { deductLeaveQuota, deductOvertimeQuota, initEmployeeQuotas, deleteEmployeeQuotas, releaseLeaveQuota } from './leaveQuotaService';

export interface BusinessLink {
  type: string;
  requestId: string;
  requestCode: string;
  approvalAction?: string;
  [key: string]: unknown;
}

export interface ApprovalLinkageResult {
  success: boolean;
  message: string;
}

export class ApprovalLinkageService {
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private logOperation(
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
        this.generateId('LOG'),
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

  private updateMaterialRequest(db: any, id: string, status: string, approvalCode: string): boolean {
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

  private updatePurchasePlan(db: any, id: string, status: string, approvalCode: string): boolean {
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

  private updateProductionPlan(db: any, id: string, action: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
    try {
      const now = new Date().toISOString();
      let planStatus = action;

      if (action === 'approved') {
        if (extra?.approvalAction === 'void') {
          planStatus = 'cancelled';
        } else {
          planStatus = 'published';
        }
      } else if (action === 'rejected' || action === 'cancelled') {
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

  private updateTechSolution(db: any, id: string, action: string, approvalCode: string): boolean {
    try {
      const now = new Date().toISOString();
      let solutionStatus = action;

      if (action === 'approved') {
        solutionStatus = 'published';
      } else if (action === 'rejected' || action === 'cancelled') {
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

  private updateFarmTask(db: any, id: string, status: string, approvalCode: string): boolean {
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

  private updateHarvestRecord(db: any, id: string, status: string, approvalCode: string): boolean {
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

  private updateCropOrder(db: any, id: string, status: string, approvalCode: string): boolean {
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

  private updateInspection(db: any, id: string, status: string, approvalCode: string): boolean {
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

  private updateProblem(db: any, id: string, status: string, approvalCode: string): boolean {
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

  private updateLaborRecord(db: any, id: string, status: string, approvalCode: string): boolean {
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

  private updateEmployee(db: any, id: string, status: string, approvalCode: string, extra?: Record<string, unknown>): boolean {
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

  updateBusinessTable(
    businessType: string,
    requestId: string,
    action: 'approved' | 'rejected' | 'cancelled' | 'partially_approved',
    approvalCode: string,
    extra?: Record<string, unknown>
  ): ApprovalLinkageResult {
    const db = getDatabase();
    const now = new Date().toISOString();
    let status = 'pending';

    switch (action) {
      case 'approved':
        status = 'approved';
        break;
      case 'rejected':
        status = 'rejected';
        break;
      case 'cancelled':
        status = 'cancelled';
        break;
      case 'partially_approved':
        status = 'partially_approved';
        break;
    }

    // 根据业务类型更新对应的表
    switch (businessType) {
      case 'material':
        if (this.updateMaterialRequest(db, requestId, status, approvalCode)) {
          return { success: true, message: '物料申请状态已更新' };
        }
        break;

      case 'purchase':
        if (this.updatePurchasePlan(db, requestId, status, approvalCode)) {
          return { success: true, message: '采购计划状态已更新' };
        }
        break;

      case 'material_inbound':
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
          return { success: false, message: '数据库更新失败' };
        }

      case 'material_transfer':
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
          return { success: false, message: '数据库更新失败' };
        }

      case 'seed_source_inbound':
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
          return { success: false, message: '数据库更新失败' };
        }

      case 'seedling_plan':
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
          return { success: false, message: '数据库更新失败' };
        }

      case 'planting_plan':
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
          return { success: false, message: '数据库更新失败' };
        }

      case 'order_create':
      case 'order_change':
        if (this.updateCropOrder(db, requestId, status, approvalCode)) {
          return { success: true, message: '订单状态已更新' };
        }
        break;

      case 'production':
        if (this.updateProductionPlan(db, requestId, action, approvalCode, extra)) {
          return { success: true, message: '生产计划状态已更新' };
        }
        break;

      case 'production_batch':
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
          return { success: false, message: '数据库更新失败' };
        }

      case 'batch_change':
      case 'batch_void':
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
          return { success: false, message: '数据库更新失败' };
        }

      case 'tech_solution':
        if (this.updateTechSolution(db, requestId, action, approvalCode)) {
          return { success: true, message: '技术方案状态已更新' };
        }
        break;

      case 'task_dispatch':
      case 'task_change':
        if (this.updateFarmTask(db, requestId, status, approvalCode)) {
          return { success: true, message: '农事任务状态已更新' };
        }
        break;

      case 'inspection_issue':
        if (this.updateInspection(db, requestId, status, approvalCode)) {
          return { success: true, message: '巡查问题状态已更新' };
        }
        break;

      case 'issue_resolve':
        if (this.updateProblem(db, requestId, 'resolved', approvalCode)) {
          return { success: true, message: '问题整改状态已更新' };
        }
        break;

      case 'harvest':
        if (this.updateHarvestRecord(db, requestId, status, approvalCode)) {
          return { success: true, message: '采收申请状态已更新' };
        }
        break;

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
          return { success: false, message: '数据库更新失败' };
        }

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
          return { success: false, message: '数据库更新失败' };
        }

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
          return { success: false, message: '数据库更新失败' };
        }

      case 'indicator':
        try {
          const indicatorStatus = status === 'approved' ? 'published' : status;
          db.run(`
            UPDATE indicators SET
              status = ?,
              approval_code = ?,
              published_at = ?,
              update_time = ?
            WHERE id = ?
          `, [indicatorStatus, approvalCode, now, now, requestId]);
          return { success: true, message: '指标状态已更新' };
        } catch (e) {
          return { success: false, message: '数据库更新失败' };
        }

      case 'announcement':
        try {
          const announceStatus = status === 'approved' ? 'published' : status;
          db.run(`
            UPDATE announcements SET
              status = ?,
              approval_code = ?,
              published_at = ?,
              update_time = ?
            WHERE id = ?
          `, [announceStatus, approvalCode, now, now, requestId]);
          return { success: true, message: '公告状态已更新' };
        } catch (e) {
          return { success: false, message: '数据库更新失败' };
        }

      case 'budget_create':
      case 'budget_adjust':
        try {
          db.run(`
            UPDATE budgets SET
              status = ?,
              approval_code = ?,
              approved_at = ?,
              update_time = ?
            WHERE id = ?
          `, [status, approvalCode, now, now, requestId]);
          return { success: true, message: '预算状态已更新' };
        } catch (e) {
          return { success: false, message: '数据库更新失败' };
        }

      case 'leave':
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

            if (action === 'approved') {
              const stmt = db.prepare('SELECT * FROM leave_records WHERE id = ?');
              stmt.bind([requestId]);
              if (stmt.step()) {
                const leaveRecord = stmt.getAsObject();
                deductLeaveQuota(db, leaveRecord);
              }
              stmt.free();
            } else if (action === 'rejected') {
              const stmt = db.prepare('SELECT * FROM leave_records WHERE id = ?');
              stmt.bind([requestId]);
              if (stmt.step()) {
                const leaveRecord = stmt.getAsObject();
                releaseLeaveQuota(db, leaveRecord);
              }
              stmt.free();
            }

            return { success: true, message: '请假记录状态已更新' };
          }
          tableCheck.free();
        } catch (e) {
          return { success: false, message: '数据库更新失败' };
        }
        break;

      case 'overtime':
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

            if (action === 'approved') {
              const stmt = db.prepare('SELECT * FROM overtime_records WHERE id = ?');
              stmt.bind([requestId]);
              if (stmt.step()) {
                const overtimeRecord = stmt.getAsObject();
                deductOvertimeQuota(db, overtimeRecord);
              }
              stmt.free();
            }

            return { success: true, message: '加班记录状态已更新' };
          }
          tableCheck.free();
        } catch (e) {
          return { success: false, message: '数据库更新失败' };
        }
        break;

      case 'resign':
        if (this.updateEmployee(db, requestId, 'resigned', approvalCode, extra)) {
          if (action === 'approved' && extra && extra.worker_id) {
            deleteEmployeeQuotas(db, extra.worker_id as string);
          }
          return { success: true, message: '员工离职状态已更新' };
        }
        break;

      case 'recruitment':
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
          return { success: false, message: '数据库更新失败' };
        }

      case 'onboarding':
        if (this.updateEmployee(db, requestId, 'onboarding_completed', approvalCode, extra)) {
          if (action === 'approved' && extra && extra.worker_id) {
            initEmployeeQuotas(db, extra.worker_id as string, (extra.worker_name as string) || '', new Date().getFullYear());
          }
          return { success: true, message: '员工入职状态已更新' };
        }
        break;

      case 'attendance_repair':
        if (this.updateLaborRecord(db, requestId, status, approvalCode)) {
          return { success: true, message: '考勤补录状态已更新' };
        }
        break;

      case 'salary_adjustment':
        if (this.updateEmployee(db, requestId, 'salary_adjusted', approvalCode)) {
          return { success: true, message: '员工调薪状态已更新' };
        }
        break;

      case 'contract_renewal':
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
          return { success: false, message: '数据库更新失败' };
        }
        break;

      case 'salary_budget':
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
          return { success: false, message: '数据库更新失败' };
        }
        break;

      case 'transfer':
        if (this.updateEmployee(db, requestId, 'transferred', approvalCode)) {
          return { success: true, message: '员工转岗状态已更新' };
        }
        break;

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
          return { success: false, message: '数据库更新失败' };
        }

      default:
        return { success: false, message: `未知的业务类型: ${businessType}` };
    }

    return { success: false, message: '更新失败' };
  }

  update(
    approvalId: string,
    approvalCode: string,
    action: 'approved' | 'rejected' | 'cancelled' | 'partially_approved',
    businessLink: BusinessLink,
    operatorId?: string,
    operatorName?: string,
    extra?: Record<string, unknown>
  ): ApprovalLinkageResult {
    const db = getDatabase();
    const businessType = businessLink.type;
    const requestId = businessLink.requestId;
    const approvalAction = businessLink.approvalAction;
    const mergedExtra = { ...extra, approvalAction };

    console.log(`【审批联动】开始更新业务表: ${businessType}/${requestId}, 动作: ${action}, approvalAction: ${approvalAction}`);

    const result = this.updateBusinessTable(businessType, requestId, action, approvalCode || '', mergedExtra);

    if (result.success) {
      this.logOperation(
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
    }

    return result;
  }

  batchUpdate(
    approvals: Array<{
      approvalId: string;
      approvalCode: string;
      action: 'approved' | 'rejected' | 'cancelled' | 'partially_approved';
      businessLink: BusinessLink;
      extra?: Record<string, unknown>;
    }>,
    operatorId?: string,
    operatorName?: string
  ): { successCount: number; failCount: number; results: Array<{ id: string; success: boolean; message: string }> } {
    const db = getDatabase();
    const results: { id: string; success: boolean; message: string }[] = [];

    for (const item of approvals) {
      const { approvalId, approvalCode, action, businessLink, extra } = item;
      const businessType = businessLink?.type;
      const requestId = businessLink?.requestId;

      if (!businessType || !requestId) {
        results.push({ id: approvalId, success: false, message: '业务链接信息不完整' });
        continue;
      }

      const result = this.updateBusinessTable(businessType, requestId, action, approvalCode || '', extra);

      if (result.success) {
        this.logOperation(
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

    return { successCount, failCount, results };
  }

  getBusinessTableStatus(businessType: string, requestId: string): Record<string, unknown> | null {
    const db = getDatabase();

    let tableName = '';
    const idColumn = 'id';

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
        throw new Error(`未知的业务类型: ${businessType}`);
    }

    const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE ${idColumn} = ?`);
    stmt.bind([requestId]);

    if (stmt.step()) {
      const record = stmt.getAsObject();
      stmt.free();
      return record;
    }

    stmt.free();
    return null;
  }
}

export const approvalLinkageService = new ApprovalLinkageService();
