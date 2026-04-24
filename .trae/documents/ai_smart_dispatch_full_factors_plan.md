# AI 智能派工系统 - 全因素综合考虑方案

## 一、核心愿景

构建一个**AI 驱动的智能派工引擎**，综合考虑**生产计划、作物周期、天气环境、人员状态、设备状况、问题紧急性**等全维度因素，实现从"人找任务"到"任务找人"的转变，最终由管理者决策确认。

---

## 二、全维度影响因素图谱

### 2.1 影响因素总览

```
                    AI 智能派工决策
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   生产相关因素    环境相关因素    人员相关因素
        │                │                │
  ┌─────┴─────┐    ┌─────┴─────┐    ┌────┴────┐
  │           │    │           │    │         │
作物生长   生产计划  天气    IoT 传感器  技能   负荷
阶段       批次状态  预报    环境告警   档案   状态
```

### 2.2 详细因素清单

#### A. 生产相关因素（权重 40%）

1. **作物生长周期** (15%)
   - 作物种类：番茄、黄瓜、草莓、茄子、辣椒、水稻、小麦、白菜等
   - 生长阶段：seedling(苗期) → vegetative(生长期) → flowering(开花期) → fruiting(结果期) → harvest(采收期)
   - 生长天数：距离种植日的天数
   - 阶段任务规则：每个阶段的标准农事活动（灌溉、施肥、植保、修剪、采收）
   - 间隔天数：同类任务的标准间隔（如灌溉间隔 3 天）
   - 超期状态：是否超过建议间隔天数

2. **生产批次计划** (15%)
   - 批次状态：draft(草稿) / published(已发布) / in_progress(执行中) / completed(已完成) / cancelled(已作废)
   - 种植面积：影响任务工时估算
   - 目标产量：影响任务优先级
   - 负责人：任务协调人
   - 计划开始/结束日期：时间窗口约束

3. **历史任务执行记录** (10%)
   - 上次灌溉日期
   - 上次施肥日期
   - 上次植保日期
   - 任务完成率
   - 平均完成时长

#### B. 环境相关因素（权重 30%）

1. **天气预报** (15%)
   - 天气类型：晴/多云/阴/雨/雪
   - 温度：最高温、最低温、当前温
   - 湿度：空气湿度
   - 降水量：未来 24/48 小时降雨预测
   - 风速：大风预警
   - 光照强度：lux 值

   **影响规则**:
   - 下雨前 24 小时 → 暂停灌溉任务建议
   - 高温 (>33℃) → 优先推荐灌溉任务，优先级提升
   - 低温 (<15℃) → 优先推荐保温/通风任务
   - 大风 → 暂停户外喷洒作业

2. **IoT 传感器实时数据** (10%)
   - 空气温度：℃
   - 空气湿度：%
   - 土壤湿度：%（关键指标）
   - 土壤温度：℃
   - 土壤 EC 值：mS/cm（盐分）
   - 土壤 pH 值
   - 光照强度：lux
   - CO2 浓度：ppm

   **告警阈值触发规则**（来自 recommendationRules.ts）:
   ```
   土壤湿度 < 40% → 灌溉任务，优先级 high
   土壤湿度 > 85% → 排水任务，优先级 high
   温度 > 35℃ → 灌溉 + 通风，优先级 urgent
   温度 < 15℃ → 保温，优先级 urgent
   土壤 EC > 2.5 → 灌溉 + 施肥调整，优先级 high
   ```

3. **巡查反馈问题** (5%)
   - 问题分类：环境/病虫害/设备/基础设施
   - 严重程度：轻微/中等/严重
   - 紧急程度：today/tomorrow/3days/week
   - 问题关键词：灰霉病、白粉病、红蜘蛛、蚜虫、病毒病等
   - 病虫害预警规则：匹配 PEST_ALERT_RULES

#### C. 人员相关因素（权重 20%）

