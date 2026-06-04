# 出库记录独立页面 - 实现计划

**创建日期**：2026-06-04
**关联规格**：`docs/superpowers/specs/2026-06-04-outbound-records-design.md`（已通过 critic 审核）
**总工作量**：~2410 行 / 2.5-3 天
**执行模式**：TDD + 频繁 commit
**假设**：工程师有 Node/React 经验，但对本项目零上下文。

---

## 0. 前置条件

- 完整阅读规格文档 `2026-06-04-outbound-records-design.md`
- 已 review critic 报告的 11 项修订
- 项目路径：`D:\TMcrop\yuanxingtu\V1.1`
- V1.1 后端目前是 `tsx watch` 跑源码（PID 29356），改了 `*.ts` 自动 reload
- 前端 `npm run dev` 端口 5188，Vite HMR 自动刷新
- DB 路径：`server/data/yuanxingtu.db`（必须 commit）
- 测试命令：
  - 后端单测：`cd server && npx vitest run`
  - 前端单测：`npx vitest run`
  - 前端 tsc：`npx tsc --noEmit`
  - 前端 build：`npm run build`

---

## 1. 文件结构（17 个文件）

### 1.1 后端 — 7 个文件

| # | 文件 | 职责 |
|---|---|---|
| B1 | `server/src/db/fixMissingSchema.ts` | 改：加 3 个复合索引（type+date / instance / business） |
| B2 | `server/src/repositories/inventoryTransaction.repository.ts` | 新增：流水查询 Repository（list/stats/export SQL + camelCase 返回） |
| B3 | `server/src/services/inventoryTransaction.service.ts` | 新增：流水 service（参数转换、日期校验、统计聚合） |
| B4 | `server/src/routes/inventory.ts` | 改：加 3 个端点（list/stats/export） |
| B5 | `server/src/utils/csvExporter.ts` | 新增：CSV 流式生成（util 模块通用） |
| B6 | `server/src/utils/xlsxExporter.ts` | 新增：XLSX 多 sheet（明细+汇总） |
| B7 | `scripts/seedOutboundFixtures.ts` | 新增：测试数据生成（1000 条跨月） |

### 1.2 前端 — 9 个文件

| # | 文件 | 职责 |
|---|---|---|
| F1 | `src/services/inventoryTransactionService.ts` | 新增：前端 service（camelCase ↔ snake_case） |
| F2 | `src/components/farm/inventory/OutboundRecordsStats.tsx` | 新增：4 个统计卡 |
| F3 | `src/components/farm/inventory/OutboundRecordsStockTypeCards.tsx` | 新增：3 个类型卡 |
| F4 | `src/components/farm/inventory/OutboundRecordsFilter.tsx` | 新增：6 维筛选 + 时间范围 |
| F5 | `src/components/farm/inventory/OutboundRecordsTable.tsx` | 新增：19 列表格 |
| F6 | `src/utils/pdfExporter.ts` | 新增：前端 jspdf PDF 生成 |
| F7 | `src/pages/OutboundRecordsPage.tsx` | 新增：页面主体（组装上述组件） |
| F8 | `src/components/layout/Sidebar.tsx` | 改：加菜单项 |
| F9 | `src/App.tsx` | 改：加路由 |

### 1.3 测试 — 1 个文件

| # | 文件 | 职责 |
|---|---|---|
| T1 | `src/__tests__/outboundRecords.test.ts` | 新增：单元 + 集成测试 |

---

## 2. 任务清单

按依赖顺序，共 **8 个阶段 22 个任务**。每个任务都有：目标、改动、测试、commit。

---

### 阶段 1：DB 索引（B1）

#### Task 1.1：加 3 个复合索引

**目标**：让出库流水查询命中索引，避免 30 万行全表扫。

**文件**：`server/src/db/fixMissingSchema.ts`

**改动位置**：在 `fixMissingSchema` 函数末尾追加（不破坏现有逻辑）。

**代码**：
```ts
// V3.1 出库记录页性能优化（设计文档 6.5）
const outboundIndexes = [
  { name: 'idx_inventory_tx_type_date', sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_tx_type_date ON inventory_transaction(transaction_type, operate_date DESC)' },
  { name: 'idx_inventory_tx_instance',  sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_tx_instance  ON inventory_transaction(instance_id)' },
  { name: 'idx_inventory_tx_business',  sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_tx_business  ON inventory_transaction(business_type)' },
];
for (const idx of outboundIndexes) {
  try {
    db.run(idx.sql);
    console.log(`✓ 出库流水索引 ${idx.name} 创建成功`);
  } catch (e: any) {
    // console.log(`• ${idx.name}:`, e.message);
  }
}
```

**测试**：
```bash
# 重启后端（让 fixMissingSchema 跑）
# 验证：登录 SQLite 检查索引存在
cd server && npx tsx -e "
import { getDatabase, initDatabase, initializeDatabase, fixMissingSchema } from './src/db';
initDatabase(); initializeDatabase(); fixMissingSchema();
const db = getDatabase();
const r = db.exec(\"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='inventory_transaction'\");
console.log('indexes:', JSON.stringify(r));
"
```

**预期**：输出含 `idx_inventory_tx_type_date`、`idx_inventory_tx_instance`、`idx_inventory_tx_business`。

**Commit**：`feat(inventory): 出库流水表加 3 个复合索引`

---

### 阶段 2：后端 Repository + Service（B2 + B3）

#### Task 2.1：inventoryTransaction.repository.ts

**目标**：提供 list / stats / export 三个 SQL 入口。

**文件**：`server/src/repositories/inventoryTransaction.repository.ts`（新）

