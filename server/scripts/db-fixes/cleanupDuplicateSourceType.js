/**
 * 清理重复的 source_type 字典数据
 * 执行方式：node server/src/db/cleanupDuplicateSourceType.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const dbPath = path.join(__dirname, '../../data/yuanxingtu.db');
  console.log('数据库路径:', dbPath);

  const SQL = await initSqlJs();

  // 加载数据库
  let db;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    console.error('数据库文件不存在!');
    process.exit(1);
  }

  // 1. 查看当前的 source_type 数据
  console.log('\n=== 清理前的 source_type 数据 ===');
  let results = db.exec("SELECT id, dict_code, dict_label FROM dictionaries WHERE category_code = 'source_type' ORDER BY id");
  if (results.length > 0) {
    console.log(`共 ${results[0].values.length} 条记录:`);
    results[0].values.forEach(row => {
      console.log(`  ${row[0]}: [${row[1]}] ${row[2]}`);
    });
  }

  // 2. 删除重复的旧记录 (D130-D137)
  console.log('\n=== 删除重复的旧记录 (D130-D137) ===');
  db.run("DELETE FROM dictionaries WHERE id IN ('D130', 'D131', 'D132', 'D133', 'D134', 'D135', 'D136', 'D137')");
  console.log('已删除 D130-D137 记录');

  // 3. 验证清理结果
  console.log('\n=== 清理后的 source_type 数据 ===');
  results = db.exec("SELECT id, dict_code, dict_label FROM dictionaries WHERE category_code = 'source_type' ORDER BY id");
  if (results.length > 0) {
    console.log(`共 ${results[0].values.length} 条记录:`);
    results[0].values.forEach(row => {
      console.log(`  ${row[0]}: [${row[1]}] ${row[2]}`);
    });
  }

  // 4. 保存数据库
  console.log('\n=== 保存数据库 ===');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  console.log('数据库已保存');
  console.log('\n清理完成!');
}

main().catch(err => {
  console.error('清理失败:', err);
  process.exit(1);
});
