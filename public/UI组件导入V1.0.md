# V1.1 UI 组件导入规划文档

> 本文档详细说明为 V1.1 项目添加 UI 组件的目的、功能、文件位置和使用方法。
> AI 执行者应按照本文档逐步创建组件文件。

---

## 一、项目现状分析

### 1.1 技术栈
- **框架**: React 18 + Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS v3
- **组件库**: Radix UI (底层) + 自建组件
- **图标**: Lucide React
- **表单验证**: React Hook Form + Zod
- **已有组件路径**: `src/components/ui/`

### 1.2 现有 UI 组件清单

| 文件名 | 组件名 | 功能 |
|--------|---------|------|
| button.tsx | Button | 按钮，支持 6 种变体 |
| card.tsx | Card, CardHeader, CardTitle, CardContent | 卡片容器 |
| badge.tsx | Badge | 徽章/标签 |
| table.tsx | Table | 基础表格 |
| dialog.tsx | Dialog | 对话框 |
| dropdown-menu.tsx | DropdownMenu 系列 | 下拉菜单 |
| input.tsx | Input | 文本输入框 |
| select.tsx | Select | 下拉选择器 |
| checkbox.tsx | Checkbox | 复选框 |
| label.tsx | Label | 标签 |
| popover.tsx | Popover | 气泡卡片 |
| Toast.tsx | Toast | 轻提示 |
| Modal.tsx | Modal | 模态框 |
| NumberInput.tsx | NumberInput | 数字输入框 |
| UnifiedModal.tsx | UnifiedModal | 统一模态框 |

### 1.3 依赖 Ant Design 的组件（需替换）

| 组件 | 用途 | 问题 |
|------|------|------|
| DatePicker | 日期选择 | 样式不统一 |
| DateRangePicker | 日期范围 | 样式不统一 |
| ProTable | 高级表格 | 样式不统一 |
| Tag | 标签 | 样式不统一 |
| Modal | 弹窗 | 样式不统一 |
| Progress | 进度条 | 样式不统一 |
| Timeline | 时间线 | 样式不统一 |
| Statistic | 统计数值 | 样式不统一 |
| List | 列表 | 样式不统一 |
| Dropdown | 下拉菜单 | 样式不统一 |
| TimePicker | 时间选择 | 样式不统一 |

---

## 二、组件导入清单

### 2.1 第一批 - 高优先级（立即需要）

这些组件使用频率高，应首先实现：

#### 1. DatePicker.tsx - 日期选择器
#### 2. DateRangePicker.tsx - 日期范围选择器
#### 3. Drawer.tsx - 抽屉面板
#### 4. Sheet.tsx - 底部抽屉
#### 5. Alert.tsx - 警告提示
#### 6. Notification.tsx - 通知提醒
#### 7. Breadcrumb.tsx - 面包屑导航
#### 8. Steps.tsx - 步骤条
#### 9. Pagination.tsx - 分页器
#### 10. Skeleton.tsx - 骨架屏
#### 11. Progress.tsx - 进度条/圈
#### 12. TextArea.tsx - 多行文本输入
#### 13. Tabs.tsx - 标签页（完善）

### 2.2 第二批 - 中优先级（功能增强）

#### 14. Calendar.tsx - 日历视图
#### 15. Tree.tsx - 树形组件
#### 16. TreeSelect.tsx - 树形选择器
#### 17. Cascader.tsx - 级联选择器
#### 18. TimePicker.tsx - 时间选择器
#### 19. Tooltip.tsx - 文字提示
#### 20. Avatar.tsx - 头像
#### 21. ImageUploader.tsx - 图片上传
#### 22. Statistic.tsx - 统计数值卡片
#### 23. EmptyState.tsx - 空状态
#### 24. Divider.tsx - 分割线
#### 25. Space.tsx - 间距组件

### 2.3 第三批 - 按需添加（特定场景）

#### 26. QRCode.tsx - 二维码生成
#### 27. FilterBar.tsx - 筛选工具栏
#### 28. KanbanBoard.tsx - 看板
#### 29. GanttChart.tsx - 甘特图

---

## 三、组件详细实现指南

### 3.1 DatePicker.tsx - 日期选择器

**文件位置**: `src/components/ui/DatePicker.tsx`

**功能**: 选择单个日期，支持快捷选项

**实现方式**:
- 使用 `@radix-ui/react-date-picker` 或 `react-day-picker`
- 样式适配项目 Tailwind 配置

**使用示例**:
```tsx
import { DatePicker } from '@/components/ui'

// 基本用法
<DatePicker 
  selected={date} 
  onChange={setDate} 
  placeholder="选择日期"
/>

// 带快捷选项
<DatePicker
  selected={date}
  onChange={setDate}
  shortcuts={[
    { label: '今天', value: new Date() },
    { label: '昨天', value: addDays(new Date(), -1) },
    { label: '本周', value: startOfWeek(new Date()) },
  ]}
/>
```

---

### 3.2 DateRangePicker.tsx - 日期范围选择器

