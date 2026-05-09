/**
 * 入职办理页面 Hook
 * 封装状态管理、API调用和数据处理逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUsers } from '../../../components/common/settings';
import { useApprovalContext } from '../../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';
import { useApprovalLevel } from '../../../hooks/useApprovalLevel';
import {
  OnboardingRecord,
  OnboardingFilters,
  OnboardingFormData,
  BatchMode,
  PaginationState,
  mapOnboardingStatus,
} from '../types/onboardingPage.types';

// 默认筛选条件
const DEFAULT_FILTERS: OnboardingFilters = {
  employeeName: '',
  department: '',
  status: '',
  startDate: '',
};

// 默认表单数据
const DEFAULT_FORM_DATA: OnboardingFormData = {
  employeeName: '',
  department: '生产部',
  position: '',
  expectedStartDate: '',
  education: '',
  major: '',
  contactPhone: '',
  emergencyContact: '',
  idCard: '',
  bankCard: '',
  remarks: '',
};

/**
 * 入职办理页面 Hook
 */
export function useOnboardingPage() {
  const { workers } = useUsers();
  const { addApproval, approve, reject, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<OnboardingFilters>(DEFAULT_FILTERS);

  /** 分页状态 */
  const [pagination, setPagination] = useState<PaginationState>({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<OnboardingFormData>(DEFAULT_FORM_DATA);

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<BatchMode>('none');

  /** 入职记录数据 */
  const [records, setRecords] = useState<OnboardingRecord[]>([]);

  // ============================================================
  // 数据处理
  // ============================================================

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选入职类型的审批记录
    const onboardApprovals = approvals.filter(a => a.type === ApprovalType.ONBOARD);

    // 转换为OnboardingRecord格式
    const onboardRecords: OnboardingRecord[] = onboardApprovals.map(approval => {
      const businessData = approval.businessLink as {
        employeeId?: string;
        employeeName?: string;
        department?: string;
        position?: string;
        expectedStartDate?: string;
        actualStartDate?: string;
        education?: string;
        major?: string;
        contactPhone?: string;
        emergencyContact?: string;
        idCard?: string;
        bankCard?: string;
      } | null;
      return {
        id: approval.id,
        employeeId: businessData?.employeeId || approval.applicantId,
        employeeName: businessData?.employeeName || approval.applicantName,
        department: businessData?.department || approval.applicantDepartment,
        position: businessData?.position || '',
        expectedStartDate: businessData?.expectedStartDate || approval.applyDate,
        actualStartDate: businessData?.actualStartDate,
        status: mapOnboardingStatus(approval.status),
        education: businessData?.education,
        major: businessData?.major,
        contactPhone: businessData?.contactPhone,
        emergencyContact: businessData?.emergencyContact,
        idCard: businessData?.idCard,
        bankCard: businessData?.bankCard,
        remarks: approval.remark,
      };
    });

    // 添加一些模拟初始数据（员工ID格式：EMP-YYYYMMDD-XXX）
    const mockRecords: OnboardingRecord[] = [
      { id: 'OB001', employeeId: 'EMP-20260501-001', employeeName: '赵敏', department: '生产部', position: '种植工', expectedStartDate: '2026-05-01', status: '待入职', education: '高中', major: '', contactPhone: '13800001111', emergencyContact: '赵刚', remarks: '' },
      { id: 'OB002', employeeId: 'EMP-20260420-001', employeeName: '孙华', department: '生产部', position: '农机手', expectedStartDate: '2026-04-20', actualStartDate: '2026-04-20', status: '已完成', education: '中专', major: '农业机械', contactPhone: '13800002222', emergencyContact: '孙强', remarks: '已完成入职培训' },
      { id: 'OB003', employeeId: 'EMP-20260510-001', employeeName: '周杰', department: '生产部', position: '农技员', expectedStartDate: '2026-05-10', status: '入职中', education: '本科', major: '农学', contactPhone: '13800003333', emergencyContact: '周明', remarks: '资料审核中' },
    ];

    setRecords([...mockRecords, ...onboardRecords]);
    setPagination(prev => ({ ...prev, total: mockRecords.length + onboardRecords.length }));
  }, [approvals]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.expectedStartDate < filters.startDate) return false;
      return true;
    });
  }, [records, filters]);

  /** 部门选项 */
  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, []);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof OnboardingFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 打开新增弹窗 */
  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: OnboardingRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 提交入职申请 */
  const handleSubmit = useCallback(() => {
    if (!formData.employeeName || !formData.expectedStartDate) {
      alert('请填写完整信息');
      return;
    }

    // 验证身份证号格式（18位）
    if (formData.idCard && !/^\d{17}[\dXx]$/.test(formData.idCard)) {
      alert('身份证号格式不正确，请输入18位身份证号');
      return;
    }

    // 验证银行卡号格式（16-19位）
    if (formData.bankCard && !/^\d{16,19}$/.test(formData.bankCard)) {
      alert('银行卡号格式不正确，请输入16-19位银行卡号');
      return;
    }

    // 生成员工ID：EMP-YYYYMMDD-XXX（标准格式：前缀-年月日-3位序号）
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const sequence = String(records.length + 1).padStart(3, '0');
    const generatedEmployeeId = `EMP-${dateStr}-${sequence}`;

    // 生成新记录
    const newRecord: OnboardingRecord = {
      id: `OB${Date.now()}`,
      employeeId: generatedEmployeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      position: formData.position,
      expectedStartDate: formData.expectedStartDate,
      status: '待入职',
      education: formData.education,
      major: formData.major,
      contactPhone: formData.contactPhone,
      emergencyContact: formData.emergencyContact,
      idCard: formData.idCard,
      bankCard: formData.bankCard,
      remarks: formData.remarks,
    };

    // 创建审批记录 - 使用分级审批动态生成审批人配置
    const approvalLevelResult = generateApprovers(ApprovalType.ONBOARDING, 0);

    const approval: Approval = {
      id: `APR-OB-${Date.now()}`,
      code: `SP-OB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.ONBOARDING,
      typeName: '入职申请',
      category: 'hr',
      title: `${formData.employeeName}入职申请`,
      description: formData.remarks || `申请入职${formData.department}`,
      applicantId: newRecord.employeeId,
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
        type: 'onboarding',
        requestId: newRecord.id,
        employeeId: newRecord.employeeId,
        employeeName: newRecord.employeeName,
        department: newRecord.department,
        position: newRecord.position,
        expectedStartDate: newRecord.expectedStartDate,
        education: newRecord.education,
        major: newRecord.major,
        contactPhone: newRecord.contactPhone,
        emergencyContact: newRecord.emergencyContact,
        idCard: formData.idCard,
        bankCard: formData.bankCard,
      },
    };

    // 添加到Context
    addApproval(approval);

    // 更新本地状态
    setRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  }, [formData, records, addApproval, generateApprovers]);

  /** 审批通过 */
  const handleApprove = useCallback((record: OnboardingRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意入职');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已完成' as const } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已完成' as const } : r)
      );
    }
  }, [approvals, approve]);

  /** 审批驳回 */
  const handleReject = useCallback((record: OnboardingRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合条件');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已取消' as const } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已取消' as const } : r)
      );
    }
  }, [approvals, reject]);

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

    const headers = ['员工姓名', '部门', '岗位', '预计入职日期', '实际入职日期', '状态', '联系方式', '紧急联系人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '预计入职日期': row.expectedStartDate,
      '实际入职日期': row.actualStartDate || '',
      '状态': row.status,
      '联系方式': row.contactPhone || '',
      '紧急联系人': row.emergencyContact || '',
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `入职记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, filteredData]);

  // ============================================================
  // 返回值
  // ============================================================

  return {
    // 状态
    filters,
    pagination,
    isFormModalOpen,
    isDetailModalOpen,
    selectedRecord,
    selectedRowKeys,
    formData,
    batchMode,
    records,
    filteredData,
    departmentOptions,
    // 方法
    setFilters,
    setPagination,
    setIsFormModalOpen,
    setIsDetailModalOpen,
    setSelectedRecord,
    setSelectedRowKeys,
    setFormData,
    setBatchMode,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
  };
}
