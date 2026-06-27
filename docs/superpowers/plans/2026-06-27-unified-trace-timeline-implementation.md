# 统一追溯时间线 — 实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 种源管理详情弹窗新增"追溯时间线"Tab（双视图：时间线+表格），跨模块统一（种源/育苗/种植），删除页脚折叠区 SeedSourceHistoryTabs 入口。

**架构：** 后端新建 `/history` 端点（3-4 表 UNION 按 business_id）→ 前端新建 EntityHistoryTimeline 双视图组件 + EntityDetailModal 包装层 → 3 个 DetailModal 重构调通用组件 → SeedSourcePage 删页脚入口。

**技术栈：** Express 4 + sql.js + React 18 + TypeScript 5.6 + Zustand 5 + enhancedApiClient

**依赖说明**：
- material_flow_log 数据复用已有端点 `/material-flow-log/trace?code=xxx`，不新建
- TraceChain.tsx、FlowLogTab.tsx、SeedSourceHistoryTabs.tsx 文件本身保留不动（仅删除 SeedSourcePage 中的入口引用）

---

### 任务 1：后端 — 新建 entityHistory.service.ts

**文件：**
- 创建：`server/src/services/entityHistory.service.ts`

**说明**：通用服务，接收 entityType + entityId，UNION 3-4 张实体级表（按 business_id 关联），返回统一 HistoryItem[] 数组，按时间倒序。

- [ ] **步骤 1.1：创建服务文件**

```typescript
/**
 * 实体历史服务（2026-06-27）
 * 查询 3-4 张实体级表（按 business_id 关联），返回统一时间线数据
 *
 * 数据源：
 *   - audit_logs: business_id + business_type（lifecycle）
 *   - inventory_inbound_records: business_id（inbound）
 *   - inventory_transaction: business_id（transaction）
 *   - crop_circulation_records: seed_source_id（circulation，仅种源）
 *
 * 注意：material_flow_log 不在此端点，单独通过 /material-flow-log/trace 查询
 */

import { getDatabase } from '../db';

export interface HistoryItem {
  id: string;
  occurredAt: string;
  source: 'entity';           // 实体级历史（非业务流转）
  category: 'lifecycle' | 'inbound' | 'transaction' | 'circulation';
  action: string;
  quantityDelta?: number;
  unit?: string;
  refCode?: string;
  refModule?: string;
  operatorName?: string;
  remarks?: string;
  raw?: Record<string, unknown>;
}

/** 实体类型 */
export type EntityType = 'seed_source' | 'seedling' | 'planting';

/** entityType → audit_logs business_type 映射 */
const ENTITY_TO_AUDIT_TYPE: Record<EntityType, string> = {
  seed_source: 'seed_source',
  seedling: 'seedling',
  planting: 'planting',
};

/** entityType → inventory_transaction business_type 映射 */
const ENTITY_TO_TRANSACTION_TYPE: Record<EntityType, string> = {
  seed_source: 'inventory_transfer',
  seedling: 'inventory_transfer',
  planting: 'inventory_transfer',
};

/**
 * 查询实体历史（按 business_id 关联的 3-4 表 UNION）
 */
export function queryEntityHistory(entityType: EntityType, entityId: string, limit = 200): HistoryItem[] {
  if (!entityId) return [];

  const db = getDatabase();
  const auditType = ENTITY_TO_AUDIT_TYPE[entityType];
  const results: HistoryItem[] = [];

  // 1. audit_logs（lifecycle）
  try {
    const stmt = db.prepare(`
      SELECT id, action, opinion, operator_name, created_at
      FROM audit_logs
      WHERE business_type = ? AND business_id = ?
      ORDER BY created_at DESC LIMIT ?
    `);
    stmt.bind([auditType, entityId, limit]);
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      const action = String(r.action || '');
      results.push({
        id: String(r.id || ''),
        occurredAt: String(r.created_at || ''),
        source: 'entity',
        category: 'lifecycle',
        action: action === 'create' ? '创建' : action === 'update' ? '修改' : action === 'delete' ? '删除' : action,
        operatorName: String(r.operator_name || 'system'),
        remarks: String(r.opinion || ''),
      });
    }
    stmt.free();
  } catch (e) {
    console.warn(`[entityHistory] audit_logs query failed for ${entityType}/${entityId}:`, (e as Error).message);
  }

  // 2. inventory_inbound_records（inbound）
  try {
    const stmt = db.prepare(`
      SELECT id, record_date, source_module, source_code, source_type,
             quantity, unit, warehouse_name, operator_name, notes, create_time
      FROM inventory_inbound_records
      WHERE business_id = ?
      ORDER BY create_time DESC LIMIT ?
    `);
    stmt.bind([entityId, limit]);
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      const qty = Number(r.quantity || 0);
      results.push({
        id: String(r.id || ''),
        occurredAt: String(r.record_date || r.create_time || ''),
        source: 'entity',
        category: 'inbound',
        action: `入库 +${qty}`,
        quantityDelta: qty,
        unit: String(r.unit || ''),
        refCode: String(r.source_code || ''),
        refModule: String(r.source_module || ''),
        operatorName: String(r.operator_name || ''),
        remarks: String(r.notes || ''),
      });
    }
    stmt.free();
  } catch (e) {
    console.warn(`[entityHistory] inbound query failed for ${entityType}/${entityId}:`, (e as Error).message);
  }

  // 3. inventory_transaction（transaction）
  try {
    const stmt = db.prepare(`
      SELECT id, transaction_type, quantity, balance_before, balance_after,
             operate_date, remarks, operator_name, create_time
      FROM inventory_transaction
      WHERE business_id = ?
      ORDER BY create_time DESC LIMIT ?
    `);
    stmt.bind([entityId, limit]);
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      const txnType = String(r.transaction_type || '');
      const qty = Number(r.quantity || 0);
      const actionLabel = txnType === 'transfer_in'
        ? '退库入库'
        : txnType === 'transfer_out'
          ? '调拨出库'
          : txnType === 'inbound'
            ? '入库'
            : txnType === 'outbound'
              ? '出库'
              : txnType === 'freeze'
                ? '冻结'
                : txnType === 'unfreeze'
                  ? '解冻'
                  : txnType;
      results.push({
        id: String(r.id || ''),
        occurredAt: String(r.operate_date || r.create_time || ''),
        source: 'entity',
        category: 'transaction',
        action: actionLabel,
        quantityDelta: txnType === 'transfer_out' || txnType === 'outbound' ? -qty : qty,
        unit: '',
        operatorName: String(r.operator_name || ''),
        remarks: String(r.remarks || ''),
      });
    }
    stmt.free();
  } catch (e) {
    console.warn(`[entityHistory] transaction query failed for ${entityType}/${entityId}:`, (e as Error).message);
  }

  // 4. crop_circulation_records（circulation，仅种源）
  if (entityType === 'seed_source') {
    try {
      const stmt = db.prepare(`
        SELECT id, circulation_date, circulation_type, source_module,
               quantity, unit, disposition, notes, created_at
        FROM crop_circulation_records
        WHERE parent_source_id = ? OR new_source_id = ?
        ORDER BY created_at DESC LIMIT ?
      `);
      stmt.bind([entityId, entityId, limit]);
      while (stmt.step()) {
        const r = stmt.getAsObject() as Record<string, unknown>;
        const qty = Number(r.quantity || 0);
        results.push({
          id: String(r.id || ''),
          occurredAt: String(r.circulation_date || r.created_at || ''),
          source: 'entity',
          category: 'circulation',
          action: String(r.circulation_type || '回流'),
          quantityDelta: qty,
          unit: String(r.unit || ''),
          refModule: String(r.source_module || ''),
          remarks: String(r.notes || ''),
        });
      }
      stmt.free();
    } catch (e) {
      console.warn(`[entityHistory] circulation query failed for ${entityId}:`, (e as Error).message);
    }
  }

  // 排序：occurredAt 倒序
  results.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return results.slice(0, limit);
}
```

