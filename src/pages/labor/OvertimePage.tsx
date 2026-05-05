/**
 * 加班申请页面 - 人工管理模块
 * 支持加班类型选择（工作日/休息日/节假日）、时长计算、提交审批
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Clock, Plus, Search, Download, Check, X, Eye, RefreshCw } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { useUsers } from '../../components/common/settings';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';
import { useApprovalLevel } from '../../hooks/useApprovalLevel';
import { overtimeCalculationService } from '../../services/overtimeCalculationService';
import { OvertimeType } from '../../types/labor/overtime';

// ============================================================
// 常量定义
// ============================================================

/** 加班类型选项 */
const OVERTIME_TYPE_OPTIONS = [
  { value: '工作日加班', label: '工作日加班' },
  { value: '休息日加班', label: '休息日加班' },
  { value: '节假日加班', label: '节假日加班' },
];

/** 加班类型字符串映射到枚举 */
const OVERTIME_TYPE_MAP: Record<string, OvertimeType> = {
  '工作日加班': OvertimeType.WORKDAY,
  '休息日加班': OvertimeType.WEEKEND,
  '节假日加班': OvertimeType.HOLIDAY,
};

/** 默认基本工资（用于预览计算） */
const DEFAULT_BASE_SALARY = 6000;

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

/** 加班记录类型 */
interface OvertimeRecord {
  id: string;
  staffId: string;
  staffName: string;
  overtimeType: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
  status: '待审批' | '已通过' | '已拒绝' | '已取消';
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

interface OvertimeFilters {
  staffName: string;
  overtimeType: string;
  status: string;
  startDate: string;
  endDate: string;
}

// ============================================================
// 主组件
// ============================================================

export default function OvertimePage() {
  const { workers } = useUsers();

  // ============================================================
  // 状态定义
  // ============================================================

  const [filters, setFilters] = useState<OvertimeFilters>({
    staffName: '',
    overtimeType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [formData, setFormData] = useState({
    staffId: '',
    staffName: '',
    overtimeType: '工作日加班',
    startTime: '',
    endTime: '',
    hours: 0,
    reason: '',
    remarks: '',
  });

  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // Context & Hooks
  // ============================================================

  const { addApproval, approve, reject, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 数据处理
  // ============================================================

  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    const overtimeApprovals = approvals.filter(a => a.type === ApprovalType.OVERTIME);

    const records: OvertimeRecord[] = overtimeApprovals.map(approval => {
      const businessData = approval.businessLink as { overtimeType?: string; startTime?: string; endTime?: string; hours?: number; reason?: string } | null;
      return {
        id: approval.id,
        staffId: approval.applicantId,
        staffName: approval.applicantName,
        overtimeType: businessData?.overtimeType || '工作日加班',
        startTime: businessData?.startTime || approval.applyDate,
        endTime: businessData?.endTime || approval.applyDate,
        hours: businessData?.hours || 0,
        reason: businessData?.reason || '',
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    setOvertimeRecords(records);
    setPagination(prev => ({ ...prev, total: records.length }));
  }, [approvals]);

  /** 状态映射 */
  const mapApprovalStatus = (status: ApprovalStatus): OvertimeRecord['status'] => {
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
    return overtimeRecords.filter(record => {
      if (filters.staffName && !record.staffName.includes(filters.staffName)) return false;
      if (filters.overtimeType && record.overtimeType !== filters.overtimeType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.startTime < filters.startDate) return false;
      if (filters.endDate && record.endTime > filters.endDate) return false;
      return true;
    });
  }, [overtimeRecords, filters]);

  /** 加班费预览计算 */
  const overtimeFeePreview = useMemo(() => {
    if (formData.hours <= 0) return null;
    const overtimeTypeEnum = OVERTIME_TYPE_MAP[formData.overtimeType] || OvertimeType.WORKDAY;
    const hourlyRate = overtimeCalculationService.calculateHourlyRate(DEFAULT_BASE_SALARY);
    const rate = overtimeCalculationService.getOvertimeTypeRate(overtimeTypeEnum);
    const totalFee = overtimeCalculationService.calculateOvertimePay(DEFAULT_BASE_SALARY, formData.hours, overtimeTypeEnum);
    const rateText = rate === 1.5 ? '1.5倍' : rate === 2.0 ? '2倍' : '3倍';
    return {
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      rate,
      rateText,
      totalFee: Math.round(totalFee * 100) / 100,
    };
  }, [formData.hours, formData.overtimeType]);

  // ============================================================
  // 事件处理
  // ============================================================

  const handleFilterChange = (field: keyof OvertimeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({ staffName: '', overtimeType: '', status: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleOpenFormModal = () => {
    setSelectedRecord(null);
    setFormData({
      staffId: '',
      staffName: '',
      overtimeType: '工作日加班',
      startTime: '',
      endTime: '',
      hours: 0,
      reason: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDetailModal = (record: OvertimeRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 计算加班时长 */
  const calculateHours = useCallback((start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate <= startDate) return 0;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
  }, []);

  /** 员工选择变化 */
  const handleStaffChange = (staffId: string) => {
    const worker = workers.find(w => w.workerId === staffId);
    if (worker) {
      setFormData(prev => ({ ...prev, staffId, staffName: worker.name }));
    }
  };

  /** 时间变化 - 重新计算时长 */
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const newFormData = { ...formData, [field]: value };
    if (field === 'startTime') {
      newFormData.hours = calculateHours(value, formData.endTime);
    } else {
      newFormData.hours = calculateHours(formData.startTime, value);
    }
    setFormData(newFormData);
  };

  /** 提交加班申请 */
  const handleSubmit = async () => {
    if (!formData.staffId || !formData.startTime || !formData.endTime || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    try {
      const newRecord: OvertimeRecord = {
        id: `OT${Date.now()}`,
        staffId: formData.staffId,
        staffName: formData.staffName,
        overtimeType: formData.overtimeType,
        startTime: formData.startTime,
        endTime: formData.endTime,
        hours: formData.hours,
        reason: formData.reason,
        status: '待审批',
        remarks: formData.remarks,
      };

      // 创建审批记录 - 使用分级审批动态生成审批人配置（加班2小时内免审批）
      const approvalLevelResult = generateApprovers(ApprovalType.OVERTIME, 0, { overtimeHours: formData.hours });

      const approval: Approval = {
        id: `APR-${Date.now()}`,
        code: `OT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
        type: ApprovalType.OVERTIME,
        typeName: '加班申请',
        category: 'hr',
        title: `${formData.staffName}申请${formData.overtimeType}${formData.hours}小时`,
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
          type: 'overtime',
          requestId: newRecord.id,
          overtimeType: formData.overtimeType,
          startTime: formData.startTime,
          endTime: formData.endTime,
          hours: formData.hours,
          reason: formData.reason,
        },
      };

      // 持久化加班记录到加班费计算服务
      const overtimeTypeEnum = OVERTIME_TYPE_MAP[formData.overtimeType] || OvertimeType.WORKDAY;
      await overtimeCalculationService.addOvertimeRecord({
        employeeId: formData.staffId,
        date: formData.startTime.split('T')[0],
        startTime: formData.startTime.split('T')[1] || formData.startTime,
        endTime: formData.endTime.split('T')[1] || formData.endTime,
        hours: formData.hours,
        type: overtimeTypeEnum,
        baseSalary: DEFAULT_BASE_SALARY,
        status: 'pending',
      });

      await addApproval(approval);
      setOvertimeRecords(prev => [newRecord, ...prev]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      setIsFormModalOpen(false);
      alert('提交成功！');
    } catch (error) {
      console.error('提交加班申请失败:', error);
      alert('提交失败，请重试');
    }
  };

  /** 审批通过 */
  const handleApprove = async (record: OvertimeRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      try {
        await approve(approval.id, '同意');
        setOvertimeRecords(prev =>
          prev.map(r => r.id === record.id ? { ...r, status: '已通过' as const } : r)
        );
      } catch (error) {
        console.error('审批通过失败:', error);
        alert('操作失败，请重试');
      }
    }
  };

  /** 审批驳回 */
  const handleReject = async (record: OvertimeRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      try {
        await reject(approval.id, '不符合条件');
        setOvertimeRecords(prev =>
          prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as const } : r)
        );
      } catch (error) {
        console.error('审批驳回失败:', error);
        alert('操作失败，请重试');
      }
    }
  };

  /** 批量审批通过 */
  const handleBatchApprove = () => {
    selectedRowKeys.forEach(key => {
      const record = overtimeRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 批量审批驳回 */
  const handleBatchReject = () => {
    selectedRowKeys.forEach(key => {
      const record = overtimeRecords.find(r => r.id === key);
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

    const headers = ['员工姓名', '加班类型', '开始时间', '结束时间', '时长(小时)', '状态', '加班原因', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.staffName,
      '加班类型': row.overtimeType,
      '开始时间': row.startTime,
      '结束时间': row.endTime,
      '时长(小时)': row.hours,
      '状态': row.status,
      '加班原因': row.reason,
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `加班记录_${new Date().toISOString().slice(0, 10)}.csv`;
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
      title: '加班类型',
      dataIndex: 'overtimeType',
      key: 'overtimeType',
      width: 120,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 180,
    },
    {
      title: '时长(小时)',
      dataIndex: 'hours',
      key: 'hours',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: OvertimeRecord['status']) => {
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
      width: 150,
      render: (_: any, record: OvertimeRecord) => (
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
  // 渲染
  // ============================================================

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">加班申请</h1>
            <p className="text-xs text-gray-500">提交加班申请，查看加班记录</p>
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

          {/* 加班类型筛选 */}
          <select
            value={filters.overtimeType}
            onChange={(e) => handleFilterChange('overtimeType', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部类型</option>
            {OVERTIME_TYPE_OPTIONS.map(opt => (
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
            新增加班
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
        title="新建加班申请"
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

          {/* 加班类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              加班类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.overtimeType}
              onChange={(e) => setFormData(prev => ({ ...prev, overtimeType: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {OVERTIME_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 开始时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              开始时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleTimeChange('startTime', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 结束时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              结束时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleTimeChange('endTime', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 时长显示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">加班时长</label>
            <div className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 flex items-center">
              {formData.hours > 0 ? (
                <span className="text-emerald-600">{formData.hours} 小时</span>
              ) : (
                <span className="text-gray-400">请选择开始和结束时间</span>
              )}
            </div>
          </div>

          {/* 加班费预览 */}
          {overtimeFeePreview && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">加班费预览</label>
              <div className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-emerald-50">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    时薪：<span className="text-emerald-700 font-medium">¥{overtimeFeePreview.hourlyRate}</span>
                  </span>
                  <span className="text-gray-600">
                    费率：<span className="text-emerald-700 font-medium">{overtimeFeePreview.rateText}</span>
                  </span>
                  <span className="text-gray-600">
                    加班时长：<span className="text-emerald-700 font-medium">{formData.hours} 小时</span>
                  </span>
                  <span className="text-gray-600">
                    预计加班费：<span className="text-emerald-700 font-bold">¥{overtimeFeePreview.totalFee}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 加班原因 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              加班原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入加班原因"
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
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            提交申请
          </button>
        </div>
      </UnifiedModal>

      {/* 详情弹窗 */}
      <UnifiedModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="加班详情"
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
                <label className="block text-sm font-medium text-gray-500 mb-1">加班类型</label>
                <div className="text-sm text-gray-900">{selectedRecord.overtimeType}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">开始时间</label>
                <div className="text-sm text-gray-900">{selectedRecord.startTime}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">结束时间</label>
                <div className="text-sm text-gray-900">{selectedRecord.endTime}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">加班时长</label>
                <div className="text-sm text-gray-900">{selectedRecord.hours} 小时</div>
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
                <label className="block text-sm font-medium text-gray-500 mb-1">加班原因</label>
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
