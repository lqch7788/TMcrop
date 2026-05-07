# 作物管理系统升级方案 V3.0

> 制定日期：2026-05-06
> 版本：V3.0（整合 Claude V2.0 + OpenCode V1.0 方案精华）
> 版本说明：在V2.0基础上整合OpenCode方案的详细字段分析、风险应对和SQL参考

---

## 一、背景与目标

### 1.1 项目背景

随着农业生产管理系统的业务复杂度增加，作物管理模块（种源管理、育苗管理、种植管理、采收入库）需要实现完整的业务链追溯能力。当前系统存在以下挑战：

- **追溯链断裂**：从生产计划到种源、育苗、种植、采收、入库的完整链条未完全打通
- **配置分散**：部分枚举值硬编码在代码中，修改需要重新编译
- **库存形态不清晰**：无法区分种子/种苗/成品三种库存形态

### 1.2 核心目标

1. **完整追溯链**：实现 `生产计划 → 种源 → 育苗 → 种植 → 采收 → 入库` 的完整业务追溯
2. **配置化管理**：所有枚举值、选项通过数据字典管理，无需修改代码
3. **数据追溯清晰**：
   - 内部自研：育种计划(JZB) → 种源（关联生产计划）
   - 外部采购：种源（不关联生产计划）
4. **库存形态区分**：种子/种苗/成品三种库存形态独立管理

---

## 二、编码规则

### 2.1 生产计划批次号前缀

| plan_type | 前缀 | 说明 |
|-----------|------|------|
| seed_breeding | JZB | 育种计划 |
| seedling | YMB | 育苗计划 |
| planting | ZZB | 种植计划 |

### 2.2 作物编码（11位结构）

```
类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位) + 详细(2位)
```

---

## 三、追溯链路设计

### 3.1 完整追溯路径

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        作物管理完整业务追溯链                                │
└─────────────────────────────────────────────────────────────────────────────┘

生产计划批次号（JZB/YMB/ZZB前缀）
    │
    ├─[JZB] 育种计划 ──────────────────────────────────────────────────┐
    │                                                               │
    ├─[YMB] 育苗计划 ──────────────────────────────────────────────────┤
    │                                                               │
    └─[ZZB] 种植计划 ──────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │   种源管理    │ ◄── 关联: production_plan_code（内部自研必填，外购选填）
    │ seed_sources │     关联: source_origin（区分自研/外购）
    └──────────────┘
           │
           │ 库存扣减
           ▼
    ┌──────────────┐
    │   库存管理    │ ◄── stock_type 区分形态
    └──────────────┘
           │
           │ 关联使用
           ▼
    ┌──────────────┐      ┌─────────────────┐
    │   育苗管理    │─────►│  作物种植管理   │
    └──────────────┘      └────────┬────────┘
           │                           │
           │         采收入库          │
           │◄──────────────────────────┘
           ▼
    ┌──────────────┐
    │   采收管理    │
    └──────────────┘
           │
           │ 入库
           ▼
    ┌──────────────┐
    │  成品库存     │
    │ stock_type=  │
    │   product    │
    └──────────────┘
```

### 3.2 内部自研追溯路径

```
育种计划(JZB) ──► 种源 ──► 育苗 ──► 种植 ──► 采收 ──► 入库
     │                                              │
     └──────────────────────────────────────────────┘
                    production_plan_code 贯穿始终
```

### 3.3 外部采购追溯路径

```
种源（外购，不关联JZB）
     │
     ▼
育苗（可关联YMB育苗计划）
     │
     ▼
