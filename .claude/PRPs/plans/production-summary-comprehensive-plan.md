# 生产汇总表工作流闭环重构 - 综合实施方案

> 综合10位专业Agent方案，形成可实际落地的实施方案

## 版本信息
- **版本**: v1.0
- **日期**: 2026-04-10
- **状态**: 待实施
- **综合来源**: 业务流程专家、架构设计师、UI设计专家、数据架构专家、前端架构专家、工作流引擎专家、成本核算专家、生产管理专家、TypeScript类型设计专家、可扩展性架构专家

---

## 一、现状问题诊断

### 1.1 核心问题汇总

| 问题 | 严重度 | 位置 | 影响 |
|------|--------|------|------|
| PlanSummary.tsx 硬编码5条演示数据 | **P0** | `src/pages/PlanSummary.tsx:32-38` | 生产汇总表无法显示真实数据 |
| WorkLog 无 batchId 关联 | **P0** | `src/components/labor/worklog/types.ts` | 工作日志无法追溯到具体批次 |
| Attendance 无 batchId 关联 | **P1** | `src/components/labor/attendance/types.ts` | 考勤数据无法汇总到批次人工成本 |
| Salary 无批次成本字段 | **P1** | `src/components/labor/salary/types.ts` | 计件/工时工资无法自动汇总到批次 |
| Budget 与实际成本断开 | **P1** | `src/components/labor/budget/types.ts` | 预算和实际成本没有闭环对照 |
| Task 与 TempTask 分离 | **P2** | `src/types/index.ts` | 任务类型不统一 |

### 1.2 数据孤岛示意图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CropBatch (核心批次)                          │
│  batchCode, cropName, targetYield, actualYield, status            │
└────────────────────┬────────────────────────────────────────────────┘
                     │ batchId
         ┌───────────┼───────────┬─────────────┬───────────────┐
         ▼           ▼           ▼             ▼               ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐   ┌─────────┐
    │  Task   │ │ WorkLog │ │Attendance│ │ Material │   │ Salary  │
    │  ✅有   │ │   ❌    │ │    ❌    │ │Receiving │   │    ❌    │
    │ batchId │ │ 无关联  │ │  无关联  │ │  ✅有    │   │ 无关联   │
    └─────────┘ └─────────┘ └─────────┘ └──────────┘   └─────────┘
```

### 1.3 当前页面布局模式

所有汇总页面遵循统一布局（已验证）：

```tsx
// 布局结构：space-y-6 垂直间距
<div className="space-y-6">
  <PageHeader icon={...} title="..." description="..." />
  <StatCards cards={statCards} />
  <Filters filters={...} showExportMode={...} ... />
  <SummaryTable columns={...} data={...} ... />
  <ExportModal isOpen={...} ... />
