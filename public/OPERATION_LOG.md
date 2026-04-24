# 项目操作记录日志

> 本文件用于记录所有对项目的修改操作，便于回滚和恢复。
> 每次修改后请在此文件末尾追加记录。

---

## 操作记录

### 2026-03-23 | 操作1：任务派发页面日历视图改造

**文件：** `src/pages/TaskDispatch.tsx`

**修改内容：**
1. 添加日历视图模式切换（列表/日/周/月）
2. 实现 DayView、WeekView、MonthView 三个日历组件
3. 修复"无法从日历视图切换回列表视图"的bug（将切换按钮移出条件渲染块）
4. 修复"日历无数据显示"的bug（将mock数据日期从2024-03改为2026-03）

**备份说明：** 原 `TaskDispatch.tsx` 已被覆盖，建议使用git管理版本

---

### 2026-03-23 | 操作2：新建任务弹窗优化

**文件：** `src/pages/TaskDispatch.tsx`

**修改内容：**

#### Step 1 任务定义页面
- 任务类型选择"其他"时，显示"类型备注"输入框
- 作物选择"其他"时，显示"作物备注"输入框

```typescript
// newTask state 新增字段
typeRemarks: '',   // Other task remarks
cropRemarks: '',   // Other crop remarks
```

#### Step 2 资源与人员页面
- "所需物资"改为"所需物资和工具"
- 添加"工具"列表区域
- 物资和工具改为可编辑输入框（名称、数量、单位下拉选择、删除按钮）
- 点击"+ 物资"或"+ 工具"按钮时创建空项目

```typescript
// newTask state 新增字段
tools: [] as { name: string; qty: number; unit: string }[],
```

#### Step 3 时间与要求页面
- 添加"工作制"选择（8小时/天、10小时/天）
- 添加任务截止时间自动计算
- 工作制放在最前面
- 小时数最大值为 workHoursPerDay - 1

```typescript
// newTask state 新增字段
workHoursPerDay: 8,
estimatedDays: 0,
estimatedHours: 1,

// 新增辅助函数
calculateEndDateTime()
```

---

### 2026-03-23 | 操作3：物资和工具可编辑输入模式

**文件：** `src/pages/TaskDispatch.tsx`

**修改内容：**
- 物资名称：`<span>` 改为 `<input type="text">`，可自由输入
- 工具名称：`<span>` 改为 `<input type="text">`，可自由输入
- 单位：改为下拉选择框（个/kg/把/台/套/件）
- 新增删除按钮（×），可删除对应项
- "+ 物资"按钮创建空对象：`{ name: '', qty: 1, unit: '个' }`

---

### 2026-03-23 | 操作4：农事任务表表格列更新及添加滑块

**文件：** `src/pages/Tasks.tsx`

**修改内容：**

#### 1. 表格列扩展（从7列扩展到18列）
更新后的表格列：
| 序号 | 列名 | 数据来源 |
|------|------|----------|
| 1 | 任务编号 | `taskCode` |
| 2 | 任务标题 | `title` |
| 3 | 任务类型 | `typeName` |
| 4 | 类型备注 | `typeRemarks` |
| 5 | 作业区域 | `greenhouseName` |
| 6 | 作物 | `crop` |
| 7 | 作物备注 | `cropRemarks` |
| 8 | 执行人 | `assigneeName` |
| 9 | 计划开始 | `planStart` |
| 10 | 计划结束 | `dueDate` |
| 11 | 预计天数 | `estimatedDays` |
| 12 | 预计小时 | `estimatedHours` |
| 13 | 工作制 | `workHoursPerDay` |
| 14 | 优先级 | `priority` |
| 15 | 状态 | `status` |
| 16 | 所需物资 | `materials` |
| 17 | 所需工具 | `tools` |
| 18 | 操作 | - |

#### 2. 添加横向和纵向滑块
- 表格外层容器添加 `overflow-x-auto`（横向滚动）
- 表格外层容器添加 `overflow-y-auto`（纵向滚动）
- 设置表格最大高度 `max-h-[65vh]` 启用纵向滚动
- 表头设置 `sticky top-0` 固定在顶部
- 设置表格最小宽度 `min-w-[1400px]` 确保内容不压缩

---

## 回滚指南

### 如果需要回滚到修改前

