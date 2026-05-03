import { Plus, Trash2 } from 'lucide-react';
import { ReturnRecord, EditFormData, MaterialItem, RETURN_REASONS } from '../types';
import { RETURN_TYPES } from '../config';
import { mockSourceApplications } from '../mockData';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { useDepartmentOptions } from '../../../hooks/useDepartmentOptions';

interface EditModalProps {
  open: boolean;
  record: ReturnRecord | null;
  form: EditFormData;
  onClose: () => void;
  onSave: () => void;
  onVoidApply: () => void;
  onFormChange: (field: keyof EditFormData, value: string) => void;
  onMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
}

export function EditModal({
  open,
  record,
  form,
  onClose,
  onSave,
  onVoidApply,
  onFormChange,
  onMaterialChange,
  onAddMaterial,
  onRemoveMaterial,
}: EditModalProps) {
  // 从 API 获取部门选项
  const { options: departmentOptions } = useDepartmentOptions();

  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="编辑退料单"
      size="lg"
      showFooter
      onSubmit={onSave}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 退料单号 - 只读 */}
        <div className="bg-gray-100 rounded-lg p-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">退料单号</label>
          <div className="text-sm font-medium text-gray-900">{record.code}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">退料日期</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => onFormChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">退料类型</label>
          <select
            value={form.type}
            onChange={(e) => onFormChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {RETURN_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
          <input
            type="text"
            value={form.applicant}
            onChange={(e) => onFormChange('applicant', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">退料部门</label>
          <select
            value={form.department}
            onChange={(e) => onFormChange('department', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">仓库位置</label>
          <input
            type="text"
            value={form.warehouseLocation}
            onChange={(e) => onFormChange('warehouseLocation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
          <input
            type="text"
            value={form.operator}
            onChange={(e) => onFormChange('operator', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">审核人</label>
          <input
            type="text"
            value={form.reviewer}
            onChange={(e) => onFormChange('reviewer', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">审批状态</label>
          <select
            value={form.status}
            onChange={(e) => onFormChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="待审批">待审批</option>
            <option value="已审批">已审批</option>
            <option value="已驳回">已驳回</option>
            <option value="已完成">已完成</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <input
            type="text"
            value={form.remark}
            onChange={(e) => onFormChange('remark', e.target.value)}
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
        {form.materials.length > 0 ? (
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-emerald-100">
              <tr>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料分类</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">本次退料数量</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">退料原因</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600 w-12">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {form.materials.map((material, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-2">
                    <select
                      value={material.sourceApplicationCode}
                      onChange={(e) => onMaterialChange(idx, 'sourceApplicationCode', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">请选择</option>
                      {mockSourceApplications.map(app => (
                        <option key={app.code} value={app.code}>{app.code}</option>
                      ))}
                    </select>
                  </td>
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
                      value={material.category}
                      onChange={(e) => onMaterialChange(idx, 'category', e.target.value)}
                      placeholder="中类-小类"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      value={material.returnQuantity}
                      onChange={(e) => onMaterialChange(idx, 'returnQuantity', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={material.unitPrice}
                      onChange={(e) => onMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={material.warehousePosition}
                      onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                      placeholder="仓库-区-位"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={material.reason}
                      onChange={(e) => onMaterialChange(idx, 'reason', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">请选择</option>
                      {RETURN_REASONS.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
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
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
            暂无物料明细，请点击"添加物料"按钮添加
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
