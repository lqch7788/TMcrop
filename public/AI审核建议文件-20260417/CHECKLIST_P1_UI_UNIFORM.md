# P1 UI 统一性修复清单（升级版）

**优先级：** P1（演示效果优化）
**目标：** 统一全系统所有 UI 元素的颜色和样式
**问题规模：** 51个表格组件 + 215个文件存在蓝色渐变滥用

---

## 问题统计总览

| 问题类型 | 影响文件数 | 严重度 |
|---------|-----------|--------|
| 表格头部蓝色渐变 | 51个 | P1 |
| Sidebar激活态蓝色 | 1个 | P1 |
| 按钮蓝色变体 | 12个 | P2 |
| Badge info蓝色 | 3个 | P2 |
| hover状态蓝色 | 8个 | P2 |

---

## 颜色规范手册

### 主色调规范

| 用途 | 正确颜色 | 错误颜色 |
|------|---------|---------|
| 主按钮背景 | `bg-emerald-600` | `bg-blue-600`, `bg-green-500` |
| 主按钮悬停 | `hover:bg-emerald-700` | `hover:bg-blue-700` |
| 次按钮边框 | `border-emerald-600 text-emerald-600` | `border-blue-600` |
| 危险按钮 | `bg-red-600 hover:bg-red-700` | `bg-red-500` |
| 表头背景 | `bg-gradient-to-r from-emerald-500 to-emerald-600` | `from-blue-500 to-blue-600` |
| 成功状态 | `bg-green-100 text-green-800` | `bg-blue-100` |
| 进行中状态 | `bg-emerald-100 text-emerald-800` | `bg-blue-100` |

### 边框颜色规范

| 用途 | 正确颜色 | 错误颜色 |
|------|---------|---------|
| 卡片边框 | `border-gray-200` | `border-gray-100`, `border-gray-300` |
| 表格边框 | `border-gray-200` | `border-gray-300` |
| 输入框边框 | `border-gray-300` | `border-gray-200` |

### 间距规范

| 用途 | 正确值 | 错误值 |
|------|--------|--------|
| 页面内边距 | `p-6` | `p-4`, `p-8` |
| 卡片间距 | `gap-4` | `gap-2`, `gap-6` |
| 按钮间距 | `gap-2` | `gap-1`, `gap-3` |

---

## 任务组A：表格头部修复（P1）

### 任务A1：批量修复表格头部渐变色 ⚠️ P1

**问题：** 51个文件使用 `bg-gradient-to-r from-blue-500 to-blue-600`

**修复方案：** 全局搜索替换

```bash
# 搜索命令（用于定位文件）
grep -r "from-blue-500" src/components/ --include="*.tsx" -l
grep -r "from-blue-600" src/components/ --include="*.tsx" -l
```

**受影响的主要文件（按模块分组）：**

#### labor 模块（18个文件）
```
src/components/labor/tasks/TasksTable.tsx
src/components/labor/attendance/WorkerAttendanceTable.tsx
src/components/labor/leave/LeaveTable.tsx
src/components/labor/overtime/OvertimeTable.tsx
src/components/labor/salary/SalaryTable.tsx
src/components/labor/performance/PerformanceTable.tsx
src/components/labor/skill/SkillTable.tsx
src/components/labor/recruitment/RecruitmentTable.tsx
src/components/labor/onboarding/OnboardingTable.tsx
src/components/labor/contract/ContractTable.tsx
src/components/labor/team/TeamTable.tsx
src/components/labor/schedule/ScheduleTable.tsx
src/components/labor/budget/BudgetTable.tsx
src/components/labor/efficiency/EfficiencyTable.tsx
src/components/labor/monthly/MonthlyTable.tsx
src/components/labor/risk/RiskTable.tsx
src/components/labor/piecework/PieceworkTable.tsx
src/components/labor/tempWorker/TempWorkerTable.tsx
```

