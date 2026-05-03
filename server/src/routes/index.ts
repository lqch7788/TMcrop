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
import basicDataRouter from './basicData';
import dictionaryRouter from './dictionary';
import authorityRouter from './authority';
import notificationRouter from './notification';

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

// 基础数据路由（部门/仓库/温室/职位/区域/地块/编码规则/通知渠道/通知规则等）
router.use('/basic-data', basicDataRouter);

// 数据字典路由
router.use('/dictionary', dictionaryRouter);

// 组织与权限路由
router.use('/authority', authorityRouter);

// 通知设置路由
router.use('/notifications', notificationRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API 服务正常运行' });
});

export default router;
