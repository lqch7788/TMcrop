# 种植管理系统AI功能对接开发需求和任务说明书

**文档编号：** PM-AI-2026-001-V3
**创建日期：** 2026-04-23
**系统版本：** V1.1
**文档状态：** V3版本（融合版）
**适用对象：** AI开发工程师、算法工程师、系统集成工程师

---

## 文档说明

本文档为"绿禾种植管理系统"（以下简称"本系统"）的AI功能对接开发需求和任务说明书。本文档基于对系统现有功能的代码级分析，结合对系统业务流程、数据结构、现有AI能力的全面评估，识别出可通过AI技术优化和增强的业务场景，为AI开发人员提供明确的开发方向、技术要求和实施任务。

**目标：** 通过引入AI智能系统，使种植管理系统从"信息化管理"升级为"智能化决策"，提升生产效率、降低人力成本、优化资源配置。

---

## 一、系统现状概述

### 1.1 系统定位与功能范围

本系统是一个面向现代化农业种植的综合管理平台，采用React + TypeScript构建，前端状态管理使用LocalStorage持久化。系统主要功能模块包括：

| 模块 | 核心功能 | 页面数量 |
|------|---------|---------|
| 农事任务管理 | 任务创建、分派、执行、提交、验收全流程 | 8+个页面 |
| 智能派工 | 7因子评分推荐、人员匹配、每日/月度规划 | 5个核心组件 |
| 巡查管理 | 巡查记录、问题上报、GPS定位 | 4个页面 |
| 问题管理 | 问题分派、处理、验收流程 | 3个页面 |
| 生产计划 | 技术方案、生产批次、审批流程 | 6+个页面 |
| 物料采购 | 采购申请、库存管理、供应商 | 8+个页面 |
| 考勤管理 | 签到签退、请假加班、排班调度 | 6个Tab页面 |
| 工作日志 | 日志记录、工时统计、出勤分析 | 4个页面 |
| 数据看板 | Dashboard、报表、人效分析 | 10+个页面 |
| 审批流程 | 多类型审批（采购、生产、采收等） | 4个审批页面 |

### 1.2 技术栈

- **前端框架：** React 19 + TypeScript 5.8
- **状态管理：** React Hooks + LocalStorage（当前阶段）
- **UI组件：** Tailwind CSS + Lucide图标
- **构建工具：** Vite 6.2
- **数据持久化：** LocalStorage（STORAGE_KEYS统一管理）

### 1.3 现有AI能力详细评估

通过代码级分析，现有AI能力评估如下：

| AI能力模块 | 代码位置 | 成熟度 | 现状问题 |
|-----------|---------|--------|---------|
| **智能派工推荐** | `useComprehensiveDispatch.ts` | ★★★☆☆ | 7因子评分框架完整，但使用Mock数据，未连接真实后端API |
| **AI优化建议** | `useAIOptimization.ts` | ★★☆☆☆ | 仅基于评分差值15分阈值触发，无真正AI推理 |
| **智能推荐** | `useSmartRecommend.ts` | ★★☆☆☆ | 3因子/5因子切换，但权重硬编码 |
| **作物生长预测** | `useCropGrowthEngine.ts` | ★★☆☆☆ | 基于固定周期模型，无环境因素学习 |
| **每日规划** | `useDailyTaskPlanning.ts` | ★★☆☆☆ | 简单统计聚合，无AI预测 |
| **月度规划** | `useMonthlyTaskPlanning.ts` | ★★☆☆☆ | 基础汇总，物料/人员需求为估算值 |
| **环境数据** | `useEnvironmentData.ts` | ★★★☆☆ | 基础环境数据获取，无预测能力 |
| **病虫害预警** | `recommendationRules.ts` | ★★☆☆☆ | 固定阈值+关键词匹配，无法处理图像 |

**总体评估：** 系统AI能力处于"规则引擎+展示"阶段，现有算法框架完整但缺乏真实AI集成，所有数据源均为Mock，无法用于生产环境。

### 1.4 现有AI相关代码文件清单

