import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

const positionData = [
  { id: 1, code: 'P001', name: '生产主管', category: '管理岗', dept: '生产部', level: '高级', count: 1, status: '启用', statusClass: 'normal' },
  { id: 2, code: 'P002', name: '技术员', category: '技术岗', dept: '技术部', level: '中级', count: 3, status: '启用', statusClass: 'normal' },
  { id: 3, code: 'P003', name: '高级技工', category: '技术岗', dept: '生产部', level: '高级', count: 5, status: '启用', statusClass: 'normal' },
  { id: 4, code: 'P004', name: '组长', category: '管理岗', dept: '生产部', level: '中级', count: 4, status: '启用', statusClass: 'normal' },
  { id: 5, code: 'P005', name: '普工', category: '操作岗', dept: '生产部', level: '初级', count: 20, status: '启用', statusClass: 'normal' },
  { id: 6, code: 'P006', name: '后勤主管', category: '管理岗', dept: '后勤部', level: '中级', count: 1, status: '停用', statusClass: 'warning' },
];

export function PositionManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredPositions = positionData.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.includes(searchTerm);
    const matchCategory = categoryFilter === '全部' || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filteredPositions.length / pageSize);
  const paginatedPositions = filteredPositions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <Link to="/settings/personnel" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">职务管理</h1>
            <p className="text-gray-500">公司职务体系与岗位设置</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positionData.length}</p>
              <p className="text-xs text-gray-500">岗位总数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positionData.filter(p => p.status === '启用').length}</p>
              <p className="text-xs text-gray-500">启用岗位</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <span className="text-purple-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positionData.reduce((sum, p) => sum + p.count, 0)}</p>
              <p className="text-xs text-gray-500">在职人数</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">岗位名称</label>
            <input
              type="text"
              placeholder="搜索岗位名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>管理岗</option>
              <option>技术岗</option>
              <option>操作岗</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加岗位
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">岗位列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">岗位编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">岗位名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">类别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">所属部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">职级</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">编制人数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPositions.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.level}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.count}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
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
          <div className="text-sm text-gray-500">共 {filteredPositions.length} 条记录</div>
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

export default PositionManagementPage;
