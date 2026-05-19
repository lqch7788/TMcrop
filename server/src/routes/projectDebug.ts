/**
 * 工程调试路由 — iAGS ProjectDebug 集成
 * 挂载于 /api/debug
 * HMI版本查询、数据库测试、系统诊断工具
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 系统诊断信息 GET /api/debug/diagnostics */
router.get('/diagnostics', (req, res) => {
  try {
    const db = getDatabase();
    const memUsage = process.memoryUsage();

    // 数据库统计
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const tableCount = tables.length > 0 ? tables[0].values.length : 0;

    // 各表行数
    const tableRows: Record<string, number> = {};
    if (tables.length > 0) {
      const tableNames = tables[0].values.map(v => v[0] as string).filter(n => !n.startsWith('sqlite_'));
      for (const name of tableNames) {
        try {
          const count = db.exec(`SELECT COUNT(*) FROM "${name}"`);
          if (count.length > 0 && count[0].values.length > 0) {
            tableRows[name] = count[0].values[0][0] as number;
          }
        } catch { tableRows[name] = -1; }
      }
    }

    res.json({
      success: true, data: {
        hmi: { version: 'V1.1.0', buildDate: '2026-05-19', nodeVersion: process.version, platform: process.platform },
        database: { tableCount, tableRows, dbSize: 'SQLite (运行中)' },
        memory: { heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), unit: 'MB' },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '诊断失败' });
  }
});

/** 数据库连接测试 POST /api/debug/db-test */
router.post('/db-test', (req, res) => {
  try {
    const db = getDatabase();
    const start = Date.now();
    db.exec('SELECT 1');
    const duration = Date.now() - start;

    // 记录到调试日志
    const oid = `dl_${Date.now()}`;
    db.run(`
      INSERT INTO debug_logs (oid, debug_type, test_target, test_result, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `, [oid, 'db_connection', 'SQLite', 'SUCCESS', duration]);

    res.json({ success: true, data: { duration, status: '连接正常' } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** HMI 版本查询 GET /api/debug/hmi */
router.get('/hmi', (req, res) => {
  res.json({
    success: true, data: {
      version: 'V1.1.0',
      buildDate: '2026-05-19',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    }
  });
});

/** 获取调试日志 GET /api/debug/logs */
router.get('/logs', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM debug_logs ORDER BY created_at DESC LIMIT 100');
    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取调试日志失败' });
  }
});

/** 清空调试日志 DELETE /api/debug/logs */
router.delete('/logs', (req, res) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM debug_logs');
    res.json({ success: true, message: '调试日志已清空' });
  } catch (error) {
    res.status(500).json({ success: false, error: '清空日志失败' });
  }
});

export default router;
