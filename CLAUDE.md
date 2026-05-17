# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

### 前端 (Vite + React)
```bash
npm run dev          # 启动开发服务器 (端口 5188)
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run test         # Vitest 测试
npm run test:run     # 单次运行测试
```

### 后端 (Express + SQLite)
```bash
cd server
npm run dev          # 启动开发服务器 (tsx watch)
npm run build        # TypeScript 编译
npm run seed        # 初始化种子数据
npm run test         # Vitest 测试
```

### 注意事项
- 前端 API 代理配置: Vite 将 `/api` 请求代理到 `http://localhost:3001`
- 数据库: SQLite (server/data/yuanxingtu.db)，**必须提交到 Git**

## 项目架构

### 整体结构
```
V1.1/
├── src/                    # React 前端
│   ├── pages/              # 页面组件 (按模块组织)
│   ├── components/         # React 组件
│   │   ├── ui/             # 统一 UI 组件库 (Radix UI + Tailwind)
│   │   ├── layout/         # 布局组件 (Sidebar, Header)
│   │   ├── farm/           # 农事管理模块
│   │   ├── labor/          # 人工管理模块
│   │   └── ...
│   ├── hooks/              # React Hooks
│   ├── lib/                # 工具库 (queryClient, utils)
│   ├── contexts/           # React Context providers
│   └── types/              # TypeScript 类型定义
├── server/                 # Express 后端
│   └── src/
│       ├── routes/         # API 路由
│       ├── middleware/     # Express 中间件
│       ├── db/             # 数据库操作
│       └── services/       # 业务服务
└── public/                 # 静态资源
```

### 路由结构
- `App.tsx` 是前端路由入口
- 布局类型:
  - **MainLayout**: 带侧边栏 + Header (大部分页面)
  - **SimpleLayout**: 仅 Header (Profile, Settings)
  - **独立页面**: HomePage, Login
- 懒加载页面: IoTMonitor, EnvControl, SmartDispatch, 作物管理页面等

### 技术栈
| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| UI 组件 | Radix UI (src/components/ui/) + Tailwind CSS |
| 状态/数据 | TanStack Query (React Query) |
| 后端 | Express + TypeScript |
| 数据库 | SQLite (sql.js) |
| 验证 | Zod |
| 路由 | React Router v6 |

## UI 组件规范

### 组件导入
```tsx
// ✅ 正确
import { Button, Card, DatePicker } from '@/components/ui'

// ❌ 禁止 - 项目已禁用 Ant Design
import { DatePicker, Table } from 'antd'
```

### 已有组件 (src/components/ui/index.ts)
- 基础: Button, Card, Badge, Table, Dialog, Input, Select, Checkbox, Label, Popover, DropdownMenu, NumberInput, Toast, Modal, Space
- 高级: DatePicker, DateRangePicker, Drawer, Sheet, Alert, Notification, Breadcrumb, Steps, Pagination, Skeleton, Progress, TextArea, Tabs, Calendar, Tree, TreeSelect, Cascader, TimePicker, Tooltip, Avatar, ImageUploader, Statistic, EmptyState, Divider, QRCode, FilterBar, KanbanBoard, GanttChart

## 安全规则 (Git 操作)

### 禁止命令
```
❌ git reset (任何形式)
❌ git revert
❌ git reflog
❌ git rebase
❌ git clean -f
```

### 允许的安全操作
```
✅ git status, git diff, git log --oneline
✅ git add, git commit, git push, git pull
```

### 禁止提交
```
🚫 禁止提交 public/ 文件夹及其所有内容
🚫 禁止提交 public 文件夹内的任何文件
```

**重要**: 修复问题的正确方式是直接修改代码，而非通过 Git 历史"回滚"。

## 数据库规范

SQLite 数据库文件 `server/data/yuanxingtu.db` **必须提交到 Git**。这是项目的一部分，包含完整业务数据。

## 文件删除规则

