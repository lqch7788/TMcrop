/**
 * v0.3 P0-M：多作物 SOP 模板预置（用 better-sqlite3 直接操作，避免 sql.js 内存不同步）
 *
 * 用途：创建 SOP 表 + 批量插入葡萄 + 叶菜 + 茄果 3 大类 SOP 模板
 *
 * 用法：
 *   npx tsx server/src/db/seedSopMultiCrop.ts
 *
 * 原则：
 *   - 仅 CREATE TABLE IF NOT EXISTS + INSERT，无 DROP
 *   - 使用更好的去重（sop_code UNIQUE）
 *   - 共 60 SOP：葡萄 20 / 叶菜 20 / 茄果 20
 */

// @ts-nocheck
/* eslint-disable */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const BACKUP_PATH = `${DB_PATH}.backup-pre-sop-seed-${Date.now()}`;

const SOP_TEMPLATES = {
  grape: [
    { code: 'SOP-G-001', name: '葡萄定植（春栽）', task_type: 'planting', stage: '定植期', desc: '葡萄苗定植标准流程，含挖穴、基肥、栽植、浇水' },
    { code: 'SOP-G-002', name: '葡萄定植（秋栽）', task_type: 'planting', stage: '定植期', desc: '秋季定植，注意防寒越冬' },
    { code: 'SOP-G-003', name: '葡萄抹芽定梢', task_type: 'pruning', stage: '萌芽期', desc: '抹除多余芽，选留结果枝' },
    { code: 'SOP-G-004', name: '葡萄绑蔓', task_type: 'pruning', stage: '新梢生长期', desc: '新梢绑缚上架' },
    { code: 'SOP-G-005', name: '葡萄摘心', task_type: 'pruning', stage: '新梢生长期', desc: '摘除顶端生长点，促花芽分化' },
    { code: 'SOP-G-006', name: '葡萄疏花', task_type: 'pruning', stage: '花期', desc: '疏除多余花序，集中养分' },
    { code: 'SOP-G-007', name: '葡萄疏果', task_type: 'pruning', stage: '果期', desc: '疏除小果、畸形果' },
    { code: 'SOP-G-008', name: '葡萄套袋', task_type: 'other', stage: '果期', desc: '果实套袋防病虫' },
    { code: 'SOP-G-009', name: '葡萄基肥施用', task_type: 'fertilization', stage: '休眠期', desc: '秋施基肥，以有机肥为主' },
    { code: 'SOP-G-010', name: '葡萄萌芽肥', task_type: 'fertilization', stage: '萌芽期', desc: '萌芽前追施氮肥' },
    { code: 'SOP-G-011', name: '葡萄膨果肥', task_type: 'fertilization', stage: '果期', desc: '果实膨大期追施钾肥' },
    { code: 'SOP-G-012', name: '葡萄采收肥', task_type: 'fertilization', stage: '果期', desc: '采收后补充树体营养' },
    { code: 'SOP-G-013', name: '葡萄霜霉病防治', task_type: 'pest_control', stage: '果期', desc: '使用波尔多液或烯酰吗啉' },
    { code: 'SOP-G-014', name: '葡萄白粉病防治', task_type: 'pest_control', stage: '新梢生长期', desc: '使用三唑类杀菌剂' },
    { code: 'SOP-G-015', name: '葡萄蚜虫防治', task_type: 'pest_control', stage: '萌芽期', desc: '使用吡虫啉等内吸性杀虫剂' },
    { code: 'SOP-G-016', name: '葡萄采收', task_type: 'harvest', stage: '果期', desc: '分批采收，糖度达标' },
    { code: 'SOP-G-017', name: '葡萄冬季修剪', task_type: 'pruning', stage: '休眠期', desc: '主蔓更新，结果母枝选留' },
    { code: 'SOP-G-018', name: '葡萄埋土防寒', task_type: 'farm_repair', stage: '休眠期', desc: '北方产区冬季埋土' },
    { code: 'SOP-G-019', name: '葡萄出土上架', task_type: 'farm_repair', stage: '萌芽期', desc: '春季撤土上架' },
    { code: 'SOP-G-020', name: '葡萄除草', task_type: 'weeding', stage: '全期', desc: '人工或机械除草' },
  ],
  leaf: [
    { code: 'SOP-L-001', name: '叶菜播种（直播）', task_type: 'planting', stage: '播种期', desc: '白菜/菠菜等直接播种' },
    { code: 'SOP-L-002', name: '叶菜育苗', task_type: 'planting', stage: '育苗期', desc: '生菜/油麦菜等穴盘育苗' },
    { code: 'SOP-L-003', name: '叶菜移栽', task_type: 'planting', stage: '移栽期', desc: '秧苗定植到大田' },
    { code: 'SOP-L-004', name: '叶菜间苗', task_type: 'pruning', stage: '苗期', desc: '疏除过密幼苗' },
    { code: 'SOP-L-005', name: '叶菜定苗', task_type: 'pruning', stage: '苗期', desc: '按品种要求留单株' },
    { code: 'SOP-L-006', name: '叶菜基肥', task_type: 'fertilization', stage: '播种前', desc: '施足有机肥' },
    { code: 'SOP-L-007', name: '叶菜追肥', task_type: 'fertilization', stage: '生长期', desc: '速效氮肥兑水浇施' },
    { code: 'SOP-L-008', name: '叶菜灌溉', task_type: 'irrigation', stage: '全期', desc: '保持土壤湿润' },
    { code: 'SOP-L-009', name: '白菜软腐病', task_type: 'pest_control', stage: '生长期', desc: '使用农用链霉素' },
    { code: 'SOP-L-010', name: '白菜霜霉病', task_type: 'pest_control', stage: '生长期', desc: '使用甲霜灵' },
    { code: 'SOP-L-011', name: '蚜虫防治', task_type: 'pest_control', stage: '全期', desc: '吡虫啉或苦参碱' },
    { code: 'SOP-L-012', name: '小菜蛾防治', task_type: 'pest_control', stage: '全期', desc: 'BT 生物农药' },
    { code: 'SOP-L-013', name: '菠菜抽薹防治', task_type: 'other', stage: '生长期', desc: '控温控水' },
    { code: 'SOP-L-014', name: '生菜采收', task_type: 'harvest', stage: '成熟期', desc: '整株或剥叶采收' },
    { code: 'SOP-L-015', name: '白菜采收', task_type: 'harvest', stage: '成熟期', desc: '整株采收' },
    { code: 'SOP-L-016', name: '菠菜采收', task_type: 'harvest', stage: '成熟期', desc: '整株带根采收' },
    { code: 'SOP-L-017', name: '中耕除草', task_type: 'weeding', stage: '全期', desc: '浅锄避免伤根' },
    { code: 'SOP-L-018', name: '病虫害综合防治', task_type: 'pest_control', stage: '全期', desc: '预防为主，综合治理' },
    { code: 'SOP-L-019', name: '采后处理', task_type: 'other', stage: '采收后', desc: '清洗、分级、包装' },
    { code: 'SOP-L-020', name: '轮作规划', task_type: 'farm_repair', stage: '季节前', desc: '避免连作障碍' },
  ],
  solanaceous: [
    { code: 'SOP-S-001', name: '番茄育苗', task_type: 'planting', stage: '育苗期', desc: '穴盘育苗，注意温湿度' },
    { code: 'SOP-S-002', name: '番茄移栽', task_type: 'planting', stage: '移栽期', desc: '4-5 片真叶定植' },
    { code: 'SOP-S-003', name: '番茄整枝', task_type: 'pruning', stage: '生长期', desc: '单杆整枝或双杆整枝' },
    { code: 'SOP-S-004', name: '番茄打杈', task_type: 'pruning', stage: '生长期', desc: '去除腋芽，减少养分消耗' },
    { code: 'SOP-S-005', name: '番茄摘心', task_type: 'pruning', stage: '结果后期', desc: '顶部留 2 片叶摘心' },
    { code: 'SOP-S-006', name: '番茄疏果', task_type: 'pruning', stage: '果期', desc: '每穗留 4-5 个果' },
    { code: 'SOP-S-007', name: '番茄基肥', task_type: 'fertilization', stage: '定植前', desc: '有机肥 + 复合肥' },
    { code: 'SOP-S-008', name: '番茄追肥', task_type: 'fertilization', stage: '果期', desc: '钾肥为主，配合氮肥' },
    { code: 'SOP-S-009', name: '番茄灌溉', task_type: 'irrigation', stage: '全期', desc: '滴灌为主，保持土壤湿润' },
    { code: 'SOP-S-010', name: '番茄晚疫病', task_type: 'pest_control', stage: '果期', desc: '使用烯酰吗啉或霜脲氰' },
    { code: 'SOP-S-011', name: '番茄早疫病', task_type: 'pest_control', stage: '生长期', desc: '使用代森锰锌' },
    { code: 'SOP-S-012', name: '番茄灰霉病', task_type: 'pest_control', stage: '果期', desc: '使用腐霉利或异菌脲' },
    { code: 'SOP-S-013', name: '番茄青枯病', task_type: 'pest_control', stage: '全期', desc: '轮作 + 抗病品种' },
    { code: 'SOP-S-014', name: '番茄病毒病', task_type: 'pest_control', stage: '全期', desc: '防治蚜虫 + 抗病品种' },
    { code: 'SOP-S-015', name: '白粉虱防治', task_type: 'pest_control', stage: '全期', desc: '黄板诱杀 + 吡虫啉' },
    { code: 'SOP-S-016', name: '番茄采收', task_type: 'harvest', stage: '成熟期', desc: '转色期分批采收' },
    { code: 'SOP-S-017', name: '茄子整枝', task_type: 'pruning', stage: '生长期', desc: '双杆整枝' },
    { code: 'SOP-S-018', name: '辣椒育苗', task_type: 'planting', stage: '育苗期', desc: '温床育苗' },
    { code: 'SOP-S-019', name: '茄子采收', task_type: 'harvest', stage: '成熟期', desc: '门茄早收，防坠秧' },
    { code: 'SOP-S-020', name: '辣椒采收', task_type: 'harvest', stage: '成熟期', desc: '青熟或红熟分批采收' },
  ],
};

