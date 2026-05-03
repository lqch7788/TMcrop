/**
 * 审批流程配置 API 路由
 * 提供审批工作流的 CRUD 操作和节点配置
 * 支持审批人配置（角色/用户/部门主管）、审批条件、超时设置
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

// ============================================
// 类型定义
// ============================================

/**
 * 审批人类型
 */
type ApproverType = 'role' | 'user' | 'department_head' | 'direct_manager';

/**
 * 审批节点条件
 */
interface NodeCondition {
  field: string;      // 条件字段
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: string | number | string[] | number[];
}

/**
 * 审批节点配置
 */
interface ApprovalNode {
  id: string;
  nodeName: string;                    // 节点名称
  approverType: ApproverType;        // 审批人类型
  approverId?: string;                // 审批人ID（当approverType为user时）
  approverName?: string;              // 审批人名称
  approverRole?: string;              // 审批角色（当approverType为role时）
  conditions?: NodeCondition[];       // 审批条件
  timeoutHours?: number;               // 超时时间（小时）
  autoApproveOnTimeout?: boolean;     // 超时是否自动通过
  requireComment?: boolean;           // 是否必须填写意见
  parallelApprovers?: boolean;        // 是否并行审批
  notifyOnTimeout?: boolean;          // 超时是否发送提醒
}

/**
 * 审批工作流
 */
interface ApprovalWorkflow {
  id: string;
  name: string;
  code: string;
  description: string;
  module: string;                     // 所属模块
  businessType: string;              // 业务类型
  triggerCondition: string;           // 触发条件
  nodes: ApprovalNode[];             // 审批节点
  status: 'active' | 'inactive';
  version?: number;                  // 版本号
  createdAt: string;
  updatedAt: string;
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
 * 转换节点格式（兼容前端旧格式）
 * 前端旧格式: { name, approverRole, approverName, timeoutHours, autoApproveOnTimeout, requireComment }
 * 后端新格式: { nodeName, approverType, approverId, approverName, approverRole, ... }
 */
function transformNodes(nodes: unknown[]): ApprovalNode[] {
  return nodes.map((node, index) => {
    const nodeRecord = node as Record<string, unknown>;
    // 如果已经是新格式，直接返回
    if (nodeRecord.nodeName || nodeRecord.approverType) {
      return nodeRecord as unknown as ApprovalNode;
    }

    // 旧格式转换为新格式
    return {
      id: (nodeRecord.id as string) || generateId('NODE'),
      nodeName: (nodeRecord.name as string) || `节点${index + 1}`,
      approverType: (nodeRecord.approverRole ? 'role' : 'user') as ApproverType,
      approverRole: (nodeRecord.approverRole as string) || '',
      approverName: (nodeRecord.approverName as string) || '',
      approverId: (nodeRecord.approverId as string) || '',
      timeoutHours: (nodeRecord.timeoutHours as number) || 24,
      autoApproveOnTimeout: Boolean(nodeRecord.autoApproveOnTimeout),
      requireComment: nodeRecord.requireComment !== false, // 默认需要填写意见
      conditions: (nodeRecord.conditions as NodeCondition[]) || [],
      parallelApprovers: Boolean(nodeRecord.parallelApprovers),
      notifyOnTimeout: Boolean(nodeRecord.notifyOnTimeout),
    };
  });
}

/**
 * 验证工作流编码唯一性
 */
function isWorkflowCodeUnique(db: ReturnType<typeof getDatabase>, code: string, excludeId?: string): boolean {
  let sql = 'SELECT COUNT(*) as count FROM approval_workflows WHERE code = ?';
  const bindings: string[] = [code];

  if (excludeId) {
    sql += ' AND id != ?';
    bindings.push(excludeId);
  }

  const stmt = db.prepare(sql);
  stmt.bind(bindings);
  stmt.step();
  const result = stmt.getAsObject() as { count: number };
  stmt.free();

  return result.count === 0;
}

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
    const { module, businessType, status, keyword } = req.query;

    let sql = 'SELECT * FROM approval_workflows WHERE 1=1';
    const bindings: (string | number)[] = [];

    if (module) {
      sql += ' AND module = ?';
      bindings.push(module as string);
    }

    if (businessType) {
      sql += ' AND business_type = ?';
      bindings.push(businessType as string);
    }

    if (status) {
      sql += ' AND status = ?';
      bindings.push(status as string);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
      const kw = `%${keyword}%`;
      bindings.push(kw, kw, kw);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = db.prepare(sql);
    if (bindings.length > 0) {
      stmt.bind(bindings);
    }

    const workflows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      workflows.push(stmt.getAsObject());
    }
    stmt.free();

