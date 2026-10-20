# P0-2 任务↔作业记录强关联 + 修假成功 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 任务状态变更时由后端在同一事务内同步农事操作记录（可按 task_id 关联），并修掉农事操作记录页的 3 处假成功（删除/导出/任务驳回）。

**Architecture:** 后端 `farmTask.ts` 新增 `syncTaskOperationRecord()`，在每个状态流转端点的事务内 upsert 一条 `farm_operation_records`（先按 task_id，回退 source_id 兼容客户端早先创建的记录）。前端页面把删除/导出/驳回接到真实实现，并在验收/驳回后刷新列表。

**Tech Stack:** Express + sql.js + Vitest/supertest；React + Zustand + Vitest(jsdom)。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.2 P0-2）

## Global Constraints

- **禁止主动 commit / push**；每任务收尾只记录变更。
- **禁止删除文件**；禁止批量脚本改编码。
- **新增列必须两处同步**：`server/src/db/schema.ts` 的 CREATE 与 `server/src/db/fixSchemaColumns.ts`（启动时 `fixMissingSchema` 被禁用，只有 `fixSchemaColumns` 会跑）。
- **Fail Loud**：失败必须 throw / return 失败 / 弹窗上报。
- **事务**：所有状态变更已在 `runInTransaction` 内，作业记录写入必须放在同一事务里。
- **日期**：业务日期用本地日期，禁止 `toISOString()` 取日期部分。
- **类型检查**：前端 `npx tsc -p tsconfig.app.json --noEmit`；后端 `npx tsc --noEmit`（server 目录）。
- **浏览器实测**：改组件后必须硬刷新验证。

---

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `server/src/db/schema.ts` | 修改 | `farm_operation_records` CREATE 增加 `task_id` |
| `server/src/db/fixSchemaColumns.ts` | 修改 | 启动补齐 `task_id` 列 + 索引 |
| `server/src/routes/farmTask.ts` | 修改 | 新增 `syncTaskOperationRecord()`，接入 8 个流转端点 |
| `server/src/__tests__/farmTask.operationRecord.test.ts` | 新建 | 验收/驳回写记录测试 |
| `src/hooks/useOperationRecords.ts` | 修改 | 暴露 `refresh()` |
| `src/components/farm/agriculture/AgricultureRecordPage.tsx` | 修改 | 真删除 / 真导出 / 真驳回 / 操作后刷新 |

---

## Task 1: 给 farm_operation_records 加 task_id

**Files:**
- Modify: `server/src/db/schema.ts`（`CREATE TABLE IF NOT EXISTS farm_operation_records`，约 3933 行）
- Modify: `server/src/db/fixSchemaColumns.ts`（`fixSchemaColumns()` 内）

**Interfaces:**
- Produces: `farm_operation_records.task_id TEXT` + 索引 `idx_farm_op_records_task`
- 兼容策略：`task_id` 为空的历史行靠 `source_id` 匹配（客户端早先写入的记录没有 task_id）

- [ ] **Step 1: 在 CREATE 中加列**

在 `server/src/db/schema.ts` 的 `farm_operation_records` 建表语句里，`source_code TEXT,` 后面插入：

```sql
      task_id TEXT,
```

- [ ] **Step 2: 在 fixSchemaColumns 中补列与索引**

在 `fixSchemaColumns()` 的列补齐区末尾（`addedColumns` 汇总之前）插入：

```ts
  // P0-2：农事操作记录 ↔ 农事任务强关联（客户端早先写入的行只有 source_id）
  addedColumns += safeAddColumn(db, 'farm_operation_records', 'task_id', 'TEXT') ? 1 : 0;
```

并在该函数的索引区（`addedIndexes` 汇总之前）插入：

```ts
  safeCreateIndex(db, 'idx_farm_op_records_task',
    'CREATE INDEX IF NOT EXISTS idx_farm_op_records_task ON farm_operation_records(task_id, source_type)');
  addedIndexes += 1;
```

> `safeCreateIndex` 返回 `void`，与文件内其他索引调用一样在其后 `addedIndexes += 1;`。

