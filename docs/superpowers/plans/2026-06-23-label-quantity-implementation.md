# 标签粒度灵活化 + 数量调整 — 实施计划

> **面向 AI 代理的工作者：** 使用 superpowers:subagent-driven-development 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 让标签管理支持批次/单株/混合三种粒度，支持数量动态调整（死亡/补充），支持手机扫码录入履历。

**架构：** schema 扩展 5 个新字段（quantity/status/quantity_change/quantity_after/reason）→ 后端拆 3 文件 + 乐观锁 CAS + 批量多行 INSERT → Store 类型扩展 → 抽 LabelTypeSelector 公共组件 → SeedlingLabelManageModal 拆 4 子组件 → PrintLabelModal 加标签类型切换 → SeedlingPage URL 参数自动打开弹窗 → 100% 测试覆盖。

**技术栈：** Express 4 + sql.js + Zustand 5 + React 18 + TypeScript 5.6 + Vitest + Playwright

---

### 任务 1：schema 扩展 + 数据库迁移（T1）

**文件：**
- 修改：`server/src/db/schema.ts:2719-2732`
- 修改：`server/src/db/fixMissingSchema.ts:1894-1895`

#### 步骤 1.1：修改 schema.ts — CREATE TABLE 加字段

将 `plant_labels` 的 CREATE TABLE 从第 2703-2715 行改为包含 `quantity` 和 `status` 字段：

```sql
CREATE TABLE IF NOT EXISTS plant_labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label_number TEXT NOT NULL,
  planting_id TEXT,
  seedling_id TEXT,
  move_in_area_id INTEGER,
  move_in_area_name TEXT,
  move_in_date TEXT,
  move_out_area_id INTEGER,
  move_out_area_name TEXT,
  move_out_date TEXT,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now','localtime'))
)
```

将 `plant_label_resume` 的 CREATE TABLE 从第 2719-2732 行改为包含新字段：

```sql
CREATE TABLE IF NOT EXISTS plant_label_resume (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label_id INTEGER NOT NULL,
  operation_type TEXT NOT NULL,
  from_area_name TEXT,
  to_area_name TEXT,
  mark_id INTEGER,
  mark_name TEXT,
  mark_color TEXT,
  operation_date TEXT NOT NULL,
  operator_name TEXT,
  image_base64 TEXT,
  quantity_change INTEGER,
  quantity_after INTEGER,
  reason TEXT,
  create_time TEXT DEFAULT (datetime('now','localtime'))
)
```

- [ ] **步骤 1.2：修改 fixMissingSchema.ts — 加 ALTER 段**

在 `fixMissingSchema.ts` 第 1894 行（`saveDatabase()` 之前）插入：

```typescript
  // 2026-06-23: 标签粒度扩展 — plant_labels +quantity/status, plant_label_resume +quantity_change/quantity_after/reason
  const labelCols = [
    { name: 'quantity', sql: 'ALTER TABLE plant_labels ADD COLUMN quantity INTEGER DEFAULT 1' },
    { name: 'status', sql: "ALTER TABLE plant_labels ADD COLUMN status TEXT DEFAULT 'active'" },
    { name: 'quantity_change', sql: 'ALTER TABLE plant_label_resume ADD COLUMN quantity_change INTEGER' },
    { name: 'quantity_after', sql: 'ALTER TABLE plant_label_resume ADD COLUMN quantity_after INTEGER' },
    { name: 'reason', sql: 'ALTER TABLE plant_label_resume ADD COLUMN reason TEXT' },
  ];
  for (const col of labelCols) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ ${col.name} 列添加成功`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        seedLog.skip(`• ${col.name}: ${e.message}`);
      }
    }
  }
```

- [ ] **步骤 1.3：手动 ALTER + 落盘验证**

运行以下命令（项目白名单禁用 fixMissingSchema，需手动操作）：

```bash
node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('../server/data/yuanxingtu.db'));
  const adds = [
    'ALTER TABLE plant_labels ADD COLUMN quantity INTEGER DEFAULT 1',
    \"ALTER TABLE plant_labels ADD COLUMN status TEXT DEFAULT 'active'\",
    'ALTER TABLE plant_label_resume ADD COLUMN quantity_change INTEGER',
    'ALTER TABLE plant_label_resume ADD COLUMN quantity_after INTEGER',
    'ALTER TABLE plant_label_resume ADD COLUMN reason TEXT',
  ];
  for (const sql of adds) {
    try { db.run(sql); console.log('✓ ' + sql.substring(14, 60)); }
    catch(e) { console.log('skip: ' + e.message); }
  }
  const data = db.export();
  fs.writeFileSync('../server/data/yuanxingtu.db', Buffer.from(data));
  console.log('✓ 磁盘已更新');
  // 验证
  const cols = db.exec('PRAGMA table_info(plant_labels)');
  console.log('plant_labels 列:', cols[0].values.map(r => r[1]).join(', '));
  const cols2 = db.exec('PRAGMA table_info(plant_label_resume)');
  console.log('plant_label_resume 列:', cols2[0].values.map(r => r[1]).join(', '));
});
" 2>&1
```

预期输出应含：`quantity, status` + `quantity_change, quantity_after, reason`

- [ ] **步骤 1.4：旧数据默认值应用**

旧 8 条 `plant_labels` 记录的 `quantity` 和 `status` 列自动填入默认值（SQLite ALTER TABLE ADD COLUMN DEFAULT 在已有行填 NULL，需手动 UPDATE）。在步骤 1.3 的 node 脚本中追加：

```javascript
  db.run("UPDATE plant_labels SET quantity = 1 WHERE quantity IS NULL");
  db.run("UPDATE plant_labels SET status = 'active' WHERE status IS NULL");
  const data2 = db.export();
  fs.writeFileSync('../server/data/yuanxingtu.db', Buffer.from(data2));
