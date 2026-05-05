/**
 * 离职申请页面 - 人工管理模块
 * 文件路径：src/pages/labor/ResignationPage.tsx
 * 功能：提交离职申请、查看离职记录、状态筛选、审批功能
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { LogOut, Plus, Search, Download, Check, X, Eye, RefreshCw, UserX } from 'lucide-react';
import { UnifiedModal } from '../../components/ui/UnifiedModal';
import ProTable from '../../components/common/table/ProTable';
import { LaborStatusBadge } from '../../components/common/labor/LaborStatusBadge';
import { useUsers } from '../../components/common/settings';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';
import { useApprovalLevel } from '../../hooks/useApprovalLevel';

// ============================================================
// 类型定义
// ============================================================

/** 离职类型 */
type ResignationType = '主动离职' | '被动离职';

/** 主动离职原因 */
type VoluntaryReason = '个人发展' | '家庭原因' | '薪资待遇' | '工作环境' | '其他';

/** 被动离职原因 */
type InvoluntaryReason = '合同到期' | '试用期不合格' | '绩效不达标' | '违纪' | '其他';

/** 离职记录状态 */
type ResignationStatus = '待审批' | '已通过' | '已拒绝' | '已取消';

/** 离职记录 */
interface ResignationRecord {
  id: string;
  resignationCode: string;      // 离职编号
  workerId: string;             // 申请人ID
  workerName: string;           // 申请人
  resignationType: ResignationType;  // 离职类型
  reason: string;              // 离职原因
  expectedLastDay: string;      // 预计最后工作日
  handoverNote: string;        // 交接说明
  handoverUserId: string;       // 交接人ID
  handoverUserName: string;     // 交接人姓名
  status: ResignationStatus;   // 状态
  createTime: string;          // 申请时间
}

/** 筛选条件 */
interface ResignationFilters {
  workerName: string;
  resignationType: ResignationType | '';
  status: ResignationStatus | '';
  startDate: string;
  endDate: string;
}

// ============================================================
// 常量定义
// ============================================================

/** 离职类型选项 */
const RESIGNATION_TYPE_OPTIONS: { value: ResignationType; label: string }[] = [
  { value: '主动离职', label: '主动离职' },
  { value: '被动离职', label: '被动离职' },
];

/** 主动离职原因选项 */
const VOLUNTARY_REASONS: { value: VoluntaryReason; label: string }[] = [
  { value: '个人发展', label: '个人发展' },
  { value: '家庭原因', label: '家庭原因' },
  { value: '薪资待遇', label: '薪资待遇' },
  { value: '工作环境', label: '工作环境' },
  { value: '其他', label: '其他' },
];

