# 农业种植管理系统（原型演示版）优化报告

**项目路径：** `D:/TMcrop/yuanxingtu/V1.1`
**报告日期：** 2026-04-17
**项目性质：** 原型演示系统（无后端/数据库，纯前端 mock 数据）
**优化目标：** 实现业务闭环 + UI 统一 + 术语规范

---

# 第一部分：业务闭环修复（核心 P0）

## 问题概述

物料领用流程是系统的核心业务流程，目前**审批→出库→统计**链路断裂，导致演示时无法展示完整的数据闭环。

## 当前数据流

```
ApplicationTab (申请)
    ↓ [调用 approvalContext.addApproval()]
ApprovalContext (审批中心)
    ↓ [审批通过后调用 executeApprovalIntegration()]
materialApprovalHandler.onMaterialApprovalApproved()
    ↓ [只有 TODO，尚未实现]
ExecuteTab (出库) ❌ 使用独立的 mock 数据，未联动
    ↓
StatisticsTab (统计) ❌ 使用独立数据源，未同步
```

## 1.1 修复审批→出库联动

### 问题文件
- `src/hooks/materialReceiving/useMaterialReceiving.ts`

### 问题代码（第 221 行）
```typescript
// 当前代码：直接使用独立 mock 数据
const [executeData, setExecuteData] = useState<...>(materialExecuteDetails);
```

### 修复方案

**步骤 1：** 在 `useMaterialReceiving.ts` 中添加对 ApprovalContext 的监听

找到 `useMaterialReceiving.ts` 文件，在 hook 开头添加：

```typescript
import { useApproval } from '../../contexts/ApprovalContext';

// 在 hook 内部添加：
const { approvals } = useApproval();

// 添加 computed 字段：从审批通过的申请单中提取待出库数据
const approvedPendingExecute = useMemo(() => {
  return approvals
    .filter(a =>
      a.type === 'MATERIAL_REQUEST' &&
      a.status === 'approved'
    )
    .map(a => ({
      id: a.id,
      code: a.code.replace('LL', 'CK'), // LL申请单号 → CK出库单号
      sourceApplicationCode: a.code,      // 关联源申请单号
      applicant: a.applicant,
      department: a.department,
      executeStatus: 'pending',          // 待出库
      executeTime: null,
      materials: [],                      // 待填充实际物料
      createdAt: a.createdAt
    }));
}, [approvals]);
```

**步骤 2：** 修改 `executeData` 的初始值来源

将第 221 行从：
```typescript
const [executeData, setExecuteData] = useState<...>(materialExecuteDetails);
```

改为：
```typescript
const [executeData, setExecuteData] = useState<...>(() => {
  // 优先使用审批联动数据，兜底使用 mock 数据
  return approvedPendingExecute.length > 0 ? approvedPendingExecute : materialExecuteDetails;
});
```

**步骤 3：** 添加 effect 监听审批变化自动同步

在 hook 末尾添加：
```typescript
// 监听审批通过，自动同步到出库数据
useEffect(() => {
  if (approvedPendingExecute.length > 0) {
    setExecuteData(prev => {
      // 合并：保留已出库的，新增审批通过的
      const existingExecuted = prev.filter(e => e.executeStatus === 'completed');
      return [...existingExecuted, ...approvedPendingExecute];
    });
  }
}, [approvedPendingExecute]);
```

### 修复后预期效果

```
1. 用户在 ApplicationTab 创建领料单
2. 系统自动创建审批记录到 ApprovalContext
3. 审批通过后，ExecuteTab 自动显示该单据（状态：待出库）
4. 用户点击"出库"，状态变为"已出库"
5. StatisticsTab 自动统计该单据
```

---

## 1.2 修复审批→库存联动

### 问题文件
- `src/types/approvalIntegration.ts`

