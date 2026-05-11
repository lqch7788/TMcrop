/**
 * 审批服务
 * 提供审批单CRUD和状态管理
 */

import { getDatabase, saveDatabase } from '../db';

export interface Approval {
  id: string;
  code: string;
  type: string;
  type_name: string;
  category: string;
  title: string;
  description?: string;
  applicant_id: string;
  applicant_name: string;
  applicant_department: string;
  apply_date: string;
  apply_time: string;
  current_step: number;
  total_steps: number;
  status: string;
  priority: string;
  due_date?: string;
  business_link?: string;
  attachments?: string;
  created_at: string;
  updated_at: string;
}

export class ApprovalService {
  /**
   * 获取审批列表
   */
  async getApprovals(params: {
    status?: string;
    type?: string;
    applicantId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Approval[]; total: number }> {
    const db = getDatabase();
    const { status, type, applicantId, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM approvals WHERE 1=1';
    const countSql = 'SELECT COUNT(*) as total FROM approvals WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }
    if (type) {
      conditions.push('type = ?');
      queryParams.push(type);
    }
    if (applicantId) {
      conditions.push('applicant_id = ?');
      queryParams.push(applicantId);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const countFinalSql = `${countSql}${whereClause}`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const approvals: Approval[] = [];
    while (stmt.step()) {
      approvals.push(stmt.getAsObject() as unknown as Approval);
    }
    stmt.free();

    // 获取总数
    const countStmt = db.prepare(countFinalSql);
    countStmt.bind(queryParams);
    countStmt.step();
    const countResult = countStmt.getAsObject();
    countStmt.free();

    return {
      data: approvals,
      total: countResult.total as number,
    };
  }

  /**
   * 根据ID获取审批详情
   */
  async getById(id: string): Promise<Approval | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM approvals WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Approval;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  /**
   * 创建审批单
   */
  async create(approval: Partial<Approval>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sql = `
      INSERT INTO approvals (
        id, code, type, type_name, category, title, description,
        applicant_id, applicant_name, applicant_department,
        apply_date, apply_time, current_step, total_steps,
        status, priority, due_date, business_link, attachments,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      id,
      approval.code || `AP${Date.now()}`,
      approval.type || '',
      approval.type_name || '',
      approval.category || 'business',
      approval.title || '',
      approval.description || '',
      approval.applicant_id || '',
      approval.applicant_name || '',
      approval.applicant_department || '',
      approval.apply_date || now.split('T')[0],
      approval.apply_time || now.split('T')[1].split('.')[0],
      approval.current_step || 1,
      approval.total_steps || 1,
      approval.status || 'pending',
      approval.priority || 'normal',
      approval.due_date || null,
      approval.business_link || null,
      approval.attachments || null,
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  /**
   * 更新审批状态
   */
  async updateStatus(id: string, status: string, step?: number): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    let sql = 'UPDATE approvals SET status = ?, updated_at = ?';
    const params: any[] = [status, now];

    if (step !== undefined) {
      sql += ', current_step = ?';
      params.push(step);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    db.run(sql, params);
    saveDatabase();
    return true;
  }

  /**
   * 删除审批单
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM approvals WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const approvalService = new ApprovalService();
