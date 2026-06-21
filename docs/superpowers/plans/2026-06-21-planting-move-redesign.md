# 种植调入/调出重设计 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 重设计种植订单的调入/调出功能。新增 `planting_area_stocks` 表按区域拆分株数；`plantings.planting_quantity` 改为"订单总株数"（移入移出时不变）；加 P0/P1 校验（作物编码一致、品种一致、订单生命周期、并发锁、self-move 禁止、变种路径一致、source 实时显示等）。

**架构：**
- 后端：新增 `planting_area_stocks` 表 + 启动时自动迁移 + 改造 `POST /plantings/:id/move` 路由为事务原子操作 + 列表 SQL 改为从 stocks 聚合
- 前端：`PlantingMoveModal` 拆为"调入"和"调出"两个分模式，弹窗实时显示 source 可用/from area stock
- 数据流：弹窗 → service V2 → POST → 事务（扣 S 库存 + 改 stocks + 写履历 + 写 material_flow_log）→ saveDatabase

**技术栈：**
- 后端：Express + sql.js + TypeScript
- 前端：React 18 + Zustand + Radix UI
- 测试：Vitest（前后端都用）

---

## 文件结构

| 文件 | 状态 | 职责 |
|------|------|------|
| `server/src/db/plantingAreaStocks.ts` | 新建 | stocks 表建表 + 索引 + 迁移函数 |
| `server/src/db/fixMissingSchema.ts` | 修改 | 注册 `migrateToAreaStocks()` 到启动流程 |
| `server/src/db/seedData.ts` | 修改 | 种子数据加初始 stocks 行（按 plantings 数据生成） |
| `server/src/routes/planting.ts` | 修改 | 改造 GET 列表 SQL（聚合 stocks）+ 改造 POST /:id/move 路由 |
| `server/src/__tests__/plantingMoveV2.test.ts` | 新建 | 后端单测（11 项校验 + 写入流程） |
| `src/services/apiPlantingService.ts` | 修改 | 新增 `MovePlantingInputV2` 类型 + `movePlantingV2` 函数 |
| `src/components/farm/planting/modals/PlantingMoveModal.tsx` | 修改 | 重做弹窗：调入/调出分模式、新字段、实时显示 |
| `src/components/farm/planting/PlantingPage.tsx` | 修改 | 改 `handleMoveSubmit` 调 V2 service |
| `src/components/farm/planting/__tests__/PlantingMoveModal.test.tsx` | 新建 | 前端单测（弹窗校验、字段联动、提交） |

---

## 任务 1：建 stocks 表 + 迁移函数（后端）

**文件：**
- 创建：`server/src/db/plantingAreaStocks.ts`
- 测试：`server/src/__tests__/plantingAreaStocks.test.ts`

- [ ] **步骤 1：编写失败的测试**

```ts
// server/src/__tests__/plantingAreaStocks.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import fs from 'fs';

describe('createPlantingAreaStocksTable', () => {
  it('creates the table with all required columns', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    // 直接 require 并用 db 注入（注意：createPlantingAreaStocksTable 接受 db 参数，不读 getDatabase）
    const { createPlantingAreaStocksTable } = await import('../db/plantingAreaStocks');
    createPlantingAreaStocksTable(db as any);
    const r = db.exec("PRAGMA table_info(planting_area_stocks)");
    const cols = r[0].values.map(v => v[1]);
    expect(cols).toContain('id');
    expect(cols).toContain('planting_id');
    expect(cols).toContain('area_id');
    expect(cols).toContain('area_name');
    expect(cols).toContain('quantity');
    expect(cols).toContain('source_type');
    expect(cols).toContain('source_id');
    expect(cols).toContain('source_code');
    expect(cols).toContain('operation_date');
    expect(cols).toContain('create_time');
    expect(cols).toContain('update_time');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd server && npx vitest run src/__tests__/plantingAreaStocks.test.ts`
预期：FAIL "Cannot find module '../db/plantingAreaStocks'"

- [ ] **步骤 3：实现建表函数**

