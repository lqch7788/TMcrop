/**
 * material 路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const materialsRouter = buildCrudRoutes('materials', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/materials', materialsRouter);
const materialReceivingRecordsRouter = buildCrudRoutes('material_receiving_records', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/materialReceivingRecords', materialReceivingRecordsRouter);
const materialUsagesRouter = buildCrudRoutes('material_usages', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/materialUsages', materialUsagesRouter);
const materialReturnsRouter = buildCrudRoutes('material_returns', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/materialReturns', materialReturnsRouter);

module.exports = router;
