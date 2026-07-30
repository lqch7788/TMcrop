/**
 * POST /api/dispatch/recommend 班组候选池测试
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExec = vi.fn<[string, unknown[]?], unknown>();

vi.mock('../db/index', () => ({
  getDatabase: vi.fn(() => ({ exec: mockExec })),
}));

import dispatchRouter from '../routes/dispatch';

const app = express();
app.use(express.json());
app.use('/api/dispatch', dispatchRouter);

describe('POST /api/dispatch/recommend with teamIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('teamIds 非空时应先查 team_members 获取 worker 池', async () => {
    mockExec.mockReturnValueOnce([{
      columns: ['worker_id'],
      values: [['w001'], ['w002']],
    }]);
    mockExec.mockReturnValueOnce([{
      columns: ['id', 'employee_code', 'name', 'skills'],
      values: [
        ['w001', 'E001', '员工一', '采收'],
        ['w002', 'E002', '员工二', '种植'],
      ],
    }]);

    const res = await request(app)
      .post('/api/dispatch/recommend')
      .send({ source: 'farm', sourceId: 'task-001', teamIds: ['team-001'] });

    expect(res.status).toBe(200);
    expect(mockExec.mock.calls[0]?.[0]).toContain('team_members');
    expect(mockExec.mock.calls[0]?.[1]).toContain('team-001');
    expect(mockExec.mock.calls[1]?.[0]).toContain('id IN (?,?)');
    expect(mockExec.mock.calls[1]?.[1]).toEqual(['w001', 'w002']);
    expect(res.body.data.poolSource).toBe('team');
  });

  it('teamIds 缺失时使用全 worker 池', async () => {
    mockExec.mockReturnValue([]);

    const res = await request(app)
      .post('/api/dispatch/recommend')
      .send({ source: 'farm', sourceId: 'task-001' });

    expect(res.status).toBe(200);
    expect(mockExec.mock.calls[0]?.[0]).not.toContain('team_members');
    expect(res.body.data.poolSource).toBe('all');
  });

  it('teamIds 空数组时使用全 worker 池', async () => {
    mockExec.mockReturnValue([]);

    const res = await request(app)
      .post('/api/dispatch/recommend')
      .send({ source: 'farm', sourceId: 'task-001', teamIds: [] });

    expect(res.status).toBe(200);
    expect(mockExec.mock.calls[0]?.[0]).not.toContain('team_members');
    expect(res.body.data.poolSource).toBe('all');
  });

  it('合法 teamIds 对应空班组时返回空推荐并标记班组池', async () => {
    mockExec.mockReturnValueOnce([]);

    const res = await request(app)
      .post('/api/dispatch/recommend')
      .send({ source: 'farm', sourceId: 'task-001', teamIds: ['team-empty'] });

    expect(res.status).toBe(200);
    expect(res.body.data.recommendations).toEqual([]);
    expect(res.body.data.poolSource).toBe('team');
    expect(mockExec).toHaveBeenCalledTimes(1);
  });

  it('teamIds 含非字符串值时应显式拒绝', async () => {
    const res = await request(app)
      .post('/api/dispatch/recommend')
      .send({ source: 'farm', sourceId: 'task-001', teamIds: [null, 123] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockExec).not.toHaveBeenCalled();
  });
});
