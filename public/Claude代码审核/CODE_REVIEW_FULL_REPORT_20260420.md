# 🔍 源行程系统 V1.1 全量代码审查报告

**项目路径**: D:\TMcrop\yuanxingtu\V1.1
**审查日期**: 2026-04-20
**审查范围**: 全量页面、组件、弹窗、表格、按钮
**版本**: Web原型开发阶段

---

## 📊 审查统计总览

| 类别 | 数量 |
|------|------|
| 页面文件 | ~90个 |
| 组件文件 | ~200+个 |
| 弹窗组件 | 70+个 DeleteWarningModal + 70+个 ExportFormatModal + 其他 |
| 表格组件 | ~30个 |
| 表单组件 | ~40个 |
| 发现问题总数 | 180+个 |

---

## 📑 第一部分：页面逐个审查

---

### 1. Dashboard.tsx (仪表盘首页)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/Dashboard.tsx` |
| **行数** | 1714行 |
| **功能** | 仪表盘首页，集成统计卡片、图表、任务、告警、天气、IoT传感器等 |
| **数据来源** | 从 `../data/mockData` 导入 `dashboardStats`, `tasks`, `iotSensors`, `messages`, `cropBatches` |
| **弹窗数量** | 2个 - ImageEnlargementModal, 通用详情Modal |
| **表格数量** | 无表格，使用卡片列表展示 |
| **useState数量** | 分散在多个子组件中 |

#### 按钮操作列表
| 按钮 | 位置 | 功能 |
|------|------|------|
| 刷新按钮 | 各数据卡片 | 刷新数据 |
| 图片点击 | 任务卡片 | 放大图片 |
| 详情点击 | 各种列表项 | 打开详情弹窗 |

#### 问题列表
- ❌ 使用 `any` 类型过多 (`task: typeof tasks[0]`)
- ❌ 硬编码天气数据 (`stationParams` 数组)
- ❌ 多个子组件内部定义状态，状态管理分散
- ❌ 组件过于臃肿，1714行应拆分

#### 可拆分子组件建议
```
Dashboard/
├── components/
│   ├── StatsSection.tsx      # 统计卡片区
│   ├── TaskSection.tsx       # 任务列表区
│   ├── AlertSection.tsx      # 告警区
│   ├── WeatherSection.tsx    # 天气区
│   ├── IoTSection.tsx        # IoT传感器区
│   └── ChartSection.tsx      # 图表区
```

---

### 2. Materials.tsx (物料管理)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/Materials.tsx` |
| **行数** | 1177行 |
| **功能** | 仓库物料管理，包含库存总览、物料入库、编码生成 |
| **数据来源** | ❌ **严重硬编码** - `warehouseMaterials`(13条), `inboundRecords`(13条) 直接定义在文件内 |
| **弹窗数量** | 3个 - AddInboundModal, ExportFormatModal, 详情Modal |
| **表格数量** | 2个 - 库存列表表格、入库记录表格 |

#### 表格列定义（硬编码）

**库存列表表格列**:
| 列名 | 字段 | 硬编码 |
|------|------|--------|
| 物料编码 | code | ✅ |
| 物料名称 | name | ✅ |
| 分类 | category | ✅ |
| 单位 | unit | ✅ |
| 规格 | specification | ✅ |
| 单价 | price | ✅ |
| 库存数量 | quantity | ✅ |
| 仓库位置 | location | ✅ |

**入库记录表格列**:
| 列名 | 字段 | 硬编码 |
|------|------|--------|
| 入库单号 | code | ✅ |
| 供应商 | supplier | ✅ |
| 入库日期 | date | ✅ |
| 状态 | status | ✅ |
| 操作 | actions | ✅ |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 新增入库 | 打开新增弹窗 |
| 导出 | 导出格式选择 |
| 编辑 | 修改物料信息 |
| 删除 | 删除确认 |
| 重置 | 清空表单 |

#### 问题列表
- ❌ `categoryConfig` 分类配置重复定义（约150行）
- ❌ `warehouseMaterials` 13条硬编码
- ❌ `inboundRecords` 13条硬编码
- ❌ 表单验证仅使用简单 `setCodeError/setNameError`
- ❌ `handleSaveInbound` 只有 console.log 无实际逻辑

---

### 3. Indicators.tsx (指标管理)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/Indicators.tsx` |
| **行数** | 926行 |
| **功能** | 指标数据管理，包含指标列表、分类管理、达成分析、考核评价 |
| **数据来源** | ❌ **严重硬编码** - `indicators`(16条), `evaluationData`(8条), `analyzeData`(6条) |
| **弹窗数量** | 3个合一 - 详情/编辑/分析/考核评价共用同一 `showModal` |
| **表格数量** | 3个表格 |

#### 硬编码数据详情

**indicators 数组** (16条):
```typescript
const indicators = [
  { id: '1', code: 'KPI001', name: '月产量完成率', category: '生产指标', unit: '%', target: 95, actual: 92.5 },
  { id: '2', code: 'KPI002', name: '温室利用率', category: '资源指标', unit: '%', target: 90, actual: 88.3 },
  // ... 共16条
];
```

