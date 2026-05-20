/**
 * 种源编辑弹窗
 * V3.1: 使用 API 驱动的 DictSelect 组件和 CropCodeSelector
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { SeedSource, SourceType, SourceOrigin, StockStatus } from '../../../../types/crop';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
import { DictSelect } from '../../../common/settings/DictSelect';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVariety } from '../../../../types/cropVariety';
import * as supplierService from '../../../../services/supplierService';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

/** 种源类型 → 供应商类型 级联映射 */
const SOURCE_TYPE_TO_SUPPLIER_TYPE: Record<string, string | null> = {
  seed: 'SP',
  seedling: 'SP',
  cutting: 'SP',
  grafting: 'SP',
  tissue_culture: 'SP',
  split: 'SP',
  bulb: 'SP',
  other: null,
};

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: SeedSource;
  suppliers: Array<{ value: string; label: string }>;
}

export function EditModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  suppliers
}: EditModalProps) {
  // 作物编码状态
  const [cropCode, setCropCode] = useState(record.cropCode || '');

  // 选中的作物信息
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  const [formData, setFormData] = useState({
    sourceType: record.sourceType,
    sourceOrigin: record.sourceOrigin || 'external_purchase',
    cropCategory: record.cropCategory,
    typeName: record.typeName,
    varietyName: record.varietyName,
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
    setCropCode(record.cropCode || '');
    setFormData({
      sourceType: record.sourceType,
      sourceOrigin: record.sourceOrigin || 'external_purchase',
      cropCategory: record.cropCategory,
      typeName: record.typeName,
      varietyName: record.varietyName,
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

  // 种源类型→供应商类型级联过滤
  const filteredSuppliers = useMemo(() => {
    const targetType = SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType];
    if (!targetType) return suppliers; // null = 展示全部
    const allSuppliers = supplierService.getAllSuppliers();
    const validIds = new Set(
      allSuppliers.filter(s => s.supplierType === targetType).map(s => String(s.id))
    );
    return suppliers.filter(s => validIds.has(s.value));
  }, [formData.sourceType, suppliers]);

  // 种源类型改变时，清空类型不匹配的已选供应商
  useEffect(() => {
    if (formData.supplierId) {
      const targetType = SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType];
      if (targetType) {
        const allSuppliers = supplierService.getAllSuppliers();
        const currentSupplier = allSuppliers.find(s => String(s.id) === formData.supplierId);
        if (currentSupplier && currentSupplier.supplierType !== targetType) {
          setFormData(prev => ({ ...prev, supplierId: '', supplierName: '' }));
        }
      }
    }
  }, [formData.sourceType]);

  // 处理作物编码选择
  const handleCropCodeChange = (code: string, varietyInfo: CropVariety | null) => {
    setCropCode(code);
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      setFormData(prev => ({
        ...prev,
        cropCategory: varietyInfo.categoryName,
        typeName: varietyInfo.typeName,
        varietyName: varietyInfo.varietyName,
        cropName: varietyInfo.detailVarietyCode && varietyInfo.detailVarietyCode !== '00'
          ? varietyInfo.varietyName
          : (varietyInfo.subVariety1Name || varietyInfo.varietyName),
        cropVariety: varietyInfo.subVariety1Name || ''
      }));
    }
  };

  const handleSubmit = async () => {
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

    try {
      await useSeedSourceStore.getState().updateItem(String(record.id), {
        sourceType: formData.sourceType,
        sourceOrigin: formData.sourceOrigin,
        cropCategory: formData.cropCategory,
        typeName: formData.typeName,
        varietyName: formData.varietyName,
        cropName: formData.cropName,
        cropVariety: formData.cropVariety,
        cropCode: cropCode,
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
    } catch (error) {
      console.error('更新种源失败:', error);
      alert('更新失败，请重试');
      return;
    }

    // 先刷新数据，再关闭弹窗
    onSuccess?.();
    onClose();
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
          <Label className="text-gray-900">种源批号</Label>
          <Input
            type="text"
            value={record.seedCode}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 font-mono"
          />
        </div>

        {/* 作物选择 - 使用统一的 CropCodeSelector */}
        <div>
          <Label className="text-gray-900">
            <span className="text-red-500">*</span> 作物选择
          </Label>
          <CropCodeSelector
            value={cropCode}
            onChange={handleCropCodeChange}
            placeholder="搜索或选择作物品种..."
            size="md"
            showFullPath={true}
          />
          {/* 显示选中作物的详细信息 */}
          {selectedCrop && (
            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
              <div className="text-emerald-700">
                {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
              </div>
            </div>
          )}
        </div>

        {/* 种源类型 */}
        <div>
          <Label className="text-gray-900">种源类型</Label>
          <DictSelect
            category="source_type"
            value={formData.sourceType}
            onChange={(value) => setFormData({ ...formData, sourceType: value as SourceType })}
            placeholder="选择种源类型"
          />
          {/* 选择"其他"时显示补充说明输入框 */}
          {formData.sourceType === SourceType.OTHER && (
            <div className="mt-2">
              <Input
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
          <Label className="text-gray-900">来源途径</Label>
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
          <Label className="text-gray-900">
            {formData.sourceOrigin === 'external_purchase' && <span className="text-red-500">*</span>}
            {formData.sourceOrigin === 'external_purchase' ? '供应商' : '供应商（可选）'}
          </Label>
          <Select
            value={formData.supplierId || '__none__'}
            onValueChange={(val) => {
              if (val === '__none__') {
                setFormData({ ...formData, supplierId: '', supplierName: '' });
                return;
              }
              const supplier = suppliers.find(s => s.value === val);
              setFormData({ ...formData, supplierId: val, supplierName: supplier?.label || '' });
            }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <SelectValue placeholder={
                formData.sourceOrigin === 'external_purchase' ? '请选择' : '内部自留/无需填写'
              } />
            </SelectTrigger>
            <SelectContent>
              {formData.sourceOrigin === 'external_purchase' && filteredSuppliers.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
              {formData.sourceOrigin === 'external_purchase' && filteredSuppliers.length === 0 && suppliers.length > 0 && (
                <SelectItem value="__none__" disabled>当前种源类型下无匹配供应商，请切换种源类型</SelectItem>
              )}
              {formData.sourceOrigin !== 'external_purchase' && (
                <SelectItem value="__none__">内部自留/无需填写</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 采购/入库日期 - 根据来源途径动态显示标签 */}
        <div>
          <Label className="text-gray-900">
            {formData.sourceOrigin === 'external_purchase' ? '采购日期' : '入库日期'}
          </Label>
          <Input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 登记数量 */}
        <div>
          <Label className="text-gray-900">登记数量</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <DictSelect
              category="unit"
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value })}
              placeholder="单位"
            />
          </div>
        </div>

        {/* 单价 */}
        <div>
          <Label className="text-gray-900">单价（元）</Label>
          <Input
            type="number"
            value={formData.unitPrice || ''}
            onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 图片上传 - 占两列 */}
        <div className="col-span-2">
          <Label className="text-gray-900">图片上传</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer">
            <div className="text-gray-500 text-sm">
              点击上传或拖拽图片到此处
            </div>
          </div>
        </div>

        {/* 备注 - 占两列 */}
        <div className="col-span-2">
          <Label className="text-gray-900">备注</Label>
          <TextArea
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
