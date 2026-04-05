import { Trash2, RefreshCw } from 'lucide-react';
import { AddFormData, MaterialItem } from '../types';
import { DEPARTMENTS, APPLICANTS, WAREHOUSE_LOCATIONS, OPERATORS, REVIEWERS } from '../config';
import { mockSourceApplications } from '../mockData';
import { SearchableSelect } from './SearchableSelect';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 顶部标题栏 - 绿色 */}
        <div className="px-4 py-2 bg-emerald-600 flex items-center justify-between rounded-t-xl shrink-0">
          <h3 className="text-base font-semibold text-white">新增退料单</h3>
          <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
            <span className="text-xl text-white">&times;</span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-3 flex-1 overflow-auto">
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
                  options={DEPARTMENTS.filter(d => d !== '全部部门').map(v => ({ value: v, label: v }))}
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
                <SearchableSelect
                  value={form.operator}
                  options={OPERATORS.map(v => ({ value: v, label: v }))}
                  onChange={(val) => onFormChange('operator', val)}
                  placeholder="请选择"
                  className="flex-1"
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
                            <input
                              type="text"
                              value={material.reason}
                              onChange={(e) => onMaterialChange(idx, 'reason', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              placeholder="请输入"
                            />
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
        </div>

        {/* 底部按钮栏 */}
        <div className="px-4 py-2 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
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
}
