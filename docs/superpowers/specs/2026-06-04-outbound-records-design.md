# 出库记录独立页面 - 设计规格

**创建日期**：2026-06-04
**状态**：设计已批准（用户确认 4 节）
**作者**：设计对话产物

## 1. 目的

为作物库存的**出库流水**提供独立查询与导出入口，支持按时间/类型/仓库/品种/出库人/业务类型多维度筛选，CSV/XLSX/PDF 三种格式导出，用于财务/管理层的统计汇总与对账。

## 2. 范围

### 2.1 在范围内

- 全量出库流水查询（按 `inventory_transaction` 表（**单数**）`transaction_type='outbound'` 过滤）
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
- 路由级 type 参数（路由名已限定）
- 起始日期校验（项目无「起始日」概念）

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
        "operateDate": "2026-06-04",
        "remarks": "...",
        "createTime": "2026-06-04T10:30:00.000Z",
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
      "todayCount": 12,
      "byStockType": { "seed": { "count": 100, "quantity": 500 }, ... },
      "byBusinessType": { "harvest": { "count": 800, "quantity": 4000 }, ... }
    }
  }
}
```

> **注**：`operateDate` 存的是**纯日期字符串**（`"2026-06-04"`，来自 `now.toISOString().slice(0, 10)`），不是 ISO 完整时间戳。`createTime` 是 ISO 完整。

### 4.2 `GET /api/inventory/transactions/export`

导出文件，参数与 list 一致 + `format=csv|xlsx`。

> **PDF 不走服务端**：前端用 jspdf + jspdf-autotable 生成（已装），后端只出 CSV/XLSX。这样：
> - 不引 pdfkit（项目无后端 PDF 依赖，避免 +5MB 中文字体）
> - PDF 限制 ≤ 2000 行（受 jspdf 性能/体积影响）
> - XLSX 不限行数
> - CSV 不限行数

**响应**：`Content-Disposition: attachment; filename="outbound-2026-06-04.xlsx"` 文件流。

### 4.3 `GET /api/inventory/transactions/stats`

仅汇总（无 rows/total），用于顶部统计卡。

## 5. 数据模型

### 5.1 `inventory_transaction` 表（已存在，**单数**）

```sql
id, instance_id, stock_type, transaction_type,
quantity, balance_before, balance_after,
business_id, business_type, business_code,
operator_id, operator_name, operate_date,
remarks, create_time
```

> 表名是**单数** `inventory_transaction`，不是复数。证据：`server/src/db/schema.ts`、`server/src/repositories/inventory-tx.repository.ts`。

### 5.2 JOIN `inventory_stock`（LEFT JOIN 防删单丢失）

```sql
LEFT JOIN inventory_stock s ON s.instance_id = t.instance_id
```

JOIN 字段：`crop_name`, `variety_name`, `crop_code`, `unit`, `warehouse_name`, `planting_mode`, `grade`, `greenhouse_name`

> 即使对应 `inventory_stock` 已被删除，出库记录仍能展示（只缺 JOIN 字段），与错误处理"实例ID 已删 → 友好提示"一致。

## 6. 核心 SQL

### 6.1 列表查询（LEFT JOIN 过滤放 ON 子句或 IS NULL 兼容）

```sql
SELECT
  t.id, t.instance_id, t.stock_type, t.transaction_type,
  t.quantity, t.balance_before, t.balance_after,
  t.business_id, t.business_type, t.business_code,
  t.operator_id, t.operator_name, t.operate_date, t.remarks,
  t.create_time,
  s.crop_name, s.variety_name, s.crop_code, s.unit,
  s.warehouse_name, s.planting_mode, s.grade, s.greenhouse_name
FROM inventory_transaction t
LEFT JOIN inventory_stock s
  ON s.instance_id = t.instance_id
  AND (? IS NULL OR s.warehouse_id = ?)            -- warehouse 过滤放 ON
  AND (? IS NULL OR s.crop_name LIKE ?)            -- crop 过滤放 ON
WHERE t.transaction_type = 'outbound'
  AND t.operate_date >= ? AND t.operate_date <= ?
  [AND t.stock_type = ?]                           -- stock_type 在 transactions 表上
  [AND t.operator_name LIKE ?]                     -- operator_name 在 transactions 表上
  [AND t.business_type = ?]                        -- business_type 在 transactions 表上
