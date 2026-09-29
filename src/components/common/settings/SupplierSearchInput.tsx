/**
 * 供应商搜索输入框（可搜索下拉，2026-09-27）
 *
 * 用途：物料汇总表 新增/编辑弹窗的"供应商"字段，与供应商管理页数据关联
 * 数据流：useSupplierStore（内存）← enhancedApiClient ← API
 * 交互：输入关键字过滤已有供应商（名称/编码/联系人/手机号）→ 点击候选自动定位填入名称
 * 兼容：下拉未命中时允许保留自由文本（历史数据的供应商名称可能不在供应商库中）
 *
 * 用 Popover（Portal 渲染）而非绝对定位下拉：弹窗内容区 overflow-y-auto 会裁剪
 * 绝对定位下拉（供应商字段靠近弹窗底部时完全不可见），Popover 有碰撞检测会自动避让。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Input, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { useSupplierStore } from '@/stores';
import { Supplier } from '@/components/supplier/types';
import {
  evaluateSupplierQualification,
  getQualificationIssue,
  QUALIFICATION_STATUS_TEXT,
  QUALIFICATION_STATUS_CLASS,
} from '@/components/supplier/qualification';
import { showConfirm, showToast } from '@/lib/dialogService';

interface SupplierSearchInputProps {
  /** 当前值（供应商名称字符串） */
  value: string;
  /** 值变化回调（输入自由文本 / 点击候选均触发） */
  onChange: (name: string) => void;
  /**
   * 供应商主数据解析回调（2026-09-29 新增）
   * - 点击候选 → 回传该 Supplier（调用方可取 id 落 supplierId）
   * - 输入自由文本 → 回传 null（已脱离主数据，须清空 supplierId）
   * 不传时行为与旧版一致（仅名称字符串）。
   */
  onSupplierResolved?: (supplier: Supplier | null) => void;
  placeholder?: string;
  /** 输入框样式（与相邻字段保持一致） */
  className?: string;
  disabled?: boolean;
}

/** 下拉最多展示条数（供应商数量可能几百家，避免渲染过多） */
const MAX_RESULTS = 50;

export function SupplierSearchInput({
  value,
  onChange,
  onSupplierResolved,
  placeholder = '搜索供应商名称...',
  className,
  disabled = false,
}: SupplierSearchInputProps) {
  // 供应商数据源：与"物资管理 → 供应商管理"页面同一 Store
  const supplierItems = useSupplierStore((s) => s.items);
  const loadSuppliers = useSupplierStore((s) => s.loadItems);
  const searchSuppliers = useSupplierStore((s) => s.search);

  const [open, setOpen] = useState(false);

  // 挂载时加载供应商（Store 内部有 5 分钟去重 + 并发保护）
  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  // 按关键字过滤（search 内部读 store 快照，必须把 supplierItems 列为依赖，数据到位后才会重算）
  // 2026-09-28 审计修复：只提供「合作中」的供应商——此前下拉吃全量，
  // 「暂停/终止」的供应商仍能被选来建立新的入库/物料业务
  const filtered = useMemo(
    () => searchSuppliers(value).filter((s) => s.status === '合作中' || s.status === 'active').slice(0, MAX_RESULTS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, supplierItems, searchSuppliers]
  );

  /**
   * 选中候选供应商：自动定位并回填名称（与供应商管理页同一数据）
   *
   * 2026-09-28 批次B 合规风控：证照异常时先提示再决定
   * - 未登记 / 已过期：确认框（取消则不写入，保持原值），提示合规风险
   * - 即将到期：轻提示（不打断操作）
   * 后端 `SUPPLIER_QUALIFICATION_ENFORCE=1` 时另会硬阻断，前端这里只做告知。
   */
  const handleSelect = async (supplier: Supplier) => {
    const status = evaluateSupplierQualification(supplier).status;
    if (status === 'missing' || status === 'expired') {
      const issue = getQualificationIssue(supplier) || '供应资质异常';
      const ok = await showConfirm(`该供应商${issue}。\n继续选择该供应商可能带来合规风险，是否仍要继续？`);
      if (!ok) return;
    } else if (status === 'expiring') {
      showToast(`该供应商${getQualificationIssue(supplier) || '证照即将到期'}`, 'warning');
    }
    onChange(supplier.name);
    onSupplierResolved?.(supplier);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // 自由输入即脱离主数据：必须清空 supplierId，否则会留下"名称已改、ID 还是旧供应商"的错关联
            onSupplierResolved?.(null);
            setOpen(true);
          }}
          // preventDefault 阻止 Radix Trigger 的 toggle 关闭（点击输入框本身不应收起下拉）
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          autoComplete="off"
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        // 宽度对齐输入框，z-[100] 确保浮在 Modal（z-50）之上
        className="p-0 w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto z-[100]"
        // 保持焦点在输入框，避免打开下拉后无法继续输入
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">
            {value.trim() ? `无匹配"${value}"的供应商，可直接输入新名称` : '暂无供应商数据'}
          </div>
        ) : (
          <>
            {filtered.map((s) => {
              // 2026-09-28 批次B：候选行直接标出资质问题，让用户在选择前就能看到
              const qual = evaluateSupplierQualification(s);
              const showQualBadge = qual.status === 'missing' || qual.status === 'expired' || qual.status === 'expiring';
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void handleSelect(s)}
                  className={`w-full px-3 py-2 text-left hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 ${
                    value === s.name ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-800">{s.name}</p>
                    {showQualBadge && (
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${QUALIFICATION_STATUS_CLASS[qual.status]}`}
                        title={`${qual.label}${qual.expiry ? ` · 有效期至 ${qual.expiry}` : ''}`}
                      >
                        {QUALIFICATION_STATUS_TEXT[qual.status]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {s.code}
                    {s.contact ? ` · ${s.contact}` : ''}
                  </p>
                </button>
              );
            })}
            {filtered.length === MAX_RESULTS && (
              <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
                仅显示前 {MAX_RESULTS} 条，请继续输入关键字缩小范围
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default SupplierSearchInput;
