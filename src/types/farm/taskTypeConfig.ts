/**
 * 任务类型配置 - 核心类型定义
 * 用于农事任务表中不同任务类型的动态配置
 */

// 2026-10-21：灌溉配置的「灌溉方式」与「单位」改为复用浇水明细的常量，
//   保证任务配置与水肥管理台账口径一致（此前两处各写一份选项，已漂移）
import { WATERING_METHOD_OPTIONS } from '../../constants/cropConstants';
import { WATER_UNIT_OPTIONS } from '../../constants/waterUnits';

/**
 * 配置项类型枚举
 */
export type ConfigFieldType =
  | 'text'           // 文本输入
  | 'number'         // 数字输入
  | 'select'         // 下拉选择
  | 'multiSelect'    // 多选
  | 'textarea'       // 多行文本
  | 'multiEntry'     // 多条目输入（用于混合配比）
  | 'fertilizerPool' // 肥料池（2026-10-21 新增：复用 FertilizerPoolEditor，
                    //   与「水肥管理 → 新增施肥记录」的肥料选择与用量同模式）
  | 'targetPestPicker' // 目标病虫害多选（2026-10-21 新增：复用 TargetPestPicker）
  | 'pesticidePool'   // 防治药剂池（2026-10-21 新增：复用 PesticidePoolEditor）
  | 'seedSourceSelect' // 种源搜索下拉（2026-10-21 新增：关联内部种源列表，
                       //   可按批号/品种/名称搜索，可用量为 0 的置灰不可选）
  | 'dict';            // 数据字典下拉（2026-10-21 新增：顶层字段用字典，
                       //   如采收形态取 crop_form、计量单位取 unit）

/**
 * 单个条目中的字段定义
 */
