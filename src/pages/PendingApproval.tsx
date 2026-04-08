import { useState } from 'react';
import { ClipboardCheck, Search, CheckCircle, XCircle, Clock, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const pendingApprovals = [
  { id: 1, code: 'A2024032', type: '领料单', title: '1号棚有机肥领用申请', submitter: '张伟民', dept: '生产部', submitTime: '2024-03-15 10:30', amount: '5000元', status: '待审批', statusClass: 'pending' },
  { id: 2, code: 'A2024033', type: '采购申请', title: '夏季种植用肥采购计划', submitter: '李建国', dept: '技术部', submitTime: '2024-03-14 15:20', amount: '8.5万元', status: '待审批', statusClass: 'pending' },
  { id: 3, code: 'A2024034', type: '退料单', title: '3号棚农药退料申请', submitter: '王建国', dept: '生产部', submitTime: '2024-03-13 09:15', amount: '1500元', status: '待审批', statusClass: 'pending' },
  { id: 4, code: 'A2024035', type: '采购申请', title: '病虫害防治药剂采购', submitter: '王建华', dept: '技术部', submitTime: '2024-03-12 14:00', amount: '6.3万元', status: '待审批', statusClass: 'pending' },
  { id: 5, code: 'A2024036', type: '领料单', title: '2号棚复合肥领用申请', submitter: '李明轩', dept: '生产部', submitTime: '2024-03-11 16:45', amount: '3200元', status: '待审批', statusClass: 'pending' },
];

export default function PendingApproval() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredApprovals = pendingApprovals.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.submitter.includes(searchTerm);
    const matchType = typeFilter === '全部' || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil(filteredApprovals.length / pageSize);
  const paginatedApprovals = filteredApprovals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">2</p>
              <p className="text-xs text-gray-500">加急</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <span className="text-purple-600 text-lg">⏱</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">3</p>
              <p className="text-xs text-gray-500">即将超时</p>
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
          <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">待审批列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审批单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">金额</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginatedApprovals.map((approval) => (
                <tr key={approval.id} className="hover:bg-blue-100 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{approval.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{approval.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate whitespace-nowrap">{approval.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{approval.submitter}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{approval.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{approval.submitTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{approval.amount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {approval.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="审批">
                        <ClipboardCheck className="w-4 h-4" />
                      </button>
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
            <span className="text-sm text-gray-500">共 {filteredApprovals.length} 条</span>
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
