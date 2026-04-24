# AI 智能派工系统 - 终极整合方案 v3.1

> 融合 `public/智能派工系统任务源对接方案规划.md` 与 `.trae/documents/ai_smart_dispatch_integration_flow_plan.md` 的核心设计，新增每日工单汇总分析与月度规划功能

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
  
  // === 新增：任务进度相关 ===
  plannedDate: string;                 // 计划日期
  actualStartDate?: string;            // 实际开始日期
  actualCompletionDate?: string;       // 实际完成日期
  progressStatus: 'on_track' | 'ahead' | 'delayed' | 'cancelled';  // 进度状态
  progressPercentage: number;          // 进度百分比 0-100
  delayDays?: number;                  // 延迟天数
  delayReason?: string;                // 延迟原因
  
  // === 新增：规划相关 ===
  planningHorizon: 'daily' | 'weekly' | 'monthly';  // 规划周期
  planningDate: string;                // 规划生成日期
  planningBatch?: string;              // 关联的生产批次
  isAutoPlanned: boolean;              // 是否为AI自动规划
  planningNotes?: string;              // 规划备注
  
  // === 现有其他字段 ===
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  // ... 其他现有字段
}
```

---

## 二、新增功能：每日工单汇总与智能分析

### 2.1 每日工单自动汇总

**功能描述**：
- 每天早上 6:00 自动运行
- 汇总当天所有待执行、进行中、已完成的任务
- 与历史任务对比，分析进度偏差
- 生成每日工单分析报告

**报告内容**：

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 每日工单汇总分析报告 - 2026-04-22                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📋 今日任务概览                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │待派发    │ │进行中    │ │已完成    │ │已超期    │        │
│ │: 8       │ │: 5       │ │: 12      │ │: 2       │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│ 📈 进度分析                                                   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ✅ 提前完成（3项）                                    │   │
│ │ · A区番茄灌溉 - 提前1天完成（原计划4/21，实际4/20）   │   │
│ │ · B区黄瓜施肥 - 提前2天完成                           │   │
│ │ · C区草莓修剪 - 提前1天完成                           │   │
│ │                                                      │   │
│ │ ⏰ 正常进行中（5项）                                  │   │
│ │ · D区茄子植保 - 进度60%，按计划进行                    │   │
│ │ · A区番茄采收 - 进度40%，按计划进行                    │   │
│ │ · ...                                                │   │
│ │                                                      │   │
│ │ ⚠️ 推迟任务（2项）                                    │   │
│ │ · B区黄瓜灌溉 - 推迟2天（原因：雨天延后）              │   │
│ │ · C区草莓施肥 - 推迟1天（原因：人员请假）              │   │
│ │                                                      │   │
│ │ ❌ 未完成任务（2项）                                  │   │
│ │ · A区番茄植保 - 超期2天，需立即处理                    │   │
│ │ · D区茄子修剪 - 超期1天，建议今日安排                  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ 👥 人员负荷分析                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 姓名   │ 今日任务 │ 完成率 │ 负荷   │ 状态           │   │
│ │ 萧峰   │    3     │  100%  │ 正常   │ ✅ 空闲       │   │
│ │ 虚竹   │    2     │  100%  │ 正常   │ ✅ 空闲       │   │
│ │ 狄云   │    3     │   67%  │ 较高   │ 🟡 较忙       │   │
│ │ 石破天 │    2     │   50%  │ 正常   │ 🟡 进行中     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ 🌤️ 今日天气预报                                               │
│ 晴 28℃，无降雨，适合户外作业                                  │
│                                                              │
│ 🤖 AI 今日派工建议                                            │
│ 1. 优先处理超期任务：A区番茄植保、D区茄子修剪                 │
│ 2. 建议安排人员：萧峰（空闲，技能匹配度高）                   │
│ 3. 注意：B区黄瓜灌溉已延后，需安排明日执行                    │
│                                                              │
│ [✅ 一键确认派发] [📝 查看详情] [⚙️ 调整计划]               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 进度分析算法

```typescript
// src/hooks/useDailyWorkOrderAnalysis.ts

interface TaskProgressAnalysis {
  taskId: string;
  taskName: string;
  plannedDate: string;
  actualCompletionDate?: string;
  progressStatus: 'on_track' | 'ahead' | 'delayed' | 'cancelled';
  delayDays?: number;
  delayReason?: string;
  originalAssignee?: string;
  actualAssignee?: string;
}

interface DailyWorkOrderReport {
  date: string;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  
  // 进度分析
  aheadTasks: TaskProgressAnalysis[];
  onTrackTasks: TaskProgressAnalysis[];
  delayedTasks: TaskProgressAnalysis[];
  unfinishedTasks: TaskProgressAnalysis[];
  
  // 人员分析
  workerLoadAnalysis: WorkerLoadAnalysis[];
  
  // AI 建议
  aiRecommendations: string[];
  
  // 天气
  weatherForecast: WeatherData;
}

