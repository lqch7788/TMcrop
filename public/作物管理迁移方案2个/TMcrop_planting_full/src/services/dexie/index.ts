/**
 * Dexie.js Service 统一导出（第三种存储方案）
 * 基于 IndexedDB 的纯前端持久化实现
 * 适用于演示版/原型阶段，无需后端即可运行
 * fallback 优先级：API → Dexie.js → LocalStorage
 */

// 各模块 Dexie 实现
export * as seedSourceService from './seedSourceService';
export * as seedlingService from './seedlingService';
export * as plantingService from './plantingService';
export * as harvestService from './harvestService';
export * as cropInstanceService from './cropInstanceService';
export * as cropOrderService from './cropOrderService';
export * as cropVarietyService from './cropVarietyService';

// 数据库实例和工具
export { db, clearAllDexieData } from './db';
export * from './utils';

// ===== 新增模块导出 =====
export * as baseSettingsService from './baseSettingsService';
export * as indicatorService from './indicatorService';
export * as farmActivityService from './farmActivityService';
export * as inventoryService from './inventoryService';
export * as warehouseService from './warehouseService';
export * as materialService from './materialService';
export * as approvalService from './approvalService';
export * as attendanceService from './attendanceService';
export * as attendanceRepairService from './attendanceRepairService';
export * as leaveService from './leaveService';
export * as overtimeService from './overtimeService';
export * as recruitmentService from './recruitmentService';
export * as contractService from './contractService';
export * as onboardingService from './onboardingService';
export * as resignationService from './resignationService';
export * as salaryAdjustmentService from './salaryAdjustmentService';
export * as salaryBudgetService from './salaryBudgetService';
export * as taskCenterService from './taskCenterService';
export * as personnelService from './personnelService';
export * as productionPlanService from './productionPlanService';
export * as organizationService from './organizationService';
export * as systemConfigService from './systemConfigService';
export * as plantingConfigService from './plantingConfigService';