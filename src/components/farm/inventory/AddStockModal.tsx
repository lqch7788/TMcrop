/**
 * 作物库存 - 新建入库弹窗
 * 用途：作物库存页"新建"按钮的真正实现
 * 支持来源：自产（兜底）/ 外购 / 赠送 / 委托生产 / 调拨 / 手动盘点
 *
 * 2026-07-08 重构（T3 任务）：从 24+ 硬编码字段改为 FIELD_CONFIG 声明式渲染
 * - 公共字段 + 来源专属字段均来自 AddStockModal.constants
 * - 校验统一走 validateBySourceType（声明式矩阵）
 * - 切换来源自动清空专属字段（fieldsToResetOnSourceTypeChange）
 *
 * 2026-07-08 T4 任务：crop-selector 字段升级为 CropCodeSelector 触发器
 * - 选中品种后 handleCropChange 中等联动填 5 字段（cropSelector/cropCode/cropId/cropName/cropVariety）
 * - 中等联动：仅当 qualityGrade 未填时填默认 'qualified'
 * - 操作人 T3 暂硬编码 'system'（T5 接 useAuthStore，已在 65a1e6d9 完成）
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TextArea, NumberInput } from '@/components/ui';
import { Package, AlertCircle } from 'lucide-react';
import {
  useWarehouseStore,
  useSupplierStore,
  useBaseStore,
  useInventoryStore,
  useInventoryInboundStore,
} from '../../../stores';
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore';
import type {
  SourceType as SourceTypeLiteral,
  StockType as StockTypeLiteral,
  InboundSourceRecord,
} from '../../../types/inventoryInbound';
import type { CropVariety } from '../../../types/cropVariety';
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
import CropCodeSelector from '../common/CropCodeSelector';
// 2026-07-13 v6：补录原因复合组件（下拉 + "其他"时自定义文本框）
import { SupplementaryReasonInput } from './SupplementaryReasonInput';

// 业务推荐：用户主要诉求是"非采收/非采购"的其他入库途径
// 顺序按"使用频率"排列：外购 > 赠送 > 委托 > 调拨 > 手动 > 补录入库
// 2026-07-13 方案 D：自产（兜底）→ 补录入库（语义统一：选它=进入补录模式，sourceId+supplementaryReason 必填）
const SOURCE_OPTIONS: Array<{ value: SourceTypeLiteral; label: string; color: string; hint: string }> = [
  { value: 'external_purchased', label: '外购入库', color: 'text-blue-600', hint: '从外部市场采购入库' },
  { value: 'gift',             label: '赠送/受赠', color: 'text-purple-600', hint: '他人或单位赠送的作物' },
  { value: 'commissioned',     label: '委托生产', color: 'text-amber-600', hint: '委托他方生产后交付' },
  { value: 'transfer',         label: '调拨入库', color: 'text-emerald-600', hint: '从其他基地/仓库调入' },
  { value: 'manual',           label: '手动录入', color: 'text-slate-600', hint: '盘点/期初/其他' },
  { value: 'self_produced',    label: '补录入库', color: 'text-orange-600', hint: '为种植/育苗/种源行做补录入库' },
];

const STOCK_TYPE_OPTIONS: Array<{ value: StockTypeLiteral; label: string }> = [
  { value: 'seed',     label: '种源' },
  { value: 'seedling', label: '种苗' },
  { value: 'product',  label: '成品' },
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
  // 2026-07-13 方案 D：删除 supplementaryMode prop
  // 补录入口统一在弹窗内"补录入库"来源按钮（6 来源里的 self_produced 选项）
}

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

/**
 * 字段渲染：根据 FieldConfig.type 派发到对应 UI 组件。
 * crop-selector 类型在 T4 升级为 CropCodeSelector 触发器，由 ctx.onCropChange 处理联动。
 *
 * 2026-07-08 T13：
 * - select-dict-unit 不再用硬编码 UNIT_OPTIONS，改用 ctx.unitOptions（字典加载）
 * - 新增 select-dict-crop-form 分支（ctx.cropFormOptions 字典加载）
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
    onCropChange: (code: string, variety: CropVariety | null) => void;
    unitOptions: Array<{ value: string; label: string }>;
    cropFormOptions: Array<{ value: string; label: string }>;
    // 2026-07-09 v5 阶段三（路径 B）：源 ID 下拉选项（自产兜底模式）
    sourceIdOptions?: Array<{ value: string; label: string; module: string; code?: string; cropName?: string; cropCode?: string }>;
    // 2026-07-13 方案 B：sourceId 搜索框输入值 + 变化回调
    sourceIdSearch?: string;
    onSourceIdSearchChange?: (v: string) => void;
    /**
     * 2026-07-09：联动写入多个字段（解决供应商/基地只存 id 不存 name 的 bug）
     * supplier-select 选完后同时写 supplierId + supplierName
     * base-select 选完后同时写 baseId + baseName
     */
    onMultiFieldChange?: (updates: Record<string, any>) => void;
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
      // 2026-07-09：入库仓库/调拨源仓库通用 select — 联动写 warehouseName（修复详情弹窗仓库名为空）
      return (
        <Select value={value || ''} onValueChange={(v) => {
          onChange(v)
          const found = ctx.warehouses.find(w => String(w.id || w.oid || '') === v)
          if (found && ctx.onMultiFieldChange) {
            const updateKey = field.key === 'warehouseId' ? 'warehouseName' : 'sourceWarehouseName'
            ctx.onMultiFieldChange({ [updateKey]: found.name })
          }
        }}>
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
      // 2026-07-08 T13：从 ctx.unitOptions（字典加载，12 项）渲染
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="请选择单位" />
          </SelectTrigger>
          <SelectContent>
            {ctx.unitOptions.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'select-dict-crop-form':
      // 2026-07-08 T13：作物形态下拉（从 ctx.cropFormOptions 字典加载，6 项）
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="请选择作物形态" />
          </SelectTrigger>
          <SelectContent>
            {ctx.cropFormOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'select-warehouse-name':
      // 2026-07-09：调出仓库下拉（与入库仓库同样 UI；value=name，适配后端 sourceWarehouseName 存仓库名）
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择调出仓库" />
          </SelectTrigger>
          <SelectContent>
            {ctx.warehouses.map((w) => (
              <SelectItem key={w.id || w.oid || ''} value={w.name}>
                {w.name}
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
    case 'supplementary-reason':
      // 2026-07-13 v6：补录原因下拉 + 自定义复合组件
      return (
        <SupplementaryReasonInput
          value={String(value || '')}
          onChange={(v) => onChange(v)}
        />
      );
    case 'select-source-id':
      // 2026-07-13 方案 D：sourceId 搜索框 + 下拉菜单同一行（各占一半）
      // 三类源记录（种源/育苗/种植）合并到一个下拉，按 label/code/cropName 模糊搜索
      // 选中后自动联动：sourceId + sourceModule + sourceCode + cropCode + cropName + cropSelector + greenhouseName
      // （cropSelector 联动让"作物选择"字段显示已选；greenhouseName 从源记录读，自动填到"采收区域"字段）
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={ctx.sourceIdSearch || ''}
            onChange={(e) => ctx.onSourceIdSearchChange?.(e.target.value)}
            placeholder="搜索源记录..."
            className="px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
          <Select value={value || ''} onValueChange={(v) => {
            onChange(v);
            if (ctx.onMultiFieldChange) {
              const found = ctx.sourceIdOptions?.find((o: any) => o.value === v);
              if (found) {
                // 2026-07-13 v9：从源记录读采收区域（greenhouseName）
                const src = found.raw;
                const greenhouseName = src?.greenhouseName || '';
                ctx.onMultiFieldChange({
                  sourceId: v,
                  sourceModule: found.module,
                  sourceCode: found.code,
                  cropName: found.cropName,
                  cropCode: found.cropCode,
                  cropSelector: found.cropCode,  // 联动"作物选择"字段显示已选
                  greenhouseName,  // 联动"采收区域"字段
                });
              }
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder={
                ctx.sourceIdOptions && ctx.sourceIdOptions.length > 0
                  ? '选择源行'
                  : '加载中...'
              } />
            </SelectTrigger>
            <SelectContent>
              {(ctx.sourceIdOptions || []).map((o: any) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
              {ctx.sourceIdOptions && ctx.sourceIdOptions.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">无数据，请稍候</div>
              )}
            </SelectContent>
          </Select>
        </div>
      );
    case 'supplier-select':
      // T3 简化版：使用 Select；T4 可升级为带搜索的下拉
      // 2026-07-09：选完同时写 supplierId + supplierName（修复详情弹窗供应商字段为空）
      return (
        <Select value={value || ''} onValueChange={(v) => {
          onChange(v)
          const found = ctx.suppliers.find(s => s.id === v)
          if (found && ctx.onMultiFieldChange) {
            ctx.onMultiFieldChange({ supplierId: v, supplierName: found.name })
          }
        }}>
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
      // 2026-07-09：选完同时写 baseId + baseName（修复详情弹窗所属基地字段为空）
      return (
        <Select value={value || ''} onValueChange={(v) => {
          onChange(v)
          const found = ctx.bases.find(b => String(b.id || b.oid || '') === v)
          if (found && ctx.onMultiFieldChange) {
            ctx.onMultiFieldChange({ baseId: v, baseName: found.name })
          }
        }}>
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
      // T4 升级：从 Input 文本框升级为 CropCodeSelector 触发器
      // 选中后通过 onCropChange 触发 4 字段中等联动（cropCode/cropId/cropName/cropVariety）
      return (
        <CropCodeSelector
          value={String(value || '')}
          onChange={ctx.onCropChange}
          placeholder="搜索或选择作物品种..."
          showFullPath
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

  // 2026-07-08 T13：单位 + 作物形态从字典加载（不再硬编码 9 个 UNIT_OPTIONS）
  const loadDictionaries = useDictionaryStore((s) => s.loadDictionaries);
  const dictionaryCount = useDictionaryStore((s) => s.dictionaries.length);
  const [unitOptions, setUnitOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [cropFormOptions, setCropFormOptions] = useState<Array<{ value: string; label: string }>>([]);
  // 2026-07-09 v5 阶段三（路径 B）：自产（兜底）模式 sourceId 下拉选项
  const [sourceIdOptions, setSourceIdOptions] = useState<Array<{ value: string; label: string; module: string; code?: string; cropName?: string; cropCode?: string }>>([]);
  // 2026-07-13 方案 B：sourceId 搜索框输入
  const [sourceIdSearch, setSourceIdSearch] = useState('');
  // 搜索过滤后的 options（按 label/code/cropName 模糊匹配）
  const filteredSourceIdOptions = useMemo(() => {
    if (!sourceIdSearch) return sourceIdOptions;
    const lower = sourceIdSearch.toLowerCase();
    return sourceIdOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(lower) ||
        (o.code || '').toLowerCase().includes(lower) ||
        (o.cropName || '').toLowerCase().includes(lower),
    );
  }, [sourceIdOptions, sourceIdSearch]);

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
  // 2026-07-08 T13：同步加载单位 + 作物形态字典
  useEffect(() => {
    if (isOpen) {
      if (warehouses.length === 0) void loadWarehouses();
      if (supplierItems.length === 0) void loadSuppliers();
      if (bases.length === 0) void loadBases();
      // 字典可能跨页面共享，未加载则触发加载
      if (dictionaryCount === 0) void loadDictionaries();
    }
  }, [isOpen]);

  // 2026-07-13 v6：sourceId 按 stockType 动态加载（种源/育苗/种植 三选一）
  // 历史版本 v5 同时拉种植+育苗两个列表 — 现改为按 prefillStockType 选 endpoint
  // 2026-07-13 方案 B：弹窗 open 时无条件并行加载 三类源记录（合并到一个下拉）
  // 依赖 only isOpen — 弹窗关闭重新打开会重新加载（用户场景罕见，正常不会重复开）
  useEffect(() => {
    if (!isOpen) return;
    if (sourceIdOptions.length > 0) return;
    (async () => {
      try {
        const { enhancedApiClient } = await import('@/lib/apiClient');
        const query = new URLSearchParams({ page: '1', pageSize: '200' }).toString();
        // 2026-07-13 v7：补录只针对已结束的育苗/种植行（种源不能采收，不入补录范围）
        // 前端过滤 status==='ended' || status==='cancelled'（行级流程已关闭）
        const [seedlingRes, plantingRes] = await Promise.all([
          enhancedApiClient.get<any[]>(`/seedlings?${query}`),
          enhancedApiClient.get<any[]>(`/plantings?${query}`),
        ]);
        // enhancedApiClient 已自动解包 result.data（per memory api-client-response-unwrapping）
        const extractItems = (res: any): any[] =>
          Array.isArray(res) ? res : ((res as any)?.data?.items || (res as any)?.data || []);

        // 过滤：只保留已结束的（行级流程已关闭）
        // - 种植：status in ['ended', 'cancelled']
        // - 育苗：status in ['completed', 'transplanted']（育苗表枚举与种植不同）
        // - 种源：已从加载列表移除（种源不能采收）
        const isEnded = (it: any, module: string) =>
          module === 'seedling'
            ? (it.status === 'completed' || it.status === 'transplanted')
            : (it.status === 'ended' || it.status === 'cancelled');

        const options: typeof sourceIdOptions = [];

        // 育苗（字段：seedlingCode）
        for (const it of extractItems(seedlingRes).filter((it) => isEnded(it, 'seedling'))) {
          options.push({
            value: String(it.id),
            label: `[育苗] ${it.seedlingCode || it.code || it.id} - ${it.cropName || ''}`,
            module: 'seedling',
            code: it.seedlingCode || it.code,
            cropName: it.cropName,
            cropCode: it.cropCode,
            // 2026-07-13 v8：保存完整源记录供 select 时联动读 propagationMode/greenhouseName
            raw: it,
          });
        }
        // 种植（字段：plantCode）
        for (const it of extractItems(plantingRes).filter((it) => isEnded(it, 'planting'))) {
          options.push({
            value: String(it.id),
            label: `[种植] ${it.plantCode || it.code || it.id} - ${it.cropName || ''}`,
            module: 'planting',
            code: it.plantCode || it.code,
            cropName: it.cropName,
            cropCode: it.cropCode,
            raw: it,
          });
        }
        setSourceIdOptions(options);
      } catch (e) {
        console.warn('[AddStockModal] 加载 sourceId 列表失败:', e);
      }
    })();
  }, [isOpen])

  // 字典加载完成后切出 unit / crop_form 两类选项
  useEffect(() => {
    if (dictionaryCount === 0) return;
    const unit = getDictItems('unit').map((d) => ({
      value: d.dictValue || d.dictCode,
      label: d.dictLabel || d.dictValue || d.dictCode,
    }));
    const cropForm = getDictItems('crop_form').map((d) => ({
      value: d.dictValue || d.dictCode,
      label: d.dictLabel || d.dictValue || d.dictCode,
    }));
    setUnitOptions(unit);
    setCropFormOptions(cropForm);
  }, [dictionaryCount]);

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

  // 2026-07-13 方案 D：补录入口统一在 6 来源里的"补录入库"按钮（value=self_produced）
  // 用户点"补录入库"按钮即进入补录模式（sourceType=self_produced）
  // 无需内部 supplementaryMode state、banner、强制 useEffect
  // 校验：validateBySourceType 已保证 self_produced + sourceId 有值时 supplementaryReason 必填

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

  // ---- 作物选择 CropCodeSelector 选中后的中等联动 ----
  // 选中品种 → 一次性填 5 字段（cropSelector/cropCode/cropId/cropName/cropVariety），
  // 选清空 → 删除这 5 字段。
  // 说明：cropSelector 字段 key 在 COMMON_FIELDS 中是 '作物选择' 字段的 key，承载 cropCode 值
  //       （命名沿用历史 — T4 让 CropCodeSelector 直接读写 cropSelector 即可）。
  // 中等联动：仅当 qualityGrade 未填时填默认 'qualified'（覆盖 buildInitialFormData 默认 'good'）。
  // 注：CropVariety 类型暂无 unit 字段，预留扩展点（(variety as any).unit 读取）。
  const handleCropChange = useCallback(
    (code: string, variety: CropVariety | null) => {
      setFormData((prev) => {
        if (!variety) {
          const next = { ...prev };
          ['cropSelector', 'cropCode', 'cropId', 'cropName', 'cropVariety'].forEach((k) => {
            delete next[k];
          });
          return next;
        }
        const next = { ...prev };
        next.cropSelector = code; // 选中后回写到 cropSelector 字段（与 COMMON_FIELDS 对齐）
        next.cropCode = code;
        next.cropId = variety.id;
        next.cropName = variety.subVariety1Name || variety.varietyName;
        next.cropVariety =
          variety.detailVarietyName || variety.subVariety1Name || variety.varietyName;
        // 中等联动：仅当 qualityGrade 未填时填默认 'qualified'
        if (!prev.qualityGrade) {
          next.qualityGrade = 'qualified';
        }
        return next;
      });
      // 清空 cropSelector 相关字段的错误提示
      setErrors((prev) => {
        if (!prev.cropSelector && !prev.cropCode) return prev;
        const next = { ...prev };
        delete next.cropSelector;
        delete next.cropCode;
        return next;
      });
    },
    [],
  );

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
    onCropChange: handleCropChange,
    // 2026-07-08 T13：把字典选项注入到 renderFieldByType 上下文
    unitOptions,
    cropFormOptions,
    // 2026-07-09：supplier-select / base-select 联动写入多个字段（修复详情弹窗供应商/基地名为空）
    onMultiFieldChange: (updates: Record<string, any>) => {
      setFormData((prev) => ({ ...prev, ...updates }))
    },
    // 2026-07-09 v5 阶段三（路径 B）：源 ID 下拉选项（动态加载种植/育苗列表）
    // 2026-07-13 方案 B：使用过滤后的 options + 搜索状态
    sourceIdOptions: filteredSourceIdOptions,
    sourceIdSearch: sourceIdSearch,
    onSourceIdSearchChange: setSourceIdSearch,
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
        {/* 2026-07-13：删除紫色 + 黄色"补录模式"banner（用户要求简化 UI）
            校验逻辑保留：validateBySourceType 仍校验 self_produced + sourceId 有值时 supplementaryReason 必填 */}
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

        {/* 第 1 行：库存类型 + 入库时间（grid-cols-2 同行） */}
        {/* 库存类型 — 不在 COMMON_FIELDS 里（决定 stockType），单独渲染 */}
        <div className="grid grid-cols-2 gap-4">
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
          <FormField label="入库日期 *">
            <Input
              type="date"
              value={formData.recordDate || ''}
              onChange={(e) => handleFieldChange('recordDate', e.target.value)}
              className={deepInputClass}
            />
            {errors.recordDate && <div className="text-xs text-red-500 mt-1">{errors.recordDate}</div>}
          </FormField>
        </div>

        {/* 2026-07-13 方案 D：补录模式（self_produced）下，源行选择放在作物选择前面
            选完源行后自动联动填作物字段，作物选择自动显示已选状态无需用户操作 */}
        {sourceType === 'self_produced' && (
          <FormField label="源种植/育苗行 *">
            {renderFieldByType(
              FIELD_CONFIG.self_produced.find(f => f.key === 'sourceId')!,
              formData.sourceId,
              (v) => handleFieldChange('sourceId', v),
              renderCtx,
            )}
            {errors.sourceId && <div className="text-xs text-red-500 mt-1">{errors.sourceId}</div>}
          </FormField>
        )}

        {/* 第 2 行：作物选择(50%) + 作物形态+品质等级(50% 合成块) */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="作物选择 *">
            <CropCodeSelector
              value={String(formData.cropSelector || '')}
              onChange={handleCropChange}
              placeholder="搜索或选择作物品种..."
              showFullPath
            />
            {errors.cropSelector && <div className="text-xs text-red-500 mt-1">{errors.cropSelector}</div>}
          </FormField>
          {/* 作物形态 + 品质等级（占 50%，内部 flex-1 形态 + 140px 品质等级） */}
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <FormField label="作物形态 *">
                <Select
                  value={formData.cropForm || ''}
                  onValueChange={(v) => handleFieldChange('cropForm', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择作物形态" />
                  </SelectTrigger>
                  <SelectContent>
                    {cropFormOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cropForm && <div className="text-xs text-red-500 mt-1">{errors.cropForm}</div>}
              </FormField>
            </div>
            <div className="w-[140px] flex-shrink-0">
              <FormField label="品质等级">
                <Select
                  value={formData.qualityGrade || ''}
                  onValueChange={(v) => handleFieldChange('qualityGrade', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="等级" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_GRADES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.qualityGrade && <div className="text-xs text-red-500 mt-1">{errors.qualityGrade}</div>}
              </FormField>
            </div>
          </div>
        </div>

        {/* 2026-07-13 v9：补录模式（self_produced）下，"采收区域"与"数量+单位"同一行（grid-cols-2 各占 50%）
            选源行后"采收区域"自动联动填（从源记录读 greenhouseName）
            2026-07-13 v9 简化：删除"种植模式"字段（种植表 DB 未存 plantingMode，无数据可填） */}
        {sourceType === 'self_produced' && (
          <div className="grid grid-cols-2 gap-4">
            {/* 左半 50%：采收区域 */}
            <FormField label="采收区域">
              <Input
                value={String(formData.greenhouseName || '')}
                onChange={(e) => handleFieldChange('greenhouseName', e.target.value)}
                placeholder="选源行后自动填"
                className="px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner"
              />
            </FormField>
            {/* 右半 50%：数量 + 单位（flex-1 + 120px） */}
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <FormField label="数量 *">
                  <NumberInput
                    value={formData.quantity ?? 0}
                    onChange={(v) => handleFieldChange('quantity', v)}
                    min={0.01}
                    className={deepInputClass}
                  />
                  {errors.quantity && <div className="text-xs text-red-500 mt-1">{errors.quantity}</div>}
                </FormField>
              </div>
              <div className="w-[120px] flex-shrink-0">
                <FormField label="单位 *">
                  <Select
                    value={formData.unit || ''}
                    onValueChange={(v) => handleFieldChange('unit', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unit && <div className="text-xs text-red-500 mt-1">{errors.unit}</div>}
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* 字段矩阵渲染：公共 + 来源专属（排除已单独渲染的 recordDate + cropSelector + cropForm + quantity + unit + notes） */}
        <div className="grid grid-cols-2 gap-4">
          {fieldsToRender
            .filter((field) => field.key !== 'recordDate' && field.key !== 'cropSelector' && field.key !== 'cropForm' && field.key !== 'quantity' && field.key !== 'unit' && field.key !== 'notes' && field.key !== 'qualityGrade' && field.key !== 'unitPrice' && field.key !== 'totalAmount' && field.key !== 'purchaseDate' && field.key !== 'sourceId' && field.key !== 'plantingMode' && field.key !== 'greenhouseName')  // 2026-07-13 v9：sourceId/greenhouseName 补录模式下独立渲染（plantingMode 已删除但保留在 filter 中以防误判）
            .map((field) => {
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

        {/* 数量+单位 + 单价+总金额（仅外购显示单价+总金额）
            2026-07-13 v9：补录模式（self_produced）下数量+单位已在上方"采收区域"行渲染，这里跳过
            其他来源：数量+单位 50% + 单价+总金额 50% 同行 */}
        {sourceType !== 'self_produced' && (
          <div className="grid grid-cols-2 gap-4">
            {/* 左半：数量 + 单位（flex-1 + 120px） */}
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <FormField label="数量 *">
                  <NumberInput
                    value={formData.quantity ?? 0}
                    onChange={(v) => handleFieldChange('quantity', v)}
                    min={0.01}
                    className={deepInputClass}
                  />
                  {errors.quantity && <div className="text-xs text-red-500 mt-1">{errors.quantity}</div>}
                </FormField>
              </div>
              <div className="w-[120px] flex-shrink-0">
                <FormField label="单位 *">
                  <Select
                    value={formData.unit || ''}
                    onValueChange={(v) => handleFieldChange('unit', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unit && <div className="text-xs text-red-500 mt-1">{errors.unit}</div>}
                </FormField>
              </div>
            </div>
            {/* 右半：单价 + 总金额（仅外购入库显示，flex-1 + 140px） */}
            {sourceType === 'external_purchased' && (
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <FormField label="单价（元）">
                    <NumberInput
                      value={formData.unitPrice ?? 0}
                      onChange={(v) => handleFieldChange('unitPrice', v)}
                      min={0}
                      className={deepInputClass}
                    />
                    {errors.unitPrice && <div className="text-xs text-red-500 mt-1">{errors.unitPrice}</div>}
                  </FormField>
                </div>
                <div className="w-[140px] flex-shrink-0">
                  <FormField label="总金额">
                    <Input
                      value={`¥ ${(Number(formData.quantity || 0) * Number(formData.unitPrice || 0)).toFixed(2)}`}
                      disabled
                      className={`${deepInputClass} bg-gray-100 font-mono text-emerald-700`}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 采购日期（仅外购入库显示，位于数量行下方，占 50% 宽度） */}
        {sourceType === 'external_purchased' && (
          <div className="w-1/2">
            <FormField label="采购日期">
              <Input
                type="date"
                value={formData.purchaseDate || ''}
                onChange={(e) => handleFieldChange('purchaseDate', e.target.value)}
                className={deepInputClass}
              />
              {errors.purchaseDate && <div className="text-xs text-red-500 mt-1">{errors.purchaseDate}</div>}
            </FormField>
          </div>
        )}

        {/* 备注 — 弹窗最后单独一行（col-span-2 整行） */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField label="备注">
              <TextArea
                value={formData.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="如入库批次说明、特殊情况备注等"
                className={deepInputClass}
                rows={3}
              />
              {errors.notes && <div className="text-xs text-red-500 mt-1">{errors.notes}</div>}
            </FormField>
          </div>
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
 *
 * cropSelector 字段 key 在 T4 升级为 CropCodeSelector 后承载 cropCode 值
 * （命名沿用历史，但语义现在是"选中的作物编码"）。
 */
function buildInitialFormData(
  sourceType: SourceTypeLiteral,
  sourceRecord: InboundSourceRecord | null,
): Record<string, any> {
  const data: Record<string, any> = {
    recordDate: todayLocal(),
    cropSelector: sourceRecord?.cropCode ?? sourceRecord?.cropName ?? '',
    cropName: sourceRecord?.cropName ?? '',
    cropVariety: sourceRecord?.cropVariety ?? '',
    cropCode: sourceRecord?.cropCode ?? '',
    cropId: '',
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
