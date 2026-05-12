async function fixOrderType() {
  const initSqlJs = (await import('sql.js')).default;
  const fs = await import('fs');

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/yuanxingtu.db'));

  console.log('=== 修改订单 DD20260504100004 的订单类型 ===\n');

  // 先查看当前数据
  const stmt = db.prepare("SELECT order_code, order_name, order_type FROM crop_orders WHERE order_code = 'DD20260504100004'");
  if (stmt.step()) {
    const r = stmt.getAsObject();
    console.log('修改前:', r.order_code, '-', r.order_name, '-', r.order_type);
  }
  stmt.free();

  // 执行更新
  db.run("UPDATE crop_orders SET order_type = 'seedling' WHERE order_code = 'DD20260504100004'");
  console.log('\n已将 order_type 从 seed 改为 seedling');

  // 查看修改后数据
  const stmt2 = db.prepare("SELECT order_code, order_name, order_type FROM crop_orders WHERE order_code = 'DD20260504100004'");
  if (stmt2.step()) {
    const r = stmt2.getAsObject();
    console.log('修改后:', r.order_code, '-', r.order_name, '-', r.order_type);
  }
  stmt2.free();

  // 保存
  fs.writeFileSync('data/yuanxingtu.db', db.export());
  console.log('\n数据库已保存');

  db.close();
}

fixOrderType().catch(console.error);
