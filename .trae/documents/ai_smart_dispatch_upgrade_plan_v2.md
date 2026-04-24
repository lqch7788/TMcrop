# AI 智能派工系统 - 优化升级方案 v2.0

## 一、现状问题诊断

基于对农事管理系统的全面代码审查，发现以下关键问题：

### 1.1 当前智能派工系统的局限性

#### 算法层面
1. **推荐算法过于简单**
   - 当前实现：仅基于任务描述文本相似度匹配
   - 缺失因素：作物生长周期、天气环境、人员技能、工作负荷、历史表现
   - 准确性低：无法提供真正智能化的派工建议

2. **权重配置硬编码**
   - 位置：`recommendAlgorithm.ts` 中硬编码权重值
   - 问题：无法动态调整，难以适应不同场景
   - 维护困难：每次调整需修改代码

3. **缺少预测性派工**
   - 当前模式：被动响应（已有任务才推荐）
   - 缺失能力：基于生产批次和作物生长阶段预测未来任务
   - 后果：无法提前安排人员和资源

4. **数据孤岛问题**
   - 生产批次数据 ↔ 任务数据 ↔ 人员数据 相互独立
   - 缺少统一的数据聚合层
   - 无法进行跨维度综合分析

#### 架构层面
5. **算法与 UI 耦合**
   - SmartDispatchPage 混入了过多业务逻辑
   - 推荐算法分散在多个文件中
   - 难以独立测试和优化算法

6. **缺少统一的任务视图**
   - 农事任务、临时任务、巡查反馈任务分散管理
   - 缺少全局任务池概念
   - 无法进行跨任务类型的优化调度

7. **数据流不完整**
   - 生产批次 → 任务预测 → 人员匹配 → 派工决策 的链路未打通
   - 环境数据（天气、IoT 传感器）未纳入派工决策
   - 历史任务执行数据未用于优化推荐

### 1.2 业务场景差距

| 业务需求 | 当前能力 | 差距 |
|---------|---------|------|
| 根据作物生长阶段自动预测任务 | ❌ 无 | 需建立生长阶段 - 任务规则映射 |
| 考虑天气预报调整派工计划 | ❌ 无 | 需接入天气数据并建立影响规则 |
| 根据土壤湿度等传感器数据触发灌溉任务 | ❌ 无 | 需接入 IoT 传感器并建立告警规则 |
| 技能匹配度评估 | ⚠️ 基础文本匹配 | 需建立技能标签体系和认证机制 |
| 人员负荷均衡 | ❌ 无 | 需实时计算人员当前任务负荷 |
| 紧急任务优先调度 | ⚠️ 简单优先级 | 需建立多维度紧急度评估模型 |
| 任务路径优化（同区域批量派发） | ❌ 无 | 需建立地理位置聚类和路径算法 |
| 历史表现影响派工 | ❌ 无 | 需建立人员绩效评估体系 |

---

## 二、优化升级目标

### 2.1 核心目标

构建**预测性、自适应、全维度**的 AI 智能派工引擎 2.0：

1. **预测性**：从"被动响应"升级为"主动预测"
   - 基于生产批次和作物生长阶段预测未来 7 天任务
   - 提前安排人员和资源

2. **全维度**：综合考虑 10+ 维度影响因素
   - 生产因素：作物种类、生长阶段、种植面积、超期天数
   - 环境因素：天气预报、IoT 传感器、病虫害预警
   - 人员因素：技能档案、当前负荷、位置、历史表现
   - 任务因素：紧急程度、复杂度、依赖关系

3. **自适应**：动态调整推荐策略
   - 根据季节调整任务间隔规则
   - 根据天气调整优先级
   - 根据人员可用性动态匹配

### 2.2 量化指标

| 指标 | 当前值 | 目标值 | 提升 |
|------|--------|--------|------|
| 任务预测准确率 | - | ≥85% | 新增 |
| 推荐接受率 | ~30% | ≥75% | +45% |
| 超期任务比例 | ~25% | ≤10% | -15% |
| 人员负荷均衡度 | - | ≥80% | 新增 |
| 派工决策时间 | ~5 分钟/任务 | ≤1 分钟/任务 | -80% |

---

## 三、架构升级设计

### 3.1 新架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    数据源层                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │生产批次  │  │天气预报  │  │IoT 传感器 │  │巡查反馈  │    │
│  │          │  │          │  │          │  │          │    │
│  │·批次状态 │  │·温度     │  │·土壤湿度 │  │·问题分类 │    │
│  │·生长阶段 │  │·湿度     │  │·EC/pH    │  │·严重程度 │    │
│  │·面积     │  │·降雨     │  │·光照     │  │·紧急程度 │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │人员档案  │  │历史任务  │  │物资设备  │  │日历排期  │    │
│  │          │  │          │  │          │  │          │    │
│  │·技能     │  │·执行记录│  │·库存     │  │·节假日   │    │
│  │·负荷     │  │·完成率  │  │·状态     │  │·最佳时间 │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 数据聚合层 (新)                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useDispatchFactors Hook                              │   │
│  │  - 统一聚合所有影响因素数据                           │   │
│  │  - 数据清洗和校验                                     │   │
│  │  - 提供标准化的数据接口                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  规则引擎层 (新)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  规则配置中心                                         │   │
│  │  - 作物生长阶段任务规则 (recommendationRules.ts 扩展)  │   │
│  │  - 环境告警触发规则                                   │   │
│  │  - 病虫害预警规则                                     │   │
│  │  - 天气影响规则                                       │   │
│  │  - 季节性调整规则                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   核心引擎层                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │任务预测引擎  │  │人员匹配引擎  │  │决策建议引擎  │      │
│  │              │  │              │  │              │      │
│  │·生长周期分析 │  │·技能匹配     │  │·置信度评分   │      │
│  │·间隔天数计算 │  │·负荷均衡     │  │·理由生成     │      │
│  │·超期检测     │  │·位置优化     │  │·风险提示     │      │
│  │·告警触发     │  │·表现评估     │  │·动作建议     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI 展示层                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AI 派工建议页面 (SmartDispatchPage 重构)              │   │
│  │  - 分析概览卡片（生产/环境/人员）                     │   │
│  │  - 派工建议列表（按置信度分组）                       │   │
│  │  - 全维度因素展示                                     │   │
│  │  - 推荐理由和风险提示                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心模块设计

