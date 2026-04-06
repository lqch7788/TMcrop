// 物料管理页面头部组件
import { Package, AlertTriangle } from 'lucide-react';

interface MaterialsHeaderProps {
  lowStockCount: number;
  showLowStock: boolean;
  onLowStockClick: () => void;
}

export default function MaterialsHeader({
  lowStockCount,
  showLowStock,
  onLowStockClick,
}: MaterialsHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">仓库物料</h1>
            <p className="text-gray-500">仓库物料库存管理</p>
          </div>
        </div>
        {lowStockCount > 0 && (
          <button
            onClick={onLowStockClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showLowStock
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">库存不足</span>
            <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
              {lowStockCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
