# AI智能派工系统整合方案

## 一、核心需求理解

管理者需要的是一个**AI智能派工引擎**，它能够：

1. **读取生产批次** → 获取作物种类、生长阶段、种植区域、计划时间
2. **结合作物生长周期规则** → 推断当前阶段应该执行哪些农事活动（灌溉、施肥、植保、修剪、采收等）
3. **匹配人员技能** → 找到具备对应技能标签的员工
4. **检查人员工作状态** → 判断谁当前空闲、谁在忙
5. **综合判断** → 给出最优的任务生成建议和人员分配建议
6. **由管理者决定** → AI提供建议，最终是否派发由管理人员确认

---

## 二、系统数据基础（已存在）

### 2.1 生产批次数据 (CropBatch)
- `batchCode`: 批次编号
- `cropName`: 作物名称（番茄、黄瓜、草莓等）
- `variety`: 品种
- `greenhouseName`: 种植区域
- `stage`: 生长阶段（seedling苗期 | vegetative生长期 | flowering开花期 | fruiting结果期 | harvest采收期）
- `startDate`: 开始日期
- `expectedHarvestDate`: 预计收获日期
- `plantingArea`: 种植面积
- `status`: 批次状态
- `responsiblePerson`: 负责人

### 2.2 作物生长阶段任务规则 (CROP_STAGE_TASK_MAP)

已定义在 `recommendationRules.ts` 中，例如：
```
番茄 → 苗期: [灌溉, 施肥, 植保]  间隔3天
番茄 → 生长期: [定植, 灌溉, 施肥, 修剪]  间隔5天
番茄 → 开花期: [灌溉, 施肥, 植保, 修剪]  间隔4天
番茄 → 结果期: [灌溉, 施肥, 植保, 采收, 修剪]  间隔3天
番茄 → 采收期: [采收, 修剪, 植保]  间隔2天
```

### 2.3 技能-操作映射 (SKILL_OPERATION_MAP)

```
irrigation灌溉 → [微喷灌溉, 滴灌操作, 水肥一体化]
fertilization施肥 → [基肥施用, 追肥操作, 水肥一体化]
pest_control植保 → [农药配制, 喷雾操作, 生物防治, 病害识别, 虫害识别]
pruning修剪 → [嫁接技术]
harvest采收 → [果蔬采收, 分级包装, 冷链处理]
```

### 2.4 人员技能档案

```typescript
interface StaffSkill {
  staffId: string;
  staffName: string;
  skills: SkillItem[]; // { tag: SkillTag, level: SkillLevel }
}
```

### 2.5 现有任务系统

- **农事任务**: 来自生产批次计划，通过 `useTasks` 管理
- **临时任务**: 计划外突发任务，通过 `useTempTasks` 管理
- **巡查反馈任务**: 来自巡查发现问题，通过 `useProblemDispatch` 管理

---

## 三、AI智能派工引擎设计

### 3.1 引擎架构

```
┌──────────────────────────────────────────────────────────────┐
│                    AI智能派工引擎                              │
│                                                              │
│  ┌────────────────┐   ┌───────────────┐   ┌───────────────┐  │
│  │ 任务预测模块    │   │ 人员匹配模块   │   │ 决策建议模块   │  │
│  │                │   │               │   │               │  │
│  │ ·读取生产批次  │   │ ·技能匹配     │   │ ·生成任务建议  │  │
│  │ ·解析生长阶段  │   │ ·负荷检查     │   │ ·推荐执行人   │  │
│  │ ·匹配阶段规则  │   │ ·位置匹配     │   │ ·说明推荐理由  │  │
│  │ ·生成待办任务  │   │ ·历史表现     │   │ ·预估时间     │  │
│  └────────┬───────┘   └───────┬───────┘   └───────┬───────┘  │
│           │                   │                   │          │
│           └───────────────────┼───────────────────┘          │
│                               ▼                              │
│                    ┌────────────────────┐                    │
│                    │  派工建议面板(UI)   │                    │
│                    │  管理者确认后派发   │                    │
│                    └────────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 任务预测模块 (useTaskPrediction)

**核心逻辑**: 遍历所有"执行中"的生产批次，根据作物种类和生长阶段，推断需要执行的农事活动。

```typescript
// src/hooks/useTaskPrediction.ts

