/**
 * 作物库存 - 新建入库弹窗
 * 用途：作物库存页"新建"按钮的真正实现
 * 支持来源：自产（兜底）/ 外购 / 赠送 / 委托生产 / 调拨 / 手动盘点
 * 业务单据：自建库存无上游单据，businessId 用 UUID
 *
 * 2026-06-11 改造：补全供应商选择器 + 单价 + 总金额 + 采购日期 + 缺失字段
 */

import React, { useEffect, useState, useRef } from 'react';
import { Modal, FormField } from '@/components/ui';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Package, AlertCircle, Search, X } from 'lucide-react';
import { useWarehouseStore, getActiveWarehouses } from '../../../stores';
import { useInventoryStore } from '../../../stores';
import { useSupplierStore } from '../../../stores';
import { todayLocal } from '@/lib/dateUtils';
import type { Supplier } from '../../../types/supplier';
// 反查品种库，自动补 cropId / cropCode（列表展示需要）
import { initVarieties, getVarietyByName } from '../../../services/cropVarietyService';
// 一次性动作（"非持久化数据"）：按修订后铁律直接调 service，
// 写后显式调 useInventoryStore.notifyChange() 触发跨页刷新（保留原功能）
import { inbound } from '../../../services/inventoryService';
import {
  StockType,
  SourceType,
  BusinessType,
} from '../../../types/inventory';

// 业务推荐：用户主要诉求是"非采收/非采购"的其他入库途径
// 顺序按"使用频率"排列：外购 > 赠送 > 委托 > 调拨 > 手动 > 自产（兜底）
const SOURCE_OPTIONS: Array<{ value: SourceType; label: string; color: string; hint: string }> = [
  { value: SourceType.EXTERNAL_PURCHASED, label: '外购入库', color: 'text-blue-600', hint: '从供应商/市场购买入库' },
  { value: SourceType.GIFT,             label: '赠送/受赠', color: 'text-purple-600', hint: '他人或单位赠送的作物' },
  { value: SourceType.COMMISSIONED,     label: '委托生产', color: 'text-amber-600', hint: '委托他方生产后交付' },
  { value: SourceType.TRANSFER,         label: '调拨入库', color: 'text-emerald-600', hint: '从其他基地/仓库调入' },
  { value: SourceType.MANUAL,           label: '手动录入', color: 'text-slate-600', hint: '盘点/期初/其他' },
  { value: SourceType.SELF_PRODUCED,    label: '自产（兜底）', color: 'text-orange-600', hint: '建议走"采收入库"页' },
];

const STOCK_TYPE_OPTIONS = [
  { value: StockType.SEED,     label: '种源' },
  { value: StockType.SEEDLING, label: '种苗' },
  { value: StockType.PRODUCT,  label: '成品' },
];

const UNIT_OPTIONS = [
  { value: '公斤', label: '公斤' },
  { value: '克',   label: '克' },
  { value: '吨',   label: '吨' },
  { value: '株',   label: '株' },
  { value: '袋',   label: '袋' },
  { value: '箱',   label: '箱' },
  { value: '个',   label: '个' },
  { value: '盘',   label: '盘' },
  { value: '组',   label: '组' },
];