</div>
```

---

## 二、综合方案目标

### 2.1 直接目标（本次实施）

1. **消除数据孤岛** - WorkLog、Attendance 通过 batchId 关联到 CropBatch
2. **PlanSummary 动态化** - 移除硬编码，从真实数据聚合
3. **保持页面一致性** - 遵循现有页面布局模式
4. **组件式编码** - 采用组件化开发，数据从 types/mockData 导入

### 2.2 扩展目标（后续迭代）

1. **成本归集** - Salary 与批次成本关联
2. **预算对比** - Budget 与实际成本闭环
3. **工作流自动化** - 状态变更触发自动动作

---

## 三、页面布局与交互设计

### 3.1 保持现有布局模式

**必须保持的布局元素**：
- 外层容器: `<div className="space-y-6">`
- 页面标题: `<PageHeader icon={...} title="生产计划汇总" description="..." />`
- 统计卡片: `<StatCards cards={statCards} />`
- 筛选工具栏: `<Filters filters={...} ... />`
- 数据表格: `<SummaryTable columns={...} data={...} ... />`
- 导出弹窗: `<ExportModal isOpen={...} ... />`

**保持的样式规范**：
- 卡片背景: `bg-[#F2F6FA] rounded-xl p-4 shadow-sm`
- 表格容器: `bg-white rounded-xl shadow-sm overflow-hidden`
- 分页器: `flex items-center justify-between px-4 py-3 border-t border-gray-100`

### 3.2 新增交互功能

| 功能 | 交互方式 | 说明 |
|------|----------|------|
| 批次详情查看 | 点击表格行 → 右侧 Sheet | 展示批次的任务、工时、成本明细 |
| 批次筛选 | 标签组 + 下拉组合 | 按作物、温室、状态筛选 |
| 成本预警 | 卡片标签变红 | 当实际成本超过预算时 |
| 钻取跳转 | 操作列下拉菜单 | 跳转查看工时明细、成本明细等 |

### 3.3 数据钻取路径

```
生产汇总表(PlanSummary)
    │
    ├── 点击批次行 ──► BatchDetailSheet (右侧滑出)
    │                      │
    │                      ├── Tab: 任务明细 (TaskList)
    │                      ├── Tab: 工时明细 (WorkLogList)
    │                      ├── Tab: 成本明细 (CostBreakdown)
    │                      └── Tab: 考勤明细 (AttendanceList)
    │
    └── 操作列菜单
              ├── [查看详情] ──► BatchDetailSheet
              ├── [工时记录] ──► /labor/worklog?batchId=xxx
              ├── [成本分析] ──► /labor/cost?batchId=xxx
              └── [导出] ──► ExportModal
```

---

## 四、数据模型设计

### 4.1 类型扩展方案

**设计原则**：
- 保持向后兼容（batchId 为可选字段）
- 类型定义在模块内部，通过 index.ts 导出
- 视图类型（聚合数据）统一放在 `src/types/views.ts`

**新增/修改的类型文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/views.ts` | CREATE | 聚合视图类型（BatchSummaryRow 等） |
| `src/components/labor/worklog/types.ts` | UPDATE | 添加 batchId, taskId 可选字段 |
| `src/components/labor/attendance/types.ts` | UPDATE | 添加 batchId 可选字段 |
| `src/components/summary/types.ts` | UPDATE | 添加 BatchSummary 类型 |

### 4.2 类型定义代码

```typescript
// src/types/views.ts - 新建，聚合视图类型

/**
 * 批次汇总行（用于 PlanSummary 表格）
 */
export interface BatchSummaryRow {
  id: string;
  batchCode: string;           // 批次编号
  cropName: string;            // 作物名称
  variety: string;             // 品种
  greenhouse: string;           // 温室
  plantingArea: number;         // 种植面积(亩)
  targetYield: number;          // 目标产量(kg)
  actualYield: number;          // 实际产量(kg)
  completionRate: string;      // 完成率
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  // 扩展字段（新增）
  taskCount: number;           // 关联任务数
  completedTaskCount: number;  // 已完成任务数
  totalWorkHours: number;      // 总工时
  laborCost: number;           // 人工成本(元)
  materialCost: number;        // 物料成本(元)
  statusClass: 'normal' | 'warning' | 'danger';
}

/**
 * 统计卡片配置
 */
export interface SummaryStatCard {
  label: string;               // 卡片标签
  value: string | number;      // 卡片数值
  icon: React.ReactNode;       // 图标
  iconBgColor: string;        // 图标背景色
  trend?: number;             // 变化趋势(百分比)
  trendDirection?: 'up' | 'down';
}

/**
 * 成本对比
 */
export interface CostComparison {
  batchId: string;
  budgetCost: number;          // 预算成本
  actualCost: number;         // 实际成本
  variance: number;           // 差异金额
  varianceRate: number;       // 差异率(%)
}
```

```typescript
// src/components/labor/worklog/types.ts - 修改

export interface WorkLog {
  id: number;
  code: string;
  date: string;
  worker: string;
  // ... 现有字段 ...

  // 【新增】关联字段（可选，保持向后兼容）
  taskId?: string;            // 关联任务ID
  batchId?: string;           // 关联批次ID
  batchCode?: string;         // 批次编号（冗余便于显示）
}
```

```typescript
// src/components/labor/attendance/types.ts - 修改

export interface AttendanceRecord {
  id: number;
  workerId: string;
  name: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  // ... 现有字段 ...

  // 【新增】关联字段（可选）
  taskId?: string;            // 关联任务ID
  batchId?: string;           // 关联批次ID
}
```

### 4.3 mockData 扩展

```typescript
// src/data/mockData.ts - 扩展 WorkLog 和 Attendance

// 为 WorkLog 添加 batchId
export const workLogs: WorkLog[] = [
  {
    id: 1,
    code: 'WL20240101',
    date: '2024-01-01',
    worker: '张三',
    batchId: 'B001',          // 新增：关联到番茄批次
    batchCode: 'B20240101',
    // ... 其他字段
  },
  // ...
];

// 为 Attendance 添加 batchId
export const attendanceRecords: AttendanceRecord[] = [
  {
    id: 1,
    workerId: 'W001',
    name: '张三',
    date: '2024-01-01',
    batchId: 'B001',          // 新增
    // ... 其他字段
  },
  // ...
];
```

---

## 五、架构设计

### 5.1 推荐的代码组织结构

```
src/
├── components/
│   ├── summary/                      # 【改造】汇总模块
│   │   ├── index.ts
│   │   ├── types.ts                 # 原有类型
│   │   ├── PageHeader.tsx           # 保留
│   │   ├── StatCards.tsx            # 改造：支持动态数据
│   │   ├── Filters.tsx              # 保留
│   │   ├── SummaryTable.tsx          # 保留
│   │   ├── Pagination.tsx            # 保留
│   │   ├── ExportModal.tsx          # 保留
│   │   ├── ReportTabs.tsx           # 保留
│   │   ├── ReportCharts.tsx         # 保留
│   │   ├── useExport.ts             # 保留
│   │   └── NEW: BatchDetailSheet.tsx # 【新增】批次详情侧边栏
│   │
│   └── labor/                       # 【改造】人工模块
│       └── (各子模块添加 batchId)
│
├── pages/
│   ├── PlanSummary.tsx              # 【改造】使用动态数据
│   └── ...
│
├── hooks/                           # 【新建】业务 Hooks
│   ├── useBatchSummary.ts          # 批次汇总数据
│   ├── useBatchDetail.ts           # 批次详情（用于 Sheet）
│   └── index.ts
│
├── services/                        # 【新建】服务层（可选，本次不实施）
│   └── batchService.ts             # 批次数据聚合
│
├── types/                           # 【扩展】类型定义
│   ├── index.ts                    # 核心类型
│   └── views.ts                    # 【新建】视图类型
│
└── data/
    └── mockData.ts                  # 【扩展】添加 batchId mock 数据
```

### 5.2 服务层设计（简化版）

**本次实施采用 Hook 直接调用 mockData**，暂不引入完整 Service 层，以降低复杂度。

```typescript
// src/hooks/useBatchSummary.ts

import { useState, useEffect, useMemo } from 'react';
import { cropBatches, tasks, workLogs, attendanceRecords } from '../data/mockData';
import type { BatchSummaryRow, SummaryStatCard } from '../types/views';

/**
 * 获取批次汇总数据
 */
export function useBatchSummary(filters?: {
  cropName?: string;
  status?: string;
  greenhouse?: string;
}) {
  const [loading, setLoading] = useState(true);

  // 模拟异步加载
  useEffect(() => {
    setLoading(true);
    // 模拟数据加载延迟
    setTimeout(() => setLoading(false), 300);
  }, [filters]);

  // 聚合批次汇总数据
  const summaries = useMemo(() => {
    return cropBatches.map(batch => {
      // 聚合任务
      const batchTasks = tasks.filter(t => t.batchId === batch.id);
      const completedTasks = batchTasks.filter(t => t.status === 'completed');

      // 聚合工时（通过 taskId 关联）
      const batchTaskIds = batchTasks.map(t => t.id);
      const batchWorkLogs = workLogs.filter(w => w.batchId === batch.id || batchTaskIds.includes(w.taskId || ''));
      const totalWorkHours = batchWorkLogs.reduce((sum, w) => sum + (w.workHours || 0), 0);

      // 计算完成率
      const completionRate = batchTasks.length > 0
        ? ((completedTasks.length / batchTasks.length) * 100).toFixed(1) + '%'
        : '0%';

      // 计算状态样式
      const statusClass = completionRate === '100%' ? 'normal' : completionRate > '50%' ? 'warning' : 'danger';

      return {
        id: batch.id,
        batchCode: batch.batchCode,
        cropName: batch.cropName,
        variety: batch.variety,
        greenhouse: typeof batch.greenhouse === 'string' ? batch.greenhouse : batch.greenhouse?.name || '',
        plantingArea: batch.plantingArea,
        targetYield: batch.targetYield,
        actualYield: batch.actualYield,
        completionRate,
        status: batch.status,
        taskCount: batchTasks.length,
        completedTaskCount: completedTasks.length,
        totalWorkHours,
        laborCost: totalWorkHours * 30, // 假设时薪30元
        materialCost: 0, // TODO: 从 MaterialReceiving 聚合
        statusClass,
      } as BatchSummaryRow;
    });
  }, []);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    if (!filters) return summaries;
    return summaries.filter(s => {
      if (filters.cropName && s.cropName !== filters.cropName) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.greenhouse && s.greenhouse !== filters.greenhouse) return false;
      return true;
    });
  }, [summaries, filters]);

  // 计算统计卡片数据
  const statCards = useMemo((): SummaryStatCard[] => {
    const total = filteredSummaries.length;
    const totalArea = filteredSummaries.reduce((sum, s) => sum + s.plantingArea, 0);
    const totalTargetYield = filteredSummaries.reduce((sum, s) => sum + s.targetYield, 0);
    const totalActualYield = filteredSummaries.reduce((sum, s) => sum + s.actualYield, 0);
    const avgCompletion = total > 0
      ? (filteredSummaries.reduce((sum, s) => sum + parseFloat(s.completionRate), 0) / total).toFixed(1)
      : '0';

    return [
      { label: '生产批次', value: total, icon: '📦', iconBgColor: 'bg-blue-500' },
      { label: '种植面积', value: totalArea + '亩', icon: '🌱', iconBgColor: 'bg-green-500' },
      { label: '总产量', value: totalActualYield + 'kg', icon: '📈', iconBgColor: 'bg-orange-500' },
      { label: '平均完成率', value: avgCompletion + '%', icon: '✅', iconBgColor: 'bg-purple-500' },
    ];
  }, [filteredSummaries]);

  return {
    summaries: filteredSummaries,
    statCards,
    loading,
    totalCount: summaries.length,
  };
}
```

---

## 六、组件设计

### 6.1 PlanSummary.tsx 改造

**改造原则**：
- 保持现有页面布局模式不变
- 移除硬编码的 planSummary 数组
- 使用 useBatchSummary Hook 获取动态数据
- 遵循组件式编码规范（数据从 types/mockData 导入）

```tsx
// src/pages/PlanSummary.tsx - 改造后

