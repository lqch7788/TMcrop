/**
 * 种源编辑弹窗
 * V3.1: 使用 API 驱动的 DictSelect 组件
 */

import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { SeedSource, SourceType, SourceOrigin, StockStatus } from '../../../../types/crop';
import { updateSeedSource } from '../../../../services/seedSourceService';
import { DictSelect } from '../../../common/settings/DictSelect';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: SeedSource;
  cropCategories: Array<{ value: string; label: string }>;
  cropNames: Array<{ value: string; label: string }>;
  cropVarieties: Array<{ value: string; label: string }>;
  suppliers: Array<{ value: string; label: string }>;
  units: Array<{ value: string; label: string }>;
}

export function EditModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  cropCategories,
  cropNames,
  cropVarieties,
  suppliers,
  units
}: EditModalProps) {
  const [formData, setFormData] = useState({
    sourceType: record.sourceType,
    sourceOrigin: record.sourceOrigin || 'external_purchase',
    cropCategory: record.cropCategory,
    cropName: record.cropName,
    cropVariety: record.cropVariety,
    supplierId: record.supplierId,
    supplierName: record.supplierName,
    purchaseDate: record.purchaseDate,
    quantity: record.quantity,
    unit: record.unit,
    unitPrice: record.unitPrice,
    pictures: (() => {
      if (Array.isArray(record.pictures)) return record.pictures;
      if (typeof record.pictures === 'string') {
        try { return JSON.parse(record.pictures); } catch { return []; }
      }
      return [];
    })(),
    remarks: record.remarks || ''
  });

  // 当 record 变化时重置表单
  useEffect(() => {
    setFormData({
      sourceType: record.sourceType,
      sourceOrigin: record.sourceOrigin || 'external_purchase',
      cropCategory: record.cropCategory,
      cropName: record.cropName,
      cropVariety: record.cropVariety,
      supplierId: record.supplierId,
      supplierName: record.supplierName,
      purchaseDate: record.purchaseDate,
      quantity: record.quantity,
      unit: record.unit,
      unitPrice: record.unitPrice,
      pictures: (() => {
      if (Array.isArray(record.pictures)) return record.pictures;
      if (typeof record.pictures === 'string') {
        try { return JSON.parse(record.pictures); } catch { return []; }
      }
      return [];
    })(),
      remarks: record.remarks || ''
    });
  }, [record]);

  const handleSubmit = () => {
    // 验证：选择"其他"时备注必填
    if (formData.sourceType === SourceType.OTHER && !formData.remarks.trim()) {
      alert('选择"其他"种源类型时，备注为必填项，请输入详细说明');
      return;
    }
    // 外部采购时供应商必填
    if (formData.sourceOrigin === 'external_purchase' && !formData.supplierId) {
      alert('请选择供应商');
      return;
    }

    // 获取供应商名称
    const supplier = suppliers.find(s => s.value === formData.supplierId);
    const supplierName = supplier?.label || formData.supplierName;

    // 计算总金额
    const totalAmount = formData.quantity * formData.unitPrice;

    // 判断库存状态
    let status = record.status;
    if (formData.quantity === 0) {
      status = StockStatus.DEPLETED;
    } else if (formData.quantity < record.initialCount * 0.2) {
      status = StockStatus.LOW;
    } else {
      status = StockStatus.SUFFICIENT;
    }

    updateSeedSource(record.id, {
      sourceType: formData.sourceType,
      sourceOrigin: formData.sourceOrigin,
      cropCategory: formData.cropCategory,
      cropName: formData.cropName,
      cropVariety: formData.cropVariety,
      supplierId: formData.supplierId,
      supplierName,
      purchaseDate: formData.purchaseDate,
      quantity: formData.quantity,
      unit: formData.unit,
      unitPrice: formData.unitPrice,
      totalAmount,
      pictures: formData.pictures,
      remarks: formData.remarks,
      status
    });

    onClose();
    onSuccess?.();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑种源"
      size="xl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* 种源批号 - 只读显示 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种源批号</label>
          <input
            type="text"
            value={record.seedCode}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 font-mono"
          />
        </div>

        {/* 作物类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">作物类型</label>
          <select
            value={formData.cropCategory}
            onChange={(e) => setFormData({ ...formData, cropCategory: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {cropCategories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 作物品种 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">作物品种</label>
          <select
            value={formData.cropName}
            onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {cropNames.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 品种 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">品种</label>
          <select
            value={formData.cropVariety}
            onChange={(e) => setFormData({ ...formData, cropVariety: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {cropVarieties.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* 种源类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种源类型</label>
          <DictSelect
            category="source_type"
            value={formData.sourceType}
            onChange={(value) => setFormData({ ...formData, sourceType: value as SourceType })}
            placeholder="选择种源类型"
          />
          {/* 选择"其他"时显示补充说明输入框 */}
          {formData.sourceType === SourceType.OTHER && (
            <div className="mt-2">
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="请输入其他种源类型的详细说明"
                autoFocus
              />
              <p className="mt-1 text-xs text-red-500">必填：选择"其他"时必须填写详细说明</p>
            </div>
          )}
        </div>

        {/* 来源途径 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">来源途径</label>
          <DictSelect
            category="source_origin"
            value={formData.sourceOrigin}
            onChange={(value) => setFormData({ ...formData, sourceOrigin: value as SourceOrigin })}
            placeholder="选择来源途径"
          />
          {/* 选择"其他"时显示补充说明 */}
          {formData.sourceOrigin === 'other' && (
            <p className="mt-1 text-xs text-gray-400">请在备注中说明具体来源</p>
          )}
        </div>

        {/* 供应商 - 外部采购时必填，其他来源可选 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {formData.sourceOrigin === 'external_purchase' && <span className="text-red-500">*</span>}
            {formData.sourceOrigin === 'external_purchase' ? '供应商' : '供应商（可选）'}
          </label>
          <select
            value={formData.supplierId}
            onChange={(e) => {
              const supplier = suppliers.find(s => s.value === e.target.value);
              setFormData({ ...formData, supplierId: e.target.value, supplierName: supplier?.label || '' });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">{
              formData.sourceOrigin === 'external_purchase'
                ? '请选择'
                : '内部自留/无需填写'
            }</option>
            {formData.sourceOrigin === 'external_purchase' && suppliers.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 采购/入库日期 - 根据来源途径动态显示标签 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {formData.sourceOrigin === 'external_purchase' ? '采购日期' : '入库日期'}
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 登记数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">登记数量</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {units.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 单价 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">单价（元）</label>
          <input
            type="number"
            value={formData.unitPrice || ''}
            onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 图片上传 - 占两列 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">图片上传</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer">
            <div className="text-gray-500 text-sm">
              点击上传或拖拽图片到此处
            </div>
          </div>
        </div>

        {/* 备注 - 占两列 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="请输入备注信息"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