| 文件路径 | 行数 | 功能描述 | AI能力 |
|---------|------|---------|--------|
| `src/hooks/useAIOptimization.ts` | ~150 | AI优化建议Hook | 评分差值比较 |
| `src/hooks/useComprehensiveDispatch.ts` | ~400 | 综合智能派工Hook | 7因子评分引擎 |
| `src/hooks/useSmartRecommend.ts` | ~200 | 智能推荐Hook | 匹配算法 |
| `src/hooks/useCropGrowthEngine.ts` | ~300 | 作物生长引擎Hook | 周期预测 |
| `src/hooks/useEnvironmentData.ts` | ~100 | 环境数据分析Hook | 数据获取 |
| `src/hooks/useDailyTaskPlanning.ts` | ~200 | 每日任务规划Hook | 统计聚合 |
| `src/hooks/useMonthlyTaskPlanning.ts` | ~250 | 月度任务规划Hook | 汇总估算 |
| `src/components/dispatch/AIRecommendationPanel.tsx` | ~300 | AI推荐面板组件 | 展示层 |
| `src/components/dispatch/PredictedTasksPanel.tsx` | ~200 | 预测任务面板 | 展示层 |
| `src/components/dispatch/DispatchMetricsDashboard.tsx` | ~150 | 派工指标仪表板 | 指标展示 |
| `src/data/recommendationRules.ts` | ~500 | 推荐规则配置 | 规则引擎 |

### 1.5 当前系统核心问题

通过代码分析，发现以下核心问题：

| 问题类别 | 具体问题 | 影响程度 | 优先级 |
|---------|---------|---------|--------|
| **数据源问题** | 所有AI功能使用Mock数据，未连接真实后端 | 高 | P0 |
| **算法局限** | 7因子权重硬编码，无法运行时调整 | 中 | P1 |
| **预测能力弱** | 任务完成时间预测为固定公式，非AI预测 | 中 | P1 |
| **路径缺失** | 路径优化仅简单区域合并，无真正算法 | 低 | P2 |
| **环境集成浅** | 天气评分二元化（适合/不适合），无置信度 | 高 | P1 |
| **置信度虚假** | AI置信度固定75%，无统计依据 | 中 | P1 |
| **协作未考虑** | 未考虑工人间协作关系和经验传承 | 低 | P3 |
| **知识库缺失** | 无历史案例库供AI学习 | 中 | P2 |

---

## 二、系统业务流程与数据流

### 2.1 核心业务闭环

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          农事管理系统核心业务闭环                            │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  任务创建    │ ──► │  智能分派   │ ──► │  执行跟踪   │ ──► │   验收评价  │
    │ createTask  │     │ dispatch    │     │ execute     │     │  verify    │
    └─────────────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
                                │                    │                    │
                                │  useTasks          │  syncWorkLog      │  syncAttendance
                                │  状态机管理         │  工作日志          │  考勤记录
                                ▼                    ▼                    ▼
                    ┌─────────────────────────────────────────────────────┐
                    │                  localStorage 数据持久层               │
                    │   TASKS | WORK_LOGS | ATTENDANCE | PROBLEMS | ...    │
                    └─────────────────────────────────────────────────────┘
```

### 2.2 任务状态机（10种状态）

```typescript
// 状态定义：src/types/task.ts
type TaskStatus =
  | 'draft'           // 草稿
  | 'pending'         // 已发布（待接受）
  | 'accepted'        // 已接受
  | 'in_progress'    // 处理中
  | 'waiting_acceptance' // 待验收
  | 'completed'       // 已完成
  | 'rejected'        // 返工中
  | 'failed'          // 任务失败
  | 'cancelled'       // 已取消
  | 'abandoned';      // 已放弃
```

### 2.3 现有派工算法（7因子评分）

```typescript
// src/hooks/useComprehensiveDispatch.ts
const weights = {
  skillMatch: 0.30,           // 技能匹配度 30%
  location: 0.25,             // 地理位置 25%
  currentLoad: 0.20,          // 当前负荷 20%
  historicalPerformance: 0.15, // 历史表现 15%
  urgency: 0.10,             // 紧急程度 10%
  batchFamiliarity: 0.03,     // 批次熟悉度 3%
  weatherScore: 0.05         // 天气影响 5%
};

