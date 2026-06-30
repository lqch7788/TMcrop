/**
 * 种源详情弹窗（2026-06-27 重构）
 * 使用通用 EntityDetailModal 包装，Tab：基本信息 / 追溯时间线 / 调拨来源（条件）/ 调入种植
 */

import { useEffect, useState } from 'react';
import { ArrowLeftRight, MoveRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui';
import { EntityDetailModal } from '@/components/ui/EntityDetailModal';
import { SeedSource } from '../../../../types/crop';
import { STOCK_STATUS_MAP, UNIT_MAP, SOURCE_TYPE_MAP } from '../../../../constants/cropConstants';
import { computeStockStatus } from '../../../../lib/stockStatus';
import { PropagationType } from '../../../../types/crop';
import { getSeedSourceMoveRecords, type SeedSourceMoveRecord } from '@/services/apiSeedSourceService';

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
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">种源类型：</span>
            <span className="text-sm text-gray-900">{SOURCE_TYPE_MAP[record.sourceType] || record.sourceType}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">供应商：</span>
            <span className="text-sm text-gray-900">{record.supplierName}</span>
          </div>
        </div>
      </div>

      {/* 库存信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">库存信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">采购日期：</span>
            <span className="text-sm text-gray-900">{record.purchaseDate}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">入库数量：</span>
            <span className="text-sm text-gray-900">{record.quantity} {formatUnit(record.unit)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">单价：</span>
            <span className="text-sm text-gray-900">¥{record.unitPrice}/{formatUnit(record.unit)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">总金额：</span>
            <span className="text-sm text-gray-900">¥{record.totalAmount.toLocaleString()}</span>
          </div>
          {/* 2026-06-30 合并：内部种源仓库不做育种，移除"初始数量"行（与入库数量合并） */}
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
            {record.propagationStartDate && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">开始日期：</span>
                <span className="text-sm text-gray-900">{record.propagationStartDate}</span>
              </div>
            )}
            {record.expectedHarvestDate && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">预计采收：</span>
                <span className="text-sm text-gray-900">{record.expectedHarvestDate}</span>
              </div>
            )}
            {record.actualHarvestDate && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">实际采收：</span>
                <span className="text-sm text-gray-900">{record.actualHarvestDate}</span>
              </div>
            )}
            {(record.parentMaleCode || record.parentFemaleCode) && (
              <div className="flex items-center col-span-2">
                <span className="text-sm text-gray-500 w-24">亲本信息：</span>
                <span className="text-sm text-gray-900">
                  {record.parentMaleCode && <span className="mr-3">♂{record.parentMaleCode}</span>}
                  {record.parentFemaleCode && <span>♀{record.parentFemaleCode}</span>}
                </span>
              </div>
            )}
            {record.motherPlantCode && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">母株编号：</span>
                <span className="text-sm text-gray-900">{record.motherPlantCode}</span>
              </div>
            )}
            {record.linkedPlantingCode && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">关联种植：</span>
                <span className="text-sm text-gray-900">{record.linkedPlantingCode}</span>
              </div>
            )}
            {record.breedingLocation && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">育种地点：</span>
                <span className="text-sm text-gray-900">{record.breedingLocation}</span>
              </div>
            )}
            {record.targetTraits && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">目标性状：</span>
                <span className="text-sm text-gray-900">{record.targetTraits}</span>
              </div>
            )}
            {record.generation && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">世代：</span>
                <span className="text-sm text-gray-900">{record.generation}</span>
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
 * 调入种植面板
 * 2026-06-30: 列示当前种源被调入/调出到种植单的全量履历。
 * 数据来源：GET /api/seed-sources/:id/move-records
 */
function MoveToPlantingsPanel({ seedSourceId }: { seedSourceId: string }) {
  const [records, setRecords] = useState<SeedSourceMoveRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!seedSourceId) return
    setLoading(true)
    setError(null)
    // 错误向上抛：捕获后在面板本地展示，不吞默认空数组（保持可观测）
    getSeedSourceMoveRecords(seedSourceId)
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
        暂无调入种植记录
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <MoveRight className="w-4 h-4 text-emerald-600" />
        调入种植记录（共 {records.length} 条）
      </h4>
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-blue-500 text-white sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left">日期</th>
              <th className="px-2 py-2 text-left">类型</th>
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
                <td className="px-2 py-1.5">{r.operationDate || '-'}</td>
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

  // 2026-06-30: 条件渲染两个 extra tab —
  //  - 调拨来源：有 transferredFromStockId 时（即来源是其他库存调拨）才显示
  //  - 调入种植：所有种源都显示（即便暂时没记录，也允许用户看到空态）
  const extraTabs: Array<{
    key: string
    label: string
    icon: React.ReactNode
    content: React.ReactNode
  }> = []

  if (hasTransferSource) {
    extraTabs.push({
      key: 'transfer-source',
      label: '调拨来源',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      content: <TransferSourcePanel record={record} />,
    })
  }

  extraTabs.push({
    key: 'move-to-plantings',
    label: '调入种植',
    icon: <MoveRight className="w-4 h-4" />,
    content: <MoveToPlantingsPanel seedSourceId={record.id} />,
  })

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
        label: '种源类型',
        value: record.sourceType ? (SOURCE_TYPE_MAP[record.sourceType] || record.sourceType) : '-',
      }}
      extraTabs={extraTabs}
    />
  );
}
