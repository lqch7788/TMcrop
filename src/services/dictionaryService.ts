/**
 * 数据字典与系统配置服务
 * V5.0 系统设置重构
 * 提供统一的数据字典、仓库、基地、温室管理接口
 */

import { apiClient } from './apiClient';

// ============================================
// 类型定义
// ============================================

// 数据字典类型
export interface Dictionary {
  id?: string;
  category: string;
  code: string;
  name: string;
  sortNumber?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 分类中文翻译映射
// ============================================

// 分类名称中文翻译
export const CATEGORY_CHINESE_NAMES: Record<string, string> = {
  // 审批相关
  approval_status: '审批状态',
  approval_action: '审批操作',
  approval_type: '审批类型',
  // 任务相关
  task_type: '任务类型',
  task_status: '任务状态',
  // 考勤相关
  attendance_status: '考勤状态',
  leave_type: '请假类型',
  // 人事相关
  employee_status: '员工状态',
  gender: '性别',
  education: '学历',
  recruitment_source: '招聘来源',
  onboarding_status: '入职状态',
  resignation_type: '离职类型',
  resignation_reason: '离职原因',
  return_status: '物品归还状态',
  // 合同相关
  contract_type: '合同类型',
  contract_status: '合同状态',
  // 岗位相关
  position_type: '岗位类型',
  position_level: '岗位职级',
  // 供应商相关
  supplier_type: '供应商类型',
  supplier_status: '供应商状态',
  supplier_attribute: '供应商属性',
  supplier_level: '供应商等级',
  // 仓库相关
  warehouse_type: '仓库类型',
  warehouse_location: '仓库位置',
  // 温室相关
  greenhouse_type: '温室类型',
  greenhouse_status: '温室状态',
  // 作物相关
  crop_category: '作物类别',
  crop_variety: '作物品种',
  planting_mode: '种植模式',
  growth_stage: '生长阶段',
  // 物料相关
  material_type: '物料类型',
  material_unit: '物料单位',
  material_status: '物料状态',
  // 生产相关
  production_status: '生产状态',
  batch_status: '批次状态',
  tech_solution_status: '技术方案状态',
  harvest_status: '采收状态',
  // 设备相关
  device_type: '设备类型',
  device_status: '设备状态',
  sensor_type: '传感器类型',
  // 采购相关
  purchase_type: '采购类型',
  purchase_status: '采购状态',
  // 成本相关
  cost_category: '成本分类',
  cost_type: '成本类型',
  budget_status: '预算状态',
  // 通知相关
  notification_type: '通知类型',
  notification_channel: '通知渠道',
  // 预警相关
  alert_level: '预警级别',
  alert_type: '预警类型',
  // 人工相关
  worker_type: '工人类型',
  worker_status: '工人状态',
  insurance_type: '保险类型',
  temp_worker_source: '临时工来源',
  temp_worker_status: '临时工状态',
  work_zone: '作业区域',
  salary_status: '薪资状态',
  skill_status: '技能状态',
  performance_status: '考核状态',
  // 工单相关
  work_order_status: '工单状态',
  work_order_type: '工单类型',
  // 视频监控
  video_record_type: '录像类型',
  // 追溯相关
  trace_status: '追溯状态',
  // 通用
  priority: '优先级',
  status: '状态',
  common_status: '通用状态',
  boolean_yes_no: '是否',
  pagination_size: '分页大小',
  unit: '单位',
};

// 获取分类的中文名称
export function getCategoryChineseName(category: string): string {
  return CATEGORY_CHINESE_NAMES[category] || category;
}

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

// 数据字典本地存储键名
const DICTIONARY_STORAGE_KEY = 'yuanxingtu_dictionaries';

// 默认数据字典 - 应与后端 seedDictionaries 保持一致
const DEFAULT_DICTIONARIES: Dictionary[] = [
  // 审批状态
  { id: 'dt-040', category: 'approval_status', code: 'pending', name: '待审批', sortNumber: 1 },
  { id: 'dt-041', category: 'approval_status', code: 'processing', name: '审批中', sortNumber: 2 },
  { id: 'dt-042', category: 'approval_status', code: 'approved', name: '已通过', sortNumber: 3 },
  { id: 'dt-043', category: 'approval_status', code: 'rejected', name: '已拒绝', sortNumber: 4 },
  { id: 'dt-044', category: 'approval_status', code: 'withdrawn', name: '已撤回', sortNumber: 5 },
  // 考勤状态
  { id: 'dt-190', category: 'attendance_status', code: 'normal', name: '正常', sortNumber: 1 },
  { id: 'dt-191', category: 'attendance_status', code: 'late', name: '迟到', sortNumber: 2 },
  { id: 'dt-192', category: 'attendance_status', code: 'early', name: '早退', sortNumber: 3 },
  { id: 'dt-193', category: 'attendance_status', code: 'absent', name: '缺勤', sortNumber: 4 },
  { id: 'dt-194', category: 'attendance_status', code: 'overtime', name: '加班', sortNumber: 5 },
  // 合同类型
  { id: 'dt-050', category: 'contract_type', code: 'labor', name: '劳动合同', sortNumber: 1 },
  { id: 'dt-051', category: 'contract_type', code: 'internship', name: '实习协议', sortNumber: 2 },
  { id: 'dt-052', category: 'contract_type', code: 'service', name: '劳务合同', sortNumber: 3 },
  // 合同状态
  { id: 'dt-060', category: 'contract_status', code: 'effective', name: '生效中', sortNumber: 1 },
  { id: 'dt-061', category: 'contract_status', code: 'pending', name: '待生效', sortNumber: 2 },
  { id: 'dt-062', category: 'contract_status', code: 'expired', name: '已到期', sortNumber: 3 },
  { id: 'dt-063', category: 'contract_status', code: 'terminated', name: '已终止', sortNumber: 4 },
  // 采购类型
  { id: 'dt-140', category: 'purchase_type', code: 'production', name: '生产性采购', sortNumber: 1 },
  { id: 'dt-141', category: 'purchase_type', code: 'emergency', name: '紧急采购', sortNumber: 2 },
  { id: 'dt-142', category: 'purchase_type', code: 'daily', name: '日常采购', sortNumber: 3 },
  { id: 'dt-143', category: 'purchase_type', code: 'capital', name: '资本性采购', sortNumber: 4 },
  // 供应商类型 - 与供应商编码规则保持一致
  { id: 'dt-001', category: 'supplier_type', code: 'SP', name: '种子与种苗类', sortNumber: 1 },
  { id: 'dt-002', category: 'supplier_type', code: 'FE', name: '肥料与土壤改良类', sortNumber: 2 },
  { id: 'dt-003', category: 'supplier_type', code: 'PP', name: '农药与植保产品类', sortNumber: 3 },
  { id: 'dt-004', category: 'supplier_type', code: 'EQ', name: '农业机械与设备类', sortNumber: 4 },
  { id: 'dt-005', category: 'supplier_type', code: 'FA', name: '设施农业资材类', sortNumber: 5 },
  { id: 'dt-006', category: 'supplier_type', code: 'IR', name: '灌溉与水肥一体化类', sortNumber: 6 },
  { id: 'dt-007', category: 'supplier_type', code: 'OP', name: '日常劳保与劳动工具类', sortNumber: 7 },
  { id: 'dt-008', category: 'supplier_type', code: 'PH', name: '仓储与物流资材类', sortNumber: 8 },
  { id: 'dt-009', category: 'supplier_type', code: 'TS', name: '检测与技术服务类', sortNumber: 9 },
  { id: 'dt-010', category: 'supplier_type', code: 'UT', name: '能源与辅助耗材类', sortNumber: 10 },
  { id: 'dt-011', category: 'supplier_type', code: 'OT', name: '其他综合类', sortNumber: 11 },
  // 工人类型
  { id: 'dt-260', category: 'worker_type', code: 'formal', name: '正式工', sortNumber: 1 },
  { id: 'dt-261', category: 'worker_type', code: 'temporary', name: '临时工', sortNumber: 2 },
  { id: 'dt-262', category: 'worker_type', code: 'seasonal', name: '季节工', sortNumber: 3 },
  // 任务状态
  { id: 'dt-160', category: 'task_status', code: 'pending', name: '待处理', sortNumber: 1 },
  { id: 'dt-161', category: 'task_status', code: 'in_progress', name: '进行中', sortNumber: 2 },
  { id: 'dt-162', category: 'task_status', code: 'completed', name: '已完成', sortNumber: 3 },
  { id: 'dt-163', category: 'task_status', code: 'cancelled', name: '已取消', sortNumber: 4 },
  // 作物类别
  { id: 'DICT001', category: 'crop_category', code: 'vegetable', name: '蔬菜类', sortNumber: 1 },
  { id: 'DICT002', category: 'crop_category', code: 'fruit', name: '水果类', sortNumber: 2 },
  { id: 'DICT003', category: 'crop_category', code: 'grain', name: '粮食类', sortNumber: 3 },
  { id: 'DICT004', category: 'crop_category', code: 'other', name: '其他', sortNumber: 4 },
  // 单位
  { id: 'DICT010', category: 'unit', code: 'kg', name: '千克', sortNumber: 1 },
  { id: 'DICT011', category: 'unit', code: 'ton', name: '吨', sortNumber: 2 },
  { id: 'DICT012', category: 'unit', code: 'piece', name: '个', sortNumber: 3 },
  { id: 'DICT013', category: 'unit', code: '株', name: '株', sortNumber: 4 },
  { id: 'DICT014', category: 'unit', code: '亩', name: '亩', sortNumber: 5 },
  // 状态
  { id: 'DICT020', category: 'status', code: 'active', name: '启用', sortNumber: 1 },
  { id: 'DICT021', category: 'status', code: 'inactive', name: '停用', sortNumber: 2 },
  { id: 'DICT022', category: 'status', code: 'pending', name: '待处理', sortNumber: 3 },
  // 仓库类型
  { id: 'DICT030', category: 'warehouse_type', code: 'main', name: '主仓库', sortNumber: 1 },
  { id: 'DICT031', category: 'warehouse_type', code: 'cold', name: '冷库', sortNumber: 2 },
  { id: 'DICT032', category: 'warehouse_type', code: 'seed', name: '种子库', sortNumber: 3 },
  // 温室类型
  { id: 'DICT040', category: 'greenhouse_type', code: 'standard', name: '标准温室', sortNumber: 1 },
  { id: 'DICT041', category: 'greenhouse_type', code: 'smart', name: '智能温室', sortNumber: 2 },
  { id: 'DICT042', category: 'greenhouse_type', code: 'seedling', name: '育苗温室', sortNumber: 3 },
  // 种植模式
  { id: 'DICT050', category: 'planting_mode', code: 'greenhouse', name: '温室种植', sortNumber: 1 },
  { id: 'DICT051', category: 'planting_mode', code: 'open', name: '露天种植', sortNumber: 2 },
  { id: 'DICT052', category: 'planting_mode', code: 'hydroponic', name: '水培', sortNumber: 3 },
  { id: 'DICT053', category: 'planting_mode', code: 'substrate', name: '基质栽培', sortNumber: 4 },
];

/**
 * 获取字典列表
 * 优先从API获取，失败时使用本地存储
 */
export async function getDictionaries(category?: string): Promise<Dictionary[]> {
  try {
    // 后端直接返回数组格式，不用 apiClient
    let url = '/api/dictionary/dictionaries';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }
    const response = await fetch(url);
    const data = await response.json();
    if (Array.isArray(data)) {
      localStorage.setItem(DICTIONARY_STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    const stored = localStorage.getItem(DICTIONARY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return category ? parsed.filter((d: Dictionary) => d.category === category) : parsed;
      } catch {
        return DEFAULT_DICTIONARIES;
      }
    }
    return DEFAULT_DICTIONARIES;
  }
}

/**
 * 获取字典分类列表
 */
export async function getDictionaryCategories(): Promise<string[]> {
  try {
    // 后端直接返回数组格式，不用 apiClient
    const response = await fetch('/api/dictionary/dictionaries/categories');
    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    // 返回本地存储中的分类
    const stored = localStorage.getItem(DICTIONARY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: Dictionary[] = JSON.parse(stored);
        return [...new Set(parsed.map(d => d.category))];
      } catch {
        return ['crop_type', 'unit', 'status'];
      }
    }
    return ['crop_type', 'unit', 'status'];
  }
}

