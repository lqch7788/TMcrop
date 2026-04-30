// 新增入库弹窗组件

import { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { NewInboundForm, CategoryConfig, InboundRecord } from './types';
import { unitOptions } from './mockData';

interface AddInboundModalProps {
  show: boolean;
  newInbound: NewInboundForm;
  categoryConfig: CategoryConfig;
  codeError: string;
  nameError: string;
  onClose: () => void;
  onSave: () => void;
  onGenerateOrderCode: () => void;
  onFormChange: (form: NewInboundForm) => void;
  onCategoryChange: (field: string, value: string) => void;
  onMaterialNameChange: (value: string) => void;
  onCheckCodeDuplicate: (code: string) => void;
}

export default function AddInboundModal({
  show,
  newInbound,
  categoryConfig,
  codeError,
  nameError,
  onClose,
  onSave,
  onGenerateOrderCode,
  onFormChange,
  onCategoryChange,
  onMaterialNameChange,
  onCheckCodeDuplicate,
}: AddInboundModalProps) {
  if (!show) return null;

  // 获取中类选项
  const getMidCategories = () => {
    if (!newInbound.bigCategory) return [];
    const bigCat = categoryConfig[newInbound.bigCategory];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取小类选项
  const getSubCategories = () => {
    if (!newInbound.bigCategory || !newInbound.midCategory) return [];
    const bigCat = categoryConfig[newInbound.bigCategory];
    if (!bigCat) return [];
    const midCat = bigCat.categories[newInbound.midCategory];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  };

  const isFormValid = !codeError && !nameError && newInbound.materialCode && newInbound.materialName && newInbound.quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
          <h3 className="text-lg font-semibold text-white">新增入库</h3>
          <button onClick={onClose} className="text-white hover:bg-emerald-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {/* 入库单号 */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">入库单号</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInbound.orderCode}
                onChange={(e) => onFormChange({ ...newInbound, orderCode: e.target.value })}
                placeholder="点击自动生成"
                className="flex-1 h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500 bg-gray-50"
                readOnly
              />
              <button
                type="button"
                onClick={onGenerateOrderCode}
                className="px-3 h-8 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                自动生成
              </button>
            </div>
          </div>

          {/* 物料编码和物料名称 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">物料编码 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newInbound.materialCode}
                onChange={(e) => {
                  onFormChange({ ...newInbound, materialCode: e.target.value });
                  onCheckCodeDuplicate(e.target.value);
                }}
                placeholder="从编码生成器复制"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">物料名称 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newInbound.materialName}
                onChange={(e) => onMaterialNameChange(e.target.value)}
                placeholder="请输入"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">分类</label>
              <input
                type="text"
                value={newInbound.category}
                onChange={(e) => onFormChange({ ...newInbound, category: e.target.value })}
                placeholder="请输入"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 规格型号、条形码、单位 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">规格型号</label>
              <input
                type="text"
                value={newInbound.specification}
                onChange={(e) => onFormChange({ ...newInbound, specification: e.target.value })}
                placeholder="如：25kg/袋"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">条形码</label>
              <input
                type="text"
                value={newInbound.barcode}
                onChange={(e) => onFormChange({ ...newInbound, barcode: e.target.value })}
                placeholder="请输入"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">单位</label>
              <select
                value={newInbound.unit}
                onChange={(e) => onFormChange({ ...newInbound, unit: e.target.value })}
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              >
                {unitOptions.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 入库数量、单价（元）、供应商 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">入库数量 <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={newInbound.quantity}
                onChange={(e) => onFormChange({ ...newInbound, quantity: e.target.value })}
                placeholder="请输入"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">单价（元）</label>
              <input
                type="text"
                value={newInbound.price}
                onChange={(e) => onFormChange({ ...newInbound, price: e.target.value })}
                placeholder="请输入"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">供应商</label>
              <input
                type="text"
                value={newInbound.supplier}
                onChange={(e) => onFormChange({ ...newInbound, supplier: e.target.value })}
                placeholder="请输入"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 存放位置、批次号 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">存放位置</label>
              <input
                type="text"
                value={newInbound.location}
                onChange={(e) => onFormChange({ ...newInbound, location: e.target.value })}
                placeholder="如：A区-01"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">批次号</label>
              <input
                type="text"
                value={newInbound.batchNo}
                onChange={(e) => onFormChange({ ...newInbound, batchNo: e.target.value })}
                placeholder="如：PC20260301"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">生产日期</label>
              <input
                type="date"
                value={newInbound.productionDate}
                onChange={(e) => onFormChange({ ...newInbound, productionDate: e.target.value })}
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 有效期至、入库日期、操作员 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">有效期至</label>
              <input
                type="date"
                value={newInbound.expiryDate}
                onChange={(e) => onFormChange({ ...newInbound, expiryDate: e.target.value })}
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">入库日期</label>
              <input
                type="date"
                value={newInbound.inboundDate}
                onChange={(e) => onFormChange({ ...newInbound, inboundDate: e.target.value })}
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">操作员</label>
              <input
                type="text"
                value={newInbound.operator}
                onChange={(e) => onFormChange({ ...newInbound, operator: e.target.value })}
                placeholder="请输入"
                className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={newInbound.remarks}
              onChange={(e) => onFormChange({ ...newInbound, remarks: e.target.value })}
              placeholder="请输入备注"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* 错误提示 */}
          {(codeError || nameError) && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{codeError || nameError}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={onSave}
            disabled={!isFormValid}
            className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
