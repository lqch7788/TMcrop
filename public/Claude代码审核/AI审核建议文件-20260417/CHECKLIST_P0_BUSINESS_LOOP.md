# P0 业务闭环修复清单（升级版）

**优先级：** P0（演示核心）
**目标：** 实现完整的业务数据闭环，消除数据孤岛
**评估基准：** 系统闭环完整性约 4.5/10

---

## 紧急度矩阵

| 维度 | P0问题数 | 综合评分 | 目标评分 |
|------|----------|----------|----------|
| 物料模块 | 3个P0 | 6/10 → 8/10 | 8/10 |
| 农事任务 | 1个P0 | 5/10 → 7/10 | 7/10 |
| 生产批次 | 2个P0 | 4/10 → 7/10 | 7/10 |
| 人工管理 | 1个P0 | 3/10 → 6/10 | 6/10 |

---

## 任务组A：物料模块闭环（P0）

### 任务A1：出库→库存事务绑定 ⚠️ P0

**文件：** `src/hooks/materialReceiving/useMaterialReceiving.ts`

**问题：** 出库操作未联动库存扣减，inventory_records 与 outbound 记录不同步

**修改步骤：**

#### Step A1.1: 添加库存操作函数

找到 `handleOutbound` 或类似函数，在文件适当位置添加：

```typescript
// 库存扣减函数
const deductInventory = (materials: MaterialItem[], relatedForm: string) => {
  try {
    const inventoryData = JSON.parse(
      localStorage.getItem('inventory_records') || '[]'
    );

    const deductRecords = materials.map(m => ({
      id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      materialCode: m.materialCode || '',
      materialName: m.materialName || '',
      warehouse: '默认仓库',
      quantity: m.quantity || 0,
      unit: m.unit || '个',
      deductTime: new Date().toISOString(),
      deductType: 'material_execute',
      relatedForm: relatedForm,
      approvedBy: '系统'
    }));

    localStorage.setItem('inventory_records', JSON.stringify([
      ...inventoryData,
      ...deductRecords
    ]));

    console.log('【库存扣减】出库单已扣减库存', deductRecords);
    return true;
  } catch (error) {
    console.error('【库存扣减】失败', error);
    return false;
  }
};
```

#### Step A1.2: 修改出库处理函数

找到出库提交函数，添加库存扣减调用：

```typescript
// 原来：
const handleOutboundSubmit = async (record) => {
  await saveOutboundRecord(record);
};

// 修改为：
const handleOutboundSubmit = async (record) => {
  // 先扣减库存
  const deducted = deductInventory(record.materials, record.code);
  if (!deducted) {
    toast.error('库存扣减失败，请重试');
    return;
  }
  // 再保存出库记录
  await saveOutboundRecord(record);
  toast.success('出库成功');
};
```

---

### 任务A2：退库→库存红字回滚 ⚠️ P0

**文件：** `src/components/materialReturn/`

**问题：** 退库审核通过后未自动回滚库存

**修改步骤：**

#### Step A2.1: 添加库存回滚函数

在退库相关 hook 或组件中添加：

```typescript
// 库存回滚函数（红字出库）
const rollbackInventory = (materials: MaterialItem[], relatedForm: string) => {
  try {
    const inventoryData = JSON.parse(
      localStorage.getItem('inventory_records') || '[]'
    );

    // 回滚记录（数量为负）
    const rollbackRecords = materials.map(m => ({
      id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      materialCode: m.materialCode || '',
      materialName: m.materialName || '',
      warehouse: '默认仓库',
      quantity: -(m.quantity || 0), // 负数表示回滚
      unit: m.unit || '个',
      deductTime: new Date().toISOString(),
      deductType: 'material_return', // 退库类型标识
      relatedForm: relatedForm,
      approvedBy: '系统'
    }));

    localStorage.setItem('inventory_records', JSON.stringify([
      ...inventoryData,
      ...rollbackRecords
    ]));

    console.log('【库存回滚】退库单已回滚库存', rollbackRecords);
    return true;
  } catch (error) {
    console.error('【库存回滚】失败', error);
    return false;
  }
};
```

#### Step A2.2: 修改退库确认函数

找到退库审核通过的处理函数，添加回滚调用：

```typescript
// 原来：
const handleReturnApprove = async (returnRecord) => {
  await updateReturnStatus(returnRecord.id, 'approved');
};

// 修改为：
const handleReturnApprove = async (returnRecord) => {
  // 先回滚库存
  const rolled = rollbackInventory(returnRecord.materials, returnRecord.code);
  if (!rolled) {
    toast.error('库存回滚失败，请重试');
    return;
  }
  // 再更新退库状态
  await updateReturnStatus(returnRecord.id, 'approved');
  toast.success('退库确认成功');
};
```

---

### 任务A3：审批→出库自动流转 ⚠️ P0

**文件：** `src/hooks/materialReceiving/useMaterialReceiving.ts`

**问题：** 审批通过后未自动推送到出库待办列表

**修改步骤：**

#### Step A3.1: 导入 ApprovalContext