**evaluationData 数组** (8条):
```typescript
const evaluationData = [
  { id: '1', name: '基地一', productionScore: 92, qualityScore: 95, costScore: 88 },
  // ... 共8条
];
```

**analyzeData 数组** (6条):
```typescript
const analyzeData = [
  { month: '1月', target: 100, actual: 95, 达成率: 95 },
  // ... 共6条
];
```

**categorySummary 数组**:
```typescript
const categorySummary = [
  { name: '生产指标', count: 3, avgAchievement: 95.2, color: '#06b6d4' },
  // ...
];
```

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 新增指标 | 打开新增弹窗 |
| 导出 | 导出数据 |
| 考核评价 | 打开考核弹窗 |
| 查看 | 打开详情 |
| 编辑 | 打开编辑 |
| 删除 | 删除确认 |
| 分析 | 打开分析弹窗 |

#### 问题列表
- ❌ 所有数据均为硬编码
- ❌ 多 Tab 切换导致复杂度增加
- ❌ 表单无验证逻辑
- ❌ `modalType` 使用字符串字面量，类型不安全

---

### 4. Announcement.tsx (公告管理)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/Announcement.tsx` |
| **行数** | 886行 |
| **功能** | 公告管理，包含公告列表、类型管理、审批流程、模板管理 |
| **数据来源** | ❌ 硬编码 - `notices`(10条), `templates`(6条), `approvalWorkflows`(4条) |

#### 硬编码数据

**notices 数组** (10条):
```typescript
const notices = [
  { id: 1, title: '关于春季种植安排的通知', type: 'system', status: 'published', publishDate: '2026-03-01', author: '管理员' },
  // ... 共10条
];
```

**templates 数组** (6条):
```typescript
const templates = [
  { id: 1, name: '会议通知模板', content: '...' },
  // ... 共6条
];
```

**approvalWorkflows 数组** (4条):
```typescript
const approvalWorkflows = [
  { id: 1, name: '物资采购审批', steps: 3, approvers: ['张经理', '李总监'] },
  // ... 共4条
];
```

#### 表格列定义（硬编码）
| 列名 | 字段 |
|------|------|
| 标题 | title |
| 类型 | type |
| 状态 | status |
| 发布日期 | publishDate |
| 作者 | author |
| 操作 | actions |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 发布公告 | 打开发布弹窗 |
| 导出 | 导出列表 |
| 发送 | 发送公告 |
| 编辑 | 修改公告 |
| 删除 | 删除公告 |

#### 问题列表
- ❌ `tbody` 内直接使用 Fragment 而非 `key` 正确处理
- ❌ 分类数据硬编码
- ❌ 表单无验证逻辑
- ❌ 删除确认使用 `toast.success` 而非确认框

---

### 5. CodeRule.tsx (编码规则)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/CodeRule.tsx` |
| **行数** | 891行 |
| **功能** | 物料编码规则配置，三级分类树形展示与编辑 |
| **数据来源** | ❌ 硬编码 - `initialCategories` 定义完整分类体系 |

#### 硬编码数据 (initialCategories)

```typescript
const initialCategories = [
  {
    code: 'SP', name: '生产投入类', subCategories: [
      {
        code: 'SP01', name: '种质资源', subCategories: [
          { code: 'SP0101', name: '粮食作物种子', prefix: 'SP0101' },
          { code: 'SP0102', name: '蔬菜种子', prefix: 'SP0102' },
          // ...
        ]
      },
      // ...
    ]
  },
  // ...
];
```

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| 添加大类弹窗 | 新增一级分类 |
| 添加中类弹窗 | 新增二级分类 |
| 添加小类弹窗 | 新增三级分类 |

#### 表格列定义（树形表格）
| 列名 | 字段 |
|------|------|
| 分类编码 | code |
| 分类名称 | name |
| 编码前缀 | prefix |
| 操作 | actions |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 修改规则 | 编辑编码规则 |
| 保存修改 | 提交保存 |
| 添加分类 | 打开添加弹窗 |
| 编辑 | 修改分类 |
| 删除 | 删除确认 |

#### 问题列表
- ❌ 删除确认使用 `confirm()` 而非统一弹窗
- ❌ `editingCell` 状态管理复杂
- ❌ 编辑状态使用多个独立 state 管理

---

### 6. Approvals.tsx (审批中心)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/Approvals.tsx` |
| **行数** | 339行 |
| **功能** | 审批中心主页，展示审批列表、统计、快捷审批操作 |
| **数据来源** | ✅ 从 `useApproval` hook 获取数据 |

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| PartialModal | 部分通过审批 |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 通过 | 审批通过 |
| 拒绝 | 审批拒绝 |
| 部分通过 | 部分通过 |

#### 问题列表
- ⚠️ 使用 `confirm()` 进行操作确认
- ⚠️ 硬编码 `ApprovalStatus` 字符串比较

