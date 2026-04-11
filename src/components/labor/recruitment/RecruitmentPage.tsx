import { useState } from 'react';
import { Plus, UserPlus, Briefcase, Edit, Trash2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecruitment } from './hooks/useRecruitment';
import { RecruitmentFilters } from './RecruitmentFilters';
import { RecruitmentTable } from './RecruitmentTable';
import { RecruitmentDetailModal } from './RecruitmentDetailModal';
import { RecruitmentFormModal } from './RecruitmentFormModal';
import { RecruitmentBatchEditModal } from './RecruitmentBatchEditModal';
import { RecruitmentRequest, RecruitmentFormData, RecruitmentSource } from './types';

// 导出格式弹窗
interface ExportFormatModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onFormatChange: (format: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ExportFormatModal({ isOpen, exportFormat, selectedCount, onFormatChange, onClose, onConfirm }: ExportFormatModalProps) {
  if (!isOpen) return null;

  const exportFormats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">×</button>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
            <div className="space-y-3">
              {exportFormats.map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    exportFormat === format.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => onFormatChange(e.target.value)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{format.label}</p>
                    <p className="text-xs text-gray-500">{format.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">取消</button>
            <button onClick={onConfirm} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">导出</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 删除确认弹窗
interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteWarningModal({ isOpen, selectedCount, onClose, onConfirm }: DeleteWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">删除招聘申请警告</h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-3 mb-6">
            <p>确定要删除选中的 <strong>{selectedCount}</strong> 个招聘申请吗？</p>
            <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">取消</button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">确认删除</button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 批量编辑状态
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<RecruitmentRequest>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

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

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === recruitments.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(recruitments.map(r => r.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    setShowDeleteWarning(true);
  };

  const handleDeleteConfirm = () => {
    // 从列表移除
    selectedRows.forEach(id => deleteRecruitment(id));
    setSelectedRows([]);
    setShowDeleteWarning(false);
  };

  // 导出
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = recruitments.filter(r => selectedRows.includes(r.id));
    const headers = ['招聘编号', '招聘岗位', '需求部门', '人数', '来源', '期望到岗', '状态', '申请人', '申请日期'];
    const exportData = selectedData.map(row => ({
      '招聘编号': row.requestCode,
      '招聘岗位': row.position,
      '需求部门': row.department,
      '人数': row.quantity,
      '来源': row.source,
      '期望到岗': row.expectedDate,
      '状态': row.status,
      '申请人': row.applicantName,
      '申请日期': row.applyDate,
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `招聘申请_${new Date().toISOString().slice(0, 10)}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
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
        showCheckbox={exportMode || batchEditMode || batchDeleteMode}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onView={openDetailModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : openCreateModal}
        onBatchEditClick={batchEditMode ? () => setShowBatchEditModal(true) : () => setBatchEditMode(true)}
        onBatchDeleteClick={batchDeleteMode ? handleBatchDelete : () => setBatchDeleteMode(true)}
        onBatchExportClick={exportMode ? handleConfirmExport : () => setExportMode(true)}
        onCancelBatchEdit={handleCancelBatch}
        onCancelBatchDelete={handleCancelBatch}
        onCancelExport={handleCancelExport}
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

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />

      {/* 批量编辑弹窗 */}
      <RecruitmentBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={recruitments}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={() => {
          setShowBatchEditModal(false);
          handleCancelBatch();
        }}
        onConfirmNext={() => {
          if (selectedRecordId && !editedRecordIds.includes(selectedRecordId)) {
            setEditedRecordIds([...editedRecordIds, selectedRecordId]);
          }
          const currentIndex = selectedRows.findIndex(r => r === selectedRecordId);
          const nextRecord = selectedRows[currentIndex + 1];
          if (nextRecord) {
            setSelectedRecordId(nextRecord);
          } else {
            setShowBatchEditModal(false);
            handleCancelBatch();
          }
        }}
      />
    </div>
  );
}

export default RecruitmentPage;
