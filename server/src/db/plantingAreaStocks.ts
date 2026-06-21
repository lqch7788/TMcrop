import type { Database } from 'sql.js';

export function createPlantingAreaStocksTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS planting_area_stocks (
      id TEXT PRIMARY KEY,
      planting_id TEXT NOT NULL,
      area_id TEXT NOT NULL,
      area_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      source_type TEXT,
      source_id TEXT,
      source_code TEXT,
      operation_date TEXT,
      remarks TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL,
      FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_pas_planting ON planting_area_stocks(planting_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pas_area ON planting_area_stocks(area_id)');
}

export function migrateToAreaStocks(db: Database): void {
  db.run(`
    INSERT INTO planting_area_stocks
      (id, planting_id, area_id, area_name, quantity, source_type, source_code, operation_date, create_time, update_time)
    SELECT
      'STK_migrate_' || p.id,
      p.id,
      COALESCE(NULLIF(p.area_id, ''), 'UNASSIGNED'),
      COALESCE(NULLIF(p.area_name, ''), '未分配'),
      p.planting_quantity,
      'migrate',
      p.planting_code,
      COALESCE(p.planting_date, date('now')),
      COALESCE(p.create_time, datetime('now')),
      datetime('now')
    FROM plantings p
    WHERE p.planting_quantity > 0
      AND NOT EXISTS (SELECT 1 FROM planting_area_stocks s WHERE s.planting_id = p.id)
  `);
}
