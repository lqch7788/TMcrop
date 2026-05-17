/**
 * 供应商 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// ========== 格式验证函数（对标 iAGS purchaserManagement 第613-670行）==========
const VALIDATION = {
  mobilePhone: (v: string) => !v || /^1[3|4|5|7|8][0-9]{9}$/.test(v),
  workPhone: (v: string) => !v || /^(\d{3,4}-)\d{7,8}$/.test(v) || /^\(\d{3,4}\)\d{7,8}$/.test(v),
  fax: (v: string) => !v || /^(\d{3,4}-)\d{7,8}$/.test(v) || /^\(\d{3,4}\)\d{7,8}$/.test(v) || /^1[3|4|5|7|8][0-9]{9}$/.test(v),
  bankCard: (v: string) => !v || /^([1-9])(\d{14}|\d{17,18})$/.test(v),
};

router.get('/', (req: Request, res: Response) => {
  try {
    const { supplier_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM suppliers WHERE 1=1';
    const params: any[] = [];

    if (supplier_name) {
      sql += ' AND supplier_name LIKE ?';
      params.push(`%${supplier_name}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
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

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取供应商失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM suppliers WHERE id = ?');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '供应商不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取供应商详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, supplier_code, supplier_name, contact_person, contact_phone,
      mobile_phone, work_phone, fax,
      address, supplier_type, supplier_attribute,
      status, country, province, city,
      bank_name, bank_card_number,
      organization, create_date, remarks, create_by
    } = req.body;

    // 格式验证（对标 iAGS purchaserManagement）
    if (mobile_phone && !VALIDATION.mobilePhone(mobile_phone)) {
      return res.status(400).json({ success: false, error: '手机号格式不正确，应为1开头的11位数字' });
    }
    if (work_phone && !VALIDATION.workPhone(work_phone)) {
      return res.status(400).json({ success: false, error: '工作电话格式不正确，应为区号-号码格式' });
    }
    if (fax && !VALIDATION.fax(fax)) {
      return res.status(400).json({ success: false, error: '传真格式不正确' });
    }
    if (bank_card_number && !VALIDATION.bankCard(bank_card_number)) {
      return res.status(400).json({ success: false, error: '银行卡号格式不正确，应为15位或17-18位数字' });
    }

    const newId = id || `SUP${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO suppliers (
        id, supplier_code, supplier_name, contact_person, contact_phone,
        mobile_phone, work_phone, fax,
        address, supplier_type, supplier_attribute,
        status, country, province, city,
        bank_name, bank_card_number,
        organization, create_date, remarks, create_by,
        create_time, update_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, supplier_code, supplier_name, contact_person || null, contact_phone || null,
      mobile_phone || null, work_phone || null, fax || null,
      address || null, supplier_type || null, supplier_attribute || null,
      status || 'active', country || null, province || null, city || null,
      bank_name || null, bank_card_number || null,
      organization || null, create_date || null, remarks || null, create_by || null,
      now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建供应商失败:', error);
    res.status(500).json({ success: false, error: '创建供应商失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 格式验证（只验证请求中包含的字段）
    if (updates.mobile_phone && !VALIDATION.mobilePhone(updates.mobile_phone)) {
      return res.status(400).json({ success: false, error: '手机号格式不正确' });
    }
    if (updates.work_phone && !VALIDATION.workPhone(updates.work_phone)) {
      return res.status(400).json({ success: false, error: '工作电话格式不正确' });
    }
    if (updates.fax && !VALIDATION.fax(updates.fax)) {
      return res.status(400).json({ success: false, error: '传真格式不正确' });
    }
    if (updates.bank_card_number && !VALIDATION.bankCard(updates.bank_card_number)) {
      return res.status(400).json({ success: false, error: '银行卡号格式不正确' });
    }

    const now = new Date().toISOString();
    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE suppliers SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新供应商失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM suppliers WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除供应商失败' });
  }
});

export default router;