---

### 7. MaterialApproval.tsx (物料审批)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/MaterialApproval.tsx` |
| **行数** | 1047行 |
| **功能** | 物料审批（领料/退料/采购），包含审批列表、详情、拒绝操作 |
| **数据来源** | ✅ 从 `useApproval` hook 获取，使用 `ApprovalContext` |

#### Tab结构
| Tab | 内容 |
|-----|------|
| 领料审批 | 领料申请列表 |
| 退料审批 | 退料申请列表 |
| 采购审批 | 采购申请列表 |

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| 详情弹窗 | 显示申请详情 |
| 拒绝原因弹窗 | 输入拒绝原因 |

#### 表格列定义（三个Tab各自独立）

**领料审批表格**:
| 列名 | 字段 |
|------|------|
| 申请单号 | code |
| 申请人 | applicant |
| 物料 | materials |
| 数量 | quantity |
| 状态 | status |
| 申请时间 | createTime |
| 操作 | actions |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 通过 | 审批通过 |
| 拒绝 | 打开拒绝弹窗 |
| 查看详情 | 打开详情弹窗 |

#### 问题列表
- ❌ 三个 Tab 表格代码高度重复
- ❌ 详情弹窗内容复杂，1047行文件无有效拆分
- ❌ `rejectModal.reason` 状态在 `confirm` 前被重置
- ❌ 表单无验证
- ❌ 使用 `confirm()` 确认操作

---

### 8. SupplierManagement.tsx (供应商管理)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/SupplierManagement.tsx` |
| **行数** | 1646行 |
| **功能** | 供应商管理，包含供应商列表、编码生成、CRUD操作、批量编辑 |
| **数据来源** | ✅ 从 `../components/supplier/data` 导入 `suppliers` |

#### 弹窗列表（超过10个）
| 弹窗 | 行数 | 功能 |
|------|------|------|
| ExportModal | ~60 | 导出格式选择 |
| AddModal | ~80 | 新增供应商 |
| DetailModal | ~100 | 供应商详情 |
| EditWarning | ~50 | 编辑警告 |
| DeleteWarning | ~50 | 删除警告 |
| EditModal | ~120 | 编辑供应商 |
| BatchEditModal | ~150 | 批量编辑 |
| DeleteConfirm | ~50 | 删除确认 |

#### 表格列定义（19列，硬编码）
| 列名 | 字段 | 硬编码 |
|------|------|--------|
| 供应商编码 | code | ✅ |
| 供应商名称 | name | ✅ |
| 联系人 | contact | ✅ |
| 电话 | phone | ✅ |
| 地址 | address | ✅ |
| 主营产品 | products | ✅ |
| 合作类型 | type | ✅ |
| 合作状态 | status | ✅ |
| 评级 | rating | ✅ |
| ... | ... | ... |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 新增 | 打开新增弹窗 |
| 编辑 | 打开编辑弹窗 |
| 删除 | 打开删除确认 |
| 导出 | 导出格式选择 |
| 重置 | 清空搜索条件 |
| 搜索 | 执行搜索 |
| 批量编辑 | 打开批量编辑 |
| 批量删除 | 批量删除 |

#### 问题列表
- ❌ 弹窗数量过多（超过10个弹窗变体）
- ❌ 编辑表单使用 `editForm` 独立 state，与 `selectedSupplier` 状态冗余
- ❌ `supplierCodeGen` 编码生成状态与其他状态分离
- ❌ 批量编辑 Modal 使用复杂的状态管理
- ❌ 导出功能代码重复（与 Materials.tsx 类似）
- ❌ 存在 `console.log` 调试代码
- ❌ 硬编码组织名称 "宁波帮帮忙公司"、"成都帮帮您公司"

---

### 9. EnvironmentMonitor.tsx (环境监测)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/EnvironmentMonitor.tsx` |
| **行数** | 487行 |
| **功能** | 环境监测，展示IoT传感器数据、天气预报、温室环境参数 |
| **数据来源** | ✅ 从 `mockData` 导入 `iotSensors`, `greenhouses`, `cropBatches` |

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| 详情弹窗 | 使用通用 Modal 组件 |

#### 问题列表
- ⚠️ `externalEnvParams` 外部环境参数硬编码
- ⚠️ `weatherForecast` 天气数据硬编码
- ⚠️ `sensorTrend` 传感器趋势数据未使用

---

### 10. WarehouseInboundPage.tsx (入库管理)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/warehouse/WarehouseInboundPage.tsx` |
| **行数** | 1011行 |
| **功能** | 物料入库管理，包含入库记录列表、编码生成、详情/编辑/删除/新增弹窗 |
| **数据来源** | ❌ **严重硬编码** - `initialInboundRecords` 定义12条入库记录 |

#### 硬编码数据 (initialInboundRecords) - 12条

