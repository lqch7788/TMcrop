# V1.1 UI 统一执行指南

## 当前状态

| 类别 | 现状 |
|------|------|
| 基础组件 | button, card, dialog, table, input, badge, select, checkbox, dropdown-menu, label, popover, Toast, Modal |
| Ant Design | Tag, DatePicker, Table, Button, Modal, Progress, Timeline, List, Space, Dropdown, message |
| 图标 | @ant-design/icons (仅图标) |

## 需要替换的 Ant Design 组件

| Ant Design | 替换方案 | 优先级 |
|------------|----------|--------|
| Tag | ✅ 已有 `badge.tsx` | 已完成 |
| DatePicker | ❌ 需添加 `DatePicker.tsx` | P0 |
| Table | ⚠️ 已有 `table.tsx`，需检查功能完整性 | P0 |
| Button | ⚠️ 已有 `button.tsx`，需确保 icon 支持 | 已完成 |
| Modal | ⚠️ 已有 `Modal.tsx`，需与 `dialog.tsx` 整合 | P0 |
| Progress | ❌ 需添加 `Progress.tsx` | P1 |
| Timeline | ❌ 需添加 `Timeline.tsx` | P1 |
| List | ❌ 需添加 `List.tsx` | P1 |
| Dropdown | ✅ 已有 `dropdown-menu.tsx` | 已完成 |
| Space | ❌ 需添加 `Space.tsx` | P2 |
| message | ⚠️ 已有 `Toast.tsx` | 需统一 |
| Typography | ⚠️ 使用 Tailwind CSS 文字类 | 替代方案 |

---

## 执行步骤

### Phase 1: 补充缺失组件（P0 级）

#### 1.1 添加 DatePicker 组件
**路径**: `src/components/ui/DatePicker.tsx`
```tsx
// 基于 shadcn/ui calendar 或 自定义实现
// 支持: 单日期、日期范围、月份选择
```

#### 1.2 添加 Progress 组件
**路径**: `src/components/ui/Progress.tsx`
```tsx
// 线性进度条，支持百分比显示
// 样式与系统一致
```

#### 1.3 添加 Timeline 组件
**路径**: `src/components/ui/Timeline.tsx`
```tsx
// 时间线组件，支持节点类型（完成/进行中/待处理）
```

#### 1.4 添加 List 组件
**路径**: `src/components/ui/List.tsx`
```tsx
// 列表组件，支持数据列表渲染
```

#### 1.5 添加 Space 组件
**路径**: `src/components/ui/Space.tsx`
```tsx
// 间距组件，支持水平和垂直方向
```

---

### Phase 2: 页面组件替换

#### 替换规则
```tsx
// 替换前 (Ant Design)
import { Table, Tag, Progress, DatePicker } from 'antd'

// 替换后 (shadcn/ui)
import { Table, Badge, Progress, DatePicker } from '@/components/ui'
```

#### 需要替换的页面清单

| 页面文件 | 当前使用 | 替换为 |
|----------|----------|--------|
| DailyPlanningPage.tsx | Table, Tag, Progress | Table, Badge, Progress |
| MonthlyPlanningPage.tsx | Table, Tag, Space, Progress | Table, Badge, Space, Progress |
| HrApprovalDetail.tsx | Timeline, List, Card, Tag | Timeline, List, Card, Badge |
| hr/HrApproval.tsx | Dropdown, Tag | DropdownMenu, Badge |
| components/common/DateRangePicker.tsx | DatePicker | DatePicker (新建) |

---

### Phase 3: 统一消息提示

#### 替换规则
```tsx
// 替换前
import { message } from 'antd'
message.success('成功')
message.error('失败')

// 替换后
import { useToast } from '@/components/ui'
const { toast } = useToast()
toast({ title: '成功', variant: 'success' })
```

---

## 快速执行命令

让 AI 执行以下操作：

```
1. 创建 src/components/ui/DatePicker.tsx
2. 创建 src/components/ui/Progress.tsx
3. 创建 src/components/ui/Timeline.tsx
4. 创建 src/components/ui/List.tsx
5. 创建 src/components/ui/Space.tsx
6. 更新 src/components/ui/index.ts 导出
7. 替换 pages/DailyPlanningPage.tsx 中的 Ant Design
8. 替换 pages/MonthlyPlanningPage.tsx 中的 Ant Design
9. 替换 pages/hr/HrApprovalDetail.tsx 中的 Ant Design
10. 替换 pages/hr/HrApproval.tsx 中的 Ant Design
11. 替换 components/common/DateRangePicker.tsx
12. 全局搜索 'from \'antd\'' 确认无遗漏
```

---

## 验证清单

- [ ] DatePicker 组件可选择日期和日期范围
- [ ] Progress 组件显示进度条
- [ ] Timeline 组件显示时间线
- [ ] List 组件正确渲染列表
- [ ] Space 组件提供元素间距
- [ ] 所有页面无 'from \'antd\'' 引用（message 除外）
- [ ] 构建无错误
- [ ] 页面功能正常

---

## 文件结构

```
src/components/ui/
├── button.tsx        ✅ 已有
├── card.tsx          ✅ 已有
├── dialog.tsx        ✅ 已有
├── table.tsx         ✅ 已有
├── input.tsx         ✅ 已有
├── badge.tsx         ✅ 已有
├── select.tsx        ✅ 已有
├── checkbox.tsx      ✅ 已有
├── dropdown-menu.tsx ✅ 已有
├── label.tsx         ✅ 已有
├── popover.tsx       ✅ 已有
├── Toast.tsx         ✅ 已有
├── Modal.tsx         ✅ 已有
├── NumberInput.tsx   ✅ 已有
├── DatePicker.tsx    ❌ 需创建
├── Progress.tsx      ❌ 需创建
├── Timeline.tsx      ❌ 需创建
├── List.tsx          ❌ 需创建
├── Space.tsx         ❌ 需创建
└── index.ts          ✅ 已有（需更新导出）
```

---

## 注意事项

1. **保持样式一致**: 新组件使用 CSS 变量，与现有组件风格统一
2. **图标使用**: 统一使用 lucide-react 图标库
3. **message 处理**: 保留 antd 的 message 用于全局提示，或完全替换为 Toast
4. **渐进替换**: 可以逐个页面替换，不需要一次性全部替换
5. **测试验证**: 每个组件替换后需验证功能正常
