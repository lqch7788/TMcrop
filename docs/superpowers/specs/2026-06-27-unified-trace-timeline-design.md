# 统一追溯时间线 — 设计规格（v2 修订）

**日期**：2026-06-27
**作者**：CodeMaster Nexus
**状态**：设计中（v2），待用户批准
**修订说明**：v2 接收 Architect 评审反馈，调整端点拆分 + 双视图设计

---

## 1. 目的

种源管理模块当前有 **3 套追溯机制并存**，用户体验差且数据口径不一致：

1. **详情弹窗 DetailModal**（4 Tab：基本信息 / 追溯链路 / 流转记录 / 调拨来源）
2. **页脚折叠区 SeedSourceHistoryTabs**（4 Tab：入库 / 库存流水 / 回流 / 变更）— UX 设计缺陷让用户误以为"只能看一条"
3. **行级操作链**（入库登记 / 调拨 / 退库等）

**核心问题**：

- 页脚 fallback 逻辑（`selectedRows.length === 1 ? selectedRows[0] : currentPageSeedSourceId`）导致用户看到"追溯记录 — 当前种源 ZZ20260626-002"而无感
- 详情弹窗里"追溯链路"和"流转记录"两个 Tab 名称相似但数据源完全不同
- 跨模块（种源/育苗/种植）追溯 UI 不统一

**目标**：把所有追溯收敛到详情弹窗的**双视图（时间线 + 表格）组件**，删除页脚折叠区，跨 3 个 entity（种源/育苗/种植）复用同一组件。

---

## 2. 与已有追溯页面的关系（关键澄清）

| 已有功能 | 定位 | 与本次关系 |
|---------|------|----------|
| **MaterialFlowPage** `/crop/material-flow`（流转追溯全局页） | 全局视角：所有业务、所有批次的 material_flow_log 流转记录 + 5 Tab 聚合 | **保留不动**，独立功能 |
| **ChainTraceability** summary 模块（全链条追溯 Sankey 图） | 批次视角：6 环节汇总图 + 批次列表 | **保留不动** |
| **InventoryTraceModal** 库存追溯弹窗 | 单库存上下游链路（依赖 instanceId） | **保留不动** |
| **DetailModal 内 TraceChain Tab** | 单 entity 上下游链路（依赖 instanceId） | **保留不动**（种源/采收的 instanceId 大概率为空，但育苗偶有） |
| **DetailModal 内 FlowLogTab Tab** | 单 entity 业务级流转（按 code 查 material_flow_log） | **保留不动**，作为详情弹窗的"全链路流转"子 Tab |
| **SeedSourceHistoryTabs 页脚折叠区** | 种源管理页脚全局追溯 4 Tab | **删除入口，保留组件**（详见 §7.1） |

**核心结论**：本次规划是"单 entity 详情弹窗时间线"重构，**不是** MaterialFlowPage 的替代，也不是 ChainTraceability 的替代。三者互补。

---

## 3. 范围

### 3.1 in-scope

- 新建后端端点：`GET /api/{entity}/:id/history`（种源/育苗/种植 各 1 个），**仅 UNION 3-4 张实体级表**（按 business_id 关联）
- 新建前端通用组件：`<EntityHistoryTimeline>`（双视图：时间线 + 表格）
- 新建前端包装组件：`<EntityDetailModal>`（3 个 entity 详情弹窗共用）
- 重构 3 个详情弹窗（种源/育苗/种植），用 EntityDetailModal 替换自定义 Tab
- 删除 SeedSourcePage 的 `<details>` 页脚折叠区入口
- 在 EntityHistoryTimeline 中**整合** material_flow_log 数据（保留与 MaterialFlowPage 的同一 API）

### 3.2 out-of-scope

- MaterialFlowPage 全局页 — 不动
- ChainTraceability Sankey 图 — 不动
- InventoryTraceModal 库存追溯弹窗 — 不动
- TraceChain.tsx — 不动（保留，标记种源分支待废弃）
- SeedSourceHistoryTabs.tsx — 文件保留，组件本身标记废弃
- 行级操作链（入库登记/调拨/退库/打印）— 不动
- 种源/育苗/种植主列表页面、筛选、导出、统计 — 不动