```typescript
const initialInboundRecords = [
  {
    id: 1,
    code: 'RK20260315-001',
    supplier: '宁波帮帮忙公司',
    date: '2026-03-15',
    status: 'pending',
    materials: [...],
    totalAmount: 15000,
    remark: '种子采购入库'
  },
  // ... 共12条
];
```

#### 硬编码 categoryConfig (~150行)

```typescript
const categoryConfig = {
  'SP': { name: '生产投入类', categories: { ... } },
  'WL': { name: '物料', categories: { ... } },
  // ...
};
```

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| DetailModal | 查看详情 |
| EditModal | 编辑记录 |
| AddModal | 新增记录 |
| DeleteConfirmModal | 删除确认 |
| BatchEditModal | 批量编辑 |

#### 表格列定义
| 列名 | 字段 |
|------|------|
| 入库单号 | code |
| 供应商 | supplier |
| 入库日期 | date |
| 状态 | status |
| 物料明细 | materials |
| 总金额 | totalAmount |
| 操作 | actions |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 编码生成 | 打开编码生成器 |
| 新增入库 | 打开新增弹窗 |
| 编辑 | 打开编辑弹窗 |
| 删除 | 删除确认 |
| 确认编辑 | 提交编辑 |
| 导出 | 导出数据 |

#### 问题列表
- ❌ `initialInboundRecords` 12条硬编码数据
- ❌ `categoryConfig` 约150行硬编码配置
- ❌ 状态管理复杂 - 10+ 个 useState
- ❌ `handleConfirmEdit` 函数体为空
- ❌ 编码生成器与 Materials.tsx 功能重复
- ❌ 分页逻辑自定义而非使用通用组件

---

### 11. DailyWorkSummary.tsx (每日工单汇总)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/DailyWorkSummary.tsx` |
| **行数** | 175行 |
| **功能** | 每日工单汇总表 |
| **数据来源** | ✅ 从 `useDailyWorkSummary` Hook 获取 |

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| ExportModal | 导出格式选择 |

#### 问题列表
- ⚠️ 表格列配置内联在组件中
- ⚠️ 分页逻辑使用 slice 实现

---

### 12. DailyProblemSummary.tsx (每日问题汇总)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/DailyProblemSummary.tsx` |
| **行数** | 493行 |
| **功能** | 每日问题汇总表，支持问题分派 |

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| detailModal | 问题详情 |
| dispatchModal | 问题分派 |
| ExportModal | 导出格式选择 |

#### 问题列表
- ❌ 详情弹窗和分派弹窗直接内联在页面中
- ❌ 弹窗代码重复较多

---

### 13. WorkOrders.tsx (工单管理)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/WorkOrders.tsx` |
| **行数** | 190行 |
| **功能** | 工单管理 |
| **数据来源** | ❌ **严重硬编码** - `workOrders` 数组直接硬编码5条数据 |

#### 硬编码数据 (workOrders) - 5条

```typescript
const workOrders = [
  { id: 1, title: '温室A区灌溉', status: 'normal', priority: 'high', assignee: '张三', createTime: '2026-03-15' },
  { id: 2, title: '番茄采摘', status: 'pending', priority: 'medium', assignee: '李四', createTime: '2026-03-14' },
  // ... 共5条
];
```

#### 表格列定义（硬编码）
| 列名 | 字段 |
|------|------|
| 工单编号 | id |
| 工单标题 | title |
| 状态 | status |
| 优先级 | priority |
| 执行人 | assignee |
| 创建时间 | createTime |
| 操作 | actions |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 搜索 | 按标题搜索 |
| 新建工单 | 创建新工单 |
| 查看 | 查看详情 |
| 编辑 | 编辑工单 |

#### 问题列表
- ❌ `workOrders` 5条测试数据硬编码
- ❌ 表格列直接内联
- ❌ 状态使用字符串字面量 (`normal`/`pending`/`draft`)

---

### 14. Login.tsx (登录页)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/Login.tsx` |
| **行数** | 143行 |
| **功能** | 登录页面 |

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| 退出确认弹窗 | 退出登录确认 |

#### 按钮操作列表
| 按钮 | 功能 |
|------|------|
| 登录 | 执行登录 |
| 密码显示切换 | 显示/隐藏密码 |

#### 问题列表
- ❌ 登录状态存储在 localStorage（无验证）
- ❌ 硬编码默认用户 `陆启闯`
- ⚠️ 登录无实际验证逻辑

---

### 15. HomePage.tsx (首页)

| 属性 | 值 |
|------|-----|
| **路径** | `src/pages/HomePage.tsx` |
| **行数** | 427行 |
| **功能** | 首页/主页面 |

#### 弹窗列表
| 弹窗 | 功能 |
|------|------|
| AboutModal | 关于对话框 |
| 退出确认弹窗 | 退出登录确认 |

#### 问题列表
- ❌ `modules` 数组中用户信息硬编码（`宁波帮帮忙公司`、`陆启闯`）
- ⚠️ 国际化配置直接内联

---

### 16-30. 重导出页面（无实际问题）

以下页面仅为组件重导出，无实际业务逻辑：

