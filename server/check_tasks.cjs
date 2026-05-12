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

  // 查询 farm_tasks 表
  console.log('=== farm_tasks 表中的记录 ===');
  const farmTasks = db.exec(`SELECT id, task_code, task_title, assignee_name, greenhouse_name FROM farm_tasks WHERE id IN (${placeholders})`, taskIds);
  if (farmTasks.length > 0) {
    console.table(farmTasks[0].values.map(row => ({
      id: row[0],
      task_code: row[1],
      task_title: row[2],
      assignee_name: row[3],
      greenhouse_name: row[4]
    })));
  } else {
    console.log('无记录');
  }

  // 查询 temp_tasks 表
  console.log('\n=== temp_tasks 表中的记录 ===');
  const tempTasks = db.exec(`SELECT id, task_code, task_title, assignee_name, greenhouse_name FROM temp_tasks WHERE id IN (${placeholders})`, taskIds);
  if (tempTasks.length > 0) {
    console.table(tempTasks[0].values.map(row => ({
      id: row[0],
      task_code: row[1],
      task_title: row[2],
      assignee_name: row[3],
      greenhouse_name: row[4]
    })));
  } else {
    console.log('无记录');
  }

  // 统计总记录数
  const totalFarm = db.exec('SELECT COUNT(*) FROM farm_tasks');
  const totalTemp = db.exec('SELECT COUNT(*) FROM temp_tasks');
  console.log('\n=== 表记录总数 ===');
  console.log('farm_tasks:', totalFarm[0]?.values[0][0]);
  console.log('temp_tasks:', totalTemp[0]?.values[0][0]);

  db.close();
}

main();