种植 ──► 采收 ──► 入库
```

### 3.4 库存扣减触发点

| 操作 | 扣减库存 | 目标形态 |
|------|---------|---------|
| 新建育苗并选择种源 | 种源库 | stock_type='seed' |
| 新建种植并选择种苗 | 种苗库 | stock_type='seedling' |
| 采收入库 | 增加成品库 | stock_type='product' |

---

## 四、现状分析（弹窗字段详细分析）

### 4.1 种源管理弹窗分析 (seed-source/modals/AddModal.tsx)

**已使用 DictSelect 组件的字段：**
- `source_type` (种源类型) - ✅ 已使用 DictSelect (category="source_type")
- `source_origin` (来源途径) - ✅ 已使用 DictSelect (category="source_origin")

**仍使用硬编码的字段：**

| 字段 | 类型 | 位置 | 建议 |
|-----|------|------|------|
| supplierIsInternal | select (internal/external) | 第649行 | 新增字典 `source_internal_type` |
| unit | select | 第748行 | 新增字典 `unit` |
| 是否补录 | select (true/false) | 第843行 | 使用通用是否字典 |
| baseId | select | 第677行 | 从 `bases` 过滤，保持现状 |

### 4.2 育苗管理弹窗分析 (seedling/modals/AddModal.tsx)

**已使用数据字典的字段：**
- `survival_rate_target` (目标成苗率) - ✅ 使用 useMemo + getDictItems
- `seedling_plan_type` (育苗计划类型) - ✅ 使用 useMemo + getDictItems
- `propagation_multiple` (扩繁倍数) - ✅ 使用 useMemo + getDictItems
- `operator` (操作人员) - ✅ 使用 useMemo + getDictItems

**仍使用硬编码的字段：**

| 字段 | 类型 | 位置 | 建议 |
|-----|------|------|------|
| seedlingType | select | 第611行 | 使用现有 `seedlingTypes` prop 或 DictSelect |
| calculateMode | radio (SINGLE/PROPAGATION) | 第704行 | **新增字典 `calculate_mode`** |
| 是否补录 | select (true/false) | 第921行 | 使用通用是否字典 |

### 4.3 种植管理弹窗分析 (planting/modals/AddModal.tsx)

**已使用数据字典的字段：**
- `sourceTypeOptions` (来源类型选项) - 外部传入

**仍使用硬编码的字段：**

| 字段 | 类型 | 位置 | 建议 |
|-----|------|------|------|
| sourceType | radio (seed/seedling) | 第238行 | 使用 sourceTypeOptions 渲染 |
| 是否补录 | select (true/false) | - | 使用通用是否字典 |

### 4.4 采收入库弹窗分析 (harvest/modals/AddModal.tsx)

**已使用数据字典的字段：**
- `quality_grade` (品质等级) - ✅ 使用 getDictItems('quality_grade')
- `harvest_type` (采收类型) - ✅ 使用 getDictItems('harvest_type')

**仍使用硬编码的字段：**

| 字段 | 类型 | 位置 | 建议 |
|-----|------|------|------|
| inboundType | select (3项) | 第197行 | **新增字典 `inbound_type`** |
| targetInventory | select (3项) | 第287行 | **新增字典 `target_inventory`** |
| 是否补录 | select (true/false) | 第305行 | 使用通用是否字典 |

---

## 五、数据字典完整配置

### 5.1 现有已配置的数据字典

| 分类编码 | 分类名称 | 模块 | 状态 |
|---------|---------|------|------|
| `source_type` | 种源类型（繁殖方式） | crop | ✅ 已配置 |
| `source_origin` | 来源途径 | crop | ✅ 已配置 |
| `seedling_type` | 育苗方式 | crop | ✅ 已配置 |
| `harvest_type` | 采收类型 | crop | ✅ 已配置 |
| `harvest_status` | 采收状态 | crop | ✅ 已配置 |
| `quality_grade` | 品质等级 | crop | ✅ 已配置 |
| `crop_category` | 作物类别 | crop | ✅ 已配置 |
| `planting_mode` | 种植模式 | crop | ✅ 已配置 |

### 5.2 需新增的数据字典汇总

#### 高优先级（弹窗中识别）

| 分类编码 | 分类名称 | 模块 | 字典项 |
|---------|---------|------|--------|
| inbound_type | 入库类型 | harvest | seed_source, seedling, planting_harvest |
| target_inventory | 目标库存 | harvest | seed, seedling, product |
| calculate_mode | 育苗计算模式 | seedling | single, propagation |

#### 中优先级

| 分类编码 | 分类名称 | 模块 | 字典项 |
|---------|---------|------|--------|
| unit | 单位 | common | 袋, 株, 粒, 颗, kg, g 等 |
| is_supplementary | 是否 | common | yes, no |
| source_internal_type | 来源类型 | seed-source | internal, external |

### 5.3 新增数据字典详情

#### A. 库存形态 (stock_form / stock_type)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 | 说明 |
|--------|---------|--------|------|------|------|
| seed | 种子/种源 | seed | yellow | 1 | 种源库中的种子 |
| seedling | 种苗 | seedling | green | 2 | 种苗库中的种苗 |
| product | 成品 | product | blue | 3 | 成品冷库中的产品 |
| seed_breeding | 育种材料 | seed_breeding | orange | 4 | 育种过程中的材料 |

#### B. 生产计划类型 (production_plan_type)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 | 说明 |
|--------|---------|--------|------|------|------|
| seed_breeding | 育种计划 | seed_breeding | blue | 1 | JZB前缀批次 |
| seedling | 育苗计划 | seedling | green | 2 | YMB前缀批次 |
| planting | 种植计划 | planting | orange | 3 | ZZB前缀批次 |

#### C. 入库类型 (inbound_type)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 |
|--------|---------|--------|------|------|
| seed_source | 种源入库 | seed_source | yellow | 1 |
| seedling | 种苗入库 | seedling | green | 2 |
| planting_harvest | 种植采收 | planting_harvest | blue | 3 |

#### D. 目标库存 (target_inventory)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 |
|--------|---------|--------|------|------|
| seed | 种子 | seed | yellow | 1 |
| seedling | 种苗 | seedling | green | 2 |
| product | 成品 | product | blue | 3 |

#### E. 育苗计算模式 (calculate_mode)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 |
|--------|---------|--------|------|------|
| single | 单株育苗 | single | blue | 1 |
| propagation | 扩繁育苗 | propagation | green | 2 |

#### F. 来源类型 (source_internal_type)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 |
|--------|---------|--------|------|------|
| internal | 内部 | internal | green | 1 |
| external | 外部 | external | blue | 2 |

#### G. 是否补录 (is_supplementary)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 |
|--------|---------|--------|------|------|
| yes | 是 | yes | green | 1 |
| no | 否 | no | gray | 2 |

#### H. 单位 (unit)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 |
|--------|---------|--------|------|------|
| bag | 袋 | bag | blue | 1 |
| plant | 株 | plant | green | 2 |
| grain | 粒 | grain | yellow | 3 |
| piece | 颗 | piece | orange | 4 |
| kg | 公斤 | kg | purple | 5 |
| g | 克 | g | pink | 6 |

#### I. 来源途径扩展 (source_origin)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 | 说明 |
|--------|---------|--------|------|------|------|
| internal_seed | 内部种源 | internal_seed | green | 1 | 自研/自产种源 |
| external_purchase | 外部采购 | external_purchase | blue | 2 | 向供应商采购 |
| tissue_culture | 组培苗 | tissue_culture | purple | 3 | 组织培养苗 |
| grafting | 嫁接苗 | grafting | orange | 4 | 嫁接繁殖 |
| seedling_split | 分株繁殖 | seedling_split | cyan | 5 | 分株方式繁殖 |
| cutting | 扦插繁殖 | cutting | pink | 6 | 扦插方式繁殖 |
| direct_seedling | 直接育苗 | direct_seedling | yellow | 7 | 自繁育苗 |
| direct_planting | 直接种植 | direct_planting | gray | 8 | 外购苗直接种 |
| external_harvest | 外购成品入库 | external_harvest | brown | 9 | 外购成品入库 |

---

## 六、业务规则

### 6.1 关联校验规则

1. **种源创建时**：
   - 如果 `source_origin` = `internal_seed`，则 `production_plan_code` 必填
   - 如果 `source_origin` = `external_purchase`，则 `production_plan_code` 选填

2. **育苗创建时**：
   - `production_plan_code` 必填
   - `source_id` 必填
   - 如果关联的种源是内部自研，则追溯到对应的育种计划

3. **库存创建时**：
   - `stock_type` 必须从数据字典中选择
   - 如果 `stock_type` = `seed_breeding`，则必须关联 `production_plan_code`

### 6.2 库存扣减规则

| 操作 | 扣减库存 | 目标形态 |
|------|---------|---------|
| 新建育苗并选择种源 | 种源库 | stock_type='seed' |
| 新建种植并选择种苗 | 种苗库 | stock_type='seedling' |
| 采收入库 | 增加成品库 | stock_type='product' |

---

## 七、前端页面改造清单

### 7.1 改造文件总览

| 页面 | 文件 | 改造字段 | 目标数据字典 |
|------|------|---------|------------|
| 生产计划 | CreateBatchModal.tsx | planType | production_plan_type |
| 生产计划 | CreateBatchModal.tsx | plantingMode | planting_mode |
| 生产计划 | CreateBatchModal.tsx | responsiblePerson | responsible_person |
| 生产计划 | CreateBatchModal.tsx | batchStatus | batch_status |
| 种源管理 | AddModal.tsx, EditModal.tsx | supplierIsInternal | source_internal_type |
| 种源管理 | AddModal.tsx, EditModal.tsx | unit | unit |
| 种源管理 | AddModal.tsx | isSupplementary | is_supplementary |
| 育苗管理 | AddModal.tsx, EditModal.tsx | seedlingType | seedling_type |
| 育苗管理 | AddModal.tsx | calculateMode | calculate_mode |
| 育苗管理 | AddModal.tsx | isSupplementary | is_supplementary |
| 作物种植 | AddModal.tsx, EditModal.tsx | sourceType | planting_source_type |
| 作物种植 | AddModal.tsx, EditModal.tsx | areaId | planting_area |
| 库存管理 | ProduceInventoryAddModal.tsx | stockType | stock_form |
| 库存管理 | ProduceInventoryAddModal.tsx | unit | unit |
| 库存管理 | ProduceInventoryAddModal.tsx | qualityLevel | quality_level |
| 库存管理 | ProduceInventoryAddModal.tsx | warehouse | warehouse |
| 采收管理 | AddModal.tsx | inboundType | inbound_type |
| 采收管理 | AddModal.tsx | targetInventory | target_inventory |
| 采收管理 | AddModal.tsx | isSupplementary | is_supplementary |
| 采收管理 | BatchEditModal.tsx | greenhouseId | harvest_greenhouse |

### 7.2 具体改造位置参考

#### 种源管理 (seed-source/modals/AddModal.tsx)

| 字段 | 当前位置 | 改造方式 |
|-----|---------|---------|
| supplierIsInternal | 第649行 select | 改为 DictSelect (category="source_internal_type") |
| unit | 第748行 select | 改为 DictSelect (category="unit") |
| 是否补录 | 第843行 select | 改为 DictSelect (category="is_supplementary") |

#### 育苗管理 (seedling/modals/AddModal.tsx)

| 字段 | 当前位置 | 改造方式 |
|-----|---------|---------|
| calculateMode | 第704行 radio | 改为 DictSelect (category="calculate_mode") |
| 是否补录 | 第921行 select | 改为 DictSelect (category="is_supplementary") |

#### 采收管理 (harvest/modals/AddModal.tsx)

| 字段 | 当前位置 | 改造方式 |
|-----|---------|---------|
| inboundType | 第197行 select | 改为 DictSelect (category="inbound_type") |
| targetInventory | 第287行 select | 改为 DictSelect (category="target_inventory") |
| 是否补录 | 第305行 select | 改为 DictSelect (category="is_supplementary") |

---

## 八、数据库修改

### 8.1 字段现状

| 表 | 字段 | 现状 |
|----|------|------|
| production_plans | plan_type | 已有值（seed_breeding/seedling） |
| inventory | stock_type | 已有字段 |
| seed_sources | source_origin | 已有字段 |

### 8.2 字典表修改

所有新增字典通过 `SettingsDataProvider.tsx` 配置，无需直接修改数据库。

---

## 九、实施顺序

### 第一阶段：数据字典配置（P0）

**目标**：补充所有缺失的数据字典项

**新增字典清单：**

| 序号 | 字典码 | 字典名称 | 字典项 | 修改文件 |
|-----|--------|---------|--------|---------|
| 1.1 | `stock_form` | 库存形态 | seed, seedling, product, seed_breeding | SettingsDataProvider.tsx |
| 1.2 | `production_plan_type` | 生产计划类型 | seed_breeding, seedling, planting | SettingsDataProvider.tsx |
| 1.3 | `inbound_type` | 入库类型 | seed_source, seedling, planting_harvest | SettingsDataProvider.tsx |
| 1.4 | `target_inventory` | 目标库存 | seed, seedling, product | SettingsDataProvider.tsx |
| 1.5 | `calculate_mode` | 育苗计算模式 | single, propagation | SettingsDataProvider.tsx |
| 1.6 | `source_internal_type` | 来源类型 | internal, external | SettingsDataProvider.tsx |
| 1.7 | `is_supplementary` | 是否补录 | yes, no | SettingsDataProvider.tsx |
| 1.8 | `unit` | 单位 | bag, plant, grain, piece, kg, g | SettingsDataProvider.tsx |
| 1.9 | `source_origin` | 来源途径 | 扩展至9项 | SettingsDataProvider.tsx |

### 第二阶段：前端页面改造（P1）

**目标**：将硬编码的下拉菜单改为从数据字典读取

**任务清单：**

| 序号 | 页面 | 文件 | 修改字段 |
|-----|------|------|---------|
| 2.1 | 种源管理 | AddModal.tsx, EditModal.tsx | supplierIsInternal, unit, isSupplementary |
| 2.2 | 育苗管理 | AddModal.tsx, EditModal.tsx | calculateMode, isSupplementary |
| 2.3 | 作物种植 | AddModal.tsx, EditModal.tsx | sourceType |
| 2.4 | 采收管理 | AddModal.tsx | inboundType, targetInventory, isSupplementary |
| 2.5 | 采收管理 | BatchEditModal.tsx | greenhouseId |

### 第三阶段：业务逻辑验证（P2）

**目标**：验证库存扣减链路和追溯查询链路

**任务清单：**

| 序号 | 任务 | 验证点 |
|-----|------|-------|
| 3.1 | 测试育苗库存扣减 | 新建育苗时种源库扣减 |
| 3.2 | 测试种植库存扣减 | 新建种植时种苗库扣减 |
| 3.3 | 测试采收入库 | 采收时成品库增加 |
| 3.4 | 测试追溯链路 | 种源→育苗→种植→采收→库存 |

---

## 十、SQL参考

### 10.1 库存形态 (stock_form)

```sql
-- 字典分类
INSERT INTO dictionary_categories (id, code, name, module, description, sort_order, status, created_at, updated_at)
VALUES ('DC023', 'stock_form', '库存形态', 'crop', '库存中物品的实际形态', 23, 'active', datetime('now'), datetime('now'));