1. **技能档案** (40%)
   - 持有技能标签：微喷灌溉、滴灌操作、水肥一体化、基肥施用、追肥操作、农药配制、喷雾操作、生物防治、病害识别、虫害识别、果蔬采收、分级包装、冷链处理等
   - 技能等级：初级/中级/高级/技师
   - 技能认证：认证日期、过期日期

2. **工作状态** (30%)
   - 当前负荷：进行中任务数量（0-5+）
   - 今日完成任务数
   - 可用状态：available(空闲) / busy(较忙) / offline(繁忙/离线)
   - 考勤状态：出勤/请假/缺勤
   - 最后活跃时间

3. **位置匹配** (15%)
   - 当前工作区域：A 区/B 区/C 区/D 区
   - 距离任务地点距离：km
   - 区域偏好：历史工作区域分布

4. **历史表现** (15%)
   - 近期表现评分：0-100
   - 任务按时完成率：%
   - 质量评分：验收通过率
   - 技能匹配任务完成率

#### D. 其他因素（权重 10%）

1. **物资可用性**
   - 农药库存
   - 肥料库存
   - 工具设备状态

2. **时间窗口**
   - 工作日/周末
   - 节假日
   - 最佳作业时间（早晨/傍晚）

3. **任务依赖关系**
   - 前置任务：某些任务需在其他任务完成后执行
   - 并行任务：可同时进行

---

## 三、AI 派工引擎架构

### 3.1 引擎工作流程

```
┌──────────────────────────────────────────────────────────────┐
│                    数据收集层                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │生产批次  │  │天气预报  │  │IoT 传感器 │  │人员档案  │     │
│  │          │  │          │  │          │  │          │     │
│  │·批次列表 │  │·温度     │  │·土壤湿度 │  │·技能     │     │
│  │·生长阶段 │  │·湿度     │  │·EC/pH    │  │·负荷     │     │
│  │·面积     │  │·降雨     │  │·光照     │  │·位置     │     │
│  │·计划日期 │  │·风速     │  │·CO2      │  │·表现     │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │巡查反馈  │  │历史任务  │  │物资设备  │                    │
│  │          │  │          │  │          │                    │
│  │·问题分类 │  │·执行记录│  │·库存     │                    │
│  │·严重程度 │  │·完成率  │  │·状态     │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    任务预测引擎                                │
│                                                              │
│  输入：所有执行中批次 + 环境数据 + 历史任务                   │
│                                                              │
│  处理：                                                       │
│  1. 遍历批次 → 解析生长阶段 → 匹配阶段任务规则                │
│  2. 计算间隔天数 → 判断超期状态                              │
│  3. 检查环境阈值 → 触发告警任务                              │
│  4. 匹配病虫害规则 → 生成植保任务                            │
│  5. 考虑天气影响 → 调整优先级/延后建议                       │
│                                                              │
│  输出：预测任务列表（10-50 条/天）                            │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    人员匹配引擎                                │
│                                                              │
│  输入：预测任务 + 人员档案 + 实时状态                         │
│                                                              │
│  处理：                                                       │
│  对每个任务，计算所有人员的匹配得分：                         │
│                                                              │
│  综合得分 = 技能匹配×40% + 负荷得分×25% +                    │
│             位置得分×20% + 表现得分×15%                      │
│                                                              │
│  特殊规则：                                                   │
│  - 紧急任务（urgent）→ 表现得分权重提升至 25%                 │
│  - 大面积任务（>500m²）→ 负荷得分权重降低至 15%               │
│  - 病虫害任务 → 技能匹配权重提升至 50%                        │
│                                                              │
│  输出：每个任务的 Top3 推荐人员及得分详情                     │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    决策建议引擎                                │
│                                                              │
│  输入：预测任务 + 人员匹配结果 + 全维度因素                   │
│                                                              │
│  处理：                                                       │
│  1. 计算置信度分数（0-100）                                  │
│  2. 判断建议动作：                                           │
│     - 置信度≥80 → 建议"确认派发"                             │
│     - 60≤置信度<80 → 建议"人工确认"                          │
│     - 置信度<60 → 建议"人工决策"                             │
│  3. 生成推荐理由                                             │
│  4. 生成风险提示                                             │
│  5. 考虑天气因素调整：                                       │
│     - 未来 24 小时有雨 → 灌溉任务标记"建议延后"                │
│     - 高温预警 → 灌溉任务优先级提升，标记"紧急"               │
│  6. 考虑环境告警：                                           │
│     - 土壤湿度<30% → 灌溉任务优先级 urgent                   │
│     - 温度>35℃ → 通风任务优先级 urgent                       │
│                                                              │
│  输出：完整派工建议（含理由、风险、置信度）                   │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    UI 展示层                                   │
│                                                              │
│  · 分析概览卡片                                              │
│  · 派工建议列表（按置信度分组）                              │
│  · 每条建议的详细信息                                        │
│  · 推荐理由和风险提示                                        │
│  · 操作按钮（确认/更换/延后/拆分）                           │
│                                                              │
│  用户操作 → 确认后派发到对应任务系统                          │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 核心数据结构

```typescript
// 全维度因素输入
interface DispatchFactors {
  // 生产因素
  activeBatches: CropBatch[];
  cropStageRules: CropStageTaskMap;
  lastTaskDates: Record<string, string>; // taskId -> lastDate
  
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

// 预测任务（增强版）
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
  
