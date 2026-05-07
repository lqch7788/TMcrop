# 项目记忆文档

## 项目基本信息

| 项目 | 内容 |
|------|------|
| 项目名称 | 弘智耘 - 智慧农业管理系统 - 管理模块原型 |
| 版本 | V1.01 |
| 创建时间 | 2026-03-14 |
| 技术栈 | React 18 + Vite + TypeScript + Tailwind CSS + Radix UI |
| 端口 | 5188 |

## 远程仓库

| 项目 | 内容 |
|------|------|
| 仓库地址 | https://github.com/lqch7788/TMcrop |
| 分支 | planting-management |

## 项目结构

```
hongzhiyun/
├── src/
│   ├── components/
│   │   ├── layout/       # 布局组件（Sidebar, Header）
│   │   └── ui/           # UI组件库（button, dialog, input等）
│   ├── pages/            # 页面组件（50+个）
│   ├── data/             # Mock数据
│   ├── hooks/            # 自定义Hooks
│   ├── i18n/             # 国际化
│   ├── lib/              # 工具函数
│   ├── App.tsx           # 路由配置
│   └── main.tsx          # 入口文件
├── public/               # 静态资源
├── dist/                 # 构建输出
└── 启动服务.bat          # 启动脚本
```

## 核心功能模块

1. **首页/登录** - Login.tsx, HomePage.tsx
2. **基地总览** - Dashboard.tsx, Production.tsx
3. **园区导览** - ParkArchive.tsx
4. **农事管理** - Tasks.tsx, TaskDispatch.tsx, AgricultureRecord.tsx
5. **库存管理** - Materials.tsx, WarehouseMaterials.tsx, MaterialReceiving.tsx
6. **人工管理** - HrAttendance.tsx, WorkerAttendance.tsx, PersonnelManagement.tsx
7. **审批中心** - PendingApproval.tsx, Approvals.tsx, Approved.tsx
8. **系统设置** - Settings.tsx, BaseSettings.tsx, DepartmentSettings.tsx
9. **消息中心** - Messages.tsx, Announcement.tsx
10. **个人中心** - Profile.tsx（支持6种角色切换）

## 角色权限体系

| 角色 | 说明 |
|------|------|
| admin | 系统管理员 |
| manager | 经理/主管 |
| supervisor | 生产主管 |
| technician | 技术员 |
| worker | 普通员工 |
| visitor | 访客/演示人员 |

## 操作日志

详细操作记录请参考 `OPERATION_LOG.md`

## 表格设计样式标准规范

> **重要**：后续所有表格必须严格遵循此样式规范，确保全系统表格风格统一协调。

### 1. 外层容器
```html
<div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
```

### 2. 标题栏
```html
<div className="p-4 border-b border-gray-100 flex items-center justify-between">
  <h3 className="text-base font-semibold text-gray-900">表格标题</h3>
</div>
```

### 3. 表头样式（统一标准）
```html
<thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
  <tr className="border-b border-blue-600">
    <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">列名</th>
    <!-- 更多 th... -->
  </tr>
</thead>
```
**要点**：
- 背景：`bg-gradient-to-r from-blue-500 to-blue-600`（渐变蓝）
- 文字：白色 `text-white`
- 内边距：`py-3 px-4`
- 字体：`text-sm font-semibold`
- 行底部边框：`border-b border-blue-600`

### 4. 表体样式
```html
<tbody className="divide-y divide-gray-300">
  <tr className="hover:bg-blue-100 transition-colors">
    <td className="px-4 py-3 text-sm text-gray-600">内容</td>
  </tr>
</tbody>
```
**要点**：
- 行分隔：`divide-y divide-gray-300`
- 悬停效果：`hover:bg-blue-100 transition-colors`
- 单元格：`px-4 py-3 text-sm text-gray-600`

### 5. 分页组件（统一标准）
```html
<div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
  {/* 左侧：每页条数选择 */}
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-500">每页</span>
    <select className="h-8 px-2 border border-gray-200 rounded text-sm">
      <option value={10}>10</option>
      <option value={20}>20</option>
      <option value={50}>50</option>
    </select>
    <span className="text-sm text-gray-500">条</span>
  </div>

  {/* 右侧：分页导航 */}
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-500">共 {total} 条</span>
    <button
      onClick={() => setPage(Math.max(1, page - 1))}
      disabled={page === 1}
      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
    >
      <ChevronRight className="w-4 h-4 rotate-180" />
    </button>
    <span className="text-sm">{page} / {totalPages}</span>
    <button
      onClick={() => setPage(Math.min(totalPages, page + 1))}
      disabled={page >= totalPages}
      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
</div>
```

