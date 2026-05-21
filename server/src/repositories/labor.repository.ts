/**
 * 人工记录数据访问层 (Repository)
 * 负责所有数据库 SQL 操作
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

/**
 * 人工记录查询参数
 */
export interface LaborQuery {
  worker_name?: string;
  work_type?: string;
  status?: string;
  greenhouse_name?: string;
  page?: number;
  limit?: number;
}

/**
 * 人工记录数据
 */
export interface LaborRecord {
  id?: string;
  worker_id?: string;
  worker_name?: string;
  work_type?: string;
  work_date?: string;
  work_hours?: number;
  hourly_rate?: number;
  total_amount?: number;
  greenhouse_id?: string;
  greenhouse_name?: string;
  task_description?: string;
  status?: string;
  remarks?: string;
  create_by?: string;
  create_time?: string;
  update_time?: string;
}

/**
 * 员工查询参数
 */
export interface EmployeeQuery {
  name?: string;
  position?: string;
  department?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * 员工数据
 */
export interface EmployeeRecord {
  id?: string;
  employee_code?: string;
  name?: string;
  gender?: string;
  phone?: string;
  id_card?: string;
  position_id?: string;
  position_name?: string;
  department_id?: string;
  department_name?: string;
  employee_type?: string;
  hire_date?: string;
  status?: string;
  skills?: string;
  remarks?: string;
  create_by?: string;
  create_time?: string;
  update_time?: string;
  leave_date?: string;
  leave_reason?: string;
}

/**
 * 培训记录
 */
export interface TrainingRecord {
  id?: string;
  employee_id?: string;
  training_date?: string;
  training_type?: string;
  training_content?: string;
  result?: string;
  score?: number;
  remarks?: string;
  create_by?: string;
  create_time?: string;
  update_time?: string;
}

/**
 * 考核记录
 */
export interface AssessmentRecord {
  id?: string;
  employee_id?: string;
  assessment_date?: string;
  assessment_type?: string;
  score?: number;
  result?: string;
  remarks?: string;
  create_by?: string;
  create_time?: string;
  update_time?: string;
}

/**
 * 工作经验
 */
export interface WorkExperience {
  id?: string;
  employee_id?: string;
  company_name?: string;
  position?: string;
  start_date?: string;
  end_date?: string;
  job_description?: string;
  remarks?: string;
  create_by?: string;
  create_time?: string;
  update_time?: string;
}

/**
 * 员工统计
 */
export interface EmployeeStats {
  total: number;
  active: number;
  left: number;
  byType: Record<string, number>;
  byDepartment: Record<string, number>;
}

/**
 * 人工 Repository 类
 * 提供人工记录和员工数据的增删改查操作
 */
export class LaborRepository {
  // ==================== 人工记录操作 ====================

