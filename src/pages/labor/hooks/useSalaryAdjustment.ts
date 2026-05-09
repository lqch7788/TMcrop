/**
 * 调薪申请数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApprovalContext } from '../../../contexts/ApprovalContext';
import { useApprovalLevel } from '../../../hooks/useApprovalLevel';
import { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';
import {
  SalaryAdjustmentRecord,
  SalaryAdjustmentFilters,
  SalaryAdjustmentFormData,
  SalaryAdjustmentPagination,
  SalaryAdjustmentStatus,
} from '../types/salaryAdjustment.types';

export interface UseSalaryAdjustmentReturn {
  // 状态
  filters: SalaryAdjustmentFilters;
  setFilters: React.Dispatch<React.SetStateAction<SalaryAdjustmentFilters>>;
  pagination: SalaryAdjustmentPagination;
  setPagination: React.Dispatch<React.SetStateAction<SalaryAdjustmentPagination>>;
  records: SalaryAdjustmentRecord[];
  formData: SalaryAdjustmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<SalaryAdjustmentFormData>>;
  selectedRecord: SalaryAdjustmentRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<SalaryAdjustmentRecord | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: SalaryAdjustmentRecord[];
  departmentOptions: { value: string; label: string }[];

  // 计算属性
  displayAmount: number;
  displayRatio: number;

  // 事件处理
  handleFilterChange: (field: keyof SalaryAdjustmentFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: SalaryAdjustmentRecord) => void;
  handleStaffChange: (employeeId: string, employeeName: string, department: string, position: string, currentSalary: number) => void;
  handleProposedSalaryChange: (value: number) => void;
  handleSubmit: () => void;
  handleApprove: (record: SalaryAdjustmentRecord) => void;
  handleReject: (record: SalaryAdjustmentRecord) => void;
  handleBatchApprove: () => void;
  handleBatchReject: () => void;
  handleExport: () => void;
  setBatchMode: React.Dispatch<React.SetStateAction<'none' | 'approve' | 'reject' | 'export'>>;
}

/** 计算调整金额和比例 */
function calculateAdjustment(current: number, proposed: number) {
  const amount = proposed - current;
  const ratio = current > 0 ? (amount / current) * 100 : 0;
  return { amount, ratio };
}

/** 状态映射 */
function mapApprovalStatus(status: ApprovalStatus): SalaryAdjustmentStatus {
  switch (status) {
    case ApprovalStatus.PENDING: return '待审批';
    case ApprovalStatus.APPROVED: return '已通过';
    case ApprovalStatus.REJECTED: return '已拒绝';
    case ApprovalStatus.CANCELLED: return '已取消';
    default: return '待审批';
  }
}