import { useState } from 'react';
import { PageHeader, StatCards, Filters, SummaryTable, ExportModal } from '../components/summary';
import { useBatchSummary } from '../hooks/useBatchSummary';
import { useExport } from '../components/summary/useExport';
import type { BatchSummaryRow, FilterSelectConfig } from '../types/views';
import { cropNames, greenhouseNames } from '../data/mockData';

export default function PlanSummary() {
  // 状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState<{
    cropName?: string;
    status?: string;
    greenhouse?: string;
  }>({});

  // 数据 Hook
  const { summaries, statCards, loading } = useBatchSummary(filters);

  // 导出 Hook
  const exportHook = useExport({
    data: summaries,
    headers: ['batchCode', 'cropName', 'variety', 'greenhouse', 'plantingArea', 'targetYield', 'actualYield', 'completionRate', 'status'],
    filenamePrefix: '生产计划汇总',
  });

  // 筛选配置
  const filterSelects: FilterSelectConfig[] = [
    {
      key: 'cropName',
      label: '作物',
      options: [
        { value: '', label: '全部' },
        ...cropNames.map(c => ({ value: c, label: c })),
      ],
    },
    {
      key: 'status',
      label: '状态',
      options: [
        { value: '', label: '全部' },
        { value: 'planned', label: '计划中' },
        { value: 'in_progress', label: '进行中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
    {
      key: 'greenhouse',
      label: '温室',
      options: [
        { value: '', label: '全部' },
        ...greenhouseNames.map(g => ({ value: g, label: g })),
      ],
    },
  ];

  // 表格列定义
  const columns = [
    { key: 'batchCode', label: '计划编号', width: '120px' },
    { key: 'cropName', label: '作物', width: '100px' },
    { key: 'variety', label: '品种', width: '120px' },
    { key: 'greenhouse', label: '温室', width: '100px' },
    { key: 'plantingArea', label: '面积(亩)', width: '80px' },
    { key: 'targetYield', label: '目标产量', width: '100px' },
    { key: 'actualYield', label: '实际产量', width: '100px' },
    {
      key: 'completionRate',
      label: '完成率',
      width: '120px',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: value }}
            />
          </div>
          <span className="text-sm">{value}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: '状态',
      width: '100px',
      render: (value: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
          planned: { label: '计划中', className: 'bg-gray-100 text-gray-700' },
          in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
          completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
          cancelled: { label: '已取消', className: 'bg-red-100 text-red-700' },
        };
        const config = statusMap[value] || statusMap.planned;
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
  ];

  // 计算分页
  const totalPages = Math.ceil(summaries.length / pageSize);
  const paginatedData = summaries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={<span className="text-2xl">📊</span>}
        title="生产计划汇总"
        description="查看所有生产批次的进度、产量和成本汇总"
      />

      {/* 统计卡片 */}
      <StatCards cards={statCards} />

      {/* 筛选工具栏 */}
      <Filters
        filters={{ selects: filterSelects }}
        showExportMode={exportHook.exportMode}
        selectedCount={exportHook.selectedRows.length}
        onExportClick={exportHook.handleExportClick}
        onConfirmExport={exportHook.handleConfirmExport}
        onCancelExport={exportHook.handleCancelExport}
      />

      {/* 数据表格 */}
      <SummaryTable
        columns={columns}
        data={paginatedData}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        exportMode={exportHook.exportMode}
        selectedRows={exportHook.selectedRows}
        onPageChange={setCurrentPage}
        onSelectAll={() => exportHook.handleSelectAll(summaries.map(s => s.id))}
        onSelectRow={(id) => exportHook.handleSelectRow(id)}
      />

      {/* 导出弹窗 */}
      <ExportModal
        isOpen={exportHook.showExportModal}
        selectedCount={exportHook.selectedRows.length}
        exportFormat={exportHook.exportFormat}
        onFormatChange={exportHook.setExportFormat}
        onClose={() => exportHook.setShowExportModal(false)}
        onConfirm={exportHook.handleDoExport}
      />
    </div>
  );
}
```

### 6.2 BatchDetailSheet 组件（新增）

```tsx
// src/components/summary/BatchDetailSheet.tsx

