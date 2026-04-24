# 智能派工与三任务派发系统对接流程方案

## 一、核心问题分析

### 1.1 当前三个任务派发流程现状

#### 农事任务派发流程
```
新建任务 → 填写任务信息 → 选择执行人 → 派发 → 执行人接收
```

#### 临时任务派发流程
```
新建临时任务 → 填写任务信息 → 选择执行人 → 派发 → 执行人接收 → 审核
```

#### 巡查反馈任务派发流程
```
巡查反馈 → 问题分派中心 → 选择问题 → 选择执行人 → 设置优先级/截止日期 → 分派 → 执行人接收
```

### 1.2 核心矛盾点

**矛盾 1**：任务创建时需要选择执行人 vs 智能派工需要统一推荐执行人

**矛盾 2**：三个任务系统各自独立创建 → 智能派工系统如何介入？

**矛盾 3**：管理者可能希望灵活选择"人工派发"或"AI 推荐"或"全自动派发"

### 1.3 三种方案对比分析

| 方案 | 流程 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **方案 A**：先创建任务，后 AI 推荐 | 新建任务 → 暂不选执行人 → 提交到智能派工系统 → AI 推荐 → 管理者确认 → 派发 | 1. 对现有流程改动小<br>2. 保留人工选择权<br>3. AI 辅助而非替代 | 1. 需要两步操作<br>2. 任务创建后可能有"待推荐"状态 | 适合过渡期，管理者对 AI 信任度不高时 |
| **方案 B**：创建时可选 AI 推荐 | 新建任务 → 选择"AI 推荐"或"手动选择" → 若选 AI 则显示推荐列表 → 确认或更换 → 派发 | 1. 一步完成<br>2. 灵活度高<br>3. 用户体验好 | 1. 需要改造三个任务创建表单<br>2. 推荐算法需实时响应 | 适合成熟期，管理者习惯 AI 辅助后 |
| **方案 C**：双模式并行 | 模式 1：纯人工模式（保持现状）<br>模式 2：全自动模式（AI 预测 → AI 推荐 → 管理者批量确认 → 派发） | 1. 满足不同管理者偏好<br>2. 可渐进式切换<br>3. 灵活性最高 | 1. 架构复杂度高<br>2. 需要模式切换逻辑<br>3. 需要两套数据流 | 适合长期运营，不同场景不同模式 |

### 1.4 推荐方案：**方案 C 增强版 - 三模式并行 + 渐进式切换**

**核心理念**：
- 提供三种派发模式，管理者可根据场景和信任度灵活选择
- 支持渐进式切换：从"纯人工" → "AI 辅助" → "AI 主导"
- 保留人工最终决策权，AI 始终是辅助角色

---

## 二、三模式并行架构设计

### 2.1 模式定义

```typescript
// src/types/dispatch.ts

export type DispatchMode = 'manual' | 'ai_assisted' | 'ai_auto';

export interface DispatchModeConfig {
  mode: DispatchMode;
  
  // 模式配置
  manual: {
    enabled: boolean;
    // 纯人工模式：保持现有流程，不接入 AI
  };
  
  ai_assisted: {
    enabled: boolean;
    showRecommendationOnCreate: boolean;  // 创建任务时是否显示 AI 推荐
    defaultSelectTopWorker: boolean;      // 是否默认选中 AI 推荐的第一名
    requireConfirmation: boolean;         // 是否需要管理者确认
  };
  
  ai_auto: {
    enabled: boolean;
    autoPredictTasks: boolean;            // 是否自动预测任务
    autoRecommendWorkers: boolean;        // 是否自动推荐执行人
    requireBatchConfirmation: boolean;    // 是否需要批量确认
    confidenceThreshold: number;          // 自动派发置信度阈值（默认 80）
    notifyWorkers: boolean;               // 是否自动通知执行人
  };
  
  // 全局配置
  allowModeSwitch: boolean;               // 是否允许随时切换模式
  defaultMode: DispatchMode;              // 默认模式
}
```

### 2.2 模式切换控制

