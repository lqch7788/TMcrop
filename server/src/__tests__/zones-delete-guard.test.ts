/**
 * 2026-07-25 DELETE /api/basic-data/zones/:id 阻挡逻辑测试
 *
 * 验证：
 *   1. zone 下有 plantings → 409 + blockingPlantings 明细
 *   2. zone 下有 seedlings → 409 + blockingSeedlings 明细
 *   3. zone 下无引用 → 200 正常软删除
 *   4. zone 不存在 → 404
 *   5. deleted plantings/seedlings 不算阻塞
 */

process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'test-zones-delete-secret';
process.env.DB_PATH_OVERRIDE = ':memory:';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase, closeDatabase } from '../db';
import { initializeDatabase } from '../db/schema';
import { fixSchemaColumns } from '../db/fixSchemaColumns';
import { fixMissingSchema } from '../db/fixMissingSchema';
import basicDataRouter from '../routes/basicData';
import express from 'express';
import http from 'http';

describe('DELETE /api/basic-data/zones/:id 阻挡逻辑', () => {
  let httpServer: any;
  let serverPort: number;

  function httpRequest(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const bodyStr = body ? JSON.stringify(body) : undefined;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: serverPort,
          path,
          method,
          headers: bodyStr
            ? {
                'Content-Type': 'application/json',
                'Content-Length': String(Buffer.byteLength(bodyStr)),
              }
            : {},
        },
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
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  beforeAll(async () => {
    await initDatabase();
    initializeDatabase();
    fixSchemaColumns();
    await fixMissingSchema();

    const db = getDatabase();

    // 准备 3 个 zone：
    //   TZ1: 有 1 条 planting（应被阻挡）
    //   TZ2: 有 1 条 seedling（应被阻挡）
    //   TZ3: 全部 deleted（不应阻挡）
    //   TZ4: 空 zone（应允许删除）
    db.run(`DELETE FROM zones WHERE oid LIKE 'TEST-DZ-%'`);
    db.run(`
      INSERT INTO zones (id, oid, zone_code, zone_name, area, status, created_at, updated_at)
      VALUES
        ('DZ1', 'TEST-DZ-001', 'DZ001', '有种植区', 500, 'active', '2026-07-25', '2026-07-25'),
        ('DZ2', 'TEST-DZ-002', 'DZ002', '有育苗区', 300, 'active', '2026-07-25', '2026-07-25'),
        ('DZ3', 'TEST-DZ-003', 'DZ003', '已删除批次区', 200, 'active', '2026-07-25', '2026-07-25'),
        ('DZ4', 'TEST-DZ-004', 'DZ004', '空区', 100, 'active', '2026-07-25', '2026-07-25')
    `);

    // TZ1 → planting
    db.run(`
      INSERT INTO plantings (id, planting_code, crop_name, area_oid, area_name,
                            planting_date, planting_quantity, status, deleted_at)
      VALUES ('DP1', 'DP-001', '葡萄', 'TEST-DZ-001', '有种植区', '2026-04-01', 100, 'planting', NULL)
    `);

    // TZ2 → seedling
    db.run(`
      INSERT INTO seedlings (id, seedling_code, crop_name, area_oid, area_name,
                             seedling_date, seedling_quantity, status, deleted_at)
      VALUES ('DS1', 'DS-001', '葡萄', 'TEST-DZ-002', '有育苗区', '2026-02-01', 80, 'in_progress', NULL)
    `);

    // TZ3 → deleted 的 planting + seedling（不算阻塞）
    db.run(`
      INSERT INTO plantings (id, planting_code, crop_name, area_oid, area_name,
                            planting_date, planting_quantity, status, deleted_at)
      VALUES ('DP3', 'DP-003', '番茄', 'TEST-DZ-003', '已删除批次区', '2026-01-01', 30, 'planting', '2026-07-01')
    `);
    db.run(`
      INSERT INTO seedlings (id, seedling_code, crop_name, area_oid, area_name,
                             seedling_date, seedling_quantity, status, deleted_at)
      VALUES ('DS3', 'DS-003', '番茄', 'TEST-DZ-003', '已删除批次区', '2026-01-01', 50, 'in_progress', '2026-07-01')
    `);

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

  it('zone 下有 plantings → 409 + blockingPlantings 明细', async () => {
    const res = await httpRequest('DELETE', '/api/basic-data/zones/DZ1');
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.blockingPlantings).toBeDefined();
    expect(res.body.blockingPlantings.length).toBe(1);
    expect(res.body.blockingPlantings[0].plantingCode).toBe('DP-001');
    expect(res.body.blockingPlantings[0].cropName).toBe('葡萄');
  });

  it('zone 下有 seedlings → 409 + blockingSeedlings 明细', async () => {
    const res = await httpRequest('DELETE', '/api/basic-data/zones/DZ2');
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.blockingSeedlings).toBeDefined();
    expect(res.body.blockingSeedlings.length).toBe(1);
    expect(res.body.blockingSeedlings[0].seedlingCode).toBe('DS-001');
  });

  it('zone 下无引用 → 200 正常软删除', async () => {
    const res = await httpRequest('DELETE', '/api/basic-data/zones/DZ4');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 验证 status='inactive'
    const db = getDatabase();
    const r = db.exec(`SELECT status FROM zones WHERE id = 'DZ4'`)[0];
    expect(r.values[0][0]).toBe('inactive');
  });

  it('deleted plantings/seedlings 不算阻塞 → 200', async () => {
    const res = await httpRequest('DELETE', '/api/basic-data/zones/DZ3');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('zone 不存在 → 404', async () => {
    const res = await httpRequest('DELETE', '/api/basic-data/zones/NONEXIST');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});