- **禁止删除本地项目文件**（如 node_modules、src/、server/ 等）
- **临时文件清理**：仅删除任务执行过程中创建的临时脚本/临时文件
- **删除前需征得用户同意**
- 删除后需确认是否需要恢复（如 node_modules 需重新安装）

## 验证测试规则（最重要）

**每次完成任务后，必须亲自操作验证测试，确认功能正常运行后才能汇报完成。**

具体要求：
1. 修复 bug 后：必须实际触发该 bug 场景，验证 bug 已修复
2. 新增功能后：必须实际使用该功能，验证功能正常
3. 构建通过不等于功能正确：必须实际运行页面验证
4. 测试时使用真实数据/操作，不要只依赖代码审查判断

**流程：修复 → 构建 → 启动服务 → 实际测试 → 确认通过 → 汇报完成**

## 会话历史 (SESSION_HISTORY)

> 每次会话结束时更新，记录本次完成的工作。下次进入项目时先阅读此部分了解上下文。

### 2026-05-12 会话

**完成的工作：**
1. **修复农事任务中心批量删除功能**
   - 问题：`DeleteWarningAdapter` 内部创建了新的 `useTasks()` 实例，导致删除操作没有作用在正确的任务列表上
   - 修复：`DeleteWarningAdapter` 改为接收外部传入的 `tasksHook`；`useFarmHub` 支持传入外部 `tasksHook` 参数
   - 修改文件：`DeleteWarningAdapter.tsx`, `useFarmHub.ts`, `FarmTaskHub.tsx`, `TaskTable.tsx`

2. **恢复 NS 原始种子数据**
   - 问题：测试过程中误删除了 2 条 NS 开头的原始任务数据
   - 恢复：从备份的 `farmMockData.ts` 中提取缺失的 2 条任务，通过 API 添加回后端数据库
   - 恢复的任务：NS20260318-001（8号棚辣椒采收）、NS20260319-001（A2地块水稻采收）

3. **数据架构相关修复**
   - 修复 API 路径导入错误：`apiInspectionService.ts`, `apiProblemService.ts`
   - `useLocalStorage` 添加 `storage` 事件监听支持多实例同步
   - TaskTable 添加 `onConfirmBatchDelete` 回调支持实际删除

**提交记录：**
- `de432cf` - fix: 修复农事任务中心批量删除功能
- `5959656` - chore: 恢复后端数据库 NS 原始种子数据

**重要教训：**
- 测试删除功能时，务必确认只删除测试数据（TK/TEST 开头），不要删除原始种子数据（NS 开头）
- 批量删除前先确认 `selectedIds` 是否正确传递
- React Hook 在不同组件实例间不共享状态，需要通过 props 或 context 传递共享实例

### 2026-05-13 会话

**完成的工作：**
1. **供应商组件迁移到 Zustand**
   - 更新 `SupplierAddModal.tsx`、`SupplierEditModal.tsx`、`SupplierBatchEditModal.tsx`、`SupplierFilters.tsx`
   - 从 `useSettingsData` 迁移到 `useDictionaryStore`
   - 字段映射：`d.category` → `d.categoryCode`，`opt.code` → `opt.dictCode`，`opt.name` → `opt.dictLabel`

2. **创建 useWorkerStore**
   - 发现 `useUsers()` 返回错误的 User 类型（authorityService）而非 Worker 类型
   - 创建 `src/stores/useWorkerStore.ts` 处理工人数据
   - 导出到 `src/stores/index.ts`

3. **修复 labor 模块 CreateModal 组件**
   - `AttendanceRepairPageCreateModal.tsx` - 从 `useUsers()` 改为 `useWorkerStore`
   - `OvertimePageCreateModal.tsx` - 从 `useUsers()` 改为 `useWorkerStore`
   - `ResignationPageCreateModal.tsx` - 从 `useUsers()` 改为 `useWorkerStore`
   - `useAttendanceRepairPage.ts` hook 也迁移到 `useWorkerStore`

