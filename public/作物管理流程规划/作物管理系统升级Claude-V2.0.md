# 作物管理系统升级方案 V2.0

> 制定日期：2026-05-05
> 版本：V2.0（整合 Claude + OpenCode 方案）

---

## 一、背景与目标

### 1.1 项目背景

随着农业生产管理系统的业务复杂度增加，作物管理模块（种源管理、育苗管理、种植管理、采收入库）需要实现完整的业务链追溯能力。

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

---

## 四、数据字典完整配置

### 4.1 现有已配置的数据字典

| 分类编码 | 分类名称 | 状态 |
|---------|---------|------|
| `source_type` | 种源类型（繁殖方式） | ✅ 已配置 |
| `source_origin` | 来源途径 | ✅ 已配置 |
| `seedling_type` | 育苗方式 | ✅ 已配置 |
| `harvest_type` | 采收类型 | ✅ 已配置 |
| `harvest_status` | 采收状态 | ✅ 已配置 |
| `quality_grade` | 品质等级 | ✅ 已配置 |
| `crop_category` | 作物类别 | ✅ 已配置 |
| `planting_mode` | 种植模式 | ✅ 已配置 |

### 4.2 需要新增的数据字典

#### A. 库存形态 (stock_form / stock_type)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 |
|--------|---------|--------|------|------|
| seed | 种子/种源 | seed | yellow | 1 |
| seedling | 种苗 | seedling | green | 2 |
| product | 成品 | product | blue | 3 |
| seed_breeding | 育种材料 | seed_breeding | orange | 4 |

#### B. 生产计划类型 (production_plan_type)

| 字典码 | 字典标签 | 字典值 | 颜色 | 排序 |
|--------|---------|--------|------|------|
| seed_breeding | 育种计划 | seed_breeding | blue | 1 |
| seedling | 育苗计划 | seedling | green | 2 |
| planting | 种植计划 | planting | orange | 3 |

#### C. 入库类型 (inbound_type)

| 字典码 | 字典标签 | 字典值 |
|--------|---------|--------|
| seed_source | 种源入库 | seed_source |
| seedling | 种苗入库 | seedling |
| planting_harvest | 种植采收 | planting_harvest |

#### D. 目标库存 (target_inventory)

| 字典码 | 字典标签 | 字典值 |
|--------|---------|--------|
| seed | 种子 | seed |
| seedling | 种苗 | seedling |
| product | 成品 | product |

#### E. 育苗计算模式 (calculate_mode)

| 字典码 | 字典标签 | 字典值 |
|--------|---------|--------|
| single | 单株育苗 | single |
| propagation | 扩繁育苗 | propagation |

#### F. 来源类型 (supplier_is_internal)

| 字典码 | 字典标签 | 字典值 |
|--------|---------|--------|
| internal | 内部 | internal |
| external | 外部 | external |

#### G. 是否补录 (is_supplementary)

| 字典码 | 字典标签 | 字典值 |
|--------|---------|--------|
| yes | 是 | yes |
| no | 否 | no |

#### H. 单位 (unit)

| 字典码 | 字典标签 | 字典值 |
|--------|---------|--------|
| 袋 | 袋 | bag |
| 株 | 株 | plant |
| 粒 | 粒 | grain |
| 颗 | 颗 | piece |
| kg | 公斤 | kg |
| g | 克 | g |

---

## 五、业务规则

### 5.1 库存扣减触发点

| 操作 | 扣减库存 | 目标形态 |
|------|---------|---------|
| 新建育苗并选择种源 | 种源库 | stock_type='seed' |
| 新建种植并选择种苗 | 种苗库 | stock_type='seedling' |
| 采收入库 | 增加成品库 | stock_type='product' |

### 5.2 关联校验规则

1. **种源创建时**：
   - 如果 `source_origin` = `internal_seed`，则 `production_plan_code` 必填
   - 如果 `source_origin` = `external_purchase`，则 `production_plan_code` 选填

2. **育苗创建时**：
   - `production_plan_code` 必填
   - `source_id` 必填
   - 如果关联的种源是内部自研，则追溯到对应的育种计划

3. **库存创建时**：
   - `stock_type` 必须从数据字典中选择

