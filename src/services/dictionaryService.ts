/**
 * 数据字典与系统配置服务
 * V5.0 系统设置重构
 * 提供统一的数据字典、仓库、基地、温室管理接口
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============================================
// 类型定义
// ============================================

// 数据字典类型
export interface Dictionary {
  id?: string;
  category: string;
  code: string;
  name: string;
  displayName?: string; // 显示名称（含义说明，amount_threshold 等分类使用）
  sortNumber?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 模块定义
// ============================================

export interface DictionaryModule {
  code: string;
  name: string;
  icon: string;
  categories: string[];
}

// 数据字典模块配置
export const DICTIONARY_MODULES: DictionaryModule[] = [
  {
    code: 'labor',
    name: '人工管理',
    icon: 'Users',
    categories: [
      'approval_status', 'attendance_status', 'contract_type', 'contract_status',
      'employee_status', 'gender', 'insurance_type', 'leave_type',
      'onboarding_status', 'overtime_type', 'position_level', 'position_type',
      'recruitment_source', 'resignation_reason', 'resignation_type', 'return_status',
      'salary_status', 'skill_status', 'temp_worker_source', 'temp_worker_status',
      'worker_status', 'worker_type', 'responsible_person'
    ]
  },
  {
    code: 'supply',
    name: '供应链管理',
    icon: 'Truck',
    categories: [
      'material_status', 'material_type', 'purchase_type', 'material_cost_type',
      'supplier_attribute', 'supplier_status', 'supplier_type', 'supplier_is_internal'
    ]
  },
  {
    code: 'production',
    name: '生产种植',
    icon: 'Sprout',
    categories: [
      'crop_category', 'operator', 'planting_area', 'planting_mode',
      'planting_status', 'process_type', 'propagation_multiple',
      'seedling_plan_type', 'seedling_site', 'seedling_type', 'survival_rate_target',
      'planting_source_type', 'production_plan_type', 'calculate_mode',
      // 生产汇总表配置（V8.0新增）
      'problem_config', 'yield_config', 'cost_config', 'labor_config',
      'batch_summary_config', 'alert_threshold', 'report_display_config',
      'farm_activity_type'
    ]
  },
  {
    code: 'seed',
    name: '种源管理',
    icon: 'Flower2',
    categories: ['source_origin', 'source_type', 'stock_form']
  },
  {
    code: 'inventory',
    name: '库存管理',
    icon: 'Warehouse',
    categories: [
      'harvest_status', 'harvest_type', 'inbound_type',
      'target_inventory', 'warehouse_location', 'warehouse', 'yes_no', 'is_supplementary'
    ]
  },
  {
    code: 'facility',
    name: '设备设施',
    icon: 'Building',
    categories: ['greenhouse_status', 'greenhouse_type', 'work_zone', 'harvest_greenhouse', 'energy_type']
  },
  {
    code: 'quality',
    name: '质量管理',
    icon: 'CheckCircle',
    categories: ['quality_grade', 'quality_level']
  },
  {
    code: 'task',
    name: '任务通用',
    icon: 'ClipboardList',
    categories: ['announcement_category', 'cost_category', 'performance_status', 'task_priority', 'task_status', 'unit', 'area_unit']
  },
  {
    code: 'approval',
    name: '审批配置',
    icon: 'Shield',
    categories: [
      'approval_level',        // 审批级别
      'approval_level_config', // 级别配置
      'amount_threshold',       // 金额阈值
      'approval_rule',          // 审批规则
      'timeout_config',          // 超时配置
      'delegation_rule',        // 委托规则
      'approval_flow',          // 审批流程配置
      'leave_config',            // 请假配置
      'overtime_config',        // 加班配置
      'order_config',           // 订单配置
      'budget_config',          // 预算配置
      'batch_config',           // 批次配置
      'recruitment_config',     // 招聘配置
      'notification_config',     // 系统通知配置
    ]
  }
];

// 获取分类所属的模块
export function getCategoryModule(category: string): string | null {
  for (const mod of DICTIONARY_MODULES) {
    if (mod.categories.includes(category)) {
      return mod.code;
    }
  }
  return null;
}

// 按模块分组获取分类
export function getCategoriesByModule(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const mod of DICTIONARY_MODULES) {
    result[mod.code] = mod.categories;
  }
  return result;
}

// ============================================
// 分类中文翻译映射
// ============================================

// 分类名称中文翻译
export const CATEGORY_CHINESE_NAMES: Record<string, string> = {
  // 审批相关
  approval_status: '审批状态',
  // 考勤相关
  attendance_status: '考勤状态',
  leave_type: '请假类型',
  // 合同相关
  contract_status: '合同状态',
  contract_type: '合同类型',
  // 成本相关
  cost_category: '成本分类',
  // 作物相关
  crop_category: '作物类别',
  // 人事相关
  employee_status: '员工状态',
  gender: '性别',
  recruitment_source: '招聘来源',
  onboarding_status: '入职状态',
  resignation_reason: '离职原因',
  resignation_type: '离职类型',
  return_status: '归还状态',
  // 温室相关
  greenhouse_status: '温室状态',
  greenhouse_type: '温室类型',
  // 采收相关
  harvest_status: '采收状态',
  harvest_greenhouse: '采收区域',
  // 保险相关
  insurance_type: '保险类型',
  // 物料相关
  material_status: '物料状态',
  material_type: '物料类型',
  material_cost_type: '物料成本类型',
  // 操作相关
  operator: '操作人员',
  // 加班相关
  overtime_type: '加班类型',
  // 绩效相关
  performance_status: '考核状态',
  // 种植相关
  planting_area: '种植区域',
  planting_mode: '种植模式',
  planting_status: '种植状态',
  planting_source_type: '种植来源类型',
  // 岗位相关
  position_level: '岗位职级',
  position_type: '岗位类型',
  // 扩繁相关
  propagation_multiple: '扩繁倍数',
  // 采购相关
  purchase_type: '采购类型',
  // 临时工相关
  temp_worker_source: '临时工来源',
  temp_worker_status: '临时工状态',
  // 技能相关
  skill_status: '技能状态',
  // 种源相关
  source_origin: '来源途径',
  source_type: '种源类型',
  stock_form: '库存形态',
  // 供应商相关
  supplier_attribute: '供应商属性',
  supplier_status: '供应商状态',
  supplier_type: '供应商类型',
  supplier_is_internal: '供应商是否内部',
  // 成活率相关
  survival_rate_target: '目标成活率',
  // 任务相关
  task_status: '任务状态',
  task_priority: '任务优先级',
  announcement_category: '公告分类',
  // 仓库相关
  warehouse_location: '仓库位置',
  warehouse: '仓库',
  // 作业区域
  work_zone: '作业区域',
  // 工人相关
  worker_status: '工人状态',
  worker_type: '工人类型',
  // 薪资相关
  salary_status: '薪资状态',
  // 育苗相关
  seedling_plan_type: '育苗计划类型',
  seedling_site: '育苗场地',
  seedling_type: '育苗方式',
  // 审批配置相关
  approval_level: '审批级别',
  approval_level_config: '级别配置',
  amount_threshold: '金额阈值',
  approval_rule: '审批规则',
  timeout_config: '超时配置',
  delegation_rule: '委托规则',
  approval_flow: '审批流程配置',
  leave_config: '请假配置',
  overtime_config: '加班配置',
  order_config: '订单配置',
  budget_config: '预算配置',
  batch_config: '批次配置',
  recruitment_config: '招聘配置',
  notification_config: '系统通知配置',
  // 生产汇总表配置（V8.0新增）
  problem_config: '问题统计配置',
  yield_config: '产量统计配置',
  cost_config: '成本统计配置',
  labor_config: '人工统计配置',
  batch_summary_config: '批次汇总配置',
  alert_threshold: '预警阈值配置',
  report_display_config: '报表显示配置',
  farm_activity_type: '农事任务类型',
  // 新增分类
  calculate_mode: '计算模式',
  energy_type: '能源类型',
  is_supplementary: '是否补录',
  production_plan_type: '生产计划类型',
  quality_level: '品质等级',
  quality_grade: '品质等级',
  responsible_person: '负责人',
  unit: '单位',
  area_unit: '面积单位',
  yes_no: '是否',
  // 库存管理相关
  inbound_type: '入库类型',
  target_inventory: '目标库存',
  harvest_type: '采收类型',
};

// 获取分类的中文名称
export function getCategoryChineseName(category: string): string {
  return CATEGORY_CHINESE_NAMES[category] || category;
}

// 系统默认用户配置键名
export const DEFAULT_USERNAME_KEY = 'default_username';
export const DEFAULT_USERNAME_VALUE = '陆启闯';

// 系统配置类型
export interface SystemConfig {
  id?: string;
  configKey: string;
  configValue: string;
  configType?: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 仓库类型
export interface Warehouse {
  id?: string;
  oid?: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType?: string;
  location?: string;
  capacity?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 基地类型
export interface Base {
  id?: string;
  oid?: string;
  baseCode: string;
  baseName: string;
  orgOid?: string;
  location?: string;
  area?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 温室类型
export interface Greenhouse {
  id?: string;
  oid?: string;
  greenhouseCode: string;
  greenhouseName: string;
  baseOid: string;
  greenhouseType?: string;
  area?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 保存操作类型
interface SaveResult<T> {
  inserted: T[];
  updated: T[];
  deleted: string[];
}

// ============================================
// 数据字典 API
// ============================================

/**
 * 获取字典列表
 * 字段映射：后端经 camelCaseResponseMiddleware 输出 camelCase，前端统一读 camelCase
 * 失败直接抛错，禁止 localStorage 兜底（V2.1 铁律）
 */
