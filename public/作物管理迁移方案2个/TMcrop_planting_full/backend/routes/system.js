/**
 * 系统级接口：清除演示数据
 */
const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.post('/clear-all', (req, res, next) => {
  try {
    const tables = [
      'daily_records', 'plantings', 'seedlings', 'seed_sources',
      'harvests', 'crop_instances', 'crop_orders', 'crop_varieties', 'pictures'
    ];
    for (const t of tables) {
      db.prepare('DELETE FROM ' + t).run();
    }
    res.json({ success: true, clearedTables: tables });
  } catch (err) { next(err); }
});

module.exports = router;