export function useDailyWorkOrderAnalysis() {
  const { tasks } = useTasks();
  const { tempTasks } = useTempTasks();
  const { factors } = useDispatchFactors();
  
  // 生成每日工单汇总报告
  const generateDailyReport = useCallback((date: string): DailyWorkOrderReport => {
    const todayTasks = getAllTasksForDate(date);
    const completedTasks = todayTasks.filter(t => t.status === 'completed');
    const inProgressTasks = todayTasks.filter(t => t.status === 'in_progress');
    const pendingTasks = todayTasks.filter(t => t.status === 'pending');
    const overdueTasks = todayTasks.filter(t => isOverdue(t, date));
    
    // 进度分析
    const aheadTasks = analyzeAheadTasks(todayTasks, date);
    const onTrackTasks = analyzeOnTrackTasks(todayTasks, date);
    const delayedTasks = analyzeDelayedTasks(todayTasks, date);
    const unfinishedTasks = analyzeUnfinishedTasks(todayTasks, date);
    
    // 人员负荷分析
    const workerLoadAnalysis = analyzeWorkerLoad(date);
    
    // AI 建议生成
    const aiRecommendations = generateAIRecommendations({
      overdueTasks,
      delayedTasks,
      workerLoadAnalysis,
      weather: factors.weatherForecast,
    });
    
    return {
      date,
      totalTasks: todayTasks.length,
      pendingTasks: pendingTasks.length,
      inProgressTasks: inProgressTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      aheadTasks,
      onTrackTasks,
      delayedTasks,
      unfinishedTasks,
      workerLoadAnalysis,
      aiRecommendations,
      weatherForecast: factors.weatherForecast,
    };
  }, [tasks, tempTasks, factors]);
  
  // 分析提前完成任务
  const analyzeAheadTasks = (tasks: UnifiedDispatchTask[], date: string): TaskProgressAnalysis[] => {
    return tasks
      .filter(t => t.status === 'completed' && t.actualCompletionDate)
      .filter(t => {
        const planned = new Date(t.plannedDate);
        const actual = new Date(t.actualCompletionDate!);
        return actual < planned;
      })
      .map(t => ({
        taskId: t.id,
        taskName: t.taskName,
        plannedDate: t.plannedDate,
        actualCompletionDate: t.actualCompletionDate,
        progressStatus: 'ahead' as const,
        delayDays: calculateDaysDiff(t.actualCompletionDate!, t.plannedDate),
        originalAssignee: t.originalAssigneeId,
        actualAssignee: t.assignedTo,
      }));
  };
  
  // 分析推迟任务
  const analyzeDelayedTasks = (tasks: UnifiedDispatchTask[], date: string): TaskProgressAnalysis[] => {
    return tasks
      .filter(t => t.progressStatus === 'delayed')
      .map(t => ({
        taskId: t.id,
        taskName: t.taskName,
        plannedDate: t.plannedDate,
        progressStatus: 'delayed' as const,
        delayDays: t.delayDays,
        delayReason: t.delayReason,
        originalAssignee: t.originalAssigneeId,
        actualAssignee: t.assignedTo,
      }));
  };
  
  // 分析未完成任务
  const analyzeUnfinishedTasks = (tasks: UnifiedDispatchTask[], date: string): TaskProgressAnalysis[] => {
    return tasks
      .filter(t => isOverdue(t, date) && t.status !== 'completed')
      .map(t => ({
        taskId: t.id,
        taskName: t.taskName,
        plannedDate: t.plannedDate,
        progressStatus: 'delayed' as const,
        delayDays: calculateDaysDiff(date, t.plannedDate),
        delayReason: t.delayReason || '未完成',
        originalAssignee: t.originalAssigneeId,
        actualAssignee: t.assignedTo,
      }));
  };
  
  // 人员负荷分析
  const analyzeWorkerLoad = (date: string): WorkerLoadAnalysis[] => {
    return factors.workers.map(worker => {
      const todayTasks = getTasksForWorker(worker.staffId, date);
      const completedTasks = todayTasks.filter(t => t.status === 'completed');
      const completionRate = todayTasks.length > 0 
        ? (completedTasks.length / todayTasks.length) * 100 
        : 0;
      
      return {
        workerId: worker.staffId,
        workerName: worker.name,
        todayTasks: todayTasks.length,
        completedTasks: completedTasks.length,
        completionRate,
        loadStatus: getLoadStatus(todayTasks.length),
        availability: todayTasks.length < 2 ? 'available' : 'busy',
      };
    });
  };
  
  // 生成 AI 建议
  const generateAIRecommendations = (context: {
    overdueTasks: UnifiedDispatchTask[];
    delayedTasks: TaskProgressAnalysis[];
    workerLoadAnalysis: WorkerLoadAnalysis[];
    weather: WeatherData;
  }): string[] => {
    const recommendations: string[] = [];
    
    // 超期任务建议
    if (context.overdueTasks.length > 0) {
      recommendations.push(
        `优先处理${context.overdueTasks.length}项超期任务：${context.overdueTasks.map(t => t.taskName).join('、')}`
      );
    }
    
    // 人员建议
    const availableWorkers = context.workerLoadAnalysis.filter(w => w.availability === 'available');
    if (availableWorkers.length > 0) {
      recommendations.push(
        `建议安排人员：${availableWorkers.map(w => w.workerName).join('、')}（当前空闲，可安排新任务）`
      );
    }
    
    // 天气建议
    if (context.weather.forecast?.includes('雨')) {
      recommendations.push('今日有降雨，户外作业建议调整到明日');
    }
    
    return recommendations;
  };
  
  return {
    generateDailyReport,
    analyzeAheadTasks,
    analyzeDelayedTasks,
    analyzeUnfinishedTasks,
    analyzeWorkerLoad,
  };
}
```

### 2.3 每日定时任务规划

**功能描述**：
- 每天早上 6:00 自动运行
- 基于生产批次和作物生长周期，预测当日任务
- 结合天气、人员状态，生成最优派工计划
- 7:00 前推送提醒给管理人员

**定时任务流程**：

```
每天早上 6:00 触发
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 每日任务规划引擎                                              │
│                                                              │
│ 步骤 1：读取生产批次                                          │
│   · 获取所有执行中批次                                        │
│   · 解析作物种类和生长阶段                                    │
│   · 匹配阶段任务规则                                          │
│                                                              │
│ 步骤 2：预测当日任务                                          │
│   · 计算间隔天数，判断哪些任务需要执行                        │
│   · 检查超期任务                                              │
│   · 检查环境告警（IoT 传感器）                                │
│   · 检查病虫害预警                                            │
│   · 考虑天气影响                                              │
│                                                              │
│ 步骤 3：人员匹配                                              │
│   · 获取当日考勤状态                                          │
│   · 计算人员负荷                                              │
│   · 运行推荐算法                                              │
│   · 生成任务-人员匹配方案                                     │
│                                                              │
│ 步骤 4：生成派工计划                                          │
│   · 按优先级排序                                              │
│   · 生成派工建议                                              │
│   · 生成物资需求清单                                          │
│   · 生成工具需求清单                                          │
│                                                              │
│ 步骤 5：推送提醒                                              │
│   · 7:00 前推送给管理人员                                     │
│   · 显示在任务中心顶部                                        │
│   · 可选：短信/邮件/APP 推送                                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
管理人员打开系统 → 查看今日派工计划 → 一键确认/调整 → 派发
```

**代码实现**：

```typescript
// src/hooks/useDailyTaskPlanning.ts

