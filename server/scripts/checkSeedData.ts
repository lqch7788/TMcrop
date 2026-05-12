async function checkData() {
  const initSqlJs = (await import('sql.js')).default;
  const fs = await import('fs');

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/yuanxingtu.db'));

  // 查看表结构
  console.log('=== seed_sources 表结构 ===');
  const schemaStmt = db.prepare("PRAGMA table_info(seed_sources)");
  while (schemaStmt.step()) {
    const col = schemaStmt.getAsObject();
    console.log(`  ${col.name}: ${col.type}`);
  }
  schemaStmt.free();

  // 查看数据
  console.log('\n=== 数据样例 ===');
  const stmt = db.prepare('SELECT * FROM seed_sources LIMIT 2');
  while (stmt.step()) {
    const r = stmt.getAsObject();
    console.log('source_code:', r.source_code);
    console.log('  quantity:', r.quantity);
    console.log('  initialCount:', r.initialCount);
    console.log('  availableCount:', r.availableCount);
    console.log('  remaining_quantity:', r.remaining_quantity);
  }
  stmt.free();
  db.close();
}

checkData().catch(console.error);
