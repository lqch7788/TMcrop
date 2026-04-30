/**
 * 采收入库新增弹窗组件
 * 参照物料入库新增弹窗设计
 */

import React from 'react';
import { Plus, Trash2, RefreshCw, ChevronDown } from 'lucide-react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import {
  getProduceCategoryInfo,
} from '../../../../data/produceCodeRule';
import { getCurrentUsername } from '../../../../hooks/farm';

interface ProductDetail {
  productCode: string;
  cropName: string;      // 大类代码
  variety: string;        // 类型代码
  subCategory: string;   // 品种代码
  batchCode: string;
  plantingMode: string;
  harvestQuantity: number;
  targetYield: number;
  grade: string;
  auditor: string;
  remarks: string;
}

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  addForm: {
    harvestCode: string;
    harvestDate: string;
    greenhouseId: string;
    warehouseId: string;
    batchCode: string;
    harvesterIds: string[];
    harvesterNames: string[];
    auditor: string;
    remarks: string;
    // V3.0 新增字段
    harvestType: 'seed' | 'seedling' | 'product';  // 采收类型
    targetInventory: 'seed' | 'seedling' | 'product';  // 目标库存
    products: ProductDetail[];
  };
  onFormChange: (field: string, value: any) => void;
  onAddProduct: () => void;
  onRemoveProduct: (index: number) => void;
  onProductChange: (index: number, field: string, value: any) => void;
  onGenerateCode: () => void;
  greenhouses: Array<{ id: string; name: string }>;
  warehouseOptions: Array<{ value: string; label: string }>;
  cropBatches: Array<{ id: string; batchCode: string; cropName: string; variety: string; plantingMode: string; targetYield: number }>;
  users: Array<{ id: string; name: string; role: string }>;
  errors: Record<string, string>;
}

// 品质等级选项
const GRADE_OPTIONS = [
  { value: 'A', label: 'A级' },
  { value: 'B', label: 'B级' },
  { value: 'C', label: 'C级' },
];

