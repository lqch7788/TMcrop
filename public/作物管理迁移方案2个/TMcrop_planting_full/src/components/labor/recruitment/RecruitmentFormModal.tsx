import { Modal, FormField } from '../../ui/Modal';
import { RecruitmentFormData, RecruitmentSource } from './types';

interface RecruitmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  formData: RecruitmentFormData;
  errors: Record<string, string>;
  onFormChange: (field: keyof RecruitmentFormData, value: string | number) => void;
}

const sourceOptions: { value: RecruitmentSource; label: string }[] = [
  { value: '劳务公司', label: '劳务公司' },
  { value: '个人零工', label: '个人零工' },
  { value: '学生实习', label: '学生实习' },
  { value: '内部推荐', label: '内部推荐' },
];

const departmentOptions = [
  '生产部', '采收部', '技术部', '设备部', '仓储部', '包装部', '质量部', '安全部', '行政部', '财务部'
];

export function RecruitmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  formData,
  errors,
  onFormChange,
}: RecruitmentFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      onSubmit={onSubmit}
      submitText="提交申请"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 招聘岗位 */}
          <FormField label="招聘岗位" required error={errors.position}>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => onFormChange('position', e.target.value)}
              placeholder="请输入招聘岗位"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>

          {/* 需求部门 */}
          <FormField label="需求部门" required error={errors.department}>
            <select
              value={formData.department}
              onChange={(e) => onFormChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">请选择部门</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 招聘人数 */}
          <FormField label="招聘人数" required error={errors.quantity}>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => onFormChange('quantity', parseInt(e.target.value) || 0)}
              placeholder="请输入人数"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>

          {/* 招聘来源 */}
          <FormField label="招聘来源" required error={errors.source}>
            <select
              value={formData.source}
              onChange={(e) => onFormChange('source', e.target.value as RecruitmentSource)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">请选择来源</option>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* 期望到岗日期 */}
        <FormField label="期望到岗日期" required error={errors.expectedDate}>
          <input
            type="date"
            value={formData.expectedDate}
            onChange={(e) => onFormChange('expectedDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </FormField>

        {/* 招聘原因 */}
        <FormField label="招聘原因" required error={errors.reason}>
          <textarea
            value={formData.reason}
            onChange={(e) => onFormChange('reason', e.target.value)}
            placeholder="请输入招聘原因"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </FormField>

        {/* 岗位要求 */}
        <FormField label="岗位要求" required error={errors.requirements}>
          <textarea
            value={formData.requirements}
            onChange={(e) => onFormChange('requirements', e.target.value)}
            placeholder="请输入岗位要求"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </FormField>

        {/* 备注 */}
        <FormField label="备注">
          <textarea
            value={formData.remarks || ''}
            onChange={(e) => onFormChange('remarks', e.target.value)}
            placeholder="请输入备注信息（可选）"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default RecruitmentFormModal;