export async function getDictionaries(category?: string): Promise<Dictionary[]> {
  const url = category
    ? `/dictionary/dictionaries?category=${encodeURIComponent(category)}`
    : '/dictionary/dictionaries';

  const data = await enhancedApiClient.get<Record<string, unknown>[]>(url);
  if (!data) return [];

  return data.map((item) => ({
    id: item.id as string,
    category: item.categoryCode as string,
    code: item.dictCode as string,
    name: item.dictLabel as string,
    displayName: (item.displayName as string) || (item.dictLabel as string),
    sortNumber: item.sortOrder as number,
    status: item.status as string,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  }));
}

/**
 * 获取字典分类列表
 * 失败直接抛错，禁止 localStorage 兜底（V2.1 铁律）
 */
export async function getDictionaryCategories(): Promise<string[]> {
  const data = await enhancedApiClient.get<string[]>('/dictionary/dictionaries/categories');
  return data || [];
}

/**
 * 保存字典（新增或更新）
 * 字段转换: 前端 (category, code, name, sortNumber) → 后端 (category_code, dict_code, dict_label, sort_order)
 * 失败直接抛错，禁止 localStorage 兜底（V2.1 铁律）
 */
export async function saveDictionaries(data: {
  inserted: Dictionary[];
  updated: Dictionary[];
  deleted: string[];
}): Promise<SaveResult<Dictionary>> {
  // 转换字段格式：前端 -> 后端
  const convertToBackend = (dict: Dictionary) => ({
    id: dict.id,
    category_code: dict.category,
    dict_code: dict.code,
    dict_label: dict.name,
    dict_value: dict.name,
    display_name: (dict as any).displayName || dict.name,
    sort_order: dict.sortNumber || 0,
  });

  const backendData = {
    inserted: data.inserted.map(convertToBackend),
    updated: data.updated.map(convertToBackend),
    deleted: data.deleted,
  };

  return enhancedApiClient.post<SaveResult<Dictionary>>('/dictionary/dictionaries', backendData);
}

