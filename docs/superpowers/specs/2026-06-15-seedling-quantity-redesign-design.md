# 育苗数量体系重构设计方案

**日期**: 2026-06-15
**版本**: v1.0
**状态**: 待批准

---

## 1. 背景与目标

### 1.1 当前问题

育苗管理模块当前存在三处设计缺陷：

1. **业务规则不通用**：`validateDailyChangeUpperBound`（`server/src/routes/seedling.ts:956-989`）和 `applyDailyChangeToSeedling`（`seedling.ts:1007-1091`）的 4 重上限校验（成活 ≤ 初始、损耗 ≤ 初始、成活+损耗 ≤ 初始、已定植 ≤ 成活）**只适用于普通模式**。母株类模式（匍匐茎/组培/扦插）的扩繁产出可以远超初始投入，校验会误报。

2. **字段语义重复**：AddModal 弹窗同时存在 6 种"繁殖模式"（seed/layering/tissue_culture/cutting/division/grafting）和"单批/扩繁"两种"计算模式"（SeedlingCalculateMode），两个字段都决定数量字段语义，**重复定义**。

3. **小苗去向遗漏**：业务上小苗有 4 个去向（损耗、人工定植、自动定植、采收入库），但当前 `seedlings` 表只有一个 `planted_count` 字段，种植管理路径自动累加和每日记录路径人工录入**混在一起**，无法区分；采收入库路径完全没有联动字段。

### 1.2 目标

**核心目标**：简化和统一育苗数量体系，让业务规则可推理、字段语义清晰、上下游数据流贯通。

**约束**：
- 不破坏现有"建档后不可修改"的不变量（新增时确定模式，后续不允许改）
- 历史数据无损迁移
- 6 种细分模式（seed/layering/tissue_culture/cutting/division/grafting）合并为 **2 种**（1:1 / 1:多），让用户操作和后端校验都极简化

### 1.3 决策摘要

| 决策点 | 选项 | 理由 |
|--------|------|------|
| 繁殖模式分类 | 6 种 → 2 种（1:1 / 1:多） | 过度细化造成 UI 和后端复杂 |
| 计算模式字段 | 完全移除 | 与繁殖模式重复定义 |
| 损耗范围 | 母株死亡+小苗死亡都算 | loss_count 单一字段，但按字段拆分 |
| 1:1 模式母株 | 默认 = 初始投入 | 母株=投入本身 |
| 1:1 模式小苗产出 | 自动算 = initial - mother | 不需要用户录入 |
| 种植管理累加 | 分两个字段（人工 vs 自动） | 区分数据来源，便于审计 |
| 采收入库 | 新增字段 | 解决重复统计问题 |
| 分株 division | 完全统一 1:多 | 不再特殊处理 |

---

## 2. 业务模式（2 种）

### 2.1 模式分类

| 新模式 | `propagation_mode` 值 | 合并的旧模式 | 业务语义 |
|--------|----------------------|-------------|---------|
| **1:1 育苗** | `one_to_one` | seed, grafting | 一对一繁育，母株=投入本身 |
| **1:多 育苗** | `one_to_many` | layering, tissue_culture, cutting, division | 母株持续产子苗，母株+子苗分离统计 |

### 2.2 业务语义对比

| 维度 | 1:1 育苗 | 1:多 育苗 |
|------|---------|----------|
| 母株 | "还在田里未发芽的种子" | "持续产苗的母株" |
| 母株损耗 | 种子未发芽 | 母株死亡 |
| 小苗产出 | **自动** = initial - 母株存活 | 用户每天录入"新出苗数" |
| 小苗损耗 | 长成后死亡 | 子苗死亡 |
| 扩繁倍数 | N/A | 用户录入（preset 或自定义） |
| 理论产苗量 | N/A | 母株 × 扩繁倍数（自动） |
| 目标成苗率 | 用户录入 | 用户录入 |
| 目标成苗数 | 自动算 = 初始 × 目标成苗率 | 自动算 = 理论产苗量 × 目标成苗率 |

---

## 3. 数据模型

### 3.1 主表字段（seedlings）

