# 术语统一规范清单（升级版）

**优先级：** P1（逻辑清晰度）
**目标：** 统一全系统农业业务术语，消除歧义
**问题规模：** 12处术语不一致 + 枚举缺失导致硬编码

---

## 术语规范总表

### 一、状态字段统一

| 单据类型 | 正确字段名 | 错误字段名 | 状态值规范 |
|---------|-----------|-----------|-----------|
| 申请单 | `applicationStatus` | `status`（混用） | pending/approved/rejected/cancelled/voided |
| 出库单 | `executeStatus` | `status`（混用） | pending/partial/completed/cancelled |
| 退库单 | `returnStatus` | `status`（混用） | pending/completed/cancelled |
| 任务 | `taskStatus` | `status`（混用） | 待派发/待接收/进行中/已完成/已取消 |
| 批次 | `batchStatus` | `status`（混用） | 待开始/进行中/已完成/已归档 |

### 二、单号编码规范

| 单据类型 | 前缀 | 示例 | 关联字段 |
|---------|------|------|---------|
| 领料申请单 | LL | LL20260301001 | - |
| 领料出库单 | CK | CK20260301001 | `sourceApplicationCode` → LL |
| 物料退库单 | RT | RT20260301001 | `sourceExecuteCode` → CK |
| 采购申请单 | CG | CG20260301001 | - |
| 采购入库单 | RK | RK20260301001 | `sourcePurchaseCode` → CG |
| 农事任务单 | NS | NS20260301001 | - |
| 临时任务单 | LS | LS20260301001 | - |
| 问题记录单 | WT | WT20260301001 | - |

### 三、UI 文案规范

| 错误文案 | 正确文案 | 场景 |
|---------|---------|------|
| 物料申请 | 领料申请 | 标题、表单 |
| 执行 | 出库 | 按钮、状态 |
| 执行单 | 出库单 | 标题、导航 |
| 执行记录 | 出库记录 | 表格列名 |
| 采收 | 采收（保留） | - |
| 收获 | 采收 | 标题、记录 |
| 批号 | 批次号 | 表格列名 |
| 编号 | 批次号/编号 | 按场景区分 |
| 工单 | 任务单/工单 | 标题统一 |
| 作业单 | 任务单 | 标题 |
| 大棚 | 温室/种植区 | 按场景 |
| 用地 | 种植区 | 正式场合禁用 |

### 四、状态文案规范

#### 申请单状态

| 状态值 | 中文文案 | 颜色 | Badge变体 |
|-------|---------|------|----------|
| pending | 待审批 | yellow | warning |
| approved | 已通过 | green | completed |
| rejected | 已拒绝 | red | destructive |
| cancelled | 已取消 | gray | secondary |
| voided | 已作废 | gray | secondary |

#### 出库单状态

| 状态值 | 中文文案 | 颜色 | Badge变体 |
|-------|---------|------|----------|
| pending | 待出库 | blue | info |
| partial | 部分出库 | yellow | warning |
| completed | 已出库 | green | completed |
| cancelled | 已取消 | gray | secondary |

#### 退库单状态

| 状态值 | 中文文案 | 颜色 | Badge变体 |
|-------|---------|------|----------|
| pending | 待退库 | yellow | warning |
| completed | 已退库 | green | completed |
| cancelled | 已取消 | gray | secondary |

#### 任务状态

| 状态值 | 中文文案 | 颜色 | Badge变体 |
|-------|---------|------|----------|
| pending | 待派发 | gray | secondary |
| assigned | 待接收 | blue | info |
| in_progress | 进行中 | emerald | inProgress |
| completed | 已完成 | green | completed |
| cancelled | 已取消 | gray | secondary |
| overdue | 已逾期 | red | destructive |

---

## 修复任务组

### 任务1：枚举统一定义 ⚠️ P1

**文件：** `src/types/enums.ts`（需新建）

**问题：** 状态值用字符串硬编码，缺乏类型安全

**修复步骤：**

#### Step 1.1: 创建统一枚举文件

