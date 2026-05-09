/**
 * 加班申请页面 Hook
 * 封装状态管理和业务逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApprovalContext } from '../../../../../contexts/ApprovalContext';
import { useApprovalLevel } from '../../../../../hooks/useApprovalLevel';
import { useUsers } from '../../../../../components/common/settings';
import { Approval, ApprovalType, ApprovalStatus } from '../../../../../types/approval';
import { overtimeCalculationService } from '../../../../../services/overtimeCalculationService';
import type {
  OvertimeRecord,
  OvertimeFilters,
  OvertimeFormData,
  BatchMode,
  PaginationState,
  OvertimeFeePreview,
} from '../types/overtimePage.types';
import { OVERTIME_TYPE_MAP, DEFAULT_BASE_SALARY } from '../types/overtimePage.types';

// 默认表单数据
const DEFAULT_FORM_DATA: OvertimeFormData = {
  staffId: '',
  staffName: '',
  overtimeType: '工作日加班',
  startTime: '',
  endTime: '',
  hours: 0,
  reason: '',
  remarks: '',
};

export function useOvertimePage() {
  const { workers } = useUsers();
  const { addApproval, approve, reject, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 状态定义
  // ============================================================

  const [filters, setFilters] = useState<OvertimeFilters>({
    staffName: '',
    overtimeType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState<PaginationState>({ current: 1, pageSize: 10, total: 0 });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [formData, setFormData] = useState<OvertimeFormData>(DEFAULT_FORM_DATA);

  const [batchMode, setBatchMode] = useState<BatchMode>('none');

  // ============================================================
  // 数据处理
  // ============================================================

  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    const overtimeApprovals = approvals.filter(a => a.type === ApprovalType.OVERTIME);

    const records: OvertimeRecord[] = overtimeApprovals.map(approval => {
      const businessData = approval.businessLink as { overtimeType?: string; startTime?: string; endTime?: string; hours?: number; reason?: string } | null;
      return {
        id: approval.id,
        staffId: approval.applicantId,
        staffName: approval.applicantName,
        overtimeType: businessData?.overtimeType || '工作日加班',
        startTime: businessData?.startTime || approval.applyDate,
        endTime: businessData?.endTime || approval.applyDate,
        hours: businessData?.hours || 0,
        reason: businessData?.reason || '',
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    setOvertimeRecords(records);
    setPagination(prev => ({ ...prev, total: records.length }));
  }, [approvals]);

  /** 状态映射 */
  const mapApprovalStatus = useCallback((status: ApprovalStatus): OvertimeRecord['status'] => {
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
    return overtimeRecords.filter(record => {
      if (filters.staffName && !record.staffName.includes(filters.staffName)) return false;
      if (filters.overtimeType && record.overtimeType !== filters.overtimeType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.startTime < filters.startDate) return false;
      if (filters.endDate && record.endTime > filters.endDate) return false;
      return true;
    });
  }, [overtimeRecords, filters]);

  /** 加班费预览计算 */
  const overtimeFeePreview = useMemo((): OvertimeFeePreview | null => {
    if (formData.hours <= 0) return null;
    const overtimeTypeEnum = OVERTIME_TYPE_MAP[formData.overtimeType];
    const hourlyRate = overtimeCalculationService.calculateHourlyRate(DEFAULT_BASE_SALARY);
    const rate = overtimeCalculationService.getOvertimeTypeRate(overtimeTypeEnum);
    const totalFee = overtimeCalculationService.calculateOvertimePay(DEFAULT_BASE_SALARY, formData.hours, overtimeTypeEnum);
    const rateText = rate === 1.5 ? '1.5倍' : rate === 2.0 ? '2倍' : '3倍';
    return {
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      rate,
      rateText,
      totalFee: Math.round(totalFee * 100) / 100,
    };
  }, [formData.hours, formData.overtimeType]);

  // ============================================================
  // 事件处理
  // ============================================================

  const handleFilterChange = useCallback((field: keyof OvertimeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ staffName: '', overtimeType: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenDetailModal = useCallback((record: OvertimeRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 计算加班时长 */
  const calculateHours = useCallback((start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate <= startDate) return 0;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
  }, []);

  /** 员工选择变化 */
  const handleStaffChange = useCallback((staffId: string) => {
    const worker = workers.find(w => w.workerId === staffId);
    if (worker) {
      setFormData(prev => ({ ...prev, staffId, staffName: worker.name }));
    }
  }, [workers]);

  /** 时间变化 - 重新计算时长 */
  const handleTimeChange = useCallback((field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      if (field === 'startTime') {
        newFormData.hours = calculateHours(value, prev.endTime);
      } else {
        newFormData.hours = calculateHours(prev.startTime, value);
      }
      return newFormData;
    });
  }, [calculateHours]);

  /** 提交加班申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.staffId || !formData.startTime || !formData.endTime || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    try {
      const newRecord: OvertimeRecord = {
        id: `OT${Date.now()}`,
        staffId: formData.staffId,
        staffName: formData.staffName,
        overtimeType: formData.overtimeType,
        startTime: formData.startTime,
        endTime: formData.endTime,
        hours: formData.hours,
        reason: formData.reason,
        status: '待审批',
        remarks: formData.remarks,
      };

      // 创建审批记录 - 使用分级审批动态生成审批人配置（加班2小时内免审批）
      const approvalLevelResult = generateApprovers(ApprovalType.OVERTIME, 0, { overtimeHours: formData.hours });

      const approval: Approval = {
        id: `APR-${Date.now()}`,
        code: `OT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
        type: ApprovalType.OVERTIME,
        typeName: '加班申请',
        category: 'hr',
        title: `${formData.staffName}申请${formData.overtimeType}${formData.hours}小时`,
        description: formData.reason,
        applicantId: formData.staffId,
        applicantName: formData.staffName,
        applicantDepartment: workers.find(w => w.workerId === formData.staffId)?.department || '生产部',
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
          type: 'overtime',
          requestId: newRecord.id,
          overtimeType: formData.overtimeType,
          startTime: formData.startTime,
          endTime: formData.endTime,
          hours: formData.hours,
          reason: formData.reason,
        },
      };

      // 持久化加班记录到加班费计算服务
      const overtimeTypeEnum = OVERTIME_TYPE_MAP[formData.overtimeType];
      await overtimeCalculationService.addOvertimeRecord({
        employeeId: formData.staffId,
        date: formData.startTime.split('T')[0],
        startTime: formData.startTime.split('T')[1] || formData.startTime,
        endTime: formData.endTime.split('T')[1] || formData.endTime,
        hours: formData.hours,
        type: overtimeTypeEnum,
        baseSalary: DEFAULT_BASE_SALARY,
        status: 'pending',
      });

      await addApproval(approval);
      setOvertimeRecords(prev => [newRecord, ...prev]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      setIsFormModalOpen(false);
      alert('提交成功！');
    } catch (error) {
      console.error('提交加班申请失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, addApproval, generateApprovers, workers]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: OvertimeRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      try {
        await approve(approval.id, '同意');
        setOvertimeRecords(prev =>
          prev.map(r => r.id === record.id ? { ...r, status: '已通过' as const } : r)
        );
      } catch (error) {
        console.error('审批通过失败:', error);
        alert('操作失败，请重试');
      }
    }
  }, [approvals, approve]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: OvertimeRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      try {
        await reject(approval.id, '不符合条件');
        setOvertimeRecords(prev =>
          prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as const } : r)
        );
      } catch (error) {
        console.error('审批驳回失败:', error);
        alert('操作失败，请重试');
      }
    }
  }, [approvals, reject]);

  /** 批量审批通过 */
  const handleBatchApprove = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = overtimeRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, overtimeRecords, handleApprove]);

  /** 批量审批驳回 */
  const handleBatchReject = useCallback(() => {
    selectedRowKeys.forEach(key => {
      const record = overtimeRecords.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, overtimeRecords, handleReject]);

  /** 导出功能 */
  const handleExport = useCallback(() => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['员工姓名', '加班类型', '开始时间', '结束时间', '时长(小时)', '状态', '加班原因', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.staffName,
      '加班类型': row.overtimeType,
      '开始时间': row.startTime,
      '结束时间': row.endTime,
      '时长(小时)': row.hours,
      '状态': row.status,
      '加班原因': row.reason,
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `加班记录_${new Date().toISOString().slice(0, 10)}.csv`;
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
    overtimeRecords,
    filteredData,
    overtimeFeePreview,
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
    handleTimeChange,
    handleStaffChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
  };
}
