# P2 新功能域规划（只出方案，本轮不实施）

> 日期：2026-10-20 ｜ 依据：`docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md` §3.15
> 前提：P0/P1 已把「接线」做完，以下四个域才有意义（否则新功能会建在断链上）

---

## P2-1 农事计划与农事日历

### 现状（实测）

| 项 | 现状 |
|---|---|
| `farm_activities` 表 | 存在（含 `block_oid` / `activity_type` / `assignee_ids`），**只有种子数据，全站零读取** |
| `CROP_STAGE_TASK_CONFIG` | 硬编码在 `src/data/cropStageTaskConfig.ts`，11 种作物 × 5 生育期 × 任务间隔 |
| `useCropGrowthEngine` | 按定植日 + 生育期推算"应该做什么"，**只在面板显示，不落库、不生成任务** |
| `plantings.growth_status` | 83/86 为空 —— 生育期未持久化 |
| `crop_varieties` | 有 germination/seedling/flowering/fruiting/harvest 周期字典 |

### 目标

把"系统知道什么时候该做什么"变成"系统自动生成农事计划 → 一键转任务"。

### 方案

```
① 物候期落库
   plantings 增加 growth_stage_code / growth_stage_updated_at
   生育期推进来源：手工确认（默认） | 按品种周期自动推算（可开关）

② 计划模板落库（替代硬编码）
   新建 crop_stage_plan_templates：
     id, crop_code, variety_code, stage_code, task_type,
     offset_days（相对定植日/生育期起点）, window_days, default_workers,
     default_hours, required_feedback, enabled
   把 CROP_STAGE_TASK_CONFIG 迁移进来；前端改为读取模板

③ 计划生成
   POST /api/farm-plans/generate { plantingId | blockId, horizonDays }
   → 依据 定植日 + 模板 + 生育期 → 生成 farm_plan_items（待确认）
   → 人工确认后 POST /api/farm-plans/:id/materialize → 批量建 farm_tasks
   （复用 P0-5 的 plantingId/batchCode 回链，任务天然带批次）

④ 日历视图
   /farm-plan：日/周/月 三视图，按地块/作物/班组筛选
   与现有 /farm-task-schedule（排班）分工：日历看"计划"，排班看"人"
```

### 数据模型

| 表 | 关键列 |
|---|---|
| `crop_stage_plan_templates` | `crop_code`, `variety_code`, `stage_code`, `task_type`, `offset_days`, `window_days`, `default_workers`, `default_hours` |
| `farm_plans` | `id`, `plan_code`, `planting_id`, `batch_code`, `year`, `status`(draft/confirmed/converted) |
| `farm_plan_items` | `plan_id`, `task_type`, `planned_date`, `window_start`, `window_end`, `stage_code`, `status`, `generated_task_id` |

### 依赖

- P0-5（任务↔种植实例）**已完成**
- 需要先补 `plantings.growth_status` 的历史数据（当前 83/86 空）

### 验收标准

- 给定一个种植批次，能生成未来 30 天的计划条目
- 确认后一键生成任务，任务带 `planting_id` + `batch_code`
- 改定植日 → 计划自动重算（未确认的条目）

### 工作量估算

后端 3 天 / 前端 3 天 / 数据迁移 0.5 天

---

## P2-2 农机具台账与设备折旧

### 现状（实测）

| 项 | 现状 |
|---|---|
| 农机具主表 | **不存在**（schema 中只有 `iot_devices` / `monitoring_devices` / `devices`(0 行)） |
| `useEquipmentStore` | 8 条**前端种子数据**，无后端表 |
| `batch_cost_aggregation.equipment_depreciation_cost` | **硬编码 0**（源码注释「P2-2 农机模块推迟」） |
| 物料分类 | 「农机具」只是 `material_code_categories` 的一个分类名 |

### 方案

```
① 主数据
   farm_equipment：id, equipment_code, name, type(拖拉机/喷雾机/水泵…),
     brand, model, purchase_date, purchase_price, useful_life_years,
     residual_rate, status(在用/维修/报废), owner_team_id, location

② 作业绑定
   farm_task_equipment：task_id, equipment_id, work_hours, fuel_liters, operator_id
   任务执行时可选填机具与工时

③ 折旧
   月折旧 = (原值 × (1 - 残值率)) / (使用年限 × 12)
   新建视图 equipment_depreciation_monthly（按月分摊）
   batch_cost_aggregation 的 equipment_depreciation_cost 改为：
     该批次任务关联机具的 作业工时占比 × 当期折旧

④ 维保
   farm_equipment_maintenance：equipment_id, type(保养/维修), date, cost,
     next_due_date, operator, remarks
   到期提醒复用 reminder_rules（当前仅 1 条「任务超期」，需扩展）
```

