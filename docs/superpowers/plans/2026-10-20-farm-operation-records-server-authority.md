# P0-1 农事执行记录服务端权威化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「农事操作记录」的数据源从 `localStorage` 切到后端 `farm_operation_records` 表，让跨设备/跨浏览器可见、刷新不丢，并把历史 localStorage 记录一次性迁移进库（不删除原数据）。

**Architecture:** 后端新增幂等批量写入端点（按 id 去重、整批只落盘一次）；前端 `useFarmOperationRecordStore` 成为唯一写入路径并改为失败抛错；`useOperationRecords` 从「localStorage + fire-and-forget 双写」改为「Store 读取 + 迁移 + 显式报错」，对外 API 保持兼容（除移除 `setRecords`）。

**Tech Stack:** React 18 + TypeScript 5.6 + Zustand 5 + Vitest(jsdom)；后端 Express 4 + sql.js + Vitest + supertest。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.1 P0-1）

## Global Constraints

- **禁止主动 commit / push**：每个任务的收尾是「记录变更并等待用户授权提交」，不要执行 `git commit`。
- **禁止删除任何文件**；禁止用脚本批量遍历目录改编码/缩进/行尾。
- **数据迁移纪律**：迁移成功后**不删除** localStorage 原数据，只写迁移标记。
- **Fail Loud**：任何写入失败必须 throw / return null / 弹窗提示三者之一，禁止 `catch {}` 静默成功。
- **sql.js 落盘**：只有显式 `saveDatabase()` 才落盘；批量写端点整批只调用一次。
- **GET 过滤条件**：`enhancedApiClient.get` 不支持 `params` 对象，必须用 `URLSearchParams` 拼 URL。
- **类型检查命令**：`npx tsc -p tsconfig.app.json --noEmit`（根 `tsconfig.json` 是 `files:[]` 的 solution 配置，会零检查假通过）。
- **浏览器实测**：`src/components/**` 改动必须浏览器实测一次，且在改完弹窗后**硬刷新**再验证。
- **停服纪律**：需要重启后端时先告知用户；`tsx watch` 只对 `src/index.ts` 敏感，改 routes/services 不会自动重载。

---

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `server/src/routes/farmOperationRecords.ts` | 修改 | 新增 `POST /batch` 幂等批量写入 |
| `server/src/__tests__/farmOperationRecords.batch.test.ts` | 新建 | 批量端点测试 |
| `src/stores/useFarmOperationRecordStore.ts` | 重写 | 唯一写入路径；失败抛错；in-flight 去重；支持过滤 |
| `src/services/migrateOperationRecords.ts` | 新建 | localStorage → 后端一次性迁移 |
| `src/__tests__/migrateOperationRecords.test.ts` | 新建 | 迁移解析/去重/失败重试测试 |
| `src/hooks/useOperationRecords.ts` | 重写 | Store 读取 + 迁移触发 + 错误上报；保持对外 API |
| `src/components/farm/agriculture/AgricultureRecordPage.tsx` | 修改 | 移除 `setRecords`；加载/错误态 |
| `src/components/farm/agriculture/modals/AddOperationRecordModal.tsx` | 修改 | 保存改为 await，失败保持弹窗打开 |

---

## Task 1: 后端幂等批量写入端点

**Files:**
- Modify: `server/src/routes/farmOperationRecords.ts`（在 `POST /` 之后、`PUT /:id` 之前插入）
- Test: `server/src/__tests__/farmOperationRecords.batch.test.ts`（Task 2 创建）

**Interfaces:**
- Produces: `POST /api/farm-operation-records/batch`，请求体 `{ records: Record<string, unknown>[] }`，响应 `{ success: true, data: { created: number; skipped: number; failed: number; errors: { id: string; message: string }[] } }`
- 语义：按主键 `id` 去重，已存在则跳过（不覆盖服务端数据）；缺 `id` 记入 `errors`；整批只 `saveDatabase()` 一次。

- [ ] **Step 1: 在路由文件插入批量端点**

在 `server/src/routes/farmOperationRecords.ts` 的 `router.post('/', ...)` 结束之后（约第 156 行 `});` 之后）插入：

