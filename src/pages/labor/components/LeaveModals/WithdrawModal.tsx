/**
 * 请假申请撤回确认弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { LeaveRecord } from '../../../../components/labor/leave/types';

export interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LeaveRecord | null;
  onConfirm: () => void;
}

export function WithdrawModal({
  isOpen,
  onClose,
  record,
  onConfirm,
}: WithdrawModalProps) {
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="撤回请假申请"
      size="sm"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="py-2">
          <p className="text-gray-700">
            确定要撤回 <span className="font-semibold">{record.staffName}</span> 的
            <span className="font-semibold">{record.leaveType}</span>申请吗？
          </p>
          <p className="text-gray-500 text-sm mt-2">
            撤回后将释放冻结的 {record.days} 天假期额度，该申请将被标记为已撤回。
          </p>
        </div>
        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant="warning"
            onClick={onConfirm}
          >
            <Check className="w-4 h-4" /> 确认撤回
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
