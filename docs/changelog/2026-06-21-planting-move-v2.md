# 2026-06-21 种植调入/调出 V2

## 变更

- 新增 `planting_area_stocks` 表，按区域拆分株数
- `plantings.planting_quantity` 改为"订单总株数"，调入调出时**不变**
- POST /:id/move 重写，加 11 项校验（作物编码/品种/生命周期/self-move/数量等）
- 弹窗 V2：调入/调出分模式、新字段（source / target / 数量校验）
- 弹窗 onSubmit data shape 改为 `MovePlantingInputV2` 透传
- 数据自动迁移（启动时 fixMissingSchema 调用，目前被白名单禁用，需手工补建）

## 数据迁移

启动时自动从 `plantings.planting_quantity` 生成 stocks 行的迁移函数**已写**但当前**未自动运行**（fixMissingSchema 在启动白名单被禁用）。

**手工补建命令**（已成功执行）：

```bash
cd server && node scripts/build-stocks-now.cjs
```

会建表 + 从 plantings 现有数据迁入（约 44 条）。

**种子兜底**：`seedData.ts` 新增 `seedPlantingAreaStocks()` 函数，幂等（NOT EXISTS 保护），在 `seedDatabase` 主流程中作为兜底调用；表不存在时跳过。

## 业务规则

- 调入：必须指定来源种源/育苗批号；来源库存不足时拒绝；来源作物/品种与目标订单不一致时拒绝
- 调出：必须指定目标种植订单 ID；调出区域 stock 不足时拒绝；目标订单作物/品种不一致时拒绝
- self-move 禁止（同订单同区域）
- 已结束/已采收/已锁定/有 end_time 的订单不能调入调出

## 兼容性

- 旧 GET /api/plantings 返回字段不变（areaId/areaName/plantingCount 名称保留，但值改为从 stocks 聚合）
- 旧 POST /:id/move 调用方式不兼容（必须用 V2 input）

## 端到端测试结果（任务 10）

- GET /api/plantings 返回 stocks 聚合 ✓
- 调出 100 株同作物同品种 ✓
- 负向：作物不一致 / 数量 ≤ 0 / 超出 stock / 已结束订单 / 全部正确拒绝 ✓

## 注意事项

- `fixMissingSchema()` 当前被启动白名单禁用（历史 `plantings 6 → 0` 事故），迁移函数已写但不会自动跑
- 测试用污染数据（ZZ20260620-001 400 株、ZZ20260619-002 59 株）保持迁移后状态，未清理
- 如需手工修正：`UPDATE planting_area_stocks SET quantity = ? WHERE planting_id = ?`
- 临时脚本 `server/scripts/build-stocks-now.cjs` 用于补建 stocks 表（一次性）
