/**
 * 工资预算数据管理 Hook（V2.0 改造）
 * 使用 Zustand Store 替代 React Query
 * 保留所有业务逻辑，替换数据源为 useSalaryBudgetStore
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSalaryBudgetStore } from '@/stores';
import type { SalaryBudgetData } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import type {
  SalaryBudgetFilters,
  SalaryBudgetFormData,
  BudgetSummary,
} from '../types/salaryBudget.types';

export interface UseSalaryBudgetReturn {
  // 状态
  filters: SalaryBudgetFilters;
  setFilters: React.Dispatch<React.SetStateAction<SalaryBudgetFilters>>;
  pagination: { current: number; pageSize: number; total: number };
  setPagination: React.Dispatch<React.SetStateAction<{ current: number; pageSize: number; total: number }>>;
  budgetRecords: SalaryBudgetData[];
  formData: SalaryBudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<SalaryBudgetFormData>>;
  selectedRecord: SalaryBudgetData | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<SalaryBudgetData | null>>;
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
  filteredData: SalaryBudgetData[];
  summaryData: BudgetSummary[];

  // 事件处理
  handleFilterChange: (field: keyof SalaryBudgetFilters, value: string) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;
  handleOpenFormModal: () => void;
  handleOpenDetailModal: (record: SalaryBudgetData) => void;
  handleOpenSummaryModal: () => void;
  handleDeptChange: (deptId: string, deptName: string) => void;
  handleSubmit: () => Promise<void>;
  handleApprove: (record: SalaryBudgetData) => Promise<void>;
  handleReject: (record: SalaryBudgetData) => Promise<void>;
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

export function useSalaryBudget(_departments: { id: string; name: string }[]): UseSalaryBudgetReturn {
  // ========== 从 Store 获取数据和方法 ==========
  const storeItems = useSalaryBudgetStore((s) => s.items);
  const fetchItems = useSalaryBudgetStore((s) => s.fetchItems);
  const createItem = useSalaryBudgetStore((s) => s.createItem);
  const approveItemStore = useSalaryBudgetStore((s) => s.approveItem);
  const rejectItemStore = useSalaryBudgetStore((s) => s.rejectItem);

  // ========== 组件挂载时加载数据 ==========
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ========== 状态定义 ==========

  const [filters, setFilters] = useState<SalaryBudgetFilters>({
    deptId: '',
    budgetMonth: '',
    status: '',
  });

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<SalaryBudgetData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [formData, setFormData] = useState<SalaryBudgetFormData>({
    deptId: '',
    deptName: '',
    budgetMonth: '',
    totalBaseSalary: 0,
    totalOvertimePay: 0,
    totalBonus: 0,
    remark: '',
  });

  // ========== 数据处理 ==========

  /** Store 数据直接使用（已 normalize 为 camelCase） */
  const budgetRecords: SalaryBudgetData[] = storeItems;

  /** 更新分页总数 */
  useEffect(() => {
    setPagination(prev => ({ ...prev, total: budgetRecords.length }));
  }, [budgetRecords.length]);

  /** 计算总计 */
  const grandTotal = useMemo(() => {
    return formData.totalBaseSalary + formData.totalOvertimePay + formData.totalBonus;
  }, [formData.totalBaseSalary, formData.totalOvertimePay, formData.totalBonus]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return budgetRecords.filter(record => {
      if (filters.deptId && record.deptId !== filters.deptId) return false;
      if (filters.budgetMonth && !record.budgetMonth.includes(filters.budgetMonth)) return false;
      if (filters.status && record.status !== filters.status) return false;
      return true;
    });
  }, [budgetRecords, filters]);

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

  // ========== 事件处理 ==========

  const handleFilterChange = useCallback((field: keyof SalaryBudgetFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ deptId: '', budgetMonth: '', status: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

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

  const handleOpenDetailModal = useCallback((record: SalaryBudgetData) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  const handleOpenSummaryModal = useCallback(() => {
    setIsSummaryModalOpen(true);
  }, []);

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
      await showAlert('请填写完整信息');
      return;
    }

    const result = await createItem({
      deptId: formData.deptId,
      deptName: formData.deptName,
      budgetMonth: formData.budgetMonth,
      totalBaseSalary: formData.totalBaseSalary,
      totalOvertimePay: formData.totalOvertimePay,
      totalBonus: formData.totalBonus,
      remark: formData.remark,
      applicantId: 'U013',
      applicantName: '陆启闯',
    });

    if (result) {
      setIsFormModalOpen(false);
      await showAlert('提交成功！');
    } else {
      await showAlert('提交失败，请重试');
    }
  }, [formData, createItem]);

  /** 审批通过 */
  const handleApprove = useCallback(async (record: SalaryBudgetData) => {
    await approveItemStore(record.id);
  }, [approveItemStore]);

  /** 审批驳回 */
  const handleReject = useCallback(async (record: SalaryBudgetData) => {
    await rejectItemStore(record.id);
  }, [rejectItemStore]);

  /** 导出Excel功能 */
  const handleExport = useCallback(() => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['预算编号', '部门', '预算月份', '基本工资总额', '加班费总额', '奖金总额', '总计', '状态', '申请人', '申请日期'];
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

    let content = headers.join(',') + '\n';
    content += exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `工资预算_${todayLocal()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
  }, [selectedRowKeys, filteredData]);

  return {
    filters, setFilters,
    pagination, setPagination,
    budgetRecords,
    formData, setFormData,
    selectedRecord, setSelectedRecord,
    selectedRowKeys, setSelectedRowKeys,
    grandTotal,
    isFormModalOpen, setIsFormModalOpen,
    isDetailModalOpen, setIsDetailModalOpen,
    isSummaryModalOpen, setIsSummaryModalOpen,
    filteredData,
    summaryData,
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