### 问题代码（第 77 行）
```typescript
onMaterialApprovalApproved: (approval, materialLink) => {
  console.log('【联动】领料单审批通过', {...});
  // TODO: 调用库存管理模块减少库存
  // inventoryStore.decreaseStock(materialLink.materials, approval.code);
}
```

### 修复方案

**步骤 1：** 在 `approvalIntegration.ts` 中实现库存联动

将第 77-79 行改为：

```typescript
onMaterialApprovalApproved: (approval, materialLink) => {
  console.log('【联动】领料单审批通过', {...});

  // 获取库存管理 hook（如果存在）
  // 注意：原型阶段可以使用 localStorage 模拟库存
  try {
    const inventoryData = JSON.parse(localStorage.getItem('inventory_records') || '[]');

    // 模拟扣减库存
    const updatedInventory = materialLink.materials.map(m => ({
      materialCode: m.materialCode,
      materialName: m.materialName,
      quantity: m.quantity,
      approvedQuantity: approval.quantity || m.quantity,
      deductTime: new Date().toISOString(),
      relatedForm: approval.code
    }));

    // 保存到 localStorage
    localStorage.setItem('inventory_records', JSON.stringify([
      ...inventoryData,
      ...updatedInventory
    ]));

    console.log('【联动】库存已扣减', updatedInventory);
  } catch (error) {
    console.error('【联动】库存扣减失败', error);
  }
}
```

**步骤 2：** 添加库存记录类型定义

在 `src/types/` 目录下创建或修改 `inventory.ts`：

```typescript
export interface InventoryRecord {
  id: string;
  materialCode: string;
  materialName: string;
  warehouse: string;
  quantity: number;
  unit: string;
  lastDeductTime?: string;
  relatedForms: string[]; // 关联的单据号列表
}

export interface InventoryDeductRecord {
  materialCode: string;
  materialName: string;
  quantity: number;
  approvedQuantity: number;
  deductTime: string;
  relatedForm: string;
}
```

---

## 1.3 修复出库→统计联动

### 问题文件
- `src/components/materialReceiving/StatisticsTab.tsx`

### 问题分析
StatisticsTab 当前使用独立的 `materialReceiveStatData` mock 数据，未与 ExecuteTab 的出库数据联动。

### 修复方案

**步骤 1：** 修改 StatisticsTab 读取出库数据

在 StatisticsTab 组件中添加对 `useMaterialReceiving` hook 的调用：

```typescript
import { useMaterialReceiving } from '../../hooks/materialReceiving/useMaterialReceiving';

// 在组件内部：
const { executeData } = useMaterialReceiving();

// 修改统计数据计算逻辑：
const stats = useMemo(() => {
  // 基础数据：来自 executeData（出库数据）
  const executedItems = executeData.filter(e => e.executeStatus === 'completed');

  return {
    totalCount: executedItems.length,
    totalQuantity: executedItems.reduce((sum, e) =>
      sum + (e.materials?.reduce((s, m) => s + m.quantity, 0) || 0), 0),
    pendingCount: executeData.filter(e => e.executeStatus === 'pending').length,
    // ... 其他统计
  };
}, [executeData]);
```

---

## 1.4 完整数据流图（修复后）

```
┌─────────────────────────────────────────────────────────────────┐
│                        物料领用完整闭环                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐  │
│  │ApplicationTab│────▶│  ApprovalContext │────▶│ ExecuteTab   │  │
│  │   (申请)     │     │    (审批中心)    │     │   (出库)    │  │
│  └──────────────┘     └──────────────────┘     └──────┬───────┘  │
│         │                       │                       │         │
│         │                       │                       │         │
│         ▼                       ▼                       ▼         │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐  │
│  │  mock数据    │     │materialApproval │     │ StatisticsTab│  │
│  │  申请单      │     │   Handler       │     │   (统计)    │  │
│  └──────────────┘     │  ● 扣减库存     │     └──────────────┘  │
│                       │  ● 同步出库数据 │            ▲          │
│                       └──────────────────┘            │          │
│                               │                       │          │
│                               ▼                       │          │
│                       ┌──────────────────┐            │          │
│                       │  localStorage    │────────────┘          │
│                       │  inventory_records│                       │
│                       └──────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

图例：
──▶ 数据流
●   联动触发点
▲   统计读取
```

