import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Edit, Trash2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/Pagination';

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
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredStaff = staffData.filter(staff => {
    const matchSearch = hasSearched && (staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || staff.workerId.includes(searchTerm));
    const matchDept = deptFilter === '全部' || staff.dept === deptFilter;
    return matchSearch && matchDept;
  });

  const handleSearch = () => {
    setHasSearched(true);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredStaff.length / pageSize);
  const paginatedStaff = filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
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
            <Button variant="default" onClick={handleSearch}>
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button variant="default">
              <Plus className="w-4 h-4" />
              添加人员
            </Button>
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
                      <Button size="icon" variant="ghost" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="destructive" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">共 {filteredStaff.length} 条记录</div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[5, 10, 20, 50]}
            showPageSize
          />
        </div>
      </div>
    </div>
  );
}
