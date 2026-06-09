import { X, Phone, Mail, MapPin, User, Briefcase, Calendar, Award, FileText, GraduationCap, Clock } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Worker, WORKER_STATUS_CONFIG, SKILL_LEVEL_CONFIG } from '../../../types';
import { Button } from '@/components/ui';

interface PersonnelDetailModalProps {
  worker: Worker | null;
  onClose: () => void;
}

export function PersonnelDetailModal({ worker, onClose }: PersonnelDetailModalProps) {
  if (!worker) return null;

  const content = (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          基本信息
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">性别</p>
            <p className="text-sm font-medium text-gray-900">{worker.gender}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">年龄</p>
            <p className="text-sm font-medium text-gray-900">{worker.age}岁</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">出生日期</p>
            <p className="text-sm font-medium text-gray-900">{worker.birthDate}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">身份证号</p>
            <p className="text-sm font-medium text-gray-900">{worker.idCard}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">联系电话</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              <Phone className="w-3 h-3" />{worker.phone}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">电子邮箱</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              <Mail className="w-3 h-3" />{worker.email || '-'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500 mb-1">户籍地址</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{worker.address}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500 mb-1">现居住地址</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{worker.residenceAddress}
            </p>
          </div>
        </div>
      </div>

      {/* 紧急联系人 */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-red-500" />
          紧急联系人
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">姓名</p>
            <p className="text-sm font-medium text-gray-900">{worker.emergencyContact}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">关系</p>
            <p className="text-sm font-medium text-gray-900">{worker.emergencyRelation}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">联系电话</p>
            <p className="text-sm font-medium text-gray-900">{worker.emergencyPhone}</p>
          </div>
        </div>
      </div>

      {/* 工作信息 */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-emerald-600" />
          工作信息
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">部门</p>
            <p className="text-sm font-medium text-gray-900">{worker.department}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">班组</p>
            <p className="text-sm font-medium text-gray-900">{worker.team}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">岗位</p>
            <p className="text-sm font-medium text-gray-900">{worker.position}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">作业区域</p>
            <p className="text-sm font-medium text-gray-900">{worker.workArea}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">技能等级</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${SKILL_LEVEL_CONFIG[worker.skillLevel]?.badge || 'bg-gray-100 text-gray-600'}`}>
              {SKILL_LEVEL_CONFIG[worker.skillLevel]?.label || worker.skillLevel || '-'}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">工作年限</p>
            <p className="text-sm font-medium text-gray-900">{worker.workYears}年</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">工资类型</p>
            <p className="text-sm font-medium text-gray-900">{worker.wagesType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">入职日期</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{worker.hireDate}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">技能标签</p>
          <div className="flex flex-wrap gap-2">
            {worker.skillTags.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 合同信息 */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          合同信息
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">合同编号</p>
            <p className="text-sm font-medium text-gray-900">{worker.contractNo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">合同类型</p>
            <p className="text-sm font-medium text-gray-900">{worker.contractType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">合同状态</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              worker.contractStatus === '新签' ? 'bg-blue-100 text-blue-700' :
              worker.contractStatus === '续签' ? 'bg-green-100 text-green-700' :
              worker.contractStatus === '到期' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {worker.contractStatus}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">合同到期</p>
            <p className="text-sm font-medium text-gray-900">{worker.contractExpireDate}</p>
          </div>
        </div>
      </div>

      {/* 教育信息 */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          教育信息
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">学历</p>
            <p className="text-sm font-medium text-gray-900">{worker.education}</p>
          </div>
          {worker.major && (
            <div>
              <p className="text-xs text-gray-500 mb-1">专业</p>
              <p className="text-sm font-medium text-gray-900">{worker.major}</p>
            </div>
          )}
        </div>
      </div>

      {/* 培训记录 */}
      {worker.trainingRecords.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            培训记录
          </h3>
          <div className="space-y-3">
            {worker.trainingRecords.map((record) => (
              <div key={record.id} className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{record.trainingType}</span>
                  <span className="text-xs text-gray-500">{record.trainingDate}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{record.trainingContent}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>培训时长: {record.trainingHours}小时</span>
                  <span>讲师: {record.trainer}</span>
                  {record.certificate && <span>证书: {record.certificate}</span>}
                  {record.score && <span>成绩: {record.score}分</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 工作经历 */}
      {worker.workExperiences.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            工作经历
          </h3>
          <div className="space-y-3">
            {worker.workExperiences.map((exp) => (
              <div key={exp.id} className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{exp.company}</span>
                  <span className="text-xs text-gray-500">{exp.startDate} ~ {exp.endDate}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">岗位: {exp.position}</p>
                <p className="text-sm text-gray-600 mb-1">工作内容: {exp.workContent}</p>
                <p className="text-sm text-gray-500">离职原因: {exp.leavingReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 年度考核 */}
      {worker.annualAssessments.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            年度考核
          </h3>
          <div className="space-y-3">
            {worker.annualAssessments.map((assessment) => (
              <div key={assessment.id} className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{assessment.year}年度考核</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    assessment.rating === '优秀' ? 'bg-green-100 text-green-700' :
                    assessment.rating === '良好' ? 'bg-blue-100 text-blue-700' :
                    assessment.rating === '合格' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {assessment.rating} ({assessment.score}分)
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">考核日期: {assessment.assessmentDate} | 考核人: {assessment.assessor}</p>
                <p className="text-sm text-gray-600 mb-1">优点: {assessment.strengths}</p>
                <p className="text-sm text-gray-600 mb-1">不足: {assessment.weaknesses}</p>
                <p className="text-sm text-gray-600">目标: {assessment.goals}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 备注 */}
      {worker.remarks && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            备注
          </h3>
          <p className="text-sm text-gray-700">{worker.remarks}</p>
        </div>
      )}

      {/* 状态 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4">
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${WORKER_STATUS_CONFIG[worker.status]?.badge || 'bg-gray-100 text-gray-600'}`}>
            {WORKER_STATUS_CONFIG[worker.status]?.label || worker.status || '-'}
          </span>
        </div>
        <Button
          onClick={onClose}
          variant="secondary"
        >
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={true}
      onClose={onClose}
      title={`${worker.name} - 员工详情`}
      size="xl"
      showFooter={false}
      headerAction={
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5 text-white" />
        </Button>
      }
    >
      {content}
    </UnifiedModal>
  );
}

export default PersonnelDetailModal;