---

# 第二部分：UI 统一性修复（P1）

## 2.1 表格表头颜色统一

### 问题文件
- `src/components/materialReceiving/ExecuteTab.tsx`（第 374 行）

### 问题代码
```typescript
// 当前：使用 blue 渐变
<thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
```

### 修复方案

将第 374 行改为：
```typescript
// 修复后：使用 emerald 渐变（与项目主题一致）
<thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
```

### 影响范围

需要检查所有表格表头，统一为 emerald 渐变：

| 文件 | 当前样式 | 修复后 |
|------|---------|--------|
| ExecuteTab.tsx L374 | `from-blue-500 to-blue-600` | `from-emerald-500 to-emerald-600` |
| ApplicationTab.tsx | `from-blue-500 to-blue-600` | `from-emerald-500 to-emerald-600` |
| StatisticsTab 相关 | `bg-emerald-500` ✅ | 无需修改 |

---

## 2.2 边框颜色统一

### 问题分析
部分组件使用 `border-gray-100`，部分使用 `border-gray-200`

### 修复方案

统一规范：
- **卡片边框**：`border border-gray-200`
- **表格边框**：`border border-gray-200`
- **输入框边框**：`border border-gray-200`（聚焦时 `focus:border-emerald-500`）

### 涉及文件

需要检查并统一以下文件的边框颜色：

```bash
src/components/materialReceiving/ExecuteTab.tsx
src/components/materialReceiving/ApplicationTab.tsx
src/components/materialReturn/MaterialReturnTable.tsx
src/components/supplier/SupplierTable.tsx
# ... 其他表格组件
```

---

## 2.3 按钮样式规范（已正确）

### 当前状态 ✅
- 主按钮：`bg-emerald-600 hover:bg-emerald-700 text-white`
- 危险按钮：`bg-red-600 hover:bg-red-700 text-white`
- 次按钮：`border border-emerald-600 text-emerald-600`
- 幽灵按钮：`text-gray-600 hover:bg-gray-100`

### 无需修改

---

## 2.4 间距系统规范

### 统一规范

| 场景 | 间距 | Tailwind 类 |
|------|------|-------------|
| 页面内边距 | 24px | `p-6` |
| 卡片间距 | 16px | `gap-4` 或 `space-y-4` |
| 元素间距 | 8px | `gap-2` 或 `space-x-2` |
| 按钮组间距 | 8px | `gap-2` |
| 表单项间距 | 12px | `gap-3` |
| 区块间距 | 24px | `space-y-6` |

---

# 第三部分：术语统一规范（P1）

## 3.1 状态字段统一

### 问题

| 当前字段 | 问题 | 规范字段 |
|---------|------|----------|
| `status` (ApplicationTab) | 申请单状态 | `applicationStatus` |
| `executeStatus` (ExecuteTab) | 出库单状态 | `executeStatus` |
| 语义重叠 | 字段名相似但含义不同 | 需明确区分 |

### 修复方案

**步骤 1：** 在类型定义中明确区分

修改 `src/types/materialReceiving.ts`：

```typescript
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
  | 'completed'  // 已出库
  | 'cancelled'; // 已取消

// 统一接口
export interface MaterialApplication {
  id: string;
  code: string;           // LL20260301001
  applicationStatus: ApplicationStatus;
  applicant: string;
  department: string;
  materials: MaterialItem[];
  createdAt: string;
}

export interface MaterialExecute {
  id: string;
  code: string;           // CK20260301001
  executeStatus: ExecuteStatus;
  sourceApplicationCode: string;  // 关联的申请单号
  applicant: string;
  department: string;
  materials: MaterialItem[];
  executeTime: string | null;
  createdAt: string;
}
```

