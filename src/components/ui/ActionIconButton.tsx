/**
 * 2026-07-05: 操作列图标按钮统一组件
 *
 * 用途：替代三表（种源/育苗/种植）中原生 <Button variant="ghost" size="icon"> + 重复 className 的写法
 *
 * 基础用法：
 *   <ActionIconButton variant="edit" icon={<Edit2 className="w-4 h-4" />} onClick={...} title="编辑" />
 *
 * 多状态用法（className 覆盖，用于 isEnded / isCancelled 等条件分支）：
 *   <ActionIconButton
 *     variant="inbound"
 *     icon={<Package className="w-4 h-4" />}
 *     className={isCancelled ? 'text-gray-400 hover:text-gray-500 hover:bg-gray-50' : ''}
 *   />
 */

import React from 'react';
import { Button } from './button';
import { ACTION_ICON_TOKENS, type ActionIconVariant } from '@/constants/actionIconTokens';

interface ActionIconButtonProps {
  /** 语义变体（决定默认颜色样式） */
  variant: ActionIconVariant;
  /** 图标节点（推荐 lucide-react 图标 + w-4 h-4） */
  icon: React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 禁用状态 */
  disabled?: boolean;
  /** 鼠标 hover 提示文本 */
  title?: string;
  /**
   * 覆盖样式（用于多状态分支，如 isEnded/isCancelled）
   * 传入后会与 variant 默认样式合并，冲突时此 prop 优先
   */
  className?: string;
}

export function ActionIconButton({
  variant,
  icon,
  onClick,
  disabled,
  title,
  className = '',
}: ActionIconButtonProps) {
  const variantClass = ACTION_ICON_TOKENS[variant];
  // variant 默认样式在前，className 覆盖在后 — Tailwind 后定义类生效
  const merged = className ? `${variantClass} ${className}` : variantClass;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={merged}
    >
      {icon}
    </Button>
  );
}