**文件位置**: `src/components/ui/DateRangePicker.tsx`

**功能**: 选择日期范围

**实现方式**:
- 使用 `@radix-ui/react-date-picker` range 模式
- 或 `react-day-picker` RangeMode

**使用示例**:
```tsx
import { DateRangePicker } from '@/components/ui'

<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onChange={(start, end) => {
    setStartDate(start)
    setEndDate(end)
  }}
  placeholder="选择日期范围"
/>
```

---

### 3.3 Drawer.tsx - 抽屉面板

**文件位置**: `src/components/ui/Drawer.tsx`

**功能**: 从右侧滑出的面板，用于详情展示、编辑等

**实现方式**:
- 使用 `@radix-ui/react-dialog` 或 `vaul` 库
- 动画使用 Tailwind transition

**使用示例**:
```tsx
import { Drawer } from '@/components/ui'

<Drawer open={isOpen} onClose={closeDrawer}>
  <DrawerHeader>
    <DrawerTitle>详情</DrawerTitle>
    <DrawerDescription>查看完整信息</DrawerDescription>
  </DrawerHeader>
  <DrawerContent>
    {/* 内容 */}
  </DrawerContent>
  <DrawerFooter>
    <Button variant="outline" onClick={closeDrawer}>取消</Button>
    <Button onClick={handleSave}>保存</Button>
  </DrawerFooter>
</Drawer>
```

**子组件**:
- DrawerHeader - 头部
- DrawerTitle - 标题
- DrawerDescription - 描述
- DrawerContent - 内容区
- DrawerFooter - 底部操作区
- DrawerClose - 关闭按钮

---

### 3.4 Sheet.tsx - 底部抽屉

**文件位置**: `src/components/ui/Sheet.tsx`

**功能**: 从底部滑出的面板，适合移动端

**实现方式**:
- 基于 Drawer 改造，方向改为从下向上
- 移动端友好设计

**使用示例**:
```tsx
import { Sheet } from '@/components/ui'

<Sheet open={isOpen} onClose={closeSheet}>
  <SheetContent className="h-[80vh]">
    <SheetHeader>
      <SheetTitle>操作菜单</SheetTitle>
    </SheetHeader>
    {/* 内容 */}
  </SheetContent>
</Sheet>
```

---

### 3.5 Alert.tsx - 警告提示

**文件位置**: `src/components/ui/Alert.tsx`

**功能**: 展示重要提示信息

**变体**:
- `default` - 默认信息
- `success` - 成功提示（绿色）
- `warning` - 警告提示（橙色）
- `destructive` - 错误/危险提示（红色）
- `info` - 信息提示（蓝色）

**使用示例**:
```tsx
import { Alert } from '@/components/ui'

<Alert variant="success" title="操作成功" description="数据已保存" />

<Alert 
  variant="warning" 
  title="注意" 
  description="该操作不可逆，请确认"
  action={
    <Button size="sm" variant="outline">了解</Button>
  }
/>
```

---

### 3.6 Notification.tsx - 通知提醒

**文件位置**: `src/components/ui/Notification.tsx`

**功能**: 页面右上角弹出通知

**实现方式**:
- 使用 Context 存储通知队列
- 位置固定在右上角
- 自动消失或手动关闭

**使用示例**:
```tsx
import { NotificationProvider, useNotification } from '@/components/ui'

// 在 App 根部包裹
function App() {
  return (
    <NotificationProvider>
      <YourApp />
    </NotificationProvider>
  )
}

// 在组件中使用
function MyComponent() {
  const { notifications, addNotification, removeNotification } = useNotification()
  
  const handleClick = () => {
    addNotification({
      title: '保存成功',
      description: '数据已成功保存',
      variant: 'success', // success | warning | error | info
      duration: 3000, // 自动消失时间，0 则不自动消失
    })
  }
}
```

**NotificationProvider 属性**:
```tsx
<NotificationProvider position="top-right" maxNotifications={5}>
```

---

### 3.7 Breadcrumb.tsx - 面包屑导航

**文件位置**: `src/components/ui/Breadcrumb.tsx`

**功能**: 显示当前位置导航路径

**使用示例**:
```tsx
import { Breadcrumb } from '@/components/ui'

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">首页</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/users">用户管理</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>用户详情</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

**子组件**:
- Breadcrumb - 容器
- BreadcrumbList - 列表
- BreadcrumbItem - 单项
- BreadcrumbLink - 可点击链接
- BreadcrumbPage - 当前页（不可点击）
- BreadcrumbSeparator - 分隔符

---

### 3.8 Steps.tsx - 步骤条

**文件位置**: `src/components/ui/Steps.tsx`

**功能**: 展示分步流程，如审批流程

**变体**:
- `default` - 默认
- `navigation` - 可点击导航

**使用示例**:
```tsx
import { Steps } from '@/components/ui'

<Steps currentStep={1}>
  <StepsStep title="提交申请" description="填写申请信息" />
  <StepsStep title="部门审批" description="等待部门负责人审批" />
  <StepsStep title="财务审核" description="财务部门复核" />
  <StepsStep title="完成" description="审批通过" />