// 综合评分计算
const matchScore = Math.round(
  skillMatchRate * 0.30 +
  locationScore * 0.20 +
  loadScore * 0.20 +
  performanceScore * 0.15 +
  urgencyScore * 0.10 +
  batchFamiliarityScore * 0.03 +
  weatherScore * 0.05
);
```

---

## 三、AI功能需求全景

### 3.1 AI应用场景分类（基于系统现状）

| 类别 | 系统现状 | 应用场景 | 优先级 | 预期收益 |
|------|---------|---------|--------|---------|
| **智能决策** | 已有7因子框架，需升级为真实AI | 智能任务分派、智能排班、审批辅助 | **P0** | 派工效率提升50%+ |
| **智能预测** | 周期模型，需引入机器学习 | 作物产量预测、病虫害预警、任务工时预测 | **P0** | 病虫害损失降低20%+ |
| **智能优化** | 无，需新开发 | 资源优化配置、路径优化、库存优化 | **P1** | 成本降低15%+ |
| **智能识别** | 关键词匹配，需引入CV | 病虫害图像识别、作物状态识别 | **P1** | 识别准确率>90% |
| **智能交互** | 无，需新开发 | 语音录入、智能问答、报告自动生成 | **P2** | 操作效率提升30%+ |
| **智能分析** | 基础统计，需增强 | 异常检测、趋势分析、出勤分析 | **P2** | 管理精度提升25%+ |

### 3.2 需求映射表（基于代码分析）

| AI功能 | 对应现有模块 | 改进点 | 开发优先级 |
|-------|------------|--------|-----------|
| 智能派工增强 | `useComprehensiveDispatch` | Mock数据→真实API、动态权重 | P0 |
| 任务时间预测 | 无 | 基于历史工时学习预测 | P0 |
| 路径优化 | 无 | TSP算法解决执行顺序 | P1 |
| 作物生长预测 | `useCropGrowthEngine` | 固定周期→多因素模型 | P0 |
| 病虫害预警 | `recommendationRules` | 规则→ML预测 | P0 |
| 病虫害图像识别 | 无 | 拍照→AI诊断 | P1 |
| 物料需求预测 | 无 | 基于消耗历史预测 | P1 |
| 环境智能预警 | `useEnvironmentData` | 固定阈值→自适应 | P1 |
| 智能排班 | `SchedulePage` | 手动→AI生成 | P1 |
| 出勤异常检测 | 无 | 基于历史模式学习 | P2 |
| AI报告生成 | 无 | 模板→自动生成 | P2 |
| 智能问答 | 无 | 新开发 | P2 |

---

## 四、详细AI功能需求

### 4.1 智能决策类

#### AI-01：智能任务分派引擎 【P0 - 核心需求】

**现状分析：**
- 现有 `useComprehensiveDispatch.ts` 实现了7因子评分框架
- 所有人员数据来自Mock（6个测试员工）
- 权重硬编码，无法运行时调整
- 无历史反馈学习机制

**AI功能需求：**

| 需求项 | 现状 | 目标 | 技术方案 |
|--------|------|------|---------|
| 真实数据源对接 | Mock数据 | 连接后端API获取真实员工档案 | REST API |
| 动态权重调整 | 硬编码0.3/0.25/... | 根据历史效果自动学习调整 | 强化学习 |
| 人员能力画像 | 无 | 构建技能熟练度模型 | 聚类分析 |
| 任务时间预测 | 固定公式 | 基于历史工时预测 | 回归模型 |
| 路径优化 | 简单区域合并 | 多任务最优执行顺序 | TSP算法 |

**输入数据：**
```typescript
interface DispatchContext {
  task: {
    id: string;
    type: TaskType;           // 任务类型
    area: string;            // 区域
    difficulty: number;       // 难度 1-5
    estimatedHours: number;    // 估算工时
    urgency: 'low' | 'normal' | 'high' | 'urgent';
  };
  workers: {
    id: string;
    name: string;
    skills: string[];        // 技能列表
    location: { lat: number; lng: number };
    currentLoad: number;      // 当前任务数
    performanceScore: number; // 历史评分 0-100
    availableHours: number;   // 剩余可用工时
  }[];
  environment: {
    weather: string;
    temperature: number;
  };
  historicalData: TaskPerformance[];  // 历史表现数据
}
```

**输出数据：**
```typescript
interface DispatchRecommendation {
  topCandidates: {
    workerId: string;
    workerName: string;
    matchScore: number;       // 0-100
    confidence: number;       // 置信度 0-1
    reasoning: string[];       // 推荐理由
    estimatedHours: number;    // 预测完成工时
    route?: Task[];           // 优化执行顺序
    riskWarnings: string[];    // 风险提示
  }[];
  overallScore: number;      // 整体方案评分
  alternatives: DispatchPlan[];
}
```

**预期效果：**
- 派工效率：5分钟/任务 → 1分钟/任务
- 推荐采纳率：>70%
- 任务完成率提升：>15%
- 工时预测误差：≤20%

---

#### AI-02：智能人员排班系统 【P1】

**现状分析：**
- 现有 `SchedulePage.tsx` 排班功能较基础
- 排班依赖人工经验
- 无工作量均衡分析

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 智能排班生成 | 根据任务需求、人员可用性自动生成排班表 | CSP求解器 |
| 工作量均衡 | 确保各人员工作量合理分配 | 优化算法 |
| 冲突检测 | 自动检测排班冲突 | 规则引擎 |
| 调整建议 | 突发情况时自动给出调整方案 | 重调度算法 |

---

#### AI-03：智能审批辅助 【P2】

**现状分析：**
- 现有审批流程分散在多个ApprovalPage
- 审批信息量大，人工判断耗时
- 无智能辅助决策

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 审批风险评分 | 对审批请求进行风险评分 | 异常检测 |
| 智能建议 | 给出通过/驳回建议 | 分类算法 |
| 相似案例 | 推荐历史相似审批案例 | 相似度计算 |
| 合规检查 | 自动检查是否符合规章 | NLP规则匹配 |
| 审批摘要 | 自动生成审批要点摘要 | NLP摘要生成 |

---

### 4.2 智能预测类

#### AI-04：作物生长预测系统 【P0】

**现状分析：**
- 现有 `useCropGrowthEngine.ts` 基于固定周期模型
- 未考虑实际环境因素
- 无产量预测能力

**AI功能需求：**

| 需求项 | 现状 | 目标 | 技术方案 |
|--------|------|------|---------|
| 生长阶段预测 | 固定周期 | 多因素动态预测 | LSTM/Transformer |
| 产量预测 | 无 | 历史+环境+管理因素 | 回归模型 |
| 异常预警 | 无 | 生长偏离预警 | 异常检测 |
| 优化建议 | 固定规则 | 个性化生长建议 | 强化学习 |

**输入数据：**
```typescript
interface CropGrowthInput {
  batchId: string;
  cropType: string;
  plantDate: string;
  currentStage: string;
  envData: {
    temperature: number;     // 日均温
    humidity: number;         // 湿度
    light: number;            // 光照时长
    co2: number;             // CO2浓度
    soilMoisture: number;     // 土壤湿度
  }[];
  operations: {
    type: string;            // 施肥/灌溉/打药
    date: string;
    quantity: number;
  }[];
  historicalYield: number;    // 历史产量
}
```

**输出数据：**
```typescript
interface CropGrowthOutput {
  predictedStage: string;
  predictedMaturityDate: string;
  predictedYield: { min: number; max: number; expected: number; confidence: number };
  growthDeviation: { date: string; expected: string; actual: string; deviation: number }[];
  optimizationSuggestions: string[];
  alertLevel: 'normal' | 'warning' | 'critical';
}
```

**预期效果：**
- 产量预测准确率：>85%
- 异常生长发现提前：3-5天
- 种植计划准确率提升：25%+

---

#### AI-05：病虫害智能预警系统 【P0】

**现状分析：**
- 现有 `recommendationRules.ts` 基于关键词匹配
- 无法处理图像
- 预警为被动发现

**AI功能需求：**

| 需求项 | 现状 | 目标 | 技术方案 |
|--------|------|------|---------|
| 病虫害预测 | 关键词匹配 | 环境因素预测发生概率 | 分类模型 |
| 图像识别 | 无 | 拍照自动诊断 | CNN |
| 传播预测 | 无 | 预测传播范围 | 空间模型 |
| 预警触发 | 被动发现 | 主动预警 | 时序分析 |

**预期效果：**
- 预警准确率：>80%
- 提前预警：>3天
- 图像识别准确率：>90%

---

#### AI-06：任务工时预测系统 【P1 - 新增核心需求】

**现状分析：**
- 现有工时为人工估算
- 无历史工时学习
- 派工决策缺乏时间依据

**AI功能需求：**
```typescript
interface WorkHourPrediction {
  taskType: string;
  area: string;
  difficulty: number;
  workerSkill?: string;
  weather?: string;
  historicalData: {
    taskType: string;
    area: string;
    actualHours: number;
    workerId: string;
  }[];
}

