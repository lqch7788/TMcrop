/**
 * 合同续签数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApprovalContext } from '../../../contexts/ApprovalContext';
import { useApprovalLevel } from '../../../hooks/useApprovalLevel';
import { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';
import {
  ContractRenewalRecord,
  ContractRenewalFilters,
  ContractRenewalFormData,
  ContractRenewalPagination,
  ContractRenewalStatus,
} from '../types/contractRenewal.types';

export interface UseContractRenewalReturn {
  // 状态
  filters: ContractRenewalFilters;
  setFilters: React.Dispatch<React.SetStateAction<ContractRenewalFilters>>;
  pagination: ContractRenewalPagination;
  setPagination: React.Dispatch<React.SetStateAction<ContractRenewalPagination>>;
  records: ContractRenewalRecord[];
  formData: ContractRenewalFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContractRenewalFormData>>;
  selectedRecord: ContractRenewalRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<ContractRenewalRecord | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  batchMode: 'none' | 'approve' | 'reject' | 'export';

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: ContractRenewalRecord[];
  departmentOptions: { value: string; label: string }[];

  // 事件处理
  handleFilterChange: (field: keyof ContractRenewalFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: ContractRenewalRecord) => void;
  handleStaffChange: (employeeId: string, employeeName: string, department: string, position: string, currentContractEnd: string) => void;
  handlePeriodChange: (period: number) => void;
  handleNewStartDateChange: (date: string) => void;
  handleSubmit: () => void;
  handleApprove: (record: ContractRenewalRecord) => void;
  handleReject: (record: ContractRenewalRecord) => void;
  handleBatchApprove: () => void;
  handleBatchReject: () => void;
  handleExport: () => void;
  setBatchMode: React.Dispatch<React.SetStateAction<'none' | 'approve' | 'reject' | 'export'>>;
}

/** 状态映射 */
function mapApprovalStatus(status: ApprovalStatus): ContractRenewalStatus {
  switch (status) {
    case ApprovalStatus.PENDING: return '待审批';
    case ApprovalStatus.APPROVED: return '已通过';
    case ApprovalStatus.REJECTED: return '已拒绝';
    case ApprovalStatus.CANCELLED: return '已取消';
    default: return '待审批';
  }
}