#### 模块 1：数据聚合层

```typescript
// src/hooks/useDispatchFactors.ts

interface DispatchFactors {
  // 生产因素
  activeBatches: CropBatch[];
  cropStageRules: CropStageTaskMap;
  lastTaskDates: Record<string, string>;
  
  // 环境因素
  weatherForecast: WeatherData;
  sensorReadings: SensorData[];
  inspectionIssues: InspectionRecord[];
  envAlerts: EnvAlertRule[];
  pestAlerts: PestAlertRule[];
  
  // 人员因素
  workers: WorkerInfo[];
  workerSkills: StaffSkill[];
  currentTasks: Task[];
  attendanceRecords: AttendanceRecord[];
  
  // 其他因素
  materialInventory: MaterialStock[];
  equipmentStatus: EquipmentStatus[];
  calendar: CalendarConfig;
}

export function useDispatchFactors(): {
  factors: DispatchFactors;
  isLoading: boolean;
  refresh: () => void;
} {
  // 聚合所有数据源
  const productionBatches = useProductionBatches();
  const weatherData = useWeatherForecast();
  const sensorData = useIoTSensors();
  const workerData = useWorkerProfiles();
  const taskData = useAllTasks();
  // ...
  
  return {
    factors: {
      activeBatches: productionBatches.filter(b => b.status === 'in_progress'),
      cropStageRules: CROP_STAGE_TASK_MAP,
      weatherForecast: weatherData,
      // ...
    },
    isLoading,
    refresh,
  };
}
```

#### 模块 2：规则引擎层

```typescript
// src/rules/taskPredictionRules.ts

interface TaskPredictionRule {
  cropName: string;
  stage: GrowthStage;
  tasks: FarmOperationType[];
  intervalDays: number;
  seasonalAdjustments?: Record<Season, number>;
  weatherTriggers?: WeatherTrigger[];
  envTriggers?: EnvTrigger[];
}

// 作物生长阶段任务规则（扩展 recommendationRules.ts）
export const CROP_STAGE_TASK_RULES: Record<string, TaskPredictionRule[]> = {
  '番茄': [
    {
      cropName: '番茄',
      stage: 'seedling',
      tasks: ['irrigation', 'fertilization'],
      intervalDays: 3,
      seasonalAdjustments: {
        spring: -1,  // 春季间隔减少 1 天
        summer: -2,  // 夏季间隔减少 2 天
        winter: +2,  // 冬季间隔增加 2 天
      },
    },
    {
      cropName: '番茄',
      stage: 'fruiting',
      tasks: ['irrigation', 'fertilization', 'pruning', 'harvest'],
      intervalDays: 3,
      envTriggers: [
        {
          type: 'soil_moisture',
          condition: '<',
          threshold: 40,
          triggerTask: 'irrigation',
          priority: 'urgent',
        },
      ],
    },
  ],
};

// 天气影响规则
export const WEATHER_IMPACT_RULES: WeatherImpactRule[] = [
  {
    operationType: 'irrigation',
    weatherCondition: 'rain',
    forecastHours: 24,
    action: 'delay',
    priority: 'low',
    description: '未来 24 小时有降雨，建议延后灌溉',
  },
  {
    operationType: 'irrigation',
    weatherCondition: 'high_temp',
    threshold: 33,
    action: 'priority',
    priority: 'high',
    description: '高温天气，建议优先安排灌溉',
  },
  {
    operationType: 'pest_control',
    weatherCondition: 'strong_wind',
    threshold: 20,
    action: 'delay',
    priority: 'low',
    description: '大风天气，建议延后喷洒作业',
  },
];

// 环境告警规则
export const ENV_ALERT_RULES: EnvAlertRule[] = [
  {
    type: 'soil_moisture',
    condition: '<',
    threshold: 40,
    triggerTask: 'irrigation',
    priority: 'urgent',
    description: '土壤湿度过低',
  },
  {
    type: 'air_temp',
    condition: '>',
    threshold: 35,
    triggerTask: 'ventilation',
    priority: 'urgent',
    description: '温度过高',
  },
];
```

#### 模块 3：任务预测引擎

