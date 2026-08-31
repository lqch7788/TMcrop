/**
 * v0.3 P1-2：提醒引擎 API 路由
 *
 * 路径：
 *   GET   /api/reminders/rules          - 列出所有规则
 *   POST  /api/reminders/rules          - 创建规则
 *   POST  /api/reminders/run            - 手动触发扫描（v0.4 接 node-cron）
 *   GET   /api/reminders/my             - 当前用户的提醒
 *   POST  /api/reminders/:id/read       - 标记已读
 *
 * 设计原则：
 *   - 不修改任何现有 API
 *   - reminders 表已存在（加字段在 createReminderRules.ts）
 *   - 支持内置规则 RULE_TASK_OVERDUE
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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
 * GET /api/reminders/rules
 */
router.get('/rules', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM reminder_rules ORDER BY created_at DESC');
    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/reminders/rules
 */
router.post('/rules', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const db = getDatabase();
    const id = genId('rr');
    const now = new Date().toISOString();

    db.exec(
      `INSERT INTO reminder_rules
       (id, rule_code, rule_name, rule_type, trigger_condition, notification_channels,
        receiver_template, is_active, priority, cooldown_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [
        id,
        body.rule_code,
        body.rule_name,
        body.rule_type,
        body.trigger_condition ? JSON.stringify(body.trigger_condition) : null,
        body.notification_channels ? JSON.stringify(body.notification_channels) : '["inbox"]',
        body.receiver_template ?? null,
        body.is_active ?? 1,
        body.priority ?? 'medium',
        body.cooldown_minutes ?? 60,
        now,
        now,
      ] as any[]
    );
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/reminders/run
 * 手动触发扫描（v0.4 接 node-cron 自动执行）
 */
router.post('/run', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const dryRun = (req.query.dryRun as string) === 'true';
    const stats = { scanned: 0, triggered: 0, skipped_cooldown: 0 };

    // 1. 加载所有启用规则
    const rulesResult = db.exec('SELECT * FROM reminder_rules WHERE is_active = 1');
    const rules = rowsToObjects(rulesResult);

    const triggeredReminders: Array<Record<string, unknown>> = [];

    for (const rule of rules) {
      // 简化：仅实现 RULE_TASK_OVERDUE
      if (rule.rule_code === 'RULE_TASK_OVERDUE') {
        const today = new Date().toISOString().slice(0, 10);
        const cooldownMin = (rule.cooldown_minutes as number) ?? 60;

        // 找出超期任务
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const overdueTasks = db.exec(
          `SELECT id, task_code, task_title, assignee_id, plan_date
           FROM farm_tasks
           WHERE plan_date < ?
             AND status IN ('pending', 'in_progress')`,
          [today] as any[]
        );

        for (const row of overdueTasks[0]?.values ?? []) {
          const [taskId, taskCode, taskTitle, assigneeId, planDate] = row as [string, string, string, string, string];
          stats.scanned++;

          // 检查冷却
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const recentCheck = db.exec(
            `SELECT id FROM reminders
             WHERE target_id = ? AND target_type = 'task'
               AND created_at > datetime('now', '-' || ? || ' minutes')`,
            [taskId, String(cooldownMin)] as any[]
          );
          if (recentCheck.length > 0 && recentCheck[0].values.length > 0) {
            stats.skipped_cooldown++;
            continue;
          }

          stats.triggered++;
          const reminderId = genId('reminder');
          triggeredReminders.push({
            id: reminderId,
            title: `任务超期：${taskTitle}`,
            rule_code: rule.rule_code,
            target_id: taskId,
            target_type: 'task',
            receiver_id: assigneeId,
            priority: rule.priority,
            payload: { taskCode, planDate },
          });

          if (!dryRun) {
            // 注意：reminders 表 schema 不固定，尝试最小字段集
            try {
              db.exec(
                `INSERT INTO reminders
                 (id, title, content, rule_code, target_id, target_type, receiver_id, priority, status, payload, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, datetime('now', 'localtime'))`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [
                  reminderId,
                  `任务超期：${taskTitle}`,
                  `任务 ${taskCode} 已超过计划日期 ${planDate}，请尽快处理。`,
                  rule.rule_code,
                  taskId,
                  'task',
                  assigneeId,
                  rule.priority,
                  JSON.stringify({ taskCode, planDate }),
                ] as any[]
              );
            } catch (e) {
              console.warn('insert reminder failed:', (e as Error).message);
            }
          }
        }
      }
    }

    if (!dryRun) {
      saveDatabase();
    }

    res.json({
      success: true,
      data: {
        dryRun,
        stats,
        sampleReminders: triggeredReminders.slice(0, 5),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/reminders/my?user_id=xxx
 */
router.get('/my', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, status } = req.query as Record<string, string | undefined>;
    if (!user_id) {
      res.status(400).json({ success: false, error: 'user_id 必填' });
      return;
    }
    const db = getDatabase();
    const whereClauses: string[] = ['receiver_id = ?'];
    const params: unknown[] = [user_id];
    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec(
      `SELECT * FROM reminders WHERE ${whereClauses.join(' AND ')} ORDER BY created_at DESC LIMIT 100`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params as any[] as any
    );
    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/reminders/:id/read
 */
router.post('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.exec("UPDATE reminders SET status = 'read' WHERE id = ?", [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
