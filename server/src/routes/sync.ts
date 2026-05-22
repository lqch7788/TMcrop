/**
 * 数据同步路由
 * 支持 localStorage 数据批量导入到数据库
 */

import { Router } from 'express';
import { syncController } from '../controllers/sync.controller';

const router = Router();

// ==================== 批量导入路由（localStorage -> 数据库）====================

/**
 * GET /api/sync/stats
 * 获取数据库中各表的数据统计
 */
router.get('/stats', (req, res, next) => syncController.getStats(req, res, next));

/**
 * GET /api/sync/schema/:table
 * 获取指定表的字段结构
 */
router.get('/schema/:table', (req, res, next) => syncController.getSchema(req, res, next));

/**
 * GET /api/sync/sample/:table
 * 获取指定表的样本数据（用于冲突检测）
 */
router.get('/sample/:table', (req, res, next) => syncController.getSampleData(req, res, next));

/**
 * POST /api/sync/seed-sources
 * 批量导入种源数据（从 localStorage）
 */
router.post('/seed-sources', (req, res, next) => syncController.importSeedSources(req, res, next));

/**
 * POST /api/sync/seedlings
 * 批量导入育苗数据（从 localStorage）
 */
router.post('/seedlings', (req, res, next) => syncController.importSeedlings(req, res, next));

/**
 * POST /api/sync/plantings
 * 批量导入种植数据（从 localStorage）
 */
router.post('/plantings', (req, res, next) => syncController.importPlantings(req, res, next));

/**
 * POST /api/sync/harvest
 * 批量导入采收数据（从 localStorage）
 */
router.post('/harvest', (req, res, next) => syncController.importHarvest(req, res, next));

/**
 * POST /api/sync/crop-instances
 * 批量导入实例数据（从 localStorage）
 */
router.post('/crop-instances', (req, res, next) => syncController.importCropInstances(req, res, next));

/**
 * POST /api/sync/announcements
 * 批量导入公告数据（从 localStorage）
 */
router.post('/announcements', (req, res, next) => syncController.importAnnouncements(req, res, next));

/**
 * POST /api/sync/indicators
 * 批量导入指标数据（从 localStorage）
 */
router.post('/indicators', (req, res, next) => syncController.importIndicators(req, res, next));

/**
 * POST /api/sync/crop-orders
 * 批量导入订单数据（从 localStorage）
 */
router.post('/crop-orders', (req, res, next) => syncController.importCropOrders(req, res, next));

/**
 * POST /api/sync/tech-solutions
 * 批量导入技术方案数据（从 localStorage）
 */
router.post('/tech-solutions', (req, res, next) => syncController.importTechSolutions(req, res, next));

/**
 * POST /api/sync/suppliers
 * 批量导入供应商数据（从 localStorage）
 */
router.post('/suppliers', (req, res, next) => syncController.importSuppliers(req, res, next));

/**
 * POST /api/sync/dictionaries
 * 批量导入字典数据（从 localStorage）
 */
router.post('/dictionaries', (req, res, next) => syncController.importDictionaries(req, res, next));

/**
 * POST /api/sync/farm-tasks
 * 批量导入农事任务数据（从 localStorage）
 */
router.post('/farm-tasks', (req, res, next) => syncController.importFarmTasks(req, res, next));

/**
 * POST /api/sync/temp-tasks
 * 批量导入临时任务数据（从 localStorage）
 */
router.post('/temp-tasks', (req, res, next) => syncController.importTempTasks(req, res, next));

/**
 * POST /api/sync/inspections
 * 批量导入巡检记录数据（从 localStorage）
 */
router.post('/inspections', (req, res, next) => syncController.importInspections(req, res, next));

/**
 * POST /api/sync/problems
 * 批量导入问题记录数据（从 localStorage）
 */
router.post('/problems', (req, res, next) => syncController.importProblems(req, res, next));

/**
 * POST /api/sync/attendance
 * 批量导入考勤数据（从 localStorage）
 */
router.post('/attendance', (req, res, next) => syncController.importAttendance(req, res, next));

/**
 * POST /api/sync/labor
 * 批量导入工作日志数据（从 localStorage）
 */
router.post('/labor', (req, res, next) => syncController.importLabor(req, res, next));

/**
 * POST /api/sync/production-plans
 * 批量导入生产计划数据（从 localStorage）
 */
router.post('/production-plans', (req, res, next) => syncController.importProductionPlans(req, res, next));

/**
 * POST /api/sync/purchase-plans
 * 批量导入采购计划数据（从 localStorage）
 */
router.post('/purchase-plans', (req, res, next) => syncController.importPurchasePlans(req, res, next));

export default router;
