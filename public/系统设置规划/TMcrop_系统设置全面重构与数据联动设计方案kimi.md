# TMcrop 种植管理系统 — 系统设置全面重构与数据联动设计方案

**版本**：V2.0 联动增强版  
**日期**：2026-05-02  
**目标**：从"死数据"到"活系统"——后台一改，全局联动  
**核心原则**：所有基础数据从设置模块单点维护，业务模块实时引用，禁止任何硬编码

---

## 目录

1. [当前系统核心问题诊断](#一当前系统核心问题诊断)
2. [联动设计总览](#二联动设计总览)
3. [模块关联关系图谱](#三模块关联关系图谱)
4. [各设置模块详细联动设计](#四各设置模块详细联动设计)
5. [权限系统设计](#五权限系统设计)
6. [数据字典驱动设计](#六数据字典驱动设计)
7. [数据迁移与关联补全方案](#七数据迁移与关联补全方案)
8. [SQLite Schema 正规化改造](#八sqlite-schema-正规化改造)
9. [前端联动架构设计](#九前端联动架构设计)
10. [实施路线图](#十实施路线图)

---

## 一、当前系统核心问题诊断

### 1.1 存储架构现状（三重割裂）

```
┌────────────────────────────────────────────────────────────────────────┐
│                         当前存储架构（割裂）                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   后端 SQLite（约40张表）                                               │
│   ├─ 核心表：seed_sources / seedlings / plantings / harvests / ...     │
│   ├─ 扩展表：data_json TEXT 字段（JSON存储，无字段级关联）              │
│   └─ 状态：部分字段正规化，部分整表JSON化                                │
│                                                                        │
│   前端 LocalStorage（13+个KEY）                                         │
│   ├─ crop_seed_sources / crop_seedlings / crop_plantings               │
│   ├─ harvest_records / crop_orders / crop_instances                    │
│   ├─ suppliers / leave_quotas / overtime_records                       │
│   └─ 状态：默认模式（VITE_STORAGE_MODE=local）                          │
│                                                                        │
│   前端硬编码（232处+）                                                   │
│   ├─ departments = ['生产部','技术部',...]  ← 7个位置定义，各不相同      │
│   ├─ staffData = [6个人]  ← 3个文件复制                                  │
│   ├─ MOCK_STAFF = [12个人]  ← 加班/排班各一份                           │
│   ├─ warehouseOptions = [{value:'main',label:'主仓库'}]                 │
│   ├─ greenhouses = [11个温室]  ← 从多个来源引用                          │
│   └─ initialCompanyGroups = [2公司11基地]  ← 3个文件复制                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据关联断裂全景

```
业务模块                          当前存储方式                    问题
────────────────────────────────────────────────────────────────────────
种源创建人 createBy              字符串 "李明辉"                  人员改名后历史记录失效
采收人 harvesterNames            字符串数组 ["张三","李四"]       无法统计"张三今年采收多少"
审核人 auditor                   字符串 "王五"                    无法追踪审核记录归属
任务执行人 assignee              字符串/ID混合                     人员变动后任务归属混乱
种植区域 areaName                字符串 "一棚 > 01区"             基地改名后全部失效
入库仓库 warehouseName           字符串 "主仓库"                   无仓库管理功能
供应商 supplierName              字符串 "金色稻种公司"             无供应商档案
部门筛选                         硬编码数组                        新增部门要改7个文件
```

### 1.3 设置模块与业务模块的断层（致命）

```
┌────────────────────────────────────────────────────────────────────────┐
│                         设置与业务断层示意图                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   设置模块                    业务模块                                  │
│   ┌─────────────┐            ┌─────────────┐                          │
│   │ 部门设置     │◄───X───► │ 种源创建     │ ← createBy="李明辉"(字符串)│
│   │ (硬编码5个)  │            │             │                          │
│   └─────────────┘            └─────────────┘                          │
│                                无法关联：谁创建的这批种源？                │
│                                                                        │
│   ┌─────────────┐            ┌─────────────┐                          │
│   │ 人员管理     │◄───X───► │ 采收录入     │ ← harvesterNames=["张三"] │
│   │ (硬编码6人)  │            │             │                          │
│   └─────────────┘            └─────────────┘                          │
│                                无法关联：张三是哪个部门的？今年采收总量？   │
│                                                                        │
│   ┌─────────────┐            ┌─────────────┐                          │
│   │ 基地设置     │◄───X───► │ 种植选址     │ ← areaName="一棚>01区"     │
│   │ (硬编码11个) │            │             │                          │
│   └─────────────┘            └─────────────┘                          │
│                                无法关联：这个基地种了多少作物？           │
│                                                                        │
│   ┌─────────────┐            ┌─────────────┐                          │
│   │ 仓库管理     │ ❌不存在   │ 采收入库     │ ← warehouseName="主仓库"  │
│   │              │            │             │                          │
│   └─────────────┘            └─────────────┘                          │
│                                无法关联：主仓库有多少库存？              │
│                                                                        │
│   ┌─────────────┐            ┌─────────────┐                          │
│   │ 数据字典     │ ❌不存在   │ 状态筛选     │ ← status="sufficient"    │
│   │              │            │             │                          │
│   └─────────────┘            └─────────────┘                          │
│                                问题：新增状态时所有页面要改代码           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 二、联动设计总览

### 2.1 设计理念

**一句话**：后台设置模块是"数据源"，业务模块是"消费者"，所有基础数据单向流动，设置一改，全局生效。

```
┌────────────────────────────────────────────────────────────────────────┐
│                        联动架构总览                                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│    ┌─────────────────────────────────────────────────────────────┐     │
│    │                    SQLite 数据库（单一真相源）                 │     │
│    │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │     │
│    │  │ 组织   │ │ 人员   │ │ 品种库 │ │ 仓库   │ │ 字典   │   │     │
│    │  │ 架构   │ │ 档案   │ │        │ │        │ │        │   │     │
│    │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │     │
│    └─────────────────────────────────────────────────────────────┘     │
│                              ▲                                         │
│                              │ 读写                                      │
│          ┌───────────────────┼───────────────────┐                      │
│          │                   │                   │                      │
│          ▼                   ▼                   ▼                      │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐                   │
│    │ 设置模块  │      │ 设置模块  │      │ 设置模块  │                   │
│    │组织架构  │      │人员管理  │      │数据字典  │                   │
│    │页面      │      │页面      │      │页面      │                   │
│    └──────────┘      └──────────┘      └──────────┘                   │
│          │                   │                   │                      │
│          │    修改保存后自动同步（WebSocket/轮询）                      │
│          ▼                   ▼                   ▼                      │
│    ┌─────────────────────────────────────────────────────────────┐    │
│    │                    前端状态管理中心（Context/Zustand）          │    │
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
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 联动触发机制

| 触发方式 | 适用场景 | 实现成本 | 实时性 |
|---------|---------|---------|--------|
| **页面刷新时加载** | 所有页面 | 低 | 中（刷新才更新） |
| **弹窗打开时加载** | 下拉框数据 | 中 | 高（每次打开最新） |
| **WebSocket推送** | 多标签页同步 | 高 | 极高（秒级） |
| **Service Worker轮询** | 后台静默更新 | 中 | 中高（分钟级） |

**推荐组合方案**：
- **方案A（MVP）**：弹窗打开时实时加载 + 页面刷新时加载
- **方案B（完整）**：方案A + WebSocket推送（多标签同步）

---

## 三、模块关联关系图谱

### 3.1 完整关联图谱

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           模块关联关系图谱（设置→业务）                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐                                                            │
│  │  【组织架构】  │                                                            │
│  │  公司         │                                                            │
│  │  基地         │──────┐                                                      │
│  │  温室/大棚    │      │                                                      │
│  │  种植区域     │      │                                                      │
│  │  仓库         │      │      ┌──────────────┐    ┌──────────────┐         │
│  │  部门         │      │      │  【人员管理】  │    │  【作物品种库】│         │
│  └──────────────┘      │      │  员工档案      │    │  作物分类      │         │
│         │              │      │  职位          │    │  作物类型      │         │
│         │              │      │  班组          │    │  品种          │         │
│         │              │      │  考勤规则      │    │  子品种        │         │
│         ▼              │      └──────────────┘    └──────────────┘         │
│  ┌──────────────┐      │            │                    │                    │
│  │ 种源页面     │      │            │                    │                    │
│  │ 创建弹窗     │◄─────┼────────────┼────────────────────┤                    │
│  │ ├─供应商     │      │            │                    │                    │
│  │ ├─基地       │◄─────┘            │                    │                    │
│  │ ├─创建人     │◄──────────────────┘                    │                    │
│  └──────────────┘                                           │                    │
│                                                             │                    │
│  ┌──────────────┐      ┌──────────────┐                     │                    │
│  │ 育苗页面     │      │ 种植页面     │                     │                    │
│  │ 创建弹窗     │      │ 创建弹窗     │                     │                    │
│  │ ├─种源批号   │◄─────┼─────────────┤                     │                    │
│  │ ├─育苗场所   │◄─────┘             │                     │                    │
│  │ ├─负责人     │◄──────────────────┘                     │                    │
│  └──────────────┘                                           │                    │
│                                                             │                    │
│  ┌──────────────┐      ┌──────────────┐    ┌──────────────┐│                    │
│  │ 采收页面     │      │ 农事任务     │    │ 订单页面     ││                    │
│  │ 录入弹窗     │      │ 分派弹窗     │    │ 创建弹窗     ││                    │
│  │ ├─种植批次   │◄─────┼─────────────┤    │ ├─客户       ││                    │
│  │ ├─采收人     │◄─────┼─────────────┤    │ ├─作物品种   │◄────────────────────┘
│  │ ├─入库仓库   │◄─────┼─────────────┤    │ ├─交期       ││
│  │ ├─审核人     │◄─────┼─────────────┤    │ └─实例关联   │◄────┐
│  └──────────────┘      └──────────────┘    └──────────────┘│     │
│                                                             │     │
│  ┌──────────────┐      ┌──────────────┐                     │     │
│  │ 库存管理     │      │ 审批中心     │                     │     │
│  │ 入库/出库    │◄─────┼─────────────┤                     │     │
│  │ ├─仓库       │◄─────┘             │                     │     │
│  │ ├─操作人     │◄───────────────────┘                     │     │
│  │ ├─审核人     │◄──────────────────────────────────────────┘     │
│  └──────────────┘                                                    │
│                                                                      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐     │
│  │ 人工管理     │      │ 采购计划     │      │ 生产汇总     │     │
│  │ 考勤/加班    │◄─────┼─────────────┼──────┼─────────────┤     │
│  │ ├─人员       │◄─────┘             │      │             │     │
│  │ ├─部门       │◄───────────────────┘      │             │     │
│  │ ├─审批人     │◄────────────────────────────┤             │     │
│  │ ├─班组       │◄────────────────────────────┤             │     │
│  └──────────────┘                            └─────────────┘     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 关键联动路径说明

| # | 设置模块 | 联动业务模块 | 联动方式 | 联动效果 |
|---|---------|------------|---------|---------|
| 1 | 组织架构-基地 | 种源/育苗/种植/采收 | 下拉选择 | 新增基地后，所有选址弹窗自动出现 |
| 2 | 组织架构-温室 | 种植/采收/巡检 | 下拉选择 | 新增温室后，所有温室选择弹窗自动出现 |
| 3 | 组织架构-仓库 | 采收/库存/领料 | 下拉选择 | 新增仓库后，入库弹窗自动出现 |
| 4 | 人员管理-员工 | 种源/育苗/种植/采收/任务 | 下拉/多选 | 新增员工后，所有"负责人/创建人/采收人"可选 |
| 5 | 人员管理-部门 | 人工管理/统计分析 | 筛选/统计 | 部门调整后，人员归属自动更新 |
| 6 | 作物品种库 | 种源/订单/实例 | 级联选择 | 新增品种后，作物选择自动出现 |
| 7 | 数据字典-状态 | 全部业务页面 | 下拉选项 | 新增状态后，所有状态筛选自动出现 |
| 8 | 数据字典-农事类型 | 农事任务/工序 | 下拉选项 | 新增农事类型后，任务创建可用 |
| 9 | 供应商管理 | 种源采购/物料采购 | 下拉选择 | 新增供应商后，采购单可选 |
| 10 | 审批流程 | 全部需审批业务 | 自动触发 | 流程调整后，业务触发逻辑自动生效 |
| 11 | 用户权限 | 全部页面 | 路由/按钮控制 | 角色调整后，菜单/按钮自动显隐 |
| 12 | 系统配置 | 全部业务逻辑 | 参数读取 | 超时阈值调整后，任务提醒自动生效 |

---

## 四、各设置模块详细联动设计

### 4.1 组织架构设置（核心中的核心）

#### 4.1.1 模块结构

```
组织架构（OrganizationalSettings.tsx）
├── Tab: 公司管理
│   ├── 公司列表（CRUD）
│   └── 公司详情 → 下属基地/人员数
├── Tab: 基地管理
│   ├── 基地列表（CRUD）
│   ├── 基地详情 → 所属公司/下属温室/面积
│   └── 统计卡片：总面积/温室数/当前种植数
├── Tab: 温室/大棚管理
│   ├── 温室列表（CRUD）
│   ├── 温室详情 → 所属基地/面积/类型
│   └── 关联种植 → 当前种植作物/面积/状态
├── Tab: 种植区域管理
│   ├── 区域列表（CRUD）
│   └── 区域详情 → 所属温室/面积/土壤信息
├── Tab: 仓库管理
│   ├── 仓库列表（CRUD）
│   ├── 仓库详情 → 类型/地址/管理员
│   └── 库存概览 → 当前库存量/品类数
└── Tab: 部门管理
    ├── 部门树形结构（CRUD）
    ├── 部门详情 → 上级/负责人/人员数
    └── 部门人员 → 下属员工列表
```

#### 4.1.2 数据模型（正规化）

```typescript
// 公司
interface CompanyGroup {
  id: string;
  code: string;           // 公司编码（如：CG001）
  name: string;           // 公司名称
  shortName: string;      // 简称
  address: string;
  contactPerson: string;  // 联系人ID → 关联 staff.id
  contactPhone: string;
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}

// 基地
interface Base {
  id: string;
  code: string;           // 基地编码（如：BJ001）
  name: string;
  companyId: string;      // 关联 company_groups.id
  companyName: string;    // 冗余，方便显示
  area: number;           // 面积
  unit: string;           // 单位（亩/公顷）
  managerId: string;      // 负责人ID → 关联 staff.id
  managerName: string;    // 冗余
  phone: string;
  soilType: string;
  ph: number;
  city: string;
  province: string;
  lng: number;
  lat: number;
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}

// 温室/大棚
interface Greenhouse {
  id: string;
  code: string;
  name: string;
  baseId: string;         // 关联 bases.id
  baseName: string;       // 冗余
  type: string;           // 关联字典（glass/日光/薄膜）
  area: number;
  status: 'active' | 'inactive' | 'under_repair';
  createTime: string;
  updateTime: string;
}

// 种植区域
interface PlantArea {
  id: string;
  code: string;
  name: string;
  greenhouseId: string;   // 关联 greenhouses.id
  greenhouseName: string; // 冗余
  area: number;
  soilType: string;
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}

// 仓库
interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: string;           // 关联字典（general/cold/freezer）
  address: string;
  managerId: string;       // 关联 staff.id
  managerName: string;     // 冗余
  capacity: number;        // 容量
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}

// 部门
interface Department {
  id: string;
  code: string;
  name: string;
  parentId: string | null; // 上级部门ID，null为根
  managerId: string;      // 负责人ID → 关联 staff.id
  managerName: string;    // 冗余
  description: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}
```

#### 4.1.3 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增公司** | 基地设置页 | 基地创建时"所属公司"下拉新增选项 |
| **修改公司名称** | 全部业务页 | 显示的公司名自动更新（冗余字段+ID关联） |
| **停用公司** | 种植/采收 | 该公司的基地不再出现在选址下拉中 |
| **新增基地** | 种源/育苗/种植/采收 | 所有选址弹窗自动出现新基地 |
| **修改基地名** | 种植记录/采收记录 | 历史记录显示的名称自动更新 |
| **新增温室** | 种植/采收/巡检 | 温室选择下拉自动出现 |
| **新增仓库** | 采收入库/库存 | 入库仓库下拉自动出现 |
| **新增部门** | 人员管理/人工管理 | 部门下拉自动出现 |
| **调整部门层级** | 组织架构树 | 树形结构自动更新 |
| **停用部门** | 人员/任务 | 该部门不再出现在筛选条件中 |

#### 4.1.4 具体联动场景

**场景1：新增温室 → 种植选址弹窗自动更新**

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

**场景2：修改基地名 → 历史种植记录显示更新**

```typescript
// 设置模块：修改基地名
await baseService.updateBase('BJ001', { name: '松江基地（扩建）' });

// 自动触发：
// 1. SQLite 更新 bases.name
// 2. 由于 plantings 表存储的是 baseId（不是 baseName）
// 3. 种植页面显示时通过 JOIN 查询实时获取基地名
// 4. 所有历史记录的显示自动更新，无需修改历史数据
```

### 4.2 人员管理设置（人事驱动）

#### 4.2.1 模块结构

```
人员管理（PersonnelSettings.tsx）
├── Tab: 员工档案
│   ├── 员工列表（CRUD）
│   ├── 员工详情 → 基本信息/部门/职位/联系方式
│   ├── 入职/离职流程
│   └── 照片/证件管理
├── Tab: 职位管理
│   ├── 职位列表（CRUD）
│   ├── 职位详情 → 所属部门/级别/职责
│   └── 职位人数统计
├── Tab: 班组管理
│   ├── 班组列表（CRUD）
│   ├── 班组成员
│   └── 班次安排
├── Tab: 考勤规则
│   ├── 考勤制度
│   ├── 假期类型
│   └── 加班规则
└── Tab: 权限分配
    ├── 角色列表
    ├── 菜单权限
    └── 数据权限
```

#### 4.2.2 数据模型

```typescript
// 员工档案
interface Staff {
  id: string;
  code: string;           // 工号（如：A001）
  name: string;
  gender: 'male' | 'female';
  birthDate: string;
  idCard: string;
  phone: string;
  email: string;
  avatar: string;         // 照片URL
  departmentId: string;   // 关联 departments.id
  departmentName: string; // 冗余
  positionId: string;     // 关联 positions.id
  positionName: string;   // 冗余
  teamId: string;        // 关联 teams.id（班组）
  teamName: string;      // 冗余
  entryDate: string;      // 入职日期
  leaveDate: string;      // 离职日期（null为在职）
  status: 'active' | 'resigned' | 'on_leave' | 'suspended';
  createTime: string;
  updateTime: string;
}

// 职位
interface Position {
  id: string;
  code: string;
  name: string;
  departmentId: string;   // 关联 departments.id
  departmentName: string; // 冗余
  level: number;          // 级别（1-10）
  description: string;
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}

// 班组
interface Team {
  id: string;
  code: string;
  name: string;
  leaderId: string;       // 班组长ID → staff.id
  leaderName: string;     // 冗余
  members: string[];      // 成员ID数组
  shiftType: string;      // 班次类型
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}
```

#### 4.2.3 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增员工** | 全部业务弹窗 | 创建人/负责人/采收人/审核人 下拉新增选项 |
| **员工离职** | 全部业务 | 该员工不再出现在下拉中，但历史记录保留 |
| **员工调部门** | 人工管理/统计 | 部门统计自动更新，无需修改历史记录 |
| **新增职位** | 人员管理 | 员工档案"职位"下拉新增选项 |
| **新增班组** | 任务分派 | 任务可按班组批量分派 |
| **修改考勤规则** | 考勤计算 | 考勤统计自动按新规则计算 |

#### 4.2.4 具体联动场景

**场景3：新增员工 → 种源创建弹窗"创建人"自动可选**

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

**场景4：员工离职 → 历史记录保留但不再可选**

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
// 5. 或：历史记录通过 staffId JOIN 查询，显示"王建国（已离职）"
```

### 4.3 作物品种库设置（作物驱动）

#### 4.3.1 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增品种** | 种源/订单 | 作物选择级联下拉新增选项 |
| **修改品种名** | 种源/育苗/种植 | 显示名称自动更新（ID关联） |
| **停用品种** | 种源创建 | 该品种不再出现在选择中 |
| **新增作物类型** | 品种编码 | 编码生成规则自动扩展 |

### 4.4 供应商管理设置（采购驱动）

#### 4.4.1 数据模型

```typescript
interface Supplier {
  id: string;
  code: string;
  name: string;
  type: string;           // 种源/物料/设备/服务
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  qualification: string;  // 资质证书
  status: 'active' | 'inactive' | 'blacklisted';
  rating: number;         // 评分
  createTime: string;
  updateTime: string;
}
```

#### 4.4.2 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增供应商** | 种源采购 | 供应商下拉自动出现 |
| **供应商拉黑** | 采购单 | 该供应商不再出现在选择中 |
| **修改供应商信息** | 历史采购单 | 显示信息自动更新 |

### 4.5 物料管理设置（物料驱动）

#### 4.5.1 数据模型

```typescript
interface Material {
  id: string;
  code: string;
  name: string;
  category: string;       // 关联字典（肥料/农药/种子/工具/...）
  unit: string;           // 单位
  spec: string;           // 规格
  safetyStock: number;    // 安全库存
  currentStock: number;   // 当前库存
  warehouseId: string;    // 默认仓库
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}
```

#### 4.5.2 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增物料** | 领料/退料 | 物料下拉自动出现 |
| **修改物料名** | 历史领料单 | 显示名称自动更新 |
| **调整安全库存** | 库存预警 | 低于安全库存时自动预警 |

### 4.6 数据字典设置（枚举驱动）

#### 4.6.1 数据模型

```typescript
interface DictionaryCategory {
  id: string;
  code: string;           // 唯一标识（如：seed_source_status）
  name: string;           // 显示名称（如：种源状态）
  module: string;         // 所属模块（如：crop/warehouse/hr）
  description: string;
  status: 'active' | 'inactive';
}

interface DictionaryItem {
  id: string;
  categoryId: string;     // 关联 dictionary_categories.id
  code: string;           // 值（如：sufficient）
  name: string;           // 显示（如：充足）
  color: string;          // 标签颜色（如：green/red/yellow）
  sortOrder: number;
  status: 'active' | 'inactive';
}
```

#### 4.6.2 预置字典分类

```
┌─────────────────────────────────────────────────────────────────┐
│                     预置字典分类清单                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  作物管理                                                        │
│  ├── seed_source_status      种源状态（充足/不足/耗尽）           │
│  ├── seedling_status         育苗状态（进行中/可定植/已完成/异常）│
│  ├── planting_status         种植状态（已定植/生长期/已采收/取消）│
│  ├── harvest_grade           采收等级（A/B/C/特级）                │
│  ├── harvest_quality         采收品质（优/良/一般/差）           │
│  └── crop_instance_status    实例状态（育苗/定植/生长/采收/出库）│
│                                                                 │
│  订单管理                                                        │
│  ├── order_status            订单状态（待确认/已确认/生产中...）  │
│  └── payment_status          付款状态（未付/部分/已付/退款）      │
│                                                                 │
│  库存管理                                                        │
│  ├── warehouse_type          仓库类型（常温/冷藏/冷冻/气调）      │
│  ├── material_category       物料分类（肥料/农药/种子/工具）      │
│  └── inventory_status        库存状态（正常/临期/过期/损耗）      │
│                                                                 │
│  人工管理                                                        │
│  ├── staff_status            人员状态（在职/离职/请假/停用）      │
│  ├── leave_type              请假类型（病假/事假/年假/婚假）      │
│  ├── overtime_type           加班类型（平时/周末/节假日）         │
│  ├── attendance_status       考勤状态（正常/迟到/早退/缺勤）      │
│  └── approval_status         审批状态（待审批/已通过/已驳回）     │
│                                                                 │
│  组织架构                                                        │
│  ├── company_status          公司状态（正常/停业/注销）            │
│  ├── base_status             基地状态（正常/停用/筹建中）         │
│  ├── greenhouse_type         温室类型（玻璃/日光/薄膜/连栋）      │
│  ├── greenhouse_status       温室状态（正常/维修/停用/空闲）      │
│  └── department_status       部门状态（正常/撤销/合并）           │
│                                                                 │
│  系统通用                                                        │
│  ├── notification_type       通知类型（审批/任务/预警/公告）      │
│  ├── notification_channel    通知渠道（站内/邮件/短信/微信）       │
│  ├── task_priority           任务优先级（紧急/高/中/低）          │
│  ├── task_status             任务状态（待分配/进行中/已完成/逾期）│
│  └── system_log_type          日志类型（操作/登录/异常/安全）      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.6.3 联动影响矩阵（最关键）

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增字典项** | 全部关联页面 | 所有使用该字典的下拉框/筛选条件自动出现新选项 |
| **修改字典名** | 全部关联页面 | 显示名称自动更新 |
| **停用字典项** | 全部关联页面 | 该选项不再出现，但历史记录保留显示 |
| **修改字典颜色** | 全部关联页面 | 状态标签颜色自动更新 |

#### 4.6.4 具体联动场景

**场景5：新增"种源状态" → 全部种源页面自动更新**

```typescript
// 设置模块：新增字典项
await dictionaryService.addItem({
  categoryId: 'DC001',
  code: 'reserved',
  name: '预留',
  color: 'blue',
});

// 自动触发：
// 1. SQLite 插入 dictionary_items 记录
// 2. 前端 dictionaryCache 更新
// 3. 种源列表页的状态筛选下拉自动出现"预留"
// 4. 种源创建弹窗的状态选择自动出现"预留"
// 5. 种源统计卡片自动增加"预留数量"统计
// 6. 无需修改任何业务页面代码！
```

### 4.7 审批流程设置（流程驱动）

#### 4.7.1 数据模型

```typescript
interface ApprovalWorkflow {
  id: string;
  code: string;
  name: string;
  module: string;         // 关联模块（如：production/hr/purchase）
  description: string;
  triggerCondition: string; // 触发条件表达式
  status: 'active' | 'inactive';
  createTime: string;
  updateTime: string;
}

interface ApprovalNode {
  id: string;
  workflowId: string;     // 关联 approval_workflows.id
  nodeName: string;       // 节点名称（如：部门主管审批）
  sortOrder: number;      // 顺序
  approverType: 'role' | 'person' | 'department_head' | 'auto';
  approverRoleId: string; // 关联 roles.id（如果 approverType=role）
  approverId: string;     // 关联 staff.id（如果 approverType=person）
  departmentId: string;   // 关联 departments.id（如果 approverType=department_head）
  timeoutHours: number;   // 超时时间
  autoApproveOnTimeout: boolean;
  conditionExpression: string; // 条件表达式（如：amount > 5000）
}
```

#### 4.7.2 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增流程** | 对应模块 | 该模块业务自动触发新流程 |
| **修改节点** | 对应模块 | 审批路径自动更新 |
| **调整超时** | 对应模块 | 催办提醒按新时间触发 |
| **停用流程** | 对应模块 | 该业务不再触发审批 |

### 4.8 用户权限设置（权限驱动）

#### 4.8.1 数据模型

```typescript
interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  dataScope: 'all' | 'company' | 'department' | 'self'; // 数据权限范围
  status: 'active' | 'inactive';
}

interface Permission {
  id: string;
  code: string;           // 唯一标识（如：crop:seed_source:create）
  name: string;
  type: 'menu' | 'button' | 'api';
  parentId: string | null;
  path: string;           // 路由/按钮标识
  sortOrder: number;
}

interface RolePermission {
  roleId: string;
  permissionId: string;
}

interface UserRole {
  userId: string;
  roleId: string;
}
```

#### 4.8.2 权限矩阵设计

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

#### 4.8.3 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增角色** | 人员管理 | 员工档案"角色"下拉新增选项 |
| **分配权限** | 对应用户 | 该用户登录后菜单/按钮自动显隐 |
| **调整数据范围** | 对应用户 | 该用户能看到的记录自动变化 |
| **停用角色** | 对应用户 | 该用户自动降级为默认角色 |

### 4.9 通知设置（消息驱动）

#### 4.9.1 数据模型

```typescript
interface NotificationChannel {
  id: string;
  name: string;
  type: 'in-app' | 'email' | 'sms' | 'wechat' | 'push';
  enabled: boolean;
  config: Record<string, any>; // SMTP/短信API/企业微信等配置
}

interface NotificationRule {
  id: string;
  name: string;
  eventType: string;      // 事件类型（如：task.assigned）
  channelIds: string[];   // 使用哪些渠道
  recipientType: 'assignee' | 'creator' | 'manager' | 'role' | 'specific';
  recipientRoleId: string; // 关联 roles.id
  recipientIds: string[]; // 具体人员ID（如果 recipientType=specific）
  template: string;       // 消息模板
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
}
```

#### 4.9.2 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **新增规则** | 对应事件 | 该事件发生时自动发送通知 |
| **修改渠道** | 全部规则 | 使用此渠道的规则自动切换 |
| **修改模板** | 对应规则 | 发送的消息内容自动更新 |
| **停用规则** | 对应事件 | 该事件不再发送通知 |

### 4.10 系统配置（参数驱动）

#### 4.10.1 数据模型

```typescript
interface SystemConfig {
  id: string;
  configKey: string;      // 唯一键（如：task_accept_warning_hours）
  configName: string;     // 显示名称
  configValue: string;    // 值
  configType: 'string' | 'number' | 'boolean' | 'json';
  category: 'system' | 'business' | 'ui' | 'security';
  description: string;
  isEditable: boolean;    // 是否可后台修改
}
```

#### 4.10.2 从 taskConfig.ts 迁移的配置项

```typescript
// 当前硬编码在 src/config/taskConfig.ts
const OVERTIME_CONFIG = { ... }      // → system_configs: task_accept_warning_hours
const DEADLINE_CONFIG = { ... }      // → system_configs: task_max_extensions
const REMINDER_CONFIG = { ... }      // → system_configs: task_reminder_interval
const TASK_PERMISSIONS = { ... }     // → 权限系统
const STATUS_TRANSITIONS = { ... }   // → 数据字典
const REWORK_CONFIG = { ... }        // → system_configs: task_max_rework
```

#### 4.10.3 联动影响矩阵

| 设置操作 | 影响范围 | 联动效果 |
|---------|---------|---------|
| **修改超时阈值** | 任务系统 | 任务超时判断自动按新阈值 |
| **修改分页大小** | 全部列表页 | 列表自动按新分页显示 |
| **修改主题色** | 全部页面 | 主题自动切换（如果代码读取配置） |
| **启用/禁用功能** | 对应模块 | 功能按钮自动显隐 |

---

## 五、权限系统设计

### 5.1 RBAC 权限模型

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

### 5.2 权限分类

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

### 5.3 权限联动效果

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

## 六、数据字典驱动设计

### 6.1 字典驱动的核心思想

**所有状态、类型、分类不从代码读取，从数据库字典读取。**

```typescript
// ❌ 旧方式（硬编码）
const statusOptions = [
  { value: 'sufficient', label: '充足', color: 'green' },
  { value: 'low', label: '不足', color: 'yellow' },
  { value: 'depleted', label: '耗尽', color: 'red' },
];

// ✅ 新方式（字典驱动）
const statusOptions = await dictionaryService.getItems('seed_source_status');
// 返回：[{value:'sufficient',label:'充足',color:'green'}, ...]
// 新增状态时无需改代码！
```

### 6.2 字典使用规范

```typescript
// src/utils/dictionary.ts - 字典工具函数

/**
 * 获取字典项列表（带缓存）
 */
export async function getDictItems(categoryCode: string): Promise<DictItem[]> {
  // 1. 先查内存缓存
  const cached = dictCache.get(categoryCode);
  if (cached) return cached;
  
  // 2. 再查 IndexedDB/Dexie
  const items = await dexieDictService.getItemsByCategory(categoryCode);
  if (items.length > 0) {
    dictCache.set(categoryCode, items);
    return items;
  }
  
  // 3. 最后查 API
  const apiItems = await apiDictService.getItemsByCategory(categoryCode);
  dictCache.set(categoryCode, apiItems);
  await dexieDictService.saveItems(apiItems); // 同步到本地
  return apiItems;
}

/**
 * 获取字典项名称
 */
export async function getDictLabel(categoryCode: string, value: string): Promise<string> {
  const items = await getDictItems(categoryCode);
  return items.find(i => i.code === value)?.name || value;
}

/**
 * 获取字典项颜色
 */
export async function getDictColor(categoryCode: string, value: string): Promise<string> {
  const items = await getDictItems(categoryCode);
  return items.find(i => i.code === value)?.color || 'gray';
}
```

### 6.3 字典联动组件

```typescript
// src/components/common/DictSelect.tsx - 字典选择组件

interface DictSelectProps {
  categoryCode: string;    // 字典分类编码
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

### 6.4 字典在业务中的使用

```typescript
// 种源列表页 - 状态筛选
<DictSelect 
  categoryCode="seed_source_status" 
  value={filterStatus} 
  onChange={setFilterStatus}
  placeholder="选择种源状态"
/>

// 种源列表页 - 状态标签显示
function StatusTag({ value }: { value: string }) {
  const [label, setLabel] = useState(value);
  const [color, setColor] = useState('gray');
  
  useEffect(() => {
    getDictLabel('seed_source_status', value).then(setLabel);
    getDictColor('seed_source_status', value).then(setColor);
  }, [value]);
  
  return <Tag color={color}>{label}</Tag>;
}
```

---

## 七、数据迁移与关联补全方案

### 7.1 迁移策略：分阶段、可回滚

```
┌─────────────────────────────────────────────────────────────────┐
│                     迁移阶段图                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: 基础设置迁移（2周）                                      │
│  ├── 步骤1：补齐正规化 Schema（组织/人员/字典/配置）                │
│  ├── 步骤2：创建设置页面（CRUD完整）                                │
│  ├── 步骤3：预置基础数据（公司/基地/部门/人员/字典）                 │
│  └── 步骤4：验证设置页面可用                                       │
│                                                                 │
│  Phase 2: 业务数据关联化（2周）                                    │
│  ├── 步骤1：业务表添加关联字段（supplier_id/staff_id/warehouse_id）│
│  ├── 步骤2：数据清洗（字符串→ID映射）                               │
│  ├── 步骤3：前端弹窗改为下拉选择（从设置模块获取）                    │
│  └── 步骤4：验证业务模块正常                                       │
│                                                                 │
│  Phase 3: 硬编码消除（1周）                                        │
│  ├── 步骤1：替换所有硬编码数组为字典/设置查询                         │
│  ├── 步骤2：删除重复的 LocalStorage 实现                            │
│  ├── 步骤3：删除重复的页面文件                                     │
│  └── 步骤4：验证全部页面正常                                       │
│                                                                 │
│  Phase 4: 权限与流程（1周）                                         │
│  ├── 步骤1：实现 RBAC 权限系统                                      │
│  ├── 步骤2：实现审批流程引擎                                        │
│  ├── 步骤3：集成到业务模块                                         │
│  └── 步骤4：验证权限控制正常                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 数据清洗方案

#### 7.2.1 人员字符串 → ID 映射

```typescript
// 迁移脚本：清洗种源表的 createBy
async function migrateCreateBy() {
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

#### 7.2.2 仓库字符串 → ID 映射

```typescript
// 迁移脚本：清洗采收表的 warehouse
async function migrateWarehouse() {
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

### 7.3 关联补全清单

| 业务表 | 当前字段 | 新增关联字段 | 关联表 | 清洗方式 |
|--------|---------|------------|--------|---------|
| seed_sources | createBy: string | createById: string | staff | 人名匹配 |
| seed_sources | supplierName: string | supplierId: string | suppliers | 名称匹配 |
| seedlings | createBy: string | createById: string | staff | 人名匹配 |
| plantings | createBy: string | createById: string | staff | 人名匹配 |
| plantings | areaId: string | greenhouseId: string | greenhouses | 已有关联 |
| harvests | harvesterNames: string[] | harvesterIds: string[] | staff | 人名匹配 |
| harvests | auditor: string | auditorId: string | staff | 人名匹配 |
| harvests | warehouseName: string | warehouseId: string | warehouses | 名称匹配 |
| crop_orders | createBy: string | createById: string | staff | 人名匹配 |
| farm_activities | assignee: string | assigneeId: string | staff | 人名匹配 |
| approvals | applicant: string | applicantId: string | staff | 人名匹配 |
| approvals | approver: string | approverId: string | staff | 人名匹配 |

---

## 八、SQLite Schema 正规化改造

### 8.1 当前问题：data_json 反模式

```sql
-- ❌ 当前实现（反模式）
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  data_json TEXT,          -- 所有字段塞进JSON
  created_at TEXT,
  updated_at TEXT
);
-- 问题：无法SQL查询、无法建索引、无法外键关联、数据校验困难

-- ✅ 正规化改造
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT,
  manager_id TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (parent_id) REFERENCES departments(id),
  FOREIGN KEY (manager_id) REFERENCES staff(id)
);
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_departments_manager ON departments(manager_id);
CREATE INDEX idx_departments_status ON departments(status);
```

### 8.2 需要正规化的表

| 表名 | 当前状态 | 改造后 | 优先级 |
|------|---------|--------|--------|
| departments | data_json | 正规化字段 | P0 |
| positions | data_json | 正规化字段 | P0 |
| staff | data_json | 正规化字段 | P0 |
| company_groups | 部分正规化 | 补全字段 | P0 |
| bases | 部分正规化 | 补全字段 | P0 |
| greenhouses | data_json | 正规化字段 | P0 |
| warehouses | data_json | 正规化字段 | P0 |
| materials | data_json | 正规化字段 | P1 |
| system_configs | data_json | 正规化字段 | P1 |
| dictionaries | data_json | 正规化字段 | P1 |
| planting_modes | data_json | 正规化字段 | P1 |
| plant_areas | data_json | 正规化字段 | P1 |
| blocks | data_json | 正规化字段 | P1 |
| indicators | data_json | 正规化字段 | P2 |
| farm_activities | data_json | 正规化字段 | P2 |
| produce_inventories | data_json | 正规化字段 | P2 |
| attendance_records | data_json | 正规化字段 | P2 |
| ... | ... | ... | ... |

### 8.3 新增正规化表

```sql
-- 供应商表（新增）
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'seed',
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  qualification TEXT,
  rating REAL DEFAULT 5.0,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 角色表（新增）
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  data_scope TEXT DEFAULT 'self',
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- 权限表（新增）
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'menu',
  parent_id TEXT,
  path TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (parent_id) REFERENCES permissions(id)
);

-- 角色权限关联表（新增）
CREATE TABLE role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- 用户角色关联表（新增）
CREATE TABLE user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

---

## 九、前端联动架构设计

### 9.1 状态管理中心

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
  
  // 人员
  staffList: Staff[];
  positions: Position[];
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
  staffList: [],
  positions: [],
  teams: [],
  dictCache: new Map(),
  isLoading: false,
  lastLoadedAt: 0,
  
  // 加载所有设置数据
  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [companies, bases, greenhouses, plantAreas, warehouses, departments, staffList, positions, teams] = 
        await Promise.all([
          baseSettingsService.getCompanyGroups(),
          baseSettingsService.getBases(),
          plantingConfigService.getGreenhouses?.() || [],
          plantingConfigService.getPlantAreas?.() || [],
          warehouseService.getWarehouses(),
          organizationService.getDepartments(),
          organizationService.getStaffs(),
          organizationService.getPositions(),
          // teams...
        ]);
      
      set({
        companies, bases, greenhouses, plantAreas, warehouses,
        departments, staffList, positions, teams,
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

### 9.2 联动Hook设计

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

### 9.3 弹窗联动组件

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

### 9.4 全局刷新机制

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

## 十、实施路线图

### 10.1 总体时间表

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         6周实施路线图                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Week 1-2: Phase 1 - 基础设置层                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Day 1-2:  补齐正规化 Schema（组织/人员/字典/配置）               │   │
│  │ Day 3-4:  开发设置页面（组织架构/人员管理/数据字典）               │   │
│  │ Day 5-7:  开发设置页面（系统配置/审批流程/通知设置）               │   │
│  │ Day 8-10: 预置基础数据（2公司/10基地/5部门/20人员/全部字典）       │   │
│  │ Day 11-14: 测试验证 + 前端状态管理（Zustand）                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 3-4: Phase 2 - 业务关联层                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Day 15-16: 业务表加关联字段（supplier_id/staff_id/warehouse_id） │   │
│  │ Day 17-19: 数据清洗脚本（字符串→ID映射）                          │   │
│  │ Day 20-22: 改造业务弹窗（下拉选择从设置获取）                     │   │
│  │ Day 23-25: 改造列表页（显示名称从ID JOIN查询）                    │   │
│  │ Day 26-28: 测试验证                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 5: Phase 3 - 硬编码消除                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Day 29-31: 替换所有硬编码数组（departments/staffData/greenhouses）│   │
│  │ Day 32-33: 删除重复LocalStorage实现                                │   │
│  │ Day 34-35: 删除重复页面文件（7个文件）                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 6: Phase 4 - 权限与流程                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Day 36-38: 实现RBAC权限系统（角色/权限/数据范围）                  │   │
│  │ Day 39-40: 实现审批流程引擎                                       │   │
│  │ Day 41-42: 集成到业务模块                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 关键里程碑

| 里程碑 | 交付物 | 验收标准 |
|--------|--------|---------|
| M1（Week 2末） | 设置模块可用 | 组织架构/人员/字典/配置页面可CRUD，数据存SQLite |
| M2（Week 4末） | 业务联动可用 | 种源/育苗/种植/采收弹窗下拉从设置获取，ID关联 |
| M3（Week 5末） | 硬编码清零 | 全系统无硬编码数组，无重复文件 |
| M4（Week 6末） | 权限流程可用 | 角色分配控制菜单/按钮/数据，审批自动触发 |

### 10.3 风险控制

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 数据清洗丢失 | 中 | 高 | 迁移前全量备份，支持回滚 |
| 字符串匹配失败 | 高 | 中 | 未匹配项创建虚拟记录，人工复核 |
| 前端改造量大 | 高 | 中 | 分批改造，每批验证后再继续 |
| 性能下降 | 低 | 中 | 前端缓存+后端索引+分页加载 |
| 多标签不同步 | 中 | 低 | WebSocket推送或定期轮询 |

---

## 附录：完整表结构速查

### 设置模块表（16张）

| 表名 | 说明 | 关联 |
|------|------|------|
| company_groups | 公司 | - |
| bases | 基地 | company_groups.id |
| greenhouses | 温室 | bases.id |
| plant_areas | 种植区域 | greenhouses.id |
| warehouses | 仓库 | - |
| departments | 部门 | departments.id（自关联） |
| positions | 职位 | departments.id |
| staff | 员工 | departments.id, positions.id |
| teams | 班组 | staff.id（leader） |
| suppliers | 供应商 | - |
| materials | 物料 | warehouses.id |
| dictionary_categories | 字典分类 | - |
| dictionary_items | 字典项 | dictionary_categories.id |
| system_configs | 系统配置 | - |
| roles | 角色 | - |
| permissions | 权限 | permissions.id（自关联） |

### 业务模块关联字段速查

| 业务表 | 新增关联字段 | 来源 |
|--------|------------|------|
| seed_sources | create_by_id, supplier_id | staff.id, suppliers.id |
| seedlings | create_by_id, source_id | staff.id, seed_sources.id |
| plantings | create_by_id, source_id, greenhouse_id | staff.id, seedlings.id, greenhouses.id |
| harvests | harvester_ids, auditor_id, warehouse_id | staff.id[], staff.id, warehouses.id |
| crop_orders | create_by_id | staff.id |
| crop_instances | order_id | crop_orders.id |
| farm_activities | assignee_id, greenhouse_id | staff.id, greenhouses.id |
| approvals | applicant_id, approver_id | staff.id |

---

*方案完成时间：2026-05-02 08:30*  
*基于全量代码逐行分析，未修改任何文件*  
*版本：V2.0 联动增强版*
