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

    // P0-7：列表带出步骤（此前列表不含 steps，前端 sop.steps 恒为 undefined，
    //   导致 SOP 卡片的步骤折叠区永远不显示，sop_steps 表也因此从无写入）
    const sops = rowsToObjects(result) as Array<Record<string, unknown>>;
    if (sops.length > 0) {
      const ids = sops.map((s) => String(s.id));
      const stepsResult = db.exec(
        `SELECT * FROM sop_steps WHERE sop_id IN (${ids.map(() => '?').join(',')}) ORDER BY step_order ASC`,
        ids as any[]
      );
      const allSteps = rowsToObjects(stepsResult) as Array<Record<string, unknown>>;
      const bySop = new Map<string, Array<Record<string, unknown>>>();
      for (const step of allSteps) {
        const key = String(step.sopId ?? step.sop_id ?? '');
        if (!bySop.has(key)) bySop.set(key, []);
        bySop.get(key)!.push(step);
      }
      for (const sop of sops) {
        sop.steps = bySop.get(String(sop.id)) ?? [];
      }
    }

    res.json({ success: true, data: sops });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/sop/steps/:id
 * P0-7：删除单个 SOP 步骤（此前无删除途径，步骤只能加不能删）
 */
router.delete('/steps/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const before = db.exec('SELECT COUNT(*) AS n FROM sop_steps WHERE id = ?', [id]);
    const exists = Number(before?.[0]?.values?.[0]?.[0] ?? 0) > 0;
    if (!exists) {
      res.status(404).json({ success: false, error: '步骤不存在' });
      return;
    }
    db.exec('DELETE FROM sop_steps WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sopLibrary] 删除步骤失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/sop/bindings?task_id=xxx
 * P0-7：查任务绑定的 SOP（含步骤），供任务详情展示作业标准
 * 注意：本路由必须注册在 GET /:id 之前，否则会被 /:id 捕获
 */
router.get('/bindings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { task_id } = req.query as Record<string, string | undefined>;
    if (!task_id) {
      res.status(400).json({ success: false, error: 'task_id 必填' });
      return;
    }
    const db = getDatabase();

    const bindResult = db.exec(
      `SELECT b.id AS binding_id, b.binding_type, b.bound_at, b.bound_by,
              s.id AS sop_id, s.sop_code, s.sop_name, s.task_type, s.growth_stage,
              s.version, s.warning_notes
       FROM sop_task_bindings b
       JOIN sop_library s ON s.id = b.sop_id
       WHERE b.task_id = ?
       ORDER BY s.sop_code ASC`,
      [task_id] as any[]
    );
    const bindings = rowsToObjects(bindResult) as Array<Record<string, unknown>>;

    if (bindings.length > 0) {
      const sopIds = bindings.map((b) => String(b.sopId ?? b.sop_id ?? ''));
      const stepsResult = db.exec(
        `SELECT * FROM sop_steps WHERE sop_id IN (${sopIds.map(() => '?').join(',')}) ORDER BY step_order ASC`,
        sopIds as any[]
      );
      const allSteps = rowsToObjects(stepsResult) as Array<Record<string, unknown>>;
      const bySop = new Map<string, Array<Record<string, unknown>>>();
      for (const step of allSteps) {
        const key = String(step.sopId ?? step.sop_id ?? '');
        if (!bySop.has(key)) bySop.set(key, []);
        bySop.get(key)!.push(step);
      }
      for (const b of bindings) {
        b.steps = bySop.get(String(b.sopId ?? b.sop_id ?? '')) ?? [];
      }
    }

    res.json({ success: true, data: bindings });
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
    // 2026-10-20 P0-7：兼容 camelCase / snake_case 两种请求体（camelCaseRequest 中间件未启用）
    const pick = (...keys: string[]): unknown => {
      for (const k of keys) {
        if (body[k] !== undefined && body[k] !== null) return body[k];
      }
      return undefined;
    };
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
          pick('sop_code', 'sopCode'),
          pick('sop_name', 'sopName'),
          pick('crop_code', 'cropCode') ?? null,
          pick('crop_variety', 'cropVariety') ?? null,
          pick('growth_stage', 'growthStage') ?? null,
          pick('task_type', 'taskType'),
          pick('version') ?? 1,
          pick('effective_date', 'effectiveDate') ?? null,
          pick('expiry_date', 'expiryDate') ?? null,
          pick('status') ?? 'active',
          pick('description') ?? null,
          pick('warning_notes', 'warningNotes') ?? null,
          pick('creator_id', 'creatorId') ?? null,
          pick('creator_name', 'creatorName') ?? null,
          now,
          now,
        ] as unknown[] as Parameters<typeof db.exec>[1]
      );

      // 批量插入步骤
      const steps = (body.steps as Array<Record<string, unknown>>) ?? [];
      for (const rawStep of steps) {
        const spick = (...keys: string[]): unknown => {
          for (const k of keys) {
            if (rawStep[k] !== undefined && rawStep[k] !== null) return rawStep[k];
          }
          return undefined;
        };
        db.exec(
          `INSERT INTO sop_steps
           (id, sop_id, step_order, step_title, step_content, step_images, step_video_url,
            pesticide_code, dosage, dilution_ratio, estimated_minutes, safety_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [
            genId('step'),
            id,
            spick('step_order', 'stepOrder') ?? 0,
            spick('step_title', 'stepTitle'),
            spick('step_content', 'stepContent') ?? null,
            spick('step_images', 'stepImages') ? JSON.stringify(spick('step_images', 'stepImages')) : null,
            spick('step_video_url', 'stepVideoUrl') ?? null,
            spick('pesticide_code', 'pesticideCode') ?? null,
            spick('dosage') ?? null,
            spick('dilution_ratio', 'dilutionRatio') ?? null,
            spick('estimated_minutes', 'estimatedMinutes') ?? null,
            spick('safety_notes', 'safetyNotes') ?? null,
          ] as any[]
        );
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    saveDatabase();
    res.json({ success: true, data: { id, sop_code: pick('sop_code', 'sopCode') } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sopLibrary] 创建 SOP 失败:', message);
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
    // 2026-10-20 P0-7：兼容 camelCase / snake_case（camelCaseRequest 中间件未启用）
    const fields: Array<[string, string]> = [
      ['sop_name', 'sopName'],
      ['crop_variety', 'cropVariety'],
      ['growth_stage', 'growthStage'],
      ['description', 'description'],
      ['warning_notes', 'warningNotes'],
      ['status', 'status'],
      ['effective_date', 'effectiveDate'],
      ['expiry_date', 'expiryDate'],
    ];
    for (const [column, camel] of fields) {
      const value = body[column] !== undefined ? body[column] : body[camel];
      if (value !== undefined) {
        updates.push(`${column} = ?`);
        params.push(value);
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
    const body = req.body as Record<string, unknown>;
    // 2026-10-20 P0-7：camelCaseRequest 中间件未启用，req.body 保持前端原样。
    //   前端可能发 snake_case 或 camelCase —— 两种都兼容读取，避免 step_title 为空触发 NOT NULL 失败。
    const pick = (...keys: string[]): unknown => {
      for (const k of keys) {
        if (body[k] !== undefined && body[k] !== null) return body[k];
      }
      return undefined;
    };
    const step = {
      step_order: pick('step_order', 'stepOrder'),
      step_title: pick('step_title', 'stepTitle'),
      step_content: pick('step_content', 'stepContent'),
      step_images: pick('step_images', 'stepImages'),
      step_video_url: pick('step_video_url', 'stepVideoUrl'),
      pesticide_code: pick('pesticide_code', 'pesticideCode'),
      dosage: pick('dosage'),
      dilution_ratio: pick('dilution_ratio', 'dilutionRatio'),
      estimated_minutes: pick('estimated_minutes', 'estimatedMinutes'),
      safety_notes: pick('safety_notes', 'safetyNotes'),
    };
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
    console.error('[sopLibrary] 添加步骤失败:', message);
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