/**
 * 保存字典（新增或更新）
 * 使用 fetch 直接调用，绕过 apiClient 的响应格式验证
 */
export async function saveDictionaries(data: {
  inserted: Dictionary[];
  updated: Dictionary[];
  deleted: string[];
}): Promise<SaveResult<Dictionary>> {
  const response = await fetch('/api/dictionary/dictionaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ============================================
// 系统配置 API
// ============================================

/**
 * 获取系统配置列表
 * 优先从API获取，失败时使用本地存储
 */
export async function getSystemConfigs(configKey?: string): Promise<SystemConfig[]> {
  const params: Record<string, string> = {};
  if (configKey) {
    params.configKey = configKey;
  }

  // 本地存储的回退数据
  const LOCAL_STORAGE_KEY = 'yuanxingtu_system_configs';
  const DEFAULT_CONFIGS: SystemConfig[] = [
    { id: '1', configKey: 'system_name', configValue: '智慧种植生产管理系统', configType: 'string', description: '系统显示名称' },
    { id: '2', configKey: 'system_version', configValue: 'V3.0.0', configType: 'string', description: '当前系统版本' },
    { id: '3', configKey: 'demo_mode', configValue: 'true', configType: 'boolean', description: '是否启用演示模式' },
    { id: '4', configKey: 'theme_color', configValue: 'emerald', configType: 'string', description: '系统主题色' },
    { id: '5', configKey: 'page_size', configValue: '10', configType: 'number', description: '列表默认分页大小' },
    { id: '6', configKey: 'enable_notifications', configValue: 'true', configType: 'boolean', description: '是否启用系统通知' },
  ];

  try {
    const data = await apiClient.get<SystemConfig[]>('/dictionary/system-configs', params);
    // API成功时保存到本地存储
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    // API失败时尝试从本地存储读取
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_CONFIGS;
      }
    }
    return DEFAULT_CONFIGS;
  }
}