  // 预估工时（考虑面积）
  estimatedHours: number;
  requiredSkills: SkillTag[];
}

// 人员匹配得分（增强版）
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
  
  // 特殊技能匹配
  hasRequiredCertification: boolean;
  skillLevels: Record<SkillTag, SkillLevel>;
}

// 派工建议（增强版）
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
    production: string[];      // 生产因素
    environment: string[];     // 环境因素
    worker: string[];          // 人员因素
    other: string[];           // 其他因素
  };
  
  // 天气影响
  weatherNote: string | null;
  
  // 环境告警
  envAlertNote: string | null;
}
```

---

## 四、核心算法实现

### 4.1 任务预测算法

```typescript
// src/hooks/useTaskPrediction.ts

function predictTasks(
  batches: CropBatch[],
  today: string,
  factors: DispatchFactors
): PredictedTask[] {
  const predictedTasks: PredictedTask[] = [];
  
  for (const batch of batches) {
    if (batch.batchStatus !== 'in_progress' && batch.batchStatus !== 'published') {
      continue; // 只处理执行中和已发布的批次
    }
    
    // 1. 获取作物在当前生长阶段的任务规则
    const stageConfig = factors.cropStageRules[batch.cropName]?.[batch.stage];
    if (!stageConfig) continue;
    
    // 2. 计算生长天数
    const daysElapsed = calculateDays(batch.startDate, today);
    
    // 3. 查询该批次最近一次执行各类农事活动的日期
    const lastTasks = getLastOperationDates(batch.id);
    
    // 4. 对每个标准任务，判断是否需要执行
    for (const operationType of stageConfig.tasks) {
      const daysSinceLast = daysElapsed - (lastTasks[operationType] || 0);
      const isOverdue = daysSinceLast >= stageConfig.intervalDays;
      const isDueSoon = daysSinceLast >= stageConfig.intervalDays * 0.8;
      
      if (isOverdue || isDueSoon) {
        // 5. 检查环境影响
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
        const priority = calculateTaskPriority(
          operationType,
          daysSinceLast,
          stageConfig.intervalDays,
          envAlert.triggered,
          weatherImpact.affected
        );
        
        // 8. 跳过受天气影响需延后的任务
        if (weatherImpact.impactType === 'rain_delay' && priority !== 'urgent') {
          continue;
        }
        
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
          priority,
          urgencyReason: generateUrgencyReason(
            operationType,
            daysSinceLast,
            stageConfig.intervalDays,
            envAlert
          ),
          estimatedHours: estimateHours(operationType, batch.plantingArea),
          requiredSkills: factors.skillOperationMap[operationType] || [],
          isOverdue,
          daysSinceLastTask: daysSinceLast,
          intervalDays: stageConfig.intervalDays,
          weatherImpact,
          envAlertTriggered: envAlert,
        });
      }
    }
    
    // 9. 检查巡查反馈问题触发的任务
    const inspectionTasks = generateTasksFromInspection(
      batch,
      factors.inspectionIssues,
      factors.pestAlerts
    );
    predictedTasks.push(...inspectionTasks);
  }
  
  // 10. 按优先级排序
  return predictedTasks.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// 天气影响评估
