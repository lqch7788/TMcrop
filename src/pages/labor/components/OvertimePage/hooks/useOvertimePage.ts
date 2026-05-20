/**
 * 加班申请页面 Hook (V2.0 改造：Zustand Store 替代 React Query)
 * 封装状态管理和业务逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOvertimeStore } from '@/stores/overtimeStore';
import type { OvertimeRecord as StoreOvertimeRecord } from '@/stores/overtimeStore';
import { showAlert } from '@/lib/dialogService';
import type {
  OvertimeRecord,
  OvertimeFilters,
  OvertimeFormData,
  BatchMode,
  PaginationState,
  OvertimeFeePreview,
} from '../types/overtimePage.types';
import { OVERTIME_TYPE_MAP, DEFAULT_BASE_SALARY } from '../types/overtimePage.types';

/** 加班类型中文 → 英文映射（Store 内部使用英文枚举） */
const OVERTIME_TYPE_TO_STORE: Record<string, string> = {
  '工作日加班': 'workday',
  '休息日加班': 'weekend',
  '节假日加班': 'holiday',
};

/** 状态中文 → 英文映射 */
const STATUS_TO_STORE: Record<string, string> = {
  '待审批': 'pending',
  '已通过': 'approved',
  '已拒绝': 'rejected',
  '已取消': 'cancelled',
};

/** 英文状态 → 中文映射 */
const STATUS_FROM_STORE: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
};

/** 英文加班类型 → 中文映射 */
const TYPE_FROM_STORE: Record<string, string> = {
  workday: '工作日加班',
  weekend: '休息日加班',
  holiday: '节假日加班',
};

/**
 * Store 数据转换为组件内部格式
 */
function mapStoreToComponent(storeRecord: StoreOvertimeRecord): OvertimeRecord {
  return {
    id: storeRecord.id,
    staffId: storeRecord.workerId,
    staffName: storeRecord.workerName,
    overtimeType: TYPE_FROM_STORE[storeRecord.overtimeType] || storeRecord.overtimeTypeLabel || storeRecord.overtimeType,
    startTime: storeRecord.startTime,
    endTime: storeRecord.endTime,
    hours: storeRecord.hours,
    reason: storeRecord.reason,
    status: (STATUS_FROM_STORE[storeRecord.status] || storeRecord.statusLabel || storeRecord.status) as OvertimeRecord['status'],
    approver: undefined,
    approveTime: storeRecord.approvedAt,
    remarks: storeRecord.remarks,
  };
}

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
  // ============================================================
  // Zustand Store
  // ============================================================
  const store = useOvertimeStore();

  // 组件挂载时加载数据
  useEffect(() => {
    store.fetchItems();
  }, []);

  // ============================================================
  // 本地 UI 状态
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
  // 数据获取（使用 Zustand Store）
  // ============================================================

  // Store 中的所有加班记录
  const allRecords: StoreOvertimeRecord[] = store.overtimeRecords;

  // 转换 Store 数据为组件格式并应用筛选
  const overtimeRecords: OvertimeRecord[] = useMemo(() => {
    let filtered = allRecords.map(mapStoreToComponent);

    // 客户端筛选（Store 数据已全部加载）
    if (filters.staffName) {
      filtered = filtered.filter(r => r.staffName.includes(filters.staffName));
    }
    if (filters.overtimeType) {
      filtered = filtered.filter(r => r.overtimeType === filters.overtimeType);
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.startDate) {
      filtered = filtered.filter(r => r.startTime >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(r => r.startTime <= filters.endDate);
    }

    return filtered;
  }, [allRecords, filters]);

  // 更新分页总数
  useMemo(() => {
    if (overtimeRecords.length !== pagination.total) {
      setPagination(prev => ({ ...prev, total: overtimeRecords.length }));
    }
  }, [overtimeRecords.length]);

  // ============================================================
  // 过滤后的数据（已在上面完成筛选）
  // ============================================================

  const filteredData = useMemo(() => {
    return overtimeRecords;
  }, [overtimeRecords]);

  // ============================================================
  // 加班费预览计算
  // ============================================================

  const overtimeFeePreview = useMemo((): OvertimeFeePreview | null => {
    if (formData.hours <= 0) return null;
    const overtimeTypeEnum = OVERTIME_TYPE_MAP[formData.overtimeType];
    const hourlyRate = DEFAULT_BASE_SALARY / 22 / 8;
    let rate = 1.5;
    if (overtimeTypeEnum === 'weekend') rate = 2.0;
    if (overtimeTypeEnum === 'holiday') rate = 3.0;
    const totalFee = hourlyRate * formData.hours * rate;
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
    // 重新从 API 获取
    store.fetchItems({
      workerName: filters.staffName || undefined,
      overtimeType: filters.overtimeType ? OVERTIME_TYPE_TO_STORE[filters.overtimeType] : undefined,
      status: filters.status ? STATUS_TO_STORE[filters.status] : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    } as Record<string, string>);
  }, [filters, store]);

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
  const handleStaffChange = useCallback((staffId: string, staffName: string) => {
    setFormData(prev => ({ ...prev, staffId, staffName }));
  }, []);

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

  /** 提交加班申请 — 使用 Store */
  const handleSubmit = useCallback(async () => {
    if (!formData.staffId || !formData.startTime || !formData.endTime || !formData.reason) {
      await showAlert('请填写完整信息');
      return;
    }

    try {
      await store.createItem({
        workerId: formData.staffId,
        workerName: formData.staffName,
        overtimeType: OVERTIME_TYPE_TO_STORE[formData.overtimeType] as StoreOvertimeRecord['overtimeType'],
        workDate: formData.startTime.split('T')[0],
        startTime: formData.startTime,
        endTime: formData.endTime,
        hours: formData.hours,
        baseSalary: DEFAULT_BASE_SALARY,
        reason: formData.reason,
        remarks: formData.remarks,
        status: 'pending',
      });

      setIsFormModalOpen(false);
      await showAlert('提交成功！');
    } catch (error) {
      console.error('提交加班申请失败:', error);
      await showAlert('提交失败，请重试');
    }
  }, [formData, store]);

  /** 审批通过 — 使用 Store */
  const handleApprove = useCallback(async (record: OvertimeRecord) => {
    try {
      await store.approveOvertime(record.id);
    } catch (error) {
      console.error('审批通过失败:', error);
      await showAlert('操作失败，请重试');
    }
  }, [store]);

  /** 审批驳回 — 使用 Store */
  const handleReject = useCallback(async (record: OvertimeRecord) => {
    try {
      await store.rejectOvertime(record.id, '不符合条件');
    } catch (error) {
      console.error('审批驳回失败:', error);
      await showAlert('操作失败，请重试');
    }
  }, [store]);

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

  /** 删除单条记录 — 使用 Store */
  const handleDelete = useCallback(async (record: OvertimeRecord) => {
    try {
      await store.deleteItem(record.id);
      await showAlert('删除成功！');
    } catch (error) {
      console.error('删除失败:', error);
      await showAlert('删除失败，请重试');
    }
  }, [store]);

  /** 批量删除 — 使用 Store */
  const handleBatchDelete = useCallback(async () => {
    try {
      await store.deleteItems(selectedRowKeys as string[]);
      setSelectedRowKeys([]);
      setBatchMode('none');
      await showAlert('批量删除成功！');
    } catch (error) {
      console.error('批量删除失败:', error);
      await showAlert('批量删除失败，请重试');
    }
  }, [selectedRowKeys, store]);

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
    handleDelete,
    handleBatchDelete,
    handleExport,
  };
}