/**
 * 保存系统配置（新增或更新）
 */
export async function saveSystemConfigs(data: {
  inserted: SystemConfig[];
  updated: SystemConfig[];
  deleted: string[];
}): Promise<SaveResult<SystemConfig>> {
  return apiClient.post<SaveResult<SystemConfig>>('/dictionary/system-configs', data);
}

// ============================================
// 仓库 API
// ============================================

const WAREHOUSE_STORAGE_KEY = 'yuanxingtu_warehouses';
const DEFAULT_WAREHOUSES: Warehouse[] = [
  { id: '1', warehouseCode: 'WH001', warehouseName: '主仓库', warehouseType: 'main', location: '园区A区', capacity: 1000 },
  { id: '2', warehouseCode: 'WH002', warehouseName: '冷藏仓库', warehouseType: 'cold', location: '园区B区', capacity: 500 },
];

export async function getWarehouses(status?: string): Promise<Warehouse[]> {
  const params: Record<string, string> = {};
  if (status) {
    params.status = status;
  }

  try {
    const data = await apiClient.get<Warehouse[]>('/dictionary/warehouses', params);
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    const stored = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return status ? parsed.filter((w: Warehouse) => w.status === status) : parsed;
      } catch {
        return DEFAULT_WAREHOUSES;
      }
    }
    return DEFAULT_WAREHOUSES;
  }
}

