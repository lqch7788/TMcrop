import { useState } from 'react';
import { CheckCircle, Search, FileCheck, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const approvedList = [
  { id: 1, code: 'A2024025', type: '领料单', title: '1号棚有机肥领用申请', submitter: '张伟民', dept: '生产部', submitTime: '2024-03-10 10:30', approveTime: '2024-03-11 14:20', amount: '5000元', result: '已通过', resultClass: 'success', opinion: '同意采购' },
  { id: 2, code: 'A2024026', type: '采购申请', title: '春季肥料采购计划', submitter: '李建国', dept: '技术部', submitTime: '2024-03-08 15:20', approveTime: '2024-03-09 09:15', amount: '15.8万元', result: '已通过', resultClass: 'success', opinion: '符合生产需求，同意采购' },
  { id: 3, code: 'A2024027', type: '退料单', title: '2号棚复合肥退料申请', submitter: '王建国', dept: '生产部', submitTime: '2024-03-05 11:00', approveTime: '2024-03-06 10:30', amount: '2400元', result: '已通过', resultClass: 'success', opinion: '情况属实，同意退料' },
  { id: 4, code: 'A2024028', type: '采购申请', title: '农业工具采购计划', submitter: '张建华', dept: '生产部', submitTime: '2024-03-01 09:00', approveTime: '2024-03-02 16:45', amount: '2.1万元', result: '已拒绝', resultClass: 'danger', opinion: '库存充足，暂不采购' },
  { id: 5, code: 'A2024029', type: '领料单', title: '3号棚农药领用申请', submitter: '赵俊杰', dept: '生产部', submitTime: '2024-02-28 14:30', approveTime: '2024-02-29 11:20', amount: '3200元', result: '已通过', resultClass: 'success', opinion: '同意领取' },
];

export default function Approved() {
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredList = approvedList.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.submitter.includes(searchTerm);
    const matchResult = resultFilter === '全部' || a.result === resultFilter;
    return matchSearch && matchResult;
  });

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">已办审批</h1>
            <p className="text-gray-500">已完成的审批任务列表</p>
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
              <p className="text-2xl font-bold text-gray-900">{approvedList.filter(a => a.result === '已通过').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{approvedList.filter(a => a.result === '已拒绝').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{approvedList.length}</p>
              <p className="text-xs text-gray-500">审批总数</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">审批结果</label>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
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
          <h3 className="text-lg font-semibold text-gray-900">已审批列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">金额</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批结果</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批意见</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedList.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{item.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.submitter}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.submitTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.approveTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.resultClass === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px] truncate">{item.opinion}</td>
                  <td className="px-4 py-3">
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
          <div className="text-sm text-gray-500">
            共 {filteredList.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(totalPages)].map((_, i) => (
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
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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
