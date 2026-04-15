/**
 * 任务类型配置 - 核心类型定义
 * 用于农事任务表中不同任务类型的动态配置
 */

/**
 * 配置项类型枚举
 */
export type ConfigFieldType =
  | 'text'           // 文本输入
  | 'number'         // 数字输入
  | 'select'         // 下拉选择
  | 'multiSelect'    // 多选
  | 'textarea'       // 多行文本
  | 'multiEntry';    // 多条目输入（用于混合配比）

/**
 * 单个条目中的字段定义
 */
export interface EntryFieldDef {
  /** 字段键名 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 字段类型 */
  type: 'text' | 'select' | 'number';
  /** 单位 */
  unit?: string;
  /** 下拉选项（当type为select时） */
  options?: { value: string; label: string }[];
  /** 占位文本 */
  placeholder?: string;
}

/**
 * 多条目配置定义（用于混合配比）
 */
export interface MultiEntryDef {
  /** 条目显示名称 */
  entryLabel: string;
  /** 每条记录的字段定义 */
  fields: EntryFieldDef[];
  /** 最大条目数 */
  maxEntries?: number;
  /** 是否必填至少一条 */
  required?: boolean;
}

/**
 * 单个混合条目记录
 */
export interface MultiEntryRecord {
  /** 记录唯一ID */
  id: string;
  /** 各字段值 */
  [key: string]: string | number;
}

/**
 * 配置项定义
 */
export interface TaskConfigField {
  /** 字段键名 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 字段类型 */
  type: ConfigFieldType;
  /** 占位文本 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 单位（如 "kg/亩", "倍"） */
  unit?: string;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步进值 */
  step?: number;
  /** 下拉选项 */
  options?: { value: string; label: string }[];
  /** 默认值 */
  defaultValue?: string | number | boolean | string[];
  /** 依赖字段（当选中某任务类型时显示） */
  dependsOn?: string[];
  /** 多条目配置（当type为multiEntry时） */
  multiEntryDef?: MultiEntryDef;
}

/**
 * 任务类型配置
 */
export interface TaskTypeConfig {
  /** 类型值（如 'fertilization'） */
  value: string;
  /** 显示名称（如 '施肥'） */
  label: string;
  /** 图标组件名（字符串形式） */
  icon: string;
  /** 颜色类名（如 'bg-green-500'） */
  color: string;
  /** 任务大类 */
  category: 'agriculture' | 'management' | 'harvest';
  /** 配置项列表 */
  configFields: TaskConfigField[];
  /** 默认备注模板 */
  defaultRemarks?: string;
  /** SOP模板 */
  sopTemplate?: string;
}

/**
 * 任务类型配置数据 - 施肥（支持多种肥料混合）
 */
const fertilizationConfig: TaskTypeConfig = {
  value: 'fertilization',
  label: '施肥',
  icon: 'Leaf',
  color: 'bg-green-500',
  category: 'agriculture',
  configFields: [
    {
      key: 'fertilizerMix',
      label: '肥料配比',
      type: 'multiEntry',
      required: true,
      multiEntryDef: {
        entryLabel: '肥料',
        maxEntries: 10,
        fields: [
          {
            key: 'fertilizerType',
            label: '肥料种类',
            type: 'select',
            options: [
              { value: 'urea', label: '尿素' },
              { value: 'compound', label: '复合肥' },
              { value: 'organic', label: '有机肥' },
              { value: 'waterSoluble', label: '水溶肥' },
              { value: 'potassium', label: '钾肥' },
              { value: 'nitrogen', label: '氮肥' },
              { value: 'phosphorus', label: '磷肥' },
              { value: 'microbial', label: '微生物菌剂' },
              { value: 'other', label: '其他' },
            ],
          },
          {
            key: 'quantity',
            label: '用量',
            type: 'number',
            unit: 'kg/亩',
          },
          {
            key: 'dilutionRatio',
            label: '稀释倍数',
            type: 'number',
            unit: '倍',
          },
        ],
      },
    },
    {
      key: 'applicationMethod',
      label: '施用方式',
      type: 'select',
      options: [
        { value: 'drip', label: '滴灌' },
        { value: 'spray', label: '叶面喷施' },
        { value: 'base', label: '基肥' },
        { value: 'topdress', label: '追肥' },
      ],
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
      placeholder: '补充说明，如天气条件、注意事项等',
    },
  ],
  defaultRemarks: '避免雨前4小时施用',
};

/**
 * 任务类型配置数据 - 灌溉
 */
const irrigationConfig: TaskTypeConfig = {
  value: 'irrigation',
  label: '灌溉',
  icon: 'Droplets',
  color: 'bg-blue-500',
  category: 'agriculture',
  configFields: [
    {
      key: 'waterAmount',
      label: '灌溉量',
      type: 'number',
      required: true,
      unit: 'm³/亩',
      min: 0,
      step: 1,
    },
    {
      key: 'irrigationMethod',
      label: '灌溉方式',
      type: 'select',
      required: true,
      options: [
        { value: 'drip', label: '滴灌' },
        { value: 'sprinkler', label: '喷灌' },
        { value: 'flood', label: '漫灌' },
        { value: 'furrow', label: '沟灌' },
      ],
    },
    {
      key: 'duration',
      label: '灌溉时长',
      type: 'number',
      unit: '分钟/亩',
      min: 0,
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
      placeholder: '补充说明',
    },
  ],
};

