/**
 * 种源新增弹窗
 */

import React, { useState } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { X, Upload } from 'lucide-react';
import { SourceType, StockStatus, SourceOrigin } from '../../../../types/crop';
import { addSeedSource, updateSeedSource } from '../../../../services/seedSourceService';
import * as cropInstanceService from '../../../../services/cropInstanceService';
import { findProduceCodeByName } from '../../../../data/produceCodeRule';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  cropCategories: Array<{ value: string; label: string }>;
  cropNames: Array<{ value: string; label: string }>;
  cropVarieties: Array<{ value: string; label: string }>;
  suppliers: Array<{ value: string; label: string }>;
  units: Array<{ value: string; label: string }>;
}

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  cropCategories,
  cropNames,
  cropVarieties,
  suppliers,
  units
}: AddModalProps) {
  const [formData, setFormData] = useState({
    sourceType: SourceType.SEED,
    cropCategory: '',
    cropName: '',
    cropVariety: '',
    supplierId: '',
    supplierName: '',
    purchaseDate: '',
    quantity: 0,
    unit: '袋',
    unitPrice: 0,
    pictures: [] as string[],
    remarks: ''
  });

  const handleSubmit = () => {
    // 获取供应商名称
    const supplier = suppliers.find(s => s.value === formData.supplierId);
    const supplierName = supplier?.label || '';

    // 计算总金额
    const totalAmount = formData.quantity * formData.unitPrice;

    // 初始数量 = 可用数量（新入库）
    const initialCount = formData.quantity * 1000; // 假设每袋1000粒/株
    const availableCount = initialCount;

    // 判断库存状态
    let status = StockStatus.SUFFICIENT;
    if (availableCount === 0) {
      status = StockStatus.DEPLETED;
    } else if (availableCount < initialCount * 0.2) {
      status = StockStatus.LOW;
    }

    // 生成溯源码
    const traceabilityCode = 'TR' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + formData.cropName.substring(0, 2);

    // 生成作物编码（来自品种编码）
    const cropInfo = findProduceCodeByName(formData.cropName);
    let cropCode = '';
    if (cropInfo) {
      const seq = Math.floor(Math.random() * 999) + 1;
      cropCode = `${cropInfo.categoryCode}${cropInfo.typeCode}${cropInfo.subCode}${String(seq).padStart(3, '0')}`;
    }

    // 创建种源记录
    const newSeedSource = addSeedSource({
      seedCode: 'ZZ' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      sourceType: formData.sourceType,
      cropCategory: formData.cropCategory,
      cropName: formData.cropName,
      cropVariety: formData.cropVariety,
      cropCode,
      supplierId: formData.supplierId,
      supplierName,
      purchaseDate: formData.purchaseDate,
      quantity: formData.quantity,
      unit: formData.unit,
      unitPrice: formData.unitPrice,
      totalAmount,
      initialCount,
      availableCount,
      pictures: formData.pictures,
      remarks: formData.remarks,
      status,
      traceabilityCode,
      printCount: 0,
      createBy: '当前用户'
    });

    // 同时创建作物实例记录（实现统一追踪）
    try {
      // 确定来源类型：如果是外部采购，使用 external_purchase
      const sourceOrigin: SourceOrigin = 'external_purchase';
      const instance = cropInstanceService.createInstance(
        {
          cropCategory: formData.cropCategory,
          cropName: formData.cropName,
          cropVariety: formData.cropVariety,
        },
        sourceOrigin,
        initialCount,
        {
          sourceDescription: `种源入库-${supplierName || '未知供应商'}`,
        }
      );
      // 更新种源记录的 instanceId
      updateSeedSource(newSeedSource.id, { instanceId: instance.id });
    } catch (error) {
      console.error('创建作物实例失败:', error);
    }

    onClose();
    onSuccess?.();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增种源"
      size="xl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
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

        {/* 作物名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">作物名称</label>
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

        {/* 来源类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种源类型</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="sourceType"
                value={SourceType.SEED}
                checked={formData.sourceType === SourceType.SEED}
                onChange={() => setFormData({ ...formData, sourceType: SourceType.SEED })}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm">种子</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="sourceType"
                value={SourceType.SEEDLING}
                checked={formData.sourceType === SourceType.SEEDLING}
                onChange={() => setFormData({ ...formData, sourceType: SourceType.SEEDLING })}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm">种苗</span>
            </label>
          </div>
        </div>

        {/* 供应商 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">供应商</label>
          <select
            value={formData.supplierId}
            onChange={(e) => {
              const supplier = suppliers.find(s => s.value === e.target.value);
              setFormData({ ...formData, supplierId: e.target.value, supplierName: supplier?.label || '' });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {suppliers.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 购买日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">购买日期</label>
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
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            {/* 已上传的图片预览 */}
            {formData.pictures.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.pictures.map((pic, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={pic}
                      alt={`预览${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        pictures: formData.pictures.filter((_, i) => i !== index)
                      })}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* 上传按钮 */}
            <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg py-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">点击上传图片</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    Array.from(files).forEach(file => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        setFormData({
                          ...formData,
                          pictures: [...formData.pictures, result]
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                  e.target.value = '';
                }}
              />
            </label>
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