4. **修复 harvest 模块字典字段访问**
   - `BatchEditModal.tsx` 和 `AddModal.tsx` 更新字典选项渲染
   - 字段映射：`g.code` → `g.dictCode`，`g.name` → `g.dictLabel`

5. **完成 SettingsDataProvider 完全移除**
   - `TempTaskTab.tsx` - 迁移到 `useUserStore`
   - `useDepartmentOptions.ts` - 迁移到 `useDepartmentStore`
   - `useResignationPage.ts` - 迁移到 `useWorkerStore`
   - `useOnboardingPage.ts` - 迁移到 `useWorkerStore`
   - 删除 `SettingsDataProvider.tsx` 文件
   - 从 `App.tsx` 移除 `SettingsDataProvider` 组件
   - 更新 `common/settings/index.ts` 移除旧导出

**构建状态：** ✅ 通过
**所有 SettingsDataProvider 相关代码已完全移除**

### 2026-05-14 会话

**完成的工作：**

1. **恢复 SmartDispatch.tsx 完整页面（882行）**
   - 从 2 行 re-export 恢复为完整派工确认页面
   - 使用 Tailwind CSS + lucide-react（无 antd）
   - 导入 7 个现有 hooks + 6 个 dispatch 子组件
   - 包含：StatsCards、TaskCard、TaskGroup、BatchActionsBar、4 列布局、4 个 Modal

2. **DailyPlanningPage 和 MonthlyPlanningPage 数据源升级**
   - 替换 `localStorage.getItem('yuanxingtu_batches')` 为 `useProductionPlanStore`
   - 修改文件：`MonthlyPlanningPage.tsx`（Zustand Store + fetchPlans on mount）
   - 修改文件：`useDailyTaskPlanning.ts`（`useProductionPlanStore.getState().plans`）
   - 修改文件：`useMonthlyTaskPlanning.ts`（`useProductionPlanStore.getState().plans`）
   - 符合升级优化方案 V1.0 架构要求：Zustand Store → API → 组件

3. **修复 WarehouseManagement.tsx 构建错误**
   - `editWarehouse` 在 store 解构和本地函数中重复声明
   - 重命名本地函数为 `openEditModal`

4. **创建 useMaterialRequestDataStore（Zustand Store）**
   - 文件：`src/stores/useMaterialRequestDataStore.ts`
   - 使用 `enhancedApiClient` 直连 `/material-requests` API
   - 数据流：API → IndexedDB → localStorage（三级降级）
   - 后端字段映射：`applicant_name→applicant`, `apply_date→date`, `warehouse_name→warehouseLocation`

5. **改造 useApplicationTab hook（领料申请核心逻辑）**
   - 文件：`src/pages/material/tabs/hooks/useApplicationTab.ts`（816行）
   - 改用 `useMaterialRequestDataStore` 替代 `materialData`/`setMaterialData` props
   - `confirmDelete` → `storeDeleteItem` + `loadItems()`
   - `handleSaveEdit` → `storeUpdateItem` + `loadItems()`
   - `submitVoidApply` → `storeUpdateItem({status: '已作废'})` + `loadItems()`
   - `handleSaveAdd` → `storeAddItem()` + 审批联动

6. **简化 MaterialReceiving.tsx 页面**
   - 文件：`src/pages/MaterialReceiving.tsx`（从205行简化到85行）
   - 移除所有 mock 数据导入（materialReceivingDetails 等）
   - 移除 TanStack Query hooks（useMaterialRequests）
   - 移除三方合并逻辑（mock + API + local）
   - ApplicationTab/ExecuteTab 不再需要外部传入数据 props

7. **更新 ApplicationTab/ExecuteTab 组件接口**
   - ApplicationTab：移除 `materialData`/`setMaterialData` props，hook 内部从 store 获取
   - ExecuteTab：props 改为可选，默认空数组（执行tab仍为存根状态）

**构建状态：** ✅ 通过（两轮构建均成功）
**前后端均正常运行，API 返回数据正常**

