/**
 * 考勤补录页面 Hook
 * 封装状态管理和业务逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApprovalContext } from '../../../../../contexts/ApprovalContext';
import { useApprovalLevel } from '../../../../../hooks/useApprovalLevel';
import { useUsers } from '../../../../../components/common/settings';
import { Approval, ApprovalType, ApprovalStatus } from '../../../../../types/approval';
import type {
  AttendanceRepairRecord,
  AttendanceRepairFilters,
  AttendanceRepairFormData,
  BatchMode,
  PaginationState,
} from '../types/attendanceRepairPage.types';

// 默认表单数据
const DEFAULT_FORM_DATA: AttendanceRepairFormData = {
  employeeId: '',
  employeeName: '',
  department: '',
  repairDate: new Date().toISOString().slice(0, 10),
  checkInTime: '09:00',
  checkOutTime: '18:00',
  reason: '忘记打卡',
  customReason: '',
  remarks: '',
};

export function useAttendanceRepairPage() {
  const { workers } = useUsers();
  const { addApproval, approve, reject, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<AttendanceRepairFilters>({
    employeeName: '',
    department: '',
    reason: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState<PaginationState>({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRepairRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<AttendanceRepairFormData>(DEFAULT_FORM_DATA);

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<BatchMode>('none');

  // ============================================================
  // 数据处理
  // ============================================================

  /** 考勤补录记录数据 */
  const [records, setRecords] = useState<AttendanceRepairRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选考勤补录类型的审批记录
    const repairApprovals = approvals.filter(a => a.type === ApprovalType.ATTENDANCE_REPAIR);

    // 转换为AttendanceRepairRecord格式
    const repairRecords: AttendanceRepairRecord[] = repairApprovals.map(approval => {
      const businessData = approval.businessLink as { employeeId?: string; employeeName?: string; department?: string; repairDate?: string; checkInTime?: string; checkOutTime?: string; reason?: string } | null;
      return {
        id: approval.id,
        employeeId: businessData?.employeeId || approval.applicantId,
        employeeName: businessData?.employeeName || approval.applicantName,
        department: businessData?.department || approval.applicantDepartment,
        repairDate: businessData?.repairDate || approval.applyDate,
        checkInTime: businessData?.checkInTime || '09:00',
        checkOutTime: businessData?.checkOutTime || '18:00',
        reason: businessData?.reason || '',
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    // 添加一些模拟初始数据
    const mockRecords: AttendanceRepairRecord[] = [
      { id: 'AR001', employeeId: 'EMP20240001', employeeName: '张伟民', department: '生产部', repairDate: '2026-04-20', checkInTime: '08:55', checkOutTime: '18:30', reason: '忘记打卡', status: '已通过', approver: '王建国', approveTime: '2026-04-20 17:00:00' },
      { id: 'AR002', employeeId: 'EMP20240002', employeeName: '李秀英', department: '生产部', repairDate: '2026-04-21', checkInTime: '09:10', checkOutTime: '18:00', reason: '外出办公', status: '待审批' },
      { id: 'AR003', employeeId: 'EMP20240003', employeeName: '王建国', department: '生产部', repairDate: '2026-04-22', checkInTime: '08:50', checkOutTime: '19:00', reason: '出差', status: '已拒绝', remarks: '出差未提供证明' },
    ];

    setRecords([...mockRecords, ...repairRecords]);
    setPagination(prev => ({ ...prev, total: mockRecords.length + repairRecords.length }));
  }, [approvals]);

  /** 状态映射 */
  const mapApprovalStatus = useCallback((status: ApprovalStatus): AttendanceRepairRecord['status'] => {
    switch (status) {
      case ApprovalStatus.PENDING: return '待审批';
      case ApprovalStatus.APPROVED: return '已通过';
      case ApprovalStatus.REJECTED: return '已拒绝';
      case ApprovalStatus.CANCELLED: return '已取消';
      default: return '待审批';
    }
  }, []);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.reason && record.reason !== filters.reason) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.repairDate < filters.startDate) return false;
      if (filters.endDate && record.repairDate > filters.endDate) return false;
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
  const handleFilterChange = useCallback((field: keyof AttendanceRepairFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters({ employeeName: '', department: '', reason: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 员工选择变化 */
  const handleStaffChange = useCallback((employeeId: string) => {
    const worker = workers.find(w => w.workerId === employeeId);
    if (worker) {
      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: worker.name,
        department: worker.department,
      }));
    }
  }, [workers]);

  /** 打开新增弹窗 */
  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: AttendanceRepairRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 提交考勤补录申请 */
  const handleSubmit = useCallback(() => {
    if (!formData.employeeId || !formData.repairDate || !formData.checkInTime || !formData.checkOutTime) {
      alert('请填写完整信息');
      return;
    }

    // 当选择"其他"时，必须填写具体原因
    if (formData.reason === '其他' && !formData.customReason.trim()) {
      alert('请填写具体的补录原因');
      return;
    }

    // 如果选择"其他"，使用自定义原因
    const finalReason = formData.reason === '其他' ? formData.customReason : formData.reason;

    // 生成新记录
    const newRecord: AttendanceRepairRecord = {
      id: `AR${Date.now()}`,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      repairDate: formData.repairDate,
      checkInTime: formData.checkInTime,
      checkOutTime: formData.checkOutTime,
      reason: finalReason,
      status: '待审批',
      remarks: formData.remarks,
    };

    // 创建审批记录 - 使用分级审批动态生成审批人配置
    const approvalLevelResult = generateApprovers(ApprovalType.ATTENDANCE_REPAIR, 0);

    const approval: Approval = {
      id: `APR-AR-${Date.now()}`,
      code: `SP-AR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.ATTENDANCE_REPAIR,
      typeName: '考勤补录',
      category: 'hr',
      title: `${formData.employeeName}考勤补录申请`,
      description: `${formData.repairDate} ${formData.checkInTime}-${formData.checkOutTime} (${finalReason})`,
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
        type: 'attendance_repair',
        requestId: newRecord.id,
        employeeId: newRecord.employeeId,
        employeeName: newRecord.employeeName,
        department: newRecord.department,
        repairDate: newRecord.repairDate,
        checkInTime: newRecord.checkInTime,
        checkOutTime: newRecord.checkOutTime,
        reason: newRecord.reason,
      },
    };

    // 添加到Context
    addApproval(approval);

    // 更新本地状态
    setRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  }, [formData, addApproval, generateApprovers]);

  /** 审批通过 */
  const handleApprove = useCallback((record: AttendanceRepairRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意补录');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as const } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as const } : r)
      );
    }
  }, [approvals, approve]);

  /** 审批驳回 */
  const handleReject = useCallback((record: AttendanceRepairRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合补录条件');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as const } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as const } : r)
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

    const headers = ['员工姓名', '部门', '补录日期', '上班时间', '下班时间', '补录原因', '状态', '审批人', '审批时间', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '补录日期': row.repairDate,
      '上班时间': row.checkInTime,
      '下班时间': row.checkOutTime,
      '补录原因': row.reason,
      '状态': row.status,
      '审批人': row.approver || '',
      '审批时间': row.approveTime || '',
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `考勤补录记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, filteredData]);

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
    handleStaffChange,
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
