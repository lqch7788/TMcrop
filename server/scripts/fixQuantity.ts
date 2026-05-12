async function fixData() {
  const initSqlJs = (await import('sql.js')).default;
  const fs = await import('fs');

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/yuanxingtu.db'));

  console.log('=== 修复种源数据 quantity 字段 ===\n');

  // 查看修复前
  console.log('修复前:');
  const beforeStmt = db.prepare('SELECT source_code, quantity, remaining_quantity FROM seed_sources LIMIT 5');
  while (beforeStmt.step()) {
    const r = beforeStmt.getAsObject();
    console.log(`  ${r.source_code}: quantity=${r.quantity}, remaining_quantity=${r.remaining_quantity}`);
  }
  beforeStmt.free();

  // 执行修复: 将 quantity = 0 的记录，用 remaining_quantity 填充
  db.run('UPDATE seed_sources SET quantity = remaining_quantity WHERE quantity = 0 AND remaining_quantity > 0');
  console.log(`\n已执行更新`);

  // 查看修复后
  console.log('\n修复后:');
  const afterStmt = db.prepare('SELECT source_code, quantity, remaining_quantity FROM seed_sources LIMIT 5');
  while (afterStmt.step()) {
    const r = afterStmt.getAsObject();
    console.log(`  ${r.source_code}: quantity=${r.quantity}, remaining_quantity=${r.remaining_quantity}`);
  }
  afterStmt.free();

  // 保存
  fs.writeFileSync('data/yuanxingtu.db', db.export());
  console.log('\n数据库已保存');

  db.close();
}

fixData().catch(console.error);
