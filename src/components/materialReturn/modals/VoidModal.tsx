import { UnifiedModal, TextArea } from '@/components/ui';
import { ReturnRecord } from '../types';

interface VoidModalProps {
  open: boolean;
  record: ReturnRecord | null;
  voidReason: string;
  onClose: () => void;
  onSubmit: () => void;
  onReasonChange: (reason: string) => void;
}

/**
 * 生产退料 - 作废申请弹窗
 * 展示退料单概略信息 + 必填的作废原因，提交后由父级处理作废逻辑
 */
export function VoidModal({
  open,
  record,
  voidReason,
  onClose,
  onSubmit,
  onReasonChange,
}: VoidModalProps) {
  if (!open || !record) return null;

  // 获取物料概略信息（最多展示前 3 项，超出部分用"等N项"汇总）
  const materialSummary = record.materials?.length > 0
    ? record.materials.slice(0, 3).map(m => m.materialName).join('、')
    : '无';
  const moreCount = (record.materials?.length || 0) > 3 ? `等${record.materials.length}项` : '';

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="作废申请"
      size="md"
      showFooter
      onSubmit={onSubmit}
      submitText="提交作废申请"
    >
      <p className="text-sm text-gray-500 mb-3">请填写作废原因</p>

      {/* 退料单概略信息 */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">退料单号：</span>
            <span className="font-mono font-medium text-gray-900">{record.code}</span>
          </div>
          <div>
            <span className="text-gray-500">申请人：</span>
            <span className="text-gray-900">{record.applicant}</span>
          </div>
          <div>
            <span className="text-gray-500">退料部门：</span>
            <span className="text-gray-900">{record.department}</span>
          </div>
          <div>
            <span className="text-gray-500">物料数量：</span>
            <span className="text-gray-900">{record.materials?.length || 0} 项</span>
          </div>
        </div>
        <div className="mt-2 text-sm">
          <span className="text-gray-500">物料名称：</span>
          <span className="text-gray-900">{materialSummary}{moreCount}</span>
        </div>
      </div>

      {/* 作废原因（必填） */}
      <div className="mb-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          作废原因 <span className="text-red-500">*</span>
        </label>
        <TextArea
          value={voidReason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="请输入作废原因"
          rows={4}
        />
      </div>
    </UnifiedModal>
  );
}
