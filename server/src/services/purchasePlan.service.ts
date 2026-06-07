/**
 * 采购计划 Service（V3.0 重构）
 * 路由层只做 HTTP 适配，所有业务逻辑、状态校验、字段映射、数据访问都在本文件
 *
 * 数据流：HTTP Route → PurchasePlanService → SQLite DB
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { safeJsonParse } from '../utils/safeJson';

// ============================================================
// 类型定义
// ============================================================

/** 状态白名单 */
export const PURCHASE_PLAN_STATUSES = [
  'draft', 'pending', 'approved', 'purchasing', 'completed', 'cancelled',
] as const;
export type PurchasePlanStatus = typeof PURCHASE_PLAN_STATUSES[number];

/** 审批状态白名单 */
export const PURCHASE_APPROVAL_STATUSES = [
  'pending', 'approved', 'rejected',
] as const;
export type PurchaseApprovalStatus = typeof PURCHASE_APPROVAL_STATUSES[number];

/** 采购类型白名单 */
export const PURCHASE_TYPES = [
  'production', 'urgent', 'routine', 'material', 'safety', 'equipment', 'other',
] as const;
export type PurchaseType = typeof PURCHASE_TYPES[number];

/** 优先级白名单 */
export const PURCHASE_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
export type PurchasePriority = typeof PURCHASE_PRIORITIES[number];

/** 物料明细 */
export interface PurchasePlanItemInput {
  id?: string;
  materialId?: string;
  materialCode?: string;
  materialName?: string;
  category?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  estimatedPrice?: number;
  estimatedTotalPrice?: number;
  supplier?: string;
  location?: string;
  batchNo?: string;
  productionDate?: string;
  expiryDate?: string;
  purpose?: string;
  remark?: string;
  relatedBatchCode?: string;
}

/** 创建采购计划入参 */
export interface CreatePurchasePlanInput {
  id?: string;
  purchaseApplicationCode?: string;
  relatedBatchCode?: string;
  purchaseType: PurchaseType | string;
  applicant: string;
  applicantId?: string;
  applicantDepartment?: string;
  applyDate?: string;
  requiredDate?: string;
  priority?: PurchasePriority | string;
  status?: PurchasePlanStatus | string;
  approvalStatus?: PurchaseApprovalStatus | string;
  remarks?: string;
  approvalPerson?: string;
  attachments?: unknown[];
  items?: PurchasePlanItemInput[];
  totalAmount?: number;
  executionStatus?: string; // 采购执行状态（4 档白名单校验在 updateExecutionStatus）
  otherBatchReason?: string; // 关联批次=其他时的说明
}

/** 更新采购计划入参（部分字段） */
export type UpdatePurchasePlanInput = Partial<CreatePurchasePlanInput>;

/** 列表查询入参 */
export interface PurchasePlanQuery {
  planType?: string;
  status?: string;
  approvalStatus?: string;
  departmentName?: string;
  applicantName?: string;
  priority?: string;
  page?: number | string;
  limit?: number | string;
}

/** 业务结果 */
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

// ============================================================
// 字典映射（单一数据源）
// ============================================================

const STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已通过',
  in_progress: '执行中',
  purchasing: '采购中',
  completed: '已完成',
  cancelled: '已作废',
  rejected: '已拒绝',
};

const PRIORITY_TEXT: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  normal: '中',
  low: '低',
};

const PURCHASE_TYPE_TEXT: Record<string, string> = {
  production: '生产物资采购',
  urgent: '紧急采购',
  routine: '常规采购',
  safety: '劳保用品',
  material: '通用物资',
  equipment: '设备采购',
  other: '其他',
};

/** 允许删除的状态集合（草稿/待审批/已拒绝） */
const DELETABLE_STATUSES: ReadonlySet<string> = new Set(['draft', 'pending', 'rejected']);

/** 采购执行状态白名单 */
const EXECUTION_STATUSES: ReadonlySet<string> = new Set([
  'pending_execution',  // 待执行
  'purchasing',         // 采购中
  'completed',          // 已完成
  'cancelled',          // 已取消
]);

/** 允许编辑的状态集合（排除已审批、采购中、已完成、已取消） */
const EDITABLE_STATUSES: ReadonlySet<string> = new Set(['draft', 'pending', 'rejected']);

