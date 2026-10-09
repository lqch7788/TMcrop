/**
 * 审批单 API 路由
 * 提供审批单的 CRUD 操作和流程执行功能
 * 支持：提交审批、审批通过/拒绝/部分通过、审批历史、超时处理
 */

import { Router } from 'express';
import { generateApprovalCode } from '../lib/approvalCode';
import { getDatabase, saveDatabase } from '../db/index';
import { updateBusinessTable } from './approvalLinkage';
import { evaluateExemptEligibility, resolveBusinessAmount } from '../lib/approvalAutoApprove';

const router = Router();

// ============================================
// 类型定义
// ============================================

/**
 * 审批动作类型
 */
type ApprovalActionType = 'approve' | 'reject' | 'partially_approve' | 'cancel' | 'submit';

/**
 * 审批操作记录
 */
interface ApprovalOperationRecord {
  id: string;
  approvalId: string;
  nodeId: string;
  nodeName: string;
  approverId: string;
  approverName: string;
  action: ApprovalActionType;
  comment?: string;
  attachments?: string[];
  actionTime: string;
  metadata?: Record<string, unknown>; // 存储额外信息，如部分审批的数量
}

/**
 * 审批单完整信息
 */
interface ApprovalDetail {
  id: string;
  code: string;
  type: string;
  typeName: string;
  category: string;
  title: string;
  description?: string;
  applicantId: string;
  applicantName: string;
  applicantDepartment: string;
  applyDate: string;
  applyTime: string;
  currentStep: number;
  totalSteps: number;
  approvers: Approver[];
  records: ApprovalRecord[];
  status: string;
  businessLink?: BusinessLink;
  attachments?: string[];
  priority: string;
  dueDate?: string;
  relatedBatchCode?: string;
  relatedTaskIds?: string[];
  amount?: string;
  materials?: MaterialItem[];
  workflowId?: string;
  workflowName?: string;
  createdAt: string;
  updatedAt: string;
  // 计算字段
  isOverdue?: boolean;
  overdueHours?: number;
  nextApprover?: Approver | null;
  canApprove?: boolean;
}

/**
 * 审批人
 */
interface Approver {
  userId: string;
  userName: string;
  role: string;
  order: number;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'timeout' | 'partially_approved';
  comment?: string;
  actionTime?: string;
  nodeId?: string;
  nodeName?: string;
}

/**
 * 审批记录
 */
interface ApprovalRecord {
  id: string;
  approvalId: string;
  approverId: string;
  approverName: string;
  action: string;
  comment?: string;
  attachments?: string[];
  actionTime: string;
  metadata?: Record<string, unknown>;
}

/**
 * 物料项
 */
interface MaterialItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  unit: string;
}

/**
 * 业务关联
 */
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
 * 计算是否超时
 */
function calculateOverdue(dueDate: string): { isOverdue: boolean; overdueHours: number } {
  const now = new Date();
  const due = new Date(dueDate);

  if (now <= due) {
    return { isOverdue: false, overdueHours: 0 };
  }

  const diffMs = now.getTime() - due.getTime();
  const overdueHours = Math.floor(diffMs / (1000 * 60 * 60));

  return { isOverdue: true, overdueHours };
}

/**
 * 验证审批权限
 */
function canApproveApproval(approval: ApprovalDetail, userId: string, userRoles: string[]): boolean {
  if (approval.status !== 'pending') {
    return false;
  }

  const currentApprover = approval.approvers.find(
    (a: Approver) => a.order === approval.currentStep && a.status === 'pending'
  );

  if (!currentApprover) {
    return false;
  }

  // 检查是否是当前审批人
  if (currentApprover.userId === userId) {
    return true;
  }

  // 检查用户角色是否匹配
  if (currentApprover.role && userRoles.includes(currentApprover.role)) {
    return true;
  }

  return false;
}

// ============================================
// 审批单基础 API
// ============================================

