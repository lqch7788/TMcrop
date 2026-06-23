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