/**
 * 指标评估 API 路由
 * 提供基地综合评分的 CRUD 操作
 * GET/POST/PUT/DELETE /api/indicator-evaluations
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

/** 生成唯一ID */
function generateId(): string {
  return `EVAL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** 后端snake_case → 前端camelCase字段映射 */
const FIELD_MAP: Record<string, string> = {
  production_score: 'productionScore',
  quality_score: 'qualityScore',
  cost_score: 'costScore',
  efficiency_score: 'efficiencyScore',
  total_score: 'totalScore',
};

/** 后端数据 → 前端camelCase格式 */
function normalize(item: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...item };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result) {
      result[camel] = Number(result[snake]);
    }
  }
  result.rank = Number(result.rank ?? 0);
  return result;
}

/**
 * GET / — 获取所有基地评估数据
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM indicator_evaluations ORDER BY rank ASC');
    const items: Record<string, unknown>[] = [];
    while (stmt.step()) {
      items.push(normalize(stmt.getAsObject()));
    }
    stmt.free();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取评估数据失败:', error);
    res.status(500).json({ success: false, error: '获取评估数据失败' });
  }
});

/**
 * POST / — 创建评估记录
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, name, productionScore, qualityScore, costScore, efficiencyScore, totalScore, rank } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: '基地名称不能为空' });
    }

    const evalId = id || generateId();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO indicator_evaluations
      (id, name, production_score, quality_score, cost_score, efficiency_score, total_score, rank, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      evalId,
      name,
      productionScore || 0,
      qualityScore || 0,
      costScore || 0,
      efficiencyScore || 0,
      totalScore || 0,
      rank || 0,
      now,
      now
    ]);

    saveDatabase();

    // 返回完整记录
    const stmt = db.prepare('SELECT * FROM indicator_evaluations WHERE id = ?');
    stmt.bind([evalId]);
    let created: Record<string, unknown> | null = null;
    if (stmt.step()) {
      created = normalize(stmt.getAsObject());
    }
    stmt.free();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('创建评估记录失败:', error);
    res.status(500).json({ success: false, error: '创建评估记录失败' });
  }
});

/**
 * PUT /:id — 更新评估记录
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const checkStmt = db.prepare('SELECT * FROM indicator_evaluations WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (!exists) {
      return res.status(404).json({ success: false, error: '评估记录不存在' });
    }

    const { name, productionScore, qualityScore, costScore, efficiencyScore, totalScore, rank } = req.body;
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (productionScore !== undefined) { fields.push('production_score = ?'); values.push(Number(productionScore)); }
    if (qualityScore !== undefined) { fields.push('quality_score = ?'); values.push(Number(qualityScore)); }
    if (costScore !== undefined) { fields.push('cost_score = ?'); values.push(Number(costScore)); }
    if (efficiencyScore !== undefined) { fields.push('efficiency_score = ?'); values.push(Number(efficiencyScore)); }
    if (totalScore !== undefined) { fields.push('total_score = ?'); values.push(Number(totalScore)); }
    if (rank !== undefined) { fields.push('rank = ?'); values.push(Number(rank)); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    fields.push('update_time = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE indicator_evaluations SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    // 返回更新后的完整记录
    const stmt = db.prepare('SELECT * FROM indicator_evaluations WHERE id = ?');
    stmt.bind([id]);
    let updated: Record<string, unknown> | null = null;
    if (stmt.step()) {
      updated = normalize(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新评估记录失败:', error);
    res.status(500).json({ success: false, error: '更新评估记录失败' });
  }
});

/**
 * DELETE /:id — 删除评估记录
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const checkStmt = db.prepare('SELECT * FROM indicator_evaluations WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (!exists) {
      return res.status(404).json({ success: false, error: '评估记录不存在' });
    }

    db.run('DELETE FROM indicator_evaluations WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '评估记录删除成功' });
  } catch (error) {
    console.error('删除评估记录失败:', error);
    res.status(500).json({ success: false, error: '删除评估记录失败' });
  }
});

export default router;
