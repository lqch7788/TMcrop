/**
 * organization 路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const departmentsRouter = buildCrudRoutes('departments', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/departments', departmentsRouter);
const positionsRouter = buildCrudRoutes('positions', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/positions', positionsRouter);
const staffRouter = buildCrudRoutes('staff', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/staff', staffRouter);

module.exports = router;