function assessWeatherImpact(
  operationType: FarmOperationType,
  weather: WeatherData,
  today: string
): WeatherImpact {
  // 检查未来 24 小时天气预报
  const forecast24h = weather.forecast.find(f => f.date === today);
  
  if (!forecast24h) {
    return { affected: false, impactType: null, description: '' };
  }
  
  // 下雨 → 延后灌溉
  if (operationType === 'irrigation' && forecast24h.weather.includes('雨')) {
    return {
      affected: true,
      impactType: 'rain_delay',
      description: '未来 24 小时有降雨，建议延后灌溉',
    };
  }
  
  // 高温 → 优先灌溉
  if (forecast24h.temperature > 33 && operationType === 'irrigation') {
    return {
      affected: true,
      impactType: 'heat_priority',
      description: '高温天气，建议优先安排灌溉',
    };
  }
  
  // 低温 → 优先保温/通风
  if (forecast24h.temperature < 15 && operationType === 'ventilation') {
    return {
      affected: true,
      impactType: 'cold_priority',
      description: '低温天气，建议优先安排保温',
    };
  }
  
  // 大风 → 延后户外喷洒
  if (operationType === 'pest_control' && forecast24h.windSpeed > 20) {
    return {
      affected: true,
      impactType: 'wind_delay',
      description: '大风天气，建议延后喷洒作业',
    };
  }
  
  return { affected: false, impactType: null, description: '' };
}

// 环境告警触发检查
function checkEnvAlertTrigger(
  operationType: FarmOperationType,
  greenhouseId: string,
  sensorReadings: SensorData[],
  alertRules: EnvAlertRule[]
): EnvAlertTrigger {
  const greenhouseSensors = sensorReadings.filter(s => s.greenhouseId === greenhouseId);
  
  // 检查土壤湿度
  if (operationType === 'irrigation') {
    const soilMoistureSensor = greenhouseSensors.find(s => s.type === 'soil_moisture');
    if (soilMoistureSensor && soilMoistureSensor.value < 40) {
      const rule = alertRules.find(r => 
        r.type === 'soil_moisture' && 
        r.thresholds.min > soilMoistureSensor.value
      );
      return {
        triggered: true,
        alertType: '土壤湿度过低',
        sensorValue: soilMoistureSensor.value,
        threshold: rule?.thresholds.min || 40,
      };
    }
  }
  
  // 检查温度
  if (operationType === 'ventilation' || operationType === 'irrigation') {
    const tempSensor = greenhouseSensors.find(s => s.type === 'air_temp');
    if (tempSensor && tempSensor.value > 35) {
      return {
        triggered: true,
        alertType: '温度过高',
        sensorValue: tempSensor.value,
        threshold: 35,
      };
    }
  }
  
  return { triggered: false, alertType: '', sensorValue: 0, threshold: 0 };
}

