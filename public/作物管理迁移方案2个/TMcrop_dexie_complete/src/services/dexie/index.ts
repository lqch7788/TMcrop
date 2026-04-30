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