// ============================================================
// 字段映射（camelCase → snake_case）
// ============================================================

const FIELD_MAP: Record<string, string> = {
  planCode: 'plan_code',
  planTitle: 'plan_title',
  planType: 'plan_type',
  purchaseType: 'plan_type',
  departmentId: 'department_id',
  departmentName: 'department_name',
  applicantDepartment: 'department_name',
  applicantId: 'applicant_id',
  applicantName: 'applicant_name',
  applyDate: 'apply_date',
  expectedDate: 'expected_date',
  requiredDate: 'expected_date',
  supplierId: 'supplier_id',
  supplierName: 'supplier_name',
  totalAmount: 'total_amount',
  priority: 'priority',
  status: 'status',
  approvalStatus: 'approval_status',
  executionStatus: 'execution_status',
  remarks: 'remarks',
  remark: 'remarks',
  otherBatchReason: 'otherBatchReason',
  applicant: 'applicant_name',  // 前端字段名 applicant → 实际列 applicant_name
  approvalPerson: 'approval_person',
  relatedBatchCode: 'related_batch_code',
  createBy: 'create_by',
  createTime: 'create_time',
  updateTime: 'update_time',
};

const EXCLUDE_FIELDS = new Set(['id', 'plan_code', 'create_time', 'create_by']);

// ============================================================
// Service 类
// ============================================================

export class PurchasePlanService {
  // ----------------------------------------------------------
  // 字典查询（供前端/路由调用）
  // ----------------------------------------------------------

  getStatusText(status: string): string {
    return STATUS_TEXT[status] || status;
  }

  getPriorityText(priority: string): string {
    return PRIORITY_TEXT[priority] || priority;
  }

  getPurchaseTypeText(type: string): string {
    return PURCHASE_TYPE_TEXT[type] || type;
  }

  getPurchaseTypeOptions(): Array<{ value: string; label: string }> {
    return PURCHASE_TYPES.map(value => ({
      value,
      label: PURCHASE_TYPE_TEXT[value] || value,
    }));
  }

  getPriorityOptions(): Array<{ value: string; label: string }> {
    return PURCHASE_PRIORITIES.map(value => ({
      value,
      label: PRIORITY_TEXT[value] || value,
    }));
  }

  getStatusOptions(): Array<{ value: string; label: string }> {
    return PURCHASE_PLAN_STATUSES.map(value => ({
      value,
      label: STATUS_TEXT[value] || value,
    }));
  }

  canDelete(plan: Record<string, unknown> | null | undefined): boolean {
    if (!plan) return false;
    const status = String(plan.status || '');
    const approval = String(plan.approvalStatus || plan.approval_status || '');
    return DELETABLE_STATUSES.has(status) || approval === 'rejected';
  }

  canEdit(plan: Record<string, unknown> | null | undefined): boolean {
    if (!plan) return false;
    const status = String(plan.status || '');
    return EDITABLE_STATUSES.has(status);
  }

  // ----------------------------------------------------------
  // 数据访问
  // ----------------------------------------------------------

