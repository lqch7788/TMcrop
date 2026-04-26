/**
 * 新增订单弹窗
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import * as cropOrderService from '@/services/cropOrderService';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cropCategories: string[];
  cropNames: string[];
  cropVarieties: string[];
  orderTypeOptions: { value: string; label: string }[];
}

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  cropCategories,
  cropNames,
  cropVarieties,
  orderTypeOptions,
}: AddModalProps) {
  const [formData, setFormData] = useState({
    orderName: '',
    orderType: 'production' as 'production' | 'seed' | 'research',
    cropCategory: '',
    cropName: '',
    cropVariety: '',
    plannedQuantity: 0,
    actualQuantity: 0,
    unit: '株',
    supplierName: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedHarvestDate: '',
    remarks: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    // 验证
    const newErrors: Record<string, string> = {};
    if (!formData.orderName) newErrors.orderName = '请输入订单名称';
    if (!formData.cropName) newErrors.cropName = '请选择作物名称';
    if (!formData.cropVariety) newErrors.cropVariety = '请选择作物品种';
    if (formData.plannedQuantity <= 0) newErrors.plannedQuantity = '请输入计划数量';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 创建订单
    const newOrder: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'> = {
      orderName: formData.orderName,
      orderType: formData.orderType,
      orderDate: formData.orderDate,
      expectedHarvestDate: formData.expectedHarvestDate || undefined,
      cropCategory: formData.cropCategory,
      cropName: formData.cropName,
      cropVariety: formData.cropVariety,
      plannedQuantity: formData.plannedQuantity,
      actualQuantity: formData.actualQuantity,
      unit: formData.unit,
      supplierName: formData.supplierName,
      status: CropOrderStatus.PLANNED,
      remarks: formData.remarks,
      instanceIds: [],
      createBy: '系统',
    };

    cropOrderService.createOrder(newOrder);
    onSuccess();
    onClose();

    // 重置表单
    setFormData({
      orderName: '',
      orderType: 'production',
      cropCategory: '',
      cropName: '',
      cropVariety: '',
      plannedQuantity: 0,
      actualQuantity: 0,
      unit: '株',
      supplierName: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedHarvestDate: '',
      remarks: '',
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">新增订单</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            {/* 订单名称 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                订单名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.orderName}
                onChange={(e) => setFormData({ ...formData, orderName: e.target.value })}
                placeholder="请输入订单名称"
                className={`w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:border-emerald-500 ${
                  errors.orderName ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.orderName && <p className="text-xs text-red-500 mt-1">{errors.orderName}</p>}
            </div>

            {/* 订单类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                订单类型
              </label>
              <select
                value={formData.orderType}
                onChange={(e) => setFormData({ ...formData, orderType: e.target.value as any })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                {orderTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 订单日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                订单日期
              </label>
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 作物类别 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作物类别
              </label>
              <select
                value={formData.cropCategory}
                onChange={(e) => setFormData({ ...formData, cropCategory: e.target.value, cropName: '', cropVariety: '' })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择</option>
                {cropCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 作物名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作物名称 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.cropName}
                onChange={(e) => setFormData({ ...formData, cropName: e.target.value, cropVariety: '' })}
                className={`w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:border-emerald-500 ${
                  errors.cropName ? 'border-red-500' : 'border-gray-200'
                }`}
              >
                <option value="">请选择</option>
                {cropNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {errors.cropName && <p className="text-xs text-red-500 mt-1">{errors.cropName}</p>}
            </div>

            {/* 作物品种 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作物品种 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.cropVariety}
                onChange={(e) => setFormData({ ...formData, cropVariety: e.target.value })}
                className={`w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:border-emerald-500 ${
                  errors.cropVariety ? 'border-red-500' : 'border-gray-200'
                }`}
              >
                <option value="">请选择</option>
                {cropVarieties.map((variety) => (
                  <option key={variety} value={variety}>{variety}</option>
                ))}
              </select>
              {errors.cropVariety && <p className="text-xs text-red-500 mt-1">{errors.cropVariety}</p>}
            </div>

            {/* 单位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单位
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="株">株</option>
                <option value="棵">棵</option>
                <option value="袋">袋</option>
                <option value="公斤">公斤</option>
                <option value="吨">吨</option>
              </select>
            </div>

            {/* 计划数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                计划数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.plannedQuantity || ''}
                onChange={(e) => setFormData({ ...formData, plannedQuantity: Number(e.target.value) })}
                placeholder="请输入计划数量"
                className={`w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:border-emerald-500 ${
                  errors.plannedQuantity ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.plannedQuantity && <p className="text-xs text-red-500 mt-1">{errors.plannedQuantity}</p>}
            </div>

            {/* 实际数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                实际数量
              </label>
              <input
                type="number"
                value={formData.actualQuantity || ''}
                onChange={(e) => setFormData({ ...formData, actualQuantity: Number(e.target.value) })}
                placeholder="请输入实际数量"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 供应商 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                供应商
              </label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder="请输入供应商名称"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 预计采收日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                预计采收日期
              </label>
              <input
                type="date"
                value={formData.expectedHarvestDate}
                onChange={(e) => setFormData({ ...formData, expectedHarvestDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 备注 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="请输入备注信息"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            确认创建
          </button>
        </div>
      </div>
    </div>
  );
}
