# V1.1 UI 统一执行指南

> 最后更新：2026-05-08
> 状态：大部分已完成，仅剩少量收尾工作

## 当前状态

| 类别 | 状态 |
|------|------|
| 基础组件（11个） | ✅ 全部完成 |
| Toast/Modal（3个） | ✅ 全部完成 |
| 高级组件第一批（13个） | ✅ 全部完成 |
| 高级组件第二批（12个） | ✅ 全部完成 |
| 高级组件第三批（4个） | ✅ 全部完成 |
| 其他组件（2个） | ✅ 全部完成 |
| **待建组件** | ❌ Timeline、List |

## 已有组件清单（63个）

```
src/components/ui/
├── button.tsx         ✅
├── card.tsx           ✅
├── badge.tsx          ✅
├── table.tsx          ✅
├── dialog.tsx         ✅
├── input.tsx          ✅
├── select.tsx         ✅
├── checkbox.tsx       ✅
├── label.tsx          ✅
├── popover.tsx        ✅
├── dropdown-menu.tsx  ✅
├── Toast.tsx          ✅
├── Modal.tsx          ✅
├── UnifiedModal.tsx   ✅
├── NumberInput.tsx    ✅
├── DatePicker.tsx     ✅
├── DateRangePicker.tsx ✅
├── Drawer.tsx         ✅
├── Sheet.tsx          ✅
├── Alert.tsx          ✅
├── Notification.tsx   ✅
├── Breadcrumb.tsx      ✅
├── Steps.tsx          ✅
├── Pagination.tsx     ✅
├── Skeleton.tsx       ✅
├── Progress.tsx       ✅
├── TextArea.tsx       ✅
├── tabs.tsx           ✅
├── Calendar.tsx       ✅
├── Tree.tsx           ✅
├── TreeSelect.tsx     ✅
├── Cascader.tsx       ✅
├── TimePicker.tsx     ✅
├── Tooltip.tsx        ✅
├── Avatar.tsx         ✅
├── ImageUploader.tsx   ✅
├── Statistic.tsx      ✅
├── EmptyState.tsx     ✅
├── Divider.tsx        ✅
├── Space.tsx          ✅
├── QRCode.tsx         ✅
├── FilterBar.tsx      ✅
├── KanbanBoard.tsx    ✅
├── GanttChart.tsx     ✅
└── index.ts           ✅（统一导出）
```

## 待建组件（2个）

| 组件 | 路径 | 说明 |
|------|------|------|
| Timeline | `src/components/ui/Timeline.tsx` | 时间线组件，支持完成/进行中/待处理状态 |
| List | `src/components/ui/List.tsx` | 列表组件，支持数据列表渲染 |

### Timeline 组件规格

```tsx
// 待创建：src/components/ui/Timeline.tsx
interface TimelineProps {
  items: {
    title: string
    description?: string
    status: 'completed' | 'processing' | 'pending'
    time?: string
  }[]
}
```

### List 组件规格

```tsx
// 待创建：src/components/ui/List.tsx
interface ListProps {
  dataSource: any[]
  renderItem: (item: any, index: number) => React.ReactNode
}
```

---

## 仍使用 antd 的文件（13个）

| 文件 | 使用的 antd 组件 | 替换方案 |
|------|------------------|----------|
| `src/pages/DailyPlanningPage.tsx` | Table, Tag, Progress, List, Typography | Table, Badge, Progress, **List(待建)**, Tailwind |
| `src/pages/MonthlyPlanningPage.tsx` | Table, Tag, Space, Typography, Progress | Table, Badge, Space, Tailwind, Progress |
| `src/pages/hr/HrApproval.tsx` | Button, message, Dropdown, Tag | Button, useToast, DropdownMenu, Badge |
| `src/pages/hr/HrApprovalDetail.tsx` | Timeline, List, Card, Tag, Button | **Timeline(待建)**, **List(待建)**, Card, Badge, Button |
| `src/pages/HrApproval.tsx` | message | useToast |
| `src/components/common/DateRangePicker.tsx` | DatePicker | DatePicker（已有） |
| `src/components/common/table/ProTable.tsx` | Table, Button | Table, Button（已有） |
| `src/components/common/modal/ProModal.tsx` | Modal, Button | Modal, Button（已有） |
| `src/components/common/ExportButton.tsx` | Button, message | Button, useToast |
| `src/components/common/badge/StatusBadge.tsx` | Tag | Badge（已有） |
| `src/components/planning/MonthlyPlanReport.tsx` | antd 组件 | 检查具体组件 |
| `src/components/planning/DailyWorkOrderReport.tsx` | antd 组件 | 检查具体组件 |
| `src/components/farm/harvest/statusBadgeUtils.tsx` | Tag | Badge（已有） |

