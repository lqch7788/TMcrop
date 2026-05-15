/**
 * 详情抽屉组件 - 右侧滑出面板
 * 用于汇总表各页面的详情展示
 */

import { useEffect, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';

export interface DetailDrawerProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title: string;
  /** 宽度，默认 480 */
  width?: 480 | 640;
  /** 内容 */
  children: React.ReactNode;
  /** 底部操作区 */
  footer?: React.ReactNode;
  /** 加载状态 */
  loading?: boolean;
}

export function DetailDrawer({ isOpen, onClose, title, width = 480, children, footer, loading = false }: DetailDrawerProps) {
  // Esc 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 - 点击关闭 */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* 抽屉面板 - 桌面端固定宽度，移动端全屏 */}
      <div
        className="fixed top-0 right-0 h-full bg-white shadow-xl flex flex-col
                   transition-transform duration-300 ease-out translate-x-0
                   w-full sm:w-[480px]"
        style={width === 640 ? { width: '100%', maxWidth: '640px' } : { width: '100%', maxWidth: '480px' }}
      >
        {/* 标题栏 - 翠绿色背景 */}
        <div className="flex items-center justify-between bg-emerald-600 text-white px-5 py-3 flex-shrink-0">
          <h2 className="text-base font-semibold truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-500 transition-colors flex-shrink-0"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 - 可滚动 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : (
            children
          )}
        </div>

        {/* 底部操作区 */}
        {footer && (
          <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
