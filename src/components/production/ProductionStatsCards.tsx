import { Layers, PlayCircle, CheckCircle2, FileEdit, CheckCheck } from 'lucide-react';
import { useMemo } from 'react';
import { CropBatch } from '../../types';

interface ProductionStatsCardsProps {
  batches: CropBatch[];
}

export function ProductionStatsCards({ batches }: ProductionStatsCardsProps) {
  // M-06: useMemo 缓存派生统计，batches 不变就不重算（避免 5 次 filter × 每次渲染）
  const stats = useMemo(() => [
    {
      label: '总批次',
      value: batches.length,
      color: 'bg-blue-500',
      icon: Layers,
    },
    {
      label: '执行中',
      // P0-06: 单值匹配 in_progress（排除 published），更准确反映"在执行"状态
      value: batches.filter(b => b.batchStatus === 'in_progress').length,
      color: 'bg-emerald-500',
      icon: PlayCircle,
    },
    {
      // P1 修复：聚合"已提交审批"的所有状态（之前只统计 published，但 handleSubmitForApproval
      // 实际写 pending/pending_complete/approved，published 永远为 0）
      label: '已审批',
      value: batches.filter(b =>
        b.batchStatus === 'pending' ||
        b.batchStatus === 'pending_complete' ||
        b.batchStatus === 'published' ||
        b.batchStatus === 'approved'
      ).length,
      color: 'bg-cyan-500',
      icon: CheckCheck,
    },
    {
      label: '已完成',
      value: batches.filter(b => b.batchStatus === 'completed').length,
      color: 'bg-green-600',
      icon: CheckCircle2,
    },
    {
      label: '草稿/已作废',
      value: batches.filter(b => b.batchStatus === 'draft' || b.batchStatus === 'cancelled').length,
      color: 'bg-gray-500',
      icon: FileEdit,
    },
  ], [batches]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
