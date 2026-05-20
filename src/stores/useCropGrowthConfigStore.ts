/**
 * 作物生长配置 Store — V3.0 Phase 6a
 *
 * 架构: 利用 system_configs 表存储 JSON blob（遵循 approval.delegation.rules 模式）
 * 数据流: useSystemConfigStore → useCropGrowthConfigStore → useCropGrowthEngine
 *
 * 替代对象:
 *   CROP_CONFIGS → crop.growth.crop-configs (JSON)
 *   PEST_ALERT_RULES → crop.pest.alert-rules (JSON)
 *   GROWTH_STAGE_CONFIG → crop.growth.stage-days (JSON)
 */

import { create } from 'zustand';
import { useSystemConfigStore } from './useSystemConfigStore';

// ==================== 类型定义 ====================

/** 生长阶段 */
export type GrowthStage = 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest';

/** 生长阶段天数配置 */
export interface GrowthStageDays {
  seedling: number;
  vegetative: number;
  flowering: number;
  fruiting: number;
  harvest: number;
}

/** 阶段任务配置项 */
export interface CropTaskItem {
  type: string;
  typeName: string;
  frequency: number;
  priority: 'high' | 'medium' | 'low';
  skillRequired: string[];
  estimatedHours: number;
  description: string;
}

/** 作物阶段配置 */
export interface CropStageEntry {
  stage: GrowthStage;
  startDay: number;
  endDay: number;
  tasks: CropTaskItem[];
}

/** 作物完整配置 */
export interface CropGrowthConfig {
  name: string;
  stages: CropStageEntry[];
}

