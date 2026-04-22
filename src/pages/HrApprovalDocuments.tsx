import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, Plus, Edit, Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const hrDocuments = [
  { id: 1, code: 'DOC20240315', type: '补签卡', applicant: '李明轩', dept: '生产部', applyDate: '2024-03-15', targetTime: '2024-03-15 08:15', reason: '上班途中遇到交通事故', status: '待审批', statusClass: 'pending' },
  { id: 2, code: 'DOC20240314', type: '请假条', applicant: '张伟民', dept: '生产部', applyDate: '2024-03-14', targetTime: '2024-03-18 至 2024-03-20', reason: '家中急事需要处理', status: '已通过', statusClass: 'success' },
  { id: 3, code: 'DOC20240313', type: '加班单', applicant: '王建国', dept: '技术部', applyDate: '2024-03-13', targetTime: '2024-03-14 18:00-21:00', reason: '完成技术方案文档', status: '已通过', statusClass: 'success' },
  { id: 4, code: 'DOC20240312', type: '出差单', applicant: '赵俊杰', dept: '技术部', applyDate: '2024-03-12', targetTime: '2024-03-20 至 2024-03-22', reason: '参加农业技术交流会', status: '已拒绝', statusClass: 'danger' },
  { id: 5, code: 'DOC20240311', type: '补签卡', applicant: '钱文涛', dept: '生产部', applyDate: '2024-03-11', targetTime: '2024-03-11 09:00', reason: '突发身体不适迟到', status: '已通过', statusClass: 'success' },
];

export default function HrApprovalDocuments() {
  const [typeFilter, setTypeFilter] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(hrDocuments.length / pageSize);
  const paginatedDocuments = hrDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings/personnel" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">考勤单据</h1>
            <p className="text-gray-500">考勤异常单据与补录申请</p>
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
              <p className="text-2xl font-bold text-gray-900">{hrDocuments.filter(d => d.status === '待审批').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{hrDocuments.filter(d => d.status === '已通过').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{hrDocuments.filter(d => d.status === '已拒绝').length}</p>
              <p className="text-xs text-gray-500">已拒绝</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">单据类型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>补签卡</option>
              <option>请假条</option>
              <option>加班单</option>
              <option>出差单</option>
            </select>
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
              <option>已拒绝</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新增单据
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">考勤单据列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单据编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单据类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">所属部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">补录时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">补录原因</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.applicant}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.applyDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.targetTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{doc.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      doc.statusClass === 'success' ? 'bg-green-100 text-green-700' :
                      doc.statusClass === 'danger' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
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
          <div className="text-sm text-gray-500">
            共 {hrDocuments.length} 条记录，第 {currentPage}/{totalPages} 页
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
