// ============================================================
// 我提交的审批页面 - 重构版本
// 文件路径：src/pages/MyApproval.tsx
// 使用统一数据层：Store
// ============================================================

import { useState, useMemo } from 'react';
import { FileText, Search, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useApproval, useMyApprovals } from '../hooks/useApproval';
import useApprovalBusinessDetail from '../hooks/useApprovalBusinessDetail';
import { ApprovalStatus, Approval } from '../types/approval';
import { ApprovalDetail } from '../components/approval/ApprovalDetail';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Label,
} from '../components/ui';
import { Button } from '../components/ui/button';
import { Pagination } from '@/components/ui/Pagination';
import { KpiCard, KpiCardGrid } from '@/components/summary';

export default function MyApproval() {
  const { cancel } = useApproval();
  // 从 localStorage 获取当前用户ID，hook 内部有 fallback 逻辑
  const { myApprovals } = useMyApprovals({ applicantId: localStorage.getItem('userId') || undefined });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailApproval, setDetailApproval] = useState<Approval | null>(null);
  const { data: businessData, isLoading: businessLoading } = useApprovalBusinessDetail(detailApproval);
  const pageSize = 5;

  // 筛选
  const filteredList = useMemo(() => {
    return myApprovals.filter(a => {
      const matchSearch =
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm);
      const matchStatus =
        statusFilter === '全部' ||
        (statusFilter === '待审批' && a.status === ApprovalStatus.PENDING) ||
        (statusFilter === '已通过' && a.status === ApprovalStatus.APPROVED) ||
        (statusFilter === '已拒绝' && a.status === ApprovalStatus.REJECTED);
      return matchSearch && matchStatus;
    });
  }, [myApprovals, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 统计
  const pendingCount = useMemo(() => {
    return myApprovals.filter(a => a.status === ApprovalStatus.PENDING).length;
  }, [myApprovals]);

  const approvedCount = useMemo(() => {
    return myApprovals.filter(a => a.status === ApprovalStatus.APPROVED).length;
  }, [myApprovals]);

  const rejectedCount = useMemo(() => {
    return myApprovals.filter(a => a.status === ApprovalStatus.REJECTED).length;
  }, [myApprovals]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">我提交的审批</h1>
              <p className="text-gray-500">我提交的审批单据及审批进度</p>
            </div>
          </div>
        </div>
      </div>

      <KpiCardGrid columns={3} compact>
        <KpiCard
          icon={<Clock className="w-4 h-4 text-white" />}
          label="待审批"
          value={pendingCount}
          colorScheme="amber"
          compact
        />
        <KpiCard
          icon={<CheckCircle className="w-4 h-4 text-white" />}
          label="已通过"
          value={approvedCount}
          colorScheme="emerald"
          compact
        />
        <KpiCard
          icon={<XCircle className="w-4 h-4 text-white" />}
          label="已拒绝"
          value={rejectedCount}
          colorScheme="red"
          compact
        />
      </KpiCardGrid>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-gray-700">搜索</Label>
            <input
              type="text"
              placeholder="搜索审批单号、标题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <Label className="text-gray-700">审批状态</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full h-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue />
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">我的申请列表</h3>
        </div>
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">申请单号</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">类型</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">标题</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">提交时间</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">当前审批人</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">审批流程</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
              <TableHead className="text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedList.map((item) => {
              const currentApprover = item.approvers?.[item.currentStep - 1];
              return (
                <TableRow key={item.id}>
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600">{item.typeName}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{item.title}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600">{item.applyDate}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600">
                    {currentApprover?.userName || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600">
                    {item.currentStep}/{item.totalSteps}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === ApprovalStatus.APPROVED
                        ? 'bg-green-100 text-green-700'
                        : item.status === ApprovalStatus.REJECTED
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status === ApprovalStatus.PENDING
                        ? '待审批'
                        : item.status === ApprovalStatus.APPROVED
                        ? '已通过'
                        : item.status === ApprovalStatus.REJECTED
                        ? '已拒绝'
                        : item.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {item.status === ApprovalStatus.PENDING && (
                        <Button variant="ghost" size="icon" onClick={() => cancel(item.id, '主动撤回')} title="撤回">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="查看" onClick={() => setDetailApproval(item)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filteredList.length === 0 && (
          <div className="p-8 text-center text-gray-500">暂无审批记录</div>
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredList.length / pageSize) || 1}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          showPageSize
        />
      </div>

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
  );
}
