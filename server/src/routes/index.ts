/**
 * 路由汇总
 */

import { Router } from 'express';
import cropVarietyRouter from './cropVariety';
import inventoryRouter from './inventory';
import seedlingRouter from './seedling';
import seedSourceRouter from './seedSource';
import plantingRouter from './planting';
import harvestRouter from './harvest';
import supplierRouter from './supplier';
import cropInstanceRouter from './cropInstance';
import farmTaskRouter from './farmTask';
import inspectionRouter from './inspection';
import problemRouter from './problem';
import laborRouter from './labor';

const router = Router();

// 作物品种路由
router.use('/crop-varieties', cropVarietyRouter);

// 库存路由
router.use('/inventory', inventoryRouter);

// 育苗管理路由
router.use('/seedlings', seedlingRouter);

// 种源管理路由
router.use('/seed-sources', seedSourceRouter);

// 种植管理路由
router.use('/plantings', plantingRouter);

// 采收管理路由
router.use('/harvest', harvestRouter);

// 供应商路由
router.use('/suppliers', supplierRouter);

// 作物实例路由
router.use('/crop-instances', cropInstanceRouter);

// 农事任务路由
router.use('/farm-tasks', farmTaskRouter);

// 巡查记录路由
router.use('/inspections', inspectionRouter);

// 问题记录路由
router.use('/problems', problemRouter);

// 人工记录路由
router.use('/labor', laborRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API 服务正常运行' });
});

export default router;
