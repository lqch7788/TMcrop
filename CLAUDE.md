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
