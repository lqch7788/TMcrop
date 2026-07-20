/**
 * 浇水记录 API 路由 E2E 测试
 * 2026-07-20：Phase 1 - 5 个核心端点完整流程
 *
 * 覆盖端点（按 task 规格 5 个）：
 * 1. POST /api/watering        创建
 * 2. GET  /api/watering        分页查询
 * 3. PUT  /api/watering/:id    编辑
 * 4. DELETE /api/watering/:id  删除
 * 5. POST /api/watering/batch-delete  批量删除
 *
 * 完全模拟前端 HTTP 请求 → 路由 → service → DB（不 mock,走真实 sqlite :memory:）
 */

// 必须在 import 任何后端模块前设置环境变量（auth.ts 顶层 import 校验 JWT_SECRET）
process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'test-e2e-secret-do-not-use-in-prod';
// :memory: 隔离 db,绝不污染 prod db（db/index.ts 在模块 import 时读取此 env var）
process.env.DB_PATH_OVERRIDE = ':memory:';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase, closeDatabase } from '../db';
import { initializeDatabase } from '../db/schema';
// :memory: 测试环境需要补齐缺失列(纯 ADD COLUMN,幂等)
import { fixSchemaColumns } from '../db/fixSchemaColumns';
import wateringRouter from '../routes/watering';
import express from 'express';
import http from 'http';

/** run 级别唯一前缀,避免并发测试与历史 run 残留冲突 */
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
function uid(prefix: string): string {
  return `${prefix}-E2E-${RUN_ID}-${Math.random().toString(36).slice(2, 6)}`;
}

