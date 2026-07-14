/**
 * 库存调拨选择面板（内部种源 → 库存调拨）
 * 2026-06-24: B4 实施（种源新增弹窗 — 创建新种源）
 * 2026-06-25 v3: 加 mode='append_existing' 模式（种源操作列 — 追加现有种源库存）
 *
 * 业务：
 * - 拉取 GET /api/inventory/transferable-sources 列出 3 种 stock_type 可调拨库存
 * - 多选 + 每行调拨数量调整（默认 = currentQuantity，单位继承）
 * - 校验：quantity > 0 且 ≤ currentQuantity，unit 必须等于原库存 unit
 * - 确认 → 调用 onConfirm(items) → 父组件触发后续调拨提交
 *   - mode='create_new'（默认）→ 父组件调 createFromTransfer 创建新种源
 *   - mode='append_existing' → 父组件调 appendToExistingSeedSource 追加到目标种源
 *
 * 数据流（V2.1 铁律）：
 * 组件 → seedSourceTransferService → enhancedApiClient → API（无缓存）
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Button,
  Card,
  Badge,
  Input,
  Label,
  NumberInput,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  Alert,
  AlertDescription,
  EmptyState,
  Skeleton,
  useToast,
} from '@/components/ui';
import { Search, ArrowLeftRight, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  seedSourceTransferService,
  type TransferableSourceRow,
  type TransferItem,
  type TransferStockType,
} from '@/services/seedSourceTransferService';

/** 调拨模式 */
export type InventoryTransferMode = 'create_new' | 'append_existing';

interface InventoryTransferPanelProps {
  /** 调拨模式：
   *  - 'create_new'（默认）: 父组件（AddModal）调 createFromTransfer 创建新种源
   *  - 'append_existing': 父组件（SeedSourcePage 操作列弹窗）调 appendToExistingSeedSource 追加到目标种源
   */
  mode?: InventoryTransferMode;
  /** 模式 = 'append_existing' 时必填：目标种源 ID */
  targetSeedSourceId?: string;
  /** 2026-06-26 修复：模式 = 'append_existing' 时按目标种源的作物名过滤库存 */
  targetCropName?: string;
  /** 2026-06-26 修复：模式 = 'append_existing' 时按目标种源的作物品种名过滤库存 */
  targetCropVariety?: string;
  /** 确认调拨：返回选中的明细给父组件 */
  onConfirm: (items: TransferItem[]) => void;
}

/** stockType 中文映射 */
const STOCK_TYPE_LABEL: Record<TransferStockType, string> = {
  seed: '种源',
  seedling: '种苗',
  product: '产品',
};

const STOCK_TYPE_BADGE: Record<TransferStockType, string> = {
  seed: 'bg-emerald-100 text-emerald-700',
  seedling: 'bg-blue-100 text-blue-700',
  product: 'bg-amber-100 text-amber-700',
};

/**
 * 来源信息格式化
 * 优先级: businessCode（采收/入库单号）> supplierName（供应商）> productionPlanCode（生产计划）> sourceType（来源类型）
 * 老数据 sourceModule/sourceId 可能为 NULL（schema 迁移前入库的），用 businessCode 等兜底
 */
function formatSource(row: TransferableSourceRow): string {
  if (row.businessCode) return row.businessCode;
  if (row.supplierName) return `供应商:${row.supplierName}`;
  if (row.productionPlanCode) return row.productionPlanCode;
  if (row.sourceType) return row.sourceType;
  return '—';
}

