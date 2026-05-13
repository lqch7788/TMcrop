/**
 * 新增订单弹窗
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import { CropVarietyOption } from '@/types/cropVariety';
import * as cropVarietyService from '@/services/cropVarietyService';
import { useOrderDataStore } from '@/stores/useOrderDataStore';
import { Modal } from '@/components/ui/Modal';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderTypeOptions: { value: string; label: string }[];
}

// 生成订单编号：DD + 年月日(8位) + 4位流水号
const generateOrderCode = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestampStr = `${year}${month}${day}`;
  // 流水号使用0001作为占位符，后端会根据实际最大值调整
  return `DD${timestampStr}0001`;
};

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  orderTypeOptions,
}: AddModalProps) {
  // 表单状态
  const [formData, setFormData] = useState({
    orderCode: '',
    orderName: '',
    orderType: 'production' as 'breeding' | 'seedling' | 'production' | 'research' | 'other',
    cropCategory: '',       // 品种路径
    cropVariety: '',       // 作物品种（搜索用）
    plannedQuantity: 0,
    actualQuantity: 0,
    unit: '株',
    supplierName: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedHarvestDate: '',
    remarks: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // 弹窗打开时自动生成订单编号
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        orderCode: generateOrderCode()
      }));
      setSearchKeyword('');
      setShowDropdown(false);
    }
  }, [isOpen]);

  // 初始化品种数据
  cropVarietyService.initVarieties();

  // 所有品种选项
  const varietyOptions = useMemo(() => cropVarietyService.getVarietyOptions(), []);

  // 过滤品种选项（根据搜索关键词）
  const filteredVarieties = useMemo(() => {
    if (!searchKeyword.trim()) {
      // 无搜索关键词时显示前20条
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
      cropVariety: variety.label,        // 作物品种（品种名称，如"大叶红颜"）
      cropCategory: variety.fullPath,   // 品种路径（完整路径，如"水果类 > 茄果类 > 番茄 > 红颜 > 大叶红颜"）
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

    // 创建订单
    const newOrder: Omit<CropOrder, 'id' | 'createTime' | 'updateTime'> = {
      orderCode: formData.orderCode,
      orderName: formData.orderName,
      orderType: formData.orderType,
      orderDate: formData.orderDate,
      expectedHarvestDate: formData.expectedHarvestDate || undefined,
      cropCategory: formData.cropCategory,  // 品种路径（完整路径）
      cropName: '',                          // 作物名称（已取消字段）
      cropVariety: formData.cropVariety,     // 作物品种
      plannedQuantity: formData.plannedQuantity,
      actualQuantity: formData.actualQuantity,
      unit: formData.unit,
      supplierName: formData.supplierName,
      status: CropOrderStatus.PLANNED,
      remarks: formData.remarks,
      instanceIds: [],
      createBy: localStorage.getItem('username') || '',
    };

    console.log('[AddModal] 准备创建的订单数据:', JSON.stringify(newOrder, null, 2));

    try {
      // 通过 Zustand Store 创建订单（同时更新后端和本地状态）
      const store = useOrderDataStore.getState();
      const result = await store.addOrder(newOrder);
      console.log('[AddModal] 创建订单成功，返回数据:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('创建订单失败:', error);
      alert('创建订单失败，请重试');
      return;
    }
    onSuccess();
    onClose();

    // 重置表单
    setFormData({
      orderCode: '',
      orderName: '',
      orderType: 'production',
      cropCategory: '',
      cropVariety: '',
      plannedQuantity: 0,
      actualQuantity: 0,
      unit: '株',
      supplierName: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedHarvestDate: '',
      remarks: '',
    });
    setSearchKeyword('');
    setErrors({});
  };

  // 表单内容
  const formContent = (
    <div className="grid grid-cols-2 gap-4">
      {/* 订单编号 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          订单编号
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.orderCode}
            onChange={(e) => setFormData({ ...formData, orderCode: e.target.value })}
            placeholder="点击生成获取编号"
            className={`flex-1 h-10 px-3 border rounded-lg text-sm focus:outline-none focus:border-emerald-500 ${
              errors.orderCode ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, orderCode: generateOrderCode() }))}
            className="px-4 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 whitespace-nowrap"
          >
            生成
          </button>
        </div>
        {errors.orderCode && <p className="text-xs text-red-500 mt-1">{errors.orderCode}</p>}
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchKeyword('');
                  setFormData(prev => ({ ...prev, cropVariety: '', cropCategory: '' }));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
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
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增订单"
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