// ============================================
// 系统配置 API
// ============================================

/**
 * 获取系统配置列表
 * 失败直接抛错，禁止 localStorage 兜底（V2.1 铁律）
 */
export async function getSystemConfigs(configKey?: string): Promise<SystemConfig[]> {
  const url = configKey
    ? `/dictionary/system-configs?configKey=${encodeURIComponent(configKey)}`
    : '/dictionary/system-configs';
  const data = await enhancedApiClient.get<SystemConfig[]>(url);
  return data || [];
}

/**
 * 保存系统配置（新增或更新）
 */
export async function saveSystemConfigs(data: {
  inserted: SystemConfig[];
  updated: SystemConfig[];
  deleted: string[];
}): Promise<SaveResult<SystemConfig>> {
  return enhancedApiClient.post<SaveResult<SystemConfig>>('/dictionary/system-configs', data);
}

// ============================================
// 仓库 API
// ============================================

/**
 * 获取仓库列表
 * 失败直接抛错，禁止 localStorage 兜底（V2.1 铁律）
 */
export async function getWarehouses(status?: string): Promise<Warehouse[]> {
  const url = status
    ? `/dictionary/warehouses?status=${encodeURIComponent(status)}`
    : '/dictionary/warehouses';
  const data = await enhancedApiClient.get<Warehouse[]>(url);
  return data || [];
}

