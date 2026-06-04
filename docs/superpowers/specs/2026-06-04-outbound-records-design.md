# 出库记录独立页面 - 设计规格

**创建日期**：2026-06-04
**状态**：设计已批准（用户确认 4 节）
**作者**：设计对话产物

## 1. 目的

为作物库存的**出库流水**提供独立查询与导出入口，支持按时间/类型/仓库/品种/出库人/业务类型多维度筛选，CSV/XLSX/PDF 三种格式导出，用于财务/管理层的统计汇总与对账。

## 2. 范围

### 2.1 在范围内

- 全量出库流水查询（按 `inventory_transactions` 表 `transaction_type='outbound'` 过滤）
- 6 维筛选（时间/库存类型/仓库/品种/出库人/业务类型）
- 3 种导出格式（CSV / XLSX / PDF）
- 顶部统计卡 + 库存类型分组卡
- 分页（默认 50/页，10/20/50 可选）
- 字段 100% 对齐作物库存页（19 列 = 库存 11 列 + 流水 7 列 + 主操作 1 列）
- 实例ID 可点击跳转详情（复用 `InventoryDetailModal`）
- 默认本月（本月 1 号到今天）

### 2.2 不在范围内（YAGNI）

- 报表订阅/定时邮件
- 多人协作批注
- 出库预测/AI 趋势分析
- 跨财年对比
- PDF 数字签名

## 3. 入口位置

**左侧菜单**「作物管理」子菜单下，新增「出库记录」项，紧挨「作物库存」之后。

```
作物管理
├── 种源管理
├── 育苗管理
├── 种植管理
├── 采收入库
├── 施肥管理
├── 病虫害管理
├── 作物库存            ← 现有
└── 出库记录 (新增)     ← ★ 路由 /crop/outbound-records
```

作物库存页**不加 Tab**（保持单一职责）。任意页面通过菜单直达。

## 4. 后端 API

### 4.1 `GET /api/inventory/transactions`

全量出库流水查询，分页 + 筛选 + 统计。

**请求参数**（全部 snake_case 兼容前端 camelCase）：

| 参数 | 必填 | 类型 | 说明 |
|---|---|---|---|
| type | 否 | string | 固定 `outbound`（V3.1 预留） |
| from | **是** | YYYY-MM-DD | 起始日期 |
| to | **是** | YYYY-MM-DD | 结束日期 |
| stock_type | 否 | seed/seedling/product | 库存类型 |
| warehouse_id | 否 | string | 仓库 |
| crop_name | 否 | string | 模糊匹配 |
| operator_name | 否 | string | 模糊匹配 |
| business_type | 否 | harvest/purchase/manual/transfer/other | 业务类型 |
| page | 否 | number | 默认 1 |
| limit | 否 | number | 默认 50，10/20/50 可选 |

**响应**：

```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "id": "TRX-...",
        "instanceId": "IPR-...",
        "stockType": "product",
        "transactionType": "outbound",
        "quantity": -30,
        "quantityOut": 30,
        "balanceBefore": 100,
        "balanceAfter": 70,
        "businessId": "HV...",
        "businessType": "harvest",
        "businessCode": "HS20260604001",
        "operatorId": "...",
        "operatorName": "张三",
        "operateDate": "2026-06-04T10:30:00.000Z",
        "remarks": "...",
        "createTime": "...",
        "cropName": "番茄",
        "varietyName": "粉冠 F1",
        "cropCode": "TS0000000001",
        "unit": "公斤",
        "warehouseName": "成品冷库A区",
        "plantingMode": "greenhouse",
        "grade": "good",
        "greenhouseName": "日光温室区"
      }
    ],
    "total": 1234,
    "summary": {
      "totalCount": 1234,
      "totalQuantity": 5678.5,
      "byStockType": { "seed": { "count": 100, "quantity": 500 }, ... },
      "byBusinessType": { "harvest": { "count": 800, "quantity": 4000 }, ... }
    }
  }
}
```