</Steps>

// 或使用 items 模式
<Steps currentStep={1} items={[
  { title: '提交', description: '填写信息' },
  { title: '审批', description: '等待审批' },
  { title: '完成', description: '审批通过' },
]} />
```

**Steps 属性**:
- `currentStep: number` - 当前步骤（从 0 开始）
- `items?: { title: string; description?: string }[]` - 步骤数据
- `variant?: 'default' | 'navigation'` - 变体

**StepsStep 属性**:
- `title: string` - 步骤标题
- `description?: string` - 步骤描述
- `icon?: ReactNode` - 自定义图标

---

### 3.9 Pagination.tsx - 分页器

**文件位置**: `src/components/ui/Pagination.tsx`

**功能**: 数据列表分页导航

**使用示例**:
```tsx
import { Pagination } from '@/components/ui'

<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={setPage}
  showPageSize
  pageSize={20}
  pageSizeOptions={[10, 20, 50, 100]}
  onPageSizeChange={setPageSize}
/>
```

**Pagination 属性**:
- `currentPage: number` - 当前页码（从 1 开始）
- `totalPages: number` - 总页数
- `onPageChange: (page: number) => void` - 页码变化回调
- `pageSize?: number` - 每页条数
- `onPageSizeChange?: (size: number) => void` - 每页条数变化
- `pageSizeOptions?: number[]` - 每页条数选项
- `showPageSize?: boolean` - 是否显示每页条数选择器
- `className?: string` - 自定义样式

---

### 3.10 Skeleton.tsx - 骨架屏

**文件位置**: `src/components/ui/Skeleton.tsx`

**功能**: 加载占位，提升感知加载速度

**使用示例**:
```tsx
import { Skeleton } from '@/components/ui'

// 单个骨架
<Skeleton className="h-4 w-[200px]" />

// 组合骨架（卡片）
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-[150px]" />
    <Skeleton className="h-4 w-[100px]" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-[80%]" />
  </CardContent>
</Card>

// 表格骨架
<TableSkeleton rows={5} columns={4} />
```

**Skeleton 属性**:
- `className?: string` - 自定义样式（设置宽高）
- `variant?: 'text' | 'circular' | 'rectangular'` - 变体

**TableSkeleton 属性**:
- `rows?: number` - 行数
- `columns?: number` - 列数

---

### 3.11 Progress.tsx - 进度条/圈

**文件位置**: `src/components/ui/Progress.tsx`

**功能**: 展示进度百分比

**变体**:
- `line` - 线形进度条（默认）
- `circle` - 圆形进度圈
- `dashboard` - 仪表盘进度

**使用示例**:
```tsx
import { Progress } from '@/components/ui'

// 线形进度条
<Progress value={75} max={100} />

// 带标签
<Progress value={60} showLabel />

// 圆形进度圈
<Progress type="circle" value={75} size="md" />

// 仪表盘
<Progress type="dashboard" value={45} />
```

**Progress 属性**:
- `value: number` - 当前值
- `max?: number` - 最大值（默认 100）
- `showLabel?: boolean` - 是否显示百分比标签
- `type?: 'line' | 'circle' | 'dashboard'` - 类型
- `size?: 'sm' | 'md' | 'lg'` - 尺寸（circle/dashboard 时有效）
- `strokeColor?: string` - 进度条颜色
- `trailColor?: string` - 轨道颜色

---

### 3.12 TextArea.tsx - 多行文本输入

**文件位置**: `src/components/ui/TextArea.tsx`

**功能**: 多行文本输入，支持自动高度调整

**使用示例**:
```tsx
import { TextArea } from '@/components/ui'

// 基本用法
<TextArea 
  placeholder="请输入描述..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// 自动高度
<TextArea
  placeholder="自动调整高度"
  autoSize
  minRows={3}
  maxRows={10}
/>

// 带字数统计
<TextArea
  placeholder="限500字"
  showCount
  maxLength={500}
/>
```

**TextArea 属性**:
- `placeholder?: string` - 占位文本
- `value?: string` - 值
- `onChange?: React.ChangeEventHandler<HTMLTextAreaElement>` - 变化回调
- `autoSize?: boolean` - 自动高度
- `minRows?: number` - 最小行数
- `maxRows?: number` - 最大行数
- `showCount?: boolean` - 显示字数统计
- `maxLength?: number` - 最大字数
- 其他原生 textarea 属性

---

### 3.13 Tabs.tsx - 标签页

**文件位置**: `src/components/ui/tabs.tsx`

**功能**: 切换不同内容面板

**使用示例**:
```tsx
import { Tabs } from '@/components/ui'

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">标签一</TabsTrigger>
    <TabsTrigger value="tab2">标签二</TabsTrigger>
    <TabsTrigger value="tab3">标签三</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">内容一</TabsContent>
  <TabsContent value="tab2">内容二</TabsContent>
  <TabsContent value="tab3">内容三</TabsContent>