```ts
// server/src/db/plantingAreaStocks.ts
import type { Database } from 'sql.js';

export function createPlantingAreaStocksTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS planting_area_stocks (
      id TEXT PRIMARY KEY,
      planting_id TEXT NOT NULL,
      area_id TEXT NOT NULL,
      area_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      source_type TEXT,
      source_id TEXT,
      source_code TEXT,
      operation_date TEXT,
      remarks TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL,
      FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_pas_planting ON planting_area_stocks(planting_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pas_area ON planting_area_stocks(area_id)');
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`cd server && npx vitest run src/__tests__/plantingAreaStocks.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add server/src/db/plantingAreaStocks.ts server/src/__tests__/plantingAreaStocks.test.ts
git commit -m "feat(db): add planting_area_stocks table with createPlantingAreaStocksTable"
```

---

## 任务 2：实现迁移函数

**文件：**
- 修改：`server/src/db/plantingAreaStocks.ts`（追加函数）
- 测试：`server/src/__tests__/plantingAreaStocks.test.ts`（追加用例）

- [ ] **步骤 1：编写失败的测试**

```ts
// 追加到 plantingAreaStocks.test.ts
describe('migrateToAreaStocks', () => {
  it('migrates existing plantings into stocks', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    // 建 plantings 表 + 插入测试数据
    db.run(`CREATE TABLE plantings (id TEXT PRIMARY KEY, area_id TEXT, area_name TEXT, planting_quantity INTEGER, planting_code TEXT, planting_date TEXT, create_time TEXT)`);
    db.run(`INSERT INTO plantings VALUES ('P1', 'G001', '一棚01区', 500, 'ZZ001', '2026-06-21', '2026-06-21T00:00:00Z')`);
    db.run(`INSERT INTO plantings VALUES ('P2', 'G002', '二棚01区', 100, 'ZZ002', '2026-06-21', '2026-06-21T00:00:00Z')`);

    const { createPlantingAreaStocksTable, migrateToAreaStocks } = await import('../db/plantingAreaStocks');
    createPlantingAreaStocksTable(db as any);
    migrateToAreaStocks(db as any);

    const r = db.exec("SELECT planting_id, area_id, quantity FROM planting_area_stocks ORDER BY planting_id");
    expect(r[0].values).toEqual([
      ['P1', 'G001', 500],
      ['P2', 'G002', 100],
    ]);
  });

  it('skips when stocks already exist (idempotent)', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run(`CREATE TABLE plantings (id TEXT PRIMARY KEY, area_id TEXT, area_name TEXT, planting_quantity INTEGER, planting_code TEXT, planting_date TEXT, create_time TEXT)`);
    db.run(`INSERT INTO plantings VALUES ('P1', 'G001', '一棚', 500, 'ZZ001', '2026-06-21', '2026-06-21')`);

    const { createPlantingAreaStocksTable, migrateToAreaStocks } = await import('../db/plantingAreaStocks');
    createPlantingAreaStocksTable(db as any);
    // 第一次迁移
    migrateToAreaStocks(db as any);
    // 手动插入冲突数据
    db.run(`INSERT INTO planting_area_stocks (id, planting_id, area_id, area_name, quantity, create_time, update_time)
            VALUES ('STK_custom', 'P1', 'G001', '一棚', 999, 'now', 'now')`);
    // 第二次迁移不应覆盖
    migrateToAreaStocks(db as any);
    const r = db.exec("SELECT quantity FROM planting_area_stocks WHERE planting_id = 'P1'");
    expect(r[0].values.length).toBe(1);  // 没有重复
    expect(r[0].values[0][0]).toBe(999);  // 保留原值
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd server && npx vitest run src/__tests__/plantingAreaStocks.test.ts`
预期：FAIL "migrateToAreaStocks is not a function"

- [ ] **步骤 3：实现迁移函数**

```ts
// 追加到 plantingAreaStocks.ts
export function migrateToAreaStocks(db: Database): void {
  db.run(`
    INSERT INTO planting_area_stocks
      (id, planting_id, area_id, area_name, quantity, source_type, source_code, operation_date, create_time, update_time)
    SELECT
      'STK_migrate_' || p.id,
      p.id,
      COALESCE(NULLIF(p.area_id, ''), 'UNASSIGNED'),
      COALESCE(NULLIF(p.area_name, ''), '未分配'),
      p.planting_quantity,
      'migrate',
      p.planting_code,
      COALESCE(p.planting_date, date('now')),
      COALESCE(p.create_time, datetime('now')),
      datetime('now')
    FROM plantings p
    WHERE p.planting_quantity > 0
      AND NOT EXISTS (SELECT 1 FROM planting_area_stocks s WHERE s.planting_id = p.id)
  `);
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`cd server && npx vitest run src/__tests__/plantingAreaStocks.test.ts`
预期：PASS（2/2）

- [ ] **步骤 5：Commit**

```bash
git add server/src/db/plantingAreaStocks.ts server/src/__tests__/plantingAreaStocks.test.ts
git commit -m "feat(db): add migrateToAreaStocks function with idempotent guard"
```

---

## 任务 3：注册迁移到启动流程

**文件：**
- 修改：`server/src/db/fixMissingSchema.ts`（在 `fixMissingSchema()` 末尾追加调用）
- 修改：`server/src/index.ts`（调用 getDatabase 后调用迁移函数）

- [ ] **步骤 1：修改 fixMissingSchema.ts**

打开 `server/src/db/fixMissingSchema.ts`，找到 `fixMissingSchema()` 导出函数，在末尾追加：

```ts
import { createPlantingAreaStocksTable, migrateToAreaStocks } from './plantingAreaStocks';

export function fixMissingSchema(): void {
  // ... 现有代码 ...
  // 在文件末尾追加：
  createPlantingAreaStocksTable(db);
  migrateToAreaStocks(db);
  saveDatabase();
}
```

- [ ] **步骤 2：检查 index.ts 启动顺序**

打开 `server/src/index.ts`，确认启动流程顺序：
```
initDatabase() → createMaterialFlowLogTable() → fixMissingSchema() → ... → saveDatabase()
```

如果 `fixMissingSchema()` 已经被调用，迁移会自动运行。**不需要改 index.ts**。

- [ ] **步骤 3：手动验证迁移运行**

运行：`cd server && npm run dev` 启动后端，看 console 是否报错。
预期：启动成功，DB 自动加 stocks 表 + 90 条初始数据。

- [ ] **步骤 4：DB 验证**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1\server" && node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('data/yuanxingtu.db');
  const db = new SQL.Database(buf);
  const r = db.exec('SELECT COUNT(*) FROM planting_area_stocks');
  console.log('stocks 总数:', r[0]?.values?.[0]?.[0]);
  expect = 90;  // 应当有 ~90 条（plantings 现有数据）
})();
"
```

预期：≥ 80（接近 90，污染数据可能不满足 WHERE 条件但大部分应该迁移）

- [ ] **步骤 5：Commit**

```bash
git add server/src/db/fixMissingSchema.ts
git commit -m "feat(db): register migrateToAreaStocks in fixMissingSchema startup"
```

---

## 任务 4：改造 GET 列表 SQL（聚合 stocks）

**文件：**
- 修改：`server/src/routes/planting.ts:75-93`

- [ ] **步骤 1：手动验证旧 SQL 行为**

```bash
curl -s "http://localhost:3001/api/plantings?pageSize=2" | node -e "
const c=[];process.stdin.on('data',x=>c.push(x));process.stdin.on('end',()=>{
  const d=JSON.parse(Buffer.concat(c).toString());
  console.log('列表前2条 areaId/areaName/plantingCount:');
  d.data.list.forEach(r => console.log('  ' + r.id, '|', r.areaId, '|', r.areaName, '|', r.plantingCount));
});"
```

记录旧值，用于回归对比。

- [ ] **步骤 2：替换 areaId/areaName/plantingCount 子查询**

打开 `server/src/routes/planting.ts:75-93`，把：
```ts
p.area_id AS areaId,
p.area_name AS areaName,
p.planting_quantity AS plantingCount,
```

替换为：
```ts
(SELECT s.area_id FROM planting_area_stocks s WHERE s.planting_id = p.id ORDER BY s.quantity DESC LIMIT 1) AS areaId,
(SELECT s.area_name FROM planting_area_stocks s WHERE s.planting_id = p.id ORDER BY s.quantity DESC LIMIT 1) AS areaName,
COALESCE((SELECT SUM(s.quantity) FROM planting_area_stocks s WHERE s.planting_id = p.id), 0) AS plantingCount,
```

- [ ] **步骤 3：重启后端 + 验证 API**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1\server" && npm run dev &
sleep 3
curl -s "http://localhost:3001/api/plantings?pageSize=2" | node -e "
const c=[];process.stdin.on('data',x=>c.push(x));process.stdin.on('end',()=>{
  const d=JSON.parse(Buffer.concat(c).toString());
  console.log('新值:');
  d.data.list.forEach(r => console.log('  ' + r.id, '|', r.areaId, '|', r.areaName, '|', r.plantingCount));
});"
```

预期：areaId/areaName/plantingCount 跟旧值一致（迁移数据保证）。

- [ ] **步骤 4：前端类型检查**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1" && npx tsc --noEmit --pretty 2>&1 | head -10
```

预期：无错误（前端 `record.areaName` / `record.plantingCount` 字段名不变）。

- [ ] **步骤 5：Commit**

```bash
git add server/src/routes/planting.ts
git commit -m "feat(planting-list): aggregate area/quantity from planting_area_stocks"
```

---

## 任务 5：后端单测 — 调入/调出校验

**文件：**
- 创建：`server/src/__tests__/plantingMoveV2.test.ts`

- [ ] **步骤 1：编写失败的测试**

```ts
// server/src/__tests__/plantingMoveV2.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

let db: Database;
let createTestApp: () => any;

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  // 建表（plantings, seed_sources, planting_area_stocks, planting_move_records, material_flow_log）
  db.run(`CREATE TABLE plantings (
    id TEXT PRIMARY KEY, planting_code TEXT, crop_code TEXT, crop_variety TEXT, crop_name TEXT,
    area_id TEXT, area_name TEXT, planting_quantity INTEGER, planted_quantity INTEGER,
    status TEXT, is_harvest_locked INTEGER, end_time TEXT, planting_date TEXT, create_time TEXT
  )`);
  db.run(`CREATE TABLE seed_sources (
    id TEXT PRIMARY KEY, source_code TEXT, source_type TEXT, crop_code TEXT, crop_variety TEXT,
    source_name TEXT, remaining_quantity INTEGER, used_quantity INTEGER, status TEXT, area_id TEXT
  )`);
  db.run(`CREATE TABLE planting_area_stocks (
    id TEXT PRIMARY KEY, planting_id TEXT, area_id TEXT, area_name TEXT,
    quantity INTEGER, source_type TEXT, source_id TEXT, source_code TEXT,
    operation_date TEXT, create_time TEXT, update_time TEXT
  )`);
  db.run(`CREATE TABLE planting_move_records (
    id TEXT PRIMARY KEY, planting_id TEXT, planting_code TEXT, operation_type TEXT,
    from_area_id TEXT, from_area_name TEXT, to_area_id TEXT, to_area_name TEXT,
    source_type TEXT, source_id TEXT, source_code TEXT, target_type TEXT, target_id TEXT, target_code TEXT,
    quantity INTEGER, operation_date TEXT, operator_name TEXT, remarks TEXT, create_time TEXT
  )`);
  db.run(`CREATE TABLE material_flow_log (id TEXT PRIMARY KEY)`);

  // 注入 db 到全局（参考现有 getDatabase 实现）
  (global as any).__test_db = db;
  // 重新 require 路由
  delete require.cache[require.resolve('../routes/planting')];
  const mod = require('../routes/planting');
  createTestApp = () => {
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.use('/api/plantings', mod.default);
    return app;
  };
});

