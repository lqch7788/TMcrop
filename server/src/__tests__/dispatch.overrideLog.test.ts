/**
 * POST /api/dispatch/override 测试
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRun, mockSaveDatabase } = vi.hoisted(() => ({
  mockRun: vi.fn<[string, unknown[]?], void>(),
  mockSaveDatabase: vi.fn(),
}));

vi.mock('../db/index', () => ({
  getDatabase: vi.fn(() => ({ run: mockRun })),
  saveDatabase: mockSaveDatabase,
}));

import dispatchRouter from '../routes/dispatch';

const app = express();
app.use(express.json());
app.use('/api/dispatch', dispatchRouter);

describe('POST /api/dispatch/override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应写入 dispatch_override_log 表', async () => {
    const res = await request(app)
      .post('/api/dispatch/override')
      .send({
        taskId: 'task-001',
        workerId: 'w001',
        overrideReason: '紧急任务，工人已电话确认可出勤',
        conflictType: 'off_duty',
        createdBy: 'admin',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const insertCall = mockRun.mock.calls.find((call) => call[0].includes('INSERT INTO dispatch_override_log'));
    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toContain('task-001');
    expect(insertCall?.[1]).toContain('w001');
    expect(insertCall?.[1]).toContain('紧急任务，工人已电话确认可出勤');
    expect(insertCall?.[1]).toContain('off_duty');
    expect(insertCall?.[1]).toContain('admin');
    expect(mockSaveDatabase).toHaveBeenCalledOnce();
  });

  it('缺少 overrideReason 应返回 400', async () => {
    const res = await request(app)
      .post('/api/dispatch/override')
      .send({ taskId: 'task-001', workerId: 'w001' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('缺少 taskId 应返回 400', async () => {
    const res = await request(app)
      .post('/api/dispatch/override')
      .send({ workerId: 'w001', overrideReason: '原因' });

    expect(res.status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('缺少 workerId 应返回 400', async () => {
    const res = await request(app)
      .post('/api/dispatch/override')
      .send({ taskId: 'task-001', overrideReason: '原因' });

    expect(res.status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('createdBy 可选：缺省时 INSERT 参数为 null', async () => {
    const res = await request(app)
      .post('/api/dispatch/override')
      .send({
        taskId: 'task-001',
        workerId: 'w001',
        overrideReason: '原因',
        conflictType: 'off_duty',
      });

    expect(res.status).toBe(200);
    const insertCall = mockRun.mock.calls.find((call) => call[0].includes('INSERT INTO dispatch_override_log'));
    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]?.[5]).toBeNull();
  });
});
