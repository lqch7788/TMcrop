# 作物管理优化方案 V1.0

> 制定日期：2026-05-05
> 制定人：OpenCode AI
> 版本：V1.0

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

## 二、现状分析

### 2.4 弹窗表单字段分析（V3.1 版本）

#### 种源新增弹窗 (seed-source/modals/AddModal.tsx)

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

#### 育苗新增弹窗 (seedling/modals/AddModal.tsx)

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

#### 种植新增弹窗 (planting/modals/AddModal.tsx)

**已使用数据字典的字段：**
- `sourceTypeOptions` (来源类型选项) - 外部传入

**仍使用硬编码的字段：**
| 字段 | 类型 | 位置 | 建议 |
|-----|------|------|------|
| sourceType | radio (seed/seedling) | 第238行 | 使用 sourceTypeOptions 渲染 |
| 是否补录 | select (true/false) | - | 使用通用是否字典 |

#### 采收入库新增弹窗 (harvest/modals/AddModal.tsx)

**已使用数据字典的字段：**
- `quality_grade` (品质等级) - ✅ 使用 getDictItems('quality_grade')
- `harvest_type` (采收类型) - ✅ 使用 getDictItems('harvest_type')

**仍使用硬编码的字段：**
| 字段 | 类型 | 位置 | 建议 |
|-----|------|------|------|
| inboundType | select (3项) | 第197行 | **新增字典 `inbound_type`** |
| targetInventory | select (3项) | 第287行 | **新增字典 `target_inventory`** |
| 是否补录 | select (true/false) | 第305行 | 使用通用是否字典 |

### 2.5 需新增的数据字典汇总

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
| yes_no | 是否 | common | yes, no |
| source_internal_type | 来源类型 | seed-source | internal, external |

---

## 二、现状分析（原有）

### 2.6 借鉴作物管理系统升级Claude-V1.0.md 的内容

#### 追溯链路设计（借鉴第24-73行）

该方案设计了更完整的追溯链路：

