// 供应商管理页头
import { Truck } from 'lucide-react';

interface PageHeaderProps {
  title?: string;
}

export default function PageHeader({ title = '供应商管理' }: PageHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
        <Truck className="w-5 h-5 text-emerald-600" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
    </div>
  );
}
