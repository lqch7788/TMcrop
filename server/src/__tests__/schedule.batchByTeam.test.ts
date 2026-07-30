/**
 * POST /api/schedules/batch-by-team 测试
 * 覆盖成功创建、参数校验、冲突跳过和空班组路径
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

describe('POST /api/schedules/batch-by-team', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应为班组全员创建排班', async () => {
    mockExec.mockReturnValueOnce({ columns: ['worker_id'], values: [['w001'], ['w002']] });
    mockExec.mockReturnValueOnce({ columns: [], values: [] });
    const res = await request(app).post('/api/schedules/batch-by-team').send({ teamId: 'team-001', date: '2026-07-30', shift: '早班', workZone: '温室A' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.created).toBe(2);
    expect(res.body.data.skipped).toEqual([]);
  });

  it('缺少必填参数应返回 400', async () => {
    const res = await request(app).post('/api/schedules/batch-by-team').send({ teamId: 'team-001' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('应跳过已排班的工人', async () => {
    mockExec.mockReturnValueOnce({ columns: ['worker_id'], values: [['w001'], ['w002']] });
    mockExec.mockReturnValueOnce({ columns: ['staff_id'], values: [['w001']] });
    const res = await request(app).post('/api/schedules/batch-by-team').send({ teamId: 'team-001', date: '2026-07-30', shift: '早班' });
    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(1);
    expect(res.body.data.skipped).toEqual([expect.objectContaining({ workerId: 'w001', reason: '已排班' })]);
  });

  it('空班组应返回 0 创建', async () => {
    mockExec.mockReturnValueOnce({ columns: [], values: [] });
    const res = await request(app).post('/api/schedules/batch-by-team').send({ teamId: 'team-empty', date: '2026-07-30', shift: '早班' });
    expect(res.body.data.created).toBe(0);
    expect(res.body.data.skipped).toEqual([]);
  });

  it('date 格式错误应返回 400', async () => {
    const res = await request(app).post('/api/schedules/batch-by-team').send({ teamId: 'team-001', date: '2026/07/30', shift: '早班' });
    expect(res.status).toBe(400);
  });
});