| 字段名 | 类型 | 1:1 模式 | 1:多 模式 | 来源 | 备注 |
|--------|------|---------|----------|------|------|
| `seedling_quantity` | INTEGER | 初始投入 | 初始投入 | 用户填 | 现有字段，含义不变 |
| `mother_plant_count` | INTEGER | **自动** = initial - mother_loss | 动态 | 1:1 后端算 / 1:多 来自母株数 | 现有字段，语义扩展 |
| `mother_loss_count` | INTEGER | 用户填 | 用户填 | 用户填 | **新增** |
| `expanded_plant_count` | INTEGER | **自动** = mother | 用户填 | 1:1 后端算 / 1:多 用户填 | 现有字段 |
| `seedling_loss_count` | INTEGER | 用户填 | 用户填 | 用户填 | **新增**（替代 loss_count） |
| `transplanted_count` | INTEGER | 用户填 | 用户填 | 用户填 | **新增**（替代 planted_count） |
| `auto_planted_count` | INTEGER | 系统自动 | 系统自动 | planting 路径 | **新增** |
| `harvest_stocked_count` | INTEGER | 系统自动 | 系统自动 | harvest 路径 | **新增** |
| `planted_count` | 保留兼容 | 停止写入 | 停止写入 | 保留旧值，新写入走 transplanted_count | sql.js 不支持 RENAME COLUMN |
| `loss_count` | 保留兼容 | 停止写入 | 停止写入 | 保留旧值，新写入走 seedling_loss_count | sql.js 不支持 RENAME COLUMN |
| `survival_quantity` | 保留 | 派生 = expanded - seedling_loss | 派生 = expanded - seedling_loss | 业务派生 | 兼容旧代码读取 |

### 3.2 预估字段（仅 1:多 模式有；1:1 模式为 NULL）

| 字段名 | 类型 | 1:1 模式 | 1:多 模式 | 来源 |
|--------|------|---------|----------|------|
| `propagation_multiple` | REAL | NULL | 扩繁倍数（0 = 自定义） | 字典选择 |
| `custom_multiple` | REAL | NULL | 自定义扩繁倍数 | 用户填 |
| `theoretical_yield` | INTEGER | NULL | 理论产苗量 = mother × 倍数 | **自动算** |
| `target_survival_rate` | REAL | NULL | 目标成苗率（%） | 用户填 |
| `target_survival_count` | INTEGER | NULL | 目标成苗数 = theoretical_yield × 目标成苗率 | **自动算** |

**注意**：预估字段不参与上限校验，仅用于"业务预估"和"实际产出对照"。

### 3.3 数据流图

```
[AddModal 新增]  →  育苗主表 8 字段
                       ↓
[DailyRecordModal 每日记录]  →  validateDailyChange()
                                   ↓ (校验通过)
                              applyDailyChange()
                                   ↓
                              累加 8 字段
                       ↓
[planting.ts 种植管理]  →  auto_planted_count += N
[harvest.ts 采收入库]  →  harvest_stocked_count += N
```

---

## 4. 校验规则

### 4.1 validateDailyChange（统一函数）

```typescript
function validateDailyChange(id: string, changeData: any): string | null {
  const row = loadSeedling(id);
  const initial = row.seedling_quantity;
  const is11 = row.propagation_mode === 'one_to_one';

  // 4 个 delta
  const mlc = changeData.motherLossChange || 0;        // 母株损耗 delta
  const slc = changeData.seedlingLossChange || 0;     // 小苗损耗 delta
  const ec = changeData.expandedChange || 0;           // 小苗产出 delta
  const tc = changeData.transplantedChange || 0;      // 人工定植 delta

  // 计算新值
  const newMother = (row.mother_plant_count || 0) - mlc;
  const newMotherLoss = (row.mother_loss_count || 0) + mlc;
  const newExpanded = is11 ? newMother : ((row.expanded_plant_count || 0) + ec);
  const newSeedlingLoss = (row.seedling_loss_count || 0) + slc;
  const newTransplanted = (row.transplanted_count || 0) + tc;
  const smallAvailable = newMother + newExpanded;

  // 通用校验
  if (newMother < 0 || newMother > initial) {
    return `母株存活数 ${newMother} 越界 [0, ${initial}]`;
  }
  if (newMotherLoss < 0) return '母株累计损耗不能为负';
  if (newExpanded < 0) return '小苗产出累计越界';
  if (newSeedlingLoss < 0) return '小苗累计损耗不能为负';
  if (newSeedlingLoss > newExpanded) {
    return `小苗损耗 ${newSeedlingLoss} 超过已产出 ${newExpanded}`;
  }

  // 1:1 模式额外校验
  if (is11 && (newMother + newMotherLoss > initial)) {
    return `母株存活+母株损耗 ${newMother + newMotherLoss} 超过初始 ${initial}`;
  }

  // 小苗消耗校验（不动 auto_planted/harvest_stocked：这两个由系统自动累加，校验在各自路径做）
  if (newSeedlingLoss + newTransplanted > smallAvailable) {
    return `小苗去向合计 ${newSeedlingLoss + newTransplanted} 超过可用 ${smallAvailable}`;
  }
  return null;
}
```

