import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { Worker, SKILL_TAGS } from '../../../types';

interface PersonnelFormModalProps {
  worker?: Worker | null;
  onSave: (worker: Worker) => void;
  onClose: () => void;
}

export function PersonnelFormModal({ worker, onSave, onClose }: PersonnelFormModalProps) {
  const [formData, setFormData] = useState<Partial<Worker>>({
    name: '',
    gender: '男',
    age: 25,
    birthDate: '',
    idCard: '',
    phone: '',
    email: '',
    wechat: '',
    address: '',
    residenceAddress: '',
    emergencyContact: '',
    emergencyRelation: '',
    emergencyPhone: '',
    department: '',
    team: '',
    position: '',
    workArea: '',
    skillLevel: '初级',
    skillTags: [],
    workYears: 0,
    wagesType: '月薪',
    hourlyRate: 0,
    hireDate: '',
    contractStatus: '新签',
    contractType: '固定期限',
    contractExpireDate: '',
    contractNo: '',
    education: '初中',
    major: '',
    trainingRecords: [],
    workExperiences: [],
    annualAssessments: [],
    status: '在职',
    remarks: '',
  });

  useEffect(() => {
    if (worker) {
      setFormData(worker);
    }
  }, [worker]);

  const handleChange = (field: keyof Worker, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      skillTags: prev.skillTags?.includes(tag)
        ? prev.skillTags.filter(t => t !== tag)
        : [...(prev.skillTags || []), tag]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData: Worker = {
      id: worker?.id || `W${Date.now()}`,
      workerId: worker?.workerId || `EMP${new Date().getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      ...formData,
    } as Worker;
    onSave(finalData);
  };

  const content = (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">姓名 *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">性别 *</label>
              <select
                value={formData.gender}
                onChange={e => handleChange('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">年龄</label>
              <input
                type="number"
                value={formData.age}
                onChange={e => handleChange('age', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">出生日期</label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={e => handleChange('birthDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">身份证号</label>
              <input
                type="text"
                value={formData.idCard}
                onChange={e => handleChange('idCard', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">联系电话 *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">电子邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">微信</label>
              <input
                type="text"
                value={formData.wechat}
                onChange={e => handleChange('wechat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">户籍地址</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">现居住地址</label>
              <input
                type="text"
                value={formData.residenceAddress}
                onChange={e => handleChange('residenceAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 紧急联系人 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">紧急联系人</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">姓名</label>
              <input
                type="text"
                value={formData.emergencyContact}
                onChange={e => handleChange('emergencyContact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">关系</label>
              <input
                type="text"
                value={formData.emergencyRelation}
                onChange={e => handleChange('emergencyRelation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">联系电话</label>
              <input
                type="tel"
                value={formData.emergencyPhone}
                onChange={e => handleChange('emergencyPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 工作信息 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">工作信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">部门 *</label>
              <select
                required
                value={formData.department}
                onChange={e => handleChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择</option>
                <option value="生产部">生产部</option>
                <option value="技术部">技术部</option>
                <option value="后勤部">后勤部</option>
                <option value="管理层">管理层</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">班组</label>
              <input
                type="text"
                value={formData.team}
                onChange={e => handleChange('team', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">岗位 *</label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={e => handleChange('position', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">作业区域</label>
              <input
                type="text"
                value={formData.workArea}
                onChange={e => handleChange('workArea', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">技能等级</label>
              <select
                value={formData.skillLevel}
                onChange={e => handleChange('skillLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="初级">初级</option>
                <option value="中级">中级</option>
                <option value="高级">高级</option>
                <option value="技师">技师</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">工作年限</label>
              <input
                type="number"
                value={formData.workYears}
                onChange={e => handleChange('workYears', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">工资类型</label>
              <select
                value={formData.wagesType}
                onChange={e => handleChange('wagesType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="计时">计时</option>
                <option value="计件">计件</option>
                <option value="月薪">月薪</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">入职日期</label>
              <input
                type="date"
                value={formData.hireDate}
                onChange={e => handleChange('hireDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-2">技能标签</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSkillTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    formData.skillTags?.includes(tag)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 合同信息 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">合同信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">合同编号</label>
              <input
                type="text"
                value={formData.contractNo}
                onChange={e => handleChange('contractNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">合同类型</label>
              <select
                value={formData.contractType}
                onChange={e => handleChange('contractType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="固定期限">固定期限</option>
                <option value="无固定期限">无固定期限</option>
                <option value="临时">临时</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">合同状态</label>
              <select
                value={formData.contractStatus}
                onChange={e => handleChange('contractStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="新签">新签</option>
                <option value="续签">续签</option>
                <option value="到期">到期</option>
                <option value="终止">终止</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">合同到期日期</label>
              <input
                type="date"
                value={formData.contractExpireDate}
                onChange={e => handleChange('contractExpireDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 教育信息 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">教育信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">学历</label>
              <select
                value={formData.education}
                onChange={e => handleChange('education', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="小学">小学</option>
                <option value="初中">初中</option>
                <option value="高中">高中</option>
                <option value="中专">中专</option>
                <option value="大专">大专</option>
                <option value="本科">本科</option>
                <option value="硕士及以上">硕士及以上</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">专业</label>
              <input
                type="text"
                value={formData.major}
                onChange={e => handleChange('major', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 备注 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">备注</h3>
          <textarea
            value={formData.remarks}
            onChange={e => handleChange('remarks', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入备注信息..."
          />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          保存
        </button>
      </div>
    </form>
  );

  return (
    <UnifiedModal
      isOpen={true}
      onClose={onClose}
      title={worker ? '编辑员工' : '新增员工'}
      size="xl"
      showFooter={false}
      headerAction={
        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      }
    >
      {content}
    </UnifiedModal>
  );
}

export default PersonnelFormModal;
