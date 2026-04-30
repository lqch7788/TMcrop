# 农事管理智能推荐方案

> 本文档描述智慧农业管理系统中智能推荐功能的设计方案，包括数据来源、推荐规则、匹配算法等内容。

## 一、概述

智能推荐引擎整合多源数据，为农事任务分配提供智能决策支持。

```
┌─────────────────────────────────────────────────────────────┐
│                      农事智能推荐引擎                          │
├─────────────────────────────────────────────────────────────┤
│  数据源：IoT传感器 | 巡田监测 | 作物批次 | 任务历史 | 天气预报    │
│  规则：环境预警规则 | 病虫害规则 | 生长阶段规则 | 例行规则       │
│  算法：人员技能匹配 | 位置匹配 | 工作负载均衡                    │
└─────────────────────────────────────────────────────────────┘
```

## 二、数据来源

### 2.1 环境监测数据（IoT传感器）

**数据表**：`iotSensors` (src/data/mockData.ts)

| 字段 | 说明 | 示例 |
|------|------|------|
| greenhouseId | 温室ID | G001 |
| greenhouseName | 温室名称 | 玻璃温室A区 |
| type | 传感器类型 | air_temp, air_humidity, soil_moisture |
| typeName | 类型名称 | 空气温度 |
| value | 当前值 | 24.5 |
| unit | 单位 | ℃, %, lux |
| status | 状态 | normal, warning, critical |

**传感器类型**：
- `air_temp` - 空气温度
- `air_humidity` - 空气湿度
- `soil_temp` - 土壤温度
- `soil_moisture` - 土壤湿度
- `soil_ec` - 土壤EC值
- `soil_ph` - 土壤pH值
- `light` - 光照强度
- `co2` - CO2浓度

### 2.2 巡田监测数据

**数据表**：`farmInspectionRecords` (src/data/farmMockData.ts)

| 字段 | 说明 | 示例 |
|------|------|------|
| id | 记录ID | INS001 |
| recordCode | 记录编号 | INS20260315-001 |
| greenhouseId | 温室ID | GH001 |
| greenhouseName | 温室名称 | 玻璃温室A区 |
| cropName | 作物名称 | 番茄 |
| checkDate | 检查日期 | 2026-03-15 |
| issues | 发现问题列表 | ["灰霉病初期症状"] |
| status | 状态 | NORMAL, ATTENTION, CRITICAL |

### 2.3 作物批次数据

**数据表**：`cropBatches` (src/data/mockData.ts)

| 字段 | 说明 | 示例 |
|------|------|------|
| id | 批次ID | B001 |
| batchCode | 批次编号 | FQ2026-001 |
| cropName | 作物名称 | 番茄 |
| greenhouseId | 温室ID | G001 |
| greenhouseName | 温室名称 | 玻璃温室A区 |
| stage | 当前阶段 | fruiting |
| stageName | 阶段名称 | 结果期 |

**作物阶段定义**：
- `seedling` - 苗期
- `vegetative` - 生长期
- `flowering` - 开花期
- `fruiting` - 结果期
- `harvest` - 采收期

### 2.4 任务历史数据

**数据表**：`taskDispatchTasks` (src/data/farmMockData.ts)

| 字段 | 说明 | 示例 |
|------|------|------|
| id | 任务ID | 20260317-001 |
| types | 任务类型列表 | ["fertilization"] |
| typeLabel | 任务类型标签 | 施肥 |
| field | 地块名称 | 1号棚 |
| crop | 作物名称 | 番茄 |
| assignee | 负责人 | 张伟民 |
| status | 状态 | pending, in_progress, completed |
| planEnd | 计划完成日期 | 2026-03-17 |

### 2.5 温室作物映射

**文件**：`src/hooks/farm/useSmartRecommendation.ts`

```typescript
const GREENHOUSE_NAME_MAP: Record<string, string> = {
  '1号棚': '玻璃温室A区',
  '4号棚': '玻璃温室B区',
  '6号棚': '日光温室1号',  // 注意：6号棚是草莓，映射到日光温室1号
  '8号棚': '玻璃温室C区',  // 注意：8号棚是辣椒，映射到玻璃温室C区
  // ...
};
```

## 三、推荐类型

### 3.1 环境异常推荐 (env_alert)

