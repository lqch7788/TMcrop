/**
 * 任务中心 路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const baseRouter = buildCrudRoutes('task_center_records', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });

router.use('/', baseRouter);

module.exports = router;