export function useDailyTaskPlanning() {
  const { factors } = useDispatchFactors();
  const { predictTasks } = useTaskPrediction();
  const { matchWorkers } = useWorkerMatching();
  const { createTask } = useUnifiedTaskCreation();
  
  // 每日任务规划
  const generateDailyPlan = useCallback(async (date: string): Promise<DailyPlan> => {
    // 1. 预测当日任务
    const predictedTasks = await predictTasks(date);
    
    // 2. 过滤当日任务
    const todayTasks = predictedTasks.filter(t => t.suggestedDate === date);
    
    // 3. 人员匹配
    const workerMatches = matchWorkers(todayTasks, factors.workers, factors.currentTasks);
    
    // 4. 生成派工计划
    const plan: DailyPlan = {
      date,
      tasks: todayTasks.map(task => ({
        taskId: task.id,
        taskName: task.taskName,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        assignedWorker: workerMatches[task.id]?.[0],
        materials: getRequiredMaterials(task),
        tools: getRequiredTools(task),
      })),
      totalTasks: todayTasks.length,
      totalHours: todayTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
      requiredWorkers: calculateRequiredWorkers(todayTasks),
      requiredMaterials: aggregateMaterials(todayTasks),
      requiredTools: aggregateTools(todayTasks),
      aiRecommendations: generatePlanRecommendations(todayTasks, workerMatches),
    };
    
    return plan;
  }, [factors, predictTasks, matchWorkers]);
  
  // 确认并派发
  const confirmAndDispatch = useCallback(async (plan: DailyPlan): Promise<void> => {
    for (const task of plan.tasks) {
      if (task.assignedWorker) {
        await createTask({
          taskName: task.taskName,
          taskType: task.taskType,
          assignedTo: task.assignedWorker.staffId,
          plannedDate: plan.date,
          dispatchMode: 'ai_auto',
          dispatchStatus: 'pending',
          isAutoPlanned: true,
          planningHorizon: 'daily',
        });
      }
    }
  }, [createTask]);
  
  return {
    generateDailyPlan,
    confirmAndDispatch,
  };
}
```

---

## 三、新增功能：月度任务规划与预览

### 3.1 月度规划生成

**功能描述**：
- 生产计划创建后自动生成
- 基于作物生长周期，预测未来 30 天任务
- 生成物资、工具、人员需求计划

**月度规划流程**：

```
生产计划创建/更新
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 月度任务规划引擎                                              │
│                                                              │
│ 步骤 1：读取生产计划                                          │
│   · 获取所有执行中批次                                        │
│   · 解析作物种类、生长阶段、种植面积                          │
│   · 获取计划开始/结束日期                                     │
│                                                              │
│ 步骤 2：30 天任务预测                                         │
│   · 遍历未来 30 天                                            │
│   · 对每天，匹配作物生长阶段任务规则                          │
│   · 计算任务间隔，判断哪些任务需要执行                        │
│   · 考虑季节性调整                                            │
│   · 生成未来 30 天任务列表                                    │
│                                                              │
│ 步骤 3：资源需求分析                                          │
│   · 物资需求：肥料、农药、灌溉用水等                          │
│   · 工具需求：喷雾器、修剪工具、采收工具等                    │
│   · 人员需求：每日所需人员数量、技能要求                      │
│   · 工时需求：每日预估工时                                    │
│                                                              │
│ 步骤 4：生成月度规划报告                                      │
│   · 按周汇总任务                                              │
│   · 按类型汇总任务                                            │
│   · 生成资源需求清单                                          │
│   · 生成成本预估                                              │
│                                                              │
│ 步骤 5：保存并推送                                            │
│   · 保存到月度规划库                                          │
│   · 推送给管理人员                                            │
│   · 关联到生产批次                                            │
└─────────────────────────────────────────────────────────────┘
```

**月度规划报告 UI**：

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 月度任务规划 - 2026 年 4 月                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 月度概览                                                   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │总任务数  │ │预估工时  │ │所需人员  │ │预估成本  │        │
│ │: 156     │ │: 312小时  │ │: 6人     │ │: ¥12,500 │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│ 📋 按周汇总                                                   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 周次   │ 任务数 │ 工时  │ 重点作物 │ 重点任务         │   │
│ │ 第 1 周 │  38   │ 76h  │ 番茄/黄瓜 │ 灌溉/施肥/植保  │   │
│ │ 第 2 周 │  42   │ 84h  │ 番茄/草莓 │ 灌溉/修剪/采收  │   │
│ │ 第 3 周 │  40   │ 80h  │ 黄瓜/茄子 │ 灌溉/施肥/植保  │   │
│ │ 第 4 周 │  36   │ 72h  │ 番茄/辣椒 │ 灌溉/采收/修剪  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ 📦 物资需求计划                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 物资名称   │ 规格  │ 数量  │ 预估单价 │ 预估总价     │   │
│ │ 复合肥     │ 50kg  │ 20袋  │ ¥150    │ ¥3,000      │   │
│ │ 农药       │ 1L    │ 10瓶  │ ¥80     │ ¥800        │   │
│ │ 灌溉用水   │ m³    │ 500   │ ¥5      │ ¥2,500      │   │
│ │ ...        │       │       │         │             │   │
│ │ 合计       │       │       │         │ ¥6,300      │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ 🛠️ 工具需求计划                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 工具名称   │ 数量  │ 状态   │ 备注                   │   │
│ │ 喷雾器     │ 4台   │ 3可用  │ 需维修1台              │   │
│ │ 修剪剪刀   │ 10把  │ 10可用 │ 充足                   │   │
│ │ 采收筐     │ 30个  │ 25可用 │ 需补充5个              │   │
│ │ ...        │       │        │                        │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ 👥 人员需求计划                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 周次   │ 所需人数 │ 技能要求               │ 建议安排 │   │
│ │ 第 1 周 │   6人    │ 灌溉2/施肥2/植保2      │ 全员     │   │
│ │ 第 2 周 │   5人    │ 灌溉2/修剪2/采收1      │ 萧峰等   │   │
│ │ 第 3 周 │   6人    │ 灌溉2/施肥2/植保2      │ 全员     │   │
│ │ 第 4 周 │   5人    │ 灌溉2/采收2/修剪1      │ 萧峰等   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ 📈 任务日历                                                   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │     4 月 2026                                         │   │
│ │ 日  一  二  三  四  五  六                            │   │
│ │           1   2   3   4                               │   │
│ │  5   6   7   8   9  10  11                            │   │
│ │ 12  13  14  15  16  17  18                            │   │
│ │ 19  20  21  22  23  24  25                            │   │
│ │ 26  27  28  29  30                                    │   │
│ │                                                      │   │
│ │ · 点击日期查看当日任务详情                             │   │
│ │ · 🟢 绿色：计划任务                                   │   │
│ │ · 🟡 黄色：预警任务                                   │   │
│ │ · 🔴 红色：紧急任务                                   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ [📥 导出规划] [📝 调整计划] [✅ 确认发布]                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 月度规划算法

```typescript
// src/hooks/useMonthlyTaskPlanning.ts