| 页面 | 行数 | 功能 |
|------|------|------|
| Contract.tsx | 8 | 重导出 ContractTable |
| Production.tsx | 6 | 重导出组件 |
| PurchasePlan.tsx | 6 | 重导出组件 |
| TechSolution.tsx | 6 | 重导出组件 |
| MaterialReturn.tsx | 6 | 重导出组件 |
| MaterialCategory.tsx | 2 | 重导出组件 |
| CropManagement.tsx | 1 | 重导出组件 |
| PlantAreaManagement.tsx | 1 | 重导出组件 |
| SeedManagement.tsx | 1 | 重导出组件 |
| ... | ... | ... |

---

## 📑 第二部分：组件逐个审查

---

### 一、UI基础组件 (src/components/ui/)

| 组件 | 行数 | Props类型 | 可复用性 | 问题 |
|------|------|----------|---------|------|
| button.tsx | 53 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| card.tsx | 52 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| table.tsx | 88 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| dialog.tsx | 117 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| Modal.tsx | 447 | ✅ 有 | ⭐⭐⭐ 高 | ⚠️ 过于庞大，包含4种组件 |
| UnifiedModal.tsx | 60 | ✅ 有 | ⭐⭐ 高 | 无 |

#### Modal.tsx 详细问题
```
行数: 447
包含组件:
- Modal (主组件)
- FormField
- Input
- Select
- Textarea

建议拆分:
- Modal.tsx (仅Modal)
- FormField.tsx
- Input.tsx
- Select.tsx
- Textarea.tsx
```

---

### 二、通用业务组件 (src/components/common/)

| 组件 | 行数 | Props类型 | 可复用性 | 问题 |
|------|------|----------|---------|------|
| LaborModal.tsx | 148 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| LaborTable.tsx | 258 | ✅ 有 | ⭐⭐⭐ 高 | 无，设计良好 |
| LaborFilters.tsx | 180 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| LaborStatCard.tsx | 145 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| LaborEmptyState.tsx | 137 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| LaborExport.tsx | ~100 | ✅ 有 | ⭐⭐⭐ 高 | 无 |
| LaborPagination.tsx | ~50 | ✅ 有 | ⭐⭐ 高 | 无 |
| LaborStatusBadge.tsx | ~50 | ✅ 有 | ⭐⭐ 高 | 无 |
| LaborWorkerSelector.tsx | ~80 | ✅ 有 | ⭐⭐ 高 | 无 |

---

### 三、DeleteWarningModal 重复组件（70+个）

#### 重复组详细列表

**组1: materialReceiving 目录**

| 文件路径 | 行数 | 差异 |
|---------|------|------|
| `modals/DeleteWarningModal.tsx` | 55 | 警告信息不同 |
| `modals/EditWarningModal.tsx` | 55 | 结构相同 |

**组2: materialReturn 目录**

| 文件路径 | 行数 | 差异 |
|---------|------|------|
| `modals/WarningModal.tsx` | 64 | 支持 type='edit'/'delete' |
| `modals/DeleteConfirmModal.tsx` | 50 | 结构相同 |

**组3: production 目录**

| 文件路径 | 行数 | 差异 |
|---------|------|------|
| `modals/DeleteWarningModal.tsx` | 59 | 警告信息与领料单类似 |
| `modals/VoidWarningModal.tsx` | 57 | 结构相同 |

**组4: farm/taskDispatch 目录**

| 文件路径 | 行数 | 差异 |
|---------|------|------|
| `modals/DeleteWarningModal.tsx` | 56 | 使用 Modal 组件 |

**组5: farm/harvest 目录**

| 文件路径 | 行数 | 差异 |
|---------|------|------|
| `modals/DeleteWarningModal.tsx` | 56 | 完全相同实现 |

**组6: warehouse 目录**

| 文件路径 | 行数 | 差异 |
|---------|------|------|
| `BatchDeleteConfirmDialog.tsx` | 53 | Dialog 命名不一致 |
| `DeleteWarningDialog.tsx` | 47 | Dialog 命名不一致 |

**组7: labor/personnel 目录**

| 文件路径 | 行数 | 差异 |
|---------|------|------|
| `modals/DeleteWarningModal.tsx` | 56 | 完全相同实现 |

**组8: labor/schedule 目录**

| 文件路径 | 行数 | 差异 |
|---------|------|------|
| `modals/DeleteWarningModal.tsx` | 59 | 结构相同 |

**其他重复（60+个）**:
```
labor/attendance/modals/DeleteWarningModal.tsx
labor/leave/modals/DeleteWarningModal.tsx
labor/overtime/modals/DeleteWarningModal.tsx
labor/salary/modals/DeleteWarningModal.tsx
labor/budget/modals/DeleteWarningModal.tsx
labor/efficiency/modals/DeleteWarningModal.tsx
labor/performance/modals/DeleteWarningModal.tsx
labor/recruitment/modals/DeleteWarningModal.tsx
labor/onboarding/modals/DeleteWarningModal.tsx
labor/tempWorker/modals/DeleteWarningModal.tsx
labor/worklog/modals/DeleteWarningModal.tsx
labor/skill/modals/DeleteWarningModal.tsx
labor/risk/modals/DeleteWarningModal.tsx
labor/position/modals/DeleteWarningModal.tsx
labor/piecework/modals/DeleteWarningModal.tsx
... (持续重复)
```

