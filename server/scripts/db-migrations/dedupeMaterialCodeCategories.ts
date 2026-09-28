/**
 * 2026-09-28 material_code_categories 重复行清理
 *
 * 背景：
 *   前端编码规则 store 里有一段 localStorage 时代的"本地 → API 增量同步"逻辑
 *   （判定条件：本地内存分类 ≠ 硬编码默认值），服务端 POST 又无自然键唯一约束
 *   （id = `MCC${Date.now()}`）→ 每次进入编码规则页都会把 71 条分类整份重写一遍。
 *   该逻辑此前被"URL 双前缀 404"掩盖，2026-09-28 修好 URL 后立刻显形：
 *   rule_type='supplier' 的大类从 22 行涨到 1327 行、中类从 120 行涨到 7235 行。
 *   （前端同步逻辑已删除，此处仅清理存量。）
 *
 * 策略：
 *   1. 对 (rule_type, level, code, IFNULL(parent_code,'')) 相同的行，保留 id 最小的一条（与后端 GET 的去重口径一致），
 *      其余物理删除；先备份被删行到 JSON 供核对。
 *   2. 幂等：重复运行不会删除任何行（已无重复）。
 *   3. fail loud：打印每个 rule_type/level 的处理条数与删除条数。
 *
 * 运行（必须先停后端，避免运行时内存 DB 覆盖脚本写入）：
 *   cd server && npm run migrate:dedupe-code-categories
 * 预演：
 *   cd server && npm run migrate:dedupe-code-categories:dry-run
 */

import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`[dedupeMaterialCodeCategories] DB: ${DB_PATH}${DRY_RUN ? '（dry-run：不写盘）' : ''}`);
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const groups = db.exec(`
    SELECT rule_type, level, code, IFNULL(parent_code, ''), COUNT(*) AS c
    FROM material_code_categories
    GROUP BY rule_type, level, code, IFNULL(parent_code, '')
    HAVING c > 1
  `);

  if (groups.length === 0) {
    console.log('无重复行，无需处理。');
    return;
  }

  const toDelete: string[] = [];
  const stat: Record<string, number> = {};
  for (const row of groups[0].values) {
    const [ruleType, level, code, parentCode, count] = row as [string, string, string, string, number];
    // 保留 id 最小的一条（与 GET 去重口径一致）
    const keepRows = db.exec(
      `SELECT id FROM material_code_categories
       WHERE rule_type = ? AND level = ? AND code = ? AND IFNULL(parent_code, '') = ?
       ORDER BY id ASC`,
      [ruleType, level, code, parentCode]
    );
    const ids = (keepRows[0]?.values ?? []).map((v) => String(v[0]));
    const remove = ids.slice(1);
    toDelete.push(...remove);
    const key = `${ruleType}/${level}`;
    stat[key] = (stat[key] || 0) + remove.length;
    if (remove.length !== count - 1) {
      console.warn(`⚠ ${key} ${code}/${parentCode} 计数 ${count} 与实际 ${ids.length} 不一致`);
    }
  }

  console.log(`重复组数: ${groups[0].values.length}，待删除行: ${toDelete.length}`);
  Object.entries(stat).sort().forEach(([k, n]) => console.log(`   ${k}: 删除 ${n} 行`));

  if (DRY_RUN) {
    console.log('dry-run 结束，未写盘。');
    return;
  }

  // 备份被删行（审计可追溯）
  const backupPath = path.join(__dirname, '../../data/material_code_categories.dedupe-backup.json');
  const backup: unknown[] = [];
  for (const id of toDelete) {
    const r = db.exec('SELECT * FROM material_code_categories WHERE id = ?', [id]);
    if (r.length > 0 && r[0].values.length > 0) {
      const obj: Record<string, unknown> = {};
      r[0].columns.forEach((c, i) => { obj[c] = r[0].values[0][i]; });
      backup.push(obj);
    }
  }
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`已备份 ${backup.length} 行到 ${backupPath}`);

  db.run('BEGIN');
  try {
    const stmt = db.prepare('DELETE FROM material_code_categories WHERE id = ?');
    for (const id of toDelete) {
      stmt.run([id]);
    }
    stmt.free();
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('✅ 清理完成并已写盘');

  // 复核
  const after = db.exec(`
    SELECT rule_type, level, COUNT(*) FROM material_code_categories GROUP BY rule_type, level ORDER BY rule_type, level
  `);
  console.log('清理后行数：');
  after[0]?.values.forEach((v) => console.log(`   ${String(v[0])}/${String(v[1])}: ${String(v[2])} 行`));
}

main().catch((e) => {
  console.error('清理失败:', e);
  process.exit(1);
});
