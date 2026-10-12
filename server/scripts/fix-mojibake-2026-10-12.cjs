/**
 * 修复演示数据 U+FFFD 乱码（IS-NEW-149）
 * 用法：cd server && node scripts/fix-mojibake-2026-10-12.cjs
 *
 * 策略：U+FFFD 全部替换为中文占位"[乱码已清理]"
 * 影响表：material_requests / material_returns / announcements / audit_logs / inventory_transaction
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
const PLACEHOLDER = '[乱码已清理-2026-10-12]';
const FFFD = String.fromCharCode(0xFFFD);
const TABLES = ['material_requests', 'material_returns', 'announcements', 'audit_logs', 'inventory_transaction'];

function main() {
  if (!fs.existsSync(DB)) { console.error('❌ DB 不存在:', DB); process.exit(1); }

  // 先备份
  const backupPath = DB + '.pre-fix-' + Date.now();
  fs.copyFileSync(DB, backupPath);
  console.log('✅ 备份到:', backupPath);

  const db = new Database(DB);
  let totalAffected = 0;
  const summary = {};

  for (const t of TABLES) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${t})`).all();
      const textCols = cols.filter(c => /TEXT|CHAR/i.test(c.type)).map(c => c.name);
      let tableCount = 0;
      for (const col of textCols) {
        const stmt = db.prepare(`UPDATE ${t} SET ${col} = REPLACE(${col}, ?, ?) WHERE ${col} LIKE ?`);
        const info = stmt.run(FFFD, PLACEHOLDER, '%' + FFFD + '%');
        tableCount += info.changes;
      }
      if (tableCount > 0) {
        summary[t] = tableCount;
        totalAffected += tableCount;
        console.log(`  ${t}: 修复 ${tableCount} 处`);
      }
    } catch (e) {
      console.log(`  ${t}: 跳过 (${e.message})`);
    }
  }

  // 验证
  console.log('\n=== 验证：再次扫描 ===');
  for (const t of TABLES) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all();
    const textCols = cols.filter(c => /TEXT|CHAR/i.test(c.type)).map(c => c.name);
    let remaining = 0;
    for (const col of textCols) {
      try {
        const rs = db.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${col} LIKE ?`).get('%' + FFFD + '%');
        remaining += rs.n;
      } catch (e) {}
    }
    if (remaining) console.log(`  ${t}: ⚠️ 仍 ${remaining} 处含 U+FFFD`);
  }

  console.log(`\n总计修复: ${totalAffected} 处`);
  console.log(`备份文件: ${backupPath}`);
  console.log(`DB 文件: ${DB}`);
  console.log('\n如需回滚:');
  console.log(`  cp "${backupPath}" "${DB}"`);

  db.close();
}

main();