</Tabs>
```

**子组件**:
- Tabs - 容器，属性：`defaultValue`, `value`, `onValueChange`
- TabsList - 标签列表
- TabsTrigger - 单个标签，属性：`value`, `disabled`
- TabsContent - 内容面板，属性：`value`

---

### 3.14 Calendar.tsx - 日历视图

**文件位置**: `src/components/ui/Calendar.tsx`

**功能**: 日历展示，支持日期选择和事件标记

**使用示例**:
```tsx
import { Calendar } from '@/components/ui'

// 基本用法
<Calendar
  selected={selectedDate}
  onChange={setSelectedDate}
/>

// 带事件标记
<Calendar
  selected={selectedDate}
  onChange={setSelectedDate}
  events={[
    { date: new Date(2024, 3, 15), title: '会议' },
    { date: new Date(2024, 3, 20), title: '截止' },
  ]}
  onDateClick={handleDateClick}
/>

// 范围选择
<Calendar
  mode="range"
  selected={{ from: startDate, to: endDate }}
  onChange={({ from, to }) => { setStartDate(from); setEndDate(to) }}
/>
```

**Calendar 属性**:
- `selected?: Date` - 选中的日期
- `onChange?: (date: Date) => void` - 日期变化回调
- `mode?: 'single' | 'range' | 'multiple'` - 选择模式
- `events?: { date: Date; title: string; color?: string }[]` - 事件列表
- `onDateClick?: (date: Date) => void` - 日期点击回调
- `disabled?: (date: Date) => boolean` - 禁用某些日期
- `minDate?: Date` - 最小日期
- `maxDate?: Date` - 最大日期

---

### 3.15 Tree.tsx - 树形组件

**文件位置**: `src/components/ui/Tree.tsx`

**功能**: 展示树形结构数据，支持展开/收起、选择

**使用示例**:
```tsx
import { Tree } from '@/components/ui'

const treeData = [
  {
    key: '1',
    title: '总部',
    children: [
      { key: '1-1', title: '研发部' },
      { key: '1-2', title: '市场部' },
    ],
  },
  {
    key: '2',
    title: '分公司',
    children: [
      { key: '2-1', title: '华东区' },
      { key: '2-2', title: '华北区' },
    ],
  },
]

// 基本用法
<Tree data={treeData} />

// 可选择
<Tree
  data={treeData}
  selectable
  onSelect={(selectedKeys) => console.log(selectedKeys)}
/>

// 可勾选（多选）
<Tree
  data={treeData}
  checkable
  checkedKeys={['1', '2-1']}
  onCheck={(checkedKeys) => console.log(checkedKeys)}
/>
```

**Tree 属性**:
- `data: TreeNode[]` - 树形数据
- `selectable?: boolean` - 是否可选择
- `checkable?: boolean` - 是否显示复选框
- `expandedKeys?: string[]` - 展开的节点
- `checkedKeys?: string[]` - 勾选的节点
- `selectedKeys?: string[]` - 选中的节点
- `onExpand?: (keys: string[]) => void` - 展开/收起回调
- `onCheck?: (keys: string[]) => void` - 勾选回调
- `onSelect?: (keys: string[]) => void` - 选择回调

**TreeNode 类型**:
```tsx
interface TreeNode {
  key: string
  title: string
  children?: TreeNode[]
  disabled?: boolean
  [key: string]: any
}
```

---

### 3.16 TreeSelect.tsx - 树形选择器

**文件位置**: `src/components/ui/TreeSelect.tsx`

**功能**: 下拉选择树形结构数据

**使用示例**:
```tsx
import { TreeSelect } from '@/components/ui'

const treeData = [
  { key: '1', title: '水果', children: [
    { key: '1-1', title: '苹果' },
    { key: '1-2', title: '香蕉' },
  ]},
  { key: '2', title: '蔬菜', children: [
    { key: '2-1', title: '白菜' },
  ]},
]

<TreeSelect
  placeholder="选择分类"
  value={selectedValue}
  onChange={setSelectedValue}
  treeData={treeData}
/>
```

---

### 3.17 Cascader.tsx - 级联选择器

**文件位置**: `src/components/ui/Cascader.tsx`

**功能**: 多级联动选择，如省市区选择

**使用示例**:
```tsx
import { Cascader } from '@/components/ui'

const options = [
  {
    label: '北京',
    value: 'beijing',
    children: [
      { label: '朝阳区', value: 'chaoyang' },
      { label: '海淀区', value: 'haidian' },
    ],
  },
  {
    label: '上海',
    value: 'shanghai',
    children: [
      { label: '浦东新区', value: 'pudong' },
    ],
  },
]

<Cascader
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  placeholder="选择地区"
/>
```

---

### 3.18 TimePicker.tsx - 时间选择器

**文件位置**: `src/components/ui/TimePicker.tsx`

**功能**: 选择时间（小时、分钟、秒）

**使用示例**:
```tsx
import { TimePicker } from '@/components/ui'

<TimePicker
  value={time}
  onChange={setTime}
  format="HH:mm:ss"
  placeholder="选择时间"
