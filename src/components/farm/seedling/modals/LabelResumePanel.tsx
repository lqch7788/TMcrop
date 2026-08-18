/**
 * 标签履历面板 — 右侧履历展示（时间线 / 表格 双模式切换）
 * 从 SeedlingLabelManageModal 右侧面板提取
 * 2026-07-01: 新增表格视图，默认时间线视图，右上角切换按钮
 */
import React, { useState } from 'react';
import { Tag, List, Clock } from 'lucide-react';
import { LabelResumeTimeline } from '@/components/ui';
import type { LabelResumeEntry } from '@/components/ui/LabelResumeTimeline';
import type { PlantLabel, PlantLabelResume } from '@/stores/usePlantLabelStore';

// 操作类型中文映射（与 LabelResumeTimeline 内部一致；2026-08-17 新增 'move'/'patch'/'reprint'）
const OP_LABEL: Record<string, string> = {
  move: '位置变更',
  patch: '属性补录',
  reprint: '补印',
  move_in: '移入（历史）',
  move_out: '移出（历史）',
  mark: '标记',
  void: '作废',
};

interface LabelResumePanelProps {
  selectedLabel: PlantLabel | undefined;
  resumes: PlantLabelResume[];
  loading: boolean;
}

export function LabelResumePanel({ selectedLabel, resumes, loading }: LabelResumePanelProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // 未选择标签
  if (!selectedLabel) {
    return (
      <div className="py-12 text-center text-gray-400">
        <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>请在左侧选择一个标签查看履历</p>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 映射 PlantLabelResume[] → LabelResumeEntry[]（含数量追踪 + 原因字段）
  const entries: LabelResumeEntry[] = resumes.map((r: any) => ({
    id: r.id,
    operationType: r.operationType,
    fromAreaName: r.fromAreaName || undefined,
    toAreaName: r.toAreaName || undefined,
    operationDate: r.operationDate,
    markName: r.markName || undefined,
    markColor: r.markColor || undefined,
    operatorName: r.operatorName || undefined,
    imageBase64: r.imageBase64 || undefined,
    quantityChange: r.quantityChange ?? null,
    quantityAfter: r.quantityAfter ?? null,
    reason: r.reason || undefined,
  }));

  return (
    <div>
      {/* 视图切换 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          履历记录（{resumes.length} 条）
        </span>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
              viewMode === 'timeline' ? 'bg-white shadow text-emerald-700 font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> 时间线
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
              viewMode === 'table' ? 'bg-white shadow text-emerald-700 font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-3.5 h-3.5" /> 表格
          </button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        <LabelResumeTimeline
          entries={entries}
          currentLabel={undefined}
          currentMark={undefined}
        />
      ) : (
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-blue-500 text-white sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left whitespace-nowrap">日期</th>
                <th className="px-2 py-2 text-left whitespace-nowrap">操作</th>
                <th className="px-2 py-2 text-left">从区域</th>
                <th className="px-2 py-2 text-left">到区域</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">数量变化</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">剩余</th>
                <th className="px-2 py-2 text-left">标记</th>
                <th className="px-2 py-2 text-left">操作员</th>
                <th className="px-2 py-2 text-left">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 align-top">
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.operationDate || '-'}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                      r.operationType === 'move_in' ? 'bg-emerald-100 text-emerald-700' :
                      r.operationType === 'move_out' ? 'bg-orange-100 text-orange-700' :
                      r.operationType === 'mark' ? 'bg-purple-100 text-purple-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {OP_LABEL[r.operationType] || r.operationType}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600">{r.fromAreaName || '-'}</td>
                  <td className="px-2 py-1.5 text-gray-600">{r.toAreaName || '-'}</td>
                  <td className="px-2 py-1.5 text-right">
                    {r.quantityChange != null ? (
                      <span className={r.quantityChange > 0 ? 'text-emerald-600' : 'text-orange-600'}>
                        {r.quantityChange > 0 ? '+' : ''}{r.quantityChange}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-600">
                    {r.quantityAfter != null ? r.quantityAfter : '-'}
                  </td>
                  <td className="px-2 py-1.5">
                    {r.markName ? (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-xs text-white"
                        style={{ backgroundColor: r.markColor || '#9ca3af' }}
                      >
                        {r.markName}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600">{r.operatorName || '-'}</td>
                  <td className="px-2 py-1.5 text-gray-500 max-w-[160px] truncate" title={r.reason || ''}>
                    {r.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LabelResumePanel;