export function useContractRenewal(
  workers: { workerId: string; name: string; department: string; position: string; contractExpireDate?: string }[]
): UseContractRenewalReturn {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<ContractRenewalFilters>({
    employeeName: '',
    department: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState<ContractRenewalPagination>({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<ContractRenewalRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<ContractRenewalFormData>({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    currentContractEnd: '',
    newContractStart: '',
    newContractEnd: '',
    renewalPeriod: 12,
    newSalary: undefined,
    termsChange: '',
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

  /** 合同续签记录数据 */
  const [records, setRecords] = useState<ContractRenewalRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选合同续签类型的审批记录
    const contractApprovals = approvals.filter(a => a.type === ApprovalType.CONTRACT_RENEWAL);

    // 转换为ContractRenewalRecord格式
    const contractRecords: ContractRenewalRecord[] = contractApprovals.map(approval => {
      const businessData = approval.businessLink as {
        employeeId?: string;
        employeeName?: string;
        department?: string;
        position?: string;
        currentContractEnd?: string;
        newContractStart?: string;
        newContractEnd?: string;
        renewalPeriod?: number;
        newSalary?: number;
        termsChange?: string;
      } | null;
      return {
        id: approval.id,
        employeeId: businessData?.employeeId || approval.applicantId,
        employeeName: businessData?.employeeName || approval.applicantName,
        department: businessData?.department || approval.applicantDepartment,
        position: businessData?.position || '',
        currentContractEnd: businessData?.currentContractEnd || approval.applyDate,
        newContractStart: businessData?.newContractStart || '',
        newContractEnd: businessData?.newContractEnd || '',
        renewalPeriod: businessData?.renewalPeriod || 12,
        newSalary: businessData?.newSalary,
        termsChange: businessData?.termsChange,
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    // 添加一些模拟初始数据
    const mockRecords: ContractRenewalRecord[] = [
      { id: 'CR001', employeeId: 'EMP20240001', employeeName: '张伟民', department: '生产部', position: '种植工', currentContractEnd: '2026-05-31', newContractStart: '2026-06-01', newContractEnd: '2027-05-31', renewalPeriod: 12, newSalary: 6500, status: '已通过', approver: '王建国', approveTime: '2026-04-15 10:00:00' },
      { id: 'CR002', employeeId: 'EMP20240002', employeeName: '李秀英', department: '生产部', position: '农技员', currentContractEnd: '2026-06-30', newContractStart: '2026-07-01', newContractEnd: '2029-06-30', renewalPeriod: 36, status: '待审批' },
      { id: 'CR003', employeeId: 'EMP20240003', employeeName: '王建国', department: '生产部', position: '生产经理', currentContractEnd: '2026-04-30', newContractStart: '2026-05-01', newContractEnd: '2027-04-30', renewalPeriod: 12, termsChange: '岗位职责调整', status: '已拒绝', remarks: '合同条款需进一步协商' },
    ];

    setRecords([...mockRecords, ...contractRecords]);
    setPagination(prev => ({ ...prev, total: mockRecords.length + contractRecords.length }));
  }, [approvals]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.currentContractEnd < filters.startDate) return false;
      if (filters.endDate && record.currentContractEnd > filters.endDate) return false;
      return true;
    });
  }, [records, filters]);

  /** 部门选项 */
  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, [workers]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof ContractRenewalFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters({ employeeName: '', department: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 员工选择变化 */
  const handleStaffChange = useCallback((
    employeeId: string,
    employeeName: string,
    department: string,
    position: string,
    currentContractEnd: string
  ) => {
    // 检查是否在30天内到期
    const contractDate = new Date(currentContractEnd);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((contractDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 如果30天内到期，显示警告
    if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
      alert(`提醒：员工 ${employeeName} 的合同将在 ${daysUntilExpiry} 天后（${currentContractEnd}）到期，请及时处理续签！`);
    } else if (daysUntilExpiry <= 0) {
      alert(`警告：员工 ${employeeName} 的合同已到期（${currentContractEnd}），请立即处理！`);
    }

    setFormData(prev => ({
      ...prev,
      employeeId,
      employeeName,
      department,
      position,
      currentContractEnd,
      newContractStart: '',
      newContractEnd: '',
    }));
  }, []);

  /** 合同期限变化 */
  const handlePeriodChange = useCallback((period: number) => {
    if (formData.newContractStart && period > 0) {
      const startDate = new Date(formData.newContractStart);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + period);
      const endDateStr = endDate.toISOString().slice(0, 10);
      setFormData(prev => ({
        ...prev,
        renewalPeriod: period,
        newContractEnd: endDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, renewalPeriod: period }));
    }
  }, [formData.newContractStart]);

  /** 新合同开始日期变化 */
  const handleNewStartDateChange = useCallback((date: string) => {
    if (date && formData.renewalPeriod > 0) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + formData.renewalPeriod);
      const endDateStr = endDate.toISOString().slice(0, 10);
      setFormData(prev => ({
        ...prev,
        newContractStart: date,
        newContractEnd: endDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, newContractStart: date }));
    }
  }, [formData.renewalPeriod]);

  /** 打开新增弹窗 */
  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      currentContractEnd: '',
      newContractStart: '',
      newContractEnd: '',
      renewalPeriod: 12,
      newSalary: undefined,
      termsChange: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: ContractRenewalRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 提交合同续签申请 */
  const handleSubmit = useCallback(() => {
    if (!formData.employeeId || !formData.newContractStart || !formData.newContractEnd) {
      alert('请填写完整信息');
      return;
    }

    // 生成新记录
    const newRecord: ContractRenewalRecord = {
      id: `CR${Date.now()}`,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      position: formData.position,
      currentContractEnd: formData.currentContractEnd,
      newContractStart: formData.newContractStart,
      newContractEnd: formData.newContractEnd,
      renewalPeriod: formData.renewalPeriod,
      newSalary: formData.newSalary,
      termsChange: formData.termsChange,
      status: '待审批',
      remarks: formData.remarks,
    };

    // 创建审批记录
    const approvalLevelResult = generateApprovers(ApprovalType.CONTRACT_RENEWAL, 0);

    const approval: Approval = {
      id: `APR-CR-${Date.now()}`,
      code: `SP-CR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.CONTRACT_RENEWAL,
      typeName: '合同续签',
      category: 'hr',
      title: `${formData.employeeName}合同续签申请`,
      description: `合同期限: ${formData.newContractStart} 至 ${formData.newContractEnd}`,
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
        type: 'contract_renewal',
        requestId: newRecord.id,
        employeeId: newRecord.employeeId,
        employeeName: newRecord.employeeName,
        department: newRecord.department,
        position: newRecord.position,
        currentContractEnd: newRecord.currentContractEnd,
        newContractStart: newRecord.newContractStart,
        newContractEnd: newRecord.newContractEnd,
        renewalPeriod: newRecord.renewalPeriod,
        newSalary: newRecord.newSalary,
        termsChange: newRecord.termsChange,
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
  const handleApprove = useCallback((record: ContractRenewalRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意续签');
    }
    setRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, status: '已通过' as ContractRenewalStatus } : r)
    );
  }, [approve, approvals]);

  /** 审批驳回 */
  const handleReject = useCallback((record: ContractRenewalRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合续签条件');
    }
    setRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as ContractRenewalStatus } : r)
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

    const headers = ['员工姓名', '部门', '岗位', '当前合同到期日', '新合同开始日期', '新合同到期日', '续签期限', '新薪资', '状态', '审批人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '当前合同到期日': row.currentContractEnd,
      '新合同开始日期': row.newContractStart,
      '新合同到期日': row.newContractEnd,
      '续签期限': `${row.renewalPeriod}个月`,
      '新薪资': row.newSalary ? `¥${row.newSalary.toLocaleString()}` : '',
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
    a.download = `合同续签记录_${new Date().toISOString().slice(0, 10)}.csv`;
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

    // 事件处理
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleStaffChange,
    handlePeriodChange,
    handleNewStartDateChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
  };
}
