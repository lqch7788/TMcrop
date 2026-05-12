/**
 * 恢复原始种子数据
 * 通过后端 API 添加缺失的 NS 任务
 */

const API_BASE = 'http://localhost:3001/api';

// 缺失的任务数据（从备份 farmMockData.ts 中提取）
const missingTasks = [
  {
    id: 'NS20260318-001',
    taskCode: 'NS20260318-001',
    taskTitle: '8号棚辣椒采收',
    taskType: '修剪,采收',
    taskContent: '【修剪作业标准】\n1. 修剪类型：整形修剪+卫生修剪\n2. 修剪部位：主干侧枝、病弱枝、过密枝\n3. 工具：修枝剪、手锯\n4. 修剪后及时清理残枝落叶\n\n【采收作业标准】\n1. 成熟度标准：80%成熟采收\n2. 品质等级：A级、B级\n3. 采收工具：采摘篮、剪刀\n4. 采收时轻拿轻放，避免机械损伤\n\n【包装要求】\n1. 采收后2小时内完成包装\n2. 包装箱需清洁干燥\n3. 分级包装：A级、B级分开存放',
    assigneeId: 'W38470',
    assigneeName: '陆启闯',
    greenhouseId: '',
    greenhouseName: '8号棚',
    areaName: '8号棚',
    planDate: '2026-03-18',
    planTime: '08:00',
    priority: 'normal',
    status: 'cancelled',
    completionDate: null,
    completionNote: null,
    batchId: 'NS20260318-001',
    batchCode: 'PC-NS20260318-001',
    createBy: '王主管',
    createTime: '2026-03-18T06:00:00.000Z',
    updateTime: '2026-03-18T06:00:00.000Z',
    title: '8号棚辣椒采收',
    sourceType: 'dispatch',
    sourceId: null,
    progress: 0,
    assignerId: null,
    assignerName: null,
    dueDate: '2026-03-20 17:00',
    acceptedAt: null,
    completedAt: null,
    reworkCount: 0,
    version: 1,
    dispatchMode: null,
    feedbackRequirements: '[]',
    remarks: '物料: 采摘篮×10个, 包装箱×20箱, 修枝剪×3把, 手锯×1把, 梯子×2个',
    crop: '辣椒',
    estimatedHours: 4,
    typeName: '修剪,采收',
    description: '【修剪作业标准】\n1. 修剪类型：整形修剪+卫生修剪\n2. 修剪部位：主干侧枝、病弱枝、过密枝\n3. 工具：修枝剪、手锯\n4. 修剪后及时清理残枝落叶\n\n【采收作业标准】\n1. 成熟度标准：80%成熟采收\n2. 品质等级：A级、B级\n3. 采收工具：采摘篮、剪刀\n4. 采收时轻拿轻放，避免机械损伤\n\n【包装要求】\n1. 采收后2小时内完成包装\n2. 包装箱需清洁干燥\n3. 分级包装：A级、B级分开存放',
    statusLabel: 'cancelled'
  },
  {
    id: 'NS20260319-001',
    taskCode: 'NS20260319-001',
    taskTitle: 'A2地块水稻采收',
    taskType: '采收,除草,修剪',
    taskContent: '【采收作业标准】\n1. 成熟度标准：完全成熟后采收\n2. 采收方式：机械收割为主，人工收割为辅\n3. 品质要求：籽粒饱满、无霉变、无杂质\n\n【除草作业标准】\n1. 除草方式：化学除草\n2. 除草剂用量：8L/亩\n3. 注意事项：整地前进行全田除草\n\n【修剪作业标准】\n1. 修剪部位：病弱枝、过密枝\n2. 工具：修枝剪\n3. 修剪后及时清理残枝',
    assigneeId: 'W38470',
    assigneeName: '陆启闯',
    greenhouseId: '',
    greenhouseName: 'A2地块',
    areaName: 'A2地块',
    planDate: '2026-03-19',
    planTime: '08:00',
    priority: 'normal',
    status: 'pending',
    completionDate: null,
    completionNote: null,
    batchId: 'NS20260319-001',
    batchCode: 'PC-NS20260319-001',
    createBy: '王主管',
    createTime: '2026-03-19T06:00:00.000Z',
    updateTime: '2026-03-19T06:00:00.000Z',
    title: 'A2地块水稻采收',
    sourceType: 'dispatch',
    sourceId: null,
    progress: 0,
    assignerId: null,
    assignerName: null,
    dueDate: '2026-03-23 18:00',
    acceptedAt: null,
    completedAt: null,
    reworkCount: 0,
    version: 1,
    dispatchMode: null,
    feedbackRequirements: '[]',
    remarks: '物料: 除草剂×8L, 剪刀×3把',
    crop: '水稻',
    estimatedHours: 2,
    typeName: '采收,除草,修剪',
    description: '【采收作业标准】\n1. 成熟度标准：完全成熟后采收\n2. 采收方式：机械收割为主，人工收割为辅\n3. 品质要求：籽粒饱满、无霉变、无杂质\n\n【除草作业标准】\n1. 除草方式：化学除草\n2. 除草剂用量：8L/亩\n3. 注意事项：整地前进行全田除草\n\n【修剪作业标准】\n1. 修剪部位：病弱枝、过密枝\n2. 工具：修枝剪\n3. 修剪后及时清理残枝',
    statusLabel: 'pending'
  }
];

async function addTask(task) {
  try {
    const response = await fetch(`${API_BASE}/farm-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    });
    const result = await response.json();
    if (result.success) {
      console.log(`✓ 添加成功: ${task.id} - ${task.taskTitle}`);
    } else {
      console.log(`✗ 添加失败: ${task.id} - ${result.error || '未知错误'}`);
    }
    return result;
  } catch (error) {
    console.log(`✗ 添加异常: ${task.id} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('开始恢复原始种子数据...\n');

  for (const task of missingTasks) {
    await addTask(task);
    await new Promise(resolve => setTimeout(resolve, 500)); // 等待一下避免请求过快
  }

  console.log('\n恢复完成！');
}

main();