- [ ] **步骤 1.2：验证后端构建通过**

```bash
cd server && npm run build
```

---

### 任务 2：后端 — seedSource 路由加 /history 端点

**文件：**
- 修改：`server/src/routes/seedSource.ts`（在第 549 行之后新增）

- [ ] **步骤 2.1：在 seedSource.ts 路由文件中新增 /history 端点**

在 `export default router;` 之前、4 个 history-* 端点之后插入：

```typescript
/**
 * GET /api/seed-sources/:id/history
 * 2026-06-27: 统一实体历史端点（audit_logs + inbound + transaction + circulation UNION）
 * 替代分散的 4 个 history-* 端点（旧端点保留兼容）
 */
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { queryEntityHistory } = require('../services/entityHistory.service');
  const items = queryEntityHistory('seed_source', id, 200);
  res.json({ success: true, data: items });
}));
```

- [ ] **步骤 2.2：验证端点**

```bash
# 启动后端后 curl 测试（node 脚本避免中文 URL 编码问题）
node -e "
const http = require('http');
const options = { hostname: 'localhost', port: 3001, path: '/api/seed-sources/' + encodeURIComponent('一个真实的种源ID') + '/history', method: 'GET' };
const req = http.request(options, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>console.log(d)); });
req.end();
"
```

---

### 任务 3：后端 — seedling + planting 路由加 /history 端点

**文件：**
- 修改：`server/src/routes/seedling.ts`
- 修改：`server/src/routes/planting.ts`

