/**
 * 工资预算数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 * 使用 React Query 和 API 服务
 */
import { useState, useMemo, useCallback } from 'react';
import {
  useSalaryBudgetRecords,
  useCreateSalaryBudget,
  useUpdateSalaryBudget,
  useDeleteSalaryBudget,
} from '@/hooks/useSalaryBudgetQueries';
import type {
  SalaryBudgetRecord as ApiSalaryBudgetRecord,
  CreateSalaryBudgetParams,
  UpdateSalaryBudgetParams,
} from '@/services/apiSalaryBudgetService';
import type {
  SalaryBudgetFilters,
  SalaryBudgetFormData,
  BudgetSummary,
} from '../types/salaryBudget.types';

// API 字段到组件内部格式的映射
interface SalaryBudgetRecord {
  id: string;
  budgetCode: string;
  deptId: string;
  deptName: string;
  budgetMonth: string;
  totalBaseSalary: number;
  totalOvertimePay: number;
  totalBonus: number;
  grandTotal: number;
  status: string;
  statusLabel: string;
  applicantId: string;
  applicantName: string;
  applyDate: string;
  remark?: string;
}

/**
 * API 数据转换为组件内部格式
 */
function mapApiToComponent(apiRecord: ApiSalaryBudgetRecord): SalaryBudgetRecord {
  return {
    id: apiRecord.id,
    budgetCode: apiRecord.budgetCode,
    deptId: apiRecord.deptId,
    deptName: apiRecord.deptName,
    budgetMonth: apiRecord.budgetMonth,
    totalBaseSalary: apiRecord.totalBaseSalary,
    totalOvertimePay: apiRecord.totalOvertimePay,
    totalBonus: apiRecord.totalBonus,
    grandTotal: apiRecord.grandTotal,
    status: apiRecord.status,
    statusLabel: apiRecord.statusLabel || apiRecord.status,
    applicantId: apiRecord.applicantId,
    applicantName: apiRecord.applicantName,
    applyDate: apiRecord.applyDate,
    remark: apiRecord.remark,
  };
}

export interface UseSalaryBudgetReturn {
  // 状态
  filters: SalaryBudgetFilters;
  setFilters: React.Dispatch<React.SetStateAction<SalaryBudgetFilters>>;
  pagination: { current: number; pageSize: number; total: number };
  setPagination: React.Dispatch<React.SetStateAction<{ current: number; pageSize: number; total: number }>>;
  budgetRecords: SalaryBudgetRecord[];
  formData: SalaryBudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<SalaryBudgetFormData>>;
  selectedRecord: SalaryBudgetRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<SalaryBudgetRecord | null>>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  grandTotal: number;

  // 弹窗状态
  isFormModalOpen: boolean;
  setIsFormModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSummaryModalOpen: boolean;
  setIsSummaryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 过滤后的数据
  filteredData: SalaryBudgetRecord[];
  summaryData: BudgetSummary[];

  // 事件处理
  handleFilterChange: (field: keyof SalaryBudgetFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: SalaryBudgetRecord) => void;
  handleOpenSummaryModal: () => void;
  handleDeptChange: (deptId: string, deptName: string) => void;
  handleSubmit: () => Promise<void>;
  handleApprove: (record: SalaryBudgetRecord) => Promise<void>;
  handleReject: (record: SalaryBudgetRecord) => Promise<void>;
  handleExport: () => void;
}

/**
 * 获取月份选项（近12个月）
 */
