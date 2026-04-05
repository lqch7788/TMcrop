import { XCircle, CheckCircle, Clock, User, Calendar, Users, Briefcase } from 'lucide-react';
import { RecruitmentRequest, RecruitmentStatus } from './types';

interface RecruitmentDetailModalProps {
  recruitment: RecruitmentRequest | null;
  onClose: () => void;
}

// 状态配置
const statusConfig: Record<RecruitmentStatus, { bg: string; text: string; icon: typeof Clock }> = {
  '待审批': { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  '招聘中': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  '已完成': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  '已取消': { bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
};

// 来源配置
const sourceLabels: Record<string, string> = {
  '劳务公司': '劳务公司',
  '个人零工': '个人零工',
  '学生实习': '学生实习',
  '内部推荐': '内部推荐',
};

export function RecruitmentDetailModal({ recruitment, onClose }: RecruitmentDetailModalProps) {
  if (!recruitment) return null;

  const status = statusConfig[recruitment.status];
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">招聘详情</h3>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
              <StatusIcon className="w-3 h-3" />
              {recruitment.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 基本信息 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">基本信息</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-gray-500">招聘编号</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.requestCode}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">申请日期</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.applyDate}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">招聘岗位</label>
                <div className="flex items-center gap-2 mt-1">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{recruitment.position}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">需求部门</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.department}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">招聘人数</label>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{recruitment.quantity}人</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">招聘来源</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{sourceLabels[recruitment.source]}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">期望到岗日期</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{recruitment.expectedDate}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">申请人</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{recruitment.applicantName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 招聘详情 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">招聘详情</h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">招聘原因</label>
                <p className="text-sm text-gray-700 mt-1">{recruitment.reason}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">岗位要求</label>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{recruitment.requirements}</p>
              </div>
              {recruitment.remarks && (
                <div>
                  <label className="text-xs text-gray-500">备注</label>
                  <p className="text-sm text-gray-700 mt-1">{recruitment.remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* 审批信息 */}
          {(recruitment.approverName || recruitment.approveDate) && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">审批信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">审批人</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.approverName || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">审批日期</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.approveDate || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 审批历史 */}
          {recruitment.approvalHistory && recruitment.approvalHistory.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">审批历史</h4>
              <div className="space-y-3">
                {recruitment.approvalHistory.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        item.action === 'approve' ? 'bg-emerald-500' :
                        item.action === 'reject' ? 'bg-red-500' :
                        item.action === 'cancel' ? 'bg-gray-400' :
                        'bg-blue-500'
                      }`} />
                    </div>
                    <div className="flex-1 pb-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{item.actionName}</span>
                        <span className="text-xs text-gray-500">{item.operateDate}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.operatorName} {item.action === 'submit' ? '提交' : item.action === 'approve' ? '审批' : item.action === 'cancel' ? '取消' : '驳回'}
                      </p>
                      {item.comment && (
                        <p className="text-xs text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded">
                          {item.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecruitmentDetailModal;
