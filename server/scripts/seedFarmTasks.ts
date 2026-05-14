/**
 * 农事任务种子数据迁移脚本
 * 将前端 mockData 中的所有任务数据导入到后端 SQLite 数据库
 *
 * 用法: cd server && npx tsx scripts/seedFarmTasks.ts
 *
 * 安全策略：
 * - 使用 INSERT OR REPLACE，已存在的记录会被更新
 * - 不会删除数据库中已有的任务
 * - 仅导入前端 mock 种子数据
 */

import { getDatabase, saveDatabase, initDatabase } from '../src/db';
import { execCount } from '../src/utils/queryHelper';

// 模拟前端种子数据（从 farmMockData 提取）
const seedTasks = [
  {
    id: 'NS20260317-002',
    task_code: 'NS20260317-002',
    task_title: '4号棚黄瓜灌溉施肥',
    task_type: '灌溉,施肥',
    task_content: '4号棚黄瓜灌溉施肥任务',
    assignee_id: 'W38406',
    assignee_name: '陆启闯',
    greenhouse_id: '4号棚',
    greenhouse_name: '4号棚',
    area_name: '',
    plan_date: '2026-03-17',
    plan_time: '09:00',
    priority: 'high',
    status: 'in_progress',
    create_by: 'system',
    create_time: '2026-03-17T08:00:00Z',
    update_time: '2026-03-17T08:00:00Z',
    due_date: '2026-03-17',
    progress: 60,
    crop: '黄瓜',
    estimated_hours: 2,
    remarks: '',
    batch_id: '',
    batch_code: '',
    assigner_id: 'M001',
    assigner_name: '王主管',
    source_type: 'dispatch',
    dispatch_mode: 'farm',
    rework_count: 0,
    version: 1,
    feedback_requirements: JSON.stringify(['gps', 'material', 'photo_before', 'photo_after']),
  },
  {
    id: 'NS20260316-001',
    task_code: 'NS20260316-001',
    task_title: 'A1地块水稻采收施肥除草',
    task_type: '采收,施肥,除草',
    task_content: 'A1地块水稻采收施肥除草任务',
    assignee_id: 'W38406',
    assignee_name: '陆启闯',
    greenhouse_id: 'A1地块',
    greenhouse_name: 'A1地块',
    area_name: '',
    plan_date: '2026-03-16',
    plan_time: '08:00',
    priority: 'normal',
    status: 'waiting_acceptance',
    create_by: 'system',
    create_time: '2026-03-16T08:00:00Z',
    update_time: '2026-03-18T08:00:00Z',
    due_date: '2026-03-18',
    progress: 100,
    crop: '水稻',
    estimated_hours: 10,
    remarks: '',
    batch_id: '',
    batch_code: '',
    assigner_id: 'M001',
    assigner_name: '王主管',
    source_type: 'dispatch',
    dispatch_mode: 'farm',
    rework_count: 0,
    version: 1,
    feedback_requirements: JSON.stringify(['gps', 'material', 'photo_before', 'photo_after']),
  },
  {
    id: 'NS20260317-005',
    task_code: 'NS20260317-005',
    task_title: 'C1地块油菜施肥灌溉',
    task_type: '施肥,灌溉',
    task_content: 'C1地块油菜施肥灌溉任务',
    assignee_id: 'W38406',
    assignee_name: '陆启闯',
    greenhouse_id: 'C1地块',
    greenhouse_name: 'C1地块',
    area_name: '',
    plan_date: '2026-03-17',
    plan_time: '08:00',
    priority: 'normal',
    status: 'rejected',
    create_by: 'system',
    create_time: '2026-03-17T08:00:00Z',
    update_time: '2026-03-17T08:00:00Z',
    due_date: '2026-03-19',
    progress: 0,
    crop: '油菜',
    estimated_hours: 8,
    remarks: '',
    batch_id: '',
    batch_code: '',
    assigner_id: 'M001',
    assigner_name: '王主管',
    source_type: 'dispatch',
    dispatch_mode: 'farm',
    rework_count: 1,
    version: 1,
    feedback_requirements: JSON.stringify(['gps', 'photo_before', 'photo_after']),
  },
  {
    id: 'NS20260317-006',
    task_code: 'NS20260317-006',
    task_title: 'D1地块蔬菜灌溉',
    task_type: '灌溉',
    task_content: 'D1地块蔬菜灌溉任务',
    assignee_id: 'W38406',
    assignee_name: '陆启闯',
    greenhouse_id: 'D1地块',
    greenhouse_name: 'D1地块',
    area_name: '',
    plan_date: '2026-03-17',
    plan_time: '06:00',
    priority: 'urgent',
    status: 'completed',
    create_by: 'system',
    create_time: '2026-03-17T06:00:00Z',
    update_time: '2026-03-17T08:00:00Z',
    due_date: '2026-03-17',
    progress: 100,
    crop: '蔬菜',
    estimated_hours: 2,
    remarks: '',
    batch_id: '',
    batch_code: '',
    assigner_id: 'M001',
    assigner_name: '王主管',
    source_type: 'dispatch',
    dispatch_mode: 'farm',
    rework_count: 0,
    version: 1,
    completed_at: '2026-03-17T08:00:00Z',
    feedback_requirements: JSON.stringify(['gps', 'photo_before', 'photo_after']),
  },
  {
    id: 'NS20260318-001',
    task_code: 'NS20260318-001',
    task_title: '8号棚辣椒修剪采收',
    task_type: '修剪,采收',
    task_content: '8号棚辣椒修剪采收任务',
    assignee_id: 'W38406',
    assignee_name: '陆启闯',
    greenhouse_id: '8号棚',
    greenhouse_name: '8号棚',
    area_name: '',
    plan_date: '2026-03-18',
    plan_time: '08:00',
    priority: 'normal',
    status: 'cancelled',
    create_by: 'system',
    create_time: '2026-03-18T08:00:00Z',
    update_time: '2026-03-18T08:00:00Z',
    due_date: '2026-03-20',
    progress: 0,
    crop: '辣椒',
    estimated_hours: 4,
    remarks: '',
    batch_id: '',
    batch_code: '',
    assigner_id: 'M001',
    assigner_name: '王主管',
    source_type: 'dispatch',
    dispatch_mode: 'farm',
    rework_count: 0,
    version: 1,
    feedback_requirements: JSON.stringify(['gps', 'photo_before', 'photo_after']),
  },
  {
    id: 'NS20260319-001',
    task_code: 'NS20260319-001',
    task_title: 'A2地块水稻采收除草修剪',
    task_type: '采收,除草,修剪',
    task_content: 'A2地块水稻采收除草修剪任务',
    assignee_id: 'W38406',
    assignee_name: '陆启闯',
    greenhouse_id: 'A2地块',
    greenhouse_name: 'A2地块',
    area_name: '',
    plan_date: '2026-03-19',
    plan_time: '08:00',
    priority: 'normal',
    status: 'pending',
    create_by: 'system',
    create_time: '2026-03-19T08:00:00Z',
    update_time: '2026-03-19T08:00:00Z',
    due_date: '2026-03-23',
    progress: 0,
    crop: '水稻',
    estimated_hours: 2,
    remarks: '',
    batch_id: '',
    batch_code: '',
    assigner_id: 'M001',
    assigner_name: '王主管',
    source_type: 'dispatch',
    dispatch_mode: 'farm',
    rework_count: 0,
    version: 1,
    feedback_requirements: JSON.stringify(['gps', 'photo_before', 'photo_after']),
  },
];

