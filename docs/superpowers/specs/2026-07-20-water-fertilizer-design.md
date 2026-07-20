# 水肥管理功能设计文档

**日期**: 2026-07-20
**分支**: planting-management
**状态**: 已批准（v1.1 — 审核修订版）

## 变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-07-20 | 初版 |
| v1.1 | 2026-07-20 | 16 项审核修订（6 CRITICAL + 5 HIGH + 5 MEDIUM）：事务原子性、级联删除、稀释换算、单位换算、syncDailyRecords 一致性、area_name 补缺、编辑保护、筛选器枚举、水费字段、交叉引用链接、Tab 状态管理 |

## 1. 概述

将「施肥管理」升级为「水肥管理」，在现有施肥记录基础上增加浇水记录管理。三种场景：
1. **独立浇水** — 用户手动新增浇水记录（用水量/浇水方式/区域）
2. **施肥稀释用水** — 施肥时如果填写了稀释倍数，自动换算并生成浇水记录
3. **每日记录同步** — 种植/育苗每日记录里的浇水数据同步到水肥管理

## 2. 核心决策

| # | 决策 | 选择 |
|---|------|------|
| 1 | 数据模型 | 独立 `watering_records` 表（与 fertilizer_records 分离） |
| 2 | 页面结构 | 合并列表：同页面 Tab 切换（施肥记录 \| 浇水记录） |
| 3 | 施肥稀释触发 | 自动生成 — 保存施肥记录时自动创建浇水记录 |
| 4 | 浇水记录粒度 | 池模式 — 与施肥一致，一条记录可覆盖多区域 |
| 5 | 每日记录同步 | 写入时同步 — 每日记录保存时 upsert 到 watering_records |
| 6 | 路由 | `/crop/fertilizer` 不变，页面标题改为「水肥管理」 |

## 3. 数据模型

### 3.1 新表 `watering_records`

```sql
CREATE TABLE IF NOT EXISTS watering_records (
  id                      TEXT PRIMARY KEY,
  water_code              TEXT NOT NULL UNIQUE,         -- 浇水编号，前缀 SW
  record_type             TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'fertilizer_dilution' | 'daily_sync'
  -- 稀释来源关联
  fertilizer_record_id    TEXT,                          -- 施肥记录 ID (record_type = fertilizer_dilution)
  -- 每日记录来源
  source_daily_record_id  TEXT,                          -- 每日记录 ID (record_type = daily_sync)
  -- 业务关联
  crop_name               TEXT NOT NULL,
  crop_variety            TEXT,
  greenhouse_id           TEXT,
  greenhouse_name         TEXT NOT NULL,
  area_id                 TEXT,                          -- 区域 ID（外键关联，筛选用）
  area_name               TEXT,                          -- 区域名称快照（来自 pool 第一行 area）
  planting_id             TEXT,
  planting_code           TEXT,
  seedling_id             TEXT,
  seedling_code           TEXT,
  -- 核心数据
  water_pool              TEXT,                          -- 浇水池 JSON（区域×用水明细）
  total_water             REAL NOT NULL DEFAULT 0,
  water_unit              TEXT DEFAULT 'L',
  water_cost              REAL DEFAULT 0,                -- 水费（可选，产量核算用）
  -- 元数据
  water_time              TEXT NOT NULL,
  operator_id             TEXT,
  operator_name           TEXT,
  data_source             TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'auto_iot'
  iot_device_id           TEXT,
  description             TEXT,
  status                  TEXT DEFAULT 'completed',
  create_time             TEXT DEFAULT (datetime('now','localtime')),
  update_time             TEXT DEFAULT (datetime('now','localtime')),
  -- 外键
  FOREIGN KEY (fertilizer_record_id) REFERENCES fertilizer_records(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_watering_records_water_time ON watering_records(water_time);
CREATE INDEX IF NOT EXISTS idx_watering_records_crop_name ON watering_records(crop_name);
CREATE INDEX IF NOT EXISTS idx_watering_records_record_type ON watering_records(record_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_watering_records_daily_sync ON watering_records(source_daily_record_id) WHERE source_daily_record_id IS NOT NULL;
```

