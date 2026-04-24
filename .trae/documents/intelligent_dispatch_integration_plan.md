# 智能派工与三大任务派发系统整合方案

## 一、现状分析

### 1.1 现有系统架构

#### 智能派工建议页面 (SmartDispatchPage)
- **位置**: `src/components/labor/dispatch/SmartDispatchPage.tsx`
- **功能**: 三栏布局（待派工任务 → 智能推荐 → 任务详情）
- **算法**: 5因子加权评分（技能匹配30% + 地理位置25% + 当前负荷20% + 历史表现15% + 紧急程度10%）
- **数据结构**: `DispatchTask`、`WorkerMatch`、`DispatchRecommendation`
- **当前限制**: 
  - 使用硬编码 mock 数据（`mockDispatchTasks`、`mockWorkers`）
  - 仅提供推荐，无实际派发功能
  - 未与三个任务派发系统建立数据连接

#### 农事任务派发 (TasksPage)
- **位置**: `src/components/labor/tasks/TasksPage.tsx`
- **功能**: 任务CRUD、筛选、批量操作、导出
- **数据源**: `useTasks` hook（localStorage持久化）
- **派发方式**: 手动创建任务 → 选择执行人 → 派发

#### 临时任务派发 (TempTaskPage)
- **位置**: `src/components/labor/tempTask/TempTaskPage.tsx`
- **功能**: 临时任务全生命周期管理、状态流转、数据闭环同步
- **数据源**: `useTempTasks` + `useTasks` + `useOperationRecords`
- **派发方式**: 手动创建 → 选择执行人 → 派发 → 审核

#### 巡查反馈任务派发 (ProblemDispatchPage)
- **位置**: `src/components/farm/problemDispatch/ProblemDispatchPage.tsx`
- **数据流**: 巡查反馈 → 问题分派中心 → 创建关联任务 → 我的任务
- **功能**: 问题分派、批量分派、关联任务追踪
- **派发方式**: 选择问题 → 选择执行人 → 设置优先级/截止日期/必填反馈 → 分派

### 1.2 推荐算法基础

已有统一推荐算法位于 `src/components/dispatch/utils/recommendAlgorithm.ts`：
- `calculateFarmRecommend`: 农事任务3因子（工作量50% + 技能匹配30% + 地理位置20%）
- `calculateSmartRecommend`: 智能派工5因子（技能匹配30% + 地理位置25% + 当前负荷20% + 历史表现15% + 紧急程度10%）
- `getUnifiedRecommendations`: 统一入口，支持 farm/smart 两种模式

---

## 二、整合目标

### 2.1 核心目标
将智能派工的推荐算法深度整合到三个任务派发系统中，实现：
1. **AI辅助派发**: 在创建/分派任务时自动推荐最佳执行人
2. **自动派发**: 基于置信度阈值，实现完全自动化的任务派发
3. **统一推荐引擎**: 三个任务系统共享同一推荐算法和权重配置
4. **实时监控**: 持续监控工人负荷、任务进度，动态调整推荐

### 2.2 业务流程设计

```
┌─────────────────────────────────────────────────────────────┐
│                    任务来源层                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │生产计划  │    │临时需求  │    │巡查反馈  │               │
│  │(农事任务) │    │(临时任务) │    │(问题分派) │               │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘               │
└───────┼───────────────┼───────────────┼─────────────────────┘
        │               │               │
        ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                   智能派工引擎层                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  任务队列收集器                                       │   │
│  │  - 从生产计划解析待执行农事任务                        │   │
│  │  - 从临时需求收集待派发任务                          │   │
│  │  - 从问题分派收集待处理问题                          │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │  推荐算法引擎 (5因子加权)                              │   │
│  │  - 技能匹配度 (30%)                                   │   │
│  │  - 地理位置 (25%)                                     │   │
│  │  - 当前负荷 (20%)                                     │   │
│  │  - 历史表现 (15%)                                     │   │
│  │  - 紧急程度 (10%)                                     │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │  自动派发决策器                                       │   │
│  │  - 置信度 >= 90%: 自动派发                            │   │
│  │  - 置信度 70-89%: AI推荐 + 人工确认                   │   │
│  │  - 置信度 < 70%: 仅显示推荐，人工决定                 │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   任务派发执行层                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │农事任务  │◄───┤智能派工  │───►│临时任务  │               │
│  │派发页面  │    │建议面板  │    │派发页面  │               │
│  └──────────┘    └──────────┘    └──────────┘               │
│         ▲                          ▲                        │
│         │                          │                        │
│    ┌────┴─────┐              ┌─────┴─────┐                  │
│    │问题分派  │              │任务中心   │                  │
│    │中心      │              │我的任务   │                  │
│    └──────────┘              └───────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、详细设计方案

### 3.1 数据结构扩展

#### 3.1.1 统一任务接口 (UnifiedDispatchTask)

```typescript
// src/components/labor/dispatch/types.ts

