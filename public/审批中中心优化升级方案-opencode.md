# 审批中心优化升级方案 V6.0

> 参考整合：
> - `审批流程优化-V1.0.md`
> - `审批中心升级方案V5.0.md`
> - `审批中心优化升级方案-opencode.md`
>
> 更新日期：2026-05-04

---

## 一、现状分析

### 1.1 当前页面结构问题

| 序号 | 页面名称 | 路由路径 | 功能描述 | 问题分析 |
|------|----------|----------|----------|----------|
| 1 | 审批中心主页 | `/approvals` | 4个Tab：待审批/已通过/已拒绝/全部 | 主入口 |
| 2 | 物料审批 | `/material-approval` | 3个Tab：领料审批/退料审批/采购审批 | **与审批中心功能重叠** |
| 3 | 生产审批 | `/production-approval` | 3个Tab：技术方案/生产计划/采收申请 | **与审批中心功能重叠** |
| 4 | HR审批中心 | `/hr-approval` | 11种HR类型审批 | 独立系统 |
| 5 | 待办审批 | `/pending-approval` | 待办列表 | **可合并** |
| 6 | 已办审批 | `/approved` | 已办列表 | **可合并** |
| 7 | 我提交的审批 | `/my-approval` | 申请人视图 | **可合并** |
| 8 | HR审批详情 | `/hr-approval-detail/:id` | HR审批详情 | 详情页保留 |
| 9 | 审批演示 | `/approval-demo` | 演示页面 | **可删除** |
| 10 | 审批流程页面 | `/approval/approval-flow` | 流程可视化 | **可合并** |
| 11 | HR审批(simple) | `/settings/personnel/hr-approval` | 同4 | **重复路由** |
| 12 | HR审批文档 | `/settings/personnel/hr-documents` | 文档管理 | 保留 |
| 13 | 审批工作流配置 | `/settings/approval-workflow` | 工作流管理 | 保留 |
| 14 | 公告管理 | `/announcement` | 包含公告审批流程Tab | **未纳入统一审批中心** |
| 15 | 指标管理 | `/indicators` | 指标管理 | **无审批功能** |
| 16 | 作物管理 | `/crop-management` | 作物管理 | **作物入库无补录审批** |

### 1.2 当前审批类型盘点

#### 已实现的审批类型（18种）

| 序号 | 审批类型 | 枚举值 | 状态 |
|------|----------|--------|------|
| 1 | 领料申请 | `MATERIAL_REQUEST` | ✅ 已实现 |
| 2 | 退料单 | `RETURN_MATERIAL` | ✅ 已实现 |
| 3 | 采购申请 | `PURCHASE_REQUEST` | ✅ 已实现 |
| 4 | 生产计划 | `PRODUCTION_PLAN` | ✅ 已实现 |
| 5 | 采收申请 | `HARVEST_REQUEST` | ✅ 已实现 |
| 6 | 种源补录 | `SEED_SOURCE_SUPPLEMENTARY` | ✅ 已实现 |
| 7 | 育苗补录 | `SEEDLING_SUPPLEMENTARY` | ✅ 已实现 |
| 8-18 | HR审批(11种) | LEAVE/OVERTIME等 | ✅ 已实现 |

#### 缺失/未纳入的审批类型

| 序号 | 审批类型 | 现状 | 需要工作 |
|------|----------|------|----------|
| 1 | **指标审批** | ❌ 完全缺失 | 新增审批类型 |
| 2 | **公告审批** | ⚠️ 独立在公告管理页面 | 整合到审批中心 |
| 3 | **作物入库遗漏补录审批** | ❌ 完全缺失 | 新增审批类型 |
| 4 | 种源入库审批 | ❌ 未接入 | 需新增 |
| 5 | 育苗计划审批 | ❌ 未接入 | 需新增 |
| 6 | 种植计划审批 | ❌ 未接入 | 需新增 |
| 7 | 订单创建审批 | ❌ 未接入 | 需新增 |
| 8 | 订单变更审批 | ❌ 未接入 | 需新增 |
| 9 | 任务派发审批 | ❌ 未接入 | 需新增 |
| 10 | 任务变更审批 | ❌ 未接入 | 需新增 |
| 11 | 巡查问题审批 | ❌ 未接入 | 需新增 |
| 12 | 问题整改审批 | ❌ 未接入 | 需新增 |
| 13 | 生产批次审批 | ❌ 未接入 | 需新增 |
| 14 | 批次变更审批 | ❌ 未接入 | 需新增 |
| 15 | 批次作废审批 | ❌ 未接入 | 需新增 |
| 16 | 技术方案审批 | ❌ 有字段无对接 | 需对接 |
| 17 | 物料入库审批 | ❌ 未接入 | 需新增 |
| 18 | 库存调拨审批 | ❌ 未接入 | 需新增 |
| 19 | 预算编制审批 | ❌ 未接入 | 需新增 |
| 20 | 预算调整审批 | ❌ 未接入 | 需新增 |

### 1.3 系统模块全景分析

#### 各模块审批状态盘点

| 一级模块 | 二级模块 | 页面文件 | 当前审批状态 | 风险分析 |
|---------|---------|---------|------------|---------|
| 作物管理 | 种源管理 | SeedSourcePage.tsx | ❌ 未接入 | 🔴 高风险：种源入库涉及资金支出，无审批管控 |
| 作物管理 | 育苗管理 | SeedlingPage.tsx | ❌ 未接入 | 🟡 中风险：育苗计划影响种源消耗 |
| 作物管理 | 种植管理 | PlantingPage.tsx | ❌ 未接入 | 🟡 中风险：种植操作影响种源/育苗库存 |
| 作物管理 | 采收入库 | HarvestPage.tsx | ⚠️ 有审批但联动不完整 | 🟡 中风险：审批类型存在但联动不完整 |
| 作物管理 | 订单管理 | OrderPage.tsx | ❌ 未接入 | 🔴 高风险：订单涉及销售金额，可直接创建 |
| 作物管理 | 实例追溯 | InstancePage.tsx | N/A | 纯查询，无需审批 |
| 农事管理 | 任务派发 | TaskDispatchPage.tsx | ❌ 未接入 | 🔴 高风险：任务派发直接安排人员工作 |
| 农事管理 | 任务中心 | TasksPage.tsx | ❌ 未接入 | 🟡 中风险：任务变更影响已安排工作 |
| 农事管理 | 巡查管理 | InspectionPage.tsx | ❌ 未接入 | 🟡 中风险：问题分派和处理无审批确认 |
| 农事管理 | 问题分派 | ProblemDispatchPage.tsx | ❌ 未接入 | 🟡 中风险：整改验收无审批 |
| 生产管理 | 生产计划 | ProductionPage.tsx | ⚠️ 有审批但联动不完整 | 🟡 中风险：审批类型存在但联动不完整 |
| 生产管理 | 采购计划 | PurchasePlanPage.tsx | ⚠️ 有审批但流程不完整 | 🟡 中风险：审批联动但流程不完整 |
| 生产管理 | 技术方案 | TechSolutionPage.tsx | ❌ 有字段但无对接 | 🟡 中风险：技术方案发布无审批中心对接 |
| 物料管理 | 物料入库 | MaterialReceivingPage.tsx | ❌ 未接入 | 🔴 高风险：物料入库涉及资金，可直接入库 |
| 物料管理 | 物料领用 | MaterialApproval.tsx | ✅ 已接入 | 已完整接入审批中心 |
| 物料管理 | 物料退库 | MaterialReturnPage.tsx | ❌ 未接入 | 🟡 中风险：退料操作影响库存准确性 |
| 物料管理 | 库存管理 | WarehousePage.tsx | ❌ 未接入 | 🟡 中风险：库存调拨无审批 |
| 人工管理 | 请假~转岗 | LeavePage.tsx 等 | ✅ 已接入 | HR类审批已完整接入 |
| 成本管理 | 成本核算 | CostAccounting.tsx | ❌ 未接入 | 🟡 中风险：预算编制/调整无审批 |
| 成本管理 | 预算管理 | BudgetPage.tsx | ❌ 未接入 | 🟡 中风险：预算无审批 |

### 1.4 数据流现状

```
业务模块提交
    │
    ▼
生成审批单 ──→ ApprovalContext (localStorage)
    │                │
    │                ▼
    │        审批人操作 (approve/reject)
    │                │
    │                ▼
    │        executeApprovalIntegration
    │                │
    ▼                ▼
业务状态更新 ←── 业务模块 handler
```

### 1.5 业务联动现状

| 联动场景 | 处理器状态 |
|----------|-----------|
| 领料单审批通过 → 库存减少 | ⚠️ TODO |
| 采购申请审批通过 → 采购状态更新 | ⚠️ TODO |
| 生产计划审批通过 → 创建生产批次 | ❌ 未实现 |
| 采收申请审批通过 → 更新采收记录 | ❌ 未实现 |
| 其他14+种审批联动 | ❌ 未实现 |