**完整骨架**：
```ts
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

export interface TransactionQuery {
  from: string;                   // YYYY-MM-DD 必填
  to: string;                     // YYYY-MM-DD 必填
  stockType?: string;             // seed/seedling/product
  warehouseId?: string;
  cropName?: string;
  operatorName?: string;
  businessType?: string;
  page?: number;                  // 默认 1
  limit?: number;                 // 默认 50
}

export interface OutboundRow {
  id: string;
  instanceId: string;
  stockType: string;
  transactionType: string;
  quantity: number;
  quantityOut: number;            // abs(quantity)
  balanceBefore: number;
  balanceAfter: number;
  businessId?: string;
  businessType?: string;
  businessCode?: string;
  operatorId?: string;
  operatorName?: string;
  operateDate: string;
  remarks?: string;
  createTime: string;
  // JOIN 字段
  cropName?: string;
  varietyName?: string;
  cropCode?: string;
  unit?: string;
  warehouseName?: string;
  plantingMode?: string;
  grade?: string;
  greenhouseName?: string;
}

export class InventoryTransactionRepository {
  /**
   * 列表查询（LEFT JOIN，过滤放 ON 子句）
   */
  async findOutbound(query: TransactionQuery): Promise<{ rows: OutboundRow[]; total: number }> {
    const db = getDatabase();
    const { from, to, stockType, warehouseId, cropName, operatorName, businessType, page = 1, limit = 50 } = query;
    const params: any[] = [from, to];

    // WHERE 条件（独立参数，避免 IS NULL 干扰）
    const where: string[] = [
      `t.transaction_type = 'outbound'`,
      `t.operate_date >= ?`,
      `t.operate_date <= ?`,
    ];
    if (stockType)    { where.push(`t.stock_type = ?`);    params.push(stockType); }
    if (operatorName) { where.push(`t.operator_name LIKE ?`); params.push(`%${operatorName}%`); }
    if (businessType) { where.push(`t.business_type = ?`); params.push(businessType); }

    // ON 子句过滤（防 LEFT JOIN 退化为 INNER JOIN）
    const onExtra: string[] = [];
    if (warehouseId) { onExtra.push(`s.warehouse_id = ?`); params.push(warehouseId); }
    if (cropName)    { onExtra.push(`s.crop_name LIKE ?`); params.push(`%${cropName}%`); }

    const sql = `
      SELECT
        t.id, t.instance_id AS instanceId, t.stock_type AS stockType, t.transaction_type AS transactionType,
        t.quantity, t.balance_before AS balanceBefore, t.balance_after AS balanceAfter,
        t.business_id AS businessId, t.business_type AS businessType, t.business_code AS businessCode,
        t.operator_id AS operatorId, t.operator_name AS operatorName, t.operate_date AS operateDate,
        t.remarks, t.create_time AS createTime,
        s.crop_name AS cropName, s.variety_name AS varietyName, s.crop_code AS cropCode, s.unit,
        s.warehouse_name AS warehouseName, s.planting_mode AS plantingMode, s.grade,
        s.greenhouse_name AS greenhouseName
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s
        ON s.instance_id = t.instance_id
        ${onExtra.length ? 'AND ' + onExtra.join(' AND ') : ''}
      WHERE ${where.join(' AND ')}
      ORDER BY t.operate_date DESC, t.create_time DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, (page - 1) * limit);

    const rows = queryToObjects<OutboundRow>(db, sql, params);
    // 加上 quantityOut（abs）
    rows.forEach(r => { r.quantityOut = Math.abs(r.quantity); });

    // 总数（不带分页）
    const countSql = `
      SELECT COUNT(*) AS cnt
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s
        ON s.instance_id = t.instance_id
        ${onExtra.length ? 'AND ' + onExtra.join(' AND ') : ''}
      WHERE ${where.join(' AND ')}
    `;
    const countResult = queryToObjects<{ cnt: number }>(db, countSql, params.slice(0, params.length - 2));
    const total = countResult[0]?.cnt || 0;

    return { rows, total };
  }

  /**
   * 统计聚合（4 个统计 + byStockType + byBusinessType）
   */
  async getStats(query: TransactionQuery): Promise<{
    totalCount: number;
    totalQuantity: number;
    todayCount: number;
    byStockType: Record<string, { count: number; quantity: number }>;
    byBusinessType: Record<string, { count: number; quantity: number }>;
  }> {
    const db = getDatabase();
    const { from, to, stockType, warehouseId, cropName, operatorName, businessType } = query;
    const baseWhere = [
      `t.transaction_type = 'outbound'`,
      `t.operate_date >= ?`, `t.operate_date <= ?`,
    ];
    const baseParams: any[] = [from, to];
    if (stockType)    { baseWhere.push(`t.stock_type = ?`); baseParams.push(stockType); }
    if (operatorName) { baseWhere.push(`t.operator_name LIKE ?`); baseParams.push(`%${operatorName}%`); }
    if (businessType) { baseWhere.push(`t.business_type = ?`); baseParams.push(businessType); }

    const onExtra: string[] = [];
    if (warehouseId) { onExtra.push(`s.warehouse_id = ?`); baseParams.push(warehouseId); }
    if (cropName)    { onExtra.push(`s.crop_name LIKE ?`); baseParams.push(`%${cropName}%`); }

    // 总数 + 总量
    const totalSql = `
      SELECT COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)), 0) AS totalQty
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s ON s.instance_id = t.instance_id
        ${onExtra.length ? 'AND ' + onExtra.join(' AND ') : ''}
      WHERE ${baseWhere.join(' AND ')}
    `;
    const totalResult = queryToObjects<{ cnt: number; totalQty: number }>(db, totalSql, baseParams);
    const totalCount = totalResult[0]?.cnt || 0;
    const totalQuantity = Number(totalResult[0]?.totalQty || 0);

    // 今日出库（独立查询）
    const todayResult = queryToObjects<{ cnt: number }>(db,
      `SELECT COUNT(*) AS cnt FROM inventory_transaction WHERE transaction_type = 'outbound' AND operate_date = date('now')`,
      []
    );
    const todayCount = todayResult[0]?.cnt || 0;

    // byStockType
    const byStockTypeRows = queryToObjects<{ stockType: string; cnt: number; qty: number }>(db, `
      SELECT t.stock_type AS stockType, COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)), 0) AS qty
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s ON s.instance_id = t.instance_id
        ${onExtra.length ? 'AND ' + onExtra.join(' AND ') : ''}
      WHERE ${baseWhere.join(' AND ')}
      GROUP BY t.stock_type
    `, baseParams);
    const byStockType: Record<string, { count: number; quantity: number }> = {};
    byStockTypeRows.forEach(r => {
      byStockType[r.stockType] = { count: r.cnt, quantity: Number(r.qty) };
    });

    // byBusinessType
    const byBizRows = queryToObjects<{ businessType: string; cnt: number; qty: number }>(db, `
      SELECT COALESCE(t.business_type, 'unknown') AS businessType, COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)), 0) AS qty
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s ON s.instance_id = t.instance_id
        ${onExtra.length ? 'AND ' + onExtra.join(' AND ') : ''}
      WHERE ${baseWhere.join(' AND ')}
      GROUP BY t.business_type
    `, baseParams);
    const byBusinessType: Record<string, { count: number; quantity: number }> = {};
    byBizRows.forEach(r => {
      byBusinessType[r.businessType] = { count: r.cnt, quantity: Number(r.qty) };
    });

    return { totalCount, totalQuantity, todayCount, byStockType, byBusinessType };
  }
}

