/**
 * 采收弹窗 — 历史记录表 + 去向累计
 * 2026-10-18：从 HarvestRecordModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui'
import { Download, Trash2 } from 'lucide-react'
import { DeleteErrorPanel } from '../../../inventory/DeleteErrorPanel'
import type { Planting, PlantingHarvestRecord } from '../../../../../types/crop'
import { getDestinationLabel, getSubTypeLabel } from './helpers'

interface HarvestHistorySectionProps {
  record: Planting
  harvestRecords: PlantingHarvestRecord[]
  deleteError: {
    message: string
    blockingRecords?: any[]
    blockingTransactions?: any[]
  } | null
  setDeleteError: Dispatch<SetStateAction<{
    message: string
    blockingRecords?: any[]
    blockingTransactions?: any[]
  } | null>>
  handleExport: () => void
  handleDelete: (id: string) => Promise<void>
}

export function HarvestHistorySection({
  record,
  harvestRecords,
  deleteError,
  setDeleteError,
  handleExport,
  handleDelete,
}: HarvestHistorySectionProps) {
  return (
    <>
        {/* 历史记录表 */}
        <div>
          {deleteError && (
            <DeleteErrorPanel
              blockingRecords={deleteError.blockingRecords}
              blockingTransactions={deleteError.blockingTransactions}
              message={deleteError.message}
              onClose={() => setDeleteError(null)}
            />
          )}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">历史记录 ({harvestRecords.length} 条)</h4>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={harvestRecords.length === 0}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
          {/* 2026-06-29: 强制按 create_time + record_date 倒序（最新在前），避免 store prepend 顺序异常 */}
          {(() => {
            const sortedHistory = [...harvestRecords].sort((a, b) => {
              const aTime = (a.createTime || '').toString()
              const bTime = (b.createTime || '').toString()
              if (aTime && bTime) return bTime.localeCompare(aTime)
              const aDate = (a.recordDate || '').toString()
              const bDate = (b.recordDate || '').toString()
              return bDate.localeCompare(aDate)
            })
            return sortedHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无采收记录</div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-blue-500 text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left">日期</th>
                    <th className="px-2 py-2 text-left">去向</th>
                    <th className="px-2 py-2 text-left">形态</th>
                    <th className="px-2 py-2 text-left">数量</th>
                    <th className="px-2 py-2 text-left">仓库</th>
                    <th className="px-2 py-2 text-left">操作员</th>
                    <th className="px-2 py-2 text-left">备注</th>
                    <th className="px-2 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5">{r.recordDate}</td>
                      <td className="px-2 py-1.5">{getDestinationLabel(r.destination)}</td>
                      {/* 2026-06-29: 采收形态优先于 subType 显示（planting_self_kept 新数据有 seedForm） */}
                      <td className="px-2 py-1.5">{(r as any).seedForm || getSubTypeLabel(r.subType)}</td>
                      <td className="px-2 py-1.5">{r.quantity}{r.unit ? ` ${r.unit}` : ''}</td>
                      <td className="px-2 py-1.5">{r.warehouseName || r.warehouseId || '-'}</td>
                      <td className="px-2 py-1.5">{r.operatorName || r.createBy || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]" title={r.notes || ''}>
                        {r.notes || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r.id)}
                          className="text-red-600"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )
          })()}
        </div>

        {/* 累计统计 + 总结束 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">去向累计</h4>
          {/* 2026-06-29: 4 列减为 3 列（合并残株回种源 + 自交种子 = 种植自留种） */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">采收入库：</span>
              <span className="font-bold text-blue-600">
                {(record.harvestToInventoryQty || 0).toLocaleString()} {record.unit || ''}
              </span>
            </div>
            <div>
              <span className="text-gray-600">种植自留种：</span>
              <span className="font-bold text-emerald-600">
                {(record.selfKeptToSourceQty || 0).toLocaleString()} {record.selfKeptToSourceUnit || record.unit || ''}
              </span>
            </div>
            {/* 2026-07-09：移除"直接废弃"累计展示 — 功能已下线；历史 disposeQty 仍存在 plantings 数据中（不再显示） */}
          </div>
          {/* 2026-06-28: 移除"总结束（软锁）"按钮 — 与操作列"正常/异常结束"功能重复 */}
        </div>
    </>
  )
}
