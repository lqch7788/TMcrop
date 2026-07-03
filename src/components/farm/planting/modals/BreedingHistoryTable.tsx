/**
 * 2026-07-03 v3：育种历史记录表（模式自适应）
 * - 10 列布局
 * - 有性/无性 模式 badge（合并繁殖方式）
 * - 父本/母本/母株 列：sexual 双 badge，asexual 单 badge
 * - 关键指标 列：sexual 显示结实率，asexual 显示繁殖系数
 * - 内置分页（10/20/50/页）
 */

import { useState } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { ASEXUAL_OPERATION_TYPES, OPERATION_TYPE_LABELS, PROPAGATION_METHOD_LABELS, getRateColor } from './recordModalConstants'
import type { BreedingRecord } from '@/services/apiPlantingSubRecordService'

interface BreedingHistoryTableProps {
  records: BreedingRecord[]
  editingId: string | null
  onEdit: (record: BreedingRecord) => void
  onDelete: (recordId: string) => void
}

export function BreedingHistoryTable({ records, editingId, onEdit, onDelete }: BreedingHistoryTableProps) {
  const isAsexual = (r: BreedingRecord) =>
    r.reproductionMode === 'asexual' || ASEXUAL_OPERATION_TYPES.includes(r.operationType)
  // 分页
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const pageRecords = records.slice(startIdx, startIdx + pageSize)
  return (
    <div>
    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-blue-500 text-white sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-left">操作</th>
            <th className="px-2 py-2 text-left">世代</th>
            <th className="px-2 py-2 text-left">模式 / 方式</th>
            <th className="px-2 py-2 text-left">父本 / 母本（性）<br />母株（无性）</th>
            <th className="px-2 py-2 text-left">目标性状</th>
            <th className="px-2 py-2 text-left">关键指标</th>
            <th className="px-2 py-2 text-left">操作人</th>
            <th className="px-2 py-2 text-left">备注</th>
            <th className="px-2 py-2 text-center w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {pageRecords.map((r) => {
            const asexual = isAsexual(r)
            return (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 whitespace-nowrap">{r.recordDate}</td>
                <td className="px-2 py-1.5">{OPERATION_TYPE_LABELS[r.operationType] || r.operationType}</td>
                <td className="px-2 py-1.5">{r.generation || '-'}</td>
                <td className="px-2 py-1.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                    asexual ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {asexual
                      ? `无性${r.propagationMethod ? '·' + (PROPAGATION_METHOD_LABELS[r.propagationMethod] || r.propagationMethod) : ''}`
                      : '有性'}
                  </span>
                </td>
                <td className="px-2 py-1.5 font-mono text-xs">
                  {asexual ? (
                    r.motherPlantCode ? (
                      <Badge variant="outline" className="text-xs">{r.motherPlantCode}</Badge>
                    ) : '-'
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {r.parentMaleCode ? (
                        <Badge variant="outline" className="text-xs">
                          ♂{r.parentMaleCode}
                        </Badge>
                      ) : null}
                      {r.parentFemaleCode ? (
                        <Badge variant="outline" className="text-xs">
                          ♀{r.parentFemaleCode}
                        </Badge>
                      ) : null}
                      {!r.parentMaleCode && !r.parentFemaleCode ? '-' : null}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {(() => {
                    const traits = typeof r.targetTraits === 'string'
                      ? (() => { try { return JSON.parse(r.targetTraits) } catch { return [] } })()
                      : r.targetTraits
                    return Array.isArray(traits) && traits.length > 0 ? (
                      <div className="flex flex-wrap gap-0.5">
                        {traits.map((t: string) => (
                          <span key={t} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded">{t}</span>
                        ))}
                      </div>
                    ) : '-'
                  })()}
                </td>
                <td className="px-2 py-1.5 text-xs">
                  {asexual ? (
                    <div className="space-y-0.5">
                      <div>
                        <span className="text-gray-500">接种 </span>
                        <span className="text-blue-700 font-medium">{r.inoculationCount ?? '-'}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-500">成活 </span>
                        <span className="text-emerald-700 font-medium">{r.survivalCount ?? '-'}</span>
                      </div>
                      {r.inoculationCount && r.inoculationCount > 0 ? (() => {
                        const rate = ((r.survivalCount || 0) / r.inoculationCount) * 100
                        const color = getRateColor(rate, 'asexual')
                        return (
                          <div className={color}>
                            繁殖系数 <span className="font-medium">{rate.toFixed(1)}%</span>
                          </div>
                        )
                      })() : null}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div>
                        <span className="text-gray-500">结实 </span>
                        <span className="text-emerald-700 font-medium">{r.fruitCount ?? '-'}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-500">种子 </span>
                        <span className="text-amber-700 font-medium">{r.seedCount ?? '-'}</span>
                      </div>
                      {r.pollinatedFlowerCount && r.pollinatedFlowerCount > 0 ? (() => {
                        const rate = ((r.fruitCount || 0) / r.pollinatedFlowerCount) * 100
                        const color = getRateColor(rate, 'sexual')
                        return (
                          <div className={color}>
                            结实率 <span className="font-medium">{rate.toFixed(1)}%</span>
                            <span className="text-gray-400 ml-1">({r.fruitCount || 0}/{r.pollinatedFlowerCount})</span>
                          </div>
                        )
                      })() : null}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5">{r.operator || '-'}</td>
                <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]">{r.remarks || '-'}</td>
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
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
          >
            上一页
          </button>
          <span>{safePage} / {totalPages}</span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
          >
            下一页
          </button>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            <option value={10}>10/页</option>
            <option value={20}>20/页</option>
            <option value={50}>50/页</option>
          </select>
        </div>
      </div>
    )}
    </div>
  )
}
