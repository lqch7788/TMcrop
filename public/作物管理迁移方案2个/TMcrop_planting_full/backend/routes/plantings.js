/**
 * 种植 CRUD + 自定义查询
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const baseRouter = buildCrudRoutes('plantings', [
  'id', 'plant_code', 'source_type', 'source_id', 'source_code',
  'crop_name', 'crop_variety', 'area_id', 'area_name', 'root_name',
  'planting_count', 'planting_date', 'soil_ph', 'soil_ec',
  'transplant_count', 'transplant_date', 'is_harvest', 'harvest_date',
  'attrition_rate', 'print_count', 'traceability_code', 'pictures',
  'status', 'remarks', 'create_by', 'created_at', 'updated_at'
], { searchableFields: ['plant_code', 'crop_name', 'crop_variety', 'area_name'] });

router.use(baseRouter);

// 自定义：采收登记
router.put('/:id/harvest', (req, res, next) => {
  try {
    const { harvest_date, harvest_count } = req.body;
    const row = db.prepare('SELECT planting_count FROM plantings WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    let attritionRate = row.attrition_rate;
    if (harvest_count !== undefined) {
      attritionRate = Math.round((1 - harvest_count / row.planting_count) * 100);
    }
    const stmt = db.prepare(`UPDATE plantings SET is_harvest = 1, harvest_date = ?, status = 'harvested', attrition_rate = ?, updated_at = ? WHERE id = ?`);
    stmt.run(harvest_date, attritionRate, new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 自定义：未采收列表
router.get('/status/unharvested', (req, res, next) => {
  try {
    const rows = db.prepare("SELECT * FROM plantings WHERE is_harvest = 0 ORDER BY planting_date DESC").all();
    res.json(rows);
  } catch (err) { next(err); }
});

// 自定义：已采收列表
router.get('/status/harvested', (req, res, next) => {
  try {
    const rows = db.prepare("SELECT * FROM plantings WHERE is_harvest = 1 ORDER BY harvest_date DESC").all();
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
