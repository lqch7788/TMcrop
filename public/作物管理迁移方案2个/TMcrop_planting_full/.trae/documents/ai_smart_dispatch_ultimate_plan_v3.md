# AI 智能派工系统 - 终极整合方案 v3.0

> 融合 `public/智能派工系统任务源对接方案规划.md` 与 `.trae/documents/ai_smart_dispatch_integration_flow_plan.md` 的核心设计

---

## 一、核心架构升级

### 1.1 融合后的核心设计

将参考方案的**任务派发状态机**与我的**三模式并行架构**深度融合：

```
┌─────────────────────────────────────────────────────────────┐
│                    任务派发状态机                              │
│                                                              │
│  draft ──► pending_ai ──► recommended ──► pending            │
│   │           │              │             │                 │
│   │    (待AI推荐)       (AI已推荐)      (已派发)             │
│   │           │              │             │                 │
│   │           ▼              ▼             ▼                 │
│   │     pending_ai ──► recommended ──► pending ─► accepted   │
│   │           │              │             │      │          │
│   │           │              │             │      ▼          │
│   │           └──────────────┴─────────────┘  in_progress   │
│   │                                                │        │
│   └────────────────────────────────────────────────┼─►      │
│                                                   ▼        │
│                                              completed      │
└─────────────────────────────────────────────────────────────┘
```

**状态定义**：
```typescript
// src/types/dispatch.ts

// 任务派发状态
export type DispatchStatus =
  | 'draft'           // 草稿（未提交）
  | 'pending_ai'      // 待AI推荐（已提交，等待AI生成推荐）
  | 'recommended'      // AI已推荐（待管理者确认）
  | 'pending'         // 已派发（等待执行人接受）
  | 'accepted'        // 已接受
  | 'in_progress'     // 执行中
  | 'completed'       // 已完成
  | 'rejected'        // 已驳回

// 派发模式
export type DispatchMode = 'manual' | 'ai_assisted' | 'ai_auto';
```

### 1.2 统一任务模型（升级）

```typescript
// src/types/dispatch.ts

export interface UnifiedDispatchTask {
  // === 现有字段 ===
  id: string;
  taskName: string;
  taskType: string;
  sourceType: 'farm' | 'temp' | 'problem';
  sourceId?: string;
  
  // === 新增：派发相关字段 ===
  dispatchStatus: DispatchStatus;      // 派发状态
  dispatchMode: DispatchMode;          // 派发模式
  
  // === 新增：执行人相关 ===
  assignedTo?: string;                 // 执行人ID
  assignedAt?: string;                 // 分配时间
  originalAssigneeId?: string;         // 原始选择的执行人ID（模式A优化建议用）
  
  // === 新增：AI推荐相关 ===
  submitToAiAt?: string;               // 提交到AI的时间
  aiRecommendedAt?: string;            // AI推荐的时间
  aiRecommendedWorkers?: WorkerRecommendation[]; // AI推荐的员工列表
  aiConfidenceScore?: number;          // AI推荐置信度
  aiRecommendationAccepted?: boolean;  // 是否接受了AI推荐
  
  // === 新增：AI优化建议（模式A）===
  aiOptimizationSuggestion?: {
    suggestedWorkerId: string;
    suggestedWorkerName: string;
    confidenceScore: number;
    reason: string;
    originalWorkerId: string;
    originalWorkerName: string;
  };
  
  // === 新增：预测任务相关 ===
  isPredictedTask: boolean;            // 是否为预测任务
  predictedBy?: string;                // 预测引擎标识
  predictedAt?: string;                // 预测时间
  
  // === 现有其他字段 ===
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  // ... 其他现有字段
}
```

---

## 二、三模式 + 状态机的完整流程

### 2.1 模式 1：纯人工模式（状态机简化版）

```
新建任务 → 选择执行人 → dispatchStatus = 'pending' → 派发 → pending → accepted
```

**状态流转**：
- 创建时：`dispatchStatus = 'pending'`（跳过 AI 环节）
- 执行人接受：`dispatchStatus = 'accepted'`
- 开始执行：`dispatchStatus = 'in_progress'`
- 完成：`dispatchStatus = 'completed'`