-- 字典项
INSERT INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, is_default, status, created_at, updated_at)
VALUES
('DSF01', 'stock_form', 'seed', '种子/种源', 'seed', 'yellow', 1, 0, 'active', datetime('now'), datetime('now')),
('DSF02', 'stock_form', 'seedling', '种苗', 'seedling', 'green', 2, 0, 'active', datetime('now'), datetime('now')),
('DSF03', 'stock_form', 'product', '成品', 'product', 'blue', 3, 1, 'active', datetime('now'), datetime('now')),
('DSF04', 'stock_form', 'seed_breeding', '育种材料', 'seed_breeding', 'orange', 4, 0, 'active', datetime('now'), datetime('now'));
```

### 10.2 生产计划类型 (production_plan_type)

```sql
-- 字典分类
INSERT INTO dictionary_categories (id, code, name, module, description, sort_order, status, created_at, updated_at)
VALUES ('DC024', 'production_plan_type', '生产计划类型', 'crop', '生产计划的类型（通过批次号前缀区分）', 24, 'active', datetime('now'), datetime('now'));

-- 字典项
INSERT INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, is_default, status, created_at, updated_at)
VALUES
('DPP01', 'production_plan_type', 'seed_breeding', '育种计划', 'seed_breeding', 'blue', 1, 0, 'active', datetime('now'), datetime('now')),
('DPP02', 'production_plan_type', 'seedling', '育苗计划', 'seedling', 'green', 2, 0, 'active', datetime('now'), datetime('now')),
('DPP03', 'production_plan_type', 'planting', '种植计划', 'planting', 'orange', 3, 0, 'active', datetime('now'), datetime('now'));
```

### 10.3 种源类型 (source_type)

```sql
-- 字典分类
INSERT INTO dictionary_categories (id, code, name, module, description, sort_order, status, created_at, updated_at)
VALUES ('DC025', 'source_type', '种源类型', 'crop', '基于繁殖方式的分类', 25, 'active', datetime('now'), datetime('now'));

