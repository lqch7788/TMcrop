/**
 * 种源编辑弹窗 — V3.5（2026-07-21 重构）
 *
 * 设计原则（深度审核后重构）：
 * 1. 按 sourceOrigin 决定字段可编辑性（EDIT_RULES 单一真理源）
 *    - external_purchase: 大部分字段可编辑（供应商、采购日期、单位、数量*）
 *    - inventory_transfer / planting_self_kept / transfer_from_inventory:
 *      来源相关字段全部只读（入库时已确定，不允许事后篡改）
 *    - quantity 不允许编辑（累计值，由入库/调拨动作累加）
 * 2. seedForm 字段新增（与表格"形态"列对齐）
 * 3. originalSupplierName 调拨来源供应商独立展示
 * 4. 入库数量 / 剩余可用 / 已使用 三段展示
 * 5. 审计字段（创建人/时间、修改人/时间）折叠区
 * 6. 移除冗余繁殖字段（编辑时不允许改育种/留种数据，应由专门模块管理）
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { X, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { SeedSource, SourceType, SourceOrigin } from '../../../../types/crop';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { DictSelect } from '../../../common/settings/DictSelect';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVariety } from '../../../../types/cropVariety';
import { Input } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { SOURCE_ORIGIN_MAP } from '../../../../constants/cropConstants';
import { ADD_SOURCE_TYPE_TO_SUPPLIER_TYPE as SOURCE_TYPE_TO_SUPPLIER_TYPE } from '../../../../constants/seedSourceDict';
import { SEED_FORM_OPTIONS, resolveSeedFormLabel } from '../../../../constants/seedFormDict';
import { useSupplierStore } from '../../../../stores/useSupplierStore';
// 2026-07-21：共享品种路径 hook（与列表/详情完全一致）
import { useSeedSourceVarietyPath } from '@/hooks/useSeedSourceVarietyPath';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: SeedSource;
  suppliers: Array<{ value: string; label: string }>;
}

// ========== 来源途径 → 字段可编辑性规则（单一真理源） ==========
type EditabilityRule = {
  /** 该字段是否可编辑 */
  sourceOriginEditable: boolean;
  supplierEditable: boolean;
  purchaseDateEditable: boolean;
  unitEditable: boolean;
  /** 2026-10-17：作物是否可编辑（内部来源锁定只读，见 getEditRule） */
  cropEditable: boolean;
  seedFormEditable: boolean;
  /** 原始供应商是否展示 */
  showOriginalSupplier: boolean;
};

const TRANSFERRED_ORIGINS: ReadonlyArray<SourceOrigin> = [
  'inventory_transfer',
  'planting_self_kept',
  'transfer_from_inventory',
];

/**
 * 判断来源途径是否属于"入库时确定，不允许编辑"类
 */
function isImportedFromInventory(sourceOrigin: string): boolean {
  return (TRANSFERRED_ORIGINS as readonly string[]).includes(sourceOrigin);
}

function getEditRule(sourceOrigin: string): EditabilityRule {
  const isExternalPurchase = sourceOrigin === 'external_purchase' || sourceOrigin === 'external_purchased';
  const isImported = isImportedFromInventory(sourceOrigin);
  return {
    sourceOriginEditable: isExternalPurchase,
    supplierEditable: isExternalPurchase,
    purchaseDateEditable: isExternalPurchase,
    unitEditable: isExternalPurchase && false, // 单位永远只读（quantity 按单位算）
    // 2026-10-17：内部来源（调拨/留种）的作物与形态均为创建时确定（用户决策：不需要编辑选择）——
    //   调拨 ← 来源库存自动带入；留种 ← 种植批号 + 留种弹窗当次选定。
    //   全库数据核验：19/19 作物与上游一致，从未需要编辑。外购来源是用户直接录入、
    //   选错需修正的窗口（且形态还派生 propagation_method 并参与回流合并键），保持可编辑。
    cropEditable: !isImported,
    seedFormEditable: !isImported,
    showOriginalSupplier: isImported,
  };
}

