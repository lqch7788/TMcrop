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
