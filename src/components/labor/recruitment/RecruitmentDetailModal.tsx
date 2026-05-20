import { XCircle, CheckCircle, Clock, User, Calendar, Users, Briefcase } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { RecruitmentRequest, RecruitmentStatus } from './types';
import { Label } from '@/components/ui/label';

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

  const content = (
    <div>
      {/* 基本信息 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">基本信息</h4>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-xs text-gray-500">招聘编号</Label>
            <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.requestCode}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">申请日期</Label>
            <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.applyDate}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">招聘岗位</Label>
            <div className="flex items-center gap-2 mt-1">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">{recruitment.position}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">需求部门</Label>
            <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.department}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">招聘人数</Label>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">{recruitment.quantity}人</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">招聘来源</Label>
            <p className="text-sm font-medium text-gray-900 mt-1">{sourceLabels[recruitment.source]}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">期望到岗日期</Label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">{recruitment.expectedDate}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">申请人</Label>
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
            <Label className="text-xs text-gray-500">招聘原因</Label>
            <p className="text-sm text-gray-700 mt-1">{recruitment.reason}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">岗位要求</Label>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{recruitment.requirements}</p>
          </div>
          {recruitment.remarks && (
            <div>
              <Label className="text-xs text-gray-500">备注</Label>
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
              <Label className="text-xs text-gray-500">审批人</Label>
              <p className="text-sm font-medium text-gray-900 mt-1">{recruitment.approverName || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">审批日期</Label>
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
  );

  const footer = (
    <Button
      onClick={onClose}
      variant="outline"
    >
      关闭
    </Button>
  );

  return (
    <UnifiedModal
      isOpen={true}
      onClose={onClose}
      title="招聘详情"
      size="lg"
      showFooter={true}
      headerAction={
        <Button
          onClick={onClose}
          variant="ghost"
          size="smIcon"
        >
          <XCircle className="w-5 h-5 text-gray-400" />
        </Button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}

export default RecruitmentDetailModal;
