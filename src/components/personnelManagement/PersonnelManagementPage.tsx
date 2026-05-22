/**
 * 人事管理聚合页面
 * 从组件化版本重新导出
 */
import { Users, Search, Plus, Edit, Trash2, ChevronLeft, UserPlus, Briefcase, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '../ui/button';

const personnelData = [
  { id: 1, employeeId: 'EMP001', name: '张伟民', gender: '男', age: 35, phone: '138****1234', dept: '生产部', position: '生产主管', status: '在职', statusClass: 'normal' },
  { id: 2, employeeId: 'EMP002', name: '李明轩', gender: '男', age: 28, phone: '139****5678', dept: '技术部', position: '技术员', status: '在职', statusClass: 'normal' },
  { id: 3, employeeId: 'EMP003', name: '王建国', gender: '男', age: 42, phone: '137****9012', dept: '生产部', position: '高级技工', status: '在职', statusClass: 'normal' },
  { id: 4, employeeId: 'EMP004', name: '赵俊杰', gender: '男', age: 26, phone: '136****3456', dept: '技术部', position: '技术员', status: '在职', statusClass: 'normal' },
  { id: 5, employeeId: 'EMP005', name: '钱文涛', gender: '男', age: 32, phone: '135****7890', dept: '生产部', position: '组长', status: '在职', statusClass: 'normal' },
];

export function PersonnelManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('全部');

  const filteredData = personnelData.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.employeeId.includes(searchTerm);
    const matchDept = deptFilter === '全部' || item.dept === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">人事管理</h1>
            <p className="text-gray-500">员工信息管理与组织架构</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{personnelData.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{personnelData.filter(p => p.status === '在职').length}</p>
              <p className="text-xs text-gray-500">在职人数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{[...new Set(personnelData.map(p => p.dept))].length}</p>
              <p className="text-xs text-gray-500">部门数量</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500">本月入职</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/settings/personnel/position" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">职务管理</span>
        </Link>
        <Link to="/settings/personnel/attendance" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">员工考勤</span>
        </Link>
        <Link to="/settings/personnel/approval" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <span className="text-amber-600 text-lg">✓</span>
          </div>
          <span className="text-sm font-medium text-gray-700">HR审批</span>
        </Link>
        <Link to="/settings/personnel/approval-documents" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <span className="text-purple-600 text-lg">!</span>
          </div>
          <span className="text-sm font-medium text-gray-700">考勤单据</span>
        </Link>
      </div>

      {/* 搜索筛选 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索员工</label>
            <input
              type="text"
              placeholder="搜索姓名、工号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
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
          <div className="flex gap-2">
            <Button variant="default">
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button variant="default">
              <UserPlus className="w-4 h-4" />
              新增员工
            </Button>
          </div>
        </div>
      </div>

      {/* 员工列表 */}
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">联系电话</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">岗位</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{person.employeeId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{person.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{person.gender}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{person.age}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{person.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{person.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{person.position}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      person.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {person.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PersonnelManagementPage;
