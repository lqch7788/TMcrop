/**
 * 2026-07-25 plantings/seedlings 接受 areaOid 集成测试
 *
 * 任务全文本来源：2026-07-25-zone-area-oid 改造 Task 2（后端 API）
 * 验证：
 *   1. POST /api/plantings 接受 areaOid → 写入 plantings.area_oid
 *   2. PUT  /api/plantings/:id 接受 areaOid → 更新 plantings.area_oid
 *   3. POST /api/seedlings 接受 areaOid → 写入 seedlings.area_oid
 *   4. PUT  /api/seedlings/:id 接受 areaOid → 更新 seedlings.area_oid
 *   5. area_name 文本字段仍冗余保存（保证旧查询不破）
 *   6. 直接读 DB 验证：db.exec("SELECT area_oid FROM ...").values
 *
 * 策略：与 watering.e2e.test.ts 一致（express + http + :memory: DB），
 *       不 mock，走真实路由 → service → DB。
 *       跳过 supertest（项目无 supertest 依赖）。
 */

// 必须在 import 任何后端模块前设置环境变量
process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'test-area-oid-secret';
// :memory: 隔离 db,绝不污染 prod db
process.env.DB_PATH_OVERRIDE = ':memory:';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase, closeDatabase } from '../db';
import { initializeDatabase } from '../db/schema';
// 2026-07-19 P0-fix: 补齐 :memory: db 缺失列(GREEN 级纯 ADD COLUMN)
// 2026-07-25: 同时调 fixMissingSchema 拿 zone-area-oid 迁移（fixSchemaColumns 不含 plantings.work_hours / target_yield 等）
import { fixSchemaColumns } from '../db/fixSchemaColumns';
import { fixMissingSchema } from '../db/fixMissingSchema';
import plantingRouter from '../routes/planting';
import seedlingRouter from '../routes/seedling';
import express from 'express';
import http from 'http';

