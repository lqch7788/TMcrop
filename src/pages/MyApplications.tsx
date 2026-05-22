// ============================================================
// 我的申请页面
// 文件路径：src/pages/MyApplications.tsx
// 功能：合并待办审批、已办审批、我提交的审批
// ============================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Search, ChevronLeft,
  CheckCircle, XCircle, Clock, Eye, ClipboardList
} from 'lucide-react';
import { useApproval } from '../hooks/useApproval';
import useApprovalBusinessDetail from '../hooks/useApprovalBusinessDetail';
import { ApprovalStatus, ApprovalType, Approval } from '../types/approval';
import { ApprovalDetail } from '../components/approval/ApprovalDetail';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../components/ui';
import { Button } from '../components/ui/button';

export default function MyApplications() {
  const { approvals, approve, reject } = useApproval();

  // Tab: pending=待审批, approved=已通过, rejected=已拒绝, all=全部
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 当前用户ID
  const currentUserId = localStorage.getItem('userId') || 'user_001';
  const [detailApproval, setDetailApproval] = useState<Approval | null>(null);
  const { data: businessData, isLoading: businessLoading } = useApprovalBusinessDetail(detailApproval);

  const filteredData = useMemo(() => {
    // 先按Tab筛选
    let result = approvals;

    if (activeTab === 'pending') {
      result = result.filter(a => a.status === ApprovalStatus.PENDING);
    } else if (activeTab === 'approved') {
      result = result.filter(a => a.status === ApprovalStatus.APPROVED || a.status === ApprovalStatus.PARTIALLY_APPROVED);
    } else if (activeTab === 'rejected') {
      result = result.filter(a => a.status === ApprovalStatus.REJECTED);
    }

    // 搜索筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.title?.toLowerCase().includes(term) ||
        a.applicantName?.includes(term) ||
        a.code?.toLowerCase().includes(term)
      );
    }

    // 类型筛选
    if (typeFilter !== '全部') {
      result = result.filter(a => a.type === typeFilter);
    }

    return result;
  }, [approvals, activeTab, searchTerm, typeFilter]);

  const stats = useMemo(() => ({
    pending: approvals.filter(a => a.status === ApprovalStatus.PENDING).length,
    approved: approvals.filter(a => a.status === ApprovalStatus.APPROVED || a.status === ApprovalStatus.PARTIALLY_APPROVED).length,
    rejected: approvals.filter(a => a.status === ApprovalStatus.REJECTED).length,
    total: approvals.length,
  }), [approvals]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">已通过</span>;
      case ApprovalStatus.PARTIALLY_APPROVED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">部分通过</span>;
      case ApprovalStatus.REJECTED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">已拒绝</span>;
      case ApprovalStatus.PENDING:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">待审批</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">我的申请</h1>
              <p className="text-gray-500">查看我提交的所有审批申请</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { key: 'pending', label: '待审批', value: stats.pending, color: 'amber' },
          { key: 'approved', label: '已通过', value: stats.approved, color: 'emerald' },
          { key: 'rejected', label: '已拒绝', value: stats.rejected, color: 'red' },
          { key: 'all', label: '全部', value: stats.total, color: 'gray' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => { setActiveTab(item.key as typeof activeTab); setCurrentPage(1); }}
            className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-colors ${
              activeTab === item.key ? `border-${item.color}-500` : 'border-transparent hover:border-gray-200'
            }`}
          >
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`text-2xl font-bold text-${item.color}-600`}>{item.value}</p>
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
                placeholder="搜索审批单号、标题..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <Select
            value={typeFilter}
            onValueChange={(val) => { setTypeFilter(val); setCurrentPage(1); }}
          >
            <SelectTrigger className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部类型</SelectItem>
              <SelectItem value={ApprovalType.MATERIAL_REQUEST}>领料申请</SelectItem>
              <SelectItem value={ApprovalType.RETURN_MATERIAL}>退料单</SelectItem>
              <SelectItem value={ApprovalType.PURCHASE_REQUEST}>采购申请</SelectItem>
              <SelectItem value={ApprovalType.LEAVE}>请假</SelectItem>
              <SelectItem value={ApprovalType.OVERTIME}>加班</SelectItem>
              <SelectItem value={ApprovalType.RESIGNATION}>离职</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 数据列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500">审批单号</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500">标题</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500">类型</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500">申请人</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500">申请时间</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-8 text-center text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : paginatedData.map(approval => (
              <TableRow key={approval.id}>
                <TableCell className="px-4 py-3 text-sm text-gray-900">{approval.code}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-900">{approval.title}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-500">
                  {Object.values(ApprovalType).find(v => v === approval.type)
                    ? approval.type.replace(/_/g, ' ')
                    : approval.type}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-500">{approval.applicantName}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-500">{approval.applyDate}</TableCell>
                <TableCell className="px-4 py-3">{getStatusBadge(approval.status)}</TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setDetailApproval(approval)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {approval.status === ApprovalStatus.PENDING && (
                      <>
                        <Button
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
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} 条，共 {filteredData.length} 条
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <span className="px-3 py-1 text-sm">第 {currentPage} / {totalPages} 页</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
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
