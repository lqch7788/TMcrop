/**
 * 编辑订单弹窗
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import { CropVarietyOption } from '@/types/cropVariety';
import * as cropVarietyService from '@/services/cropVarietyService';
import { useOrderDataStore } from '@/stores/useOrderDataStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: CropOrder | null;
  orderTypeOptions: { value: string; label: string }[];
}

export function EditModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  orderTypeOptions,
}: EditModalProps) {
  // 表单状态
  const [formData, setFormData] = useState({
    orderCode: '',
    orderName: '',
    orderType: 'production' as 'breeding' | 'seedling' | 'production' | 'research' | 'other',
    cropCategory: '',
    cropVariety: '',
    plannedQuantity: 0,
    actualQuantity: 0,
    unit: '株',
    supplierName: '',
    orderDate: '',
    expectedHarvestDate: '',
    remarks: '',
    isCompleted: false, // 是否完成
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // 当记录变化时更新表单
  useEffect(() => {
    if (record && isOpen) {
      // 如果订单已完成，禁止编辑
      if (record.status === CropOrderStatus.COMPLETED) {
        alert('该订单已完成，无法编辑');
        onClose();
        return;
      }
      setFormData({
        orderCode: record.orderCode || '',
        orderName: record.orderName || '',
        orderType: record.orderType || 'production',
        cropCategory: record.cropCategory || '',
        cropVariety: record.cropVariety || '',
        plannedQuantity: record.plannedQuantity || 0,
        actualQuantity: record.actualQuantity || 0,
        unit: record.unit || '株',
        supplierName: record.supplierName || '',
        orderDate: record.orderDate || '',
        expectedHarvestDate: record.expectedHarvestDate || '',
        remarks: record.remarks || '',
        isCompleted: record.status === CropOrderStatus.COMPLETED,
      });
      setSearchKeyword(record.cropVariety || '');
    }
  }, [record, isOpen]);

  // 初始化品种数据
  cropVarietyService.initVarieties();

  // 所有品种选项
  const varietyOptions = useMemo(() => cropVarietyService.getVarietyOptions(), []);

  // 过滤品种选项
  const filteredVarieties = useMemo(() => {
    if (!searchKeyword.trim()) {
      return varietyOptions.slice(0, 20);
    }
    const keyword = searchKeyword.toLowerCase();
    return varietyOptions.filter(opt =>
      opt.label.toLowerCase().includes(keyword) ||
      opt.fullPath.toLowerCase().includes(keyword) ||
      opt.varietyCode.toLowerCase().includes(keyword)
    ).slice(0, 20);
  }, [varietyOptions, searchKeyword]);

  // 选择品种
  const handleSelectVariety = (variety: CropVarietyOption) => {
    setFormData(prev => ({
      ...prev,
      cropVariety: variety.label,
      cropCategory: variety.fullPath,
    }));
    setSearchKeyword(variety.label);
    setShowDropdown(false);
    setErrors(prev => ({ ...prev, cropVariety: '' }));
  };

  // 搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);
    setShowDropdown(true);
    if (!value.trim()) {
      setFormData(prev => ({
        ...prev,
        cropVariety: '',
        cropCategory: '',
      }));
    }
  };

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false);
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  const handleSubmit = async () => {
    // 如果订单已完成，禁止编辑
    if (record && record.status === CropOrderStatus.COMPLETED) {
      alert('该订单已完成，无法编辑');
      onClose();
      return;
    }

    // 如果选择"是"完成订单，弹出确认警告
    if (formData.isCompleted) {
      const confirmed = window.confirm(
        '⚠️ 重要提示：\n\n' +
        '确认将订单标记为完成吗？\n\n' +
        '完成后该订单将进入保存档案状态：\n' +
        '• 无法进行任何编辑操作\n' +
        '• 无法删除订单\n' +
        '• 无法关联新的作物实例\n\n' +
        '此操作不可逆，请确认！'
      );
      if (!confirmed) {
        return;
      }
    }

    // 验证
    const newErrors: Record<string, string> = {};
    if (!formData.orderCode) newErrors.orderCode = '请输入订单编号';
    if (!formData.orderName) newErrors.orderName = '请输入订单名称';
    if (!formData.cropVariety) newErrors.cropVariety = '请选择作物品种';
    if (formData.plannedQuantity <= 0) newErrors.plannedQuantity = '请输入计划数量';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!record) return;

    // 更新订单
    const updates: Partial<CropOrder> = {
      orderCode: formData.orderCode,
      orderName: formData.orderName,
      orderType: formData.orderType,
      orderDate: formData.orderDate,
      expectedHarvestDate: formData.expectedHarvestDate || undefined,
      cropCategory: formData.cropCategory,
      cropName: '',
      cropVariety: formData.cropVariety,
      plannedQuantity: formData.plannedQuantity,
      actualQuantity: formData.actualQuantity,
      unit: formData.unit,
      supplierName: formData.supplierName,
      remarks: formData.remarks,
      // 如果选择完成，状态变为已完成
      status: formData.isCompleted ? CropOrderStatus.COMPLETED : record.status,
    };

    console.log('[EditModal] 准备更新的订单数据:', JSON.stringify(updates, null, 2));

    try {
      // 通过 Zustand Store 更新订单（同时更新后端和本地状态，避免缓存导致数据不刷新）
      const store = useOrderDataStore.getState();
      const result = await store.updateOrder(record.id, updates);
      console.log('[EditModal] 更新订单成功:', result);
    } catch (error) {
      console.error('更新订单失败:', error);
      alert('更新订单失败，请重试');
      return;
    }
    onSuccess();
    onClose();
  };

  // 表单内容
  const formContent = (
    <div className="grid grid-cols-2 gap-4">
      {/* 订单编号 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          订单编号
        </label>
        <input
          type="text"
          value={formData.orderCode}
          readOnly
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
        />
      </div>

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

      {/* 作物品种 - 搜索框 */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          作物品种 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              placeholder="搜索作物品种..."
              className={`w-full h-10 pl-10 pr-3 border rounded-lg text-sm focus:outline-none focus:border-emerald-500 ${
                errors.cropVariety ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {searchKeyword && (
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchKeyword('');
                  setFormData(prev => ({ ...prev, cropVariety: '', cropCategory: '' }));
                }}
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </Button>
            )}
          </div>
          {/* 下拉选择列表 */}
          {showDropdown && filteredVarieties.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredVarieties.map((variety, index) => (
                <div
                  key={`${variety.value}-${index}`}
                  onClick={() => handleSelectVariety(variety)}
                  className="px-3 py-2 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-900">{variety.label}</div>
                  <div className="text-xs text-gray-500 truncate">{variety.fullPath}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {errors.cropVariety && <p className="text-xs text-red-500 mt-1">{errors.cropVariety}</p>}
      </div>

      {/* 品种路径（自动填充） */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          品种路径
        </label>
        <input
          type="text"
          value={formData.cropCategory}
          readOnly
          placeholder="选择作物品种后自动填充"
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
        />
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

      {/* 是否完成 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          订单完成
        </label>
        <select
          value={formData.isCompleted ? 'yes' : 'no'}
          onChange={(e) => setFormData({ ...formData, isCompleted: e.target.value === 'yes' })}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="no">否</option>
          <option value="yes">是</option>
        </select>
        {formData.isCompleted && (
          <p className="text-xs text-orange-500 mt-1">⚠️ 选择"是"后订单将无法编辑</p>
        )}
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
  );

  // 底部按钮
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button onClick={onClose} variant="secondary" size="sm">
        取消
      </Button>
      <Button onClick={handleSubmit} variant="default" size="sm">
        保存修改
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑订单"
      size="lg"
      width={700}
      height={600}
      showFooter={true}
      footer={footer}
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
    >
      <div className="px-2">
        {formContent}
      </div>
    </Modal>
  );
}
