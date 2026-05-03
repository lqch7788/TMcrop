/**
 * 调薪申请页面 - 人工管理模块
 * 使用通用组件实现完整功能
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { TrendingUp, Plus, Search, Download, Check, X, Eye, RefreshCw } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { useUsers } from '../../components/common/settings';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';

// ============================================================
// 常量定义
// ============================================================

/** 调整类型选项 */
const ADJUSTMENT_TYPE_OPTIONS = [
  { value: '转正调薪', label: '转正调薪' },
  { value: '年度调薪', label: '年度调薪' },
  { value: '晋升调薪', label: '晋升调薪' },
  { value: '绩效调薪', label: '绩效调薪' },
  { value: '市场调薪', label: '市场调薪' },
  { value: '其他', label: '其他' },
];

/** 状态筛选选项 */
const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已取消', label: '已取消' },
];

// ============================================================
// 类型定义
// ============================================================

interface SalaryAdjustmentRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentSalary: number;
  proposedSalary: number;
  adjustmentAmount: number;
  adjustmentRatio: number;
  adjustmentType: string;
  effectiveDate: string;
  reason: string;
  status: '待审批' | '已通过' | '已拒绝' | '已取消';
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

interface SalaryAdjustmentFilters {
  employeeName: string;
  department: string;
  adjustmentType: string;
  status: string;
  startDate: string;
  endDate: string;
}

// ============================================================
// 主组件
// ============================================================