ORDER BY t.operate_date DESC, t.create_time DESC
LIMIT ? OFFSET ?
```

> **关键**：对 `inventory_stock` 的字段（warehouse/crop_name）过滤放 LEFT JOIN 的 ON 子句，**不要放 WHERE**，否则会过滤掉已删库存的记录，与第 9 节错误处理矛盾。
> 对于 `inventory_transaction` 表自身的字段（stock_type/operator_name/business_type）放 WHERE，没问题。

### 6.2 统计查询

```sql
-- 总计
SELECT COUNT(*) AS total_count, COALESCE(SUM(ABS(t.quantity)),0) AS total_quantity
FROM inventory_transaction t LEFT JOIN inventory_stock s ON s.instance_id = t.instance_id
WHERE t.transaction_type = 'outbound' AND t.operate_date >= ? AND t.operate_date <= ?
  [AND ...]

-- 今日出库次数（顶部"今日出库"卡专用）
SELECT COUNT(*) AS today_count FROM inventory_transaction
WHERE transaction_type = 'outbound' AND operate_date = date('now')

-- 按库存类型
SELECT t.stock_type, COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)),0) AS qty
FROM ... WHERE ... GROUP BY t.stock_type

-- 按业务类型
SELECT t.business_type, COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)),0) AS qty
FROM ... WHERE ... GROUP BY t.business_type
```

## 6.5 索引（fixMissingSchema 加）

```sql
-- 复合索引：主要按 (transaction_type, operate_date) 范围扫描
CREATE INDEX IF NOT EXISTS idx_inventory_tx_type_date
  ON inventory_transaction(transaction_type, operate_date DESC);

-- 外键索引：JOIN 性能
CREATE INDEX IF NOT EXISTS idx_inventory_tx_instance
  ON inventory_transaction(instance_id);

-- 业务类型统计
CREATE INDEX IF NOT EXISTS idx_inventory_tx_business
  ON inventory_transaction(business_type);
