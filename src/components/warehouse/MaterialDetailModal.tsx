import { Package, Barcode } from 'lucide-react';
import { Material } from './MaterialFilters';
import { UnifiedModal } from '../ui/UnifiedModal';

interface MaterialDetailModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MaterialDetailModal({ material, isOpen, onClose }: MaterialDetailModalProps) {
  if (!isOpen || !material) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="物料详情查看"
      size="xl"
    >
      <div className="mb-6">
        <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          基本信息
        </h4>
        <div className="bg-emerald-50 rounded-lg p-4 mb-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-600 block font-medium">条形码</span>
              <span className="text-2xl font-mono font-bold text-emerald-700">{material.barcode}</span>
            </div>
            <Barcode className="w-12 h-12 text-emerald-600" />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-gray-500 block">物料编码</span>
            <span className="text-sm font-medium text-gray-900">{material.code}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">物料名称</span>
            <span className="text-sm font-medium text-gray-900">{material.name}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">物料分类</span>
            <span className="text-sm font-medium text-gray-900">{material.category}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">规格型号</span>
            <span className="text-sm font-medium text-gray-900">{material.specification}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">单位</span>
            <span className="text-sm font-medium text-gray-900">{material.unit}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">当前库存</span>
            <span className="text-sm font-medium text-gray-900">{material.quantity} {material.unit}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">最低库存</span>
            <span className="text-sm font-medium text-gray-900">{material.minStock} {material.unit}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">最高库存</span>
            <span className="text-sm font-medium text-gray-900">{material.maxStock} {material.unit}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">单价</span>
            <span className="text-sm font-medium text-gray-900">{material.price}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">供应商</span>
            <span className="text-sm font-medium text-gray-900">{material.supplier}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">存放位置</span>
            <span className="text-sm font-medium text-gray-900">{material.location}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">批次号</span>
            <span className="text-sm font-medium text-gray-900">{material.batchNo}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">生产日期</span>
            <span className="text-sm font-medium text-gray-900">{material.productionDate}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">有效期至</span>
            <span className="text-sm font-medium text-gray-900">{material.expiryDate}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">最后更新时间</span>
            <span className="text-sm font-medium text-gray-900">{material.lastUpdateTime}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">数据状态</span>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              material.dataStatus === '启用' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {material.dataStatus}
            </span>
          </div>
        </div>
      </div>

      {material.quantity < material.minStock && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-sm font-medium">⚠️ 库存预警</span>
          </div>
          <p className="text-red-600 text-sm mt-1">
            当前库存 ({material.quantity}) 低于最低库存警戒线 ({material.minStock})，请及时补充。
          </p>
        </div>
      )}
    </UnifiedModal>
  );
}