export function InventoryTransferPanel({
  mode = 'create_new',
  targetSeedSourceId,
  targetCropName,
  targetCropVariety,
  onConfirm,
}: InventoryTransferPanelProps) {
  const toast = useToast();

  // ============ 筛选状态 ============
  const [stockTypeFilter, setStockTypeFilter] = useState<TransferStockType[]>([
    'seed',
    'seedling',
    'product',
  ]);
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ============ 列表状态 ============
  const [rows, setRows] = useState<TransferableSourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 客户端分页
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  // ============ 选择状态 ============
  // Map<stockId, { quantity: number }> — unit 继承自原库存（无需存储）
  const [selected, setSelected] = useState<Map<string, { quantity: number }>>(new Map());

  // ============ 加载可调拨库存 ============
  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await seedSourceTransferService.listTransferableSources({
        stockType: stockTypeFilter,
        keyword: keyword.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        // 2026-06-26 修复：追加模式按目标种源作物名/品种名过滤，避免显示不相关作物库存
        cropName: mode === 'append_existing' ? targetCropName : undefined,
        cropVariety: mode === 'append_existing' ? targetCropVariety : undefined,
      });
      setRows(data);
    } catch (err) {
      console.error('[InventoryTransferPanel] 加载可调拨库存失败:', err);
      const msg = err instanceof Error ? err.message : '加载可调拨库存失败';
      setError(msg);
      // 2026-07-01 P2-17：去掉 toast.error，保留 Alert 即可（避免双重展示）
    } finally {
      setLoading(false);
    }
  };

  // 2026-07-01 P2-6：用 useRef 替代 useState（避免不必要 re-render，且对 useEffect 严格模式双跑更稳定）
  const hasInteractedRef = useRef(false);
  // 兼容旧版 setHasInteracted 调用点（保留为 setter wrapper）
  const setHasInteracted = (v: boolean) => { hasInteractedRef.current = v; };

  // 初始化加载：面板打开时自动加载数据（不等待用户交互）
  useEffect(() => {
    loadRows();
    // 2026-07-14：loadRows 是 useCallback 包装的函数（已稳定引用），不需要重复监听——但保留注释明确意图
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 筛选条件变化时重载（仅在用户交互后才生效）
  useEffect(() => {
    if (!hasInteractedRef.current) return;
    setPage(1);
    loadRows();
    // 2026-07-14：loadRows 已 useCallback 稳定引用，deps 列表显式列出业务字段（避免无谓重渲）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockTypeFilter.join(','), dateFrom, dateTo, targetCropName, targetCropVariety, mode]);

  // 关键字用 debounce（300ms）
  useEffect(() => {
    if (!hasInteractedRef.current) return;
    setPage(1);
    const timer = setTimeout(() => {
      loadRows();
    }, 300);
    return () => clearTimeout(timer);
    // 2026-07-14：debounce 内 loadRows 闭包引用，deps 仅业务字段
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // 用户操作时标记已交互 → 触发首次加载
  const markInteracted = () => setHasInteracted(true);

  // ============ 切换 stockType 筛选 ============
  const toggleStockType = (type: TransferStockType) => {
    markInteracted();
    setStockTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // ============ 选中行 ============
  const toggleRow = (row: TransferableSourceRow, checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) {
        // 默认数量 = currentQuantity
        next.set(row.id, { quantity: row.currentQuantity });
      } else {
        next.delete(row.id);
      }
      return next;
    });
  };

  // ============ 更新选中行的数量 ============
  const updateQuantity = (stockId: string, quantity: number) => {
    setError(null);  // 2026-07-01 P1-2：用户修改数量时清空错误提示
    setSelected((prev) => {
      const next = new Map(prev);
      const existing = next.get(stockId);
      if (existing) {
        next.set(stockId, { quantity });
      }
      return next;
    });
  };

  // ============ 全选 / 反选当前可见行 ============
  const allVisibleSelected = useMemo(() => {
    return pagedRows.length > 0 && pagedRows.every((r) => selected.has(r.id));
  }, [pagedRows, selected]);

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // 反选：移除所有当前可见
      setSelected((prev) => {
        const next = new Map(prev);
        pagedRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // 全选：加入所有当前可见（数量 = currentQuantity）
      setSelected((prev) => {
        const next = new Map(prev);
        pagedRows.forEach((r) => {
          if (!next.has(r.id)) {
            next.set(r.id, { quantity: r.currentQuantity });
          }
        });
        return next;
      });
    }
  };

  // ============ 总数统计 ============
  const totalCount = selected.size;
  const totalQuantityByUnit = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const sel = selected.get(r.id);
      if (sel) {
        map.set(r.unit, (map.get(r.unit) || 0) + sel.quantity);
      }
    });
    return map;
  }, [rows, selected]);

  // ============ 校验并提交 ============
  const handleConfirm = () => {
    if (selected.size === 0) {
      toast.error('请至少选择 1 条调拨记录');
      return;
    }
    if (selected.size > 100) {
      toast.error('批量调拨单次最多 100 条');
      return;
    }

    // 校验：每条 quantity > 0 且 ≤ currentQuantity，unit 必须匹配
    const items: TransferItem[] = [];
    const errors: string[] = [];
    for (const [stockId, { quantity }] of selected.entries()) {
      const row = rows.find((r) => r.id === stockId);
      if (!row) continue;
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`${row.instanceId}: 调拨数量必须 > 0`);
        continue;
      }
      if (quantity > row.currentQuantity) {
        errors.push(`${row.instanceId}: 调拨数量 ${quantity} 超过当前可用 ${row.currentQuantity}`);
        continue;
      }
      // unit 直接继承原库存（后端会二次校验是否匹配，这里不重复）
      items.push({
        sourceStockId: stockId,
        transferQuantity: Math.floor(quantity),  // 后端要求整数
        unit: row.unit,
      });
    }

    if (errors.length > 0) {
      toast.error(`校验失败：${errors.join('；')}`);
      return;
    }
    if (items.length === 0) {
      toast.error('没有可调拨的有效记录');
      return;
    }

    onConfirm(items);
  };

  return (
    <div className="space-y-4">
      {/* ============ 顶部状态条 ============ */}
      <div className="flex items-center gap-2 flex-wrap">
        {mode === 'append_existing' && (
          <Badge className="bg-amber-100 text-amber-800 text-xs">
            模式：追加到现有种源（不创建新记录）
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {loading ? '加载中…' : `共 ${rows.length} 条可调拨`}
        </Badge>
        {totalCount > 0 && (
          <Badge className="bg-emerald-500 text-white text-xs">
            已选 {totalCount} 条
          </Badge>
        )}
      </div>

      {/* ============ 筛选器 ============ */}
      <Card className="p-4">
        <div className="space-y-3">
          {/* stockType 多选 toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm text-gray-700 whitespace-nowrap">库存类型：</Label>
            {(['seed', 'seedling', 'product'] as TransferStockType[]).map((type) => {
              const checked = stockTypeFilter.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleStockType(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    checked
                      ? `${STOCK_TYPE_BADGE[type]} ring-1 ring-offset-1 ring-emerald-300`
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {STOCK_TYPE_LABEL[type]}
                </button>
              );
            })}
          </div>

          {/* 关键字 + 日期范围 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={keyword}
                onChange={(e) => { markInteracted(); setKeyword(e.target.value); }}
                placeholder="搜索品种/作物名/库存编号"
                className="pl-8"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { markInteracted(); setDateFrom(e.target.value); }}
              placeholder="开始日期"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { markInteracted(); setDateTo(e.target.value); }}
              placeholder="结束日期"
            />
          </div>
        </div>
      </Card>

      {/* ============ 错误提示 ============ */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ============ 列表 ============ */}
      {loading ? (
        <Card className="p-8">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </Card>
      ) : rows.length === 0 ? (
        hasInteractedRef.current ? (
          <EmptyState
            title="暂无可调拨库存"
            description="作物库存中没有符合条件的记录，请调整筛选条件或先去库存页登记入库"
          />
        ) : (
          <EmptyState
            title="请选择筛选条件"
            description="调整库存类型、输入作物名称或设置日期范围后查询（避免一次性加载大量库存数据）"
          />
        )
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table className="table-fixed w-[1100px]">
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600">
              <TableRow className="hover:from-blue-500 hover:to-blue-600">
                <TableHead className="w-10 text-center text-white text-sm font-semibold">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-44 text-white text-sm font-semibold">库存编号</TableHead>
                <TableHead className="w-24 text-white text-sm font-semibold">类型</TableHead>
                <TableHead className="w-52 text-white text-sm font-semibold">作物 / 品种</TableHead>
                <TableHead className="w-28 text-white text-sm font-semibold">形态</TableHead>
                <TableHead className="w-32 text-right text-white text-sm font-semibold">可用数量</TableHead>
                <TableHead className="w-48 text-white text-sm font-semibold">调拨数量</TableHead>
                <TableHead className="w-32 text-white text-sm font-semibold">入库日期</TableHead>
                <TableHead className="w-40 text-white text-sm font-semibold">采收来源</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((row) => {
                const isSelected = selected.has(row.id);
                const sel = selected.get(row.id);
                const qty = sel?.quantity ?? 0;
                const overLimit = isSelected && qty > row.currentQuantity;
                return (
                  <TableRow
                    key={row.id}
                    className={isSelected ? 'bg-emerald-50/40' : ''}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => toggleRow(row, !!c)}
                      />
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-gray-700 whitespace-nowrap block truncate" title={row.instanceId}>
                        {row.instanceId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STOCK_TYPE_BADGE[row.stockType]} whitespace-nowrap`}>
                        {STOCK_TYPE_LABEL[row.stockType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900 truncate" title={`${row.cropName}${row.varietyName ? ' (' + row.varietyName + ')' : ''}`}>
                        <span>{row.cropName}</span>
                        {row.varietyName && (
                          <span className="text-gray-500 ml-1">
                            ({row.varietyName})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {/* 2026-06-30 Bug 13：形态列 — 调拨面板列出作物形态方便挑选；调拨入种源时此形态自动复制到 seed_sources.seed_form */}
                    <TableCell>
                      {row.productForm ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs whitespace-nowrap">
                          {row.productForm}
                        </Badge>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {row.currentQuantity}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">{row.unit}</span>
                    </TableCell>
                    <TableCell>
                      {isSelected ? (
                        <div className="flex items-center gap-1">
                          <NumberInput
                            value={qty}
                            onChange={(v) => updateQuantity(row.id, parseFloat(v) || 0)}
                            decimals={2}
                            className="w-24"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-500 whitespace-nowrap">{row.unit}</span>
                          {overLimit && (
                            <span className="text-xs text-red-500 ml-1 whitespace-nowrap">
                              超出
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        {row.inboundDate || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600 truncate block" title={formatSource(row)}>
                        {formatSource(row)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 分页 */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl">
          <div className="text-sm text-gray-500">
            显示 {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, rows.length)} 条，共 {rows.length} 条
          </div>
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(rows.length / pageSize))}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            showPageSize={true}
          />
        </div>
      )}

      {/* ============ 底部操作栏（仅确认调拨）==========
          「切换入库方式」/「取消」由顶部 grid 和 modal 关闭按钮承担，这里不重复 */}
      <Card className="p-4 sticky bottom-0 bg-white shadow-md">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>已选 <strong className="text-emerald-600">{totalCount}</strong> 条</span>
            </div>
            {Array.from(totalQuantityByUnit.entries()).map(([unit, qty]) => (
              <Badge key={unit} variant="outline" className="text-xs">
                {qty.toFixed(2)} {unit}
              </Badge>
            ))}
          </div>
          <Button
            onClick={handleConfirm}
            disabled={totalCount === 0 || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowLeftRight className="w-4 h-4 mr-1" />
            确认调拨 {totalCount > 0 && `(${totalCount})`}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default InventoryTransferPanel;