// 任务优先级计算
function calculateTaskPriority(
  operationType: FarmOperationType,
  daysSinceLast: number,
  intervalDays: number,
  envAlertTriggered: boolean,
  weatherAffected: boolean
): 'urgent' | 'high' | 'medium' | 'low' {
  // 环境告警触发 → urgent
  if (envAlertTriggered) {
    return 'urgent';
  }
  
  // 超期 > 2 天 → urgent
  if (daysSinceLast > intervalDays + 2) {
    return 'urgent';
  }
  
  // 超期 → high
  if (daysSinceLast > intervalDays) {
    return 'high';
  }
  
  // 即将到期（80% 间隔）→ medium
  if (daysSinceLast >= intervalDays * 0.8) {
    return 'medium';
  }
  
  // 天气影响需延后 → low
  if (weatherAffected) {
    return 'low';
  }
  
  return 'medium';
}
```

### 4.2 人员匹配算法

```typescript
// src/hooks/useWorkerMatching.ts

function matchWorkers(
  task: PredictedTask,
  workers: WorkerInfo[],
  currentTasks: Task[],
  factors: DispatchFactors
): WorkerMatchScore[] {
  return workers.map(worker => {
    // 1. 技能匹配 (40%)
    const workerSkills = factors.workerSkills
      .find(ws => ws.staffId === worker.staffId)?.skills || [];
    const skillMatchScore = calculateSkillMatch(
      workerSkills.map(s => s.tag),
      task.requiredSkills
    );
    
    // 2. 当前负荷 (25%)
    const activeTaskCount = countActiveTasks(worker.staffId, currentTasks);
    const loadScore = Math.max(0, 100 - activeTaskCount * 20);
    
    // 3. 位置匹配 (20%)
    const locationScore = calculateLocationScore(
      worker.currentWorkZone,
      task.greenhouseName
    );
    
    // 4. 历史表现 (15%)
    const performanceScore = getWorkerPerformanceScore(worker.staffId);
    
    // 动态权重调整
    let weights = { skill: 0.40, load: 0.25, location: 0.20, performance: 0.15 };
    
    // 紧急任务 → 表现权重提升
    if (task.priority === 'urgent') {
      weights.performance = 0.25;
      weights.load = 0.15;
    }
    
    // 大面积任务 → 负荷权重降低
    if (task.plantingArea > 500) {
      weights.load = 0.15;
      weights.skill = 0.45;
    }
    
    // 病虫害任务 → 技能权重提升
    if (task.operationType === 'pest_control') {
      weights.skill = 0.50;
      weights.load = 0.15;
    }
    
    // 综合得分
    const totalScore = Math.round(
      skillMatchScore * weights.skill +
      loadScore * weights.load +
      locationScore * weights.location +
      performanceScore * weights.performance
    );
    
    // 判断可用状态
    const attendance = factors.attendanceRecords.find(
      a => a.staffId === worker.staffId && a.date === task.suggestedDate
    );
    const isAvailable = activeTaskCount < 2 && 
                       attendance?.status === 'present';
    
    // 生成推荐理由
    const reasons = generateMatchReasons(
      skillMatchScore, loadScore, locationScore, performanceScore, worker
    );
    
    // 生成冲突提示
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
      todayCompletedTasks: getTodayCompletedTasks(worker.staffId, currentTasks),
      currentWorkZone: worker.currentWorkZone,
      attendanceStatus: attendance?.status || 'present',
      reasons,
      conflicts,
      hasRequiredCertification: hasCertification(workerSkills, task.requiredSkills),
      skillLevels: getSkillLevels(workerSkills),
    };
  }).sort((a, b) => b.totalScore - a.totalScore);
}
```

### 4.3 决策建议算法

```typescript
// src/hooks/useDispatchRecommendation.ts

