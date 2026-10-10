// ============================================================
// HR审批中心页面 - 增强版本
// 文件路径：src/pages/HrApproval.tsx
// 功能：审批列表加载、类型筛选、状态筛选、日期范围筛选、
//       查看详情、审批通过/拒绝、批量审批、分页
// 使用组件：ProModal、ProTable、StatusBadge、BatchActionBar
// ============================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Calendar, Clock, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight, Download, FileText, Coins } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useHrApprovals } from '../hooks/useApproval';
import { useApprovalStore } from '../stores/useApprovalStore';
import { todayLocal } from '../lib/dateUtils';
import { Approval, ApprovalStatus, ApprovalType, getApprovalTypeName, getApprovalStatusName } from '../types/approval';
import ProModal from '../components/common/modal/ProModal';
import ProTable, { Column } from '../components/common/table/ProTable';
import StatusBadge from '../components/common/badge/StatusBadge';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { KpiCard, KpiCardGrid } from '@/components/summary';

// ============================================================
// 审批 Tab 划分（2026-10-10：按业务家族分 5 组，对齐库存审批页的 tab 模式）
//   考勤补录 / 调薪 / 转岗三类功能未建设（无页面/无路由/无表），暂不设 tab，
//   将来建设后按家族并入（考勤补录→假勤、调薪→薪酬、转岗→人员异动）
// ============================================================
const HR_TABS = [
  { key: 'leave', label: '请假审批', icon: Calendar, types: [ApprovalType.LEAVE] },
  { key: 'overtime', label: '加班审批', icon: Clock, types: [ApprovalType.OVERTIME] },
  { key: 'mobility', label: '人员异动', icon: Users, types: [ApprovalType.RECRUITMENT, ApprovalType.ONBOARDING, ApprovalType.RESIGNATION] },
  { key: 'contract', label: '合同审批', icon: FileText, types: [ApprovalType.CONTRACT_RENEWAL] },
  { key: 'salary', label: '薪酬审批', icon: Coins, types: [ApprovalType.SALARY_BUDGET] },
] as const;