```typescript
// src/hooks/useTaskPrediction.ts

interface PredictedTask {
  id: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  stage: string;
  stageName: string;
  operationType: FarmOperationType;
  operationName: string;
  greenhouseName: string;
  plantingArea: number;
  suggestedDate: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  
  // 超期信息
  isOverdue: boolean;
  daysSinceLastTask: number;
  intervalDays: number;
  urgencyReason: string;
  
  // 环境影响
  weatherImpact: {
    affected: boolean;
    impactType: 'rain_delay' | 'heat_priority' | 'cold_priority' | 'wind_delay';
    description: string;
  };
  
  // 环境告警触发
  envAlertTriggered: {
    triggered: boolean;
    alertType: string;
    sensorValue: number;
    threshold: number;
  };
  
  estimatedHours: number;
  requiredSkills: SkillTag[];
}

export function useTaskPrediction(
  factors: DispatchFactors
): {
  predictedTasks: PredictedTask[];
  isLoading: boolean;
} {
  const [predictedTasks, setPredictedTasks] = useState<PredictedTask[]>([]);
  
  useEffect(() => {
    const tasks: PredictedTask[] = [];
    const today = new Date().toISOString().split('T')[0];
    
    // 1. 遍历所有执行中批次
    for (const batch of factors.activeBatches) {
      // 2. 获取该作物在当前生长阶段的任务规则
      const stageRules = CROP_STAGE_TASK_RULES[batch.cropName]?.find(
        r => r.stage === batch.stage
      );
      if (!stageRules) continue;
      
      // 3. 计算生长天数和间隔
      const daysElapsed = calculateDays(batch.startDate, today);
      const lastTasks = getLastOperationDates(batch.id);
      
      // 4. 对每个标准任务，判断是否需要执行
      for (const operationType of stageRules.tasks) {
        const daysSinceLast = daysElapsed - (lastTasks[operationType] || 0);
        const intervalDays = adjustIntervalBySeason(
          stageRules.intervalDays,
          stageRules.seasonalAdjustments,
          today
        );
        const isOverdue = daysSinceLast >= intervalDays;
        const isDueSoon = daysSinceLast >= intervalDays * 0.8;
        
        if (isOverdue || isDueSoon) {
          // 5. 检查天气影响
          const weatherImpact = assessWeatherImpact(
            operationType,
            factors.weatherForecast,
            today
          );
          
          // 6. 检查环境告警
          const envAlert = checkEnvAlertTrigger(
            operationType,
            batch.greenhouseId,
            factors.sensorReadings,
            factors.envAlerts
          );
          
          // 7. 计算优先级
          const priority = calculatePriority(
            operationType,
            daysSinceLast,
            intervalDays,
            envAlert.triggered,
            weatherImpact.affected
          );
          
          // 8. 跳过受天气影响需延后的非紧急任务
          if (weatherImpact.impactType === 'rain_delay' && priority !== 'urgent') {
            continue;
          }
          
          tasks.push({
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
            priority,
            urgencyReason: generateUrgencyReason(operationType, daysSinceLast, intervalDays, envAlert),
            estimatedHours: estimateHours(operationType, batch.plantingArea),
            requiredSkills: getRequiredSkills(operationType),
            isOverdue,
            daysSinceLastTask: daysSinceLast,
            intervalDays,
            weatherImpact,
            envAlertTriggered: envAlert,
          });
        }
      }
      
      // 9. 处理巡查反馈问题触发的任务
      const inspectionTasks = generateTasksFromInspection(
        batch,
        factors.inspectionIssues,
        factors.pestAlerts
      );
      tasks.push(...inspectionTasks);
    }
    
    // 10. 按优先级排序
    setPredictedTasks(
      tasks.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
    );
  }, [factors]);
  
  return { predictedTasks, isLoading: false };
}
```

#### 模块 4：人员匹配引擎

