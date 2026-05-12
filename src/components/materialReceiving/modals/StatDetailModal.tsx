import React from 'react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';

interface StatDetailModalProps {
  isOpen: boolean;
  record: {
    materialCode: string;
    materialName: string;
    category: string;
    spec: string;
    barcode: string;
    unit: string;
    supplier: string;
    batchCode: string;
    productionDate: string;
    expiryDate: string;
    productionPlanBatchCode: string;
    requisitionDepartment: string;
    usageArea: string;
    requisitioner: string;
    requisitionTime: string;
    requisitionCount: number;
    totalQuantity: number;
    actualQuantity: number;
    totalAmount: number;
    mainWarehouse: string;
  } | null;
  onClose: () => void;
}

export const StatDetailModal: React.FC<StatDetailModalProps> = ({
  isOpen,
  record,
  onClose,
}) => {
  if (!isOpen || !record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="物料统计明细"
      size="xl"
      showFooter={false}
    >
      {/* 物料基本信息 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
          物料基本信息
        </h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="text-xs text-emerald-600 mb-1">物料编号</div>
            <div className="text-sm font-mono font-semibold text-emerald-700">{record.materialCode}</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="text-xs text-emerald-600 mb-1">物料名称</div>
            <div className="text-sm font-semibold text-emerald-700">{record.materialName}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 mb-1">物料分类</div>
            <div className="text-sm font-semibold text-blue-700">{record.category}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 mb-1">规格型号</div>
            <div className="text-sm font-semibold text-blue-700">{record.spec}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">条形码</div>
            <div className="text-sm font-mono text-gray-700">{record.barcode}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">单位</div>
            <div className="text-sm font-semibold text-gray-700">{record.unit}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600 mb-1">供应商</div>
            <div className="text-sm font-semibold text-purple-700">{record.supplier}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600 mb-1">主要仓库</div>
            <div className="text-sm font-semibold text-purple-700">{record.mainWarehouse}</div>
          </div>
        </div>
      </div>

      {/* 批次信息 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
          批次信息
        </h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-xs text-amber-600 mb-1">批次号</div>
            <div className="text-sm font-mono font-semibold text-amber-700">{record.batchCode}</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-xs text-amber-600 mb-1">生产日期</div>
            <div className="text-sm font-semibold text-amber-700">{record.productionDate}</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-xs text-amber-600 mb-1">有效期至</div>
            <div className="text-sm font-semibold text-amber-700">{record.expiryDate}</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-xs text-amber-600 mb-1">生产计划批次</div>
            <div className="text-sm font-mono font-semibold text-amber-700">{record.productionPlanBatchCode}</div>
          </div>
        </div>
      </div>

      {/* 领料统计 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-cyan-500 rounded-full"></span>
          领料统计
        </h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-cyan-50 rounded-lg p-3">
            <div className="text-xs text-cyan-600 mb-1">领料部门</div>
            <div className="text-sm font-semibold text-cyan-700">{record.requisitionDepartment}</div>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3">
            <div className="text-xs text-cyan-600 mb-1">用途/区域</div>
            <div className="text-sm font-semibold text-cyan-700">{record.usageArea}</div>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3">
            <div className="text-xs text-cyan-600 mb-1">领料人</div>
            <div className="text-sm font-semibold text-cyan-700">{record.requisitioner}</div>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3">
            <div className="text-xs text-cyan-600 mb-1">领料时间</div>
            <div className="text-sm font-semibold text-cyan-700">{record.requisitionTime}</div>
          </div>
        </div>
      </div>

      {/* 数据汇总 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-rose-500 rounded-full"></span>
          数据汇总
        </h4>
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-rose-50 rounded-lg p-3">
            <div className="text-xs text-rose-600 mb-1">领料次数</div>
            <div className="text-lg font-bold text-rose-700">{record.requisitionCount}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-xs text-orange-600 mb-1">总数量</div>
            <div className="text-lg font-bold text-orange-700">{record.totalQuantity.toLocaleString()}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-xs text-orange-600 mb-1">实际数量</div>
            <div className="text-lg font-bold text-orange-700">{record.actualQuantity.toLocaleString()}</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="text-xs text-emerald-600 mb-1">总金额</div>
            <div className="text-lg font-bold text-emerald-700">¥{record.totalAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
};

export default StatDetailModal;
console.log('组件创建成功: StatDetailModal');
