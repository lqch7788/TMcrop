/**
 * 公告 API 路由
 * 提供公告的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// ============================================
// 辅助函数
// ============================================

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// 公告模板 API（注册在 /:id 之前，避免 /templates 被 /:id 匹配）
// ============================================

/**
 * 获取所有公告模板
 * GET /api/announcements/templates
 * Query: type, status, keyword, page, limit
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      type,
      status,
      keyword,
      page = 1,
      limit = 50
    } = req.query;

    let sql = 'SELECT * FROM announcement_templates WHERE 1=1';
    const params: (string | number)[] = [];

    if (type && type !== '全部') {
      sql += ' AND type = ?';
      params.push(type as string);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR content LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const countSql = sql;
    sql += ' ORDER BY create_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取公告模板列表失败:', error);
    res.status(500).json({ success: false, error: '获取公告模板列表失败' });
  }
});

/**
 * 获取单个公告模板
 * GET /api/announcements/templates/:id
 */
router.get('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM announcement_templates WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '公告模板不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取公告模板详情失败:', error);
    res.status(500).json({ success: false, error: '获取公告模板详情失败' });
  }
});

/**
 * 创建公告模板
 * POST /api/announcements/templates
 */
router.post('/templates', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      code,
      name,
      type,
      category,
      title_template,
      content,
      default_priority,
      status
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: '模板名称不能为空' });
    }

    // type 从 category 推断（公告分类已替代公告类型）
    const templateType = type || category || '';
    const now = new Date().toISOString();
    const id = generateId('ATPL');

    let templateCode = code || `TPL_${Date.now()}`;

    db.run(`
      INSERT INTO announcement_templates (
        id, code, name, type, category, title_template, content,
        default_priority, usage_count, status, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      templateCode,
      name,
      templateType,
      category || '',
      title_template || '',
      content || '',
      default_priority || 'normal',
      0,
      status || 'active',
      now,
      now
    ]);

    saveDatabase();

    res.status(201).json({ success: true, message: '公告模板创建成功', data: { id, code: templateCode } });
  } catch (error) {
    console.error('创建公告模板失败:', error);
    res.status(500).json({ success: false, error: '创建公告模板失败' });
  }
});

/**
 * 更新公告模板
 * PUT /api/announcements/templates/:id
 */
router.put('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM announcement_templates WHERE id = ?');
    stmt.bind([id]);
    let template: Record<string, unknown> | null = null;
    if (stmt.step()) {
      template = stmt.getAsObject();
    }
    stmt.free();

    if (!template) {
      return res.status(404).json({ success: false, error: '公告模板不存在' });
    }

    const fieldMap: Record<string, string> = {
      code: 'code',
      name: 'name',
      type: 'type',
      category: 'category',
      title_template: 'title_template',
      content: 'content',
      default_priority: 'default_priority',
      usage_count: 'usage_count',
      status: 'status'
    };

    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      const dbField = fieldMap[key] || key;
      updateFields.push(`${dbField} = ?`);
      values.push(value as string | number | null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    updateFields.push('update_time = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE announcement_templates SET ${updateFields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    res.json({ success: true, message: '公告模板更新成功' });
  } catch (error) {
    console.error('更新公告模板失败:', error);
    res.status(500).json({ success: false, error: '更新公告模板失败' });
  }
});

/**
 * 删除公告模板
 * DELETE /api/announcements/templates/:id
 */
router.delete('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM announcement_templates WHERE id = ?');
    stmt.bind([id]);
    let template: Record<string, unknown> | null = null;
    if (stmt.step()) {
      template = stmt.getAsObject();
    }
    stmt.free();

    if (!template) {
      return res.status(404).json({ success: false, error: '公告模板不存在' });
    }

    db.run('DELETE FROM announcement_templates WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '公告模板删除成功' });
  } catch (error) {
    console.error('删除公告模板失败:', error);
    res.status(500).json({ success: false, error: '删除公告模板失败' });
  }
});

// ============================================
// 公告 API
// ============================================

/**
 * 获取所有公告
 * GET /api/announcements
 * Query: type, priority, status, keyword, page, limit
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      type,
      priority,
      status,
      keyword,
      page = 1,
      limit = 50
    } = req.query;

    let sql = 'SELECT * FROM announcements WHERE 1=1';
    const params: (string | number)[] = [];

    if (type && type !== '全部') {
      sql += ' AND type = ?';
      params.push(type as string);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority as string);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (keyword) {
      sql += ' AND (title LIKE ? OR code LIKE ? OR content LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

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

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(500).json({ success: false, error: '获取公告列表失败' });
  }
});

/**
 * 获取单个公告
 * GET /api/announcements/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM announcements WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '公告不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.status(500).json({ success: false, error: '获取公告详情失败' });
  }
});

/**
 * 创建公告
 * POST /api/announcements
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      id,
      code,
      title,
      type,
      category,
      priority,
      status,
      sender,
      date,
      deadline,
      readCount,
      recipients,
      content
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: '公告ID不能为空' });
    }

    const now = new Date().toISOString();
    const nowDate = new Date();

    // 生成公告编号
    let announcementCode = code;
    if (!announcementCode) {
      const year = nowDate.getFullYear().toString();
      const month = (nowDate.getMonth() + 1).toString().padStart(2, '0');
      const day = nowDate.getDate().toString().padStart(2, '0');
      const hours = nowDate.getHours().toString().padStart(2, '0');
      const minutes = nowDate.getMinutes().toString().padStart(2, '0');
      const seconds = nowDate.getSeconds().toString().padStart(2, '0');
      const timestampStr = `${year}${month}${day}${hours}${minutes}${seconds}`;

      // 查询当天最大的公告编号
      const stmt = db.prepare(`
        SELECT code FROM announcements
        WHERE code LIKE ?
        ORDER BY code DESC LIMIT 1
      `);
      stmt.bind([`N${timestampStr}%`]);

      let maxSeq = 0;
      if (stmt.step()) {
        const lastCode = stmt.getAsObject().code as string;
        const seqStr = lastCode.slice(-3);
        maxSeq = parseInt(seqStr, 10) || 0;
      }
      stmt.free();

      const seq = maxSeq + 1;
      announcementCode = `N${timestampStr}${String(seq).padStart(3, '0')}`;
    }

    db.run(`
      INSERT INTO announcements (
        id, code, title, type, category, priority, status,
        sender, date, deadline, read_count, recipients, content,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      announcementCode,
      title || '',
      type || '生产公告',
      category || '',
      priority || '中',
      status || '草稿',
      sender || '',
      date || now.substring(0, 10),
      deadline || '',
      readCount || 0,
      recipients || '',
      content || '',
      now,
      now
    ]);

    saveDatabase();

    res.status(201).json({ success: true, message: '公告创建成功', id, code: announcementCode });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({ success: false, error: '创建公告失败' });
  }
});

