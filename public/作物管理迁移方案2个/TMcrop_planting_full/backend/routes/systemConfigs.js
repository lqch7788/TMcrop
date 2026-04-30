/**
 * systemConfig 路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const systemConfigsRouter = buildCrudRoutes('system_configs', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/systemConfigs', systemConfigsRouter);
const dictionariesRouter = buildCrudRoutes('dictionaries', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/dictionaries', dictionariesRouter);

module.exports = router;
