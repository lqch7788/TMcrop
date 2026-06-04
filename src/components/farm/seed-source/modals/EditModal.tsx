/**
 * 种源编辑弹窗
 * V3.1: 使用 API 驱动的 DictSelect 组件和 CropCodeSelector
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '../../../ui/button';
import { X, Upload } from 'lucide-react';
import { SeedSource, SourceType, SourceOrigin } from '../../../../types/crop';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
// 2026-06-04: status 改为实时计算，store 不再写入 status 字段，computeStockStatus 也不再需要
import { DictSelect } from '../../../common/settings/DictSelect';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVariety } from '../../../../types/cropVariety';
import * as supplierService from '../../../../services/supplierService';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { DatePicker } from '../../../ui/DatePicker';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { showAlert } from '@/lib/dialogService';

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

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

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

  // P2 #9 修复: formData 包含繁殖字段，编辑时不再丢失
  const buildFormData = (r: SeedSource) => ({
    sourceType: r.sourceType,
    sourceOrigin: r.sourceOrigin || 'external_purchase',
    cropCategory: r.cropCategory,
    typeName: r.typeName,
    varietyName: r.varietyName,
    cropName: r.cropName,
    cropVariety: r.cropVariety,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    purchaseDate: r.purchaseDate,
    quantity: r.quantity,
    unit: r.unit,
    unitPrice: r.unitPrice,
    pictures: (() => {
      if (Array.isArray(r.pictures)) return r.pictures;
      if (typeof r.pictures === 'string') {
        try { return JSON.parse(r.pictures); } catch { return []; }
      }
      return [];
    })(),
    remarks: r.remarks || '',
    // 繁殖途径字段（编辑时保留）
    propagationType: r.propagationType,
    propagationStatus: r.propagationStatus,
    propagationMethod: r.propagationMethod || '',
    parentMaleId: r.parentMaleId || '',
    parentMaleCode: r.parentMaleCode || '',
    parentFemaleId: r.parentFemaleId || '',
    parentFemaleCode: r.parentFemaleCode || '',
    motherPlantId: r.motherPlantId || '',
    motherPlantCode: r.motherPlantCode || '',
    linkedPlantingId: r.linkedPlantingId || '',
    linkedPlantingCode: r.linkedPlantingCode || '',
    propagationStartDate: r.propagationStartDate || '',
    expectedHarvestDate: r.expectedHarvestDate || '',
    actualHarvestDate: r.actualHarvestDate || '',
    breedingLocation: r.breedingLocation || '',
    targetTraits: r.targetTraits || '',
    generation: r.generation || '',
  });

  const [formData, setFormData] = useState(() => buildFormData(record));

  // P2 #10 修复: 仅在弹窗打开瞬间初始化（避免父组件重渲染吞用户输入）
  // P2 #9 修复: 保留繁殖字段
  useEffect(() => {
    if (isOpen) {
      setCropCode(record.cropCode || '');
      setFormData(buildFormData(record));
    }
  }, [isOpen, record.id]);

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
      await showAlert('选择"其他"种源类型时，备注为必填项，请输入详细说明');
      return;
    }
    // 外部采购时供应商必填
    if (formData.sourceOrigin === 'external_purchase' && !formData.supplierId) {
      await showAlert('请选择供应商');
      return;
    }

    // 获取供应商名称
    const supplier = suppliers.find(s => s.value === formData.supplierId);
    const supplierName = supplier?.label || formData.supplierName;

    // 计算总金额
    const totalAmount = formData.quantity * formData.unitPrice;

    // 2026-06-04: status 改为实时计算，store 不再写入 status 字段
    // 注意: 编辑时用 formData.quantity 作为"当前可用量"（采购数量编辑语义），initialCount 来自 record
    // const status = computeStockStatus(formData.quantity, record.initialCount); // 不再需要，传给 store 也会被忽略

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
        // status 字段已废弃（2026-06-04）
        // P2 #9 修复: 提交时同时传递繁殖字段，避免编辑后丢失
        propagationType: formData.propagationType,
        propagationStatus: formData.propagationStatus,
        propagationMethod: formData.propagationMethod,
        parentMaleId: formData.parentMaleId,
        parentMaleCode: formData.parentMaleCode,
        parentFemaleId: formData.parentFemaleId,
        parentFemaleCode: formData.parentFemaleCode,
        motherPlantId: formData.motherPlantId,
        motherPlantCode: formData.motherPlantCode,
        linkedPlantingId: formData.linkedPlantingId,
        linkedPlantingCode: formData.linkedPlantingCode,
        propagationStartDate: formData.propagationStartDate,
        expectedHarvestDate: formData.expectedHarvestDate,
        actualHarvestDate: formData.actualHarvestDate,
        breedingLocation: formData.breedingLocation,
        targetTraits: formData.targetTraits,
        generation: formData.generation,
      });
    } catch (error) {
      // logger.error('更新种源失败:', error);
      await showAlert('更新失败，请重试');
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
            <SelectTrigger className={deepInputClass}>
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
          <DatePicker
            selected={formData.purchaseDate ? new Date(formData.purchaseDate) : undefined}
            onChange={(date) => setFormData({ ...formData, purchaseDate: date.toISOString().split('T')[0] })}
            className={deepInputClass}
          />
        </div>

        {/* 登记数量 */}
        <div>
          <Label className="text-gray-900">登记数量</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className={deepInputClass}
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
            className={deepInputClass}
          />
        </div>

        {/* 图片上传 - 占两列 (P2 #8 修复: 从 AddModal 移植完整实现) */}
        <div className="col-span-2">
          <Label className="text-gray-900">图片上传</Label>
          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4">
            {formData.pictures && formData.pictures.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.pictures.map((pic, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={pic}
                      alt={`预览${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setFormData({
                        ...formData,
                        pictures: formData.pictures.filter((_, i) => i !== index)
                      })}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg py-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">点击上传图片</span>
              <Input
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
                          pictures: [...(formData.pictures || []), result]
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                  e.target.value = '';
                }}
              />
            </Label>
          </div>
        </div>

        {/* 备注 - 占两列 */}
        <div className="col-span-2">
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="请输入备注信息"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
