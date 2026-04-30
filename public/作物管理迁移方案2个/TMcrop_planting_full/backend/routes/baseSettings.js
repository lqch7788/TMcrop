/**
 * 基地总览路由
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const companyGroupRouter = buildCrudRoutes('company_groups', [
  'id', 'name', 'create_by', 'created_at', 'updated_at'
], { searchableFields: ['name'] });

const baseRouter = buildCrudRoutes('bases', [
  'id', 'name', 'area', 'unit', 'crop', 'growth_day', 'status', 'status_text',
  'manager', 'phone', 'soil_type', 'ph', 'coords', 'city', 'province',
  'lng', 'lat', 'intro', 'greenhouse_count', 'field_area', 'company_id',
  'company_name', 'created_at', 'updated_at'
], { searchableFields: ['name', 'crop', 'manager', 'city'] });

router.use('/company-groups', companyGroupRouter);
router.use('/bases', baseRouter);

module.exports = router;
