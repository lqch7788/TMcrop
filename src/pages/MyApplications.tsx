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
import { ApprovalStatus, ApprovalType } from '../types/approval';

export default function MyApplications() {
  const { approvals, approve, reject } = useApproval();

  // Tab: pending=待审批, approved=已通过, rejected=已拒绝, all=全部
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 当前用户ID（模拟）
  const currentUserId = 'user_001';

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
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/approvals" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的申请</h1>
            <p className="text-gray-500">查看我提交的所有审批申请</p>
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
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="全部">全部类型</option>
            <option value={ApprovalType.MATERIAL_REQUEST}>领料申请</option>
            <option value={ApprovalType.RETURN_MATERIAL}>退料单</option>
            <option value={ApprovalType.PURCHASE_REQUEST}>采购申请</option>
            <option value={ApprovalType.LEAVE}>请假</option>
            <option value={ApprovalType.OVERTIME}>加班</option>
            <option value={ApprovalType.RESIGNATION}>离职</option>
          </select>
        </div>
      </div>

      {/* 数据列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">审批单号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">标题</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">类型</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">申请人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">申请时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : paginatedData.map(approval => (
              <tr key={approval.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{approval.code}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{approval.title}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {Object.values(ApprovalType).find(v => v === approval.type)
                    ? approval.type.replace(/_/g, ' ')
                    : approval.type}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{approval.applicantName}</td>
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
