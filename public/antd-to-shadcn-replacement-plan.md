# Ant Design → shadcn/ui 组件替换规划方案

> 创建时间：2026-05-08
> 最后更新：2026-05-08
> 状态：部分完成，持续进行中

---

## ⭐ 核心原则（最高优先级）

> **系统稳定性第一！所有替换任务必须遵循以下原则：**

### 铁律

| 原则 | 说明 |
|------|------|
| 🔒 **显示不变** | 替换后页面布局、样式、交互效果必须与替换前完全一致 |
| 🔒 **数据不变** | 不涉及任何数据层变更，数据库、API 接口、localStorage 数据完整保留 |
| 🔒 **功能不变** | 替换前后功能行为完全一致，用户操作体验不变 |
| 🔒 **逻辑不变** | 业务逻辑、数据处理逻辑、事件处理逻辑保持一致 |
| 🔒 **API 兼容** | 组件 Props 必须兼容或有明确的适配层 |
| 🔒 **可回滚** | 每次替换后必须验证通过，发现问题立即回滚 |

### 替换前提条件

```
✅ 替换前必须：
   1. 原组件功能验证通过
   2. 备份原文件或创建恢复分支
   3. 新组件 API 完全理解
   4. 准备好完整的测试用例

❌ 遇到以下情况必须停止：
   1. 构建失败
   2. 页面显示异常
   3. 功能测试不通过
   4. 数据丢失或错误
   5. 任何不确定的情况
```

### 验证流程（每一步都必须通过）

```
1. npm run build    → 构建成功
2. 页面加载        → 无白屏、无报错
3. 核心功能测试    → 与替换前行为一致
4. 页面显示对比    → 样式完全一致
5. 提交代码        → git commit
```

---

## 一、替换进度总览

| 组件类型 | 状态 | 说明 |
|----------|------|------|
| Button, Badge, Card, Input | ✅ 已完成 | Tag → Badge, message → useToast |
| Dialog, Drawer, Sheet | ✅ 已完成 | Modal → Modal (shadcn/ui) |
| DatePicker, Select | ⚠️ 部分完成 | DateRangePicker 已替换，DatePicker/Select 需继续 |
| Table | ❌ 待替换 | API 差异大，需较大改造 |
| Tree, Cascader | ❌ 待替换 | 需要重新实现高级功能 |
| Typography | ✅ 已完成 | 直接用 Tailwind CSS 类替代 |
| Timeline, List | ✅ 已完成 | 新增组件 |

---

## 二、替换难度分类

### ✅ 简单替换（可直接替换）

| antd 组件 | shadcn/ui 组件 | 状态 |
|-----------|----------------|------|
| Button | Button | ✅ 已完成 |
| Tag | Badge | ✅ 已完成 |
| Card | Card | ✅ 已完成 |
| Input | Input | ✅ 已完成 |
| Dialog | Dialog | ✅ 已完成 |
| Modal | Modal | ✅ 已完成 |
| Drawer | Drawer | ✅ 已完成 |
| Sheet | Sheet | ✅ 已完成 |
| Space | Space | ✅ 已完成 |
| Progress | Progress | ✅ 已完成 |
| Typography (Text, Title) | Tailwind CSS | ✅ 已完成 |
| message | useToast | ✅ 已完成 |
| Popover | Popover | ✅ 已完成 |
| Checkbox | Checkbox | ✅ 已完成 |
| Label | Label | ✅ 已完成 |
| Divider | Divider | ✅ 已完成 |
| Avatar | Avatar | ✅ 已完成 |
| Tooltip | Tooltip | ✅ 已完成 |

### ⚠️ 中等难度（需调整 API）

| antd 组件 | shadcn/ui 组件 | 状态 | 差异说明 |
|-----------|----------------|------|----------|
| DatePicker | DatePicker | ⚠️ 部分完成 | props 名称不同：`value` vs `selected`，`onChange` 签名不同 |
| Select | Select | ⚠️ 部分完成 | 支持异步加载、搜索等功能需额外配置 |
| DateRangePicker | DateRangePicker | ✅ 已完成 | - |
| TimePicker | TimePicker | ⚠️ 待替换 | 时间选择逻辑有差异 |
| Alert | Alert | ✅ 已完成 | - |
| Notification | Notification | ✅ 已完成 | - |
| Breadcrumb | Breadcrumb | ✅ 已完成 | - |
| Steps | Steps | ✅ 已完成 | - |
| Pagination | Pagination | ✅ 已完成 | - |
| Skeleton | Skeleton | ✅ 已完成 | - |
| Tabs | Tabs | ✅ 已完成 | - |
| TextArea | TextArea | ✅ 已完成 | - |

### ❌ 复杂替换（需较大改造）

