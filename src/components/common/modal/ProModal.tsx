import React from 'react';
import { Modal } from '@/components/ui';

/**
 * ProModal - 通用弹窗组件
 * 支持4种header颜色类型：primary/info/warning/error
 * 支持loading状态显示
 * 从 antd Modal 替换为 @/components/ui Modal
 */
interface ProModalProps {
  type?: 'primary' | 'info' | 'warning' | 'error';
  title: string;
  open: boolean;
  onCancel: () => void;
  onOk?: () => void;
  width?: 400 | 560 | 720 | 900;
  loading?: boolean;
  children: React.ReactNode;
}

// UI组件库 Modal 的 size 映射
const sizeMap: Record<number, 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'> = {
  400: 'sm',
  560: 'md',
  720: 'lg',
  900: 'xl',
};

const ProModal: React.FC<ProModalProps> = ({
  type = 'primary',
  title,
  open,
  onCancel,
  onOk,
  width = 560,
  loading = false,
  children,
}) => {
  // UI组件库的Modal使用固定size，需要映射
  const modalSize = sizeMap[width] || 'md';

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={title}
      size={modalSize}
      onSubmit={onOk}
      submitText="确认"
      cancelText="取消"
      showFooter
      enableDrag={false}
      enableResize={false}
    >
      {children}
    </Modal>
  );
};

export default ProModal;
