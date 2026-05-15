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
