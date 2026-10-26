/**
 * 问题记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
// 2026-10-22（审核 L12）：派生任务改用统一日序取号，避免 NS 编号撞主键
import { nextTaskCode } from '../services/inspectionPlanService';
import { formatLocalDateYYYYMMDD } from '../utils/dateUtil';
// 2026-10-26：派生任务补基地归属（读过滤已严格化，未归属记录会从所有基地消失）
import { resolveBaseFromRequest, applyBaseOwnership } from '../lib/baseResolver';
import { getCurrentBaseOid } from '../middleware/currentBase';

const router = Router();

// 问题状态值标准化映射（中文 -> 英文）
const PROBLEM_STATUS_MAP: Record<string, string> = {
  '待处理': 'pending',
  '处理中': 'in_progress',
  '待验收': 'waiting_acceptance',
  '已处理': 'completed',
  'pending': 'pending',
  'in_progress': 'in_progress',
  'waiting_acceptance': 'waiting_acceptance',
  'completed': 'completed',
};

// 英文状态值到中文的映射
const PROBLEM_STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待处理',
  'in_progress': '处理中',
  'waiting_acceptance': '待验收',
  'completed': '已处理',
};

/**
 * 问题状态转移表（2026-10-23 新增）
 *
 * 【为什么需要】此前 PUT /api/problems/:id 对 status 只做中英文归一化就直接落库，
 *   任何客户端都能把 pending 直接改成 completed、把 completed 改回 pending，
 *   返工次数也能随意改。任务侧早已有 TASK_STATUS_TRANSITIONS 守卫，问题侧没有。
 *
 * 合法流转（与 useProblemDispatch 的实际动作对应）：
 *   pending            待处理  → in_progress（分派）/ completed（直接关闭，如误报）
 *   in_progress        处理中  → waiting_acceptance（提交反馈）/ pending（拒绝/退回）
 *   waiting_acceptance 待验收  → completed（验收通过）/ pending（驳回返工）
 *   completed          已处理  → （终态；如需重开必须走新建）
 */
const PROBLEM_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'completed', 'waiting_acceptance'],
  in_progress: ['waiting_acceptance', 'pending', 'completed'],
  waiting_acceptance: ['completed', 'pending', 'in_progress'],
  completed: [],
};

/** 校验问题状态转移；返回 null 表示放行，否则返回拒绝原因 */
function guardProblemStatus(current: string, next: string): string | null {
  if (!next || current === next) return null;      // 未改状态 / 自转移放行
  const allowed = PROBLEM_STATUS_TRANSITIONS[current];
  if (!allowed) return null;                        // 未知源状态（历史脏数据）：不拦，仅放行
  if (allowed.includes(next)) return null;
  return `问题状态转移非法：${current} → ${next}（允许：${allowed.join('/') || '无，已是终态'}）`;
}

/**
 * problems 表真实列白名单（2026-09-21 新增）
 *
 * 用途：PUT /api/problems/:id 只允许白名单内的列名参与 SQL 拼接。
 * 此前 updates 的键名是直接拼进 `SET ${k} = ?` 的，请求体里可控的键名可以注入 SQL
 * （例如构造键名把 WHERE 子句注释掉，造成全表改写）。
 * farmTask.ts 早有同类 validDbColumns 白名单，此处补齐以保持口径一致。
 */