```
┌─────────────────────────────────────────────────────────────┐
│ 智能派工模式设置                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 当前模式：[🤖 AI 辅助模式 ▼]                                │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 📋 模式说明                                             │  │
│ │                                                         │  │
│ │ 👤 纯人工模式                                           │  │
│ │ · 保持现有流程，新建任务时手动选择执行人                │  │
│ │ · AI 不参与推荐和决策                                   │  │
│ │ · 适合：对 AI 信任度不高、特殊任务                      │  │
│ │                                                         │  │
│ │ 🤖 AI 辅助模式（推荐）                                  │  │
│ │ · 新建任务时显示 AI 推荐执行人列表                      │  │
│ │ · 可选择 AI 推荐或手动更换                              │  │
│ │ · 管理者最终确认派发                                    │  │
│ │ · 适合：日常使用，AI 辅助决策                           │  │
│ │                                                         │  │
│ │ 🚀 AI 全自动模式                                        │  │
│ │ · AI 自动预测任务并推荐执行人                           │  │
│ │ · 管理者批量确认后派发                                  │  │
│ │ · 置信度≥80% 的任务可直接自动派发（可选）               │  │
│ │ · 适合：信任 AI、追求效率、标准化任务                   │  │
│ │                                                         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ⚙️ AI 辅助模式配置                                      │  │
│ │                                                         │  │
│ │ ☑️ 新建任务时显示 AI 推荐                               │  │
│ │ ☑️ 默认选中 AI 推荐的第一名                             │  │
│ │ ☑️ 需要管理者确认                                       │  │
│ │                                                         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ⚙️ AI 全自动模式配置                                    │  │
│ │                                                         │  │
│ │ ☑️ 自动预测任务（基于作物生长周期）                     │  │
│ │ ☑️ 自动推荐执行人                                       │  │
│ │ ☑️ 需要批量确认                                         │  │
│ │ ☐️ 置信度≥80% 自动派发（跳过确认）                      │  │
│ │ ☑️ 自动通知执行人                                       │  │
│ │                                                         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [💾 保存设置] [🔄 恢复默认]                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、三种模式详细流程设计

### 3.1 模式 1：纯人工模式（保持现状）

**流程**：完全保持现有流程，AI 不介入

#### 3.1.1 农事任务派发流程

```
┌─────────────────────────────────────────────────────────────┐
│ 农事任务派发页面 (TasksPage.tsx)                             │
│                                                              │
│ [➕ 新建任务]                                                │
│   ↓                                                          │
│ ┌──────────────────────────────────────┐                   │
│ │ 创建农事任务                          │                   │
│ │                                      │                   │
│ │ 任务名称：[________________]         │                   │
│ │ 任务类型：[灌溉 ▼]                   │                   │
│ │ 种植区域：[A 区 ▼]                    │                   │
│ │ 计划日期：[2026-04-22]               │                   │
│ │ 预估工时：[2 小时]                     │                   │
│ │ 优先级：[中 ▼]                       │                   │
│ │ 执行人：[萧峰 ▼]  ← 手动选择         │                   │
│ │                                      │                   │
│ │ [❌ 取消] [✅ 创建并派发]            │                   │
│ └──────────────────────────────────────┘                   │
│   ↓                                                          │
│ 任务创建成功 → 通知执行人 → 任务进入"待接受"状态            │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.2 临时任务派发流程

