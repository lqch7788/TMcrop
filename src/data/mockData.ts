// 智慧种植生产管理系统模拟数据
// 此文件从各子模块导入数据并重新导出，保持向后兼容

// 从农场数据模块导入
export {
  users,
  bases,
  greenhouses,
  cropTypes,
  processes,
  plantingModes,
  materials,
  cropBatches,
  tasks,
  materialRequests,
  iotSensors,
  inspectionRecords,
  equipmentRecords,
  infrastructureRecords,
  harvestRecords,
  purchasePlans,
  equipmentStats,
  energyConsumption,
  productionProgress,
  inventoryAlerts,
  todayTasksBreakdown,
  alertsBreakdown,
  dashboardStats,
  temperatureTrend,
  yieldStats,
  costAnalysis,
} from './farm/farmData';

// 类型导出（使用 export type 语法）
export type { Base } from './farm/farmData';

// 从人事数据模块导入
export {
  departments,
  positions,
  tempTasks,
  workers,
  INSPECTION_CATEGORY_MAP,
  INSPECTION_MATERIALS_MAP,
  INSPECTION_TOOLS_MAP,
  INSPECTION_SOP_MAP,
  INSPECTION_TASK_STATUSES,
  inspectionFeedbackTasks,
} from './labor/laborData';

// 从仓库数据模块导入
export {
  warehouses,
  produceInventory,
} from './warehouse/warehouseData';

// 从审批数据模块导入
export {
  approvals,
  messages,
} from './approval/approvalData';

// 重新导出类型定义（保持原有接口可用）
import { User, CropBatch, Task, Material, MaterialRequest, Greenhouse, IoTSensor, InspectionRecord, HarvestRecord, DashboardStats, CropType, Process, Department, TempTask, Worker, Equipment, Infrastructure, Position } from '../types';
import type { Approval } from '../types/approval';
import type { ProduceInventory, StockType } from '../types/inventory';
import type { PlanType } from '../types';

// 重新导出类型
export type { Base } from './farm/farmData';
export type { InspectionFeedbackTaskData } from './labor/laborData';

// 重新导出基础类型（用于兼容）
export type {
  User,
  CropBatch,
  Task,
  Material,
  MaterialRequest,
  Greenhouse,
  IoTSensor,
  InspectionRecord,
  HarvestRecord,
  DashboardStats,
  CropType,
  Process,
  Department,
  TempTask,
  Worker,
  Equipment,
  Infrastructure,
  Position,
};

export type { Approval };
export type { ProduceInventory, StockType };
export type { PlanType };

// 当前登录用户 - 从farmData的users中获取默认用户
import { users } from './farm/farmData';
export const currentUser: User = users.find(u => u.id === 'U013') || users[0];
