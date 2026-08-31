/**
 * v0.3 P1-1：SOP 库 API 路由
 *
 * 路径：
 *   GET    /api/sop                  - 列出 SOP（支持 crop_code/task_type 过滤）
 *   GET    /api/sop/:id              - SOP 详情（含 steps）
 *   POST   /api/sop                  - 创建 SOP
 *   PUT    /api/sop/:id              - 更新 SOP
 *   DELETE /api/sop/:id              - 软删除 SOP
 *   POST   /api/sop/:id/steps        - 添加步骤
 *   GET    /api/sop/recommend        - 推荐 SOP（基于 crop_code + task_type）
 *   POST   /api/sop/bind-task        - 绑定 SOP 到任务
 *   DELETE /api/sop/bind-task/:id    - 解绑
 *
 * 设计原则：
 *   - 不修改任何现有 API
 *   - 软删除：status='archived'
 *   - 推荐算法：根据 crop_code + task_type + growth_stage 匹配
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

/**
 * 生成 UUID 风格的 ID
 */
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * sql.js exec 结果转对象
 */
function rowsToObjects(result: Array<{ columns: string[]; values: unknown[][] }>): Record<string, unknown>[] {
  if (result.length === 0) return [];
  const cols = result[0].columns;
  const out: Record<string, unknown>[] = [];
  for (const row of result[0].values) {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      obj[c] = row[i];
    });
    out.push(obj);
  }
  return out;
}

/**
 * GET /api/sop
 * Query: crop_code, task_type, growth_stage, status
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { crop_code, task_type, growth_stage, status } = req.query as Record<string, string | undefined>;
    const db = getDatabase();

    const whereClauses: string[] = [];
    const params: unknown[] = [];
    if (crop_code) {
      whereClauses.push('crop_code = ?');
      params.push(crop_code);
    }
    if (task_type) {
      whereClauses.push('task_type = ?');
      params.push(task_type);
    }
    if (growth_stage) {
      whereClauses.push('growth_stage = ?');
      params.push(growth_stage);
    }
    whereClauses.push("status = ?");
    params.push(status ?? 'active');

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const sql = `SELECT * FROM sop_library ${whereClause} ORDER BY created_at DESC LIMIT 200`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec(sql, params as any[]);

    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/sop/:id
 * 包含步骤
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const sopResult = db.exec('SELECT * FROM sop_library WHERE id = ?', [id]);
    if (sopResult.length === 0 || sopResult[0].values.length === 0) {
      res.status(404).json({ success: false, error: 'SOP 不存在' });
      return;
    }
    const sop = rowsToObjects(sopResult)[0];

    const stepsResult = db.exec(
      'SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY step_order ASC',
      [id]
    );
    const steps = rowsToObjects(stepsResult);

    res.json({ success: true, data: { ...sop, steps } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/sop
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const db = getDatabase();
    const id = genId('sop');
    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(
        `INSERT INTO sop_library
         (id, sop_code, sop_name, crop_code, crop_variety, growth_stage, task_type,
          version, effective_date, expiry_date, status, description, warning_notes,
          creator_id, creator_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.sop_code,
          body.sop_name,
          body.crop_code ?? null,
          body.crop_variety ?? null,
          body.growth_stage ?? null,
          body.task_type,
          body.version ?? 1,
          body.effective_date ?? null,
          body.expiry_date ?? null,
          body.status ?? 'active',
          body.description ?? null,
          body.warning_notes ?? null,
          body.creator_id ?? null,
          body.creator_name ?? null,
          now,
          now,
        ] as unknown[] as Parameters<typeof db.exec>[1]
      );

      // 批量插入步骤
      const steps = (body.steps as Array<Record<string, unknown>>) ?? [];
      for (const step of steps) {
        db.exec(
          `INSERT INTO sop_steps
           (id, sop_id, step_order, step_title, step_content, step_images, step_video_url,
            pesticide_code, dosage, dilution_ratio, estimated_minutes, safety_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [
            genId('step'),
            id,
            step.step_order,
            step.step_title,
            step.step_content ?? null,
            step.step_images ? JSON.stringify(step.step_images) : null,
            step.step_video_url ?? null,
            step.pesticide_code ?? null,
            step.dosage ?? null,
            step.dilution_ratio ?? null,
            step.estimated_minutes ?? null,
            step.safety_notes ?? null,
          ] as any[]
        );
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    saveDatabase();
    res.json({ success: true, data: { id, sop_code: body.sop_code } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /api/sop/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const db = getDatabase();

    const updates: string[] = [];
    const params: unknown[] = [];
    const fields = ['sop_name', 'crop_variety', 'growth_stage', 'description', 'warning_notes', 'status', 'effective_date', 'expiry_date'];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(body[f]);
      }
    }
    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '无更新字段' });
      return;
    }
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    updates.push('version = version + 1');
    params.push(id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.exec(`UPDATE sop_library SET ${updates.join(', ')} WHERE id = ?`, params as any[]);
    saveDatabase();
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/sop/:id （软删除）
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.exec(
      "UPDATE sop_library SET status = 'archived', updated_at = ? WHERE id = ?",
      [new Date().toISOString(), id]
    );
    saveDatabase();
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/sop/:id/steps
 */