interface MonthlyPlan {
  month: string;           // YYYY-MM
  batches: string[];       // 关联的生产批次
  totalTasks: number;
  totalHours: number;
  totalCost: number;
  
  // 按周汇总
  weeklySummaries: WeeklySummary[];
  
  // 按类型汇总
  taskTypeBreakdown: Record<string, number>;
  
  // 每日任务
  dailyPlans: Record<string, DailyPlan>;
  
  // 资源需求
  materialRequirements: MaterialRequirement[];
  toolRequirements: ToolRequirement[];
  workerRequirements: WorkerRequirement[];
  
  // 成本预估
  costBreakdown: CostBreakdown;
  
  // 规划生成信息
  generatedAt: string;
  generatedBy: string;
  planningHorizon: 'monthly';
}

interface WeeklySummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  taskCount: number;
  totalHours: number;
  keyCrops: string[];
  keyTasks: string[];
  requiredWorkers: number;
}

interface MaterialRequirement {
  materialName: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotalPrice: number;
}

interface ToolRequirement {
  toolName: string;
  quantity: number;
  status: 'available' | 'need_repair' | 'need_purchase';
  notes?: string;
}

interface WorkerRequirement {
  weekNumber: number;
  requiredCount: number;
  skillRequirements: Record<string, number>;  // skillTag -> count
  suggestedWorkers: string[];
}