export const inventoryTransactionRepository = new InventoryTransactionRepository();
```

**测试**（在 Task 2.3 写测试时一起）。

**Commit**：`feat(inventory): 新增 InventoryTransactionRepository (列表+统计)`

---

#### Task 2.2：inventoryTransaction.service.ts

**目标**：参数校验 + 业务规则 + Repository 包装。

**文件**：`server/src/services/inventoryTransaction.service.ts`（新）

**骨架**：
```ts
import { inventoryTransactionRepository, TransactionQuery } from '../repositories/inventoryTransaction.repository';

export class InventoryTransactionService {
  async listOutbound(query: TransactionQuery) {
    // 参数校验
    if (!query.from || !query.to) {
      throw new Error('from 和 to 是必填参数');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.from) || !/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      throw new Error('日期格式必须为 YYYY-MM-DD');
    }
    if (query.from > query.to) {
      throw new Error('开始日期不能晚于结束日期');
    }
    return inventoryTransactionRepository.findOutbound(query);
  }

  async getStats(query: TransactionQuery) {
    if (!query.from || !query.to) {
      throw new Error('from 和 to 是必填参数');
    }
    return inventoryTransactionRepository.getStats(query);
  }
}

export const inventoryTransactionService = new InventoryTransactionService();
```

**Commit**：`feat(inventory): 新增 InventoryTransactionService`

---

#### Task 2.3：写后端 5 轮单元/集成测试

**目标**：覆盖 Repository 的 4 个 SQL 场景 + Service 的 3 个校验。

**文件**：`server/src/__tests__/inventoryTransaction.test.ts`（新）

**测试用例**：
1. 默认本月 → 返回当月所有 outbound
2. 改时间范围 → 返回范围内
3. 库存类型筛选 → 只返回该类型
4. 仓库筛选（LEFT JOIN ON） → 删 stock 后仍能查到（join null）
5. from > to 抛错

**详细测试代码**（关键）：

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inventoryTransactionRepository } from '../repositories/inventoryTransaction.repository';
import { initDatabase, initializeDatabase, fixMissingSchema, getDatabase } from '../db';
import { execCount, queryToObjects } from '../utils/queryHelper';

beforeAll(() => {
  initDatabase();
  initializeDatabase();
  fixMissingSchema();
});

describe('InventoryTransactionRepository', () => {
  it('默认本月：返回所有 outbound', async () => {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const to = now.toISOString().slice(0, 10);
    const { rows, total } = await inventoryTransactionRepository.findOutbound({ from, to });
    expect(rows.every(r => r.transactionType === 'outbound')).toBe(true);
    expect(rows.every(r => r.operateDate >= from && r.operateDate <= to)).toBe(true);
  });

  it('库存类型筛选：只返回该类型', async () => {
    const { rows } = await inventoryTransactionRepository.findOutbound({
      from: '2026-01-01', to: '2026-12-31', stockType: 'product',
    });
    expect(rows.every(r => r.stockType === 'product')).toBe(true);
  });

  it('LEFT JOIN：已删库存仍能查到（cropName 为 undefined）', async () => {
    // 先插一条流水（instance_id 指向不存在的 stock）
    const db = getDatabase();
    db.run(`INSERT INTO inventory_transaction (id, instance_id, stock_type, transaction_type, quantity, balance_before, balance_after, operate_date, create_time) VALUES ('TEST-1', 'NOT-EXIST', 'product', 'outbound', -10, 100, 90, '2026-06-01', '2026-06-01')`);
    const { rows } = await inventoryTransactionRepository.findOutbound({ from: '2026-06-01', to: '2026-06-30' });
    const orphan = rows.find(r => r.id === 'TEST-1');
    expect(orphan).toBeTruthy();
    expect(orphan?.cropName).toBeUndefined(); // LEFT JOIN null
    // 清理
    db.run(`DELETE FROM inventory_transaction WHERE id = 'TEST-1'`);
  });

  it('服务层：from > to 抛错', async () => {
    const { inventoryTransactionService } = await import('../services/inventoryTransaction.service');
    await expect(
      inventoryTransactionService.listOutbound({ from: '2026-06-30', to: '2026-06-01' })
    ).rejects.toThrow('开始日期不能晚于结束日期');
  });

  it('服务层：日期格式错抛错', async () => {
    const { inventoryTransactionService } = await import('../services/inventoryTransaction.service');
    await expect(
      inventoryTransactionService.listOutbound({ from: '2026/06/01', to: '2026-06-30' })
    ).rejects.toThrow('日期格式必须为 YYYY-MM-DD');
  });
});
```

