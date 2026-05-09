/**
 * 数据字典服务
 * 提供字典、系统配置、仓库、基地、温室等基础数据的统一访问
 */

import { getDatabase, saveDatabase } from '../db';

export interface Dictionary {
  id: string;
  category_code: string;
  dict_code: string;
  dict_label: string;
  dict_value: string;
  sort_order?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string;
  config_type: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  oid: string;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type?: string;
  location?: string;
  capacity?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Base {
  id: string;
  oid: string;
  base_code: string;
  base_name: string;
  org_oid?: string;
  location?: string;
  area?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Greenhouse {
  id: string;
  oid: string;
  greenhouse_code: string;
  greenhouse_name: string;
  base_oid?: string;
  greenhouse_type?: string;
  area?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class DictionaryService {
  // ============================================
  // 数据字典管理
  // ============================================

  async getDictionaries(params: {
    category?: string;
    status?: string;
  }): Promise<Dictionary[]> {
    const db = getDatabase();
    const { category, status = 'active' } = params;

    let sql = 'SELECT * FROM dictionaries WHERE status = ?';
    const bindings: string[] = [status];

    if (category) {
      sql += ' AND category_code = ?';
      bindings.push(category);
    }

    sql += ' ORDER BY category_code, sort_order ASC';

    const stmt = db.prepare(sql);
    stmt.bind(bindings);

    const items: Dictionary[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Dictionary);
    }
    stmt.free();
    return items;
  }

  async getDictionaryCategories(): Promise<string[]> {
    const db = getDatabase();
    const sql = 'SELECT DISTINCT category_code FROM dictionaries WHERE status = ? ORDER BY category_code';

    const stmt = db.prepare(sql);
    stmt.bind(['active']);

    const results: string[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { category_code: string };
      results.push(row.category_code);
    }
    stmt.free();
    return results;
  }

  async saveDictionaries(data: {
    inserted?: Partial<Dictionary>[];
    updated?: Partial<Dictionary>[];
    deleted?: string[];
  }): Promise<{ inserted: Dictionary[]; updated: Dictionary[]; deleted: string[] }> {
    const db = getDatabase();
    const { inserted = [], updated = [], deleted = [] } = data;
    const now = new Date().toISOString();

    const result = {
      inserted: [] as Dictionary[],
      updated: [] as Dictionary[],
      deleted: [] as string[],
    };

    // 处理新增
    for (const dict of inserted) {
      const id = dict.id || `DICT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.run(
        `INSERT INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, sort_order, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          dict.category_code || '',
          dict.dict_code || '',
          dict.dict_label || '',
          dict.dict_value || dict.dict_label || '',
          dict.sort_order || 0,
          'active',
          now,
          now,
        ]
      );
      result.inserted.push({ ...dict, id } as Dictionary);
    }

    // 处理更新
    for (const dict of updated) {
      db.run(
        `UPDATE dictionaries SET category_code = ?, dict_code = ?, dict_label = ?, dict_value = ?, sort_order = ?, updated_at = ?
         WHERE id = ?`,
        [
          dict.category_code || '',
          dict.dict_code || '',
          dict.dict_label || '',
          dict.dict_value || dict.dict_label || '',
          dict.sort_order || 0,
          now,
          dict.id || '',
        ]
      );
      result.updated.push(dict as Dictionary);
    }

    // 处理删除
    for (const id of deleted) {
      db.run('UPDATE dictionaries SET status = ? WHERE id = ?', ['inactive', id]);
      result.deleted.push(id);
    }

    saveDatabase();
    return result;
  }

  // ============================================
  // 系统配置管理
  // ============================================