| antd 组件 | shadcn/ui 组件 | 状态 | 原因 |
|-----------|----------------|------|------|
| Table | Table/ProTable | ❌ 待替换 | API 模式完全不同（dataSource/columns vs children） |
| Tree | Tree | ❌ 待替换 | 支持异步加载、搜索等复杂功能 |
| TreeSelect | TreeSelect | ❌ 待替换 | 树形选择逻辑复杂 |
| Cascader | Cascader | ❌ 待替换 | 多级联动逻辑复杂 |

---

## 三、已替换组件清单（2026-05-08）

### 新增组件
- [x] Timeline 时间线组件
- [x] List 列表组件

### 修复导出错误
- [x] 移除 `DropdownMenuLabel`（不存在）
- [x] 修复 `Toast` → `ToastContainer`
- [x] 修复 `ModalHeader/Title/Content` → `Modal`

### 页面替换完成
- [x] `src/pages/hr/HrApproval.tsx` - Tag → Badge, message → useToast
- [x] `src/pages/hr/HrApprovalDetail.tsx` - Timeline, List, Card, Tag 替换
- [x] `src/pages/HrApproval.tsx` - message → useToast
- [x] `src/components/common/DateRangePicker.tsx` - DatePicker 替换
- [x] `src/components/common/ExportButton.tsx` - Button, useToast
- [x] `src/components/common/badge/StatusBadge.tsx` - Tag → Badge
- [x] `src/components/common/modal/ProModal.tsx` - Modal 替换
- [x] `src/pages/DailyPlanningPage.tsx` - Tag → Badge, Progress, Typography
- [x] `src/pages/MonthlyPlanningPage.tsx` - Tag → Badge, Space, Typography
- [x] `src/components/planning/MonthlyPlanReport.tsx` - Tag → Badge
- [x] `src/components/planning/DailyWorkOrderReport.tsx` - Tag → Badge
- [x] `src/components/farm/harvest/statusBadgeUtils.tsx` - Tag → Badge

---

## 四、保留 antd 的文件清单

| 文件 | 保留组件 | 保留原因 |
|------|----------|----------|
| `src/components/common/table/ProTable.tsx` | Table | 需要 antd Table 的排序、筛选、分页、rowSelection 等高级功能 |
| `src/pages/DailyPlanningPage.tsx` | Table | 同上 |
| `src/pages/MonthlyPlanningPage.tsx` | Table | 同上 |
| `src/components/planning/MonthlyPlanReport.tsx` | Table, Row, Col, Typography | Row/Col 布局组件，Typography 特殊用法 |
| `src/components/planning/DailyWorkOrderReport.tsx` | Table, Row, Col, Typography | 同上 |

---

## 五、详细替换计划

### Phase 1: 收尾简单替换（1-2天）

**目标：完成所有简单组件替换**

#### 1.1 Select 组件替换
- [ ] 检查 `src/components/common/` 下使用 Select 的文件
- [ ] 替换为 shadcn/ui Select
- [ ] 验证异步加载、搜索功能正常

#### 1.2 DatePicker 组件替换
- [ ] 检查使用 DatePicker 的文件
- [ ] 替换为 shadcn/ui DatePicker
- [ ] 适配日期格式和回调

#### 1.3 TimePicker 组件替换
- [ ] 创建/完善 TimePicker 组件
- [ ] 替换使用 TimePicker 的文件

#### 1.4 图标替换
- [ ] `src/pages/DailyPlanningPage.tsx` - @ant-design/icons → lucide-react
- [ ] `src/pages/MonthlyPlanningPage.tsx` - @ant-design/icons → lucide-react

### Phase 2: 复杂组件替换（3-5天）

**目标：解决 Table、Tree 等复杂组件**

#### 2.1 Table 组件方案

**问题分析：**
```tsx
// antd Table（数据驱动）
<Table
  dataSource={data}
  columns={columns}
  pagination={pagination}
  rowSelection={rowSelection}
/>

// shadcn/ui Table（children 模式）
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>
    {data.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**方案选择：**

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| A. 保留 ProTable 用 antd | 功能完整，稳定 | 继续依赖 antd | ⭐⭐⭐ |
| B. 重写为 shadcn/ui Table | 完全脱离 antd | 工作量大，可能有功能缺失 | ⭐⭐ |
| C. 混合方案 | 渐进替换 | 维护两套 | ⭐⭐⭐⭐ |

**推荐：方案 A + 渐进替换**
- 保留 ProTable 使用 antd Table
- 新页面使用 shadcn/ui Table
- 后续逐步迁移

#### 2.2 Tree/Cascader 组件方案

**推荐：保留 antd 组件**
- Tree 和 Cascader 业务逻辑复杂
- 完全重写风险高
- 可以封装后对外提供统一接口

### Phase 3: 验证与优化（1-2天）

- [ ] 全局搜索 `from 'antd'` 确认无遗漏（简单组件）
- [ ] 构建测试 `npm run build`
- [ ] 页面功能测试
- [ ] 更新本规划文档

---

## 六、替换规则速查

### Tag → Badge

```tsx
// 替换前
<Tag color="success">完成</Tag>
<Tag color="warning">进行中</Tag>
<Tag color="danger">失败</Tag>

