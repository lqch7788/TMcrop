import { AlertTriangle, X } from 'lucide-react';
import { UnifiedModal, Button } from '@/components/ui';

interface WarningModalProps {
  open: boolean;
  type: 'edit' | 'delete';
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * 生产退料 - 批量编辑/批量删除风险提示弹窗
 * 编辑场景确认按钮为蓝色，删除场景为红色；确认后由父级切换批量模式
 */
export function WarningModal({ open, type, onClose, onConfirm }: WarningModalProps) {
  if (!open) return null;

  const isEdit = type === 'edit';

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? '批量编辑警告' : '批量删除警告'}
      size="md"
      showFooter={false}
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      {/* 风险图标 + 风险清单 */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="text-sm text-gray-600 space-y-2 flex-1">
          <p>{isEdit ? '编辑后可能存在以下问题：' : '删除后可能存在以下问题：'}</p>
          <ul className="list-disc list-inside space-y-1">
            {isEdit ? (
              <>
                <li>该退料单的历史记录可能无法追溯</li>
                <li>已生成的入库单据数据可能不一致</li>
                <li>相关的统计报表数据可能需要重新核算</li>
              </>
            ) : (
              <>
                <li>所有选中的退料单将被永久删除</li>
                <li>相关的物料明细也将被删除</li>
                <li>历史数据将无法恢复</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* 底部操作：取消 / 已知晓 */}
      <div className="flex gap-3">
        <Button size="default" variant="outline" className="flex-1" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          size="default"
          variant={isEdit ? 'blue' : 'destructive'}
          className="flex-1"
          onClick={onConfirm}
        >
          已知晓
        </Button>
      </div>
    </UnifiedModal>
  );
}