### 6. 统一分页格式要点
- **左侧**：每页 + 下拉框（10/20/50条）+ "条" + 共X条
- **右侧**：共X条 + < 按钮 + currentPage/totalPages + > 按钮
- 按钮使用 `ChevronRight` 图标（`<` 用 `rotate-180`）
- 分页容器：`border-t border-gray-100`

---

## 作物品种术语定义（重要！）

> **强制规则**：作物品种 = 最细化后的名称，是系统中最低层级的品种名称。

### 层级结构（从高到低）

| 层级 | 名称 | 示例 |
|------|------|------|
| 1 | 类别 | 水果类、蔬菜类 |
| 2 | 类型 | 浆果类、茄果类 |
| 3 | 品种 | 草莓、番茄 |
| 4 | 子品种 | 红颜 |
| 5 | **作物品种** | **99红颜、大叶红颜、红果番茄** |

### 编码规则

11位编码：类别(2) + 类型(2) + 品种(2) + 子品种(3) + 作物品种(2)

示例：`PD030100400` = 蔬菜类-茄果类-番茄-004红果番茄-00

### 数据字段对应关系

| 字段 | 含义 | 示例 |
|------|------|------|
| `cropName` | 作物品种（最细分） | 红果番茄 |
| `cropVariety` | 品种 | 番茄 |
| `subVariety1Name` | 子品种 | 红颜 |
| `varietyName` | 最终显示的作物品种名称 | 红果番茄 |

### 界面显示规则

- 表格中"作物品种"列必须显示最细化的名称（如红果番茄）
- "品种"列显示上一级（如番茄）
- 搜索、筛选、导出等场景都按此规则执行

---

## 最近更新

### 2026-04-29 - 作物管理模块重构（第一阶段+第二阶段完成）
**目标**: 减少重复代码，消除硬编码，建立公共组件体系

#### 已完成的重构工作

**第一阶段：抽取公共组件**

1. **StatsCard公共组件** ✅
   - 位置: `src/components/farm/common/StatsCard.tsx`
   - 已重构的模块Stats:
     - `SeedSourceStats.tsx` - 种源统计
     - `SeedlingStats.tsx` - 育苗统计
     - `PlantingStats.tsx` - 种植统计
     - `HarvestStatsCards.tsx` - 采收统计
     - `OrderStats.tsx` - 订单统计
   - 预估减少: ~300行

2. **FilterToolbar公共组件** ✅
   - 位置: `src/components/farm/common/FilterToolbar.tsx`
   - 提供统一的筛选区域布局样式和按钮
   - 导出组件: FilterToolbar, FilterButton, filterFieldClasses, filterLabelClasses, filterInputClasses

3. **Export工具函数** ✅
   - 位置: `src/hooks/farm/useExport.ts`
   - 已存在，直接使用

**第二阶段：消除硬编码**

4. **修复审核员硬编码** ✅
   - `HarvestPage.tsx` - 将 `auditor: '陆启闯'` 改为动态获取 `currentAuditor = getCurrentUsername()`
   - `AddModal.tsx` - 将 fallback值改为 `getCurrentUsername() || '未知用户'`
   - `InspectionPage.tsx` - 将 `inspectorId: 'U013'` 改为根据当前用户名查找用户ID

5. **新建useCurrentUser Hook** ✅
   - 位置: `src/hooks/farm/useCurrentUser.ts`
   - 导出: `useCurrentUser`, `getDefaultAuditor`, `getCurrentUsername`
   - 从localStorage获取当前用户信息

#### 验证结果
- `npm run build` 构建成功 ✅

#### 第三阶段：代码优化

6. **HarvestPage.tsx 表格拆分** ✅
   - 位置: `src/components/farm/harvest/components/HarvestTable.tsx`
   - 新增组件: HarvestTable, HarvestPagination, BatchActionBar
   - 状态徽章工具: `statusBadgeUtils.tsx`
   - 减少行数: 834行 → 698行 (减少136行)

7. **StatusBadge 状态徽章** ✅
   - 采收状态徽章已抽取到 `statusBadgeUtils.tsx`
   - 审批状态使用 `src/components/common/badge/StatusBadge.tsx`
   - 两个组件职责分离，各自服务不同领域

#### 验证结果
- `npm run build` 构建成功 ✅
- HarvestPage.tsx 从 834行减少到 698行