### 4.2 校验规则汇总

| 规则 | 1:1 模式 | 1:多 模式 |
|------|---------|----------|
| 母株存活 ∈ [0, initial] | ✓ | ✓ |
| 母株累计损耗 ≥ 0 | ✓ | ✓ |
| 小苗产出累计 ≥ 0 | ✓ | ✓ |
| 小苗累计损耗 ≥ 0 | ✓ | ✓ |
| 小苗损耗 ≤ 小苗产出 | ✓ | ✓ |
| 母株+母株损耗 ≤ initial | ✓ | N/A（不约束） |
| 小苗去向合计 ≤ 小苗可用 | ✓ | ✓ |

### 4.3 反向补偿（sign < 0）

删除每日记录或反向补偿时，**跳过上限校验**，允许任意值（铁律：能修复脏数据）。但保留"任何字段不能为负"的兜底（`MAX(0, col + ?)`）。

---

## 5. 上下游改造

### 5.1 后端 planting.ts 改造

**位置**: `server/src/routes/planting.ts:297`（可定植量公式）

```typescript
// 改造前（区分 isMother / 其他）
const isMother = ['layering', 'tissue_culture', 'cutting'].includes(mode);
const available = isMother ? (mother + expanded - planted) : (survival - planted);

// 改造后（统一公式）
const available = (mother + expanded) - seedling_loss - transplanted - auto_planted - harvest_stocked;
```

**位置**: `planting.ts:305`（自动累加）

```sql
-- 改造前
UPDATE seedlings SET planted_count = planted_count + ? WHERE id = ?

-- 改造后
UPDATE seedlings SET auto_planted_count = auto_planted_count + ? WHERE id = ?
```

**位置**: `planting.ts:423/575`（反向补偿）

```sql
-- 改造前
UPDATE seedlings SET planted_count = planted_count - ? WHERE id = ?

-- 改造后
UPDATE seedlings SET auto_planted_count = auto_planted_count - ? WHERE id = ?
```

### 5.2 后端 harvest.ts 改造

**新增**采收入库路径对 seedling 的联动：

```sql
-- 采收入库时
UPDATE seedlings SET harvest_stocked_count = harvest_stocked_count + ? WHERE id = ?

-- 反向补偿时
UPDATE seedlings SET harvest_stocked_count = harvest_stocked_count - ? WHERE id = ?
```

并在校验中加入：harvest_stocked + 已定植合计 ≤ 小苗可用。

### 5.3 后端 seedling.ts 改造

- `isMother` 判断移除
- 改用 `is11`（propagation_mode === 'one_to_one'）
- 字段映射：`survivalCountChange` → 1:1 时映射为 expandedChange，1:多 时映射为 motherLossChange
- 旧字段名 → 新字段名映射（保持 daily_record.data 兼容）

### 5.4 前端组件改造

| 组件 | 文件 | 改造 |
|------|------|------|
| `AddModal` | `src/components/farm/seedling/modals/AddModal.tsx` | 6 选项 → 2 选项；移除"单批/扩繁"切换；按模式显示母株数量/扩繁倍数/理论产苗量 |
| `DailyRecordModal` | `src/components/farm/seedling/modals/DailyRecordModal.tsx` | 4 选项 → 2 套录入字段 |
| `EditModal` | `src/components/farm/seedling/modals/EditModal.tsx` | 5 个数量字段统一显示 |
| `SeedlingTable` | `src/components/farm/seedling/components/SeedlingTable.tsx` | 6 列 → 5 列紧凑布局 |

---

## 6. 数据迁移