// 任务来源类型
export type TaskSourceType = 'farm' | 'temp' | 'problem';

// 统一派工任务（扩展现有DispatchTask）
export interface UnifiedDispatchTask extends DispatchTask {
  sourceType: TaskSourceType;
  originalTaskId: string;      // 原始任务ID（农事/临时/问题）
  problemId?: number;          // 关联问题ID（仅problem类型）
  tempTaskId?: string;         // 关联临时任务ID（仅temp类型）
  farmTaskId?: string;         // 关联农事任务ID（仅farm类型）
  autoDispatchEligible: boolean; // 是否可自动派发
  confidenceScore?: number;    // 派发置信度
  requiredSkills: SkillTag[];
  estimatedHours: number;
  createdAt: string;
  scheduledDate?: string;      // 计划执行日期
}

// 自动派发配置
export interface AutoDispatchConfig {
  enabled: boolean;
  confidenceThreshold: number;   // 自动派发置信度阈值（默认90）
  recommendThreshold: number;    // 推荐显示阈值（默认70）
  maxTasksPerWorker: number;     // 单人最大任务数
  timeWindow: number;            // 时间窗口（小时）
  notifyOnAutoDispatch: boolean; // 自动派发后是否通知
}

// 工人实时状态
export interface WorkerRealTimeStatus {
  id: string;
  name: string;
  currentLoad: number;           // 实时负荷
  activeTasks: number;           // 进行中任务数
  todayCompletedTasks: number;   // 今日完成任务数
  currentWorkZone: string;       // 当前位置
  skills: SkillTag[];            // 技能列表
  recentPerformance: number;     // 近期表现
  availability: 'available' | 'busy' | 'offline'; // 可用状态
  lastActiveTime: string;        // 最后活跃时间
}

// 推荐结果（扩展）
export interface SmartRecommendResult {
  taskId: string;
  taskName: string;
  sourceType: TaskSourceType;
  recommendations: WorkerMatch[];
  topWorker: WorkerMatch | null;
  confidenceScore: number;       // 最高匹配度的置信度
  dispatchMode: 'auto' | 'recommend' | 'manual'; // 派发模式
  generatedAt: string;
}
```

#### 3.1.2 自动派发日志

```typescript
export interface AutoDispatchLog {
  id: string;
  taskId: string;
  taskName: string;
  sourceType: TaskSourceType;
  assignedWorkerId: string;
  assignedWorkerName: string;
  confidenceScore: number;
  dispatchMode: 'auto' | 'manual_confirm' | 'manual';
  timestamp: string;
  reasons: string[];
}
```

### 3.2 核心组件设计

#### 3.2.1 智能派工引擎 Hook (useSmartDispatchEngine)

```typescript
// src/components/labor/dispatch/hooks/useSmartDispatchEngine.ts

/**
 * 智能派工引擎核心Hook
 * 职责：
 * 1. 聚合三个任务系统的待派发任务
 * 2. 实时获取工人状态
 * 3. 运行推荐算法
 * 4. 执行自动派发决策
 * 5. 记录派发日志
 */
