/**
 * 工资预算页面 - 人工管理模块
 * 实现工资预算编制、汇总、导出和提交审批功能
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Wallet, Plus, Search, Download, RefreshCw, Eye, Check, X } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { departments } from '../../data/mockData';
import { ApprovalType, ApprovalStatus, getApprovalTypeName, getApprovalStatusName } from '../../types/approval';
import { ApprovalStatusLabels } from '../../types/labor/approval';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { salaryCalculationService } from '../../services/salaryCalculationService';

// ============================================================
// 类型定义
// ============================================================

/**
 * 工资预算记录
 */
interface SalaryBudgetRecord {
  id: string;
  budgetCode: string;        // 预算编号
  deptId: string;           // 部门ID
  deptName: string;         // 部门名称
  budgetMonth: string;       // 预算月份 (YYYY-MM)
  totalBaseSalary: number;  // 基本工资总额
  totalOvertimePay: number; // 加班费总额
  totalBonus: number;       // 奖金总额
  grandTotal: number;       // 总计
  status: ApprovalStatus;   // 审批状态
  applicantId: string;      // 申请人ID
  applicantName: string;    // 申请人姓名
  applyDate: string;        // 申请日期
  remark?: string;          // 备注
}

/**
 * 预算汇总数据
 */
interface BudgetSummary {
  month: string;
  totalBaseSalary: number;
  totalOvertimePay: number;
  totalBonus: number;
  grandTotal: number;
  count: number;
}

/**
 * 筛选条件
 */
interface SalaryBudgetFilters {
  deptId: string;
  budgetMonth: string;
  status: ApprovalStatus | '';
}

// ============================================================
// 常量定义
// ============================================================

/** 状态筛选选项 */
const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'PENDING', label: '待审批' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'CANCELLED', label: '已取消' },
];

// ============================================================
// LocalStorage 存储键名
// ============================================================

const STORAGE_KEY = 'SALARY_BUDGET_RECORDS';

/**
 * 从LocalStorage获取工资预算记录列表
 */