### 3.2 浇水池 JSON 结构 (`water_pool`)

```typescript
interface WateringPoolRow {
  area: string;                       // 区域名称
  wateringMethod: string;             // 浇水方式代码（drip_irrigation 等）
  waterAmount: number;                // 用水量
  waterUnit: string;                  // 单位
  // 稀释关联字段（仅 record_type = 'fertilizer_dilution' 时填充）
  sourceFertilizerName?: string;
  sourceDilutionRatio?: string;
  sourceFertilizerQuantity?: number;
}
```

### 3.3 浇水编号规则

前缀 `SW` + 日期 + 当日自增序号，格式：`SW20260720-0001`

## 4. 后端架构

### 4.1 新增文件

| 文件 | 说明 |
|------|------|
| `server/src/routes/watering.ts` | 浇水记录 CRUD 路由 |
| `server/src/services/watering.service.ts` | 浇水业务逻辑（CRUD + 稀释创建 + 每日同步） |
| `server/src/repositories/watering.repository.ts` | 浇水数据访问层 |
| `server/src/lib/syncDailyRecords.ts` | **修改** — 新增 `syncWateringFromDailyRecord()` |
| `server/src/services/fertilizer.service.ts` | **修改** — apply/update/remove/removeBatch 加浇水创建/级联 |
| `server/src/routes/index.ts` | **修改** — 注册 `/api/watering` 路由 |
| `server/src/routes/planting.ts` | **修改** — DELETE 每日记录时级联删浇水 |
| `server/src/routes/seedling.ts` | **修改** — DELETE 每日记录时级联删浇水 |
| `server/src/db/schema.ts` | **修改** — 新增 `watering_records` 表定义 |
| `server/src/db/fixMissingSchema.ts` | **修改** — 新增 `watering_records` 表补建 |

### 4.2 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/watering/generate-code` | 生成浇水编号 |
| GET | `/api/watering` | 查询浇水记录（支持筛选 + 分页） |
| GET | `/api/watering/stats` | 浇水统计 |
| POST | `/api/watering` | 新增浇水记录 |
| GET | `/api/watering/:id` | 单条详情 |
| PUT | `/api/watering/:id` | 编辑浇水记录 |
| DELETE | `/api/watering/:id` | 删除浇水记录 |
| POST | `/api/watering/batch-delete` | 批量删除 |

### 4.3 施肥稀释自动生成（修改 `fertilizer.service.ts`）

**事务安全原则**：浇水创建必须在施肥服务的**同一 `db.exec('BEGIN')` / `db.exec('COMMIT')` 事务内**执行，直接操作 `wateringRepository`，不可经过独立的 watering service 事务包装（SQLite 不支持嵌套事务，第二次 BEGIN 会隐式 COMMIT 第一个 → 破坏原子性）。

在 `apply()` 方法的 `db.exec('COMMIT')` 前增加：
- 遍历 `fertilizationPool` 每一行
- 调用 `parseDilutionForWater(dilutionRatio)` 解析稀释倍数（见 §4.6）
- 如果有有效稀释倍数 → 计算水量 → 调用 `wateringRepository.insert()` 插入浇水记录
- 施肥插入失败（ROLLBACK）时浇水记录也自动回滚

在 `update()` 方法的事务内：
- **先删后建**：`DELETE FROM watering_records WHERE fertilizer_record_id = ? AND record_type = 'fertilizer_dilution'`
- 重新遍历池，按当前 dilutionRatio 生成新的浇水记录
- 若 dilutionRatio 被改为 `"dry"` 或移除 → 不生成（旧记录已删）