function generateRecommendations(
  predictedTasks: PredictedTask[],
  workerMatches: Record<string, WorkerMatchScore[]>,
  factors: DispatchFactors
): DispatchRecommendation[] {
  return predictedTasks.map(task => {
    const matchedWorkers = workerMatches[task.id] || [];
    const topWorker = matchedWorkers[0];
    
    // 计算置信度
    const confidenceScore = topWorker?.totalScore || 0;
    const confidenceLevel = confidenceScore >= 80 ? 'high' : 
                           confidenceScore >= 60 ? 'medium' : 'low';
    
    // 判断建议动作
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
    
    // 生成 AI 推荐理由
    const aiReason = generateAIReason(task, topWorker, matchedWorkers, factors);
    
    // 生成风险提示
    const risks = generateRisks(task, topWorker, matchedWorkers);
    
    // 全维度因素考虑说明
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
    
    // 添加环境因素
    if (task.envAlertTriggered.triggered) {
      factorsConsidered.environment.push(
        `环境告警：${task.envAlertTriggered.alertType}`
      );
    }
    if (task.weatherImpact.affected) {
      factorsConsidered.environment.push(task.weatherImpact.description);
    }
    
    // 添加人员因素
    if (topWorker) {
      factorsConsidered.worker.push(
        `推荐 ${topWorker.staffName}：技能匹配${topWorker.skillMatchScore}%，` +
        `当前负荷${topWorker.currentTasks}个任务，` +
        `位置${topWorker.currentWorkZone}`
      );
    }
    
    // 天气备注
    let weatherNote = null;
    if (task.weatherImpact.affected) {
      weatherNote = task.weatherImpact.description;
    }
    
    // 环境告警备注
    let envAlertNote = null;
    if (task.envAlertTriggered.triggered) {
      envAlertNote = `${task.envAlertTriggered.alertType} ` +
                    `(当前值:${task.envAlertTriggered.sensorValue}, ` +
                    `阈值:${task.envAlertTriggered.threshold})`;
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
      weatherNote,
      envAlertNote,
    };
  });
}
```

---

## 五、UI 设计 - 全因素展示

### 5.1 分析概览

```
┌────────────────────────────────────────────────────────────────┐
│ 📊 AI 派工分析概览                                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 生产因素                                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│ │执行中    │ │今日预测  │ │超期任务  │                        │
│ │批次: 5   │ │任务: 12  │ │任务: 3   │                        │
│ └──────────┘ └──────────┘ └──────────┘                        │
│                                                                 │
│ 环境因素                                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│ │当前天气  │ │环境告警  │ │病虫害    │                        │
│ │晴 32℃    │ │2 个      │ │预警: 1   │                        │
│ └──────────┘ └──────────┘ └──────────┘                        │
│                                                                 │
│ 人员因素                                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│ │可用人    │ │较忙      │ │请假      │                        │
│ │4 人      │ │2 人      │ │1 人      │                        │
│ └──────────┘ └──────────┘ └──────────┘                        │
│                                                                 │
│ 综合评估                                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │高置信度  │ │中置信度  │ │低置信度  │ │需人工    │          │
│ │建议: 8   │ │建议: 3   │ │建议: 1   │ │决策: 0   │          │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 派工建议详情（增强版）

