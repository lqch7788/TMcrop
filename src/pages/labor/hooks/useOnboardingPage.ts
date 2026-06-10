/**
 * 入职办理页面 Hook
 * 封装状态管理、API调用和数据处理逻辑
 * V2.0: 数据源迁移到 useOnboardingStore (Zustand)，移除 React Query
 * 与 components版共用同一个 useOnboardingStore
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWorkerStore } from '@/stores';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import type { OnboardingData } from '@/stores/useOnboardingStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import type {
  OnboardingRecord,
  OnboardingFilters,
  OnboardingFormData,
  BatchMode,
  PaginationState,
} from '../types/onboardingPage.types';

/** Store 数据 → 组件数据映射 */
function mapStoreToComponent(item: OnboardingData): OnboardingRecord {
  return {
    id: item.id,
    employeeId: item.oid || item.id,
    employeeName: item.name,
    department: item.department,
    position: item.position,
    expectedStartDate: item.joinDate,
    actualStartDate: undefined,
    status: item.status as OnboardingRecord['status'],
    education: '',
    major: '',
    contactPhone: item.phone,
    emergencyContact: '',
    idCard: item.idCard,
    bankCard: '',
    remarks: item.remarks,
  };
}

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
  // ========== 依赖 Store ==========
  const workers = useWorkerStore((state) => state.workers);
  const loadWorkers = useWorkerStore((state) => state.loadWorkers);

  const storeItems = useOnboardingStore((state) => state.items);
  const storeFetchItems = useOnboardingStore((state) => state.fetchItems);
  const storeCreateItem = useOnboardingStore((state) => state.createItem);
  const storeUpdateItem = useOnboardingStore((state) => state.updateItem);
  const storeDeleteItem = useOnboardingStore((state) => state.deleteItem);
  const storeDeleteItems = useOnboardingStore((state) => state.deleteItems);
  const storeUpdateStatus = useOnboardingStore((state) => state.updateStatus);

  // 初始化 workers
  useEffect(() => {
    if (workers.length === 0) {
      loadWorkers();
    }
  }, [workers.length, loadWorkers]);

  // 初始化入职数据
  useEffect(() => {
    storeFetchItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ============================================================
  // 数据转换
  // ============================================================

  /** Store 数据转换为组件格式 */
  const records: OnboardingRecord[] = useMemo(() => {
    return storeItems.map(mapStoreToComponent);
  }, [storeItems]);

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
  }, [workers]);

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
  const handleSubmit = useCallback(async () => {
    if (!formData.employeeName || !formData.expectedStartDate) {
      await showAlert('请填写完整信息');
      return;
    }

    // 验证身份证号格式（18位）
    if (formData.idCard && !/^\d{17}[\dXx]$/.test(formData.idCard)) {
      await showAlert('身份证号格式不正确，请输入18位身份证号');
      return;
    }

    // 验证银行卡号格式（16-19位）
    if (formData.bankCard && !/^\d{16,19}$/.test(formData.bankCard)) {
      await showAlert('银行卡号格式不正确，请输入16-19位银行卡号');
      return;
    }

    try {
      await storeCreateItem({
        name: formData.employeeName,
        idCard: formData.idCard,
        phone: formData.contactPhone,
        position: formData.position,
        department: formData.department,
        joinDate: formData.expectedStartDate,
        remarks: formData.remarks,
      });
      setIsFormModalOpen(false);
      await showAlert('提交成功！');
    } catch (error) {
      // logger.error('提交入职申请失败:', error);
      await showAlert('提交失败，请重试');
    }
  }, [formData, storeCreateItem]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: OnboardingRecord) => {
    try {
      await storeUpdateStatus(record.id, 'onboarded');
    } catch (error) {
      // logger.error('审批通过失败:', error);
      await showAlert('操作失败，请重试');
    }
  }, [storeUpdateStatus]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: OnboardingRecord) => {
    try {
      await storeUpdateItem(record.id, { status: '已取消' });
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
    a.download = `入职记录_${todayLocal()}.csv`;
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