---

## 二、设计目标

### 2.1 完整审批类型清单（37种）

#### 业务审批（10种）

| 序号 | 审批类型 | 枚举值 | 业务模块 | 说明 |
|------|----------|--------|----------|------|
| 1 | 领料申请 | `MATERIAL_REQUEST` | 物料管理 | 物资/领料申请 |
| 2 | 退料单 | `RETURN_MATERIAL` | 物料管理 | 物料退库 |
| 3 | 采购申请 | `PURCHASE_REQUEST` | 物料管理 | 采购计划 |
| 4 | 物料入库 | `MATERIAL_INBOUND` | 物料管理 | 物料入库审批 |
| 5 | 库存调拨 | `MATERIAL_TRANSFER` | 物料管理 | 仓库间调拨 |
| 6 | 种源入库 | `SEED_SOURCE_INBOUND` | 作物管理 | 种源采购入库 |
| 7 | 育苗计划 | `SEEDLING_PLAN` | 作物管理 | 育苗计划审批 |
| 8 | 种植计划 | `PLANTING_PLAN` | 作物管理 | 种植计划审批 |
| 9 | 订单创建 | `ORDER_CREATE` | 作物管理 | 销售订单审批 |
| 10 | 订单变更 | `ORDER_CHANGE` | 作物管理 | 订单修改审批 |

#### 生产审批（5种）

| 序号 | 审批类型 | 枚举值 | 说明 |
|------|----------|--------|------|
| 11 | 生产计划 | `PRODUCTION_PLAN` | 生产计划申请 |
| 12 | 生产批次 | `PRODUCTION_BATCH` | 生产批次创建 |
| 13 | 批次变更 | `BATCH_CHANGE` | 批次信息变更 |
| 14 | 批次作废 | `BATCH_VOID` | 批次作废审批 |
| 15 | 技术方案 | `TECH_SOLUTION` | 技术方案发布 |

#### 农事审批（4种）

| 序号 | 审批类型 | 枚举值 | 说明 |
|------|----------|--------|------|
| 16 | 任务派发 | `TASK_DISPATCH` | 农事任务派发 |
| 17 | 任务变更 | `TASK_CHANGE` | 已派发任务变更 |
| 18 | 巡查问题 | `INSPECTION_ISSUE` | 巡查发现问题 |
| 19 | 问题整改 | `ISSUE_RESOLVE` | 问题整改验收 |

#### 采收审批（1种）

| 序号 | 审批类型 | 枚举值 | 说明 |
|------|----------|--------|------|
| 20 | 采收申请 | `HARVEST_REQUEST` | 采收记录审批 |

#### 作物补录审批（3种）

| 序号 | 审批类型 | 枚举值 | 说明 |
|------|----------|--------|------|
| 21 | 种源补录 | `SEED_SOURCE_SUPPLEMENTARY` | 种源记录补录 |
| 22 | 育苗补录 | `SEEDLING_SUPPLEMENTARY` | 育苗记录补录 |
| 23 | 作物入库补录 | `CROP_STORAGE_SUPPLEMENTARY` | 作物入库遗漏补录 |

#### 指标/公告审批（2种）

| 序号 | 审批类型 | 枚举值 | 说明 |
|------|----------|--------|------|
| 24 | 指标审批 | `INDICATOR_APPROVAL` | 指标数据/考核审批 |
| 25 | 公告审批 | `ANNOUNCEMENT_APPROVAL` | 公告发布审批 |

#### 成本审批（2种）

| 序号 | 审批类型 | 枚举值 | 说明 |
|------|----------|--------|------|
| 26 | 预算编制 | `BUDGET_CREATE` | 预算编制审批 |
| 27 | 预算调整 | `BUDGET_ADJUST` | 预算调整审批 |

#### HR审批（11种）

| 序号 | 审批类型 | 枚举值 | 说明 |
|------|----------|--------|------|
| 28 | 请假 | `LEAVE` | 请假申请 |
| 29 | 加班 | `OVERTIME` | 加班申请 |
| 30 | 离职 | `RESIGNATION` | 离职申请 |
| 31 | 招聘 | `RECRUITMENT` | 招聘申请 |
| 32 | 入职 | `ONBOARDING` | 入职办理 |
| 33 | 考勤补录 | `ATTENDANCE_REPAIR` | 考勤异常补录 |
| 34 | 调薪 | `SALARY_ADJUSTMENT` | 调薪申请 |
| 35 | 合同续签 | `CONTRACT_RENEWAL` | 合同续签 |
| 36 | 工资预算 | `SALARY_BUDGET` | 工资预算 |
| 37 | 转岗 | `TRANSFER` | 转岗申请 |

### 2.2 菜单合并目标

**After (4个子菜单):**
```
审批中心
├── 审批中心（统一审批入口 - 37种审批类型）
├── 我的申请（所有用户）
├── 公告审批（公告管理模块）
└── 工作流配置（管理员）
```

### 2.3 数据流闭环目标

```
审批提交 → 领导审批 → 审批通过 → executeApprovalIntegration → 触发业务模块更新 → 刷新业务数据
```

### 2.4 权限管理说明

> **注意**：本系统的权限管理通过后台【系统设置】模块进行配置，不需要在前端代码中硬编码角色判断。
>
> 管理员可在后台为不同用户/角色分配以下权限：
> - 审批中心访问权限
> - 我的申请访问权限
> - 公告审批权限
> - 工作流配置权限
> - 审批操作权限（通过/拒绝/部分通过）
> - 审批查看权限（查看他人提交的审批）

---

## 三、核心功能设计

### 3.1 批量审批功能

#### 3.1.1 设计原则

- 所有审批流程统一支持"单审"和"批审"两种模式
- 批量审批时，每个审批单独立执行业务联动，互不影响
- 批量操作结果需展示成功/失败明细，支持失败重试

#### 3.1.2 批量审批支持矩阵

| 审批类型 | 支持批量通过 | 支持批量拒绝 | 支持批量部分通过 | 说明 |
|---------|------------|------------|----------------|------|
| 物料类(领料/退料/入库/调拨) | ✅ | ✅ | ❌ | 可批量 |
| 采购类 | ✅ | ✅ | ❌ | 可批量 |
| 计划类(生产/育苗/种植) | ✅ | ✅ | ❌ | 可批量 |
| 订单类 | ✅ | ✅ | ❌ | 建议单审 |
| 批次类 | ✅ | ✅ | ❌ | 建议单审 |
| 任务类 | ✅ | ✅ | ❌ | 可批量 |
| 技术方案 | ✅ | ✅ | ❌ | 建议单审 |
| 预算类 | ✅ | ✅ | ❌ | 可批量 |
| HR类(请假/加班/考勤) | ✅ | ✅ | ❌ | 可批量 |
| **HR敏感类(离职/招聘/入职/调薪/合同/工资/转岗)** | ❌ | ❌ | ❌ | **必须单审** |

#### 3.1.3 批量审批交互设计

```
┌─────────────────────────────────────────────────────────────┐
│  审批中心                                                    │
├─────────────────────────────────────────────────────────────┤
│  [筛选条件区域...]                                           │
├─────────────────────────────────────────────────────────────┤
│  [✓] 全选      [批量通过] [批量拒绝] [批量导出]              │
├─────────────────────────────────────────────────────────────┤
│  ✓ │ 审批单号  │ 类型     │ 申请人 │ 申请日期 │ 状态      │
│  ──┼──────────┼─────────┼───────┼─────────┼──────────  │
│  ✓ │ SP2026001│ 种源入库 │ 张三   │ 04-27   │ 待审批    │
│  ✓ │ SP2026002│ 种源入库 │ 李四   │ 04-27   │ 待审批    │
│  ☐ │ DD2026001│ 订单创建 │ 王五   │ 04-26   │ 待审批    │ ← 灰色不可选
│  ✓ │ CG2026001│ 采购申请 │ 赵六   │ 04-25   │ 待审批    │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.4 批量审批核心接口

```typescript
// 批量审批结果
interface BatchApprovalResult {
  total: number;           // 总数
  success: number;         // 成功数
  failed: number;          // 失败数
  details: Array<{
    id: string;
    code: string;
    success: boolean;
    status: ApprovalStatus;
    error?: string;        // 失败原因
  }>;
}

