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
| `inventory→external` | inventory_stock | NULL | 出库销售/外发 |
| `inventory→planting` | inventory_stock | planting | 出库用于种植 |
| `inventory→seedling` | inventory_stock | seedling | 出库用于育苗 |

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

## 四、部分链路场景覆盖

所有 6 种场景均可闭环：

| 场景 | 环节 | 上游缺口 | 解决方式 |
|------|------|---------|---------|
| A: 育种户 | 种源 | 无 | 种源即起点，独立写 plan→seed_source |
| B: 育苗户 | 育苗 | 无系统内种源 | 新增"外部种源"手动录入，source_category=external |
| C: 种植户 | 种植 | 无系统内种源/育苗 | 新增"外部来源"手动录入，source_category=external |
| D: 种源+育苗 | 种源→育苗 | 无 | 完整内部流转 seed_source→seedling |
| E: 种源+种植 | 种源→种植 | 无 | 直接流转 seed_source→planting |
| F: 育苗+种植 | 育苗→种植 | 无系统内种源 | 外部录入 + seedling→planting |

## 五、现有弹窗字段对齐

### 5.1 字段名统一

| 当前不一致 | 统一为 | 影响模块 |
|-----------|--------|----------|
| `variety` vs `cropVariety` | `cropVariety` | 库存 AddStockModal、采收 ProductDetail |
| 出库 stock 无 cropVariety | 新增 `cropVariety` | 出库相关 |
| 出库 stock 无 sourceCategory | 新增 `sourceCategory` | 出库相关 |

### 5.2 缺失字段补齐

| 模块 | 缺失字段 | 修改方式 |
|------|---------|---------|
| 种源 EditModal | propagationType | 新增只读展示 |
| 出库弹窗 | targetType / targetId（出库去向） | 按 businessType 新增选择器 |
| 育苗 AddModal | 外部种源支持 | 新增手动录入外部种源信息 |
| 种植 AddModal | 外部来源支持 | 新增手动录入外部来源信息 |
| 出库 stock 对象 | cropVariety, sourceCategory | 后端返回时补齐 |

### 5.3 写入触发机制

**由后端路由层统一处理**。前端各弹窗不修改提交逻辑，后端在每个 POST/PUT 路由中自动写入 material_flow_log：

| 路由 | 写入的 flow_type |
|------|-----------------|
| POST /api/seed-sources | plan→seed_source 或 inventory→seed_source |
| POST /api/seedlings | seed_source→seedling |
| POST /api/plantings | seed_source→planting 或 seedling→planting |
| POST /api/harvest | planting→harvest 或 seedling→harvest |
| POST /api/inventory/inbound | 无上游(NULL) → inventory_stock |
| POST /api/inventory-transactions | inventory_stock → (按 businessType) |

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

| 阶段 | 内容 | 预估 |
|------|------|------|
| Phase 1 | material_flow_log 建表 + 后端流水中间件 | 后端基础 |
| Phase 2 | 四个模块 POST/PUT 路由接入流水写入 | 后端核心 |
| Phase 3 | 修复四条断链 + 字段对齐 + 缺失字段补齐 | 前后端 |
| Phase 4 | 部分链路场景支持（外部种源/外部来源/出库去向） | 前端 |
| Phase 5 | 统计报表页面 | 前端 |
