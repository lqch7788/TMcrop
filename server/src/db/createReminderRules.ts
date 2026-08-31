// @ts-nocheck
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const BACKUP_PATH = `${DB_PATH}.backup-pre-reminder-rules-${Date.now()}`;

if (fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH, BACKUP_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// 1. reminder_rules 表（规则定义）
db.exec(`
  CREATE TABLE IF NOT EXISTS reminder_rules (
    id TEXT PRIMARY KEY,
    rule_code TEXT UNIQUE NOT NULL,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    trigger_condition TEXT,
    notification_channels TEXT,
    receiver_template TEXT,
    is_active INTEGER DEFAULT 1,
    priority TEXT DEFAULT 'medium',
    cooldown_minutes INTEGER DEFAULT 60,
    created_at TEXT,
    updated_at TEXT
  )
`);

// 2. 检查现有 reminders 表字段是否够用
const reminderCols = db.prepare('PRAGMA table_info(reminders)').all();
const hasRuleId = reminderCols.some(c => c.name === 'rule_id');
if (!hasRuleId) {
  db.exec('ALTER TABLE reminders ADD COLUMN rule_id INTEGER');
  db.exec('ALTER TABLE reminders ADD COLUMN target_id TEXT');
  db.exec('ALTER TABLE reminders ADD COLUMN target_type TEXT');
  db.exec('ALTER TABLE reminders ADD COLUMN priority TEXT DEFAULT \'medium\'');
  db.exec('ALTER TABLE reminders ADD COLUMN payload TEXT');
}

// 3. 插入首条内置规则（任务超期）
const exists = db.prepare('SELECT COUNT(*) AS cnt FROM reminder_rules WHERE rule_code = ?').get('RULE_TASK_OVERDUE');
if (exists.cnt === 0) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reminder_rules
    (id, rule_code, rule_name, rule_type, trigger_condition, notification_channels,
     receiver_template, is_active, priority, cooldown_minutes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `).run(
    'rr_task_overdue',
    'RULE_TASK_OVERDUE',
    '任务超期提醒',
    'overdue',
    JSON.stringify({ field: 'plan_date', operator: '<', value: 'today', status: 'in_progress' }),
    JSON.stringify(['inbox']),
    'assignee_id',
    'high',
    60,
    now,
    now
  );
  console.log('  ✓ 内置规则 RULE_TASK_OVERDUE');
}

db.close();
console.log('✅ reminder_rules 表 + 内置规则就绪');
