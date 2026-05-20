import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditWarningModalProps {
  /** ApplicationTab 传入 isOpen，兼容旧版 show */
  show?: boolean;
  isOpen?: boolean;
  /** ApplicationTab 传入 onClose，兼容旧版 onCancel */
  onCancel?: () => void;
  onClose?: () => void;
  /** ApplicationTab 无 onConfirm，默认关闭弹窗 */
  onConfirm?: () => void;
}

export const EditWarningModal: React.FC<EditWarningModalProps> = ({
  show,
  isOpen,
  onCancel,
  onClose,
  onConfirm,
}) => {
  const visible = show ?? isOpen ?? false;
  if (!visible) return null;

  const handleCancel = onCancel || onClose || (() => {});
  const handleConfirm = onConfirm || onClose || (() => {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">批量编辑警告</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2 mb-6">
          <p>编辑后可能存在以下问题：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>该领料单的历史记录可能无法追溯</li>
            <li>已生成的出库单据数据可能不一致</li>
            <li>相关的统计报表数据可能需要重新核算</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            取消
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            确认
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditWarningModal;