**运行**：
```bash
cd server && npx vitest run src/__tests__/inventoryTransaction.test.ts
```

**预期**：5 个测试全过。

**Commit**：`test(inventory): 出库流水 Repository + Service 5 轮测试`

---

### 阶段 3：后端 3 个 API 端点（B4 + B5 + B6）

#### Task 3.1：CSV 导出工具

**文件**：`server/src/utils/csvExporter.ts`（新）

**骨架**：
```ts
import { OutboundRow } from '../repositories/inventoryTransaction.repository';

/**
 * CSV 流式生成（避免大文件 OOM）
 * 字段顺序与设计 7.3 节表对齐
 */
export function toCSV(rows: OutboundRow[]): string {
  const headers = [
    '业务单号', '操作时间', '实例ID', '作物编码', '类型', '作物名称', '品种',
    '种植模式', '采收区域', '品质等级', '出库数量', '单位',
    '余额前', '余额后', '仓库', '业务类型', '出库人', '备注',
  ];
  const lines: string[] = [headers.join(',')];
  for (const r of rows) {
    const cells = [
      r.businessCode, r.operateDate, r.instanceId, r.cropCode, r.stockType,
      r.cropName, r.varietyName, r.plantingMode, r.greenhouseName, r.grade,
      r.quantityOut, r.unit, r.balanceBefore, r.balanceAfter, r.warehouseName,
      r.businessType, r.operatorName, r.remarks,
    ].map(v => v === undefined || v === null ? '' : csvEscape(String(v)));
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
```

**Commit**：`feat(inventory): CSV 导出工具`

---

#### Task 3.2：XLSX 导出工具

**文件**：`server/src/utils/xlsxExporter.ts`（新）

**依赖**：`xlsx` 已装在 `server/package.json`（如果没装，npm i xlsx）

**骨架**：
```ts
import * as XLSX from 'xlsx';
import { OutboundRow } from '../repositories/inventoryTransaction.repository';

export function toXLSX(rows: OutboundRow[], summary: any): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 明细
  const detailData = rows.map(r => ({
    '业务单号': r.businessCode || '',
    '操作时间': r.operateDate,
    '实例ID': r.instanceId,
    '作物编码': r.cropCode || '',
    '类型': r.stockType,
    '作物名称': r.cropName || '',
    '品种': r.varietyName || '',
    '种植模式': r.plantingMode || '',
    '采收区域': r.greenhouseName || '',
    '品质等级': r.grade || '',
    '出库数量': r.quantityOut,
    '单位': r.unit || '',
    '余额前': r.balanceBefore,
    '余额后': r.balanceAfter,
    '仓库': r.warehouseName || '',
    '业务类型': r.businessType || '',
    '出库人': r.operatorName || '',
    '备注': r.remarks || '',
  }));
  const detailWS = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, detailWS, '明细');

  // Sheet 2: 汇总
  const summaryData = [
    { '指标': '总条数',     '值': summary.totalCount },
    { '指标': '总出库量',   '值': summary.totalQuantity },
    { '指标': '今日出库次数', '值': summary.todayCount },
    { '指标': '品种数',     '值': Object.keys(summary.byStockType).length },
    ...Object.entries(summary.byStockType).map(([k, v]: any) => ({ '指标': `按库存类型-${k}`, '值': v.count, '数量': v.quantity })),
    ...Object.entries(summary.byBusinessType).map(([k, v]: any) => ({ '指标': `按业务类型-${k}`, '值': v.count, '数量': v.quantity })),
  ];
  const summaryWS = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, '汇总');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
```

**Commit**：`feat(inventory): XLSX 多 sheet 导出工具`

---

#### Task 3.3：路由层 3 个端点

**文件**：`server/src/routes/inventory.ts`（改）

**位置**：在文件末尾追加。

**代码**：
```ts
import { inventoryTransactionService } from '../services/inventoryTransaction.service';
import { inventoryTransactionRepository } from '../repositories/inventoryTransaction.repository';
import { toCSV } from '../utils/csvExporter';
import { toXLSX } from '../utils/xlsxExporter';

// GET /api/inventory/transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { from, to, stock_type, warehouse_id, crop_name, operator_name, business_type, page, limit } = req.query as any;
    const query = {
      from, to,
      stockType: stock_type,
      warehouseId: warehouse_id,
      cropName: crop_name,
      operatorName: operator_name,
      businessType: business_type,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    };
    const [list, stats] = await Promise.all([
      inventoryTransactionService.listOutbound(query),
      inventoryTransactionService.getStats(query),
    ]);
    res.json({ success: true, data: { ...list, summary: stats } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/inventory/transactions/stats
router.get('/transactions/stats', async (req: Request, res: Response) => {
  try {
    const query = req.query as any;
    const stats = await inventoryTransactionService.getStats({
      from: query.from, to: query.to,
      stockType: query.stock_type, warehouseId: query.warehouse_id,
      cropName: query.crop_name, operatorName: query.operator_name, businessType: query.business_type,
    });
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/inventory/transactions/export
router.get('/transactions/export', async (req: Request, res: Response) => {
  try {
    const { format, ...rest } = req.query as any;
    const query = {
      from: rest.from, to: rest.to,
      stockType: rest.stock_type, warehouseId: rest.warehouse_id,
      cropName: rest.crop_name, operatorName: rest.operator_name, businessType: rest.business_type,
      page: 1, limit: 100000, // 导出上限 10 万
    };
    const [list, stats] = await Promise.all([
      inventoryTransactionService.listOutbound(query),
      inventoryTransactionService.getStats(query),
    ]);
    const filename = `outbound-${new Date().toISOString().slice(0, 10)}.${format || 'csv'}`;
    if (format === 'xlsx') {
      const buf = toXLSX(list.rows, stats);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buf);
    } else {
      // 默认 CSV
      const csv = toCSV(list.rows);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(csv);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**注意**：路由顺序必须在 `/:id` 之前（已存在的 `/api/inventory/:id` 通配）！

**测试**：
```bash
# 1. 测试 list
curl -s "http://localhost:3001/api/inventory/transactions?from=2026-01-01&to=2026-12-31" | python -m json.tool | head -20
# 预期：rows 数组 + total + summary 4 个卡

