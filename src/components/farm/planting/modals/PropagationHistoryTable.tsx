/**
 * 2026-07-03 v3：繁殖历史记录表
 * 10 列布局（日期/温度/湿度/母株/子苗/状态/移栽位置/操作人/备注/操作）
 */

import { Edit2, Trash2 } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import type { SeedlingSeedlingPropagationRecord } from '@/services/apiSeedlingPropagationService'

const SEEDLING_STATUS_LABELS: Record<string, string> = {
  healthy: '健康',
  weak: '弱苗',
  diseased: '病害',
}

interface PropagationHistoryTableProps {
  records: SeedlingPropagationRecord[]
  editingId: string | null
  onEdit: (record: SeedlingPropagationRecord) => void
  onDelete: (recordId: string) => void
}

export function PropagationHistoryTable({ records, editingId, onEdit, onDelete }: PropagationHistoryTableProps) {
  return (
    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-blue-500 text-white sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-left">温度</th>
            <th className="px-2 py-2 text-left">湿度</th>
            <th className="px-2 py-2 text-left">母株</th>
            <th className="px-2 py-2 text-left">子苗</th>
            <th className="px-2 py-2 text-left">状态</th>
            <th className="px-2 py-2 text-left">移栽位置</th>
            <th className="px-2 py-2 text-left">操作人</th>
            <th className="px-2 py-2 text-left">备注</th>
            <th className="px-2 py-2 text-center w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-2 py-1.5 whitespace-nowrap">{r.recordDate}</td>
              <td className="px-2 py-1.5">{r.temperature != null ? `${r.temperature}℃` : '-'}</td>
              <td className="px-2 py-1.5">{r.humidity != null ? `${r.humidity}%` : '-'}</td>
              <td className="px-2 py-1.5">{r.motherPlantCount ?? '-'}</td>
              <td className="px-2 py-1.5 text-emerald-600 font-medium">{r.seedlingOutput ?? '-'}</td>
              <td className="px-2 py-1.5">
                {r.seedlingStatus ? (
                  <Badge variant="outline" className="text-xs">{SEEDLING_STATUS_LABELS[r.seedlingStatus] || r.seedlingStatus}</Badge>
                ) : '-'}
              </td>
              <td className="px-2 py-1.5 text-gray-500 truncate max-w-[120px]">{r.transplantPosition || '-'}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
