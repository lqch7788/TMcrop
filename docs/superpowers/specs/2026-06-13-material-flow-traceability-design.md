# 物料流转追溯系统设计

> 日期: 2026-06-13 | 状态: 已确认 | 作者: lqch7788

## 一、问题陈述

当前六个模块（种源管理、育苗管理、种植管理、采收入库、作物库存、出库记录）之间存在表面关联字段（sourceId、batchCode），但缺少实际的跨表数量联动。导致：

1. **种源可用数量虚高** — 直接种植不扣减
2. **育苗可定植虚高** — 种植页面移栽不回写 plantedCount
3. **种植已采收永远是 0** — 采收入库不回写 harvestQuantity
4. **无法追溯** — 从库存无法反向追踪到种源

数据流各环节存在 4 条断链：种源→育苗非原子、种源→种植零实现、育苗→种植部分入口缺失、采收→库存非原子。

## 二、架构方案：双轨制 + 统一流水表

### 2.1 双轨架构

```
═══════════════════════════════════════════════════════════════════
                        对外轨（经过作物库存）
═══════════════════════════════════════════════════════════════════

  外购种子/种苗 ──→ [作物库存] ──→ 出库(自用) ──→ 种源管理 ──┐
  外购成品     ──→ [作物库存] ──→ 出库(销售) ──→ 外部        │
  采收(外售)   ──→ [作物库存] ──→ 出库(销售) ──→ 外部        │

═══════════════════════════════════════════════════════════════════
                        内部轨（不经过作物库存）
═══════════════════════════════════════════════════════════════════

  [种源管理] ──→ [育苗管理] ──→ [种植管理] ──→ 采收(自用)
      │              │              │
      └──────→ 直接种植 ────────────┘

      material_flow_log 记录每一次跨模块流转
```

**核心规则**：
1. 外部采购 → 先入作物库存，出库时创建种源/种苗/成品批次
2. 内部流转 → 不经过库存，直接写入 material_flow_log
3. 采收入库 → 可选"入库(外售)"或"自用"
4. 任何环节可作为起点（只有种源 / 只有育苗 / 只有种植 / 全链路）

### 2.2 作物库存定位

| | 车间仓（内部流转） | 成品仓（作物库存） |
|---|---|---|
| 管什么 | 种源→育苗→种植→采收自用 | 待售种子/种苗/成品 |
| 谁在用 | 生产部门 | 销售/仓库部门 |
| 是否有库存概念 | ❌ 无，批次间直接传递 | ✅ 有，current_quantity / frozen |
| 记账方式 | material_flow_log 流水 | inventory_stock + inventory_transaction |

## 三、核心数据库设计

### 3.1 material_flow_log 表

```sql
CREATE TABLE material_flow_log (
  id          TEXT PRIMARY KEY,
  oid         INTEGER UNIQUE,           -- 自增序号
  flow_type   TEXT NOT NULL,            -- 流转类型
  crop_code   TEXT,                     -- 作物编码
  crop_name   TEXT NOT NULL,            -- 作物名称（统计维度）
  crop_variety TEXT,                    -- 作物品种

  -- 上游（消耗方）
  source_type TEXT,                     -- seed_source / seedling / planting / inventory_stock / NULL
  source_id   TEXT,                     -- 上游记录 ID
  source_code TEXT,                     -- 上游批号（人类可读）
  source_quantity REAL,                 -- 消耗上游数量
  source_unit  TEXT,                    -- 单位
  source_category TEXT,                 -- 来源分类：external_purchase/self_produced/breeding/asexual/gift/transfer/external/manual/other

  -- 下游（产出方）
  target_type TEXT NOT NULL,            -- seed_source / seedling / planting / inventory_stock
  target_id   TEXT NOT NULL,            -- 下游记录 ID
  target_code TEXT NOT NULL,            -- 下游批号
  target_quantity REAL,                 -- 产出/入库数量
  target_unit  TEXT,                    -- 单位

  -- 元信息
  business_id  TEXT,                    -- 关联的业务单号
  created_at   TEXT NOT NULL,
  created_by   TEXT
);
```

### 3.2 流转类型枚举

