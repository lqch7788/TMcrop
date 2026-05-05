/**
 * 基础数据种子数据
 * 包含部门、仓库、温室等基础字典数据
 * 用于数据库初始化
 * V5.0重构：新增字典数据初始化
 */

import { getDatabase, saveDatabase } from './index';

/**
 * 部门数据结构
 */
export interface DepartmentSeed {
  id: string;
  oid: string;
  name: string;
  managerId: string;
  managerName: string;
  parentOid: string | null;
  sortNumber: number;
  status: string;
  createTime: string;
}

/**
 * 仓库数据结构
 */
export interface WarehouseSeed {
  id: string;
  oid: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
  currentStock: number;
  warehouseType: string;
  status: string;
  createTime: string;
}

/**
 * 温室大棚数据结构
 */
export interface GreenhouseSeed {
  id: string;
  oid: string;
  code: string;
  name: string;
  greenhouseType: string;
  area: number;
  location: string;
  status: string;
  createTime: string;
}

/**
 * 职位数据结构
 */
export interface PositionSeed {
  id: string;
  oid: string;
  code: string;
  name: string;
  departmentOid: string;
  departmentName: string;
  level: number;
  status: string;
  createTime: string;
}

/**
 * 班组数据结构
 */
export interface TeamSeed {
  id: string;
  oid: string;
  teamCode: string;
  teamName: string;
  departmentOid: string;
  departmentName: string;
  leaderId: string;
  leaderName: string;
  shiftType: string;
  memberCount: number;
  status: string;
  createTime: string;
}

/**
 * 字典分类数据结构
 */
export interface DictionaryCategorySeed {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
  sortOrder: number;
  status: string;
}

/**
 * 字典项数据结构
 */
export interface DictionarySeed {
  id: string;
  categoryCode: string;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  color: string;
  sortOrder: number;
  isDefault: number;
  status: string;
}

/**
 * 通知渠道数据结构
 */
export interface NotificationChannelSeed {
  id: string;
  oid: string;
  channelCode: string;
  channelName: string;
  channelType: string;
  isActive: number;
  config: string;
}

/**
 * 通知规则数据结构
 */
export interface NotificationRuleSeed {
  id: string;
  oid: string;
  ruleCode: string;
  ruleName: string;
  eventType: string;
  recipientType: string;
  recipientIds: string;
  channelIds: string;
  frequency: string;
  template: string;
  isActive: number;
}

// ============================================
// 默认部门数据
// ============================================
const defaultDepartments: DepartmentSeed[] = [
  {
    id: 'D001',
    oid: 'DEPT001',
    name: '生产部',
    managerId: 'U002',
    managerName: '李明辉',
    parentOid: null,
    sortNumber: 1,
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'D002',
    oid: 'DEPT002',
    name: '技术部',
    managerId: 'U004',
    managerName: '赵文静',
    parentOid: null,
    sortNumber: 2,
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'D003',
    oid: 'DEPT003',
    name: '仓储部',
    managerId: 'U010',
    managerName: '孙丽娜',
    parentOid: null,
    sortNumber: 3,
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'D004',
    oid: 'DEPT004',
    name: '财务部',
    managerId: 'U013',
    managerName: '陆启闯',
    parentOid: null,
    sortNumber: 4,
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'D005',
    oid: 'DEPT005',
    name: '综合办',
    managerId: 'U014',
    managerName: '王建国',
    parentOid: null,
    sortNumber: 5,
    status: 'active',
    createTime: new Date().toISOString()
  }
];

// ============================================
// 默认仓库数据
// ============================================
const defaultWarehouses: WarehouseSeed[] = [
  {
    id: 'W001',
    oid: 'WH001',
    name: '成品冷库A区',
    code: 'CK-A',
    location: 'A区',
    capacity: 1000,
    currentStock: 650,
    warehouseType: 'cold_storage',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'W002',
    oid: 'WH002',
    name: '成品冷库B区',
    code: 'CK-B',
    location: 'B区',
    capacity: 800,
    currentStock: 400,
    warehouseType: 'cold_storage',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'W003',
    oid: 'WH003',
    name: '常温库',
    code: 'CW-001',
    location: 'C区',
    capacity: 500,
    currentStock: 200,
    warehouseType: 'normal',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'W004',
    oid: 'WH004',
    name: '种子库',
    code: 'SEED-001',
    location: 'C区',
    capacity: 300,
    currentStock: 150,
    warehouseType: 'seed_storage',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'W005',
    oid: 'WH005',
    name: '农药库',
    code: 'PEST-001',
    location: 'D区',
    capacity: 200,
    currentStock: 100,
    warehouseType: 'hazardous',
    status: 'active',
    createTime: new Date().toISOString()
  }
];

// ============================================
// 默认温室大棚数据
// ============================================
const defaultGreenhouses: GreenhouseSeed[] = [
  {
    id: 'G001',
    oid: 'GH001',
    code: 'BLT-001',
    name: '玻璃温室A区',
    greenhouseType: 'glass',
    area: 5000,
    location: 'A区东侧',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'G002',
    oid: 'GH002',
    code: 'BLT-002',
    name: '玻璃温室B区',
    greenhouseType: 'glass',
    area: 5000,
    location: 'A区西侧',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'G003',
    oid: 'GH003',
    code: 'BLT-003',
    name: '玻璃温室C区',
    greenhouseType: 'glass',
    area: 3000,
    location: 'B区东侧',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'G004',
    oid: 'GH004',
    code: 'RGT-001',
    name: '日光温室1号',
    greenhouseType: 'solar',
    area: 800,
    location: 'C区北侧',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'G005',
    oid: 'GH005',
    code: 'RGT-002',
    name: '日光温室2号',
    greenhouseType: 'solar',
    area: 800,
    location: 'C区北侧',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'G006',
    oid: 'GH006',
    code: 'RGT-003',
    name: '日光温室3号',
    greenhouseType: 'solar',
    area: 800,
    location: 'C区中侧',
    status: 'maintenance',
    createTime: new Date().toISOString()
  },
  {
    id: 'G007',
    oid: 'GH007',
    code: 'RGT-004',
    name: '日光温室4号',
    greenhouseType: 'solar',
    area: 800,
    location: 'C区南侧',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'G008',
    oid: 'GH008',
    code: 'PLT-001',
    name: '塑料大棚1号',
    greenhouseType: 'plastic',
    area: 1200,
    location: 'D区',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'G009',
    oid: 'GH009',
    code: 'PLT-002',
    name: '塑料大棚2号',
    greenhouseType: 'plastic',
    area: 1200,
    location: 'D区',
    status: 'active',
    createTime: new Date().toISOString()
  },
  {
    id: 'G010',
    oid: 'GH010',
    code: 'PLT-003',
    name: '露天种植区',
    greenhouseType: 'open',
    area: 10000,
    location: 'E区',
    status: 'active',
    createTime: new Date().toISOString()
  }
];