/** 被动离职原因选项 */
const INVOLUNTARY_REASONS: { value: InvoluntaryReason; label: string }[] = [
  { value: '合同到期', label: '合同到期' },
  { value: '试用期不合格', label: '试用期不合格' },
  { value: '绩效不达标', label: '绩效不达标' },
  { value: '违纪', label: '违纪' },
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
// 主组件
// ============================================================

export default function ResignationPage() {
  const { workers } = useUsers();

  // ============================================================
  // 状态定义
  // ============================================================

  /** 筛选条件 */
  const [filters, setFilters] = useState<ResignationFilters>({
    workerName: '',
    resignationType: '',
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
  const [selectedRecord, setSelectedRecord] = useState<ResignationRecord | null>(null);

  /** 批量选择 */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /** 表单数据 */
  const [formData, setFormData] = useState({
    workerId: '',
    workerName: '',
    resignationType: '主动离职' as ResignationType,
    reason: '',
    expectedLastDay: '',
    handoverUserId: '',
    handoverUserName: '',
    handoverNote: '',
  });

  /** 批量操作模式 */
  const [batchMode, setBatchMode] = useState<'none' | 'approve' | 'reject' | 'export'>('none');

  // ============================================================
  // Context & Hooks
  // ============================================================

  const { addApproval, approve, reject, getFilteredApprovals, approvals } = useApprovalContext();
  const { generateApprovers } = useApprovalLevel();

  // ============================================================
  // 数据处理
  // ============================================================

  /** 离职记录数据 - 从ApprovalContext中筛选离职类型的审批记录 */
  const [resignationRecords, setResignationRecords] = useState<ResignationRecord[]>([]);

  /** 初始化加载数据 */
  useEffect(() => {
    // 从ApprovalContext中筛选离职类型的审批记录
    const resignationApprovals = approvals.filter(a => a.type === ApprovalType.RESIGNATION);

    // 转换为ResignationRecord格式
    const records: ResignationRecord[] = resignationApprovals.map(approval => {
      const businessData = approval.businessLink as {
        resignationId?: string;
        resignationType?: string;
        expectedResignDate?: string;
        reason?: string;
        handoverNotes?: string;
        handoverUserId?: string;
        handoverUserName?: string;
      } | null;

      return {
        id: approval.id,
        resignationCode: approval.code,
        workerId: approval.applicantId,
        workerName: approval.applicantName,
        resignationType: (businessData?.resignationType as ResignationType) || '主动离职',
        reason: businessData?.reason || '',
        expectedLastDay: businessData?.expectedResignDate || approval.applyDate,
        handoverNote: businessData?.handoverNotes || '',
        handoverUserId: businessData?.handoverUserId || '',
        handoverUserName: businessData?.handoverUserName || '',
        status: mapApprovalStatus(approval.status),
        createTime: approval.applyDate,
      };
    });

    // 按创建时间倒序排列
    records.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());

    setResignationRecords(records);
    setPagination(prev => ({ ...prev, total: records.length }));
  }, [approvals]);

  /** 状态映射 - 将ApprovalStatus转换为ResignationStatus */
  const mapApprovalStatus = (status: ApprovalStatus): ResignationStatus => {
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
    return resignationRecords.filter(record => {
      if (filters.workerName && !record.workerName.includes(filters.workerName)) return false;
      if (filters.resignationType && record.resignationType !== filters.resignationType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.startDate && record.createTime < filters.startDate) return false;
      if (filters.endDate && record.createTime > filters.endDate) return false;
      return true;
    });
  }, [resignationRecords, filters]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选条件变化 */
  const handleFilterChange = (field: keyof ResignationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /** 重置筛选 */
  const handleResetFilters = () => {
    setFilters({ workerName: '', resignationType: '', status: '', startDate: '', endDate: '' });
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
      workerId: '',
      workerName: '',
      resignationType: '主动离职',
      reason: '',
      expectedLastDay: '',
      handoverUserId: '',
      handoverUserName: '',
      handoverNote: '',
    });
    setIsFormModalOpen(true);
  };

  /** 打开详情弹窗 */
  const handleOpenDetailModal = (record: ResignationRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  /** 员工选择变化 */
  const handleWorkerChange = (workerId: string) => {
    const worker = workers.find(w => w.workerId === workerId);
    if (worker) {
      setFormData(prev => ({ ...prev, workerId, workerName: worker.name }));
    }
  };

  /** 交接人选择变化 */
  const handleHandoverUserChange = (userId: string) => {
    const worker = workers.find(w => w.workerId === userId);
    if (worker) {
      setFormData(prev => ({ ...prev, handoverUserId: userId, handoverUserName: worker.name }));
    }
  };

  /** 离职类型变化 - 清空原因 */
  const handleResignationTypeChange = (type: ResignationType) => {
    setFormData(prev => ({ ...prev, resignationType: type, reason: '' }));
  };

  /** 提交离职申请 */
  const handleSubmit = () => {
    if (!formData.workerId || !formData.expectedLastDay || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    // 检查预计离职日期是否提前30天通知
    const today = new Date();
    const lastDay = new Date(formData.expectedLastDay);
    const daysDiff = Math.ceil((lastDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 30 && daysDiff >= 0) {
      const confirmSubmit = window.confirm(`温馨提示：您选择的预计离职日期距离今天不足30天，是否确认提交？`);
      if (!confirmSubmit) return;
    } else if (daysDiff < 0) {
      alert('预计离职日期不能早于今天，请重新选择');
      return;
    }

    // 生成新记录
    const newRecord: ResignationRecord = {
      id: `RSG${Date.now()}`,
      resignationCode: `LZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      workerId: formData.workerId,
      workerName: formData.workerName,
      resignationType: formData.resignationType,
      reason: formData.reason,
      expectedLastDay: formData.expectedLastDay,
      handoverNote: formData.handoverNote,
      handoverUserId: formData.handoverUserId,
      handoverUserName: formData.handoverUserName,
      status: '待审批',
      createTime: new Date().toISOString().slice(0, 10),
    };

    // 创建审批记录 - 使用分级审批动态生成审批人配置（离职强制严格审批）
    const approvalLevelResult = generateApprovers(ApprovalType.RESIGNATION, 0);

    const approval: Approval = {
      id: `APR-${Date.now()}`,
      code: newRecord.resignationCode,
      type: ApprovalType.RESIGNATION,
      typeName: '离职申请',
      category: 'hr',
      title: `${formData.workerName}申请离职（${formData.resignationType}）`,
      description: `${formData.resignationType}：${formData.reason}`,
      applicantId: formData.workerId,
      applicantName: formData.workerName,
      applicantDepartment: workers.find(w => w.workerId === formData.workerId)?.department || '生产部',
      applyDate: new Date().toISOString().slice(0, 10),
      applyTime: new Date().toISOString().slice(11, 19),
      priority: 'normal',
      status: ApprovalStatus.PENDING,
      currentStep: 1,
      totalSteps: approvalLevelResult.totalSteps,
      approvers: approvalLevelResult.approvers,
      records: [],
      reminderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSent: true,
      businessLink: {
        type: 'resign',
        requestId: newRecord.id,
        requestCode: newRecord.resignationCode,
        resignationType: formData.resignationType,
        expectedResignDate: formData.expectedLastDay,
        reason: formData.reason,
        handoverNotes: formData.handoverNote,
        handoverUserId: formData.handoverUserId,
        handoverUserName: formData.handoverUserName,
      },
    };

    // 添加到Context
    addApproval(approval);

    // 更新本地状态
    setResignationRecords(prev => [newRecord, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    setIsFormModalOpen(false);
    alert('提交成功！');
  };

  /** 审批通过 */
  const handleApprove = (record: ResignationRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      approve(approval.id, '同意');
      setResignationRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已通过' as ResignationStatus } : r)
      );
    }
  };

  /** 审批驳回 */
  const handleReject = (record: ResignationRecord) => {
    const approval = approvals.find(a => a.id === record.id);
    if (approval) {
      reject(approval.id, '不符合条件');
      setResignationRecords(prev =>
        prev.map(r => r.id === record.id ? { ...r, status: '已拒绝' as ResignationStatus } : r)
      );
    }
  };

  /** 批量审批通过 */
  const handleBatchApprove = () => {
    selectedRowKeys.forEach(key => {
      const record = resignationRecords.find(r => r.id === key);
      if (record) handleApprove(record);
    });
    setSelectedRowKeys([]);
    setBatchMode('none');
  };

  /** 批量审批驳回 */
  const handleBatchReject = () => {
    selectedRowKeys.forEach(key => {
      const record = resignationRecords.find(r => r.id === key);
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

    const headers = ['离职编号', '申请人', '离职类型', '离职原因', '预计最后工作日', '交接人', '交接说明', '状态', '申请时间'];
    const exportData = dataToExport.map(row => ({
      '离职编号': row.resignationCode,
      '申请人': row.workerName,
      '离职类型': row.resignationType,
      '离职原因': row.reason,
      '预计最后工作日': row.expectedLastDay,
      '交接人': row.handoverUserName,
      '交接说明': row.handoverNote,
      '状态': row.status,
      '申请时间': row.createTime,
    }));

    const content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `离职记录_${new Date().toISOString().slice(0, 10)}.csv`;
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
      title: '离职编号',
      dataIndex: 'resignationCode',
      key: 'resignationCode',
      width: 180,
    },
    {
      title: '申请人',
      dataIndex: 'workerName',
      key: 'workerName',
      width: 100,
    },
    {
      title: '离职类型',
      dataIndex: 'resignationType',
      key: 'resignationType',
      width: 100,
    },
    {
      title: '离职原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
      ellipsis: true,
    },
    {
      title: '预计最后工作日',
      dataIndex: 'expectedLastDay',
      key: 'expectedLastDay',
      width: 130,
    },
    {
      title: '交接人',
      dataIndex: 'handoverUserName',
      key: 'handoverUserName',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: ResignationStatus) => {
        const statusMap: Record<ResignationStatus, { label: string; status: string }> = {
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
      title: '申请时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ResignationRecord) => (
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
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">离职申请</h1>
            <p className="text-xs text-gray-500">提交离职申请，查看离职记录</p>
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
              value={filters.workerName}
              onChange={(e) => handleFilterChange('workerName', e.target.value)}
              className="h-9 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 离职类型筛选 */}
          <select
            value={filters.resignationType}
            onChange={(e) => handleFilterChange('resignationType', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {RESIGNATION_TYPE_OPTIONS.map(opt => (
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
            新增离职
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
        title="新建离职申请"
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
              value={formData.workerId}
              onChange={(e) => handleWorkerChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择员工</option>
              {(workers || []).map(w => (
                <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
              ))}
            </select>
          </div>

          {/* 离职类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              离职类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.resignationType}
              onChange={(e) => handleResignationTypeChange(e.target.value as ResignationType)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {RESIGNATION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 离职原因 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              离职原因 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择原因</option>
              {formData.resignationType === '主动离职' && VOLUNTARY_REASONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              {formData.resignationType === '被动离职' && INVOLUNTARY_REASONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 预计最后工作日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预计最后工作日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.expectedLastDay}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedLastDay: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">注：需提前30天通知</p>
          </div>

          {/* 工作交接人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              工作交接人
            </label>
            <select
              value={formData.handoverUserId}
              onChange={(e) => handleHandoverUserChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择交接人</option>
              {(workers || []).filter(w => w.workerId !== formData.workerId).map(w => (
                <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
              ))}
            </select>
          </div>

          {/* 交接说明 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              交接说明
            </label>
            <textarea
              value={formData.handoverNote}
              onChange={(e) => setFormData(prev => ({ ...prev, handoverNote: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入工作交接说明"
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
        title="离职详情"
        size="lg"
        showFooter={false}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">离职编号</label>
                <div className="text-sm text-gray-900">{selectedRecord.resignationCode}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">申请人</label>
                <div className="text-sm text-gray-900">{selectedRecord.workerName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">离职类型</label>
                <div className="text-sm text-gray-900">{selectedRecord.resignationType}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">离职原因</label>
                <div className="text-sm text-gray-900">{selectedRecord.reason}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">预计最后工作日</label>
                <div className="text-sm text-gray-900">{selectedRecord.expectedLastDay}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">工作交接人</label>
                <div className="text-sm text-gray-900">{selectedRecord.handoverUserName || '未指定'}</div>
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
                <label className="block text-sm font-medium text-gray-500 mb-1">申请时间</label>
                <div className="text-sm text-gray-900">{selectedRecord.createTime}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">交接说明</label>
                <div className="text-sm text-gray-900">{selectedRecord.handoverNote || '无'}</div>
              </div>
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
