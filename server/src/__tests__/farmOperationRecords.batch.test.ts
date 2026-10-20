/**
 * POST /api/farm-operation-records/batch 测试（P0-1 迁移端点）
 * 覆盖：新记录插入 / id 重复跳过 / 缺 id 记错 / 非数组 400 / 整批只落盘一次
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRun, mockSaveDatabase, mockGetRowsModified } = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockSaveDatabase: vi.fn(),
  mockGetRowsModified: vi.fn(),
}));

vi.mock('../db/index', () => ({
  getDatabase: vi.fn(() => ({ run: mockRun, getRowsModified: mockGetRowsModified })),
  saveDatabase: mockSaveDatabase,
}));

import farmOperationRecordsRouter from '../routes/farmOperationRecords';

const app = express();
app.use(express.json());
app.use('/api/farm-operation-records', farmOperationRecordsRouter);

describe('POST /api/farm-operation-records/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRowsModified.mockReturnValue(1);
  });

  it('新记录全部插入，created 计数正确，且整批只落盘一次', async () => {
    const res = await request(app)
      .post('/api/farm-operation-records/batch')
      .send({
        records: [
          { id: 'OP_1', recordCode: 'OP20261020-0001', sourceType: 'manual', operationType: 'irrigation' },
          { id: 'OP_2', recordCode: 'OP20261020-0002', sourceType: 'manual', operationType: 'weeding' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ created: 2, skipped: 0, failed: 0 });
    expect(res.body.data.errors).toEqual([]);
    expect(mockRun).toHaveBeenCalledTimes(2);
    expect(mockSaveDatabase).toHaveBeenCalledOnce();

    const sql = String(mockRun.mock.calls[0][0]);
    expect(sql).toContain('INSERT OR IGNORE INTO farm_operation_records');
    expect(mockRun.mock.calls[0][1]).toContain('OP_1');
    expect(mockRun.mock.calls[0][1]).toContain('OP20261020-0001');
  });

  it('id 已存在时跳过，不覆盖服务端数据', async () => {
    mockGetRowsModified.mockReturnValue(0);

    const res = await request(app)
      .post('/api/farm-operation-records/batch')
      .send({ records: [{ id: 'OP_EXIST', recordCode: 'OP20261020-0003', sourceType: 'manual', operationType: 'irrigation' }] });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ created: 0, skipped: 1, failed: 0 });
    expect(mockGetRowsModified).toHaveBeenCalledTimes(1);
    expect(mockSaveDatabase).toHaveBeenCalledOnce();
  });

  it('缺少 id 记入 errors，不静默丢弃', async () => {
    const res = await request(app)
      .post('/api/farm-operation-records/batch')
      .send({ records: [{ recordCode: 'OP20261020-0004', sourceType: 'manual', operationType: 'irrigation' }] });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.created).toBe(0);
    expect(res.body.data.errors[0].message).toBe('缺少 id');
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('records 不是数组时返回 400', async () => {
    const res = await request(app)
      .post('/api/farm-operation-records/batch')
      .send({ records: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockSaveDatabase).not.toHaveBeenCalled();
  });
});