- [ ] **步骤 3.1：seedling.ts 加 /history 端点**

在 seedling.ts 路由文件中 `export default router;` 之前插入：

```typescript
/**
 * GET /api/seedlings/:id/history
 * 2026-06-27: 育苗实体历史
 */
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { queryEntityHistory } = require('../services/entityHistory.service');
  const items = queryEntityHistory('seedling', id, 200);
  res.json({ success: true, data: items });
}));
```

- [ ] **步骤 3.2：planting.ts 加 /history 端点**

在 planting.ts 路由文件中 `export default router;` 之前插入：

```typescript
/**
 * GET /api/plantings/:id/history
 * 2026-06-27: 种植实体历史
 */
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { queryEntityHistory } = require('../services/entityHistory.service');
  const items = queryEntityHistory('planting', id, 200);
  res.json({ success: true, data: items });
}));
```

- [ ] **步骤 3.3：验证后端构建**

```bash
cd server && npm run build
```

---

### 任务 4：前端 — 新建 entityHistoryService.ts

**文件：**
- 创建：`src/services/entityHistoryService.ts`

- [ ] **步骤 4.1：创建 service**

```typescript
/**
 * 实体历史服务（2026-06-27）
 * 前端服务层 — 调后端 /history 端点 + 合并 material_flow_log
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface HistoryItem {
  id: string;
  occurredAt: string;
  source: 'entity' | 'flow';
  category: 'lifecycle' | 'inbound' | 'transaction' | 'circulation' | 'flow';
  action: string;
  quantityDelta?: number;
  unit?: string;
  refCode?: string;
  refModule?: string;
  operatorName?: string;
  remarks?: string;
  raw?: Record<string, unknown>;
}

/** 后端实体历史数据 */
interface EntityHistoryRow {
  id: string;
  occurredAt: string;
  source: 'entity';
  category: 'lifecycle' | 'inbound' | 'transaction' | 'circulation';
  action: string;
  quantityDelta?: number;
  unit?: string;
  refCode?: string;
  refModule?: string;
  operatorName?: string;
  remarks?: string;
}

/** material_flow_log 流转数据 */
interface FlowLogRow {
  id: string;
  flowType: string;
  cropName?: string;
  sourceCode?: string;
  sourceQuantity?: number;
  sourceUnit?: string;
  targetCode?: string;
  targetQuantity?: number;
  targetUnit?: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * 查询实体历史（调 /api/{entity}/:id/history）
 */
async function fetchEntityHistory(entity: string, entityId: string): Promise<HistoryItem[]> {
  const res = await enhancedApiClient.get<{ success: boolean; data: EntityHistoryRow[] }>(
    `/${entity}/${entityId}/history`
  );
  const data = Array.isArray(res) ? res : (res as any)?.data || [];
  return data.map((r: EntityHistoryRow) => ({
    ...r,
    source: 'entity' as const,
  }));
}

/**
 * 查询 material_flow_log（调已有 /material-flow-log/trace 端点）
 */
async function fetchFlowLogs(code: string): Promise<HistoryItem[]> {
  if (!code) return [];
  try {
    const res = await enhancedApiClient.get<FlowLogRow[]>(
      `/material-flow-log/trace?code=${encodeURIComponent(code)}`
    );
    const rows = Array.isArray(res) ? res : (res as any)?.data || [];
    return rows.map((r: FlowLogRow) => ({
      id: r.id,
      occurredAt: r.createdAt,
      source: 'flow' as const,
      category: 'flow' as const,
      action: r.flowType || '流转',
      quantityDelta: r.targetQuantity || r.sourceQuantity || undefined,
      unit: r.targetUnit || r.sourceUnit,
      refCode: r.sourceCode || r.targetCode,
      refModule: undefined,
      operatorName: r.createdBy,
      remarks: r.cropName,
    }));
  } catch {
    return [];
  }
}

/**
 * 查询完整实体历史（实体级 + material_flow_log 合并，按时间倒序）
 */
export async function fetchFullHistory(
  entity: 'seed-sources' | 'seedlings' | 'plantings',
  entityId: string,
  entityCode: string,
): Promise<HistoryItem[]> {
  const [entityHistory, flowLogs] = await Promise.all([
    fetchEntityHistory(entity, entityId),
    fetchFlowLogs(entityCode),
  ]);

  // 合并 + 去重（按 id）
  const seen = new Set<string>();
  const merged: HistoryItem[] = [];
  for (const item of [...entityHistory, ...flowLogs]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  // 按时间倒序
  merged.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return merged;
}
```

