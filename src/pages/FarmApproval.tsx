// ============================================================
// 农事审批页面
// 文件路径：src/pages/FarmApproval.tsx
// 功能：任务派发、任务变更、巡查问题、问题整改审批
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle, CheckSquare, CheckSquare as CheckSquareIcon, ChevronLeft, Clock, Download, Eye, FileText, Search, Sprout, Square, XCircle } from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import { useApprovalStore } from '../stores/useApprovalStore';
import useApprovalBusinessDetail from '../hooks/useApprovalBusinessDetail';
import { ApprovalStatus, ApprovalType, Approval } from '../types/approval';
import { ApprovalDetail } from '../components/approval/ApprovalDetail';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Pagination, TextArea, Label } from '../components/ui';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { showConfirm, showAlert } from '@/lib/dialogService';
import { KpiCard, KpiCardGrid } from '@/components/summary';
// 2026-10-10：批量/导出体验对齐生产审批——store 批量 action、CSV/Excel 两段式导出、本地日期
import { exportCsv, exportXlsx } from '@/services/exporters';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { todayLocal } from '@/lib/dateUtils';

export default function FarmApproval() {
  // 2026-10-10：批量操作改走 store 批量 action（与生产审批一致：Promise.all + 单次重拉 + 失败透出）
  const { approvals, approve, reject, batchApprove, batchReject, refreshApprovals } = useApproval();

  // 2026-10-10 修复：页面从不主动拉取审批数据（无任何挂载加载）——先访问其它审批页时能看到数据，
  // 直接进入本页则列表恒为"暂无数据"。补挂载拉取（失败由 store error 承载）
  useEffect(() => {
    refreshApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<
    'task_dispatch' | 'task_change' | 'inspection' | 'resolve'
  >('task_dispatch');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  // 2026-10-10 修复：原为 const pageSize = 10（常量）+ 未定义的 setPageSize → 每页条数切换抛 ReferenceError
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailApproval, setDetailApproval] = useState<Approval | null>(null);
  // 2026-10-10：批量进行中标记（防重复点击 + 处理中反馈）
  const [batchProcessing, setBatchProcessing] = useState(false);
  // 2026-10-10：导出两段式勾选模式（与生产审批/作物库存一致：先勾选再导出，绝不默认全量）
  const [exportMode, setExportMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'word'>('excel');
  // 2026-10-10：单条通过/拒绝确认弹窗（原直接提交：无确认、无意见输入、失败静默）
  const [approvalModal, setApprovalModal] = useState<{ show: boolean; approval: Approval | null; action: 'approve' | 'reject' | null }>({ show: false, approval: null, action: null });
  const [approvalComment, setApprovalComment] = useState('');
  const [confirming, setConfirming] = useState(false);
  // 加载审批关联的业务数据
  const { data: businessData, isLoading: businessLoading } = useApprovalBusinessDetail(detailApproval);

  // 2026-10-10：任务派发已退出审批（改为直接派发）；DISPATCH_READY 现用于区分"历史记录"说明与"未接入"提示
  const DISPATCH_READY = 'task_dispatch';
  const tabs = [
    { key: 'task_dispatch', label: '任务派发', icon: FileText, path: '/farm-hub', types: [ApprovalType.TASK_DISPATCH] },
    { key: 'task_change', label: '任务变更', icon: AlertTriangle, path: '/farm-hub', types: [ApprovalType.TASK_CHANGE] },
    { key: 'inspection', label: '巡查问题', icon: CheckSquare, path: '/farm-hub', types: [ApprovalType.INSPECTION_ISSUE] },
    { key: 'resolve', label: '问题整改', icon: CheckCircle, path: '/farm-hub', types: [ApprovalType.ISSUE_RESOLVE] },
  ] as const;

  const getCurrentData = useMemo(() => {
    const currentTab = tabs.find(t => t.key === activeTab);
    if (!currentTab) return [];
    return approvals.filter(a => currentTab.types.includes(a.type));
  }, [approvals, activeTab, tabs]);

  const filteredData = useMemo(() => {
    return getCurrentData.filter(item => {
      const matchSearch =
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.applicantName?.includes(searchTerm) ||
        item.code?.includes(searchTerm);
      const matchStatus =
        statusFilter === '全部' ||
        (statusFilter === '待审批' && item.status === ApprovalStatus.PENDING) ||
        (statusFilter === '已通过' && item.status === ApprovalStatus.APPROVED) ||
        (statusFilter === '已拒绝' && item.status === ApprovalStatus.REJECTED);
      return matchSearch && matchStatus;
    });
  }, [getCurrentData, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: getCurrentData.length,
    pending: getCurrentData.filter(d => d.status === ApprovalStatus.PENDING).length,
    approved: getCurrentData.filter(d => d.status === ApprovalStatus.APPROVED).length,
    rejected: getCurrentData.filter(d => d.status === ApprovalStatus.REJECTED).length,
  }), [getCurrentData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">已通过</span>;
      case ApprovalStatus.REJECTED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">已拒绝</span>;
      case ApprovalStatus.PENDING:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">待审批</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  // 批量操作处理（2026-10-10：审批模式仅待审批行可选；导出模式当前页全部行可选）
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      const ids = (exportMode ? paginatedData : paginatedData.filter(d => d.status === ApprovalStatus.PENDING))
        .map(d => d.id);
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // ===== 单条审批（2026-10-10：加确认弹窗 + 意见输入 + 失败提示）=====
  const handleOpenApproval = (approval: Approval, action: 'approve' | 'reject') => {
    setApprovalModal({ show: true, approval, action });
    setApprovalComment('');
  };

  const confirmSingleApproval = async () => {
    const { approval, action } = approvalModal;
    if (!approval || !action || confirming) return;
    setConfirming(true);
    try {
      const ok = action === 'approve'
        ? await approve(approval.id, approvalComment || undefined)
        : await reject(approval.id, approvalComment || '审批拒绝');
      if (ok) {
        setApprovalModal({ show: false, approval: null, action: null });
        setApprovalComment('');
        // 2026-10-10：多级审批单（total_steps>1）单次「通过」只推进等级、状态仍为待审批，
        // 此时直接提示"已通过该审批"会误导（用户实测：以为没生效、再点一次才变已通过）。
        // 按 store 中最新的审批状态区分提示文案（store 在 approve 成功后已重拉数据）。
        const fresh = useApprovalStore.getState().approvals.find(a => a.id === approval.id);
        const advancedButPending = action === 'approve' && fresh
          && fresh.status === ApprovalStatus.PENDING && (fresh.totalSteps || 1) > 1;
        showAlert(advancedButPending
          ? `已通过第 ${(fresh.currentStep || 2) - 1} 级审批（共 ${fresh.totalSteps} 级），待后续审批人继续处理`
          : (action === 'approve' ? '已通过该审批' : '已拒绝该审批'));
      } else {
        // 2026-09-28 fail-loud 契约：store 返回 false 时给出提示（原实现完全静默）
        showAlert(action === 'approve' ? '审批通过失败，请刷新后重试' : '审批拒绝失败，请刷新后重试');
      }
    } catch (e) {
      showAlert(`操作失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setConfirming(false);
    }
  };

  const cancelSingleApproval = () => {
    setApprovalModal({ show: false, approval: null, action: null });
    setApprovalComment('');
  };

  // ===== 批量审批（改走 store 批量 action：Promise.all + 单次重拉 + 成功/失败提示）=====
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0 || batchProcessing) return;
    const ids = [...selectedIds];
    if (!(await showConfirm(`确定要批量通过 ${ids.length} 项审批吗？`))) return;
    setBatchProcessing(true);
    try {
      await batchApprove(ids);
      setSelectedIds(new Set());
      showAlert(`已批量通过 ${ids.length} 项审批`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showAlert(`批量通过失败：${msg}\n\n（可能部分已成功，请刷新核对后重试未成功的项）`);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0 || batchProcessing) return;
    const ids = [...selectedIds];
    if (!(await showConfirm(`确定要批量拒绝 ${ids.length} 项审批吗？`))) return;
    setBatchProcessing(true);
    try {
      await batchReject(ids, '批量拒绝');
      setSelectedIds(new Set());
      showAlert(`已批量拒绝 ${ids.length} 项审批`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showAlert(`批量拒绝失败：${msg}\n\n（可能部分已成功，请刷新核对后重试未成功的项）`);
    } finally {
      setBatchProcessing(false);
    }
  };

  // ===== 导出（2026-10-10：两段式勾选模式 + CSV/Excel 格式弹窗；只导出勾选行，绝不默认全量）=====
  const exitExportMode = () => {
    setExportMode(false);
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    if (selectedIds.size === 0) return; // 兜底：必须已勾选
    setShowExportModal(true);
  };

  const handleExportFormatConfirm = async () => {
    const rowsToExport = filteredData.filter(d => selectedIds.has(d.id));
    const STATUS_TEXT: Record<string, string> = {
      pending: '待审批', approved: '已通过', rejected: '已拒绝',
      cancelled: '已取消', partially_approved: '部分通过', draft: '草稿',
    };
    const headers = ['单号', '标题', '申请人', '部门', '申请时间', '状态'];
    const exportData = rowsToExport.map(d => ({
      单号: d.code,
      标题: d.title,
      申请人: d.applicantName,
      部门: d.applicantDepartment,
      申请时间: d.applyDate,
      状态: STATUS_TEXT[d.status] || d.status,
    }));
    const filename = `农事审批_${todayLocal()}`;
    try {
      if (exportFormat === 'csv') {
        await exportCsv({ filename: `${filename}.csv`, headers, rows: exportData });
        showAlert(`CSV 导出完成（共 ${rowsToExport.length} 条）`);
        setShowExportModal(false);
        exitExportMode();
      } else if (exportFormat === 'excel') {
        await exportXlsx({ filename: `${filename}.xlsx`, headers, rows: exportData });
        showAlert(`Excel 导出完成（共 ${rowsToExport.length} 条）`);
        setShowExportModal(false);
        exitExportMode();
      } else {
        showAlert('Word 格式暂不支持，请选择 Excel 或 CSV');
      }
    } catch (e) {
      showAlert(`导出失败：${e instanceof Error ? e.message : '未知错误'}`);
      setShowExportModal(false);
      exitExportMode(); // 失败也退出勾选模式（避免卡在模式内）；如需重试可重新勾选
    }
  };

  // 2026-10-10：表头全选按"当前页可选行"口径（审批模式=待审批行；导出模式=全部行）
  const pageSelectableIds = (exportMode
    ? paginatedData
    : paginatedData.filter(d => d.status === ApprovalStatus.PENDING)
  ).map(d => d.id);
  const allPageSelectableSelected = pageSelectableIds.length > 0 && pageSelectableIds.every(id => selectedIds.has(id));

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">农事审批</h1>
              <p className="text-gray-500">任务派发、任务变更、巡查问题、问题整改审批</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <KpiCardGrid columns={4} compact>
        <KpiCard
          icon={<FileText className="w-4 h-4 text-white" />}
          label="全部"
          value={stats.total}
          colorScheme="slate"
          compact
        />
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
      </KpiCardGrid>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setCurrentPage(1);
              // 2026-10-10：切 tab 清空选中并退出导出勾选模式（避免跨 tab 残留选择）
              setSelectedIds(new Set());
              setExportMode(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 搜索筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索审批单号、标题、申请人..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部状态</SelectItem>
              <SelectItem value="待审批">待审批</SelectItem>
              <SelectItem value="已通过">已通过</SelectItem>
              <SelectItem value="已拒绝">已拒绝</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 数据列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 表格标题栏 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
          {/* 批量操作按钮（2026-10-10：两态——审批态 / 导出勾选态） */}
          <div className="flex items-center gap-2">
            {!exportMode ? (
              <>
                <Button
                  onClick={handleBatchApprove}
                  disabled={selectedIds.size === 0 || batchProcessing}
                  className={`
                    ${selectedIds.size === 0 || batchProcessing
                      ? 'bg-emerald-500 text-white cursor-not-allowed opacity-60'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm'
                    }
                    transition-all duration-200 font-medium h-8 px-3 text-xs
                  `}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {batchProcessing ? '处理中...' : '批量通过'}
                </Button>
                <Button
                  onClick={handleBatchReject}
                  disabled={selectedIds.size === 0 || batchProcessing}
                  className={`
                    ${selectedIds.size === 0 || batchProcessing
                      ? 'bg-red-500 text-white cursor-not-allowed opacity-60'
                      : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm'
                    }
                    transition-all duration-200 font-medium h-8 px-3 text-xs
                  `}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  {batchProcessing ? '处理中...' : '批量拒绝'}
                </Button>
                <Button
                  // 2026-10-10：批量导出进入勾选模式——先勾选要导出的行，再确认导出（不默认全量）
                  onClick={() => { setExportMode(true); setSelectedIds(new Set()); }}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all duration-200 font-medium h-8 px-3 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  批量导出
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleExport}
                  disabled={selectedIds.size === 0}
                  className={`
                    ${selectedIds.size === 0
                      ? 'bg-blue-500 text-white cursor-not-allowed opacity-60'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm'
                    }
                    transition-all duration-200 font-medium h-8 px-3 text-xs
                  `}
                >
                  <Download className="w-3 h-3 mr-1" />
                  {selectedIds.size > 0 ? `确认导出（${selectedIds.size}）` : '确认导出'}
                </Button>
                <Button variant="outline" onClick={exitExportMode} className="h-8 px-3 text-xs">
                  取消
                </Button>
              </>
            )}
            <Link
              to={tabs.find(t => t.key === activeTab)?.path || '/'}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium ml-2"
            >
              查看全部 →
            </Link>
          </div>
        </div>
        {/* 2026-10-10：未接入提示——除"任务派发"外的 3 个 tab 尚未接入业务提交入口（无数据属正常） */}
        {activeTab !== DISPATCH_READY && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              该审批流程尚未接入业务提交入口（对应业务动作中暂无"提交审批"），列表为空属正常。
            </span>
          </div>
        )}
        {/* 2026-10-10：任务派发已改为「直接派发」（用户决策）——不再从派发入口生成审批单，本 tab 仅保留历史记录 */}
        {activeTab === DISPATCH_READY && (
          <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              任务派发现已改为「直接派发」：在农事任务中心选择执行人并确认后立即生效（待接受），不再生成审批单。本页仅保留历史审批记录。
            </span>
          </div>
        )}
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap w-12">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSelectAll(!allPageSelectableSelected)}
                  className="text-white hover:bg-blue-400"
                  title={exportMode ? '全选本页（导出模式）' : '全选本页待审批'}
                >
                  {allPageSelectableSelected ? (
                    <CheckSquareIcon className="w-4 h-4 text-white" />
                  ) : (
                    <Square className="w-4 h-4 text-white" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">审批单号</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">标题</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请人</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">部门</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请时间</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : paginatedData.map(approval => (
              <TableRow key={approval.id} className={selectedIds.has(approval.id) ? 'bg-emerald-50' : ''}>
                <TableCell>
                  {/* 2026-10-10：审批模式仅待审批行可勾选；导出模式全部行可勾选 */}
                  {approval.status === ApprovalStatus.PENDING || exportMode ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleSelect(approval.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {selectedIds.has(approval.id) ? (
                        <CheckSquareIcon className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  ) : (
                    <span className="w-4 h-4 block" />
                  )}
                </TableCell>
                <TableCell className="text-gray-900">{approval.code}</TableCell>
                <TableCell className="text-gray-900">{approval.title}</TableCell>
                <TableCell className="text-gray-500">{approval.applicantName}</TableCell>
                <TableCell className="text-gray-500">{approval.applicantDepartment}</TableCell>
                <TableCell className="text-gray-500">{approval.applyDate}</TableCell>
                <TableCell>{getStatusBadge(approval.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setDetailApproval(approval)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {approval.status === ApprovalStatus.PENDING && !exportMode && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenApproval(approval, 'approve')}
                        >
                          <Check className="w-4 h-4" /> 通过
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenApproval(approval, 'reject')}
                        >
                          <XCircle className="w-4 h-4" /> 拒绝
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 分页 */}
        {totalPages > 1 && (
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

        {/* 审批详情弹窗 */}
        <Dialog open={!!detailApproval} onOpenChange={(open) => { if (!open) setDetailApproval(null); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>审批详情</DialogTitle>
            </DialogHeader>
            {detailApproval && (
            <div className="space-y-4">
              <ApprovalDetail approval={detailApproval} />
              {businessLoading && <div className="text-sm text-gray-500">加载业务数据中...</div>}
              {businessData && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">关联业务数据</h4>
                  <pre className="text-xs text-gray-600 bg-gray-50 rounded p-3 overflow-auto max-h-48">{JSON.stringify(businessData, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
          </DialogContent>
        </Dialog>
      </div>

      {/* 单条审批确认弹窗（2026-10-10：原直接提交——无确认、无意见输入、失败静默，现补齐） */}
      <Dialog open={approvalModal.show && !!approvalModal.approval} onOpenChange={(open) => { if (!open) cancelSingleApproval(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{approvalModal.action === 'approve' ? '确认通过' : '确认拒绝'}</DialogTitle>
          </DialogHeader>
          {approvalModal.approval && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600"><span className="font-medium">申请标题：</span>{approvalModal.approval.title}</p>
                <p className="text-sm text-gray-600 mt-1"><span className="font-medium">申请人：</span>{approvalModal.approval.applicantName}</p>
              </div>
              <div>
                <Label className="text-gray-700">{approvalModal.action === 'approve' ? '通过意见（可选）' : '拒绝原因（可选）'}</Label>
                <TextArea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder={approvalModal.action === 'approve' ? '请输入通过意见...' : '请输入拒绝原因...'}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={cancelSingleApproval} disabled={confirming}>取消</Button>
                <Button
                  variant={approvalModal.action === 'approve' ? 'default' : 'destructive'}
                  onClick={confirmSingleApproval}
                  disabled={confirming}
                >
                  {confirming ? '处理中...' : (approvalModal.action === 'approve' ? '确认通过' : '确认拒绝')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 导出格式弹窗（2026-10-10：两段式导出的第二步） */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportFormatConfirm}
        selectedCount={selectedIds.size}
      />
    </div>
  );
}