interface PredictedTask {
  id: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  stage: string;
  stageName: string;
  operationType: FarmOperationType;  // irrigation/fertilization/pest_control等
  operationName: string;
  greenhouseName: string;
  plantingArea: number;
  suggestedDate: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  urgencyReason: string;  // 为什么紧急（如：超期未灌溉、病虫害高发期等）
  estimatedHours: number;
  requiredSkills: SkillTag[];
  isOverdue: boolean;       // 是否超期
  daysSinceLastTask: number; // 距离上次同类任务的天数
  intervalDays: number;      // 建议间隔天数
}

function predictTasksForBatch(batch: CropBatch, today: string): PredictedTask[] {
  // 1. 获取该作物在当前生长阶段的任务规则
  const stageConfig = CROP_STAGE_TASK_MAP[batch.cropName]?.[batch.stage];
  if (!stageConfig) return [];

  // 2. 计算当前批次已经执行了多少天
  const daysElapsed = calculateDays(batch.startDate, today);

  // 3. 查询该批次最近一次执行各类农事活动的日期
  const lastTasks = getLastOperationDates(batch.id);

  // 4. 根据间隔天数判断哪些任务应该执行
  const predictedTasks: PredictedTask[] = [];

  for (const operationType of stageConfig.tasks) {
    const daysSinceLast = daysElapsed - (lastTasks[operationType] || 0);
    const isOverdue = daysSinceLast >= stageConfig.intervalDays;

    if (isOverdue || daysSinceLast >= stageConfig.intervalDays * 0.8) {
      // 该任务需要执行
      predictedTasks.push({
        id: generateId(),
        batchId: batch.id,
        batchCode: batch.batchCode,
        cropName: batch.cropName,
        stage: batch.stage,
        stageName: getStageName(batch.stage),
        operationType,
        operationName: getOperationName(operationType),
        greenhouseName: batch.greenhouseName,
        plantingArea: batch.plantingArea,
        suggestedDate: today,
        priority: calculatePriority(operationType, daysSinceLast, stageConfig.intervalDays),
        urgencyReason: generateUrgencyReason(operationType, daysSinceLast, stageConfig.intervalDays),
        estimatedHours: estimateHours(operationType, batch.plantingArea),
        requiredSkills: SKILL_OPERATION_MAP[operationType] || [],
        isOverdue,
        daysSinceLastTask: daysSinceLast,
        intervalDays: stageConfig.intervalDays,
      });
    }
  }

  return predictedTasks;
}
```

### 3.3 人员匹配模块 (useWorkerMatching)

**核心逻辑**: 对每个预测出的任务，计算所有员工的匹配度评分。

```typescript
// src/hooks/useWorkerMatching.ts

interface WorkerMatchScore {
  staffId: string;
  staffName: string;
  totalScore: number;      // 综合评分 0-100
  skillMatchScore: number;  // 技能匹配得分
  loadScore: number;        // 负荷得分
  locationScore: number;    // 位置得分
  performanceScore: number; // 表现得分
  isAvailable: boolean;     // 当前是否空闲
  currentTasks: number;     // 当前进行中任务数
  reasons: string[];        // 推荐理由
  conflicts: string[];      // 冲突提示
}

function matchWorkersForTask(
  task: PredictedTask,
  workers: WorkerInfo[],
  currentTasks: Task[]
): WorkerMatchScore[] {
  return workers.map(worker => {
    // 1. 技能匹配 (权重40%)
    const skillMatchScore = calculateSkillMatch(
      worker.skills.map(s => s.tag),
      task.requiredSkills
    );

    // 2. 当前负荷 (权重25%)
    const activeTaskCount = countActiveTasks(worker.staffId, currentTasks);
    const loadScore = Math.max(0, 100 - activeTaskCount * 20);

    // 3. 位置匹配 (权重20%)
    const locationScore = calculateLocationScore(
      worker.currentWorkZone,
      task.greenhouseName
    );

    // 4. 历史表现 (权重15%)
    const performanceScore = getWorkerPerformanceScore(worker.staffId);

    // 综合评分
    const totalScore = Math.round(
      skillMatchScore * 0.40 +
      loadScore * 0.25 +
      locationScore * 0.20 +
      performanceScore * 0.15
    );

    // 判断是否空闲
    const isAvailable = activeTaskCount < 2;

    // 生成推荐理由
    const reasons = generateMatchReasons(
      skillMatchScore, loadScore, locationScore, performanceScore, worker
    );

    return {
      staffId: worker.staffId,
      staffName: worker.name,
      totalScore,
      skillMatchScore,
      loadScore,
      locationScore,
      performanceScore,
      isAvailable,
      currentTasks: activeTaskCount,
      reasons,
      conflicts: [],
    };
  }).sort((a, b) => b.totalScore - a.totalScore);
}
```

### 3.4 决策建议模块 (useDispatchRecommendation)

**核心逻辑**: 将预测任务和人员匹配结果组合，生成完整派工建议。

```typescript
// src/hooks/useDispatchRecommendation.ts