```
┌─────────────────────────────────────────────────────────────┐
│ 临时任务派发页面 (TempTaskPage.tsx)                          │
│                                                              │
│ [➕ 新建临时任务]                                            │
│   ↓                                                          │
│ ┌──────────────────────────────────────┐                   │
│ │ 创建临时任务                          │                   │
│ │                                      │                   │
│ │ 任务名称：[________________]         │                   │
│ │ 任务描述：[________________]         │                   │
│ │ 紧急程度：[紧急 ▼]                   │                   │
│ │ 计划日期：[2026-04-22]               │                   │
│ │ 执行人：[虚竹 ▼]  ← 手动选择         │                   │
│ │                                      │                   │
│ │ [❌ 取消] [✅ 创建并派发]            │                   │
│ └──────────────────────────────────────┘                   │
│   ↓                                                          │
│ 任务创建成功 → 通知执行人 → 任务进入"待接受"状态            │
│   ↓                                                          │
│ 执行人完成任务 → 管理者审核 → 审核通过/驳回                 │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.3 巡查反馈任务派发流程

```
┌─────────────────────────────────────────────────────────────┐
│ 问题分派中心 (ProblemDispatchPage.tsx)                       │
│                                                              │
│ 问题列表 → 选择问题 → [📤 分派任务]                         │
│   ↓                                                          │
│ ┌──────────────────────────────────────┐                   │
│ │ 分派问题                              │                   │
│ │                                      │                   │
│ │ 问题描述：[A 区番茄发现灰霉病...]      │                   │
│ │ 严重程度：[严重 ▼]                    │                   │
│ │ 执行人：[狄云 ▼]  ← 手动选择         │                   │
│ │ 截止日期：[2026-04-25]               │                   │
│ │ 优先级：[高 ▼]                       │                   │
│ │ ☑️ 需要反馈                           │                   │
│ │                                      │                   │
│ │ [❌ 取消] [✅ 确认分派]              │                   │
│ └──────────────────────────────────────┘                   │
│   ↓                                                          │
│ 问题分派成功 → 通知执行人 → 问题进入"处理中"状态            │
└─────────────────────────────────────────────────────────────┘
```

**模式 1 特点**：
- ✅ 零改动，保持现有流程
- ✅ 管理者完全控制
- ❌ 无 AI 辅助，效率低

---

### 3.2 模式 2：AI 辅助模式（推荐日常使用）

**核心流程**：创建任务时显示 AI 推荐，管理者可选择接受或更换

#### 3.2.1 农事任务派发流程（AI 辅助版）

```
┌─────────────────────────────────────────────────────────────┐
│ 农事任务派发页面 (TasksPage.tsx)                             │
│                                                              │
│ [➕ 新建任务]                                                │
│   ↓                                                          │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 创建农事任务                                          │   │
│ │                                                      │   │
│ │ 任务名称：[A 区番茄 - 灌溉任务]                        │   │
│ │ 任务类型：[灌溉 ▼]                                   │   │
│ │ 种植区域：[A 区 ▼]                                    │   │
│ │ 关联批次：[SC20260401-001 ▼]（可选）                  │   │
│ │ 计划日期：[2026-04-22]                               │   │
│ │ 预估工时：[2 小时]                                     │   │
│ │ 优先级：[高 ▼]                                       │   │
│ │                                                      │   │
│ │ 执行人选择：                                          │   │
│ │ ┌────────────────────────────────────────────────┐   │   │
│ │ │ [🤖 AI 推荐] [👤 手动选择]                      │   │   │
│ │ │                                                 │   │   │
│ │ │ 🤖 AI 推荐结果（已自动展开）                    │   │   │
│ │ │ ─────────────────────────────────────────────  │   │   │
│ │ │                                                 │   │   │
│ │ │ ✅ 萧峰 (92 分) [✓ 已选中]                      │   │   │
│ │ │    · 技能匹配：持有 [滴灌操作、水肥一体化]       │   │   │
│ │ │    · 当前负荷：空闲（0 个任务）                  │   │   │
│ │ │    · 位置：A 区，距离 0.5km                     │   │   │
│ │ │                                                 │   │   │
│ │ │    虚竹 (78 分) [  ]                            │   │   │
│ │ │    · 技能匹配：持有 [滴灌操作]                   │   │   │
│ │ │    · 当前负荷：较忙（1 个任务）                  │   │   │
│ │ │                                                 │   │   │
│ │ │    袁承志 (71 分) [  ]                          │   │   │
│ │ │    · 技能匹配：持有 [微喷灌溉]                   │   │   │
│ │ │                                                 │   │   │
│ │ │ [🔄 重新推荐] [✏️ 手动选择]                     │   │   │
│ │ └────────────────────────────────────────────────┘   │   │
│ │                                                      │   │
│ │ [❌ 取消] [✅ 创建并派发]                            │   │
│ └──────────────────────────────────────────────────────┘   │
│   ↓                                                          │
│ 任务创建成功 → 通知执行人 → 任务进入"待接受"状态            │
└─────────────────────────────────────────────────────────────┘
```

**关键交互说明**：

1. **默认展开 AI 推荐**：打开创建表单时，自动调用 AI 推荐算法，显示 Top3 推荐人员
2. **默认选中第一名**：AI 推荐的第一名自动勾选，管理者可直接确认
3. **支持手动更换**：
   - 点击"手动选择"：切换到原有的人员选择下拉框
   - 点击其他推荐人员：切换选中
   - 点击"重新推荐"：重新计算推荐（如修改了任务类型/区域后）
4. **推荐理由展示**：每个推荐人员显示技能匹配、负荷、位置等关键信息

#### 3.2.2 临时任务派发流程（AI 辅助版）

```
┌─────────────────────────────────────────────────────────────┐
│ 临时任务派发页面 (TempTaskPage.tsx)                          │
│                                                              │
│ [➕ 新建临时任务]                                            │
│   ↓                                                          │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 创建临时任务                                          │   │
│ │                                                      │   │
│ │ 任务名称：[紧急 - 大棚通风设备维修]                    │   │
│ │ 任务类型：[设备维修 ▼]                               │   │
│ │ 紧急程度：[🔴 紧急 ▼]                                │   │
│ │ 任务描述：[A 区 3 号大棚通风设备故障...]               │   │
│ │ 计划日期：[2026-04-22]                               │   │
│ │                                                      │   │
│ │ 执行人选择：                                          │   │
│ │ ┌────────────────────────────────────────────────┐   │   │
│ │ │ 🤖 AI 推荐结果                                  │   │   │
│ │ │ ─────────────────────────────────────────────  │   │   │
│ │ │                                                 │   │   │
│ │ │ ✅ 胡斐 (88 分) [✓ 已选中]                      │   │   │
│ │ │    · 技能匹配：持有 [设备维修、电工操作]         │   │   │
│ │ │    · 当前负荷：空闲（0 个任务）                  │   │   │
│ │ │    · 位置：A 区，距离 0.3km                     │   │   │
│ │ │                                                 │   │   │
│ │ │    石破天 (65 分) [  ]                          │   │   │
│ │ │    · 技能匹配：持有 [设备维修]                   │   │   │
│ │ │    · 当前负荷：较忙（2 个任务）⚠️                │   │   │
│ │ │                                                 │   │   │
│ │ │ ⚠️ 提示：紧急任务，建议优先选择空闲人员          │   │   │
│ │ │                                                 │   │   │
│ │ │ [🔄 重新推荐] [✏️ 手动选择]                     │   │   │
│ │ └────────────────────────────────────────────────┘   │   │
│ │                                                      │   │
│ │ [❌ 取消] [✅ 创建并派发]                            │   │
│ └──────────────────────────────────────────────────────┘   │
│   ↓                                                          │
│ 任务创建成功 → 通知执行人 → 任务进入"待接受"状态            │
│   ↓                                                          │
│ 执行人完成任务 → 管理者审核 → 审核通过/驳回                 │
└─────────────────────────────────────────────────────────────┘
```

**特殊处理**：
- 紧急任务：AI 推荐算法提升"当前负荷"权重，优先推荐空闲人员
- 显示冲突提示：如推荐人员当前有任务进行中，标记⚠️

#### 3.2.3 巡查反馈任务派发流程（AI 辅助版）

```
┌─────────────────────────────────────────────────────────────┐
│ 问题分派中心 (ProblemDispatchPage.tsx)                       │
│                                                              │
│ 问题列表 → 选择问题 → [📤 分派任务]                         │
│   ↓                                                          │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 分派问题                                              │   │
│ │                                                      │   │
│ │ 问题编号：[PR20260422-001]                           │   │
│ │ 问题描述：[A 区番茄发现灰霉病，叶片出现水渍状病斑...]  │   │
│ │ 严重程度：[🔴 严重 ▼]                                │   │
│ │ 问题分类：[病虫害 ▼]                                 │   │
│ │ 巡查区域：[A 区]                                      │   │
│ │ 提交人：[杨过]                                        │   │
│ │                                                      │   │
│ │ 分派设置：                                            │   │
│ │ ┌────────────────────────────────────────────────┐   │   │
│ │ │ 执行人选择：                                    │   │   │
│ │ │                                                 │   │   │
│ │ │ 🤖 AI 推荐结果                                  │   │   │
│ │ │ ─────────────────────────────────────────────  │   │   │
│ │ │                                                 │   │   │
│ │ │ ✅ 萧峰 (85 分) [✓ 已选中]                      │   │   │
│ │ │    · 技能匹配：持有 [病害识别、农药配制、喷雾]   │   │   │
│ │ │    · 当前负荷：空闲（0 个任务）                  │   │   │
│ │ │    · 位置：A 区，距离 0.5km                     │   │   │
│ │ │    · 历史表现：病害处理完成率 100%               │   │   │
│ │ │                                                 │   │   │
│ │ │    虚竹 (72 分) [  ]                            │   │   │
│ │ │    · 技能匹配：持有 [病害识别、生物防治]         │   │   │
│ │ │                                                 │   │   │
│ │ │ ⚠️ 提示：严重病虫害，建议选择有病害处理经验的人员 │   │   │
│ │ │                                                 │   │   │
│ │ │ [🔄 重新推荐] [✏️ 手动选择]                     │   │   │
│ │ └────────────────────────────────────────────────┘   │   │
│ │                                                      │   │
│ │ 截止日期：[2026-04-25]                               │   │
│ │ 优先级：[🔴 高 ▼]                                    │   │
│ │ ☑️ 需要反馈                                           │   │
│ │                                                      │   │
│ │ [❌ 取消] [✅ 确认分派]                              │   │
│ └──────────────────────────────────────────────────────┘   │
│   ↓                                                          │
│ 问题分派成功 → 通知执行人 → 问题进入"处理中"状态            │
└─────────────────────────────────────────────────────────────┘
```

**特殊处理**：
- 病虫害问题：AI 推荐算法提升"技能匹配"权重，优先推荐有病害处理经验的人员
- 显示历史表现：如该人员过往处理同类问题的完成率

#### 3.2.4 模式 2 数据流

```
┌─────────────────────────────────────────────────────────────┐
│                     数据流                                   │
│                                                              │
│ 1. 用户打开"新建任务"表单                                    │
│   ↓                                                          │
│ 2. 前端调用 AI 推荐 API                                      │
│   │                                                          │
│   ├─ 输入：任务类型、区域、优先级、日期等                    │
│   │                                                          │
│   ├─ 处理：                                                   │
│   │   · 调用 useDispatchFactors 聚合数据                     │
│   │   · 调用 useWorkerMatching 计算匹配度                    │
│   │   · 返回 Top3 推荐人员及得分                             │
│   │                                                          │
│   └─ 输出：WorkerMatchScore[]                                │
│   ↓                                                          │
│ 3. 前端展示 AI 推荐结果                                      │
│   · 默认选中第一名                                           │
│   · 展示推荐理由                                             │
│   ↓                                                          │
│ 4. 管理者操作                                                │
│   · 接受 AI 推荐 → 直接点击"创建并派发"                      │
│   · 更换人员 → 点击其他推荐或手动选择                        │
│   · 重新推荐 → 修改任务信息后点击"重新推荐"                  │
│   ↓                                                          │
│ 5. 任务创建成功                                              │
│   · 调用 useTasks.createTask() 或对应系统 API                │
│   · 任务进入"待接受"状态                                     │
│   · 通知执行人                                               │
└─────────────────────────────────────────────────────────────┘
```

**模式 2 特点**：
- ✅ AI 辅助决策，提高效率
- ✅ 保留人工选择权，灵活度高
- ✅ 一步完成创建和派发
- ⚠️ 需要改造三个任务的创建表单
- ⚠️ 推荐算法需实时响应（<1 秒）

---

### 3.3 模式 3：AI 全自动模式（高效场景）

**核心流程**：AI 自动预测任务并推荐执行人，管理者批量确认后派发

#### 3.3.1 全自动派工流程

```
┌─────────────────────────────────────────────────────────────┐
│ AI 派工建议页面 (SmartDispatchPage.tsx)                      │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 📊 AI 派工分析概览                                     │   │
│ │                                                      │   │
│ │ 生产因素：                                            │   │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐              │   │
│ │ │执行中    │ │今日预测  │ │超期任务  │              │   │
│ │ │批次: 5   │ │任务: 12  │ │任务: 3   │              │   │
│ │ └──────────┘ └──────────┘ └──────────┘              │   │
│ │                                                      │   │
│ │ 综合评估：                                            │   │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐              │   │
│ │ │高置信度  │ │中置信度  │ │低置信度  │              │   │
│ │ │建议: 8   │ │建议: 3   │ │建议: 1   │              │   │
│ │ └──────────┘ └──────────┘ └──────────┘              │   │
│ │                                                      │   │
│ │ [🔄 刷新分析] [✅ 一键确认全部派发] [⚙️ 设置]        │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 派工建议列表                                          │   │
│ │                                                      │   │
│ │ ─────────────────────────────────────────────────── │   │
│ │                                                      │   │
│ │ ┌─ 🟢 高置信度 (92 分) ────────────────────────────┐│   │
│ │ │ ☑️ A 区番茄 - 结果期 - 灌溉任务                   ││   │
│ │ │    批次：SC20260401-001                           ││   │
│ │ │    优先级：🔴 高 (超期 2 天未灌溉)                  ││   │
│ │ │    👤 推荐执行人：萧峰 (92 分)                     ││   │
│ │ │    · 技能匹配：100% · 负荷：空闲 · 位置：A 区     ││   │
│ │ │    [✅ 确认] [✏️ 更换] [⏰ 延后]                  ││   │
│ │ └──────────────────────────────────────────────────┘│   │
│ │                                                      │   │
│ │ ┌─ 🟢 高置信度 (88 分) ────────────────────────────┐│   │
│ │ │ ☑️ B 区黄瓜 - 开花期 - 植保任务                   ││   │
│ │ │    批次：SC20260402-003                           ││   │
│ │ │    优先级：🟡 中 (开花期病虫害高发)                ││   │
│ │ │    👤 推荐执行人：石破天 (88 分)                   ││   │
│ │ │    · 技能匹配：100% · 负荷：1 任务 · 位置：B 区   ││   │
│ │ │    [✅ 确认] [✏️ 更换] [⏰ 延后]                  ││   │
│ │ └──────────────────────────────────────────────────┘│   │
│ │                                                      │   │
│ │ ┌─ 🟡 中置信度 (65 分) ────────────────────────────┐│   │
│ │ │ ☐️ C 区草莓 - 采收期 - 采收任务                   ││   │
│ │ │    批次：SC20260403-002                           ││   │
│ │ │    优先级：🟠 高 (采收期)                          ││   │
│ │ │    👤 推荐执行人：虚竹 (65 分)                     ││   │
│ │ │    · 技能匹配：80% · 负荷：1 任务                 ││   │
│ │ │    ⚠️ 提示：置信度较低，建议人工确认               ││   │
│ │ │    [✅ 确认] [✏️ 更换] [⏰ 延后]                  ││   │
│ │ └──────────────────────────────────────────────────┘│   │
│ │                                                      │   │
│ │ ┌─ 🔴 低置信度 (45 分) ────────────────────────────┐│   │
│ │ │ ☐️ D 区茄子 - 苗期 - 施肥任务                     ││   │
│ │ │    批次：SC20260404-001                           ││   │
│ │ │    优先级：🟢 低                                   ││   │
│ │ │    👤 推荐执行人：袁承志 (45 分)                   ││   │
│ │ │    · 技能匹配：60% · 负荷：2 任务                 ││   │
│ │ │    ⚠️ 提示：无合适人员，建议人工决策               ││   │
│ │ │    [✏️ 人工选择] [⏰ 延后] [❌ 忽略]              ││   │
│ │ └──────────────────────────────────────────────────┘│   │
│ │                                                      │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ 已选择：10/12 项                                             │
│ [✅ 批量确认派发] [❌ 取消]                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3.2 全自动模式数据流