1. **使用 Git（推荐）：**
   ```bash
   git log
   git checkout <commit-hash> -- src/pages/TaskDispatch.tsx
   ```

2. **手动恢复：**
   - 恢复 `TaskDispatch.tsx` 到修改前状态
   - 确保 `newTask` state 包含以下字段：
     - `typeRemarks`
     - `cropRemarks`
     - `tools`
     - `workHoursPerDay`
     - `estimatedDays`
     - `estimatedHours`

### 恢复步骤

1. 删除修改后的 `TaskDispatch.tsx`
2. 从 git 恢复：`git restore src/pages/TaskDispatch.tsx`
3. 或手动根据本文件记录还原代码

---

## 关键代码片段

### newTask 初始 state（修改后）
```typescript
const [newTask, setNewTask] = useState({
  taskId: '',
  types: [] as string[],
  typeRemarks: '',
  field: '',
  crop: '',
  cropRemarks: '',
  areaRemarks: '',
  assignee: '',
  planStart: '',
  planEnd: '',
  sopContent: '',
  materials: [] as { name: string; qty: number; unit: string }[],
  tools: [] as { name: string; qty: number; unit: string }[],
  requiredFeedback: [] as string[],
  priority: 'normal',
  estimatedDays: 0,
  estimatedHours: 1,
  workHoursPerDay: 8,
});
```

### calculateEndDateTime 函数
```typescript
const calculateEndDateTime = (startTime: string, days: number, hours: number, workHoursPerDay: number): string => {
  if (!startTime) return '';
  const start = new Date(startTime.replace(' ', 'T'));
  const totalHours = days * workHoursPerDay + hours;
  if (totalHours === 0) return startTime;
  const totalDays = Math.ceil(totalHours / workHoursPerDay);
  const end = new Date(start);
  end.setDate(end.getDate() + totalDays);
  return end.toISOString().slice(0, 16).replace('T', ' ');
};
```

---

## 备注

- 所有修改均在 `TaskDispatch.tsx` 文件中
- 建议使用 Git 进行版本控制，便于回滚
- 如需完整备份，可在操作前复制整个项目文件夹

---

### 2026-03-24 | 操作5：删除"每日工单汇总"菜单及页面

**文件：**
- `src/App.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/pages/DailyWorkSummary.tsx`

**删除内容：**
1. `App.tsx` 第30行：移除 `import DailyWorkSummary from './pages/DailyWorkSummary';`
2. `App.tsx` 第86行：移除路由 `<Route path="/daily-work-summary" element={<DailyWorkSummary />} />`
3. `Sidebar.tsx` laborSubItems：移除 `{ icon: Calendar, label: '每日工单汇总', path: '/daily-work-summary' }`
4. `Sidebar.tsx` summarySubItems：移除 `{ icon: Calendar, label: '每日工单汇总表', path: '/daily-work-summary' }`
5. 删除整个页面文件 `src/pages/DailyWorkSummary.tsx`

**回滚方式：**
- 从 Git 恢复：`git checkout <commit-hash> -- src/`
- 或手动还原上述删除的内容

---

### 2026-03-26 | 操作6：修改右上角登录人员信息

**文件：** `src/components/layout/Header.tsx`

**修改内容：**
1. 第124行：头像缩写 `LMH` → `LQC`
2. 第126行：用户名 `李明辉` → `陆启闯`
3. 第134行：下拉菜单姓名 `李明辉` → `陆启闯`
4. 第135行：下拉菜单信息 `基地经理 · 生产部` → `经理 · 生产部 · 宁波帮帮忙公司`

**回滚方式：**
- 手动还原上述4处修改

---

### 2026-03-26 | 操作7：创建个人中心页面（支持6种角色）

**文件：**
- `src/pages/Profile.tsx`（新建）
- `src/App.tsx`
- `src/data/mockData.ts`

**新增内容：**
1. `Profile.tsx`：通用个人中心页面，支持6种角色动态适配
   - admin（系统管理员）
   - manager（经理/主管）
   - supervisor（生产主管）
   - technician（技术员）
   - worker（普通员工）
   - visitor（访客/演示人员）

2. `mockData.ts`：新增访客用户 V001（FK）

3. `App.tsx`：添加 `/profile` 路由