/** 病虫害预警规则 */
export interface PestAlertRule {
  id: string;
  name: string;
  symptom: string[];
  cropType: string[];
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

// ==================== 默认值（兜底，与种子数据一致） ====================

const DEFAULT_STAGE_DAYS: GrowthStageDays = {
  seedling: 30,
  vegetative: 45,
  flowering: 30,
  fruiting: 40,
  harvest: 20,
};

const DEFAULT_CROP_CONFIGS: CropGrowthConfig[] = [
  {
    name: '番茄',
    stages: [
      {
        stage: 'seedling', startDay: 1, endDay: 30,
        tasks: [
          { type: 'irrigation', typeName: '灌溉', frequency: 2, priority: 'high', skillRequired: ['微喷灌溉', '滴灌操作'], estimatedHours: 1, description: '幼苗期需保持土壤湿润' },
          { type: 'fertilization', typeName: '施肥', frequency: 7, priority: 'medium', skillRequired: ['施肥操作', '水肥一体化'], estimatedHours: 2, description: '幼苗期以氮肥为主促进生长' },
        ],
      },
      {
        stage: 'vegetative', startDay: 31, endDay: 75,
        tasks: [
          { type: 'irrigation', typeName: '灌溉', frequency: 2, priority: 'high', skillRequired: ['微喷灌溉', '滴灌操作'], estimatedHours: 1.5, description: '营养生长期需定期灌溉' },
          { type: 'fertilization', typeName: '施肥', frequency: 10, priority: 'high', skillRequired: ['施肥操作', '水肥一体化'], estimatedHours: 2, description: '营养生长期补充复合肥' },
          { type: 'pruning', typeName: '整枝', frequency: 14, priority: 'medium', skillRequired: ['整枝修剪'], estimatedHours: 3, description: '及时摘除侧枝' },
          { type: 'scouting', typeName: '巡田', frequency: 5, priority: 'medium', skillRequired: ['病害识别', '巡田检查'], estimatedHours: 1, description: '检查植株健康状况' },
        ],
      },
      {
        stage: 'flowering', startDay: 76, endDay: 105,
        tasks: [
          { type: 'irrigation', typeName: '灌溉', frequency: 3, priority: 'high', skillRequired: ['微喷灌溉', '滴灌操作'], estimatedHours: 1.5, description: '花期需保证水分供应' },
          { type: 'fertilization', typeName: '施肥', frequency: 7, priority: 'high', skillRequired: ['施肥操作', '水肥一体化'], estimatedHours: 2, description: '花期增施磷钾肥' },
          { type: 'pruning', typeName: '整枝', frequency: 10, priority: 'medium', skillRequired: ['整枝修剪'], estimatedHours: 2, description: '调整植株结构' },
        ],
      },
      {
        stage: 'fruiting', startDay: 106, endDay: 145,
        tasks: [
          { type: 'irrigation', typeName: '灌溉', frequency: 2, priority: 'high', skillRequired: ['微喷灌溉', '滴灌操作'], estimatedHours: 1.5, description: '结果期需充足水分' },
          { type: 'fertilization', typeName: '施肥', frequency: 7, priority: 'high', skillRequired: ['施肥操作', '水肥一体化'], estimatedHours: 2, description: '结果期补充钾肥' },
          { type: 'spraying', typeName: '病虫防治', frequency: 14, priority: 'high', skillRequired: ['农药配制', '喷雾操作', '生物防治'], estimatedHours: 2, description: '防治病虫害' },
          { type: 'pruning', typeName: '整枝', frequency: 14, priority: 'medium', skillRequired: ['整枝修剪', '疏花疏果'], estimatedHours: 3, description: '疏果和整理植株' },
        ],
      },
      {
        stage: 'harvest', startDay: 146, endDay: 165,
        tasks: [
          { type: 'harvest', typeName: '采收', frequency: 3, priority: 'high', skillRequired: ['果蔬采收', '分级包装'], estimatedHours: 4, description: '及时采收成熟果实' },
          { type: 'scouting', typeName: '巡田', frequency: 5, priority: 'low', skillRequired: ['病害识别', '巡田检查'], estimatedHours: 1, description: '检查植株状况' },
        ],
      },
    ],
  },
];

const DEFAULT_PEST_RULES: PestAlertRule[] = [
  {
    id: 'pest_aphid', name: '蚜虫预警', symptom: ['蚜虫', '蚜', '虫眼', '卷叶'],
    cropType: ['番茄', '黄瓜', '辣椒'], severity: 'high',
    suggestion: '发现蚜虫，立即进行生物防治或药物喷洒', priority: 'high',
  },
  {
    id: 'pest_powdery_mildew', name: '白粉病预警', symptom: ['白粉', '粉末', '叶面白', '粉状'],
    cropType: ['番茄', '黄瓜', '南瓜'], severity: 'high',
    suggestion: '发现白粉病症状，使用杀菌剂防治', priority: 'high',
  },
  {
    id: 'pest_rot', name: '腐烂病预警', symptom: ['腐烂', '软腐', '水渍'],
    cropType: ['番茄', '辣椒'], severity: 'high',
    suggestion: '发现腐烂病株，立即清除并喷洒杀菌剂', priority: 'high',
  },
  {
    id: 'pest_yellow_leaf', name: '黄叶病预警', symptom: ['黄叶', '叶片发黄', '叶脉黄'],
    cropType: ['番茄', '黄瓜'], severity: 'medium',
    suggestion: '检查是否为营养缺乏或病害，进行对症处理', priority: 'medium',
  },
];

// ==================== Store ====================

interface CropGrowthConfigState {
  /** 生长阶段天数配置 */
  getStageDays: () => GrowthStageDays;
  /** 获取所有作物生长配置 */
  getCropConfigs: () => CropGrowthConfig[];
  /** 获取指定作物的生长配置 */
  getCropConfig: (cropName: string) => CropGrowthConfig | undefined;
  /** 获取所有病虫害预警规则 */
  getPestAlertRules: () => PestAlertRule[];
  /** 获取支持的作物名称列表 */
  getSupportedCrops: () => string[];
  /** 刷新（强制重新读取 system_configs） */
  refresh: () => void;
}

export const useCropGrowthConfigStore = create<CropGrowthConfigState>(() => ({
  getStageDays: () => {
    try {
      const configs = useSystemConfigStore.getState().configs;
      const entry = configs.find(c => c.configKey === 'crop.growth.stage-days' && c.isActive);
      if (entry?.configValue) {
        return { ...DEFAULT_STAGE_DAYS, ...JSON.parse(entry.configValue) };
      }
    } catch { /* 解析失败使用默认值 */ }
    return DEFAULT_STAGE_DAYS;
  },

  getCropConfigs: () => {
    try {
      const configs = useSystemConfigStore.getState().configs;
      const entry = configs.find(c => c.configKey === 'crop.growth.crop-configs' && c.isActive);
      if (entry?.configValue) {
        return JSON.parse(entry.configValue) as CropGrowthConfig[];
      }
    } catch { /* 解析失败使用默认值 */ }
    return DEFAULT_CROP_CONFIGS;
  },

  getCropConfig: (cropName: string) => {
    try {
      const configs = useSystemConfigStore.getState().configs;
      const entry = configs.find(c => c.configKey === 'crop.growth.crop-configs' && c.isActive);
      if (entry?.configValue) {
        const all = JSON.parse(entry.configValue) as CropGrowthConfig[];
        return all.find(c => c.name === cropName);
      }
    } catch { /* 解析失败使用默认值 */ }
    return DEFAULT_CROP_CONFIGS.find(c => c.name === cropName);
  },

  getPestAlertRules: () => {
    try {
      const configs = useSystemConfigStore.getState().configs;
      const entry = configs.find(c => c.configKey === 'crop.pest.alert-rules' && c.isActive);
      if (entry?.configValue) {
        return JSON.parse(entry.configValue) as PestAlertRule[];
      }
    } catch { /* 解析失败使用默认值 */ }
    return DEFAULT_PEST_RULES;
  },

  getSupportedCrops: () => {
    try {
      const configs = useSystemConfigStore.getState().configs;
      const entry = configs.find(c => c.configKey === 'crop.growth.crop-configs' && c.isActive);
      if (entry?.configValue) {
        const all = JSON.parse(entry.configValue) as CropGrowthConfig[];
        return all.map(c => c.name);
      }
    } catch { /* 解析失败使用默认值 */ }
    return DEFAULT_CROP_CONFIGS.map(c => c.name);
  },

  refresh: () => {
    useSystemConfigStore.getState().loadConfigs();
  },
}));