```typescript
// src/hooks/useWorkerMatching.ts

interface WorkerMatchScore {
  staffId: string;
  staffName: string;
  totalScore: number;
  
  // 各维度得分
  skillMatchScore: number;      // 40%
  loadScore: number;            // 25%
  locationScore: number;        // 20%
  performanceScore: number;     // 15%
  
  // 状态信息
  isAvailable: boolean;
  currentTasks: number;
  todayCompletedTasks: number;
  currentWorkZone: string;
  attendanceStatus: 'present' | 'leave' | 'absent';
  
  // 推荐理由
  reasons: string[];
  
  // 冲突提示
  conflicts: string[];
  
  // 技能详情
  skillLevels: Record<SkillTag, SkillLevel>;
  hasRequiredCertification: boolean;
}

interface MatchingWeights {
  skillMatch: number;      // 默认 40%
  currentLoad: number;     // 默认 25%
  location: number;        // 默认 20%
  performance: number;     // 默认 15%
}

export function useWorkerMatching(
  predictedTasks: PredictedTask[],
  factors: DispatchFactors
): {
  workerMatches: Record<string, WorkerMatchScore[]>;
} {
  const [workerMatches, setWorkerMatches] = useState<Record<string, WorkerMatchScore[]>>({});
  
  // 动态权重配置
  const getDynamicWeights = (task: PredictedTask): MatchingWeights => {
    let weights: MatchingWeights = {
      skillMatch: 0.40,
      currentLoad: 0.25,
      location: 0.20,
      performance: 0.15,
    };
    
    // 紧急任务 → 表现权重提升
    if (task.priority === 'urgent') {
      weights.performance = 0.25;
      weights.currentLoad = 0.15;
    }
    
    // 大面积任务 → 负荷权重降低
    if (task.plantingArea > 500) {
      weights.currentLoad = 0.15;
      weights.skillMatch = 0.45;
    }
    
    // 病虫害任务 → 技能权重提升
    if (task.operationType === 'pest_control') {
      weights.skillMatch = 0.50;
      weights.currentLoad = 0.15;
    }
    
    return weights;
  };
  
  useEffect(() => {
    const matches: Record<string, WorkerMatchScore[]> = {};
    
    for (const task of predictedTasks) {
      const weights = getDynamicWeights(task);
      
      matches[task.id] = factors.workers.map(worker => {
        // 1. 技能匹配
        const workerSkills = factors.workerSkills
          .find(ws => ws.staffId === worker.staffId)?.skills || [];
        const skillMatchScore = calculateSkillMatch(
          workerSkills.map(s => s.tag),
          task.requiredSkills
        );
        
        // 2. 当前负荷
        const activeTaskCount = countActiveTasks(worker.staffId, factors.currentTasks);
        const loadScore = Math.max(0, 100 - activeTaskCount * 20);
        
        // 3. 位置匹配
        const locationScore = calculateLocationScore(
          worker.currentWorkZone,
          task.greenhouseName
        );
        
        // 4. 历史表现
        const performanceScore = getWorkerPerformanceScore(worker.staffId);
        
        // 5. 综合得分
        const totalScore = Math.round(
          skillMatchScore * weights.skillMatch +
          loadScore * weights.currentLoad +
          locationScore * weights.location +
          performanceScore * weights.performance
        );
        
        // 6. 判断可用状态
        const attendance = factors.attendanceRecords.find(
          a => a.staffId === worker.staffId && a.date === task.suggestedDate
        );
        const isAvailable = activeTaskCount < 2 && attendance?.status === 'present';
        
        // 7. 生成推荐理由
        const reasons = generateMatchReasons({
          skillMatchScore,
          loadScore,
          locationScore,
          performanceScore,
          worker,
        });
        
        // 8. 生成冲突提示
        const conflicts = [];
        if (activeTaskCount >= 2) {
          conflicts.push(`当前有${activeTaskCount}个进行中任务`);
        }
        if (attendance?.status === 'leave') {
          conflicts.push('今日请假');
        }
        if (skillMatchScore < 60) {
          conflicts.push('技能匹配度较低');
        }
        
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
          todayCompletedTasks: getTodayCompletedTasks(worker.staffId, factors.currentTasks),
          currentWorkZone: worker.currentWorkZone,
          attendanceStatus: attendance?.status || 'present',
          reasons,
          conflicts,
          skillLevels: getSkillLevels(workerSkills),
          hasRequiredCertification: hasCertification(workerSkills, task.requiredSkills),
        };
      }).sort((a, b) => b.totalScore - a.totalScore);
    }
    
    setWorkerMatches(matches);
  }, [predictedTasks, factors]);
  
  return { workerMatches };
}
```

#### 模块 5：决策建议引擎

```typescript
// src/hooks/useDispatchRecommendation.ts

interface DispatchRecommendation {
  taskId: string;
  taskSummary: string;
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
  
  // 推荐人员
  topWorkers: WorkerMatchScore[];
  
  // AI 建议
  suggestedAction: 'dispatch' | 'delay' | 'split' | 'manual';
  suggestedWorker: string | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceScore: number;
  
  // 完整理由
  aiReason: string;
  
  // 风险提示
  risks: string[];
  
  // 全维度因素考虑说明
  factorsConsidered: {
    production: string[];
    environment: string[];
    worker: string[];
    other: string[];
  };
  
  weatherNote: string | null;
  envAlertNote: string | null;
}

export function useDispatchRecommendation(
  predictedTasks: PredictedTask[],
  workerMatches: Record<string, WorkerMatchScore[]>,
  factors: DispatchFactors
): {
  recommendations: DispatchRecommendation[];
} {
  const [recommendations, setRecommendations] = useState<DispatchRecommendation[]>([]);
  
  useEffect(() => {
    const recs: DispatchRecommendation[] = predictedTasks.map(task => {
      const matchedWorkers = workerMatches[task.id] || [];
      const topWorker = matchedWorkers[0];
      
      // 1. 计算置信度
      const confidenceScore = topWorker?.totalScore || 0;
      const confidenceLevel = confidenceScore >= 80 ? 'high' : 
                             confidenceScore >= 60 ? 'medium' : 'low';
      
      // 2. 判断建议动作
      let suggestedAction: 'dispatch' | 'delay' | 'split' | 'manual' = 'dispatch';
      
      if (confidenceScore < 40) {
        suggestedAction = 'manual';  // 没有合适的人，需人工决策
      } else if (confidenceScore < 60) {
        suggestedAction = 'manual';  // 置信度低，需人工决策
      } else if (task.weatherImpact.impactType === 'rain_delay') {
        suggestedAction = 'delay';   // 天气原因延后
      } else if (task.plantingArea > 500 && topWorker) {
        suggestedAction = 'split';   // 面积大，建议拆分
      }
      
      // 3. 生成 AI 推荐理由
      const aiReason = generateAIReason(task, topWorker, matchedWorkers, factors);
      
      // 4. 生成风险提示
      const risks = generateRisks(task, topWorker, matchedWorkers);
      
      // 5. 全维度因素考虑说明
      const factorsConsidered = {
        production: [
          `${task.cropName}-${task.stageName} 标准任务`,
          `已${task.daysSinceLastTask}天未执行（建议${task.intervalDays}天）`,
          `种植面积 ${task.plantingArea}m²`,
        ],
        environment: [],
        worker: [],
        other: [],
      };
      
      if (task.envAlertTriggered.triggered) {
        factorsConsidered.environment.push(
          `环境告警：${task.envAlertTriggered.alertType}`
        );
      }
      if (task.weatherImpact.affected) {
        factorsConsidered.environment.push(task.weatherImpact.description);
      }
      
      if (topWorker) {
        factorsConsidered.worker.push(
          `推荐 ${topWorker.staffName}：技能匹配${topWorker.skillMatchScore}%，` +
          `当前负荷${topWorker.currentTasks}个任务，` +
          `位置${topWorker.currentWorkZone}`
        );
      }
      
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
        factorsConsidered,
        weatherNote: task.weatherImpact.affected ? task.weatherImpact.description : null,
        envAlertNote: task.envAlertTriggered.triggered 
          ? `${task.envAlertTriggered.alertType} (当前值:${task.envAlertTriggered.sensorValue}, 阈值:${task.envAlertTriggered.threshold})`
          : null,
      };
    });
    
    setRecommendations(recs);
  }, [predictedTasks, workerMatches, factors]);
  
  return { recommendations };
}
```

