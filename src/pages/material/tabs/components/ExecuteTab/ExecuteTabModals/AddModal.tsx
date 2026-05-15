// ExecuteAddModal 组件
// 领料出库新增弹窗 — 从已有领料申请单中选择物料进行出库
import { useState, useMemo } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { UserSelect } from '@/components/common/settings/UserSelect';
import { useMaterialRequestDataStore } from '@/stores/useMaterialRequestDataStore';
import type { ExecuteMaterialItem } from '@/types/materialReceiving';

interface ExecuteAddModalProps {
  isOpen: boolean;
  // 基础表单
  addForm: {
    code: string;
    date: string;
    applicant: string;
    warehouseLocation: string;
    reviewer: string;
    productionBatchCode: string;
    materials: ExecuteMaterialItem[];
  };
  onFormChange: React.Dispatch<React.SetStateAction<{
    code: string;
    date: string;
    applicant: string;
    warehouseLocation: string;
    reviewer: string;
    productionBatchCode: string;
    materials: ExecuteMaterialItem[];
  }>>;
  // 物料池
  materialPool: ExecuteMaterialItem[];
  onAddToMaterialPool: () => void;
  onRemoveFromMaterialPool: (index: number) => void;
  onUpdateMaterialPoolQuantity: (index: number, actualQuantity: number) => void;
  // 领料申请单选择
  selectedApplicationCode: string;
  onSelectApplicationCode: (code: string) => void;
  selectedMaterialIndices: Set<number>;
  onToggleMaterialIndex: (idx: number) => void;
  materialActualQuantities: Record<number, number>;
  onMaterialActualQuantityChange: (idx: number, qty: number) => void;
  // 物料直接编辑
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: keyof ExecuteMaterialItem, value: string | number) => void;
  // 操作
  onClose: () => void;
  onSave: () => void;
}

