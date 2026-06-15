import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useWarehouseMaterialStore } from '../../../stores/useWarehouseMaterialStore';
import { CardSkeleton } from './CardSkeleton';

export function InventoryAlertCard() {
  const navigate = useNavigate();
  const items = useWarehouseMaterialStore((s) => s.items);
  const isLoading = useWarehouseMaterialStore((s) => s.isLoading);
  const loadItems = useWarehouseMaterialStore((s) => s.loadItems);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 统计库存不足的物料数量（当前库存 < 最低安全库存）
  const safeItems = Array.isArray(items) ? items : [];
  const inventoryAlerts = useMemo(() => {
    const lowStockItems = safeItems.filter(
      (item) => item.quantity < item.minStock
    );
    return {
      lowStockCount: lowStockItems.length,
      materials: lowStockItems.map((item) => ({
        name: item.name,
        stock: item.quantity,
        safeStock: item.minStock,
      })),
    };
  }, [safeItems]);

  return (
    <button
      type="button"
      onClick={() => navigate('/crop-inventory')}
      className="flex flex-col text-left w-full h-full bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
      aria-label={`库存预警：${inventoryAlerts.lowStockCount} 种物料库存不足，点击查看库存`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-orange-500 to-red-600">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">库存预警</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-red-500">{inventoryAlerts.lowStockCount}</span>
          <span className="text-sm text-gray-500">种物料库存不足</span>
        </div>
        <p className="text-xs text-gray-600">低于安全库存，请及时采购</p>
      </div>
    </button>
  );
}
