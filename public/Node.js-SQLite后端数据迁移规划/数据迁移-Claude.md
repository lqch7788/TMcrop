# 数据迁移与业务联通设计方案

> **文档版本**: V1.0  
> **创建日期**: 2026-05-02  
> **项目**: 智慧种植生产管理系统 V1.1  
> **目标规模**: 1000用户总量，500人同时在线协作

---

## 目录

1. [现状问题分析](#1-现状问题分析)
2. [目标架构设计](#2-目标架构设计)
3. [完整数据库Schema设计](#3-完整-databaseschema-设计)
4. [数据迁移策略](#4-数据迁移策略)
5. [业务关联设计](#5-业务关联设计)
6. [审核流程设计](#6-审核流程设计)
7. [系统设置模块优化](#7-系统设置模块优化)
8. [实施计划与优先级](#8-实施计划与优先级)
9. [安全策略与风险控制](#9-安全策略与风险控制)

---

## 1. 现状问题分析

### 1.1 数据存储现状

#### SQLite数据库（已有表结构）
| 表名 | 用途 | 现状 |
|-----|------|-----|
| crop_varieties | 作物品种 | 基础数据，已建表 |
| inventory | 库存 | 基础数据，已建表 |
| crop_instances | 作物实例 | 基础数据，已建表 |
| seed_sources | 种源 | 基础数据，已建表 |
| seedlings | 育苗 | 基础数据，已建表 |
| plantings | 种植 | 基础数据，已建表 |
| harvest_records | 采收 | 基础数据，已建表 |
| suppliers | 供应商 | 基础数据，已建表 |
| farm_tasks | 农事任务 | 基础数据，已建表 |
| inspections | 巡查 | 基础数据，已建表 |
| problems | 问题 | 基础数据，已建表 |
| labor_records | 人工 | 基础数据，已建表 |

#### localStorage存储（81个文件使用）
```
# 核心业务数据
yuanxingtu_worklogs          - 工作者日志
yuanxingtu_inspections      - 巡查记录
yuanxingtu_attendance        - 考勤记录
yuanxingtu_daily_problems    - 日常问题
yuanxingtu_tasks            - 任务数据
yuanxingtu_tempTasks        - 临时任务
yuanxingtu_operationRecords  - 操作记录
yuanxingtu_dispatch_records  - 调度记录
yuanxingtu_my_tasks         - 我的任务
yuanxingtu_problem_attachments - 问题附件

# 库存V3版本（独立实现）
inventory_stock_v3          - 库存中心
inventory_transaction_v3     - 库存事务
inventory_freeze_v3         - 库存冻结
```

### 1.2 核心问题

| 问题类型 | 具体表现 | 影响 |
|---------|---------|-----|
| **数据孤岛** | 各页面使用独立localStorage key，数据无关联 | 无法实现业务闭环 |
| **存储分散** | 81个文件使用localStorage，库存用V3独立key | 数据一致性问题 |
| **容量限制** | localStorage 5MB限制，高数据量会溢出 | 系统崩溃风险 |
| **关联缺失** | 批次、任务、人员、物资之间无外键关联 | 业务追溯困难 |
| **同步缺失** | SQLite与localStorage无双向同步 | 数据不一致 |
| **审核断链** | 审批流程与业务数据分离 | 审批后业务未联动 |
| **并发瓶颈** | localStorage不支持并发，500人协作会冲突 | 数据覆盖/丢失 |
| **无审计追踪** | 操作记录分散，无统一审计机制 | 问题排查困难 |

### 1.3 数据规模评估（1000用户/500并发）

| 数据类型 | 日增量估算 | 年存量估算 | 存储需求 |
|---------|----------|----------|---------|
| 农事任务 | 5,000条/日 | 1,825,000条 | ~500MB |
| 巡查记录 | 2,000条/日 | 730,000条 | ~200MB |
| 库存事务 | 3,000条/日 | 1,095,000条 | ~300MB |
| 考勤记录 | 500条/日 | 182,500条 | ~50MB |
| 操作日志 | 20,000条/日 | 7,300,000条 | ~2GB |
| **合计** | **~30,500条/日** | **~11,132,500条** | **~3GB/年** |

**结论**: localStorage的5MB限制无法承载，必须迁移到SQLite。

---

## 2. 目标架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用层                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ 生产管理 │ │ 人工管理 │ │ 审批管理 │ │ 系统设置 │         │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘         │
└────────┼───────────┼───────────┼───────────┼──────────────────┘
         │           │           │           │
         └───────────┴─────┬─────┴───────────┘
                           │
                    ┌──────▼──────┐
                    │   API网关    │
                    │  (Express)   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐
    │ 业务服务  │     │  审批服务  │    │  报表服务  │
    └────┬────┘     └─────┬─────┘    └─────┬─────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │  SQLite数据库 │
                    │ (sql.js v2)  │
                    └──────────────┘
```

### 2.2 数据层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       SQLite 数据库                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 系统配置库   │  │ 业务数据库  │  │ 审计数据库   │             │
│  │ (sys_*)    │  │ (biz_*)    │  │ (audit_*)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│  表空间隔离 + 索引优化 + 分页机制                                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 核心设计原则

1. **数据完整性**: 所有业务表之间通过外键关联
2. **可追溯性**: 每条记录有创建人/时间/修改记录
3. **并发安全**: 使用乐观锁/事务保证数据一致性
4. **审计追踪**: 所有操作记录到审计表
5. **性能优化**: 索引、分页、缓存三级优化

---

## 3. 完整数据库Schema设计

### 3.1 系统配置表（sys_*）

```sql
-- 用户表
CREATE TABLE sys_users (
  id TEXT PRIMARY KEY,
  user_code TEXT UNIQUE NOT NULL,        -- 用户编码 U001
  user_name TEXT NOT NULL,               -- 用户姓名
  password_hash TEXT NOT NULL,           -- 密码哈希
  phone TEXT,                            -- 手机号
  email TEXT,                            -- 邮箱
  avatar TEXT,                           -- 头像
  role TEXT NOT NULL DEFAULT 'worker',   -- admin/manager/supervisor/worker
  department_id TEXT,                    -- 部门ID
  position_id TEXT,                      -- 岗位ID
  base_ids TEXT,                         -- 负责基地ID列表（JSON数组）
  status TEXT DEFAULT 'active',          -- active/inactive/locked
  last_login_time TEXT,                  -- 最后登录时间
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  version INTEGER DEFAULT 1              -- 乐观锁版本号
);

-- 部门表
CREATE TABLE sys_departments (
  id TEXT PRIMARY KEY,
  dept_code TEXT UNIQUE NOT NULL,       -- 部门编码 DEPT001
  dept_name TEXT NOT NULL,               -- 部门名称
  parent_id TEXT,                        -- 父部门ID
  dept_level INTEGER DEFAULT 1,          -- 部门层级
  sort_order INTEGER DEFAULT 0,          -- 排序
  manager_id TEXT,                       -- 部门负责人ID
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 岗位表
CREATE TABLE sys_positions (
  id TEXT PRIMARY KEY,
  position_code TEXT UNIQUE NOT NULL,   -- 岗位编码 POS001
  position_name TEXT NOT NULL,           -- 岗位名称
  dept_id TEXT,                          -- 所属部门ID
  position_level INTEGER DEFAULT 1,       -- 岗位级别
  responsibilities TEXT,                  -- 职责描述
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 基地表
CREATE TABLE sys_bases (
  id TEXT PRIMARY KEY,
  base_code TEXT UNIQUE NOT NULL,       -- 基地编码 BASE001
  base_name TEXT NOT NULL,               -- 基地名称
  location TEXT,                          -- 位置
  base_type TEXT,                        -- glass/solar/open
  area REAL DEFAULT 0,                   -- 面积（平方米）
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 温室大棚表
CREATE TABLE sys_greenhouses (
  id TEXT PRIMARY KEY,
  greenhouse_code TEXT UNIQUE NOT NULL,  -- 大棚编码 G001
  greenhouse_name TEXT NOT NULL,         -- 大棚名称
  base_id TEXT NOT NULL,                 -- 所属基地ID
  greenhouse_type TEXT,                  -- glass/solar/open
  area REAL DEFAULT 0,                  -- 面积
  location TEXT,                          -- 位置描述
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (base_id) REFERENCES sys_bases(id)
);

-- 作物分类表
CREATE TABLE sys_crop_categories (
  id TEXT PRIMARY KEY,
  category_code TEXT UNIQUE NOT NULL,   -- 分类编码 03
  category_name TEXT NOT NULL,           -- 分类名称
  parent_id TEXT,                        -- 父分类
  sort_order INTEGER DEFAULT 0,
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 作物类型表
CREATE TABLE sys_crop_types (
  id TEXT PRIMARY KEY,
  type_code TEXT UNIQUE NOT NULL,       -- 类型编码 01
  type_name TEXT NOT NULL,               -- 类型名称
  category_id TEXT,                      -- 所属分类
  growth_days INTEGER,                   -- 生长周期（天）
  suitable_temp TEXT,                    -- 适宜温度
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (category_id) REFERENCES sys_crop_categories(id)
);

-- 作物品种表（原有表扩展）
CREATE TABLE sys_crop_varieties (
  id TEXT PRIMARY KEY,
  variety_code TEXT UNIQUE NOT NULL,    -- 品种编码 030101001
  category_code TEXT,                   -- 分类编码
  category_name TEXT,                   -- 分类名称
  type_code TEXT,                        -- 类型编码
  type_name TEXT,                        -- 类型名称
  variety_name TEXT NOT NULL,           -- 品种名称
  sub_variety_code TEXT,                 -- 子品种编码
  sub_variety_name TEXT,                -- 子品种名称
  growth_stage_config TEXT,              -- 生长阶段配置（JSON）
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 供应商表（原有表扩展）
CREATE TABLE sys_suppliers (
  id TEXT PRIMARY KEY,
  supplier_code TEXT UNIQUE NOT NULL,   -- 供应商编码 SUP001
  supplier_name TEXT NOT NULL,           -- 供应商名称
  supplier_type TEXT,                    -- 类型：种子/化肥/农药/设备
  contact_person TEXT,                   -- 联系人
  contact_phone TEXT,                    -- 联系电话
  address TEXT,                          -- 地址
  bank_account TEXT,                     -- 银行账号
  tax_number TEXT,                       -- 税号
  credit_level TEXT,                     -- 信用等级
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 物资分类表
CREATE TABLE sys_material_categories (
  id TEXT PRIMARY KEY,
  category_code TEXT UNIQUE NOT NULL,   -- 分类编码
  category_name TEXT NOT NULL,           -- 分类名称
  parent_id TEXT,                        -- 父分类
  sort_order INTEGER DEFAULT 0,
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 物资表
CREATE TABLE sys_materials (
  id TEXT PRIMARY KEY,
  material_code TEXT UNIQUE NOT NULL,   -- 物资编码 MT001
  material_name TEXT NOT NULL,           -- 物资名称
  category_id TEXT,                      -- 分类ID
  specification TEXT,                     -- 规格
  unit TEXT,                             -- 单位
  unit_price REAL DEFAULT 0,            -- 单价
  safe_stock REAL DEFAULT 0,            -- 安全库存
  supplier_id TEXT,                      -- 供应商ID
  location TEXT,                          -- 存放位置
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (supplier_id) REFERENCES sys_suppliers(id)
);

-- 工序表
CREATE TABLE sys_processes (
  id TEXT PRIMARY KEY,
  process_code TEXT UNIQUE NOT NULL,    -- 工序编码 P001
  process_name TEXT NOT NULL,            -- 工序名称
  category TEXT,                         -- 分类：准备/种植/灌溉/施肥/植保/收获/巡查/田间管理
  unit TEXT,                             -- 计量单位
  unit_price REAL DEFAULT 0,            -- 单价
  reward_rate REAL DEFAULT 1.0,         -- 奖励系数
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 种植模式表
CREATE TABLE sys_planting_modes (
  id TEXT PRIMARY KEY,
  mode_code TEXT UNIQUE NOT NULL,       -- 模式编码 M001
  mode_name TEXT NOT NULL,              -- 模式名称
  description TEXT,                      -- 描述
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 审批流程配置表
CREATE TABLE sys_approval_flows (
  id TEXT PRIMARY KEY,
  flow_code TEXT UNIQUE NOT NULL,       -- 流程编码 FLOW001
  flow_name TEXT NOT NULL,              -- 流程名称
  flow_type TEXT NOT NULL,              -- 流程类型
  approver_rules TEXT NOT NULL,         -- 审批人规则（JSON）
  approval_levels INTEGER DEFAULT 1,     -- 审批级别数
  timeout_hours INTEGER DEFAULT 72,      -- 超时时间（小时）
  auto_approve_rules TEXT,               -- 自动审批规则（JSON）
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 审批节点配置表
CREATE TABLE sys_approval_nodes (
  id TEXT PRIMARY KEY,
  flow_id TEXT NOT NULL,                 -- 所属流程ID
  node_order INTEGER NOT NULL,           -- 节点顺序
  node_name TEXT NOT NULL,               -- 节点名称
  approver_type TEXT NOT NULL,          -- approver_role/approver_user/approver_manager
  approver_value TEXT,                   -- 审批人值（角色ID或用户ID）
  node_timeout_hours INTEGER DEFAULT 72, -- 节点超时时间
  can_delegate INTEGER DEFAULT 0,        -- 可否委托
  require_comment INTEGER DEFAULT 0,      -- 是否需要填写意见
  status TEXT DEFAULT 'active',
  FOREIGN KEY (flow_id) REFERENCES sys_approval_flows(id)
);

-- 数据字典表
CREATE TABLE sys_dictionaries (
  id TEXT PRIMARY KEY,
  dict_type TEXT NOT NULL,               -- 字典类型
  dict_code TEXT NOT NULL,              -- 字典编码
  dict_label TEXT NOT NULL,             -- 字典标签
  dict_value TEXT NOT NULL,             -- 字典值
  sort_order INTEGER DEFAULT 0,          -- 排序
  is_default INTEGER DEFAULT 0,         -- 是否默认值
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);
```

### 3.2 业务数据库表（biz_*）

```sql
-- 生产计划主表（整合种源/育苗/种植三阶段）
CREATE TABLE biz_production_plans (
  id TEXT PRIMARY KEY,
  plan_code TEXT UNIQUE NOT NULL,        -- 计划编号 JZB/YMB/ZZB前缀
  plan_type TEXT NOT NULL,               -- seed_breeding/seedling/planting
  crop_name TEXT NOT NULL,               -- 作物名称
  crop_variety TEXT,                     -- 品种
  greenhouse_id TEXT,                     -- 种植基地ID
  greenhouse_name TEXT,                   -- 种植基地名称
  planting_area REAL DEFAULT 0,           -- 种植面积
  stage TEXT NOT NULL,                    -- 当前阶段
  start_date TEXT,                       -- 开始日期
  expected_harvest_date TEXT,            -- 预计完成日期
  target_yield REAL DEFAULT 0,            -- 目标产量
  actual_yield REAL DEFAULT 0,           -- 实际产量
  responsible_person_id TEXT,             -- 负责人ID
  responsible_person_name TEXT,           -- 负责人姓名
  publisher_id TEXT,                      -- 发布人ID
  publisher_name TEXT,                    -- 发布人姓名
  publish_date TEXT,                      -- 发布时间
  batch_status TEXT DEFAULT 'draft',      -- 批次状态
  plan_detail TEXT,                      -- 计划详情（Markdown）
  source_supplier_id TEXT,               -- 种源供应商ID（种源计划用）
  source_supplier_name TEXT,             -- 种源供应商名称
  seed_quantity REAL DEFAULT 0,           -- 种子数量（种源计划用）
  seedling_site_name TEXT,                -- 育苗场地（育苗计划用）
  target_seedling_count INTEGER,         -- 目标成苗数（育苗计划用）
  planting_mode TEXT,                     -- 种植模式
  status TEXT DEFAULT 'active',
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id),
  FOREIGN KEY (responsible_person_id) REFERENCES sys_users(id),
  FOREIGN KEY (publisher_id) REFERENCES sys_users(id)
);

-- 种源记录表
CREATE TABLE biz_seed_sources (
  id TEXT PRIMARY KEY,
  source_code TEXT UNIQUE NOT NULL,      -- 种源编号
  source_name TEXT,                       -- 种源名称
  source_type TEXT,                       -- 种源类型
  crop_name TEXT NOT NULL,               -- 作物名称
  crop_variety TEXT,                     -- 品种
  supplier_id TEXT,                       -- 供应商ID
  supplier_name TEXT,                    -- 供应商名称
  production_plan_id TEXT,               -- 关联生产计划ID
  production_plan_code TEXT,              -- 关联生产计划编号
  quantity INTEGER DEFAULT 0,            -- 采购数量
  unit TEXT,                             -- 单位
  purchase_date TEXT,                     -- 采购日期
  purchase_price REAL DEFAULT 0,         -- 采购单价
  total_amount REAL DEFAULT 0,           -- 总金额
  used_quantity INTEGER DEFAULT 0,        -- 已用量
  remaining_quantity INTEGER DEFAULT 0,   -- 剩余量
  status TEXT DEFAULT 'active',
  remarks TEXT,
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (supplier_id) REFERENCES sys_suppliers(id),
  FOREIGN KEY (production_plan_id) REFERENCES biz_production_plans(id)
);

-- 育苗记录表
CREATE TABLE biz_seedlings (
  id TEXT PRIMARY KEY,
  seedling_code TEXT UNIQUE NOT NULL,    -- 育苗编号
  source_id TEXT,                        -- 种源ID
  source_name TEXT,                      -- 种源名称
  production_plan_id TEXT,              -- 生产计划ID
  production_plan_code TEXT,             -- 生产计划编号
  crop_name TEXT NOT NULL,              -- 作物名称
  crop_variety TEXT,                    -- 品种
  seedling_type TEXT,                    -- 育苗类型
  greenhouse_id TEXT,                    -- 温室ID
  greenhouse_name TEXT,                  -- 温室名称
  area_name TEXT,                        -- 区域名称
  seedling_date TEXT,                     -- 育苗日期
  expected_finish_date TEXT,              -- 预计完成日期
  actual_finish_date TEXT,               -- 实际完成日期
  seedling_quantity INTEGER DEFAULT 0,   -- 育苗数量
  survival_quantity INTEGER DEFAULT 0,   -- 成活数量
  survival_rate REAL DEFAULT 0,          -- 成活率
  status TEXT DEFAULT 'in_progress',
  seedling_status TEXT,                  -- 育苗状态
  remarks TEXT,
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (source_id) REFERENCES biz_seed_sources(id),
  FOREIGN KEY (production_plan_id) REFERENCES biz_production_plans(id),
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id)
);

-- 种植记录表
CREATE TABLE biz_plantings (
  id TEXT PRIMARY KEY,
  planting_code TEXT UNIQUE NOT NULL,    -- 种植编号
  source_type TEXT,                       -- 来源类型
  source_id TEXT,                         -- 来源ID（种苗ID或采购ID）
  source_name TEXT,                       -- 来源名称
  crop_name TEXT NOT NULL,               -- 作物名称
  crop_variety TEXT,                     -- 品种
  greenhouse_id TEXT,                     -- 温室ID
  greenhouse_name TEXT,                  -- 温室名称
  area_name TEXT,                        -- 区域名称
  planting_date TEXT,                     -- 种植日期
  planting_quantity INTEGER DEFAULT 0,   -- 种植数量
  planted_quantity INTEGER DEFAULT 0,    -- 已定植数量
  survival_quantity INTEGER DEFAULT 0,   -- 成活数量
  survival_rate REAL DEFAULT 0,          -- 成活率
  growth_status TEXT,                    -- 生长状态
  expected_harvest_date TEXT,            -- 预计采收日期
  actual_harvest_date TEXT,              -- 实际采收日期
  harvest_quantity INTEGER DEFAULT 0,    -- 采收数量
  status TEXT DEFAULT 'planted',
  remarks TEXT,
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id)
);

-- 采收记录表
CREATE TABLE biz_harvest_records (
  id TEXT PRIMARY KEY,
  harvest_code TEXT UNIQUE NOT NULL,     -- 采收编号
  source_id TEXT,                        -- 来源ID（种植记录ID）
  source_name TEXT,                      -- 来源名称
  crop_name TEXT NOT NULL,              -- 作物名称
  crop_variety TEXT,                    -- 品种
  greenhouse_id TEXT,                    -- 温室ID
  greenhouse_name TEXT,                  -- 温室名称
  harvest_date TEXT,                     -- 采收日期
  harvest_quantity REAL DEFAULT 0,      -- 采收数量
  unit TEXT,                             -- 单位
  unit_price REAL DEFAULT 0,            -- 单价
  total_amount REAL DEFAULT 0,           -- 总金额
  quality_grade TEXT,                    -- 品质等级
  buyer_id TEXT,                         -- 买家ID
  buyer_name TEXT,                      -- 买家名称
  sales_channel TEXT,                    -- 销售渠道
  status TEXT DEFAULT 'pending',
  remarks TEXT,
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id)
);

-- 库存中心表
CREATE TABLE biz_inventory_stocks (
  id TEXT PRIMARY KEY,
  instance_id TEXT UNIQUE NOT NULL,     -- 库存实例ID
  stock_type TEXT NOT NULL,              -- seed/seedling/product
  business_id TEXT NOT NULL,             -- 关联业务ID
  business_type TEXT NOT NULL,           -- 关联业务类型
  crop_id TEXT,                          -- 作物ID
  crop_name TEXT NOT NULL,              -- 作物名称
  variety_id TEXT,                       -- 品种ID
  variety_name TEXT,                     -- 品种名称
  current_quantity REAL DEFAULT 0,      -- 当前库存
  frozen_quantity REAL DEFAULT 0,       -- 冻结数量
  available_quantity REAL DEFAULT 0,    -- 可用数量
  unit TEXT,                             -- 单位
  source_type TEXT,                      -- self_produced/external_purchased
  supplier_id TEXT,                      -- 供应商ID
  supplier_name TEXT,                    -- 供应商名称
  base_id TEXT,                          -- 基地ID
  base_name TEXT,                        -- 基地名称
  production_plan_id TEXT,              -- 生产计划ID
  production_plan_code TEXT,            -- 生产计划编号
  source_instance_id TEXT,               -- 上游库存实例ID
  source_business_id TEXT,              -- 上游业务ID
  source_business_type TEXT,            -- 上游业务类型
  status TEXT DEFAULT 'in_stock',
  inbound_date TEXT,                    -- 入库日期
  last_outbound_date TEXT,               -- 最后出库日期
  expiry_date TEXT,                      -- 过期日期
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  version INTEGER DEFAULT 1
);

-- 库存事务表
CREATE TABLE biz_inventory_transactions (
  id TEXT PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,   -- 事务ID
  stock_id TEXT NOT NULL,                -- 库存ID
  instance_id TEXT,                      -- 库存实例ID
  transaction_type TEXT NOT NULL,        -- inbound/outbound/transfer/freeze/unfreeze/adjust
  business_type TEXT,                    -- 业务类型
  business_id TEXT,                      -- 业务ID
  quantity REAL NOT NULL,                -- 变动数量
  quantity_before REAL DEFAULT 0,        -- 变动前数量
  quantity_after REAL DEFAULT 0,         -- 变动后数量
  unit TEXT,                             -- 单位
  operator_id TEXT,                      -- 操作人ID
  operator_name TEXT,                    -- 操作人姓名
  operation_time TEXT NOT NULL,          -- 操作时间
  remarks TEXT,
  FOREIGN KEY (stock_id) REFERENCES biz_inventory_stocks(id)
);

-- 库存冻结表
CREATE TABLE biz_inventory_freezes (
  id TEXT PRIMARY KEY,
  freeze_id TEXT UNIQUE NOT NULL,        -- 冻结ID
  stock_id TEXT NOT NULL,                -- 库存ID
  instance_id TEXT,                      -- 库存实例ID
  freeze_type TEXT NOT NULL,             -- task/reserved/qc/other
  business_id TEXT,                      -- 业务ID
  business_type TEXT,                    -- 业务类型
  frozen_quantity REAL NOT NULL,         -- 冻结数量
  unfrozen_quantity REAL DEFAULT 0,      -- 已解冻数量
  status TEXT DEFAULT 'frozen',          -- frozen/partial_unfrozen/unfrozen
  freeze_time TEXT NOT NULL,            -- 冻结时间
  unfreeze_time TEXT,                   -- 解冻时间
  operator_id TEXT,                      -- 操作人ID
  operator_name TEXT,                    -- 操作人姓名
  remarks TEXT,
  FOREIGN KEY (stock_id) REFERENCES biz_inventory_stocks(id)
);

-- 农事任务表
CREATE TABLE biz_farm_tasks (
  id TEXT PRIMARY KEY,
  task_code TEXT UNIQUE NOT NULL,       -- 任务编号
  task_title TEXT NOT NULL,             -- 任务标题
  task_type TEXT NOT NULL,              -- 任务类型
  task_content TEXT,                     -- 任务内容
  batch_id TEXT,                        -- 生产计划ID
  batch_code TEXT,                      -- 生产计划编号
  greenhouse_id TEXT,                    -- 温室ID
  greenhouse_name TEXT,                  -- 温室名称
  area_name TEXT,                        -- 区域名称
  assignee_id TEXT,                      -- 承揽人ID
  assignee_name TEXT,                    -- 承揽人姓名
  assigner_id TEXT,                      -- 指派人ID
  assigner_name TEXT,                    -- 指派人姓名
  plan_date TEXT,                        -- 计划日期
  plan_time TEXT,                        -- 计划时间
  start_time TEXT,                       -- 实际开始时间
  end_time TEXT,                         -- 实际结束时间
  priority TEXT DEFAULT 'medium',        -- high/medium/low
  status TEXT DEFAULT 'pending',         -- pending/in_progress/completed/cancelled
  completion_note TEXT,                   -- 完成备注
  actual_workload REAL DEFAULT 0,        -- 实际工作量
  work_hours REAL DEFAULT 0,            -- 工时
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (batch_id) REFERENCES biz_production_plans(id),
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id),
  FOREIGN KEY (assignee_id) REFERENCES sys_users(id),
  FOREIGN KEY (assigner_id) REFERENCES sys_users(id)
);

-- 任务所需物资表
CREATE TABLE biz_task_materials (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,                 -- 任务ID
  material_id TEXT NOT NULL,             -- 物资ID
  material_name TEXT NOT NULL,           -- 物资名称
  required_quantity REAL DEFAULT 0,     -- 需要数量
  actual_quantity REAL DEFAULT 0,       -- 实际数量
  unit TEXT,                             -- 单位
  FOREIGN KEY (task_id) REFERENCES biz_farm_tasks(id),
  FOREIGN KEY (material_id) REFERENCES sys_materials(id)
);

-- 巡查记录表
CREATE TABLE biz_inspections (
  id TEXT PRIMARY KEY,
  record_code TEXT UNIQUE NOT NULL,      -- 巡查编号
  inspection_type TEXT,                   -- 巡查类型
  inspector_id TEXT NOT NULL,            -- 巡查人ID
  inspector_name TEXT NOT NULL,           -- 巡查人姓名
  greenhouse_id TEXT,                    -- 温室ID
  greenhouse_name TEXT,                  -- 温室名称
  batch_id TEXT,                         -- 生产计划ID
  batch_code TEXT,                        -- 生产计划编号
  check_date TEXT,                       -- 巡查日期
  check_time TEXT,                       -- 巡查时间
  check_result TEXT,                     -- 巡查结果
  issue_severity TEXT,                   -- 问题严重程度
  issue_text TEXT,                       -- 问题描述
  images TEXT,                           -- 图片列表（JSON）
  status TEXT DEFAULT 'pending',
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (inspector_id) REFERENCES sys_users(id),
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id),
  FOREIGN KEY (batch_id) REFERENCES biz_production_plans(id)
);

-- 问题记录表
CREATE TABLE biz_problems (
  id TEXT PRIMARY KEY,
  problem_code TEXT UNIQUE NOT NULL,     -- 问题编号
  problem_type TEXT,                     -- 问题类型
  title TEXT NOT NULL,                  -- 问题标题
  description TEXT,                      -- 问题描述
  greenhouse_id TEXT,                    -- 温室ID
  greenhouse_name TEXT,                   -- 温室名称
  batch_id TEXT,                         -- 生产计划ID
  batch_code TEXT,                       -- 生产计划编号
  reporter_id TEXT,                      -- 上报人ID
  reporter_name TEXT,                    -- 上报人姓名
  assignee_id TEXT,                      -- 负责人ID
  assignee_name TEXT,                    -- 负责人姓名
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  images TEXT,                           -- 图片列表（JSON）
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id),
  FOREIGN KEY (reporter_id) REFERENCES sys_users(id),
  FOREIGN KEY (assignee_id) REFERENCES sys_users(id)
);

-- 考勤记录表
CREATE TABLE biz_attendance (
  id TEXT PRIMARY KEY,
  attendance_code TEXT UNIQUE NOT NULL,  -- 考勤编号
  user_id TEXT NOT NULL,                -- 用户ID
  user_name TEXT NOT NULL,              -- 用户姓名
  department_id TEXT,                    -- 部门ID
  department_name TEXT,                 -- 部门名称
  work_date TEXT NOT NULL,              -- 工作日期
  check_in_time TEXT,                   -- 签到时间
  check_out_time TEXT,                  -- 签退时间
  work_hours REAL DEFAULT 0,            -- 工作时长
  attendance_status TEXT DEFAULT 'normal', -- 考勤状态 normal/late/early/absent
  late_minutes INTEGER DEFAULT 0,        -- 迟到分钟
  early_minutes INTEGER DEFAULT 0,      -- 早退分钟
  remarks TEXT,
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (user_id) REFERENCES sys_users(id),
  FOREIGN KEY (department_id) REFERENCES sys_departments(id)
);

-- 人工记录表
CREATE TABLE biz_labor_records (
  id TEXT PRIMARY KEY,
  record_code TEXT UNIQUE NOT NULL,     -- 记录编号
  worker_id TEXT NOT NULL,              -- 工人ID
  worker_name TEXT NOT NULL,            -- 工人姓名
  department_id TEXT,                   -- 部门ID
  department_name TEXT,                 -- 部门名称
  work_type TEXT NOT NULL,              -- 工作类型
  work_date TEXT NOT NULL,              -- 工作日期
  work_hours REAL DEFAULT 0,            -- 工作时长
  hourly_rate REAL DEFAULT 0,            -- 时薪
  total_amount REAL DEFAULT 0,          -- 总金额
  task_id TEXT,                         -- 关联任务ID
  task_code TEXT,                        -- 关联任务编号
  greenhouse_id TEXT,                    -- 温室ID
  greenhouse_name TEXT,                  -- 温室名称
  task_description TEXT,               -- 任务描述
  status TEXT DEFAULT 'pending',
  remarks TEXT,
  create_by TEXT,
  create_time TEXT NOT NULL,
  update_by TEXT,
  update_time TEXT,
  FOREIGN KEY (worker_id) REFERENCES sys_users(id),
  FOREIGN KEY (task_id) REFERENCES biz_farm_tasks(id),
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id)
);
```

### 3.3 审计数据库表（audit_*）

```sql
-- 操作审计表
CREATE TABLE audit_operations (
  id TEXT PRIMARY KEY,
  operation_code TEXT UNIQUE NOT NULL,  -- 操作编号
  operator_id TEXT NOT NULL,            -- 操作人ID
  operator_name TEXT NOT NULL,          -- 操作人姓名
  operation_type TEXT NOT NULL,          -- 操作类型
  business_type TEXT NOT NULL,          -- 业务类型
  business_id TEXT,                     -- 业务ID
  business_code TEXT,                   -- 业务编号
  before_data TEXT,                      -- 操作前数据（JSON）
  after_data TEXT,                       -- 操作后数据（JSON）
  ip_address TEXT,                       -- IP地址
  user_agent TEXT,                       -- 用户代理
  operation_time TEXT NOT NULL,          -- 操作时间
  duration_ms INTEGER,                  -- 操作耗时（毫秒）
  FOREIGN KEY (operator_id) REFERENCES sys_users(id)
);

-- 审批记录表
CREATE TABLE audit_approvals (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL,            -- 审批单ID
  approval_code TEXT NOT NULL,          -- 审批单编号
  approval_type TEXT NOT NULL,          -- 审批类型
  business_id TEXT,                      -- 业务ID
  business_code TEXT,                    -- 业务编号
  applicant_id TEXT NOT NULL,            -- 申请人ID
  applicant_name TEXT NOT NULL,          -- 申请人姓名
  current_step INTEGER DEFAULT 1,        -- 当前步骤
  total_steps INTEGER DEFAULT 1,         -- 总步骤数
  status TEXT DEFAULT 'pending',         -- pending/approved/rejected/cancelled
  submit_time TEXT,                      -- 提交时间
  finish_time TEXT,                      -- 完成时间
  create_time TEXT NOT NULL,
  FOREIGN KEY (applicant_id) REFERENCES sys_users(id)
);

-- 审批节点记录表
CREATE TABLE audit_approval_steps (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL,            -- 审批单ID
  step_order INTEGER NOT NULL,           -- 步骤顺序
  approver_id TEXT,                      -- 审批人ID
  approver_name TEXT,                    -- 审批人姓名
  approver_role TEXT,                    -- 审批人角色
  action TEXT,                           -- approve/reject/partial_approve
  comment TEXT,                          -- 审批意见
  attachments TEXT,                      -- 附件（JSON）
  action_time TEXT,                      -- 操作时间
  timeout_hours INTEGER,                 -- 超时时长
  delegate_from_id TEXT,                 -- 委托来源ID
  delegate_from_name TEXT,               -- 委托来源姓名
  FOREIGN KEY (approval_id) REFERENCES audit_approvals(id),
  FOREIGN KEY (approver_id) REFERENCES sys_users(id)
);

-- 登录审计表
CREATE TABLE audit_login (
  id TEXT PRIMARY KEY,
  user_id TEXT,                          -- 用户ID
  user_name TEXT,                        -- 用户姓名
  login_type TEXT DEFAULT 'password',   -- 登录方式
  ip_address TEXT,                       -- IP地址
  user_agent TEXT,                       -- 用户代理
  login_status TEXT DEFAULT 'success',  -- success/failed
  fail_reason TEXT,                      -- 失败原因
  login_time TEXT NOT NULL,              -- 登录时间
  logout_time TEXT,                      -- 登出时间
  session_duration INTEGER,              -- 会话时长（秒）
  FOREIGN KEY (user_id) REFERENCES sys_users(id)
);
```

### 3.4 索引设计（性能优化）

```sql
-- 系统配置表索引
CREATE INDEX idx_sys_users_code ON sys_users(user_code);
CREATE INDEX idx_sys_users_role ON sys_users(role);
CREATE INDEX idx_sys_users_dept ON sys_users(department_id);
CREATE INDEX idx_sys_users_status ON sys_users(status);
CREATE INDEX idx_sys_departments_parent ON sys_departments(parent_id);
CREATE INDEX idx_sys_greenhouses_base ON sys_greenhouses(base_id);
CREATE INDEX idx_sys_materials_category ON sys_materials(category_id);

-- 业务表索引
CREATE INDEX idx_biz_production_plans_code ON biz_production_plans(plan_code);
CREATE INDEX idx_biz_production_plans_type ON biz_production_plans(plan_type);
CREATE INDEX idx_biz_production_plans_status ON biz_production_plans(batch_status);
CREATE INDEX idx_biz_production_plans_crop ON biz_production_plans(crop_name);
CREATE INDEX idx_biz_production_plans_date ON biz_production_plans(publish_date);

CREATE INDEX idx_biz_seed_sources_code ON biz_seed_sources(source_code);
CREATE INDEX idx_biz_seed_sources_crop ON biz_seed_sources(crop_name);
CREATE INDEX idx_biz_seed_sources_supplier ON biz_seed_sources(supplier_id);
CREATE INDEX idx_biz_seed_sources_plan ON biz_seed_sources(production_plan_id);

CREATE INDEX idx_biz_seedlings_code ON biz_seedlings(seedling_code);
CREATE INDEX idx_biz_seedlings_crop ON biz_seedlings(crop_name);
CREATE INDEX idx_biz_seedlings_source ON biz_seedlings(source_id);
CREATE INDEX idx biz_seedlings_plan ON biz_seedlings(production_plan_id);
CREATE INDEX idx_biz_seedlings_status ON biz_seedlings(status);

CREATE INDEX idx_biz_plantings_code ON biz_plantings(planting_code);
CREATE INDEX idx_biz_plantings_crop ON biz_plantings(crop_name);
CREATE INDEX idx_biz_plantings_greenhouse ON biz_plantings(greenhouse_id);
CREATE INDEX idx_biz_plantings_status ON biz_plantings(status);

CREATE INDEX idx_biz_harvest_records_code ON biz_harvest_records(harvest_code);
CREATE INDEX idx_biz_harvest_records_crop ON biz_harvest_records(crop_name);
CREATE INDEX idx_biz_harvest_records_date ON biz_harvest_records(harvest_date);
CREATE INDEX idx_biz_harvest_records_status ON biz_harvest_records(status);

CREATE INDEX idx_biz_inventory_stocks_instance ON biz_inventory_stocks(instance_id);
CREATE INDEX idx_biz_inventory_stocks_type ON biz_inventory_stocks(stock_type);
CREATE INDEX idx_biz_inventory_stocks_business ON biz_inventory_stocks(business_id);
CREATE INDEX idx_biz_inventory_stocks_crop ON biz_inventory_stocks(crop_name);
CREATE INDEX idx_biz_inventory_stocks_status ON biz_inventory_stocks(status);

CREATE INDEX idx_biz_inventory_transactions_stock ON biz_inventory_transactions(stock_id);
CREATE INDEX idx_biz_inventory_transactions_type ON biz_inventory_transactions(transaction_type);
CREATE INDEX idx_biz_inventory_transactions_time ON biz_inventory_transactions(operation_time);

CREATE INDEX idx_biz_farm_tasks_code ON biz_farm_tasks(task_code);
CREATE INDEX idx_biz_farm_tasks_assignee ON biz_farm_tasks(assignee_id);
CREATE INDEX idx_biz_farm_tasks_batch ON biz_farm_tasks(batch_id);
CREATE INDEX idx_biz_farm_tasks_status ON biz_farm_tasks(status);
CREATE INDEX idx_biz_farm_tasks_date ON biz_farm_tasks(plan_date);
CREATE INDEX idx_biz_farm_tasks_type ON biz_farm_tasks(task_type);

CREATE INDEX idx_biz_inspections_code ON biz_inspections(record_code);
CREATE INDEX idx_biz_inspections_inspector ON biz_inspections(inspector_id);
CREATE INDEX idx_biz_inspections_greenhouse ON biz_inspections(greenhouse_id);
CREATE INDEX idx_biz_inspections_date ON biz_inspections(check_date);

CREATE INDEX idx_biz_problems_code ON biz_problems(problem_code);
CREATE INDEX idx_biz_problems_reporter ON biz_problems(reporter_id);
CREATE INDEX idx_biz_problems_assignee ON biz_problems(assignee_id);
CREATE INDEX idx_biz_problems_status ON biz_problems(status);

CREATE INDEX idx_biz_attendance_user ON biz_attendance(user_id);
CREATE INDEX idx_biz_attendance_date ON biz_attendance(work_date);

CREATE INDEX idx_biz_labor_records_worker ON biz_labor_records(worker_id);
CREATE INDEX idx_biz_labor_records_date ON biz_labor_records(work_date);
CREATE INDEX idx_biz_labor_records_task ON biz_labor_records(task_id);

-- 审计表索引
CREATE INDEX idx_audit_operations_operator ON audit_operations(operator_id);
CREATE INDEX idx_audit_operations_type ON audit_operations(operation_type);
CREATE INDEX idx_audit_operations_business ON audit_operations(business_id);
CREATE INDEX idx_audit_operations_time ON audit_operations(operation_time);

CREATE INDEX idx_audit_approvals_code ON audit_approvals(approval_code);
CREATE INDEX idx_audit_approvals_applicant ON audit_approvals(applicant_id);
CREATE INDEX idx_audit_approvals_status ON audit_approvals(status);

CREATE INDEX idx_audit_login_user ON audit_login(user_id);
CREATE INDEX idx_audit_login_time ON audit_login(login_time);
```

---

## 4. 数据迁移策略

### 4.1 迁移原则

1. **完整性**: 所有数据必须完整迁移，不丢失任何记录
2. **一致性**: 迁移过程中保证数据一致性
3. **可回滚**: 支持回滚到迁移前状态
4. **可追溯**: 记录迁移日志，便于问题排查
5. **不停服**: 支持增量迁移，服务不中断

### 4.2 迁移阶段

```
┌─────────────────────────────────────────────────────────────────┐
│                     阶段一：准备阶段                              │
│  - 数据清洗与规范化                                              │
│  - 关联关系建立                                                  │
│  - 迁移脚本编写                                                  │
│  - 回滚方案制定                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     阶段二：试迁移                              │
│  - 迁移10%数据作为测试                                           │
│  - 验证数据完整性                                                │
│  - 验证业务关联正确性                                            │
│  - 性能测试                                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     阶段三：正式迁移                            │
│  - 增量迁移（分批次）                                            │
│  - 实时同步（双写）                                              │
│  - 数据校验                                                      │
│  - 切换完成                                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     阶段四：验证与回滚                          │
│  - 功能验证                                                      │
│  - 数据校验                                                      │
│  - 回滚演练（如需要）                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 localStorage到SQLite的迁移映射

| localStorage Key | SQLite 表 | 迁移说明 |
|-----------------|----------|---------|
| yuanxingtu_tasks | biz_farm_tasks | 主表迁移 |
| yuanxingtu_my_tasks | biz_farm_tasks | 通过assignee_id关联 |
| yuanxingtu_tempTasks | biz_farm_tasks | task_type='temp'标识 |
| yuanxingtu_inspections | biz_inspections | 主表迁移 |
| yuanxingtu_daily_problems | biz_problems | 主表迁移 |
| yuanxingtu_worklogs | biz_labor_records | 主表迁移 |
| yuanxingtu_attendance | biz_attendance | 主表迁移 |
| yuanxingtu_operationRecords | audit_operations | 主表迁移 |
| yuanxingtu_dispatch_records | biz_farm_tasks | dispatch相关字段 |
| inventory_stock_v3 | biz_inventory_stocks | V3格式转换 |
| inventory_transaction_v3 | biz_inventory_transactions | V3格式转换 |
| inventory_freeze_v3 | biz_inventory_freezes | V3格式转换 |

### 4.4 迁移脚本模板

```javascript
/**
 * localStorage 到 SQLite 迁移脚本
 * 迁移任务数据示例
 */

async function migrateTasks() {
  const db = getDatabase();
  const tasksData = localStorage.getItem('yuanxingtu_tasks');
  
  if (!tasksData) {
    console.log('无任务数据需要迁移');
    return { success: true, count: 0 };
  }

  const tasks = JSON.parse(tasksData);
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  // 开启事务
  db.run('BEGIN TRANSACTION');

  try {
    for (const task of tasks) {
      // 验证关联数据是否存在
      const greenhouse = await validateGreenhouse(task.greenhouseId);
      const assignee = await validateUser(task.assigneeId);
      const batch = await validateProductionPlan(task.batchId);

      // 生成新编码
      const newCode = generateTaskCode(task);

      // 插入新表
      db.run(`
        INSERT INTO biz_farm_tasks (
          id, task_code, task_title, task_type, task_content,
          batch_id, batch_code, greenhouse_id, greenhouse_name,
          assignee_id, assignee_name, assigner_id, assigner_name,
          plan_date, plan_time, priority, status,
          create_by, create_time, update_by, update_time, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        task.id || `TASK${Date.now()}`,
        newCode,
        task.title,
        task.type,
        task.description,
        batch?.id || null,
        task.batchCode || null,
        greenhouse?.id || null,
        task.greenhouseName || null,
        assignee?.id || null,
        task.assigneeName || null,
        task.assignerId || null,
        task.assignerName || null,
        task.dueDate || null,
        task.planTime || null,
        task.priority || 'medium',
        mapTaskStatus(task.status),
        task.createBy || 'system',
        task.createTime || new Date().toISOString(),
        task.updateBy || 'system',
        new Date().toISOString(),
        1
      ]);

      results.success++;
    }

    db.run('COMMIT');
    console.log(`任务迁移完成: 成功 ${results.success}, 失败 ${results.failed}`);
  } catch (error) {
    db.run('ROLLBACK');
    results.errors.push(error.message);
    console.error('任务迁移失败:', error);
  }

  return results;
}
```

### 4.5 数据校验清单

```javascript
/**
 * 迁移后数据校验
 */
async function validateMigratedData() {
  const checks = [];

  // 1. 记录数校验
  const localTaskCount = JSON.parse(localStorage.getItem('yuanxingtu_tasks') || '[]').length;
  const sqliteTaskCount = await db.get('SELECT COUNT(*) as count FROM biz_farm_tasks');
  checks.push({
    type: 'count',
    table: 'biz_farm_tasks',
    expected: localTaskCount,
    actual: sqliteTaskCount.count,
    passed: localTaskCount === sqliteTaskCount.count
  });

  // 2. 关联完整性校验
  const orphanedTasks = await db.get(`
    SELECT COUNT(*) as count FROM biz_farm_tasks 
    WHERE greenhouse_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM sys_greenhouses WHERE id = biz_farm_tasks.greenhouse_id)
  `);
  checks.push({
    type: 'foreign_key',
    table: 'biz_farm_tasks',
    field: 'greenhouse_id',
    orphaned: orphanedTasks.count,
    passed: orphanedTasks.count === 0
  });

  // 3. 必填字段校验
  const nullTitles = await db.get(`
    SELECT COUNT(*) as count FROM biz_farm_tasks WHERE task_title IS NULL OR task_title = ''
  `);
  checks.push({
    type: 'required_field',
    table: 'biz_farm_tasks',
    field: 'task_title',
    nullCount: nullTitles.count,
    passed: nullTitles.count === 0
  });

  // 4. 状态值校验
  const invalidStatus = await db.get(`
    SELECT COUNT(*) as count FROM biz_farm_tasks 
    WHERE status NOT IN ('pending', 'in_progress', 'completed', 'cancelled')
  `);
  checks.push({
    type: 'enum_value',
    table: 'biz_farm_tasks',
    field: 'status',
    invalidCount: invalidStatus.count,
    passed: invalidStatus.count === 0
  });

  return checks;
}
```

---

## 5. 业务关联设计

### 5.1 核心业务关联图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           业务数据关联图                                │
└─────────────────────────────────────────────────────────────────────────┘

     ┌─────────────┐
     │   用户      │◄──────┐
     │ sys_users   │       │ create_by
     └──────┬──────┘       │
            │              │
            ├──────────────┴──────────────┐
            │                              │
     ┌──────▼──────┐              ┌────────▼────────┐
     │   部门      │              │   生产计划       │
     │sys_depts   │              │biz_prod_plans   │
     └─────────────┘              └────────┬────────┘
                                           │
            ┌──────────────────────────────┼──────────────────────────────┐
            │                              │                              │
     ┌──────▼──────┐              ┌────────▼────────┐            ┌───────▼──────┐
     │   种源      │              │     育苗        │            │    种植      │
     │biz_seed_src │              │biz_seedlings   │            │biz_plantings │
     └──────┬──────┘              └────────┬────────┘            └───────┬──────┘
            │                              │                              │
            │ source_id                    │ source_id                     │ source_id
            │ production_plan_id           │ production_plan_id            │ production_plan_id
            │                              │                              │
            └──────────────────────────────┼──────────────────────────────┘
                                           │
                                    ┌──────▼──────┐
                                    │    采收     │
                                    │biz_harvest  │
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │    库存     │
                                    │biz_inventory│
                                    └──────┬──────┘
                                           │
                                           │ business_id, business_type
                                           ▼
                              ┌─────────────────────┐
                              │    库存事务         │
                              │biz_inventory_trans  │
                              └─────────────────────┘
```

### 5.2 关键业务关联字段

| 源表 | 目标表 | 关联字段 | 关联类型 | 说明 |
|-----|-------|---------|---------|-----|
| biz_production_plans | biz_seed_sources | id → production_plan_id | 1:N | 种源关联生产计划 |
| biz_production_plans | biz_seedlings | id → production_plan_id | 1:N | 育苗关联生产计划 |
| biz_seed_sources | biz_seedlings | id → source_id | 1:N | 育苗使用种源 |
| biz_seedlings | biz_plantings | id → source_id | 1:N | 种植使用种苗 |
| biz_plantings | biz_harvest_records | id → source_id | 1:N | 采收关联种植 |
| biz_production_plans | biz_farm_tasks | id → batch_id | 1:N | 任务关联生产计划 |
| biz_harvest_records | biz_inventory_stocks | id → business_id | 1:1 | 采收入库 |
| sys_greenhouses | biz_plantings | id → greenhouse_id | 1:N | 种植关联温室 |
| sys_users | biz_farm_tasks | id → assignee_id | 1:N | 任务分配给用户 |
| sys_users | biz_labor_records | id → worker_id | 1:N | 人工记录关联工人 |

### 5.3 数据追溯链

```
种源采购 ──────────────────────────────────────────────────────────────┐
    │                                                                │
    ▼                                                                ▼
种源入库 ──► 育苗 ──► 定植 ──► 生长 ──► 采收 ──► 成品入库 ──► 销售
             │                  │                      │
             ▼                  ▼                      ▼
          库存(种苗)         库存(种苗)            库存(成品)
             │                  │                      │
             └──────────────────┴──────────────────────┘
                                │
                                ▼
                          库存追溯表
```

### 5.4 溯源查询实现

```sql
-- 查询某批成品的完整溯源链
WITH RECURSIVE trace_chain AS (
  -- 起点：成品库存
  SELECT 
    id, instance_id, stock_type, business_id, business_type,
    source_instance_id, source_business_id, source_business_type,
    1 as level,
    '成品: ' || crop_name || ' x ' || current_quantity || unit as info
  FROM biz_inventory_stocks 
  WHERE instance_id = 'IPR-20260501-001'
  
  UNION ALL
  
  -- 递归：向上追溯
  SELECT 
    s.id, s.instance_id, s.stock_type, s.business_id, s.business_type,
    s.source_instance_id, s.source_business_id, s.source_business_type,
    tc.level + 1,
    CASE s.stock_type
      WHEN 'seedling' THEN '种苗: ' || s.crop_name
      WHEN 'seed' THEN '种源: ' || s.crop_name
      ELSE '未知'
    END
  FROM biz_inventory_stocks s
  INNER JOIN trace_chain tc ON s.instance_id = tc.source_instance_id
)
SELECT * FROM trace_chain ORDER BY level DESC;
```

---

## 6. 审核流程设计

### 6.1 审批类型定义

| 审批类型 | 编码 | 审批级别 | 触发条件 |
|---------|------|---------|---------|
| 物资领料 | material_request | 2级 | 提交领料单 |
| 采购申请 | purchase_request | 2级 | 提交采购单 |
| 种源补录 | seed_source_supplementary | 1级 | 补录种源记录 |
| 育苗补录 | seedling_supplementary | 1级 | 补录育苗记录 |
| 采收补录 | harvest_supplementary | 1级 | 补录采收记录 |
| 请假申请 | leave | 2级 | 提交请假单 |
| 加班申请 | overtime | 1级 | 提交加班单 |
| 离职申请 | resignation | 3级 | 提交离职单 |

### 6.2 审批流程状态机

```
                    ┌──────────┐
                    │  草稿    │
                    └────┬─────┘
                         │ submit
                         ▼
                    ┌──────────┐
         ┌─────────►│  待审批  │
         │          └────┬─────┘
         │               │
    reject               │ approve
         │               ▼
         │          ┌──────────┐
         │          │  审批中  │
         │          └────┬─────┘
         │               │
    ┌────┴────┐    ┌─────┴─────┐
    │         │    │           │
 reject    step>    │      step=total
    │         │    │           │
    ▼         │    ▼           ▼
┌──────────┐ │  ┌────────┐ ┌──────────┐
│  已拒绝  │ │  │ 下一级 │ │  已通过  │
└──────────┘ │  └────────┘ └──────────┘
             │      │
             └──────┘  (循环直到step>total)
```

### 6.3 审批联动业务

```javascript
/**
 * 审批通过后的业务联动
 */

// 1. 物资领料审批通过 → 库存减少
async function onMaterialApprovalApproved(approval) {
  const materialLink = approval.businessLink;
  
  // 开启事务
  db.run('BEGIN TRANSACTION');
  
  try {
    // 遍历领料明细
    for (const item of materialLink.materials) {
      // 查询库存
      const stock = await db.get(`
        SELECT * FROM biz_inventory_stocks 
        WHERE business_id = ? AND status = 'in_stock'
      `, [item.materialId]);
      
      if (!stock) {
        throw new Error(`物资 ${item.materialName} 库存不足`);
      }
      
      // 创建出库事务
      await db.run(`
        INSERT INTO biz_inventory_transactions (
          id, transaction_id, stock_id, instance_id, transaction_type,
          business_type, business_id, quantity,
          quantity_before, quantity_after, unit,
          operator_id, operator_name, operation_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `TRX${Date.now()}`,
        `TRX-${Date.now()}`,
        stock.id,
        stock.instance_id,
        'outbound',
        'material_request',
        approval.id,
        item.approvedQuantity,
        stock.current_quantity,
        stock.current_quantity - item.approvedQuantity,
        item.unit,
        approval.applicant_id,
        approval.applicant_name,
        new Date().toISOString()
      ]);
      
      // 更新库存
      await db.run(`
        UPDATE biz_inventory_stocks 
        SET current_quantity = current_quantity - ?,
            available_quantity = available_quantity - ?,
            update_time = ?
        WHERE id = ?
      `, [item.approvedQuantity, item.approvedQuantity, new Date().toISOString(), stock.id]);
    }
    
    // 更新审批状态
    await db.run(`
      UPDATE audit_approvals 
      SET status = 'approved', finish_time = ?
      WHERE id = ?
    `, [new Date().toISOString(), approval.id]);
    
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

// 2. 种源补录审批通过 → 更新种源状态
async function onSeedSourceSupplementaryApproved(approval) {
  const seedSourceLink = approval.businessLink;
  
  await db.run(`
    UPDATE biz_seed_sources 
    SET status = 'approved',
        update_time = ?,
        update_by = ?
    WHERE source_code = ?
  `, [new Date().toISOString(), approval.applicant_id, seedSourceLink.requestCode]);
}

// 3. 采收审批通过 → 创建库存记录
async function onHarvestApprovalApproved(approval) {
  const harvestLink = approval.businessLink;
  
  // 查询采收记录
  const harvest = await db.get(`
    SELECT * FROM biz_harvest_records WHERE harvest_code = ?
  `, [harvestLink.requestCode]);
  
  // 创建库存
  await db.run(`
    INSERT INTO biz_inventory_stocks (
      id, instance_id, stock_type, business_id, business_type,
      crop_name, variety_name, current_quantity, frozen_quantity,
      available_quantity, unit, source_type, inbound_date,
      production_plan_id, production_plan_code, status,
      create_by, create_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    `INV${Date.now()}`,
    `IPR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(await getInventorySequence()).padStart(3,'0')}`,
    'product',
    harvest.id,
    'harvest',
    harvest.crop_name,
    harvest.crop_variety,
    harvest.harvest_quantity,
    0,
    harvest.harvest_quantity,
    harvest.unit,
    'self_produced',
    harvest.harvest_date,
    null, null,
    'in_stock',
    approval.applicant_id,
    new Date().toISOString()
  ]);
}
```

### 6.4 审批查询API

```sql
-- 查询待我审批的列表
SELECT 
  a.id, a.approval_code, a.approval_type, a.business_code,
  u.user_name as applicant_name,
  a.current_step, a.total_steps,
  a.submit_time,
  CASE a.approval_type
    WHEN 'material_request' THEN '物资领料'
    WHEN 'purchase_request' THEN '采购申请'
    WHEN 'leave' THEN '请假申请'
    ELSE a.approval_type
  END as type_name
FROM audit_approvals a
INNER JOIN sys_users u ON a.applicant_id = u.id
WHERE a.status = 'pending'
AND EXISTS (
  SELECT 1 FROM audit_approval_steps s
  WHERE s.approval_id = a.id
  AND s.approver_id = ?  -- 当前用户ID
  AND s.step_order = a.current_step
  AND s.action IS NULL   -- 未操作
)
ORDER BY a.submit_time DESC;

-- 查询审批进度
SELECT 
  s.step_order,
  s.approver_name,
  s.action,
  s.comment,
  s.action_time
FROM audit_approval_steps s
WHERE s.approval_id = ?
ORDER BY s.step_order;
```

---

## 7. 系统设置模块优化

### 7.1 系统设置模块架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      系统设置模块                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  基地管理   │  │  温室管理   │  │  作物管理   │              │
│  │  Base Mgmt  │  │Greenhouse  │  │  Crop Mgmt  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  部门管理   │  │  岗位管理   │  │  人员管理   │              │
│  │  Dept Mgmt  │  │ Position    │  │  User Mgmt  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  供应商管理  │  │  物资管理   │  │  工序管理   │              │
│  │ Supplier    │  │ Material    │  │  Process    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ 审批流程配置 │  │  编码规则   │  │  数据字典   │              │
│  │Approval Flow│  │Code Rule    │  │ Dictionary  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 基地与温室层级管理

```sql
-- 基地树形查询
WITH RECURSIVE base_tree AS (
  SELECT id, base_name, parent_id, 0 as level
  FROM sys_bases WHERE parent_id IS NULL
  UNION ALL
  SELECT b.id, b.base_name, b.parent_id, bt.level + 1
  FROM sys_bases b
  INNER JOIN base_tree bt ON b.parent_id = bt.id
)
SELECT * FROM base_tree ORDER BY level, base_name;

-- 温室按基地分组
SELECT 
  g.id, g.greenhouse_code, g.greenhouse_name,
  g.area, g.status,
  b.base_name
FROM sys_greenhouses g
LEFT JOIN sys_bases b ON g.base_id = b.id
ORDER BY b.base_name, g.greenhouse_name;
```

### 7.3 审批流程配置

```javascript
/**
 * 审批流程配置数据结构
 */

const approvalFlowConfig = {
  // 物资领料审批流
  material_request: {
    flow_code: 'FLOW_MATERIAL',
    flow_name: '物资领料审批',
    flow_type: 'material_request',
    approval_levels: 2,
    approver_rules: [
      {
        level: 1,
        approver_type: 'approver_role',
        approver_value: 'supervisor',
        approver_label: '组长审批'
      },
      {
        level: 2,
        approver_type: 'approver_role',
        approver_value: 'manager',
        approver_label: '经理审批'
      }
    ],
    auto_approve_rules: [
      {
        condition: 'amount < 1000',
        action: 'skip_levels',
        skip_to_level: 2
      }
    ],
    timeout_hours: 72
  },
  
  // 请假审批流
  leave: {
    flow_code: 'FLOW_LEAVE',
    flow_name: '请假审批',
    flow_type: 'leave',
    approval_levels: 2,
    approver_rules: [
      {
        level: 1,
        approver_type: 'approver_manager',
        approver_label: '直属上级审批'
      },
      {
        level: 2,
        approver_type: 'approver_role',
        approver_value: 'hr',
        approver_label: '人事审批'
      }
    ],
    timeout_hours: 48
  }
};
```

### 7.4 编码规则管理

```javascript
/**
 * 编码规则配置
 */

const codeRules = {
  // 生产计划编码规则
  production_plan: {
    prefix: '{plan_type}',
    dateFormat: 'YYYY',
    sequenceLength: 3,
    planTypeMap: {
      'seed_breeding': 'JZB',
      'seedling': 'YMB',
      'planting': 'ZZB'
    }
  },
  
  // 任务编码规则
  farm_task: {
    prefix: 'WD',
    dateFormat: 'YYYYMMDD',
    sequenceLength: 3,
    example: 'WD20260502-001'
  },
  
  // 巡查编码规则
  inspection: {
    prefix: 'XC',
    dateFormat: 'YYYYMMDD',
    sequenceLength: 3,
    example: 'XC20260502-001'
  },
  
  // 库存实例编码规则
  inventory: {
    prefix: 'I{stock_type}',
    dateFormat: 'YYYYMMDD',
    sequenceLength: 3,
    stockTypeMap: {
      'seed': 'NS',
      'seedling': 'SE',
      'product': 'PR'
    },
    example: 'INS-20260502-001'
  }
};

/**
 * 编码生成函数
 */
function generateCode(ruleType, params = {}) {
  const rule = codeRules[ruleType];
  const date = new Date();
  
  let prefix = rule.prefix;
  if (params.plan_type && rule.planTypeMap) {
    prefix = rule.planTypeMap[params.plan_type];
  }
  if (params.stock_type && rule.stockTypeMap) {
    prefix = rule.stockTypeMap[params.stock_type].replace('{stock_type}', prefix);
  }
  
  const dateStr = date.format(rule.dateFormat);
  const sequence = getNextSequence(ruleType, dateStr);
  
  return `${prefix}${dateStr}-${String(sequence).padStart(rule.sequenceLength, '0')}`;
}
```

---

## 8. 实施计划与优先级

### 8.1 实施阶段

```
┌─────────────────────────────────────────────────────────────────┐
│                     第一阶段：基础架构（2周）                     │
├─────────────────────────────────────────────────────────────────┤
│  Week 1                                                         │
│  ├─ 数据库Schema设计与实现                                       │
│  ├─ 系统配置表CRUD API                                          │
│  └─ 用户认证API                                                 │
│                                                                  │
│  Week 2                                                         │
│  ├─ 基础数据迁移（用户/部门/岗位/基地/温室）                      │
│  ├─ 数据校验脚本                                                 │
│  └─ 回滚方案验证                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    第二阶段：业务数据迁移（3周）                  │
├─────────────────────────────────────────────────────────────────┤
│  Week 3                                                         │
│  ├─ 生产计划数据迁移                                             │
│  ├─ 种源/育苗/种植数据迁移                                       │
│  └─ 采收数据迁移                                                │
│                                                                  │
│  Week 4                                                         │
│  ├─ 农事任务数据迁移                                             │
│  ├─ 巡查/问题数据迁移                                            │
│  └─ 人工/考勤数据迁移                                            │
│                                                                  │
│  Week 5                                                         │
│  ├─ 库存数据迁移（V3格式转换）                                    │
│  ├─ 数据关联校验                                                 │
│  └─ 性能测试                                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    第三阶段：审批与联动（2周）                    │
├─────────────────────────────────────────────────────────────────┤
│  Week 6                                                         │
│  ├─ 审批API实现                                                 │
│  ├─ 审批流配置管理                                               │
│  └─ 审批联动业务逻辑                                             │
│                                                                  │
│  Week 7                                                         │
│  ├─ 审核流程测试                                                 │
│  ├─ 业务联动测试                                                │
│  └─ 异常处理测试                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    第四阶段：系统优化（2周）                     │
├─────────────────────────────────────────────────────────────────┤
│  Week 8                                                         │
│  ├─ 索引优化                                                    │
│  ├─ 分页查询优化                                                │
│  └─ 缓存策略实现                                                │
│                                                                  │
│  Week 9                                                         │
│  ├─ 并发测试（500用户）                                          │
│  ├─ 压力测试                                                   │
│  └─ 系统设置模块完善                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       第五阶段：上线准备（1周）                    │
├─────────────────────────────────────────────────────────────────┤
│  Week 10                                                        │
│  ├─ 数据最终校验                                                 │
│  ├─ 旧数据清理                                                  │
│  ├─ 文档编写                                                   │
│  └─ 培训与上线                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 优先级矩阵

| 优先级 | 模块 | 工作项 | 预计工时 |
|-------|------|-------|---------|
| P0 | 数据库 | Schema设计与实现 | 40h |
| P0 | 认证 | 用户登录/权限 | 24h |
| P0 | 迁移 | 用户/部门/岗位迁移 | 16h |
| P1 | 迁移 | 生产计划数据迁移 | 24h |
| P1 | 迁移 | 库存数据迁移 | 32h |
| P1 | 审批 | 审批API与配置 | 40h |
| P1 | 联动 | 审批业务联动 | 32h |
| P2 | 系统 | 系统设置完善 | 24h |
| P2 | 优化 | 索引与查询优化 | 16h |
| P2 | 测试 | 并发/压力测试 | 24h |

### 8.3 风险与应对

| 风险 | 等级 | 应对措施 |
|-----|------|---------|
| 数据丢失 | 高 | 迁移前完整备份，迁移后多轮校验 |
| 业务中断 | 高 | 增量迁移双写，上线窗口期切换 |
| 性能不足 | 中 | 索引优化，缓存策略，查询分页 |
| 关联丢失 | 中 | 外键约束，迁移后数据校验 |
| 并发冲突 | 中 | 乐观锁机制，事务隔离级别 |

---

## 9. 安全策略与风险控制

### 9.1 核心安全原则

```
┌─────────────────────────────────────────────────────────────────┐
│                     五大核心安全原则                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 【不丢数据】迁移过程原始数据零丢失                            │
│  2. 【可回滚】任何阶段可恢复到迁移前状态                         │
│  3. 【不停服】渐进式迁移，不影响业务连续性                        │
│  4. 【可验证】每步迁移后立即验证，不带问题上岗                     │
│  5. 【可监控】实时监控迁移状态，问题实时告警                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 三层备份策略

#### 第一层：本地备份（立即执行）
```javascript
/**
 * 第一层备份：本地localStorage数据导出
 * 迁移前立即执行，确保原始数据不丢失
 */
function backupToLocal() {
  const backupData = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    description: '迁移前完整备份',
    data: {}
  };

  // 备份所有localStorage键值
  const keys = [
    'yuanxingtu_tasks',
    'yuanxingtu_my_tasks',
    'yuanxingtu_tempTasks',
    'yuanxingtu_inspections',
    'yuanxingtu_daily_problems',
    'yuanxingtu_worklogs',
    'yuanxingtu_attendance',
    'yuanxingtu_operationRecords',
    'yuanxingtu_dispatch_records',
    'inventory_stock_v3',
    'inventory_transaction_v3',
    'inventory_freeze_v3'
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) {
      backupData.data[key] = JSON.parse(value);
    }
  }

  // 保存到文件（浏览器下载）
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_before_migration_${backupData.timestamp.slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  console.log('✅ 第一层备份完成，已下载到本地文件');
  return backupData;
}
```

#### 第二层：SQLite数据库备份（定时执行）
```javascript
/**
 * 第二层备份：SQLite数据库文件备份
 * 每次迁移前后执行
 */
async function backupSQLite() {
  const db = getDatabase();
  const data = db.export();
  const buffer = Buffer.from(data);

  // 保存到服务器指定目录
  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `yuanxingtu_backup_${timestamp}.db`);

  fs.writeFileSync(backupPath, buffer);
  console.log(`✅ SQLite备份完成: ${backupPath}`);

  // 保留最近10个备份，删除更旧的
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('yuanxingtu_backup_') && f.endsWith('.db'))
    .sort()
    .reverse();

  for (let i = 10; i < backups.length; i++) {
    fs.unlinkSync(path.join(backupDir, backups[i]));
    console.log(`🗑️ 删除过期备份: ${backups[i]}`);
  }

  return backupPath;
}
```

#### 第三层：Git分支备份（关键节点执行）
```bash
# 在关键迁移节点创建Git备份分支
git branch backup/pre-migration-$(date +%Y%m%d)
git add -A
git commit -m "chore: 迁移前备份 - $(date +%Y-%m-%d)"
```

### 9.3 渐进式迁移策略（不停服）

```
┌─────────────────────────────────────────────────────────────────┐
│                    渐进式迁移时间线                                │
└─────────────────────────────────────────────────────────────────┘

阶段1: 准备期（Day 1-2）
───────────────────────────────────────────────────────────
  ├─ 创建新数据库 schema
  ├─ 实现双写机制（localStorage + SQLite同时写入）
  └─ 用户无感知，继续使用旧系统

阶段2: 同步期（Day 3-5）
───────────────────────────────────────────────────────────
  ├─ 渐进式迁移历史数据（每天10%）
  ├─ 实时校验数据一致性
  ├─ 用户无感知，两套系统并行运行
  └─ 监控迁移状态和错误率

阶段3: 验证期（Day 6-7）
───────────────────────────────────────────────────────────
  ├─ 停止双写，切换到SQLite写入
  ├─ 完整数据一致性校验
  ├─ 保留localStorage为只读（应急回退）
  └─ 用户开始使用新系统

阶段4: 观察期（Day 8-14）
───────────────────────────────────────────────────────────
  ├─ 监控新系统运行状态
  ├─ 保留localStorage应急方案
  ├─ 确认无问题后清理旧数据
  └─ 迁移完成

回退触发条件（任一满足即回退）：
┌───────────────────────────────────────────────────────────┐
│  ⚠️ 错误率 > 1%                                          │
│  ⚠️ 响应时间 > 3秒（95%分位）                            │
│  ⚠️ 数据一致性校验失败                                    │
│  ⚠️ 用户反馈严重问题 > 5条                               │
└───────────────────────────────────────────────────────────┘
```

### 9.4 熔断与回滚机制

```javascript
/**
 * 熔断器：监控迁移健康状态
 */
class MigrationCircuitBreaker {
  constructor() {
    this.failureCount = 0;
    this.successCount = 0;
    this.threshold = 10;        // 连续失败10次触发熔断
    this.recoveryThreshold = 5; // 连续成功5次恢复
    this.state = 'CLOSED';      // CLOSED/OPEN/HALF_OPEN
    this.halfOpenSuccess = 0;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.successCount++;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccess++;
      if (this.halfOpenSuccess >= this.recoveryThreshold) {
        this.state = 'CLOSED';
        console.log('🔄 熔断器恢复：连续成功5次');
      }
    }
  }

  recordFailure() {
    this.failureCount++;
    this.successCount = 0;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.log('🚨 熔断器触发：连续失败10次，暂停迁移');
    }
  }

  canProceed() {
    return this.state !== 'OPEN';
  }
}

/**
 * 紧急回滚函数
 */
async function emergencyRollback() {
  console.log('🚨 紧急回滚启动...');

  // 1. 停止所有迁移写入
  migrationPaused = true;

  // 2. 恢复localStorage数据
  const latestBackup = localStorage.getItem('migration_backup_latest');
  if (latestBackup) {
    const backup = JSON.parse(latestBackup);
    for (const [key, value] of Object.entries(backup.data)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    console.log('✅ localStorage数据已恢复');
  }

  // 3. 恢复数据库到备份点
  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('yuanxingtu_backup_'))
    .sort()
    .reverse();

  if (backupFiles.length > 0) {
    const latestBackupPath = path.join(backupDir, backupFiles[0]);
    const buffer = fs.readFileSync(latestBackupPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(buffer);
    // 替换当前数据库
    fs.writeFileSync(DB_PATH, buffer);
    console.log('✅ SQLite数据库已恢复到备份点');
  }

  // 4. 切换回旧系统入口
  window.location.href = '/?use_legacy=true';

  // 5. 发送告警通知
  await sendAlert('紧急回滚已执行，请检查系统状态');

  console.log('✅ 紧急回滚完成');
}
```

### 9.5 实时监控与告警

```javascript
/**
 * 迁移健康监控
 */
const MigrationMonitor = {
  // 监控指标
  metrics: {
    totalRecords: 0,
    migratedRecords: 0,
    failedRecords: 0,
    errorRate: 0,
    avgLatency: 0,
    lastMigrationTime: null
  },

  // 错误日志
  errors: [],

  // 记录成功
  recordSuccess(tableName, recordId, latency) {
    this.metrics.migratedRecords++;
    this.metrics.lastMigrationTime = Date.now();
    this.metrics.avgLatency = (this.metrics.avgLatency + latency) / 2;

    // 写入操作日志
    this.logOperation('SUCCESS', tableName, recordId);
  },

  // 记录失败
  recordFailure(tableName, recordId, error) {
    this.metrics.failedRecords++;
    this.metrics.errorRate = this.metrics.failedRecords / this.metrics.totalRecords;

    this.errors.push({
      tableName,
      recordId,
      error: error.message,
      time: new Date().toISOString()
    });

    this.logOperation('FAILURE', tableName, recordId, error.message);

    // 错误率超过1%触发告警
    if (this.metrics.errorRate > 0.01) {
      this.triggerAlert(`错误率超过1%: ${(this.metrics.errorRate * 100).toFixed(2)}%`);
    }
  },

  // 发送告警
  async triggerAlert(message) {
    console.error(`🚨 [迁移告警] ${message}`);

    // 写入日志文件
    const alertLog = {
      type: 'ALERT',
      message,
      metrics: this.metrics,
      time: new Date().toISOString()
    };
    fs.appendFileSync(
      path.join(backupDir, 'migration_alerts.log'),
      JSON.stringify(alertLog) + '\n'
    );

    // 可以扩展：发送邮件/钉钉/短信通知
  },

  // 获取监控状态
  getStatus() {
    return {
      ...this.metrics,
      errorRate: `${(this.metrics.errorRate * 100).toFixed(2)}%`,
      recentErrors: this.errors.slice(-10),
      state: this.metrics.errorRate > 0.01 ? 'DEGRADED' : 'HEALTHY'
    };
  }
};
```

### 9.6 数据一致性校验（每步必执行）

```javascript
/**
 * 数据一致性校验清单
 * 每次迁移后必须执行，确保数据完整正确
 */
async function runConsistencyChecks() {
  const checks = [];
  const results = {
    passed: [],
    failed: []
  };

  // 1. 记录数校验
  const localTasks = JSON.parse(localStorage.getItem('yuanxingtu_tasks') || '[]').length;
  const sqliteTasks = await db.get('SELECT COUNT(*) as count FROM biz_farm_tasks');
  const taskCheck = {
    name: '任务记录数一致',
    type: 'count',
    expected: localTasks,
    actual: sqliteTasks.count,
    passed: localTasks === sqliteTasks.count
  };
  checks.push(taskCheck);

  // 2. 外键关联完整性
  const orphanedGreenhouses = await db.get(`
    SELECT COUNT(*) as count FROM biz_farm_tasks
    WHERE greenhouse_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys_greenhouses WHERE id = biz_farm_tasks.greenhouse_id)
  `);
  const fkCheck = {
    name: '温室外键关联完整',
    type: 'foreign_key',
    orphaned: orphanedGreenhouses.count,
    passed: orphanedGreenhouses.count === 0
  };
  checks.push(fkCheck);

  // 3. 必填字段校验
  const nullTitles = await db.get(`
    SELECT COUNT(*) as count FROM biz_farm_tasks
    WHERE task_title IS NULL OR task_title = ''
  `);
  const requiredCheck = {
    name: '任务标题必填',
    type: 'required_field',
    nullCount: nullTitles.count,
    passed: nullTitles.count === 0
  };
  checks.push(requiredCheck);

  // 4. 枚举值校验
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  const invalidStatuses = await db.get(`
    SELECT COUNT(*) as count FROM biz_farm_tasks
    WHERE status NOT IN (${validStatuses.map(s => `'${s}'`).join(',')})
  `);
  const enumCheck = {
    name: '任务状态值有效',
    type: 'enum_value',
    invalidCount: invalidStatuses.count,
    passed: invalidStatuses.count === 0
  };
  checks.push(enumCheck);

  // 5. 数据完整性（汇总校验）
  const incompleteRecords = await db.get(`
    SELECT COUNT(*) as count FROM biz_farm_tasks
    WHERE task_code IS NULL OR task_title IS NULL OR assignee_name IS NULL
  `);
  const completenessCheck = {
    name: '关键字段完整',
    type: 'completeness',
    incomplete: incompleteRecords.count,
    passed: incompleteRecords.count === 0
  };
  checks.push(completenessCheck);

  // 汇总结果
  for (const check of checks) {
    if (check.passed) {
      results.passed.push(check);
    } else {
      results.failed.push(check);
    }
  }

  console.log(`✅ 校验完成: 通过 ${results.passed.length}, 失败 ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.error('❌ 失败的校验项:');
    results.failed.forEach(f => console.error(`  - ${f.name}: ${JSON.stringify(f)}`));
  }

  return results;
}

/**
 * 生成校验报告
 */
function generateValidationReport(checks) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.filter(c => c.passed).length,
      failed: checks.filter(c => !c.passed).length
    },
    details: checks
  };

  // 保存报告
  const reportPath = path.join(backupDir, `validation_report_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}
```

### 9.7 用户无感知策略

```
┌─────────────────────────────────────────────────────────────────┐
│                    用户无感知迁移策略                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  【双轨并行】                                                   │
│  ┌────────────────────┐    ┌────────────────────┐              │
│  │   旧系统入口        │    │   新系统入口        │              │
│  │ (localStorage读写)   │    │  (SQLite读写)       │              │
│  └─────────┬──────────┘    └─────────┬──────────┘              │
│            │                          │                          │
│            └──────────┬───────────────┘                          │
│                       ▼                                          │
│              ┌─────────────────┐                                 │
│              │   数据同步层     │                                 │
│              │ (静默同步中...) │                                 │
│              └────────┬────────┘                                 │
│                       │                                          │
│            ┌──────────┴──────────┐                               │
│            ▼                     ▼                               │
│    ┌──────────────┐     ┌──────────────┐                        │
│    │ localStorage │     │   SQLite     │                        │
│    │  (只读备份)  │     │  (主存储)    │                        │
│    └──────────────┘     └──────────────┘                        │
│                                                                  │
│  【渐进式切换】                                                  │
│  Day 1-3: 100% localStorage → 100% localStorage（观察）        │
│  Day 4-5: 100% localStorage → 80% localStorage + 20% SQLite     │
│  Day 6-7: 60% localStorage → 40% SQLite（并行运行）              │
│  Day 8+:  0% localStorage → 100% SQLite（完全切换）               │
│                                                                  │
│  【回退机制】                                                    │
│  任何时刻用户可通过URL参数 ?use_legacy=true 切换回旧系统        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.8 迁移检查点清单

```javascript
/**
 * 迁移检查点清单
 * 每个检查点必须全部通过才能进入下一阶段
 */
const MigrationCheckpoints = {
  // 检查点1：环境验证
  checkpoint1_env: {
    name: '环境验证',
    checks: [
      { id: 'db_exists', desc: 'SQLite数据库文件存在' },
      { id: 'schema_valid', desc: '数据库Schema有效' },
      { id: 'backup_exists', desc: '本地备份已创建' },
      { id: 'git_backup', desc: 'Git备份分支已创建' }
    ]
  },

  // 检查点2：数据迁移
  checkpoint2_migration: {
    name: '数据迁移',
    checks: [
      { id: 'users_migrated', desc: '用户数据迁移完成' },
      { id: 'depts_migrated', desc: '部门数据迁移完成' },
      { id: 'bases_migrated', desc: '基地数据迁移完成' },
      { id: 'tasks_migrated', desc: '任务数据迁移完成' },
      { id: 'inventory_migrated', desc: '库存数据迁移完成' }
    ]
  },

  // 检查点3：一致性校验
  checkpoint3_validation: {
    name: '一致性校验',
    checks: [
      { id: 'count_match', desc: '记录数一致' },
      { id: 'fk_integrity', desc: '外键关联完整' },
      { id: 'required_fields', desc: '必填字段完整' },
      { id: 'enum_values', desc: '枚举值有效' }
    ]
  },

  // 检查点4：功能验证
  checkpoint4_functional: {
    name: '功能验证',
    checks: [
      { id: 'login_works', desc: '登录功能正常' },
      { id: 'crud_works', desc: '增删改查功能正常' },
      { id: 'approval_works', desc: '审批流程正常' },
      { id: 'report_works', desc: '报表功能正常' }
    ]
  },

  // 检查点5：性能验证
  checkpoint5_performance: {
    name: '性能验证',
    checks: [
      { id: 'response_time', desc: '响应时间 < 2秒' },
      { id: 'no_memory_leak', desc: '无内存泄漏' },
      { id: 'concurrent_ok', desc: '50并发无报错' }
    ]
  }
};

/**
 * 执行检查点验证
 */
async function runCheckpoint(checkpointId) {
  const checkpoint = MigrationCheckpoints[checkpointId];
  const results = [];

  for (const check of checkpoint.checks) {
    const result = await executeCheck(check);
    results.push(result);
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`📋 ${checkpoint.name}: ${passed}/${total} 通过`);

  return {
    checkpointId,
    checkpointName: checkpoint.name,
    passed,
    total,
    allPassed: passed === total,
    details: results
  };
}
```

### 9.9 应急回退操作手册

```
┌─────────────────────────────────────────────────────────────────┐
│                      应急回退操作手册                            │
└─────────────────────────────────────────────────────────────────┘

【触发条件】
  1. 迁移后系统错误率 > 5%
  2. 用户无法正常登录或使用核心功能
  3. 数据一致性校验连续失败
  4. 收到P0级告警

【回退步骤】

Step 1: 暂停服务（2分钟内）
──────────────────────────────────────────────────────────────
  ├─ 在管理后台开启"维护模式"
  ├─ 用户看到"系统维护中"页面
  └─ 禁止新用户登录

Step 2: 通知相关人员（5分钟内）
──────────────────────────────────────────────────────────────
  ├─ 发送钉钉/微信群通知
  ├─ 通知技术负责人
  └─ 通知业务负责人

Step 3: 执行数据回滚（10分钟内）
──────────────────────────────────────────────────────────────
  ├─ 执行 emergencyRollback() 函数
  ├─ 验证localStorage数据完整性
  └─ 验证旧系统可正常访问

Step 4: 验证核心功能（15分钟内）
──────────────────────────────────────────────────────────────
  ├─ 验证登录功能
  ├─ 验证任务CRUD
  ├─ 验证审批流程
  └─ 验证数据完整性

Step 5: 恢复服务（20分钟内）
──────────────────────────────────────────────────────────────
  ├─ 关闭"维护模式"
  ├─ 用户恢复正常访问
  └─ 发送服务恢复通知

【回退完成后的处理】
──────────────────────────────────────────────────────────────
  1. 分析失败原因
  2. 制定修复计划
  3. 择机重新迁移
  4. 更新迁移方案

【联系方式】
──────────────────────────────────────────────────────────────
  技术负责人: [填写联系方式]
  业务负责人: [填写联系方式]
  紧急电话: [填写联系方式]
```

### 9.10 安全上线检查清单

```javascript
/**
 * 安全上线前最终检查
 */
const PreLaunchChecklist = {
  // 环境检查
  environment: [
    '✅ SQLite数据库文件权限正确',
    '✅ 备份文件已创建且可恢复',
    '✅ Git备份分支已创建',
    '✅ 日志目录可写'
  ],

  // 数据检查
  data: [
    '✅ 所有localStorage数据已迁移',
    '✅ 数据一致性校验100%通过',
    '✅ 关联关系完整无丢失',
    '✅ 枚举值范围正确'
  ],

  // 功能检查
  functionality: [
    '✅ 用户登录/登出正常',
    '✅ 增删改查功能正常',
    '✅ 审批流程可正常流转',
    '✅ 报表可正常生成',
    '✅ 系统设置可正常保存'
  ],

  // 性能检查
  performance: [
    '✅ 页面响应时间 < 2秒',
    '✅ API响应时间 < 1秒',
    '✅ 无内存泄漏',
    '✅ 数据库查询有索引'
  ],

  // 监控检查
  monitoring: [
    '✅ 错误日志正常记录',
    '✅ 性能指标正常采集',
    '✅ 告警机制已验证',
    '✅ 回滚脚本已测试'
  ],

  // 应急准备
  emergency: [
    '✅ 紧急回滚方案已文档化',
    '✅ 回滚脚本已测试',
    '✅ 应急联系人已更新',
    '✅ 值班人员已安排'
  ]
};

/**
 * 生成上线检查报告
 */
function generateLaunchCheckReport() {
  const report = [];
  let allPassed = true;

  for (const [category, items] of Object.entries(PreLaunchChecklist)) {
    report.push(`\n【${category.toUpperCase()}】`);
    for (const item of items) {
      report.push(item);
      if (!item.startsWith('✅')) allPassed = false;
    }
  }

  report.push(`\n${'='.repeat(50)}`);
  report.push(allPassed ? '🎉 所有检查项通过，可以上线' : '⚠️ 存在未通过项，请处理后上线');
  report.push(`${'='.repeat(50)}\n`);

  return report.join('\n');
}
```

---

## 附录

### A. 核心API接口清单

| 模块 | 接口 | 方法 | 说明 |
|-----|------|-----|-----|
| 认证 | /api/auth/login | POST | 用户登录 |
| 认证 | /api/auth/logout | POST | 用户登出 |
| 用户 | /api/users | GET/POST | 用户列表/创建 |
| 用户 | /api/users/:id | GET/PUT/DELETE | 用户CRUD |
| 部门 | /api/departments | GET/POST | 部门列表/创建 |
| 基地 | /api/bases | GET/POST | 基地列表/创建 |
| 温室 | /api/greenhouses | GET/POST | 温室列表/创建 |
| 生产计划 | /api/production-plans | GET/POST | 生产计划CRUD |
| 种源 | /api/seed-sources | GET/POST | 种源CRUD |
| 育苗 | /api/seedlings | GET/POST | 育苗CRUD |
| 种植 | /api/plantings | GET/POST | 种植CRUD |
| 采收 | /api/harvests | GET/POST | 采收CRUD |
| 库存 | /api/inventory | GET/POST | 库存CRUD |
| 库存事务 | /api/inventory/transactions | GET | 库存事务查询 |
| 任务 | /api/farm-tasks | GET/POST | 农事任务CRUD |
| 巡查 | /api/inspections | GET/POST | 巡查CRUD |
| 问题 | /api/problems | GET/POST | 问题CRUD |
| 考勤 | /api/attendance | GET/POST | 考勤CRUD |
| 审批 | /api/approvals | GET/POST | 审批CRUD |
| 审批 | /api/approvals/:id/approve | POST | 审批操作 |
| 审计 | /api/audit/operations | GET | 操作审计查询 |

### B. 数据字典

| 类型编码 | 类型名称 | 说明 |
|--------|---------|-----|
| user_status | 用户状态 | active/inactive/locked |
| batch_status | 批次状态 | draft/published/in_progress/completed/cancelled |
| task_status | 任务状态 | pending/in_progress/completed/cancelled |
| approval_status | 审批状态 | draft/pending/approved/rejected/cancelled |
| stock_type | 库存类型 | seed/seedling/product |
| source_type | 来源类型 | self_produced/external_purchased |
| business_type | 业务类型 | seed_source/seedling/planting/harvest/purchase |
| priority | 优先级 | high/medium/low |

### C. 错误码定义

| 错误码 | 说明 | 处理建议 |
|-------|------|---------|
| 1001 | 数据不存在 | 检查ID是否正确 |
| 1002 | 数据已存在 | 检查编码是否重复 |
| 1003 | 关联数据不存在 | 检查外键关联 |
| 2001 | 库存不足 | 检查库存数量 |
| 2002 | 库存已冻结 | 解冻后再操作 |
| 3001 | 审批不存在 | 检查审批ID |
| 3002 | 审批权限不足 | 检查审批人身份 |
| 3003 | 审批流程已结束 | 不能再审批 |
| 4001 | 并发修改冲突 | 重新获取最新数据 |

---

**文档结束**