```ts
/**
 * 批量创建（幂等）
 * 用途：前端 localStorage 历史数据一次性迁移（P0-1）
 * 语义：按主键 id 去重 —— 已存在的记录跳过，不覆盖服务端数据
 * 落盘：整批只 saveDatabase() 一次（sql.js 每次落盘重写整个库文件）
 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const { records } = req.body as { records?: Record<string, unknown>[] };
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'records 必须是数组' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const errors: { id: string; message: string }[] = [];
    let created = 0;
    let skipped = 0;

    for (const raw of records) {
      const id = typeof raw.id === 'string' ? raw.id : '';
      if (!id) {
        errors.push({ id: '', message: '缺少 id' });
        continue;
      }
      try {
        const data = denormalize(raw);
        db.run(
          `INSERT OR IGNORE INTO farm_operation_records (
            id, record_code, source_type, source_id, source_code,
            operation_type, operation_type_name, status,
            greenhouse_id, greenhouse_name, crop_name, variety, batch_id, batch_code,
            operator_id, operator_name, operation_date, start_time, end_time, duration,
            workload, workload_days, workload_hours, workers, unit,
            materials, gps_location, photos_before, photos_after, voice_note, material_code, remarks,
            progress, progress_increment, area, children, reject_reason,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, data.record_code, data.source_type, data.source_id, data.source_code,
            data.operation_type, data.operation_type_name, data.status,
            data.greenhouse_id, data.greenhouse_name, data.crop_name, data.variety, data.batch_id, data.batch_code,
            data.operator_id, data.operator_name, data.operation_date, data.start_time, data.end_time, data.duration,
            data.workload, data.workload_days, data.workload_hours, data.workers, data.unit,
            data.materials, data.gps_location, data.photos_before, data.photos_after, data.voice_note, data.material_code, data.remarks,
            data.progress, data.progress_increment, data.area, data.children, data.reject_reason,
            data.created_at || now, data.updated_at || now,
          ],
        );
        if (db.getRowsModified() > 0) created++;
        else skipped++;
      } catch (error) {
        errors.push({ id, message: (error as Error).message });
      }
    }

    saveDatabase();
    res.json({ success: true, data: { created, skipped, failed: errors.length, errors } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

- [ ] **Step 2: 类型检查**

Run: `cd server && npx tsc --noEmit`
Expected: 无新增错误（若仓库既有错误，只确认本文件相关行无报错）

---

## Task 2: 批量端点测试

**Files:**
- Test: `server/src/__tests__/farmOperationRecords.batch.test.ts`（新建）

**Interfaces:**
- Consumes: Task 1 的 `POST /api/farm-operation-records/batch`
- Produces: 无（测试文件）

- [ ] **Step 1: 写测试**

创建 `server/src/__tests__/farmOperationRecords.batch.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认通过**

Run: `cd server && npx vitest run src/__tests__/farmOperationRecords.batch.test.ts`
Expected: 4 passed

- [ ] **Step 3: 记录变更（不提交）**

记录：新增 `POST /api/farm-operation-records/batch`。等待用户授权后再 `git add/commit`。

---

## Task 3: Store 改为失败抛错 + in-flight 去重 + 支持过滤

**Files:**
- Modify: `src/stores/useFarmOperationRecordStore.ts`（整文件替换）

**Interfaces:**
- Produces:
  - `loadRecords(filters?: { sourceType?: string; status?: string; sourceId?: string }): Promise<void>`（失败时 `state.error` 有值并 **rethrow**）
  - `addRecord(payload: Partial<FarmOperationRecord>): Promise<FarmOperationRecord>`（失败 **throw**）
  - `updateRecord(id: string, updates: Partial<FarmOperationRecord>): Promise<FarmOperationRecord>`（失败 **throw**）
  - `deleteRecord(id: string): Promise<void>`（失败 **throw**）
  - 并发调用 `loadRecords` 共享同一个 in-flight Promise（只发一次请求）

- [ ] **Step 1: 整文件替换**

`src/stores/useFarmOperationRecordStore.ts` 全文：

```ts
/**
 * 农事操作综合记录 Zustand Store (V2.1 架构)
 * 数据流：enhancedApiClient → /api/farm-operation-records → SQLite
 *
 * 2026-10-20 P0-1：改为服务端权威
 * - 写入失败一律 throw（原实现 catch 后 return null，属静默失败）
 * - loadRecords 支持过滤条件（URLSearchParams 拼 URL，apiClient 不支持 params 对象）
 * - 模块级 in-flight Promise：多组件同时挂载只发一次请求
 *
 * 注：本表与老表 task_operation_records 并存，字段语义/聚合层级不同
 *     （聚合视图 vs 事件流），不取代。
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

export interface FarmOperationRecord {
  id: string;
  recordCode: string;
  sourceType: string;
  sourceId?: string;
  sourceCode?: string;
  operationType: string;
  operationTypeName?: string;
  status?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  cropName?: string;
  variety?: string;
  batchId?: string;
  batchCode?: string;
  operatorId?: string;
  operatorName?: string;
  operationDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  workload?: number;
  workloadDays?: number;
  workloadHours?: number;
  workers?: number;
  unit?: string;
  materials?: { name: string; qty: number; unit: string }[];
  gpsLocation?: { lat: number; lng: number };
  photosBefore?: string[];
  photosAfter?: string[];
  voiceNote?: string;
  materialCode?: string;
  remarks?: string;
  progress?: number;
  progressIncrement?: number;
  area?: string;
  children?: unknown[];
  rejectReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LoadOperationRecordsFilters {
  sourceType?: string;
  status?: string;
  sourceId?: string;
}

/** 模块级 in-flight Promise：多处挂载共享同一次加载 */
let loadInflight: Promise<void> | null = null;

interface FarmOperationRecordState {
  records: FarmOperationRecord[];
  isLoading: boolean;
  error: string | null;

  loadRecords: (filters?: LoadOperationRecordsFilters) => Promise<void>;
  addRecord: (payload: Partial<FarmOperationRecord>) => Promise<FarmOperationRecord>;
  updateRecord: (id: string, updates: Partial<FarmOperationRecord>) => Promise<FarmOperationRecord>;
  deleteRecord: (id: string) => Promise<void>;
}

export const useFarmOperationRecordStore = create<FarmOperationRecordState>()((set) => ({
  records: [],
  isLoading: false,
  error: null,

  loadRecords: (filters) => {
    if (loadInflight) return loadInflight;

    const inflight = (async () => {
      set({ isLoading: true, error: null });
      try {
        const qs = new URLSearchParams();
        if (filters?.sourceType) qs.append('sourceType', filters.sourceType);
        if (filters?.status) qs.append('status', filters.status);
        if (filters?.sourceId) qs.append('sourceId', filters.sourceId);
        const url = `/farm-operation-records${qs.toString() ? `?${qs.toString()}` : ''}`;

        const data = await enhancedApiClient.get<FarmOperationRecord[]>(url);
        set({ records: Array.isArray(data) ? data : [], isLoading: false });
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
        throw error;
      } finally {
        loadInflight = null;
      }
    })();

    loadInflight = inflight;
    return inflight;
  },

  addRecord: async (payload) => {
    const result = await enhancedApiClient.post<FarmOperationRecord>('/farm-operation-records', payload);
    if (!result) throw new Error('创建农事操作记录失败：服务端未返回数据');
    set((s) => ({ records: [result, ...s.records] }));
    return result;
  },

  updateRecord: async (id, updates) => {
    const result = await enhancedApiClient.put<FarmOperationRecord>(`/farm-operation-records/${id}`, updates);
    if (!result) throw new Error('更新农事操作记录失败：服务端未返回数据');
    set((s) => ({ records: s.records.map(r => (r.id === id ? { ...r, ...result } : r)) }));
    return result;
  },

  deleteRecord: async (id) => {
    await enhancedApiClient.delete(`/farm-operation-records/${id}`);
    set((s) => ({ records: s.records.filter(r => r.id !== id) }));
  },
}));
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 本文件无报错（全局既有错误忽略，但不得新增）

---

## Task 4: localStorage 一次性迁移服务

**Files:**
- Create: `src/services/migrateOperationRecords.ts`
- Test: `src/__tests__/migrateOperationRecords.test.ts`

**Interfaces:**
- Produces:
  - `parseStoredRecords(raw: string | null): Record<string, unknown>[]`
  - `splitDemoRecords(records: Record<string, unknown>[]): { real: Record<string, unknown>[]; skippedDemo: number }`
  - `migrateOperationRecordsOnce(): Promise<OperationRecordMigrationResult>`，`OperationRecordMigrationResult = { migrated: number; skippedDemo: number; skippedDuplicate: number; failed: number }`
- 行为：已迁移（flag=`1`）直接返回零值；无数据时写 flag 并返回零值；请求失败 **throw 且不写 flag**（下次重试）；成功写 flag 且 **不删除** `yuanxingtu_operationRecords`。

- [ ] **Step 1: 写失败测试**

创建 `src/__tests__/migrateOperationRecords.test.ts`：

```ts
/**
 * 农事操作记录 localStorage → 后端迁移测试（P0-1）
 * 覆盖：两种存储格式解析 / 演示数据过滤 / 迁移标记 / 失败不写标记
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

vi.mock('@/lib/apiClient', () => ({
  enhancedApiClient: { post: mockPost },
}));

import {
  parseStoredRecords,
  splitDemoRecords,
  migrateOperationRecordsOnce,
} from '../services/migrateOperationRecords';

const LEGACY_KEY = 'yuanxingtu_operationRecords';
const FLAG_KEY = 'yuanxingtu_operationRecords_migrated';

describe('parseStoredRecords', () => {
  it('解析带版本包装的格式 {version, data}', () => {
    const raw = JSON.stringify({ version: 9, data: [{ id: 'OP_1' }] });
    expect(parseStoredRecords(raw)).toEqual([{ id: 'OP_1' }]);
  });

  it('解析旧版裸数组', () => {
    expect(parseStoredRecords(JSON.stringify([{ id: 'OP_2' }]))).toEqual([{ id: 'OP_2' }]);
  });

  it('null 与非法 JSON 返回空数组', () => {
    expect(parseStoredRecords(null)).toEqual([]);
    expect(parseStoredRecords('{bad json')).toEqual([]);
  });

  it('对象但没有 data 数组时返回空数组', () => {
    expect(parseStoredRecords(JSON.stringify({ version: 9, data: 'x' }))).toEqual([]);
  });
});

describe('splitDemoRecords', () => {
  it('id 以 DEMO_ 开头视为演示数据', () => {
    const { real, skippedDemo } = splitDemoRecords([
      { id: 'DEMO_MANUAL_001' },
      { id: 'OP_1750000000000_ab12' },
      { id: 'DEMO_TASK_002' },
    ]);
    expect(skippedDemo).toBe(2);
    expect(real.map(r => r.id)).toEqual(['OP_1750000000000_ab12']);
  });
});

describe('migrateOperationRecordsOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('已迁移过则直接跳过，不发请求', async () => {
    localStorage.setItem(FLAG_KEY, '1');
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'OP_X' }]));

    const result = await migrateOperationRecordsOnce();

    expect(result.migrated).toBe(0);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('无历史数据时写入标记', async () => {
    const result = await migrateOperationRecordsOnce();

    expect(result.migrated).toBe(0);
    expect(localStorage.getItem(FLAG_KEY)).toBe('1');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('真实数据提交到 /farm-operation-records/batch，成功后写标记且保留原数据', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      version: 9,
      data: [{ id: 'OP_1' }, { id: 'DEMO_MANUAL_001' }],
    }));
    mockPost.mockResolvedValue({ created: 1, skipped: 0, failed: 0, errors: [] });

    const result = await migrateOperationRecordsOnce();

    expect(mockPost).toHaveBeenCalledWith('/farm-operation-records/batch', {
      records: [{ id: 'OP_1' }],
    });
    expect(result).toEqual({ migrated: 1, skippedDemo: 1, skippedDuplicate: 0, failed: 0 });
    expect(localStorage.getItem(FLAG_KEY)).toBe('1');
    expect(localStorage.getItem(LEGACY_KEY)).toContain('OP_1');
  });

  it('部分失败时抛错且不写标记，便于下次重试', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'OP_1' }]));
    mockPost.mockResolvedValue({
      created: 0, skipped: 0, failed: 1,
      errors: [{ id: 'OP_1', message: 'NOT NULL constraint failed' }],
    });

    await expect(migrateOperationRecordsOnce()).rejects.toThrow('迁移农事操作记录失败 1 条');
    expect(localStorage.getItem(FLAG_KEY)).toBeNull();
  });

  it('请求抛错时向上抛出，不写标记', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'OP_1' }]));
    mockPost.mockRejectedValue(new Error('NETWORK_OFFLINE: 网络不可用'));

    await expect(migrateOperationRecordsOnce()).rejects.toThrow('NETWORK_OFFLINE');
    expect(localStorage.getItem(FLAG_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/__tests__/migrateOperationRecords.test.ts`
Expected: FAIL —— `Cannot find module '../services/migrateOperationRecords'`

- [ ] **Step 3: 实现迁移服务**

创建 `src/services/migrateOperationRecords.ts`：

```ts
/**
 * 农事操作记录 localStorage → 服务端 一次性迁移（P0-1）
 *
 * 纪律：
 * - 迁移成功后**不删除** localStorage 原数据，只写迁移标记
 * - 演示数据（id 以 DEMO_ 开头，由 generateDemoRecords 生成）不进库
 * - 失败不写标记，下次挂载自动重试
 */
import { enhancedApiClient } from '@/lib/apiClient';

const LEGACY_KEY = 'yuanxingtu_operationRecords';
const MIGRATION_FLAG = 'yuanxingtu_operationRecords_migrated';

export interface OperationRecordMigrationResult {
  migrated: number;
  skippedDemo: number;
  skippedDuplicate: number;
  failed: number;
}

interface BatchResponse {
  created: number;
  skipped: number;
  failed: number;
  errors?: { id: string; message: string }[];
}

const EMPTY_RESULT: OperationRecordMigrationResult = {
  migrated: 0,
  skippedDemo: 0,
  skippedDuplicate: 0,
  failed: 0,
};

/** 解析 localStorage 原始值：兼容 {version, data} 与旧版裸数组 */
export function parseStoredRecords(raw: string | null): Record<string, unknown>[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown }).data)) {
      return (parsed as { data: Record<string, unknown>[] }).data;
    }
    return [];
  } catch {
    return [];
  }
}

/** 拆分演示数据与真实数据（演示数据不入库） */
export function splitDemoRecords(records: Record<string, unknown>[]): {
  real: Record<string, unknown>[];
  skippedDemo: number;
} {
  const real: Record<string, unknown>[] = [];
  let skippedDemo = 0;
  for (const record of records) {
    if (String(record.id ?? '').startsWith('DEMO_')) skippedDemo++;
    else real.push(record);
  }
  return { real, skippedDemo };
}

async function runMigration(): Promise<OperationRecordMigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return { ...EMPTY_RESULT };

  const { real, skippedDemo } = splitDemoRecords(parseStoredRecords(localStorage.getItem(LEGACY_KEY)));

  if (real.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, '1');
    return { ...EMPTY_RESULT, skippedDemo };
  }

  const result = await enhancedApiClient.post<BatchResponse>('/farm-operation-records/batch', { records: real });

  if (!result || typeof result.failed !== 'number') {
    throw new Error('迁移农事操作记录失败：服务端未返回统计结果');
  }
  if (result.failed > 0) {
    const detail = (result.errors ?? []).map(e => `${e.id || '(无 id)'}: ${e.message}`).join('；');
    throw new Error(`迁移农事操作记录失败 ${result.failed} 条：${detail}`);
  }

  localStorage.setItem(MIGRATION_FLAG, '1');
  return {
    migrated: result.created,
    skippedDemo,
    skippedDuplicate: result.skipped,
    failed: 0,
  };
}

let inflight: Promise<OperationRecordMigrationResult> | null = null;

/** 幂等入口：多处挂载共享同一次迁移 */
export function migrateOperationRecordsOnce(): Promise<OperationRecordMigrationResult> {
  if (!inflight) {
    inflight = runMigration().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/__tests__/migrateOperationRecords.test.ts`
Expected: 12 passed（parse 4 + split 1 + migrate 5 = 10；以实际 describe 条目为准，全部通过）

---

## Task 5: 重写 useOperationRecords（Store 读取 + 迁移 + 错误上报）

**Files:**
- Modify: `src/hooks/useOperationRecords.ts`（保留 `FarmOperationRecord` / `FarmOperationRecordChild` 类型与 `generateDemoRecords`；替换顶部 import、`UseOperationRecordsReturn` 接口、以及 `useOperationRecords()` 的实现）

**Interfaces:**
- Consumes: Task 3 的 Store（`loadRecords/addRecord/updateRecord/deleteRecord`）、Task 4 的 `migrateOperationRecordsOnce`
- Produces（对外 API，供 5 个组件使用）:
  - `records: FarmOperationRecord[]`
  - `isLoading: boolean`
  - `error: string | null`
  - `addRecord(...) => Promise<FarmOperationRecord | null>`（失败返回 null 并弹窗，不 throw）
  - `addTaskRecord(...) => Promise<FarmOperationRecord | null>`
  - `addTempTaskRecord(...) => Promise<FarmOperationRecord | null>`
  - `updateRecordStatus(id, status) => Promise<boolean>`
  - `deleteRecord(id) => Promise<boolean>`
  - `getRecord / getRecordsBySource / getRecordsByTaskId / toggleChildren / expandedIds / getFilteredRecords` 保持不变
  - **移除** `setRecords`

> 设计说明：Store 层抛错（编程契约），Hook 层捕获并用 `showAlert` 上报后返回 null（UX 契约）。这样既满足 Fail Loud，又不会在 28 处 fire-and-forget 调用点产生 unhandled rejection。

- [ ] **Step 1: 替换 import 与返回类型声明**

把文件顶部第 7-11 行：

```ts
import React, { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
// 2026-06-04 V2.1 铁律改造：保留原 localStorage 行为，新增 useFarmOperationRecordStore 同步双写
import { useFarmOperationRecordStore } from '../stores/useFarmOperationRecordStore';
import { COMMON_STATUS } from '../types/farm/common';
```

替换为：

```ts
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useFarmOperationRecordStore } from '../stores/useFarmOperationRecordStore';
import type { FarmOperationRecord as StoreOperationRecord } from '../stores/useFarmOperationRecordStore';
import { migrateOperationRecordsOnce } from '../services/migrateOperationRecords';
import { COMMON_STATUS } from '../types/farm/common';
import { showAlert } from '@/lib/dialogService';
```

同时删除不再使用的 `useLocalStorage` 引用。

`generateDemoRecords()` 与其辅助函数 `getDate()` **原样保留、不要删除**：`tsconfig.app.json` 已设 `noUnusedLocals: false`，保留不影响类型检查；演示数据的下线归入 P0-9 批次统一处理。

- [ ] **Step 2: 替换返回类型声明（原 157-190 行区域）**

把 `export interface UseOperationRecordsReturn {` 到 `}` 之间替换为：

```ts
export interface UseOperationRecordsReturn {
  /** 服务端记录（已映射为 Hook 领域类型） */
  records: FarmOperationRecord[];
  /** 首次加载中 */
  isLoading: boolean;
  /** 加载失败信息（null 表示无错误） */
  error: string | null;

  /** 新增手动录入记录；失败返回 null 并弹窗提示 */
  addRecord: (recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'createdAt' | 'updatedAt'>) => Promise<FarmOperationRecord | null>;

  /** 新增任务来源记录（同一任务聚合为父记录 + 子记录） */
  addTaskRecord: (recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'sourceType' | 'createdAt' | 'updatedAt'>) => Promise<FarmOperationRecord | null>;

  /** 新增临时任务来源记录 */
  addTempTaskRecord: (recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'sourceType' | 'createdAt' | 'updatedAt'>) => Promise<FarmOperationRecord | null>;

  /** 更新记录状态 */
  updateRecordStatus: (id: string, status: string) => Promise<boolean>;

  /** 按 id 取记录 */
  getRecord: (id: string) => FarmOperationRecord | undefined;

  /** 按来源类型取记录 */
  getRecordsBySource: (sourceType: OperationSourceType) => FarmOperationRecord[];

  /** 按任务 id 取记录 */
  getRecordsByTaskId: (taskId: string) => FarmOperationRecord[];

  /** 删除记录 */
  deleteRecord: (id: string) => Promise<boolean>;

  /** 展开/折叠子记录 */
  toggleChildren: (id: string) => void;

  /** 已展开的记录 id 集合 */
  expandedIds: Set<string>;

  /** 按条件过滤 */
  getFilteredRecords: (filters: {
    sourceType?: OperationSourceType;
    status?: string;
    operationType?: string;
    greenhouseId?: string;
    operatorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => FarmOperationRecord[];
}
```

- [ ] **Step 3: 替换 Hook 实现（原 650 行至文件末尾）**

把 `export function useOperationRecords(): UseOperationRecordsReturn { ... }` 整段（到文件末尾）替换为：

```ts
/** Store 记录 → Hook 领域记录（补齐必填字段，避免组件层出现 undefined） */
function toHookRecord(record: StoreOperationRecord): FarmOperationRecord {
  return {
    ...record,
    sourceType: record.sourceType as OperationSourceType,
    status: record.status ?? COMMON_STATUS.PENDING,
    greenhouseId: record.greenhouseId ?? '',
    greenhouseName: record.greenhouseName ?? '',
    cropName: record.cropName ?? '',
    operatorId: record.operatorId ?? '',
    operatorName: record.operatorName ?? '',
    operationDate: record.operationDate ?? (record.createdAt ? record.createdAt.slice(0, 10) : ''),
    children: (record.children ?? []) as FarmOperationRecordChild[],
  };
}

/** 统一的写入失败上报（Fail Loud：不让失败悄无声息） */
function reportWriteError(action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  showAlert(`${action}失败：${message}`);
}

export function useOperationRecords(): UseOperationRecordsReturn {
  const storeRecords = useFarmOperationRecordStore((s) => s.records);
  const isLoading = useFarmOperationRecordStore((s) => s.isLoading);
  const error = useFarmOperationRecordStore((s) => s.error);
  const loadRecords = useFarmOperationRecordStore((s) => s.loadRecords);
  const addRecordApi = useFarmOperationRecordStore((s) => s.addRecord);
  const updateRecordApi = useFarmOperationRecordStore((s) => s.updateRecord);
  const deleteRecordApi = useFarmOperationRecordStore((s) => s.deleteRecord);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 挂载：先做一次性 localStorage 迁移，再从服务端加载（服务端是唯一数据源）
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await migrateOperationRecordsOnce();
      } catch (migrationError) {
        reportWriteError('迁移历史农事操作记录', migrationError);
      }
      if (cancelled) return;
      try {
        await loadRecords();
      } catch {
        // 错误已写入 store.error，由页面展示，不重复弹窗
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRecords]);

  const records = useMemo(() => storeRecords.map(toHookRecord), [storeRecords]);

  const toggleChildren = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addRecord = useCallback(async (recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'createdAt' | 'updatedAt'>): Promise<FarmOperationRecord | null> => {
    try {
      const created = await addRecordApi({
        ...recordData,
        id: `OP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        recordCode: generateRecordCode(),
        sourceType: 'manual',
      });
      return toHookRecord(created);
    } catch (writeError) {
      reportWriteError('新增农事操作记录', writeError);
      return null;
    }
  }, [addRecordApi]);

  const addTaskRecord = useCallback(async (recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'sourceType' | 'createdAt' | 'updatedAt'>): Promise<FarmOperationRecord | null> => {
    try {
      const now = new Date().toISOString();
      const current = useFarmOperationRecordStore.getState().records;
      const existing = recordData.sourceId
        ? current.find((r) => r.sourceType === 'task' && r.sourceId === recordData.sourceId)
        : undefined;

      if (existing) {
        const child: FarmOperationRecordChild = {
          id: `OP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          recordCode: generateRecordCode(),
          operationType: recordData.operationType as FarmOperationRecordChild['operationType'],
          operationTypeName: recordData.operationTypeName,
          operatorId: recordData.operatorId,
          operatorName: recordData.operatorName,
          operationDate: recordData.operationDate,
          progress: recordData.progress,
          progressIncrement: recordData.progressIncrement,
          area: recordData.area,
          workload: recordData.workload,
          workloadDays: recordData.workloadDays,
          workloadHours: recordData.workloadHours,
          workers: recordData.workers,
          unit: recordData.unit,
          materials: recordData.materials,
          gpsLocation: recordData.gpsLocation,
          photosBefore: recordData.photosBefore,
          photosAfter: recordData.photosAfter,
          voiceNote: recordData.voiceNote,
          materialCode: recordData.materialCode,
          remarks: recordData.remarks,
          rejectReason: recordData.rejectReason,
          createdAt: now,
        };

        const updated = await updateRecordApi(existing.id, {
          progress: recordData.progress,
          status: recordData.status,
          children: [child, ...((existing.children ?? []) as FarmOperationRecordChild[])],
        });
        return toHookRecord(updated);
      }

      const created = await addRecordApi({
        ...recordData,
        id: `OP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        recordCode: generateRecordCode(),
        sourceType: 'task',
      });
      return toHookRecord(created);
    } catch (writeError) {
      reportWriteError('记录农事任务操作', writeError);
      return null;
    }
  }, [addRecordApi, updateRecordApi]);

  const addTempTaskRecord = useCallback(async (recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'sourceType' | 'createdAt' | 'updatedAt'>): Promise<FarmOperationRecord | null> => {
    try {
      const created = await addRecordApi({
        ...recordData,
        id: `OP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        recordCode: generateRecordCode(),
        sourceType: 'tempTask',
      });
      return toHookRecord(created);
    } catch (writeError) {
      reportWriteError('记录临时任务操作', writeError);
      return null;
    }
  }, [addRecordApi]);

  const updateRecordStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    try {
      await updateRecordApi(id, { status });
      return true;
    } catch (writeError) {
      reportWriteError('更新操作记录状态', writeError);
      return false;
    }
  }, [updateRecordApi]);

  const getRecord = useCallback((id: string) => records.find((record) => record.id === id), [records]);

  const getRecordsBySource = useCallback((sourceType: OperationSourceType) => records.filter((record) => record.sourceType === sourceType), [records]);

  const getRecordsByTaskId = useCallback((taskId: string) => records.filter((record) => record.sourceId === taskId), [records]);

  const deleteRecord = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteRecordApi(id);
      return true;
    } catch (writeError) {
      reportWriteError('删除农事操作记录', writeError);
      return false;
    }
  }, [deleteRecordApi]);

  const getFilteredRecords = useCallback((filters: {
    sourceType?: OperationSourceType;
    status?: string;
    operationType?: string;
    greenhouseId?: string;
    operatorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    return records.filter((record) => {
      if (filters.sourceType && record.sourceType !== filters.sourceType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.operationType && record.operationType !== filters.operationType) return false;
      if (filters.greenhouseId && record.greenhouseId !== filters.greenhouseId) return false;
      if (filters.operatorId && record.operatorId !== filters.operatorId) return false;
      if (filters.dateFrom && record.operationDate < filters.dateFrom) return false;
      if (filters.dateTo && record.operationDate > filters.dateTo) return false;
      return true;
    });
  }, [records]);

  return {
    records,
    isLoading,
    error,
    addRecord,
    addTaskRecord,
    addTempTaskRecord,
    updateRecordStatus,
    getRecord,
    getRecordsBySource,
    getRecordsByTaskId,
    deleteRecord,
    toggleChildren,
    expandedIds,
    getFilteredRecords,
  };
}
```

- [ ] **Step 4: 保留项确认**

确认 `generateDemoRecords()`、`getDate()` 以及文件末尾的 `export type { ... }` 注释仍在文件中，未被本次替换误删。

- [ ] **Step 5: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 本文件无报错

---

## Task 6: 调用点适配

**Files:**
- Modify: `src/components/farm/agriculture/AgricultureRecordPage.tsx`
- Modify: `src/components/farm/agriculture/modals/AddOperationRecordModal.tsx`

**Interfaces:**
- Consumes: Task 5 的 `useOperationRecords()`（`setRecords` 已移除，新增 `isLoading` / `error`）

- [ ] **Step 1: AgricultureRecordPage 移除 setRecords**

把：

```tsx
  const {
    records,
    setRecords,
    expandedIds,
    toggleChildren,
    getFilteredRecords,
  } = useOperationRecords();
```

替换为：

```tsx
  const {
    records,
    isLoading,
    error: recordsError,
    expandedIds,
    toggleChildren,
    getFilteredRecords,
  } = useOperationRecords();
```

- [ ] **Step 2: 删除两处强制重渲染调用**

把 `handleAcceptRecord` 中的：

```tsx
    // 触发刷新 - 通过 setRecords 重新渲染组件
    setRecords(r => [...r]);
```

删除。

把 `handleRejectRecord` 中的：

```tsx
      // 触发刷新 - 通过 setRecords 重新渲染组件
      setRecords(r => [...r]);
```

删除。

（Zustand 状态变化本身会触发重渲染，原写法是为 localStorage 的 React state 兜底。）

- [ ] **Step 3: 新增加载/错误提示**

在筛选工具栏之后、表格容器之前插入：

```tsx
      {recordsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          农事操作记录加载失败：{recordsError}
        </div>
      )}
```

把表格体中的空态判断：

```tsx
              {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={batchDeleteMode ? 12 : 11} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
```

替换为：

```tsx
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={batchDeleteMode ? 12 : 11} className="px-4 py-8 text-center text-gray-500">
                    加载中…
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={batchDeleteMode ? 12 : 11} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
```

- [ ] **Step 4: AddOperationRecordModal 保存改为 await**

把 `const handleSave = () => {` 改为 `const handleSave = async () => {`。

把函数末尾：

```tsx
    // 添加记录
    addRecord({
```

改为：

```tsx
    // 添加记录
    const saved = await addRecord({
```

并把紧随其后的：

```tsx
    });

    handleClose();
  };
```

改为：

```tsx
    });

    // 保存失败时保持弹窗打开：错误已由 useOperationRecords 弹窗提示
    if (!saved) return;

    handleClose();
  };
```

- [ ] **Step 5: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 本仓库既有报错之外无新增

- [ ] **Step 6: 检查是否还有残留 setRecords 调用**

Run: `rg -n "setRecords" src/components/farm/agriculture src/hooks/useOperationRecords.ts`
Expected: 无输出

---

## Task 7: 构建 + 浏览器实测

**Files:**
- 无代码改动

**Interfaces:**
- Consumes: Task 1-6 全部

- [ ] **Step 1: 构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 2: 后端测试**

Run: `cd server && npm run test:run -- src/__tests__/farmOperationRecords.batch.test.ts`
Expected: 4 passed

- [ ] **Step 3: 前端测试**

Run: `npx vitest run src/__tests__/migrateOperationRecords.test.ts`
Expected: 全部 passed

- [ ] **Step 4: 数据库验证（迁移前基线）**

告知用户后再重启后端，然后：

Run:
```bash
node -e "const init=require('./server/node_modules/sql.js');const fs=require('fs');init().then(SQL=>{const db=new SQL.Database(fs.readFileSync('./server/data/yuanxingtu.db'));const r=db.exec('SELECT COUNT(*) FROM farm_operation_records');console.log('迁移前行数:',r[0].values[0][0]);});"
```
Expected: 记录当前行数（基线）

- [ ] **Step 5: 浏览器实测（必须硬刷新）**

打开 `http://localhost:5188/agriculture-record`，刷新两次后验证：

1. 页面显示「加载中…」后出结果，无报错横幅
2. 新增一条操作记录（新增→填写必填项→保存）→ 弹窗关闭，列表首行出现该记录
3. **硬刷新（Ctrl+F5）** → 该记录仍在（证明已落库，不再依赖 localStorage）
4. 打开另一个浏览器/无痕窗口 → 同一账号登录 → 该记录可见（证明跨浏览器）
5. 后端数据库中执行：`SELECT COUNT(*) FROM farm_operation_records` → 行数增加

- [ ] **Step 6: 迁移验证**

在**有历史 localStorage 数据**的浏览器（通常是长期使用的那个）打开 `/agriculture-record`：

1. Console 执行 `localStorage.getItem('yuanxingtu_operationRecords_migrated')` → `'1'`
2. Console 执行 `localStorage.getItem('yuanxingtu_operationRecords')` → **仍存在**（未被删除）
3. 数据库中行数增加，且新增行中 `id` 不以 `DEMO_` 开头

- [ ] **Step 7: 失败路径验证**

临时停掉后端（先告知用户），刷新页面：
Expected: 页面显示「农事操作记录加载失败：…」红色横幅，不出现假空态。

恢复后端后刷新 → 数据恢复正常。

- [ ] **Step 8: 记录变更（不提交）**

汇总本次改动文件清单，等待用户授权后再 `git add` / `git commit`。

---

## 执行记录（2026-10-20）

| 任务 | 状态 | 证据 |
|---|---|---|
| Task 1 后端批量端点 | 完成 | `server tsc --noEmit` 无输出 |
| Task 2 批量端点测试 | 完成 | 4 passed |
| Task 3 Store 重写 | 完成 | 涉及文件 tsc 无错误 |
| Task 4 迁移服务 | 完成 | 10 passed（先红后绿） |
| Task 5 Hook 重写 | 完成 | 涉及文件 tsc 无错误 |
| Task 6 调用点适配 | 完成 | `setRecords` 残留 0 处 |
| Task 7 构建 | 完成 | `npm run build` 成功（1m10s） |
| Task 7 全量前端测试 | 完成 | 37 文件 / 488 用例全通过 |
| Task 7 浏览器实测 | 完成 | 见下方实测结论 |
| Task 7 失败路径实测 | **未执行** | 需再次停服，留待下次维护窗口 |

### 浏览器实测结论

- `/agriculture-record` 首屏：显示「暂无数据 共 0 条」，**无错误横幅**，控制台无本次相关错误
- 新增记录：`OP20261020-8720`（手动录入 / 灌溉 / QA-TEST-CROP）保存成功，列表首行出现
- 整页重载后记录仍在
- **清除 `yuanxingtu_operationRecords*` 两个 localStorage 键后重载，记录仍显示** → 证明数据来自服务端而非本地
- 数据库实测：`SELECT ... FROM farm_operation_records` 可查到该行（id `OP_1792455139314_owcch5`）
- 迁移标记：无历史数据时写入 `yuanxingtu_operationRecords_migrated=1`，原始键不存在（符合预期）
- 回归：`/my-tasks`（67 条任务）、`/temp-task`（20 条）均正常渲染
- 测试数据已通过 `DELETE /api/farm-operation-records/:id` 清理，库内恢复 0 行

### 遗留观察（非本次引入）

`AgricultureRecordPage` 的 `<React.Fragment key={record.id}>` 被 vite `sourceIdentifierPlugin` 注入 `data-matrix-id`，React 开发模式报「Invalid prop supplied to React.Fragment」。该行本次未改动，属既有噪声，仅影响开发控制台，不影响功能。

## 验收标准（对应 Spec §3.1）

- [ ] `SELECT COUNT(*) FROM farm_operation_records` > 0，且等于迁移前 localStorage 真实记录数（不含 `DEMO_` 行）
- [ ] A 浏览器新建记录 → B 浏览器刷新可见
- [ ] 刷新页面记录不丢
- [ ] 加载失败时页面有明确错误提示（不是空列表）
- [ ] localStorage 原数据仍在，仅新增迁移标记
- [ ] 全站无残留 `setRecords` 调用

## 回滚方案

- 后端表数据保留，不回滚
- 前端如需回滚：恢复 `useOperationRecords.ts` 与 `useFarmOperationRecordStore.ts` 两个文件的历史版本即可；localStorage 数据一直在，不会丢
- 迁移标记 `yuanxingtu_operationRecords_migrated` 可手动删除以重跑迁移（批量端点幂等，不会产生重复行）