// ApprovalContext 批量操作
interface ApprovalContextValue {
  batchApprove: (ids: string[], comment?: string) => BatchApprovalResult;
  batchReject: (ids: string[], comment: string) => BatchApprovalResult;
  batchPartialApprove: (items: BatchPartialApproveItem[]) => BatchApprovalResult;
}
```

### 3.2 审批分级机制

| 审批级别 | 触发条件 | 审批节点 | 适用场景 |
|---------|---------|---------|---------|
| 免审批 | 金额 < 500 元 | 无 | 小额领料、日常用品采购 |
| 快速审批 | 金额 < 2000 元 | 1级（直属上级） | 常规采购、标准任务派发 |
| 标准审批 | 金额 < 10000 元 | 2级（部门+财务） | 种源入库、订单创建 |
| 严格审批 | 金额 ≥ 10000 元 | 3级（部门+财务+总经理） | 大额采购、大额订单 |

### 3.3 审批前置校验

提交审批前自动校验：
- 领料单：库存是否充足
- 采购申请：预算是否充足
- 订单创建：客户信用是否良好
- 种源入库：供应商是否合规
- 任务派发：人员是否可用

### 3.4 审批通知机制

| 场景 | 触发时机 | 接收人 | 通知内容 |
|------|---------|--------|---------|
| 提交审批 | 申请人提交审批单 | 当前审批节点审批人 | "您有新的【XX】审批待处理" |
| 审批通过 | 当前节点审批通过 | 申请人 + 下一节点审批人 | "您的【XX】审批已通过一级审批" |
| 审批拒绝 | 审批被驳回 | 申请人 | "您的【XX】审批已被驳回（原因：XX）" |
| 审批撤回 | 申请人撤回 | 已审批节点审批人 | "【XX】审批已被申请人撤回" |
| 审批超时 | 超过设定时间未审批 | 审批人 + 上级 | "【XX】审批已超时，请尽快处理" |
| 全部通过 | 所有节点审批完成 | 申请人 | "您的【XX】审批已全部通过" |

### 3.5 审批超时与委托机制

| 审批类型 | 超时时间 | 超时后动作 |
|---------|---------|-----------|
| 紧急审批 | 4小时 | 自动升级至上级 |
| 普通业务审批 | 48小时 | 发送催办提醒 |
| HR审批 | 24小时 | 发送催办提醒 |
| 财务审批 | 72小时 | 发送催办提醒 |
| 终极超时(7天) | 168小时 | 自动转交至代理人或上级 |

---

## 四、页面合并方案

### 4.1 新建页面

| 页面 | 路由 | 功能 | 说明 |
|------|------|------|------|
| 我的申请 | `/my-applications` | 查看自己提交的审批进展 | 新建，合并待办/已办/我提交 |

### 4.2 扩展页面

| 页面 | 扩展内容 |
|------|----------|
| 审批中心 `/approvals` | 支持全部37种审批类型Tab |

### 4.3 删除页面

| 页面 | 路由 | 删除原因 |
|------|------|----------|
| MaterialApproval | `/material-approval` | 合并到审批中心 |
| ProductionApproval | `/production-approval` | 合并到审批中心 |
| PendingApproval | `/pending-approval` | 合并到我的申请 |
| Approved | `/approved` | 合并到我的申请 |
| MyApproval | `/my-approval` | 重命名为我的申请 |
| ApprovalDemo | `/approval-demo` | 演示页面，生产不需要 |
| ApprovalFlowPage | `/approval/approval-flow` | 合并到工作流配置 |
| HrApproval (settings下) | `/settings/personnel/hr-approval` | 重复路由 |

---

## 五、数据流闭环方案

### 5.1 完整业务联动清单（37种）

| 序号 | 审批类型 | 联动动作 | 目标模块 | 实现文件 |
|------|----------|----------|----------|----------|
| 1 | 领料单 | 库存减少 | 仓库管理 | useInventoryStore |
| 2 | 退料单 | 库存增加 | 仓库管理 | useInventoryStore |
| 3 | 采购申请 | 状态更新为"采购中" | 采购管理 | usePurchasePlanStore |
| 4 | 物料入库 | 库存增加 | 仓库管理 | useInventoryStore |
| 5 | 库存调拨 | 多仓库库存调整 | 仓库管理 | useInventoryStore |
| 6 | 种源入库 | 种源状态更新+创建实例 | 种源管理 | useSeedSourceStore |
| 7 | 育苗计划 | 育苗状态更新 | 育苗管理 | useSeedlingStore |
| 8 | 种植计划 | 种植记录更新 | 种植管理 | usePlantingStore |
| 9 | 订单创建 | 订单状态更新为"已确认" | 订单管理 | useOrderStore |
| 10 | 订单变更 | 订单信息更新 | 订单管理 | useOrderStore |
| 11 | 生产计划 | 创建生产批次 | 生产管理 | useProductionStore |
| 12 | 生产批次 | 批次状态更新 | 生产批次管理 | useBatchStore |
| 13 | 批次变更 | 批次信息更新 | 生产批次管理 | useBatchStore |
| 14 | 批次作废 | 批次作废处理 | 生产批次管理 | useBatchStore |
| 15 | 技术方案 | 方案状态更新为"已发布" | 技术方案管理 | useTechSolutionStore |
| 16 | 任务派发 | 任务状态更新为"待接受" | 任务管理 | useTaskStore |
| 17 | 任务变更 | 任务信息更新 | 任务管理 | useTaskStore |
| 18 | 巡查问题 | 问题分派处理 | 巡查管理 | useInspectionStore |
| 19 | 问题整改 | 整改验收通过 | 问题管理 | useProblemStore |
| 20 | 采收申请 | 采收状态更新 | 采收管理 | useHarvestStore |
| 21 | 种源补录 | 种源记录状态更新 | 种源管理 | useSeedSourceStore |
| 22 | 育苗补录 | 育苗记录状态更新 | 育苗管理 | useSeedlingStore |
| 23 | 作物入库补录 | 入库记录状态更新 | 作物管理 | useCropStorageStore |
| 24 | 指标审批 | 指标状态更新 | 指标管理 | useIndicatorStore |
| 25 | 公告审批 | 公告状态更新为"已发布" | 公告管理 | useAnnouncementStore |
| 26 | 预算编制 | 预算状态更新 | 预算管理 | useBudgetStore |
| 27 | 预算调整 | 预算调整生效 | 预算管理 | useBudgetStore |
| 28 | 请假 | 考勤记录更新 | 考勤管理 | useAttendanceStore |
| 29 | 加班 | 加班记录更新 | 考勤管理 | useAttendanceStore |
| 30 | 离职 | 员工状态更新 | 人员管理 | useStaffStore |
| 31 | 招聘 | 招聘流程更新 | 招聘管理 | useRecruitmentStore |
| 32 | 入职 | 员工入职办理 | 人员管理 | useStaffStore |
| 33 | 考勤补录 | 考勤记录更新 | 考勤管理 | useAttendanceStore |
| 34 | 调薪 | 薪资记录更新 | 薪资管理 | useSalaryStore |
| 35 | 合同续签 | 合同状态更新 | 合同管理 | useContractStore |
| 36 | 工资预算 | 预算审批生效 | 薪资管理 | useSalaryStore |
| 37 | 转岗 | 员工岗位更新 | 人员管理 | useStaffStore |

### 5.2 联动触发机制

```typescript
// ApprovalContext.tsx 审批操作时
const approve = useCallback(async (id: string, comment?: string) => {
  const approval = state.approvals.find(a => a.id === id);
  if (approval) {
    executeApprovalIntegration('approved', approval, { comment });
  }
  await fetch(`${API_BASE}/${id}/action`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'approve', comment }),
  });
  await loadApprovalsFromAPI();
}, []);

// 批量审批执行
const batchApprove = useCallback((ids: string[], comment?: string): BatchApprovalResult => {
  const result: BatchApprovalResult = { total: ids.length, success: 0, failed: 0, details: [] };
  for (const id of ids) {
    try {
      const approval = state.approvals.find(a => a.id === id);
      if (approval) {
        executeApprovalIntegration('approved', approval, { comment });
        dispatch({ type: 'APPROVE', payload: { id, comment } });
        result.details.push({ id, code: approval.code, success: true, status: 'approved' });
        result.success++;
      }
    } catch (error) {
      result.details.push({ id, code: approval.code, success: false, status: approval.status, error: String(error) });
      result.failed++;
    }
  }
  return result;
}, [state.approvals]);
```

---

## 六、文件修改清单

### 6.1 新建文件

| 文件路径 | 说明 |
|----------|------|
| `src/pages/MyApplications.tsx` | 我的申请页面 |
| `src/stores/useIndicatorStore.ts` | 指标状态管理Store |
| `src/stores/useAnnouncementStore.ts` | 公告状态管理Store |
| `src/stores/useCropStorageStore.ts` | 作物入库状态管理Store |
| `src/stores/useOrderStore.ts` | 订单状态管理Store |
| `src/stores/useTaskStore.ts` | 任务状态管理Store |
| `src/stores/useInspectionStore.ts` | 巡查状态管理Store |
| `src/stores/useBudgetStore.ts` | 预算状态管理Store |
| `src/components/approval/BatchActionBar.tsx` | 批量操作栏 |
| `src/components/approval/BatchConfirmModal.tsx` | 批量确认弹窗 |
| `src/components/approval/BatchResultModal.tsx` | 批量结果弹窗 |
| `src/components/approval/ApprovalTimeline.tsx` | 审批时间轴 |
| `src/components/approval/BusinessPreview.tsx` | 业务单据预览 |

### 6.2 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/types/approval.ts` | 扩展ApprovalType枚举至37种+扩展BusinessLink |
| `src/pages/Approvals.tsx` | 扩展支持全部37种审批类型Tab+批量审批UI |
| `src/App.tsx` | 删除冗余路由，新增/my-applications |
| `src/components/layout/Sidebar.tsx` | 精简菜单 |
| `src/types/approvalIntegration.ts` | 实现全部37种联动处理器 |
| `src/contexts/ApprovalContext.tsx` | 添加批量审批方法+通知机制 |

