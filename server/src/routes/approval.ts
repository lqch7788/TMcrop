/**
 * 审批单 API 路由
 * 提供审批单的 CRUD 操作
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

// ============================================
// 审批单 API
// ============================================

/**
 * 获取所有审批单
 * GET /api/approvals
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { type, status, category, applicantId, keyword } = req.query;

    let sql = 'SELECT * FROM approvals WHERE 1=1';
    const bindings: string[] = [];

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

    if (keyword) {
      sql += ' AND (title LIKE ? OR code LIKE ? OR applicant_name LIKE ?)';
      const kw = `%${keyword}%`;
      bindings.push(kw, kw, kw);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const approvals: Record<string, unknown>[] = [];
    while (stmt.step()) {
      approvals.push(stmt.getAsObject());
    }
    stmt.free();

    // 解析 JSON 字段
    const result = approvals.map(a => ({
      ...a,
      approvers: a.approvers ? JSON.parse(a.approvers as string) : [],
      records: a.records ? JSON.parse(a.records as string) : [],
      businessLink: a.business_link ? JSON.parse(a.business_link as string) : null,
      attachments: a.attachments ? JSON.parse(a.attachments as string) : [],
      materials: a.materials ? JSON.parse(a.materials as string) : [],
      relatedTaskIds: a.related_task_ids ? JSON.parse(a.related_task_ids as string) : [],
      notificationSent: Boolean(a.notification_sent),
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

    // 解析 JSON 字段
    const result = {
      ...approval,
      approvers: approval.approvers ? JSON.parse(approval.approvers as string) : [],
      records: approval.records ? JSON.parse(approval.records as string) : [],
      businessLink: approval.business_link ? JSON.parse(approval.business_link as string) : null,
      attachments: approval.attachments ? JSON.parse(approval.attachments as string) : [],
      materials: approval.materials ? JSON.parse(approval.materials as string) : [],
      relatedTaskIds: approval.related_task_ids ? JSON.parse(approval.related_task_ids as string) : [],
      notificationSent: Boolean(approval.notification_sent),
    };

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
    const {
      id,
      code,
      type,
      typeName,
      category,
      title,
      description,
      applicantId,
      applicantName,
      applicantDepartment,
      applyDate,
      applyTime,
      currentStep,
      totalSteps,
      approvers,
      records,
      status,
      businessLink,
      attachments,
      priority,
      dueDate,
      relatedBatchCode,
      relatedTaskIds,
      amount,
      materials,
    } = req.body;

    if (!id || !code || !type || !title) {
      return res.status(400).json({ success: false, error: 'ID、编码、类型、标题不能为空' });
    }

    const now = new Date().toISOString();

    db.run(`
      INSERT INTO approvals (
        id, code, type, type_name, category, title, description,
        applicant_id, applicant_name, applicant_department,
        apply_date, apply_time, current_step, total_steps,
        approvers, records, status, business_link, attachments,
        priority, due_date, related_batch_code, related_task_ids,
        amount, materials, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      code,
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
      relatedBatchCode || '',
      JSON.stringify(relatedTaskIds || []),
      amount || '',
      JSON.stringify(materials || []),
      now,
      now,
    ]);

    saveDatabase();

    res.json({ success: true, message: '审批单创建成功', id });
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

    db.run('DELETE FROM approvals WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '审批单删除成功' });
  } catch (error) {
    console.error('删除审批单失败:', error);
    res.status(500).json({ success: false, error: '删除审批单失败' });
  }
});

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

    const now = new Date().toISOString();
    const approvers = approval.approvers ? JSON.parse(approval.approvers as string) : [];
    const records = approval.records ? JSON.parse(approval.records as string) : [];

    let newStatus = approval.status as string;
    let newCurrentStep = approval.current_step as number;

    // 添加审批记录
    records.push({
      id: `REC_${Date.now()}`,
      approvalId: id,
      approverId: approverId || '',
      approverName: approverName || '',
      action,
      comment: comment || '',
      actionTime: now,
    });

    // 更新审批人状态
    const currentApprover = approvers.find((a: Record<string, unknown>) => a.order === newCurrentStep);
    if (currentApprover) {
      currentApprover.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'skipped';
      currentApprover.comment = comment || '';
      currentApprover.actionTime = now;
    }

    switch (action) {
      case 'approve':
        if (newCurrentStep >= (approval.total_steps as number)) {
          newStatus = 'approved';
        } else {
          newCurrentStep += 1;
        }
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'partially_approve':
        newStatus = 'partially_approved';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        break;
    }

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

    res.json({ success: true, message: '审批操作成功' });
  } catch (error) {
    console.error('审批操作失败:', error);
    res.status(500).json({ success: false, error: '审批操作失败' });
  }
});

export default router;