// 预测模型：XGBoost/LSTM
// 特征：任务类型、区域、难度、工人技能、历史工时、天气
```

---

### 4.3 智能优化类

#### AI-07：资源优化配置系统 【P1】

**现状分析：**
- 物料采购依赖人工经验
- 库存无智能预警
- 无消耗预测

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 物料需求预测 | 预测消耗速度 | 时序预测 |
| 智能采购 | 生成采购建议 | 库存优化 |
| 库存预警 | 动态安全库存 | 异常检测 |
| 成本分析 | 成本结构优化 | 分析模型 |

---

#### AI-08：路径优化算法 【P1 - 新增需求】

**现状分析：**
- 多任务派工时仅按区域简单合并
- 未考虑执行顺序优化
- 无交通时间估算

**AI功能需求：**
```typescript
interface RouteOptimization {
  tasks: Task[];              // 同一区域多个任务
  workerLocation: { lat: number; lng: number };
  greenhouses: Map<string, { lat: number; lng: number }>;

  // 输出：最优执行顺序
  optimizedRoute: {
    taskId: string;
    order: number;
    estimatedArrival: string;
    reasoning: string;
  }[];
  totalEstimatedTime: number;
  distanceSaved: number;      // 相比原顺序节省距离
}
```

---

### 4.4 智能识别类

#### AI-09：病虫害图像识别系统 【P1】

**现状分析：**
- 无图像识别能力
- 病虫害识别依赖人工
- 照片仅存储无分析

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 图像采集 | 拍照上传 | 移动端适配 |
| 病害识别 | 识别病害类型 | CNN/ResNet |
| 严重程度 | 评估严重程度 | 图像分割 |
| 防治方案 | 推荐防治措施 | 知识图谱 |
| 相似案例 | 匹配历史案例 | 图像检索 |

**技术要求：**
- 模型：EfficientNet-B4+
- 训练数据：>5000张标注图片
- 响应时间：<3秒
- 识别病种：>50种常见病虫害

---

#### AI-10：作物生长状态识别 【P2】

**现状分析：**
- 生长阶段依赖人工判断
- 无缺素症状识别
- 生长量估算靠经验

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 阶段识别 | AI判断生长阶段 | 图像分类 |
| 健康评估 | 评估生长健康度 | 图像分析 |
| 缺素识别 | 识别营养缺素症 | 图像分类 |
| 生长量估算 | 估算作物大小 | 图像测量 |

---

### 4.5 智能交互类

#### AI-11：智能语音录入 【P2】

**现状分析：**
- 田间操作需手动输入
- 不方便打字
- 效率低

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 语音转文字 | ASR识别 | 阿里云/讯飞ASR |
| 农业术语 | 领域词汇适配 | 语言模型微调 |
| 指令识别 | 语音控制操作 | NLP意图识别 |

---

#### AI-12：智能问答助手 【P2】

**现状分析：**
- 操作帮助依赖文档
- 数据查询需手动
- 新用户上手难

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 数据查询 | 自然语言查询 | Text-to-SQL |
| 操作指导 | 步骤指导 | 知识图谱 |
| 决策建议 | 智能建议 | RAG |

---

#### AI-13：智能报告生成 【P2】

**现状分析：**
- 报告手工汇总
- 数据分析耗时
- 缺乏洞察

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 数据汇总 | 自动聚合 | 数据处理 |
| 趋势分析 | 发现趋势 | 时序分析 |
| 关键发现 | 提取要点 | NLP摘要 |
| 报告生成 | 生成可读报告 | 模板+LLM |

---

### 4.6 智能分析类

#### AI-14：异常检测系统 【P2】

**现状分析：**
- 异常依赖人工发现
- 数据量大难覆盖
- 问题发现滞后

**AI功能需求：**

| 需求项 | 描述 | 技术方案 |
|--------|------|---------|
| 环境异常 | 环境数据异常检测 | 时序异常 |
| 业务异常 | 任务超时等逻辑异常 | 规则+模型 |
| 趋势异常 | 趋势突变检测 | 趋势分析 |
| 根因分析 | 异常原因分析 | 因果推理 |

---

#### AI-15：出勤异常检测 【P2 - 新增需求】

**现状分析：**
- `WorkerAttendancePage` 仅记录数据
- 无模式分析
- 异常靠人工发现

**AI功能需求：**
```typescript
interface AttendanceAnomaly {
  type: 'consecutive_absence' | 'frequent_late' | 'leave_anomaly' | 'risk_warning';
  workerId: string;
  workerName: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
  basedOnPattern: {
    normalCheckIn: string;     // 正常上班时间
    actualCheckIn: string[];   // 实际签到时间
    deviation: number;         // 偏差分钟
  };
  suggestedAction: string;
}

