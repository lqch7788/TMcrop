/**
 * 直接导入 localStorage 数据到后端数据库
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'localstorage_data.json');

async function importData() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error('错误：找不到数据文件 ' + DATA_FILE);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(rawData);
  const tasks = parsed.data || parsed;

  console.log(`读取到 ${tasks.length} 条任务数据`);

  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '../data/yuanxingtu.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // 清空现有数据
  console.log('清空现有数据...');
  db.run('DELETE FROM farm_tasks');
  db.run('DELETE FROM temp_tasks');
  db.run('DELETE FROM problems');

  const stats = { farm: 0, temp: 0, problem: 0 };

  for (const task of tasks) {
    const taskCode = task.taskCode || task.id;
    const taskType = getTaskType(taskCode);

    try {
      if (taskType === 'farm') {
        insertFarmTask(db, task, taskCode);
        stats.farm++;
        console.log('导入农事任务:', taskCode, task.taskTitle);
      } else if (taskType === 'temp') {
        insertTempTask(db, task, taskCode);
        stats.temp++;
        console.log('导入临时任务:', taskCode, task.taskTitle);
      } else if (taskType === 'problem') {
        insertProblem(db, task, taskCode);
        stats.problem++;
        console.log('导入问题管理:', taskCode, task.taskTitle);
      }
    } catch (err) {
      console.error('导入失败:', taskCode, err.message);
    }
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log('\n========== 导入完成 ==========');
  console.log('农事任务(NS):', stats.farm, '条');
  console.log('临时任务(TT):', stats.temp, '条');
  console.log('问题管理(PD):', stats.problem, '条');
}

function getTaskType(taskCode) {
  if (!taskCode) return 'unknown';
  if (taskCode.startsWith('NS')) return 'farm';
  if (taskCode.startsWith('TT')) return 'temp';
  if (taskCode.startsWith('PD')) return 'problem';
  return 'unknown';
}

function insertFarmTask(db, task, taskCode) {
  const now = new Date().toISOString();

  // farm_tasks 表有36个字段
  db.run(`
    INSERT INTO farm_tasks (
      id, task_code, task_title, task_type, task_content,
      assignee_id, assignee_name,
      greenhouse_id, greenhouse_name, area_name,
      plan_date, plan_time,
      priority, status,
      completion_date, completion_note,
      batch_id, batch_code,
      create_by, create_time, update_time,
      create_by_id,
      title, source_type, source_id, progress,
      assigner_id, assigner_name, due_date,
      accepted_at, completed_at,
      rework_count, version,
      dispatch_mode, feedback_requirements, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    task.id,
    taskCode,
    task.taskTitle || task.title || '',
    task.taskType || '',
    task.taskContent || '',
    task.assigneeId || '',
    task.assigneeName || '',
    task.greenhouseId || '',
    task.greenhouseName || '',
    task.areaName || '',
    task.planDate ? task.planDate.split('T')[0] : '',
    task.planTime || '',
    task.priority || 'medium',
    task.status || 'pending',
    task.completionDate || null,
    task.completionNote || null,
    task.batchId || '',
    task.batchCode || '',
    task.createBy || '',
    task.createTime || now,
    task.updateTime || now,
    task.createById || null,
    task.title || null,
    task.sourceType || null,
    task.sourceId || null,
    task.progress || 0,
    task.assignerId || null,
    task.assignerName || null,
    task.dueDate || null,
    task.acceptedAt || null,
    task.completedAt || null,
    task.reworkCount || 0,
    task.version || 1,
    task.dispatchMode || null,
    task.feedbackRequirements ? JSON.stringify(task.feedbackRequirements) : null,
    task.remarks || null
  ]);
}

function insertTempTask(db, task, taskCode) {
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO temp_tasks (
      id, task_code, task_title, task_type, task_content,
      requester_id, requester_name,
      assignee_id, assignee_name,
      greenhouse_id, greenhouse_name, area_name,
      request_date, request_time,
      priority, status,
      due_date, remarks,
      create_by, create_time, update_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    task.id,
    taskCode,
    task.taskTitle || task.title || '',
    task.taskType || '',
    task.taskContent || '',
    task.createById || task.assignerId || '',
    task.createBy || task.assignerName || '',
    task.assigneeId || '',
    task.assigneeName || '',
    task.greenhouseId || '',
    task.greenhouseName || '',
    task.areaName || '',
    task.planDate ? task.planDate.split('T')[0] : '',
    task.planTime || '',
    task.priority || 'medium',
    task.status || 'pending',
    task.dueDate || '',
    task.remarks || '',
    task.createBy || '',
    task.createTime || now,
    task.updateTime || now
  ]);
}

function insertProblem(db, task, taskCode) {
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO problems (
      id, problem_code, problem_type, title, description,
      greenhouse_id, greenhouse_name,
      reporter_id, reporter_name,
      assignee_id, assignee_name,
      priority, status,
      create_time, update_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    task.id,
    taskCode,
    task.taskType || '',
    task.taskTitle || task.title || '',
    task.taskContent || task.remarks || '',
    task.greenhouseId || '',
    task.greenhouseName || '',
    task.createById || task.assignerId || '',
    task.createBy || task.assignerName || '',
    task.assigneeId || '',
    task.assigneeName || '',
    task.priority || 'medium',
    task.status || 'pending',
    task.createTime || now,
    task.updateTime || now
  ]);
}

importData().catch(console.error);