---

## 四、UI 重构设计

### 4.1 AI 派工建议页面（重构版）

```typescript
// src/components/labor/dispatch/SmartDispatchPage.tsx (重构版)

export function SmartDispatchPage() {
  // 1. 聚合所有影响因素数据
  const { factors, isLoading: factorsLoading } = useDispatchFactors();
  
  // 2. 运行任务预测引擎
  const { predictedTasks, isLoading: predictionLoading } = useTaskPrediction(factors);
  
  // 3. 运行人员匹配引擎
  const { workerMatches } = useWorkerMatching(predictedTasks, factors);
  
  // 4. 生成决策建议
  const { recommendations } = useDispatchRecommendation(
    predictedTasks,
    workerMatches,
    factors
  );
  
  // 5. 派发操作
  const { confirmDispatch, delayTask, splitTask, dismissRecommendation } = useDispatchActions();
  
  if (factorsLoading || predictionLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="smart-dispatch-page">
      {/* 顶部分析概览 */}
      <AnalysisOverview factors={factors} recommendations={recommendations} />
      
      {/* 派工建议列表 */}
      <div className="recommendations-list">
        {/* 高置信度建议 */}
        <RecommendationGroup 
          title="🟢 高置信度建议"
          icon="✅"
          recommendations={recommendations.filter(r => r.confidenceLevel === 'high')}
          onConfirm={confirmDispatch}
          onDelay={delayTask}
          onSplit={splitTask}
          onDismiss={dismissRecommendation}
        />
        
        {/* 中置信度建议 */}
        <RecommendationGroup 
          title="🟡 中置信度建议"
          icon="⚠️"
          recommendations={recommendations.filter(r => r.confidenceLevel === 'medium')}
          onConfirm={confirmDispatch}
          onDelay={delayTask}
          onSplit={splitTask}
          onDismiss={dismissRecommendation}
        />
        
        {/* 低置信度/需人工决策 */}
        <RecommendationGroup 
          title="🔴 需人工决策"
          icon="🤔"
          recommendations={recommendations.filter(r => r.confidenceLevel === 'low')}
          onConfirm={confirmDispatch}
          onDelay={delayTask}
          onSplit={splitTask}
          onDismiss={dismissRecommendation}
        />
      </div>
      
      {/* 分析详情面板 */}
      <AnalysisDetailPanel factors={factors} />
    </div>
  );
}
```

### 4.2 推荐卡片组件（增强版）

