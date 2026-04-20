import { Modal } from './Modal';

interface UnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
  showFooter?: boolean;
  footer?: React.ReactNode;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  showMaximize?: boolean;
  enableDrag?: boolean;
  enableResize?: boolean;
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
  footer,
  onSubmit,
  submitText = '保存',
  cancelText = '取消',
  showMaximize = true,
  enableDrag = true,
  enableResize = true,
}: UnifiedModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      showFooter={showFooter}
      footer={footer}
      onSubmit={onSubmit}
      submitText={submitText}
      cancelText={cancelText}
      headerAction={headerAction}
      showMaximize={showMaximize}
      enableDrag={enableDrag}
      enableResize={enableResize}
    >
      {children}
    </Modal>
  );
}