在文件顶部添加：

```typescript
import { useApproval } from '../../contexts/ApprovalContext';
```

#### Step A3.2: 添加审批监听

在 hook 内部添加：

```typescript
// 获取审批上下文
const { approvals } = useApproval();

// 从审批通过的申请单中提取待出库数据
const approvedPendingExecute = useMemo(() => {
  return approvals
    .filter(a =>
      a.type === 'MATERIAL_REQUEST' &&
      a.status === 'approved'
    )
    .map(a => ({
      id: a.id,
      code: a.code.replace('LL', 'CK'), // 申请单号→出库单号
      sourceApplicationCode: a.code,
      applicant: a.applicant || '未知',
      department: a.department || '未知部门',
      executeStatus: 'pending' as const,
      executeTime: null,
      materials: a.materials || [],
      createdAt: a.createdAt
    }));
}, [approvals]);

// 监听审批通过事件，自动同步到出库数据
useEffect(() => {
  if (approvedPendingExecute.length > 0) {
    setExecuteData(prev => {
      const completedRecords = prev.filter(e => e.executeStatus === 'completed');
      const existingIds = prev.map(e => e.sourceApplicationCode);
      const newRecords = approvedPendingExecute.filter(
        a => !existingIds.includes(a.code)
      );
      return [...completedRecords, ...newRecords];
    });
  }
}, [approvedPendingExecute]);
```

---

## 任务组B：农事任务闭环（P0）

### 任务B1：超时预警接入实际数据 ⚠️ P0

**文件：** `src/hooks/farm/useTaskAlert.ts` 或新建

**问题：** 超时预警未接入实际任务数据

**修改步骤：**

#### Step B1.1: 创建任务超时检查 hook

```typescript
// src/hooks/farm/useTaskTimeoutAlert.ts

import { useEffect, useCallback } from 'react';
import { useTasks } from './useTasks';

interface TimeoutAlert {
  taskId: string;
  taskCode: string;
  deadline: string;
  overdueHours: number;
  severity: 'warning' | 'critical';
}

export const useTaskTimeoutAlert = () => {
  const { tasks } = useTasks();

  // 检查超时任务
  const checkTimeoutTasks = useCallback((): TimeoutAlert[] => {
    const now = new Date();
    const alerts: TimeoutAlert[] = [];

    tasks.forEach(task => {
      if (task.status === 'pending' || task.status === 'in_progress') {
        const deadline = new Date(task.deadline);
        const diffHours = (now.getTime() - deadline.getTime()) / (1000 * 60 * 60);

        if (diffHours > 0) {
          alerts.push({
            taskId: task.id,
            taskCode: task.code,
            deadline: task.deadline,
            overdueHours: Math.round(diffHours),
            severity: diffHours > 24 ? 'critical' : 'warning'
          });
        }
      }
    });

    return alerts;
  }, [tasks]);

  // 保存预警到 localStorage
  const saveAlerts = useCallback((alerts: TimeoutAlert[]) => {
    const existingAlerts = JSON.parse(
      localStorage.getItem('yuanxingtu_task_alerts') || '[]'
    );

    // 合并去重
    const existingIds = existingAlerts.map((a: TimeoutAlert) => a.taskId);
    const newAlerts = alerts.filter(a => !existingIds.includes(a.taskId));

    localStorage.setItem('yuanxingtu_task_alerts', JSON.stringify([
      ...existingAlerts,
      ...newAlerts.map(a => ({ ...a, createdAt: new Date().toISOString() }))
    ]));
  }, []);

  // 定时检查（每5分钟）
  useEffect(() => {
    const interval = setInterval(() => {
      const alerts = checkTimeoutTasks();
      if (alerts.length > 0) {
        saveAlerts(alerts);
        console.log('【超时预警】检测到', alerts.length, '个超时任务');
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkTimeoutTasks, saveAlerts]);

  return { checkTimeoutTasks, alerts: checkTimeoutTasks() };
};
```

---

## 任务组C：生产批次闭环（P0）

### 任务C1：生产阶段记录表 ⚠️ P0

**文件：** `src/types/production.ts` + 新建 hook

**问题：** 生产阶段记录缺失，无法追溯分阶段成本

**修改步骤：**

#### Step C1.1: 添加阶段记录类型

```typescript
// src/types/production.ts 添加

// 生产阶段记录
export interface ProductionPhaseRecord {
  id: string;
  batchId: string;           // 关联批次ID
  batchCode: string;         // 关联批次号
  phaseName: string;         // 阶段名称（整地/播种/施肥/灌溉...）
  phaseOrder: number;        // 阶段顺序
  startDate: string;        // 开始日期
  endDate: string | null;   // 结束日期
  outputQty: number;         // 产出数量
  inputMaterials: MaterialItem[]; // 投入物料
  inputLaborHours: number;  // 投入工时
  remarks: string;          // 备注
  createdAt: string;
}
```

#### Step C1.2: 添加批次关联字段

