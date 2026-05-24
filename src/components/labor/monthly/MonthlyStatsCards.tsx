/**
 * 月报统计卡片组件
 */

interface MonthlyStatsCardsProps {
  stats: {
    totalWorkdays: number;
    attendanceRate: string;
    completedTasks: number;
    totalHarvest: string;
  };
}

export function MonthlyStatsCards({ stats }: MonthlyStatsCardsProps) {
  const cards = [
    {
      icon: '📅',
      value: stats.totalWorkdays,
      label: '总工日数',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      icon: '👥',
      value: stats.attendanceRate,
      label: '出勤率',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      icon: '✓',
      value: stats.completedTasks,
      label: '已完成任务',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      icon: '📦',
      value: stats.totalHarvest,
      label: '总产量',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}
            >
              <span className={`${card.textColor} text-base`}>{card.icon}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
