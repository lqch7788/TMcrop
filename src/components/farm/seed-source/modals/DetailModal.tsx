/**
 * 种源详情弹窗（2026-07-02 重构）
 * 种源已退化为纯仓库角色，移除繁育种源相关字段。
 * 三入口模式：外购入库 / 库存调拨 / 种植留种
 * Tab：基本信息 / 来源详情（条件）/ 调拨来源（条件）/ 使用记录 / 操作历史
 * 2026-07-05: "调入种植" Tab 改名为 "使用记录"（更准确反映被育苗/种植使用两种场景）
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, MoveRight, Store, Sprout, Download, Package, RotateCcw, AlertTriangle, Layers } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { Badge, Textarea, Label } from '@/components/ui';
import { useSeedSourceStore } from '@/stores/useSeedSourceStore';
import { Alert, AlertDescription, Button } from '@/components/ui';
import * as XLSX from 'xlsx';
import { EntityDetailModal } from '@/components/ui/EntityDetailModal';
import { SeedSource } from '../../../../types/crop';
import { STOCK_STATUS_MAP, UNIT_MAP, SOURCE_TYPE_MAP, SOURCE_ORIGIN_MAP, TRANSFERRED_FROM_BUSINESS_TYPE_MAP, ORIGINAL_SOURCE_MODULE_MAP } from '../../../../constants/cropConstants';
// 2026-07-16：种源形态字段 seedForm 后端可能存中文（来自 product_form）或英文（来自 stock_type），
// 统一在前端兜底翻译成中文显示
import { SEED_FORM_OPTIONS } from '../../../../constants/seedFormDict';
import { computeStockStatus } from '../../../../lib/stockStatus';
import {
  getSeedSourceUsageRecords,
  getInboundRecords,
  type SeedSourceUsageRecord,
} from '@/services/apiSeedSourceService';
// 2026-07-14：删除 enhancedApiClient 直调（架构铁律：组件 → Store → enhancedApiClient → API）

/**
 * 2026-07-16：种源形态字段兜底翻译
 * - 后端可能写中文（来自 inventory_stock.product_form「花朵/果实/种子」等 12 选）
 * - 也可能写英文（来自 inventory_stock.stock_type 或回流时存的 seed/seedling/planting）
 * - 显示统一返回中文，未匹配则原样回显
 */
function formatSeedForm(sf: string | null | undefined): string {
  if (!sf) return '—';
  // 已在中文词典中 → 原样返回
  if (SEED_FORM_OPTIONS.some(opt => opt.value === sf)) return sf;
  // 走英文 → 中文映射
  return SOURCE_TYPE_MAP[sf] || sf;
}

/** 入库模式配置 — 三种入口各有不同的关联信息 */
const MODE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  planting_self_kept:   { label: '种植留种', icon: <Sprout className="w-4 h-4" />,      color: 'text-green-700 bg-green-50' },
  inventory_transfer:   { label: '库存调拨', icon: <ArrowLeftRight className="w-4 h-4" />, color: 'text-cyan-700 bg-cyan-50' },
  transfer_from_inventory: { label: '库存调拨', icon: <ArrowLeftRight className="w-4 h-4" />, color: 'text-cyan-700 bg-cyan-50' },
  external_purchase:    { label: '外购入库', icon: <Store className="w-4 h-4" />,         color: 'text-blue-700 bg-blue-50' },
  external:             { label: '外购入库', icon: <Store className="w-4 h-4" />,         color: 'text-blue-700 bg-blue-50' },
};

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource;
}