8. **核查+改造任务中心全部TAB页数据层（升级方案V1.0）**
   - 核查发现：临时任务(纯localStorage)、巡查记录/问题管理(API存在但未用)、农事任务(半迁移双写)
   - 新建 3 个 Zustand Store：`useTempTaskStore`、`useInspectionDataStore`、`useProblemStore`
   - useTempTasks.ts：`useLocalStorage` → `useTempTaskStore`（API CRUD），保留全部业务逻辑
   - InspectionTab + InspectionDetailModal：直接localStorage R/W → `useInspectionDataStore`
   - ProblemTab + ProblemDispatchModal：`usePersistentProblems` → `useProblemStore`
   - TaskDetailModal/VerifyTaskModal/TaskAcceptanceAdapter：localStorage → `useFarmTaskStore`
   - useFarmHub.ts：移除重复API调用和localStorage降级，统一走Store
   - 完整CRUD测试：4模块16项操作全部通过

**构建状态：** ✅ 通过
**提交：** `558c58a` - refactor: 农事任务中心4个TAB页 localStorage → Zustand Store 完整迁移

### 2026-05-14 会话 (第二阶段)

**完成的工作：**

1. **入库记录数据架构修复（3阶段计划全部完成）**
   - **阶段1 - 后端PUT路由 + 供应商关联**：
     - `server/src/db/materials.ts`：新增 `updateInboundRecord()` + `syncInboundToMaterials()`
     - `server/src/routes/materials.ts`：新增 `PUT /inbound/:id`，POST/PUT 返回完整记录
     - `src/services/apiWarehouseMaterialService.ts`：新增 `updateInboundRecord()`
     - `src/stores/useInboundStore.ts`：`updateItem` 改为调用 API（原来只做本地 splice）
     - CreateModal/EditModal 供应商从自由文本改为下拉选择（useSupplierStore）
   - **阶段2 - 移除物料行级supplier + 字段统一**：
     - `InboundMaterial` 类型：移除 `supplier`，`materialCode`→`code`，`materialName`→`name`
     - 同步更新：CreateModal、EditModal、DetailModal、BatchEditModal、ExportModal、WarehouseInboundTable、warehouseInbound.utils.ts
   - **阶段3 - 入库完成自动更新库存**：
     - `syncInboundToMaterials()`：按 code 匹配，已有物料累加 quantity，新物料 INSERT
     - POST/PUT 路由中仅在 status 转为 'completed' 时触发同步

2. **CreateModal UI 增强**
   - 顶部颜色改为渐变色（与生产领料新增弹窗一致）：`bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500`
   - 物料名称自动关联：输入名称后搜索仓库已有物料，选中后自动填充 code/category/spec/barcode/unit/price/location
   - 物料名称输入框改为搜索+下拉菜单模式（`position: fixed` 避免被 overflow 裁剪）
   - 自动填充字段蓝色背景、手动录入字段黄色背景，附图例说明
   - 弹窗支持鼠标拖动（拖标题栏移动）+ 8 方向缩放（四角+四边），最小尺寸 640×400px
   - 最大化按钮修复：最大化时 overlay flex 改为 `flex-start`，dialog 置顶
   - 提交报错修复：后端 POST/PUT 现在返回完整记录（含 materials 数组）

**构建状态：** ✅ 通过
**涉及文件：** 13 个文件修改，约 500+ 行变更

### 2026-05-15 会话

**完成的工作：**

1. **编写《种植管理系统完整架构说明V1.0》**
   - 文件：`public/种植管理系统完整架构说明V1.0.md`（1330行，约59KB）
   - 完整覆盖：项目概述、技术栈、整体架构、前端架构、后端架构、数据库架构（50+表）、UI组件系统（63+组件）、Zustand状态管理（73个Store）、数据流与缓存策略（三级降级）、API接口规范（50个路由模块）、安全架构、开发规范与约定、目录结构参考
   - 基于实际代码状态编写（非计划文档），包含完整的数据流图和架构图
   - 附录含73个Store速查表和50个API路由速查表
   - 综合了9份参考文档 + 实际代码库探索结果