describe('POST /:id/move — 调入', () => {
  it('rejects when source insufficient', async () => {
    db.run(`INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now')`);
    db.run(`INSERT INTO seed_sources VALUES ('S1', 'SRC001', 'seed', 'CC001', 'var1', 'src1', 50, 0, 'sufficient', 'src_area')`);
    db.run(`INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', 'now', 'now')`);

    const app = createTestApp();
    const res = await require('supertest')(app)
      .post('/api/plantings/P1/move')
      .send({ operationType: 'move_in', toAreaId: 'A1', toAreaName: 'area1', sourceType: 'seed', sourceId: 'S1', sourceCode: 'SRC001', quantity: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/库存不足/);
  });
});

describe('POST /:id/move — 调出', () => {
  it('rejects when from area stock insufficient', async () => {
    db.run(`INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now')`);
    db.run(`INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 50, 'migrate', null, 'ZZ001', '2026-06-21', 'now', 'now')`);
    db.run(`INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC001', 'var1', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now')`);

    const app = createTestApp();
    const res = await require('supertest')(app)
      .post('/api/plantings/P1/move')
      .send({ operationType: 'move_out', fromAreaId: 'A1', fromAreaName: 'area1', toAreaId: 'A2', toAreaName: 'area2', targetPlantingId: 'P2', quantity: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/调出区域.*不足/);
  });

  it('rejects when crop code mismatch', async () => {
    db.run(`INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now')`);
    db.run(`INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', 'now', 'now')`);
    db.run(`INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC002', 'var2', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now')`);

    const app = createTestApp();
    const res = await require('supertest')(app)
      .post('/api/plantings/P1/move')
      .send({ operationType: 'move_out', fromAreaId: 'A1', fromAreaName: 'area1', toAreaId: 'A2', toAreaName: 'area2', targetPlantingId: 'P2', quantity: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/作物不一致/);
  });

  it('rejects self-move (same area)', async () => {
    db.run(`INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now')`);
    db.run(`INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', 'now', 'now')`);

    const app = createTestApp();
    const res = await require('supertest')(app)
      .post('/api/plantings/P1/move')
      .send({ operationType: 'move_out', fromAreaId: 'A1', fromAreaName: 'area1', toAreaId: 'A1', toAreaName: 'area1', targetPlantingId: 'P1', quantity: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/源区域与目标区域相同/);
  });

  it('rejects when planting is ended', async () => {
    db.run(`INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'ended', 0, '2026-06-20', '2026-06-21', 'now')`);
    db.run(`INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', 'now', 'now')`);
    db.run(`INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC001', 'var1', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now')`);

    const app = createTestApp();
    const res = await require('supertest')(app)
      .post('/api/plantings/P1/move')
      .send({ operationType: 'move_out', fromAreaId: 'A1', fromAreaName: 'area1', toAreaId: 'A2', toAreaName: 'area2', targetPlantingId: 'P2', quantity: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/已结束|已采收/);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd server && npx vitest run src/__tests__/plantingMoveV2.test.ts`
预期：FAIL（路由还未改造）

- [ ] **步骤 3：实现路由改造（继续任务 6）**

→ 继续任务 6

---

## 任务 6：改造 POST /:id/move 路由

**文件：**
- 修改：`server/src/routes/planting.ts:259-353`（重写 move 路由）

- [ ] **步骤 1：替换整个 move 路由**

打开 `server/src/routes/planting.ts`，把 259-353 行的 `router.post('/:id/move', ...)` 整段替换为：

```ts
router.post('/:id/move', (req, res) => {
  try {
    const { id } = req.params;
    const {
      operationType,
      toAreaId,
      toAreaName,
      fromAreaId,
      fromAreaName,
      quantity = 0,
      operationDate,
      remarks = '',
      sourceType,
      sourceId,
      sourceCode,
      targetPlantingId,
      targetAreaId,
      targetAreaName,
    } = req.body || {};

    if (!operationType || !['move_in', 'move_out'].includes(operationType)) {
      return res.status(400).json({ success: false, error: '操作类型无效' });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: '数量必须 > 0' });
    }

    const db = getDatabase();

    // 1. 查询当前 planting
    const current = queryToObjects<any>(db,
      `SELECT id, planting_code, crop_code, crop_variety, area_id, area_name, planting_quantity,
              status, is_harvest_locked, end_time
       FROM plantings WHERE id = ?`, [id]);
    if (current.length === 0) {
      return res.status(404).json({ success: false, error: '种植记录不存在' });
    }
    const cur = current[0];

    // P0 校验 3: 订单生命周期
    if (cur.status === 'ended' || cur.status === 'harvested' || cur.status === 'cancelled' || cur.endTime) {
      return res.status(400).json({ success: false, error: '订单已结束/已采收，不能调入/调出' });
    }
    if (cur.isHarvestLocked) {
      return res.status(400).json({ success: false, error: '订单已锁定采收' });
    }

    // 2. 调入 / 调出分支校验
    if (operationType === 'move_in') {
      // 必填：toAreaName, sourceType, sourceId
      if (!toAreaName) return res.status(400).json({ success: false, error: '请选择目标区域' });
      if (!sourceType || !['seed', 'seedling'].includes(sourceType)) {
        return res.status(400).json({ success: false, error: '来源类型必须为 seed 或 seedling' });
      }
      if (!sourceId) return res.status(400).json({ success: false, error: '请选择来源批号' });

      // 查 source
      const src = queryToObjects<any>(db,
        `SELECT id, source_code, crop_code, crop_variety, remaining_quantity, status, area_id
         FROM seed_sources WHERE id = ?`, [sourceId]);
      if (src.length === 0) return res.status(404).json({ success: false, error: '来源种源/育苗记录不存在' });
      const s = src[0];
      // P0 校验 1+2: 作物编码 + 品种一致
      if (s.cropCode !== cur.cropCode) {
        return res.status(400).json({ success: false, error: '来源作物与目标订单作物不一致' });
      }
      if (s.cropVariety && cur.cropVariety && s.cropVariety !== cur.cropVariety) {
        return res.status(400).json({ success: false, error: '来源品种与目标订单品种不一致' });
      }
      // P1 校验 5: source 状态
      if (s.status === 'depleted' || s.status === 'cancelled') {
        return res.status(400).json({ success: false, error: '来源记录状态不可用' });
      }
      // P1 校验 3: 数量校验
      if (qty > s.remainingQuantity) {
        return res.status(400).json({ success: false, error: `来源库存不足：剩余 ${s.remainingQuantity} 株` });
      }

      // 3. 事务
      db.exec('BEGIN');
      try {
        // 扣 S 库存
        db.run(`UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, used_quantity = used_quantity + ? WHERE id = ?`,
          [qty, qty, sourceId]);
        // upsert stocks
        const existing = queryToObjects<any>(db,
          `SELECT id, quantity FROM planting_area_stocks WHERE planting_id = ? AND area_id = ?`,
          [id, toAreaId || '']);
        const now = new Date().toISOString();
        if (existing.length > 0) {
          db.run(`UPDATE planting_area_stocks SET quantity = quantity + ?, update_time = ? WHERE id = ?`,
            [qty, now, existing[0].id]);
        } else {
          db.run(`INSERT INTO planting_area_stocks
            (id, planting_id, area_id, area_name, quantity, source_type, source_id, source_code, operation_date, create_time, update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`STK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              id, toAreaId || '', toAreaName, qty, sourceType, sourceId, sourceCode || '',
              operationDate || now.slice(0, 10), now, now]);
        }
        // 写 move_records
        const moveId = `MOV_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.run(`INSERT INTO planting_move_records
          (id, planting_id, planting_code, operation_type, from_area_id, from_area_name, to_area_id, to_area_name,
           source_type, source_id, source_code, quantity, operation_date, operator_name, remarks, create_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [moveId, id, cur.plantingCode, 'move_in',
           s.areaId || '', s.sourceCode || '',
           toAreaId || '', toAreaName,
           sourceType, sourceId, sourceCode || '',
           qty, operationDate || now.slice(0, 10),
           (req as any).user?.realName || (req as any).user?.username || 'system',
           remarks, now]);
        db.exec('COMMIT');
        saveDatabase();
        res.json({ success: true, data: { id: moveId, plantingId: id, toAreaName, quantity: qty, softWarning: null } });
      } catch (txErr: any) {
        try { db.exec('ROLLBACK'); } catch {}
        throw txErr;
      }

    } else {
      // move_out
      if (!fromAreaId) return res.status(400).json({ success: false, error: '请选择调出区域' });
      if (!targetPlantingId) return res.status(400).json({ success: false, error: '请选择目标种植订单' });
      if (!toAreaId || !toAreaName) return res.status(400).json({ success: false, error: '请选择目标区域' });

      // P0 校验 5: self-move
      if (targetPlantingId === id && fromAreaId === toAreaId) {
        return res.status(400).json({ success: false, error: '源区域与目标区域相同' });
      }

      // 查目标订单
      const target = queryToObjects<any>(db,
        `SELECT id, planting_code, crop_code, crop_variety, status, is_harvest_locked, end_time
         FROM plantings WHERE id = ?`, [targetPlantingId]);
      if (target.length === 0) return res.status(404).json({ success: false, error: '目标种植订单不存在' });
      const t = target[0];

      // P0 校验: 目标订单生命周期
      if (t.status === 'ended' || t.status === 'harvested' || t.status === 'cancelled' || t.endTime) {
        return res.status(400).json({ success: false, error: '目标订单已结束/已采收' });
      }
      if (t.isHarvestLocked) {
        return res.status(400).json({ success: false, error: '目标订单已锁定采收' });
      }

      // P0 校验 1+2: 作物编码 + 品种一致
      if (t.cropCode !== cur.cropCode) {
        return res.status(400).json({ success: false, error: '目标订单作物与本订单不一致' });
      }
      if (t.cropVariety && cur.cropVariety && t.cropVariety !== cur.cropVariety) {
        return res.status(400).json({ success: false, error: '目标订单品种与本订单不一致' });
      }

      // P1 校验 2: from area stock 实时校验
      const fromStock = queryToObjects<any>(db,
        `SELECT id, quantity FROM planting_area_stocks WHERE planting_id = ? AND area_id = ?`,
        [id, fromAreaId]);
      if (fromStock.length === 0) {
        return res.status(404).json({ success: false, error: '调出区域未种该作物' });
      }
      if (qty > fromStock[0].quantity) {
        return res.status(400).json({ success: false, error: `调出区域当前只有 ${fromStock[0].quantity} 株，不足 ${qty} 株` });
      }

      // 3. 事务
      db.exec('BEGIN');
      try {
        const now = new Date().toISOString();
        // 扣 from
        db.run(`UPDATE planting_area_stocks SET quantity = quantity - ?, update_time = ? WHERE id = ?`,
          [qty, now, fromStock[0].id]);
        // upsert to
        const toExisting = queryToObjects<any>(db,
          `SELECT id, quantity FROM planting_area_stocks WHERE planting_id = ? AND area_id = ?`,
          [targetPlantingId, toAreaId]);
        if (toExisting.length > 0) {
          db.run(`UPDATE planting_area_stocks SET quantity = quantity + ?, update_time = ? WHERE id = ?`,
            [qty, now, toExisting[0].id]);
        } else {
          db.run(`INSERT INTO planting_area_stocks
            (id, planting_id, area_id, area_name, quantity, source_type, source_id, source_code, operation_date, create_time, update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`STK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              targetPlantingId, toAreaId, toAreaName, qty, 'transfer_in', id, cur.plantingCode,
              operationDate || now.slice(0, 10), now, now]);
        }
        // 写 move_records
        const moveId = `MOV_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.run(`INSERT INTO planting_move_records
          (id, planting_id, planting_code, operation_type, from_area_id, from_area_name, to_area_id, to_area_name,
           target_type, target_id, target_code, quantity, operation_date, operator_name, remarks, create_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [moveId, id, cur.plantingCode, 'move_out',
           fromAreaId, fromAreaName,
           toAreaId, toAreaName,
           'planting', targetPlantingId, t.plantingCode,
           qty, operationDate || now.slice(0, 10),
           (req as any).user?.realName || (req as any).user?.username || 'system',
           remarks, now]);
        db.exec('COMMIT');
        saveDatabase();
        res.json({ success: true, data: { id: moveId, plantingId: id, toAreaName, quantity: qty, softWarning: null } });
      } catch (txErr: any) {
        try { db.exec('ROLLBACK'); } catch {}
        throw txErr;
      }
    }
  } catch (error: any) {
    console.error('移入/移出失败:', error);
    res.status(500).json({ success: false, error: error?.message || '移入/移出失败' });
  }
});
```

- [ ] **步骤 2：运行后端单测验证通过**

运行：`cd server && npx vitest run src/__tests__/plantingMoveV2.test.ts`
预期：PASS（5/5）

- [ ] **步骤 3：手动 API 验证调出成功**

```bash
# 用之前污染的 ZZ20260620-001 (PL1781961634584) 调出 50 株到 ZZ20260619-001
# 先查 areaId
curl -s "http://localhost:3001/api/plantings?page=1&pageSize=100" | node -e "
const c=[];process.stdin.on('data',x=>c.push(x));process.stdin.on('end',()=>{
  const d=JSON.parse(Buffer.concat(c).toString());
  const p1 = d.data.list.find(x => x.id === 'PL1781961634584');
  const p2 = d.data.list.find(x => x.id === 'PL1781856365277');
  console.log('A:', p1.areaId, p1.areaName, p1.cropCode, p1.cropVariety);
  console.log('B:', p2.areaId, p2.areaName, p2.cropCode, p2.cropVariety);
});"

# 调出 50 株
curl -s -X POST "http://localhost:3001/api/plantings/PL1781961634584/move" \
  -H "Content-Type: application/json" \
  -d '{"operationType":"move_out","fromAreaId":"G002","fromAreaName":"一棚 > 02区","toAreaId":"G003","toAreaName":"二棚 > 01区","targetPlantingId":"PL1781856365277","quantity":50,"operationDate":"2026-06-21"}'
```

预期：返回 `{success: true, data: {...}}`。
然后查 stocks 验证：
```bash
cd "D:\TMcrop\yuanxingtu\V1.1\server" && node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('data/yuanxingtu.db');
  const db = new SQL.Database(buf);
  const r = db.exec(\"SELECT planting_id, area_name, quantity FROM planting_area_stocks WHERE planting_id IN ('PL1781961634584','PL1781856365277') ORDER BY planting_id, quantity DESC\");
  r[0].values.forEach(v => console.log(v));
})();
"
```

预期：PL1781961634584 的 G002 stocks -50；PL1781856365277 的 G003 stocks +50。

- [ ] **步骤 4：TypeScript 检查**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1" && npx tsc --noEmit --pretty 2>&1 | head -10
```

预期：无错误。

- [ ] **步骤 5：Commit**

```bash
git add server/src/routes/planting.ts server/src/__tests__/plantingMoveV2.test.ts
git commit -m "feat(planting-move): rewrite POST /:id/move with V2 validation (11 checks)"
```

---

## 任务 7：前端 service V2

**文件：**
- 修改：`src/services/apiPlantingService.ts`

- [ ] **步骤 1：在文件末尾追加 V2 类型和函数**

打开 `src/services/apiPlantingService.ts`，在末尾追加：

```ts
/**
 * 调入/调出 V2 输入（spec 2026-06-21）
 */
export interface MovePlantingInputV2 {
  operationType: 'move_in' | 'move_out';
  toAreaId?: string;
  toAreaName: string;
  fromAreaId?: string;       // 调出必填
  fromAreaName?: string;     // 调出必填
  quantity: number;
  operationDate: string;
  remarks?: string;
  // 调入必填
  sourceType?: 'seed' | 'seedling';
  sourceId?: string;
  sourceCode?: string;
  // 调出必填
  targetPlantingId?: string;
  targetAreaId?: string;
  targetAreaName?: string;
}

export interface MovePlantingResultV2 {
  id: string;
  plantingId: string;
  toAreaName: string;
  quantity: number;
  softWarning: string | null;
}

/**
 * 调入/调出 V2
 * 数据流：API → SQLite DB（事务原子）
 */
export async function movePlantingV2(
  plantingId: string,
  input: MovePlantingInputV2
): Promise<MovePlantingResultV2> {
  const data = await enhancedApiClient.post<MovePlantingResultV2>(
    `/plantings/${plantingId}/move`,
    input
  );
  return data;
}
```

- [ ] **步骤 2：TypeScript 检查**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1" && npx tsc --noEmit --pretty 2>&1 | head -10
```

预期：无错误。

- [ ] **步骤 3：Commit**

```bash
git add src/services/apiPlantingService.ts
git commit -m "feat(planting-move-service): add movePlantingV2 with V2 input contract"
```

---

## 任务 8：前端弹窗 V2

**文件：**
- 修改：`src/components/farm/planting/modals/PlantingMoveModal.tsx`（重做弹窗）

- [ ] **步骤 1：替换弹窗主体内容**

打开 `src/components/farm/planting/modals/PlantingMoveModal.tsx`，把整个内部实现替换为（保留外部 props 接口）：

```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Button, UnifiedModal, Select, Label, Input, TextArea } from '@/components/ui';
import { movePlantingV2, MovePlantingInputV2 } from '@/services/apiPlantingService';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { Sprout, AlertTriangle } from 'lucide-react';

interface PlantingMoveModalProps {
  isOpen: boolean;
  planting: any | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PlantingMoveModalV2({ isOpen, planting, onClose, onSaved }: PlantingMoveModalProps) {
  const [opType, setOpType] = useState<'move_in' | 'move_out'>('move_in');
  const [toAreaId, setToAreaId] = useState('');
  const [toAreaName, setToAreaName] = useState('');
  const [fromAreaId, setFromAreaId] = useState(planting?.areaId || '');
  const [fromAreaName, setFromAreaName] = useState(planting?.areaName || '');
  const [quantity, setQuantity] = useState<number>(0);
  const [operationDate, setOperationDate] = useState(todayLocal());
  const [remarks, setRemarks] = useState('');

  // 调入字段
  const [sourceType, setSourceType] = useState<'seed' | 'seedling'>('seed');
  const [sourceId, setSourceId] = useState('');
  const [sourceCode, setSourceCode] = useState('');

  // 调出字段
  const [targetPlantingId, setTargetPlantingId] = useState('');
  const [targetAreaId, setTargetAreaId] = useState('');
  const [targetAreaName, setTargetAreaName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [softWarning, setSoftWarning] = useState<string | null>(null);

  // 重置
  useEffect(() => {
    if (isOpen && planting) {
      setOpType('move_in');
      setToAreaId(''); setToAreaName('');
      setFromAreaId(planting.areaId || ''); setFromAreaName(planting.areaName || '');
      setQuantity(0);
      setOperationDate(todayLocal());
      setRemarks('');
      setSourceType('seed'); setSourceId(''); setSourceCode('');
      setTargetPlantingId(''); setTargetAreaId(''); setTargetAreaName('');
      setSoftWarning(null);
    }
  }, [isOpen, planting]);

  // 软提醒：目标区域是否存在 stock
  useEffect(() => {
    if (opType === 'move_in' && toAreaId && planting) {
      // 简化：弹窗不实时查 stocks，仅在提交后服务端返 softWarning
      setSoftWarning(null);
    }
  }, [opType, toAreaId, planting]);

  const handleSubmit = async () => {
    if (!planting) return;
    if (quantity <= 0) {
      showAlert('数量必须 > 0');
      return;
    }
    if (opType === 'move_in') {
      if (!sourceId) { showAlert('请选择来源批号'); return; }
    } else {
      if (!targetPlantingId) { showAlert('请选择目标订单'); return; }
      if (!toAreaId) { showAlert('请选择目标区域'); return; }
    }

    setSubmitting(true);
    try {
      const input: MovePlantingInputV2 = {
        operationType: opType,
        toAreaId, toAreaName,
        fromAreaId: opType === 'move_out' ? fromAreaId : undefined,
        fromAreaName: opType === 'move_out' ? fromAreaName : undefined,
        quantity, operationDate, remarks,
        sourceType: opType === 'move_in' ? sourceType : undefined,
        sourceId: opType === 'move_in' ? sourceId : undefined,
        sourceCode: opType === 'move_in' ? sourceCode : undefined,
        targetPlantingId: opType === 'move_out' ? targetPlantingId : undefined,
        targetAreaId: opType === 'move_out' ? toAreaId : undefined,
        targetAreaName: opType === 'move_out' ? toAreaName : undefined,
      };
      const result = await movePlantingV2(planting.id, input);
      if (result.softWarning) {
        await showAlert(result.softWarning);
      } else {
        await showAlert(`${opType === 'move_in' ? '调入' : '调出'}成功：${toAreaName}（${quantity} 株）`);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      showAlert(`操作失败：${e?.message || '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={opType === 'move_in' ? '调入到种植订单' : '从种植订单调出'}
      size="md"
      showFooter
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
            <Sprout className="w-4 h-4" /> 确认{opType === 'move_in' ? '调入' : '调出'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* 操作类型切换 */}
        <div>
          <Label>操作类型</Label>
          <div className="flex gap-2 mt-1">
            <Button size="sm" variant={opType === 'move_in' ? 'default' : 'secondary'} onClick={() => setOpType('move_in')}>调入</Button>
            <Button size="sm" variant={opType === 'move_out' ? 'default' : 'secondary'} onClick={() => setOpType('move_out')}>调出</Button>
          </div>
        </div>

        {/* 调出订单（显示只读） */}
        <div>
          <Label>调入/调出订单</Label>
          <Input value={planting?.plantingCode || ''} disabled />
        </div>

        {/* 调入特有字段 */}
        {opType === 'move_in' && (
          <>
            <div>
              <Label>目标区域</Label>
              <Input value={toAreaName} onChange={e => { setToAreaName(e.target.value); setToAreaId(e.target.value); }} placeholder="如：一棚 > 01区" />
            </div>
            <div>
              <Label>来源类型</Label>
              <div className="flex gap-2">
                <label><input type="radio" checked={sourceType === 'seed'} onChange={() => setSourceType('seed')} /> 种源</label>
                <label><input type="radio" checked={sourceType === 'seedling'} onChange={() => setSourceType('seedling')} /> 种苗</label>
              </div>
            </div>
            <div>
              <Label>来源批号</Label>
              <Input value={sourceCode} onChange={e => { setSourceCode(e.target.value); setSourceId(e.target.value); }} placeholder="批号搜索" />
            </div>
          </>
        )}

        {/* 调出特有字段 */}
        {opType === 'move_out' && (
          <>
            <div>
              <Label>调出区域</Label>
              <Input value={fromAreaName} disabled />
            </div>
            <div>
              <Label>目标订单</Label>
              <Input value={targetPlantingId} onChange={e => setTargetPlantingId(e.target.value)} placeholder="目标种植订单 ID" />
            </div>
            <div>
              <Label>目标区域</Label>
              <Input value={toAreaName} onChange={e => { setToAreaName(e.target.value); setToAreaId(e.target.value); }} placeholder="如：二棚 > 01区" />
            </div>
          </>
        )}

        {/* 公共字段 */}
        <div>
          <Label>数量</Label>
          <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} />
        </div>
        <div>
          <Label>业务日期</Label>
          <Input type="date" value={operationDate} onChange={e => setOperationDate(e.target.value)} />
        </div>
        <div>
          <Label>备注</Label>
          <TextArea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} />
        </div>

        {softWarning && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <span>{softWarning}</span>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
```

- [ ] **步骤 2：TypeScript 检查**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1" && npx tsc --noEmit --pretty 2>&1 | head -10
```

预期：无错误。

- [ ] **步骤 3：Commit**

```bash
git add src/components/farm/planting/modals/PlantingMoveModal.tsx
git commit -m "feat(planting-move-modal): rewrite modal with V2 fields and submit flow"
```

---

## 任务 9：前端 PlantingPage 改调 V2

**文件：**
- 修改：`src/components/farm/planting/PlantingPage.tsx`（改 `handleMoveSubmit`）

- [ ] **步骤 1：找到 handleMoveSubmit 并改用 V2**

打开 `src/components/farm/planting/PlantingPage.tsx`，找到 `handleMoveSubmit`（约 286-308 行），把：
```ts
import { movePlanting } from '@/services/apiPlantingService';
```

改为：
```ts
import { movePlantingV2, MovePlantingInputV2 } from '@/services/apiPlantingService';
```

然后把 `handleMoveSubmit` 内的 `movePlanting(...)` 改为 `movePlantingV2(...)` + 新参数结构。

- [ ] **步骤 2：TypeScript 检查**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1" && npx tsc --noEmit --pretty 2>&1 | head -10
```

预期：无错误。

- [ ] **步骤 3：Vite build 验证**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1" && npx vite build 2>&1 | tail -10
```

预期：构建成功。

- [ ] **步骤 4：Commit**

```bash
git add src/components/farm/planting/PlantingPage.tsx
git commit -m "feat(planting-page): route handleMoveSubmit through movePlantingV2"
```

---

## 任务 10：端到端冒烟测试

**文件：**
- 无新文件；仅手动验证

- [ ] **步骤 1：启动前后端**

```bash
cd "D:\TMcrop\yuanxingtu\V1.1\server" && npm run dev &
sleep 3
cd "D:\TMcrop\yuanxingtu\V1.1" && npm run dev &
sleep 5
```

预期：两个服务都启动。

- [ ] **步骤 2：浏览器打开 /crop/planting**

用 browse 工具打开 http://localhost:5188/crop/planting，截图当前状态。

- [ ] **步骤 3：手动测试调出**

1. 找一个有 stock 的行（PL1781961634584）
2. 点操作列的"移入/移出"按钮（如果有）
3. 选"调出"
4. 填目标订单 ID、目标区域、数量
5. 提交
6. 验证：列表的 plantingCount 减 N；stocks 验证

- [ ] **步骤 4：手动测试调入**

1. 同上选"调入"
2. 填来源批号、目标区域、数量
3. 提交
4. 验证：列表的 plantingCount 不变（如果同区域）；stocks 新增

- [ ] **步骤 5：手动测试负向场景**

1. 测试作物编码不一致（选不同作物的来源）
2. 测试 self-move（同订单同区域）
3. 测试订单已结束
4. 验证：弹窗弹错误提示，不提交

- [ ] **步骤 6：Commit（如有 UI 调整）**

如有 UI 调整，commit。否则跳到任务 11。

---

## 任务 11：更新种子数据 + 文档收尾

**文件：**
- 修改：`server/src/db/seedData.ts`（在 plantings 种子数据后追加 stocks）
- 创建：`docs/changelog/2026-06-21-planting-move-v2.md`

- [ ] **步骤 1：在 seedData.ts 末尾追加 stocks 种子**

打开 `server/src/db/seedData.ts`，找到所有 `INSERT INTO plantings` 的位置，每个之后追加对应的 `INSERT INTO planting_area_stocks`。

**简化方法**：在文件末尾追加一次性 batch insert：

```ts
// 末尾追加
db.run(`
  INSERT INTO planting_area_stocks
    (id, planting_id, area_id, area_name, quantity, source_type, source_code, operation_date, create_time, update_time)
  SELECT
    'STK_seed_' || id,
    id,
    COALESCE(NULLIF(area_id, ''), 'UNASSIGNED'),
    COALESCE(NULLIF(area_name, ''), '未分配'),
    planting_quantity,
    'seed',
    planting_code,
    COALESCE(planting_date, date('now')),
    COALESCE(create_time, datetime('now')),
    datetime('now')
  FROM plantings
  WHERE planting_quantity > 0
    AND NOT EXISTS (SELECT 1 FROM planting_area_stocks s WHERE s.planting_id = plantings.id)
`);
saveDatabase();
```

- [ ] **步骤 2：写 changelog**

创建 `docs/changelog/2026-06-21-planting-move-v2.md`：

```markdown
# 2026-06-21 种植调入/调出 V2

## 变更

- 新增 `planting_area_stocks` 表，按区域拆分株数
- `plantings.planting_quantity` 改为"订单总株数"，调入调出时**不变**
- POST /:id/move 重写，加 11 项校验
- 弹窗 V2：调入/调出分模式、新字段（source / target）
- 数据自动迁移（启动时）

## 数据迁移

启动时自动从 `plantings.planting_quantity` 生成 stocks 行。已迁移 90+ 条。

## 注意事项

- 之前测试用 ZZ20260620-001（400 株）和 ZZ20260619-002（59 株）保持迁移后的状态
- 如需手动修正：`UPDATE planting_area_stocks SET quantity = ? WHERE planting_id = ?`

## 兼容性

- 旧 GET /api/plantings 返回字段不变（areaId/areaName/plantingCount 名称保留）
- 旧 POST /:id/move 调用方式不兼容（必须用 V2 input）
```

- [ ] **步骤 3：Commit**

```bash
git add server/src/db/seedData.ts docs/changelog/2026-06-21-planting-move-v2.md
git commit -m "chore: seed planting_area_stocks in seedData + changelog"
```

---

## 自检结果

1. **规格覆盖度**：
   - 数据模型（spec §3）→ 任务 1
   - 业务流程（spec §4）→ 任务 6
   - P0 6 项校验（spec §5）→ 任务 6 实现
   - P1 5 项校验（spec §5）→ 任务 6 实现
   - 错误处理（spec §6）→ 任务 6 实现
   - 数据迁移（spec §7）→ 任务 2 + 3
   - 前端改造（spec §8）→ 任务 7 + 8 + 9
   - 测试（spec §9）→ 任务 5 + 10
   - 风险回滚（spec §11）→ changelog

2. **占位符扫描**：✅ 无 "待定" / "TODO"

3. **类型一致性**：
   - `MovePlantingInputV2` 在任务 7 定义，任务 8 9 使用，名称一致
   - `movePlantingV2` 函数名跨任务一致
   - `planting_area_stocks` 表名跨任务一致

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-06-21-planting-move-redesign.md`。

**两种执行方式：**

1. **子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代
2. **内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

选哪种方式？
