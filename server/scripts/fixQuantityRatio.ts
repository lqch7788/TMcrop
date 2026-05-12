async function fixData() {
  const initSqlJs = (await import('sql.js')).default;
  const fs = await import('fs');

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/yuanxingtu.db'));

  console.log('=== 修复种源数据 - 设计不同的完成比例 ===\n');

  // 获取所有记录
  const records: any[] = [];
  const stmt = db.prepare('SELECT id, source_code, quantity, remaining_quantity FROM seed_sources');
  while (stmt.step()) {
    records.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`共 ${records.length} 条记录\n`);

  // 设计不同的完成比例 (0%, 10%, 20%, ... 100%)
  const ratios = [
    1.0,    // 100% - 刚入库
    0.95,   // 95%
    0.85,   // 85%
    0.75,   // 75%
    0.65,   // 65%
    0.55,   // 55%
    0.45,   // 45%
    0.35,   // 35%
    0.25,   // 25%
    0.15,   // 15%
    0.08,   // 8%
    0.03,   // 3%
    0.0,    // 0% - 全部用完
  ];

  let updated = 0;
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const ratio = ratios[i % ratios.length]; // 循环使用比例
    const quantity = Math.floor(Math.random() * 30000) + 5000; // 5000-35000
    const remaining = Math.floor(quantity * ratio);

    // 更新数据
    db.run('UPDATE seed_sources SET quantity = ?, remaining_quantity = ? WHERE id = ?', [quantity, remaining, record.id]);
    updated++;

    console.log(`${record.source_code}: 入库=${quantity.toLocaleString()}, 剩余=${remaining.toLocaleString()}, 比例=${(ratio * 100).toFixed(0)}%`);
  }

  console.log(`\n共更新 ${updated} 条记录`);

  // 保存
  fs.writeFileSync('data/yuanxingtu.db', db.export());
  console.log('数据库已保存');

  db.close();
}

fixData().catch(console.error);
