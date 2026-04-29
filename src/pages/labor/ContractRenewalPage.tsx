/**
 * 合同续签页面 - 人工管理模块
 * 使用通用组件实现完整功能
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { FileText, Plus, Search, Download, Check, X, Eye, RefreshCw } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { workers } from '../../data/mockData';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';

// ============================================================
// 常量定义
// ============================================================

/** 合同期限选项 */
const CONTRACT_PERIOD_OPTIONS = [
  { value: 12, label: '1年' },
  { value: 24, label: '2年' },
  { value: 36, label: '3年' },
  { value: 60, label: '5年' },
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

interface ContractRenewalRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentContractEnd: string;
  newContractStart: string;
  newContractEnd: string;
  renewalPeriod: number;
  newSalary?: number;
  termsChange?: string;
  status: '待审批' | '已通过' | '已拒绝' | '已取消';
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

interface ContractRenewalFilters {
  employeeName: string;
  department: string;
  status: string;
  startDate: string;
  endDate: string;
}

// ============================================================
// 主组件
// ============================================================

export default function ContractRenewalPage() {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<ContractRenewalFilters>({
    employeeName: '',
    department: '',
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
  const [selectedRecord, setSelectedRecord] = useState<ContractRenewalRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    currentContractEnd: '',
    newContractStart: '',
    newContractEnd: '',
    renewalPeriod: 12,
    newSalary: undefined as number | undefined,
    termsChange: '',
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

  /** 模拟合同续签记录数据 */
  const [records, setRecords] = useState<ContractRenewalRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选合同续签类型的审批记录
    const contractApprovals = approvals.filter(a => a.type === ApprovalType.CONTRACT_RENEWAL);

    // 转换为ContractRenewalRecord格式
    const contractRecords: ContractRenewalRecord[] = contractApprovals.map(approval => {
      const businessData = approval.businessLink as { employeeId?: string; employeeName?: string; department?: string; position?: string; currentContractEnd?: string; newContractStart?: string; newContractEnd?: string; renewalPeriod?: number; newSalary?: number; termsChange?: string } | null;
      return {
        id: approval.id,
        employeeId: businessData?.employeeId || approval.applicantId,
        employeeName: businessData?.employeeName || approval.applicantName,
        department: businessData?.department || approval.applicantDepartment,
        position: businessData?.position || '',
        currentContractEnd: businessData?.currentContractEnd || approval.applyDate,
        newContractStart: businessData?.newContractStart || '',
        newContractEnd: businessData?.newContractEnd || '',
        renewalPeriod: businessData?.renewalPeriod || 12,
        newSalary: businessData?.newSalary,
        termsChange: businessData?.termsChange,
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    // 添加一些模拟初始数据
    const mockRecords: ContractRenewalRecord[] = [
      { id: 'CR001', employeeId: 'EMP20240001', employeeName: '张伟民', department: '生产部', position: '种植工', currentContractEnd: '2026-05-31', newContractStart: '2026-06-01', newContractEnd: '2027-05-31', renewalPeriod: 12, newSalary: 6500, status: '已通过', approver: '王建国', approveTime: '2026-04-15 10:00:00' },
      { id: 'CR002', employeeId: 'EMP20240002', employeeName: '李秀英', department: '生产部', position: '农技员', currentContractEnd: '2026-06-30', newContractStart: '2026-07-01', newContractEnd: '2029-06-30', renewalPeriod: 36, status: '待审批' },
      { id: 'CR003', employeeId: 'EMP20240003', employeeName: '王建国', department: '生产部', position: '生产经理', currentContractEnd: '2026-04-30', newContractStart: '2026-05-01', newContractEnd: '2027-04-30', renewalPeriod: 12, termsChange: '岗位职责调整', status: '已拒绝', remarks: '合同条款需进一步协商' },
    ];

    setRecords([...mockRecords, ...contractRecords]);
    setPagination(prev => ({ ...prev, total: mockRecords.length + contractRecords.length }));
  }, [approvals]);

  /** 状态映射 */
  const mapApprovalStatus = (status: ApprovalStatus): ContractRenewalRecord['status'] => {
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
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.currentContractEnd < filters.startDate) return false;
      if (filters.endDate && record.currentContractEnd > filters.endDate) return false;
      return true;
    });
  }, [records, filters]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = (field: keyof ContractRenewalFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ employeeName: '', department: '', status: '', startDate: '', endDate: '' });
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
      // 模拟：根据员工合同到期日设置当前合同到期日
      const currentContractEnd = worker.contractExpireDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // 检查是否在30天内到期
      const contractDate = new Date(currentContractEnd);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((contractDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // 如果30天内到期，显示警告
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
        alert(`提醒：员工 ${worker.name} 的合同将在 ${daysUntilExpiry} 天后（${currentContractEnd}）到期，请及时处理续签！`);
      } else if (daysUntilExpiry <= 0) {
        alert(`警告：员工 ${worker.name} 的合同已到期（${currentContractEnd}），请立即处理！`);
      }

      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: worker.name,
        department: worker.department,
        position: worker.position,
        currentContractEnd,
        newContractStart: '',
        newContractEnd: '',
      }));
    }
  };

  /** 合同期限变化 */
  const handlePeriodChange = (period: number) => {
    if (formData.newContractStart && period > 0) {
      const startDate = new Date(formData.newContractStart);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + period);
      const endDateStr = endDate.toISOString().slice(0, 10);
      setFormData(prev => ({
        ...prev,
        renewalPeriod: period,
        newContractEnd: endDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, renewalPeriod: period }));
    }
  };

  /** 新合同开始日期变化 */
  const handleNewStartDateChange = (date: string) => {
    if (date && formData.renewalPeriod > 0) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + formData.renewalPeriod);
      const endDateStr = endDate.toISOString().slice(0, 10);
      setFormData(prev => ({
        ...prev,
        newContractStart: date,
        newContractEnd: endDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, newContractStart: date }));
    }
  };

  /** 打开新增弹窗 */
  const handleOpenFormModal = () => {
    setSelectedRecord(null);
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      currentContractEnd: '',
      newContractStart: '',
      newContractEnd: '',
      renewalPeriod: 12,
      newSalary: undefined,
      termsChange: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  };

  /** 打开详情弹窗 */
  const handleOpenDetailModal = (record: ContractRenewalRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 提交合同续签申请 */
  const handleSubmit = () => {
    if (!formData.employeeId || !formData.newContractStart || !formData.newContractEnd) {
      alert('请填写完整信息');
      return;
    }

    // 生成新记录
    const newRecord: ContractRenewalRecord = {
      id: `CR${Date.now()}`,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      position: formData.position,
      currentContractEnd: formData.currentContractEnd,
      newContractStart: formData.newContractStart,
      newContractEnd: formData.newContractEnd,
      renewalPeriod: formData.renewalPeriod,
      newSalary: formData.newSalary,
      termsChange: formData.termsChange,
      status: '待审批',
      remarks: formData.remarks,
    };

    // 创建审批记录
    const approval: Approval = {
      id: `APR-CR-${Date.now()}`,
      code: `SP-CR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.CONTRACT_RENEWAL,
      typeName: '合同续签',
      category: 'hr',
      title: `${formData.employeeName}合同续签申请`,
      description: `合同期限: ${formData.newContractStart} 至 ${formData.newContractEnd}`,
      applicantId: formData.employeeId,
      applicantName: formData.employeeName,
      applicantDepartment: formData.department,
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: 1,
      approvers: [
        { userId: 'U003', userName: '王建国', role: '部门经理', order: 1, status: 'pending', comment: '' },
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
        currentContractEnd: newRecord.currentContractEnd,
        newContractStart: newRecord.newContractStart,
        newContractEnd: newRecord.newContractEnd,
        renewalPeriod: newRecord.renewalPeriod,
        newSalary: newRecord.newSalary,
        termsChange: newRecord.termsChange,
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
  const handleApprove = (record: ContractRenewalRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意续签');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as ContractRenewalRecord['status'] } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as ContractRenewalRecord['status'] } : r)
      );
    }
  };

  /** 审批驳回 */
  const handleReject = (record: ContractRenewalRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合续签条件');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as ContractRenewalRecord['status'] } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as ContractRenewalRecord['status'] } : r)
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

    const headers = ['员工姓名', '部门', '岗位', '当前合同到期日', '新合同开始日期', '新合同到期日', '续签期限', '新薪资', '状态', '审批人', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '岗位': row.position,
      '当前合同到期日': row.currentContractEnd,
      '新合同开始日期': row.newContractStart,
      '新合同到期日': row.newContractEnd,
      '续签期限': `${row.renewalPeriod}个月`,
      '新薪资': row.newSalary ? `¥${row.newSalary.toLocaleString()}` : '',
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
    a.download = `合同续签记录_${new Date().toISOString().slice(0, 10)}.csv`;
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
      title: '当前合同到期日',
      dataIndex: 'currentContractEnd',
      key: 'currentContractEnd',
      width: 130,
    },
    {
      title: '新合同开始日期',
      dataIndex: 'newContractStart',
      key: 'newContractStart',
      width: 130,
    },
    {
      title: '新合同到期日',
      dataIndex: 'newContractEnd',
      key: 'newContractEnd',
      width: 130,
    },
    {
      title: '续签期限',
      dataIndex: 'renewalPeriod',
      key: 'renewalPeriod',
      width: 90,
      render: (value: number) => `${value}个月`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: ContractRenewalRecord['status']) => {
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
      render: (_: any, record: ContractRenewalRecord) => (
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

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">合同续签</h1>
            <p className="text-xs text-gray-500">员工劳动合同续签管理</p>
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
              placeholder="合同到期"
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
            新增续签
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
        title="新建合同续签申请"
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

          {/* 当前合同到期日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">当前合同到期日</label>
            <input
              type="date"
              value={formData.currentContractEnd}
              readOnly
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              placeholder="选择员工后自动填充"
            />
          </div>

          {/* 新合同开始日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新合同开始日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.newContractStart}
              onChange={(e) => handleNewStartDateChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 续签期限 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              续签期限 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.renewalPeriod}
              onChange={(e) => handlePeriodChange(Number(e.target.value))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {CONTRACT_PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 新合同到期日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新合同到期日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.newContractEnd}
              readOnly
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              placeholder="根据期限自动计算"
            />
          </div>

          {/* 新薪资 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新薪资</label>
            <input
              type="number"
              value={formData.newSalary || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, newSalary: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="选填"
            />
          </div>

          {/* 条款变更 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">条款变更说明</label>
            <textarea
              value={formData.termsChange}
              onChange={(e) => setFormData(prev => ({ ...prev, termsChange: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入条款变更说明（选填）"
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
            disabled={!formData.employeeId || !formData.newContractStart || !formData.newContractEnd}
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
        title="合同续签详情"
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
                <label className="block text-sm font-medium text-gray-500 mb-1">续签期限</label>
                <div className="text-sm text-gray-900">{selectedRecord.renewalPeriod}个月</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">当前合同到期日</label>
                <div className="text-sm text-gray-900">{selectedRecord.currentContractEnd}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">新合同开始日期</label>
                <div className="text-sm text-emerald-600 font-medium">{selectedRecord.newContractStart}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">新合同到期日</label>
                <div className="text-sm text-emerald-600 font-medium">{selectedRecord.newContractEnd}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">新薪资</label>
                <div className="text-sm text-gray-900">{selectedRecord.newSalary ? `¥${selectedRecord.newSalary.toLocaleString()}` : '未填写'}</div>
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
              {selectedRecord.termsChange && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">条款变更说明</label>
                  <div className="text-sm text-gray-900">{selectedRecord.termsChange}</div>
                </div>
              )}
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
