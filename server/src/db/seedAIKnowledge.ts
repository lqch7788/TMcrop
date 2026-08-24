/**
 * AI 模块支持数据种子脚本（PR B）
 * 2026-08-24：补充 AI-01 F4 历史表现 + AI-12 知识库缺失数据
 *
 * - performance_records：6 员工 × 3 月 = 18 条（AI-01 F4 用）
 * - data_dictionary：20 条农业术语（AI-12 检索用）
 * - recommendation_rules：10 条业务规则（AI-12 检索用）
 * - ai_recommendation_rules：8 条 AI 规则（AI-12 检索用）
 *
 * 执行：npx tsx src/db/seedAIKnowledge.ts
 */

import { initDatabase, getDatabase, saveDatabase } from '.';

// ============ performance_records 18 条 ============
const PERFORMANCE_RECORDS = [
  // 张三 EMP_001
  { staff_id: 'EMP_001', staff_name: '张三', department: '种植组', month: '2026-06', task_completion_rate: 95, attendance_rate: 100, work_quality: 92, safety_compliance: 98, teamwork_attitude: 90, total_score: 95, rank: 'A', status: '已评估' },
  { staff_id: 'EMP_001', staff_name: '张三', department: '种植组', month: '2026-07', task_completion_rate: 96, attendance_rate: 100, work_quality: 93, safety_compliance: 98, teamwork_attitude: 92, total_score: 96, rank: 'A', status: '已评估' },
  { staff_id: 'EMP_001', staff_name: '张三', department: '种植组', month: '2026-08', task_completion_rate: 94, attendance_rate: 98, work_quality: 90, safety_compliance: 100, teamwork_attitude: 92, total_score: 94, rank: 'A', status: '已评估' },
  // 李四 EMP_002
  { staff_id: 'EMP_002', staff_name: '李四', department: '种植组', month: '2026-06', task_completion_rate: 88, attendance_rate: 95, work_quality: 85, safety_compliance: 92, teamwork_attitude: 88, total_score: 88, rank: 'B', status: '已评估' },
  { staff_id: 'EMP_002', staff_name: '李四', department: '种植组', month: '2026-07', task_completion_rate: 90, attendance_rate: 96, work_quality: 87, safety_compliance: 94, teamwork_attitude: 90, total_score: 90, rank: 'B', status: '已评估' },
  { staff_id: 'EMP_002', staff_name: '李四', department: '种植组', month: '2026-08', task_completion_rate: 86, attendance_rate: 94, work_quality: 84, safety_compliance: 90, teamwork_attitude: 86, total_score: 86, rank: 'B', status: '已评估' },
  // 王五 EMP_003
  { staff_id: 'EMP_003', staff_name: '王五', department: '采收组', month: '2026-06', task_completion_rate: 78, attendance_rate: 90, work_quality: 80, safety_compliance: 85, teamwork_attitude: 82, total_score: 80, rank: 'C', status: '已评估' },
  { staff_id: 'EMP_003', staff_name: '王五', department: '采收组', month: '2026-07', task_completion_rate: 80, attendance_rate: 92, work_quality: 82, safety_compliance: 88, teamwork_attitude: 84, total_score: 82, rank: 'C', status: '已评估' },
  { staff_id: 'EMP_003', staff_name: '王五', department: '采收组', month: '2026-08', task_completion_rate: 76, attendance_rate: 88, work_quality: 78, safety_compliance: 82, teamwork_attitude: 80, total_score: 78, rank: 'C', status: '已评估' },
  // 赵六 EMP_004
  { staff_id: 'EMP_004', staff_name: '赵六', department: '包装组', month: '2026-06', task_completion_rate: 92, attendance_rate: 98, work_quality: 90, safety_compliance: 95, teamwork_attitude: 88, total_score: 92, rank: 'A', status: '已评估' },
  { staff_id: 'EMP_004', staff_name: '赵六', department: '包装组', month: '2026-07', task_completion_rate: 94, attendance_rate: 100, work_quality: 91, safety_compliance: 96, teamwork_attitude: 90, total_score: 94, rank: 'A', status: '已评估' },
  { staff_id: 'EMP_004', staff_name: '赵六', department: '包装组', month: '2026-08', task_completion_rate: 90, attendance_rate: 96, work_quality: 88, safety_compliance: 94, teamwork_attitude: 86, total_score: 90, rank: 'A', status: '已评估' },
  // 钱七 EMP_005
  { staff_id: 'EMP_005', staff_name: '钱七', department: '仓储组', month: '2026-06', task_completion_rate: 70, attendance_rate: 85, work_quality: 72, safety_compliance: 78, teamwork_attitude: 75, total_score: 73, rank: 'C', status: '已评估' },
  { staff_id: 'EMP_005', staff_name: '钱七', department: '仓储组', month: '2026-07', task_completion_rate: 72, attendance_rate: 88, work_quality: 75, safety_compliance: 80, teamwork_attitude: 78, total_score: 75, rank: 'C', status: '已评估' },
  { staff_id: 'EMP_005', staff_name: '钱七', department: '仓储组', month: '2026-08', task_completion_rate: 68, attendance_rate: 82, work_quality: 70, safety_compliance: 75, teamwork_attitude: 72, total_score: 70, rank: 'D', status: '已评估' },
  // 孙八 EMP_006
  { staff_id: 'EMP_006', staff_name: '孙八', department: '质检组', month: '2026-06', task_completion_rate: 85, attendance_rate: 92, work_quality: 88, safety_compliance: 90, teamwork_attitude: 86, total_score: 87, rank: 'B', status: '已评估' },
  { staff_id: 'EMP_006', staff_name: '孙八', department: '质检组', month: '2026-07', task_completion_rate: 87, attendance_rate: 94, work_quality: 90, safety_compliance: 92, teamwork_attitude: 88, total_score: 89, rank: 'B', status: '已评估' },
  { staff_id: 'EMP_006', staff_name: '孙八', department: '质检组', month: '2026-08', task_completion_rate: 83, attendance_rate: 90, work_quality: 86, safety_compliance: 88, teamwork_attitude: 84, total_score: 85, rank: 'B', status: '已评估' },
];