/**
 * 更新公告
 * PUT /api/announcements/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 先查询当前数据
    const stmt = db.prepare('SELECT * FROM announcements WHERE id = ?');
    stmt.bind([id]);
    let announcement: Record<string, unknown> | null = null;
    if (stmt.step()) {
      announcement = stmt.getAsObject();
    }
    stmt.free();

    if (!announcement) {
      return res.status(404).json({ success: false, error: '公告不存在' });
    }

    // 构建更新字段映射 (camelCase -> snake_case)
    const fieldMap: Record<string, string> = {
      code: 'code',
      title: 'title',
      type: 'type',
      category: 'category',
      priority: 'priority',
      status: 'status',
      sender: 'sender',
      date: 'date',
      deadline: 'deadline',
      readCount: 'read_count',
      recipients: 'recipients',
      content: 'content'
    };

    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;

      const dbField = fieldMap[key] || key;
      updateFields.push(`${dbField} = ?`);
      values.push(value as string | number | null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    updateFields.push('update_time = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    res.json({ success: true, message: '公告更新成功' });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({ success: false, error: '更新公告失败' });
  }
});

/**
 * 删除公告
 * DELETE /api/announcements/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查公告是否存在
    const stmt = db.prepare('SELECT * FROM announcements WHERE id = ?');
    stmt.bind([id]);
    let announcement: Record<string, unknown> | null = null;
    if (stmt.step()) {
      announcement = stmt.getAsObject();
    }
    stmt.free();

    if (!announcement) {
      return res.status(404).json({ success: false, error: '公告不存在' });
    }

    db.run('DELETE FROM announcements WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '公告删除成功' });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({ success: false, error: '删除公告失败' });
  }
});

/**
 * 批量删除公告
 * DELETE /api/announcements/batch
 * Body: { ids: string[] }
 */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要删除的公告ID列表' });
    }

    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM announcements WHERE id IN (${placeholders})`, ids);
    saveDatabase();

    res.json({ success: true, message: `成功删除 ${ids.length} 个公告` });
  } catch (error) {
    console.error('批量删除公告失败:', error);
    res.status(500).json({ success: false, error: '批量删除公告失败' });
  }
});

/**
 * 更新公告状态
 * PUT /api/announcements/:id/status
 */
router.put('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: '缺少 status 参数' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // 检查公告是否存在
    const stmt = db.prepare('SELECT * FROM announcements WHERE id = ?');
    stmt.bind([id]);
    let announcement: Record<string, unknown> | null = null;
    if (stmt.step()) {
      announcement = stmt.getAsObject();
    }
    stmt.free();

    if (!announcement) {
      return res.status(404).json({ success: false, error: '公告不存在' });
    }

    db.run('UPDATE announcements SET status = ?, update_time = ? WHERE id = ?', [status, now, id]);
    saveDatabase();

    res.json({ success: true, message: '公告状态已更新' });
  } catch (error) {
    console.error('更新公告状态失败:', error);
    res.status(500).json({ success: false, error: '更新公告状态失败' });
  }
});

/**
 * 增加阅读数
 * POST /api/announcements/:id/read
 */
router.post('/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查公告是否存在
    const stmt = db.prepare('SELECT * FROM announcements WHERE id = ?');
    stmt.bind([id]);
    let announcement: Record<string, unknown> | null = null;
    if (stmt.step()) {
      announcement = stmt.getAsObject();
    }
    stmt.free();

    if (!announcement) {
      return res.status(404).json({ success: false, error: '公告不存在' });
    }

    const currentReadCount = (announcement.read_count as number) || 0;
    db.run('UPDATE announcements SET read_count = ?, update_time = ? WHERE id = ?', [currentReadCount + 1, new Date().toISOString(), id]);
    saveDatabase();

    res.json({ success: true, message: '阅读数已更新' });
  } catch (error) {
    console.error('更新阅读数失败:', error);
    res.status(500).json({ success: false, error: '更新阅读数失败' });
  }
});

/**
 * 重置公告数据
 * POST /api/announcements/reset
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 清空现有数据
    db.run('DELETE FROM announcements');

    // 插入默认数据
    const defaultData = [
      { id: '1', code: 'N20260401', title: '关于2026年春季种植计划的通知', type: '生产公告', category: '生产计划', priority: '高', status: '已发布', sender: '生产管理部', date: '2026-04-15', deadline: '2026-05-15', readCount: 156, recipients: '全体基地', content: '为确保2026年春季种植工作顺利开展，现将种植计划通知如下...' },
      { id: '2', code: 'N20260402', title: '温室环境控制标准更新', type: '生产公告', category: '技术标准', priority: '高', status: '已发布', sender: '技术部', date: '2026-04-18', deadline: '2026-05-01', readCount: 142, recipients: '温室管理人员', content: '根据最新研究成果，现对温室环境控制标准进行更新...' },
      { id: '3', code: 'N20260403', title: '劳动节放假安排通知', type: '行政公告', category: '行政通知', priority: '中', status: '已发布', sender: '行政人事部', date: '2026-04-20', deadline: '2026-05-10', readCount: 234, recipients: '全体员工', content: '根据国家法定节假日安排，现将劳动节放假事宜通知如下...' },
      { id: '4', code: 'N20260404', title: '新员工入职培训通知', type: '行政公告', category: '培训通知', priority: '中', status: '审批中', sender: '行政人事部', date: '2026-04-22', deadline: '2026-05-05', readCount: 0, recipients: '新入职员工', content: '欢迎新员工加入公司，现将入职培训安排通知如下...' },
      { id: '5', code: 'N20260405', title: '农药使用安全规范', type: '生产公告', category: '安全规范', priority: '高', status: '已发布', sender: '安全生产部', date: '2026-04-25', deadline: '2026-06-01', readCount: 128, recipients: '生产人员', content: '为确保农药使用安全，特制定本规范...' },
      { id: '6', code: 'N20260406', title: '办公设备采购通知', type: '行政公告', category: '采购通知', priority: '低', status: '草稿', sender: '行政部', date: '2026-04-28', deadline: '2026-05-15', readCount: 0, recipients: '各部门负责人', content: '根据公司需求，现计划采购一批办公设备...' },
      { id: '7', code: 'N20260501', title: '采收标准更新通知', type: '生产公告', category: '技术标准', priority: '高', status: '已发布', sender: '质量管理部', date: '2026-05-01', deadline: '2026-05-15', readCount: 98, recipients: '采收人员', content: '为提高产品质量，现对采收标准进行更新...' },
      { id: '8', code: 'N20260502', title: '安全生产月活动通知', type: '行政公告', category: '活动通知', priority: '中', status: '已发布', sender: '安全生产部', date: '2026-05-05', deadline: '2026-06-05', readCount: 187, recipients: '全体员工', content: '为提高全员安全意识，现将安全生产月活动安排通知如下...' },
      { id: '9', code: 'N20260503', title: '灌溉系统维护通知', type: '生产公告', category: '设备维护', priority: '中', status: '审批中', sender: '设备管理部', date: '2026-05-08', deadline: '2026-05-20', readCount: 0, recipients: '设备维护人员', content: '为确保灌溉系统正常运行，现将维护计划通知如下...' },
      { id: '10', code: 'N20260504', title: '考勤管理制度修订', type: '行政公告', category: '制度修订', priority: '高', status: '已发布', sender: '行政人事部', date: '2026-05-10', deadline: '2026-06-01', readCount: 210, recipients: '全体员工', content: '为规范考勤管理，现对考勤管理制度进行修订...' },
    ];

    for (const item of defaultData) {
      db.run(`
        INSERT INTO announcements (
          id, code, title, type, category, priority, status,
          sender, date, deadline, read_count, recipients, content,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id,
        item.code,
        item.title,
        item.type,
        item.category,
        item.priority,
        item.status,
        item.sender,
        item.date,
        item.deadline,
        item.readCount,
        item.recipients,
        item.content,
        now,
        now
      ]);
    }

    saveDatabase();
    res.json({ success: true, message: '公告数据已重置' });
  } catch (error) {
    console.error('重置公告数据失败:', error);
    res.status(500).json({ success: false, error: '重置公告数据失败' });
  }
});

/**
 * 从前端 localStorage 导入数据
 * POST /api/announcements/import
 * Body: { notices: Notice[] }
 */
router.post('/import', (req: Request, res: Response) => {
  try {
    const { notices } = req.body;

    if (!Array.isArray(notices) || notices.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的公告数据' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // 清空现有数据
    db.run('DELETE FROM announcements');

    // 批量插入前端数据
    for (const item of notices) {
      db.run(`
        INSERT INTO announcements (
          id, code, title, type, category, priority, status,
          sender, date, deadline, read_count, recipients, content,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id,
        item.code || '',
        item.title || '',
        item.type || '生产公告',
        item.category || '',
        item.priority || '中',
        item.status || '草稿',
        item.sender || '',
        item.date || now.substring(0, 10),
        item.deadline || '',
        item.readCount || 0,
        item.recipients || '',
        item.content || '',
        now,
        now
      ]);
    }

    saveDatabase();
    res.json({ success: true, message: `成功导入 ${notices.length} 条公告数据` });
  } catch (error) {
    console.error('导入公告数据失败:', error);
    res.status(500).json({ success: false, error: '导入公告数据失败' });
  }
});

export default router;