const PROBLEM_DB_COLUMNS = new Set<string>([
  'id', 'problem_code', 'problem_type', 'title', 'description',
  'greenhouse_name', 'reporter_id', 'reporter_name', 'assignee_id', 'assignee_name',
  'priority', 'status', 'create_time', 'update_time', 'greenhouse_id',
  'crop_name', 'inspector_id', 'inspector_name', 'check_date', 'check_time',
  'weather', 'temperature', 'humidity', 'crop_status', 'plant_height',
  'leaf_count', 'issue_text', 'issue_severity', 'handler', 'handle_date',
  'handle_result', 'source_task_id', 'flow_records', 'rework_count', 'accepted_by',
  'accepted_time', 'rejected_by', 'rejected_reason', 'rejected_time', 'completion_time',
  'expected_completion', 'remarks', 'images', 'source_module', 'source_id',
  'source_detail', 'rectification_progress', 'recheck_required', 'recheck_result', 'recheck_at',
  'rechecker_id', 'recurrence_count', 'tenant_id',
  // 2026-10-21：来源巡查类型 / 结构化问题分类（分派映射任务类型用）
  // 2026-10-24：具体问题项（灰霉病/病毒病/白粉病…）
  'inspection_type', 'issue_categories', 'issue_presets',
]);

/**
 * 标准化问题状态值（将中文转换为英文）
 */
function normalizeProblemStatus(status?: string): string {
  if (!status) return 'pending';
  return PROBLEM_STATUS_MAP[status] || status;
}

/**
 * 获取状态显示标签
 */