```
┌─────────────────────────────────────────────────────────────┐
│                     数据流                                   │
│                                                              │
│ 1. 系统定时触发（每 5 分钟）或手动点击"刷新分析"              │
│   ↓                                                          │
│ 2. AI 派工引擎运行                                           │
│   │                                                          │
│   ├─ 步骤 1：任务预测                                        │
│   │   · 读取所有执行中生产批次                               │
│   │   · 匹配作物生长阶段任务规则                             │
│   │   · 计算间隔天数，判断超期状态                           │
│   │   · 检查环境告警（IoT 传感器数据）                       │
│   │   · 考虑天气影响                                         │
│   │   · 输出：PredictedTask[]（10-50 条/天）                 │
│   │                                                          │
│   ├─ 步骤 2：人员匹配                                        │
│   │   · 对每个预测任务，计算所有人员匹配度                   │
│   │   · 考虑技能、负荷、位置、表现                           │
│   │   · 动态权重调整（紧急/大面积/病虫害）                   │
│   │   · 输出：Record<taskId, WorkerMatchScore[]>             │
│   │                                                          │
│   └─ 步骤 3：决策建议                                        │
│       · 计算置信度评分                                       │
│       · 判断建议动作（dispatch/delay/split/manual）          │
│       · 生成推荐理由和风险提示                               │
│       · 输出：DispatchRecommendation[]                       │
│   ↓                                                          │
│ 3. 前端展示派工建议列表                                      │
│   · 按置信度分组（高/中/低）                                 │
│   · 默认勾选高置信度任务                                     │
│   · 展示推荐理由和风险提示                                   │
│   ↓                                                          │
│ 4. 管理者操作                                                │
│   · 逐个确认：点击每条任务的"确认"按钮                       │
│   · 批量确认：勾选多条任务，点击"批量确认派发"               │
│   · 更换人员：点击"更换"，选择其他人员                       │
│   · 延后任务：点击"延后"，选择新日期                         │
│   · 忽略任务：点击"忽略"，不派发该任务                       │
│   ↓                                                          │
│ 5. 任务创建和派发                                            │
│   · 调用对应任务系统 API 创建任务                            │
│   · 任务进入"待接受"状态                                     │
│   · 通知执行人                                               │
│   · 记录派发日志                                             │
│   ↓                                                          │
│ 6. 更新预测状态                                              │
│   · 标记已派发任务                                           │
│   · 刷新分析结果                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3.3 全自动模式特殊配置

```typescript
// 全自动模式配置选项
interface AutoModeConfig {
  // 自动预测配置
  autoPredict: {
    enabled: boolean;              // 是否启用自动预测
    predictDays: number;           // 预测未来几天（默认 7）
    intervalMinutes: number;       // 预测间隔（分钟，默认 60）
  };
  