**优化建议机制（新增）**：
即使选择了纯人工模式，AI 仍可在后台运行优化建议检测：

```
管理员选择执行人A → 任务创建成功 → AI 后台检测
    │
    ├─ 发现执行人B更优（置信度90%+）
    │   ↓
    │   弹出优化建议弹窗
    │   [接受AI建议更换为B] / [保持原选择A]
    │
    └─ 无更优人选 → 不弹窗
```

### 2.2 模式 2：AI 辅助模式（状态机完整版）

```
新建任务 → 选择"待智能推荐" → dispatchStatus = 'pending_ai'
    │
    ▼
AI 推荐引擎运行 → dispatchStatus = 'recommended'
    │
    ▼
显示 AI 推荐 Top3 → 管理员操作
    │
    ├─ 接受AI推荐 → dispatchStatus = 'pending' → 派发
    ├─ 更换执行人 → dispatchStatus = 'pending' → 派发
    └─ 延后/忽略 → dispatchStatus = 'draft' → 重新进入队列
```

**关键改造点**：

#### 农事任务创建表单改造

```typescript
// 执行人选择区域
<Form.Item label="执行人">
  <Radio.Group value={dispatchMode} onChange={setDispatchMode}>
    <Radio.Button value="manual">
      👤 手动选择
    </Radio.Button>
    <Radio.Button value="ai_assisted">
      🤖 待智能推荐
    </Radio.Button>
  </Radio.Group>
  
  {dispatchMode === 'manual' && (
    <Select 
      value={assignedTo} 
      onChange={setAssignedTo}
      placeholder="选择执行人"
    />
  )}
  
  {dispatchMode === 'ai_assisted' && (
    <AIRecommendationPanel
      taskInfo={formData}
      onWorkerSelect={handleAIWorkerSelect}
      onManualSelect={() => setDispatchMode('manual')}
      config={{ autoSelectTop: true }}
    />
  )}
</Form.Item>
```

**创建逻辑**：
```typescript
const handleSubmit = async () => {
  if (dispatchMode === 'ai_assisted' && !assignedTo) {
    // 未选择执行人，提交到AI推荐队列
    await createTask({
      ...formData,
      dispatchStatus: 'pending_ai',
      dispatchMode: 'ai_assisted',
      submitToAiAt: new Date().toISOString(),
    });
  } else {
    // 已选择执行人（手动或AI推荐），直接派发
    await createTask({
      ...formData,
      dispatchStatus: 'pending',
      dispatchMode: dispatchMode,
      assignedTo,
      assignedAt: new Date().toISOString(),
    });
  }
};
```

### 2.3 模式 3：AI 全自动模式（预测 + 状态机）

```
任务预测引擎运行 → 生成预测任务 → dispatchStatus = 'pending_ai'
    │
    ▼
AI 推荐引擎运行 → 匹配执行人 → dispatchStatus = 'recommended'
    │
    ▼
置信度评分
    │
    ├─ 置信度≥80% → 自动派发 → dispatchStatus = 'pending'
    │
    ├─ 60≤置信度<80 → 进入待确认队列 → 管理员批量确认 → pending
    │
    └─ 置信度<60 → 进入待确认队列 → 管理员人工决策
```

---

## 三、巡查问题派发流程升级

### 3.1 现有问题分析

参考方案指出：
- **巡查问题**：通过问题派发页面派发给执行人，**可选**执行人
- **矛盾**：智能派工系统只能"事后诸葛亮"

### 3.2 升级方案：巡查问题默认进入 AI 推荐流程

```
巡查反馈提交 → 问题进入问题分派中心 → 管理员选择问题
    │
    ▼
点击"分派任务" → 弹窗默认显示 AI 推荐
    │
    ▼
AI 推荐 Top3 执行人 → 管理员操作
    │
    ├─ 接受AI推荐 → 创建关联任务 → dispatchStatus = 'pending'
    ├─ 手动更换 → 创建关联任务 → dispatchStatus = 'pending'
    └─ 转交其他部门 → 问题状态 = 'transferred'
```

**关键改造**：

