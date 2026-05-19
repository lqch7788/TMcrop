import { UnifiedModal } from '../ui/UnifiedModal';
import { Button } from '../ui/button';
import { AlertTriangle } from 'lucide-react';

interface BatchEditWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchEditWarningModal({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
}: BatchEditWarningModalProps) {
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑风险提示"
      size="md"
      showFooter={false}
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <div className="space-y-4">
        {/* 警告图标和标题 */}
        <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-amber-800 font-semibold text-base mb-1">批量编辑操作风险提醒</h4>
            <p className="text-amber-700 text-sm">您已选择 <span className="font-bold">{selectedCount}</span> 个物料进行批量编辑</p>
          </div>
        </div>

        {/* 风险说明列表 */}
        <div className="space-y-3 px-1">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-600 text-xs font-bold">1</span>
            </div>
            <div>
              <p className="text-gray-700 text-sm font-medium">历史记录无法正常显示</p>
              <p className="text-gray-500 text-xs mt-0.5">批量编辑会修改物料的核心信息，可能导致系统中已保存的出入库记录、工单明细等历史数据与物料信息不匹配</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-600 text-xs font-bold">2</span>
            </div>
            <div>
              <p className="text-gray-700 text-sm font-medium">统计报表数据不准确</p>
              <p className="text-gray-500 text-xs mt-0.5">修改后的物料信息可能导致库存统计、成本核算、采购分析等报表数据出现偏差，需重新核对</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-600 text-xs font-bold">3</span>
            </div>
            <div>
              <p className="text-gray-700 text-sm font-medium">关联业务可能受影响</p>
              <p className="text-gray-500 text-xs mt-0.5">生产工单、采购计划、供应商对账等关联业务可能因物料信息变更而需要同步调整</p>
            </div>
          </div>
        </div>

        {/* 建议 */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-xs">
            <span className="font-semibold">建议：</span>如非必要，请使用单个编辑功能。如确需批量编辑，编辑完成后请检查相关统计报表和业务单据。
          </p>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex gap-3 mt-6">
        <Button size="default" variant="outline" className="flex-1" onClick={onClose}>
          取消
        </Button>
        <Button size="default" variant="warning" className="flex-1" onClick={onConfirm}>
          已知晓
        </Button>
      </div>
    </UnifiedModal>
  );
}
