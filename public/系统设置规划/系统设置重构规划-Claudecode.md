# 系统设置模块重构规划

> **文档版本**: V2.0
> **创建日期**: 2026-05-02
> **项目**: 智慧种植生产管理系统 V1.1
> **目标**: 基于数据迁移架构，重构系统设置模块，实现"后台一改，全局联动"
> **设计原则**: 所有基础数据单点维护、业务模块实时引用、禁止任何硬编码

---

## 目录

1. [现状问题分析](#1-现状问题分析)
2. [重构目标与原则](#2-重构目标与原则)
3. [模块去重与合并方案](#3-模块去重与合并方案)
4. [新增模块清单](#4-新增模块清单)
5. [统一数据字典体系](#5-统一数据字典体系)
6. [后台可配置参数清单](#6-后台可配置参数清单)
7. [关联关系设计](#7-关联关系设计)
8. [模块升级详细设计](#8-模块升级详细设计)
9. [数据联动架构设计](#9-数据联动架构设计)
10. [前端联动架构设计](#10-前端联动架构设计)
11. [数据迁移与清洗方案](#11-数据迁移与清洗方案)
12. [实施路径](#12-实施路径)
13. [预期效果对比](#13-预期效果对比)
14. [附录](#14-附录)

---

## 1. 现状问题分析

### 1.1 系统设置模块清单

| 页面文件 | 模块名称 | 现状问题 | 优先级 |
|---------|---------|---------|--------|
| `Settings.tsx` | 系统设置主框架（20模块） | **2套入口冲突**，部分入口无实际功能 | P0 |
| `SettingsPage.tsx` | 系统设置入口（8模块） | 与Settings.tsx重复 | P0 |
| `BaseSettings.tsx` | 基地设置 | **硬编码** `initialCompanyGroups` 数组，层级关系丢失 | P0 |
| `DepartmentSettings.tsx` | 部门设置 | **硬编码** `departments` 数组，与人员无关联 | P0 |
| `PersonnelManagement.tsx` | 人事管理 | **硬编码** `positions` 数组，岗位与部门分离 | P0 |
| `DictionaryManagement.tsx` | 数据字典 | localStorage实现较好，但未统一推广 | P1 |
| `ApprovalWorkflowConfig.tsx` | 审批流程配置 | localStorage实现较完整，但未与业务联动 | P1 |
| `CropManagement.tsx` | 作物管理 | **硬编码** `cropData` 数组，品种信息缺失 | P0 |
| `ProcessManagement.tsx` | 工序管理 | **硬编码** `processData` 数组，单价/奖励比例写死 | P0 |
| `MaterialManagement.tsx` | 物料管理 | **硬编码** `materialData` 数组，分类与库存分离 | P0 |
| `WarehouseManagement.tsx` | 仓库管理 | localStorage实现，有`DEFAULT_WAREHOUSES`硬编码 | P1 |

### 1.2 核心问题分类

#### 🔴 致命问题（必须立即解决）

| 问题类型 | 具体表现 | 影响范围 |
|---------|---------|---------|
| **部门硬编码7处不一致** | 7个位置定义各不相同（生产部/技术部/质检部等混合） | 部门设置、加勤表单、考勤页等5+文件 |
| **人员硬编码多处** | `staffData=[6人]`、`MOCK_STAFF=[12人]`不一致 | 人员管理、加班表单、排班页面 |
| **仓库硬编码3处** | "主仓库/冷库" vs "仓库A区-E区"命名体系冲突 | 采收、领料、库存 |
| **温室硬编码7处** | 从initialCompanyGroups提取 vs 独立greenhouses数组 | 种植、采收、巡检等7+页面 |
| **2套设置入口冲突** | Settings.tsx(20模块) vs SettingsPage.tsx(8模块) | 用户困惑，路由冲突 |
| **7个重复页面文件** | department/base/personnel各2-3个版本 | 维护困难 |
| **后端data_json反模式** | 15张表整表JSON化，无法SQL关联 | 所有设置表 |

#### 🟠 严重问题（1周内解决）

| 问题类型 | 具体表现 | 影响范围 |
|---------|---------|---------|
| **审批流程角色字符串** | `approverRole='production_manager'`无法解析 | 审批模块 |
| **通知收件人无法指定** | `recipients=['approver']`系统无法解析 | 通知模块 |
| **数据字典写死代码** | 新增状态要改代码重新编译 | 全部业务页面 |
| **LocalStorage分散** | 各模块独立存储，无法跨设备同步 | 配置数据 |

### 1.3 硬编码分布详情

#### 1.3.1 部门硬编码（7处，各不相同）

```
位置1: departmentPage.tsx
  const departments = ['管理层','技术部','生产部','后勤部','财务部']

位置2: DepartmentSettings.tsx
  const departments = ['管理层','技术部','生产部','后勤部','财务部'] ← 同位置1

位置3: OvertimeFormModal.tsx
  const departments = ['生产部','技术部','质检部','仓储部','设备部']
  ↑ 没有管理层/财务部，多了质检部/仓储部/设备部

位置4: SkillBatchEditModal.tsx
  const departments = ['生产部','技术部','质检部','仓储部','设备部'] ← 同位置3

位置5: WorkerAttendancePage.tsx
  const departments = ['全部','生产部','技术部','仓储部','质检部']
  ↑ 没有设备部/管理层/财务部，多了"全部"

位置6: personnelPage.tsx
  筛选下拉：['全部','生产部','技术部','后勤部']
  ↑ 又不一样了

位置7: StaffManagement.tsx
  筛选下拉：['全部','生产部','技术部','后勤部'] ← 同位置6
```

#### 1.3.2 人员硬编码（多处定义）

```
位置1: personnelPage.tsx → staffData = [6人]
位置2: StaffManagement.tsx → staffData = [6人] ← 同位置1
位置3: OvertimeFormModal.tsx → MOCK_STAFF = [12人] ↑ 不同！
位置4: SchedulePage.tsx → MOCK_STAFF = [12人] ← 同位置3
位置5: HarvestPage.tsx → harvesterNames = ["张三","李四"] ← 字符串数组
```

#### 1.3.3 仓库硬编码（3处不同命名）

```
位置1: HarvestPage.tsx
  warehouseOptions = [{ value: 'main', label: '主仓库' }, { value: 'cold', label: '冷库' }]

位置2: BatchEditModal.tsx (materialReceiving)
  warehouseOptions = ['仓库A区','仓库B区','仓库C区','仓库D区','仓库E区']
  ↑ 完全不同的仓库命名体系！

位置3: ExecuteBatchEditModal.tsx
  warehouseOptions = ['仓库A区','仓库B区','仓库C区','仓库D区','仓库E区'] ← 同位置2
```

### 1.4 后端SQLite反模式

```sql
-- 当前反模式表（15张+）
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  data_json TEXT,          -- ❌ 所有字段塞进JSON
  created_at TEXT,
  updated_at TEXT
);
-- 无法SQL查询、无法建索引、无法外键关联
```

---

## 2. 重构目标与原则

### 2.1 重构目标

1. **消除硬编码** - 所有配置数据必须从SQLite读取
2. **配置与业务分离** - 系统配置表（sys_*）与业务表（biz_*）分离
3. **层级关系清晰** - 基地-温室-区域-地块四级结构明确
4. **部门-岗位-人员关联** - 三者之间建立正确的归属关系
5. **统一数据字典** - 所有下拉选项来自数据字典表
6. **后台可配置** - 所有业务参数可在后台界面修改
7. **实时联动** - 设置修改后，业务模块自动感知

### 2.2 设计原则

| 原则 | 说明 |
|-----|------|
| **配置驱动业务** | 业务行为由配置数据决定，而非代码逻辑 |
| **层级分明** | sys_*表仅存储配置，biz_*表仅存储业务数据 |
| **外键关联** | 所有表之间通过外键建立关联，保证参照完整性 |
| **审计追踪** | 每条配置记录有创建人/时间/修改记录 |
| **状态机管理** | 关键业务实体有统一的状态管理 |
| **联动实时性** | 设置修改后，通过状态管理自动同步到全系统 |

---

## 3. 模块去重与合并方案

### 3.1 当前模块地图（混乱状态）

```
系统设置
├── 入口A：Settings.tsx（20个模块）
│   ├── 系统配置 / 数据字典 / 用户权限 / 审批流程 / 通知设置 / 设备管理
│   ├── 仓库管理 / 班组管理 / 基地管理 / 区块管理 / 基地设置 / 区域管理
│   ├── 种植模式 / 作物品种库 / 物料管理 / 工序管理 / 人事管理 / 部门设置
│   └── 成本核算 / 操作日志
│
└── 入口B：SettingsPage.tsx（8个模块，与入口A部分重复）
    ├── 基地设置 / 区域管理 / 种植模式管理 / 作物管理
    └── 物料管理 / 工序管理 / 人事管理 / 部门设置

问题：
- "基地管理"(/settings/branch) vs "基地设置"(/settings/bases) → 两个不同路由！
- "区域管理"在两个入口中都有，但路由不同
```

### 3.2 入口统一方案

```
合并前（2个入口）                           合并后（1个入口）
┌─────────────────────────┐               ┌─────────────────────────┐
│ 入口A：Settings.tsx     │               │                         │
│ 20个模块               │──────┐        │   Settings.tsx          │
│                         │      │        │   唯一设置入口          │
├─────────────────────────┤      │        │   统一15个核心模块      │
│ 入口B：SettingsPage.tsx │      │        │                         │
│ 8个模块                 │──────┘        └─────────────────────────┘
│                         │
└─────────────────────────┘

删除：SettingsPage.tsx（组件目录下的入口）
保留：Settings.tsx（pages目录下的入口）
```

### 3.3 重复文件删除清单

```
删除文件（7个）：
├── src/components/settings/SettingsPage.tsx       → 删除（与Settings.tsx重复）
├── src/components/department/departmentPage.tsx     → 删除（与DepartmentSettings.tsx重复）
├── src/components/baseSettings/BaseSettingsPage.tsx → 删除（与BaseSettings.tsx重复）
├── src/components/personnel/personnelPage.tsx       → 删除（与StaffManagement.tsx重复）
├── src/pages/StaffManagement.tsx                   → 删除（与SettingsPersonnelStaff重复）
├── src/pages/SettingsPersonnelStaff.tsx            → 删除（只是重导出）
└── src/components/baseSettings/                    → 删除整个目录（空目录）

保留文件（3个）：
├── src/pages/Settings.tsx                          → 唯一设置入口
├── src/pages/DepartmentSettings.tsx                → 唯一部门设置
└── src/pages/BaseSettings.tsx                      → 唯一基地设置

合并为 PersonnelSettings.tsx：
├── 合并 PersonnelManagement + StaffManagement + PositionManagement
├── 子路由：/settings/personnel/staff
├──          /settings/personnel/position
├──          /settings/personnel/attendance
└──          /settings/personnel/approval
```

### 3.4 重构后模块地图

```
系统设置
├── ⚙️ 基础设置（8个）
│   ├── 组织架构（合并公司+基地+温室+区域+仓库）
│   │   ├── Tab: 公司管理
│   │   ├── Tab: 基地管理
│   │   ├── Tab: 温室/大棚管理
│   │   ├── Tab: 种植区域管理
│   │   └── Tab: 仓库管理
│   │
│   ├── 部门管理
│   │   ├── Tab: 部门设置
│   │   └── Tab: 岗位管理
│   │
│   └── 人员管理
│       ├── Tab: 员工档案
│       ├── Tab: 职位管理
│       ├── Tab: 班组管理
│       └── Tab: 考勤规则
│
├── 🌱 农业知识库（4个）
│   ├── 作物分类管理
│   ├── 作物类型管理
│   ├── 作物品种管理
│   └── 种植模式管理
│
├── 📦 物料与工序（3个）
│   ├── 物料分类管理
│   ├── 物料管理
│   └── 工序管理
│
├── 🏭 供应商管理（1个）
│   └── 供应商管理
│
├── ⚡ 系统设置（5个）
│   ├── 数据字典管理
│   ├── 系统配置
│   ├── 审批流程配置
│   ├── 通知设置
│   └── 用户权限
│
└── 📊 扩展设置（2个）
    ├── 设备管理
    └── 成本核算
```

---

## 4. 新增模块清单

### 4.1 必须新增的模块

#### 4.1.1 编码规则配置（sys_code_rules）

**用途**：统一管理系统各类编码规则

```sql
CREATE TABLE sys_code_rules (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,           -- 实体类型：department/position/user/base/greenhouse等
  prefix TEXT NOT NULL,                -- 前缀：DEPT/POS/U/BASE/GH
  seq_length INTEGER DEFAULT 3,        -- 序号长度：3→001,4→0001
  current_seq INTEGER DEFAULT 0,       -- 当前序号
  date_pattern TEXT,                   -- 日期模式：YYYYMMDD
  description TEXT,                   -- 规则描述
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);
```

#### 4.1.2 区域管理（sys_zones）

**用途**：管理温室内的区域划分

```sql
CREATE TABLE sys_zones (
  id TEXT PRIMARY KEY,
  zone_code TEXT UNIQUE NOT NULL,      -- 区域编码
  zone_name TEXT NOT NULL,             -- 区域名称
  greenhouse_id TEXT NOT NULL,          -- 所属温室ID
  zone_type TEXT,                      -- 区域类型：seedling/growing/harvest
  area REAL DEFAULT 0,                -- 面积
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (greenhouse_id) REFERENCES sys_greenhouses(id)
);
```

#### 4.1.3 地块管理（sys_blocks）

**用途**：管理区域内的地块

```sql
CREATE TABLE sys_blocks (
  id TEXT PRIMARY KEY,
  block_code TEXT UNIQUE NOT NULL,     -- 地块编码
  block_name TEXT NOT NULL,            -- 地块名称
  zone_id TEXT NOT NULL,               -- 所属区域ID
  block_type TEXT,                     -- 地块类型：planting/seedling
  area REAL DEFAULT 0,                 -- 面积
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (zone_id) REFERENCES sys_zones(id)
);
```

#### 4.1.4 仓库管理（sys_warehouses）

**用途**：统一管理仓库信息（替代DEFAULT_WAREHOUSES硬编码）

```sql
CREATE TABLE sys_warehouses (
  id TEXT PRIMARY KEY,
  warehouse_code TEXT UNIQUE NOT NULL, -- 仓库编码 WH001
  warehouse_name TEXT NOT NULL,       -- 仓库名称
  warehouse_type TEXT,                 -- 类型：seed/material/product
  location TEXT,                       -- 位置
  capacity REAL DEFAULT 0,            -- 容量
  manager_id TEXT,                    -- 管理员ID
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (manager_id) REFERENCES sys_users(id)
);
```

#### 4.1.5 审批规则配置（sys_approval_rules）

**用途**：定义审批规则与业务类型的关联

```sql
CREATE TABLE sys_approval_rules (
  id TEXT PRIMARY KEY,
  rule_code TEXT UNIQUE NOT NULL,     -- 规则编码
  rule_name TEXT NOT NULL,           -- 规则名称
  business_type TEXT NOT NULL,        -- 业务类型：procurement/production/harvest
  flow_id TEXT,                      -- 关联审批流程ID
  conditions TEXT,                    -- 触发条件（JSON）
  is_active INTEGER DEFAULT 1,
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (flow_id) REFERENCES sys_approval_flows(id)
);
```

#### 4.1.6 供应商管理（sys_suppliers）

**用途**：统一管理供应商信息

```sql
CREATE TABLE sys_suppliers (
  id TEXT PRIMARY KEY,
  supplier_code TEXT UNIQUE NOT NULL, -- 供应商编码 SUP001
  supplier_name TEXT NOT NULL,       -- 供应商名称
  supplier_type TEXT,                -- 类型：seed/material/equipment
  contact_person TEXT,               -- 联系人
  contact_phone TEXT,                -- 联系电话
  address TEXT,                      -- 地址
  qualification TEXT,                -- 资质证书
  rating REAL DEFAULT 5.0,          -- 评分
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);
```

### 4.2 优化现有模块

#### 4.2.1 部门管理 → 增加层级与岗位关联

- 部门层级：支持多级部门（父部门-子部门）
- 岗位归属：岗位绑定到部门
- 负责人配置：部门指定负责人

#### 4.2.2 人员管理 → 增加岗位与部门绑定

- 人员必须归属部门
- 人员必须关联岗位
- 人员可分配负责基地

#### 4.2.3 基地管理 → 增加温室关联

- 基地下管理温室
- 温室下管理区域
- 区域内管理地块

#### 4.2.4 数据字典 → 推广到全系统

- 所有下拉选项必须从字典读取
- 页面禁止出现 `<option value="硬编码值">`
- 字典类型分类管理

---

## 5. 统一数据字典体系

### 5.1 字典架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                   字典分类表（dictionary_categories）          │
├─────────────────────────────────────────────────────────────┤
│ id │ code              │ name           │ module         │
│────┼───────────────────┼────────────────┼────────────────│
│ 1  │ seed_source_status│ 种源状态       │ crop          │
│ 2  │ staff_status      │ 人员状态       │ hr            │
│ 3  │ department_status │ 部门状态       │ organization   │
│ ...│ ...               │ ...            │ ...            │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 1:N
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   字典项表（dictionary_items）                 │
├─────────────────────────────────────────────────────────────┤
│ id │ category_id │ code      │ name  │ color │ sort_order │
│────┼─────────────┼───────────┼───────┼───────┼────────────│
│ 1  │ 1           │ sufficient│ 充足  │ green │ 1          │
│ 2  │ 1           │ low       │ 不足  │ yellow│ 2          │
│ 3  │ 1           │ depleted   │ 耗尽  │ red   │ 3          │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 预置字典分类清单

| 字典类型 | 字典编码 | 说明 | 示例值 |
|---------|---------|------|--------|
| **作物管理** | | | |
| 种源状态 | seed_source_status | 种源状态 | 充足,不足,耗尽 |
| 育苗状态 | seedling_status | 育苗状态 | 进行中,可定植,已完成,异常 |
| 种植状态 | planting_status | 种植状态 | 已定植,生长期,已采收,取消 |
| 采收等级 | harvest_grade | 采收等级 | A级,B级,C级,特级 |
| 实例状态 | crop_instance_status | 实例状态 | 育苗,定植,生长,采收,出库 |
| **库存管理** | | | |
| 仓库类型 | warehouse_type | 仓库分类 | 常温库,冷藏库,冷冻库,气调库 |
| 物料分类 | material_category | 物料大类 | 种子,肥料,农药,工具 |
| 库存状态 | inventory_status | 库存状态 | 正常,临期,过期,损耗 |
| **人工管理** | | | |
| 人员状态 | staff_status | 人员状态 | 在职,离职,请假,停用 |
| 请假类型 | leave_type | 请假类型 | 病假,事假,年假,婚假 |
| 加班类型 | overtime_type | 加班类型 | 平时,周末,节假日 |
| 考勤状态 | attendance_status | 考勤状态 | 正常,迟到,早退,缺勤 |
| 审批状态 | approval_status | 审批状态 | 待审批,已通过,已驳回 |
| **组织架构** | | | |
| 公司状态 | company_status | 公司状态 | 正常,停业,注销 |
| 基地状态 | base_status | 基地状态 | 正常,停用,筹建中 |
| 温室类型 | greenhouse_type | 温室分类 | 玻璃温室,日光温室,薄膜温室 |
| 温室状态 | greenhouse_status | 温室状态 | 正常,维修,停用,空闲 |
| 部门状态 | department_status | 部门状态 | 正常,撤销,合并 |
| **系统通用** | | | |
| 通知类型 | notification_type | 通知类型 | 审批,任务,预警,公告 |
| 通知渠道 | notification_channel | 通知渠道 | 站内,邮件,短信,微信 |
| 任务优先级 | task_priority | 任务优先级 | 紧急,高,中,低 |
| 任务状态 | task_status | 任务状态 | 待分配,进行中,已完成,逾期 |

### 5.3 字典表结构

```sql
-- 字典分类表
CREATE TABLE sys_dictionary_categories (
  id TEXT PRIMARY KEY,
  dict_type TEXT NOT NULL UNIQUE,      -- 字典类型（英文编码）
  dict_name TEXT NOT NULL,             -- 字典名称（中文）
  module TEXT,                         -- 所属模块
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT
);

-- 字典项表
CREATE TABLE sys_dictionaries (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,            -- 关联字典分类ID
  dict_code TEXT NOT NULL,            -- 字典编码（唯一标识）
  dict_label TEXT NOT NULL,           -- 显示标签（中文）
  dict_value TEXT NOT NULL,           -- 存储值
  color TEXT,                         -- 标签颜色
  sort_order INTEGER DEFAULT 0,        -- 排序
  is_default INTEGER DEFAULT 0,       -- 是否默认值
  status TEXT DEFAULT 'active',
  create_time TEXT NOT NULL,
  update_time TEXT,
  FOREIGN KEY (category_id) REFERENCES sys_dictionary_categories(id)
);
CREATE UNIQUE INDEX idx_dict_category_code ON sys_dictionaries(category_id, dict_code);
```

### 5.4 字典使用规范

```tsx
// ❌ 错误：硬编码
<select>
  <option value="生产公告">生产公告</option>
  <option value="行政公告">行政公告</option>
</select>

// ✅ 正确：从字典读取
import { useDictionaries } from '@/hooks/useDictionaries';

function AnnouncementTypeSelect() {
  const { data: dicts } = useDictionaries('announcement_type');
  return (
    <select>
      {dicts?.map(d => (
        <option key={d.dict_code} value={d.dict_value}>
          {d.dict_label}
        </option>
      ))}
    </select>
  );
}
```

---

## 6. 后台可配置参数清单

### 6.1 编码规则配置

| 参数 | 配置项 | 默认值 | 说明 |
|-----|-------|-------|------|
| 部门编码 | 前缀 + 序号长度 | DEPT + 3位 | DEPT001 |
| 岗位编码 | 前缀 + 序号长度 | POS + 3位 | POS001 |
| 用户编码 | 前缀 + 序号长度 | U + 3位 | U001 |
| 基地编码 | 前缀 + 序号长度 | BASE + 3位 | BASE001 |
| 温室编码 | 前缀 + 序号长度 | GH + 3位 | GH001 |
| 物料编码 | 前缀 + 序号长度 | MT + 3位 | MT001 |
| 工序编码 | 前缀 + 序号长度 | PROC + 3位 | PROC001 |

### 6.2 审批流程配置

| 参数 | 配置项 | 默认值 | 说明 |
|-----|-------|-------|------|
| 审批超时 | 超时时间（小时） | 72 | 3天 |
| 自动审批 | 金额阈值 | 1000 | 以下自动审批 |
| 委托审批 | 是否允许 | 是 | 可委托他人审批 |
| 审批意见 | 是否必填 | 否 | 可选填写 |

### 6.3 业务参数配置

| 参数 | 配置项 | 默认值 | 说明 |
|-----|-------|-------|------|
| 安全库存 | 物料安全库存 | 10 | 低于此值预警 |
| 奖励系数 | 工序奖励比例 | 1.0 | 可调整 |
| 成活率阈值 | 育苗成活率 | 85% | 低于此值预警 |
| 采收周期 | 作物采收周期 | 7天 | 采收提醒 |

### 6.4 系统参数配置

| 参数 | 配置项 | 默认值 | 说明 |
|-----|-------|-------|------|
| 会话超时 | 超时时间（分钟） | 30 | 自动登出 |
| 密码策略 | 最小长度 | 6 | - |
| 密码策略 | 必须包含数字 | 否 | - |
| 登录限制 | 失败次数上限 | 5 | 5次后锁定 |
| 数据备份 | 自动备份周期 | 每天 | - |

### 6.5 从taskConfig.ts迁移的配置项

```typescript
// src/config/taskConfig.ts 中的硬编码配置 → 迁移到 system_configs 表

当前硬编码：                                      迁移后配置项：
┌─────────────────────────┐                     ┌─────────────────────────────┐
│ OVERTIME_CONFIG         │                     │ task_accept_warning_hours     │
│   acceptWarning: 12h    │────────────────────►│   任务接受预警时间（小时）   │
│   acceptCritical: 24h   │                     │ task_accept_critical_hours  │
│   execWarning: 24h      │                     │   任务接受危急时间（小时）   │
│   execCritical: 48h     │                     │ task_execution_warning_hours│
│                         │                     │   任务执行预警时间（小时）   │
├─────────────────────────┤                     │ task_execution_critical_hours│
│ DEADLINE_CONFIG         │                     │   任务执行危急时间（小时）   │
│   maxExtensions: 3      │────────────────────►│ task_max_extensions         │
│   maxHoursPerExt: 72h   │                     │   最大延期次数               │
│                         │                     │ task_max_extension_hours    │
├─────────────────────────┤                     │   单次最大延期（小时）       │
│ REMINDER_CONFIG         │                     │ task_reminder_interval      │
│   minInterval: 60min    │────────────────────►│   催办最小间隔（分钟）       │
│                         │                     │ task_max_rework             │
├─────────────────────────┤                     │   最大返工次数               │
│ REWORK_CONFIG           │────────────────────►│                            │
│   maxRework: 2          │                     └─────────────────────────────┘
└─────────────────────────┘

价值：修改超时阈值不再需要重新编译代码，后台改配置即时生效！
```

---

## 7. 关联关系设计

### 7.1 实体关系图（ER）

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   部门      │       │    岗位     │       │    人员     │
│ sys_depts  │       │sys_positions│       │  sys_users  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │◄──────│ dept_id     │       │ id          │
│ dept_code   │       │ id          │       │ dept_id     │◄────┐
│ dept_name   │       │ position_   │       │ position_id │◄───┐│
│ parent_id   │──────►│ code        │       │ base_ids    │    ││
│ manager_id  │       │ position_   │       │ role        │    ││
└─────────────┘       │ name        │       └─────────────┘    ││
                      └─────────────┘                           ││
                                                               ││
┌─────────────┐       ┌─────────────┐       ┌─────────────┐   ││
│    基地     │       │    温室     │       │    区域     │   ││
│ sys_bases   │       │sys_greenhou.│       │ sys_zones   │   ││
├─────────────┤       ├─────────────┤       ├─────────────┤   ││
│ id          │◄──────│ base_id     │       │ greenhouse_ │◄──┘│
│ base_code   │       │ id          │◄──────│ id          │    │
│ base_name   │       │ greenhouse_ │       │ zone_code   │    │
│ location    │       │ code        │       │ zone_name   │    │
└─────────────┘       └─────────────┘       └─────────────┘    │
                                                          ┌─────┴┘
                                                    ┌─────▼─────┐
                                                    │   地块    │
                                                    │sys_blocks │
                                                    ├───────────┤
                                                    │ id        │
                                                    │ zone_id   │◄────┘
                                                    │ block_code│
                                                    │ block_name│
                                                    └───────────┘
```

### 7.2 关联关系说明

| 关系 | 类型 | 说明 |
|-----|------|------|
| 部门-岗位 | 1:N | 一个部门可有多个岗位 |
| 部门-人员 | 1:N | 一个部门可有多个人员 |
| 岗位-人员 | 1:N | 一个岗位可有多个人员 |
| 基地-温室 | 1:N | 一个基地可有多个温室 |
| 温室-区域 | 1:N | 一个温室可有多个区域 |
| 区域-地块 | 1:N | 一个区域可有多个地块 |
| 人员-基地 | N:M | 一个人可负责多个基地 |

### 7.3 业务表外键关联

```sql
-- 业务表外键设计
CREATE TABLE biz_production_plans (
  greenhouse_id TEXT REFERENCES sys_greenhouses(id),
  responsible_person_id TEXT REFERENCES sys_users(id),
  publisher_id TEXT REFERENCES sys_users(id)
);

CREATE TABLE biz_seed_sources (
  supplier_id TEXT REFERENCES sys_suppliers(id),
  production_plan_id TEXT REFERENCES biz_production_plans(id)
);

CREATE TABLE biz_seedlings (
  source_id TEXT REFERENCES biz_seed_sources(id),
  production_plan_id TEXT REFERENCES biz_production_plans(id),
  greenhouse_id TEXT REFERENCES sys_greenhouses(id)
);

CREATE TABLE biz_plantings (
  greenhouse_id TEXT REFERENCES sys_greenhouses(id),
  block_id TEXT REFERENCES sys_blocks(id),
  seedling_id TEXT REFERENCES biz_seedlings(id),
  responsible_person_id TEXT REFERENCES sys_users(id)
);

CREATE TABLE biz_tasks (
  assignee_id TEXT REFERENCES sys_users(id),
  greenhouse_id TEXT REFERENCES sys_greenhouses(id),
  process_id TEXT REFERENCES sys_processes(id)
);

CREATE TABLE biz_inventory (
  warehouse_id TEXT REFERENCES sys_warehouses(id),
  material_id TEXT REFERENCES sys_materials(id),
  supplier_id TEXT REFERENCES sys_suppliers(id)
);
```

### 7.4 联动触发机制

| 触发方式 | 适用场景 | 实现成本 | 实时性 |
|---------|---------|---------|--------|
| **页面刷新时加载** | 所有页面 | 低 | 中（刷新才更新） |
| **弹窗打开时加载** | 下拉框数据 | 中 | 高（每次打开最新） |
| **WebSocket推送** | 多标签页同步 | 高 | 极高（秒级） |
| **Service Worker轮询** | 后台静默更新 | 中 | 中高（分钟级） |

**推荐组合方案（MVP）**：
- 弹窗打开时实时加载（确保最新）
- 页面刷新时加载（兜底）
- 设置修改后主动刷新（即时）

---

## 8. 模块升级详细设计

### 8.1 组织架构模块升级

#### 8.1.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 基地设置页面（BaseSettings.tsx）                              │
├──────────────────────────────────────────────────────────────┤
│ 数据：initialCompanyGroups = [2公司11基地]  ← 硬编码          │
│ 功能：列表展示、搜索筛选、新增/编辑弹窗                        │
│ 问题：                                                          │
│   1. 数据写死在代码里，不能持久化                               │
│   2. 新增基地后刷新页面就丢失                                   │
│   3. 没有公司-基地的层级关系管理                                 │
│   4. 基地字段不完整（缺少创建时间、负责人ID关联等）              │
│   5. 与ParkArchivePage.tsx使用相同硬编码数据，不同步             │
└──────────────────────────────────────────────────────────────┘
```

#### 8.1.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 组织架构设置（OrganizationalSettings.tsx）                    │
├──────────────────────────────────────────────────────────────┤
│ 数据：SQLite表（company_groups/bases/greenhouses/           │
│       plant_areas/warehouses/departments/positions）           │
│ 功能：                                                         │
│   1. 公司/基地/温室/区域/仓库/部门/职位 全部CRUD              │
│   2. 层级关系可视化（树形结构）                                │
│   3. 负责人从人员库选择（ID关联）                               │
│   4. 状态管理（正常/停用/维修中）                             │
│   5. 与业务模块实时联动                                       │
└──────────────────────────────────────────────────────────────┘
```

#### 8.1.3 联动效果

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增公司** | 基地创建页 | "所属公司"下拉新增选项 |
| **修改公司名** | 全部业务页 | 显示名称自动更新 |
| **停用公司** | 种植/采收 | 该公司的基地不再出现在选址下拉 |
| **新增基地** | 种源/育苗/种植/采收 | 所有选址弹窗自动出现新基地 |
| **修改基地名** | 历史记录 | 通过ID关联，显示自动更新 |
| **新增温室** | 种植/采收/巡检 | 温室选择下拉自动出现 |
| **新增仓库** | 采收入库/库存 | 入库仓库下拉自动出现 |
| **新增部门** | 人员管理/人工管理 | 部门下拉自动出现 |
| **调整部门层级** | 组织架构树 | 树形结构自动更新 |
| **新增职位** | 人员档案 | 职位下拉自动出现 |

### 8.2 人员管理模块升级

#### 8.2.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 人员管理页面（StaffManagement.tsx / personnelPage.tsx）       │
├──────────────────────────────────────────────────────────────┤
│ 数据：const staffData = [6个人]  ← 硬编码                      │
│ 功能：列表展示、搜索、部门筛选、分页                          │
│ 问题：                                                          │
│   1. 只有6个固定人员，无法新增                                  │
│   2. 人员信息只有姓名/工号/部门/职位，不完整                    │
│   3. 没有入职/离职流程                                         │
│   4. 部门是字符串不是ID                                        │
│   5. 照片/证件/联系方式等缺失                                   │
│   6. 与加班/排班模块的MOCK_STAFF不一致（12人）                  │
└──────────────────────────────────────────────────────────────┘
```

#### 8.2.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 人员管理设置（PersonnelSettings.tsx）                         │
├──────────────────────────────────────────────────────────────┤
│ Tab: [员工档案] [职位管理] [班组管理] [考勤规则]               │
├──────────────────────────────────────────────────────────────┤
│                                                                 │
│ 员工档案：                                                      │
│   - 完整信息：姓名/工号/性别/年龄/手机/邮箱/身份证/照片        │
│   - 组织信息：部门（ID关联）/职位（ID关联）/班组（ID关联）      │
│   - 工作状态：在职/离职/请假/停用                              │
│   - 入职/离职日期                                             │
│   - 操作：新增/编辑/离职/删除                                  │
│                                                                 │
│ 职位管理：                                                      │
│   - 职位编码/名称/所属部门/级别/职责描述                        │
│   - 在职人数自动统计                                          │
│                                                                 │
│ 班组管理：                                                      │
│   - 班组编码/名称/班组长/成员列表/班次类型                     │
│                                                                 │
│ 考勤规则：                                                      │
│   - 工作时间/休息日/节假日/加班规则                            │
│                                                                 │
└──────────────────────────────────────────────────────────────┘
```

#### 8.2.3 联动效果

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增员工** | 全部业务弹窗 | 创建人/负责人/采收人/审核人 下拉新增选项 |
| **员工离职** | 全部业务 | 该员工不再出现在下拉中，历史记录保留 |
| **员工调部门** | 人工管理/统计 | 部门统计自动更新 |
| **新增职位** | 人员档案 | 职位下拉新增选项 |
| **新增班组** | 任务分派 | 可按班组批量分派任务 |
| **修改考勤规则** | 考勤计算 | 统计自动按新规则计算 |

### 8.3 数据字典模块升级

#### 8.3.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 数据字典页面（DictionaryManagement.tsx）                     │
├──────────────────────────────────────────────────────────────┤
│ 数据：const DEFAULT_DICTS = [20+个分类，200+个字典项]  ← 硬编码│
│ 存储：localStorage.getItem('dictionary_management_data')      │
│ 功能：分类展示、搜索、新增/编辑/删除字典项                      │
│ 问题：                                                          │
│   1. 字典分类和值写死在代码里                                  │
│   2. 虽然可以CRUD，但新增分类要改代码                          │
│   3. 字典项没有颜色标签配置                                    │
│   4. 字典没有与业务模块关联，只是静态展示                        │
│   5. 业务模块没有从字典读取数据，还是硬编码                      │
└──────────────────────────────────────────────────────────────┘
```

#### 8.3.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 数据字典设置（DictionarySettings.tsx）                         │
├──────────────────────────────────────────────────────────────┤
│ 数据：SQLite表（dictionary_categories + dictionary_items）      │
│ 功能：                                                         │
│   1. 分类管理：新增/编辑/删除分类                              │
│   2. 字典项管理：编码/名称/值/颜色/排序/状态                   │
│   3. 颜色标签配置（green/yellow/red/blue...）                 │
│   4. 与业务模块联动：所有下拉框从字典读取                       │
│   5. 字典变更实时同步到全部业务页面                            │
├──────────────────────────────────────────────────────────────┤
│                                                                 │
│ 预置字典分类：                                                  │
│ ├─ 作物管理：种源状态/育苗状态/种植状态/采收等级/订单状态       │
│ ├─ 库存管理：仓库类型/物料分类/库存状态                         │
│ ├─ 人工管理：人员状态/请假类型/加班类型/考勤状态/审批状态        │
│ ├─ 组织架构：公司状态/基地状态/温室类型/温室状态/部门状态         │
│ └─ 系统通用：通知类型/任务优先级/任务状态/日志类型              │
│                                                                 │
└──────────────────────────────────────────────────────────────┘
```

#### 8.3.3 联动效果（最关键）

```
场景：新增"种源状态"字典项

操作：在数据字典页面，选择"种源状态"分类，点击"新增字典项"
      编码：reserved，名称：预留，颜色：blue，排序：4

自动触发：
  1. SQLite 插入 dictionary_items 记录
  2. 前端 dictCache 更新
  3. 种源列表页 → 状态筛选下拉自动出现"预留"
  4. 种源创建弹窗 → 状态下拉自动出现"预留"
  5. 种源统计卡片 → 自动增加"预留数量"统计
  6. 数据报表 → 筛选条件自动出现"预留"
  
结论：新增一个状态，无需修改任何业务代码！
```

### 8.4 审批流程模块升级

#### 8.4.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 审批流程页面（ApprovalWorkflowConfig.tsx）                    │
├──────────────────────────────────────────────────────────────┤
│ 数据：const DEFAULT_WORKFLOWS = [4个流程]  ← 硬编码              │
│ 存储：localStorage.getItem('approval_workflow_data')          │
│ 功能：流程列表、节点展示、新增/编辑/删除                       │
│ 问题：                                                          │
│   1. approverRole是字符串（'production_manager'）               │
│      → 系统不知道谁是production_manager                        │
│   2. 没有条件分支（如"金额>5000才需要总经理审批"）               │
│   3. 节点不能选择具体人员，只能选角色字符串                     │
│   4. 没有超时自动转派机制                                      │
│   5. 流程与业务模块没有实际关联（只是配置，未触发）              │
└──────────────────────────────────────────────────────────────┘
```

#### 8.4.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 审批流程设置（ApprovalWorkflowSettings.tsx）                    │
├──────────────────────────────────────────────────────────────┤
│ 数据：SQLite表（approval_workflows + approval_nodes）        │
│ 功能：                                                         │
│   1. 流程设计器（可视化拖拽节点）                               │
│   2. 节点类型：角色审批/指定人员/部门负责人/自动通过            │
│   3. 条件分支：金额/数量/优先级等条件触发不同路径             │
│   4. 超时处理：自动转派/自动通过/提醒上级                       │
│   5. 与业务模块集成：创建生产计划时自动触发                     │
├──────────────────────────────────────────────────────────────┤
│                                                                 │
│ 节点配置：                                                      │
│ ├─ 审批人：○ 角色（从角色库选择）                              │
│ │          ○ 指定人员（从人员库选择）                            │
│ │          ○ 部门负责人（从部门库选择）                        │
│ │          ○ 自动通过                                          │
│ ├─ 超时：24小时 → 自动转派给上级/自动通过/发送提醒             │
│ ├─ 条件：金额 > 5000 才需要此节点                             │
│ └─ 必须填写意见：是/否                                         │
│                                                                 │
└──────────────────────────────────────────────────────────────┘
```

#### 8.4.3 联动效果

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增流程** | 对应模块 | 该模块业务自动触发新流程 |
| **修改节点** | 对应模块 | 审批路径自动更新 |
| **调整超时** | 对应模块 | 催办提醒按新时间触发 |
| **停用流程** | 对应模块 | 该业务不再触发审批 |

### 8.5 系统配置模块升级

#### 8.5.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 系统配置页面（SystemConfig.tsx）                              │
├──────────────────────────────────────────────────────────────┤
│ 数据：const DEFAULT_CONFIGS = [10项配置]  ← 硬编码             │
│ 存储：localStorage.getItem('system_config_data')              │
│ 功能：配置项展示、编辑、默认值恢复                             │
│ 问题：                                                          │
│   1. demo_mode/theme_color/page_size等改了不生效              │
│      → 代码没有读取这些配置！                                  │
│   2. 配置项没有分类，混在一起                                  │
│   3. 没有配置变更日志                                          │
│   4. 没有配置说明文档                                          │
│   5. 农事任务配置（taskConfig.ts）是独立硬编码                  │
└──────────────────────────────────────────────────────────────┘
```

#### 8.5.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 系统配置（SystemConfig.tsx）                                  │
├──────────────────────────────────────────────────────────────┤
│ 数据：SQLite表（system_configs）                              │
│ 功能：                                                         │
│   1. 配置分类：系统/业务/UI/安全                               │
│   2. 配置项管理：                                               │
│      - 系统：名称/版本/数据保留天数/自动保存间隔               │
│      - 业务：任务超时阈值/最大延期次数/催办间隔/返工次数        │
│      - UI：主题色/默认分页大小/日期格式                        │
│      - 安全：密码策略/登录失败锁定/会话超时                    │
│   3. 配置变更日志：谁/何时/改了什么/旧值→新值                  │
│   4. 配置生效验证：修改后自动测试是否生效                       │
│   5. 代码读取配置：所有硬编码参数改为从配置表读取               │
└──────────────────────────────────────────────────────────────┘
```

### 8.6 用户权限模块升级

#### 8.6.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 用户权限页面（UserPermission.tsx）                          │
├──────────────────────────────────────────────────────────────┤
│ 内容：只有静态表格展示（角色/权限矩阵）                        │
│ 数据：硬编码在代码中                                          │
│ 功能：❌ 无任何交互功能                                        │
│ 问题：                                                          │
│   1. 纯展示页面，不能新增/编辑/删除角色                        │
│   2. 不能分配权限                                              │
│   3. 没有菜单权限控制                                          │
│   4. 没有按钮权限控制                                          │
│   5. 没有数据权限控制（谁能看到哪里的数据）                    │
└──────────────────────────────────────────────────────────────┘
```

#### 8.6.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 用户权限设置（UserPermissionSettings.tsx）                    │
├──────────────────────────────────────────────────────────────┤
│ Tab: [角色管理] [权限分配] [用户授权] [数据范围]               │
├──────────────────────────────────────────────────────────────┤
│                                                                 │
│ 角色管理：                                                      │
│   - 角色编码/名称/描述/数据范围                                 │
│   - 预置角色：系统管理员/部门主管/技术员/普工/仓库管理员         │
│                                                                 │
│ 权限分配：                                                      │
│   - 菜单权限：谁能看到哪个页面（复选框树）                     │
│   - 按钮权限：谁能执行哪种操作（查看/新增/编辑/删除/导出/审批）│
│   - API权限：谁能调用哪个接口                                   │
│                                                                 │
│ 用户授权：                                                      │
│   - 为用户分配角色（多选）                                     │
│   - 特殊权限（临时提升权限）                                   │
│                                                                 │
│ 数据范围：                                                      │
│   - 全部数据/本公司/本部门/仅个人                               │
│   - 特殊数据权限（指定基地/指定仓库）                          │
│                                                                 │
└──────────────────────────────────────────────────────────────┘
```

#### 8.6.3 权限矩阵设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        权限矩阵示例                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  角色 \ 权限     │ 查看 │ 新增 │ 编辑 │ 删除 │ 导出 │ 审批 │
│  ─────────────────────────────────────────────────────────────  │
│  系统管理员      │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │
│  部门主管        │  ✓   │  ✓   │  ✓   │  ✗   │  ✓   │  ✓   │
│  技术员          │  ✓   │  ✓   │  ✓   │  ✗   │  ✗   │  ✗   │
│  普通员工        │  ✓   │  ✗   │  ✗   │  ✗   │  ✗   │  ✗   │
│  仓库管理员      │  ✓   │  ✓   │  ✓   │  ✗   │  ✓   │  ✗   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 数据联动架构设计

### 9.1 联动架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        联动架构总览                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌─────────────────────────────────────────────────────────────┐     │
│    │                    SQLite 数据库（单一真相源）                 │     │
│    │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │     │
│    │  │ 组织   │ │ 人员   │ │ 品种库 │ │ 仓库   │ │ 字典   │   │     │
│    │  │ 架构   │ │ 档案   │ │        │ │        │ │        │   │     │
│    │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │     │
│    └─────────────────────────────────────────────────────────────┘     │
│                              ▲                                         │
│                              │ 读写                                       │
│          ┌───────────────────┼───────────────────┐                      │
│          │                   │                   │                      │
│          ▼                   ▼                   ▼                      │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐                   │
│    │ 设置模块  │      │ 设置模块  │      │ 设置模块  │                   │
│    │组织架构  │      │人员管理  │      │数据字典  │                   │
│    │页面      │      │页面      │      │页面      │                   │
│    └──────────┘      └──────────┘      └──────────┘                   │
│          │                   │                   │                      │
│          │    修改保存后自动同步（状态管理）                           │
│          ▼                   ▼                   ▼                      │
│    ┌─────────────────────────────────────────────────────────────┐    │
│    │                    前端状态管理中心（Zustand）                  │    │
│    │    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │    │
│    │    │ 部门   │ │ 人员   │ │ 品种   │ │ 仓库   │ │ 字典   │   │    │
│    │    │ 列表   │ │ 列表   │ │ 列表   │ │ 列表   │ │ 列表   │   │    │
│    │    └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │    │
│    └─────────────────────────────────────────────────────────────┘    │
│          │                   │                   │                      │
│          │  实时订阅/自动刷新  │                   │                      │
│          ▼                   ▼                   ▼                      │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐  │
│    │ 种源页面  │      │ 采收页面  │      │ 任务页面  │      │ 订单页面  │  │
│    │ 创建弹窗 ▼ 部门  │ 录入弹窗 ▼ 人员  │ 分派弹窗 ▼ 人员  │ 创建弹窗 ▼ 品种│  │
│    │ 部门下拉 ──→ 实时│ 采收人 ──→ 实时│ 执行人 ──→ 实时│ 作物 ──→ 实时│  │
│    └──────────┘      └──────────┘      └──────────┘      └──────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 联动触发机制

| 触发方式 | 适用场景 | 实现成本 | 实时性 |
|---------|---------|---------|--------|
| **页面刷新时加载** | 所有页面 | 低 | 中（刷新才更新） |
| **弹窗打开时加载** | 下拉框数据 | 中 | 高（每次打开最新） |
| **WebSocket推送** | 多标签页同步 | 高 | 极高（秒级） |
| **Service Worker轮询** | 后台静默更新 | 中 | 中高（分钟级） |

**推荐组合方案（MVP）**：
- 弹窗打开时实时加载（确保最新）
- 页面刷新时加载（兜底）
- 设置修改后主动刷新（即时）

### 9.3 联动场景示例

#### 场景1：新增温室 → 种植选址弹窗自动更新

```typescript
// 设置模块：新增温室
await greenhouseService.addGreenhouse({
  code: 'GH012',
  name: '12号大棚',
  baseId: 'BJ001',
  type: 'glass',
  area: 5,
});

// 自动触发：
// 1. SQLite 插入记录
// 2. 前端状态管理更新 greenhouseList
// 3. 种植页面 PlantingPage.tsx 的 useEffect 监听到列表变化
// 4. 种植创建弹窗中的温室下拉自动出现 "12号大棚"
```

#### 场景2：修改基地名 → 历史种植记录显示更新

```typescript
// 设置模块：修改基地名
await baseService.updateBase('BJ001', { name: '松江基地（扩建）' });

// 自动触发：
// 1. SQLite 更新 bases.name
// 2. 由于 plantings 表存储的是 baseId（不是 baseName）
// 3. 种植页面显示时通过 JOIN 查询实时获取基地名
// 4. 所有历史记录的显示自动更新，无需修改历史数据
```

#### 场景3：新增员工 → 种源创建弹窗"创建人"自动可选

```typescript
// 设置模块：新增员工
await staffService.addStaff({
  code: 'A007',
  name: '陈八',
  departmentId: 'D001',
  positionId: 'P003',
  entryDate: '2026-05-01',
});

// 自动触发：
// 1. SQLite 插入 staff 记录
// 2. 前端 staffList 状态更新
// 3. 种源创建弹窗中的"创建人"下拉自动出现"陈八"
// 4. 采收录入弹窗中的"采收人"多选自动出现"陈八"
// 5. 审批流程中的"审批人"选择自动出现"陈八"
```

#### 场景4：员工离职 → 历史记录保留但不再可选

```typescript
// 设置模块：员工离职
await staffService.updateStaff('A003', {
  status: 'resigned',
  leaveDate: '2026-05-01',
});

// 自动触发：
// 1. SQLite 更新 staff.status
// 2. 前端 staffList 过滤条件：仅 status='active'
// 3. 所有下拉框自动隐藏"A003 王建国"
// 4. 但历史种源记录中的 createBy 仍显示"王建国"（字符串保留）
```

---

## 10. 前端联动架构设计

### 10.1 状态管理中心

```typescript
// src/stores/settingsStore.ts - 设置数据状态管理

import { create } from 'zustand';

interface SettingsState {
  // 组织架构
  companies: CompanyGroup[];
  bases: Base[];
  greenhouses: Greenhouse[];
  plantAreas: PlantArea[];
  warehouses: Warehouse[];
  departments: Department[];
  positions: Position[];

  // 人员
  staffList: Staff[];
  teams: Team[];

  // 字典
  dictCache: Map<string, DictItem[]>;

  // 加载状态
  isLoading: boolean;
  lastLoadedAt: number;

  // Actions
  loadAll: () => Promise<void>;
  refresh: () => Promise<void>;
  invalidate: (key: string) => void;

  // Getters
  getActiveStaff: () => Staff[];
  getStaffById: (id: string) => Staff | undefined;
  getStaffByDepartment: (deptId: string) => Staff[];
  getDictItems: (categoryCode: string) => DictItem[];
  getActiveGreenhouses: () => Greenhouse[];
  getGreenhousesByBase: (baseId: string) => Greenhouse[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  companies: [],
  bases: [],
  greenhouses: [],
  plantAreas: [],
  warehouses: [],
  departments: [],
  positions: [],
  staffList: [],
  teams: [],
  dictCache: new Map(),
  isLoading: false,
  lastLoadedAt: 0,

  // 加载所有设置数据
  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [companies, bases, greenhouses, plantAreas, warehouses, departments, staffList, positions] =
        await Promise.all([
          companyGroupService.getAll(),
          baseService.getAll(),
          greenhouseService.getAll(),
          plantAreaService.getAll(),
          warehouseService.getAll(),
          departmentService.getAll(),
          staffService.getAll(),
          positionService.getAll(),
        ]);

      set({
        companies, bases, greenhouses, plantAreas, warehouses,
        departments, staffList, positions,
        lastLoadedAt: Date.now(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  // 刷新数据（设置修改后调用）
  refresh: async () => {
    await get().loadAll();
    // 触发全局刷新事件
    window.dispatchEvent(new CustomEvent('settings:refresh'));
  },

  // 标记某类数据失效
  invalidate: (key: string) => {
    // 清除缓存，下次使用时重新加载
  },

  // Getter: 在职员工
  getActiveStaff: () => get().staffList.filter(s => s.status === 'active'),

  // Getter: 按ID查员工
  getStaffById: (id: string) => get().staffList.find(s => s.id === id),

  // Getter: 按部门查员工
  getStaffByDepartment: (deptId: string) =>
    get().staffList.filter(s => s.departmentId === deptId && s.status === 'active'),

  // Getter: 字典项
  getDictItems: (categoryCode: string) => {
    return get().dictCache.get(categoryCode) || [];
  },

  // Getter: 正常温室
  getActiveGreenhouses: () => get().greenhouses.filter(g => g.status === 'active'),

  // Getter: 按基地查温室
  getGreenhousesByBase: (baseId: string) =>
    get().greenhouses.filter(g => g.baseId === baseId && g.status === 'active'),
}));
```

### 10.2 联动Hook设计

```typescript
// src/hooks/useSettings.ts - 设置数据Hook

import { useSettingsStore } from '@/stores/settingsStore';

/**
 * 使用设置数据（自动加载）
 */
export function useSettings() {
  const store = useSettingsStore();

  useEffect(() => {
    // 5分钟内不重复加载
    if (Date.now() - store.lastLoadedAt > 5 * 60 * 1000) {
      store.loadAll();
    }
  }, []);

  return store;
}

/**
 * 使用员工列表（自动过滤在职）
 */
export function useActiveStaff() {
  const store = useSettingsStore();
  return useMemo(() => store.getActiveStaff(), [store.staffList]);
}

/**
 * 使用部门列表
 */
export function useDepartments() {
  const store = useSettingsStore();
  return store.departments;
}

/**
 * 使用字典项
 */
export function useDictItems(categoryCode: string) {
  const [items, setItems] = useState<DictItem[]>([]);

  useEffect(() => {
    const store = useSettingsStore.getState();
    const cached = store.getDictItems(categoryCode);
    if (cached.length > 0) {
      setItems(cached);
    } else {
      dictionaryService.getItemsByCategory(categoryCode).then(data => {
        setItems(data);
        useSettingsStore.setState(state => ({
          dictCache: new Map(state.dictCache).set(categoryCode, data)
        }));
      });
    }
  }, [categoryCode]);

  return items;
}

/**
 * 使用温室（按基地过滤）
 */
export function useGreenhousesByBase(baseId?: string) {
  const store = useSettingsStore();
  return useMemo(() => {
    if (!baseId) return store.getActiveGreenhouses();
    return store.getGreenhousesByBase(baseId);
  }, [store.greenhouses, baseId]);
}
```

### 10.3 弹窗联动组件

#### 10.3.1 人员选择组件

```typescript
// src/components/common/StaffSelect.tsx - 人员选择组件

interface StaffSelectProps {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  mode?: 'single' | 'multiple';
  departmentId?: string;      // 按部门过滤
  placeholder?: string;
}

export function StaffSelect({ value, onChange, mode = 'single', departmentId, placeholder }: StaffSelectProps) {
  const staffList = useActiveStaff();

  // 按部门过滤
  const filteredStaff = useMemo(() => {
    if (!departmentId) return staffList;
    return staffList.filter(s => s.departmentId === departmentId);
  }, [staffList, departmentId]);

  return (
    <Select
      value={value}
      onChange={onChange}
      mode={mode === 'multiple' ? 'multiple' : undefined}
      placeholder={placeholder || '选择人员'}
    >
      {filteredStaff.map(staff => (
        <Option key={staff.id} value={staff.id}>
          <div className="flex items-center gap-2">
            <Avatar src={staff.avatar} size="small" />
            <span>{staff.name}</span>
            <Tag size="small">{staff.departmentName}</Tag>
          </div>
        </Option>
      ))}
    </Select>
  );
}
```

#### 10.3.2 字典选择组件

```typescript
// src/components/common/DictSelect.tsx - 字典选择组件

interface DictSelectProps {
  categoryCode: string;    // 字典分类编码（如：'seed_source_status'）
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}

export function DictSelect({ categoryCode, value, onChange, ...props }: DictSelectProps) {
  const [options, setOptions] = useState<DictItem[]>([]);

  useEffect(() => {
    getDictItems(categoryCode).then(setOptions);
  }, [categoryCode]);

  // 监听字典变化事件
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.categoryCode === categoryCode) {
        getDictItems(categoryCode).then(setOptions);
      }
    };
    window.addEventListener('dict:changed', handler);
    return () => window.removeEventListener('dict:changed', handler);
  }, [categoryCode]);

  return (
    <Select value={value} onChange={onChange} {...props}>
      {options.map(item => (
        <Option key={item.code} value={item.code}>
          <Tag color={item.color}>{item.name}</Tag>
        </Option>
      ))}
    </Select>
  );
}
```

#### 10.3.3 温室选择组件

```typescript
// src/components/common/GreenhouseSelect.tsx - 温室选择组件

interface GreenhouseSelectProps {
  value?: string;
  onChange: (value: string) => void;
  baseId?: string;            // 按基地过滤
  placeholder?: string;
}

export function GreenhouseSelect({ value, onChange, baseId, placeholder }: GreenhouseSelectProps) {
  const greenhouses = useGreenhousesByBase(baseId);

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder || '选择温室'}
    >
      {greenhouses.map(gh => (
        <Option key={gh.id} value={gh.id}>
          <div className="flex items-center justify-between">
            <span>{gh.name}</span>
            <span className="text-gray-400 text-sm">{gh.baseName}</span>
          </div>
        </Option>
      ))}
    </Select>
  );
}
```

### 10.4 全局刷新机制

```typescript
// src/App.tsx - 全局刷新监听

function App() {
  const settingsStore = useSettingsStore();

  useEffect(() => {
    // 监听设置刷新事件
    const handleRefresh = () => {
      settingsStore.loadAll();
    };

    window.addEventListener('settings:refresh', handleRefresh);

    // 定期刷新（5分钟）
    const interval = setInterval(() => {
      settingsStore.loadAll();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('settings:refresh', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  return <Router />;
}
```

---

## 11. 数据迁移与清洗方案

### 11.1 迁移策略

```
Phase 1: 基础设置迁移（2周）
├── 步骤1：创建正规化Schema（组织/人员/字典/配置/权限）
├── 步骤2：开发设置页面（CRUD完整+联动）
├── 步骤3：预置基础数据（公司/基地/温室/部门/人员/字典）
└── 步骤4：验证设置页面可用

Phase 2: 业务数据关联化（2周）
├── 步骤1：业务表添加关联字段（supplier_id/staff_id/warehouse_id）
├── 步骤2：数据清洗脚本（字符串→ID映射）
├── 步骤3：改造业务弹窗（下拉选择从设置获取）
└── 步骤4：验证业务模块正常

Phase 3: 硬编码消除（1周）
├── 步骤1：替换所有硬编码数组（232处）
├── 步骤2：删除重复LocalStorage实现
└── 步骤3：删除重复页面文件（7个）

Phase 4: 权限与流程（1周）
├── 步骤1：实现RBAC权限系统
├── 步骤2：实现审批流程引擎
└── 步骤3：集成到业务模块
```

### 11.2 数据清洗脚本

#### 11.2.1 清洗种源表的createBy（字符串→ID）

```typescript
async function migrateSeedSourceCreateBy() {
  const seedSources = await db.query('SELECT id, createBy FROM seed_sources');
  const staffList = await db.query('SELECT id, name FROM staff');

  for (const source of seedSources) {
    const staff = staffList.find(s => s.name === source.createBy);
    if (staff) {
      await db.exec(
        'UPDATE seed_sources SET create_by_id = ?, createBy = ? WHERE id = ?',
        [staff.id, source.createBy, source.id]
      );
    } else {
      // 未匹配到的人员，创建虚拟员工记录
      const virtualStaff = await staffService.addStaff({
        name: source.createBy,
        code: `VIRTUAL_${Date.now()}`,
        departmentId: 'D001',
        status: 'active',
      });
      await db.exec(
        'UPDATE seed_sources SET create_by_id = ? WHERE id = ?',
        [virtualStaff.id, source.id]
      );
    }
  }
}
```

#### 11.2.2 清洗采收表的harvesterNames（字符串数组→ID数组）

```typescript
async function migrateHarvestHarvesters() {
  const harvests = await db.query('SELECT id, harvesterNames FROM harvests');
  const staffList = await db.query('SELECT id, name FROM staff');

  for (const harvest of harvests) {
    const names: string[] = JSON.parse(harvesterNames || '[]');
    const ids: string[] = [];

    for (const name of names) {
      const staff = staffList.find(s => s.name === name);
      if (staff) ids.push(staff.id);
    }

    await db.exec(
      'UPDATE harvests SET harvester_ids = ? WHERE id = ?',
      [JSON.stringify(ids), harvest.id]
    );
  }
}
```

#### 11.2.3 清洗采收表的warehouseName（字符串→ID）

```typescript
async function migrateHarvestWarehouse() {
  const harvests = await db.query('SELECT id, warehouseName FROM harvests');
  const warehouses = await db.query('SELECT id, name FROM warehouses');

  for (const harvest of harvests) {
    const wh = warehouses.find(w => w.name === harvest.warehouseName);
    if (wh) {
      await db.exec(
        'UPDATE harvests SET warehouse_id = ? WHERE id = ?',
        [wh.id, harvest.id]
      );
    } else {
      // 创建缺失的仓库
      const newWh = await warehouseService.addWarehouse({
        name: harvest.warehouseName,
        type: 'general',
        status: 'active',
      });
      await db.exec(
        'UPDATE harvests SET warehouse_id = ? WHERE id = ?',
        [newWh.id, harvest.id]
      );
    }
  }
}
```

### 11.3 关联字段补全清单

| 业务表 | 当前字段 | 新增关联字段 | 关联表 | 清洗方式 |
|--------|---------|------------|--------|---------|
| seed_sources | createBy: string | create_by_id: string | staff | 人名匹配 |
| seed_sources | supplierName: string | supplier_id: string | suppliers | 名称匹配 |
| seedlings | createBy: string | create_by_id: string | staff | 人名匹配 |
| plantings | createBy: string | create_by_id: string | staff | 人名匹配 |
| plantings | areaId: string | greenhouse_id: string | greenhouses | 已有关联 |
| harvests | harvesterNames: string[] | harvester_ids: string[] | staff | 人名匹配 |
| harvests | auditor: string | auditor_id: string | staff | 人名匹配 |
| harvests | warehouseName: string | warehouse_id: string | warehouses | 名称匹配 |
| crop_orders | createBy: string | create_by_id: string | staff | 人名匹配 |
| farm_activities | assignee: string | assignee_id: string | staff | 人名匹配 |
| approvals | applicant: string | applicant_id: string | staff | 人名匹配 |
| approvals | approver: string | approver_id: string | staff | 人名匹配 |
| materials | warehouse: string | warehouse_id: string | warehouses | 名称匹配 |
| devices | location: string | greenhouse_id: string | greenhouses | 名称匹配 |

---

## 12. 实施路径

### 12.1 总体时间表（6周）

```
Week 1-2: Phase 1 - 基础设置层
┌─────────────────────────────────────────────────────────────────┐
│ Day 1-3:  创建正规化Schema（12张表）                              │
│ Day 4-7:  开发设置页面（组织架构/人员管理/数据字典）               │
│ Day 8-10: 开发设置页面（系统配置/审批流程/通知设置/用户权限）      │
│ Day 11-14: 预置基础数据 + 测试验证                                │
└─────────────────────────────────────────────────────────────────┘

Week 3-4: Phase 2 - 业务关联层
┌─────────────────────────────────────────────────────────────────┐
│ Day 15-17: 业务表加关联字段 + 数据清洗脚本                         │
│ Day 18-22: 改造业务弹窗（StaffSelect/DictSelect/GreenhouseSelect）│
│ Day 23-25: 改造列表页（显示名称从ID JOIN查询）                     │
│ Day 26-28: 测试验证                                               │
└─────────────────────────────────────────────────────────────────┘

Week 5: Phase 3 - 硬编码消除
┌─────────────────────────────────────────────────────────────────┐
│ Day 29-31: 替换232处硬编码为字典/设置查询                          │
│ Day 32-33: 删除重复LocalStorage + 删除重复页面文件                 │
│ Day 34-35: 全面测试                                               │
└─────────────────────────────────────────────────────────────────┘

Week 6: Phase 4 - 权限与流程
┌─────────────────────────────────────────────────────────────────┐
│ Day 36-38: 实现RBAC权限系统（角色/权限/数据范围）                  │
│ Day 39-40: 实现审批流程引擎（可视化设计器）                       │
│ Day 41-42: 集成到业务模块 + 最终测试                               │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 关键里程碑

| 里程碑 | 交付物 | 验收标准 |
|--------|--------|---------|
| M1（Week 2末） | 设置模块可用 | 组织架构/人员/字典/配置页面可CRUD，数据存SQLite |
| M2（Week 4末） | 业务联动可用 | 种源/育苗/种植/采收弹窗下拉从设置获取，ID关联 |
| M3（Week 5末） | 硬编码清零 | 全系统无硬编码数组，无重复文件 |
| M4（Week 6末） | 权限流程可用 | 角色分配控制菜单/按钮/数据，审批自动触发 |

### 12.3 风险控制

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 数据清洗丢失 | 中 | 高 | 迁移前全量备份，支持回滚 |
| 字符串匹配失败 | 高 | 中 | 未匹配项创建虚拟记录，人工复核 |
| 前端改造量大 | 高 | 中 | 分批改造，每批验证后再继续 |
| 性能下降 | 低 | 中 | 前端缓存+后端索引+分页加载 |
| 多标签不同步 | 中 | 低 | 定期轮询+手动刷新按钮 |

---

## 13. 预期效果对比

### 13.1 重构前后对比

| 维度 | 重构前 | 重构后 |
|------|--------|--------|
| **设置入口** | 2个冲突入口 | 1个统一入口 |
| **重复文件** | 7个重复页面 | 0个重复页面 |
| **持久化** | 硬编码+LocalStorage | 全部SQLite |
| **部门管理** | 7处硬编码，各不相同 | 1处维护，全局同步 |
| **人员管理** | 6个硬编码，改名失效 | SQLite表，ID关联 |
| **基地管理** | 11个硬编码，无法增删 | SQLite表，CRUD完整 |
| **仓库管理** | 无设置页，3处硬编码 | SQLite表，统一命名 |
| **数据字典** | 写死在代码 | 后台配置，即时生效 |
| **审批流程** | 角色字符串，无法解析 | 人员/角色/部门可选 |
| **通知设置** | 收件人无法指定 | 具体人员可选 |
| **农事配置** | 代码常量，改要编译 | 后台配置，即时生效 |
| **统计分析** | 无法做（字符串关联） | 任意维度统计 |
| **权限控制** | 无 | 菜单/按钮/数据三级权限 |

### 13.2 业务价值

1. **数据一致性**：改一个部门名，所有历史记录自动更新显示
2. **管理便捷**：新增基地/人员/仓库，后台点一下就生效
3. **统计能力**："生产部今年种了多少番茄？" → 3秒出结果
4. **权限精细**："张三只能看到自己基地的数据" → 可实现
5. **配置灵活**："把任务超时从24小时改为48小时" → 后台改配置，即时生效
6. **维护成本**：新增一个状态不再需要改代码重新编译部署

### 13.3 权限联动效果

```
设置模块操作                    前端联动效果
─────────────────────────────────────────────────────────
给张三分配"部门主管"角色         张三登录后：
                                - 看到主管菜单
                                - 可审批下属的申请
                                - 看到部门全部数据
                                - 按钮权限自动生效

取消李四的"编辑种源"权限         李四的种源页面：
                                - "编辑"按钮消失
                                - 点击编辑提示无权限
                                - API接口返回403

给生产部设置"公司级"数据权限      生产部全员：
                                - 可看到本公司全部数据
                                - 不受个人创建限制
```

---

## 14. 附录

### A. 删除文件清单

```
删除以下7个重复/无用文件：

1. src/components/settings/SettingsPage.tsx
   → 原因：与src/pages/Settings.tsx功能重复

2. src/components/department/departmentPage.tsx
   → 原因：与src/pages/DepartmentSettings.tsx内容相同

3. src/components/baseSettings/BaseSettingsPage.tsx
   → 原因：与src/pages/BaseSettings.tsx内容相同

4. src/components/baseSettings/ (整个目录)
   → 原因：空目录或重复文件

5. src/components/personnel/personnelPage.tsx
   → 原因：与src/pages/StaffManagement.tsx内容相同

6. src/pages/StaffManagement.tsx
   → 原因：与SettingsPersonnelStaff重复，且功能已被PersonnelManagement覆盖

7. src/pages/SettingsPersonnelStaff.tsx
   → 原因：只是重导出personnelPage，无独立功能

注意：删除前需确认没有其他文件import这些文件。
```

### B. 保留文件清单

```
保留并升级以下设置页面：

入口：
├── src/pages/Settings.tsx                          → 唯一设置入口（合并两个入口）

基础设置：
├── src/pages/BaseSettings.tsx                      → 升级为组织架构（公司/基地/温室/区域/仓库/部门/职位）
├── src/pages/PersonnelManagement.tsx               → 升级为人员管理（员工/职位/班组/考勤规则）
├── src/pages/CropVarietyManagement.tsx             → 保留（升级为SQLite）
├── src/pages/MaterialManagement.tsx                → 保留（升级为SQLite）
├── src/pages/ProcessManagement.tsx                 → 保留（升级为SQLite）
├── src/pages/SupplierManagement.tsx                → 保留（升级为SQLite，新增供应商管理）
├── src/pages/PlantingModeManagement.tsx            → 保留（升级为SQLite）
├── src/pages/WarehouseManagement.tsx               → 合并到BaseSettings（仓库Tab）

系统设置：
├── src/pages/DictionaryManagement.tsx               → 升级为数据字典（分类+字典项CRUD+联动）
├── src/pages/SystemConfig.tsx                      → 升级为系统配置（配置项生效+变更日志）
├── src/pages/ApprovalWorkflowConfig.tsx            → 升级为审批流程（可视化设计器+条件分支）
├── src/pages/NotificationSettings.tsx              → 升级为通知设置（人员选择器+发送历史）
├── src/pages/UserPermission.tsx                    → 升级为用户权限（RBAC+菜单/按钮/数据权限）
├── src/pages/DeviceManagement.tsx                  → 升级为设备管理（位置关联+告警规则）
```

### C. 完整表结构清单

#### 设置模块表（19张）

| # | 表名 | 说明 | 状态 |
|---|------|------|------|
| 1 | company_groups | 公司 | 改造（消除data_json） |
| 2 | bases | 基地 | 改造（消除data_json） |
| 3 | greenhouses | 温室/大棚 | 新增 |
| 4 | plant_areas | 种植区域 | 改造（消除data_json） |
| 5 | warehouses | 仓库 | 改造（消除data_json） |
| 6 | departments | 部门 | 改造（消除data_json） |
| 7 | positions | 职位 | 改造（消除data_json） |
| 8 | staff | 员工 | 改造（消除data_json） |
| 9 | teams | 班组 | 新增 |
| 10 | suppliers | 供应商 | 新增 |
| 11 | materials | 物料 | 改造（消除data_json） |
| 12 | dictionary_categories | 字典分类 | 改造（消除data_json） |
| 13 | dictionary_items | 字典项 | 改造（消除data_json） |
| 14 | system_configs | 系统配置 | 改造（消除data_json） |
| 15 | roles | 角色 | 新增 |
| 16 | permissions | 权限 | 新增 |
| 17 | role_permissions | 角色权限关联 | 新增 |
| 18 | user_roles | 用户角色关联 | 新增 |
| 19 | devices | 设备 | 改造（消除data_json） |

#### 业务模块需新增关联字段

| 业务表 | 新增字段 |
|--------|---------|
| seed_sources | create_by_id, supplier_id |
| seedlings | create_by_id |
| plantings | create_by_id, greenhouse_id |
| harvests | harvester_ids, auditor_id, warehouse_id |
| crop_orders | create_by_id |
| farm_activities | assignee_id, greenhouse_id |
| approvals | applicant_id, approver_id |
| devices | greenhouse_id |
| materials | warehouse_id |

### D. 术语对照

| 旧术语 | 新术语 | 说明 |
|-------|-------|------|
| 公司/基地 | 基地 | 统一种植生产单位 |
| 温室/大棚 | 温室 | 设施农业建筑 |
| 区域/地块 | 区域+地块 | 温室内的细分管理单元 |
| 职务 | 岗位 | 职位定义 |

### E. 参考文档

- [数据迁移-Claude.md](./数据迁移-Claude.md) - 数据库Schema设计
- `src/pages/DictionaryManagement.tsx` - 字典管理实现参考
- `src/pages/ApprovalWorkflowConfig.tsx` - 审批流程配置参考

---

**文档状态**: V2.0 完成
**更新日期**: 2026-05-02
**版本历史**:
- V1.0: 初始规划版本
- V2.0: 整合Kimi规划内容，增加模块升级详细设计、数据联动架构、前端联动架构、预期效果对比
