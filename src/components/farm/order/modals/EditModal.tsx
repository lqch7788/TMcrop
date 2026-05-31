/**
 * 编辑订单弹窗
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import { CropVarietyOption } from '@/types/cropVariety';
import * as cropVarietyService from '@/services/cropVarietyService';
import { useOrderDataStore } from '@/stores/useOrderDataStore';
import { useCustomerStore } from '@/stores';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/TextArea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showAlert, showConfirm } from '@/lib/dialogService';

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
  // 客户数据
  const { customers, fetchCustomers } = useCustomerStore();

  // 表单状态
  const [formData, setFormData] = useState({
    orderCode: '',
    orderName: '',
    orderType: 'production' as 'breeding' | 'seedling' | 'production' | 'research' | 'other',
    cropCategory: '',
    cropVariety: '',
    plannedQuantity: 0,
    completedQuantity: 0,
    unit: '株',
    orderDate: '',
    expectedCompletionDate: '',
    remarks: '',
    isCompleted: false, // 是否完成
    // 客户相关字段
    customerId: '',
    customerPhone: '',
    deliveryAddress: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // 输入框深度样式
  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

  // 当记录变化时更新表单
  useEffect(() => {
    if (record && isOpen) {
      // 如果订单已完成，禁止编辑
      if (record.status === CropOrderStatus.COMPLETED) {
        showAlert('该订单已完成，无法编辑');
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
        completedQuantity: record.completedQuantity || 0,
        unit: record.unit || '株',
        orderDate: record.orderDate || '',
        expectedCompletionDate: record.expectedCompletionDate || '',
        remarks: record.remarks || '',
        isCompleted: record.status === CropOrderStatus.COMPLETED,
        // 客户相关字段
        customerId: (record as any).customerId || '',
        customerPhone: (record as any).customerPhone || '',
        deliveryAddress: (record as any).deliveryAddress || '',
      });
      setSearchKeyword(record.cropVariety || '');
      fetchCustomers();
    }
  }, [record, isOpen]);

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
      await showAlert('该订单已完成，无法编辑');
      onClose();
      return;
    }

    // 如果选择"是"完成订单，弹出确认警告
    if (formData.isCompleted) {
      const confirmed = await showConfirm(
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
    const updates: Partial<CropOrder> & Record<string, unknown> = {
      orderCode: formData.orderCode,
      orderName: formData.orderName,
      orderType: formData.orderType,
      orderDate: formData.orderDate,
      expectedCompletionDate: formData.expectedCompletionDate || '',
      cropCategory: formData.cropCategory,
      cropName: '',
      cropVariety: formData.cropVariety,
      plannedQuantity: formData.plannedQuantity,
      completedQuantity: formData.completedQuantity,
      unit: formData.unit,
      remarks: formData.remarks,
      // 如果选择完成，状态变为已完成
      status: formData.isCompleted ? CropOrderStatus.COMPLETED : record.status,
      // 客户相关字段
      customerId: formData.customerId || undefined,
    };

    // logger.info('[EditModal] 准备更新的订单数据:', JSON.stringify(updates, null, 2));

    try {
      // 通过 Zustand Store 更新订单（同时更新后端和本地状态，避免缓存导致数据不刷新）
      const store = useOrderDataStore.getState();
      const result = await store.updateOrder(record.id, updates);
      // logger.info('[EditModal] 更新订单成功:', result);
    } catch (error) {
      // logger.error('更新订单失败:', error);
      await showAlert('更新订单失败，请重试');
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
        <Label className="text-gray-700">
          订单编号
        </Label>
        <Input
          type="text"
          value={formData.orderCode}
          readOnly
          className="border-gray-300 bg-gray-50 text-gray-600"
        />
      </div>

      {/* 订单名称 */}
      <div>
        <Label className="text-gray-700">
          订单名称 <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          value={formData.orderName}
          onChange={(e) => setFormData({ ...formData, orderName: e.target.value })}
          placeholder="请输入订单名称"
          className={`${errors.orderName ? 'border-red-500' : deepInputClass}`}
        />
        {errors.orderName && <p className="text-xs text-red-500 mt-1">{errors.orderName}</p>}
      </div>

      {/* 订单类型 */}
      <div>
        <Label className="text-gray-700">
          订单类型
        </Label>
        <Select
          value={formData.orderType}
          onValueChange={(v) => setFormData({ ...formData, orderType: v as any })}
        >
          <SelectTrigger className="border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {orderTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 订单日期 */}
      <div>
        <Label className="text-gray-700">
          订单日期
        </Label>
        <DatePicker
          selected={formData.orderDate ? new Date(formData.orderDate) : undefined}
          onChange={(date) => setFormData({ ...formData, orderDate: date.toISOString().split('T')[0] })}
          className={deepInputClass}
        />
      </div>

      {/* 作物品种 - 搜索框 */}
      <div className="col-span-2">
        <Label className="text-gray-700">
          作物品种 <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchKeyword}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              placeholder="搜索作物品种..."
              className={`pl-10 ${errors.cropVariety ? 'border-red-500' : deepInputClass}`}
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
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
        <Label className="text-gray-700">
          品种路径
        </Label>
        <Input
          type="text"
          value={formData.cropCategory}
          readOnly
          placeholder="选择作物品种后自动填充"
          className="border-gray-300 bg-gray-50 text-gray-600"
        />
      </div>

      {/* 单位 */}
      <div>
        <Label className="text-gray-700">
          单位
        </Label>
        <Select
          value={formData.unit}
          onValueChange={(v) => setFormData({ ...formData, unit: v })}
        >
          <SelectTrigger className="border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="株">株</SelectItem>
            <SelectItem value="棵">棵</SelectItem>
            <SelectItem value="袋">袋</SelectItem>
            <SelectItem value="公斤">公斤</SelectItem>
            <SelectItem value="吨">吨</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 计划数量 */}
      <div>
        <Label className="text-gray-700">
          计划数量 <span className="text-red-500">*</span>
        </Label>
        <Input
          type="number"
          value={formData.plannedQuantity || ''}
          onChange={(e) => setFormData({ ...formData, plannedQuantity: Number(e.target.value) })}
          placeholder="请输入计划数量"
          className={`${errors.plannedQuantity ? 'border-red-500' : deepInputClass}`}
        />
        {errors.plannedQuantity && <p className="text-xs text-red-500 mt-1">{errors.plannedQuantity}</p>}
      </div>

      {/* 实际数量 */}
      <div>
        <Label className="text-gray-700">
          完成数量
        </Label>
        <Input
          type="number"
          value={formData.completedQuantity || ''}
          onChange={(e) => setFormData({ ...formData, completedQuantity: Number(e.target.value) })}
          placeholder="请输入完成数量"
          className={deepInputClass}
        />
      </div>

      {/* 客户选择 */}
      <div>
        <Label className="text-gray-700">
          客户
        </Label>
        <Select
          value={formData.customerId || ''}
          onValueChange={(val) => {
            const customer = customers.find(c => c.id === val);
            if (customer) {
              setFormData(prev => ({
                ...prev,
                customerId: customer.id,
                customerPhone: customer.contactPhone || '',
                deliveryAddress: customer.deliveryAddress || '',
              }));
            }
          }}
        >
          <SelectTrigger className="border-gray-300">
            <SelectValue placeholder="请选择客户" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.customerName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 客户电话 */}
      <div>
        <Label className="text-gray-700">
          客户电话
        </Label>
        <Input
          type="text"
          value={formData.customerPhone}
          onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
          placeholder="请输入客户电话"
          className={deepInputClass}
        />
      </div>

      {/* 收货地址 */}
      <div className="col-span-2">
        <Label className="text-gray-700">
          收货地址
        </Label>
        <Input
          type="text"
          value={formData.deliveryAddress}
          onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
          placeholder="请输入收货地址"
          className={deepInputClass}
        />
      </div>

      {/* 预计完成日期 */}
      <div>
        <Label className="text-gray-700">
          预计完成日期
        </Label>
        <DatePicker
          selected={formData.expectedCompletionDate ? new Date(formData.expectedCompletionDate) : undefined}
          onChange={(date) => setFormData({ ...formData, expectedCompletionDate: date.toISOString().split('T')[0] })}
          className={deepInputClass}
        />
      </div>

      {/* 是否完成 */}
      <div>
        <Label className="text-gray-700">
          订单完成
        </Label>
        <Select
          value={formData.isCompleted ? 'yes' : 'no'}
          onValueChange={(v) => setFormData({ ...formData, isCompleted: v === 'yes' })}
        >
          <SelectTrigger className="border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">否</SelectItem>
            <SelectItem value="yes">是</SelectItem>
          </SelectContent>
        </Select>
        {formData.isCompleted && (
          <p className="text-xs text-orange-500 mt-1">⚠️ 选择"是"后订单将无法编辑</p>
        )}
      </div>

      {/* 备注 */}
      <div className="col-span-2">
        <Label className="text-gray-700">
          备注
        </Label>
        <TextArea
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="请输入备注信息"
          rows={3}
          className={`${deepInputClass} resize-none`}
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
