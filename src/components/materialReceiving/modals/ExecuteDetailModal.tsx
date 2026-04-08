import React from 'react';
import { X } from 'lucide-react';
import type { MaterialExecuteRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

interface ExecuteDetailModalProps {
  show: boolean;
  record: MaterialExecuteRecord | null;
  onClose: () => void;
}

export const ExecuteDetailModal: React.FC<ExecuteDetailModalProps> = ({
  show,
  record,
  onClose,
}) => {
  if (!show || !record) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">出库单详情</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <span className="text-2xl text-gray-400">&times;</span>
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">出库单号</label>
              <p className="font-mono font-semibold text-gray-900">{record.code}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">关联领料单号</label>
              <p className="font-mono font-semibold text-gray-900">{record.sourceApplicationCodes?.join(', ')}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">申请日期</label>
              <p className="font-semibold text-gray-900">{record.date}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">申请人</label>
              <p className="font-semibold text-gray-900">{record.applicant}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">库存地点</label>
              <p className="font-semibold text-gray-900">{record.warehouseLocation}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">审核人</label>
              <p className="font-semibold text-gray-900">{record.reviewer}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">操作人</label>
              <p className="font-semibold text-gray-900">{record.operator}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">生产计划批次号</label>
              <p className="font-semibold text-gray-900">{record.productionBatchCode}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">执行状态</label>
              <p className="font-semibold">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  record.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                  record.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
                  record.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                  record.executeStatusClass === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {record.executeStatus}
                </span>
              </p>
            </div>
          </div>
          {record.materials.length > 0 && (
            <div className="mt-6">
              <label className="text-sm text-gray-500 block mb-2">物料明细</label>
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-emerald-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实际库存</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {record.materials.map((material: ExecuteMaterialItem, idx: number) => {
                    const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                    const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                    return (
                      <tr key={idx} className={`hover:bg-emerald-100 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                        <td className="px-3 py-2 text-sm text-blue-700 font-mono">{material.applicationCode}</td>
                        <td className="px-3 py-2 text-sm text-blue-700 font-mono">{material.materialCode}</td>
                        <td className="px-3 py-2 text-sm text-blue-700">{material.materialName}</td>
                        <td className="px-3 py-2 text-sm text-blue-700">{material.spec}</td>
                        <td className="px-3 py-2 text-sm text-blue-700">{material.unit}</td>
                        <td className="px-3 py-2 text-sm text-blue-700">{material.requestedQuantity}</td>
                        <td className="px-3 py-2 text-sm text-blue-700">
                          <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {material.stockQuantity}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-blue-700">
                          {material.actualQuantity > 0 ? (
                            <span className={material.actualQuantity < material.requestedQuantity ? 'text-amber-600 font-medium' : 'text-green-600'}>
                              {material.actualQuantity}
                            </span>
                          ) : (
                            <span className={material.stockQuantity === 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                              {material.actualQuantity}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-blue-700">{(material.unitPrice || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-blue-700">{subtotal.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-blue-700">{material.warehousePosition || '-'}</td>
                        <td className="px-3 py-2 text-sm text-blue-700">{material.remark}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecuteDetailModal;
console.log('组件创建成功: ExecuteDetailModal');
