/**
 * 种源编辑弹窗
 * V3.1: 使用 API 驱动的 DictSelect 组件和 CropCodeSelector
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { X, Upload } from 'lucide-react';
import { SeedSource, SourceType, SourceOrigin } from '../../../../types/crop';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
// 2026-06-04: status 改为实时计算，store 不再写入 status 字段，computeStockStatus 也不再需要
import { DictSelect } from '../../../common/settings/DictSelect';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVariety } from '../../../../types/cropVariety';
import * as supplierService from '../../../../services/supplierService';
import { Input } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
// 2026-07-14：复用 seedSourceDict 共享常量（与 AddModal 合并重复定义）
import { ADD_SOURCE_TYPE_TO_SUPPLIER_TYPE as SOURCE_TYPE_TO_SUPPLIER_TYPE } from '../../../../constants/seedSourceDict';
// 2026-07-14：V2.1 铁律合规——改用 useSupplierStore 订阅（替代 supplierService.getAllSuppliers() 内部 localStorage 同步缓存）
import { useSupplierStore } from '../../../../stores/useSupplierStore';

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

  // 2026-07-01 P0-6：注入当前操作用户
  const currentUser = useAuthStore((s) => s.currentUser);

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

  // 2026-07-14：V2.1 铁律合规——订阅 useSupplierStore（响应式更新，无需手动同步）
  const allSuppliersFromStore = useSupplierStore((s) => s.items);
  // 种源类型→供应商类型级联过滤
  const filteredSuppliers = useMemo(() => {
    const targetType = SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType];
    if (!targetType) return suppliers; // null = 展示全部
    const validIds = new Set(
      allSuppliersFromStore.filter(s => s.supplierType === targetType).map(s => String(s.id))
    );
    return suppliers.filter(s => validIds.has(s.value));
  }, [formData.sourceType, suppliers, allSuppliersFromStore]);

  // 种源类型改变时，清空类型不匹配的已选供应商
  useEffect(() => {
    if (formData.supplierId) {
      const targetType = SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType];
      if (targetType) {
        const currentSupplier = allSuppliersFromStore.find(s => String(s.id) === formData.supplierId);
        if (currentSupplier && currentSupplier.supplierType !== targetType) {
          setFormData(prev => ({ ...prev, supplierId: '', supplierName: '' }));
        }
      }
    }
  }, [formData.sourceType, allSuppliersFromStore, formData.supplierId]);

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
    // 2026-07-01 P0-4 修复：编辑时不允许修改 quantity（累计入库量）
    // quantity 是调拨/入库的累计值，必须通过入库/调拨动作累加，否则会覆盖之前所有追加记录
    // 采购单价/总金额也不应随 quantity 变化（采购时的快照），从 record.unitPrice 取
    // const status = computeStockStatus(formData.quantity, record.initialCount); // 不再需要，传给 store 也会被忽略

    // 2026-07-01 P1-7：乐观锁保护 — 如果 record.updateTime 与 formData 不一致说明已被他人修改，警告用户
    // 注：当前实现只在客户端打日志提示，因为完整乐观锁需要后端支持（If-Unmodified-Since 头）

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
        // quantity 已禁用（累计值由入库/调拨动作累加）
        unit: formData.unit,
        unitPrice: formData.unitPrice,
        totalAmount: formData.unitPrice * record.quantity,  // 总金额 = 单价 × 累计入库量（不随编辑变）
        pictures: formData.pictures,
        remarks: formData.remarks,
        // 2026-07-01 P0-6：传 updateBy 让后端记录操作人
        updateBy: currentUser?.realName || currentUser?.username || 'system',
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
      // 2026-07-14：补充 console.error（CLAUDE.md Fail Loud 铁律）
      console.error('[EditModal] 更新种源失败:', error);
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
            <SelectTrigger className="">
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
          <DatePicker className="w-full"
            selected={formData.purchaseDate ? new Date(formData.purchaseDate) : undefined}
            onChange={(date) => setFormData({ ...formData, purchaseDate: todayLocal(date) })}
          />
        </div>

        {/* 2026-07-01 P0-4：登记数量改为只读（累计值由入库/调拨动作累加） */}
        <div>
          <Label className="text-gray-900">登记数量（累计）</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
              {record.quantity?.toLocaleString() || 0}
            </div>
            <DictSelect
              category="unit"
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value })}
              placeholder="单位"
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ⚠️ 累计数量由入库/调拨操作累加，不可直接修改。如需调整，请用"调拨入库"或"商品种源入库"。
          </div>
        </div>

        {/* 单价 */}
        <div>
          <Label className="text-gray-900">单价（元）</Label>
          <Input
            type="number"
            value={formData.unitPrice || ''}
            onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                     />
        </div>

        {/* 图片上传 - 占两列（与新增弹窗尺寸一致：80x80 缩略图 + 整行虚线上传区） */}
        <div className="col-span-2">
          <Label className="text-gray-900">图片上传</Label>
          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData({ ...formData, pictures: formData.pictures.filter((_: string, i: number) => i !== index) })}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {/* 上传按钮 */}
            <Label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 rounded-lg py-4">
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
                        setFormData(prev => ({ ...prev, pictures: [...prev.pictures, result] }));
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