- [ ] **Step 3: 后端类型检查**

Run: `node "D:/TMcrop/yuanxingtu/V1.1/server/node_modules/typescript/bin/tsc" -p "D:/TMcrop/yuanxingtu/V1.1/server/tsconfig.json" --noEmit`
Expected: 无输出

---

## Task 2: 后端同步作业记录（helper + 8 个端点）

**Files:**
- Modify: `server/src/routes/farmTask.ts`
- Test: `server/src/__tests__/farmTask.operationRecord.test.ts`（Task 3）

**Interfaces:**
- Produces: `syncTaskOperationRecord(db, task, { status, progress?, operatorId?, operatorName? }): void`
- 行为：
  - 查找 `source_type='task' AND (task_id=? OR source_id=?)` 的最早一行
  - 命中 → UPDATE `status`、`progress`（传了才更新）、回填 `task_id`、操作人（非空才覆盖）、`updated_at`
  - 未命中 → INSERT 一条父记录（`record_code` 按当日 `OP{YYYYMMDD}-{四位序号}` 递增，无随机数）
  - 不做 `saveDatabase()`（由 `runInTransaction` 统一落盘）

- [ ] **Step 1: 新增 helper**

在 `server/src/routes/farmTask.ts` 的 `recordTaskOperation()` 之后插入：

```ts
/**
 * P0-2：任务状态变更 → 同步农事操作记录（farm_operation_records）
 *
 * 关联优先级：task_id（本批次起写入） → source_id（客户端早先写入的父记录）
 * 命中则更新状态/进度并回填 task_id；未命中则新建一条父记录。
 * 必须在 runInTransaction 内调用（不在此处 saveDatabase）。
 */
function syncTaskOperationRecord(
  db: any,
  task: any,
  options: {
    status: string;
    progress?: number;
    operatorId?: string;
    operatorName?: string;
  }
): void {
  const { status, progress, operatorId = '', operatorName = '' } = options;
  const now = new Date().toISOString();

  let existingId: string | null = null;
  try {
    const found = db.exec(
      `SELECT id FROM farm_operation_records
       WHERE source_type = 'task' AND (task_id = ? OR source_id = ?)
       ORDER BY created_at ASC LIMIT 1`,
      [task.id, task.id]
    );
    existingId = found?.[0]?.values?.[0]?.[0] ?? null;
  } catch (e) {
    // 老库缺 task_id 列时降级为只按 source_id 匹配，不让主流程失败
    const found = db.exec(
      `SELECT id FROM farm_operation_records
       WHERE source_type = 'task' AND source_id = ?
       ORDER BY created_at ASC LIMIT 1`,
      [task.id]
    );
    existingId = found?.[0]?.values?.[0]?.[0] ?? null;
  }

  if (existingId) {
    db.run(
      `UPDATE farm_operation_records
       SET status = ?,
           progress = COALESCE(?, progress),
           task_id = ?,
           operator_id = COALESCE(NULLIF(?, ''), operator_id),
           operator_name = COALESCE(NULLIF(?, ''), operator_name),
           updated_at = ?
       WHERE id = ?`,
      [status, progress ?? null, task.id, operatorId, operatorName, now, existingId]
    );
    return;
  }

  // 当日序号（禁止 Math.random：业务编码必须可复现）
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `OP${dateStr}-`;
  let seq = 1;
  try {
    const last = db.exec(
      `SELECT record_code FROM farm_operation_records
       WHERE record_code LIKE ? ORDER BY record_code DESC LIMIT 1`,
      [`${prefix}%`]
    );
    const lastCode = last?.[0]?.values?.[0]?.[0];
    if (lastCode) {
      const tail = Number(String(lastCode).split('-').pop());
      if (Number.isFinite(tail)) seq = tail + 1;
    }
  } catch {
    // 序号查询失败用 1，不阻塞写入
  }
  const recordCode = `${prefix}${String(seq).padStart(4, '0')}`;
  const id = `OP_${Date.now()}_${String(seq).padStart(4, '0')}`;

  db.run(
    `INSERT INTO farm_operation_records (
      id, record_code, source_type, source_id, source_code, task_id,
      operation_type, operation_type_name, status,
      greenhouse_id, greenhouse_name, crop_name,
      batch_id, batch_code,
      operator_id, operator_name,
      operation_date, progress, created_at, updated_at
    ) VALUES (?, ?, 'task', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, recordCode, task.id, task.task_code, task.id,
      task.task_type || 'other', task.type_name || task.task_title || task.title || '',
      status,
      task.greenhouse_id || '', task.greenhouse_name || '', task.crop || '',
      task.batch_id || '', task.batch_code || '',
      operatorId, operatorName,
      todayLocal, progress ?? null, now, now,
    ]
  );
}
```

- [ ] **Step 2: 接入 accept**

在 `router.post('/:id/accept')` 的 `runInTransaction` 内，`recordTaskOperation(...)` 之后插入：

```ts
      syncTaskOperationRecord(db, task, {
        status: 'accepted', operatorId: operator_id || '', operatorName: operator_name || '',
      });