const GRADE_OPTIONS = [
  { value: 'special',     label: '特优' },
  { value: 'excellent',   label: '优' },
  { value: 'good',        label: '良' },
  { value: 'qualified',   label: '合格' },
  { value: 'unqualified', label: '不合格' },
];

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// 生成业务 ID（无上游单据时用本地 UUID）
function genBusinessId(): string {
  // 简单 UUID v4 生成（无外部依赖）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const warehouses = useWarehouseStore((s) => s.warehouses);
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses);
  const notifyChange = useInventoryStore((s) => s.notifyChange);

  // 供应商搜索
  const supplierItems = useSupplierStore((s) => s.items);
  const loadSuppliers = useSupplierStore((s) => s.loadItems);
  const searchSuppliersInStore = useSupplierStore((s) => s.search);
  const [supplierSearchKeyword, setSupplierSearchKeyword] = useState('');
  const [supplierSearchResults, setSupplierSearchResults] = useState<Supplier[]>([]);
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const supplierSearchRef = useRef<HTMLDivElement>(null);

  // 表单状态
  const [sourceType, setSourceType] = useState<SourceType>(SourceType.EXTERNAL_PURCHASED);
  const [stockType, setStockType] = useState<StockType>(StockType.PRODUCT);
  const [cropName, setCropName] = useState('');
  const [cropId, setCropId] = useState('');
  const [cropCode, setCropCode] = useState('');
  const [variety, setVariety] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState('公斤');
  const [warehouseId, setWarehouseId] = useState('');
  const [inboundDate, setInboundDate] = useState(todayLocal());
  const [grade, setGrade] = useState('good');
  const [plantingMode, setPlantingMode] = useState('');
  const [greenhouseName, setGreenhouseName] = useState('');
  const [remarks, setRemarks] = useState('');
  // 采购信息（所有入库来源共用）
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState(todayLocal());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载供应商 + 仓库
  useEffect(() => {
    if (isOpen) {
      if (warehouses.length === 0) loadWarehouses();
      void loadSuppliers();
    }
  }, [isOpen]);

  // 供应商搜索
  useEffect(() => {
    if (supplierSearchKeyword.trim()) {
      setSupplierSearchResults(searchSuppliersInStore(supplierSearchKeyword));
    } else {
      setSupplierSearchResults(supplierItems);
    }
  }, [supplierSearchKeyword, supplierItems, searchSuppliersInStore]);

  // 供应商搜索结果关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierSearchRef.current && !supplierSearchRef.current.contains(e.target as Node)) {
        setShowSupplierSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 品种库反查：作物名称变化时自动补 cropId / cropCode（列表展示需要）
  // 兜底模式与 InventoryTable 保持一致：cropName 当作 varietyName 查
  useEffect(() => {
    if (!cropName.trim()) {
      setCropId('');
      setCropCode('');
      return;
    }
    initVarieties();
    const v = getVarietyByName(cropName.trim());
    if (v) {
      setCropId(v.id);
      setCropCode(v.cropCode);
    } else {
      setCropId('');
      setCropCode('');
    }
  }, [cropName]);

  // 弹窗打开时重置
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSourceType(SourceType.EXTERNAL_PURCHASED);
      setStockType(StockType.PRODUCT);
      setCropName('');
      setCropId('');
      setCropCode('');
      setVariety('');
      setQuantity('');
      setUnit('公斤');
      setWarehouseId('');
      setInboundDate(todayLocal());
      setGrade('good');
      setPlantingMode('');
      setGreenhouseName('');
      setRemarks('');
      setSupplierId('');
      setSupplierName('');
      setUnitPrice('');
      setPurchaseDate(todayLocal());
      setSupplierSearchKeyword('');
      setShowSupplierSearch(false);
    }
  }, [isOpen]);

  const activeWarehouses = getActiveWarehouses();

  // 实时计算总金额
  const computedTotal = Number(quantity || 0) * Number(unitPrice || 0);

  const handleSelectSupplier = (supplier: Supplier) => {
    setSupplierId(String(supplier.id));
    setSupplierName(supplier.name);
    setShowSupplierSearch(false);
    setSupplierSearchKeyword('');
  };

  // 校验
  const validate = (): string | null => {
    if (!cropName.trim()) return '请输入作物名称';
    const qty = Number(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) return '请输入有效数量（>0）';
    if (!unit.trim()) return '请选择单位';
    if (!warehouseId) return '请选择入库仓库';
    if (!inboundDate) return '请选择入库日期';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const warehouse = warehouses.find(w => (w as any).oid === warehouseId || (w as any).id === warehouseId);
      const qty = Number(quantity);
      const sourceLabel = SOURCE_OPTIONS.find(s => s.value === sourceType)?.label || '入库';
      const businessCode = `MANUAL-${sourceLabel}-${Date.now()}`;

      const result = await inbound(
        {
          stockType,
          businessId: genBusinessId(),
          businessType: BusinessType.MANUAL,
          businessCode,
          cropId: cropId || undefined,
          cropName: cropName.trim(),
          cropCode: cropCode || undefined,
          varietyName: variety.trim() || undefined,
          quantity: qty,
          unit: unit.trim(),
          sourceType,
          supplierId: supplierId || undefined,
          supplierName: supplierName.trim() || undefined,
          remarks: remarks.trim() || undefined,
          extensions: {
            warehouseId,
            warehouseName: (warehouse as any)?.name || '',
            inboundDate,
            grade,
            sourceLabel,
          },
          // V3 扩展字段（让库存页展示完整元数据）
          grade,
          plantingMode: plantingMode.trim() || undefined,
          greenhouseName: greenhouseName.trim() || undefined,
          auditor: '系统管理员',  // 手动录入的审核人=操作人，供应商走 supplierName 字段
          // 采购信息
          unitPrice: unitPrice ? Number(unitPrice) : undefined,
          totalAmount: computedTotal || undefined,
          purchaseDate: purchaseDate || undefined,
        },
        'system',
        '系统管理员'
      );

      if (result.success) {
        notifyChange();
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || '入库失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '入库失败');
    } finally {
      setSubmitting(false);
    }
  };

  const sourceInfo = SOURCE_OPTIONS.find(s => s.value === sourceType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          <span>新建入库（作物库存）</span>
        </div>
      }
      submitText={submitting ? '提交中...' : '确认入库'}
      cancelText="取消"
      width={1000}
      height={800}
    >
      <div className="space-y-4">
        {/* 来源类型 - 顶部置顶，醒目 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">入库来源 <span className="text-red-500">*</span></div>
          <div className="grid grid-cols-3 gap-2">
            {SOURCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSourceType(opt.value)}
                className={`text-left p-3 rounded border-2 transition-all ${
                  sourceType === opt.value
                    ? 'border-blue-500 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`text-sm font-medium ${opt.color}`}>{opt.label}</div>
                <div className="text-xs text-gray-500 mt-1">{opt.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* 基础信息 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="库存类型 *">
            <Select value={stockType} onValueChange={(val) => setStockType(val as StockType)}>
              <SelectTrigger>
                <SelectValue placeholder="请选择库存类型" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="入库日期 *">
            <Input
              type="date"
              value={inboundDate}
              onChange={(e) => setInboundDate(e.target.value)}
            />
          </FormField>
        </div>

        {/* 品种信息 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="作物名称 *">
            <Input
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              placeholder="例如：番茄"
            />
          </FormField>
          <FormField label="品种">
            <Input
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="例如：粉冠F1"
            />
          </FormField>
        </div>

        {/* 数量 + 单位 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="数量 *">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="单位 *">
            <Select value={unit} onValueChange={(val) => setUnit(val)}>
              <SelectTrigger>
                <SelectValue placeholder="请选择单位" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* 仓库 + 品质 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="入库仓库 *">
            <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="请选择仓库" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">请选择仓库</SelectItem>
                {activeWarehouses.map(w => (
                  <SelectItem
                    key={(w as any).oid || (w as any).id}
                    value={(w as any).oid || (w as any).id}
                  >
                    {(w as any).name}（{(w as any).warehouseType || (w as any).type || ''}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="品质等级">
            <Select value={grade} onValueChange={(val) => setGrade(val)}>
              <SelectTrigger>
                <SelectValue placeholder="请选择品质等级" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* 种植模式 + 采收区域（V3 字段，列表展示需要）*/}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="种植模式">
            <Input
              value={plantingMode}
              onChange={(e) => setPlantingMode(e.target.value)}
              placeholder="如：土壤/水培/基质（选填）"
            />
          </FormField>
          <FormField label="采收区域">
            <Input
              value={greenhouseName}
              onChange={(e) => setGreenhouseName(e.target.value)}
              placeholder="如：A栋1号棚（选填）"
            />
          </FormField>
        </div>

        {/* 采购日期 + 单价 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="采购日期">
            <DatePicker
              selected={purchaseDate ? new Date(purchaseDate) : undefined}
              onChange={(date) => setPurchaseDate(todayLocal(date))}
              className="w-full"
            />
          </FormField>
          <FormField label="单价（元）">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className={deepInputClass}
              placeholder="例如：15.80"
            />
          </FormField>
        </div>

        {/* 总金额（只读计算） */}
        <FormField label="总金额（元）">
          <Input
            type="text"
            value={`¥ ${computedTotal.toFixed(2)}`}
            readOnly
            className={`${deepInputClass} bg-gray-100 font-mono text-emerald-700`}
          />
        </FormField>

        {/* 供应商搜索选择器（替换原自由文本） */}
        <FormField label={
          sourceType === SourceType.EXTERNAL_PURCHASED ? '供应商' :
          sourceType === SourceType.GIFT ? '赠送人/单位' :
          sourceType === SourceType.COMMISSIONED ? '受托方' :
          sourceType === SourceType.TRANSFER ? '调出方' :
          '来源说明'
        }>
          <div ref={supplierSearchRef} className="relative">
            {supplierName ? (
              // 已选中供应商
              <div className={`${deepInputClass} flex items-center justify-between bg-gray-50`}>
                <span className="text-sm text-gray-900">{supplierName}</span>
                <button
                  type="button"
                  onClick={() => { setSupplierId(''); setSupplierName(''); }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // 搜索输入
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={supplierSearchKeyword}
                  onChange={(e) => {
                    setSupplierSearchKeyword(e.target.value);
                    setShowSupplierSearch(true);
                  }}
                  onFocus={() => setShowSupplierSearch(true)}
                  className={`${deepInputClass} w-full pl-10`}
                  placeholder={
                    sourceType === SourceType.EXTERNAL_PURCHASED ? '搜索供应商名称/编码...' :
                    '输入来源方名称...'
                  }
                />
              </div>
            )}
            {/* 搜索结果下拉 */}
            {showSupplierSearch && !supplierName && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {supplierSearchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">无匹配供应商</div>
                ) : (
                  supplierSearchResults.slice(0, 20).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSupplier(s)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 border-b border-gray-100 last:border-b-0"
                    >
                      <span className="font-medium text-gray-900">{s.name}</span>
                      {s.contactPerson && <span className="ml-2 text-gray-400">({s.contactPerson})</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </FormField>

        {/* 备注 */}
        <FormField label="备注">
          <TextArea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="选填"
          />
        </FormField>

        {/* 底部提示 */}
        {sourceInfo && sourceType !== SourceType.SELF_PRODUCED && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            <span className={`font-medium ${sourceInfo.color}`}>{sourceInfo.label}</span>：{sourceInfo.hint}
            ，无上游业务单据，系统将自动生成业务编号
          </div>
        )}
        {sourceType === SourceType.SELF_PRODUCED && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            ⚠️ 自产来源建议走"采收入库"页（可关联批次/种植区域），本弹窗只用于"无批次"的兜底录入
          </div>
        )}
      </div>
    </Modal>
  );
};
