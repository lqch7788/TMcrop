/**
 * 招聘申请数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 * 使用 React Query 和 API 服务
 */
import { useState, useMemo, useCallback } from 'react';
import {
  useRecruitmentRecords,
  useCreateRecruitment,
  useUpdateRecruitment,
} from '@/hooks/useRecruitmentQueries';
import type { RecruitmentRecord as ApiRecruitmentRecord, CreateRecruitmentParams, UpdateRecruitmentParams } from '@/services/apiRecruitmentService';
import type {
  RecruitmentRecord,
  RecruitmentFilters,
  RecruitmentFormData,
  RecruitmentPagination,
  RecruitmentStatus,
} from '../types/recruitment.types';

// API 数据转换为组件内部格式
function mapApiToComponent(apiRecord: ApiRecruitmentRecord): RecruitmentRecord {
  return {
    id: apiRecord.id,
    recruitmentCode: apiRecord.recruitmentCode,
    deptId: apiRecord.deptId,
    deptName: apiRecord.deptName,
    positionId: apiRecord.positionId,
    position: apiRecord.position,
    headcount: apiRecord.headcount,
    employmentType: apiRecord.employmentType,
    salaryMin: apiRecord.salaryMin,
    salaryMax: apiRecord.salaryMax,
    priority: apiRecord.priorityLabel || apiRecord.priority,
    status: apiRecord.statusLabel as RecruitmentStatus,
    reason: apiRecord.reason,
    remarks: apiRecord.remarks,
    applicantId: apiRecord.applicantId,
    applicantName: apiRecord.applicantName,
    applyDate: apiRecord.applyDate,
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
  // React Query
  // ============================================================

  const queryFilters = useMemo(() => ({
    recruitmentCode: filters.recruitmentCode || undefined,
    deptId: filters.deptId || undefined,
    position: filters.position || undefined,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: pagination.current,
    limit: pagination.pageSize,
  }), [pagination.current, pagination.pageSize]);

  const { data: apiData, refetch } = useRecruitmentRecords(queryFilters, queryPagination);

  // 转换 API 数据
  const records: RecruitmentRecord[] = useMemo(() => {
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
  const createRecruitmentMutation = useCreateRecruitment();
  const updateRecruitmentMutation = useUpdateRecruitment();

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return records;
  }, [records]);

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
      alert('请填写完整信息');
      return;
    }

    if (formData.salaryMin > formData.salaryMax) {
      alert('最低薪资不能大于最高薪资');
      return;
    }

    // 获取部门名称
    const dept = departments.find(d => d.oid === formData.deptId);
    const position = positions.find(p => p.id === formData.positionId);

    try {
      const createParams: CreateRecruitmentParams = {
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
      };

      await createRecruitmentMutation.mutateAsync(createParams);
      setIsFormModalOpen(false);
      refetch();
      alert('提交成功！');
    } catch (error) {
      console.error('提交招聘申请失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, departments, positions, createRecruitmentMutation, refetch]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: RecruitmentRecord) => {
    try {
      await updateRecruitmentMutation.mutateAsync({
        id: record.id,
        updates: { status: 'approved' },
      });
      refetch();
    } catch (error) {
      console.error('审批通过失败:', error);
      alert('审批失败，请重试');
    }
  }, [updateRecruitmentMutation, refetch]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: RecruitmentRecord) => {
    try {
      await updateRecruitmentMutation.mutateAsync({
        id: record.id,
        updates: { status: 'rejected' },
      });
      refetch();
    } catch (error) {
      console.error('审批驳回失败:', error);
      alert('操作失败，请重试');
    }
  }, [updateRecruitmentMutation, refetch]);

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
    a.download = `招聘申请_${new Date().toISOString().slice(0, 10)}.csv`;
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