```typescript
// src/components/labor/dispatch/RecommendationCard.tsx

interface RecommendationCardProps {
  recommendation: DispatchRecommendation;
  onConfirm: (taskId: string, workerId: string) => void;
  onDelay: (taskId: string, newDate: string) => void;
  onSplit: (taskId: string, workers: string[]) => void;
  onDismiss: (taskId: string) => void;
}

export function RecommendationCard({ recommendation, onConfirm, onDelay, onSplit, onDismiss }: RecommendationCardProps) {
  return (
    <div className="recommendation-card">
      {/* 头部：置信度标识 */}
      <div className="card-header">
        <span className={`confidence-badge ${recommendation.confidenceLevel}`}>
          {recommendation.confidenceLevel === 'high' && '🟢'}
          {recommendation.confidenceLevel === 'medium' && '🟡'}
          {recommendation.confidenceLevel === 'low' && '🔴'}
          {recommendation.confidenceLevel === 'high' ? '高置信度' : 
           recommendation.confidenceLevel === 'medium' ? '中置信度' : '低置信度'}
          ({recommendation.confidenceScore}分)
        </span>
        <span className={`priority-badge ${recommendation.priority}`}>
          {getPriorityIcon(recommendation.priority)} {getPriorityText(recommendation.priority)}
        </span>
      </div>
      
      {/* 任务基本信息 */}
      <div className="task-info">
        <h3>{recommendation.taskSummary}</h3>
        <div className="info-grid">
          <InfoItem label="生产批次" value={recommendation.batchCode} />
          <InfoItem label="作物阶段" value={`${recommendation.cropName}-${recommendation.stageName}`} />
          <InfoItem label="种植区域" value={recommendation.greenhouseName} />
          <InfoItem label="种植面积" value={`${recommendation.estimatedHours}小时`} />
        </div>
      </div>
      
      {/* 生产因素 */}
      <div className="factor-section">
        <h4>📊 生产因素</h4>
        <ul>
          {recommendation.factorsConsidered.production.map((factor, idx) => (
            <li key={idx}>{factor}</li>
          ))}
        </ul>
      </div>
      
      {/* 环境因素 */}
      {(recommendation.weatherNote || recommendation.envAlertNote) && (
        <div className="factor-section">
          <h4>🌤️ 环境因素</h4>
          {recommendation.weatherNote && (
            <div className="weather-note">
              <span className="icon">🌤️</span>
              {recommendation.weatherNote}
            </div>
          )}
          {recommendation.envAlertNote && (
            <div className="env-alert-note alert">
              <span className="icon">⚠️</span>
              {recommendation.envAlertNote}
            </div>
          )}
        </div>
      )}
      
      {/* 推荐人员 */}
      <div className="worker-section">
        <h4>👤 AI 推荐执行人</h4>
        {recommendation.topWorkers.map((worker, idx) => (
          <WorkerMatchItem 
            key={worker.staffId}
            worker={worker}
            rank={idx + 1}
            isTopChoice={idx === 0}
          />
        ))}
      </div>
      
      {/* AI 综合建议 */}
      <div className="ai-reason-section">
        <h4>🤖 AI 综合建议</h4>
        <p className="ai-reason">{recommendation.aiReason}</p>
      </div>
      
      {/* 风险提示 */}
      {recommendation.risks.length > 0 && (
        <div className="risk-section">
          <h4>⚠️ 风险提示</h4>
          <ul>
            {recommendation.risks.map((risk, idx) => (
              <li key={idx} className="risk-item">{risk}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="action-buttons">
        {recommendation.suggestedAction === 'dispatch' && (
          <>
            <Button 
              type="primary" 
              icon="✅"
              onClick={() => onConfirm(recommendation.taskId, recommendation.suggestedWorker!)}
            >
              确认派发
            </Button>
            <Button icon="✏️" onClick={() => {/* 打开更换人员弹窗 */}}>
              更换人员
            </Button>
          </>
        )}
        {recommendation.suggestedAction === 'delay' && (
          <>
            <Button 
              type="primary" 
              icon="⏰"
              onClick={() => onDelay(recommendation.taskId, /* 计算新日期 */)}
            >
              延后执行
            </Button>
          </>
        )}
        {recommendation.suggestedAction === 'split' && (
          <>
            <Button 
              type="primary" 
              icon="👥"
              onClick={() => onSplit(recommendation.taskId, /* 选择多个工人 */)}
            >
              拆分任务
            </Button>
          </>
        )}
        {recommendation.suggestedAction === 'manual' && (
          <>
            <Button 
              type="primary" 
              icon="🤔"
              onClick={() => {/* 打开人工选择弹窗 */}}
            >
              人工选择
            </Button>
          </>
        )}
        <Button icon="❌" onClick={() => onDismiss(recommendation.taskId)}>
          忽略
        </Button>
      </div>
    </div>
  );
}
```

---

## 五、实施路线图

### 阶段一：基础架构搭建（4-5 天）

**Day 1-2: 数据聚合层**
- [ ] 创建 `useDispatchFactors` hook
- [ ] 聚合生产批次、天气、传感器、人员、任务数据
- [ ] 实现数据清洗和校验逻辑
- [ ] 编写单元测试

**Day 3-5: 规则引擎层**
- [ ] 扩展 `recommendationRules.ts`
- [ ] 实现作物生长阶段任务规则
- [ ] 实现天气影响规则
- [ ] 实现环境告警规则
- [ ] 实现季节性调整规则
- [ ] 创建规则配置管理 UI（可选）

### 阶段二：核心引擎开发（5-6 天）

**Day 6-8: 任务预测引擎**
- [ ] 创建 `useTaskPrediction` hook
- [ ] 实现生长周期分析逻辑
- [ ] 实现间隔天数计算
- [ ] 实现超期检测
- [ ] 实现天气影响评估
- [ ] 实现环境告警触发
- [ ] 集成巡查反馈问题生成任务
- [ ] 编写集成测试

**Day 9-11: 人员匹配引擎**
- [ ] 创建 `useWorkerMatching` hook
- [ ] 实现技能匹配算法
- [ ] 实现负荷计算
- [ ] 实现位置匹配
- [ ] 实现表现评估
- [ ] 实现动态权重调整
- [ ] 生成推荐理由和冲突提示
- [ ] 编写单元测试

**Day 12-13: 决策建议引擎**
- [ ] 创建 `useDispatchRecommendation` hook
- [ ] 实现置信度评分
- [ ] 实现建议动作判断（dispatch/delay/split/manual）
- [ ] 实现 AI 推荐理由生成
- [ ] 实现风险提示生成
- [ ] 实现全维度因素说明
- [ ] 编写集成测试

