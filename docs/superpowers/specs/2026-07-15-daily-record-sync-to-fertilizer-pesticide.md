# 每日记录施肥/用药同步到施肥/病虫害管理页面

**日期**：2026-07-15
**状态**：设计已批准，待实施

---

## 1. 背景与目标

### 现状
- 种植/育苗管理的每日记录弹窗（`DailyRecordModal`）已支持录入施肥/用药子记录
- 施肥/用药记录以 JSON 形式存于 `daily_records.data` 列（`fertilizerRecords` / `pesticideRecords` 字段）
- 施肥管理页（`fertilizer_records` 表）和病虫害管理页（`pesticide_records` 表）是独立台账，数据由用户手动录入

### 目标
每日记录提交时，自动将施肥/用药子记录同步写入 `fertilizer_records` / `pesticide_records` 表，免去用户重复录入。

### 明确不做
- **删除不联动**：删每日记录不影响已同步的台账（台账是独立历史记录）
- **反向编辑无关**：同步后的记录就是正常台账记录，按现有 CRUD 正常编辑
- **前端 0 改动**：同步逻辑全部在后端路由层实现

---

## 2. 数据库迁移

### 2.1 fertilizer_records 加 3 列

```sql
ALTER TABLE fertilizer_records ADD COLUMN source_daily_record_id TEXT;
ALTER TABLE fertilizer_records ADD COLUMN source_item_id TEXT;
ALTER TABLE fertilizer_records ADD COLUMN source_type TEXT DEFAULT 'manual';
-- 注: 'manual' = 手动录入；'daily_record_sync' = 每日记录同步
```

### 2.2 pesticide_records 加 3 列

```sql
ALTER TABLE pesticide_records ADD COLUMN source_daily_record_id TEXT;
ALTER TABLE pesticide_records ADD COLUMN source_item_id TEXT;
ALTER TABLE pesticide_records ADD COLUMN source_type TEXT DEFAULT 'manual';
```

### 2.3 幂等
同步时使用 `source_daily_record_id` + `source_item_id` 做 upsert 键（先 DELETE 匹配行再 INSERT），保证重复 POST 不产生重复记录。

---

## 3. 后端实现

### 3.1 新增文件：`server/src/lib/syncDailyRecords.ts`

导出 2 个函数：

```typescript
syncFertilizerRecords(
  db: any,
  dailyRecordId: string,
  relatedId: string,   // planting_id / seedling_id
  relatedType: 'planting' | 'seedling',
  recordDate: string,
  items: FeedRecordItem[],
  cropName: string,
  cropVariety: string,
  greenhouseName: string,
): Promise<void>

syncPesticideRecords(
  db: any,
  dailyRecordId: string,
  relatedId: string,
  relatedType: 'planting' | 'seedling',
  recordDate: string,
  items: FeedRecordItem[],
  cropName: string,
  cropVariety: string,
  greenhouseName: string,
): Promise<void>
```

职责：
1. 删除旧同步行（幂等）：`DELETE FROM fertilizer_records WHERE source_daily_record_id = ?`
2. 批量 INSERT 新行，字段映射如下
3. 失败只 `console.error` 不抛错（不影响主每日记录）

### 3.2 字段映射

#### 施肥记录

| FeedRecordItem | fertilizer_records | 转换逻辑 |
|---|---|---|
| `source_item_id = item.id` | `id` | `FR-{dailyRecordIdShort}-{itemId}` |
| — | `fertilizer_code` | `generateFertilizerCode()`（已有函数） |
| `relatedType === 'planting' ? relatedId : null` | `planting_id` | |
| `relatedType === 'seedling' ? relatedId : null` | `seedling_id` | |
| — | `greenhouse_name` | 传入 |
| — | `crop_name` | 传入 |
| — | `crop_variety` | 传入 |
| `item.name` | `fertilizer_name` | |
| `item.category` | `fertilizer_type` | |
| `item.unit === 'dilute'` ? `1:${item.dilution}` : 'dry' | `dilution_ratio` | |
| `item.amount` | `quantity` | |
| `item.unit` | `unit` | |
| — | `fertilize_time` | `recordDate` |
| `item.applicationMethod` | `description` | |
| `item.notes` | `description` | 追加 |
| — | `data_source` | `'daily_record'` |
| — | `source_type` | `'daily_record_sync'` |
| `dailyRecordId` | `source_daily_record_id` | |
| `item.id` | `source_item_id` | |

