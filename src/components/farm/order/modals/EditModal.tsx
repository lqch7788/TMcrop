/**
 * 编辑订单弹窗
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Leaf, X } from 'lucide-react';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import { CropVariety } from '@/types/cropVariety';
import { getVarietyByCode, searchVarieties } from '@/services/cropVarietyService';
import { useOrderDataStore } from '@/stores/useOrderDataStore';
import { useCustomerStore } from '@/stores';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import CropCodeSelector from '@/components/farm/common/CropCodeSelector';
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
    // 订单状态：'in_progress' | 'completed' | 'cancelled'
    // PLANNED 状态不存储，由 completedQuantity=0 隐式表达
    orderStatus: 'in_progress' as 'in_progress' | 'completed' | 'cancelled',
    // 客户相关字段
    customerId: '',
    customerPhone: '',
    deliveryAddress: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  // 作物选择：与 AddModal 保持一致（cropCode + selectedCrop 双 state）
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 输入框深度样式
  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

  // 当记录变化时更新表单
  useEffect(() => {
    if (record && isOpen) {
      // 如果订单已完成或已取消，禁止编辑
      if (record.status === CropOrderStatus.COMPLETED || record.status === CropOrderStatus.CANCELLED) {
        const msg = record.status === CropOrderStatus.COMPLETED ? '已完成' : '已取消';
        showAlert(`该订单已${msg}，无法编辑`);
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
        // COMPLETED/CANCELLED 是终态，在下拉中可选
        // PLANNED 状态在表单中用 'in_progress' 表示（都是可编辑状态的起点）
        orderStatus: record.status === CropOrderStatus.COMPLETED
          ? 'completed'
          : record.status === CropOrderStatus.CANCELLED
          ? 'cancelled'
          : 'in_progress',
        // 客户相关字段
        customerId: (record as any).customerId || '',
        customerPhone: (record as any).customerPhone || '',
        deliveryAddress: (record as any).deliveryAddress || '',
      });
      // 2026-06-10: 与 AddModal 一致，用 cropCode 替代旧的 searchKeyword
      setCropCode((record as any).cropCode || '');
      fetchCustomers();
    }
  }, [record, isOpen]);

  // 2026-06-10: 打开弹窗时反向查表初始化 selectedCrop（与 BatchEditModal 3 重兜底一致）
  // 兜底 1：按 cropCode 精准匹配
  // 兜底 2：用 cropVariety 模糊搜索 crop_varieties 表
  // 兜底 3：完全脱离 crop_varieties 表直接用 record 自身字段拼路径
  useEffect(() => {
    if (!isOpen || !record) {
      setSelectedCrop(null);
      return;
    }
    const cropName = record.cropVariety || '';
    const cropCodeValue = (record as any).cropCode || '';

    if (cropCodeValue) {
      const byCode = getVarietyByCode(cropCodeValue);
      if (byCode) { setSelectedCrop(byCode); return; }
    }
    if (cropName) {
      const results = searchVarieties(cropName);
      if (results.length > 0) {
        const hit = results[0];
        setSelectedCrop({
          id: '',
          cropCode: hit.value,
          categoryName: '',
          typeName: '',
          varietyName: hit.label,
          subVariety1Name: '',
          fullPath: hit.fullPath,
        });
        return;
      }
    }
    if (cropName) {
      setSelectedCrop({
        id: '',
        cropCode: cropCodeValue,
        categoryName: '',
        typeName: '',
        varietyName: cropName,
        subVariety1Name: '',
        fullPath: record.cropCategory || cropName,
      });
      return;
    }
    setSelectedCrop(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, isOpen]);

  // 2026-06-10: 作物选择回调（与 AddModal 完全一致）
  const handleCropChange = (code: string, varietyInfo: CropVariety | null) => {
    setCropCode(code);
    setSelectedCrop(varietyInfo);
    if (varietyInfo) {
      const fullPath = [
        varietyInfo.categoryName,
        varietyInfo.typeName,
        varietyInfo.varietyName,
        varietyInfo.subVariety1Name,
      ].filter(Boolean).join(' > ');
      const cropName = varietyInfo.subVariety1Name || varietyInfo.varietyName;
      setFormData(prev => ({
        ...prev,
        cropVariety: cropName,
        cropCategory: fullPath,
      }));
      setErrors(prev => ({ ...prev, cropVariety: '' }));
    } else {
      setFormData(prev => ({
        ...prev,
        cropVariety: '',
        cropCategory: '',
      }));
    }
  };

  const handleSubmit = async () => {
    // 如果订单已完成或已取消，禁止编辑
    if (record && (record.status === CropOrderStatus.COMPLETED || record.status === CropOrderStatus.CANCELLED)) {
      const msg = record.status === CropOrderStatus.COMPLETED ? '已完成' : '已取消';
      await showAlert(`该订单已${msg}，无法编辑`);
      onClose();
      return;
    }

    // 如果选择"已完成"或"已取消"，弹出确认警告
    if (formData.orderStatus === 'completed') {
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
    if (formData.orderStatus === 'cancelled') {
      const confirmed = await showConfirm(
        '⚠️ 重要提示：\n\n' +
        '确认取消该订单吗？\n\n' +
        '取消后该订单将无法操作：\n' +
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

    // 计算最终状态（按用户在下拉里的选择直映射，不再用 completedQuantity 反推）：
    // - 选了 completed → COMPLETED
    // - 选了 cancelled → CANCELLED
    // - 选了 in_progress → IN_PROGRESS（按用户意图）
    // 2026-06-10 修复：原逻辑在非终态分支用 completedQuantity > 0 判定状态，
    // 导致用户显式选"进行中"但完成数量=0 时被强制降级为 PLANNED，
    // 保存后表格看不出状态变化。订单状态和完成数量是两个独立维度：
    // 状态由用户操作决定，数量由交付进度决定，不应耦合。
    const finalStatus = formData.orderStatus === 'completed'
      ? CropOrderStatus.COMPLETED
      : formData.orderStatus === 'cancelled'
      ? CropOrderStatus.CANCELLED
      : CropOrderStatus.IN_PROGRESS;

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
      status: finalStatus,
      // 客户相关字段（P0-5：补全 customerName / customerPhone / deliveryAddress，
      // 字段名对照后端 PUT fieldMap：customer_name / customer_phone / delivery_address）
      customerId: formData.customerId || undefined,
      customerName: formData.customerName || (record as any).customerName || '',
      customerPhone: formData.customerPhone || '',
      deliveryAddress: formData.deliveryAddress || '',
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
          className="border-gray-400"
        />
      </div>

      {/* 作物信息 - 使用统一的 CropCodeSelector（与 AddModal 完全一致） */}
      <div className="col-span-2">
        <Label className="text-gray-700">
          <span className="text-red-500">*</span> 作物信息
        </Label>
        <CropCodeSelector
          value={cropCode}
          onChange={handleCropChange}
          placeholder="搜索或选择作物品种..."
          size="md"
          showFullPath={true}
        />
        {/* 显示选中作物的详细信息（与新增弹窗一致） */}
        {selectedCrop && (
          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
            <div className="text-emerald-700 flex items-center gap-1">
              <Leaf className="w-3 h-3 flex-shrink-0" />
              {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
              {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
            </div>
            <div className="text-emerald-600 mt-0.5">
              编码：{selectedCrop.cropCode}
            </div>
          </div>
        )}
        {errors.cropVariety && <p className="text-xs text-red-500 mt-1">{errors.cropVariety}</p>}
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
          className="border-gray-400"
        />
      </div>

      {/* 订单状态 */}
      <div>
        <Label className="text-gray-700">
          订单状态
        </Label>
        <Select
          value={formData.orderStatus}
          onValueChange={(v) => setFormData({ ...formData, orderStatus: v as 'in_progress' | 'completed' | 'cancelled' })}
        >
          <SelectTrigger className="border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_progress">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
        {(formData.orderStatus === 'completed' || formData.orderStatus === 'cancelled') && (
          <p className="text-xs text-orange-500 mt-1">⚠️ 选择终态后订单将无法编辑</p>
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
        <X className="w-4 h-4" /> 取消
      </Button>
      <Button onClick={handleSubmit} variant="default" size="sm">
        <Edit2 className="w-4 h-4" /> 保存修改
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑订单"
      // 2026-06-10: 统一 4 页面 × 新增/编辑弹窗尺寸 = 900×650
      size="xl"
      width={900}
      height={650}
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
