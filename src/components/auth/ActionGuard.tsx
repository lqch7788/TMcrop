/**
 * 按钮级权限守卫组件
 * 根据用户权限控制子元素的显示/隐藏
 *
 * 用法:
 * <ActionGuard processRoute="/dashboard" actionCode="delete">
 *   <Button>删除</Button>
 * </ActionGuard>
 */

import React from 'react';
import { useAuthStore } from '@/stores';

interface ActionGuardProps {
  /** 工序路由路径 */
  processRoute: string;
  /** 动作代码 (view/create/edit/delete/export/approve) */
  actionCode: string;
  /** 子元素 */
  children: React.ReactNode;
  /** 无权限时的替代内容（默认不渲染任何内容） */
  fallback?: React.ReactNode;
}

export function ActionGuard({ processRoute, actionCode, children, fallback = null }: ActionGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const allowed = hasPermission(processRoute, actionCode);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

/**
 * 权限控制 Hook — 用于需要在逻辑中使用权限的场景
 */
export function useActionPermission(processRoute: string, actionCode: string): boolean {
  return useAuthStore((s) => s.hasPermission(processRoute, actionCode));
}