### 4.2 `GET /api/inventory/transactions/export`

导出文件，参数与 list 一致 + `format=csv|xlsx|pdf`。

**响应**：`Content-Disposition: attachment; filename="outbound-2026-06-04.xlsx"` 文件流。

### 4.3 `GET /api/inventory/transactions/stats`

仅汇总（无 rows/total），用于顶部 4 个统计卡。

## 5. 数据模型

### 5.1 `inventory_transactions` 表（已存在）

```sql
id, instance_id, stock_type, transaction_type,
quantity, balance_before, balance_after,
business_id, business_type, business_code,
operator_id, operator_name, operate_date,
remarks, create_time
```

### 5.2 JOIN `inventory_stock`（取展示字段）

```sql
LEFT JOIN inventory_stock s ON s.instance_id = t.instance_id
```

JOIN 字段：`crop_name`, `variety_name`, `crop_code`, `unit`, `warehouse_name`, `planting_mode`, `grade`, `greenhouse_name`

## 6. 核心 SQL

### 6.1 列表查询

```sql
SELECT
  t.id, t.instance_id, t.stock_type, t.transaction_type,
  t.quantity, t.balance_before, t.balance_after,
  t.business_id, t.business_type, t.business_code,
  t.operator_id, t.operator_name, t.operate_date, t.remarks,
  t.create_time,
  s.crop_name, s.variety_name, s.crop_code, s.unit,
  s.warehouse_name, s.planting_mode, s.grade, s.greenhouse_name
FROM inventory_transactions t
LEFT JOIN inventory_stock s ON s.instance_id = t.instance_id
WHERE t.transaction_type = 'outbound'
  AND t.operate_date >= ? AND t.operate_date <= ?
  [AND t.stock_type = ?]
  [AND s.warehouse_id = ?]
  [AND s.crop_name LIKE ?]
  [AND t.operator_name LIKE ?]
  [AND t.business_type = ?]
ORDER BY t.operate_date DESC, t.create_time DESC
LIMIT ? OFFSET ?
```

### 6.2 统计查询

```sql
-- 总计
SELECT COUNT(*) AS total_count, COALESCE(SUM(ABS(t.quantity)),0) AS total_quantity
FROM inventory_transactions t LEFT JOIN inventory_stock s ...
WHERE [同 list WHERE]

-- 按库存类型
SELECT t.stock_type, COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)),0) AS qty
FROM ... WHERE ... GROUP BY t.stock_type

-- 按业务类型
SELECT t.business_type, COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)),0) AS qty
FROM ... WHERE ... GROUP BY t.business_type
```

## 7. UI 设计（与作物库存像素级一致）

### 7.1 复用现有组件

| 位置 | 复用组件 | 来源文件 |
|---|---|---|
| 顶部 4 个统计卡 | `InventoryStats` | `src/components/farm/inventory/InventoryStats.tsx` |
| 3 个库存类型卡 | `InventoryStockTypeCards` | 同上目录 |
| 筛选条 | `InventoryFilter`（扩 5→6 维） | 同上目录 |
| 表格 | `InventoryTable`（扩列加 4 列） | 同上目录 |
| 分页 | `Pagination` | `src/components/ui/Pagination.tsx` |
| 详情弹窗 | `InventoryDetailModal` | 同上 inventory 目录 |
| 工具栏 | `ActionToolbar` | `src/components/warehouse/ActionToolbar.tsx` |

### 7.2 样式锚点（与库存表对照）

| 元素 | 样式 |
|---|---|
| 表格行 hover | `hover:bg-emerald-50` |
| 表头渐变 | `bg-gradient-to-r from-blue-500 to-blue-600 text-white` |
| 状态徽章 | `px-2 py-1 bg-{color}-100 text-{color}-700 text-xs rounded-full` |
| 选中行 | `bg-emerald-50/50` |
| sticky header | `sticky top-0 z-10` |
| 分页选项 | `pageSizeOptions={[10, 20, 50]}` |
| 操作按钮 | `<Button variant="link" size="sm">` + lucide |

