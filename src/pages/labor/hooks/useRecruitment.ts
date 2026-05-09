/**
 * 招聘申请数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApprovalContext } from '../../../contexts/ApprovalContext';
import { useApprovalLevel } from '../../../hooks/useApprovalLevel';
import { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';
import {
  RecruitmentRecord,
  RecruitmentFilters,
  RecruitmentFormData,
  RecruitmentPagination,
  RecruitmentStatus,
} from '../types/recruitment.types';

export interface UseRecruitmentReturn {
  // 状态
  filters: RecruitmentFilters;
  setFilters: React.Dispatch<React.SetStateAction<RecruitmentFilters>>;
  pagination: RecruitmentPagination;
  setPagination: React.Dispatch<React.SetStateAction<RecruitmentPagination>>;
  records: RecruitmentRecord[];
  formData: RecruitmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecruitmentFormData>>;
  selectedRecord: RecruitmentRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<RecruitmentRecord | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: RecruitmentRecord[];
  availablePositions: { id: string; name: string; departmentOid: string }[];

  // 事件处理
  handleFilterChange: (field: keyof RecruitmentFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: RecruitmentRecord) => void;
  handleDeptChange: (deptId: string) => void;
  handleHeadcountChange: (value: number) => void;
  handleSubmit: () => void;
  handleApprove: (record: RecruitmentRecord) => void;
  handleReject: (record: RecruitmentRecord) => void;
  handleBatchApprove: () => void;
  handleBatchReject: () => void;
  handleExport: () => void;
  setBatchMode: React.Dispatch<React.SetStateAction<'none' | 'approve' | 'reject' | 'export'>>;
}

/** 状态映射 */
function mapApprovalStatus(status: ApprovalStatus): RecruitmentStatus {
  switch (status) {
    case ApprovalStatus.PENDING: return '待审批';
    case ApprovalStatus.APPROVED: return '已通过';
    case ApprovalStatus.REJECTED: return '已拒绝';
    case ApprovalStatus.CANCELLED: return '已撤回';
    default: return '待审批';
  }
}