### 6.1 propagation_mode 字段值合并

```sql
-- 6 种 → 2 种
UPDATE seedlings SET propagation_mode = 'one_to_one'
  WHERE propagation_mode IN ('seed', 'grafting');
UPDATE seedlings SET propagation_mode = 'one_to_many'
  WHERE propagation_mode IN ('layering', 'tissue_culture', 'cutting', 'division');
```

### 6.2 字段新增 + 数据迁移（兼容 sql.js 不支持 RENAME COLUMN）

```sql
-- 新增字段
ALTER TABLE seedlings ADD COLUMN mother_loss_count INTEGER DEFAULT 0;
ALTER TABLE seedlings ADD COLUMN seedling_loss_count INTEGER DEFAULT 0;
ALTER TABLE seedlings ADD COLUMN transplanted_count INTEGER DEFAULT 0;
ALTER TABLE seedlings ADD COLUMN auto_planted_count INTEGER DEFAULT 0;
ALTER TABLE seedlings ADD COLUMN harvest_stocked_count INTEGER DEFAULT 0;

-- 数据迁移：把旧字段值复制到新字段（仅当新字段为 0 时，避免覆盖）
UPDATE seedlings SET transplanted_count = planted_count WHERE transplanted_count = 0 AND planted_count > 0;
UPDATE seedlings SET seedling_loss_count = loss_count WHERE seedling_loss_count = 0 AND loss_count > 0;
```

**说明**：旧字段（`planted_count`、`loss_count`）保留但不写入。后续业务代码停止读旧字段，仅读新字段。如果未来需要彻底清理旧字段，需要先迁移到新 SQLite 版本或重写迁移脚本。

### 6.3 1:1 模式 mother_plant_count 回填

```sql
-- 1:1 模式下 mother_plant_count 默认为初始投入
UPDATE seedlings SET mother_plant_count = seedling_quantity
  WHERE propagation_mode = 'one_to_one'
    AND (mother_plant_count IS NULL OR mother_plant_count = 0);
```

### 6.4 daily_record.data 字段兼容

历史每日记录的 `data` JSON 字段保留旧字段名（survivalCountChange / plantedCountChange / lossCountChange / runnerIncreaseCount），后端按 record.propagation_mode 解析映射到新字段：

| 旧字段名 | 1:1 模式 → 新 | 1:多 模式 → 新 |
|---------|--------------|---------------|
| `survivalCountChange` | `expandedChange` | `motherLossChange` |
| `plantedCountChange` | `transplantedChange` | `transplantedChange` |
| `lossCountChange` | `seedlingLossChange` | `seedlingLossChange` |
| `runnerIncreaseCount` | `expandedChange` | `expandedChange` |

写回 daily_record.data 时仍用旧字段名（向前兼容）。

### 6.5 迁移时机

`server/src/db/fixMissingSchema.ts` 启动时自动执行上述所有 DDL + DML，幂等（多次执行结果一致）。

---

## 7. 测试策略

### 7.1 单元测试

| 测试点 | 覆盖场景 |
|--------|---------|
| validateDailyChange (1:1) | 正常、越界、负数、损耗>产出、累计>初始 |
| validateDailyChange (1:多) | 正常、扩繁>初始（应通过）、损耗>产出（应拒绝） |
| applyDailyChange 反向补偿 | 删除每日记录时 sign=-1 跳过校验 |
| 数据迁移 | 6 种模式 → 2 种的转换、字段重命名 |

### 7.2 集成测试

| 测试点 | 覆盖场景 |
|--------|---------|
| 新增育苗（1:1） | 弹窗 → 后端 INSERT → 数据库 8 字段 |
| 新增育苗（1:多） | 弹窗填扩繁倍数 → 后端算 theoretical_yield |
| 每日记录正向 | 录入损耗/产出/定植 → 累加到主表 |
| 每日记录反向 | 删除每日记录 → 主表回退 |
| 种植管理累加 | 新建种植（关联育苗）→ auto_planted_count += N |
| 采收入库 | 入库时 harvest_stocked_count += N |

### 7.3 E2E 测试

- 用户在 UI 上 1:1 模式新增 → 录入每日损耗 → 列表显示正确
- 用户在 UI 上 1:多 模式新增（5 株母株、3 倍扩繁）→ 30 天后小苗产出累计 450 株（应不报错）
- 用户在 UI 上 1:多 模式录入小苗损耗 500 株（应拒绝：超过已产出）