export function useMonthlyTaskPlanning() {
  const { factors } = useDispatchFactors();
  const { predictTasks } = useTaskPrediction();
  
  // 生成月度规划
  const generateMonthlyPlan = useCallback(async (
    month: string,
    batchIds: string[]
  ): Promise<MonthlyPlan> => {
    const startDate = `${month}-01`;
    const endDate = getMonthEndDate(month);
    
    // 1. 生成未来 30 天任务预测
    const allTasks: PredictedTask[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= new Date(endDate)) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dailyTasks = await predictTasks(dateStr);
      allTasks.push(...dailyTasks);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 2. 按周汇总
    const weeklySummaries = aggregateByWeek(allTasks, startDate, endDate);
    
    // 3. 按类型汇总
    const taskTypeBreakdown = aggregateByType(allTasks);
    
    // 4. 生成每日计划
    const dailyPlans = aggregateByDay(allTasks);
    
    // 5. 物资需求分析
    const materialRequirements = analyzeMaterialRequirements(allTasks);
    
    // 6. 工具需求分析
    const toolRequirements = analyzeToolRequirements(allTasks);
    
    // 7. 人员需求分析
    const workerRequirements = analyzeWorkerRequirements(weeklySummaries);
    
    // 8. 成本预估
    const costBreakdown = estimateCost({
      materialRequirements,
      toolRequirements,
      workerRequirements,
      totalHours: allTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
    });
    
    return {
      month,
      batches: batchIds,
      totalTasks: allTasks.length,
      totalHours: allTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
      totalCost: costBreakdown.total,
      weeklySummaries,
      taskTypeBreakdown,
      dailyPlans,
      materialRequirements,
      toolRequirements,
      workerRequirements,
      costBreakdown,
      generatedAt: new Date().toISOString(),
      generatedBy: 'AI Planning Engine',
      planningHorizon: 'monthly',
    };
  }, [factors, predictTasks]);
  
  // 按周汇总
  const aggregateByWeek = (
    tasks: PredictedTask[],
    startDate: string,
    endDate: string
  ): WeeklySummary[] => {
    const weeks: WeeklySummary[] = [];
    let currentDate = new Date(startDate);
    let weekNumber = 1;
    
    while (currentDate <= new Date(endDate)) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekTasks = tasks.filter(t => {
        const taskDate = new Date(t.suggestedDate);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });
      
      weeks.push({
        weekNumber,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        taskCount: weekTasks.length,
        totalHours: weekTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
        keyCrops: [...new Set(weekTasks.map(t => t.cropName))],
        keyTasks: [...new Set(weekTasks.map(t => t.operationName))],
        requiredWorkers: calculateRequiredWorkers(weekTasks),
      });
      
      weekNumber++;
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return weeks;
  };
  
  // 物资需求分析
  const analyzeMaterialRequirements = (
    tasks: PredictedTask[]
  ): MaterialRequirement[] => {
    const materials: MaterialRequirement[] = [];
    
    // 施肥任务 → 肥料需求
    const fertilizationTasks = tasks.filter(t => t.operationType === 'fertilization');
    if (fertilizationTasks.length > 0) {
      const totalArea = fertilizationTasks.reduce((sum, t) => sum + t.plantingArea, 0);
      materials.push({
        materialName: '复合肥',
        specification: '50kg/袋',
        quantity: Math.ceil(totalArea * 0.1),  // 每 10m² 需要 1kg
        unit: '袋',
        estimatedUnitPrice: 150,
        estimatedTotalPrice: Math.ceil(totalArea * 0.1) * 150,
      });
    }
    
    // 植保任务 → 农药需求
    const pestControlTasks = tasks.filter(t => t.operationType === 'pest_control');
    if (pestControlTasks.length > 0) {
      const totalArea = pestControlTasks.reduce((sum, t) => sum + t.plantingArea, 0);
      materials.push({
        materialName: '农药',
        specification: '1L/瓶',
        quantity: Math.ceil(totalArea * 0.05),  // 每 20m² 需要 1L
        unit: '瓶',
        estimatedUnitPrice: 80,
        estimatedTotalPrice: Math.ceil(totalArea * 0.05) * 80,
      });
    }
    
    // 灌溉任务 → 用水需求
    const irrigationTasks = tasks.filter(t => t.operationType === 'irrigation');
    if (irrigationTasks.length > 0) {
      const totalArea = irrigationTasks.reduce((sum, t) => sum + t.plantingArea, 0);
      materials.push({
        materialName: '灌溉用水',
        specification: 'm³',
        quantity: Math.ceil(totalArea * 0.5),  // 每 2m² 需要 1m³
        unit: 'm³',
        estimatedUnitPrice: 5,
        estimatedTotalPrice: Math.ceil(totalArea * 0.5) * 5,
      });
    }
    
    return materials;
  };
  
  // 成本预估
  const estimateCost = (context: {
    materialRequirements: MaterialRequirement[];
    toolRequirements: ToolRequirement[];
    workerRequirements: WorkerRequirement[];
    totalHours: number;
  }): CostBreakdown => {
    const materialCost = context.materialRequirements.reduce(
      (sum, m) => sum + m.estimatedTotalPrice, 0
    );
    const toolCost = context.toolRequirements.reduce(
      (sum, t) => sum + (t.status === 'need_purchase' ? 100 : 0), 0
    );
    const laborCost = context.totalHours * 50;  // 假设每小时 50 元
    
    return {
      materialCost,
      toolCost,
      laborCost,
      total: materialCost + toolCost + laborCost,
    };
  };
  
  return {
    generateMonthlyPlan,
    aggregateByWeek,
    analyzeMaterialRequirements,
    estimateCost,
  };
}
```

---

## 三、模式 1：纯人工模式（状态机简化版）

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

### 3.1 模式 2：AI 辅助模式（状态机完整版）

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

### 3.2 模式 3：AI 全自动模式（预测 + 状态机）

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

## 四、巡查问题派发流程升级

### 4.1 现有问题分析

参考方案指出：
- **巡查问题**：通过问题派发页面派发给执行人，**可选**执行人
- **矛盾**：智能派工系统只能"事后诸葛亮"

### 4.2 升级方案：巡查问题默认进入 AI 推荐流程

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

## 五、AI 优化建议机制（新增）

### 5.1 场景描述

管理员在纯人工模式下已手动选择了执行人 A，AI 后台检测到执行人 B 更优。

### 5.2 优化建议弹窗

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

### 5.3 技术实现

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

## 六、统一任务创建 Hook（升级版）

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
  
  // === 新增：规划相关 ===
  planningHorizon: 'daily' | 'weekly' | 'monthly';
  planningDate?: string;
  isAutoPlanned?: boolean;
  
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
      planningHorizon: input.planningHorizon,
      planningDate: input.planningDate || new Date().toISOString().split('T')[0],
      isAutoPlanned: input.isAutoPlanned || false,
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

## 七、智能派工确认页面（升级版）

### 7.1 页面功能

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

### 7.2 页面实现

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

## 八、每日/月度规划页面

### 8.1 每日规划页面

```typescript
// src/pages/DailyPlanningPage.tsx

