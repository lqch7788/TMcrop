# 水肥管理 Phase 1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现水肥管理 Phase 1：DB 表 + 后端 CRUD + 前端 Store + 浇水 Tab 独立增删改查

**Architecture:** 独立的 `watering_records` 表 + Repository/Service/Route 三层 + Zustand Store + 5 个前端组件 + Tab 集成到 FertilizerPage。Phase 2 负责与施肥记录和每日记录的联动。

**Tech Stack:** Node.js + Express + sql.js + Zod + React 18 + TypeScript + Zustand + Radix UI + Tailwind

**Spec Reference:** `docs/superpowers/specs/2026-07-20-water-fertilizer-design.md` (commit 341e1f2b)

---

## Phase 1 任务清单（12 任务）

### Task 1: 数据库表 schema 定义
**Files:** `server/src/db/schema.ts`（在 fertilizer_records 表附近）
**Action:** 添加 `watering_records` CREATE TABLE 字符串常量（含 28 列 + 4 索引 + 1 FK）
**Verify:** `cd server && npx tsc --noEmit 2>&1 | grep watering` 无输出
**Commit:** `feat(db): 添加 watering_records 表 schema 定义`

### Task 2: fixMissingSchema 补建表
**Files:** `server/src/db/fixMissingSchema.ts`（在 water_fertilizer_configs 块之后）
**Action:** 加 try/catch 块，db.run 完整 CREATE TABLE + INDEX
**Verify:** `npx tsc --noEmit` 无错误
**Commit:** `feat(db): fixMissingSchema 添加 watering_records 补建`

### Task 3: nowLocalTimestamp 工具函数
**Files:** 检查 `server/src/lib/timeUtils.ts` 是否存在，不存在则新建
**Action:** 导出 `nowLocalTimestamp()` 函数（参照 `fertilizer.service.ts:17-22`）
**Verify:** `grep -rn "nowLocalTimestamp" server/src/lib/` 找到导出
**Commit:** `feat(lib): 添加 nowLocalTimestamp 工具函数`（如新建）

### Task 4: WateringRepository 数据访问层
**Files:** 新建 `server/src/repositories/watering.repository.ts`
**Action:** 实现 `WateringRecord` interface + `WateringRepository` 类：
  - `findById(id)`
  - `findAll(filters, page, pageSize)`
  - `generateCode()` - SW+YYYYMMDD-4位
  - `insert(record)`
  - `update(id, updates)`
  - `deleteById(id)`
  - `deleteByFertilizerRecordId(id)` - Phase 2 用
  - `findByDailyRecordId(id)` - Phase 2 用
  - `mapRow()` - snake_case → camelCase

**Verify:** `npx tsc --noEmit | grep watering` 无错误
**Commit:** `feat(repo): 添加 watering.repository 数据访问层`

### Task 5: WateringService 业务逻辑层
**Files:** 新建 `server/src/services/watering.service.ts`
**Action:** 实现：
  - `WateringErrorCode` 枚举（NOT_FOUND, INVALID_QUANTITY, INVALID_INPUT, BATCH_TOO_LARGE）
  - Zod schema `createWateringSchema`（cropName/greenhouseName/waterTime 必填，totalWater 非负）
  - `WateringService` 类：`create/findAll/findById/generateCode/update/remove/removeBatch`
  - `update/remove/removeBatch` 中加 recordType !== 'manual' → 403 保护

**Verify:** `npx tsc --noEmit` 无错误
**Commit:** `feat(service): 添加 watering.service 业务逻辑层`

### Task 6: WateringRoute API 层
**Files:** 新建 `server/src/routes/watering.ts` + 修改 `server/src/routes/index.ts` 注册
**Action:** 8 个端点：
  - `GET /generate-code`
  - `GET /` (分页+筛选)
  - `GET /:id`
  - `POST /`
  - `PUT /:id`
  - `DELETE /:id`
  - `POST /batch-delete`
**Verify:** `npx tsc --noEmit` 无错误
**Commit:** `feat(api): 添加 /api/watering 路由 + 注册到 index.ts`

### Task 7: 编写后端单元测试
**Files:** 新建 `server/src/__tests__/watering.test.ts`
**Action:** 测试 6 个核心场景：
  1. generateCode 格式 SW+YYYYMMDD-NNNN
  2. create 写入成功
  3. update 只允许 manual 类型
  4. remove 只允许 manual 类型
  5. removeBatch 跳过非 manual
  6. findAll 筛选 recordType / cropName / dateRange

**Verify:** `cd server && npm run test:run watering` 全部 PASS
**Commit:** `test(server): watering 单元测试 6 场景`

