// ============================================================
// 生产审批页面
// 文件路径：src/pages/ProductionApproval.tsx
// 功能：技术方案审批、生产计划审批、采收申请审批的统一管理
// 使用真实数据：从ApprovalContext获取
// ============================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout, Search, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, FileText,
  Calendar, Warehouse, Eye, Package, RefreshCw, Square, CheckSquare as CheckSquareIcon, X, ShoppingCart
} from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import { ApprovalStatus, ApprovalType, Approval } from '../types/approval';
import { usePurchasePlanStore } from '../stores/usePurchasePlanStore';
import BatchActionBar from '../components/approval/BatchActionBar';
import { Button } from '../components/ui/button';

export default function ProductionApproval() {
  const { approvals, approve, reject } = useApproval();

  const [activeTab, setActiveTab] = useState<
    'tech' | 'plan' | 'purchase' | 'batch' | 'batch_change' | 'batch_void' | 'harvest'
  >('tech');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailModal, setDetailModal] = useState<{ show: boolean; approval: Approval | null; purchasePlanDetail?: any }>({ show: false, approval: null, purchasePlanDetail: null });
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
          setDetailModal({ show: true, approval, purchasePlanDetail: planDetail });
          return;
        }
      } catch (error) {
        console.error('加载采购计划详情失败:', error);
      }
    }
    setDetailModal({ show: true, approval, purchasePlanDetail: null });
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

  // 确认审批操作
  const confirmApproval = () => {
    if (!approvalModal.approval || !approvalModal.action) return;

    if (approvalModal.action === 'approve') {
      approve(approvalModal.approval.id, approvalComment);
    } else {
      reject(approvalModal.approval.id, approvalComment || '审批拒绝');
    }
    setApprovalModal({ show: false, approval: null, action: null });
    setApprovalComment('');
  };

  // 取消审批
  const cancelApproval = () => {
    setApprovalModal({ show: false, approval: null, action: null });
    setApprovalComment('');
  };

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setDetailModal({ show: false, approval: null, purchasePlanDetail: null });
  };

  // Tab配置 - 生产类审批
  const tabs = [
    { key: 'plan', label: '生产计划审批', icon: Calendar, path: '/production', types: [ApprovalType.PRODUCTION_PLAN] },
    { key: 'tech', label: '技术方案审批', icon: FileText, path: '/tech-solution', types: [ApprovalType.TECH_SOLUTION] },
    { key: 'purchase', label: '采购计划审批', icon: ShoppingCart, path: '/purchase-plan', types: [ApprovalType.PURCHASE_REQUEST] },
    { key: 'batch', label: '生产批次审批', icon: Package, path: '/production', types: [ApprovalType.PRODUCTION_BATCH] },
    { key: 'batch_change', label: '批次变更审批', icon: RefreshCw, path: '/production', types: [ApprovalType.BATCH_CHANGE] },
    { key: 'batch_void', label: '批次作废审批', icon: XCircle, path: '/production', types: [ApprovalType.BATCH_VOID] },
    { key: 'harvest', label: '采收申请审批', icon: Warehouse, path: '/harvest', types: [ApprovalType.HARVEST_REQUEST] },
  ] as const;

  // 根据Tab类型筛选数据
  const getCurrentData = useMemo(() => {
    const currentTab = tabs.find(t => t.key === activeTab);
    if (!currentTab) return [];
    // 目前只有生产计划和采收申请有对应的ApprovalType
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

  const handleBatchApprove = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要批量通过 ${selectedIds.size} 项审批吗？`)) {
      selectedIds.forEach(id => approve(id));
      setSelectedIds(new Set());
    }
  };

  const handleBatchReject = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要批量拒绝 ${selectedIds.size} 项审批吗？`)) {
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
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/approvals" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产审批</h1>
            <p className="text-gray-500">技术方案、生产计划、采收申请审批管理</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">总申请数</p>
            </div>
          </div>
        </div>
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
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
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
      </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              placeholder="搜索申请人、申请单号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="全部">全部</option>
              <option value="待审批">待审批</option>
              <option value="已通过">已通过</option>
              <option value="已拒绝">已拒绝</option>
            </select>
          </div>
          <Button size="sm" onClick={() => {}}><Search className="w-4 h-4" />搜索</Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
          <Link
            to={tabs.find(t => t.key === activeTab)?.path || '/'}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            查看全部 →
          </Link>
        </div>
        {/* 批量操作栏 */}
        <BatchActionBar
          selectedIds={selectedIds}
          allIds={paginatedData.map(d => d.id)}
          pendingApprovals={pendingApprovals}
          onSelectAll={handleSelectAll}
          onBatchApprove={handleBatchApprove}
          onBatchReject={handleBatchReject}
          onExport={handleExport}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSelectAll(selectedIds.size !== pendingApprovals.length)}
                  >
                    {selectedIds.size === pendingApprovals.length && pendingApprovals.length > 0 ? (
                      <CheckSquareIcon className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">申请单号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">申请人</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">部门</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">申请标题</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">申请时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(item.id) ? 'bg-emerald-50' : ''}`}>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.applicantName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.applicantDepartment}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.applyDate}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              共 {filteredData.length} 条记录，第 {currentPage}/{totalPages || 1} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
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
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
                disabled={currentPage === (totalPages || 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {detailModal.show && detailModal.approval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeDetailModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* 弹窗头部 - 绿色 */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">审批详情</h3>
                  <p className="text-sm text-white/80">{detailModal.approval.code}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeDetailModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </Button>
            </div>

            {/* 状态标签 */}
            <div className="px-6 pt-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                detailModal.approval.status === ApprovalStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                detailModal.approval.status === ApprovalStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                detailModal.approval.status === ApprovalStatus.REJECTED ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {detailModal.approval.status === ApprovalStatus.PENDING ? '⏳ 待审批' :
                 detailModal.approval.status === ApprovalStatus.APPROVED ? '✅ 已通过' :
                 detailModal.approval.status === ApprovalStatus.REJECTED ? '❌ 已拒绝' :
                 detailModal.approval.status}
              </span>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] space-y-4">
              {/* 基本信息卡片 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> 申请信息
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">申请标题</label>
                    <p className="text-sm font-medium text-gray-900">{detailModal.approval.title}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">申请人</label>
                    <p className="text-sm font-medium text-gray-900">{detailModal.approval.applicantName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">申请部门</label>
                    <p className="text-sm font-medium text-gray-900">{detailModal.approval.applicantDepartment || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">申请时间</label>
                    <p className="text-sm font-medium text-gray-900">{detailModal.approval.applyDate} {detailModal.approval.applyTime}</p>
                  </div>
                  {detailModal.approval.amount && (
                    <div>
                      <label className="text-xs text-gray-400">申请金额</label>
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
                  <table className="w-full text-sm">
                    <thead className="bg-blue-100 text-blue-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">物料名称</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">规格型号</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">单位</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">数量</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">预估单价</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">小计</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {detailModal.purchasePlanDetail.items.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-gray-900">{item.materialName || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{item.specification || '-'}</td>
                          <td className="px-3 py-2 text-gray-600 text-center">{item.unit || '-'}</td>
                          <td className="px-3 py-2 text-gray-900 text-right font-medium">{item.quantity || 0}</td>
                          <td className="px-3 py-2 text-gray-600 text-right">¥{(item.estimatedPrice || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-emerald-600 text-right font-medium">¥{(item.estimatedTotalPrice || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50">
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-right text-sm font-medium text-gray-700">总计金额：</td>
                        <td className="px-3 py-2 text-right text-lg font-bold text-emerald-600">
                          ¥{detailModal.purchasePlanDetail.items.reduce((sum: number, item: any) => sum + (item.estimatedTotalPrice || 0), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
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
                              {record.action === 'approve' ? '✅ 通过了申请' :
                               record.action === 'reject' ? '❌ 拒绝了申请' :
                               record.action === 'partially_approve' ? '🔄 部分通过了' : '📝 操作了'}
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

            {/* 弹窗底部 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button
                variant="default"
                onClick={closeDetailModal}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 审批确认弹窗 */}
      {approvalModal.show && approvalModal.approval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelApproval}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className={`flex items-center justify-between px-6 py-4 ${approvalModal.action === 'approve' ? 'bg-emerald-600' : 'bg-red-600'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  {approvalModal.action === 'approve' ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <XCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {approvalModal.action === 'approve' ? '确认通过' : '确认拒绝'}
                  </h3>
                  <p className="text-sm text-white/80">{approvalModal.approval.code}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={cancelApproval} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </Button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {approvalModal.action === 'approve' ? '通过意见（可选）' : '拒绝原因（可选）'}
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder={approvalModal.action === 'approve' ? '请输入通过意见...' : '请输入拒绝原因...'}
                  className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
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

            {/* 弹窗底部 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={cancelApproval}
              >
                取消
              </Button>
              <Button
                variant={approvalModal.action === 'approve' ? 'default' : 'destructive'}
                onClick={confirmApproval}
              >
                {approvalModal.action === 'approve' ? '确认通过' : '确认拒绝'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}