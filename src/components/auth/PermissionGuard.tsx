/**
 * 权限守卫组件
 * 包裹需要权限校验的路由，未登录跳转登录页，无权限显示403
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

interface PermissionGuardProps {
  /** 需要的工序路由（权限标识），不传则只检查登录状态 */
  processRoute?: string;
  /** 需要的动作代码，默认为 view */
  actionCode?: string;
  children: React.ReactNode;
}

export function PermissionGuard({ processRoute, actionCode, children }: PermissionGuardProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const verifyToken = useAuthStore((s) => s.verifyToken);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);

  // 如果有 token 但未验证，尝试恢复登录状态
  useEffect(() => {
    if (token && !isAuthenticated) {
      verifyToken();
    }
  }, [token, isAuthenticated, verifyToken]);

  // 加载中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // 未登录，跳转登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin 跳过权限检查
  if (isAdmin) {
    return <>{children}</>;
  }

  // 需要特定权限检查
  if (processRoute && actionCode) {
    const allowed = hasPermission(processRoute, actionCode);
    if (!allowed) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">无权限访问</h2>
            <p className="text-gray-500 mb-6">
              您没有该页面的访问权限，如需访问请联系管理员
            </p>
            <Button
              variant="outline"
              size="default"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4" />
              返回上一页
            </Button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

/**
 * 仅检查登录状态的守卫
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);
  const verifyToken = useAuthStore((s) => s.verifyToken);
  const location = useLocation();

  useEffect(() => {
    if (token && !isAuthenticated) {
      verifyToken();
    }
  }, [token, isAuthenticated, verifyToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
