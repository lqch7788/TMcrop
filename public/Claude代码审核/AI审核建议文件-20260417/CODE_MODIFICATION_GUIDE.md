# 代码修改执行指南（升级版）

**目的：** AI 可直接根据本指南执行代码修改
**项目路径：** `D:/TMcrop/yuanxingtu/V1.1`
**问题规模：** 677个文件，需要系统性修复

---

# 第一部分：P0 业务闭环修改

## 修改1：useMaterialReceiving.ts - 库存扣减 ⚠️ P0

**文件路径：** `D:/TMcrop/yuanxingtu/V1.1/src/hooks/materialReceiving/useMaterialReceiving.ts`

### Step 1: 添加库存扣减函数

**查找位置：** 文件中任意位置（建议在 hook 开头）

**添加代码：**

```typescript
// 库存扣减函数（新增）
const deductInventory = (materials: MaterialItem[], relatedForm: string): boolean => {
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

### Step 2: 修改出库处理函数

**查找：** 搜索 `handleOutboundSubmit` 或 `onSubmit` 相关出库函数

**替换为：**

```typescript
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

## 修改2：useMaterialReceiving.ts - 审批联动 ⚠️ P0

**文件路径：** `D:/TMcrop/yuanxingtu/V1.1/src/hooks/materialReceiving/useMaterialReceiving.ts`

### Step 1: 导入 ApprovalContext

**查找位置：** 文件顶部的 import 语句

**在最后添加：**

```typescript
import { useApproval } from '../../contexts/ApprovalContext';
```

### Step 2: 添加审批监听逻辑

**查找位置：** hook 内部，在 return 语句之前

**添加代码：**

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
      code: a.code.replace('LL', 'CK'),
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

## 修改3：退库库存回滚 ⚠️ P0

**文件路径：** `D:/TMcrop/yuanxingtu/V1.1/src/components/materialReturn/hooks/useMaterialReturn.ts`（如存在）

### Step 1: 添加库存回滚函数

```typescript
// 库存回滚函数（新增）
const rollbackInventory = (materials: MaterialItem[], relatedForm: string): boolean => {
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
      deductType: 'material_return',
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

### Step 2: 修改退库确认函数

```typescript
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

# 第二部分：P1 UI 修改

## 修改4：表格头部渐变色批量修复 ⚠️ P1

**问题：** 51个文件使用蓝色渐变

**修复方法：** 使用脚本批量替换

### 脚本文件：scripts/fix-table-headers.js

```javascript
// scripts/fix-table-headers.js
const fs = require('fs');
const path = require('path');

const srcDir = './src/components';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 修复 from-blue-500 to-blue-600
  if (content.includes('from-blue-500 to-blue-600')) {
    content = content.replace(/from-blue-500 to-blue-600/g, 'from-emerald-500 to-emerald-600');
    modified = true;
  }

  // 修复 from-blue-600 to-blue-700
  if (content.includes('from-blue-600 to-blue-700')) {
    content = content.replace(/from-blue-600 to-blue-700/g, 'from-emerald-600 to-emerald-700');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', filePath);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx')) {
      fixFile(filePath);
    }
  });
}

walkDir(srcDir);
console.log('Done!');
```

### 执行命令

```bash
cd D:/TMcrop/yuanxingtu/V1.1
mkdir -p scripts
node scripts/fix-table-headers.js
```

---

## 修改5：Sidebar 激活态颜色 ⚠️ P1

**文件路径：** `D:/TMcrop/yuanxingtu/V1.1/src/components/layout/Sidebar.tsx`

**查找：** `bg-blue-100 text-blue-700`

**替换为：** `bg-emerald-100 text-emerald-700`

**查找命令：**

```bash
grep -r "bg-blue-100 text-blue-700" src/components/layout/
```

---

# 第三部分：P1 类型定义修改

## 修改6：创建统一枚举文件 ⚠️ P1

**文件路径：** `D:/TMcrop/yuanxingtu/V1.1/src/types/enums.ts`（新建）

