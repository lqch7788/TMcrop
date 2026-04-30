/**
 * 采收 CRUD
 */
const express = require('express');
const { db, buildCrudRoutes } = require('../database');

module.exports = buildCrudRoutes('harvests', [
  'id', 'harvest_code', 'batch_id', 'batch_code', 'crop_name',
  'greenhouse_id', 'greenhouse_name', 'harvest_date', 'harvest_area',
  'harvest_quantity', 'unit', 'quality', 'grade', 'harvester_ids',
  'harvester_names', 'warehouse_id', 'warehouse_name', 'status',
  'auditor', 'variety', 'planting_mode', 'target_yield',
  'related_task_id', 'related_task_code', 'pictures', 'remarks',
  'created_at', 'updated_at'
], { searchableFields: ['harvest_code', 'crop_name', 'batch_code', 'greenhouse_name'] });
