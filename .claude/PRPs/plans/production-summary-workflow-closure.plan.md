# Plan: 生产汇总表工作流闭环重构

## Summary

将生产汇总表从孤立的硬编码演示页面，改造为以 CropBatch（生产批次）为核心的数据中枢，打通生产计划 → 农事任务 → 工时考勤 → 工资成本的全链路数据闭环。

## User Story

作为生产管理员，我希望在生产汇总表中看到每个批次的完整生产数据（计划、进度、成本），这样我就能实时掌握生产状况，无需在多个模块间切换核对数据。

## Problem → Solution

**现状**: PlanSummary.tsx 使用硬编码的5条演示数据，各 labor 子模块（WorkLog、Attendance、Salary、Budget）没有通过 batchId 关联到 CropBatch，导致数据孤岛。

**目标**: 以 batchId 为核心，建立生产批次 → 任务 → 工时/考勤 → 工资/成本 的完整数据流，PlanSummary 改为实时聚合计算。

---

## Metadata

- **Complexity**: Large
- **Source**: 用户需求（生产汇总表模块重构）
- **Estimated Files**: 15-20 个文件
- **Key Modules Affected**: summary/, labor/*, types/, data/

---

## UX Design

### Before
```
┌─────────────────────────────────────────────┐
│  生产汇总表 (PlanSummary)                     │
│  ┌─────────────────────────────────────────┐ │
│  │ 硬编码的5条演示数据                       │ │
│  │ 实际产量、完成率与真实任务无关              │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  农事任务管理 ──X──► 生产汇总表               │
│     │              (无数据连接)              │
│     ▼                                        │
│  考勤/工资/预算 ──X──► 各模块独立数据孤岛     │
└─────────────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────────────┐
│  生产汇总表 (PlanSummary)                     │
│  ┌─────────────────────────────────────────┐ │
│  │ 实时聚合 CropBatch + Task + WorkLog +   │ │
│  │ Attendance + Salary + MaterialReceiving │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  CropBatch ──► Task ──► WorkLog             │
│       │            │            │           │
│       ▼            ▼            ▼           │
│  PlanSummary ◄── Attendance ◄── Salary     │
│       │                                        │
│       ▼                                        │
│  成本对比分析 (预算 vs 实际)                   │
└─────────────────────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| 汇总表数据 | 硬编码静态 | 实时聚合计算 | 从 cropBatches/tasks 动态读取 |
| 批次选择 | 无 | 筛选/切换批次 | 可按批次查看汇总 |
| 成本查看 | 各模块分散 | 统一成本面板 | Budget vs Actual 对比 |
| 工时追溯 | 无 | 点击可跳转 | 可从汇总表跳转查看工时明细 |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `src/pages/PlanSummary.tsx` | 全部 | 当前实现，需重构为动态数据 |
| P0 | `src/types/index.ts` | CropBatch, Task 部分 | 核心类型定义 |
| P0 | `src/components/summary/types.ts` | 全部 | Summary 模块类型 |
| P1 | `src/components/labor/worklog/types.ts` | 全部 | WorkLog 需添加 batchId |
| P1 | `src/components/labor/attendance/types.ts` | 全部 | Attendance 需添加 batchId |
| P1 | `src/components/labor/salary/types.ts` | 全部 | Salary 成本汇总依赖 |
| P1 | `src/data/mockData.ts` | CropBatch, Task 部分 | 当前数据源 |

---

## Patterns to Mirror

### DATA_SERVICE_PATTERN
// SOURCE: src/components/materialReceiving/modals/ExecuteDetailModal.tsx:1-30
```typescript
// 聚合数据的 Hook 模式
const useBatchData = (batchId: string) => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // 聚合多个数据源
    const aggregated = aggregateData(batchId);
    setData(aggregated);
  }, [batchId]);
  
  return data;
};
```

### TYPE_EXTENSION_PATTERN
// SOURCE: src/components/labor/tasks/TaskDetailModal.tsx:1-20
```typescript
// 现有类型扩展，通过 pick/omit 避免重复
type TaskFormValues = Pick<Task, 'title' | 'type' | 'status'> & {
  customField?: string;
};
```

### COST_AGGREGATION_PATTERN
// SOURCE: src/data/costData.ts:50-100
```typescript
// 按批次聚合成本
const aggregateByBatch = (records: CostRecord[]) => {
  return records.reduce((acc, record) => {
    const key = record.batchCode;
    acc[key] = acc[key] || { batchCode: key, total: 0 };
    acc[key].total += record.amount;
    return acc;
  }, {} as Record<string, BatchCost>);
};
```

---

## Files to Change

### 类型重构 (5 个文件)
| File | Action | Justification |
|---|---|---|
| `src/components/labor/worklog/types.ts` | UPDATE | 添加 batchId, taskId 关联字段 |
| `src/components/labor/attendance/types.ts` | UPDATE | 添加 batchId, taskId 关联字段 |
| `src/components/labor/salary/types.ts` | UPDATE | 添加 batchCost, actualWorkload 字段 |
| `src/components/summary/types.ts` | UPDATE | 添加 BatchSummary, CostComparison 类型 |
| `src/types/index.ts` | UPDATE | Task 类型添加 isTemporary 标志 |

### 数据层 (3 个文件)
| File | Action | Justification |
|---|---|---|
| `src/data/summaryData.ts` | CREATE | 新建：生产汇总表聚合数据服务 |
| `src/hooks/useBatchSummary.ts` | CREATE | 新建：批次汇总数据 Hook |
| `src/hooks/useBatchCosts.ts` | CREATE | 新建：批次成本聚合 Hook |

### 页面重构 (2 个文件)
| File | Action | Justification |
|---|---|---|
| `src/pages/PlanSummary.tsx` | UPDATE | 移除硬编码，改为使用 useBatchSummary hook |
| `src/pages/Production.tsx` | UPDATE | 添加批次明细查看功能 |

### Mock数据更新 (1 个文件)
| File | Action | Justification |
|---|---|---|
| `src/data/mockData.ts` | UPDATE | 为 WorkLog/Attendance 添加 batchId mock 数据 |

### 组件更新 (2-3 个文件)
| File | Action | Justification |
|---|---|---|
| `src/components/summary/StatCards.tsx` | UPDATE | 支持动态数据渲染 |
| `src/components/summary/SummaryTable.tsx` | UPDATE | 支持批次筛选和关联跳转 |

---

## NOT Building

- **不计件工资系统改造** - 仅添加关联字段，不重构工资计算逻辑
- **真实后端API对接** - 继续使用 mockData，仅改变数据聚合方式
- **WorkLog/Attendance 表单重构** - 仅添加 batchId 字段，不改变表单逻辑
- **MaterialReceiving 改动** - 该模块已有 productionBatchCode，不需修改

---

## Step-by-Step Tasks

### Task 1: 重构 WorkLog 类型定义
- **ACTION**: 在 WorkLog 类型中添加 batchId 和 taskId 可选字段
- **IMPLEMENT**:
  ```typescript
  interface WorkLog {
    // ... 现有字段
    taskId?: string;    // 新增：关联任务
    batchId?: string;   // 新增：关联批次
  }
  ```
- **MIRROR**: TYPE_EXTENSION_PATTERN
- **IMPORTS**: 无新增依赖
- **GOTCHA**: batchId 设为可选，保持向后兼容
- **VALIDATE**: TypeScript 编译无错误

### Task 2: 重构 Attendance 类型定义
- **ACTION**: 在 AttendanceRecord 类型中添加 batchId 和 taskId 可选字段
- **IMPLEMENT**:
  ```typescript
  interface AttendanceRecord {
    // ... 现有字段
    taskId?: string;    // 新增
    batchId?: string;   // 新增
  }
  ```
- **MIRROR**: TYPE_EXTENSION_PATTERN
- **IMPORTS**: 无新增依赖
- **GOTCHA**: 同 WorkLog，保持向后兼容
- **VALIDATE**: TypeScript 编译无错误

### Task 3: 创建批次成本类型定义
- **ACTION**: 在 summary/types.ts 中添加成本对比类型
- **IMPLEMENT**:
  ```typescript
  interface BatchCostSummary {
    batchId: string;
    batchCode: string;
    laborCost: number;      // 人工成本
    materialCost: number;    // 物料成本
    totalCost: number;
    budgetCost: number;     // 预算成本
    variance: number;       // 差异
    varianceRate: number;    // 差异率
  }

  interface BatchSummary {
    // ... Plan 类型字段
    taskCount: number;       // 关联任务数
    completedTaskCount: number;
    totalWorkHours: number;  // 总工时
    attendanceDays: number;  // 考勤天数
  }
  ```
- **MIRROR**: TYPE_EXTENSION_PATTERN
- **IMPORTS**: 无新增依赖
- **GOTCHA**: varianceRate 计算需处理除零情况
- **VALIDATE**: 类型检查通过

### Task 4: 创建生产汇总数据聚合服务
- **ACTION**: 新建 src/data/summaryData.ts
- **IMPLEMENT**:
  ```typescript
  import { cropBatches } from './mockData';
  import { tasks } from './mockData';
  import { workLogs } from './mockData';
  import { attendanceRecords } from './mockData';

  export interface BatchSummary {
    id: string;
    code: string;
    crop: string;
    variety: string;
    greenhouse: string;
    area: number;
    targetYield: number;
    actualYield: number;
    completionRate: string;
    status: string;
    taskCount: number;
    completedTaskCount: number;
    totalWorkHours: number;
  }

  export function getBatchSummaries(): BatchSummary[] {
    return cropBatches.map(batch => {
      const batchTasks = tasks.filter(t => t.batchId === batch.id);
      const completedTasks = batchTasks.filter(t => t.status === 'completed');
      const batchWorkLogs = workLogs.filter(w => w.batchId === batch.id);
      const totalWorkHours = batchWorkLogs.reduce((sum, w) => sum + (w.workDuration || 0), 0);

      return {
        id: batch.id,
        code: batch.batchCode,
        crop: batch.cropName,
        variety: batch.variety,
        greenhouse: batch.greenhouse?.name || '',
        area: batch.plantingArea,
        targetYield: batch.targetYield,
        actualYield: batch.actualYield,
        completionRate: calculateCompletion(batch),
        status: batch.status,
        taskCount: batchTasks.length,
        completedTaskCount: completedTasks.length,
        totalWorkHours,
      };
    });
  }
  ```
- **MIRROR**: COST_AGGREGATION_PATTERN
- **IMPORTS**: mockData.ts, types
- **GOTCHA**: mockData 中 workLogs 目前无 batchId，需先更新 mockData
- **VALIDATE**: 函数调用返回正确聚合数据

### Task 5: 创建 useBatchSummary Hook
- **ACTION**: 新建 src/hooks/useBatchSummary.ts
- **IMPLEMENT**:
  ```typescript
  import { useState, useEffect, useMemo } from 'react';
  import { getBatchSummaries, BatchSummary } from '../data/summaryData';

  export function useBatchSummary(selectedBatchId?: string) {
    const [summaries, setSummaries] = useState<BatchSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // 模拟异步加载
      const data = getBatchSummaries();
      setSummaries(data);
      setLoading(false);
    }, []);

    const filteredSummary = useMemo(() => {
      if (!selectedBatchId) return null;
      return summaries.find(s => s.id === selectedBatchId) || null;
    }, [selectedBatchId, summaries]);

    return { summaries, filteredSummary, loading };
  }
  ```
- **MIRROR**: DATA_SERVICE_PATTERN
- **IMPORTS**: React hooks
- **GOTCHA**: 保持 loading 状态，UI 需处理加载态
- **VALIDATE**: Hook 在组件中正常工作

### Task 6: 更新 mockData 添加 batchId
- **ACTION**: 为 workLogs 和 attendanceRecords 添加 batchId mock 数据
- **IMPLEMENT**: 在 mockData.ts 中为每条 workLog 和 attendance 添加 batchId: string 字段
- **MIRROR**: 现有 mockData 结构
- **IMPORTS**: 无新增依赖
- **GOTCHA**: 确保关联的 batchId 在 cropBatches 中存在
- **VALIDATE**: TypeScript 编译无错误

### Task 7: 重构 PlanSummary.tsx 使用动态数据
- **ACTION**: 移除硬编码的 planSummary，改为 useBatchSummary hook
- **IMPLEMENT**:
  ```typescript
  import { useBatchSummary } from '../hooks/useBatchSummary';

  export default function PlanSummary() {
    const { summaries, loading } = useBatchSummary();

    // ... 现有 UI 结构
    // 将 planSummary.map 改为 summaries.map
  }
  ```
- **MIRROR**: DATA_SERVICE_PATTERN
- **IMPORTS**: useBatchSummary
- **GOTCHA**: 需要处理 loading 状态的 UI
- **VALIDATE**: 页面渲染正确，批次数据显示正常

### Task 8: 更新 StatCards 组件支持动态数据
- **ACTION**: StatCards.tsx 改为接收动态汇总数据
- **IMPLEMENT**: 将硬编码的统计数据改为从 props. summaries 计算
- **MIRROR**: 现有 StatCards 实现
- **IMPORTS**: BatchSummary 类型
- **GOTCHA**: 总面积/总产量需从所有批次汇总
- **VALIDATE**: 统计卡片数据与批次数据一致

### Task 9: 创建成本对比聚合服务 (可选)
- **ACTION**: 在 summaryData.ts 中添加 getBatchCosts 函数
- **IMPLEMENT**: 聚合 Attendance + Salary + MaterialReceiving 按 batchId 计算实际成本
- **MIRROR**: COST_AGGREGATION_PATTERN
- **IMPORTS**: costData.ts, materialReceivingData.ts
- **GOTCHA**: 需处理单位统一（可能有的用小时，有的用天）
- **VALIDATE**: 成本数据正确聚合

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| getBatchSummaries | 正常 cropBatches | 返回所有批次汇总 | 空数组 |
| 成本聚合 | 无 batchId 的记录 | 跳过/归为"未分配" | 全部无 batchId |
| completionRate 计算 | targetYield=0 | 显示 "N/A" | targetYield=0 |
| varianceRate 计算 | budgetCost=0 | 显示 "N/A" | budgetCost=0 |

### Edge Cases Checklist
- [x] 空数组（无批次数据）
- [x] targetYield 为 0
- [x] budgetCost 为 0
- [x] 无关联 batchId 的 WorkLog/Attendance
- [x] 批次已完成但任务未全部关联

---

## Validation Commands

### Static Analysis
```bash
cd "d:\TMcrop\yuanxingtu\V1.1"
npx tsc --noEmit
```
EXPECT: Zero type errors

### Build Verification
```bash
cd "d:\TMcrop\yuanxingtu\V1.1"
npm run build
```
EXPECT: 构建成功，dist/ 生成正确资源

### Manual Validation
- [ ] 打开 PlanSummary 页面，确认显示动态批次数据
- [ ] 切换不同批次，确认数据筛选正常
- [ ] 确认统计卡片（总面积、总产量、完成率）与批次数据一致
- [ ] 确认页面无 JS 运行时错误

---

## Acceptance Criteria
- [ ] PlanSummary.tsx 不再使用硬编码的 planSummary 数组
- [ ] WorkLog 类型包含 batchId 可选字段
- [ ] Attendance 类型包含 batchId 可选字段
- [ ] useBatchSummary hook 可正常返回批次汇总数据
- [ ] 页面渲染的批次数量与 mockData.cropBatches 一致
- [ ] StatCards 显示的总计数据是各批次的正确加总
- [ ] TypeScript 编译无错误
- [ ] npm run build 成功

---

## Completion Checklist
- [ ] 所有 Task 完成
- [ ] 验证命令通过
- [ ] 手动测试页面功能正常
- [ ] 代码遵循现有模式
- [ ] 类型定义清晰
- [ ] 无破坏性变更（其他模块不受影响）

---

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| mockData 改动影响其他模块 | 中 | 中 | 仅添加可选字段，保持向后兼容 |
| 性能问题（大数据量聚合） | 低 | 中 | 使用 useMemo 缓存，避免重复计算 |
| 类型变更导致其他组件报错 | 低 | 高 | 先添加可选字段，分步实施 |

---

## Notes
1. 本次重构**不涉及后端API**，所有数据继续使用 mockData
2. batchId 字段在 WorkLog/Attendance 中为**可选**，保持向后兼容
3. 成本对比分析（Task 9）为可选任务，如时间紧张可延后
4. 下一步可考虑：打通 Budget 模块的预算 vs 实际成本对比
