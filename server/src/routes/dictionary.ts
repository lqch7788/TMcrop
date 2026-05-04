/**
 * 数据字典与系统配置 API 路由
 * V5.0 系统设置重构
 * 创建日期：2026-05-02
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

// ============================================
// 数据字典管理
// ============================================

/**
 * 获取字典列表（按分类）
 */
router.get('/dictionaries', (req, res) => {
  const db = getDatabase();
  const { category } = req.query;

  let sql = 'SELECT * FROM dictionaries WHERE status = ?';
  const bindings: string[] = ['active'];

  if (category) {
    sql += ' AND category_code = ?';
    bindings.push(category as string);
  }

  sql += ' ORDER BY category_code, sort_order ASC';

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取字典列表失败:', error);
    res.status(500).json({ error: '获取字典列表失败' });
  }
});

/**
 * 获取字典分类列表
 */
router.get('/dictionaries/categories', (req, res) => {
  const db = getDatabase();

  const sql = 'SELECT DISTINCT category_code FROM dictionaries WHERE status = ? ORDER BY category_code';

  try {
    const stmt = db.prepare(sql);
    stmt.bind(['active']);
    const results: string[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { category_code: string };
      results.push(row.category_code);
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取字典分类失败:', error);
    res.status(500).json({ error: '获取字典分类失败' });
  }
});

/**
 * 保存字典（新增或更新）
 */
router.post('/dictionaries', (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    // 处理新增
    if (inserted && inserted.length > 0) {
      for (const dict of inserted) {
        const id = dict.id || `DICT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.run(
          `INSERT INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, sort_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            dict.category_code,
            dict.dict_code,
            dict.dict_label,
            dict.dict_value || dict.dict_label,
            dict.sort_order || 0,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ id, ...dict });
      }
    }

    // 处理更新
    if (updated && updated.length > 0) {
      for (const dict of updated) {
        console.log('[Dictionary] Updating dict:', JSON.stringify(dict));
        try {
          db.run(
            `UPDATE dictionaries SET category_code = ?, dict_code = ?, dict_label = ?, dict_value = ?, sort_order = ?, updated_at = ?
             WHERE id = ?`,
            [
              dict.category_code,
              dict.dict_code,
              dict.dict_label,
              dict.dict_value || dict.dict_label,
              dict.sort_order || 0,
              now,
              dict.id
            ]
          );
          results.updated.push(dict);
        } catch (updateError) {
          console.error('[Dictionary] Update error:', updateError);
          throw updateError;
        }
      }
    }

    // 处理删除
    if (deleted && deleted.length > 0) {
      for (const id of deleted) {
        db.run('UPDATE dictionaries SET status = ? WHERE id = ?', ['inactive', id]);
        results.deleted.push(id);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存字典失败:', error);
    res.status(500).json({ error: '保存字典失败' });
  }
});

// ============================================
// 系统配置管理
// ============================================

/**
 * 获取系统配置列表
 */
router.get('/system-configs', (req, res) => {
  const db = getDatabase();
  const { configKey } = req.query;

  let sql = 'SELECT * FROM system_configs WHERE status = ?';
  const bindings: string[] = ['active'];

  if (configKey) {
    sql += ' AND config_key = ?';
    bindings.push(configKey as string);
  }

  sql += ' ORDER BY config_key ASC';

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ error: '获取系统配置失败' });
  }
});

/**
 * 保存系统配置（新增或更新）
 */
router.post('/system-configs', (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    // 处理新增
    if (inserted && inserted.length > 0) {
      for (const config of inserted) {
        const id = config.id || `CFG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.run(
          `INSERT INTO system_configs (id, config_key, config_value, config_type, description, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            config.configKey,
            config.configValue || '',
            config.configType || 'string',
            config.description || null,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ id, ...config });
      }
    }

    // 处理更新
    if (updated && updated.length > 0) {
      for (const config of updated) {
        db.run(
          `UPDATE system_configs SET config_key = ?, config_value = ?, config_type = ?, description = ?, updated_at = ?
           WHERE id = ?`,
          [
            config.configKey,
            config.configValue || '',
            config.configType || 'string',
            config.description || null,
            now,
            config.id
          ]
        );
        results.updated.push(config);
      }
    }

    // 处理删除
    if (deleted && deleted.length > 0) {
      for (const id of deleted) {
        db.run('UPDATE system_configs SET status = ? WHERE id = ?', ['inactive', id]);
        results.deleted.push(id);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存系统配置失败:', error);
    res.status(500).json({ error: '保存系统配置失败' });
  }
});

// ============================================
// 仓库管理
// ============================================

/**
 * 获取仓库列表
 */
router.get('/warehouses', (req, res) => {
  const db = getDatabase();
  const { status } = req.query;

  let sql = 'SELECT * FROM warehouses WHERE 1=1';
  const bindings: string[] = [];

  if (status) {
    sql += ' AND status = ?';
    bindings.push(status as string);
  } else {
    sql += ' AND status = ?';
    bindings.push('active');
  }

  sql += ' ORDER BY warehouse_code ASC';

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取仓库列表失败:', error);
    res.status(500).json({ error: '获取仓库列表失败' });
  }
});

/**
 * 保存仓库（新增或更新）
 */