type HrTabKey = typeof HR_TABS[number]['key'];

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
// HrApproval 主组件
// ============================================================
export default function HrApproval() {
  const { hrApprovals, getApprovalById, approve, reject } = useHrApprovals();
  const { toast } = useToast();

  // 2026-10-10 审计修复：页面从不主动拉取审批数据——直接进入本页时 store 为空（整页加载后
  //   Zustand 重新初始化），列表恒"暂无数据"；先访问其它审批页再进本页才有数据。
  //   补挂载拉取（与 FarmApproval 2026-10-10 同款修复；失败由 store error 承载）
  useEffect(() => {
    useApprovalStore.getState().fetchApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 筛选状态（2026-10-10：类型筛选下拉改为 5 组业务家族 tab）
  const [activeTab, setActiveTab] = useState<HrTabKey>('leave');
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

  // 2026-10-10 审计修复：驳回原因（此前拒绝弹窗无输入框、硬编码"审批拒绝"，意见永远无法填写）
  const [rejectComment, setRejectComment] = useState<string>('');
  const [batchRejectComment, setBatchRejectComment] = useState<string>('');

  // 筛选后的数据
  const filteredData = useMemo(() => {
    const currentTab = HR_TABS.find(t => t.key === activeTab);
    if (!currentTab) return [];
    return hrApprovals.filter(a => {
      // Tab 分组筛选（当前组内成员类型）
      const matchTab = (currentTab.types as readonly string[]).includes(a.type);
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

      return matchTab && matchStatus && matchStartDate && matchEndDate && matchSearch;
    });
  }, [hrApprovals, activeTab, statusFilter, startDate, endDate, searchTerm]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 统计数据（2026-10-10：跟随当前 tab——与库存审批页口径一致）
  const stats = useMemo(() => {
    const currentTab = HR_TABS.find(t => t.key === activeTab);
    const tabData = currentTab
      ? hrApprovals.filter(a => (currentTab.types as readonly string[]).includes(a.type))
      : [];
    return {
      pending: tabData.filter(a => a.status === ApprovalStatus.PENDING).length,
      approved: tabData.filter(a => a.status === ApprovalStatus.APPROVED).length,
      rejected: tabData.filter(a => a.status === ApprovalStatus.REJECTED).length,
      total: tabData.length,
    };
  }, [hrApprovals, activeTab]);

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
  // 2026-10-10 审计修复：必须 await 审批结果——此前 fire-and-forget 立即报成功，
  // 后端失败（如联动失败）时界面照常关闭、用户以为审批成功（对照物料审批页 2026-09-28 同款修复）
  const handleConfirmApprove = useCallback(async () => {
    if (!currentRecord) return;
    const ok = await approve(currentRecord.id, approveComment || '审批通过');
    if (!ok) {
      const reason = useApprovalStore.getState().error || '未知原因';
      toast.error(`审批通过失败：${reason}`);
      return;
    }
    toast.success('审批已通过');
    setApproveModalOpen(false);
    setCurrentRecord(null);
    setApproveComment('');
  }, [currentRecord, approve, approveComment, toast]);

  // 确认拒绝（驳回原因必填）
  const handleConfirmReject = useCallback(async () => {
    if (!currentRecord) return;
    if (!rejectComment.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    const ok = await reject(currentRecord.id, rejectComment.trim());
    if (!ok) {
      const reason = useApprovalStore.getState().error || '未知原因';
      toast.error(`驳回失败：${reason}`);
      return;
    }
    toast.success('已驳回');
    setRejectModalOpen(false);
    setCurrentRecord(null);
    setRejectComment('');
  }, [currentRecord, reject, rejectComment, toast]);

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

  // 确认批量通过（2026-10-10：逐条 await 收集结果，部分失败如实报告——此前 forEach 并发零反馈）
  const handleConfirmBatchApprove = useCallback(async () => {
    const comment = batchApproveComment || '批量审批通过';
    const ids = selectedRowKeys as string[];
    let okCount = 0;
    let failCount = 0;
    for (const id of ids) {
      const ok = await approve(id, comment);
      if (ok) okCount++; else failCount++;
    }
    if (failCount > 0) {
      const reason = useApprovalStore.getState().error || '未知原因';
      toast.error(`批量通过：成功 ${okCount} 条，失败 ${failCount} 条（${reason}）`);
    } else {
      toast.success(`已通过 ${okCount} 项审批`);
    }
    setSelectedRowKeys([]);
    setBatchApproveModalOpen(false);
    setBatchApproveComment('');
  }, [selectedRowKeys, approve, batchApproveComment, toast]);

  // 确认批量拒绝（驳回原因必填 + 逐条 await 收集结果）
  const handleConfirmBatchReject = useCallback(async () => {
    if (!batchRejectComment.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    const ids = selectedRowKeys as string[];
    let okCount = 0;
    let failCount = 0;
    for (const id of ids) {
      const ok = await reject(id, batchRejectComment.trim());
      if (ok) okCount++; else failCount++;
    }
    if (failCount > 0) {
      const reason = useApprovalStore.getState().error || '未知原因';
      toast.error(`批量驳回：成功 ${okCount} 条，失败 ${failCount} 条（${reason}）`);
    } else {
      toast.success(`已驳回 ${okCount} 项审批`);
    }
    setSelectedRowKeys([]);
    setBatchRejectModalOpen(false);
    setBatchRejectComment('');
  }, [selectedRowKeys, reject, batchRejectComment, toast]);

  // 取消批量选择
  const handleCancelBatch = useCallback(() => {
    setSelectedRowKeys([]);
  }, []);

  // 批量导出
  const handleExport = useCallback(() => {
    if (selectedRowKeys.length === 0) return;
    const selectedData = paginatedData.filter(d => selectedRowKeys.includes(d.id));
    const exportData = selectedData.map(d => ({
      单号: d.code,
      标题: d.title,
      申请人: d.applicantName,
      部门: d.applicantDepartment,
      申请时间: d.applyDate,
      状态: d.status
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `人事审批_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedRowKeys, paginatedData]);

  // 全选/取消全选
  const handleSelectAll = useCallback((selectAll: boolean) => {
    if (selectAll) {
      const pendingIds = paginatedData
        .filter(d => d.status === ApprovalStatus.PENDING)
        .map(d => d.id);
      setSelectedRowKeys(pendingIds);
    } else {
      setSelectedRowKeys([]);
    }
  }, [paginatedData]);

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
      filters: HR_TABS.flatMap(t => t.types.map(tp => ({ text: getApprovalTypeName(tp), value: tp }))),
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewDetail(record)}
            title="查看"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {record.status === ApprovalStatus.PENDING && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleApprove(record)}
                title="通过"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleReject(record)}
                title="拒绝"
              >
                <XCircle className="w-4 h-4" />
              </Button>
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
            <Label className="text-gray-500">申请单号</Label>
            <p className="font-medium">{currentRecord.code}</p>
          </div>
          <div>
            <Label className="text-gray-500">类型</Label>
            <p className="font-medium">{currentRecord.typeName}</p>
          </div>
          <div>
            <Label className="text-gray-500">申请人</Label>
            <p className="font-medium">{currentRecord.applicantName}</p>
          </div>
          <div>
            <Label className="text-gray-500">部门</Label>
            <p className="font-medium">{currentRecord.applicantDepartment}</p>
          </div>
          <div>
            <Label className="text-gray-500">申请时间</Label>
            <p className="font-medium">{currentRecord.applyDate} {currentRecord.applyTime}</p>
          </div>
          <div>
            <Label className="text-gray-500">状态</Label>
            <p className="font-medium"><StatusBadge status={currentRecord.status} /></p>
          </div>
        </div>
        {currentRecord.title && (
          <div>
            <Label className="text-gray-500">标题</Label>
            <p className="font-medium">{currentRecord.title}</p>
          </div>
        )}
        {currentRecord.description && (
          <div>
            <Label className="text-gray-500">描述</Label>
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
                  <Label className="text-gray-500">请假类型</Label>
                  <p className="font-medium">{bl.leaveType}</p>
                </div>
                {bl.startDate && (
                  <div>
                    <Label className="text-gray-500">开始日期</Label>
                    <p className="font-medium">{bl.startDate}</p>
                  </div>
                )}
                {bl.endDate && (
                  <div>
                    <Label className="text-gray-500">结束日期</Label>
                    <p className="font-medium">{bl.endDate}</p>
                  </div>
                )}
                {bl.totalDays && (
                  <div>
                    <Label className="text-gray-500">天数</Label>
                    <p className="font-medium">{bl.totalDays}天</p>
                  </div>
                )}
              </div>
            )}
            {bl.overtimeType && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">加班类型</Label>
                  <p className="font-medium">{bl.overtimeType}</p>
                </div>
                {bl.date && (
                  <div>
                    <Label className="text-gray-500">加班日期</Label>
                    <p className="font-medium">{bl.date}</p>
                  </div>
                )}
                {bl.startTime && (
                  <div>
                    <Label className="text-gray-500">开始时间</Label>
                    <p className="font-medium">{bl.startTime}</p>
                  </div>
                )}
                {bl.endTime && (
                  <div>
                    <Label className="text-gray-500">结束时间</Label>
                    <p className="font-medium">{bl.endTime}</p>
                  </div>
                )}
                {bl.totalHours && (
                  <div>
                    <Label className="text-gray-500">总时长</Label>
                    <p className="font-medium">{bl.totalHours}小时</p>
                  </div>
                )}
              </div>
            )}
            {bl.reason && (
              <div className="mt-3">
                <Label className="text-gray-500">原因</Label>
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
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/settings/personnel" className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
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
      </div>

      {/* 统计卡片 */}
      <KpiCardGrid columns={4} compact>
        <KpiCard
          icon={<Clock className="w-4 h-4 text-white" />}
          label="待审批"
          value={stats.pending}
          colorScheme="amber"
          compact
        />
        <KpiCard
          icon={<CheckCircle className="w-4 h-4 text-white" />}
          label="已通过"
          value={stats.approved}
          colorScheme="emerald"
          compact
        />
        <KpiCard
          icon={<XCircle className="w-4 h-4 text-white" />}
          label="已拒绝"
          value={stats.rejected}
          colorScheme="red"
          compact
        />
        <KpiCard
          icon={<Users className="w-4 h-4 text-white" />}
          label="总记录"
          value={stats.total}
          colorScheme="blue"
          compact
        />
      </KpiCardGrid>

      {/* Tab 切换（2026-10-10：5 组业务家族——请假/加班/人员异动/合同/薪酬，对齐库存审批页模式） */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm flex-wrap">
        {HR_TABS.map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); setSelectedRowKeys([]); }}
            className="flex items-center gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 关键词搜索 */}
          <div className="flex-1 min-w-[180px]">
            <Label className="text-gray-700">关键词搜索</Label>
            <Input
              placeholder="搜索申请人、申请单号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          {/* 状态筛选 */}
          <div className="min-w-[150px]">
            <Label className="text-gray-700">审批状态</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                {APPROVAL_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 开始日期 */}
          <div className="min-w-[150px]">
            <Label className="text-gray-700">开始日期</Label>
            <DatePicker
              selected={startDate ? new Date(startDate) : undefined}
              // 2026-10-10 审计修复：toISOString 是 UTC——东八区选 10-10 会存成 10-09（项目 UTC 铁律）
              onChange={(date) => setStartDate(todayLocal(date))}
            />
          </div>
          {/* 结束日期 */}
          <div className="min-w-[150px]">
            <Label className="text-gray-700">结束日期</Label>
            <DatePicker
              selected={endDate ? new Date(endDate) : undefined}
              onChange={(date) => setEndDate(todayLocal(date))}
            />
          </div>
          {/* 搜索按钮 */}
          <Button size="sm" onClick={() => {}}><Search className="w-4 h-4" />搜索</Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 表格标题栏 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">人事审批</h3>
          {/* 批量操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBatchApprove}
              disabled={selectedRowKeys.length === 0}
              className={`
                ${selectedRowKeys.length === 0
                  ? 'bg-emerald-500 text-white cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm'
                }
                transition-all duration-200 font-medium h-8 px-3 text-xs
              `}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              批量通过
            </Button>
            <Button
              onClick={handleBatchReject}
              disabled={selectedRowKeys.length === 0}
              className={`
                ${selectedRowKeys.length === 0
                  ? 'bg-red-500 text-white cursor-not-allowed opacity-60'
                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm'
                }
                transition-all duration-200 font-medium h-8 px-3 text-xs
              `}
            >
              <XCircle className="w-3 h-3 mr-1" />
              批量拒绝
            </Button>
            <Button
              onClick={handleExport}
              disabled={selectedRowKeys.length === 0}
              className={`
                ${selectedRowKeys.length === 0
                  ? 'bg-blue-500 text-white cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm'
                }
                transition-all duration-200 font-medium h-8 px-3 text-xs
              `}
            >
              <Download className="w-3 h-3 mr-1" />
              批量导出
            </Button>
          </div>
        </div>
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
          headerClassName="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
        />
        {/* 分页 */}
        {totalCount > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              showPageSize={true}
            />
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
          <Label className="text-gray-700">审批意见（可选）</Label>
          <TextArea
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            placeholder="请输入审批意见..."
            minRows={3}
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
        <div className="mt-4">
          <Label className="text-gray-700">
            驳回原因 <span className="text-red-500">*</span>
          </Label>
          <TextArea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="请输入驳回原因..."
            minRows={3}
          />
        </div>
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
          <Label className="text-gray-700">审批意见（可选）</Label>
          <TextArea
            value={batchApproveComment}
            onChange={(e) => setBatchApproveComment(e.target.value)}
            placeholder="请输入审批意见..."
            minRows={3}
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
        <div className="mt-4">
          <Label className="text-gray-700">
            驳回原因 <span className="text-red-500">*</span>
          </Label>
          <TextArea
            value={batchRejectComment}
            onChange={(e) => setBatchRejectComment(e.target.value)}
            placeholder="请输入驳回原因..."
            minRows={3}
          />
        </div>
      </ProModal>
    </div>
  );
}