    // 解析 nodes JSON
    const result = workflows.map(w => ({
      ...w,
      nodes: w.nodes ? JSON.parse(w.nodes as string) : [],
      businessType: w.business_type || '',
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
 * 根据业务类型获取工作流
 * GET /api/approval-workflows/by-type/:businessType
 */
router.get('/by-type/:businessType', (req, res) => {
  try {
    const db = getDatabase();
    const { businessType } = req.params;

    const stmt = db.prepare(
      'SELECT * FROM approval_workflows WHERE business_type = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
    );
    stmt.bind([businessType, 'active']);
    let workflow: Record<string, unknown> | null = null;
    if (stmt.step()) {
      workflow = stmt.getAsObject();
    }
    stmt.free();

    if (!workflow) {
      return res.status(404).json({ success: false, error: '未找到可用的审批工作流' });
    }

    // 解析 nodes JSON
    workflow.nodes = workflow.nodes ? JSON.parse(workflow.nodes as string) : [];

    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('获取审批工作流失败:', error);
    res.status(500).json({ success: false, error: '获取审批工作流失败' });
  }
});

/**
 * 创建审批工作流
 * POST /api/approval-workflows
 */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const {
      name,
      code,
      description,
      module,
      businessType,
      triggerCondition,
      nodes,
      status,
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: '名称和编码不能为空' });
    }

    // 验证编码唯一性
    if (!isWorkflowCodeUnique(db, code)) {
      return res.status(400).json({ success: false, error: '工作流编码已存在' });
    }

    const id = generateId('AWF');
    // 转换节点格式以兼容前端旧格式
    const transformedNodes = transformNodes(nodes || []);
    const nodesJson = JSON.stringify(transformedNodes);
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO approval_workflows (id, name, code, description, module, business_type, trigger_condition, nodes, status, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name,
      code,
      description || '',
      module || '',
      businessType || '',
      triggerCondition || '',
      nodesJson,
      status || 'active',
      1,
      now,
      now,
    ]);

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
    const {
      name,
      code,
      description,
      module,
      businessType,
      triggerCondition,
      nodes,
      status,
    } = req.body;

    // 检查工作流是否存在
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

    // 验证编码唯一性（排除自身）
    if (code && code !== workflow.code) {
      if (!isWorkflowCodeUnique(db, code, id)) {
        return res.status(400).json({ success: false, error: '工作流编码已存在' });
      }
    }

    const now = new Date().toISOString();
    const currentVersion = (workflow.version as number) || 1;

    // 构建更新语句
    const fields = [
      'name = COALESCE(?, name)',
      'code = COALESCE(?, code)',
      'description = COALESCE(?, description)',
      'module = COALESCE(?, module)',
      'business_type = COALESCE(?, business_type)',
      'trigger_condition = COALESCE(?, trigger_condition)',
      'status = COALESCE(?, status)',
      'version = ?',
      'updated_at = ?',
    ];

    const bindings: (string | number)[] = [
      name,
      code,
      description,
      module,
      businessType,
      triggerCondition,
      status,
      currentVersion + 1,
      now,
    ];

    // 如果提供了 nodes，则更新 nodes
    if (nodes !== undefined) {
      fields[6] = 'nodes = ?'; // 替换 status 的位置，nodes 更新
      // 转换节点格式以兼容前端旧格式
      const transformedNodes = transformNodes(nodes);
      bindings[6] = JSON.stringify(transformedNodes);
      // 重新构建 bindings
      const newBindings: (string | number)[] = [
        name,
        code,
        description,
        module,
        businessType,
        triggerCondition,
        JSON.stringify(transformedNodes),
        status,
        currentVersion + 1,
        now,
        id,
      ];

      db.run(`
        UPDATE approval_workflows
        SET ${fields.join(', ')}
        WHERE id = ?
      `, newBindings);
    } else {
      bindings.push(id);
      db.run(`
        UPDATE approval_workflows
        SET ${fields.join(', ')}
        WHERE id = ?
      `, bindings);
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

    // 检查是否有正在使用的审批单
    const checkStmt = db.prepare(
      'SELECT COUNT(*) as count FROM approvals WHERE business_link LIKE ?'
    );
    const workflowLike = `%${id}%`;
    checkStmt.bind([workflowLike]);
    checkStmt.step();
    const result = checkStmt.getAsObject() as { count: number };
    checkStmt.free();

    if (result.count > 0) {
      return res.status(400).json({
        success: false,
        error: `该工作流正在被 ${result.count} 个审批单使用，无法删除`,
      });
    }

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

    res.json({ success: true, message: '状态切换成功', status: newStatus });
  } catch (error) {
    console.error('切换审批工作流状态失败:', error);
    res.status(500).json({ success: false, error: '切换审批工作流状态失败' });
  }
});