### 6.3 删除文件

| 文件路径 |
|----------|
| `src/pages/MaterialApproval.tsx` |
| `src/pages/ProductionApproval.tsx` |
| `src/pages/PendingApproval.tsx` |
| `src/pages/Approved.tsx` |
| `src/pages/MyApproval.tsx` |
| `src/pages/ApprovalDemo.tsx` |
| `src/pages/approval/ApprovalFlowPage.tsx` |

---

## 七、系统深入分析

### 7.1 系统架构总览

通过对系统源代码的全面梳理，种植管理系统采用以下技术架构：

| 层级 | 技术栈 | 说明 |
|------|--------|------|
| 前端框架 | React 18 + TypeScript | 函数组件 + Hooks 模式 |
| 构建工具 | Vite | 开发端口 5188，strictPort |
| 样式方案 | Tailwind CSS + shadcn/ui | 原子化 CSS，组件库 |
| 状态管理 | React Context + useReducer | 审批中心使用此模式 |
| 数据持久化 | localStorage | 所有业务数据本地存储 |
| 路由 | React Router | 页面级路由 |
| 图标 | Lucide React | 统一图标库 |

### 7.2 业务模块全景分析

系统共 **122 个页面**，分布在以下 7 大业务域：

#### 作物管理域（6个页面）

| 页面 | 核心功能 | 当前审批状态 | 风险分析 |
|------|---------|------------|---------|
| SeedSource（种源管理） | 种子/种苗入库、库存管理、溯源 | ❌ 未接入 | 🔴 **高风险**：种源入库涉及资金支出，目前无任何审批管控 |
| Seedling（育苗管理） | 育苗计划、每日记录、状态跟踪 | ❌ 未接入 | 🟡 中风险：育苗计划影响种源消耗 |
| Planting（种植管理） | 定植记录、生长跟踪、采收管理 | ❌ 未接入 | 🟡 中风险：种植操作影响种源/育苗库存 |
| Harvest（采收入库） | 采收记录、入库管理 | ⚠️ 有审批但联动不完整 | 🟡 中风险：采收申请审批存在但联动不完整 |
| Order（订单管理） | 销售订单、客户管理、订单跟踪 | ❌ 未接入 | 🔴 **高风险**：订单涉及销售金额，目前可直接创建 |
| Instance（实例追溯） | 作物实例全生命周期追溯 | N/A | 纯查询，无需审批 |

#### 农事管理域（4个页面）

| 页面 | 核心功能 | 当前审批状态 | 风险分析 |
|------|---------|------------|---------|
| TaskDispatch（任务派发） | 农事任务创建、派发、人员分配 | ❌ 未接入 | 🔴 **高风险**：任务派发直接安排人员工作 |
| Tasks（任务中心） | 任务执行、进度跟踪、任务变更 | ❌ 未接入 | 🟡 中风险：任务变更影响已安排工作 |
| Inspection（巡查管理） | 巡查记录、问题发现、拍照存档 | ❌ 未接入 | 🟡 中风险：巡查问题分派和处理无审批确认 |
| ProblemDispatch（问题分派） | 问题分派、整改跟踪、验收 | ❌ 未接入 | 🟡 中风险：问题整改验收无审批 |

#### 生产管理域（2个页面）

| 页面 | 核心功能 | 当前审批状态 | 风险分析 |
|------|---------|------------|---------|
| Production（生产计划） | 生产批次、计划制定、进度跟踪 | ⚠️ 有审批但联动不完整 | 🟡 中风险：生产计划审批存在但联动不完整 |
| TechSolution（技术方案） | 技术方案编制、版本管理、发布 | ❌ 有字段但无对接 | 🟡 中风险：技术方案发布无审批中心对接 |

#### 物料管理域（4个页面）

| 页面 | 核心功能 | 当前审批状态 | 风险分析 |
|------|---------|------------|---------|
| MaterialReceiving（物料入库） | 入库单、质检、库存增加 | ❌ 未接入 | 🔴 **高风险**：物料入库涉及资金，可直接入库 |
| MaterialApproval（物料领用） | 领料申请、审批、库存扣减 | ✅ 已接入 | 已完整接入审批中心 |
| MaterialReturn（物料退库） | 退料单、库存增加 | ❌ 未接入 | 🟡 中风险：退料操作影响库存准确性 |
| Warehouse（库存管理） | 库存查询、调拨、盘点 | ❌ 未接入 | 🟡 中风险：库存调拨无审批 |

#### 人工管理域（10个页面）

> **关键发现**：HR 类 11 项审批已全部接入。

| 页面 | 核心功能 | 当前审批状态 |
|------|---------|------------|
| Leave（请假） | 请假申请、审批、假期扣减 | ✅ 已接入 |
| Overtime（加班） | 加班申请、审批、工时统计 | ✅ 已接入 |
| Resignation（离职） | 离职申请、审批、交接 | ✅ 已接入 |
| Recruitment（招聘） | 招聘申请、审批、发布 | ✅ 已接入 |
| Onboarding（入职） | 入职办理、审批，建档 | ✅ 已接入 |
| AttendanceRepair（考勤补录） | 补录申请、审批 | ✅ 已接入 |
| SalaryAdjustment（调薪） | 调薪申请、审批 | ✅ 已接入 |
| ContractRenewal（合同续签） | 续签申请、审批 | ✅ 已接入 |
| SalaryBudget（工资预算） | 预算编制、审批 | ✅ 已接入 |
| Transfer（转岗） | 转岗申请、审批 | ✅ 已接入 |

### 7.3 现有审批中心能力评估

#### 已实现的能力

| 能力项 | 实现状态 | 说明 |
|--------|---------|------|
| 审批类型枚举 | ✅ 14种 | 业务5种 + HR 11种（含TRANSFER） |
| 审批状态管理 | ✅ 6种状态 | DRAFT/PENDING/APPROVED/PARTIALLY_APPROVED/REJECTED/CANCELLED |
| 审批人管理 | ✅ | 多级审批人，支持顺序审批 |
| 业务联动框架 | ✅ | 注册表模式，支持扩展 |
| 单条审批操作 | ✅ | approve/reject/partiallyApprove/cancel |
| localStorage 持久化 | ✅ | 自动加载/保存 |
| 审批列表 UI | ✅ | ApprovalList 组件 |
| 审批详情 UI | ✅ | ApprovalDetail 组件 |
| 审批筛选 UI | ✅ | ApprovalFilters 组件 |

#### 缺失的核心能力

| 能力项 | 缺失影响 | 严重程度 |
|--------|---------|---------|
| 批量审批操作 | 无法一次性处理多个审批单 | 🔴 高 |
| 审批权限矩阵 | 无法精细控制谁可以审批什么 | 🔴 高 |
| 审批通知机制 | 审批流转时无消息推送 | 🔴 高 |
| 审批超时处理 | 审批人长期不处理导致流程卡住 | 🟡 中 |
| 审批委托/代理人 | 审批人休假时无法委托他人 | 🟡 中 |
| 审批历史审计 | 缺乏完整的操作日志 | 🟡 中 |
| 审批统计报表 | 无法分析审批效率和瓶颈 | 🟡 中 |
| 审批模板配置 | 审批流程硬编码，无法动态配置 | 🟡 中 |

---

## 八、审批权限矩阵设计

### 8.1 角色定义

| 角色代码 | 角色名称 | 说明 |
|---------|---------|------|
| `employee` | 普通员工 | 可提交审批，查看自己的审批 |
| `department_head` | 部门负责人 | 可审批本部门员工提交的审批 |
| `warehouse_manager` | 仓库管理员 | 可审批物料相关审批 |
| `finance` | 财务审核 | 可审批涉及资金的审批 |
| `hr_manager` | HR主管 | 可审批人事相关审批 |
| `supervisor` | 分管领导 | 可审批跨部门或大额审批 |
| `general_manager` | 总经理 | 可审批所有审批，终审权限 |
| `admin` | 系统管理员 | 可查看所有审批，可转移审批 |

### 8.2 业务审批权限矩阵

