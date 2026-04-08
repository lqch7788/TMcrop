# TMcrop 系统架构规划

## 项目概述

TMcrop（弘智耘）是一个模块化的智慧农业管理平台，采用微前端架构，各个业务系统独立开发、部署和维护。

## 分支结构

| 分支名 | 系统名称 | 状态 | 说明 |
|--------|----------|------|------|
| `main` | 架构规划主分支 | ✅ 已完成 | 系统架构、接口规范 |
| `planting-management` | 种植管理系统 | 🔄 开发中 | V1.1 版本，原型阶段 |
| `environmental-monitor` | 智能环境监测系统 | ⏳ 待开发 | - |
| `control-system` | 控制系统 | ⏳ 待开发 | - |
| `traceability` | 溯源系统 | ⏳ 待开发 | - |
| `data-analysis` | 数据分析系统 | ⏳ 待开发 | - |
| `expert-ai` | 专家AI系统 | ⏳ 待开发 | - |
| `cost-accounting` | 成本会计系统 | ⏳ 待开发 | - |
| `market-sales` | 市场营销系统 | ⏳ 待开发 | - |

## 系统模块

### 1. 种植管理系统 (Planting Management)
- **分支**: `planting-management`
- **系统Key**: `planting`
- **路由前缀**: `/planting/`
- **数据库表前缀**: `pl_`
- **功能模块**: 人工管理、生产计划、农事管理、库存管理、审批中心等
- **状态**: 🔄 原型开发中

### 2. 智能环境监测系统 (Environmental Monitor)
- **分支**: `environmental-monitor`
- **系统Key**: `env-monitor`
- **路由前缀**: `/env/`
- **数据库表前缀**: `env_`
- **功能模块**: 传感器管理、数据采集、阈值告警等
- **状态**: ⏳ 待开发

### 3. 控制系统 (Control System)
- **分支**: `control-system`
- **系统Key**: `control`
- **路由前缀**: `/control/`
- **数据库表前缀**: `ctrl_`
- **功能模块**: 设备控制、策略配置、自动化逻辑等
- **状态**: ⏳ 待开发

### 4. 溯源系统 (Traceability)
- **分支**: `traceability`
- **系统Key**: `trace`
- **路由前缀**: `/trace/`
- **数据库表前缀**: `tr_`
- **功能模块**: 种植追溯、加工追溯、物流追溯等
- **状态**: ⏳ 待开发

### 5. 数据分析系统 (Data Analysis)
- **分支**: `data-analysis`
- **系统Key**: `data`
- **路由前缀**: `/data/`
- **数据库表前缀**: `da_`
- **功能模块**: 报表中心、数据大屏、趋势分析、预测模型等
- **状态**: ⏳ 待开发

### 6. 专家AI系统 (Expert AI)
- **分支**: `expert-ai`
- **系统Key**: `ai`
- **路由前缀**: `/ai/`
- **数据库表前缀**: `ai_`
- **功能模块**: 病虫害识别、农事建议、智能问答等
- **状态**: ⏳ 待开发

### 7. 成本会计系统 (Cost Accounting)
- **分支**: `cost-accounting`
- **系统Key**: `cost`
- **路由前缀**: `/cost/`
- **数据库表前缀**: `cost_`
- **功能模块**: 成本核算、预算管理、财务报表等
- **状态**: ⏳ 待开发

### 8. 市场营销系统 (Market Sales)
- **分支**: `market-sales`
- **系统Key**: `sale`
- **路由前缀**: `/sale/`
- **数据库表前缀**: `sale_`
- **功能模块**: 客户管理、订单管理、渠道管理等
- **状态**: ⏳ 待开发

## 目录结构规范

各子系统采用统一目录结构：

```
V1.1/
├── planting-management/    # 种植管理系统
│   ├── src/
│   │   ├── components/    # 公共组件
│   │   ├── pages/         # 页面组件
│   │   ├── hooks/         # 自定义Hooks
│   │   ├── services/      # API服务
│   │   ├── types/         # 类型定义
│   │   └── utils/         # 工具函数
│   ├── public/
│   └── package.json
├── env-monitor/           # 环境监测系统
├── control-system/        # 控制系统
└── ...
```

## 路由规范

### 主页路由（main分支）
| 路径 | 描述 |
|------|------|
| `/` | 主页，8个系统入口卡片 |

### 种植管理系统路由（planting-management分支）
| 路径 | 描述 |
|------|------|
| `/park-archive` | 园区导览 |
| `/dashboard` | 基地总览 |
| `/production` | 生产计划 |
| `/labor/*` | 人工管理（聚合页面） |
| `/materials` | 库存管理 |
| `/reports` | 生产汇总表 |
| `/approvals` | 审批中心 |

### 环境监测系统路由（environmental-monitor分支）
| 路径 | 描述 |
|------|------|
| `/env/dashboard` | 环境总览 |
| `/env/sensors` | 传感器管理 |
| `/env/alerts` | 告警记录 |

## 接口规范

### 统一响应格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
```

### API路径规范
```
/api/{system-key}/{module}/{action}
/api/pl/labor/list
/api/env/sensor/data
/api/ctrl/device/status
```

## 命名规范

### 系统Key
| 系统 | Key |
|------|-----|
| 种植管理 | `planting` |
| 环境监测 | `env-monitor` |
| 控制系统 | `control` |
| 溯源系统 | `traceability` |
| 数据分析 | `data-analysis` |
| 专家AI | `expert-ai` |
| 成本会计 | `cost-accounting` |
| 市场营销 | `market-sales` |

### 数据库表命名
- 种植管理: `pl_{module}_{entity}`
- 环境监测: `env_{entity}`
- 控制系统: `ctrl_{entity}`
- 溯源系统: `tr_{entity}`
- 数据分析: `da_{entity}`
- 专家AI: `ai_{entity}`
- 成本会计: `cost_{entity}`
- 市场营销: `sale_{entity}`

## 状态管理

| 状态 | 标识 | 说明 |
|------|------|------|
| 待开发 | ⏳ | 尚未开始 |
| 原型开发中 | 🔄 | 页面原型阶段 |
| 开发中 | 🚧 | 功能开发中 |
| 已完成 | ✅ | 功能完成 |
| 已上线 | 🎉 | 正式发布 |

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-04-08 | v1.0 | 初始架构规划文档 |
