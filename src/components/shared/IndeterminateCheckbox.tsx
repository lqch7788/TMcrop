/**
 * 共享 Indeterminate Checkbox（2026-07-10 P1-4）
 * 抽自 4 处直接 ref DOM 属性 indeterminate 的写法（OutboundRecordsComponents / MaterialFlowPage 等）
 *
 * 用法：<IndeterminateCheckbox checked={...} indeterminate={...} onCheckedChange={...} />
 */
import React, { useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui';

export interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel?: string;
  className?: string;
}

export function IndeterminateCheckbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  ariaLabel,
  className = '',
}: IndeterminateCheckboxProps) {
  const ref = useRef<HTMLButtonElement | HTMLInputElement>(null);

  // indeterminate 不是 React 受控属性，必须通过 ref 直接设置 DOM
  useEffect(() => {
    if (ref.current) {
      // Checkbox 组件底层渲染为 <button>；DOM 标准 indeterminate 属性对 button 也生效
      (ref.current as unknown as HTMLInputElement).indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <Checkbox
      // 2026-07-10 P1-3 bugfix：ref={ref as any} 改 as React.Ref<HTMLButtonElement>（避免 any 逃逸）
      ref={ref as React.Ref<HTMLButtonElement>}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(Boolean(v))}
      aria-label={ariaLabel}
      className={className}
    />
  );
}