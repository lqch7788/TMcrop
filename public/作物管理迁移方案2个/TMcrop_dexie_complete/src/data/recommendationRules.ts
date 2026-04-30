/**
 * 智能推荐规则配置
 * 包含环境异常检测规则、病虫害预警规则、作物阶段任务规则等
 */

import {
  EnvAlertRule,
  PestAlertRule,
  CropStageTaskMap,
  SkillOperationMap,
  RecommendationRule,
  FarmOperationType,
} from '../types/farm/common';

// ============================================
// 环境异常检测规则
// ============================================

/**
 * 环境异常检测规则
 * 定义各指标类型的阈值和推荐操作
 */
export const ENV_ALERT_RULES: EnvAlertRule[] = [
  // 温度相关
  {
    type: 'temperature',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 15, max: 35 },
    unit: '℃',
    action: ['irrigation', 'ventilation'],
    severity: 'warning',
  },
  {
    type: 'temperature',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 10, max: 40 },
    unit: '℃',
    action: ['irrigation', 'ventilation', 'shading'],
    severity: 'critical',
  },
  // 温度对水稻、小麦等大田作物
  {
    type: 'temperature',
    cropTypes: ['水稻', '小麦', '玉米', '大豆', '棉花'],
    thresholds: { min: 10, max: 38 },
    unit: '℃',
    action: ['irrigation', 'fertilization'],
    severity: 'warning',
  },

  // 湿度相关
  {
    type: 'humidity',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 40, max: 85 },
    unit: '%',
    action: ['irrigation', 'ventilation'],
    severity: 'warning',
  },
  {
    type: 'humidity',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 30, max: 90 },
    unit: '%',
    action: ['irrigation', 'ventilation', 'drainage'],
    severity: 'critical',
  },

  // 土壤湿度相关
  {
    type: 'soil_moisture',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 40, max: 80 },
    unit: '%',
    action: ['irrigation'],
    severity: 'warning',
  },
  {
    type: 'soil_moisture',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 30, max: 90 },
    unit: '%',
    action: ['irrigation', 'drainage'],
    severity: 'critical',
  },
  {
    type: 'soil_moisture',
    cropTypes: ['水稻'],
    thresholds: { min: 70, max: 100 },
    unit: '%',
    action: ['irrigation'],
    severity: 'warning',
  },
  {
    type: 'soil_moisture',
    cropTypes: ['水稻', '小麦', '玉米'],
    thresholds: { min: 20, max: 80 },
    unit: '%',
    action: ['irrigation'],
    severity: 'warning',
  },

  // 土壤EC值相关（盐分）
  {
    type: 'soil_ec',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 0.5, max: 2.5 },
    unit: 'mS/cm',
    action: ['irrigation', 'fertilization'],
    severity: 'warning',
  },
  {
    type: 'soil_ec',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 0.3, max: 3.5 },
    unit: 'mS/cm',
    action: ['irrigation', 'fertilization', 'soil_amendment'],
    severity: 'critical',
  },

  // 土壤pH值相关
  {
    type: 'soil_ph',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 5.5, max: 7.5 },
    unit: '',
    action: ['fertilization', 'soil_amendment'],
    severity: 'warning',
  },
  {
    type: 'soil_ph',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 5.0, max: 8.0 },
    unit: '',
    action: ['fertilization', 'soil_amendment'],
    severity: 'critical',
  },
  {
    type: 'soil_ph',
    cropTypes: ['水稻', '小麦'],
    thresholds: { min: 5.5, max: 8.0 },
    unit: '',
    action: ['fertilization'],
    severity: 'warning',
  },

  // 光照相关
  {
    type: 'light',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 500, max: 3000 },
    unit: 'lux',
    action: ['shading', 'supplemental_lighting'],
    severity: 'warning',
  },
  {
    type: 'light',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 300, max: 4000 },
    unit: 'lux',
    action: ['shading', 'supplemental_lighting', 'pruning'],
    severity: 'critical',
  },

  // CO2浓度相关
  {
    type: 'co2',
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    thresholds: { min: 350, max: 1000 },
    unit: 'ppm',
    action: ['ventilation', 'co2_enrichment'],
    severity: 'warning',
  },
];

// ============================================
// 病虫害预警规则
// ============================================