**数据来源**：IoT传感器数据
**触发条件**：传感器值超出预设阈值
**优先级**：紧急/高

**判断逻辑**：
```typescript
// 伪代码
for (每个温室的每个传感器) {
  for (匹配的规则) {
    if (传感器值 < 最小阈值 || 传感器值 > 最大阈值) {
      // 触发环境预警推荐
    }
  }
}
```

### 3.2 病虫害预警推荐 (pest_alert)

**数据来源**：巡田监测记录
**触发条件**：巡田发现病虫害问题
**优先级**：紧急/高/中

**判断逻辑**：
```typescript
// 伪代码
for (每个巡田记录的问题) {
  for (每个病虫害规则) {
    if (问题关键词匹配 && 作物类型匹配) {
      // 触发病虫害预警推荐
    }
  }
}
```

### 3.3 生长阶段任务推荐 (stage_task)

**数据来源**：作物批次数据 + 任务历史
**触发条件**：距离上次同类任务超过间隔天数
**优先级**：高/中/低

**判断逻辑**：
```typescript
// 伪代码
for (每个作物批次) {
  for (该阶段建议的任务类型) {
    if (距离上次任务 >= 建议间隔) {
      // 触发阶段任务推荐
    }
  }
}
```

### 3.4 例行任务推荐 (periodic)

**数据来源**：任务历史
**触发条件**：每日例行检查未完成
**优先级**：低

**判断逻辑**：
```typescript
// 伪代码
for (每个温室) {
  if (今天没有灌溉任务) {
    // 生成每日灌溉例行推荐
  }
}
```

## 四、规则配置

### 4.1 环境预警规则

**文件**：`src/data/recommendationRules.ts`

```typescript
export const ENV_ALERT_RULES: EnvAlertRule[] = [
  {
    type: 'temperature',        // 指标类型
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒'],  // 适用的作物
    thresholds: { min: 15, max: 35 },  // 阈值范围
    action: ['irrigation', 'ventilation'],  // 建议操作
  },
  {
    type: 'humidity',
    cropTypes: ['番茄', '黄瓜'],
    thresholds: { min: 60, max: 80 },
    action: ['irrigation', 'drainage'],
  },
  {
    type: 'soil_moisture',
    cropTypes: ['番茄', '黄瓜', '草莓'],
    thresholds: { min: 40, max: 80 },
    action: ['irrigation'],
  },
  // ... 更多规则
];
```

### 4.2 病虫害预警规则

```typescript
export const PEST_ALERT_RULES: PestAlertRule[] = [
  {
    keywords: ['灰霉病', '灰霉', '花腐'],  // 匹配关键词
    cropTypes: ['番茄', '黄瓜', '茄子', '辣椒', '草莓'],
    severity: 'critical',  // 严重程度
    action: ['pest_control'],
    urgencyLevel: 5,  // 紧急程度 1-5
  },
  {
    keywords: ['蚜虫', '蜜露', '卷叶'],
    cropTypes: ['番茄', '黄瓜', '茄子'],
    severity: 'attention',
    action: ['pest_control'],
    urgencyLevel: 3,
  },
  // ... 更多规则
];
```

### 4.3 生长阶段任务规则

```typescript
export const CROP_STAGE_TASK_MAP: Record<string, Record<string, StageTaskConfig>> = {
  '番茄': {
    seedling: {
      tasks: ['浇水', '炼苗', '病虫害防治'],
      intervalDays: 3,
    },
    vegetative: {
      tasks: ['定植', '浇水', '施肥', '修剪'],
      intervalDays: 5,
    },
    fruiting: {
      tasks: ['疏果', '浇水', '施肥', '采收', '病虫害防治'],
      intervalDays: 7,
    },
    harvest: {
      tasks: ['采收', '分级包装', '冷链处理'],
      intervalDays: 2,
    },
  },
  // ... 其他作物
};
```

### 4.4 技能操作映射

```typescript
export const SKILL_OPERATION_MAP: Record<FarmOperationType, string[]> = {
  irrigation: ['微喷灌溉', '滴灌操作', '渗灌系统', '水肥一体化'],
  fertilization: ['基肥施用', '追肥操作', '水肥一体化'],
  pest_control: ['农药配制', '喷雾操作', '生物防治', '病害识别', '虫害识别'],
  pruning: ['修剪', '嫁接'],
  harvest: ['果蔬采收', '分级包装', '冷链处理'],
  weeding: ['除草'],
  planting: ['播种', '炼苗', '嫁接'],
};
```

