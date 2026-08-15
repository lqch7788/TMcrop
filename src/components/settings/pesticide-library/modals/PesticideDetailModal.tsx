/**
 * 药剂详情查看弹窗组件（V2 扁平化 2026-07-12）
 * 只读视图，以网格形式展示全部字段
 * 对齐 FertlizerDetailModal 扁平模式
 * 2026-08-15 O6：新增"使用记录"tab（药剂 ↔ 防治记录闭环追溯）
 */
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { UnifiedModal, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { PesticideSpec } from '@/stores';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { enhancedApiClient } from '@/lib/apiClient';

interface PesticideDetailModalProps {
  isOpen: boolean;
  record: PesticideSpec;
  onClose: () => void;
}

/** 使用记录行（后端 findPesticideUsageBySpec 返回结构，camelCase） */
interface PesticideUsageRow {
  recordId: string;
  recordCode?: string;
  cropName?: string;
  greenhouseName?: string;
  operatorName?: string;
  sprayTime?: string;
  dosage?: number;
  unit?: string;
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

/** 单个字段展示行 — 2026-08-15：标签与值同一行（"编码：xxx"）、无背景色无底框（纯文本行） */
function FieldCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-xs text-gray-500 shrink-0">{label}：</span>
      <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{value}</span>
    </div>
  );
}

export function PesticideDetailModal({ isOpen, record, onClose }: PesticideDetailModalProps) {
  // 触发字典 store 加载
  useDictionaryStore((s) => s.dictionaries);

  // 2026-08-15 O6：使用记录 tab 状态（hooks 必须在任何条件 return 之前）
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [usageRows, setUsageRows] = useState<PesticideUsageRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageLoaded, setUsageLoaded] = useState(false);

  // 打开弹窗且切到"使用记录"tab 时拉取一次
  useEffect(() => {
    if (!isOpen || !record || activeTab !== 'usage' || usageLoaded || !record.specId) return;
    setUsageLoading(true);
    (async () => {
      try {
        const res = await enhancedApiClient.get<any>(
          `/pest-records/pesticide-usage-by-spec/${encodeURIComponent(String(record.specId))}`,
        );
        const list = Array.isArray(res) ? res : res?.data ?? [];
        setUsageRows(list as PesticideUsageRow[]);
        setUsageLoaded(true);
      } catch (e) {
        console.error('[PesticideDetailModal] 使用记录加载失败:', e);
      } finally {
        setUsageLoading(false);
      }
    })();
  }, [isOpen, activeTab, usageLoaded, record]);

  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="药剂详情"
      // 2026-08-15：弹窗扩大一倍（lg 700px → xxxl 1350px，接近 2 倍宽度）
      size="xxxl"
      showFooter={false}
    >
      {/* 2026-08-15：删除头部标题卡片（编码/名称/类型 chips）— 与下方"基础信息"区内容重复 */}

      {/* 2026-08-15 O6：基本信息 / 使用记录 双 tab */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <TabsList selectedValue={activeTab} onValueChange={(v) => setActiveTab(v)} className="mb-4">
          <TabsTrigger value="basic">📋 基本信息</TabsTrigger>
          <TabsTrigger value="usage">🧾 使用记录</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" forceMount>
      {/* 内容区域 */}
      <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-5">
        {/* 基础信息 — 2026-08-15：纯文本行（无背景色无底框） */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 基础信息</h4>
          <div className="grid grid-cols-4 gap-x-6">
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

        {/* 功能与禁忌 — 2026-08-15：同行显示 + 无背景色无底框 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📝 功能与禁忌</h4>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex items-start gap-1.5">
              <span className="text-xs text-gray-500 shrink-0">功能说明：</span>
              <span className="text-sm text-gray-900 flex-1 min-w-0">{record.functionDesc || '-'}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-xs text-gray-500 shrink-0">使用禁忌：</span>
              <span className="text-sm text-gray-900 flex-1 min-w-0">{record.tabooDesc || '-'}</span>
            </div>
          </div>
        </div>

        {/* 备注 — 2026-08-15：同行显示 + 无背景色无底框 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">💬 备注</h4>
          <div className="flex items-start gap-1.5">
            <span className="text-xs text-gray-500 shrink-0">备注：</span>
            <span className="text-sm text-gray-900 flex-1 min-w-0">{record.remark || '-'}</span>
          </div>
        </div>
      </div>
        </TabsContent>

        {/* 2026-08-15 O6：使用记录 tab — 药剂被哪些防治记录使用过（用量/作物/时间） */}
        <TabsContent value="usage" forceMount>
          <div className="max-h-[55vh] overflow-y-auto">
            {usageLoading ? (
              <div className="text-center py-10 text-sm text-gray-400">加载中...</div>
            ) : usageRows.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                {usageLoaded ? '暂无使用记录' : '未加载（点击上方"使用记录"tab 查看）'}
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="bg-emerald-500 text-white sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">防治时间</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">单据号</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">作物</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">温室</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">操作员</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">用量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usageRows.map((row) => (
                    <tr key={row.recordId} className="hover:bg-emerald-50">
                      <td className="px-3 py-2 whitespace-nowrap">{row.sprayTime || '-'}</td>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.recordCode || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.cropName || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.greenhouseName || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.operatorName || '-'}</td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-orange-600 font-medium">
                        {row.dosage ?? '-'}{row.unit ? ` ${row.unit}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 底部关闭按钮 */}
      <div className="mt-6 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}
