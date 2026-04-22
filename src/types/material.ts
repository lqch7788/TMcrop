/**
 * 物料与设备类型定义
 * 用于农事管理系统的物料和设备相关类型
 */

// ============================================
// 物料类型
// ============================================

/** 物料类型 */
export type MaterialType = 'seed' | 'fertilizer' | 'pesticide' | 'tool' | 'other';

/** 物料单位 */
export type MaterialUnit = 'kg' | 'g' | 'L' | 'mL' | 'piece' | 'bag' | 'bottle';

/** 物料状态 */
export type MaterialStatus = 'available' | 'low_stock' | 'out_of_stock' | 'expired';

/** 物料记录 */
export interface Material {
  id: string;
  code: string;              // 物料编码
  name: string;              // 物料名称
  type: MaterialType;        // 物料类型
  unit: MaterialUnit;        // 单位
  quantity: number;          // 当前库存数量
  minStock: number;          // 最低库存阈值
  maxStock: number;          // 最高库存阈值
  location: string;          // 存放位置
  supplier?: string;         // 供应商
  purchaseDate?: string;     // 采购日期
  expiryDate?: string;       // 过期日期
  status: MaterialStatus;    // 状态
  remark?: string;           // 备注
}

/** 物料使用记录 */
export interface MaterialUsageRecord {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: MaterialUnit;
  usageDate: string;
  usageType: 'dispatch' | 'manual' | 'maintenance';
  taskId?: string;
  workerId: string;
  workerName: string;
  greenhouseId?: string;
  remark?: string;
}

// ============================================
// 设备类型
// ============================================

/** 设备类型 */
export type EquipmentType = 'irrigation' | 'sprayer' | 'pruner' | 'sensor' | 'vehicle' | 'other';

/** 设备状态 */
export type EquipmentStatus = 'normal' | 'maintenance' | 'broken' | 'idle';

/** 设备 */
export interface Equipment {
  id: string;
  code: string;               // 设备编码
  name: string;               // 设备名称
  type: EquipmentType;        // 设备类型
  model?: string;             // 型号
  location: string;           // 当前位置/区域
  status: EquipmentStatus;    // 状态
  lastMaintenanceDate?: string; // 上次保养日期
  nextMaintenanceDate?: string; // 下次保养日期
  totalUsageHours: number;    // 累计使用时长
  remark?: string;            // 备注
}

/** 设备使用记录 */
export interface EquipmentUsageRecord {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  usageDate: string;
  usageType: 'dispatch' | 'manual';
  taskId?: string;
  workerId: string;
  workerName: string;
  duration: number;           // 使用时长（小时）
  greenhouseId?: string;
  remark?: string;
}