/**
 * 保存仓库（新增或更新）
 */
export async function saveWarehouses(data: {
  inserted: Warehouse[];
  updated: Warehouse[];
  deleted: string[];
}): Promise<SaveResult<Warehouse>> {
  return apiClient.post<SaveResult<Warehouse>>('/dictionary/warehouses', data);
}

// ============================================
// 基地 API
// ============================================

const BASE_STORAGE_KEY = 'yuanxingtu_bases';
const DEFAULT_BASES: Base[] = [
  { id: '1', baseCode: 'BASE001', baseName: '宁波基地', location: '宁波市', area: 100 },
  { id: '2', baseCode: 'BASE002', baseName: '杭州基地', location: '杭州市', area: 80 },
];

/**
 * 获取基地列表
 */
export async function getBases(status?: string, orgOid?: string): Promise<Base[]> {
  const params: Record<string, string> = {};
  if (status) {
    params.status = status;
  }
  if (orgOid) {
    params.orgOid = orgOid;
  }

  try {
    const data = await apiClient.get<Base[]>('/dictionary/bases', params);
    localStorage.setItem(BASE_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    const stored = localStorage.getItem(BASE_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_BASES;
      }
    }
    return DEFAULT_BASES;
  }
}

/**
 * 保存基地（新增或更新）
 */
export async function saveBases(data: {
  inserted: Base[];
  updated: Base[];
  deleted: string[];
}): Promise<SaveResult<Base>> {
  return apiClient.post<SaveResult<Base>>('/dictionary/bases', data);
}

// ============================================
// 温室 API
// ============================================

const GREENHOUSE_STORAGE_KEY = 'yuanxingtu_greenhouses';
const DEFAULT_GREENHOUSES: Greenhouse[] = [
  { id: '1', greenhouseCode: 'GH001', greenhouseName: '1号温室', baseOid: '1', greenhouseType: 'standard', area: 500 },
  { id: '2', greenhouseCode: 'GH002', greenhouseName: '2号温室', baseOid: '1', greenhouseType: 'standard', area: 500 },
];

export async function getGreenhouses(status?: string, baseOid?: string): Promise<Greenhouse[]> {
  const params: Record<string, string> = {};
  if (status) {
    params.status = status;
  }
  if (baseOid) {
    params.baseOid = baseOid;
  }

  try {
    const data = await apiClient.get<Greenhouse[]>('/dictionary/greenhouses', params);
    localStorage.setItem(GREENHOUSE_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    const stored = localStorage.getItem(GREENHOUSE_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_GREENHOUSES;
      }
    }
    return DEFAULT_GREENHOUSES;
  }
}

/**
 * 保存温室（新增或更新）
 */
export async function saveGreenhouses(data: {
  inserted: Greenhouse[];
  updated: Greenhouse[];
  deleted: string[];
}): Promise<SaveResult<Greenhouse>> {
  return apiClient.post<SaveResult<Greenhouse>>('/dictionary/greenhouses', data);
}