在 `remove()` 方法的事务内：
- `COMMIT` 之前：`DELETE FROM watering_records WHERE fertilizer_record_id = ? AND record_type = 'fertilizer_dilution'`
- FK CASCADE 作为兜底保护

在 `removeBatch()` 方法的事务内：
- 遍历每条待删记录，同样删除关联浇水记录

**浇水 Repository 暴露方法**：
- `wateringRepository` 需要导出 `insert(record)` 方法供 `fertilizerService` 在同一事务内直接调用
- watering service 提供 `createFromFertilizer()` **无事务版本**（仅做数据组装 + 调 repository），事务由调用方管理

### 4.4 每日记录同步（修改 `server/src/lib/syncDailyRecords.ts`）

**与现有模式保持一致**：施肥子记录和农药子记录的同步都在 `syncDailyRecords.ts` 中处理，浇水同步遵循同一模式。

在 `syncDailyRecords.ts` 中新增 `syncWateringFromDailyRecord()` 函数：

**触发条件**（与前端弹窗提交逻辑一致）：
```typescript
const hasWatering = !!(data.wateringMethod || data.wateringAmount != null);
```

**幂等规则**：
- `source_daily_record_id` 上建 UNIQUE 部分索引（仅非 NULL 行）→ 同一每日记录只对应一条浇水记录
- 每日记录**新增**且有浇水 → 插入
- 每日记录**编辑**后仍有浇水 → upsert（DELETE + INSERT）
- 每日记录**编辑**后去掉浇水（方法为空且量为空）→ DELETE 关联浇水记录
- 每日记录**删除** → DELETE 关联浇水记录

**调用点**（在 planting.ts / seedling.ts 的现有 syncDailyRecords 调用之后）：
```typescript
await syncWateringFromDailyRecord(recordId, recordType, record, data);
```

**参数**：
- `recordId`: 每日记录 ID
- `recordType`: `'planting'` | `'seedling'`
- `record`: 每日记录数据库行（含 `crop_name`, `greenhouse_name`, `related_id` 等）
- `data`: 前端提交的 data JSON（含 `wateringMethod`, `wateringAmount`, `wateringUnit`）

**浇水记录字段映射**：
```
record_type       → 'daily_sync'
source_daily_record_id → recordId
crop_name         → record.crop_name
greenhouse_name   → record.greenhouse_name
planting_id       → recordType === 'planting' ? record.related_id : null
seedling_id       → recordType === 'seedling' ? record.related_id : null
water_time        → record.record_date
water_pool        → [{area: record.greenhouse_name, wateringMethod, waterAmount, waterUnit}]
total_water       → data.wateringAmount
water_unit        → data.wateringUnit || 'L'
```

**级联删除**：每日记录 DELETE 路由中，在现有数量补偿逻辑之后增加：
```sql
DELETE FROM watering_records WHERE source_daily_record_id = ? AND record_type = 'daily_sync'
```

### 4.5 路由注册（修改 `server/src/routes/index.ts`）

```typescript
import wateringRouter from './watering';
router.use('/watering', requireAuth, wateringRouter);
```

### 4.6 稀释倍数解析与水量换算（工具函数）