```typescript
// src/components/farm/problemDispatch/ProblemDispatchPage.tsx

// 分派弹窗改造
function DispatchProblemModal({ problem, onClose }) {
  const [dispatchMode, setDispatchMode] = useState<'ai_assisted' | 'manual'>('ai_assisted');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  
  return (
    <Modal title="分派问题">
      {/* 问题信息展示 */}
      <ProblemInfo problem={problem} />
      
      {/* 分派设置 */}
      <Form.Item label="执行人选择">
        <Radio.Group value={dispatchMode} onChange={setDispatchMode}>
          <Radio.Button value="ai_assisted">🤖 AI推荐（默认）</Radio.Button>
          <Radio.Button value="manual">👤 手动选择</Radio.Button>
        </Radio.Group>
        
        {dispatchMode === 'ai_assisted' && (
          <AIRecommendationPanel
            taskInfo={{
              taskType: 'problem',
              problemCategory: problem.category,
              greenhouseName: problem.greenhouseName,
              severity: problem.severity,
            }}
            onWorkerSelect={setAssignedTo}
            onManualSelect={() => setDispatchMode('manual')}
            config={{ autoSelectTop: true }}
          />
        )}
        
        {dispatchMode === 'manual' && (
          <Select value={assignedTo} onChange={setAssignedTo} />
        )}
      </Form.Item>
      
      <Form.Actions>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={handleDispatch} disabled={!assignedTo}>
          确认分派
        </Button>
      </Form.Actions>
    </Modal>
  );
}
```

---

## 四、AI 优化建议机制（新增）

### 4.1 场景描述

管理员在纯人工模式下已手动选择了执行人 A，AI 后台检测到执行人 B 更优。

### 4.2 优化建议弹窗

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ AI优化建议                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 您选择的执行人【李建国】当前负荷较高（85%）          │
│                                                     │
│ AI发现更优执行人：                                  │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 张三（置信度91%）                           │   │
│ │ · 技能匹配：95% ✅                          │   │
│ │ · 当前负荷：空闲（0个任务）✅               │   │
│ │ · 位置：A区，距离0.5km ✅                   │   │
│ │ · 近期表现：92分 ✅                         │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 对比：                                              │
│ ┌─────────────────────────────────────────────┐   │
│ │ 李建国（您选择的）                          │   │
│ │ · 技能匹配：80%                             │   │
│ │ · 当前负荷：85%（2个任务）⚠️                │   │
│ │ · 位置：B区，距离3.5km ⚠️                   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [✅ 接受AI建议更换为张三]                           │
│ [❌ 保持原选择李建国]                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.3 技术实现

```typescript
// src/hooks/useAIOptimization.ts

interface AIOptimizationSuggestion {
  taskId: string;
  originalWorkerId: string;
  originalWorkerName: string;
  suggestedWorkerId: string;
  suggestedWorkerName: string;
  confidenceScore: number;
  originalScore: number;
  suggestedScore: number;
  scoreDiff: number;
  reason: string;
}

export function useAIOptimization() {
  const [suggestions, setSuggestions] = useState<AIOptimizationSuggestion[]>([]);
  
  // 检查任务执行人是否可优化
  const checkOptimization = useCallback(async (
    task: UnifiedDispatchTask,
    factors: DispatchFactors
  ): Promise<AIOptimizationSuggestion | null> => {
    if (!task.assignedTo) return null;
    
    // 重新计算所有人员的匹配度
    const matches = matchWorkers(task, factors.workers, factors.currentTasks, factors);
    const currentWorker = matches.find(m => m.staffId === task.assignedTo);
    const topWorker = matches[0];
    
    // 判断是否可优化（Top1 比当前执行人高 15 分以上）
    const scoreDiff = topWorker.totalScore - (currentWorker?.totalScore || 0);
    if (scoreDiff < 15) return null;
    
    return {
      taskId: task.id,
      originalWorkerId: task.assignedTo,
      originalWorkerName: currentWorker?.staffName || '',
      suggestedWorkerId: topWorker.staffId,
      suggestedWorkerName: topWorker.staffName,
      confidenceScore: topWorker.totalScore,
      originalScore: currentWorker?.totalScore || 0,
      suggestedScore: topWorker.totalScore,
      scoreDiff,
      reason: generateOptimizationReason(topWorker, currentWorker),
    };
  }, []);
  
  // 接受优化建议
  const acceptOptimization = useCallback(async (
    taskId: string,
    suggestedWorkerId: string
  ) => {
    await updateTask(taskId, {
      assignedTo: suggestedWorkerId,
      assignedAt: new Date().toISOString(),
      aiOptimizationSuggestion: { /* ... */ },
      aiRecommendationAccepted: true,
    });
  }, []);
  
  return {
    suggestions,
    checkOptimization,
    acceptOptimization,
  };
}
```