interface DispatchRecommendation {
  taskId: string;
  taskSummary: string;     // "A区番茄-结果期-灌溉任务"
  operationType: string;
  operationName: string;
  batchCode: string;
  greenhouseName: string;
  cropName: string;
  stageName: string;
  predictedDate: string;
  priority: string;
  urgencyReason: string;
  estimatedHours: number;
  
  // 推荐执行人（前3名）
  topWorkers: WorkerMatchScore[];
  
  // AI建议
  suggestedAction: 'dispatch' | 'delay' | 'split';
  suggestedWorker: string | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceScore: number;  // 0-100
  
  // 完整推荐理由
  aiReason: string;
  
  // 风险提示
  risks: string[];
}

function generateDispatchRecommendations(
  predictedTasks: PredictedTask[],
  allWorkers: WorkerInfo[],
  currentTasks: Task[]
): DispatchRecommendation[] {
  return predictedTasks.map(task => {
    const matchedWorkers = matchWorkersForTask(task, allWorkers, currentTasks);
    const topWorker = matchedWorkers[0];

    // 判断置信度
    const confidenceScore = topWorker?.totalScore || 0;
    const confidenceLevel = confidenceScore >= 80 ? 'high' : 
                           confidenceScore >= 60 ? 'medium' : 'low';

    // 判断建议动作
    let suggestedAction: 'dispatch' | 'delay' | 'split' = 'dispatch';
    if (confidenceScore < 40) {
      suggestedAction = 'delay';  // 没有合适的人，建议延后
    } else if (task.plantingArea > 500 && topWorker) {
      suggestedAction = 'split';  // 面积大，建议拆分给多人
    }

    // 生成AI推荐理由
    const aiReason = generateAIReason(task, topWorker, matchedWorkers);

    // 生成风险提示
    const risks = generateRisks(task, topWorker, matchedWorkers);

    return {
      taskId: task.id,
      taskSummary: `${task.greenhouseName}${task.cropName}-${task.stageName}-${task.operationName}`,
      operationType: task.operationType,
      operationName: task.operationName,
      batchCode: task.batchCode,
      greenhouseName: task.greenhouseName,
      cropName: task.cropName,
      stageName: task.stageName,
      predictedDate: task.suggestedDate,
      priority: task.priority,
      urgencyReason: task.urgencyReason,
      estimatedHours: task.estimatedHours,
      topWorkers: matchedWorkers.slice(0, 3),
      suggestedAction,
      suggestedWorker: topWorker?.staffId || null,
      confidenceLevel,
      confidenceScore,
      aiReason,
      risks,
    };
  });
}
```

---

## 四、UI设计 - AI派工建议面板

### 4.1 页面入口

在任务中心或独立页面增加 **"AI智能派工建议"** 入口：

```
┌─────────────────────────────────────────────────┐
│ 任务中心                                         │
├─────────────────────────────────────────────────┤
│                                                  │
│  [📋 我的任务] [🤖 AI派工建议] [⚙️ 设置]        │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.2 AI派工建议页面布局

