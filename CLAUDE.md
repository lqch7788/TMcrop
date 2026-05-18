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

2. **修复新建任务后列表只显示任务ID、其他字段全空白**
   - 根因：后端 `POST /farm-tasks` 只返回 `{ id: newId }`，Store 的 `addTask` 用 API 返回的 `{ id }` 替换完整的本地乐观数据
   - 修复1：后端 POST 创建后查询完整记录，经 `transformTaskFields` 转换后返回全部字段
   - 修复2：Store `addTask` 改为 merge（`{ ...t, ...savedTask }`）而非 replace（`{ ...savedTask }`）
   - 修复3：`useTasks.createTask` 补全缺失的字段映射（batchId/batchCode/description/remarks/field/crop/teamId/teamName/toolsRemarks/requiredFeedback）
   - 新增DB列：`team_id`、`team_name`、`tools_remarks`；同步更新 schema.ts、FIELD_NAME_MAP、transformTaskFields

3. **修复新建任务字段名映射错误 — 前端→后端字段名完全不匹配**
   - 根因：前端 `createTask` 发送 `title/type/cropName/planStart/planEnd`，后端 POST 解构的是 `task_title/taskType/crop/plan_date/planTime`，全部丢失
   - 修复：后端 POST 新增接收前端字段名（`title`, `type`, `cropName`, `planStart`, `planEnd`, `field`, `assignee`）
   - `planStart` 拆分 → `plan_date` + `plan_time`；`planEnd` → `due_date`
   - VALUES 全部改为后端字段名 → 前端字段名 → 空值的三级 fallback

**构建状态：** ✅ 通过

### 2026-05-17 会话 (第二阶段) — 系统设置优化方案 Phase 1-2 执行

**完成的工作：**

1. **Phase 1 Module 4: 分级审批（ApprovalLevelConfig）— 从只读空壳到完整 CRUD**
   - 新增 3 个 DB 表：`approval_level_configs`（4个级别）、`approval_amount_thresholds`（3个阈值）、`approval_type_rules`（37种审批类型规则）
   - 新增 9 条后端 API 路由（`/api/basic-data/approval-*`）
   - 新增 3 个种子数据函数，37种类型规则从 `approvalHierarchy.ts` 迁移到 DB
   - 创建 `useApprovalLevelStore`（Zustand + persist），含 store-to-config 桥接（`syncApprovalStoreData()`）保持向后兼容
   - 重写 `ApprovalLevelConfig.tsx`：三个可编辑 TAB（阈值/级别/规则），新增 ThresholdModal/LevelConfigModal/TypeRuleModal/DeleteConfirmModal
   - `approvalHierarchy.ts` 更新：`getTypeSpecificConfig()`/`getLevelByAmount()`/`getApprovalLevelConfig()` 优先读 Store 数据，fallback 到硬编码

2. **Phase 2 Module 1: 通知设置（NotificationSettings）— 架构升级 + Preferences TAB 补全**
   - 新增 `notification_preferences` 表 + 后端 API：`GET/PUT /notifications/preferences/:userOid`
   - 创建 `useNotificationSettingsStore`（Zustand + persist），统一管理 channels/rules/preferences
   - 重写 `NotificationSettings.tsx`：3个TAB全部可用
   - Channels TAB：新增 ChannelModal（add/edit/delete/toggle）
   - Rules TAB：新增 RuleModal（add/edit/delete/toggle）
   - Preferences TAB：4个通知开关 + 免打扰时段配置 + 保存按钮（dirty 检测）

3. **Phase 2 Module 2: 分支管理（BranchManagement）— mock → API 完整改造**
   - 新增 `branches` 表（10个字段：branch_code, branch_name, location, area, manager, contact, block_count, description, status）
   - 新增种子数据 `seedBranches()`：4条原始基地数据
   - 新增后端 API：`GET/POST/PUT/DELETE /basic-data/branches`（软删除）
   - 前端 `apiBasicDataService.ts`：新增 `Branch` 接口 + `getBranches/createBranch/updateBranch/deleteBranch`
   - 创建 `useBranchStore`（Zustand + persist，5分钟缓存）
   - 重写 `BranchManagement.tsx`（388行→约250行）：local `useState(mockBranches)` → `useBranchStore`
   - 表单字段从 `code/name` 映射到 `branchCode/branchName`，与后端 snake_case 对齐

**构建状态：** ✅ 前端 + 后端均通过
**API 验证：** ✅ GET/POST/PUT/DELETE 全部测试通过

### 2026-05-17 会话 (第三阶段) — 审批中心修复计划 阶段5 完成

**完成的工作：**

1. **PATCH /:id/action 后端增强**
   - `server/src/routes/approval.ts`：PATCH 端点业务联动从仅处理 `production` 类型扩展为覆盖所有业务类型
   - 新增 `partially_approved` 状态联动支持
   - 端点返回完整审批记录（含已解析的 JSON 字段），不再仅返回状态摘要
   - 修复前：只对 `businessLink.type === 'production'` 执行 `updateBusinessTable`
   - 修复后：所有 `businessLink.type + requestId` 组合均触发联动

2. **移除冗余 POST /update 路由**
   - `server/src/routes/approval.ts`：删除 `POST /api/approvals/update`（47行）
   - 确认：零前端调用者，功能已被 PATCH 端点完全覆盖

3. **approval_rules & approval-type-rules API**
   - 确认已有完整 CRUD 路由：`GET/PUT /api/basic-data/approval-rules` 和 `approval-type-rules`
   - 无需修改

4. **HR审批数据迁移评估**
   - 确认 `HrApproval.tsx` 已通过 `useHrApprovals()` → `useApprovalStore()` 使用主审批系统
   - 发现 `src/services/hrApprovalService.ts` 为孤立死代码（零项目内导入），待用户确认删除

