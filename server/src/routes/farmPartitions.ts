/**
 * 分区管理路由 — iAGS GreenHouseArea 集成
 * 挂载于 /api/farm-partitions
 * 支持树形分区结构：分区/大棚层级管理
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 获取分区列表（支持树形查询） GET /api/farm-partitions */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { parent_oid, area_type, status, keyword } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (parent_oid !== undefined) {
      conditions.push(parent_oid === '' || parent_oid === 'null' ? 'fp.parent_oid IS NULL' : 'fp.parent_oid = ?');
      if (parent_oid !== '' && parent_oid !== 'null') params.push(parent_oid);
    }
    if (area_type) { conditions.push('fp.area_type = ?'); params.push(area_type); }
    if (status) { conditions.push('fp.status = ?'); params.push(status); }
    if (keyword) { conditions.push('(fp.name LIKE ? OR fp.description LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = db.exec(`
      SELECT fp.*
      FROM farm_partitions fp
      ${where}
      ORDER BY fp.sort_order ASC, fp.name ASC
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
    console.error('获取分区列表失败:', error);
    res.status(500).json({ success: false, error: '获取分区列表失败' });
  }
});

/** 获取单个分区 GET /api/farm-partitions/:oid */
router.get('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM farm_partitions WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '分区不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取分区详情失败:', error);
    res.status(500).json({ success: false, error: '获取分区详情失败' });
  }
});

/** 获取分区树 GET /api/farm-partitions/tree/all */
router.get('/tree/all', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM farm_partitions ORDER BY sort_order ASC, name ASC');
    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const all = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    // 构建树形结构
    const buildTree = (parentOid: string | null): any[] => {
      return all
        .filter(p => (parentOid === null ? !p.parent_oid : p.parent_oid === parentOid))
        .map(p => ({ ...p, children: buildTree(p.oid) }));
    };
    const tree = buildTree(null);
    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('获取分区树失败:', error);
    res.status(500).json({ success: false, error: '获取分区树失败' });
  }
});

/** 创建分区 POST /api/farm-partitions */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { parent_oid, name, area_type, greenhouse_type, area, area_unit, manager_oid, manager_name, hmi_device_oid, sensor_config, camera_config, water_fertilizer_config, address, description, sort_order, status } = req.body;

    if (!name) return res.status(400).json({ success: false, error: '分区名称不能为空' });

    const oid = `fp_${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO farm_partitions (oid, parent_oid, name, area_type, greenhouse_type, area, area_unit, manager_oid, manager_name, hmi_device_oid, sensor_config, camera_config, water_fertilizer_config, address, description, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      oid, parent_oid || null, name, area_type || 'greenhouse', greenhouse_type || null,
      area || 0, area_unit || '亩', manager_oid || null, manager_name || null,
      hmi_device_oid || null, sensor_config ? JSON.stringify(sensor_config) : null,
      camera_config ? JSON.stringify(camera_config) : null,
      water_fertilizer_config ? JSON.stringify(water_fertilizer_config) : null,
      address || null, description || null, sort_order || 0, status || 'active', now, now
    ]);

    // 返回完整记录
    const result = db.exec('SELECT * FROM farm_partitions WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('创建分区失败:', error);
    res.status(500).json({ success: false, error: '创建分区失败' });
  }
});

/** 更新分区 PUT /api/farm-partitions/:oid */
router.put('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const { parent_oid, name, area_type, greenhouse_type, area, area_unit, manager_oid, manager_name, hmi_device_oid, sensor_config, camera_config, water_fertilizer_config, address, description, sort_order, status } = req.body;
    const now = new Date().toISOString();

    db.run(`
      UPDATE farm_partitions SET parent_oid=?, name=?, area_type=?, greenhouse_type=?, area=?, area_unit=?, manager_oid=?, manager_name=?, hmi_device_oid=?, sensor_config=?, camera_config=?, water_fertilizer_config=?, address=?, description=?, sort_order=?, status=?, updated_at=?
      WHERE oid=?
    `, [
      parent_oid || null, name, area_type || 'greenhouse', greenhouse_type || null,
      area ?? 0, area_unit || '亩', manager_oid || null, manager_name || null,
      hmi_device_oid || null, sensor_config ? JSON.stringify(sensor_config) : null,
      camera_config ? JSON.stringify(camera_config) : null,
      water_fertilizer_config ? JSON.stringify(water_fertilizer_config) : null,
      address || null, description || null, sort_order ?? 0, status || 'active', now,
      req.params.oid
    ]);

    const result = db.exec('SELECT * FROM farm_partitions WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '分区不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新分区失败:', error);
    res.status(500).json({ success: false, error: '更新分区失败' });
  }
});

/** 删除分区（软删除） DELETE /api/farm-partitions/:oid */
router.delete('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    // 级联软删除子分区
    const now = new Date().toISOString();
    const cascadeDelete = (oid: string) => {
      db.run("UPDATE farm_partitions SET status = 'inactive', updated_at = ? WHERE oid = ?", [now, oid]);
      const children = db.exec('SELECT oid FROM farm_partitions WHERE parent_oid = ?', [oid]);
      if (children.length > 0 && children[0].values.length > 0) {
        children[0].values.forEach(row => cascadeDelete(row[0] as string));
      }
    };
    cascadeDelete(req.params.oid);
    res.json({ success: true, message: '分区已删除' });
  } catch (error) {
    console.error('删除分区失败:', error);
    res.status(500).json({ success: false, error: '删除分区失败' });
  }
});

export default router;