| flow_type | source_type | target_type | 触发时机 |
|-----------|-------------|-------------|---------|
| `inventory→seed_source` | inventory_stock | seed_source | 外购种子出库后创建种源 |
| `plan→seed_source` | NULL | seed_source | 育种计划产出/无性繁殖/留种 |
| `seed_source→seedling` | seed_source | seedling | 育苗消耗种源 |
| `seed_source→planting` | seed_source | planting | 直接种植消耗种源 |
| `seedling→planting` | seedling | planting | 种植消耗种苗 |
| `planting→seed_source` | planting | seed_source | 种植留种产出种源 |
| `planting→harvest` | planting | inventory_stock | 采收入库(外售，从种植) |
| `seedling→harvest` | seedling | inventory_stock | 采收入库(外售，从育苗) |
| `harvest→inventory` | harvest_record | inventory_stock | 采收写入库存 |
| `external→seedling` | NULL | seedling | 外部种源创建育苗(育苗户，手动录入) |
| `external→planting` | NULL | planting | 外部来源创建种植(种植户，手动录入) |
| `inventory→external` | inventory_stock | NULL | 出库销售/外发 |
| `inventory→planting` | inventory_stock | planting | 出库用于种植 |
| `inventory→seedling` | inventory_stock | seedling | 出库用于育苗 |

### 3.3 流水不可变策略（CRITICAL）

material_flow_log 记录一旦写入，**不可修改、不可物理删除**。确保追溯数据的绝对可信。

**编辑处理**：当源记录的数量字段被编辑时，生成一条 `correction` 类型的补偿流水：
```
原记录: seed_source→seedling, source_quantity=500
编辑后: correction, source_quantity=-200 (delta = 300 - 500)
```
追溯时按 source_id + target_id 聚合 SUM(source_quantity) 得到实际值。

**删除处理**：所有涉及流转的业务表统一采用**软删除**（`deleted_at` 字段）。当前 `harvest_records` 已有，需为 `seed_sources`、`seedlings`、`plantings` 补齐。flow_log 记录不受删除影响。

### 3.4 不触发流水的出库类型（白名单）

以下出库 businessType **不产生** material_flow_log 记录：
- `damage_loss` — 损耗报损（物料消失，不进入任何下游）
- `gift_sample` — 赠送样品（不在生产链内）
- `return_inbound` — 退货入库（反向流转）
- `inventory_adjust` — 库存调整（盘点修正，非真实流转）
- `other` — 其他（无法分类）

仅 `customer_sale`、`internal_planting`、`internal_seedling`、`internal_seed_source`、`transfer_out` 写 flow_log。

### 3.5 现有表字段补齐

**seedlings 表新增**：
- `unit TEXT DEFAULT '株'` — 育苗数量单位（flow_log source_unit / target_unit 来源）

**plantings 表新增**：
- `unit TEXT DEFAULT '株'` — 种植数量单位

**seed_sources 表新增**：
- `deleted_at TEXT` — 软删除标记

**seedlings 表新增**：
- `deleted_at TEXT` — 软删除标记

**plantings 表新增**：
- `deleted_at TEXT` — 软删除标记

**material_flow_log 表补充**：
- `business_code TEXT` — 业务单号冗余（harvest_code、outbound_code 等），免 JOIN 即可查询

**出库弹窗 businessType 枚举新增**：
- `internal_seedling` — 出库用于育苗（关联育苗记录ID）
- `internal_seed_source` — 出库用于种源（关联种源记录ID）

### 3.6 采收入库多产品拆条策略

采收单的 `products` 数组包含多个产品时，**每个产品产生一条独立的 flow_log**：
- `source_quantity = products[i].harvestQuantity`
- `source_unit = products[i].unit`
- `crop_name / crop_variety` 分别取自各 product
- 每条 flow_log 的 `business_code` 相同（共用同一采收单号 harvestCode）

### 3.7 采收自用/外售标记

采收 AddModal 新增 `saleType` 字段：
- `self_use` — 自用（不创建 inventory_stock，只写 flow_log）
- `external_sale` — 外售（创建 inventory_stock，写 flow_log）

targetInventory 字段保留，用于确定入库的 stock_type（seed/seedling/product）。

### 3.3 公共枚举：source_category

```typescript
// 来源分类 — material_flow_log.source_category 专用
enum FlowSourceCategory {
  EXTERNAL_PURCHASE = 'external_purchase',  // 外购
  SELF_PRODUCED = 'self_produced',          // 自产/留种
  BREEDING = 'breeding',                    // 育种计划产出
  ASEXUAL = 'asexual',                      // 无性繁殖
  GIFT = 'gift',                            // 赠送/受赠
  TRANSFER = 'transfer',                    // 调拨
  MANUAL = 'manual',                        // 手动录入
  EXTERNAL = 'external',                    // 外部来源（不在系统内的上游）
  OTHER = 'other',                          // 其他
}
```