function getStoredBudgetRecords(): SalaryBudgetRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存工资预算记录数据失败:', error);
  }
}

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
function getMonthOptions(): { value: string; label: string }[] {
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

// ============================================================
// 主组件
// ============================================================

export default function SalaryBudgetPage() {
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
  const [formData, setFormData] = useState({
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
  // Context
  // ============================================================

  const { addApproval, approvals, approve, reject } = useApprovalContext();

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
  const handleFilterChange = (field: keyof SalaryBudgetFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ deptId: '', budgetMonth: '', status: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 搜索 */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 打开新增弹窗 */
  const handleOpenFormModal = () => {
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
  };

  /** 打开详情弹窗 */
  const handleOpenDetailModal = (record: SalaryBudgetRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 打开汇总弹窗 */
  const handleOpenSummaryModal = () => {
    setIsSummaryModalOpen(true);
  };

  /** 部门选择变化 */
  const handleDeptChange = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    setFormData(prev => ({
      ...prev,
      deptId,
      deptName: dept?.name || '',
    }));
  };

  /** 提交工资预算申请 */
  const handleSubmit = () => {
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

    // 创建审批记录
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
      totalSteps: 2,
      approvers: [
        { userId: 'U002', userName: '李明辉', role: '部门经理', order: 1, status: 'pending' as const, comment: '' },
      ],
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
  };

  /** 审批通过 */
  const handleApprove = (record: SalaryBudgetRecord) => {
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
  };

  /** 审批驳回 */
  const handleReject = (record: SalaryBudgetRecord) => {
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
  };

  /** 导出Excel功能 */
  const handleExport = () => {
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
  };

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns = [
    {
      title: '预算编号',
      dataIndex: 'budgetCode',
      key: 'budgetCode',
      width: 160,
    },
    {
      title: '部门',
      dataIndex: 'deptName',
      key: 'deptName',
      width: 100,
    },
    {
      title: '预算月份',
      dataIndex: 'budgetMonth',
      key: 'budgetMonth',
      width: 100,
      render: (value: string) => {
        if (!value) return '-';
        const [year, month] = value.split('-');
        return `${year}年${parseInt(month)}月`;
      },
    },
    {
      title: '基本工资总额',
      dataIndex: 'totalBaseSalary',
      key: 'totalBaseSalary',
      width: 120,
      render: (value: number) => value ? `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '¥0.00',
    },
    {
      title: '加班费总额',
      dataIndex: 'totalOvertimePay',
      key: 'totalOvertimePay',
      width: 120,
      render: (value: number) => value ? `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '¥0.00',
    },
    {
      title: '奖金总额',
      dataIndex: 'totalBonus',
      key: 'totalBonus',
      width: 100,
      render: (value: number) => value ? `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '¥0.00',
    },
    {
      title: '总计',
      dataIndex: 'grandTotal',
      key: 'grandTotal',
      width: 130,
      render: (value: number) => (
        <span className="font-medium text-emerald-600">
          ¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: ApprovalStatus) => {
        const config = ApprovalStatusLabels[value];
        return (
          <LaborStatusBadge
            status={value === ApprovalStatus.APPROVED ? 'completed' : value === ApprovalStatus.PENDING ? 'pending' : value === ApprovalStatus.REJECTED ? 'rejected' : value === ApprovalStatus.CANCELLED ? 'cancelled' : 'draft'}
            label={config?.label || getApprovalStatusName(value)}
          />
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: SalaryBudgetRecord) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenDetailModal(record)}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === ApprovalStatus.PENDING && (
            <>
              <button
                onClick={() => handleApprove(record)}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                title="批准"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(record)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="驳回"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // 汇总表格列
  const summaryColumns = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      width: 120,
      render: (value: string) => {
        const [year, month] = value.split('-');
        return `${year}年${parseInt(month)}月`;
      },
    },
    {
      title: '部门数',
      dataIndex: 'count',
      key: 'count',
      width: 80,
    },
    {
      title: '基本工资总额',
      dataIndex: 'totalBaseSalary',
      key: 'totalBaseSalary',
      width: 150,
      render: (value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '加班费总额',
      dataIndex: 'totalOvertimePay',
      key: 'totalOvertimePay',
      width: 150,
      render: (value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '奖金总额',
      dataIndex: 'totalBonus',
      key: 'totalBonus',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '汇总总计',
      dataIndex: 'grandTotal',
      key: 'grandTotal',
      width: 150,
      render: (value: number) => (
        <span className="font-medium text-emerald-600">
          ¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">工资预算</h1>
            <p className="text-xs text-gray-500">编制月度工资预算，汇总各部门工资数据</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* 部门筛选 */}
          <select
            value={filters.deptId}
            onChange={(e) => handleFilterChange('deptId', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部部门</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {/* 月份筛选 */}
          <select
            value={filters.budgetMonth}
            onChange={(e) => handleFilterChange('budgetMonth', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部月份</option>
            {getMonthOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* 状态筛选 */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* 搜索按钮 */}
          <button
            onClick={handleSearch}
            className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>

          {/* 重置按钮 */}
          <button
            onClick={handleResetFilters}
            className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            重置
          </button>
        </div>

        {/* 操作按钮栏 */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleOpenFormModal}
            className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            新增预算
          </button>

          <button
            onClick={handleOpenSummaryModal}
            className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
          >
            <Wallet className="w-4 h-4" />
            预算汇总
          </button>

          <button
            onClick={handleExport}
            className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <ProTable
          columns={columns}
          dataSource={filteredData}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, size) => setPagination({ current: page, pageSize: size, total: pagination.total }),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          rowSelection={
            selectedRowKeys.length > 0
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }
              : undefined
          }
        />
      </div>

      {/* 新增/编辑表单弹窗 */}
      <UnifiedModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="新建工资预算"
        size="lg"
        showFooter={false}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* 部门选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部门 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.deptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择部门</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* 月份选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预算月份 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.budgetMonth}
              onChange={(e) => setFormData(prev => ({ ...prev, budgetMonth: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {getMonthOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 基本工资总额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              基本工资总额 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.totalBaseSalary || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, totalBaseSalary: parseFloat(e.target.value) || 0 }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入金额"
              min="0"
              step="0.01"
            />
          </div>

          {/* 加班费总额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              加班费总额
            </label>
            <input
              type="number"
              value={formData.totalOvertimePay || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, totalOvertimePay: parseFloat(e.target.value) || 0 }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入金额"
              min="0"
              step="0.01"
            />
          </div>

          {/* 奖金总额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              奖金总额
            </label>
            <input
              type="number"
              value={formData.totalBonus || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, totalBonus: parseFloat(e.target.value) || 0 }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入金额"
              min="0"
              step="0.01"
            />
          </div>

          {/* 总计显示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              总计
            </label>
            <div className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 flex items-center">
              <span className="font-medium text-emerald-600">
                ¥{grandTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* 备注 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={formData.remark}
              onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入备注信息（可选）"
            />
          </div>
        </div>

        {/* 弹窗底部按钮 */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setIsFormModalOpen(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.deptId || !formData.budgetMonth || formData.totalBaseSalary <= 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交审批
          </button>
        </div>
      </UnifiedModal>

      {/* 详情弹窗 */}
      <UnifiedModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="预算详情"
        size="lg"
        showFooter={false}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">预算编号</label>
                <div className="text-sm text-gray-900">{selectedRecord.budgetCode}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">部门</label>
                <div className="text-sm text-gray-900">{selectedRecord.deptName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">预算月份</label>
                <div className="text-sm text-gray-900">
                  {selectedRecord.budgetMonth && (() => {
                    const [year, month] = selectedRecord.budgetMonth.split('-');
                    return `${year}年${parseInt(month)}月`;
                  })()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">申请人</label>
                <div className="text-sm text-gray-900">{selectedRecord.applicantName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">申请日期</label>
                <div className="text-sm text-gray-900">{selectedRecord.applyDate}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
                <div className="mt-1">
                  <LaborStatusBadge
                    status={
                      selectedRecord.status === ApprovalStatus.APPROVED ? 'completed' :
                      selectedRecord.status === ApprovalStatus.PENDING ? 'pending' :
                      selectedRecord.status === ApprovalStatus.REJECTED ? 'rejected' :
                      selectedRecord.status === ApprovalStatus.CANCELLED ? 'cancelled' : 'draft'
                    }
                    label={getApprovalStatusName(selectedRecord.status)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">基本工资总额</label>
                <div className="text-sm text-gray-900">
                  ¥{selectedRecord.totalBaseSalary.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">加班费总额</label>
                <div className="text-sm text-gray-900">
                  ¥{selectedRecord.totalOvertimePay.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">奖金总额</label>
                <div className="text-sm text-gray-900">
                  ¥{selectedRecord.totalBonus.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">总计</label>
                <div className="text-sm font-medium text-emerald-600">
                  ¥{selectedRecord.grandTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              {selectedRecord.remark && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
                  <div className="text-sm text-gray-900">{selectedRecord.remark}</div>
                </div>
              )}
            </div>

            {/* 审批操作 */}
            {selectedRecord.status === ApprovalStatus.PENDING && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { handleReject(selectedRecord); setIsDetailModalOpen(false); }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  驳回
                </button>
                <button
                  onClick={() => { handleApprove(selectedRecord); setIsDetailModalOpen(false); }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  通过
                </button>
              </div>
            )}
          </div>
        )}
      </UnifiedModal>

      {/* 汇总弹窗 */}
      <UnifiedModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        title="预算汇总"
        size="lg"
        showFooter={false}
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-500 mb-4">
            按月份汇总所有部门的工资预算数据
          </div>

          <ProTable
            columns={summaryColumns}
            dataSource={summaryData}
            pagination={false}
          />

          {/* 合计行 */}
          {summaryData.length > 0 && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">汇总部门数：</span>
                  <span className="font-medium">{summaryData.reduce((sum, item) => sum + item.count, 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500">基本工资：</span>
                  <span className="font-medium text-emerald-600">
                    ¥{summaryData.reduce((sum, item) => sum + item.totalBaseSalary, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">加班费：</span>
                  <span className="font-medium text-emerald-600">
                    ¥{summaryData.reduce((sum, item) => sum + item.totalOvertimePay, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">奖金：</span>
                  <span className="font-medium text-emerald-600">
                    ¥{summaryData.reduce((sum, item) => sum + item.totalBonus, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">总计：</span>
                  <span className="font-bold text-emerald-700">
                    ¥{summaryData.reduce((sum, item) => sum + item.grandTotal, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={() => setIsSummaryModalOpen(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              关闭
            </button>
          </div>
        </div>
      </UnifiedModal>
    </div>
  );
}