/**
 * 保存仓库（新增或更新）
 */
export async function saveWarehouses(data: {
  inserted: Warehouse[];
  updated: Warehouse[];
  deleted: string[];
}): Promise<SaveResult<Warehouse>> {
  return enhancedApiClient.post<SaveResult<Warehouse>>('/dictionary/warehouses', data);
}

// ============================================
// 基地 API
// ============================================

/**
 * 获取基地列表
 * 失败直接抛错，禁止 localStorage 兜底（V2.1 铁律）
 */
export async function getBases(status?: string, orgOid?: string): Promise<Base[]> {
  const queryParts: string[] = [];
  if (status) queryParts.push(`status=${encodeURIComponent(status)}`);
  if (orgOid) queryParts.push(`orgOid=${encodeURIComponent(orgOid)}`);
  const url = '/dictionary/bases' + (queryParts.length > 0 ? `?${queryParts.join('&')}` : '');
  const data = await enhancedApiClient.get<Base[]>(url);
  return data || [];
}

/**
 * 保存基地（新增或更新）
 */
export async function saveBases(data: {
  inserted: Base[];
  updated: Base[];
  deleted: string[];
}): Promise<SaveResult<Base>> {
  return enhancedApiClient.post<SaveResult<Base>>('/dictionary/bases', data);
}

// ============================================
// 温室 API
// ============================================

/**
 * 获取温室列表
 * 失败直接抛错，禁止 localStorage 兜底（V2.1 铁律）
 */
export async function getGreenhouses(status?: string, baseOid?: string): Promise<Greenhouse[]> {
  const queryParts: string[] = [];
  if (status) queryParts.push(`status=${encodeURIComponent(status)}`);
  if (baseOid) queryParts.push(`baseOid=${encodeURIComponent(baseOid)}`);
  const url = '/dictionary/greenhouses' + (queryParts.length > 0 ? `?${queryParts.join('&')}` : '');
  const data = await enhancedApiClient.get<Greenhouse[]>(url);
  return data || [];
}

/**
 * 保存温室（新增或更新）
 */
export async function saveGreenhouses(data: {
  inserted: Greenhouse[];
  updated: Greenhouse[];
  deleted: string[];
}): Promise<SaveResult<Greenhouse>> {
  return enhancedApiClient.post<SaveResult<Greenhouse>>('/dictionary/greenhouses', data);
}