export interface EntryFieldDef {
  /** 字段键名 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 字段类型 */
  type: 'text' | 'select' | 'number' | 'dict';
  /** 单位 */
  unit?: string;
  /** 下拉选项（当type为select时） */
  options?: { value: string; label: string }[];
  /** 占位文本 */
  placeholder?: string;
  /** 数据词典分类（当type为dict时） */
  dictCategory?: string;
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
  /** 2026-10-21：单位跟随另一个字段所选记录的 unit 值。
   *  用于「种子/种苗用量」这类字段 —— 其单位取决于上面选了哪条种源（可能是株/千克/袋…），
   *  写死「株/亩」会与实际领用不符。设置后 unit 作为未选择时的回退。 */
  unitSourceField?: string;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步进值 */
  step?: number;
  /** 下拉选项 */
  options?: { value: string; label: string }[];
  /** 2026-10-21：数据字典分类（当 type 为 'dict' 时必填）。
   *  例：'unit' → 千克/克/吨/株/粒/朵/片/捆…；'crop_form' → 果实/叶片/花朵/枝条/种苗… */
  dictCategory?: string;
  /** 默认值 */
  defaultValue?: string | number | boolean | string[];
  /** 依赖字段（当选中某任务类型时显示） */
  dependsOn?: string[];
  /** 多条目配置（当type为multiEntry时） */
  multiEntryDef?: MultiEntryDef;
  /** 2026-10-21：与**紧邻的下一个字段**并排渲染，共占一个网格单元（半宽）。
   *  用于「用水量 + 单位」这类主从搭配：量占剩余宽度，单位固定窄宽。 */
  groupWithNext?: boolean;
  /** 2026-10-21：占满整行（跨两列）。
   *  用于肥料池这类内部含多列表格/搜索框的复杂控件 —— 塞进半宽会被严重压缩。 */
  fullWidth?: boolean;
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
    // 2026-10-21（用户要求）：与「水肥管理 → 新增施肥记录」的「肥料选择与用量」同模式 ——
    //   直接复用 FertilizerPoolEditor（该组件已被新增/编辑施肥记录、病虫害防治的肥料联用三处复用）。
    //   原「肥料配比」multiEntry 需手工填肥料种类/名称/用量/单位/稀释倍数，与肥料库脱节：
    //   名称靠手打、查不到库存、单位无法自动换算。
    {
      key: 'fertilizerPool',
      label: '肥料选择与用量',
      type: 'fertilizerPool',
      required: true,
      // 该控件内部有类型筛选 + 搜索框 + 池列表，必须占满整行，否则被压成半宽
      fullWidth: true,
    },
    // 2026-10-21：原「施用方式」（滴灌/叶面喷施/基肥/追肥）一并删除 ——
    //   FertilizerPoolItem 内每条肥料自带 fertilizationMethod（取字典 fertilization_method），
    //   与顶层字段语义重叠且会冲突（池里选滴灌、顶层选喷施时以哪个为准没有定论）；
    //   新增施肥记录弹窗同样只在池内保留施肥方式，顶层并无此字段。
    // 2026-10-21（用户要求）：删除「备注」字段 —— 与「工作内容」重复。
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
    // 2026-10-21（用户要求）：灌溉方式 / 用水量 / 单位 改为与「水肥管理 → 新增浇水记录」
    //   的「浇水明细」同口径 —— 同一套常量，不再各写一份选项。
    {
      key: 'irrigationMethod',
      label: '灌溉方式',
      type: 'select',
      required: true,
      // 复用浇水明细的 5 种主流方式（人工浇水/滴灌/喷灌/喷雾/漫灌）
      options: WATERING_METHOD_OPTIONS,
      // 与浇水明细默认值一致（WaterAddModal 建行时 wateringMethod='drip_irrigation'）
      defaultValue: 'drip_irrigation',
    },
    {
      key: 'waterAmount',
      label: '用水量',
      type: 'number',
      required: true,
      min: 0,
      step: 0.01,
      // 与下方「单位」并排，两个字段共占半宽，单位窄一些
      groupWithNext: true,
    },
    {
      // 单位由固定「m³/亩」改为下拉选择，与浇水明细一致
      //   （实际灌溉可能按升计量，写死 m³/亩 会与水肥台账口径冲突）
      key: 'waterUnit',
      label: '单位',
      type: 'select',
      required: true,
      defaultValue: 'L',
      options: WATER_UNIT_OPTIONS,
    },
    {
      key: 'duration',
      label: '灌溉时长',
      type: 'number',
      unit: '分钟',
      min: 0,
    },
    // 2026-10-21（用户要求）：删除「备注」字段 ——
    //   新建任务弹窗已有独立的「工作内容」字段承担描述职责，两个备注重复。
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
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
      placeholder: '选择"其他"肥料时必填，请说明具体肥料名称',
    },
  ],
};

/**
 * 任务类型配置数据 - 植保
 */
