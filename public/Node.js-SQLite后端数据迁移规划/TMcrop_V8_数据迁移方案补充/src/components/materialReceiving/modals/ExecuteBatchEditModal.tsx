import React from 'react';
import { X, Trash2 } from 'lucide-react';
import type { MaterialExecuteRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

interface ExecuteBatchEditModalProps {
  show: boolean;
  selectedRows: number[];
  batchEditedRecords: Record<number, MaterialExecuteRecord>;
  currentBatchEditIndex: number;
  recordsList: MaterialExecuteRecord[];
  onClose: () => void;
  onRecordChange: (index: number) => void;
  onFieldChange: (recordId: number, field: string, value: any) => void;
  onMaterialChange: (recordId: number, materialIndex: number, field: string, value: any) => void;
  onMaterialDelete: (recordId: number, materialIndex: number) => void;
  onSaveAll: () => void;
}

export const ExecuteBatchEditModal: React.FC<ExecuteBatchEditModalProps> = ({
  show,
  selectedRows,
  batchEditedRecords,
  currentBatchEditIndex,
  recordsList,
  onClose,
  onRecordChange,
  onFieldChange,
  onMaterialChange,
  onMaterialDelete,
  onSaveAll,
}) => {
  if (!show) return null;

  const currentRecordId = selectedRows[currentBatchEditIndex];
  const currentRecord = recordsList.find(r => r.id === currentRecordId);
  const currentEditedData = batchEditedRecords[currentRecordId] || currentRecord || {} as MaterialExecuteRecord;
  const editedCount = Object.keys(batchEditedRecords).length;

  // 仓库选项
  const warehouseOptions = ['仓库A区', '仓库B区', '仓库C区', '仓库D区', '仓库E区'];
  // 执行状态选项
  const statusOptions = ['待出库', '部分出库', '已出库', '已取消'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
          <h3 className="text-lg font-semibold text-white">批量编辑领料出库记录</h3>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 提示信息 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              已选择 <strong>{selectedRows.length}</strong> 条领料出库记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条
            </p>
          </div>

          {/* 领料单选择下拉 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">选择领料单</label>
            <select
              value={currentRecordId || ''}
              onChange={(e) => {
                const idx = selectedRows.indexOf(Number(e.target.value));
                onRecordChange(idx >= 0 ? idx : 0);
              }}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              {recordsList.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.code} ({record.applicant}) {batchEditedRecords[record.id] ? '✅ 已编辑' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 编辑表单 - 3列布局 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 领料单号 - 只读 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
              <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
            </div>
            {/* 日期 */}
            <div>
              <label className="block text-xs font-medium text-gray-900 mb-1">日期</label>
              <input
                type="date"
                value={currentEditedData.date || ''}
                onChange={(e) => onFieldChange(currentRecordId, 'date', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* 申请人 */}
            <div>
              <label className="block text-xs font-medium text-gray-900 mb-1">申请人</label>
              <input
                type="text"
                value={currentEditedData.applicant || ''}
                onChange={(e) => onFieldChange(currentRecordId, 'applicant', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* 仓库地点 */}
            <div>
              <label className="block text-xs font-medium text-gray-900 mb-1">仓库地点</label>
              <select
                value={currentEditedData.warehouseLocation || ''}
                onChange={(e) => onFieldChange(currentRecordId, 'warehouseLocation', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">请选择</option>
                {warehouseOptions.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            {/* 生产批次号 */}
            <div>
              <label className="block text-xs font-medium text-gray-900 mb-1">生产批次号</label>
              <input
                type="text"
                value={currentEditedData.productionBatchCode || ''}
                onChange={(e) => onFieldChange(currentRecordId, 'productionBatchCode', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* 执行状态 */}
            <div>
              <label className="block text-xs font-medium text-gray-900 mb-1">执行状态</label>
              <select
                value={currentEditedData.executeStatus || ''}
                onChange={(e) => onFieldChange(currentRecordId, 'executeStatus', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">请选择</option>
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 物料明细表格 */}
          {currentEditedData.materials && currentEditedData.materials.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">物料明细</label>
              <ExecuteMaterialEditTable
                materials={currentEditedData.materials}
                onMaterialChange={(idx, field, value) => onMaterialChange(currentRecordId, idx, field, value)}
                onMaterialDelete={(idx) => onMaterialDelete(currentRecordId, idx)}
              />
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => onRecordChange(Math.max(0, currentBatchEditIndex - 1))}
              disabled={currentBatchEditIndex === 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              上一条
            </button>
            <button
              onClick={() => onRecordChange(Math.min(selectedRows.length - 1, currentBatchEditIndex + 1))}
              disabled={currentBatchEditIndex >= selectedRows.length - 1}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              下一条
            </button>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={onSaveAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            保存全部
          </button>
        </div>
      </div>
    </div>
  );
};

// 出库物料编辑表格子组件 - 带横向滚动和删除功能
interface ExecuteMaterialEditTableProps {
  materials: ExecuteMaterialItem[];
  onMaterialChange: (index: number, field: string, value: any) => void;
  onMaterialDelete: (index: number) => void;
}

const ExecuteMaterialEditTable: React.FC<ExecuteMaterialEditTableProps> = ({ materials, onMaterialChange, onMaterialDelete }) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 横向滚动容器 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-2 py-2 text-left text-sm font-semibold text-blue-800 w-10">操作</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">来源领料单号</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申请数量</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">实际库存</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">本次实发</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {materials.map((material, idx) => {
              const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
              const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
              return (
                <tr key={idx} className={`hover:bg-blue-50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                  {/* 删除按钮 */}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => onMaterialDelete(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="删除此物料"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={material.materialCode || ''}
                      onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                      className="w-full h-8 px-2 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</td>
                  <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                  <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                  <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                  <td className="px-3 py-2 text-sm text-blue-800">{material.requestedQuantity}</td>
                  <td className="px-3 py-2 text-sm">
                    <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {material.stockQuantity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <input
                      type="number"
                      value={material.actualQuantity}
                      onChange={(e) => onMaterialChange(idx, 'actualQuantity', Number(e.target.value))}
                      className={`w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={material.unitPrice || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const rounded = Math.round(val * 100) / 100;
                        onMaterialChange(idx, 'unitPrice', rounded);
                      }}
                      className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={material.warehousePosition || ''}
                      onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                      className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={material.remark || ''}
                      onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                      className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExecuteBatchEditModal;