function ensureSopTables(db) {
  // 1. sop_library 主表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sop_library (
      id TEXT PRIMARY KEY,
      sop_code TEXT UNIQUE NOT NULL,
      sop_name TEXT NOT NULL,
      crop_code TEXT,
      crop_variety TEXT,
      growth_stage TEXT,
      task_type TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      effective_date TEXT,
      expiry_date TEXT,
      status TEXT DEFAULT 'active',
      description TEXT,
      warning_notes TEXT,
      creator_id TEXT,
      creator_name TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sop_library_crop ON sop_library(crop_code)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sop_library_task_type ON sop_library(task_type)`);

  // 2. sop_steps
  db.exec(`
    CREATE TABLE IF NOT EXISTS sop_steps (
      id TEXT PRIMARY KEY,
      sop_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      step_title TEXT NOT NULL,
      step_content TEXT,
      step_images TEXT,
      step_video_url TEXT,
      pesticide_code TEXT,
      dosage TEXT,
      dilution_ratio TEXT,
      estimated_minutes INTEGER,
      safety_notes TEXT,
      FOREIGN KEY (sop_id) REFERENCES sop_library(id) ON DELETE CASCADE
    )
  `);

  // 3. sop_task_bindings
  db.exec(`
    CREATE TABLE IF NOT EXISTS sop_task_bindings (
      id TEXT PRIMARY KEY,
      sop_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      binding_type TEXT DEFAULT 'recommended',
      bound_at TEXT,
      bound_by TEXT,
      UNIQUE(sop_id, task_id),
      FOREIGN KEY (sop_id) REFERENCES sop_library(id) ON DELETE CASCADE
    )
  `);
}

function seedSops() {
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log(`📦 已备份: ${BACKUP_PATH}`);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  console.log('✅ 已打开 better-sqlite3 + WAL');

  ensureSopTables(db);
  console.log('✅ SOP 3 张表已确保存在');

  const now = new Date().toISOString();
  const cropMap: Record<string, string> = {
    grape: 'GRAPE',
    leaf: 'LEAF',
    solanaceous: 'SOLANACEOUS',
  };

  const insert = db.prepare(`
    INSERT INTO sop_library
    (id, sop_code, sop_name, crop_code, crop_variety, growth_stage, task_type,
     version, effective_date, status, description, warning_notes,
     creator_id, creator_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const exists = db.prepare('SELECT COUNT(*) AS cnt FROM sop_library WHERE sop_code = ?');

  let inserted = 0;
  let skipped = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const [cropKey, templates] of Object.entries(SOP_TEMPLATES)) {
      const cropCode = cropMap[cropKey];
      for (const tpl of templates) {
        const row = exists.get(tpl.code);
        if (row.cnt > 0) {
          skipped++;
          continue;
        }
        const id = `sop_seed_${tpl.code.toLowerCase().replace(/-/g, '_')}`;
        insert.run(
          id,
          tpl.code,
          tpl.name,
          cropCode,
          null,
          tpl.stage,
          tpl.task_type,
          1,
          now.slice(0, 10),
          'active',
          tpl.desc,
          null,
          'system_seed',
          '系统预置',
          now,
          now
        );
        inserted++;
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  // 验证
  const total = db.prepare('SELECT COUNT(*) AS cnt FROM sop_library').get();
  const byCrop = db.prepare(`
    SELECT crop_code, COUNT(*) AS cnt
    FROM sop_library
    GROUP BY crop_code
    ORDER BY crop_code
  `).all();

  db.close();
  console.log(`\n✅ SOP 预置完成：`);
  console.log(`   - 新增：${inserted} 个`);
  console.log(`   - 跳过（已存在）：${skipped} 个`);
  console.log(`   - 数据库总数：${total.cnt}`);
  console.log(`\n   按作物统计：`);
  for (const r of byCrop) {
    console.log(`     ${r.crop_code ?? '(空)'}: ${r.cnt}`);
  }
}

try {
  seedSops();
} catch (e) {
  console.error('❌ 预置失败:', e);
  process.exit(1);
}
