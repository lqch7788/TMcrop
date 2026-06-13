/**
 * 物料流转流水表
 * 用于记录所有跨模块物料流转（种源→育苗→种植→采收→库存）
 * 2026-06-13 新建
 */

import { getDatabase, saveDatabase } from './index';

export function createMaterialFlowLogTable(): void {
  const db = getDatabase();
  db.run(`
    CREATE TABLE IF NOT EXISTS material_flow_log (
      id TEXT PRIMARY KEY,
      oid INTEGER UNIQUE,
      flow_type TEXT NOT NULL,
      crop_code TEXT,
      crop_name TEXT NOT NULL,
      crop_variety TEXT,
      source_type TEXT,
      source_id TEXT,
      source_code TEXT,
      source_quantity REAL,
      source_unit TEXT,
      source_category TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_code TEXT NOT NULL,
      target_quantity REAL,
      target_unit TEXT,
      business_id TEXT,
      business_code TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_source ON material_flow_log(source_type, source_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_target ON material_flow_log(target_type, target_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_code ON material_flow_log(source_code, target_code)');
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_type_time ON material_flow_log(flow_type, created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_crop ON material_flow_log(crop_name)');
  saveDatabase();
}