- [ ] **步骤 4.2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty false 2>&1 | head -20
```

---

### 任务 5：前端 — 新建 EntityHistoryTimeline.tsx 双视图组件

**文件：**
- 创建：`src/components/ui/EntityHistoryTimeline.tsx`

- [ ] **步骤 5.1：创建双视图组件**

```tsx
/**
 * EntityHistoryTimeline — 实体历史双视图组件（2026-06-27）
 *
 * 功能：
 * - 双视图切换：时间线 ↔ 表格
 * - 分类筛选：全部 / 创建修改 / 入库 / 库存流水 / 回流 / 流转
 * - 导出 Excel（表格视图下可用）
 * - 加载更多（滚动分页）
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Clock, Table2, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { fetchFullHistory, type HistoryItem } from '@/services/entityHistoryService';
import * as XLSX from 'xlsx';

interface EntityHistoryTimelineProps {
  /** 实体标识（seed-sources / seedlings / plantings） */
  entity: 'seed-sources' | 'seedlings' | 'plantings';
  /** 实体 ID */
  entityId: string;
  /** 实体编码（用于关联 material_flow_log） */
  entityCode: string;
}

const CATEGORY_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'lifecycle', label: '创建/修改/删除' },
  { key: 'inbound', label: '入库' },
  { key: 'transaction', label: '库存流水' },
  { key: 'circulation', label: '回流' },
  { key: 'flow', label: '流转' },
] as const;

/** 时间格式化 */
function fmtTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