各模块枚举映射：

```
种源 propagationType      库存 sourceType            流水 source_category
EXTERNAL              →  EXTERNAL_PURCHASED      →  external_purchase
BREEDING              →  (库存无)                 →  breeding
SEED_SAVING           →  SELF_PRODUCED           →  self_produced
ASEXUAL               →  (库存无)                 →  asexual
(种源无)               →  GIFT                   →  gift
(种源无)               →  TRANSFER               →  transfer
```

## 四、部分链路场景覆盖（增强版）

所有 6 种场景均可闭环，上游缺口通过"自动创建外部记录"解决：

| 场景 | 环节 | 上游缺口 | 解决方式 |
|------|------|---------|---------|
| A: 育种户 | 种源 | 无 | 种源即起点，写 plan→seed_source |
| B: 育苗户 | 育苗 | 无系统内种源 | 自动创建简化 seed_source 记录(propagationType=EXTERNAL)，写 external→seedling |
| C: 种植户 | 种植 | 无系统内种源/育苗 | 自动创建简化上游记录，写 external→planting |
| D: 种源+育苗 | 种源→育苗 | 无 | 完整内部流转 seed_source→seedling |
| E: 种源+种植 | 种源→种植 | 无 | 直接流转 seed_source→planting |
| F: 育苗+种植 | 育苗→种植 | 无系统内种源 | 同B (外部→育苗) + seedling→planting |

**外部来源自动创建**：育苗/种植选择"外部来源"时，后端自动创建一条简化的上游记录：
- 外部种源：`seed_sources` 记录（sourceOrigin=external, propagationType=EXTERNAL, 手动填的批号/名称/数量）
- 外部种植来源：同样逻辑
- flow_log 中 source_category=external，有完整的 source_id 可追溯

## 五、现有弹窗字段对齐与补齐

### 5.1 字段名统一

| 当前不一致 | 统一为 | 影响模块 |
|-----------|--------|----------|
| `variety` vs `cropVariety` | `cropVariety` | 库存 AddStockModal、采收 ProductDetail |
| 出库 stock 无 cropVariety | 新增 `cropVariety` | 出库相关 |
| 出库 stock 无 sourceCategory | 新增 `sourceCategory` | 出库相关 |

### 5.2 新建/修改字段清单

| 模块 | 字段 | 类型 | 说明 |
|------|------|------|------|
| **育苗 AddModal** | 种源类型开关 | 内部种源/外部种源 | 选外部时 sourceId 非必填 |
| 育苗 AddModal | 外部种源批号 | Input | 手动填写 |
| 育苗 AddModal | 外部种源名称 | Input | 手动填写 |
| 育苗 AddModal | 外部种源数量 | Input(Number) | 手动填写 |
| 育苗 AddModal | 外部来源说明 | TextArea | 手动填写 |
| **种植 AddModal** | 来源类型开关 | 内部来源/外部来源 | 选外部时 sourceId 非必填 |
| 种植 AddModal | 外部来源批号 | Input | 手动填写 |
| 种植 AddModal | 外部来源名称 | Input | 手动填写 |
| 种植 AddModal | 外部来源数量 | Input(Number) | 手动填写 |
| 种植 AddModal | 外部来源说明 | TextArea | 手动填写 |
| **采收 AddModal** | saleType | self_use / external_sale | 自用不建 inventory_stock |
| **出库 OutboundModal** | targetType + targetId | 动态选择器 | 按 businessType 显示对应选择器 |
| 出库 businessType | internal_seedling | 枚举值 | 出库用于育苗 |
| 出库 businessType | internal_seed_source | 枚举值 | 出库用于种源 |
| **种源 EditModal** | propagationType | 只读展示 | 编辑时可看到入库方式 |
| **stock 对象** | cropVariety | string | 库存返回时携带 |
| **stock 对象** | sourceCategory | string | 库存返回时携带 |

### 5.3 写入触发机制

**由后端路由层统一处理**。前端各弹窗不修改提交逻辑，后端在每个 POST/PUT 路由中自动写入 material_flow_log（与业务操作在同一事务内）：

