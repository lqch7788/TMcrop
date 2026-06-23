# 标签粒度灵活化 + 数量调整 — 设计文档

**日期**: 2026-06-23
**状态**: 设计完成，待实施
**作者**: CodeMaster Nexus

## 背景

V1.1 育苗管理系统已实现标签管理（查看 + 录入 + 拍照），但存在两个关键缺口：

1. **粒度单一**：现有标签按"单株"语义生成，但实际业务多数情况一个标签代表整批苗（同一时间、同一地点、同一批次）。
2. **数量调整缺失**：苗死亡/补充时，无法更新标签反映真实数量，导致追溯链断裂。

## 业务目标

让标签管理支持：

- **批次粒度为主**：一个标签代表整批苗（如 5000 株）
- **单株粒度为辅**：一个标签代表 1 株苗（精确追溯特殊植株）
- **混合场景**：同一育苗记录可同时有批次标签 + 单株标签
- **数量动态调整**：苗死亡/补充时，调整标签 quantity 并记录原因
- **手机扫码录入**：二维码含 URL，扫码后跳转标签详情页快速录履历

## 数据模型

### `plant_labels` 新增字段

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `quantity` | INTEGER | 1 | 这标签代表的苗数 |
| `status` | TEXT | 'active' | active / voided / moved_out |

### `plant_label_resume` 新增字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `quantity` | INTEGER | 本次操作涉及数量（部分移走填这个，整批不填） |
| `reason` | TEXT | 调整原因（如"夏季高温死亡"） |

### 履历 operation_type 规则

| 操作 | operation_type | quantity 字段 | status 影响 |
|---|---|---|---|
| 新生成 | （无履历） | 入参指定 | active |
| 部分移走 200/5000 株 | move_out | 200 | active（quantity 5000 → 4800）|
| 部分移走最后 100 株 | move_out | 100 | active → voided（quantity → 0）|
| 整批移出 | move_out | （空） | active → moved_out |
| 整批作废 | void | （空） | active → voided |
| 标记（关注/问题/优质） | mark | （空） | 不变 |

## 后端 API

### 改动

- `POST /api/plant-labels/batch-create`：入参每项支持 `quantity`
- `POST /api/plant-labels/:id/resumes`：入参支持 `quantity` + `reason`
- `GET /api/plant-labels`：自动返回 quantity/status（SELECT * 已有）

### 新增

- `GET /api/plant-labels/by-number/:labelNumber`：扫码查询专用
  - 返回：标签详情 + 当前 quantity + status + 最近 20 条履历
  - 移动端友好（轻量 JSON）

## 前端 UI

### PrintLabelModal 改造

batch 模式加 **"标签类型"** 切换（3 选 1）：

| 类型 | 行为 | UI |
|---|---|---|
| **批次** | 1 个标签，quantity = 用户填 | 输入 N=1 + Q=5000 |
| **单株** | N 个标签，每个 quantity=1 | 输入 N=5000 |
| **混合** | N 个标签，每个 quantity 可在弹窗内逐行填 | 输入 N=5，下方表格 5 行可改 quantity |

入库调 `batchCreateLabels`，每标签带 quantity。

### SeedlingLabelManageModal 加"+ 补充生成"按钮

弹窗参数：
- 标签类型（批次/单株/混合）
- 数量 N
- 混合模式：预览列表每行 quantity 可编辑

调 `batchCreateLabels`。

### SeedlingLabelManageModal 左侧标签列表增强

每行增加显示：
- **quantity** 列：`5000株` / `1株`
- **status 徽章**：
  - active → 无徽章（默认）
  - voided → 灰色"已作废"
  - moved_out → 橙色"已移出"

### SeedlingLabelManageModal 行内录入表单增强

新增字段：
- **数量**（number）：本次操作涉及数量（部分移走时填）
- **原因**（text）：调整原因备注

复用现有 4 个 Tab（移入/移出/打标记/作废）。

### QR 内容改造

- 旧：`https://tm-crop.com/ResumeTimeline?labelID=xxx`（生产域名）
- 新：`http://yourdomain.com/labels/{labelNumber}`（可部署域名）
- 扫码后跳转前端路由 `/labels/:labelNumber`

### 新增页面：`/labels/:labelNumber`