#### farm 模块（12个文件）
```
src/components/farm/taskDispatch/components/TaskExecuteCard.tsx
src/components/farm/agriculture/AgricultureTable.tsx
src/components/farm/harvest/HarvestTable.tsx
src/components/farm/taskDispatch/DispatchTable.tsx
src/components/farm/taskDispatch/TaskDetailModal.tsx
```

#### material 模块（8个文件）
```
src/components/materialReceiving/ExecuteTab.tsx
src/components/materialReceiving/ApplicationTab.tsx
src/components/materialReceiving/StatisticsTab.tsx
src/components/materialReturn/MaterialReturnTable.tsx
src/components/material/MaterialTable.tsx
src/components/materialCategory/MaterialCategoryTable.tsx
src/components/purchasePlan/PurchasePlanTable.tsx
src/components/warehouse/WarehouseTable.tsx
```

#### production 模块（6个文件）
```
src/components/production/ProductionTable.tsx
src/components/production/TechSolutionTable.tsx
src/components/cost/CostTable.tsx
src/components/summary/SummaryTable.tsx
```

**修复脚本：** 在每个文件中执行

```typescript
// 修复前
<thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">

// 修复后
<thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
```

---

### 任务A2：Sidebar 激活态颜色修复 ⚠️ P1

**文件：** `src/components/layout/Sidebar.tsx`

**问题：** 激活菜单项使用 `bg-blue-100 text-blue-700`

**修复步骤：**

找到侧边栏激活状态样式（约第50-100行）：

```typescript
// 修复前
<NavLink
  to={item.path}
  className={({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-100 text-blue-700 font-medium'  // ❌ 错误
        : 'text-gray-600 hover:bg-gray-100'
    }`
  }
>

