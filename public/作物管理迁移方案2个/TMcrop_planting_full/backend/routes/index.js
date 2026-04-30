/**
 * 路由聚合 + /stats/overview 统计接口
 */
const express = require('express');
const router = express.Router();
const { db } = require('../database');

// 各模块路由
router.use('/seed-sources', require('./seedSources'));
router.use('/seedlings', require('./seedlings'));
router.use('/plantings', require('./plantings'));
router.use('/harvests', require('./harvests'));
router.use('/crop-instances', require('./cropInstances'));
router.use('/crop-orders', require('./cropOrders'));
router.use('/crop-varieties', require('./cropVarieties'));
router.use('/pictures', require('./pictures'));
router.use('/system', require('./system'));

// 统计概览接口
router.get('/stats/overview', (req, res, next) => {
  try {
    const stats = {
      seedSources: db.prepare('SELECT COUNT(*) as c FROM seed_sources').get().c,
      seedlings: db.prepare('SELECT COUNT(*) as c FROM seedlings').get().c,
      plantings: db.prepare('SELECT COUNT(*) as c FROM plantings').get().c,
      harvests: db.prepare('SELECT COUNT(*) as c FROM harvests').get().c,
      cropInstances: db.prepare('SELECT COUNT(*) as c FROM crop_instances').get().c,
      cropOrders: db.prepare('SELECT COUNT(*) as c FROM crop_orders').get().c,
      cropVarieties: db.prepare('SELECT COUNT(*) as c FROM crop_varieties').get().c,
      pictures: db.prepare('SELECT COUNT(*) as c FROM pictures').get().c,
    };
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.use('/baseSettings', require('./baseSettings'));
router.use('/indicators', require('./indicators'));
router.use('/farmActivities', require('./farmActivities'));
router.use('/inventories', require('./inventories'));
router.use('/warehouses', require('./warehouses'));
router.use('/materials', require('./materials'));
router.use('/approvals', require('./approvals'));
router.use('/attendance', require('./attendance'));
router.use('/attendanceRepairs', require('./attendanceRepairs'));
router.use('/leave', require('./leave'));
router.use('/overtime', require('./overtime'));
router.use('/recruitment', require('./recruitment'));
router.use('/contracts', require('./contracts'));
router.use('/onboardings', require('./onboardings'));
router.use('/resignations', require('./resignations'));
router.use('/salaryAdjustments', require('./salaryAdjustments'));
router.use('/salaryBudgets', require('./salaryBudgets'));
router.use('/taskCenter', require('./taskCenter'));
router.use('/personnel', require('./personnel'));
router.use('/productionPlans', require('./productionPlans'));
router.use('/departments', require('./departments'));
router.use('/systemConfigs', require('./systemConfigs'));
router.use('/plantingModes', require('./plantingModes'));

module.exports = router;
