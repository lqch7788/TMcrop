import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { UnifiedModal } from '../ui/UnifiedModal';

interface Material {
  materialCode: string;
  materialName: string;
  requestedQuantity: number;
  actualQuantity?: number;
}

interface PartialApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  partialApproval: {
    code: string;
    title: string;
    materials?: Material[];
  } | null;
  partialQuantities: Record<string, number>;
  onQuantityChange: (quantities: Record<string, number>) => void;
  onConfirm: () => void;
}

export function PartialApprovalModal({
  isOpen,
  onClose,
  partialApproval,
  partialQuantities,
  onQuantityChange,
  onConfirm
}: PartialApprovalModalProps) {
  if (!partialApproval) return null;

  const handleQuantityChange = (materialCode: string, value: number) => {
    onQuantityChange({
      ...partialQuantities,
      [materialCode]: value
    });
  };

  // 检查是否有物料数量不足
  const hasInsufficientMaterials = Object.keys(partialQuantities).some(code => {
    const mat = partialApproval.materials?.find((m) => m.materialCode === code);
    return mat && (partialQuantities[code] || 0) < mat.requestedQuantity;
  });

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="部分通过审批"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">领料单号</div>
            <div className="font-medium text-gray-900">{partialApproval.code}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">标题</div>
            <div className="font-medium text-gray-900">{partialApproval.title}</div>
          </div>
        </div>

        {/* 物料明细表格 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">物料明细 - 请填写实际发放数量</div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料编码</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料名称</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">申请数量</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">实际发放</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(partialApproval.materials || []).map((mat) => {
                  const insufficient = (partialQuantities[mat.materialCode] || 0) < mat.requestedQuantity;
                  return (
                    <tr key={mat.materialCode}>
                      <td className="px-3 py-2 text-gray-900">{mat.materialCode}</td>
                      <td className="px-3 py-2 text-gray-900">{mat.materialName}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{mat.requestedQuantity}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max={mat.requestedQuantity}
                          value={partialQuantities[mat.materialCode] || 0}
                          onChange={(e) => handleQuantityChange(mat.materialCode, Number(e.target.value))}
                          className={`w-20 h-8 px-2 border rounded text-right text-sm focus:outline-none focus:border-blue-500 ${insufficient ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 提示信息 */}
        {hasInsufficientMaterials && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">部分物料数量不足</p>
                <p className="mt-1">系统将自动生成新的待审批领料单，包含不足数量的物料。</p>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            确认部分通过
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}

export default PartialApprovalModal;