function getStatusLabel(status: string): string {
  return PROBLEM_STATUS_LABEL_MAP[status] || status;
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { problem_type, status, priority, greenhouse_name, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM problems WHERE 1=1';
    const params: any[] = [];

    if (problem_type) {
      sql += ' AND problem_type LIKE ?';
      params.push(`%${problem_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // 保存原始SQL用于count查询
    const countSql = sql;

    sql += ' ORDER BY create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    // 为每个item添加状态标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: getStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取问题记录失败' });
  }
});


router.post('/', (req: Request, res: Response) => {
  try {
    // camelCase → snake_case 字段名映射（兼容前端发送的字段名）
    const body = { ...req.body };
    const POST_FIELD_MAP: Record<string, string> = {
      problemCode: 'problem_code', problemType: 'problem_type',
      greenhouseId: 'greenhouse_id', greenhouseName: 'greenhouse_name',
      reporterId: 'reporter_id', reporterName: 'reporter_name',
      assigneeId: 'assignee_id', assigneeName: 'assignee_name',
      sourceType: 'source_type', sourceId: 'source_id',
      inspectorId: 'inspector_id', inspectorName: 'inspector_name',
      checkDate: 'check_date', checkTime: 'check_time',
      cropStatus: 'crop_status', plantHeight: 'plant_height', leafCount: 'leaf_count',
      issueText: 'issue_text', issueSeverity: 'issue_severity',
      handleDate: 'handle_date', handleResult: 'handle_result',
      sourceTaskId: 'source_task_id',
      flowRecords: 'flow_records',
      reworkCount: 'rework_count',
      acceptedBy: 'accepted_by', acceptedTime: 'accepted_time',
      rejectedBy: 'rejected_by', rejectedReason: 'rejected_reason', rejectedTime: 'rejected_time',
      completionTime: 'completion_time',
      expectedCompletion: 'expected_completion',
      sourceModule: 'source_module', sourceDetail: 'source_detail',
      cropName: 'crop_name',
      // 2026-10-21：巡查类型 / 问题分类（分派映射任务类型）
      // 2026-10-24：具体问题项
      inspectionType: 'inspection_type', issueCategories: 'issue_categories',
      issuePresets: 'issue_presets',
    };
    for (const [camel, snake] of Object.entries(POST_FIELD_MAP)) {
      if (body[camel] !== undefined && body[snake] === undefined) {
        body[snake] = body[camel];
      }
    }

    const {
      id, problem_code, problem_type, title, description, greenhouse_name, greenhouse_id,
      reporter_id, reporter_name, assignee_id, assignee_name, priority, status,
      // 巡查相关字段
      crop_name, inspector_id, inspector_name, check_date, check_time,
      weather, temperature, humidity, crop_status, plant_height, leaf_count,
      // 问题字段
      issue_text, issue_severity,
      // 处理字段
      handler, handle_date, handle_result, source_task_id,
      // 流转记录
      flow_records,
      // 返工/接单/拒绝
      rework_count, accepted_by, accepted_time,
      rejected_by, rejected_reason, rejected_time,
      // 其他
      completion_time, expected_completion, remarks, images,
      source_module, source_id, source_detail,
      // 2026-10-21：巡查类型 / 问题分类
      // 2026-10-24：具体问题项
      inspection_type, issue_categories, issue_presets,
    } = body;

    const newId = id || `PRB${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();

    // 2026-10-10（审核修复）：problem_code 列 NOT NULL，而前端「新建问题」不传该字段 ——
    //   此前直接 INSERT 违反约束 → 500 → store 返回 null → 弹窗照关零提示（静默失败）。
    //   缺失时按 DB 既有格式生成 PD{YYYYMMDD}{3位序号}（当日最大序号 +1）
    let finalProblemCode = problem_code;
    if (!finalProblemCode) {
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const lastRows = queryToObjects(db,
        'SELECT problem_code FROM problems WHERE problem_code LIKE ? ORDER BY problem_code DESC LIMIT 1',
        [`PD${ymd}%`]);
      const lastCode = String(lastRows[0]?.problem_code || '');
      const seq = lastCode ? (parseInt(lastCode.slice(-3), 10) || 0) + 1 : 1;
      finalProblemCode = `PD${ymd}${String(seq).padStart(3, '0')}`;
    }

    db.run(`
      INSERT INTO problems (
        id, problem_code, problem_type, title, description, greenhouse_name, greenhouse_id,
        reporter_id, reporter_name, assignee_id, assignee_name, priority, status,
        crop_name, inspector_id, inspector_name, check_date, check_time,
        weather, temperature, humidity, crop_status, plant_height, leaf_count,
        issue_text, issue_severity,
        handler, handle_date, handle_result, source_task_id,
        flow_records,
        rework_count, accepted_by, accepted_time,
        rejected_by, rejected_reason, rejected_time,
        completion_time, expected_completion, remarks, images,
        source_module, source_id, source_detail,
        inspection_type, issue_categories, issue_presets,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, finalProblemCode, problem_type, title, description, greenhouse_name, greenhouse_id || '',
      reporter_id, reporter_name, assignee_id, assignee_name, priority || 'medium', normalizeProblemStatus(status),
      crop_name || '', inspector_id || '', inspector_name || '', check_date || '', check_time || '',
      weather || '', temperature || 0, humidity || 0, crop_status || '', plant_height || 0, leaf_count || 0,
      issue_text || '', issue_severity || '',
      handler || '', handle_date || '', handle_result || '', source_task_id || '',
      typeof flow_records === 'string' ? flow_records : JSON.stringify(flow_records || []),
      rework_count || 0, accepted_by || '', accepted_time || '',
      rejected_by || '', rejected_reason || '', rejected_time || '',
      completion_time || '', expected_completion || '', remarks || '', typeof images === 'string' ? images : JSON.stringify(images || []),
      source_module || '', source_id || '', source_detail || '',
      // 2026-10-21：巡查类型 / 问题分类（JSON 数组统一序列化）
      inspection_type || '',
      typeof issue_categories === 'string' ? issue_categories : JSON.stringify(issue_categories || []),
      // 2026-10-24：具体问题项（JSON 数组统一序列化）
      typeof issue_presets === 'string' ? issue_presets : JSON.stringify(issue_presets || []),
      now, now,
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建问题记录失败:', error);
    res.status(500).json({ success: false, error: '创建问题记录失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const now = new Date().toISOString();

    // camelCase → snake_case 字段名映射（保证前端发送的字段能正确写入DB列）
    // 2026-09-21 修复：移除 7 个 problems 表中并不存在的列映射
    //   source_type / inspection_id / inspection_code / handler_id / handler_name /
    //   resolve_time / assigned_at —— 前端按旧约定发送这些字段会得到
    //   `no such column: xxx` 500（例如发 handlerId）。
    const FIELD_MAP: Record<string, string> = {
      problemCode: 'problem_code', problemType: 'problem_type',
      greenhouseId: 'greenhouse_id', greenhouseName: 'greenhouse_name',
      reporterId: 'reporter_id', reporterName: 'reporter_name',
      assigneeId: 'assignee_id', assigneeName: 'assignee_name',
      sourceId: 'source_id',
      handleResult: 'handle_result', handleDate: 'handle_date',
      sourceTaskId: 'source_task_id',
      flowRecords: 'flow_records',
      reworkCount: 'rework_count',
      acceptedBy: 'accepted_by', acceptedTime: 'accepted_time',
      rejectedBy: 'rejected_by', rejectedReason: 'rejected_reason', rejectedTime: 'rejected_time',
      completionTime: 'completion_time',
      expectedCompletion: 'expected_completion',
      sourceModule: 'source_module', sourceDetail: 'source_detail',
      createTime: 'create_time', updateTime: 'update_time',
      cropName: 'crop_name',
      inspectorId: 'inspector_id', inspectorName: 'inspector_name',
      checkDate: 'check_date', checkTime: 'check_time',
      cropStatus: 'crop_status', plantHeight: 'plant_height', leafCount: 'leaf_count',
      issueText: 'issue_text', issueSeverity: 'issue_severity',
    };
    for (const [camel, snake] of Object.entries(FIELD_MAP)) {
      if (updates[camel] !== undefined && updates[snake] === undefined) {
        updates[snake] = updates[camel];
        delete updates[camel];
      }
    }

    // 对 status 字段进行标准化转换
    if (updates.status) {
      updates.status = normalizeProblemStatus(updates.status);
    }

    // 2026-10-23：问题状态机守卫 —— 读当前状态后校验转移合法性。
    //   status 只允许通过合法流转变化，禁止 pending → completed 直达、
    //   禁止 completed 被改回其他状态（终态）。
    if (updates.status) {
      const curStmt = getDatabase().prepare(
        'SELECT status, handler, assignee_name FROM problems WHERE id = ?'
      );
      curStmt.bind([id]);
      let curStatus = '';
      let handlerName = '';
      if (curStmt.step()) {
        const row = curStmt.getAsObject() as {
          status?: string; handler?: string; assignee_name?: string;
        };
        curStatus = String(row.status || '');
        handlerName = String(row.handler || row.assignee_name || '');
      }
      curStmt.free();
      if (curStatus) {
        const violation = guardProblemStatus(curStatus, String(updates.status));
        if (violation) {
          return res.status(409).json({ success: false, error: violation, code: 'PROBLEM_STATUS_INVALID' });
        }
      }

      // 2026-10-23：验收人不得是处理人自己。
      //   演示模式下 req.user 恒为同一账号（无 token 时注入「陆启闯」），
      //   硬阻断会让所有陆启闯处理的问题都无法验收 → 默认只告警，
      //   设置 PROBLEM_ACCEPTOR_STRICT=1 才硬阻断（与供应商资质的渐进收紧模式一致）。
      if (updates.status === 'completed' && handlerName) {
        const operator = String((req as unknown as { user?: { name?: string } }).user?.name || '');
        if (operator && operator === handlerName) {
          const msg = `不能验收自己处理的问题（处理人：${handlerName}）`;
          if (process.env.PROBLEM_ACCEPTOR_STRICT === '1') {
            return res.status(403).json({ success: false, error: msg, code: 'SELF_ACCEPTANCE_FORBIDDEN' });
          }
          console.warn(`[problems PUT] 自验收告警（未阻断）: ${id} ${msg}`);
        }
      }
    }

    // JSON 字段序列化
    if (updates.flow_records !== undefined && typeof updates.flow_records !== 'string') {
      updates.flow_records = JSON.stringify(updates.flow_records);
    }
    if (updates.images !== undefined && typeof updates.images !== 'string') {
      updates.images = JSON.stringify(updates.images);
    }
    if (updates.feedback_data !== undefined && typeof updates.feedback_data !== 'string') {
      updates.feedback_data = JSON.stringify(updates.feedback_data);
    }
    // 2026-10-21：问题分类为 JSON 数组
    if (updates.issue_categories !== undefined && typeof updates.issue_categories !== 'string') {
      updates.issue_categories = JSON.stringify(updates.issue_categories);
    }
    // 2026-10-24：具体问题项同为 JSON 数组
    if (updates.issue_presets !== undefined && typeof updates.issue_presets !== 'string') {
      updates.issue_presets = JSON.stringify(updates.issue_presets);
    }

    const db = getDatabase();

    // 2026-09-21：列名白名单过滤 —— 只保留 problems 表真实存在的列，杜绝键名注入
    const safeKeys = Object.keys(updates).filter(k => k !== 'id' && PROBLEM_DB_COLUMNS.has(k));
    const droppedKeys = Object.keys(updates).filter(k => k !== 'id' && !PROBLEM_DB_COLUMNS.has(k));
    if (droppedKeys.length > 0) {
      // Fail Loud：被丢弃的字段必须可见，避免再次出现「前端发了字段但静默不生效」
      console.warn(`[problems PUT] 忽略非白名单字段: ${droppedKeys.join(', ')}`);
    }

    const fields = safeKeys.map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = safeKeys.map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE problems SET ${fields}, update_time = ? WHERE id = ?`, values);
    // 2026-10-23（Fail Loud）：0 行受影响说明 id 不存在 —— 此前照样返回 success，
    //   前端以为改成功了、刷新后原样，属「幽灵成功」（任务侧已有同样的 404 修正）。
    const changed = typeof db.getRowsModified === 'function' ? db.getRowsModified() : null;
    if (changed === 0) {
      return res.status(404).json({ success: false, error: '问题记录不存在' });
    }
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新问题记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM problems WHERE id = ?', [id]);
    // 2026-10-23（Fail Loud）：删除 0 行 = id 不存在，此前返回 success（幽灵删除）
    const changed = typeof db.getRowsModified === 'function' ? db.getRowsModified() : null;
    if (changed === 0) {
      return res.status(404).json({ success: false, error: '问题记录不存在' });
    }
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除问题记录失败' });
  }
});

/**
 * 获取每日问题汇总统计
 * GET /api/problems/daily-summary
 * 根据日期范围和温室分组统计问题数量
 */
router.get('/daily-summary', (req: Request, res: Response) => {
  try {
    const { start_date, end_date, greenhouse_name, group_by = 'date' } = req.query;
    const db = getDatabase();

    let sql: string;
    const params: any[] = [];

    if (group_by === 'greenhouse') {
      // 按温室分组
      sql = `
        SELECT
          greenhouse_name as name,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority
        FROM problems
        WHERE 1=1
      `;
    } else if (group_by === 'status') {
      // 按状态分组
      sql = `
        SELECT
          status as name,
          COUNT(*) as count,
          greenhouse_name as greenhouse
        FROM problems
        WHERE 1=1
      `;
    } else if (group_by === 'priority') {
      // 按优先级分组
      sql = `
        SELECT
          priority as name,
          COUNT(*) as count,
          greenhouse_name as greenhouse
        FROM problems
        WHERE 1=1
      `;
    } else {
      // 按日期分组（默认）
      // 2026-10-05：兼容历史数据——status / priority 字段既有英文（新数据）也有中文（旧数据）；
      // 增加 IN 子句同时匹配两种枚举值；增加「待验收」归入 pending（待人为干预）。
      sql = `
        SELECT
          strftime('%Y-%m-%d', create_time) as date,
          strftime('%Y-%m', create_time) as month,
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('pending', '待处理', '待验收') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status IN ('in_progress', '处理中') THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status IN ('completed', '已处理') THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN priority IN ('high', '严重') THEN 1 ELSE 0 END) as high_priority,
          SUM(CASE WHEN priority IN ('medium', '中等') THEN 1 ELSE 0 END) as medium_priority,
          SUM(CASE WHEN priority IN ('low', '轻微') THEN 1 ELSE 0 END) as low_priority
        FROM problems
        WHERE 1=1
      `;
    }

    // 添加过滤条件
    if (start_date) {
      sql += ' AND create_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND create_time <= ?';
      params.push(end_date + ' 23:59:59');
    }
    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // 添加分组和排序
    if (group_by === 'greenhouse') {
      sql += ' GROUP BY greenhouse_name ORDER BY total DESC';
    } else if (group_by === 'status') {
      sql += ' GROUP BY status, greenhouse_name ORDER BY status';
    } else if (group_by === 'priority') {
      sql += ' GROUP BY priority, greenhouse_name ORDER BY priority';
    } else {
      sql += ' GROUP BY strftime("%Y-%m-%d", create_time) ORDER BY date DESC';
    }

    const items = queryToObjects(db, sql, params);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取问题汇总统计失败:', error);
    res.status(500).json({ success: false, error: '获取问题汇总统计失败' });
  }
});

/**
 * 获取问题统计概览（供生产汇总表使用）
 * GET /api/problems/summary-overview
 */
router.get('/summary-overview', (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const db = getDatabase();

    let whereClause = '1=1';
    const params: any[] = [];

    if (start_date) {
      whereClause += ' AND create_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND create_time <= ?';
      params.push(end_date + ' 23:59:59');
    }

    // 总问题数
    const totalSql = `SELECT COUNT(*) as total FROM problems WHERE ${whereClause}`;
    const totalResult = queryToObjects(db, totalSql, params);

    // 待处理问题数
    const pendingSql = `SELECT COUNT(*) as pending FROM problems WHERE status = 'pending' AND ${whereClause}`;
    const pendingResult = queryToObjects(db, pendingSql, params);

    // 进行中问题数
    const inProgressSql = `SELECT COUNT(*) as in_progress FROM problems WHERE status = 'in_progress' AND ${whereClause}`;
    const inProgressResult = queryToObjects(db, inProgressSql, params);

    // 已处理问题数
    const resolvedSql = `SELECT COUNT(*) as resolved FROM problems WHERE status = 'completed' AND ${whereClause}`;
    const resolvedResult = queryToObjects(db, resolvedSql, params);

    // 严重问题数
    const highPrioritySql = `SELECT COUNT(*) as high_priority FROM problems WHERE priority = 'high' AND ${whereClause}`;
    const highPriorityResult = queryToObjects(db, highPrioritySql, params);

    // 本月新增问题数
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();
    const monthSql = `SELECT COUNT(*) as month_new FROM problems WHERE create_time >= ?`;
    const monthResult = queryToObjects(db, monthSql, [monthStartStr]);

    // 环比增长率（与上月同期相比）
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart);
    lastMonthEnd.setDate(0); // 上月最后一天
    lastMonthEnd.setHours(23, 59, 59, 999);

    const currentPeriodSql = `SELECT COUNT(*) as count FROM problems WHERE ${whereClause}`;
    const currentPeriodResult = queryToObjects(db, currentPeriodSql, params);

    const lastMonthSql = `SELECT COUNT(*) as count FROM problems WHERE create_time >= ? AND create_time <= ?`;
    const lastMonthResult = queryToObjects(db, lastMonthSql, [lastMonthStart.toISOString(), lastMonthEnd.toISOString()]);

    const currentCount = currentPeriodResult[0]?.count || 0;
    const lastMonthCount = lastMonthResult[0]?.count || 0;
    let trend = 0;
    if (lastMonthCount > 0) {
      trend = Math.round(((currentCount - lastMonthCount) / lastMonthCount) * 100);
    }

    const data = {
      total: totalResult[0]?.total || 0,
      pending: pendingResult[0]?.pending || 0,
      in_progress: inProgressResult[0]?.in_progress || 0,
      resolved: resolvedResult[0]?.resolved || 0,
      high_priority: highPriorityResult[0]?.high_priority || 0,
      month_new: monthResult[0]?.month_new || 0,
      trend: trend,
      resolution_rate: totalResult[0]?.total > 0
        ? Math.round((resolvedResult[0]?.resolved / totalResult[0]?.total) * 100)
        : 0
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取问题统计概览失败:', error);
    res.status(500).json({ success: false, error: '获取问题统计概览失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM problems WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '问题记录不存在' });
    }

    // 添加状态标签
    item.statusLabel = getStatusLabel(item.status || 'pending');

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取问题详情失败' });
  }
});

/**
 * 2026-09-21：为问题派生一条应急任务（应急处理场景）
 * 2026-10-21（阶段 3）：改写入 farm_tasks —— 临时任务模块已下线。
 *   URL 保留 /dispatch-temp 不变（前端 service 与历史调用方无需改），语义已改为农事任务。
 * POST /api/problems/:id/dispatch-temp
 * body: { assigneeId, assigneeName, title, type, urgency, dueDate, estimatedHours, ... }
 * source_problem_id 填入 :id，让「问题→关联任务」能展示
 */
router.post('/:id/dispatch-temp', (req: Request, res: Response) => {
  try {
    const { id: problemId } = req.params;
    const db = getDatabase();

    // 1. 校验问题存在
    const problemStmt = db.prepare('SELECT id, problem_code, title FROM problems WHERE id = ?');
    problemStmt.bind([problemId]);
    let problem: any = null;
    if (problemStmt.step()) problem = problemStmt.getAsObject();
    problemStmt.free();
    if (!problem || Object.keys(problem).length === 0) {
      return res.status(404).json({ success: false, error: '问题记录不存在' });
    }

    // 2. 解析 body
    const {
      assigneeId = '', assigneeName = '', title = '', taskType = 'other',
      urgency = 'normal', dueDate = '', estimatedHours = 0,
      description = '', location = '', greenhouseName = '',
    } = req.body || {};

    if (!assigneeId || !assigneeName) {
      return res.status(400).json({ success: false, error: 'assigneeId / assigneeName 必填' });
    }

    // 3. 生成任务编号
    // 2026-10-21（阶段 3）：派生任务从 temp_tasks 改写入 farm_tasks ——
    //   临时任务模块已下线，问题分派产生的应急任务统一进农事任务列表。
    const now = new Date().toISOString();
    // 2026-10-22（审核 L12）：原实现用 `Date.now() % 1000` 当流水号且不查重。
    //   计划任务也用 NS{日期}-{3位} 前缀，同一天任务一多就有可观概率撞主键
    //   （重试同一秒内甚至必然相同）→ 分派 500。改走统一的日序取号。
    const newId = nextTaskCode(db, formatLocalDateYYYYMMDD());
    // 沿用农事任务的 NS 编号规则，避免与历史 TT 编号混淆
    const taskCode = newId;
    const typeLabel = taskType === 'other' ? '其他' : taskType;
    const taskTitle = title || `【问题处理】${problem.problem_code}`;
    const taskContent = description || `从问题 ${problem.problem_code} 派发`;

    db.run(`
      INSERT INTO farm_tasks (
        id, task_code, task_title, title, task_type, type_name, task_content, description,
        assigner_id, assigner_name, assignee_id, assignee_name,
        greenhouse_name, area_name,
        plan_date, plan_time, due_date, plan_end,
        priority, urgency, status, progress,
        estimated_hours, estimated_days, worker_count, actual_hours,
        rework_count, create_time, update_time,
        source_type, dispatch_mode, source_problem_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, taskCode, taskTitle, taskTitle, taskType, typeLabel, taskContent, taskContent,
      req.user?.userId || '', req.user?.name || '系统', assigneeId, assigneeName,
      greenhouseName, location || greenhouseName,
      now.substring(0, 10), now.substring(11, 19), dueDate || now.substring(0, 10), dueDate || now.substring(0, 10),
      urgency, urgency, 'pending', 0,
      estimatedHours, 0, 1, 0,
      0, now, now,
      'problem', 'farm', problemId, 1,
    ]);

    // 2026-10-26：派生任务补基地归属（读过滤严格化后，无归属任务会从所有基地消失）
    const derivedBase = resolveBaseFromRequest(req.body, getCurrentBaseOid(req));
    if (derivedBase) applyBaseOwnership('farm_tasks', String(newId), derivedBase);

    // 4. 问题 status 自动从 pending → in_progress（如果当前是 pending）
    db.run(`UPDATE problems SET status = ?, update_time = ? WHERE id = ? AND status = ?`,
      ['in_progress', now, problemId, 'pending']);

    // 5. 写审计日志
    db.run(`INSERT INTO operation_logs (id, user_id, username, action, module, resource_type, resource_id, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
       req.user?.userId || '', req.user?.name || '系统',
       'dispatch_temp', '问题管理', 'problem', problemId,
       `派生农事任务 ${taskCode} 派给 ${assigneeName}`, 'success', now]);

    saveDatabase();

    res.json({
      success: true,
      data: { id: newId, taskCode, sourceProblemId: problemId },
      message: "由问题 " + problem.problem_code + " 派发农事任务成功",
    });
  } catch (error) {
    console.error('为问题派生农事任务失败:', error);
    res.status(500).json({ success: false, error: '派生临时任务失败' });
  }
});

/**
 * 2026-09-21：把一条巡查记录关联到问题（双向）
 * POST /api/problems/:id/link-inspection
 * body: { inspectionId }
 * 写 inspections.source_problem_id = :id
 */
router.post('/:id/link-inspection', (req: Request, res: Response) => {
  try {
    const { id: problemId } = req.params;
    const { inspectionId } = req.body || {};
    if (!inspectionId) {
      return res.status(400).json({ success: false, error: 'inspectionId 必填' });
    }
    const db = getDatabase();

    // 1. 校验问题存在
    const problemStmt = db.prepare('SELECT id, problem_code FROM problems WHERE id = ?');
    problemStmt.bind([problemId]);
    let problem: any = null;
    if (problemStmt.step()) problem = problemStmt.getAsObject();
    problemStmt.free();
    if (!problem || Object.keys(problem).length === 0) {
      return res.status(404).json({ success: false, error: '问题记录不存在' });
    }

    // 2. 校验巡查存在
    const inspectStmt = db.prepare('SELECT id, record_code FROM inspections WHERE id = ?');
    inspectStmt.bind([inspectionId]);
    let inspection: any = null;
    if (inspectStmt.step()) inspection = inspectStmt.getAsObject();
    inspectStmt.free();
    if (!inspection || Object.keys(inspection).length === 0) {
      return res.status(404).json({ success: false, error: '巡查记录不存在' });
    }

    // 3. 写关联
    db.run(`UPDATE inspections SET source_problem_id = ?, update_time = ? WHERE id = ?`,
      [problemId, new Date().toISOString(), inspectionId]);

    // 4. 写审计
    db.run(`INSERT INTO operation_logs (id, user_id, username, action, module, resource_type, resource_id, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
       req.user?.userId || '', req.user?.name || '系统',
       'link_inspection', '问题管理', 'problem', problemId,
       `关联巡查记录 ${inspection.record_code}`, 'success', new Date().toISOString()]);

    saveDatabase();

    res.json({
      success: true,
      data: { inspectionId, sourceProblemId: problemId },
      message: `巡查 ${inspection.record_code} 已关联到问题 ${problem.problem_code}`,
    });
  } catch (error) {
    console.error('关联巡查记录到问题失败:', error);
    res.status(500).json({ success: false, error: '关联巡查记录失败' });
  }
});

export default router;
