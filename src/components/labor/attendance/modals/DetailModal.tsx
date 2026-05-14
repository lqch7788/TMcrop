/**
 * 考勤记录 - 查看详情弹窗
 */
import { Modal } from '../../../ui/Modal';
import { AttendanceRecord } from '../types';

interface DetailModalProps {
  isOpen: boolean;
  record: AttendanceRecord | null;
  onClose: () => void;
}

export function DetailModal({ isOpen, record, onClose }: DetailModalProps) {
  if (!record) return null;

  const statusLabel = (status: string, statusClass: string) => {
    const colors: Record<string, string> = {
      normal: 'bg-green-100 text-green-700',
      warning: 'bg-amber-100 text-amber-700',
      draft: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[statusClass] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="考勤记录详情"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* 基本信息 */}
        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">基本信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">工号</label>
            <p className="text-sm font-medium text-gray-900">{record.workerId}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">姓名</label>
            <p className="text-sm font-medium text-gray-900">{record.name}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">部门</label>
            <p className="text-sm font-medium text-gray-900">{record.dept}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">日期</label>
            <p className="text-sm font-medium text-gray-900">{record.date}</p>
          </div>
        </div>

        {/* 考勤信息 */}
        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">考勤信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">签到时间</label>
            <p className="text-sm font-medium text-gray-900">{record.checkIn || '-'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">签退时间</label>
            <p className="text-sm font-medium text-gray-900">{record.checkOut || '-'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">工作时长</label>
            <p className="text-sm font-medium text-gray-900">{Math.round(record.hours)} 小时</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">考勤状态</label>
            <div className="mt-1">{statusLabel(record.status, record.statusClass)}</div>
          </div>
        </div>

        {/* 关联信息 */}
        {(record.taskId || record.batchId) && (
          <>
            <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">关联信息</h4>
            <div className="grid grid-cols-2 gap-4">
              {record.taskId && (
                <div>
                  <label className="text-xs text-gray-500">关联任务ID</label>
                  <p className="text-sm font-medium text-gray-900">{record.taskId}</p>
                </div>
              )}
              {record.batchId && (
                <div>
                  <label className="text-xs text-gray-500">关联批次ID</label>
                  <p className="text-sm font-medium text-gray-900">{record.batchId}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