- 移动端友好的标签详情页
- 显示：标签编号、所属育苗、数量、状态、当前位置、最近 20 条履历
- 操作：移入/移出/打标记/作废（行内表单嵌入）
- 解决"扫码后能立即操作"的场景

## 数据迁移

现有 8 条 `plant_labels`：
- `quantity = 1`（按单株处理）
- `status = 'active'`（保持有效）

迁移方式：
- ALTER TABLE 添加字段（默认 1 / 'active'）
- 旧数据自动填充默认值

## 5 步实施计划

### Step 1: schema 扩展 + 数据库迁移
- `server/src/db/schema.ts`：CREATE TABLE 加 quantity/status/reason 字段
- `server/src/db/fixMissingSchema.ts`：ALTER TABLE 段
- ⚠️ 项目启动白名单禁用 fixMissingSchema，需手动 ALTER + fs.writeFileSync 落盘

### Step 2: 后端 API 扩展
- `server/src/routes/plantLabel.ts`：
  - POST /batch-create 接受 quantity
  - POST /:id/resumes 接受 quantity + reason
  - 新增 GET /:labelNumber/by-number 路由

### Step 3: 前端 Store 类型扩展
- `src/stores/usePlantLabelStore.ts`：
  - PlantLabel 加 quantity / status 字段
  - PlantLabelResume 加 quantity / reason 字段
  - batchCreateLabels 入参支持 quantity 数组

### Step 4: PrintLabelModal 升级
- `src/components/farm/seedling/modals/PrintLabelModal.tsx`：
  - 加"标签类型"切换（批次/单株/混合）
  - 混合模式：预览列表每行 quantity 可编辑
  - 调 batchCreateLabels 时 quantity 一起发

### Step 5: SeedlingLabelManageModal + 新扫码页
- `src/components/farm/seedling/modals/SeedlingLabelManageModal.tsx`：
  - "+ 补充生成标签"按钮 + 弹窗
  - 左侧标签列表加 quantity/status 徽章
  - 行内录入表单加 quantity/reason 字段
- `src/pages/LabelDetail.tsx`：扫码落地页
- `src/App.tsx`：注册路由 `/labels/:labelNumber`

## 测试场景

| 场景 | 验证 |
|---|---|
| 批次生成 | PrintLabelModal 选"批次"，输入 1 + quantity=5000 → 1 个标签入库 |
| 单株生成 | PrintLabelModal 选"单株"，输入 5000 → 5000 个标签入库 |
| 混合生成 | PrintLabelModal 选"混合"，输入 5，逐行改 quantity → 5 个标签各自 quantity |
| 部分移走 | 录入 move_out + quantity=200 + reason → 标签 quantity 减 200 |
| 整批移出 | 录入 move_out（不填 quantity）→ 标签 status 变 moved_out |
| 部分移走减到 0 | 多次录入 move_out 直到 quantity=0 → status 自动 voided |
| 整批作废 | 录入 void + reason → status 变 voided，quantity 不变 |
| 扫码查询 | 扫 QR 跳转 /labels/YM20260615-001-0001 → 显示标签详情 |
| 数据迁移 | 旧标签显示 quantity=1, status=active |

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| ALTER TABLE 字段加错 | 字段都用 DEFAULT，老数据自动填充 |
| 现有 PrintLabelModal 行为变化影响演示 | 单株模式 = 旧行为（兼容）|
| QR 内容改 URL 域名 | 配置化 baseUrl，演示/生产可切换 |
| 权限未实现 | V1.1 内部系统暂不实现，生产化时再补 RBAC |

## 不在本设计范围

- 多用户协作（实时同步）
- 权限细分（RBAC）
- 二维码内容加密
- 图片上传数量限制（已 2MB 单图）
- 履历导出 CSV/Excel

## 实施计划（基于 plan-eng-review 决策）

### 范围调整（Step 0）

- ❌ 删除 `src/pages/LabelDetail.tsx`（不复用单独页面）
- ✅ 复用 `SeedlingLabelManageModal` + SeedlingPage URL 参数自动打开
- ✅ 触文件数：7 个（< 8 smell 阈值）

### 决策汇总（11 个）

**Section 1 Architecture（5 决策）**

