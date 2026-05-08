// ============================================================
// 农事审批页面
// 文件路径：src/pages/FarmApproval.tsx
// 功能：任务派发、任务变更、巡查问题、问题整改审批
// ============================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout, Search, ChevronLeft,
  CheckCircle, XCircle, Clock, FileText,
  AlertTriangle, CheckSquare, Eye, Square, CheckSquare as CheckSquareIcon
} from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import { ApprovalStatus, ApprovalType } from '../types/approval';
import BatchActionBar from '../components/approval/BatchActionBar';
import { Button } from '../components/ui/button';

export default function FarmApproval() {
  const { approvals, approve, reject } = useApproval();

  const [activeTab, setActiveTab] = useState<
    'task_dispatch' | 'task_change' | 'inspection' | 'resolve'
  >('task_dispatch');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const tabs = [
    { key: 'task_dispatch', label: '任务派发', icon: FileText, types: [ApprovalType.TASK_DISPATCH] },
    { key: 'task_change', label: '任务变更', icon: AlertTriangle, types: [ApprovalType.TASK_CHANGE] },
    { key: 'inspection', label: '巡查问题', icon: CheckSquare, types: [ApprovalType.INSPECTION_ISSUE] },
    { key: 'resolve', label: '问题整改', icon: CheckCircle, types: [ApprovalType.ISSUE_RESOLVE] },
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
    a.download = `农事审批_${new Date().toISOString().slice(0, 10)}.json`;
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
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">农事审批</h1>
            <p className="text-gray-500">任务派发、任务变更、巡查问题、问题整改审批</p>
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
          <Button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            size="sm"
            className={`flex items-center gap-2 ${
              activeTab !== tab.key
                ? 'text-gray-600'
                : ''
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSelectAll(selectedIds.size !== pendingApprovals.length)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {selectedIds.size === pendingApprovals.length && pendingApprovals.length > 0 ? (
                    <CheckSquareIcon className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
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
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{approval.code}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{approval.title}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{approval.applicantName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{approval.applicantDepartment}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{approval.applyDate}</td>
                <td className="px-4 py-3">{getStatusBadge(approval.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {approval.status === ApprovalStatus.PENDING && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => approve(approval.id)}
                        >
                          通过
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => reject(approval.id, '审批拒绝')}
                        >
                          拒绝
                        </Button>
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <span className="px-3 py-1 text-sm">第 {currentPage} / {totalPages} 页</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
