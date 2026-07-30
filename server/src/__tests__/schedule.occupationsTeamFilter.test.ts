/**
 * GET /api/schedules/occupations?teamId= 测试
 * 覆盖 4 个路径：带 teamId 过滤、不带 teamId 返回全部、参数校验、空班组
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockExec = vi.fn();

vi.mock('../db/index', () => ({
  getDatabase: vi.fn(() => ({ exec: mockExec })),
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

describe('GET /api/schedules/occupations?teamId=', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('带 teamId 时应先查 team_members 获取 worker 池', async () => {
    // mock 1: team_members 查询（返回 worker 列表）
    mockExec.mockReturnValueOnce([{
      columns: ['worker_id'],
      values: [['w001'], ['w002']],
    }]);
    // mock 2: schedules 查询（无排班）
    mockExec.mockReturnValueOnce([{ columns: [], values: [] }]);
    // mock 3: farm_tasks 查询（无任务）
    mockExec.mockReturnValueOnce([{ columns: [], values: [] }]);
    // mock 4: temp_tasks 查询（无任务）
    mockExec.mockReturnValueOnce([{ columns: [], values: [] }]);

    const res = await request(app)
      .get('/api/schedules/occupations')
      .query({ date: '2026-07-30', teamId: 'team-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 验证：mock 至少被调用 4 次（team_members + schedules + farm_tasks + temp_tasks）
    expect(mockExec.mock.calls.length).toBeGreaterThanOrEqual(4);
    // 第一次调用应是 team_members 查询
    expect(mockExec.mock.calls[0][0]).toContain('team_members');
  });

  it('不带 teamId 时返回全部工人（向后兼容）', async () => {
    // 不带 teamId 应直接跳过 team_members 查询
    mockExec.mockReturnValueOnce([{ columns: [], values: [] }]); // schedules
    mockExec.mockReturnValueOnce([{ columns: [], values: [] }]); // farm_tasks
    mockExec.mockReturnValueOnce([{ columns: [], values: [] }]); // temp_tasks

    const res = await request(app)
      .get('/api/schedules/occupations')
      .query({ date: '2026-07-30' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 验证：不应查询 team_members
    const allCalls = mockExec.mock.calls.map((call) => call[0] as string);
    const hasTeamMembersQuery = allCalls.some((sql) => sql.includes('team_members'));
    expect(hasTeamMembersQuery).toBe(false);
  });

  it('缺少 date 参数应返回 400', async () => {
    const res = await request(app)
      .get('/api/schedules/occupations')
      .query({ teamId: 'team-001' });

    expect(res.status).toBe(400);
  });

  it('空班组（teamId 不存在）应返回空 workers', async () => {
    // mock: team_members 查询（空结果）
    mockExec.mockReturnValueOnce([{ columns: [], values: [] }]);

    const res = await request(app)
      .get('/api/schedules/occupations')
      .query({ date: '2026-07-30', teamId: 'team-empty' });

    expect(res.status).toBe(200);
    expect(res.body.data?.workers ?? []).toEqual([]);
  });
});
