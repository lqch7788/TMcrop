/**
 * 导入前端农事任务数据到后端数据库
 *
 * 使用方式：
 * 1. 在浏览器 Console 中执行以下代码导出数据：
 *    const data = localStorage.getItem('yuanxingtu_tasks');
 *    copy(data);
 * 2. 将导出的数据粘贴到下面的 DATA 变量中
 * 3. 运行: npx tsx scripts/importFarmTasks.ts
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

// ========== 第一步：在浏览器 Console 导出的数据 ==========
// 请将浏览器 Console 中 copy() 复制的数据粘贴到下面
const RAW_DATA = ''; // <-- 在这里粘贴导出的数据

// 如果没有通过参数传入，则使用上面的 RAW_DATA
const dataToImport = process.argv[2]
  ? JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'))
  : RAW_DATA;

interface FarmTask {
  id: string;
  taskCode: string;
  title: string;
  type: string;
  typeName: string;
  status: string;
  priority: string;
  progress: number;
  sourceType: string;
  assigneeId: string;
  assigneeName: string;
  assignerId: string;
  assignerName: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  acceptedAt?: string;
  completedAt?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  cropName?: string;
  field?: string;
  planStart?: string;
  planEnd?: string;
  estimatedDays?: number;
  estimatedHours?: number;
  materials?: string[];
  tools?: string[];
  remarks?: string;
  description?: string;
  batchId?: string;
  batchCode?: string;
  reworkCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

async function importFarmTasks() {
  if (!dataToImport) {
    console.error('错误：请提供要导入的数据！');
    console.error('使用方式：');
    console.error('1. 在浏览器 Console 中执行: copy(localStorage.getItem("yuanxingtu_tasks"))');
    console.error('2. 将复制的内容保存到文件，如 data.json');
    console.error('3. 运行: npx tsx scripts/importFarmTasks.ts data.json');
    process.exit(1);
  }

  // 解析数据（兼容新旧格式）
  let tasks: FarmTask[] = [];
  if (typeof dataToImport === 'string') {
    const parsed = JSON.parse(dataToImport);
    tasks = parsed.data || parsed;
  } else if (dataToImport.data) {
    tasks = dataToImport.data;
  } else if (Array.isArray(dataToImport)) {
    tasks = dataToImport;
  }

  console.log(`准备导入 ${tasks.length} 条任务数据...`);

  // 初始化 SQL.js
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '../data/yuanxingtu.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // 转换并导入每条任务
  let imported = 0;
  let skipped = 0;

  for (const task of tasks) {
    try {
      // 检查是否已存在
      const existing = db.exec(`SELECT id FROM farm_tasks WHERE id = '${task.id}'`);
      if (existing.length > 0 && existing[0].values.length > 0) {
        console.log(`跳过已存在的任务: ${task.id} (${task.title})`);
        skipped++;
        continue;
      }

      // 转换前端字段到后端字段
      const now = new Date().toISOString();
      const taskCode = task.taskCode || task.id;
      const taskTitle = task.title;
      const taskType = task.typeName || task.type || '';
      const taskContent = task.description || task.remarks || '';
      const assigneeId = task.assigneeId || '';
      const assigneeName = task.assigneeName || '';
      const greenhouseId = task.greenhouseId || '';
      const greenhouseName = task.greenhouseName || '';
      const areaName = task.field || '';
      const planDate = task.dueDate || task.planEnd?.split(' ')[0] || '';
      const planTime = task.planEnd?.split(' ')[1] || '';
      const priority = task.priority || 'medium';
      const status = task.status || 'pending';
      const batchId = task.batchId || '';
      const batchCode = task.batchCode || '';
      const createBy = task.assignerName || '';
      const createById = task.assignerId || '';
      const sourceType = task.sourceType || '';
      const progress = task.progress || 0;
      const acceptedAt = task.acceptedAt || '';
      const completedAt = task.completedAt || '';
      const reworkCount = task.reworkCount || 0;
      const version = task.version || 1;
      const dispatchMode = (task as any).dispatchMode || '';
      const feedbackReqs = JSON.stringify(task.feedbackRequirements || []);
      const remarks = task.remarks || '';

      db.run(`
        INSERT INTO farm_tasks (
          id, task_code, task_title, task_type, task_content,
          assignee_id, assignee_name,
          greenhouse_id, greenhouse_name, area_name,
          plan_date, plan_time,
          priority, status,
          batch_id, batch_code,
          create_by, create_by_id,
          source_type, progress,
          accepted_at, completed_at,
          rework_count, version,
          dispatch_mode, feedback_requirements, remarks,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        task.id, taskCode, taskTitle, taskType, taskContent,
        assigneeId, assigneeName,
        greenhouseId, greenhouseName, areaName,
        planDate, planTime,
        priority, status,
        batchId, batchCode,
        createBy, createById,
        sourceType, progress,
        acceptedAt, completedAt,
        reworkCount, version,
        dispatchMode, feedbackReqs, remarks,
        task.createdAt || now, task.updatedAt || now
      ]);

      console.log(`导入任务: ${task.id} (${taskTitle})`);
      imported++;
    } catch (err) {
      console.error(`导入任务失败: ${task.id}`, err);
    }
  }

  // 保存数据库
  const data = db.export();
  const buffer2 = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer2);
  db.close();

  console.log(`\n========== 导入完成 ==========`);
  console.log(`成功导入: ${imported} 条`);
  console.log(`跳过: ${skipped} 条`);
  console.log(`总计: ${tasks.length} 条`);
}

importFarmTasks().catch(console.error);
