/**
 * 作物库存 - 新建入库弹窗
 * 用途：作物库存页"新建"按钮的真正实现
 * 支持来源：自产（兜底）/ 外购 / 赠送 / 委托生产 / 调拨 / 手动盘点
 *
 * 2026-07-08 重构（T3 任务）：从 24+ 硬编码字段改为 FIELD_CONFIG 声明式渲染
 * - 公共字段 + 来源专属字段均来自 AddStockModal.constants
 * - 校验统一走 validateBySourceType（声明式矩阵）
 * - 切换来源自动清空专属字段（fieldsToResetOnSourceTypeChange）
 * - crop-selector 字段 T3 暂渲染为 Input（T4 升级 CropCodeSelector）
 * - 操作人 T3 暂硬编码 'system'（T5 接 useAuthStore）
 */

import React, { useEffect, useState } from 'react';
import { Modal, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TextArea, NumberInput } from '@/components/ui';
import { Package, AlertCircle } from 'lucide-react';
import {
  useWarehouseStore,
  useSupplierStore,
  useBaseStore,
  useInventoryStore,
  useInventoryInboundStore,
} from '../../../stores';
import type {
  SourceType as SourceTypeLiteral,
  StockType as StockTypeLiteral,
  InboundSourceRecord,
} from '../../../types/inventoryInbound';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert } from '@/lib/dialogService';
import {
  COMMON_FIELDS,
  FIELD_CONFIG,
  validateBySourceType,
  fieldsToResetOnSourceTypeChange,
  type FieldConfig,
} from './AddStockModal.constants';
import { toPayload, buildOperatorInfo } from '@/services/addStockFormAdapter';
import { useAuthStore } from '@/stores/useAuthStore';

// 业务推荐：用户主要诉求是"非采收/非采购"的其他入库途径
// 顺序按"使用频率"排列：外购 > 赠送 > 委托 > 调拨 > 手动 > 自产（兜底）
const SOURCE_OPTIONS: Array<{ value: SourceTypeLiteral; label: string; color: string; hint: string }> = [
  { value: 'external_purchased', label: '外购入库', color: 'text-blue-600', hint: '从外部市场采购入库' },
  { value: 'gift',             label: '赠送/受赠', color: 'text-purple-600', hint: '他人或单位赠送的作物' },
  { value: 'commissioned',     label: '委托生产', color: 'text-amber-600', hint: '委托他方生产后交付' },
  { value: 'transfer',         label: '调拨入库', color: 'text-emerald-600', hint: '从其他基地/仓库调入' },
  { value: 'manual',           label: '手动录入', color: 'text-slate-600', hint: '盘点/期初/其他' },
  { value: 'self_produced',    label: '自产（兜底）', color: 'text-orange-600', hint: '建议走"采收入库"页' },
];

const STOCK_TYPE_OPTIONS: Array<{ value: StockTypeLiteral; label: string }> = [
  { value: 'seed',     label: '种源' },
  { value: 'seedling', label: '种苗' },
  { value: 'product',  label: '成品' },
];