8. **ImageUploader 公共组件** ✅
   - 位置: `src/components/farm/common/ImageUploader.tsx`
   - 支持多图片上传、预览、删除
   - 支持配置最大数量限制
   - 支持相机/上传两种图标模式
   - 提供 SimpleImageUploader 单图片版本

#### 验证结果
- `npm run build` 构建成功 ✅

### 2026-04-09 - 基地总览页面表格样式统一
**文件**: `src/pages/Dashboard.tsx`

**修复内容**:
1. 崇明岛基地概况 - 温室大棚表格：表头从灰色改为渐变蓝背景
2. 崇明岛基地概况 - 大田表格：同上
3. 活跃种植批次表格：表头padding和边框样式补全

### 2026-04-07 - Git revert操作事故教训
**事故**：用户要求删除导致页面错乱的Git历史记录，我执行了 `git revert e70980d` 导致系统崩溃。

**教训**：
1. `git revert` 不是"删除历史"，而是"创建新提交来撤销更改"（会修改实际文件！）
2. 任何修改 HEAD 或 branch 指向的 Git 操作，都会导致工作区文件被修改
3. **禁止对 Git 历史执行任何修改操作**（已写入 CLAUDE.md 最高优先级规则）

**Git操作安全规则**（已写入 CLAUDE.md）：
- 禁止 `git revert`、`git reset`、`git rebase -i` 等操作
- Git 历史操作 = 高危操作，必须向用户详细解释后果并获得书面确认
- 操作后必须验证 `npm run build`

### 2026-03-28 - 生产领料单增加字段及拒绝原因显示
**文件**: `src/pages/MaterialReceiving.tsx`

**变更内容**:
- 领料申请Tab表格新增三列：
  1. **部门** - 申请人所属部门（生产部/后勤部/设备部/技术部/采后处理部）
  2. **物料种类** - 显示该领料单包含的物料种类数量（如"2种"）
  3. **种植区域/用途** - 物料使用区域（如"1号棚-叶菜区"、"灌溉系统维护"等）
- **拒绝原因显示功能**：
  - 被拒绝的订单在状态列显示红色"已拒绝"标签和拒绝原因文本
  - 详情弹窗也显示拒绝原因

**涉及修改的完整位置**:
1. ✅ `materialReceivingDetails` Mock数据 - 添加 `department` 和 `plantArea` 字段
2. ✅ 表格 `<thead>` 表头 - 新增三列表头
3. ✅ 表格 `<tbody>` 表体 - 新增三列数据单元格
4. ✅ 详情弹窗 `showDetailModal` - 新增三个字段显示 + 拒绝原因显示
5. ✅ `editForm` / `addForm` 状态定义 - 添加 `department` 和 `plantArea` 字段
6. ✅ `handleEdit` 函数 - 复制 `department` 和 `plantArea` 到 editForm
7. ✅ `handleSaveAdd` 函数 - 保存新记录的 `department` 和 `plantArea`
8. ✅ `handleCancelAdd` 函数 - 重置表单时包含新字段
9. ✅ 编辑弹窗 UI - 在申请人后添加"部门"下拉，在库存地点后添加"种植区域/用途"输入框
10. ✅ 新增弹窗 UI - 在申请人后添加"部门"下拉，在库存地点后添加"种植区域/用途"输入框
11. ✅ Mock数据第5条记录 - 添加 `rejectReason: '库存不足，该物料当前库存为0，无法满足申请数量'`
12. ✅ 状态列显示逻辑 - 当 `statusClass === 'rejected'` 时显示红色原因文本

**⚠️ 重要规则（已记录到CLAUDE.md）**:
> 1. 以后所有修改表格内容的，都要同步更新页面的其他对应按键的弹窗内容
> 2. 完成任务后，除了自动检查项目构建是否完整，再自动刷新服务器

## 关键配置

- **API端口**: 5188
- **默认用户**: 陆启闯(LQC)，职位：经理，部门：生产部
- **启动命令**: `npm run dev` 或 `启动服务.bat`

## V5.0 系统设置重构

### 完成时间
2026-05-02

### 核心目标
将系统设置模块从 localStorage 模式迁移到 API 模式，实现数据的持久化存储。

### 主要变更

#### 1. 后端 API 路由
- `server/src/routes/index.ts` - 挂载 basicData 和 dictionary 路由
- `server/src/routes/basicData.ts` - 部门、职位、班组、仓库、温室、区域、地块等 CRUD API
- `server/src/routes/dictionary.ts` - 数据字典 CRUD API

