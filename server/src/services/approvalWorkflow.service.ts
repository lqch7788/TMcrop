/**
 * 审批工作流服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface NodeCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: string | number | string[] | number[];
}

export interface ApprovalNode {
  id: string;
  nodeName: string;
  approverType: 'role' | 'user' | 'department_head' | 'direct_manager';
  approverId?: string;
  approverName?: string;
  approverRole?: string;
  conditions?: NodeCondition[];
  timeoutHours?: number;
  autoApproveOnTimeout?: boolean;
  requireComment?: boolean;
  parallelApprovers?: boolean;
  notifyOnTimeout?: boolean;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  code: string;
  description: string;
  module: string;
  businessType: string;
  triggerCondition: string;
  nodes: ApprovalNode[];
  status: 'active' | 'inactive';
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflowQuery {
  module?: string;
  businessType?: string;
  status?: string;
  keyword?: string;
}

export class ApprovalWorkflowService {
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private transformNodes(nodes: unknown[]): ApprovalNode[] {
    return nodes.map((node, index) => {
      const nodeRecord = node as Record<string, unknown>;
      if (nodeRecord.nodeName || nodeRecord.approverType) {
        return nodeRecord as unknown as ApprovalNode;
      }

      return {
        id: (nodeRecord.id as string) || this.generateId('NODE'),
        nodeName: (nodeRecord.name as string) || `节点${index + 1}`,
        approverType: (nodeRecord.approverRole ? 'role' : 'user') as ApprovalNode['approverType'],
        approverRole: (nodeRecord.approverRole as string) || '',
        approverName: (nodeRecord.approverName as string) || '',
        approverId: (nodeRecord.approverId as string) || '',
        timeoutHours: (nodeRecord.timeoutHours as number) || 24,
        autoApproveOnTimeout: Boolean(nodeRecord.autoApproveOnTimeout),
        requireComment: nodeRecord.requireComment !== false,
        conditions: (nodeRecord.conditions as NodeCondition[]) || [],
        parallelApprovers: Boolean(nodeRecord.parallelApprovers),
        notifyOnTimeout: Boolean(nodeRecord.notifyOnTimeout),
      };
    });
  }

  private isWorkflowCodeUnique(db: ReturnType<typeof getDatabase>, code: string, excludeId?: string): boolean {
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

  private parseWorkflow(row: Record<string, unknown>): ApprovalWorkflow {
    return {
      ...row,
      nodes: row.nodes ? JSON.parse(row.nodes as string) : [],
      businessType: row.business_type as string || '',
    } as unknown as ApprovalWorkflow;
  }

  async getApprovalWorkflows(params: ApprovalWorkflowQuery): Promise<ApprovalWorkflow[]> {
    const db = getDatabase();
    const { module, businessType, status, keyword } = params;

    let sql = 'SELECT * FROM approval_workflows WHERE 1=1';
    const bindings: (string | number)[] = [];

    if (module) {
      sql += ' AND module = ?';
      bindings.push(module);
    }

    if (businessType) {
      sql += ' AND business_type = ?';
      bindings.push(businessType);
    }

    if (status) {
      sql += ' AND status = ?';
      bindings.push(status);
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

    const workflows: ApprovalWorkflow[] = [];
    while (stmt.step()) {
      workflows.push(this.parseWorkflow(stmt.getAsObject()));
    }
    stmt.free();

    return workflows;
  }

  async getById(id: string): Promise<ApprovalWorkflow | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM approval_workflows WHERE id = ?');
    stmt.bind([id]);

    let workflow: ApprovalWorkflow | null = null;
    if (stmt.step()) {
      workflow = this.parseWorkflow(stmt.getAsObject());
    }
    stmt.free();

    return workflow;
  }

  async getByBusinessType(businessType: string): Promise<ApprovalWorkflow | null> {
    const db = getDatabase();

    const stmt = db.prepare(
      'SELECT * FROM approval_workflows WHERE business_type = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
    );
    stmt.bind([businessType, 'active']);

    let workflow: ApprovalWorkflow | null = null;
    if (stmt.step()) {
      workflow = this.parseWorkflow(stmt.getAsObject());
    }
    stmt.free();

    return workflow;
  }

  async create(workflow: Partial<ApprovalWorkflow>): Promise<string> {
    const db = getDatabase();
    const { name, code, description, module, businessType, triggerCondition, nodes, status } = workflow;

    if (!name || !code) {
      throw new Error('名称和编码不能为空');
    }

    if (!this.isWorkflowCodeUnique(db, code)) {
      throw new Error('工作流编码已存在');
    }

    const id = this.generateId('AWF');
    const transformedNodes = this.transformNodes(nodes || []);
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
    return id;
  }

  async update(id: string, updates: Partial<ApprovalWorkflow>): Promise<boolean> {
    const db = getDatabase();
    const { name, code, description, module, businessType, triggerCondition, nodes, status } = updates;

    // 检查工作流是否存在
    const stmt = db.prepare('SELECT * FROM approval_workflows WHERE id = ?');
    stmt.bind([id]);
    let workflow: Record<string, unknown> | null = null;
    if (stmt.step()) {
      workflow = stmt.getAsObject();
    }
    stmt.free();

    if (!workflow) {
      return false;
    }

    // 验证编码唯一性（排除自身）
    if (code && code !== workflow.code) {
      if (!this.isWorkflowCodeUnique(db, code, id)) {
        throw new Error('工作流编码已存在');
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

    let bindings: (string | number)[];

    if (nodes !== undefined) {
      const transformedNodes = this.transformNodes(nodes);
      bindings = [
        name || '',
        code || '',
        description || '',
        module || '',
        businessType || '',
        triggerCondition || '',
        JSON.stringify(transformedNodes),
        status || 'active',
        currentVersion + 1,
        now,
        id,
      ];

      db.run(`
        UPDATE approval_workflows
        SET ${fields.join(', ').replace('nodes = COALESCE(?, nodes)', 'nodes = ?')}
        WHERE id = ?
      `, bindings);
    } else {
      bindings = [
        name || '',
        code || '',
        description || '',
        module || '',
        businessType || '',
        triggerCondition || '',
        status || 'active',
        currentVersion + 1,
        now,
        id,
      ];

      db.run(`
        UPDATE approval_workflows
        SET ${fields.join(', ')}
        WHERE id = ?
      `, bindings);
    }

    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();

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
      throw new Error(`该工作流正在被 ${result.count} 个审批单使用，无法删除`);
    }

    db.run('DELETE FROM approval_workflows WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }

  async toggleStatus(id: string): Promise<string> {
    const db = getDatabase();

    // 获取当前状态
    const stmt = db.prepare('SELECT status FROM approval_workflows WHERE id = ?');
    stmt.bind([id]);
    let workflow: Record<string, unknown> | null = null;
    if (stmt.step()) {
      workflow = stmt.getAsObject();
    }
    stmt.free();

    if (!workflow) {
      throw new Error('审批工作流不存在');
    }

    const newStatus = workflow.status === 'active' ? 'inactive' : 'active';
    const now = new Date().toISOString();

    db.run('UPDATE approval_workflows SET status = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);
    saveDatabase();

    return newStatus;
  }

  async clone(id: string, newCode?: string, newName?: string): Promise<string> {
    const db = getDatabase();

    // 获取原工作流
    const stmt = db.prepare('SELECT * FROM approval_workflows WHERE id = ?');
    stmt.bind([id]);
    let workflow: Record<string, unknown> | null = null;
    if (stmt.step()) {
      workflow = stmt.getAsObject();
    }
    stmt.free();

    if (!workflow) {
      throw new Error('审批工作流不存在');
    }

    // 验证新编码唯一性
    if (newCode && !this.isWorkflowCodeUnique(db, newCode)) {
      throw new Error('工作流编码已存在');
    }

    const now = new Date().toISOString();
    const cloneId = this.generateId('AWF');

    db.run(`
      INSERT INTO approval_workflows (id, name, code, description, module, business_type, trigger_condition, nodes, status, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cloneId,
      newName || `${workflow.name as string} (副本)`,
      newCode || `${workflow.code as string}_copy`,
      (workflow.description as string) || '',
      (workflow.module as string) || '',
      (workflow.business_type as string) || '',
      (workflow.trigger_condition as string) || '',
      (workflow.nodes as string) || '[]',
      'inactive',
      1,
      now,
      now,
    ]);

    saveDatabase();
    return cloneId;
  }

  async evaluateConditions(id: string, context: Record<string, unknown>): Promise<{
    workflowId: string;
    matchedNodes: ApprovalNode[];
    totalNodes: number;
    matchedCount: number;
  }> {
    const db = getDatabase();

    // 获取工作流
    const stmt = db.prepare('SELECT * FROM approval_workflows WHERE id = ?');
    stmt.bind([id]);
    let workflow: Record<string, unknown> | null = null;
    if (stmt.step()) {
      workflow = stmt.getAsObject();
    }
    stmt.free();

    if (!workflow) {
      throw new Error('审批工作流不存在');
    }

    const nodes: ApprovalNode[] = workflow.nodes ? JSON.parse(workflow.nodes as string) : [];
    const matchedNodes: ApprovalNode[] = [];

    // 评估每个节点的条件
    for (const node of nodes) {
      if (!node.conditions || node.conditions.length === 0) {
        matchedNodes.push(node);
        continue;
      }

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

    return {
      workflowId: id,
      matchedNodes,
      totalNodes: nodes.length,
      matchedCount: matchedNodes.length,
    };
  }

  getNodeTemplates(): Array<{
    type: string;
    name: string;
    description: string;
    fields: string[];
  }> {
    return [
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
  }
}

export const approvalWorkflowService = new ApprovalWorkflowService();
