import { Modal } from './Modal';

interface UnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  showFooter?: boolean;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
}

/**
 * 统一弹窗包装组件
 * 提供简洁的API接口，快速创建基于增强Modal的弹窗
 */
export function UnifiedModal({
  isOpen,
  onClose,
  title,
  children,
  headerAction,
  size = 'md',
  showFooter = false,
  onSubmit,
  submitText = '保存',
  cancelText = '取消',
}: UnifiedModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      showFooter={showFooter}
      onSubmit={onSubmit}
      submitText={submitText}
      cancelText={cancelText}
      headerAction={headerAction}
    >
      {children}
    </Modal>
  );
}
