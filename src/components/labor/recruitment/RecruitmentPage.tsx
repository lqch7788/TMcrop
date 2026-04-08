import { useState } from 'react';
import { Plus, UserPlus, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecruitment } from './hooks/useRecruitment';
import { RecruitmentFilters } from './RecruitmentFilters';
import { RecruitmentTable } from './RecruitmentTable';
import { RecruitmentDetailModal } from './RecruitmentDetailModal';
import { RecruitmentFormModal } from './RecruitmentFormModal';
import { RecruitmentRequest, RecruitmentFormData, RecruitmentSource } from './types';

// 当前用户模拟
const currentUser = {
  id: 'u001',
  name: '张明',
};

export function RecruitmentPage() {
  const navigate = useNavigate();
  const {
    recruitments,
    filters,
    setSearchTerm,
    setStatusFilter,
    setSourceFilter,
    resetFilters,
    createRecruitment,
    updateRecruitment,
    approveRecruitment,
    cancelRecruitment,
    completeRecruitment,
    deleteRecruitment,
  } = useRecruitment();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 详情弹窗状态
  const [selectedRecruitment, setSelectedRecruitment] = useState<RecruitmentRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 创建/编辑弹窗状态
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecruitment, setEditingRecruitment] = useState<RecruitmentRequest | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<RecruitmentFormData>({
    position: '',
    department: '',
    quantity: 1,
    reason: '',
    requirements: '',
    source: '' as RecruitmentSource,
    expectedDate: '',
    remarks: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRecruitment(null);
  };

  // 关闭表单弹窗
  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingRecruitment(null);
    resetForm();
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      position: '',
      department: '',
      quantity: 1,
      reason: '',
      requirements: '',
      source: '' as RecruitmentSource,
      expectedDate: '',
      remarks: '',
    });
    setFormErrors({});
  };

  // 打开创建弹窗
  const openCreateModal = () => {
    resetForm();
    setEditingRecruitment(null);
    setIsFormModalOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (recruitment: RecruitmentRequest) => {
    setEditingRecruitment(recruitment);
    setFormData({
      position: recruitment.position,
      department: recruitment.department,
      quantity: recruitment.quantity,
      reason: recruitment.reason,
      requirements: recruitment.requirements,
      source: recruitment.source,
      expectedDate: recruitment.expectedDate,
      remarks: recruitment.remarks || '',
    });
    setIsFormModalOpen(true);
  };

  // 打开详情弹窗
  const openDetailModal = (recruitment: RecruitmentRequest) => {
    setSelectedRecruitment(recruitment);
    setIsDetailModalOpen(true);
  };

  // 表单字段更新
  const updateFormField = (field: keyof RecruitmentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.position.trim()) errors.position = '请输入招聘岗位';
    if (!formData.department) errors.department = '请选择需求部门';
    if (!formData.quantity || formData.quantity < 1) errors.quantity = '请输入有效人数';
    if (!formData.source) errors.source = '请选择招聘来源';
    if (!formData.expectedDate) errors.expectedDate = '请选择期望到岗日期';
    if (!formData.reason.trim()) errors.reason = '请输入招聘原因';
    if (!formData.requirements.trim()) errors.requirements = '请输入岗位要求';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleFormSubmit = () => {
    if (!validateForm()) return;
    if (editingRecruitment) {
      updateRecruitment(editingRecruitment.id, formData);
    } else {
      createRecruitment(formData, currentUser.id, currentUser.name);
    }
    closeFormModal();
  };

  // 审批通过
  const handleApprove = (recruitment: RecruitmentRequest) => {
    if (window.confirm(`确定审批通过招聘申请 "${recruitment.requestCode}" 吗？`)) {
      approveRecruitment(recruitment.id, 'u005', '王经理', '同意招聘');
    }
  };

  // 完成招聘
  const handleComplete = (recruitment: RecruitmentRequest) => {
    if (window.confirm(`确定将 "${recruitment.requestCode}" 标记为已完成吗？`)) {
      completeRecruitment(recruitment.id, currentUser.id, currentUser.name);
    }
  };

  // 取消招聘
  const handleCancel = (recruitment: RecruitmentRequest) => {
    const reason = window.prompt('请输入取消原因：');
    if (reason !== null) {
      cancelRecruitment(recruitment.id, currentUser.id, currentUser.name, reason);
    }
  };

  // 删除
  const handleDelete = (recruitment: RecruitmentRequest) => {
    if (window.confirm(`确定要删除招聘申请 "${recruitment.requestCode}" 吗？`)) {
      deleteRecruitment(recruitment.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">招聘管理</h1>
              <p className="text-xs text-gray-500">管理招聘需求申请、审批和进度跟踪</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              新建招聘
            </button>
            <button
              onClick={() => navigate('/onboarding')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <UserPlus className="w-4 h-4" />
              办理入职
            </button>
          </div>
        </div>
      </div>

      {/* 筛选组件 */}
      <RecruitmentFilters
        searchTerm={filters.searchTerm}
        statusFilter={filters.statusFilter}
        sourceFilter={filters.sourceFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onSourceChange={setSourceFilter}
        onReset={resetFilters}
      />

      {/* 列表表格 */}
      <RecruitmentTable
        recruitments={recruitments}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onView={openDetailModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />

      {/* 详情弹窗 */}
      <RecruitmentDetailModal
        recruitment={selectedRecruitment}
        onClose={closeDetailModal}
      />

      {/* 创建/编辑表单弹窗 */}
      <RecruitmentFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        title={editingRecruitment ? '编辑招聘' : '新建招聘'}
        formData={formData}
        errors={formErrors}
        onFormChange={updateFormField}
      />
    </div>
  );
}

export default RecruitmentPage;