## 五、人员匹配算法

### 5.1 匹配评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 技能匹配 | 60% | 工人技能是否满足任务需求 |
| 位置匹配 | 20% | 工人工作区域与任务区域一致性 |
| 工作负载 | 20% | 工人当前工作负载是否饱满 |

### 5.2 技能匹配计算

```typescript
function calculateSkillScore(workerSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 100;

  const matches = requiredSkills.map(skill =>
    workerSkills.some(ws =>
      ws.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(ws.toLowerCase())
    )
  );

  const matchedCount = matches.filter(m => m).length;
  return Math.round((matchedCount / requiredSkills.length) * 100);
}
```

### 5.3 综合评分

```typescript
const matchScore = Math.round(
  skillScore * 0.6 +   // 技能权重 60%
  locationScore * 0.2 + // 位置权重 20%
  workloadScore * 0.2   // 负载权重 20%
);
```

## 六、推荐数据结构

### 6.1 SmartRecommendation 接口

```typescript
interface SmartRecommendation {
  id: string;              // 推荐ID
  recommendId: string;     // 推荐编号 REC20260413-001

  // 来源
  source: {
    type: 'env_alert' | 'pest_alert' | 'stage_task' | 'periodic';
    description: string;
    dataReference: string;
  };

  // 任务信息
  task: {
    types: FarmOperationType[];
    typeLabels: string[];
    field: string;
    fieldId: string;
    crop: string;
    batchId?: string;
    batchCode?: string;
    suggestedDate: string;
    latestDate?: string;
  };

  // 推荐理由
  reason: {
    primary: string;
    secondary: string[];
    evidence: { type: string; label: string; value: string }[];
  };

  // 人员匹配
  assignment: {
    recommendedWorkerId: string;
    recommendedWorkerName: string;
    matchScore: number;
    skillsMatch: { required: string; workerHas: boolean }[];
    alternatives: { workerId: string; workerName: string; matchScore: number }[];
  };

  // 优先级
  priority: {
    level: 'urgent' | 'high' | 'medium' | 'low';
    score: number;
    factors: { name: string; weight: number; value: number }[];
  };

  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  expiresAt?: string;
}
```

## 七、温室名称映射表

### 7.1 taskDispatchTasks 与 cropBatches 映射

| taskDispatchTasks.field | 映射到 | cropBatches.greenhouseName | 作物 |
|------------------------|--------|---------------------------|------|
| 1号棚/2号棚/3号棚 | → | 玻璃温室A区 | 番茄 |
| 4号棚/5号棚 | → | 玻璃温室B区 | 黄瓜 |
| 6号棚/7号棚 | → | 日光温室1号 | 草莓 |
| 8号棚 | → | 玻璃温室C区 | 辣椒 |
| 9号棚 | → | 日光温室2号 | 生菜 |
| 11号棚 | → | 日光温室4号 | 茄子 |

### 7.2 巡田记录温室ID映射

| farmInspectionRecords | 映射到 cropBatches |
|----------------------|-------------------|
| GH001 | G001 |
| GH002 | G002 |
| GH003 | G003 |
| GH004 | G004 |
| GH005 | G005 |

## 八、推荐优先级计算

### 8.1 环境异常优先级

```typescript
const priority = {
  level: alert.severity === 'critical' ? 'urgent' : 'high',
  score: alert.severity === 'critical' ? 95 : 75,
  factors: [
    { name: '环境异常', weight: 30, value: alert.severity === 'critical' ? 100 : 60 },
    { name: '紧急程度', weight: 30, value: alert.severity === 'critical' ? 100 : 50 },
    { name: '作物影响', weight: 20, value: 70 },
    { name: '处理时效', weight: 20, value: 80 },
  ],
};
```

### 8.2 病虫害预警优先级

```typescript
const priority = {
  level: urgencyLevel >= 5 ? 'urgent' : urgencyLevel >= 4 ? 'high' : 'medium',
  score: Math.min(urgencyLevel * 18, 100),
};
```

### 8.3 阶段任务优先级