// 检测算法：滑动窗口 + 模式识别
```

---

## 五、AI系统架构设计

### 5.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    种植管理系统前端                        │
│  (React + TypeScript + Vite)                          │
├─────────────────────────────────────────────────────────┤
│  AI功能集成层 (TypeScript SDK)                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  AIService SDK                                    │  │
│  │  - createSmartDispatch()  智能派工                 │  │
│  │  - predictGrowth()       生长预测                 │  │
│  │  - detectPest()          病虫害识别                │  │
│  │  - optimizeRoute()        路径优化                  │  │
│  │  - generateReport()       报告生成                 │  │
│  └──────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  AI服务后端 (Python FastAPI)                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │推荐服务│ │预测服务│ │识别服务│ │NLP服务 │          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
├─────────────────────────────────────────────────────────┤
│  数据存储                                                │
│  PostgreSQL │ InfluxDB │ 向量数据库 │ 对象存储           │
└─────────────────────────────────────────────────────────┘
```

### 5.2 前端SDK集成示例

```typescript
// src/services/ai/AIServiceSDK.ts

class AIServiceSDK {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  // 智能派工
  async smartDispatch(context: DispatchContext): Promise<DispatchRecommendation> {
    // 先调用AI服务
    try {
      return await this.callAPI('/ai/dispatch', context);
    } catch (error) {
      // 降级到现有7因子算法
      return fallbackToLocalAlgorithm(context);
    }
  }

  // 病虫害图像识别
  async detectPest(image: File): Promise<PestDetectionResult> {
    const formData = new FormData();
    formData.append('image', image);
    return this.callAPI('/ai/detect-pest', formData, 'POST');
  }

  // 任务工时预测
  async predictWorkHours(task: Task): Promise<number> {
    return this.callAPI('/ai/predict-hours', task);
  }

  // 降级处理：使用现有本地算法
  private fallbackToLocalAlgorithm(context: DispatchContext): DispatchRecommendation {
    // 使用 useComprehensiveDispatch 的逻辑
    return computeLocalRecommendations(context);
  }
}

export const aiService = new AIServiceSDK({
  baseUrl: process.env.AI_SERVICE_URL,
  apiKey: process.env.AI_API_KEY,
});
```

