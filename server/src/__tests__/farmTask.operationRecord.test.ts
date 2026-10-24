/**
 * P0-2：任务状态流转同步农事操作记录
 * 覆盖：无既有记录 → INSERT；已有 source_id 记录 → UPDATE；驳回 → 状态同步
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRun, mockExec, mockSaveDatabase, mockPrepare } = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockExec: vi.fn(),
  mockSaveDatabase: vi.fn(),
  mockPrepare: vi.fn(),
}));

vi.mock('../db', () => ({
  getDatabase: vi.fn(() => ({ run: mockRun, exec: mockExec, prepare: mockPrepare })),
  saveDatabase: mockSaveDatabase,
}));

import farmTaskRouter from '../routes/farmTask';

const app = express();
app.use(express.json());
app.use('/api/farm-tasks', farmTaskRouter);

/**
 * 让 SELECT * FROM farm_tasks WHERE id = ? 返回指定任务
 *
 * 2026-10-24（E3）：按 SQL 分派 —— 只有查 farm_tasks 才返回任务行。
 *   起因：E3 给 farm_operation_records 的操作人 id 加了归一
 *   （resolveEmployeeIdentity 会查 employees / users），原 mock 对任何 SELECT
 *   都返回任务行，导致 employees 查询"命中"任务对象、把 operator_name 覆盖成 undefined。
 *   真实库里 'U1' 不是员工，查询应返回空行。
 */
function mockTaskRow(task: Record<string, unknown>) {
  mockPrepare.mockImplementation((sql: string) => ({
    bind: vi.fn(),
    step: vi.fn().mockReturnValueOnce(String(sql).includes('FROM farm_tasks')).mockReturnValue(false),
    getAsObject: vi.fn(() => task),
    free: vi.fn(),
  }));
}

/**
 * 2026-10-24（E3）：让 employees 查询返回一个员工，用于验证操作人 id 归一生效
 * @param employee 命中的员工档案
 */
function mockTaskRowWithEmployee(task: Record<string, unknown>, employee: { id: string; name: string }) {
  mockPrepare.mockImplementation((sql: string) => {
    const s = String(sql);
    let hit = false;
    if (s.includes('FROM employees')) hit = true;
    else if (s.includes('FROM farm_tasks')) hit = true;
    return {
      bind: vi.fn(),
      step: vi.fn().mockReturnValueOnce(hit).mockReturnValue(false),
      getAsObject: vi.fn(() => (s.includes('FROM employees') ? employee : task)),
      free: vi.fn(),
    };
  });
}

const task = {
  id: 'NS20261020-001',
  task_code: 'NS20261020-001',
  task_title: '灌溉测试任务',
  task_type: 'irrigation',
  type_name: '灌溉',
  status: 'waiting_acceptance',
  progress: 100,
  greenhouse_id: 'GH_001',
  greenhouse_name: '玻璃温室A区',
  crop: '番茄',
  batch_code: 'ZZ20261001-001',
};

describe('P0-2 任务流转同步农事操作记录', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExec.mockReturnValue([]);   // 默认：没有已存在的操作记录
  });

  it('验收通过且无既有记录 → 插入一条 completed 记录并带 task_id', async () => {
    mockTaskRow(task);

    const res = await request(app)
      .post('/api/farm-tasks/NS20261020-001/complete')
      .send({ comments: 'ok', operator_id: 'U1', operator_name: '验收员' });

    expect(res.status).toBe(200);
    const insertCall = mockRun.mock.calls.find((c) => String(c[0]).includes('INSERT INTO farm_operation_records'));
    expect(insertCall).toBeDefined();
    expect(insertCall![1]).toContain('NS20261020-001');
    expect(insertCall![1]).toContain('completed');
    expect(insertCall![1]).toContain('验收员');
    expect(mockSaveDatabase).toHaveBeenCalled();
  });

  it('已有 source_id 记录 → 更新而不重复插入', async () => {
    mockTaskRow(task);
    mockExec.mockReturnValue([{ values: [['OP_EXISTING']] }]);

    const res = await request(app)
      .post('/api/farm-tasks/NS20261020-001/complete')
      .send({ operator_id: 'U1', operator_name: '验收员' });

    expect(res.status).toBe(200);
    const updateCall = mockRun.mock.calls.find((c) => String(c[0]).includes('UPDATE farm_operation_records'));
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toContain('OP_EXISTING');
    const insertCall = mockRun.mock.calls.find((c) => String(c[0]).includes('INSERT INTO farm_operation_records'));
    expect(insertCall).toBeUndefined();
  });

  it('驳回 → 记录状态同步为 rejected', async () => {
    mockTaskRow({ ...task, status: 'waiting_acceptance', rework_count: 0 });
    mockExec.mockReturnValue([{ values: [['OP_EXISTING']] }]);

    const res = await request(app)
      .post('/api/farm-tasks/NS20261020-001/reject')
      .send({ reason: '作业质量不达标', operator_id: 'U1', operator_name: '验收员' });

    expect(res.status).toBe(200);
    const updateCall = mockRun.mock.calls.find((c) => String(c[0]).includes('UPDATE farm_operation_records'));
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toContain('rejected');
  });

  // 2026-10-24（E3）：操作人 id 归一为 employees.id
  it('操作人是员工档案 id → 写入时归一后的 id 与姓名', async () => {
    mockTaskRowWithEmployee(task, { id: 'EMP_007', name: '陆启闯' });
    mockExec.mockReturnValue([]);

    const res = await request(app)
      .post('/api/farm-tasks/NS20261020-001/complete')
      .send({ comments: 'ok', operator_id: 'EMP_007', operator_name: '陆启闯' });

    expect(res.status).toBe(200);
    const insertCall = mockRun.mock.calls.find((c) => String(c[0]).includes('INSERT INTO farm_operation_records'));
    expect(insertCall).toBeDefined();
    expect(insertCall![1]).toContain('EMP_007');
    expect(insertCall![1]).toContain('陆启闯');
  });
});
