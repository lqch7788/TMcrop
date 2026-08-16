/**
 * 种源新增弹窗
 * 支持作物搜索和快速新增品种
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { X, Upload, RefreshCw, Search, Check, Leaf } from 'lucide-react';
import { SeedSource, SourceType, PropagationType, PropagationStatus } from '../../../../types/crop';
import { SourceOrigin } from '../../../../types/crop';
import { todayLocal } from '@/lib/dateUtils';
import { generateSeedCode, checkSourceCodeExists } from '../../../../services/apiSeedSourceService';
// 2026-06-04: status 改为实时计算，AddModal 不再调用 computeStockStatus
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
// supplierService 已重写为兼容层（从 useSupplierStore 读内存数据，**不再用 localStorage**）
// 业务代码应优先用 useSupplierStore 订阅
import { CropVariety } from '../../../../types/cropVariety';
import { Supplier } from '../../../supplier/types';
import { QuickAddModal } from '../../crop-variety/modals/QuickAddModal';
import { useUserStore } from '../../../../stores/useUserStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
import { useSupplierStore } from '../../../../stores/useSupplierStore';
import { DictSelect } from '../../../common/settings/DictSelect';
import CropCodeSelector from '../../common/CropCodeSelector';
// 2026-06-24: 库存调拨入种源（新增弹窗第 5 选项）
import { InventoryTransferPanel } from './InventoryTransferPanel';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { ADD_SOURCE_TYPE_TO_SUPPLIER_TYPE } from '../../../../constants/seedSourceDict';
// 2026-07-22：追溯修复 - 种源形态字典（必填）
import { SEED_FORM_OPTIONS } from '../../../../constants/seedFormDict';
import { showAlert } from '@/lib/dialogService';

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
  units,
}: AddModalProps) {
  // P1 #5 修复: 改用订阅式读取 store，store 更新时组件自动重渲染
  const storeUsers = useUserStore((s) => s.users);
  // P2 #16 修复: 当前用户从 useAuthStore.currentUser 读取（认证已登录的用户），不再用 localStorage
  const authCurrentUser = useAuthStore((s) => s.currentUser);
  // 2026-06-05: 修复创建人显示"未知用户"/空白
  // 根因：CurrentUser 没有 name 字段（只有 realName/username），原 fallback 取 .name 永远 undefined
  const currentUser = (() => {
    if (authCurrentUser) {
      return {
        id: authCurrentUser.oid,
        name: authCurrentUser.realName || authCurrentUser.username || '',
        department: authCurrentUser.orgName || authCurrentUser.orgOid || '生产部',
      };
    }
    // auth 没拿到时按 storeUsers 第一个兜底（演示模式）
    if (storeUsers.length > 0) {
      return {
        id: storeUsers[0].oid,
        name: storeUsers[0].name || storeUsers[0].username || '',
        department: storeUsers[0].orgOid || '生产部',
      };
    }
    // 2026-07-01 P1-8：auth + storeUsers 都拿不到时直接拒绝，不写入脏数据
    return null;
  })();

  // 2026-07-01 P1-8：currentUser 拿不到时拒绝写入（在 handleSubmit 里判断，不在此处早返回避免 hooks 顺序错乱）
  const canSubmit = currentUser !== null;

  // 2026-07-14：表单初始值抽常量（与 resetForm 共享，避免字段漂移）
  const INITIAL_FORM_DATA = {
    sourceType: SourceType.SEED,
    sourceOrigin: 'external_purchase' as SourceOrigin,
    cropCategory: '',
    typeName: '',
    varietyName: '',
    cropName: '',
    cropVariety: '',
    supplierId: '',
    supplierName: '',
    purchaseDate: todayLocal(),
    quantity: 0,
    unit: '袋',
    unitPrice: 0,
    pictures: [] as string[],
    remarks: '',
    createBy: currentUser?.name || '',
    productionPlanId: '',
    productionPlanCode: '',
    // 2026-07-07 V3.4：取消外购入库 tab，默认改为库存调拨
    propagationType: PropagationType.TRANSFER_FROM_INVENTORY as string,
    propagationMethod: '',
    parentMaleId: '', parentMaleCode: '',
    parentFemaleId: '', parentFemaleCode: '',
    motherPlantId: '', motherPlantCode: '',
    linkedPlantingId: '', linkedPlantingCode: '',
    propagationStartDate: '', expectedHarvestDate: '',
    breedingLocation: '', targetTraits: '', generation: '',
    // 2026-07-22：追溯修复 - 种源形态必填（与表格形态列对齐，避免编辑弹窗空值）
    seedForm: '',
  };

  // 表单数据
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

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

  // 2026-06-24: 库存调拨入种源 — 多选调拨明细
  const [transferItems, setTransferItems] = useState<import('../../../../services/seedSourceTransferService').TransferItem[]>([]);

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
    const targetSupplierType = ADD_SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType];
    if (!targetSupplierType) return supplierSearchResults; // null = 展示全部
    return supplierSearchResults.filter(s => s.supplierType === targetSupplierType);
  }, [supplierSearchResults, formData.sourceType]);

  // 2026-07-07 V3.4：seedSavingInit useEffect 已删除（外购入库 + 留种回流转入全部从种植/育苗模块走）

  // 当种源类型改变时，清空已选供应商（类型不匹配）
  useEffect(() => {
    if (selectedSupplier) {
      const targetType = ADD_SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType];
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
    // 2026-07-14：移除内嵌 todayLocal 函数（与 line 13 导入同名遮蔽）
    // 2026-06-26: 用本地日期避免 UTC 时区差（中国早上 0:00-8:00 UTC 还是昨天）
    // 2026-07-06 fix: fallback 走 todayLocal() 后也要 strip dashes
    const dateStr = (formData.purchaseDate || todayLocal()).replace(/-/g, '');
    const newCode = await generateSeedCode(dateStr);
    setSeedCode(newCode);
  };

  const handleSubmit = async (overrideItems?: import('../../../../services/seedSourceTransferService').TransferItem[]) => {
    // 2026-07-01 P1-8：currentUser 可能为 null（auth 失效时），拒绝写入脏数据
    if (!currentUser) {
      await showAlert('无法识别当前操作员，请先登录系统');
      return;
    }
    // 2026-06-24: 库存调拨分支 — 完全独立的提交路径，绕过所有外购/育种字段校验
    // P0-3 修复：接受 overrideItems 参数，避免 React state 闭包过期问题（panel onConfirm 异步 setState 后立即调用）
    if (formData.propagationType === PropagationType.TRANSFER_FROM_INVENTORY) {
      const items = overrideItems ?? transferItems;
      if (items.length === 0) {
        await showAlert('请先在调拨面板选择至少 1 条库存');
        return;
      }
      try {
        // P0-2 修复：操作员信息完整透传（之前 store action 只接收 1 个参数，operator 被静默丢弃）
        const operator = currentUser?.name ? { id: String(currentUser.id || ''), name: currentUser.name } : undefined;
        const results = await useSeedSourceStore.getState().createFromTransfer(items, operator);
        await showAlert(
          `调拨成功！共生成 ${results.length} 条新种源：\n${results.map((r) => r.newSeedSourceCode).join('\n')}`,
          '成功'
        );
        setTransferItems([]);
        // P1-4 修复：调拨成功后重置表单，避免重开 modal 见脏数据
        resetForm();
        onSuccess?.();
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '调拨失败';
        await showAlert(`调拨失败：${msg}`);
      }
      return;
    }

    // 验证必填项
    if (!seedCode) {
      await showAlert('请先生成种源批号');
      return;
    }
    // 2026-06-26: 前端实时查重（三层防重第 1 层），避开 UNIQUE 异常
    try {
      const exists = await checkSourceCodeExists(seedCode);
      if (exists) {
        await showAlert(`种源批号 ${seedCode} 已存在，请重新生成或换一个`);
        return;
      }
    } catch (err) {
      // 查重失败不阻断（后端还有 service + DB UNIQUE 兜底）
      console.warn('[AddModal] checkSourceCodeExists 失败，继续提交:', err);
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
    // 2026-06-06: HIGH #6 — 数量必须 > 0，单价必须为有限数字
    if (formData.quantity <= 0) {
      await showAlert('请输入有效的采购数量（必须大于 0）');
      return;
    }
    if (!Number.isFinite(formData.unitPrice)) {
      await showAlert('请输入有效的单价（数字）');
      return;
    }
    // 2026-07-22：追溯修复 - 种源形态必填校验
    if (!formData.seedForm || !formData.seedForm.trim()) {
      await showAlert('请选择种源形态（必填）');
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
    // 2026-07-10 P0-1 修复：用 todayLocal() 替代 toISOString() 避免 UTC 时区 bug（中国早 0:00-8:00 生成的溯源码会带前一天日期）
    const traceabilityCode = 'TR' + todayLocal().replace(/-/g, '') + formData.cropName.substring(0, 2);

    // 创建种源记录（添加 await 确保数据保存完成）
    // 2026-07-14：补显式类型（避免隐式 any）
    let newSeedSource: SeedSource | null = null;
    try {
      const baseData: any = {
        seedCode: seedCode,
        sourceOrigin: formData.sourceOrigin,
        sourceType: formData.sourceType,
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
        // 2026-07-22：追溯修复 - 种源形态必填提交
        seedForm: formData.seedForm,
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
      // 2026-07-14：补充 console.error（CLAUDE.md Fail Loud 铁律——之前只 showAlert，未留日志）
      console.error('[AddModal] 创建种源失败:', error);
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
      // 2026-07-14：补充 console.warn（CLAUDE.md Fail Loud 铁律——之前完全静默吞错）
      // 设计意图：作物实例创建失败不阻断主流程（种源已创建），但需要日志便于排查
      console.warn('[AddModal] 创建作物实例失败（不阻断主流程）:', error);
    }

    // 重置表单
    resetForm();
    onClose();
    onSuccess?.();
  };

  // 重置表单（2026-07-14：改用 INITIAL_FORM_DATA 避免字段漂移——之前 resetForm 和 INITIAL_FORM_DATA 有 4 个字段不同）
  const resetForm = () => {
    setFormData({ ...INITIAL_FORM_DATA });
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
        // 2026-07-08 V3.4：弹窗整体 +30%（xl 默认 900×600 → 1170×780）
        width={1170}
        height={780}
        // 2026-06-24: 库存调拨模式下隐藏底部保存按钮 — 面板内「确认调拨」自动触发提交
        showFooter={formData.propagationType !== PropagationType.TRANSFER_FROM_INVENTORY}
        onSubmit={handleSubmit}
        submitText="保存"
        cancelText="取消"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* ========== 2026-08-16 V3.6 顶部提示条（占两列，emerald 主色）
              原 V3.5：去掉入库方式 UI 控件后，弹窗顶部补回提示文案
              现 V3.6：删除中间冗余"入库方式：库存调拨"小标签，与 banner 重复；banner 单独承载所有说明 ========== */}
          <div className="col-span-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
            <div className="font-medium mb-1">📦 内部种源仅支持「库存调拨」入库</div>
            <div className="text-emerald-600 leading-relaxed">
              外部采购请通过「作物库存 → 新建入库」完成，再调拨入种源。
              <br />
              自有种源请通过「种植/育苗 → 行级采收入库 → 作物库存 → 调拨」入种源。
            </div>
          </div>

          {/* 2026-08-16 V3.5：移除「入库方式」UI 区块（v3.4 已压成单选"库存调拨"，控件无意义）
              2026-08-16 V3.6：删除中间"入库方式：库存调拨"小标签（与 banner 重复）
              propagationType 在 INITIAL_FORM_DATA 仍默认 TRANSFER_FROM_INVENTORY，数据模型不变 */}

          {/* 种源批号 - 可点击生成（独占第一列） */}
          <div>
            <Label className="text-gray-900">
              种源批号
              {/* 格式说明用括号样式紧跟 Label 同行展示 */}
              <span className="ml-2 text-xs font-normal text-gray-400 whitespace-nowrap">
                格式：ZZ + 年月日(8位) + "-" + 流水号(3位)
              </span>
            </Label>
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
          </div>

          {/* 占位列（与种源批号同一行，保持 grid 2 列对齐） */}
          <div />

          {/* ===== 库存调拨分支（2026-06-24）=====
              选中「库存调拨」时独占显示面板；隐藏所有其他字段
              调拨面板内 onConfirm → 写入 transferItems，handleSubmit 直接走 createFromTransfer 路径 */}
          {formData.propagationType === PropagationType.TRANSFER_FROM_INVENTORY && (
            <div className="col-span-2">
              <InventoryTransferPanel
                onConfirm={(items) => {
                  setTransferItems(items);
                  // P0-3 修复：直接传 items 给 handleSubmit（不再依赖陈旧闭包）
                  void handleSubmit(items);
                }}
              />
            </div>
          )}

          {/* 以下所有字段（作物选择 / 种源类型 / 供应商 / 数量 / 单价 / 图片 / 备注）在 transfer 模式下都隐藏
              （库存调拨面板已包含这些信息，无需重复输入） */}
          {formData.propagationType !== PropagationType.TRANSFER_FROM_INVENTORY && (
          <>

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

          {/* 2026-07-22：追溯修复 - 种源形态（必填） */}
          <div>
            <Label className="text-gray-900">
              <span className="text-red-500">*</span>种源形态
            </Label>
            <select
              value={formData.seedForm}
              onChange={(e) => setFormData({ ...formData, seedForm: e.target.value })}
              className="w-full h-10 px-3 border border-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">请选择种源形态</option>
              {SEED_FORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">必填：与列表"形态"列对应，编辑弹窗会预填此值</p>
          </div>

          {/* 来源途径 - 根据入库方式自动设置 */}
          <div>
            <Label className="text-gray-900">来源途径</Label>
            <Input
              type="text"
              value={formData.propagationType === PropagationType.EXTERNAL ? '外部采购' : '自主产出'}
              readOnly
              className="bg-gray-50 text-gray-700"
            />
          </div>

          {/* ===== 育种计划产出字段 ===== */}
          {/* 2026-07-14：删除 BREEDING / SEED_SAVING / ASEXUAL 三个繁殖死分支
            propagationType 默认强制为 TRANSFER_FROM_INVENTORY，这三个分支永远走不到 */}

          {/* 以下所有字段（供应商 / 数量 / 单价 / 图片 / 备注）在 transfer 模式下都隐藏。
              使用 NOT TRANSFER 包裹替代逐个加条件（避免漏改）。 */}

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
                          已按种源类型过滤：显示"{(ADD_SOURCE_TYPE_TO_SUPPLIER_TYPE[formData.sourceType] || '')}"类型供应商
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

          {/* 2026-07-14：删除 BREEDING 生产计划关联死分支（propagationType 默认 TRANSFER_FROM_INVENTORY） */}

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

          {/* 数量字段 — 2026-06-19 标签按模式动态切换
              外购入库：实际到货数量，作为初始库存
              育种/留种/无性：预估产量/计划数量，最终入库数量在「阶段管理」中分批录入 */}
          <div>
            <Label className="text-gray-900">
              {formData.propagationType === PropagationType.EXTERNAL ? '采购数量' : '预估产量 / 计划数量'}
              {/* 外购入库：备注用括号包裹，紧跟 Label 文字同行（不换行） */}
              {formData.propagationType === PropagationType.EXTERNAL && (
                <span className="ml-2 text-xs font-normal text-gray-500 whitespace-nowrap">
                  (实际到货的数量，将作为初始库存写入)
                </span>
              )}
            </Label>
            {/* 育种/留种/无性：提示文字放在 Label 与输入框之间（占独立行） */}
            {formData.propagationType !== PropagationType.EXTERNAL && (
              <p className="text-xs text-gray-500 mb-1">
                预估产量或计划数量，仅作记录。最终入库数量在「阶段管理 → 完成入库」中分批录入
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
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
                         />
          </div>

          {/* 图片上传 - 占两列（与育苗管理新增弹窗尺寸一致：80x80 缩略图 + 整行上传区） */}
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
                        onClick={() => setFormData({ ...formData, pictures: formData.pictures.filter((_, i) => i !== index) })}
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
                          setFormData({ ...formData, pictures: [...formData.pictures, result] });
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
                           placeholder="请输入备注信息"
            />
          </div>
          </>
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