```
┌────────────────────────────────────────────────────────────────┐
│ 🟢 高置信度 (92 分)                                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📋 A 区番茄 - 结果期 - 灌溉任务                                   │
│                                                                 │
│ 生产因素                                                        │
│ ├ 生产批次：SC20260401-001                                     │
│ ├ 作物阶段：结果期 (已生长 45 天，建议间隔 3 天，已超期 2 天)       │
│ ├ 种植面积：200m²                                              │
│ └ 优先级：🔴 高 (超期未灌溉)                                    │
│                                                                 │
│ 环境因素                                                        │
│ ├ 天气预报：晴 32℃，未来 24 小时无雨 ✅                          │
│ ├ 环境告警：⚠️ 土壤湿度 38% (低于阈值 40%)                      │
│ └ 影响评估：高温天气，建议优先安排灌溉                          │
│                                                                 │
│ 👤 AI 推荐执行人：萧峰 (92 分)                                    │
│    人员因素                                                      │
│    · 技能匹配：持有 [滴灌操作、水肥一体化]，匹配度 100% ✅        │
│    · 当前负荷：空闲（0 个进行中任务）✅                           │
│    · 位置：当前在 A 区，距离任务地点 0.5km ✅                     │
│    · 近期表现：92 分，任务按时完成率 98% ✅                       │
│    · 考勤状态：出勤 ✅                                           │
│                                                                 │
│ 备选：虚竹 (78 分)、袁承志 (71 分)                                │
│                                                                 │
│ AI 综合建议                                                      │
│ "基于作物生长周期（结果期灌溉间隔超期 2 天）、环境告警（土壤湿度   │
│ 38% 低于阈值）、天气预报（晴 32℃高温）、人员匹配（萧峰技能 100%    │
│ 匹配且空闲），建议立即派发灌溉任务给萧峰。"                      │
│                                                                 │
│ 风险提示                                                        │
│ · 超期 2 天未灌溉，需尽快执行                                     │
│ · 高温天气，建议安排在早晨或傍晚执行                            │
│                                                                 │
│ [✅ 确认派发] [✏️ 更换人员] [⏰ 延后]                          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 六、实施路线图

### 阶段一：数据层整合（3-4 天）

1. **统一数据接口**
   - 创建 `useDispatchFactors` hook，聚合所有影响因素数据
   - 连接生产批次、天气预报、IoT 传感器、巡查反馈、人员档案等数据源

2. **规则引擎实现**
   - 实现作物生长阶段任务预测规则
   - 实现环境告警触发规则
   - 实现病虫害预警规则
   - 实现天气影响评估规则

### 阶段二：算法层开发（4-5 天）

3. **任务预测引擎**
   - 实现 `useTaskPrediction` hook
   - 整合生长周期、环境告警、天气影响
   - 生成预测任务列表

4. **人员匹配引擎**
   - 实现 `useWorkerMatching` hook
   - 计算多维度匹配得分
   - 动态权重调整

5. **决策建议引擎**
   - 实现 `useDispatchRecommendation` hook
   - 生成置信度评分
   - 生成推荐理由和风险提示

### 阶段三：UI 层开发（4-5 天）

6. **AI 派工建议页面**
   - 分析概览卡片
   - 派工建议列表（按置信度分组）
   - 全维度因素展示

7. **分析详情面板**
   - 生产批次分析表
   - 人员工作状态表
   - 环境数据展示
   - 任务预测依据说明

8. **派发确认交互**
   - 派发确认弹窗
   - 更换执行人选择器
   - 延后/拆分任务对话框

### 阶段四：系统集成（3-4 天）

9. **与三个任务系统对接**
   - 农事任务：调用 `useTasks.createTask()`
   - 临时任务：调用 `useTempTasks.addTempTask()`
   - 巡查反馈：调用 `useProblemDispatch.dispatchProblem()`

10. **数据同步**
    - 派发后更新预测任务状态
    - 刷新人员负荷
    - 更新分析结果

### 阶段五：测试优化（3-4 天）

11. **全场景测试**
    - 正常场景：生长周期任务预测
    - 告警场景：环境异常触发任务
    - 天气场景：天气影响调整
    - 人员场景：技能匹配/负荷均衡

12. **参数调优**
    - 调整权重配置
    - 优化阈值设置
    - 改进推荐理由文案

---

## 七、配置化设计

### 7.1 权重配置

```typescript
interface DispatchConfig {
  // 因素权重
  factorWeights: {
    production: 0.40;    // 生产因素 40%
    environment: 0.30;   // 环境因素 30%
    worker: 0.20;        // 人员因素 20%
    other: 0.10;         // 其他因素 10%
  };
  
  // 人员匹配权重
  matchingWeights: {
    skillMatch: 0.40;    // 技能匹配 40%
    currentLoad: 0.25;   // 当前负荷 25%
    location: 0.20;      // 位置匹配 20%
    performance: 0.15;   // 历史表现 15%
  };
  