describe('浇水记录 API E2E', () => {
  let httpServer: any;
  let serverPort: number;

  /** HTTP 请求 helper(JSON body / 自动解析响应) */
  function httpRequest(
    method: string,
    path: string,
    body?: unknown
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
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode!, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode!, body: data || null });
            }
          });
        }
      );
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  beforeAll(async () => {
    // 初始化 :memory: db
    await initDatabase();
    initializeDatabase();
    fixSchemaColumns();

    // 清理上一次测试 run 残留的浇水记录
    const db = getDatabase();
    db.exec(`DELETE FROM watering_records WHERE id LIKE 'water-E2E-%'`);
    db.exec(`DELETE FROM watering_records WHERE id LIKE 'water-%E2E-%'`);

    // 构造真实 express app(不调 auth — 走 demo 模式放行)
    const app = express();
    app.use(express.json());
    app.use('/api/watering', wateringRouter);
    // 全局错误处理:使用 BusinessError.httpStatus(对齐 production errorHandler.ts 第 92-96 行)
    app.use((err: any, _req: any, res: any, _next: any) => {
      const status = err?.httpStatus || 500;
      res.status(status).json({ success: false, error: err?.message || String(err) });
    });

    httpServer = http.createServer(app);
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const addr = httpServer.address();
    serverPort = addr.port;
  });

  afterAll(() => {
    httpServer?.close();
    closeDatabase();
  });

  // ============================================================
  // 端点 1/5: POST /api/watering 创建
  // ============================================================
  it('1/5 POST /api/watering 创建浇水记录(成功)', async () => {
    const cropName = `葡萄-E2E-${RUN_ID}`;
    const r = await httpRequest('POST', '/api/watering', {
      cropName,
      greenhouseName: 'A区温室',
      waterTime: '2026-07-20 09:00:00',
      totalWater: 100,
      waterUnit: 'L',
      waterCost: 50,
      operatorName: '张三',
      description: 'E2E 创建测试',
    });

    expect(r.status).toBe(200);
    expect(r.body?.success).toBe(true);
    expect(r.body?.data).toBeTruthy();
    expect(r.body.data.cropName).toBe(cropName);
    expect(r.body.data.greenhouseName).toBe('A区温室');
    expect(r.body.data.totalWater).toBe(100);
    expect(r.body.data.waterUnit).toBe('L');
    expect(r.body.data.recordType).toBe('manual');
    expect(r.body.data.waterCode).toMatch(/^SW\d{8}-\d{4}$/);

    // 验证 DB 行确实写入
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as cnt FROM watering_records WHERE crop_name = ?');
    stmt.bind([cropName]);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    expect(row?.cnt).toBeGreaterThanOrEqual(1);
  });

  it('1/5 POST /api/watering 缺必填字段 cropName → 500(参数错误)', async () => {
    const r = await httpRequest('POST', '/api/watering', {
      greenhouseName: 'A区温室',
      waterTime: '2026-07-20 09:00:00',
      totalWater: 100,
      waterUnit: 'L',
    });

    // Zod safeParse 失败 → service 抛 BusinessError(httpStatus=400)
    // errorHandler 中间件捕获 → 400 + { success: false, error }
    expect(r.status).toBe(400);
    expect(r.body?.success).toBe(false);
    expect(r.body?.error).toContain('cropName');
  });

  // ============================================================
  // 端点 2/5: GET /api/watering 分页
  // ============================================================
  it('2/5 GET /api/watering 分页查询(默认参数)', async () => {
    // 先创建 1 条用于分页验证
    const uniqueCrop = `分页作物-${uid('CROP')}`;
    const created = await httpRequest('POST', '/api/watering', {
      cropName: uniqueCrop,
      greenhouseName: 'B区温室',
      waterTime: '2026-07-20 10:00:00',
      totalWater: 50,
      waterUnit: 'L',
    });
    expect(created.status).toBe(200);

    // 不带任何 query → 默认 page=1, pageSize=20
    const r = await httpRequest('GET', '/api/watering');
    expect(r.status).toBe(200);
    expect(r.body?.success).toBe(true);
    expect(Array.isArray(r.body?.data)).toBe(true);
    // 分页 meta
    expect(r.body?.meta).toBeTruthy();
    expect(typeof r.body.meta.total).toBe('number');
    expect(r.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(r.body.meta.page).toBe(1);
    expect(r.body.meta.pageSize).toBe(20);

    // 验证刚创建的记录在结果里
    const found = (r.body.data as any[]).find((row: any) => row.cropName === uniqueCrop);
    expect(found).toBeTruthy();
    expect(found.greenhouseName).toBe('B区温室');
  });

  it('2/5 GET /api/watering?cropName=xxx 按作物名筛选', async () => {
    // 先创建一个 unique 作物名的记录
    const uniqueCrop = `筛选作物-${uid('FILTER')}`;
    await httpRequest('POST', '/api/watering', {
      cropName: uniqueCrop,
      greenhouseName: 'C区温室',
      waterTime: '2026-07-20 11:00:00',
      totalWater: 75,
      waterUnit: 'L',
    });

    const r = await httpRequest('GET', `/api/watering?cropName=${encodeURIComponent(uniqueCrop)}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body?.data)).toBe(true);
    // 由于使用 LIKE '%xxx%',至少返回刚创建的那一条
    const matched = (r.body.data as any[]).filter((row: any) => row.cropName === uniqueCrop);
    expect(matched.length).toBeGreaterThanOrEqual(1);
  });

  it('2/5 GET /api/watering?page=1&pageSize=5 分页参数生效', async () => {
    // 一次创建 3 条不同作物名的记录
    for (let i = 0; i < 3; i++) {
      await httpRequest('POST', '/api/watering', {
        cropName: `分页测试作物${i}-${uid('PAGE')}`,
        greenhouseName: 'D区',
        waterTime: `2026-07-2${i} 12:00:00`,
        totalWater: 10 * (i + 1),
        waterUnit: 'L',
      });
    }

    const r = await httpRequest('GET', '/api/watering?page=1&pageSize=5');
    expect(r.status).toBe(200);
    expect(r.body.meta.pageSize).toBe(5);
    expect(r.body.meta.page).toBe(1);
    expect((r.body.data as any[]).length).toBeLessThanOrEqual(5);
  });

  // ============================================================
  // 端点 3/5: PUT /api/watering/:id 编辑
  // ============================================================
  it('3/5 PUT /api/watering/:id 编辑(成功)', async () => {
    // 先创建一条
    const created = await httpRequest('POST', '/api/watering', {
      cropName: `编辑前作物-${uid('EDIT')}`,
      greenhouseName: '编辑前温室',
      waterTime: '2026-07-20 13:00:00',
      totalWater: 200,
      waterUnit: 'L',
    });
    expect(created.status).toBe(200);
    const id = created.body?.data?.id;
    expect(id).toBeTruthy();

    // 编辑 totalWater + greenhouseName + description
    const r = await httpRequest('PUT', `/api/watering/${id}`, {
      totalWater: 300,
      greenhouseName: '编辑后温室',
      description: '已编辑',
    });

    expect(r.status).toBe(200);
    expect(r.body?.success).toBe(true);
    expect(r.body.data.id).toBe(id);
    expect(r.body.data.totalWater).toBe(300);
    expect(r.body.data.greenhouseName).toBe('编辑后温室');
    expect(r.body.data.description).toBe('已编辑');

    // 验证 DB 真实写入
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT total_water, greenhouse_name, description FROM watering_records WHERE id = ?'
    );
    stmt.bind([id]);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    expect(row?.total_water).toBe(300);
    expect(row?.greenhouse_name).toBe('编辑后温室');
    expect(row?.description).toBe('已编辑');
  });

  it('3/5 PUT /api/watering/:id 不存在的 ID → 400/404(浇水记录不存在)', async () => {
    const fakeId = `water-NOT-EXIST-${uid('NONE')}`;
    const r = await httpRequest('PUT', `/api/watering/${fakeId}`, {
      totalWater: 999,
    });

    // BusinessError(httpStatus=404) → errorHandler 返回 404
    expect(r.status).toBe(404);
    expect(r.body?.success).toBe(false);
    expect(r.body?.error).toContain('不存在');
  });

  // ============================================================
  // 端点 4/5: DELETE /api/watering/:id 删除
  // ============================================================
  it('4/5 DELETE /api/watering/:id 删除(成功)', async () => {
    // 先创建一条
    const created = await httpRequest('POST', '/api/watering', {
      cropName: `待删除作物-${uid('DEL')}`,
      greenhouseName: '待删除温室',
      waterTime: '2026-07-20 14:00:00',
      totalWater: 80,
      waterUnit: 'L',
    });
    expect(created.status).toBe(200);
    const id = created.body?.data?.id;

    // 删除
    const r = await httpRequest('DELETE', `/api/watering/${id}`);
    expect(r.status).toBe(200);
    expect(r.body?.success).toBe(true);
    expect(r.body?.data?.id).toBe(id);

    // 验证 DB 行已删除
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as cnt FROM watering_records WHERE id = ?');
    stmt.bind([id]);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    expect(row?.cnt).toBe(0);

    // 再次 GET 详情应 404
    const detail = await httpRequest('GET', `/api/watering/${id}`);
    expect(detail.status).toBe(404);
  });

  it('4/5 DELETE /api/watering/:id 不存在的 ID → 404', async () => {
    const fakeId = `water-NOT-EXIST-${uid('NONE2')}`;
    const r = await httpRequest('DELETE', `/api/watering/${fakeId}`);
    expect(r.status).toBe(404);
    expect(r.body?.success).toBe(false);
  });

  // ============================================================
  // 端点 5/5: POST /api/watering/batch-delete 批量删除
  // ============================================================
  it('5/5 POST /api/watering/batch-delete 批量删除(成功)', async () => {
    // 创建 3 条用于批量删除
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const created = await httpRequest('POST', '/api/watering', {
        cropName: `批量作物${i}-${uid('BATCH')}`,
        greenhouseName: '批量温室',
        waterTime: `2026-07-2${i + 5} 15:00:00`,
        totalWater: 20 * (i + 1),
        waterUnit: 'L',
      });
      expect(created.status).toBe(200);
      ids.push(created.body.data.id);
    }

    // 批量删除
    const r = await httpRequest('POST', '/api/watering/batch-delete', { ids });
    expect(r.status).toBe(200);
    expect(r.body?.success).toBe(true);
    expect(r.body?.data?.deleted).toBe(3);
    expect(r.body?.data?.skipped).toBe(0);

    // 验证 DB 中这 3 条全部删除
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(
      `SELECT COUNT(*) as cnt FROM watering_records WHERE id IN (${placeholders})`
    );
    stmt.bind(ids);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    expect(row?.cnt).toBe(0);
  });

  it('5/5 POST /api/watering/batch-delete 空数组 → 400', async () => {
    const r = await httpRequest('POST', '/api/watering/batch-delete', { ids: [] });
    expect(r.status).toBe(400);
    expect(r.body?.success).toBe(false);
    expect(r.body?.error).toMatch(/ID 数组|记录 ID 数组|数组/);
  });

  it('5/5 POST /api/watering/batch-delete 含不存在 ID → 跳过(skipped 计数)', async () => {
    // 创建 2 条
    const created1 = await httpRequest('POST', '/api/watering', {
      cropName: `混合批量作物1-${uid('MIX')}`,
      greenhouseName: '混合温室',
      waterTime: '2026-07-20 16:00:00',
      totalWater: 30,
      waterUnit: 'L',
    });
    const created2 = await httpRequest('POST', '/api/watering', {
      cropName: `混合批量作物2-${uid('MIX')}`,
      greenhouseName: '混合温室',
      waterTime: '2026-07-20 17:00:00',
      totalWater: 40,
      waterUnit: 'L',
    });
    expect(created1.status).toBe(200);
    expect(created2.status).toBe(200);

    const realId = created1.body.data.id;
    const fakeId = `water-NOT-EXIST-${uid('FAKE')}`;
    const ids = [realId, fakeId, created2.body.data.id];

    const r = await httpRequest('POST', '/api/watering/batch-delete', { ids });
    expect(r.status).toBe(200);
    expect(r.body?.data?.deleted).toBe(2);
    expect(r.body?.data?.skipped).toBe(1);
  });
});
