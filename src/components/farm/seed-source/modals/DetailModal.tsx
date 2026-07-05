/**
 * 种源详情弹窗（2026-07-02 重构）
 * 种源已退化为纯仓库角色，移除繁育种源相关字段。
 * 三入口模式：外购入库 / 库存调拨 / 种植留种
 * Tab：基本信息 / 来源详情（条件）/ 调拨来源（条件）/ 使用记录 / 操作历史
 * 2026-07-05: "调入种植" Tab 改名为 "使用记录"（更准确反映被育苗/种植使用两种场景）
 */

import { useEffect, useState } from 'react';
import { ArrowLeftRight, MoveRight, Store, Sprout, Download } from 'lucide-react';
import { Alert, AlertDescription, Button } from '@/components/ui';
import * as XLSX from 'xlsx';
import { EntityDetailModal } from '@/components/ui/EntityDetailModal';
import { SeedSource } from '../../../../types/crop';
import { STOCK_STATUS_MAP, UNIT_MAP, SOURCE_TYPE_MAP, SOURCE_ORIGIN_MAP } from '../../../../constants/cropConstants';
import { computeStockStatus } from '../../../../lib/stockStatus';
import { getSeedSourceUsageRecords, type SeedSourceUsageRecord } from '@/services/apiSeedSourceService';

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
        <div className="grid grid-cols-2 gap-4">
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
            <span className="text-sm text-gray-900">{record.seedForm || '—'}</span>
          </div>
        </div>
      </div>

      {/* 库存信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">库存信息</h4>
        <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
              <span className="text-sm text-gray-900">{record.seedForm || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 其他信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
        <div className="grid grid-cols-2 gap-4">
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
      .catch((e) => setError((e && (e as { message?: string }).message) || '加载失败'))
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
      <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg">
        暂无使用记录
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
              r.seedForm || '',
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
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
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
                <td className="px-2 py-1.5">{r.seedForm || '-'}</td>
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
    />
  );
}
