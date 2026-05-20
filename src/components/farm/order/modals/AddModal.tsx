/**
 * 新增订单弹窗
 * 作物品种选择使用统一的 CropCodeSelector 组件（与种源管理一致）
 */

import React, { useState, useEffect } from 'react';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/TextArea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import { CropVariety } from '@/types/cropVariety';
import { useOrderDataStore } from '@/stores/useOrderDataStore';
import { Modal } from '@/components/ui/Modal';
import CropCodeSelector from '@/components/farm/common/CropCodeSelector';

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
  const [cropCode, setCropCode] = useState('');           // CropCodeSelector 选中值
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null); // 选中的作物品种详情

  // 弹窗打开时自动生成订单编号
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        orderCode: generateOrderCode()
      }));
      setCropCode('');
      setSelectedCrop(null);
    }
  }, [isOpen]);

  // 作物品种选择回调（与种源管理一致，CropCodeSelector 内部自动初始化品种数据）
  const handleCropChange = (code: string, varietyInfo: CropVariety | null) => {
    setCropCode(code);
    setSelectedCrop(varietyInfo);
    if (varietyInfo) {
      // 构建完整路径
      const fullPath = [
        varietyInfo.categoryName,
        varietyInfo.typeName,
        varietyInfo.varietyName,
        varietyInfo.subVariety1Name,
      ].filter(Boolean).join(' > ');
      // 取最细化的品种名称
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
    setCropCode('');
    setSelectedCrop(null);
    setErrors({});
  };

  // 表单内容
  const formContent = (
    <div className="grid grid-cols-2 gap-4">
      {/* 订单编号 */}
      <div>
        <Label className="text-gray-700">
          订单编号
        </Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={formData.orderCode}
            onChange={(e) => setFormData({ ...formData, orderCode: e.target.value })}
            placeholder="点击生成获取编号"
            className={`flex-1 ${errors.orderCode ? 'border-red-500' : 'border-gray-200'}`}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setFormData(prev => ({ ...prev, orderCode: generateOrderCode() }))}
            className="whitespace-nowrap"
          >
            生成
          </Button>
        </div>
        {errors.orderCode && <p className="text-xs text-red-500 mt-1">{errors.orderCode}</p>}
      </div>

      {/* 订单名称 */}
      <div className="col-span-2">
        <Label className="text-gray-700">
          订单名称 <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          value={formData.orderName}
          onChange={(e) => setFormData({ ...formData, orderName: e.target.value })}
          placeholder="请输入订单名称"
          className={`${errors.orderName ? 'border-red-500' : 'border-gray-200'}`}
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
          <SelectTrigger className="border-gray-200">
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
        <Input
          type="date"
          value={formData.orderDate}
          onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
          className="border-gray-200"
        />
      </div>

      {/* 作物品种 - 使用统一的 CropCodeSelector（与种源管理一致） */}
      <div className="col-span-2">
        <Label className="text-gray-700">
          <span className="text-red-500">*</span> 作物选择
        </Label>
        <CropCodeSelector
          value={cropCode}
          onChange={handleCropChange}
          placeholder="搜索或选择作物品种..."
          size="md"
          showFullPath={true}
        />
        {/* 显示选中作物的详细信息 */}
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
          <SelectTrigger className="border-gray-200">
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
          className={`${errors.plannedQuantity ? 'border-red-500' : 'border-gray-200'}`}
        />
        {errors.plannedQuantity && <p className="text-xs text-red-500 mt-1">{errors.plannedQuantity}</p>}
      </div>

      {/* 实际数量 */}
      <div>
        <Label className="text-gray-700">
          实际数量
        </Label>
        <Input
          type="number"
          value={formData.actualQuantity || ''}
          onChange={(e) => setFormData({ ...formData, actualQuantity: Number(e.target.value) })}
          placeholder="请输入实际数量"
          className="border-gray-200"
        />
      </div>

      {/* 供应商 */}
      <div>
        <Label className="text-gray-700">
          供应商
        </Label>
        <Input
          type="text"
          value={formData.supplierName}
          onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
          placeholder="请输入供应商名称"
          className="border-gray-200"
        />
      </div>

      {/* 预计采收日期 */}
      <div>
        <Label className="text-gray-700">
          预计采收日期
        </Label>
        <Input
          type="date"
          value={formData.expectedHarvestDate}
          onChange={(e) => setFormData({ ...formData, expectedHarvestDate: e.target.value })}
          className="border-gray-200"
        />
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
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
        />
      </div>
    </div>
  );

  // 底部按钮
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={onClose}
      >
        取消
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handleSubmit}
      >
        确认创建
      </Button>
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
