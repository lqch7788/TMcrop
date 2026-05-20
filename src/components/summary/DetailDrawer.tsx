/**
 * 详情抽屉组件 - 右侧滑出面板
 * 用于汇总表各页面的详情展示
 * V2.1: 替换自定义遮罩层为 UnifiedModal 统一弹窗组件
 */

import { Loader2 } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';

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
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={width}
      showFooter={!!footer}
      footer={footer}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        children
      )}
    </UnifiedModal>
  );
}