| 审批类型 | 普通员工 | 部门负责人 | 仓库管理员 | 财务 | 分管领导 | 总经理 |
|---------|---------|-----------|-----------|------|---------|--------|
| 领料单 | 提交✅ | 1级审批✅ | 2级审批✅ | — | — | — |
| 采购申请 | 提交✅ | 1级审批✅ | — | 2级审批✅ | — | >5000终审✅ |
| 生产计划 | 提交✅ | 1级审批✅ | — | — | 2级审批✅ | — |
| 采收申请 | 提交✅ | 1级审批✅ | 2级审批✅ | — | — | — |
| 退料单 | 提交✅ | — | 1级审批✅ | — | — | — |
| 种源入库 | 提交✅ | 1级审批✅ | — | 2级审批✅ | — | >5000终审✅ |
| 物料入库 | 提交✅ | — | 1级审批✅ | 2级审批✅ | — | — |
| 库存调拨 | 提交✅ | — | 1级审批✅ | — | — | — |
| 订单创建 | 提交✅ | — | — | 1级审批✅ | 2级审批✅ | >10000终审✅ |
| 订单变更 | 提交✅ | — | — | 1级审批✅ | 2级审批✅ | — |

#### 生产审批权限矩阵

| 审批类型 | 普通员工 | 部门负责人 | 生产主管 | 技术总监 | 总经理 |
|---------|---------|-----------|---------|---------|--------|
| 育苗计划 | 提交✅ | 1级审批✅ | — | — | — |
| 种植计划 | 提交✅ | 1级审批✅ | — | — | — |
| 生产批次 | 提交✅ | 1级审批✅ | 2级审批✅ | — | — |
| 批次变更 | 提交✅ | 1级审批✅ | 2级审批✅ | — | — |
| 批次作废 | 提交✅ | 1级审批✅ | — | — | 终审✅ |
| 技术方案 | 提交✅ | — | 1级审批✅ | 2级审批✅ | — |

#### 农事审批权限矩阵

| 审批类型 | 普通员工 | 部门负责人 | 农事主管 | 总经理 |
|---------|---------|-----------|---------|--------|
| 任务派发 | 提交✅ | 1级审批✅ | — | — |
| 任务变更 | 提交✅ | 1级审批✅ | — | — |
| 巡查问题 | 提交✅ | — | 1级审批✅ | — |
| 问题整改 | 提交✅ | — | 1级审批✅ | — |

#### 成本审批权限矩阵

| 审批类型 | 普通员工 | 部门负责人 | 财务 | 总经理 |
|---------|---------|-----------|------|--------|
| 预算编制 | 提交✅ | 1级审批✅ | 2级审批✅ | 终审✅ |
| 预算调整 | 提交✅ | 1级审批✅ | 2级审批✅ | 终审✅ |

#### HR审批权限矩阵

| 审批类型 | 普通员工 | 部门负责人 | HR主管 | 总经理 |
|---------|---------|-----------|--------|--------|
| 请假 | 提交✅ | 1级审批✅ | — | >3天终审✅ |
| 加班 | 提交✅ | 1级审批✅ | — | — |
| 离职 | 提交✅ | 1级审批✅ | 2级审批✅ | — |
| 招聘 | 提交✅ | 1级审批✅ | 2级审批✅ | — |
| 入职 | — | — | 提交✅ | 审批✅ |
| 考勤补录 | 提交✅ | 1级审批✅ | — | — |
| 调薪 | — | 1级审批✅ | 2级审批✅ | 终审✅ |
| 合同续签 | — | 1级审批✅ | 2级审批✅ | — |
| 工资预算 | — | — | 提交✅ | 审批✅ |
| 转岗 | 提交✅ | 1级审批✅ | 2级审批✅ | — |

---

## 九、审批通知与消息机制

### 9.1 通知场景

| 场景 | 触发时机 | 接收人 | 通知内容 |
|------|---------|--------|---------|
| 提交审批 | 申请人提交审批单 | 当前审批节点审批人 | "您有新的【种源入库】审批待处理（申请人：张三）" |
| 审批通过 | 当前节点审批通过 | 申请人 + 下一节点审批人 | "您的【种源入库】审批已通过一级审批，进入财务审核" |
| 审批拒绝 | 审批被驳回 | 申请人 | "您的【种源入库】审批已被驳回（原因：预算不足）" |
| 审批撤回 | 申请人撤回 | 已审批节点审批人 | "【种源入库】审批已被申请人撤回" |
| 审批转交 | 审批人转交给他人 | 被转交人 | "李四将【种源入库】审批转交给您处理" |
| 审批超时 | 超过设定时间未审批 | 审批人 + 上级 | "【种源入库】审批已超时 48 小时，请尽快处理" |
| 全部通过 | 所有节点审批完成 | 申请人 | "您的【种源入库】审批已全部通过，已生效" |

### 9.2 通知渠道

```
┌─────────────────────────────────────────────┐
│              审批通知中心                      │
├─────────────────────────────────────────────┤
│  渠道1: 系统消息（Messages 页面）              │
│  ├── 持久化存储，支持历史查询                  │
│  ├── 支持标记已读/未读                        │
│  └── 支持消息分类筛选                         │
│                                              │
│  渠道2: 页面 Badge 角标                       │
│  ├── 顶部导航栏显示待审批数量                  │
│  ├── 侧边栏菜单项显示红点标记                  │
│  └── 实时更新（轮询或事件驱动）                │
│                                              │
│  渠道3: 审批单内提醒                          │
│  ├── 审批列表中"紧急"标记高亮                  │
│  ├── 临近超时显示倒计时                       │
│  └── 已超时显示红色警告                       │
└─────────────────────────────────────────────┘
```

### 9.3 消息数据结构

```typescript
interface ApprovalNotification {
  id: string;
  type: 'submit' | 'approve' | 'reject' | 'cancel' | 'transfer' | 'timeout' | 'complete';
  approvalId: string;
  approvalCode: string;
  approvalType: ApprovalType;
  title: string;
  content: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  actionUrl?: string;
}
```

### 9.4 通知实现方案

```typescript
class ApprovalNotificationService {
  static send(notification: Omit<ApprovalNotification, 'id' | 'createdAt'>): void {
    const fullNotification: ApprovalNotification = {
      ...notification,
      id: 'NOTIF_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    this.saveNotification(fullNotification);
    this.updateBadgeCount(notification.receiverId);
    window.dispatchEvent(new CustomEvent('approval-notification', { detail: fullNotification }));
  }

  static sendBatch(notifications: Omit<ApprovalNotification, 'id' | 'createdAt'>[]): void {
    notifications.forEach(n => this.send(n));
  }

  static getUnreadCount(userId: string): number {
    const notifications = this.getNotifications(userId);
    return notifications.filter(n => !n.isRead).length;
  }
}
```

---

## 十、审批超时与委托机制

### 10.1 超时机制设计

| 审批类型 | 超时时间 | 超时后动作 | 通知对象 |
|---------|---------|-----------|---------|
| 紧急审批（标记为urgent） | 4小时 | 自动升级至上级 | 审批人 + 上级 |
| 普通业务审批 | 48小时 | 发送催办提醒 | 审批人 |
| HR审批 | 24小时 | 发送催办提醒 | 审批人 + HR主管 |
| 财务审批 | 72小时 | 发送催办提醒 | 审批人 + 财务主管 |
| 所有审批（终极超时） | 7天 | 自动转交至代理人或上级 | 审批人 + 申请人 |

### 10.2 委托/代理人机制

```typescript
interface ApprovalDelegation {
  id: string;
  delegatorId: string;      // 委托人
  delegateeId: string;      // 代理人
  startDate: string;        // 委托开始时间
  endDate: string;          // 委托结束时间
  scope: ApprovalType[] | 'all';  // 委托范围
  isActive: boolean;
}

function getEffectiveApprover(approval: Approval, config: ApprovalPermissionConfig): string {
  const currentNode = config.nodes.find(n => n.order === approval.currentStep);
  if (!currentNode) return '';
  const delegation = getActiveDelegation(currentNode.userId);
  if (delegation) return delegation.delegateeId;
  return currentNode.userId;
}
```

### 10.3 自动升级机制

```
审批超时自动升级流程：

审批单提交
    │
    ▼
审批人 A（48小时未处理）
    │
    ├── 24小时：发送催办提醒
    │
    ├── 48小时：自动升级至审批人 A 的上级
    │   └── 通知：审批人 A + 上级 + 申请人
    │
    └── 7天仍未处理：
        ├── 有代理人 → 转交给代理人
        └── 无代理人 → 标记为"异常"，通知管理员
```

---

## 十一、前端页面结构与UI设计

### 11.1 审批中心页面结构

```
审批中心（/approvals）
├── 顶部统计卡片区域
│   ├── 待我审批（数量 + 链接）
│   ├── 我已审批（数量 + 链接）
│   ├── 我发起的（数量 + 链接）
│   └── 抄送我的（数量 + 链接）
│
├── 左侧筛选面板
│   ├── 审批类型（多选）
│   ├── 审批状态（多选）
│   ├── 日期范围
│   ├── 申请人
│   └── 优先级
│
├── 右侧审批列表
│   ├── 批量操作栏（全选 + 批量通过/拒绝/导出）
│   ├── 排序选项（时间/优先级/类型）
│   └── 审批单卡片列表
│       ├── 审批单号
│       ├── 类型标签
│       ├── 标题/摘要
│       ├── 申请人信息
│       ├── 当前审批节点
│       ├── 提交时间
│       ├── 优先级标记
│       └── 操作按钮（通过/拒绝/查看）
│
└── 审批详情抽屉/弹窗
    ├── 审批信息 Tab
    ├── 业务单据预览 Tab
    └── 审批记录 Tab
```