  /**
   * 查询人工记录列表（分页、筛选）
   * @param query 查询条件
   * @returns 人工数据列表和总数
   */
  async findAll(query: LaborQuery): Promise<{ data: LaborRecord[]; total: number }> {
    const db = getDatabase();
    const { worker_name, work_type, status, greenhouse_name, page = 1, limit = 50 } = query;

    let sql = 'SELECT * FROM labor_records WHERE 1=1';
    const params: any[] = [];

    if (worker_name) {
      sql += ' AND worker_name LIKE ?';
      params.push(`%${worker_name}%`);
    }

    if (work_type) {
      sql += ' AND work_type LIKE ?';
      params.push(`%${work_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    const countSql = sql;
    sql += ' ORDER BY work_date DESC, create_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects<LaborRecord>(db, sql, params);

    return { data: items, total };
  }

  /**
   * 根据ID查询人工记录详情
   * @param id 人工记录ID
   * @returns 人工记录或 undefined
   */
  async findById(id: string): Promise<LaborRecord | undefined> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM labor_records WHERE id = ?');
    stmt.bind([id]);

    let item: LaborRecord | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject() as LaborRecord;
    }
    stmt.free();

    return item || undefined;
  }

  /**
   * 创建人工记录
   * @param data 人工数据
   * @returns 创建的人工记录
   */
  async create(data: Partial<LaborRecord>): Promise<LaborRecord> {
    const db = getDatabase();
    const newId = data.id || `LB${Date.now()}`;
    const now = new Date().toISOString();

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const params: any[] = [newId, data.worker_id, data.worker_name, data.work_type, data.work_date, data.work_hours, data.hourly_rate,
        data.total_amount, data.greenhouse_id, data.greenhouse_name, data.task_description, data.status || 'pending', data.remarks, now, now];

    db.run(`
      INSERT INTO labor_records (id, worker_id, worker_name, work_type, work_date, work_hours, hourly_rate,
        total_amount, greenhouse_id, greenhouse_name, task_description, status, remarks, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);

    saveDatabase();

    return { ...data, id: newId, create_time: now, update_time: now } as LaborRecord;
  }

  /**
   * 更新人工记录
   * @param id 人工记录ID
   * @param data 更新数据
   * @returns 更新后的人工记录
   */
  async update(id: string, data: Partial<LaborRecord>): Promise<LaborRecord> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields = Object.keys(data).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');

    if (fields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    const values: any[] = Object.keys(data).filter(k => k !== 'id').map(k => data[k as keyof LaborRecord]);
    values.push(now, id);

    db.run(`UPDATE labor_records SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();

    return this.findById(id) as Promise<LaborRecord>;
  }

  /**
   * 删除人工记录
   * @param id 人工记录ID
   */
  async delete(id: string): Promise<void> {
    const db = getDatabase();
    db.run('DELETE FROM labor_records WHERE id = ?', [id]);
    saveDatabase();
  }

  /**
   * 清空所有人工记录
   */
  async deleteAll(): Promise<number> {
    const db = getDatabase();
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM labor_records');
    const countResult = countStmt.step() as unknown as { count: number } | false;
    const count = countResult ? countResult.count : 0;
    countStmt.free();

    db.run('DELETE FROM labor_records');
    saveDatabase();
    return count;
  }

  // ==================== 员工操作 ====================

  /**
   * 查询员工列表（分页、筛选）
   * @param query 查询条件
   * @returns 员工数据列表和总数
   */
  async findAllEmployees(query: EmployeeQuery): Promise<{ data: EmployeeRecord[]; total: number }> {
    const db = getDatabase();
    const { name, position, department, status, page = 1, limit = 50 } = query;

    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params: any[] = [];

    if (name) {
      sql += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }

    if (position) {
      sql += ' AND position_id = ?';
      params.push(position);
    }

    if (department) {
      sql += ' AND department_id = ?';
      params.push(department);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const countSql = sql;
    sql += ' ORDER BY create_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects<EmployeeRecord>(db, sql, params);

    return { data: items, total };
  }

  /**
   * 根据ID查询员工详情
   * @param id 员工ID
   * @returns 员工记录或 undefined
   */
  async findEmployeeById(id: string): Promise<EmployeeRecord | undefined> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM employees WHERE id = ?');
    stmt.bind([id]);

    let item: EmployeeRecord | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject() as EmployeeRecord;
    }
    stmt.free();

    return item || undefined;
  }

  /**
   * 创建员工
   * @param data 员工数据
   * @returns 创建的员工记录
   */
  async createEmployee(data: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const db = getDatabase();
    const newId = data.id || `EMP${Date.now()}`;
    const now = new Date().toISOString();

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const params: any[] = [
      newId, data.employee_code, data.name, data.gender, data.phone, data.id_card,
      data.position_id, data.position_name, data.department_id, data.department_name,
      data.employee_type, data.hire_date, data.status || 'active',
      data.skills ? (typeof data.skills === 'string' ? data.skills : JSON.stringify(data.skills)) : null,
      data.remarks, data.create_by, now, now
    ];

    db.run(`
      INSERT INTO employees (id, employee_code, name, gender, phone, id_card,
        position_id, position_name, department_id, department_name,
        employee_type, hire_date, status, skills, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);

    saveDatabase();

    return { ...data, id: newId, create_time: now, update_time: now } as EmployeeRecord;
  }

  /**
   * 更新员工
   * @param id 员工ID
   * @param data 更新数据
   * @returns 更新后的员工记录
   */
  async updateEmployee(id: string, data: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 处理 skills 数组序列化
    const processedData = { ...data };
    if (processedData.skills && Array.isArray(processedData.skills)) {
      (processedData as any).skills = JSON.stringify(processedData.skills);
    }

    const fields = Object.keys(processedData).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');

    if (fields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    const values: any[] = Object.keys(processedData).filter(k => k !== 'id').map(k => processedData[k as keyof EmployeeRecord]);
    values.push(now, id);

    db.run(`UPDATE employees SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();

    return this.findEmployeeById(id) as Promise<EmployeeRecord>;
  }

  /**
   * 删除员工
   * @param id 员工ID
   */
  async deleteEmployee(id: string): Promise<void> {
    const db = getDatabase();
    db.run('DELETE FROM employees WHERE id = ?', [id]);
    saveDatabase();
  }

  /**
   * 批量删除员工
   * @param ids 员工ID数组
   * @returns 删除数量
   */
  async deleteEmployeesBatch(ids: string[]): Promise<number> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new Error('缺少 ids 参数或 ids 不是数组');
    }

    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM employees WHERE id IN (${placeholders})`, ids);
    saveDatabase();
    return ids.length;
  }

  /**
   * 搜索员工
   * @param keyword 搜索关键词
   * @returns 员工列表
   */
  async searchEmployees(keyword: string): Promise<EmployeeRecord[]> {
    const db = getDatabase();
    const sql = `SELECT * FROM employees WHERE name LIKE ? OR employee_code LIKE ? OR phone LIKE ? ORDER BY create_time DESC`;
    return queryToObjects<EmployeeRecord>(db, sql, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);
  }

  /**
   * 按部门获取员工
   * @param deptId 部门ID
   * @returns 员工列表
   */
  async findEmployeesByDepartment(deptId: string): Promise<EmployeeRecord[]> {
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE department_id = ? ORDER BY create_time DESC';
    return queryToObjects<EmployeeRecord>(db, sql, [deptId]);
  }

  /**
   * 按岗位获取员工
   * @param positionId 岗位ID
   * @returns 员工列表
   */
  async findEmployeesByPosition(positionId: string): Promise<EmployeeRecord[]> {
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE position_id = ? ORDER BY create_time DESC';
    return queryToObjects<EmployeeRecord>(db, sql, [positionId]);
  }

  /**
   * 按类型获取员工
   * @param employeeType 员工类型
   * @returns 员工列表
   */
  async findEmployeesByType(employeeType: string): Promise<EmployeeRecord[]> {
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE employee_type = ? ORDER BY create_time DESC';
    return queryToObjects<EmployeeRecord>(db, sql, [employeeType]);
  }

  /**
   * 按状态获取员工
   * @param status 状态
   * @returns 员工列表
   */
  async findEmployeesByStatus(status: string): Promise<EmployeeRecord[]> {
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE status = ? ORDER BY create_time DESC';
    return queryToObjects<EmployeeRecord>(db, sql, [status]);
  }

  /**
   * 获取在职工人
   * @returns 员工列表
   */
  async findActiveEmployees(): Promise<EmployeeRecord[]> {
    const db = getDatabase();
    const sql = "SELECT * FROM employees WHERE status = 'active' ORDER BY create_time DESC";
    return queryToObjects<EmployeeRecord>(db, sql, []);
  }

  /**
   * 获取离职工人
   * @returns 员工列表
   */
  async findLeftEmployees(): Promise<EmployeeRecord[]> {
    const db = getDatabase();
    const sql = "SELECT * FROM employees WHERE status = 'left' ORDER BY create_time DESC";
    return queryToObjects<EmployeeRecord>(db, sql, []);
  }

  /**
   * 工人离职
   * @param id 员工ID
   * @param leaveDate 离职日期
   * @param leaveReason 离职原因
   */
  async employeeLeave(id: string, leaveDate: string, leaveReason: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run(`UPDATE employees SET status = 'left', leave_date = ?, leave_reason = ?, update_time = ? WHERE id = ?`,
      [leaveDate, leaveReason, now, id]);
    saveDatabase();
  }

  /**
   * 工人复职
   * @param id 员工ID
   * @param rejoinDate 复职日期
   */
  async employeeRejoin(id: string, rejoinDate: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run(`UPDATE employees SET status = 'active', leave_date = NULL, leave_reason = NULL, update_time = ? WHERE id = ?`,
      [now, id]);
    saveDatabase();
  }

  /**
   * 获取员工统计
   * @returns 统计信息
   */
  async getEmployeeStats(): Promise<EmployeeStats> {
    const db = getDatabase();

    const totalSql = 'SELECT COUNT(*) as total FROM employees';
    const activeSql = "SELECT COUNT(*) as active FROM employees WHERE status = 'active'";
    const leftSql = "SELECT COUNT(*) as left_count FROM employees WHERE status = 'left'";

    const totalResult = queryToObjects(db, totalSql, []);
    const activeResult = queryToObjects(db, activeSql, []);
    const leftResult = queryToObjects(db, leftSql, []);

    // 按类型统计
    const typeSql = 'SELECT employee_type, COUNT(*) as count FROM employees GROUP BY employee_type';
    const typeResult = queryToObjects(db, typeSql, []);

    // 按部门统计
    const deptSql = 'SELECT department_name, COUNT(*) as count FROM employees GROUP BY department_name';
    const deptResult = queryToObjects(db, deptSql, []);

    const byType: Record<string, number> = {};
    typeResult.forEach((item: any) => {
      byType[item.employee_type || 'unknown'] = item.count;
    });

    const byDepartment: Record<string, number> = {};
    deptResult.forEach((item: any) => {
      byDepartment[item.department_name || 'unknown'] = item.count;
    });

    return {
      total: totalResult[0]?.total || 0,
      active: activeResult[0]?.active || 0,
      left: leftResult[0]?.left_count || 0,
      byType,
      byDepartment
    };
  }

  /**
   * 获取工人技能标签列表
   * @returns 技能标签数组
   */
  async getSkillTags(): Promise<string[]> {
    const db = getDatabase();
    const sql = 'SELECT DISTINCT skills FROM employees WHERE skills IS NOT NULL AND skills != ""';
    const items = queryToObjects(db, sql, []);

    const tagsSet = new Set<string>();
    items.forEach((item: any) => {
      if (item.skills) {
        try {
          const tags = JSON.parse(item.skills);
          if (Array.isArray(tags)) {
            tags.forEach((tag: string) => tagsSet.add(tag));
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    });

    return Array.from(tagsSet);
  }

  /**
   * 按技能标签获取员工
   * @param skillTag 技能标签
   * @returns 员工列表
   */
  async findEmployeesBySkillTag(skillTag: string): Promise<EmployeeRecord[]> {
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE skills LIKE ? ORDER BY create_time DESC';
    return queryToObjects<EmployeeRecord>(db, sql, [`%${skillTag}%`]);
  }

  // ==================== 培训记录操作 ====================

  /**
   * 获取员工培训记录
   * @param employeeId 员工ID
   * @returns 培训记录列表
   */
  async getTrainingRecords(employeeId: string): Promise<TrainingRecord[]> {
    const db = getDatabase();
    const sql = 'SELECT * FROM training_records WHERE employee_id = ? ORDER BY training_date DESC';
    return queryToObjects<TrainingRecord>(db, sql, [employeeId]);
  }

  /**
   * 添加培训记录
   * @param employeeId 员工ID
   * @param data 培训数据
   * @returns 创建的培训记录
   */
  async createTrainingRecord(employeeId: string, data: Partial<TrainingRecord>): Promise<TrainingRecord> {
    const db = getDatabase();
    const newId = data.id || `TR${Date.now()}`;
    const now = new Date().toISOString();

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const params: any[] = [newId, employeeId, data.training_date, data.training_type, data.training_content, data.result, data.score, data.remarks, data.create_by, now, now];

    db.run(`
      INSERT INTO training_records (id, employee_id, training_date, training_type, training_content, result, score, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);

    saveDatabase();

    return { ...data, id: newId, employee_id: employeeId, create_time: now, update_time: now } as TrainingRecord;
  }

  // ==================== 考核记录操作 ====================

  /**
   * 获取员工考核记录
   * @param employeeId 员工ID
   * @returns 考核记录列表
   */
  async getAssessmentRecords(employeeId: string): Promise<AssessmentRecord[]> {
    const db = getDatabase();
    const sql = 'SELECT * FROM assessment_records WHERE employee_id = ? ORDER BY assessment_date DESC';
    return queryToObjects<AssessmentRecord>(db, sql, [employeeId]);
  }

  /**
   * 添加考核记录
   * @param employeeId 员工ID
   * @param data 考核数据
   * @returns 创建的考核记录
   */
  async createAssessmentRecord(employeeId: string, data: Partial<AssessmentRecord>): Promise<AssessmentRecord> {
    const db = getDatabase();
    const newId = data.id || `AR${Date.now()}`;
    const now = new Date().toISOString();

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const params: any[] = [newId, employeeId, data.assessment_date, data.assessment_type, data.score, data.result, data.remarks, data.create_by, now, now];

    db.run(`
      INSERT INTO assessment_records (id, employee_id, assessment_date, assessment_type, score, result, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);

    saveDatabase();

    return { ...data, id: newId, employee_id: employeeId, create_time: now, update_time: now } as AssessmentRecord;
  }

  // ==================== 工作经验操作 ====================

  /**
   * 获取员工工作经验
   * @param employeeId 员工ID
   * @returns 工作经验列表
   */
  async getWorkExperiences(employeeId: string): Promise<WorkExperience[]> {
    const db = getDatabase();
    const sql = 'SELECT * FROM work_experiences WHERE employee_id = ? ORDER BY start_date DESC';
    return queryToObjects<WorkExperience>(db, sql, [employeeId]);
  }

  /**
   * 添加工作经验
   * @param employeeId 员工ID
   * @param data 工作经验数据
   * @returns 创建的工作经验
   */
  async createWorkExperience(employeeId: string, data: Partial<WorkExperience>): Promise<WorkExperience> {
    const db = getDatabase();
    const newId = data.id || `WE${Date.now()}`;
    const now = new Date().toISOString();

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const params: any[] = [newId, employeeId, data.company_name, data.position, data.start_date, data.end_date, data.job_description, data.remarks, data.create_by, now, now];

    db.run(`
      INSERT INTO work_experiences (id, employee_id, company_name, position, start_date, end_date, job_description, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);

    saveDatabase();

    return { ...data, id: newId, employee_id: employeeId, create_time: now, update_time: now } as WorkExperience;
  }

  // ==================== 批量导入导出 ====================

  /**
   * 批量导入员工
   * @param workers 员工数据数组
   * @returns 导入结果
   */
  async importEmployees(workers: Partial<EmployeeRecord>[]): Promise<{ success: number; failed: number }> {
    if (!Array.isArray(workers) || workers.length === 0) {
      throw new Error('缺少 workers 参数或 workers 不是有效数组');
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    let successCount = 0;
    let failedCount = 0;

    for (const worker of workers) {
      try {
        const newId = worker.id || `EMP${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        // 使用 any[] 来避免 sql.js 类型严格检查问题
        const params: any[] = [
          newId,
          worker.employee_code,
          worker.name,
          worker.gender,
          worker.phone,
          worker.id_card,
          worker.position_id,
          worker.position_name,
          worker.department_id,
          worker.department_name,
          worker.employee_type,
          worker.hire_date,
          worker.status || 'active',
          worker.skills ? (typeof worker.skills === 'string' ? worker.skills : JSON.stringify(worker.skills)) : null,
          worker.remarks,
          worker.create_by,
          now,
          now
        ];
        db.run(`
          INSERT INTO employees (id, employee_code, name, gender, phone, id_card,
            position_id, position_name, department_id, department_name,
            employee_type, hire_date, status, skills, remarks, create_by, create_time, update_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, params);
        successCount++;
      } catch (e) {
        failedCount++;
      }
    }

    saveDatabase();
    return { success: successCount, failed: failedCount };
  }

  /**
   * 导出员工数据
   * @param status 状态筛选
   * @param department 部门筛选
   * @param position 岗位筛选
   * @returns 员工数据列表
   */
  async exportEmployees(status?: string, department?: string, position?: string): Promise<EmployeeRecord[]> {
    const db = getDatabase();

    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (department) {
      sql += ' AND department_id = ?';
      params.push(department);
    }
    if (position) {
      sql += ' AND position_id = ?';
      params.push(position);
    }

    sql += ' ORDER BY create_time DESC';
    return queryToObjects<EmployeeRecord>(db, sql, params);
  }
}

// 导出单例
export const laborRepository = new LaborRepository();
