/**
 * 种源入库登记弹窗（2026-06-26 Q1+）
 *
 * 业务：种源管理操作列「入库登记」按钮 — 给种源做外购/自产入库登记
 *
 * 与 UnifiedRowHarvestInboundModal 的区别（2026-06-26 重构）：
 * - 标题、字段名按"采购"语义命名（不是采收）
 * - 仓库自动锁死 seed_storage 类型（不允许选其他仓库）
 * - 删除"销售类型/补录/采收员/温室/采收形态"等不适用的种源入库字段
 * - 加"供应商"字段（外购必填）
 * - 1 条产品明细（种源锁 1 条）
 *
 * 数据流：复用 unifiedHarvestInboundService.submitUnifiedInbound
 *  后端路由：POST /api/inventory/inbound-from-source
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  FormField,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  TextArea,
  DatePicker,
  NumberInput,
  Button,
} from '@/components/ui';
import { Package, AlertCircle, X, ChevronDown, Sprout } from 'lucide-react';
import { useWarehouseStore } from '@/stores';
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useSupplierStore } from '@/stores';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert } from '@/lib/dialogService';
import {
  submitUnifiedInbound,
  type StockType,
  type SourceModule,
} from '@/services/unifiedHarvestInboundService';

// ============ 常量 ============

/** 品质等级（与 UnifiedRowHarvestInboundModal 一致） */
const QUALITY_GRADES = [
  { value: 'special', label: '特优' },
  { value: 'excellent', label: '优' },
  { value: 'good', label: '良' },
  { value: 'qualified', label: '合格' },
  { value: 'unqualified', label: '不合格' },
];

/** 种源来源（与 seed_sources.sourceOrigin 对齐：external_purchase / internal_seed / self_produced） */
const SOURCE_ORIGIN_OPTIONS = [
  { value: 'external_purchase', label: '外购' },
  { value: 'internal_seed', label: '内部种源' },
  { value: 'self_produced', label: '自产' },
];

/** 种源形态（与 inventory_stock.propagation_form 对齐）— 种子的物理形态，独立于种源来源 */
const PROPAGATION_FORM_OPTIONS = [
  { value: '种子', label: '种子' },
  { value: '种苗', label: '种苗' },
  { value: '实生苗', label: '实生苗' },
  { value: '扦插苗', label: '扦插苗' },
  { value: '嫁接苗', label: '嫁接苗' },
  { value: '组培苗', label: '组培苗' },
  { value: '分株苗', label: '分株苗' },
  { value: '种球', label: '种球' },
  { value: '球根', label: '球根' },
];

/** 常用单位 fallback（字典未加载时使用） */
const FALLBACK_UNITS = ['克', 'kg', '斤', '粒', '株', '枝', '袋', '包', '盒', '箱', '个', '块', '片', '颗'];

const deepInputClass =
  'px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner';

// ============ Props ============

export interface SeedSourceInboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** 目标种源（种源管理行） */
  sourceRecord: {
    id: string;
    code: string;
    cropName?: string;
    cropVariety?: string;
    cropCode?: string;
    unit?: string;
  };
}

// ============ 主组件 ============

