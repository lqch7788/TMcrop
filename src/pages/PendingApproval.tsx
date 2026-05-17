// ============================================================
// 待办审批页面 - 重构版本
// 文件路径：src/pages/PendingApproval.tsx
// 使用统一数据层：ApprovalContext
// ============================================================

import { useState, useMemo } from 'react';
import { ClipboardCheck, Search, CheckCircle, XCircle, Clock, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApproval, usePendingApprovals } from '../hooks/useApproval';
import useApprovalBusinessDetail from '../hooks/useApprovalBusinessDetail';
import { useAuthPermission } from '../hooks/usePermission';
import { ApprovalStatus, Approval } from '../types/approval';
import { ApprovalDetail } from '../components/approval/ApprovalDetail';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui';
import { Button } from '../components/ui/button';

export default function PendingApproval() {
  const { approve, reject } = useApproval();
  const { pendingApprovals } = usePendingApprovals();

  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  const canApprove = true;

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailApproval, setDetailApproval] = useState<Approval | null>(null);
  const { data: businessData, isLoading: businessLoading } = useApprovalBusinessDetail(detailApproval);
  const pageSize = 5;

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
      <div className="bg-white rounded-xl p-6 shadow-sm">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              placeholder="搜索审批单标题、申请人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">审批类型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>领料单</option>
              <option>采购申请</option>
              <option>退料单</option>
            </select>
          </div>
          <Button size="sm" onClick={() => {}}><Search className="w-4 h-4" />搜索</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">待审批列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">金额</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedApprovals.map((approval) => (
                <tr key={approval.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{approval.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{approval.typeName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{approval.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{approval.applicantName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{approval.applicantDepartment}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{approval.applyDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{approval.amount || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {approval.status === ApprovalStatus.PENDING ? '待审批' : approval.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredApprovals.length === 0 && (
          <div className="p-8 text-center text-gray-500">暂无待审批单据</div>
        )}
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredApprovals.length} 条记录，第 {currentPage}/{totalPages || 1} 页
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