```

- [ ] **Step 3: 接入 start**

在 `/:id/start` 的 `recordTaskOperation(...)` 之后插入：

```ts
      syncTaskOperationRecord(db, task, {
        status: 'in_progress', operatorId: operator_id || '', operatorName: operator_name || '',
      });
```

- [ ] **Step 4: 接入 progress**

在 `/:id/progress` 的 `recordTaskOperation(...)` 之后插入：

```ts
      syncTaskOperationRecord(db, task, {
        status: normalizedStatus || 'in_progress',
        progress: newProgress,
        operatorId: operator_id || '',
        operatorName: operator_name || '',
      });
```

- [ ] **Step 5: 接入 submit-acceptance**

在 `/:id/submit-acceptance` 的 `recordTaskOperation(...)` 之后插入：

```ts
      syncTaskOperationRecord(db, task, {
        status: 'waiting_acceptance', progress: 100,
        operatorId: operator_id || '', operatorName: operator_name || '',
      });
```

- [ ] **Step 6: 接入 complete**

在 `/:id/complete` 的 `recordTaskOperation(...)` 之后插入：

```ts
      syncTaskOperationRecord(db, task, {
        status: 'completed', progress: 100,
        operatorId: operator_id || '', operatorName: operator_name || '',
      });
```

- [ ] **Step 7: 接入 reject**

在 `/:id/reject` 的 `recordTaskOperation(...)` 之后插入（注意此处状态是 `newStatus`，可能是 `failed`）：

```ts
      syncTaskOperationRecord(db, task, {
        status: newStatus, operatorId: operator_id || '', operatorName: operator_name || '',
      });
```

- [ ] **Step 8: 接入 cancel**

在 `/:id/cancel` 的 `recordTaskOperation(...)` 之后插入：

```ts
      syncTaskOperationRecord(db, task, {
        status: 'cancelled', operatorId: operator_id || '', operatorName: operator_name || '',
      });
```

- [ ] **Step 9: 接入 abandon**

在 `/:id/abandon` 的 `recordTaskOperation(...)` 之后插入：

```ts
      syncTaskOperationRecord(db, task, {
        status: 'abandoned', operatorId: operator_id || '', operatorName: operator_name || '',
      });
```

- [ ] **Step 10: 后端类型检查**

Run: `node "D:/TMcrop/yuanxingtu/V1.1/server/node_modules/typescript/bin/tsc" -p "D:/TMcrop/yuanxingtu/V1.1/server/tsconfig.json" --noEmit`
Expected: 无输出

---

## Task 3: 后端测试（验收写记录 / 已有记录更新）

**Files:**
- Test: `server/src/__tests__/farmTask.operationRecord.test.ts`（新建）

**Interfaces:**
- Consumes: Task 2 的 `POST /api/farm-tasks/:id/complete`、`/:id/reject`

- [ ] **Step 1: 写测试**

```ts
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