// ============================================
// 默认职位数据（V5.0新增）
// ============================================
const defaultPositions: PositionSeed[] = [
  { id: 'P001', oid: 'POS001', code: 'MGR', name: '经理', departmentOid: 'DEPT001', departmentName: '生产部', level: 1, status: 'active', createTime: new Date().toISOString() },
  { id: 'P002', oid: 'POS002', code: 'AST', name: '主管', departmentOid: 'DEPT001', departmentName: '生产部', level: 2, status: 'active', createTime: new Date().toISOString() },
  { id: 'P003', oid: 'POS003', code: 'WRK', name: '工人', departmentOid: 'DEPT001', departmentName: '生产部', level: 3, status: 'active', createTime: new Date().toISOString() },
  { id: 'P004', oid: 'POS004', code: 'MGR', name: '经理', departmentOid: 'DEPT002', departmentName: '技术部', level: 1, status: 'active', createTime: new Date().toISOString() },
  { id: 'P005', oid: 'POS005', code: 'ENG', name: '技术员', departmentOid: 'DEPT002', departmentName: '技术部', level: 2, status: 'active', createTime: new Date().toISOString() },
  { id: 'P006', oid: 'POS006', code: 'MGR', name: '经理', departmentOid: 'DEPT003', departmentName: '仓储部', level: 1, status: 'active', createTime: new Date().toISOString() },
  { id: 'P007', oid: 'POS007', code: 'STR', name: '仓管员', departmentOid: 'DEPT003', departmentName: '仓储部', level: 2, status: 'active', createTime: new Date().toISOString() },
  { id: 'P008', oid: 'POS008', code: 'MGR', name: '经理', departmentOid: 'DEPT004', departmentName: '财务部', level: 1, status: 'active', createTime: new Date().toISOString() },
  { id: 'P009', oid: 'POS009', code: 'ACC', name: '会计', departmentOid: 'DEPT004', departmentName: '财务部', level: 2, status: 'active', createTime: new Date().toISOString() },
  { id: 'P010', oid: 'POS010', code: 'MGR', name: '主任', departmentOid: 'DEPT005', departmentName: '综合办', level: 1, status: 'active', createTime: new Date().toISOString() },
];

// ============================================
// 默认班组数据
// ============================================
const defaultTeams: TeamSeed[] = [
  { id: 'T001', oid: 'TEAM001', teamCode: 'PRD-A', teamName: '生产A组', departmentOid: 'DEPT001', departmentName: '生产部', leaderId: 'U002', leaderName: '李明辉', shiftType: 'day', memberCount: 8, status: 'active', createTime: new Date().toISOString() },
  { id: 'T002', oid: 'TEAM002', teamCode: 'PRD-B', teamName: '生产B组', departmentOid: 'DEPT001', departmentName: '生产部', leaderId: 'U003', leaderName: '张晓燕', shiftType: 'day', memberCount: 7, status: 'active', createTime: new Date().toISOString() },
  { id: 'T003', oid: 'TEAM003', teamCode: 'PRD-C', teamName: '生产C组', departmentOid: 'DEPT001', departmentName: '生产部', leaderId: 'U005', leaderName: '陈建国', shiftType: 'night', memberCount: 6, status: 'active', createTime: new Date().toISOString() },
  { id: 'T004', oid: 'TEAM004', teamCode: 'TEC-001', teamName: '技术组', departmentOid: 'DEPT002', departmentName: '技术部', leaderId: 'U004', leaderName: '赵文静', shiftType: 'day', memberCount: 5, status: 'active', createTime: new Date().toISOString() },
  { id: 'T005', oid: 'TEAM005', teamCode: 'WH-001', teamName: '仓储A组', departmentOid: 'DEPT003', departmentName: '仓储部', leaderId: 'U010', leaderName: '孙丽娜', shiftType: 'day', memberCount: 4, status: 'active', createTime: new Date().toISOString() },
  { id: 'T006', oid: 'TEAM006', teamCode: 'WH-002', teamName: '仓储B组', departmentOid: 'DEPT003', departmentName: '仓储部', leaderId: 'U011', leaderName: '周建设', shiftType: 'day', memberCount: 4, status: 'active', createTime: new Date().toISOString() },
];

// ============================================
// 字典分类数据（V5.0新增）
// ============================================
const defaultDictionaryCategories: DictionaryCategorySeed[] = [
  { id: 'DC001', code: 'supplier_type', name: '供应商类型', module: 'supplier', description: '供应商类型分类', sortOrder: 1, status: 'active' },
  { id: 'DC002', code: 'supplier_status', name: '供应商状态', module: 'supplier', description: '供应商状态', sortOrder: 2, status: 'active' },
  { id: 'DC003', code: 'approval_status', name: '审批状态', module: 'approval', description: '审批流程状态', sortOrder: 3, status: 'active' },
  // 分级审批配置分类
  { id: 'DC003A', code: 'approval_level', name: '审批级别', module: 'approval', description: '分级审批级别定义', sortOrder: 3.1, status: 'active' },
  { id: 'DC003B', code: 'amount_threshold', name: '金额阈值', module: 'approval', description: '审批金额阈值配置', sortOrder: 3.2, status: 'active' },
  { id: 'DC003C', code: 'approval_rule', name: '审批规则', module: 'approval', description: '审批特殊规则配置', sortOrder: 3.3, status: 'active' },
  { id: 'DC003D', code: 'timeout_config', name: '超时配置', module: 'approval', description: '审批超时时间配置', sortOrder: 3.4, status: 'active' },
  { id: 'DC003E', code: 'delegation_rule', name: '委托规则', module: 'approval', description: '审批委托规则配置', sortOrder: 3.5, status: 'active' },
  { id: 'DC003F', code: 'approval_flow', name: '审批流程配置', module: 'approval', description: '审批流程参数配置', sortOrder: 3.6, status: 'active' },
  { id: 'DC003G', code: 'leave_config', name: '请假配置', module: 'approval', description: '请假审批规则配置', sortOrder: 3.7, status: 'active' },
  { id: 'DC003H', code: 'overtime_config', name: '加班配置', module: 'approval', description: '加班审批规则配置', sortOrder: 3.8, status: 'active' },
  { id: 'DC003I', code: 'order_config', name: '订单配置', module: 'approval', description: '订单审批规则配置', sortOrder: 3.9, status: 'active' },
  { id: 'DC003J', code: 'budget_config', name: '预算配置', module: 'approval', description: '预算审批规则配置', sortOrder: 3.10, status: 'active' },
  { id: 'DC003K', code: 'batch_config', name: '批次配置', module: 'approval', description: '批次审批规则配置', sortOrder: 3.11, status: 'active' },
  { id: 'DC003L', code: 'recruitment_config', name: '招聘配置', module: 'approval', description: '招聘审批规则配置', sortOrder: 3.12, status: 'active' },
  { id: 'DC003M', code: 'notification_config', name: '系统通知配置', module: 'approval', description: '系统通知参数配置', sortOrder: 3.13, status: 'active' },
  { id: 'DC004', code: 'contract_type', name: '合同类型', module: 'hr', description: '劳动合同类型', sortOrder: 4, status: 'active' },
  { id: 'DC005', code: 'warehouse_type', name: '仓库类型', module: 'warehouse', description: '仓库类型分类', sortOrder: 5, status: 'active' },
  { id: 'DC006', code: 'greenhouse_type', name: '温室类型', module: 'base', description: '温室大棚类型', sortOrder: 6, status: 'active' },
  { id: 'DC007', code: 'greenhouse_status', name: '温室状态', module: 'base', description: '温室状态', sortOrder: 7, status: 'active' },
  { id: 'DC008', code: 'task_status', name: '任务状态', module: 'task', description: '任务状态', sortOrder: 8, status: 'active' },
  { id: 'DC009', code: 'attendance_status', name: '考勤状态', module: 'hr', description: '考勤记录状态', sortOrder: 9, status: 'active' },
  { id: 'DC010', code: 'overtime_type', name: '加班类型', module: 'hr', description: '加班类型分类', sortOrder: 10, status: 'active' },
  { id: 'DC011', code: 'leave_type', name: '请假类型', module: 'hr', description: '请假类型分类', sortOrder: 11, status: 'active' },
  { id: 'DC012', code: 'worker_status', name: '人员状态', module: 'hr', description: '人员在职状态', sortOrder: 12, status: 'active' },
  { id: 'DC013', code: 'salary_status', name: '薪资状态', module: 'hr', description: '薪资发放状态', sortOrder: 13, status: 'active' },
  { id: 'DC014', code: 'crop_category', name: '作物类别', module: 'crop', description: '作物分类', sortOrder: 14, status: 'active' },
  { id: 'DC015', code: 'planting_mode', name: '种植模式', module: 'crop', description: '种植方式', sortOrder: 15, status: 'active' },
  { id: 'DC016', code: 'seedling_type', name: '育苗方式', module: 'crop', description: '育苗方式分类', sortOrder: 16, status: 'active' },
  { id: 'DC017', code: 'harvest_status', name: '采收状态', module: 'crop', description: '采收记录状态', sortOrder: 17, status: 'active' },
  { id: 'DC018', code: 'material_type', name: '物料类型', module: 'material', description: '物料类型分类', sortOrder: 18, status: 'active' },
  { id: 'DC019', code: 'material_status', name: '物料状态', module: 'material', description: '物料库存状态', sortOrder: 19, status: 'active' },
  { id: 'DC020', code: 'purchase_type', name: '采购类型', module: 'purchase', description: '采购申请类型', sortOrder: 20, status: 'active' },
  { id: 'DC021', code: 'energy_type', name: '能源类型', module: 'production', description: '能源消耗类型（电/水/燃气等）', sortOrder: 21, status: 'active' },
  { id: 'DC022', code: 'material_cost_type', name: '物料成本类型', module: 'production', description: '物料成本类型（肥料/农药/种子等）', sortOrder: 22, status: 'active' },
  // ============================================
  // 生产汇总表配置分类（V8.0新增）
  // ============================================
  { id: 'DC101', code: 'problem_config', name: '问题统计配置', module: 'production', description: '问题统计相关配置项', sortOrder: 101, status: 'active' },
  { id: 'DC102', code: 'yield_config', name: '产量统计配置', module: 'production', description: '产量统计相关配置项', sortOrder: 102, status: 'active' },
  { id: 'DC103', code: 'cost_config', name: '成本统计配置', module: 'production', description: '成本统计相关配置项', sortOrder: 103, status: 'active' },
  { id: 'DC104', code: 'labor_config', name: '人工统计配置', module: 'production', description: '人工统计相关配置项', sortOrder: 104, status: 'active' },
  { id: 'DC105', code: 'batch_summary_config', name: '批次汇总配置', module: 'production', description: '批次完成情况汇总配置', sortOrder: 105, status: 'active' },
  { id: 'DC106', code: 'alert_threshold', name: '预警阈值配置', module: 'production', description: '各类预警阈值设置', sortOrder: 106, status: 'active' },
  { id: 'DC107', code: 'report_display_config', name: '报表显示配置', module: 'production', description: '生产报表显示相关配置', sortOrder: 107, status: 'active' },
];

