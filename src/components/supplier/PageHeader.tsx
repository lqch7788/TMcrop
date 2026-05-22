// 供应商管理页头 - 图标样式参照物料入库 PageHeader 统一
import { Truck } from 'lucide-react';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function PageHeader({ title = '供应商管理', subtitle }: PageHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
