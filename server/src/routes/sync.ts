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

export default router;