### 7.3 19 列表格（字段与库存表 100% 对齐）

| # | 列名 | 字段 | 对齐库存列 |
|---|---|---|---|
| 1 | 业务单号 | t.business_code | — |
| 2 | 操作时间 | t.operate_date | — |
| 3 | **实例ID** | t.instance_id | ✅ 库存列 1（可点击） |
| 4 | **作物编码** | s.crop_code | ✅ 库存列 2 |
| 5 | **类型** | t.stock_type | ✅ 库存列 3 |
| 6 | **作物名称** | s.crop_name | ✅ 库存列 4 |
| 7 | **品种** | s.variety_name | ✅ 库存列 4 子 |
| 8 | **种植模式** | s.planting_mode | ✅ 库存列 7 |
| 9 | **采收区域** | s.greenhouse_name | ✅ 库存列 6 |
| 10 | **品质等级** | s.grade | ✅ 库存列 5 |
| 11 | **出库数量** | abs(t.quantity) | ✅ 库存列 8 |
| 12 | **单位** | s.unit | ✅ 库存列 8 |
| 13 | 余额前→后 | t.balance_before → balance_after | — |
| 14 | **仓库** | s.warehouse_name | ✅ 库存列 11 |
| 15 | **业务类型** | t.business_type | ≈ 库存列 12 |
| 16 | 出库人 | t.operator_name | — |
| 17 | 备注 | t.remarks | — |
| 18 | 操作 | — | ✅ 库存列 15「详情」 |

**字段覆盖率**：库存 11/15 列展示（4 列不适用），新增 7 个流水专属列。

### 7.4 顶部 4 个统计卡

| 卡 | 数据 | 计算 |
|---|---|---|
| 总条数 | `summary.totalCount` | COUNT(*) |
| 总出库量 | `summary.totalQuantity`（含单位 kg） | SUM(ABS(quantity)) |
| 出库次数 | `summary.totalCount`（**与总条数相同**；每次 transaction 一行 = 一次出库） | COUNT(*) |
| 品种数 | COUNT(DISTINCT s.crop_name) | DISTINCT |

### 7.5 3 个库存类型卡

种源/种苗/成品，分别显示 `byStockType[xxx].count` 和 `quantity`。

### 7.6 导出按钮

顶部工具栏右侧（与 ActionToolbar 同一行）：

```
[默认本月▼]  [📥 导出CSV]  [📥 导出XLSX]  [📥 导出PDF]
```

`<Button variant="outline" size="sm">` 风格一致。

## 8. 交互行为

| 操作 | 行为 |
|---|---|
| 首次进入 | 顶部 spinner + 表格 Skeleton |
| 改筛选 | debounce 300ms 重查 + 统计刷新 |
| 翻页 | 表格内 spinner，分页按钮 disabled |
| 点击实例ID | 打开 `InventoryDetailModal`（复用） |
| 点击详情按钮 | 同上 |
| 导出 | 按钮 spinner + Toast「正在生成 N 条记录的 XLSX...」+ 下载 |

## 9. 错误处理

| 场景 | 行为 | UI |
|---|---|---|
| from/to 为空 | 400 | 顶部红色 Alert + 高亮筛选区 |
| from > to | 400 | Alert「开始日期不能晚于结束日期」 |
| 范围 > 365 天 | 前端禁用导出 | Alert「时间范围超过 1 年，请缩短或多次导出」 |
| 无数据 | total=0 | EmptyState 插画 + 「重置筛选」 |
| 网络断开 | fetch failed | Toast「网络异常，请检查后重试」 |
| API 500 | server error | 表格区「加载失败，点击重试」按钮 |
| 导出失败 | server timeout | Toast「导出失败：超过 1 万行请缩短时间范围」 |
| 实例ID 已删 | 详情 | 弹窗「该库存实例已被删除」 |
| 401/403 | 拦截器 | 跳登录 / Toast「无访问权限」 |

