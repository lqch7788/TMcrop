// ============================================================
// 待办审批页面 - 重构版本
// 文件路径：src/pages/PendingApproval.tsx
// 使用统一数据层：ApprovalContext
// ============================================================

import { useState, useMemo } from 'react';
import { ClipboardCheck, Search, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useApproval, usePendingApprovals } from '../hooks/useApproval';
import useApprovalBusinessDetail from '../hooks/useApprovalBusinessDetail';
import { useAuthPermission } from '../hooks/usePermission';
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

export default function PendingApproval() {
  const { approve, reject } = useApproval();
  const { pendingApprovals } = usePendingApprovals();

  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  const canApprove = true;

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [detailApproval, setDetailApproval] = useState<Approval | null>(null);
  const { data: businessData, isLoading: businessLoading } = useApprovalBusinessDetail(detailApproval);

  // 筛选
  const filteredApprovals = useMemo(() => {
    return pendingApprovals.filter(a => {
      const matchSearch =
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.applicantName.includes(searchTerm);
      const matchType = typeFilter === '全部' || a.typeName === typeFilter;
      return matchSearch && matchType;
    });
  }, [pendingApprovals, searchTerm, typeFilter]);

  const totalPages = Math.ceil(filteredApprovals.length / pageSize);
  const paginatedApprovals = filteredApprovals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 统计
  const urgentCount = useMemo(() => {
    return pendingApprovals.filter(a => a.priority === 'urgent').length;
  }, [pendingApprovals]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">待办审批</h1>
              <p className="text-gray-500">待审批的单据列表</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingApprovals.length}</p>
              <p className="text-xs text-gray-500">待审批</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <span className="text-red-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{urgentCount}</p>
              <p className="text-xs text-gray-500">加急</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-gray-700">搜索</Label>
            <input
              type="text"
              placeholder="搜索审批单标题、申请人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <Label className="text-gray-700">审批类型</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full h-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                <SelectItem value="领料单">领料单</SelectItem>
                <SelectItem value="采购申请">采购申请</SelectItem>
                <SelectItem value="退料单">退料单</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => {}}><Search className="w-4 h-4" />搜索</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">待审批列表</h3>
        </div>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">审批单号</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">类型</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">标题</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">申请人</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">部门</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">申请时间</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">金额</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">状态</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedApprovals.map((approval) => (
              <TableRow key={approval.id}>
                <TableCell className="px-4 py-3 text-sm font-medium text-gray-900">{approval.code}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{approval.typeName}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{approval.title}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{approval.applicantName}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{approval.applicantDepartment}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{approval.applyDate}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{approval.amount || '-'}</TableCell>
                <TableCell className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    {approval.status === ApprovalStatus.PENDING ? '待审批' : approval.status}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {canApprove && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => approve(approval.id)} title="通过">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => reject(approval.id, '审批拒绝')} title="拒绝">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" title="查看" onClick={() => setDetailApproval(approval)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredApprovals.length === 0 && (
          <div className="p-8 text-center text-gray-500">暂无待审批单据</div>
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredApprovals.length / pageSize) || 1}
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