/**
 * 农事管理模块 - Mock数据
 * 包含四个核心模块的示例数据
 */

import { greenhouses, users, cropBatches } from './farm/farmData';
import { COMMON_STATUS, HARVEST_STATUS, INSPECTION_STATUS } from '../types/farm/common';

// ============================================
// 农事操作记录类型
// ============================================
export interface FarmOperationRecord {
  id: string;
  recordCode: string;
  operationType: string;
  operationTypeName: string;
  status: string;

  // 关联字段（数据闭环关键）
  relatedTaskId?: string;
  relatedTaskCode?: string;
  batchId?: string;
  batchCode?: string;

  // 地块与作物
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  variety?: string;

  // 执行信息
  operatorId: string;
  operatorName: string;
  operationDate: string;
  startTime?: string;
  endTime?: string;
  duration?: number;

  // 工作量
  workload: number;
  unit: string;

  // 材料使用
  materials?: string[];

  // 备注
  remarks?: string;

  // 时间戳
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 巡查记录类型
// ============================================
export interface FarmInspectionRecord {
  id: string;
  recordCode: string;

  // 执行信息
  inspectorId: string;
  inspectorName: string;

  // 地块与作物
  greenhouseId: string;
  greenhouseName: string;
  batchId?: string;
  batchCode?: string;
  cropName: string;

  // 巡田时间
  checkDate: string;
  checkTime?: string;

  // 环境参数
  weather?: string;
  temperature?: number;
  humidity?: number;

  // 作物状态
  cropStatus: string;
  plantHeight?: number;
  leafCount?: number;

  // 关联任务（数据闭环关键）
  relatedTaskId?: string;
  relatedTaskCode?: string;

  // 发现的问题
  issues: string[];

  // 状态
  status: string;

  // 附件
  images?: string[];
  remarks?: string;

  // 生长环境参数
  airTemperature?: number;
  airHumidity?: number;
  lightIntensity?: number;
  co2Concentration?: number;
  soilTemperature?: number;
  soilMoisture?: number;
  soilEc?: number;
  soilPh?: number;

  // 时间戳
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 采收记录类型
// ============================================
export interface FarmHarvestRecord {
  id: string;
  harvestCode: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  greenhouseId: string;
  greenhouseName: string;
  harvestDate: string;
  harvestArea: number;
  harvestQuantity: number;
  unit: string;
  quality: 'excellent' | 'good' | 'average' | 'poor';
  grade: 'A' | 'B' | 'C';
  harvesterIds: string[];
  harvesterNames: string[];
  warehouseId: string;
  warehouseName: string;
  status: string;

  // 关联任务（数据闭环关键）
  relatedTaskId?: string;
  relatedTaskCode?: string;

  // 备注
  remarks?: string;

  // 时间戳
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 农事任务类型
// ============================================
export interface FarmTask {
  id: string;
  taskCode: string;
  title: string;
  type: string;
  typeName: string;

  // 批次与温室
  batchId: string;
  batchCode: string;
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;

  // 优先级与状态
  priority: string;
  status: string;

  // 执行信息
  assigneeId: string;
  assigneeName: string;
  assignerId: string;
  assignerName: string;
  dueDate: string;
  startTime?: string;
  endTime?: string;
  workDuration?: number;

  // 来源关联
  sourceInspectionId?: string;
  sourceInspectionCode?: string;
  sourceProblemId?: string;

