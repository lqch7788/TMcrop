/**
 * 招聘申请数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 * 使用 Zustand Store 替代 React Query
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRecruitmentStore } from '@/stores';
import type { RecruitmentData } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import type {
  RecruitmentRecord,
  RecruitmentFilters,
  RecruitmentFormData,
  RecruitmentPagination,
  RecruitmentStatus,
} from '../types/recruitment.types';

// Store 数据转换为组件内部格式（保留业务逻辑：中文标签映射）
function mapApiToComponent(storeItem: RecruitmentData): RecruitmentRecord {
  return {
    id: storeItem.id,
    recruitmentCode: storeItem.recruitmentCode,
    deptId: storeItem.deptId,
    deptName: storeItem.deptName,
    positionId: storeItem.positionId,
    position: storeItem.position,
    headcount: storeItem.headcount,
    employmentType: storeItem.employmentType,
    salaryMin: storeItem.salaryMin,
    salaryMax: storeItem.salaryMax,
    priority: storeItem.priorityLabel || storeItem.priority,
    status: storeItem.statusLabel as RecruitmentStatus,
    reason: storeItem.reason,
    remarks: storeItem.remarks,
    applicantId: storeItem.applicantId,
    applicantName: storeItem.applicantName,
    applyDate: storeItem.applyDate,
  };
}

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
  handleSubmit: () => Promise<void>;
  handleApprove: (record: RecruitmentRecord) => Promise<void>;
  handleReject: (record: RecruitmentRecord) => Promise<void>;
  handleBatchApprove: () => void;
  handleBatchReject: () => void;
  handleExport: () => void;
  setBatchMode: React.Dispatch<React.SetStateAction<'none' | 'approve' | 'reject' | 'export'>>;
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
  // Zustand Store
  // ============================================================

  const items = useRecruitmentStore((s) => s.items);
  const isLoading = useRecruitmentStore((s) => s.isLoading);
  const fetchItems = useRecruitmentStore((s) => s.fetchItems);
  const createItem = useRecruitmentStore((s) => s.createItem);
  const updateItem = useRecruitmentStore((s) => s.updateItem);

  // 组件挂载时加载数据
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 转换 Store 数据为组件格式
  const records: RecruitmentRecord[] = useMemo(() => {
    return items.map(mapApiToComponent);
  }, [items]);

  // 根据筛选条件过滤数据（纯前端计算）
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filters.recruitmentCode && !r.recruitmentCode.includes(filters.recruitmentCode)) return false;
      if (filters.deptId && r.deptId !== filters.deptId) return false;
      if (filters.position && !r.position.includes(filters.position)) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.priority && r.priority !== filters.priority) return false;
      return true;
    });
  }, [records, filters]);

  // 更新分页总数（纯前端计算）
  useEffect(() => {
    setPagination(prev => ({ ...prev, total: filteredRecords.length }));
  }, [filteredRecords.length]);

  // 过滤后的数据（store 数据已过滤，这里兼容旧接口名）
  const filteredData = filteredRecords;

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
  const handleSubmit = useCallback(async () => {
    if (!formData.deptId || !formData.positionId || formData.headcount < 1 || !formData.reason) {
      await showAlert('请填写完整信息');
      return;
    }

    if (formData.salaryMin > formData.salaryMax) {
      await showAlert('最低薪资不能大于最高薪资');
      return;
    }

    // 获取部门名称
    const dept = departments.find(d => d.oid === formData.deptId);
    const position = positions.find(p => p.id === formData.positionId);

    try {
      const result = await createItem({
        deptId: formData.deptId,
        deptName: dept?.name || '',
        positionId: formData.positionId,
        position: position?.name || '',
        headcount: formData.headcount,
        employmentType: formData.employmentType,
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        priority: formData.priority === '紧急' ? 'urgent' :
                 formData.priority === '高' ? 'high' :
                 formData.priority === '低' ? 'low' : 'normal',
        reason: formData.reason,
        remarks: formData.remarks,
        applicantId: 'U001',
        applicantName: '王建华',
      });
      if (result) {
        setIsFormModalOpen(false);
        await showAlert('提交成功！');
      } else {
        await showAlert('提交失败，请重试');
      }
    } catch (error) {
      console.error('提交招聘申请失败:', error);
      await showAlert('提交失败，请重试');
    }
  }, [formData, departments, positions, createItem]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: RecruitmentRecord) => {
    try {
      await updateItem(record.id, { status: 'approved' });
    } catch (error) {
      console.error('审批通过失败:', error);
      await showAlert('审批失败，请重试');
    }
  }, [updateItem]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: RecruitmentRecord) => {
    try {
      await updateItem(record.id, { status: 'rejected' });
    } catch (error) {
      console.error('审批驳回失败:', error);
      await showAlert('操作失败，请重试');
    }
  }, [updateItem]);

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
    a.download = `招聘申请_${todayLocal()}.csv`;
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