// 修复后
<NavLink
  to={item.path}
  className={({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-emerald-100 text-emerald-700 font-medium'  // ✅ 正确
        : 'text-gray-600 hover:bg-gray-100'
    }`
  }
>
```

**搜索并修复所有侧边栏相关文件：**

```bash
grep -r "bg-blue-100 text-blue-700" src/components/layout/ --include="*.tsx"
```

---

## 任务组B：按钮样式修复（P2）

### 任务B1：统一主按钮颜色

**规范：** 所有主操作按钮必须使用 `bg-emerald-600 hover:bg-emerald-700`

**搜索命令：**

```bash
# 搜索错误的主按钮颜色
grep -r "bg-blue-600" src/components/ --include="*.tsx" -l | head -20
grep -r "bg-green-500" src/components/ --include="*.tsx" -l | head -10
```

**修复模式：**

```typescript
// 修复前
<button className="bg-blue-600 text-white hover:bg-blue-700 ...">

// 修复后
<button className="bg-emerald-600 text-white hover:bg-emerald-700 ...">
```

### 任务B2：统一危险按钮颜色

**规范：** 所有删除/取消操作使用 `bg-red-600 hover:bg-red-700`

```typescript
// 修复前
<button className="bg-red-500 text-white hover:bg-red-600 ...">

// 修复后
<button className="bg-red-600 text-white hover:bg-red-700 ...">
```

---

## 任务组C：Badge 组件修复（P2）

### 任务C1：Badge 状态颜色规范

**文件：** `src/components/ui/badge.tsx`

**当前状态变体（需补充）：**

```typescript
// 添加新的变体
const variants = {
  // ... 现有变体 ...
  inProgress: "bg-emerald-100 text-emerald-800",      // 进行中
  completed: "bg-green-100 text-green-800",           // 已完成
  warning: "bg-yellow-100 text-yellow-800",           // 警告
  info: "bg-blue-100 text-blue-800",                 // 信息（保留）
};
```

**各模块 Badge 使用对照表：**

| 业务状态 | Badge 变体 | 颜色 |
|---------|-----------|------|
| 待处理 | `secondary` | `bg-gray-100 text-gray-800` |
| 进行中 | `inProgress` | `bg-emerald-100 text-emerald-800` |
| 已完成 | `completed` | `bg-green-100 text-green-800` |
| 已拒绝 | `destructive` | `bg-red-500 text-white` |
| 已取消 | `secondary` | `bg-gray-200 text-gray-600` |
| 待审批 | `warning` | `bg-yellow-100 text-yellow-800` |
| 已通过 | `completed` | `bg-green-100 text-green-800` |
| 逾期/超时 | `destructive` | `bg-red-500 text-white` |

---

## 任务组D：hover 状态修复（P2）

### 任务D1：表格行 hover 状态

**规范：** 表格行 hover 使用 `hover:bg-emerald-50`

```typescript
// 修复前
<tr className="hover:bg-blue-50 ...">

// 修复后
<tr className="hover:bg-emerald-50 ...">
```

### 任务D2：下拉选项 hover 状态

**规范：** 下拉/选择器选项 hover 使用 `bg-emerald-50`

---

## 任务组E：边框与间距统一（P2）

### 任务E1：边框颜色统一

```bash
# 搜索不一致的边框颜色
grep -r "border-gray-100" src/components/ --include="*.tsx" -l
grep -r "border-gray-300" src/components/ --include="*.tsx" -l | head -10
```

**规范：** 卡片和表格边框统一使用 `border-gray-200`

```typescript
// 修复前
<div className="border border-gray-100 rounded-xl ...">

// 修复后
<div className="border border-gray-200 rounded-xl ...">
```

---

## 批量修复脚本（推荐）

由于受影响文件众多（51+），建议使用脚本批量修复：

### 脚本 A：表格头部渐变修复

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
    content = content.replace(
      /from-blue-500 to-blue-600/g,
      'from-emerald-500 to-emerald-600'
    );
    modified = true;
  }

  // 修复 from-blue-600 to-blue-700
  if (content.includes('from-blue-600 to-blue-700')) {
    content = content.replace(
      /from-blue-600 to-blue-700/g,
      'from-emerald-600 to-emerald-700'
    );
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

执行：
```bash
node scripts/fix-table-headers.js
```

---

## 验证检查清单

完成修复后，逐项验证：

- [ ] 所有表格头部使用 emerald 渐变
- [ ] Sidebar 激活态使用 emerald
- [ ] 所有主按钮使用 emerald-600
- [ ] 所有危险按钮使用 red-600
- [ ] Badge 变体颜色语义正确
- [ ] 表格行 hover 使用 emerald-50
- [ ] 边框颜色统一为 gray-200
- [ ] 间距使用统一规范（p-6, gap-4）

---

## 附录：UI 规范速查表

### 按钮规范

| 类型 | 类名 | 用途 |
|------|------|------|
| 主按钮 | `bg-emerald-600 text-white hover:bg-emerald-700` | 主要操作 |
| 次按钮 | `border border-emerald-600 text-emerald-600 hover:bg-emerald-50` | 次要操作 |
| 危险按钮 | `bg-red-600 text-white hover:bg-red-700` | 删除/取消 |
| 幽灵按钮 | `text-gray-600 hover:bg-gray-100` | 辅助操作 |
| 禁用态 | `opacity-50 cursor-not-allowed` | 禁用状态 |

### 卡片规范

| 类型 | 类名 | 用途 |
|------|------|------|
| 页面卡片 | `bg-white rounded-xl border border-gray-200 shadow-sm p-6` | 页面主卡片 |
| 内嵌卡片 | `bg-gray-50 rounded-lg p-4` | 内嵌信息区 |
| 统计卡片 | `bg-white rounded-xl border border-gray-200 p-4` | 统计指标卡 |

### 表格规范

| 类型 | 类名 | 用途 |
|------|------|------|
| 表头 | `bg-gradient-to-r from-emerald-500 to-emerald-600 text-white` | 表格头部 |
| 表体 | `divide-y divide-gray-200` | 表格行分隔 |
| 斑马纹 | `odd:bg-white even:bg-gray-50` | 行交替色 |
| 行悬停 | `hover:bg-emerald-50` | 行 hover |

---

**文档版本：** v2.0 升级版
**更新日期：** 2026-04-17
**相比v1.0：** 新增批量修复脚本、Badge规范表、hover状态规范