  // 描述
  description?: string;
  remarks?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ============================================
// Mock数据 - 农事操作记录
// ============================================
export const farmOperationRecords: FarmOperationRecord[] = [
  {
    id: 'OP001',
    recordCode: 'OP20260315-001',
    operationType: 'planting',
    operationTypeName: '定植',
    status: COMMON_STATUS.COMPLETED,
    relatedTaskId: 'TASK001',
    relatedTaskCode: 'NS20260315-001',
    batchId: 'BATCH001',
    batchCode: 'SC202603001',
    greenhouseId: 'GH001',
    greenhouseName: '玻璃温室A区',
    cropName: '番茄',
    variety: '红果',
    operatorId: 'U001',
    operatorName: '郭靖',
    operationDate: '2026-03-15',
    startTime: '09:00',
    endTime: '11:30',
    duration: 150,
    workload: 500,
    unit: '株',
    materials: ['番茄苗', '生根剂'],
    remarks: '定植完成，苗情良好，浇足定根水',
    createdAt: '2026-03-15 11:30:00',
  },
  {
    id: 'OP002',
    recordCode: 'OP20260315-002',
    operationType: 'irrigation',
    operationTypeName: '灌溉',
    status: COMMON_STATUS.COMPLETED,
    relatedTaskId: 'TASK002',
    relatedTaskCode: 'NS20260315-002',
    batchId: 'BATCH002',
    batchCode: 'SC202603002',
    greenhouseId: 'GH002',
    greenhouseName: '日光温室1号',
    cropName: '黄瓜',
    variety: '翠绿',
    operatorId: 'U002',
    operatorName: '黄蓉',
    operationDate: '2026-03-15',
    startTime: '07:00',
    endTime: '08:30',
    duration: 90,
    workload: 800,
    unit: '㎡',
    materials: ['水溶肥'],
    remarks: '灌溉正常，土壤湿度达标',
    createdAt: '2026-03-15 08:30:00',
  },
  {
    id: 'OP003',
    recordCode: 'OP20260314-003',
    operationType: 'fertilization',
    operationTypeName: '施肥',
    status: COMMON_STATUS.COMPLETED,
    batchId: 'BATCH003',
    batchCode: 'SC202603003',
    greenhouseId: 'GH003',
    greenhouseName: '日光温室2号',
    cropName: '草莓',
    variety: '红颜',
    operatorId: 'U003',
    operatorName: '杨康',
    operationDate: '2026-03-14',
    startTime: '14:00',
    endTime: '16:00',
    duration: 120,
    workload: 50,
    unit: '公斤',
    materials: ['有机肥', '复合肥'],
    remarks: '施肥完成，草莓进入膨果期，需要增加钾肥',
    createdAt: '2026-03-14 16:00:00',
  },
  {
    id: 'OP004',
    recordCode: 'OP20260314-004',
    operationType: 'pest_control',
    operationTypeName: '病虫害防治',
    status: COMMON_STATUS.COMPLETED,
    relatedTaskId: 'TASK003',
    relatedTaskCode: 'NS20260314-001',
    batchId: 'BATCH004',
    batchCode: 'SC202603004',
    greenhouseId: 'GH004',
    greenhouseName: '玻璃温室B区',
    cropName: '番茄',
    variety: '粉果',
    operatorId: 'U004',
    operatorName: '穆念慈',
    operationDate: '2026-03-14',
    startTime: '10:00',
    endTime: '12:00',
    duration: 120,
    workload: 400,
    unit: '㎡',
    materials: ['多菌灵', '吡虫啉'],
    remarks: '预防性喷药，发现少量白粉虱，已打药',
    createdAt: '2026-03-14 12:00:00',
  },
  {
    id: 'OP005',
    recordCode: 'OP20260313-005',
    operationType: 'pruning',
    operationTypeName: '修剪',
    status: COMMON_STATUS.COMPLETED,
    batchId: 'BATCH002',
    batchCode: 'SC202603002',
    greenhouseId: 'GH002',
    greenhouseName: '日光温室1号',
    cropName: '黄瓜',
    variety: '翠绿',
    operatorId: 'U005',
    operatorName: '张无忌',
    operationDate: '2026-03-13',
    startTime: '08:00',
    endTime: '10:00',
    duration: 120,
    workload: 600,
    unit: '㎡',
    materials: [],
    remarks: '侧枝修剪完成，植株通风良好',
    createdAt: '2026-03-13 10:00:00',
  },
  {
    id: 'OP006',
    recordCode: 'OP20260313-006',
    operationType: 'harvest',
    operationTypeName: '采收',
    status: COMMON_STATUS.COMPLETED,
    batchId: 'BATCH005',
    batchCode: 'SC202603005',
    greenhouseId: 'GH005',
    greenhouseName: '日光温室3号',
    cropName: '生菜',
    variety: '奶油生菜',
    operatorId: 'U006',
    operatorName: '赵敏',
    operationDate: '2026-03-13',
    startTime: '06:00',
    endTime: '09:00',
    duration: 180,
    workload: 200,
    unit: '公斤',
    materials: ['周转箱'],
    remarks: '生菜采收完成，品质良好，A级果占80%',
    createdAt: '2026-03-13 09:00:00',
  },
  {
    id: 'OP007',
    recordCode: 'OP20260312-007',
    operationType: 'weeding',
    operationTypeName: '中耕除草',
    status: COMMON_STATUS.COMPLETED,
    batchId: 'BATCH006',
    batchCode: 'SC202603006',
    greenhouseId: 'GH006',
    greenhouseName: '塑料大棚1号',
    cropName: '菠菜',
    variety: '大叶菠菜',
    operatorId: 'U007',
    operatorName: '令狐冲',
    operationDate: '2026-03-12',
    startTime: '07:30',
    endTime: '10:30',
    duration: 180,
    workload: 500,
    unit: '㎡',
    materials: [],
    remarks: '除草完成，土壤松土有利于根系生长',
    createdAt: '2026-03-12 10:30:00',
  },
  {
    id: 'OP008',
    recordCode: 'OP20260312-008',
    operationType: 'irrigation',
    operationTypeName: '灌溉',
    status: COMMON_STATUS.COMPLETED,
    batchId: 'BATCH007',
    batchCode: 'SC202603007',
    greenhouseId: 'GH007',
    greenhouseName: '玻璃温室C区',
    cropName: '辣椒',
    variety: '线椒',
    operatorId: 'U008',
    operatorName: '任盈盈',
    operationDate: '2026-03-12',
    startTime: '15:00',
    endTime: '16:30',
    duration: 90,
    workload: 350,
    unit: '㎡',
    materials: [],
    remarks: '滴灌浇水，辣椒正处于花果期',
    createdAt: '2026-03-12 16:30:00',
  },
];

// ============================================
// Mock数据 - 巡查记录
// ============================================
const tomatoImages = ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='];

export const farmInspectionRecords: FarmInspectionRecord[] = [
  {
    id: 'INS001',
    recordCode: 'INS20260315-001',
    inspectorId: 'U004',
    inspectorName: '穆念慈',
    greenhouseId: 'GH001',
    greenhouseName: '玻璃温室A区',
    batchId: 'BATCH001',
    batchCode: 'SC202603001',
    cropName: '番茄',
    checkDate: '2026-03-15',
    checkTime: '09:00',
    weather: '晴',
    temperature: 24,
    humidity: 65,
    cropStatus: '良好',
    plantHeight: 145,
    leafCount: 12,
    relatedTaskId: 'TASK001',
    relatedTaskCode: 'NS20260315-001',
    issues: [],
    status: INSPECTION_STATUS.NORMAL,
    images: tomatoImages,
    remarks: '番茄植株长势良好，叶片翠绿，无病虫害迹象。',
    airTemperature: 24.5,
    airHumidity: 65,
    lightIntensity: 35000,
    co2Concentration: 450,
    soilTemperature: 22.3,
    soilMoisture: 55,
    soilEc: 1.2,
    soilPh: 6.5,
    createdAt: '2026-03-15 09:30:00',
  },
  {
    id: 'INS002',
    recordCode: 'INS20260314-001',
    inspectorId: 'U004',
    inspectorName: '穆念慈',
    greenhouseId: 'GH002',
    greenhouseName: '日光温室1号',
    batchId: 'BATCH002',
    batchCode: 'SC202603002',
    cropName: '黄瓜',
    checkDate: '2026-03-14',
    checkTime: '10:30',
    weather: '多云',
    temperature: 22,
    humidity: 70,
    cropStatus: '一般',
    plantHeight: 120,
    leafCount: 8,
    issues: ['叶片边缘发黄', '少量蚜虫'],
    status: INSPECTION_STATUS.ATTENTION,
    images: tomatoImages,
    remarks: '黄瓜叶片出现边缘发黄，疑似缺镁。发现少量蚜虫，已记录。',
    airTemperature: 22.5,
    airHumidity: 70,
    lightIntensity: 28000,
    co2Concentration: 420,
    soilTemperature: 21.0,
    soilMoisture: 60,
    soilEc: 1.0,
    soilPh: 6.2,
    createdAt: '2026-03-14 11:00:00',
  },
  {
    id: 'INS003',
    recordCode: 'INS20260313-001',
    inspectorId: 'U002',
    inspectorName: '黄蓉',
    greenhouseId: 'GH003',
    greenhouseName: '日光温室2号',
    batchId: 'BATCH003',
    batchCode: 'SC202603003',
    cropName: '草莓',
    checkDate: '2026-03-13',
    checkTime: '14:00',
    weather: '晴',
    temperature: 26,
    humidity: 60,
    cropStatus: '良好',
    plantHeight: 25,
    leafCount: 5,
    issues: [],
    status: INSPECTION_STATUS.NORMAL,
    images: tomatoImages,
    remarks: '草莓长势良好，果实饱满，即将进入采收期。',
    airTemperature: 26.2,
    airHumidity: 60,
    lightIntensity: 42000,
    co2Concentration: 440,
    soilTemperature: 24.0,
    soilMoisture: 50,
    soilEc: 1.4,
    soilPh: 6.8,
    createdAt: '2026-03-13 14:30:00',
  },
  {
    id: 'INS004',
    recordCode: 'INS20260312-001',
    inspectorId: 'U004',
    inspectorName: '穆念慈',
    greenhouseId: 'GH004',
    greenhouseName: '玻璃温室B区',
    batchId: 'BATCH004',
    batchCode: 'SC202603004',
    cropName: '番茄',
    checkDate: '2026-03-12',
    checkTime: '09:00',
    weather: '阴',
    temperature: 20,
    humidity: 75,
    cropStatus: '有病虫害',
    plantHeight: 130,
    leafCount: 10,
    issues: ['灰霉病初期症状', '叶片有病斑'],
    status: INSPECTION_STATUS.CRITICAL,
    images: tomatoImages,
    remarks: '发现灰霉病初期症状，叶片有病斑。需要紧急处理。',
    airTemperature: 20.5,
    airHumidity: 75,
    lightIntensity: 15000,
    co2Concentration: 400,
    soilTemperature: 19.5,
    soilMoisture: 65,
    soilEc: 1.1,
    soilPh: 6.3,
    createdAt: '2026-03-12 09:30:00',
  },
];

// ============================================
// Mock数据 - 采收记录
// ============================================
export const farmHarvestRecords: FarmHarvestRecord[] = [
  {
    id: 'H001',
    harvestCode: 'HS20260314-001',
    batchId: 'BATCH003',
    batchCode: 'SC202603003',
    cropName: '草莓',
    greenhouseId: 'GH003',
    greenhouseName: '日光温室2号',
    harvestDate: '2026-03-14',
    harvestArea: 600,
    harvestQuantity: 120,
    unit: '公斤',
    quality: 'good',
    grade: 'A',
    harvesterIds: ['U008'],
    harvesterNames: ['任盈盈'],
    warehouseId: 'W001',
    warehouseName: '冷库A区',
    status: HARVEST_STATUS.STORED,
    relatedTaskId: 'TASK010',
    relatedTaskCode: 'NS20260310-001',
    remarks: '草莓采收完成，品质良好',
    createdAt: '2026-03-14 18:00:00',
  },
  {
    id: 'H002',
    harvestCode: 'HS20260313-001',
    batchId: 'BATCH005',
    batchCode: 'SC202603005',
    cropName: '生菜',
    greenhouseId: 'GH005',
    greenhouseName: '日光温室3号',
    harvestDate: '2026-03-13',
    harvestArea: 300,
    harvestQuantity: 200,
    unit: '公斤',
    quality: 'excellent',
    grade: 'A',
    harvesterIds: ['U006', 'U007'],
    harvesterNames: ['赵敏', '令狐冲'],
    warehouseId: 'W002',
    warehouseName: '冷库B区',
    status: HARVEST_STATUS.STORED,
    remarks: '生菜采收完成，品质优秀，A级果占85%',
    createdAt: '2026-03-13 12:00:00',
  },
];

// ============================================
// Mock数据 - 农事任务
// ============================================
export const farmTasks: FarmTask[] = [
  {
    id: 'TASK001',
    taskCode: 'NS20260315-001',
    title: '番茄定植',
    type: 'planting',
    typeName: '定植',
    batchId: 'BATCH001',
    batchCode: 'SC202603001',
    greenhouseId: 'GH001',
    greenhouseName: '玻璃温室A区',
    cropName: '番茄',
    priority: 'high',
    status: COMMON_STATUS.COMPLETED,
    assigneeId: 'U001',
    assigneeName: '郭靖',
    assignerId: 'U002',
    assignerName: '黄蓉',
    dueDate: '2026-03-15',
    startTime: '09:00',
    endTime: '11:30',
    workDuration: 150,
    description: '对玻璃温室A区进行番茄定植，共500株',
    remarks: '已完成定植，苗情良好',
    createdAt: '2026-03-15 08:00:00',
    completedAt: '2026-03-15 11:30:00',
  },
  {
    id: 'TASK002',
    taskCode: 'NS20260315-002',
    title: '黄瓜灌溉',
    type: 'irrigation',
    typeName: '灌溉',
    batchId: 'BATCH002',
    batchCode: 'SC202603002',
    greenhouseId: 'GH002',
    greenhouseName: '日光温室1号',
    cropName: '黄瓜',
    priority: 'medium',
    status: COMMON_STATUS.COMPLETED,
    assigneeId: 'U002',
    assigneeName: '黄蓉',
    assignerId: 'U002',
    assignerName: '黄蓉',
    dueDate: '2026-03-15',
    startTime: '07:00',
    endTime: '08:30',
    workDuration: 90,
    description: '日光温室1号灌溉，添加水溶肥',
    createdAt: '2026-03-15 06:00:00',
    completedAt: '2026-03-15 08:30:00',
  },
  {
    id: 'TASK003',
    taskCode: 'NS20260314-001',
    title: '番茄病虫害防治',
    type: 'pest_control',
    typeName: '病虫害防治',
    batchId: 'BATCH004',
    batchCode: 'SC202603004',
    greenhouseId: 'GH004',
    greenhouseName: '玻璃温室B区',
    cropName: '番茄',
    priority: 'high',
    status: COMMON_STATUS.COMPLETED,
    assigneeId: 'U004',
    assigneeName: '穆念慈',
    assignerId: 'U002',
    assignerName: '黄蓉',
    dueDate: '2026-03-14',
    startTime: '10:00',
    endTime: '12:00',
    workDuration: 120,
    sourceProblemId: 'PROB001',
    description: '玻璃温室B区番茄发现灰霉病，需要紧急喷药处理',
    createdAt: '2026-03-14 09:00:00',
    completedAt: '2026-03-14 12:00:00',
  },
];

// ============================================
// 选项配置 - 温室
// ============================================
export const greenhouseOptions = greenhouses.map(gh => ({
  value: gh.id,
  label: gh.name,
  type: gh.type,
  area: gh.area,
}));

// ============================================
// 选项配置 - 操作人员
// ============================================
export const operatorOptions = users
  .filter(u => u.role === 'technician' || u.role === 'worker' || u.role === 'supervisor' || u.role === 'manager')
  .map(u => ({
    value: u.id,
    label: u.name,
    role: u.role,
    roleName: u.roleName,
  }));

// ============================================
// 选项配置 - 物料
// ============================================
export const materialOptions = [
  '番茄苗', '黄瓜苗', '草莓苗', '生根剂',
  '水溶肥', '有机肥', '复合肥', '多菌灵',
  '吡虫啉', '周转箱', '滴灌带', '钾肥',
  '氮肥', '磷肥', '微生物菌剂', '其他'
];

// ============================================
// 选项配置 - 单位
// ============================================
export const workloadUnitOptions = [
  { value: '株', label: '株' },
  { value: '㎡', label: '平方米' },
  { value: 'kg', label: '公斤' },
  { value: '米', label: '米' },
  { value: '袋', label: '袋' },
  { value: '箱', label: '箱' },
];

// ============================================
// 选项配置 - 仓库
// ============================================
export const warehouseOptions = [
  { value: 'W001', label: '冷库A区' },
  { value: 'W002', label: '冷库B区' },
  { value: 'W003', label: '常温库' },
];

// ============================================
// 选项配置 - 批次（带过滤，只显示进行中的批次）
// ============================================
export const batchOptions = cropBatches
  .filter(b => b.status === 'in_progress' || b.status === 'planned')
  .map(b => ({
    value: b.batchCode,
    label: `${b.batchCode} - ${b.cropName}`,
    id: b.id,
    cropName: b.cropName,
    greenhouseId: b.greenhouseId,
    greenhouseName: b.greenhouseName,
  }));

// ============================================
// 统一导出
// ============================================
export const farmMockData = {
  // Mock数据
  farmOperationRecords,
  farmInspectionRecords,
  farmHarvestRecords,
  farmTasks,

  // 选项配置
  greenhouseOptions,
  operatorOptions,
  materialOptions,
  workloadUnitOptions,
  warehouseOptions,
  batchOptions,

  // 原始数据引用
  greenhouses,
  users,
  cropBatches,
};

// ============================================
// TaskDispatchPage 专用数据（消除硬编码）
// ============================================

// 任务类型定义
export const TASK_DISPATCH_TYPES = [
  { value: 'fertilization', label: '施肥' },
  { value: 'irrigation', label: '灌溉' },
  { value: 'pruning', label: '修剪' },
  { value: 'pesticide', label: '植保' },
  { value: 'harvest', label: '采收' },
  { value: 'weeding', label: '除草' },
  { value: 'other', label: '其他' },
] as const;

// 任务类型配置值类型
export interface TaskConfigValues {
  [key: string]: string | number | boolean | string[] | { name: string; qty: number; unit: string }[];
}

// TaskDispatch 任务类型（与页面内部格式一致）
export interface TaskDispatchTask {
  id: string;
  types: string[];
  typeLabel: string;
  field: string;
  crop: string;
  assignee: string;
  planStart: string;
  planEnd: string;
  progress: number;
  status: string;
  priority: string;
  estimatedDays: number;
  estimatedHours: number;