# 2. 测试 stats
curl -s "http://localhost:3001/api/inventory/transactions/stats?from=2026-06-01&to=2026-06-30" | python -m json.tool

# 3. 测试导出 CSV
curl -s "http://localhost:3001/api/inventory/transactions/export?from=2026-06-01&to=2026-06-30&format=csv" | head -5

# 4. 测试导出 XLSX（应该是 xlsx 二进制）
curl -s "http://localhost:3001/api/inventory/transactions/export?from=2026-06-01&to=2026-06-30&format=xlsx" -o /tmp/test.xlsx
file /tmp/test.xlsx  # 应该是 "Microsoft Excel"
```

**Commit**：`feat(inventory): 出库流水 3 个 API 端点 (list/stats/export)`

---

### 阶段 4：测试数据生成（B7）

#### Task 4.1：seedOutboundFixtures.ts

**文件**：`scripts/seedOutboundFixtures.ts`（新）

**骨架**：
```ts
/**
 * 生成 1000 条跨月出库测试数据
 * 使用：cd server && npx tsx ../scripts/seedOutboundFixtures.ts
 */
import { getDatabase, initDatabase, initializeDatabase, fixMissingSchema, saveDatabase } from '../server/src/db';
import { execCount } from '../server/src/utils/queryHelper';

const COUNT = 1000;
const CROPS = [
  { name: '番茄', variety: '粉冠F1', code: 'TS0000000001' },
  { name: '黄瓜', variety: '水果黄瓜', code: 'TS0000000002' },
  { name: '辣椒', variety: '尖椒',     code: 'TS0000000003' },
  { name: '生菜', variety: '罗马生菜', code: 'TS0000000004' },
];
const STOCK_TYPES = ['seed', 'seedling', 'product'];
const BUSINESS_TYPES = ['harvest', 'purchase', 'manual', 'transfer'];
const WAREHOUSES = ['WH001', 'WH002', 'W002'];
const OPERATORS = ['张三', '李四', '王五', '赵六', 'system'];
const PLANTING_MODES = ['open_field', 'greenhouse', 'hydroponic', 'substrate'];
const GRADES = ['special', 'excellent', 'good', 'qualified', 'unqualified'];

(async () => {
  initDatabase();
  initializeDatabase();
  fixMissingSchema();

  const db = getDatabase();
  console.log(`开始生成 ${COUNT} 条测试出库流水...`);

  // 1. 先确保有 stock（避免 LEFT JOIN null 太多）
  const stockCount = execCount(db, 'SELECT COUNT(*) FROM inventory_stock');
  if (stockCount < 50) {
    console.log(`库存实例不足（${stockCount}），先创建 50 个 stock...`);
    for (let i = 0; i < 50; i++) {
      const stockType = STOCK_TYPES[i % 3];
      const crop = CROPS[i % CROPS.length];
      const instId = `IPR-FIX-${String(i).padStart(4, '0')}`;
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      db.run(`INSERT OR IGNORE INTO inventory_stock (id, instance_id, stock_type, business_id, business_type, business_code, crop_id, crop_name, variety_id, variety_name, crop_code, current_quantity, frozen_quantity, available_quantity, unit, warehouse_id, warehouse_name, inbound_date, source_type, status, version, planting_mode, grade, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`STK-FIX-${i}`, instId, stockType, `TEST-BIZ-${i}`, 'manual', `FIX-${i}`, '', crop.name, '', crop.variety, crop.code, 100, 0, 100, '公斤', WAREHOUSES[i % 3], `仓库${i % 3 + 1}`, date, 'manual', 'in_stock', 1, PLANTING_MODES[i % 4], GRADES[i % 5], now.toISOString(), now.toISOString()]);
    }
    saveDatabase();
  }

  // 2. 生成 1000 条出库流水（跨 2025-12 到 2026-06 共 7 个月）
  const startTime = new Date('2025-12-01').getTime();
  const endTime = new Date('2026-06-30').getTime();
  const range = endTime - startTime;

  for (let i = 0; i < COUNT; i++) {
    const stockType = STOCK_TYPES[i % 3];
    const crop = CROPS[i % CROPS.length];
    const instId = `IPR-FIX-${String(i % 50).padStart(4, '0')}`;
    const ts = new Date(startTime + Math.random() * range);
    const date = ts.toISOString().slice(0, 10);
    const businessType = BUSINESS_TYPES[i % BUSINESS_TYPES.length];
    const txId = `TRX-FIX-${String(i).padStart(5, '0')}`;
    const qty = -(Math.floor(Math.random() * 50) + 1);
    const op = OPERATORS[i % OPERATORS.length];

    db.run(`INSERT OR IGNORE INTO inventory_transaction (id, instance_id, stock_type, transaction_type, quantity, balance_before, balance_after, business_id, business_type, business_code, operator_id, operator_name, operate_date, remarks, create_time) VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, instId, stockType, qty, 100, 100 + qty, `TEST-BIZ-${i % 50}`, businessType, `FIX-${i % 50}`, `OP-${i % 5}`, op, date, `测试流水 ${i}`, ts.toISOString()]);
  }
  saveDatabase();

  const total = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type = 'outbound'");
  console.log(`✅ 完成。出库流水总数: ${total}`);
  process.exit(0);
})();
```

**运行**：
```bash
cd D:/TMcrop/yuanxingtu/V1.1
npx tsx scripts/seedOutboundFixtures.ts
```

**预期**：`✅ 完成。出库流水总数: ~1000+`

**Commit**：`chore(scripts): 出库流水测试数据生成脚本 (1000 条)`

---

### 阶段 5：前端 Service + 4 个新组件（F1-F6）

#### Task 5.1：前端 service

**文件**：`src/services/inventoryTransactionService.ts`（新）

**骨架**：
```ts
import { enhancedApiClient } from '../lib/apiClient';

