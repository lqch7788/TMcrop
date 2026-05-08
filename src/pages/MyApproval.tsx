// ============================================================
// 我提交的审批页面 - 重构版本
// 文件路径：src/pages/MyApproval.tsx
// 使用统一数据层：ApprovalContext
// ============================================================

import { useState, useMemo } from 'react';
import { FileText, Search, Clock, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApproval, useMyApprovals } from '../hooks/useApproval';
import { ApprovalStatus } from '../types/approval';
import { Button } from '../components/ui/button';

export default function MyApproval() {
  const { cancel } = useApproval();
  // TODO: 实际应从用户Context获取当前用户ID
  const { myApprovals } = useMyApprovals({ applicantId: 'current_user' });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
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
      <div className="bg-white rounded-xl p-6 shadow-sm">
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-xs text-gray-500">待审批</p>
            </div>
          </div>
        </div>
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
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              placeholder="搜索审批单号、标题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">审批状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>待审批</option>
              <option>已通过</option>
              <option>已拒绝</option>
            </select>
          </div>
          <Button size="sm" onClick={() => {}}><Search className="w-4 h-4" />搜索</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">我的申请列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">提交时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">当前审批人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批流程</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedList.map((item) => {
                const currentApprover = item.approvers?.[item.currentStep - 1];
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.typeName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{item.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.applyDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {currentApprover?.userName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.currentStep}/{item.totalSteps}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {item.status === ApprovalStatus.PENDING && (
                          <Button variant="ghost" size="icon" onClick={() => cancel(item.id, '主动撤回')} title="撤回">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="查看">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredList.length === 0 && (
          <div className="p-8 text-center text-gray-500">暂无审批记录</div>
        )}
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredList.length} 条记录，第 {currentPage}/{totalPages || 1} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
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
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage === (totalPages || 1)}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}