```
生产计划 (JZB/YMB/ZZB)
     │
     ├─[JZB] 育种计划 ──────────────────────────────────────────────────┐
     │                                                               │
     ├─[YMB] 育苗计划 ──────────────────────────────────────────────────┤
     │                                                               │
     └─[ZZB] 种植计划 ──────────────────────────────────────────────────┘
            │
            ▼
     ┌──────────────┐
     │   种源管理    │ ◄── source_origin 区分自研/外购
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

#### 库存扣减触发点（借鉴第229-235行）

| 操作 | 扣减库存 | 目标形态 |
|------|---------|---------|
| 新建育苗并选择种源 | 种源库 | stock_type='seed' |
| 新建种植并选择种苗 | 种苗库 | stock_type='seedling' |
| 采收入库 | 增加成品库 | stock_type='product' |

#### 需新增的数据字典汇总（借鉴第96-154行）

**原有方案遗漏的重要字典：**

| 分类编码 | 分类名称 | 字典项 | 来源 |
|---------|---------|--------|------|
| `plan_type` | 生产计划类型 | seed_breeding, seedling, **planting** | 文档补充 |
| `planting_mode` | 种植模式 | 直播, 移栽, 嫁接, 组培, 其他 | 文档补充 |
| `responsible_person` | 负责人 | 陆启闯, 王建国, 李明辉, 张伟 | 文档补充 |
| `batch_status` | 生产计划状态 | 规划中, 执行中, 已完成, 已取消 | 文档补充 |
| `supplier_is_internal` | 来源类型 | internal, external | 文档补充 |
| `seedling_site` | 育苗场地 | 育苗温室A区, 育苗温室B区, 玻璃温室A区 | 文档补充 |
| `planting_source_type` | 种植来源类型 | 种苗种植, 种子种植, 库存调拨 | 文档补充 |
| `quality_level` | 品质评定 | 特优, 优, 良, 合格, 不合格 | 文档补充 |
| `warehouse` | 仓库 | 种源库, 种苗库, 成品库, 采后库 | 文档补充 |
| `harvest_greenhouse` | 采收区域 | 玻璃温室A区, 玻璃温室B区 | 文档补充 |

#### 涉及修改的文件清单（借鉴第252-268行）

| 页面 | 文件 | 修改字段 |
|------|------|---------|
| 生产计划 | CreateBatchModal.tsx | planType, plantingMode, responsiblePerson, batchStatus |
| 种源管理 | AddModal.tsx, EditModal.tsx | supplierIsInternal, unit, isSupplementary |
| 育苗管理 | AddModal.tsx, EditModal.tsx | seedlingSite, seedlingType, calculateMode, isSupplementary |
| 作物种植 | AddModal.tsx, EditModal.tsx | sourceType, areaId |
| 库存管理 | ProduceInventoryAddModal.tsx | stockType, unit, qualityLevel, warehouse, plantingMode |
| 采收管理 | AddModal.tsx, BatchEditModal.tsx | inboundType, harvestGreenhouse, targetInventory, isSupplementary |

#### 实施顺序（借鉴第271-286行）

**第一阶段：数据字典配置（P0）**
1. 在 SettingsDataProvider.tsx 中添加所有字典分类
2. 添加所有字典项
3. 验证前端可见

**第二阶段：前端页面改造（P1）**
1. 按页面顺序改造：生产计划 → 种源 → 育苗 → 种植 → 库存 → 采收
2. 将硬编码的 options 替换为 DictSelect 组件
3. 验证下拉选项正确显示

**第三阶段：业务逻辑验证（P2）**
1. 测试库存扣减链路
2. 测试追溯查询链路
3. 修复发现的问题

### 2.1 现有数据库表结构

#### 生产计划表 (production_plans)

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | TEXT | 主键 |
| plan_code | TEXT | 计划编号，如 JZB2026-001 |
| plan_name | TEXT | 计划名称 |
| plan_type | TEXT | 计划类型 |
| crop_name | TEXT | 作物名称 |
| crop_variety | TEXT | 作物品种 |
| greenhouse_name | TEXT | 场地/供应商 |
| planned_quantity | INTEGER | 目标数量 |
| status | TEXT | 状态 |
| ... | ... | ... |

**关键发现**：
- `plan_type` 字段存在，但通过 `plan_code` 前缀区分类型：
  - `JZB` = 育种计划
  - `YMB` = 育苗计划
  - `ZZB` = 种植计划

#### 种源表 (seed_sources)

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | TEXT | 主键 |
| source_code | TEXT | 种源编号 |
| source_type | TEXT | 种源类型（繁殖方式） |
| source_origin | TEXT | 来源途径（已有字段） |
| production_plan_code | TEXT | 关联生产计划批次号（已有字段） |
| crop_name | TEXT | 作物名称 |
| crop_variety | TEXT | 作物品种 |
| quantity | INTEGER | 采购数量 |
| ... | ... | ... |

**关键发现**：
- ✅ `production_plan_code` 字段已存在
- ✅ `source_origin` 字段已存在
- ⚠️ `source_type` 基于繁殖方式，需增加数据字典配置

#### 育苗表 (seedlings)

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | TEXT | 主键 |
| seedling_code | TEXT | 育苗批号 |
| source_id | TEXT | 关联种源ID |
| production_plan_code | TEXT | 关联生产计划批次号（已有字段） |
| crop_name | TEXT | 作物名称 |
| seedling_quantity | INTEGER | 初始数量 |
| survival_quantity | INTEGER | 成活数量 |
| status | TEXT | 状态 |
| ... | ... | ... |

**关键发现**：
- ✅ `production_plan_code` 字段已存在
- ✅ `source_id` 关联种源

#### 库存表 (inventory)

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | TEXT | 主键 |
| product_code | TEXT | 产品编码 |
| crop_name | TEXT | 作物名称 |
| variety | TEXT | 品种 |
| stock_type | TEXT | 库存类型 |
| quantity | REAL | 数量 |
| production_plan_code | TEXT | 关联生产计划批次号 |
| batch_code | TEXT | 批次号 |
| ... | ... | ... |

**关键发现**：
- ✅ `production_plan_code` 字段已存在
- ✅ `stock_type` 字段已存在，当前值：seed/seedling/product

### 2.2 现有数据字典结构

#### 字典分类表 (dictionary_categories)

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | TEXT | 主键 |
| code | TEXT | 分类编码（唯一） |
| name | TEXT | 分类名称 |
| module | TEXT | 所属模块 |
| description | TEXT | 描述 |
| sort_order | INTEGER | 排序 |
| status | TEXT | 状态 |

#### 字典项表 (dictionaries)

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | TEXT | 主键 |
| category_code | TEXT | 关联分类编码 |
| dict_code | TEXT | 字典项编码（系统使用） |
| dict_label | TEXT | 显示名称 |
| dict_value | TEXT | 存储值 |
| color | TEXT | 颜色标记 |
| sort_order | INTEGER | 排序 |
| is_default | INTEGER | 是否默认 |
| status | TEXT | 状态 |

### 2.3 现有数据字典配置情况

#### 已配置的数据字典

| 分类编码 | 分类名称 | 模块 | 状态 |
|---------|---------|------|------|
| crop_category | 作物类别 | crop | ✅ 已配置 |
| planting_mode | 种植模式 | crop | ✅ 已配置 |
| greenhouse_type | 温室类型 | base | ✅ 已配置 |
| seedling_type | 育苗方式 | crop | ✅ 已配置 |
| harvest_status | 采收状态 | crop | ✅ 已配置 |
| material_type | 物料类型 | material | ✅ 已配置 |
| source_origin | 来源途径 | crop | ✅ 部分配置 |

#### 部分配置或未配置

| 分类编码 | 分类名称 | 需要操作 |
|---------|---------|---------|
| stock_form | 库存形态 | ❌ 未配置，需新增 |
| production_plan_type | 生产计划类型 | ❌ 未配置，需新增 |
| source_type | 种源类型（繁殖方式） | ❌ 未配置，需新增 |

---

## 三、问题诊断

### 3.1 追溯链断裂问题

**问题描述**：
- 育苗列表未强制关联生产计划批次号
- 种源与生产计划的关联关系不明确
- 外购种源不关联生产计划，但系统未做区分

**根本原因**：
- 业务规则未明确规定
- 前端未做强制关联校验
- 数据字典未完整配置

### 3.2 硬编码问题

**问题描述**：
- 部分枚举值硬编码在前端 TypeScript 代码中
- 修改选项需要修改代码并重新编译

**需要配置化的硬编码项**：

1. **种源来源途径 (source_origin)**
   - 当前值：`internal_seed`, `external_purchase`, `tissue_culture` 等
   - 位置：`src/types/crop.ts`

2. **种源类型 (source_type)**
   - 当前值：`seed`, `seedling`, `cutting`, `grafting` 等
   - 位置：前端下拉菜单

3. **库存形态 (stock_form)**
   - 当前值：`seed`, `seedling`, `product`
   - 位置：`inventory.stock_type` 字段

### 3.3 库存形态不清晰问题

**问题描述**：
- `inventory.stock_type` 字段值不统一
- 无法按种子/种苗/成品筛选库存

**需要增加的库存形态**：
- `seed` = 种子/种源
- `seedling` = 种苗
- `product` = 成品
- `seed_breeding` = 育种材料（新增）

---

## 四、解决方案

### 4.1 数据字典扩展方案

#### 4.1.1 新增字典分类

| 分类编码 | 分类名称 | 模块 | 描述 |
|---------|---------|------|------|
| stock_form | 库存形态 | crop | 库存中物品的实际形态 |
| production_plan_type | 生产计划类型 | crop | 生产计划的类型（通过批次号前缀区分） |
| source_type | 种源类型 | crop | 基于繁殖方式的分类 |

#### 4.1.2 新增字典项

##### (1) 库存形态 (stock_form)

| 字典编码 | 字典标签 | 字典值 | 颜色 | 排序 | 说明 |
|---------|---------|--------|------|------|------|
| seed | 种子/种源 | seed | yellow | 1 | 种源库中的种子 |
| seedling | 种苗 | seedling | green | 2 | 种苗库中的种苗 |
| product | 成品 | product | blue | 3 | 成品冷库中的产品 |
| seed_breeding | 育种材料 | seed_breeding | orange | 4 | 育种过程中的材料 |

##### (2) 生产计划类型 (production_plan_type)

| 字典编码 | 字典标签 | 字典值 | 颜色 | 排序 | 说明 |
|---------|---------|--------|------|------|------|
| seed_breeding | 育种计划 | seed_breeding | blue | 1 | JZB前缀批次 |
| seedling | 育苗计划 | seedling | green | 2 | YMB前缀批次 |
| planting | 种植计划 | planting | orange | 3 | ZZB前缀批次 |

##### (3) 种源类型 (source_type)

| 字典编码 | 字典标签 | 字典值 | 颜色 | 排序 | 说明 |
|---------|---------|--------|------|------|------|
| seed | 种子 | seed | yellow | 1 | 种子繁殖 |
| seedling | 种苗/实生苗 | seedling | green | 2 | 实生苗 |
| cutting | 扦插苗 | cutting | cyan | 3 | 扦插繁殖 |
| grafting | 嫁接苗 | grafting | purple | 4 | 嫁接繁殖 |
| tissue_culture | 组培苗 | tissue_culture | pink | 5 | 组织培养 |
| split | 分株苗 | split | orange | 6 | 分株繁殖 |
| bulb | 种球/球根 | bulb | brown | 7 | 球根繁殖 |
| other | 其他 | other | gray | 8 | 其他方式 |

##### (4) 种源来源途径 (source_origin) 扩展

| 字典编码 | 字典标签 | 字典值 | 颜色 | 排序 | 说明 |
|---------|---------|--------|------|------|------|
| internal_seed | 内部种源 | internal_seed | green | 1 | 自研/自产种源 |
| external_purchase | 外部采购 | external_purchase | blue | 2 | 向供应商采购 |
| tissue_culture | 组培苗 | tissue_culture | purple | 3 | 组织培养苗 |
| grafting | 嫁接苗 | grafting | orange | 4 | 嫁接繁殖 |
| seedling_split | 分株繁殖 | seedling_split | cyan | 5 | 分株方式繁殖 |
| cutting | 扦插繁殖 | cutting | pink | 6 | 扦插方式繁殖 |
| direct_seedling | 直接育苗 | direct_seedling | yellow | 7 | 自繁育苗 |
| direct_planting | 直接种植 | direct_planting | gray | 8 | 外购苗直接种 |
| external_harvest | 外购成品入库 | external_harvest | brown | 9 | 外购成品入库 |

### 4.2 业务追溯链设计

#### 4.2.1 追溯链完整路径

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
           │ source_id（种源ID）
           ▼
    ┌──────────────┐
    │   育苗管理    │ ◄── 关联: production_plan_code（必填）
    │  seedlings   │     关联: source_id（关联种源）
    └──────────────┘
           │
           │ planting_id（种植ID）
           ▼
    ┌──────────────┐
    │   种植管理    │ ◄── 关联: source_id（关联种源或育苗）
    │  plantings   │
    └──────────────┘
           │
           │ harvest_id（采收ID）
           ▼
    ┌──────────────┐
    │   采收入库    │ ◄── 关联: source_id
    │harvest_records│
    └──────────────┘
           │
           │ inventory_id（库存ID）
           ▼
    ┌──────────────┐
    │   作物库存    │ ◄── stock_type（seed/seedling/product/seed_breeding）
    │  inventory   │     production_plan_code（追溯生产计划）
    └──────────────┘
```

