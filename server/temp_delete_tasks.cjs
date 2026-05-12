const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/yuanxingtu.db');
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  const taskIds = ['TK001', 'TK002', 'T001', 'T002'];
  const placeholders = taskIds.map(() => '?').join(',');

  // 先查看记录
  console.log('=== farm_tasks 表中要删除的记录 ===');
  const farmTasks = db.exec(`SELECT id, task_code, task_title FROM farm_tasks WHERE id IN (${placeholders})`, taskIds);
  if (farmTasks.length > 0) {
    console.table(farmTasks[0].values.map(row => ({
      id: row[0],
      task_code: row[1],
      task_title: row[2]
    })));
  } else {
    console.log('无记录');
  }

  console.log('\n=== temp_tasks 表中要删除的记录 ===');
  const tempTasks = db.exec(`SELECT id, task_code, task_title FROM temp_tasks WHERE id IN (${placeholders})`, taskIds);
  if (tempTasks.length > 0) {
    console.table(tempTasks[0].values.map(row => ({
      id: row[0],
      task_code: row[1],
      task_title: row[2]
    })));
  } else {
    console.log('无记录');
  }

  // 删除记录
  console.log('\n=== 执行删除 ===');
  db.run(`DELETE FROM farm_tasks WHERE id IN (${placeholders})`, taskIds);
  const farmChanges = db.getRowsModified();
  console.log(`farm_tasks 删除: ${farmChanges} 条`);

  db.run(`DELETE FROM temp_tasks WHERE id IN (${placeholders})`, taskIds);
  const tempChanges = db.getRowsModified();
  console.log(`temp_tasks 删除: ${tempChanges} 条`);

  // 保存到文件
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  db.close();
  console.log('\n删除完成，已保存到数据库');
}

main();