```
┌────────────────────────────────────────────────────────────────────┐
│ 🤖 AI智能派工建议                                                   │
│ 基于生产批次、作物生长周期、人员技能和工作状态的综合分析             │
│                                                                    │
│ [🔄 刷新分析]  [📊 查看分析详情]  [✅ 一键确认全部派发]            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ 📊 分析概览                                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│ │ 执行中   │ │ 预测待办 │ │ 高置信度 │ │ 需人工   │              │
│ │ 批次: 5  │ │ 任务: 12 │ │ 建议: 8  │ │ 决策: 4  │              │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ 派工建议列表                                                        │
│ ───────────────────────────────────────────────────────────────── │
│                                                                    │
│ ┌─ 🟢 高置信度 ──────────────────────────────────────────────────┐│
│ │                                                                ││
│ │ 📋 A区番茄-结果期-灌溉任务                                      ││
│ │ ├ 生产批次: SC20260401-001                                     ││
│ │ ├ 作物阶段: 结果期 (已生长45天, 建议间隔3天, 已超期2天)         ││
│ │ ├ 种植面积: 200m²                                              ││
│ │ ├ 预估工时: 2小时                                               ││
│ │ └ 优先级: 🔴 高 (超期未灌溉)                                    ││
│ │                                                                ││
│ │ 👤 AI推荐执行人: 萧峰 (92分)                                    ││
│ │    · 技能匹配: 持有[滴灌操作、水肥一体化]，匹配度100%            ││
│ │    · 当前负荷: 空闲（0个进行中任务）                            ││
│ │    · 位置: 当前在A区，距离任务地点0.5km                         ││
│ │    · 近期表现: 92分，任务按时完成率98%                          ││
│ │                                                                ││
│ │ 备选: 虚竹(78分)、袁承志(71分)                                  ││
│ │                                                                ││
│ │ [✅ 确认派发] [✏️ 更换人员] [⏰ 延后]                          ││
│ │                                                                ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ ┌─ 🟡 中置信度 ──────────────────────────────────────────────────┐│
│ │                                                                ││
│ │ 📋 B区黄瓜-开花期-植保任务                                      ││
│ │ ├ 生产批次: SC20260402-003                                     ││
│ │ ├ 作物阶段: 开花期 (已生长28天, 建议间隔4天, 即将到期)          ││
│ │ ├ 种植面积: 150m²                                              ││
│ │ └ 优先级: 🟡 中 (开花期病虫害高发)                              ││
│ │                                                                ││
│ │ 👤 AI推荐执行人: 石破天 (65分)                                  ││
│ │    · 技能匹配: 持有[农药配制、喷雾操作、生物防治]，匹配度100%    ││
│ │    · 当前负荷: 较忙（2个进行中任务）                            ││
│ │    · 位置: 当前在B区，距离任务地点0.5km                         ││
│ │                                                                ││
│ │ ⚠️ 风险提示: 推荐人员当前有2个任务在进行中                      ││
│ │                                                                ││
│ │ 备选: 无更合适的候选人                                          ││
│ │                                                                ││
│ │ [✅ 确认派发] [✏️ 更换人员] [⏰ 延后]                          ││
│ │                                                                ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ ┌─ 🔴 低置信度/需人工决策 ───────────────────────────────────────┐│
│ │                                                                ││
│ │ 📋 C区草莓-采收期-采收任务                                      ││
│ │ ├ 生产批次: SC20260403-002                                     ││
│ │ ├ 作物阶段: 采收期 (已生长110天, 建议间隔2天, 已超期1天)        ││
│ │ ├ 种植面积: 300m² (面积较大)                                    ││
│ │ └ 优先级: 🟠 高 (采收期，延迟影响品质)                          ││
│ │                                                                ││
│ │ 👤 AI推荐执行人: 虚竹 (58分)                                    ││
│ │    · 技能匹配: 持有[果蔬采收、分级包装]，匹配度80%              ││
│ │    · 当前负荷: 较忙（1个进行中任务）                            ││
│ │                                                                ││
│ │ ⚠️ AI建议: 建议拆分任务，分配给2人协作完成                      ││
│ │                                                                ││
│ │ [✅ 确认派发] [✏️ 更换人员] [⏰ 延后] [👥 拆分任务]            ││
│ │                                                                ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 4.3 分析详情面板

点击"查看分析详情"可展开：

```
┌──────────────────────────────────────────────────┐
│ 📊 AI分析详情                                     │
├──────────────────────────────────────────────────┤
│                                                  │
│ 生产批次分析                                      │
│ ┌──────────────────────────────────────────────┐ │
│ │ 批次    │ 作物 │ 阶段   │ 生长天数 │ 状态     │ │
│ │ SC-001  │ 番茄 │ 结果期 │ 45天     │ 🟢正常   │ │
│ │ SC-002  │ 黄瓜 │ 开花期 │ 28天     │ 🟡即将到期│ │
│ │ SC-003  │ 草莓 │ 采收期 │ 110天    │ 🔴超期   │ │
│ │ SC-004  │ 茄子 │ 生长期 │ 20天     │ 🟢正常   │ │
│ │ SC-005  │ 辣椒 │ 苗期   │ 8天      │ 🟢正常   │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ 人员工作状态                                      │
│ ┌──────────────────────────────────────────────┐ │
│ │ 姓名 │ 当前位置 │ 进行中 │ 技能数 │ 状态     │ │
│ │ 萧峰 │ A区      │ 0      │ 5      │ 🟢空闲   │ │
│ │ 虚竹 │ C区      │ 1      │ 3      │ 🟡较忙   │ │
│ │ 狄云 │ A区      │ 2      │ 4      │ 🔴繁忙   │ │
│ │ 石破天│ B区     │ 2      │ 3      │ 🔴繁忙   │ │
│ │ 胡斐 │ D区      │ 0      │ 5      │ 🟢空闲   │ │
│ │ 袁承志│ A区     │ 1      │ 5      │ 🟡较忙   │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ 任务预测依据                                      │
│ · 番茄-结果期: 需要灌溉/施肥/植保/采收/修剪       │
│   上次灌溉: 2天前 (建议3天) → 超期，需执行        │
│   上次施肥: 4天前 (建议3天) → 超期，需执行        │
│   上次植保: 5天前 (建议3天) → 超期，需执行        │
│ · 黄瓜-开花期: 需要灌溉/施肥/植保                 │
│   上次灌溉: 3天前 (建议3天) → 即将到期            │
│ · ...                                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 五、实施步骤