export function useRecruitment(
  departments: { oid: string; name: string }[],
  positions: { id: string; name: string; departmentOid: string }[]
): UseRecruitmentReturn {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<RecruitmentFilters>({
    recruitmentCode: '',
    deptId: '',
    position: '',
    status: '',
    priority: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState<RecruitmentPagination>({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<RecruitmentRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<RecruitmentFormData>({
    deptId: '',
    positionId: '',
    headcount: 1,
    employmentType: '正式工',
    salaryMin: 0,
    salaryMax: 0,
    priority: '普通',
    reason: '',
    remarks: '',
  });

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // Context & Hooks
  // ============================================================

  const { addApproval, approve, reject, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 招聘记录数据 */
  const [records, setRecords] = useState<RecruitmentRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选招聘类型的审批记录
    const recruitmentApprovals = approvals.filter(a => a.type === ApprovalType.RECRUITMENT);

    // 转换为RecruitmentRecord格式
    const recruitmentRecords: RecruitmentRecord[] = recruitmentApprovals.map(approval => {
      const businessData = approval.businessLink as {
        recruitmentId?: string;
        department?: string;
        position?: string;
        headcount?: number;
        employmentType?: string;
        salaryMin?: number;
        salaryMax?: number;
        priority?: string;
        reason?: string;
      } | null;

      return {
        id: approval.id,
        recruitmentCode: approval.code,
        deptId: businessData?.department || '',
        deptName: approval.applicantDepartment,
        positionId: businessData?.position || '',
        position: businessData?.position || '',
        headcount: businessData?.headcount || 0,
        employmentType: businessData?.employmentType || '正式工',
        salaryMin: businessData?.salaryMin || 0,
        salaryMax: businessData?.salaryMax || 0,
        priority: businessData?.priority || '普通',
        status: mapApprovalStatus(approval.status),
        reason: businessData?.reason || '',
        remarks: approval.remark,
        applicantId: approval.applicantId,
        applicantName: approval.applicantName,
        applyDate: approval.applyDate,
      };
    });

    setRecords(recruitmentRecords);
    setPagination(prev => ({ ...prev, total: recruitmentRecords.length }));
  }, [approvals]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.recruitmentCode && !record.recruitmentCode.toLowerCase().includes(filters.recruitmentCode.toLowerCase())) return false;
      if (filters.deptId && record.deptId !== filters.deptId) return false;
      if (filters.position && record.position !== filters.position) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.priority && record.priority !== filters.priority) return false;
      return true;
    });
  }, [records, filters]);

  /** 根据选择的部门筛选岗位 */
  const availablePositions = useMemo(() => {
    if (!formData.deptId) return positions;
    return positions.filter(p => p.departmentOid === formData.deptId);
  }, [formData.deptId, positions]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof RecruitmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters({ recruitmentCode: '', deptId: '', position: '', status: '', priority: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 打开新增弹窗 */
  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData({
      deptId: '',
      positionId: '',
      headcount: 1,
      employmentType: '正式工',
      salaryMin: 0,
      salaryMax: 0,
      priority: '普通',
      reason: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: RecruitmentRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 部门选择变化 */
  const handleDeptChange = useCallback((deptId: string) => {
    setFormData(prev => ({ ...prev, deptId, positionId: '' }));
  }, []);

  /** 招聘人数校验 */
  const handleHeadcountChange = useCallback((value: number) => {
    if (value < 1) {
      setFormData(prev => ({ ...prev, headcount: 1 }));
    } else {
      setFormData(prev => ({ ...prev, headcount: Math.floor(value) }));
    }
  }, []);

  /** 提交招聘申请 */
  const handleSubmit = useCallback(() => {
    if (!formData.deptId || !formData.positionId || formData.headcount < 1 || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    if (formData.salaryMin > formData.salaryMax) {
      alert('最低薪资不能大于最高薪资');
      return;
    }

    // 获取部门名称
    const dept = departments.find(d => d.oid === formData.deptId);
    const position = positions.find(p => p.id === formData.positionId);

    // 生成新记录
    const newRecord: RecruitmentRecord = {
      id: `REC${Date.now()}`,
      recruitmentCode: `ZP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      deptId: formData.deptId,
      deptName: dept?.name || '',
      positionId: formData.positionId,
      position: position?.name || '',
      headcount: formData.headcount,
      employmentType: formData.employmentType,
      salaryMin: formData.salaryMin,
      salaryMax: formData.salaryMax,
      priority: formData.priority,
      status: '待审批',
      reason: formData.reason,
      remarks: formData.remarks,
      applicantId: 'U001',
      applicantName: '王建华',
      applyDate: new Date().toISOString().slice(0, 10),
    };

    // 创建审批记录
    const approvalLevelResult = generateApprovers(ApprovalType.RECRUITMENT, 0);

    const approval: Approval = {
      id: `APR-${Date.now()}`,
      code: newRecord.recruitmentCode,
      type: ApprovalType.RECRUITMENT,
      typeName: '招聘申请',
      category: 'hr',
      title: `${dept?.name || ''}${position?.name || ''}招聘${formData.headcount}人`,
      description: formData.reason,
      applicantId: 'U001',
      applicantName: '王建华',
      applicantDepartment: dept?.name || '',
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: formData.priority === '紧急' ? 'urgent' : formData.priority === '高' ? 'high' : formData.priority === '低' ? 'low' : 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: approvalLevelResult.totalSteps,
      approvers: approvalLevelResult.approvers,
      records: [],
      remark: formData.remarks,
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'recruitment',
        requestId: newRecord.id,
        recruitmentId: newRecord.id,
        department: newRecord.deptName,
        position: newRecord.position,
        headcount: newRecord.headcount,
        employmentType: newRecord.employmentType,
        salaryMin: newRecord.salaryMin,
        salaryMax: newRecord.salaryMax,
        priority: newRecord.priority as 'low' | 'normal' | 'high' | 'urgent',
        reason: newRecord.reason,
      },
    };

    addApproval(approval);

    // 更新本地状态
    setRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  }, [formData, departments, positions, addApproval, generateApprovers]);

  /** 审批通过 */
  const handleApprove = useCallback((record: RecruitmentRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意招聘');
    }
    setRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, status: '已通过' as RecruitmentStatus } : r)
    );
  }, [approve, approvals]);

  /** 审批驳回 */
  const handleReject = useCallback((record: RecruitmentRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合招聘条件');
    }
    setRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as RecruitmentStatus } : r)
    );
  }, [reject, approvals]);

  /** 批量审批通过 */
  const handleBatchApprove = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = records.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, records, handleApprove]);

  /** 批量审批驳回 */
  const handleBatchReject = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = records.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, records, handleReject]);

  /** 导出功能 */
  const handleExport = useCallback(() => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['招聘编号', '申请部门', '招聘岗位', '人数', '用工类型', '薪资范围', '优先级', '状态', '申请原因', '申请日期'];
    const exportData = dataToExport.map(row => ({
      '招聘编号': row.recruitmentCode,
      '申请部门': row.deptName,
      '招聘岗位': row.position,
      '人数': row.headcount,
      '用工类型': row.employmentType,
      '薪资范围': `${row.salaryMin}-${row.salaryMax}`,
      '优先级': row.priority,
      '状态': row.status,
      '申请原因': row.reason,
      '申请日期': row.applyDate,
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `招聘申请_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, filteredData]);

  return {
    // 状态
    filters,
    setFilters,
    pagination,
    setPagination,
    records,
    formData,
    setFormData,
    selectedRecord,
    setSelectedRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    batchMode,

    // 弹窗状态
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,

    // 数据
    filteredData,
    availablePositions,

    // 事件处理
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleDeptChange,
    handleHeadcountChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
  };
}
