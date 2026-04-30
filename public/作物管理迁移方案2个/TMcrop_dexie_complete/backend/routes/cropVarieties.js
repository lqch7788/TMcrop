/**
 * 品种库 CRUD + 级联查询
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const baseRouter = buildCrudRoutes('crop_varieties', [
  'id', 'crop_code', 'category_code', 'category_name', 'type_code', 'type_name',
  'variety_code', 'variety_name', 'sub_variety1_code', 'sub_variety1_name',
  'sub_variety2_code', 'sub_variety2_name', 'detail_variety_code',
  'alias', 'growth_cycle', 'target_yield', 'yield_unit', 'status',
  'remarks', 'created_at', 'updated_at'
], { searchableFields: ['crop_code', 'variety_name', 'sub_variety1_name'] });

router.use(baseRouter);

// 按类别筛选
router.get('/filter/category/:code', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM crop_varieties WHERE category_code = ?').all(req.params.code);
    res.json(rows);
  } catch (err) { next(err); }
});

// 按编码查询
router.get('/by-code/:code', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM crop_varieties WHERE crop_code = ?').get(req.params.code);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    res.json(row);
  } catch (err) { next(err); }
});

// 生成新编码时的最大 detailVarietyCode
router.get('/max-detail-code', (req, res, next) => {
  try {
    const { categoryCode, typeCode, varietyCode, subVariety1Code } = req.query;
    const rows = db.prepare(`SELECT detail_variety_code FROM crop_varieties
      WHERE category_code = ? AND type_code = ? AND variety_code = ? AND sub_variety1_code = ?`).all(categoryCode, typeCode, varietyCode, subVariety1Code || '');
    let max = 0;
    for (const r of rows) {
      const code = parseInt(r.detail_variety_code || '0', 10);
      if (!isNaN(code) && code > max) max = code;
    }
    res.json({ maxCode: max, nextCode: String(max + 1).padStart(2, '0') });
  } catch (err) { next(err); }
});

// 统计信息
router.get('/stats/overview', (req, res, next) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as c FROM crop_varieties').get().c;
    const active = db.prepare("SELECT COUNT(*) as c FROM crop_varieties WHERE status = 'active'").get().c;
    const inactive = db.prepare("SELECT COUNT(*) as c FROM crop_varieties WHERE status = 'inactive'").get().c;
    const byCategory = db.prepare('SELECT category_name, COUNT(*) as c FROM crop_varieties GROUP BY category_name').all();
    const byCategoryMap = {};
    for (const r of byCategory) byCategoryMap[r.category_name] = r.c;
    res.json({ total, active, inactive, byCategory: byCategoryMap });
  } catch (err) { next(err); }
});

module.exports = router;
