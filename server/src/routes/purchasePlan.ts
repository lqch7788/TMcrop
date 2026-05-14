/**
 * 采购计划 API 路由
 * 提供采购计划的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 状态文本映射
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

// 优先级文本映射
const PRIORITY_TEXT: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  normal: '中',
  low: '低',
};

// 采购类型显示名称映射
const PURCHASE_TYPE_TEXT: Record<string, string> = {
  production: '生产物资采购',
  urgent: '紧急采购',
  routine: '常规采购',
  safety: '劳保用品',
  material: '通用物资',
  equipment: '设备采购',
  other: '其他',
};

/**
 * 将下划线命名字段转换为驼峰命名
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 将对象的所有下划线字段转换为驼峰命名
 */
function mapItemToCamelCase<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = obj[key];
  }
  return result as T;
}

/**
 * 将数据库记录映射为前端期望的字段格式
 * 注意：queryToObjects 已通过 mapToCamelCase 转换字段名，所以这里是 camelCase
 */
function mapToFrontendFormat(record: Record<string, unknown>): Record<string, unknown> {
  const status = (record.status as string) || 'draft';
  const priority = (record.priority as string) || 'normal';
  const planType = (record.planType as string) || '';

  // 处理 items 数组中的字段转换
  let itemsArray: any[] = [];
  if (Array.isArray(record.items)) {
    itemsArray = record.items.map((item: any) => mapItemToCamelCase(item));
  }

  return {
    // 前端期望的字段名
    id: record.id,
    purchaseApplicationCode: record.planCode || record.plan_code || '',           // 采购申请批次号
    relatedBatchCode: record.relatedBatchCode || record.related_batch_code || '', // 关联生产批次
    purchaseType: planType,                           // 采购类型
    purchaseTypeName: PURCHASE_TYPE_TEXT[planType] || planType, // 类型显示名称
    applicant: record.applicantName || record.applicant_name || '',           // 申请人
    applicantId: record.applicantId || record.applicant_id || '',           // 申请人ID
    applicantDepartment: record.departmentName || record.department_name || '', // 申请部门
    applyDate: record.applyDate || record.apply_date || '',              // 申请日期
    requiredDate: record.expectedDate || record.expected_date || '',        // 需求日期
    priority: priority,                             // 优先级
    priorityText: PRIORITY_TEXT[priority] || priority, // 优先级显示文本
    status: status,                                 // 状态
    statusText: STATUS_TEXT[status] || status,      // 状态显示文本
    itemCount: Array.isArray(itemsArray) ? itemsArray.length : 0,
    items: itemsArray,
    remarks: record.remarks || '',
    approvalPerson: record.approvalPerson || record.approval_person || '',
    approvalStatus: record.approvalStatus || record.approval_status || '',
    // 时间戳
    createdAt: record.createTime || record.create_time || '',
    updatedAt: record.updateTime || record.update_time || '',
    // 保留原始字段（兼容）
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

/**
 * 生成采购计划编码
 */
function generatePurchasePlanCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `PP${year}${month}${day}${seq}`;
}

/**
 * 获取采购计划列表
 * GET /api/purchase-plans
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { plan_type, status, approval_status, department_name, applicant_name, priority, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM purchase_plans WHERE 1=1';
    const params: (string | number)[] = [];

    if (plan_type) {
      sql += ' AND plan_type LIKE ?';
      params.push(`%${plan_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (approval_status) {
      sql += ' AND approval_status = ?';
      params.push(approval_status as string);
    }

    if (department_name) {
      sql += ' AND department_name LIKE ?';
      params.push(`%${department_name}%`);
    }

    if (applicant_name) {
      sql += ' AND applicant_name LIKE ?';
      params.push(`%${applicant_name}%`);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority as string);
    }

    const countSql = sql;
    sql += ' ORDER BY apply_date DESC, create_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const dbItems = queryToObjects(db, sql, params);

    // 解析 attachments 和 items JSON 字段，并映射为前端期望的格式
    const result = dbItems.map((item: Record<string, unknown>) => {
      const parsed = {
        ...item,
        attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
        items: item.items ? JSON.parse(item.items as string) : [],
      };
      return mapToFrontendFormat(parsed);
    });

    res.json({ success: true, data: result, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取采购计划列表失败:', error);
    res.status(500).json({ success: false, error: '获取采购计划列表失败' });
  }
});

/**
 * 获取单个采购计划详情
 * GET /api/purchase-plans/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const items = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM purchase_plans WHERE id = ?',
      [id]
    );

    if (!items || items.length === 0) {
      return res.status(404).json({ success: false, error: '采购计划不存在' });
    }

    // 解析 attachments 和 items JSON 字段，并映射为前端期望的格式
    const parsed = {
      ...items[0],
      attachments: items[0].attachments ? JSON.parse(items[0].attachments as string) : [],
      items: items[0].items ? JSON.parse(items[0].items as string) : [],
    };
    const result = mapToFrontendFormat(parsed);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取采购计划详情失败:', error);
    res.status(500).json({ success: false, error: '获取采购计划详情失败' });
  }
});

/**
 * 创建采购计划
 * POST /api/purchase-plans
 */
router.post('/', (req: Request, res: Response) => {
  try {
    // 接受 camelCase 前端字段
    const {
      id,
      purchaseApplicationCode = '',
      purchaseType = '',
      applicant = '',
      applicantId = '',
      applicantDepartment = '',
      applyDate = '',
      requiredDate = '',
      priority = 'normal',
      status = 'draft',
      approvalStatus = 'pending',
      remarks = '',
      approvalPerson = '',
      relatedBatchCode = '',
      attachments = [],
      items = [],
    } = req.body;

    const newId = id || `PP${Date.now()}`;
    const now = new Date().toISOString();
    const planCode = purchaseApplicationCode || generatePurchasePlanCode();

    const db = getDatabase();

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
      `${purchaseType} - ${planCode}`,  // plan_title
      purchaseType,                      // plan_type
      '',                                 // department_id
      applicantDepartment,                // department_name
      applicantId,                        // applicant_id
      applicant,                          // applicant_name
      applyDate || now.substring(0, 10),  // apply_date
      requiredDate || null,               // expected_date
      '',                                 // supplier_id
      '',                                 // supplier_name
      0,                                  // total_amount (从 items 计算)
      priority,
      status,
      approvalStatus,
      remarks,
      JSON.stringify(attachments),
      JSON.stringify(items),
      relatedBatchCode,                   // related_batch_code
      approvalPerson,                     // approval_person
      applicant,                          // create_by
      now,
      now,
    ]);

    saveDatabase();

    // 返回完整数据给前端
    const newItems = queryToObjects<Record<string, unknown>>(db, 'SELECT * FROM purchase_plans WHERE id = ?', [newId]);
    const fullData = newItems.length > 0 ? mapToFrontendFormat({
      ...newItems[0],
      attachments: newItems[0].attachments ? JSON.parse(newItems[0].attachments as string) : [],
      items: newItems[0].items ? JSON.parse(newItems[0].items as string) : [],
    }) : { id: newId, plan_code: planCode };

    res.status(201).json({ success: true, data: fullData });
  } catch (error) {
    console.error('创建采购计划失败:', error);
    res.status(500).json({ success: false, error: '创建采购计划失败' });
  }
});