**功能模块：**
- 基本信息卡片：头像、姓名、工号、部门、职位
- 账户安全卡片：修改密码、手机绑定、双重验证（访客除外）
- 角色专属统计卡片：根据角色显示不同指标
- 快捷操作入口：根据角色显示不同操作
- 通知与消息：系统通知、任务提醒、预警信息、审批动态
- 访客专属：欢迎横幅、演示说明提示

**回滚方式：**
- 删除 `src/pages/Profile.tsx`
- 还原 `App.tsx` 移除的路由和import
- 还原 `mockData.ts` 移除的用户和 currentUser 定义

---

### 2026-03-26 | 操作8：个人中心添加身份切换器（完整权限体系）

**文件：** `src/pages/Profile.tsx`

**升级内容：**
1. 添加 `roleUsers` 映射 - 6种角色的用户信息
2. 添加 `rolePermissions` 配置 - 完整的角色权限体系
3. 添加 `notificationConfig` - 各角色可见通知
4. 添加身份切换器UI - 页面顶部选择框+头像+角色标签
5. 基于权限的动态渲染 - 根据角色显示不同内容

**角色权限对照：**

| 角色 | 数据范围 | 基本信息 | 账户安全 | 通知 |
|------|----------|----------|----------|------|
| admin | 全部数据 | 完整编辑 | 全部功能 | 4类全部 |
| manager | 全部只读 | 部分编辑 | 密码+手机 | 4类全部 |
| supervisor | 本部门 | 部分编辑 | 密码+手机 | 4类本部门 |
| technician | 负责模块 | 部分只读 | 密码+手机 | 3类技术 |
| worker | 仅自己 | 仅查看 | 仅密码 | 3类个人 |
| visitor | 公开信息 | 仅头像 | 禁用 | 无权查看 |

**统计指标差异：**
- admin: 系统用户、在线用户、操作日志、数据备份
- manager: 基地总数、种植批次、待处理任务、本月完成
- supervisor: 本部门员工、待处理任务、进行中、考勤异常
- technician: 待执行任务、农事记录、环境预警、负责区域
- worker: 我的任务、已打卡、物料领用、完成率
- visitor: 演示大棚、演示作物、演示任务、数据节点

**回滚方式：**
- 还原 `Profile.tsx` 到上一版本

---

### 2026-03-26 | 操作9：管理员/高管/部门经理添加园区导览和基地总览入口

**文件：** `src/pages/Profile.tsx`

**修改内容：**
为 admin、manager、supervisor 三个角色的快捷操作添加"园区导览"和"基地总览"入口：

- admin: 园区导览、基地总览、用户管理、系统设置
- manager: 园区导览、基地总览、任务派发、审批中心
- supervisor: 园区导览、基地总览、任务派发、考勤审核

**回滚方式：**
- 还原 quickActions 配置

---

## ============================================
## 系统状态快照 V1.0（2026-03-26）
## 大结构调整前的稳定版本
## ============================================

### 快照时间
2026-03-26

### 关键文件状态

#### 1. src/pages/Profile.tsx
- 功能：个人中心页面，支持6种角色身份切换
- 角色：admin, manager, supervisor, technician, worker, visitor
- 快捷操作配置：
  - admin: 园区导览(/park-archive)、基地总览(/)、用户管理(/settings/personnel)、系统设置(/settings)
  - manager: 园区导览(/park-archive)、基地总览(/)、任务派发(/task-dispatch)、审批中心(/pending-approval)
  - supervisor: 园区导览(/park-archive)、基地总览(/)、任务派发(/task-dispatch)、考勤审核(/settings/personnel/attendance)
  - technician: 农事记录(/agriculture-record)、环境监测(/environment-monitor)、任务反馈(/tasks)、巡田记录(/inspection)
  - worker: 我的任务(/tasks)、考勤打卡(/worker-attendance)、物料领用(/material-receiving)、任务反馈(/tasks)
  - visitor: 园区导览(/park-archive)、环境监测(/environment-monitor)、生产概览(/production)、溯源查询(/traceability)

#### 2. src/App.tsx
- 路由：包含 /profile 路由指向 Profile.tsx
- 导入：Profile 已导入

#### 3. src/data/mockData.ts
- 用户列表：U001-U012 + V001(访客)
- currentUser：users[users.length - 1] 即 V001(访客)