**添加内容：**

```typescript
// src/types/enums.ts

// ========== 通用状态枚举 ==========

export type ApplicationStatus =
  | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'voided';

export type ExecuteStatus =
  | 'pending' | 'partial' | 'completed' | 'cancelled';

export type ReturnStatus =
  | 'pending' | 'completed' | 'cancelled';

export type TaskStatus =
  | 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

export type BatchStatus =
  | 'pending' | 'in_progress' | 'completed' | 'archived';

export type ApprovalType =
  | 'MATERIAL_REQUEST' | 'MATERIAL_RETURN' | 'PURCHASE_REQUEST'
  | 'TASK_APPROVAL' | 'LEAVE_REQUEST' | 'OVERTIME_REQUEST'
  | 'TRANSFER_REQUEST' | 'RESIGNATION_REQUEST' | 'TECH_SOLUTION';

// ========== 状态映射 ==========

export const ApplicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: '待审批', approved: '已通过', rejected: '已拒绝',
  cancelled: '已取消', voided: '已作废'
};

export const ExecuteStatusLabels: Record<ExecuteStatus, string> = {
  pending: '待出库', partial: '部分出库',
  completed: '已出库', cancelled: '已取消'
};

export const ReturnStatusLabels: Record<ReturnStatus, string> = {
  pending: '待退库', completed: '已退库', cancelled: '已取消'
};

export const TaskStatusLabels: Record<TaskStatus, string> = {
  pending: '待派发', assigned: '待接收', in_progress: '进行中',
  completed: '已完成', cancelled: '已取消', overdue: '已逾期'
};

// ========== 单号前缀 ==========

export const DocumentPrefix = {
  MATERIAL_APPLICATION: 'LL',
  MATERIAL_EXECUTE: 'CK',
  MATERIAL_RETURN: 'RT',
  PURCHASE_APPLICATION: 'CG',
  PURCHASE_EXECUTE: 'RK',
  FARM_TASK: 'NS',
  TEMP_TASK: 'LS',
  PROBLEM_RECORD: 'WT',
} as const;

export const generateDocumentCode = (
  prefix: keyof typeof DocumentPrefix,
  date: Date = new Date()
): string => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${DocumentPrefix[prefix]}${dateStr}${seq}`;
};
```

---

## 修改7：Badge 统一组件 ⚠️ P2

**文件路径：** `D:/TMcrop/yuanxingtu/V1.1/src/components/ui/StatusBadge.tsx`（新建）

**添加内容：**

```typescript
// src/components/ui/StatusBadge.tsx

import { Badge } from './badge';
import {
  ApplicationStatus, ExecuteStatus, ReturnStatus, TaskStatus,
  ApplicationStatusLabels, ExecuteStatusLabels, ReturnStatusLabels, TaskStatusLabels
} from '@/types/enums';

interface StatusBadgeProps {
  type: 'application' | 'execute' | 'return' | 'task';
  status: ApplicationStatus | ExecuteStatus | ReturnStatus | TaskStatus;
}

const statusConfig = {
  application: {
    statusLabels: ApplicationStatusLabels,
    colors: {
      pending: 'warning', approved: 'completed', rejected: 'destructive',
      cancelled: 'secondary', voided: 'secondary'
    } as Record<ApplicationStatus, string>
  },
  execute: {
    statusLabels: ExecuteStatusLabels,
    colors: {
      pending: 'info', partial: 'warning', completed: 'completed',
      cancelled: 'secondary'
    } as Record<ExecuteStatus, string>
  },
  return: {
    statusLabels: ReturnStatusLabels,
    colors: {
      pending: 'warning', completed: 'completed', cancelled: 'secondary'
    } as Record<ReturnStatus, string>
  },
  task: {
    statusLabels: TaskStatusLabels,
    colors: {
      pending: 'secondary', assigned: 'info', in_progress: 'inProgress',
      completed: 'completed', cancelled: 'secondary', overdue: 'destructive'
    } as Record<TaskStatus, string>
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status }) => {
  const config = statusConfig[type];
  const label = config.statusLabels[status];
  const variant = config.colors[status];

  return <Badge variant={variant}>{label}</Badge>;
};
```

---

# 第四部分：验证命令

## 验证步骤

### 1. TypeScript 类型检查

```bash
cd D:/TMcrop/yuanxingtu/V1.1
npx tsc --noEmit 2>&1 | head -50
```

### 2. ESLint 检查

```bash
cd D:/TMcrop/yuanxingtu/V1.1
npm run lint 2>&1 | head -50
```

### 3. 构建测试

```bash
cd D:/TMcrop/yuanxingtu/V1.1
npm run build 2>&1 | tail -30
```

### 4. UI 一致性检查

```bash
# 检查蓝色渐变残留
grep -r "from-blue-500" src/components/ --include="*.tsx" | wc -l
grep -r "from-blue-600" src/components/ --include="*.tsx" | wc -l