### 5.3 降级策略

| 场景 | 降级方案 | 触发条件 |
|------|---------|---------|
| AI服务不可用 | 使用本地7因子算法 | 网络错误/服务宕机 |
| AI响应超时(>5s) | 返回缓存结果或本地算法 | 超时 |
| 模型版本异常 | 回滚到上一稳定版本 | 5xx错误 |
| 识别置信度低(<0.7) | 标记"需人工确认" | 低置信度响应 |

### 5.4 技术选型

| 技术领域 | 推荐方案 | 原因 |
|---------|---------|------|
| 机器学习 | PyTorch + scikit-learn | 灵活、生态完善 |
| 时序预测 | Prophet + LSTM | 农业数据季节性强 |
| 图像识别 | EfficientNet + 迁移学习 | 数据量有限 |
| NLP | HuggingFace + RAG | 知识库问答 |
| 后端框架 | FastAPI + Docker | 快速部署 |
| 模型监控 | MLflow + Prometheus | 生命周期管理 |

---

## 六、开发任务清单

### 6.1 第一阶段：基础设施搭建（4-6周）

| 任务 | 描述 | 优先级 | 产出物 |
|------|-----|--------|--------|
| T01 | AI服务架构设计 | P0 | 架构文档、API规范 |
| T02 | 前端AI SDK开发 | P0 | TypeScript SDK |
| T03 | 数据采集管道 | P0 | 数据管道 |
| T04 | 特征工程平台 | P0 | Feature Store |
| T05 | 模型训练环境 | P0 | 训练平台 |
| T06 | 模型部署服务 | P0 | 推理API |