/>

// 12小时制
<TimePicker
  value={time}
  onChange={setTime}
  format="hh:mm:ss a"
  use12Hours
/>
```

---

### 3.19 Tooltip.tsx - 文字提示

**文件位置**: `src/components/ui/Tooltip.tsx`

**功能**: 鼠标悬停显示提示信息

**使用示例**:
```tsx
import { Tooltip } from '@/components/ui'

<Tooltip content="这是一段提示信息">
  <Button>悬停查看</Button>
</Tooltip>

// 多行内容
<Tooltip content={
  <div>
    <p>第一行信息</p>
    <p>第二行信息</p>
  </div>
}>
  <IconButton icon={<Info />} />
</Tooltip>
```

**Tooltip 属性**:
- `content: ReactNode` - 提示内容
- `children: ReactNode` - 触发元素
- `position?: 'top' | 'bottom' | 'left' | 'right'` - 显示位置
- `delay?: number` - 延迟显示（毫秒）

---

### 3.20 Avatar.tsx - 头像

**文件位置**: `src/components/ui/Avatar.tsx`

**功能**: 用户头像展示

**使用示例**:
```tsx
import { Avatar } from '@/components/ui'

// 基本用法
<Avatar src="https://example.com/avatar.jpg" alt="用户头像" />

// 带后备文字
<Avatar name="张三" />

// 带状态指示
<Avatar src="..." name="李四" status="online" />

// 组合头像
<AvatarGroup max={3}>
  <Avatar src="..." name="用户1" />
  <Avatar src="..." name="用户2" />
  <Avatar src="..." name="用户3" />
  <Avatar src="..." name="用户4" />
</AvatarGroup>
```

**Avatar 属性**:
- `src?: string` - 图片地址
- `name?: string` - 用户名（用于后备显示）
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - 尺寸
- `status?: 'online' | 'offline' | 'away'` - 状态指示
- `shape?: 'circle' | 'square'` - 形状

**AvatarGroup 属性**:
- `max?: number` - 最大显示数量
- `children: Avatar[]` - 头像列表

---

### 3.21 ImageUploader.tsx - 图片上传

**文件位置**: `src/components/ui/ImageUploader.tsx`

**功能**: 图片上传、预览、删除

**使用示例**:
```tsx
import { ImageUploader } from '@/components/ui'

<ImageUploader
  value={imageList}
  onChange={setImageList}
  maxCount={9}
  accept="image/*"
  multiple
/>

// 带裁剪
<ImageUploader
  value={imageList}
  onChange={setImageList}
  cropable
  aspectRatio={1}
/>
```

**ImageUploader 属性**:
- `value?: string[]` - 已上传图片列表
- `onChange?: (value: string[]) => void` - 变化回调
- `maxCount?: number` - 最大上传数量
- `accept?: string` - 接受的文件类型
- `multiple?: boolean` - 是否支持多选
- `cropable?: boolean` - 是否可裁剪
- `aspectRatio?: number` - 裁剪比例
- `uploader?: (file: File) => Promise<string>` - 自定义上传函数

---

### 3.22 Statistic.tsx - 统计数值卡片

**文件位置**: `src/components/ui/Statistic.tsx`

**功能**: 展示统计数据，带数值动画

**使用示例**:
```tsx
import { Statistic } from '@/components/ui'

<Statistic
  title="总销售额"
  value={1234567}
  prefix="¥"
  suffix="元"
  precision={2}
  trend={12.5}
  trendDirection="up"
/>

// 简化用法
<Statistic title="用户总数" value={10000} suffix="人" />
```

**Statistic 属性**:
- `title?: string` - 标题
- `value: number | string` - 数值
- `prefix?: ReactNode` - 前缀符号
- `suffix?: ReactNode` - 后缀符号
- `precision?: number` - 数值精度（小数位数）
- `trend?: number` - 趋势百分比
- `trendDirection?: 'up' | 'down'` - 趋势方向
- `formatter?: (value: number) => string` - 自定义格式化函数

---

### 3.23 EmptyState.tsx - 空状态

**文件位置**: `src/components/ui/EmptyState.tsx`

**功能**: 无数据时展示的空状态占位

**使用示例**:
```tsx
import { EmptyState } from '@/components/ui'

<EmptyState
  icon={<InboxIcon />}
  title="暂无数据"
  description="请先添加数据"
  action={
    <Button icon={<Plus />}>添加</Button>
  }
/>
```

**EmptyState 属性**:
- `icon?: ReactNode` - 空状态图标
- `title: string` - 标题
- `description?: string` - 描述文字
- `action?: ReactNode` - 操作按钮
- `image?: string` - 自定义图片

---

### 3.24 Divider.tsx - 分割线

**文件位置**: `src/components/ui/Divider.tsx`

**功能**: 内容分隔

**使用示例**:
```tsx
import { Divider } from '@/components/ui'

// 水平分割
<Divider />

// 带文字
<Divider>或者</Divider>

// 垂直分割
<Divider direction="vertical" />