| 路由 | 写入的 flow_type | 事务要求 |
|------|-----------------|---------|
| POST /api/seed-sources | plan→seed_source 或 NULL→seed_source | BEGIN/COMMIT |
| POST /api/seedlings | seed_source→seedling 或 external→seedling | WITH-DEDUCT 事务 |
| POST /api/plantings | seed_source→planting 或 seedling→planting 或 external→planting | BEGIN/COMMIT |
| POST /api/harvest | planting→harvest 或 seedling→harvest(每个product一条) | 事务（含 inventory_stock 创建） |
| POST /api/inventory/inbound | NULL → inventory_stock | 简单 INSERT |
| POST /api/inventory-transactions | inventory_stock → (按 businessType) | 现有乐观锁 + flow_log |
| PUT /api/seedlings/:id | correction (数量变更时) | 与 UPDATE 同事务 |
| PUT /api/plantings/:id | correction (数量变更时) | 与 UPDATE 同事务 |
| DELETE /api/seedlings/:id | 不删 flow_log，仅软删除 | 设 deleted_at |
| DELETE /api/plantings/:id | 不删 flow_log，仅软删除 | 设 deleted_at |

### 5.4 新增 API 端点

| 端点 | 用途 |
|------|------|
| GET /api/material-flow-log | 流水列表（分页，按批次/作物/时间/flow_type 筛选） |
| GET /api/material-flow-log/trace?code=xxx | 单批次全链路追溯（递归展开上下游） |
| GET /api/material-flow-log/stats/by-crop | §6.2 育苗用料统计 |
| GET /api/material-flow-log/stats/by-source | §6.3 种植用料统计 |
| GET /api/material-flow-log/stats/annual | §6.4 全链路年度总览 |
| GET /api/material-flow-log/stats/inventory-trace | §6.5 库存来源追溯 |

## 六、统计报表

### 6.1 批次全链路追溯

```
查询: WHERE source_code = ? OR target_code = ?
聚合: 按 created_at 排序，逐级展示流转链
输出: 批号 → 上游来源 → 下游去向 → 消耗/产出数量 → 剩余
```

### 6.2 年度用料统计（按作物、来源）

```
维度: crop_name × source_category
聚合: SUM(source_quantity), COUNT(DISTINCT target_code)
筛选: flow_type = 'seed_source→seedling' + 时间范围
```

### 6.3 种植用料统计（直接播种 vs 育苗移栽）

```
维度: crop_name × flow_type × source_category
筛选: flow_type IN ('seed_source→planting', 'seedling→planting')
```

### 6.4 全链路年度总览

```
维度: flow_type × crop_name
聚合: COUNT(*), SUM(source_quantity)
排序: flow_type, crop_name
```

### 6.5 库存来源追溯

```
从 inventory_stock 反查 material_flow_log
WHERE target_type = 'inventory_stock' AND target_id = ?
输出: 原始来源批号、入库路径、原始来源分类
```

## 七、四条断链修复计划

| ID | 路径 | 修复方式 | 优先级 |
|----|------|---------|--------|
| R1 | 种源→育苗 | 前端改用 /with-deduct 原子端点 | P0 |
| R2 | 种源→种植 | 后端 POST /plantings 新增种源扣减 | P0 |
| R3 | 育苗→种植 | 种植 AddModal 保存后补调 increasePlantedCount | P0 |
| R4 | 采收→库存 | 后端接入 createOneWithInventory 事务方法 | P1 |

## 八、实现阶段

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **Phase 1: 基础** | material_flow_log 建表；seedlings/plantings/seed_sources 加 unit + deleted_at 字段；出库 businessType 枚举新增；公共枚举定义 | — |
| **Phase 2: 后端流水** | 所有 POST/PUT 路由接入事务内 flow_log 写入；/with-deduct 原子端点（含流水写入）；correction 补偿流水；PUT 数量变更同步 | Phase 1 |
| **Phase 3: 修复断链** | R1: 育苗改用 /with-deduct；R2: 种植 POST 新增种源扣减 + 流水；R3: 种植回写 plantedCount；R4: 采收接入事务端点 | Phase 2 |
| **Phase 4: UI 补齐** | 育苗/种植 AddModal 外部来源开关；采收 AddModal saleType 字段；出库弹窗 targetType/targetId 选择器；stock 对象补字段；种源 EditModal 补 propagationType；字段名统一(variety→cropVariety) | Phase 3 |
| **Phase 5: 追溯报表** | 5 个 API 端点；全链路追溯页面；年度用料统计页面；种植用料统计页面；库存来源追溯页面；年度总览页面 | Phase 4 |