### 11.2 路由规划

| 路由 | 页面 | 说明 |
|------|------|------|
| `/approvals` | 审批中心首页 | 汇总所有审批 |
| `/approvals/pending` | 待我审批 | 当前用户需要处理的审批 |
| `/approvals/approved` | 我已审批 | 当前用户已处理的审批 |
| `/approvals/my` | 我发起的 | 当前用户提交的审批 |
| `/approvals/:id` | 审批详情 | 单条审批详情页 |
| `/approvals/config` | 审批配置 | 审批流程配置（管理员） |

### 11.3 关键组件清单

| 组件 | 文件路径 | 说明 |
|------|---------|------|
| ApprovalLayout | `components/approval/ApprovalLayout.tsx` | 审批中心布局框架 |
| ApprovalStatsCards | `components/approval/ApprovalStatsCards.tsx` | 顶部统计卡片 |
| ApprovalList | `components/approval/ApprovalList.tsx` | 审批列表（需扩展批量选择） |
| ApprovalListItem | `components/approval/ApprovalListItem.tsx` | 审批单卡片项 |
| ApprovalDetail | `components/approval/ApprovalDetail.tsx` | 审批详情（需扩展Tab） |
| ApprovalFilters | `components/approval/ApprovalFilters.tsx` | 筛选面板 |
| BatchActionBar | `components/approval/BatchActionBar.tsx` | 批量操作栏（新增） |
| BatchConfirmModal | `components/approval/BatchConfirmModal.tsx` | 批量确认弹窗（新增） |
| BatchResultModal | `components/approval/BatchResultModal.tsx` | 批量结果弹窗（新增） |
| ApprovalTimeline | `components/approval/ApprovalTimeline.tsx` | 审批时间轴 |
| BusinessPreview | `components/approval/BusinessPreview.tsx` | 业务单据预览 |

### 11.4 各业务模块接入审批的UI改造点

| 业务模块 | 页面 | 改造点 |
|---------|------|--------|
| 种源管理 | SeedSourcePage | 新增"提交审批"按钮，保存后触发审批 |
| 订单管理 | OrderPage | 新增"提交审批"按钮，保存后订单状态变为"待审批" |
| 任务派发 | TaskDispatchPage | 新增"提交审批"按钮，派发前需审批 |
| 物料入库 | MaterialReceivingPage | 新增"提交审批"按钮，入库前需审批 |
| 生产批次 | ProductionPage | 新增"提交审批"按钮，创建批次前需审批 |
| 技术方案 | TechSolutionPage | 新增"提交审批"按钮，发布前需审批 |
| 预算管理 | BudgetPage | 新增"提交审批"按钮，预算生效前需审批 |

---

## 十二、详细审批流程设计

### 12.1 种源入库审批流程

```
1. 申请人填写种源入库单
   ├── 作物信息（从品种库选择）
   ├── 供应商信息
   ├── 采购数量和单价
   ├── 采购日期
   └── 上传图片凭证

2. 提交审批
   ├── 生成审批单（ApprovalType: SEED_SOURCE_INBOUND）
   ├── 关联种源记录ID
   └── 种源状态设为"待审批"

3. 审批节点
   ├── 一级：部门负责人（审核采购必要性）
   ├── 二级：财务审核（审核预算和金额）
   └── 三级：总经理（大额采购终审，>5000元）

4. 审批结果处理
   ├── 通过：
   │   ├── 种源状态更新为"已入库"
   │   ├── 创建作物实例
   │   └── 库存增加
   └── 拒绝：
       ├── 种源状态更新为"已拒绝"
       └── 通知申请人
```

### 12.2 订单创建审批流程

```
1. 销售人员填写订单
   ├── 客户信息
   ├── 作物品种和数量
   ├── 单价和总金额
   ├── 交货日期
   └── 付款方式

2. 提交审批
   ├── 生成审批单（ApprovalType: ORDER_CREATE）
   ├── 关联订单ID
   └── 订单状态设为"待审批"

3. 审批节点
   ├── 一级：销售主管（审核客户信用和条款）
   ├── 二级：财务审核（审核价格和回款）
   └── 三级：总经理（大额订单终审，>10000元）

4. 审批结果处理
   ├── 通过：
   │   ├── 订单状态更新为"已确认"
   │   └── 创建关联生产计划（可选）
   └── 拒绝：
       ├── 订单状态更新为"已拒绝"
       └── 通知销售人员
```

### 12.3 任务派发审批流程

```
1. 任务派发人创建任务
   ├── 任务类型
   ├── 执行人员
   ├── 执行时间和温室
   ├── 任务内容
   └── 所需物料

2. 提交审批
   ├── 生成审批单（ApprovalType: TASK_DISPATCH）
   ├── 关联任务ID
   └── 任务状态设为"待审批"

3. 审批节点
   ├── 一级：生产主管（审核任务合理性）
   └── 二级：部门负责人（审核人员安排）

4. 审批结果处理
   ├── 通过：
   │   ├── 任务状态更新为"待接受"
   │   └── 通知执行人员
   └── 拒绝：
       ├── 任务状态更新为"已拒绝"
       └── 退回派发人
```

### 12.4 物料入库审批流程

```
1. 仓库管理员填写入库单
   ├── 物料信息
   ├── 供应商
   ├── 入库数量
   ├── 单价和金额
   └── 质检结果

2. 提交审批
   ├── 生成审批单（ApprovalType: MATERIAL_INBOUND）
   ├── 关联入库单ID
   └── 入库单状态设为"待审批"

3. 审批节点
   ├── 一级：仓库主管（审核数量和质量）
   └── 二级：财务审核（审核金额）

4. 审批结果处理
   ├── 通过：
   │   ├── 入库单状态更新为"已入库"
   │   └── 库存增加
   └── 拒绝：
       └── 入库单状态更新为"已拒绝"
```

### 12.5 技术方案审批流程

```
1. 技术员编制方案
   ├── 作物类型
   ├── 种植阶段
   ├── 技术要点
   └── 附件文档

2. 提交审批
   ├── 生成审批单（ApprovalType: TECH_SOLUTION）
   ├── 关联方案ID
   └── 方案状态设为"审核中"

3. 审批节点
   ├── 一级：技术主管
   ├── 二级：生产主管
   └── 三级：总农艺师

4. 审批结果处理
   ├── 通过：
   │   ├── 方案状态更新为"已发布"
   │   └── 关联批次可使用
   └── 拒绝：
       ├── 方案状态更新为"已驳回"
       └── 退回技术员修改
```

---

## 十三、数据迁移与兼容性方案

### 13.1 历史数据现状

系统中已存在大量历史业务数据（种源、订单、任务等），这些数据在创建时没有走审批流程，目前处于"直接生效"状态。

### 13.2 迁移策略

#### 策略："老数据默认已审批，新数据走新流程"

```
历史数据（新流程上线前创建）
├── 不生成补录的审批单（避免数据混乱）
├── 业务状态保持不变
└── 在页面上标注"历史数据（未走审批）"

新数据（新流程上线后创建）
├── 强制走审批流程
├── 审批通过后才生效
└── 状态与审批中心同步
```

### 13.3 兼容性处理

| 场景 | 处理方案 |
|------|---------|
| 历史种源记录 | 状态保持"已入库"，不补审批单 |
| 历史订单 | 状态保持"已确认"，不补审批单 |
| 历史任务 | 状态保持"已完成"，不补审批单 |
| 新增种源 | 必须先审批，审批通过后状态变为"已入库" |
| 修改历史订单 | 走"订单变更"审批流程 |
| 混合查询 | 列表页同时展示历史数据和待审批数据，用标签区分 |

### 13.4 localStorage 数据升级

```typescript
const APPROVAL_DATA_VERSION = '2.0';

function migrateApprovalData(): void {
  const stored = localStorage.getItem(APPROVALS_STORAGE_KEY);
  if (!stored) return;

  const data = JSON.parse(stored);

  // 检查版本
  if (data.version === APPROVAL_DATA_VERSION) return;

  // v1 -> v2 迁移
  if (!data.version || data.version === '1.0') {
    // 1. 给所有历史审批单增加 batchSupported 字段（默认 false）
    data.approvals = data.approvals.map((a: Approval) => ({
      ...a,
      batchSupported: false,
    }));

    // 2. 更新版本号
    data.version = APPROVAL_DATA_VERSION;

    localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(data));
  }
}
```

---