### 阶段三：UI 重构开发（5-6 天）

**Day 14-16: AI 派工建议页面重构**
- [ ] 重构 `SmartDispatchPage.tsx`
- [ ] 创建 `AnalysisOverview` 组件
- [ ] 创建 `RecommendationGroup` 组件
- [ ] 创建 `RecommendationCard` 组件
- [ ] 创建 `AnalysisDetailPanel` 组件
- [ ] 实现分页和筛选
- [ ] 编写组件测试

**Day 17-19: 交互功能开发**
- [ ] 实现派发确认弹窗
- [ ] 实现更换执行人选择器
- [ ] 实现延后任务对话框
- [ ] 实现拆分任务对话框
- [ ] 实现与三个任务系统的对接
- [ ] 实现派发后数据同步
- [ ] 编写 E2E 测试

### 阶段四：测试优化（4-5 天）

**Day 20-22: 全场景测试**
- [ ] 正常场景测试（生长周期任务预测）
- [ ] 告警场景测试（环境异常触发）
- [ ] 天气场景测试（天气影响调整）
- [ ] 人员场景测试（技能匹配/负荷均衡）
- [ ] 边界场景测试（超期/紧急/大面积）
- [ ] 性能测试（大数据量）
- [ ] 修复 Bug

**Day 23-24: 参数调优**
- [ ] 调整权重配置
- [ ] 优化阈值设置
- [ ] 改进推荐理由文案
- [ ] 优化 UI 交互体验
- [ ] 用户验收测试

### 阶段五：上线部署（2-3 天）

**Day 25-26: 部署准备**
- [ ] 编写用户文档
- [ ] 准备培训材料
- [ ] 配置生产环境
- [ ] 数据迁移（如需要）
- [ ] 灰度发布计划

**Day 27: 上线**
- [ ] 灰度发布（10% 用户）
- [ ] 监控指标
- [ ] 收集反馈
- [ ] 快速修复紧急问题
- [ ] 全量发布

---

## 六、配置化管理

### 6.1 权重配置文件

```typescript
// src/config/dispatchWeights.ts

export const DISPATCH_WEIGHTS: DispatchWeightConfig = {
  // 因素权重
  factorWeights: {
    production: 0.40,
    environment: 0.30,
    worker: 0.20,
    other: 0.10,
  },
  
  // 人员匹配权重
  matchingWeights: {
    skillMatch: 0.40,
    currentLoad: 0.25,
    location: 0.20,
    performance: 0.15,
  },
  
  // 动态权重调整
  dynamicAdjustments: {
    urgentTask: {
      performanceWeight: 0.25,
      loadWeight: 0.15,
    },
    largeArea: {
      skillWeight: 0.45,
      loadWeight: 0.15,
    },
    pestControl: {
      skillWeight: 0.50,
    },
  },
  
  // 阈值配置
  thresholds: {
    confidenceHigh: 80,
    confidenceMedium: 60,
    maxTasksPerWorker: 2,
    overdueDays: 2,
  },
};
```

### 6.2 规则配置文件

```typescript
// src/config/taskRules.ts

export const TASK_RULES: TaskRulesConfig = {
  // 作物生长阶段任务规则
  cropStageRules: {
    '番茄': {
      'seedling': {
        tasks: ['irrigation', 'fertilization'],
        intervalDays: 3,
        seasonalAdjustments: {
          spring: -1,
          summer: -2,
          winter: +2,
        },
      },
      'fruiting': {
        tasks: ['irrigation', 'fertilization', 'pruning', 'harvest'],
        intervalDays: 3,
        envTriggers: [
          {
            type: 'soil_moisture',
            condition: '<',
            threshold: 40,
            triggerTask: 'irrigation',
            priority: 'urgent',
          },
        ],
      },
    },
    // ... 其他作物
  },
  
  // 天气影响规则
  weatherImpactRules: [
    {
      operationType: 'irrigation',
      weatherCondition: 'rain',
      forecastHours: 24,
      action: 'delay',
      priority: 'low',
      description: '未来 24 小时有降雨，建议延后灌溉',
    },
    // ... 其他规则
  ],
  
  // 环境告警规则
  envAlertRules: [
    {
      type: 'soil_moisture',
      condition: '<',
      threshold: 40,
      triggerTask: 'irrigation',
      priority: 'urgent',
      description: '土壤湿度过低',
    },
    // ... 其他规则
  ],
};
```

---

## 七、成功标准与监控

### 7.1 定量指标

| 指标 | 基线值 | 目标值 | 测量方法 |
|------|--------|--------|----------|
| 任务预测准确率 | - | ≥85% | 预测任务数/实际需执行任务数 |
| 推荐接受率 | ~30% | ≥75% | 管理者接受推荐数/总推荐数 |
| 超期任务比例 | ~25% | ≤10% | 超期任务数/总任务数 |
| 人员负荷均衡度 | - | ≥80% | 1 - (最大负荷 - 最小负荷) / 平均负荷 |
| 派工决策时间 | ~5 分钟 | ≤1 分钟 | 从打开页面到完成派发的平均时间 |
| 系统响应时间 | - | <2 秒 | 从刷新到显示推荐的耗时 |