```typescript
// src/types/enums.ts

// ========== 通用状态枚举 ==========

// 申请单状态
export type ApplicationStatus =
  | 'pending'    // 待审批
  | 'approved'   // 已通过
  | 'rejected'   // 已拒绝
  | 'cancelled'  // 已取消
  | 'voided';    // 已作废

// 出库单状态
export type ExecuteStatus =
  | 'pending'    // 待出库
  | 'partial'    // 部分出库
  | 'completed'   // 已出库
  | 'cancelled'; // 已取消

// 退库单状态
export type ReturnStatus =
  | 'pending'    // 待退库
  | 'completed'  // 已完成
  | 'cancelled'; // 已取消

// 任务状态
export type TaskStatus =
  | 'pending'         // 待派发
  | 'assigned'        // 待接收
  | 'in_progress'     // 进行中
  | 'completed'       // 已完成
  | 'cancelled'       // 已取消
  | 'overdue';       // 已逾期

// 批次状态
export type BatchStatus =
  | 'pending'         // 待开始
  | 'in_progress'     // 进行中
  | 'completed'       // 已完成
  | 'archived';       // 已归档

// ========== 审批类型枚举 ==========

export type ApprovalType =
  | 'MATERIAL_REQUEST'      // 领料申请
  | 'MATERIAL_RETURN'       // 退料申请
  | 'PURCHASE_REQUEST'      // 采购申请
  | 'TASK_APPROVAL'         // 任务审批
  | 'LEAVE_REQUEST'         // 请假申请
  | 'OVERTIME_REQUEST'      // 加班申请
  | 'TRANSFER_REQUEST'      // 调岗申请
  | 'RESIGNATION_REQUEST'   // 离职申请
  | 'TECH_SOLUTION';        // 技术方案

// ========== 枚举映射 ==========

// 状态 → 中文文案
export const ApplicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
  voided: '已作废'
};

export const ExecuteStatusLabels: Record<ExecuteStatus, string> = {
  pending: '待出库',
  partial: '部分出库',
  completed: '已出库',
  cancelled: '已取消'
};

export const ReturnStatusLabels: Record<ReturnStatus, string> = {
  pending: '待退库',
  completed: '已退库',
  cancelled: '已取消'
};

export const TaskStatusLabels: Record<TaskStatus, string> = {
  pending: '待派发',
  assigned: '待接收',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
  overdue: '已逾期'
};

// ========== 单号前缀常量 ==========

export const DocumentPrefix = {
  MATERIAL_APPLICATION: 'LL',    // 领料申请单
  MATERIAL_EXECUTE: 'CK',         // 领料出库单
  MATERIAL_RETURN: 'RT',           // 物料退库单
  PURCHASE_APPLICATION: 'CG',      // 采购申请单
  PURCHASE_EXECUTE: 'RK',          // 采购入库单
  FARM_TASK: 'NS',                // 农事任务单
  TEMP_TASK: 'LS',                // 临时任务单
  PROBLEM_RECORD: 'WT',           // 问题记录单
} as const;

// 单号生成函数
export const generateDocumentCode = (
  prefix: keyof typeof DocumentPrefix,
  date: Date = new Date()
): string => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${DocumentPrefix[prefix]}${dateStr}${seq}`;
};
```

#### Step 1.2: 在现有文件中导入使用

```typescript
// 原来
const status = 'pending';
const label = status === 'pending' ? '待审批' : '已通过';

// 修改后
import { ApplicationStatus, ApplicationStatusLabels } from '@/types/enums';

const status: ApplicationStatus = 'pending';
const label = ApplicationStatusLabels[status]; // '待审批'
```

---

### 任务2：UI 文案统一 ⚠️ P1

**问题：** 多处文案不一致

**搜索并修复：**

```bash
# 搜索错误文案
grep -r "物料申请" src/ --include="*.tsx" | head -20
grep -r "执行单" src/ --include="*.tsx" | head -20
grep -r "收获" src/ --include="*.tsx" | head -20
grep -r "批号" src/ --include="*.tsx" | head -20
```

**修复对照表：**

| 文件 | 错误文案 | 正确文案 |
|------|---------|---------|
| MaterialReceivingPage.tsx | 物料申请 | 领料申请 |
| ExecuteTab.tsx | 执行记录 | 出库记录 |
| MaterialReturnPage.tsx | 执行单 | 出库单 |
| HarvestPage.tsx | 收获记录 | 采收记录 |
| ProductionPage.tsx | 批号 | 批次号 |

---

### 任务3：状态字段统一 ⚠️ P1

**问题：** 多处使用 `status` 而非语义化的字段名

**修复步骤：**

#### Step 3.1: 在类型定义中使用语义化字段

```typescript
// 原来
interface MaterialRecord {
  id: string;
  code: string;
  status: string;  // ❌ 语义不清
}