### 6.2 第二阶段：核心AI功能（8-12周）

| 任务 | 对应需求 | 优先级 | 产出物 |
|------|---------|--------|--------|
| T07 | 智能派工增强 | P0 | 推荐模型+API |
| T08 | 作物生长预测 | P0 | 预测模型+API |
| T09 | 病虫害预警 | P0 | 预警模型+API |
| T10 | 任务工时预测 | P1 | 预测模型+API |
| T11 | 路径优化算法 | P1 | 优化算法+API |
| T12 | 病虫害图像识别 | P1 | 识别模型+API |
| T13 | 物料需求预测 | P1 | 预测模型+API |
| T14 | 环境智能预警 | P1 | 预警模型+API |

### 6.3 第三阶段：高级AI功能（8-10周）

| 任务 | 对应需求 | 优先级 | 产出物 |
|------|---------|--------|--------|
| T15 | 智能排班系统 | P1 | 排班算法+API |
| T16 | 智能审批辅助 | P2 | 辅助系统 |
| T17 | 语音识别集成 | P2 | 语音服务 |
| T18 | 智能问答助手 | P2 | 问答系统 |
| T19 | 报告自动生成 | P2 | 报告服务 |
| T20 | 异常检测系统 | P2 | 检测服务 |
| T21 | 出勤异常检测 | P2 | 检测服务 |
| T22 | 历史案例推荐 | P2 | 推荐服务 |

### 6.4 第四阶段：集成优化（4-6周）

| 任务 | 描述 | 优先级 | 产出物 |
|------|-----|--------|--------|
| T23 | 前端集成开发 | P0 | 集成代码 |
| T24 | 模型监控系统 | P1 | 监控面板 |
| T25 | A/B测试框架 | P1 | 测试平台 |
| T26 | 性能优化 | P1 | 优化方案 |
| T27 | 用户培训 | P2 | 培训材料 |

---

## 七、验收指标

### 7.1 AI功能效果指标

| AI功能 | 验收指标 | 当前状态 | 目标值 | 测试方法 |
|-------|---------|---------|--------|---------|
| 智能派工 | 推荐采纳率 | N/A(Mock) | >70% | A/B测试 |
| 智能派工 | 任务完成率 | - | 提升15% | 对比实验 |
| 智能派工 | 工时预测误差 | N/A | ≤20% | MAPE计算 |
| 路径优化 | 节省时间 | 0 | ≥15% | 时间对比 |
| 生长预测 | 产量准确率 | N/A | >85% | RMSE |
| 病虫害预警 | 预警准确率 | ~60% | >80% | 召回率 |
| 病虫害预警 | 提前天数 | 0 | >3天 | 时间差 |
| 病虫害识别 | 识别准确率 | N/A | >90% | 准确率 |
| 物料预测 | 需求准确率 | N/A | >75% | MAPE |
| 环境预警 | 预警准确率 | ~70% | >80% | 准确率 |