### 7.2 定性指标

- **管理者信任度**：愿意使用 AI 建议进行决策（通过用户调研）
- **透明度**：推荐理由清晰易懂（用户评分≥4/5）
- **可控性**：管理者可随时调整/覆盖 AI 建议（功能完整性）
- **适应性**：系统能学习管理者的决策偏好（通过反馈机制）

### 7.3 监控仪表板

```typescript
// src/components/labor/dispatch/DispatchMetricsDashboard.tsx

export function DispatchMetricsDashboard() {
  const metrics = useDispatchMetrics();
  
  return (
    <div className="metrics-dashboard">
      <MetricCard 
        title="今日预测任务" 
        value={metrics.todayPredictedTasks} 
        trend={metrics.predictedTasksTrend}
      />
      <MetricCard 
        title="AI 推荐接受率" 
        value={`${metrics.acceptanceRate}%`} 
        trend={metrics.acceptanceRateTrend}
        target="75%"
      />
      <MetricCard 
        title="超期任务数" 
        value={metrics.overdueTasks} 
        trend={metrics.overdueTasksTrend}
        target="<10%"
      />
      <MetricCard 
        title="人员负荷均衡度" 
        value={`${metrics.loadBalanceScore}%`} 
        trend={metrics.loadBalanceTrend}
        target="80%"
      />
      <MetricCard 
        title="平均决策时间" 
        value={`${metrics.avgDecisionTime}分钟`} 
        trend={metrics.decisionTimeTrend}
        target="<1 分钟"
      />
    </div>
  );
}
```

---

## 八、风险与应对

| 风险 | 影响程度 | 概率 | 应对措施 |
|------|----------|------|----------|
| 数据不准确（传感器故障、天气数据错误） | 高 | 中 | 数据校验机制，异常数据标记警告，置信度降低 |
| 规则过于复杂导致系统难以维护 | 中 | 高 | 配置化设计，规则引擎可视化，单元测试覆盖 |
| 人员抵触 AI 决策 | 中 | 中 | 强调 AI 是辅助工具，最终决策权在人，提供充分理由 |
| 性能问题（大量数据计算慢） | 高 | 低 | 分页计算，Web Worker，缓存优化，懒加载 |
| 过度依赖 AI 导致管理者决策能力退化 | 低 | 低 | 定期人工审核，保留纯人工模式，培训 |
| 规则配置错误导致错误派工 | 高 | 中 | 配置审核机制，灰度发布，快速回滚能力 |

---

## 九、未来扩展路线图

### 9.1 短期扩展（3-6 个月）

1. **机器学习优化**
   - 基于历史派发结果自动调整权重
   - 学习管理者决策偏好
   - 预测任务完成时间

2. **预测性派工**
   - 根据生长模型预测未来 7 天任务
   - 提前安排人员排班
   - 物资准备提醒

3. **多目标优化**
   - 成本最优（工时最少）
   - 效率最高（完成最快）
   - 满意度最优（人员偏好）
   - Pareto 最优解

### 9.2 中期扩展（6-12 个月）

4. **智能调度**
   - 任务路径优化（同一区域任务批量派发）
   - 时间窗口优化（考虑天气变化）
   - 动态调整（突发情况重新调度）

5. **移动端集成**
   - 推送通知到工人手机
   - 工人端任务接受/拒绝
   - 实时位置更新

6. **知识库构建**
   - 作物种植专家系统
   - 病虫害诊断库
   - 最佳实践案例库

### 9.3 长期扩展（12+ 个月）

7. **AI 模型升级**
   - 深度学习模型预测产量
   - 计算机视觉识别病虫害
   - 自然语言生成更智能的推荐理由

8. **物联网深度集成**
   - 自动化设备控制（灌溉、通风）
   - 无人机巡检
   - 机器人作业

9. **区块链溯源**
   - 农事操作记录上链
   - 产品质量追溯
   - 供应链透明化

---

## 十、总结

本优化升级方案针对当前智能派工系统的**算法简单、数据孤岛、缺少预测能力**等核心问题，提出了全面的架构重构和功能增强：

### 核心升级点

1. **架构升级**：从"单一算法"升级为"数据聚合→规则引擎→核心引擎→UI 展示"四层架构
2. **能力升级**：从"被动响应"升级为"主动预测"，基于作物生长周期预测未来任务
3. **智能升级**：综合考虑 10+ 维度影响因素，实现真正的全维度智能派工
4. **配置升级**：权重、阈值、规则全部配置化，支持动态调整

### 预期收益

- **效率提升**：派工决策时间从 5 分钟降至 1 分钟（-80%）
- **质量提升**：推荐接受率从 30% 提升至 75%（+45%）
- **超期降低**：超期任务比例从 25% 降至 10%（-15%）
- **负荷均衡**：人员负荷均衡度达到 80% 以上

### 实施保障

- **分阶段实施**：5 个阶段 27 天，每阶段有明确交付物
- **风险控制**：识别 6 大风险并制定应对措施
- **成功标准**：定义 5 个定量指标和 4 个定性指标
- **持续优化**：建立监控仪表板，持续收集反馈并优化

通过本方案的实施，系统将实现从"人找任务"到"任务找人"的根本性转变，大幅提升农事管理的智能化水平和运营效率。
