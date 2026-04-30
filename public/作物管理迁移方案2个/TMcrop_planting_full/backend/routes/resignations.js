/**
 * 离职记录 路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const baseRouter = buildCrudRoutes('resignations', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });

router.use('/', baseRouter);

module.exports = router;