/**
 * 任务类型配置数据 - 灌根
 */
const rootIrrigationConfig: TaskTypeConfig = {
  value: 'rootIrrigation',
  label: '灌根',
  icon: 'Droplets',
  color: 'bg-cyan-500',
  category: 'agriculture',
  configFields: [
    {
      key: 'waterAmount',
      label: '用水量',
      type: 'number',
      required: true,
      unit: 'L/株',
      min: 0,
      step: 0.5,
    },
    {
      key: 'addFertilizer',
      label: '是否添加肥料',
      type: 'select',
      options: [
        { value: 'none', label: '不使用' },
        { value: 'waterSoluble', label: '水溶肥' },
        { value: 'liquid', label: '液体肥' },
      ],
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
    },
  ],
};

/**
 * 任务类型配置数据 - 植保
 */
const pesticideConfig: TaskTypeConfig = {
  value: 'pesticide',
  label: '植保',
  icon: 'Bug',
  color: 'bg-red-500',
  category: 'agriculture',
  configFields: [
    {
      key: 'applicationMethod',
      label: '植保方式',
      type: 'select',
      required: true,
      options: [
        { value: 'spray', label: '叶面喷雾' },
        { value: 'fumigation', label: '熏蒸' },
        { value: 'rootIrrigation', label: '灌根' },
        { value: 'drip', label: '滴灌' },
        { value: 'physical', label: '物理防治' },
        { value: 'biological', label: '生物防治' },
        { value: 'soil', label: '土壤处理' },
        { value: 'smearing', label: '涂抹' },
        { value: 'mist', label: '弥雾' },
      ],
    },
    {
      key: 'pesticideMix',
      label: '药剂配比',
      type: 'multiEntry',
      dependsOn: ['applicationMethod'],
      multiEntryDef: {
        entryLabel: '药剂',
        maxEntries: 10,
        fields: [
          {
            key: 'pesticideType',
            label: '药剂种类',
            type: 'select',
            options: [
              { value: 'fungicide', label: '杀菌剂' },
              { value: 'insecticide', label: '杀虫剂' },
              { value: 'acaricide', label: '杀螨剂' },
              { value: 'herbicide', label: '除草剂' },
              { value: 'growthRegulator', label: '生长调节剂' },
              { value: 'other', label: '其他' },
            ],
          },
          {
            key: 'pesticideName',
            label: '药剂名称',
            type: 'text',
            placeholder: '如：多菌灵、吡虫啉',
          },
          {
            key: 'dosage',
            label: '用量',
            type: 'number',
            unit: 'g/亩',
          },
          {
            key: 'dilutionRatio',
            label: '稀释倍数',
            type: 'number',
            unit: '倍',
          },
        ],
      },
    },
    {
      key: 'physicalMethod',
      label: '物理防治方法',
      type: 'multiSelect',
      dependsOn: ['applicationMethod:physical'],
      options: [
        { value: 'sticky', label: '粘虫板' },
        { value: 'light', label: '杀虫灯' },
        { value: 'net', label: '防虫网' },
        { value: 'bag', label: '套袋' },
        { value: 'trap', label: '诱捕器' },
      ],
    },
    {
      key: 'biologicalMethod',
      label: '生物防治方法',
      type: 'multiSelect',
      dependsOn: ['applicationMethod:biological'],
      options: [
        { value: 'beneficial', label: '释放天敌' },
        { value: 'bt', label: 'BT生物农药' },
        { value: 'pheromone', label: '性诱剂' },
        { value: 'fungi', label: '真菌制剂' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'targetPest',
      label: '防治对象',
      type: 'text',
      placeholder: '如：蚜虫、红蜘蛛、白粉病',
    },
    {
      key: 'safetyInterval',
      label: '安全间隔期',
      type: 'number',
      unit: '天',
      min: 0,
    },
    {
      key: 'protectiveGear',
      label: '防护装备',
      type: 'multiSelect',
      options: [
        { value: 'mask', label: '口罩' },
        { value: 'gloves', label: '手套' },
        { value: 'goggles', label: '护目镜' },
        { value: 'suit', label: '防护服' },
      ],
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
    },
  ],
};

/**
 * 任务类型配置数据 - 修剪
 */
const pruningConfig: TaskTypeConfig = {
  value: 'pruning',
  label: '修剪',
  icon: 'Scissors',
  color: 'bg-purple-500',
  category: 'agriculture',
  configFields: [
    {
      key: 'pruningType',
      label: '修剪类型',
      type: 'select',
      required: true,
      options: [
        { value: 'shaping', label: '整形修剪' },
        { value: 'sanitation', label: '卫生修剪' },
        { value: 'rejuvenation', label: '更新修剪' },
        { value: 'pinching', label: '摘心' },
        { value: 'thinning', label: '疏枝' },
      ],
    },
    {
      key: 'tools',
      label: '工具',
      type: 'multiSelect',
      options: [
        { value: 'pruningShear', label: '修枝剪' },
        { value: 'saw', label: '手锯' },
        { value: 'machete', label: '砍刀' },
        { value: 'ladder', label: '梯子' },
      ],
    },
    {
      key: 'targetArea',
      label: '修剪部位',
      type: 'text',
      placeholder: '如：主干、侧枝',
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
    },
  ],
};

/**
 * 任务类型配置数据 - 定植
 */
const plantingConfig: TaskTypeConfig = {
  value: 'planting',
  label: '定植',
  icon: 'Trees',
  color: 'bg-lime-500',
  category: 'agriculture',
  configFields: [
    {
      key: 'seedlingType',
      label: '苗种类',
      type: 'select',
      required: true,
      options: [
        { value: 'tomato', label: '番茄苗' },
        { value: 'cucumber', label: '黄瓜苗' },
        { value: 'strawberry', label: '草莓苗' },
        { value: 'pepper', label: '辣椒苗' },
        { value: 'lettuce', label: '生菜苗' },
        { value: 'watermelon', label: '西瓜苗' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'seedlingQuantity',
      label: '用苗量',
      type: 'number',
      required: true,
      unit: '株/亩',
      min: 0,
    },
    {
      key: 'plantingDensity',
      label: '种植密度',
      type: 'text',
      placeholder: '如：30cm × 60cm',
    },
    {
      key: 'rootingAgent',
      label: '生根剂',
      type: 'select',
      options: [
        { value: 'none', label: '不使用' },
        { value: 'used', label: '使用' },
      ],
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
    },
  ],
};

/**
 * 任务类型配置数据 - 采收
 */
const harvestConfig: TaskTypeConfig = {
  value: 'harvest',
  label: '采收',
  icon: 'ShoppingBasket',
  color: 'bg-orange-500',
  category: 'harvest',
  configFields: [
    {
      key: 'maturityStandard',
      label: '成熟度标准',
      type: 'select',
      required: true,
      options: [
        { value: '90', label: '90%成熟' },
        { value: '80', label: '80%成熟' },
        { value: 'full', label: '完全成熟' },
      ],
    },
    {
      key: 'estimatedYield',
      label: '预估产量',
      type: 'number',
      unit: 'kg',
      min: 0,
    },
    {
      key: 'qualityGrade',
      label: '品质等级',
      type: 'multiSelect',
      options: [
        { value: 'A', label: 'A级' },
        { value: 'B', label: 'B级' },
        { value: 'C', label: 'C级' },
      ],
    },
    {
      key: 'tools',
      label: '工具',
      type: 'multiSelect',
      options: [
        { value: 'basket', label: '采摘篮' },
        { value: 'scissors', label: '剪刀' },
        { value: 'cart', label: '手推车' },
        { value: 'scale', label: '电子秤' },
      ],
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
    },
  ],
};

/**
 * 任务类型配置数据 - 除草
 */
const weedingConfig: TaskTypeConfig = {
  value: 'weeding',
  label: '除草',
  icon: 'Trees',
  color: 'bg-emerald-500',
  category: 'agriculture',
  configFields: [
    {
      key: 'weedingMethod',
      label: '除草方式',
      type: 'select',
      required: true,
      options: [
        { value: 'manual', label: '人工除草' },
        { value: 'mechanical', label: '机械除草' },
        { value: 'chemical', label: '化学除草' },
      ],
    },
    {
      key: 'weedingDepth',
      label: '除草深度',
      type: 'number',
      unit: 'cm',
      min: 0,
      max: 15,
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
    },
  ],
};

/**
 * 任务类型配置数据 - 其他
 */
const otherConfig: TaskTypeConfig = {
  value: 'other',
  label: '其他',
  icon: 'Edit',
  color: 'bg-gray-500',
  category: 'management',
  configFields: [
    {
      key: 'customRemarks',
      label: '任务说明',
      type: 'textarea',
      required: true,
      placeholder: '请输入任务详细说明',
    },
  ],
};

/**
 * 所有任务类型配置
 */
export const TASK_TYPE_CONFIGS: TaskTypeConfig[] = [
  fertilizationConfig,
  irrigationConfig,
  pruningConfig,
  pesticideConfig,
  rootIrrigationConfig,
  plantingConfig,
  harvestConfig,
  weedingConfig,
  otherConfig,
];

/**
 * 任务类型配置映射
 */
export const TASK_TYPE_CONFIG_MAP: Record<string, TaskTypeConfig> = TASK_TYPE_CONFIGS.reduce(
  (acc, config) => {
    acc[config.value] = config;
    return acc;
  },
  {} as Record<string, TaskTypeConfig>
);

/**
 * 获取任务类型的配置
 */
export function getTaskTypeConfig(taskType: string): TaskTypeConfig | undefined {
  return TASK_TYPE_CONFIG_MAP[taskType];
}