// ============ data_dictionary 20 条农业术语 ============
const DATA_DICTIONARY = [
  { category: 'crop', dict_code: 'crop_tomato', dict_name: '番茄', dict_label: '番茄', description: '茄科番茄属一年生草本植物，喜温暖气候，主要在温室大棚种植' },
  { category: 'crop', dict_code: 'crop_cucumber', dict_name: '黄瓜', dict_label: '黄瓜', description: '葫芦科一年生攀缘草本植物，喜湿热，是设施农业主要作物' },
  { category: 'crop', dict_code: 'crop_strawberry', dict_name: '草莓', dict_label: '草莓', description: '蔷薇科草莓属多年生草本，果实鲜美，主要在温室基质栽培' },
  { category: 'crop', dict_code: 'crop_grape', dict_name: '葡萄', dict_label: '葡萄', description: '葡萄科木质藤本植物，可鲜食或酿酒，温室促早栽培效益高' },
  { category: 'crop', dict_code: 'crop_eggplant', dict_name: '茄子', dict_label: '茄子', description: '茄科茄属一年生草本，喜高温，是夏秋主要蔬菜' },
  { category: 'crop', dict_code: 'crop_pepper', dict_name: '辣椒', dict_label: '辣椒', description: '茄科辣椒属一年生草本，喜温暖干燥，是常见调味蔬菜' },
  { category: 'operation', dict_code: 'op_irrigation', dict_name: '灌溉', dict_label: '灌溉', description: '通过滴灌/喷灌系统为作物补充水分，建议早晨或傍晚进行' },
  { category: 'operation', dict_code: 'op_fertilization', dict_name: '施肥', dict_label: '施肥', description: '根据作物生育期和土壤养分状况补充氮磷钾等营养元素' },
  { category: 'operation', dict_code: 'op_pesticide', dict_name: '打药', dict_label: '打药', description: '喷施农药防治病虫害，注意安全间隔期和施药浓度' },
  { category: 'operation', dict_code: 'op_pruning', dict_name: '修剪', dict_label: '修剪', description: '剪除病弱枝、调整树形，改善通风透光，促进果实发育' },
  { category: 'operation', dict_code: 'op_harvest', dict_name: '采收', dict_label: '采收', description: '根据成熟度分批采摘，注意轻拿轻放避免机械损伤' },
  { category: 'pest', dict_code: 'pest_powdery_mildew', dict_name: '白粉病', dict_label: '白粉病', description: '真菌病害，叶面出现白色粉斑，高温高湿易发，可用粉锈宁防治' },
  { category: 'pest', dict_code: 'pest_downy_mildew', dict_name: '霜霉病', dict_label: '霜霉病', description: '真菌病害，叶背出现霜状霉层，低温高湿易发，可用烯酰吗啉防治' },
  { category: 'pest', dict_code: 'pest_anthracnose', dict_name: '炭疽病', dict_label: '炭疽病', description: '真菌病害，果实出现褐色凹陷病斑，可用咪鲜胺防治' },
  { category: 'pest', dict_code: 'pest_aphid', dict_name: '蚜虫', dict_label: '蚜虫', description: '常见刺吸式害虫，群集叶背吸食汁液，可用吡虫啉或生物防治' },
  { category: 'pest', dict_code: 'pest_spider_mite', dict_name: '红蜘蛛', dict_label: '红蜘蛛', description: '螨类害虫，叶面出现黄白斑点，可用阿维菌素防治' },
  { category: 'greenhouse', dict_code: 'gh_glass', dict_name: '玻璃温室', dict_label: '玻璃温室', description: '主体结构为钢架，覆盖玻璃的现代化温室，透光率高寿命长' },
  { category: 'greenhouse', dict_code: 'gh_solar', dict_name: '日光温室', dict_label: '日光温室', description: '背阳面有保温墙、采光面覆盖薄膜的节能温室' },
  { category: 'greenhouse', dict_code: 'gh_open', dict_name: '露天种植区', dict_label: '露天种植区', description: '无覆盖的开放种植区域，受天气影响大，成本低' },
  { category: 'greenhouse', dict_code: 'gh_membrane', dict_name: '薄膜温室', dict_label: '薄膜温室', description: '覆盖 PO 或 PE 薄膜的普通温室，造价低应用广泛' },
];