export const SeedSourceInboundModal: React.FC<SeedSourceInboundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sourceRecord,
}) => {
  // ---- 表单 state ----
  const [purchaseDate, setPurchaseDate] = useState<string>(todayLocal());
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [warehouseName, setWarehouseName] = useState<string>('');
  const [purchaserNames, setPurchaserNames] = useState<string[]>([]);
  const [purchaserIds, setPurchaserIds] = useState<string[]>([]);
  const [purchaserPopoverOpen, setPurchaserPopoverOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number | string>(0);
  // 2026-07-01 P0-1 修复：单位变为可编辑（默认值=种源单位）
  // 业务规则：种源入库到商品种源池时，允许用户选择入库单位
  // 库存商品与种源单位可以不同（如种源按"袋"采购，但库存按"克"计量）
  const [fixedUnit, setFixedUnit] = useState<string>(sourceRecord.unit || '克');
  const [sourceType, setSourceType] = useState<string>('external_purchase');
  // 种源形态（独立于种源来源，必填）
  const [propagationForm, setPropagationForm] = useState<string>('');
  const [quantity, setQuantity] = useState<number | string>(0);
  const [qualityGrade, setQualityGrade] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Store hooks ----
  const warehouses = useWarehouseStore((s: any) => s.warehouses || []);
  const loadWarehouses = useWarehouseStore((s: any) => s.loadWarehouses);
  const dictionaries = useDictionaryStore((s: any) => s.dictionaries);
  const loadDictionaries = useDictionaryStore((s: any) => s.loadDictionaries);
  const users = useUserStore((s) => s.users);
  const loadUsers = useUserStore((s) => s.loadUsers);
  const supplierItems = useSupplierStore((s: any) => s.items || []);
  const loadSuppliers = useSupplierStore((s: any) => s.loadItems);
  const currentUser = useAuthStore((s) => s.currentUser);

  // ---- 筛选 seed_storage 类型的仓库（自动锁死）----
  // 2026-06-26 重构：种源仓库不只是"种子库"，还包括多肉叶/块茎/藤蔓/枝条/种球等所有可作为种源的物料
  // 仓储类型保持 seed_storage（兼容历史数据），UI 显示名改为"种源库"
  const seedWarehouses = useMemo(
    () => (warehouses || []).filter((w: any) =>
      (w.warehouseType || w.warehouse_type) === 'seed_storage',
    ),
    [warehouses],
  );

  // ---- 字典下拉（单位）----
  // 字典未加载时用 FALLBACK_UNITS，避免显示"字典加载中"
  const unitOptions = useMemo(() => {
    const items = getDictItems?.(dictionaries, 'unit') || [];
    if (items.length > 0) {
      return items.map((it: any) => it.dictCode).filter(Boolean);
    }
    return FALLBACK_UNITS;
  }, [dictionaries]);

  // ---- 加载基础数据 ----
  useEffect(() => {
    if (!isOpen) return;
    if (warehouses.length === 0) void loadWarehouses();
    if (supplierItems.length === 0) void loadSuppliers();
    if (dictionaries.length === 0) void loadDictionaries();
    if (users.length === 0) void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---- 自动锁死仓库（取第一个 seed_storage 仓库）----
  useEffect(() => {
    if (isOpen && seedWarehouses.length > 0 && !warehouseId) {
      const first = seedWarehouses[0];
      setWarehouseId(first.id || first.warehouseId);
      setWarehouseName(first.name || first.warehouseName || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seedWarehouses]);

  // ---- 重置表单 ----
  useEffect(() => {
    if (isOpen) {
      setPurchaseDate(todayLocal());
      // 仓库在 seed_storage 里重新选（前面 useEffect 自动锁第一个）
      setPurchaserNames([]);
      setPurchaserIds([]);
      setSupplierId('');
      setSupplierName('');
      setUnitPrice(0);
      setSourceType('external_purchase');
      setPropagationForm('');
      setQuantity(0);
      setQualityGrade('');
      setRemarks('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sourceRecord.id]);

  // ---- 供应商选中 ----
  const handleSelectSupplier = (supplierIdValue: string) => {
    const found = supplierItems.find((s: any) => String(s.id) === String(supplierIdValue));
    if (found) {
      setSupplierId(String(found.id));
      setSupplierName(found.name || '');
    } else {
      setSupplierId(supplierIdValue);
      setSupplierName('');
    }
  };

  // ---- 校验 ----
  const validate = (): string | null => {
    const qty = Number(quantity) || 0;
    if (qty <= 0) return '请填写入库数量（> 0）';
    if (!fixedUnit) return '该种源未配置单位，请先到内部种源设置单位';
    if (!warehouseId) return '种源库未配置，请到【基础数据-仓库】创建 seed_storage 类型仓库';
    if (sourceType === 'external_purchase' && !supplierId) return '外购入库必须选择供应商';
    if ((sourceType === 'external_purchase' || sourceType === 'internal_seed') && purchaserNames.length === 0) {
      return sourceType === 'external_purchase' ? '请至少选择 1 位采购员' : '请至少选择 1 位接收人';
    }
    if (!propagationForm) return '请选择种源形态（种子/种苗/扦插苗等）';
    return null;
  };

  // ---- 提交 ----
  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      // 复用 unifiedHarvestInboundService.submitUnifiedInbound
      // 注意：stockType=seed + sourceModule=seed_source 路由到种源入库
      // 不传 greenhouseIds/harvesterIds/saleType/isSupplementary（种源入库不适用）
      const result = await submitUnifiedInbound({
        stockType: 'seed' as StockType,
        sourceModule: 'seed_source' as SourceModule,
        inboundSourceType: sourceType,  // 用户选的入库来源（外购/自产/内部）
        sourceRecordId: sourceRecord.id,
        sourceRecordCode: sourceRecord.code,
        // 字段名复用以适配现有 service：harvestDate 实际承载采购日期
        harvestDate: purchaseDate,
        greenhouseIds: [],
        greenhouseNames: [],
        // harvester 字段复用承载采购员
        harvesterIds: purchaserIds,
        harvesterNames: purchaserNames,
        auditor: currentUser?.realName,
        remarks: remarks || undefined,
        // saleType/isSupplementary 不传（种源入库不适用）
        unitPrice: Number(unitPrice) || 0,
        unit: fixedUnit,
        warehouseId,
        warehouseName,
        propagationForm,  // 种源形态（必填）
        // 1 条产品明细（种源锁 1 条）
        products: [
          {
            cropCode: sourceRecord.cropCode || '',
            cropName: sourceRecord.cropName || '',
            cropVariety: sourceRecord.cropVariety || '',
            harvestQuantity: Number(quantity) || 0,
            unit: fixedUnit,
            grade: qualityGrade || undefined,
          },
        ],
        operatorName: purchaserNames[0] || 'system',
        // 2026-07-06：种源外购入库联动成本 — 补传供应商/采购员/采购价给后端
        // 仅 external_purchase 时传真实值，其他类型传空（后端按需忽略）
        supplierId: sourceType === 'external_purchase' ? (supplierId || undefined) : undefined,
        supplierName: sourceType === 'external_purchase' ? (supplierName || undefined) : undefined,
        purchaserIds: sourceType === 'external_purchase' ? purchaserIds : undefined,
        purchaserNames: sourceType === 'external_purchase' ? purchaserNames : undefined,
        purchasePrice: sourceType === 'external_purchase' ? (Number(unitPrice) || 0) : undefined,
        purchaseTotalAmount: sourceType === 'external_purchase'
          ? (Number(unitPrice) || 0) * (Number(quantity) || 0)
          : undefined,
      });

      if ((result as any).success === false) {
        setError((result as any).error || '提交失败');
        return;
      }

      showAlert('入库成功');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-emerald-600" />
          <span>商品种源入库 - {sourceRecord.code}（入作物库存 → 商品种源池）</span>
        </div>
      }
      submitText={submitting ? '提交中...' : '确认入库'}
      cancelText="取消"
      width={760}
      height={680}
    >
      <div className="space-y-4">
        {/* 顶部源记录信息（只读蓝色块） */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
          <Package className="w-4 h-4 text-emerald-600" />
          <div className="flex-1 text-sm">
            <div className="font-medium text-emerald-900">
              源记录：{sourceRecord.code}
            </div>
            <div className="text-xs text-emerald-700">
              {sourceRecord.cropName || '-'}
              {sourceRecord.cropVariety ? ` (${sourceRecord.cropVariety})` : ''}
              {sourceRecord.unit ? ` · 单位 ${sourceRecord.unit}` : ''}
            </div>
          </div>
        </div>

        {/* 2026-06-27: 两步走流程说明 — 提示本次入商品种源池，非入种源台账 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <div className="font-medium mb-1">⚠ 操作说明</div>
          <div>本次操作将入库到 <b>作物库存 → 商品种源</b> 池。</div>
          <div className="mt-1 text-xs">
            如需入库到 <b>内部种源台账</b>，请走操作列的「<b>调拨入库</b>」按钮（从商品种源池调拨）。
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* 基础信息 2 列：日期 + 种源来源 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="入库日期" required>
            <DatePicker
              className="w-full"
              selected={purchaseDate ? new Date(purchaseDate) : undefined}
              onChange={(date) => setPurchaseDate(todayLocal(date))}
            />
          </FormField>
          <FormField label="种源来源" required>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_ORIGIN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* 种源仓库（自动锁定 seed_storage，UI 显示"种源库"统一称呼） */}
        <FormField label="种源库" required>
          <div className={`${deepInputClass} bg-gray-50 flex items-center justify-between`}>
            <span className="text-sm text-gray-900">
              {warehouseName || (seedWarehouses.length === 0 ? '（暂无种源库，请到【基础数据-仓库】创建 seed_storage 类型仓库）' : '加载中…')}
            </span>
            <span className="text-xs text-gray-400">自动锁死</span>
          </div>
        </FormField>

        {/* 种源形态（独立于种源来源 — 物理形态必填） */}
        <FormField label="种源形态" required>
          <Select value={propagationForm} onValueChange={setPropagationForm}>
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="选择种子的物理形态" />
            </SelectTrigger>
            <SelectContent>
              {PROPAGATION_FORM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* 外购：供应商 + 采购员 */}
        {sourceType === 'external_purchase' && (
          <>
            <FormField label="供应商" required>
              {supplierName ? (
                <div
                  className={`${deepInputClass} flex items-center justify-between bg-gray-50`}
                >
                  <span className="text-sm text-gray-900">{supplierName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierId('');
                      setSupplierName('');
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <Select value={supplierId} onValueChange={handleSelectSupplier}>
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="请选择供应商" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierItems.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        暂无供应商，请到【基础数据-供应商】创建
                      </SelectItem>
                    ) : (
                      supplierItems.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                          {s.contactPerson ? `（${s.contactPerson}）` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label="采购员" required>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPurchaserPopoverOpen(!purchaserPopoverOpen)}
                  className={`${deepInputClass} w-full text-left flex items-center justify-between min-h-[44px] ${purchaserPopoverOpen ? 'border-emerald-500 ring-2 ring-emerald-200' : ''}`}
                >
                  <div className="flex-1 flex flex-wrap gap-1">
                    {purchaserNames.length === 0 ? (
                      <span className="text-gray-400">点击选择采购员（可多选）</span>
                    ) : (
                      purchaserNames.map((name, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded"
                        >
                          {name}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-emerald-950"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPurchaserNames((prev) => prev.filter((_, i) => i !== idx));
                              setPurchaserIds((prev) => prev.filter((_, i) => i !== idx));
                            }}
                          />
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 ml-2 shrink-0" />
                </button>
                {purchaserPopoverOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {users.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">用户列表加载中…</div>
                    ) : (
                      users.map((u: any) => {
                        const name = u.realName || u.real_name || u.username;
                        const checked = purchaserNames.includes(name);
                        return (
                          <label
                            key={u.oid || u.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setPurchaserNames((prev) => prev.filter((n) => n !== name));
                                  setPurchaserIds((prev) => prev.filter((_, i) => purchaserNames[i] !== name));
                                } else {
                                  setPurchaserNames((prev) => [...prev, name]);
                                  setPurchaserIds((prev) => [...prev, u.oid || u.id || `P${prev.length}`]);
                                }
                              }}
                            />
                            <span className="text-sm">{name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </FormField>
          </>
        )}

        {/* 内部种源：来源单位（选填）+ 接收人（必填） */}
        {sourceType === 'internal_seed' && (
          <>
            <FormField label="来源单位">
              <Input
                value={supplierName}
                onChange={(e) => {
                  setSupplierName(e.target.value);
                  setSupplierId(`manual_${Date.now()}`);
                }}
                placeholder="如：其他基地/部门"
                className={deepInputClass}
              />
            </FormField>
            <FormField label="接收人" required>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPurchaserPopoverOpen(!purchaserPopoverOpen)}
                  className={`${deepInputClass} w-full text-left flex items-center justify-between min-h-[44px] ${purchaserPopoverOpen ? 'border-emerald-500 ring-2 ring-emerald-200' : ''}`}
                >
                  <div className="flex-1 flex flex-wrap gap-1">
                    {purchaserNames.length === 0 ? (
                      <span className="text-gray-400">点击选择接收人（可多选）</span>
                    ) : (
                      purchaserNames.map((name, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded"
                        >
                          {name}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-emerald-950"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPurchaserNames((prev) => prev.filter((_, i) => i !== idx));
                              setPurchaserIds((prev) => prev.filter((_, i) => i !== idx));
                            }}
                          />
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 ml-2 shrink-0" />
                </button>
                {purchaserPopoverOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {users.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">用户列表加载中…</div>
                    ) : (
                      users.map((u: any) => {
                        const name = u.realName || u.real_name || u.username;
                        const checked = purchaserNames.includes(name);
                        return (
                          <label
                            key={u.oid || u.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setPurchaserNames((prev) => prev.filter((n) => n !== name));
                                  setPurchaserIds((prev) => prev.filter((_, i) => purchaserNames[i] !== name));
                                } else {
                                  setPurchaserNames((prev) => [...prev, name]);
                                  setPurchaserIds((prev) => [...prev, u.oid || u.id || `P${prev.length}`]);
                                }
                              }}
                            />
                            <span className="text-sm">{name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </FormField>
          </>
        )}

        {/* 自产：保管员（默认当前用户，可改） */}
        {sourceType === 'self_produced' && (
          <FormField label="保管员">
            <Input
              value={purchaserNames[0] || currentUser?.realName || ''}
              onChange={(e) => setPurchaserNames(e.target.value ? [e.target.value] : [])}
              placeholder="默认当前登录用户"
              className={deepInputClass}
            />
          </FormField>
        )}

        {/* 产品明细（种源锁 1 条） */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">
              产品明细 <span className="text-xs text-gray-500">（种源行锁死 1 条）</span>
            </div>
            {sourceType === 'external_purchase' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">单价（元）</span>
                <NumberInput
                  value={unitPrice}
                  onChange={setUnitPrice}
                  min={0}
                  step={0.01}
                  className="w-24"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <div className="text-xs text-gray-500 mb-1">种子名</div>
                <Input value={sourceRecord.cropName || ''} disabled className={deepInputClass} />
              </div>
              <div className="col-span-3">
                <div className="text-xs text-gray-500 mb-1">品种</div>
                <Input value={sourceRecord.cropVariety || ''} disabled className={deepInputClass} />
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-1">入库数量 *</div>
                <NumberInput
                  value={quantity}
                  onChange={setQuantity}
                  min={0}
                  className={deepInputClass}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-1">单位 *</div>
                {/* 2026-07-01 P0-1：单位可编辑（默认值=种源单位） */}
                <Select value={fixedUnit} onValueChange={setFixedUnit}>
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="选择单位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="克">克</SelectItem>
                    <SelectItem value="袋">袋</SelectItem>
                    <SelectItem value="粒">粒</SelectItem>
                    <SelectItem value="颗">颗</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="株">株</SelectItem>
                  </SelectContent>
                </Select>
                {sourceRecord.unit && sourceRecord.unit !== fixedUnit && (
                  <div className="text-xs text-amber-600 mt-1">
                    种源单位为「{sourceRecord.unit}」，当前入库单位不同，请确认
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-1">品质</div>
                <Select value={qualityGrade} onValueChange={setQualityGrade}>
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="选品质" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不指定</SelectItem>
                    {QUALITY_GRADES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* 备注 */}
        <FormField label="备注">
          <TextArea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className={deepInputClass}
            placeholder="选填"
          />
        </FormField>
      </div>
    </Modal>
  );
};

export default SeedSourceInboundModal;