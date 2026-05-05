/**
 * 请假申请页面 - 人工管理模块
 * 使用通用组件实现完整功能
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { CalendarDays, Plus, Search, Download, Check, X, Eye, RefreshCw, Undo2 } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { useUsers } from '../../components/common/settings';
import { LeaveType, LeaveStatus, LeaveRecord, LeaveQuota } from '../../components/labor/leave/types';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';
import { useApprovalLevel } from '../../hooks/useApprovalLevel';
import { leaveQuotaService } from '../../services/leaveQuotaService';

// ============================================================
// 常量定义
// ============================================================

/** 请假类型选项 - 从mockData导入，禁止硬编码 */
const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: '年假', label: '年假' },
  { value: '病假', label: '病假' },
  { value: '事假', label: '事假' },
  { value: '婚假', label: '婚假' },
  { value: '产假', label: '产假' },
  { value: '陪产假', label: '陪产假' },
  { value: '丧假', label: '丧假' },
  { value: '工伤假', label: '工伤假' },
];

/** 状态筛选选项 */
const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已撤回', label: '已撤回' },
  { value: '已取消', label: '已取消' },
];

// ============================================================
// 类型定义
// ============================================================

interface LeaveFilters {
  staffName: string;
  leaveType: LeaveType | '';
  status: LeaveStatus | '';
  startDate: string;
  endDate: string;
}

// ============================================================
// 模拟请假余额数据
// ============================================================

/** 获取员工请假余额 */
function getLeaveQuota(staffId: string): LeaveQuota {
  // 模拟数据 - 实际应从API或LocalStorage获取
  const quotaMap: Record<string, LeaveQuota> = {
    'EMP20240001': { staffId: 'EMP20240001', staffName: '张伟民', year: 2026, annualLeaveTotal: 15, annualLeaveUsed: 3, annualLeaveRemaining: 12, sickLeaveTotal: 10, sickLeaveUsed: 1, sickLeaveRemaining: 9, otherLeaveTotal: 5, otherLeaveUsed: 0, otherLeaveRemaining: 5 },
    'EMP20240002': { staffId: 'EMP20240002', staffName: '李秀英', year: 2026, annualLeaveTotal: 15, annualLeaveUsed: 5, annualLeaveRemaining: 10, sickLeaveTotal: 10, sickLeaveUsed: 2, sickLeaveRemaining: 8, otherLeaveTotal: 5, otherLeaveUsed: 1, otherLeaveRemaining: 4 },
    'EMP20240003': { staffId: 'EMP20240003', staffName: '王建国', year: 2026, annualLeaveTotal: 20, annualLeaveUsed: 7, annualLeaveRemaining: 13, sickLeaveTotal: 10, sickLeaveUsed: 0, sickLeaveRemaining: 10, otherLeaveTotal: 5, otherLeaveUsed: 0, otherLeaveRemaining: 5 },
  };
  return quotaMap[staffId] || { staffId, staffName: '', year: 2026, annualLeaveTotal: 15, annualLeaveUsed: 0, annualLeaveRemaining: 15, sickLeaveTotal: 10, sickLeaveUsed: 0, sickLeaveRemaining: 10, otherLeaveTotal: 5, otherLeaveUsed: 0, otherLeaveRemaining: 5 };
}

/** 获取某类型的可用余额 */
function getAvailableDays(quota: LeaveQuota, leaveType: LeaveType): number {
  switch (leaveType) {
    case '年假':
      return quota.annualLeaveRemaining;
    case '病假':
      return quota.sickLeaveRemaining;
    default:
      return quota.otherLeaveRemaining;
  }
}

// ============================================================
// 主组件
// ============================================================

