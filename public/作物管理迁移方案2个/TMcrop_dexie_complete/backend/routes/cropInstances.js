/**
 * 作物实例 CRUD
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

const baseRouter = buildCrudRoutes('crop_instances', [
  'id', 'instance_code', 'order_id', 'order_code', 'crop_category',
  'crop_name', 'crop_variety', 'category_code', 'type_code', 'sub_code',
  'source_origin', 'source_description', 'initial_quantity', 'current_quantity',
  'planted_quantity', 'harvested_quantity', 'status', 'seed_entry_date',
  'seedling_start_date', 'planting_date', 'harvest_date', 'source_instance_id',
  'create_by', 'created_at', 'updated_at'
], { searchableFields: ['instance_code', 'crop_name', 'crop_variety'] });

router.use(baseRouter);

// 自定义：数量更新（seedling / plant / harvest）
router.put('/:id/quantity', (req, res, next) => {
  try {
    const { type, quantity } = req.body;
    const id = req.params.id;
    const row = db.prepare('SELECT * FROM crop_instances WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    const now = new Date().toISOString();
    let updates = {};
    if (type === 'seedling') {
      updates = { seedling_start_date: row.seedling_start_date || now, status: 'seedling' };
    } else if (type === 'plant') {
      const newPlanted = row.planted_quantity + quantity;
      const newCurrent = Math.max(0, row.current_quantity - quantity);
      updates = { planted_quantity: newPlanted, current_quantity: newCurrent, planting_date: row.planting_date || now, status: newCurrent <= 0 ? 'planted' : 'growing' };
    } else if (type === 'harvest') {
      const newHarvested = row.harvested_quantity + quantity;
      const newCurrent = Math.max(0, row.current_quantity - quantity);
      updates = { harvested_quantity: newHarvested, current_quantity: newCurrent, harvest_date: row.harvest_date || now, status: newCurrent <= 0 ? 'harvested' : 'growing' };
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    updates.updated_at = now;
    const setClause = Object.keys(updates).map(k => k + ' = ?').join(', ');
    const stmt = db.prepare('UPDATE crop_instances SET ' + setClause + ' WHERE id = ?');
    stmt.run(...Object.values(updates), id);
    const updated = db.prepare('SELECT * FROM crop_instances WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) { next(err); }
});

// 自定义：状态更新
router.put('/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    const stmt = db.prepare('UPDATE crop_instances SET status = ?, updated_at = ? WHERE id = ?');
    stmt.run(status, new Date().toISOString(), req.params.id);
    const row = db.prepare('SELECT * FROM crop_instances WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    res.json(row);
  } catch (err) { next(err); }
});

// 自定义：溯源链
router.get('/:id/trace-chain', (req, res, next) => {
  try {
    const id = req.params.id;
    const instance = db.prepare('SELECT * FROM crop_instances WHERE id = ?').get(id);
    if (!instance) return res.status(404).json({ error: 'Not Found' });
    const order = instance.order_id ? db.prepare('SELECT * FROM crop_orders WHERE id = ?').get(instance.order_id) : null;
    const seedSource = instance.source_origin === 'internal_seed' ? db.prepare('SELECT * FROM seed_sources WHERE id = ?').get(id) : null;
    const seedlings = db.prepare('SELECT * FROM seedlings WHERE source_id = ?').all(id);
    const plantings = db.prepare('SELECT * FROM plantings WHERE source_id = ?').all(id);
    res.json({ instance, order, seedSource, seedlings, plantings, harvests: null });
  } catch (err) { next(err); }
});

module.exports = router;
