/**
 * 种源退库 Modal（2026-06-26 Q1）
 *
 * 业务：
 * - 把种源里"调拨入库"的数量退回原作物库存
 * - 严格 1:1 关联 inventory_inbound_records 流水（不能选其他库存）
 * - 支持部分退（quantity - returned_quantity 范围内）
 *
 * 数据流：
 * - 加载：GET /api/seed-sources/:id/inbound-records → 列出该种源所有可退流水
 * - 提交：POST /api/seed-sources/return-to-inventory
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useToastStore } from '@/stores/useToastStore';
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
  Alert,
  AlertDescription,
  EmptyState,
  Skeleton,
  useToast,
} from '@/components/ui';
import { Undo2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  seedSourceTransferService,
  type ReturnableInboundRow,
} from '@/services/seedSourceTransferService';

interface SeedSourceReturnModalProps {
  /** 目标种源 ID */
  targetSeedSourceId: string;
  /** 目标种源 code（仅显示用） */
  targetSeedSourceCode: string;
  /** 退库回调：返回退库明细给父组件（异步，Modal 等待父组件完成后再关弹窗） */
  onConfirm: (items: Array<{ inboundRecordId: string; quantity: number; unit: string }>) => Promise<void> | void;
}

export function SeedSourceReturnModal({
  targetSeedSourceId,
  targetSeedSourceCode,
  onConfirm,
}: SeedSourceReturnModalProps) {
  // 2026-07-19 P0-6：改用全局 useToastStore（避免 toast.error is not a function）
  const toast = useToastStore((s) => s.toast);
  // 2026-07-19 P0-6：提交锁 — 防止双击/重复触发
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);  // 同步锁，覆盖 React state 延迟窗口

  // ============ 数据状态 ============
  const [rows, setRows] = useState<ReturnableInboundRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============ 选择状态 ============
  // Map<inboundRecordId, quantity>（unit 继承自流水，无需存储）
  const [selected, setSelected] = useState<Map<string, { quantity: number; unit: string }>>(new Map());

  // ============ 加载可退库流水 ============
  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await seedSourceTransferService.listReturnableInboundRecords(targetSeedSourceId);
      setRows(data);
    } catch (err) {
      console.error('[SeedSourceReturnModal] 加载可退库流水失败:', err);
      const msg = err instanceof Error ? err.message : '加载可退库流水失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSeedSourceId]);

  // ============ 选中行 ============
  const toggleRow = (row: ReturnableInboundRow, checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) {
        // 默认数量 = 可退量
        next.set(row.id, { quantity: row.returnableQuantity, unit: row.unit });
      } else {
        next.delete(row.id);
      }
      return next;
    });
  };

  // ============ 更新选中行的数量 ============
  const updateQuantity = (inboundRecordId: string, quantity: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const existing = next.get(inboundRecordId);
      if (existing) {
        next.set(inboundRecordId, { ...existing, quantity });
      }
      return next;
    });
  };

  // ============ 校验并提交 ============
  // 2026-07-28 审核 H-1：submitLockRef 和 submitting 真正起效，避免双击重复提交
  const handleConfirm = async () => {
    if (submitLockRef.current || submitting) return;
    if (selected.size === 0) {
      toast.error('请至少选择 1 条退库流水');
      return;
    }
    if (selected.size > 100) {
      toast.error('批量退库单次最多 100 条');
      return;
    }
    const items: Array<{ inboundRecordId: string; quantity: number; unit: string }> = [];
    const errors: string[] = [];
    for (const [inboundRecordId, { quantity, unit }] of selected.entries()) {
      const row = rows.find((r) => r.id === inboundRecordId);
      if (!row) continue;
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`${row.sourceCode}: 退库数量必须 > 0`);
        continue;
      }
      if (quantity > row.returnableQuantity) {
        errors.push(`${row.sourceCode}: 退库 ${quantity} 超过可退 ${row.returnableQuantity}`);
        continue;
      }
      // 2026-07-01 P2-7：移除 `transferQuantity: undefined as any` 死代码
      items.push({ inboundRecordId, quantity, unit });
    }
    if (errors.length > 0) {
      toast.error(`校验失败：${errors.join('；')}`);
      return;
    }
    if (items.length === 0) {
      toast.error('没有可退库的有效记录');
      return;
    }
    // 同步锁 + state 双重保护，避免 React 18 批处理延迟导致的双击
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      await onConfirm(items);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  // ============ 总数统计 ============
  const totalCount = selected.size;
  const totalQuantityByUnit = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const sel = selected.get(r.id);
      if (sel) {
        map.set(sel.unit, (map.get(sel.unit) || 0) + sel.quantity);
      }
    });
    return map;
  }, [rows, selected]);

  return (
    <div className="space-y-4">
      {/* ============ 顶部状态条 ============ */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-amber-100 text-amber-800 text-xs">
          模式：退库到原作物库存（严格 1:1 关联调拨流水）
        </Badge>
        <Badge variant="outline" className="text-xs">
          {loading ? '加载中…' : `共 ${rows.length} 条可退流水`}
        </Badge>
        {totalCount > 0 && (
          <Badge className="bg-emerald-500 text-white text-xs">
            已选 {totalCount} 条
          </Badge>
        )}
      </div>

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
        <EmptyState
          title="暂无可退库流水"
          description="该种源没有可退的调拨入库流水（或已全部退完）"
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table className="table-fixed w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">选择</TableHead>
                <TableHead className="w-44">原库存单号</TableHead>
                <TableHead className="w-28">类型</TableHead>
                <TableHead className="w-32">作物 / 品种</TableHead>
                <TableHead className="w-28">仓库</TableHead>
                <TableHead className="w-28 text-right">原始数量</TableHead>
                <TableHead className="w-28 text-right">已退</TableHead>
                <TableHead className="w-28 text-right">可退</TableHead>
                <TableHead className="w-44">退库数量</TableHead>
                <TableHead className="w-28">入库日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                const sel = selected.get(row.id);
                const qty = sel?.quantity ?? 0;
                const overLimit = isSelected && qty > row.returnableQuantity;
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
                      <code className="text-xs text-gray-700 whitespace-nowrap block truncate" title={row.sourceInstanceId || row.sourceCode}>
                        {row.sourceInstanceId || row.sourceCode}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge className="whitespace-nowrap bg-blue-100 text-blue-700">
                        {/* 2026-07-16：stockType fallback 加 '其他' 兜底，避免显示未知英文值 */}
                        {row.stockType === 'seedling' ? '种苗' : row.stockType === 'seed' ? '种源' : row.stockType === 'product' ? '成品' : '其他'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900 truncate" title={row.cropName || ''}>
                        {row.cropName || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600 whitespace-nowrap truncate block" title={row.warehouseName || ''}>
                        {row.warehouseName || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {row.quantity}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">{row.unit}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {row.returnedQuantity}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{row.unit}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-medium text-emerald-600 whitespace-nowrap">
                        {row.returnableQuantity}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">{row.unit}</span>
                    </TableCell>
                    <TableCell>
                      {isSelected ? (
                        <div className="flex items-center gap-1">
                          <NumberInput
                            value={qty}
                            onChange={(v) => updateQuantity(row.id, parseInt(String(v), 10) || 0)}
                            decimals={0}
                            className="w-24"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-500 whitespace-nowrap">{row.unit}</span>
                          {overLimit && (
                            <span className="text-xs text-red-500 ml-1 whitespace-nowrap">超出</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        {row.recordDate || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ============ 底部操作栏 ============ */}
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
          {/* 2020-07-19 P1：提交期间禁用按钮 + loading 状态 */}
          <Button
            onClick={handleConfirm}
            disabled={totalCount === 0 || loading || submitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting ? (
              <>
                <RotateCcw className="w-4 h-4 mr-1 animate-spin" />
                退库中...
              </>
            ) : (
              <>
                <Undo2 className="w-4 h-4 mr-1" />
                确认退库 {totalCount > 0 && `(${totalCount})`}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default SeedSourceReturnModal;