### 阶段一：核心算法Hook开发（3-4天）

1. **useTaskPrediction** - 任务预测模块
   - 读取生产批次列表
   - 根据作物生长阶段匹配规则
   - 计算间隔天数，判断哪些任务需要执行
   - 生成预测任务列表

2. **useWorkerMatching** - 人员匹配模块
   - 读取人员技能档案
   - 读取当前任务状态（判断负荷）
   - 计算技能匹配度、负荷得分、位置得分、表现得分
   - 返回排序后的匹配结果

3. **useDispatchRecommendation** - 决策建议模块
   - 组合预测任务和人员匹配
   - 生成置信度评分
   - 生成推荐理由和风险提示
   - 返回完整派工建议

### 阶段二：UI组件开发（3-4天）

4. **AIDispatchPage** - AI派工建议页面
   - 分析概览卡片
   - 派工建议列表（按置信度分组）
   - 每条建议的详细信息展示
   - 操作按钮（确认派发/更换人员/延后/拆分）

5. **AnalysisDetailPanel** - 分析详情面板
   - 生产批次分析表
   - 人员工作状态表
   - 任务预测依据说明

6. **DispatchConfirmModal** - 派发确认弹窗
   - 显示任务详情和推荐人员
   - 允许更换执行人
   - 确认后调用对应任务系统创建任务

### 阶段三：与现有系统集成（2-3天）

7. 连接到三个任务派发系统
   - 农事任务：调用 `useTasks.createTask()`
   - 临时任务：调用 `useTempTasks.addTempTask()`
   - 巡查反馈：调用 `useProblemDispatch.dispatchProblem()`

8. 数据同步
   - 派发后更新预测任务状态
   - 刷新人员负荷
   - 更新分析结果

### 阶段四：测试优化（2-3天）

9. 使用现有mock数据测试完整流程
10. 优化推荐理由的准确性和可读性
11. 调整权重和阈值

---

## 六、关键数据结构

```typescript
// 完整AI派工引擎Hook
interface UseSmartDispatchEngineReturn {
  // 输入数据
  activeBatches: CropBatch[];
  allWorkers: WorkerInfo[];
  currentTasks: Task[];
  tempTasks: TempTask[];
  
  // 预测结果
  predictedTasks: PredictedTask[];
  
  // 匹配结果
  workerMatches: Record<string, WorkerMatchScore[]>;
  
  // 最终建议
  recommendations: DispatchRecommendation[];
  
  // 操作
  refreshAnalysis: () => void;
  confirmDispatch: (taskId: string, workerId: string) => Promise<void>;
  delayTask: (taskId: string, newDate: string) => void;
  splitTask: (taskId: string, workers: string[]) => void;
  dismissRecommendation: (taskId: string) => void;
  
  // 状态
  isLoading: boolean;
  lastAnalysisTime: string | null;
}
```

---

## 七、扩展性设计

### 7.1 可配置权重

```typescript
interface MatchingWeights {
  skillMatch: number;      // 默认40%
  currentLoad: number;     // 默认25%
  location: number;        // 默认20%
  performance: number;     // 默认15%
}
```

### 7.2 可配置规则扩展

```typescript
interface PredictionRules {
  // 自定义任务间隔调整
  intervalAdjustments: Record<string, number>;
  // 季节性调整
  seasonalAdjustments: Record<string, number>;
  // 天气影响
  weatherImpact: Record<string, number>;
}
```

### 7.3 未来可扩展

- 接入天气数据，下雨前暂停灌溉建议
- 接入IoT传感器数据，土壤湿度低时优先推荐灌溉
- 根据历史任务完成时间，动态调整预估工时
- 接入考勤系统，自动排除请假人员
- 多目标优化：成本最低、效率最高、满意度最优