const UNIT_OPTIONS: Array<{ value: string; label: string }> = [
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

const QUALITY_GRADES: Array<{ value: string; label: string }> = [
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
  /** 源记录快照（行级入库场景携带；纯手动录入为 null） */
  sourceRecord?: InboundSourceRecord | null;
  /** 库存类型；不传则默认 product */
  stockType?: StockTypeLiteral;
}

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

/**
 * 字段渲染：根据 FieldConfig.type 派发到对应 UI 组件。
 * crop-selector 类型 T3 暂用 Input 文本框（T4 任务再升级 CropCodeSelector）。
 */
function renderFieldByType(
  field: FieldConfig,
  value: any,
  onChange: (v: any) => void,
  ctx: {
    warehouses: Array<{ id?: string; oid?: string; name: string }>;
    suppliers: Array<{ id: string; name: string }>;
    bases: Array<{ id?: string; oid?: string; name: string }>;
    formData: Record<string, any>;
  },
): React.ReactNode {
  switch (field.type) {
    case 'text':
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={deepInputClass}
        />
      );
    case 'number':
      return (
        <NumberInput
          value={value ?? 0}
          onChange={onChange}
          min={field.min || 0}
          className={deepInputClass}
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={deepInputClass}
        />
      );
    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            {ctx.warehouses.map((w) => (
              <SelectItem key={w.id || w.oid || ''} value={String(w.id || w.oid || '')}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'select-dict-unit':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="请选择单位" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'select-enum-quality':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="请选择品质等级" />
          </SelectTrigger>
          <SelectContent>
            {QUALITY_GRADES.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'supplier-select':
      // T3 简化版：使用 Select；T4 可升级为带搜索的下拉
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择供应商" />
          </SelectTrigger>
          <SelectContent>
            {ctx.suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'base-select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择基地" />
          </SelectTrigger>
          <SelectContent>
            {ctx.bases.map((b) => (
              <SelectItem key={b.id || b.oid || ''} value={String(b.id || b.oid || '')}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'crop-selector':
      // T3 暂用 Input 文本框（T4 升级 CropCodeSelector）
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="作物名称（T4 升级 CropCodeSelector）"
          className={deepInputClass}
        />
      );
    case 'textarea':
      return (
        <TextArea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={deepInputClass}
        />
      );
    case 'derived': {
      // totalAmount = quantity * unitPrice
      const qty = Number(ctx.formData.quantity || 0);
      const price = Number(ctx.formData.unitPrice || 0);
      const total = (qty * price).toFixed(2);
      return (
        <Input value={`¥ ${total}`} disabled className={`${deepInputClass} bg-gray-100 font-mono text-emerald-700`} />
      );
    }
    default:
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={deepInputClass}
        />
      );
  }
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sourceRecord = null,
  stockType: stockTypeProp,
}) => {
  // ---- Store 数据 ----
  const warehouses = useWarehouseStore((s) => s.warehouses);
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses);
  const supplierItems = useSupplierStore((s) => s.items);
  const loadSuppliers = useSupplierStore((s) => s.loadItems);
  const bases = useBaseStore((s) => s.bases);
  const loadBases = useBaseStore((s) => s.loadBases);
  const notifyChange = useInventoryStore((s) => s.notifyChange);
  const submitInbound = useInventoryInboundStore((s) => s.submitInbound);

  // ---- 表单状态（统一扁平 formData） ----
  // 初始来源：sourceRecord?.sourceType ?? 'self_produced'（默认自产兜底）
  const initialSourceType: SourceTypeLiteral =
    (sourceRecord?.sourceType as SourceTypeLiteral | undefined) ?? 'self_produced';
  const initialStockType: StockTypeLiteral = stockTypeProp ?? 'product';

  const [sourceType, setSourceType] = useState<SourceTypeLiteral>(initialSourceType);
  const [stockType, setStockType] = useState<StockTypeLiteral>(initialStockType);
  const [formData, setFormData] = useState<Record<string, any>>(() => buildInitialFormData(initialSourceType, sourceRecord));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  // 加载供应商 + 仓库 + 基地
  useEffect(() => {
    if (isOpen) {
      if (warehouses.length === 0) void loadWarehouses();
      if (supplierItems.length === 0) void loadSuppliers();
      if (bases.length === 0) void loadBases();
    }
  }, [isOpen]);

  // 弹窗打开时重置（保留 sourceRecord / stockType 上下文）
  useEffect(() => {
    if (isOpen) {
      const init = buildInitialFormData(initialSourceType, sourceRecord);
      setFormData(init);
      setSourceType(initialSourceType);
      setStockType(initialStockType);
      setErrors({});
      setTopError(null);
    }
  }, [isOpen]);

  const sourceInfo = SOURCE_OPTIONS.find((s) => s.value === sourceType);

  // ---- 切换来源：清空专属字段，避免残留 ----
  const handleSourceTypeChange = (newSource: SourceTypeLiteral) => {
    if (newSource === sourceType) return;
    setFormData((prev) => {
      const next = { ...prev };
      fieldsToResetOnSourceTypeChange().forEach((k) => {
        delete next[k];
      });
      return next;
    });
    setErrors({});
    setSourceType(newSource);
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // ---- 提交 ----
  const handleSubmit = async () => {
    setTopError(null);
    const vErrors = validateBySourceType(formData, sourceType);
    if (Object.keys(vErrors).length > 0) {
      setErrors(vErrors);
      setTopError(Object.values(vErrors)[0]);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      // T5 任务：操作人从 useAuthStore.currentUser 读取（realName 优先）；未登录兜底 'system'
      const currentUser = useAuthStore.getState().currentUser;
      const operator = buildOperatorInfo(currentUser);
      const payload = toPayload(formData, sourceType, sourceRecord, operator, { stockType });
      const result = await submitInbound(payload);
      if (result) {
        await showAlert('入库成功');
        notifyChange();
        onSuccess?.();
        onClose();
      }
    } catch (e) {
      setTopError(e instanceof Error ? e.message : '入库失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 当前来源下要渲染的字段列表 ----
  const fieldsToRender: FieldConfig[] = [...COMMON_FIELDS, ...FIELD_CONFIG[sourceType]];

  const renderCtx = {
    warehouses: warehouses as any,
    suppliers: supplierItems.map((s: any) => ({ id: String(s.id), name: s.name })),
    bases: bases as any,
    formData,
  };

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
          <div className="text-sm font-semibold text-gray-700 mb-2">
            入库来源 <span className="text-red-500">*</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSourceTypeChange(opt.value)}
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

        {/* 顶部错误 */}
        {topError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">{topError}</div>
          </div>
        )}

        {/* 库存类型 — 不在 COMMON_FIELDS 里（决定 stockType），单独渲染 */}
        <FormField label="库存类型 *">
          <Select value={stockType} onValueChange={(v) => setStockType(v as StockTypeLiteral)}>
            <SelectTrigger>
              <SelectValue placeholder="请选择库存类型" />
            </SelectTrigger>
            <SelectContent>
              {STOCK_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* 字段矩阵渲染：公共 + 来源专属 */}
        <div className="grid grid-cols-2 gap-4">
          {fieldsToRender.map((field) => {
            const value = formData[field.key];
            const errMsg = errors[field.key];
            return (
              <FormField
                key={field.key}
                label={`${field.label}${field.required ? ' *' : ''}`}
              >
                {renderFieldByType(field, value, (v) => handleFieldChange(field.key, v), renderCtx)}
                {errMsg && <div className="text-xs text-red-500 mt-1">{errMsg}</div>}
              </FormField>
            );
          })}
        </div>

        {/* 底部提示 */}
        {sourceInfo && sourceType !== 'self_produced' && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            <span className={`font-medium ${sourceInfo.color}`}>{sourceInfo.label}</span>：{sourceInfo.hint}
            ，无上游业务单据，系统将自动生成业务编号
          </div>
        )}
        {sourceType === 'self_produced' && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            自产来源建议走"采收入库"页（可关联批次/种植区域），本弹窗只用于"无批次"的兜底录入
          </div>
        )}
      </div>
    </Modal>
  );
};

/**
 * 构造初始 formData：包含公共字段默认值 + 来源专属字段空值。
 * 包含 sourceRecord 的 cropName/cropVariety/cropCode 单位等预填。
 */
function buildInitialFormData(
  sourceType: SourceTypeLiteral,
  sourceRecord: InboundSourceRecord | null,
): Record<string, any> {
  const data: Record<string, any> = {
    recordDate: todayLocal(),
    cropSelector: sourceRecord?.cropName ?? '',
    cropName: sourceRecord?.cropName ?? '',
    cropVariety: sourceRecord?.cropVariety ?? '',
    cropCode: sourceRecord?.cropCode ?? '',
    warehouseId: '',
    quantity: '',
    unit: sourceRecord?.unit ?? '公斤',
    qualityGrade: 'good',
    notes: '',
  };

  // 来源专属字段空值（确保切换后不残留）
  for (const field of FIELD_CONFIG[sourceType]) {
    if (data[field.key] === undefined) {
      data[field.key] = '';
    }
  }
  return data;
}
