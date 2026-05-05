// ============================================================
// 指标预算审批页面
// 文件路径：src/pages/IndicatorBudgetApproval.tsx
// 功能：指标发布/调整、预算编制/调整审批
// ============================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Search, ChevronLeft,
  CheckCircle, XCircle, Target, Coins, Eye, Square, CheckSquare as CheckSquareIcon
} from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import { ApprovalStatus, ApprovalType } from '../types/approval';
import BatchActionBar from '../components/approval/BatchActionBar';

export default function IndicatorBudgetApproval() {
  const { approvals, approve, reject } = useApproval();

  const [activeTab, setActiveTab] = useState<
    'indicator' | 'indicator_adjust' | 'budget_create' | 'budget_adjust'
  >('indicator');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const tabs = [
    { key: 'indicator', label: '指标发布', icon: Target, types: [ApprovalType.INDICATOR_APPROVAL] },
    { key: 'indicator_adjust', label: '指标调整', icon: BarChart3, types: [ApprovalType.INDICATOR_APPROVAL] },
    { key: 'budget_create', label: '预算编制', icon: Coins, types: [ApprovalType.BUDGET_CREATE] },
    { key: 'budget_adjust', label: '预算调整', icon: BarChart3, types: [ApprovalType.BUDGET_ADJUST] },
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
    a.download = `指标预算审批_${new Date().toISOString().slice(0, 10)}.json`;
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
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">指标预算审批</h1>
            <p className="text-gray-500">指标发布/调整、预算编制/调整审批</p>
          </div>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部', value: stats.total, color: 'gray' },
          { label: '待审批', value: stats.pending, color: 'amber' },
          { label: '已通过', value: stats.approved, color: 'emerald' },
          { label: '已拒绝', value: stats.rejected, color: 'red' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`text-2xl font-bold text-${item.color}-600`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white'
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
              <input
                type="text"
                placeholder="搜索审批单号、标题、申请人..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
          >
            <option value="全部">全部状态</option>
            <option value="待审批">待审批</option>
            <option value="已通过">已通过</option>
            <option value="已拒绝">已拒绝</option>
          </select>
        </div>
      </div>

      {/* 数据列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-12">
                <button
                  onClick={() => handleSelectAll(selectedIds.size !== pendingApprovals.length)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {selectedIds.size === pendingApprovals.length && pendingApprovals.length > 0 ? (
                    <CheckSquareIcon className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">审批单号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">标题</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">申请人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">部门</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">申请时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : paginatedData.map(approval => (
              <tr key={approval.id} className={`hover:bg-gray-50 ${selectedIds.has(approval.id) ? 'bg-emerald-50' : ''}`}>
                <td className="px-4 py-3">
                  {approval.status === ApprovalStatus.PENDING ? (
                    <button
                      onClick={() => handleToggleSelect(approval.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {selectedIds.has(approval.id) ? (
                        <CheckSquareIcon className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  ) : (
                    <span className="w-4 h-4 block" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{approval.code}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{approval.title}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{approval.applicantName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{approval.applicantDepartment}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{approval.applyDate}</td>
                <td className="px-4 py-3">{getStatusBadge(approval.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                      <Eye className="w-4 h-4" />
                    </button>
                    {approval.status === ApprovalStatus.PENDING && (
                      <>
                        <button
                          onClick={() => approve(approval.id)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => reject(approval.id, '审批拒绝')}
                          className="px-3 py-1 border border-red-200 text-red-600 rounded text-xs hover:bg-red-50"
                        >
                          拒绝
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} 条，共 {filteredData.length} 条
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1 text-sm">第 {currentPage} / {totalPages} 页</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