// 替换后
<Badge variant="success">完成</Badge>
<Badge variant="warning">进行中</Badge>
<Badge variant="destructive">失败</Badge>
```

### message → useToast

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

### Typography → Tailwind

```tsx
// 替换前
<Text strong>粗体</Text>
<Text type="secondary">灰色</Text>
<Title level={3}>标题</Title>

// 替换后
<span className="font-semibold">粗体</span>
<span className="text-gray-500">灰色</span>
<h3 className="text-lg font-bold">标题</h3>
```

### Progress

```tsx
// 替换前
<Progress percent={50} size="small" />

// 替换后
<Progress value={50} size="sm" />
```

### Space

```tsx
// 替换前
<Space size="middle">...</Space>

// 替换后
<Space size="medium">...</Space>
```

---

## 七、组件 API 对照表

| antd Props | shadcn/ui Props | 说明 |
|------------|-----------------|------|
| `value` (DatePicker) | `selected` | - |
| `onChange` (DatePicker) | `onChange` | 回调参数可能不同 |
| `percent` (Progress) | `value` | - |
| `size="small"` (Progress) | `size="sm"` | - |
| `size="middle"` (Space) | `size="medium"` | - |
| `color="success"` (Tag) | `variant="success"` | - |
| `color="danger"` (Tag) | `variant="destructive"` | - |

---

## 八、验证检查清单（必须逐项通过）

### 🔴 替换前必须完成
- [ ] 原组件功能验证通过（手动测试核心功能）
- [ ] 原组件样式截图保存（替换后对比）
- [ ] 原文件备份或创建恢复分支
- [ ] 确认目标组件 API 文档已阅读
- [ ] 确认 API 对应关系正确

### 🟡 替换后必须验证
- [ ] `npm run build` 构建成功
- [ ] 页面加载无白屏、无报错
- [ ] 页面样式与替换前完全一致（视觉对比）
- [ ] 核心功能操作测试通过
- [ ] 导入路径正确（`@/components/ui`）
- [ ] Props 传递正确
- [ ] 类型检查通过（无 TS 错误）

### 🟢 提交前必须确认
- [ ] git diff 查看变更范围
- [ ] 构建测试通过
- [ ] 功能测试通过
- [ ] 提交信息规范
- [ ] 通知相关人员（如有必要）

### ⚠️ 异常情况处理
```
如果遇到以下情况，立即停止并回滚：
□ 构建失败 - 立即回滚，不继续调试
□ 页面显示异常 - 立即回滚
□ 功能不工作 - 立即回滚
□ 数据丢失 - 立即回滚
□ 样式严重偏差 - 立即回滚
□ 任何不确定的情况 - 暂停，询问确认
```

---

## 九、注意事项（必须遵守）

### 稳定性原则

| 原则 | 说明 | 违规处理 |
|------|------|----------|
| **系统稳定性第一** | 任何替换都必须以不破坏现有系统为前提 | 发现异常立即回滚 |
| **渐进替换** | 不追求一次性全部替换，发现问题可快速定位 | 保持原文件备份 |
| **充分验证** | 每次替换后必须完整测试，不急于提交 | 构建+功能双验证 |
| **保守策略** | 遇到不确定的情况，优先保留原组件 | 宁可保留，不盲目替换 |

### 执行准则

1. **ProTable 保留 antd**: Table 组件依赖 antd 的排序、筛选、分页等功能，暂不替换
2. **Tree/Cascader 保留 antd**: 业务逻辑复杂，完全重写风险高，暂不替换
3. **复杂组件替换需评审**: 任何涉及 Table、Tree、Cascader 等复杂组件的替换，需要详细评审后再执行
4. **每日构建验证**: 每次替换后必须运行 `npm run build` 确保构建成功
5. **功能对比测试**: 替换前后必须进行功能对比，确保行为一致

### 替换风险评估矩阵

| 组件 | 风险等级 | 替换条件 | 建议 |
|------|----------|----------|------|
| Button, Badge, Card | 🟢 低 | 直接替换 | 可执行 |
| Dialog, Drawer, Sheet | 🟢 低 | API 对应检查 | 可执行 |
| DatePicker, Select | 🟡 中 | Props 适配验证 | 需测试 |
| Table, Tree, Cascader | 🔴 高 | API 差异大 | **不推荐替换** |
| message → useToast | 🟡 中 | Hook 方式不同 | 需功能测试 |

---

## 十、相关文档

- [UI统一执行指南.md](./UI统一执行指南.md) - UI组件库使用规范
- [shadcn/ui 组件清单](./UI组件导入V1.0.md) - 组件导入规划
