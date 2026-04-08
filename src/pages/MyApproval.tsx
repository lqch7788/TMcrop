import { useState } from 'react';
import { FileText, Search, Clock, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const myApprovals = [
  { id: 1, code: 'M20240320', type: '领料单', title: '1号棚有机肥领用申请', submitTime: '2024-03-15 09:30', currentApprover: '李建国', status: '待审批', statusClass: 'pending', flow: '部门经理 → 仓库' },
  { id: 2, code: 'M20240318', type: '采购申请', title: '夏季种植用肥采购计划', submitTime: '2024-03-12 14:20', currentApprover: '张建华', status: '待审批', statusClass: 'pending', flow: '部门经理 → 总经理 → 财务' },
  { id: 3, code: 'M20240315', type: '退料单', title: '3号棚农药退料申请', submitTime: '2024-03-10 10:15', currentApprover: '李建国', status: '已通过', statusClass: 'success', flow: '部门经理 → 仓库' },
  { id: 4, code: 'M20240308', type: '采购申请', title: '病虫害防治药剂采购', submitTime: '2024-03-05 16:30', currentApprover: '-', status: '已通过', statusClass: 'success', flow: '部门经理 → 总经理 → 财务' },
  { id: 5, code: 'M20240302', type: '领料单', title: '2号棚复合肥领用申请', submitTime: '2024-02-28 11:00', currentApprover: '-', status: '已拒绝', statusClass: 'danger', flow: '部门经理 → 仓库', rejectReason: '库存不足' },
];

export default function MyApproval() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredList = myApprovals.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.code.includes(searchTerm);
    const matchStatus = statusFilter === '全部' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
              <p className="text-2xl font-bold text-gray-900">{myApprovals.filter(a => a.status === '待审批').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{myApprovals.filter(a => a.status === '已通过').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{myApprovals.filter(a => a.status === '已拒绝').length}</p>
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
          <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">我的申请列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">提交时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">当前审批人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审批流程</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginatedList.map((item) => (
                <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate whitespace-nowrap">{item.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.submitTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.currentApprover}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.flow}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.statusClass === 'success' ? 'bg-green-100 text-green-700' :
                      item.statusClass === 'danger' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={10}
              onChange={(e) => setCurrentPage(1)}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredList.length} 条</span>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