vi.mock('../db/index', () => ({
  getDatabase: vi.fn(() => ({
    run: mockRun,
    exec: mockExec,
    prepare: mockPrepare,
  })),
  saveDatabase: mockSaveDatabase,
}));
vi.mock('../db', () => ({
  getDatabase: vi.fn(() => ({ run: mockRun, exec: mockExec, prepare: mockPrepare })),
  saveDatabase: mockSaveDatabase,
}));

import farmTaskRouter from '../routes/farmTask';

const app = express();
app.use(express.json());
app.use('/api/farm-tasks', farmTaskRouter);

/** 让 SELECT * FROM farm_tasks WHERE id = ? 返回指定任务 */
function mockTaskRow(task: Record<string, unknown>) {
  mockPrepare.mockImplementation(() => ({
    bind: vi.fn(),
    step: vi.fn().mockReturnValueOnce(true).mockReturnValue(false),
    getAsObject: vi.fn(() => task),
    free: vi.fn(),
  }));
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
});
```

- [ ] **Step 2: 运行测试**

Run: `node "D:/TMcrop/yuanxingtu/V1.1/server/node_modules/vitest/vitest.mjs" run "src/__tests__/farmTask.operationRecord.test.ts" --root "D:/TMcrop/yuanxingtu/V1.1/server"`
Expected: 3 passed

---

## Task 4: 前端 hook 暴露 refresh

**Files:**
- Modify: `src/hooks/useOperationRecords.ts`

**Interfaces:**
- Produces: `refresh: () => Promise<void>`（调用 Store 的 `loadRecords()`）

- [ ] **Step 1: 接口加字段**

在 `UseOperationRecordsReturn` 中 `error: string | null;` 之后插入：

```ts
  /** 重新从服务端拉取（任务状态变更后调用） */
  refresh: () => Promise<void>;
```

- [ ] **Step 2: 实现并返回**

在 `useOperationRecords()` 内、`const records = useMemo(...)` 之前插入：

```ts
  const refresh = useCallback(async () => {
    try {
      await loadRecords();
    } catch {
      // 错误已写入 store.error，由页面展示
    }
  }, [loadRecords]);
```

并在返回对象中 `error,` 之后加入 `refresh,`。

- [ ] **Step 3: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 本文件无新增错误

---

## Task 5: 修 3 处假成功

**Files:**
- Modify: `src/components/farm/agriculture/AgricultureRecordPage.tsx`

**Interfaces:**
- Consumes: Task 4 的 `refresh`、`useExport`、`apiFarmTaskService.rejectTask`

- [ ] **Step 1: 补 import**

在文件顶部 import 区加入：

```tsx
import { useExport } from '../../../hooks/farm/useExport';
import { rejectTask as rejectFarmTask } from '../../../services/apiFarmTaskService';
import { useFarmTaskStore } from '../../../stores/farmTaskStore';
```

- [ ] **Step 2: 解构 refresh 与导出 hook**

把 `useOperationRecords()` 解构改为（在原有基础上加 `refresh`）：

```tsx
  const {
    records,
    isLoading,
    error: recordsError,
    refresh,
    expandedIds,
    toggleChildren,
    getFilteredRecords,
    deleteRecord,
  } = useOperationRecords();

  const { handleExport: doExport } = useExport();
```

- [ ] **Step 3: 真删除**

把 `handleConfirmDelete` 替换为：

```tsx
  // 确认删除：逐条调用服务端删除，失败计数并显式报错
  const handleConfirmDelete = async () => {
    const ids = [...selectedRows];
    setShowDeleteWarning(false);

    let failed = 0;
    for (const id of ids) {
      const ok = await deleteRecord(id);
      if (!ok) failed++;
    }

    setBatchDeleteMode(false);
    setSelectedRows([]);

    if (failed > 0) {
      showAlert(`删除完成：成功 ${ids.length - failed} 条，失败 ${failed} 条（失败原因见上方提示）`);
    }
  };
