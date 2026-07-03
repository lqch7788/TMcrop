/**
 * 2026-07-03 v3：留种历史记录表
 * 8 列布局（日期/株号/部位/数量/单位/操作人/备注/操作）
 */

import { Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { SeedSavingRecord, SeedSavingPart } from '@/services/apiPlantingSubRecordService'

const HARVEST_PART_LABELS: Record<SeedSavingPart, string> = {
  fruit: '果实',
  seed: '种子',
  whole_plant: '全株',
  root: '根',
  stem: '茎',
  leaf: '叶',
  other: '其他',
}

interface SeedSavingHistoryTableProps {
  records: SeedSavingRecord[]
  editingId: string | null
  onEdit: (record: SeedSavingRecord) => void
  onDelete: (recordId: string) => void
}

export function SeedSavingHistoryTable({ records, editingId, onEdit, onDelete }: SeedSavingHistoryTableProps) {
  return (
    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-blue-500 text-white sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-left">留种株号</th>
            <th className="px-2 py-2 text-left">采收部位</th>
            <th className="px-2 py-2 text-left">数量</th>
            <th className="px-2 py-2 text-left">单位</th>
            <th className="px-2 py-2 text-left">操作人</th>
            <th className="px-2 py-2 text-left">备注</th>
            <th className="px-2 py-2 text-center w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-2 py-1.5 whitespace-nowrap">{r.recordDate}</td>
              <td className="px-2 py-1.5 font-mono text-amber-700">{r.plantMarker}</td>
              <td className="px-2 py-1.5">{r.harvestPart ? (HARVEST_PART_LABELS[r.harvestPart] || r.harvestPart) : '-'}</td>
              <td className="px-2 py-1.5">{r.quantity ?? '-'}</td>
              <td className="px-2 py-1.5">{r.unit || '-'}</td>
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