export default function LeavePage() {
  const { workers } = useUsers();

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<LeaveFilters>({
    staffName: '',
    leaveType: '',
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
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState({
    staffId: '',
    staffName: '',
    leaveType: '事假' as LeaveType,
    startDate: '',
    endDate: '',
    days: 0,
    reason: '',
    remarks: '',
  });

  /** 当前余额信息 */
  const [currentQuota, setCurrentQuota] = useState<LeaveQuota | null>(null);

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  /** 撤回确认弹窗状态 */
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawRecord, setWithdrawRecord] = useState<LeaveRecord | null>(null);

  // ============================================================
  // Context & Hooks
  // ============================================================

  const { addApproval, approve, reject, getFilteredApprovals, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 模拟请假记录数据 - 实际应从ApprovalContext获取 */
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选请假类型的审批记录
    const leaveApprovals = approvals.filter(a => a.type === ApprovalType.LEAVE);

    // 转换为LeaveRecord格式
    const records: LeaveRecord[] = leaveApprovals.map(approval => {
      const businessData = approval.businessLink as { leaveId?: string; leaveType?: string; startDate?: string; endDate?: string; totalDays?: number; reason?: string } | null;
      return {
        id: approval.id,
        staffId: approval.applicantId,
        staffName: approval.applicantName,
        leaveType: (businessData?.leaveType || '事假') as LeaveType,
        startDate: businessData?.startDate || approval.applyDate,
        endDate: businessData?.endDate || approval.applyDate,
        days: businessData?.totalDays || 0,
        reason: businessData?.reason || '',
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    setLeaveRecords(records);
    setPagination(prev => ({ ...prev, total: records.length }));
  }, [approvals]);

  /** 状态映射 - 将ApprovalStatus转换为LeaveStatus */
  const mapApprovalStatus = (status: ApprovalStatus): LeaveStatus => {
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
    return leaveRecords.filter(record => {
      if (filters.staffName && !record.staffName.includes(filters.staffName)) return false;
      if (filters.leaveType && record.leaveType !== filters.leaveType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.startDate < filters.startDate) return false;
      if (filters.endDate && record.endDate > filters.endDate) return false;
      return true;
    });
  }, [leaveRecords, filters]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = (field: keyof LeaveFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ staffName: '', leaveType: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 搜索 */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 打开新增弹窗 */
  const handleOpenFormModal = () => {
    setSelectedRecord(null);
    setFormData({
      staffId: '',
      staffName: '',
      leaveType: '事假',
      startDate: '',
      endDate: '',
      days: 0,
      reason: '',
      remarks: '',
    });
    setCurrentQuota(null);
    setIsFormModalOpen(true);
  };

  /** 打开详情弹窗 */
  const handleOpenDetailModal = (record: LeaveRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 计算请假天数 */
  const calculateDays = useCallback((start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, []);

  /** 员工选择变化 - 更新余额显示 */
  const handleStaffChange = (staffId: string) => {
    const worker = workers.find(w => w.workerId === staffId);
    if (worker) {
      const quota = getLeaveQuota(staffId);
      setCurrentQuota(quota);
      setFormData(prev => ({ ...prev, staffId, staffName: worker.name }));
    }
  };

  /** 日期变化 - 重新计算天数和检查余额 */
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newFormData = { ...formData, [field]: value };

    // 重新计算天数
    if (field === 'startDate') {
      newFormData.days = calculateDays(value, formData.endDate);
    } else {
      newFormData.days = calculateDays(formData.startDate, value);
    }

    setFormData(newFormData);
  };

  /** 提交请假申请 */
  const handleSubmit = async () => {
    if (!formData.staffId || !formData.startDate || !formData.endDate || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    // 余额校验
    if (currentQuota) {
      const available = getAvailableDays(currentQuota, formData.leaveType);
      if (formData.days > available) {
        alert(`余额不足！当前可用天数: ${available}天，申请天数: ${formData.days}天`);
        return;
      }
    }

    // 生成新记录
    const newRecord: LeaveRecord = {
      id: `LV${Date.now()}`,
      staffId: formData.staffId,
      staffName: formData.staffName,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: formData.days,
      reason: formData.reason,
      status: '待审批',
      remarks: formData.remarks,
    };

    // 创建审批记录 - 使用分级审批动态生成审批人配置
    const approvalLevelResult = generateApprovers(ApprovalType.LEAVE, 0, { leaveDays: formData.days });

    const approval: Approval = {
      id: `APR-${Date.now()}`,
      code: `SP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.LEAVE,
      typeName: '请假申请',
      category: 'hr',
      title: `${formData.staffName}申请${formData.leaveType}${formData.days}天`,
      description: formData.reason,
      applicantId: formData.staffId,
      applicantName: formData.staffName,
      applicantDepartment: workers.find(w => w.workerId === formData.staffId)?.department || '生产部',
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: approvalLevelResult.totalSteps,
      approvers: approvalLevelResult.approvers,
      records: [],
      remark: formData.remarks,
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'leave',
        requestId: newRecord.id,
        leaveId: newRecord.id,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays: formData.days,
        reason: formData.reason,
      },
    };

    // 添加到Context
    try {
      await addApproval(approval);
    } catch (error) {
      console.error('添加审批记录失败:', error);
      alert('提交失败，请重试');
      return;
    }

    // 冻结请假余额（审批通过后正式扣减，审批拒绝后释放）
    leaveQuotaService.freezeQuota(formData.staffId, formData.leaveType as LeaveType, formData.days);

    // 更新本地状态
    setLeaveRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  };

  /** 审批通过 */
  const handleApprove = async (record: LeaveRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      try {
        await approve(approval.id, '同意');
        // 审批通过后正式扣减余额
        leaveQuotaService.deductQuota(record.staffId, record.leaveType as LeaveType, record.days);
        setLeaveRecords(prev =>
          prev.map(r => r.id === record.id ? { ...r, status: '已通过' as LeaveStatus } : r)
        );
      } catch (error) {
        console.error('审批通过失败:', error);
        alert('审批失败，请重试');
      }
    }
  };

  /** 审批驳回 */
  const handleReject = async (record: LeaveRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      try {
        await reject(approval.id, '不符合条件');
        // 审批拒绝后释放冻结的余额
        leaveQuotaService.releaseQuota(record.staffId, record.leaveType as LeaveType, record.days);
        setLeaveRecords(prev =>
          prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as LeaveStatus } : r)
        );
      } catch (error) {
        console.error('审批驳回失败:', error);
        alert('操作失败，请重试');
      }
    }
  };

  /** 打开撤回确认弹窗 */
  const handleOpenWithdrawModal = (record: LeaveRecord) => {
    setWithdrawRecord(record);
    setIsWithdrawModalOpen(true);
  };

  /** 撤回请假申请 - 申请人主动撤回 */
  const handleWithdraw = async () => {
    if (!withdrawRecord) return;

    const approval = approvals.find(a => a.id === withdrawRecord.id);
    if (approval) {
      try {
        // 调用 cancel 释放冻结的额度
        await reject(approval.id, '用户撤回申请');
        // 释放冻结的请假额度
        leaveQuotaService.releaseQuota(withdrawRecord.staffId, withdrawRecord.leaveType as LeaveType, withdrawRecord.days);
        // 更新本地状态为已撤回
        setLeaveRecords(prev =>
          prev.map(r => r.id === withdrawRecord.id ? { ...r, status: '已撤回' as LeaveStatus } : r)
        );
      } catch (error) {
        console.error('撤回申请失败:', error);
        alert('撤回失败，请重试');
        setIsWithdrawModalOpen(false);
        setWithdrawRecord(null);
        return;
      }
    }

    setIsWithdrawModalOpen(false);
    setWithdrawRecord(null);
    alert('请假申请已撤回');
  };

  /** 批量审批通过 */
  const handleBatchApprove = () => {
    selectedRowKeys.forEach(key => {
      const record = leaveRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 批量审批驳回 */
  const handleBatchReject = () => {
    selectedRowKeys.forEach(key => {
      const record = leaveRecords.find(r => r.id === key);
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

    const headers = ['员工姓名', '请假类型', '开始日期', '结束日期', '天数', '状态', '请假原因', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.staffName,
      '请假类型': row.leaveType,
      '开始日期': row.startDate,
      '结束日期': row.endDate,
      '天数': row.days,
      '状态': row.status,
      '请假原因': row.reason,
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `请假记录_${new Date().toISOString().slice(0, 10)}.csv`;
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
      dataIndex: 'staffName',
      key: 'staffName',
      width: 120,
    },
    {
      title: '请假类型',
      dataIndex: 'leaveType',
      key: 'leaveType',
      width: 100,
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
    },
    {
      title: '天数',
      dataIndex: 'days',
      key: 'days',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: LeaveStatus) => {
        const statusMap: Record<LeaveStatus, { label: string; status: string }> = {
          '待审批': { label: '待审批', status: 'pending' },
          '已通过': { label: '已通过', status: 'completed' },
          '已拒绝': { label: '已拒绝', status: 'rejected' },
          '已撤回': { label: '已撤回', status: 'cancelled' },
          '已取消': { label: '已取消', status: 'cancelled' },
        };
        const config = statusMap[value] || { label: value, status: 'pending' };
        return <LaborStatusBadge status={config.status} label={config.label} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: LeaveRecord) => (
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
              <button
                onClick={() => handleOpenWithdrawModal(record)}
                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                title="撤回"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
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
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">请假申请</h1>
            <p className="text-xs text-gray-500">提交请假申请，查看请假记录</p>
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
              value={filters.staffName}
              onChange={(e) => handleFilterChange('staffName', e.target.value)}
              className="h-9 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 请假类型筛选 */}
          <select
            value={filters.leaveType}
            onChange={(e) => handleFilterChange('leaveType', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {LEAVE_TYPE_OPTIONS.map(opt => (
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

          {/* 日期筛选 */}
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
            新增请假
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
        title="新建请假申请"
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
              value={formData.staffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择员工</option>
              {workers.map(w => (
                <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
              ))}
            </select>
          </div>

          {/* 请假类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              请假类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value as LeaveType }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {LEAVE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 开始日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              开始日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 结束日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              结束日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 请假天数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">请假天数</label>
            <input
              type="text"
              value={formData.days ? `${formData.days} 天` : ''}
              readOnly
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              placeholder="自动计算"
            />
          </div>

          {/* 余额显示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              可用余额
            </label>
            <div className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 flex items-center">
              {currentQuota ? (
                <span className="text-emerald-600">
                  {formData.leaveType === '年假' && `年假剩余: ${currentQuota.annualLeaveRemaining}天`}
                  {formData.leaveType === '病假' && `病假剩余: ${currentQuota.sickLeaveRemaining}天`}
                  {formData.leaveType !== '年假' && formData.leaveType !== '病假' && `其他假剩余: ${currentQuota.otherLeaveRemaining}天`}
                </span>
              ) : (
                <span className="text-gray-400">请先选择员工</span>
              )}
            </div>
          </div>

          {/* 余额不足提示 */}
          {currentQuota && formData.days > 0 && (
            <div className="col-span-2">
              {formData.days > getAvailableDays(currentQuota, formData.leaveType) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  余额不足！当前可用天数: {getAvailableDays(currentQuota, formData.leaveType)}天，申请天数: {formData.days}天
                </div>
              )}
            </div>
          )}

          {/* 请假原因 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              请假原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入请假原因"
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
            disabled={currentQuota ? formData.days > getAvailableDays(currentQuota, formData.leaveType) : false}
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
        title="请假详情"
        size="lg"
        showFooter={false}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</label>
                <div className="text-sm text-gray-900">{selectedRecord.staffName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">请假类型</label>
                <div className="text-sm text-gray-900">{selectedRecord.leaveType}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">开始日期</label>
                <div className="text-sm text-gray-900">{selectedRecord.startDate}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">结束日期</label>
                <div className="text-sm text-gray-900">{selectedRecord.endDate}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">请假天数</label>
                <div className="text-sm text-gray-900">{selectedRecord.days} 天</div>
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
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">请假原因</label>
                <div className="text-sm text-gray-900">{selectedRecord.reason || '无'}</div>
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
                  onClick={() => { handleOpenWithdrawModal(selectedRecord); setIsDetailModalOpen(false); }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  撤回申请
                </button>
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

      {/* 撤回确认弹窗 */}
      <UnifiedModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title="撤回请假申请"
        size="sm"
        showFooter={false}
      >
        {withdrawRecord && (
          <div className="space-y-4">
            <div className="py-2">
              <p className="text-gray-700">
                确定要撤回 <span className="font-semibold">{withdrawRecord.staffName}</span> 的
                <span className="font-semibold">{withdrawRecord.leaveType}</span>申请吗？
              </p>
              <p className="text-gray-500 text-sm mt-2">
                撤回后将释放冻结的 {withdrawRecord.days} 天假期额度，该申请将被标记为已撤回。
              </p>
            </div>
            {/* 底部按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleWithdraw}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
              >
                确认撤回
              </button>
            </div>
          </div>
        )}
      </UnifiedModal>
    </div>
  );
}