import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet'; // 假设已有 Sheet 组件
import { TaskList } from './TaskList';
import { WorkLogList } from './WorkLogList';
import { CostBreakdown } from './CostBreakdown';

interface BatchDetailSheetProps {
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'tasks' | 'worklogs' | 'costs';

export function BatchDetailSheet({ batchId, isOpen, onClose }: BatchDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="批次详情">
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'tasks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('tasks')}
        >
          任务明细
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'worklogs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('worklogs')}
        >
          工时明细
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'costs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('costs')}
        >
          成本明细
        </button>
      </div>

      {activeTab === 'tasks' && <TaskList batchId={batchId} />}
      {activeTab === 'worklogs' && <WorkLogList batchId={batchId} />}
      {activeTab === 'costs' && <CostBreakdown batchId={batchId} />}
    </Sheet>
  );
}
```

---

## 七、实施计划

### 7.1 分阶段实施

| 阶段 | 任务 | 文件变更 | 工期 | 风险 |
|------|------|----------|------|------|
| **Phase 1** | 类型定义扩展 | 新建 `src/types/views.ts`，修改各模块 `types.ts` | 0.5天 | 低 |
| **Phase 2** | mockData 扩展 | 修改 `src/data/mockData.ts`，添加 batchId | 0.5天 | 低 |
| **Phase 3** | Hook 开发 | 新建 `src/hooks/useBatchSummary.ts` | 1天 | 中 |
| **Phase 4** | 页面改造 | 改造 `src/pages/PlanSummary.tsx` | 1天 | 中 |
| **Phase 5** | 组件增强 | 改造 `StatCards.tsx`，新增 `BatchDetailSheet.tsx` | 1天 | 中 |
| **Phase 6** | 测试验证 | 全流程测试，构建验证 | 1天 | 低 |

**总工期**: 约 5 天

### 7.2 具体任务分解

#### Phase 1: 类型定义扩展

1. **创建 `src/types/views.ts`**
   - 定义 `BatchSummaryRow` 接口
   - 定义 `SummaryStatCard` 接口
   - 定义 `CostComparison` 接口

2. **修改 `src/components/labor/worklog/types.ts`**
   - 添加 `taskId?: string` 字段
   - 添加 `batchId?: string` 字段
   - 添加 `batchCode?: string` 字段

3. **修改 `src/components/labor/attendance/types.ts`**
   - 添加 `taskId?: string` 字段
   - 添加 `batchId?: string` 字段

#### Phase 2: mockData 扩展

1. **修改 `src/data/mockData.ts`**
   - 为 `workLogs` 数组的每个元素添加 `batchId` 和 `taskId`
   - 为 `attendanceRecords` 数组的每个元素添加 `batchId`
   - 确保关联的 batchId 在 `cropBatches` 中存在

#### Phase 3: Hook 开发

1. **创建 `src/hooks/useBatchSummary.ts`**
   - 实现数据聚合逻辑
   - 实现筛选功能
   - 返回 `summaries`, `statCards`, `loading`

2. **创建 `src/hooks/index.ts`**
   - 导出所有 hooks

#### Phase 4: 页面改造

1. **改造 `src/pages/PlanSummary.tsx`**
   - 移除硬编码的 `planSummary` 数组
   - 使用 `useBatchSummary` Hook
   - 保持现有页面布局模式
   - 添加筛选下拉配置

#### Phase 5: 组件增强

1. **改造 `src/components/summary/StatCards.tsx`**
   - 支持动态传入 `SummaryStatCard[]` 数据
   - 保持现有样式

2. **（可选）创建 `src/components/summary/BatchDetailSheet.tsx`**
   - 批次详情侧边栏组件
   - Tab 切换：任务/工时/成本

#### Phase 6: 测试验证

1. **功能测试**
   - [ ] 页面加载显示真实批次数据
   - [ ] 统计卡片数据正确汇总
   - [ ] 筛选功能正常工作
   - [ ] 导出功能正常

2. **构建测试**
   ```bash
   npm run build
   ```
   - [ ] 构建成功
   - [ ] 无 TypeScript 错误

---

## 八、验证清单

### 8.1 代码检查

- [ ] 所有类型从 `types/` 目录导入
- [ ] 所有 mock 数据从 `data/` 目录导入
- [ ] 无硬编码的业务数据（枚举值等从 mockData 导入）
- [ ] JSX 标签正确闭合
- [ ] 无未使用的 import

### 8.2 功能验证

- [ ] PlanSummary 页面显示所有 cropBatches 数据
- [ ] StatCards 显示正确的汇总统计
- [ ] 筛选器可以按作物/状态/温室筛选
- [ ] 表格分页正常工作
- [ ] 导出功能正常

### 8.3 构建验证

```bash
npm run build
```
- [ ] 构建成功
- [ ] dist/ 生成正确资源

---

## 九、风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| mockData 改动影响其他模块 | 中 | 中 | 仅添加可选字段，保持向后兼容 |
| 筛选逻辑遗漏边界情况 | 低 | 中 | 充分测试各种筛选组合 |
| 组件样式与现有风格不一致 | 低 | 高 | 复用现有 summary 组件，保持样式一致 |
| 类型错误导致编译失败 | 低 | 高 | 分阶段提交，每阶段验证构建 |

---

## 十、后续迭代建议

### 10.1 下一步（3个月内）

1. **成本归集**
   - Salary 添加 batchCost 字段
   - 实现批次人工成本计算

2. **Budget 对比**
   - Budget 模块对接实际成本
   - 差异分析报表

3. **工作流自动化**
   - Task 完成 → 自动生成 WorkLog
   - CropBatch 所有任务完成 → 自动标记完成

### 10.2 中期规划（6个月内）

1. **后端对接**
   - 设计 REST API
   - 实现 Repository 模式
   - 数据迁移到真实数据库

2. **移动端适配**
   - 响应式布局优化
   - 移动端操作优化

3. **高级可视化**
   - 生产进度甘特图
   - 成本对比图表
   - 产能趋势分析

---

## 十一、备份恢复指南

如需恢复备份，执行：

```bash
# 恢复组件
cp public/backup_20260410/components/summary/* src/components/summary/

# 恢复页面
cp public/backup_20260410/pages/* src/pages/
```

备份详情见：`public/backup_20260410/README.md`

---

## 十二、参考文档

### 12.1 10位专家方案文件

| 专家 | 方案文件 |
|------|----------|
| 业务流程专家 | `C:\Users\lqch7\.claude\plans\floofy-jumping-valiant-agent-aa4d58238ba36e9f4.md` |
| 架构设计师 | （已在Agent中输出） |
| UI设计专家 | `C:\Users\lqch7\.claude\plans\floofy-jumping-valiant-agent-aa22e0502562b896f.md` |
| 数据架构专家 | `C:\Users\lqch7\.claude\plans\floofy-jumping-valiant-agent-a34722d7ad9499c3e.md` |
| 前端架构专家 | （已在Agent中输出） |
| 工作流引擎专家 | `C:\Users\lqch7\.claude\plans\floofy-jumping-valiant-agent-a2af90820591dfd1f.md` |
| 成本核算专家 | `C:\Users\lqch7\.claude\plans\floofy-jumping-valiant-agent-adea731e129ad2dec.md` |
| 生产管理专家 | `C:\Users\lqch7\.claude\plans\floofy-jumping-valiant-agent-aafa894b973d8c76e.md` |
| TypeScript类型专家 | `C:\Users\lqch7\.claude\plans\floofy-jumping-valiant-agent-a9619cbdd26813ce1.md` |
| 可扩展性专家 | `C:\Users\lqch7\.claude\plans\floofy-jumping-valiant-agent-a4d49654cfa0319f9.md` |

### 12.2 原有计划文件

- `.claude/PRPs/plans/production-summary-workflow-closure.plan.md`