  async getSystemConfigs(params: {
    configKey?: string;
    status?: string;
  }): Promise<SystemConfig[]> {
    const db = getDatabase();
    const { configKey, status = 'active' } = params;

    let sql = 'SELECT * FROM system_configs WHERE status = ?';
    const bindings: string[] = [status];

    if (configKey) {
      sql += ' AND config_key = ?';
      bindings.push(configKey);
    }

    sql += ' ORDER BY config_key ASC';

    const stmt = db.prepare(sql);
    stmt.bind(bindings);

    const items: SystemConfig[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as SystemConfig);
    }
    stmt.free();
    return items;
  }

  async saveSystemConfigs(data: {
    inserted?: Partial<SystemConfig>[];
    updated?: Partial<SystemConfig>[];
    deleted?: string[];
  }): Promise<{ inserted: SystemConfig[]; updated: SystemConfig[]; deleted: string[] }> {
    const db = getDatabase();
    const { inserted = [], updated = [], deleted = [] } = data;
    const now = new Date().toISOString();

    const result = {
      inserted: [] as SystemConfig[],
      updated: [] as SystemConfig[],
      deleted: [] as string[],
    };

    // 处理新增
    for (const config of inserted) {
      const id = config.id || `CFG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.run(
        `INSERT INTO system_configs (id, config_key, config_value, config_type, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          config.config_key || '',
          config.config_value || '',
          config.config_type || 'string',
          config.description || null,
          'active',
          now,
          now,
        ]
      );
      result.inserted.push({ ...config, id } as SystemConfig);
    }

    // 处理更新
    for (const config of updated) {
      db.run(
        `UPDATE system_configs SET config_key = ?, config_value = ?, config_type = ?, description = ?, updated_at = ?
         WHERE id = ?`,
        [
          config.config_key || '',
          config.config_value || '',
          config.config_type || 'string',
          config.description || null,
          now,
          config.id || '',
        ]
      );
      result.updated.push(config as SystemConfig);
    }

    // 处理删除
    for (const id of deleted) {
      db.run('UPDATE system_configs SET status = ? WHERE id = ?', ['inactive', id]);
      result.deleted.push(id);
    }

    saveDatabase();
    return result;
  }

  // ============================================
  // 仓库管理
  // ============================================

  async getWarehouses(params: {
    status?: string;
  }): Promise<Warehouse[]> {
    const db = getDatabase();
    const { status = 'active' } = params;

    const sql = 'SELECT * FROM warehouses WHERE status = ? ORDER BY warehouse_code ASC';

    const stmt = db.prepare(sql);
    stmt.bind([status]);

    const items: Warehouse[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Warehouse);
    }
    stmt.free();
    return items;
  }

  async saveWarehouses(data: {
    inserted?: Partial<Warehouse>[];
    updated?: Partial<Warehouse>[];
    deleted?: string[];
  }): Promise<{ inserted: Warehouse[]; updated: Warehouse[]; deleted: string[] }> {
    const db = getDatabase();
    const { inserted = [], updated = [], deleted = [] } = data;
    const now = new Date().toISOString();

    const result = {
      inserted: [] as Warehouse[],
      updated: [] as Warehouse[],
      deleted: [] as string[],
    };

    // 处理新增
    for (const warehouse of inserted) {
      const oid = warehouse.oid || `WH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const id = warehouse.id || `WH_ID_${Date.now()}`;
      db.run(
        `INSERT INTO warehouses (id, oid, warehouse_code, warehouse_name, warehouse_type, location, capacity, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          oid,
          warehouse.warehouse_code || '',
          warehouse.warehouse_name || '',
          warehouse.warehouse_type || null,
          warehouse.location || null,
          warehouse.capacity || null,
          'active',
          now,
          now,
        ]
      );
      result.inserted.push({ ...warehouse, id, oid } as Warehouse);
    }

    // 处理更新
    for (const warehouse of updated) {
      db.run(
        `UPDATE warehouses SET warehouse_code = ?, warehouse_name = ?, warehouse_type = ?,
         location = ?, capacity = ?, updated_at = ?
         WHERE oid = ?`,
        [
          warehouse.warehouse_code || '',
          warehouse.warehouse_name || '',
          warehouse.warehouse_type || null,
          warehouse.location || null,
          warehouse.capacity || null,
          now,
          warehouse.oid || '',
        ]
      );
      result.updated.push(warehouse as Warehouse);
    }

    // 处理删除
    for (const oid of deleted) {
      db.run('UPDATE warehouses SET status = ? WHERE oid = ?', ['inactive', oid]);
      result.deleted.push(oid);
    }

    saveDatabase();
    return result;
  }

  // ============================================
  // 基地管理
  // ============================================

  async getBases(params: {
    status?: string;
    orgOid?: string;
  }): Promise<Base[]> {
    const db = getDatabase();
    const { status = 'active', orgOid } = params;

    let sql = 'SELECT * FROM bases WHERE status = ?';
    const bindings: string[] = [status];

    if (orgOid) {
      sql += ' AND org_oid = ?';
      bindings.push(orgOid);
    }

    sql += ' ORDER BY base_code ASC';

    const stmt = db.prepare(sql);
    stmt.bind(bindings);

    const items: Base[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Base);
    }
    stmt.free();
    return items;
  }

  async saveBases(data: {
    inserted?: Partial<Base>[];
    updated?: Partial<Base>[];
    deleted?: string[];
  }): Promise<{ inserted: Base[]; updated: Base[]; deleted: string[] }> {
    const db = getDatabase();
    const { inserted = [], updated = [], deleted = [] } = data;
    const now = new Date().toISOString();

    const result = {
      inserted: [] as Base[],
      updated: [] as Base[],
      deleted: [] as string[],
    };

    // 处理新增
    for (const base of inserted) {
      const oid = base.oid || `BASE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const id = base.id || `BASE_ID_${Date.now()}`;
      db.run(
        `INSERT INTO bases (id, oid, base_code, base_name, org_oid, location, area, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          oid,
          base.base_code || '',
          base.base_name || '',
          base.org_oid || null,
          base.location || null,
          base.area || null,
          'active',
          now,
          now,
        ]
      );
      result.inserted.push({ ...base, id, oid } as Base);
    }

    // 处理更新
    for (const base of updated) {
      db.run(
        `UPDATE bases SET base_code = ?, base_name = ?, org_oid = ?, location = ?, area = ?, updated_at = ?
         WHERE oid = ?`,
        [
          base.base_code || '',
          base.base_name || '',
          base.org_oid || null,
          base.location || null,
          base.area || null,
          now,
          base.oid || '',
        ]
      );
      result.updated.push(base as Base);
    }

    // 处理删除
    for (const oid of deleted) {
      db.run('UPDATE bases SET status = ? WHERE oid = ?', ['inactive', oid]);
      result.deleted.push(oid);
    }

    saveDatabase();
    return result;
  }

  // ============================================
  // 温室管理
  // ============================================

  async getGreenhouses(params: {
    status?: string;
    baseOid?: string;
  }): Promise<Greenhouse[]> {
    const db = getDatabase();
    const { status = 'active', baseOid } = params;

    let sql = 'SELECT * FROM greenhouses WHERE status = ?';
    const bindings: string[] = [status];

    if (baseOid) {
      sql += ' AND base_oid = ?';
      bindings.push(baseOid);
    }

    sql += ' ORDER BY greenhouse_code ASC';

    const stmt = db.prepare(sql);
    stmt.bind(bindings);

    const items: Greenhouse[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Greenhouse);
    }
    stmt.free();
    return items;
  }

  async saveGreenhouses(data: {
    inserted?: Partial<Greenhouse>[];
    updated?: Partial<Greenhouse>[];
    deleted?: string[];
  }): Promise<{ inserted: Greenhouse[]; updated: Greenhouse[]; deleted: string[] }> {
    const db = getDatabase();
    const { inserted = [], updated = [], deleted = [] } = data;
    const now = new Date().toISOString();

    const result = {
      inserted: [] as Greenhouse[],
      updated: [] as Greenhouse[],
      deleted: [] as string[],
    };

    // 处理新增
    for (const greenhouse of inserted) {
      const oid = greenhouse.oid || `GH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const id = greenhouse.id || `GH_ID_${Date.now()}`;
      db.run(
        `INSERT INTO greenhouses (id, oid, greenhouse_code, greenhouse_name, base_oid, greenhouse_type, area, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          oid,
          greenhouse.greenhouse_code || '',
          greenhouse.greenhouse_name || '',
          greenhouse.base_oid || '',
          greenhouse.greenhouse_type || null,
          greenhouse.area || null,
          'active',
          now,
          now,
        ]
      );
      result.inserted.push({ ...greenhouse, id, oid } as Greenhouse);
    }

    // 处理更新
    for (const greenhouse of updated) {
      db.run(
        `UPDATE greenhouses SET greenhouse_code = ?, greenhouse_name = ?, base_oid = ?,
         greenhouse_type = ?, area = ?, updated_at = ?
         WHERE oid = ?`,
        [
          greenhouse.greenhouse_code || '',
          greenhouse.greenhouse_name || '',
          greenhouse.base_oid || '',
          greenhouse.greenhouse_type || null,
          greenhouse.area || null,
          now,
          greenhouse.oid || '',
        ]
      );
      result.updated.push(greenhouse as Greenhouse);
    }

    // 处理删除
    for (const oid of deleted) {
      db.run('UPDATE greenhouses SET status = ? WHERE oid = ?', ['inactive', oid]);
      result.deleted.push(oid);
    }

    saveDatabase();
    return result;
  }
}

export const dictionaryService = new DictionaryService();