| # | 问题 | 决策 |
|---|---|---|
| #3 | plant_label_resume.quantity 字段语义 | **quantity_change + quantity_after 双字段**（本次量 + 操作后剩余）|
| #1 | 状态机并发安全 | **乐观锁 + expected_quantity**（POST 时传期望值，后端 CAS 校验）|
| #2 | moved_out vs voided 区分 | **保留 3 状态**（active/moved_out/voided）|
| #5 | 扫码查询鉴权 | **不鉴权**（演示系统，生产再补）|
| #4 | API 幂等性 | **不防重复**（演示系统，生产再补）|

**Section 2 Code Quality（3 决策）**

| # | 问题 | 决策 |
|---|---|---|
| #1 | SeedlingLabelManageModal 457 行 | **拆 4 子组件**（LabelTable / LabelResumePanel / AddResumeForm / LabelBadge）|
| #2 | 两个 modal 重复逻辑 | **抽 LabelTypeSelector 公共组件**到 src/components/ui/|
| #3 | plantLabel.ts 后端 348 行 | **拆 3 文件**（plantLabels.ts / plantLabelResumes.ts / plantMarks.ts）|

**Section 3 Test Review（1 决策）**

| # | 问题 | 决策 |
|---|---|---|
| Test | 测试覆盖率（当前 0%）| **100% 路径 + 1 E2E**（Vitest 后端全覆盖 + Vitest 前端 4 子组件 + 1 Playwright 完整闭环）|

**Section 4 Performance（2 决策）**

| # | 问题 | 决策 |
|---|---|---|
| #1 | 批量 5000 INSERT 25s | **后端单事务批量 INSERT**（多行 VALUES 语法，5000 条 ~500ms）|
| #2 | 单育苗 5000 标签被截断 | **后端分页 + 前端 page 参数**（limit=100/page=1..N）|

### 优化后的实施步骤（基于 11 个决策调整）

1. **schema 扩展**：plant_labels + quantity/status；plant_label_resume + quantity_change/quantity_after/reason + ALTER 落盘
2. **后端拆分**：plantLabel.ts → plantLabels.ts / plantLabelResumes.ts / plantMarks.ts
3. **后端 API**：
   - POST /batch-create：批量 INSERT 多行 VALUES
   - POST /:id/resumes：乐观锁（expected_quantity CAS）+ quantity_after 计算 + quantity→0 自动 voided
   - GET /plant-labels：加 page/limit 分页
   - GET /by-number/:labelNumber：扫码查询
4. **Store 类型**：PlantLabel + quantity/status；PlantLabelResume + quantity_change/quantity_after/reason；batchCreateLabels 接受 quantity 数组
5. **公共组件**：`src/components/ui/LabelTypeSelector.tsx`（批次/单株/混合切换）
6. **SeedlingLabelManageModal 拆分**：
   - `LabelTable.tsx`（标签列表 + 状态徽章 + quantity 列）
   - `LabelResumePanel.tsx`（履历时间线）
   - `AddResumeForm.tsx`（行内录入表单 + quantity/reason）
   - `LabelBadge.tsx`（状态徽章）
   - `SeedlingLabelManageModal.tsx` 缩到 ~150 行编排代码
7. **PrintLabelModal 升级**：用 LabelTypeSelector + 混合模式预览表格
8. **URL 参数解析**：SeedlingPage page load 时解析 `?seedlingId=&labelNumber=`，自动开 SeedlingLabelManageModal 并选中标签
9. **测试**：
   - Vitest：后端 routes 测试（labels/resumes/marks 各自 file）
   - Vitest：前端 4 子组件 + LabelTypeSelector 测试
   - Playwright：1 个 e2e/plantLabel.spec.ts（批次生成→录入履历→扫码查询完整闭环）

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN | 11 issues, 0 critical gaps |

### Architecture (5)

1. **[D3 - resolved]** `plant_label_resume.quantity` 语义模糊 → 拆 `quantity_change` + `quantity_after` 双字段
2. **[D1 - resolved]** 状态机自动转换无并发保护 → 乐观锁 `expected_quantity` CAS 校验
3. **[D2 - resolved]** `moved_out` 与 `voided` 语义重叠 → 保留 3 状态，明确区分（位置变化 vs 不可恢复）
4. **[D5 - resolved]** by-number 端点无鉴权 → 暂不鉴权（演示优先）
5. **[D4 - resolved]** API 无幂等键 → 暂不防重复（演示优先）

