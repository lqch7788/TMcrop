/**
 * 育苗 CRUD + daily-records + 自定义查询
 */
const express = require('express');
const router = express.Router();
const { db, buildCrudRoutes } = require('../database');

// 育苗基础 CRUD
const baseRouter = buildCrudRoutes('seedlings', [
  'id', 'seedling_code', 'source_id', 'source_code', 'crop_name',
  'crop_variety', 'seedling_type', 'site_id', 'site_name', 'start_date',
  'end_date', 'expected_end_date', 'initial_count', 'survival_count',
  'planted_count', 'survival_rate', 'loss_count', 'loss_rate',
  'is_finished', 'status', 'pictures', 'quality_grade', 'print_count',
  'remarks', 'create_by', 'created_at', 'updated_at'
], { searchableFields: ['seedling_code', 'crop_name', 'crop_variety', 'site_name'] });

router.use(baseRouter);

// 嵌套 daily_records CRUD
router.get('/:id/daily-records', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM daily_records WHERE seedling_id = ? ORDER BY record_date DESC').all(req.params.id);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:id/daily-records', (req, res, next) => {
  try {
    const id = require('uuid').v4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`INSERT INTO daily_records
      (id, seedling_id, record_date, temperature, humidity, watering, remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(id, req.params.id, req.body.record_date, req.body.temperature, req.body.humidity,
      req.body.watering ? 1 : 0, req.body.remarks, now, now);
    const row = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.put('/:id/daily-records/:recordId', (req, res, next) => {
  try {
    const updates = {};
    for (const col of ['record_date', 'temperature', 'humidity', 'watering', 'remarks']) {
      if (req.body[col] !== undefined) updates[col] = req.body[col];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields' });
    updates.updated_at = new Date().toISOString();
    const setClause = Object.keys(updates).map(k => k + ' = ?').join(', ');
    const stmt = db.prepare('UPDATE daily_records SET ' + setClause + ' WHERE id = ? AND seedling_id = ?');
    const result = stmt.run(...Object.values(updates), req.params.recordId, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not Found' });
    const row = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(req.params.recordId);
    res.json(row);
  } catch (err) { next(err); }
});

router.delete('/:id/daily-records/:recordId', (req, res, next) => {
  try {
    const stmt = db.prepare('DELETE FROM daily_records WHERE id = ? AND seedling_id = ?');
    const result = stmt.run(req.params.recordId, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not Found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 自定义：增加已定植数量
router.put('/:id/plant', (req, res, next) => {
  try {
    const { count } = req.body;
    const row = db.prepare('SELECT survival_count, planted_count, status FROM seedlings WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    const newPlanted = row.planted_count + count;
    let newStatus = row.status;
    if (newPlanted >= row.survival_count) newStatus = 'completed';
    else if (newPlanted > 0) newStatus = 'transplant_ready';
    const stmt = db.prepare('UPDATE seedlings SET planted_count = ?, status = ?, updated_at = ? WHERE id = ?');
    stmt.run(newPlanted, newStatus, new Date().toISOString(), req.params.id);
    res.json({ success: true, plantedCount: newPlanted, status: newStatus });
  } catch (err) { next(err); }
});

// 自定义：获取可定植列表
router.get('/transplant-ready/list', (req, res, next) => {
  try {
    const rows = db.prepare("SELECT * FROM seedlings WHERE status IN ('transplant_ready', 'in_progress') AND survival_count > planted_count").all();
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
