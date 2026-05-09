/**
 * 工资预算数据管理 Hook
 * 封装状态管理、数据处理和业务逻辑
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApprovalContext } from '../../../contexts/ApprovalContext';
import { useApprovalLevel } from '../../../hooks/useApprovalLevel';
import { ApprovalType, ApprovalStatus, getApprovalTypeName, getApprovalStatusName } from '../../../types/approval';
import {
  SalaryBudgetRecord,
  SalaryBudgetFilters,
  SalaryBudgetFormData,
  SalaryBudgetPagination,
  BudgetSummary,
  SALARY_BUDGET_STORAGE_KEY,
} from '../types/salaryBudget.types';

/**
 * 生成预算编号
 */
function generateBudgetCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `SB-${dateStr}-${randomStr}`;
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

/**
 * 从LocalStorage获取工资预算记录列表
 */
function getStoredBudgetRecords(): SalaryBudgetRecord[] {
  try {
    const data = localStorage.getItem(SALARY_BUDGET_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('读取工资预算记录数据失败');
    return [];
  }
}

/**
 * 保存工资预算记录列表到LocalStorage
 */
function saveBudgetRecords(records: SalaryBudgetRecord[]): void {
  try {
    localStorage.setItem(SALARY_BUDGET_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存工资预算记录数据失败:', error);
  }
}

export interface UseSalaryBudgetReturn {
  // 状态
  filters: SalaryBudgetFilters;
  setFilters: React.Dispatch<React.SetStateAction<SalaryBudgetFilters>>;
  pagination: SalaryBudgetPagination;
  setPagination: React.Dispatch<React.SetStateAction<SalaryBudgetPagination>>;
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
  handleSubmit: () => void;
  handleApprove: (record: SalaryBudgetRecord) => void;
  handleReject: (record: SalaryBudgetRecord) => void;
  handleExport: () => void;
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
  const [pagination, setPagination] = useState<SalaryBudgetPagination>({ current: 1, pageSize: 10, total: 0 });

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

  /** 预算记录列表 */
  const [budgetRecords, setBudgetRecords] = useState<SalaryBudgetRecord[]>([]);

  // ============================================================
  // Context & Hooks
  // ============================================================

  const { addApproval, approvals, approve, reject } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选工资预算类型的审批记录
    const salaryBudgetApprovals = approvals.filter(a => a.type === ApprovalType.SALARY_BUDGET);

    // 转换为SalaryBudgetRecord格式
    const records: SalaryBudgetRecord[] = salaryBudgetApprovals.map(approval => {
      const businessData = approval.businessLink as {
        deptId?: string;
        deptName?: string;
        budgetMonth?: string;
        totalBaseSalary?: number;
        totalOvertimePay?: number;
        totalBonus?: number;
        grandTotal?: number;
        remark?: string;
      } | null;

      return {
        id: approval.id,
        budgetCode: approval.code,
        deptId: businessData?.deptId || '',
        deptName: businessData?.deptName || '',
        budgetMonth: businessData?.budgetMonth || approval.applyDate.slice(0, 7),
        totalBaseSalary: businessData?.totalBaseSalary || 0,
        totalOvertimePay: businessData?.totalOvertimePay || 0,
        totalBonus: businessData?.totalBonus || 0,
        grandTotal: businessData?.grandTotal || 0,
        status: approval.status,
        applicantId: approval.applicantId,
        applicantName: approval.applicantName,
        applyDate: approval.applyDate,
        remark: businessData?.remark || approval.description,
      };
    });

    // 同时加载本地存储的记录（兼容旧数据）
    const storedRecords = getStoredBudgetRecords();

    // 合并数据，避免重复
    const mergedRecords = [...records];
    storedRecords.forEach(stored => {
      if (!mergedRecords.find(r => r.id === stored.id)) {
        mergedRecords.push(stored);
      }
    });

    // 按日期降序排列
    mergedRecords.sort((a, b) => b.applyDate.localeCompare(a.applyDate));

    setBudgetRecords(mergedRecords);
    setPagination(prev => ({ ...prev, total: mergedRecords.length }));
  }, [approvals]);

  /** 计算总计 */
  const grandTotal = useMemo(() => {
    return formData.totalBaseSalary + formData.totalOvertimePay + formData.totalBonus;
  }, [formData.totalBaseSalary, formData.totalOvertimePay, formData.totalBonus]);

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return budgetRecords.filter(record => {
      if (filters.deptId && record.deptId !== filters.deptId) return false;
      if (filters.budgetMonth && record.budgetMonth !== filters.budgetMonth) return false;
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
  const handleSubmit = useCallback(() => {
    if (!formData.deptId || !formData.budgetMonth || formData.totalBaseSalary <= 0) {
      alert('请填写完整信息');
      return;
    }

    // 计算总计
    const calculatedGrandTotal = formData.totalBaseSalary + formData.totalOvertimePay + formData.totalBonus;

    // 生成新记录
    const newRecord: SalaryBudgetRecord = {
      id: `SB-${Date.now()}`,
      budgetCode: generateBudgetCode(),
      deptId: formData.deptId,
      deptName: formData.deptName,
      budgetMonth: formData.budgetMonth,
      totalBaseSalary: formData.totalBaseSalary,
      totalOvertimePay: formData.totalOvertimePay,
      totalBonus: formData.totalBonus,
      grandTotal: calculatedGrandTotal,
      status: ApprovalStatus.PENDING,
      applicantId: 'U013', // 当前登录用户
      applicantName: '陆启闯', // 当前登录用户
      applyDate: new Date().toISOString().slice(0, 10),
      remark: formData.remark,
    };

    // 保存到本地存储
    const storedRecords = getStoredBudgetRecords();
    storedRecords.push(newRecord);
    saveBudgetRecords(storedRecords);

    // 更新本地状态
    setBudgetRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    // 创建审批记录 - 使用分级审批动态生成审批人配置（工资预算强制严格审批）
    const approvalLevelResult = generateApprovers(ApprovalType.SALARY_BUDGET, 0);

    const approval = {
      id: newRecord.id,
      code: newRecord.budgetCode,
      type: ApprovalType.SALARY_BUDGET,
      typeName: getApprovalTypeName(ApprovalType.SALARY_BUDGET),
      category: 'hr' as const,
      title: `${formData.deptName}${formData.budgetMonth}月工资预算`,
      description: formData.remark,
      applicantId: 'U013',
      applicantName: '陆启闯',
      applicantDepartment: '综合办',
      applyDate: newRecord.applyDate,
      applyTime: new Date().toISOString().slice(11, 19),
      currentStep: 1,
      totalSteps: approvalLevelResult.totalSteps,
      approvers: approvalLevelResult.approvers,
      records: [],
      status: ApprovalStatus.PENDING,
      priority: 'normal' as const,
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'salary_budget' as const,
        requestId: newRecord.id,
        deptId: formData.deptId,
        deptName: formData.deptName,
        budgetMonth: formData.budgetMonth,
        totalBaseSalary: formData.totalBaseSalary,
        totalOvertimePay: formData.totalOvertimePay,
        totalBonus: formData.totalBonus,
        grandTotal: calculatedGrandTotal,
        remark: formData.remark,
      },
    };

    addApproval(approval);

    setIsFormModalOpen(false);
    alert('提交成功！');
  }, [formData, addApproval, generateApprovers]);

  /** 审批通过 */
  const handleApprove = useCallback((record: SalaryBudgetRecord) => {
    approve(record.id, '同意');
    setBudgetRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, status: ApprovalStatus.APPROVED } : r)
    );
    // 更新本地存储
    const storedRecords = getStoredBudgetRecords();
    const updatedRecords = storedRecords.map(r =>
      r.id === record.id ? { ...r, status: ApprovalStatus.APPROVED } : r
    );
    saveBudgetRecords(updatedRecords);
  }, [approve]);

  /** 审批驳回 */
  const handleReject = useCallback((record: SalaryBudgetRecord) => {
    reject(record.id, '不符合条件');
    setBudgetRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, status: ApprovalStatus.REJECTED } : r)
    );
    // 更新本地存储
    const storedRecords = getStoredBudgetRecords();
    const updatedRecords = storedRecords.map(r =>
      r.id === record.id ? { ...r, status: ApprovalStatus.REJECTED } : r
    );
    saveBudgetRecords(updatedRecords);
  }, [reject]);

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
      '状态': getApprovalStatusName(row.status),
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
