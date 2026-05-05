/**
 * 作物阶段任务配置
 * 用于月度任务规划 - 扩展支持更多作物类型
 *
 * 配置说明：
 * - taskType: 任务类型标识
 * - taskTypeName: 任务类型中文名称
 * - intervalDays: 任务执行间隔天数
 * - baseHours: 基准工时（基于100m²面积）
 * - baseWorkers: 基准人数
 */

// ============================================
// 任务配置类型定义
// ============================================

export interface StageTaskConfig {
  taskType: string;
  taskTypeName: string;
  intervalDays: number;
  baseHours: number;
  baseWorkers: number;
}

export type CropStageConfig = Record<string, StageTaskConfig[]>;
export type CropStageTaskConfig = Record<string, CropStageConfig>;

// ============================================
// 作物阶段任务配置
// ============================================

/**
 * 作物阶段任务配置映射
 * 支持的作物：番茄、黄瓜、辣椒、生菜、水稻、小麦、玉米、叶菜类等
 */
export const CROP_STAGE_TASK_CONFIG: CropStageTaskConfig = {
  // ========== 茄果类 ==========
  '番茄': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'pruning', taskTypeName: '修剪', intervalDays: 7, baseHours: 3, baseWorkers: 2 },
      { taskType: 'weeding', taskTypeName: '除草', intervalDays: 10, baseHours: 2, baseWorkers: 1 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
    ],
    'fruiting': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 2, baseHours: 4, baseWorkers: 3 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 5, baseWorkers: 4 },
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
    ],
  },

  '茄子': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'pruning', taskTypeName: '修剪', intervalDays: 10, baseHours: 2.5, baseWorkers: 2 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
    ],
    'fruiting': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 2, baseHours: 4, baseWorkers: 3 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 5, baseWorkers: 4 },
    ],
  },

  '辣椒': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 2 },
      { taskType: 'pruning', taskTypeName: '修剪', intervalDays: 10, baseHours: 2, baseWorkers: 1 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
    ],
    'fruiting': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 2, baseHours: 3.5, baseWorkers: 3 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 4, baseWorkers: 3 },
    ],
  },

  // ========== 瓜类 ==========
  '黄瓜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 2 },
      { taskType: 'pruning', taskTypeName: '修剪', intervalDays: 7, baseHours: 2.5, baseWorkers: 2 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
    ],
    'fruiting': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 4, baseHours: 2, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 4, baseWorkers: 3 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 5, baseWorkers: 4 },
    ],
  },

  '西瓜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'pruning', taskTypeName: '修剪', intervalDays: 7, baseHours: 3, baseWorkers: 2 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
    ],
    'fruiting': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 2, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 2, baseHours: 4, baseWorkers: 3 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 5, baseWorkers: 4 },
    ],
  },

  '甜瓜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 2 },
      { taskType: 'pruning', taskTypeName: '修剪', intervalDays: 7, baseHours: 2.5, baseWorkers: 2 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
    ],
    'fruiting': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 2, baseHours: 4, baseWorkers: 3 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 5, baseWorkers: 4 },
    ],
  },

  // ========== 叶菜类 ==========
  '生菜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 0.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 0.8, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'weeding', taskTypeName: '除草', intervalDays: 10, baseHours: 1.5, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 3, baseWorkers: 2 },
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 0.5, baseWorkers: 1 },
    ],
  },

  '菠菜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 0.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 2.5, baseWorkers: 2 },
    ],
  },

  '白菜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 0.8, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 1 },
      { taskType: 'weeding', taskTypeName: '除草', intervalDays: 10, baseHours: 1.5, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 3, baseWorkers: 2 },
    ],
  },

  '油菜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 1, baseHours: 0.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 2.5, baseWorkers: 2 },
    ],
  },

  '甘蓝': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 1 },
      { taskType: 'weeding', taskTypeName: '除草', intervalDays: 10, baseHours: 1.5, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 3.5, baseWorkers: 2 },
    ],
  },

  // ========== 豆类 ==========
  '豆角': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 1 },
      { taskType: 'pruning', taskTypeName: '修剪', intervalDays: 10, baseHours: 2, baseWorkers: 1 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 5, baseHours: 2, baseWorkers: 1 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 1.5, baseWorkers: 2 },
    ],
    'fruiting': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 1.5, baseWorkers: 2 },
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 3, baseWorkers: 2 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 4, baseWorkers: 3 },
    ],
  },

  '豌豆': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.8, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.8, baseWorkers: 1 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 3, baseWorkers: 2 },
    ],
  },

  // ========== 根茎类 ==========
  '萝卜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'weeding', taskTypeName: '除草', intervalDays: 10, baseHours: 1.5, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 3, baseWorkers: 2 },
    ],
  },

  '胡萝卜': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 0.8, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 1.5, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 3.5, baseWorkers: 2 },
    ],
  },

  '土豆': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 3, baseHours: 0.5, baseWorkers: 1 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 1 },
      { taskType: 'weeding', taskTypeName: '除草', intervalDays: 10, baseHours: 1.5, baseWorkers: 1 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 4, baseWorkers: 3 },
    ],
  },

  // ========== 粮食类 ==========
  '水稻': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'weeding', taskTypeName: '除草', intervalDays: 10, baseHours: 2, baseWorkers: 2 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2, baseWorkers: 2 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 5, baseWorkers: 4 },
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 3, baseHours: 1, baseWorkers: 1 },
    ],
  },

  '小麦': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 3, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 10, baseHours: 2, baseWorkers: 2 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 3, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 10, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 14, baseHours: 2, baseWorkers: 2 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 5, baseWorkers: 4 },
    ],
  },

  '玉米': {
    'seedling': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 3, baseHours: 1, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 10, baseHours: 2, baseWorkers: 2 },
    ],
    'vegetative': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'fertilization', taskTypeName: '施肥', intervalDays: 7, baseHours: 2.5, baseWorkers: 2 },
      { taskType: 'weeding', taskTypeName: '除草', intervalDays: 14, baseHours: 2, baseWorkers: 2 },
    ],
    'flowering': [
      { taskType: 'irrigation', taskTypeName: '灌溉', intervalDays: 2, baseHours: 1.5, baseWorkers: 1 },
      { taskType: 'plant_protection', taskTypeName: '植保', intervalDays: 10, baseHours: 2, baseWorkers: 2 },
    ],
    'harvest': [
      { taskType: 'harvest', taskTypeName: '采收', intervalDays: 1, baseHours: 5, baseWorkers: 4 },
    ],
  },
};

// ============================================
// 默认配置（当作物没有特定配置时使用）
// ============================================

export const DEFAULT_TASK_CONFIG: StageTaskConfig = {
  taskType: 'irrigation',
  taskTypeName: '灌溉',
  intervalDays: 2,
  baseHours: 1.5,
  baseWorkers: 1,
};

// ============================================
// 辅助函数
// ============================================

/**
 * 获取作物的阶段任务配置
 * @param cropName 作物名称
 * @returns 作物配置，如果不存在则返回null
 */
export function getCropConfig(cropName: string): CropStageConfig | null {
  return CROP_STAGE_TASK_CONFIG[cropName] || null;
}

/**
 * 检查作物是否有特定配置
 * @param cropName 作物名称
 * @returns 是否存在特定配置
 */
export function hasCropConfig(cropName: string): boolean {
  return cropName in CROP_STAGE_TASK_CONFIG;
}

/**
 * 获取所有支持的作物名称列表
 * @returns 作物名称数组
 */
export function getSupportedCrops(): string[] {
  return Object.keys(CROP_STAGE_TASK_CONFIG);
}