const pesticideConfig: TaskTypeConfig = {
  value: 'pest_control',
  label: '病虫害防治',
  icon: 'Bug',
  color: 'bg-red-500',
  category: 'agriculture',
  configFields: [
    // 2026-10-21（用户要求）：与「病虫害管理 → 新增防治记录」的
    //   「目标病虫害」「防治药剂池」两个字段同模式，直接复用同一份组件
    //   （TargetPestPicker / PesticidePoolEditor）。
    //   两者内部都是多列布局 + 绝对定位下拉，必须占满整行。
    {
      key: 'targetPests',
      label: '目标病虫害',
      type: 'targetPestPicker',
      required: true,
      fullWidth: true,
    },
    {
      key: 'pesticidePool',
      label: '防治药剂池',
      type: 'pesticidePool',
      required: true,
      fullWidth: true,
    },
    // 2026-10-21（用户要求）：删除以下 5 个字段 ——
    //   · applicationMethod 植保方式（10 项）—— 其能力已由「目标病虫害」+「防治药剂池」覆盖
    //   · pesticideMix 药剂配比 —— 手工填药剂种类/名称/用量，与从药剂库选用的药剂池重复；
    //     且原 dependsOn:['applicationMethod']，删掉植保方式后将永久不再显示
    //   · physicalMethod / biologicalMethod —— 分别是「植保方式=物理/生物」的下级选项，
    //     依赖已删除的 applicationMethod，同样会永久失效；其用途已由药剂池内的「使用方法」承接
    //   · targetPest 防治对象（手填文本）—— 已由「目标病虫害」的字典多选承接
    // 2026-10-21（用户要求）：再删除「安全间隔期」与「备注」——
    //   任务弹窗已有「工作内容」承担描述职责，备注重复；安全间隔期是农药安全期的记录项，
    //   属于防治记录的台账字段，不属于作业任务的配置。防护装备保留（现场作业必需）。
    {
      key: 'protectiveGear',
      label: '防护装备',
      type: 'multiSelect',
      options: [
        { value: 'mask', label: '口罩' },
        { value: 'gloves', label: '手套' },
        { value: 'goggles', label: '护目镜' },
        { value: 'suit', label: '防护服' },
        { value: 'other', label: '其他' },
      ],
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
        { value: 'other', label: '其他' },
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
        { value: 'other', label: '其他' },
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
      placeholder: '选择"其他"修剪类型或工具时必填，请详细说明',
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
      // 2026-10-21：用户要求由「苗种类」改名为「种子/种苗名称」——
      //   该字段选的是内部种源（可能是种子，也可能是种苗/插条），
      //   叫「苗种类」会让人以为只能选苗。
      label: '种子/种苗名称',
      // 2026-10-21：由 select（7 个硬编码虚构选项：番茄苗/黄瓜苗/草莓苗…）
      //   改为 seedSourceSelect —— 关联内部种源列表，可按批号/品种/名称搜索，
      //   选项展示「种源编号 + 作物品种 + 可用数量」，可用量为 0 的置灰不可选。
      //   存值口径与种植管理一致（apiSeedSourceService / types/crop.ts#SeedSource）。
      type: 'seedSourceSelect',
      required: true,
      placeholder: '搜索：种源编号 / 作物品种 / 作物名称',
    },
    {
      key: 'seedlingQuantity',
      // 2026-10-21：用户要求由「用苗量」改名为「种子/种苗用量」——
      //   与上方「种子/种苗名称」对齐（同一次选择既可能是种子也可能是种苗）
      label: '种子/种苗用量',
      type: 'number',
      required: true,
      // 2026-10-21：单位不再写死「株/亩」，改为跟随上方「种子/种苗名称」所选种源的单位
      //   （种苗可能是株 / 千克 / 袋…）。未选种源时不显示单位，由 unitSourceField 声明来源。
      unitSourceField: 'seedlingType',
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
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
      placeholder: '选择"其他"生根剂时必填，请说明具体产品名称',
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
    // 2026-10-21（用户要求）：原「成熟度标准」（90%成熟/80%成熟/完全成熟）只有成品作物语义，
    //   无法覆盖采收叶片/花朵/枝条/小苗/种子等场景 —— 换为「采收形态」，
    //   取字典 crop_form（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他），
    //   用户反馈里点名的对象全部有对应项。
    {
      key: 'harvestForm',
      label: '采收形态',
      type: 'dict',
      dictCategory: 'crop_form',
      required: true,
      placeholder: '请选择采收产物形态',
    },
    {
      // 2026-10-21（用户要求）：预估产量的单位不再写死 kg —— 采收对象可能是
      //   叶片/花朵（按 片/朵）、小苗（按 株）、种子（按 粒）等，
      //   改为取字典 unit 的下拉，与产量并排占半宽。
      key: 'estimatedYield',
      label: '预估产量',
      type: 'number',
      min: 0,
      groupWithNext: true,
    },
    {
      key: 'estimatedYieldUnit',
      label: '单位',
      type: 'dict',
      dictCategory: 'unit',
      required: true,
      placeholder: '单位',
    },
    {
      key: 'qualityGrade',
      label: '品质等级',
      type: 'multiSelect',
      options: [
        { value: 'A', label: 'A级' },
        { value: 'B', label: 'B级' },
        { value: 'C', label: 'C级' },
        { value: 'other', label: '其他' },
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
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'remarks',
      label: '备注',
      type: 'textarea',
      placeholder: '选择"其他"采收形态、品质等级或工具时必填，请详细说明',
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
        { value: 'other', label: '其他' },
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
      placeholder: '选择"其他"除草方式时必填，请详细说明',
    },
  ],
};

// ============================================================
// 2026-10-21 新增：农场维修 / 设备维修 / 清洁卫生 / 育苗 四类配置
//
// 背景：这 4 个任务类型此前**没有任何 config**（TASK_TYPE_CONFIGS 里缺失），
//   在新建任务选中后「详细配置」区域直接不渲染，操作者没有结构化录入渠道。
//
// 设计原则（按用户要求）：
//   1. 尽可能用下拉单选 / 多选，减少自由文本输入 —— 仅「数量/工时/天数」保留数字输入
//      （这类值天然无法枚举）。
//   2. 贴合实际农事：维修类按「设施部件 + 损坏程度 + 维修方式 + 备件」组织；
//      清洁类按「区域 + 类型 + 方式 + 工具」组织；育苗类直接复用系统已有字典。
//   3. 字段 key 统一加业务前缀（repairXxx / equipXxx / cleanXxx / nurseryXxx）——
//      typeConfig 是所有任务类型共用的同一个对象，换任务类型时旧值会残留；
//      若不同配置复用同名 key（如都用 seedlingType），切换类型后会串值。
// ============================================================

/**
 * 任务类型配置数据 - 农场维修
 * 覆盖：大棚骨架/覆盖膜/灌溉管路/围栏道路/电路照明 等农业设施的维修
 */
const farmRepairConfig: TaskTypeConfig = {
  value: 'farm_repair',
  label: '农场维修',
  icon: 'Wrench',
  color: 'bg-slate-500',
  category: 'management',
  configFields: [
    {
      key: 'repairCategory',
      label: '维修类别',
      type: 'select',
      required: true,
      options: [
        { value: 'structure', label: '棚体骨架（钢管/立柱/横梁）' },
        { value: 'covering', label: '覆盖材料（棚膜/遮阳网/防虫网）' },
        { value: 'irrigation_pipe', label: '灌溉管路（主管/支管/滴带）' },
        { value: 'fence_road', label: '围栏与道路' },
        { value: 'electric', label: '电路照明' },
        { value: 'drainage', label: '排水设施（沟渠/集水井）' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'damageSeverity',
      label: '损坏程度',
      type: 'select',
      required: true,
      options: [
        { value: 'minor', label: '轻微（不影响使用）' },
        { value: 'moderate', label: '一般（局部功能受影响）' },
        { value: 'severe', label: '严重（功能基本丧失）' },
        { value: 'critical', label: '紧急（存在安全隐患）' },
      ],
    },
    {
      key: 'repairMethod',
      label: '维修方式',
      type: 'select',
      required: true,
      options: [
        { value: 'on_site_patch', label: '现场修补' },
        { value: 'replace_part', label: '更换部件' },
        { value: 'replace_whole', label: '整体更换' },
        { value: 'outsourced', label: '外委专业维修' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'partsNeeded',
      label: '所需材料',
      type: 'multiSelect',
      options: [
        { value: 'film', label: '农膜' },
        { value: 'channel', label: '卡槽卡簧' },
        { value: 'steel_pipe', label: '钢管骨架' },
        { value: 'cement', label: '水泥砂浆' },
        { value: 'wood', label: '木材' },
        { value: 'fastener', label: '紧固件' },
        { value: 'wire_lamp', label: '电线灯具' },
        { value: 'pipe_fitting', label: '管件接头' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'shutdownImpact',
      label: '对生产影响',
      type: 'select',
      options: [
        { value: 'none', label: '不影响生产' },
        { value: 'partial', label: '局部区域停机' },
        { value: 'full', label: '全面停机' },
      ],
    },
    {
      key: 'repairHours',
      label: '预计工时',
      type: 'number',
      unit: '小时',
      min: 0,
    },
  ],
};

/**
 * 任务类型配置数据 - 设备维修
 * 覆盖：水泵/风机/卷帘机/灌溉设备/温控设备/监控传感器/农机具 的维修
 */
const equipmentRepairConfig: TaskTypeConfig = {
  value: 'equipment_repair',
  label: '设备维修',
  icon: 'Settings',
  color: 'bg-zinc-500',
  category: 'management',
  configFields: [
    {
      key: 'equipCategory',
      label: '设备类别',
      type: 'select',
      required: true,
      options: [
        { value: 'pump', label: '水泵/增压泵' },
        { value: 'fan', label: '风机/环流扇' },
        { value: 'roller', label: '卷帘机/卷膜器' },
        { value: 'irrigation_device', label: '灌溉施肥设备' },
        { value: 'climate_control', label: '温控设备（温湿度/CO₂）' },
        { value: 'monitor_sensor', label: '监控与传感器' },
        { value: 'farm_machinery', label: '农机具' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'faultSymptoms',
      label: '故障现象',
      type: 'multiSelect',
      required: true,
      options: [
        { value: 'no_start', label: '无法启动' },
        { value: 'abnormal_noise', label: '异响/振动' },
        { value: 'leak', label: '漏水/漏液/漏气' },
        { value: 'temperature_abnormal', label: '温度异常' },
        { value: 'control_failure', label: '控制失灵' },
        { value: 'physical_damage', label: '外观破损' },
        { value: 'accuracy_drift', label: '读数不准/漂移' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'urgency',
      label: '紧急程度',
      type: 'select',
      required: true,
      options: [
        { value: 'deferrable', label: '可延后' },
        { value: 'soon', label: '尽快处理' },
        { value: 'shutdown_now', label: '需立即停机' },
        { value: 'safety_risk', label: '涉及安全事故' },
      ],
    },
    {
      key: 'equipRepairMethod',
      label: '维修方式',
      type: 'select',
      required: true,
      options: [
        { value: 'on_site', label: '现场检修' },
        { value: 'factory_return', label: '返厂维修' },
        { value: 'replace_whole', label: '更换整机' },
        { value: 'vendor_on_site', label: '厂家上门' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'spareParts',
      label: '所需备件',
      type: 'multiSelect',
      options: [
        { value: 'bearing', label: '轴承' },
        { value: 'seal', label: '密封圈' },
        { value: 'motor', label: '电机' },
        { value: 'belt', label: '皮带' },
        { value: 'filter', label: '滤芯' },
        { value: 'circuit_board', label: '电路板' },
        { value: 'sensor_probe', label: '传感器探头' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'equipShutdown',
      label: '停机情况',
      type: 'select',
      options: [
        { value: 'none', label: '不停机（可带病运行）' },
        { value: 'short', label: '短时停机（当日恢复）' },
        { value: 'long', label: '长期停机（需更换）' },
      ],
    },
    {
      key: 'equipRepairHours',
      label: '预计工时',
      type: 'number',
      unit: '小时',
      min: 0,
    },
  ],
};

/**
 * 任务类型配置数据 - 清洁卫生
 * 覆盖：棚内地面/走道/排水沟/边角围墙/工具房 的清扫、冲洗、消毒、清运
 */
const cleaningConfig: TaskTypeConfig = {
  value: 'cleaning',
  label: '清洁卫生',
  icon: 'Sparkles',
  color: 'bg-teal-500',
  category: 'management',
  configFields: [
    {
      key: 'cleanAreas',
      label: '清洁区域',
      type: 'multiSelect',
      required: true,
      placeholder: '可多选',
      options: [
        { value: 'greenhouse_floor', label: '棚内地面' },
        { value: 'aisle', label: '走道/通道' },
        { value: 'drainage', label: '排水沟' },
        { value: 'wall_corner', label: '边角与围墙' },
        { value: 'tool_room', label: '工具房/仓库' },
        { value: 'office', label: '办公区' },
        { value: 'surroundings', label: '棚外周边环境' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'cleaningType',
      label: '清洁类型',
      type: 'select',
      required: true,
      options: [
        { value: 'daily', label: '日常清扫' },
        { value: 'deep', label: '深度清洁' },
        { value: 'disinfection', label: '消毒杀菌' },
        { value: 'waste_clear', label: '垃圾清运' },
        { value: 'weed_clear', label: '杂草清理' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'cleaningMethods',
      label: '清洁方式',
      type: 'multiSelect',
      options: [
        { value: 'manual_sweep', label: '人工清扫' },
        { value: 'high_pressure_wash', label: '高压冲洗' },
        { value: 'mechanical', label: '机械清扫' },
        { value: 'spray_disinfect', label: '喷洒消毒' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'disinfectRequired',
      label: '是否需要消毒',
      type: 'select',
      options: [
        { value: 'yes', label: '需要' },
        { value: 'no', label: '不需要' },
      ],
    },
    {
      key: 'cleanTools',
      label: '清洁工具',
      type: 'multiSelect',
      options: [
        { value: 'broom', label: '扫帚' },
        { value: 'shovel', label: '铁锹' },
        { value: 'water_gun', label: '高压水枪' },
        { value: 'trash_bag', label: '垃圾袋' },
        { value: 'sprayer', label: '消毒喷雾器' },
        { value: 'cart', label: '保洁车' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'cleanHours',
      label: '预计工时',
      type: 'number',
      unit: '小时',
      min: 0,
    },
  ],
};

/**
 * 任务类型配置数据 - 育苗
 * 说明：育苗方式/繁殖方式/育苗场地/目标成活率 全部复用系统已有字典
 *   （seedling_type / propagation_mode / seedling_site / survival_rate_target），
 *   与「育苗管理」模块同一套口径，避免两处枚举漂移。
 *   key 加 nursery 前缀，避免与「定植」的 seedlingType（种源选择）串值。
 */
const seedlingTaskConfig: TaskTypeConfig = {
  value: 'seedling',
  label: '育苗',
  icon: 'Sprout',
  color: 'bg-green-600',
  category: 'agriculture',
  configFields: [
    {
      key: 'nurseryMethod',
      label: '育苗方式',
      type: 'dict',
      dictCategory: 'seedling_type',
      required: true,
      placeholder: '请选择育苗方式',
    },
    {
      key: 'nurseryPropagation',
      label: '繁殖方式',
      type: 'dict',
      dictCategory: 'propagation_mode',
      placeholder: '请选择繁殖方式',
    },
    // 2026-10-21（用户要求）：删除「育苗场地」——
    //   弹窗上方「关联种植/育苗」已能选定具体的种植/育苗记录并带出任务区域
    //   （selectedAreas → fields/greenhouseName），再选一次育苗场地属于重复录入，
    //   且两处不一致时以哪个为准没有定论。
    {
      // 2026-10-21：不加 groupWithNext —— 该机制是给「值 + 单位」主从配对用的
      //   （值占剩余宽度、单位固定窄宽 w-24）。本字段自带 unit:'株'，
      //   若加 groupWithNext 会把下一个字段「目标成活率」压进 96px 窄列，
      //   "90%（标准）"这类文本会被截断（实测确认）。
      key: 'nurseryQuantity',
      label: '计划育苗数量',
      type: 'number',
      unit: '株',
      min: 0,
    },
    {
      key: 'nurserySurvivalTarget',
      label: '目标成活率',
      type: 'dict',
      dictCategory: 'survival_rate_target',
      placeholder: '选择目标',
    },
    {
      key: 'nurserySubstrate',
      label: '育苗基质',
      type: 'select',
      options: [
        { value: 'coco_coir', label: '椰糠' },
        { value: 'peat', label: '泥炭' },
        { value: 'vermiculite', label: '蛭石' },
        { value: 'perlite', label: '珍珠岩' },
        { value: 'mix', label: '混合基质' },
        { value: 'soil', label: '土壤' },
        { value: 'other', label: '其他' },
      ],
    },
    {
      key: 'nurseryDays',
      label: '预计育苗天数',
      type: 'number',
      unit: '天',
      min: 0,
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
  // 2026-10-21：补齐此前缺失的 4 类（选中后原本无详细配置）
  farmRepairConfig,
  equipmentRepairConfig,
  cleaningConfig,
  seedlingTaskConfig,
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