```

- [ ] **步骤 1.5：重启后端**

```bash
taskkill /PID <server-pid> /F
cd D:/TMcrop/yuanxingtu/V1.1/server && npm run dev &
```

- [ ] **步骤 1.6：验证 API 返回新字段**

```bash
curl -s "http://localhost:3001/api/plant-labels?seedling_id=SD1781504395062" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); console.log('第一个标签:', JSON.stringify(j.data[0], null, 2))})"
```

预期：每个标签对象含 `quantity:1` 和 `status:'active'`

- [ ] **步骤 1.7：Commit**

```bash
git add server/src/db/schema.ts server/src/db/fixMissingSchema.ts server/data/yuanxingtu.db
git commit -m "feat(plant-labels): schema 扩展 — plant_labels +quantity/status, plant_label_resume +quantity_change/quantity_after/reason"
```

---

### 任务 2：后端拆 3 文件 + 乐观锁 + 批量 INSERT（T2）

**文件：**
- 创建：`server/src/routes/plantLabels.ts`（标签路由）
- 创建：`server/src/routes/plantLabelResumes.ts`（履历路由）
- 创建：`server/src/routes/plantMarks.ts`（标记路由）
- 修改：`server/src/routes/index.ts:63,293`（注册 3 文件）
- 删除：`server/src/routes/plantLabel.ts`（旧单文件）

#### 步骤 2.1：创建 plantMarks.ts（标记路由）

从 `plantLabel.ts` 提取标记相关路由（lines 11-103）：GET /marks/all, POST /marks/assign, POST /marks, PUT /marks/:id, DELETE /marks/:id。

```typescript
/**
 * 种植标签标记管理 API 路由
 * plant_marks
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/** GET /marks/all — 标记列表 */
router.get('/all', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db,
      `SELECT * FROM plant_marks WHERE is_use = 1 ORDER BY sort_order, id`
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /assign — 分配标记给标签 */
router.post('/assign', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { mark_id, label_ids } = req.body;
    if (!mark_id || !Array.isArray(label_ids) || label_ids.length === 0) {
      res.status(400).json({ success: false, error: 'mark_id 和 label_ids 数组为必填项' });
      return;
    }
    const mark = queryToObjects(db, `SELECT * FROM plant_marks WHERE id = ?`, [mark_id]);
    if (mark.length === 0) { res.status(404).json({ success: false, error: '标记不存在' }); return; }
    const now = new Date().toISOString().split('T')[0];
    let count = 0;
    for (const labelId of label_ids) {
      db.run(`INSERT INTO plant_label_resume (label_id, operation_type, mark_id, mark_name, mark_color, operation_date)
        VALUES (?, 'mark', ?, ?, ?, ?)`,
        [labelId, mark_id, mark[0].name, mark[0].color, now]
      );
      count++;
    }
    res.status(201).json({ success: true, data: { mark_id, mark_name: mark[0].name, assigned_count: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /marks, PUT /marks/:id, DELETE /marks/:id 同上提取
// ...（完整代码从 plantLabel.ts 复制）

export default router;
```

- [ ] **步骤 2.2：创建 plantLabels.ts（标签路由）**

提取标签相关路由（generate-batch, GET /, query-by-label, /:id, DELETE /:id, batch-create），新增：

1. `generate-batch` → 改造为批量 INSERT 多行 VALUES（去掉 for 循环）：

```typescript
// 批量 INSERT（多行 VALUES 语法，5000 条 < 1s）
const valuePlaceholders = labels.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
const allParams: any[] = [];
for (const item of labels) {
  allParams.push(
    item.labelNumber,
    item.plantingId || null, item.seedlingId || null,
    item.moveInAreaName || null, item.moveInDate || null,
    item.quantity ?? 1, // 新字段
    'active',           // status 默认
    now
  );
}
db.run(
  `INSERT INTO plant_labels (label_number, planting_id, seedling_id, move_in_area_name, move_in_date, quantity, status, create_time)
   VALUES ${valuePlaceholders}`,
  allParams
);
```

2. batch-create 接收 `quantity` 字段，INSERT 语句加 `quantity` 列。

```typescript
router.post('/batch-create', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { labels } = req.body;
    if (!Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({ success: false, error: 'labels 数组为必填项' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const valuePlaceholders = labels.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    const allParams: any[] = [];
    for (const item of labels) {
      if (!item.labelNumber) continue;
      allParams.push(
        item.labelNumber,
        item.plantingId || null, item.seedlingId || null,
        item.moveInAreaName || null, item.moveInDate || null,
        item.quantity ?? 1,
        now
      );
    }
    db.run(
      `INSERT INTO plant_labels (label_number, planting_id, seedling_id, move_in_area_name, move_in_date, quantity, create_time)
       VALUES ${valuePlaceholders}`, allParams
    );

    // 取最后一批插入的 ID（sql.js 不支持 last_insert_rowid for multi-row）
    const lastId = db.exec('SELECT MAX(id) as max_id FROM plant_labels')[0]?.values[0]?.[0] || 0;
    const insertedIds: number[] = [];
    for (let i = 0; i < allParams.length / 7; i++) {
      insertedIds.push(Number(lastId) - Math.floor(allParams.length / 7) + i + 1);
    }

    const { saveDatabase } = require('../db');
    saveDatabase();
    res.status(201).json({
      success: true,
      data: { inserted: Math.floor(allParams.length / 7), insertedIds },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
```

3. GET /by-number/:labelNumber — 扫码查询端点（新增）：

```typescript
/** GET /by-number/:labelNumber — 扫码查询 */
router.get('/by-number/:labelNumber', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { labelNumber } = req.params;
    const label = queryToObjects(db,
      `SELECT * FROM plant_labels WHERE label_number = ?`, [labelNumber]
    );
    if (label.length === 0) {
      res.status(404).json({ success: false, error: '标签不存在' });
      return;
    }
    // 同时返回最近 20 条履历
    const resumes = queryToObjects(db,
      `SELECT * FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC LIMIT 20`,
      [label[0].id]
    );
    res.json({ success: true, data: { label: label[0], resumes } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
```

#### 步骤 2.3：创建 plantLabelResumes.ts（履历路由 + 乐观锁）

提取履历路由 + 新增乐观锁 CAS 校验：

```typescript
/**
 * 种植标签履历管理 API 路由
 * plant_label_resume
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/** GET /:id/resumes — 获取标签履历 */
router.get('/:id/resumes', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db,
      `SELECT * FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /:id/resumes — 新增标签履历（乐观锁 CAS 校验） */
router.post('/:id/resumes', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const labelId = parseInt(req.params.id, 10);
    const {
      operation_type, from_area_name, to_area_name,
      mark_id, mark_name, mark_color, operation_date, operator_name,
      image_base64, quantity_change, reason,
      expected_quantity  // 乐观锁：期望的当前 quantity
    } = req.body;

    if (!operation_type || !operation_date) {
      res.status(400).json({ success: false, error: 'operation_type 和 operation_date 为必填项' });
      return;
    }

    const label = queryToObjects(db, `SELECT * FROM plant_labels WHERE id = ?`, [labelId]);
    if (label.length === 0) { res.status(404).json({ success: false, error: '标签不存在' }); return; }

    // 乐观锁 CAS 校验
    const currentQuantity = label[0].quantity || 0;
    if (expected_quantity !== undefined && expected_quantity !== null) {
      if (Number(currentQuantity) !== Number(expected_quantity)) {
        res.status(409).json({
          success: false,
          error: '数据已被修改，请重新读取后再提交',
          currentQuantity,
        });
        return;
      }
    }

    const qtyChange = quantity_change ? Number(quantity_change) : 0;
    const newQuantity = Math.max(0, currentQuantity - qtyChange);

    // 状态自动转换
    let newStatus = label[0].status || 'active';
    if (operation_type === 'move_out' && qtyChange === 0) {
      // 整批移出（不填 quantity_change）
      newStatus = 'moved_out';
    } else if (operation_type === 'move_out' && newQuantity === 0) {
      // 部分移走减到 0 → voided
      newStatus = 'voided';
    }

    // 更新标签
    if (operation_type === 'move_in') {
      db.run(`UPDATE plant_labels SET move_in_area_name=?, move_in_date=? WHERE id=?`,
        [to_area_name || '', operation_date, labelId]);
    } else if (operation_type === 'move_out') {
      db.run(`UPDATE plant_labels SET move_out_area_name=?, move_out_date=?, quantity=?, status=? WHERE id=?`,
        [to_area_name || '', operation_date, newQuantity, newStatus, labelId]);
    } else if (operation_type === 'void') {
      newStatus = 'voided';
      db.run(`UPDATE plant_labels SET status=? WHERE id=?`, [newStatus, labelId]);
    }

    // 插入履历
    db.run(
      `INSERT INTO plant_label_resume (label_id, operation_type, from_area_name, to_area_name,
        mark_id, mark_name, mark_color, operation_date, operator_name,
        image_base64, quantity_change, quantity_after, reason)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [labelId, operation_type, from_area_name || null, to_area_name || null,
       mark_id || null, mark_name || null, mark_color || null,
       operation_date, operator_name || null,
       image_base64 || null,
       qtyChange || null, newQuantity, reason || null]
    );

    res.status(201).json({ success: true, data: { labelId, operation_type, operation_date, quantity: newQuantity, status: newStatus } });
    saveDatabase();
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
```

#### 步骤 2.4：修改 index.ts — 注册 3 文件

```typescript
// 第 63 行：替换单文件导入为 3 文件
import plantLabelsRouter from './plantLabels';
import plantLabelResumesRouter from './plantLabelResumes';
import plantMarksRouter from './plantMarks';

// 第 293 行附近：替换注册
router.use('/plant-labels', requireAuth, plantLabelsRouter);
router.use('/plant-labels', requireAuth, plantLabelResumesRouter);
router.use('/plant-labels', requireAuth, plantMarksRouter);
```

⚠️ **路由顺序**：`plantLabelResumesRouter` 含 `/:id/resumes` → 必须排在 `plantMarksRouter` 和 `plantLabelsRouter` 之后，防止 `/marks/all` 被 `/:id` 劫持。

按此顺序：`plantMarksRouter` → `plantLabelsRouter` → `plantLabelResumesRouter`

#### 步骤 2.5：删除旧文件 plantLabel.ts

```bash
rm server/src/routes/plantLabel.ts
```

#### 步骤 2.6：编译验证

```bash
cd server && npx tsc --noEmit
```

- [ ] **步骤 2.7：API 回归测试**

```bash
# 1. 标签列表
curl -s "http://localhost:3001/api/plant-labels?seedling_id=SD1781504395062" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); console.log('total:', j.meta?.total, '| first quantity:', j.data[0]?.quantity)})"

# 2. 乐观锁：先获取 current
curl -s "http://localhost:3001/api/plant-labels/4" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); console.log('current quantity:', j.data?.quantity)})"

# 3. 乐观锁：传错误的 expected_quantity → 应返回 409
curl -s -X POST "http://localhost:3001/api/plant-labels/4/resumes" -H "Content-Type: application/json" -d '{"operation_type":"move_out","operation_date":"2026-06-23","quantity_change":200,"expected_quantity":9999}' | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); console.log('status:', j.status||'N/A', '| error:', j.error)})"

# 4. 乐观锁：传正确的 expected_quantity → 应返回 201
curl -s -X POST "http://localhost:3001/api/plant-labels/4/resumes" -H "Content-Type: application/json" -d '{"operation_type":"move_out","operation_date":"2026-06-23","to_area_name":"隔离区","quantity_change":200,"reason":"夏季高温","expected_quantity":1}' | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); console.log('success:', j.success, '| new quantity:', j.data?.quantity, '| status:', j.data?.status)})"
```

- [ ] **步骤 2.8：Commit**

```bash
git add server/src/routes/plantLabels.ts server/src/routes/plantLabelResumes.ts server/src/routes/plantMarks.ts server/src/routes/index.ts
git rm server/src/routes/plantLabel.ts
git commit -m "refactor(plant-labels): 后端拆 3 文件 + 乐观锁 CAS + 批量多行 INSERT + 扫码查询端点"
```

---

### 任务 3：Store 类型扩展（T3）

**文件：**
- 修改：`src/stores/usePlantLabelStore.ts`

#### 步骤 3.1：PlantLabel 接口加 quantity/status

```typescript
export interface PlantLabel {
  id: number;
  label_number: string;
  planting_id: string;
  seedling_id: string | null;
  move_in_area_id: number | null;
  move_in_area_name: string | null;
  move_in_date: string | null;
  move_out_area_id: number | null;
  move_out_area_name: string | null;
  move_out_date: string | null;
  // 2026-06-23: 粒度扩展
  quantity: number;
  status: string;
  create_time: string;
}
```

#### 步骤 3.2：PlantLabelResume 接口加 quantity_change/quantity_after/reason

```typescript
export interface PlantLabelResume {
  id: number;
  labelId: number;
  operationType: 'move_in' | 'move_out' | 'mark' | 'void';
  fromAreaName: string | null;
  toAreaName: string | null;
  markId: number | null;
  markName: string | null;
  markColor: string | null;
  operationDate: string;
  operatorName: string | null;
  imageBase64?: string | null;
  // 2026-06-23: 数量追踪
  quantityChange?: number | null;
  quantityAfter?: number | null;
  reason?: string | null;
  createTime: string;
}
```

#### 步骤 3.3：batchCreateLabels 入参支持 quantity

```typescript
batchCreateLabels: (labels: Array<{
  labelNumber: string;
  seedlingId?: string | null;
  plantingId?: string | null;
  moveInAreaName?: string | null;
  moveInDate?: string | null;
  quantity?: number;  // 2026-06-23: 标签代表的苗数
}>) => Promise<{ inserted: number; insertedIds: number[] } | null>;
```

batchCreateLabels 实现中 `POST` 体加 `quantity` 字段：

```typescript
labels: labels.map(l => ({
  labelNumber: l.labelNumber,
  seedlingId: l.seedlingId || null,
  plantingId: l.plantingId || null,
  moveInAreaName: l.moveInAreaName || null,
  moveInDate: l.moveInDate || null,
  quantity: l.quantity ?? 1,
}))
```

#### 步骤 3.4：MoveFormData 接口扩展

```typescript
export interface MoveFormData {
  operationType: 'move_in' | 'move_out' | 'void';
  labelNumber: string;
  targetArea: string;
  operationDate: string;
  remarks: string;
  quantityChange?: number;
  expectedQuantity?: number;
}
```

#### 步骤 3.5：编译验证

```bash
npx tsc --noEmit
```

预期：无错误。

#### 步骤 3.6：Commit

```bash
git add src/stores/usePlantLabelStore.ts
git commit -m "feat(plant-labels): Store 类型扩展 — PlantLabel +quantity/status, PlantLabelResume +quantityChange/quantityAfter/reason"
```

---

### 任务 4：公共组件 LabelTypeSelector（T4）

**文件：**
- 创建：`src/components/ui/LabelTypeSelector.tsx`
- 修改：`src/components/ui/index.ts`

#### 步骤 4.1：创建 LabelTypeSelector.tsx

```typescript
/**
 * 标签类型选择器 — 批次/单株/混合 三态切换
 * 用于 PrintLabelModal 和 SeedlingLabelManageModal
 */

import React from 'react';

export type LabelType = 'batch' | 'single' | 'mixed';

interface LabelTypeSelectorProps {
  value: LabelType;
  onChange: (val: LabelType) => void;
  /**
   * 隐藏的选项（如 PrintLabelModal batch mode 不展示"混合"）
   */
  hidden?: LabelType[];
}

const LABEL_TYPES: Array<{ value: LabelType; label: string; desc: string }> = [
  { value: 'batch', label: '批次', desc: '1 个标签代表整批苗，同一批次共用一个标签' },
  { value: 'single', label: '单株', desc: '每株苗一个标签，用于精确追溯' },
  { value: 'mixed', label: '混合', desc: '部分批次 + 部分单株，各自指定数量' },
];

export function LabelTypeSelector({ value, onChange, hidden = [] }: LabelTypeSelectorProps) {
  const visible = LABEL_TYPES.filter(t => !hidden.includes(t.value));

  return (
    <div className="flex gap-2">
      {visible.map(t => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
            value === t.value
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
          title={t.desc}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default LabelTypeSelector;
```

#### 步骤 4.2：注册到 UI index.ts

```typescript
export { LabelTypeSelector } from './LabelTypeSelector';
export type { LabelType } from './LabelTypeSelector';
```

#### 步骤 4.3：编译验证

```bash
npx vite build 2>&1 | tail -3
```

预期：`✓ built`

#### 步骤 4.4：Commit

```bash
git add src/components/ui/LabelTypeSelector.tsx src/components/ui/index.ts
git commit -m "feat(ui): 新增 LabelTypeSelector 公共组件 — 批次/单株/混合三态切换"
```

---

### 任务 5：SeedlingLabelManageModal 拆 4 子组件 + 功能扩展（T5）

**文件：**
- 创建：`src/components/farm/seedling/modals/LabelTable.tsx`
- 创建：`src/components/farm/seedling/modals/LabelResumePanel.tsx`
- 创建：`src/components/farm/seedling/modals/AddResumeForm.tsx`
- 创建：`src/components/farm/seedling/modals/LabelBadge.tsx`
- 修改：`src/components/farm/seedling/modals/SeedlingLabelManageModal.tsx`

#### 步骤 5.1：创建 LabelBadge.tsx（状态徽章）

```tsx
import React from 'react';

interface LabelBadgeProps {
  status: string;
  quantity?: number;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: '', bg: '', text: '' }, // 不显示徽章
  moved_out: { label: '已移出', bg: 'bg-orange-100', text: 'text-orange-700' },
  voided: { label: '已作废', bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function LabelBadge({ status, quantity }: LabelBadgeProps) {
  const cfg = STATUS_MAP[status];
  if (!cfg || !cfg.label) return <span>{quantity ?? '-'} 株</span>;
  return (
    <span className={`inline-flex items-center gap-1`}>
      <span>{quantity ?? '-'} 株</span>
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    </span>
  );
}
```

#### 步骤 5.2：创建 LabelTable.tsx（左侧标签列表）

从 SeedlingLabelManageModal 提取左侧表格逻辑：搜索、分页、点击选中、状态徽章。

```tsx
import React from 'react';
import { Tag, Search } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination, Input } from '@/components/ui';
import { LabelBadge } from './LabelBadge';
import type { PlantLabel } from '../../../../stores/usePlantLabelStore';

interface LabelTableProps {
  labels: PlantLabel[];
  selectedLabelId: number | null;
  searchText: string;
  onSearchChange: (v: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSelectLabel: (id: number) => void;
  loading?: boolean;
}

const PAGE_SIZE = 20;

export function LabelTable({
  labels, selectedLabelId, searchText, onSearchChange,
  page, totalPages, onPageChange, onSelectLabel, loading,
}: LabelTableProps) {
  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (labels.length === 0) return <div className="py-12 text-center text-gray-400"><Tag className="w-10 h-10 mx-auto mb-2 text-gray-300" /><p className="text-sm">暂无标签数据</p></div>;

  const start = (page - 1) * PAGE_SIZE;
  const paginated = labels.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={searchText} onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }}
            placeholder="搜索标签编号..." className="pl-9 pr-3 py-2 border border-gray-400 rounded-lg text-sm w-full" />
        </div>
      </div>
      <Table>
        <TableHeader className="bg-gray-50 sticky top-0">
          <TableRow>
            <TableHead className="px-3 py-2 text-xs">标签编号</TableHead>
            <TableHead className="px-3 py-2 text-xs">移入位置</TableHead>
            <TableHead className="px-3 py-2 text-xs">数量</TableHead>
            <TableHead className="px-3 py-2 text-xs">移入日期</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100">
          {paginated.map((label) => (
            <TableRow key={label.id}
              className={`cursor-pointer ${selectedLabelId === label.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''}`}
              onClick={() => onSelectLabel(label.id)}>
              <TableCell className="px-3 py-2 font-mono text-xs">{label.label_number}</TableCell>
              <TableCell className="px-3 py-2 text-xs text-gray-600">{label.move_in_area_name || '-'}</TableCell>
              <TableCell className="px-3 py-2 text-xs">
                <LabelBadge status={label.status} quantity={label.quantity} />
              </TableCell>
              <TableCell className="px-3 py-2 text-xs text-gray-600">{label.move_in_date || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex justify-center p-3 border-t">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </>
  );
}
```

#### 步骤 5.3：创建 LabelResumePanel.tsx（右侧履历面板）

```tsx
import React from 'react';
import { Tag } from 'lucide-react';
import { LabelResumeTimeline } from '../../../ui';
import type { LabelResumeEntry } from '../../../ui/LabelResumeTimeline';
import type { PlantLabelResume, PlantLabel } from '../../../../stores/usePlantLabelStore';

interface LabelResumePanelProps {
  selectedLabel: PlantLabel | undefined;
  resumes: PlantLabelResume[];
  loading: boolean;
}

export function LabelResumePanel({ selectedLabel, resumes, loading }: LabelResumePanelProps) {
  return (
    <>
      {!selectedLabel ? (
        <div className="py-12 text-center text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>请在左侧选择一个标签查看履历</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <LabelResumeTimeline
          entries={resumes.map((r): LabelResumeEntry => ({
            id: r.id,
            operationType: r.operationType,
            fromAreaName: r.fromAreaName || undefined,
            toAreaName: r.toAreaName || undefined,
            operationDate: r.operationDate,
            markName: r.markName || undefined,
            markColor: r.markColor || undefined,
            operatorName: r.operatorName || undefined,
            imageBase64: r.imageBase64 || undefined,
          }))}
          currentLabel={selectedLabel?.label_number}
          currentMark={undefined}
        />
      )}
    </>
  );
}
```

#### 步骤 5.4：创建 AddResumeForm.tsx（行内录入表单 + quantity/reason）

从 SeedlingLabelManageModal 提取行内录入表单，加新增字段 quantity_change、reason、expected_quantity。

关键改动：
- 复用 PlantLabel 当前 quantity 自动填入 expected_quantity
- 新增"数量"输入框（本次操作涉及数量）
- 新增"原因"文本框
- 4 个 Tab：移入/移出/打标记/作废

（代码略 ~100 行，完整版从 SeedlingLabelManageModal 当前 457 行中提取）

#### 步骤 5.5：改造 SeedlingLabelManageModal.tsx — 编排组件

原有 457 行 → 缩小到 ~120 行编排代码：
- import 4 个子组件
- state：searchText, labelPage, selectedLabelId, showAddResume
- useEffect 加载标签 → loadLabels({ seedlingId })
- handleSelectLabel → loadResumesForLabels
- 渲染：LabelTable + LabelResumePanel + AddResumeForm + 底部按钮

#### 步骤 5.6：编译验证

```bash
npx vite build 2>&1 | tail -3
```

预期：`✓ built`

#### 步骤 5.7：Commit

```bash
git add src/components/farm/seedling/modals/
git commit -m "refactor(plant-labels): SeedlingLabelManageModal 拆 4 子组件 + quantity/status 显示"
```

---

### 任务 6：PrintLabelModal 升级 + 扫码 URL 参数（T6）

**文件：**
- 修改：`src/components/farm/seedling/modals/PrintLabelModal.tsx`
- 修改：`src/components/farm/seedling/SeedlingPage.tsx`

#### 步骤 6.1：PrintLabelModal 加"标签类型"切换

在 batch 模式表单中新增：

```tsx
import { LabelTypeSelector, type LabelType } from '@/components/ui';

// state
const [labelType, setLabelType] = useState<LabelType>('batch');
const [batchQuantity, setBatchQuantity] = useState<number>(5000);
const [mixedQuantities, setMixedQuantities] = useState<Record<number, number>>({});

// 渲染：batch 模式上方加类型选择
{printMode === 'batch' && (
  <div className="mb-3">
    <Label className="text-gray-600 text-xs mb-1">标签类型</Label>
    <LabelTypeSelector value={labelType} onChange={setLabelType} />
  </div>
)}

// 批次数量的渲染根据 labelType 切换
{labelType === 'batch' && (
  <div>
    <Label className="text-gray-600 text-xs">每标签数量（株）</Label>
    <Input type="number" value={batchQuantity} onChange={e => setBatchQuantity(Number(e.target.value))}
      className="w-32 px-3 py-1 border border-gray-400 rounded text-sm" />
  </div>
)}
```

混合模式预览表：

```tsx
{labelType === 'mixed' && printCount > 0 && (
  <div className="max-h-40 overflow-y-auto border rounded mt-2">
    <table className="w-full text-xs">
      <thead><tr><th className="px-2 py-1 bg-gray-50">标签编号</th><th className="px-2 py-1 bg-gray-50">数量（株）</th></tr></thead>
      <tbody>
        {Array.from({ length: printCount }).map((_, i) => (
          <tr key={i}>
            <td className="px-2 py-1 font-mono">{`${record.seedlingCode}-${String(i+1).padStart(4,'0')}`}</td>
            <td className="px-2 py-1">
              <Input type="number" value={mixedQuantities[i] ?? 1}
                onChange={e => setMixedQuantities({ ...mixedQuantities, [i]: Number(e.target.value) })}
                className="w-20 px-2 py-0.5 border rounded text-xs" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

handlePrint 调用 batchCreateLabels 时传 `quantity` 字段：

```tsx
newLabels.push({
  labelNumber: `${record.seedlingCode}-${String(startIdx + i + 1).padStart(4, '0')}`,
  seedlingId: record.id,
  moveInAreaName: record.siteName || null,
  moveInDate: record.startDate || null,
  quantity: labelType === 'batch' ? batchQuantity : labelType === 'single' ? 1 : (mixedQuantities[i] ?? 1),
});
```

#### 步骤 6.2：QR 内容改成 URL

```tsx
const getQrCodeValue = (label: string) =>
  `${window.location.origin}/seedlings?seedlingId=${record.id}&labelNumber=${encodeURIComponent(label)}`;
```

#### 步骤 6.3：SeedlingPage 解析 URL 参数自动打开弹窗

在 `SeedlingPage.tsx` 的 `useEffect` 中加：

```tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const seedlingId = params.get('seedlingId');
  const labelNumber = params.get('labelNumber');
  if (seedlingId && labelNumber) {
    // 找到对应育苗记录
    const seedling = seedlings.find(s => s.id === seedlingId);
    if (seedling) {
      setLabelManageRecord(seedling);
      setLabelManageOpen(true);
      // 自动选中标签（弹窗打开后，内部 useEffect 会加载标签列表，
      // 加载完成后自动选中 labelNumber 对应的标签）
    }
    // 清理 URL（避免刷新重复开弹窗）
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [seedlings]);
```

LabelManage 弹窗加 `autoSelectLabelNumber` prop，加载标签列表后自动选：

```tsx
useEffect(() => {
  if (autoSelectLabelNumber && labels.length > 0) {
    const target = labels.find(l => l.label_number === autoSelectLabelNumber);
    if (target) handleSelectLabel(target.id);
  }
}, [autoSelectLabelNumber, labels]);
```

#### 步骤 6.4：编译验证

```bash
npx vite build 2>&1 | tail -3
```

预期：`✓ built`

#### 步骤 6.5：Commit

```bash
git add src/components/farm/seedling/modals/PrintLabelModal.tsx src/components/farm/seedling/SeedlingPage.tsx
git commit -m "feat(plant-labels): PrintLabelModal 升级批次/单株/混合模式 + 扫码 URL 参数 + SeedlingPage 自动打开弹窗"
```

---

### 任务 7：测试 100% 覆盖 + 1 E2E（T7）

**文件：**
- 创建：`server/src/__tests__/plantLabels.test.ts`
- 创建：`server/src/__tests__/plantLabelResumes.test.ts`
- 创建：`server/src/__tests__/plantMarks.test.ts`
- 创建：`src/components/ui/__tests__/LabelTypeSelector.test.tsx`
- 创建：`src/components/farm/seedling/modals/__tests__/LabelBadge.test.tsx`
- 创建：`src/components/farm/seedling/modals/__tests__/LabelTable.test.tsx`
- 创建：`src/components/farm/seedling/modals/__tests__/AddResumeForm.test.tsx`
- 创建：`src/components/farm/seedling/modals/__tests__/LabelResumePanel.test.tsx`
- 创建：`src/components/farm/seedling/modals/__tests__/SeedlingLabelManageModal.test.tsx`
- 创建：`e2e/plantLabel.spec.ts`

> ⚠️ **注意：** TDD 流程。每项先写测试，再验证失败，再确认通过。由于测试文件较多（10 个），按后端→前端→E2E 顺序分批提交。

#### 步骤 7.1：后端单元测试 — plantLabels.test.ts

```typescript
import { describe, it, expect } from 'vitest';

describe('plantLabels routes', () => {
  it('batch-create 接受 quantity 字段', async () => {
    // mock enhancedApiClient
    const res = await fetch('/api/plant-labels/batch-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels: [{ labelNumber: 'TEST-001', quantity: 5000, seedlingId: 'test' }] }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.inserted).toBe(1);
  });

  it('GET /plant-labels 返回 quantity 和 status', async () => {
    const res = await fetch('/api/plant-labels?seedling_id=test&limit=1');
    const data = await res.json();
    expect(data.data[0]).toHaveProperty('quantity');
    expect(data.data[0]).toHaveProperty('status');
  });

  it('by-number 返回标签详情 + 履历', async () => {
    const res = await fetch('/api/plant-labels/by-number/TEST-001');
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('label');
    expect(data.data).toHaveProperty('resumes');
  });
});
```

#### 步骤 7.2：后端单元测试 — plantLabelResumes.test.ts

覆盖：move_out + quantity_change → quantity 减少、expected_quantity CAS 冲突 409、quantity→0 自动 voided。

```typescript
import { describe, it, expect } from 'vitest';

describe('plantLabelResumes routes', () => {
  it('move_out + quantity_change 减少标签 quantity', async () => {
    // 先查当前 quantity
    const getRes = await fetch('/api/plant-labels/by-number/TEST-001');
    const { label } = (await getRes.json()).data;
    const currentQty = label.quantity;

    // move_out 200
    const res = await fetch(`/api/plant-labels/${label.id}/resumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation_type: 'move_out', operation_date: '2026-06-23',
        to_area_name: '隔离区', quantity_change: 200,
        reason: '夏季高温死亡', expected_quantity: currentQty,
      }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.quantity).toBe(currentQty - 200);
    expect(data.data.status).toBe('active');
  });

  it('expected_quantity 不匹配返回 409', async () => {
    const res = await fetch('/api/plant-labels/4/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation_type: 'move_out', operation_date: '2026-06-23', expected_quantity: 99999 }),
    });
    expect(res.status).toBe(409);
  });

  it('quantity 减到 0 自动 voided', async () => {
    // 先移走剩余所有
    const getRes = await fetch('/api/plant-labels/by-number/TEST-001');
    const { label } = (await getRes.json()).data;
    const res = await fetch(`/api/plant-labels/${label.id}/resumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation_type: 'move_out', operation_date: '2026-06-23', quantity_change: label.quantity, expected_quantity: label.quantity }),
    });
    const data = await res.json();
    expect(data.data.status).toBe('voided');
  });
});
```

#### 步骤 7.3：后端单元测试 — plantMarks.test.ts

覆盖：GET /marks/all 返回 4 个默认标记、POST /assign 成功创建。

#### 步骤 7.4：前端单元测试 — LabelTypeSelector.test.tsx

```tsx
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LabelTypeSelector } from './LabelTypeSelector';

describe('LabelTypeSelector', () => {
  it('渲染 3 个选项', () => {
    const { getByText } = render(<LabelTypeSelector value="batch" onChange={() => {}} />);
    expect(getByText('批次')).toBeTruthy();
    expect(getByText('单株')).toBeTruthy();
    expect(getByText('混合')).toBeTruthy();
  });

  it('点击触发 onChange', () => {
    let val = 'batch';
    const { getByText } = render(<LabelTypeSelector value={val} onChange={(v) => { val = v; }} />);
    fireEvent.click(getByText('单株'));
    expect(val).toBe('single');
  });
});
```

#### 步骤 7.5：前端单元测试 — LabelBadge.test.tsx

```tsx
describe('LabelBadge', () => {
  it('active 状态不显示徽章', () => {
    const { container } = render(<LabelBadge status="active" quantity={5000} />);
    expect(container.textContent).toContain('5000');
    expect(container.querySelector('.bg-orange-100')).toBeFalsy();
  });
  it('voided 状态显示已作废', () => {
    const { getByText } = render(<LabelBadge status="voided" quantity={0} />);
    expect(getByText('已作废')).toBeTruthy();
  });
});
```

#### 步骤 7.6：前端单元测试 — LabelTable / AddResumeForm / LabelResumePanel

各 3-5 个 case，覆盖：空列表、搜索过滤、分页、点击选中、表单输入、提交。

#### 步骤 7.7：前端单元测试 — SeedlingLabelManageModal.test.tsx

覆盖：加载标签列表、点击标签加载履历、打开/关闭弹窗。

#### 步骤 7.8：E2E 测试 — e2e/plantLabel.spec.ts

Playwright 完整闭环：

```typescript
import { test, expect } from '@playwright/test';

test('批次生成 → 录入履历 → 扫码查询 完整闭环', async ({ page }) => {
  // 1. 打开育苗页面 → 点 Tag 图标
  await page.goto('/seedlings');
  await page.waitForSelector('table');
  // 点第一个育苗的 Tag 按钮
  await page.click('[title="标签管理"]');

  // 2. 点"+ 补充生成" → 选批次 → quantity=5000 → 确认
  await page.click('text=新增履历');  // "+" 按钮
  await page.click('text=批次');
  await page.fill('input[placeholder*="数量"]', '5000');
  await page.click('text=确认');

  // 3. 左侧出现 1 个标签
  await expect(page.locator('text=5000 株')).toBeVisible();

  // 4. 录入移出 + 数量 200
  await page.click('text=移出');
  await page.fill('input[placeholder*="区域"]', '隔离区');
  await page.fill('input[placeholder*="数量"]', '200');
  await page.fill('input[placeholder*="原因"]', '夏季高温');
  await page.click('text=确认');

  // 5. 验证 quantity 减少
  await expect(page.locator('text=4800 株')).toBeVisible();

  // 6. 验证履历时间线
  await expect(page.locator('text=夏季高温')).toBeVisible();
});
```

#### 步骤 7.9：运行所有测试

```bash
npm run test:run
npx playwright test e2e/plantLabel.spec.ts
```

预期：全部通过。

#### 步骤 7.10：Commit

```bash
git add server/src/__tests__/ src/components/*/\_\_tests__/ e2e/
git commit -m "test(plant-labels): 100% 路径覆盖 — 后端 3 + 前端 6 + E2E 1"
```

---

### 任务 8：后端分页 + 性能验证（T8）

**文件：**
- 修改：`server/src/routes/plantLabels.ts`（GET / 路由）
- 修改：`src/stores/usePlantLabelStore.ts`（loadLabels 传递 page）

#### 步骤 8.1：后端 GET /plant-labels 分页上限提高

移除硬编码 `limit=200`，改为用户传入 `limit` 参数（上限 500）：

```typescript
const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
```

meta 返回 `total, page, limit, totalPages`：

```typescript
res.json({
  success: true,
  data: items,
  meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
});
```

#### 步骤 8.2：前端 Store loadLabels 支持 page

```typescript
loadLabels: async (filter) => {
  set({ labelsLoading: true });
  try {
    const params = new URLSearchParams();
    if (filter?.plantingId) params.set('planting_id', filter.plantingId);
    if (filter?.seedlingId) params.set('seedling_id', filter.seedlingId);
    if (filter?.page) params.set('page', String(filter.page));
    params.set('limit', '100');
    const res = await enhancedApiClient.get(`/plant-labels?${params.toString()}`);
    const list: any[] = Array.isArray(res) ? res : ((res as any)?.data || []);
    set({ labels: list, labelsLoading: false });
  }
}
```

#### 步骤 8.3：前端 SeedlingLabelManageModal 翻页时调后端 page

LabelTable 的 onPageChange → 触发 loadLabels({ seedlingId, page: newPage }) 重新加载。

#### 步骤 8.4：性能基准测试

```bash
# 批量 5000 INSERT 性能
time curl -s -X POST "http://localhost:3001/api/plant-labels/batch-create" -H "Content-Type: application/json" -d '{"labels":[...5000 entries...]}'

# 分页 5000 标签性能
time curl -s "http://localhost:3001/api/plant-labels?seedling_id=SD1781504395062&page=1&limit=100"
time curl -s "http://localhost:3001/api/plant-labels?seedling_id=SD1781504395062&page=50&limit=100"
```

预期：
- batch-create 5000 条 < 1 秒
- page 查询 < 300ms

#### 步骤 8.5：Commit

```bash
git add server/src/routes/plantLabels.ts src/stores/usePlantLabelStore.ts src/components/farm/seedling/modals/SeedlingLabelManageModal.tsx
git commit -m "perf(plant-labels): 后端分页 limit 提高到 500 + 前端 page 参数联动 + 性能基准验证"
```

---

## 实施顺序依赖图

```
T1 (schema)
  ├─→ T2 (后端 API) ──→ T7 (后端测试)
  ├─→ T3 (Store 类型)
  ├─→ T4 (公共组件 LabelTypeSelector) ──→ T7 (前端测试)
  ├─→ T5 (SeedlingLabelManageModal 拆分) ──→ T7 (前端测试)
  ├─→ T6 (PrintLabelModal + URL) ──→ T7 (E2E 测试)
  └─→ T8 (分页) ──→ T7 (加载测试)
```

**T2-T8 可并行开发**（都依赖 T1 schema 完成），但 T7 必须最后（串联）。
T2+T3+T4 是首批并行任务（无互相依赖）。

## 回归测试 Checklist

- [ ] 旧标签管理弹窗正常打开
- [ ] 旧 PrintLabelModal 批次模式打印正常
- [ ] 履历录入正常工作
- [ ] 拍照上传正常
- [ ] 旧种植管理（PlantingPage）标签功能正常
- [ ] 旧 LBL_ 标签正确显示 quantity=1