### 7.2 业务效果指标

| 指标 | 当前值(人工) | 目标值(AI辅助) | 提升幅度 |
|------|-------------|--------------|---------|
| 任务分派效率 | 5分钟/任务 | 1分钟/任务 | 80%↑ |
| 病虫害发现 | 发现时已损失 | 提前3天预警 | 损失↓20% |
| 产量预测准确度 | 经验估计±30% | 85%+准确率 | 精确度↑ |
| 人员利用率 | 60-70% | 80%+ | 15%↑ |
| 管理决策时间 | 30分钟/决策 | 5分钟/决策 | 83%↑ |

---

## 八、数据需求

### 8.1 历史数据采集

| 数据类型 | 当前状态 | 需要量 | 存储方案 |
|---------|---------|--------|---------|
| 任务执行记录 | LocalStorage | ~10万条 | PostgreSQL |
| 考勤记录 | LocalStorage | ~50万条 | PostgreSQL |
| 工作日志 | LocalStorage | ~20万条 | PostgreSQL |
| 巡查记录 | LocalStorage | ~5万条 | PostgreSQL |
| 环境传感器 | 部分IoT | ~1000万条 | InfluxDB |
| 病虫害照片 | 有限 | ~1万张 | OSS |

### 8.2 数据质量要求

| 要求 | 标准 | 当前差距 |
|------|------|---------|
| 完整性 | 字段缺失<5% | 需评估 |
| 准确性 | >95% | 需评估 |
| 一致性 | 跨系统>98% | 需评估 |
| 时效性 | 实时<1分钟 | 需优化 |

---

## 九、风险与应对

| 风险 | 影响 | 概率 | 应对 |
|------|------|------|------|
| 数据质量不足 | 模型效果差 | 高 | 数据治理、补充标注 |
| 模型效果不达标 | AI不可用 | 中 | 降级策略、保留人工 |
| 响应时间长 | 体验差 | 中 | 缓存、异步、模型优化 |
| 模型漂移 | 效果下降 | 中 | 定期重训练、监控 |
| 用户不接受 | 功能闲置 | 中 | 可解释性、渐进引导 |

---

## 十、项目里程碑

| 阶段 | 时间 | 里程碑 | 交付 |
|------|------|--------|------|
| 第1阶段 | W1-W6 | 基础设施就绪 | SDK、训练平台 |
| 第2阶段 | W7-W18 | 核心AI上线 | 派工/预测/预警 |
| 第3阶段 | W19-W28 | 高级功能上线 | 识别/交互/分析 |
| 第4阶段 | W29-W34 | 集成完成 | 完整系统 |

---

## 附录

### A. 核心类型定义

```typescript
// 任务类型
type TaskType = 'fertilization' | 'irrigation' | 'spraying' | 'pruning' | 'scouting' | 'harvesting' | 'other';

// 人员能力
interface WorkerCapability {
  workerId: string;
  skills: { skill: string; level: 'junior' | 'mid' | 'senior' }[];
  performanceHistory: number[];  // 历史评分
  workHourPatterns: { date: string; hours: number }[];
}
```

### B. 术语表

| 术语 | 说明 |
|------|------|
| 7因子评分 | 技能+位置+负荷+表现+紧急+批次+天气 |
| TSP | 旅行商问题，路径优化基础算法 |
| CSP | 约束满足问题，排班优化基础 |
| RAG | 检索增强生成，AI问答技术 |
| Model Drift | 模型漂移，效果随时间下降 |

---

**文档版本历史**

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-04-23 | 初始版本 |
| V2.0 | 2026-04-23 | 合并两个文档 |
| V3.0 | 2026-04-23 | 深度融合版，结合系统代码现状 |

*文档结束。*
