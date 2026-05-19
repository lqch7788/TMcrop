/**
 * 水肥一体机路由 — iAGS WaterFertilizer 集成
 * 挂载于 /api/water-fertilizer
 * 灌溉时段、间隔和ABC混合比例参数配置
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 获取水肥配置列表 GET /api/water-fertilizer */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { partition_oid, status } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) { conditions.push('wf.status = ?'); params.push(status); }
    if (partition_oid) { conditions.push('wf.partition_oid = ?'); params.push(partition_oid); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = db.exec(`
      SELECT wf.*, fp.name as partition_name
      FROM water_fertilizer_configs wf
      LEFT JOIN farm_partitions fp ON wf.partition_oid = fp.oid
      ${where}
      ORDER BY wf.created_at DESC
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
    console.error('获取水肥配置失败:', error);
    res.status(500).json({ success: false, error: '获取水肥配置失败' });
  }
});

/** 创建水肥配置 POST /api/water-fertilizer */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { partition_oid, device_oid, device_code, machine_addr, mac_addr,
      start_time, end_time, interval_value, interval_unit,
      mix_ratio_a, mix_ratio_b, mix_ratio_c, description } = req.body;

    if (!partition_oid) return res.status(400).json({ success: false, error: '分区不能为空' });

    const oid = `wf_${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO water_fertilizer_configs (oid, partition_oid, device_oid, device_code, machine_addr, mac_addr,
        start_time, end_time, interval_value, interval_unit,
        mix_ratio_a, mix_ratio_b, mix_ratio_c, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [oid, partition_oid, device_oid || null, device_code || null, machine_addr || null, mac_addr || null,
      start_time || null, end_time || null, interval_value || 1, interval_unit || 'day',
      mix_ratio_a || 0, mix_ratio_b || 0, mix_ratio_c || 0, description || null, now, now]);

    const result = db.exec('SELECT * FROM water_fertilizer_configs WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('创建水肥配置失败:', error);
    res.status(500).json({ success: false, error: '创建水肥配置失败' });
  }
});

/** 更新水肥配置 PUT /api/water-fertilizer/:oid */
router.put('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const { partition_oid, device_oid, device_code, machine_addr, mac_addr,
      start_time, end_time, interval_value, interval_unit,
      mix_ratio_a, mix_ratio_b, mix_ratio_c, description, status } = req.body;
    const now = new Date().toISOString();

    db.run(`
      UPDATE water_fertilizer_configs SET partition_oid=?, device_oid=?, device_code=?, machine_addr=?, mac_addr=?,
        start_time=?, end_time=?, interval_value=?, interval_unit=?,
        mix_ratio_a=?, mix_ratio_b=?, mix_ratio_c=?, description=?, status=?, updated_at=?
      WHERE oid=?
    `, [partition_oid, device_oid || null, device_code || null, machine_addr || null, mac_addr || null,
      start_time || null, end_time || null, interval_value || 1, interval_unit || 'day',
      mix_ratio_a || 0, mix_ratio_b || 0, mix_ratio_c || 0, description || null, status || 'active', now, req.params.oid]);

    const result = db.exec('SELECT * FROM water_fertilizer_configs WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新水肥配置失败:', error);
    res.status(500).json({ success: false, error: '更新水肥配置失败' });
  }
});

/** 删除水肥配置 DELETE /api/water-fertilizer/:oid */
router.delete('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM water_fertilizer_configs WHERE oid = ?', [req.params.oid]);
    res.json({ success: true, message: '配置已删除' });
  } catch (error) {
    console.error('删除水肥配置失败:', error);
    res.status(500).json({ success: false, error: '删除水肥配置失败' });
  }
});

/** 参数下发模拟 POST /api/water-fertilizer/:oid/dispatch */
router.post('/:oid/dispatch', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM water_fertilizer_configs WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }
    // 模拟下发延迟
    setTimeout(() => {
      res.json({ success: true, message: '参数已成功下发到设备' });
    }, 2000);
  } catch (error) {
    res.status(500).json({ success: false, error: '参数下发失败' });
  }
});

export default router;