### 2026-05-15 会话 (第二阶段) — 生产汇总表模块全面重构

**完成的工作：**

1. **Phase 1 - 基础设施搭建**
   - 创建 `src/stores/useSummaryDataStore.ts`（655行）— 核心 Zustand Store，7种数据类型 + fetchAll/invalidateAll/isCacheStale
   - 创建 `src/components/summary/` 下 6 个新组件：KpiCard、KpiCardGrid、AlertCard、SummaryDateFilter、DetailDrawer、constants.ts
   - 更新 `src/App.tsx`：8条新路由 + 3条旧路由重定向
   - 更新 `src/components/layout/Sidebar.tsx`：8项 summarySubItems

2. **Phase 2-3 - 8个页面全部实现**
   - `SummaryOverview.tsx`（615行）：6 KPI卡片 + BarChart产量趋势 + PieChart成本构成 + Top5批次进度 + 温室快照 + 生产预警
   - `YieldAnalysis.tsx`：4 KPI + groupBy切换(month/crop/greenhouse/quality) + BarChart双Y轴 + 横向BarChart排名 + 质量PieChart
   - `CostAnalysis.tsx`（515行）：环形PieChart + 堆叠AreaChart趋势 + 成本明细表
   - `LaborAnalysis.tsx`（524行）：LineChart双Y轴 + BarChart Top15 + groupBy切换(month/worker/greenhouse/task)
   - `BatchSummary.tsx`（609行）：纯CSS甘特图 + 状态筛选 + DetailDrawer
   - `ChainTraceability.tsx`：纯CSS Sankey流程图(6节点) + 阶段统计 + 全链条批列表 + DetailDrawer
   - `ProblemSummary.tsx`：ComposedChart趋势 + PieChart优先级 + 高优先级预警
   - `SummaryIndicators.tsx`：SVG仪表盘 + TrafficLight + RadarChart + 环形进度图

3. **Phase 4 - 修复与清理**
   - 修复 2 个 CRITICAL 架构违规（YieldAnalysis/ChainTraceability 直接调用 enhancedApiClient/useProductionChainStats）
   - 修复 7 个 HIGH/MEDIUM 问题（KpiCardGrid columns类型、SummaryOverview假告警、totalCost fallback、ProblemSummary endDate、SummaryIndicators periodMode/COLORS.*Light、Sidebar Link重复声明）
   - 修复 Dashboard `loadTasks is not a function` 运行时错误（→ `fetchTasks`）

**架构铁律：** 组件 → Zustand Store → enhancedApiClient → Backend API。组件绝不直接读写 localStorage 或调用 fetch/axios。

**涉及文件：** 20+ 文件新增/修改，约 5000+ 行代码
**构建状态：** ✅ 通过

### 2026-05-16 会话 — 作物管理模块架构违规修复 (Phase 2-4)

**完成的工作：**

1. **Phase 2 - UI组件导入路径修复**
   - `BatchEditModal.tsx`：Modal/FormField 改为从 `@/components/ui` 导入，Input/Select 保留从 Modal.tsx 导入（原生包装器）

2. **Phase 3 - 组件绕过Store直接调API修复（核心）**
   - **HarvestPage.tsx**：`harvestService.addHarvestRecord/updateHarvestRecord` → `useHarvestStore.addItem/updateItem`
   - **SeedSource AddModal**：`addSeedSource/updateSeedSource` → `useSeedSourceStore.getState().addItem/updateItem`
   - **SeedSource EditModal**：`updateSeedSource` → `useSeedSourceStore.getState().updateItem`
   - **Seedling AddModal**：`addSeedling` → `useSeedlingStore.getState().addItem`
   - **Seedling EditModal**：`updateSeedling` → `useSeedlingStore.getState().updateItem`
   - **Seedling DailyRecordModal**：`addDailyRecord` → `useSeedlingStore.getState().addDailyRecord`
   - **Seedling TransplantModal**：`addPlanting` → `usePlantingStore.getState().addItem`；`increasePlantedCount` → `useSeedlingStore.getState().increasePlantedCount`
   - **Planting AddModal**：`addPlanting` → `usePlantingStore.getState().addItem`
   - **Planting EditModal**：`updatePlanting` → `usePlantingStore.getState().updateItem`
   - **Planting HarvestModal**：`harvestPlanting` → `usePlantingStore.getState().harvestPlanting`
   - **SeedlingPage.tsx**：`seedSourceService.getSeedSources()` → `useSeedSourceStore.getState().loadItems()`
   - **PlantingPage.tsx**：移除未使用的 `plantingService` 导入