---

## 4. 数据模型

### 4.1 后端端点

```
GET /api/{entity}/:id/history
entity = seed-sources | seedlings | plantings
```

**只 UNION 3-4 张实体级表**（关键：material_flow_log 不在此端点，避免业务流转淹没实体历史）：

| category | 表 | 关联字段 | 适用 entity |
|----------|-----|----------|-------------|
| `lifecycle` | `audit_logs` | `business_id = :id AND business_type = :entityType` | 全部 |
| `inbound` | `inventory_inbound_records` | `business_id = :id` | 全部 |
| `transaction` | `inventory_transaction` | `business_id = :id` | 全部 |
| `circulation` | `crop_circulation_records` | `seed_source_id = :id` | 仅种源 |

### 4.2 复用既有 material_flow_log API

```
GET /api/material-flow-log/trace?code=ZZ20260626-002
```

保持原样，前端 EntityHistoryTimeline 内部并发调 2 个端点：
1. `/api/{entity}/:id/history`（实体历史）
2. `/api/material-flow-log/trace?code=...`（业务流转）

合并后在双视图中统一展示。

### 4.3 统一响应结构

```typescript
interface HistoryItem {
  id: string;                      // 原始记录 ID
  occurredAt: string;              // ISO 时间（按此字段倒序）
  source: 'entity' | 'flow';       // 实体历史 vs 业务流转
  category: 'lifecycle'            // audit_logs (create/update/delete)
           | 'inbound'             // inventory_inbound_records
           | 'transaction'         // inventory_transaction
           | 'circulation'         // crop_circulation_records（仅种源）
           | 'flow';               // material_flow_log
  action: string;                  // 中文动作标签（创建/入库/扣减/退库/调拨等）
  quantityDelta?: number;          // 数量变化（正=入，负=出）
  unit?: string;
  refCode?: string;                // 关联单号
  refModule?: string;              // 关联模块
  operatorName?: string;
  remarks?: string;
  raw?: Record<string, unknown>;   // 原始数据（前端按需展开）
}
```

---

## 5. 前端架构

### 5.1 组件层次

```
src/components/ui/EntityHistoryTimeline.tsx  (新建 — 双视图核心)
  ├── TimelineHeader (筛选条 + 视图切换 + 导出)
  ├── TimelineView (时间线模式)
  ├── TableView (表格模式 — 可导出 Excel)
  └── EmptyState (空状态)

src/components/ui/EntityDetailModal.tsx  (新建 — 包装层)
  ├── 基本信息 (props.basicInfoPanel)
  ├── EntityHistoryTimeline (props.historyEndpoint)
  └── extraTabs (可选 — 如调拨来源、繁殖信息等)
```

### 5.2 EntityHistoryTimeline 双视图设计

