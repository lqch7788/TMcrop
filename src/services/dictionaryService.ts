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
      'worker_status', 'worker_type'
    ]
  },
  {
    code: 'supply',
    name: '供应链管理',
    icon: 'Truck',
    categories: [
      'material_status', 'material_type', 'purchase_type',
      'supplier_attribute', 'supplier_status', 'supplier_type'
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
      // 生产汇总表配置（V8.0新增）
      'problem_config', 'yield_config', 'cost_config', 'labor_config',
      'batch_summary_config', 'alert_threshold', 'report_display_config'
    ]
  },
  {
    code: 'seed',
    name: '种源管理',
    icon: 'Flower2',
    categories: ['source_origin', 'source_type']
  },
  {
    code: 'inventory',
    name: '库存管理',
    icon: 'Warehouse',
    categories: [
      'harvest_status', 'harvest_type', 'inbound_type',
      'target_inventory', 'warehouse_location'
    ]
  },
  {
    code: 'facility',
    name: '设备设施',
    icon: 'Building',
    categories: ['greenhouse_status', 'work_zone']
  },
  {
    code: 'quality',
    name: '质量管理',
    icon: 'CheckCircle',
    categories: ['quality_grade']
  },
  {
    code: 'task',
    name: '任务通用',
    icon: 'ClipboardList',
    categories: ['cost_category', 'performance_status', 'task_priority', 'task_status']
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
  // 保险相关
  insurance_type: '保险类型',
  // 物料相关
  material_status: '物料状态',
  material_type: '物料类型',
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
  // 供应商相关
  supplier_attribute: '供应商属性',
  supplier_status: '供应商状态',
  supplier_type: '供应商类型',
  // 成活率相关
  survival_rate_target: '目标成活率',
  // 任务相关
  task_status: '任务状态',
  // 仓库相关
  warehouse_location: '仓库位置',
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
  // ========== 审批级别 ==========
  { id: 'DICT070', category: 'approval_level', code: 'exempt', name: '免审批', sortNumber: 1 },
  { id: 'DICT071', category: 'approval_level', code: 'quick', name: '快速审批', sortNumber: 2 },
  { id: 'DICT072', category: 'approval_level', code: 'standard', name: '标准审批', sortNumber: 3 },
  { id: 'DICT073', category: 'approval_level', code: 'strict', name: '严格审批', sortNumber: 4 },
  // ========== 金额阈值 ==========
  { id: 'DICT080', category: 'amount_threshold', code: '1000', name: '免审批上限(元)', sortNumber: 1 },
  { id: 'DICT081', category: 'amount_threshold', code: '10000', name: '快速审批上限(元)', sortNumber: 2 },
  { id: 'DICT082', category: 'amount_threshold', code: '50000', name: '标准审批上限(元)', sortNumber: 3 },
  // ========== 审批规则 ==========
  { id: 'DICT090', category: 'approval_rule', code: 'force_exempt', name: '强制免审', sortNumber: 1 },
  { id: 'DICT091', category: 'approval_rule', code: 'force_strict', name: '强制严格', sortNumber: 2 },
  { id: 'DICT092', category: 'approval_rule', code: 'by_amount', name: '按金额判断', sortNumber: 3 },
  { id: 'DICT093', category: 'approval_rule', code: 'batch_supported', name: '支持批量审批', sortNumber: 4 },
  { id: 'DICT094', category: 'approval_rule', code: 'high_value_threshold', name: '高价值订单阈值(元)', sortNumber: 5 },
  { id: 'DICT095', category: 'approval_rule', code: 'high_value_order_strict', name: '高价值订单强制严格', sortNumber: 6 },
  // ========== 超时配置 ==========
  { id: 'DICT100', category: 'timeout_config', code: 'urgent_timeout', name: '紧急审批超时(小时)', sortNumber: 1 },
  { id: 'DICT101', category: 'timeout_config', code: 'urgent_escalation', name: '紧急审批升级(小时)', sortNumber: 2 },
  { id: 'DICT102', category: 'timeout_config', code: 'normal_timeout', name: '普通审批超时(小时)', sortNumber: 3 },
  { id: 'DICT103', category: 'timeout_config', code: 'normal_escalation', name: '普通审批升级(小时)', sortNumber: 4 },
  { id: 'DICT104', category: 'timeout_config', code: 'hr_timeout', name: 'HR审批超时(小时)', sortNumber: 5 },
  { id: 'DICT105', category: 'timeout_config', code: 'hr_escalation', name: 'HR审批升级(小时)', sortNumber: 6 },
  { id: 'DICT106', category: 'timeout_config', code: 'finance_timeout', name: '财务审批超时(小时)', sortNumber: 7 },
  { id: 'DICT107', category: 'timeout_config', code: 'finance_escalation', name: '财务审批升级(小时)', sortNumber: 8 },
  { id: 'DICT108', category: 'timeout_config', code: 'ultimate_timeout', name: '最终超时(小时)', sortNumber: 9 },
  { id: 'DICT109', category: 'timeout_config', code: 'ultimate_action', name: '最终超时动作', sortNumber: 10 },
  // ========== 委托规则 ==========
  { id: 'DICT110', category: 'delegation_rule', code: 'manager_to_dept_head', name: '经理→部门主管', sortNumber: 1 },
  { id: 'DICT111', category: 'delegation_rule', code: 'dept_head_to_manager', name: '部门主管→经理', sortNumber: 2 },
  { id: 'DICT112', category: 'delegation_rule', code: 'director_to_manager', name: '总监→经理', sortNumber: 3 },
  { id: 'DICT113', category: 'delegation_rule', code: 'hr_to_hr_manager', name: '人事专员→人事经理', sortNumber: 4 },

  // ========== 审批流程配置 ==========
  { id: 'DICT120', category: 'approval_flow', code: 'urgent_priority_threshold', name: '紧急优先级阈值', sortNumber: 1 },
  { id: 'DICT121', category: 'approval_flow', code: 'high_priority_threshold', name: '高优先级阈值', sortNumber: 2 },
  { id: 'DICT122', category: 'approval_flow', code: 'max_reminder_count', name: '最大催办次数', sortNumber: 3 },
  { id: 'DICT123', category: 'approval_flow', code: 'reminder_interval_hours', name: '催办间隔(小时)', sortNumber: 4 },
  { id: 'DICT124', category: 'approval_flow', code: 'withdraw_allowed_hours', name: '允许撤回时间(小时)', sortNumber: 5 },
  { id: 'DICT125', category: 'approval_flow', code: 'approval_validity_days', name: '审批单有效期(天)', sortNumber: 6 },
  { id: 'DICT126', category: 'approval_flow', code: 'auto_cancel_days', name: '超时自动取消(天)', sortNumber: 7 },

  // ========== 请假配置 ==========
  { id: 'DICT130', category: 'leave_config', code: 'quick_approval_days', name: '快速审批天数阈值', sortNumber: 1 },
  { id: 'DICT131', category: 'leave_config', code: 'standard_approval_days', name: '标准审批天数阈值', sortNumber: 2 },
  { id: 'DICT132', category: 'leave_config', code: 'strict_approval_days', name: '严格审批天数阈值', sortNumber: 3 },

  // ========== 加班配置 ==========
  { id: 'DICT140', category: 'overtime_config', code: 'exempt_overtime_hours', name: '免审批加班小时阈值', sortNumber: 1 },
  { id: 'DICT141', category: 'overtime_config', code: 'quick_approval_hours', name: '快速审批加班小时阈值', sortNumber: 2 },

  // ========== 订单配置 ==========
  { id: 'DICT150', category: 'order_config', code: 'high_value_order_amount', name: '高价值订单金额阈值', sortNumber: 1 },
  { id: 'DICT151', category: 'order_config', code: 'urgent_delivery_days', name: '紧急订单交货天数', sortNumber: 2 },

  // ========== 预算配置 ==========
  { id: 'DICT160', category: 'budget_config', code: 'large_budget_amount', name: '大额预算金额阈值', sortNumber: 1 },
  { id: 'DICT161', category: 'budget_config', code: 'budget_adjust_limit_ratio', name: '预算调整限制比例(%)', sortNumber: 2 },

  // ========== 批次配置 ==========
  { id: 'DICT170', category: 'batch_config', code: 'batch_void_require_director', name: '批次作废需总监审批', sortNumber: 1 },
  { id: 'DICT171', category: 'batch_config', code: 'batch_change_threshold', name: '批次变更数量阈值', sortNumber: 2 },

  // ========== 招聘配置 ==========
  { id: 'DICT180', category: 'recruitment_config', code: 'urgent_recruitment_days', name: '紧急招聘天数阈值', sortNumber: 1 },
  { id: 'DICT181', category: 'recruitment_config', code: 'high_salary_threshold', name: '高薪招聘金额阈值', sortNumber: 2 },

  // ========== 系统通知配置 ==========
  { id: 'DICT190', category: 'notification_config', code: 'email_notification_enabled', name: '启用邮件通知', sortNumber: 1 },
  { id: 'DICT191', category: 'notification_config', code: 'sms_notification_enabled', name: '启用短信通知', sortNumber: 2 },
  { id: 'DICT192', category: 'notification_config', code: 'wechat_notification_enabled', name: '启用微信通知', sortNumber: 3 },
  { id: 'DICT193', category: 'notification_config', code: 'notification_reminder_hours', name: '通知提醒间隔(小时)', sortNumber: 4 },
];