export default function SalaryAdjustmentPage() {
  const { workers } = useUsers();

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<SalaryAdjustmentFilters>({
    employeeName: '',
    department: '',
    adjustmentType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  /** 分页状态 */
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  /** 弹窗状态 */
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /** 选中记录 */
  const [selectedRecord, setSelectedRecord] = useState<SalaryAdjustmentRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    currentSalary: 0,
    proposedSalary: 0,
    adjustmentType: '年度调薪',
    effectiveDate: '',
    reason: '',
    remarks: '',
  });

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // Context
  // ============================================================

  const { addApproval, approve, reject, approvals } = useApprovalContext();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 模拟调薪记录数据 */
  const [records, setRecords] = useState<SalaryAdjustmentRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选调薪类型的审批记录
    const salaryApprovals = approvals.filter(a => a.type === ApprovalType.SALARY_ADJUST);

    // 转换为SalaryAdjustmentRecord格式
    const salaryRecords: SalaryAdjustmentRecord[] = salaryApprovals.map(approval => {
      const businessData = approval.businessLink as { employeeId?: string; employeeName?: string; department?: string; position?: string; currentSalary?: number; proposedSalary?: number; adjustmentType?: string; effectiveDate?: string; reason?: string } | null;
      return {
        id: approval.id,
        employeeId: businessData?.employeeId || approval.applicantId,
        employeeName: businessData?.employeeName || approval.applicantName,
        department: businessData?.department || approval.applicantDepartment,
        position: businessData?.position || '',
        currentSalary: businessData?.currentSalary || 0,
        proposedSalary: businessData?.proposedSalary || 0,
        adjustmentAmount: (businessData?.proposedSalary || 0) - (businessData?.currentSalary || 0),
        adjustmentRatio: businessData?.currentSalary ? ((businessData?.proposedSalary - businessData?.currentSalary) / businessData?.currentSalary * 100) : 0,
        adjustmentType: businessData?.adjustmentType || '',
        effectiveDate: businessData?.effectiveDate || approval.applyDate,
        reason: businessData?.reason || '',
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    // 添加一些模拟初始数据
    const mockRecords: SalaryAdjustmentRecord[] = [
      { id: 'SA001', employeeId: 'EMP20240001', employeeName: '张伟民', department: '生产部', position: '种植工', currentSalary: 6000, proposedSalary: 7200, adjustmentAmount: 1200, adjustmentRatio: 20, adjustmentType: '年度调薪', effectiveDate: '2026-05-01', status: '已通过', approver: '王建国', approveTime: '2026-04-20 10:00:00' },
      { id: 'SA002', employeeId: 'EMP20240002', employeeName: '李秀英', department: '生产部', position: '农技员', currentSalary: 8000, proposedSalary: 10000, adjustmentAmount: 2000, adjustmentRatio: 25, adjustmentType: '晋升调薪', effectiveDate: '2026-06-01', status: '待审批' },
      { id: 'SA003', employeeId: 'EMP20240003', employeeName: '王建国', department: '生产部', position: '生产经理', currentSalary: 15000, proposedSalary: 15000, adjustmentAmount: 0, adjustmentRatio: 0, adjustmentType: '市场调薪', effectiveDate: '2026-05-01', status: '已拒绝', remarks: '市场调研显示薪酬已具竞争力' },
    ];

    setRecords([...mockRecords, ...salaryRecords]);
    setPagination(prev => ({ ...prev, total: mockRecords.length + salaryRecords.length }));
  }, [approvals]);

  /** 状态映射 */
  const mapApprovalStatus = (status: ApprovalStatus): SalaryAdjustmentRecord['status'] => {
    switch (status) {
      case ApprovalStatus.PENDING: return '待审批';
      case ApprovalStatus.APPROVED: return '已通过';
      case ApprovalStatus.REJECTED: return '已拒绝';
      case ApprovalStatus.CANCELLED: return '已取消';
      default: return '待审批';
    }
  };

  /** 过滤后的数据 */
  const filteredData = useMemo(() => {
    return records.filter(record => {
      if (filters.employeeName && !record.employeeName.includes(filters.employeeName)) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.adjustmentType && record.adjustmentType !== filters.adjustmentType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.effectiveDate < filters.startDate) return false;
      if (filters.endDate && record.effectiveDate > filters.endDate) return false;
      return true;
    });
  }, [records, filters]);

  /** 计算调整金额和比例 */
  const calculateAdjustment = useCallback((current: number, proposed: number) => {
    const amount = proposed - current;
    const ratio = current > 0 ? (amount / current) * 100 : 0;
    return { amount, ratio };
  }, []);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = (field: keyof SalaryAdjustmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ employeeName: '', department: '', adjustmentType: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 搜索 */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 员工选择变化 */
  const handleStaffChange = (employeeId: string) => {
    const worker = workers.find(w => w.workerId === employeeId);
    if (worker) {
      // 模拟根据员工ID获取当前薪资
      const currentSalary = worker.wagesType === '月薪' ? (worker.salary || 6000) : 5000;
      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: worker.name,
        department: worker.department,
        position: worker.position,
        currentSalary,
        proposedSalary: 0,
      }));
    }
  };

  /** 拟调薪资变化 */
  const handleProposedSalaryChange = (value: number) => {
    const { amount, ratio } = calculateAdjustment(formData.currentSalary, value);
    setFormData(prev => ({
      ...prev,
      proposedSalary: value,
    }));
  };

  /** 打开新增弹窗 */
  const handleOpenFormModal = () => {
    setSelectedRecord(null);
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      currentSalary: 0,
      proposedSalary: 0,
      adjustmentType: '年度调薪',
      effectiveDate: '',
      reason: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  };

  /** 打开详情弹窗 */
  const handleOpenDetailModal = (record: SalaryAdjustmentRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 提交调薪申请 */
  const handleSubmit = () => {
    if (!formData.employeeId || !formData.proposedSalary || !formData.effectiveDate || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    if (formData.proposedSalary <= formData.currentSalary) {
      alert('申请工资必须大于当前工资');
      return;
    }

    const { amount, ratio } = calculateAdjustment(formData.currentSalary, formData.proposedSalary);

    // 生成新记录
    const newRecord: SalaryAdjustmentRecord = {
      id: `SA${Date.now()}`,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      position: formData.position,
      currentSalary: formData.currentSalary,
      proposedSalary: formData.proposedSalary,
      adjustmentAmount: amount,
      adjustmentRatio: ratio,
      adjustmentType: formData.adjustmentType,
      effectiveDate: formData.effectiveDate,
      reason: formData.reason,
      status: '待审批',
      remarks: formData.remarks,
    };

    // 创建审批记录
    const approval: Approval = {
      id: `APR-SA-${Date.now()}`,
      code: `SP-SA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.SALARY_ADJUST,
      typeName: '调薪申请',
      category: 'hr',
      title: `${formData.employeeName}调薪申请 (${formData.currentSalary} → ${formData.proposedSalary})`,
      description: formData.reason,
      applicantId: formData.employeeId,
      applicantName: formData.employeeName,
      applicantDepartment: formData.department,
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: 2,
      approvers: [
        { userId: 'U003', userName: '王建国', role: '部门经理', order: 1, status: 'pending', comment: '' },
        { userId: 'U001', userName: '王建华', role: '人事经理', order: 2, status: 'pending', comment: '' },
      ],
      records: [],
      remark: formData.remarks,
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'leave',
        requestId: newRecord.id,
        employeeId: newRecord.employeeId,
        employeeName: newRecord.employeeName,
        department: newRecord.department,
        position: newRecord.position,
        currentSalary: newRecord.currentSalary,
        proposedSalary: newRecord.proposedSalary,
        adjustmentType: newRecord.adjustmentType,
        effectiveDate: newRecord.effectiveDate,
        reason: newRecord.reason,
      },
    };

    // 添加到Context
    addApproval(approval);

    // 更新本地状态
    setRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  };

  /** 审批通过 */
  const handleApprove = (record: SalaryAdjustmentRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意调薪');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as SalaryAdjustmentRecord['status'] } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as SalaryAdjustmentRecord['status'] } : r)
      );
    }
  };

  /** 审批驳回 */
  const handleReject = (record: SalaryAdjustmentRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合调薪条件');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as SalaryAdjustmentRecord['status'] } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as SalaryAdjustmentRecord['status'] } : r)
      );
    }
  };

  /** 批量审批通过 */
  const handleBatchApprove = () => {
    selectedRowKeys.forEach(key => {
      const record = records.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 批量审批驳回 */
  const handleBatchReject = () => {
    selectedRowKeys.forEach(key => {
      const record = records.find(r => r.id === key);
      if (record) handleReject(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 导出功能 */
  const handleExport = () => {
    const dataToExport = selectedRowKeys.length > 0
      ? filteredData.filter(r => selectedRowKeys.includes(r.id))
      : filteredData;

    const headers = ['员工姓名', '部门', '岗位', '当前薪资', '申请薪资', '调整金额', '调整比例', '调整类型', '生效日期', '状态', '审批人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '当前薪资': `¥${row.currentSalary.toLocaleString()}`,
      '申请薪资': `¥${row.proposedSalary.toLocaleString()}`,
      '调整金额': `¥${row.adjustmentAmount.toLocaleString()}`,
      '调整比例': `${row.adjustmentRatio.toFixed(1)}%`,
      '调整类型': row.adjustmentType,
      '生效日期': row.effectiveDate,
      '状态': row.status,
      '审批人': row.approver || '',
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `调薪记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: '岗位',
      dataIndex: 'position',
      key: 'position',
      width: 100,
    },
    {
      title: '当前薪资',
      dataIndex: 'currentSalary',
      key: 'currentSalary',
      width: 100,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '申请薪资',
      dataIndex: 'proposedSalary',
      key: 'proposedSalary',
      width: 100,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '调整金额',
      dataIndex: 'adjustmentAmount',
      key: 'adjustmentAmount',
      width: 100,
      render: (value: number) => (
        <span className={value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : ''}>
          {value > 0 ? '+' : ''}¥{value.toLocaleString()}
        </span>
      ),
    },
    {
      title: '调整比例',
      dataIndex: 'adjustmentRatio',
      key: 'adjustmentRatio',
      width: 80,
      render: (value: number) => (
        <span className={value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : ''}>
          {value > 0 ? '+' : ''}{value.toFixed(1)}%
        </span>
      ),
    },
    {
      title: '调整类型',
      dataIndex: 'adjustmentType',
      key: 'adjustmentType',
      width: 100,
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 110,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: SalaryAdjustmentRecord['status']) => {
        const statusMap: Record<string, { label: string; status: string }> = {
          '待审批': { label: '待审批', status: 'pending' },
          '已通过': { label: '已通过', status: 'completed' },
          '已拒绝': { label: '已拒绝', status: 'rejected' },
          '已取消': { label: '已取消', status: 'cancelled' },
        };
        const config = statusMap[value] || { label: value, status: 'pending' };
        return <LaborStatusBadge status={config.status} label={config.label} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: SalaryAdjustmentRecord) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenDetailModal(record)}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === '待审批' && (
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

  // ============================================================
  // 部门选项
  // ============================================================

  const departmentOptions = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return [{ value: '', label: '全部' }, ...depts.map(d => ({ value: d, label: d }))];
  }, []);

  // ============================================================
  // 渲染
  // ============================================================

  const { amount: displayAmount, ratio: displayRatio } = calculateAdjustment(formData.currentSalary, formData.proposedSalary);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">调薪申请</h1>
            <p className="text-xs text-gray-500">员工薪资调整申请管理</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* 员工姓名搜索 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索员工姓名"
              value={filters.employeeName}
              onChange={(e) => handleFilterChange('employeeName', e.target.value)}
              className="h-9 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 部门筛选 */}
          <select
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {departmentOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* 调整类型筛选 */}
          <select
            value={filters.adjustmentType}
            onChange={(e) => handleFilterChange('adjustmentType', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部类型</option>
            {ADJUSTMENT_TYPE_OPTIONS.map(opt => (
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

          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

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
            新增调薪
          </button>

          {batchMode === 'none' && (
            <>
              <button
                onClick={() => setBatchMode('approve')}
                className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                批量通过
              </button>
              <button
                onClick={() => setBatchMode('reject')}
                className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                批量驳回
              </button>
              <button
                onClick={() => setBatchMode('export')}
                className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </>
          )}

          {batchMode !== 'none' && (
            <>
              {batchMode === 'approve' && (
                <button
                  onClick={handleBatchApprove}
                  disabled={selectedRowKeys.length === 0}
                  className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  确认通过 ({selectedRowKeys.length})
                </button>
              )}
              {batchMode === 'reject' && (
                <button
                  onClick={handleBatchReject}
                  disabled={selectedRowKeys.length === 0}
                  className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  确认驳回 ({selectedRowKeys.length})
                </button>
              )}
              {batchMode === 'export' && (
                <button
                  onClick={handleExport}
                  className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
                </button>
              )}
              <button
                onClick={() => { setBatchMode('none'); setSelectedRowKeys([]); }}
                className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          )}
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
            batchMode !== 'none'
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
        title="新建调薪申请"
        size="lg"
        showFooter={false}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* 员工选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              员工姓名 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择员工</option>
              {workers.map(w => (
                <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
              ))}
            </select>
          </div>

          {/* 部门 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <input
              type="text"
              value={formData.department}
              readOnly
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              placeholder="选择员工后自动填充"
            />
          </div>

          {/* 岗位 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">岗位</label>
            <input
              type="text"
              value={formData.position}
              readOnly
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              placeholder="选择员工后自动填充"
            />
          </div>

          {/* 当前薪资 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">当前薪资</label>
            <input
              type="text"
              value={formData.currentSalary ? `¥${formData.currentSalary.toLocaleString()}` : ''}
              readOnly
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              placeholder="选择员工后自动填充"
            />
          </div>

          {/* 申请薪资 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              申请薪资 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.proposedSalary || ''}
              onChange={(e) => handleProposedSalaryChange(Number(e.target.value))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入申请薪资"
            />
          </div>

          {/* 调整类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              调整类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.adjustmentType}
              onChange={(e) => setFormData(prev => ({ ...prev, adjustmentType: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {ADJUSTMENT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 调整金额和比例显示 */}
          <div className="col-span-2 p-3 bg-blue-50 rounded-lg">
            <div className="flex gap-8">
              <div>
                <span className="text-sm text-gray-500">调整金额：</span>
                <span className={`text-lg font-semibold ml-2 ${displayAmount > 0 ? 'text-emerald-600' : displayAmount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {displayAmount > 0 ? '+' : ''}¥{displayAmount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">调整比例：</span>
                <span className={`text-lg font-semibold ml-2 ${displayRatio > 0 ? 'text-emerald-600' : displayRatio < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {displayRatio > 0 ? '+' : ''}{displayRatio.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* 生效日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              生效日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.effectiveDate}
              onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 调薪原因 */}
          <div></div>

          {/* 调薪原因 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              调薪原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入调薪原因（10-500字符）"
            />
          </div>

          {/* 备注 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入备注信息（选填）"
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
            disabled={!formData.employeeId || !formData.proposedSalary || formData.proposedSalary <= formData.currentSalary}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交申请
          </button>
        </div>
      </UnifiedModal>

      {/* 详情弹窗 */}
      <UnifiedModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="调薪详情"
        size="lg"
        showFooter={false}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</label>
                <div className="text-sm text-gray-900">{selectedRecord.employeeName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">部门</label>
                <div className="text-sm text-gray-900">{selectedRecord.department}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">岗位</label>
                <div className="text-sm text-gray-900">{selectedRecord.position}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">调整类型</label>
                <div className="text-sm text-gray-900">{selectedRecord.adjustmentType}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">当前薪资</label>
                <div className="text-sm text-gray-900">¥{selectedRecord.currentSalary.toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">申请薪资</label>
                <div className="text-sm text-emerald-600 font-medium">¥{selectedRecord.proposedSalary.toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">调整金额</label>
                <div className={`text-sm font-medium ${selectedRecord.adjustmentAmount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {selectedRecord.adjustmentAmount > 0 ? '+' : ''}¥{selectedRecord.adjustmentAmount.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">调整比例</label>
                <div className={`text-sm font-medium ${selectedRecord.adjustmentRatio > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {selectedRecord.adjustmentRatio > 0 ? '+' : ''}{selectedRecord.adjustmentRatio.toFixed(1)}%
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">生效日期</label>
                <div className="text-sm text-gray-900">{selectedRecord.effectiveDate}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
                <div className="mt-1">
                  <LaborStatusBadge
                    status={
                      selectedRecord.status === '已通过' ? 'completed' :
                      selectedRecord.status === '已拒绝' ? 'rejected' :
                      selectedRecord.status === '已取消' ? 'cancelled' : 'pending'
                    }
                    label={selectedRecord.status}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">审批人</label>
                <div className="text-sm text-gray-900">{selectedRecord.approver || '未审批'}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">调薪原因</label>
                <div className="text-sm text-gray-900">{selectedRecord.reason}</div>
              </div>
              {selectedRecord.remarks && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
                  <div className="text-sm text-gray-900">{selectedRecord.remarks}</div>
                </div>
              )}
            </div>

            {/* 审批操作 */}
            {selectedRecord.status === '待审批' && (
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
    </div>
  );
}