  // 动态权重调整规则
  dynamicAdjustments: {
    urgentTask: {
      performanceWeight: 0.25;  // 紧急任务表现权重提升至 25%
      loadWeight: 0.15;         // 负荷权重降低至 15%
    };
    largeArea: {
      skillWeight: 0.45;        // 大面积技能权重提升至 45%
      loadWeight: 0.15;         // 负荷权重降低至 15%
    };
    pestControl: {
      skillWeight: 0.50;        // 植保任务技能权重提升至 50%
    };
  };
  
  // 阈值配置
  thresholds: {
    confidenceHigh: 80;      // 高置信度阈值
    confidenceMedium: 60;    // 中置信度阈值
    maxTasksPerWorker: 2;    // 单人最大任务数
    overdueDays: 2;          // 超期阈值（天）
  };
}
```

### 7.2 规则配置扩展

```typescript
interface RuleExtensions {
  // 季节性调整
  seasonalAdjustments: {
    spring: { irrigationInterval: -1 };  // 春季灌溉间隔减少 1 天
    summer: { irrigationInterval: -2 };  // 夏季灌溉间隔减少 2 天
    autumn: {};
    winter: { irrigationInterval: +2 };  // 冬季灌溉间隔增加 2 天
  };
  
  // 区域特殊规则
  regionalRules: {
    'A 区': { priority: 'high' };  // A 区任务优先级提升
    'B 区': {};
  };
  
  // 人员特殊规则
  workerRules: {
    'U001': { maxTasks: 3 };  // 萧峰最多 3 个任务
    'U002': { skills: ['special'] };  // 虚竹有特殊技能
  };
}
```

---

## 八、成功标准

### 8.1 定量指标

- **任务预测准确率** ≥ 85%（预测任务/实际需执行任务）
- **人员匹配满意度** ≥ 80%（管理者接受 AI 推荐的比例）
- **超期任务减少** ≥ 50%（相比纯人工派发）
- **派发效率提升** ≥ 60%（减少人工选择执行人的时间）
- **人员负荷均衡度** ≥ 75%（最大负荷 - 最小负荷 < 2）

### 8.2 定性指标

- **管理者信任度**：愿意使用 AI 建议进行决策
- **透明度**：推荐理由清晰易懂
- **可控性**：管理者可随时调整/覆盖 AI 建议
- **适应性**：系统能学习管理者的决策偏好

---

## 九、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 数据不准确（传感器故障、天气数据错误） | 推荐结果偏差 | 数据校验机制，异常数据标记警告，置信度降低 |
| 规则过于复杂 | 系统难以维护 | 配置化设计，规则引擎可视化，单元测试覆盖 |
| 人员抵触 AI 决策 | 采纳率低 | 强调 AI 是辅助工具，最终决策权在人，提供充分理由 |
| 性能问题 | 大量数据计算慢 | 分页计算，Web Worker，缓存优化 |
| 过度依赖 AI | 管理者决策能力退化 | 定期人工审核，保留纯人工模式 |

---

## 十、未来扩展

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

4. **智能调度**
   - 任务路径优化（同一区域任务批量派发）
   - 时间窗口优化（考虑天气变化）
   - 动态调整（突发情况重新调度）

5. **移动端集成**
   - 推送通知到工人手机
   - 工人端任务接受/拒绝
   - 实时位置更新

---

## 十一、总结

本方案设计了一个**全维度因素综合考虑的 AI 智能派工系统**，核心特点：

1. **全因素覆盖**：生产计划、作物周期、天气预报、IoT 传感器、巡查反馈、人员技能/负荷/位置/表现等
2. **规则驱动**：基于作物生长阶段规则、环境告警规则、病虫害预警规则、天气影响规则
3. **智能匹配**：多维度人员匹配算法，动态权重调整
4. **透明决策**：清晰展示各维度因素考虑，生成可读的推荐理由
5. **人在回路**：AI 提供建议，管理者最终决策
6. **配置化**：权重、阈值、规则均可配置调整

系统最终实现从"人找任务"到"任务找人"的转变，提升派工效率和科学性，同时保持管理者的决策主导权。