export function DailyPlanningPage() {
  const { generateDailyReport } = useDailyWorkOrderAnalysis();
  const { generateDailyPlan, confirmAndDispatch } = useDailyTaskPlanning();
  
  const [todayReport, setTodayReport] = useState<DailyWorkOrderReport | null>(null);
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const report = generateDailyReport(today);
    setTodayReport(report);
    
    const plan = generateDailyPlan(today);
    setTodayPlan(plan);
  }, [generateDailyReport, generateDailyPlan]);
  
  return (
    <div className="daily-planning-page">
      {/* 每日工单汇总 */}
      <DailyWorkOrderReport report={todayReport} />
      
      {/* 今日派工计划 */}
      <DailyPlanCard plan={todayPlan} onConfirm={confirmAndDispatch} />
      
      {/* 进度分析 */}
      <ProgressAnalysis report={todayReport} />
    </div>
  );
}
```

### 8.2 月度规划页面

```typescript
// src/pages/MonthlyPlanningPage.tsx

export function MonthlyPlanningPage() {
  const { generateMonthlyPlan } = useMonthlyTaskPlanning();
  
  const [selectedMonth, setSelectedMonth] = useState('2026-04');
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan | null>(null);
  
  useEffect(() => {
    const plan = generateMonthlyPlan(selectedMonth, ['B001', 'B002']);
    setMonthlyPlan(plan);
  }, [selectedMonth, generateMonthlyPlan]);
  
  return (
    <div className="monthly-planning-page">
      {/* 月份选择 */}
      <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      
      {/* 月度规划报告 */}
      <MonthlyPlanReport plan={monthlyPlan} />
      
      {/* 操作按钮 */}
      <PlanActions
        onExport={() => exportMonthlyPlan(monthlyPlan)}
        onAdjust={() => openAdjustmentModal(monthlyPlan)}
        onConfirm={() => confirmMonthlyPlan(monthlyPlan)}
      />
    </div>
  );
}
```

---

## 九、定时任务配置

### 9.1 定时任务注册

```typescript
// src/services/ScheduledTasks.ts

import { registerCronJob } from './cron';

// 每天早上 6:00 运行每日规划
registerCronJob('daily-planning', '0 6 * * *', async () => {
  const { generateDailyPlan } = useDailyTaskPlanning();
  const today = new Date().toISOString().split('T')[0];
  
  const plan = await generateDailyPlan(today);
  
  // 保存规划
  await saveDailyPlan(plan);
  
  // 7:00 推送提醒
  setTimeout(() => {
    sendNotificationToManagers({
      type: 'daily_plan_ready',
      title: '今日派工计划已生成',
      body: `今日共有${plan.totalTasks}项任务，总工时${plan.totalHours}小时`,
      data: plan,
    });
  }, 3600000);  // 1 小时后
});

// 生产计划创建后运行月度规划
export function onProductionPlanCreated(batchIds: string[]) {
  const { generateMonthlyPlan } = useMonthlyTaskPlanning();
  const month = new Date().toISOString().slice(0, 7);
  
  generateMonthlyPlan(month, batchIds).then(plan => {
    saveMonthlyPlan(plan);
    sendNotificationToManagers({
      type: 'monthly_plan_ready',
      title: '月度规划已生成',
      body: `${month}共${plan.totalTasks}项任务，预估成本¥${plan.totalCost}`,
      data: plan,
    });
  });
}
```

### 9.2 本地环境模拟

由于原型系统无后端，使用 `setInterval` 模拟定时任务：

```typescript
// src/hooks/useScheduledTasks.ts

