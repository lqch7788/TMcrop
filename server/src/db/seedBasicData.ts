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
  code: string;
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
    code: 'DEPT_PROD',
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
    code: 'DEPT_TECH',
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
    code: 'DEPT_WH',
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
    code: 'DEPT_FIN',
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
    code: 'DEPT_ADMIN',
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
  { id: 'DC008A', code: 'announcement_category', name: '公告分类', module: 'task', description: '公告分类', sortOrder: 8.1, status: 'active' },
  { id: 'DC008B', code: 'announcement_type', name: '公告类型', module: 'task', description: '公告类型分类（生产通告/行政通告）', sortOrder: 8.15, status: 'active' },
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
  { id: 'DC023', code: 'planting_season_status', name: '种植季状态', module: 'base', description: '种植季记录状态（种植中/已收获/休耕/准备中）', sortOrder: 23, status: 'active' },
  { id: 'DC024', code: 'block_type', name: '区块类型', module: 'base', description: '设施内种植区块类型', sortOrder: 24, status: 'active' },
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
  // ============================================
  // V1.0方案新增分类
  // ============================================
  { id: 'DC030', code: 'inbound_type', name: '入库类型', module: 'crop', description: '入库类型分类', sortOrder: 30, status: 'active' },
  { id: 'DC031', code: 'target_inventory', name: '目标库存', module: 'crop', description: '目标库存分类', sortOrder: 31, status: 'active' },
  { id: 'DC032', code: 'is_supplementary', name: '是否补录', module: 'crop', description: '是否补录选项', sortOrder: 32, status: 'active' },
  { id: 'DC033', code: 'supplier_is_internal', name: '来源类型', module: 'crop', description: '供应商来源类型', sortOrder: 33, status: 'active' },
  { id: 'DC034', code: 'unit', name: '单位', module: 'crop', description: '计量单位', sortOrder: 34, status: 'active' },
  { id: 'DC035', code: 'yes_no', name: '是否', module: 'common', description: '通用是否选项', sortOrder: 35, status: 'active' },
  { id: 'DC036', code: 'harvest_type', name: '采收类型', module: 'crop', description: '采收类型分类', sortOrder: 36, status: 'active' },
  { id: 'DC037', code: 'stock_form', name: '库存形态', module: 'crop', description: '库存物品形态', sortOrder: 37, status: 'active' },
  { id: 'DC038', code: 'production_plan_type', name: '生产计划类型', module: 'crop', description: '生产计划类型分类', sortOrder: 38, status: 'active' },
  { id: 'DC039', code: 'calculate_mode', name: '育苗计算模式', module: 'crop', description: '育苗计算模式', sortOrder: 39, status: 'active' },
  { id: 'DC040', code: 'batch_status', name: '生产计划状态', module: 'crop', description: '生产计划状态', sortOrder: 40, status: 'active' },
  { id: 'DC041', code: 'planting_mode', name: '种植模式', module: 'crop', description: '种植模式分类', sortOrder: 41, status: 'active' },
  { id: 'DC042', code: 'responsible_person', name: '负责人', module: 'crop', description: '负责人列表', sortOrder: 42, status: 'active' },
  { id: 'DC043', code: 'seedling_site', name: '育苗场地', module: 'crop', description: '育苗场地分类', sortOrder: 43, status: 'active' },
  { id: 'DC044', code: 'planting_source_type', name: '种植来源类型', module: 'crop', description: '种植来源类型', sortOrder: 44, status: 'active' },
  { id: 'DC045', code: 'quality_level', name: '品质评定', module: 'crop', description: '品质等级评定', sortOrder: 45, status: 'active' },
  { id: 'DC046', code: 'warehouse', name: '仓库', module: 'warehouse', description: '仓库分类', sortOrder: 46, status: 'active' },
  { id: 'DC047', code: 'harvest_greenhouse', name: '采收区域', module: 'crop', description: '采收区域分类', sortOrder: 47, status: 'active' },
  { id: 'DC048', code: 'source_type', name: '种源类型', module: 'crop', description: '种源类型(繁殖方式)', sortOrder: 48, status: 'active' },
  { id: 'DC049', code: 'feedback_personnel', name: '反馈人员', module: 'inspection', description: '巡查记录反馈人员列表（金庸武侠人物）', sortOrder: 49, status: 'active' },
  { id: 'DC050', code: 'farm_activity_type', name: '农事任务类型', module: 'production', description: '农事任务类型分类（灌溉/施肥/病虫害防治/采收/除草/修剪/巡田/播种/整地/定植/育苗/中耕培土/覆膜/搭架引蔓/整枝打杈/授粉/疏花疏果/清园/土壤改良/测产验收）', sortOrder: 50, status: 'active' },
  { id: 'DC051', code: 'indicator_category', name: '指标类别', module: 'production', description: '生产管理指标类别（生产/资源/质量/成本/效率/效益/服务/设备/安全）', sortOrder: 51, status: 'active' },
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
  { id: 'GT01', categoryCode: 'greenhouse_type', dictCode: 'glass', dictLabel: '玻璃温室', dictValue: 'glass', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'GT02', categoryCode: 'greenhouse_type', dictCode: 'solar', dictLabel: '日光温室', dictValue: 'solar', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'GT03', categoryCode: 'greenhouse_type', dictCode: 'plastic', dictLabel: '塑料大棚', dictValue: 'plastic', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'GT04', categoryCode: 'greenhouse_type', dictCode: 'open', dictLabel: '露天种植区', dictValue: 'open', color: 'gray', sortOrder: 4, isDefault: 0, status: 'active' },
  // 设施类型扩展（V1.0 基地空间架构 — 新增5项）
  { id: 'GT05', categoryCode: 'greenhouse_type', dictCode: 'film_greenhouse', dictLabel: '联动薄膜温室', dictValue: 'film_greenhouse', color: 'teal', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'GT06', categoryCode: 'greenhouse_type', dictCode: 'solar_tunnel', dictLabel: '日光拱棚', dictValue: 'solar_tunnel', color: 'orange', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'GT07', categoryCode: 'greenhouse_type', dictCode: 'tissue_culture', dictLabel: '组培室', dictValue: 'tissue_culture', color: 'purple', sortOrder: 7, isDefault: 0, status: 'active' },
  { id: 'GT08', categoryCode: 'greenhouse_type', dictCode: 'breeding_greenhouse', dictLabel: '育种温室', dictValue: 'breeding_greenhouse', color: 'pink', sortOrder: 8, isDefault: 0, status: 'active' },
  { id: 'GT09', categoryCode: 'greenhouse_type', dictCode: 'nursery_greenhouse', dictLabel: '驯化育苗温室', dictValue: 'nursery_greenhouse', color: 'cyan', sortOrder: 9, isDefault: 0, status: 'active' },
  { id: 'GT10', categoryCode: 'greenhouse_type', dictCode: 'other_facility', dictLabel: '其他设施', dictValue: 'other_facility', color: 'slate', sortOrder: 10, isDefault: 0, status: 'active' },
  // 温室状态
  { id: 'D040', categoryCode: 'greenhouse_status', dictCode: 'using', dictLabel: '使用中', dictValue: 'using', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D041', categoryCode: 'greenhouse_status', dictCode: 'maintenance', dictLabel: '维护中', dictValue: 'maintenance', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D042', categoryCode: 'greenhouse_status', dictCode: 'idle', dictLabel: '空闲', dictValue: 'idle', color: 'gray', sortOrder: 3, isDefault: 0, status: 'active' },
  // 种植季状态（基地空间架构 V1.0 新增）
  { id: 'PS01', categoryCode: 'planting_season_status', dictCode: 'planting', dictLabel: '种植中', dictValue: 'planting', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PS02', categoryCode: 'planting_season_status', dictCode: 'harvested', dictLabel: '已收获', dictValue: 'harvested', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PS03', categoryCode: 'planting_season_status', dictCode: 'fallow', dictLabel: '休耕', dictValue: 'fallow', color: 'gray', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PS04', categoryCode: 'planting_season_status', dictCode: 'preparing', dictLabel: '翻耕准备中', dictValue: 'preparing', color: 'orange', sortOrder: 4, isDefault: 0, status: 'active' },
  // 区块类型（基地空间架构 V1.0 新增）
  { id: 'BT01', categoryCode: 'block_type', dictCode: 'planting', dictLabel: '种植区', dictValue: 'planting', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'BT02', categoryCode: 'block_type', dictCode: 'nursery', dictLabel: '育苗区', dictValue: 'nursery', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'BT03', categoryCode: 'block_type', dictCode: 'experiment', dictLabel: '试验区', dictValue: 'experiment', color: 'purple', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'BT04', categoryCode: 'block_type', dictCode: 'storage', dictLabel: '仓储区', dictValue: 'storage', color: 'yellow', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'BT05', categoryCode: 'block_type', dictCode: 'passage', dictLabel: '通道区', dictValue: 'passage', color: 'gray', sortOrder: 5, isDefault: 0, status: 'active' },
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
  // 种植模式 - 已整合到下方PM001-PM005
  // 育苗方式
  { id: 'D090', categoryCode: 'seedling_type', dictCode: 'plug', dictLabel: '穴盘育苗', dictValue: 'plug', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D091', categoryCode: 'seedling_type', dictCode: 'direct', dictLabel: '直播育苗', dictValue: 'direct', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D092', categoryCode: 'seedling_type', dictCode: 'grafting', dictLabel: '嫁接育苗', dictValue: 'grafting', color: 'purple', sortOrder: 3, isDefault: 0, status: 'active' },
  // 采收状态 - V3.0扩展至8项
  { id: 'D100', categoryCode: 'harvest_status', dictCode: 'pending', dictLabel: '待采收', dictValue: 'pending', color: 'orange', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D101', categoryCode: 'harvest_status', dictCode: 'in_progress', dictLabel: '采收中', dictValue: 'in_progress', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D102', categoryCode: 'harvest_status', dictCode: 'harvested', dictLabel: '已采收', dictValue: 'harvested', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D103', categoryCode: 'harvest_status', dictCode: 'graded', dictLabel: '已分级', dictValue: 'graded', color: 'blue', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'D104', categoryCode: 'harvest_status', dictCode: 'packaged', dictLabel: '已包装', dictValue: 'packaged', color: 'purple', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'D105', categoryCode: 'harvest_status', dictCode: 'in_storage', dictLabel: '已入库', dictValue: 'in_storage', color: 'cyan', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'D106', categoryCode: 'harvest_status', dictCode: 'shipped', dictLabel: '已发货', dictValue: 'shipped', color: 'brown', sortOrder: 7, isDefault: 0, status: 'active' },
  { id: 'D107', categoryCode: 'harvest_status', dictCode: 'cancelled', dictLabel: '已取消', dictValue: 'cancelled', color: 'gray', sortOrder: 8, isDefault: 0, status: 'active' },
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
  // 来源途径 - V3.0扩展至12项（含历史数据）
  // 注意：ID已修正为避免与material_cost_type/greenhouse_type的ID冲突
  { id: 'SO01', categoryCode: 'source_origin', dictCode: 'self_produced', dictLabel: '自产自繁', dictValue: 'self_produced', color: 'green', sortOrder: 0, isDefault: 0, status: 'active' },
  { id: 'SO02', categoryCode: 'source_origin', dictCode: 'commissioned', dictLabel: '委托培育', dictValue: 'commissioned', color: 'purple', sortOrder: 0, isDefault: 0, status: 'active' },
  { id: 'SO03', categoryCode: 'source_origin', dictCode: 'gift', dictLabel: '政府/机构赠送', dictValue: 'gift', color: 'orange', sortOrder: 0, isDefault: 0, status: 'active' },
  { id: 'SO04', categoryCode: 'source_origin', dictCode: 'internal_seed', dictLabel: '内部种源', dictValue: 'internal_seed', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'SO05', categoryCode: 'source_origin', dictCode: 'external_purchase', dictLabel: '外部采购', dictValue: 'external_purchase', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'SO06', categoryCode: 'source_origin', dictCode: 'tissue_culture', dictLabel: '组培苗', dictValue: 'tissue_culture', color: 'purple', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'SO07', categoryCode: 'source_origin', dictCode: 'grafting', dictLabel: '嫁接苗', dictValue: 'grafting', color: 'orange', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'SO08', categoryCode: 'source_origin', dictCode: 'seedling_split', dictLabel: '分株繁殖', dictValue: 'seedling_split', color: 'yellow', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'SO09', categoryCode: 'source_origin', dictCode: 'cutting', dictLabel: '扦插繁殖', dictValue: 'cutting', color: 'cyan', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'SO10', categoryCode: 'source_origin', dictCode: 'direct_seedling', dictLabel: '直播育苗', dictValue: 'direct_seedling', color: 'lime', sortOrder: 7, isDefault: 0, status: 'active' },
  { id: 'SO11', categoryCode: 'source_origin', dictCode: 'direct_planting', dictLabel: '直接定植', dictValue: 'direct_planting', color: 'teal', sortOrder: 8, isDefault: 0, status: 'active' },
  { id: 'SO12', categoryCode: 'source_origin', dictCode: 'external_harvest', dictLabel: '外部采收', dictValue: 'external_harvest', color: 'pink', sortOrder: 9, isDefault: 0, status: 'active' },
  // ============================================
  // 作物管理字典项（V5.0方案补充）
  // ============================================
  // 入库类型
  { id: 'IT001', categoryCode: 'inbound_type', dictCode: 'seed_source', dictLabel: '种源入库', dictValue: 'seed_source', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'IT002', categoryCode: 'inbound_type', dictCode: 'seedling', dictLabel: '种苗入库', dictValue: 'seedling', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'IT003', categoryCode: 'inbound_type', dictCode: 'planting_harvest', dictLabel: '种植采收', dictValue: 'planting_harvest', color: 'orange', sortOrder: 3, isDefault: 0, status: 'active' },
  // 目标库存
  { id: 'TI001', categoryCode: 'target_inventory', dictCode: 'seed', dictLabel: '种子库存', dictValue: 'seed', color: 'yellow', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'TI002', categoryCode: 'target_inventory', dictCode: 'seedling', dictLabel: '种苗库存', dictValue: 'seedling', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'TI003', categoryCode: 'target_inventory', dictCode: 'product', dictLabel: '成品库存', dictValue: 'product', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  // 是否补录
  { id: 'IS001', categoryCode: 'is_supplementary', dictCode: 'yes', dictLabel: '是', dictValue: 'yes', color: 'orange', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'IS002', categoryCode: 'is_supplementary', dictCode: 'no', dictLabel: '否', dictValue: 'no', color: 'gray', sortOrder: 2, isDefault: 0, status: 'active' },
  // 来源类型（供应商是否内部）
  { id: 'SI001', categoryCode: 'supplier_is_internal', dictCode: 'internal', dictLabel: '内部自产', dictValue: 'internal', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'SI002', categoryCode: 'supplier_is_internal', dictCode: 'external', dictLabel: '外部采购', dictValue: 'external', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  // 单位
  { id: 'UT001', categoryCode: 'unit', dictCode: '袋', dictLabel: '袋', dictValue: '袋', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'UT002', categoryCode: 'unit', dictCode: '株', dictLabel: '株', dictValue: '株', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'UT003', categoryCode: 'unit', dictCode: '粒', dictLabel: '粒', dictValue: '粒', color: 'yellow', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'UT004', categoryCode: 'unit', dictCode: '千克', dictLabel: '千克', dictValue: '千克', color: 'orange', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'UT005', categoryCode: 'unit', dictCode: '克', dictLabel: '克', dictValue: '克', color: 'purple', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'UT006', categoryCode: 'unit', dictCode: '吨', dictLabel: '吨', dictValue: '吨', color: 'orange', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'UT007', categoryCode: 'unit', dictCode: '亩', dictLabel: '亩', dictValue: '亩', color: 'green', sortOrder: 7, isDefault: 0, status: 'active' },
  // 通用是否
  { id: 'YN001', categoryCode: 'yes_no', dictCode: 'yes', dictLabel: '是', dictValue: 'yes', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'YN002', categoryCode: 'yes_no', dictCode: 'no', dictLabel: '否', dictValue: 'no', color: 'gray', sortOrder: 2, isDefault: 0, status: 'active' },
  // 采收类型
  { id: 'HT001', categoryCode: 'harvest_type', dictCode: 'seed', dictLabel: '种子采收', dictValue: 'seed', color: 'yellow', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'HT002', categoryCode: 'harvest_type', dictCode: 'seedling', dictLabel: '种苗采收', dictValue: 'seedling', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'HT003', categoryCode: 'harvest_type', dictCode: 'product', dictLabel: '成品采收', dictValue: 'product', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  // ============================================
  // V1.0方案补充的字典项
  // ============================================
  // 库存形态
  { id: 'SF001', categoryCode: 'stock_form', dictCode: 'seed', dictLabel: '种子/种源', dictValue: 'seed', color: 'yellow', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'SF002', categoryCode: 'stock_form', dictCode: 'seedling', dictLabel: '种苗', dictValue: 'seedling', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'SF003', categoryCode: 'stock_form', dictCode: 'product', dictLabel: '成品', dictValue: 'product', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'SF004', categoryCode: 'stock_form', dictCode: 'seed_breeding', dictLabel: '育种材料', dictValue: 'seed_breeding', color: 'orange', sortOrder: 4, isDefault: 0, status: 'active' },
  // 生产计划类型
  { id: 'PP001', categoryCode: 'production_plan_type', dictCode: 'seed_breeding', dictLabel: '育种计划', dictValue: 'seed_breeding', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PP002', categoryCode: 'production_plan_type', dictCode: 'seedling_plan', dictLabel: '育苗计划', dictValue: 'seedling_plan', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PP003', categoryCode: 'production_plan_type', dictCode: 'planting_plan', dictLabel: '种植计划', dictValue: 'planting_plan', color: 'orange', sortOrder: 3, isDefault: 0, status: 'active' },
  // 育苗计算模式
  { id: 'CM001', categoryCode: 'calculate_mode', dictCode: 'single', dictLabel: '单批计算', dictValue: 'single', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'CM002', categoryCode: 'calculate_mode', dictCode: 'propagation', dictLabel: '扩繁计算', dictValue: 'propagation', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  // 生产计划状态
  { id: 'BS001', categoryCode: 'batch_status', dictCode: 'planning', dictLabel: '规划中', dictValue: 'planning', color: 'gray', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'BS002', categoryCode: 'batch_status', dictCode: 'in_progress', dictLabel: '执行中', dictValue: 'in_progress', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'BS003', categoryCode: 'batch_status', dictCode: 'completed', dictLabel: '已完成', dictValue: 'completed', color: 'green', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'BS004', categoryCode: 'batch_status', dictCode: 'cancelled', dictLabel: '已取消', dictValue: 'cancelled', color: 'red', sortOrder: 4, isDefault: 0, status: 'active' },
  // 种植模式 - 包含所有实际使用的种植模式
  { id: 'PM001', categoryCode: 'planting_mode', dictCode: 'direct_seeding', dictLabel: '直播', dictValue: '直播', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PM002', categoryCode: 'planting_mode', dictCode: 'transplanting', dictLabel: '移栽', dictValue: '移栽', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PM003', categoryCode: 'planting_mode', dictCode: 'grafting', dictLabel: '嫁接', dictValue: '嫁接', color: 'purple', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'PM004', categoryCode: 'planting_mode', dictCode: 'tissue_culture', dictLabel: '组培', dictValue: '组培', color: 'pink', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'PM005', categoryCode: 'planting_mode', dictCode: 'greenhouse', dictLabel: '温室种植', dictValue: '温室种植', color: 'cyan', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'PM006', categoryCode: 'planting_mode', dictCode: 'open_field', dictLabel: '露天种植', dictValue: '露天种植', color: 'lime', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'PM007', categoryCode: 'planting_mode', dictCode: 'hydroponic', dictLabel: '水培', dictValue: '水培', color: 'sky', sortOrder: 7, isDefault: 0, status: 'active' },
  { id: 'PM008', categoryCode: 'planting_mode', dictCode: 'substrate', dictLabel: '基质栽培', dictValue: '基质栽培', color: 'amber', sortOrder: 8, isDefault: 0, status: 'active' },
  { id: 'PM009', categoryCode: 'planting_mode', dictCode: 'greenhouse_planting', dictLabel: '大棚种植', dictValue: '大棚种植', color: 'teal', sortOrder: 9, isDefault: 0, status: 'active' },
  { id: 'PM010', categoryCode: 'planting_mode', dictCode: 'open_field_planting', dictLabel: '露地种植', dictValue: '露地种植', color: 'emerald', sortOrder: 10, isDefault: 0, status: 'active' },
  { id: 'PM011', categoryCode: 'planting_mode', dictCode: 'coconut_coir', dictLabel: '椰糠种植', dictValue: '椰糠种植', color: 'yellow', sortOrder: 11, isDefault: 0, status: 'active' },
  { id: 'PM012', categoryCode: 'planting_mode', dictCode: 'hydroponic_seedling', dictLabel: '水培育苗', dictValue: '水培育苗', color: 'indigo', sortOrder: 12, isDefault: 0, status: 'active' },
  { id: 'PM013', categoryCode: 'planting_mode', dictCode: 'soil_seedling', dictLabel: '土壤育苗', dictValue: '土壤育苗', color: 'brown', sortOrder: 13, isDefault: 0, status: 'active' },
  { id: 'PM014', categoryCode: 'planting_mode', dictCode: 'soil_planting', dictLabel: '土壤种植', dictValue: '土壤种植', color: 'orange', sortOrder: 14, isDefault: 0, status: 'active' },
  { id: 'PM015', categoryCode: 'planting_mode', dictCode: 'other', dictLabel: '其他', dictValue: '其他', color: 'gray', sortOrder: 15, isDefault: 0, status: 'active' },
  // 负责人
  { id: 'RP001', categoryCode: 'responsible_person', dictCode: 'lu_qichuang', dictLabel: '陆启闯', dictValue: '陆启闯', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'RP002', categoryCode: 'responsible_person', dictCode: 'wang_jianguo', dictLabel: '王建国', dictValue: '王建国', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'RP003', categoryCode: 'responsible_person', dictCode: 'li_minghui', dictLabel: '李明辉', dictValue: '李明辉', color: 'orange', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'RP004', categoryCode: 'responsible_person', dictCode: 'zhang_wei', dictLabel: '张伟', dictValue: '张伟', color: 'purple', sortOrder: 4, isDefault: 0, status: 'active' },
  // 育苗场地
  { id: 'SS001', categoryCode: 'seedling_site', dictCode: 'seedling_greenhouse_A', dictLabel: '育苗温室A区', dictValue: '育苗温室A区', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'SS002', categoryCode: 'seedling_site', dictCode: 'seedling_greenhouse_B', dictLabel: '育苗温室B区', dictValue: '育苗温室B区', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'SS003', categoryCode: 'seedling_site', dictCode: 'glass_greenhouse_A', dictLabel: '玻璃温室A区', dictValue: '玻璃温室A区', color: 'yellow', sortOrder: 3, isDefault: 0, status: 'active' },
  // 种植来源类型
  { id: 'PST001', categoryCode: 'planting_source_type', dictCode: 'seedling_planting', dictLabel: '种苗种植', dictValue: 'seedling_planting', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'PST002', categoryCode: 'planting_source_type', dictCode: 'seed_planting', dictLabel: '种子种植', dictValue: 'seed_planting', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'PST003', categoryCode: 'planting_source_type', dictCode: 'inventory_transfer', dictLabel: '库存调拨', dictValue: 'inventory_transfer', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  // 品质评定
  { id: 'QL001', categoryCode: 'quality_level', dictCode: 'special', dictLabel: '特优', dictValue: 'special', color: 'gold', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'QL002', categoryCode: 'quality_level', dictCode: 'excellent', dictLabel: '优', dictValue: 'excellent', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'QL003', categoryCode: 'quality_level', dictCode: 'good', dictLabel: '良', dictValue: 'good', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'QL004', categoryCode: 'quality_level', dictCode: 'qualified', dictLabel: '合格', dictValue: 'qualified', color: 'yellow', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'QL005', categoryCode: 'quality_level', dictCode: 'unqualified', dictLabel: '不合格', dictValue: 'unqualified', color: 'red', sortOrder: 5, isDefault: 0, status: 'active' },
  // 仓库
  { id: 'WH001', categoryCode: 'warehouse', dictCode: 'seed_warehouse', dictLabel: '种源库', dictValue: 'seed_warehouse', color: 'yellow', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'WH002', categoryCode: 'warehouse', dictCode: 'seedling_warehouse', dictLabel: '种苗库', dictValue: 'seedling_warehouse', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'WH003', categoryCode: 'warehouse', dictCode: 'product_warehouse', dictLabel: '成品库', dictValue: 'product_warehouse', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'WH004', categoryCode: 'warehouse', dictCode: 'postharvest_warehouse', dictLabel: '采后库', dictValue: 'postharvest_warehouse', color: 'orange', sortOrder: 4, isDefault: 0, status: 'active' },
  // 采收区域
  { id: 'HG001', categoryCode: 'harvest_greenhouse', dictCode: 'glass_greenhouse_A', dictLabel: '玻璃温室A区', dictValue: '玻璃温室A区', color: 'green', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'HG002', categoryCode: 'harvest_greenhouse', dictCode: 'glass_greenhouse_B', dictLabel: '玻璃温室B区', dictValue: '玻璃温室B区', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  // 种源类型（繁殖方式）
  { id: 'ST001', categoryCode: 'source_type', dictCode: 'seed', dictLabel: '种子', dictValue: 'seed', color: 'yellow', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'ST002', categoryCode: 'source_type', dictCode: 'seedling', dictLabel: '种苗/实生苗', dictValue: 'seedling', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'ST003', categoryCode: 'source_type', dictCode: 'cutting', dictLabel: '扦插苗', dictValue: 'cutting', color: 'cyan', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'ST004', categoryCode: 'source_type', dictCode: 'grafting', dictLabel: '嫁接苗', dictValue: 'grafting', color: 'purple', sortOrder: 4, isDefault: 0, status: 'active' },
  { id: 'ST005', categoryCode: 'source_type', dictCode: 'tissue_culture', dictLabel: '组培苗', dictValue: 'tissue_culture', color: 'pink', sortOrder: 5, isDefault: 0, status: 'active' },
  { id: 'ST006', categoryCode: 'source_type', dictCode: 'split', dictLabel: '分株苗', dictValue: 'split', color: 'orange', sortOrder: 6, isDefault: 0, status: 'active' },
  { id: 'ST007', categoryCode: 'source_type', dictCode: 'bulb', dictLabel: '种球/球根', dictValue: 'bulb', color: 'brown', sortOrder: 7, isDefault: 0, status: 'active' },
  { id: 'ST008', categoryCode: 'source_type', dictCode: 'other', dictLabel: '其他', dictValue: 'other', color: 'gray', sortOrder: 8, isDefault: 0, status: 'active' },
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
  // 公告分类
  { id: 'AN001', categoryCode: 'announcement_category', dictCode: 'admin_notice', dictLabel: '行政通知', dictValue: '行政通知', color: 'blue', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'AN002', categoryCode: 'announcement_category', dictCode: 'training_notice', dictLabel: '培训通知', dictValue: '培训通知', color: 'green', sortOrder: 2, isDefault: 1, status: 'active' },
  { id: 'AN003', categoryCode: 'announcement_category', dictCode: 'purchase_notice', dictLabel: '采购通知', dictValue: '采购通知', color: 'orange', sortOrder: 3, isDefault: 1, status: 'active' },
  { id: 'AN004', categoryCode: 'announcement_category', dictCode: 'activity_notice', dictLabel: '活动通知', dictValue: '活动通知', color: 'purple', sortOrder: 4, isDefault: 1, status: 'active' },
  { id: 'AN005', categoryCode: 'announcement_category', dictCode: 'policy_revision', dictLabel: '制度修订', dictValue: '制度修订', color: 'red', sortOrder: 5, isDefault: 1, status: 'active' },
  { id: 'AN006', categoryCode: 'announcement_category', dictCode: 'production_notice', dictLabel: '生产公告', dictValue: '生产公告', color: 'cyan', sortOrder: 6, isDefault: 1, status: 'active' },
  // 公告类型
  { id: 'ANT001', categoryCode: 'announcement_type', dictCode: 'production_notice', dictLabel: '生产公告', dictValue: '生产公告', color: 'blue', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'ANT002', categoryCode: 'announcement_type', dictCode: 'admin_notice', dictLabel: '行政公告', dictValue: '行政公告', color: 'purple', sortOrder: 2, isDefault: 1, status: 'active' },
  // 农事任务类型 (20种) — dictCode使用中文名称
  { id: 'FAT001', categoryCode: 'farm_activity_type', dictCode: '巡田', dictLabel: '巡田', dictValue: '巡田', color: 'cyan', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'FAT002', categoryCode: 'farm_activity_type', dictCode: '灌溉', dictLabel: '灌溉', dictValue: '灌溉', color: 'blue', sortOrder: 2, isDefault: 1, status: 'active' },
  { id: 'FAT003', categoryCode: 'farm_activity_type', dictCode: '施肥', dictLabel: '施肥', dictValue: '施肥', color: 'amber', sortOrder: 3, isDefault: 1, status: 'active' },
  { id: 'FAT004', categoryCode: 'farm_activity_type', dictCode: '病虫害防治', dictLabel: '病虫害防治', dictValue: '病虫害防治', color: 'red', sortOrder: 4, isDefault: 1, status: 'active' },
  { id: 'FAT005', categoryCode: 'farm_activity_type', dictCode: '采收', dictLabel: '采收', dictValue: '采收', color: 'purple', sortOrder: 5, isDefault: 1, status: 'active' },
  { id: 'FAT006', categoryCode: 'farm_activity_type', dictCode: '除草', dictLabel: '除草', dictValue: '除草', color: 'green', sortOrder: 6, isDefault: 1, status: 'active' },
  { id: 'FAT007', categoryCode: 'farm_activity_type', dictCode: '修剪', dictLabel: '修剪', dictValue: '修剪', color: 'orange', sortOrder: 7, isDefault: 1, status: 'active' },
  { id: 'FAT008', categoryCode: 'farm_activity_type', dictCode: '播种', dictLabel: '播种', dictValue: '播种', color: 'emerald', sortOrder: 8, isDefault: 1, status: 'active' },
  { id: 'FAT009', categoryCode: 'farm_activity_type', dictCode: '整地/耕地', dictLabel: '整地/耕地', dictValue: '整地/耕地', color: 'brown', sortOrder: 9, isDefault: 1, status: 'active' },
  { id: 'FAT010', categoryCode: 'farm_activity_type', dictCode: '定植/移栽', dictLabel: '定植/移栽', dictValue: '定植/移栽', color: 'teal', sortOrder: 10, isDefault: 1, status: 'active' },
  { id: 'FAT011', categoryCode: 'farm_activity_type', dictCode: '育苗', dictLabel: '育苗', dictValue: '育苗', color: 'lime', sortOrder: 11, isDefault: 1, status: 'active' },
  { id: 'FAT012', categoryCode: 'farm_activity_type', dictCode: '中耕培土', dictLabel: '中耕培土', dictValue: '中耕培土', color: 'stone', sortOrder: 12, isDefault: 1, status: 'active' },
  { id: 'FAT013', categoryCode: 'farm_activity_type', dictCode: '覆膜', dictLabel: '覆膜', dictValue: '覆膜', color: 'zinc', sortOrder: 13, isDefault: 1, status: 'active' },
  { id: 'FAT014', categoryCode: 'farm_activity_type', dictCode: '搭架引蔓', dictLabel: '搭架引蔓', dictValue: '搭架引蔓', color: 'yellow', sortOrder: 14, isDefault: 1, status: 'active' },
  { id: 'FAT015', categoryCode: 'farm_activity_type', dictCode: '整枝打杈', dictLabel: '整枝打杈', dictValue: '整枝打杈', color: 'violet', sortOrder: 15, isDefault: 1, status: 'active' },
  { id: 'FAT016', categoryCode: 'farm_activity_type', dictCode: '授粉', dictLabel: '授粉', dictValue: '授粉', color: 'pink', sortOrder: 16, isDefault: 1, status: 'active' },
  { id: 'FAT017', categoryCode: 'farm_activity_type', dictCode: '疏花疏果', dictLabel: '疏花疏果', dictValue: '疏花疏果', color: 'rose', sortOrder: 17, isDefault: 1, status: 'active' },
  { id: 'FAT018', categoryCode: 'farm_activity_type', dictCode: '清园', dictLabel: '清园', dictValue: '清园', color: 'slate', sortOrder: 18, isDefault: 1, status: 'active' },
  { id: 'FAT019', categoryCode: 'farm_activity_type', dictCode: '土壤改良', dictLabel: '土壤改良', dictValue: '土壤改良', color: 'neutral', sortOrder: 19, isDefault: 1, status: 'active' },
  { id: 'FAT020', categoryCode: 'farm_activity_type', dictCode: '测产验收', dictLabel: '测产验收', dictValue: '测产验收', color: 'sky', sortOrder: 20, isDefault: 1, status: 'active' },
  // 指标类别（V2.1 指标模块字典化）
  { id: 'IC01', categoryCode: 'indicator_category', dictCode: '生产指标', dictLabel: '生产指标', dictValue: 'production', color: 'cyan', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'IC02', categoryCode: 'indicator_category', dictCode: '资源指标', dictLabel: '资源指标', dictValue: 'resource', color: 'blue', sortOrder: 2, isDefault: 1, status: 'active' },
  { id: 'IC03', categoryCode: 'indicator_category', dictCode: '质量指标', dictLabel: '质量指标', dictValue: 'quality', color: 'purple', sortOrder: 3, isDefault: 1, status: 'active' },
  { id: 'IC04', categoryCode: 'indicator_category', dictCode: '成本指标', dictLabel: '成本指标', dictValue: 'cost', color: 'green', sortOrder: 4, isDefault: 1, status: 'active' },
  { id: 'IC05', categoryCode: 'indicator_category', dictCode: '效率指标', dictLabel: '效率指标', dictValue: 'efficiency', color: 'amber', sortOrder: 5, isDefault: 1, status: 'active' },
  { id: 'IC06', categoryCode: 'indicator_category', dictCode: '效益指标', dictLabel: '效益指标', dictValue: 'benefit', color: 'emerald', sortOrder: 6, isDefault: 1, status: 'active' },
  { id: 'IC07', categoryCode: 'indicator_category', dictCode: '服务指标', dictLabel: '服务指标', dictValue: 'service', color: 'pink', sortOrder: 7, isDefault: 1, status: 'active' },
  { id: 'IC08', categoryCode: 'indicator_category', dictCode: '设备指标', dictLabel: '设备指标', dictValue: 'equipment', color: 'sky', sortOrder: 8, isDefault: 1, status: 'active' },
  { id: 'IC09', categoryCode: 'indicator_category', dictCode: '安全指标', dictLabel: '安全指标', dictValue: 'safety', color: 'red', sortOrder: 9, isDefault: 1, status: 'active' },
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
      (id, oid, code, name, manager_id, manager_name, parent_oid, sort_number, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dept.id,
      dept.oid,
      dept.code,
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
  let inserted = 0;
  let skipped = 0;

  for (const dict of defaultDictionaries) {
    // 检查 (category_code, dict_code) 是否已存在（不管状态），存在则跳过
    const checkStmt = db.prepare(
      'SELECT id FROM dictionaries WHERE category_code = ? AND dict_code = ?'
    );
    checkStmt.bind([dict.categoryCode, dict.dictCode]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      skipped++;
      continue;
    }

    // 插入新条目；若ID冲突（极罕见），自动生成唯一ID回退
    try {
      db.run(`
        INSERT INTO dictionaries
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
    } catch {
      // ID冲突回退：生成唯一ID
      const fallbackId = `${dict.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      db.run(`
        INSERT INTO dictionaries
        (id, category_code, dict_code, dict_label, dict_value, color, sort_order, is_default, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        fallbackId,
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
    inserted++;
  }

  console.log(`已处理 ${defaultDictionaries.length} 条字典项数据（新增 ${inserted}，跳过 ${skipped}）`);
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
/**
 * 编码规则分类种子数据（物料 + 供应商）
 * 数据源：src/data/codeRuleData.ts（物料） + src/stores/useSupplierCodeRuleStore.ts（供应商）
 * 平铺存储到 material_code_categories 表，通过 rule_type 区分
 */
export function seedCodeRuleCategories() {
  const db = getDatabase();
  const now = new Date().toISOString();
  let added = 0;

  const insertCategory = (code: string, name: string, nameEn: string, parentCode: string, level: string, ruleType: string, sortOrder: number) => {
    // 按 code + parent_code + rule_type 去重（同一code可能出现在不同parent下，如多个大类下都有'01'中类）
    const existing = db.exec(
      `SELECT id FROM material_code_categories WHERE code = ? AND parent_code = ? AND rule_type = ? AND status = 'active'`,
      [code, parentCode, ruleType]
    );
    if (existing.length > 0 && existing[0].values.length > 0) return;

    const id = `${ruleType === 'supplier' ? 'SCC' : 'MCC'}${Date.now()}_${parentCode}_${code}`;
    db.run(
      `INSERT INTO material_code_categories (id, code, name, name_en, parent_code, level, rule_type, sort_order, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, code, name, nameEn, parentCode, level, ruleType, sortOrder, now, now]
    );
    added++;
  };

  // ========== 供应商编码规则（2级：big → mid）==========
  // 数据来源：useSupplierCodeRuleStore.ts initialCategories
  const supplierCategories = [
    {
      code: 'SP', name: '种子与种苗类', nameEn: 'Seed & Seedling',
      midCategories: [
        { code: '01', name: '粮食作物种子' }, { code: '02', name: '经济作物种子' }, { code: '03', name: '蔬菜种子/种苗' },
        { code: '04', name: '水果苗木' }, { code: '05', name: '花卉与观赏植物' }, { code: '06', name: '食用菌/药用菌菌种' }, { code: '99', name: '其他种质资源' },
      ]
    },
    {
      code: 'FE', name: '肥料与土壤改良类', nameEn: 'Fertilizer & Soil Amendment',
      midCategories: [
        { code: '01', name: '有机肥' }, { code: '02', name: '化学肥料' }, { code: '03', name: '微生物菌剂/生物刺激素' },
        { code: '04', name: '土壤调理剂' }, { code: '05', name: '育苗基质' }, { code: '99', name: '其他肥料类' },
      ]
    },
    {
      code: 'PP', name: '农药与植保产品类', nameEn: 'Pesticide & Plant Protection',
      midCategories: [
        { code: '01', name: '杀虫剂' }, { code: '02', name: '杀菌剂' }, { code: '03', name: '除草剂' },
        { code: '04', name: '植物生长调节剂' }, { code: '05', name: '绿色防控产品' }, { code: '06', name: '生物农药' }, { code: '99', name: '其他植保产品' },
      ]
    },
    {
      code: 'EQ', name: '农业机械与设备类', nameEn: 'Agricultural Machinery & Equipment',
      midCategories: [
        { code: '01', name: '耕作与动力机械' }, { code: '02', name: '播种/移栽设备' }, { code: '03', name: '植保机械' },
        { code: '04', name: '收获与采收机械' }, { code: '05', name: '初加工与分选设备' }, { code: '99', name: '其他农机设备' },
      ]
    },
    {
      code: 'FA', name: '设施农业资材类', nameEn: 'Facility Agriculture Materials',
      midCategories: [
        { code: '01', name: '温室/大棚骨架材料' }, { code: '02', name: '覆盖材料' }, { code: '03', name: '通风降温设备' },
        { code: '04', name: '加温设备' }, { code: '05', name: '补光系统' }, { code: '06', name: '智能环控系统' }, { code: '99', name: '其他设施农业资材' },
      ]
    },
    {
      code: 'IR', name: '灌溉与水肥一体化类', nameEn: 'Irrigation & Fertilization',
      midCategories: [
        { code: '01', name: '水泵与水源设备' }, { code: '02', name: '输水管网' }, { code: '03', name: '过滤系统' },
        { code: '04', name: '施肥装置' }, { code: '05', name: '灌溉终端' }, { code: '99', name: '其他灌溉设备' },
      ]
    },
    {
      code: 'OP', name: '日常劳保与劳动工具类', nameEn: 'Labor Protection & Tools',
      midCategories: [
        { code: '01', name: '劳动防护用品' }, { code: '02', name: '日常手动工具' }, { code: '03', name: '小型电动工具' },
        { code: '04', name: '清洁与卫生用品' }, { code: '99', name: '其他作业支持用品' },
      ]
    },
    {
      code: 'PH', name: '仓储与物流资材类', nameEn: 'Storage & Logistics Materials',
      midCategories: [
        { code: '01', name: '采收容器' }, { code: '02', name: '农产品包装材料' }, { code: '03', name: '冷链设备' },
        { code: '04', name: '装卸与仓储设备' }, { code: '99', name: '其他采后处理' },
      ]
    },
    {
      code: 'TS', name: '检测与技术服务类', nameEn: 'Testing & Technical Services',
      midCategories: [
        { code: '01', name: '土壤/水质检测服务' }, { code: '02', name: '农残快检设备与试剂' }, { code: '03', name: '农业物联网设备' },
        { code: '04', name: '数字农业软件服务' }, { code: '05', name: '农业技术咨询与培训' }, { code: '99', name: '其他技术服务' },
      ]
    },
    {
      code: 'UT', name: '能源与辅助耗材类', nameEn: 'Energy & Auxiliary Consumables',
      midCategories: [
        { code: '01', name: '燃油/润滑油' }, { code: '02', name: '电力与新能源' }, { code: '03', name: '通用工业耗材' }, { code: '99', name: '其他能源与耗材' },
      ]
    },
    {
      code: 'OT', name: '其他综合类', nameEn: 'Others',
      midCategories: [
        { code: '01', name: '其他未分类供应商' },
      ]
    },
  ];

  // 插入供应商分类
  let sortIdx = 0;
  for (const big of supplierCategories) {
    insertCategory(big.code, big.name, big.nameEn, '', 'big', 'supplier', sortIdx++);
    let midSortIdx = 0;
    for (const mid of big.midCategories) {
      insertCategory(mid.code, mid.name, '', big.code, 'mid', 'supplier', midSortIdx++);
    }
  }

  // ========== 物料编码规则（3级：big → mid → sub）==========
  // 数据来源：src/data/codeRuleData.ts initialCategories
  const materialCategories = [
    {
      code: 'SP', name: '生产投入类', nameEn: 'Production Inputs',
      midCategories: [
        {
          code: '01', name: '种质资源',
          subCategories: [
            { code: '01', name: '粮食作物种子' }, { code: '02', name: '经济作物种子' }, { code: '03', name: '蔬菜种子' },
            { code: '04', name: '蔬菜种苗' }, { code: '05', name: '水果苗木种苗' }, { code: '06', name: '水果苗木种子' },
            { code: '07', name: '花卉与观赏植物' }, { code: '08', name: '食用菌菌种' }, { code: '99', name: '其他种质资源' },
          ]
        },
        {
          code: '02', name: '肥料与土壤改良剂',
          subCategories: [
            { code: '01', name: '有机肥' }, { code: '02', name: '化学肥料' }, { code: '03', name: '水溶肥' },
            { code: '04', name: '叶面肥' }, { code: '05', name: '微生物菌剂' }, { code: '06', name: '土壤调理剂' },
            { code: '07', name: '育苗基质' }, { code: '99', name: '其他类型' },
          ]
        },
        {
          code: '03', name: '农药与植保产品',
          subCategories: [
            { code: '01', name: '杀虫剂' }, { code: '02', name: '杀菌剂' }, { code: '03', name: '杀螨剂' },
            { code: '04', name: '除草剂' }, { code: '05', name: '植物生长调节剂' }, { code: '06', name: '物理防控用品' },
            { code: '07', name: '生物农药' }, { code: '99', name: '其他类型' },
          ]
        },
      ]
    },
    {
      code: 'EQ', name: '设施与装备类', nameEn: 'Equipment & Facilities',
      midCategories: [
        {
          code: '01', name: '生产设施',
          subCategories: [
            { code: '01', name: '塑料薄膜' }, { code: '02', name: '灌溉设备' }, { code: '03', name: '通风设备' },
            { code: '04', name: '保温设备' }, { code: '05', name: '降温设备' }, { code: '06', name: '温室骨架' }, { code: '99', name: '其他设施' },
          ]
        },
        {
          code: '02', name: '农机具',
          subCategories: [
            { code: '01', name: '耕作机械' }, { code: '02', name: '播种机械' }, { code: '03', name: '施肥机械' },
            { code: '04', name: '采收机械' }, { code: '05', name: '搬运机械' }, { code: '99', name: '其他机械' },
          ]
        },
        {
          code: '03', name: '包装设备',
          subCategories: [
            { code: '01', name: '包装材料' }, { code: '02', name: '包装机械' }, { code: '03', name: '标签设备' }, { code: '99', name: '其他' },
          ]
        },
      ]
    },
    {
      code: 'OP', name: '作业支持类', nameEn: 'Operational Support',
      midCategories: [
        {
          code: '01', name: '劳保与防护用品',
          subCategories: [
            { code: '01', name: '手部防护' }, { code: '02', name: '足部防护' }, { code: '03', name: '身体防护' },
            { code: '04', name: '呼吸/眼部防护' }, { code: '05', name: '防晒防暑用品' }, { code: '99', name: '其他劳保防护类' },
          ]
        },
        {
          code: '02', name: '日常劳动工具',
          subCategories: [
            { code: '01', name: '手动农具' }, { code: '02', name: '修剪工具' }, { code: '03', name: '小型电动工具' },
            { code: '04', name: '清洁工具' }, { code: '05', name: '小型运输车' }, { code: '99', name: '其他劳动工具' },
          ]
        },
        {
          code: '03', name: '标识与记录用品',
          subCategories: [
            { code: '01', name: '田间标牌/标签' }, { code: '02', name: '记录本、记号笔' },
            { code: '03', name: '二维码/RFID标签' }, { code: '99', name: '其他标识记录用品' },
          ]
        },
      ]
    },
    {
      code: 'PH', name: '采后处理与流通类', nameEn: 'Post-harvest & Logistics',
      midCategories: [
        {
          code: '01', name: '采收容器',
          subCategories: [
            { code: '01', name: '塑料周转箱' }, { code: '02', name: '采摘篮/筐' }, { code: '03', name: '吨袋/编织袋' },
            { code: '04', name: '包装材料' }, { code: '05', name: '纸箱' }, { code: '06', name: '泡沫网套/隔板' },
            { code: '07', name: '胶带、封口耗材' }, { code: '08', name: '商品标签/追溯标签' }, { code: '99', name: '其他采收材料' },
          ]
        },
        {
          code: '02', name: '冷链与仓储设备',
          subCategories: [
            { code: '01', name: '预冷库/冷藏库' }, { code: '02', name: '冷藏运输设备' }, { code: '03', name: '保温箱、冰袋' }, { code: '99', name: '其他' },
          ]
        },
      ]
    },
    {
      code: 'IT', name: '数字化与管理类', nameEn: 'Digital & Management',
      midCategories: [
        {
          code: '01', name: '监测设备',
          subCategories: [
            { code: '01', name: '空气/土壤/光照等传感器' }, { code: '02', name: '手持检测类设备' }, { code: '03', name: '气象站' },
            { code: '04', name: '虫情测报灯' }, { code: '05', name: '视频监控设备' }, { code: '99', name: '其他检测相关设备' },
          ]
        },
        {
          code: '02', name: '控制设备',
          subCategories: [
            { code: '01', name: '环境参数感知设备' }, { code: '02', name: '执行控制设备' }, { code: '03', name: '人机交互与本地操作设备' },
            { code: '04', name: '通信与联网设备' }, { code: '05', name: '电源与辅助控制设备' }, { code: '99', name: '其他相关控制设备' },
          ]
        },
        {
          code: '03', name: '软件与服务',
          subCategories: [
            { code: '01', name: 'ERP模块许可' }, { code: '02', name: '温室大棚控制系统web' },
            { code: '03', name: '温室大棚控制系统小程序' }, { code: '04', name: '数据分析服务' },
            { code: '05', name: '产品检测服务' }, { code: '99', name: '其他软件与服务' },
          ]
        },
      ]
    },
    {
      code: 'EC', name: '能源与通用耗材', nameEn: 'Energy & Consumables',
      midCategories: [
        {
          code: '01', name: '能源类',
          subCategories: [
            { code: '01', name: '柴油/汽油' }, { code: '02', name: '电力' }, { code: '03', name: '太阳能板及配件' }, { code: '99', name: '其他能源类' },
          ]
        },
        {
          code: '02', name: '通用耗材',
          subCategories: [
            { code: '01', name: '电线、电缆' }, { code: '02', name: '扎带、螺丝、密封胶' },
            { code: '03', name: '电池' }, { code: '04', name: '润滑油、润滑脂' }, { code: '99', name: '其他耗材' },
          ]
        },
      ]
    },
    {
      code: 'OT', name: '其他类', nameEn: 'Others',
      midCategories: [
        {
          code: '01', name: '未分类资材',
          subCategories: [
            { code: '01', name: '其他未分类资材' },
          ]
        },
      ]
    },
  ];

  // 插入物料分类
  sortIdx = 0;
  for (const big of materialCategories) {
    insertCategory(big.code, big.name, big.nameEn, '', 'big', 'material', sortIdx++);
    let midSortIdx = 0;
    for (const mid of big.midCategories) {
      insertCategory(mid.code, mid.name, '', big.code, 'mid', 'material', midSortIdx++);
      let subSortIdx = 0;
      for (const sub of mid.subCategories) {
        const subParentCode = big.code + mid.code; // e.g., 'SP01'
        insertCategory(sub.code, sub.name, '', subParentCode, 'sub', 'material', subSortIdx++);
      }
    }
  }

  if (added > 0) {
    console.log(`✓ 种子数据：编码规则分类已添加 ${added} 条`);
  } else {
    console.log('• 编码规则分类：数据已存在，跳过');
  }
}

// ============================================
// 指标评估种子数据
// ============================================
const defaultIndicatorEvaluations = [
  { id: '1', name: '上海松江基地', productionScore: 92, qualityScore: 95, costScore: 88, efficiencyScore: 90, totalScore: 91.25, rank: 1 },
  { id: '2', name: '上海崇明基地', productionScore: 88, qualityScore: 92, costScore: 85, efficiencyScore: 87, totalScore: 88.0, rank: 2 },
  { id: '3', name: '上海嘉定基地', productionScore: 85, qualityScore: 90, costScore: 90, efficiencyScore: 85, totalScore: 87.5, rank: 3 },
  { id: '4', name: '上海奉贤基地', productionScore: 90, qualityScore: 88, costScore: 82, efficiencyScore: 88, totalScore: 87.0, rank: 4 },
  { id: '5', name: '西安雁塔基地', productionScore: 82, qualityScore: 85, costScore: 88, efficiencyScore: 86, totalScore: 85.25, rank: 5 },
  { id: '6', name: '西安高新基地', productionScore: 80, qualityScore: 88, costScore: 85, efficiencyScore: 84, totalScore: 84.25, rank: 6 },
  { id: '7', name: '宁波北仑基地', productionScore: 78, qualityScore: 82, costScore: 86, efficiencyScore: 82, totalScore: 82.0, rank: 7 },
  { id: '8', name: '宁波镇海基地', productionScore: 75, qualityScore: 80, costScore: 84, efficiencyScore: 80, totalScore: 79.75, rank: 8 },
];

export function seedIndicatorEvaluations() {
  const db = getDatabase();
  let inserted = 0;

  for (const item of defaultIndicatorEvaluations) {
    const checkStmt = db.prepare('SELECT id FROM indicator_evaluations WHERE id = ?');
    checkStmt.bind([item.id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) continue;

    const now = new Date().toISOString();
    db.run(`
      INSERT INTO indicator_evaluations
      (id, name, production_score, quality_score, cost_score, efficiency_score, total_score, rank, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.id, item.name, item.productionScore, item.qualityScore,
      item.costScore, item.efficiencyScore, item.totalScore, item.rank, now, now
    ]);
    inserted++;
  }

  if (inserted > 0) console.log(`已导入 ${inserted} 条指标评估数据`);
}

export function exportBasicData() {
  seedDepartments();
  seedWarehouses();
  seedGreenhouses();
  seedPositions();
  seedTeams();
  seedDictionaryCategories();
  seedDictionaries();
  seedIndicatorEvaluations();
  seedNotificationChannels();
  seedNotificationRules();
  seedApprovalWorkflows();
  seedCodeRuleCategories();
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
