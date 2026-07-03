/**
 * 2026-07-03 v4：留种历史记录表（模式自适应 + 分页）
 * - 种子模式显示: 发芽率 / 千粒重 / 纯度 / 含水率 / 处理 / 成熟度 / 预估贮藏期
 * - 营养体模式显示: 规格 / 芽眼数 / 检疫 / 休眠 / 繁殖潜力
 */

import { useState } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import {
  HARVEST_PART_LABELS,
  VEGETATIVE_HARVEST_PARTS,
  getSeedSavingRateColor,
} from './seedSavingConstants'
import type { SeedSavingRecord } from '@/services/apiPlantingSubRecordService'

interface SeedSavingHistoryTableProps {
  records: SeedSavingRecord[]
  editingId: string | null
  onEdit: (record: SeedSavingRecord) => void
  onDelete: (recordId: string) => void
}

const labelMap: Record<string, string> = {
  direct_planting: '直接播种', cold_storage: '入库冷藏', distribution: '分发交换',
  sale: '销售', germplasm_bank: '种质保存', propagation: '继续扩繁', other: '其他',
}

export function SeedSavingHistoryTable({ records, editingId, onEdit, onDelete }: SeedSavingHistoryTableProps) {
  const isVeg = (r: SeedSavingRecord) =>
    r.preservationMode === 'vegetative' || VEGETATIVE_HARVEST_PARTS.includes(r.harvestPart as any)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRecords = records.slice((safePage - 1) * pageSize, safePage * pageSize)
  return (
    <div>
    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-blue-500 text-white sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-left">批次号</th>
            <th className="px-2 py-2 text-left">株号</th>
            <th className="px-2 py-2 text-left">采收部位</th>
            <th className="px-2 py-2 text-left">数量</th>
            <th className="px-2 py-2 text-left">用途</th>
            <th className="px-2 py-2 text-left">模式</th>
            <th className="px-2 py-2 text-left">关键指标</th>
            <th className="px-2 py-2 text-left">存储</th>
            <th className="px-2 py-2 text-left">操作人</th>
            <th className="px-2 py-2 text-left">备注</th>
            <th className="px-2 py-2 text-center w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {pageRecords.map((r) => {
            const veg = isVeg(r)
            return (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 whitespace-nowrap">{r.recordDate}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{r.lotNumber || '-'}</td>
                <td className="px-2 py-1.5 font-mono text-amber-700 text-xs">{r.plantMarker}</td>
                <td className="px-2 py-1.5">{r.harvestPart ? HARVEST_PART_LABELS[r.harvestPart] || r.harvestPart : '-'}</td>
                <td className="px-2 py-1.5 text-right">{r.quantity != null ? `${r.quantity}${r.unit || ''}` : '-'}</td>
                <td className="px-2 py-1.5 text-xs">{r.purpose ? labelMap[r.purpose] || r.purpose : '-'}</td>
                <td className="px-2 py-1.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                    veg ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>{veg ? '营养体' : '种子'}</span>
                </td>
                <td className="px-2 py-1.5 text-xs">
                  {veg ? (
                    <div className="space-y-0.5">
                      {r.sizeGrade ? <div>规格: {r.sizeGrade === 'large' ? '大' : r.sizeGrade === 'medium' ? '中' : '小'}</div> : null}
                      {r.budNodeCount != null ? <div>芽眼/节: <span className="font-medium">{r.budNodeCount}</span></div> : null}
                      {r.healthStatus ? <div>检疫: {r.healthStatus === 'healthy' ? '✓健康' : r.healthStatus === 'suspicious' ? '⚠可疑' : '✗带病'}</div> : null}
                      {!r.sizeGrade && r.budNodeCount == null && !r.healthStatus ? '-' : null}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {r.germinationRate != null ? (
                        <div className={getSeedSavingRateColor(r.germinationRate)}>
                          发芽率 <span className="font-medium">{r.germinationRate}%</span>
                        </div>
                      ) : null}
                      {r.thousandSeedWeight != null ? <div>千粒重: <span className="font-medium">{r.thousandSeedWeight}g</span></div> : null}
                      {r.purity != null ? <div>纯度: {r.purity}%</div> : null}
                      {r.moistureContent != null ? <div>含水率: {r.moistureContent}%</div> : null}
                      {r.germinationRate == null && r.thousandSeedWeight == null && r.purity == null && r.moistureContent == null ? '-' : null}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5 text-xs">
                  {r.storageLocation ? <div>{r.storageLocation}</div> : null}
                  {r.containerType ? <div className="text-gray-400">{r.containerType}</div> : null}
                  {!r.storageLocation && !r.containerType ? '-' : null}
                </td>
                <td className="px-2 py-1.5">{r.operator || '-'}</td>
                <td className="px-2 py-1.5 text-gray-500 truncate max-w-[150px]">{r.remarks || '-'}</td>
                <td className="px-2 py-1.5 text-center">
                  {editingId === r.id ? (
                    <span className="text-xs text-amber-600">编辑中</span>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(r)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    {records.length > pageSize && (
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>共 {records.length} 条 · 第 {safePage}/{totalPages} 页</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">上一页</button>
          <span>{safePage} / {totalPages}</span>
          <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">下一页</button>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="px-2 py-1 border border-gray-300 rounded">
            <option value={10}>10/页</option><option value={20}>20/页</option><option value={50}>50/页</option>
          </select>
        </div>
      </div>
    )}
    </div>
  )
}