  // 任务配置（单一任务类型时显示详细配置）
  typeConfig?: TaskConfigValues;

  // SOP内容
  sopContent?: string;

  // 所需物资
  materials?: { name: string; qty: number; unit: string }[];

  // 所需工具
  tools?: { name: string; qty: number; unit: string }[];

  // 必填反馈
  requiredFeedback?: string[];

  // 关联记录（数据闭环关键）
  relatedInspectionIds?: string[];   // 关联的巡查记录ID
  relatedOperationIds?: string[];     // 关联的农事操作记录ID
  relatedHarvestIds?: string[];       // 关联的采收记录ID
}

// TaskDispatch 地块类型
export interface TaskDispatchField {
  id: number;
  name: string;
  type: string;
  crop: string;
  area: number;
}

// TaskDispatch 员工类型
export interface TaskDispatchStaff {
  id: number;
  name: string;
  status: string;
  role?: string;         // 角色
  skills?: string[];     // 技能标签
  workZone?: string;      // 工作区域
  workLoad?: number;      // 当前工作负载 0-100
}

// TaskDispatch 任务数据
export const taskDispatchTasks: TaskDispatchTask[] = [
  // 多任务类型 - 灌溉+施肥
  {
    id: 'NS20260317-002',
    types: ['irrigation', 'fertilization'],
    typeLabel: '灌溉,施肥',
    field: '4号棚',
    crop: '黄瓜',
    assignee: '陆启闯',
    planStart: '2026-03-17 09:00',
    planEnd: '2026-03-17 11:00',
    progress: 60,
    status: 'in_progress',
    priority: 'high',
    estimatedDays: 0,
    estimatedHours: 2,
    materials: [
      { name: '水溶肥', qty: 10, unit: 'kg' },
    ],
    tools: [
      { name: '滴灌设备', qty: 1, unit: '套' },
    ],
    requiredFeedback: ['gps', 'material', 'photo_before', 'photo_after'],
    sopContent: `【灌溉作业标准】
1. 先进行灌溉检查，确保滴灌设备正常运行
2. 灌溉量：20m³/亩，灌溉时长：30分钟/亩
3. 灌溉结束后进行施肥操作

【施肥作业标准】
1. 肥料配比：水溶肥稀释500倍
2. 施用方式：滴灌随水施入
3. 注意事项：避免雨前施用，施肥后观察作物反应

【安全要求】
- 操作人员需佩戴防护手套
- 施肥设备使用后需清洗干净`,
  },
  // 多任务类型 - 修剪+采收
  {
    id: 'NS20260318-001',
    types: ['pruning', 'harvest'],
    typeLabel: '修剪,采收',
    field: '8号棚',
    crop: '辣椒',
    assignee: '陆启闯',
    planStart: '2026-03-18 08:00',
    planEnd: '2026-03-20 17:00',
    progress: 0,
    status: 'cancelled',
    priority: 'normal',
    estimatedDays: 2,
    estimatedHours: 4,
    materials: [
      { name: '采摘篮', qty: 10, unit: '个' },
      { name: '包装箱', qty: 20, unit: '箱' },
    ],
    tools: [
      { name: '修枝剪', qty: 3, unit: '把' },
      { name: '手锯', qty: 1, unit: '把' },
      { name: '梯子', qty: 2, unit: '个' },
    ],
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    sopContent: `【修剪作业标准】
1. 修剪类型：整形修剪+卫生修剪
2. 修剪部位：主干侧枝、病弱枝、过密枝
3. 工具：修枝剪、手锯
4. 修剪后及时清理残枝落叶

【采收作业标准】
1. 成熟度标准：80%成熟采收
2. 品质等级：A级、B级
3. 采收工具：采摘篮、剪刀
4. 采收时轻拿轻放，避免机械损伤

【包装要求】
1. 采收后2小时内完成包装
2. 包装箱需清洁干燥
3. 分级包装：A级、B级分开存放`,
  },
  // 多任务类型 - 采收+施肥+除草（3种）
  {
    id: 'NS20260316-001',
    types: ['harvest', 'fertilization', 'weeding'],
    typeLabel: '采收,施肥,除草',
    field: 'A1地块',
    crop: '水稻',
    assignee: '陆启闯',
    planStart: '2026-03-16 08:00',
    planEnd: '2026-03-18 18:00',
    progress: 100,
    status: 'waiting_acceptance',
    priority: 'normal',
    estimatedDays: 2,
    estimatedHours: 10,
    materials: [
      { name: '复合肥', qty: 100, unit: 'kg' },
      { name: '除草剂', qty: 10, unit: 'L' },
      { name: '编织袋', qty: 50, unit: '个' },
    ],
    tools: [
      { name: '镰刀', qty: 5, unit: '把' },
      { name: '收割机', qty: 1, unit: '台' },
    ],
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    sopContent: `【采收作业标准】
1. 成熟度标准：完全成熟后采收
2. 采收方式：机械收割为主，人工收割为辅
3. 品质要求：籽粒饱满、无霉变、无杂质

【施肥作业标准】
1. 施肥时机：采收后立即进行
2. 肥料种类：复合肥
3. 用量：20kg/亩
4. 施用方式：撒施后旋耕入土

【除草作业标准】
1. 除草方式：化学除草
2. 除草剂用量：8L/亩
3. 注意事项：整地前进行全田除草`,
  },
  // 多任务类型 - 施肥+灌溉
  {
    id: 'NS20260317-005',
    types: ['fertilization', 'irrigation'],
    typeLabel: '施肥,灌溉',
    field: 'C1地块',
    crop: '油菜',
    assignee: '陆启闯',
    planStart: '2026-03-17 13:00',
    planEnd: '2026-03-17 17:00',
    progress: 0,
    status: 'rejected',
    priority: 'normal',
    estimatedDays: 0,
    estimatedHours: 4,
    materials: [
      { name: '尿素', qty: 30, unit: 'kg' },
    ],
    tools: [
      { name: '施肥器', qty: 1, unit: '把' },
    ],
    requiredFeedback: ['gps', 'photo_before'],
    sopContent: `【施肥作业标准】
1. 肥料种类：尿素
2. 用量：15kg/亩
3. 施用方式：撒施

【灌溉作业标准】
1. 灌溉方式：漫灌
2. 灌溉量：30m³/亩
3. 注意事项：灌溉前确保田埂无漏水`,
  },
  // 单一任务类型 - 灌溉（完整配置）
  {
    id: 'NS20260317-006',
    types: ['irrigation'],
    typeLabel: '灌溉',
    field: 'D1地块',
    crop: '蔬菜',
    assignee: '陆启闯',
    planStart: '2026-03-17 06:00',
    planEnd: '2026-03-17 08:00',
    progress: 100,
    status: 'completed',
    priority: 'urgent',
    estimatedDays: 0,
    estimatedHours: 2,
    typeConfig: {
      waterAmount: 25,
      irrigationMethod: 'drip',
      duration: 40,
      remarks: '早上6点开始灌溉，避开高温时段',
    },
    materials: [],
    tools: [
      { name: '滴灌设备', qty: 1, unit: '套' },
    ],
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    sopContent: '',
  },
  // 多任务类型 - 采收+除草+修剪（3种）
  {
    id: 'NS20260319-001',
    types: ['harvest', 'weeding', 'pruning'],
    typeLabel: '采收,除草,修剪',
    field: 'A2地块',
    crop: '水稻',
    assignee: '陆启闯',
    planStart: '2026-03-19 08:00',
    planEnd: '2026-03-23 18:00',
    progress: 0,
    status: 'pending',
    priority: 'normal',
    estimatedDays: 4,
    estimatedHours: 2,
    materials: [
      { name: '除草剂', qty: 8, unit: 'L' },
      { name: '剪刀', qty: 3, unit: '把' },
    ],
    tools: [
      { name: '除草机', qty: 1, unit: '台' },
      { name: '镰刀', qty: 5, unit: '把' },
    ],
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    sopContent: `【采收作业标准】
1. 成熟度：完全成熟后采收
2. 采收方式：人工收割
3. 品质要求：无杂质、无霉变

【除草作业标准】
1. 方式：化学除草+人工除草结合
2. 除草剂用量：6L/亩
3. 安全间隔期：14天

【修剪作业标准】
1. 类型：卫生修剪
2. 部位：病残枝、过密枝
3. 工具：修枝剪、手锯`,
  },
];

// TaskDispatch 地块列表
export const taskDispatchFields: TaskDispatchField[] = [
  // 温室大棚 (12个)
  { id: 1, name: '1号棚', type: '温室', crop: '番茄', area: 6500 },
  { id: 2, name: '2号棚', type: '温室', crop: '番茄', area: 6500 },
  { id: 3, name: '3号棚', type: '温室', crop: '番茄', area: 6500 },
  { id: 4, name: '4号棚', type: '温室', crop: '黄瓜', area: 7000 },
  { id: 5, name: '5号棚', type: '温室', crop: '黄瓜', area: 7000 },
  { id: 6, name: '6号棚', type: '温室', crop: '草莓', area: 6000 },
  { id: 7, name: '7号棚', type: '温室', crop: '草莓', area: 6000 },
  { id: 8, name: '8号棚', type: '温室', crop: '辣椒', area: 5500 },
  { id: 9, name: '9号棚', type: '温室', crop: '辣椒', area: 5500 },
  { id: 10, name: '10号棚', type: '温室', crop: '生菜', area: 5000 },
  { id: 11, name: '11号棚', type: '温室', crop: '生菜', area: 5000 },
  { id: 12, name: '12号棚', type: '温室', crop: '西瓜', area: 7000 },
  // 大田 (8个)
  { id: 13, name: 'A1地块', type: '大田', crop: '水稻', area: 100 },
  { id: 14, name: 'A2地块', type: '大田', crop: '水稻', area: 100 },
  { id: 15, name: 'A3地块', type: '大田', crop: '水稻', area: 100 },
  { id: 16, name: 'B1地块', type: '大田', crop: '小麦', area: 100 },
  { id: 17, name: 'B2地块', type: '大田', crop: '小麦', area: 100 },
  { id: 18, name: 'C1地块', type: '大田', crop: '油菜', area: 80 },
  { id: 19, name: 'C2地块', type: '大田', crop: '油菜', area: 70 },
  { id: 20, name: 'D1地块', type: '大田', crop: '蔬菜', area: 50 },
];

// TaskDispatch 员工列表
export const taskDispatchStaff: TaskDispatchStaff[] = [
  { id: 1, name: '段誉', status: 'busy', role: 'technician', skills: ['施肥作业', '灌溉系统操作', '水肥一体化', '病虫害防治'], workZone: '1号棚', workLoad: 80 },
  { id: 2, name: '虚竹', status: 'available', role: 'technician', skills: ['浇水灌溉', '施肥作业', '修剪整枝', '采摘技能'], workZone: '4号棚', workLoad: 30 },
  { id: 3, name: '杨康', status: 'available', role: 'worker', skills: ['病虫害防治', '打药操作', '农药配制', '灌溉系统操作'], workZone: '6号棚', workLoad: 20 },
  { id: 4, name: '乔峰', status: 'off', role: 'worker', skills: ['采摘技能', '质检分级', '包装发货', '修剪整枝'], workZone: '8号棚', workLoad: 0 },
  { id: 5, name: '韦小宝', status: 'available', role: 'technician', skills: ['施肥作业', '水肥一体化', '中耕作业', '灌溉系统操作'], workZone: 'A1地块', workLoad: 40 },
  { id: 6, name: '双儿', status: 'busy', role: 'worker', skills: ['除草', '中耕作业', '采摘技能', '灌溉系统操作'], workZone: 'B1地块', workLoad: 70 },
];

// 基地名称
export const TASK_DISPATCH_BASE = '崇明岛基地';

// SOP模板
export const SOP_TEMPLATES: Record<string, string> = {
  fertilization: '尿素用量：20kg/亩\n稀释倍数：500倍\n注意事项：避免雨前4小时施用',
  irrigation: '灌溉方式：滴灌\n灌溉时长：30分钟/亩\n注意事项：确保灌溉均匀',
  pesticide: '农药名称：多菌灵\n用量：1000倍稀释\n注意事项：佩戴防护装备',
  pruning: '修剪标准：保留主干，去除侧枝\n工具：专业修枝剪\n注意事项：剪口要平整',
  harvest: '采收标准：果实成熟度达90%\n工具：采摘篮\n注意事项：轻拿轻放',
  weeding: '除草方式：人工除草\n深度：3-5cm\n注意事项：除根除尽',
};

// 状态映射 - 支持10种任务状态
export const TASK_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100' },
  pending: { label: '待接受', color: 'text-gray-600', bg: 'bg-gray-100' },
  accepted: { label: '已接受', color: 'text-blue-600', bg: 'bg-blue-100' },
  in_progress: { label: '处理中', color: 'text-blue-600', bg: 'bg-blue-100' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: '返工中', color: 'text-red-600', bg: 'bg-red-100' },
  failed: { label: '任务失败', color: 'text-purple-600', bg: 'bg-purple-100' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50' },
  abandoned: { label: '已放弃', color: 'text-red-400', bg: 'bg-red-50' },
};

// 优先级映射
export const TASK_PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'text-red-500' },
  high: { label: '高', color: 'text-orange-500' },
  normal: { label: '普通', color: 'text-gray-500' },
};

// ============================================
// 作物生长阶段数据
// ============================================
export interface CropStage {
  stage: string;
  tasks: string[];
  priority: 'high' | 'medium' | 'low';
}

export const cropStages: Record<string, CropStage> = {
  '番茄': { stage: '开花结果期', tasks: ['人工授粉', '疏果', '浇水', '施肥'], priority: 'high' },
  '黄瓜': { stage: '生长期', tasks: ['施肥', '除草', '浇水', '防病虫'], priority: 'medium' },
  '草莓': { stage: '开花结果期', tasks: ['人工授粉', '疏果', '浇水'], priority: 'high' },
  '辣椒': { stage: '生长期', tasks: ['施肥', '除草', '浇水'], priority: 'medium' },
  '生菜': { stage: '生长期', tasks: ['浇水', '施肥', '除草'], priority: 'low' },
  '西瓜': { stage: '开花结果期', tasks: ['人工授粉', '浇水', '施肥'], priority: 'high' },
  '水稻': { stage: '成熟期', tasks: ['及时采收', '晾晒'], priority: 'high' },
  '小麦': { stage: '成熟期', tasks: ['及时采收', '晾晒'], priority: 'high' },
  '油菜': { stage: '成熟期', tasks: ['及时采收', '晾晒'], priority: 'high' },
  '蔬菜': { stage: '生长期', tasks: ['浇水', '施肥', '除草', '采收'], priority: 'medium' },
};

// ============================================
// 星期中文选项（日历视图用，weekStartsOn: 1 = 周一优先）
// ============================================
export const weekDaysZh = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
