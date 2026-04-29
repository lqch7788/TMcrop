/**
 * 考勤补录页面 - 人工管理模块
 * 使用通用组件实现完整功能
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ClipboardCheck, Plus, Search, Download, Check, X, Eye, RefreshCw } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { workers } from '../../data/mockData';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';

// ============================================================
// 常量定义
// ============================================================

/** 补录原因选项 */
const REPAIR_REASON_OPTIONS = [
  { value: '忘记打卡', label: '忘记打卡' },
  { value: '外出办公', label: '外出办公' },
  { value: '出差', label: '出差' },
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

interface AttendanceRepairRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  status: '待审批' | '已通过' | '已拒绝' | '已取消';
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

interface AttendanceRepairFilters {
  employeeName: string;
  department: string;
  reason: string;
  status: string;
  startDate: string;
  endDate: string;
}

// ============================================================
// 主组件
// ============================================================

export default function AttendanceRepairPage() {
  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<AttendanceRepairFilters>({
    employeeName: '',
    department: '',
    reason: '',
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
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRepairRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    repairDate: '',
    checkInTime: '09:00',
    checkOutTime: '18:00',
    reason: '忘记打卡',
    customReason: '',
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

  /** 模拟考勤补录记录数据 */
  const [records, setRecords] = useState<AttendanceRepairRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选考勤补录类型的审批记录
    const repairApprovals = approvals.filter(a => a.type === ApprovalType.ATTENDANCE_REPAIR);

    // 转换为AttendanceRepairRecord格式
    const repairRecords: AttendanceRepairRecord[] = repairApprovals.map(approval => {
      const businessData = approval.businessLink as { employeeId?: string; employeeName?: string; department?: string; repairDate?: string; checkInTime?: string; checkOutTime?: string; reason?: string } | null;
      return {
        id: approval.id,
        employeeId: businessData?.employeeId || approval.applicantId,
        employeeName: businessData?.employeeName || approval.applicantName,
        department: businessData?.department || approval.applicantDepartment,
        repairDate: businessData?.repairDate || approval.applyDate,
        checkInTime: businessData?.checkInTime || '09:00',
        checkOutTime: businessData?.checkOutTime || '18:00',
        reason: businessData?.reason || '',
        status: mapApprovalStatus(approval.status),
        approver: approval.approvers[0]?.userName,
        approveTime: approval.approvers[0]?.actionTime,
        remarks: approval.remark,
      };
    });

    // 添加一些模拟初始数据
    const mockRecords: AttendanceRepairRecord[] = [
      { id: 'AR001', employeeId: 'EMP20240001', employeeName: '张伟民', department: '生产部', repairDate: '2026-04-20', checkInTime: '08:55', checkOutTime: '18:30', reason: '忘记打卡', status: '已通过', approver: '王建国', approveTime: '2026-04-20 17:00:00' },
      { id: 'AR002', employeeId: 'EMP20240002', employeeName: '李秀英', department: '生产部', repairDate: '2026-04-21', checkInTime: '09:10', checkOutTime: '18:00', reason: '外出办公', status: '待审批' },
      { id: 'AR003', employeeId: 'EMP20240003', employeeName: '王建国', department: '生产部', repairDate: '2026-04-22', checkInTime: '08:50', checkOutTime: '19:00', reason: '出差', status: '已拒绝', remarks: '出差未提供证明' },
    ];

    setRecords([...mockRecords, ...repairRecords]);
    setPagination(prev => ({ ...prev, total: mockRecords.length + repairRecords.length }));
  }, [approvals]);

  /** 状态映射 */
  const mapApprovalStatus = (status: ApprovalStatus): AttendanceRepairRecord['status'] => {
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
      if (filters.reason && record.reason !== filters.reason) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.repairDate < filters.startDate) return false;
      if (filters.endDate && record.repairDate > filters.endDate) return false;
      return true;
    });
  }, [records, filters]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = (field: keyof AttendanceRepairFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ employeeName: '', department: '', reason: '', status: '', startDate: '', endDate: '' });
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
      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: worker.name,
        department: worker.department,
      }));
    }
  };

  /** 打开新增弹窗 */
  const handleOpenFormModal = () => {
    setSelectedRecord(null);
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      repairDate: new Date().toISOString().slice(0, 10),
      checkInTime: '09:00',
      checkOutTime: '18:00',
      reason: '忘记打卡',
      customReason: '',
      remarks: '',
    });
    setIsFormModalOpen(true);
  };

  /** 打开详情弹窗 */
  const handleOpenDetailModal = (record: AttendanceRepairRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 提交考勤补录申请 */
  const handleSubmit = () => {
    if (!formData.employeeId || !formData.repairDate || !formData.checkInTime || !formData.checkOutTime) {
      alert('请填写完整信息');
      return;
    }

    // 当选择"其他"时，必须填写具体原因
    if (formData.reason === '其他' && !formData.customReason.trim()) {
      alert('请填写具体的补录原因');
      return;
    }

    // 如果选择"其他"，使用自定义原因
    const finalReason = formData.reason === '其他' ? formData.customReason : formData.reason;

    // 生成新记录
    const newRecord: AttendanceRepairRecord = {
      id: `AR${Date.now()}`,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      repairDate: formData.repairDate,
      checkInTime: formData.checkInTime,
      checkOutTime: formData.checkOutTime,
      reason: finalReason,
      status: '待审批',
      remarks: formData.remarks,
    };

    // 创建审批记录
    const approval: Approval = {
      id: `APR-AR-${Date.now()}`,
      code: `SP-AR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      type: ApprovalType.ATTENDANCE_REPAIR,
      typeName: '考勤补录',
      category: 'hr',
      title: `${formData.employeeName}考勤补录申请`,
      description: `${formData.repairDate} ${formData.checkInTime}-${formData.checkOutTime} (${finalReason})`,
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
        repairDate: newRecord.repairDate,
        checkInTime: newRecord.checkInTime,
        checkOutTime: newRecord.checkOutTime,
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
  const handleApprove = (record: AttendanceRepairRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意补录');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as AttendanceRepairRecord['status'] } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as AttendanceRepairRecord['status'] } : r)
      );
    }
  };

  /** 审批驳回 */
  const handleReject = (record: AttendanceRepairRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合补录条件');
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as AttendanceRepairRecord['status'] } : r)
      );
    } else {
      setRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as AttendanceRepairRecord['status'] } : r)
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

    const headers = ['员工姓名', '部门', '补录日期', '上班时间', '下班时间', '补录原因', '状态', '审批人', '审批时间', '备注'];
    const exportData = dataToExport.map(row => ({
      '员工姓名': row.employeeName,
      '部门': row.department,
      '补录日期': row.repairDate,
      '上班时间': row.checkInTime,
      '下班时间': row.checkOutTime,
      '补录原因': row.reason,
      '状态': row.status,
      '审批人': row.approver || '',
      '审批时间': row.approveTime || '',
      '备注': row.remarks || '',
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `考勤补录记录_${new Date().toISOString().slice(0, 10)}.csv`;
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
      width: 120,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: '补录日期',
      dataIndex: 'repairDate',
      key: 'repairDate',
      width: 120,
    },
    {
      title: '上班时间',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      width: 100,
    },
    {
      title: '下班时间',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      width: 100,
    },
    {
      title: '补录原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: AttendanceRepairRecord['status']) => {
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
      render: (_: any, record: AttendanceRepairRecord) => (
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
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">考勤补录</h1>
            <p className="text-xs text-gray-500">员工考勤异常补录申请</p>
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

          {/* 补录原因筛选 */}
          <select
            value={filters.reason}
            onChange={(e) => handleFilterChange('reason', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部原因</option>
            {REPAIR_REASON_OPTIONS.map(opt => (
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
            新增补录
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
        title="新建考勤补录申请"
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

          {/* 补录日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              补录日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.repairDate}
              onChange={(e) => setFormData(prev => ({ ...prev, repairDate: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 补录原因 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              补录原因 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {REPAIR_REASON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 自定义原因（当选择"其他"时显示） */}
          {formData.reason === '其他' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                具体原因 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customReason}
                onChange={(e) => setFormData(prev => ({ ...prev, customReason: e.target.value }))}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="请输入具体的补录原因"
              />
            </div>
          )}

          {/* 上班时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              上班时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.checkInTime}
              onChange={(e) => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 下班时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              下班时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.checkOutTime}
              onChange={(e) => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 备注 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={3}
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
        title="考勤补录详情"
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
                <label className="block text-sm font-medium text-gray-500 mb-1">补录日期</label>
                <div className="text-sm text-gray-900">{selectedRecord.repairDate}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">补录原因</label>
                <div className="text-sm text-gray-900">{selectedRecord.reason}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">上班时间</label>
                <div className="text-sm text-gray-900">{selectedRecord.checkInTime}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">下班时间</label>
                <div className="text-sm text-gray-900">{selectedRecord.checkOutTime}</div>
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