// 虚线
<Divider type="dashed" />
```

**Divider 属性**:
- `direction?: 'horizontal' | 'vertical'` - 方向
- `type?: 'solid' | 'dashed' | 'dotted'` - 线型
- `orientation?: 'left' | 'center' | 'right'` - 带文字时的对齐方式
- `children?: ReactNode` - 中间文字

---

### 3.25 Space.tsx - 间距组件

**文件位置**: `src/components/ui/Space.tsx`

**功能**: 设置元素之间的间距

**使用示例**:
```tsx
import { Space } from '@/components/ui'

// 水平排列，默认间距
<Space>
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>

// 垂直排列
<Space direction="vertical">
  <Input placeholder="输入框1" />
  <Input placeholder="输入框2" />
</Space>

// 大间距
<Space size="large">
  <Card>卡片1</Card>
  <Card>卡片2</Card>
</Space>

// 紧排
<Space size="small">
  <Tag>标签1</Tag>
  <Tag>标签2</Tag>
</Space>
```

**Space 属性**:
- `direction?: 'horizontal' | 'vertical'` - 排列方向
- `size?: 'small' | 'middle' | 'large' | number` - 间距大小
- `align?: 'start' | 'end' | 'center' | 'baseline'` - 对齐方式
- `wrap?: boolean` - 是否自动换行

---

### 3.26 QRCode.tsx - 二维码生成

**文件位置**: `src/components/ui/QRCode.tsx`

**功能**: 生成二维码

**使用示例**:
```tsx
import { QRCode } from '@/components/ui'

<QRCode value="https://example.com" />

// 带样式
<QRCode
  value="https://example.com"
  size={200}
  color="#2B5D3A"
  bgColor="transparent"
/>

// 下载
<QRCode
  value="https://example.com"
  download
  fileName="qrcode"
/>
```

**QRCode 属性**:
- `value: string` - 二维码内容
- `size?: number` - 尺寸
- `color?: string` - 前景色
- `bgColor?: string` - 背景色
- `download?: boolean` - 是否显示下载按钮
- `fileName?: string` - 下载文件名

---

### 3.27 FilterBar.tsx - 筛选工具栏

**文件位置**: `src/components/ui/FilterBar.tsx`

**功能**: 通用筛选条件工具栏

**使用示例**:
```tsx
import { FilterBar } from '@/components/ui'

<FilterBar onSearch={handleSearch} onReset={handleReset}>
  <FilterItem label="名称">
    <Input placeholder="请输入" value={name} onChange={e => setName(e.target.value)} />
  </FilterItem>
  <FilterItem label="状态">
    <Select value={status} onChange={setStatus}>
      <SelectOption value="">全部</SelectOption>
      <SelectOption value="1">启用</SelectOption>
      <SelectOption value="0">禁用</SelectOption>
    </Select>
  </FilterItem>
  <FilterItem label="日期">
    <DateRangePicker startDate={startDate} endDate={endDate} onChange={setDateRange} />
  </FilterItem>
</FilterBar>
```

**FilterBar 属性**:
- `onSearch?: () => void` - 搜索回调
- `onReset?: () => void` - 重置回调
- `children: FilterItem[]` - 筛选项

**FilterItem 属性**:
- `label?: string` - 筛选项标签
- `children: ReactNode` - 筛控件

---

### 3.28 KanbanBoard.tsx - 看板

**文件位置**: `src/components/ui/KanbanBoard.tsx`

**功能**: 看板视图，展示任务流转状态

**使用示例**:
```tsx
import { KanbanBoard } from '@/components/ui'

const columns = [
  { id: 'todo', title: '待处理', color: '#gray' },
  { id: 'inProgress', title: '进行中', color: '#blue' },
  { id: 'done', title: '已完成', color: '#green' },
]

const cards = [
  { id: '1', columnId: 'todo', title: '任务一', description: '描述' },
  { id: '2', columnId: 'inProgress', title: '任务二' },
  { id: '3', columnId: 'done', title: '任务三' },
]

<KanbanBoard
  columns={columns}
  cards={cards}
  onCardClick={(card) => handleCardClick(card)}
  onCardDragEnd={(cardId, newColumnId) => handleDrag(cardId, newColumnId)}
/>
```

---

### 3.29 GanttChart.tsx - 甘特图

**文件位置**: `src/components/ui/GanttChart.tsx`

**功能**: 展示项目进度、时间安排

**使用示例**:
```tsx
import { GanttChart } from '@/components/ui'

const tasks = [
  { id: '1', title: '需求分析', startDate: '2024-01-01', endDate: '2024-01-07', progress: 100 },
  { id: '2', title: '设计', startDate: '2024-01-08', endDate: '2024-01-14', progress: 80 },
  { id: '3', title: '开发', startDate: '2024-01-15', endDate: '2024-02-01', progress: 50 },
]

<GanttChart
  tasks={tasks}
  viewMode="month"
  onTaskClick={(task) => handleTaskClick(task)}
