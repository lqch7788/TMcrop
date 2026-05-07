// ============================================================
// HR审批中心页面 - 增强版本
// 文件路径：src/pages/HrApproval.tsx
// 功能：审批列表加载、类型筛选、状态筛选、日期范围筛选、
//       查看详情、审批通过/拒绝、批量审批、分页
// 使用组件：ProModal、ProTable、StatusBadge、BatchActionBar
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Calendar, Clock, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { message } from 'antd';
import { useHrApprovals } from '../hooks/useApproval';
import { Approval, ApprovalStatus, ApprovalType, getApprovalTypeName, getApprovalStatusName } from '../types/approval';
import ProModal from '../components/common/modal/ProModal';
import ProTable, { Column } from '../components/common/table/ProTable';
import StatusBadge from '../components/common/badge/StatusBadge';

// ============================================================
// 审批类型选项（10种类型）
// ============================================================
const APPROVAL_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: ApprovalType.LEAVE, label: '请假申请' },
  { value: ApprovalType.OVERTIME, label: '加班申请' },
  { value: ApprovalType.RESIGNATION, label: '离职申请' },
  { value: ApprovalType.RECRUITMENT, label: '招聘申请' },
  { value: ApprovalType.ONBOARDING, label: '入职办理' },
  { value: ApprovalType.ATTENDANCE_REPAIR, label: '考勤补录' },
  { value: ApprovalType.SALARY_ADJUSTMENT, label: '调薪申请' },
  { value: ApprovalType.CONTRACT_RENEWAL, label: '合同续签' },
  { value: ApprovalType.SALARY_BUDGET, label: '工资预算' },
  { value: ApprovalType.TRANSFER, label: '转岗申请' },
];

// ============================================================
// 审批状态选项（含已拒绝）
// ============================================================
const APPROVAL_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: ApprovalStatus.PENDING, label: '待审批' },
  { value: ApprovalStatus.APPROVED, label: '已通过' },
  { value: ApprovalStatus.REJECTED, label: '已拒绝' },
];

// ============================================================
// BatchActionBar 批量操作栏组件
// ============================================================
interface BatchActionBarProps {
  selectedCount: number;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onCancel: () => void;
}

function BatchActionBar({ selectedCount, onBatchApprove, onBatchReject, onCancel }: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
      <div className="text-sm text-gray-600">
        已选择 <strong className="text-emerald-600">{selectedCount}</strong> 项
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onBatchApprove}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          批量通过
        </button>
        <button
          onClick={onBatchReject}
          className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          批量驳回
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
        >
          取消
        </button>
      </div>
    </div>
  );
}