/**
 * 获取所有审批单
 * GET /api/approvals
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { type, status, category, applicantId, keyword, workflowId, priority, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM approvals WHERE 1=1';
    const bindings: (string | number)[] = [];

    if (type) {
      sql += ' AND type = ?';
      bindings.push(type as string);
    }

    if (status) {
      sql += ' AND status = ?';
      bindings.push(status as string);
    }

    if (category) {
      sql += ' AND category = ?';
      bindings.push(category as string);
    }

    if (applicantId) {
      sql += ' AND applicant_id = ?';
      bindings.push(applicantId as string);
    }

    if (workflowId) {
      sql += ' AND workflow_id = ?';
      bindings.push(workflowId as string);
    }

    if (priority) {
      sql += ' AND priority = ?';
      bindings.push(priority as string);
    }

    if (startDate) {
      sql += ' AND apply_date >= ?';
      bindings.push(startDate as string);
    }

    if (endDate) {
      sql += ' AND apply_date <= ?';
      bindings.push(endDate as string);
    }

    if (keyword) {
      sql += ' AND (title LIKE ? OR code LIKE ? OR applicant_name LIKE ?)';
      const kw = `%${keyword}%`;
      bindings.push(kw, kw, kw);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = db.prepare(sql);
    if (bindings.length > 0) {
      stmt.bind(bindings);
    }

    const approvals: Record<string, unknown>[] = [];
    while (stmt.step()) {
      approvals.push(stmt.getAsObject());
    }
    stmt.free();

    // 解析 JSON 字段并转换 camelCase
    const result = approvals.map(a => ({
      id: a.id,
      code: a.code,
      type: a.type,
      typeName: a.type_name,
      category: a.category,
      title: a.title,
      description: a.description,
      applicantId: a.applicant_id,
      applicantName: a.applicant_name,
      applicantDepartment: a.applicant_department,
      applyDate: a.apply_date,
      applyTime: a.apply_time,
      currentStep: a.current_step,
      totalSteps: a.total_steps,
      approvers: a.approvers ? JSON.parse(a.approvers as string) : [],
      records: a.records ? JSON.parse(a.records as string) : [],
      status: a.status,
      businessLink: a.business_link ? JSON.parse(a.business_link as string) : null,
      attachments: a.attachments ? JSON.parse(a.attachments as string) : [],
      priority: a.priority,
      dueDate: a.due_date,
      reminderCount: a.reminder_count,
      relatedBatchCode: a.related_batch_code,
      relatedTaskIds: a.related_task_ids ? JSON.parse(a.related_task_ids as string) : [],
      notificationSent: Boolean(a.notification_sent),
      amount: a.amount,
      materials: a.materials ? JSON.parse(a.materials as string) : [],
      workflowId: a.workflow_id,
      workflowName: a.workflow_name,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取审批单失败:', error);
    res.status(500).json({ success: false, error: '获取审批单失败' });
  }
});

/**
 * 获取单个审批单
 * GET /api/approvals/:id
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const stmt = db.prepare('SELECT * FROM approvals WHERE id = ?');
    stmt.bind([id]);
    let approval: Record<string, unknown> | null = null;
    if (stmt.step()) {
      approval = stmt.getAsObject();
    }
    stmt.free();

    if (!approval) {
      return res.status(404).json({ success: false, error: '审批单不存在' });
    }

    // 解析 JSON 字段并转换 camelCase
    const result = {
      id: approval.id,
      code: approval.code,
      type: approval.type,
      typeName: approval.type_name,
      category: approval.category,
      title: approval.title,
      description: approval.description,
      applicantId: approval.applicant_id,
      applicantName: approval.applicant_name,
      applicantDepartment: approval.applicant_department,
      applyDate: approval.apply_date,
      applyTime: approval.apply_time,
      currentStep: approval.current_step || 1,
      totalSteps: approval.total_steps || 1,
      approvers: approval.approvers ? JSON.parse(approval.approvers as string) : [],
      records: approval.records ? JSON.parse(approval.records as string) : [],
      status: approval.status,
      businessLink: approval.business_link ? JSON.parse(approval.business_link as string) : null,
      attachments: approval.attachments ? JSON.parse(approval.attachments as string) : [],
      priority: approval.priority,
      dueDate: approval.due_date || '',
      reminderCount: approval.reminder_count,
      relatedBatchCode: approval.related_batch_code,
      relatedTaskIds: approval.related_task_ids ? JSON.parse(approval.related_task_ids as string) : [],
      notificationSent: Boolean(approval.notification_sent),
      amount: approval.amount,
      materials: approval.materials ? JSON.parse(approval.materials as string) : [],
      workflowId: approval.workflow_id,
      workflowName: approval.workflow_name,
      createdAt: approval.created_at,
      updatedAt: approval.updated_at,
    };

    // 计算是否超时
    if (result.dueDate) {
      const { isOverdue, overdueHours } = calculateOverdue(result.dueDate as string);
      (result as Record<string, unknown>).isOverdue = isOverdue;
      (result as Record<string, unknown>).overdueHours = overdueHours;
    }

    // 获取下一个待审批人
    const currentStep = result.currentStep;
    (result as Record<string, unknown>).nextApprover = result.approvers.find(
      (a: Approver) => a.order === currentStep && a.status === 'pending'
    ) || null;

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取审批单详情失败:', error);
    res.status(500).json({ success: false, error: '获取审批单详情失败' });
  }
});

/**
 * 创建审批单
 * POST /api/approvals
 */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const body = req.body;
    // 2026-08-10 修复：所有字段兼容 snake_case（前端 denormalizeApproval 把 camelCase 转 snake_case 发过来），
    //   之前只对 5 个 JSON 字段做了兜底，普通字段（applicantName/applicantDepartment/code/title 等）
    //   全部走 camelCase 解构 → undefined → 落库空字符串。修复：每个字段 camelCase 优先、缺失时回退 snake_case
    const pick = (camel: string, snake: string, fallback?: unknown) =>
      body[camel] ?? body[snake] ?? fallback;
    const id = pick('id', 'id');
    const code = pick('code', 'code');
    const type = pick('type', 'type');
    const typeName = pick('typeName', 'type_name', '');
    const category = pick('category', 'category', 'business');
    const title = pick('title', 'title');
    const description = pick('description', 'description', '');
    const applicantId = pick('applicantId', 'applicant_id', '');
    const applicantName = pick('applicantName', 'applicant_name', '');
    const applicantDepartment = pick('applicantDepartment', 'applicant_department', '');
    const applyDate = pick('applyDate', 'apply_date', new Date().toISOString().substring(0, 10));
    const applyTime = pick('applyTime', 'apply_time', new Date().toISOString().substring(11, 19));
    const currentStep = pick('currentStep', 'current_step', 1);
    const totalSteps = pick('totalSteps', 'total_steps', 1);
    const approvers = pick('approvers', 'approvers');
    const records = pick('records', 'records');
    const status = pick('status', 'status', 'pending');
    const businessLink = pick('businessLink', 'business_link', null);
    const attachments = pick('attachments', 'attachments', []);
    const relatedTaskIds = pick('relatedTaskIds', 'related_task_ids', []);
    const materials = pick('materials', 'materials', []);
    const priority = pick('priority', 'priority', 'normal');
    const dueDate = pick('dueDate', 'due_date', '');
    const relatedBatchCode = pick('relatedBatchCode', 'related_batch_code', '');
    const amount = pick('amount', 'amount', '');
    const workflowId = pick('workflowId', 'workflow_id', '');
    const workflowName = pick('workflowName', 'workflow_name', '');

    if (!id || !type || !title) {
      return res.status(400).json({ success: false, error: 'ID、类型、标题不能为空' });
    }

    // 2026-09-29 审计修复（P1-1）：金额缺失时按 businessLink 从业务单据回填（服务端权威口径）。
    // 领料申请此前完全不传 amount → 金额分级与免审批阈值判定对该业务线彻底失效。
    // 前端已补传，这里再兜一层，避免客户端漏传或伪造金额绕过金额分级。
    let amountFinal: unknown = amount;
    if (amountFinal === null || amountFinal === undefined || String(amountFinal).trim() === '') {
      const resolved = resolveBusinessAmount(db, businessLink as { type?: string; requestId?: string } | null);
      if (resolved !== null) {
        amountFinal = resolved;
        console.log(`[审批] 单 ${id} 金额回填：${resolved}（来源 ${String((businessLink as { type?: string })?.type)}）`);
      }
    }

    const now = new Date().toISOString();
    // C2 阶段 2: code 优先沿用调用方传入（兼容 SP-RE 等自定义前缀），否则按 type 派生
    // 默认 AP 前缀保留旧行为；type 包含 RE 时使用 SP-RE 前缀（招聘业务约定）
    const effectivePrefix = (type && type.toUpperCase().includes('RECRUIT')) ? 'SP-RE' : 'AP';

    /**
     * 该单号是否已被占用（审批单号必须唯一且与业务单号可区分）
     *
     * 2026-09-29 审计修复（P2-9）：部分前端调用方把**业务单号**直接当审批单号提交
     * （material_request 的 `code: newRecord.code`），导致 ① approvals.code 与业务单号
     * 命名空间混用、② 同一业务单重提时产生同码审批单（DB 实测 LL20260513013 有 13 条、
     * MR20260927-0002 有 2 条）。现由服务端自愈：撞号即重新生成，不再信任调用方传值。
     */
    const isCodeTaken = (c: string): boolean => {
      const probe = (table: string, col: string): boolean => {
        try {
          const r = db.exec(`SELECT 1 FROM ${table} WHERE ${col} = ? LIMIT 1`, [c]);
          return r.length > 0 && r[0].values.length > 0;
        } catch { return false; } // 表缺失（历史环境）→ 视为未占用
      };
      if (probe('approvals', 'code')) return true;
      // 与业务单号撞号同样视为占用：审批单号与业务单号必须能区分
      return probe('material_requests', 'request_code')
        || probe('material_returns', 'code')
        || probe('inbound_records', 'code')
        || probe('material_executes', 'code');
    };

    /** 生成一个当前未被占用的审批单号（gen 基于当日 MAX+1，理论上仍可能撞上并发写入） */
    const freshCode = (): string => {
      for (let i = 0; i < 5; i++) {
        const c = generateApprovalCode(effectivePrefix);
        if (!isCodeTaken(c)) return c;
      }
      // 连续 5 次都撞（仅在极端并发下可能）→ 附时间戳后缀兜底，绝不落重复单号
      return `${generateApprovalCode(effectivePrefix)}-${Date.now().toString().slice(-4)}`;
    };

    let approvalCode = String(code || '').trim();
    if (!approvalCode) {
      approvalCode = freshCode();
    } else if (isCodeTaken(approvalCode)) {
      const regenerated = freshCode();
      console.warn(`[审批] 单号 ${approvalCode} 已被占用（与既有审批单或业务单号冲突），自动改为 ${regenerated}`);
      approvalCode = regenerated;
    }

    db.run(
      `INSERT INTO approvals (
        id, code, type, type_name, category, title, description,
        applicant_id, applicant_name, applicant_department,
        apply_date, apply_time, current_step, total_steps,
        approvers, records, status, business_link, attachments,
        priority, due_date, reminder_count, related_batch_code, related_task_ids, notification_sent,
        amount, materials, workflow_id, workflow_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        approvalCode,
        type,
        typeName || '',
        category || 'business',
        title,
        description || '',
        applicantId || '',
        applicantName || '',
        applicantDepartment || '',
        applyDate || now.substring(0, 10),
        applyTime || now.substring(11, 19),
        currentStep || 1,
        totalSteps || 1,
        JSON.stringify(approvers || []),
        JSON.stringify(records || []),
        status || 'pending',
        JSON.stringify(businessLink || null),
        JSON.stringify(attachments || []),
        priority || 'normal',
        dueDate || '',
        0, // reminder_count
        relatedBatchCode || '',
        JSON.stringify(relatedTaskIds || []),
        0, // notification_sent
        amountFinal === 0 ? 0 : (amountFinal || ''), // 0 是有效金额（低于任意阈值），不可被 `||` 吞成空串
        JSON.stringify(materials || []),
        workflowId || '',
        workflowName || '',
        now,
        now,
      ]
    );

    saveDatabase();

    res.json({ success: true, message: '审批单创建成功', id, code: approvalCode });
  } catch (error) {
    console.error('创建审批单失败:', error);
    res.status(500).json({ success: false, error: '创建审批单失败' });
  }
});

/**
 * 更新审批单
 * PUT /api/approvals/:id
 */
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates = req.body;

    // 先查询当前数据
    const stmt = db.prepare('SELECT * FROM approvals WHERE id = ?');
    stmt.bind([id]);
    let approval: Record<string, unknown> | null = null;
    if (stmt.step()) {
      approval = stmt.getAsObject();
    }
    stmt.free();

    if (!approval) {
      return res.status(404).json({ success: false, error: '审批单不存在' });
    }

    // 不允许更新已审批的单据
    if (approval.status !== 'pending' && approval.status !== 'draft') {
      return res.status(400).json({ success: false, error: '当前状态不允许修改' });
    }

    const now = new Date().toISOString();

    // 构建更新语句
    const fields = [
      'code = COALESCE(?, code)',
      'type = COALESCE(?, type)',
      'type_name = COALESCE(?, type_name)',
      'category = COALESCE(?, category)',
      'title = COALESCE(?, title)',
      'description = COALESCE(?, description)',
      'applicant_id = COALESCE(?, applicant_id)',
      'applicant_name = COALESCE(?, applicant_name)',
      'applicant_department = COALESCE(?, applicant_department)',
      'apply_date = COALESCE(?, apply_date)',
      'apply_time = COALESCE(?, apply_time)',
      'current_step = COALESCE(?, current_step)',
      'total_steps = COALESCE(?, total_steps)',
      'approvers = ?',
      'records = ?',
      'status = COALESCE(?, status)',
      'business_link = ?',
      'attachments = ?',
      'priority = COALESCE(?, priority)',
      'due_date = COALESCE(?, due_date)',
      'related_batch_code = COALESCE(?, related_batch_code)',
      'related_task_ids = ?',
      'amount = COALESCE(?, amount)',
      'materials = ?',
      'workflow_id = COALESCE(?, workflow_id)',
      'workflow_name = COALESCE(?, workflow_name)',
      'updated_at = ?',
    ];

    db.run(`
      UPDATE approvals SET
        ${fields.join(', ')}
      WHERE id = ?
    `, [
      updates.code,
      updates.type,
      updates.typeName,
      updates.category,
      updates.title,
      updates.description,
      updates.applicantId,
      updates.applicantName,
      updates.applicantDepartment,
      updates.applyDate,
      updates.applyTime,
      updates.currentStep,
      updates.totalSteps,
      JSON.stringify(updates.approvers || []),
      JSON.stringify(updates.records || []),
      updates.status,
      JSON.stringify(updates.businessLink || null),
      JSON.stringify(updates.attachments || []),
      updates.priority,
      updates.dueDate,
      updates.relatedBatchCode,
      JSON.stringify(updates.relatedTaskIds || []),
      updates.amount,
      JSON.stringify(updates.materials || []),
      updates.workflowId,
      updates.workflowName,
      now,
      id,
    ]);

    saveDatabase();

    res.json({ success: true, message: '审批单更新成功' });
  } catch (error) {
    console.error('更新审批单失败:', error);
    res.status(500).json({ success: false, error: '更新审批单失败' });
  }
});

/**
 * 删除审批单
 * DELETE /api/approvals/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 检查状态
    const stmt = db.prepare('SELECT status FROM approvals WHERE id = ?');
    stmt.bind([id]);
    let approval: Record<string, unknown> | null = null;
    if (stmt.step()) {
      approval = stmt.getAsObject();
    }
    stmt.free();

    if (!approval) {
      return res.status(404).json({ success: false, error: '审批单不存在' });
    }

    // 只允许删除草稿和已取消的单据
    if (approval.status !== 'draft' && approval.status !== 'cancelled') {
      return res.status(400).json({ success: false, error: '只允许删除草稿或已取消的审批单' });
    }

    db.run('DELETE FROM approvals WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '审批单删除成功' });
  } catch (error) {
    console.error('删除审批单失败:', error);
    res.status(500).json({ success: false, error: '删除审批单失败' });
  }
});

// ============================================
// 审批操作 API
// ============================================

/**
 * 审批操作（通过/拒绝/部分通过/撤回）
 * PATCH /api/approvals/:id/action
 */
router.patch('/:id/action', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { action, comment, approverId, approverName, approvedItems } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: '操作类型不能为空' });
    }

    // 使用默认值（如果未传审批人信息）
    const finalApproverId = approverId || 'system';
    const finalApproverName = approverName || '系统';

    // 查询当前数据
    const stmt = db.prepare('SELECT * FROM approvals WHERE id = ?');
    stmt.bind([id]);
    let approval: Record<string, unknown> | null = null;
    if (stmt.step()) {
      approval = stmt.getAsObject();
    }
    stmt.free();

    if (!approval) {
      return res.status(404).json({ success: false, error: '审批单不存在' });
    }

    // 验证审批单状态
    if (approval.status !== 'pending') {
      return res.status(400).json({ success: false, error: `当前状态(${approval.status})不允许审批操作` });
    }

    const now = new Date().toISOString();
    // 2026-08-10 修复：双层转义兼容。INSERT 端 L505 之前会 JSON.stringify(approversFinal || [])，
    //   对已经是字符串的 approvers（前端未走 denormalize 路径）会双重转义存为 '"[]"'，
    //   导致 SELECT 后 PATCH 端 L709 JSON.parse('"[]"') 仍得到字符串，findIndex 报错。
    //   修复：智能判断字段类型 — 如果已经是数组直接用，否则反复 parse 字符串直到得到非字符串。
    const parseJsonField = (raw: unknown): unknown[] => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw !== 'string' || !raw) return [];
      let parsed: unknown = raw;
      for (let i = 0; i < 3; i++) {
        if (typeof parsed !== 'string') break;
        try { parsed = JSON.parse(parsed); } catch { return []; }
      }
      return Array.isArray(parsed) ? parsed : [];
    };
    // 2026-08-10：parseJsonObject — 同 parseJsonField 逻辑但返回对象（用于 business_link）
    const parseJsonObject = (raw: unknown): Record<string, unknown> | null => {
      if (!raw) return null;
      if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
      if (typeof raw !== 'string') return null;
      let parsed: unknown = raw;
      for (let i = 0; i < 3; i++) {
        if (typeof parsed !== 'string') break;
        try { parsed = JSON.parse(parsed); } catch { return null; }
      }
      return (typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed as Record<string, unknown> : null;
    };
    const approvers = parseJsonField(approval.approvers) as unknown as Approver[];
    const records = parseJsonField(approval.records) as unknown as ApprovalRecord[];

    let newStatus = approval.status as string;
    let newCurrentStep = approval.current_step as number;

    // ==================== 审批权限校验（2026-09-29 审计修复：恢复被注释的校验） ====================
    // 历史背景：此前两段校验被注释为"开发测试阶段"跳过，导致任意登录用户可审批任意单据、
    // 且 approve 分支一次即终审，approval_level_configs 配置的多级审批完全失效。
    // 恢复策略（两条兜底，避免存量单据被永久卡死）：
    //   ① approvers 为空 → 无预设审批人（当前系统默认提交形态），没有校验对象，放行
    //   ② approvers 的 userId 全部无法在 users 表命中 → 历史脏配置（如 'user_姓名' 旧格式），
    //      放行并告警；设 APPROVAL_STRICT_APPROVER=1 可关闭该兜底、强制严格校验
    const strictApprover = process.env.APPROVAL_STRICT_APPROVER === '1';
    const currentApproverIndex = approvers.length > 0
      ? approvers.findIndex((a: Approver) => a.order === newCurrentStep && a.status === 'pending')
      : -1;

    /** approvers 是否为有效配置：至少一个 userId 能在 users 表命中（历史 'user_姓名' 旧格式不算） */
    const isApproverConfigValid = (): boolean => {
      const ids = approvers.map((a) => String(a?.userId || '').trim()).filter(Boolean);
      if (ids.length === 0) return false;
      try {
        const stmt = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE oid IN (${ids.map(() => '?').join(',')})`);
        stmt.bind(ids);
        const ok = stmt.step() && Number((stmt.getAsObject() as { c?: number }).c || 0) > 0;
        stmt.free();
        return ok;
      } catch {
        return false; // users 表缺失（历史环境）→ 视为无效配置，走宽松兜底
      }
    };
    const approverConfigValid = isApproverConfigValid();

    if (approverConfigValid || strictApprover) {
      if (currentApproverIndex === -1) {
        return res.status(400).json({
          success: false,
          error: `未找到第 ${newCurrentStep} 步的待审批人，无法执行「${action}」`,
        });
      }
      const expected = approvers[currentApproverIndex];
      const expectedIds = [String(expected.userId || '').trim(), String(expected.role || '').trim()];
      // 登录账号 oid 优先匹配 userId，其次匹配角色名/姓名（兼容按角色配置的历史单据）
      if (!expectedIds.includes(finalApproverId) && !expectedIds.includes(finalApproverName)) {
        return res.status(403).json({
          success: false,
          error: `您不是第 ${newCurrentStep} 步的待审批人（应为 ${expected.userName || expected.userId || '未知'}）`,
        });
      }
    } else if (approvers.length > 0) {
      console.warn(`[审批] 单 ${id} 的 approvers 无法匹配系统账号（历史数据），本次按宽松模式放行`);
    }

    const currentApprover = currentApproverIndex >= 0 ? approvers[currentApproverIndex] : null;

    // ==================== 自审自批防护（2026-09-29 审计修复 P1-2） ====================
    // 背景：免审批自动通过此前由前端以**申请人本人身份**调本端点完成，因此不能简单地
    // "禁止自审" —— 那会把免审批流程一起禁掉，退料等业务直接卡死。
    // 现改为**服务端复核免审批资格**：以申请人身份操作时，只有该单据确实符合免审批规则
    // （类型免审 / 金额低于阈值）才放行；否则拒绝，要求由他人审批。
    // 这样既保留免审批直通，又堵住"任意单据自己批自己"的口子。
    //
    // 2026-10-09 测试阶段临时放开：当前系统仅 1 个登录用户（陆启闯），无他人可审批。
    // 自审自批检测仍会触发，但只 console.warn 提示，**不再返回 403 拒绝**。
    // 由环境变量 APPROVAL_STRICT_SELF_CHECK=1 重新开启严格模式（生产上线前）。
    const STRICT_SELF_CHECK = process.env.APPROVAL_STRICT_SELF_CHECK === '1';
    const applicantId = String(approval.applicant_id || '').trim();
    const applicantName = String(approval.applicant_name || '').trim();
    const isSelfApproval = (!!applicantId && applicantId === finalApproverId)
      || (!!applicantName && applicantName === finalApproverName);
    if (isSelfApproval) {
      const verdict = evaluateExemptEligibility(db, approval);
      if (!verdict.eligible) {
        if (STRICT_SELF_CHECK) {
          return res.status(403).json({
            success: false,
            error: `不能审批自己提交的单据：${verdict.reason}`,
          });
        }
        // 测试阶段：仅警告，不拒绝
        console.warn(`[审批] 自审自批警告（测试阶段已放开，APPROVAL_STRICT_SELF_CHECK=1 恢复严格模式）：单 ${id} applicantId=${applicantId} applicantName=${applicantName} - ${verdict.reason}`);
      } else {
        console.log(`[审批] 单 ${id} 以申请人身份通过（免审批资格成立）：${verdict.reason}`);
      }
    }

    // 添加审批记录
    const record: ApprovalRecord = {
      id: generateId('REC'),
      approvalId: id,
      approverId: finalApproverId,
      approverName: finalApproverName,
      action,
      comment: comment || '',
      actionTime: now,
      attachments: [],
    };

    // 如果是部分审批，记录批准的物料数量
    if (action === 'partially_approve' && approvedItems) {
      record.metadata = { approvedItems };
    }

    records.push(record);

    // 更新当前审批人状态（只有存在预设审批人才更新）
    if (currentApprover) {
      approvers[currentApproverIndex] = {
        ...currentApprover,
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'partially_approve' ? 'partially_approved' : 'skipped',
        comment: comment || '',
        actionTime: now,
      };
    }

    // 处理审批结果
    switch (action) {
      case 'approve': {
        // 2026-09-29 审计修复：恢复多级审批推进。
        // 此前为"一次性审批直接通过，跳过多步骤判断"，配置 2~3 级的单据点一次即终审，
        // 且把剩余审批人伪写为"审批通过（开发模式）"——审批轨迹失真、级别配置形同虚设。
        // 现语义：有预设审批人且未到最后一级 → 推进 current_step，单据保持 pending；
        //         无预设审批人（approvers 为空，当前默认形态）→ 直接终审，保持原行为。
        const totalSteps = Number(approval.total_steps) || 1;
        if (currentApprover && newCurrentStep < totalSteps) {
          newCurrentStep += 1;
          newStatus = 'pending'; // 后续步骤继续审批，暂不触发业务联动
        } else {
          newStatus = 'approved';
          newCurrentStep = totalSteps;
        }
        break;
      }

      case 'reject':
        newStatus = 'rejected';
        // 拒绝后，跳过剩余步骤
        approvers.forEach((a: Approver, index: number) => {
          if (index > currentApproverIndex && a.status === 'pending') {
            a.status = 'skipped';
            a.comment = '前序审批被拒绝';
            a.actionTime = now;
          }
        });
        break;

      case 'partially_approve':
        // 部分通过，需要重新计算剩余数量
        // 这里只是标记状态，实际的数量重算由业务逻辑处理
        if (newCurrentStep >= (approval.total_steps as number)) {
          newStatus = 'partially_approved';
        } else {
          newCurrentStep += 1;
        }
        break;

      case 'cancel':
        newStatus = 'cancelled';
        // 取消后，跳过剩余步骤
        approvers.forEach((a: Approver, index: number) => {
          if (index > currentApproverIndex && a.status === 'pending') {
            a.status = 'skipped';
            a.comment = '申请人撤回';
            a.actionTime = now;
          }
        });
        break;

      default:
        return res.status(400).json({ success: false, error: '未知的操作类型' });
    }

    // 2026-09-28 审计修复：留存审批终态写入前的原值——
    // 物料入库联动失败时要把审批回滚到 pending，避免"审批显示已通过、库存却没入账"的假成功
    // （此前联动失败只 console.warn，接口仍返回 200「审批操作成功」）。
    const prevApprovalState: Record<string, any> = {
      status: approval.status,
      current_step: approval.current_step,
      approvers: approval.approvers,
      records: approval.records,
      updated_at: approval.updated_at,
    };

    db.run(`
      UPDATE approvals SET
        status = ?,
        current_step = ?,
        approvers = ?,
        records = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      newStatus,
      newCurrentStep,
      JSON.stringify(approvers),
      JSON.stringify(records),
      now,
      id,
    ]);

    saveDatabase();

    // 审批操作完成后，调用审批联动更新业务表（覆盖所有业务类型）
    if (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'cancelled' || newStatus === 'partially_approved') {
      // 2026-08-10 修复：用 parseJsonObject 兼容双层转义（之前 JSON.parse(business_link) 失败导致联动静默跳过）
      const businessLink = parseJsonObject(approval.business_link) as { type?: string; requestId?: string; requestCode?: string };
      if (businessLink?.type && businessLink?.requestId) {
        try {
          const linkageAction = newStatus === 'approved' ? 'approved' as const
            : newStatus === 'rejected' ? 'rejected' as const
            : newStatus === 'cancelled' ? 'cancelled' as const
            : 'partially_approved' as const;
          const result = updateBusinessTable(db, businessLink.type, businessLink.requestId, linkageAction, approval.code as string, businessLink);
          if (result.success) {
            // 2026-08-10 修复：updateBusinessTable 只 UPDATE 内存 db，需显式 saveDatabase 落盘，否则列表刷新读到脏数据
            saveDatabase();
            console.log(`【审批联动】${businessLink.type} 状态已更新: ${businessLink.requestId} -> ${linkageAction}`);
          } else if (businessLink.type === 'material_inbound' || businessLink.type === 'return' || businessLink.type === 'crop_storage' || businessLink.type === 'material_transfer' || businessLink.type === 'seedling') {
            // 2026-10-09 修复：补录/调拨/育苗种源审批也直接影响库存账实（之前漏了，导致联动失败时
            //   approval.status 改为 approved 但库存/回流永远没写入，用户重试也无效）
            db.run(
              `UPDATE approvals SET status = ?, current_step = ?, approvers = ?, records = ?, updated_at = ? WHERE id = ?`,
              [prevApprovalState.status, prevApprovalState.current_step, prevApprovalState.approvers, prevApprovalState.records, prevApprovalState.updated_at, id]
            );
            saveDatabase();
            return res.status(409).json({ success: false, error: `业务联动失败，审批已回滚：${result.message}` });
          } else {
            console.warn(`【审批联动】${businessLink.type} 更新失败: ${result.message}`);
          }
        } catch (e) {
          console.error('【审批联动】更新业务表失败:', e);
          // 2026-09-29 审计修复：退回路径此前只覆盖 material_inbound，漏了 'return'。
          // 两者都直接影响库存账实（入库加库存、退料恢复库存），异常时若不回滚，
          // 审批显示"已通过"但库存永远没动，且终态不可重试 → 账实不符。
          if (businessLink.type === 'material_inbound' || businessLink.type === 'return') {
            // 同上：异常也必须是硬失败，不能让审批看似成功
            db.run(
              `UPDATE approvals SET status = ?, current_step = ?, approvers = ?, records = ?, updated_at = ? WHERE id = ?`,
              [prevApprovalState.status, prevApprovalState.current_step, prevApprovalState.approvers, prevApprovalState.records, prevApprovalState.updated_at, id]
            );
            saveDatabase();
            return res.status(409).json({
              success: false,
              error: `业务联动异常，审批已回滚：${e instanceof Error ? e.message : String(e)}`,
            });
          }
        }
      }
    }

    // 重新查询完整审批记录返回
    const reloadStmt = db.prepare('SELECT * FROM approvals WHERE id = ?');
    reloadStmt.bind([id]);
    let updatedApproval: Record<string, unknown> | null = null;
    if (reloadStmt.step()) {
      updatedApproval = reloadStmt.getAsObject();
    }
    reloadStmt.free();

    // JSON字段解析
    if (updatedApproval) {
      ['approvers', 'records', 'business_link', 'attachments', 'materials', 'related_task_ids'].forEach(field => {
        if (typeof updatedApproval![field] === 'string') {
          try { updatedApproval![field] = JSON.parse(updatedApproval![field] as string); } catch { /* keep original */ }
        }
      });
    }

    res.json({
      success: true,
      message: '审批操作成功',
      data: updatedApproval || {
        newStatus,
        newCurrentStep,
        totalSteps: approval.total_steps,
        isCompleted: newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'partially_approved' || newStatus === 'cancelled',
      },
    });
  } catch (error) {
    console.error('审批操作失败:', error);
    res.status(500).json({ success: false, error: '审批操作失败' });
  }
});

/**
 * 提交审批（从草稿或直接创建审批单）
 * POST /api/approvals/:id/submit
 */
router.post('/:id/submit', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { workflowId, businessData } = req.body;

    // 查询当前数据
    const stmt = db.prepare('SELECT * FROM approvals WHERE id = ?');
    stmt.bind([id]);
    let approval: Record<string, unknown> | null = null;
    if (stmt.step()) {
      approval = stmt.getAsObject();
    }
    stmt.free();

    if (!approval) {
      return res.status(404).json({ success: false, error: '审批单不存在' });
    }

    // 验证状态
    if (approval.status !== 'draft' && approval.status !== 'pending') {
      return res.status(400).json({ success: false, error: '当前状态不允许提交' });
    }

    // 如果提供了工作流ID，获取工作流配置
    let approvers: Approver[] = [];
    let totalSteps = 1;

    if (workflowId) {
      const wfStmt = db.prepare('SELECT * FROM approval_workflows WHERE id = ?');
      wfStmt.bind([workflowId]);
      let workflow: Record<string, unknown> | null = null;
      if (wfStmt.step()) {
        workflow = wfStmt.getAsObject();
      }
      wfStmt.free();

      if (workflow && workflow.nodes) {
        const nodes = JSON.parse(workflow.nodes as string) as Array<{
          id: string;
          nodeName: string;
          approverType: string;
          approverId?: string;
          approverName?: string;
          approverRole?: string;
        }>;

        totalSteps = nodes.length;

        // 根据节点配置生成审批人列表
        approvers = nodes.map((node, index) => ({
          userId: node.approverId || '',
          userName: node.approverName || '',
          role: node.approverRole || '',
          order: index + 1,
          status: 'pending' as const,
          nodeId: node.id,
          nodeName: node.nodeName,
        }));
      }
    }

    const now = new Date().toISOString();

    db.run(`
      UPDATE approvals SET
        status = 'pending',
        current_step = 1,
        total_steps = ?,
        approvers = ?,
        workflow_id = COALESCE(?, workflow_id),
        updated_at = ?
      WHERE id = ?
    `, [
      totalSteps,
      JSON.stringify(approvers),
      workflowId,
      now,
      id,
    ]);

    saveDatabase();

    res.json({
      success: true,
      message: '审批单提交成功',
      data: {
        workflowId,
        totalSteps,
        approvers,
      },
    });
  } catch (error) {
    console.error('提交审批失败:', error);
    res.status(500).json({ success: false, error: '提交审批失败' });
  }
});

// ============================================
// 审批历史记录 API
// ============================================

/**
 * 获取审批单的历史记录
 * GET /api/approvals/:id/history
 */
router.get('/:id/history', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const stmt = db.prepare('SELECT records FROM approvals WHERE id = ?');
    stmt.bind([id]);
    let approval: Record<string, unknown> | null = null;
    if (stmt.step()) {
      approval = stmt.getAsObject();
    }
    stmt.free();

    if (!approval) {
      return res.status(404).json({ success: false, error: '审批单不存在' });
    }

    const records: ApprovalRecord[] = approval.records ? JSON.parse(approval.records as string) : [];

    // 按时间倒序排列
    records.sort((a, b) => new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime());

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取审批历史失败:', error);
    res.status(500).json({ success: false, error: '获取审批历史失败' });
  }
});

/**
 * 按业务信息查询审批单
 * GET /api/approvals/by-business/:type/:requestId
 * 返回该业务关联的审批单（含 records 审批记录）
 */
router.get('/by-business/:type/:requestId', (req, res) => {
  try {
    const db = getDatabase();
    const { type, requestId } = req.params;

    // 从 business_link JSON 字段中匹配 type 和 requestId
    const stmt = db.prepare(`
      SELECT * FROM approvals
      WHERE business_link LIKE ? AND business_link LIKE ?
      ORDER BY created_at DESC
    `);
    stmt.bind([`%"type":"${type}"%`, `%${requestId}%`]);

    const approvals: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      // 解析 JSON 字段
      approvals.push({
        ...row,
        approvers: row.approvers ? JSON.parse(row.approvers as string) : [],
        records: row.records ? JSON.parse(row.records as string) : [],
        businessLink: row.business_link ? JSON.parse(row.business_link as string) : null,
        attachments: row.attachments ? JSON.parse(row.attachments as string) : [],
      });
    }
    stmt.free();

    res.json({ success: true, data: approvals });
  } catch (error) {
    console.error('按业务查询审批单失败:', error);
    res.status(500).json({ success: false, error: '按业务查询审批单失败' });
  }
});

/**
 * 获取用户的待审批列表
 * GET /api/approvals/pending/me
 * Query: userId, userRoles (逗号分隔)
 */
router.get('/pending/me', (req, res) => {
  try {
    const db = getDatabase();
    const { userId, userRoles } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: '用户ID不能为空' });
    }

    const roles = userRoles ? (userRoles as string).split(',') : [];

    // 查询所有待审批的单据
    const stmt = db.prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at DESC");
    const approvals: Record<string, unknown>[] = [];
    while (stmt.step()) {
      approvals.push(stmt.getAsObject());
    }
    stmt.free();

    // 筛选当前用户可以审批的单据
    const pendingApprovals = approvals.filter(approval => {
      const approvers: Approver[] = approval.approvers ? JSON.parse(approval.approvers as string) : [];
      const currentStep = approval.current_step as number;

      const currentApprover = approvers.find(
        (a: Approver) => a.order === currentStep && a.status === 'pending'
      );

      if (!currentApprover) {
        return false;
      }

      // 检查是否匹配
      return currentApprover.userId === userId ||
        (currentApprover.role && roles.includes(currentApprover.role));
    });

    // 解析 JSON 字段
    const result = pendingApprovals.map(a => ({
      id: a.id,
      code: a.code,
      type: a.type,
      typeName: a.type_name,
      category: a.category,
      title: a.title,
      description: a.description,
      applicantId: a.applicant_id,
      applicantName: a.applicant_name,
      applicantDepartment: a.applicant_department,
      applyDate: a.apply_date,
      applyTime: a.apply_time,
      currentStep: a.current_step,
      totalSteps: a.total_steps,
      approvers: a.approvers ? JSON.parse(a.approvers as string) : [],
      records: a.records ? JSON.parse(a.records as string) : [],
      status: a.status,
      businessLink: a.business_link ? JSON.parse(a.business_link as string) : null,
      attachments: a.attachments ? JSON.parse(a.attachments as string) : [],
      priority: a.priority,
      dueDate: a.due_date,
      reminderCount: a.reminder_count,
      relatedBatchCode: a.related_batch_code,
      relatedTaskIds: a.related_task_ids ? JSON.parse(a.related_task_ids as string) : [],
      notificationSent: Boolean(a.notification_sent),
      amount: a.amount,
      materials: a.materials ? JSON.parse(a.materials as string) : [],
      workflowId: a.workflow_id,
      workflowName: a.workflow_name,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error('获取待审批列表失败:', error);
    res.status(500).json({ success: false, error: '获取待审批列表失败' });
  }
});

/**
 * 获取用户提交的审批列表
 * GET /api/approvals/submitted/me
 * Query: userId
 */
router.get('/submitted/me', (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: '用户ID不能为空' });
    }

    const stmt = db.prepare(
      "SELECT * FROM approvals WHERE applicant_id = ? ORDER BY created_at DESC"
    );
    stmt.bind([userId as string]);

    const approvals: Record<string, unknown>[] = [];
    while (stmt.step()) {
      approvals.push(stmt.getAsObject());
    }
    stmt.free();

    // 解析 JSON 字段并转换 camelCase
    const result = approvals.map(a => ({
      id: a.id,
      code: a.code,
      type: a.type,
      typeName: a.type_name,
      category: a.category,
      title: a.title,
      description: a.description,
      applicantId: a.applicant_id,
      applicantName: a.applicant_name,
      applicantDepartment: a.applicant_department,
      applyDate: a.apply_date,
      applyTime: a.apply_time,
      currentStep: a.current_step,
      totalSteps: a.total_steps,
      approvers: a.approvers ? JSON.parse(a.approvers as string) : [],
      records: a.records ? JSON.parse(a.records as string) : [],
      status: a.status,
      businessLink: a.business_link ? JSON.parse(a.business_link as string) : null,
      attachments: a.attachments ? JSON.parse(a.attachments as string) : [],
      priority: a.priority,
      dueDate: a.due_date,
      reminderCount: a.reminder_count,
      relatedBatchCode: a.related_batch_code,
      relatedTaskIds: a.related_task_ids ? JSON.parse(a.related_task_ids as string) : [],
      notificationSent: Boolean(a.notification_sent),
      amount: a.amount,
      materials: a.materials ? JSON.parse(a.materials as string) : [],
      workflowId: a.workflow_id,
      workflowName: a.workflow_name,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error('获取已提交列表失败:', error);
    res.status(500).json({ success: false, error: '获取已提交列表失败' });
  }
});

/**
 * 获取审批统计数据
 * GET /api/approvals/stats
 * Query: userId (可选，用于个人统计)
 */
router.get('/stats/summary', (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.query;

    let sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'partially_approved' THEN 1 ELSE 0 END) as partially_approved,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
      FROM approvals
    `;

    const bindings: string[] = [];

    if (userId) {
      sql = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'partially_approved' THEN 1 ELSE 0 END) as partially_approved,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
        FROM approvals
        WHERE applicant_id = ?
      `;
      bindings.push(userId as string);
    }

    const stmt = db.prepare(sql);
    if (bindings.length > 0) {
      stmt.bind(bindings);
    }

    stmt.step();
    const stats = stmt.getAsObject();
    stmt.free();

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取审批统计失败:', error);
    res.status(500).json({ success: false, error: '获取审批统计失败' });
  }
});

/**
 * 获取超时的审批单
 * GET /api/approvals/overdue
 */
router.get('/overdue/list', (req, res) => {
  try {
    const db = getDatabase();
    const { workflowId } = req.query;

    // 查询所有待审批的单据
    let sql = "SELECT * FROM approvals WHERE status = 'pending' AND due_date IS NOT NULL AND due_date != ''";
    const bindings: string[] = [];

    if (workflowId) {
      sql += ' AND workflow_id = ?';
      bindings.push(workflowId as string);
    }

    const stmt = db.prepare(sql);
    if (bindings.length > 0) {
      stmt.bind(bindings);
    }

    const approvals: Record<string, unknown>[] = [];
    while (stmt.step()) {
      approvals.push(stmt.getAsObject());
    }
    stmt.free();

    // 筛选超时的单据
    const now = new Date();
    const overdueApprovals = approvals.filter(approval => {
      const dueDate = new Date(approval.due_date as string);
      return now > dueDate;
    });

    // 解析 JSON 字段并转换 camelCase
    const result = overdueApprovals.map(a => ({
      id: a.id,
      code: a.code,
      type: a.type,
      typeName: a.type_name,
      category: a.category,
      title: a.title,
      description: a.description,
      applicantId: a.applicant_id,
      applicantName: a.applicant_name,
      applicantDepartment: a.applicant_department,
      applyDate: a.apply_date,
      applyTime: a.apply_time,
      currentStep: a.current_step,
      totalSteps: a.total_steps,
      approvers: a.approvers ? JSON.parse(a.approvers as string) : [],
      records: a.records ? JSON.parse(a.records as string) : [],
      status: a.status,
      businessLink: a.business_link ? JSON.parse(a.business_link as string) : null,
      attachments: a.attachments ? JSON.parse(a.attachments as string) : [],
      priority: a.priority,
      dueDate: a.due_date,
      reminderCount: a.reminder_count,
      relatedBatchCode: a.related_batch_code,
      relatedTaskIds: a.related_task_ids ? JSON.parse(a.related_task_ids as string) : [],
      notificationSent: Boolean(a.notification_sent),
      amount: a.amount,
      materials: a.materials ? JSON.parse(a.materials as string) : [],
      workflowId: a.workflow_id,
      workflowName: a.workflow_name,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      isOverdue: true,
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error('获取超时审批单失败:', error);
    res.status(500).json({ success: false, error: '获取超时审批单失败' });
  }
});

// ============================================
// 批量操作 API
// ============================================

/**
 * 批量审批
 * POST /api/approvals/batch-action
 */
router.post('/batch-action', (req, res) => {
  try {
    const db = getDatabase();
    const { approvalIds, action, approverId, approverName, comment } = req.body;

    if (!approvalIds || !Array.isArray(approvalIds) || approvalIds.length === 0) {
      return res.status(400).json({ success: false, error: '审批单ID列表不能为空' });
    }

    if (!action || !approverId || !approverName) {
      return res.status(400).json({ success: false, error: '操作类型和审批人信息不能为空' });
    }

    const now = new Date().toISOString();
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of approvalIds) {
      try {
        // 查询当前数据
        const stmt = db.prepare('SELECT * FROM approvals WHERE id = ?');
        stmt.bind([id as string]);
        let approval: Record<string, unknown> | null = null;
        if (stmt.step()) {
          approval = stmt.getAsObject();
        }
        stmt.free();

        if (!approval) {
          results.push({ id, success: false, error: '审批单不存在' });
          continue;
        }

        if (approval.status !== 'pending') {
          results.push({ id, success: false, error: `状态不允许(${approval.status})` });
          continue;
        }

        const approvers: Approver[] = approval.approvers ? JSON.parse(approval.approvers as string) : [];
        const records: ApprovalRecord[] = approval.records ? JSON.parse(approval.records as string) : [];
        let newStatus = approval.status as string;
        let newCurrentStep = approval.current_step as number;

        // 查找当前步骤的审批人（approvers 为空表示无预设审批人，与单条 PATCH 同语义）
        const currentApproverIndex = approvers.length > 0
          ? approvers.findIndex((a: Approver) => a.order === newCurrentStep && a.status === 'pending')
          : -1;

        // 2026-09-29 审计修复：此前 approvers 为空时直接判失败，导致
        // material_inbound 8/8、return_material 3/5、material_request 7/36 的存量单据
        // 批量审批永远不可用（单条 PATCH 却能通过 —— 同功能两套语义）。
        // 现与单条端点对齐：仅当 approvers 配置有效（userId 能命中 users 表）
        // 或显式开启 APPROVAL_STRICT_APPROVER=1 时才强制校验。
        const batchStrict = process.env.APPROVAL_STRICT_APPROVER === '1';
        let batchConfigValid = false;
        if (approvers.length > 0) {
          const idsInApprovers = approvers.map((a) => String(a?.userId || '').trim()).filter(Boolean);
          if (idsInApprovers.length > 0) {
            try {
              const cStmt = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE oid IN (${idsInApprovers.map(() => '?').join(',')})`);
              cStmt.bind(idsInApprovers);
              batchConfigValid = cStmt.step() && Number((cStmt.getAsObject() as { c?: number }).c || 0) > 0;
              cStmt.free();
            } catch {
              batchConfigValid = false;
            }
          }
        }

        if (batchConfigValid || batchStrict) {
          if (currentApproverIndex === -1) {
            results.push({ id, success: false, error: `未找到第 ${newCurrentStep} 步的待审批人` });
            continue;
          }
          const expected = approvers[currentApproverIndex];
          const expectedIds = [String(expected.userId || '').trim(), String(expected.role || '').trim()];
          if (!expectedIds.includes(String(approverId)) && !expectedIds.includes(String(approverName))) {
            results.push({ id, success: false, error: `您不是第 ${newCurrentStep} 步的待审批人（应为 ${expected.userName || expected.userId || '未知'}）` });
            continue;
          }
        } else if (approvers.length > 0) {
          console.warn(`[批量审批] 单 ${id} 的 approvers 无法匹配系统账号（历史数据），本次按宽松模式放行`);
        }

        const currentApprover = currentApproverIndex >= 0 ? approvers[currentApproverIndex] : null;

        // 添加审批记录
        records.push({
          id: generateId('REC'),
          approvalId: id,
          approverId,
          approverName,
          action,
          comment: comment || '',
          actionTime: now,
        });

        // 更新当前审批人状态（approvers 为空时跳过，与单条 PATCH 同语义）
        if (currentApprover) {
          approvers[currentApproverIndex] = {
            ...currentApprover,
            status: action === 'approve' ? 'approved' : 'rejected',
            comment: comment || '',
            actionTime: now,
          };
        }

        // 处理审批结果
        if (action === 'approve') {
          if (currentApprover && newCurrentStep < (approval.total_steps as number)) {
            newCurrentStep += 1; // 多级审批：推进到下一步，单据保持 pending
          } else {
            newStatus = 'approved';
            newCurrentStep = Number(approval.total_steps) || 1;
          }
        } else if (action === 'reject') {
          newStatus = 'rejected';
        }

        // 2026-09-29 审计修复：留存终态写入前的原值——
        // 库存类联动（入库/退料）失败时必须把审批回滚到 pending，
        // 否则"审批显示已通过、库存却没动"且终态不可重试（与单条 PATCH 对齐）
        const prevBatchState: Record<string, any> = {
          status: approval.status,
          current_step: approval.current_step,
          approvers: approval.approvers,
          records: approval.records,
          updated_at: approval.updated_at,
        };

        db.run(`
          UPDATE approvals SET
            status = ?,
            current_step = ?,
            approvers = ?,
            records = ?,
            updated_at = ?
          WHERE id = ?
        `, [
          newStatus,
          newCurrentStep,
          JSON.stringify(approvers),
          JSON.stringify(records),
          now,
          id,
        ]);

        // 2026-09-27 审计修复：批量审批此前不回写业务表——终态时调 updateBusinessTable，
        // 与单条 PATCH /:id/action 的联动行为对齐（此前只有前端逐条调用才生效）
        if (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'cancelled' || newStatus === 'partially_approved') {
          try {
            // 兼容单层/双重转义的 business_link 解析（与单条端点的 parseJsonObject 同逻辑，
            // 此处内联实现——parseJsonObject 是单条 handler 内的局部函数，不跨 handler 可见）
            let rawLink: unknown = approval.business_link;
            for (let i = 0; i < 3 && typeof rawLink === 'string'; i++) {
              try { rawLink = JSON.parse(rawLink as string); } catch { break; }
            }
            const businessLink = (rawLink && typeof rawLink === 'object')
              ? rawLink as { type?: string; requestId?: string; requestCode?: string }
              : null;
            if (businessLink?.type && businessLink?.requestId) {
              const linkageAction = newStatus === 'approved' ? 'approved' as const
                : newStatus === 'rejected' ? 'rejected' as const
                : newStatus === 'cancelled' ? 'cancelled' as const
                : 'partially_approved' as const;
              const linkResult = updateBusinessTable(db, businessLink.type, businessLink.requestId, linkageAction, String(approval.code || ''), businessLink);
              if (!linkResult.success) {
                console.warn(`【批量审批联动】${businessLink.type} 更新失败: ${linkResult.message}`);
                // 2026-09-28：库存类联动（入库/退料）失败时标记该条为失败，
                // 避免"审批显示成功但库存没动"被静默吞掉（审批人可据此重试）
                // 2026-09-29 审计修复：标记失败之外还必须**回滚审批终态**——
                // 此前只 continue，approvals 行仍是 approved，单据永久卡在"审批通过但库存没动"。
                // 现与单条 PATCH 对齐：回滚 + 报错，审批人可原样重试。
                if (businessLink.type === 'material_inbound' || businessLink.type === 'return') {
                  db.run(
                    `UPDATE approvals SET status = ?, current_step = ?, approvers = ?, records = ?, updated_at = ? WHERE id = ?`,
                    [prevBatchState.status, prevBatchState.current_step, prevBatchState.approvers, prevBatchState.records, prevBatchState.updated_at, id]
                  );
                  results.push({ id, success: false, error: `库存联动失败，审批已回滚可重试：${linkResult.message || '未知原因'}` });
                  continue;
                }
              }
            }
          } catch (linkErr) {
            console.error('【批量审批联动】更新业务表失败:', linkErr);
            // 2026-09-29 审计修复：异常路径此前只打日志，审批已置终态却无任何标记；
            // 库存类联动异常同样必须回滚 + 标记失败
            const rawLinkType = (() => {
              try {
                let p: unknown = approval.business_link;
                for (let i = 0; i < 3 && typeof p === 'string'; i++) { p = JSON.parse(p as string); }
                return (p && typeof p === 'object') ? String((p as { type?: string }).type || '') : '';
              } catch { return ''; }
            })();
            if (rawLinkType === 'material_inbound' || rawLinkType === 'return') {
              db.run(
                `UPDATE approvals SET status = ?, current_step = ?, approvers = ?, records = ?, updated_at = ? WHERE id = ?`,
                [prevBatchState.status, prevBatchState.current_step, prevBatchState.approvers, prevBatchState.records, prevBatchState.updated_at, id]
              );
              results.push({ id, success: false, error: `库存联动异常，审批已回滚可重试：${linkErr instanceof Error ? linkErr.message : String(linkErr)}` });
              continue;
            }
          }
        }

        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, error: '处理异常' });
      }
    }

    saveDatabase();

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `批量审批完成：成功 ${successCount}，失败 ${failCount}`,
      data: results,
    });
  } catch (error) {
    console.error('批量审批失败:', error);
    res.status(500).json({ success: false, error: '批量审批失败' });
  }
});

export default router;