  // 自动推荐配置
  autoRecommend: {
    enabled: boolean;              // 是否启用自动推荐
    maxCandidates: number;         // 最大推荐人数（默认 3）
    minConfidenceScore: number;    // 最低置信度（默认 60）
  };
  
  // 自动派发配置（可选）
  autoDispatch: {
    enabled: boolean;              // 是否启用全自动派发（跳过确认）
    confidenceThreshold: number;   // 自动派发置信度阈值（默认 90）
    maxTasksPerWorker: number;     // 单人最大任务数（默认 3）
    notifyWorkers: boolean;        // 是否自动通知执行人
    requireApproval: boolean;      // 是否需要上级审批（默认 false）
  };
  
  // 批量确认配置
  batchConfirmation: {
    enabled: boolean;              // 是否启用批量确认
    defaultSelectHighConfidence: boolean;  // 默认勾选高置信度任务
    showConfirmationModal: boolean;        // 批量确认前是否弹窗确认
  };
}
```

**模式 3 特点**：
- ✅ 最高效率，适合标准化任务和信任 AI 的管理者
- ✅ 批量确认，减少重复操作
- ✅ 可配置是否跳过确认（置信度≥90% 自动派发）
- ⚠️ 需要较高的数据准确性和算法可靠性
- ⚠️ 需要完善的日志和撤销机制

---

## 四、模式切换与混合使用

### 4.1 场景化模式选择

| 场景 | 推荐模式 | 原因 |
|------|----------|------|
| 日常农事任务（灌溉、施肥） | AI 辅助模式 | 标准化任务，AI 推荐准确率高 |
| 紧急临时任务（设备故障） | AI 辅助模式 | 需要快速决策，但人工确认更可靠 |
| 病虫害问题 | AI 辅助模式 | 需要专业技能，AI 推荐有经验人员 |
| 周期性任务（每日巡查） | AI 全自动模式 | 高度标准化，可自动派发 |
| 特殊/复杂任务 | 纯人工模式 | 需要人工判断和经验 |
| 新手管理者 | AI 辅助模式 | AI 辅助学习，降低决策难度 |
| 资深管理者 | 纯人工模式 或 AI 全自动模式 | 根据偏好选择 |

### 4.2 混合使用策略

**策略 1：按任务类型切换模式**

```typescript
// 不同任务类型使用不同模式
const MODE_BY_TASK_TYPE: Record<string, DispatchMode> = {
  'irrigation': 'ai_auto',      // 灌溉任务 → 全自动
  'fertilization': 'ai_auto',   // 施肥任务 → 全自动
  'pest_control': 'ai_assisted',// 植保任务 → AI 辅助
  'pruning': 'ai_assisted',     // 修剪任务 → AI 辅助
  'harvest': 'ai_auto',         // 采收任务 → 全自动
  'equipment_repair': 'manual', // 设备维修 → 纯人工
  'emergency': 'manual',        // 紧急任务 → 纯人工
};
```

**策略 2：按置信度自动降级**

```typescript
// 根据置信度自动切换模式
function getEffectiveMode(
  config: DispatchModeConfig,
  confidenceScore: number
): DispatchMode {
  if (config.mode === 'ai_auto') {
    if (confidenceScore >= config.ai_auto.confidenceThreshold) {
      return 'ai_auto';  // 高置信度 → 全自动
    } else {
      return 'ai_assisted';  // 低置信度 → 降级为 AI 辅助
    }
  }
  return config.mode;
}
```

**策略 3：按时间段切换模式**

```typescript
// 不同时间段使用不同模式
function getModeByTimeOfDay(config: DispatchModeConfig): DispatchMode {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 10) {
    return 'ai_auto';  // 早晨 → 全自动（安排当日任务）
  } else if (hour >= 10 && hour < 16) {
    return 'ai_assisted';  // 白天 → AI 辅助（处理临时任务）
  } else {
    return 'manual';  // 晚上 → 纯人工（非工作时间）
  }
}
```

### 4.3 模式切换 UI

```
┌─────────────────────────────────────────────────────────────┐
│ 智能派工模式                                                 │
│                                                              │
│ 当前模式：[🤖 AI 辅助模式 ▼]                                │
│                                                              │
│ 快捷切换：                                                   │
│ [👤 纯人工] [🤖 AI 辅助] [🚀 全自动]                        │
│                                                              │
│ 高级模式设置：                                               │
│ ☑️ 按任务类型自动选择模式                                    │
│ ☑️ 置信度低于 60 分自动降级为 AI 辅助                        │
│ ☑️ 允许执行过程中切换模式                                    │
│                                                              │
│ [💾 保存设置]                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、技术实现方案

