# 水肥管理功能设计文档

**日期**: 2026-07-20
**分支**: planting-management
**状态**: 已批准

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
  planting_id             TEXT,
  planting_code           TEXT,
  seedling_id             TEXT,
  seedling_code           TEXT,
  -- 核心数据
  water_pool              TEXT,                          -- 浇水池 JSON（区域×用水明细）
  total_water             REAL NOT NULL DEFAULT 0,
  water_unit              TEXT DEFAULT 'L',
  watering_method         TEXT,                          -- 主要浇水方式（快照，来自 pool 第一行）
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

在 `apply()` 方法末尾增加逻辑：
- 遍历 `fertilizationPool` 每一行
- 如果有 `dilutionRatio` 且不是 `"dry"`，解析稀释倍数计算水量
- 调用 `wateringService.createFromFertilizer()` 插入浇水记录

在 `update()` 方法中：
- 先删除旧关联浇水记录
- 重新生成新的稀释浇水记录

在 `remove()` 方法中：
- 级联删除关联浇水记录（FK CASCADE + 显式 delete）

### 4.4 每日记录同步（修改 `server/src/routes/planting.ts` + `seedling.ts`）

在 POST/PUT 每日记录路由中（肥料子记录同步之后）增加：
- 检测 `data.watering === true`
- 调用 `wateringService.upsertFromDailyRecord()`
- 幂等：`source_daily_record_id` 唯一

在 DELETE 每日记录路由中增加：
- 删除关联浇水记录

### 4.5 路由注册（修改 `server/src/routes/index.ts`）

```typescript
import wateringRouter from './watering';
router.use('/watering', requireAuth, wateringRouter);
```

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
| 区域数 | |
| 总用水量 | |
| 操作员 | |
| 来源（手动/施肥稀释/每日记录） | |
| 操作（编辑/删除） | |

### 5.4 浇水 Store 接口

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
  plantingId?: string;
  plantingCode?: string;
  seedlingId?: string;
  seedlingCode?: string;
  waterPool: string;         // JSON
  totalWater: number;
  waterUnit: string;
  wateringMethod?: string;
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

## 6. 施肥稀释换算公式

```
用水量(L) = 肥料用量(kg) × 稀释倍数

例：
  肥料用量: 0.5 kg
  稀释倍数: 1:800 → ratio = 800
  用水量: 0.5 × 800 = 400 L

特殊情况：
  dilutionRatio = "dry" → 不生成浇水记录
  dilutionRatio 无值 → 不生成浇水记录
```

## 7. 数据流

```
[施肥新增/编辑] → fertilizer.service.ts
                      ↓ (检测 dilutionRatio ≠ dry)
                  watering.service.ts → watering_records
                      ↓ (record_type = 'fertilizer_dilution')

[每日记录新增/编辑] → planting.ts / seedling.ts
                      ↓ (检测 watering === true)
                  watering.service.ts → watering_records
                      ↓ (record_type = 'daily_sync')

[手动新增浇水] → WaterAddModal
                      ↓
                  POST /api/watering → watering_records
                      ↓ (record_type = 'manual')

[前端统一视图] → FertilizerPage Tabs
                  ├── [施肥] → GET /api/fertilizer
                  └── [浇水] → GET /api/watering
```

## 8. 实施策略

**分 2 个阶段**：

| 阶段 | 工作内容 | 依赖 |
|------|---------|------|
| Phase 1 | DB 表 + 后端 CRUD + Store + 独立浇水增删改查 | — |
| Phase 2 | 施肥稀释自动生成 + 每日记录同步 + 页面 Tab 集成 | Phase 1 |

## 9. 测试要点

- [ ] 浇水记录 CRUD（手动新增/编辑/删除/批量删除）
- [ ] 浇水编号自动生成 SW20260720-0001 格式
- [ ] 施肥保存时自动生成稀释浇水记录
- [ ] dilutionRatio = "dry" 时不生成浇水记录
- [ ] 施肥编辑时旧浇水记录删除+重新生成
- [ ] 施肥删除时级联删除浇水记录
- [ ] 每日记录保存时 upsert 浇水记录
- [ ] 每日记录删除时移除浇水记录
- [ ] 浇水 Tab 筛选（浇水方式/作物/温室/日期/来源类型）
- [ ] 浇水 Tab 导出（XLSX/CSV/PDF）
- [ ] Tab 切换时重置 selectedIds 和 operationMode
- [ ] 页面刷新后 Tab 状态不丢失