```

- [ ] **Step 4: 删除按钮改为先弹确认框**

把工具栏的 `onBatchDelete` 属性替换为：

```tsx
          onBatchDelete={() => {
            if (!batchDeleteMode) {
              setBatchDeleteMode(true);
              return;
            }
            if (selectedRows.length === 0) {
              showAlert('请先选择要删除的记录');
              return;
            }
            setShowDeleteWarning(true);
          }}
```

- [ ] **Step 5: 真导出**

把 `handleConfirmExport` 替换为：

```tsx
  // 确认导出：把选中记录真正导出为文件
  const handleConfirmExport = async () => {
    const rows = records.filter((r) => selectedRows.includes(r.id));
    const format = exportFormat === 'excel' ? 'xlsx' : (exportFormat as 'csv' | 'word');

    await doExport(
      rows as unknown as Record<string, unknown>[],
      {
        fileNamePrefix: '农事操作记录',
        headers: ['操作单号', '来源', '来源编号', '操作类型', '作物', '区域', '操作人员', '操作日期', '进度', '状态', '备注'],
        getExportData: (record) => {
          const r = record as unknown as FarmOperationRecord;
          return {
            操作单号: r.recordCode,
            来源: SOURCE_CONFIG[r.sourceType as keyof typeof SOURCE_CONFIG]?.label || r.sourceType,
            来源编号: r.sourceCode || '',
            操作类型: r.operationTypeName || r.operationType,
            作物: r.cropName,
            区域: r.greenhouseName,
            操作人员: r.operatorName,
            操作日期: r.operationDate,
            进度: r.progress === undefined ? '' : `${r.progress}%`,
            状态: getStatusLabel(r.status),
            备注: r.remarks || '',
          };
        },
      },
      format,
    );

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };
```

> `getStatusLabel` 是页面内已有函数；`SOURCE_CONFIG` 已在 import 中。

- [ ] **Step 6: 真驳回 + 验收后刷新**

把 `handleAcceptRecord` 与 `handleRejectRecord` 替换为：

```tsx
  // 验收通过记录
  const handleAcceptRecord = async (record: FarmOperationRecord) => {
    if (!record.sourceId || !record.sourceType) {
      showAlert('该记录无法验收：缺少来源信息');
      return;
    }

    if (record.sourceType === 'task') {
      acceptTaskCompletion(record.sourceId);
    } else if (record.sourceType === 'tempTask') {
      acceptCompletion(record.sourceId);
    } else {
      showAlert('该类型记录不支持快速验收');
      return;
    }

    // 状态变更由后端落库，稍后刷新列表
    await refresh();
  };

  // 驳回记录
  const handleRejectRecord = async (record: FarmOperationRecord) => {
    if (!record.sourceId || !record.sourceType) {
      showAlert('该记录无法驳回：缺少来源信息');
      return;
    }

    const reason = prompt('请输入驳回原因（至少 6 个字符）：');
    if (reason === null) return; // 用户取消
    if (reason.trim().length < 6) {
      showAlert('驳回原因至少 6 个字符');
      return;
    }

    if (record.sourceType === 'task') {
      try {
        await rejectFarmTask(record.sourceId, reason.trim());
        await useFarmTaskStore.getState().fetchTasks();
        await refresh();
      } catch (error) {
        showAlert(`任务驳回失败：${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (record.sourceType === 'tempTask') {
      rejectCompletion(record.sourceId, reason);
      await refresh();
    }
  };
```

- [ ] **Step 7: 类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 本文件无新增错误

---

## Task 6: 构建 + 测试 + 浏览器实测

- [ ] **Step 1: 构建**

Run: `npm run build`
Expected: 成功

- [ ] **Step 2: 全量前端测试**

Run: `npx vitest run`
Expected: 全部通过（含新增迁移测试）

- [ ] **Step 3: 后端测试**

Run: `cd server && npx vitest run src/__tests__/farmTask.operationRecord.test.ts src/__tests__/farmOperationRecords.batch.test.ts`
Expected: 7 passed

- [ ] **Step 4: 重启后端（先告知用户）**

`tsx watch` 不重载 routes，必须重启才能生效。

- [ ] **Step 5: 浏览器实测（硬刷新）**

1. `/agriculture-record` 新增一条记录 → 列表出现
2. 进入批量删除模式 → 选中 → 「确认删除」→ 弹出确认框 → 确认 → 行消失；**刷新后仍消失**
3. 选中若干行 → 导出 → 选择 Excel → 确认 → **浏览器真的下载了文件**，打开后表头与数据正确
4. 在 `/farm-hub` 验收一条待验收任务 → 回到 `/agriculture-record` → 该任务的操作记录状态为「已完成」
5. 在 `/agriculture-record` 对一条待验收任务记录点「驳回」→ 输入 ≥6 字原因 → 任务状态变为「返工中」，记录状态同步

---

## 执行记录（2026-10-20）

| 任务 | 状态 | 证据 |
|---|---|---|
| Task 1 task_id 列 + 索引 | 完成 | 重启后实库 `PRAGMA table_info` 含 `task_id` |
| Task 2 helper + 8 端点 | 完成 | `grep -c "syncTaskOperationRecord(db, task"` = 8；后端 tsc 无输出 |
| Task 3 后端测试 | 完成 | 3 passed |
| Task 4 hook refresh | 完成 | 前端 tsc 无新增错误 |
| Task 5 修 3 处假成功 | 完成 | 见下方实测 |
| Task 6 构建/测试 | 完成 | build 成功；37 文件 / 488 用例通过；后端 7 用例通过 |

### 浏览器/接口实测

| 场景 | 结果 |
|---|---|
| 创建任务 → 申请验收 | 后端在同一事务插入 `OP20261020-0001`（source=task，task_id 正确） |
| 验收通过 | 记录状态更新为 `completed`、progress 100；**仅 1 条记录，未重复插入** |
| 页面展示 | `/agriculture-record` 显示「任务派发 / 100% / 已完成」，来源与任务号正确 |
| 批量删除 | 「确认删除」弹出确认框 → 确认后行消失；**刷新后仍为 0，实库 0 行** |
| 导出 Excel | 生成 **真实 xlsx**：MIME `...spreadsheetml.sheet`、魔数 `[80,75,3,4]`（PK）、17,352 字节；表头与数据正确 |
| 驳回 | 任务 status→`rejected`、rework_count=1、驳回原因落库；记录 status→`rejected`，页面显示「已驳回」 |
| 测试数据清理 | 临时任务与记录已删除，`farm_operation_records` 恢复 0 行 |

### 实施中的两处额外修复（超出原计划，均为让功能真正可用）

1. **删除入口此前是双重死路**：工具栏「确认删除」只把 `batchDeleteMode` 再置 true，从不打开确认框。已改为二次点击打开 `DeleteWarningModal`。
2. **导出入口永远无数据可导**：表格只在删除模式渲染复选框，导出按钮打开弹窗时 `selectedRows` 恒为空。已改为未选中时默认导出当前筛选结果。
3. Excel 导出改用 `src/services/exporters/xlsx.ts`（SheetJS），避免共享 `useExport` 的 HTML 伪装 `.xls`。CSV/Word 仍走 `useExport`。

### 未执行

- `cancel` / `abandon` 的浏览器实测（代码已接入并有类型保障，风险低）
- 后端宕机时的错误横幅（与 P0-1 同一遗留项）

## 回滚方案

- 后端新增列为 additive，回滚代码后列保留不影响运行
- 前端回滚 2 个文件即可
- 若任务流转同步记录出现异常，可临时在 `syncTaskOperationRecord` 开头 `return;` 关闭（不影响任务流转本身）

## 已知取舍

- **不做 `daily_records` 互写**：`batch_timeline_view` 只取 `related_type='planting'`，而 `growthState.ts` 会按 `crop_name` 统计所有 `daily_records`，写入 `farm_task` 类型会污染 AI 长势统计。等有真实消费方时再做。
- **不接入 reassign / extend-deadline / remind**：不改变作业执行状态，留待后续按需补。