## 十四、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| 审批流程过于复杂，用户体验下降 | 高 | 提供"快速审批"模式，小额/低风险操作可设置免审批阈值 |
| 审批状态与业务状态不同步 | 高 | 统一状态管理，所有状态变更必须通过审批中心 |
| 审批节点人员缺失导致流程卡住 | 中 | 支持代理人设置，超时自动升级 |
| 历史数据迁移问题 | 中 | 历史数据默认标记为"已审批"，新流程仅对新数据生效 |
| 审批通知过多导致疲劳 | 低 | 支持批量审批、消息合并、免打扰设置 |
| **批量审批部分失败导致数据不一致** | **高** | **每个审批单独立执行业务联动，失败单据标记异常，支持单独重试** |
| **批量审批误操作（误点批量通过）** | **中** | **批量操作前强制确认弹窗，展示审批单明细列表，需二次确认** |
| **批量审批权限越界** | **中** | **严格校验每张单据的审批权限，无权限单据灰色不可选** |

---

## 十五、基于分析的审批优化建议

### 15.1 架构层面优化

#### 建议 1：引入审批配置化机制

```typescript
interface ApprovalFlowConfig {
  type: ApprovalType;
  name: string;
  nodes: ApprovalNode[];
  batchSupported: boolean;
  partialApproveSupported: boolean;
  notificationEnabled: boolean;
  autoEscalationEnabled: boolean;
  timeoutHours: number;
}

const approvalFlowConfigs: ApprovalFlowConfig[] = [
  {
    type: ApprovalType.MATERIAL_REQUEST,
    name: '领料申请',
    nodes: [
      { order: 1, role: 'department_head', name: '部门负责人' },
      { order: 2, role: 'warehouse_manager', name: '仓库管理员' },
    ],
    batchSupported: true,
    partialApproveSupported: true,
    notificationEnabled: true,
    autoEscalationEnabled: false,
    timeoutHours: 48,
  },
];
```

#### 建议 2：建立统一的状态同步总线

```
统一状态同步总线 (ApprovalSyncBus)
├── 审批状态变更 → 推送至业务模块
├── 业务状态变更 → 推送至审批中心
├── 冲突检测 → 自动标记异常
└── 日志记录 → 完整审计链
```

#### 建议 3：审批数据与业务数据解耦

```typescript
interface Approval {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  businessId: string;
  businessType: string;
}
```

### 15.2 流程层面优化

| 审批级别 | 触发条件 | 审批节点 | 适用场景 |
|---------|---------|---------|---------|
| 免审批 | 金额 < 500 元 | 无 | 小额领料、日常用品采购 |
| 快速审批 | 金额 < 2000 元 | 1级（直属上级） | 常规采购、标准任务派发 |
| 标准审批 | 金额 < 10000 元 | 2级（部门+财务） | 种源入库、订单创建 |
| 严格审批 | 金额 ≥ 10000 元 | 3级（部门+财务+总经理） | 大额采购、大额订单 |

### 15.3 体验层面优化

- 审批待办集成到首页（Dashboard）
- 审批通知多渠道推送（系统消息 + Badge + 紧急标记）
- 审批详情页嵌入业务数据预览

### 15.4 安全层面优化

```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'submit' | 'approve' | 'reject' | 'cancel' | 'transfer' | 'escalate';
  targetType: 'approval' | 'business';
  targetId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}
```

---

## 十六、需要确认的问题

在实施之前，需要您确认：

1. **库存减少接口**：领料审批通过后，库存减少的逻辑是怎样的？是直接扣减库存，还是生成出库单？

2. **生产批次创建**：生产计划审批通过后，创建批次的默认参数是什么？

3. **请假任务分配**：请假人提交的任务是自动分配给替岗人，还是需要审批人指定替岗人？

4. **公告审批流程**：公告发布是否需要审批？目前的公告"审批流程"Tab是配置用途还是实际审批？

5. **指标审批范围**：哪些指标配置需要审批？是所有新增/修改都需要审批，还是仅高优先级指标需要审批？

6. **作物入库补录**：补录的入库记录审批通过后，是更新原记录的审批状态，还是创建新的审批记录？

---

## 十七、审批中心菜单规划

### 最终目标菜单结构（精简版）

```
审批中心
├── 审批中心 (/approvals) - 领导/管理层视图：所有审批类型
├── 我的申请 (/my-applications) - 所有用户：查看自己提交的审批进展
├── 公告审批 (/announcement) - 公告管理模块的审批Tab
└── 工作流配置 (/settings/approval-workflow) - 仅管理员
```

---

## 十八、实施原则

> **强制要求**：所有编码必须采用组件模式，禁止硬编码！

### 18.1 组件模式规范

| 要求 | 说明 |
|------|------|
| 数据来源 | 所有数据从 `types/` 导入类型定义 |
| 配置来源 | 所有枚举值、配置从 `data/mockData` 导入 |
| 禁止硬编码 | 禁止在组件内部直接写死数据、枚举值、配置 |
| 公共组件 | 重复的表格、筛选逻辑抽取为公共组件 |

---

## 十九、实施计划

### Phase 1: 页面合并与路由整理

| 步骤 | 任务 | 优先级 |
|------|------|--------|
| 1.1 | 创建 MyApplications.tsx 页面 | 高 |
| 1.2 | 扩展 Approvals.tsx 支持全部37种审批类型Tab | 高 |
| 1.3 | 更新 App.tsx 路由配置 | 高 |
| 1.4 | 更新 Sidebar.tsx 菜单配置 | 高 |
| 1.5 | 删除冗余页面文件 | 高 |

### Phase 2: 新增审批类型实现

| 步骤 | 任务 | 优先级 |
|------|------|--------|
| 2.1 | 扩展 ApprovalType 枚举至37种 | 高 |
| 2.2 | 扩展 BusinessLink 接口 | 高 |
| 2.3 | 创建相关 Store 文件 | 高 |
| 2.4 | 实现物料入库/调拨审批 | 高 |
| 2.5 | 实现种源入库/育苗计划/种植计划审批 | 高 |
| 2.6 | 实现订单创建/变更审批 | 高 |
| 2.7 | 实现任务派发/变更审批 | 高 |
| 2.8 | 实现巡查问题/整改审批 | 高 |
| 2.9 | 实现生产批次/批次变更/作废审批 | 高 |
| 2.10 | 实现技术方案审批 | 中 |
| 2.11 | 实现预算编制/调整审批 | 中 |
| 2.12 | 实现指标/公告审批 | 中 |

### Phase 3: 数据流闭环实现

| 步骤 | 任务 | 优先级 |
|------|------|--------|
| 3.1 | 实现库存联动（领料/退料/入库/调拨） | 高 |
| 3.2 | 实现采购联动 | 高 |
| 3.3 | 实现作物管理联动（种源/育苗/种植/订单） | 高 |
| 3.4 | 实现农事管理联动（任务/巡查） | 高 |
| 3.5 | 实现生产管理联动（批次/技术方案） | 高 |
| 3.6 | 实现成本管理联动（预算） | 中 |
| 3.7 | 实现HR联动（请假/加班/离职/转岗等） | 中 |

### Phase 4: 批量审批与高级功能

| 步骤 | 任务 | 优先级 |
|------|------|--------|
| 4.1 | 实现批量审批UI组件 | 高 |
| 4.2 | 实现批量审批核心逻辑 | 高 |
| 4.3 | 实现审批通知机制 | 中 |
| 4.4 | 实现审批超时与委托 | 中 |
| 4.5 | 实现审批前置校验 | 中 |

---

## 二十、预期效果

### 20.1 审批类型覆盖

| 指标 | Before | After | 变化 |
|------|--------|-------|------|
| 审批类型数量 | 18种 | 37种 | +19种 |
| 整合到审批中心 | 部分 | 全部 | 100% |
| 业务联动数量 | 2个(TODO) | 37个(完整) | +35个 |

### 20.2 功能提升

| 指标 | Before | After |
|------|--------|-------|
| 批量审批 | ❌ 无 | ✅ 支持(除HR敏感类) |
| 审批分级 | ❌ 无 | ✅ 支持 |
| 前置校验 | ❌ 无 | ✅ 支持 |
| 审批通知 | ❌ 无 | ✅ 支持 |
| 超时委托 | ❌ 无 | ✅ 支持 |

### 20.3 菜单精简

| 指标 | Before | After | 变化 |
|------|--------|-------|------|
| 审批相关页面数 | 16+ | 5 | -69% |
| 审批子菜单项 | 8 | 4 | -50% |
| 重复路由 | 2 | 0 | -100% |

---

## 二十一、验证方案

### 21.1 构建验证

```bash
npm run build
```

### 21.2 功能验证清单

