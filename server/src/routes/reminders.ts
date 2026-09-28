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
          // 2026-09-28 修复：原 SQL 用不存在的列 created_at → /api/reminders/run 每次 500，
          // 调度器每 5 分钟静默失败（日志只打"提醒扫描返回异常"），提醒引擎整体失效。
          // 列名改为真实的 create_time；时间口径与表内一致（存的是 ISO-UTC 字符串，
          // 由 routes/reminder.ts 用 new Date().toISOString() 写入），阈值也在 JS 侧算成 ISO 串比较
          const cooldownThreshold = new Date(Date.now() - cooldownMin * 60 * 1000).toISOString();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const recentCheck = db.exec(
            `SELECT id FROM reminders
             WHERE target_id = ? AND target_type = 'task'
               AND create_time > ?`,
            [taskId, cooldownThreshold] as any[]
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
            // 2026-09-28 修复：原 INSERT 用的 title/content/rule_code/receiver_id/created_at
            // 五列在 reminders 表中都不存在（真实列见 schema.ts:3670）→ 每次触发都被 catch 吞成
            // "insert reminder failed"，提醒永远写不进库。现按真实列写入，并补齐 NOT NULL 的 task_id。
            try {
              db.exec(
                `INSERT INTO reminders
                 (id, task_id, task_code, task_title, operator_id, operator_name,
                  reminder_type, urgency, message, status, create_time, rule_id, target_id, target_type, priority, payload)
                 VALUES (?, ?, ?, ?, ?, ?, 'task_overdue', ?, ?, 'unread', ?, ?, ?, 'task', ?, ?)`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [
                  reminderId,
                  taskId,
                  taskCode,
                  `任务超期：${taskTitle}`,
                  assigneeId,
                  '', // 执行人姓名不在本查询范围内（接收方以 operator_id 为准）
                  ['high', 'low'].includes(String(rule.priority)) ? String(rule.priority) : 'normal',
                  `任务 ${taskCode} 已超过计划日期 ${planDate}，请尽快处理。`,
                  new Date().toISOString(), // 与表内既有数据同口径（ISO-UTC）
                  String(rule.id ?? ''),
                  taskId,
                  String(rule.priority ?? 'normal'),
                  JSON.stringify({ taskCode, planDate, ruleCode: rule.rule_code }),
                ] as any[]
              );
            } catch (e) {
              console.warn('insert reminder failed:', (e as Error).message);
            }
          }
        }
      }
    }

    // P0：仅在真正触发 reminder 时落盘。
    //   修复场景：reminders cron 每 5 分钟触发一次 reminders/run，原代码无条件 saveDatabase()
    //   → 后端同步写整个 9.8MB DB 文件到磁盘（fs.writeFileSync），阻塞 Node 事件循环 5-8 秒，
    //   → 期间所有 HTTP 请求（GET /api/farm-tasks 等）都不响应 → 前端 click 超时表现为"卡死"。
    //   改后：scanned=0 triggered=0 时不再 saveDatabase()，大幅减少写盘阻塞。
    if (!dryRun && triggeredReminders.length > 0) {
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
    // 2026-09-28 修复：receiver_id / created_at 均为不存在的列（真实列 operator_id / create_time）
    const whereClauses: string[] = ['operator_id = ?'];
    const params: unknown[] = [user_id];
    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec(
      `SELECT * FROM reminders WHERE ${whereClauses.join(' AND ')} ORDER BY create_time DESC LIMIT 100`,
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