#### 重复组件标准代码模式

```typescript
// 几乎所有 DeleteWarningModal 都遵循此模式
export function DeleteWarningModal({ isOpen, onClose, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="删除XXX确认" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold">删除XXX确认</h3>
        </div>
        <p>确定要删除选中的记录吗？</p>
        <p>此操作 <strong className="text-red-600">无法恢复</strong></p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose}>取消</button>
          <button onClick={onConfirm}>确认删除</button>
        </div>
      </div>
    </Modal>
  );
}
```

#### 建议合并为通用组件

```typescript
// src/components/common/DeleteConfirmModal.tsx
interface DeleteConfirmModalProps {
  isOpen: boolean;
  /** 弹窗标题，默认"删除确认" */
  title?: string;
  /** 要删除的实体名称，默认"记录" */
  entityName?: string;
  /** 要删除的数量 */
  count?: number;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认删除回调 */
  onConfirm: () => void;
  /** 自定义警告信息 */
  warningMessage?: string;
}

export function DeleteConfirmModal({
  isOpen,
  title = '删除确认',
  entityName = '记录',
  count = 1,
  onClose,
  onConfirm,
  warningMessage,
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p>
          确定要删除选中的 <strong>{count}</strong> 条{entityName}吗？
        </p>
        {warningMessage && <p>{warningMessage}</p>}
        <p>此操作 <strong className="text-red-600">无法恢复</strong></p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={onConfirm} className="btn-danger">确认删除</button>
        </div>
      </div>
    </Modal>
  );
}
```

---

### 四、ExportFormatModal 重复组件（70+个）

#### 重复组件列表

| 文件路径 | 行数 | 外层包装 |
|---------|------|---------|
| `farm/harvest/modals/ExportFormatModal.tsx` | 68 | Modal |
| `materials/ExportFormatModal.tsx` | 70 | UnifiedModal |
| `labor/monthly/ExportFormatModal.tsx` | 97 | UnifiedModal |

#### 标准代码模式

```typescript
// 几乎所有 ExportFormatModal 都遵循此模式
export function ExportFormatModal({ isOpen, onClose, onExport }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="导出格式选择">
      <div className="space-y-4">
        <p>请选择导出格式：</p>
        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => onExport('csv')}>CSV</button>
          <button onClick={() => onExport('excel')}>Excel</button>
          <button onClick={() => onExport('word')}>Word</button>
        </div>
      </div>
    </Modal>
  );
}
```

#### 建议合并为通用组件

```typescript
// src/components/common/ExportFormatModal.tsx
interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'excel' | 'word' | 'pdf') => void;
  title?: string;
}

export function ExportFormatModal({
  isOpen,
  onClose,
  onExport,
  title = '导出格式选择',
}: ExportFormatModalProps) {
  const formats = [
    { id: 'csv', name: 'CSV', icon: FileText },
    { id: 'excel', name: 'Excel', icon: FileSpreadsheet },
    { id: 'word', name: 'Word', icon: FileText },
    { id: 'pdf', name: 'PDF', icon: File },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-gray-600">请选择导出格式：</p>
        <div className="grid grid-cols-2 gap-4">
          {formats.map(format => (
            <button
              key={format.id}
              onClick={() => onExport(format.id as any)}
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50"
            >
              <format.icon className="w-6 h-6" />
              <span>{format.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
```

---

### 五、表格组件详细列表

| 组件路径 | 行数 | Props类型 | 数据类型 | 问题 |
|---------|------|----------|---------|------|
| `labor/personnel/PersonnelTable.tsx` | 195 | ✅ 有 | Worker | 分页逻辑与 LaborTable 不同 |
| `materials/MaterialsTable.tsx` | 179 | ✅ 有 | 内联类型 | 表格列和样式硬编码 |
| `materialReceiving/stats/StatMaterialTable.tsx` | 116 | ❌ any | `any[]` | 使用 any 类型 |
| `labor/worklog/WorkLogTable.tsx` | 205 | ✅ 有 | WorkLog | 分页逻辑重复实现 |
| `labor/salary/SalaryTable.tsx` | 317 | ✅ 有 | Salary | 组件过于庞大 |
| `labor/attendance/WorkerAttendanceTable.tsx` | 320 | ✅ 有 | Attendance | 组件过于庞大 |
| `labor/schedule/ScheduleTable.tsx` | 460 | ✅ 有 | Schedule | 违反单一职责 |
| `farm/taskDispatch/components/TaskTable.tsx` | 306 | ✅ 有 | Task | 组件庞大 |
| `dispatch/components/dispatch/FarmTaskTable.tsx` | 242 | ✅ 有 | FarmTask | 与 SmartTaskTable 类似 |
| `dispatch/components/dispatch/SmartTaskTable.tsx` | 200 | ✅ 有 | SmartTask | 与 FarmTaskTable 类似 |

