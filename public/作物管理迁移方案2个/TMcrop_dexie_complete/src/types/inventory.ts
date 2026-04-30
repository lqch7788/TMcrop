/**
 * 采收产品库存管理系统类型定义
 */

// 库存交易记录
export interface InventoryTransaction {
  id: string;
  type: 'inbound' | 'outbound' | 'transfer';
  quantity: number;
  date: string;
  operator: string;
  remarks: string;
}

// 预警类型
export type AlertType = 'storage_time' | 'low_stock' | 'high_stock' | 'expiration';

// 预警等级
export type AlertLevel = 'info' | 'warning' | 'critical';

// 库存状态
export type InventoryStatus = 'in_stock' | 'low_stock' | 'expired' | 'out_of_stock';

// 预警设置
export interface AlertSettings {
  enableStorageTimeAlert: boolean;  // 启用存储时间预警
  storageTimeThreshold: number;     // 存储时间阈值（天）
  enableQuantityAlert: boolean;      // 启用库存量预警
  minQuantityThreshold: number;       // 最小库存预警量
  maxQuantityThreshold: number;       // 最大库存预警量
  minStock: number;                  // 最低库存限值
  maxStock: number;                  // 最高库存限值
  expirationDays: number;             // 保质期天数
}

// 采收产品库存
export interface ProduceInventory {
  id: string;                    // 唯一标识
  harvestRecordId: string;        // 关联采收入库记录ID

  // 产品识别
  productCode: string;            // 产品编码（可由采收单号生成）
  cropName: string;                // 作物名称（如：番茄、黄瓜）
  variety: string;                // 品种（如：红果番茄、水果黄瓜）

  // 数量与质量
  quantity: number;              // 当前库存数量
  unit: string;                   // 单位（公斤、盒、箱）
  grade: 'A' | 'B' | 'C';         // 品质等级
  quality: 'excellent' | 'good' | 'average' | 'poor'; // 品质评定

  // 仓库位置
  warehouseId: string;            // 仓库ID
  warehouseName: string;          // 仓库名称
  storageLocation: string;        // 具体存放位置（如：A区-01-03）

  // 时间追踪
  harvestDate: string;            // 采收日期
  storageDate: string;            // 入库日期
  expirationDate: string;          // 过期日期（可计算：入库日期 + 保质期）

  // 预警设置
  alertSettings: AlertSettings;

  // 批次追溯
  batchCode: string;              // 生产计划批次号
  greenhouseName: string;          // 种植区域
  plantingMode: string;            // 种植模式

  // 状态
  status: InventoryStatus;

  // 操作记录
  inboundRecords: InventoryTransaction[];
  outboundRecords: InventoryTransaction[];
}

// 预警信息
export interface AlertInfo {
  type: AlertType;
  level: AlertLevel;
  message: string;
  threshold: number;
  currentValue: number;
}

// 预警统计
export interface AlertStats {
  totalAlerts: number;
  storageTimeAlerts: number;
  lowStockAlerts: number;
  highStockAlerts: number;
  expirationAlerts: number;
}