```

> 实施位置：`server/src/db/fixMissingSchema.ts` 的"采收/库存相关索引"块。

## 7. UI 设计（与作物库存像素级一致）

### 7.1 组件策略：**新建 + 复用通用 UI**

> **重要**：原 spec 误判"复用 InventoryTable/InventoryFilter/InventoryStats"，经 critic 审核 + 代码验证，这 3 个组件的 props 契约与流水数据形态不匹配（前者 data=库存实例，后者 data=出库交易），**不能直接复用**。需要新写 3 个专用组件。

| 位置 | **新写** 组件 | 复用组件 | 来源 |
|---|---|---|---|
| 顶部 4 个统计卡 | `OutboundRecordsStats` | — | 新建（语义与库存 4 卡不同） |
| 3 个库存类型卡 | `OutboundRecordsStockTypeCards` | — | 新建（接出库统计 byStockType） |
| 筛选条 | `OutboundRecordsFilter` | — | 新建（4→6 维 + 时间范围） |
| 表格 | `OutboundRecordsTable` | — | 新建（19 列，主键=transaction_id 而非 instance_id） |
| 分页 | — | `Pagination` | `src/components/ui/Pagination.tsx` |
| 详情弹窗 | — | `InventoryDetailModal` | 按 instanceId 跳详情（数据契约匹配） |
| 顶部工具栏 | — | `ActionToolbar` | 筛选+导出按钮容器 |
| Badge 样式 | — | `getStockTypeBadge` / `BUSINESS_TYPE_META` | 已存在 |

> 表格组件的 19 列、`data: OutboundTransaction[]`、`onViewDetail(instanceId)` 回调——是**全新**接口（不复用 `InventoryTable` 的 `data: InventoryStock[]` + `onOutbound`）。

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

> 操作列在表内（不在工具栏），符合"详情按钮在每行触发"的一致性。**操作列只此一处**。

**字段覆盖率**：库存 11/15 列展示（4 列不适用：可用/冻结/状态/入库日期），新增 7 个流水专属列。

### 7.4 顶部 4 个统计卡

| 卡 | 数据 | 计算 |
|---|---|---|
| 总条数 | `summary.totalCount` | COUNT(*) 当前筛选 |
| 总出库量 | `summary.totalQuantity`（含单位 kg） | SUM(ABS(quantity)) |
| 今日出库次数 | `summary.todayCount` | COUNT(*) WHERE operate_date = date('now')（**独立维度**） |
| 品种数 | COUNT(DISTINCT s.crop_name) | DISTINCT |

> 替换原 spec "出库次数 = 总条数" 的无意义卡。**今日出库次数** 更有业务意义（运营/管理层每天关心）。

### 7.5 3 个库存类型卡

种源/种苗/成品，分别显示 `byStockType[xxx].count` 和 `quantity`。

### 7.6 导出按钮（顶部工具栏右侧）

```
[默认本月▼]  [📥 导出CSV]  [📥 导出XLSX]  [📥 导出PDF]
```

`<Button variant="outline" size="sm">` 风格一致。**PDF 由前端 jspdf 生成**（详见 4.2 节）。

## 8. 交互行为

| 操作 | 行为 |
|---|---|
| 首次进入 | 顶部 spinner + 表格 Skeleton |
| 改筛选 | debounce 300ms 重查 + 统计刷新 |
| 翻页 | 表格内 spinner，分页按钮 disabled |
| 点击实例ID | 打开 `InventoryDetailModal`（复用） |
| 点击详情按钮 | 同上 |
| 导出 CSV/XLSX | 按钮 spinner + Toast「正在生成 N 条记录的 XLSX...」+ 下载 |
| 导出 PDF | 按钮 spinner + Toast「正在生成 PDF...」+ 前端 jspdf 渲染 + 下载 |

## 9. 错误处理

| 场景 | 行为 | UI |
|---|---|---|
| from/to 为空 | 400 | 顶部红色 Alert + 高亮筛选区 |
| from > to | 400 | Alert「开始日期不能晚于结束日期」 |
| 范围 > 365 天 | 禁用 PDF 导出 | Alert「时间范围超过 1 年，已禁用 PDF（CSV/XLSX 不限）」 |
| 无数据 | total=0 | EmptyState 插画 + 「重置筛选」 |
| 网络断开 | fetch failed | Toast「网络异常，请检查后重试」 |
| API 500 | server error | 表格区「加载失败，点击重试」按钮 |
| 导出失败 | server timeout | Toast「导出失败，请缩短时间范围」 |
| 实例ID 已删 | LEFT JOIN NULL，详情页提示 | 弹窗「该库存实例已被删除」 |
| 401/403 | **本页 catch 后 Toast「无访问权限」** | 注意：项目当前无统一拦截器（`src/services/apiClient.ts:80` 401 处理已注释），本设计**不在范围内**实现全局拦截器 |

## 10. 默认行为

- **默认时间范围**：本月 1 号到今天
- **默认分页**：50/页
- **默认筛选**：全部（仅时间范围）
- **默认排序**：操作时间 DESC
- **首次挂载**：前端 `useEffect` **同步**设置 `from = 本月1号`、`to = 今天`，再发首次请求（避免 from/to 为空触发 400）

## 11. 边界保护

| 输入 | 防御 |
|---|---|
| from > 当前日期 | 禁用（前端 DatePicker 限 max=today） |
| from > to | 阻止提交 + Alert |
| cropName 长度 | 限制 50 字符 |
| operatorName 长度 | 限制 50 字符 |
| 数量为 0 的记录 | 展示但标灰 |
| instanceId 已删除 | LEFT JOIN → 字段为 null，详情页友好提示 |

## 12. 测试策略

### 12.1 单元测试（Vitest）

- `inventoryTransactionService` 参数序列化（camelCase → snake_case）
- 日期范围校验（from > to 抛错）
- 空值过滤（不传 → 全部）
- 分页计算
- PDF 生成器（前端 jspdf）单元测试

### 12.2 集成测试（API + DB）

- `scripts/seedOutboundFixtures.ts` **新增** 生成 1000 条跨月出库测试数据（**项目无现有 seed 脚本**）
- POST 1000 条 → GET total=1000
- 多条件组合筛选 → SQL 正确
- 默认本月 → 返回当月
- JOIN 字段正确（含 LEFT JOIN 时 stock 已删场景）
- 导出 CSV 头部行格式
- 导出 XLSX 多 sheet（"明细" + "汇总"）

### 12.3 端到端（手动 10 轮次）

1. 用 seed 脚本建 30 条跨月出库记录 → 默认本月看 30 条 ✓
2. 改时间范围 → 列表 + 统计实时更新 ✓
3. 改业务类型筛选 → 列表过滤 ✓
4. 导出 CSV → 行数对得上 ✓
5. 导出 XLSX → Excel 打开，多 sheet ✓
6. 导出 PDF（≤2000 行） → 浏览器预览正常 ✓
7. 点实例ID → 详情弹窗字段对得上 ✓
8. 删 1 条库存 → 该条详情显示「已删除」（LEFT JOIN null）✓
9. 时间范围超 1 年 → 导出 PDF 按钮禁用，CSV/XLSX 仍可用 ✓
10. 空数据 → EmptyState + 重置 ✓

## 13. 改动清单

| # | 文件 | 类型 | 行数 | 备注 |
|---|---|---|---|---|
| 1 | `server/src/db/fixMissingSchema.ts` | 改 | +20 | 加 3 个复合索引（type+date / instance / business） |
| 2 | `server/src/repositories/inventoryTransaction.repository.ts` | 新增 | +200 | 出库流水 Repository（list/stats/export SQL） |
| 3 | `server/src/services/inventoryTransaction.service.ts` | 新增 | +180 | service 层（参数转换 + 业务校验） |
| 4 | `server/src/routes/inventory.ts` | 改 | +80 | 加 3 个端点（list/stats/export） |
| 5 | `server/src/utils/csvExporter.ts` | 新增 | +60 | CSV 流式生成 |
| 6 | `server/src/utils/xlsxExporter.ts` | 新增 | +100 | XLSX 多 sheet（明细+汇总） |
| 7 | `scripts/seedOutboundFixtures.ts` | 新增 | +120 | 测试数据生成（1000 条跨月） |
| 8 | `src/services/inventoryTransactionService.ts` | 新增 | +80 | 前端 service |
| 9 | `src/components/farm/inventory/OutboundRecordsStats.tsx` | 新增 | +150 | 4 个统计卡 |
| 10 | `src/components/farm/inventory/OutboundRecordsStockTypeCards.tsx` | 新增 | +120 | 3 个类型卡 |
| 11 | `src/components/farm/inventory/OutboundRecordsFilter.tsx` | 新增 | +250 | 6 维筛选 + 时间范围 |
| 12 | `src/components/farm/inventory/OutboundRecordsTable.tsx` | 新增 | +400 | 19 列表格 |
| 13 | `src/pages/OutboundRecordsPage.tsx` | 新增 | +300 | 页面主体（组装上述组件） |
| 14 | `src/components/layout/Sidebar.tsx` | 改 | +2 | 加菜单项 |
| 15 | `src/App.tsx` | 改 | +2 | 加路由 |
| 16 | `src/utils/pdfExporter.ts` | 新增 | +150 | 前端 jspdf + jspdf-autotable PDF 生成 |
| 17 | `src/__tests__/outboundRecords.test.ts` | 新增 | +200 | 单元 + 集成测试 |

**总改动 ~2410 行，2.5-3 天工作量**（含审核修订后真实预估）。

## 14. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| `inventory_transaction` 表无索引 | 高 | 高（30 万行全表扫） | fixMissingSchema 加 3 个复合索引（已写明） |
| LEFT JOIN 过滤放 WHERE 退化 | 中 | 中（已删库存记录丢失） | spec 第 6.1 强制 ON 子句 |
| 数据量 > 30 万行导出 OOM | 中 | 高 | CSV 用 stream；XLSX 用 streaming write；PDF 限 ≤ 2000 行 |
| operateDate 是纯日期 vs ISO 字符串混存 | 中 | 中 | 已识别（服务层统一用 `.slice(0, 10)`），索引能命中 |
| PDF 中文字体 | 中 | 中 | jspdf 默认 Helvetica 不支持中文，需嵌入思源黑体子集（~3MB） |
| 用户误删库存影响流水展示 | 低 | 低 | LEFT JOIN 保留，详情页友好提示 |
| jspdf 性能（>2000 行变慢） | 中 | 中 | 限 PDF ≤ 2000 行，超出提示用 XLSX |
| 401/403 没拦截器 | 低 | 低 | spec 改"本页 catch + Toast"，不依赖拦截器（拦截器是另一个 PR） |

## 15. 后续（不在本设计范围）

- 报表订阅/邮件
- 跨年对比
- 出库预测
- 数字签名
- 全局 401 拦截器（独立 PR）

---

**已批准状态**：原 4 节设计用户确认「可以」；本次按 critic 审核修订（11 项问题，含 3 BLOCK + 6 HIGH + 部分 MEDIUM）。

**下一步**：调用 writing-plans 技能创建实现计划。