```typescript
// 在 ProductionBatch 类型中添加
export interface ProductionBatch {
  id: string;
  batchCode: string;
  // ... 现有字段 ...

  // 新增关联字段
  linkedTaskIds: string[];      // 关联的农事任务ID列表
  phaseRecords: ProductionPhaseRecord[]; // 阶段记录（计算属性）
}
```

---

### 任务C2：批次→任务关联 ⚠️ P1

**文件：** `src/types/task.ts`

**问题：** 批次与农事任务无显式关联

**修改步骤：**

```typescript
// 在 Task 类型中添加
export interface Task {
  id: string;
  code: string;
  // ... 现有字段 ...

  // 新增关联字段
  batchId?: string;        // 关联的生产批次ID
  batchCode?: string;      // 关联的生产批次号
}
```

---

## 任务组D：人工管理闭环（P0）

### 任务D1：考勤→薪酬数据联动 ⚠️ P0

**文件：** `src/hooks/labor/useSalaryCalculation.ts`

**问题：** 考勤数据与薪酬计算完全分离

**修改步骤：**

#### Step D1.1: 创建薪酬计算 hook

```typescript
// src/hooks/labor/useSalaryCalculation.ts

import { useMemo } from 'react';
import { usePersistentAttendance } from './usePersistentAttendance';
import { usePersistentWorkLogs } from './usePersistentWorkLogs';

interface MonthlySalary {
  workerId: string;
  workerName: string;
  month: string;           // YYYY-MM
  regularHours: number;    // 正常工时
  overtimeHours: number;   // 加班工时
  leaveDays: number;        // 请假天数
  baseSalary: number;      // 基本工資
  overtimePay: number;     // 加班費
  leaveDeduction: number;  // 请假扣款
  totalSalary: number;     // 总工资
}

export const useSalaryCalculation = (month: string) => {
  const { attendanceRecords } = usePersistentAttendance();
  const { workLogs } = usePersistentWorkLogs();

  const monthlySalary = useMemo((): MonthlySalary[] => {
    // 按工人分组统计
    const workerMap = new Map<string, MonthlySalary>();

    // 统计工时
    workLogs.forEach(log => {
      if (log.date.startsWith(month)) {
        const existing = workerMap.get(log.workerId) || {
          workerId: log.workerId,
          workerName: log.workerName,
          month,
          regularHours: 0,
          overtimeHours: 0,
          leaveDays: 0,
          baseSalary: 0,
          overtimePay: 0,
          leaveDeduction: 0,
          totalSalary: 0
        };

        if (log.workType === 'overtime') {
          existing.overtimeHours += log.hours;
        } else {
          existing.regularHours += log.hours;
        }

        workerMap.set(log.workerId, existing);
      }
    });

    // 统计请假
    attendanceRecords.forEach(record => {
      if (record.date.startsWith(month) && record.status === 'leave') {
        const existing = workerMap.get(record.workerId);
        if (existing) {
          existing.leaveDays += 1;
        }
      }
    });

    // 计算工资
    const hourlyRate = 50; // 每小时工资基数（应从配置读取）
    const dailyRate = hourlyRate * 8;

    workerMap.forEach(salary => {
      salary.baseSalary = salary.regularHours * hourlyRate;
      salary.overtimePay = salary.overtimeHours * hourlyRate * 1.5;
      salary.leaveDeduction = salary.leaveDays * dailyRate;
      salary.totalSalary = salary.baseSalary + salary.overtimePay - salary.leaveDeduction;
    });

    return Array.from(workerMap.values());
  }, [workLogs, attendanceRecords, month]);

  return { monthlySalary };
};
```

---

## 验证测试

### 测试1：物料模块闭环

1. 创建领料申请 → 审批通过 → 检查出库待办自动出现
2. 执行出库 → 检查 inventory_records 有新扣减记录
3. 发起退库 → 审核通过 → 检查 inventory_records 有红字回滚

### 测试2：农事任务闭环

1. 创建农事任务 → 设置短截止日期 → 等待超时
2. 检查 yuanxingtu_task_alerts 有新的超时预警
3. 任务执行 → 检查 workLogs 有同步记录

### 测试3：生产批次闭环

1. 创建生产批次 → 添加阶段记录 → 检查批次成本
2. 关联农事任务 → 任务完成后 → 检查批次成本变化

### 测试4：人工管理闭环

1. 填写工时记录 → 跨天考勤记录
2. 调用 useSalaryCalculation → 检查月度工资统计正确

---

## 回滚指南

如需回滚 P0 修改：

### 回滚物料模块

1. 删除 `deductInventory` 和 `rollbackInventory` 函数
2. 恢复原来的 `handleOutboundSubmit` 和 `handleReturnApprove` 函数

### 回滚农事任务

1. 删除 `useTaskTimeoutAlert` hook
2. 删除 `yuanxingtu_task_alerts` localStorage 读取逻辑

### 回滚人工管理

1. 删除 `useSalaryCalculation` hook

---

**文档版本：** v2.0 升级版
**更新日期：** 2026-04-17
**相比v1.0：** 新增任务B1、C1、C2、D1，补充完整代码示例