router.post('/warehouses', (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    // 处理新增
    if (inserted && inserted.length > 0) {
      for (const warehouse of inserted) {
        const oid = warehouse.oid || `WH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const id = warehouse.id || `WH_ID_${Date.now()}`;
        db.run(
          `INSERT INTO warehouses (id, oid, warehouse_code, warehouse_name, warehouse_type, location, capacity, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            warehouse.warehouseCode,
            warehouse.warehouseName,
            warehouse.warehouseType || null,
            warehouse.location || null,
            warehouse.capacity || null,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ id, oid, ...warehouse });
      }
    }

    // 处理更新
    if (updated && updated.length > 0) {
      for (const warehouse of updated) {
        db.run(
          `UPDATE warehouses SET warehouse_code = ?, warehouse_name = ?, warehouse_type = ?,
           location = ?, capacity = ?, updated_at = ?
           WHERE oid = ?`,
          [
            warehouse.warehouseCode,
            warehouse.warehouseName,
            warehouse.warehouseType || null,
            warehouse.location || null,
            warehouse.capacity || null,
            now,
            warehouse.oid
          ]
        );
        results.updated.push(warehouse);
      }
    }

    // 处理删除
    if (deleted && deleted.length > 0) {
      for (const oid of deleted) {
        db.run('UPDATE warehouses SET status = ? WHERE oid = ?', ['inactive', oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存仓库失败:', error);
    res.status(500).json({ error: '保存仓库失败' });
  }
});

// ============================================
// 基地管理
// ============================================

/**
 * 获取基地列表
 */
router.get('/bases', (req, res) => {
  const db = getDatabase();
  const { status, orgOid } = req.query;

  let sql = 'SELECT * FROM bases WHERE 1=1';
  const bindings: string[] = [];

  if (status) {
    sql += ' AND status = ?';
    bindings.push(status as string);
  } else {
    sql += ' AND status = ?';
    bindings.push('active');
  }

  if (orgOid) {
    sql += ' AND org_oid = ?';
    bindings.push(orgOid as string);
  }

  sql += ' ORDER BY base_code ASC';

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取基地列表失败:', error);
    res.status(500).json({ error: '获取基地列表失败' });
  }
});

/**
 * 保存基地（新增或更新）
 */
router.post('/bases', (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    // 处理新增
    if (inserted && inserted.length > 0) {
      for (const base of inserted) {
        const oid = base.oid || `BASE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const id = base.id || `BASE_ID_${Date.now()}`;
        db.run(
          `INSERT INTO bases (id, oid, base_code, base_name, org_oid, location, area, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            base.baseCode,
            base.baseName,
            base.orgOid || null,
            base.location || null,
            base.area || null,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ id, oid, ...base });
      }
    }

    // 处理更新
    if (updated && updated.length > 0) {
      for (const base of updated) {
        db.run(
          `UPDATE bases SET base_code = ?, base_name = ?, org_oid = ?, location = ?, area = ?, updated_at = ?
           WHERE oid = ?`,
          [
            base.baseCode,
            base.baseName,
            base.orgOid || null,
            base.location || null,
            base.area || null,
            now,
            base.oid
          ]
        );
        results.updated.push(base);
      }
    }

    // 处理删除
    if (deleted && deleted.length > 0) {
      for (const oid of deleted) {
        db.run('UPDATE bases SET status = ? WHERE oid = ?', ['inactive', oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存基地失败:', error);
    res.status(500).json({ error: '保存基地失败' });
  }
});

// ============================================
// 温室管理
// ============================================

/**
 * 获取温室列表
 */
router.get('/greenhouses', (req, res) => {
  const db = getDatabase();
  const { status, baseOid } = req.query;

  let sql = 'SELECT * FROM greenhouses WHERE 1=1';
  const bindings: string[] = [];

  if (status) {
    sql += ' AND status = ?';
    bindings.push(status as string);
  } else {
    sql += ' AND status = ?';
    bindings.push('active');
  }

  if (baseOid) {
    sql += ' AND base_oid = ?';
    bindings.push(baseOid as string);
  }

  sql += ' ORDER BY greenhouse_code ASC';

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取温室列表失败:', error);
    res.status(500).json({ error: '获取温室列表失败' });
  }
});

/**
 * 保存温室（新增或更新）
 */
router.post('/greenhouses', (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    // 处理新增
    if (inserted && inserted.length > 0) {
      for (const greenhouse of inserted) {
        const oid = greenhouse.oid || `GH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const id = greenhouse.id || `GH_ID_${Date.now()}`;
        db.run(
          `INSERT INTO greenhouses (id, oid, greenhouse_code, greenhouse_name, base_oid, greenhouse_type, area, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            greenhouse.greenhouseCode,
            greenhouse.greenhouseName,
            greenhouse.baseOid,
            greenhouse.greenhouseType || null,
            greenhouse.area || null,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ id, oid, ...greenhouse });
      }
    }

    // 处理更新
    if (updated && updated.length > 0) {
      for (const greenhouse of updated) {
        db.run(
          `UPDATE greenhouses SET greenhouse_code = ?, greenhouse_name = ?, base_oid = ?,
           greenhouse_type = ?, area = ?, updated_at = ?
           WHERE oid = ?`,
          [
            greenhouse.greenhouseCode,
            greenhouse.greenhouseName,
            greenhouse.baseOid,
            greenhouse.greenhouseType || null,
            greenhouse.area || null,
            now,
            greenhouse.oid
          ]
        );
        results.updated.push(greenhouse);
      }
    }

    // 处理删除
    if (deleted && deleted.length > 0) {
      for (const oid of deleted) {
        db.run('UPDATE greenhouses SET status = ? WHERE oid = ?', ['inactive', oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存温室失败:', error);
    res.status(500).json({ error: '保存温室失败' });
  }
});

export default router;