---

## 六、前端页面改造清单

### 6.1 需要改造的弹窗字段

| 页面 | 文件 | 改造字段 | 目标数据字典 |
|------|------|---------|------------|
| 生产计划 | CreateBatchModal.tsx | planType | production_plan_type |
| 生产计划 | CreateBatchModal.tsx | plantingMode | planting_mode |
| 生产计划 | CreateBatchModal.tsx | responsiblePerson | responsible_person |
| 生产计划 | CreateBatchModal.tsx | batchStatus | batch_status |
| 种源管理 | AddModal.tsx, EditModal.tsx | supplierIsInternal | supplier_is_internal |
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

---

## 七、数据库修改

### 7.1 字段现状

| 表 | 字段 | 现状 |
|----|------|------|
| production_plans | plan_type | 已有值（seed_breeding/seedling） |
| inventory | stock_type | 已有字段 |
| seed_sources | source_origin | 已有字段 |

### 7.2 字典表修改

所有新增字典通过 `SettingsDataProvider.tsx` 配置，无需直接修改数据库。

---

## 八、实施顺序

### 第一阶段：数据字典配置（P0）

1. 在 `SettingsDataProvider.tsx` 中添加所有缺失的字典分类
2. 添加所有字典项
3. 验证前端可见

**新增字典清单：**
| 序号 | 字典码 | 字典名称 | 字典项 |
|------|--------|---------|--------|
| 1 | stock_form | 库存形态 | seed, seedling, product, seed_breeding |
| 2 | production_plan_type | 生产计划类型 | seed_breeding, seedling, planting |
| 3 | inbound_type | 入库类型 | seed_source, seedling, planting_harvest |
| 4 | target_inventory | 目标库存 | seed, seedling, product |
| 5 | calculate_mode | 育苗计算模式 | single, propagation |
| 6 | supplier_is_internal | 来源类型 | internal, external |
| 7 | is_supplementary | 是否补录 | yes, no |
| 8 | unit | 单位 | bag, plant, grain, piece, kg, g |

### 第二阶段：前端页面改造（P1）

1. 按页面顺序改造
2. 将硬编码的 options 替换为 DictSelect 组件
3. 验证下拉选项正确显示

### 第三阶段：业务逻辑验证（P2）

1. 测试库存扣减链路
2. 测试追溯查询链路
3. 修复发现的问题

---

## 九、验收标准

### 9.1 数据字典验收

- [ ] `stock_form` 字典分类和4个字典项创建成功
- [ ] `production_plan_type` 字典分类和3个字典项创建成功
- [ ] `inbound_type` 字典分类和3个字典项创建成功
- [ ] `target_inventory` 字典分类和3个字典项创建成功
- [ ] `calculate_mode` 字典分类和2个字典项创建成功
- [ ] `is_supplementary` 字典分类和2个字典项创建成功
- [ ] `unit` 字典分类创建成功

### 9.2 功能验收

- [ ] 种源管理页面 source_origin 下拉从字典读取
- [ ] 种源管理页面 source_type 下拉从字典读取
- [ ] 育苗管理页面 calculate_mode 下拉从字典读取
- [ ] 采收管理页面 inbound_type 下拉从字典读取
- [ ] 采收管理页面 target_inventory 下拉从字典读取
- [ ] 库存管理页面 stock_type 下拉从字典读取

### 9.3 追溯链验收

- [ ] 内部自研路径：JZB → 种源 → 育苗 → 种植 → 采收 → 入库，追溯成功
- [ ] 外部采购路径：种源（不关联JZB）→ 育苗 → 采收 → 入库，追溯成功
- [ ] 库存页面可按 stock_type 筛选
- [ ] 育苗创建时种源库正确扣减
- [ ] 种植创建时种苗库正确扣减
- [ ] 采收入库时成品库正确增加

---

## 十、关键文件清单

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

**文档版本历史**：

| 版本 | 日期 | 修订内容 |
|-----|------|---------|
| V1.0 | 2026-05-05 | Claude 初始方案 |
| V2.0 | 2026-05-05 | 整合 OpenCode 方案，完善追溯链路和字典配置 |