---

## 五、统一任务创建 Hook（升级版）

```typescript
// src/hooks/useUnifiedTaskCreation.ts

interface UnifiedTaskInput {
  // 通用字段
  taskName: string;
  taskType: string;
  greenhouseName: string;
  scheduledDate: string;
  estimatedHours: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  
  // 来源标识
  sourceType: 'farm' | 'temp' | 'problem';
  sourceId?: string;
  
  // === 新增：派发相关 ===
  dispatchMode: DispatchMode;           // 派发模式
  assignedTo?: string;                  // 执行人ID（手动选择时）
  useAIRecommendation: boolean;         // 是否使用AI推荐
  aiRecommendedWorkerId?: string;       // AI推荐的执行人ID
  aiConfidenceScore?: number;           // AI推荐置信度
  
  // 农事任务特有字段
  batchId?: string;
  operationType?: FarmOperationType;
  
  // 临时任务特有字段
  isEmergency?: boolean;
  description?: string;
  
  // 巡查反馈特有字段
  problemId?: number;
  requireFeedback?: boolean;
  deadline?: string;
}

export function useUnifiedTaskCreation() {
  const { createTask: createFarmTask } = useTasks();
  const { addTempTask } = useTempTasks();
  const { dispatchProblem } = useProblemDispatch();
  const { modeConfig, currentMode } = useDispatchModeConfig();
  const { factors } = useDispatchFactors();
  const { getAIRecommendation } = useWorkerMatching();
  const { checkOptimization } = useAIOptimization();
  
  // 创建任务（统一入口）
  const createTask = async (input: UnifiedTaskInput): Promise<UnifiedDispatchTask> => {
    // 1. 判断派发状态
    let dispatchStatus: DispatchStatus;
    if (input.dispatchMode === 'ai_assisted' && !input.assignedTo) {
      // AI辅助模式，未选择执行人 → 待AI推荐
      dispatchStatus = 'pending_ai';
    } else if (input.dispatchMode === 'ai_auto') {
      // 全自动模式 → AI已推荐
      dispatchStatus = 'recommended';
    } else {
      // 手动选择或AI推荐已选择 → 已派发
      dispatchStatus = 'pending';
    }
    
    // 2. 构建任务对象
    const task: UnifiedDispatchTask = {
      // ... 基础字段
      dispatchStatus,
      dispatchMode: input.dispatchMode,
      assignedTo: input.assignedTo,
      assignedAt: input.assignedTo ? new Date().toISOString() : undefined,
      submitToAiAt: dispatchStatus === 'pending_ai' ? new Date().toISOString() : undefined,
      aiRecommendedWorkers: input.aiRecommendedWorkerId ? [{
        workerId: input.aiRecommendedWorkerId,
        confidenceScore: input.aiConfidenceScore || 0,
      }] : undefined,
    };
    
    // 3. 调用对应系统创建任务
    let createdTask: UnifiedDispatchTask;
    switch (input.sourceType) {
      case 'farm':
        createdTask = await createFarmTask(task);
        break;
      case 'temp':
        createdTask = await addTempTask(task);
        break;
      case 'problem':
        createdTask = await dispatchProblem({
          problemId: input.problemId!,
          ...task,
        });
        break;
      default:
        throw new Error('Unknown task source type');
    }
    
    // 4. 纯人工模式下，检查优化建议
    if (input.dispatchMode === 'manual' && input.assignedTo) {
      const suggestion = await checkOptimization(createdTask, factors);
      if (suggestion) {
        // 弹出优化建议弹窗
        showOptimizationSuggestionModal(createdTask, suggestion);
      }
    }
    
    return createdTask;
  };
  
  return {
    createTask,
    getAIRecommendation,
    modeConfig,
    currentMode,
  };
}
```