### 依赖

- P0-8（工时口径）**已完成** —— 机时与工时可共用同一套成本归集
- `reminder_rules` 需先扩展规则类型

### 验收标准

- 能建档、记录维保、到期提醒
- 批次成本里设备折旧 > 0（不再是硬编码 0）

### 工作量估算

后端 4 天 / 前端 3 天

---

## P2-3 气象预警与作业窗口

### 现状（实测）

| 项 | 现状 |
|---|---|
| 天气 API | **真实可用**：`/api/weather/now|forecast|current`（Open-Meteo 代理，免 Key） |
| 气象页 | P0-9 已接真数据 |
| 预警规则 | `reminder_rules` **仅 1 条**（`RULE_TASK_OVERDUE`） |
| 作业适宜性 | 无 |

### 方案

```
① 规则引擎（复用 reminder_rules 或新建 weather_alert_rules）
   farm_weather_alert_rules：
     id, name, metric(temp/wind/rain/humidity/delta_t), operator(>/</between),
     threshold, threshold2, scope(全场/温室/地块), action(提醒/建议改期/禁止作业),
     notify_roles, enabled

② 判定（后端定时任务，每小时）
   → 拉 7 日预报 → 逐条规则比对 → 命中写 weather_alerts
   → 与农事任务联动：命中「禁止作业」的任务标记 risk_flag

③ 喷药窗口
   POST /api/weather/spray-window { lat, lon, date }
   判据：风速 < 3m/s、温度 10–30℃、ΔT 2–8、未来 6h 无雨
   → 返回 绿/橙/红 分级 + 建议时段

④ 前端
   农事任务中心顶部加「今日作业适宜性」条
   排班页对不适宜日期给出黄色提示（不硬阻断）
```

### 依赖

- 无强依赖（天气 API 已就绪）

### 验收标准

- 能配置「高温 > 35℃ → 建议改期」并在次日预报命中时产生告警
- 喷药窗口接口返回分级且在用药表单中可见提示

### 工作量估算

后端 2.5 天 / 前端 2 天

---

## P2-4 作业成本模型（ABC / 亩均成本）

### 现状（实测）

| 项 | 现状 |
|---|---|
| `batch_cost_aggregation` | P0-8 已重写：人工成本读真实 `labor_records`，新增 `actual_area` / `cost_per_mu` |
| 物料成本 | 未接入（视图里没有 material_cost 列） |
| 能源成本 | `energy_costs` 表有 38 行，未接入视图 |
| 成本页 | `/manage/cost` 已重定向到真数据页 |

### 方案

```
① 视图补两列
   material_cost：从 material_costs / inventory_transaction（领料出库）按 batch_code 聚合
   energy_cost：从 energy_costs 按温室/月份分摊
   total_cost = labor + material + energy + outsource

② 作业成本（ABC）
   新建 cost_allocation_rules：
     cost_category(人工/物料/机械/能源), driver(task_hours/area/quantity),
     allocation_rule
   按 driver 把成本分摊到 地块/批次/作物

③ 预算 vs 实际
   cost_budgets 已有 3 行 → 扩展为按批次/年度
   新增偏差看板：预算 - 实际，超支 >10% 标红

④ 前端
   批次成本页加「成本构成」环形图 + 「亩均成本趋势」折线
```

### 依赖

- P0-8（已完成的真实工时）**必须**
- 物料领料需带 `batch_code`（P0-4 已加 `task_id`，批次仍靠 `production_batch_code`）

### 验收标准

- 某个批次的 `material_cost` / `energy_cost` > 0 且可追溯到来源单据
- 亩均成本 = total_cost / actual_area

### 工作量估算

后端 3 天 / 前端 2.5 天

---

## P2 执行建议顺序

| 顺序 | 域 | 理由 |
|---|---|---|
| 1 | **气象预警** | 依赖最少、天气 API 已就绪、见效最快 |
| 2 | **作业成本模型** | P0-8 已铺好路，只差物料/能源接入 |
| 3 | **农机具台账** | 需要新建主数据 + 折旧，工作量中等 |
| 4 | **农事计划与日历** | 需要先补 `growth_status` 历史数据，且与现有硬编码配置迁移耦合最深 |

## 共性前置条件（做 P2 之前必须先确认）

1. `plantings.growth_status` 83/86 为空 —— 农事计划域不可用
2. `reminder_rules` 仅 1 条 —— 农机维保、气象预警都要扩展规则类型
3. `employees.hourly_rate` 6 人全空 —— 成本模型靠 50 元兜底，精度有限
4. 物料领料 → 批次关联依赖 `production_batch_code`（自由文本），非强外键
