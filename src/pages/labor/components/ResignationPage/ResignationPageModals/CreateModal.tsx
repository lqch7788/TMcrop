/**
 * 离职申请页面新建表单弹窗组件
 */
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { ResignationFormData, RESIGNATION_TYPE_OPTIONS, VOLUNTARY_REASONS, INVOLUNTARY_REASONS, ResignationType } from '../../../types/resignationPage.types';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui';
import { useWorkerStore } from '../../../../../stores';

interface ResignationPageCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: ResignationFormData;
  onWorkerChange: (workerId: string) => void;
  onHandoverUserChange: (userId: string) => void;
  onResignationTypeChange: (type: ResignationType) => void;
  onFormDataChange: (data: Partial<ResignationFormData>) => void;
  onSubmit: () => void;
}

export function ResignationPageCreateModal({
  isOpen,
  onClose,
  formData,
  onWorkerChange,
  onHandoverUserChange,
  onResignationTypeChange,
  onFormDataChange,
  onSubmit,
}: ResignationPageCreateModalProps) {
  const workers = useWorkerStore((state) => state.workers);
  const loadWorkers = useWorkerStore((state) => state.loadWorkers);

  useEffect(() => {
    if (workers.length === 0) {
      loadWorkers();
    }
  }, [workers.length, loadWorkers]);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新建离职申请"
      size="lg"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 员工选择 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            员工姓名 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.workerId}
            onChange={(e) => onWorkerChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择员工</option>
            {(workers || []).map(w => (
              <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
            ))}
          </select>
        </div>

        {/* 离职类型 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            离职类型 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.resignationType}
            onChange={(e) => onResignationTypeChange(e.target.value as ResignationType)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {RESIGNATION_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 离职原因 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            离职原因 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.reason}
            onChange={(e) => onFormDataChange({ reason: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择原因</option>
            {formData.resignationType === '主动离职' && VOLUNTARY_REASONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            {formData.resignationType === '被动离职' && INVOLUNTARY_REASONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 预计最后工作日 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            预计最后工作日 <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            selected={formData.expectedLastDay ? new Date(formData.expectedLastDay) : undefined}
            onChange={(date: Date) => onFormDataChange({ expectedLastDay: date.toISOString().slice(0, 10) })}
            placeholder="选择日期"
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">注：需提前30天通知</p>
        </div>

        {/* 工作交接人 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            工作交接人
          </Label>
          <select
            value={formData.handoverUserId}
            onChange={(e) => onHandoverUserChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择交接人</option>
            {(workers || []).filter(w => w.workerId !== formData.workerId).map(w => (
              <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
            ))}
          </select>
        </div>

        {/* 交接说明 */}
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            交接说明
          </Label>
          <textarea
            value={formData.handoverNote}
            onChange={(e) => onFormDataChange({ handoverNote: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入工作交接说明"
          />
        </div>
      </div>

      {/* 弹窗底部按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button onClick={onClose} variant="secondary">
          取消
        </Button>
        <Button onClick={onSubmit}>
          提交申请
        </Button>
      </div>
    </UnifiedModal>
  );
}