---

## 六、智能派工确认页面（升级版）

### 6.1 页面功能

整合参考方案的确认页面与我的预测任务页面：

```
┌─────────────────────────────────────────────────────────────┐
│ 智能派工确认                                    [批量确认]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 待确认任务统计                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │待AI推荐  │ │AI已推荐  │ │预测任务  │ │优化建议  │        │
│ │: 3       │ │: 8       │ │: 5       │ │: 2       │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 待确认任务列表                                                │
│ ─────────────────────────────────────────────────────────  │
│                                                              │
│ ☑ [AI已推荐] 农事任务：番茄灌溉 - A区1号温室                │
│    批次：SC20260401-001                                     │
│    AI推荐：张三（置信度92%）                                │
│    理由：✅技能匹配95% ✅距离近 ✅当前空闲                  │
│    [✅ 接受] [✏️ 更换] [⏰ 延后]                          │
│                                                              │
│ ☑ [AI已推荐] 临时任务：设备维修 - B区2号温室               │
│    AI推荐：王建华（置信度78%）                              │
│    理由：✅技能匹配88% ⚠️距离较远                          │
│    [✅ 接受] [✏️ 更换] [⏰ 延后]                          │
│                                                              │
│ ☐ [待AI推荐] 巡查问题：叶片发黄 - C区1号温室               │
│    严重程度：中等                                           │
│    AI分析中...                                              │
│                                                              │
│ ☑ [预测任务] A区番茄-结果期-施肥任务                        │
│    预测引擎：作物生长周期                                    │
│    AI推荐：李四（置信度85%）                                │
│    理由：✅技能匹配90% ✅负荷低 ✅位置近                    │
│    [✅ 接受] [✏️ 更换] [⏰ 延后]                          │
│                                                              │
│ ☐ [优化建议] D区茄子-苗期-灌溉任务                          │
│    您当前选择：王五                                         │
│    AI建议更换为：赵六（置信度91%）                          │
│    [✅ 接受建议] [❌ 保持原选择]                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 页面实现

```typescript
// src/pages/SmartDispatch.tsx

