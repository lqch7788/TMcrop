/**
 * productionPlan 路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const productionPlansRouter = buildCrudRoutes('production_plans', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/productionPlans', productionPlansRouter);
const dailyPlansRouter = buildCrudRoutes('daily_plans', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/dailyPlans', dailyPlansRouter);
const monthlyPlansRouter = buildCrudRoutes('monthly_plans', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/monthlyPlans', monthlyPlansRouter);

module.exports = router;
