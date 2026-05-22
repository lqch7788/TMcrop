// ============================================================
// 已办审批页面 - 重构版本
// 文件路径：src/pages/Approved.tsx
// 使用统一数据层：ApprovalContext
// ============================================================

import { useState, useMemo } from 'react';
import { CheckCircle, Search, FileCheck, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApproval, useApprovedApprovals } from '../hooks/useApproval';
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

export default function Approved() {
  const { getApprovalById } = useApproval();
  const { approvedApprovals } = useApprovedApprovals();

  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailApproval, setDetailApproval] = useState<Approval | null>(null);
  const { data: businessData, isLoading: businessLoading } = useApprovalBusinessDetail(detailApproval);
  const pageSize = 5;

  // 筛选
  const filteredList = useMemo(() => {
    return approvedApprovals.filter(a => {
      const matchSearch =
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.applicantName.includes(searchTerm);
      const matchResult =
        resultFilter === '全部' ||
        (resultFilter === '已通过' && a.status === ApprovalStatus.APPROVED) ||
        (resultFilter === '已拒绝' && a.status === ApprovalStatus.REJECTED);
      return matchSearch && matchResult;
    });
  }, [approvedApprovals, searchTerm, resultFilter]);

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 统计
  const approvedCount = useMemo(() => {
    return approvedApprovals.filter(a => a.status === ApprovalStatus.APPROVED).length;
  }, [approvedApprovals]);

  const rejectedCount = useMemo(() => {
    return approvedApprovals.filter(a => a.status === ApprovalStatus.REJECTED).length;
  }, [approvedApprovals]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">已办审批</h1>
              <p className="text-gray-500">已完成的审批任务列表</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
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
              <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
              <p className="text-xs text-gray-500">已拒绝</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 text-lg">📊</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{approvedApprovals.length}</p>
              <p className="text-xs text-gray-500">审批总数</p>
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
            <Label className="text-gray-700">审批结果</Label>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-full h-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
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
          <h3 className="text-lg font-semibold text-gray-900">已审批列表</h3>
        </div>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">审批单号</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">类型</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">标题</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">申请人</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">申请时间</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">审批时间</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">金额</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">审批结果</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold text-gray-900">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedList.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{item.typeName}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{item.title}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{item.applicantName}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{item.applyDate}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{item.updatedAt?.substring(0, 10) || '-'}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600">{item.amount || '-'}</TableCell>
                <TableCell className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === ApprovalStatus.APPROVED
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {item.status === ApprovalStatus.APPROVED ? '已通过' : '已拒绝'}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看" onClick={() => setDetailApproval(item)}>
                    <Eye className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredList.length === 0 && (
          <div className="p-8 text-center text-gray-500">暂无已审批记录</div>
        )}
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredList.length} 条记录，第 {currentPage}/{totalPages || 1} 页
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