export interface OutboundQuery {
  from: string;
  to: string;
  stockType?: string;
  warehouseId?: string;
  cropName?: string;
  operatorName?: string;
  businessType?: string;
  page?: number;
  limit?: number;
}

export interface OutboundRow { /* 同后端 OutboundRow */ }

export interface OutboundSummary {
  totalCount: number;
  totalQuantity: number;
  todayCount: number;
  byStockType: Record<string, { count: number; quantity: number }>;
  byBusinessType: Record<string, { count: number; quantity: number }>;
}

export async function getOutboundRecords(query: OutboundQuery) {
  const params: Record<string, string> = {
    from: query.from, to: query.to,
  };
  if (query.stockType)    params.stock_type = query.stockType;
  if (query.warehouseId)  params.warehouse_id = query.warehouseId;
  if (query.cropName)     params.crop_name = query.cropName;
  if (query.operatorName) params.operator_name = query.operatorName;
  if (query.businessType) params.business_type = query.businessType;
  if (query.page)         params.page = String(query.page);
  if (query.limit)        params.limit = String(query.limit);
  const qs = new URLSearchParams(params).toString();
  return enhancedApiClient.get<{ rows: OutboundRow[]; total: number; summary: OutboundSummary }>(
    `/inventory/transactions${qs ? `?${qs}` : ''}`
  );
}