### Code Quality (3)

6. **[D1 - resolved]** SeedlingLabelManageModal 457 行超 SRP → 拆 4 子组件
7. **[D2 - resolved]** 两个 modal 重复"标签类型"逻辑 → 抽 `LabelTypeSelector` 公共组件
8. **[D3 - resolved]** plantLabel.ts 348 行混 3 类路由 → 拆 3 文件

### Test Review (1)

9. **[D1 - resolved]** plantLabel 测试覆盖率 0% → 100% 路径覆盖 + 1 E2E

### Performance (2)

10. **[D1 - resolved]** 批量 5000 INSERT 25s → 单事务多行 VALUES（~500ms）
11. **[D2 - resolved]** 单育苗 5000 标签被 limit=200 截断 → 后端分页 + 前端 page 参数

- **UNRESOLVED:** 0（11 个决策全部用户审批）
- **VERDICT:** ENG CLEARED — ready to implement

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific finding above. Run with Claude Code or Codex; checkbox as you ship.

- [ ] **T1 (P1, human: ~30min / CC: ~45min)** — schema 扩展 + DB 迁移
  - Surfaced by: Architecture 整体（4 决策）
  - Files: `server/src/db/schema.ts`, `server/src/db/fixMissingSchema.ts`
  - Verify: `npx tsc --noEmit` + 手动 ALTER + `fs.writeFileSync` 落盘
- [ ] **T2 (P1, human: ~1h / CC: ~1.5h)** — 后端拆分 + API 扩展 + 乐观锁
  - Surfaced by: Code Quality #3 + Architecture #1
  - Files: `server/src/routes/plantLabel.ts` → `plantLabels.ts` / `plantLabelResumes.ts` / `plantMarks.ts`
  - Verify: curl 测试状态机 + 乐观锁 CAS 冲突 + 分页
- [ ] **T3 (P1, human: ~30min / CC: ~30min)** — Store 类型扩展
  - Surfaced by: Architecture 整体
  - Files: `src/stores/usePlantLabelStore.ts`
  - Verify: TypeScript 编译通过
- [ ] **T4 (P2, human: ~30min / CC: ~30min)** — 公共组件 LabelTypeSelector
  - Surfaced by: Code Quality #2
  - Files: `src/components/ui/LabelTypeSelector.tsx`（新）
  - Verify: 单测 + 视觉回归（手动）
- [ ] **T5 (P1, human: ~3h / CC: ~1.5h)** — SeedlingLabelManageModal 拆 4 子组件 + 功能扩展
  - Surfaced by: Code Quality #1 + Architecture 整体
  - Files: `src/components/farm/seedling/modals/SeedlingLabelManageModal.tsx` + 4 个新子组件
  - Verify: 子组件单测 + 手动验证 status 徽章 + 补充生成 + 行内录入新字段
- [ ] **T6 (P1, human: ~1h / CC: ~45min)** — PrintLabelModal 升级 + 扫码 URL 参数解析
  - Surfaced by: PrintLabelModal + SeedlingPage 集成
  - Files: `PrintLabelModal.tsx`, `SeedlingPage.tsx`
  - Verify: 手动验证批次/单株/混合 3 模式 + URL ?seedlingId=&labelNumber= 自动打开
- [ ] **T7 (P1, human: ~3h / CC: ~2h)** — 测试 100% 覆盖 + 1 E2E
  - Surfaced by: Test Review #1
  - Files: `server/src/__tests__/plantLabels.test.ts`, `server/src/__tests__/plantLabelResumes.test.ts`, `server/src/__tests__/plantMarks.test.ts`, `src/components/ui/__tests__/LabelTypeSelector.test.tsx`, `src/components/farm/seedling/modals/__tests__/*.test.tsx`, `e2e/plantLabel.spec.ts`（新）
  - Verify: `npm run test:run` 100% 通过 + `npx playwright test e2e/plantLabel.spec.ts` 通过
- [ ] **T8 (P1, human: ~30min / CC: ~30min)** — 后端单事务批量 INSERT + 分页
  - Surfaced by: Performance #1 #2
  - Files: `server/src/routes/plantLabels.ts` (重构后)
  - Verify: 5000 条批量 < 1s + 分页 page=1..N 测试