#### 用药记录（同理）

| FeedRecordItem | pesticide_records | 转换逻辑 |
|---|---|---|
| `source_item_id = item.id` | `id` | `PR-{dailyRecordIdShort}-{itemId}` |
| — | `record_code` | `generateRecordCode()`（已有函数） |
| `relatedType === 'planting' ? relatedId : null` | `planting_id` | |
| `relatedType === 'seedling' ? relatedId : null` | `seedling_id` | |
| — | `greenhouse_name` | |
| — | `crop_name` | |
| — | `crop_variety` | |
| `item.name` | `pesticide_name` | |
| `item.category` | `pesticide_type` | |
| `item.unit === 'dilute'` ? `1:${item.dilution}` : 'dry' | `dilution_ratio` | |
| `item.amount` | `quantity` | |
| `item.unit` | `unit` | |
| — | `apply_time` | `recordDate` |
| `item.applicationMethod` | `description` | |
| `item.safetyInterval` | `safety_interval` | |
| `item.targetPest` | `target_pest` | |
| `item.notes` | `description` | 追加 |
| — | `data_source` | `'daily_record'` |
| — | `source_type` | `'daily_record_sync'` |
| `dailyRecordId` | `source_daily_record_id` | |
| `item.id` | `source_item_id` | |

### 3.3 修改 2 个路由文件

**`server/src/routes/planting.ts`** — 第 1491 行 `POST /:id/daily-records`：
```
// 在 daily_records INSERT 成功后、applyDailyChangeToPlanting 之前
if (data) {
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  const fertItems: FeedRecordItem[] = parsed?.fer fertilizerRecords || [];
  const pestItems: FeedRecordItem[] = parsed?.pesticideRecords || [];
  if (fertItems.length > 0 || pestItems.length > 0) {
    const { syncFertilizerRecords, syncPesticideRecords } = require('../lib/syncDailyRecords');
    await Promise.allSettled([
      fertItems.length > 0 && syncFertilizerRecords(db, newId, id, 'planting', recordDate, fertItems, cropName, cropVariety, greenhouseName),
      pestItems.length > 0 && syncPesticideRecords(db, newId, id, 'planting', recordDate, pestItems, cropName, cropVariety, greenhouseName),
    ]);
  }
}
```

**`server/src/routes/seedling.ts`** — 类似位置追加同样调用（相关变量名对应育苗路由）。

### 3.4 同步流程时序

```
POST /plantings/:id/daily-records
  │
  ├─ 1. 业务校验（损耗 ≤ 剩余）
  ├─ 2. INSERT daily_records (主记录)
  ├─ 3. applyDailyChangeToPlanting (活体数量 delta)
  ├─ 4. syncFertilizerRecords()  ← 新增
  │     ├─ DELETE FROM fertilizer_records WHERE source_daily_record_id = ?
  │     └─ INSERT fertilizer_records × N
  ├─ 5. syncPesticideRecords()   ← 新增
  │     ├─ DELETE FROM pesticide_records WHERE source_daily_record_id = ?
  │     └─ INSERT pesticide_records × N
  ├─ 6. saveDatabase()
  └─ 7. 返回 { success: true, data: inserted }

注: 步骤 4/5 内部 catch 只 console.error，
    不阻断主流程（写入失败只影响台账，不影响每日记录）
```

---

## 4. 存量数据补录

`fixMissingSchema.ts` 追加一次性迁移：

