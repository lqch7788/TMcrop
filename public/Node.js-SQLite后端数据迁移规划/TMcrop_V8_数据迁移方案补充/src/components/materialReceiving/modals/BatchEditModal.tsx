import React from 'react';
import { Trash2 } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';

// 类型定义
interface MaterialItem {
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  requestedQuantity: number;
  stockQuantity: number;
  unitPrice: number;
  warehousePosition: string;
  remark?: string;
}

interface RecordType {
  id: number;
  code: string;
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  productionBatchCode: string;
  status: string;
  materials: MaterialItem[];
}

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  batchEditedRecords: Record<number, RecordType>;
  currentBatchEditIndex: number;
  recordsList: RecordType[];
  onClose: () => void;
  onRecordChange: (index: number) => void;
  onFieldChange: (recordId: number, field: string, value: any) => void;
  onMaterialChange: (recordId: number, materialIndex: number, field: string, value: any) => void;
  onMaterialDelete: (recordId: number, materialIndex: number) => void;
  onNextRecord: () => void;
  onVoidApply: () => void;
  onSaveAll: () => void;
}

export const BatchEditModal: React.FC<BatchEditModalProps> = ({
  isOpen,
  selectedRows,
  batchEditedRecords,
  currentBatchEditIndex,
  recordsList,
  onClose,
  onRecordChange,
  onFieldChange,
  onMaterialChange,
  onMaterialDelete,
  onNextRecord,
  onVoidApply,
  onSaveAll,
}) => {
  const currentRecordId = selectedRows[currentBatchEditIndex];
  const currentRecord = recordsList.find(r => r.id === currentRecordId);
  const currentEditedData = batchEditedRecords[currentRecordId] || currentRecord || {};
  const editedCount = Object.keys(batchEditedRecords).length;
  const currentRecordData = currentEditedData as RecordType;

  // 仓库选项
  const warehouseOptions = ['仓库A区', '仓库B区', '仓库C区', '仓库D区', '仓库E区'];
  // 状态选项
  const statusOptions = ['待审批', '已审批', '已拒绝', '已取消'];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑领料记录"
      size="xxl"
      showFooter={false}
    >
      {/* 提示信息 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 条领料记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条
        </p>
      </div>

      {/* 领料单选择下拉 + 领料单号 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">选择领料单</label>
          <div className="relative">
            <select
              value={currentRecordId || ''}
              onChange={(e) => {
                const idx = selectedRows.indexOf(Number(e.target.value));
                onRecordChange(idx >= 0 ? idx : 0);
              }}
              className="w-full h-10 px-3 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 appearance-none bg-white"
            >
              {recordsList.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.code} ({record.applicant}){batchEditedRecords[record.id] ? ' ✅已编辑' : ''}
                </option>
              ))}
            </select>
            {/* 右侧下拉箭头 */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        {/* 领料单号 - 只读 */}
        <div className="bg-gray-50 rounded-lg p-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
          <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
        </div>
      </div>

      {/* 编辑表单 - 3列布局 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 日期 */}
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">日期</label>
          <input
            type="date"
            value={currentEditedData.date || ''}
            onChange={(e) => onFieldChange(currentRecordId, 'date', e.target.value)}
            className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        {/* 申领人 */}
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">申领人</label>
          <input
            type="text"
            value={currentEditedData.applicant || ''}
            onChange={(e) => onFieldChange(currentRecordId, 'applicant', e.target.value)}
            className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        {/* 仓库地点 */}
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">仓库地点</label>
          <select
            value={currentEditedData.warehouseLocation || ''}
            onChange={(e) => onFieldChange(currentRecordId, 'warehouseLocation', e.target.value)}
            className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
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
            className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        {/* 状态 */}
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">状态</label>
          <select
            value={currentEditedData.status || ''}
            onChange={(e) => onFieldChange(currentRecordId, 'status', e.target.value)}
            className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">请选择</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {/* 审核人 */}
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">审核人</label>
          <input
            type="text"
            value={currentEditedData.reviewer || ''}
            onChange={(e) => onFieldChange(currentRecordId, 'reviewer', e.target.value)}
            className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 物料明细表格 - 带横向滚动 */}
      <MaterialEditTable
        materials={currentRecordData.materials || []}
        onMaterialChange={(idx, field, value) => onMaterialChange(currentRecordId, idx, field, value)}
        onMaterialDelete={(idx) => onMaterialDelete(currentRecordId, idx)}
      />

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onNextRecord}
          className="px-4 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
        >
          确认 {currentBatchEditIndex + 1 < selectedRows.length ? '(下一个)' : '(已最后一个)'}
        </button>
        <button
          onClick={onSaveAll}
          className="px-4 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
        >
          保存全部 ({editedCount} 个)
        </button>
      </div>
    </UnifiedModal>
  );
};

// 物料编辑表格子组件 - 带横向滚动和删除功能
interface MaterialEditTableProps {
  materials: MaterialItem[];
  onMaterialChange: (index: number, field: string, value: any) => void;
  onMaterialDelete: (index: number) => void;
}

const MaterialEditTable: React.FC<MaterialEditTableProps> = ({ materials, onMaterialChange, onMaterialDelete }) => {
  return (
    <div className="mt-6">
      <h4 className="text-sm font-bold text-gray-700 mb-2">物料明细</h4>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {/* 横向滚动容器 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-blue-600">
              <tr>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white w-10 whitespace-nowrap">操作</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">物料编码</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">物料名称</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">规格</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">单位</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-white">申请数量</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-white">当前库存</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-white">单价(元)</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-white whitespace-nowrap">小计(元)</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">仓库货位</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {materials.map((mat, idx) => {
                const subtotal = (mat.requestedQuantity || 0) * (mat.unitPrice || 0);
                const isStockWarning = (mat.requestedQuantity || 0) > (mat.stockQuantity || 0);
                return (
                  <tr key={idx}>
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
                        value={mat.materialCode || ''}
                        onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                        className="w-24 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={mat.materialName || ''}
                        onChange={(e) => onMaterialChange(idx, 'materialName', e.target.value)}
                        className="w-24 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={mat.spec || ''}
                        onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                        className="w-20 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={mat.unit || ''}
                        onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                        className="w-16 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={mat.requestedQuantity || 0}
                        onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                        className={`w-16 h-8 px-2 border border-gray-300 rounded text-right text-xs focus:outline-none focus:border-blue-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={mat.stockQuantity || 0}
                        onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                        className="w-16 h-8 px-2 border border-gray-300 rounded text-right text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={mat.unitPrice ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const rounded = Math.round(val * 100) / 100;
                          onMaterialChange(idx, 'unitPrice', rounded);
                        }}
                        className="w-20 h-8 px-2 border border-gray-300 rounded text-right text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-blue-700 bg-gray-50">
                      {subtotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={mat.warehousePosition || ''}
                        onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                        className="w-24 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={mat.remark || ''}
                        onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                        className="w-24 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                  </tr>
                );
              })}
              {(!materials || materials.length === 0) && (
                <tr>
                  <td colSpan={11} className="px-3 py-4 text-center text-gray-500">暂无物料明细</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BatchEditModal;