// ============ recommendation_rules 10 条业务规则 ============
const RECOMMENDATION_RULES = [
  { type: 'irrigation', severity: 'high', title: '高温干旱预警', action: '温度 > 30℃ 且无降雨 > 5 天 → 启动紧急灌溉' },
  { type: 'irrigation', severity: 'medium', title: '土壤水分偏低', action: '土壤湿度 < 40% → 增加滴灌时长' },
  { type: 'fertilization', severity: 'high', title: '缺氮预警', action: '叶色发黄 + 植株矮小 → 追施氮肥（尿素）' },
  { type: 'fertilization', severity: 'high', title: '缺钾预警', action: '叶缘焦枯 + 果实发育不良 → 追施钾肥（硫酸钾）' },
  { type: 'pest', severity: 'critical', title: '白粉病爆发', action: '湿度 > 60% 连续 3 天 → 喷施粉锈宁或三唑酮' },
  { type: 'pest', severity: 'critical', title: '霜霉病高发', action: '叶面结露 + 低温 → 喷施烯酰吗啉 + 加强通风' },
  { type: 'pest', severity: 'high', title: '蚜虫入侵', action: '叶背发现蚜虫 → 喷施吡虫啉 + 释放瓢虫天敌' },
  { type: 'harvest', severity: 'medium', title: '果实成熟', action: '果实转色 > 80% → 安排采收任务' },
  { type: 'greenhouse', severity: 'high', title: '高温警报', action: '棚内温度 > 35℃ → 开启遮阳网 + 强制通风' },
  { type: 'greenhouse', severity: 'medium', title: '湿度偏高', action: '棚内湿度 > 80% → 通风降湿，防范病害' },
];

// ============ ai_recommendation_rules 8 条 AI 规则 ============
const AI_RECOMMENDATION_RULES = [
  { type: 'workhour', severity: 'medium', title: '工时预测偏差', action: '预测工时 vs 实际 > 30% → 标记人工复核，调整 MLP 模型' },
  { type: 'dispatch', severity: 'medium', title: '派工推荐兜底', action: '推荐 matchScore < 60 → 人工指派 + 收集特征用于模型迭代' },
  { type: 'growth', severity: 'low', title: '生长阶段异常', action: '累积 GDD 落后预期 > 20% → 加强巡查 + 检查水肥' },
  { type: 'pest', severity: 'critical', title: '病虫害 IoT 异常', action: 'iIoT 温湿度超阈值 → 立即推送植保建议' },
  { type: 'route', severity: 'low', title: '路径优化空间', action: '节省距离 < 10% → 减少调优频率' },
  { type: 'attendance', severity: 'high', title: '连续缺勤', action: '连续缺勤 ≥3 天 → 通知班组长 + 启动关怀' },
  { type: 'inventory', severity: 'critical', title: '物料告急', action: '库存 < 3 天用量 → 立即采购 + 加急配送' },
  { type: 'anomaly', severity: 'high', title: '任务耗时异常', action: 'Z-score > 3 → 检查任务执行是否有困难' },
];

