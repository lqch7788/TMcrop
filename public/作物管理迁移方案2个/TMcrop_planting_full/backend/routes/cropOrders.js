/**
 * 作物订单 CRUD
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const baseRouter = buildCrudRoutes('crop_orders', [
  'id', 'order_code', 'customer_name', 'customer_contact', 'order_date',
  'delivery_date', 'quantity', 'unit', 'price', 'total_amount', 'status',
  'instance_ids', 'remarks', 'create_by', 'created_at', 'updated_at'
], { searchableFields: ['order_code', 'customer_name', 'customer_contact'] });

router.use(baseRouter);

// 自定义：关联实例
router.put('/:id/link-instances', (req, res, next) => {
  try {
    const { instanceIds } = req.body;
    const row = db.prepare('SELECT instance_ids FROM crop_orders WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    let existing = [];
    try { existing = JSON.parse(row.instance_ids || '[]'); } catch { existing = []; }
    const merged = [...new Set([...existing, ...instanceIds])];
    const stmt = db.prepare('UPDATE crop_orders SET instance_ids = ?, updated_at = ? WHERE id = ?');
    stmt.run(JSON.stringify(merged), new Date().toISOString(), req.params.id);
    res.json({ success: true, instanceIds: merged });
  } catch (err) { next(err); }
});

// 自定义：取消关联实例
router.put('/:id/unlink-instances', (req, res, next) => {
  try {
    const { instanceIds } = req.body;
    const row = db.prepare('SELECT instance_ids FROM crop_orders WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    let existing = [];
    try { existing = JSON.parse(row.instance_ids || '[]'); } catch { existing = []; }
    const filtered = existing.filter(id => !instanceIds.includes(id));
    const stmt = db.prepare('UPDATE crop_orders SET instance_ids = ?, updated_at = ? WHERE id = ?');
    stmt.run(JSON.stringify(filtered), new Date().toISOString(), req.params.id);
    res.json({ success: true, instanceIds: filtered });
  } catch (err) { next(err); }
});

// 自定义：状态更新
router.put('/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    const stmt = db.prepare('UPDATE crop_orders SET status = ?, updated_at = ? WHERE id = ?');
    stmt.run(status, new Date().toISOString(), req.params.id);
    const row = db.prepare('SELECT * FROM crop_orders WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    res.json(row);
  } catch (err) { next(err); }
});

module.exports = router;
