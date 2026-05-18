/**
 * 物料编码分类树路由
 * 提供大类/中类/小类三级分类的完整 CRUD API
 *
 * 数据层级: Big → Mid → Sub
 *   big:   code='SP', parent_code='',  level='big'
 *   mid:   code='01', parent_code='SP', level='mid'
 *   sub:   code='01', parent_code='SP01', level='sub'
 */

import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

// GET /api/material-code-categories — 获取全部分类（按层级组织为树形）
// 支持 ?rule_type=material 或 ?rule_type=supplier 筛选
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const ruleType = (req.query.rule_type as string) || 'material';
    const result = db.exec(`
      SELECT id, code, name, name_en, parent_code, level, rule_type, sort_order, status, created_at, updated_at
      FROM material_code_categories
      WHERE status = 'active' AND rule_type = ?
      ORDER BY level, sort_order, code
    `, [ruleType]);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const rows: any[] = [];
    for (const val of result[0].values) {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        const camelCol = col.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
        obj[camelCol] = val[i];
      });
      rows.push(obj);
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取物料编码分类失败:', error);
    res.status(500).json({ success: false, error: '获取物料编码分类失败' });
  }
});

// POST /api/material-code-categories — 新增分类
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { code, name, nameEn, parentCode, level, ruleType } = req.body;

    if (!code || !name || !level) {
      return res.status(400).json({ success: false, error: '编码、名称和层级不能为空' });
    }

    const id = `MCC${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO material_code_categories (id, code, name, name_en, parent_code, level, rule_type, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)
    `, [id, code, name, nameEn || '', parentCode || '', level, ruleType || 'material', now, now]);

    res.json({ success: true, message: '分类创建成功', data: { id, code, name, nameEn: nameEn || '', parentCode: parentCode || '', level, ruleType: ruleType || 'material' } });
  } catch (error) {
    console.error('创建物料编码分类失败:', error);
    res.status(500).json({ success: false, error: '创建物料编码分类失败' });
  }
});

// PUT /api/material-code-categories/:code — 更新分类名称
// 支持 ?rule_type=material 或 ?rule_type=supplier 来限定更新范围
router.put('/:code', (req, res) => {
  try {
    const db = getDatabase();
    const { code } = req.params;
    const { name, nameEn, ruleType: bodyRuleType } = req.body;
    const ruleType = (req.query.rule_type as string) || bodyRuleType || 'material';

    if (!name) {
      return res.status(400).json({ success: false, error: '名称不能为空' });
    }

    const now = new Date().toISOString();
    const fields: string[] = ['name = ?', 'updated_at = ?'];
    const values: any[] = [name, now];

    if (nameEn !== undefined) {
      fields.push('name_en = ?');
      values.push(nameEn);
    }

    values.push(code, ruleType);

    db.run(`UPDATE material_code_categories SET ${fields.join(', ')} WHERE code = ? AND rule_type = ?`, values);

    res.json({ success: true, message: '分类更新成功' });
  } catch (error) {
    console.error('更新物料编码分类失败:', error);
    res.status(500).json({ success: false, error: '更新物料编码分类失败' });
  }
});

// DELETE /api/material-code-categories/:code — 删除分类（软删除）
// 支持 ?rule_type=material 或 ?rule_type=supplier 来限定删除范围
router.delete('/:code', (req, res) => {
  try {
    const db = getDatabase();
    const { code } = req.params;
    const ruleType = (req.query.rule_type as string) || 'material';
    const now = new Date().toISOString();

    // 先查一下是哪个层级的，如果是大类和中等需要同时删除所有子分类
    const result = db.exec(`SELECT level FROM material_code_categories WHERE code = ? AND rule_type = ? AND status = 'active'`, [code, ruleType]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '分类不存在' });
    }

    const level = result[0].values[0][0] as string;

    // 软删除该类本身
    db.run(`UPDATE material_code_categories SET status = 'inactive', updated_at = ? WHERE code = ? AND rule_type = ?`, [now, code, ruleType]);

    // 如果删除大类，同时删除所有中类和小类
    if (level === 'big') {
      // 删所有 parent_code = code 的中类
      const midResult = db.exec(`SELECT code FROM material_code_categories WHERE parent_code = ? AND level = 'mid' AND rule_type = ? AND status = 'active'`, [code, ruleType]);
      const midCodes: string[] = [];
      if (midResult.length > 0) {
        for (const row of midResult[0].values) {
          midCodes.push(row[0] as string);
        }
      }
      // 软删除中类
      db.run(`UPDATE material_code_categories SET status = 'inactive', updated_at = ? WHERE parent_code = ? AND level = 'mid' AND rule_type = ?`, [now, code, ruleType]);
      // 软删除这些中类下的小类
      for (const mc of midCodes) {
        const parentKey = code + mc;
        db.run(`UPDATE material_code_categories SET status = 'inactive', updated_at = ? WHERE parent_code = ? AND level = 'sub' AND rule_type = ?`, [now, parentKey, ruleType]);
      }
    }

    // 如果删除中类，同时删除所有小类
    if (level === 'mid') {
      // 找到中类的父级大类编码
      const midInfo = db.exec(`SELECT parent_code FROM material_code_categories WHERE code = ? AND level = 'mid' AND rule_type = ?`, [code, ruleType]);
      let bigCode = '';
      if (midInfo.length > 0 && midInfo[0].values.length > 0) {
        bigCode = midInfo[0].values[0][0] as string;
      }
      const parentKey = bigCode + code;
      db.run(`UPDATE material_code_categories SET status = 'inactive', updated_at = ? WHERE parent_code = ? AND level = 'sub' AND rule_type = ?`, [now, parentKey, ruleType]);
    }

    res.json({ success: true, message: '分类删除成功' });
  } catch (error) {
    console.error('删除物料编码分类失败:', error);
    res.status(500).json({ success: false, error: '删除物料编码分类失败' });
  }
});

export default router;
