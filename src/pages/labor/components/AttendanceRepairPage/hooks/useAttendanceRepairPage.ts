/**
 * 考勤补录页面 Hook
 * 封装状态管理和业务逻辑
 * V2.0: 数据源迁移到 useAttendanceRepairStore (Zustand)，移除 React Query
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWorkerStore } from '@/stores';
import { useAttendanceRepairStore } from '@/stores/useAttendanceRepairStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import type {
  AttendanceRepairRecord,
  CreateAttendanceRepairParams,
} from '@/stores/useAttendanceRepairStore';
import type {
  AttendanceRepairFilters,
  AttendanceRepairFormData,
  BatchMode,
  PaginationState,
} from '../types/attendanceRepairPage.types';

/** 组件内部使用的记录类型（status 使用中文标签） */
interface ComponentRepairRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  status: '待审批' | '已通过' | '已拒绝' | '已取消';
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

/** API 记录 → 组件记录 映射 */
function mapStoreToComponent(item: AttendanceRepairRecord): ComponentRepairRecord {
  const statusLabelMap: Record<string, ComponentRepairRecord['status']> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝',
    cancelled: '已取消',
  };
  return {
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    department: item.department,
    repairDate: item.repairDate,
    checkInTime: item.checkInTime,
    checkOutTime: item.checkOutTime,
    reason: item.reason,
    status: statusLabelMap[item.status] || '待审批',
    approver: item.approver,
    approveTime: item.approveTime,
    remarks: item.remarks,
  };
}

/** 组件状态 → Store状态 映射 */
function componentStatusToStoreStatus(status: ComponentRepairRecord['status']): AttendanceRepairRecord['status'] {
  const map: Record<string, AttendanceRepairRecord['status']> = {
    '待审批': 'pending',
    '已通过': 'approved',
    '已拒绝': 'rejected',
    '已取消': 'cancelled',
  };
  return map[status] || 'pending';
}

// 默认表单数据
const DEFAULT_FORM_DATA: AttendanceRepairFormData = {
  employeeId: '',
  employeeName: '',
  department: '',
  repairDate: todayLocal(),
  checkInTime: '09:00',
  checkOutTime: '18:00',
  reason: '忘记打卡',
  customReason: '',
  remarks: '',
};

export function useAttendanceRepairPage() {
  // ========== 依赖 Store ==========
  const workers = useWorkerStore((state) => state.workers);
  const loadWorkers = useWorkerStore((state) => state.loadWorkers);

  const storeItems = useAttendanceRepairStore((state) => state.items);
  const storeFetchItems = useAttendanceRepairStore((state) => state.fetchItems);
  const storeCreateItem = useAttendanceRepairStore((state) => state.createItem);
  const storeUpdateItem = useAttendanceRepairStore((state) => state.updateItem);
  const storeDeleteItem = useAttendanceRepairStore((state) => state.deleteItem);

  // 初始化 workers 和补录数据
  useEffect(() => {
    if (workers.length === 0) {
      loadWorkers();
    }
  }, [workers.length, loadWorkers]);

  useEffect(() => {
    storeFetchItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [selectedRecord, setSelectedRecord] = useState<ComponentRepairRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<AttendanceRepairFormData>(DEFAULT_FORM_DATA);

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<BatchMode>('none');

  // ============================================================
  // 数据转换与过滤
  // ============================================================

  /** Store 数据转换为组件格式 */
  const records: ComponentRepairRecord[] = useMemo(() => {
    return storeItems.map(mapStoreToComponent);
  }, [storeItems]);

  /** 过滤后的数据（本地筛选） */
  const filteredData = useMemo(() => {
    return records.filter((item) => {
      if (filters.employeeName && !item.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && item.department !== filters.department) return false;
      if (filters.reason && item.reason !== filters.reason) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.startDate && item.repairDate < filters.startDate) return false;
      if (filters.endDate && item.repairDate > filters.endDate) return false;
      return true;
    }).sort((a, b) => b.repairDate.localeCompare(a.repairDate));
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
  const handleOpenDetailModal = useCallback((record: ComponentRepairRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 提交考勤补录申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.employeeId || !formData.repairDate || !formData.checkInTime || !formData.checkOutTime) {
      await showAlert('请填写完整信息');
      return;
    }

    if (formData.reason === '其他' && !formData.customReason.trim()) {
      await showAlert('请填写具体的补录原因');
      return;
    }

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

      await storeCreateItem(createParams);
      setIsFormModalOpen(false);
      await showAlert('提交成功！');
    } catch (error) {
      // logger.error('提交考勤补录失败:', error);
      await showAlert('提交失败，请重试');
    }
  }, [formData, storeCreateItem]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: ComponentRepairRecord) => {
    try {
      await storeUpdateItem(record.id, { status: 'approved' });
    } catch (error) {
      // logger.error('审批通过失败:', error);
      await showAlert('审批失败，请重试');
    }
  }, [storeUpdateItem]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: ComponentRepairRecord) => {
    try {
      await storeUpdateItem(record.id, { status: 'rejected' });
    } catch (error) {
      // logger.error('审批驳回失败:', error);
      await showAlert('操作失败，请重试');
    }
  }, [storeUpdateItem]);

  /** 批量审批通过 */
  const handleBatchApprove = useCallback(async () => {
    for (const key of selectedRowKeys) {
      const record = records.find(r => r.id === key);
      if (record) await handleApprove(record);
    }
    setSelectedRowKeys([]);
    setBatchMode('none');
  }, [selectedRowKeys, records, handleApprove]);

  /** 批量审批驳回 */
  const handleBatchReject = useCallback(async () => {
    for (const key of selectedRowKeys) {
      const record = records.find(r => r.id === key);
      if (record) await handleReject(record);
    }
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
    a.download = `考勤补录记录_${todayLocal()}.csv`;
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
