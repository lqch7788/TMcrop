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

describe('migrateToAreaStocks', () => {
  it('migrates existing plantings into stocks', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run(`CREATE TABLE plantings (id TEXT PRIMARY KEY, area_id TEXT, area_name TEXT, planting_quantity INTEGER, planting_code TEXT, planting_date TEXT, create_time TEXT)`);
    db.run(`INSERT INTO plantings VALUES ('P1', 'G001', '一棚01区', 500, 'ZZ001', '2026-06-21', '2026-06-21T00:00:00Z')`);
    db.run(`INSERT INTO plantings VALUES ('P2', 'G002', '二棚01区', 100, 'ZZ002', '2026-06-21', '2026-06-21T00:00:00Z')`);

    const { createPlantingAreaStocksTable, migrateToAreaStocks } = await import('../db/plantingAreaStocks');
    createPlantingAreaStocksTable(db as any);
    migrateToAreaStocks(db as any);

    const r = db.exec("SELECT planting_id, area_id, quantity FROM planting_area_stocks ORDER BY planting_id");
    expect(r[0].values).toEqual([
      ['P1', 'G001', 500],
      ['P2', 'G002', 100],
    ]);
  });

  it('skips when stocks already exist (idempotent)', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run(`CREATE TABLE plantings (id TEXT PRIMARY KEY, area_id TEXT, area_name TEXT, planting_quantity INTEGER, planting_code TEXT, planting_date TEXT, create_time TEXT)`);
    db.run(`INSERT INTO plantings VALUES ('P1', 'G001', '一棚', 500, 'ZZ001', '2026-06-21', '2026-06-21')`);

    const { createPlantingAreaStocksTable, migrateToAreaStocks } = await import('../db/plantingAreaStocks');
    createPlantingAreaStocksTable(db as any);
    // 先插入自定义行（模拟已有数据），再调 migrate，应不覆盖
    db.run(`INSERT INTO planting_area_stocks (id, planting_id, area_id, area_name, quantity, create_time, update_time)
            VALUES ('STK_custom', 'P1', 'G001', '一棚', 999, 'now', 'now')`);
    migrateToAreaStocks(db as any);
    const r = db.exec("SELECT quantity FROM planting_area_stocks WHERE planting_id = 'P1'");
    expect(r[0].values.length).toBe(1);
    expect(r[0].values[0][0]).toBe(999);
  });
});
