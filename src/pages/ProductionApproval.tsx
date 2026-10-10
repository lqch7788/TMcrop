// ============================================================
// 生产审批页面
// 文件路径：src/pages/ProductionApproval.tsx
// 功能：技术方案审批、生产计划审批、采收申请审批的统一管理
// 使用真实数据：从ApprovalContext获取
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, CheckSquare as CheckSquareIcon, ChevronLeft, ChevronRight, Clock, Download, Eye, FileText, Package, RefreshCw, Search, ShoppingCart, Sprout, Square, X, XCircle } from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import { ApprovalStatus, ApprovalType, Approval } from '../types/approval';
import { usePurchasePlanStore } from '../stores/usePurchasePlanStore';
import { showConfirm, showAlert } from '@/lib/dialogService';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { KpiCard, KpiCardGrid } from '@/components/summary';
import { BatchDetailModal } from '@/components/production/modals';
import { CropBatch } from '@/types';
import { getProductionPlanById } from '@/services/apiProductionPlanService';
import { PURCHASE_TYPE_TEXT, PurchaseType } from '@/types/purchase';
// 2026-10-10：批量导出改 CSV/Excel（与全站一致）+ 本地日期文件名
import { exportCsv, exportXlsx } from '@/services/exporters';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { todayLocal } from '@/lib/dateUtils';

// 2026-10-09：审批列表标题兜底翻译
// 历史 bug：采购计划审批 title 拼接时未翻译 purchaseType（production/urgent/...），导致列表里显示英文
// 这里把"采购申请: <英文> - 单号"统一替换为"采购申请: <中文> - 单号"
const PURCHASE_TYPE_KEYS = Object.keys(PURCHASE_TYPE_TEXT) as PurchaseType[];
const translateApprovalTitle = (title: string, approvalType: string): string => {
  if (!title) return title;
  if (approvalType !== ApprovalType.PURCHASE_REQUEST) return title;
  // 仅处理"采购申请:"前缀的历史脏数据，避免误改其它业务的 title
  if (!title.startsWith('采购申请:')) return title;
  let translated = title;
  for (const key of PURCHASE_TYPE_KEYS) {
    const cn = PURCHASE_TYPE_TEXT[key];
    // 整词匹配，避免把"production_xxx"误改；用空格/连字符/冒号/结尾作为边界
    const re = new RegExp(`(^|[\\s\\-:])(${key})(?=$|[\\s\\-:])`, 'g');
    translated = translated.replace(re, (_m, prefix: string) => `${prefix}${cn}`);
  }
  return translated;
};

