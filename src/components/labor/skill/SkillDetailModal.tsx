import React from 'react';
import { Award, BookOpen, Calendar, Clock, X, XCircle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { StaffSkill, TrainingRecord } from './types';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui';

interface SkillDetailModalProps {
  skill: StaffSkill | null;
  trainingRecords: TrainingRecord[];
  onClose: () => void;
}

export function SkillDetailModal({ skill, trainingRecords, onClose }: SkillDetailModalProps) {
  if (!skill) return null;

  // 状态徽章颜色
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '正常':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case '即将过期':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case '已过期':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // 等级徽章颜色
  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case '技师':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case '高级':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case '中级':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case '初级':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // 结果徽章颜色
  const getResultBadgeClass = (result: string) => {
    switch (result) {
      case '通过':
        return 'bg-emerald-100 text-emerald-700';
      case '未通过':
        return 'bg-red-100 text-red-700';
      case '待考核':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 筛选当前员工的培训记录
  const staffTrainingRecords = trainingRecords.filter((r) => r.staffId === skill.staffId);

  const content = (
    <div>
      {/* 基本信息 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">基本信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <Label className="text-xs text-gray-500">部门</Label>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{skill.department}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <Label className="text-xs text-gray-500">技能总数</Label>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{skill.totalSkills} 项</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <Label className="text-xs text-gray-500">证书数量</Label>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{skill.certificationCount} 个</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <Label className="text-xs text-gray-500">认证状态</Label>
            <div className="mt-0.5">
              <Badge variant="outline" className={cn('font-medium', getStatusBadgeClass(skill.status))}>
                {skill.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 技能详情 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          技能详情 ({skill.skills.length})
        </h4>
        <div className="space-y-3">
          {skill.skills.map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base font-semibold text-gray-900">{item.tag}</span>
                    <Badge variant="outline" className={cn(getLevelBadgeClass(item.level))}>
                      {item.level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {item.certifiedDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>颁证日期: {item.certifiedDate}</span>
                      </div>
                    )}
                    {item.expiryDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>有效期至: {item.expiryDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 培训记录 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          培训记录 ({staffTrainingRecords.length})
        </h4>
        {staffTrainingRecords.length > 0 ? (
          <div className="space-y-3">
            {staffTrainingRecords.map((record) => (
              <div key={record.id} className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900">{record.trainingContent}</span>
                  </div>
                  <Badge className={cn(getResultBadgeClass(record.result))}>
                    {record.result}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                  <div>培训类型: {record.trainingType}</div>
                  <div>培训日期: {record.trainingDate}</div>
                  <div>培训师: {record.trainer}</div>
                  {record.certificate && (
                    <div className="col-span-2">证书: {record.certificate}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            暂无培训记录
          </div>
        )}
      </div>
    </div>
  );

  const footer = (
    <Button onClick={onClose} className="text-gray-700">
      <X className="w-4 h-4" /> 关闭
    </Button>
  );

  return (
    <UnifiedModal
      isOpen={true}
      onClose={onClose}
      title={`${skill.staffName} - 员工技能档案详情`}
      size="lg"
      showFooter={true}
      headerAction={
        <Button
          variant="ghost"
          onClick={onClose}
          className="p-1.5"
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

export default SkillDetailModal;
