/**
 * 薪资预算 路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const baseRouter = buildCrudRoutes('salary_budgets', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });

router.use('/', baseRouter);

module.exports = router;
