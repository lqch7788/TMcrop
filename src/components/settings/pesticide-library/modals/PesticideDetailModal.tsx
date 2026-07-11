/**
 * 药剂详情查看弹窗组件
 * 只读视图，以网格形式展示所有字段
 * 2026-07-10：取消防治类型分类，药剂类型改为多值数组展示
 */
import React from 'react';
import { X } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { PesticideLibrary } from '@/stores';
// 2026-07-10：用 store 内置 getDictLabel 转中文（多值）
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';

interface PesticideDetailModalProps {
  isOpen: boolean;
  record: PesticideLibrary;
  onClose: () => void;
}

/**
 * 2026-07-10：药剂类型多值 chips 渲染（树形剪枝）
 */
function renderPesticideTypeChips(types: string[] | undefined, dictionaries: any[]) {
  if (!types || types.length === 0) {
    return <span className="text-gray-400">-</span>;
  }
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
  const filtered = types.filter(t => {
    if (topLevelCodes.has(t)) {
      const children = childrenByParent.get(t);
      if (children) {
        for (const c of children) {
          if (types.includes(c)) return false;
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

export function PesticideDetailModal({ isOpen, record, onClose }: PesticideDetailModalProps) {
  // 2026-07-10：触发字典 store 加载（取 dictionaries 给 chips 渲染函数用）
  const dictionaries = useDictionaryStore((s) => s.dictionaries);
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="药剂详情"
      size="lg"
      showFooter={false}
    >
      {/* 编号头部 */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 mb-4 border border-red-100">
        <div className="text-xs text-gray-500 mb-1">药剂编码</div>
        <div className="text-xl font-mono font-bold text-red-700">{record.pesticideCode || '-'}</div>
        <div className="text-sm text-gray-500 mt-1">{record.pesticideName}</div>
        {/* 2026-07-10：药剂类型 chips 展示（替代原防治类型 Badge） */}
        <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">药剂类型：</span>
          {renderPesticideTypeChips(record.pesticideTypes, dictionaries)}
        </div>
      </div>

      {/* 规格列表 */}
      {record.specs && record.specs.length > 0 && (
        <div className="mb-4">
          <Label className="text-xs text-gray-500 mb-2 block">规格信息</Label>
          <div className="space-y-2">
            {record.specs.map((spec, index) => (
              <div
                key={spec.id || index}
                className="grid grid-cols-9 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
              >
                <div>
                  <span className="text-xs text-gray-500">品牌名称</span>
                  <p className="text-gray-900">{spec.brandName || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">含量</span>
                  <p className="text-gray-900 font-medium">{spec.specContent || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">剂型</span>
                  <p className="text-gray-900">{spec.formulation || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">生产厂家</span>
                  <p className="text-gray-900">{spec.manufacturer || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">建议用量</span>
                  <p className="text-gray-900">{spec.suggestedDosage || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">单位</span>
                  <p className="text-gray-900">{spec.dosageUnit || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">稀释比例</span>
                  <p className="text-gray-900">{spec.suggestedRatio || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">作用机制</span>
                  <p className="text-gray-900">{spec.mechanism || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">备注</span>
                  <p className="text-gray-900">{spec.remark || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 详情网格 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-gray-500">药剂编码</Label>
          <div className="text-sm text-gray-900 font-mono">{record.pesticideCode || '-'}</div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">药剂名称</Label>
          <div className="text-sm text-gray-900 font-bold">{record.pesticideName || '-'}</div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">药剂成分</Label>
          <div className="text-sm text-gray-900">{record.ingredient || '-'}</div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">作用机制</Label>
          <div className="text-sm text-gray-900">{record.mechanism || '-'}</div>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-gray-500">药剂类型</Label>
          <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 min-h-[40px]">
            {renderPesticideTypeChips(record.pesticideTypes, dictionaries)}
          </div>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-gray-500">功能说明</Label>
          <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 min-h-[40px]">
            {record.functionDesc || '-'}
          </div>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-gray-500">使用禁忌</Label>
          <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 min-h-[40px]">
            {record.tabooDesc || '-'}
          </div>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-gray-500">防治对象</Label>
          <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 min-h-[40px]">
            {record.targetPests || '-'}
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">创建时间</Label>
          <div className="text-sm text-gray-900">{record.createTime || '-'}</div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">更新时间</Label>
          <div className="text-sm text-gray-900">{record.updateTime || '-'}</div>
        </div>
      </div>

      {/* 底部关闭按钮 */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}