### 5.1 统一任务创建 Hook

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
  sourceId?: string;  // 关联的批次 ID、临时任务 ID、问题 ID
  
  // AI 推荐相关
  useAIRecommendation: boolean;
  aiRecommendedWorkerId?: string;
  aiConfidenceScore?: number;
  
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

interface UnifiedTaskCreationReturn {
  // 创建任务
  createTask: (input: UnifiedTaskInput) => Promise<Task>;
  
  // 获取 AI 推荐
  getAIRecommendation: (taskInfo: Partial<UnifiedTaskInput>) => Promise<WorkerMatchScore[]>;
  
  // 模式配置
  modeConfig: DispatchModeConfig;
  currentMode: DispatchMode;
  switchMode: (mode: DispatchMode) => void;
}

export function useUnifiedTaskCreation(): UnifiedTaskCreationReturn {
  const { createTask: createFarmTask } = useTasks();
  const { addTempTask } = useTempTasks();
  const { dispatchProblem } = useProblemDispatch();
  const { modeConfig, currentMode, switchMode } = useDispatchModeConfig();
  const { factors } = useDispatchFactors();
  
  // 获取 AI 推荐
  const getAIRecommendation = async (
    taskInfo: Partial<UnifiedTaskInput>
  ): Promise<WorkerMatchScore[]> => {
    // 构建预测任务
    const predictedTask: PredictedTask = {
      // ... 根据 taskInfo 构建
    };
    
    // 调用人员匹配引擎
    const matches = matchWorkers(predictedTask, factors.workers, factors.currentTasks, factors);
    
    return matches.slice(0, 3);
  };
  
  // 统一创建任务
  const createTask = async (input: UnifiedTaskInput): Promise<Task> => {
    switch (input.sourceType) {
      case 'farm':
        return await createFarmTask({
          taskName: input.taskName,
          taskType: input.taskType,
          assignedTo: input.aiRecommendedWorkerId,
          // ... 其他字段
          aiRecommendation: input.useAIRecommendation ? {
            workerId: input.aiRecommendedWorkerId,
            confidenceScore: input.aiConfidenceScore,
          } : undefined,
        });
        
      case 'temp':
        return await addTempTask({
          taskName: input.taskName,
          description: input.description,
          assignedTo: input.aiRecommendedWorkerId,
          isEmergency: input.isEmergency,
          // ... 其他字段
        });
        
      case 'problem':
        return await dispatchProblem({
          problemId: input.problemId!,
          assignedTo: input.aiRecommendedWorkerId,
          priority: input.priority,
          deadline: input.deadline,
          requireFeedback: input.requireFeedback,
          // ... 其他字段
        });
        
      default:
        throw new Error('Unknown task source type');
    }
  };
  
  return {
    createTask,
    getAIRecommendation,
    modeConfig,
    currentMode,
    switchMode,
  };
}
```

### 5.2 AI 推荐组件（可复用）

```typescript
// src/components/labor/dispatch/AIRecommendationPanel.tsx