export const AddModal: React.FC<AddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  addForm,
  onFormChange,
  onAddProduct,
  onRemoveProduct,
  onProductChange,
  onGenerateCode,
  greenhouses,
  warehouseOptions,
  cropBatches,
  users,
  errors,
}) => {
  // 获取当前登录用户
  const currentOperator = getCurrentUsername() || '未知用户';

  // 获取选中的批次信息
  const selectedBatch = cropBatches.find(b => b.batchCode === addForm.batchCode);

  // 处理采收人员选择
  const toggleHarvester = (userId: string, userName: string) => {
    const currentIds = addForm.harvesterIds;
    const currentNames = addForm.harvesterNames;
    if (currentIds.includes(userId)) {
      onFormChange('harvesterIds', currentIds.filter(id => id !== userId));
      onFormChange('harvesterNames', currentNames.filter(name => name !== userName));
    } else {
      onFormChange('harvesterIds', [...currentIds, userId]);
      onFormChange('harvesterNames', [...currentNames, userName]);
    }
  };

  // 生成产品编码
  const handleProductCodeGenerate = (idx: number, categoryCode: string, typeCode: string, subCode: string) => {
    const baseCode = `${categoryCode}${typeCode}${subCode}`;
    const seq = Math.floor(Math.random() * 999) + 1;
    const generatedCode = `${baseCode}${String(seq).padStart(3, '0')}`;
    onProductChange(idx, 'productCode', generatedCode);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="采收登记"
      size="xxl"
      showFooter={false}
    >
      {/* 基本信息区域 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">采收单号</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={addForm.harvestCode}
              readOnly
              placeholder="点击生成获取单号"
              className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm bg-gray-50 font-mono"
            />
            <button
              onClick={onGenerateCode}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 shrink-0"
              title="生成采收单号"
            >
              <RefreshCw className="w-4 h-4" />
              生成
            </button>
          </div>
          {errors.harvestCode && <p className="text-red-500 text-xs mt-1">{errors.harvestCode}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">采收日期</label>
          <input
            type="date"
            value={addForm.harvestDate}
            onChange={(e) => onFormChange('harvestDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {errors.harvestDate && <p className="text-red-500 text-xs mt-1">{errors.harvestDate}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">操作员</label>
          <input
            type="text"
            value={currentOperator}
            readOnly
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm bg-gray-100 font-medium"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
          <select
            value={addForm.batchCode}
            onChange={(e) => onFormChange('batchCode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择批次</option>
            {cropBatches.map(batch => (
              <option key={batch.id} value={batch.batchCode}>{batch.batchCode} - {batch.cropName}</option>
            ))}
          </select>
          {errors.batchCode && <p className="text-red-500 text-xs mt-1">{errors.batchCode}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">采收区域</label>
          <select
            value={addForm.greenhouseId}
            onChange={(e) => onFormChange('greenhouseId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择区域</option>
            {greenhouses.map(gh => (
              <option key={gh.id} value={gh.id}>{gh.name}</option>
            ))}
          </select>
          {errors.greenhouseId && <p className="text-red-500 text-xs mt-1">{errors.greenhouseId}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">入库仓库</label>
          <select
            value={addForm.warehouseId}
            onChange={(e) => onFormChange('warehouseId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择仓库</option>
            {warehouseOptions.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
          {errors.warehouseId && <p className="text-red-500 text-xs mt-1">{errors.warehouseId}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">审核人员</label>
          <input
            type="text"
            value={addForm.auditor}
            onChange={(e) => onFormChange('auditor', e.target.value)}
            placeholder="请输入审核人员"
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {/* V3.0 采收类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">采收类型</label>
          <select
            value={addForm.harvestType}
            onChange={(e) => {
              const value = e.target.value as 'seed' | 'seedling' | 'product';
              onFormChange('harvestType', value);
              // 联动更新目标库存
              onFormChange('targetInventory', value);
            }}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="product">成品采收</option>
            <option value="seed">种子采收</option>
            <option value="seedling">种苗采收</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">种子/种苗采收将入库到相应库存</p>
        </div>
        {/* V3.0 目标库存 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">目标库存</label>
          <select
            value={addForm.targetInventory}
            onChange={(e) => onFormChange('targetInventory', e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="product">产品库存</option>
            <option value="seed">种源库存</option>
            <option value="seedling">育苗库存</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {addForm.targetInventory === 'seed' && '采收种子将回到种源库存，形成循环'}
            {addForm.targetInventory === 'seedling' && '采收购苗将回到育苗库存，待下次定植'}
            {addForm.targetInventory === 'product' && '采收成品将进入产品库存'}
          </p>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">采收人员</label>
          <div className="relative">
            <div
              className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex items-center justify-between"
              onClick={() => {
                const dropdown = document.getElementById('harvester-dropdown');
                if (dropdown) dropdown.classList.toggle('hidden');
              }}
            >
              <span className="text-sm text-gray-700">
                {addForm.harvesterIds.length > 0
                  ? `${addForm.harvesterIds.length} 人已选择`
                  : '请选择采收人员'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div id="harvester-dropdown" className="hidden absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
              {users.filter(u => u.role === 'worker' || u.role === 'technician').map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={addForm.harvesterIds.includes(user.id)}
                    onChange={() => toggleHarvester(user.id, user.name)}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 批次信息自动填充区域 */}
      {selectedBatch && (
        <div className="mt-4 bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <div className="text-sm font-medium text-emerald-700 mb-2">批次信息（自动填充）</div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-emerald-600">作物品种</div>
              <div className="text-sm text-gray-900">{selectedBatch.cropName}</div>
            </div>
            <div>
              <div className="text-xs text-emerald-600">作物品种</div>
              <div className="text-sm text-gray-900">{selectedBatch.variety}</div>
            </div>
            <div>
              <div className="text-xs text-emerald-600">种植模式</div>
              <div className="text-sm text-gray-900">{selectedBatch.plantingMode}</div>
            </div>
            <div>
              <div className="text-xs text-emerald-600">目标产量(kg)</div>
              <div className="text-sm text-gray-900">{selectedBatch.targetYield}</div>
            </div>
          </div>
        </div>
      )}

      {/* 产品明细 */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-gray-700">产品明细</label>
          <button
            onClick={onAddProduct}
            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            添加产品
          </button>
        </div>

        {addForm.products.length > 0 ? (
          <div className="overflow-x-auto border border-gray-400 rounded-lg">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-emerald-600">
                <tr>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white w-36">产品编码</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white w-28">产品名称</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white">分类信息</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white w-24">品质等级</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white w-28">采收量(kg)</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white w-28">目标产量</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white w-20">完成率</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white">备注</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-white w-12">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {addForm.products.map((product, idx) => {
                  const completionRate = product.targetYield > 0
                    ? Math.round((product.harvestQuantity / product.targetYield) * 100)
                    : 0;

                  return (
                    <tr key={idx}>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={product.productCode}
                            onChange={(e) => onProductChange(idx, 'productCode', e.target.value.toUpperCase())}
                            placeholder="输入编码"
                            className="w-32 px-2 py-1 border border-gray-400 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={product.cropName}
                          onChange={(e) => onProductChange(idx, 'cropName', e.target.value)}
                          placeholder="输入产品名称"
                          className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-2 py-2 text-sm text-gray-700 bg-gray-50">
                        {(() => {
                          if (!product.productCode || product.productCode.length < 6) {
                            return <span className="text-gray-400">-</span>;
                          }
                          // 解析产品编码获取分类信息
                          const info = getProduceCategoryInfo(product.productCode);
                          if (info) {
                            return `${info.category.name}-${info.type.name}-${info.variety.name}`;
                          }
                          return <span className="text-gray-400">-</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={product.grade}
                          onChange={(e) => onProductChange(idx, 'grade', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">等级</option>
                          {GRADE_OPTIONS.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={product.harvestQuantity}
                          onChange={(e) => onProductChange(idx, 'harvestQuantity', Number(e.target.value))}
                          min="0"
                          className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={product.targetYield}
                          onChange={(e) => onProductChange(idx, 'targetYield', Number(e.target.value))}
                          min="0"
                          className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50 text-center">
                        {completionRate}%
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={product.remarks}
                          onChange={(e) => onProductChange(idx, 'remarks', e.target.value)}
                          placeholder="备注"
                          className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => onRemoveProduct(idx)}
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
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic border border-gray-400 rounded-lg p-4 text-center">
            暂无产品明细，请点击"添加产品"按钮添加
          </div>
        )}
      </div>

      {/* 备注 */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
        <textarea
          value={addForm.remarks}
          onChange={(e) => onFormChange('remarks', e.target.value)}
          placeholder="请输入采收备注"
          rows={2}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
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

export default AddModal;