/**
 * 病虫害预警规则
 * 定义各类病虫害的关键词和推荐操作
 */
export const PEST_ALERT_RULES: PestAlertRule[] = [
  // 病害相关
  {
    keywords: ['灰霉病', '灰霉', '花腐'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '葡萄'],
    severity: 'critical',
    action: ['pest_control'],
    urgencyLevel: 5,
  },
  {
    keywords: ['白粉病', '白粉', '粉霉'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '葡萄', '小麦'],
    severity: 'critical',
    action: ['pest_control'],
    urgencyLevel: 5,
  },
  {
    keywords: ['疫病', '疫霉', '绵疫'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '土豆'],
    severity: 'critical',
    action: ['pest_control'],
    urgencyLevel: 5,
  },
  {
    keywords: ['枯萎病', '萎蔫', '黄萎'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '棉花'],
    severity: 'critical',
    action: ['pest_control', 'soil_amendment'],
    urgencyLevel: 5,
  },
  {
    keywords: ['根腐病', '烂根', '根朽'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '白菜'],
    severity: 'critical',
    action: ['pest_control', 'drainage', 'soil_amendment'],
    urgencyLevel: 5,
  },
  {
    keywords: ['炭疽病', '炭疽'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '葡萄', '西瓜'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 4,
  },
  {
    keywords: ['病毒病', '花叶', '卷叶', '黄化'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '烟草'],
    severity: 'critical',
    action: ['pest_control'],
    urgencyLevel: 5,
  },
  {
    keywords: ['叶霉病', '叶斑'],
    cropTypes: ['番茄', '黄瓜'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },
  {
    keywords: ['霜霉病', '霜霉'],
    cropTypes: ['黄瓜', '茄子', '白菜', '生菜', '菠菜'],
    severity: 'critical',
    action: ['pest_control'],
    urgencyLevel: 5,
  },
  {
    keywords: ['软腐病', '软腐'],
    cropTypes: ['白菜', '萝卜', '土豆', '番茄'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 4,
  },

  // 虫害相关
  {
    keywords: ['蚜虫', '蜜露', '卷叶'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '白菜', '棉花', '小麦'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },
  {
    keywords: ['红蜘蛛', '螨虫', '叶螨'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '豆类'],
    severity: 'critical',
    action: ['pest_control'],
    urgencyLevel: 4,
  },
  {
    keywords: ['白粉虱', '粉虱', '飞虱'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },
  {
    keywords: ['菜青虫', '青虫', '幼虫'],
    cropTypes: ['白菜', '萝卜', '油菜', '生菜'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },
  {
    keywords: ['小菜蛾', '蛾子'],
    cropTypes: ['白菜', '萝卜', '油菜', '甘蓝'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },
  {
    keywords: ['斑潜蝇', '潜蝇', '叶片隧道'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '豆类', '叶菜类'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },
  {
    keywords: ['蓟马', '锉吸'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '豆类'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },
  {
    keywords: ['地下害虫', '地老虎', '蛴螬', '蝼蛄'],
    cropTypes: ['玉米', '土豆', '花生', '大豆', '小麦'],
    severity: 'attention',
    action: ['pest_control', 'soil_amendment'],
    urgencyLevel: 4,
  },
  {
    keywords: ['蜗牛', '蛞蝓'],
    cropTypes: ['白菜', '萝卜', '草莓', '叶菜类'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 2,
  },
  {
    keywords: ['跳甲', '黄条跳甲'],
    cropTypes: ['白菜', '萝卜', '油菜', '叶菜类'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },

  // 生理性问题（按病虫害处理）
  {
    keywords: ['叶片发黄', '缺镁', '缺钾', '缺氮', '缺铁'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '玉米'],
    severity: 'attention',
    action: ['fertilization'],
    urgencyLevel: 2,
  },
  {
    keywords: ['徒长', '旺长'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    severity: 'attention',
    action: ['pruning', 'fertilization'],
    urgencyLevel: 2,
  },
  {
    keywords: ['日灼', '灼伤', '晒伤'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '葡萄'],
    severity: 'attention',
    action: ['shading', 'irrigation'],
    urgencyLevel: 3,
  },
  {
    keywords: ['裂果', '裂开'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓', '葡萄', '西瓜'],
    severity: 'attention',
    action: ['irrigation', 'pruning'],
    urgencyLevel: 3,
  },
  {
    keywords: ['畸形果', '畸形'],
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    severity: 'attention',
    action: ['pruning', 'fertilization'],
    urgencyLevel: 2,
  },
];

// ============================================
// 作物阶段任务定义
// ============================================

/**
 * 作物阶段任务映射
 * 定义各作物各生长阶段的推荐任务和间隔天数
 */
export const CROP_STAGE_TASK_MAP: CropStageTaskMap = {
  '番茄': {
    seedling: {
      tasks: ['irrigation', 'fertilization', 'pest_control'],
      nextStage: 'vegetative',
      duration: 15,
      intervalDays: 3,
    },
    vegetative: {
      tasks: ['planting', 'irrigation', 'fertilization', 'pruning'],
      nextStage: 'flowering',
      duration: 30,
      intervalDays: 5,
    },
    flowering: {
      tasks: ['irrigation', 'fertilization', 'pest_control', 'pruning'],
      nextStage: 'fruiting',
      duration: 20,
      intervalDays: 4,
    },
    fruiting: {
      tasks: ['irrigation', 'fertilization', 'pest_control', 'harvest', 'pruning'],
      nextStage: 'harvest',
      duration: 60,
      intervalDays: 3,
    },
    harvest: {
      tasks: ['harvest', 'pruning', 'pest_control'],
      duration: 30,
      intervalDays: 2,
    },
  },
  '黄瓜': {
    seedling: {
      tasks: ['irrigation', 'fertilization'],
      nextStage: 'vegetative',
      duration: 10,
      intervalDays: 3,
    },
    vegetative: {
      tasks: ['planting', 'irrigation', 'fertilization', 'pruning'],
      nextStage: 'flowering',
      duration: 20,
      intervalDays: 4,
    },
    flowering: {
      tasks: ['irrigation', 'fertilization', 'pest_control'],
      nextStage: 'fruiting',
      duration: 15,
      intervalDays: 3,
    },
    fruiting: {
      tasks: ['irrigation', 'fertilization', 'pest_control', 'harvest', 'pruning'],
      nextStage: 'harvest',
      duration: 45,
      intervalDays: 2,
    },
    harvest: {
      tasks: ['harvest', 'pruning'],
      duration: 30,
      intervalDays: 1,
    },
  },
  '草莓': {
    seedling: {
      tasks: ['irrigation', 'fertilization'],
      nextStage: 'vegetative',
      duration: 20,
      intervalDays: 4,
    },
    vegetative: {
      tasks: ['irrigation', 'fertilization', 'pruning'],
      nextStage: 'flowering',
      duration: 30,
      intervalDays: 5,
    },
    flowering: {
      tasks: ['irrigation', 'fertilization', 'pest_control'],
      nextStage: 'fruiting',
      duration: 20,
      intervalDays: 4,
    },
    fruiting: {
      tasks: ['irrigation', 'fertilization', 'pest_control', 'harvest'],
      nextStage: 'harvest',
      duration: 60,
      intervalDays: 2,
    },
    harvest: {
      tasks: ['harvest', 'pruning'],
      duration: 30,
      intervalDays: 1,
    },
  },
  '茄子': {
    seedling: {
      tasks: ['irrigation', 'fertilization'],
      nextStage: 'vegetative',
      duration: 15,
      intervalDays: 3,
    },
    vegetative: {
      tasks: ['planting', 'irrigation', 'fertilization', 'pruning'],
      nextStage: 'flowering',
      duration: 25,
      intervalDays: 5,
    },
    flowering: {
      tasks: ['irrigation', 'fertilization', 'pest_control'],
      nextStage: 'fruiting',
      duration: 20,
      intervalDays: 4,
    },
    fruiting: {
      tasks: ['irrigation', 'fertilization', 'pest_control', 'harvest', 'pruning'],
      nextStage: 'harvest',
      duration: 50,
      intervalDays: 3,
    },
    harvest: {
      tasks: ['harvest', 'pruning'],
      duration: 30,
      intervalDays: 2,
    },
  },
  '辣椒': {
    seedling: {
      tasks: ['irrigation', 'fertilization'],
      nextStage: 'vegetative',
      duration: 15,
      intervalDays: 3,
    },
    vegetative: {
      tasks: ['planting', 'irrigation', 'fertilization', 'pruning'],
      nextStage: 'flowering',
      duration: 25,
      intervalDays: 5,
    },
    flowering: {
      tasks: ['irrigation', 'fertilization', 'pest_control'],
      nextStage: 'fruiting',
      duration: 20,
      intervalDays: 4,
    },
    fruiting: {
      tasks: ['irrigation', 'fertilization', 'pest_control', 'harvest', 'pruning'],
      nextStage: 'harvest',
      duration: 50,
      intervalDays: 3,
    },
    harvest: {
      tasks: ['harvest', 'pruning'],
      duration: 30,
      intervalDays: 2,
    },
  },
  '水稻': {
    seedling: {
      tasks: ['irrigation', 'fertilization'],
      nextStage: 'vegetative',
      duration: 20,
      intervalDays: 4,
    },
    vegetative: {
      tasks: ['irrigation', 'fertilization', 'weeding'],
      nextStage: 'flowering',
      duration: 30,
      intervalDays: 7,
    },
    flowering: {
      tasks: ['irrigation', 'fertilization'],
      nextStage: 'fruiting',
      duration: 20,
      intervalDays: 5,
    },
    fruiting: {
      tasks: ['irrigation', 'pest_control', 'harvest'],
      nextStage: 'harvest',
      duration: 30,
      intervalDays: 7,
    },
    harvest: {
      tasks: ['harvest'],
      duration: 15,
      intervalDays: 3,
    },
  },
  '小麦': {
    seedling: {
      tasks: ['irrigation', 'fertilization'],
      nextStage: 'vegetative',
      duration: 20,
      intervalDays: 7,
    },
    vegetative: {
      tasks: ['irrigation', 'fertilization', 'weeding', 'pest_control'],
      nextStage: 'flowering',
      duration: 40,
      intervalDays: 10,
    },
    flowering: {
      tasks: ['irrigation', 'pest_control'],
      nextStage: 'fruiting',
      duration: 25,
      intervalDays: 7,
    },
    fruiting: {
      tasks: ['irrigation', 'pest_control', 'harvest'],
      nextStage: 'harvest',
      duration: 30,
      intervalDays: 7,
    },
    harvest: {
      tasks: ['harvest'],
      duration: 15,
      intervalDays: 5,
    },
  },
  '白菜': {
    seedling: {
      tasks: ['irrigation', 'fertilization'],
      nextStage: 'vegetative',
      duration: 10,
      intervalDays: 3,
    },
    vegetative: {
      tasks: ['irrigation', 'fertilization', 'weeding', 'pest_control'],
      nextStage: 'fruiting',
      duration: 30,
      intervalDays: 5,
    },
    fruiting: {
      tasks: ['irrigation', 'pest_control', 'harvest'],
      nextStage: 'harvest',
      duration: 20,
      intervalDays: 4,
    },
    harvest: {
      tasks: ['harvest'],
      duration: 10,
      intervalDays: 2,
    },
  },
};

// ============================================
// 技能操作映射
// ============================================

/**
 * 技能到农事操作的映射
 * 定义各操作类型需要的技能标签
 */
export const SKILL_OPERATION_MAP: SkillOperationMap = {
  irrigation: ['浇水灌溉', '灌溉系统操作', '水肥一体化'],
  fertilization: ['施肥作业', '水肥一体化', '基肥施用', '追肥操作'],
  pest_control: ['病虫害防治', '打药操作', '农药配制', '病害识别', '虫害识别', '生物防治'],
  pruning: ['修剪整枝', '嫁接技术', '疏花疏果'],
  harvest: ['采摘技能', '质检分级', '包装发货'],
  weeding: ['除草', '中耕作业'],
  planting: ['播种', '炼苗', '嫁接技术', '育苗管理'],
  other: [],
};

// ============================================
// 推荐规则配置
// ============================================

/**
 * 综合推荐规则
 * 用于智能推荐引擎的规则匹配
 */
export const RECOMMENDATION_RULES: RecommendationRule[] = [
  // 环境异常规则
  {
    id: 'RULE-ENV-001',
    name: '土壤湿度过低预警',
    type: 'env',
    enabled: true,
    conditions: [
      { field: 'soil_moisture', operator: '<', value: 40 },
    ],
    actions: {
      taskTypes: ['irrigation'],
      priority: 'high',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor'],
    },
    cooldownHours: 24,
    priority: 1,
  },
  {
    id: 'RULE-ENV-002',
    name: '土壤湿度过高预警',
    type: 'env',
    enabled: true,
    conditions: [
      { field: 'soil_moisture', operator: '>', value: 85 },
    ],
    actions: {
      taskTypes: ['drainage'],
      priority: 'high',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor'],
    },
    cooldownHours: 24,
    priority: 1,
  },
  {
    id: 'RULE-ENV-003',
    name: '温度过高预警',
    type: 'env',
    enabled: true,
    conditions: [
      { field: 'temperature', operator: '>', value: 35 },
    ],
    actions: {
      taskTypes: ['irrigation', 'ventilation'],
      priority: 'urgent',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor', 'manager'],
    },
    cooldownHours: 0,
    priority: 1,
  },
  {
    id: 'RULE-ENV-004',
    name: '温度过低预警',
    type: 'env',
    enabled: true,
    conditions: [
      { field: 'temperature', operator: '<', value: 15 },
    ],
    actions: {
      taskTypes: ['irrigation', 'ventilation', 'shading'],
      priority: 'urgent',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor', 'manager'],
    },
    cooldownHours: 0,
    priority: 1,
  },
  {
    id: 'RULE-ENV-005',
    name: '土壤EC值异常',
    type: 'env',
    enabled: true,
    conditions: [
      { field: 'soil_ec', operator: '>', value: 2.5 },
    ],
    actions: {
      taskTypes: ['irrigation', 'fertilization'],
      priority: 'high',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor'],
    },
    cooldownHours: 48,
    priority: 2,
  },

  // 病虫害规则
  {
    id: 'RULE-PEST-001',
    name: '灰霉病紧急处理',
    type: 'pest',
    enabled: true,
    conditions: [
      { field: 'issues', operator: 'contains', value: '灰霉病' },
    ],
    actions: {
      taskTypes: ['pest_control'],
      priority: 'urgent',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor', 'manager'],
    },
    cooldownHours: 0,
    priority: 1,
  },
  {
    id: 'RULE-PEST-002',
    name: '白粉病紧急处理',
    type: 'pest',
    enabled: true,
    conditions: [
      { field: 'issues', operator: 'contains', value: '白粉病' },
    ],
    actions: {
      taskTypes: ['pest_control'],
      priority: 'urgent',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor', 'manager'],
    },
    cooldownHours: 0,
    priority: 1,
  },
  {
    id: 'RULE-PEST-003',
    name: '红蜘蛛虫害处理',
    type: 'pest',
    enabled: true,
    conditions: [
      { field: 'issues', operator: 'contains', value: '红蜘蛛' },
    ],
    actions: {
      taskTypes: ['pest_control'],
      priority: 'high',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor'],
    },
    cooldownHours: 0,
    priority: 1,
  },
  {
    id: 'RULE-PEST-004',
    name: '蚜虫轻度发生',
    type: 'pest',
    enabled: true,
    conditions: [
      { field: 'issues', operator: 'contains', value: '蚜虫' },
    ],
    actions: {
      taskTypes: ['pest_control'],
      priority: 'medium',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor'],
    },
    cooldownHours: 48,
    priority: 2,
  },
  {
    id: 'RULE-PEST-005',
    name: '病毒病紧急处理',
    type: 'pest',
    enabled: true,
    conditions: [
      { field: 'issues', operator: 'contains', value: '病毒病' },
    ],
    actions: {
      taskTypes: ['pest_control'],
      priority: 'urgent',
      assignRule: 'skill_match',
      notifyUsers: ['supervisor', 'manager'],
    },
    cooldownHours: 0,
    priority: 1,
  },

  // 生长阶段规则
  {
    id: 'RULE-STAGE-001',
    name: '灌溉任务例行推荐',
    type: 'stage',
    enabled: true,
    conditions: [
      { field: 'task_type', operator: '==', value: 'irrigation' },
    ],
    actions: {
      taskTypes: ['irrigation'],
      priority: 'medium',
      assignRule: 'skill_match',
      notifyUsers: [],
    },
    cooldownHours: 72,
    priority: 3,
  },
  {
    id: 'RULE-STAGE-002',
    name: '施肥任务例行推荐',
    type: 'stage',
    enabled: true,
    conditions: [
      { field: 'task_type', operator: '==', value: 'fertilization' },
    ],
    actions: {
      taskTypes: ['fertilization'],
      priority: 'medium',
      assignRule: 'skill_match',
      notifyUsers: [],
    },
    cooldownHours: 120,
    priority: 3,
  },
  {
    id: 'RULE-STAGE-003',
    name: '病虫害防治例行推荐',
    type: 'stage',
    enabled: true,
    conditions: [
      { field: 'task_type', operator: '==', value: 'pest_control' },
    ],
    actions: {
      taskTypes: ['pest_control'],
      priority: 'medium',
      assignRule: 'skill_match',
      notifyUsers: [],
    },
    cooldownHours: 168,
    priority: 3,
  },

  // 周期性任务规则
  {
    id: 'RULE-PERIODIC-001',
    name: '每周灌溉检查',
    type: 'periodic',
    enabled: true,
    conditions: [
      { field: 'task_type', operator: '==', value: 'irrigation' },
    ],
    actions: {
      taskTypes: ['irrigation'],
      priority: 'low',
      assignRule: 'skill_match',
      notifyUsers: [],
    },
    cooldownHours: 168,
    priority: 4,
  },
  {
    id: 'RULE-PERIODIC-002',
    name: '每月施肥计划',
    type: 'periodic',
    enabled: true,
    conditions: [
      { field: 'task_type', operator: '==', value: 'fertilization' },
    ],
    actions: {
      taskTypes: ['fertilization'],
      priority: 'medium',
      assignRule: 'skill_match',
      notifyUsers: [],
    },
    cooldownHours: 720,
    priority: 4,
  },

  // 天气相关规则
  {
    id: 'RULE-WEATHER-001',
    name: '雨天前灌溉调整',
    type: 'weather',
    enabled: true,
    conditions: [
      { field: 'weather', operator: '==', value: '雨' },
    ],
    actions: {
      taskTypes: ['irrigation'],
      priority: 'low',
      assignRule: 'skill_match',
      notifyUsers: [],
    },
    cooldownHours: 24,
    priority: 3,
  },
  {
    id: 'RULE-WEATHER-002',
    name: '高温天灌溉加强',
    type: 'weather',
    enabled: true,
    conditions: [
      { field: 'temperature', operator: '>', value: 33 },
    ],
    actions: {
      taskTypes: ['irrigation'],
      priority: 'high',
      assignRule: 'skill_match',
      notifyUsers: [],
    },
    cooldownHours: 12,
    priority: 2,
  },
];

// ============================================
// 辅助函数
// ============================================

/**
 * 获取作物阶段任务
 */
export function getCropStageTasks(cropName: string, stage: string) {
  return CROP_STAGE_TASK_MAP[cropName]?.[stage] || null;
}

/**
 * 获取操作需要的技能
 */
export function getOperationSkills(operationType: FarmOperationType): string[] {
  return SKILL_OPERATION_MAP[operationType] || [];
}

/**
 * 查找匹配规则
 */
export function findMatchingRules(
  type: 'env' | 'pest' | 'stage' | 'periodic' | 'weather',
  conditions: Record<string, unknown>
): RecommendationRule[] {
  return RECOMMENDATION_RULES.filter(rule => {
    if (!rule.enabled || rule.type !== type) return false;

    return rule.conditions.every(condition => {
      const fieldValue = conditions[condition.field];
      switch (condition.operator) {
        case '==':
          return fieldValue === condition.value;
        case '!=':
          return fieldValue !== condition.value;
        case '>':
          return typeof fieldValue === 'number' && fieldValue > (condition.value as number);
        case '<':
          return typeof fieldValue === 'number' && fieldValue < (condition.value as number);
        case '>=':
          return typeof fieldValue === 'number' && fieldValue >= (condition.value as number);
        case '<=':
          return typeof fieldValue === 'number' && fieldValue <= (condition.value as number);
        case 'contains':
          return typeof fieldValue === 'string' && fieldValue.includes(condition.value as string);
        default:
          return false;
      }
    });
  });
}