```typescript
/**
 * 解析稀释倍数，返回 ratio 数值。无法解析或不应稀释时返回 null。
 * 格式：dilutionRatio = "1:800" → 800
 *        dilutionRatio = "dry" / "" / null / undefined → null
 */
function parseDilutionForWater(dilutionRatio: string | null | undefined): number | null {
  if (!dilutionRatio || dilutionRatio === 'dry') return null;
  const match = String(dilutionRatio).match(/^1:(\d+)$/);
  if (!match) return null;
  const ratio = parseInt(match[1], 10);
  if (ratio <= 0 || ratio > 100000) return null; // 安全上限 1:100000
  return ratio;
}

/**
 * 计算用水量（含单位换算）
 * 肥料用量统一转为克(g)，水量统一为毫升(mL)，>= 1000mL 时转为升(L)
 * 
 * 例：
 *   0.5kg × 800 = 500g × 800 = 400,000mL → 400L
 *   200g × 500  = 200g × 500 = 100,000mL → 100L
 *   50g × 10    = 50g × 10   = 500mL → 500ml
 */
function calculateWaterAmount(
  fertilizerQty: number,
  fertilizerUnit: string,
  ratio: number,
): { amount: number; waterUnit: string } {
  // 统一转为克
  const qtyInGrams = fertilizerUnit === 'kg' ? fertilizerQty * 1000
    : fertilizerUnit === 'g' ? fertilizerQty
    : fertilizerQty; // 其他单位直接使用
  // 水量 (mL) = 肥料量 (g) × ratio
  const waterInML = qtyInGrams * ratio;
  if (waterInML >= 1000) {
    return { amount: Math.round(waterInML / 10) / 100, waterUnit: 'L' }; // 保留2位小数
  }
  return { amount: Math.round(waterInML), waterUnit: 'ml' };
}

## 5. 前端架构

### 5.1 新增/修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/crop/Fertilizer.tsx` | 重命名导入 | → WaterFertilizerPage |
| `src/components/farm/fertilizer/FertilizerPage.tsx` | 改造 | 加 Tab 系统 |
| `src/components/farm/fertilizer/WaterTable.tsx` | **新建** | 浇水表格（折叠展开） |
| `src/components/farm/fertilizer/WaterFilter.tsx` | **新建** | 浇水筛选器 |
| `src/components/farm/fertilizer/WaterAddModal.tsx` | **新建** | 新增浇水弹窗 |
| `src/components/farm/fertilizer/WaterEditModal.tsx` | **新建** | 编辑浇水弹窗 |
| `src/components/farm/fertilizer/WaterDetailModal.tsx` | **新建** | 浇水详情弹窗 |
| `src/components/farm/fertilizer/WaterPoolEditor.tsx` | **新建** | 浇水池编辑器（区域×用量） |
| `src/stores/useWateringStore.ts` | **新建** | 浇水记录 Store |
| `src/stores/index.ts` | 修改 | 导出新 Store |

### 5.2 组件树

```
FertilizerPage (改造)
├── PageHeader ("水肥管理")
├── Tabs (施肥记录 | 浇水记录)
│   ├── [施肥 Tab] — 所有现有组件不变
│   │   ├── FertilizerFilter
│   │   ├── FertilizerTable
│   │   └── FertilizerAddModal / EditModal / DetailModal
│   └── [浇水 Tab] — 全新组件
│       ├── WaterFilter
│       ├── WaterTable
│       └── WaterAddModal / EditModal / DetailModal
└── 共享：ExportModal / DeleteConfirmModal
```

### 5.3 浇水表格列（WaterTable）

展开折叠模式与 FertilizerTable 一致：

| 主行列 | 展开行明细 |
|--------|------------|
| 浇水编号 | 区域 / 浇水方式 / 用水量 |
| 浇水时间 | |
| 作物 | |
| 区域数 + 区域名称快照 | |
| 总用水量 | |
| 操作员 | |
| 来源（手动录入 / 施肥稀释 / 每日记录同步） | 稀释来源显示「施肥记录 SFxxx」链接 |
| 操作 | 编辑 / 删除（manual 类型可操作；fertilizer_dilution + daily_sync 只读） |

### 5.4 编辑保护（record_type 非 manual 时）

参照施肥模块 IoT 保护模式（`dataSource === 'auto_iot'` → 只读），浇水记录的编辑保护：

| record_type | 新增 | 编辑 | 删除 |
|-------------|------|------|------|
| `manual` | ✅ | ✅ | ✅ |
| `fertilizer_dilution` | ❌ | ❌（显示「由施肥记录 SFxxx 自动生成，请在施肥记录中修改」） | ❌（施肥记录删除时级联删除） |
| `daily_sync` | ❌ | ❌（显示「由每日记录同步，请在种植/育苗页面修改」） | ❌（每日记录删除时级联删除） |