```typescript
// 2026-07-15: 存量每日记录施肥/用药子记录同步到施肥/病虫害管理页
function backfillDailyFertilPesticide() {
  const db = getDatabase();
  // 1. 列存在才执行（防止新库走旧逻辑）
  // 2. 遍历所有 record_type IN ('planting','seedling') 的 daily_records
  // 3. 解析 data JSON → fertilizerRecords / pesticideRecords
  // 4. 检查 source_daily_record_id 不存在才 INSERT（幂等）
  // 5. 日志输出: 补录 N 条施肥 + M 条用药
}
```

---

## 5. 错误处理

| 场景 | 行为 |
|------|------|
| fertilizer_records 表缺新列 | 迁移先跑；sync helper 检查列存在性，跳过 |
| sync 写入失败 | `console.error` 记录，主记录仍成功返回 |
| data JSON 解析失败 | 跳过同步，不影响主记录 |
| 重复 POST（网络重试） | 幂等设计（先 DELETE 旧同步行再 INSERT） |
| 存量补录重复执行 | 检查 `source_daily_record_id` 存在则跳过 |

---

## 6. 测试计划

### 6.1 单元测试（后端）
文件：`server/src/__tests__/syncDailyRecords.test.ts`

- `syncFertilizerRecords` 插入后能查到记录
- 重复调用幂等（不产生重复记录）
- `dilutionType='dilute'` 映射为 `1:N` 格式
- 失败不抛错（try/catch 验证）

### 6.2 集成测试（curl）

```bash
# 1. 提交种植每日记录（含施肥/用药）
curl -X POST http://localhost:3001/api/plantings/{id}/daily-records \
  -d '{"recordDate":"2026-07-15","data":{"fertilizerRecords":[{"name":"尿素","category":"nitrogen","amount":5,"unit":"kg","dilution":500,"dilutionType":"dilute","applicationMethod":"irrigation"},...],"pesticideRecords":[...]}}'

# 2. 查询施肥管理列表 — 应看到同步记录
curl http://localhost:3001/api/fertilizer?planting_id={id}

# 3. 查询病虫害管理列表 — 应看到同步记录
curl http://localhost:3001/api/pest-records?planting_id={id}

# 4. 存量补录迁移（自动在服务器启动后的 fixMissingSchema 执行）
curl http://localhost:3001/actuator/health  # 确认启动无报错
```

### 6.3 浏览器实测
1. 进入种植管理页 → 选一行 → 每日记录
2. 添加施肥（名称="测试尿素"、量=10、方式=灌溉）
3. 添加用药（名称="测试药剂"、量=5、稀释=1000）
4. 提交 → 刷新施肥管理页 → 应看到这条记录
5. 刷新病虫害管理页 → 应看到用药记录
6. 再次提交（模拟网络重试）→ 不产生重复

---

## 7. 实施顺序

1. DB schema 追加 3 列（fixMissingSchema.ts + schema.ts）
2. 新建 `server/src/lib/syncDailyRecords.ts`
3. 修改 `server/src/routes/planting.ts` 追加 sync 调用
4. 修改 `server/src/routes/seedling.ts` 追加 sync 调用
5. `fixMissingSchema.ts` 追加存量补录迁移
6. 后端单元测试
7. curl 集成测试
8. 浏览器实测

---

## 8. 影响文件清单

| 文件 | 操作 |
|------|------|
| `server/src/lib/syncDailyRecords.ts` | 新建 |
| `server/src/routes/planting.ts` | 修改（POST /:id/daily-records 末尾追加 sync） |
| `server/src/routes/seedling.ts` | 修改（同上） |
| `server/src/db/fixMissingSchema.ts` | 修改（追加迁移 + 存量补录） |
| `server/src/db/schema.ts` | 修改（追加新列 CREATE TABLE IF NOT EXISTS 兼容） |
| `server/src/__tests__/syncDailyRecords.test.ts` | 新建 |

**前端 0 文件改动。**