/** 基本信息面板 — 涵盖种源列表全部列 + 模式感知 */
function SeedSourceBasicInfo({ record }: { record: SeedSource }) {
  const formatUnit = (unit: string) => UNIT_MAP[unit] || unit || '';
  const status = STOCK_STATUS_MAP[computeStockStatus(record.availableCount, record.initialCount)] || STOCK_STATUS_MAP['sufficient'];

  // 判断入库模式
  const originKey = record.sourceOrigin || (record.transferredFromStockId ? 'transfer_from_inventory' : 'external');
  const mode = MODE_CONFIG[originKey] || MODE_CONFIG['external'];
  const isExternal = originKey === 'external' || originKey === 'external_purchase';
  const isTransfer = originKey === 'inventory_transfer' || originKey === 'transfer_from_inventory' || !!record.transferredFromStockId;
  const isPlantingKept = originKey === 'planting_self_kept';

  return (
    <div className="space-y-6">
      {/* 入库模式标签 */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${mode.color}`}>
        {mode.icon}
        {mode.label}
      </div>

      {/* 基本信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">种源批号：</span>
            <span className="text-sm font-mono text-blue-600">{record.seedCode}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">作物编码：</span>
            <span className="text-sm font-mono text-orange-600">{record.cropCode || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">作物品种：</span>
            <span className="text-sm text-gray-900">{record.cropName}{record.cropVariety ? `（${record.cropVariety}）` : ''}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">品种路径：</span>
            <span className="text-sm text-gray-600">{record.typeName && record.varietyName ? `${record.typeName} › ${record.varietyName}` : record.varietyName || record.typeName || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">来源途径：</span>
            <span className="text-sm text-gray-900">{SOURCE_ORIGIN_MAP[originKey]?.label || mode.label}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">形态：</span>
            <span className="text-sm text-gray-900">{formatSeedForm(record.seedForm)}</span>
          </div>
        </div>
      </div>

      {/* 库存信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">库存信息</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">入库日期：</span>
            <span className="text-sm text-gray-900">{record.purchaseDate || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">入库数量：</span>
            <span className="text-sm text-gray-900">{record.quantity.toLocaleString()} {formatUnit(record.unit)}</span>
          </div>
          {isExternal && (
            <>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">单价：</span>
                <span className="text-sm text-gray-900">¥{record.unitPrice}/{formatUnit(record.unit)}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">总金额：</span>
                <span className="text-sm text-gray-900">¥{record.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">供应商：</span>
                <span className="text-sm text-gray-900">{record.supplierName || '—'}</span>
              </div>
            </>
          )}
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">可用数量：</span>
            <span className="text-sm font-medium text-emerald-600">{record.availableCount.toLocaleString()} {formatUnit(record.unit)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">库存状态：</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
        </div>
      </div>

      {/* 种植留种关联信息 */}
      {isPlantingKept && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">种植留种信息</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">关联种植：</span>
              <span className="text-sm font-mono text-gray-900">{record.linkedPlantingCode || '—'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">世代：</span>
              <span className="text-sm text-gray-900">{record.generation || '—'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">采收形态：</span>
              <span className="text-sm text-gray-900">{formatSeedForm(record.seedForm)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 其他信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建人：</span>
            <span className="text-sm text-gray-900">{record.createBy || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建时间：</span>
            <span className="text-sm text-gray-900">{record.createTime}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">更新时间：</span>
            <span className="text-sm text-gray-900">{record.updateTime}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">打印次数：</span>
            <span className="text-sm text-gray-900">{record.printCount} 次</span>
          </div>
          {/* 2026-07-18: 种源合并 - 回流次数 + 最近回流时间 + 合并历史 */}
          {(record.reflowCount ?? 0) > 0 && (
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">回流次数：</span>
              <span className="text-sm text-cyan-700 font-medium">
                {record.reflowCount} 次
                {record.lastReflowAt && (
                  <span className="text-xs text-gray-500 ml-2">
                    （最近 {record.lastReflowAt}）
                  </span>
                )}
              </span>
            </div>
          )}
          {record.mergedFromIds && record.mergedFromIds.length > 0 && (
            <div className="col-span-2 flex items-start">
              <span className="text-sm text-gray-500 w-24 flex-shrink-0">合并历史：</span>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  合并了 {record.mergedFromIds.length} 条历史种源
                </Badge>
                {record.mergedFromIds.slice(0, 3).map((id, idx) => (
                  <code key={idx} className="text-xs text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">
                    {id.substring(0, 16)}...
                  </code>
                ))}
                {record.mergedFromIds.length > 3 && (
                  <span className="text-xs text-gray-500">等 {record.mergedFromIds.length} 条</span>
                )}
              </div>
            </div>
          )}
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

/** 调拨来源面板（条件渲染） */
function TransferSourcePanel({ record }: { record: SeedSource }) {
  return (
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
            {/* 2026-07-16：transferredFromBusinessType 是英文枚举（harvest/purchase/transfer），走字典翻译 */}
            <span className="text-sm text-gray-900">{TRANSFERRED_FROM_BUSINESS_TYPE_MAP[record.transferredFromBusinessType] || record.transferredFromBusinessType || '—'}</span>
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
            {/* 2026-07-16：originalSourceModule 是英文枚举（seed_source/seedling/planting/harvest），走字典翻译 */}
            <span className="text-sm text-gray-900">{ORIGINAL_SOURCE_MODULE_MAP[record.originalSourceModule] || record.originalSourceModule || '—'}</span>
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
  );
}

/**
 * 使用记录面板
 * 2026-06-30: 列示当前种源被消耗/调拨出去的全量记录。
 * 2026-07-05: 改名为"使用记录"，覆盖被育苗使用 + 种植移入/移出。
 * 数据来源：GET /api/seed-sources/:id/usage-records
 */
function UsageRecordsPanel({ seedSourceId }: { seedSourceId: string }) {
  const [records, setRecords] = useState<SeedSourceUsageRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!seedSourceId) return
    setLoading(true)
    setError(null)
    // 错误向上抛：捕获后在面板本地展示，不吞默认空数组（保持可观测）
    getSeedSourceUsageRecords(seedSourceId)
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch((e) => { console.error('[DetailModal] 使用记录加载失败:', e); setError((e && (e as { message?: string }).message) || '加载失败'); })
      .finally(() => setLoading(false))
  }, [seedSourceId])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中…</div>
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        <MoveRight className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <div className="text-sm">暂无使用记录</div>
        <div className="text-xs mt-1 text-gray-400">
          当该种源被育苗或种植环节调用时会显示在此
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <MoveRight className="w-4 h-4 text-emerald-600" />
          使用记录（共 {records.length} 条）
        </h4>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => {
            const headers = ['日期', '类型', '种源批号', '作物名称', '作物编码', '形态', '数量', '目标种植单', '目标区域', '操作员', '备注'];
            const data = records.map(r => [
              r.operationDate || '',
              r.operationType === 'move_in' ? '调入' : '调出',
              r.sourceCode || '',
              r.cropName || '',
              r.cropCode || '',
              r.seedForm ? (formatSeedForm(r.seedForm)) : '',
              r.quantity ?? 0,
              r.plantingCode || '',
              r.toAreaName || r.fromAreaName || '',
              r.operatorName || '',
              r.remarks || '',
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            ws['!cols'] = headers.map(() => ({ wch: 16 }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '使用记录');
            // 2026-07-10 P0-1 修复：用 todayLocal() 替代 toISOString() 避免 UTC 时区 bug
            const today = todayLocal().replace(/-/g, '');
            XLSX.writeFile(wb, `使用记录_${today}_${records.length}条.xlsx`);
          }}
        >
          <Download className="w-4 h-4 mr-1" />
          导出 Excel
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-blue-500 text-white sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left">日期</th>
              <th className="px-2 py-2 text-left">类型</th>
              <th className="px-2 py-2 text-left">种源批号</th>
              <th className="px-2 py-2 text-left">作物名称</th>
              <th className="px-2 py-2 text-left">作物编码</th>
              <th className="px-2 py-2 text-left">形态</th>
              <th className="px-2 py-2 text-right">数量</th>
              <th className="px-2 py-2 text-left">目标种植单</th>
              <th className="px-2 py-2 text-left">目标区域</th>
              <th className="px-2 py-2 text-left">操作员</th>
              <th className="px-2 py-2 text-left">备注</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 border-b border-gray-100">
                <td className="px-2 py-1.5 whitespace-nowrap">{r.operationDate || '-'}</td>
                <td className="px-2 py-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                      r.operationType === 'move_in'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {r.operationType === 'move_in' ? '调入' : '调出'}
                  </span>
                </td>
                <td className="px-2 py-1.5"><code className="text-xs">{r.sourceCode || '-'}</code></td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.cropName || '-'}</td>
                <td className="px-2 py-1.5"><code className="text-xs text-orange-600">{r.cropCode || '-'}</code></td>
                <td className="px-2 py-1.5">{r.seedForm ? formatSeedForm(r.seedForm) : '-'}</td>
                <td className="px-2 py-1.5 text-right font-medium">
                  {(r.quantity || 0).toLocaleString()}
                </td>
                <td className="px-2 py-1.5">
                  <code className="text-xs">{r.plantingCode || '-'}</code>
                </td>
                <td className="px-2 py-1.5">{r.toAreaName || '-'}</td>
                <td className="px-2 py-1.5">{r.operatorName || '-'}</td>
                <td
                  className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]"
                  title={r.remarks || ''}
                >
                  {r.remarks || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 来源模块中文映射（与 SeedSourceInboundModal 的 sourceModule 保持一致）
// 2026-07-14：移到模块顶层（避免 InboundRecordsPanel 每次 render 重建）
const SOURCE_MODULE_MAP: Record<string, string> = {
  seed_source: '商品种源入库',
  inventory: '库存调拨',
};

// 2026-07-06 Bug 19：种源详情弹窗新增「入库记录」Tab
// 数据源：GET /api/seed-sources/:id/history-inbound
//   查 inventory_inbound_records 表 WHERE (source_id=? AND source_module='seed_source') OR business_id=?
//   - 商品种源入库（SeedSourceInboundModal）→ inventoryInboundFromSource.service.ts 写 source_id=种源ID
//   - 调拨入种源（executeTransferToSource）→ 写 business_id=种源ID, source_module='inventory'
//   - 追加调拨入库（append-from-inventory）→ 写 business_id=种源ID, source_module='inventory'
// 三条入库路径都覆盖，详情弹窗能完整看到所有入库流水
// 2026-07-14：InboundRecord 接口移到模块顶层
// 2026-07-18：改为 import from types/crop.ts（合并种源功能需要 recordSource/reversedAt 字段）
import type { InboundRecord as InboundRecordType } from '@/types/crop';
type InboundRecord = InboundRecordType;

function InboundRecordsPanel({ seedSourceId }: { seedSourceId: string }) {
  const [records, setRecords] = useState<InboundRecord[]>([])
  // 2026-07-18: 冲销对话框状态（C-1 修复）
  const [reversingRecord, setReversingRecord] = useState<InboundRecord | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseSubmitting, setReverseSubmitting] = useState(false);

  // 2026-07-18: 冲销处理函数
  async function handleReverse() {
    if (!reversingRecord || !reverseReason.trim()) return;
    setReverseSubmitting(true);
    // 冲销数量（用于 toast 显示）
    const returnableQty = (reversingRecord.quantity || 0) - (reversingRecord.returnedQuantity || 0);
    const returnableUnit = reversingRecord.unit || '';
    try {
      // 通过 Store action（架构铁律：不直接调 service）
      await useSeedSourceStore.getState().reverseInbound(seedSourceId, {
        inboundRecordId: reversingRecord.id,
        reason: reverseReason.trim(),
      });
      toast.success(
        `冲销成功：入库 ${reversingRecord.id.substring(0, 12)}... 减少 ${returnableQty} ${returnableUnit} 可用`
      );
      setReversingRecord(null);
      setReverseReason('');
      // 刷新种源（更新 remainingQuantity）+ 刷新入库记录（更新 reversedAt 标记）
      await useSeedSourceStore.getState().loadItems();
      // 重新加载当前面板的 records
      getInboundRecords(seedSourceId)
        .then((data) => setRecords(Array.isArray(data) ? data : []))
        .catch(() => {});
    } catch (e: any) {
      toast.error(`冲销失败：${e.message || '未知错误'}`);
    } finally {
      setReverseSubmitting(false);
    }
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!seedSourceId) return
    setLoading(true)
    setError(null)
    // 2026-07-18：改用 getInboundRecords（UNION inventory_inbound + crop_circulation PROPAGATION）
    getInboundRecords(seedSourceId)
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch((e) => { console.error('[DetailModal] 入库记录加载失败:', e); setError((e && (e as { message?: string }).message) || '加载失败'); })
      .finally(() => setLoading(false))
  }, [seedSourceId])

  // 2026-07-06：顶部统计汇总（原始/已退/可退 + 单位），让用户一眼看到退库累计
  // 2026-07-18：过滤已冲销记录（C-2 修复）
  // ⚠️ 必须在所有 early return 之前调用 — React hooks 调用次数必须保持一致
  const summary = useMemo(() => {
    // 只统计未冲销的记录（被冲销的已不占用库存）
    const activeRecords = records.filter(r => !r.reversedAt);
    const totalOriginal = activeRecords.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const totalReturned = activeRecords.reduce((s, r) => s + (Number(r.returnedQuantity) || 0), 0);
    const totalReturnable = totalOriginal - totalReturned;
    // 取所有行的单位（通常一致，取第一个非空）
    const unit = activeRecords.find(r => r.unit)?.unit || '';
    return { totalOriginal, totalReturned, totalReturnable, unit, count: activeRecords.length };
  }, [records]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中…</div>
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <div className="text-sm">暂无入库记录</div>
        <div className="text-xs mt-1 text-gray-400">
          通过「外购入库」「库存调拨」「种植留种」等入口添加后会显示在此
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600" />
          入库记录（共 {records.length} 条）
        </h4>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => {
            const headers = ['日期', '入库方式', '入库单号', '作物', '品种', '仓库', '原始数量', '已退数量', '可退数量', '单价', '总金额', '供应商', '操作员', '备注'];
            const data = records.map(r => [
              r.recordDate || '',
              SOURCE_MODULE_MAP[r.sourceModule || ''] || r.sourceModule || '',
              r.id || '',
              r.cropName || '',
              r.varietyName || '',
              r.warehouseName || '',
              r.quantity ?? 0,
              r.returnedQuantity ?? 0,
              (r.quantity || 0) - (r.returnedQuantity || 0),
              r.unitPrice ?? 0,
              r.totalAmount ?? 0,
              r.supplierName || '',
              r.operatorName || '',
              r.notes || '',
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            ws['!cols'] = headers.map(() => ({ wch: 16 }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '入库记录');
            // 2026-07-10 P0-1 修复：用 todayLocal() 替代 toISOString() 避免 UTC 时区 bug
            const today = todayLocal().replace(/-/g, '');
            XLSX.writeFile(wb, `入库记录_${today}_${records.length}条.xlsx`);
          }}
        >
          <Download className="w-4 h-4 mr-1" />
          导出 Excel
        </Button>
      </div>
      {/* 顶部汇总条 — 让用户一眼看到退库累计（无需切换 Tab） */}
      <div className="grid grid-cols-4 gap-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <div>
          <div className="text-xs text-amber-700">入库条数</div>
          <div className="text-lg font-semibold text-amber-900">{summary.count} <span className="text-xs font-normal">条</span></div>
        </div>
        <div>
          <div className="text-xs text-amber-700">原始数量</div>
          <div className="text-lg font-semibold text-amber-900">
            {summary.totalOriginal.toLocaleString()} <span className="text-xs font-normal">{summary.unit}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-amber-700">已退数量</div>
          <div className="text-lg font-semibold text-amber-900">
            {summary.totalReturned > 0 ? (
              <span className="text-red-600">{summary.totalReturned.toLocaleString()} <span className="text-xs font-normal">{summary.unit}</span></span>
            ) : (
              <span className="text-gray-400 text-sm">—</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-amber-700">可退数量</div>
          <div className="text-lg font-semibold text-amber-900">
            {summary.totalReturnable.toLocaleString()} <span className="text-xs font-normal">{summary.unit}</span>
          </div>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-blue-500 text-white sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left">日期</th>
              <th className="px-2 py-2 text-left">入库方式</th>
              <th className="px-2 py-2 text-left">入库单号</th>
              <th className="px-2 py-2 text-left">作物</th>
              <th className="px-2 py-2 text-left">品种</th>
              <th className="px-2 py-2 text-left">仓库</th>
              <th className="px-2 py-2 text-right">原始数量</th>
              <th className="px-2 py-2 text-right">已退数量</th>
              <th className="px-2 py-2 text-right">可退数量</th>
              <th className="px-2 py-2 text-right">单价</th>
              <th className="px-2 py-2 text-right">总金额</th>
              <th className="px-2 py-2 text-left">供应商</th>
              <th className="px-2 py-2 text-left">操作员</th>
              <th className="px-2 py-2 text-left">备注</th>
              {/* 2026-07-18: 冲销按钮列（C-1 修复） */}
              <th className="px-2 py-2 text-left w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const returnable = (r.quantity || 0) - (r.returnedQuantity || 0);
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1.5">{r.recordDate || '-'}</td>
                  <td className="px-2 py-1.5">
                    <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded text-xs">
                      {SOURCE_MODULE_MAP[r.sourceModule || ''] || r.sourceModule || '-'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <code className="text-xs">{r.id || '-'}</code>
                  </td>
                  <td className="px-2 py-1.5">{r.cropName || '-'}</td>
                  <td className="px-2 py-1.5">{r.varietyName || '-'}</td>
                  <td className="px-2 py-1.5">{r.warehouseName || '-'}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{(r.quantity || 0).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right">
                    {(r.returnedQuantity || 0) > 0 ? (
                      <span className="text-amber-600 font-medium">{(r.returnedQuantity || 0).toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={returnable > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                      {returnable.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">{(r.unitPrice || 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">{(r.totalAmount || 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5">{r.supplierName || '-'}</td>
                  <td className="px-2 py-1.5">{r.operatorName || '-'}</td>
                  <td
                    className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]"
                    title={r.notes || ''}
                  >
                    {r.notes || '-'}
                  </td>
                  {/* 2026-07-18: 冲销按钮（C-1 修复） */}
                  <td className="px-2 py-1.5">
                    {r.reversedAt ? (
                      <Badge variant="destructive" className="text-xs">已冲销</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReversingRecord(r)}
                        disabled={r.recordSource !== 'inventory_inbound_records' || returnable <= 0}
                        title={returnable <= 0 ? '已全部退完，无需冲销' : '冲销此入库'}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2026-07-18: 冲销确认对话框（C-1 修复） */}
      <Dialog open={reversingRecord !== null} onOpenChange={(open) => { if (!open) setReversingRecord(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              冲销入库记录
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {/* 完整 context 显示：让用户清楚知道要冲什么 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">入库单号</span>
                <code className="text-xs font-mono text-gray-700">{reversingRecord?.id}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">入库方式</span>
                <span className="text-gray-700">
                  {SOURCE_MODULE_MAP[reversingRecord?.sourceModule || ''] || reversingRecord?.sourceModule || '外购入库'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">入库日期</span>
                <span className="text-gray-700">{reversingRecord?.recordDate || '—'}</span>
              </div>
              <div className="border-t border-gray-200 pt-1.5 mt-1.5 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">原始入库数量</span>
                  <span className="text-gray-700">{(reversingRecord?.quantity || 0).toLocaleString()} {reversingRecord?.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">已退数量</span>
                  <span className="text-amber-600">{(reversingRecord?.returnedQuantity || 0).toLocaleString()} {reversingRecord?.unit}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-700">本次可冲销数量</span>
                  <span className="text-red-600 text-base">
                    {((reversingRecord?.quantity || 0) - (reversingRecord?.returnedQuantity || 0)).toLocaleString()} {reversingRecord?.unit}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-xs">冲销后将：</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
              <li>入库记录标记为「已冲销」（<code>inbound_edit_log</code> 留痕）</li>
              <li>种源 <code className="font-mono text-gray-700">{record.seedCode}</code> 可用数量相应减少</li>
              <li className="text-red-600 font-medium">此操作不可撤销（需新建正向入库单补偿）</li>
            </ul>

            <div>
              <Label>冲销原因 <span className="text-red-600">*</span></Label>
              <Textarea
                value={reverseReason}
                onChange={e => setReverseReason(e.target.value.slice(0, 200))}
                placeholder="录入错误 / 重复提交 / 误操作..."
                rows={2}
                maxLength={200}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>必填，将写入审计日志</span>
                <span>{reverseReason.length} / 200</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReversingRecord(null); setReverseReason(''); }}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={!reverseReason.trim() || reverseSubmitting}
              onClick={handleReverse}
            >
              {reverseSubmitting ? (
                <>
                  <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                  冲销中...
                </>
              ) : (
                '确认冲销'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * 2026-07-18: 合并历史 Tab
 * 显示本种源历史合并过的种源 ID 列表（来自 planting_self_kept 重复种源合并）
 */
function MergeHistoryPanel({ record }: { record: SeedSource }) {
  const ids = record.mergedFromIds || [];
  return (
    <div className="space-y-3">
      <Alert className="border-cyan-200 bg-cyan-50">
        <Layers className="w-4 h-4 text-cyan-600" />
        <AlertDescription>
          <div className="font-medium text-cyan-900">种源合并说明</div>
          <div className="mt-1 text-sm text-cyan-700">
            本种源 <code className="font-mono">{record.seedCode}</code> 是由 <strong>{ids.length}</strong> 条历史重复种源合并而成。
            合并操作由「内部种源去重迁移脚本」或运行时写时合并触发。
          </div>
          <div className="mt-2 text-xs text-cyan-600">
            <div>• 合并时间：{record.lastReflowAt || '未知'}</div>
            <div>• 合并回流次数：<strong>{record.reflowCount ?? 0}</strong> 次</div>
            <div>• 合并后总数量：<strong>{(record.quantity || 0).toLocaleString()}</strong> {record.unit}</div>
          </div>
        </AlertDescription>
      </Alert>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-200">
          被合并的历史种源（共 {ids.length} 条）
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
          {ids.map((id, idx) => (
            <div key={idx} className="px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-8">#{idx + 1}</span>
                <code className="text-xs font-mono text-gray-700">{id}</code>
              </div>
              <Badge variant="secondary" className="text-xs">archived</Badge>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        被合并的种源记录已标记为 archived，不再在种源列表显示，但保留追溯链路。如需恢复，请联系管理员。
      </p>
    </div>
  );
}

export function DetailModal({ isOpen, onClose, record }: DetailModalProps) {
  const hasTransferSource = !!record.transferredFromStockId;

  const extraTabs: Array<{
    key: string
    label: string
    icon: React.ReactNode
    content: React.ReactNode
  }> = []

  // 调拨来源 tab — 仅库存调拨入库的种源显示
  if (hasTransferSource) {
    extraTabs.push({
      key: 'transfer-source',
      label: '调拨来源',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      content: <TransferSourcePanel record={record} />,
    })
  }

  // 2026-07-06 Bug 19：所有种源都显示「入库记录」Tab
  // 商品种源入库（SeedSourceInboundModal）+ 调拨入种源（executeTransferToSource）+ 追加调拨入库（append-from-inventory）
  // 三条入库路径都通过 /api/seed-sources/:id/history-inbound 端点查 inventory_inbound_records
  extraTabs.push({
    key: 'inbound-records',
    label: '入库记录',
    icon: <Package className="w-4 h-4" />,
    tooltip: '所有入库流水（含外购入库、库存调拨、追加入库），来自 inventory_inbound_records 表。',
    content: <InboundRecordsPanel seedSourceId={record.id} />,
  })

  // 2026-07-18: 种源合并历史 Tab（仅当有 mergedFromIds 时显示）
  if (record.mergedFromIds && record.mergedFromIds.length > 0) {
    extraTabs.push({
      key: 'merge-history',
      label: `合并历史 (${record.mergedFromIds.length})`,
      icon: <Layers className="w-4 h-4" />,
      tooltip: '本种源历史合并过的种源 ID 列表（来自 planting_self_kept 重复种源合并）',
      content: <MergeHistoryPanel record={record} />,
    });
  }

  // 使用记录 tab — 所有种源都显示（被育苗使用 + 种植移入/移出）
  extraTabs.push({
    key: 'move-to-plantings',
    label: '使用记录',
    icon: <MoveRight className="w-4 h-4" />,
    tooltip: '记录该种源被育苗/种植环节调用的全部流水。',
    content: <UsageRecordsPanel seedSourceId={record.id} />,
  })

  const originKey = record.sourceOrigin || (record.transferredFromStockId ? 'transfer_from_inventory' : 'external');
  const mode = MODE_CONFIG[originKey] || MODE_CONFIG['external'];

  return (
    <EntityDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="种源详情"
      basicInfoPanel={<SeedSourceBasicInfo record={record} />}
      entity="seed-sources"
      entityId={record.id}
      entityCode={record.seedCode}
      typeColumn={{
        label: '入库方式',
        value: mode.label,
      }}
      extraTabs={extraTabs}
      // 2026-07-05: 弹窗宽度 +30%（xl → xxxl：max-w-4xl → max-w-6xl）让"使用记录" Tab 字段完整展示
      size="xxxl"
    />
  );
}