```
┌─ EntityHistoryTimeline ────────────────────────────┐
│  ┌─视图切换─────────────────────────────────────┐  │
│  │ [⏰ 时间线]  [📋 表格]                       │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─筛选─────────────────────────────────────────┐ │
│  │ [全部][入库][出库][调拨][回流][审计][流转]   │ │
│  │ [日期范围] [操作员]                          │ │
│  └─────────────────────────────────────────────┘ │
│                                                     │
│  工具栏:  [刷新]  [导出 Excel (.xlsx)]             │
│                                                     │
│  ┌─【时间线模式】────────────────────────────┐    │
│  │ ● 2026-06-27 14:32 [入库] +50袋 by 张三   │    │
│  │ │  source: ZZ20260620-001 → ZZ20260626-002│    │
│  │ ● 2026-06-26 09:15 [变更] qty 100→150     │    │
│  │ ● 2026-06-25 16:48 [流转] plan→seed_source│    │
│  │ ● 2026-06-24 10:22 [创建] by admin         │    │
│  │  [加载更多...]                              │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
│  ┌─【表格模式】──────────────────────────────┐    │
│  │ 时间│类型│数量│来源│单位│操作员│备注       │    │
│  │ ────┼────┼────┼────┼────┼──────┼────       │    │
│  │ 06-27│入库│+50│ZZ..│袋│张三│-         │    │
│  │ 06-26│变更│-│-│袋│系统│qty 100→150│    │
│  └───────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 5.3 EntityDetailModal API

```typescript
// 新建 src/components/ui/EntityDetailModal.tsx
interface EntityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  basicInfoPanel: React.ReactNode;       // 业务基本信息面板（按 entity 不同）
  historyEndpoint: string;              // 后端 /history 端点
  historyEntityCode: string;            // 用于调 material_flow_log
  extraTabs?: Array<{                   // 可选附加 Tab（如调拨来源）
    key: string;
    label: string;
    content: React.ReactNode;
  }>;
}
```

### 5.4 3 个详情弹窗包装示例

```tsx
// 种源详情弹窗（src/components/farm/seed-source/modals/DetailModal.tsx）
export function DetailModal({ isOpen, onClose, record }: Props) {
  return (
    <EntityDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={`种源详情 - ${record.seedCode}`}
      basicInfoPanel={<SeedSourceBasicInfo record={record} />}
      historyEndpoint={`/seed-sources/${record.id}/history`}
      historyEntityCode={record.seedCode}
      extraTabs={record.transferredFromStockId ? [
        { key: 'transfer-source', label: '调拨来源', content: <TransferSourcePanel record={record} /> }
      ] : []}
    />
  );
}
```

---

## 6. 文件改动清单

### 6.1 后端

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/services/entityHistory.service.ts` | 新建 | 3-4 表 UNION 查询 |
| `server/src/routes/seedSource.ts` | 改 | 新增 `/history` 端点 |
| `server/src/routes/seedling.ts` | 改 | 新增 `/history` 端点 |
| `server/src/routes/planting.ts` | 改 | 新增 `/history` 端点 |

