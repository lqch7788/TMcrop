/**
 * 作物库存 - 新建入库弹窗
 * 用途：作物库存页"新建"按钮的真正实现
 * 支持来源：自产（兜底）/ 外购 / 赠送 / 委托生产 / 调拨 / 手动盘点
 * 业务单据：自建库存无上游单据，businessId 用 UUID
 */

import React, { useEffect, useState } from 'react';
import { Modal, FormField } from '@/components/ui';
import { Input, Select } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Package, AlertCircle } from 'lucide-react';
import { useWarehouseStore, getActiveWarehouses } from '../../../stores';
import { useInventoryStore } from '../../../stores';
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

export const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const warehouses = useWarehouseStore((s) => s.warehouses);
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses);
  const notifyChange = useInventoryStore((s) => s.notifyChange);

  // 表单状态
  const [sourceType, setSourceType] = useState<SourceType>(SourceType.EXTERNAL_PURCHASED);
  const [stockType, setStockType] = useState<StockType>(StockType.PRODUCT);
  const [cropName, setCropName] = useState('');
  const [variety, setVariety] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState('公斤');
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierOrGiver, setSupplierOrGiver] = useState(''); // 供应商/赠送人/调出方
  const [inboundDate, setInboundDate] = useState(new Date().toISOString().slice(0, 10));
  const [grade, setGrade] = useState('good');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载仓库列表
  useEffect(() => {
    if (isOpen && warehouses.length === 0) {
      loadWarehouses();
    }
  }, [isOpen, warehouses.length, loadWarehouses]);

  // 弹窗打开时重置
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSourceType(SourceType.EXTERNAL_PURCHASED);
      setStockType(StockType.PRODUCT);
      setCropName('');
      setVariety('');
      setQuantity('');
      setUnit('公斤');
      setWarehouseId('');
      setSupplierOrGiver('');
      setInboundDate(new Date().toISOString().slice(0, 10));
      setGrade('good');
      setRemarks('');
    }
  }, [isOpen]);

  const activeWarehouses = getActiveWarehouses();

  // 校验
  const validate = (): string | null => {
    if (!cropName.trim()) return '请输入作物名称';
    const qty = Number(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) return '请输入有效数量（>0）';
    if (!unit.trim()) return '请输入单位';
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
          cropId: '',
          cropName: cropName.trim(),
          varietyName: variety.trim() || undefined,
          quantity: qty,
          unit: unit.trim(),
          sourceType,
          supplierName: supplierOrGiver.trim() || undefined,
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
          auditor: supplierOrGiver.trim() || undefined,
          greenhouseName: undefined,
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
            <Select
              value={stockType}
              onChange={(e) => setStockType(e.target.value as StockType)}
              options={STOCK_TYPE_OPTIONS}
            />
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
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={UNIT_OPTIONS}
            />
          </FormField>
        </div>

        {/* 仓库 + 品质 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="入库仓库 *">
            <Select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={[
                { value: '', label: '请选择仓库' },
                ...activeWarehouses.map(w => ({
                  value: (w as any).oid || (w as any).id,
                  label: `${(w as any).name}（${(w as any).warehouseType || (w as any).type || ''}）`,
                })),
              ]}
            />
          </FormField>
          <FormField label="品质等级">
            <Select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              options={GRADE_OPTIONS}
            />
          </FormField>
        </div>

        {/* 来源方 */}
        <FormField label={
          sourceType === SourceType.EXTERNAL_PURCHASED ? '供应商' :
          sourceType === SourceType.GIFT ? '赠送人/单位' :
          sourceType === SourceType.COMMISSIONED ? '受托方' :
          sourceType === SourceType.TRANSFER ? '调出方' :
          '来源说明'
        }>
          <Input
            value={supplierOrGiver}
            onChange={(e) => setSupplierOrGiver(e.target.value)}
            placeholder={
              sourceType === SourceType.EXTERNAL_PURCHASED ? '例如：寿光种子公司' :
              sourceType === SourceType.GIFT ? '例如：合作单位赠送' :
              sourceType === SourceType.COMMISSIONED ? '例如：代加工方' :
              sourceType === SourceType.TRANSFER ? '例如：A 基地' :
              '可选'
            }
          />
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