export async function seedAIKnowledge(): Promise<void> {
  console.log('[seedAIKnowledge] 开始写入 AI 支持数据...');

  // 先初始化数据库（让 fixMissingSchema 跑一遍）
  await initDatabase();
  const db = getDatabase();

  // 1. performance_records
  const existingPR = (db.exec('SELECT COUNT(*) as n FROM performance_records')[0]?.values?.[0]?.[0] as number) || 0;
  if (existingPR >= 18) {
    console.log(`[seedAIKnowledge] performance_records 已有 ${existingPR} 条，跳过`);
  } else {
    const now = new Date().toISOString();
    for (const r of PERFORMANCE_RECORDS) {
      const id = `pr-${r.staff_id}-${r.month}`;
      db.run(
        `INSERT OR IGNORE INTO performance_records
        (id, staff_id, staff_name, department, month, task_completion_rate, attendance_rate, work_quality, safety_compliance, teamwork_attitude, total_score, rank, status, create_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, r.staff_id, r.staff_name, r.department, r.month, r.task_completion_rate, r.attendance_rate, r.work_quality, r.safety_compliance, r.teamwork_attitude, r.total_score, r.rank, r.status, now],
      );
    }
    console.log(`[seedAIKnowledge] performance_records 写入 ${PERFORMANCE_RECORDS.length} 条`);
  }

  // 2. data_dictionary
  const existingDD = (db.exec('SELECT COUNT(*) as n FROM data_dictionary')[0]?.values?.[0]?.[0] as number) || 0;
  if (existingDD >= 20) {
    console.log(`[seedAIKnowledge] data_dictionary 已有 ${existingDD} 条，跳过`);
  } else {
    const now = new Date().toISOString();
    for (let i = 0; i < DATA_DICTIONARY.length; i++) {
      const d = DATA_DICTIONARY[i];
      const id = `dd-${String(i + 1).padStart(3, '0')}`;
      db.run(
        `INSERT OR IGNORE INTO data_dictionary (id, category, dict_code, dict_name, dict_label, description, sort_number, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, d.category, d.dict_code, d.dict_name, d.dict_label, d.description, i + 1, 'active', now, now],
      );
    }
    console.log(`[seedAIKnowledge] data_dictionary 写入 ${DATA_DICTIONARY.length} 条`);
  }

  // 3. recommendation_rules
  const existingRR = (db.exec('SELECT COUNT(*) as n FROM recommendation_rules')[0]?.values?.[0]?.[0] as number) || 0;
  if (existingRR >= 10) {
    console.log(`[seedAIKnowledge] recommendation_rules 已有 ${existingRR} 条，跳过`);
  } else {
    const now = new Date().toISOString();
    for (let i = 0; i < RECOMMENDATION_RULES.length; i++) {
      const r = RECOMMENDATION_RULES[i];
      const id = `rr-${String(i + 1).padStart(3, '0')}`;
      db.run(
        `INSERT OR IGNORE INTO recommendation_rules (id, type, severity, title, action, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, r.type, r.severity, r.title, r.action, r.title, 'active', now, now],
      );
    }
    console.log(`[seedAIKnowledge] recommendation_rules 写入 ${RECOMMENDATION_RULES.length} 条`);
  }

  // 4. ai_recommendation_rules
  const existingAIR = (db.exec('SELECT COUNT(*) as n FROM ai_recommendation_rules')[0]?.values?.[0]?.[0] as number) || 0;
  if (existingAIR >= 8) {
    console.log(`[seedAIKnowledge] ai_recommendation_rules 已有 ${existingAIR} 条，跳过`);
  } else {
    const now = new Date().toISOString();
    for (let i = 0; i < AI_RECOMMENDATION_RULES.length; i++) {
      const r = AI_RECOMMENDATION_RULES[i];
      const id = `air-${String(i + 1).padStart(3, '0')}`;
      db.run(
        `INSERT OR IGNORE INTO ai_recommendation_rules (id, type, severity, title, action, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, r.type, r.severity, r.title, r.action, r.title, 'active', now, now],
      );
    }
    console.log(`[seedAIKnowledge] ai_recommendation_rules 写入 ${AI_RECOMMENDATION_RULES.length} 条`);
  }

  saveDatabase();
  console.log('[seedAIKnowledge] 完成！');
}

// 独立运行入口
if (require.main === module) {
  (async () => {
    try {
      await seedAIKnowledge();
      process.exit(0);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[seedAIKnowledge] failed:', e);
      process.exit(1);
    }
  })();
}
