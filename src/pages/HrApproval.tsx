// ============================================================
// HR审批单页面 - 重构版本
// 文件路径：src/pages/HrApproval.tsx
// 使用统一数据层：ApprovalContext
// ============================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Calendar, Clock, CheckCircle, XCircle, Eye, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApproval, useHrApprovals } from '../hooks/useApproval';
import { ApprovalStatus, ApprovalType } from '../types/approval';

export default function HrApproval() {
  const { approve, reject } = useApproval();
  const { hrApprovals, leaveApprovals, overtimeApprovals, transferApprovals, resignApprovals } = useHrApprovals();

  const [activeTab, setActiveTab] = useState<'leave' | 'overtime' | 'transfer' | 'resign'>('leave');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // 根据Tab获取对应数据
  const getCurrentData = () => {
    switch (activeTab) {
      case 'leave':
        return leaveApprovals;
      case 'overtime':
        return overtimeApprovals;
      case 'transfer':
        return transferApprovals;
      case 'resign':
        return resignApprovals;
      default:
        return [];
    }
  };

  // 筛选
  const filteredData = useMemo(() => {
    const data = getCurrentData();
    return data.filter(a => {
      const matchSearch =
        a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.applicantName?.includes(searchTerm) ||
        a.code?.includes(searchTerm);
      const matchStatus =
        statusFilter === '全部' ||
        (statusFilter === '待审批' && a.status === ApprovalStatus.PENDING) ||
        (statusFilter === '已通过' && a.status === ApprovalStatus.APPROVED);
      return matchSearch && matchStatus;
    });
  }, [activeTab, searchTerm, statusFilter, leaveApprovals, overtimeApprovals, transferApprovals, resignApprovals]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 统计
  const pendingTotal = useMemo(() => {
    return (
      leaveApprovals.filter(a => a.status === ApprovalStatus.PENDING).length +
      overtimeApprovals.filter(a => a.status === ApprovalStatus.PENDING).length +
      transferApprovals.filter(a => a.status === ApprovalStatus.PENDING).length +
      resignApprovals.filter(a => a.status === ApprovalStatus.PENDING).length
    );
  }, [leaveApprovals, overtimeApprovals, transferApprovals, resignApprovals]);

  const approvedTotal = useMemo(() => {
    return (
      leaveApprovals.filter(a => a.status === ApprovalStatus.APPROVED).length +
      overtimeApprovals.filter(a => a.status === ApprovalStatus.APPROVED).length +
      transferApprovals.filter(a => a.status === ApprovalStatus.APPROVED).length +
      resignApprovals.filter(a => a.status === ApprovalStatus.APPROVED).length
    );
  }, [leaveApprovals, overtimeApprovals, transferApprovals, resignApprovals]);

  const tabs = [
    { key: 'leave', label: '请假审批', icon: Calendar },
    { key: 'overtime', label: '加班审批', icon: Clock },
    { key: 'transfer', label: '调岗审批', icon: Users },
    { key: 'resign', label: '离职审批', icon: XCircle },
  ] as const;

  const getTypeName = (type: ApprovalType) => {
    switch (type) {
      case ApprovalType.LEAVE:
        return '请假';
      case ApprovalType.OVERTIME:
        return '加班';
      case ApprovalType.TRANSFER:
        return '调岗';
      case ApprovalType.RESIGN:
        return '离职';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings/personnel" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HR审批单</h1>
            <p className="text-gray-500">人事相关审批流程管理</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingTotal}</p>
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
              <p className="text-2xl font-bold text-gray-900">{approvedTotal}</p>
              <p className="text-xs text-gray-500">已通过</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              activeTab === tab.key ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              placeholder="搜索申请人、申请单号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>待审批</option>
              <option>已通过</option>
            </select>
          </div>
          <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.applicantName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getTypeName(item.type)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.applyDate}</td>
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
                        <>
                          <button
                            onClick={() => approve(item.id)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="通过"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => reject(item.id, '审批拒绝')}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="拒绝"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-8 text-center text-gray-500">暂无审批记录</div>
        )}
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredData.length} 条记录，第 {currentPage}/{totalPages || 1} 页
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