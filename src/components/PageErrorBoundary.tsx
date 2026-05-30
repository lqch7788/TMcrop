/**
 * 页面级错误边界组件
 * 为关键页面提供独立的错误隔离，防止单个组件崩溃影响整个页面
 */

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 页面名称，用于日志 */
  pageName?: string;
  /** 是否显示详细错误信息 */
  showDetails?: boolean;
  /** 自定义错误回调 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** 错误恢复回调 */
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 页面级错误边界
 * 使用方法: <PageErrorBoundary pageName="Dashboard"><Dashboard /></PageErrorBoundary>
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // logger.error(`[PageErrorBoundary:${props.pageName}] Caught error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {this.props.pageName ? `${this.props.pageName} 加载失败` : '页面组件加载失败'}
            </h3>
            <p className="text-gray-600 mb-4">
              请尝试刷新页面或返回上一页
            </p>
            {this.props.showDetails && this.state.error && (
              <div className="text-left bg-gray-100 p-3 rounded text-xs text-gray-600 mb-4 max-w-md overflow-auto">
                <p className="font-mono">{this.state.error.message}</p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 带错误边界的懒加载页面包装器
 */
interface LazyPageWrapperProps {
  children: ReactNode;
  pageName: string;
  showDetails?: boolean;
}

export function LazyPageWrapper({ children, pageName, showDetails }: LazyPageWrapperProps) {
  return (
    <PageErrorBoundary pageName={pageName} showDetails={showDetails}>
      {children}
    </PageErrorBoundary>
  );
}

export default PageErrorBoundary;