---

## 替换规则

### 1. Tag → Badge

```tsx
// 替换前
import { Tag } from 'antd'
<Tag color="green">完成</Tag>

// 替换后
import { Badge } from '@/components/ui'
<Badge variant="success">完成</Badge>
```

### 2. Space → Space

```tsx
// 替换前
import { Space } from 'antd'
<Space size="middle">...</Space>

// 替换后
import { Space } from '@/components/ui'
<Space size="medium">...</Space>
```

### 3. Progress → Progress

```tsx
// 替换前
import { Progress } from 'antd'
<Progress percent={50} />

// 替换后
import { Progress } from '@/components/ui'
<Progress value={50} />
```

### 4. message → useToast

```tsx
// 替换前
import { message } from 'antd'
message.success('操作成功')
message.error('操作失败')

// 替换后
import { useToast } from '@/components/ui'
const { toast } = useToast()
toast({ title: '操作成功', variant: 'success' })
toast({ title: '操作失败', variant: 'destructive' })
```

### 5. DatePicker

```tsx
// 替换前
import { DatePicker } from 'antd'
<DatePicker onChange={handleChange} />

// 替换后
import { DatePicker } from '@/components/ui'
<DatePicker selected={value} onChange={handleChange} />
```

### 6. Dropdown → DropdownMenu

```tsx
// 替换前
import { Dropdown } from 'antd'
<Dropdown menu={{ items: menuItems }}>
  <Button>菜单</Button>
</Dropdown>

// 替换后
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
<DropdownMenu>
  <DropdownMenuTrigger asChild><Button>菜单</Button></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>选项1</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 7. Modal → Modal

```tsx
// 替换前
import { Modal } from 'antd'
<Modal open={open} onOk={handleOk}>内容</Modal>

// 替换后
import { Modal } from '@/components/ui'
<Modal open={open} onConfirm={handleOk}>内容</Modal>
```

---

## 执行步骤

### Step 1: 创建缺失组件
```
1. 创建 src/components/ui/Timeline.tsx
2. 创建 src/components/ui/List.tsx
3. 更新 src/components/ui/index.ts 导出
```

### Step 2: 替换页面 antd 引用
```
4. 替换 src/pages/DailyPlanningPage.tsx
5. 替换 src/pages/MonthlyPlanningPage.tsx
6. 替换 src/pages/hr/HrApproval.tsx
7. 替换 src/pages/hr/HrApprovalDetail.tsx
8. 替换 src/pages/HrApproval.tsx
9. 替换 src/components/common/DateRangePicker.tsx
10. 替换 src/components/common/table/ProTable.tsx
11. 替换 src/components/common/modal/ProModal.tsx
12. 替换 src/components/common/ExportButton.tsx
13. 替换 src/components/common/badge/StatusBadge.tsx
14. 替换 src/components/planning/MonthlyPlanReport.tsx
15. 替换 src/components/planning/DailyWorkOrderReport.tsx
16. 替换 src/components/farm/harvest/statusBadgeUtils.tsx
```

### Step 3: 验证
```
17. 全局搜索 'from \'antd\'' 确认无遗漏
18. npm run build 确认构建成功
```

---

## 验证清单

- [ ] Timeline 组件创建完成
- [ ] List 组件创建完成
- [ ] index.ts 导出已更新
- [ ] 所有页面无 `from 'antd'` 引用（message 除外，最终统一为 useToast）
- [ ] `npm run build` 构建成功
- [ ] 页面功能正常

---

## 导入方式

```tsx
// 统一从 @/components/ui 导入
import { Button, Card, Badge, Table, DatePicker, Space, Progress, useToast } from '@/components/ui'
```

---

## 注意事项

1. **ProTable 和 ProModal** 是封装组件，内部依赖 antd，替换时需同步更新内部实现
2. **message 统一改用 useToast**：从 hook 方式调用，不再使用 antd message
3. **Typography 组件**：直接使用 Tailwind CSS 文字类（如 `text-lg font-semibold`）
4. **Dropdown API 差异**：`menu.items` 改为 `DropdownMenuItem` 子组件方式
5. **Table 组件**：shadcn/ui 风格的 Table 使用 `TableRow`/`TableCell` 而非 `dataSource`/`columns` 方式，可能需要较大改造