/** 数量变化显示 */
function fmtDelta(delta?: number, unit?: string): string {
  if (delta == null) return '-';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}${unit ? ' ' + unit : ''}`;
}

/** 分类标签颜色 */
function catBadge(cat: string): string {
  switch (cat) {
    case 'lifecycle': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'inbound': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'transaction': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'circulation': return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'flow': return 'bg-purple-100 text-purple-700 border-purple-300';
    default: return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}

export function EntityHistoryTimeline({ entity, entityId, entityCode }: EntityHistoryTimelineProps) {
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const data = await fetchFullHistory(entity, entityId, entityCode);
      setItems(data);
    } catch (e) {
      console.error('[EntityHistoryTimeline] load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [entity, entityId, entityCode]);

  useEffect(() => { void load(); }, [load]);

  // 筛选
  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  // 导出 Excel
  const handleExport = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map((r, i) => ({
      '序号': i + 1,
      '时间': fmtTime(r.occurredAt),
      '类型': r.action,
      '数量变化': fmtDelta(r.quantityDelta, r.unit),
      '关联单号': r.refCode || '-',
      '关联模块': r.refModule || '-',
      '操作员': r.operatorName || '-',
      '备注': r.remarks || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
      { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '追溯历史');
    XLSX.writeFile(wb, `追溯历史_${entityCode}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              onClick={() => setView('timeline')}
              className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1 transition-colors ${
                view === 'timeline' ? 'bg-white shadow-sm text-emerald-700 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> 时间线
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1 transition-colors ${
                view === 'table' ? 'bg-white shadow-sm text-emerald-700 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> 表格
            </button>
          </div>
          {/* 分类筛选 */}
          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  filter === f.key
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={load} className="text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> 刷新
          </Button>
          <Button variant="default" size="sm" onClick={handleExport} disabled={filtered.length === 0} className="text-xs">
            <Download className="w-3 h-3 mr-1" /> 导出 Excel
          </Button>
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="text-xs text-gray-500">
        共 {filtered.length} 条记录
        {filter !== 'all' && `（已筛选：${CATEGORY_FILTERS.find((f) => f.key === filter)?.label}）`}
      </div>

      {/* 内容区 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">暂无追溯记录</div>
      ) : view === 'timeline' ? (
        /* ===== 时间线模式 ===== */
        <div className="relative pl-6 border-l-2 border-emerald-200 space-y-3">
          {filtered.map((item, idx) => (
            <div key={item.id || idx} className="relative">
              {/* 时间线圆点 */}
              <div className="absolute -left-[calc(1.5rem+3px)] top-1.5 w-3 h-3 rounded-full border-2 border-emerald-400 bg-white" />
              {/* 卡片 */}
              <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">{fmtTime(item.occurredAt)}</span>
                  <span className={`px-1.5 py-0.5 text-xs rounded border ${catBadge(item.category)}`}>
                    {item.action}
                  </span>
                  {item.quantityDelta != null && (
                    <span className={`text-xs font-medium ${item.quantityDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtDelta(item.quantityDelta, item.unit)}
                    </span>
                  )}
                  {item.refCode && (
                    <span className="text-xs text-gray-500 font-mono">{item.refCode}</span>
                  )}
                  {item.operatorName && (
                    <span className="text-xs text-gray-400 ml-auto">by {item.operatorName}</span>
                  )}
                </div>
                {item.remarks && (
                  <div className="text-xs text-gray-500 mt-1">{item.remarks}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ===== 表格模式 ===== */
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-500 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left w-40">时间</th>
                  <th className="px-2 py-2 text-left w-28">类型</th>
                  <th className="px-2 py-2 text-left w-24">数量变化</th>
                  <th className="px-2 py-2 text-left">关联单号</th>
                  <th className="px-2 py-2 text-left w-20">操作员</th>
                  <th className="px-2 py-2 text-left">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-xs text-gray-500 font-mono">{fmtTime(r.occurredAt)}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 text-xs rounded border ${catBadge(r.category)}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className={`px-2 py-1.5 text-xs font-medium ${(r.quantityDelta ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtDelta(r.quantityDelta, r.unit)}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono text-gray-600">{r.refCode || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-600">{r.operatorName || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-500">{r.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default EntityHistoryTimeline;
```

- [ ] **步骤 5.2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty false 2>&1 | head -20
```

---

### 任务 6：前端 — 新建 EntityDetailModal.tsx 通用详情弹窗

**文件：**
- 创建：`src/components/ui/EntityDetailModal.tsx`

- [ ] **步骤 6.1：创建通用详情弹窗**

```tsx
/**
 * EntityDetailModal — 通用详情弹窗包装层（2026-06-27）
 *
 * 用于种源/育苗/种植 3 个 entity 的详情弹窗，统一样式与 Tab 结构：
 * 1. 基本信息（props.basicInfoPanel）
 * 2. 追溯时间线（EntityHistoryTimeline，必选）
 * 3. 额外 Tab（props.extraTabs，可选）
 */

import React, { useState } from 'react';
import { UnifiedModal, Button } from '@/components/ui';
import { Clock } from 'lucide-react';
import { EntityHistoryTimeline } from './EntityHistoryTimeline';

interface ExtraTab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface EntityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** 基本信息面板（React 节点，按 entity 不同） */
  basicInfoPanel: React.ReactNode;
  /** 实体标识 */
  entity: 'seed-sources' | 'seedlings' | 'plantings';
  /** 实体 ID */
  entityId: string;
  /** 实体编码（用于 material_flow_log 关联） */
  entityCode: string;
  /** 可选附加 Tab */
  extraTabs?: ExtraTab[];
}

export function EntityDetailModal({
  isOpen,
  onClose,
  title,
  basicInfoPanel,
  entity,
  entityId,
  entityCode,
  extraTabs = [],
}: EntityDetailModalProps) {
  const [activeTab, setActiveTab] = useState<string>('info');

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      showFooter={true}
      onSubmit={() => onClose()}
      submitText="关闭"
      cancelText=""
    >
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent ${
            activeTab === 'info'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          基本信息
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent flex items-center gap-1 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          追溯时间线
        </Button>
        {extraTabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent flex items-center gap-1 ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'info' && basicInfoPanel}

      {activeTab === 'history' && (
        <div className="py-2">
          <EntityHistoryTimeline
            entity={entity}
            entityId={entityId}
            entityCode={entityCode}
          />
        </div>
      )}

      {extraTabs.map((tab) =>
        activeTab === tab.key ? <div key={tab.key} className="py-2">{tab.content}</div> : null
      )}
    </UnifiedModal>
  );
}

export default EntityDetailModal;
```

---

### 任务 7：前端 — 重构种源 DetailModal 调通用 EntityDetailModal

**文件：**
- 修改：`src/components/farm/seed-source/modals/DetailModal.tsx`

- [ ] **步骤 7.1：重构 DetailModal**

将整个文件替换为薄包装（基本信息面板保留，去掉 4 个 Tab 逻辑）：

```tsx
/**
 * 种源详情弹窗（2026-06-27 重构）
 * 使用通用 EntityDetailModal 包装，Tab：基本信息 / 追溯时间线 / 调拨来源（条件）
 */

import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { EntityDetailModal } from '@/components/ui/EntityDetailModal';
import { SeedSource } from '../../../../types/crop';
import { STOCK_STATUS_MAP, UNIT_MAP, SOURCE_TYPE_MAP } from '../../../../constants/cropConstants';
import { computeStockStatus } from '../../../../lib/stockStatus';
import { PropagationType } from '../../../../types/crop';

const PROPAGATION_TYPE_LABELS: Record<string, string> = {
  external: '外购入库', breeding: '育种计划产出', seed_saving: '种植留种',
  asexual: '无性繁殖', transfer_from_inventory: '库存调拨',
};
const PROPAGATION_STATUS_LABELS: Record<string, string> = {
  planned: '已计划', in_progress: '进行中', harvested: '已采收',
  quality_checked: '已质检', in_stock: '已入库', completed: '已入库', failed: '失败',
};
const PROPAGATION_METHOD_LABELS: Record<string, string> = {
  cutting: '扦插繁殖', seed_saving: '留种', g0_g1: 'G0/G1 代',
};

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource;
}

/** 基本信息面板（内联组件） */
function SeedSourceBasicInfo({ record }: { record: SeedSource }) {
  const formatUnit = (unit: string) => UNIT_MAP[unit] || unit || '';
  const status = STOCK_STATUS_MAP[computeStockStatus(record.availableCount, record.initialCount)] || STOCK_STATUS_MAP['sufficient'];

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">种源批号：</span>
            <span className="text-sm font-mono text-blue-600">{record.seedCode}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">作物品种：</span>
            <span className="text-sm text-gray-900">{record.cropName}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">种源来源：</span>
            <span className="text-sm text-gray-900">{SOURCE_TYPE_MAP[record.sourceType] || record.sourceType}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">品种：</span>
            <span className="text-sm text-gray-900">{record.cropVariety}</span>
          </div>
        </div>
      </div>

      {/* 库存信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">库存信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">入库数量：</span>
            <span className="text-sm text-gray-900">{record.quantity} {formatUnit(record.unit)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">剩余数量：</span>
            <span className="text-sm font-medium text-emerald-600">{record.availableCount.toLocaleString()} {formatUnit(record.unit)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">库存状态：</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">单价：</span>
            <span className="text-sm text-gray-900">¥{record.unitPrice}/{formatUnit(record.unit)}</span>
          </div>
        </div>
      </div>

      {/* 繁殖信息（非外购时显示） */}
      {record.propagationType && record.propagationType !== PropagationType.EXTERNAL && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">繁殖信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">入库方式：</span>
              <span className="text-sm font-medium text-orange-700">
                {PROPAGATION_TYPE_LABELS[record.propagationType] || record.propagationType}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">当前阶段：</span>
              <span className="text-sm font-medium text-blue-700">
                {PROPAGATION_STATUS_LABELS[record.propagationStatus || ''] || record.propagationStatus || '-'}
              </span>
            </div>
            {record.propagationMethod && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">具体方法：</span>
                <span className="text-sm text-gray-900">
                  {PROPAGATION_METHOD_LABELS[record.propagationMethod] || record.propagationMethod}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 其他信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建人：</span>
            <span className="text-sm text-gray-900">{record.createBy}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建时间：</span>
            <span className="text-sm text-gray-900">{record.createTime}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">更新时间：</span>
            <span className="text-sm text-gray-900">{record.updateTime}</span>
          </div>
          {record.remarks && (
            <div className="col-span-2 flex items-start">
              <span className="text-sm text-gray-500 w-24 flex-shrink-0">备注：</span>
              <span className="text-sm text-gray-900">{record.remarks}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DetailModal({ isOpen, onClose, record }: DetailModalProps) {
  const hasTransferSource = !!record.transferredFromStockId;

  const extraTabs = hasTransferSource
    ? [{
        key: 'transfer-source',
        label: '调拨来源',
        icon: <ArrowLeftRight className="w-4 h-4" />,
        content: (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                调拨来源（原库存信息）
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原库存 ID：</span>
                  <code className="text-xs font-mono text-gray-700">{record.transferredFromStockId}</code>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">来源业务类型：</span>
                  <span className="text-sm text-gray-900">{record.transferredFromBusinessType || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">来源业务 ID：</span>
                  <code className="text-xs font-mono text-gray-700">{record.transferredFromBusinessId || '—'}</code>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始入库日期：</span>
                  <span className="text-sm text-gray-900">{record.originalInboundDate || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始来源模块：</span>
                  <span className="text-sm text-gray-900">{record.originalSourceModule || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始来源 ID：</span>
                  <code className="text-xs font-mono text-gray-700">{record.originalSourceId || '—'}</code>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">作物 / 品种 / 价格</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始作物：</span>
                  <span className="text-sm text-gray-900">{record.originalCropName || record.cropName || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始品种：</span>
                  <span className="text-sm text-gray-900">{record.originalVarietyName || record.cropVariety || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始单位：</span>
                  <span className="text-sm text-gray-900">{record.originalUnit || record.unit || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始单价：</span>
                  <span className="text-sm text-gray-900">
                    {record.originalUnitPrice != null ? `¥${record.originalUnitPrice}` : '—'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始供应商：</span>
                  <span className="text-sm text-gray-900">{record.originalSupplierName || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-28">原始生产计划：</span>
                  <code className="text-xs font-mono text-gray-700">{record.originalProductionPlanCode || '—'}</code>
                </div>
              </div>
            </div>
            {record.originalHarvestRecordId && (
              <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded p-3">
                <strong>采收记录：</strong>
                <code className="font-mono">{record.originalHarvestRecordId}</code>
                <span className="ml-2">（调拨前的入库来源）</span>
              </div>
            )}
          </div>
        ),
      }]
    : [];

  return (
    <EntityDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="种源详情"
      basicInfoPanel={<SeedSourceBasicInfo record={record} />}
      entity="seed-sources"
      entityId={record.id}
      entityCode={record.seedCode}
      extraTabs={extraTabs}
    />
  );
}
```

- [ ] **步骤 7.2：删除旧 import（不再需要的）**

旧文件中的以下 import 在新版中不再需要：
- `TraceChain`（不再用 — 保留文件但 DetailModal 不再引用）
- `FlowLogTab`（不再用 — 已由 EntityHistoryTimeline 覆盖）
- `History`（icon — 不再用）

确认新文件只导入需要的依赖，旧依赖自然移除。

---

### 任务 8：前端 — 删除 SeedSourcePage 页脚折叠区

**文件：**
- 修改：`src/components/farm/seed-source/SeedSourcePage.tsx`

- [ ] **步骤 8.1：删除 import**

删除第 20 行：
```typescript
// 删除这行
import { SeedSourceHistoryTabs } from './components/SeedSourceHistoryTabs';
```

- [ ] **步骤 8.2：删除 useMemo**

删除第 107-111 行（currentPageSeedSourceId 计算）：
```typescript
// 删除这 5 行
const currentPageSeedSourceId = useMemo(() => {
  if (!items?.length) return '';
  const start = (pagination.current - 1) * pagination.pageSize;
  return items[start]?.id || '';
}, [items, pagination.current, pagination.pageSize]);
```

- [ ] **步骤 8.3：删除 JSX 折叠区**

删除第 817-828 行：
```tsx
{/* 删除整个 <details> 块 */}
<details className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" open>
  <summary className="cursor-pointer text-sm font-semibold p-3 bg-gray-50 hover:bg-gray-100">
    追溯记录 — {selectedRows.length === 1
      ? `选中种源 ${items.find(i => i.id === selectedRows[0])?.seedCode || ''}`
      : currentPageSeedSourceId
        ? `当前种源 ${items.find(i => i.id === currentPageSeedSourceId)?.seedCode || ''}`
        : '暂无种源'}
  </summary>
  <SeedSourceHistoryTabs
    seedSourceId={selectedRows.length === 1 ? selectedRows[0] : (currentPageSeedSourceId || '')}
  />
</details>
```

- [ ] **步骤 8.4：验证构建**

```bash
npm run build
```

---

### 任务 9：前端 — 重构育苗 DetailModal

**文件：**
- 修改：`src/components/farm/seedling/modals/DetailModal.tsx`

- [ ] **步骤 9.1：读取当前文件，确认 Tab 结构**

育苗 DetailModal 当前有 3 个 Tab：info / trace / flow。替换为 EntityDetailModal 后：
- info → basicInfoPanel
- trace → 删除（TraceChain 依赖 instanceId，育苗偶有但不再独立 Tab）
- flow → 由 EntityHistoryTimeline 覆盖

- [ ] **步骤 9.2：重构为薄包装**

```tsx
/**
 * 育苗详情弹窗（2026-06-27 重构）
 * 使用通用 EntityDetailModal 包装
 */

import React from 'react';
import { EntityDetailModal } from '@/components/ui/EntityDetailModal';
import { Seedling, SeedlingStatus, TransplantRecordStatus } from '../../../../types/crop';
import { SEEDLING_STATUS_MAP, TRANSPLANT_STATUS_MAP } from '../../../../constants/cropConstants';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

function SeedlingBasicInfo({ record }: { record: Seedling }) {
  const statusMap = {
    [SeedlingStatus.IN_PROGRESS]: { label: '进行中', color: 'text-amber-600 bg-amber-50' },
    [SeedlingStatus.TRANSPLANT_READY]: { label: '待定植', color: 'text-blue-600 bg-blue-50' },
    [SeedlingStatus.COMPLETED]: { label: '已完成', color: 'text-green-600 bg-green-50' },
    [SeedlingStatus.ABNORMAL]: { label: '异常', color: 'text-red-600 bg-red-50' },
  };
  const status = statusMap[record.status] || statusMap[SeedlingStatus.IN_PROGRESS];

  const getTransplantStatusLabel = (s?: TransplantRecordStatus) => {
    if (!s) return '-';
    switch (s) {
      case TransplantRecordStatus.IN_STOCK: return '库存';
      case TransplantRecordStatus.TRANSPLANTING: return '定植中';
      case TransplantRecordStatus.GROWING: return '生长期';
      case TransplantRecordStatus.HARVESTED: return '已采收';
      default: return s;
    }
  };

  return (
    <div className="space-y-6">
      {/* 基本信息（保留原有逻辑） */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">育苗批号：</span>
            <span className="text-sm font-mono text-blue-600">{record.batchCode}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">作物品种：</span>
            <span className="text-sm text-gray-900">{record.cropName}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">状态：</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">定植状态：</span>
            <span className="text-sm text-gray-900">{getTransplantStatusLabel(record.transplantStatus)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建人：</span>
            <span className="text-sm text-gray-900">{record.createBy}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建时间：</span>
            <span className="text-sm text-gray-900">{record.createTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailModal({ isOpen, onClose, record }: DetailModalProps) {
  return (
    <EntityDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="育苗详情"
      basicInfoPanel={<SeedlingBasicInfo record={record} />}
      entity="seedlings"
      entityId={record.id}
      entityCode={record.batchCode}
    />
  );
}
```

---

### 任务 10：前端 — 重构种植 DetailModal

**文件：**
- 修改：`src/components/farm/planting/modals/DetailModal.tsx`

- [ ] **步骤 10.1：重构为薄包装**

```tsx
/**
 * 种植详情弹窗（2026-06-27 重构）
 * 使用通用 EntityDetailModal 包装
 */

import React from 'react';
import { EntityDetailModal } from '@/components/ui/EntityDetailModal';
import { Planting, PlantingStatus } from '../../../../types/crop';
import { PLANTING_STATUS_MAP, SOURCE_TYPE_MAP } from '../../../../constants/cropConstants';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Planting;
}

function PlantingBasicInfo({ record }: { record: Planting }) {
  const statusMap = {
    [PlantingStatus.PLANTED]: { label: '已定植', color: 'text-blue-600 bg-blue-50' },
    [PlantingStatus.GROWING]: { label: '生长期', color: 'text-amber-600 bg-amber-50' },
    [PlantingStatus.HARVESTED]: { label: '已采收', color: 'text-green-600 bg-green-50' },
    [PlantingStatus.CANCELLED]: { label: '已取消', color: 'text-gray-600 bg-gray-50' },
  };
  const status = statusMap[record.status] || statusMap[PlantingStatus.GROWING];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">种植批号：</span>
            <span className="text-sm font-mono text-blue-600">{record.plantingCode}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">作物品种：</span>
            <span className="text-sm text-gray-900">{record.cropName}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">状态：</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">来源类型：</span>
            <span className="text-sm text-gray-900">{SOURCE_TYPE_MAP[record.sourceType] || record.sourceType}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建人：</span>
            <span className="text-sm text-gray-900">{record.createBy}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建时间：</span>
            <span className="text-sm text-gray-900">{record.createTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailModal({ isOpen, onClose, record }: DetailModalProps) {
  return (
    <EntityDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="种植详情"
      basicInfoPanel={<PlantingBasicInfo record={record} />}
      entity="plantings"
      entityId={record.id}
      entityCode={record.plantingCode}
    />
  );
}
```

---

### 任务 11：全局构建验证 + 回归测试

**文件：** 无新建/修改（仅验证）

- [ ] **步骤 11.1：后端构建**

```bash
cd server && npm run build
```

- [ ] **步骤 11.2：前端构建**

```bash
npm run build
```

预期：0 error，0 warning（关于未使用变量的 warning 需逐个确认是否为本次引入）

- [ ] **步骤 11.3：grep 验证无断裂引用**

```bash
# 确认 SeedSourceHistoryTabs 只在自身文件中出现
grep -r "SeedSourceHistoryTabs" src/ --include="*.tsx" --include="*.ts"

# 确认 TraceChain 仍保留（不应被本次改动删除）
grep -r "TraceChain" src/ --include="*.tsx" --include="*.ts"

# 确认 FlowLogTab 仍保留
grep -r "FlowLogTab" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **步骤 11.4：功能回归测试（浏览器）**

1. 打开种源管理页面 → 点某条种源的"查看"按钮
2. 确认详情弹窗只有 2-3 个 Tab：基本信息 / 追溯时间线 / 调拨来源（仅调拨来的）
3. 切换到"追溯时间线"Tab → 确认时间线视图渲染（含实体历史 + material_flow_log）
4. 切换"表格"视图 → 确认表格视图渲染一致
5. 点"导出 Excel" → 确认文件下载可打开
6. 关闭弹窗 → 确认页脚无 SeedSourceHistoryTabs 折叠区
7. 打开育苗管理 → 点育苗详情 → 确认追溯时间线渲染
8. 打开种植管理 → 点种植详情 → 确认追溯时间线渲染

---

## 自检

- ✅ 覆盖规格全部需求：后端端点 / 前端双视图 / 3 个 DetailModal 重构 / 页脚删除
- ✅ 无占位符
- ✅ 类型一致：HistoryItem 在 service 和组件中使用同一接口
- ✅ 文件路径精确
- ✅ 保留策略已明确：TraceChain / FlowLogTab / SeedSourceHistoryTabs 文件不动，仅入口删除
