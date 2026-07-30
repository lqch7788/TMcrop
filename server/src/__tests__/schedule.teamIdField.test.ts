/**
 * POST /api/schedules/ 团队字段测试
 * 覆盖向后兼容：不带 team_id/team_name 应继续工作；带 team_id/team_name 应写入 DB
 *
 * 2026-07-30 排班调度 × 班组分配贯通：POST / 接收 team_id/team_name 入参
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockExec = vi.fn();
const mockRun = vi.fn();

vi.mock('../db/index', () => ({
  getDatabase: vi.fn(() => ({ exec: mockExec, run: mockRun })),
  saveDatabase: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
}));

import request from 'supertest';
import express from 'express';
import scheduleRouter from '../routes/schedule';

const app = express();
app.use(express.json());
app.use('/api/schedules', scheduleRouter);

describe('POST /api/schedules/ 团队字段', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('不带 team_id/team_name 应继续工作（向后兼容）', async () => {
    const res = await request(app)
      .post('/api/schedules/')
      .send({ staff_id: 'w001', date: '2026-07-30', shift: '早班', work_zone: 'A区' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // 响应中 team_id/team_name 应为 null（不传时）
    expect(res.body.data.team_id).toBeNull();
    expect(res.body.data.team_name).toBeNull();
    // 验证 INSERT 调用：含 team_id/team_name 列
    const insertCall = mockRun.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO schedules'));
    expect(insertCall).toBeDefined();
    // INSERT values 末尾应含两个 null（team_id, team_name）
    const insertValues = insertCall?.[1] as unknown[];
    expect(insertValues).toContain(null);
    // 末尾两个元素是 null
    expect(insertValues[insertValues.length - 1]).toBeNull();
    expect(insertValues[insertValues.length - 2]).toBeNull();
  });

  it('带 team_id/team_name 应接受并写入', async () => {
    const res = await request(app)
      .post('/api/schedules/')
      .send({
        staff_id: 'w001',
        date: '2026-07-30',
        shift: '早班',
        work_zone: 'A区',
        team_id: 'team-001',
        team_name: '种植一组',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // 响应中应回传 team_id/team_name
    expect(res.body.data.team_id).toBe('team-001');
    expect(res.body.data.team_name).toBe('种植一组');
    // 验证 INSERT 调用：含 team_id/team_name 值
    const insertCall = mockRun.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO schedules'));
    expect(insertCall).toBeDefined();
    const insertValues = insertCall?.[1] as unknown[];
    expect(insertValues).toContain('team-001');
    expect(insertValues).toContain('种植一组');
  });

  it('带部分 team 字段（只 team_id）应只填充 team_id', async () => {
    const res = await request(app)
      .post('/api/schedules/')
      .send({
        staff_id: 'w002',
        date: '2026-07-30',
        shift: '中班',
        team_id: 'team-002',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.team_id).toBe('team-002');
    expect(res.body.data.team_name).toBeNull();
  });

  it('INSERT SQL 应包含 team_id 和 team_name 列', async () => {
    await request(app)
      .post('/api/schedules/')
      .send({ staff_id: 'w003', date: '2026-07-30', shift: '夜班' });

    const insertCall = mockRun.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO schedules'));
    expect(insertCall).toBeDefined();
    const sql = insertCall?.[0] as string;
    expect(sql).toContain('team_id');
    expect(sql).toContain('team_name');
  });
});
