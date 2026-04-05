import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const staffData = [
  { id: 1, workerId: 'A001', name: '张伟民', gender: '男', age: 35, dept: '生产部', position: '普工', phone: '138****1234', status: '在职', statusClass: 'normal' },
  { id: 2, workerId: 'A002', name: '李明轩', gender: '女', age: 28, dept: '技术部', position: '技术员', phone: '139****5678', status: '在职', statusClass: 'normal' },
  { id: 3, workerId: 'A003', name: '王建国', gender: '男', age: 42, dept: '生产部', position: '生产主管', phone: '136****9012', status: '在职', statusClass: 'normal' },
  { id: 4, workerId: 'A004', name: '赵俊杰', gender: '女', age: 30, dept: '技术部', position: '技术员', phone: '137****3456', status: '在职', statusClass: 'normal' },
  { id: 5, workerId: 'A005', name: '钱文涛', gender: '男', age: 25, dept: '生产部', position: '普工', phone: '135****7890', status: '在职', statusClass: 'normal' },
  { id: 6, workerId: 'A006', name: '孙晓峰', gender: '女', age: 33, dept: '后勤部', position: '仓库管理员', phone: '134****2345', status: '在职', statusClass: 'normal' },
];

export default function StaffManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredStaff = staffData.filter(staff => {
    const matchSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || staff.workerId.includes(searchTerm);
    const matchDept = deptFilter === '全部' || staff.dept === deptFilter;
    return matchSearch && matchDept;
  });

  const totalPages = Math.ceil(filteredStaff.length / pageSize);
  const paginatedStaff = filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            <h1 className="text-2xl font-bold text-gray-900">人员管理</h1>
            <p className="text-gray-500">园区员工信息管理</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{staffData.length}</p>
              <p className="text-xs text-gray-500">员工总数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{staffData.filter(s => s.status === '在职').length}</p>
              <p className="text-xs text-gray-500">在职</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>生产部</option>
              <option>技术部</option>
              <option>后勤部</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名/工号</label>
            <input
              type="text"
              placeholder="搜索姓名或工号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加人员
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">员工列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">性别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">年龄</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">职务</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">手机号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{staff.workerId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{staff.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{staff.gender}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{staff.age}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{staff.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{staff.position}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{staff.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      staff.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                        <Trash2 className="w-4 h-4" />
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
            共 {filteredStaff.length} 条记录，第 {currentPage}/{totalPages} 页
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