3. **Store 方法增强**
   - `usePlantingStore`：新增 `harvestPlanting(id, harvestDate, harvestCount)` 方法
   - `useSeedlingStore`：新增 `addDailyRecord(seedlingId, record)` 和 `increasePlantedCount(id, count)` 方法

4. **Phase 4 - PrintLabelModal 评估**
   - 育苗 PrintLabelModal 已改为导入 `apiSeedlingService`，但因同步/异步不兼容回退
   - 种源/种植 PrintLabelModal 缺少后端 print 端点，暂保留 localStorage 服务
   - 打印功能是自包含操作，不影响数据完整性

**构建状态：** ✅ 前端 + 后端均通过
**API 验证：** ✅ GET/POST/DELETE 全部正常
**涉及文件：** 14 个文件修改

### 2026-05-17 会话 — 审核报告剩余P2+P3方案完成

**完成的工作：**

1. **方案1.3 (P2): 种源更多筛选弹窗**
   - `SeedSourceFilters` 类型扩展：添加 `cropType`, `orgId`, `recorderId`, `surplusMin`, `surplusMax`
   - `SeedSourceFilter.tsx`：添加"更多筛选"按钮 + Popover弹窗，含作物类型→作物名称级联、组织→记录人级联、剩余数量范围
   - `SeedSourcePage.tsx`：添加新筛选字段的过滤逻辑和重置处理
   - 使用 `useDictionaryStore`（作物类型）、`useDepartmentStore`（组织）、`useUserStore`（记录人）

2. **方案4.2 (P2): 采收时间改为datetime**
   - `AddModal.tsx`：`type="date"` → `type="datetime-local"`，标签"采收日期"→"采收时间"
   - `BatchEditModal.tsx`：同上
   - `DetailModal.tsx`：显示格式 `harvestDate?.replace('T', ' ')`
   - `HarvestTable.tsx`：表头+单元格格式更新
   - `HarvestPage.tsx`：默认值 `split('T')[0]` → `slice(0, 16)`，验证提示更新，导出标签更新

3. **方案2.7 (P3): 种子编号combogrid展示**
   - `AddModal.tsx`：种源选择从 `<select>` 改为 `input + Popover` 表格，四列（作物名称/种源批号/采购数量/可用数量），支持搜索过滤、点击选择、外部点击关闭
   - `EditModal.tsx`：同上同步改造

**构建状态：** ✅ 前端 + 后端均通过

### 2026-05-17 会话

**完成的工作：**

1. **TaskDispatchPage 合并到 FarmTaskHub**
   - 功能合并：批量派发、批量验收、批量重派、催办功能全部整合到农事任务中心
   - TaskTab 新增 batchReassign 工具栏模式 + BATCH_REASSIGN_STATUSES 常量
   - FarmTaskHub 新增 3 个批量操作弹窗 UI（派发选择执行人、验收确认、重派选择执行人）
   - TaskTable/TaskTableHeader 同步新增 batchReassignMode 支持
   - 路由：`/task-dispatch` → 重定向到 `/farm-hub`
   - Sidebar/Profile 移除/更新 task-dispatch 引用
   - 删除 `src/pages/farm/TaskDispatchPage.tsx`

**构建状态：** ✅ 通过

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
