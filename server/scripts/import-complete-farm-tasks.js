/**
 * 从 farmMockData.ts 导入完整农事任务数据到后端数据库
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// 原始完整数据
const taskDispatchTasks = [
  {
    id: 'NS20260317-002',
    typeLabel: '灌溉,施肥',
    field: '4号棚',
    crop: '黄瓜',
    assignee: '陆启闯',
    planStart: '2026-03-17 09:00',
    planEnd: '2026-03-17 11:00',
    progress: 60,
    status: 'in_progress',
    priority: 'high',
    estimatedHours: 2,
    materials: [{ name: '水溶肥', qty: 10, unit: 'kg' }],
    tools: [{ name: '滴灌设备', qty: 1, unit: '套' }],
    requiredFeedback: ['gps', 'material', 'photo_before', 'photo_after'],
    sopContent: `【灌溉作业标准】
1. 先进行灌溉检查，确保滴灌设备正常运行
2. 灌溉量：20m³/亩，灌溉时长：30分钟/亩
3. 灌溉结束后进行施肥操作

【施肥作业标准】
1. 肥料配比：水溶肥稀释500倍
2. 施用方式：滴灌随水施入
3. 注意事项：避免雨前施用，施肥后观察作物反应

【安全要求】
- 操作人员需佩戴防护手套
- 施肥设备使用后需清洗干净`,
  },
  {
    id: 'NS20260318-001',
    typeLabel: '修剪,采收',
    field: '8号棚',
    crop: '辣椒',
    assignee: '陆启闯',
    planStart: '2026-03-18 08:00',
    planEnd: '2026-03-20 17:00',
    progress: 0,
    status: 'cancelled',
    priority: 'normal',
    estimatedHours: 4,
    materials: [{ name: '采摘篮', qty: 10, unit: '个' }, { name: '包装箱', qty: 20, unit: '箱' }],
    tools: [{ name: '修枝剪', qty: 3, unit: '把' }, { name: '手锯', qty: 1, unit: '把' }, { name: '梯子', qty: 2, unit: '个' }],
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    sopContent: `【修剪作业标准】
1. 修剪类型：整形修剪+卫生修剪
2. 修剪部位：主干侧枝、病弱枝，过密枝
3. 工具：修枝剪、手锯
4. 修剪后及时清理残枝落叶

【采收作业标准】
1. 成熟度标准：80%成熟采收
2. 品质等级：A级、B级
3. 采收工具：采摘篮、剪刀
4. 采收时轻拿轻放，避免机械损伤`,
  },
  {
    id: 'NS20260316-001',
    typeLabel: '采收,施肥,除草',
    field: 'A1地块',
    crop: '水稻',
    assignee: '陆启闯',
    planStart: '2026-03-16 08:00',
    planEnd: '2026-03-18 18:00',
    progress: 100,
    status: 'waiting_acceptance',
    priority: 'normal',
    estimatedHours: 10,
    materials: [{ name: '复合肥', qty: 100, unit: 'kg' }, { name: '除草剂', qty: 10, unit: 'L' }, { name: '编织袋', qty: 50, unit: '个' }],
    tools: [{ name: '镰刀', qty: 5, unit: '把' }, { name: '收割机', qty: 1, unit: '台' }],
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    sopContent: `【采收作业标准】
1. 成熟度标准：完全成熟后采收
2. 采收方式：机械收割为主，人工收割为辅
3. 品质要求：籽粒饱满、无霉变、无杂质

【施肥作业标准】
1. 施肥时机：采收后立即进行
2. 肥料种类：复合肥
3. 用量：20kg/亩
4. 施用方式：撒施后旋耕入土

【除草作业标准】
1. 除草方式：化学除草
2. 除草剂用量：8L/亩
3. 注意事项：整地前进行全田除草`,
  },
  {
    id: 'NS20260317-005',
    typeLabel: '施肥,灌溉',
    field: 'C1地块',
    crop: '油菜',
    assignee: '陆启闯',
    planStart: '2026-03-17 13:00',
    planEnd: '2026-03-17 17:00',
    progress: 0,
    status: 'rejected',
    priority: 'normal',
    estimatedHours: 4,
    materials: [{ name: '尿素', qty: 30, unit: 'kg' }],
    tools: [{ name: '施肥器', qty: 1, unit: '把' }],
    requiredFeedback: ['gps', 'photo_before'],
    sopContent: `【施肥作业标准】
1. 肥料种类：尿素
2. 用量：15kg/亩
3. 施用方式：撒施

【灌溉作业标准】
1. 灌溉方式：漫灌
2. 灌溉量：30m³/亩
3. 注意事项：灌溉前确保田埂无漏水`,
  },
  {
    id: 'NS20260317-006',
    typeLabel: '灌溉',
    field: 'D1地块',
    crop: '蔬菜',
    assignee: '陆启闯',
    planStart: '2026-03-17 06:00',
    planEnd: '2026-03-17 08:00',
    progress: 100,
    status: 'completed',
    priority: 'urgent',
    estimatedHours: 2,
    materials: [],
    tools: [{ name: '滴灌设备', qty: 1, unit: '套' }],
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    sopContent: '',
  },
  {
    id: 'NS20260319-001',
    typeLabel: '采收,除草,修剪',
    field: 'A2地块',
    crop: '水稻',
    assignee: '陆启闯',
    planStart: '2026-03-19 08:00',
    planEnd: '2026-03-23 18:00',
    progress: 0,
    status: 'pending',
    priority: 'normal',
    estimatedHours: 2,
    materials: [{ name: '除草剂', qty: 8, unit: 'L' }, { name: '剪刀', qty: 3, unit: '把' }],
    tools: [{ name: '除草机', qty: 1, unit: '台' }, { name: '镰刀', qty: 5, unit: '把' }],
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    sopContent: `【采收作业标准】
1. 成熟度：完全成熟后采收
2. 采收方式：人工收割
3. 品质要求：无杂质、无霉变

【除草作业标准】
1. 方式：化学除草+人工除草结合
2. 除草剂用量：6L/亩
3. 安全间隔期：14天

【修剪作业标准】
1. 类型：卫生修剪
2. 部位：病残枝、过密枝
3. 工具：修枝剪、手锯`,
  },
];

async function importData() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '../data/yuanxingtu.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // 确保新增字段存在
  try { db.run("ALTER TABLE farm_tasks ADD COLUMN crop TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE farm_tasks ADD COLUMN estimated_hours INTEGER DEFAULT 0"); } catch (e) {}

  console.log('清空现有 farm_tasks 数据...');
  db.run('DELETE FROM farm_tasks');

  const now = new Date().toISOString();

  for (const task of taskDispatchTasks) {
    const [planDate, planTime] = task.planStart.split(' ');
    const statusMap = {
      pending: 'pending',
      in_progress: 'in_progress',
      completed: 'completed',
      cancelled: 'cancelled',
      rejected: 'rejected',
      waiting_acceptance: 'waiting_acceptance',
    };
    const status = statusMap[task.status] || 'pending';

    const materialsStr = task.materials.map(m => `${m.name}×${m.qty}${m.unit}`).join(', ');
    const toolsStr = task.tools.map(t => `${t.name}×${t.qty}${t.unit}`).join(', ');
    const remarks = `物料: ${materialsStr || '无'}\n工具: ${toolsStr || '无'}`;
    const batchCode = `PC-${task.id}`;

    // 使用明确的字段列表（38个字段）
    db.run(`
      INSERT INTO farm_tasks (
        id, task_code, task_title, task_type, task_content,
        assignee_id, assignee_name,
        greenhouse_id, greenhouse_name, area_name,
        plan_date, plan_time,
        priority, status,
        progress,
        create_by, create_time, update_time,
        create_by_id,
        title, source_type, source_id,
        assigner_id, assigner_name, due_date,
        accepted_at, completed_at,
        rework_count, version,
        dispatch_mode, feedback_requirements, remarks,
        completion_date, completion_note,
        batch_id, batch_code,
        crop, estimated_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.id,                    // id
      task.id,                   // task_code
      `${task.field}${task.crop}采收`,  // task_title
      task.typeLabel,            // task_type
      task.sopContent || '',     // task_content
      'W38470',                 // assignee_id
      task.assignee,            // assignee_name
      '',                        // greenhouse_id
      task.field,               // greenhouse_name
      task.field,               // area_name
      planDate,                 // plan_date
      planTime || '',           // plan_time
      task.priority,             // priority
      status,                   // status
      task.progress || 0,       // progress
      '王主管',                  // create_by
      now,                      // create_time
      now,                      // update_time
      null,                     // create_by_id
      `${task.field}${task.crop}${task.typeLabel}`, // title
      'dispatch',               // source_type
      null,                     // source_id
      null,                     // assigner_id
      null,                     // assigner_name
      task.planEnd || null,     // due_date
      null,                     // accepted_at
      task.status === 'completed' ? now : null, // completed_at
      0,                        // rework_count
      1,                        // version
      null,                     // dispatch_mode
      JSON.stringify(task.requiredFeedback || []), // feedback_requirements
      remarks,                  // remarks
      null,                     // completion_date
      null,                     // completion_note
      task.id,                  // batch_id
      batchCode,                // batch_code
      task.crop,                // crop - 作物！
      task.estimatedHours || 0, // estimated_hours - 任务工时！
    ]);

    console.log(`导入: ${task.id} - ${task.field}${task.crop} - ${task.typeLabel} (${status}) - 工时:${task.estimatedHours}h`);
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log('\n========== 导入完成 ==========');
  console.log(`共导入 ${taskDispatchTasks.length} 条完整农事任务数据`);
}

importData().catch(console.error);
