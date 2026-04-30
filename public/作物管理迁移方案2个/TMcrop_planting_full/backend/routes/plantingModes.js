/**
 * plantingConfig 路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const plantingModesRouter = buildCrudRoutes('planting_modes', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/plantingModes', plantingModesRouter);
const plantAreasRouter = buildCrudRoutes('plant_areas', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/plantAreas', plantAreasRouter);
const blocksRouter = buildCrudRoutes('blocks', [
  'id', 'data_json', 'created_at', 'updated_at'
], { searchableFields: [] });
router.use('/blocks', blocksRouter);

module.exports = router;