- [ ] 全部37种审批类型功能正常
- [ ] 批量审批功能正常（支持批量通过/拒绝）
- [ ] HR敏感类（离职/调薪等）不支持批量审批
- [ ] 审批通过 → 检查业务模块数据是否更新
- [ ] 申请人查看 → 我的申请中可见审批进展
- [ ] 审批前置校验生效
- [ ] 审批通知触发正常
- [ ] /approvals 页面正常加载
- [ ] /my-applications 页面正常加载
- [ ] 后台权限配置中可见审批相关菜单权限配置项

---

## 二十二、相关文件清单

### 数据层文件
- `src/contexts/ApprovalContext.tsx` - 全局审批状态管理
- `src/hooks/useApproval.ts` - 审批数据访问Hook
- `src/reducers/approvalReducer.ts` - 审批状态Reducer
- `src/types/approval.ts` - 审批类型定义（需大幅扩展）
- `src/types/approvalIntegration.ts` - 业务联动接口定义

### 页面文件
- `src/pages/Approvals.tsx` - 审批中心主页
- `src/pages/MaterialApproval.tsx` - 物料审批（将删除）
- `src/pages/ProductionApproval.tsx` - 生产审批（将删除）
- `src/pages/PendingApproval.tsx` - 待办审批（将删除）
- `src/pages/Approved.tsx` - 已办审批（将删除）
- `src/pages/MyApproval.tsx` - 我提交的（将删除）
- `src/pages/HrApproval.tsx` - HR审批

### 新增/修改页面
- `src/pages/MyApplications.tsx` - 我的申请 ⭐新增
- `src/pages/IndicatorApproval.tsx` - 指标审批 ⭐新增
- `src/pages/AnnouncementApproval.tsx` - 公告审批 ⭐新增
- `src/pages/CropInventoryApproval.tsx` - 作物入库补录审批 ⭐新增

### 后端API
- `server/src/routes/approval.ts` - 审批API路由

### 关键组件（新增）
- `src/components/approval/BatchActionBar.tsx` - 批量操作栏
- `src/components/approval/BatchConfirmModal.tsx` - 批量确认弹窗
- `src/components/approval/BatchResultModal.tsx` - 批量结果弹窗
- `src/components/approval/ApprovalTimeline.tsx` - 审批时间轴
- `src/components/approval/BusinessPreview.tsx` - 业务单据预览

### 新增Store文件
- `src/stores/useIndicatorStore.ts`
- `src/stores/useAnnouncementStore.ts`
- `src/stores/useCropStorageStore.ts`
- `src/stores/useOrderStore.ts`
- `src/stores/useTaskStore.ts`
- `src/stores/useInspectionStore.ts`
- `src/stores/useBudgetStore.ts`

---

## 二十三、附录

### 23.1 完整审批类型枚举

```typescript
// === 业务审批类型（10种）===
MATERIAL_REQUEST = 'material_request'                    // 领料申请
RETURN_MATERIAL = 'return_material'                    // 退料单
PURCHASE_REQUEST = 'purchase_request'               // 采购申请
MATERIAL_INBOUND = 'material_inbound'              // 物料入库
MATERIAL_TRANSFER = 'material_transfer'              // 库存调拨
SEED_SOURCE_INBOUND = 'seed_source_inbound'        // 种源入库
SEEDLING_PLAN = 'seedling_plan'                   // 育苗计划
PLANTING_PLAN = 'planting_plan'                   // 种植计划
ORDER_CREATE = 'order_create'                      // 订单创建
ORDER_CHANGE = 'order_change'                      // 订单变更

// === 生产审批类型（5种）===
PRODUCTION_PLAN = 'production_plan'                  // 生产计划
PRODUCTION_BATCH = 'production_batch'              // 生产批次
BATCH_CHANGE = 'batch_change'                      // 批次变更
BATCH_VOID = 'batch_void'                          // 批次作废
TECH_SOLUTION = 'tech_solution'                      // 技术方案

// === 农事审批类型（4种）===
TASK_DISPATCH = 'task_dispatch'                    // 任务派发
TASK_CHANGE = 'task_change'                          // 任务变更
INSPECTION_ISSUE = 'inspection_issue'              // 巡查问题
ISSUE_RESOLVE = 'issue_resolve'                    // 问题整改

// === 采收审批类型（1种）===
HARVEST_REQUEST = 'harvest_request'               // 采收申请

// === 作物补录审批类型（3种）===
SEED_SOURCE_SUPPLEMENTARY = 'seed_source_supplementary' // 种源补录
SEEDLING_SUPPLEMENTARY = 'seedling_supplementary'     // 育苗补录
CROP_STORAGE_SUPPLEMENTARY = 'crop_storage_supplementary' // 作物入库补录

// === 指标/公告审批类型（2种）===
INDICATOR_APPROVAL = 'indicator_approval'          // 指标审批
ANNOUNCEMENT_APPROVAL = 'announcement_approval'    // 公告审批

// === 成本审批类型（2种）===
BUDGET_CREATE = 'budget_create'                    // 预算编制
BUDGET_ADJUST = 'budget_adjust'                    // 预算调整

// === HR审批类型（11种）===
LEAVE = 'leave'                                    // 请假
OVERTIME = 'overtime'                            // 加班
RESIGNATION = 'resignation'                        // 离职
RECRUITMENT = 'recruitment'                        // 招聘
ONBOARDING = 'onboarding'                          // 入职
ATTENDANCE_REPAIR = 'attendance_repair'           // 考勤补录
SALARY_ADJUSTMENT = 'salary_adjustment'           // 调薪
CONTRACT_RENEWAL = 'contract_renewal'             // 合同续签
SALARY_BUDGET = 'salary_budget'                   // 工资预算
TRANSFER = 'transfer'                              // 转岗
```

### 23.2 审批状态枚举

```typescript
DRAFT = 'draft'                                      // 草稿
PENDING = 'pending'                                  // 待审批
APPROVED = 'approved'                                // 已通过
PARTIALLY_APPROVE = 'partially_approved'        // 部分通过
REJECTED = 'rejected'                              // 已拒绝
CANCELLED = 'cancelled'                             // 已撤回
```

### 23.3 批量审批类型映射

```typescript
// 支持批量审批的类型
const BATCH_APPROVE_SUPPORTED = [
  'MATERIAL_REQUEST', 'RETURN_MATERIAL', 'MATERIAL_INBOUND', 'MATERIAL_TRANSFER',
  'PURCHASE_REQUEST', 'SEED_SOURCE_INBOUND', 'SEEDLING_PLAN', 'PLANTING_PLAN',
  'PRODUCTION_PLAN', 'PRODUCTION_BATCH', 'BATCH_CHANGE', 'BATCH_VOID',
  'TASK_DISPATCH', 'TASK_CHANGE', 'INSPECTION_ISSUE', 'ISSUE_RESOLVE',
  'HARVEST_REQUEST', 'SEED_SOURCE_SUPPLEMENTARY', 'SEEDLING_SUPPLEMENTARY',
  'CROP_STORAGE_SUPPLEMENTARY', 'INDICATOR_APPROVAL', 'ANNOUNCEMENT_APPROVAL',
  'BUDGET_CREATE', 'BUDGET_ADJUST', 'LEAVE', 'OVERTIME', 'ATTENDANCE_REPAIR',
];

// 不支持批量审批的类型（HR敏感类）
const BATCH_REJECTED = [
  'RESIGNATION', 'RECRUITMENT', 'ONBOARDING', 'SALARY_ADJUSTMENT',
  'CONTRACT_RENEWAL', 'SALARY_BUDGET', 'TRANSFER',
];

// 支持批量审批单审但建议单审的类型
const BATCH_SINGLE_ADVICE = ['ORDER_CREATE', 'ORDER_CHANGE', 'TECH_SOLUTION'];
```

---

## 二十四、版本记录

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| V2.0 | 2026-05-04 | 初始版本，包含页面合并和数据流闭环方案 |
| V2.1 | 2026-05-04 | 新增指标审批、公告审批、作物入库遗漏补录审批 |
| V3.0 | 2026-05-04 | 完整版本，整合所有审批类型 |
| V4.0 | 2026-05-04 | 融合`审批流程优化-V1.0.md`，新增批量审批、分级机制、通知、超时委托等高级功能 |
| V4.1 | 2026-05-04 | 补充完整内容：系统深入分析、权限矩阵设计、通知机制、超时委托、UI设计、数据迁移方案、优化建议等 |
| V5.0 | 2026-05-04 | 整合`审批中心优化升级方案-opencode.md`，新增详细流程设计示例、需要确认的问题清单、审批中心菜单规划、相关文件清单 |
| V6.0 | 2026-05-04 | 整合V5.0全部精华：页面结构问题分析、37种审批类型完整分类、页面合并方案、数据流闭环37种联动清单、文件修改清单、实施计划、预期效果、验证方案、完整附录枚举代码 |

---

*文档版本：V6.0*
*参考文档：`审批流程优化-V1.0.md`、`审批中心升级方案V5.0.md`、`审批中心优化升级方案-opencode.md`*
*生成时间：2026-05-04*
*生成工具：OpenCode AI Assistant*
