import { useEffect, useMemo } from 'react';
import { Package } from 'lucide-react';
import { useWarehouseMaterialStore } from '../../../stores/useWarehouseMaterialStore';

export function InventoryAlertCard() {
  const items = useWarehouseMaterialStore((s) => s.items);
  const loadItems = useWarehouseMaterialStore((s) => s.loadItems);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 统计库存不足的物料数量（当前库存 < 最低安全库存）
  const inventoryAlerts = useMemo(() => {
    const lowStockItems = items.filter(
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
  }, [items]);

  return (
    <div className="bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md transition-shadow p-4">
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
        <p className="text-xs text-gray-400">低于安全库存，请及时采购</p>
      </div>
    </div>
  );
}