// ============================================================
// HrApproval 主组件
// ============================================================
export default function HrApproval() {
  const { hrApprovals, getApprovalById, approve, reject } = useHrApprovals();

  // 筛选状态
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 选中状态（批量操作）
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 弹窗状态
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [batchApproveModalOpen, setBatchApproveModalOpen] = useState(false);
  const [batchRejectModalOpen, setBatchRejectModalOpen] = useState(false);

  // 当前操作的审批记录
  const [currentRecord, setCurrentRecord] = useState<Approval | null>(null);

  // 审批意见（通过）
  const [approveComment, setApproveComment] = useState<string>('');

  // 批量审批意见
  const [batchApproveComment, setBatchApproveComment] = useState<string>('');

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return hrApprovals.filter(a => {
      // 类型筛选
      const matchType = typeFilter === 'all' || a.type === typeFilter;
      // 状态筛选
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      // 日期范围筛选
      const matchStartDate = !startDate || a.applyDate >= startDate;
      const matchEndDate = !endDate || a.applyDate <= endDate;
      // 关键词搜索
      const matchSearch = !searchTerm ||
        a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.applicantName?.includes(searchTerm) ||
        a.code?.includes(searchTerm);

      return matchType && matchStatus && matchStartDate && matchEndDate && matchSearch;
    });
  }, [hrApprovals, typeFilter, statusFilter, startDate, endDate, searchTerm]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 统计数据
  const stats = useMemo(() => {
    return {
      pending: hrApprovals.filter(a => a.status === ApprovalStatus.PENDING).length,
      approved: hrApprovals.filter(a => a.status === ApprovalStatus.APPROVED).length,
      rejected: hrApprovals.filter(a => a.status === ApprovalStatus.REJECTED).length,
    };
  }, [hrApprovals]);

  // 查看详情
  const handleViewDetail = useCallback((record: Approval) => {
    setCurrentRecord(record);
    setDetailModalOpen(true);
  }, []);

  // 单条审批 - 通过
  const handleApprove = useCallback((record: Approval) => {
    setCurrentRecord(record);
    setApproveModalOpen(true);
  }, []);

  // 单条审批 - 拒绝
  const handleReject = useCallback((record: Approval) => {
    setCurrentRecord(record);
    setRejectModalOpen(true);
  }, []);

  // 确认通过
  const handleConfirmApprove = useCallback(() => {
    if (currentRecord) {
      approve(currentRecord.id, approveComment || '审批通过');
      message.success('审批已通过');
      setApproveModalOpen(false);
      setCurrentRecord(null);
      setApproveComment('');
    }
  }, [currentRecord, approve, approveComment]);

  // 确认拒绝
  const handleConfirmReject = useCallback(() => {
    if (currentRecord) {
      reject(currentRecord.id, '审批拒绝');
      message.success('已驳回');
      setRejectModalOpen(false);
      setCurrentRecord(null);
    }
  }, [currentRecord, reject]);

  // 批量通过
  const handleBatchApprove = useCallback(() => {
    if (selectedRowKeys.length === 0) return;
    setBatchApproveModalOpen(true);
  }, [selectedRowKeys]);

  // 批量拒绝
  const handleBatchReject = useCallback(() => {
    if (selectedRowKeys.length === 0) return;
    setBatchRejectModalOpen(true);
  }, [selectedRowKeys]);

  // 确认批量通过
  const handleConfirmBatchApprove = useCallback(() => {
    const comment = batchApproveComment || '批量审批通过';
    selectedRowKeys.forEach(key => {
      approve(key as string, comment);
    });
    message.success(`已通过 ${selectedRowKeys.length} 项审批`);
    setSelectedRowKeys([]);
    setBatchApproveModalOpen(false);
    setBatchApproveComment('');
  }, [selectedRowKeys, approve, batchApproveComment]);

  // 确认批量拒绝
  const handleConfirmBatchReject = useCallback(() => {
    selectedRowKeys.forEach(key => {
      reject(key as string, '批量驳回');
    });
    message.success(`已驳回 ${selectedRowKeys.length} 项审批`);
    setSelectedRowKeys([]);
    setBatchRejectModalOpen(false);
  }, [selectedRowKeys, reject]);

  // 取消批量选择
  const handleCancelBatch = useCallback(() => {
    setSelectedRowKeys([]);
  }, []);

  // 行选择变化
  const handleRowSelectionChange = useCallback((keys: React.Key[], rows: Approval[]) => {
    setSelectedRowKeys(keys);
  }, []);

  // ProTable 列配置
  const columns: Column[] = useMemo(() => [
    {
      title: '申请单号',
      dataIndex: 'code',
      width: 150,
      sortable: true,
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      width: 100,
    },
    {
      title: '类型',
      dataIndex: 'typeName',
      width: 100,
      filters: APPROVAL_TYPE_OPTIONS.slice(1).map(t => ({ text: t.label, value: t.value })),
    },
    {
      title: '申请时间',
      dataIndex: 'applyDate',
      width: 120,
      sortable: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: ApprovalStatus) => <StatusBadge status={value} />,
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 150,
      render: (_: any, record: Approval) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(record)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="查看"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === ApprovalStatus.PENDING && (
            <>
              <button
                onClick={() => handleApprove(record)}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                title="通过"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(record)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="拒绝"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ], [handleViewDetail, handleApprove, handleReject]);

  // 详情弹窗内容
  const renderDetailContent = () => {
    if (!currentRecord) return null;
    const bl = currentRecord.businessLink;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">申请单号</label>
            <p className="font-medium">{currentRecord.code}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">类型</label>
            <p className="font-medium">{currentRecord.typeName}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">申请人</label>
            <p className="font-medium">{currentRecord.applicantName}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">部门</label>
            <p className="font-medium">{currentRecord.applicantDepartment}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">申请时间</label>
            <p className="font-medium">{currentRecord.applyDate} {currentRecord.applyTime}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">状态</label>
            <p className="font-medium"><StatusBadge status={currentRecord.status} /></p>
          </div>
        </div>
        {currentRecord.title && (
          <div>
            <label className="text-sm text-gray-500">标题</label>
            <p className="font-medium">{currentRecord.title}</p>
          </div>
        )}
        {currentRecord.description && (
          <div>
            <label className="text-sm text-gray-500">描述</label>
            <p className="text-gray-700">{currentRecord.description}</p>
          </div>
        )}
        {/* 业务关联信息 */}
        {bl && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">详细信息</h4>
            {bl.leaveType && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">请假类型</label>
                  <p className="font-medium">{bl.leaveType}</p>
                </div>
                {bl.startDate && (
                  <div>
                    <label className="text-sm text-gray-500">开始日期</label>
                    <p className="font-medium">{bl.startDate}</p>
                  </div>
                )}
                {bl.endDate && (
                  <div>
                    <label className="text-sm text-gray-500">结束日期</label>
                    <p className="font-medium">{bl.endDate}</p>
                  </div>
                )}
                {bl.totalDays && (
                  <div>
                    <label className="text-sm text-gray-500">天数</label>
                    <p className="font-medium">{bl.totalDays}天</p>
                  </div>
                )}
              </div>
            )}
            {bl.overtimeType && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">加班类型</label>
                  <p className="font-medium">{bl.overtimeType}</p>
                </div>
                {bl.date && (
                  <div>
                    <label className="text-sm text-gray-500">加班日期</label>
                    <p className="font-medium">{bl.date}</p>
                  </div>
                )}
                {bl.startTime && (
                  <div>
                    <label className="text-sm text-gray-500">开始时间</label>
                    <p className="font-medium">{bl.startTime}</p>
                  </div>
                )}
                {bl.endTime && (
                  <div>
                    <label className="text-sm text-gray-500">结束时间</label>
                    <p className="font-medium">{bl.endTime}</p>
                  </div>
                )}
                {bl.totalHours && (
                  <div>
                    <label className="text-sm text-gray-500">总时长</label>
                    <p className="font-medium">{bl.totalHours}小时</p>
                  </div>
                )}
              </div>
            )}
            {bl.reason && (
              <div className="mt-3">
                <label className="text-sm text-gray-500">原因</label>
                <p className="text-gray-700">{bl.reason}</p>
              </div>
            )}
          </div>
        )}
        {/* 审批流程 */}
        {currentRecord.approvers && currentRecord.approvers.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">审批人</h4>
            <div className="space-y-2">
              {currentRecord.approvers.map((approver, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{approver.userName}</span>
                    <span className="text-gray-500 ml-2">{approver.role}</span>
                  </div>
                  <StatusBadge status={approver.status === 'approved' ? ApprovalStatus.APPROVED : approver.status === 'rejected' ? ApprovalStatus.REJECTED : ApprovalStatus.PENDING} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings/personnel" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">人事审批中心</h1>
            <p className="text-gray-500">人事相关审批流程管理</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-500">待审批</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-xs text-gray-500">已通过</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-xs text-gray-500">已拒绝</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              <p className="text-xs text-gray-500">总记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 关键词搜索 */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词搜索</label>
            <input
              type="text"
              placeholder="搜索申请人、申请单号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          {/* 类型筛选 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">审批类型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {APPROVAL_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {/* 状态筛选 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">审批状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {APPROVAL_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {/* 开始日期 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          {/* 结束日期 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          {/* 搜索按钮 */}
          <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>

      {/* 批量操作栏 */}
      <BatchActionBar
        selectedCount={selectedRowKeys.length}
        onBatchApprove={handleBatchApprove}
        onBatchReject={handleBatchReject}
        onCancel={handleCancelBatch}
      />

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <ProTable
          columns={columns}
          dataSource={paginatedData}
          loading={false}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: handleRowSelectionChange,
          }}
          scroll={{ x: 800 }}
        />
        {/* 分页 */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              共 {totalCount} 条记录，第 {currentPage}/{totalPages || 1} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(totalPages || 1)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-emerald-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
                disabled={currentPage === (totalPages || 1)}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {totalCount === 0 && (
          <div className="p-8 text-center text-gray-500">暂无审批记录</div>
        )}
      </div>

      {/* 详情弹窗 */}
      <ProModal
        title="审批详情"
        type="info"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={720}
      >
        {renderDetailContent()}
      </ProModal>

      {/* 通过确认弹窗 */}
      <ProModal
        title="审批确认"
        type="primary"
        open={approveModalOpen}
        onCancel={() => setApproveModalOpen(false)}
        onOk={handleConfirmApprove}
        width={400}
      >
        <p className="text-gray-700">
          确定要通过该审批申请吗？
        </p>
        {currentRecord && (
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p><strong>申请人：</strong>{currentRecord.applicantName}</p>
            <p><strong>类型：</strong>{currentRecord.typeName}</p>
          </div>
        )}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">审批意见（可选）</label>
          <textarea
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            placeholder="请输入审批意见..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </ProModal>

      {/* 拒绝确认弹窗 */}
      <ProModal
        title="驳回确认"
        type="error"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleConfirmReject}
        width={400}
      >
        <p className="text-gray-700">
          确定要驳回该审批申请吗？
        </p>
        {currentRecord && (
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p><strong>申请人：</strong>{currentRecord.applicantName}</p>
            <p><strong>类型：</strong>{currentRecord.typeName}</p>
          </div>
        )}
      </ProModal>

      {/* 批量通过确认弹窗 */}
      <ProModal
        title="批量审批确认"
        type="primary"
        open={batchApproveModalOpen}
        onCancel={() => setBatchApproveModalOpen(false)}
        onOk={handleConfirmBatchApprove}
        width={400}
      >
        <p className="text-gray-700">
          确定要通过选中的 <strong className="text-green-600">{selectedRowKeys.length}</strong> 项审批吗？
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">审批意见（可选）</label>
          <textarea
            value={batchApproveComment}
            onChange={(e) => setBatchApproveComment(e.target.value)}
            placeholder="请输入审批意见..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </ProModal>

      {/* 批量驳回确认弹窗 */}
      <ProModal
        title="批量驳回确认"
        type="error"
        open={batchRejectModalOpen}
        onCancel={() => setBatchRejectModalOpen(false)}
        onOk={handleConfirmBatchReject}
        width={400}
      >
        <p className="text-gray-700">
          确定要驳回选中的 <strong className="text-red-600">{selectedRowKeys.length}</strong> 项审批吗？
        </p>
      </ProModal>
    </div>
  );
}
