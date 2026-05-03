/**
 * 审批流程配置 API 路由
 * 提供审批工作流的 CRUD 操作
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

// ============================================
// 审批工作流 API
// ============================================

/**
 * 获取所有审批工作流
 * GET /api/approval-workflows
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { module, status } = req.query;

    let sql = 'SELECT * FROM approval_workflows WHERE 1=1';
    const bindings: string[] = [];

    if (module) {
      sql += ' AND module = ?';
      bindings.push(module as string);
    }

    if (status) {
      sql += ' AND status = ?';
      bindings.push(status as string);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const workflows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      workflows.push(stmt.getAsObject());
    }
    stmt.free();

    // 解析 nodes JSON
    const result = workflows.map(w => ({
      ...w,
      nodes: w.nodes ? JSON.parse(w.nodes as string) : []
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取审批工作流失败:', error);
    res.status(500).json({ success: false, error: '获取审批工作流失败' });
  }
});

/**
 * 获取单个审批工作流
 * GET /api/approval-workflows/:id
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const stmt = db.prepare('SELECT * FROM approval_workflows WHERE id = ?');
    stmt.bind([id]);
    let workflow: Record<string, unknown> | null = null;
    if (stmt.step()) {
      workflow = stmt.getAsObject();
    }
    stmt.free();

    if (!workflow) {
      return res.status(404).json({ success: false, error: '审批工作流不存在' });
    }

    // 解析 nodes JSON
    workflow.nodes = workflow.nodes ? JSON.parse(workflow.nodes as string) : [];

    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('获取审批工作流详情失败:', error);
    res.status(500).json({ success: false, error: '获取审批工作流详情失败' });
  }
});

/**
 * 创建审批工作流
 * POST /api/approval-workflows
 */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { name, code, description, module, triggerCondition, nodes, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: '名称和编码不能为空' });
    }

    const id = `AWF_${Date.now()}`;
    const nodesJson = JSON.stringify(nodes || []);
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO approval_workflows (id, name, code, description, module, trigger_condition, nodes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name, code, description || '', module || '', triggerCondition || '', nodesJson, status || 'active', now, now]);

    saveDatabase();

    res.json({ success: true, message: '审批工作流创建成功', id });
  } catch (error) {
    console.error('创建审批工作流失败:', error);
    res.status(500).json({ success: false, error: '创建审批工作流失败' });
  }
});

/**
 * 更新审批工作流
 * PUT /api/approval-workflows/:id
 */
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { name, code, description, module, triggerCondition, nodes, status } = req.body;

    const nodesJson = nodes ? JSON.stringify(nodes) : null;
    const now = new Date().toISOString();

    if (nodesJson) {
      db.run(`
        UPDATE approval_workflows
        SET name = COALESCE(?, name),
            code = COALESCE(?, code),
            description = COALESCE(?, description),
            module = COALESCE(?, module),
            trigger_condition = COALESCE(?, trigger_condition),
            nodes = ?,
            status = COALESCE(?, status),
            updated_at = ?
        WHERE id = ?
      `, [name, code, description, module, triggerCondition, nodesJson, status, now, id]);
    } else {
      db.run(`
        UPDATE approval_workflows
        SET name = COALESCE(?, name),
            code = COALESCE(?, code),
            description = COALESCE(?, description),
            module = COALESCE(?, module),
            trigger_condition = COALESCE(?, trigger_condition),
            status = COALESCE(?, status),
            updated_at = ?
        WHERE id = ?
      `, [name, code, description, module, triggerCondition, status, now, id]);
    }

    saveDatabase();

    res.json({ success: true, message: '审批工作流更新成功' });
  } catch (error) {
    console.error('更新审批工作流失败:', error);
    res.status(500).json({ success: false, error: '更新审批工作流失败' });
  }
});

/**
 * 删除审批工作流
 * DELETE /api/approval-workflows/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    db.run('DELETE FROM approval_workflows WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '审批工作流删除成功' });
  } catch (error) {
    console.error('删除审批工作流失败:', error);
    res.status(500).json({ success: false, error: '删除审批工作流失败' });
  }
});

/**
 * 切换审批工作流状态
 * PATCH /api/approval-workflows/:id/toggle
 */
router.patch('/:id/toggle', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 获取当前状态
    const stmt = db.prepare('SELECT status FROM approval_workflows WHERE id = ?');
    stmt.bind([id]);
    let workflow: Record<string, unknown> | null = null;
    if (stmt.step()) {
      workflow = stmt.getAsObject();
    }
    stmt.free();

    if (!workflow) {
      return res.status(404).json({ success: false, error: '审批工作流不存在' });
    }

    const newStatus = workflow.status === 'active' ? 'inactive' : 'active';
    const now = new Date().toISOString();

    db.run('UPDATE approval_workflows SET status = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);
    saveDatabase();

    res.json({ success: true, message: '状态切换成功' });
  } catch (error) {
    console.error('切换审批工作流状态失败:', error);
    res.status(500).json({ success: false, error: '切换审批工作流状态失败' });
  }
});

export default router;
