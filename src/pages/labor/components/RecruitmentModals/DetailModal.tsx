/**
 * 招聘申请详情弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import { RecruitmentRecord } from '../../types/recruitment.types';

export interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RecruitmentRecord | null;
  onApprove: (record: RecruitmentRecord) => void;
  onReject: (record: RecruitmentRecord) => void;
}

/** 获取优先级颜色 */
function getPriorityColor(priority: string) {
  switch (priority) {
    case '紧急': return 'text-red-600 bg-red-50';
    case '高': return 'text-orange-600 bg-orange-50';
    case '普通': return 'text-blue-600 bg-blue-50';
    case '低': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

export function DetailModal({
  isOpen,
  onClose,
  record,
  onApprove,
  onReject,
}: DetailModalProps) {
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="招聘详情"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">招聘编号</label>
            <div className="text-sm text-gray-900">{record.recruitmentCode}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">申请部门</label>
            <div className="text-sm text-gray-900">{record.deptName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">招聘岗位</label>
            <div className="text-sm text-gray-900">{record.position}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">招聘人数</label>
            <div className="text-sm text-gray-900">{record.headcount} 人</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">用工类型</label>
            <div className="text-sm text-gray-900">{record.employmentType}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">薪资范围</label>
            <div className="text-sm text-gray-900">{record.salaryMin}-{record.salaryMax} 元/月</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">优先级</label>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(record.priority)}`}>
                {record.priority}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
            <div className="mt-1">
              <LaborStatusBadge
                status={
                  record.status === '已通过' ? 'completed' :
                  record.status === '已拒绝' ? 'rejected' :
                  record.status === '已撤回' ? 'cancelled' : 'pending'
                }
                label={record.status}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">申请人</label>
            <div className="text-sm text-gray-900">{record.applicantName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">申请日期</label>
            <div className="text-sm text-gray-900">{record.applyDate}</div>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">招聘原因</label>
            <div className="text-sm text-gray-900">{record.reason || '无'}</div>
          </div>
          {record.remarks && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
              <div className="text-sm text-gray-900">{record.remarks}</div>
            </div>
          )}
        </div>

        {/* 审批操作 */}
        {record.status === '待审批' && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => { onReject(record); onClose(); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              驳回
            </button>
            <button
              onClick={() => { onApprove(record); onClose(); }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              通过
            </button>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