export function EditModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  suppliers
}: EditModalProps) {
  const [cropCode, setCropCode] = useState(record.cropCode || '');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);
  const [showAuditInfo, setShowAuditInfo] = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  // 2026-07-21：使用共享 hook 显示完整品种路径（与列表/详情一致）
  const { getVarietyPath } = useSeedSourceVarietyPath();

  // 编辑性规则（按来源途径）
  const editRule = useMemo(() => getEditRule(record.sourceOrigin), [record.sourceOrigin]);
  const sourceOriginLabel = SOURCE_ORIGIN_MAP[record.sourceOrigin]?.label || record.sourceOrigin;

  // 表单数据初始化（仅保留真正可在编辑弹窗改的字段）
  const buildFormData = (r: SeedSource) => ({
    sourceOrigin: r.sourceOrigin || 'external_purchase',
    cropCategory: r.cropCategory,
    typeName: r.typeName,
    varietyName: r.varietyName,
    cropName: r.cropName,
    cropVariety: r.cropVariety,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    purchaseDate: r.purchaseDate,
    unit: r.unit,
    unitPrice: r.unitPrice,
    seedForm: r.seedForm || '',
    pictures: (() => {
      if (Array.isArray(r.pictures)) return r.pictures;
      if (typeof r.pictures === 'string') {
        try { return JSON.parse(r.pictures); } catch { return []; }
      }
      return [];
    })(),
    remarks: r.remarks || '',
  });

  const [formData, setFormData] = useState(() => buildFormData(record));

  useEffect(() => {
    if (isOpen) {
      setCropCode(record.cropCode || '');
      setFormData(buildFormData(record));
    }
  }, [isOpen, record.id]);

  // 供应商数据（按 sourceType 过滤）
  const allSuppliersFromStore = useSupplierStore((s) => s.items);
  const filteredSuppliers = useMemo(() => {
    const targetType = SOURCE_TYPE_TO_SUPPLIER_TYPE[record.sourceType];
    if (!targetType) return suppliers;
    const validIds = new Set(
      // 2026-09-28：候选只含「合作中」供应商
      allSuppliersFromStore.filter(s => (s.status === '合作中' || s.status === 'active') && (!targetType || s.supplierType === targetType)).map(s => String(s.id))
    );
    return suppliers.filter(s => validIds.has(s.value));
  }, [record.sourceType, suppliers, allSuppliersFromStore]);

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
    // 校验："其他"形态必须备注（仅可编辑来源 — 锁定来源的形态非用户所选）
    if (editRule.seedFormEditable && formData.seedForm === '其他' && !formData.remarks.trim()) {
      await showAlert('种源形态选择"其他"时，备注为必填项，请输入详细说明');
      return;
    }
    // 外购入库必须选供应商
    if (editRule.supplierEditable && !formData.supplierId) {
      await showAlert('请选择原始供应商');
      return;
    }

    // 解析供应商名称
    const supplier = suppliers.find(s => s.value === formData.supplierId);
    const supplierName = supplier?.label || formData.supplierName;

    try {
      await useSeedSourceStore.getState().updateItem(String(record.id), {
        // ========== 按编辑规则提交字段 ==========
        // 来源途径：仅 external_purchase 可改
        ...(editRule.sourceOriginEditable && { sourceOrigin: formData.sourceOrigin as SourceOrigin }),
        // 作物（6 字段）：仅可编辑来源提交 —— 内部来源由上游带入，不提交避免与来源数据分叉
        // （2026-10-17：用户决策锁定内部来源的作物与形态）
        ...(editRule.cropEditable && {
          cropCategory: formData.cropCategory,
          typeName: formData.typeName,
          varietyName: formData.varietyName,
          cropName: formData.cropName,
          cropVariety: formData.cropVariety,
          cropCode,
        }),
        // 供应商：仅 external_purchase 可改
        ...(editRule.supplierEditable && {
          supplierId: formData.supplierId,
          supplierName,
        }),
        // 采购日期：仅 external_purchase 可改
        ...(editRule.purchaseDateEditable && { purchaseDate: formData.purchaseDate }),
        // 单位：永远只读，不提交
        // 数量：永远只读，不提交（累计值由入库/调拨动作累加）
        unitPrice: formData.unitPrice,
        // 总金额 = 单价 × 累计入库量（不随编辑变）
        totalAmount: formData.unitPrice * record.quantity,
        // 种源形态：仅可编辑来源提交（内部来源创建时已确定，锁定只读）
        ...(editRule.seedFormEditable && { seedForm: formData.seedForm || undefined }),
        pictures: formData.pictures,
        remarks: formData.remarks,
        // 操作人
        updateBy: currentUser?.realName || currentUser?.username || 'system',
      });
    } catch (error) {
      console.error('[EditModal] 更新种源失败:', error);
      await showAlert('更新失败，请重试');
      return;
    }

    onSuccess?.();
    onClose();
  };

  // 已使用数量 = 入库 - 剩余
  const usedCount = Math.max(0, (record.quantity || 0) - (record.availableCount || 0));

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
        {/* ========== 第 1 行：种源批号（只读）+ 来源途径 ========== */}
        <div>
          <Label className="text-gray-900">种源批号</Label>
          <Input
            type="text"
            value={record.seedCode}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 font-mono"
          />
        </div>

        <div>
          <Label className="text-gray-900">
            来源途径
            {!editRule.sourceOriginEditable && (
              <span className="ml-2 text-xs font-normal text-amber-600">（入库时已确定）</span>
            )}
          </Label>
          {editRule.sourceOriginEditable ? (
            <DictSelect
              category="source_origin"
              value={formData.sourceOrigin}
              onChange={(value) => setFormData({ ...formData, sourceOrigin: value as SourceOrigin })}
              placeholder="选择来源途径"
            />
          ) : (
            <Input
              type="text"
              value={sourceOriginLabel}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
            />
          )}
        </div>

        {/* ========== 第 2 行：作物品种（种源类型行已按用户决策删除，见上方说明） ========== */}
        <div>
          <Label className="text-gray-900">
            {editRule.cropEditable && <span className="text-red-500">*</span>}
            作物品种
          </Label>
          {/* 2026-10-17：内部来源（调拨/留种）作物锁定只读 —— 创建时由来源带入，编辑改会与
              上游（库存/种植批次/original_* 快照）分叉并影响回流合并键（用户决策） */}
          {editRule.cropEditable ? (
            <>
              <CropCodeSelector
                value={cropCode}
                onChange={handleCropCodeChange}
                placeholder="搜索或选择作物品种..."
                size="md"
                showFullPath={true}
              />
              {/* 2026-07-21：显示当前种源的完整品种路径（与列表/详情完全一致） */}
              {getVarietyPath(record) && getVarietyPath(record) !== '—' && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <div className="text-emerald-700">{getVarietyPath(record)}</div>
                </div>
              )}
            </>
          ) : (
            <>
              <Input
                type="text"
                value={getVarietyPath(record) && getVarietyPath(record) !== '—'
                  ? getVarietyPath(record)
                  : (record.cropName || '-')}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
                title={getVarietyPath(record)}
              />
              <p className="mt-1 text-xs text-gray-400">由来源（调拨/留种）带入，编辑时不可修改</p>
            </>
          )}
        </div>

        {/* 2026-10-17：删除「种源类型」显示行（用户决策，与详情弹窗同步）——
            列表 2026-06-30 已将「种源类型 + 种源形态」合并为单列展示，单独成行属遗留冗余；
            DB 字段保留（供应商候选过滤 SOURCE_TYPE_TO_SUPPLIER_TYPE 在用，见 buildFormData 上方） */}

        {/* ========== 第 3 行：种源形态 + 供应商（调拨/回流来源无「供应商」框，见下方条件） ========== */}
        <div>
          <Label className="text-gray-900">种源形态</Label>
          {editRule.seedFormEditable ? (
            <select
              value={formData.seedForm}
              onChange={(e) => setFormData({ ...formData, seedForm: e.target.value })}
              className="w-full h-10 px-3 border border-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">未选择</option>
              {SEED_FORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <>
              <Input
                type="text"
                value={resolveSeedFormLabel(formData.seedForm) || '-'}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
              />
              {/* 2026-10-17：内部来源形态锁定只读（创建时确定） */}
              <p className="mt-1 text-xs text-gray-400">由来源（调拨/留种）带入，编辑时不可修改</p>
            </>
          )}
          {/* 2026-10-17："其他"备注校验仅对可编辑来源生效（锁定来源非用户所选，不再要求） */}
          {editRule.seedFormEditable && formData.seedForm === '其他' && (
            <p className="mt-1 text-xs text-red-500">备注必填：形态为"其他"时需说明详情</p>
          )}
        </div>

        {/* 2026-10-17：调拨/回流来源隐藏只读「供应商」框 —— 其值只是来源库存供应商的副本
            （创建时从 inventory_stock 复制），与第 4 行「原始供应商」同值并列显示会造成
            "重复字段"困惑（用户报告：一条种源看到两个相同供应商）。外购来源保留可编辑供应商；
            其他未识别来源保持原只读展示（showOriginalSupplier 仅对调拨/回流为 true）。 */}
        {!editRule.showOriginalSupplier && (
          <div>
            <Label className="text-gray-900">
              {editRule.supplierEditable && <span className="text-red-500">*</span>}
              原始供应商
            </Label>
            {editRule.supplierEditable ? (
              <select
                value={formData.supplierId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setFormData({ ...formData, supplierId: '', supplierName: '' });
                    return;
                  }
                  const supplier = filteredSuppliers.find(s => s.value === val);
                  setFormData({ ...formData, supplierId: val, supplierName: supplier?.label || '' });
                }}
                className="w-full h-10 px-3 border border-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">请选择原始供应商</option>
                {filteredSuppliers.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
                {filteredSuppliers.length === 0 && suppliers.length > 0 && (
                  <option value="" disabled>当前种源类型下无匹配供应商，请切换种源类型</option>
                )}
              </select>
            ) : (
              <Input
                type="text"
                value={formData.supplierName || '内部自留/无供应商'}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
              />
            )}
          </div>
        )}

        {/* ========== 第 4 行：原始供应商（仅调拨/回流展示） + 采购/入库日期 ========== */}
        {editRule.showOriginalSupplier ? (
          <div>
            <Label className="text-gray-900">
              原始供应商
              <span className="ml-2 text-xs font-normal text-gray-400">（调拨来源库存）</span>
            </Label>
            <Input
              type="text"
              value={record.originalSupplierName || '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-400">来源库存的供应商，不可修改</p>
          </div>
        ) : (
          <div>
            <Label className="text-gray-900">
              {editRule.purchaseDateEditable ? '采购日期' : '入库日期'}
            </Label>
            {editRule.purchaseDateEditable ? (
              <DatePicker className="w-full"
                selected={formData.purchaseDate ? new Date(formData.purchaseDate) : undefined}
                onChange={(date) => setFormData({ ...formData, purchaseDate: todayLocal(date) })}
              />
            ) : (
              <Input
                type="text"
                value={formData.purchaseDate || record.createTime || '-'}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
              />
            )}
          </div>
        )}

        {/* 占位：日期字段放第 4 行第 2 列 */}
        {editRule.showOriginalSupplier ? (
          <div>
            <Label className="text-gray-900">入库日期</Label>
            <Input
              type="text"
              value={record.originalInboundDate || formData.purchaseDate || record.createTime || '-'}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-400">原始入库日期，由入库动作决定</p>
          </div>
        ) : null}

        {/* ========== 第 5 行：入库/剩余/已用 三段展示 ========== */}
        <div className="col-span-2">
          <Label className="text-gray-900">
            库存数量
            <span className="ml-2 text-xs font-normal text-amber-600">（累计值由入库/调拨动作累加，不可直接修改）</span>
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-blue-50">
              <div className="text-xs text-gray-500">入库数量</div>
              <div className="text-lg font-semibold text-blue-700 mt-1">
                {record.quantity?.toLocaleString() || 0} <span className="text-xs text-gray-500 font-normal">{record.unit || ''}</span>
              </div>
            </div>
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-emerald-50">
              <div className="text-xs text-gray-500">可用数量</div>
              <div className="text-lg font-semibold text-emerald-700 mt-1">
                {record.availableCount?.toLocaleString() || 0} <span className="text-xs text-gray-500 font-normal">{record.unit || ''}</span>
              </div>
            </div>
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-amber-50">
              <div className="text-xs text-gray-500">已使用数量</div>
              <div className="text-lg font-semibold text-amber-700 mt-1">
                {usedCount.toLocaleString()} <span className="text-xs text-gray-500 font-normal">{record.unit || ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========== 第 6 行：单位 + 单价 ========== */}
        <div>
          <Label className="text-gray-900">
            单位
            {!editRule.unitEditable && (
              <span className="ml-2 text-xs font-normal text-gray-400">（入库时已确定）</span>
            )}
          </Label>
          <Input
            type="text"
            value={record.unit || '-'}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
          />
          <p className="mt-1 text-xs text-gray-400">单位修改会影响数量计算，请走退库/重新入库流程</p>
        </div>

        <div>
          <Label className="text-gray-900">单价（元）</Label>
          <Input
            type="number"
            value={formData.unitPrice || ''}
            onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
          />
        </div>

        {/* ========== 图片上传 ========== */}
        <div className="col-span-2">
          <Label className="text-gray-900">图片上传</Label>
          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4">
            {formData.pictures.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.pictures.map((pic: string, index: number) => (
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

        {/* ========== 备注 ========== */}
        <div className="col-span-2">
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            placeholder="请输入备注信息"
          />
        </div>

        {/* ========== 审计信息（折叠区） ========== */}
        <div className="col-span-2">
          <button
            type="button"
            onClick={() => setShowAuditInfo(!showAuditInfo)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            {showAuditInfo ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            审计信息（创建人/时间、最后修改）
          </button>
          {showAuditInfo && (
            <div className="mt-2 grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <div>
                <span className="text-gray-500">创建人：</span>
                <span className="text-gray-700">{record.createBy || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">创建时间：</span>
                <span className="text-gray-700">{record.createTime || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">最后修改人：</span>
                <span className="text-gray-700">{(record as any).updateBy || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">最后修改：</span>
                <span className="text-gray-700">{record.updateTime || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">结束状态：</span>
                <span className={record.endTime ? 'text-red-600' : 'text-emerald-600'}>
                  {record.endTime ? `${record.endType === 'abnormal' ? '异常结束' : '正常结束'} (${record.endTime})` : '进行中'}
                </span>
              </div>
              {/* 2026-10-17：删除「生产计划 / 溯源码」显示（用户决策，与详情弹窗同步）——
                  两字段在种源模块无有效数据源（详见 DetailModal 同款注释），原为条件渲染（非空才显示） */}
              {record.transferredFromStockId && (
                <>
                  <div>
                    <span className="text-gray-500">调拨来源库存：</span>
                    <span className="text-gray-700 font-mono">{record.transferredFromStockId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">调拨业务：</span>
                    <span className="text-gray-700">{record.transferredFromBusinessType} #{record.transferredFromBusinessId}</span>
                  </div>
                </>
              )}
              {/* 2026-07-21：回流合并信息 — 仅 planting_self_kept 且 reflowCount > 0 时显示 */}
              {record.sourceOrigin === 'planting_self_kept' && (record.reflowCount ?? 0) > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500">回流合并：</span>
                  <span className="text-gray-700">{record.reflowCount} 次（最近 {record.lastReflowAt}）</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}