interface AIRecommendationPanelProps {
  taskInfo: Partial<UnifiedTaskInput>;
  onWorkerSelect: (workerId: string, score: number) => void;
  onReRecommend?: () => void;
  onManualSelect?: () => void;
  config: AIRecommendConfig;
}

export function AIRecommendationPanel({
  taskInfo,
  onWorkerSelect,
  onReRecommend,
  onManualSelect,
  config,
}: AIRecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<WorkerMatchScore[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getAIRecommendation } = useUnifiedTaskCreation();
  
  // 加载推荐结果
  useEffect(() => {
    loadRecommendations();
  }, [taskInfo]);
  
  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const recs = await getAIRecommendation(taskInfo);
      setRecommendations(recs);
      
      // 默认选中第一名
      if (config.autoSelectTop && recs.length > 0) {
        setSelectedWorkerId(recs[0].staffId);
        onWorkerSelect(recs[0].staffId, recs[0].totalScore);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="ai-recommendation-panel">
      <div className="panel-header">
        <span>🤖 AI 推荐结果</span>
        <div className="actions">
          <Button icon="🔄" onClick={loadRecommendations} loading={isLoading}>
            重新推荐
          </Button>
          {onManualSelect && (
            <Button icon="✏️" onClick={onManualSelect}>
              手动选择
            </Button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="recommendation-list">
          {recommendations.map((worker, index) => (
            <div
              key={worker.staffId}
              className={`recommendation-item ${selectedWorkerId === worker.staffId ? 'selected' : ''}`}
              onClick={() => {
                setSelectedWorkerId(worker.staffId);
                onWorkerSelect(worker.staffId, worker.totalScore);
              }}
            >
              <div className="worker-info">
                <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
                <span className="name">{worker.staffName}</span>
                <span className="score">{worker.totalScore}分</span>
              </div>
              
              <div className="match-details">
                <MatchDetail label="技能匹配" value={`${worker.skillMatchScore}%`} />
                <MatchDetail label="当前负荷" value={`${worker.currentTasks}个任务`} />
                <MatchDetail label="位置" value={worker.currentWorkZone} />
              </div>
              
              {worker.conflicts.length > 0 && (
                <div className="conflicts">
                  {worker.conflicts.map((conflict, idx) => (
                    <span key={idx} className="conflict-tag">⚠️ {conflict}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {recommendations.length === 0 && !isLoading && (
        <div className="empty-state">
          <p>暂无推荐结果，请完善任务信息或手动选择执行人</p>
        </div>
      )}
    </div>
  );
}
```

### 5.3 任务创建表单集成

```typescript
// src/components/labor/tasks/TaskFormModal.tsx (改造版)

export function TaskFormModal({ visible, onClose }) {
  const [formData, setFormData] = useState<Partial<UnifiedTaskInput>>({});
  const [useAIRecommendation, setUseAIRecommendation] = useState(true);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [aiConfidenceScore, setAiConfidenceScore] = useState<number | null>(null);
  
  const { createTask, currentMode } = useUnifiedTaskCreation();
  
  // 处理 AI 推荐选择
  const handleAIWorkerSelect = (workerId: string, score: number) => {
    setSelectedWorkerId(workerId);
    setAiConfidenceScore(score);
  };
  
  // 处理手动选择
  const handleManualSelect = (workerId: string) => {
    setSelectedWorkerId(workerId);
    setUseAIRecommendation(false);
  };
  
  // 提交表单
  const handleSubmit = async () => {
    const task = await createTask({
      ...formData,
      sourceType: 'farm',
      useAIRecommendation,
      aiRecommendedWorkerId: selectedWorkerId,
      aiConfidenceScore,
    });
    
    onClose();
    // 刷新列表
  };
  
  return (
    <Modal visible={visible} onClose={onClose} title="创建农事任务">
      <Form>
        <Form.Item label="任务名称">
          <Input value={formData.taskName} onChange={v => setFormData({...formData, taskName: v})} />
        </Form.Item>
        
        <Form.Item label="任务类型">
          <Select value={formData.taskType} onChange={v => setFormData({...formData, taskType: v})} />
        </Form.Item>
        
        <Form.Item label="种植区域">
          <Select value={formData.greenhouseName} onChange={v => setFormData({...formData, greenhouseName: v})} />
        </Form.Item>
        
        {/* 执行人选择 */}
        <Form.Item label="执行人">
          {currentMode === 'ai_assisted' && useAIRecommendation ? (
            <AIRecommendationPanel
              taskInfo={formData}
              onWorkerSelect={handleAIWorkerSelect}
              onManualSelect={() => setUseAIRecommendation(false)}
              config={{ autoSelectTop: true }}
            />
          ) : (
            <Select 
              value={selectedWorkerId} 
              onChange={handleManualSelect}
              placeholder="选择执行人"
            />
          )}
        </Form.Item>
        
        <Form.Actions>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit} disabled={!selectedWorkerId}>
            创建并派发
          </Button>
        </Form.Actions>
      </Form>
    </Modal>
  );
}
```

---

## 六、实施路线图

### 阶段一：基础架构搭建（3-4 天）

**Day 1-2: 模式配置系统**
- [ ] 创建 `useDispatchModeConfig` hook
- [ ] 实现三种模式定义和配置
- [ ] 实现模式切换逻辑
- [ ] 创建模式设置 UI
- [ ] 编写单元测试

**Day 3-4: 统一任务创建 Hook**
- [ ] 创建 `useUnifiedTaskCreation` hook
- [ ] 统一三种任务系统的创建接口
- [ ] 集成 AI 推荐功能
- [ ] 编写集成测试

### 阶段二：AI 推荐组件开发（3-4 天）

**Day 5-6: AI 推荐面板**
- [ ] 创建 `AIRecommendationPanel` 组件
- [ ] 实现推荐结果展示
- [ ] 实现选择交互
- [ ] 实现推荐理由展示
- [ ] 编写组件测试

**Day 7-8: 推荐算法优化**
- [ ] 优化推荐算法性能（<1 秒响应）
- [ ] 实现动态权重调整
- [ ] 实现推荐理由生成
- [ ] 编写性能测试

### 阶段三：三个任务系统集成（4-5 天）

**Day 9-10: 农事任务集成**
- [ ] 改造 `TaskFormModal` 组件
- [ ] 集成 AI 推荐面板
- [ ] 实现模式切换逻辑
- [ ] 测试完整流程

**Day 11-12: 临时任务集成**
- [ ] 改造 `TempTaskFormModal` 组件
- [ ] 集成 AI 推荐面板
- [ ] 实现紧急任务特殊处理
- [ ] 测试完整流程

**Day 13: 巡查反馈任务集成**
- [ ] 改造问题分派弹窗
- [ ] 集成 AI 推荐面板
- [ ] 实现病虫害问题特殊处理
- [ ] 测试完整流程

### 阶段四：全自动模式开发（3-4 天）

**Day 14-15: AI 派工建议页面**
- [ ] 重构 `SmartDispatchPage.tsx`
- [ ] 实现分析概览卡片
- [ ] 实现派工建议列表
- [ ] 实现按置信度分组

**Day 16-17: 批量确认功能**
- [ ] 实现批量选择交互
- [ ] 实现批量确认派发
- [ ] 实现一键确认全部
- [ ] 实现派发后状态更新
- [ ] 测试完整流程

### 阶段五：测试优化（3-4 天）

**Day 18-20: 全场景测试**
- [ ] 模式切换测试
- [ ] AI 推荐准确性测试
- [ ] 三种任务系统流程测试
- [ ] 边界场景测试
- [ ] 性能测试
- [ ] 修复 Bug

**Day 21: 上线准备**
- [ ] 编写用户文档
- [ ] 准备培训材料
- [ ] 灰度发布计划

---

## 七、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 推荐算法响应慢（>3 秒） | 用户体验差 | 性能优化，缓存推荐结果，懒加载 |
| 模式切换逻辑复杂 | 开发和维护成本高 | 清晰的模式定义，完善的单元测试 |
| 管理者不信任 AI 推荐 | 采纳率低 | 强调辅助角色，展示推荐理由，允许手动覆盖 |
| 全自动模式错误派发 | 任务分配不合理 | 高置信度阈值，完善的日志和撤销机制 |
| 三种任务系统接口不一致 | 集成困难 | 统一创建接口，适配器模式 |

---

## 八、总结

本方案设计了**三模式并行 + 渐进式切换**的智能派工对接流程：

### 三种模式

1. **纯人工模式**：保持现有流程，AI 不介入，适合特殊任务和对 AI 信任度不高的管理者
2. **AI 辅助模式（推荐）**：创建任务时显示 AI 推荐，管理者可选择接受或更换，一步完成创建和派发
3. **AI 全自动模式**：AI 自动预测任务并推荐执行人，管理者批量确认后派发，适合标准化任务和高效率场景

### 核心优势

- ✅ **灵活性**：三种模式覆盖不同场景和管理者偏好
- ✅ **渐进式**：支持从"纯人工" → "AI 辅助" → "AI 全自动"的平滑过渡
- ✅ **可控性**：保留人工最终决策权，AI 始终是辅助角色
- ✅ **可扩展**：支持按任务类型、置信度、时间段自动切换模式

### 实施保障

- **统一接口**：`useUnifiedTaskCreation` hook 统一三种任务系统的创建流程
- **可复用组件**：`AIRecommendationPanel` 组件可在三个任务系统中复用
- **配置化管理**：模式、权重、阈值全部配置化，支持动态调整
- **完善测试**：每个阶段都有明确的测试计划和验收标准

通过本方案的实施，系统将实现从"手动选择执行人"到"AI 推荐 + 人工确认"再到"AI 自动预测 + 批量确认"的演进，大幅提升派工效率和智能化水平。