#### 4. src/components/layout/Header.tsx
- 右上角用户：陆启闯(LQC)，职位：经理，部门：生产部，公司：宁波帮帮忙公司
- 头像：LQC
- 个人中心链接：/profile

#### 5. src/components/layout/Sidebar.tsx
- 菜单结构：园区导览、基地总览、管理指标、生产计划、农事管理、库存管理、人工管理、生产汇总表、审批中心、消息中心、系统设置、其他项目
- 子菜单完整配置

### 回滚命令（如需恢复到此版本）
```bash
# 恢复所有关键文件
git checkout <此版本的commit-hash> -- src/

# 或手动还原各文件
```

### 此版本之后的新操作
（后续所有操作记录追加于此）

---

### 2026-03-26 | 操作10：添加登录页面和主页面（大结构调整）

**文件：**
- `src/pages/Login.tsx`（新建）
- `src/pages/HomePage.tsx`（新建）
- `src/App.tsx`（修改）

**新增内容：**

#### 1. Login.tsx - 登录页面
- 从 V1.02 复制的登录页面
- 左侧：农业背景图 + 弘智耘LOGO
- 右侧：账号密码登录表单
- 功能：输入用户名密码登录，存储登录状态到 localStorage

#### 2. HomePage.tsx - 主页面
- 从 V1.02 复制的主页面
- 顶部导航栏：Logo + 系统名称 + 登录/用户菜单
- 欢迎横幅：弘讯智能种植云平台介绍
- 8个系统模块入口卡片：
  - 智能环境监测系统（敬请期待）
  - 智能控制系统（敬请期待）
  - **种植管理系统**（可点击进入 /production）
  - 产品溯源系统（敬请期待）
  - 数据分析系统（敬请期待）
  - 专家/AI诊断系统（敬请期待）
  - 经营与成本核算系统（敬请期待）
  - 市场与销售协同系统（敬请期待）
- 用户登录后显示：用户信息下拉菜单（个人中心、系统设置、退出登录）
- 用户未登录显示：登录按钮

#### 3. App.tsx - 路由修改
- import 新增：HomePage, Login
- 默认路由 `/` → HomePage
- 新增路由 `/login` → Login
- 其他路由保持不变

**交互逻辑：**
1. 访问 `/` → 显示主页面
2. 点击右上角"登录" → 进入 `/login` 登录页面
3. 输入账号密码登录 → localStorage 存储登录状态 → 返回主页
4. 点击主页"种植管理系统"卡片 → 进入 `/production`
5. 登录后右上角显示用户名 → 点击显示下拉菜单

**回滚方式：**
- 删除 `src/pages/Login.tsx`
- 删除 `src/pages/HomePage.tsx`
- 还原 `App.tsx` 的 import 和路由配置

---

### 2026-03-26 | 操作11：修复主页和登录页显示侧边栏的问题

**文件：** `src/App.tsx`

**问题描述：**
主页和登录页显示了左侧菜单栏，但它们应该是独立的全屏页面，不带侧边栏。

**修复方案：**
参考 V1.02 的架构，重构 App.tsx：
- 新增 `MainLayout` 组件（带侧边栏的布局）
- 新增 `AppContent` 组件处理路由逻辑
- 主页 `/` 和登录页 `/login` 独立渲染，不使用 MainLayout
- 其他页面使用 MainLayout

**关键代码：**
```tsx
function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';

  if (isHomePage) {
    return <HomePage />;
  }

  if (isLoginPage) {
    return <Login />;
  }

  return (
    <MainLayout>
      <Routes>
        {/* 其他路由... */}
      </Routes>
    </MainLayout>
  );
}
```

**回滚方式：**
- 还原 `App.tsx` 到之前的版本

---

### 2026-03-26 | 操作12：统一登录用户信息为"陆启闯"

**文件：**
- `src/pages/HomePage.tsx`
- `src/pages/Login.tsx`

**修改内容：**
1. HomePage.tsx：
   - 头像从 "A" 改为 "LQC"
   - 职位从"系统管理员"改为"经理"
2. Login.tsx：
   - 默认用户名从 "admin" 改为 "陆启闯"

**回滚方式：**
- 还原上述文件的修改

---