/** 设备告警 */
export interface EquipmentAlert {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  alertType: 'maintenance_due' | 'breakdown' | 'low_battery';
  alertLevel: 'info' | 'warning' | 'critical';
  message: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// ============================================
// 物料设备整合数据
// ============================================

/** 物料设备概览 */
export interface MaterialEquipmentOverview {
  // 物料统计
  materialStats: {
    total: number;
    available: number;
    lowStock: number;
    outOfStock: number;
    expired: number;
  };
  // 设备统计
  equipmentStats: {
    total: number;
    normal: number;
    maintenance: number;
    broken: number;
    idle: number;
  };
  // 今日使用
  todayUsage: {
    materials: MaterialUsageRecord[];
    equipment: EquipmentUsageRecord[];
  };
  // 设备告警
  equipmentAlerts: EquipmentAlert[];
}

// ============================================
// Mock 数据
// ============================================

/** 模拟物料数据 */
export const MOCK_MATERIALS: Material[] = [
  {
    id: 'mat_001',
    code: 'FER-001',
    name: '复合肥（NPK）',
    type: 'fertilizer',
    unit: 'kg',
    quantity: 500,
    minStock: 100,
    maxStock: 1000,
    location: 'A区仓库1号架',
    supplier: '绿丰农资公司',
    purchaseDate: '2026-03-15',
    status: 'available',
  },
  {
    id: 'mat_002',
    code: 'FER-002',
    name: '尿素',
    type: 'fertilizer',
    unit: 'kg',
    quantity: 80,
    minStock: 100,
    maxStock: 800,
    location: 'A区仓库2号架',
    supplier: '绿丰农资公司',
    purchaseDate: '2026-03-10',
    status: 'low_stock',
  },
  {
    id: 'mat_003',
    code: 'PES-001',
    name: '多菌灵',
    type: 'pesticide',
    unit: 'bottle',
    quantity: 45,
    minStock: 20,
    maxStock: 100,
    location: 'B区农药柜',
    supplier: '金盾农药店',
    purchaseDate: '2026-02-20',
    expiryDate: '2027-02-20',
    status: 'available',
  },
  {
    id: 'mat_004',
    code: 'PES-002',
    name: '吡虫啉',
    type: 'pesticide',
    unit: 'bottle',
    quantity: 0,
    minStock: 15,
    maxStock: 80,
    location: 'B区农药柜',
    supplier: '金盾农药店',
    purchaseDate: '2026-01-15',
    expiryDate: '2026-07-15',
    status: 'out_of_stock',
  },
  {
    id: 'mat_005',
    code: 'TOOL-001',
    name: '修剪刀',
    type: 'tool',
    unit: 'piece',
    quantity: 25,
    minStock: 10,
    maxStock: 50,
    location: '工具间1号柜',
    status: 'available',
  },
];

/** 模拟设备数据 */
export const MOCK_EQUIPMENTS: Equipment[] = [
  {
    id: 'eq_001',
    code: 'IRR-001',
    name: '智能灌溉系统',
    type: 'irrigation',
    model: 'IRR-3000Pro',
    location: 'A区1号温室',
    status: 'normal',
    lastMaintenanceDate: '2026-03-01',
    nextMaintenanceDate: '2026-06-01',
    totalUsageHours: 1250,
  },
  {
    id: 'eq_002',
    code: 'IRR-002',
    name: '滴灌设备',
    type: 'irrigation',
    model: 'Drip-500',
    location: 'A区2号温室',
    status: 'maintenance',
    lastMaintenanceDate: '2026-02-15',
    nextMaintenanceDate: '2026-03-15',
    totalUsageHours: 890,
    remark: '滴头堵塞，正在维修',
  },
  {
    id: 'eq_003',
    code: 'SPR-001',
    name: '背负式喷雾器',
    type: 'sprayer',
    model: 'BS-15L',
    location: '工具间2号柜',
    status: 'normal',
    lastMaintenanceDate: '2026-03-10',
    nextMaintenanceDate: '2026-06-10',
    totalUsageHours: 320,
  },
  {
    id: 'eq_004',
    code: 'SEN-001',
    name: '土壤EC传感器',
    type: 'sensor',
    model: 'EC-100',
    location: 'B区1号温室',
    status: 'broken',
    lastMaintenanceDate: '2026-01-20',
    totalUsageHours: 2100,
    remark: '探头损坏，需要更换',
  },
  {
    id: 'eq_005',
    code: 'VEH-001',
    name: '电动运输车',
    type: 'vehicle',
    model: 'TC-500',
    location: 'C区停车场',
    status: 'idle',
    lastMaintenanceDate: '2026-02-28',
    nextMaintenanceDate: '2026-05-28',
    totalUsageHours: 560,
  },
];

/** 模拟设备告警 */
export const MOCK_EQUIPMENT_ALERTS: EquipmentAlert[] = [
  {
    id: 'ea_001',
    equipmentId: 'eq_002',
    equipmentCode: 'IRR-002',
    equipmentName: '滴灌设备',
    alertType: 'maintenance_due',
    alertLevel: 'warning',
    message: '滴灌设备保养到期，请及时保养',
    createdAt: new Date().toISOString(),
    acknowledged: false,
  },
  {
    id: 'ea_002',
    equipmentId: 'eq_004',
    equipmentCode: 'SEN-001',
    equipmentName: '土壤EC传感器',
    alertType: 'breakdown',
    alertLevel: 'critical',
    message: '土壤EC传感器探头损坏，需要立即更换',
    createdAt: new Date().toISOString(),
    acknowledged: false,
  },
];
