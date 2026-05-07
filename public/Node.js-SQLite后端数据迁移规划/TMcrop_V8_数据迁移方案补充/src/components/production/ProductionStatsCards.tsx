import { Layers, PlayCircle, CheckCircle2, FileEdit } from 'lucide-react';
import { CropBatch } from '../../types';

interface ProductionStatsCardsProps {
  batches: CropBatch[];
}

export function ProductionStatsCards({ batches }: ProductionStatsCardsProps) {
  const stats = [
    {
      label: '总批次',
      value: batches.length,
      color: 'bg-blue-500',
      icon: Layers,
    },
    {
      label: '执行中',
      value: batches.filter(b => b.batchStatus === 'published' || b.batchStatus === 'in_progress').length,
      color: 'bg-emerald-500',
      icon: PlayCircle,
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
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