### Task 8: 后端 e2e 集成测试
**Files:** 新建 `server/src/__tests__/watering.e2e.test.ts`
**Action:** 测试 HTTP 路由：
  1. POST /api/watering 创建
  2. GET /api/watering 分页
  3. PUT /api/watering/:id 编辑
  4. DELETE /api/watering/:id 删除
  5. POST /api/watering/batch-delete

**Verify:** `npm run test:run watering.e2e` 全部 PASS
**Commit:** `test(server): watering e2e 集成测试`

### Task 9: useWateringStore Zustand Store
**Files:** 新建 `src/stores/useWateringStore.ts` + 修改 `src/stores/index.ts` 导出
**Action:** 参考 `useFertilizerStore` 实现：
  - `WateringData` interface (29 字段)
  - `FIELD_MAP` snake_case → camelCase
  - `normalizeWatering/denormalizeWatering`
  - State: `items, isLoading, error`
  - Actions: `clearError, fetchItems(filters), fetchItemById(id), createItem, updateItem, deleteItem, deleteItems, generateCode`

**Verify:** `npx tsc --noEmit` 无错误
**Commit:** `feat(store): 添加 useWateringStore Zustand Store`

### Task 10: 浇水 5 个前端组件
**Files:** 新建于 `src/components/farm/fertilizer/`：
  - `WaterFilter.tsx` - 7 个筛选字段（recordType/wateringMethod/cropName/greenhouseName/startDate/endDate/operatorName）
  - `WaterTable.tsx` - 折叠展开表格 + 三模式操作栏（参照 FertilizerTable）
  - `WaterAddModal.tsx` - 字段：编号/时间/操作员/区域/浇水池/备注
  - `WaterEditModal.tsx` - 同上 + recordType !== 'manual' 保护
  - `WaterDetailModal.tsx` - 详情展示 + 浇水池明细

**Action:** 每个组件独立 commit，便于回退
**Verify:** `npm run build` 通过
**Commit:** 5 个独立 commit（每个组件一个）

### Task 11: 浇水导出弹窗
**Files:** 新建 `src/components/farm/fertilizer/WaterExportModal.tsx`
**Action:** 100% 对齐 `FertilizerExportModal`（xlsx/csv/pdf 三选一 + "已选择 X 条"）
**Verify:** `npm run build` 通过
**Commit:** `feat(ui): WaterExportModal 对齐通用导出样式`

### Task 12: FertilizerPage Tab 集成 + 路由 + 同步 D:\electron
**Files:** 修改 `src/components/farm/fertilizer/FertilizerPage.tsx`
**Action:**
  - 加 `activeTab: 'fertilizer' | 'watering'` 状态
  - 加 `waterFilters, waterSelectedIds` 状态
  - 渲染 `Tabs` 组件切换两套 Filter + Table + Modals
  - 切换 tab 时重置 selectedIds/operationMode/exportMode
  - URL 参数 `?tab=watering` 直链浇水 tab
  - `src/pages/crop/Fertilizer.tsx` 不改名（透传层）
  - 最后跑 `npm run build` + `cd server && npm run build` + 同步到 D:\electron

**Verify:**
  - `npm run build` 通过
  - 浏览器打开 `/crop/fertilizer` 看到 2 个 tab
  - 切换 tab 正常
  - 浇水 tab 新增/编辑/删除/导出全流程跑通
  - D:\electron\win-unpacked\resources\app\dist 同步最新

**Commit:** `feat(ui): FertilizerPage 加水肥管理 Tab 系统 + 同步 D:\electron`

---

## Phase 1 完成标准

- [ ] 12 个任务全部 commit 通过
- [ ] 后端 `npm run test:run` 全部 PASS
- [ ] 前端 `npm run build` 通过
- [ ] 浏览器实测：浇水 Tab 增删改查 + 导出全流程
- [ ] `git push` 到远程
- [ ] `D:\electron\win-unpacked` 同步最新（用 root package.json，不是 server package.json）

## Phase 2 任务清单（待续）

- [ ] Task 13: 施肥 service 加稀释换算工具函数
- [ ] Task 14: 施肥 apply/update/remove 集成 watering 写入和级联
- [ ] Task 15: syncDailyRecords.ts 加 syncWateringFromDailyRecord()
- [ ] Task 16: planting/seedling DELETE 路由加浇水级联
- [ ] Task 17: 详情弹窗交叉引用链接
- [ ] Task 18: 完整回归 + e2e 测试

---

## 执行选项

1. **Subagent-Driven（推荐）** - 每个任务派一个子 agent 执行 + 审阅
2. **Inline Execution** - 当前会话顺序执行，checkpoint 暂停

**自审说明：** 本计划比设计文档（详细代码 + TDD 步骤）精简。由于计划写作时 context 余量不足，未在每步贴完整代码。代码细节请查阅设计文档 §3（数据模型）、§4（后端）、§5（前端）、§6（换算公式）。