export function useScheduledTasks() {
  useEffect(() => {
    // 每日 6:00 模拟（实际使用时可改为手动触发）
    const dailyInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 6 && now.getMinutes() === 0) {
        generateDailyPlan();
      }
    }, 60000);  // 每分钟检查
    
    return () => clearInterval(dailyInterval);
  }, []);
}
```

---

## 十、实施路线图（升级）

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

### 阶段二：每日/月度规划引擎（5-6 天）

**Day 6-8: 每日工单汇总与分析**
- [ ] 创建 `useDailyWorkOrderAnalysis` hook
- [ ] 实现进度分析算法
- [ ] 实现人员负荷分析
- [ ] 实现 AI 建议生成
- [ ] 创建每日报告 UI 组件
- [ ] 编写集成测试

**Day 9-11: 每日任务规划**
- [ ] 创建 `useDailyTaskPlanning` hook
- [ ] 实现定时任务触发（模拟）
- [ ] 实现任务预测和人员匹配
- [ ] 实现派工计划生成
- [ ] 实现推送提醒功能
- [ ] 创建每日规划页面
- [ ] 编写集成测试

### 阶段三：月度规划引擎（4-5 天）

**Day 12-14: 月度规划算法**
- [ ] 创建 `useMonthlyTaskPlanning` hook
- [ ] 实现 30 天任务预测
- [ ] 实现按周/按日汇总
- [ ] 实现物资需求分析
- [ ] 实现工具需求分析
- [ ] 实现人员需求分析
- [ ] 实现成本预估
- [ ] 编写单元测试

**Day 15-16: 月度规划 UI**
- [ ] 创建月度规划页面
- [ ] 创建月度规划报告组件
- [ ] 实现任务日历视图
- [ ] 实现物资/工具/人员需求表格
- [ ] 实现导出功能
- [ ] 编写组件测试

### 阶段四：AI 推荐组件开发（3-4 天）

**Day 17-18: AI 推荐面板**
- [ ] 创建 `AIRecommendationPanel` 组件
- [ ] 实现推荐结果展示
- [ ] 实现选择交互
- [ ] 实现推荐理由展示
- [ ] 编写组件测试

**Day 19-20: AI 优化建议机制**
- [ ] 创建 `useAIOptimization` hook
- [ ] 实现优化建议检测逻辑
- [ ] 创建优化建议弹窗组件
- [ ] 实现接受/拒绝建议交互
- [ ] 编写集成测试

### 阶段五：三个任务系统集成（4-5 天）

**Day 21-22: 农事任务集成**
- [ ] 改造 `TaskFormModal` 组件（增加"待智能推荐"选项）
- [ ] 集成 AI 推荐面板
- [ ] 实现派发状态流转
- [ ] 测试完整流程

**Day 23-24: 临时任务集成**
- [ ] 改造 `TempTaskFormModal` 组件
- [ ] 集成 AI 推荐面板
- [ ] 实现紧急任务特殊处理
- [ ] 测试完整流程

**Day 25: 巡查反馈任务集成**
- [ ] 改造问题分派弹窗（默认 AI 推荐）
- [ ] 集成 AI 推荐面板
- [ ] 实现病虫害问题特殊处理
- [ ] 测试完整流程

### 阶段六：智能派工确认页面（3-4 天）

**Day 26-27: 确认页面开发**
- [ ] 重构 `SmartDispatchPage.tsx`
- [ ] 实现待确认任务列表
- [ ] 实现按状态分组显示
- [ ] 实现单个任务操作（接受/更换/延后）
- [ ] 实现批量确认功能

**Day 28-29: 预测任务自动派发**
- [ ] 连接任务预测引擎
- [ ] 实现置信度≥80%自动派发
- [ ] 实现置信度<80%进入待确认队列
- [ ] 实现派发后状态更新
- [ ] 测试完整流程

### 阶段七：测试优化（3-4 天）

**Day 30-32: 全场景测试**
- [ ] 模式切换测试
- [ ] 状态流转测试
- [ ] 每日规划测试
- [ ] 月度规划测试
- [ ] AI 推荐准确性测试
- [ ] 优化建议机制测试
- [ ] 三种任务系统流程测试
- [ ] 边界场景测试
- [ ] 性能测试
- [ ] 修复 Bug

**Day 33: 上线准备**
- [ ] 编写用户文档
- [ ] 准备培训材料
- [ ] 灰度发布计划

---

## 十一、关键文件清单（升级）

| 文件 | 说明 | 状态 |
|------|------|------|
| `src/types/dispatch.ts` | 扩展派发状态和模式类型 | 新增 |
| `src/types/planning.ts` | 每日/月度规划类型定义 | 新增 |
| `src/hooks/useDispatchModeConfig.ts` | 模式配置管理 | 新增 |
| `src/hooks/useUnifiedTaskCreation.ts` | 统一任务创建入口 | 新增 |
| `src/hooks/useAIOptimization.ts` | AI 优化建议检测 | 新增 |
| `src/hooks/useDailyWorkOrderAnalysis.ts` | 每日工单汇总分析 | 新增 |
| `src/hooks/useDailyTaskPlanning.ts` | 每日任务规划 | 新增 |
| `src/hooks/useMonthlyTaskPlanning.ts` | 月度任务规划 | 新增 |
| `src/hooks/useScheduledTasks.ts` | 定时任务管理 | 新增 |
| `src/components/labor/dispatch/AIRecommendationPanel.tsx` | AI 推荐面板组件 | 新增 |
| `src/components/labor/dispatch/OptimizationSuggestionModal.tsx` | 优化建议弹窗 | 新增 |
| `src/components/planning/DailyWorkOrderReport.tsx` | 每日工单报告 | 新增 |
| `src/components/planning/MonthlyPlanReport.tsx` | 月度规划报告 | 新增 |
| `src/pages/SmartDispatch.tsx` | 智能派工确认页面 | 重构 |
| `src/pages/DailyPlanningPage.tsx` | 每日规划页面 | 新增 |
| `src/pages/MonthlyPlanningPage.tsx` | 月度规划页面 | 新增 |
| `src/components/farm/taskDispatch/TaskDispatchPage.tsx` | 农事任务页面改造 | 修改 |
| `src/components/labor/tempTask/TempTaskPage.tsx` | 临时任务页面改造 | 修改 |
| `src/components/farm/problemDispatch/ProblemDispatchPage.tsx` | 巡查问题页面改造 | 修改 |
| `src/hooks/useTasks.ts` | 任务 Hook 扩展 | 修改 |
| `src/hooks/useTempTasks.ts` | 临时任务 Hook 扩展 | 修改 |
| `src/hooks/useProblemDispatch.ts` | 问题派发 Hook 扩展 | 修改 |

---

## 十二、验证方案

### 12.1 模式 1（纯人工）测试
1. [ ] 新建农事任务，手动选择执行人 A
2. [ ] AI 后台检测到执行人 B 更优，弹出优化建议
3. [ ] 接受建议后执行人变为 B
4. [ ] 拒绝建议后执行人保持 A

### 12.2 模式 2（AI 辅助）测试
1. [ ] 新建农事任务，选择"待智能推荐"
2. [ ] 任务 dispatchStatus = 'pending_ai'
3. [ ] AI 推荐生成，dispatchStatus = 'recommended'
4. [ ] 显示 AI 推荐 Top3，默认选中第一名
5. [ ] 确认推荐后任务派发成功，dispatchStatus = 'pending'

### 12.3 模式 3（AI 全自动）测试
1. [ ] 触发环境告警（土壤湿度低）
2. [ ] 自动生成灌溉任务，dispatchStatus = 'pending_ai'
3. [ ] AI 自动匹配执行人，置信度 90%
4. [ ] 自动派发（≥80% 阈值），dispatchStatus = 'pending'
5. [ ] 执行人收到通知

### 12.4 巡查问题测试
1. [ ] 提交新巡查问题
2. [ ] 打开分派弹窗，默认显示 AI 推荐
3. [ ] 确认推荐后创建关联任务
4. [ ] 任务进入"待接受"状态

### 12.5 每日规划测试
1. [ ] 模拟每日 6:00 触发规划
2. [ ] 生成每日工单汇总报告
3. [ ] 进度分析正确（提前/正常/推迟/未完成）
4. [ ] AI 派工建议生成
5. [ ] 7:00 前推送提醒

### 12.6 月度规划测试
1. [ ] 创建生产计划后触发月度规划
2. [ ] 生成未来 30 天任务预测
3. [ ] 按周/按日汇总正确
4. [ ] 物资/工具/人员需求分析正确
5. [ ] 成本预估准确
6. [ ] 任务日历视图显示正确

### 12.7 状态流转测试
1. [ ] draft → pending_ai → recommended → pending → accepted → in_progress → completed
2. [ ] 各状态切换的 UI 表现正确
3. [ ] 状态变更后数据同步正确

---

## 十三、总结

本方案深度融合了参考方案的核心设计与我的架构设计，并新增每日/月度规划功能：

### 核心融合点

1. **任务派发状态机**：引入 `pending_ai` → `recommended` → `pending` 的完整状态流转
2. **三模式并行**：`manual` / `ai_assisted` / `ai_auto` 三种派发模式
3. **统一任务模型**：`UnifiedDispatchTask` 整合派发状态、模式、AI 推荐等字段
4. **AI 优化建议机制**：对已手动选择执行人的任务，AI 检测更优人选并弹窗建议
5. **巡查问题默认 AI**：分派弹窗默认显示 AI 推荐，支持手动切换
6. **预测任务自动派发**：置信度≥80% 自动派发，<80% 进入待确认队列

### 新增核心功能

7. **每日工单汇总分析**：每天早上自动汇总任务，分析进度偏差，生成报告
8. **每日任务规划**：6:00 自动运行，7:00 前推送提醒，一键确认派发
9. **月度任务规划**：生产计划创建后自动生成 30 天规划，含物资/工具/人员需求
10. **任务日历**：可视化展示每日任务，支持预览和导出

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
5. **每日工单分析**：新增进度分析和人员负荷分析
6. **每日/月度规划**：新增定时规划引擎和报告页面

通过本方案的实施，系统将实现从"手动选择执行人"到"AI 推荐 + 人工确认"再到"AI 自动预测 + 批量确认"的平滑演进，同时保留人工最终决策权，确保 AI 始终是辅助角色。

每日/月度规划功能将使管理者能够：
- **每天早上 7:00 前**收到当日派工计划提醒
- **提前 30 天**预览月度任务和资源需求
- **实时分析**任务进度偏差（提前/正常/推迟/未完成）
- **科学决策**基于数据和 AI 建议优化派工计划