/**
 * 获取字典列表
 * 优先从API获取，失败时使用本地存储
 * 后端返回字段: category_code, dict_code, dict_label, dict_value, sort_order, status, created_at, updated_at
 * 前端期望字段: category, code, name, sortNumber, status, createdAt, updatedAt
 */
export async function getDictionaries(category?: string): Promise<Dictionary[]> {
  try {
    // 后端直接返回数组格式，不用 apiClient
    let url = '/api/dictionary/dictionaries';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 调试日志
    console.log('[DictionaryService] API 返回数据量:', Array.isArray(data) ? data.length : '非数组');

    if (Array.isArray(data) && data.length > 0) {
      // 字段映射：将后端字段转换为前端字段
      const mappedData: Dictionary[] = data.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        category: item.category_code as string,
        code: item.dict_code as string,
        name: item.dict_label as string,
        sortNumber: item.sort_order as number,
        status: item.status as string,
        createdAt: item.created_at as string,
        updatedAt: item.updated_at as string,
      }));

      console.log('[DictionaryService] 映射后的第一条数据:', mappedData[0]);

      localStorage.setItem(DICTIONARY_STORAGE_KEY, JSON.stringify(mappedData));
      return mappedData;
    }

    // API 返回空数组或无效数据，尝试使用本地存储
    console.log('[DictionaryService] API 返回空，使用本地存储');
    throw new Error('API 返回空数据');

  } catch (error) {
    console.log('[DictionaryService] API 调用失败，使用本地存储:', error);

    const stored = localStorage.getItem(DICTIONARY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const result = category ? parsed.filter((d: Dictionary) => d.category === category) : parsed;
        console.log('[DictionaryService] 本地存储数据量:', result.length);
        return result;
      } catch {
        console.log('[DictionaryService] 本地存储解析失败，使用默认数据');
        return DEFAULT_DICTIONARIES;
      }
    }
    console.log('[DictionaryService] 无本地存储，使用默认数据');
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
 * 前端字段: category, code, name, sortNumber -> 后端字段: category_code, dict_code, dict_label, sort_order
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
    sort_order: dict.sortNumber || 0,
  });

  const backendData = {
    inserted: data.inserted.map(convertToBackend),
    updated: data.updated.map(convertToBackend),
    deleted: data.deleted,
  };

  const response = await fetch('/api/dictionary/dictionaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendData)
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
    { id: '7', configKey: DEFAULT_USERNAME_KEY, configValue: DEFAULT_USERNAME_VALUE, configType: 'string', description: '系统默认用户名' },
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