export async function exportOutbound(query: OutboundQuery, format: 'csv' | 'xlsx') {
  const params: Record<string, string> = {
    from: query.from, to: query.to, format,
  };
  // ... 同上
  const qs = new URLSearchParams(params).toString();
  // 文件下载（enhancedApiClient 支持返回 blob）
  const blob = await enhancedApiClient.getBlob(`/inventory/transactions/export?${qs}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `outbound-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**注**：`enhancedApiClient.getBlob` 需要确认存在；如果没有，用 `fetch` + 临时 baseURL。

**Commit**：`feat(inventory): 前端出库流水 service`

---

#### Task 5.2：4 个新组件

按依赖顺序逐个写：

**F2 OutboundRecordsStats.tsx**（4 个统计卡）
- props: `{ stats: OutboundSummary, loading: boolean }`
- 4 个 Statistic 组件：总条数 / 总出库量（kg） / 今日出库 / 品种数
- 复用样式 `InventoryStats`（不用复制代码，直接 import 用）
- 实际：**复用 `InventoryStats` 组件 + 新建 `OutboundRecordsTodayCard` 一张**——更简单

> 反思：与设计 7.1 节的"新写"不一致。**简化为**：复用 InventoryStats（4 卡）+ 在旁边加 1 张「今日出库」小卡（简单 Tailwind）。

**F3 OutboundRecordsStockTypeCards.tsx**（3 个类型卡）
- 复用 `InventoryStockTypeCards`（数据契约同）
- 改 props 类型：`{ byStockType: Record<string, { count, quantity }> }`
- 实施时评估：实际可以直接 import `InventoryStockTypeCards` 并传 props

**F4 OutboundRecordsFilter.tsx**（6 维筛选 + 时间范围）
- props: `{ value: OutboundQuery, onChange, onReset, onExport }`
- 6 个控件：DateRangePicker / Select×3 / Input×2 + 业务类型 Select
- "重置" 按钮 + "导出 CSV/XLSX/PDF" 3 个按钮
- 复用 `InventoryFilter` 组件，传 props 即可

**F5 OutboundRecordsTable.tsx**（19 列表格）
- props: `{ data: OutboundRow[], loading, pagination, onChange, onViewDetail }`
- 19 列渲染（参考规格 7.3 节）
- 实例ID 蓝色链接（点击调 onViewDetail）
- 复用 `InventoryTable` 视觉样式（行 hover / sticky / badge）

**Commit**（一起提交）：`feat(inventory): 出库记录 4 个新组件 (Stats/TypeCards/Filter/Table)`

---

#### Task 5.3：前端 PDF 导出工具

**文件**：`src/utils/pdfExporter.ts`（新）

**依赖**：`jspdf` + `jspdf-autotable`（如果没装：`npm i jspdf jspdf-autotable`）

**骨架**：
```ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OutboundRow } from '../services/inventoryTransactionService';

export function exportOutboundPDF(rows: OutboundRow[], summary: any) {
  if (rows.length > 2000) {
    throw new Error(`PDF 最多支持 2000 行，当前 ${rows.length} 条。请用 XLSX 导出。`);
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // 标题
  doc.setFontSize(16);
  doc.text('出库记录', 14, 15);

  // 汇总
  doc.setFontSize(10);
  doc.text(`总条数: ${summary.totalCount}  总出库量: ${summary.totalQuantity}  今日: ${summary.todayCount}`, 14, 22);

  // 表格（19 列 - 简化为关键 10 列避免 PDF 过宽）
  autoTable(doc, {
    startY: 28,
    head: [['业务单号', '时间', '实例ID', '作物', '品种', '出库量', '仓库', '业务', '出库人', '备注']],
    body: rows.map(r => [
      r.businessCode || '',
      r.operateDate,
      r.instanceId,
      r.cropName || '',
      r.varietyName || '',
      `${r.quantityOut} ${r.unit || ''}`,
      r.warehouseName || '',
      r.businessType || '',
      r.operatorName || '',
      r.remarks || '',
    ]),
    styles: { font: 'helvetica', fontSize: 7 }, // 纯英文/数字 OK；中文需嵌入字体
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`outbound-${new Date().toISOString().slice(0, 10)}.pdf`);
}
```

**注**：jspdf 默认 Helvetica **不支持中文**。如需中文支持，嵌入思源黑体子集（+3MB）。本设计文档 14 节已记录此风险。本任务先实现英文版（数据用拼音/key 也能读），中文支持作为"已知限制"在 spec 风险表已记录。

**Commit**：`feat(inventory): 前端 PDF 导出工具 (jspdf)`

---

### 阶段 6：主页面 + 路由（F7 + F8 + F9）

#### Task 6.1：OutboundRecordsPage.tsx

**文件**：`src/pages/OutboundRecordsPage.tsx`（新）

**骨架**：
```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { getOutboundRecords, exportOutbound, OutboundRow, OutboundSummary } from '@/services/inventoryTransactionService';
import { OutboundRecordsStats } from '@/components/farm/inventory/OutboundRecordsStats';
import { OutboundRecordsStockTypeCards } from '@/components/farm/inventory/OutboundRecordsStockTypeCards';
import { OutboundRecordsFilter } from '@/components/farm/inventory/OutboundRecordsFilter';
import { OutboundRecordsTable } from '@/components/farm/inventory/OutboundRecordsTable';
import { InventoryDetailModal } from '@/components/farm/inventory/InventoryDetailModal';
import { exportOutboundPDF } from '@/utils/pdfExporter';

function getThisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export default function OutboundRecordsPage() {
  // 默认本月（useEffect 同步设值，避免 400）
  const [query, setQuery] = useState(() => ({ ...getThisMonthRange(), page: 1, limit: 50 }));
  const [rows, setRows] = useState<OutboundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<OutboundSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailStock, setDetailStock] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const toast = useToast();

  // 首次加载
  useEffect(() => { loadData(); }, [query]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getOutboundRecords(query);
      setRows(data.rows);
      setTotal(data.total);
      setSummary(data.summary);
    } catch (e: any) {
      toast.error('加载失败：' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 导出（CSV/XLSX 走后端，PDF 走前端）
  async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
    try {
      if (format === 'pdf') {
        if (rows.length > 2000) {
          toast.error(`PDF 最多 2000 行（当前 ${total}），请缩小时间范围或用 XLSX`);
          return;
        }
        exportOutboundPDF(rows, summary);
        toast.success('PDF 下载已开始');
      } else {
        await exportOutbound(query, format);
        toast.success(`${format.toUpperCase()} 下载已开始`);
      }
    } catch (e: any) {
      toast.error('导出失败：' + e.message);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          📋 出库记录
        </h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')}>📥 CSV</button>
          <button onClick={() => handleExport('xlsx')}>📥 XLSX</button>
          <button onClick={() => handleExport('pdf')}>📥 PDF</button>
        </div>
      </div>

      <OutboundRecordsStats stats={summary} loading={loading} />
      <OutboundRecordsStockTypeCards byStockType={summary?.byStockType || {}} />
      <OutboundRecordsFilter value={query} onChange={setQuery} onReset={...} />
      <OutboundRecordsTable
        data={rows}
        loading={loading}
        pagination={{ current: query.page, pageSize: query.limit }}
        onChange={p => setQuery(q => ({ ...q, page: p.current, limit: p.pageSize }))}
        onViewDetail={(row) => { setDetailStock({ instanceId: row.instanceId }); setDetailOpen(true); }}
      />

      <InventoryDetailModal
        isOpen={detailOpen}
        stock={detailStock}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
```

**Commit**：`feat(inventory): 出库记录主页面 OutboundRecordsPage`

---

#### Task 6.2：路由 + 菜单

**F8 Sidebar.tsx**：在 `cropSubItems` 数组里加一项。
```ts
{ icon: FileDown, label: '出库记录', path: '/crop/outbound-records' },
```
位置：在"作物库存"之后。

**F9 App.tsx**：加路由。
```tsx
<Route path="/crop/outbound-records" element={<OutboundRecordsPage />} />
```

**Commit**：`feat(inventory): 加出库记录路由和菜单`

---

### 阶段 7：端到端验证（10 轮次手动）

#### Task 7.1：10 轮次验证

**前置**：V1.1 后端已重启（PID 29356）跑新代码；前端 `npm run dev` 启动；浏览器 `Ctrl+Shift+R` 硬刷。

**验证步骤**：

```bash
# 1. seed 测试数据
cd D:/TMcrop/yuanxingtu/V1.1
npx tsx scripts/seedOutboundFixtures.ts
# 预期：✅ 完成。出库流水总数: ~1000+

# 2. 浏览器访问 http://localhost:5188/crop/outbound-records
#    预期：左侧菜单"出库记录"出现，点击进入页面

# 3. 默认本月：列表显示当月数据
# 4. 改时间范围为 2026-01-01 ~ 2026-06-30：列表+统计实时刷新
# 5. 选库存类型=成品：列表过滤
# 6. 输入品种"番茄"：模糊匹配
# 7. 选业务类型=采收：列表过滤
# 8. 导出 CSV：文件下载，行数对得上
# 9. 导出 XLSX：Excel 打开，多 sheet
# 10. 导出 PDF（<2000 行）：浏览器预览

# 边界测试：
# 11. 删 1 条 stock → 该条详情显示「已删除」（LEFT JOIN null）
# 12. 时间范围 > 1 年：PDF 按钮禁用，CSV/XLSX 可用
# 13. 改 from > to：提示「开始日期不能晚于结束日期」
# 14. 空数据：EmptyState + 「重置筛选」按钮
# 15. 点实例ID：弹详情 + 19 列对齐
```

**每个验证项**记录到 `docs/superpowers/plans/2026-06-04-outbound-records-verification.md`（执行人填写）。

**Commit**：`docs: 出库记录 10 轮次端到端验证报告`（验证完成后）

---

### 阶段 8：测试 + Commit + Push（T1）

#### Task 8.1：前端 5 轮 Vitest 测试

**文件**：`src/__tests__/outboundRecords.test.ts`（新）

**测试用例**：

```ts
import { describe, it, expect, vi } from 'vitest';
import { getThisMonthRange, formatQuery, parseCSVHeader } from '../utils/outboundHelpers';

describe('getThisMonthRange', () => {
  it('返回本月 1 号到今天', () => {
    const { from, to } = getThisMonthRange();
    const now = new Date();
    const expectedFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const expectedTo = now.toISOString().slice(0, 10);
    expect(from).toBe(expectedFrom);
    expect(to).toBe(expectedTo);
  });
});

describe('outbound query formatting', () => {
  it('空值不传', () => {
    const q = { from: '2026-06-01', to: '2026-06-30' };
    expect(formatQuery(q)).toEqual({ from: '2026-06-01', to: '2026-06-30' });
  });

  it('驼峰转蛇形', () => {
    const q = { from: '2026-06-01', to: '2026-06-30', stockType: 'product', operatorName: '张三' };
    expect(formatQuery(q)).toEqual({
      from: '2026-06-01', to: '2026-06-30',
      stock_type: 'product', operator_name: '张三',
    });
  });
});
```

**Commit**：`test(inventory): 出库记录前端单元测试 (5 轮)`

---

#### Task 8.2：最终 build + 推送

```bash
cd D:/TMcrop/yuanxingtu/V1.1
npx tsc --noEmit              # 0 errors
npm run build                 # 0 errors
git add .
git commit -m "feat(inventory): 出库记录独立页面 + 10 维筛选 + 3 种导出"
git push
```

**Commit**（最终聚合 commit）。

---

## 3. 工作量拆解（按阶段）

| 阶段 | 任务 | 行数 | 估计时间 |
|---|---|---|---|
| 1: DB 索引 | 1.1 | +20 | 0.5h |
| 2: Repository + Service | 2.1 / 2.2 / 2.3 | +530 | 3h |
| 3: API 端点 + 导出工具 | 3.1 / 3.2 / 3.3 | +240 | 3h |
| 4: Seed 脚本 | 4.1 | +120 | 1h |
| 5: 前端 Service + 组件 | 5.1 / 5.2 / 5.3 | +1000 | 6h |
| 6: 主页面 + 路由 | 6.1 / 6.2 | +310 | 2h |
| 7: 端到端验证 | 7.1 | — | 2h |
| 8: 测试 + 推送 | 8.1 / 8.2 | +220 | 1.5h |
| **合计** | 22 任务 | **~2440 行** | **~19h ≈ 2.5 天** |

---

## 4. 风险与回退

| 风险 | 应对 |
|---|---|
| 后端 tsx watch 没 reload | 提醒用户 Ctrl+C 重启 `npm run dev`（在 Task 7.1 前） |
| PDF 中文乱码 | 已知限制（设计文档 14 节）；如必要后期嵌入字体（+3MB） |
| 1000 条 seed 太慢 | 用 `INSERT OR IGNORE` 批量；考虑事务包裹 |
| 出库流水表很大（> 10 万行） | 加 LIMIT 100000 截断（Task 3.3 路由层） |
| 菜单菜单位置不合适 | 评审时移到"生产汇总表"下也行（用户确认是作物管理下） |

---

## 5. 验证清单（任务执行 checklist）

每个任务完成后**逐项打勾**：

- [ ] Task 1.1：3 个索引创建成功
- [ ] Task 2.1：Repository 编译通过
- [ ] Task 2.2：Service 编译通过
- [ ] Task 2.3：5 个 vitest 全过
- [ ] Task 3.1：CSV 导出函数可调用
- [ ] Task 3.2：XLSX 导出 buffer 非空
- [ ] Task 3.3：3 个端点 curl 测试通过
- [ ] Task 4.1：seed 完成，DB 有 1000+ 条
- [ ] Task 5.1：service 编译通过
- [ ] Task 5.2：4 个组件渲染无错
- [ ] Task 5.3：PDF 函数能调用
- [ ] Task 6.1：主页面挂载无错
- [ ] Task 6.2：菜单 + 路由生效
- [ ] Task 7.1：10 轮次端到端通过
- [ ] Task 8.1：5 个前端测试全过
- [ ] Task 8.2：tsc + build + push 完成

---

**计划已就绪。等用户批准后按 Task 顺序执行。**
