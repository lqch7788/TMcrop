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
// 字典分类数据（V5.0新增）
// ============================================
const defaultDictionaryCategories: DictionaryCategorySeed[] = [
  { id: 'DC001', code: 'supplier_type', name: '供应商类型', module: 'supplier', description: '供应商类型分类', sortOrder: 1, status: 'active' },
  { id: 'DC002', code: 'supplier_status', name: '供应商状态', module: 'supplier', description: '供应商状态', sortOrder: 2, status: 'active' },
  { id: 'DC003', code: 'approval_status', name: '审批状态', module: 'approval', description: '审批流程状态', sortOrder: 3, status: 'active' },
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
];

// ============================================
// 字典项数据（V5.0新增）
// ============================================
const defaultDictionaries: DictionarySeed[] = [
  // 供应商类型
  { id: 'D001', categoryCode: 'supplier_type', dictCode: 'SP', dictLabel: '原材料供应', dictValue: 'SP', color: 'blue', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D002', categoryCode: 'supplier_type', dictCode: 'FE', dictLabel: '设施设备', dictValue: 'FE', color: 'blue', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D003', categoryCode: 'supplier_type', dictCode: 'PP', dictLabel: '包装材料', dictValue: 'PP', color: 'blue', sortOrder: 3, isDefault: 0, status: 'active' },
  { id: 'D004', categoryCode: 'supplier_type', dictCode: 'EQ', dictLabel: '设备配件', dictValue: 'EQ', color: 'blue', sortOrder: 4, isDefault: 0, status: 'active' },
  // 供应商状态
  { id: 'D010', categoryCode: 'supplier_status', dictCode: 'active', dictLabel: '合作中', dictValue: 'active', color: 'green', sortOrder: 1, isDefault: 1, status: 'active' },
  { id: 'D011', categoryCode: 'supplier_status', dictCode: 'paused', dictLabel: '暂停', dictValue: 'paused', color: 'yellow', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D012', categoryCode: 'supplier_status', dictCode: 'terminated', dictLabel: '终止', dictValue: 'terminated', color: 'red', sortOrder: 3, isDefault: 0, status: 'active' },
  // 审批状态
  { id: 'D020', categoryCode: 'approval_status', dictCode: 'pending', dictLabel: '待审批', dictValue: 'pending', color: 'orange', sortOrder: 1, isDefault: 0, status: 'active' },
  { id: 'D021', categoryCode: 'approval_status', dictCode: 'approved', dictLabel: '已通过', dictValue: 'approved', color: 'green', sortOrder: 2, isDefault: 0, status: 'active' },
  { id: 'D022', categoryCode: 'approval_status', dictCode: 'rejected', dictLabel: '已拒绝', dictValue: 'rejected', color: 'red', sortOrder: 3, isDefault: 0, status: 'active' },
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
 * 导出所有基础数据
 */
export function exportBasicData() {
  seedDepartments();
  seedWarehouses();
  seedGreenhouses();
  seedPositions();
  seedDictionaryCategories();
  seedDictionaries();
  seedNotificationChannels();
  seedNotificationRules();
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
