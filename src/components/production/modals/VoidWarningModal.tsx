import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

interface VoidWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function VoidWarningModal({
  isOpen,
  onClose,
  onConfirm,
}: VoidWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">作废生产计划警告</h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-3 mb-6">
            <p>作废生产计划后可能存在以下风险：</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>可能影响后续计划的执行</li>
              <li>系统中无法使用该生产计划</li>
              <li>造成生产计划无法追溯</li>
              <li>已关联的任务和记录可能失效</li>
            </ul>
            <p className="font-medium text-gray-700">请谨慎操作，确认要申请作废吗？</p>
          </div>
          <div className="flex gap-3">
            <Button size="sm" variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" variant="warning" onClick={onConfirm}>
              确认作废
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