/**
 * 复制审批工作流
 * POST /api/approval-workflows/:id/clone
 */
router.post('/:id/clone', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { newCode, newName } = req.body;

    // 获取原工作流
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

    // 验证新编码唯一性
    if (newCode && !isWorkflowCodeUnique(db, newCode)) {
      return res.status(400).json({ success: false, error: '工作流编码已存在' });
    }

    const now = new Date().toISOString();
    const cloneId = generateId('AWF');

    db.run(`
      INSERT INTO approval_workflows (id, name, code, description, module, business_type, trigger_condition, nodes, status, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cloneId,
      newName || `${workflow.name} (副本)`,
      newCode || `${workflow.code}_copy`,
      workflow.description || '',
      workflow.module || '',
      workflow.business_type || '',
      workflow.trigger_condition || '',
      workflow.nodes || '[]',
      'inactive',
      1,
      now,
      now,
    ]);

    saveDatabase();

    res.json({ success: true, message: '工作流复制成功', id: cloneId });
  } catch (error) {
    console.error('复制审批工作流失败:', error);
    res.status(500).json({ success: false, error: '复制审批工作流失败' });
  }
});

/**
 * 验证审批条件
 * POST /api/approval-workflows/:id/evaluate-conditions
 */
router.post('/:id/evaluate-conditions', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { context } = req.body; // 业务上下文数据

    // 获取工作流
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

    const nodes: ApprovalNode[] = workflow.nodes ? JSON.parse(workflow.nodes as string) : [];
    const matchedNodes: ApprovalNode[] = [];

    // 评估每个节点的条件
    for (const node of nodes) {
      if (!node.conditions || node.conditions.length === 0) {
        // 没有条件，默认匹配
        matchedNodes.push(node);
        continue;
      }

      // 评估条件
      const conditionsMet = node.conditions.every(condition => {
        const contextValue = context[condition.field];

        switch (condition.operator) {
          case 'eq':
            return contextValue === condition.value;
          case 'ne':
            return contextValue !== condition.value;
          case 'gt':
            return Number(contextValue) > Number(condition.value);
          case 'lt':
            return Number(contextValue) < Number(condition.value);
          case 'gte':
            return Number(contextValue) >= Number(condition.value);
          case 'lte':
            return Number(contextValue) <= Number(condition.value);
          case 'in':
            return Array.isArray(condition.value) && (condition.value as (string | number)[]).includes(contextValue as string | number);
          case 'contains':
            return String(contextValue).includes(String(condition.value));
          default:
            return false;
        }
      });

      if (conditionsMet) {
        matchedNodes.push(node);
      }
    }

    res.json({
      success: true,
      data: {
        workflowId: id,
        matchedNodes,
        totalNodes: nodes.length,
        matchedCount: matchedNodes.length,
      },
    });
  } catch (error) {
    console.error('评估审批条件失败:', error);
    res.status(500).json({ success: false, error: '评估审批条件失败' });
  }
});

/**
 * 获取节点模板列表
 * GET /api/approval-workflows/node-templates
 */
router.get('/node-templates/list', (req, res) => {
  try {
    // 返回常用的节点模板
    const templates = [
      {
        type: 'role',
        name: '角色审批',
        description: '根据角色确定审批人',
        fields: ['approverRole', 'timeoutHours', 'requireComment'],
      },
      {
        type: 'user',
        name: '指定用户',
        description: '指定具体用户进行审批',
        fields: ['approverId', 'approverName', 'timeoutHours', 'requireComment'],
      },
      {
        type: 'department_head',
        name: '部门主管',
        description: '审批人为申请人的部门主管',
        fields: ['timeoutHours', 'requireComment'],
      },
      {
        type: 'direct_manager',
        name: '直接上级',
        description: '审批人为申请人的直接上级',
        fields: ['timeoutHours', 'requireComment'],
      },
    ];

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('获取节点模板失败:', error);
    res.status(500).json({ success: false, error: '获取节点模板失败' });
  }
});

export default router;
