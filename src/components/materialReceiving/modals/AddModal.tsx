import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { MaterialItem } from '../../../types/materialReceiving';

interface AddModalProps {
  addForm: any;
  onChange: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: string, value: any) => void;
}

export const AddModal: React.FC<AddModalProps> = ({
  addForm,
  onChange,
  onSave,
  onCancel,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialChange,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[66vw] mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">新增领料单</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
            <span className="text-2xl text-gray-400">&times;</span>
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
              <input
                type="text"
                value={addForm.code}
                readOnly
                placeholder="系统自动生成"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">申请日期</label>
              <input
                type="date"
                value={addForm.date}
                onChange={(e) => onChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">申请人</label>
              <input
                type="text"
                value={addForm.applicant}
                onChange={(e) => onChange('applicant', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">部门</label>
              <select
                value={addForm.department}
                onChange={(e) => onChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择部门</option>
                <option value="生产部">生产部</option>
                <option value="后勤部">后勤部</option>
                <option value="设备部">设备部</option>
                <option value="技术部">技术部</option>
                <option value="采后处理部">采后处理部</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
              <select
                value={addForm.warehouseLocation}
                onChange={(e) => onChange('warehouseLocation', e.target.value)}
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
              <label className="block text-sm font-medium text-gray-900 mb-1">种植区域/用途</label>
              <input
                type="text"
                value={addForm.plantArea}
                onChange={(e) => onChange('plantArea', e.target.value)}
                placeholder="如：1号棚-叶菜区"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">审核人</label>
              <select
                value={addForm.reviewer}
                onChange={(e) => onChange('reviewer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="王经理">王经理</option>
                <option value="李经理">李经理</option>
                <option value="张经理">张经理</option>
                <option value="陈经理">陈经理</option>
                <option value="赵经理">赵经理</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
              <input
                type="text"
                value={addForm.productionBatchCode}
                onChange={(e) => onChange('productionBatchCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 物料明细 */}
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
            {addForm.materials.length > 0 ? (
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-emerald-100">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">申领数量</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">当前库存</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单价(元)</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">小计(元)</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">仓库货位</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">备注</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 w-12">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {addForm.materials.map((material, idx) => {
                    const subtotal = material.requestedQuantity * (material.unitPrice || 0);
                    const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
                    return (
                      <tr key={idx}>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={material.materialCode}
                            onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={material.materialName}
                            onChange={(e) => onMaterialChange(idx, 'materialName', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={material.spec}
                            onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={material.unit}
                            onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={material.requestedQuantity}
                            onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                            className={`w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={material.stockQuantity || ''}
                            onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={material.unitPrice || ''}
                            onChange={(e) => onMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50">
                          {subtotal.toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={material.warehousePosition || ''}
                            onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={material.remark}
                            onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => onRemoveMaterial(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                暂无物料明细，请点击"添加物料"按钮添加
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
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
      </div>
    </div>
  );
};

export default AddModal;
console.log('组件创建成功: AddModal');
