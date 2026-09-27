// RejectModal 组件
// 拒绝原因弹窗
import { Approval } from '@/types/approval';
import { Check, X } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';

interface RejectModalProps {
  // 弹窗状态
  show: boolean;
  item: Approval | null;
  reason: string;
  /** 2026-09-27 审计修复：双模式——approve（通过，意见选填）/ reject（拒绝，原因必填）。
   *  此前"通过"不弹窗、不传意见，审批意见恒为空，申请单详情永远看不到通过意见 */
  mode?: 'reject' | 'approve';

  // 回调函数
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RejectModal({
  show,
  item,
  reason,
  mode = 'reject',
  onReasonChange,
  onConfirm,
  onCancel,
}: RejectModalProps) {
  const isApprove = mode === 'approve';
  return (
    <UnifiedModal
      isOpen={show && !!item}
      onClose={onCancel}
      title={isApprove ? '通过审批' : '拒绝审批'}
      size="sm"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant={isApprove ? 'blue' : 'destructive'}
            onClick={onConfirm}
          >
            <Check className="w-4 h-4" /> {isApprove ? '确认通过' : '确认拒绝'}
          </Button>
        </div>
      }
    >
      {item && (
      <div>
        <p className="text-sm text-gray-600 mb-2">
          确定要{isApprove ? '通过' : '拒绝'}「<span className="font-medium text-gray-900">{item.title}</span>」吗？
        </p>
        {!isApprove && (
          <p className="text-xs text-gray-500 mb-4">拒绝后，申请人可以在领料页面修改料单后重新提交审批。</p>
        )}
        <div className="mb-4">
          <Label className="text-gray-700">{isApprove ? '审批意见（选填）' : '拒绝原因（必填）'}</Label>
          <TextArea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={isApprove ? '可填写通过意见（选填）...' : '请输入拒绝原因...'}
            minRows={3}
          />
        </div>
      </div>
      )}
    </UnifiedModal>
  );
}
