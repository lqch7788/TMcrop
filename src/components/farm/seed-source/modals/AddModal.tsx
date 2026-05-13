/**
 * 种源新增弹窗
 * 支持作物搜索和快速新增品种
 * V3.1: 支持补录申请功能, 使用 API 驱动的 DictSelect 组件
 */

import React, { useState, useEffect, useRef } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { X, Upload, RefreshCw, Search, Check, Leaf } from 'lucide-react';
import { SourceType, StockStatus } from '../../../../types/crop';
import { SourceOrigin } from '../../../../types/crop';
import { PlanType } from '../../../../types';
import { addSeedSource, updateSeedSource, generateSeedCode } from '../../../../services/apiSeedSourceService';
import * as cropInstanceService from '../../../../services/cropInstanceService';
import * as cropVarietyService from '../../../../services/cropVarietyService';
import * as supplierService from '../../../../services/supplierService';
import { CropVariety } from '../../../../types/cropVariety';
import { Supplier } from '../../../supplier/types';
import { QuickAddModal } from '../../crop-variety/modals/QuickAddModal';
import { currentUser, cropBatches } from '../../../../data/mockData';
import { useApprovalContext } from '../../../../contexts/ApprovalContext';
import { ApprovalType, ApprovalStatus } from '../../../../types/approval';
import { DictSelect } from '../../../common/settings/DictSelect';
import CropCodeSelector from '../../common/CropCodeSelector';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  units: Array<{ value: string; label: string }>;
}

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  units
}: AddModalProps) {
  // 使用审批Context
  const { addApproval } = useApprovalContext();

  // 表单数据
  const [formData, setFormData] = useState({
    sourceType: SourceType.SEED,
    sourceOrigin: 'external_purchase' as SourceOrigin,
    cropCategory: '',
    typeName: '',
    varietyName: '',
    cropName: '',
    cropVariety: '',
    supplierId: '',
    supplierName: '',
    purchaseDate: '',
    quantity: 0,
    unit: '袋',
    unitPrice: 0,
    pictures: [] as string[],
    remarks: '',
    createBy: currentUser.name, // 默认当前登录用户
    // V3.0 新增字段
    productionPlanId: '',    // 关联生产计划ID
    productionPlanCode: '',   // 关联生产计划批次号
    // V3.1 补录相关字段
    isSupplementary: false,  // 是否补录
    supplementaryReason: '',  // 补录原因
  });

  // 作物编码
  const [cropCode, setCropCode] = useState('');

  // 种源批号状态
  const [seedCode, setSeedCode] = useState('');

  // 作物搜索状态
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 供应商搜索状态
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [supplierSearchKeyword, setSupplierSearchKeyword] = useState('');
  const [supplierSearchResults, setSupplierSearchResults] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const supplierSearchRef = useRef<HTMLDivElement>(null);

  // 快速新增弹窗状态
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // 初始化
  useEffect(() => {
    // 初始化品种库
    cropVarietyService.initVarieties();
  }, []);

  // 搜索供应商
  useEffect(() => {
    supplierService.initSuppliers();
    if (supplierSearchKeyword.trim()) {
      const results = supplierService.searchSuppliers(supplierSearchKeyword);
      setSupplierSearchResults(results);
    } else {
      setSupplierSearchResults([]);
    }
  }, [supplierSearchKeyword]);

  // 选择作物后填充表单
  const handleSelectCrop = (variety: CropVariety) => {
    setSelectedCrop(variety);
    setCropCode(variety.cropCode);
    // 获取最细化的作物品种名称
    const cropNameValue = variety.detailVarietyCode && variety.detailVarietyCode !== '00'
      ? variety.varietyName
      : (variety.subVariety1Name || variety.varietyName);
    setFormData(prev => ({
      ...prev,
      cropCategory: variety.categoryName,    // 作物类别（如：蔬菜类）
      typeName: variety.typeName,           // 类型名称（如：叶菜类）
      varietyName: variety.varietyName,     // 品种名称（如：菠菜）
      cropName: cropNameValue,              // 作物名称（最细化，如：圆叶菠菜）
      cropVariety: variety.subVariety1Name  // 子品种名称（如：红颜）
    }));
  };

  // 快速新增品种成功后选中
  const handleQuickAddSuccess = (variety: CropVariety) => {
    handleSelectCrop(variety);
  };

  // 处理作物编码选择（来自 CropCodeSelector）
  const handleCropCodeChange = (code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      handleSelectCrop(varietyInfo);
    }
  };

  // 选择供应商后填充表单
  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData(prev => ({
      ...prev,
      supplierId: String(supplier.id),
      supplierName: supplier.name
    }));
    setShowSupplierSearch(false);
    setSupplierSearchKeyword('');
    setSupplierSearchResults([]);
  };

  // 生成种源批号
  const handleGenerateSeedCode = async () => {
    const dateStr = formData.purchaseDate
      ? formData.purchaseDate.replace(/-/g, '')
      : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const newCode = await generateSeedCode(dateStr);
    setSeedCode(newCode);
  };

  const handleSubmit = async () => {
    // 验证必填项
    if (!seedCode) {
      alert('请先生成种源批号');
      return;
    }
    if (!selectedCrop) {
      alert('请选择作物');
      return;
    }
    // 外部采购时供应商必填
    if (formData.sourceOrigin === 'external_purchase' && !formData.supplierId) {
      alert('请选择供应商');
      return;
    }

    // 获取供应商名称（从已选择的供应商对象中获取）
    const supplierName = selectedSupplier?.name || '';

    // 计算总金额
    const totalAmount = formData.quantity * formData.unitPrice;

    // 初始数量 = 可用数量（新入库）
    const initialCount = formData.quantity * 1000;
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

    // 创建种源记录（添加 await 确保数据保存完成）
    let newSeedSource;
    try {
      newSeedSource = await addSeedSource({
      seedCode: seedCode,
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
      initialCount,
      availableCount,
      pictures: formData.pictures,
      remarks: formData.remarks,
      status,
      traceabilityCode,
      printCount: 0,
      createBy: formData.createBy,
      // V3.0 新增字段
      productionPlanId: formData.productionPlanId,
      productionPlanCode: formData.productionPlanCode,
    });
    } catch (error) {
      console.error('创建种源失败:', error);
      alert('创建失败，请重试');
      return;
    }

    // 同时创建作物实例记录
    try {
      const instance = cropInstanceService.createInstance(
        {
          cropCategory: formData.cropCategory,
          cropName: formData.cropName,
          cropVariety: formData.cropVariety,
        },
        'external_purchase',
        initialCount,
        {
          sourceDescription: `种源入库-${supplierName || '未知供应商'}`,
        }
      );
      updateSeedSource(newSeedSource.id, { instanceId: instance.id });
    } catch (error) {
      console.error('创建作物实例失败:', error);
    }

    // V3.1 补录申请：如果勾选了补录，创建审批记录
    if (formData.isSupplementary) {
      const approvalCode = `SS-SUP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const approval = {
        id: 'APPROVAL-' + Date.now(),
        code: approvalCode,
        type: ApprovalType.SEED_SOURCE_SUPPLEMENTARY,
        title: `种源补录申请 - ${seedCode}`,
        description: `种源补录入库申请：${formData.cropName}，数量：${formData.quantity}${formData.unit}，补录原因：${formData.supplementaryReason}`,
        status: ApprovalStatus.PENDING,
        applicantId: currentUser.id,
        applicantName: currentUser.name,
        applicantDept: currentUser.department || '生产部',
        createTime: new Date().toLocaleString('zh-CN'),
        updateTime: new Date().toLocaleString('zh-CN'),
        steps: [
          {
            id: 'STEP-001',
            name: '生产主管',
            status: 'pending' as const,
            order: 1,
          },
          {
            id: 'STEP-002',
            name: '基地负责人',
            status: 'pending' as const,
            order: 2,
          },
        ],
        currentStep: 1,
        businessLink: {
          type: 'seed_source' as const,
          requestCode: seedCode,
          requestId: newSeedSource.id,
        },
        supplementaryData: {
          reason: formData.supplementaryReason,
          quantity: formData.quantity,
          unit: formData.unit,
          cropName: formData.cropName,
        },
      };
      addApproval(approval);
    }

    // 重置表单
    resetForm();
    onClose();
    onSuccess?.();
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      sourceType: SourceType.SEED,
      sourceOrigin: 'external_purchase' as SourceOrigin,
      cropCategory: '',
      cropName: '',
      cropVariety: '',
      supplierId: '',
      supplierName: '',
      purchaseDate: '',
      quantity: 0,
      unit: '袋',
      unitPrice: 0,
      pictures: [],
      remarks: '',
      // V3.0 新增字段
      productionPlanId: '',
      productionPlanCode: '',
      // V3.1 补录相关字段
      isSupplementary: false,
      supplementaryReason: '',
    });
    setCropCode('');
    setSeedCode('');
    setSelectedCrop(null);
    setSelectedSupplier(null);
  };

  return (
    <>
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
          {/* 种源批号 - 可点击生成 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">种源批号</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seedCode}
                readOnly
                placeholder="点击生成按钮获取批号"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-800 font-mono"
              />
              <button
                type="button"
                onClick={handleGenerateSeedCode}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                生成
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">格式：ZZ + 年月日(8位) + "-" + 流水号(3位)</p>
          </div>

          {/* 作物选择 - 使用统一的 CropCodeSelector */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              <span className="text-red-500">*</span> 作物选择
            </label>
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
            <label className="block text-sm font-medium text-gray-900 mb-1">种源类型</label>
            <DictSelect
              category="source_type"
              value={formData.sourceType}
              onChange={(value) => setFormData({ ...formData, sourceType: value as SourceType })}
              placeholder="选择种源类型"
            />
            {formData.sourceType === SourceType.OTHER && (
              <div className="mt-2">
                <input
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
            <label className="block text-sm font-medium text-gray-900 mb-1">来源途径</label>
            <DictSelect
              category="source_origin"
              value={formData.sourceOrigin}
              onChange={(value) => setFormData({ ...formData, sourceOrigin: value as SourceOrigin })}
              placeholder="选择来源途径"
            />
            {formData.sourceOrigin === 'other' && (
              <p className="mt-1 text-xs text-gray-400">请在备注中说明具体来源</p>
            )}
          </div>

          {/* 供应商 - 外部采购时必填，其他来源可选（搜索模式） */}
          {formData.sourceOrigin === 'external_purchase' ? (
            <div ref={supplierSearchRef} className="relative">
              <label className="block text-sm font-medium text-gray-900 mb-1">
                <span className="text-red-500">*</span> 供应商
              </label>
              {selectedSupplier ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">{selectedSupplier.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplier(null);
                        setFormData(prev => ({ ...prev, supplierId: '', supplierName: '' }));
                      }}
                      className="p-1 hover:bg-emerald-100 rounded"
                    >
                      <X className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-emerald-600">
                    编码：{selectedSupplier.code} · 联系人：{selectedSupplier.contact}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex">
                    <input
                      type="text"
                      value={supplierSearchKeyword}
                      onChange={(e) => setSupplierSearchKeyword(e.target.value)}
                      onFocus={() => setShowSupplierSearch(true)}
                      placeholder="搜索供应商名称、编码或联系人..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSupplierSearch(!showSupplierSearch)}
                      className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200"
                    >
                      <Search className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  {/* 供应商搜索结果下拉 */}
                  {showSupplierSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {supplierSearchResults.length > 0 ? (
                        supplierSearchResults.map((supplier) => (
                          <button
                            key={supplier.id}
                            type="button"
                            onClick={() => handleSelectSupplier(supplier)}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800">{supplier.name}</p>
                              <p className="text-xs text-gray-500">
                                {supplier.code} · {supplier.contact} · {supplier.mobilePhone}
                              </p>
                            </div>
                            <Check className="w-4 h-4 text-emerald-600" />
                          </button>
                        ))
                      ) : supplierSearchKeyword.trim() ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          未找到 "{supplierSearchKeyword}"
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          输入关键字搜索供应商
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">供应商（可选）</label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder="内部来源无需填写"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                readOnly
              />
            </div>
          )}

          {/* V3.0 生产计划关联 - 只显示育种计划类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">关联生产计划</label>
            <select
              value={formData.productionPlanId}
              onChange={(e) => {
                const plan = cropBatches.find(b => b.id === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  productionPlanId: e.target.value,
                  productionPlanCode: plan?.batchCode || '',
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">不关联</option>
              {cropBatches.filter(b =>
                (b.batchStatus === 'published' || b.batchStatus === 'in_progress') &&
                b.planType === PlanType.SEED_BREEDING
              ).map(batch => (
                <option key={batch.id} value={batch.id}>
                  [{batch.planTypeName || '育种计划'}] {batch.batchCode} - {batch.cropName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">只显示育种计划类型的生产批次</p>
          </div>

          {/* 采购/入库日期 - 根据来源途径动态显示标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {formData.sourceOrigin === 'external_purchase' ? '采购日期' : '入库日期'}
            </label>
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

          {/* V3.1 补录字段 - 占两列 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">是否补录</label>
            <DictSelect
              category="is_supplementary"
              value={formData.isSupplementary ? 'yes' : 'no'}
              onChange={(value) => setFormData({ ...formData, isSupplementary: value === 'yes' })}
              placeholder="选择是否补录"
            />
            <p className="mt-1 text-xs text-amber-500">选择"是"时，该入库记录将提交审批审核</p>
          </div>

          {/* V3.1 补录原因 */}
          {formData.isSupplementary && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">
                补录原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.supplementaryReason}
                onChange={(e) => setFormData({ ...formData, supplementaryReason: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="请输入补录原因，说明为什么需要补录此入库记录"
              />
            </div>
          )}
        </div>
      </UnifiedModal>

      {/* 快速新增品种弹窗 */}
      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSuccess={handleQuickAddSuccess}
      />
    </>
  );
}