  /**
   * 生成唯一采购计划编码（带重试）
   * 后端 schema 已有 UNIQUE 索引保证最终一致性
   */
  generatePurchasePlanCode(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1e6).toString(36).toUpperCase().padStart(4, '0');
    return `PP${year}${month}${day}${random}`;
  }

  /**
   * 按 PA+YYYYMM+4位流水号 规则生成下一个可用的采购申请批次号
   * 流程：直接查 DB 取该年月下最大的合法 PA 编码，返回 +1
   * 性能：利用 idx_purchase_plans_code_unique 索引，O(log n)
   * 并发安全：DB UNIQUE 索引兜底；并发抢号会被 unique 约束拒绝
   */
  nextPurchaseApplicationCode(): ServiceResult<{ code: string }> {
    try {
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prefix = `PA${ym}`;

      const db = getDatabase();
      // 用 MAX + 索引前缀扫描，O(log n) 而不是 O(n)
      // SUBSTR 取后 4 位为数字部分，CAST 比较保证正确顺序
      const stmt = db.prepare(`
        SELECT plan_code AS planCode
        FROM purchase_plans
        WHERE plan_code LIKE ? AND SUBSTR(plan_code, 9) GLOB '[0-9][0-9][0-9][0-9]'
        ORDER BY CAST(SUBSTR(plan_code, 9) AS INTEGER) DESC
        LIMIT 1
      `);
      stmt.bind([`${prefix}%`]);

      let maxSerial = 0;
      if (stmt.step()) {
        const row = stmt.getAsObject() as { planCode?: string };
        stmt.free();
        if (row.planCode) {
          const serial = row.planCode.slice(prefix.length);
          const n = parseInt(serial, 10);
          if (!isNaN(n) && n >= 0) maxSerial = n;
        }
      } else {
        stmt.free();
      }

      const nextSerial = String(maxSerial + 1).padStart(4, '0');
      return { success: true, data: { code: `${prefix}${nextSerial}` } };
    } catch (error) {
      return { success: false, error: `生成采购申请批次号失败: ${(error as Error).message}` };
    }
  }

  /**
   * 检查 plan_code 是否已存在
   */
  isPlanCodeExists(planCode: string, excludeId?: string): boolean {
    const db = getDatabase();
    const sql = excludeId
      ? 'SELECT 1 FROM purchase_plans WHERE plan_code = ? AND id != ? LIMIT 1'
      : 'SELECT 1 FROM purchase_plans WHERE plan_code = ? LIMIT 1';
    const params = excludeId ? [planCode, excludeId] : [planCode];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const exists = stmt.step();
    stmt.free();
    return exists;
  }

  /**
   * 规范化数据库记录为前端期望格式
   */
  private mapToFrontendFormat(record: Record<string, unknown>): Record<string, unknown> {
    // 解析 JSON 字段，损坏数据不抛错
    const items = safeJsonParse<unknown[]>(record.items, []);
    const attachments = safeJsonParse<unknown[]>(record.attachments, []);

    const status = String(record.status || 'draft');
    const priority = String(record.priority || 'normal');
    const planType = String(record.planType || record.plan_type || '');

    return {
      id: record.id,
      purchaseApplicationCode: record.planCode || record.plan_code || '',
      relatedBatchCode: record.relatedBatchCode || record.related_batch_code || '',
      purchaseType: planType,
      purchaseTypeName: PURCHASE_TYPE_TEXT[planType] || planType,
      applicant: record.applicantName || record.applicant_name || '',
      applicantId: record.applicantId || record.applicant_id || '',
      applicantDepartment: record.departmentName || record.department_name || '',
      applyDate: record.applyDate || record.apply_date || '',
      requiredDate: record.expectedDate || record.expected_date || '',
      priority,
      priorityText: PRIORITY_TEXT[priority] || priority,
      status,
      statusText: STATUS_TEXT[status] || status,
      itemCount: Array.isArray(items) ? items.length : 0,
      items: Array.isArray(items) ? items : [],
      remarks: record.remarks || '',
      approvalPerson: record.approvalPerson || record.approval_person || '',
      approvalStatus: record.approvalStatus || record.approval_status || '',
      executionStatus: record.executionStatus || record.execution_status || 'pending_execution',
      createdAt: record.createTime || record.create_time || '',
      updatedAt: record.updateTime || record.update_time || '',
      planCode: record.planCode || record.plan_code || '',
      planTitle: record.planTitle || record.plan_title || '',
      planType,
      departmentName: record.departmentName || record.department_name || '',
      applicantName: record.applicantName || record.applicant_name || '',
      applyDate2: record.applyDate || record.apply_date || '',
      expectedDate: record.expectedDate || record.expected_date || '',
      supplierId: record.supplierId || record.supplier_id || '',
      supplierName: record.supplierName || record.supplier_name || '',
      totalAmount: Number(record.totalAmount || record.total_amount || 0),
      attachments: Array.isArray(attachments) ? attachments : [],
    };
  }

  /**
   * 分页规范化参数
   */
  private normalizePaging(page: number | string | undefined, limit: number | string | undefined) {
    const pageNum = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(String(limit ?? 50), 10) || 50));
    return { page: pageNum, limit: limitNum, offset: (pageNum - 1) * limitNum };
  }

  /**
   * 状态机白名单校验
   */
  private validateStatusValues(input: { status?: string; approvalStatus?: string }): string | null {
    if (input.status !== undefined && !PURCHASE_PLAN_STATUSES.includes(input.status as PurchasePlanStatus)) {
      return `无效的 status: ${input.status}（允许值: ${PURCHASE_PLAN_STATUSES.join(', ')}）`;
    }
    if (input.approvalStatus !== undefined && !PURCHASE_APPROVAL_STATUSES.includes(input.approvalStatus as PurchaseApprovalStatus)) {
      return `无效的 approvalStatus: ${input.approvalStatus}（允许值: ${PURCHASE_APPROVAL_STATUSES.join(', ')}）`;
    }
    return null;
  }

  // ----------------------------------------------------------
  // CRUD
  // ----------------------------------------------------------

  async list(params: PurchasePlanQuery = {}): Promise<ServiceResult<Record<string, unknown>[]>> {
    try {
      const db = getDatabase();
      const { planType, status, approvalStatus, departmentName, applicantName, priority } = params;
      const { page, limit, offset } = this.normalizePaging(params.page, params.limit);

      let sql = 'SELECT * FROM purchase_plans WHERE 1=1';
      const queryParams: (string | number)[] = [];

      if (planType) {
        sql += ' AND plan_type LIKE ?';
        queryParams.push(`%${planType}%`);
      }
      if (status) {
        sql += ' AND status = ?';
        queryParams.push(status);
      }
      if (approvalStatus) {
        sql += ' AND approval_status = ?';
        queryParams.push(approvalStatus);
      }
      if (departmentName) {
        sql += ' AND department_name LIKE ?';
        queryParams.push(`%${departmentName}%`);
      }
      if (applicantName) {
        sql += ' AND applicant_name LIKE ?';
        queryParams.push(`%${applicantName}%`);
      }
      if (priority) {
        sql += ' AND priority = ?';
        queryParams.push(priority);
      }

      const countSql = sql;
      sql += ' ORDER BY apply_date DESC, create_time DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);

      const total = execCount(db, countSql, queryParams.slice(0, -2));
      const dbItems = queryToObjects(db, sql, queryParams);

      return {
        success: true,
        data: dbItems.map(item => this.mapToFrontendFormat(item)),
        meta: { total, page, limit },
      };
    } catch (error) {
      return { success: false, error: `获取采购计划列表失败: ${(error as Error).message}` };
    }
  }

  async getById(id: string): Promise<ServiceResult<Record<string, unknown>>> {
    try {
      const db = getDatabase();
      const items = queryToObjects(db, 'SELECT * FROM purchase_plans WHERE id = ?', [id]);
      if (items.length === 0) {
        return { success: false, error: '采购计划不存在' };
      }
      return { success: true, data: this.mapToFrontendFormat(items[0]) };
    } catch (error) {
      return { success: false, error: `获取采购计划详情失败: ${(error as Error).message}` };
    }
  }

  async create(input: CreatePurchasePlanInput): Promise<ServiceResult<Record<string, unknown>>> {
    try {
      // 状态白名单校验
      const statusError = this.validateStatusValues({
        status: input.status as string | undefined,
        approvalStatus: input.approvalStatus as string | undefined,
      });
      if (statusError) {
        return { success: false, error: statusError };
      }

      // 必填字段校验
      if (!input.purchaseType) {
        return { success: false, error: '采购类型不能为空' };
      }
      if (!input.applicant) {
        return { success: false, error: '申请人不能为空' };
      }

      const db = getDatabase();
      // 本地时间生成 ISO 字符串（避免 UTC 跨天导致日期错位）
      const now = new Date();
      const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
      const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const newId = input.id || `PP${Date.now()}`;

      // 编号唯一性处理：前端传入时校验，缺失时生成并重试
      let planCode = input.purchaseApplicationCode;
      if (planCode) {
        if (this.isPlanCodeExists(planCode)) {
          return { success: false, error: `采购申请批次号已存在: ${planCode}` };
        }
      } else {
        // 最多重试 5 次生成唯一编码（不污染外层 planCode）
        for (let i = 0; i < 5; i++) {
          const code = this.generatePurchasePlanCode();
          if (!this.isPlanCodeExists(code)) {
            planCode = code;
            break;
          }
        }
        if (!planCode) {
          return { success: false, error: '生成唯一采购申请批次号失败，请重试' };
        }
      }

      // 计算总金额
      const items = Array.isArray(input.items) ? input.items : [];
      const totalAmount = items.reduce(
        (sum, item) => sum + Number(item.estimatedTotalPrice || 0),
        0
      );

      db.run(
        `INSERT INTO purchase_plans (
          id, plan_code, plan_title, plan_type,
          department_id, department_name,
          applicant_id, applicant_name,
          apply_date, expected_date,
          supplier_id, supplier_name, total_amount,
          priority, status, approval_status,
          remarks, attachments, items, related_batch_code, approval_person, create_by,
          execution_status, otherBatchReason,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          planCode,
          `${input.purchaseType} - ${planCode}`,
          input.purchaseType,
          '',
          input.applicantDepartment || '',
          input.applicantId || '',
          input.applicant,
          input.applyDate || todayLocal,
          input.requiredDate || null,
          '',
          '',
          totalAmount,
          input.priority || 'normal',
          input.status || 'draft',
          input.approvalStatus || 'pending',
          input.remarks || '',
          JSON.stringify(input.attachments || []),
          JSON.stringify(items),
          input.relatedBatchCode || '',
          input.approvalPerson || '',
          input.applicant,
          input.executionStatus || 'pending_execution',
          input.otherBatchReason || '',
          nowIso,
          nowIso,
        ]
      );
      // applicantId 已在上面保存；保留此注释以提醒维护者

      saveDatabase();

      // 返回完整记录
      return this.getById(newId);
    } catch (error) {
      return { success: false, error: `创建采购计划失败: ${(error as Error).message}` };
    }
  }

  async update(id: string, input: UpdatePurchasePlanInput): Promise<ServiceResult<Record<string, unknown>>> {
    try {
      const db = getDatabase();
      const now = new Date();
      const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();

      // 状态白名单校验
      const statusError = this.validateStatusValues({
        status: input.status as string | undefined,
        approvalStatus: input.approvalStatus as string | undefined,
      });
      if (statusError) {
        return { success: false, error: statusError };
      }

      // 1. 先查询当前状态
      const current = queryToObjects(db, 'SELECT * FROM purchase_plans WHERE id = ?', [id]);
      if (current.length === 0) {
        return { success: false, error: '采购计划不存在' };
      }
      const currentRecord = current[0];

      // 2. executionStatus 独立处理（不受 canEdit 约束）
      // 业务上 executionStatus 是采购执行流（4 档白名单），与 status（审批流）解耦，
      // approved/purchasing/completed 等状态下都应允许推进执行状态。
      const { executionStatus: newExecutionStatus, ...restInput } = input;
      if (newExecutionStatus !== undefined && !EXECUTION_STATUSES.has(newExecutionStatus as string)) {
        return { success: false, error: `无效的执行状态: ${newExecutionStatus}` };
      }

      // 3. 状态机保护：仅允许编辑草稿/待审批/已拒绝（executionStatus 已摘出，不参与校验）
      const hasNonExecutionUpdate = Object.values(restInput).some(v => v !== undefined);
      if (hasNonExecutionUpdate && !this.canEdit(currentRecord)) {
        // approved/purchasing/completed 等状态下，其他字段被 canEdit 拒绝。
        // 但 executionStatus 属于独立执行流，应允许推进——单独走 updateExecutionStatus 路径。
        if (newExecutionStatus !== undefined) {
          return this.updateExecutionStatus(id, newExecutionStatus as string);
        }
        return { success: false, error: `当前状态（${currentRecord.status}）不允许修改` };
      }

      // 4. 编号冲突校验
      if (input.purchaseApplicationCode && input.purchaseApplicationCode !== currentRecord.planCode) {
        if (this.isPlanCodeExists(input.purchaseApplicationCode, id)) {
          return { success: false, error: `采购申请批次号已存在: ${input.purchaseApplicationCode}` };
        }
      }

      // 5. 构建 UPDATE 语句
      const updateFields: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const values: any[] = [];
      let newItems: unknown[] | null = null;

      for (const [camelKey, value] of Object.entries(restInput)) {
        if (EXCLUDE_FIELDS.has(camelKey) || EXCLUDE_FIELDS.has(FIELD_MAP[camelKey] || '')) {
          continue;
        }

        // P0-6 修复：仅跳过 undefined；传 '' 或 null 视为显式置空 DB
        if (value === undefined) {
          continue;
        }

        if (camelKey === 'items') {
          newItems = Array.isArray(value) ? value : [];
          updateFields.push('items = ?');
          values.push(JSON.stringify(newItems));
          // 联动重算总金额
          const totalAmount = newItems.reduce(
            (sum: number, item: any) => sum + Number(item.estimatedTotalPrice || 0),
            0
          );
          updateFields.push('total_amount = ?');
          values.push(totalAmount);
          continue;
        }

        if (camelKey === 'attachments') {
          updateFields.push('attachments = ?');
          values.push(JSON.stringify(value || []));
          continue;
        }

        const dbField = FIELD_MAP[camelKey] || camelKey;
        updateFields.push(`${dbField} = ?`);
        values.push(value);
      }

      // executionStatus 单独追加（已通过白名单校验，且不参与 canEdit）
      if (newExecutionStatus !== undefined) {
        updateFields.push('execution_status = ?');
        values.push(newExecutionStatus);
      }

      if (updateFields.length === 0) {
        return { success: false, error: '没有需要更新的字段' };
      }

      values.push(nowIso, id);
      db.run(
        `UPDATE purchase_plans SET ${updateFields.join(', ')}, update_time = ? WHERE id = ?`,
        values
      );
      saveDatabase();

      return this.getById(id);
    } catch (error) {
      return { success: false, error: `更新采购计划失败: ${(error as Error).message}` };
    }
  }

  /**
   * 更新采购执行状态（4 档白名单校验）
   */
  async updateExecutionStatus(
    id: string,
    executionStatus: string
  ): Promise<ServiceResult<Record<string, unknown>>> {
    try {
      if (!EXECUTION_STATUSES.has(executionStatus)) {
        return { success: false, error: `无效的执行状态: ${executionStatus}` };
      }
      const db = getDatabase();
      const existing = queryToObjects(db, 'SELECT id FROM purchase_plans WHERE id = ?', [id]);
      if (existing.length === 0) {
        return { success: false, error: '采购计划不存在' };
      }
      const now = new Date();
      const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
      db.run(
        'UPDATE purchase_plans SET execution_status = ?, update_time = ? WHERE id = ?',
        [executionStatus, nowIso, id]
      );
      saveDatabase();
      return this.getById(id);
    } catch (error) {
      return { success: false, error: `更新执行状态失败: ${(error as Error).message}` };
    }
  }

  /**
   * 单条删除
   * 2026-06-07: 业务调整允许删除任何状态订单（与批量删除、订单管理、技术方案、生产计划保持一致）。
   * 原 canDelete 状态机保护注释保留以备审计；前端通过 showConfirm 强确认承担保护责任。
   */
  async deleteById(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const db = getDatabase();
      const current = queryToObjects(db, 'SELECT * FROM purchase_plans WHERE id = ?', [id]);
      if (current.length === 0) {
        return { success: false, error: '采购计划不存在' };
      }
      db.run('DELETE FROM purchase_plans WHERE id = ?', [id]);
      saveDatabase();
      return { success: true, data: { id } };
    } catch (error) {
      return { success: false, error: `删除采购计划失败: ${(error as Error).message}` };
    }
  }

  /**
   * 批量删除（开发测试阶段：允许删除所有状态）
   */
  async deleteMany(ids: string[]): Promise<ServiceResult<{ deleted: number; skipped: { id: string; reason: string }[] }>> {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return { success: false, error: '请选择要删除的采购计划' };
      }
      const db = getDatabase();
      const deleted: string[] = [];
      const skipped: { id: string; reason: string }[] = [];

      for (const id of ids) {
        const current = queryToObjects(db, 'SELECT id FROM purchase_plans WHERE id = ?', [id]);
        if (current.length === 0) {
          skipped.push({ id, reason: '记录不存在' });
          continue;
        }
        db.run('DELETE FROM purchase_plans WHERE id = ?', [id]);
        deleted.push(id);
      }

      if (deleted.length > 0) saveDatabase();
      return { success: true, data: { deleted: deleted.length, skipped } };
    } catch (error) {
      return { success: false, error: `批量删除采购计划失败: ${(error as Error).message}` };
    }
  }
}

export const purchasePlanService = new PurchasePlanService();
