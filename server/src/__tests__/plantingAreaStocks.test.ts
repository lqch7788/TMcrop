import { describe, it, expect } from 'vitest';
import initSqlJs from 'sql.js';

describe('createPlantingAreaStocksTable', () => {
  it('creates the table with all required columns', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const { createPlantingAreaStocksTable } = await import('../db/plantingAreaStocks');
    createPlantingAreaStocksTable(db as any);
    const r = db.exec("PRAGMA table_info(planting_area_stocks)");
    const cols = r[0].values.map(v => v[1]);
    expect(cols).toContain('id');
    expect(cols).toContain('planting_id');
    expect(cols).toContain('area_id');
    expect(cols).toContain('area_name');
    expect(cols).toContain('quantity');
    expect(cols).toContain('source_type');
    expect(cols).toContain('source_id');
    expect(cols).toContain('source_code');
    expect(cols).toContain('operation_date');
    expect(cols).toContain('create_time');
    expect(cols).toContain('update_time');
  });
});