---

## 3.2 单号编码规范

### 统一规范

| 单据类型 | 前缀 | 示例 | 关联关系 |
|---------|------|------|---------|
| 领料申请单 | LL | LL20260301001 | - |
| 领料出库单 | CK | CK20260301001 | sourceApplicationCode → LL20260301001 |
| 物料退库单 | RT | RT20260301001 | sourceExecuteCode → CK20260301001 |

### 修复方案

在 `useMaterialReceiving.ts` 中实现单号映射：

```typescript
// 生成出库单号
const generateExecuteCode = (applicationCode: string) => {
  // LL20260301001 → CK20260301001
  return applicationCode.replace(/^LL/, 'CK');
};

// 生成退库单号
const generateReturnCode = (executeCode: string) => {
  // CK20260301001 → RT20260301001
  return executeCode.replace(/^CK/, 'RT');
};
```

---

## 3.3 农业术语对照表

### 规范术语（用于 UI 显示和代码注释）

| 类别 | 规范术语 | 允许混用 | 禁止使用 |
|------|---------|---------|---------|
| 物料申请 | 领料单/领料申请 | 物料申请 | - |
| 出库操作 | 出库单/领料出库 | 物料出库 | 执行单 |
| 种植批次 | 批次/生产批次 | 批号 | 编号 |
| 采收记录 | 采收单/采收记录 | 收获 | 收割 |
| 农事任务 | 任务单/农事任务 | 工单 | 作业单 |
| 大棚区域 | 大棚/温室/种植区 | - | 用地 |

---

# 第四部分：架构整理（P2）

## 4.1 超大组件拆分

### Dashboard.tsx（1714 行）

**拆分方案：**

```
src/pages/Dashboard.tsx (1714行)
    │
    ├── 拆分为：
    │   ├── DashboardOverview.tsx      (仪表盘概览，400行)
    │   ├── DashboardProductionCards.tsx (生产指标卡片，300行)
    │   ├── DashboardMaterialCards.tsx  (物料指标卡片，250行)
    │   ├── DashboardLaborCards.tsx     (人工指标卡片，250行)
    │   ├── DashboardCharts.tsx         (图表区域，300行)
    │   └── DashboardWidgets.tsx        (小部件，200行)
```

**拆分步骤：**

1. 将 `Dashboard.tsx` 中的卡片组件提取到独立文件
2. 创建 `DashboardCards` 目录
3. 每个卡片组件职责单一

### useMaterialReceiving.ts（830 行）

**拆分方案：**

```
src/hooks/materialReceiving/useMaterialReceiving.ts (830行)
    │
    ├── 拆分为：
    │   ├── useMaterialApplication.ts   (申请单逻辑，400行)
    │   ├── useMaterialExecute.ts      (出库单逻辑，300行)
    │   └── useMaterialStatistics.ts   (统计逻辑，150行)
```

## 4.2 Context 扩展建议

### 当前状态
- 仅 `ApprovalContext` 为全局 Context

### 建议扩展

```typescript
// 新增 MaterialContext（物料流转全局状态）
src/contexts/MaterialContext.tsx

// 功能：
// - 管理物料申请单列表
// - 管理出库单列表
// - 监听审批结果，自动同步
// - 提供给 ExecuteTab 和 StatisticsTab 共用
```

---

# 第五部分：具体修改清单

## 5.1 P0 修改（必须）

| # | 文件 | 行号 | 修改内容 |
|---|------|------|---------|
| 1 | `src/hooks/materialReceiving/useMaterialReceiving.ts` | 221 | 添加 `approvedPendingExecute` computed |
| 2 | `src/hooks/materialReceiving/useMaterialReceiving.ts` | 末尾 | 添加 `useEffect` 监听审批联动 |
| 3 | `src/types/approvalIntegration.ts` | 77 | 实现 `onMaterialApprovalApproved` 库存联动 |
| 4 | `src/components/materialReceiving/StatisticsTab.tsx` | - | 读取 `executeData` 统计 |