### 5.5 浇水筛选器字段（WaterFilter）

| 筛选字段 | 字典/控件 | 值 |
|----------|----------|-----|
| `recordType` | Select | `''` = 全部 / `'manual'` = 手动录入 / `'fertilizer_dilution'` = 施肥稀释 / `'daily_sync'` = 每日记录同步 |
| `wateringMethod` | Select（复用 `WATERING_METHOD_MAP`） | 16 种浇水方式 |
| `cropName` | 文本输入 | 模糊匹配 |
| `greenhouseName` | 文本输入 | 模糊匹配 |
| `startDate` | DatePicker | 浇水时间起始 |
| `endDate` | DatePicker | 浇水时间结束 |
| `operatorName` | 文本输入 | 模糊匹配 |

### 5.6 浇水新增/编辑弹窗（WaterAddModal / WaterEditModal）

**新增弹窗字段**：

| 字段 | 控件 | 说明 |
|------|------|------|
| 浇水编号 | 只读 Input + "重新生成"按钮 | 自动生成 |
| 浇水时间 | datetime-local Input | 必填 |
| 操作员 | Select（与施肥一致：从种植/育苗 manager 提取） | 选填 |
| 区域选择 | 种植/育苗 Tab + 搜索下拉 | 多选、强制作物一致性 |
| 浇水池 | WaterPoolEditor（每区域：浇水方式 Select + 用水量 Input + 单位 Select） | 至少 1 个区域 |
| 备注 | TextArea | 选填 |

**编辑弹窗额外逻辑**：
- `recordType !== 'manual'` → 显示来源提示横幅，所有字段 disabled，保存按钮隐藏

### 5.7 浇水详情弹窗（WaterDetailModal）

展示内容：
- 头部横幅（绿色渐变）：浇水编号 + 作物 + 总用水量
- 基本信息网格：浇水编号、浇水时间、作物、温室、区域、操作员、数据来源、**关联施肥记录链接**（仅 fertilizer_dilution 类型）、**来源每日记录链接**（仅 daily_sync 类型）、备注
- 浇水池明细表格（按区域分组） |

### 5.8 浇水 Store 接口

```typescript
interface WateringData {
  id: string;
  waterCode: string;
  recordType: 'manual' | 'fertilizer_dilution' | 'daily_sync';
  fertilizerRecordId?: string;
  sourceDailyRecordId?: string;
  cropName: string;
  cropVariety?: string;
  greenhouseId?: string;
  greenhouseName: string;
  areaName?: string;          // 新增（区域快照）
  plantingId?: string;
  plantingCode?: string;
  seedlingId?: string;
  seedlingCode?: string;
  waterPool: string;         // JSON
  totalWater: number;
  waterUnit: string;
  waterCost?: number;         // 新增（水费）
  waterTime: string;
  operatorId?: string;
  operatorName?: string;
  dataSource: 'manual' | 'auto_iot';
  iotDeviceId?: string;
  description?: string;
  status: string;
  createTime: string;
  updateTime: string;
}
```

## 6. 施肥稀释换算

### 6.1 换算流程

```
1. 解析 dilutionRatio → ratio 数值
   - "1:800" → 800
   - "dry" / "" / null / undefined → 跳过
   - 格式不匹配 / ratio <= 0 / > 100000 → 跳过（安全上限）

2. 肥料用量 → 统一转为克(g)
   - unit = 'kg' → qty × 1000
   - unit = 'g'  → qty
   - 其他 → qty（不转换）

3. 水量 = 肥料克数 × ratio (单位: mL)
   - >= 1000mL → 转为 L（保留 2 位小数）
   - < 1000mL → 保留 mL（取整）

4. 写入 watering_records（water_pool JSON + total_water + water_unit）
```

