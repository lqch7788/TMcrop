/**
 * 温室名称修复脚本
 * 功能：修复 harvest_records 和 plantings 表中的温室名称不统一问题
 * 将非标准名称（1号大棚、2号大棚、3号大棚）映射到标准温室名称
 */

async function fixGreenhouseNames() {
  const initSqlJs = (await import('sql.js')).default;
  const fs = await import('fs');

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/yuanxingtu.db'));

  console.log('=== 温室名称修复脚本 ===\n');

  // 标准温室名称（来自 greenhouses 表）
  // 玻璃温室A区、玻璃温室B区、玻璃温室C区
  // 日光温室1-4号、塑料大棚1-2号、露天种植区

  // 温室名称映射表：非标准名称 -> 标准名称
  const greenhouseNameMap: Record<string, string> = {
    '1号大棚': '塑料大棚1号',  // 映射到塑料大棚1号
    '2号大棚': '塑料大棚2号',  // 映射到塑料大棚2号
    '3号大棚': '日光温室3号',  // 映射到日光温室3号
  };

  // 统计修复数量
  let plantingsFixedCount = 0;
  let harvestRecordsFixedCount = 0;

  // 修复 plantings 表
  console.log('--- 修复 plantings 表 ---');
  for (const [oldName, newName] of Object.entries(greenhouseNameMap)) {
    // 检查需要修复的记录数
    const checkStmt = db.prepare(
      'SELECT COUNT(*) as cnt FROM plantings WHERE greenhouse_name = ?'
    );
    checkStmt.bind([oldName]);
    checkStmt.step();
    const count = checkStmt.getAsObject().cnt as number;
    checkStmt.free();

    if (count > 0) {
      console.log(`  "${oldName}" -> "${newName}": ${count} 条记录`);

      // 执行更新
      db.run('UPDATE plantings SET greenhouse_name = ? WHERE greenhouse_name = ?', [
        newName,
        oldName,
      ]);
      plantingsFixedCount += count;
    }
  }

  // 修复 harvest_records 表
  console.log('\n--- 修复 harvest_records 表 ---');
  for (const [oldName, newName] of Object.entries(greenhouseNameMap)) {
    // 检查需要修复的记录数
    const checkStmt = db.prepare(
      'SELECT COUNT(*) as cnt FROM harvest_records WHERE greenhouse_name = ?'
    );
    checkStmt.bind([oldName]);
    checkStmt.step();
    const count = checkStmt.getAsObject().cnt as number;
    checkStmt.free();

    if (count > 0) {
      console.log(`  "${oldName}" -> "${newName}": ${count} 条记录`);

      // 执行更新
      db.run(
        'UPDATE harvest_records SET greenhouse_name = ? WHERE greenhouse_name = ?',
        [newName, oldName]
      );
      harvestRecordsFixedCount += count;
    }
  }

  // 保存数据库
  fs.writeFileSync('data/yuanxingtu.db', db.export());

  // 输出修复总结
  console.log('\n=== 修复完成 ===');
  console.log(`plantings 表修复: ${plantingsFixedCount} 条`);
  console.log(`harvest_records 表修复: ${harvestRecordsFixedCount} 条`);
  console.log(`总计修复: ${plantingsFixedCount + harvestRecordsFixedCount} 条`);

  db.close();
}

fixGreenhouseNames().catch(console.error);
