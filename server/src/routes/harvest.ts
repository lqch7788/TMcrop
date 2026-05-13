/**
 * 采收记录 API 路由
 * 精简为直接调用 Controller
 */

import { Router } from 'express';
import { harvestController } from '../controllers/harvest.controller';

const router = Router();

// 批量操作（必须放在 /:id 之前，否则 /batch 会被误匹配为 /:id = 'batch'）
router.put('/batch', (req, res, next) => harvestController.updateBatch(req, res, next));
router.delete('/batch', (req, res, next) => harvestController.deleteBatch(req, res, next));
router.get('/batch', (req, res, next) => harvestController.getByIds(req, res, next));

// 特殊查询
router.get('/batch-code/:batchCode', (req, res, next) => harvestController.getByBatchCode(req, res, next));
router.get('/stats', (req, res, next) => harvestController.getStats(req, res, next));
router.get('/export', (req, res, next) => harvestController.export(req, res, next));

// 初始化和重置
router.get('/init', (req, res, next) => harvestController.init(req, res, next));
router.post('/reset', (req, res, next) => harvestController.reset(req, res, next));

// 生成单号
router.get('/generate-code', (req, res, next) => harvestController.generateCode(req, res, next));

// 基础 CRUD 路由（/:id 必须放在最后）
router.get('/', (req, res, next) => harvestController.getAll(req, res, next));
router.get('/:id', (req, res, next) => harvestController.getById(req, res, next));
router.post('/', (req, res, next) => harvestController.create(req, res, next));
router.put('/:id', (req, res, next) => harvestController.update(req, res, next));
router.delete('/:id', (req, res, next) => harvestController.delete(req, res, next));

export default router;
