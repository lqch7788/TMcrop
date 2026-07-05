/** 为 pesticide_records 添加关联业务列 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'server', 'data', 'yuanxingtu.db');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  const cols = ['planting_id', 'planting_code', 'seedling_id', 'seedling_code'];
  for (const col of cols) {
    try {
      db.run(`ALTER TABLE pesticide_records ADD COLUMN ${col} TEXT`);
      console.log(`✓ 添加 ${col}`);
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log(`- ${col} 已存在，跳过`);
      } else {
        console.log(`✗ ${col}: ${e.message}`);
      }
    }
  }

  const data = db.export();
  const bufOut = Buffer.from(data);
  fs.writeFileSync(dbPath, bufOut);
  console.log('✓ DB 已保存');
  db.close();
})();