/**
 * 采购计划更新字段映射（camelCase -> snake_case）
 */
const PURCHASE_PLAN_FIELD_MAP: Record<string, string> = {
  // 基本字段映射
  planCode: 'plan_code',
  planTitle: 'plan_title',
  planType: 'plan_type',
  purchaseType: 'plan_type', // 前端purchaseType对应后端plan_type
  departmentId: 'department_id',
  departmentName: 'department_name',
  applicantId: 'applicant_id',
  applicantDepartment: 'department_name', // 前端applicantDepartment对应后端department_name
  applicantName: 'applicant_name',
  applyDate: 'apply_date',
  expectedDate: 'expected_date',
  requiredDate: 'expected_date', // 前端requiredDate对应后端expected_date
  supplierId: 'supplier_id',
  supplierName: 'supplier_name',
  totalAmount: 'total_amount',
  priority: 'priority',
  status: 'status',
  approvalStatus: 'approval_status',
  remarks: 'remarks',
  remark: 'remarks', // 前端remark对应后端remarks
  relatedBatchCode: 'related_batch_code',
  approvalPerson: 'approval_person',
  createBy: 'create_by',
  createTime: 'create_time',
  updateTime: 'update_time',
};

/**
 * 更新采购计划
 * PUT /api/purchase-plans/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    console.log('[更新采购计划] 接收到的数据:', JSON.stringify(updates, null, 2));

    // 检查采购计划是否存在
    const stmt = db.prepare('SELECT status FROM purchase_plans WHERE id = ?');
    stmt.bind([id]);
    let plan: Record<string, unknown> | null = null;
    if (stmt.step()) {
      plan = stmt.getAsObject();
    }
    stmt.free();

    if (!plan) {
      return res.status(404).json({ success: false, error: '采购计划不存在' });
    }

    console.log('[更新采购计划] 当前计划状态:', plan.status, plan.approval_status);

    // 不允许更新已审批通过的计划
    if (plan.status === 'approved' || plan.approval_status === 'approved') {
      return res.status(400).json({ success: false, error: '已审批通过的采购计划不允许修改' });
    }

    // 过滤掉 id 和自动生成的字段，构建字段映射
    const excludeFields = ['id', 'plan_code', 'create_time'];
    const updateFields: string[] = [];
    const values: any[] = [];

    // 单独处理 items 字段
    let itemsValue: any = null;
    let totalAmount = 0;
    if (Array.isArray(updates.items)) {
      itemsValue = JSON.stringify(updates.items);
      // 计算总金额
      for (const item of updates.items) {
        totalAmount += (item.estimatedTotalPrice || 0);
      }
    }

    for (const [camelKey, value] of Object.entries(updates)) {
      if (excludeFields.includes(camelKey) || excludeFields.includes(PURCHASE_PLAN_FIELD_MAP[camelKey])) {
        continue;
      }

      // 跳过 items，单独处理
      if (camelKey === 'items') {
        continue;
      }

      // 处理特殊字段
      if (camelKey === 'attachments') {
        updateFields.push(`${PURCHASE_PLAN_FIELD_MAP[camelKey] || camelKey} = ?`);
        values.push(JSON.stringify(value || []));
      } else {
        // 转换为 snake_case 字段名
        const dbField = PURCHASE_PLAN_FIELD_MAP[camelKey] || camelKey;
        updateFields.push(`${dbField} = ?`);
        values.push(value);
      }
    }

    // 添加 items 字段更新
    if (itemsValue !== null) {
      updateFields.push('items = ?');
      values.push(itemsValue);
      // 同时更新总金额
      updateFields.push('total_amount = ?');
      values.push(totalAmount);
    }

    if (updateFields.length === 0) {
      console.log('[更新采购计划] 没有需要更新的字段');
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    console.log('[更新采购计划] 生成的更新字段:', updateFields);
    console.log('[更新采购计划] 更新的值:', values);

    values.push(now, id);

    console.log('[更新采购计划] 执行的SQL:', `UPDATE purchase_plans SET ${updateFields.join(', ')}, update_time = ? WHERE id = ?`);
    console.log('[更新采购计划] SQL参数:', values);

    try {
      db.run(`UPDATE purchase_plans SET ${updateFields.join(', ')}, update_time = ? WHERE id = ?`, values);
      saveDatabase();
      console.log('[更新采购计划] 更新成功');
    } catch (dbError) {
      console.error('[更新采购计划] 数据库执行错误:', dbError);
      return res.status(500).json({ success: false, error: `数据库错误: ${(dbError as Error).message}` });
    }
    // 返回更新后的完整数据
    const updatedItems = queryToObjects<Record<string, unknown>>(db, 'SELECT * FROM purchase_plans WHERE id = ?', [id]);
    const fullData = updatedItems.length > 0 ? mapToFrontendFormat({
      ...updatedItems[0],
      attachments: updatedItems[0].attachments ? JSON.parse(updatedItems[0].attachments as string) : [],
      items: updatedItems[0].items ? JSON.parse(updatedItems[0].items as string) : [],
    }) : { id };

    res.json({ success: true, data: fullData });
  } catch (error) {
    console.error('更新采购计划失败, 错误详情:', error);
    console.error('  错误消息:', (error as Error).message);
    console.error('  错误堆栈:', (error as Error).stack);
    res.status(500).json({ success: false, error: `更新采购计划失败: ${(error as Error).message}` });
  }
});

/**
 * 删除采购计划
 * DELETE /api/purchase-plans/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
      return res.status(404).json({ success: false, error: '采购计划不存在' });
    }

    // 只允许删除草稿、待审批或已拒绝的计划
    const deletableStatuses = ['draft', 'pending', 'rejected'];
    if (!deletableStatuses.includes(plan.status as string) && plan.approval_status !== 'rejected') {
      return res.status(400).json({ success: false, error: '只能删除草稿、待审批或已拒绝的采购计划' });
    }

    db.run('DELETE FROM purchase_plans WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除采购计划失败:', error);
    res.status(500).json({ success: false, error: '删除采购计划失败' });
  }
});

/**
 * 批量删除采购计划
 * POST /api/purchase-plans/batch-delete
 */
router.post('/batch-delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const db = getDatabase();

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请选择要删除的采购计划' });
    }

    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM purchase_plans WHERE id IN (${placeholders})`, ids);
    saveDatabase();

    res.json({ success: true, message: `成功删除 ${ids.length} 个采购计划` });
  } catch (error) {
    console.error('批量删除采购计划失败:', error);
    res.status(500).json({ success: false, error: '批量删除采购计划失败' });
  }
});

export default router;