-- 字典项
INSERT INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, is_default, status, created_at, updated_at)
VALUES
('DST01', 'source_type', 'seed', '种子', 'seed', 'yellow', 1, 1, 'active', datetime('now'), datetime('now')),
('DST02', 'source_type', 'seedling', '种苗/实生苗', 'seedling', 'green', 2, 0, 'active', datetime('now'), datetime('now')),
('DST03', 'source_type', 'cutting', '扦插苗', 'cutting', 'cyan', 3, 0, 'active', datetime('now'), datetime('now')),
('DST04', 'source_type', 'grafting', '嫁接苗', 'grafting', 'purple', 4, 0, 'active', datetime('now'), datetime('now')),
('DST05', 'source_type', 'tissue_culture', '组培苗', 'tissue_culture', 'pink', 5, 0, 'active', datetime('now'), datetime('now')),
('DST06', 'source_type', 'split', '分株苗', 'split', 'orange', 6, 0, 'active', datetime('now'), datetime('now')),
('DST07', 'source_type', 'bulb', '种球/球根', 'bulb', 'brown', 7, 0, 'active', datetime('now'), datetime('now')),
('DST08', 'source_type', 'other', '其他', 'other', 'gray', 8, 0, 'active', datetime('now'), datetime('now'));
```

---

## 十一、风险与应对

### 11.1 数据迁移风险

**风险**：现有数据可能与新的数据字典值不匹配

**应对**：
1. 实施前进行数据备份
2. 创建数据迁移脚本，处理历史数据
3. 先在测试环境验证

### 11.2 前端兼容风险

**风险**：修改下拉数据源可能影响现有功能

**应对**：
1. 保持 API 返回格式兼容
2. 使用 Feature Flag 控制新功能
3. 逐步替换硬编码选项

### 11.3 性能风险

**风险**：每次加载下拉选项都请求 API

**应对**：
1. 实现前端缓存机制
2. 启动时预加载常用字典
3. 使用 localStorage 缓存

---

## 十二、验收标准

### 12.1 数据字典验收

- [ ] `stock_form` 字典分类和4个字典项创建成功
- [ ] `production_plan_type` 字典分类和3个字典项创建成功
- [ ] `source_type` 字典分类和8个字典项创建成功
- [ ] `source_origin` 字典项扩展到9个
- [ ] `inbound_type` 字典分类和3个字典项创建成功
- [ ] `target_inventory` 字典分类和3个字典项创建成功
- [ ] `calculate_mode` 字典分类和2个字典项创建成功
- [ ] `is_supplementary` 字典分类和2个字典项创建成功
- [ ] `unit` 字典分类创建成功

### 12.2 功能验收

- [ ] 种源管理页面 source_origin 下拉从字典读取
- [ ] 种源管理页面 source_type 下拉从字典读取
- [ ] 种源管理页面 supplierIsInternal 改为 DictSelect
- [ ] 种源管理页面 unit 改为 DictSelect
- [ ] 种源管理页面 isSupplementary 改为 DictSelect
- [ ] 育苗管理页面 calculate_mode 下拉从字典读取
- [ ] 育苗管理页面 isSupplementary 改为 DictSelect
- [ ] 采收管理页面 inbound_type 下拉从字典读取
- [ ] 采收管理页面 target_inventory 下拉从字典读取
- [ ] 采收管理页面 isSupplementary 改为 DictSelect
- [ ] 库存管理页面 stock_type 下拉从字典读取

### 12.3 追溯链验收

- [ ] 内部自研路径：JZB → 种源 → 育苗 → 种植 → 采收 → 入库，追溯成功
- [ ] 外部采购路径：种源（不关联JZB）→ 育苗 → 采收 → 入库，追溯成功
- [ ] 库存页面可按 stock_type 筛选
- [ ] 育苗创建时种源库正确扣减
- [ ] 种植创建时种苗库正确扣减
- [ ] 采收入库时成品库正确增加

---

## 十三、关键文件清单

| 文件路径 | 说明 |
|---------|------|
| `SettingsDataProvider.tsx` | 数据字典配置 |
| `src/components/production/modals/CreateBatchModal.tsx` | 生产计划新建 |
| `src/components/farm/seed-source/modals/AddModal.tsx` | 种源新建 |
| `src/components/farm/seed-source/modals/EditModal.tsx` | 种源编辑 |
| `src/components/farm/seedling/modals/AddModal.tsx` | 育苗新建 |
| `src/components/farm/seedling/modals/EditModal.tsx` | 育苗编辑 |
| `src/components/farm/planting/modals/AddModal.tsx` | 种植新建 |
| `src/components/inventory/ProduceInventoryAddModal.tsx` | 库存新建 |
| `src/components/farm/harvest/modals/AddModal.tsx` | 采收新建 |
| `src/components/farm/harvest/modals/BatchEditModal.tsx` | 采收批量编辑 |

---

## 十四、术语表

| 术语 | 说明 |
|-----|------|
| JZB | 育种计划批次号前缀 |
| YMB | 育苗计划批次号前缀 |
| ZZB | 种植计划批次号前缀 |
| source_origin | 来源途径，区分内部自研/外部采购 |
| source_type | 种源类型，基于繁殖方式分类 |
| stock_type / stock_form | 库存形态，区分种子/种苗/成品 |
| production_plan_code | 生产计划批次号 |
| inbound_type | 入库类型 |
| target_inventory | 目标库存 |
| calculate_mode | 育苗计算模式 |
| is_supplementary | 是否补录 |
| source_internal_type | 来源类型（内部/外部） |

---

**文档版本历史**：

| 版本 | 日期 | 修订内容 |
|-----|------|---------|
| V1.0 | 2026-05-05 | Claude 初始方案 |
| V2.0 | 2026-05-05 | 整合 OpenCode 方案，完善追溯链路和字典配置 |
| V3.0 | 2026-05-06 | 整合 OpenCode V1.0 精华：详细字段分析、SQL参考、风险应对、更完整的验收标准 |
