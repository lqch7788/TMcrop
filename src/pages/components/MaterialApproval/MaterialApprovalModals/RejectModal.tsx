// RejectModal 组件
// 拒绝原因弹窗
import { Approval } from '@/types/approval';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/TextArea';

interface RejectModalProps {
  // 弹窗状态
  show: boolean;
  item: Approval | null;
  reason: string;

  // 回调函数
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RejectModal({
  show,
  item,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: RejectModalProps) {
  return (
    <UnifiedModal
      isOpen={show && !!item}
      onClose={onCancel}
      title="拒绝审批"
      size="sm"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            确认拒绝
          </Button>
        </div>
      }
    >
      {item && (
      <div>
        <p className="text-sm text-gray-600 mb-2">
          确定要拒绝「<span className="font-medium text-gray-900">{item.title}</span>」吗？
        </p>
        <p className="text-xs text-gray-500 mb-4">拒绝后，申请人可以在领料页面修改料单后重新提交审批。</p>
        <div className="mb-4">
          <Label className="text-gray-700">拒绝原因（必填）</Label>
          <TextArea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="请输入拒绝原因..."
            minRows={3}
          />
        </div>
      </div>
      )}
    </UnifiedModal>
  );
}