router.post('/:id/steps', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const step = req.body as Record<string, unknown>;
    const db = getDatabase();
    const stepId = genId('step');

    db.exec(
      `INSERT INTO sop_steps
       (id, sop_id, step_order, step_title, step_content, step_images, step_video_url,
        pesticide_code, dosage, dilution_ratio, estimated_minutes, safety_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [
        stepId,
        id,
        step.step_order ?? 0,
        step.step_title,
        step.step_content ?? null,
        step.step_images ? JSON.stringify(step.step_images) : null,
        step.step_video_url ?? null,
        step.pesticide_code ?? null,
        step.dosage ?? null,
        step.dilution_ratio ?? null,
        step.estimated_minutes ?? null,
        step.safety_notes ?? null,
      ] as any[]
    );
    saveDatabase();
    res.json({ success: true, data: { id: stepId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/sop/recommend
 * Query: crop_code (required), task_type, growth_stage
 * 推荐最匹配的 SOP
 */
router.get('/recommend/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const { crop_code, task_type, growth_stage } = req.query as Record<string, string | undefined>;
    if (!crop_code) {
      res.status(400).json({ success: false, error: 'crop_code 必填' });
      return;
    }

    const db = getDatabase();
    const whereClauses: string[] = ['crop_code = ?', "status = 'active'"];
    const params: unknown[] = [crop_code];
    if (task_type) {
      whereClauses.push('task_type = ?');
      params.push(task_type);
    }
    if (growth_stage) {
      whereClauses.push('growth_stage = ?');
      params.push(growth_stage);
    }
    const sql = `SELECT * FROM sop_library WHERE ${whereClauses.join(' AND ')} ORDER BY version DESC LIMIT 5`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec(sql, params as any);
    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/sop/bind-task
 */
router.post('/bind-task', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sop_id, task_id, binding_type, bound_by } = req.body as Record<string, string>;
    if (!sop_id || !task_id) {
      res.status(400).json({ success: false, error: 'sop_id 和 task_id 必填' });
      return;
    }
    const db = getDatabase();
    const id = genId('bind');
    const now = new Date().toISOString();

    // 先删除已存在的绑定
    db.exec('DELETE FROM sop_task_bindings WHERE sop_id = ? AND task_id = ?', [sop_id, task_id]);

    db.exec(
      `INSERT INTO sop_task_bindings
       (id, sop_id, task_id, binding_type, bound_at, bound_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, sop_id, task_id, binding_type ?? 'recommended', now, bound_by ?? null]
    );
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/sop/bind-task/:id
 */
router.delete('/bind-task/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.exec('DELETE FROM sop_task_bindings WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
