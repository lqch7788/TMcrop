/**
 * 药剂详情查看弹窗组件（V2 扁平化 2026-07-12）
 * 只读视图，以网格形式展示全部字段
 * 对齐 FertlizerDetailModal 扁平模式
 */
import React from 'react';
import { X } from 'lucide-react';

import { UnifiedModal, Button } from '@/components/ui';
import { PesticideSpec } from '@/stores';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';

interface PesticideDetailModalProps {
  isOpen: boolean;
  record: PesticideSpec;
  onClose: () => void;
}

/**
 * 药剂类型多值 chips 渲染（树形剪枝）
 * 2026-07-12：兼容 JSON 字符串输入
 */
function normalizeTypes(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

function renderPesticideTypeChips(types: string[] | undefined) {
  const typeArray = normalizeTypes(types);
  if (typeArray.length === 0) {
    return <span className="text-gray-400">-</span>;
  }
  const dictionaries = useDictionaryStore.getState().dictionaries;
  // 树形剪枝
  const topLevelCodes = new Set<string>();
  const childrenByParent = new Map<string, Set<string>>();
  for (const d of dictionaries) {
    const cat = d.categoryCode || d.category_code || d.category;
    if (cat !== 'pesticide_type') continue;
    const code = d.dictCode || d.dict_code;
    const parentId = d.parentId || d.parent_id;
    if (!parentId) {
      topLevelCodes.add(code);
    } else {
      const parent = dictionaries.find((x: any) => x.id === parentId);
      if (parent) {
        const parentCode = parent.dictCode || parent.dict_code;
        if (!childrenByParent.has(parentCode)) childrenByParent.set(parentCode, new Set());
        childrenByParent.get(parentCode)!.add(code);
      }
    }
  }
  const filtered = typeArray.filter(t => {
    if (topLevelCodes.has(t)) {
      const children = childrenByParent.get(t);
      if (children) {
        for (const c of children) {
          if (typeArray.includes(c)) return false;
        }
      }
    }
    return true;
  });
  return (
    <div className="flex flex-wrap gap-1">
      {filtered.map(t => (
        <span
          key={t}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
        >
          {getDictLabel('pesticide_type', t) || t}
        </span>
      ))}
    </div>
  );
}

/** 库存颜色 */
function getStockColor(stock: number) {
  if (stock === 0) return 'text-red-600 font-semibold';
  if (stock < 50) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
}

/** 单个字段展示格子 — 统一浅灰色线框 */
function FieldCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-gray-300 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

export function PesticideDetailModal({ isOpen, record, onClose }: PesticideDetailModalProps) {
  // 触发字典 store 加载
  useDictionaryStore((s) => s.dictionaries);
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="药剂详情"
      size="lg"
      showFooter={false}
    >
      {/* 编号头部 — 单行展示：编码 + 名称 + 类型 chips */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap text-white">
          <span className="text-sm font-mono font-bold">{record.pesticideCode || '-'}</span>
          <span className="text-white/50 text-lg">|</span>
          <span className="text-base font-bold">{record.pesticideName || '-'}</span>
          {normalizeTypes(record.pesticideTypes).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {normalizeTypes(record.pesticideTypes).map(t => (
                <span
                  key={t}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30"
                >
                  {getDictLabel('pesticide_type', t) || t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-5">
        {/* 基础信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 基础信息</h4>
          <div className="grid grid-cols-4 gap-3">
            <FieldCell label="编码" value={<span className="font-mono">{record.pesticideCode || '-'}</span>} />
            <FieldCell label="名称" value={<span className="font-bold">{record.pesticideName || '-'}</span>} />
            <FieldCell label="药剂类型" value={renderPesticideTypeChips(record.pesticideTypes)} />
            <FieldCell label="药剂成分" value={record.ingredient || '-'} />
            <FieldCell label="作用机制" value={record.mechanism || '-'} />
            <FieldCell label="防治对象" value={record.targetPests || '-'} />
          </div>
        </div>

        {/* 规格信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">🧪 规格信息</h4>
          <div className="grid grid-cols-4 gap-3">
            <FieldCell label="含量" value={<span className="font-mono">{record.specContent || '-'}</span>} />
            <FieldCell label="剂型" value={record.formulation || '-'} />
            <FieldCell label="品牌" value={record.brandName || '-'} />
            <FieldCell label="生产厂家" value={record.manufacturer || '-'} />
            <FieldCell label="建议用量" value={<span className="font-mono">{record.suggestedDosage || '-'}</span>} />
            <FieldCell label="单位" value={record.dosageUnit || '-'} />
            <FieldCell label="稀释比例" value={<span className="font-mono">{record.suggestedRatio || '-'}</span>} />
          </div>
        </div>

        {/* 库存与供应链 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📦 库存与供应链</h4>
          <div className="grid grid-cols-4 gap-3">
            <FieldCell
              label="库存量"
              value={<span className={`font-mono ${getStockColor(record.stockQuantity ?? 0)}`}>{(record.stockQuantity ?? 0).toFixed(2)}</span>}
            />
            <FieldCell label="库存单位" value={record.stockUnit || '-'} />
            <FieldCell
              label="单价"
              value={record.unitPrice != null && record.unitPrice > 0 ? <span className="font-mono">{Number(record.unitPrice).toFixed(2)}</span> : '-'}
            />
            <FieldCell label="包装规格" value={record.packageSpec || '-'} />
            <FieldCell label="产品批次" value={<span className="font-mono">{record.batchNumber || '-'}</span>} />
            <FieldCell label="生产日期" value={record.productionDate || '-'} />
            <FieldCell label="过期日期" value={record.expirationDate || '-'} />
          </div>
        </div>

        {/* 功能与禁忌 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📝 功能与禁忌</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-300 rounded-lg p-3 col-span-2">
              <div className="text-xs text-gray-500 mb-0.5">功能说明</div>
              <div className="text-sm text-gray-900 min-h-[40px]">{record.functionDesc || '-'}</div>
            </div>
            <div className="border border-gray-300 rounded-lg p-3 col-span-2">
              <div className="text-xs text-gray-500 mb-0.5">使用禁忌</div>
              <div className="text-sm text-gray-900 min-h-[40px]">{record.tabooDesc || '-'}</div>
            </div>
          </div>
        </div>

        {/* 备注 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">💬 备注</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-300 rounded-lg p-3 col-span-2">
              <div className="text-xs text-gray-500 mb-0.5">备注</div>
              <div className="text-sm text-gray-900 min-h-[40px]">{record.remark || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部关闭按钮 */}
      <div className="mt-6 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}