```typescript
let priority: RecommendationPriority = 'medium';
let priorityScore = 50;

if (daysSince >= intervalDays * 2) {
  priority = 'high';
  priorityScore = 75;
} else if (daysSince >= intervalDays * 1.5) {
  priority = 'medium';
  priorityScore = 60;
}
```

## 九、已知的温室名称不一致问题

### 9.1 问题描述

系统中存在多套温室命名体系：

1. `taskDispatchTasks` 使用 "1号棚"、"8号棚" 格式
2. `cropBatches` 使用 "玻璃温室A区"、"玻璃温室C区" 格式
3. `iotSensors` 使用 "玻璃温室A区" 格式
4. `farmInspectionRecords` 使用 "玻璃温室A区" 格式 + "GH001" ID

### 9.2 解决方案

使用 `GREENHOUSE_NAME_MAP` 映射表统一名称：

```typescript
const GREENHOUSE_NAME_MAP: Record<string, string> = {
  '1号棚': '玻璃温室A区',
  '8号棚': '玻璃温室C区',
  // ...
};
```

### 9.3 注意事项

- **6号棚** 是草莓，映射到日光温室1号（不是玻璃温室C区）
- **8号棚** 是辣椒，映射到玻璃温室C区
- 巡田记录使用 `GH001` 格式ID，需要映射到 `G001`

## 十、后续优化方向

### 10.1 数据驱动改造

当前使用固定演示数据，后续应：

1. 连接真实IoT传感器API获取实时数据
2. 连接真实巡田记录系统
3. 连接作物批次管理系统
4. 根据真实任务历史计算周期

### 10.2 规则配置化

将硬编码的规则改为数据库配置：

```typescript
interface RecommendationRule {
  id: string;
  name: string;
  type: 'env' | 'pest' | 'stage' | 'periodic';
  enabled: boolean;
  conditions: { field: string; operator: string; value: any }[];
  actions: { taskTypes: FarmOperationType[]; priority: string }[];
  cooldownHours: number;
}
```

### 10.3 机器学习优化

- 基于历史任务数据训练预测模型
- 分析任务完成时间优化时间估算
- 学习工人技能偏好优化分配

## 十一、文件清单

### 核心文件

| 文件 | 说明 |
|------|------|
| `src/hooks/farm/useSmartRecommendation.ts` | 智能推荐主Hook |
| `src/hooks/farm/useEnvAlert.ts` | 环境异常检测 |
| `src/hooks/farm/usePestAlert.ts` | 病虫害预警检测 |
| `src/hooks/farm/useWorkerMatch.ts` | 人员技能匹配 |
| `src/data/recommendationRules.ts` | 推荐规则配置 |
| `src/types/farm/common.ts` | 类型定义 |

### 数据文件

| 文件 | 说明 |
|------|------|
| `src/data/mockData.ts` | IoT传感器、作物批次等 |
| `src/data/farmMockData.ts` | 巡田记录、任务历史等 |

### 页面文件

| 文件 | 说明 |
|------|------|
| `src/components/farm/taskDispatch/TaskDispatchPage.tsx` | 任务调度页面（含智能推荐） |

## 十二、演示数据说明

当前版本使用固定10条演示数据用于界面展示：

1. **REC-DEMO-001** - 环境异常：玻璃温室C区温度过高（紧急）
2. **REC-DEMO-002** - 病虫害：玻璃温室B区发现灰霉病（紧急）
3. **REC-DEMO-003** - 阶段任务：玻璃温室A区番茄施肥（高优先级）
4. **REC-DEMO-004** - 环境异常：玻璃温室C区湿度过低（高优先级）
5. **REC-DEMO-005** - 阶段任务：玻璃温室B区黄瓜灌溉（中优先级）
6. **REC-DEMO-006** - 病虫害：日光温室1号发现蚜虫（中优先级）
7. **REC-DEMO-007** - 阶段任务：日光温室1号草莓采收（高优先级）
8. **REC-DEMO-008** - 例行任务：日光温室2号每日灌溉检查（低优先级）
9. **REC-DEMO-009** - 阶段任务：日光温室2号生菜采收（中优先级）
10. **REC-DEMO-010** - 环境异常：玻璃温室C区光照过强（中优先级）

---

*文档版本：v1.0*
*最后更新：2026-04-13*
