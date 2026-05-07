import { Trash2, RefreshCw } from 'lucide-react';
import { AddFormData, MaterialItem, RETURN_REASONS } from '../types';
import { APPLICANTS, WAREHOUSE_LOCATIONS, OPERATORS, REVIEWERS } from '../config';
import { mockSourceApplications, currentUser } from '../mockData';
import { SearchableSelect } from './SearchableSelect';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { useDepartmentOptions } from '../../../hooks/useDepartmentOptions';

interface AddModalProps {
  open: boolean;
  form: AddFormData;
  onClose: () => void;
  onSave: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  onFormChange: (field: keyof AddFormData, value: string) => void;
  onSelectMaterialsFromSource: (sourceAppCode: string) => void;
  onGenerateCode: () => void;
}

export function AddModal({
  open,
  form,
  onClose,
  onSave,
  onRemoveMaterial,
  onMaterialChange,
  onFormChange,
  onSelectMaterialsFromSource,
  onGenerateCode,
}: AddModalProps) {
  // 从 API 获取部门选项
  const { options: departmentOptions } = useDepartmentOptions();
  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="新增退料单"
      size="xl"
      showFooter
      onSubmit={onSave}
      submitText="保存"
      cancelText="取消"
    >
      {/* 基本信息 - 紧凑排布，退料单号单独占一行，其他字段每行3个 */}
      <div className="bg-gray-100 rounded-lg p-3 mb-3">
        {/* 退料单号 - 单独占一行 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-500 w-20 shrink-0">退料单号：</span>
          <input
            type="text"
            value={form.code}
            readOnly
            placeholder="点击生成获取单号"
            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm font-mono bg-gray-50 max-w-xs"
          />
          <button
            onClick={onGenerateCode}
            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 shrink-0"
            title="生成退料单号"
          >
            <RefreshCw className="w-4 h-4" />
            生成
          </button>
        </div>
        {/* 其他字段 - 每行3个 */}
        <div className="grid grid-cols-3 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">退料日期：</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => onFormChange('date', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">申请人：</span>
            <SearchableSelect
              value={form.applicant}
              options={APPLICANTS.map(v => ({ value: v, label: v }))}
              onChange={(val) => onFormChange('applicant', val)}
              placeholder="请选择"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">退料部门：</span>
            <SearchableSelect
              value={form.department}
              options={departmentOptions.map(v => ({ value: v, label: v }))}
              onChange={(val) => onFormChange('department', val)}
              placeholder="请选择"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">仓库位置：</span>
            <SearchableSelect
              value={form.warehouseLocation}
              options={WAREHOUSE_LOCATIONS.map(v => ({ value: v, label: v }))}
              onChange={(val) => onFormChange('warehouseLocation', val)}
              placeholder="请选择"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">操作人：</span>
            <input
              type="text"
              value={currentUser.name}
              readOnly
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20 shrink-0">审核人：</span>
            <SearchableSelect
              value={form.reviewer}
              options={REVIEWERS.map(v => ({ value: v, label: v }))}
              onChange={(val) => onFormChange('reviewer', val)}
              placeholder="请选择"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2 col-span-3">
            <span className="text-gray-500 w-20 shrink-0">备注：</span>
            <input
              type="text"
              value={form.remark}
              onChange={(e) => onFormChange('remark', e.target.value)}
              placeholder="请输入"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 物料明细 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">物料明细</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">选择领料单号：</span>
            <SearchableSelect
            value=""
            options={mockSourceApplications.map(app => ({ value: app.code, label: app.code }))}
            onChange={(val) => {
              if (val) {
                onSelectMaterialsFromSource(val);
              }
            }}
            placeholder="选择领料单号添加物料"
            className="w-64"
          />
          </div>
        </div>
        {form.materials.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-[320px]">
              <table className="w-full min-w-[1400px]">
                <colgroup>
                  <col className="w-36" />
                  <col className="w-28" />
                  <col className="w-32" />
                  <col className="w-40" />
                  <col className="w-32" />
                  <col className="w-16" />
                  <col className="w-24" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-32" />
                  <col className="w-40" />
                  <col className="w-12" />
                </colgroup>
                <thead className="bg-emerald-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">来源领料单号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">物料分类</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">规格</th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700">单位</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">领料数量</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">退料数量</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">单价</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">仓库货位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">退料原因</th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {form.materials.map((material, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/50">
                      <td className="px-3 py-2 text-sm font-mono text-gray-700 truncate">{material.sourceApplicationCode || '-'}</td>
                      <td className="px-3 py-2 text-sm font-mono text-gray-700 truncate">{material.materialCode || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 truncate">{material.category || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 truncate">{material.materialName || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 truncate">{material.spec || '-'}</td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700">{material.unit || '-'}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{(material.quantity || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={material.returnQuantity}
                          onChange={(e) => onMaterialChange(idx, 'returnQuantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{material.unitPrice ? `¥${material.unitPrice.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 truncate">{material.warehousePosition || '-'}</td>
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2 text-center">
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
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
            暂无物料明细，请点击"添加物料"按钮添加
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
