import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import type { MaterialExecuteRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

interface ExecuteEditModalProps {
  isOpen: boolean;
  record: MaterialExecuteRecord | null;
  editForm: {
    date: string;
    applicant: string;
    warehouseLocation: string;
    reviewer: string;
    productionBatchCode: string;
    executeStatus: string;
    materials: ExecuteMaterialItem[];
  };
  onClose: () => void;
  onEditFormChange: (field: string, value: any) => void;
  onMaterialChange: (index: number, field: string, value: any) => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ExecuteEditModal: React.FC<ExecuteEditModalProps> = ({
  isOpen,
  record,
  editForm,
  onClose,
  onEditFormChange,
  onMaterialChange,
  onAddMaterial,
  onRemoveMaterial,
  onCancel,
  onSave,
}) => {
  if (!isOpen || !record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑领料出库单"
      size="xl"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 rounded-lg p-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
          <div className="text-sm font-medium text-gray-900">{record.code}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
          <input
            type="date"
            value={editForm.date}
            onChange={(e) => onEditFormChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">申请人</label>
          <input
            type="text"
            value={editForm.applicant}
            onChange={(e) => onEditFormChange('applicant', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
          <select
            value={editForm.warehouseLocation}
            onChange={(e) => onEditFormChange('warehouseLocation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="仓库A区">仓库A区</option>
            <option value="仓库B区">仓库B区</option>
            <option value="仓库C区">仓库C区</option>
            <option value="仓库D区">仓库D区</option>
            <option value="仓库E区">仓库E区</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">审核人</label>
          <input
            type="text"
            value={editForm.reviewer}
            onChange={(e) => onEditFormChange('reviewer', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">生产计划批次号</label>
          <input
            type="text"
            value={editForm.productionBatchCode}
            onChange={(e) => onEditFormChange('productionBatchCode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">执行状态</label>
          <select
            value={editForm.executeStatus}
            onChange={(e) => onEditFormChange('executeStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="待出库">待出库</option>
            <option value="部分出库">部分出库</option>
            <option value="已出库">已出库</option>
            <option value="已取消">已取消</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">物料明细</label>
          <button
            onClick={onAddMaterial}
            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            添加物料
          </button>
        </div>
        {editForm.materials.length > 0 && (
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
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
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {editForm.materials.map((material, idx) => {
                const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                return (
                  <tr key={idx} className={isQuantityDifferent ? 'bg-amber-50' : ''}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={material.applicationCode || ''}
                        onChange={(e) => onMaterialChange(idx, 'applicationCode', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono bg-gray-50"
                        readOnly
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={material.materialCode}
                        onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={material.materialName}
                        onChange={(e) => onMaterialChange(idx, 'materialName', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={material.spec}
                        onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={material.unit}
                        onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={material.requestedQuantity}
                        onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={material.stockQuantity}
                        onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={material.actualQuantity}
                        onChange={(e) => onMaterialChange(idx, 'actualQuantity', Number(e.target.value))}
                        className={`w-full px-2 py-1 border border-gray-200 rounded text-sm ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={material.unitPrice || ''}
                        onChange={(e) => onMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-blue-700 bg-gray-50">
                      {subtotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={material.warehousePosition || ''}
                        onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={material.remark}
                        onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onRemoveMaterial(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          取消
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          保存
        </button>
      </div>
    </UnifiedModal>
  );
};

export default ExecuteEditModal;
console.log('组件创建成功: ExecuteEditModal');
