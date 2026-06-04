/**
 * 种源新增弹窗
 * 支持作物搜索和快速新增品种
 * V3.1: 支持补录申请功能, 使用 API 驱动的 DictSelect 组件
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '../../../ui/button';
import { X, Upload, RefreshCw, Search, Check, Leaf, ShoppingCart, Dna, Sprout, Scissors } from 'lucide-react';
import { SourceType, PropagationType, PropagationStatus, BreedingMethod, AsexualMethod } from '../../../../types/crop';
import { SourceOrigin } from '../../../../types/crop';
import { PlanType } from '../../../../types';
import { generateSeedCode } from '../../../../services/apiSeedSourceService';
// 2026-06-04: status 改为实时计算，AddModal 不再调用 computeStockStatus
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
// supplierService 已重写为兼容层（从 useSupplierStore 读内存数据，**不再用 localStorage**）
// 业务代码应优先用 useSupplierStore 订阅
import { CropVariety } from '../../../../types/cropVariety';
import { Supplier } from '../../../supplier/types';
import { QuickAddModal } from '../../crop-variety/modals/QuickAddModal';
import { useUserStore } from '../../../../stores/useUserStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useProductionPlanStore } from '../../../../stores/useProductionPlanStore';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
import { useSupplierStore } from '../../../../stores/useSupplierStore';
import { useApprovalContext } from '../../../../contexts/ApprovalContext';
import { ApprovalType, ApprovalStatus } from '../../../../types/approval';
import { DictSelect } from '../../../common/settings/DictSelect';
import CropCodeSelector from '../../common/CropCodeSelector';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { DatePicker } from '../../../ui/DatePicker';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { showAlert } from '@/lib/dialogService';

/** 种源类型 → 供应商类型 级联映射 */
const SOURCE_TYPE_TO_SUPPLIER_TYPE: Record<string, string | null> = {
  seed: 'SP',              // 种子 → 原材料供应
  seedling: 'SP',          // 种苗 → 原材料供应
  cutting: 'SP',           // 扦插苗 → 原材料供应
  grafting: 'SP',          // 嫁接苗 → 原材料供应
  tissue_culture: 'SP',    // 组培苗 → 原材料供应
  split: 'SP',             // 分株苗 → 原材料供应
  bulb: 'SP',              // 种球 → 原材料供应
  other: null,             // 其他 → 显示全部供应商
};

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  units: Array<{ value: string; label: string }>;
  /** 留种初始化数据（从种植页面跳转来） */
  seedSavingInit?: { linkedPlantingId?: string; linkedPlantingCode?: string; cropName?: string; } | null;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  units,
  seedSavingInit,
}: AddModalProps) {
  // 使用审批Context
  const { addApproval } = useApprovalContext();

  // P1 #5 修复: 改用订阅式读取 store，store 更新时组件自动重渲染
  const storeUsers = useUserStore((s) => s.users);
  const storePlans = useProductionPlanStore((s) => s.plans);
  // P2 #16 修复: 当前用户从 useAuthStore.currentUser 读取（认证已登录的用户），不再用 localStorage
  const authCurrentUser = useAuthStore((s) => s.currentUser);
  const currentUser = authCurrentUser
    ? { id: authCurrentUser.id || authCurrentUser.oid, name: authCurrentUser.name || authCurrentUser.username, department: authCurrentUser.department || authCurrentUser.orgName || '生产部' }
    : (storeUsers.length > 0
        ? { id: storeUsers[0].oid, name: storeUsers[0].name, department: storeUsers[0].orgOid || '生产部' }
        : { id: 'U013', name: '未知用户', department: '生产部' });
  const cropBatches = storePlans.length > 0
    ? storePlans.map(p => ({ id: p.id, batchCode: p.batchCode, batchStatus: (p as any).batchStatus || (p as any).status, planType: (p as any).planType, planTypeName: (p as any).planTypeName || '育种计划', cropName: (p as any).cropName }))
    : [];

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
    // 繁殖途径字段
    propagationType: PropagationType.EXTERNAL as string,
    propagationMethod: '',
    parentMaleId: '', parentMaleCode: '',
    parentFemaleId: '', parentFemaleCode: '',
    motherPlantId: '', motherPlantCode: '',
    linkedPlantingId: '', linkedPlantingCode: '',
    propagationStartDate: '', expectedHarvestDate: '',
    breedingLocation: '', targetTraits: '', generation: '',
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
  // P2 #15 修复: 直接订阅 useSupplierStore（响应式），替代 supplierService 的 localStorage 同步缓存
  const supplierItems = useSupplierStore((s) => s.items);
  const loadSuppliers = useSupplierStore((s) => s.loadItems);
  const searchSuppliersInStore = useSupplierStore((s) => s.search);

  const [supplierSearchResults, setSupplierSearchResults] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const supplierSearchRef = useRef<HTMLDivElement>(null);

  // 快速新增弹窗状态
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // 挂载时触发供应商全量加载（store 内部有 5 分钟去重）
  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  // 搜索供应商（响应 keyword 变化 + 内存 supplierItems 变化）
  useEffect(() => {
    if (supplierSearchKeyword.trim()) {
      setSupplierSearchResults(searchSuppliersInStore(supplierSearchKeyword));
    } else {
      // 无关键字时显示全部（避免空数组时啥也看不到）
      setSupplierSearchResults(supplierItems);
    }
  }, [supplierSearchKeyword, supplierItems, searchSuppliersInStore]);

  // 种源类型→供应商类型级联过滤
  const filteredSearchResults = useMemo(() => {
    const targetSupplierType = SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType];
    if (!targetSupplierType) return supplierSearchResults; // null = 展示全部
    return supplierSearchResults.filter(s => s.supplierType === targetSupplierType);
  }, [supplierSearchResults, formData.sourceType]);

  // 留种初始化：从种植页面跳转时，自动切换到留种模式并填充信息
  useEffect(() => {
    if (isOpen && seedSavingInit) {
      setFormData(prev => ({
        ...prev,
        propagationType: PropagationType.SEED_SAVING,
        sourceOrigin: 'self_produced' as SourceOrigin,
        linkedPlantingId: seedSavingInit.linkedPlantingId || '',
        linkedPlantingCode: seedSavingInit.linkedPlantingCode || '',
        cropName: seedSavingInit.cropName || prev.cropName,
      }));
    }
  }, [isOpen, seedSavingInit]);

  // 当种源类型改变时，清空已选供应商（类型不匹配）
  useEffect(() => {
    if (selectedSupplier) {
      const targetType = SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType];
      if (targetType && selectedSupplier.supplierType !== targetType) {
        setSelectedSupplier(null);
        setFormData(prev => ({ ...prev, supplierId: '', supplierName: '' }));
      }
    }
  }, [formData.sourceType]);

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
      await showAlert('请先生成种源批号');
      return;
    }
    if (!selectedCrop) {
      await showAlert('请选择作物');
      return;
    }
    // 外部采购时供应商必填
    if (formData.sourceOrigin === 'external_purchase' && !formData.supplierId) {
      await showAlert('请选择供应商');
      return;
    }

    // 获取供应商名称（从已选择的供应商对象中获取）
    const supplierName = selectedSupplier?.name || '';

    // 计算总金额
    const totalAmount = formData.quantity * formData.unitPrice;

    // 入库数量 = 可用数量（新入库时均为用户输入的数量）
    const initialCount = formData.quantity;
    const availableCount = initialCount;

    // 2026-06-04: status 改为实时计算，AddModal 不再计算 status 传给 store

    // 生成溯源码
    const traceabilityCode = 'TR' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + formData.cropName.substring(0, 2);

    // 创建种源记录（添加 await 确保数据保存完成）
    let newSeedSource;
    try {
      const baseData: any = {
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
        // status 字段已废弃（2026-06-04）
        traceabilityCode,
        printCount: 0,
        createBy: formData.createBy,
        // V3.0 新增字段
        productionPlanId: formData.productionPlanId,
        productionPlanCode: formData.productionPlanCode,
      };

      // 繁殖途径字段
      if (formData.propagationType !== PropagationType.EXTERNAL) {
        baseData.propagationType = formData.propagationType;
        baseData.propagationStatus = PropagationStatus.PLANNED;
        baseData.propagationMethod = formData.propagationMethod;
        baseData.parentMaleCode = formData.parentMaleCode;
        baseData.parentFemaleCode = formData.parentFemaleCode;
        baseData.motherPlantId = formData.motherPlantId;
        baseData.motherPlantCode = formData.motherPlantCode;
        baseData.linkedPlantingId = formData.linkedPlantingId;
        baseData.linkedPlantingCode = formData.linkedPlantingCode;
        baseData.expectedHarvestDate = formData.expectedHarvestDate;
        baseData.breedingLocation = formData.breedingLocation;
        baseData.targetTraits = formData.targetTraits;
        baseData.generation = formData.generation;
      }

      newSeedSource = await useSeedSourceStore.getState().addItem(baseData);
      // P0 #3 修复: addItem 失败时返回 null，下游不可访问 .id
      if (!newSeedSource) {
        await showAlert('创建失败，请重试');
        return;
      }
    } catch (error) {
      // logger.error('创建种源失败:', error);
      await showAlert('创建失败，请重试');
      return;
    }

    // 同时创建作物实例记录
    try {
      const instance = await cropInstanceService.createInstance(
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
      if (newSeedSource?.id) {
        useSeedSourceStore.getState().updateItem(String(newSeedSource.id), { instanceId: instance.id });
      }
    } catch (error) {
      // logger.error('创建作物实例失败:', error);
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
      // 繁殖途径字段
      propagationType: PropagationType.EXTERNAL as string,
      propagationMethod: '',
      parentMaleId: '', parentMaleCode: '',
      parentFemaleId: '', parentFemaleCode: '',
      motherPlantId: '', motherPlantCode: '',
      linkedPlantingId: '', linkedPlantingCode: '',
      propagationStartDate: '', expectedHarvestDate: '',
      breedingLocation: '', targetTraits: '', generation: '',
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
          {/* 入库方式选择（占两列） */}
          <div className="col-span-2">
            <Label className="text-gray-900">入库方式</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: PropagationType.EXTERNAL, label: '外购入库', desc: '来自外部供应商的种子采购', Icon: ShoppingCart },
                { value: PropagationType.BREEDING, label: '育种计划产出', desc: '关联生产批次，自动化管理', Icon: Dna },
                { value: PropagationType.SEED_SAVING, label: '种植留种', desc: '自产自留，品质稳定', Icon: Sprout },
                { value: PropagationType.ASEXUAL, label: '无性繁殖', desc: '分株、扦插等无性繁殖方式', Icon: Scissors },
              ].map((opt) => {
                const IconComponent = opt.Icon;
                return (
                <Button
                  key={opt.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // P1 #7 修复: 切换入库方式时清空已选供应商，避免 EXTERNAL→BREEDING 切换时残留
                    setFormData(prev => ({
                      ...prev,
                      propagationType: opt.value,
                      propagationMethod: '',
                      sourceOrigin: opt.value === PropagationType.EXTERNAL ? 'external_purchase' : 'self_produced' as SourceOrigin,
                      supplierId: '',
                      supplierName: '',
                    }));
                    setSelectedSupplier(null);
                  }}
                  className={`p-3 border-2 text-left w-full h-auto ${
                    formData.propagationType === opt.value
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-white'
                  }`}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <IconComponent className={`w-4 h-4 ${formData.propagationType === opt.value ? 'text-emerald-600' : 'text-gray-500'}`} />
                      <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 leading-tight">{opt.desc}</span>
                  </div>
                </Button>
                );
              })}
            </div>
          </div>

          {/* 种源批号 - 可点击生成 */}
          <div>
            <Label className="text-gray-900">种源批号</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={seedCode}
                readOnly
                placeholder="点击生成按钮获取批号"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-800 font-mono"
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateSeedCode}
              >
                <RefreshCw className="w-4 h-4" />
                生成
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-400">格式：ZZ + 年月日(8位) + "-" + 流水号(3位)</p>
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

          {/* 来源途径 - 根据入库方式自动设置 */}
          <div>
            <Label className="text-gray-900">来源途径</Label>
            <Input
              type="text"
              value={formData.propagationType === PropagationType.EXTERNAL ? '外部采购' : '自主产出'}
              readOnly
              className={`${deepInputClass} bg-gray-50 text-gray-700`}
            />
          </div>

          {/* ===== 育种计划产出字段 ===== */}
          {formData.propagationType === PropagationType.BREEDING && (
            <>
              <div>
                <Label className="text-gray-900">育种方法</Label>
                <Select
                  value={formData.propagationMethod}
                  onValueChange={(val) => setFormData({ ...formData, propagationMethod: val })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="选择育种方法" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BreedingMethod.CROSSBREEDING}>杂交育种</SelectItem>
                    <SelectItem value={BreedingMethod.SELECTION}>选择育种</SelectItem>
                    <SelectItem value={BreedingMethod.BACKCROSS}>回交育种</SelectItem>
                    <SelectItem value={BreedingMethod.HYBRID}>杂交优势</SelectItem>
                    <SelectItem value={BreedingMethod.OPEN_POLLINATION}>开放授粉</SelectItem>
                    <SelectItem value={BreedingMethod.MUTATION}>诱变育种</SelectItem>
                    <SelectItem value={BreedingMethod.OTHER}>其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-900">父本编号</Label>
                <Input
                  type="text"
                  value={formData.parentMaleCode}
                  onChange={(e) => setFormData({ ...formData, parentMaleCode: e.target.value })}
                  placeholder="♂ 父本种源批号"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">母本编号</Label>
                <Input
                  type="text"
                  value={formData.parentFemaleCode}
                  onChange={(e) => setFormData({ ...formData, parentFemaleCode: e.target.value })}
                  placeholder="♀ 母本种源批号"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">世代</Label>
                <Select
                  value={formData.generation}
                  onValueChange={(val) => setFormData({ ...formData, generation: val })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="选择世代" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F1">F1</SelectItem>
                    <SelectItem value="F2">F2</SelectItem>
                    <SelectItem value="F3">F3</SelectItem>
                    <SelectItem value="BC1">BC1</SelectItem>
                    <SelectItem value="BC2">BC2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-900">育种地点</Label>
                <Input
                  type="text"
                  value={formData.breedingLocation}
                  onChange={(e) => setFormData({ ...formData, breedingLocation: e.target.value })}
                  placeholder="育种基地/温室"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">目标性状</Label>
                <Input
                  type="text"
                  value={formData.targetTraits}
                  onChange={(e) => setFormData({ ...formData, targetTraits: e.target.value })}
                  placeholder="如：抗病、高产、早熟"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">预计采收日期</Label>
                <DatePicker className="w-full"
                  selected={formData.expectedHarvestDate ? new Date(formData.expectedHarvestDate) : undefined}
                  onChange={(date) => setFormData({ ...formData, expectedHarvestDate: date.toISOString().split('T')[0] })}
                />
              </div>
            </>
          )}

          {/* ===== 种植留种字段 ===== */}
          {formData.propagationType === PropagationType.SEED_SAVING && (
            <>
              <div>
                <Label className="text-gray-900">关联种植记录</Label>
                <Input
                  type="text"
                  value={formData.linkedPlantingCode}
                  onChange={(e) => setFormData({ ...formData, linkedPlantingCode: e.target.value })}
                  placeholder="种植批次号"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">留种株标识</Label>
                <Input
                  type="text"
                  value={formData.linkedPlantingId}
                  onChange={(e) => setFormData({ ...formData, linkedPlantingId: e.target.value })}
                  placeholder="留种株编号"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">预计采收日期</Label>
                <DatePicker className="w-full"
                  selected={formData.expectedHarvestDate ? new Date(formData.expectedHarvestDate) : undefined}
                  onChange={(date) => setFormData({ ...formData, expectedHarvestDate: date.toISOString().split('T')[0] })}
                />
              </div>
            </>
          )}

          {/* ===== 无性繁殖字段 ===== */}
          {formData.propagationType === PropagationType.ASEXUAL && (
            <>
              <div>
                <Label className="text-gray-900">繁殖方式</Label>
                <Select
                  value={formData.propagationMethod}
                  onValueChange={(val) => setFormData({ ...formData, propagationMethod: val })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="选择繁殖方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AsexualMethod.CUTTING}>扦插</SelectItem>
                    <SelectItem value={AsexualMethod.GRAFTING}>嫁接</SelectItem>
                    <SelectItem value={AsexualMethod.DIVISION}>分株</SelectItem>
                    <SelectItem value={AsexualMethod.TISSUE_CULTURE}>组培</SelectItem>
                    <SelectItem value={AsexualMethod.BULB}>种球/球根</SelectItem>
                    <SelectItem value={AsexualMethod.LAYERING}>压条</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-900">母株编号</Label>
                <Input
                  type="text"
                  value={formData.motherPlantCode}
                  onChange={(e) => setFormData({ ...formData, motherPlantCode: e.target.value })}
                  placeholder="母株种源批号"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">母株ID</Label>
                <Input
                  type="text"
                  value={formData.motherPlantId}
                  onChange={(e) => setFormData({ ...formData, motherPlantId: e.target.value })}
                  placeholder="母株记录ID"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">预计产出种苗数</Label>
                <Input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className={deepInputClass}
                />
              </div>
            </>
          )}

          {/* 供应商 - 只在外购入库时显示 */}
          {formData.propagationType === PropagationType.EXTERNAL && (
            <div ref={supplierSearchRef} className="relative">
              <Label className="text-gray-900">
                <span className="text-red-500">*</span> 供应商
              </Label>
              {selectedSupplier ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">{selectedSupplier.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedSupplier(null);
                        setFormData(prev => ({ ...prev, supplierId: '', supplierName: '' }));
                      }}
                      className="hover:bg-emerald-100 text-emerald-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-emerald-600">
                    编码：{selectedSupplier.code} · 联系人：{selectedSupplier.contact}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex">
                    <Input
                      type="text"
                      value={supplierSearchKeyword}
                      onChange={(e) => setSupplierSearchKeyword(e.target.value)}
                      onFocus={() => setShowSupplierSearch(true)}
                      placeholder="搜索供应商名称、编码或联系人..."
                      className={deepInputClass}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowSupplierSearch(!showSupplierSearch)}
                      className="border border-l-0 border-gray-400 rounded-l-none"
                    >
                      <Search className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>

                  {/* 供应商搜索结果下拉（按种源类型级联过滤） */}
                  {showSupplierSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {formData.sourceType !== 'other' && filteredSearchResults.length !== supplierSearchResults.length && supplierSearchResults.length > 0 && (
                        <div className="px-3 py-1.5 text-xs text-emerald-600 bg-emerald-50 border-b border-emerald-100">
                          已按种源类型过滤：显示"{(SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType] || '')}"类型供应商
                        </div>
                      )}
                      {filteredSearchResults.length > 0 ? (
                        filteredSearchResults.map((supplier) => (
                          <Button
                            key={supplier.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectSupplier(supplier)}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50 justify-between border-b border-gray-100 last:border-b-0 rounded-none h-auto"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800">{supplier.name}</p>
                              <p className="text-xs text-gray-500">
                                {supplier.code} · {supplier.contact} · {supplier.mobilePhone}
                              </p>
                            </div>
                            <Check className="w-4 h-4 text-emerald-600" />
                          </Button>
                        ))
                      ) : supplierSearchKeyword.trim() ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          {supplierSearchResults.length > 0 ? (
                            <>当前种源类型下未找到匹配供应商，请切换种源类型或修改搜索关键词</>
                          ) : (
                            <>未找到 "{supplierSearchKeyword}"</>
                          )}
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
          )}

          {/* V3.0 生产计划关联 - 只在育种计划产出时显示 */}
          {formData.propagationType === PropagationType.BREEDING && (
            <div>
            <Label className="text-gray-900">关联生产计划</Label>
            <Select
              value={formData.productionPlanId || '__none__'}
              onValueChange={(val) => {
                if (val === '__none__') {
                  setFormData(prev => ({ ...prev, productionPlanId: '', productionPlanCode: '' }));
                  return;
                }
                const plan = cropBatches.find(b => b.id === val);
                setFormData(prev => ({
                  ...prev,
                  productionPlanId: val,
                  productionPlanCode: plan?.batchCode || '',
                }));
              }}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="不关联" />
              </SelectTrigger>
              <SelectContent>
                {cropBatches.filter(b =>
                  b.batchStatus === 'in_progress' &&
                  b.planType === PlanType.SEED_BREEDING
                ).map(batch => (
                  <SelectItem key={batch.id} value={batch.id}>
                    [{batch.planTypeName || '育种计划'}] {batch.batchCode} - {batch.cropName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-400">只显示执行中的育种计划</p>
          </div>
          )}

          {/* 采购/入库日期 - 根据来源途径动态显示标签 */}
          <div>
            <Label className="text-gray-900">
              {formData.sourceOrigin === 'external_purchase' ? '采购日期' : '入库日期'}
            </Label>
            <DatePicker className="w-full"
              selected={formData.purchaseDate ? new Date(formData.purchaseDate) : undefined}
              onChange={(date) => setFormData({ ...formData, purchaseDate: date.toISOString().split('T')[0] })}
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

          {/* 图片上传 - 占两列 */}
          <div className="col-span-2">
            <Label className="text-gray-900">图片上传</Label>
            <div className="border-2 border-dashed border-gray-400 rounded-lg p-4">
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
                            pictures: [...formData.pictures, result]
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
              className={deepInputClass}
              placeholder="请输入备注信息"
            />
          </div>

          {/* V3.1 补录字段 - 占两列 */}
          <div className="col-span-2">
            <Label className="text-gray-900">是否补录</Label>
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
              <Label className="text-gray-900">
                补录原因 <span className="text-red-500">*</span>
              </Label>
              <TextArea
                value={formData.supplementaryReason}
                onChange={(e) => setFormData({ ...formData, supplementaryReason: e.target.value })}
                rows={2}
                className={deepInputClass}
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