/>
```

---

## 四、组件导出配置

所有组件创建后，需要在 `src/components/ui/index.ts` 中导出：

```tsx
// src/components/ui/index.ts

// 现有导出
export { Button, buttonVariants } from './button'
export { Card, CardHeader, CardTitle, CardContent } from './card'
// ... 其他现有导出

// 新增导出 - 第一批
export { DatePicker } from './DatePicker'
export { DateRangePicker } from './DateRangePicker'
export { Drawer, DrawerHeader, DrawerTitle, DrawerDescription, DrawerContent, DrawerFooter } from './Drawer'
export { Sheet, SheetHeader, SheetTitle, SheetContent, SheetDescription } from './Sheet'
export { Alert, AlertTitle, AlertDescription } from './Alert'
export { NotificationProvider, useNotification } from './Notification'
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from './Breadcrumb'
export { Steps, StepsStep } from './Steps'
export { Pagination } from './Pagination'
export { Skeleton, TableSkeleton } from './Skeleton'
export { Progress } from './Progress'
export { TextArea } from './TextArea'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

// 新增导出 - 第二批
export { Calendar } from './Calendar'
export { Tree, TreeNode } from './Tree'
export { TreeSelect } from './TreeSelect'
export { Cascader } from './Cascader'
export { TimePicker } from './TimePicker'
export { Tooltip } from './Tooltip'
export { Avatar, AvatarGroup, AvatarImage, AvatarFallback } from './Avatar'
export { ImageUploader } from './ImageUploader'
export { Statistic } from './Statistic'
export { EmptyState } from './EmptyState'
export { Divider } from './Divider'
export { Space } from './Space'

// 新增导出 - 第三批
export { QRCode } from './QRCode'
export { FilterBar, FilterItem } from './FilterBar'
export { KanbanBoard } from './KanbanBoard'
export { GanttChart } from './GanttChart'
```

---

## 五、样式规范

### 5.1 颜色变量

项目已有 Tailwind 颜色配置：

```js
// tailwind.config.js
colors: {
  primary: '#2B5D3A',      // 绿色主题
  secondary: '#4A90E2',    // 蓝色
  accent: '#F5A623',       // 橙色
  destructive: '#ef4444',  // 红色
}
```

### 5.2 组件样式规范

所有组件应遵循：

1. **使用 Tailwind 类名** - 不使用内联样式
2. **响应式设计** - 支持移动端
3. **暗色模式支持** - 可选（`dark:` 前缀）
4. **无障碍支持** - ARIA 属性、键盘导航

### 5.3 组件文件模板

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

// 子组件（如有）
// const SubComponent = React.forwardRef<...>((props, ref) => { ... })

export interface ComponentNameProps extends React.HTMLAttributes<HTMLDivElement> {
  // 组件特定属性
}

const ComponentName = React.forwardRef<HTMLDivElement, ComponentNameProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "基础样式",
          className
        )}
        {...props}
      >
        {/* 内容 */}
      </div>
    )
  }
)
ComponentName.displayName = "ComponentName"

// 子组件导出
// export const ComponentNameSub = ...

export { ComponentName }
```

---

## 六、依赖安装

创建组件前，确保安装必要的 Radix UI 依赖：

```bash
# 日期选择相关
npm install @radix-ui/react-date-picker react-day-picker date-fns

# 抽屉/Sheet 相关
npm install vaul

# 树形组件相关
npm install @radix-ui/react-collapsible

# 其他可能依赖
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-progress
npm install @radix-ui/react-separator
npm install @radix-ui/react-avatar
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tabs
npm install @radix-ui/react-dialog
npm install @radix-ui/react-popover
npm install @radix-ui/react-checkbox
npm install @radix-ui/react-select
npm install @radix-ui/react-label
npm install @radix-ui/react-scroll-area
```

---

## 七、文件结构

创建组件后的目录结构：

