/**
 * 区域系统路由 — iAGS AreaSystem 集成
 * 挂载于 /api/area-systems
 * 管理分区与设备系统的关联映射
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 获取区域系统映射列表 GET /api/area-systems */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { partition_oid, system_oid } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (partition_oid) { conditions.push('asm.partition_oid = ?'); params.push(partition_oid); }
    if (system_oid) { conditions.push('asm.system_oid = ?'); params.push(system_oid); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = db.exec(`
      SELECT asm.*, fp.name as partition_name, ds.system_name as system_name
      FROM area_system_mappings asm
      LEFT JOIN farm_partitions fp ON asm.partition_oid = fp.oid
      LEFT JOIN device_systems ds ON asm.system_oid = ds.oid
      ${where}
      ORDER BY asm.created_at DESC
    `, params);

    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取区域系统映射失败:', error);
    res.status(500).json({ success: false, error: '获取区域系统映射失败' });
  }
});

/** 创建区域系统映射 POST /api/area-systems */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { partition_oid, system_oid, device_oid, description } = req.body;

    if (!partition_oid || !system_oid) {
      return res.status(400).json({ success: false, error: '分区和系统不能为空' });
    }

    // 检查是否已存在
    const existing = db.exec(
      'SELECT oid FROM area_system_mappings WHERE partition_oid = ? AND system_oid = ?',
      [partition_oid, system_oid]
    );
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ success: false, error: '该分区已关联此系统' });
    }

    const oid = `asm_${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO area_system_mappings (oid, partition_oid, system_oid, device_oid, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [oid, partition_oid, system_oid, device_oid || null, description || null, now]);

    const result = db.exec('SELECT * FROM area_system_mappings WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('创建区域系统映射失败:', error);
    res.status(500).json({ success: false, error: '创建区域系统映射失败' });
  }
});

/** 更新区域系统映射 PUT /api/area-systems/:oid */
router.put('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const { partition_oid, system_oid, device_oid, description, status } = req.body;

    db.run(`
      UPDATE area_system_mappings SET partition_oid=?, system_oid=?, device_oid=?, description=?, status=?
      WHERE oid=?
    `, [partition_oid, system_oid, device_oid || null, description || null, status || 'active', req.params.oid]);

    const result = db.exec('SELECT * FROM area_system_mappings WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '映射不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新区域系统映射失败:', error);
    res.status(500).json({ success: false, error: '更新区域系统映射失败' });
  }
});

/** 删除区域系统映射 DELETE /api/area-systems/:oid */
router.delete('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM area_system_mappings WHERE oid = ?', [req.params.oid]);
    res.json({ success: true, message: '映射已删除' });
  } catch (error) {
    console.error('删除区域系统映射失败:', error);
    res.status(500).json({ success: false, error: '删除区域系统映射失败' });
  }
});

export default router;
