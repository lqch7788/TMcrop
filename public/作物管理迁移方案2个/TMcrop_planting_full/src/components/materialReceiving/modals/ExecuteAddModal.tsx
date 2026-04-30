import React from 'react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import type { MaterialReceivingRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

interface ExecuteAddModalProps {
  isOpen: boolean;
  addForm: {
    code: string;
    date: string;
    applicant: string;
    warehouseLocation: string;
    reviewer: string;
    productionBatchCode: string;
    materials: ExecuteMaterialItem[];
  };
  selectedApplicationCode: string;
  selectedMaterialIndices: Set<number>;
  materialActualQuantities: Record<number, number>;
  materialPool: ExecuteMaterialItem[];
  materialReceivingDetails: MaterialReceivingRecord[];
  onClose: () => void;
  onAddFormChange: (field: string, value: any) => void;
  onSelectedApplicationCodeChange: (code: string) => void;
  onSelectedMaterialIndicesChange: (indices: Set<number>) => void;
  onMaterialActualQuantitiesChange: (quantities: Record<number, number>) => void;
  onAddToMaterialPool: () => void;
  onRemoveFromMaterialPool: (index: number) => void;
  onUpdateMaterialPoolQuantity: (index: number, quantity: number) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ExecuteAddModal: React.FC<ExecuteAddModalProps> = ({
  isOpen,
  addForm,
  selectedApplicationCode,
  selectedMaterialIndices,
  materialActualQuantities,
  materialPool,
  materialReceivingDetails,
  onClose,
  onAddFormChange,
  onSelectedApplicationCodeChange,
  onSelectedMaterialIndicesChange,
  onMaterialActualQuantitiesChange,
  onAddToMaterialPool,
  onRemoveFromMaterialPool,
  onUpdateMaterialPoolQuantity,
  onCancel,
  onSave,
}) => {
  const selectedApp = materialReceivingDetails.find(app => app.code === selectedApplicationCode);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增领料出库单"
      size="xl"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 rounded-lg p-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">出库单号</label>
          <div className="text-sm font-medium text-gray-900">{addForm.code || '系统自动生成'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">关联领料单号</label>
          <select
            value={selectedApplicationCode}
            onChange={(e) => {
              onSelectedApplicationCodeChange(e.target.value);
              onSelectedMaterialIndicesChange(new Set());
              onMaterialActualQuantitiesChange({});
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择领料单</option>
            {materialReceivingDetails
              .filter(app => app.status === '已审批' && app.materials.length > 0)
              .map(app => (
                <option key={app.id} value={app.code}>
                  {app.code} - {app.applicant}
                </option>
              ))
            }
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
          <input
            type="date"
            value={addForm.date}
            onChange={(e) => onAddFormChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
          <select
            value={addForm.warehouseLocation}
            onChange={(e) => onAddFormChange('warehouseLocation', e.target.value)}
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
          <label className="block text-sm font-medium text-blue-700 mb-1">操作人</label>
          <input
            type="text"
            value={addForm.reviewer}
            onChange={(e) => onAddFormChange('reviewer', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {selectedApplicationCode && selectedApp && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">选择物料（勾选要出库的物料并填写实发数量）</label>
            <button
              onClick={onAddToMaterialPool}
              disabled={selectedMaterialIndices.size === 0}
              className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              添加到物料池 ({selectedMaterialIndices.size})
            </button>
          </div>
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden mt-2">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 w-10">选择</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">当前库存</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实发数量</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedApp.materials.map((material, idx) => (
                <tr key={idx} className={selectedMaterialIndices.has(idx) ? 'bg-emerald-50' : ''}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedMaterialIndices.has(idx)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedMaterialIndices);
                        if (e.target.checked) {
                          newSelected.add(idx);
                          onMaterialActualQuantitiesChange({
                            ...materialActualQuantities,
                            [idx]: material.requestedQuantity
                          });
                        } else {
                          newSelected.delete(idx);
                          const newQuantities = { ...materialActualQuantities };
                          delete newQuantities[idx];
                          onMaterialActualQuantitiesChange(newQuantities);
                        }
                        onSelectedMaterialIndicesChange(newSelected);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 font-mono">{material.materialCode}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{material.materialName}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{material.spec}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{material.unit}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{material.requestedQuantity}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{material.stockQuantity}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{(material.unitPrice || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{material.warehousePosition || '-'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      max={material.requestedQuantity}
                      value={materialActualQuantities[idx] ?? material.requestedQuantity}
                      onChange={(e) => {
                        onMaterialActualQuantitiesChange({
                          ...materialActualQuantities,
                          [idx]: Number(e.target.value)
                        });
                      }}
                      disabled={!selectedMaterialIndices.has(idx)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {materialPool.length > 0 && (
        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700 mb-2">物料池（可修改实发数量或移除）</label>
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden mt-2">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 w-16">操作</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {materialPool.map((material, idx) => {
                const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                return (
                  <tr key={idx} className={isQuantityDifferent ? 'bg-amber-50' : ''}>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onRemoveFromMaterialPool(idx)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        移除
                      </button>
                    </td>
                    <td className="px-3 py-2 text-sm text-blue-700 font-mono">{material.applicationCode}</td>
                    <td className="px-3 py-2 text-sm text-gray-600 font-mono">{material.materialCode}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{material.materialName}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{material.spec}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{material.unit}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{material.requestedQuantity}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{(material.unitPrice || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{subtotal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{material.warehousePosition || '-'}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max={material.requestedQuantity}
                        value={material.actualQuantity}
                        onChange={(e) => onUpdateMaterialPoolQuantity(idx, Number(e.target.value))}
                        className={`w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
          disabled={materialPool.length === 0}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          保存
        </button>
      </div>
    </UnifiedModal>
  );
};

export default ExecuteAddModal;
console.log('组件创建成功: ExecuteAddModal');
