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
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

/**
 * 定位分类命中行（2026-09-28 审计修复配套）
 *
 * 背景：中类/小类 code 在同一 rule_type 下跨大类重复
 * （实测：material 中类 3 组、小类 8 组；supplier 中类 7 组），
 * 只按 code 定位会一次改/删多个大类下的同名分类。
 * 因此：提供 parent_code 时精确定位；未提供时返回全部命中，由调用方决定是否拒绝。
 */
function locateCategoryHits(
  db: any,
  code: string,
  ruleType: string,
  parentCode: string
): Array<{ level: string; parentCode: string }> {
  const sql = parentCode
    ? "SELECT level, IFNULL(parent_code, '') FROM material_code_categories WHERE code = ? AND rule_type = ? AND status = 'active' AND IFNULL(parent_code, '') = ?"
    : "SELECT level, IFNULL(parent_code, '') FROM material_code_categories WHERE code = ? AND rule_type = ? AND status = 'active'";
  const params = parentCode ? [code, ruleType, parentCode] : [code, ruleType];
  const r = db.exec(sql, params);
  if (!r.length) return [];
  return r[0].values.map((v: unknown[]) => ({ level: String(v[0] || ''), parentCode: String(v[1] || '') }));
}

// GET /api/material-code-categories — 获取全部分类（按层级组织为树形）
// 支持 ?rule_type=material 或 ?rule_type=supplier 筛选
// 2026-08-10 修复：早期种子脚本可能产生 (code, parent_code, level, rule_type) 重复行，
//   导致前端 CodeRule 页面树形表显示重复大类、折叠按钮状态混乱（React 重复 key）。
//   此处按 (code, parent_code, level, rule_type) 取最早一条（id 最小），保证数据唯一。
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const ruleType = (req.query.rule_type as string) || 'material';
    const result = db.exec(`
      SELECT id, code, name, name_en, parent_code, level, rule_type, sort_order, status, created_at, updated_at
      FROM material_code_categories AS mcc
      WHERE status = 'active' AND rule_type = ?
        AND id = (
          SELECT MIN(id) FROM material_code_categories
          WHERE status = 'active' AND rule_type = ?
            AND code = mcc.code
            AND parent_code = mcc.parent_code
            AND level = mcc.level
        )
      ORDER BY level, sort_order, code
    `, [ruleType, ruleType]);

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

    saveDatabase();
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
    const { name, nameEn, ruleType: bodyRuleType, parentCode: bodyParentCode } = req.body;
    // 2026-09-28 审计修复：rule_type 必须显式指定——
    // 原实现缺省兜底 'material'，而供应商规则页的调用方没带该参数
    // → 在供应商规则页做改名/删除会静默命中**物料**编码规则（物料与供应商大类 5 个撞码：SP/EQ/OP/PH/OT）
    const ruleType = String((req.query.rule_type as string) || bodyRuleType || '').trim();
    if (ruleType !== 'material' && ruleType !== 'supplier') {
      return res.status(400).json({
        success: false,
        error: '缺少或非法 rule_type（仅支持 material | supplier）——为避免跨规则误改，必须显式指定',
      });
    }
    const parentCode = String((req.query.parent_code as string) || bodyParentCode || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, error: '名称不能为空' });
    }

    // 2026-09-28 审计修复：同一 rule_type 下中类/小类 code 会跨大类重复
    // （实测：material 中类 3 组、小类 8 组；supplier 中类 7 组重复），
    // 只按 code 定位会一次改掉多个大类下的同名分类。未提供 parent_code 且命中多行时直接拒绝。
    const hits = locateCategoryHits(db, code, ruleType, parentCode);
    if (hits.length === 0) {
      return res.status(404).json({ success: false, error: '分类不存在' });
    }
    if (hits.length > 1) {
      return res.status(409).json({
        success: false,
        error: `该编码在 ${ruleType} 规则下命中 ${hits.length} 条分类（所属大类：${hits.map((h) => h.parentCode || '—').join('、')}），请提供 parent_code 精确定位后再改`,
      });
    }

    const now = new Date().toISOString();
    const fields: string[] = ['name = ?', 'updated_at = ?'];
    const values: any[] = [name, now];

    if (nameEn !== undefined) {
      fields.push('name_en = ?');
      values.push(nameEn);
    }

    values.push(code, ruleType);
    let where = 'code = ? AND rule_type = ?';
    if (parentCode) {
      where += ' AND IFNULL(parent_code, \'\') = ?';
      values.push(parentCode);
    }

    db.run(`UPDATE material_code_categories SET ${fields.join(', ')} WHERE ${where}`, values);

    saveDatabase();
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
    // 2026-09-28 审计修复：rule_type 必须显式指定（原缺省 'material' → 供应商规则页删类会误删物料规则）
    const ruleType = String((req.query.rule_type as string) || (req.body?.ruleType as string) || '').trim();
    if (ruleType !== 'material' && ruleType !== 'supplier') {
      return res.status(400).json({
        success: false,
        error: '缺少或非法 rule_type（仅支持 material | supplier）——为避免跨规则误删，必须显式指定',
      });
    }
    const parentCode = String((req.query.parent_code as string) || (req.body?.parentCode as string) || '').trim();
    const now = new Date().toISOString();

    // 2026-09-28 审计修复：中类/小类 code 跨大类重复（material 中类 3 组、小类 8 组；supplier 中类 7 组），
    // 只按 code 删除会一次停用多个大类下的同名分类；未提供 parent_code 且命中多行时拒绝
    const hits = locateCategoryHits(db, code, ruleType, parentCode);
    if (hits.length === 0) {
      return res.status(404).json({ success: false, error: '分类不存在' });
    }
    if (hits.length > 1) {
      return res.status(409).json({
        success: false,
        error: `该编码在 ${ruleType} 规则下命中 ${hits.length} 条分类（所属大类：${hits.map((h) => h.parentCode || '—').join('、')}），请提供 parent_code 精确定位后再删`,
      });
    }

    const level = hits[0].level;

    // 软删除该类本身
    let delWhere = 'code = ? AND rule_type = ?';
    if (parentCode) delWhere += " AND IFNULL(parent_code, '') = ?";
    db.run(
      `UPDATE material_code_categories SET status = 'inactive', updated_at = ? WHERE ${delWhere}`,
      parentCode ? [now, code, ruleType, parentCode] : [now, code, ruleType]
    );

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

    saveDatabase();
    res.json({ success: true, message: '分类删除成功' });
  } catch (error) {
    console.error('删除物料编码分类失败:', error);
    res.status(500).json({ success: false, error: '删除物料编码分类失败' });
  }
});

export default router;