export function useSmartDispatchEngine(config: AutoDispatchConfig) {
  // 状态管理
  const [pendingTasks, setPendingTasks] = useState<UnifiedDispatchTask[]>([]);
  const [workerStatuses, setWorkerStatuses] = useState<WorkerRealTimeStatus[]>([]);
  const [recommendResults, setRecommendResults] = useState<SmartRecommendResult[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<AutoDispatchLog[]>([]);
  
  // 核心方法
  const collectPendingTasks = () => { /* 从三个系统收集待派发任务 */ };
  const calculateWorkerLoad = () => { /* 计算工人实时负荷 */ };
  const runRecommendation = (task: UnifiedDispatchTask) => { /* 运行推荐算法 */ };
  const makeDispatchDecision = (result: SmartRecommendResult) => { /* 决策：自动/推荐/手动 */ };
  const executeAutoDispatch = (task: UnifiedDispatchTask, worker: WorkerMatch) => { /* 执行自动派发 */ };
  const generateRecommendPanel = () => { /* 生成推荐面板数据 */ };
  
  return {
    pendingTasks,
    workerStatuses,
    recommendResults,
    dispatchLogs,
    runEngine,           // 手动触发引擎
    startAutoMonitoring, // 启动自动监控
    stopAutoMonitoring,  // 停止自动监控
  };
}
```

#### 3.2.2 智能推荐面板组件 (SmartRecommendPanel)

可嵌入到三个任务派发页面的通用组件：

```typescript
// src/components/labor/dispatch/SmartRecommendPanel.tsx

interface SmartRecommendPanelProps {
  task: Task | TempTask | ProblemEntry;  // 当前任务
  sourceType: TaskSourceType;
  onAutoDispatch: (taskId: string, workerId: string) => void;
  onManualConfirm: (taskId: string, workerId: string) => void;
  config: AutoDispatchConfig;
}

/**
 * 智能推荐面板
 * 功能：
 * - 显示AI推荐的前3名工人
 * - 显示匹配分数和推荐理由
 * - 提供"一键派发"按钮（自动模式）
 * - 提供"确认派发"按钮（推荐模式）
 * - 显示自动派发状态指示器
 */
```

#### 3.2.3 自动派发控制台 (AutoDispatchConsole)

全局控制台，管理者可以：
- 查看自动派发实时状态
- 调整置信度阈值
- 查看/撤销自动派发记录
- 设置派发规则（如：某人最大任务数、特定区域偏好等）

```typescript
// src/components/labor/dispatch/AutoDispatchConsole.tsx
```

### 3.3 三个任务系统的整合点

#### 3.3.1 农事任务派发整合

**文件**: `src/components/labor/tasks/TasksPage.tsx`

**修改点**:
1. 在 `TaskFormModal` 中增加"AI推荐执行人"按钮
2. 点击后调用 `useSmartDispatchEngine.runRecommendation()`
3. 在执行人选择区域显示推荐列表（带分数和理由）
4. 高置信度任务提供"AI自动派发"开关
5. 批量创建任务时，支持"AI批量派发"功能

**UI变更**:
```
┌─────────────────────────────────────────┐
│ 创建农事任务                             │
├─────────────────────────────────────────┤
│ ... (原有表单字段)                       │
│                                         │
│ 执行人: [选择执行人 ▼]  [🤖 AI推荐]     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🤖 AI推荐结果                       │ │
│ │                                     │ │
│ │ ✅ 萧峰 (92分) - 技能匹配度95%      │ │
│ │    距离近(0.5km), 当前负荷低(60%)   │ │
│ │                                     │ │
│ │    虚竹 (78分) - 技能匹配度80%      │ │
│ │    距离远(3.5km), 近期表现优秀(88)  │ │
│ │                                     │ │
│ │    袁承志 (71分) - 技能匹配度60%    │ │
│ │    距离近(0.8km), 当前负荷高(70%)   │ │
│ │                                     │ │
│ │ [✓ 启用自动派发] [手动选择]         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### 3.3.2 临时任务派发整合

**文件**: `src/components/labor/tempTask/TempTaskPage.tsx`

**修改点**:
1. 在 `TempTaskFormModal` 中嵌入智能推荐面板
2. 临时任务通常更紧急，降低推荐阈值至65分
3. 支持"紧急模式"：只推荐可用状态为'available'的工人
4. 添加"AI快速派发"按钮（一键接受最高推荐）
5. 驳回后重新派发时，自动排除原执行人并重新推荐

#### 3.3.3 巡查反馈任务派发整合

**文件**: `src/components/farm/problemDispatch/ProblemDispatchPage.tsx`

**修改点**:
1. 在分派弹窗中增加AI推荐区域
2. 根据问题的严重程度自动调整推荐权重：
   - 严重问题：紧急程度权重提升至25%
   - 一般问题：使用标准权重
3. 支持批量分派时的AI智能分配（将多个问题最优分配给不同工人）
4. 问题来源类型（环境/病虫害/设备/基础设施）影响技能匹配权重

---

## 四、自动派发流程设计

### 4.1 触发机制

#### 4.1.1 定时触发
- 每5分钟自动扫描待派发任务
- 计算推荐结果并执行自动派发

#### 4.1.2 事件触发
- 新任务创建时立即触发推荐
- 工人状态变更（完成/开始任务）时重新计算
- 紧急任务优先触发

#### 4.1.3 手动触发
- 在三个任务派发页面点击"AI推荐"按钮
- 在智能派工控制台点击"立即执行"

### 4.2 决策流程

```
新任务进入待派发队列
        │
        ▼
┌──────────────────┐
│ 获取工人实时状态  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 运行推荐算法      │
│ (5因子加权评分)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 计算最高匹配分数  │
│ (置信度)          │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
≥90分      70-89分      <70分
    │         │          │
    ▼         ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐
│自动  │  │AI推荐│  │人工  │
│派发  │  │+确认 │  │决定  │
└──┬───┘  └──┬───┘  └──┬───┘
   │         │         │
   ▼         ▼         ▼
创建任务  显示推荐   显示推荐
记录日志  等待确认   人工选择
通知工人  确认后派发
```

### 4.3 自动派发执行

```typescript
async function executeAutoDispatch(
  task: UnifiedDispatchTask,
  worker: WorkerMatch,
  config: AutoDispatchConfig
): Promise<DispatchResult> {
  // 1. 验证工人状态
  if (!isWorkerAvailable(worker)) {
    return { success: false, reason: '工人不可用' };
  }
  
  // 2. 检查工人负荷
  if (worker.activeTasks >= config.maxTasksPerWorker) {
    return { success: false, reason: '工人任务已满' };
  }
  
  // 3. 执行派发（根据任务类型调用不同系统）
  switch (task.sourceType) {
    case 'farm':
      return await dispatchToFarmTask(task, worker);
    case 'temp':
      return await dispatchToTempTask(task, worker);
    case 'problem':
      return await dispatchToProblem(task, worker);
  }
  
  // 4. 记录日志
  logAutoDispatch(task, worker);
  
  // 5. 发送通知（如果配置）
  if (config.notifyOnAutoDispatch) {
    sendNotification(worker.id, task);
  }
  
  return { success: true };
}
```

---

## 五、实施步骤

### 阶段一：基础架构搭建 (第1-2天)
1. 创建 `UnifiedDispatchTask` 等扩展类型
2. 创建 `useSmartDispatchEngine` hook
3. 创建 `AutoDispatchConfig` 配置管理
4. 创建 `WorkerRealTimeStatus` 状态追踪

### 阶段二：算法整合 (第3-4天)
1. 重构 `recommendAlgorithm.ts`，统一三个系统的调用入口
2. 在 `useSmartDispatchEngine` 中集成推荐算法
3. 实现置信度计算逻辑
4. 实现自动派发决策器

### 阶段三：UI组件开发 (第5-7天)
1. 开发 `SmartRecommendPanel` 组件
2. 开发 `AutoDispatchConsole` 控制台
3. 开发 `WorkerStatusCard` 工人状态卡片
4. 开发 `DispatchLogViewer` 派发日志查看器

### 阶段四：三个系统整合 (第8-10天)
1. 整合到农事任务派发页面
2. 整合到临时任务派发页面
3. 整合到巡查反馈问题分派页面
4. 测试数据流和用户体验

### 阶段五：测试与优化 (第11-12天)
1. 单元测试推荐算法
2. 集成测试自动派发流程
3. 性能优化（批量任务处理）
4. 用户体验优化

---

## 六、关键技术决策

### 6.1 是否实现完全自动派发？

**结论**: 可以实现，但需要分阶段实施

**理由**:
1. **算法基础已具备**: 5因子加权评分算法成熟，可计算置信度
2. **数据源需完善**: 当前工人状态数据为mock，需接入实时数据
3. **风险控制**: 初期建议设置高置信度阈值（90%），配合人工审核
4. **渐进式自动化**:
   - 阶段1: AI推荐 + 人工确认
   - 阶段2: 低优先级任务自动派发 + 高优先级人工确认
   - 阶段3: 全量自动派发（置信度≥90%）

### 6.2 数据存储方案

- **推荐结果**: 内存缓存（组件状态），不持久化
- **派发日志**: localStorage持久化，便于审计
- **配置**: localStorage + 默认值
- **工人实时状态**: 内存缓存，定时刷新

### 6.3 性能考虑

- 推荐算法为前端计算，时间复杂度 O(工人数 × 任务数)
- 建议每5分钟批量计算一次，而非实时计算
- 使用 Web Worker 避免阻塞UI

---

## 七、风险评估与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 工人数据不准确 | 推荐结果偏差 | 设置数据校验机制，低于阈值显示警告 |
| 自动派发错误 | 任务分配不合理 | 提供撤销功能，记录完整日志 |
| 性能问题 | 大量任务时计算慢 | 使用Web Worker，分页计算 |
| 用户不信任AI | 采纳率低 | 显示推荐理由，允许手动覆盖 |

---

## 八、预期效果

1. **效率提升**: 减少人工选择执行人的时间约60%
2. **分配均衡**: 工人负荷更均衡，避免过载或闲置
3. **技能匹配**: 任务与工人技能匹配度提升30%
4. **响应速度**: 紧急任务自动匹配最近工人，响应时间缩短50%
5. **数据驱动**: 完整派发日志支持后续分析和优化

---

## 九、后续扩展

1. **机器学习优化**: 基于历史派发结果自动调整权重
2. **预测性派工**: 根据生产计划预测未来任务，提前分配
3. **多目标优化**: 同时考虑成本、效率、满意度等多目标
4. **移动端通知**: 自动派发后推送通知到工人手机