## 10. 默认行为

- **默认时间范围**：本月 1 号到今天
- **默认分页**：50/页
- **默认筛选**：全部（仅时间范围）
- **默认排序**：操作时间 DESC

## 11. 边界保护

| 输入 | 防御 |
|---|---|
| from > 当前日期 | 禁用 |
| to < 项目起始日 | 后端 404 + Alert |
| cropName 长度 | 限制 50 字符 |
| operatorName 长度 | 限制 50 字符 |
| 数量为 0 的记录 | 展示但标灰 |
| instanceId 已删除 | 详情页友好提示 |

## 12. 测试策略

### 12.1 单元测试（Vitest）

- `outboundRecordsService.ts` 参数序列化（camelCase → snake_case）
- 日期范围校验（from > to 抛错）
- 空值过滤（不传 → 全部）
- 分页计算

### 12.2 集成测试（API + DB）

- POST 1000 条测试记录 → GET total=1000
- 多条件组合筛选 → SQL 正确
- 默认本月 → 返回当月
- JOIN 字段正确
- 导出 CSV 头部行格式
- 导出 XLSX 多 sheet（"明细" + "汇总"）

### 12.3 端到端（手动 10 轮次）

1. 建 30 条跨月出库记录 → 默认本月看 30 条 ✓
2. 改时间范围 → 列表 + 统计实时更新 ✓
3. 改业务类型筛选 → 列表过滤 ✓
4. 导出 CSV → 行数对得上 ✓
5. 导出 XLSX → Excel 打开，多 sheet ✓
6. 导出 PDF → 浏览器预览正常 ✓
7. 点实例ID → 详情弹窗字段对得上 ✓
8. 删 1 条库存 → 该条详情显示「已删除」 ✓
9. 时间范围超 1 年 → 导出禁用 ✓
10. 空数据 → EmptyState + 重置 ✓

## 13. 改动清单

| # | 文件 | 类型 | 行数 | 备注 |
|---|---|---|---|---|
| 1 | `server/src/repositories/inventoryTransaction.repository.ts` | 新增 | +150 | 出库流水 Repository |
| 2 | `server/src/services/inventoryTransaction.service.ts` | 新增 | +200 | service 层 |
| 3 | `server/src/routes/inventory.ts` | 改 | +60 | 加 3 个端点 |
| 4 | `server/src/utils/exporter.ts` | 新增 | +120 | CSV/XLSX/PDF 生成器 |
| 5 | `src/services/inventoryTransactionService.ts` | 新增 | +60 | 前端 service |
| 6 | `src/pages/OutboundRecordsPage.tsx` | 新增 | +500 | 页面主体 |
| 7 | `src/components/layout/Sidebar.tsx` | 改 | +2 | 加菜单项 |
| 8 | `src/App.tsx` | 改 | +2 | 加路由 |
| 9 | `src/__tests__/outboundRecords.test.ts` | 新增 | +150 | 测试 |

**总改动 ~1240 行，1.5 天工作量。**

## 14. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 后端导出大文件 OOM | 中 | 高 | 数据 > 5000 行走后端 stream；前端超时用 30s |
| JOIN 性能（30 万行 +） | 中 | 中 | `instance_id` 已有索引（V3 库存已建） |
| 出库流水表无索引 | 中 | 高 | fixMissingSchema 加 `(transaction_type, operate_date)` 复合索引 |
| 用户误删库存影响流水展示 | 低 | 低 | 详情页友好提示，不崩 |
| PDF 中文乱码 | 中 | 中 | 选用支持中文的字体嵌入 |

## 15. 后续（不在本设计范围）

- 报表订阅/邮件
- 跨年对比
- 出库预测
- 数字签名

---

**已批准状态**：4 节设计用户全部确认「可以」。

**下一步**：调用 writing-plans 技能创建实现计划。