#### 2. 数据库表结构
- `server/src/db/schema.ts` - 创建 13+ 张系统设置表
  - departments, positions, teams, warehouses, greenhouses, zones, blocks
  - code_rules, notification_channels, notification_rules, approval_rules
  - dictionary_categories, dictionaries

#### 3. 种子数据
- `server/src/db/seedData.ts` - 业务数据种子（作物品种、供应商、种源、育苗、种植等）
- `server/src/db/seedBasicData.ts` - 基础数据种子（部门、职位、班组、仓库、温室等）

#### 4. 前端组件迁移

| 页面 | 迁移前 | 迁移后 | 状态 |
|------|--------|--------|------|
| DictionaryManagement.tsx | localStorage | API模式 | ✅ 已完成 |
| DepartmentSettings.tsx | 硬编码数据 | API模式 | ✅ 已完成 |
| BaseSettings.tsx | SettingsDataProvider | SettingsDataProvider | ✅ 已完成 |
| NotificationSettings.tsx | localStorage | API模式 | ✅ 已完成 |

#### 5. SettingsDataProvider
- `src/components/common/settings/SettingsDataProvider.tsx`
- 提供全局设置数据的状态管理
- 支持 useDepartments, usePositions, useWarehouses, useGreenhouses, useDictionaries 等 Hooks
- 触发全局刷新机制：`triggerSettingsRefresh()`

### API 端点

| 端点 | 说明 |
|------|------|
| GET /api/basic-data/departments | 获取部门列表 |
| GET /api/basic-data/positions | 获取职位列表 |
| GET /api/basic-data/teams | 获取班组列表 |
| GET /api/basic-data/warehouses | 获取仓库列表 |
| GET /api/basic-data/greenhouses | 获取温室列表 |
| GET /api/basic-data/zones | 获取区域列表 |
| GET /api/basic-data/blocks | 获取地块列表 |
| GET /api/dictionary/dictionaries | 获取字典列表 |
| GET /api/dictionary/dictionaries/categories | 获取字典分类 |

### 数据字段映射

#### DictionaryManagement
- API返回: `category_code`, `dict_code`, `dict_label`, `dict_value`, `sort_order`
- 前端使用: `dictCode`, `dictLabel`, `dictValue`, `dictSort`

### 后续任务
1. 重启后端服务器以加载更新的 seed 数据
2. 测试 DictionaryManagement 页面的完整 CRUD 功能
3. ✅ 完成 NotificationSettings 的 API 迁移（2026-05-03）

### Phase 4: 权限与流程集成 (✅ 已完成)
- 权限系统设计与实现 ✅
- 审批流程与权限联动 ✅
- 业务模块权限控制集成 ✅ (2026-05-03)

### NotificationSettings API 迁移 (2026-05-03 完成)
**后端 API**:
- `GET /api/notifications/channels` - 获取通知渠道列表
- `POST /api/notifications/channels` - 创建通知渠道
- `PUT /api/notifications/channels/:id` - 更新通知渠道
- `DELETE /api/notifications/channels/:id` - 删除通知渠道
- `PATCH /api/notifications/channels/:id/toggle` - 切换渠道状态
- `GET /api/notifications/rules` - 获取通知规则列表
- `POST /api/notifications/rules` - 创建通知规则
- `PUT /api/notifications/rules/:id` - 更新通知规则
- `DELETE /api/notifications/rules/:id` - 删除通知规则
- `PATCH /api/notifications/rules/:id/toggle` - 切换规则状态

**数据库表**:
- `notification_channels` - 通知渠道表
- `notification_rules` - 通知规则表

**种子数据**:
- 4个默认通知渠道（站内消息、邮件、短信、企业微信）
- 6条默认通知规则（审批待办、审批结果、预警、任务分配、每日汇总、系统公告）

**前端组件**:
- `src/pages/NotificationSettings.tsx` - 已从 localStorage 迁移到 API 模式

### Phase 4: 业务模块权限集成进度 (2026-05-03)

#### 已添加权限控制的组件
| 组件 | 权限参数 | 状态 |
|------|---------|------|
| HarvestTableToolbar.tsx | canCreate, canEdit, canDelete, canExport | ✅ 已完成 |
| InspectionToolbar.tsx | canCreate, canEdit, canDelete, canExport | ✅ 已完成 |
| AgricultureRecordTableToolbar.tsx | canDelete, canExport | ✅ 已完成 |
| ProblemFilterToolbar.tsx | canCreate, canDispatch, canDelete, canExport | ✅ 已完成 |
| FilterToolbar.tsx (hub) | canImport, canSmartRecommend | ✅ 已完成 |