// 修改后
import { ApplicationStatus, ExecuteStatus } from '@/types/enums';

interface MaterialApplication {
  id: string;
  code: string;
  applicationStatus: ApplicationStatus;  // ✅ 语义明确
}

interface MaterialExecute {
  id: string;
  code: string;
  executeStatus: ExecuteStatus;  // ✅ 语义明确
}
```

#### Step 3.2: 搜索并替换

```bash
# 搜索使用了泛status的接口
grep -r "status: string" src/types/ --include="*.ts" -B2 -A2
```

---

### 任务4：Badge 文案统一 ⚠️ P2

**文件：** `src/components/ui/StatusBadge.tsx`（需新建统一组件）

**修复步骤：**

```typescript
// src/components/ui/StatusBadge.tsx

import { Badge } from './badge';
import {
  ApplicationStatus,
  ExecuteStatus,
  ReturnStatus,
  TaskStatus,
  ApplicationStatusLabels,
  ExecuteStatusLabels,
  ReturnStatusLabels,
  TaskStatusLabels
} from '@/types/enums';

interface StatusBadgeProps {
  type: 'application' | 'execute' | 'return' | 'task';
  status: ApplicationStatus | ExecuteStatus | ReturnStatus | TaskStatus;
}

const statusConfig = {
  application: {
    statusLabels: ApplicationStatusLabels,
    colors: {
      pending: 'warning',
      approved: 'completed',
      rejected: 'destructive',
      cancelled: 'secondary',
      voided: 'secondary'
    }
  },
  execute: {
    statusLabels: ExecuteStatusLabels,
    colors: {
      pending: 'info',
      partial: 'warning',
      completed: 'completed',
      cancelled: 'secondary'
    }
  },
  return: {
    statusLabels: ReturnStatusLabels,
    colors: {
      pending: 'warning',
      completed: 'completed',
      cancelled: 'secondary'
    }
  },
  task: {
    statusLabels: TaskStatusLabels,
    colors: {
      pending: 'secondary',
      assigned: 'info',
      in_progress: 'inProgress',
      completed: 'completed',
      cancelled: 'secondary',
      overdue: 'destructive'
    }
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status }) => {
  const config = statusConfig[type];
  const label = config.statusLabels[status];
  const variant = config.colors[status];

  return <Badge variant={variant}>{label}</Badge>;
};
```

**使用方式：**

```typescript
// 原来
<Badge className="bg-yellow-100 text-yellow-800">待审批</Badge>

// 修改后
<StatusBadge type="application" status="pending" />
```

---

## 验证检查清单

- [ ] 所有状态值使用枚举而非字符串硬编码
- [ ] UI 文案无"物料申请"（应为"领料申请"）
- [ ] UI 文案无"执行单/执行记录"（应为"出库单/出库记录"）
- [ ] UI 文案无"收获"（应为"采收"）
- [ ] UI 文案无"批号"（应为"批次号"）
- [ ] 状态字段语义化（`applicationStatus` 而非 `status`）
- [ ] 单号编码符合规范（LL/CK/RT/CG/RK/NS/LS/WT）
- [ ] StatusBadge 组件统一使用

---

## 附录：术语字典

### 种植相关

| 术语 | 解释 | 禁用词 |
|------|------|--------|
| 批次 | 一次种植的生产单位 | 批号、编号 |
| 采收 | 收获农作物的过程 | 收获、收割 |
| 农事任务 | 农业生产相关的任务 | 工单、作业单 |
| 温室/种植区 | 种植场所 | 大棚、用地 |

### 物料相关

| 术语 | 解释 | 禁用词 |
|------|------|--------|
| 领料申请 | 申请领取物料 | 物料申请 |
| 出库 | 物料从仓库发出 | 执行 |
| 退库 | 物料退回仓库 | - |
| 入库 | 物料进入仓库 | - |

### 人工相关

| 术语 | 解释 | 禁用词 |
|------|------|--------|
| 入职办理 | 新员工入职流程 | 入职 |
| 离职审批 | 员工离职申请审批 | - |
| 请假 | 员工请假 | - |
| 加班 | 延长工作时间 | - |

---

**文档版本：** v2.0 升级版
**更新日期：** 2026-04-17
**相比v1.0：** 新增枚举统一定义、Badge统一组件、术语字典
