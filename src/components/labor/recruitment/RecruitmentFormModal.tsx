import { useState, useEffect } from 'react';
import { Modal, FormField } from '../../ui/Modal';
import { RecruitmentFormData, RecruitmentSource, EmploymentType, Priority } from './types';

interface Position {
  id: string;
  name: string;
  departmentOid: string;
  departmentName: string;
  code: string;
}

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

const employmentTypeOptions: { value: EmploymentType; label: string }[] = [
  { value: '正式工', label: '正式工' },
  { value: '临时工', label: '临时工' },
  { value: '季节工', label: '季节工' },
  { value: '实习生', label: '实习生' },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: '紧急', label: '紧急', color: 'red' },
  { value: '高', label: '高', color: 'orange' },
  { value: '普通', label: '普通', color: 'blue' },
  { value: '低', label: '低', color: 'gray' },
];

// 部门选项 - 与数据库 departments 表同步
const departmentOptions = [
  '生产部', '技术部', '仓储部', '财务部', '综合办'
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
  // 岗位列表状态
  const [positions, setPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  // 从 API 获取岗位列表
  useEffect(() => {
    if (!isOpen) return;

    const fetchPositions = async () => {
      setLoadingPositions(true);
      try {
        const response = await fetch('/api/basic-data/positions');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          console.log('[DEBUG] 获取到岗位数据:', result.data.length, '条');
          setPositions(result.data);
          // 如果没有选择部门，显示所有岗位
          if (!formData.department) {
            setFilteredPositions(result.data);
          }
        } else {
          console.warn('[DEBUG] API 返回数据格式异常:', result);
        }
      } catch (error) {
        console.error('[DEBUG] 获取岗位列表失败:', error);
      } finally {
        setLoadingPositions(false);
      }
    };

    fetchPositions();
  }, [isOpen]);

  // 当岗位列表更新时，如果已选择部门则重新过滤
  useEffect(() => {
    if (positions.length > 0 && formData.department) {
      const filtered = positions.filter(pos =>
        pos.departmentOid === formData.department
      );
      console.log('[DEBUG] 根据部门过滤岗位:', formData.department, '->', filtered.length, '条');
      setFilteredPositions(filtered);
    }
  }, [positions, formData.department]);

  // 当部门选择改变时，过滤岗位列表
  useEffect(() => {
    if (!formData.department) {
      // 如果没有选择部门，显示所有岗位
      console.log('[DEBUG] 未选择部门，显示所有岗位:', positions.length, '条');
      setFilteredPositions(positions);
    } else {
      // 根据部门过滤岗位
      const filtered = positions.filter(pos =>
        pos.departmentOid === formData.department
      );
      console.log('[DEBUG] 部门变更:', formData.department, '-> 匹配岗位:', filtered.length, '条');
      setFilteredPositions(filtered);
    }
  }, [formData.department, positions]);

  // 当部门改变时，清空岗位选择
  useEffect(() => {
    // 如果岗位当前值不在过滤后的列表中，清空选择
    if (formData.position) {
      const exists = filteredPositions.some(pos => pos.name === formData.position);
      if (!exists && filteredPositions.length > 0) {
        // 岗位选择不在新列表中，可以选择第一个，或保持当前值
        // 这里选择清空，强制用户重新选择
      }
    }
  }, [filteredPositions, formData.position]);

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
          {/* 需求部门 - 放在前面以便先选择 */}
          <FormField label="需求部门" required error={errors.department}>
            <select
              value={formData.department}
              onChange={(e) => {
                onFormChange('department', e.target.value);
                // 部门改变时，清空岗位选择
                onFormChange('position', '');
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">请选择部门</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </FormField>

          {/* 招聘岗位 */}
          <FormField label="招聘岗位" required error={errors.position}>
            {loadingPositions ? (
              <select
                value=""
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100"
              >
                <option value="">加载中...</option>
              </select>
            ) : filteredPositions.length === 0 && formData.department ? (
              <div className="relative">
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => onFormChange('position', e.target.value)}
                  placeholder="该部门暂无岗位，请手动输入"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-500">无匹配岗位</span>
              </div>
            ) : (
              <select
                value={formData.position}
                onChange={(e) => onFormChange('position', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">请选择岗位</option>
                {filteredPositions.map((pos) => (
                  <option key={pos.id} value={pos.name}>
                    {pos.name} {pos.code ? `(${pos.code})` : ''}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
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

          {/* 用工类型 */}
          <FormField label="用工类型" required error={errors.employmentType}>
            <select
              value={formData.employmentType}
              onChange={(e) => onFormChange('employmentType', e.target.value as EmploymentType)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">请选择</option>
              {employmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>

          {/* 优先级 */}
          <FormField label="优先级" required error={errors.priority}>
            <select
              value={formData.priority}
              onChange={(e) => onFormChange('priority', e.target.value as Priority)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 最低薪资 */}
          <FormField label="最低薪资 (元/月)">
            <input
              type="number"
              min="0"
              value={formData.salaryMin || ''}
              onChange={(e) => onFormChange('salaryMin', parseInt(e.target.value) || 0)}
              placeholder="请输入"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>

          {/* 最高薪资 */}
          <FormField label="最高薪资 (元/月)" error={errors.salaryMax}>
            <input
              type="number"
              min="0"
              value={formData.salaryMax || ''}
              onChange={(e) => onFormChange('salaryMax', parseInt(e.target.value) || 0)}
              placeholder="请输入"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.salaryMax ? 'border-red-500' : 'border-gray-200'}`}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

          {/* 期望到岗日期 */}
          <FormField label="期望到岗日期" required error={errors.expectedDate}>
            <input
              type="date"
              value={formData.expectedDate}
              onChange={(e) => onFormChange('expectedDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>
        </div>

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
            rows={2}
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
