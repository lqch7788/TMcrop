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
import useApprovalBusinessDetail from '../hooks/useApprovalBusinessDetail';
import { ApprovalStatus, ApprovalType, Approval } from '../types/approval';
import BatchActionBar from '../components/approval/BatchActionBar';
import { ApprovalDetail } from '../components/approval/ApprovalDetail';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Pagination } from '../components/ui';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { showConfirm } from '@/lib/dialogService';

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
  const [detailApproval, setDetailApproval] = useState<Approval | null>(null);
  // 加载审批关联的业务数据
  const { data: businessData, isLoading: businessLoading } = useApprovalBusinessDetail(detailApproval);

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
    a.download = `农事审批_${new Date().toISOString().slice(0, 10)}.json`;
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
              <h1 className="text-2xl font-bold text-gray-900">农事审批</h1>
              <p className="text-gray-500">任务派发、任务变更、巡查问题、问题整改审批</p>
            </div>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
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
              </TableHead>
              <TableHead>审批单号</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>申请人</TableHead>
              <TableHead>部门</TableHead>
              <TableHead>申请时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
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
    </div>
  );
}