# 期望结果：0
```

### 5. 术语一致性检查

```bash
# 检查禁用词残留
grep -r "物料申请" src/ --include="*.tsx" | wc -l
grep -r "执行单" src/ --include="*.tsx" | wc -l
grep -r "收获" src/ --include="*.tsx" | grep -v "采收" | wc -l

# 期望结果：0
```

---

# 第五部分：修改清单汇总

| # | 文件 | 修改类型 | 优先级 | 状态 |
|---|------|---------|--------|------|
| 1 | `useMaterialReceiving.ts` | 库存扣减函数 | P0 | 待执行 |
| 2 | `useMaterialReceiving.ts` | 审批联动逻辑 | P0 | 待执行 |
| 3 | `useMaterialReturn.ts` | 库存回滚函数 | P0 | 待执行 |
| 4 | `scripts/fix-table-headers.js` | 表格头部批量修复 | P1 | 待执行 |
| 5 | `Sidebar.tsx` | 激活态颜色 | P1 | 待执行 |
| 6 | `src/types/enums.ts` | 统一枚举文件 | P1 | 待执行 |
| 7 | `src/components/ui/StatusBadge.tsx` | Badge统一组件 | P2 | 待执行 |

---

# 第六部分：回滚指南

## 快速回滚命令

```bash
# 回滚所有修改到 Git 状态
cd D:/TMcrop/yuanxingtu/V1.1
git checkout -- .
```

## 定向回滚

### 回滚修改1-2（useMaterialReceiving.ts）

```bash
git checkout HEAD~1 -- src/hooks/materialReceiving/useMaterialReceiving.ts
```

### 回滚修改4（表格头部）

```bash
# 重新运行修复脚本的反向操作
sed -i 's/from-emerald-500 to-emerald-600/from-blue-500 to-blue-600/g' src/components/**/*.tsx
sed -i 's/from-emerald-600 to-emerald-700/from-blue-600 to-blue-700/g' src/components/**/*.tsx
```

---

# 第七部分：实施路线图

## 第一阶段：止血（P0，1天）

- [ ] useMaterialReceiving.ts - 库存扣减
- [ ] useMaterialReceiving.ts - 审批联动
- [ ] useMaterialReturn.ts - 库存回滚

## 第二阶段：UI统一（P1，1天）

- [ ] 执行表格头部批量修复脚本
- [ ] 修复 Sidebar 激活态颜色
- [ ] 手动检查遗漏的蓝色渐变

## 第三阶段：类型安全（P1，0.5天）

- [ ] 创建统一枚举文件
- [ ] 在核心模块导入使用枚举
- [ ] 创建 StatusBadge 统一组件

## 第四阶段：验证（0.5天）

- [ ] 运行 TypeScript 类型检查
- [ ] 运行 ESLint 检查
- [ ] 运行构建测试
- [ ] UI 一致性检查

---

**执行指南版本：** v2.0 升级版
**更新日期：** 2026-04-17
**相比v1.0：** 新增批量修复脚本、枚举文件模板、验证命令、实施路线图
