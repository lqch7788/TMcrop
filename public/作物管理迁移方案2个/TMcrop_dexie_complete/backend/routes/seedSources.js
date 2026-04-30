/**
 * 种源 CRUD + 自定义查询
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const baseRouter = buildCrudRoutes('seed_sources', [
  'id', 'seed_code', 'source_type', 'source_origin', 'crop_category',
  'type_name', 'variety_name', 'crop_name', 'crop_variety', 'crop_code',
  'supplier_id', 'supplier_name', 'purchase_date', 'quantity', 'unit',
  'unit_price', 'total_amount', 'initial_count', 'available_count',
  'pictures', 'remarks', 'status', 'print_count', 'create_by',
  'created_at', 'updated_at'
], { searchableFields: ['seed_code', 'crop_name', 'variety_name', 'supplier_name', 'remarks'] });

router.use(baseRouter);

// 自定义：扣减可用数量
router.put('/:id/decrease', (req, res, next) => {
  try {
    const { count } = req.body;
    const id = req.params.id;
    const row = db.prepare('SELECT available_count, initial_count, status FROM seed_sources WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    const newAvailable = row.available_count - count;
    if (newAvailable < 0) return res.status(400).json({ error: 'Insufficient stock' });
    let newStatus = row.status;
    if (newAvailable === 0) newStatus = 'depleted';
    else if (newAvailable < row.initial_count * 0.2) newStatus = 'low';
    const stmt = db.prepare('UPDATE seed_sources SET available_count = ?, status = ?, updated_at = ? WHERE id = ?');
    stmt.run(newAvailable, newStatus, new Date().toISOString(), id);
    res.json({ success: true, availableCount: newAvailable, status: newStatus });
  } catch (err) { next(err); }
});

// 自定义：获取当天最大种源批号流水号
router.get('/seed-code/max-serial', (req, res, next) => {
  try {
    const { dateStr } = req.query;
    if (!dateStr) return res.status(400).json({ error: 'dateStr required' });
    const pattern = 'ZZ' + dateStr + '-%';
    const rows = db.prepare("SELECT seed_code FROM seed_sources WHERE seed_code LIKE ?").all(pattern);
    let maxSerial = 0;
    for (const row of rows) {
      const parts = row.seed_code.split('-');
      if (parts.length === 2) {
        const serial = parseInt(parts[1], 10);
        if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
      }
    }
    res.json({ maxSerial });
  } catch (err) { next(err); }
});

module.exports = router;
