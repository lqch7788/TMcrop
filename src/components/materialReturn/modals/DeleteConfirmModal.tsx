import { DeleteConfirmModal as UiDeleteConfirmModal } from '@/components/ui';

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * 生产退料 - 单条删除确认弹窗
 * 复用 UI 库通用删除确认弹窗（统一遮罩、标题栏、footer 按钮）
 * 对调用方保持原有 open prop，避免改动 MaterialReturnPage
 */
export function DeleteConfirmModal({ open, onClose, onConfirm }: DeleteConfirmModalProps) {
  return (
    <UiDeleteConfirmModal
      isOpen={open}
      selectedCount={1}
      onClose={onClose}
      onConfirm={onConfirm}
      title="确认删除"
      description="确定要删除这条退料记录吗？此操作不可恢复。"
      impactHint="删除此退料记录可能会导致相关数据丢失，无法恢复。请确认是否继续删除操作。"
    />
  );
}
