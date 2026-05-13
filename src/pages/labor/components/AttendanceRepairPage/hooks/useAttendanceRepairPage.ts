/**
 * 考勤补录页面 Hook
 * 封装状态管理和业务逻辑
 * 使用 React Query 和 API 服务
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWorkerStore } from '../../../../../stores';
import {
  useAttendanceRepairRecords,
  useCreateAttendanceRepair,
  useUpdateAttendanceRepair,
} from '@/hooks/useAttendanceRepairQueries';
import type { AttendanceRepairRecord as ApiAttendanceRepairRecord, CreateAttendanceRepairParams } from '@/services/apiAttendanceRepairService';
import type {
  AttendanceRepairRecord,
  AttendanceRepairFilters,
  AttendanceRepairFormData,
  BatchMode,
  PaginationState,
} from '../types/attendanceRepairPage.types';

// API 数据转换为组件内部格式
function mapApiToComponent(apiRecord: ApiAttendanceRepairRecord): AttendanceRepairRecord {
  return {
    id: apiRecord.id,
    employeeId: apiRecord.employeeId,
    employeeName: apiRecord.employeeName,
    department: apiRecord.department,
    repairDate: apiRecord.repairDate,
    checkInTime: apiRecord.checkInTime,
    checkOutTime: apiRecord.checkOutTime,
    reason: apiRecord.reason,
    status: apiRecord.statusLabel as any,
    approver: apiRecord.approver,
    approveTime: apiRecord.approveTime,
    remarks: apiRecord.remarks,
  };
}

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
  const workers = useWorkerStore((state) => state.workers);
  const loadWorkers = useWorkerStore((state) => state.loadWorkers);

  useEffect(() => {
    if (workers.length === 0) {
      loadWorkers();
    }
  }, [workers.length, loadWorkers]);

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
  // React Query
  // ============================================================

  const queryFilters = useMemo(() => ({
    employeeName: filters.employeeName || undefined,
    department: filters.department || undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: pagination.current,
    limit: pagination.pageSize,
  }), [pagination.current, pagination.pageSize]);

  const { data: apiData, refetch } = useAttendanceRepairRecords(queryFilters, queryPagination);

  // 转换 API 数据
  const records: AttendanceRepairRecord[] = useMemo(() => {
    return (apiData?.records || []).map(mapApiToComponent);
  }, [apiData]);

  // 更新分页信息
  useMemo(() => {
    if (apiData?.pagination) {
      setPagination(prev => ({
        ...prev,
        total: apiData.pagination.total || 0,
      }));
    }
  }, [apiData?.pagination]);

  // Mutations
  const createMutation = useCreateAttendanceRepair();
  const updateMutation = useUpdateAttendanceRepair();

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return records;
  }, [records]);

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
  const handleSubmit = useCallback(async () => {
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

    try {
      const createParams: CreateAttendanceRepairParams = {
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        department: formData.department,
        repairDate: formData.repairDate,
        checkInTime: formData.checkInTime,
        checkOutTime: formData.checkOutTime,
        reason: finalReason,
        remarks: formData.remarks,
      };

      await createMutation.mutateAsync(createParams);
      setIsFormModalOpen(false);
      refetch();
      alert('提交成功！');
    } catch (error) {
      console.error('提交考勤补录失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, createMutation, refetch]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: AttendanceRepairRecord) => {
    try {
      await updateMutation.mutateAsync({
        id: record.id,
        updates: { status: 'approved' },
      });
      refetch();
    } catch (error) {
      console.error('审批通过失败:', error);
      alert('审批失败，请重试');
    }
  }, [updateMutation, refetch]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: AttendanceRepairRecord) => {
    try {
      await updateMutation.mutateAsync({
        id: record.id,
        updates: { status: 'rejected' },
      });
      refetch();
    } catch (error) {
      console.error('审批驳回失败:', error);
      alert('操作失败，请重试');
    }
  }, [updateMutation, refetch]);

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