```
src/components/ui/
├── index.ts                    # 统一导出
├── button.tsx                 # ✅ 已有
├── card.tsx                   # ✅ 已有
├── badge.tsx                  # ✅ 已有
├── table.tsx                  # ✅ 已有
├── dialog.tsx                  # ✅ 已有
├── dropdown-menu.tsx           # ✅ 已有
├── input.tsx                   # ✅ 已有
├── select.tsx                  # ✅ 已有
├── checkbox.tsx                # ✅ 已有
├── label.tsx                   # ✅ 已有
├── popover.tsx                 # ✅ 已有
├── Toast.tsx                   # ✅ 已有
├── Modal.tsx                   # ✅ 已有
├── NumberInput.tsx             # ✅ 已有
├── UnifiedModal.tsx           # ✅ 已有
│
├── DatePicker.tsx             # 🆕 新增 - 日期选择器
├── DateRangePicker.tsx         # 🆕 新增 - 日期范围选择器
├── Drawer.tsx                  # 🆕 新增 - 抽屉面板
├── Sheet.tsx                   # 🆕 新增 - 底部抽屉
├── Alert.tsx                   # 🆕 新增 - 警告提示
├── Notification.tsx            # 🆕 新增 - 通知提醒
├── NotificationContext.tsx     # 🆕 新增 - 通知上下文
├── Breadcrumb.tsx              # 🆕 新增 - 面包屑导航
├── Steps.tsx                   # 🆕 新增 - 步骤条
├── Pagination.tsx             # 🆕 新增 - 分页器
├── Skeleton.tsx                # 🆕 新增 - 骨架屏
├── Progress.tsx                # 🆕 新增 - 进度条
├── TextArea.tsx                # 🆕 新增 - 多行文本
├── tabs.tsx                    # 🆕 新增 - 标签页（完善）
├── Calendar.tsx                # 🆕 新增 - 日历视图
├── Tree.tsx                    # 🆕 新增 - 树形组件
├── TreeSelect.tsx              # 🆕 新增 - 树形选择器
├── Cascader.tsx                # 🆕 新增 - 级联选择器
├── TimePicker.tsx              # 🆕 新增 - 时间选择器
├── Tooltip.tsx                 # 🆕 新增 - 文字提示
├── Avatar.tsx                  # 🆕 新增 - 头像
├── ImageUploader.tsx           # 🆕 新增 - 图片上传
├── Statistic.tsx               # 🆕 新增 - 统计数值
├── EmptyState.tsx              # 🆕 新增 - 空状态
├── Divider.tsx                 # 🆕 新增 - 分割线
├── Space.tsx                   # 🆕 新增 - 间距组件
├── QRCode.tsx                  # 🆕 新增 - 二维码
├── FilterBar.tsx               # 🆕 新增 - 筛选工具栏
├── KanbanBoard.tsx             # 🆕 新增 - 看板
├── GanttChart.tsx             # 🆕 新增 - 甘特图
```

---

## 八、测试验证

组件创建完成后，建议在项目中进行测试：

### 8.1 测试页面模板

创建 `src/pages/UIComponentsDemo.tsx`：

```tsx
import { useState } from 'react'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DatePicker,
  DateRangePicker,
  Drawer,
  Alert,
  NotificationProvider,
  useNotification,
  // ... 其他组件
} from '@/components/ui'

function NotificationDemo() {
  const { addNotification } = useNotification()
  
  return (
    <Button onClick={() => addNotification({
      title: '测试通知',
      description: '这是一条测试通知',
      variant: 'success',
    })}>
      显示通知
    </Button>
  )
}

export default function UIComponentsDemo() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  return (
    <NotificationProvider>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">UI 组件示例</h1>
        
        {/* 按钮 */}
        <Card>
          <CardHeader>
            <CardTitle>Button 按钮</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button>Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </CardContent>
        </Card>
        
        {/* 日期选择 */}
        <Card>
          <CardHeader>
            <CardTitle>DatePicker 日期选择器</CardTitle>
          </CardHeader>
          <CardContent>
            <DatePicker placeholder="选择日期" />
          </CardContent>
        </Card>
        
        {/* 抽屉 */}
        <Card>
          <CardHeader>
            <CardTitle>Drawer 抽屉</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDrawerOpen(true)}>打开抽屉</Button>
            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>抽屉标题</DrawerTitle>
                </DrawerHeader>
                <DrawerContent>抽屉内容</DrawerContent>
              </DrawerContent>
            </Drawer>
          </CardContent>
        </Card>
        
        {/* 通知 */}
        <Card>
          <CardHeader>
            <CardTitle>Notification 通知</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationDemo />
          </CardContent>
        </Card>
        
        {/* ... 其他组件示例 */}
      </div>
    </NotificationProvider>
  )
}
```

### 8.2 路由配置

在 `src/App.tsx` 中添加测试路由：

```tsx
import UIComponentsDemo from './pages/UIComponentsDemo'

// 在路由配置中添加
<Route path="/ui-demo" element={<UIComponentsDemo />} />
```

---

## 九、常见问题

### Q1: 组件样式与现有风格不统一怎么办？

A: 创建组件时使用项目已有的 Tailwind 颜色变量：
```tsx
className="bg-primary text-white hover:bg-primary/90"
```

### Q2: 需要支持暗色模式吗？

A: 可选，使用 `dark:` 前缀：
```tsx
className="bg-white dark:bg-gray-900"
```

### Q3: 组件需要国际化支持吗？

A: 目前项目未集成 i18n，可后续添加。目前直接使用中文硬编码。

### Q4: 如何处理组件的 TypeScript 类型？

A: 每个组件应导出对应的 Props 接口：
```tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}
```

---

## 十、总结

本规划文档详细说明了为 V1.1 项目添加 UI 组件的完整方案：

1. **组件清单**: 29 个新组件
2. **分批实施**: 三批次优先级
3. **实现指南**: 每个组件的详细用法
4. **文件位置**: 全部在 `src/components/ui/`
5. **导出配置**: 统一通过 `index.ts` 导出
6. **测试验证**: 提供 Demo 页面模板

AI 执行者应按照本文档逐个创建组件文件，确保组件风格统一、类型安全、使用方便。