### 6.2 计算示例

| 肥料用量 | 单位 | 稀释比 | 水量 |
|---------|------|--------|------|
| 0.5 | kg | 1:800 | 400 L |
| 200 | g | 1:500 | 100 L |
| 50 | g | 1:10 | 500 ml |
| 2 | kg | 1:1000 | 2000 L |
| 1 | kg | dry | 不生成 |
| 0.5 | kg | (空) | 不生成 |

### 6.3 容错规则

- `dilutionRatio` 为 `"dry"` → 不生成
- `dilutionRatio` 为 `null` / `undefined` / `""` → 不生成
- `dilutionRatio` 格式无法匹配 `^1:\d+$` → 不生成，console.warn
- `ratio` 为 0 或 > 100000 → 不生成，console.warn
- `quantity` 为 0 → 不生成

## 7. 数据流

```
[施肥新增/编辑/删除] → fertilizer.service.ts (同一事务)
                        ├── 扣/还 fertilizer_specs 库存
                        ├── 写 fertilizer_records
                        └── 写/改/删 watering_records (record_type='fertilizer_dilution')

[每日记录新增/编辑/删除] → planting.ts / seedling.ts
                        ├── syncDailyRecords.syncFertilizerFromDailyRecord()
                        ├── syncDailyRecords.syncPesticideFromDailyRecord()
                        └── syncDailyRecords.syncWateringFromDailyRecord()  ← 新增
                              ↓ (检测 wateringMethod || wateringAmount)
                          watering_records (record_type='daily_sync')

[手动新增浇水] → WaterAddModal
                      ↓
                  POST /api/watering → watering_records (record_type='manual')

[前端统一视图] → FertilizerPage Tabs
                  ├── [施肥] → GET /api/fertilizer
                  └── [浇水] → GET /api/watering
```

## 8. Tab 状态管理

FertilizerPage 加 `activeTab: 'fertilizer' | 'watering'` 状态。切换 Tab 时的重置逻辑：

```
activeTab 切换 →
  setOperationMode('normal')
  setExportMode(false)
  setSelectedIds([])
  // 但保留各自的 filters（再次切换回来时筛选条件不丢）
```

**URL 深度链接**：`?tab=watering` → 自动切换到浇水 tab，参照现有 `?new=1` 模式，操作后 `replaceState` 清理 URL。

**状态结构**：
```typescript
const [activeTab, setActiveTab] = useState<'fertilizer' | 'watering'>('fertilizer');
const [fertilizerFilters, setFertilizerFilters] = useState<Record<string, string>>({});
const [waterFilters, setWaterFilters] = useState<Record<string, string>>({});
// selectedIds, operationMode, exportMode 在切换 tab 时重置
```

## 9. 实施策略

**分 2 个阶段**：

| 阶段 | 工作内容 | 依赖 |
|------|---------|------|
| Phase 1 | DB 表 + watering.repository + watering.service（独立 CRUD）+ watering 路由 + useWateringStore + 浇水 Tab 独立增删改查 | — |
| Phase 2 | 施肥稀释自动生成（改 fertilizer.service）+ 每日记录同步（改 syncDailyRecords.ts）+ 页面 Tab 集成 + 交叉引用链接 | Phase 1 |

## 10. 测试要点