async function main() {
  console.log('开始种子数据迁移...');
  await initDatabase();
  const db = getDatabase();

  // 确保必要列存在（兼容旧表结构）
  const ensureColumns = [
    { name: 'feedback_requirements', type: 'TEXT' },
    { name: 'rework_count', type: 'INTEGER DEFAULT 0' },
    { name: 'version', type: 'INTEGER DEFAULT 1' },
    { name: 'accepted_at', type: 'TEXT' },
    { name: 'completed_at', type: 'TEXT' },
    { name: 'dispatch_mode', type: 'TEXT' },
    { name: 'source_type', 'type': 'TEXT' },
    { name: 'assigner_id', type: 'TEXT' },
    { name: 'assigner_name', type: 'TEXT' },
    { name: 'remarks', type: 'TEXT' },
  ];

  for (const col of ensureColumns) {
    try {
      db.run(`ALTER TABLE farm_tasks ADD COLUMN ${col.name} ${col.type}`);
      console.log(`  添加列: ${col.name}`);
    } catch {
      // 列已存在，忽略
    }
  }

  let imported = 0;

  for (const task of seedTasks) {
    const columns = Object.keys(task);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => (task as any)[col]);

    // 使用 INSERT OR REPLACE 确保幂等性：存在则更新，不存在则插入
    db.run(`INSERT OR REPLACE INTO farm_tasks (${columns.join(', ')}) VALUES (${placeholders})`, values);
    imported++;
  }

  saveDatabase();
  console.log(`\n迁移完成: 处理 ${imported} 条记录`);

  // 验证结果
  const total = execCount(db, 'SELECT COUNT(*) as count FROM farm_tasks', []);
  console.log(`数据库 farm_tasks 表总记录数: ${total}`);
}

main().catch(console.error);