export default function ProductionApproval() {
  // 2026-10-10：批量操作改走 store 的 batchApprove/batchReject（Promise.all + 单次重拉），替代原逐条 fire-and-forget
  const { approvals, approve, reject, batchApprove, batchReject, refreshApprovals } = useApproval();

  // 页面加载时获取审批数据
  useEffect(() => {
    refreshApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在挂载时加载一次

  const [activeTab, setActiveTab] = useState<
    'tech' | 'plan' | 'purchase'
  >('plan');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  // 2026-10-10 修复：原为 const pageSize = 10（常量），而分页组件回调调 setPageSize(size)——
  // 未定义标识符，点击"每页条数"直接抛 Uncaught ReferenceError、永远改不了（已实测捕获）
  const [pageSize, setPageSize] = useState(10);
  // 批量操作进行中标记（防止重复点击 / 提供"处理中"反馈）
  const [batchProcessing, setBatchProcessing] = useState(false);
  // 2026-10-10：批量导出改为"两段式勾选模式"（与作物库存等页面一致）——
  // 点击"批量导出"进入勾选模式（全部行出现复选框），用户勾选所需数据后确认导出；
  // 绝不默认导出全量（用户明确要求：勾选什么导出什么）
  const [exportMode, setExportMode] = useState(false);
  // 导出弹窗状态（2026-10-10：JSON 直下 → ExportFormatModal 两步流程，与全站一致）
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'word'>('excel');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailModal, setDetailModal] = useState<{
    show: boolean;
    approval: Approval | null;
    purchasePlanDetail?: any;
    productionPlanDetail?: CropBatch | null;
  }>({ show: false, approval: null, purchasePlanDetail: null, productionPlanDetail: null });
  const [approvalModal, setApprovalModal] = useState<{ show: boolean; approval: Approval | null; action: 'approve' | 'reject' | null }>({ show: false, approval: null, action: null });
  const [approvalComment, setApprovalComment] = useState('');

  // 查看详情处理
  const handleViewDetail = async (approval: Approval) => {
    // 如果是采购申请，从Store获取采购计划详情
    if (approval.businessLink?.type === 'purchase') {
      try {
        // 确保Store已加载数据
        const store = usePurchasePlanStore.getState();
        if (store.plans.length === 0) {
          await store.fetchPlans();
        }
        const planDetail = store.plans.find(p => p.id === approval.businessLink?.requestId);
        if (planDetail) {
          setDetailModal({ show: true, approval, purchasePlanDetail: planDetail, productionPlanDetail: null });
          return;
        }
      } catch {
        // 忽略错误，继续执行
      }
    }

    // 如果是生产计划相关，从API获取完整详情
    if (approval.businessLink?.type === 'production' || approval.businessLink?.type === 'production_batch') {
      try {
        const requestId = approval.businessLink.requestId;
        if (requestId) {
          const planDetail = await getProductionPlanById(requestId);
          setDetailModal({ show: true, approval, purchasePlanDetail: null, productionPlanDetail: planDetail || null });
          return;
        }
      } catch {
        // 忽略错误，继续执行
      }
    }

    setDetailModal({ show: true, approval, purchasePlanDetail: null, productionPlanDetail: null });
  };

  // 审批操作处理
  const handleApprove = (approval: Approval) => {
    setApprovalModal({ show: true, approval, action: 'approve' });
    setApprovalComment('');
  };

  const handleReject = (approval: Approval) => {
    setApprovalModal({ show: true, approval, action: 'reject' });
    setApprovalComment('');
  };

  // 确认审批操作（await 等响应后关闭弹窗，避免 UI 短暂显示旧状态）
  const [confirming, setConfirming] = useState(false);
  const confirmApproval = async () => {
    if (!approvalModal.approval || !approvalModal.action || confirming) return;
    setConfirming(true);
    try {
      if (approvalModal.action === 'approve') {
        await approve(approvalModal.approval.id, approvalComment);
      } else {
        await reject(approvalModal.approval.id, approvalComment || '审批拒绝');
      }
      // 成功后关闭弹窗
      setApprovalModal({ show: false, approval: null, action: null });
      setApprovalComment('');
      // 重拉列表，确保 UI 状态与服务端一致
      await refreshApprovals();
    } catch (error) {
      logger.error('[ProductionApproval] 审批操作失败', error);
    } finally {
      setConfirming(false);
    }
  };

  // 取消审批
  const cancelApproval = () => {
    setApprovalModal({ show: false, approval: null, action: null });
    setApprovalComment('');
  };

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setDetailModal({ show: false, approval: null, purchasePlanDetail: null, productionPlanDetail: null });
  };

  // Tab配置 - 生产类审批（2026-07-14：移除"采收申请审批"tab — 功能暂时不用）
  const tabs = [
    { key: 'plan', label: '生产计划审批', icon: Calendar, path: '/production', types: [ApprovalType.PRODUCTION_PLAN] },
    { key: 'tech', label: '技术方案审批', icon: FileText, path: '/tech-solution', types: [ApprovalType.TECH_SOLUTION] },
    { key: 'purchase', label: '采购计划审批', icon: ShoppingCart, path: '/purchase-plan', types: [ApprovalType.PURCHASE_REQUEST] },
  ] as const;

  // 根据Tab类型筛选数据
  const getCurrentData = useMemo(() => {
    const currentTab = tabs.find(t => t.key === activeTab);
    if (!currentTab) return [];
    return approvals.filter(a => currentTab.types.includes(a.type));
  }, [approvals, activeTab, tabs]);

  // 筛选数据
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

  // 统计
  const stats = useMemo(() => ({
    total: getCurrentData.length,
    pending: getCurrentData.filter(d => d.status === ApprovalStatus.PENDING).length,
    approved: getCurrentData.filter(d => d.status === ApprovalStatus.APPROVED).length,
    rejected: getCurrentData.filter(d => d.status === ApprovalStatus.REJECTED).length,
  }), [getCurrentData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 状态显示
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

  // 批量操作处理
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      // 审批模式：仅待审批行可选；导出模式：当前页全部行可选
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

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0 || batchProcessing) return;
    const ids = [...selectedIds];
    if (!(await showConfirm(`确定要批量通过 ${ids.length} 项审批吗？`))) return;
    setBatchProcessing(true);
    try {
      // 2026-10-10 修复：原为逐条 fire-and-forget（不 await、失败静默、N 次全量重拉）——
      // 改走 store.batchApprove（Promise.all 并发 + 完成后单次重拉）+ 明确的成功/失败提示
      await batchApprove(ids);
      setSelectedIds(new Set());
      showAlert(`已批量通过 ${ids.length} 项审批`);
    } catch (e) {
      // fail loud：原实现批量失败用户零感知
      const msg = e instanceof Error ? e.message : String(e);
      showAlert(`批量通过失败：${msg}\n\n（可能部分已成功，请刷新核对后重试未成功的项）`);
      await refreshApprovals();
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
      await refreshApprovals();
    } finally {
      setBatchProcessing(false);
    }
  };

  // 2026-10-10 重构：批量导出——两段式勾选模式 + CSV/Excel 格式弹窗（与全站一致）
  // 用户在勾选模式中选中哪些行就导出哪些行（绝不默认全量导出）
  const handleExport = () => {
    if (selectedIds.size === 0) return; // 兜底：必须已勾选
    setShowExportModal(true);
  };

  /** 退出导出勾选模式并清空选中 */
  const exitExportMode = () => {
    setExportMode(false);
    setSelectedIds(new Set());
  };

  const handleExportFormatConfirm = async () => {
    // 只导出勾选行（两段式模式保证进入导出时必有勾选）
    const rowsToExport = filteredData.filter(d => selectedIds.has(d.id));
    // 状态枚举 → 中文（导出文件里不出现英文枚举）
    const STATUS_TEXT: Record<string, string> = {
      pending: '待审批', approved: '已通过', rejected: '已拒绝',
      cancelled: '已取消', partially_approved: '部分通过', draft: '草稿',
    };
    const headers = ['单号', '标题', '申请人', '部门', '申请时间', '状态'];
    const exportData = rowsToExport.map(d => ({
      单号: d.code,
      标题: translateApprovalTitle(d.title, d.type),
      申请人: d.applicantName,
      部门: d.applicantDepartment,
      申请时间: d.applyDate,
      状态: STATUS_TEXT[d.status] || d.status,
    }));
    const filename = `生产审批_${todayLocal()}`;
    try {
      if (exportFormat === 'csv') {
        await exportCsv({ filename: `${filename}.csv`, headers, rows: exportData });
        showAlert(`CSV 导出完成（共 ${rowsToExport.length} 条）`);
        setShowExportModal(false);
        exitExportMode(); // 导出成功后退出勾选模式
      } else if (exportFormat === 'excel') {
        await exportXlsx({ filename: `${filename}.xlsx`, headers, rows: exportData });
        showAlert(`Excel 导出完成（共 ${rowsToExport.length} 条）`);
        setShowExportModal(false);
        exitExportMode(); // 导出成功后退出勾选模式
      } else {
        // Word 选择时仅提示，弹窗保留让用户改选其他格式（保持在勾选模式）
        showAlert('Word 格式暂不支持，请选择 Excel 或 CSV');
      }
    } catch (e) {
      showAlert(`导出失败：${e instanceof Error ? e.message : '未知错误'}`);
      setShowExportModal(false);
      // 失败时保留勾选，便于重试
    }
  };

  // 2026-10-10：表头全选按"当前页可选行"口径（原实现按页选、图标却与全表待审计数比较，状态不一致）；
  // 审批模式可选=待审批行，导出模式可选=当前页全部行
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
              <h1 className="text-2xl font-bold text-gray-900">生产审批</h1>
              <p className="text-gray-500">技术方案、生产计划审批管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <KpiCardGrid columns={4} compact>
        <KpiCard
          icon={<FileText className="w-4 h-4 text-white" />}
          label="总申请数"
          value={stats.total}
          colorScheme="emerald"
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
              // 2026-10-10：切 tab 时清空选中并退出导出勾选模式（避免跨 tab 残留选择被误操作）
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

      {/* 筛选区域 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-gray-700">搜索</Label>
            <Input
              placeholder="搜索申请人、申请单号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="min-w-[150px]">
            <Label className="text-gray-700">状态</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                <SelectItem value="待审批">待审批</SelectItem>
                <SelectItem value="已通过">已通过</SelectItem>
                <SelectItem value="已拒绝">已拒绝</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => {}}><Search className="w-4 h-4" />搜索</Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
          {/* 批量操作按钮 */}
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
                  // 2026-10-10：批量导出进入"勾选模式"——先勾选要导出的行，再确认导出（不默认全量）
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
                <Button
                  variant="outline"
                  onClick={exitExportMode}
                  className="h-8 px-3 text-xs"
                >
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
        <div className="overflow-x-auto">
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
                <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请单号</TableHead>
                <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请人</TableHead>
                <TableHead className="text-white text-sm font-semibold whitespace-nowrap">部门</TableHead>
                <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请标题</TableHead>
                <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请时间</TableHead>
                <TableHead className="text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
                <TableHead className="text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={item.id} className={selectedIds.has(item.id) ? 'bg-emerald-50' : ''}>
                  <TableCell>
                    {/* 2026-10-10：审批模式仅待审批行可勾选；导出模式全部行可勾选（导出需自选数据） */}
                    {item.status === ApprovalStatus.PENDING || exportMode ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleSelect(item.id)}
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquareIcon className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    ) : (
                      <span className="w-4 h-4 block" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{item.code}</TableCell>
                  <TableCell className="text-gray-600">{item.applicantName}</TableCell>
                  <TableCell className="text-gray-600">{item.applicantDepartment}</TableCell>
                  <TableCell className="text-gray-900">{translateApprovalTitle(item.title, item.type)}</TableCell>
                  <TableCell className="text-gray-600">{item.applyDate}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {item.status === ApprovalStatus.PENDING && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(item)}
                            title="通过"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReject(item)}
                            title="拒绝"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetail(item)}
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>暂无审批记录</p>
            <p className="text-sm text-gray-400 mt-2">在生产计划/采收申请页面提交申请后，这里将显示审批列表</p>
          </div>
        )}

        {/* 分页 */}
        {filteredData.length > 0 && (
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
      </div>

      {/* 详情弹窗 - 当没有生产计划详情时才显示（避免与 BatchDetailModal 重复） */}
      <UnifiedModal
        isOpen={detailModal.show && !!detailModal.approval && !detailModal.productionPlanDetail}
        onClose={closeDetailModal}
        title="审批详情"
        size="xl"
        showFooter={true}
        footer={
          <Button variant="default" onClick={closeDetailModal}>
            <X className="w-4 h-4" /> 关闭
          </Button>
        }
      >
        {detailModal.approval && (
        <div className="space-y-4">
          {/* 状态标签 */}
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              detailModal.approval.status === ApprovalStatus.PENDING ? 'bg-amber-100 text-amber-700' :
              detailModal.approval.status === ApprovalStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
              detailModal.approval.status === ApprovalStatus.REJECTED ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {detailModal.approval.status === ApprovalStatus.PENDING ? '待审批' :
               detailModal.approval.status === ApprovalStatus.APPROVED ? '已通过' :
               detailModal.approval.status === ApprovalStatus.REJECTED ? '已拒绝' :
               detailModal.approval.status}
            </span>
          </div>

          {/* 基本信息卡片 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 申请信息
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-400">申请标题</Label>
                <p className="text-sm font-medium text-gray-900">{translateApprovalTitle(detailModal.approval.title, detailModal.approval.type)}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-400">申请人</Label>
                <p className="text-sm font-medium text-gray-900">{detailModal.approval.applicantName || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-400">申请部门</Label>
                <p className="text-sm font-medium text-gray-900">{detailModal.approval.applicantDepartment || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-400">申请时间</Label>
                <p className="text-sm font-medium text-gray-900">{detailModal.approval.applyDate} {detailModal.approval.applyTime}</p>
              </div>
              {detailModal.approval.amount && (
                <div>
                  <Label className="text-xs text-gray-400">申请金额</Label>
                  <p className="text-sm font-medium text-emerald-600 text-lg">¥{Number(detailModal.approval.amount).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* 采购物资明细卡片 */}
          {detailModal.approval.businessLink?.type === 'purchase' && detailModal.purchasePlanDetail?.items?.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> 采购物资明细
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料名称</TableHead>
                    <TableHead>规格型号</TableHead>
                    <TableHead className="text-center">单位</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">预估单价</TableHead>
                    <TableHead className="text-right">小计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailModal.purchasePlanDetail.items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="text-gray-900">{item.materialName || '-'}</TableCell>
                      <TableCell className="text-gray-600">{item.specification || '-'}</TableCell>
                      <TableCell className="text-gray-600 text-center">{item.unit || '-'}</TableCell>
                      <TableCell className="text-gray-900 text-right font-medium">{item.quantity || 0}</TableCell>
                      <TableCell className="text-gray-600 text-right">¥{(item.estimatedPrice || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-emerald-600 text-right font-medium">¥{(item.estimatedTotalPrice || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-2">
                <span className="text-sm font-medium text-gray-700">总计金额：</span>
                <span className="text-lg font-bold text-emerald-600 ml-2">
                  ¥{detailModal.purchasePlanDetail.items.reduce((sum: number, item: any) => sum + (item.estimatedTotalPrice || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* 业务关联信息卡片 */}
          {detailModal.approval.businessLink && (
            <div className="bg-emerald-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-emerald-600 mb-3 flex items-center gap-2">
                <Sprout className="w-4 h-4" /> {(() => {
                  const typeLabelMap: Record<string, string> = {
                    'production': '生产计划信息',
                    'production_batch': '生产批次信息',
                    'batch_change': '批次变更信息',
                    'batch_void': '批次作废信息',
                    'tech_solution': '技术方案信息',
                    'harvest': '采收申请信息',
                    'material': '领料申请信息',
                    'purchase': '采购申请信息',
                    'leave': '请假申请信息',
                    'overtime': '加班申请信息',
                    'transfer': '转岗申请信息',
                    'resign': '离职申请信息'
                  };
                  return typeLabelMap[detailModal.approval.businessLink?.type || ''] || '业务信息';
                })()}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(detailModal.approval.businessLink).map(([key, value]) => {
                  // 字段中文映射
                  const fieldLabels: Record<string, string> = {
                    type: '业务类型',
                    requestId: '请求ID',
                    requestCode: '计划编号',
                    batchCode: '批次编号',
                    cropName: '作物名称',
                    cropCode: '作物编码',
                    variety: '品种',
                    greenhouseName: '温室区域',
                    greenhouseId: '温室ID',
                    startDate: '开始日期',
                    expectedHarvestDate: '预计采收',
                    responsiblePerson: '负责人',
                    targetYield: '目标产量',
                    plantingArea: '种植面积',
                    plantingMode: '种植方式',
                    unit: '单位',
                    quantity: '数量',
                    // 技术方案相关字段
                    solutionTitle: '方案标题',
                    stage: '阶段',
                    version: '版本号',
                    // 通用字段
                    remarks: '备注',
                    description: '描述'
                  };
                  const label = fieldLabels[key] || key;
                  // 格式化值显示
                  let displayValue = String(value);
                  if (key === 'type') {
                    const typeMap: Record<string, string> = {
                      'production': '生产计划',
                      'production_batch': '生产批次',
                      'batch_change': '批次变更',
                      'batch_void': '批次作废',
                      'tech_solution': '技术方案',
                      'harvest': '采收申请',
                      'material': '领料申请',
                      'purchase': '采购申请',
                      'leave': '请假',
                      'overtime': '加班',
                      'transfer': '转岗',
                      'resign': '离职'
                    };
                    displayValue = typeMap[value as string] || value as string;
                  }
                  if (key === 'targetYield') displayValue = `${value} kg`;
                  if (key === 'plantingArea') displayValue = `${value} m²`;
                  if (key === 'quantity') displayValue = `${value}`;
                  // 种植方式翻译
                  if (key === 'plantingMode') {
                    const modeMap: Record<string, string> = {
                      'internal_seed': '自育苗',
                      'external_purchase': '外购苗',
                      'open_field': '露天栽培',
                      'greenhouse': '温室栽培',
                      'hydroponics': '水培',
                      'aeroponics': '气雾培',
                      'substrate': '基质培',
                      'soil': '土培'
                    };
                    displayValue = modeMap[value as string] || value as string;
                  }
                  // 阶段翻译
                  if (key === 'stage') {
                    const stageMap: Record<string, string> = {
                      'seedling': '苗期',
                      'vegetative': '营养生长期',
                      'flowering': '开花期',
                      'fruiting': '结果期',
                      'harvest': '采收期',
                      'entire': '整个生命周期',
                      'whole_lifecycle': '整个生命周期'
                    };
                    displayValue = stageMap[value as string] || value as string;
                  }
                  return (
                    <div key={key} className="flex flex-col">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-sm font-medium text-gray-900">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 申请描述卡片 */}
          {detailModal.approval.description && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> 申请描述
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detailModal.approval.description}</p>
            </div>
          )}

          {/* 审批记录卡片 */}
          {detailModal.approval.records && detailModal.approval.records.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-purple-600 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> 审批记录
              </h4>
              <div className="space-y-3">
                {detailModal.approval.records.map((record: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-2 bg-white rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      record.action === 'approve' ? 'bg-emerald-500' :
                      record.action === 'reject' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{record.approverName}</span>
                        <span className="text-gray-500 mx-1">
                          {record.action === 'approve' ? '通过了申请' :
                           record.action === 'reject' ? '拒绝了申请' :
                           record.action === 'partially_approve' ? '部分通过了' : '操作了'}
                        </span>
                      </p>
                      {record.comment && (
                        <p className="text-xs text-gray-500 mt-1">备注：{record.comment}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{record.actionTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </UnifiedModal>

      {/* 生产计划详情弹窗 - 复用 BatchDetailModal */}
      {detailModal.productionPlanDetail && (
        <BatchDetailModal
          batch={detailModal.productionPlanDetail}
          onClose={closeDetailModal}
        />
      )}

      {/* 审批确认弹窗 */}
      <UnifiedModal
        isOpen={approvalModal.show && !!approvalModal.approval}
        onClose={cancelApproval}
        title={approvalModal.action === 'approve' ? '确认通过' : '确认拒绝'}
        size="sm"
        showFooter={true}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={cancelApproval}>
              <X className="w-4 h-4" /> 取消
            </Button>
            <Button
              variant={approvalModal.action === 'approve' ? 'default' : 'destructive'}
              onClick={confirmApproval}
              disabled={confirming}
            >
              {confirming ? '处理中...' : (approvalModal.action === 'approve' ? '确认通过' : '确认拒绝')}
            </Button>
          </div>
        }
      >
        {approvalModal.approval && (
        <div>
          <div className="mb-4">
            <Label className="text-gray-700">
              {approvalModal.action === 'approve' ? '通过意见（可选）' : '拒绝原因（可选）'}
            </Label>
            <TextArea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder={approvalModal.action === 'approve' ? '请输入通过意见...' : '请输入拒绝原因...'}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">申请标题：</span>{translateApprovalTitle(approvalModal.approval.title, approvalModal.approval.type)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">申请人：</span>{approvalModal.approval.applicantName}
            </p>
          </div>
        </div>
        )}
      </UnifiedModal>

      {/* 批量导出：格式选择弹窗（2026-10-10：与全站一致的 CSV/Excel 两步流程） */}
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