### 6.2 前端

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/services/entityHistoryService.ts` | 新建 | 3 entity 共用 service |
| `src/components/ui/EntityHistoryTimeline.tsx` | 新建 | 双视图核心组件 |
| `src/components/ui/EntityDetailModal.tsx` | 新建 | 通用详情弹窗包装 |
| `src/components/farm/seed-source/modals/DetailModal.tsx` | 改 | 调 EntityDetailModal |
| `src/components/farm/seedling/modals/DetailModal.tsx` | 改 | 同上 |
| `src/components/farm/planting/modals/DetailModal.tsx` | 改 | 同上 |
| `src/components/farm/seed-source/SeedSourcePage.tsx` | 改 | 删 `<details>` 页脚 + 删 SeedSourceHistoryTabs 引用 |

### 6.3 保留不动（明确标记）

- `src/pages/material-flow/MaterialFlowPage.tsx`（独立功能）
- `src/pages/summary/ChainTraceability.tsx`（独立功能）
- `src/components/farm/inventory/InventoryTraceModal.tsx`
- `src/components/farm/trace/TraceChain.tsx`（文件保留；种源/采收分支标记待废弃）
- `src/components/farm/trace/FlowLogTab.tsx`（保留为详情弹窗内"全链路流转"子 Tab）
- `src/components/farm/seed-source/components/SeedSourceHistoryTabs.tsx`（组件标记废弃，暂不删，**仅 SeedSourcePage 不再引用**）

---

## 7. 删除与简化

### 7.1 删除项

1. **SeedSourcePage.tsx 第 817-828 行 `<details>` 折叠区** — 删除入口
2. **SeedSourcePage.tsx 中 SeedSourceHistoryTabs 引用** — 删除 import + JSX
3. **SeedSourcePage.tsx 中 currentPageSeedSourceId 计算** — 删除 useMemo
4. **DetailModal.tsx 中 4 个 Tab 重新组织**：
   - 基本信息 — 保留
   - 追溯链路（TraceChain）— 保留
   - 流转记录（FlowLogTab）— **合并到 EntityHistoryTimeline**（避免双组件同义）
   - 调拨来源 — 保留为 extraTab

### 7.2 不简化项（已采纳 Architect 反馈）

- **调拨来源 Tab 字段不删** — 保留全部元数据
- **TraceChain.tsx 不删** — 保留种源/采收/育苗分支
- **SeedSourceHistoryTabs.tsx 文件不删** — 仅入口删除

---

## 8. 验证标准

### 8.1 功能验证

1. 种源详情弹窗打开 ZZ20260626-002 → EntityHistoryTimeline 双视图显示：
   - 时间线模式：所有入库/变更/创建/调拨/退库记录按时间倒序
   - 表格模式：同样数据，可点"导出 Excel"
2. 选中/不选中种源行，EntityHistoryTimeline 都显示该种源的完整历史（无 fallback）
3. 关闭/打开页面，页脚不再有 SeedSourceHistoryTabs 折叠区
4. 育苗详情弹窗 EntityHistoryTimeline 渲染正常
5. 种植详情弹窗 EntityHistoryTimeline 渲染正常
6. 调拨来的种源，"调拨来源"Tab 仍显示全部元数据
7. 外购的种源，"调拨来源"Tab 不出现
8. 表格视图导出 Excel 文件正常打开，包含合并的实体历史 + material_flow_log

### 8.2 构建验证

1. `npm run build` 通过
2. 全项目 grep `SeedSourceHistoryTabs` 仅在文件本身出现 0 命中引用
3. TraceChain.tsx 文件保留，3 个详情弹窗仍可使用
4. 后端 `/history` 端点 200 OK，返回数组按时间倒序

### 8.3 业务验证

1. 对调拨入库后的种源 → 时间线最上方显示最新入库
2. 外购入库后 → 时间线显示外购入库 + 创建记录
3. 修改种源 quantity → 时间线显示 audit update 记录
4. 退库后 → 时间线显示退库流水（transfer_in 类型）
5. 表格视图导出 Excel → 列包含：时间、类型、数量、来源、单位、操作员、备注

---

## 9. 风险与权衡

### 9.1 风险

- **business_id 关联冲突**：audit_logs/inbound/transaction 都用 business_id，但入库记录的业务 ID 是种源 ID 吗？需在端点内验证
- **时间字段不一致**：3 表的时间字段分别是 `created_at` / `record_date` / `operate_date`，后端需映射到统一的 `occurredAt`
- **material_flow_log 双源不一致**：合并展示时可能重复（如果某个 entity 既是 source 又是 target）— 前端按 `refCode` 去重

### 9.2 权衡

- **不删除 TraceChain**：保留种源/采收分支即使无效（避免破坏库存模块对 instanceId 的引用）
- **不删除 SeedSourceHistoryTabs.tsx 文件**：避免破坏可能的其他引用（grep 全仓确认前保守）
- **不持久化筛选状态**：每次打开弹窗从"全部"开始（避免缓存复杂度）

---

## 10. 实施顺序

1. **后端先行**：新建 `entityHistory.service.ts`，加 3 个 entity 的 `/history` 端点，curl 验证返回
2. **前端通用组件**：新建 `EntityHistoryTimeline.tsx`（双视图）+ `entityHistoryService.ts`
3. **包装通用详情 Modal**：新建 `EntityDetailModal.tsx`
4. **重构种源 DetailModal**：调通用组件（核心验证点）
5. **删除 SeedSourcePage 页脚** + 删 SeedSourceHistoryTabs 引用
6. **重构育苗/种植 DetailModal**（如已存在详情弹窗）
7. **回归验证**：种源/育苗/种植 3 个详情弹窗逐个打开 + 双视图切换 + 导出 Excel

---

## 11. 验证后续

- 实施完成后，用户需在种源/育苗/种植 3 个页面分别打开详情弹窗：
  - 切换时间线 ↔ 表格视图，确认数据一致
  - 点"导出 Excel"，确认文件可打开
  - 对调拨来的种源，确认"调拨来源"Tab 完整字段
- 任何缺失的记录类型 → 回到 §4.1 补 UNION 查询

---

**规格自检（v2）**：

- ✅ 无占位符
- ✅ 内部一致：双视图 ↔ 端点拆分 ↔ 文件改动一致
- ✅ 范围聚焦：1 个独立功能，10 个文件改动可控
- ✅ 模糊性已澄清：调拨来源 Tab 保留全部字段；material_flow_log 单独端点；TraceChain 保留
- ✅ Architect 反馈已采纳：5 表 UNION → 2 端点；TraceChain 保留；调拨 Tab 不简化；SeedSourceHistoryTabs 入口删除但文件保留