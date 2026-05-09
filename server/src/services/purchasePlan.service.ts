/**
 * 采购计划服务
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

export interface PurchasePlan {
  id: string;
  plan_code: string;
  plan_title: string;
  plan_type: string;
  department_id: string;
  department_name: string;
  applicant_id: string;
  applicant_name: string;
  apply_date: string;
  expected_date?: string;
  supplier_id?: string;
  supplier_name?: string;
  total_amount: number;
  priority: string;
  status: string;
  approval_status: string;
  remarks?: string;
  attachments?: string;
  items?: string;
  related_batch_code?: string;
  approval_person?: string;
  create_by?: string;
  create_time: string;
  update_time: string;
}

export interface PurchasePlanQuery {
  planType?: string;
  status?: string;
  approvalStatus?: string;
  departmentName?: string;
  applicantName?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export class PurchasePlanService {
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private mapItemToCamelCase<T>(obj: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = this.toCamelCase(key);
      result[camelKey] = obj[key];
    }
    return result as T;
  }

  private mapToFrontendFormat(record: Record<string, unknown>): Record<string, unknown> {
    const status = (record.status as string) || 'draft';
    const priority = (record.priority as string) || 'normal';
    const planType = (record.planType as string) || '';

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

    let itemsArray: any[] = [];
    if (Array.isArray(record.items)) {
      itemsArray = record.items.map((item: any) => this.mapItemToCamelCase(item));
    }

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
      priority: priority,
      priorityText: PRIORITY_TEXT[priority] || priority,
      status: status,
      statusText: STATUS_TEXT[status] || status,
      itemCount: Array.isArray(itemsArray) ? itemsArray.length : 0,
      items: itemsArray,
      remarks: record.remarks || '',
      approvalPerson: record.approvalPerson || record.approval_person || '',
      approvalStatus: record.approvalStatus || record.approval_status || '',
      createdAt: record.createTime || record.create_time || '',
      updatedAt: record.updateTime || record.update_time || '',
      planCode: record.planCode || record.plan_code || '',
      planTitle: record.planTitle || record.plan_title || '',
      planType: planType,
      departmentName: record.departmentName || record.department_name || '',
      applicantName: record.applicantName || record.applicant_name || '',
      applyDate2: record.applyDate || record.apply_date || '',
      expectedDate: record.expectedDate || record.expected_date || '',
      supplierId: record.supplierId || record.supplier_id || '',
      supplierName: record.supplierName || record.supplier_name || '',
      totalAmount: record.totalAmount || record.total_amount || 0,
      attachments: record.attachments || [],
    };
  }

  private generatePurchasePlanCode(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `PP${year}${month}${day}${seq}`;
  }

  async getPurchasePlans(params: PurchasePlanQuery): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const db = getDatabase();
    const { planType, status, approvalStatus, departmentName, applicantName, priority, page = 1, limit = 50 } = params;

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
    sql += ' ORDER BY apply_date DESC, create_time DESC';

    const total = execCount(db, countSql, queryParams);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    queryParams.push(Number(limit), offset);

    const dbItems = queryToObjects(db, sql, queryParams);

    const result = dbItems.map((item: Record<string, unknown>) => {
      const parsed = {
        ...item,
        attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
        items: item.items ? JSON.parse(item.items as string) : [],
      };
      return this.mapToFrontendFormat(parsed);
    });

    return { data: result, total };
  }

  async getById(id: string): Promise<Record<string, unknown> | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM purchase_plans WHERE id = ?');
    stmt.bind([id]);

    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return null;
    }

    const parsed = {
      ...item,
      attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
      items: item.items ? JSON.parse(item.items as string) : [],
    };
    return this.mapToFrontendFormat(parsed);
  }

  async create(plan: Partial<PurchasePlan>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const newId = plan.id || `PP${Date.now()}`;
    const planCode = plan.plan_code || this.generatePurchasePlanCode();

    db.run(`
      INSERT INTO purchase_plans (
        id, plan_code, plan_title, plan_type,
        department_id, department_name,
        applicant_id, applicant_name,
        apply_date, expected_date,
        supplier_id, supplier_name, total_amount,
        priority, status, approval_status,
        remarks, attachments, items, related_batch_code, approval_person, create_by,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      planCode,
      plan.plan_title || '',
      plan.plan_type || '',
      plan.department_id || '',
      plan.department_name || '',
      plan.applicant_id || '',
      plan.applicant_name || '',
      plan.apply_date || now.substring(0, 10),
      plan.expected_date || null,
      plan.supplier_id || '',
      plan.supplier_name || '',
      plan.total_amount || 0,
      plan.priority || 'medium',
      plan.status || 'draft',
      plan.approval_status || 'pending',
      plan.remarks || '',
      plan.attachments ? (typeof plan.attachments === 'string' ? plan.attachments : JSON.stringify(plan.attachments)) : '[]',
      plan.items ? (typeof plan.items === 'string' ? plan.items : JSON.stringify(plan.items)) : '[]',
      plan.related_batch_code || '',
      plan.approval_person || '',
      plan.create_by || '',
      now,
      now,
    ]);

    saveDatabase();
    return newId;
  }

  async update(id: string, updates: Partial<PurchasePlan>): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 检查采购计划是否存在
    const stmt = db.prepare('SELECT status FROM purchase_plans WHERE id = ?');
    stmt.bind([id]);
    let plan: Record<string, unknown> | null = null;
    if (stmt.step()) {
      plan = stmt.getAsObject();
    }
    stmt.free();

    if (!plan) {
      return false;
    }

    // 不允许更新已审批通过的计划
    if (plan.status === 'approved' || plan.approval_status === 'approved') {
      throw new Error('已审批通过的采购计划不允许修改');
    }

    const FIELD_MAP: Record<string, string> = {
      planCode: 'plan_code',
      planTitle: 'plan_title',
      planType: 'plan_type',
      departmentId: 'department_id',
      departmentName: 'department_name',
      applicantId: 'applicant_id',
      applicantName: 'applicant_name',
      applyDate: 'apply_date',
      expectedDate: 'expected_date',
      supplierId: 'supplier_id',
      supplierName: 'supplier_name',
      totalAmount: 'total_amount',
      priority: 'priority',
      status: 'status',
      approvalStatus: 'approval_status',
      remarks: 'remarks',
      relatedBatchCode: 'related_batch_code',
      approvalPerson: 'approval_person',
      createBy: 'create_by',
    };

    const excludeFields = ['id', 'plan_code', 'create_time', 'items'];
    const updateFields: string[] = [];
    const values: any[] = [];

    for (const [camelKey, value] of Object.entries(updates)) {
      if (excludeFields.includes(camelKey) || excludeFields.includes(FIELD_MAP[camelKey])) {
        continue;
      }

      if (camelKey === 'attachments') {
        updateFields.push(`${FIELD_MAP[camelKey] || camelKey} = ?`);
        values.push(JSON.stringify(value || []));
      } else if (camelKey === 'items') {
        continue;
      } else {
        const dbField = FIELD_MAP[camelKey] || camelKey;
        updateFields.push(`${dbField} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    values.push(now, id);

    db.run(`UPDATE purchase_plans SET ${updateFields.join(', ')}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();

    // 检查采购计划是否存在
    const stmt = db.prepare('SELECT status, approval_status FROM purchase_plans WHERE id = ?');
    stmt.bind([id]);
    let plan: Record<string, unknown> | null = null;
    if (stmt.step()) {
      plan = stmt.getAsObject();
    }
    stmt.free();

    if (!plan) {
      return false;
    }

    // 只允许删除草稿或已拒绝的计划
    if (plan.status !== 'draft' && plan.approval_status !== 'rejected') {
      throw new Error('只允许删除草稿或已拒绝的采购计划');
    }

    db.run('DELETE FROM purchase_plans WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const purchasePlanService = new PurchasePlanService();