export function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = `${year}年${date.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

export function useSalaryBudget(departments: { id: string; name: string }[]): UseSalaryBudgetReturn {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<SalaryBudgetFilters>({
    deptId: '',
    budgetMonth: '',
    status: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<SalaryBudgetRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState<SalaryBudgetFormData>({
    deptId: '',
    deptName: '',
    budgetMonth: '',
    totalBaseSalary: 0,
    totalOvertimePay: 0,
    totalBonus: 0,
    remark: '',
  });

  /** 预算记录列表（从 API 获取） */
  const [budgetRecords, setBudgetRecords] = useState<SalaryBudgetRecord[]>([]);

  // ============================================================
  // React Query 数据获取
  // ============================================================

  /** 构建查询参数 */
  const queryFilters = useMemo(() => ({
    deptId: filters.deptId || undefined,
    budgetMonth: filters.budgetMonth || undefined,
    status: filters.status || undefined,
  }), [filters]);

  const queryPagination = useMemo(() => ({
    page: pagination.current,
    limit: pagination.pageSize,
  }), [pagination]);

  /** 使用 React Query 获取工资预算记录 */
  const { data: apiData, refetch } = useSalaryBudgetRecords(queryFilters, queryPagination);

  /** 转换 API 数据为组件内部格式 */
  const apiRecords: SalaryBudgetRecord[] = useMemo(() => {
    return (apiData?.records || []).map(mapApiToComponent);
  }, [apiData]);

  /** 更新预算记录列表 */
  useMemo(() => {
    setBudgetRecords(apiRecords);
  }, [apiRecords]);

  /** 更新分页信息 */
  useMemo(() => {
    if (apiData?.pagination) {
      setPagination(prev => ({
        ...prev,
        total: apiData.pagination.total || 0,
      }));
    }
  }, [apiData?.pagination]);

  // ============================================================
  // Mutations
  // ============================================================

  const createMutation = useCreateSalaryBudget();
  const updateMutation = useUpdateSalaryBudget();
  const deleteMutation = useDeleteSalaryBudget();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 计算总计 */
  const grandTotal = useMemo(() => {
    return formData.totalBaseSalary + formData.totalOvertimePay + formData.totalBonus;
  }, [formData.totalBaseSalary, formData.totalOvertimePay, formData.totalBonus]);

  /** 过滤后的数据（API 已服务端过滤，此处直接返回） */
  const filteredData = useMemo(() => {
    return budgetRecords;
  }, [budgetRecords]);

  /** 按月份汇总数据 */
  const summaryData = useMemo((): BudgetSummary[] => {
    const summaryMap = new Map<string, BudgetSummary>();

    filteredData.forEach(record => {
      const existing = summaryMap.get(record.budgetMonth);
      if (existing) {
        existing.totalBaseSalary += record.totalBaseSalary;
        existing.totalOvertimePay += record.totalOvertimePay;
        existing.totalBonus += record.totalBonus;
        existing.grandTotal += record.grandTotal;
        existing.count += 1;
      } else {
        summaryMap.set(record.budgetMonth, {
          month: record.budgetMonth,
          totalBaseSalary: record.totalBaseSalary,
          totalOvertimePay: record.totalOvertimePay,
          totalBonus: record.totalBonus,
          grandTotal: record.grandTotal,
          count: 1,
        });
      }
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredData]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = useCallback((field: keyof SalaryBudgetFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 重置筛选 */
  const handleResetFilters = useCallback(() => {
    setFilters({ deptId: '', budgetMonth: '', status: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  /** 打开新增弹窗 */
  const handleOpenFormModal = useCallback(() => {
    setSelectedRecord(null);
    const currentMonth = new Date();
    const monthValue = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    setFormData({
      deptId: '',
      deptName: '',
      budgetMonth: monthValue,
      totalBaseSalary: 0,
      totalOvertimePay: 0,
      totalBonus: 0,
      remark: '',
    });
    setIsFormModalOpen(true);
  }, []);

  /** 打开详情弹窗 */
  const handleOpenDetailModal = useCallback((record: SalaryBudgetRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  /** 打开汇总弹窗 */
  const handleOpenSummaryModal = useCallback(() => {
    setIsSummaryModalOpen(true);
  }, []);

  /** 部门选择变化 */
  const handleDeptChange = useCallback((deptId: string, deptName: string) => {
    setFormData(prev => ({
      ...prev,
      deptId,
      deptName,
    }));
  }, []);

  /** 提交工资预算申请 */
  const handleSubmit = useCallback(async () => {
    if (!formData.deptId || !formData.budgetMonth || formData.totalBaseSalary <= 0) {
      alert('请填写完整信息');
      return;
    }

    try {
      const createParams: CreateSalaryBudgetParams = {
        deptId: formData.deptId,
        deptName: formData.deptName,
        budgetMonth: formData.budgetMonth,
        totalBaseSalary: formData.totalBaseSalary,
        totalOvertimePay: formData.totalOvertimePay,
        totalBonus: formData.totalBonus,
        remark: formData.remark,
        applicantId: 'U013', // 当前登录用户
        applicantName: '陆启闯', // 当前登录用户
      };

      await createMutation.mutateAsync(createParams);

      setIsFormModalOpen(false);
      refetch();
      alert('提交成功！');
    } catch (error) {
      console.error('提交工资预算申请失败:', error);
      alert('提交失败，请重试');
    }
  }, [formData, createMutation, refetch]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: SalaryBudgetRecord) => {
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
  const handleReject = useCallback(async (record: SalaryBudgetRecord) => {
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

  /** 导出Excel功能 */
  const handleExport = useCallback(() => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    // 表头
    const headers = ['预算编号', '部门', '预算月份', '基本工资总额', '加班费总额', '奖金总额', '总计', '状态', '申请人', '申请日期'];

    // 数据行
    const exportData = dataToExport.map(row => ({
      '预算编号': row.budgetCode,
      '部门': row.deptName,
      '预算月份': row.budgetMonth,
      '基本工资总额': row.totalBaseSalary.toFixed(2),
      '加班费总额': row.totalOvertimePay.toFixed(2),
      '奖金总额': row.totalBonus.toFixed(2),
      '总计': row.grandTotal.toFixed(2),
      '状态': row.statusLabel,
      '申请人': row.applicantName,
      '申请日期': row.applyDate,
    }));

    // 生成CSV内容
    let content = headers.join(',') + '\n';
    content += exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    // 创建Blob并下载
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `工资预算_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
  }, [selectedRowKeys, filteredData]);

  return {
    // 状态
    filters,
    setFilters,
    pagination,
    setPagination,
    budgetRecords,
    formData,
    setFormData,
    selectedRecord,
    setSelectedRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    grandTotal,

    // 弹窗状态
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isSummaryModalOpen,
    setIsSummaryModalOpen,

    // 数据
    filteredData,
    summaryData,

    // 事件处理
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleOpenSummaryModal,
    handleDeptChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleExport,
  };
}