export function useSalaryAdjustment(
  workers: { workerId: string; name: string; department: string; position: string; wagesType?: string; salary?: number }[]
): UseSalaryAdjustmentReturn {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<SalaryAdjustmentFilters>({
    employeeName: '',
    department: '',
    adjustmentType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState<SalaryAdjustmentPagination>({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<SalaryAdjustmentRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<SalaryAdjustmentFormData>({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    currentSalary: 0,
    proposedSalary: 0,
    adjustmentType: '年度调薪',
    effectiveDate: '',
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

  /** 调薪记录数据 */
  const [records, setRecords] = useState<SalaryAdjustmentRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选调薪类型的审批记录
    const salaryApprovals = approvals.filter(a => a.type === ApprovalType.SALARY_ADJUST);

    // 转换为SalaryAdjustmentRecord格式
    const salaryRecords: SalaryAdjustmentRecord[] = salaryApprovals.map(approval => {
      const businessData = approval.businessLink as {
        employeeId?: string;
        employeeName?: string;
        department?: string;
        position?: string;
        currentSalary?: number;
        proposedSalary?: number;
        adjustmentType?: string;
        effectiveDate?: string;
        reason?: string;
      } | null;
      return {
        id: approval.id,
        employeeId: businessData?.employeeId || approval.applicantId,
        employeeName: businessData?.employeeName || approval.applicantName,
        department: businessData?.department || approval.applicantDepartment,
        position: businessData?.position || '',
        currentSalary: businessData?.currentSalary || 0,
        proposedSalary: businessData?.proposedSalary || 0,
        adjustmentAmount: (businessData?.proposedSalary || 0) - (businessData?.currentSalary || 0),
        adjustmentRatio: businessData?.currentSalary ? ((businessData?.proposedSalary - businessData?.currentSalary) / businessData?.currentSalary * 100) : 0,
        adjustmentType: businessData?.adjustmentType || '',
        effectiveDate: businessData?.effectiveDate || approval.applyDate,
        reason: businessData?.reason || '',
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    // 添加一些模拟初始数据
    const mockRecords: SalaryAdjustmentRecord[] = [
      { id: 'SA001', employeeId: 'EMP20240001', employeeName: '张伟民', department: '生产部', position: '种植工', currentSalary: 6000, proposedSalary: 7200, adjustmentAmount: 1200, adjustmentRatio: 20, adjustmentType: '年度调薪', effectiveDate: '2026-05-01', status: '已通过', approver: '王建国', approveTime: '2026-04-20 10:00:00' },
      { id: 'SA002', employeeId: 'EMP20240002', employeeName: '李秀英', department: '生产部', position: '农技员', currentSalary: 8000, proposedSalary: 10000, adjustmentAmount: 2000, adjustmentRatio: 25, adjustmentType: '晋升调薪', effectiveDate: '2026-06-01', status: '待审批' },
      { id: 'SA003', employeeId: 'EMP20240003', employeeName: '王建国', department: '生产部', position: '生产经理', currentSalary: 15000, proposedSalary: 15000, adjustmentAmount: 0, adjustmentRatio: 0, adjustmentType: '市场调薪', effectiveDate: '2026-05-01', status: '已拒绝', remarks: '市场调研显示薪酬已具竞争力' },
    ];

    setRecords([...mockRecords, ...salaryRecords]);
    setPagination(prev => ({ ...prev, total: mockRecords.length + salaryRecords.length }));
  }, [approvals]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.adjustmentType && record.adjustmentType !== filters.adjustmentType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.effectiveDate < filters.startDate) return false;
      if (filters.endDate && record.effectiveDate > filters.endDate) return false;
      return true;
    });
  }, [records, filters]);

  /** 部门选项 */
  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, [workers]);

  /** 计算调整金额和比例 */
  const { amount: displayAmount, ratio: displayRatio } = useMemo(() => {
    return calculateAdjustment(formData.currentSalary, formData.proposedSalary);
  }, [formData.currentSalary, formData.proposedSalary]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof SalaryAdjustmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters({ employeeName: '', department: '', adjustmentType: '', status: '', startDate: '', endDate: '' });
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
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      currentSalary: 0,
      proposedSalary: 0,
      adjustmentType: '年度调薪',
      effectiveDate: '',
      reason: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: SalaryAdjustmentRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 员工选择变化 */
  const handleStaffChange = useCallback((
    employeeId: string,
    employeeName: string,
    department: string,
    position: string,
    currentSalary: number
  ) => {
    setFormData(prev => ({
      ...prev,
      employeeId,
      employeeName,
      department,
      position,
      currentSalary,
      proposedSalary: 0,
    }));
  }, []);

  /** 拟调薪资变化 */
  const handleProposedSalaryChange = useCallback((value: number) => {
    setFormData(prev => ({
      ...prev,
      proposedSalary: value,
    }));
  }, []);

  /** 提交调薪申请 */
  const handleSubmit = useCallback(() => {
    if (!formData.employeeId || !formData.proposedSalary || !formData.effectiveDate || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    if (formData.proposedSalary <= formData.currentSalary) {
      alert('申请工资必须大于当前工资');
      return;
    }

    const { amount, ratio } = calculateAdjustment(formData.currentSalary, formData.proposedSalary);

    // 生成新记录
    const newRecord: SalaryAdjustmentRecord = {
      id: `SA${Date.now()}`,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      position: formData.position,
      currentSalary: formData.currentSalary,
      proposedSalary: formData.proposedSalary,
      adjustmentAmount: amount,
      adjustmentRatio: ratio,
      adjustmentType: formData.adjustmentType,
      effectiveDate: formData.effectiveDate,
      reason: formData.reason,
      status: '待审批',
      remarks: formData.remarks,
    };

    // 创建审批记录
    const approvalLevelResult = generateApprovers(ApprovalType.SALARY_ADJUSTMENT, 0);

    const approval: Approval = {
      id: `APR-SA-${Date.now()}`,
      code: `SP-SA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.SALARY_ADJUSTMENT,
      typeName: '调薪申请',
      category: 'hr',
      title: `${formData.employeeName}调薪申请 (${formData.currentSalary} → ${formData.proposedSalary})`,
      description: formData.reason,
      applicantId: formData.employeeId,
      applicantName: formData.employeeName,
      applicantDepartment: formData.department,
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: 'normal',
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
        type: 'salary_adjustment',
        requestId: newRecord.id,
        employeeId: newRecord.employeeId,
        employeeName: newRecord.employeeName,
        department: newRecord.department,
        position: newRecord.position,
        currentSalary: newRecord.currentSalary,
        proposedSalary: newRecord.proposedSalary,
        adjustmentType: newRecord.adjustmentType,
        effectiveDate: newRecord.effectiveDate,
        reason: newRecord.reason,
      },
    };

    addApproval(approval);

    // 更新本地状态
    setRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  }, [formData, addApproval, generateApprovers]);

  /** 审批通过 */
  const handleApprove = useCallback((record: SalaryAdjustmentRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意调薪');
    }
    setRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, status: '已通过' as SalaryAdjustmentStatus } : r)
    );
  }, [approve, approvals]);

  /** 审批驳回 */
  const handleReject = useCallback((record: SalaryAdjustmentRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合调薪条件');
    }
    setRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as SalaryAdjustmentStatus } : r)
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

    const headers = ['员工姓名', '部门', '岗位', '当前薪资', '申请薪资', '调整金额', '调整比例', '调整类型', '生效日期', '状态', '审批人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '当前薪资': `¥${row.currentSalary.toLocaleString()}`,
      '申请薪资': `¥${row.proposedSalary.toLocaleString()}`,
      '调整金额': `¥${row.adjustmentAmount.toLocaleString()}`,
      '调整比例': `${row.adjustmentRatio.toFixed(1)}%`,
      '调整类型': row.adjustmentType,
      '生效日期': row.effectiveDate,
      '状态': row.status,
      '审批人': row.approver || '',
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `调薪记录_${new Date().toISOString().slice(0, 10)}.csv`;
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
    departmentOptions,

    // 计算属性
    displayAmount,
    displayRatio,

    // 事件处理
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleStaffChange,
    handleProposedSalaryChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
  };
}