- [ ] 浇水记录 CRUD（手动新增/编辑/删除/批量删除）
- [ ] 浇水编号自动生成 SW20260720-0001 格式
- [ ] 施肥保存时自动生成稀释浇水记录（同一事务）
- [ ] dilutionRatio = "dry" / 空 / 非法格式时不生成浇水记录
- [ ] 肥料单位换算正确（kg→g→水mL→L）
- [ ] 施肥编辑时只删 record_type='fertilizer_dilution' 的旧记录
- [ ] 施肥删除时级联删除浇水记录（单条 + 批量）
- [ ] 每日记录保存/编辑时 upsert 浇水记录
- [ ] 每日记录去掉浇水勾选时删除关联浇水记录
- [ ] 每日记录删除时级联删除浇水记录
- [ ] record_type 非 manual 的记录编辑保护（fertilizer_dilution + daily_sync 只读）
- [ ] 浇水 Tab 筛选（recordType / wateringMethod / cropName / greenhouseName / dateRange / operatorName）
- [ ] 浇水 Tab 导出（XLSX/CSV/PDF），与施肥导出 2 步流程一致
- [ ] Tab 切换时重置 selectedIds / operationMode / exportMode
- [ ] 页面刷新后 Tab 状态不丢失
- [ ] ?tab=watering URL 参数直达浇水 tab

## 11. 补充说明

### 11.1 与现有系统的命名冲突

| 已有 | 新设计 | 关系 |
|------|--------|------|
| `water_fertilizer_configs` 表 | `watering_records` 表 | **无数据关联**。前者是 iAGS IoT 水肥一体机设备参数配置，后者是业务浇水记录。`total_water`/`water_unit` 字段名重叠属巧合 |
| `/api/water-fertilizer` 路由 | `/api/watering` 路由 | 功能独立。前者是 IoT 配置 CRUD+下发，后者是浇水业务记录 CRUD |

### 11.2 `record_type` vs `data_source` 双字段分工

`watering_records` 沿用 `fertilizer_records` 的 `data_source` 字段（`'manual'` / `'auto_iot'`）标记**输入方式**。同时新增 `record_type` 标记**业务来源**（`'manual'` / `'fertilizer_dilution'` / `'daily_sync'`）。两字段正交：

| record_type | data_source | 含义 |
|-------------|-------------|------|
| `manual` | `manual` | 用户在水肥管理页面手动新增 |
| `fertilizer_dilution` | `manual` | 施肥记录自动生成 |
| `daily_sync` | `manual` | 每日记录同步 |

此设计保留 `data_source` 以兼容 IoT 扩展（未来可能有 IoT 自动浇水数据，`data_source='auto_iot'`）。

### 11.3 时间戳写入方式

DDL 使用 `DEFAULT (datetime('now','localtime'))`，但 Service 层统一**显式传 `nowLocalTimestamp()`**（参照 `fertilizer.service.ts` 模式），确保事务内所有时间戳一致。

### 11.4 列表查询不 JOIN 取来源编号

`GET /api/watering` 列表查询**不 JOIN** `fertilizer_records` 或 `daily_records`。前端来源列直接按 `record_type` 显示中文映射（「手动录入」「施肥稀释」「每日记录同步」）。只在 `/api/watering/:id` 详情查询中按需 JOIN 取来源实体的 code 字段。

### 11.5 浇水方式字典

数据存储统一使用 dict_code（如 `drip_irrigation`），前端渲染时用 `getDictItemName('watering_method', code)` 翻译为中文。字典复用 `cropConstants.ts` 中已有的 `WATERING_METHOD_MAP`（16 种），无需新建字典。

### 11.6 已知技术债（非本次 scope）

- `fertilizer.repository.ts` 的 `FertilizerRecord` interface 缺少 `source_daily_record_id`/`source_type`/`area_id`/`area_name` 字段声明（fixMissingSchema 已加列，但 TS 接口未同步）。本设计涉及的浇水相关字段走显式类型定义，不依赖此技术债。
- `plantings` 表有 `total_irrigation`/`irrigation_count` 累加字段（`schema.ts:597-598`），但当前每日记录浇水不触发累加。本次设计暂不改变此行为，后续可考虑一致性。

### 11.7 页面入口文件不重命名

`src/pages/crop/Fertilizer.tsx` 保持原名不变（仅透传组件）。路由 `/crop/fertilizer` 不变。只在 `FertilizerPage.tsx` 内部改标题和加 Tab。避免破坏现有 lazy import 链。