#### StatMaterialTable 问题详解

```typescript
// src/components/materialReceiving/stats/StatMaterialTable.tsx
// 问题：使用 any[] 类型
interface Props {
  data: any[];  // ❌ 应该是具体类型
  onSort?: (key: string) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
}

// 建议修复
interface MaterialStat {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  change: number;
}

interface Props {
  data: MaterialStat[];
  onSort?: (key: keyof MaterialStat) => void;
  sortKey?: keyof MaterialStat;
  sortOrder?: 'asc' | 'desc';
}
```

---

### 六、表单弹窗组件

| 组件路径 | 行数 | 问题 |
|---------|------|------|
| `labor/personnel/PersonnelFormModal.tsx` | 462 | 组件过于庞大 |
| `labor/contract/ContractFormModal.tsx` | 199 | 无 |
| `labor/tasks/TaskFormModal.tsx` | 198 | 无 |
| `labor/leave/LeaveFormModal.tsx` | ~250 | 无 |
| `labor/overtime/OvertimeFormModal.tsx` | ~200 | 无 |
| `labor/salary/SalaryFormModal.tsx` | ~300 | 无 |

---

### 七、Filter筛选组件

| 组件路径 | 行数 | 问题 |
|---------|------|------|
| `warehouse/MaterialFilters.tsx` | 222 | 与 MaterialsFilters 功能重叠 |
| `materials/MaterialsFilters.tsx` | 232 | Props 过多 (10+ 个) |
| `production/ProductionFilters.tsx` | 122 | 无 |
| `cost/CostFiltersForm.tsx` | 241 | MultiSelectDropdown 未单独导出 |

#### CostFiltersForm 问题详解

```typescript
// 问题1: 硬编码筛选选项
const DEPARTMENTS = ['生产部', '种植部', '设备部', '采购部', '仓储部'];
const CATEGORIES = ['化肥', '农药', '种子', '工具'];
const WAREHOUSES = ['A区', 'B区', 'C区'];

// 问题2: MultiSelectDropdown 未单独导出
// 应该抽出为独立的通用组件
```

---

### 八、卡片组件

| 组件路径 | 行数 | 可复用性 |
|---------|------|---------|
| `production/ProductionStatsCards.tsx` | 57 | 低（业务特定） |
| `summary/StatCards.tsx` | 33 | 高（通用设计） |
| `materialReceiving/stats/StatCards.tsx` | ~80 | 中 |
| `dashboard/cards/StatCard.tsx` | ~60 | 中 |

---

## 📑 第三部分：重复代码详细清单

---

### 1. categoryConfig 重复（4处）

| 位置 | 行数 | 状态 |
|------|------|------|
| `src/data/materialReceivingData.ts` | ~150 | 需合并 |
| `src/components/materials/mockData.ts` (行36-259) | ~220 | 需合并 |
| `src/components/warehouseMaterials_old/mockData.ts` (行106-258) | ~150 | 需删除 |
| `src/pages/warehouse/WarehouseInboundPage.tsx` (行14-165) | ~150 | 需合并 |

**建议**: 提取到 `src/data/categoryConfig.ts`

---

### 2. initialInboundRecords 重复（2处）

| 位置 | 行数 | 数据条数 |
|------|------|---------|
| `src/pages/warehouse/WarehouseInboundPage.tsx` (行177-321) | ~145 | 12条 |
| `src/components/warehouse/WarehouseMaterialsPage.tsx` (行196-340) | ~145 | 12条 |

**建议**: 提取到 `src/data/mockData.ts`

---

### 3. generateSequentialOrderCode 重复（2处）

| 位置 | 行号 |
|------|------|
| `src/pages/warehouse/WarehouseInboundPage.tsx` | 492-512 |
| `src/components/warehouse/WarehouseMaterialsPage.tsx` | 564-585 |

**建议**: 提取到 `src/utils/codeGenerator.ts`

---

### 4. getCategoryByCode 重复（4处）

| 位置 |
|------|
| `src/data/materialReceivingData.ts` |
| `src/components/materials/mockData.ts` |
| `src/components/warehouseMaterials_old/mockData.ts` |
| `src/config/taskConfig.ts` |

**建议**: 提取到 `src/utils/categoryUtils.ts`

---

## 📑 第四部分：硬编码数据清单

---

### 页面级硬编码

| 页面 | 硬编码数据 | 行数 |
|------|----------|------|
| Indicators.tsx | `indicators`, `evaluationData`, `analyzeData`, `categorySummary`, `categories` | ~80 |
| Materials.tsx | `warehouseMaterials`, `inboundRecords`, `categoryConfig` | ~200 |
| CodeRule.tsx | `initialCategories` | ~150 |
| Announcement.tsx | `notices`, `templates`, `approvalWorkflows` | ~60 |
| WorkOrders.tsx | `workOrders` | ~30 |
| WarehouseInboundPage.tsx | `initialInboundRecords`, `categoryConfig` | ~180 |
| WarehouseOverviewPage.tsx | `warehouseMaterials`, `categoryConfig` | ~180 |
| HomePage.tsx | `modules` 数组中的用户信息 | ~50 |