describe('plantings/seedlings POST/PUT 接受 areaOid', () => {
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
    // 初始化 :memory: db + 应用 schema + 2026-07-25 迁移
    await initDatabase();
    initializeDatabase();
    fixSchemaColumns();
    // 2026-07-25: 补 plantings/seedlings.area_oid 列 + 2026-07-25 迁移
    await fixMissingSchema();
    // crop_instances 在 prod DB 有 business_id/business_type（fixMissingSchema 漏补），
    // 但 routes/planting.ts 和 routes/seedling.ts 都会写入。手动补齐防止 :memory: 测试报 no such column
    const db0 = getDatabase();
    try { db0.run(`ALTER TABLE crop_instances ADD COLUMN business_id TEXT`); } catch {}
    try { db0.run(`ALTER TABLE crop_instances ADD COLUMN business_type TEXT`); } catch {}

    const db = getDatabase();

    // 准备 1 条 zone（area_oid 外键目标；schema 要求 id/oid/zone_code/zone_name）
    db.run(`DELETE FROM zones WHERE oid LIKE 'TEST-ZONE-%'`);
    db.run(`
      INSERT INTO zones (id, oid, zone_code, zone_name, created_at, updated_at)
      VALUES ('TEST-ZONE-001-ID', 'TEST-ZONE-001', 'Z-TEST-001', '测试A区', '2026-07-25T00:00:00Z', '2026-07-25T00:00:00Z')
    `);

    // 准备 1 条 seed_source（planting/seedling POST 时 source_id 需要有效，否则业务校验失败）
    db.run(`DELETE FROM seed_sources WHERE id = 'TEST-SS-001'`);
    db.run(`
      INSERT INTO seed_sources (
        id, source_code, source_name, source_type, source_origin, propagation_type,
        crop_name, crop_variety, quantity, remaining_quantity, used_quantity, unit,
        create_by, create_time, update_time
      ) VALUES (
        'TEST-SS-001', 'ZZ-TEST-001', '测试种源', 'self_propagated', 'internal', 'SEED',
        '葡萄', '红提', 10000, 10000, 0, '株',
        'test', '2026-07-25T00:00:00Z', '2026-07-25T00:00:00Z'
      )
    `);

    // 构造 express app：planting/seedling 路由用真路由，errorHandler 走 BusinessError.httpStatus
    const app = express();
    app.use(express.json());
    app.use('/api/plantings', plantingRouter);
    app.use('/api/seedlings', seedlingRouter);
    app.use((err: any, _req: any, res: any, _next: any) => {
      const status = err?.httpStatus || 500;
      res.status(status).json({ success: false, error: err?.message || String(err) });
    });

    httpServer = http.createServer(app);
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    serverPort = (httpServer.address() as any).port;
  });

  afterAll(() => {
    httpServer?.close();
    closeDatabase();
  });

  // ============================================================
  // 1/4 POST /api/plantings 接受 areaOid
  // ============================================================
  it('1/4 POST /api/plantings 接受 areaOid → 写入 plantings.area_oid', async () => {
    const zoneOid = 'TEST-ZONE-001';
    const r = await httpRequest('POST', '/api/plantings', {
      plantingCode: 'PL-AO-001',
      cropName: '葡萄',
      cropVariety: '红提',
      sourceType: 'seed',
      sourceId: 'TEST-SS-001',
      areaOid: zoneOid,
      areaName: '测试A区',
      areaId: 'A001',
      plantingDate: '2026-07-25',
      plantingQuantity: 100,
    });

    expect(r.status).toBe(201);
    expect(r.body?.success).toBe(true);

    // 验证响应回写（PUT 后 SELECT * 是 V1 路由的契约，POST 也用同一模式）
    expect(r.body?.data?.area_oid || r.body?.data?.areaOid).toBe(zoneOid);
    expect(r.body?.data?.area_name || r.body?.data?.areaName).toBe('测试A区');

    // 验证 DB 行确实写入（按返回的 id 查最准）
    const db = getDatabase();
    const createdId = r.body?.data?.id;
    const stmt = db.prepare('SELECT area_oid, area_name FROM plantings WHERE id = ?');
    stmt.bind([createdId]);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    expect(row).toBeTruthy();
    expect(row.area_oid).toBe(zoneOid);
    expect(row.area_name).toBe('测试A区');
  });

  // ============================================================
  // 2/4 PUT /api/plantings/:id 接受 areaOid
  // ============================================================
  it('2/4 PUT /api/plantings/:id 接受 areaOid → 更新 plantings.area_oid', async () => {
    // 先建一条记录
    const created = await httpRequest('POST', '/api/plantings', {
      plantingCode: 'PL-AO-002',
      cropName: '番茄',
      cropVariety: '红果',
      sourceType: 'seed',
      sourceId: 'TEST-SS-001',
      areaName: '老区',
      areaId: 'OLD',
      plantingDate: '2026-07-25',
      plantingQuantity: 50,
    });
    expect(created.status).toBe(201);
    const plantingId = created.body?.data?.id;

    // PUT 切换 areaOid
    const newZoneOid = 'TEST-ZONE-001';
    const updated = await httpRequest('PUT', `/api/plantings/${plantingId}`, {
      areaOid: newZoneOid,
      areaName: '测试A区',
    });
    expect(updated.status).toBe(200);
    expect(updated.body?.success).toBe(true);

    // 验证 DB 已更新
    const db = getDatabase();
    const stmt = db.prepare('SELECT area_oid, area_name FROM plantings WHERE id = ?');
    stmt.bind([plantingId]);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    expect(row).toBeTruthy();
    expect(row.area_oid).toBe(newZoneOid);
    expect(row.area_name).toBe('测试A区');
  });

  // ============================================================
  // 3/4 POST /api/seedlings 接受 areaOid
  // ============================================================
  it('3/4 POST /api/seedlings 接受 areaOid → 写入 seedlings.area_oid', async () => {
    const zoneOid = 'TEST-ZONE-001';
    const r = await httpRequest('POST', '/api/seedlings', {
      seedling_code: 'SD-AO-001',
      source_id: 'TEST-SS-001',
      source_mode: 'internal',
      crop_name: '葡萄',
      crop_variety: '红提',
      seedling_type: '实生苗',
      seedling_form: '种苗',
      area_oid: zoneOid,
      area_name: '测试A区',
      seedling_date: '2026-07-25',
      seedling_quantity: 100,
      create_by: 'test',
    });

    expect(r.status).toBe(201);
    expect(r.body?.success).toBe(true);

    // 验证 DB 行确实写入
    const db = getDatabase();
    const stmt = db.prepare('SELECT area_oid, area_name FROM seedlings WHERE seedling_code = ?');
    stmt.bind(['SD-AO-001']);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    expect(row).toBeTruthy();
    expect(row.area_oid).toBe(zoneOid);
    expect(row.area_name).toBe('测试A区');
  });

  // ============================================================
  // 4/4 PUT /api/seedlings/:id 接受 areaOid
  // ============================================================
  it('4/4 PUT /api/seedlings/:id 接受 areaOid → 更新 seedlings.area_oid', async () => {
    // 先建一条记录
    const created = await httpRequest('POST', '/api/seedlings', {
      seedling_code: 'SD-AO-002',
      source_id: 'TEST-SS-001',
      source_mode: 'internal',
      crop_name: '番茄',
      crop_variety: '红果',
      seedling_type: '实生苗',
      seedling_form: '种苗',
      area_name: '老区',
      seedling_date: '2026-07-25',
      seedling_quantity: 50,
      create_by: 'test',
    });
    expect(created.status).toBe(201);
    const seedlingId = created.body?.data?.id;

    // PUT 切换 areaOid
    const newZoneOid = 'TEST-ZONE-001';
    const updated = await httpRequest('PUT', `/api/seedlings/${seedlingId}`, {
      areaOid: newZoneOid,
      areaName: '测试A区',
    });
    expect(updated.status).toBe(200);
    expect(updated.body?.success).toBe(true);

    // 验证 DB 已更新
    const db = getDatabase();
    const stmt = db.prepare('SELECT area_oid, area_name FROM seedlings WHERE id = ?');
    stmt.bind([seedlingId]);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    expect(row).toBeTruthy();
    expect(row.area_oid).toBe(newZoneOid);
    expect(row.area_name).toBe('测试A区');
  });
});