#### 4.2.2 内部自研追溯路径

```
育种计划(JZB) ──► 种源 ──► 育苗 ──► 种植 ──► 采收 ──► 入库
     │                                              │
     └──────────────────────────────────────────────┘
                    production_plan_code 贯穿始终
```

#### 4.2.3 外部采购追溯路径

```
种源（外购，不关联JZB）
     │
     ▼
育苗（可关联YMB育苗计划）
     │
     ▼
种植 ──► 采收 ──► 入库
```

### 4.3 前端配置化方案

#### 4.3.1 下拉菜单数据来源

**修改前**：
```typescript
// 硬编码
const sourceOriginOptions = [
  { value: 'internal_seed', label: '内部种源' },
  { value: 'external_purchase', label: '外部采购' },
  // ...
];
```

**修改后**：
```typescript
// 从数据字典API获取
const sourceOriginOptions = await fetchDictionary('source_origin');
```

#### 4.3.2 统一的数据字典 Hook

```typescript
// hooks/useDictionary.ts
import { useState, useEffect } from 'react';

export function useDictionary(category: string) {
  const [options, setOptions] = useState<DictionaryOption[]>([]);

  useEffect(() => {
    fetchDictionary(category).then(setOptions);
  }, [category]);

  return options;
}
```

#### 4.3.3 前端需要修改的文件

