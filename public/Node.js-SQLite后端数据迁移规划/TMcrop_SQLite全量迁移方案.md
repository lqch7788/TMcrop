# TMcrop 种植管理系统 — 全模块 SQLite 数据迁移深度规划

**规划日期**：2026-05-02  
**目标**：将所有 LocalStorage 数据迁移至 SQLite，建立模块间完整关联，通过系统设置模块打通业务流程  
**约束**：基于现有代码逻辑，不修改代码，只输出规划方案

---

## 目录

1. [现状诊断](#一现状诊断)
2. [完整 SQLite Schema 设计](#二完整-sqlite-schema-设计)
3. [字段映射对照表](#三字段映射对照表)
4. [数据关联关系设计](#四数据关联关系设计)
5. [系统设置模块重构方案](#五系统设置模块重构方案)
6. [数据迁移脚本设计](#六数据迁移脚本设计)
7. [前端切换方案](#七前端切换方案)
8. [实施优先级与批次](#八实施优先级与批次)
9. [风险与回退方案](#九风险与回退方案)

---

## 一、现状诊断

### 1.1 当前存储架构断层

```
┌────────────────────────────────────────────────────────────────────┐
│                         前端浏览器层                                │
├────────────────────────────────────────────────────────────────────┤
│  LocalStorage (5-10MB)                                             │
│  ├─ crop_seed_sources      ← 种源数据（含模拟数据）                  │
│  ├─ crop_seedlings         ← 育苗数据（含模拟数据）                  │
│  ├─ crop_plantings         ← 种植数据（含模拟数据）                  │
│  ├─ harvest_records        ← 采收数据（含模拟数据）                  │
│  ├─ crop_instances         ← 实例数据（默认空）                        │
│  ├─ crop_orders            ← 订单数据（默认空）                        │
│  ├─ crop_varieties         ← 品种库（自动生成）                      │
│  └─ approvals              ← 审批数据（Context管理）                 │
│                                                                    │
│  系统设置（硬编码，无持久化）                                         │
│  ├─ 部门管理 → departments[] 硬编码数组                              │
│  ├─ 基地管理 → 无独立数据层                                         │
│  ├─ 人员管理 → 无独立数据层                                         │
│  └─ 仓库管理 → 无独立数据层                                         │
├────────────────────────────────────────────────────────────────────┤
│                         后端 SQLite 层                              │
├────────────────────────────────────────────────────────────────────┤
│  已有表（12张，全部为空）                                           │
│  ├─ crop_varieties, inventory, crop_instances, seed_sources         │
│  ├─ seedlings, plantings, harvest_records, suppliers                  │
│  └─ farm_tasks, inspections, problems, labor_records                  │
│                                                                    │
│  缺失表（20+张）                                                     │
│  ├─ crop_orders（订单）                                               │
│  ├─ warehouses（仓库）                                                │
│  ├─ materials（物料）                                               │
│  ├─ material_receiving（物料领用）                                  │
│  ├─ material_returns（物料归还）                                      │
│  ├─ produce_inventory（产品库存）                                     │
│  ├─ company_groups（基地/公司）                                       │
│  ├─ greenhouses（温室/大棚）                                          │
│  ├─ plant_areas（种植区域）                                           │
│  ├─ departments（部门）                                               │
│  ├─ positions（职位）                                               │
│  ├─ staff（人员）                                                     │
│  ├─ attendance_records（考勤）                                        │
│  ├─ leave_records（请假）                                             │
│  ├─ overtime_records（加班）                                          │
│  ├─ salary_adjustments（调薪）                                        │
│  ├─ production_plans（生产计划）                                      │
│  ├─ daily_plans（日计划）                                             │
│  └─ approvals（审批）                                               │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据孤岛问题

当前各模块数据**完全没有关联**：

| 问题 | 现状 | 理想状态 |
|------|------|---------|
| 种源→育苗 | `sourceId` 和 `sourceCode` 硬编码引用，但育苗数据里的 `sourceId` 如果改了，种源表不会知道 | 外键关联，级联更新 |
| 育苗→种植 | `sourceId` 引用育苗记录，但种植操作后育苗的 `plantedCount` 靠 Service 层手动更新 | 触发器自动同步数量 |
| 种植→采收 | `batchCode` 字符串匹配，极易出错 | 外键关联到种植记录 |
| 采收→库存 | 采收后 `warehouseId` 写入，但库存表是独立数据 | 采收自动触发入库 |
| 实例→全链路 | 实例是被动生成，各模块操作不更新实例数量 | 所有操作围绕实例，自动扣减/增加 |
| 订单→实例 | `instanceIds` 数组，但订单创建时不自动创建实例 | 订单创建自动生成/绑定实例 |
| 人员→操作 | `createBy` 是字符串（如"李明辉"），不是人员ID | 关联到 staff 表，支持人员变动 |
| 基地→种植 | `areaId`/`areaName` 是字符串，没有基地数据层 | 关联到 greenhouse/plant_area 表 |

### 1.3 系统设置模块问题

当前系统设置页面：
- **部门管理**：`departments[]` 硬编码数组，刷新即恢复默认值
- **基地/温室**：无独立数据层，`areaName` 如"一棚 > 01区"是字符串拼接
- **人员管理**：无独立数据层，`createBy` 自由输入
- **仓库管理**：无独立数据层，`warehouseName` 硬编码

**后果**：
- 人员离职/改名，所有历史记录的 `createBy` 还是旧名字
- 基地扩建/改名，所有种植记录的 `areaName` 还是旧名称
- 无法做统计分析（"生产部今年种了多少番茄？" → 无法统计，因为没有部门ID关联）

---

## 二、完整 SQLite Schema 设计

### 2.1 核心原则

1. **所有表统一使用下划线命名**（`seed_sources` 而非 `seedSources`）
2. **所有表必须有 `id` 主键（TEXT，UUID 格式）**
3. **所有业务表必须有 `create_time`/`update_time`**
4. **所有外键关系必须显式声明**（SQLite 支持外键约束）
5. **枚举字段用 TEXT + CHECK 约束**
6. **JSON 字段用于数组/对象存储**（SQLite 3.38+ 支持 JSON 函数）

### 2.2 系统设置层（基础数据）

```sql
-- ============================================
-- 1. 组织架构
-- ============================================

-- 公司/基地
CREATE TABLE company_groups (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,           -- 基地编码
  name TEXT NOT NULL,                    -- 基地名称
  address TEXT,                          -- 地址
  contact_person TEXT,                   -- 负责人
  contact_phone TEXT,                    -- 联系电话
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 温室/大棚
CREATE TABLE greenhouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,             -- 温室编码
  name TEXT NOT NULL,                    -- 温室名称
  company_id TEXT,                       -- 所属基地
  area REAL DEFAULT 0,                   -- 面积（平方米）
  type TEXT DEFAULT 'glass' CHECK (type IN ('glass', 'solar', 'net', 'open')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (company_id) REFERENCES company_groups(id) ON DELETE SET NULL
);

-- 种植区域/分区
CREATE TABLE plant_areas (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,                    -- 区域名称（如"01区"）
  greenhouse_id TEXT NOT NULL,             -- 所属温室
  area REAL DEFAULT 0,                   -- 面积
  soil_type TEXT,                        -- 土壤类型
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE CASCADE
);

-- 部门
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,                    -- 部门名称
  parent_id TEXT,                        -- 上级部门
  manager_id TEXT,                       -- 部门负责人（人员ID）
  description TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (manager_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 职位
CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,                    -- 职位名称
  department_id TEXT,                    -- 所属部门
  level INTEGER DEFAULT 1,             -- 职级
  description TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 人员/员工
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,             -- 工号
  name TEXT NOT NULL,                    -- 姓名
  phone TEXT,
  email TEXT,
  department_id TEXT,                    -- 所属部门
  position_id TEXT,                      -- 职位
  id_card TEXT,                          -- 身份证号
  entry_date TEXT,                       -- 入职日期
  leave_date TEXT,                       -- 离职日期
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned', 'on_leave')),
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
);

-- ============================================
-- 2. 供应商与仓库
-- ============================================

CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  supplier_code TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  address TEXT,
  supplier_type TEXT DEFAULT 'seed' CHECK (supplier_type IN ('seed', 'equipment', 'fertilizer', 'pesticide', 'other')),
  status TEXT DEFAULT 'active',
  remarks TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'cold', 'seed', 'tool')),
  address TEXT,
  manager_id TEXT,                       -- 仓库负责人
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (manager_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 3. 作物品种库
-- ============================================

CREATE TABLE crop_varieties (
  id TEXT PRIMARY KEY,
  crop_code TEXT NOT NULL UNIQUE,        -- 11位编码
  category_code TEXT NOT NULL,           -- 类别码（2位）
  category_name TEXT,                    -- 类别名
  type_code TEXT NOT NULL,               -- 类型码（2位）
  type_name TEXT,                        -- 类型名
  variety_code TEXT NOT NULL,            -- 品种码（2位）
  variety_name TEXT,                     -- 品种名
  sub_variety1_code TEXT,                -- 子品种1码（3位）
  sub_variety1_name TEXT,                -- 子品种1名
  detail_variety_code TEXT DEFAULT '00', -- 详细品种码（2位）
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime'))
);
```

### 2.3 作物管理核心层

```sql
-- ============================================
-- 4. 种源管理
-- ============================================

CREATE TABLE seed_sources (
  id TEXT PRIMARY KEY,
  seed_code TEXT NOT NULL UNIQUE,        -- 种源批号：ZZ + 年月日 + 流水号
  source_type TEXT NOT NULL CHECK (source_type IN ('seed', 'seedling', 'cutting', 'grafting', 'tissue_culture', 'split', 'bulb', 'other')),
  source_origin TEXT NOT NULL CHECK (source_origin IN ('internal_seed', 'external_purchase', 'tissue_culture', 'grafting', 'seedling_split', 'cutting', 'direct_seedling', 'direct_planting', 'external_harvest')),
  crop_category TEXT,                    -- 作物类别
  type_name TEXT,                        -- 类型名称
  variety_name TEXT,                     -- 品种名称
  crop_name TEXT NOT NULL,               -- 作物名称（最细化）
  crop_variety TEXT,                     -- 作物品种
  crop_code TEXT NOT NULL,               -- 11位作物编码
  supplier_id TEXT,                      -- 供应商ID（外键）
  purchase_date TEXT,                    -- 采购日期
  quantity INTEGER DEFAULT 0,          -- 采购数量
  unit TEXT,                             -- 单位
  unit_price REAL DEFAULT 0,           -- 单价
  total_amount REAL DEFAULT 0,         -- 总金额
  initial_count INTEGER DEFAULT 0,     -- 初始数量
  available_count INTEGER DEFAULT 0,   -- 可用数量
  pictures TEXT,                         -- JSON数组：图片Base64或URL
  remarks TEXT,
  status TEXT DEFAULT 'sufficient' CHECK (status IN ('sufficient', 'low', 'depleted')),
  traceability_code TEXT,                -- 溯源码
  print_count INTEGER DEFAULT 0,       -- 打印次数
  instance_id TEXT,                      -- 关联作物实例ID
  create_by TEXT,                        -- 创建人ID（关联staff）
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 5. 育苗管理
-- ============================================

CREATE TABLE seedlings (
  id TEXT PRIMARY KEY,
  seedling_code TEXT NOT NULL UNIQUE,     -- 育苗批号：YM + 年月日 + 流水号
  source_id TEXT,                          -- 来源种源ID（外键）
  source_code TEXT,                      -- 来源种源编码（冗余，便于查询）
  crop_code TEXT NOT NULL,               -- 作物编码
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  seedling_type TEXT,                    -- 育苗类型
  greenhouse_id TEXT,                    -- 育苗温室ID（外键）
  area_id TEXT,                          -- 育苗区域ID（外键）
  start_date TEXT,                       -- 育苗开始日期
  end_date TEXT,                         -- 实际结束日期
  expected_end_date TEXT,                -- 预计结束日期
  initial_count INTEGER DEFAULT 0,       -- 初始育苗数量
  survival_count INTEGER DEFAULT 0,      -- 成活数量
  planted_count INTEGER DEFAULT 0,       -- 已定植数量
  survival_rate REAL DEFAULT 0,        -- 成活率
  loss_count INTEGER DEFAULT 0,          -- 损耗数量
  loss_rate REAL DEFAULT 0,            -- 损耗率
  is_finished INTEGER DEFAULT 0,       -- 是否完成（0/1）
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'transplant_ready', 'completed', 'abnormal')),
  quality_grade TEXT,                    -- 品质等级
  print_count INTEGER DEFAULT 0,
  pictures TEXT,                         -- JSON数组
  remarks TEXT,
  instance_id TEXT,                      -- 关联作物实例ID
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (source_id) REFERENCES seed_sources(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- 育苗每日记录
CREATE TABLE daily_records (
  id TEXT PRIMARY KEY,
  seedling_id TEXT NOT NULL,             -- 关联育苗ID
  record_date TEXT NOT NULL,             -- 记录日期
  temperature REAL,                      -- 温度
  humidity REAL,                         -- 湿度
  watering INTEGER DEFAULT 0,          -- 是否浇水（0/1）
  ph_value REAL,                         -- pH值
  ec_value REAL,                         -- EC值
  abnormality TEXT,                      -- 异常情况
  survival_count_change INTEGER DEFAULT 0, -- 成活数量变化
  planted_count_change INTEGER DEFAULT 0,  -- 定植数量变化
  loss_count_change INTEGER DEFAULT 0,     -- 损耗数量变化
  remarks TEXT,
  operator_id TEXT,                      -- 操作人员ID
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (seedling_id) REFERENCES seedlings(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 6. 种植管理
-- ============================================

CREATE TABLE plantings (
  id TEXT PRIMARY KEY,
  planting_code TEXT NOT NULL UNIQUE,    -- 种植批号
  source_type TEXT NOT NULL CHECK (source_type IN ('seed', 'seedling', 'cutting', 'grafting', 'tissue_culture', 'split', 'bulb', 'other')),
  source_id TEXT,                          -- 来源种源/育苗ID
  source_code TEXT,                        -- 来源编码（冗余）
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT NOT NULL,
  greenhouse_id TEXT,                    -- 种植温室ID
  area_id TEXT,                          -- 种植区域ID
  planting_count INTEGER DEFAULT 0,      -- 计划种植数量
  planting_date TEXT,                    -- 计划定植日期
  soil_ph REAL,                          -- 土壤pH
  soil_ec REAL,                          -- 土壤EC
  transplant_count INTEGER DEFAULT 0,      -- 实际定植数量
  transplant_date TEXT,                    -- 实际定植日期
  survival_count INTEGER DEFAULT 0,      -- 成活数量
  survival_rate REAL DEFAULT 0,        -- 成活率
  is_harvest INTEGER DEFAULT 0,        -- 是否已采收
  harvest_date TEXT,                     -- 实际采收日期
  expected_harvest_date TEXT,              -- 预计采收日期
  harvest_quantity INTEGER DEFAULT 0,    -- 采收数量
  attrition_rate REAL DEFAULT 0,       -- 损耗率
  traceability_code TEXT,                -- 溯源码
  print_count INTEGER DEFAULT 0,
  pictures TEXT,
  status TEXT DEFAULT 'planted' CHECK (status IN ('planted', 'growing', 'harvested', 'cancelled')),
  remarks TEXT,
  instance_id TEXT,                      -- 关联作物实例ID
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 7. 采收管理
-- ============================================

CREATE TABLE harvest_records (
  id TEXT PRIMARY KEY,
  harvest_code TEXT NOT NULL UNIQUE,     -- 采收编号
  planting_id TEXT,                      -- 关联种植记录ID（核心外键）
  batch_code TEXT,                       -- 批次编码（冗余）
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT,
  greenhouse_id TEXT,                    -- 采收温室
  harvest_date TEXT NOT NULL,            -- 采收日期
  harvest_area REAL DEFAULT 0,         -- 采收面积
  harvest_quantity REAL DEFAULT 0,       -- 采收数量
  unit TEXT DEFAULT '公斤',
  quality TEXT,                          -- 质量评价
  grade TEXT,                            -- 等级（A/B/C）
  harvester_ids TEXT,                    -- JSON数组：采收人员ID列表
  warehouse_id TEXT,                     -- 入库仓库ID
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'stored', 'graded', 'outbound')),
  auditor_id TEXT,                       -- 审核人ID
  target_yield REAL DEFAULT 0,         -- 目标产量
  related_task_id TEXT,                  -- 关联农事任务ID
  planting_mode TEXT,
  pictures TEXT,
  remarks TEXT,
  instance_id TEXT,                      -- 关联作物实例ID
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (auditor_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 8. 作物实例（核心追踪单元）
-- ============================================

CREATE TABLE crop_instances (
  id TEXT PRIMARY KEY,
  instance_code TEXT NOT NULL UNIQUE,    -- 实例编码
  order_id TEXT,                           -- 关联订单ID
  order_code TEXT,                         -- 关联订单编号（冗余）
  crop_category TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT NOT NULL,
  category_code TEXT,
  type_code TEXT,
  sub_code TEXT,
  source_origin TEXT,
  source_description TEXT,               -- 来源描述（种源批号等）
  source_instance_id TEXT,               -- 来源实例ID（分株繁殖时）
  initial_quantity INTEGER DEFAULT 0,      -- 初始数量
  current_quantity INTEGER DEFAULT 0,    -- 当前剩余数量
  planted_quantity INTEGER DEFAULT 0,    -- 已定植数量
  harvested_quantity INTEGER DEFAULT 0,    -- 已采收数量
  loss_quantity INTEGER DEFAULT 0,       -- 累计损耗数量
  fulfilled_quantity INTEGER DEFAULT 0,  -- 已交付数量
  status TEXT DEFAULT 'seedling' CHECK (status IN ('seedling', 'planted', 'growing', 'harvested', 'outbound', 'cancelled')),
  seed_entry_date TEXT,                  -- 种源入库日期
  seedling_start_date TEXT,              -- 育苗开始日期
  planting_date TEXT,                    -- 定植日期
  harvest_date TEXT,                     -- 采收日期
  current_location TEXT,               -- 当前位置（温室名）
  location_history TEXT,                 -- JSON数组：位置变更历史
  loss_records TEXT,                     -- JSON数组：损耗记录明细
  last_validation_time TEXT,             -- 上次溯源校验时间
  validation_errors TEXT,                -- JSON数组：校验错误
  print_count INTEGER DEFAULT 0,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_id) REFERENCES crop_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (source_instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 9. 订单管理
-- ============================================

CREATE TABLE crop_orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,       -- 订单编号：DD + 年月日 + 流水号
  order_type TEXT DEFAULT 'production' CHECK (order_type IN ('production', 'seed', 'research', 'other')),
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT,
  planned_quantity REAL DEFAULT 0,       -- 计划数量
  actual_quantity REAL DEFAULT 0,        -- 实际数量
  unit TEXT,
  unit_price REAL DEFAULT 0,           -- 单价
  total_amount REAL DEFAULT 0,         -- 总金额
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_production', 'harvesting', 'delivering', 'completed', 'cancelled')),
  customer_name TEXT,                    -- 客户名称
  customer_contact TEXT,                 -- 客户联系方式
  delivery_date TEXT,                    -- 交付日期
  delivery_address TEXT,                 -- 交付地址
  fulfill_mode TEXT DEFAULT 'mixed' CHECK (fulfill_mode IN ('stock_reserve', 'plan_driven', 'order_driven', 'mixed')),
  plan_id TEXT,                          -- 关联生产计划ID
  reserved_inventory_ids TEXT,           -- JSON数组：预留库存ID
  delivered_quantity REAL DEFAULT 0,     -- 已交付数量
  delivery_records TEXT,                 -- JSON数组：交付记录
  remarks TEXT,
  pictures TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (plan_id) REFERENCES production_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- 订单-实例关联表（多对多）
CREATE TABLE order_instances (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  assigned_quantity REAL DEFAULT 0,      -- 分配给此实例的数量
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_id) REFERENCES crop_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (instance_id) REFERENCES crop_instances(id) ON DELETE CASCADE,
  UNIQUE(order_id, instance_id)
);
```

### 2.4 库存与物料层

```sql
-- ============================================
-- 10. 产品库存
-- ============================================

CREATE TABLE produce_inventories (
  id TEXT PRIMARY KEY,
  product_code TEXT,                       -- 产品编码
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT,
  quantity REAL DEFAULT 0,               -- 库存数量
  unit TEXT DEFAULT '公斤',
  grade TEXT,                            -- 品质等级
  warehouse_id TEXT NOT NULL,              -- 所在仓库
  storage_location TEXT,                   -- 具体库位
  harvest_date TEXT,                       -- 采收日期
  storage_date TEXT,                       -- 入库日期
  expiration_date TEXT,                    -- 保质期
  batch_code TEXT,                         -- 批次号
  source_instance_id TEXT,                 -- 来源作物实例ID
  source_harvest_id TEXT,                  -- 来源采收记录ID
  reservation_status TEXT DEFAULT 'available' CHECK (reservation_status IN ('available', 'reserved', 'outbound')),
  reserved_for_order_id TEXT,              -- 预留给哪个订单
  alert_settings TEXT,                     -- JSON：预警设置
  inbound_records TEXT,                    -- JSON数组：入库记录
  outbound_records TEXT,                   -- JSON数组：出库记录
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_instance_id) REFERENCES crop_instances(id) ON DELETE SET NULL,
  FOREIGN KEY (source_harvest_id) REFERENCES harvest_records(id) ON DELETE SET NULL,
  FOREIGN KEY (reserved_for_order_id) REFERENCES crop_orders(id) ON DELETE SET NULL
);

-- ============================================
-- 11. 物料管理
-- ============================================

CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,                           -- 分类（肥料/农药/工具等）
  unit TEXT,
  supplier_id TEXT,                        -- 供应商
  stock_quantity REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,            -- 最低库存
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 物料领用记录
CREATE TABLE material_receiving_records (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_id TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  applicant_id TEXT,                       -- 申请人
  approver_id TEXT,                        -- 审批人
  use_purpose TEXT,                        -- 用途
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (applicant_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 物料归还记录
CREATE TABLE material_returns (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL,
  receiving_record_id TEXT,                -- 关联领用记录
  quantity REAL DEFAULT 0,
  return_date TEXT,
  returner_id TEXT,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (receiving_record_id) REFERENCES material_receiving_records(id) ON DELETE SET NULL,
  FOREIGN KEY (returner_id) REFERENCES staff(id) ON DELETE SET NULL
);
```

### 2.5 农事与生产计划层

```sql
-- ============================================
-- 12. 农事任务
-- ============================================

CREATE TABLE farm_tasks (
  id TEXT PRIMARY KEY,
  task_code TEXT NOT NULL UNIQUE,
  task_title TEXT NOT NULL,
  task_type TEXT,                        -- 灌溉/施肥/修剪/采收等
  task_content TEXT,
  assignee_id TEXT,                        -- 执行人
  greenhouse_id TEXT,                      -- 目标温室
  area_id TEXT,                          -- 目标区域
  plan_date TEXT,                        -- 计划日期
  plan_time TEXT,                        -- 计划时间
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completion_date TEXT,
  completion_note TEXT,
  planting_id TEXT,                        -- 关联种植记录
  related_materials TEXT,                -- JSON：所需物料
  required_feedback TEXT,                -- JSON：必填反馈
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 13. 巡查记录
-- ============================================

CREATE TABLE inspections (
  id TEXT PRIMARY KEY,
  record_code TEXT NOT NULL UNIQUE,
  inspection_type TEXT,
  inspector_id TEXT,                     -- 巡查人
  greenhouse_id TEXT,
  check_date TEXT,
  check_time TEXT,
  check_result TEXT,
  issue_severity TEXT,
  issue_text TEXT,
  images TEXT,                             -- JSON数组
  status TEXT DEFAULT 'pending',
  related_task_id TEXT,                  -- 关联整改任务
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (inspector_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (related_task_id) REFERENCES farm_tasks(id) ON DELETE SET NULL
);

-- ============================================
-- 14. 问题记录
-- ============================================

CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  problem_code TEXT NOT NULL UNIQUE,
  problem_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  greenhouse_id TEXT,
  reporter_id TEXT,                      -- 报告人
  assignee_id TEXT,                      -- 处理人
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  related_task_id TEXT,                  -- 关联任务
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (reporter_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (related_task_id) REFERENCES farm_tasks(id) ON DELETE SET NULL
);

-- ============================================
-- 15. 生产计划
-- ============================================

CREATE TABLE production_plans (
  id TEXT PRIMARY KEY,
  plan_code TEXT NOT NULL UNIQUE,
  plan_name TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,
  crop_code TEXT,
  planned_quantity REAL DEFAULT 0,       -- 计划产量
  planned_area REAL DEFAULT 0,           -- 计划面积
  start_date TEXT,                       -- 计划开始
  end_date TEXT,                         -- 计划结束
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled')),
  greenhouse_id TEXT,
  area_id TEXT,
  order_id TEXT,                         -- 关联订单
  remarks TEXT,
  create_by TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (crop_code) REFERENCES crop_varieties(crop_code) ON DELETE RESTRICT,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES crop_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (create_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- 日计划
CREATE TABLE daily_plans (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,                   -- 关联生产计划
  plan_date TEXT NOT NULL,                 -- 日期
  task_type TEXT,                          -- 任务类型
  task_content TEXT,
  greenhouse_id TEXT,
  area_id TEXT,
  assignee_id TEXT,
  status TEXT DEFAULT 'pending',
  completion_note TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (plan_id) REFERENCES production_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES plant_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE SET NULL
);
```

### 2.6 人工管理与审批层

```sql
-- ============================================
-- 16. 人工记录（工时）
-- ============================================

CREATE TABLE labor_records (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,               -- 工人ID
  work_type TEXT,                        -- 工作类型
  work_date TEXT,                        -- 工作日期
  work_hours REAL DEFAULT 0,           -- 工时
  hourly_rate REAL DEFAULT 0,          -- 时薪
  total_amount REAL DEFAULT 0,         -- 总金额
  greenhouse_id TEXT,                  -- 工作温室
  task_description TEXT,                 -- 任务描述
  related_task_id TEXT,                -- 关联农事任务
  status TEXT DEFAULT 'pending',
  remarks TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (worker_id) REFERENCES staff(id) ON DELETE RESTRICT,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL,
  FOREIGN KEY (related_task_id) REFERENCES farm_tasks(id) ON DELETE SET NULL
);

-- ============================================
-- 17. 考勤
-- ============================================

CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in TEXT,                         -- 上班时间
  check_out TEXT,                        -- 下班时间
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'late', 'early_leave', 'absent', 'on_leave', 'overtime')),
  work_hours REAL DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  remarks TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE(employee_id, date)
);

-- 考勤补卡
CREATE TABLE attendance_repairs (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'check_in' CHECK (type IN ('check_in', 'check_out')),
  reason TEXT,
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 18. 请假
-- ============================================

CREATE TABLE leave_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,              -- 事假/病假/年假等
  start_date TEXT,
  end_date TEXT,
  days REAL DEFAULT 0,
  reason TEXT,
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 19. 加班
-- ============================================

CREATE TABLE overtime_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date TEXT,
  hours REAL DEFAULT 0,
  reason TEXT,
  compensatory_type TEXT DEFAULT 'pay',  -- 调休/发薪
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 20. 招聘
-- ============================================

CREATE TABLE recruitment_records (
  id TEXT PRIMARY KEY,
  position_id TEXT,
  department_id TEXT,
  headcount INTEGER DEFAULT 1,
  requirements TEXT,
  status TEXT DEFAULT 'open',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ============================================
-- 21. 合同
-- ============================================

CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  contract_type TEXT,                    -- 全职/兼职/实习
  start_date TEXT,
  end_date TEXT,
  salary REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- ============================================
-- 22. 入职
-- ============================================

CREATE TABLE onboardings (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  join_date TEXT,
  mentor_id TEXT,                        -- 导师
  training_status TEXT DEFAULT 'in_progress',
  status TEXT DEFAULT 'active',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 23. 离职
-- ============================================

CREATE TABLE resignations (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  resign_date TEXT,
  reason TEXT,
  handover_status TEXT DEFAULT 'pending',
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 24. 调薪
-- ============================================

CREATE TABLE salary_adjustments (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  old_salary REAL DEFAULT 0,
  new_salary REAL DEFAULT 0,
  adjustment_type TEXT,                  -- 晋升/普调/绩效
  effective_date TEXT,
  reason TEXT,
  approver_id TEXT,
  status TEXT DEFAULT 'pending',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- ============================================
-- 25. 薪资预算
-- ============================================

CREATE TABLE salary_budgets (
  id TEXT PRIMARY KEY,
  year INTEGER,
  month INTEGER,
  department_id TEXT,
  budget_amount REAL DEFAULT 0,
  actual_amount REAL DEFAULT 0,
  variance REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ============================================
-- 26. 任务中心（人工任务分派）
-- ============================================

CREATE TABLE task_center_records (
  id TEXT PRIMARY KEY,
  task_code TEXT NOT NULL UNIQUE,
  task_title TEXT NOT NULL,
  task_type TEXT,
  assignee_id TEXT,                      -- 执行人
  assigner_id TEXT,                      -- 分派人
  greenhouse_id TEXT,
  plan_date TEXT,
  due_date TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  completion_note TEXT,
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (assigner_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id) ON DELETE SET NULL
);

-- ============================================
-- 27. 审批中心
-- ============================================

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,                    -- 请假/调薪/采购/领用等
  title TEXT NOT NULL,
  applicant_id TEXT NOT NULL,            -- 申请人
  approver_id TEXT,                      -- 审批人
  cc_ids TEXT,                           -- JSON数组：抄送人
  content TEXT,                          -- 申请内容（JSON）
  attachments TEXT,                        -- JSON数组：附件
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  result TEXT,                           -- 审批结果说明
  apply_date TEXT,
  approve_date TEXT,
  related_record_type TEXT,              -- 关联记录类型
  related_record_id TEXT,                -- 关联记录ID
  create_time TEXT DEFAULT (datetime('now', 'localtime')),
  update_time TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (applicant_id) REFERENCES staff(id) ON DELETE RESTRICT,
  FOREIGN KEY (approver_id) REFERENCES staff(id) ON DELETE SET NULL
);
```

---

## 三、字段映射对照表

### 3.1 前端 → 后端命名映射

| 前端字段（驼峰） | 后端字段（下划线） | 说明 |
|-----------------|-------------------|------|
| `id` | `id` | 统一 |
| `seedCode` | `seed_code` | 种源批号 |
| `sourceType` | `source_type` | 种源类型 |
| `sourceOrigin` | `source_origin` | 来源途径 |
| `cropCategory` | `crop_category` | 作物类别 |
| `typeName` | `type_name` | 类型名称 |
| `varietyName` | `variety_name` | 品种名称 |
| `cropName` | `crop_name` | 作物名称 |
| `cropVariety` | `crop_variety` | 作物品种 |
| `cropCode` | `crop_code` | 作物编码 |
| `supplierId` | `supplier_id` | 供应商ID |
| `supplierName` | `supplier_name` | 供应商名称 |
| `purchaseDate` | `purchase_date` | 采购日期 |
| `unitPrice` | `unit_price` | 单价 |
| `totalAmount` | `total_amount` | 总金额 |
| `initialCount` | `initial_count` | 初始数量 |
| `availableCount` | `available_count` | 可用数量 |
| `createBy` | `create_by` | 创建人 |
| `createTime` | `create_time` | 创建时间 |
| `updateTime` | `update_time` | 更新时间 |
| `seedlingCode` | `seedling_code` | 育苗批号 |
| `sourceId` | `source_id` | 来源ID |
| `sourceCode` | `source_code` | 来源编码（冗余） |
| `seedlingType` | `seedling_type` | 育苗类型 |
| `siteId` | `greenhouse_id` | 育苗场所ID |
| `siteName` | （去掉） | 改为查询 greenhouse 表 |
| `startDate` | `start_date` | 开始日期 |
| `endDate` | `end_date` | 结束日期 |
| `initialCount` | `initial_count` | 初始数量 |
| `survivalCount` | `survival_count` | 成活数量 |
| `plantedCount` | `planted_count` | 已定植数量 |
| `survivalRate` | `survival_rate` | 成活率 |
| `lossCount` | `loss_count` | 损耗数量 |
| `lossRate` | `loss_rate` | 损耗率 |
| `isFinished` | `is_finished` | 是否完成（0/1） |
| `dailyRecords` | （拆分） | 拆分到 daily_records 表 |
| `plantCode` | `planting_code` | 种植批号 |
| `plantingCount` | `planting_count` | 计划种植数量 |
| `plantingDate` | `planting_date` | 种植日期 |
| `soilPH` | `soil_ph` | 土壤pH |
| `soilEC` | `soil_ec` | 土壤EC |
| `transplantCount` | `transplant_count` | 定植数量 |
| `transplantDate` | `transplant_date` | 定植日期 |
| `isHarvest` | `is_harvest` | 是否采收（0/1） |
| `harvestDate` | `harvest_date` | 采收日期 |
| `attritionRate` | `attrition_rate` | 损耗率 |
| `traceabilityCode` | `traceability_code` | 溯源码 |
| `harvestCode` | `harvest_code` | 采收编号 |
| `batchId` | `planting_id` | 关联种植ID |
| `batchCode` | `batch_code` | 批次编码 |
| `greenhouseId` | `greenhouse_id` | 温室ID |
| `greenhouseName` | （去掉） | 改为查询 greenhouses 表 |
| `harvestArea` | `harvest_area` | 采收面积 |
| `harvestQuantity` | `harvest_quantity` | 采收数量 |
| `harvesterIds` | `harvester_ids` | 采收人员ID（JSON数组） |
| `harvesterNames` | （去掉） | 通过ID查询staff表 |
| `warehouseId` | `warehouse_id` | 仓库ID |
| `warehouseName` | （去掉） | 改为查询 warehouses 表 |
| `auditor` | `auditor_id` | 审核人ID（原来是字符串） |
| `instanceCode` | `instance_code` | 实例编码 |
| `orderId` | `order_id` | 订单ID |
| `orderCode` | `order_code` | 订单编号 |
| `initialQuantity` | `initial_quantity` | 初始数量 |
| `currentQuantity` | `current_quantity` | 当前数量 |
| `plantedQuantity` | `planted_quantity` | 已定植数量 |
| `harvestedQuantity` | `harvested_quantity` | 已采收数量 |
| `orderCode` | `order_code` | 订单编号 |
| `orderType` | `order_type` | 订单类型 |
| `plannedQuantity` | `planned_quantity` | 计划数量 |
| `actualQuantity` | `actual_quantity` | 实际数量 |
| `customerName` | `customer_name` | 客户名称 |
| `deliveryDate` | `delivery_date` | 交付日期 |
| `instanceIds` | （拆分到 order_instances 表） | 多对多关联 |

### 3.2 关键字段变更说明

**1. `createBy` 从字符串 → 外键关联**

```
旧：createBy: '李明辉'（字符串，人员改名后所有历史记录失效）
新：create_by: 'ST001'（staff.id 外键，人员改名不影响历史记录）
```

**2. `siteName` / `greenhouseName` / `areaName` 从字符串 → 外键查询**

```
旧：siteName: '育苗温室A区'（字符串，温室改名后所有记录失效）
新：greenhouse_id: 'GH001'（查询 greenhouses 表获取当前名称）
```

**3. `harvesterNames` 从字符串数组 → 外键数组**

```
旧：harvesterNames: ['张三', '李四']（字符串，人员改名后失效）
新：harvester_ids: '["ST001", "ST002"]'（JSON数组，查询 staff 表）
```

**4. `dailyRecords` 从嵌套数组 → 独立表**

```
旧：seedlings.dailyRecords = [{...}, {...}]（嵌在育苗记录里）
新：daily_records 表，seedling_id 外键关联
```

**5. `instanceIds` 从数组 → 关联表**

```
旧：cropOrders.instanceIds = ['CI001', 'CI002']（数组）
新：order_instances 关联表（多对多）
```

---

## 四、数据关联关系设计

### 4.1 核心关联图谱

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          数据关联总览                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   系统设置层（基础数据）                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│   │company_  │  │green-    │  │plant_    │  │depart-   │                │
│   │groups    │──│houses    │──│areas     │  │ments     │                │
│   └──────────┘  └──────────┘  └──────────┘  └────┬─────┘                │
│                                                  │                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐      │                      │
│   │suppliers │  │warehouses│  │positions │──────┘                      │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘                             │
│        │             │             │                                    │
│        └─────────────┴─────────────┘                                    │
│                      │                                                  │
│                      ▼                                                  │
│               ┌──────────┐                                            │
│               │  staff   │ ◄──── 所有 "create_by" / "assignee_id"      │
│               └────┬─────┘      / "worker_id" / "auditor_id"          │
│                    │                                                    │
│   作物管理核心层    │                                                    │
│   ┌──────────┐     │                                                    │
│   │crop_     │     │                                                    │
│   │varieties │◄────┤  crop_code 关联                                    │
│   └────┬─────┘     │                                                    │
│        │           │                                                    │
│   ┌────┴────┐      │                                                    │
│   │seed_    │◄─────┤  create_by, supplier_id                             │
│   │sources  │─────►│  instance_id                                        │
│   └────┬────┘      │                                                    │
│        │source_id  │                                                    │
│   ┌────┴────┐      │                                                    │
│   │seedlings│◄─────┤  create_by, greenhouse_id, area_id                  │
│   │         │─────►│  instance_id                                        │
│   └────┬────┘      │                                                    │
│        │source_id  │                                                    │
│   ┌────┴────┐      │                                                    │
│   │plantings│◄─────┤  create_by, greenhouse_id, area_id                  │
│   │         │─────►│  instance_id                                        │
│   └────┬────┘      │                                                    │
│        │planting_id│                                                    │
│   ┌────┴─────────┐│                                                    │
│   │harvest_records│◄┤  harvester_ids, warehouse_id, auditor_id            │
│   │               ││  instance_id                                        │
│   └────┬─────────┘│                                                    │
│        │           │                                                    │
│   ┌────┴─────────┐│                                                    │
│   │crop_instances│◄┤  order_id, source_instance_id, create_by           │
│   │              ││                                                    │
│   └────┬─────────┘│                                                    │
│        │           │                                                    │
│   ┌────┴─────────┐│                                                    │
│   │crop_orders   │◄┤  create_by                                         │
│   │              ││                                                    │
│   └──────────────┘│                                                    │
│        │           │                                                    │
│   ┌────┴─────────┐│                                                    │
│   │order_instances│  多对多关联表                                       │
│   └───────────────┘                                                    │
│        │                                                                │
│   ┌────┴─────────┐                                                     │
│   │produce_      │◄── warehouse_id, source_instance_id                │
│   │inventories   │                                                       │
│   └──────────────┘                                                     │
│                                                                         │
│   农事与计划层                                                           │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                           │
│   │farm_tasks│  │inspection│  │problems  │                              │
│   │          │  │s         │  │          │                              │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘                              │
│        │             │             │                                    │
│        └─────────────┴─────────────┘                                    │
│                      │                                                  │
│                      ▼                                                  │
│   ┌──────────────────────────────┐                                     │
│   │production_plans / daily_plans│                                      │
│   └──────────────────────────────┘                                     │
│                                                                         │
│   人工管理层                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│   │labor_    │  │attendance│  │leave_    │  │overtime_ │              │
│   │records   │  │_records  │  │records   │  │records   │              │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│   │recruit-  │  │contracts │  │onboard-  │  │resign-   │  │salary_   │ │
│   │ments     │  │          │  │ings      │  │ations    │  │adjust-   │ │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ments     │ │
│                                                           └──────────┘ │
│   ┌──────────┐  ┌──────────┐                                           │
│   │salary_   │  │task_     │                                           │
│   │budgets   │  │center_   │                                           │
│   │          │  │records  │                                           │
│   └──────────┘  └──────────┘                                           │
│                                                                         │
│   审批层                                                                 │
│   ┌──────────┐                                                         │
│   │approvals │                                                         │
│   └──────────┘                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 关键关联规则

#### 规则1：种源 → 育苗 → 种植 → 采收（正向生产流）

```
seed_sources.id ──source_id──► seedlings.source_id
    │
    ├─► 采购供应商：supplier_id → suppliers.id
    ├─► 创建人：create_by → staff.id
    ├─► 作物品种：crop_code → crop_varieties.crop_code
    └─► 生成实例：instance_id → crop_instances.id

seedlings.id ──source_id──► plantings.source_id（当来源是育苗时）
    │
    ├─► 来源种源：source_id → seed_sources.id
    ├─► 育苗场所：greenhouse_id → greenhouses.id
    ├─► 育苗区域：area_id → plant_areas.id
    ├─► 创建人：create_by → staff.id
    └─► 生成实例：instance_id → crop_instances.id

plantings.id ──planting_id──► harvest_records.planting_id
    │
    ├─► 来源种源/育苗：source_id（如果是种子直接种，指向 seed_sources）
    ├─► 种植场所：greenhouse_id → greenhouses.id
    ├─► 种植区域：area_id → plant_areas.id
    ├─► 创建人：create_by → staff.id
    └─► 生成实例：instance_id → crop_instances.id

harvest_records.id ──source_harvest_id──► produce_inventories.source_harvest_id
    │
    ├─► 关联种植：planting_id → plantings.id
    ├─► 采收温室：greenhouse_id → greenhouses.id
    ├─► 入库仓库：warehouse_id → warehouses.id
    ├─► 采收人员：harvester_ids → [staff.id, staff.id]
    ├─► 审核人：auditor_id → staff.id
    └─► 来源实例：instance_id → crop_instances.id
```

#### 规则2：实例 ↔ 全链路（双向追溯）

```
crop_instances.id
    │
    ├─► 关联订单：order_id → crop_orders.id（可选）
    ├─► 来源实例：source_instance_id → crop_instances.id（分株繁殖时）
    ├─► 被种源引用：seed_sources.instance_id（种源生成的实例）
    ├─► 被育苗引用：seedlings.instance_id
    ├─► 被种植引用：plantings.instance_id
    ├─► 被采收引用：harvest_records.instance_id
    ├─► 被库存引用：produce_inventories.source_instance_id
    └─► 创建人：create_by → staff.id
```

#### 规则3：订单 ↔ 库存 ↔ 实例（履约流）

```
crop_orders.id
    │
    ├─► 关联实例：通过 order_instances 表（多对多）
    ├─► 关联计划：plan_id → production_plans.id
    ├─► 预留库存：reserved_inventory_ids → [produce_inventories.id]
    ├─► 交付追踪：delivery_records（JSON数组，含交付时间/数量/签收人）
    ├─► 创建人：create_by → staff.id
    └─► 客户信息：customer_name（暂时自由文本，未来可关联客户表）

produce_inventories.id
    │
    ├─► 来源实例：source_instance_id → crop_instances.id
    ├─► 来源采收：source_harvest_id → harvest_records.id
    ├─► 所在仓库：warehouse_id → warehouses.id
    └─► 预留订单：reserved_for_order_id → crop_orders.id
```

#### 规则4：系统设置 → 所有业务模块（驱动流）

```
staff.id
    │
    ├─► 种源创建人：seed_sources.create_by
    ├─► 育苗创建人：seedlings.create_by
    ├─► 种植创建人：plantings.create_by
    ├─► 采收创建人：harvest_records.create_by
    ├─► 订单创建人：crop_orders.create_by
    ├─► 农事执行人：farm_tasks.assignee_id
    ├─► 巡查人：inspections.inspector_id
    ├─► 问题报告人：problems.reporter_id
    ├─► 采收人员：harvest_records.harvester_ids
    ├─► 审核人：harvest_records.auditor_id
    ├─► 物料申请人：material_receiving_records.applicant_id
    ├─► 考勤/请假/加班：所有人工管理表
    └─► 审批申请人/审批人：approvals.applicant_id / approver_id

greenhouses.id
    │
    ├─► 育苗场所：seedlings.greenhouse_id
    ├─► 种植场所：plantings.greenhouse_id
    ├─► 采收场所：harvest_records.greenhouse_id
    ├─► 农事任务：farm_tasks.greenhouse_id
    ├─► 巡查：inspections.greenhouse_id
    ├─► 问题：problems.greenhouse_id
    ├─► 人工任务：task_center_records.greenhouse_id
    └─► 库存：produce_inventories（通过 warehouse，warehouse 可关联 greenhouse）

departments.id
    │
    ├─► 部门人员：staff.department_id
    ├─► 职位归属：positions.department_id
    ├─► 招聘需求：recruitment_records.department_id
    ├─► 薪资预算：salary_budgets.department_id
    └─► 部门负责人：departments.manager_id → staff.id

suppliers.id
    │
    ├─► 种源采购：seed_sources.supplier_id
    ├─► 物料供应：materials.supplier_id
    └─► 供应商类型可区分：种子商/设备商/肥料商

warehouses.id
    │
    ├─► 采收入库：harvest_records.warehouse_id
    ├─► 产品库存：produce_inventories.warehouse_id
    ├─► 仓库负责人：warehouses.manager_id → staff.id
    └─► 物料库存：materials（如果扩展物料库存管理）
```

---

## 五、系统设置模块重构方案

### 5.1 重构目标

**从「硬编码展示」→「可持久化配置+驱动业务流」**

```
重构前：
┌─────────────┐
│ 部门设置     │ → departments[] 硬编码数组，刷新恢复默认值
│ 基地管理     │ → 无数据层，页面硬编码
│ 人员管理     │ → 无数据层，页面硬编码
│ 仓库管理     │ → 无数据层，选择框硬编码
└─────────────┘

重构后：
┌─────────────┐     ┌─────────────────────────────────────────┐
│ 部门设置     │────►│ departments 表                        │
│ 基地管理     │────►│ company_groups + greenhouses + plant_areas 表 │
│ 人员管理     │────►│ staff + positions 表                    │
│ 仓库管理     │────►│ warehouses 表                         │
│ 供应商管理   │────►│ suppliers 表                          │
│ 品种库管理   │────►│ crop_varieties 表                     │
└─────────────┘     └─────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ 所有业务模块下拉选择   │
                    │ 不再自由输入，选择即可 │
                    └─────────────────────┘
```

### 5.2 各设置模块的功能升级

#### 部门设置（Department Management）

**当前**：硬编码数组，不可编辑

**升级后**：
- CRUD 操作：增删改查部门
- 树形结构：支持多级部门（parent_id 自关联）
- 人员统计：自动计算部门人数（关联 staff 表 COUNT）
- 负责人指派：manager_id 下拉选择人员

**驱动业务**：
- 种源采购审批 → 按部门权限
- 人员归属 → 所有业务记录的 create_by 关联
- 薪资预算 → 按部门维度

#### 基地/温室/区域设置（Base & Greenhouse Management）

**当前**：无独立数据层，`areaName` 是字符串如"一棚 > 01区"

**升级后**：
- 三级结构：公司 → 基地 → 温室 → 区域
- 面积管理：每个温室/区域记录面积
- 状态管理：运营中/维修中/停用
- 负责人：manager_id 关联 staff

**驱动业务**：
- 种植选址 → 下拉选择温室+区域（而不是字符串输入）
- 育苗场所 → 同上
- 采收归属 → 自动关联温室
- 农事任务 → 自动带出温室信息

#### 人员设置（Staff Management）

**当前**：无独立数据层，`createBy` 是自由输入字符串

**升级后**：
- 完整档案：姓名/工号/部门/职位/电话/身份证/入职日期
- 状态管理：在职/离职/请假/停用
- 照片：头像/证件照

**驱动业务**：
- 所有 `create_by` → 下拉选择人员（不再是自由输入）
- 采收人员 → 多选人员（通过 staff.id 数组）
- 任务分派 → 选择执行人
- 考勤/请假/加班 → 自动关联人员

#### 仓库设置（Warehouse Management）

**当前**：无独立数据层，`warehouseName` 硬编码

**升级后**：
- CRUD 操作
- 类型区分：常温库/冷库/种子库/工具库
- 库位管理：支持库位编码
- 负责人：manager_id

**驱动业务**：
- 采收入库 → 下拉选择仓库
- 库存查询 → 按仓库筛选
- 出库操作 → 从指定仓库扣减

#### 供应商设置（Supplier Management）

**当前**：后端有表，前端可能也有

**升级后**：
- 类型细分：种子商/设备商/肥料商/农药商
- 资质管理：营业执照/资质证书附件
- 评级：A/B/C 级供应商

**驱动业务**：
- 种源采购 → 下拉选择供应商
- 物料采购 → 关联供应商
- 采购统计 → 按供应商分析

### 5.3 设置数据初始化建议

系统首次启动时，应预置基础数据：

```sql
-- 预置部门
INSERT INTO departments (id, code, name, parent_id, status) VALUES
('DE001', 'D001', '管理层', NULL, 'active'),
('DE002', 'D002', '技术部', 'DE001', 'active'),
('DE003', 'D003', '生产部', 'DE001', 'active'),
('DE004', 'D004', '后勤部', 'DE001', 'active'),
('DE005', 'D005', '财务部', 'DE001', 'active');

-- 预置职位
INSERT INTO positions (id, code, name, department_id, status) VALUES
('PO001', 'P001', '总经理', 'DE001', 'active'),
('PO002', 'P002', '技术主管', 'DE002', 'active'),
('PO003', 'P003', '生产主管', 'DE003', 'active'),
('PO004', 'P004', '仓库管理员', 'DE004', 'active');

-- 预置人员
INSERT INTO staff (id, code, name, department_id, position_id, status) VALUES
('ST001', 'E001', '陆启闯', 'DE003', 'PO003', 'active'),
('ST002', 'E002', '李明辉', 'DE003', 'PO003', 'active'),
('ST003', 'E003', '王建国', 'DE003', 'PO003', 'active'),
('ST004', 'E004', '张三', 'DE003', NULL, 'active'),
('ST005', 'E005', '李四', 'DE003', NULL, 'active');

-- 预置基地
INSERT INTO company_groups (id, code, name, status) VALUES
('CG001', 'B001', '原形图农业基地', 'active');

-- 预置温室
INSERT INTO greenhouses (id, code, name, company_id, type, status) VALUES
('GH001', 'G001', '1号大棚', 'CG001', 'glass', 'active'),
('GH002', 'G002', '2号大棚', 'CG001', 'solar', 'active'),
('GH003', 'G003', '育苗温室A区', 'CG001', 'glass', 'active'),
('GH004', 'G004', '育苗温室B区', 'CG001', 'glass', 'active');

-- 预置区域
INSERT INTO plant_areas (id, code, name, greenhouse_id, status) VALUES
('PA001', 'A001', '01区', 'GH001', 'active'),
('PA002', 'A002', '02区', 'GH001', 'active'),
('PA003', 'A003', '01区', 'GH002', 'active');

-- 预置仓库
INSERT INTO warehouses (id, code, name, type, status) VALUES
('WH001', 'W001', '主仓库', 'general', 'active'),
('WH002', 'W002', '冷库', 'cold', 'active');

-- 预置供应商
INSERT INTO suppliers (id, supplier_code, supplier_name, supplier_type, status) VALUES
('SUP001', 'SUP001', '金色稻种有限公司', 'seed', 'active'),
('SUP002', 'SUP002', '丰收种业公司', 'seed', 'active');
```

---

## 六、数据迁移脚本设计

### 6.1 迁移总流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     数据迁移流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: 导出 LocalStorage 数据                                  │
│  ├─ 遍历所有 localStorage key                                    │
│  ├─ 导出 JSON 文件备份                                           │
│  └─ 验证数据完整性                                               │
│                                                                  │
│  Step 2: 初始化 SQLite 基础数据                                  │
│  ├─ 创建所有表（含外键约束）                                     │
│  ├─ 插入系统设置预置数据（部门/人员/温室/仓库/供应商）            │
│  └─ 验证表结构                                                   │
│                                                                  │
│  Step 3: 迁移品种库                                              │
│  ├─ 从 produceCodeRule 导入默认品种                              │
│  └─ 如果 localStorage 有自定义品种，合并导入                      │
│                                                                  │
│  Step 4: 迁移种源数据                                            │
│  ├─ 字段映射（驼峰→下划线）                                      │
│  ├─ 外键转换（supplierName → supplier_id）                       │
│  ├─ createBy → create_by（字符串→staff.id）                     │
│  └─ 写入 seed_sources 表                                         │
│                                                                  │
│  Step 5: 迁移育苗数据                                            │
│  ├─ 字段映射                                                      │
│  ├─ sourceId 校验（是否存在于 seed_sources）                     │
│  ├─ siteName → greenhouse_id（匹配 greenhouses.name）            │
│  ├─ dailyRecords 拆分到 daily_records 表                        │
│  └─ 写入 seedlings + daily_records                               │
│                                                                  │
│  Step 6: 迁移种植数据                                            │
│  ├─ 字段映射                                                      │
│  ├─ sourceId 校验（指向 seed_sources 或 seedlings）              │
│  ├─ areaName → greenhouse_id + area_id（拆分字符串）              │
│  └─ 写入 plantings                                               │
│                                                                  │
│  Step 7: 迁移采收数据                                            │
│  ├─ 字段映射                                                      │
│  ├─ batchCode → planting_id（匹配 plantings.planting_code）      │
│  ├─ harvesterNames → harvester_ids（匹配 staff.name）            │
│  ├─ warehouseName → warehouse_id（匹配 warehouses.name）         │
│  └─ 写入 harvest_records                                        │
│                                                                  │
│  Step 8: 迁移订单数据                                            │
│  ├─ 字段映射                                                      │
│  ├─ instanceIds → order_instances 关联表                          │
│  └─ 写入 crop_orders + order_instances                          │
│                                                                  │
│  Step 9: 生成/迁移实例数据                                        │
│  ├─ 为所有种源/育苗/种植生成实例（如果没有）                      │
│  ├─ 更新各表的 instance_id                                      │
│  └─ 写入 crop_instances                                         │
│                                                                  │
│  Step 10: 验证与校验                                             │
│  ├─ 外键完整性检查（所有外键指向的ID都存在）                    │
│  ├─ 数量守恒校验（实例数量 = 已定植 + 已采收 + 当前剩余）        │
│  ├─ 溯源链校验（育苗成活 ≥ 定植数量）                           │
│  └─ 生成校验报告                                                 │
│                                                                  │
│  Step 11: 前端切换                                               │
│  ├─ 修改所有 import 路径（走统一入口）                          │
│  ├─ 设置 VITE_STORAGE_MODE=api                                  │
│  ├─ 配置 vite.config proxy                                       │
│  └─ 验证 API 连通性                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 关键迁移逻辑详解

#### 迁移逻辑A：供应商名称 → 供应商ID

```typescript
// 伪代码
function migrateSeedSources(localData) {
  return localData.map(source => {
    // 1. 查找供应商ID
    const supplier = db.suppliers.find(s => s.supplier_name === source.supplierName);
    const supplierId = supplier ? supplier.id : null;
    
    // 2. 查找创建人ID
    const creator = db.staff.find(s => s.name === source.createBy);
    const createBy = creator ? creator.id : null;
    
    // 3. 字段映射
    return {
      id: source.id,
      seed_code: source.seedCode,
      source_type: source.sourceType,
      source_origin: source.sourceOrigin,
      crop_category: source.cropCategory,
      type_name: source.typeName,
      variety_name: source.varietyName,
      crop_name: source.cropName,
      crop_variety: source.cropVariety,
      crop_code: source.cropCode,
      supplier_id: supplierId,
      purchase_date: source.purchaseDate,
      quantity: source.quantity,
      unit: source.unit,
      unit_price: source.unitPrice,
      total_amount: source.totalAmount,
      initial_count: source.initialCount,
      available_count: source.availableCount,
      pictures: JSON.stringify(source.pictures),
      remarks: source.remarks,
      status: source.status,
      traceability_code: source.traceabilityCode,
      print_count: source.printCount,
      create_by: createBy,
      create_time: source.createTime,
      update_time: source.updateTime,
    };
  });
}
```

#### 迁移逻辑B：场地名称 → 温室ID+区域ID

```typescript
// 当前数据：areaName = "一棚 > 01区"
// 目标：greenhouse_id + area_id

function parseAreaName(areaName) {
  const parts = areaName.split('>');
  const greenhouseName = parts[0].trim(); // "一棚"
  const areaName = parts[1]?.trim();        // "01区"
  
  // 匹配温室（需要先把"一棚"映射到 greenhouses 表）
  const greenhouse = db.greenhouses.find(g => g.name === greenhouseName || g.name.includes(greenhouseName));
  
  if (areaName && greenhouse) {
    const area = db.plant_areas.find(a => 
      a.name === areaName && a.greenhouse_id === greenhouse.id
    );
    return { greenhouse_id: greenhouse?.id, area_id: area?.id };
  }
  
  return { greenhouse_id: greenhouse?.id, area_id: null };
}
```

**问题**：当前 `areaName` 是字符串拼接，没有标准化。迁移时需要：
1. 先建立温室/区域的标准化命名
2. 在迁移脚本中做模糊匹配
3. 无法匹配的记录标记为 "待手动关联"

#### 迁移逻辑C：人员名称 → 人员ID

```typescript
// 当前：harvesterNames = ['张三', '李四']
// 目标：harvester_ids = ['ST004', 'ST005']

function mapNamesToIds(names) {
  const ids = names.map(name => {
    const person = db.staff.find(s => s.name === name);
    return person ? person.id : null;
  }).filter(Boolean);
  return JSON.stringify(ids);
}
```

**问题**：如果人员不在 staff 表中（比如临时工），需要：
1. 自动创建临时工记录（标记为临时工类型）
2. 或标记为 "未知人员" 保留原名字符串

#### 迁移逻辑D：拆分子表（dailyRecords）

```typescript
// 当前：seedlings.dailyRecords = [{id, seedlingId, recordDate, ...}]
// 目标：拆分到 daily_records 表

function splitDailyRecords(seedlings) {
  const dailyRecords = [];
  
  seedlings.forEach(seedling => {
    if (seedling.dailyRecords) {
      seedling.dailyRecords.forEach(record => {
        dailyRecords.push({
          id: record.id,
          seedling_id: seedling.id,  // 关联父记录
          record_date: record.recordDate,
          temperature: record.temperature,
          humidity: record.humidity,
          watering: record.watering ? 1 : 0,
          ph_value: record.phValue,
          ec_value: record.ecValue,
          abnormality: record.abnormality,
          survival_count_change: record.survivalCountChange,
          planted_count_change: record.plantedCountChange,
          loss_count_change: record.lossCountChange,
          remarks: record.remarks,
          operator_id: mapNameToId(record.operator), // 操作人员
        });
      });
    }
  });
  
  return dailyRecords;
}
```

#### 迁移逻辑E：实例生成

```typescript
// 为没有实例的种源/育苗/种植生成实例

function generateMissingInstances() {
  const instances = [];
  
  // 为种源生成实例
  seedSources.forEach(source => {
    if (!source.instance_id) {
      const instance = {
        id: 'CI' + Date.now() + Math.random().toString(36).substr(2, 5),
        instance_code: generateInstanceCode(source.cropName),
        crop_name: source.cropName,
        crop_variety: source.cropVariety,
        crop_code: source.cropCode,
        source_origin: source.sourceOrigin,
        source_description: source.seedCode,
        initial_quantity: source.initialCount,
        current_quantity: source.availableCount,
        status: 'seedling',
        seed_entry_date: source.purchaseDate,
        create_by: source.create_by,
        create_time: source.createTime,
      };
      instances.push(instance);
      
      // 回写种源的 instance_id
      source.instance_id = instance.id;
    }
  });
  
  // 为育苗生成实例（如果没有）
  // ...
  
  return instances;
}
```

### 6.3 迁移校验规则

```typescript
// 校验1：外键完整性
function validateForeignKeys() {
  const errors = [];
  
  // 检查所有 seed_sources.supplier_id 在 suppliers 中存在
  const orphanSuppliers = db.query(`
    SELECT id FROM seed_sources 
    WHERE supplier_id IS NOT NULL 
    AND supplier_id NOT IN (SELECT id FROM suppliers)
  `);
  if (orphanSuppliers.length > 0) {
    errors.push(`种源表有 ${orphanSuppliers.length} 条记录引用了不存在的供应商`);
  }
  
  // 检查所有 seedlings.source_id 在 seed_sources 中存在
  const orphanSources = db.query(`
    SELECT id FROM seedlings 
    WHERE source_id IS NOT NULL 
    AND source_id NOT IN (SELECT id FROM seed_sources)
  `);
  if (orphanSources.length > 0) {
    errors.push(`育苗表有 ${orphanSources.length} 条记录引用了不存在的种源`);
  }
  
  // 检查所有 plantings.source_id 存在
  // 检查所有 harvest_records.planting_id 存在
  // ...
  
  return errors;
}

// 校验2：数量守恒
function validateQuantityConservation() {
  const errors = [];
  
  const instances = db.query('SELECT * FROM crop_instances');
  instances.forEach(inst => {
    const expected = inst.initial_quantity 
      - inst.planted_quantity 
      - inst.harvested_quantity 
      - inst.loss_quantity;
    
    if (inst.current_quantity !== expected) {
      errors.push(`实例 ${inst.instance_code} 数量不守恒：当前${inst.current_quantity} ≠ 预期${expected}`);
    }
  });
  
  return errors;
}

// 校验3：育苗→种植数量逻辑
function validateSeedlingToPlanting() {
  const errors = [];
  
  const seedlings = db.query('SELECT * FROM seedlings');
  seedlings.forEach(sd => {
    // 查找关联的种植记录
    const plantings = db.query(`
      SELECT SUM(transplant_count) as total_planted 
      FROM plantings 
      WHERE source_id = ? AND source_type = 'seedling'
    `, [sd.id]);
    
    const totalPlanted = plantings[0]?.total_planted || 0;
    
    if (totalPlanted > sd.survival_count) {
      errors.push(`育苗 ${sd.seedling_code} 成活${sd.survival_count}株，但定植了${totalPlanted}株`);
    }
  });
  
  return errors;
}
```

---

## 七、前端切换方案

### 7.1 Import 路径统一改造

**当前状态（所有页面）**：
```typescript
// SeedSourcePage.tsx
import * as seedSourceService from '../../../services/seedSourceService';

// SeedlingPage.tsx
import * as seedlingService from '../../../services/seedlingService';

// PlantingPage.tsx
import * as plantingService from '../../../services/plantingService';
// ...
```

**目标状态**：
```typescript
// 所有页面统一改为
import { 
  seedSourceService, 
  seedlingService, 
  plantingService,
  harvestService,
  cropInstanceService,
  cropOrderService,
  cropVarietyService,
} from '@/services';
```

### 7.2 需要修改的文件清单

| 文件路径 | 当前 import | 修改后 |
|---------|------------|--------|
| `src/components/farm/seed-source/SeedSourcePage.tsx` | `from '../../../services/seedSourceService'` | `from '@/services'` |
| `src/components/farm/seed-source/modals/AddModal.tsx` | `from '../../../../services/seedSourceService'` | `from '@/services'` |
| `src/components/farm/seed-source/modals/EditModal.tsx` | `from '../../../../services/seedSourceService'` | `from '@/services'` |
| `src/components/farm/seedling/SeedlingPage.tsx` | `from '../../../services/seedlingService'` | `from '@/services'` |
| `src/components/farm/seedling/modals/AddModal.tsx` | `from '../../../../services/seedlingService'` | `from '@/services'` |
| `src/components/farm/seedling/modals/DailyRecordModal.tsx` | `from '../../../../services/seedlingService'` | `from '@/services'` |
| `src/components/farm/seedling/modals/TransplantModal.tsx` | `from '../../../../services/plantingService'` | `from '@/services'` |
| `src/components/farm/planting/PlantingPage.tsx` | `from '../../../services/plantingService'` | `from '@/services'` |
| `src/components/farm/planting/modals/AddModal.tsx` | `from '../../../../services/plantingService'` | `from '@/services'` |
| `src/components/farm/harvest/HarvestPage.tsx` | `from '../../../services/harvestService'` | `from '@/services'` |
| `src/components/farm/instance/InstancePage.tsx` | `from '@/services/cropInstanceService'` | `from '@/services'` |
| `src/components/farm/order/OrderPage.tsx` | `from '@/services/cropOrderService'` | `from '@/services'` |
| `src/components/farm/order/modals/AddModal.tsx` | `from '@/services/cropOrderService'` | `from '@/services'` |
| `src/pages/CropManagement.tsx` | 可能有多个 | `from '@/services'` |

### 7.3 统一入口适配

当前 `src/services/index.ts` 已设计好三级切换，但需要确保 API Service 导出名称和 LocalStorage Service 一致。

**检查点**：
```typescript
// src/services/api/index.ts 应导出
export { seedSourceService } from './seedSourceService';
export { seedlingService } from './seedlingService';
export { plantingService } from './plantingService';
export { harvestService } from './harvestService';
export { cropInstanceService } from './cropInstanceService';
export { cropOrderService } from './cropOrderService';
export { cropVarietyService } from './cropVarietyService';
// ...
```

### 7.4 Vite Proxy 配置

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // 如果后端不需要 /api 前缀
      },
    },
  },
});
```

### 7.5 环境变量配置

```
# .env
VITE_STORAGE_MODE=api
VITE_API_BASE=/api
```

### 7.6 API Service 字段转换

前端 API Service 需要处理字段名转换（下划线→驼峰）：

```typescript
// src/services/api/client.ts 或各 Service 中
function fixResponse(item: any) {
  return {
    id: item.id,
    seedCode: item.seed_code,
    sourceType: item.source_type,
    sourceOrigin: item.source_origin,
    // ... 所有字段转换
    supplierId: item.supplier_id,
    supplierName: item.supplier_name, // 如果需要，通过 JOIN 查询
    createBy: item.create_by,
    createTime: item.create_time,
    updateTime: item.update_time,
  };
}

function fixRequest(item: any) {
  return {
    seed_code: item.seedCode,
    source_type: item.sourceType,
    // ... 所有字段转换
  };
}
```

---

## 八、实施优先级与批次

### 8.1 批次规划

| 批次 | 内容 | 工作量 | 依赖 |
|------|------|--------|------|
| **Batch 0** | 后端补齐缺失表（Schema） | 2-3天 | 无 |
| **Batch 1** | 系统设置模块 SQLite 化 | 3-4天 | Batch 0 |
| **Batch 2** | 品种库 + 种源迁移 | 2-3天 | Batch 1 |
| **Batch 3** | 育苗 + 每日记录迁移 | 2-3天 | Batch 2 |
| **Batch 4** | 种植 + 采收迁移 | 2-3天 | Batch 3 |
| **Batch 5** | 实例 + 订单迁移 | 2-3天 | Batch 4 |
| **Batch 6** | 库存 + 物料迁移 | 2-3天 | Batch 4 |
| **Batch 7** | 农事 + 巡查 + 问题迁移 | 2天 | Batch 1 |
| **Batch 8** | 生产计划迁移 | 1-2天 | Batch 4 |
| **Batch 9** | 人工管理12模块迁移 | 5-7天 | Batch 1 |
| **Batch 10** | 审批中心迁移 | 2天 | Batch 1 |
| **Batch 11** | 前端 Import 统一改造 | 1-2天 | 所有 Batch |
| **Batch 12** | 联调测试 + 数据校验 | 3-5天 | Batch 11 |

**总工期估算**：约 25-35 个工作日（1-1.5个月）

### 8.2 最小可用版本（MVP）

如果希望尽快上线使用 SQLite，可以先做核心模块：

```
Phase 1（2周）：
  ├─ 补齐后端 Schema（所有表）
  ├─ 系统设置模块 SQLite 化（部门/人员/温室/仓库/供应商）
  ├─ 种源 + 育苗 + 种植 + 采收 迁移
  ├─ 实例自动生成
  └─ 前端切换 API 模式

Phase 2（1周）：
  ├─ 订单 + 库存 迁移
  ├─ 农事任务迁移
  └─ 数据校验修复

Phase 3（1-2周）：
  ├─ 人工管理12模块迁移
  ├─ 审批中心迁移
  ├─ 生产计划迁移
  └─ 全面测试
```

---

## 九、风险与回退方案

### 9.1 主要风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 迁移过程中数据丢失 | 中 | **致命** | 迁移前导出完整 JSON 备份；迁移脚本加事务（BEGIN/COMMIT/ROLLBACK） |
| 字段映射错误导致数据错乱 | 高 | **严重** | 每批迁移后做校验；生成校验报告；人工抽样检查 |
| 外键约束导致插入失败 | 高 | **中等** | 按依赖顺序迁移（先基础表后业务表）；无主键引用时插入 NULL |
| 前端 API 模式性能问题 | 中 | **中等** | 加 Loading 状态；考虑分页查询；必要时用 Dexie.js 做本地缓存 |
| 后端 API 并发冲突 | 低 | **中等** | SQLite 文件锁处理；考虑升级到 PostgreSQL（未来） |
| 人员名称映射失败 | 高 | **轻微** | 无法匹配时保留原名字符串到 `create_by_name` 字段；后续人工修正 |

### 9.2 回退方案

如果迁移失败，可以回退到 LocalStorage：

```
1. 保留 localStorage 原始数据（迁移前导出 JSON）
2. 保留旧 Service 文件（重命名而非删除）
3. 如果 API 模式出问题，切回 local 模式：
   VITE_STORAGE_MODE=local
4. 前端 import 回退到旧路径
```

### 9.3 双轨并行过渡期

```
过渡期方案（推荐）：

Week 1-2：SQLite 作为「主库」，LocalStorage 作为「备份」
  ├─ 每次 API 写入成功后，同步写一份到 LocalStorage
  ├─ 如果 API 失败，自动降级到 LocalStorage
  └─ 用户无感知

Week 3-4：验证 SQLite 数据完整后，停掉 LocalStorage 写入
  ├─ 只保留读取（兼容旧数据）
  └─ 新增数据全部走 API

Week 5+：完全切换到 SQLite，清理 LocalStorage 相关代码
```

---

## 十、总结

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| **存储** | LocalStorage（5MB，浏览器绑定） | SQLite（无上限，服务器持久化） |
| **关联** | 无关联，各模块独立 | 完整外键关联，全链路可追溯 |
| **设置** | 硬编码，无持久化 | SQLite 持久化，驱动所有业务 |
| **人员** | 自由输入字符串 | 下拉选择，关联 staff 表 |
| **场地** | 字符串拼接 | 结构化温室+区域，外键关联 |
| **校验** | 无 | 外键约束 + 数量守恒 + 溯源链校验 |
| **查询** | 全量加载到内存 | SQL 条件查询，分页加载 |
| **容量** | 5-10MB | 无上限（SQLite 文件可达 TB 级） |
| **备份** | 无 | 文件级备份，可定时导出 |
| **多端** | 单浏览器 | 任何设备访问同一 SQLite 数据库 |

**最优先执行的3件事**：
1. **补齐后端 Schema**（所有缺失表，1-2天）
2. **系统设置模块 SQLite 化**（部门/人员/温室/仓库，2-3天）
3. **种源→育苗→种植→采收 核心链路迁移**（1周）

做完这3步，系统就具备了「真正可用」的基础——数据持久化、模块关联、设置驱动业务。

---

*规划文件生成时间：2026-05-02 07:00*  
*基于全量代码分析，未修改任何文件*
