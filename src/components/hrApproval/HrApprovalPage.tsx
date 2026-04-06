import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Calendar, Clock, CheckCircle, XCircle, Eye, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';

const leaveApprovals = [
  { id: 1, code: 'HR20240315', applicant: '张伟民', dept: '生产部', type: '请假', applyTime: '2024-03-14 10:30', startDate: '2024-03-18', endDate: '2024-03-20', days: 3, reason: '家中急事需要处理', status: '待审批', statusClass: 'pending' },
  { id: 2, code: 'HR20240312', applicant: '李明轩', dept: '技术部', type: '请假', applyTime: '2024-03-12 09:15', startDate: '2024-03-15', endDate: '2024-03-16', days: 2, reason: '身体不适需要休息', status: '已通过', statusClass: 'success' },
  { id: 3, code: 'HR20240308', applicant: '王建国', dept: '生产部', type: '请假', applyTime: '2024-03-08 14:20', startDate: '2024-03-10', endDate: '2024-03-10', days: 1, reason: '个人事务', status: '已通过', statusClass: 'success' },
];

const overtimeApprovals = [
  { id: 1, code: 'OT20240316', applicant: '赵俊杰', dept: '生产部', type: '加班', applyTime: '2024-03-14 17:00', date: '2024-03-15', hours: 3, reason: '棚内温度调控需要夜间值守', status: '待审批', statusClass: 'pending' },
  { id: 2, code: 'OT20240314', applicant: '钱文涛', dept: '技术部', type: '加班', applyTime: '2024-03-13 16:30', date: '2024-03-14', hours: 2, reason: '完成技术方案文档', status: '已通过', statusClass: 'success' },
];

const transferApprovals = [
  { id: 1, code: 'TR20240310', applicant: '孙晓峰', dept: '生产部', currentPosition: '普工', targetPosition: '组长', applyTime: '2024-03-10 11:00', reason: '工作表现优秀，晋升为组长', status: '待审批', statusClass: 'pending' },
];

const resignApprovals = [
  { id: 1, code: 'RS20240318', applicant: '周志强', dept: '生产部', position: '普工', applyTime: '2024-03-15 10:00', resignDate: '2024-03-31', reason: '个人发展原因', status: '待审批', statusClass: 'pending' },
  { id: 2, code: 'RS20240305', applicant: '吴海龙', dept: '技术部', position: '技术员', applyTime: '2024-03-05 15:30', resignDate: '2024-03-20', reason: '回家发展', status: '已通过', statusClass: 'success' },
];

export function HrApprovalPage() {
  const [activeTab, setActiveTab] = useState<'leave' | 'overtime' | 'transfer' | 'resign'>('leave');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const getCurrentData = () => {
    switch (activeTab) {
      case 'leave': return leaveApprovals;
      case 'overtime': return overtimeApprovals;
      case 'transfer': return transferApprovals;
      case 'resign': return resignApprovals;
      default: return [];
    }
  };

  const data = getCurrentData();
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tabs = [
    { key: 'leave', label: '请假审批', icon: Calendar },
    { key: 'overtime', label: '加班审批', icon: Clock },
    { key: 'transfer', label: '调岗审批', icon: Users },
    { key: 'resign', label: '离职审批', icon: XCircle },
  ] as const;

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
              <p className="text-2xl font-bold text-gray-900">
                {leaveApprovals.filter(a => a.status === '待审批').length + overtimeApprovals.filter(a => a.status === '待审批').length + transferApprovals.filter(a => a.status === '待审批').length + resignApprovals.filter(a => a.status === '待审批').length}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">
                {leaveApprovals.filter(a => a.status === '已通过').length + overtimeApprovals.filter(a => a.status === '已通过').length + transferApprovals.filter(a => a.status === '已通过').length + resignApprovals.filter(a => a.status === '已通过').length}
              </p>
              <p className="text-xs text-gray-500">已通过</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === tab.key ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
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
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
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
          <h3 className="text-lg font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
                {activeTab === 'leave' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">请假时间</th>}
                {activeTab === 'leave' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">天数</th>}
                {activeTab === 'overtime' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">加班日期</th>}
                {activeTab === 'overtime' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">时长</th>}
                {activeTab === 'transfer' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">现岗位</th>}
                {activeTab === 'transfer' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">目标岗位</th>}
                {activeTab === 'resign' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">岗位</th>}
                {activeTab === 'resign' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">离职日期</th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">原因</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.applicant}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.dept}</td>
                  {activeTab === 'leave' && <td className="px-4 py-3 text-sm text-gray-600">{item.startDate} 至 {item.endDate}</td>}
                  {activeTab === 'leave' && <td className="px-4 py-3 text-sm text-gray-600">{item.days}天</td>}
                  {activeTab === 'overtime' && <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>}
                  {activeTab === 'overtime' && <td className="px-4 py-3 text-sm text-gray-600">{item.hours}小时</td>}
                  {activeTab === 'transfer' && <td className="px-4 py-3 text-sm text-gray-600">{item.currentPosition}</td>}
                  {activeTab === 'transfer' && <td className="px-4 py-3 text-sm text-gray-600">{item.targetPosition}</td>}
                  {activeTab === 'resign' && <td className="px-4 py-3 text-sm text-gray-600">{item.position}</td>}
                  {activeTab === 'resign' && <td className="px-4 py-3 text-sm text-gray-600">{item.resignDate}</td>}
                  <td className="px-4 py-3 text-sm text-gray-600">{item.applyTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.statusClass === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {item.status === '待审批' && (
                        <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="审批">
                          <ClipboardCheck className="w-4 h-4" />
                        </button>
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
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {data.length} 条记录，第 {currentPage}/{totalPages} 页
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

export default HrApprovalPage;
