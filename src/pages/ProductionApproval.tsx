// ============================================================
// 生产审批页面
// 文件路径：src/pages/ProductionApproval.tsx
// 功能：技术方案审批、生产计划审批、采收申请审批的统一管理
// 使用真实数据：从ApprovalContext获取
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout, Search, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, FileText,
  Calendar, Warehouse, Eye, Package, RefreshCw, Square, CheckSquare as CheckSquareIcon, ShoppingCart, Download
} from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import { ApprovalStatus, ApprovalType, Approval } from '../types/approval';
import { usePurchasePlanStore } from '../stores/usePurchasePlanStore';
import { showConfirm } from '@/lib/dialogService';
import { Button } from '@/components/ui/button';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/Pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KpiCard, KpiCardGrid } from '@/components/summary';
import { BatchDetailModal } from '@/components/production/modals';
import { CropBatch } from '@/types';
import { getProductionPlanById } from '@/services/apiProductionPlanService';

export default function ProductionApproval() {
  const { approvals, approve, reject, refreshApprovals } = useApproval();

  // 页面加载时获取审批数据
  useEffect(() => {
    refreshApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在挂载时加载一次

  const [activeTab, setActiveTab] = useState<
    'tech' | 'plan' | 'purchase' | 'harvest'
  >('plan');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
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
      console.error('[ProductionApproval] 审批操作失败:', error);
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

  // Tab配置 - 生产类审批
  const tabs = [
    { key: 'plan', label: '生产计划审批', icon: Calendar, path: '/production', types: [ApprovalType.PRODUCTION_PLAN] },
    { key: 'tech', label: '技术方案审批', icon: FileText, path: '/tech-solution', types: [ApprovalType.TECH_SOLUTION] },
    { key: 'purchase', label: '采购计划审批', icon: ShoppingCart, path: '/purchase-plan', types: [ApprovalType.PURCHASE_REQUEST] },
    { key: 'harvest', label: '采收申请审批', icon: Warehouse, path: '/harvest', types: [ApprovalType.HARVEST_REQUEST] },
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
      const pendingIds = paginatedData
        .filter(d => d.status === ApprovalStatus.PENDING)
        .map(d => d.id);
      setSelectedIds(new Set(pendingIds));
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
    if (selectedIds.size === 0) return;
    if (await showConfirm(`确定要批量通过 ${selectedIds.size} 项审批吗？`)) {
      selectedIds.forEach(id => approve(id));
      setSelectedIds(new Set());
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    if (await showConfirm(`确定要批量拒绝 ${selectedIds.size} 项审批吗？`)) {
      selectedIds.forEach(id => reject(id, '批量拒绝'));
      setSelectedIds(new Set());
    }
  };

  const handleExport = () => {
    if (selectedIds.size === 0) return;
    const selectedData = paginatedData.filter(d => selectedIds.has(d.id));
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
    a.download = `生产审批_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取待审批数据用于批量操作栏
  const pendingApprovals = getCurrentData.filter(d => d.status === ApprovalStatus.PENDING);

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
              <p className="text-gray-500">技术方案、生产计划、采收申请审批管理</p>
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
            <Button
              onClick={handleBatchApprove}
              disabled={selectedIds.size === 0}
              className={`
                ${selectedIds.size === 0
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
              disabled={selectedIds.size === 0}
              className={`
                ${selectedIds.size === 0
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
              批量导出
            </Button>
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
                    onClick={() => handleSelectAll(selectedIds.size !== pendingApprovals.length)}
                    className="text-white hover:bg-blue-400"
                  >
                    {selectedIds.size === pendingApprovals.length && pendingApprovals.length > 0 ? (
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
                    {item.status === ApprovalStatus.PENDING ? (
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
                  <TableCell className="text-gray-900">{item.title}</TableCell>
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
            关闭
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
                <p className="text-sm font-medium text-gray-900">{detailModal.approval.title}</p>
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
              取消
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
              <span className="font-medium">申请标题：</span>{approvalModal.approval.title}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">申请人：</span>{approvalModal.approval.applicantName}
            </p>
          </div>
        </div>
        )}
      </UnifiedModal>
    </div>
  );
}