export function ExecuteAddModal({
  isOpen,
  addForm,
  onFormChange,
  materialPool,
  onAddToMaterialPool,
  onRemoveFromMaterialPool,
  onUpdateMaterialPoolQuantity,
  selectedApplicationCode,
  onSelectApplicationCode,
  selectedMaterialIndices,
  onToggleMaterialIndex,
  materialActualQuantities,
  onMaterialActualQuantityChange,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialChange,
  onClose,
  onSave,
}: ExecuteAddModalProps) {
  // 从 Store 获取领料申请单列表（代替 mock 数据）
  const applicationItems = useMaterialRequestDataStore((s) => s.items);

  // 搜索申请单
  const [appSearch, setAppSearch] = useState('');

  // 过滤后的领料申请单列表 — 只显示已审批的（可出库状态）
  const availableApplications = useMemo(() => {
    return applicationItems.filter(app => {
      if (appSearch && !app.code.toLowerCase().includes(appSearch.toLowerCase())) return false;
      return true;
    });
  }, [appSearch]);

  // 当前选中的领料申请单
  const selectedApplication = useMemo(() => {
    return applicationItems.find(app => app.code === selectedApplicationCode) || null;
  }, [selectedApplicationCode]);

  // ============================================
  // 基本信息表单
  // ============================================
  const renderBasicForm = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">出库单号</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={addForm.code}
            onChange={(e) => onFormChange({ ...addForm, code: e.target.value })}
            placeholder="系统自动生成"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">出库日期</label>
        <input
          type="date"
          value={addForm.date}
          onChange={(e) => onFormChange({ ...addForm, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">申领人</label>
        <UserSelect
          value={addForm.applicant}
          onChange={(value) => onFormChange({ ...addForm, applicant: value })}
          placeholder="选择申领人"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">库存地点</label>
        <select
          value={addForm.warehouseLocation}
          onChange={(e) => onFormChange({ ...addForm, warehouseLocation: e.target.value })}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">审核人</label>
        <UserSelect
          value={addForm.reviewer}
          onChange={(value) => onFormChange({ ...addForm, reviewer: value })}
          placeholder="选择审核人"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">生产计划批次号</label>
        <input
          type="text"
          value={addForm.productionBatchCode}
          onChange={(e) => onFormChange({ ...addForm, productionBatchCode: e.target.value })}
          placeholder="如：FQ2024-001"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </div>
  );

  // ============================================
  // 领料申请单选择 + 物料选择区域
  // ============================================
  const renderApplicationSelector = () => (
    <div className="mt-6 border border-emerald-200 rounded-lg p-4 bg-emerald-50/30">
      <h4 className="text-sm font-semibold text-emerald-800 mb-3">选择来源领料申请单</h4>
      <div className="flex gap-3 mb-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            placeholder="搜索领料单号..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={selectedApplicationCode}
          onChange={(e) => {
            onSelectApplicationCode(e.target.value);
            if (e.target.value) {
              // 自动填充表单字段
              const app = applicationItems.find(a => a.code === e.target.value);
              if (app) {
                onFormChange({
                  ...addForm,
                  applicant: app.applicant,
                  warehouseLocation: app.warehouseLocation,
                  reviewer: app.reviewer,
                  productionBatchCode: app.productionBatchCode,
                });
              }
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">请选择领料申请单</option>
          {availableApplications.map(app => (
            <option key={app.code} value={app.code}>
              {app.code} ({app.applicant} / {app.materials.length}种物料)
            </option>
          ))}
        </select>
      </div>

      {/* 选中申请单的物料列表 */}
      {selectedApplication && (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              物料清单 — {selectedApplication.code}（{selectedApplication.applicant} / {selectedApplication.department}）
            </span>
            <Button size="sm" onClick={onAddToMaterialPool} disabled={selectedMaterialIndices.size === 0}>
              <Plus className="w-3 h-3" />
              加入物料池 ({selectedMaterialIndices.size})
            </Button>
          </div>
          <table className="w-full">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 w-8">
                  <input
                    type="checkbox"
                    checked={selectedMaterialIndices.size === selectedApplication.materials.length && selectedApplication.materials.length > 0}
                    onChange={() => {
                      if (selectedMaterialIndices.size === selectedApplication.materials.length) {
                        // 全不选
                        selectedApplication.materials.forEach((_, i) => onToggleMaterialIndex(i));
                      } else {
                        // 全选
                        selectedApplication.materials.forEach((_, i) => {
                          if (!selectedMaterialIndices.has(i)) onToggleMaterialIndex(i);
                        });
                      }
                    }}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600"
                  />
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">申领数量</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">当前库存</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">本次实发</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedApplication.materials.map((material, idx) => (
                <tr key={idx} className={selectedMaterialIndices.has(idx) ? 'bg-emerald-50' : ''}>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedMaterialIndices.has(idx)}
                      onChange={() => onToggleMaterialIndex(idx)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600"
                    />
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-700 font-mono">{material.materialCode}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.materialName}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.spec}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.unit}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.requestedQuantity}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.stockQuantity}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={materialActualQuantities[idx] ?? material.requestedQuantity}
                      onChange={(e) => onMaterialActualQuantityChange(idx, Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================
  // 物料池表格
  // ============================================
  const renderMaterialPool = () => (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          出库物料池
          {materialPool.length > 0 && (
            <span className="ml-1 text-emerald-600">({materialPool.length}种 / {materialPool.reduce((sum, m) => sum + m.actualQuantity, 0)}件)</span>
          )}
        </label>
        <Button variant="secondary" size="sm" onClick={onAddMaterial}>
          <Plus className="w-3 h-3" />
          手动添加
        </Button>
      </div>
      {materialPool.length > 0 ? (
        <table className="w-full border border-emerald-200 rounded-lg overflow-hidden">
          <thead className="bg-emerald-100">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">来源单号</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">批次号</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">申领数量</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">本次实发</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">差异</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 w-12">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {materialPool.map((material, idx) => {
              const diff = material.requestedQuantity - material.actualQuantity;
              return (
                <tr key={idx} className={diff > 0 ? 'bg-amber-50' : 'bg-emerald-50'}>
                  <td className="px-2 py-2 text-xs text-gray-700 font-mono">{material.applicationCode}</td>
                  <td className="px-2 py-2 text-xs text-gray-700 font-mono">{material.materialCode}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.materialName}</td>
                  <td className="px-2 py-2 text-xs text-gray-700 font-mono">{material.batchNo || '-'}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.spec}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.unit}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">{material.requestedQuantity}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={material.actualQuantity}
                      onChange={(e) => onUpdateMaterialPoolQuantity(idx, Number(e.target.value))}
                      className={`w-20 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 ${
                        diff > 0 ? 'border-amber-300 focus:ring-amber-500' : 'border-emerald-300 focus:ring-emerald-500'
                      }`}
                    />
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {diff > 0 ? (
                      <span className="text-amber-600 font-medium">-{diff}</span>
                    ) : diff < 0 ? (
                      <span className="text-red-600 font-medium">+{Math.abs(diff)}</span>
                    ) : (
                      <span className="text-emerald-600">正常</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Button variant="ghost" size="icon" onClick={() => onRemoveFromMaterialPool(idx)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
          暂无物料，请从上方"领料申请单"中选择物料加入物料池，或点击"手动添加"
        </div>
      )}
    </div>
  );

  // ============================================
  // 底部操作栏
  // ============================================
  const renderFooter = () => (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={onClose}>
        取消
      </Button>
      <Button onClick={onSave} disabled={materialPool.length === 0}>
        提交出库
      </Button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增领料出库"
      size="xxxl"
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
      showFooter={true}
      footer={renderFooter()}
    >
      <div className="space-y-2">
        {renderBasicForm()}
        {renderApplicationSelector()}
        {renderMaterialPool()}
      </div>
    </Modal>
  );
}
