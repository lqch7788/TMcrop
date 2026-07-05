/**
 * 一次性脚本：给 fertilizer_records 加 seedling_id / seedling_code 列
 * 2026-07-05: fixMissingSchema 被启动白名单禁用，需要手动运行
 */
const initSqlJs = require('sql.js');
const fs = require('fs');

const DB_PATH = 'D:/TMcrop/yuanxingtu/V1.1/server/data/yuanxingtu.db';

async function main() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const cols = db.exec('PRAGMA table_info(fertilizer_records)');
  const colNames = cols[0]?.values?.map((v) => v[1]) || [];
  console.log('现有列:', colNames.join(', '));

  const toAdd = [
    { name: 'seedling_id', sql: 'ALTER TABLE fertilizer_records ADD COLUMN seedling_id TEXT' },
    { name: 'seedling_code', sql: 'ALTER TABLE fertilizer_records ADD COLUMN seedling_code TEXT' },
  ];

  for (const { name, sql } of toAdd) {
    if (colNames.includes(name)) {
      console.log(`✓ ${name} 列已存在，跳过`);
    } else {
      try {
        db.run(sql);
        console.log(`✓ 已添加 ${name} 列`);
      } catch (e) {
        console.error(`✗ 添加 ${name} 失败:`, e.message);
      }
    }
  }

  const newBuffer = db.export();
  fs.writeFileSync(DB_PATH, newBuffer);
  console.log('\n✓ DB 已写盘');

  const newCols = db.exec('PRAGMA table_info(fertilizer_records)');
  const newColNames = newCols[0]?.values?.map((v) => v[1]) || [];
  console.log('新列:', newColNames.join(', '));
  console.log('seedling_id 列已存在:', newColNames.includes('seedling_id'));
  console.log('seedling_code 列已存在:', newColNames.includes('seedling_code'));
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(1);
});