4. **删除孤立死代码**
   - `src/services/hrApprovalService.ts`（354行）：纯 localStorage HR审批服务，零引用，已删除

**构建状态：** ✅ 前端 + 后端均通过
**审批中心修复计划 5 个阶段全部完成**

### 2026-05-18 会话 — 数据字典去重修复

**问题诊断：**
1. 两套种子数据（`seedData.ts` + `seedBasicData.ts`）在每次服务器启动时都无条件执行
2. 两套数据使用不同的 ID 体系，同一 `(category_code, dict_code)` 存在不同 ID 的行，`INSERT OR REPLACE` 按 `id` 主键处理导致重复
3. 删除操作是软删除（status='inactive'），重启时种子数据覆盖回 'active'，删除项复活
4. seedBasicData.ts 内部有 6 个 ID 冲突（D138/D139/D140/D141/D142/D143 被多个分类复用），导致 `INSERT OR REPLACE` 时不同分类的条目相互覆盖

**修复内容：**

1. **seedBasicData.ts ID 冲突修复**：
   - source_origin 分类 D138-D148 → SO01-SO12（12个唯一ID）
   - greenhouse_type 分类 D140-D143 → GT01-GT04（4个唯一ID）

2. **移除 destructive DELETE**：
   - seedBasicData.ts `seedDictionaries()` 中 12 个分类的 `DELETE FROM` 语句已移除
   - 改为存在性检查（SELECT 先查再 INSERT），不丢失任何数据

3. **seedData.ts 种子逻辑修复**：
   - `INSERT OR REPLACE` → 存在性检查 + `INSERT`
   - 添加 ID 冲突回退机制（try/catch + 生成唯一 fallback ID）

4. **数据库去重迁移**（`fixMissingSchema.ts` 新增 `deduplicateDictionaries()`）：
   - 每次启动时自动检测活跃重复条目
   - 融合全部字段（label/value/color/sort_order）到最优行
   - 硬删除冗余行（数据已合并完备，不会丢失）

5. **启动顺序优化**（`index.ts`）：
   - 去重 → seedBasicData（数据更完整）→ seedData（补充独有分类）
   - 保证更完整的数据优先生效

**页面引用验证**：所有页面通过 `(category_code, dict_code)` 组合引用字典项，不依赖 `id`，去重后引用不会断裂。

**涉及文件：** `fixMissingSchema.ts`、`seedBasicData.ts`、`seedData.ts`、`index.ts`
**构建状态：** ✅ 前端 + 后端 TypeScript 均通过
**验证结果：** 二次重启后"字典数据无重复，跳过去重"+"新增 0，跳过全部"

### 2026-05-18/19 会话 — 供应商编码规则页面架构升级 (V2.1合规)

**问题诊断：**
- `http://localhost:5188/supplier-code-rule` 页面直接操作 localStorage，未遵循 V2.1 架构模板的三级降级数据流
- `material_code_categories` 表缺少 `rule_type` 列，物料和服务商编码规则混在一起
- 种子数据不完整：只播种了16条material + 18条supplier，缺少大量中类/小类
- PUT/DELETE 路由的 WHERE 子句缺少 `rule_type`，可能跨类型影响数据

**完成的工作：**

1. **后端 Schema 升级 + 数据迁移**
   - `fixMissingSchema.ts`：新增 `rule_type TEXT DEFAULT 'material'` 列 + NULL 值修复
   - `seedBasicData.ts`：新增 `seedCodeRuleCategories()`（~200行），含 11 big + 60 mid 供应商编码 + 7 big + 17 mid + 99 sub 物料编码
   - ID 格式：`SCC/MCC + Date.now() + '_' + parentCode + '_' + code`，解决同code不同parent的ID冲突
   - 存在性检查改为 `(code, parent_code, rule_type)` 三元组，避免跨父级重复跳过

2. **后端 API 路由升级**（`materialCodeCategories.ts`）
   - GET：支持 `?rule_type=` 查询参数，SQL 添加 `AND rule_type = ?`
   - POST：接收 `ruleType` 字段写入 DB
   - PUT：WHERE 条件从 `code = ?` 改为 `code = ? AND rule_type = ?`
   - DELETE：所有查询（查找/级联删除）均添加 `AND rule_type = ?`

3. **前端 Store 重写**（`useSupplierCodeRuleStore.ts`，~420行）
   - 从 localStorage 操作改为 `enhancedApiClient` 调用 API
   - `rowsToTree()`：API 平铺行 → `BigCategory[]` 树形结构
   - `fetchCategories()`：从 `/api/material-code-categories?rule_type=supplier` 加载
   - `syncLocalToApi()`：localStorage 历史数据迁移到后端
   - `migratedToApi` 标记 + persist 配置
   - 所有 CRUD 方法改为 async + 乐观更新

4. **前端页面适配**（`SupplierCodeRule.tsx`）
   - 添加 `useEffect(() => { fetchCategories(); }, [fetchCategories])`
   - 所有 CRUD 处理方法改为 async

5. **修复 `CodeRule.tsx` 构建错误**
   - line 598：`</>` → `</React.Fragment>`（匹配 line 536 的 `<React.Fragment key={...}>` 开头）

**种子数据统计：** 123 条 material + 71 条 supplier = 194 条
**CRUD 验证：** POST → PUT → GET → DELETE（含级联）全部通过
**构建状态：** ✅ 前端 + 后端 TypeScript 均通过
**涉及文件：** `materialCodeCategories.ts`, `fixMissingSchema.ts`, `seedBasicData.ts`, `useSupplierCodeRuleStore.ts`, `SupplierCodeRule.tsx`, `CodeRule.tsx`

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