### 7.4 回归测试

- 种植管理路径：新建种植反向补偿应能恢复
- 采收入库路径：暂未实现，需后端 harvest.ts 同步改造
- DailyRecordModal 旧 daily_record.data 解析

---

## 8. 风险与限制

### 8.1 已知风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 历史 daily_record.data 字段名不变 | 前端 UI 仍按 mode 解析 | 保留旧字段名，仅后端解析映射 |
| 字段重命名（planted_count → transplanted_count） | 上游代码读取 planted_count 会失败 | planting.ts 同步改造；其他模块 grep 验证 |
| 1:1 模式 mother_plant_count 自动算 | 用户感知不到这个字段 | UI 隐藏，显示为 hint |
| 采收入库路径未实现 | harvest.ts 改造可能延期 | 字段先建好，路径后续补 |
| 反向补偿允许任意值 | 脏数据可被修复但也可能被错误覆盖 | sign=-1 时仍校验非负（MAX(0, ...)） |

### 8.2 暂未覆盖

- 采收入库路径完整业务流（harvest.ts 联动）
- 跨模块的字段读取（其他模块若读 planted_count 需要同步更新）
- 移动端 / Electron 端的兼容性

### 8.3 后续工作

1. harvest.ts 路径完整实现
2. 其他模块读取 planted_count / loss_count 同步更新
3. 6 种模式细分（如果业务上确实需要）可作为 v2.0

---

## 9. 实施步骤

按依赖顺序：

1. **DDL 迁移**：`fixMissingSchema.ts` 加字段 + 数据迁移
2. **后端 seedling.ts 校验函数重写**：按新 2 模式逻辑
3. **后端 planting.ts 改造**：可定植量公式 + auto_planted_count 累加
4. **后端 harvest.ts 改造**：harvest_stocked_count 累加（如已有路径）
5. **前端 service 字段映射**：transformSingleSeedling 透传新字段
6. **前端 AddModal 重构**：6 选项 → 2 选项；移除计算模式
7. **前端 DailyRecordModal 重构**：按模式显示录入字段
8. **前端 EditModal / SeedlingTable 改造**
9. **单元测试 + 集成测试**
10. **E2E 测试**

预计工作量：**3-5 人天**（含测试）。

---

## 10. 附录

### 10.1 关键决策记录

| 决策 | 备选 | 选择 | 理由 |
|------|------|------|------|
| 模式分类 | 6 种 / 4 种 / 2 种 | **2 种** | 用户要求简化，UI 和后端都极简化 |
| 计算模式字段 | 保留 / 移除 | **移除** | 与繁殖模式重复 |
| 损耗字段 | 单字段 / 双字段 | **单字段** | 业务上"母株死+小苗死"都是损耗 |
| 种植累加 | 合并 / 分开 | **分开** | 用户明确要求区分人工 vs 自动 |
| 采收入库 | 不联动 / 联动 | **联动** | 避免重复统计 |
| division 模式 | 独立 / 统一 | **统一** | 简化校验代码 |

### 10.2 旧字段到新字段映射

| 旧字段 | 新字段 | 迁移方式 |
|--------|--------|---------|
| `planted_count` | `transplanted_count` | 重命名（保留累加值） |
| `loss_count` | `seedling_loss_count` | 重命名（保留累加值） |
| `survivalCountChange` (1:1) | `expandedChange` | 解析时按 mode 映射 |
| `survivalCountChange` (母株类) | `motherLossChange` | 解析时按 mode 映射 |
| `plantedCountChange` | `transplantedChange` | 直接映射 |
| `lossCountChange` | `seedlingLossChange` | 直接映射 |
| `runnerIncreaseCount` | `expandedChange` | 直接映射 |

### 10.3 校验函数调用方

| 调用方 | 路径 | 用途 |
|--------|------|------|
| POST /seedlings/:id/daily-records | `server/src/routes/seedling.ts:1097+` | 新增每日记录 |
| PUT /seedlings/:id/daily-records/:recordId | `seedling.ts:1199+` | 修改每日记录 |
| DELETE /seedlings/:id/daily-records/:recordId | 同上 | 删除每日记录（sign=-1） |
