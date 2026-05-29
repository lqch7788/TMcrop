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
  showCloseButton?: boolean;
  enableDrag?: boolean;
  enableResize?: boolean;
  width?: number;
  height?: number;
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
  showCloseButton = true,
  enableDrag = true,
  enableResize = true,
  width,
  height,
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
      showCloseButton={showCloseButton}
      enableDrag={enableDrag}
      enableResize={enableResize}
      width={width}
      height={height}
    >
      {children}
    </Modal>
  );
}