| 模块 | 文件路径 | 修改内容 |
|-----|---------|---------|
| 种源管理 | src/pages/crop/seed-source/** | source_origin 下拉改为字典 |
| 育苗管理 | src/pages/crop/seedling/** | source_type、关联生产计划 |
| 库存管理 | src/pages/crop-inventory/** | stock_type 下拉改为字典 |

### 4.4 后端验证逻辑

#### 4.4.1 验证规则

1. **种源创建时**：
   - 如果 `source_origin` = `internal_seed`，则 `production_plan_code` 必填
   - 如果 `source_origin` = `external_purchase`，则 `production_plan_code` 选填

2. **育苗创建时**：
   - `production_plan_code` 必填
   - 如果关联的种源是内部自研，则追溯到对应的育种计划

3. **库存创建时**：
   - `stock_type` 必须从数据字典中选择
   - 如果 `stock_type` = `seed_breeding`，则必须关联 `production_plan_code`

---

## 五、实施计划

### 5.1 阶段一：数据字典配置（P0）

**目标**：补充所有缺失的数据字典项

**任务清单**：

| 序号 | 字典码 | 字典名称 | 字典项 | 修改文件 |
|-----|--------|---------|--------|---------|
| 1.1 | `stock_form` | 库存形态 | seed, seedling, product, seed_breeding | SettingsDataProvider.tsx |
| 1.2 | `production_plan_type` | 生产计划类型 | seed_breeding, seedling, planting | SettingsDataProvider.tsx |
| 1.3 | `source_type` | 种源类型 | seed, seedling, cutting, grafting, tissue_culture, split, bulb, other | SettingsDataProvider.tsx |
| 1.4 | `source_origin` | 来源途径 | 扩展至9项 | SettingsDataProvider.tsx |
| 1.5 | `inbound_type` | 入库类型 | seed_source, seedling, planting_harvest | SettingsDataProvider.tsx |
| 1.6 | `target_inventory` | 目标库存 | seed, seedling, product | SettingsDataProvider.tsx |
| 1.7 | `calculate_mode` | 育苗计算模式 | single, propagation | SettingsDataProvider.tsx |
| 1.8 | `planting_mode` | 种植模式 | 直播, 移栽, 嫁接, 组培, 其他 | SettingsDataProvider.tsx |
| 1.9 | `responsible_person` | 负责人 | 陆启闯, 王建国, 李明辉, 张伟 | SettingsDataProvider.tsx |
| 1.10 | `batch_status` | 生产计划状态 | 规划中, 执行中, 已完成, 已取消 | SettingsDataProvider.tsx |
| 1.11 | `supplier_is_internal` | 来源类型 | internal, external | SettingsDataProvider.tsx |
| 1.12 | `seedling_site` | 育苗场地 | 育苗温室A区, 育苗温室B区, 玻璃温室A区 | SettingsDataProvider.tsx |
| 1.13 | `planting_source_type` | 种植来源类型 | 种苗种植, 种子种植, 库存调拨 | SettingsDataProvider.tsx |
| 1.14 | `quality_level` | 品质评定 | 特优, 优, 良, 合格, 不合格 | SettingsDataProvider.tsx |
| 1.15 | `warehouse` | 仓库 | 种源库, 种苗库, 成品库, 采后库 | SettingsDataProvider.tsx |
| 1.16 | `harvest_greenhouse` | 采收区域 | 玻璃温室A区, 玻璃温室B区 | SettingsDataProvider.tsx |
| 1.17 | `is_supplementary` | 是否补录 | 是, 否 | SettingsDataProvider.tsx |
| 1.18 | `unit` | 单位 | 株, kg, 袋, 粒, 颗 | SettingsDataProvider.tsx |

### 5.2 阶段二：前端页面改造（P1）

**目标**：将硬编码的下拉菜单改为从数据字典读取

**任务清单**：

| 序号 | 页面 | 文件 | 修改字段 |
|-----|------|------|---------|
| 2.1 | 生产计划 | CreateBatchModal.tsx | planType, plantingMode, responsiblePerson, batchStatus |
| 2.2 | 种源管理 | AddModal.tsx, EditModal.tsx | supplierIsInternal, unit, isSupplementary |
| 2.3 | 育苗管理 | AddModal.tsx, EditModal.tsx | seedlingSite, seedlingType, calculateMode, isSupplementary |
| 2.4 | 作物种植 | AddModal.tsx, EditModal.tsx | sourceType, areaId |
| 2.5 | 库存管理 | ProduceInventoryAddModal.tsx | stockType, unit, qualityLevel, warehouse, plantingMode |
| 2.6 | 采收管理 | AddModal.tsx, BatchEditModal.tsx | inboundType, harvestGreenhouse, targetInventory, isSupplementary |

### 5.3 阶段三：业务逻辑验证（P2）

**目标**：验证库存扣减链路和追溯查询链路

**任务清单**：

| 序号 | 任务 | 验证点 |
|-----|------|-------|
| 3.1 | 测试育苗库存扣减 | 新建育苗时种源库扣减 |
| 3.2 | 测试种植库存扣减 | 新建种植时种苗库扣减 |
| 3.3 | 测试采收入库 | 采收时成品库增加 |
| 3.4 | 测试追溯链路 | 种源→育苗→种植→采收→库存 |

---

## 六、技术细节

### 6.1 数据库 ALTER TABLE 语句

```sql
-- 为库存表 stock_type 添加注释说明其用途
-- stock_type 存储值: seed, seedling, product, seed_breeding

-- 为种源表 source_origin 添加注释
-- source_origin 存储值: internal_seed, external_purchase, 等
```

### 6.2 字典数据插入 SQL

#### 库存形态 (stock_form)

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

#### 生产计划类型 (production_plan_type)

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

#### 种源类型 (source_type)

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

### 6.3 API 端点

#### 获取数据字典

```
GET /api/dictionaries?category={category_code}
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    { "dictCode": "seed", "dictLabel": "种子", "dictValue": "seed" },
    { "dictCode": "seedling", "dictLabel": "种苗", "dictValue": "seedling" }
  ]
}
```

#### 获取字典分类列表

```
GET /api/dictionaries/categories
```

---

## 七、风险与应对

### 7.1 数据迁移风险

**风险**：现有数据可能与新的数据字典值不匹配

**应对**：
1. 实施前进行数据备份
2. 创建数据迁移脚本，处理历史数据
3. 先在测试环境验证

### 7.2 前端兼容风险

**风险**：修改下拉数据源可能影响现有功能

**应对**：
1. 保持 API 返回格式兼容
2. 使用 Feature Flag 控制新功能
3. 逐步替换硬编码选项

### 7.3 性能风险

**风险**：每次加载下拉选项都请求 API

**应对**：
1. 实现前端缓存机制
2. 启动时预加载常用字典
3. 使用 localStorage 缓存

---

## 八、验收标准

### 8.1 数据字典验收

- [ ] `stock_form` 字典分类和4个字典项创建成功
- [ ] `production_plan_type` 字典分类和3个字典项创建成功
- [ ] `source_type` 字典分类和8个字典项创建成功
- [ ] `source_origin` 字典项扩展到9个
- [ ] `inbound_type` 字典分类和3个字典项创建成功
- [ ] `target_inventory` 字典分类和3个字典项创建成功
- [ ] `calculate_mode` 字典分类和2个字典项创建成功
- [ ] `planting_mode` 字典分类和5个字典项创建成功
- [ ] `is_supplementary` 字典分类和2个字典项创建成功
- [ ] `unit` 字典分类创建成功

### 8.2 功能验收

- [ ] 种源管理页面 source_origin 下拉从字典读取
- [ ] 种源管理页面 source_type 下拉从字典读取
- [ ] 育苗管理页面 calculate_mode 下拉从字典读取
- [ ] 采收管理页面 inbound_type 下拉从字典读取
- [ ] 采收管理页面 target_inventory 下拉从字典读取
- [ ] 库存管理页面 stock_type 下拉从字典读取

### 8.3 追溯链验收

- [ ] 内部自研路径：JZB → 种源 → 育苗 → 种植 → 采收 → 入库，追溯成功
- [ ] 外部采购路径：种源（不关联JZB）→ 育苗 → 采收 → 入库，追溯成功
- [ ] 库存页面可按 stock_type 筛选
- [ ] 育苗创建时种源库正确扣减
- [ ] 种植创建时种苗库正确扣减
- [ ] 采收入库时成品库正确增加

---

## 九、附录

### 9.1 术语表

| 术语 | 说明 |
|-----|------|
| JZB | 育种计划批次号前缀 |
| YMB | 育苗计划批次号前缀 |
| ZZB | 种植计划批次号前缀 |
| source_origin | 来源途径，区分内部自研/外部采购 |
| source_type | 种源类型，基于繁殖方式分类 |
| stock_type | 库存形态，区分种子/种苗/成品 |
| production_plan_code | 生产计划批次号 |

### 9.2 相关文件清单

| 文件路径 | 说明 |
|---------|------|
| `server/src/db/schema.ts` | 数据库表结构定义 |
| `server/src/db/seedBasicData.ts` | 基础数据种子数据 |
| `server/src/db/seedData.ts` | 业务数据种子数据 |
| `server/src/routes/dictionary.ts` | 字典 API 路由 |
| `server/src/routes/seedSource.ts` | 种源 API 路由 |
| `server/src/routes/seedling.ts` | 育苗 API 路由 |
| `server/src/routes/inventory.ts` | 库存 API 路由 |
| `src/types/crop.ts` | 作物类型定义 |
| `src/pages/crop/seed-source/**` | 种源管理页面 |
| `src/pages/crop/seedling/**` | 育苗管理页面 |
| `src/pages/crop-inventory/**` | 库存管理页面 |

---

**文档版本历史**：

| 版本 | 日期 | 修订内容 |
|-----|------|---------|
| V1.0 | 2026-05-05 | 初始版本 |