### 配置级硬编码

| 文件 | 硬编码内容 |
|------|----------|
| `src/config/taskConfig.ts` | `OPERATORS`, `REVIEWERS` (武侠人物) |
| `src/components/labor/tempWorker/mockData.ts` | 武侠人物名称 |
| `src/components/materialReturn/config.ts` | `DEPARTMENTS`, `APPLICANTS` |

---

## 📑 第五部分：安全问题清单

---

### 1. XSS 漏洞

| 位置 | 问题 |
|------|------|
| `src/components/summary/useExport.ts:61-79` | HTML 未转义 |

### 2. 登录验证缺失

| 位置 | 问题 |
|------|------|
| `src/pages/Login.tsx:12-18` | 无实际验证逻辑 |

### 3. 依赖包漏洞

| 包名 | 漏洞 |
|------|------|
| xlsx | Prototype Pollution, ReDoS |

### 4. 硬编码敏感信息

| 位置 | 信息 |
|------|------|
| 多处 | 默认用户名 `陆启闯` |

---

## 📑 第六部分：优化建议优先级

---

### P0 - 立即修复

| 问题 | 影响 | 修复方案 |
|------|------|---------|
| inspectionFeedbackMockData.ts 语法错误 | 编译失败 | `imp ort` → `import` |
| Login.tsx 登录验证缺失 | 安全风险 | 添加验证逻辑 |
| useExport.ts XSS 漏洞 | 安全风险 | HTML 转义 |

### P1 - 本周修复

| 问题 | 影响 | 修复方案 |
|------|------|---------|
| 70+ DeleteWarningModal 重复 | 维护成本 | 创建通用组件 |
| 70+ ExportFormatModal 重复 | 维护成本 | 创建通用组件 |
| categoryConfig 4处重复 | 数据不一致 | 提取到共享文件 |
| 超大组件拆分 | 可维护性 | 按功能拆分 |

### P2 - 本月修复

| 问题 | 影响 | 修复方案 |
|------|------|---------|
| 页面硬编码数据 | 可维护性 | 提取到 mockData |
| useState 过多 | 可维护性 | useReducer 合并 |
| 性能优化 | 运行效率 | useMemo/useCallback |

### P3 - 长期规划

| 问题 | 影响 | 修复方案 |
|------|------|---------|
| 类型安全加固 | 代码质量 | 消除 any |
| 设计系统建立 | 开发效率 | 统一组件库 |
| 测试覆盖 | 代码质量 | 添加单元测试 |

---

## 📑 第七部分：文件索引

---

### 需立即修复的文件

| 文件路径 | 问题 |
|----------|------|
| `src/data/inspectionFeedbackMockData.ts` | 语法错误 |
| `src/pages/Login.tsx` | 安全漏洞 |
| `src/components/summary/useExport.ts` | XSS 漏洞 |

### 超大组件（需拆分）

| 文件路径 | 行数 | 建议拆分数 |
|----------|------|----------|
| `src/pages/MaterialReceiving.tsx` | 4169 | 8-10个 |
| `src/components/farm/taskDispatch/TaskDispatchPage.tsx` | 3753 | 10-12个 |
| `src/pages/Dashboard.tsx` | 1714 | 5-6个 |
| `src/pages/SupplierManagement.tsx` | 1646 | 4-6个 |
| `src/components/labor/myTasks/MyTasksPage.tsx` | 2100 | 4-6个 |
| `src/components/purchasePlan/PurchasePlanPage.tsx` | 1942 | 4-5个 |
| `src/pages/Materials.tsx` | 1176 | 3-4个 |
| `src/pages/Indicators.tsx` | 926 | 3-4个 |
| `src/pages/Announcement.tsx` | 886 | 3-4个 |
| `src/pages/CodeRule.tsx` | 891 | 3-4个 |

### 硬编码数据文件

| 文件路径 | 硬编码类型 |
|----------|----------|
| `src/pages/Indicators.tsx` | 指标数据 |
| `src/pages/Materials.tsx` | 物料数据 |
| `src/pages/CodeRule.tsx` | 分类配置 |
| `src/pages/Announcement.tsx` | 公告数据 |
| `src/pages/WorkOrders.tsx` | 工单数据 |
| `src/config/taskConfig.ts` | 武侠人物 |
| `src/components/materialReturn/config.ts` | 部门/人员 |

---

**报告生成时间**: 2026-04-20
**审查代理**: TypeScript Reviewer, Security Reviewer, Code Reviewer, Architecture Explorer, Component Explorer
**报告位置**: `public/CODE_REVIEW_FULL_REPORT_20260420.md`