## 5.2 P1 修改（建议）

| # | 文件 | 行号 | 修改内容 |
|---|------|------|---------|
| 1 | `src/components/materialReceiving/ExecuteTab.tsx` | 374 | blue渐变 → emerald渐变 |
| 2 | `src/components/materialReceiving/ApplicationTab.tsx` | 表头 | blue渐变 → emerald渐变 |
| 3 | `src/types/materialReceiving.ts` | - | 添加 `ApplicationStatus` 和 `ExecuteStatus` 类型 |
| 4 | `src/hooks/materialReceiving/useMaterialReceiving.ts` | - | 添加单号生成函数 |

## 5.3 P2 修改（可选）

| # | 文件 | 修改内容 |
|---|------|---------|
| 1 | `src/pages/Dashboard.tsx` | 拆分为多个小组件 |
| 2 | `src/hooks/materialReceiving/useMaterialReceiving.ts` | 拆分为三个 hook |

---

# 第六部分：验证测试清单

## 6.1 业务闭环验证

- [ ] **测试1：创建申请单 → 审批通过 → 出库列表自动显示**
  1. 在 ApplicationTab 创建领料单
  2. 进入审批中心，审批通过
  3. 进入 ExecuteTab，验证新单据自动出现（状态：待出库）

- [ ] **测试2：执行出库 → 统计自动更新**
  1. 在 ExecuteTab 点击"出库"
  2. 进入 StatisticsTab
  3. 验证统计数据包含刚出库的单据

- [ ] **测试3：库存联动**
  1. 审批通过后
  2. 检查 localStorage `inventory_records`
  3. 验证库存记录已创建

## 6.2 UI 一致性验证

- [ ] 所有表格表头为 emerald 渐变
- [ ] 所有主按钮为 emerald-600
- [ ] 边框颜色一致为 gray-200

## 6.3 术语一致性验证

- [ ] 申请单显示"领料单"而非"物料申请"
- [ ] 出库单显示"出库单"而非"执行单"
- [ ] 状态 Badge 文案统一

---

# 第七部分：实施优先级总结

## 第一阶段（演示前必须完成）

```
1. 审批→出库联动（useMaterialReceiving.ts）
2. ExecuteTab 表头颜色（ExecuteTab.tsx）
3. 库存联动实现（approvalIntegration.ts）
```

## 第二阶段（演示效果优化）

```
1. ApplicationTab 表头颜色
2. 术语统一
3. StatisticsTab 数据联动
```

## 第三阶段（长期架构优化）

```
1. Dashboard 拆分
2. hooks 拆分
3. Context 扩展
```

---

# 附录

## A. 关键文件路径

| 文件 | 行数 | 优先级 | 备注 |
|------|------|--------|------|
| `src/contexts/ApprovalContext.tsx` | ~425 | P0 | 审批全局状态 |
| `src/hooks/materialReceiving/useMaterialReceiving.ts` | ~830 | P0 | 核心 hook |
| `src/components/materialReceiving/ExecuteTab.tsx` | ~590 | P0 | 出库页签 |
| `src/components/materialReceiving/ApplicationTab.tsx` | ~580 | P1 | 申请页签 |
| `src/components/materialReceiving/StatisticsTab.tsx` | ~300 | P1 | 统计页签 |
| `src/types/approvalIntegration.ts` | ~200 | P0 | 联动类型 |
| `src/data/materialReceivingData.ts` | ~440 | P1 | Mock数据 |

## B. 技术栈参考

- React 18.3.1
- TypeScript 5.6.2
- Tailwind CSS 3.4.16
- Radix UI (多组件)
- React Router DOM 6
- localStorage (数据持久化)

## C. 联系方式

如有疑问，请联系系统开发团队。

---

**报告结束**
