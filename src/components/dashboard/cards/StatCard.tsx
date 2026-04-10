import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  color: string;
  small?: boolean;
}

export function StatCard({ icon: Icon, label, value, trend, trendUp, color, small }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md transition-shadow ${small ? 'p-3' : 'p-6'}`}>
      <div className="flex items-center justify-between">
        <div className={`rounded-lg ${color} ${small ? 'p-2' : 'p-3'}`}>
          <Icon className={`text-white ${small ? 'w-4 h-4' : 'w-6 h-6'}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${!trendUp && 'rotate-180'}`} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className={`font-bold text-gray-900 ${small ? 'text-xl' : 'text-3xl'}`}>{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