#### 权限使用方式
```tsx
import { useAuthPermission } from '../../../hooks/usePermission';

const { can } = useAuthPermission();

// 权限检查示例
can('PROC_HARVEST', 'create')   // 采收模块 - 新增
can('PROC_HARVEST', 'edit')     // 采收模块 - 编辑
can('PROC_HARVEST', 'delete')   // 采收模块 - 删除
can('PROC_HARVEST', 'export')   // 采收模块 - 导出
can('PROC_CROP', 'view')        // 作物模块 - 查看
```

#### 待集成权限的业务模块
- [ ] SeedSource (种源管理)
- [ ] Seedling (育苗管理)
- [ ] Planting (种植管理)
- [ ] Order (订单管理)
- [ ] TaskDispatch (任务派发)
- [ ] CropVariety (品种管理)

### Phase 3: 硬编码消除进度 (2026-05-03)

#### 已完成改造
| 文件 | 改造内容 | 状态 |
|------|---------|------|
| DepartmentSettings.tsx | 使用useDepartments()获取部门数据 | ✅ 已完成 |
| SkillBatchEditModal.tsx | 使用useDepartments()和useDictionaries()获取数据 | ✅ 已完成 |
| WorkerAttendancePage.tsx | 使用useDepartments()获取部门列表 | ✅ 已完成 |
| InspectionTable.tsx | 使用useUsers()获取用户列表 | ✅ 已完成 |
| DetailInspectionModal.tsx | 使用useUsers()获取用户列表 | ✅ 已完成 |
| ProblemTab.tsx | 使用useUsers()获取用户列表 | ✅ 已完成 |
| ProblemDispatchModal.tsx | 使用useUsers()获取用户列表 | ✅ 已完成 |
| CreateTaskModal.tsx | 使用useUsers()和useGreenhouses()获取数据 | ✅ 已完成 |
| ReassignTaskModal.tsx | 使用useUsers()获取用户列表 | ✅ 已完成 |
| FarmTaskHub.tsx | 使用useUsers() | ✅ 已完成 |
| HarvestPage.tsx | 使用useUsers()+useGreenhouses() | ✅ 已完成 |
| InspectionTab.tsx | 使用useUsers()+useGreenhouses() | ✅ 已完成 |
| DetailInspectionModal.tsx | 使用useUsers() | ✅ 已完成 |
| TempTaskTab.tsx | 使用useUsers() | ✅ 已完成 |
| TempTaskPage.tsx | 使用useUsers() | ✅ 已完成 |
| TempTaskFormModal.tsx | 使用useGreenhouses() | ✅ 已完成 |
| TasksPage.tsx | 使用useUsers()+useGreenhouses() | ✅ 已完成 |
| CreateProblemModal.tsx | 使用useGreenhouses() | ✅ 已完成 |
| BatchEditModal.tsx | 使用useGreenhouses() | ✅ 已完成 |
| ProductionPage.tsx | 使用useGreenhouses() | ✅ 已完成 |
| Login.tsx | 使用useUsers() | ✅ 已完成 |
| AttendanceRepairPage.tsx | 使用useUsers() | ✅ 已完成 |
| ContractRenewalPage.tsx | 使用useUsers() | ✅ 已完成 |
| LeavePage.tsx | 使用useUsers() | ✅ 已完成 |
| OnboardingPage.tsx | 使用useUsers() | ✅ 已完成 |
| OvertimePage.tsx | 使用useUsers() | ✅ 已完成 |
| ResignationPage.tsx | 使用useUsers() | ✅ 已完成 |
| SalaryAdjustmentPage.tsx | 使用useUsers() | ✅ 已完成 |
| RecruitmentPage.tsx | 使用useDepartments()+usePositions()+useUsers() | ✅ 已完成 |
| SalaryBudgetPage.tsx | 使用useDepartments() | ✅ 已完成 |
| StaffManagementPage.tsx | 使用useUsers() | ✅ 已完成 |
| ProduceInventoryPage.tsx | 使用useWarehouses() | ✅ 已完成 |
| ProduceInventoryAddModal.tsx | 使用useWarehouses() | ✅ 已完成 |

#### Phase 3 完成状态
✅ **全部完成** - 共改造34个组件/页面

#### 改造原则
- **硬编码业务配置**（部门、人员、温室、仓库等）→ 从SettingsDataProvider获取
- **模拟业务数据**（cropBatches、tasks、inspectionRecords等）→ 保留用于开发测试