// ============================================
// 字典项数据（V5.0新增）
// ============================================
const defaultDictionaries: DictionarySeed[] = [
  // 供应商类型 - 与供应商编码规则保持一致（SU_前缀 + 大类2位 + 中类2位 + 流水号3位）
  { id: 'D001', categoryCode: 'supplier_type', dictCode: 'SP', dictLabel: '种子与种苗类', dictValue: 'SP', color: 'blue', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'D002', categoryCode: 'supplier_type', dictCode: 'FE', dictLabel: '肥料与土壤改良类', dictValue: 'FE', color: 'green', sortOrder: 2, isDefault: 1, status: 'active' },
  { id: 'D003', categoryCode: 'supplier_type', dictCode: 'PP', dictLabel: '农药与植保产品类', dictValue: 'PP', color: 'red', sortOrder: 3, isDefault: 1, status: 'active' },
  { id: 'D004', categoryCode: 'supplier_type', dictCode: 'EQ', dictLabel: '农业机械与设备类', dictValue: 'EQ', color: 'orange', sortOrder: 4, isDefault: 1, status: 'active' },
  { id: 'D005', categoryCode: 'supplier_type', dictCode: 'FA', dictLabel: '设施农业资材类', dictValue: 'FA', color: 'purple', sortOrder: 5, isDefault: 1, status: 'active' },
  { id: 'D006', categoryCode: 'supplier_type', dictCode: 'IR', dictLabel: '灌溉与水肥一体化类', dictValue: 'IR', color: 'cyan', sortOrder: 6, isDefault: 1, status: 'active' },
  { id: 'D007', categoryCode: 'supplier_type', dictCode: 'OP', dictLabel: '日常劳保与劳动工具类', dictValue: 'OP', color: 'pink', sortOrder: 7, isDefault: 1, status: 'active' },
  { id: 'D008', categoryCode: 'supplier_type', dictCode: 'PH', dictLabel: '仓储与物流资材类', dictValue: 'PH', color: 'indigo', sortOrder: 8, isDefault: 1, status: 'active' },
  { id: 'D009', categoryCode: 'supplier_type', dictCode: 'TS', dictLabel: '检测与技术服务类', dictValue: 'TS', color: 'teal', sortOrder: 9, isDefault: 1, status: 'active' },
  { id: 'D010', categoryCode: 'supplier_type', dictCode: 'UT', dictLabel: '能源与辅助耗材类', dictValue: 'UT', color: 'yellow', sortOrder: 10, isDefault: 1, status: 'active' },
  { id: 'D011', categoryCode: 'supplier_type', dictCode: 'OT', dictLabel: '其他综合类', dictValue: 'OT', color: 'gray', sortOrder: 11, isDefault: 1, status: 'active' },
  // 供应商状态
  { id: 'D012', categoryCode: 'supplier_status', dictCode: 'active', dictLabel: '合作中', dictValue: 'active', color: 'green', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'D013', categoryCode: 'supplier_status', dictCode: 'paused', dictLabel: '暂停', dictValue: 'paused', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D014', categoryCode: 'supplier_status', dictCode: 'terminated', dictLabel: '终止', dictValue: 'terminated', color: 'red', sortOrder: 3, isDefault: 0, status: 'active' },
  // 审批状态
  { id: 'D020', categoryCode: 'approval_status', dictCode: 'pending', dictLabel: '待审批', dictValue: 'pending', color: 'orange', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D021', categoryCode: 'approval_status', dictCode: 'approved', dictLabel: '已通过', dictValue: 'approved', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D022', categoryCode: 'approval_status', dictCode: 'rejected', dictLabel: '已拒绝', dictValue: 'rejected', color: 'red', sortOrder: 3, isDefault: 0, status: 'active' },
  // 审批级别
  { id: 'D023', categoryCode: 'approval_level', dictCode: 'exempt', dictLabel: '免审批', dictValue: 'exempt', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D024', categoryCode: 'approval_level', dictCode: 'quick', dictLabel: '快速审批', dictValue: 'quick', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D025', categoryCode: 'approval_level', dictCode: 'standard', dictLabel: '标准审批', dictValue: 'standard', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D026', categoryCode: 'approval_level', dictCode: 'strict', dictLabel: '严格审批', dictValue: 'strict', color: 'red', sortOrder: 4, isDefault: 0, status: 'active' },
  // 金额阈值
  { id: 'D027', categoryCode: 'amount_threshold', dictCode: '1000', dictLabel: '免审批上限(元)', dictValue: '1000', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D028', categoryCode: 'amount_threshold', dictCode: '10000', dictLabel: '快速审批上限(元)', dictValue: '10000', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D029', categoryCode: 'amount_threshold', dictCode: '50000', dictLabel: '标准审批上限(元)', dictValue: '50000', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  // 审批规则
  { id: 'D02A', categoryCode: 'approval_rule', dictCode: 'force_exempt', dictLabel: '强制免审', dictValue: 'force_exempt', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D02B', categoryCode: 'approval_rule', dictCode: 'force_strict', dictLabel: '强制严格', dictValue: 'force_strict', color: 'red', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D02C', categoryCode: 'approval_rule', dictCode: 'by_amount', dictLabel: '按金额判断', dictValue: 'by_amount', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D02D', categoryCode: 'approval_rule', dictCode: 'batch_supported', dictLabel: '支持批量审批', dictValue: 'batch_supported', color: 'purple', sortOrder: 4, isDefault: 0, status: 'active' },
  // 超时配置
  { id: 'D02E', categoryCode: 'timeout_config', dictCode: 'urgent_timeout', dictLabel: '紧急审批超时(小时)', dictValue: '4', color: 'red', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D02F', categoryCode: 'timeout_config', dictCode: 'urgent_escalation', dictLabel: '紧急审批升级(小时)', dictValue: '2', color: 'red', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D030', categoryCode: 'timeout_config', dictCode: 'normal_timeout', dictLabel: '普通审批超时(小时)', dictValue: '48', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D031', categoryCode: 'timeout_config', dictCode: 'normal_escalation', dictLabel: '普通审批升级(小时)', dictValue: '24', color: 'blue', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'D032', categoryCode: 'timeout_config', dictCode: 'hr_timeout', dictLabel: 'HR审批超时(小时)', dictValue: '24', color: 'purple', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'D033', categoryCode: 'timeout_config', dictCode: 'hr_escalation', dictLabel: 'HR审批升级(小时)', dictValue: '12', color: 'purple', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'D034', categoryCode: 'timeout_config', dictCode: 'finance_timeout', dictLabel: '财务审批超时(小时)', dictValue: '72', color: 'orange', sortOrder: 7, isDefault: 0, status: 'active' },
  { id: 'D035', categoryCode: 'timeout_config', dictCode: 'finance_escalation', dictLabel: '财务审批升级(小时)', dictValue: '48', color: 'orange', sortOrder: 8, isDefault: 0, status: 'active' },
  { id: 'D036', categoryCode: 'timeout_config', dictCode: 'ultimate_timeout', dictLabel: '最终超时(小时)', dictValue: '168', color: 'gray', sortOrder: 9, isDefault: 0, status: 'active' },
  { id: 'D037', categoryCode: 'timeout_config', dictCode: 'ultimate_action', dictLabel: '最终超时动作', dictValue: 'auto_approve', color: 'gray', sortOrder: 10, isDefault: 0, status: 'active' },
  // 委托规则
  { id: 'D038', categoryCode: 'delegation_rule', dictCode: 'manager_to_dept_head', dictLabel: '经理→部门主管', dictValue: 'manager:department_head', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D039', categoryCode: 'delegation_rule', dictCode: 'dept_head_to_manager', dictLabel: '部门主管→经理', dictValue: 'department_head:manager', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D03A', categoryCode: 'delegation_rule', dictCode: 'director_to_manager', dictLabel: '总监→经理', dictValue: 'director:manager', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D03B', categoryCode: 'delegation_rule', dictCode: 'hr_to_hr_manager', dictLabel: '人事专员→人事经理', dictValue: 'hr:hr_manager', color: 'purple', sortOrder: 4, isDefault: 0, status: 'active' },
  // 审批流程配置
  { id: 'D03C', categoryCode: 'approval_flow', dictCode: 'urgent_priority_threshold', dictLabel: '紧急优先级阈值', dictValue: '1', color: 'red', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D03D', categoryCode: 'approval_flow', dictCode: 'high_priority_threshold', dictLabel: '高优先级阈值', dictValue: '3', color: 'orange', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D03E', categoryCode: 'approval_flow', dictCode: 'max_reminder_count', dictLabel: '最大催办次数', dictValue: '3', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D03F', categoryCode: 'approval_flow', dictCode: 'reminder_interval_hours', dictLabel: '催办间隔(小时)', dictValue: '24', color: 'blue', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'D03G', categoryCode: 'approval_flow', dictCode: 'withdraw_allowed_hours', dictLabel: '允许撤回时间(小时)', dictValue: '48', color: 'gray', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'D03H', categoryCode: 'approval_flow', dictCode: 'approval_validity_days', dictLabel: '审批单有效期(天)', dictValue: '30', color: 'gray', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'D03I', categoryCode: 'approval_flow', dictCode: 'auto_cancel_days', dictLabel: '超时自动取消(天)', dictValue: '7', color: 'gray', sortOrder: 7, isDefault: 0, status: 'active' },
  // 请假配置
  { id: 'D03J', categoryCode: 'leave_config', dictCode: 'quick_approval_days', dictLabel: '快速审批天数阈值', dictValue: '3', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D03K', categoryCode: 'leave_config', dictCode: 'standard_approval_days', dictLabel: '标准审批天数阈值', dictValue: '7', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D03L', categoryCode: 'leave_config', dictCode: 'strict_approval_days', dictLabel: '严格审批天数阈值', dictValue: '30', color: 'red', sortOrder: 3, isDefault: 0, status: 'active' },
  // 加班配置
  { id: 'D03M', categoryCode: 'overtime_config', dictCode: 'exempt_overtime_hours', dictLabel: '免审批加班小时阈值', dictValue: '2', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D03N', categoryCode: 'overtime_config', dictCode: 'quick_approval_hours', dictLabel: '快速审批加班小时阈值', dictValue: '8', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  // 订单配置
  { id: 'D03O', categoryCode: 'order_config', dictCode: 'high_value_order_amount', dictLabel: '高价值订单金额阈值', dictValue: '100000', color: 'red', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D03P', categoryCode: 'order_config', dictCode: 'urgent_delivery_days', dictLabel: '紧急订单交货天数', dictValue: '7', color: 'orange', sortOrder: 2, isDefault: 0, status: 'active' },
  // 预算配置
  { id: 'D03Q', categoryCode: 'budget_config', dictCode: 'large_budget_amount', dictLabel: '大额预算金额阈值', dictValue: '50000', color: 'red', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D03R', categoryCode: 'budget_config', dictCode: 'budget_adjust_limit_ratio', dictLabel: '预算调整限制比例(%)', dictValue: '20', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  // 批次配置
  { id: 'D03S', categoryCode: 'batch_config', dictCode: 'batch_void_require_director', dictLabel: '批次作废需总监审批', dictValue: 'true', color: 'red', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D03T', categoryCode: 'batch_config', dictCode: 'batch_change_threshold', dictLabel: '批次变更数量阈值', dictValue: '1000', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  // 招聘配置
  { id: 'D03U', categoryCode: 'recruitment_config', dictCode: 'urgent_recruitment_days', dictLabel: '紧急招聘天数阈值', dictValue: '7', color: 'orange', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D03V', categoryCode: 'recruitment_config', dictCode: 'high_salary_threshold', dictLabel: '高薪招聘金额阈值', dictValue: '20000', color: 'red', sortOrder: 2, isDefault: 0, status: 'active' },
  // 系统通知配置
  { id: 'D03W', categoryCode: 'notification_config', dictCode: 'email_notification_enabled', dictLabel: '启用邮件通知', dictValue: 'true', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D03X', categoryCode: 'notification_config', dictCode: 'sms_notification_enabled', dictLabel: '启用短信通知', dictValue: 'false', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D03Y', categoryCode: 'notification_config', dictCode: 'wechat_notification_enabled', dictLabel: '启用微信通知', dictValue: 'false', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D03Z', categoryCode: 'notification_config', dictCode: 'notification_reminder_hours', dictLabel: '通知提醒间隔(小时)', dictValue: '24', color: 'gray', sortOrder: 4, isDefault: 0, status: 'active' },
  // 温室类型
  { id: 'D030', categoryCode: 'greenhouse_type', dictCode: 'glass', dictLabel: '玻璃温室', dictValue: 'glass', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D031', categoryCode: 'greenhouse_type', dictCode: 'solar', dictLabel: '日光温室', dictValue: 'solar', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D032', categoryCode: 'greenhouse_type', dictCode: 'plastic', dictLabel: '塑料大棚', dictValue: 'plastic', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D033', categoryCode: 'greenhouse_type', dictCode: 'open', dictLabel: '露天种植', dictValue: 'open', color: 'gray', sortOrder: 4, isDefault: 0, status: 'active' },
  // 温室状态
  { id: 'D040', categoryCode: 'greenhouse_status', dictCode: 'using', dictLabel: '使用中', dictValue: 'using', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D041', categoryCode: 'greenhouse_status', dictCode: 'maintenance', dictLabel: '维护中', dictValue: 'maintenance', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D042', categoryCode: 'greenhouse_status', dictCode: 'idle', dictLabel: '空闲', dictValue: 'idle', color: 'gray', sortOrder: 3, isDefault: 0, status: 'active' },
  // 任务状态
  { id: 'D050', categoryCode: 'task_status', dictCode: 'pending', dictLabel: '待处理', dictValue: 'pending', color: 'orange', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D051', categoryCode: 'task_status', dictCode: 'in_progress', dictLabel: '进行中', dictValue: 'in_progress', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D052', categoryCode: 'task_status', dictCode: 'completed', dictLabel: '已完成', dictValue: 'completed', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D053', categoryCode: 'task_status', dictCode: 'cancelled', dictLabel: '已取消', dictValue: 'cancelled', color: 'gray', sortOrder: 4, isDefault: 0, status: 'active' },
  // 人员状态
  { id: 'D060', categoryCode: 'worker_status', dictCode: 'working', dictLabel: '在职', dictValue: 'working', color: 'green', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'D061', categoryCode: 'worker_status', dictCode: 'resigned', dictLabel: '离职', dictValue: 'resigned', color: 'red', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D062', categoryCode: 'worker_status', dictCode: 'retired', dictLabel: '退休', dictValue: 'retired', color: 'gray', sortOrder: 3, isDefault: 0, status: 'active' },
  // 作物类别
  { id: 'D070', categoryCode: 'crop_category', dictCode: 'vegetable', dictLabel: '蔬菜类', dictValue: 'vegetable', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D071', categoryCode: 'crop_category', dictCode: 'fruit', dictLabel: '水果类', dictValue: 'fruit', color: 'red', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D072', categoryCode: 'crop_category', dictCode: 'grain', dictLabel: '粮食类', dictValue: 'grain', color: 'yellow', sortOrder: 3, isDefault: 0, status: 'active' },
  // 种植模式
  { id: 'D080', categoryCode: 'planting_mode', dictCode: 'greenhouse', dictLabel: '温室种植', dictValue: 'greenhouse', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D081', categoryCode: 'planting_mode', dictCode: 'open', dictLabel: '露天种植', dictValue: 'open', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D082', categoryCode: 'planting_mode', dictCode: 'hydroponic', dictLabel: '水培', dictValue: 'hydroponic', color: 'cyan', sortOrder: 3, isDefault: 0, status: 'active' },
  // 育苗方式
  { id: 'D090', categoryCode: 'seedling_type', dictCode: 'plug', dictLabel: '穴盘育苗', dictValue: 'plug', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D091', categoryCode: 'seedling_type', dictCode: 'direct', dictLabel: '直播育苗', dictValue: 'direct', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D092', categoryCode: 'seedling_type', dictCode: 'grafting', dictLabel: '嫁接育苗', dictValue: 'grafting', color: 'purple', sortOrder: 3, isDefault: 0, status: 'active' },
  // 采收状态
  { id: 'D100', categoryCode: 'harvest_status', dictCode: 'pending', dictLabel: '待采收', dictValue: 'pending', color: 'orange', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D101', categoryCode: 'harvest_status', dictCode: 'harvested', dictLabel: '已采收', dictValue: 'harvested', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D102', categoryCode: 'harvest_status', dictCode: 'graded', dictLabel: '已分级', dictValue: 'graded', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  // 物料类型
  { id: 'D110', categoryCode: 'material_type', dictCode: 'seed', dictLabel: '种子', dictValue: 'seed', color: 'yellow', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D111', categoryCode: 'material_type', dictCode: 'seedling', dictLabel: '种苗', dictValue: 'seedling', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D112', categoryCode: 'material_type', dictCode: 'fertilizer', dictLabel: '肥料', dictValue: 'fertilizer', color: 'brown', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D113', categoryCode: 'material_type', dictCode: 'pesticide', dictLabel: '农药', dictValue: 'pesticide', color: 'red', sortOrder: 4, isDefault: 0, status: 'active' },
  // 采购类型
  { id: 'D120', categoryCode: 'purchase_type', dictCode: 'production', dictLabel: '生产性采购', dictValue: 'production', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D121', categoryCode: 'purchase_type', dictCode: 'emergency', dictLabel: '紧急采购', dictValue: 'emergency', color: 'red', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D122', categoryCode: 'purchase_type', dictCode: 'daily', dictLabel: '日常采购', dictValue: 'daily', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  // 能源类型
  { id: 'D130', categoryCode: 'energy_type', dictCode: 'electricity', dictLabel: '电费', dictValue: 'electricity', color: 'yellow', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D131', categoryCode: 'energy_type', dictCode: 'water', dictLabel: '水费', dictValue: 'water', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D132', categoryCode: 'energy_type', dictCode: 'gas', dictLabel: '燃气费', dictValue: 'gas', color: 'orange', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D133', categoryCode: 'energy_type', dictCode: 'heating', dictLabel: '暖气费', dictValue: 'heating', color: 'red', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'D134', categoryCode: 'energy_type', dictCode: 'other', dictLabel: '其他能源', dictValue: 'other', color: 'gray', sortOrder: 5, isDefault: 0, status: 'active' },
  // 物料成本类型
  { id: 'D135', categoryCode: 'material_cost_type', dictCode: 'fertilizer', dictLabel: '肥料', dictValue: 'fertilizer', color: 'brown', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D136', categoryCode: 'material_cost_type', dictCode: 'pesticide', dictLabel: '农药', dictValue: 'pesticide', color: 'red', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D137', categoryCode: 'material_cost_type', dictCode: 'seed', dictLabel: '种子种苗', dictValue: 'seed', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D138', categoryCode: 'material_cost_type', dictCode: 'film', dictLabel: '基质农膜', dictValue: 'film', color: 'purple', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'D139', categoryCode: 'material_cost_type', dictCode: 'other', dictLabel: '其他物料', dictValue: 'other', color: 'gray', sortOrder: 5, isDefault: 0, status: 'active' },
  // 来源途径
  { id: 'D140', categoryCode: 'source_origin', dictCode: 'external_purchase', dictLabel: '外部采购', dictValue: 'external_purchase', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D141', categoryCode: 'source_origin', dictCode: 'self_produced', dictLabel: '内部自繁', dictValue: 'self_produced', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D142', categoryCode: 'source_origin', dictCode: 'commissioned', dictLabel: '委托培育', dictValue: 'commissioned', color: 'purple', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D143', categoryCode: 'source_origin', dictCode: 'gift', dictLabel: '政府/机构赠送', dictValue: 'gift', color: 'orange', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'D144', categoryCode: 'source_origin', dictCode: 'self_retained', dictLabel: '自留种', dictValue: 'self_retained', color: 'yellow', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'D145', categoryCode: 'source_origin', dictCode: 'other', dictLabel: '其他', dictValue: 'other', color: 'gray', sortOrder: 6, isDefault: 0, status: 'active' },
  // ============================================
  // 生产汇总表字典项（V8.0新增）
  // ============================================
  // 问题统计配置
  { id: 'PD001', categoryCode: 'problem_config', dictCode: 'problem_severity_high', dictLabel: '严重问题阈值(次)', dictValue: '3', color: 'red', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PD002', categoryCode: 'problem_config', dictCode: 'problem_severity_medium', dictLabel: '中等问题阈值(次)', dictValue: '5', color: 'orange', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PD003', categoryCode: 'problem_config', dictCode: 'problem_pending_warning', dictLabel: '待处理问题预警数', dictValue: '10', color: 'yellow', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PD004', categoryCode: 'problem_config', dictCode: 'problem_response_timeout', dictLabel: '问题响应超时(小时)', dictValue: '24', color: 'red', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'PD005', categoryCode: 'problem_config', dictCode: 'problem_resolve_timeout', dictLabel: '问题解决超时(天)', dictValue: '7', color: 'orange', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'PD006', categoryCode: 'problem_config', dictCode: 'problem_auto_escalation', dictLabel: '问题自动升级', dictValue: 'true', color: 'blue', sortOrder: 6, isDefault: 0, status: 'active' },
  // 产量统计配置
  { id: 'PD010', categoryCode: 'yield_config', dictCode: 'yield_target_rate', dictLabel: '目标产量达标率(%)', dictValue: '95', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PD011', categoryCode: 'yield_config', dictCode: 'yield_excellent_rate', dictLabel: '优秀产量达标率(%)', dictValue: '105', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PD012', categoryCode: 'yield_config', dictCode: 'yield_warning_rate', dictLabel: '产量预警阈值(%)', dictValue: '80', color: 'yellow', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PD013', categoryCode: 'yield_config', dictCode: 'yield_danger_rate', dictLabel: '产量危险阈值(%)', dictValue: '60', color: 'red', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'PD014', categoryCode: 'yield_config', dictCode: 'yield_loss_rate', dictLabel: '采收损耗率上限(%)', dictValue: '10', color: 'orange', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'PD015', categoryCode: 'yield_config', dictCode: 'yield_stat_by_crop', dictLabel: '按作物统计', dictValue: 'true', color: 'blue', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'PD016', categoryCode: 'yield_config', dictCode: 'yield_stat_by_greenhouse', dictLabel: '按温室统计', dictValue: 'true', color: 'blue', sortOrder: 7, isDefault: 0, status: 'active' },
  { id: 'PD017', categoryCode: 'yield_config', dictCode: 'yield_stat_by_month', dictLabel: '按月份统计', dictValue: 'true', color: 'blue', sortOrder: 8, isDefault: 0, status: 'active' },
  // 成本统计配置
  { id: 'PD020', categoryCode: 'cost_config', dictCode: 'cost_warning_ratio', dictLabel: '成本预警比例(%)', dictValue: '90', color: 'yellow', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PD021', categoryCode: 'cost_config', dictCode: 'cost_danger_ratio', dictLabel: '成本超支比例(%)', dictValue: '110', color: 'red', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PD022', categoryCode: 'cost_config', dictCode: 'cost_unit_labor', dictLabel: '人工成本单位(元/小时)', dictValue: '50', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PD023', categoryCode: 'cost_config', dictCode: 'cost_stat_by_type', dictLabel: '按类型统计成本', dictValue: 'true', color: 'blue', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'PD024', categoryCode: 'cost_config', dictCode: 'cost_stat_by_batch', dictLabel: '按批次统计成本', dictValue: 'true', color: 'blue', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'PD025', categoryCode: 'cost_config', dictCode: 'cost_stat_by_month', dictLabel: '按月份统计成本', dictValue: 'true', color: 'blue', sortOrder: 6, isDefault: 0, status: 'active' },
  // 人工统计配置
  { id: 'PD030', categoryCode: 'labor_config', dictCode: 'labor_efficiency_target', dictLabel: '人工效率目标(平方米/人天)', dictValue: '100', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PD031', categoryCode: 'labor_config', dictCode: 'labor_overtime_threshold', dictLabel: '加班阈值(小时/天)', dictValue: '2', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PD032', categoryCode: 'labor_config', dictCode: 'labor_absent_rate', dictLabel: '旷工率预警(%)', dictValue: '5', color: 'red', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PD033', categoryCode: 'labor_config', dictCode: 'labor_stat_by_team', dictLabel: '按班组统计', dictValue: 'true', color: 'blue', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'PD034', categoryCode: 'labor_config', dictCode: 'labor_stat_by_task', dictLabel: '按任务统计', dictValue: 'true', color: 'blue', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'PD035', categoryCode: 'labor_config', dictCode: 'labor_stat_by_month', dictLabel: '按月份统计', dictValue: 'true', color: 'blue', sortOrder: 6, isDefault: 0, status: 'active' },
  // 批次汇总配置
  { id: 'PD040', categoryCode: 'batch_summary_config', dictCode: 'batch_excellent_rate', dictLabel: '批次优秀完成率(%)', dictValue: '95', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PD041', categoryCode: 'batch_summary_config', dictCode: 'batch_good_rate', dictLabel: '批次良好完成率(%)', dictValue: '85', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PD042', categoryCode: 'batch_summary_config', dictCode: 'batch_pass_rate', dictLabel: '批次合格完成率(%)', dictValue: '70', color: 'yellow', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PD043', categoryCode: 'batch_summary_config', dictCode: 'batch_delay_warning', dictLabel: '批次延期预警(天)', dictValue: '3', color: 'orange', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'PD044', categoryCode: 'batch_summary_config', dictCode: 'batch_show_tasks', dictLabel: '显示任务统计', dictValue: 'true', color: 'blue', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'PD045', categoryCode: 'batch_summary_config', dictCode: 'batch_show_problems', dictLabel: '显示问题统计', dictValue: 'true', color: 'blue', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'PD046', categoryCode: 'batch_summary_config', dictCode: 'batch_show_yield', dictLabel: '显示产量统计', dictValue: 'true', color: 'blue', sortOrder: 7, isDefault: 0, status: 'active' },
  { id: 'PD047', categoryCode: 'batch_summary_config', dictCode: 'batch_show_labor', dictLabel: '显示人工统计', dictValue: 'true', color: 'blue', sortOrder: 8, isDefault: 0, status: 'active' },
  // 预警阈值配置
  { id: 'PD050', categoryCode: 'alert_threshold', dictCode: 'alert_low_stock', dictLabel: '库存不足预警(%)', dictValue: '20', color: 'red', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PD051', categoryCode: 'alert_threshold', dictCode: 'alert_high_stock', dictLabel: '库存积压预警(%)', dictValue: '100', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PD052', categoryCode: 'alert_threshold', dictCode: 'alert_quality_rate', dictLabel: '质量合格率下限(%)', dictValue: '90', color: 'red', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PD053', categoryCode: 'alert_threshold', dictCode: 'alert_equipment_downtime', dictLabel: '设备停机预警(小时)', dictValue: '24', color: 'orange', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'PD054', categoryCode: 'alert_threshold', dictCode: 'alert_task_overdue', dictLabel: '任务逾期预警(天)', dictValue: '2', color: 'red', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'PD055', categoryCode: 'alert_threshold', dictCode: 'alert_pest_risk', dictLabel: '病虫害风险预警', dictValue: 'true', color: 'red', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'PD056', categoryCode: 'alert_threshold', dictCode: 'alert_weather_risk', dictLabel: '极端天气预警', dictValue: 'true', color: 'orange', sortOrder: 7, isDefault: 0, status: 'active' },
  // 报表显示配置
  { id: 'PD060', categoryCode: 'report_display_config', dictCode: 'report_default_period', dictLabel: '报表默认周期', dictValue: 'month', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PD061', categoryCode: 'report_display_config', dictCode: 'report_show_charts', dictLabel: '显示图表', dictValue: 'true', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PD062', categoryCode: 'report_display_config', dictCode: 'report_export_excel', dictLabel: '允许导出Excel', dictValue: 'true', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PD063', categoryCode: 'report_display_config', dictCode: 'report_auto_refresh', dictLabel: '自动刷新间隔(分钟)', dictValue: '30', color: 'blue', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'PD064', categoryCode: 'report_display_config', dictCode: 'report_page_size', dictLabel: '默认分页大小', dictValue: '20', color: 'blue', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'PD065', categoryCode: 'report_display_config', dictCode: 'report_decimal_places', dictLabel: '小数位数', dictValue: '2', color: 'blue', sortOrder: 6, isDefault: 0, status: 'active' },
];

// ============================================
// 审批工作流数据结构
// ============================================
export interface ApprovalWorkflowSeed {
  id: string;
  name: string;
  code: string;
  description: string;
  module: string;
  triggerCondition: string;
  nodes: Array<{
    id: string;
    name: string;
    approverRole: string;
    approverName?: string;
    timeoutHours: number;
    autoApproveOnTimeout: boolean;
    requireComment: boolean;
  }>;
  status: string;
}

// ============================================
// 默认审批工作流数据
// ============================================
const defaultApprovalWorkflows: ApprovalWorkflowSeed[] = [
  {
    id: 'AWF001',
    name: '生产计划审批',
    code: 'production_plan',
    description: '生产计划创建后的审批流程',
    module: 'production',
    triggerCondition: '创建生产计划时',
    status: 'active',
    nodes: [
      { id: 'n1', name: '部门主管审批', approverRole: 'production_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n2', name: '总经理审批', approverRole: 'admin', timeoutHours: 48, autoApproveOnTimeout: false, requireComment: false },
    ],
  },
  {
    id: 'AWF002',
    name: '物料采购审批',
    code: 'material_purchase',
    description: '物料采购申请的审批流程',
    module: 'materials',
    triggerCondition: '采购金额 > 5000元',
    status: 'active',
    nodes: [
      { id: 'n1', name: '仓库主管审批', approverRole: 'warehouse_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n2', name: '财务审批', approverRole: 'finance', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n3', name: '总经理审批', approverRole: 'admin', timeoutHours: 48, autoApproveOnTimeout: false, requireComment: false },
    ],
  },
  {
    id: 'AWF003',
    name: '人员入职审批',
    code: 'hr_onboard',
    description: '新员工入职审批流程',
    module: 'hr',
    triggerCondition: '新员工入职时',
    status: 'active',
    nodes: [
      { id: 'n1', name: 'HR主管审批', approverRole: 'hr_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n2', name: '部门主管确认', approverRole: 'production_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: false },
    ],
  },
  {
    id: 'AWF004',
    name: '技术方案审批',
    code: 'tech_solution',
    description: '农业技术方案审批',
    module: 'tech',
    triggerCondition: '技术方案发布前',
    status: 'active',
    nodes: [
      { id: 'n1', name: '技术主管审批', approverRole: 'tech_manager', timeoutHours: 48, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n2', name: '生产主管确认', approverRole: 'production_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: false },
    ],
  },
];

// ============================================
// 默认通知渠道数据
// ============================================
const defaultNotificationChannels: NotificationChannelSeed[] = [
  {
    id: 'NC001',
    oid: 'NC001',
    channelCode: 'in-app',
    channelName: '系统内消息',
    channelType: 'in-app',
    isActive: 1,
    config: '{}'
  },
  {
    id: 'NC002',
    oid: 'NC002',
    channelCode: 'email',
    channelName: '邮件通知',
    channelType: 'email',
    isActive: 1,
    config: JSON.stringify({ smtpHost: 'smtp.example.com', smtpPort: '587', fromEmail: 'noreply@example.com' })
  },
  {
    id: 'NC003',
    oid: 'NC003',
    channelCode: 'sms',
    channelName: '短信通知',
    channelType: 'sms',
    isActive: 0,
    config: JSON.stringify({ apiKey: '', provider: 'aliyun' })
  },
  {
    id: 'NC004',
    oid: 'NC004',
    channelCode: 'wechat',
    channelName: '企业微信',
    channelType: 'wechat',
    isActive: 0,
    config: JSON.stringify({ webhook: '', corpId: '' })
  }
];

// ============================================
// 默认通知规则数据
// ============================================
const defaultNotificationRules: NotificationRuleSeed[] = [
  {
    id: 'NR001',
    oid: 'NR001',
    ruleCode: 'approval_pending',
    ruleName: '审批待办通知',
    eventType: 'approval_pending',
    recipientType: 'approver',
    recipientIds: JSON.stringify(['approver']),
    channelIds: JSON.stringify(['NC001', 'NC002']),
    frequency: 'immediate',
    template: '',
    isActive: 1
  },
  {
    id: 'NR002',
    oid: 'NR002',
    ruleCode: 'approval_result',
    ruleName: '审批结果通知',
    eventType: 'approval_result',
    recipientType: 'applicant',
    recipientIds: JSON.stringify(['applicant']),
    channelIds: JSON.stringify(['NC001']),
    frequency: 'immediate',
    template: '',
    isActive: 1
  },
  {
    id: 'NR003',
    oid: 'NR003',
    ruleCode: 'alert',
    ruleName: '预警通知',
    eventType: 'alert',
    recipientType: 'admin',
    recipientIds: JSON.stringify(['admin', 'manager']),
    channelIds: JSON.stringify(['NC001', 'NC002', 'NC003']),
    frequency: 'immediate',
    template: '',
    isActive: 1
  },
  {
    id: 'NR004',
    oid: 'NR004',
    ruleCode: 'task_assigned',
    ruleName: '任务分配通知',
    eventType: 'task_assigned',
    recipientType: 'assignee',
    recipientIds: JSON.stringify(['assignee']),
    channelIds: JSON.stringify(['NC001']),
    frequency: 'immediate',
    template: '',
    isActive: 1
  },
  {
    id: 'NR005',
    oid: 'NR005',
    ruleCode: 'daily_summary',
    ruleName: '每日汇总',
    eventType: 'daily_summary',
    recipientType: 'all',
    recipientIds: JSON.stringify(['all']),
    channelIds: JSON.stringify(['NC001', 'NC002']),
    frequency: 'daily',
    template: '',
    isActive: 0
  },
  {
    id: 'NR006',
    oid: 'NR006',
    ruleCode: 'announcement',
    ruleName: '系统公告',
    eventType: 'announcement',
    recipientType: 'all',
    recipientIds: JSON.stringify(['all']),
    channelIds: JSON.stringify(['NC001', 'NC002', 'NC003']),
    frequency: 'immediate',
    template: '',
    isActive: 1
  }
];

/**
 * 导入部门数据
 */
export function seedDepartments() {
  const db = getDatabase();

  for (const dept of defaultDepartments) {
    db.run(`
      INSERT OR REPLACE INTO departments
      (id, oid, name, manager_id, manager_name, parent_oid, sort_number, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dept.id,
      dept.oid,
      dept.name,
      dept.managerId,
      dept.managerName,
      dept.parentOid,
      dept.sortNumber,
      dept.status,
      dept.createTime || new Date().toISOString(),
      dept.createTime || new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultDepartments.length} 条部门数据`);
}

/**
 * 导入仓库数据
 */
export function seedWarehouses() {
  const db = getDatabase();

  for (const wh of defaultWarehouses) {
    db.run(`
      INSERT OR REPLACE INTO warehouses
      (id, oid, name, code, location, capacity, current_stock, warehouse_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      wh.id,
      wh.oid,
      wh.name,
      wh.code,
      wh.location,
      wh.capacity,
      wh.currentStock,
      wh.warehouseType,
      wh.status,
      wh.createTime || new Date().toISOString(),
      wh.createTime || new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultWarehouses.length} 条仓库数据`);
}

/**
 * 导入温室大棚数据
 */
export function seedGreenhouses() {
  const db = getDatabase();

  for (const gh of defaultGreenhouses) {
    db.run(`
      INSERT OR REPLACE INTO greenhouses
      (id, oid, code, name, greenhouse_type, area, location, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      gh.id,
      gh.oid,
      gh.code,
      gh.name,
      gh.greenhouseType,
      gh.area,
      gh.location,
      gh.status,
      gh.createTime || new Date().toISOString(),
      gh.createTime || new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultGreenhouses.length} 条温室大棚数据`);
}

/**
 * 导入职位数据
 */
export function seedPositions() {
  const db = getDatabase();

  for (const pos of defaultPositions) {
    db.run(`
      INSERT OR REPLACE INTO positions
      (id, oid, code, name, department_oid, department_name, level, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pos.id,
      pos.oid,
      pos.code,
      pos.name,
      pos.departmentOid,
      pos.departmentName,
      pos.level,
      pos.status,
      pos.createTime || new Date().toISOString(),
      pos.createTime || new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultPositions.length} 条职位数据`);
}

/**
 * 导入班组数据
 */
export function seedTeams() {
  const db = getDatabase();

  for (const team of defaultTeams) {
    db.run(`
      INSERT OR REPLACE INTO teams
      (id, oid, team_code, team_name, department_oid, department_name, leader_id, leader_name, shift_type, member_count, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      team.id,
      team.oid,
      team.teamCode,
      team.teamName,
      team.departmentOid,
      team.departmentName,
      team.leaderId,
      team.leaderName,
      team.shiftType,
      team.memberCount,
      team.status,
      team.createTime || new Date().toISOString(),
      team.createTime || new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultTeams.length} 条班组数据`);
}

/**
 * 导入字典分类数据
 */
export function seedDictionaryCategories() {
  const db = getDatabase();

  for (const cat of defaultDictionaryCategories) {
    db.run(`
      INSERT OR REPLACE INTO dictionary_categories
      (id, code, name, module, description, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cat.id,
      cat.code,
      cat.name,
      cat.module,
      cat.description,
      cat.sortOrder,
      cat.status,
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultDictionaryCategories.length} 条字典分类数据`);
}

/**
 * 导入字典项数据
 */
export function seedDictionaries() {
  const db = getDatabase();

  for (const dict of defaultDictionaries) {
    db.run(`
      INSERT OR REPLACE INTO dictionaries
      (id, category_code, dict_code, dict_label, dict_value, color, sort_order, is_default, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dict.id,
      dict.categoryCode,
      dict.dictCode,
      dict.dictLabel,
      dict.dictValue,
      dict.color,
      dict.sortOrder,
      dict.isDefault,
      dict.status,
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultDictionaries.length} 条字典项数据`);
}

/**
 * 导入通知渠道数据
 */
export function seedNotificationChannels() {
  const db = getDatabase();

  for (const channel of defaultNotificationChannels) {
    db.run(`
      INSERT OR REPLACE INTO notification_channels
      (id, oid, channel_code, channel_name, channel_type, is_active, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      channel.id,
      channel.oid,
      channel.channelCode,
      channel.channelName,
      channel.channelType,
      channel.isActive,
      channel.config,
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultNotificationChannels.length} 条通知渠道数据`);
}

/**
 * 导入通知规则数据
 */
export function seedNotificationRules() {
  const db = getDatabase();

  for (const rule of defaultNotificationRules) {
    db.run(`
      INSERT OR REPLACE INTO notification_rules
      (id, oid, rule_code, rule_name, event_type, recipient_type, recipient_ids, channel_ids, frequency, template, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      rule.id,
      rule.oid,
      rule.ruleCode,
      rule.ruleName,
      rule.eventType,
      rule.recipientType,
      rule.recipientIds,
      rule.channelIds,
      rule.frequency,
      rule.template,
      rule.isActive,
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultNotificationRules.length} 条通知规则数据`);
}

/**
 * 导入审批工作流数据
 */
export function seedApprovalWorkflows() {
  const db = getDatabase();

  for (const workflow of defaultApprovalWorkflows) {
    db.run(`
      INSERT OR REPLACE INTO approval_workflows
      (id, name, code, description, module, trigger_condition, nodes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      workflow.id,
      workflow.name,
      workflow.code,
      workflow.description,
      workflow.module,
      workflow.triggerCondition,
      JSON.stringify(workflow.nodes),
      workflow.status,
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${defaultApprovalWorkflows.length} 条审批工作流数据`);
}

/**
 * 导出所有基础数据
 */
export function exportBasicData() {
  seedDepartments();
  seedWarehouses();
  seedGreenhouses();
  seedPositions();
  seedTeams();
  seedDictionaryCategories();
  seedDictionaries();
  seedNotificationChannels();
  seedNotificationRules();
  seedApprovalWorkflows();
  saveDatabase();
  console.log('基础数据导入完成');
}

/**
 * 获取默认部门数据
 */
export function getDefaultDepartments(): DepartmentSeed[] {
  return defaultDepartments;
}

/**
 * 获取默认仓库数据
 */
export function getDefaultWarehouses(): WarehouseSeed[] {
  return defaultWarehouses;
}

/**
 * 获取默认温室数据
 */
export function getDefaultGreenhouses(): GreenhouseSeed[] {
  return defaultGreenhouses;
}
