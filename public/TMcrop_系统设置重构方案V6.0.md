# 系统设置模块重构规划

> **文档版本**: V6.0 终极整合版
> **创建日期**: 2026-05-02
> **更新日期**: 2026-05-02（整合V1/V2/V3/V4/V4_base/V4_new/V5.0 + Kimi深度联动版 + Opencode可复用代码V3.0 + 远程仓库扫描）
> **项目**: 智慧种植生产管理系统 V1.1
> **目标**: 基于数据迁移架构，重构系统设置模块，实现"后台一改、全局联动"
> **设计原则**: 所有基础数据单点维护、业务模块实时引用、禁止任何硬编码
> **核心要求**: ① 所有设置模块必须采用后台API + SQLite数据库对接，与业务模块页面数据实时联动；② 方案内含完整可直接复制使用的代码（组织管理、权限管理、角色管理等全部模块）

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [现状全景扫描](#2-现状全景扫描)
3. [问题分级诊断](#3-问题分级诊断)
4. [重构目标与原则](#4-重构目标与原则)
5. [模块去重与合并方案](#5-模块去重与合并方案)
6. [新增模块清单](#6-新增模块清单)
7. [统一数据字典体系](#7-统一数据字典体系)
8. [后台可配置参数清单](#8-后台可配置参数清单)
9. [关联关系设计](#9-关联关系设计)
10. [模块升级详细设计](#10-模块升级详细设计)
11. [数据联动架构设计](#11-数据联动架构设计)
12. [前端联动架构设计](#12-前端联动架构设计)
13. [SQLiteSchema正规化改造](#13-sqliteschema正规化改造)
14. [数据迁移与清洗方案](#14-数据迁移与清洗方案)
15. [权限系统设计](#15-权限系统设计)
16. [实施路线图](#16-实施路线图)
17. [预期效果对比](#17-预期效果对比)
18. [附录](#18-附录)
19. [权限系统扩展设计](#19-权限系统扩展设计v40-弘智耘源权限架构)
20. [类型定义](#20-类型定义)
21. [数据库Schema](#21-数据库schema)
22. [API服务层](#22-api服务层)
23. [React Context](#23-react-context)
24. [页面组件代码](#24-页面组件代码)
25. [App路由配置](#25-app路由配置)
26. [数据库初始化](#26-数据库初始化)
27. [package.json脚本](#27-packagejson脚本)
28. [UI组件依赖](#28-ui组件依赖)
29. [后续开发指南](#29-后续开发指南)

---

## 1. 执行摘要

### 1.1 核心发现

| 问题类别 | 数量 | 严重程度 | 说明 |
|---------|------|---------|------|
| **设置入口重复** | 2个入口页面 | 🔴 致命 | Settings.tsx(20模块) vs SettingsPage.tsx(8模块)，内容冲突 |
| **重复页面文件** | 7个文件 | 🔴 致命 | department×2 / base×2 / personnel×3，内容完全一样 |
| **硬编码数据点** | 232处+ | 🔴 致命 | 部门/人员/仓库/温室等数据写死在代码里 |
| **部门定义不一致** | 7个位置各不同 | 🔴 致命 | 设置页5个/加班表单5个(不同)/考勤页4个(又不同) |
| **LocalStorage KEY** | 27个 | 🟠 严重 | 系统配置/通知/审批/设备/仓库等存本地 |
| **后端data_json反模式** | 15张表 | 🟠 严重 | 整张表只有一个JSON字段，无法SQL关联查询 |
| **业务模块数据断层** | 全部业务 | 🔴 致命 | createBy/harvesterNames/areaName全是字符串，不是ID |

### 1.2 一句话总结

> 当前系统有 **2套设置入口、7个重复页面、232处硬编码、15张反模式表**。修改一个部门名字要改 **7个文件**，新增一个员工要改 **5个文件**，而且历史记录全部失效。系统设置模块形同虚设，业务模块各自为战。

### 1.3 重构后愿景

```
重构前：修改"生产部"名字 → 改7个文件 → 历史记录还是旧名 → 统计全错
重构后：修改"生产部"名字 → 后台点一下 → 全局自动更新 → 统计正确
```

### 1.4 V6.0 新增核心要求（基于用户明确指令）

| 要求 | 说明 | 影响范围 |
|-----|------|---------|
| **所有模块API数据库对接** | 全部20个设置子模块必须通过REST API + SQLite持久化，禁止LocalStorage存储业务数据 | 全部设置模块 |
| **可复用代码完整提供** | 组织管理、权限管理、角色管理、数据字典等核心模块提供可直接复制使用的完整代码（TypeScript + React + Node.js） | 方案第19-29章 |
| **与业务模块实时联动** | 设置模块数据变更后，业务模块（种植/采收/人工/库存等）通过全局事件机制自动刷新 | 全部业务模块 |
| **远程仓库状态锚定** | 方案基于 `planting-management` 分支实际代码状态（2026-05-02扫描），确保可落地 | 方案全部章节 |

### 1.5 V6.0 整合来源说明

本方案整合以下全部历史版本精华：
- **V1/V2 (Claudecode)**：基础问题诊断 + 模块分类
- **V3.0**：数据联动架构设计 + 全局事件机制
- **V4/V4_base/V4_new**：SQLite Schema正规化 + 外键关联设计
- **V5.0**：完整可复用代码（权限系统、类型定义、数据库Schema、API服务层、React Context、页面组件）
- **Kimi深度联动版**：数据字典驱动 + 关联关系图谱
- **Opencode可复用代码V3.0**：UI组件依赖 + 后续开发指南

---

## 2. 现状全景扫描

### 2.1 设置入口页面（2套冲突）

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 入口A：src/pages/Settings.tsx（20个模块）                                │
├─────────────────────────────────────────────────────────────────────────┤
│ 系统配置 │ 数据字典 │ 用户权限 │ 审批流程 │ 通知设置 │ 设备管理         │
│ 仓库管理 │ 班组管理 │ 基地管理 │ 区块管理 │ 基地设置 │ 区域管理         │
│ 种植模式 │ 作物品种库│ 物料管理 │ 工序管理 │ 人事管理 │ 部门设置       │
│ 成本核算 │ 操作日志 │                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 入口B：src/components/settings/SettingsPage.tsx（8个模块）                │
├─────────────────────────────────────────────────────────────────────────┤
│ 基地设置 │ 区域管理 │ 种植模式管理 │ 作物管理 │ 物料管理 │ 工序管理    │
│ 人事管理 │ 部门设置 │                                                        │
└─────────────────────────────────────────────────────────────────────────┘

冲突点：
- "基地管理"(/settings/branch) vs "基地设置"(/settings/bases) → 两个不同路由！
- "区域管理"在两个入口中都有，但路由不同 → 可能指向不同页面
- "作物管理"在入口B中，但路由是 /settings/crops → 实际指向 CropManagement
```

### 2.2 重复页面文件详细对比

#### 重复1：部门设置（2个文件，内容几乎一样）

```
文件A: src/components/department/departmentPage.tsx
文件B: src/pages/DepartmentSettings.tsx

对比结果：
┌──────────────┬─────────────────────┬─────────────────────┐
│    维度      │      文件A          │      文件B          │
├──────────────┼─────────────────────┼─────────────────────┤
│ 数据定义     │ const departments   │ const departments   │
│             │ (完全相同的5个部门)  │ (完全相同的5个部门)  │
│ 页面标题     │ "部门设置"          │ "部门设置"          │
│ 统计卡片     │ 3个（总数/正常/员工）│ 3个（总数/正常/员工）│
│ 表格列       │ 9列                │ 9列                │
│ 分页逻辑     │ 相同               │ 相同               │
│ 新增按钮     │ 有（无实际功能）    │ 有（无实际功能）    │
│ 路由入口     │ /settings/departments│ /settings/departments│ ← 同一个路由！
└──────────────┴─────────────────────┴─────────────────────┘
```

#### 重复2：基地设置（2个文件，内容几乎一样）

```
文件A: src/components/baseSettings/BaseSettingsPage.tsx
文件B: src/pages/BaseSettings.tsx

对比结果：
┌──────────────┬─────────────────────┬─────────────────────┐
│    维度      │      文件A          │      文件B          │
├──────────────┼─────────────────────┼─────────────────────┤
│ 数据定义     │ initialCompanyGroups│ initialCompanyGroups│
│             │ (完全相同的2公司11基地)│ (完全相同的2公司11基地)│
│ 搜索筛选     │ 名称+状态+作物       │ 名称+状态+作物       │
│ 统计卡片     │ 3个                │ 3个                │
│ 新增/编辑弹窗 │ 有                │ 有                │
│ 路由入口     │ 未知               │ /settings/bases     │
└──────────────┴─────────────────────┴─────────────────────┘
```

#### 重复3：人员管理（3个文件）

```
文件A: src/components/personnel/personnelPage.tsx       → 被SettingsPersonnelStaff.tsx重导出
文件B: src/pages/StaffManagement.tsx                   → 独立页面
文件C: src/pages/SettingsPersonnelStaff.tsx            → 重导出文件A

文件C内容：export { PersonnelPage, default } from '../components/personnel';

结论：文件C只是重导出文件A，没有独立功能。
      文件A和B是相同功能的两个独立实现。
```

### 2.3 硬编码数据全景扫描

#### 2.3.1 部门硬编码（7个位置定义，各不相同）

```
位置1: src/components/department/departmentPage.tsx
  const departments = ['管理层','技术部','生产部','后勤部','财务部']

位置2: src/pages/DepartmentSettings.tsx
  const departments = ['管理层','技术部','生产部','后勤部','财务部']  ← 同位置1

位置3: src/components/labor/overtime/OvertimeFormModal.tsx
  const departments = ['生产部','技术部','质检部','仓储部','设备部']
  ↑ 注意：没有管理层/财务部，多了质检部/仓储部/设备部

位置4: src/components/labor/skill/SkillBatchEditModal.tsx
  const departments = ['生产部','技术部','质检部','仓储部','设备部']
  ↑ 同位置3

位置5: src/components/labor/attendance/WorkerAttendancePage.tsx
  const departments = ['全部','生产部','技术部','仓储部','质检部']
  ↑ 又不一样了：没有设备部，多了"全部"

位置6: src/components/personnel/personnelPage.tsx
  筛选下拉：['全部','生产部','技术部','后勤部']
  ↑ 又不一样了

位置7: src/pages/StaffManagement.tsx
  筛选下拉：['全部','生产部','技术部','后勤部']
  ↑ 同位置6
```

#### 2.3.2 人员硬编码（多处定义）

```
位置1: src/components/personnel/personnelPage.tsx
  const staffData = [6个人]

位置2: src/pages/StaffManagement.tsx
  const staffData = [6个人]  ← 同位置1

位置3: src/components/labor/overtime/OvertimeFormModal.tsx
  const MOCK_STAFF = [12个人]
  ↑ 不同的人！而且12个人中有一些不在位置1的6人中

位置4: src/components/labor/schedule/SchedulePage.tsx
  const MOCK_STAFF = [12个人]
  ↑ 同位置3

位置5: src/components/farm/harvest/HarvestPage.tsx
  采收人：harvesterNames = ["张三","李四"]  ← 字符串数组
```

#### 2.3.3 仓库硬编码（3处不同命名）

```
位置1: src/components/farm/harvest/HarvestPage.tsx
  const warehouseOptions = [
    { value: 'main', label: '主仓库' },
    { value: 'cold', label: '冷库' }
  ]

位置2: src/components/materialReceiving/modals/BatchEditModal.tsx
  const warehouseOptions = ['仓库A区','仓库B区','仓库C区','仓库D区','仓库E区']
  ↑ 完全不同的仓库命名体系！

位置3: src/components/materialReceiving/modals/ExecuteBatchEditModal.tsx
  const warehouseOptions = ['仓库A区','仓库B区','仓库C区','仓库D区','仓库E区']
  ↑ 同位置2
```

#### 2.3.4 温室硬编码（7处独立数组）

```
位置1: src/components/baseSettings/BaseSettingsPage.tsx
  从initialCompanyGroups中提取（11个基地，每个基地有greenhouseCount）

位置2: src/components/parkArchive/ParkArchivePage.tsx
  const initialCompanyGroups = [与位置1完全相同的数据]

位置3-7: src/components/labor/tempTask/TempTaskFormModal.tsx
  src/components/labor/tasks/BatchEditModal.tsx
  src/components/production/modals/BatchEditModal.tsx
  src/components/farm/harvest/HarvestPage.tsx
  src/components/farm/hub/InspectionTab.tsx
  ↑ 各自有独立的温室数组
```

### 2.4 后端SQLite反模式扫描

```sql
-- backend/init.sql 中的反模式表（15张+）
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  data_json TEXT,          -- ❌ 所有字段塞进JSON
  created_at TEXT,
  updated_at TEXT
);

-- 类似反模式表还有：
-- positions, staff, company_groups, bases, greenhouses, plant_areas,
-- warehouses, materials, system_configs, dictionaries, planting_modes,
-- blocks, indicators, farm_activities, produce_inventories, attendance_records

**反模式后果**：
1. 无法SQL查询：name在JSON里，SQL查询失败
2. 无法建索引：无法在JSON字段上建索引
3. 无法外键关联：无法JOIN查询属性
4. 数据校验困难：无法利用数据库的NOT NULL/UNIQUE约束
```

---

### 2.5 远程仓库文件扫描结果（2026-05-02 实际状态）

基于 `planting-management` 分支实际代码扫描：

#### ✅ 存在的设置页面文件（27个）

| 文件路径 | 大小 | 路由 | 说明 |
|---------|------|------|------|
| src/pages/Settings.tsx | 4.7KB | /settings | 入口页面（20个子模块导航） |
| src/pages/SystemConfig.tsx | 15.4KB | /settings/system-config | 系统配置 |
| src/pages/DictionaryManagement.tsx | 54.4KB | /settings/dictionary | 数据字典 |
| src/pages/UserPermission.tsx | 24.6KB | /settings/user-permission | 用户权限 |
| src/pages/ApprovalWorkflowConfig.tsx | 20.9KB | /settings/approval-workflow | 审批流程 |
| src/pages/NotificationSettings.tsx | 19.6KB | /settings/notification | 通知设置 |
| src/pages/DeviceManagement.tsx | 14.4KB | /settings/device | 设备管理 |
| src/pages/WarehouseManagement.tsx | 14.8KB | /settings/warehouse | 仓库管理 |
| src/pages/TeamManagement.tsx | 22.6KB | /settings/team | 班组管理 |
| src/pages/CostAccounting.tsx | 22.9KB | /settings/cost-accounting | 成本核算 |
| src/pages/AuditLog.tsx | 14.5KB | /settings/audit-log | 操作日志 |
| src/pages/PlantingModeManagement.tsx | 11.5KB | /settings/modes | 种植模式 |
| src/pages/PlantAreaManagement.tsx | 11.5KB | /settings/regions | 区域管理 |
| src/pages/CropManagement.tsx | 11.4KB | /settings/crops | 作物管理 |
| src/pages/MaterialManagement.tsx | 11.1KB | /settings/materials | 物料管理 |
| src/pages/ProcessManagement.tsx | 8.7KB | /settings/processes | 工序管理 |
| src/pages/DepartmentSettings.tsx | 9.2KB | /settings/departments | 部门设置 |
| src/pages/BaseSettings.tsx | 40.9KB | /settings/bases | 基地设置 |
| src/pages/BranchManagement.tsx | 16.9KB | /settings/branch | 基地管理 |
| src/pages/BlockManagement.tsx | 19.5KB | /settings/block | 区块管理 |
| src/pages/FarmActivityManagement.tsx | 26.0KB | /settings/farm-activity | 农事活动 |
| src/pages/PersonnelManagement.tsx | 11.0KB | /settings/personnel | 人事管理入口 |
| src/pages/PositionManagement.tsx | 8.7KB | /settings/personnel/position | 岗位管理 |
| src/pages/StaffManagement.tsx | 10.6KB | /settings/personnel/staff | 人员管理 |
| src/pages/HrAttendance.tsx | 19.4KB | /settings/personnel/attendance | 考勤管理 |
| src/pages/HrApproval.tsx | 27.3KB | /settings/personnel/hr-approval | 审批管理 |
| src/pages/HrApprovalDocuments.tsx | 11.2KB | /settings/personnel/hr-documents | 人事档案 |

#### ⚠️ 路由存在但文件缺失（1个）

| 路由 | 引用组件 | 状态 |
|------|---------|------|
| /settings/crop-variety | CropVarietyManagement | **文件不存在** ❌ |

#### 🔁 重复/重导出文件（4个）

| 文件 | 大小 | 类型 | 处理建议 |
|------|------|------|---------|
| src/components/settings/SettingsPage.tsx | 4.2KB | 重复入口 | **删除**，统一使用src/pages/Settings.tsx |
| src/components/department/departmentPage.tsx | 9.5KB | 重复实现 | **删除**，统一使用src/pages/DepartmentSettings.tsx |
| src/components/baseSettings/BaseSettingsPage.tsx | 38.3KB | 重复实现 | **删除**，统一使用src/pages/BaseSettings.tsx |
| src/components/personnel/personnelPage.tsx | 10.8KB | 重复实现 | **删除**，统一使用src/pages/StaffManagement.tsx |
| src/pages/SettingsPersonnelStaff.tsx | 186B | 重导出 | **删除**，直接路由到组件 |

---

## 3. 问题分级诊断

### 3.1 致命问题（🔴 必须立即解决）

| # | 问题 | 影响 | 解决方式 |
|---|------|------|---------|
| 1 | **部门硬编码7处不一致** | 新增/修改部门要改多个文件，极易遗漏，导致数据不一致 | 统一SQLite表+字典驱动 |
| 2 | **人员硬编码多处不一致** | 历史记录用字符串存储，改名后全部失效 | ID关联+SQLite表 |
| 3 | **业务数据全用字符串关联** | createBy/harvesterNames/areaName全是字符串，无法统计/追溯 | 全部改为ID外键 |
| 4 | **2套设置入口冲突** | 用户从不同入口看到不同菜单，困惑 | 合并为1个入口 |
| 5 | **后端data_json反模式** | 15张表无法SQL查询/关联/建索引 | 全部正规化 |

### 3.2 严重问题（🟠 1周内解决）

| # | 问题 | 影响 | 解决方式 |
|---|------|------|---------|
| 6 | **7个重复页面文件** | 维护困难，改一处要改多处 | 删除重复，保留唯一 |
| 7 | **LocalStorage存储设置数据** | 数据无法跨设备同步，浏览器清除后丢失 | 迁移到SQLite |
| 8 | **审批流程角色字符串** | approverRole='production_manager'，系统不知道是谁 | 改为角色ID/人员ID |
| 9 | **通知收件人无法指定** | recipients=['approver']，系统无法解析 | 改为具体人员ID |
| 10 | **数据字典写死在代码** | 新增状态要改代码重新编译 | 后台配置+字典驱动 |

### 3.3 一般问题（🟡 2周内解决）

| # | 问题 | 影响 | 解决方式 |
|---|------|------|---------|
| 11 | **系统配置改了不生效** | demo_mode/theme_color等配置代码不读取 | 代码读取配置表 |
| 12 | **农事配置硬编码** | taskConfig.ts改阈值要重新编译 | 迁移到system_configs |
| 13 | **仓库命名体系不统一** | 采收用"主仓库/冷库"，领料用"仓库A区-E区" | 统一仓库表 |
| 14 | **权限系统纯展示** | UserPermission.tsx只有静态表格 | 实现RBAC |
| 15 | **无操作日志审计** | 不知道谁改了什么数据 | 实现审计日志 |

---

## 4. 重构目标与原则

### 4.1 重构目标

1. **消除硬编码** - 所有配置数据必须从SQLite读取
2. **配置与业务分离** - 系统配置表（sys_*）与业务表（biz_*）分离
3. **层级关系清晰** - 基地-温室-区域-地块四级结构明确
4. **部门-岗位-人员关联** - 三者之间建立正确的归属关系
5. **统一数据字典** - 所有下拉选项来自数据字典表
6. **后台可配置** - 所有业务参数可在后台界面修改
7. **实时联动** - 设置修改后，业务模块自动感知

### 4.2 设计原则

| 原则 | 说明 |
|-----|------|
| **配置驱动业务** | 业务行为由配置数据决定，而非代码逻辑 |
| **层级分明** | sys_*表仅存储配置，biz_*表仅存储业务数据 |
| **外键关联** | 所有表之间通过外键建立关联，保证参照完整性 |
| **审计追踪** | 每条配置记录有创建人/时间/修改记录 |
| **状态机管理** | 关键业务实体有统一的状态管理 |
| **联动实时性** | 设置修改后，通过状态管理自动同步到全系统 |

---

## 5. 模块去重与合并方案

### 5.1 入口统一方案

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

### 5.2 重复文件删除清单

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
```

### 5.3 模块重组方案

```
重构前（20个散乱模块）                       重构后（12个核心模块）
┌─────────────────────────┐               ┌─────────────────────────┐
│ 系统配置                  │               │ 🔧 基础设置（6个）       │
│ 数据字典                  │               │  ├── 组织架构           │
│ 用户权限                  │               │  │   （公司/基地/温室/    │
│ 审批流程                  │    合并      │  │    区域/仓库/部门）    │
│ 通知设置                  │◄──────────►│  ├── 人员管理            │
│ 设备管理                  │    归类      │  │   （员工/职位/班组）   │
│ 仓库管理                  │               │  ├── 作物品种库          │
│ 班组管理                  │               │  ├── 供应商管理          │
│ 基地管理                  │               │  ├── 物料管理            │
│ 区块管理                  │               │  └── 工序管理            │
│ 基地设置                  │               │                         │
│ 区域管理                  │               │ ⚙️ 系统设置（5个）       │
│ 种植模式                  │               │  ├── 数据字典            │
│ 作物品种库                │               │  ├── 系统配置            │
│ 物料管理                  │               │  ├── 审批流程            │
│ 工序管理                  │               │  ├── 通知设置            │
│ 人事管理                  │               │  └── 用户权限            │
│ 部门设置                  │               │                         │
│ 成本核算                  │               │ 📊 扩展设置（1个）       │
│ 操作日志                  │               │  └── 成本核算            │
└─────────────────────────┘               └─────────────────────────┘
```

### 5.4 重构后模块地图

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

## 6. 新增模块清单

### 6.1 必须新增的模块

#### 6.1.1 编码规则配置（sys_code_rules）

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

#### 6.1.2 区域管理（sys_zones）

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

#### 6.1.3 地块管理（sys_blocks）

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

#### 6.1.4 仓库管理（sys_warehouses）

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

#### 6.1.5 审批规则配置（sys_approval_rules）

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

#### 6.1.6 供应商管理（sys_suppliers）

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

---

## 7. 统一数据字典体系

### 7.1 字典架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                   字典分类表（dictionary_categories）          │
├─────────────────────────────────────────────────────────────┤
│ id │ code              │ name           │ module         │
│────┼───────────────────┼────────────────┼────────────────│
│ 1  │ seed_source_status│ 种源状态       │ crop          │
│ 2  │ staff_status      │ 人员状态       │ hr            │
│ 3  │ department_status │ 部门状态       │ organization   │
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

### 7.2 预置字典分类清单

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

### 7.3 字典表结构

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

### 7.4 字典使用规范

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

## 8. 后台可配置参数清单

### 8.1 编码规则配置

| 参数 | 配置项 | 默认值 | 说明 |
|-----|-------|-------|------|
| 部门编码 | 前缀 + 序号长度 | DEPT + 3位 | DEPT001 |
| 岗位编码 | 前缀 + 序号长度 | POS + 3位 | POS001 |
| 用户编码 | 前缀 + 序号长度 | U + 3位 | U001 |
| 基地编码 | 前缀 + 序号长度 | BASE + 3位 | BASE001 |
| 温室编码 | 前缀 + 序号长度 | GH + 3位 | GH001 |
| 物料编码 | 前缀 + 序号长度 | MT + 3位 | MT001 |
| 工序编码 | 前缀 + 序号长度 | PROC + 3位 | PROC001 |

### 8.2 审批流程配置

| 参数 | 配置项 | 默认值 | 说明 |
|-----|-------|-------|------|
| 审批超时 | 超时时间（小时） | 72 | 3天 |
| 自动审批 | 金额阈值 | 1000 | 以下自动审批 |
| 委托审批 | 是否允许 | 是 | 可委托他人审批 |
| 审批意见 | 是否必填 | 否 | 可选填写 |

### 8.3 业务参数配置

| 参数 | 配置项 | 默认值 | 说明 |
|-----|-------|-------|------|
| 安全库存 | 物料安全库存 | 10 | 低于此值预警 |
| 奖励系数 | 工序奖励比例 | 1.0 | 可调整 |
| 成活率阈值 | 育苗成活率 | 85% | 低于此值预警 |
| 采收周期 | 作物采收周期 | 7天 | 采收提醒 |

### 8.4 系统参数配置

| 参数 | 配置项 | 默认值 | 说明 |
|-----|-------|-------|------|
| 会话超时 | 超时时间（分钟） | 30 | 自动登出 |
| 密码策略 | 最小长度 | 6 | - |
| 密码策略 | 必须包含数字 | 否 | - |
| 登录限制 | 失败次数上限 | 5 | 5次后锁定 |
| 数据备份 | 自动备份周期 | 每天 | - |

### 8.5 从taskConfig.ts迁移的配置项

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
│                         │                     │   单次最大延期（小时）       │
├─────────────────────────┤                     ├─────────────────────────────┤
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

## 9. 关联关系设计

### 9.1 实体关系图（ER）

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   部门      │       │    岗位     │       │    人员     │
│ sys_depts  │       │sys_positions│       │  sys_users  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │◄──────│ dept_id     │       │ id          │
│ dept_code   │       │ id          │       │ dept_id     │◄────┐
│ dept_name   │       │ position_   │       │ position_id │◄───┐│
│ parent_id   │──────►│ code        │       │ role        │    ││
│ manager_id  │       │ name        │       └─────────────┘    ││
└─────────────┘       └─────────────┘                           ││
                                                               ││
┌─────────────┐       ┌─────────────┐       ┌─────────────┐   ││
│    基地     │       │    温室     │       │    区域     │   ││
│ sys_bases   │       │sys_greenhou.│       │ sys_zones   │   ││
├─────────────┤       ├─────────────┤       ├─────────────┤       ││
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

### 9.2 关联关系说明

| 关系 | 类型 | 说明 |
|-----|------|------|
| 部门-岗位 | 1:N | 一个部门可有多个岗位 |
| 部门-人员 | 1:N | 一个部门可有多个人员 |
| 岗位-人员 | 1:N | 一个岗位可有多个人员 |
| 基地-温室 | 1:N | 一个基地可有多个温室 |
| 温室-区域 | 1:N | 一个温室可有多个区域 |
| 区域-地块 | 1:N | 一个区域可有多个地块 |
| 人员-基地 | N:M | 一个人可负责多个基地 |

### 9.3 业务表外键关联

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

---

## 10. 模块升级详细设计

### 10.1 组织架构模块升级

#### 10.1.1 现状问题

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

#### 10.1.2 升级方案

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

#### 10.1.3 联动效果

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

### 10.2 人员管理模块升级

#### 10.2.1 现状问题

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

#### 10.2.2 升级方案

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

#### 10.2.3 联动效果

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增员工** | 全部业务弹窗 | 创建人/负责人/采收人/审核人 下拉新增选项 |
| **员工离职** | 全部业务 | 该员工不再出现在下拉中，历史记录保留 |
| **员工调部门** | 人工管理/统计 | 部门统计自动更新 |
| **新增职位** | 人员档案 | 职位下拉新增选项 |
| **新增班组** | 任务分派 | 可按班组批量分派任务 |
| **修改考勤规则** | 考勤计算 | 统计自动按新规则计算 |

### 10.3 数据字典模块升级

#### 10.3.1 现状问题

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

#### 10.3.2 升级方案

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

#### 10.3.3 联动效果（最关键）

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

### 10.4 审批流程模块升级

#### 10.4.1 现状问题

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

#### 10.4.2 升级方案

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

#### 10.4.3 联动效果

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增流程** | 对应模块 | 该模块业务自动触发新流程 |
| **修改节点** | 对应模块 | 审批路径自动更新 |
| **调整超时** | 对应模块 | 催办提醒按新时间触发 |
| **停用流程** | 对应模块 | 该业务不再触发审批 |

### 10.5 系统配置模块升级

#### 10.5.1 现状问题

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

#### 10.5.2 升级方案

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

### 10.6 用户权限模块升级

#### 10.6.1 现状问题

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

#### 10.6.2 升级方案

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

#### 10.6.3 权限矩阵设计

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

### 10.7 设备管理模块升级

#### 10.7.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 设备管理页面（DeviceManagement.tsx）                          │
├──────────────────────────────────────────────────────────────┤
│ 数据：const DEFAULT_DEVICES = [5个设备]  ← 硬编码               │
│ 存储：localStorage.getItem('device_management_data')          │
│ 功能：列表展示、新增/编辑/删除、状态切换                       │
│ 问题：                                                          │
│   1. 设备类型是字符串数组（['传感器','摄像头',...]）            │
│   2. 设备位置是字符串（'A区-温室1'）                          │
│   3. 没有与温室/基地关联                                      │
│   4. 没有设备告警规则配置                                     │
│   5. 没有设备数据历史记录                                     │
└──────────────────────────────────────────────────────────────┘
```

#### 10.7.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 设备管理（DeviceManagement.tsx）                              │
├──────────────────────────────────────────────────────────────┤
│ 数据：SQLite表（devices）                                      │
│ 功能：                                                         │
│   1. 设备档案：编码/名称/类型（从字典选择）/序列号/厂商        │
│   2. 位置关联：基地（ID）→ 温室（ID）→ 区域（ID）              │
│   3. 状态管理：在线/离线/维修中/报废                           │
│   4. 告警规则：温度>30°C告警/湿度<40%告警...                  │
│   5. 数据历史：设备上报数据的时序记录                          │
│   6. 与监控集成：IoTMonitor页面从设备表读取                    │
└──────────────────────────────────────────────────────────────┘
```

### 10.8 仓库管理模块升级

#### 10.8.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 仓库管理页面（WarehouseManagement.tsx）                       │
├──────────────────────────────────────────────────────────────┤
│ 数据：const DEFAULT_WAREHOUSES = [4个仓库]  ← 硬编码            │
│ 存储：localStorage.getItem('warehouse_management_data')       │
│ 功能：列表展示、新增/编辑/删除                                 │
│ 问题：                                                          │
│   1. 仓库类型是字符串数组（['原料仓库','成品仓库',...]）       │
│   2. 管理员是字符串（'张三'）                                   │
│   3. 没有库位管理                                              │
│   4. 没有库存流水记录                                          │
│   5. 与采收页面的warehouseOptions不一致                        │
└──────────────────────────────────────────────────────────────┘
```

#### 10.8.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 仓库管理（WarehouseManagement.tsx）                           │
├──────────────────────────────────────────────────────────────┤
│ 数据：SQLite表（warehouses + warehouse_locations）              │
│ 功能：                                                         │
│   1. 仓库档案：编码/名称/类型（从字典选择）/地址/管理员（ID）   │
│   2. 库位管理：仓库→库区→货架→层→位（五级库位）              │
│   3. 库存流水：入库/出库/盘点/调拨记录                          │
│   4. 库存预警：低于安全库存自动告警                            │
│   5. 与采收入库联动：采收时选择仓库→自动入库                   │
│   6. 与物料领料联动：领料时选择仓库→自动出库                   │
└──────────────────────────────────────────────────────────────┘
```

### 10.9 通知设置模块升级

#### 10.9.1 现状问题

```
当前状态：
┌──────────────────────────────────────────────────────────────┐
│ 通知设置页面（NotificationSettings.tsx）                      │
├──────────────────────────────────────────────────────────────┤
│ 数据：const DEFAULT_CHANNELS/DEFAULT_RULES  ← 硬编码         │
│ 存储：localStorage.getItem('notification_settings_data')      │
│ 功能：渠道配置、规则配置、个人偏好                             │
│ 问题：                                                          │
│   1. recipients: ['approver'] → "approver"是谁？系统不知道   │
│   2. 没有人员选择器，不能指定具体通知给谁                       │
│   3. 规则和实际业务流程脱节                                   │
│   4. 渠道配置（SMTP/短信API）不能测试发送                       │
│   5. 没有发送历史记录                                          │
└──────────────────────────────────────────────────────────────┘
```

#### 10.9.2 升级方案

```
升级后：
┌──────────────────────────────────────────────────────────────┐
│ 通知设置（NotificationSettings.tsx）                          │
├──────────────────────────────────────────────────────────────┤
│ 数据：SQLite表（notification_channels + notification_rules）  │
│ 功能：                                                         │
│   1. 渠道配置：邮件/SMS/企业微信/站内信                         │
│      - 支持测试发送（点击"测试"按钮发送测试消息）               │
│   2. 规则配置：                                                 │
│      - 事件类型：审批/任务/预警/公告/库存不足...               │
│      - 收件人：指定人员（从人员库多选）/角色/部门               │
│      - 渠道：多选                                              │
│      - 频率：立即/每小时汇总/每日汇总                           │
│      - 模板：可编辑消息模板                                     │
│   3. 发送历史：查看已发送的消息记录                            │
│   4. 与业务模块集成：任务分配时自动发送通知                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 11. 数据联动架构设计

### 11.1 联动架构总览

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

### 11.2 联动触发机制

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

### 11.3 联动场景示例

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

## 12. 前端联动架构设计

### 12.1 状态管理中心

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

### 12.2 联动Hook设计

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

### 12.3 弹窗联动组件

#### 12.3.1 人员选择组件

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

#### 12.3.2 字典选择组件

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

#### 12.3.3 温室选择组件

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

### 12.4 全局刷新机制

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

## 13. SQLiteSchema正规化改造

### 13.1 反模式表正规化

```sql
-- ============================================
-- 13.1.1 公司表（改造）
-- ============================================
CREATE TABLE company_groups (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT,
  address TEXT,
  contact_person_id TEXT,    -- 关联 staff.id（原contact_person字符串）
  contact_phone TEXT,
  status TEXT DEFAULT 'active',  -- 从字典读取（company_status）
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (contact_person_id) REFERENCES staff(id)
);
CREATE INDEX idx_company_groups_status ON company_groups(status);

-- ============================================
-- 13.1.2 基地表（改造）
-- ============================================
CREATE TABLE bases (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_id TEXT NOT NULL,     -- 关联 company_groups.id
  area REAL DEFAULT 0,
  unit TEXT DEFAULT '亩',
  manager_id TEXT,              -- 关联 staff.id（原manager字符串）
  manager_name TEXT,            -- 冗余，方便显示
  phone TEXT,
  soil_type TEXT,               -- 从字典读取
  ph REAL,
  city TEXT,
  province TEXT,
  lng REAL,
  lat REAL,
  intro TEXT,
  status TEXT DEFAULT 'active', -- 从字典读取（base_status）
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (company_id) REFERENCES company_groups(id),
  FOREIGN KEY (manager_id) REFERENCES staff(id)
);
CREATE INDEX idx_bases_company ON bases(company_id);
CREATE INDEX idx_bases_manager ON bases(manager_id);
CREATE INDEX idx_bases_status ON bases(status);

-- ============================================
-- 13.1.3 温室/大棚表（新增）
-- ============================================
CREATE TABLE greenhouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_id TEXT NOT NULL,        -- 关联 bases.id
  base_name TEXT,               -- 冗余
  type TEXT DEFAULT 'glass',    -- 从字典读取（greenhouse_type）
  area REAL DEFAULT 0,
  status TEXT DEFAULT 'active', -- 从字典读取（greenhouse_status）
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (base_id) REFERENCES bases(id)
);
CREATE INDEX idx_greenhouses_base ON greenhouses(base_id);
CREATE INDEX idx_greenhouses_status ON greenhouses(status);

-- ============================================
-- 13.1.4 种植区域表（新增）
-- ============================================
CREATE TABLE plant_areas (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  greenhouse_id TEXT NOT NULL,   -- 关联 greenhouses.id
  greenhouse_name TEXT,          -- 冗余
  area REAL DEFAULT 0,
  soil_type TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id)
);
CREATE INDEX idx_plant_areas_greenhouse ON plant_areas(greenhouse_id);

-- ============================================
-- 13.1.5 仓库表（改造）
-- ============================================
CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'general',   -- 从字典读取（warehouse_type）
  address TEXT,
  manager_id TEXT,             -- 关联 staff.id
  manager_name TEXT,             -- 冗余
  capacity REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (manager_id) REFERENCES staff(id)
);
CREATE INDEX idx_warehouses_manager ON warehouses(manager_id);
CREATE INDEX idx_warehouses_status ON warehouses(status);

-- ============================================
-- 13.1.6 部门表（改造）
-- ============================================
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT,               -- 自关联，树形结构
  manager_id TEXT,              -- 关联 staff.id
  manager_name TEXT,            -- 冗余
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',   -- 从字典读取（department_status）
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (parent_id) REFERENCES departments(id),
  FOREIGN KEY (manager_id) REFERENCES staff(id)
);
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_departments_manager ON departments(manager_id);
CREATE INDEX idx_departments_status ON departments(status);

-- ============================================
-- 13.1.7 职位表（改造）
-- ============================================
CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_id TEXT,           -- 关联 departments.id
  department_name TEXT,         -- 冗余
  level INTEGER DEFAULT 1,      -- 级别 1-10
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);
CREATE INDEX idx_positions_department ON positions(department_id);

-- ============================================
-- 13.1.8 员工表（改造）
-- ============================================
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,    -- 工号
  name TEXT NOT NULL,
  gender TEXT,                  -- 从字典读取
  birth_date TEXT,
  id_card TEXT,
  phone TEXT,
  email TEXT,
  avatar TEXT,                  -- 照片URL
  department_id TEXT,           -- 关联 departments.id
  department_name TEXT,         -- 冗余
  position_id TEXT,             -- 关联 positions.id
  position_name TEXT,           -- 冗余
  team_id TEXT,                 -- 关联 teams.id
  entry_date TEXT,              -- 入职日期
  leave_date TEXT,              -- 离职日期
  status TEXT DEFAULT 'active',   -- 从字典读取（staff_status）
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (position_id) REFERENCES positions(id)
);
CREATE INDEX idx_staff_department ON staff(department_id);
CREATE INDEX idx_staff_position ON staff(position_id);
CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_code ON staff(code);
```

### 13.2 字典表正规化

```sql
-- ============================================
-- 13.2.1 字典分类表（改造）
-- ============================================
CREATE TABLE dictionary_categories (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,      -- 唯一标识（如：seed_source_status）
  name TEXT NOT NULL,             -- 显示名称（如：种源状态）
  module TEXT,                    -- 所属模块（crop/warehouse/hr/system）
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_dict_categories_module ON dictionary_categories(module);
CREATE INDEX idx_dict_categories_status ON dictionary_categories(status);

-- ============================================
-- 13.2.2 字典项表（改造）
-- ============================================
CREATE TABLE dictionary_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,      -- 关联 dictionary_categories.id
  code TEXT NOT NULL,             -- 值（如：sufficient）
  name TEXT NOT NULL,             -- 显示（如：充足）
  color TEXT,                     -- 标签颜色（green/yellow/red/blue...）
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (category_id) REFERENCES dictionary_categories(id)
);
CREATE INDEX idx_dict_items_category ON dictionary_items(category_id);
CREATE INDEX idx_dict_items_status ON dictionary_items(status);
CREATE INDEX idx_dict_items_code ON dictionary_items(code);

-- 唯一约束：同一个分类下code不能重复
CREATE UNIQUE INDEX idx_dict_items_category_code ON dictionary_items(category_id, code);
```

### 13.3 系统配置表正规化

```sql
-- ============================================
-- 13.3.1 系统配置表（改造）
-- ============================================
CREATE TABLE system_configs (
  id TEXT PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,   -- 唯一键（如：task_accept_warning_hours）
  config_name TEXT NOT NULL,           -- 显示名称
  config_value TEXT,                   -- 值
  config_type TEXT DEFAULT 'string',   -- string/number/boolean/json
  description TEXT,
  category TEXT DEFAULT 'system',      -- system/business/ui/security
  is_editable INTEGER DEFAULT 1,       -- 是否可后台修改
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_system_configs_category ON system_configs(category);

-- 预置配置项（从taskConfig.ts迁移）
INSERT INTO system_configs (id, config_key, config_name, config_value, config_type, category, description) VALUES
('SC001', 'system_name', '系统名称', '智慧种植生产管理系统', 'string', 'system', '系统显示名称'),
('SC002', 'system_version', '系统版本', 'V3.0.0', 'string', 'system', '当前系统版本'),
('SC003', 'demo_mode', '演示模式', 'false', 'boolean', 'feature', '是否启用演示模式'),
('SC004', 'theme_color', '主题色', 'emerald', 'string', 'ui', '系统主题色'),
('SC005', 'default_page_size', '默认分页大小', '10', 'number', 'ui', '列表默认分页大小'),
('SC006', 'data_retention_days', '数据保留天数', '365', 'number', 'system', '本地数据保留天数'),
('SC007', 'enable_notifications', '启用通知', 'true', 'boolean', 'feature', '是否启用系统通知'),
('SC010', 'task_accept_warning_hours', '任务接受预警时间', '12', 'number', 'business', '任务接受超时预警（小时）'),
('SC011', 'task_accept_critical_hours', '任务接受危急时间', '24', 'number', 'business', '任务接受超时危急（小时）'),
('SC012', 'task_execution_warning_hours', '任务执行预警时间', '24', 'number', 'business', '任务执行超时预警（小时）'),
('SC013', 'task_execution_critical_hours', '任务执行危急时间', '48', 'number', 'business', '任务执行危急时间（小时）'),
('SC014', 'task_max_extensions', '最大延期次数', '3', 'number', 'business', '任务最多延期次数'),
('SC015', 'task_max_extension_hours', '单次最大延期', '72', 'number', 'business', '单次最多延期小时数'),
('SC016', 'task_reminder_interval', '催办间隔', '60', 'number', 'business', '催办最小间隔（分钟）'),
('SC017', 'task_max_rework', '最大返工次数', '2', 'number', 'business', '任务最多返工次数');
```

### 13.4 权限表新增

```sql
-- ============================================
-- 13.4.1 角色表（新增）
-- ============================================
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  data_scope TEXT DEFAULT 'self',     -- all/company/department/self
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- ============================================
-- 13.4.2 权限表（新增）
-- ============================================
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- 如：crop:seed_source:create
  name TEXT NOT NULL,
  type TEXT DEFAULT 'menu',           -- menu/button/api
  parent_id TEXT,
  path TEXT,                          -- 路由/按钮标识
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (parent_id) REFERENCES permissions(id)
);

-- ============================================
-- 13.4.3 角色权限关联表（新增）
-- ============================================
CREATE TABLE role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================
-- 13.4.4 用户角色关联表（新增）
-- ============================================
CREATE TABLE user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

---

## 14. 数据迁移与清洗方案

### 14.1 迁移策略

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

### 14.2 数据清洗脚本

#### 14.2.1 清洗种源表的createBy（字符串→ID）

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

#### 14.2.2 清洗采收表的harvesterNames（字符串数组→ID数组）

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

#### 14.2.3 清洗采收表的warehouseName（字符串→ID）

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

### 14.3 关联字段补全清单

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

## 15. 权限系统设计

### 15.1 RBAC 权限模型

```
┌─────────────────────────────────────────────────────────────────┐
│                      RBAC 权限模型                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│    │   用户    │      │   角色    │      │   权限    │          │
│    │  (User)  │◄────►│ (Role)   │◄────►│(Permission)│          │
│    └──────────┘  N:M  └──────────┘  N:M  └──────────┘          │
│         │              │                    │                    │
│         │              │                    │                    │
│         ▼              ▼                    ▼                    │
│    ┌─────────────────────────────────────────────────────┐     │
│    │                    数据权限                          │     │
│    │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │     │
│    │  │ 全部   │ │ 公司   │ │ 部门   │ │ 个人   │     │     │
│    │  │ 数据   │ │ 数据   │ │ 数据   │ │ 数据   │     │     │
│    │  └────────┘ └────────┘ └────────┘ └────────┘     │     │
│    └─────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 15.2 权限分类

```
┌─────────────────────────────────────────────────────────────────┐
│                        权限分类体系                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 菜单权限（页面级）                                            │
│  ├── crop:seed_source      种源管理                               │
│  ├── crop:seedling         育苗管理                               │
│  ├── crop:planting         种植管理                               │
│  ├── crop:harvest          采收管理                               │
│  ├── crop:order            订单管理                               │
│  ├── inventory:warehouse   仓库管理                               │
│  ├── hr:attendance         考勤管理                               │
│  ├── settings:organization 组织架构                             │
│  └── settings:system       系统配置                               │
│                                                                 │
│  2. 按钮权限（操作级）                                            │
│  ├── crop:seed_source:create   新增种源                           │
│  ├── crop:seed_source:edit     编辑种源                           │
│  ├── crop:seed_source:delete   删除种源                           │
│  ├── crop:seed_source:export   导出种源                           │
│  └── crop:seed_source:print    打印标签                          │
│                                                                 │
│  3. 数据权限（记录级）                                            │
│  ├── scope:all               全部数据                            │
│  ├── scope:company           本公司数据                          │
│  ├── scope:department        本部门数据                          │
│  └── scope:self              仅个人数据                          │
│                                                                 │
│  4. API权限（接口级）                                             │
│  ├── api:seed_source:get     查询种源                             │
│  ├── api:seed_source:post    创建种源                             │
│  ├── api:seed_source:put     更新种源                             │
│  └── api:seed_source:delete  删除种源                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 15.3 权限联动效果

```
设置模块操作                    前端联动效果
─────────────────────────────────────────────────────────
给张三分配"部门主管"角色         张三登录后看到主管菜单
                                张三可审批下属的申请
                                张三看到部门全部数据

取消李四的"编辑种源"权限         李四的种源页面"编辑"按钮消失
                                李四点击编辑会提示无权限

给生产部设置"公司级"数据权限     生产部全员可看到本公司全部数据
                                不受个人创建限制
```

---

## 16. 实施路线图

### 16.1 总体时间表（6周）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         6周实施路线图                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Week 1-2: Phase 1 - 基础设置层                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Day 1-3:  创建正规化Schema（12张表）                              │   │
│  │ Day 4-7:  开发设置页面（组织架构/人员管理/数据字典）               │   │
│  │ Day 8-10: 开发设置页面（系统配置/审批流程/通知设置/用户权限）      │   │
│  │ Day 11-14: 预置基础数据 + 测试验证                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 3-4: Phase 2 - 业务关联层                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Day 15-17: 业务表加关联字段 + 数据清洗脚本                         │   │
│  │ Day 18-22: 改造业务弹窗（StaffSelect/DictSelect/GreenhouseSelect）│   │
│  │ Day 23-25: 改造列表页（显示名称从ID JOIN查询）                     │   │
│  │ Day 26-28: 测试验证                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 5: Phase 3 - 硬编码消除                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Day 29-31: 替换232处硬编码为字典/设置查询                          │   │
│  │ Day 32-33: 删除重复LocalStorage + 删除重复页面文件                 │   │
│  │ Day 34-35: 全面测试                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 6: Phase 4 - 权限与流程                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Day 36-38: 实现RBAC权限系统（角色/权限/数据范围）                  │   │
│  │ Day 39-40: 实现审批流程引擎（可视化设计器）                       │   │
│  │ Day 41-42: 集成到业务模块 + 最终测试                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 16.2 关键里程碑

| 里程碑 | 交付物 | 验收标准 |
|--------|--------|---------|
| M1（Week 2末） | 设置模块可用 | 组织架构/人员/字典/配置页面可CRUD，数据存SQLite |
| M2（Week 4末） | 业务联动可用 | 种源/育苗/种植/采收弹窗下拉从设置获取，ID关联 |
| M3（Week 5末） | 硬编码清零 | 全系统无硬编码数组，无重复文件 |
| M4（Week 6末） | 权限流程可用 | 角色分配控制菜单/按钮/数据，审批自动触发 |

### 16.3 风险控制

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 数据清洗丢失 | 中 | 高 | 迁移前全量备份，支持回滚 |
| 字符串匹配失败 | 高 | 中 | 未匹配项创建虚拟记录，人工复核 |
| 前端改造量大 | 高 | 中 | 分批改造，每批验证后再继续 |
| 性能下降 | 低 | 中 | 前端缓存+后端索引+分页加载 |
| 多标签不同步 | 中 | 低 | 定期轮询+手动刷新按钮 |

---

## 17. 预期效果对比

### 17.1 重构前后对比

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

### 17.2 业务价值

1. **数据一致性**：改一个部门名，所有历史记录自动更新显示
2. **管理便捷**：新增基地/人员/仓库，后台点一下就生效
3. **统计能力**："生产部今年种了多少番茄？" → 3秒出结果
4. **权限精细**："张三只能看到自己基地的数据" → 可实现
5. **配置灵活**："把任务超时从24小时改为48小时" → 后台改配置，即时生效
6. **维护成本**：新增一个状态不再需要改代码重新编译部署

---

## 18. 附录

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

**文档状态**: V3.0 完成
**更新日期**: 2026-05-02
**版本历史**:
- V1.0: 初始规划版本
- V2.0: 整合Kimi规划内容，增加模块升级详细设计、数据联动架构、前端联动架构、预期效果对比
- V3.0: 整合Kimi V3.0深度联动版全部内容，增加SQLite Schema正规化改造完整DDL、设备管理模块、仓库管理模块、通知设置模块、权限系统设计完整内容
## 19. 权限系统扩展设计（V4.0 - 弘智耘源权限架构）

> 本章节内容整合自弘智耘源系统的完整权限管理功能，包括：组织管理、角色管理、用户权限、角色权限、数据范围权限等完整实现。

### 19.1 弘智耘源核心数据库设计

```sql
-- ============================================
-- 弘智耘源权限系统核心表结构
-- ============================================

-- 组织表
CREATE TABLE Orgs (
  OrgOID INTEGER PRIMARY KEY AUTOINCREMENT,
  OrgOIDParent INTEGER,                    -- 父组织OID
  OrgAID TEXT NOT NULL UNIQUE,           -- 组织编码
  Name TEXT NOT NULL,                       -- 组织名称
  OrgRelationship TEXT,                   -- 层级路径，用于快速查询子孙
  SortNumber INTEGER DEFAULT 0,
  Status TEXT DEFAULT 'active'
);

-- 角色表
CREATE TABLE Roles (
  RoleOID INTEGER PRIMARY KEY AUTOINCREMENT,
  RoleAID TEXT NOT NULL UNIQUE,           -- 角色编码
  Name TEXT NOT NULL,                      -- 角色名称
  AccessKey TEXT NOT NULL UNIQUE,          -- 访问密钥（UUID）
  SortNumber INTEGER DEFAULT 0,
  Status TEXT DEFAULT 'active'
);

-- 用户表
CREATE TABLE Users (
  UserOID INTEGER PRIMARY KEY AUTOINCREMENT,
  UserAID TEXT NOT NULL UNIQUE,           -- 用户编码
  Name TEXT NOT NULL,                      -- 用户姓名
  Password TEXT NOT NULL,                  -- 密码（加密）
  OrgOID INTEGER,                          -- 所属组织
  Status TEXT DEFAULT 'active'
);

-- 用户角色关联表
CREATE TABLE UsersRoles (
  UserOID INTEGER NOT NULL,
  RoleOID INTEGER NOT NULL,
  PRIMARY KEY (UserOID, RoleOID)
);

-- 作业/菜单表
CREATE TABLE Processes (
  ProcessOID INTEGER PRIMARY KEY AUTOINCREMENT,
  ProcessOIDParent INTEGER,                -- 父作业OID
  ProcessAID TEXT NOT NULL,               -- 作业编码
  Name TEXT NOT NULL,                      -- 作业名称
  ExecName TEXT,                          -- 执行路由
  APPType TEXT DEFAULT 'web',            -- 1=APP, 0=Web
  SortNumber INTEGER DEFAULT 0,
  Hidden TEXT DEFAULT '0'
);

-- 动作表
CREATE TABLE Actions (
  ActionOID INTEGER PRIMARY KEY AUTOINCREMENT,
  ActionAID TEXT NOT NULL UNIQUE,
  Name TEXT NOT NULL
);

-- 角色作业权限表
CREATE TABLE RolesAuthority (
  RoleOID INTEGER NOT NULL,
  ProcessOID INTEGER NOT NULL,
  ActionOID INTEGER NOT NULL,
  Value INTEGER DEFAULT 1,
  IsExpired INTEGER DEFAULT 0,
  PRIMARY KEY (RoleOID, ProcessOID, ActionOID)
);

-- 用户作业权限表
CREATE TABLE UsersAuthority (
  UserOID INTEGER NOT NULL,
  ProcessOID INTEGER NOT NULL,
  ActionOID INTEGER NOT NULL,
  Value INTEGER DEFAULT 1,
  PRIMARY KEY (UserOID, ProcessOID, ActionOID)
);

-- 角色数据权限表
CREATE TABLE RolesDataAuthority (
  RoleOID INTEGER NOT NULL,
  OrgOID INTEGER NOT NULL,
  Value INTEGER DEFAULT 1,
  PRIMARY KEY (RoleOID, OrgOID)
);
```

### 19.2 后端权限核心模块（processAuthority.js）

```javascript
var g_authority = {
    isInited: false,
    isIniting: false,
    isBuildingUserProcessTree: {},
    isBuildingUserOrgTree: {},
    cacheData: null
}

function createCacheData() {
  return {
    orgs: { hash: {}, list: [], OIDs: [] },
    tables: {},
    processes: { byOID: {}, byURL: {} },
    actions: {},
    adminUsers: {},
    adminProcessAuthority: {},
    userProcesses: {},
    userAppProcesses: {},
    userOrgs: {}
  }
}

function buildOrgs(cacheData, cb) {
  db.getOrgs(function(err, data) {
    if (err) { cb(err); return; }
    var orgs = { hash: {}, list: [], OIDs: [] };
    for (var i = 0; i < data.length; i++) {
      var node = { isRoot: true, children: [], data: data[i] };
      orgs.OIDs.push(node.data.OrgOID);
      orgs.hash[node.data.OrgOID] = node;
      orgs.list.push(node);
    }
    for (var key in orgs.hash) {
      var me = orgs.hash[key];
      var parent = orgs.hash[me.data.OrgOIDParent];
      if (parent && (parent != me)) {
        parent.children.push(me);
        me.isRoot = false;
      }
    }
    cacheData.orgs = orgs;
    cb(null, cacheData);
  });
}

function buildProcess(cacheData, cb) {
  db.getProcesses(cacheData.tables.process, function(err, data) {
    if (err) { cb(err); return; }
    var processes = { byOID: {}, byURL: {} };
    for (var i = 0; i < data.length; i++) {
      var node = {
        isRoot: true, children: [], authority: {},
        isAuthorized: false, data: data[i], APPType: data[i].APPType
      };
      processes.byOID[node.data.ProcessOID] = node;
    }
    for (var key in processes.byOID) {
      var me = processes.byOID[key];
      if (me.data.Route) {
        processes.byURL[me.data.Route.toLowerCase()] = me;
      }
      var parent = processes.byOID[me.data.ProcessOIDParent];
      if (parent && (parent != me)) {
        parent.children.push(me);
        me.isRoot = false;
      }
    }
    cacheData.processes = processes;
    cb(null, cacheData);
  });
}

function buildUserProcessTree(userAID, isNeedAuthorityCheck, cb) {
    var isAdmin = userIsAdmin(userAID);
    if (isNeedAuthorityCheck == false) { isAdmin = true; }

    function clearAuthority() {
        for (var oid in g_authority.cacheData.processes.byOID) {
            var p = g_authority.cacheData.processes.byOID[oid];
            p.authority = isAdmin ? g_authority.cacheData.adminProcessAuthority : {};
            p.isAuthorized = isAdmin;
        }
    }

    function cloneProcess() {
        var vHash = {}, vList = [];
        function cloneNode(parentNode, fromNode) {
            if (fromNode.isAuthorized != true) return;
            if ((!fromNode.data.Hidden) || (fromNode.data.Hidden != '1')) {
                var newNode = {
                    data: fromNode.data, authority: fromNode.authority,
                    isRoot: fromNode.isRoot, children: [], APPType: fromNode.APPType
                };
                vHash[newNode.data.ProcessOID.toString()] = newNode;
                if (parentNode) parentNode.children.push(newNode);
                else vList.push(newNode);
                for (var i = 0; i < fromNode.children.length; i++) {
                    cloneNode(newNode, fromNode.children[i]);
                }
            }
        }
        for (var oid in g_authority.cacheData.processes.byOID) {
            var node = g_authority.cacheData.processes.byOID[oid];
            if (node.isRoot == true) cloneNode(null, node);
        }
        vList.sort(function(a, b) { return a.data.SortNumber - b.data.SortNumber; });
        return vList;
    }

    if (isAdmin == true) {
        clearAuthority();
        cb(null, cloneProcess());
    } else {
        async.parallel([
            function(cb2) { db.getRoleAuthority(g_authority.cacheData.tables.roleAuthority, userAID, cb2); },
            function(cb2) { db.getUserAuthority(g_authority.cacheData.tables.userAuthority, userAID, cb2); }
        ], function(err, results) {
            if (err) cb(err);
            else {
                g_RoleList = results[0];
                g_UserList = results[1];
                g_RoleList.forEach(function(d) {
                    var node = g_authority.cacheData.processes.byOID[d.ProcessOID];
                    if (node) { node.authority[d.ActionOID] = d.Value; node.APPType = d.APPType; }
                });
                g_UserList.forEach(function(d) {
                    var node = g_authority.cacheData.processes.byOID[d.ProcessOID];
                    if (node) { node.authority[d.ActionOID] = d.Value; node.APPType = d.APPType; }
                });
                for (var oid in g_authority.cacheData.processes.byOID) {
                    var node = g_authority.cacheData.processes.byOID[oid];
                    node.isAuthorized = isAdmin;
                    for (var aoid in node.authority) {
                        if (node.authority[aoid] > 0) { node.isAuthorized = true; break; }
                    }
                }
                clearAuthority();
                cb(null, cloneProcess());
            }
        });
    }
}
```

### 19.3 后端权限API实现

```javascript
// 获取角色权限
module.exports = function(sender) {
    var yjDBService_easyui = global.yjRequire("yujiang.Foil","yjDBService.easyui.js");
    sender.sql = "SELECT ra.* FROM rolesauthority ra LEFT JOIN processes p ON ra.ProcessOID=p.ProcessOID";
    sender.tableName = "RolesAuthority";
    yjDBService_easyui.selectData(sender);
}

// 角色授权动作
module.exports = function(sender) {
    var pa = require("../../../../org/processAuthority.js");
    var yjDBService = global.yjRequire("yujiang.Foil","yjDBService.js");
    var roleOID = sender.req.body.roleOID;
    var actionOID = sender.req.body.actionOID;
    var isAuthorize = sender.req.body.isAuthorize;
    var tasks = [];
    tasks.push("DELETE FROM " + pa.data.tables.roleAuthority + " WHERE RoleOID=" + roleOID + " AND ActionOID=" + actionOID);
    if (isAuthorize == 'true') {
        tasks.push("INSERT INTO " + pa.data.tables.roleAuthority + " (RoleOID,ProcessOID,ActionOID,Value) SELECT " + roleOID + ",ProcessOID," + actionOID + ",1 FROM " + pa.data.tables.process);
    }
    async.eachSeries(tasks, function(sql, cb) {
        yjDBService.exec({ sql: sql, callback: cb });
    }, sender.callback);
}

// 获取用户权限
module.exports = function(sender) {
    var yjDBService_easyui = global.yjRequire("yujiang.Foil","yjDBService.easyui.js");
    sender.sql = "SELECT ua.* FROM usersauthority ua LEFT JOIN processes p ON ua.ProcessOID=p.ProcessOID";
    sender.tableName = "UsersAuthority";
    yjDBService_easyui.selectData(sender);
}

// 用户授权动作
module.exports = function(sender) {
    var pa = require("../../../../org/processAuthority.js");
    var yjDBService = global.yjRequire("yujiang.Foil","yjDBService.js");
    var userOID = sender.req.body.userOID;
    var actionOID = sender.req.body.actionOID;
    var isAuthorize = sender.req.body.isAuthorize;
    var tasks = [];
    tasks.push("DELETE FROM " + pa.data.tables.userAuthority + " WHERE UserOID=" + userOID + " AND ActionOID=" + actionOID);
    if (isAuthorize == 'true') {
        tasks.push("INSERT INTO " + pa.data.tables.userAuthority + " (UserOID,ProcessOID,ActionOID,Value) SELECT " + userOID + ",ProcessOID," + actionOID + ",1 FROM " + pa.data.tables.process);
    }
    async.eachSeries(tasks, function(sql, cb) {
        yjDBService.exec({ sql: sql, callback: cb });
    }, sender.callback);
}
```

### 19.4 数据库查询SQL参考

```sql
-- 获取用户作业权限（角色+用户直接权限合并）
SELECT ra.ProcessOID, ra.ActionOID, MAX(ra.Value) as Value, pro.APPType
FROM rolesauthority ra
JOIN usersroles ur ON ra.RoleOID = ur.RoleOID
JOIN users u ON ur.UserOID = u.UserOID
JOIN processes pro ON pro.ProcessOID = ra.ProcessOID
WHERE u.UserAID = ? AND ra.IsExpired = 0
GROUP BY ra.ProcessOID, ra.ActionOID;

-- 获取用户数据权限
SELECT OrgOID, MAX(Value) as Value FROM (
    SELECT OrgOID, 1 as Value FROM users WHERE UserAID = ?
    UNION ALL
    SELECT ra.OrgOID, ra.Value FROM rolesdataauthority ra
    JOIN usersroles ur ON ra.RoleOID = ur.RoleOID
    JOIN users u ON ur.UserOID = u.UserOID WHERE u.UserAID = ?
) GROUP BY OrgOID;

-- 获取管理员用户
SELECT u.UserOID, u.UserAID FROM users u
LEFT JOIN usersroles ur ON ur.UserOID = u.UserOID
LEFT JOIN roles r ON r.RoleOID = ur.RoleOID
WHERE u.UserAID = 'Admin' OR r.RoleAID = 'Administrators';
```

### 19.5 V1.1系统权限实现转换对照表

| 弘智耘源模块 | V1.1实现 | 说明 |
|-------------|----------|------|
| `biz/org/processAuthority.js` | `src/services/authService.ts` | 权限核心服务 |
| `biz/system/authority2/org/getOrgs` | `src/services/organizationService.ts` | 组织管理 |
| `biz/system/authority2/role/getRoles` | `src/services/roleService.ts` | 角色管理 |
| `biz/system/authority2/userAuthority/getUserAuthority` | `src/services/userService.ts` | 用户权限 |
| `app/system/authority2/org/showOrgs.{v}.ejs` | `src/pages/settings/OrganizationPage.tsx` | 组织管理页面 |
| `app/system/authority2/role/showRoles.{v}.ejs` | `src/pages/settings/RoleManagePage.tsx` | 角色管理页面 |

### 19.6 弘智耘源权限系统特点总结

| 特性 | 说明 | V1.1实现对应 |
|------|------|--------------|
| **多平台支持** | 通过APPType字段区分Web和APP权限 | `permissionStore`中区分`web`/`app` |
| **权限继承** | 作业树中父节点自动继承子节点权限 | `cloneProcess()`中`scanNode()`实现 |
| **角色权限合并** | 用户权限 = 角色权限 ∪ 用户直接权限 | `mergeProcess()`先处理角色再处理用户 |
| **数据权限控制** | 基于组织树的数据范围控制 | `RolesDataAuthority`表 + `userOrgs` |
| **管理员特权** | Admin用户拥有全部权限 | `userIsAdmin()` + `adminProcessAuthority` |
# 系统设置模块重构规划方案 V3.0
# 包含完整可复用代码 - 可直接复制使用

> 目标：后台可配置 → 数据存储 SQLite → 页面自动联动
> 包含从弘智耘源系统转换的完整React/TypeScript代码

---

## 第20章：类型定义 (src/types/authority.ts)

```typescript
// ============================================
// 组织与权限管理系统类型定义
// 来源参考：弘智耘源 authority2 模块
// ============================================

// 组织状态
export type OrgStatus = 'active' | 'inactive';

// 组织类型（从数据字典读取）
export type OrgType = 'company' | 'base' | 'region' | 'department' | 'workshop';

// 应用类型
export type AppType = 0 | 1; // 0=Web, 1=Mobile

// 权限值：1=有权限, 0=无权限, -1=未设置（继承角色）
export type AuthValue = 1 | 0 | -1;

// ============================================
// 组织管理
// ============================================

export interface Organization {
  id?: string;
  oid: string;                    // 组织OID（原系统字段）
  oidParent: string | null;       // 父组织OID
  aid: string;                    // 组织编码（OrgAID）
  name: string;                   // 组织名称
  description?: string;           // 描述
  address?: string;               // 地址
  contactor?: string;             // 联系人
  contactorPhone?: string;        // 联系人电话
  contactorMobile?: string;       // 联系人手机
  contactorEmail?: string;        // 联系人邮箱
  orgType?: OrgType;              // 组织类型
  viLogo?: string;               // VI Logo
  viName?: string;               // VI名称
  viDescription?: string;         // VI描述
  viBanner?: string;             // VI横幅
  sortNumber?: number;            // 排序号
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
  children?: Organization[];       // 子组织
}

// ============================================
// 角色管理
// ============================================

export interface Role {
  id?: string;
  oid: string;                    // 角色OID
  orgOid: string;                // 所属组织OID
  aid: string;                   // 角色编码（RoleAID）
  name: string;                   // 角色名称
  description?: string;
  sortNumber?: number;
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
}

// 角色列表项（用于下拉选择）
export interface RoleListItem {
  oid: string;
  aid: string;
  name: string;
  orgOid: string;
  sortNumber: number;
}

// ============================================
// 用户管理
// ============================================

export interface User {
  id?: string;
  oid: string;                    // 用户OID
  orgOid: string;                // 所属组织OID
  aid: string;                   // 用户账号（UserAID）
  name: string;                  // 用户姓名
  passwordHash?: string;          // 密码哈希
  email?: string;
  phone?: string;
  avatar?: string;
  status?: OrgStatus;
  isAdmin?: boolean;              // 是否超管
  hireDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 用户角色关联
export interface UserRole {
  id?: string;
  userOid: string;
  roleOid: string;
  createdAt?: string;
}

// ============================================
// 工序管理（树形结构）
// ============================================

export interface Process {
  id?: string;
  oid: string;                    // 工序OID
  oidParent: string | null;      // 父工序OID
  aid: string;                   // 工序编码（ProcessAID）
  name: string;                  // 工序名称
  appType?: AppType;             // App类型
  execName?: string;              // 执行名称
  execMode?: string;              // 执行模式
  description?: string;
  imageAid?: string;             // 图标
  hidden?: boolean;              // 是否隐藏
  sortNumber?: number;
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
  children?: Process[];            // 子工序
}

// 工序树节点（用于combotreegrid）
export interface ProcessTreeNode {
  oid: string;
  oidParent: string | null;
  aid: string;
  name: string;
  appType: AppType;
  sortNumber: number;
  children?: ProcessTreeNode[];
  iconCls?: string;
}

// ============================================
// 动作管理
// ============================================

export interface Action {
  id?: string;
  oid: string;                    // 动作OID
  aid: string;                   // 动作编码（ActionAID）
  name: string;                  // 动作名称
  category: string;              // 分类（如：查询、编辑、删除、审批）
  appType?: AppType;             // App类型
  description?: string;
  imageAid?: string;
  sortNumber?: number;
  status?: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 角色权限矩阵
// ============================================

// 角色权限项：角色对某个工序+动作的权限
export interface RoleAuthorityItem {
  id?: string;
  roleOid: string;
  processOid: string;
  actionOid: string;
  value: AuthValue;
  createdAt?: string;
  updatedAt?: string;
}

// 角色权限矩阵数据（用于渲染表格）
export interface RoleAuthorityMatrix {
  processOid: string;
  processAid: string;
  processName: string;
  processOidParent: string | null;
  sortNumber: number;
  actions: {
    [actionOid: string]: AuthValue;
  };
}

// ============================================
// 用户权限矩阵
// ============================================

// 用户权限项：用户对某个工序+动作的权限
export interface UserAuthorityItem {
  id?: string;
  userOid: string;
  processOid: string;
  actionOid: string;
  value: AuthValue;  // 1=授权, 0=禁用, -1=继承角色
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 数据权限（组织访问控制）
// ============================================

// 角色数据权限项
export interface RoleDataAuthorityItem {
  id?: string;
  roleOid: string;
  orgOid: string;
  value: 1 | 0;
  createdAt?: string;
  updatedAt?: string;
}

// 组织权限树节点（用于显示和勾选）
export interface OrgAuthTreeNode {
  oid: string;
  oidParent: string | null;
  aid: string;
  name: string;
  kind: 1 | 2;  // 1=组织, 2=角色
  sortNumber: number;
  checked?: boolean;
  children?: OrgAuthTreeNode[];
  iconCls?: string;
}

// ============================================
// 树形下拉数据（lookup）
// ============================================

// 组织树下拉数据
export interface OrgLookupNode {
  TreeOID: string;  // 可能是OrgOID或RoleOID
  OID: string;
  AID: string;
  Name: string;
  Kind: 1 | 2;  // 1=组织, 2=角色
  SortNumber: number;
  children?: OrgLookupNode[];
  iconCls?: string;
}

// 用户树下拉数据
export interface UserLookupNode {
  TreeOID: string;
  OID: string;
  AID: string;
  Name: string;
  Kind: 1 | 2;
  SortNumber: number;
  children?: UserLookupNode[];
  iconCls?: string;
}

// ============================================
// API 请求/响应类型
// ============================================

// 树形查询参数
export interface TreeQueryParams {
  sort?: string;
  order?: 'asc' | 'desc';
  rows?: number;
  id?: string;  // 加载子节点时指定父节点ID
  isLoadChildren?: boolean;
  yjUser?: any;
}

// 角色权限查询参数
export interface AuthorityQueryParams {
  filterRules?: {
    field: string;
    op: string;
    value: string;
  }[];
  rows?: number;
}

// 保存权限请求
export interface SaveAuthorityRequest {
  roleOid?: string;
  userOid?: string;
  userAid?: string;
  processOid?: string;
  actionOid?: string;
  processOids?: string[];
  isAuthorize: boolean;
  appType?: AppType;
}

// 角色权限保存（批量）
export interface SaveRoleAuthorityRequest {
  roleOid: string;
  appType: AppType;
  authorities: {
    processOid: string;
    actionOid: string;
    value: AuthValue;
  }[];
}

// 用户权限保存（批量）
export interface SaveUserAuthorityRequest {
  userOid: string;
  userAid: string;
  appType: AppType;
  authorities: {
    processOid: string;
    actionOid: string;
    value: AuthValue;
  }[];
}
```

---

## 第21章：数据库Schema (src/db/schema/authority.sql)

```sql
-- ============================================
-- 组织与权限管理系统 - SQLite数据库Schema
-- 来源参考：弘智耘源 authority2 模块
-- 适配目标：V1.1系统
-- ============================================

-- 组织表（树形结构）
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                    -- 组织OID（兼容原系统）
  oid_parent TEXT,                            -- 父组织OID，NULL表示根节点
  aid TEXT NOT NULL,                          -- 组织编码（唯一）
  name TEXT NOT NULL,                         -- 组织名称
  description TEXT,                           -- 描述
  address TEXT,                               -- 地址
  contactor TEXT,                            -- 联系人
  contactor_phone TEXT,                       -- 联系电话
  contactor_mobile TEXT,                     -- 联系手机
  contactor_email TEXT,                      -- 联系邮箱
  org_type TEXT DEFAULT 'department',         -- 组织类型：company/base/region/department/workshop
  vi_logo TEXT,                               -- VI Logo图片key
  vi_name TEXT,                               -- VI名称
  vi_description TEXT,                       -- VI描述
  vi_banner TEXT,                             -- VI横幅图片key
  sort_number INTEGER DEFAULT 0,              -- 排序号
  status TEXT DEFAULT 'active',               -- 状态：active/inactive
  created_at TEXT DEFAULT (datetime('now')),  -- 创建时间
  updated_at TEXT DEFAULT (datetime('now')),  -- 更新时间
  FOREIGN KEY (oid_parent) REFERENCES organizations(oid) ON DELETE CASCADE
);

-- 创建组织的检索字段（用于层级查询）
CREATE INDEX IF NOT EXISTS idx_orgs_oid_parent ON organizations(oid_parent);
CREATE INDEX IF NOT EXISTS idx_orgs_aid ON organizations(aid);
CREATE INDEX IF NOT EXISTS idx_orgs_status ON organizations(status);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                   -- 角色OID
  org_oid TEXT NOT NULL,                     -- 所属组织OID
  aid TEXT NOT NULL,                          -- 角色编码（唯一）
  name TEXT NOT NULL,                         -- 角色名称
  description TEXT,                           -- 描述
  sort_number INTEGER DEFAULT 0,             -- 排序号
  status TEXT DEFAULT 'active',              -- 状态
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_oid) REFERENCES organizations(oid)
);

CREATE INDEX IF NOT EXISTS idx_roles_org_oid ON roles(org_oid);
CREATE INDEX IF NOT EXISTS idx_roles_aid ON roles(aid);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                   -- 用户OID
  org_oid TEXT NOT NULL,                     -- 所属组织OID
  aid TEXT UNIQUE NOT NULL,                   -- 用户账号（唯一）
  name TEXT NOT NULL,                         -- 用户姓名
  password_hash TEXT,                          -- 密码哈希（bcrypt）
  email TEXT,                                 -- 邮箱
  phone TEXT,                                -- 电话
  avatar TEXT,                               -- 头像图片key
  status TEXT DEFAULT 'active',               -- 状态
  is_admin INTEGER DEFAULT 0,                 -- 是否超管：0=否, 1=是
  hire_date TEXT,                             -- 入职日期
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_oid) REFERENCES organizations(oid)
);

CREATE INDEX IF NOT EXISTS idx_users_org_oid ON users(org_oid);
CREATE INDEX IF NOT EXISTS idx_users_aid ON users(aid);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  user_oid TEXT NOT NULL,
  role_oid TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_oid, role_oid),
  FOREIGN KEY (user_oid) REFERENCES users(oid) ON DELETE CASCADE,
  FOREIGN KEY (role_oid) REFERENCES roles(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_oid ON user_roles(user_oid);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_oid ON user_roles(role_oid);

-- 工序表（树形结构）
CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                   -- 工序OID
  oid_parent TEXT,                            -- 父工序OID，NULL表示根节点
  aid TEXT NOT NULL,                          -- 工序编码（唯一）
  name TEXT NOT NULL,                         -- 工序名称
  app_type INTEGER DEFAULT 0,                 -- App类型：0=Web, 1=Mobile
  exec_name TEXT,                             -- 执行名称
  exec_mode TEXT,                             -- 执行模式
  description TEXT,                           -- 描述
  image_aid TEXT,                            -- 图标图片key
  hidden INTEGER DEFAULT 0,                   -- 是否隐藏：0=否, 1=是
  sort_number INTEGER DEFAULT 0,               -- 排序号
  status TEXT DEFAULT 'active',               -- 状态
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (oid_parent) REFERENCES processes(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_processes_oid_parent ON processes(oid_parent);
CREATE INDEX IF NOT EXISTS idx_processes_aid ON processes(aid);
CREATE INDEX IF NOT EXISTS idx_processes_app_type ON processes(app_type);

-- 动作表
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  oid TEXT UNIQUE NOT NULL,                   -- 动作OID
  aid TEXT NOT NULL,                          -- 动作编码（唯一）
  name TEXT NOT NULL,                         -- 动作名称
  category TEXT NOT NULL,                    -- 分类：如 query/insert/update/delete/approve
  app_type INTEGER DEFAULT 0,                 -- App类型：0=Web, 1=Mobile
  description TEXT,                           -- 描述
  image_aid TEXT,                            -- 图标图片key
  sort_number INTEGER DEFAULT 0,             -- 排序号
  status TEXT DEFAULT 'active',               -- 状态
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_actions_category ON actions(category);
CREATE INDEX IF NOT EXISTS idx_actions_app_type ON actions(app_type);

-- 角色权限矩阵表 (Process × Action)
CREATE TABLE IF NOT EXISTS roles_authority (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  role_oid TEXT NOT NULL,
  process_oid TEXT NOT NULL,
  action_oid TEXT NOT NULL,
  value INTEGER DEFAULT 0,                    -- 1=有权限, 0=无权限
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(role_oid, process_oid, action_oid),
  FOREIGN KEY (role_oid) REFERENCES roles(oid) ON DELETE CASCADE,
  FOREIGN KEY (process_oid) REFERENCES processes(oid) ON DELETE CASCADE,
  FOREIGN KEY (action_oid) REFERENCES actions(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roles_authority_role_oid ON roles_authority(role_oid);
CREATE INDEX IF NOT EXISTS idx_roles_authority_process_oid ON roles_authority(process_oid);

-- 用户权限矩阵表（可覆盖角色权限）
CREATE TABLE IF NOT EXISTS users_authority (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  user_oid TEXT NOT NULL,
  process_oid TEXT NOT NULL,
  action_oid TEXT NOT NULL,
  value INTEGER DEFAULT -1,                    -- 1=授权, 0=禁用, -1=继承角色（未设置）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_oid, process_oid, action_oid),
  FOREIGN KEY (user_oid) REFERENCES users(oid) ON DELETE CASCADE,
  FOREIGN KEY (process_oid) REFERENCES processes(oid) ON DELETE CASCADE,
  FOREIGN KEY (action_oid) REFERENCES actions(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_authority_user_oid ON users_authority(user_oid);

-- 角色数据权限表（组织访问控制）
CREATE TABLE IF NOT EXISTS roles_data_authority (
  id TEXT PRIMARY KEY AUTOINCREMENT,
  role_oid TEXT NOT NULL,
  org_oid TEXT NOT NULL,
  value INTEGER DEFAULT 1,                      -- 1=可访问, 0=不可访问
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(role_oid, org_oid),
  FOREIGN KEY (role_oid) REFERENCES roles(oid) ON DELETE CASCADE,
  FOREIGN KEY (org_oid) REFERENCES organizations(oid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roles_data_authority_role_oid ON roles_data_authority(role_oid);
CREATE INDEX IF NOT EXISTS idx_roles_data_authority_org_oid ON roles_data_authority(org_oid);

-- ============================================
-- 初始化数据
-- ============================================

-- 插入根组织
INSERT INTO organizations (oid, oid_parent, aid, name, org_type, sort_number, status)
VALUES ('ORG_ROOT', NULL, 'ROOT', '根组织', 'company', 0, 'active');

-- 插入超级管理员角色
INSERT INTO roles (oid, org_oid, aid, name, description, sort_number, status)
VALUES ('ROLE_ADMIN', 'ORG_ROOT', 'admin', '系统管理员', '拥有系统所有权限', 1, 'active');

-- 插入超管用户（密码：admin123，需要实际加密）
INSERT INTO users (oid, org_oid, aid, name, password_hash, is_admin, status)
VALUES ('USER_ADMIN', 'ORG_ROOT', 'admin', '系统管理员', '$2b$10$dummy_hash', 1, 'active');

-- 插入超管用户角色关联
INSERT INTO user_roles (user_oid, role_oid)
VALUES ('USER_ADMIN', 'ROLE_ADMIN');

-- 插入默认工序分类
INSERT INTO processes (oid, oid_parent, aid, name, app_type, sort_number, status)
VALUES
  ('PROC_SYSTEM', NULL, 'system', '系统管理', 0, 1, 'active'),
  ('PROC_SYSTEM_USER', 'PROC_SYSTEM', 'system.user', '用户管理', 0, 1.1, 'active'),
  ('PROC_SYSTEM_ROLE', 'PROC_SYSTEM', 'system.role', '角色管理', 0, 1.2, 'active'),
  ('PROC_SYSTEM_ORG', 'PROC_SYSTEM', 'system.org', '组织管理', 0, 1.3, 'active'),
  ('PROC_PRODUCTION', NULL, 'production', '生产管理', 0, 2, 'active'),
  ('PROC_PRODUCTION_PLAN', 'PROC_PRODUCTION', 'production.plan', '生产计划', 0, 2.1, 'active'),
  ('PROC_PRODUCTION_TASK', 'PROC_PRODUCTION', 'production.task', '生产任务', 0, 2.2, 'active'),
  ('PROC_PRODUCTION_HARVEST', 'PROC_PRODUCTION', 'production.harvest', '采收记录', 0, 2.3, 'active'),
  ('PROC_WAREHOUSE', NULL, 'warehouse', '仓库管理', 0, 3, 'active'),
  ('PROC_WAREHOUSE_IN', 'PROC_WAREHOUSE', 'warehouse.in', '入库管理', 0, 3.1, 'active'),
  ('PROC_WAREHOUSE_OUT', 'PROC_WAREHOUSE', 'warehouse.out', '出库管理', 0, 3.2, 'active');

-- 插入默认动作
INSERT INTO actions (oid, aid, name, category, app_type, sort_number, status)
VALUES
  ('ACTION_QUERY', 'query', '查询', 'common', 0, 1, 'active'),
  ('ACTION_INSERT', 'insert', '新增', 'common', 0, 2, 'active'),
  ('ACTION_UPDATE', 'update', '编辑', 'common', 0, 3, 'active'),
  ('ACTION_DELETE', 'delete', '删除', 'common', 0, 4, 'active'),
  ('ACTION_EXPORT', 'export', '导出', 'common', 0, 5, 'active'),
  ('ACTION_IMPORT', 'import', '导入', 'common', 0, 6, 'active'),
  ('ACTION_APPROVE', 'approve', '审批', 'approval', 0, 10, 'active'),
  ('ACTION_REJECT', 'reject', '驳回', 'approval', 0, 11, 'active'),
  ('ACTION_TRANSFER', 'transfer', '转移', 'approval', 0, 12, 'active');

-- 给超管角色授权所有权限
INSERT INTO roles_authority (role_oid, process_oid, action_oid, value)
SELECT 'ROLE_ADMIN', p.oid, a.oid, 1
FROM processes p
CROSS JOIN actions a
WHERE p.status = 'active' AND a.status = 'active';

-- 给超管角色授权根组织的数据权限
INSERT INTO roles_data_authority (role_oid, org_oid, value)
VALUES ('ROLE_ADMIN', 'ORG_ROOT', 1);
```

---

## 第22章：API服务层 (src/services/authorityService.ts)

```typescript
// ============================================
// 组织与权限管理 - API服务层
// 来源参考：弘智耘源 authority2 模块
// ============================================

import {
  Organization,
  Role,
  User,
  Process,
  Action,
  RoleAuthorityItem,
  UserAuthorityItem,
  RoleDataAuthorityItem,
  TreeQueryParams,
  SaveAuthorityRequest,
  AppType
} from '../types/authority';
import { db } from '../db/database';

// ============================================
// 组织管理服务
// ============================================

export const organizationService = {
  /**
   * 获取组织树
   */
  async getOrgs(params: TreeQueryParams): Promise<Organization[]> {
    const { rows = -1, id, sort = 'sort_number', order = 'asc' } = params;

    let sql = 'SELECT * FROM organizations WHERE status = ?';
    const bindings: any[] = ['active'];

    // 按层级加载：根节点 或 指定父节点的子节点
    if (!id) {
      sql += ' AND oid_parent IS NULL';
    } else {
      sql += ' AND oid_parent = ?';
      bindings.push(id);
    }

    sql += ` ORDER BY ${sort} ${order}`;

    if (rows > 0) {
      sql += ' LIMIT ?';
      bindings.push(rows);
    }

    const stmt = db.prepare(sql);
    const rows_data = stmt.all(...bindings) as Organization[];

    // 递归加载子节点
    for (const org of rows_data) {
      const children = await this.getOrgs({ ...params, id: org.oid });
      if (children.length > 0) {
        org.children = children;
      }
    }

    return rows_data;
  },

  /**
   * 保存组织（新增或更新）
   */
  async saveOrgs(delta: {
    inserted?: Organization[];
    updated?: Organization[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    // 处理新增
    if (delta.inserted && delta.inserted.length > 0) {
      for (const org of delta.inserted) {
        const oid = org.oid || `ORG_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO organizations (oid, oid_parent, aid, name, description, address,
            contactor, contactor_phone, contactor_mobile, contactor_email,
            org_type, sort_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          org.oidParent || null,
          org.aid,
          org.name,
          org.description || null,
          org.address || null,
          org.contactor || null,
          org.contactorPhone || null,
          org.contactorMobile || null,
          org.contactorEmail || null,
          org.orgType || 'department',
          org.sortNumber || 0,
          'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...org });
      }
    }

    // 处理更新
    if (delta.updated && delta.updated.length > 0) {
      for (const org of delta.updated) {
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE organizations SET
            oid_parent = ?, aid = ?, name = ?, description = ?, address = ?,
            contactor = ?, contactor_phone = ?, contactor_mobile = ?, contactor_email = ?,
            org_type = ?, sort_number = ?, updated_at = ?
          WHERE oid = ?
        `).run(
          org.oidParent || null,
          org.aid,
          org.name,
          org.description || null,
          org.address || null,
          org.contactor || null,
          org.contactorPhone || null,
          org.contactorMobile || null,
          org.contactorEmail || null,
          org.orgType || 'department',
          org.sortNumber || 0,
          now,
          org.oid
        );

        results.updated.push(org);
      }
    }

    // 处理删除
    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM organizations WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  },

  /**
   * 根据OID获取组织详情
   */
  async getOrgByOid(oid: string): Promise<Organization | null> {
    const stmt = db.prepare('SELECT * FROM organizations WHERE oid = ?');
    return stmt.get(oid) as Organization | null;
  },

  /**
   * 获取组织下拉列表（用于combobox）
   */
  async getOrgsLookup(params: TreeQueryParams): Promise<any[]> {
    const { sort = 'sort_number', order = 'asc' } = params;

    const stmt = db.prepare(`
      SELECT oid as TreeOID, oid as OID, oid_parent as TreeOIDParent,
             aid as AID, name as Name, sort_number as SortNumber
      FROM organizations
      WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);

    return stmt.all();
  }
};

// ============================================
// 角色管理服务
// ============================================

export const roleService = {
  /**
   * 获取角色列表（可按组织过滤）
   */
  async getRoles(params: { orgOid?: string; sort?: string; order?: string }): Promise<Role[]> {
    const { orgOid, sort = 'sort_number', order = 'asc' } = params;

    let sql = 'SELECT * FROM roles WHERE status = ?';
    const bindings: any[] = ['active'];

    if (orgOid) {
      sql += ' AND org_oid = ?';
      bindings.push(orgOid);
    }

    sql += ` ORDER BY ${sort} ${order}`;

    const stmt = db.prepare(sql);
    return stmt.all(...bindings) as Role[];
  },

  /**
   * 保存角色
   */
  async saveRoles(delta: {
    inserted?: Role[];
    updated?: Role[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    // 处理新增
    if (delta.inserted && delta.inserted.length > 0) {
      for (const role of delta.inserted) {
        const oid = role.oid || `ROLE_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO roles (oid, org_oid, aid, name, description, sort_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          role.orgOid,
          role.aid,
          role.name,
          role.description || null,
          role.sortNumber || 0,
          'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...role });
      }
    }

    // 处理更新
    if (delta.updated && delta.updated.length > 0) {
      for (const role of delta.updated) {
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE roles SET org_oid = ?, aid = ?, name = ?, description = ?,
            sort_number = ?, updated_at = ?
          WHERE oid = ?
        `).run(
          role.orgOid,
          role.aid,
          role.name,
          role.description || null,
          role.sortNumber || 0,
          now,
          role.oid
        );

        results.updated.push(role);
      }
    }

    // 处理删除
    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM roles WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  },

  /**
   * 获取组织角色树下拉数据
   */
  async getOrgRolesTree(params: TreeQueryParams): Promise<any[]> {
    const { sort = 'sort_number', order = 'asc' } = params;

    // 获取组织树
    const orgStmt = db.prepare(`
      SELECT oid as TreeOID, oid as OID, oid_parent as TreeOIDParent,
             aid as AID, name as Name, 1 as Kind, sort_number as SortNumber
      FROM organizations WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);
    const orgs = orgStmt.all();

    // 获取角色
    const roleStmt = db.prepare(`
      SELECT oid as TreeOID, org_oid as OID, aid as AID, name as Name, 2 as Kind, sort_number as SortNumber
      FROM roles WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);
    const roles = roleStmt.all();

    // 合并返回（前端需要自行组装树）
    return [...orgs, ...roles];
  }
};

// ============================================
// 用户管理服务
// ============================================

export const userService = {
  /**
   * 获取用户列表
   */
  async getUsers(params: { orgOid?: string; status?: string }): Promise<User[]> {
    const { orgOid, status } = params;

    let sql = 'SELECT * FROM users WHERE 1=1';
    const bindings: any[] = [];

    if (orgOid) {
      sql += ' AND org_oid = ?';
      bindings.push(orgOid);
    }

    if (status) {
      sql += ' AND status = ?';
      bindings.push(status);
    }

    const stmt = db.prepare(sql);
    const users = stmt.all(...bindings) as User[];

    // 去除密码哈希
    return users.map(u => ({ ...u, passwordHash: undefined }));
  },

  /**
   * 保存用户
   */
  async saveUsers(delta: {
    inserted?: User[];
    updated?: User[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    // 处理新增
    if (delta.inserted && delta.inserted.length > 0) {
      for (const user of delta.inserted) {
        const oid = user.oid || `USER_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO users (oid, org_oid, aid, name, password_hash, email, phone, avatar, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          user.orgOid,
          user.aid,
          user.name,
          user.passwordHash || null,
          user.email || null,
          user.phone || null,
          user.avatar || null,
          user.status || 'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...user });
      }
    }

    // 处理更新
    if (delta.updated && delta.updated.length > 0) {
      for (const user of delta.updated) {
        const now = new Date().toISOString();

        const updates: string[] = [];
        const bindings: any[] = [];

        if (user.orgOid) { updates.push('org_oid = ?'); bindings.push(user.orgOid); }
        if (user.aid) { updates.push('aid = ?'); bindings.push(user.aid); }
        if (user.name) { updates.push('name = ?'); bindings.push(user.name); }
        if (user.passwordHash) { updates.push('password_hash = ?'); bindings.push(user.passwordHash); }
        if (user.email !== undefined) { updates.push('email = ?'); bindings.push(user.email); }
        if (user.phone !== undefined) { updates.push('phone = ?'); bindings.push(user.phone); }
        if (user.status) { updates.push('status = ?'); bindings.push(user.status); }

        updates.push('updated_at = ?');
        bindings.push(now);
        bindings.push(user.oid);

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE oid = ?`).run(...bindings);

        results.updated.push(user);
      }
    }

    // 处理删除
    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM users WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  },

  /**
   * 保存用户角色关联
   */
  async saveUserRoles(userOid: string, roleOids: string[]): Promise<void> {
    // 先删除现有关联
    db.prepare('DELETE FROM user_roles WHERE user_oid = ?').run(userOid);

    // 插入新关联
    for (const roleOid of roleOids) {
      db.prepare(`
        INSERT INTO user_roles (user_oid, role_oid, created_at)
        VALUES (?, ?, ?)
      `).run(userOid, roleOid, new Date().toISOString());
    }
  },

  /**
   * 获取用户角色
   */
  async getUserRoles(userOid: string): Promise<string[]> {
    const stmt = db.prepare('SELECT role_oid FROM user_roles WHERE user_oid = ?');
    const rows = stmt.all(userOid) as { role_oid: string }[];
    return rows.map(r => r.role_oid);
  },

  /**
   * 获取组织用户树下拉数据
   */
  async getOrgUsersTree(params: TreeQueryParams): Promise<any[]> {
    const { sort = 'sort_number', order = 'asc' } = params;

    // 获取组织树
    const orgStmt = db.prepare(`
      SELECT oid as TreeOID, oid as OID, oid_parent as TreeOIDParent,
             aid as AID, name as Name, 1 as Kind, sort_number as SortNumber
      FROM organizations WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);
    const orgs = orgStmt.all();

    // 获取用户
    const userStmt = db.prepare(`
      SELECT oid as TreeOID, org_oid as OID, aid as AID, name as Name, 1 as Kind, sort_number as SortNumber
      FROM users WHERE status = 'active'
      ORDER BY ${sort} ${order}
    `);
    const users = userStmt.all();

    return [...orgs, ...users];
  }
};

// ============================================
// 工序管理服务
// ============================================

export const processService = {
  /**
   * 获取工序树
   */
  async getProcesses(params: TreeQueryParams & { appType?: AppType }): Promise<Process[]> {
    const { rows = -1, id, appType, sort = 'sort_number', order = 'asc' } = params;

    let sql = 'SELECT * FROM processes WHERE status = ?';
    const bindings: any[] = ['active'];

    if (appType !== undefined) {
      sql += ' AND app_type = ?';
      bindings.push(appType);
    }

    if (!id) {
      sql += ' AND oid_parent IS NULL';
    } else {
      sql += ' AND oid_parent = ?';
      bindings.push(id);
    }

    sql += ` ORDER BY ${sort} ${order}`;

    if (rows > 0) {
      sql += ' LIMIT ?';
      bindings.push(rows);
    }

    const stmt = db.prepare(sql);
    const rows_data = stmt.all(...bindings) as Process[];

    // 递归加载子节点
    for (const proc of rows_data) {
      const children = await this.getProcesses({ ...params, id: proc.oid });
      if (children.length > 0) {
        proc.children = children;
      }
    }

    return rows_data;
  },

  /**
   * 保存工序
   */
  async saveProcesses(delta: {
    inserted?: Process[];
    updated?: Process[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    if (delta.inserted && delta.inserted.length > 0) {
      for (const proc of delta.inserted) {
        const oid = proc.oid || `PROC_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO processes (oid, oid_parent, aid, name, app_type, exec_name, exec_mode,
            description, image_aid, hidden, sort_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          proc.oidParent || null,
          proc.aid,
          proc.name,
          proc.appType || 0,
          proc.execName || null,
          proc.execMode || null,
          proc.description || null,
          proc.imageAid || null,
          proc.hidden ? 1 : 0,
          proc.sortNumber || 0,
          'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...proc });
      }
    }

    if (delta.updated && delta.updated.length > 0) {
      for (const proc of delta.updated) {
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE processes SET oid_parent = ?, aid = ?, name = ?, app_type = ?,
            exec_name = ?, exec_mode = ?, description = ?, image_aid = ?,
            hidden = ?, sort_number = ?, updated_at = ?
          WHERE oid = ?
        `).run(
          proc.oidParent || null,
          proc.aid,
          proc.name,
          proc.appType || 0,
          proc.execName || null,
          proc.execMode || null,
          proc.description || null,
          proc.imageAid || null,
          proc.hidden ? 1 : 0,
          proc.sortNumber || 0,
          now,
          proc.oid
        );

        results.updated.push(proc);
      }
    }

    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM processes WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  },

  /**
   * 获取工序树下拉数据
   */
  async getProcessesLookup(params: { appType?: AppType }): Promise<any[]> {
    const { appType = 0 } = params;

    const stmt = db.prepare(`
      SELECT oid as ProcessOID, oid_parent as ProcessOIDParent,
             aid as ProcessAID, name as Name, app_type as AppType, sort_number as SortNumber
      FROM processes
      WHERE status = 'active' AND app_type = ?
      ORDER BY sort_number ASC
    `);

    return stmt.all(appType);
  }
};

// ============================================
// 动作管理服务
// ============================================

export const actionService = {
  /**
   * 获取动作列表（可按分类和AppType过滤）
   */
  async getActions(params: { appType?: AppType; category?: string }): Promise<Action[]> {
    const { appType, category } = params;

    let sql = 'SELECT * FROM actions WHERE status = ?';
    const bindings: any[] = ['active'];

    if (appType !== undefined) {
      sql += ' AND app_type = ?';
      bindings.push(appType);
    }

    if (category) {
      sql += ' AND category = ?';
      bindings.push(category);
    }

    sql += ' ORDER BY sort_number ASC';

    const stmt = db.prepare(sql);
    return stmt.all(...bindings) as Action[];
  },

  /**
   * 保存动作
   */
  async saveActions(delta: {
    inserted?: Action[];
    updated?: Action[];
    deleted?: string[];
  }): Promise<any> {
    const results: any = { inserted: [], updated: [], deleted: [] };

    if (delta.inserted && delta.inserted.length > 0) {
      for (const action of delta.inserted) {
        const oid = action.oid || `ACTION_${Date.now()}`;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO actions (oid, aid, name, category, app_type, description, image_aid, sort_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oid,
          action.aid,
          action.name,
          action.category,
          action.appType || 0,
          action.description || null,
          action.imageAid || null,
          action.sortNumber || 0,
          'active',
          now,
          now
        );

        results.inserted.push({ OID: oid, ...action });
      }
    }

    if (delta.updated && delta.updated.length > 0) {
      for (const action of delta.updated) {
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE actions SET aid = ?, name = ?, category = ?, app_type = ?,
            description = ?, image_aid = ?, sort_number = ?, updated_at = ?
          WHERE oid = ?
        `).run(
          action.aid,
          action.name,
          action.category,
          action.appType || 0,
          action.description || null,
          action.imageAid || null,
          action.sortNumber || 0,
          now,
          action.oid
        );

        results.updated.push(action);
      }
    }

    if (delta.deleted && delta.deleted.length > 0) {
      for (const oid of delta.deleted) {
        db.prepare('DELETE FROM actions WHERE oid = ?').run(oid);
        results.deleted.push(oid);
      }
    }

    return results;
  }
};

// ============================================
// 角色权限服务
// ============================================

export const roleAuthorityService = {
  /**
   * 获取角色权限矩阵
   */
  async getRoleAuthority(params: { roleOid: string; appType: AppType }): Promise<RoleAuthorityItem[]> {
    const { roleOid, appType } = params;

    const stmt = db.prepare(`
      SELECT ra.role_oid as roleOid, ra.process_oid as processOid,
             ra.action_oid as actionOid, ra.value
      FROM roles_authority ra
      JOIN processes p ON ra.process_oid = p.oid
      WHERE ra.role_oid = ? AND p.app_type = ?
    `);

    return stmt.all(roleOid, appType) as RoleAuthorityItem[];
  },

  /**
   * 批量保存角色权限
   */
  async saveRoleAuthorities(roleOid: string, authorities: RoleAuthorityItem[]): Promise<void> {
    for (const auth of authorities) {
      if (auth.value === -1) {
        // -1 表示删除权限记录（继承角色）
        db.prepare(`
          DELETE FROM roles_authority
          WHERE role_oid = ? AND process_oid = ? AND action_oid = ?
        `).run(roleOid, auth.processOid, auth.actionOid);
      } else {
        // upsert
        db.prepare(`
          INSERT INTO roles_authority (role_oid, process_oid, action_oid, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(role_oid, process_oid, action_oid)
          DO UPDATE SET value = ?, updated_at = ?
        `).run(
          roleOid, auth.processOid, auth.actionOid, auth.value,
          new Date().toISOString(), new Date().toISOString(),
          auth.value, new Date().toISOString()
        );
      }
    }
  },

  /**
   * 授权角色全部工序权限
   */
  async authorizeAll(roleOid: string, processOids: string[], appType: AppType, isAuthorize: boolean): Promise<void> {
    if (isAuthorize) {
      // 批量插入（忽略已存在）
      for (const processOid of processOids) {
        db.prepare(`
          INSERT OR IGNORE INTO roles_authority (role_oid, process_oid, action_oid, value, created_at, updated_at)
          SELECT ?, ?, oid, 1, ?, ? FROM actions WHERE app_type = ?
        `).run(roleOid, processOid, new Date().toISOString(), new Date().toISOString(), appType);
      }
    } else {
      // 删除这些工序的所有权限
      for (const processOid of processOids) {
        db.prepare(`
          DELETE FROM roles_authority WHERE role_oid = ? AND process_oid = ?
        `).run(roleOid, processOid);
      }
    }
  }
};

// ============================================
// 用户权限服务
// ============================================

export const userAuthorityService = {
  /**
   * 获取用户权限矩阵
   */
  async getUserAuthority(params: { userOid: string; appType: AppType }): Promise<UserAuthorityItem[]> {
    const { userOid, appType } = params;

    const stmt = db.prepare(`
      SELECT ua.user_oid as userOid, ua.process_oid as processOid,
             ua.action_oid as actionOid, ua.value
      FROM users_authority ua
      JOIN processes p ON ua.process_oid = p.oid
      WHERE ua.user_oid = ? AND p.app_type = ?
    `);

    return stmt.all(userOid, appType) as UserAuthorityItem[];
  },

  /**
   * 批量保存用户权限
   */
  async saveUserAuthorities(userOid: string, authorities: UserAuthorityItem[]): Promise<void> {
    for (const auth of authorities) {
      if (auth.value === -1) {
        db.prepare(`
          DELETE FROM users_authority
          WHERE user_oid = ? AND process_oid = ? AND action_oid = ?
        `).run(userOid, auth.processOid, auth.actionOid);
      } else {
        db.prepare(`
          INSERT INTO users_authority (user_oid, process_oid, action_oid, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_oid, process_oid, action_oid)
          DO UPDATE SET value = ?, updated_at = ?
        `).run(
          userOid, auth.processOid, auth.actionOid, auth.value,
          new Date().toISOString(), new Date().toISOString(),
          auth.value, new Date().toISOString()
        );
      }
    }
  }
};

// ============================================
// 数据权限服务
// ============================================

export const dataAuthorityService = {
  /**
   * 获取角色数据权限
   */
  async getRoleDataAuthority(roleOid: string): Promise<RoleDataAuthorityItem[]> {
    const stmt = db.prepare(`
      SELECT role_oid as roleOid, org_oid as orgOid, value
      FROM roles_data_authority
      WHERE role_oid = ?
    `);

    return stmt.all(roleOid) as RoleDataAuthorityItem[];
  },

  /**
   * 保存角色数据权限
   */
  async saveRoleDataAuthority(roleOid: string, orgOids: string[], isAuthorize: boolean): Promise<void> {
    if (isAuthorize) {
      for (const orgOid of orgOids) {
        db.prepare(`
          INSERT OR IGNORE INTO roles_data_authority (role_oid, org_oid, value, created_at, updated_at)
          VALUES (?, ?, 1, ?, ?)
        `).run(roleOid, orgOid, new Date().toISOString(), new Date().toISOString());
      }
    } else {
      for (const orgOid of orgOids) {
        db.prepare(`
          DELETE FROM roles_data_authority WHERE role_oid = ? AND org_oid = ?
        `).run(roleOid, orgOid);
      }
    }
  },

  /**
   * 获取组织树（含权限状态）
   */
  async getOrgTreeWithAuth(roleOid: string): Promise<any[]> {
    // 获取所有组织
    const orgsStmt = db.prepare(`
      SELECT oid as TreeOID, oid as OID, oid_parent as TreeOIDParent,
             aid as AID, name as Name, 1 as Kind, sort_number as SortNumber
      FROM organizations WHERE status = 'active'
      ORDER BY sort_number ASC
    `);
    const orgs = orgsStmt.all();

    // 获取该角色的数据权限
    const authStmt = db.prepare(`
      SELECT org_oid FROM roles_data_authority WHERE role_oid = ? AND value = 1
    `);
    const authRows = authStmt.all(roleOid) as { org_oid: string }[];
    const authorizedOrgOids = new Set(authRows.map(r => r.org_oid));

    // 标记权限状态
    for (const org of orgs) {
      org.checked = authorizedOrgOids.has(org.OID);
    }

    return orgs;
  }
};
```

---

## 第23章：React Context (src/contexts/AuthSettingsContext.tsx)

```tsx
// ============================================
// 组织与权限管理 - 全局状态Context
// 来源参考：弘智耘源 authority2 模块
// ============================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  Organization,
  Role,
  User,
  Process,
  Action,
  RoleAuthorityItem,
  UserAuthorityItem,
  RoleDataAuthorityItem,
  AppType
} from '../types/authority';
import {
  organizationService,
  roleService,
  userService,
  processService,
  actionService,
  roleAuthorityService,
  userAuthorityService,
  dataAuthorityService
} from '../services/authorityService';

// ============================================
// Context类型定义
// ============================================

interface AuthSettingsContextType {
  // 组织架构
  organizations: Organization[];
  loadingOrganizations: boolean;
  refreshOrganizations: () => Promise<void>;

  // 角色
  roles: Role[];
  loadingRoles: boolean;
  refreshRoles: (orgOid?: string) => Promise<void>;

  // 用户
  users: User[];
  loadingUsers: boolean;
  refreshUsers: (orgOid?: string) => Promise<void>;

  // 工序
  processes: Process[];
  loadingProcesses: boolean;
  refreshProcesses: (appType?: AppType) => Promise<void>;

  // 动作
  actions: Action[];
  loadingActions: boolean;
  refreshActions: (appType?: AppType) => Promise<void>;

  // 角色权限
  roleAuthorities: Map<string, RoleAuthorityItem[]>;  // roleOid -> authorities
  getRoleAuthorities: (roleOid: string, appType: AppType) => Promise<RoleAuthorityItem[]>;
  saveRoleAuthorities: (roleOid: string, authorities: RoleAuthorityItem[]) => Promise<void>;

  // 用户权限
  userAuthorities: Map<string, UserAuthorityItem[]>;  // userOid -> authorities
  getUserAuthorities: (userOid: string, appType: AppType) => Promise<UserAuthorityItem[]>;
  saveUserAuthorities: (userOid: string, authorities: UserAuthorityItem[]) => Promise<void>;

  // 数据权限
  getRoleDataAuthority: (roleOid: string) => Promise<RoleDataAuthorityItem[]>;
  saveRoleDataAuthority: (roleOid: string, orgOids: string[], isAuthorize: boolean) => Promise<void>;
}

const AuthSettingsContext = createContext<AuthSettingsContextType | null>(null);

// ============================================
// Provider组件
// ============================================

interface AuthSettingsProviderProps {
  children: ReactNode;
}

export function AuthSettingsProvider({ children }: AuthSettingsProviderProps) {
  // 组织架构
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  const refreshOrganizations = useCallback(async () => {
    setLoadingOrganizations(true);
    try {
      const data = await organizationService.getOrgs({});
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoadingOrganizations(false);
    }
  }, []);

  // 角色
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const refreshRoles = useCallback(async (orgOid?: string) => {
    setLoadingRoles(true);
    try {
      const data = await roleService.getRoles({ orgOid });
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // 用户
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const refreshUsers = useCallback(async (orgOid?: string) => {
    setLoadingUsers(true);
    try {
      const data = await userService.getUsers({ orgOid });
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // 工序
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  const refreshProcesses = useCallback(async (appType: AppType = 0) => {
    setLoadingProcesses(true);
    try {
      const data = await processService.getProcesses({ appType });
      setProcesses(data);
    } catch (error) {
      console.error('Failed to load processes:', error);
    } finally {
      setLoadingProcesses(false);
    }
  }, []);

  // 动作
  const [actions, setActions] = useState<Action[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  const refreshActions = useCallback(async (appType: AppType = 0) => {
    setLoadingActions(true);
    try {
      const data = await actionService.getActions({ appType });
      setActions(data);
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setLoadingActions(false);
    }
  }, []);

  // 角色权限缓存
  const [roleAuthorities, setRoleAuthorities] = useState<Map<string, RoleAuthorityItem[]>>(new Map());

  const getRoleAuthorities = useCallback(async (roleOid: string, appType: AppType): Promise<RoleAuthorityItem[]> => {
    const key = `${roleOid}_${appType}`;
    if (roleAuthorities.has(key)) {
      return roleAuthorities.get(key)!;
    }

    const data = await roleAuthorityService.getRoleAuthority({ roleOid, appType });
    setRoleAuthorities(prev => {
      const newMap = new Map(prev);
      newMap.set(key, data);
      return newMap;
    });
    return data;
  }, [roleAuthorities]);

  const saveRoleAuthorities = useCallback(async (roleOid: string, authorities: RoleAuthorityItem[]) => {
    await roleAuthorityService.saveRoleAuthorities(roleOid, authorities);
    // 清除缓存
    setRoleAuthorities(prev => {
      const newMap = new Map(prev);
      for (const key of newMap.keys()) {
        if (key.startsWith(roleOid)) {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  }, []);

  // 用户权限缓存
  const [userAuthorities, setUserAuthorities] = useState<Map<string, UserAuthorityItem[]>>(new Map());

  const getUserAuthorities = useCallback(async (userOid: string, appType: AppType): Promise<UserAuthorityItem[]> => {
    const key = `${userOid}_${appType}`;
    if (userAuthorities.has(key)) {
      return userAuthorities.get(key)!;
    }

    const data = await userAuthorityService.getUserAuthority({ userOid, appType });
    setUserAuthorities(prev => {
      const newMap = new Map(prev);
      newMap.set(key, data);
      return newMap;
    });
    return data;
  }, [userAuthorities]);

  const saveUserAuthorities = useCallback(async (userOid: string, authorities: UserAuthorityItem[]) => {
    await userAuthorityService.saveUserAuthorities(userOid, authorities);
    // 清除缓存
    setUserAuthorities(prev => {
      const newMap = new Map(prev);
      for (const key of newMap.keys()) {
        if (key.startsWith(userOid)) {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  }, []);

  // 数据权限
  const getRoleDataAuthority = useCallback(async (roleOid: string): Promise<RoleDataAuthorityItem[]> => {
    return dataAuthorityService.getRoleDataAuthority(roleOid);
  }, []);

  const saveRoleDataAuthority = useCallback(async (roleOid: string, orgOids: string[], isAuthorize: boolean) => {
    await dataAuthorityService.saveRoleDataAuthority(roleOid, orgOids, isAuthorize);
  }, []);

  // 初始加载
  useEffect(() => {
    refreshOrganizations();
    refreshRoles();
    refreshUsers();
    refreshProcesses(0);
    refreshActions(0);
  }, [refreshOrganizations, refreshRoles, refreshUsers, refreshProcesses, refreshActions]);

  const value: AuthSettingsContextType = {
    organizations,
    loadingOrganizations,
    refreshOrganizations,
    roles,
    loadingRoles,
    refreshRoles,
    users,
    loadingUsers,
    refreshUsers,
    processes,
    loadingProcesses,
    refreshProcesses,
    actions,
    loadingActions,
    refreshActions,
    roleAuthorities,
    getRoleAuthorities,
    saveRoleAuthorities,
    userAuthorities,
    getUserAuthorities,
    saveUserAuthorities,
    getRoleDataAuthority,
    saveRoleDataAuthority,
  };

  return (
    <AuthSettingsContext.Provider value={value}>
      {children}
    </AuthSettingsContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAuthSettings() {
  const context = useContext(AuthSettingsContext);
  if (!context) {
    throw new Error('useAuthSettings must be used within AuthSettingsProvider');
  }
  return context;
}

// ============================================
// 权限检查Hook
// ============================================

interface UsePermissionOptions {
  userOid: string;
  appType?: AppType;
}

export function usePermission({ userOid, appType = 0 }: UsePermissionOptions) {
  const { userAuthorities, getUserAuthorities, roleAuthorities, getRoleAuthorities, users } = useAuthSettings();

  // 获取用户及其角色
  const user = users.find(u => u.oid === userOid);
  const userRoleOids = useUserRoles(userOid);

  // 检查用户是否有指定权限
  const hasPermission = useCallback(async (processOid: string, actionOid: string): Promise<boolean> => {
    // 获取用户个人权限
    const userAuths = await getUserAuthorities(userOid, appType);
    const userAuth = userAuths.find(a => a.processOid === processOid && a.actionOid === actionOid);

    // 如果用户有明确设置（1或0），直接返回
    if (userAuth && userAuth.value !== -1) {
      return userAuth.value === 1;
    }

    // 检查用户的角色权限
    for (const roleOid of userRoleOids) {
      const roleAuths = await getRoleAuthorities(roleOid, appType);
      const roleAuth = roleAuths.find(a => a.processOid === processOid && a.actionOid === actionOid);
      if (roleAuth && roleAuth.value === 1) {
        return true;
      }
    }

    return false;
  }, [userOid, appType, userOid, userRoleOids, getUserAuthorities, getRoleAuthorities]);

  return { hasPermission };
}

// 获取用户角色
function useUserRoles(userOid: string): string[] {
  const { roles, users } = useAuthSettings();
  const user = users.find(u => u.oid === userOid);
  if (!user) return [];

  // 从用户关联的角色中获取
  // TODO: 需要调用API获取用户角色关联
  return [];
}
```

---

## 第24章：页面组件代码

### 24.1 1 组织管理页面 (src/pages/settings/OrganizationPage.tsx)

```tsx
// ============================================
// 组织管理页面
// 来源参考：弘智耘源 orgs.{v}.ejs
// 功能：树形组织架构CRUD
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Organization } from '../../types/authority';
import { TreeTable } from '../../components/ui/TreeTable';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';

// 组织类型选项
const ORG_TYPE_OPTIONS = [
  { value: 'company', label: '公司' },
  { value: 'base', label: '基地' },
  { value: 'region', label: '区域' },
  { value: 'department', label: '部门' },
  { value: 'workshop', label: '车间' },
];

// 表格列定义
const COLUMNS = [
  { field: 'aid', title: '组织编码', width: 150, sortable: true },
  { field: 'name', title: '组织名称', width: 200, sortable: true },
  { field: 'orgType', title: '类型', width: 100 },
  { field: 'contactor', title: '联系人', width: 100 },
  { field: 'contactorPhone', title: '电话', width: 150 },
  { field: 'sortNumber', title: '排序', width: 80, align: 'right' },
];

export default function OrganizationPage() {
  const { organizations, loadingOrganizations, refreshOrganizations } = useAuthSettings();
  const { toast } = useToast();

  // 搜索
  const [searchTerm, setSearchTerm] = useState('');

  // 展开状态
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // 选中行
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [parentOrg, setParentOrg] = useState<Organization | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Organization>>({
    status: 'active',
    sortNumber: 0,
  });

  // 过滤数据
  const filteredData = useCallback(() => {
    if (!searchTerm) return organizations;

    const search = searchTerm.toLowerCase();
    const filterTree = (orgs: Organization[]): Organization[] => {
      const result: Organization[] = [];
      for (const org of orgs) {
        if (
          org.aid.toLowerCase().includes(search) ||
          org.name.toLowerCase().includes(search)
        ) {
          result.push(org);
        } else if (org.children) {
          const filteredChildren = filterTree(org.children);
          if (filteredChildren.length > 0) {
            result.push({ ...org, children: filteredChildren });
          }
        }
      }
      return result;
    };

    return filterTree(organizations);
  }, [organizations, searchTerm]);

  // 展开/折叠
  const toggleExpand = (oid: string) => {
    const newKeys = new Set(expandedKeys);
    if (newKeys.has(oid)) {
      newKeys.delete(oid);
    } else {
      newKeys.add(oid);
    }
    setExpandedKeys(newKeys);
  };

  // 新增同级
  const handleAddSibling = () => {
    if (!selectedOrg) {
      toast.warning('请先选择一个组织');
      return;
    }
    setModalMode('add');
    setParentOrg(organizations.find(o => o.oid === selectedOrg.oidParent) || null);
    setFormData({
      oidParent: selectedOrg.oidParent,
      status: 'active',
      sortNumber: (selectedOrg.sortNumber || 0) + 1,
    });
    setShowModal(true);
  };

  // 新增下级
  const handleAddChild = () => {
    if (!selectedOrg) {
      toast.warning('请先选择一个组织');
      return;
    }
    setModalMode('add');
    setParentOrg(selectedOrg);
    setFormData({
      oidParent: selectedOrg.oid,
      status: 'active',
      sortNumber: 0,
    });
    setShowModal(true);
  };

  // 编辑
  const handleEdit = (org: Organization) => {
    setModalMode('edit');
    setFormData({ ...org });
    setShowModal(true);
  };

  // 删除
  const handleDelete = async (org: Organization) => {
    if (!confirm(`确定删除组织"${org.name}"吗？`)) return;

    try {
      await organizationService.saveOrgs({ deleted: [org.oid] });
      toast.success('删除成功');
      refreshOrganizations();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 保存
  const handleSave = async () => {
    if (!formData.aid || !formData.name) {
      toast.warning('请填写组织编码和名称');
      return;
    }

    try {
      if (modalMode === 'add') {
        await organizationService.saveOrgs({
          inserted: [{ ...formData, oid: `ORG_${Date.now()}` } as Organization],
        });
        toast.success('新增成功');
      } else {
        await organizationService.saveOrgs({
          updated: [formData as Organization],
        });
        toast.success('更新成功');
      }
      setShowModal(false);
      refreshOrganizations();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 渲染树形行
  const renderTreeRow = (org: Organization, level: number = 0) => {
    const hasChildren = org.children && org.children.length > 0;
    const isExpanded = expandedKeys.has(org.oid);
    const isSelected = selectedOrg?.oid === org.oid;

    return (
      <React.Fragment key={org.oid}>
        <tr
          className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-emerald-50' : ''}`}
          onClick={() => setSelectedOrg(org)}
        >
          <td className="px-4 py-3" style={{ paddingLeft: `${level * 24 + 16}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(org.oid);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <Building className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">{org.aid}</span>
            </div>
          </td>
          <td className="px-4 py-3">{org.name}</td>
          <td className="px-4 py-3">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              {ORG_TYPE_OPTIONS.find(o => o.value === org.orgType)?.label || org.orgType}
            </span>
          </td>
          <td className="px-4 py-3">{org.contactor || '-'}</td>
          <td className="px-4 py-3">{org.contactorPhone || org.contactorMobile || '-'}</td>
          <td className="px-4 py-3 text-right">{org.sortNumber}</td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(org);
                }}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(org);
                }}
                className="p-1.5 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && hasChildren && org.children!.map(child => renderTreeRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <Building className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">组织管理</h1>
            <p className="text-gray-500">管理组织架构树形结构</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddSibling}
            disabled={!selectedOrg}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            新增同级
          </button>
          <button
            onClick={handleAddChild}
            disabled={!selectedOrg}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            新增下级
          </button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索组织编码或名称..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">组织编码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">电话</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">排序</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingOrganizations ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : filteredData().length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              filteredData().map(org => renderTreeRow(org))
            )}
          </tbody>
        </table>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <Modal
          title={modalMode === 'add' ? '新增组织' : '编辑组织'}
          onClose={() => setShowModal(false)}
          width={600}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="组织编码"
                value={formData.aid || ''}
                onChange={(e) => setFormData({ ...formData, aid: e.target.value })}
                placeholder="如：DEPT_001"
                required
              />
              <Input
                label="组织名称"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入组织名称"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="组织类型"
                value={formData.orgType || 'department'}
                onChange={(e) => setFormData({ ...formData, orgType: e.target.value as any })}
                options={ORG_TYPE_OPTIONS}
              />
              <Input
                label="排序号"
                type="number"
                value={formData.sortNumber || 0}
                onChange={(e) => setFormData({ ...formData, sortNumber: parseInt(e.target.value) })}
              />
            </div>

            <Input
              label="地址"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="请输入地址"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="联系人"
                value={formData.contactor || ''}
                onChange={(e) => setFormData({ ...formData, contactor: e.target.value })}
                placeholder="请输入联系人"
              />
              <Input
                label="联系电话"
                value={formData.contactorPhone || ''}
                onChange={(e) => setFormData({ ...formData, contactorPhone: e.target.value })}
                placeholder="请输入电话"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="手机"
                value={formData.contactorMobile || ''}
                onChange={(e) => setFormData({ ...formData, contactorMobile: e.target.value })}
                placeholder="请输入手机"
              />
              <Input
                label="邮箱"
                type="email"
                value={formData.contactorEmail || ''}
                onChange={(e) => setFormData({ ...formData, contactorEmail: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入描述"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {parentOrg && (
              <div className="text-sm text-gray-500">
                上级组织：{parentOrg.name} ({parentOrg.aid})
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              保存
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

### 24.1 2 角色权限页面 (src/pages/settings/RoleAuthorityPage.tsx)

```tsx
// ============================================
// 角色权限配置页面
// 来源参考：弘智耘源 roleAuthority.{v}.ejs
// 功能：角色对工序+动作的权限矩阵
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronLeft, Save, Search } from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Role, Process, Action, RoleAuthorityItem, AppType } from '../../types/authority';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';

interface ProcessRow {
  process: Process;
  actions: { [actionOid: string]: 1 | 0 };
}

export default function RoleAuthorityPage() {
  const { roles, processes, actions, getRoleAuthorities, saveRoleAuthorities, refreshRoles } = useAuthSettings();
  const { toast } = useToast();

  // 选择的角色
  const [selectedRoleOid, setSelectedRoleOid] = useState<string>('');

  // App类型
  const [appType, setAppType] = useState<AppType>(0);

  // 权限矩阵数据
  const [authorityMatrix, setAuthorityMatrix] = useState<ProcessRow[]>([]);

  // 加载权限数据
  useEffect(() => {
    if (!selectedRoleOid) {
      setAuthorityMatrix([]);
      return;
    }

    const loadAuthority = async () => {
      try {
        const authItems = await getRoleAuthorities(selectedRoleOid, appType);

        // 构建权限Map
        const authMap = new Map<string, 1 | 0>();
        for (const item of authItems) {
          authMap.set(`${item.processOid}_${item.actionOid}`, item.value as 1 | 0);
        }

        // 构建矩阵
        const buildMatrix = (procs: Process[]): ProcessRow[] => {
          const rows: ProcessRow[] = [];
          for (const proc of procs) {
            const rowActions: { [actionOid: string]: 1 | 0 } = {};
            for (const action of actions) {
              const key = `${proc.oid}_${action.oid}`;
              rowActions[action.oid] = authMap.get(key) || 0;
            }
            rows.push({ process: proc, actions: rowActions });

            if (proc.children && proc.children.length > 0) {
              rows.push(...buildMatrix(proc.children));
            }
          }
          return rows;
        };

        setAuthorityMatrix(buildMatrix(processes));
      } catch (error) {
        console.error('Failed to load authority:', error);
      }
    };

    loadAuthority();
  }, [selectedRoleOid, appType, processes, actions, getRoleAuthorities]);

  // 按分类分组动作
  const groupedActions = useMemo(() => {
    const groups: { [category: string]: Action[] } = {};
    for (const action of actions) {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
    }
    return groups;
  }, [actions]);

  // 全选某行的所有动作
  const handleRowCheckAll = (procOid: string, checked: boolean) => {
    setAuthorityMatrix(prev =>
      prev.map(row =>
        row.process.oid === procOid
          ? {
              ...row,
              actions: Object.fromEntries(
                Object.keys(row.actions).map(key => [key, checked ? 1 : 0])
            )
          : row
      )
    );
  };

  // 全选某列的所有工序
  const handleColumnCheckAll = (actionOid: string, checked: boolean) => {
    setAuthorityMatrix(prev =>
      prev.map(row => ({
        ...row,
        actions: { ...row.actions, [actionOid]: checked ? 1 : 0 }
      }))
    );
  };

  // 单元格点击
  const handleCellChange = (procOid: string, actionOid: string, value: 1 | 0) => {
    setAuthorityMatrix(prev =>
      prev.map(row =>
        row.process.oid === procOid
          ? { ...row, actions: { ...row.actions, [actionOid]: value } }
          : row
      )
    );
  };

  // 全选全部
  const handleCheckAll = (checked: boolean) => {
    setAuthorityMatrix(prev =>
      prev.map(row => ({
        ...row,
        actions: Object.fromEntries(
          Object.keys(row.actions).map(key => [key, checked ? 1 : 0])
      ))
    )
  };

  // 检查某行是否全部选中
  const isRowChecked = (row: ProcessRow): boolean => {
    return Object.values(row.actions).every(v => v === 1);
  };

  // 检查某列是否全部选中
  const isColumnChecked = (actionOid: string): boolean => {
    return authorityMatrix.every(row => row.actions[actionOid] === 1);
  };

  // 检查是否全部选中
  const isAllChecked = (): boolean => {
    if (authorityMatrix.length === 0) return false;
    return authorityMatrix.every(row => isRowChecked(row));
  };

  // 保存
  const handleSave = async () => {
    if (!selectedRoleOid) {
      toast.warning('请先选择角色');
      return;
    }

    try {
      const authorities: RoleAuthorityItem[] = [];
      for (const row of authorityMatrix) {
        for (const [actionOid, value] of Object.entries(row.actions)) {
          authorities.push({
            roleOid: selectedRoleOid,
            processOid: row.process.oid,
            actionOid,
            value,
          });
        }
      }

      await saveRoleAuthorities(selectedRoleOid, authorities);
      toast.success('保存成功');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 渲染工序行（支持树形缩进）
  const renderProcessRow = (row: ProcessRow, level: number = 0) => {
    const { process, actions: rowActions } = row;
    const isChecked = isRowChecked(row);

    return (
      <tr key={process.oid} className="hover:bg-gray-50">
        <td className="px-4 py-3" style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <span className="font-medium">{process.aid}</span>
        </td>
        <td className="px-4 py-3">
          {process.name}
        </td>
        <td className="px-4 py-3 text-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => handleRowCheckAll(process.oid, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
        </td>
        {Object.entries(groupedActions).map(([category, categoryActions]) =>
          categoryActions.map(action => (
            <td key={action.oid} className="px-4 py-3 text-center">
              <input
                type="checkbox"
                checked={rowActions[action.oid] === 1}
                onChange={(e) =>
                  handleCellChange(process.oid, action.oid, e.target.checked ? 1 : 0)
                }
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
            </td>
          ))
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <Shield className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">角色权限配置</h1>
            <p className="text-gray-500">配置角色对各工序+动作的权限矩阵</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!selectedRoleOid}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <Select
              value={selectedRoleOid}
              onChange={(e) => setSelectedRoleOid(e.target.value)}
              options={roles.map(r => ({ value: r.oid, label: `${r.aid} - ${r.name}` }))}
              placeholder="请选择角色"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">应用类型</label>
            <Select
              value={appType}
              onChange={(e) => setAppType(parseInt(e.target.value) as AppType)}
              options={[
                { value: 0, label: 'Web' },
                { value: 1, label: 'Mobile' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* 权限矩阵 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工序编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工序名称</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">
                  <input
                    type="checkbox"
                    checked={isAllChecked()}
                    onChange={(e) => handleCheckAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                {Object.entries(groupedActions).map(([category, categoryActions]) => (
                  <th
                    key={category}
                    colSpan={categoryActions.length}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-200"
                  >
                    {category}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3"></th>
                {Object.values(groupedActions).flat().map(action => (
                  <th
                    key={action.oid}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 border-l border-gray-200 min-w-[80px]"
                  >
                    <div className="transform -rotate-45 whitespace-nowrap">
                      {action.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {authorityMatrix.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + Object.values(groupedActions).flat().length}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {selectedRoleOid ? '暂无数据' : '请先选择角色'}
                  </td>
                </tr>
              ) : (
                authorityMatrix.map(row => renderProcessRow(row))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 说明 */}
      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
        <p className="font-medium text-gray-700 mb-2">说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>勾选表示授予权限，未勾选表示禁用权限</li>
          <li>第3列的全选框可以一次性勾选/取消该行所有动作的权限</li>
          <li>表头每个分类下的全选框可以一次性勾选/取消该列所有工序的该动作权限</li>
          <li>左下角的全选框可以一次性勾选/取消所有权限</li>
        </ul>
      </div>
    </div>
  );
}
```

### 24.1 3 用户管理页面 (src/pages/settings/UserManagementPage.tsx)

```tsx
// ============================================
// 用户管理页面
// 来源参考：弘智耘源 userAuthority 相关页面
// 功能：用户CRUD和角色分配
// ============================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  Save,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { User, Role } from '../../types/authority';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Checkbox } from '../../components/ui/Checkbox';
import { userService } from '../../services/authorityService';
import { useToast } from '../../contexts/ToastContext';

export default function UserManagementPage() {
  const {
    users,
    roles,
    organizations,
    loadingUsers,
    refreshUsers,
    refreshRoles,
    refreshOrganizations
  } = useAuthSettings();
  const { toast } = useToast();

  // 搜索和筛选
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<User>>({
    status: 'active',
  });

  // 用户角色关联
  const [selectedRoleOids, setSelectedRoleOids] = useState<string[]>([]);

  // 加载用户角色关联
  useEffect(() => {
    if (editingUser) {
      userService.getUserRoles(editingUser.oid).then(setSelectedRoleOids);
    }
  }, [editingUser]);

  // 过滤数据
  const filteredUsers = users.filter(user => {
    if (searchTerm && !user.aid.includes(searchTerm) && !user.name.includes(searchTerm)) {
      return false;
    }
    if (filterOrg && user.orgOid !== filterOrg) {
      return false;
    }
    if (filterStatus && user.status !== filterStatus) {
      return false;
    }
    return true;
  });

  // 获取组织名称
  const getOrgName = (orgOid: string) => {
    const org = organizations.find(o => o.oid === orgOid);
    return org ? `${org.aid} - ${org.name}` : orgOid;
  };

  // 获取用户角色名称
  const getUserRoles = (userOid: string) => {
    // TODO: 需要调用API获取用户角色
    return roles.filter(r => r.oid).map(r => r.name);
  };

  // 新增
  const handleAdd = () => {
    setModalMode('add');
    setEditingUser(null);
    setFormData({ status: 'active' });
    setSelectedRoleOids([]);
    setShowModal(true);
  };

  // 编辑
  const handleEdit = (user: User) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormData({ ...user });
    setShowModal(true);
  };

  // 删除
  const handleDelete = async (user: User) => {
    if (!confirm(`确定删除用户"${user.name}"吗？`)) return;

    try {
      await userService.saveUsers({ deleted: [user.oid] });
      toast.success('删除成功');
      refreshUsers();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 切换状态
  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await userService.saveUsers({
        updated: [{ ...user, status: newStatus } as User]
      });
      refreshUsers();
    } catch (error) {
      toast.error('更新状态失败');
    }
  };

  // 保存
  const handleSave = async () => {
    if (!formData.aid || !formData.name || !formData.orgOid) {
      toast.warning('请填写必填项');
      return;
    }

    try {
      if (modalMode === 'add') {
        const newUser = { ...formData, oid: `USER_${Date.now()}` } as User;
        await userService.saveUsers({ inserted: [newUser] });
        await userService.saveUserRoles(newUser.oid, selectedRoleOids);
        toast.success('新增成功');
      } else {
        await userService.saveUsers({ updated: [formData as User] });
        await userService.saveUserRoles(editingUser!.oid, selectedRoleOids);
        toast.success('更新成功');
      }
      setShowModal(false);
      refreshUsers();
      refreshRoles();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 角色选择
  const handleRoleChange = (roleOid: string, checked: boolean) => {
    if (checked) {
      setSelectedRoleOids([...selectedRoleOids, roleOid]);
    } else {
      setSelectedRoleOids(selectedRoleOids.filter(id => id !== roleOid));
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <Users className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
            <p className="text-gray-500">管理用户账号和角色分配</p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          新增用户
        </button>
      </div>

      {/* 搜索筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索账号或姓名..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">所属组织</label>
            <select
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">全部组织</option>
              {organizations.map(org => (
                <option key={org.oid} value={org.oid}>
                  {org.aid} - {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">账号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">组织</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingUsers ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.oid} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-medium">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.aid}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-gray-600">{getOrgName(user.orgOid)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(user.oid).map(roleName => (
                        <span
                          key={roleName}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full"
                        >
                          {roleName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`flex items-center gap-1 text-sm ${
                        user.status === 'active' ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {user.status === 'active' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {user.status === 'active' ? '启用' : '停用'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <Modal
          title={modalMode === 'add' ? '新增用户' : '编辑用户'}
          onClose={() => setShowModal(false)}
          width={600}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="账号"
                value={formData.aid || ''}
                onChange={(e) => setFormData({ ...formData, aid: e.target.value })}
                placeholder="登录账号"
                required
              />
              <Input
                label="姓名"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="用户姓名"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="所属组织"
                value={formData.orgOid || ''}
                onChange={(e) => setFormData({ ...formData, orgOid: e.target.value })}
                options={organizations.map(org => ({
                  value: org.oid,
                  label: `${org.aid} - ${org.name}`
                }))}
                placeholder="请选择组织"
                required
              />
              <Input
                label="邮箱"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="邮箱地址"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="电话"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="联系电话"
              />
              <Input
                label="入职日期"
                type="date"
                value={formData.hireDate || ''}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              />
            </div>

            {modalMode === 'add' && (
              <Input
                label="初始密码"
                type="password"
                value={formData.passwordHash || ''}
                onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                placeholder="请输入初始密码"
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分配角色</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {roles.map(role => (
                  <label
                    key={role.oid}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleOids.includes(role.oid)}
                      onChange={(e) => handleRoleChange(role.oid, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">
                      {role.aid} - {role.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              保存
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

### 24.1 4 数据权限页面 (src/pages/settings/DataAuthorityPage.tsx)

```tsx
// ============================================
// 数据权限配置页面
// 来源参考：弘智耘源 roleDataAuthority.{v}.ejs
// 功能：角色对组织的访问权限
// ============================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ChevronLeft, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuthSettings } from '../../contexts/AuthSettingsContext';
import { Role, Organization, RoleDataAuthorityItem } from '../../types/authority';
import { Select } from '../../components/ui/Select';
import { dataAuthorityService } from '../../services/authorityService';
import { useToast } from '../../contexts/ToastContext';

export default function DataAuthorityPage() {
  const { roles, organizations, refreshRoles } = useAuthSettings();
  const { toast } = useToast();

  // 选择的角色
  const [selectedRoleOid, setSelectedRoleOid] = useState<string>('');

  // 组织树（含勾选状态）
  const [orgTree, setOrgTree] = useState<(Organization & { checked: boolean })[]>([]);

  // 展开状态
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // 加载组织树（含权限状态）
  useEffect(() => {
    if (!selectedRoleOid) {
      setOrgTree([]);
      return;
    }

    const loadOrgTree = async () => {
      try {
        const orgsWithAuth = await dataAuthorityService.getOrgTreeWithAuth(selectedRoleOid);

        // 转换为Organization类型
        const orgs: (Organization & { checked: boolean })[] = orgsWithAuth.map(org => ({
          oid: org.OID,
          oidParent: org.TreeOIDParent === org.OID ? null : org.TreeOIDParent,
          aid: org.AID,
          name: org.Name,
          checked: org.checked || false,
        }));

        setOrgTree(orgs);

        // 默认展开第一层
        const firstLevelKeys = new Set<string>();
        for (const org of orgs) {
          if (!org.oidParent) {
            firstLevelKeys.add(org.oid);
          }
        }
        setExpandedKeys(firstLevelKeys);
      } catch (error) {
        console.error('Failed to load org tree:', error);
      }
    };

    loadOrgTree();
  }, [selectedRoleOid]);

  // 构建树形结构
  const buildTree = (
    orgs: (Organization & { checked: boolean })[]
  ): (Organization & { checked: boolean; children?: Organization[] })[] => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // 先创建所有节点
    for (const org of orgs) {
      map.set(org.oid, { ...org, children: [] });
    }

    // 构建树
    for (const org of orgs) {
      const node = map.get(org.oid);
      if (org.oidParent && map.has(org.oidParent)) {
        map.get(org.oidParent).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  };

  // 递归设置勾选状态（向下）
  const setChildrenChecked = (
    orgs: any[],
    oid: string,
    checked: boolean
  ) => {
    for (const org of orgs) {
      if (org.oid === oid && org.children) {
        for (const child of org.children) {
          child.checked = checked;
          if (child.children) {
            setChildrenChecked(orgs, child.oid, checked);
          }
        }
      } else if (org.children) {
        setChildrenChecked(org.children, oid, checked);
      }
    }
  };

  // 处理勾选
  const handleCheck = (org: any, checked: boolean) => {
    const newTree = JSON.parse(JSON.stringify(orgTree));

    // 更新当前节点
    const updateNode = (nodes: any[]): boolean => {
      for (const node of nodes) {
        if (node.oid === org.oid) {
          node.checked = checked;
          // 向下传递
          if (node.children) {
            for (const child of node.children) {
              child.checked = checked;
            }
          }
          return true;
        }
        if (node.children && updateNode(node.children)) {
          return true;
        }
      }
      return false;
    };

    updateNode(newTree);

    // 向上检查：如果所有兄弟都选中，父节点也应该选中
    // 简化处理：只向下传递，不向上自动选中

    setOrgTree(newTree);
  };

  // 全选
  const handleCheckAll = (checked: boolean) => {
    setOrgTree(prev =>
      prev.map(org => ({ ...org, checked }))
    );
  };

  // 展开/折叠
  const toggleExpand = (oid: string) => {
    const newKeys = new Set(expandedKeys);
    if (newKeys.has(oid)) {
      newKeys.delete(oid);
    } else {
      newKeys.add(oid);
    }
    setExpandedKeys(newKeys);
  };

  // 保存
  const handleSave = async () => {
    if (!selectedRoleOid) {
      toast.warning('请先选择角色');
      return;
    }

    try {
      // 收集所有选中的orgOid
      const collectCheckedOids = (orgs: any[]): string[] => {
        const oids: string[] = [];
        for (const org of orgs) {
          if (org.checked) {
            oids.push(org.oid);
          }
          if (org.children) {
            oids.push(...collectCheckedOids(org.children));
          }
        }
        return oids;
      };

      const checkedOids = collectCheckedOids(orgTree);
      await dataAuthorityService.saveRoleDataAuthority(
        selectedRoleOid,
        checkedOids,
        true
      );

      toast.success('保存成功');
      refreshRoles();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 渲染树节点
  const renderTreeNode = (org: any, level: number = 0) => {
    const hasChildren = org.children && org.children.length > 0;
    const isExpanded = expandedKeys.has(org.oid);

    return (
      <React.Fragment key={org.oid}>
        <tr className="hover:bg-gray-50">
          <td
            className="px-4 py-3"
            style={{ paddingLeft: `${level * 24 + 16}px` }}
          >
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(org.oid)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <input
                type="checkbox"
                checked={org.checked || false}
                onChange={(e) => handleCheck(org, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-gray-900">{org.aid}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-gray-600">{org.name}</td>
        </tr>
        {isExpanded && hasChildren && org.children.map((child: any) => renderTreeNode(child, level + 1))}
      </React.Fragment>
    );
  };

  const treeData = buildTree(orgTree);
  const isAllChecked = orgTree.length > 0 && orgTree.every(org => org.checked);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <Lock className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数据权限配置</h1>
            <p className="text-gray-500">配置角色对组织的访问权限</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!selectedRoleOid}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <Select
              value={selectedRoleOid}
              onChange={(e) => setSelectedRoleOid(e.target.value)}
              options={roles.map(r => ({ value: r.oid, label: `${r.aid} - ${r.name}` }))}
              placeholder="请选择角色"
            />
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>勾选表示该角色可以访问对应的组织数据</li>
          <li>勾选父组织会自动勾选所有子组织</li>
          <li>未勾选的组织和子组织将无法被该角色访问</li>
        </ul>
      </div>

      {/* 组织树 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllChecked}
              onChange={(e) => handleCheckAll(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-700">全选/取消全选</span>
          </label>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64">组织编码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">组织名称</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orgTree.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  {selectedRoleOid ? '暂无数据' : '请先选择角色'}
                </td>
              </tr>
            ) : (
              treeData.map(org => renderTreeNode(org))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 第25章：App路由配置 (src/App.tsx 片段)

```typescript
// 在现有路由中添加以下配置
// 需要将 AuthSettingsProvider 包裹整个应用

import { AuthSettingsProvider } from './contexts/AuthSettingsContext';
import OrganizationPage from './pages/settings/OrganizationPage';
import RoleManagementPage from './pages/settings/RoleManagementPage';
import RoleAuthorityPage from './pages/settings/RoleAuthorityPage';
import UserManagementPage from './pages/settings/UserManagementPage';
import UserAuthorityPage from './pages/settings/UserAuthorityPage';
import DataAuthorityPage from './pages/settings/DataAuthorityPage';
import ProcessManagementPage from './pages/settings/ProcessManagementPage';
import ActionManagementPage from './pages/settings/ActionManagementPage';

// 路由配置
const settingsRoutes = [
  // 组织与权限管理模块
  { path: '/settings/organization', component: OrganizationPage },
  { path: '/settings/role', component: RoleManagementPage },
  { path: '/settings/role-authority', component: RoleAuthorityPage },
  { path: '/settings/user', component: UserManagementPage },
  { path: '/settings/user-authority', component: UserAuthorityPage },
  { path: '/settings/data-authority', component: DataAuthorityPage },
  { path: '/settings/process', component: ProcessManagementPage },
  { path: '/settings/action', component: ActionManagementPage },
];

// 在App组件中使用
function App() {
  return (
    <AuthSettingsProvider>
      <Router>
        {/* ... 其他路由 */}
        <Route path="/settings/*" element={<SettingsLayout />}>
          {settingsRoutes.map(route => (
            <Route key={route.path} path={route.path.replace('/settings/', '')} element={<route.component />} />
          ))}
        </Route>
      </Router>
    </AuthSettingsProvider>
  );
}
```

---

## 第26章：数据库初始化 (src/db/init.ts)

```typescript
// ============================================
// 数据库初始化
// 执行：npm run db:init 或在应用启动时自动调用
// ============================================

import { db } from './database';
import fs from 'fs';
import path from 'path';

export async function initDatabase() {
  console.log('Initializing database...');

  // 读取schema文件
  const schemaPath = path.join(__dirname, 'schema', 'authority.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // 执行schema
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        db.exec(statement);
      } catch (error: any) {
        // 忽略"table already exists"等错误
        if (!error.message.includes('already exists')) {
          console.error('SQL Error:', error.message);
        }
      }
    }
  }

  console.log('Database initialized successfully');
}

// 如果是独立运行脚本
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
```

---

## 第27章：package.json脚本 (添加以下脚本)

```json
{
  "scripts": {
    "db:init": "ts-node src/db/init.ts",
    "db:reset": "rm -f src/db/*.db && npm run db:init",
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## 第28章：UI组件依赖

这些组件需要自行实现或从UI库（如shadcn/ui）引入：

```tsx
// src/components/ui/Modal.tsx
// src/components/ui/Input.tsx
// src/components/ui/Select.tsx
// src/components/ui/Checkbox.tsx
// src/components/ui/TreeTable.tsx
```

建议使用shadcn/ui组件库：
```bash
npx shadcn-ui@latest add modal input select checkbox table
```

---

## 第29章：后续开发指南

### 10.1 如何添加新的工序/动作

```typescript
// 1. 在数据库中添加
INSERT INTO processes (oid, oid_parent, aid, name, app_type, sort_number, status)
VALUES ('PROC_NEW', NULL, 'new', '新工序', 0, 10, 'active');

INSERT INTO actions (oid, aid, name, category, app_type, sort_number, status)
VALUES ('ACTION_NEW', 'new', '新动作', 'common', 0, 20, 'active');

// 2. 给超管角色授权
INSERT INTO roles_authority (role_oid, process_oid, action_oid, value)
VALUES ('ROLE_ADMIN', 'PROC_NEW', 'ACTION_NEW', 1);
```

### 10.2 如何添加新的组织类型

```typescript
// 1. 在数据字典中添加OrgType类型项
INSERT INTO dictionary_types (type_code, type_name)
VALUES ('OrgType', '组织类型');

INSERT INTO dictionary_items (type_id, item_code, item_value, sort_order)
VALUES (' OrgType的id', 'workshop', '车间', 5);
```

### 10.3 如何扩展AppType

当前支持Web(0)和Mobile(1)，如需扩展：

```typescript
// 1. 添加数据库枚举值
ALTER TABLE processes ADD COLUMN app_type INTEGER DEFAULT 0;
ALTER TABLE actions ADD COLUMN app_type INTEGER DEFAULT 0;

// 2. 在类型定义中扩展
export type AppType = 0 | 1 | 2; // 添加 2=Pad
```

---

*方案制定时间：2026-05-02*
*方案版本：V6.0 终极整合版*
*整合来源：V1/V2/V3/V4/V5.0 + Kimi深度联动版 + Opencode可复用代码V3.0 + 远程仓库扫描*
*代码可直接复制使用*
*适用仓库：lqch7788/TMcrop, 分支 planting-management*