export function SmartDispatchPage() {
  // 1. 获取所有待确认任务
  const pendingTasks = usePendingConfirmTasks();
  
  // 2. 分类
  const pendingAITasks = pendingTasks.filter(t => t.dispatchStatus === 'pending_ai');
  const recommendedTasks = pendingTasks.filter(t => t.dispatchStatus === 'recommended');
  const predictedTasks = pendingTasks.filter(t => t.isPredictedTask);
  const optimizationTasks = pendingTasks.filter(t => t.aiOptimizationSuggestion);
  
  // 3. 操作
  const { confirmDispatch, replaceWorker, delayTask, acceptOptimization } = useDispatchActions();
  
  return (
    <div className="smart-dispatch-page">
      {/* 统计卡片 */}
      <StatsCards
        pendingAI={pendingAITasks.length}
        recommended={recommendedTasks.length}
        predicted={predictedTasks.length}
        optimization={optimizationTasks.length}
      />
      
      {/* 任务列表 */}
      <div className="task-list">
        {/* AI已推荐任务 */}
        <TaskGroup title="AI已推荐" icon="✅" tasks={recommendedTasks} />
        
        {/* 待AI推荐任务 */}
        <TaskGroup title="待AI推荐" icon="⏳" tasks={pendingAITasks} />
        
        {/* 预测任务 */}
        <TaskGroup title="预测任务" icon="🔮" tasks={predictedTasks} />
        
        {/* 优化建议任务 */}
        <TaskGroup title="优化建议" icon="💡" tasks={optimizationTasks} />
      </div>
      
      {/* 批量操作 */}
      <BatchActions
        onConfirmAll={() => confirmDispatch(recommendedTasks.map(t => t.id))}
        onDelayAll={() => {/* ... */}}
      />
    </div>
  );
}
```

---

## 七、实施路线图（升级）

### 阶段一：基础架构搭建（4-5 天）

**Day 1-2: 类型和状态扩展**
- [ ] 扩展 `UnifiedDispatchTask` 添加派发状态和模式
- [ ] 创建 `DispatchStatus` 和 `DispatchMode` 类型
- [ ] 更新 `useTasks`、`useTempTasks`、`useProblemDispatch` 添加新状态处理
- [ ] 编写类型定义和单元测试

**Day 3-4: 模式配置系统**
- [ ] 创建 `useDispatchModeConfig` hook
- [ ] 实现三种模式定义和配置
- [ ] 实现模式切换逻辑
- [ ] 创建模式设置 UI
- [ ] 编写单元测试

**Day 5: 统一任务创建 Hook**
- [ ] 创建 `useUnifiedTaskCreation` hook
- [ ] 统一三种任务系统的创建接口
- [ ] 集成派发状态流转逻辑
- [ ] 编写集成测试

### 阶段二：AI 推荐组件开发（3-4 天）

**Day 6-7: AI 推荐面板**
- [ ] 创建 `AIRecommendationPanel` 组件
- [ ] 实现推荐结果展示
- [ ] 实现选择交互
- [ ] 实现推荐理由展示
- [ ] 编写组件测试

**Day 8-9: AI 优化建议机制**
- [ ] 创建 `useAIOptimization` hook
- [ ] 实现优化建议检测逻辑
- [ ] 创建优化建议弹窗组件
- [ ] 实现接受/拒绝建议交互
- [ ] 编写集成测试

### 阶段三：三个任务系统集成（4-5 天）

**Day 10-11: 农事任务集成**
- [ ] 改造 `TaskFormModal` 组件（增加"待智能推荐"选项）
- [ ] 集成 AI 推荐面板
- [ ] 实现派发状态流转
- [ ] 测试完整流程

**Day 12-13: 临时任务集成**
- [ ] 改造 `TempTaskFormModal` 组件
- [ ] 集成 AI 推荐面板
- [ ] 实现紧急任务特殊处理
- [ ] 测试完整流程

**Day 14: 巡查反馈任务集成**
- [ ] 改造问题分派弹窗（默认 AI 推荐）
- [ ] 集成 AI 推荐面板
- [ ] 实现病虫害问题特殊处理
- [ ] 测试完整流程

### 阶段四：智能派工确认页面（3-4 天）

**Day 15-16: 确认页面开发**
- [ ] 重构 `SmartDispatchPage.tsx`
- [ ] 实现待确认任务列表
- [ ] 实现按状态分组显示
- [ ] 实现单个任务操作（接受/更换/延后）
- [ ] 实现批量确认功能

**Day 17-18: 预测任务自动派发**
- [ ] 连接任务预测引擎
- [ ] 实现置信度≥80%自动派发
- [ ] 实现置信度<80%进入待确认队列
- [ ] 实现派发后状态更新
- [ ] 测试完整流程

### 阶段五：测试优化（3-4 天）

**Day 19-21: 全场景测试**
- [ ] 模式切换测试
- [ ] 状态流转测试
- [ ] AI 推荐准确性测试
- [ ] 优化建议机制测试
- [ ] 三种任务系统流程测试
- [ ] 边界场景测试
- [ ] 性能测试
- [ ] 修复 Bug

**Day 22: 上线准备**
- [ ] 编写用户文档
- [ ] 准备培训材料
- [ ] 灰度发布计划

---

## 八、关键文件清单

| 文件 | 说明 | 状态 |
|------|------|------|
| `src/types/dispatch.ts` | 扩展派发状态和模式类型 | 新增 |
| `src/hooks/useDispatchModeConfig.ts` | 模式配置管理 | 新增 |
| `src/hooks/useUnifiedTaskCreation.ts` | 统一任务创建入口 | 新增 |
| `src/hooks/useAIOptimization.ts` | AI 优化建议检测 | 新增 |
| `src/components/labor/dispatch/AIRecommendationPanel.tsx` | AI 推荐面板组件 | 新增 |
| `src/components/labor/dispatch/OptimizationSuggestionModal.tsx` | 优化建议弹窗 | 新增 |
| `src/pages/SmartDispatch.tsx` | 智能派工确认页面 | 重构 |
| `src/components/farm/taskDispatch/TaskDispatchPage.tsx` | 农事任务页面改造 | 修改 |
| `src/components/labor/tempTask/TempTaskPage.tsx` | 临时任务页面改造 | 修改 |
| `src/components/farm/problemDispatch/ProblemDispatchPage.tsx` | 巡查问题页面改造 | 修改 |
| `src/hooks/useTasks.ts` | 任务 Hook 扩展 | 修改 |
| `src/hooks/useTempTasks.ts` | 临时任务 Hook 扩展 | 修改 |
| `src/hooks/useProblemDispatch.ts` | 问题派发 Hook 扩展 | 修改 |

---

## 九、验证方案

### 9.1 模式 1（纯人工）测试
1. [ ] 新建农事任务，手动选择执行人 A
2. [ ] AI 后台检测到执行人 B 更优，弹出优化建议
3. [ ] 接受建议后执行人变为 B
4. [ ] 拒绝建议后执行人保持 A

### 9.2 模式 2（AI 辅助）测试
1. [ ] 新建农事任务，选择"待智能推荐"
2. [ ] 任务 dispatchStatus = 'pending_ai'
3. [ ] AI 推荐生成，dispatchStatus = 'recommended'
4. [ ] 显示 AI 推荐 Top3，默认选中第一名
5. [ ] 确认推荐后任务派发成功，dispatchStatus = 'pending'

### 9.3 模式 3（AI 全自动）测试
1. [ ] 触发环境告警（土壤湿度低）
2. [ ] 自动生成灌溉任务，dispatchStatus = 'pending_ai'
3. [ ] AI 自动匹配执行人，置信度 90%
4. [ ] 自动派发（≥80% 阈值），dispatchStatus = 'pending'
5. [ ] 执行人收到通知

### 9.4 巡查问题测试
1. [ ] 提交新巡查问题
2. [ ] 打开分派弹窗，默认显示 AI 推荐
3. [ ] 确认推荐后创建关联任务
4. [ ] 任务进入"待接受"状态

### 9.5 状态流转测试
1. [ ] draft → pending_ai → recommended → pending → accepted → in_progress → completed
2. [ ] 各状态切换的 UI 表现正确
3. [ ] 状态变更后数据同步正确

---

## 十、总结

本方案深度融合了参考方案的核心设计与我的架构设计：

### 核心融合点

1. **任务派发状态机**：引入 `pending_ai` → `recommended` → `pending` 的完整状态流转
2. **三模式并行**：`manual` / `ai_assisted` / `ai_auto` 三种派发模式
3. **统一任务模型**：`UnifiedDispatchTask` 整合派发状态、模式、AI 推荐等字段
4. **AI 优化建议机制**：对已手动选择执行人的任务，AI 检测更优人选并弹窗建议
5. **巡查问题默认 AI 推荐**：分派弹窗默认显示 AI 推荐，支持手动切换
6. **预测任务自动派发**：置信度≥80% 自动派发，<80% 进入待确认队列

### 相比参考方案的增强

1. **全维度因素考虑**：天气、IoT 传感器、作物生长周期、人员技能/负荷/位置/表现
2. **动态权重调整**：根据任务类型、紧急程度、面积动态调整匹配权重
3. **配置化管理**：模式、权重、阈值全部配置化，支持动态调整
4. **渐进式切换**：支持按任务类型、置信度、时间段自动切换模式

### 相比我的原方案的增强

1. **任务状态机**：引入完整的派发状态流转，支持"待AI推荐"和"AI已推荐"状态
2. **统一任务模型**：明确定义 `UnifiedDispatchTask` 接口
3. **优化建议机制**：新增对纯人工模式的 AI 优化建议功能
4. **巡查问题默认 AI**：明确巡查问题分派默认进入 AI 推荐流程

通过本方案的实施，系统将实现从"手动选择执行人"到"AI 推荐 + 人工确认"再到"AI 自动预测 + 批量确认"的平滑演进，同时保留人工最终决策权，确保 AI 始终是辅助角色。
