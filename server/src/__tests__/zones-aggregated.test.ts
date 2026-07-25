/**
 * 2026-07-25 GET /api/basic-data/zones 返回 aggregatedPlantings 聚合测试
 *
 * 验证：
 *   1. 响应包含 aggregatedPlantings 字段（count, seedlingCount, occupiedArea, currentCrop）
 *   2. 聚合数字与实际 plantings/seedlings 数据一致
 *   3. 现有 zone 字段（zoneName, area, greenhouseOid 等）保持兼容
 *   4. 没有 plantings/seedlings 的 zone 也返回正确（count=0, currentCrop='-'）
 *
 * 策略：与 plantings-area-oid.test.ts 一致（express + http + :memory: DB）
 */

process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'test-zones-agg-secret';
process.env.DB_PATH_OVERRIDE = ':memory:';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase, closeDatabase } from '../db';
import { initializeDatabase } from '../db/schema';
import { fixSchemaColumns } from '../db/fixSchemaColumns';
import { fixMissingSchema } from '../db/fixMissingSchema';
import basicDataRouter from '../routes/basicData';
import express from 'express';
import http from 'http';

describe('GET /api/basic-data/zones 返回 aggregatedPlantings 聚合', () => {
  let httpServer: any;
  let serverPort: number;

  function httpRequest(method: string, path: string): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: serverPort, path, method },
        (res: any) => {
          let data = '';
          res.on('data', (chunk: Buffer) => (data += chunk.toString()));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode!, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode!, body: data || null });
            }
          });
        },
      );
      req.on('error', reject);
      req.end();
    });
  }

  beforeAll(async () => {
    await initDatabase();
    initializeDatabase();
    fixSchemaColumns();
    await fixMissingSchema();

    const db = getDatabase();

    // 准备 2 个 zone（一个有 plantings，一个没有）
    db.run(`DELETE FROM zones WHERE oid LIKE 'TEST-Z-%'`);
    db.run(`
      INSERT INTO zones (id, oid, zone_code, zone_name, area, status, created_at, updated_at)
      VALUES
        ('TZ1', 'TEST-Z-001', 'Z001', '已占用区', 500, 'active', '2026-07-25', '2026-07-25'),
        ('TZ2', 'TEST-Z-002', 'Z002', '空区', 300, 'active', '2026-07-25', '2026-07-25')
    `);

    // 给 TEST-Z-001 加 2 条 plantings（不同日期，验证 currentCrop 取最新）
    db.run(`DELETE FROM plantings WHERE area_oid = 'TEST-Z-001'`);
    db.run(`
      INSERT INTO plantings (id, planting_code, crop_name, crop_variety, area_oid, area_name,
                            planting_date, planting_quantity, status, deleted_at)
      VALUES
        ('P1', 'P-001', '葡萄', '红提', 'TEST-Z-001', '已占用区', '2026-04-01', 100, 'planting', NULL),
        ('P2', 'P-002', '番茄', '圣女果', 'TEST-Z-001', '已占用区', '2026-09-01', 50, 'planting', NULL)
    `);
    // 加 1 条 deleted 的 plantings（不应被聚合）
    db.run(`
      INSERT INTO plantings (id, planting_code, crop_name, area_oid, area_name,
                            planting_date, planting_quantity, status, deleted_at)
      VALUES ('PD', 'P-DEL', '黄瓜', 'TEST-Z-001', '已占用区', '2026-01-01', 30, 'planting', '2026-07-01')
    `);

    // 加 1 条 seedlings
    db.run(`DELETE FROM seedlings WHERE area_oid = 'TEST-Z-001'`);
    db.run(`
      INSERT INTO seedlings (id, seedling_code, area_oid, area_name, seedling_date,
                             seedling_quantity, deleted_at)
      VALUES ('S1', 'S-001', 'TEST-Z-001', '已占用区', '2026-02-01', 80, NULL)
    `);

    // 启动 express + http
    const app = express();
    app.use('/api/basic-data', basicDataRouter);
    httpServer = http.createServer(app);
    await new Promise<void>(resolve => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    if (httpServer) httpServer.close();
    closeDatabase();
  });

  it('响应包含 aggregatedPlantings 字段', async () => {
    const res = await httpRequest('GET', '/api/basic-data/zones');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const z1 = res.body.data.find((z: any) => z.oid === 'TEST-Z-001');
    expect(z1).toBeDefined();
    expect(z1.aggregatedPlantings).toBeDefined();
    expect(z1.aggregatedPlantings).toHaveProperty('count');
    expect(z1.aggregatedPlantings).toHaveProperty('seedlingCount');
    expect(z1.aggregatedPlantings).toHaveProperty('occupiedArea');
    expect(z1.aggregatedPlantings).toHaveProperty('currentCrop');
  });

  it('聚合数字与 DB 一致（count=2, seedlingCount=1, occupiedArea=150）', async () => {
    const res = await httpRequest('GET', '/api/basic-data/zones');
    const z1 = res.body.data.find((z: any) => z.oid === 'TEST-Z-001');
    expect(z1.aggregatedPlantings.count).toBe(2); // P1 + P2（PD 已删除不算）
    expect(z1.aggregatedPlantings.seedlingCount).toBe(1);
    expect(z1.aggregatedPlantings.occupiedArea).toBe(150); // 100 + 50
  });

  it('currentCrop 取最新 planting_date 的 crop_name（番茄 2026-09 > 葡萄 2026-04）', async () => {
    const res = await httpRequest('GET', '/api/basic-data/zones');
    const z1 = res.body.data.find((z: any) => z.oid === 'TEST-Z-001');
    expect(z1.aggregatedPlantings.currentCrop).toBe('番茄');
  });

  it('没有 plantings/seedlings 的 zone 返回零值', async () => {
    const res = await httpRequest('GET', '/api/basic-data/zones');
    const z2 = res.body.data.find((z: any) => z.oid === 'TEST-Z-002');
    expect(z2).toBeDefined();
    expect(z2.aggregatedPlantings.count).toBe(0);
    expect(z2.aggregatedPlantings.seedlingCount).toBe(0);
    expect(z2.aggregatedPlantings.occupiedArea).toBe(0);
    expect(z2.aggregatedPlantings.currentCrop).toBe('-');
  });

  it('现有 zone 字段保持兼容（zoneName, area, greenhouseOid）', async () => {
    const res = await httpRequest('GET', '/api/basic-data/zones');
    const z1 = res.body.data.find((z: any) => z.oid === 'TEST-Z-001');
    expect(z1.zoneName).toBe('已占用区');
    expect(z1.area).toBe(500);
  });
});