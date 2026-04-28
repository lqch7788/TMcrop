import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const cropData = [
  { id: 1, code: 'C001', type: '番茄', name: '红果番茄', desc: '常规红果品种，口感好', cycle: 120, status: '启用', statusClass: 'normal' },
  { id: 2, code: 'C002', type: '番茄', name: '樱桃番茄', desc: '小型果，甜度高', cycle: 90, status: '启用', statusClass: 'normal' },
  { id: 3, code: 'C003', type: '黄瓜', name: '水果黄瓜', desc: '无刺黄瓜，口感脆甜', cycle: 60, status: '启用', statusClass: 'normal' },
  { id: 4, code: 'C004', type: '黄瓜', name: '刺黄瓜', desc: '常规品种，产量高', cycle: 70, status: '停用', statusClass: 'disabled' },
  { id: 5, code: 'C005', type: '草莓', name: '红颜', desc: '日本品种，果实大', cycle: 180, status: '启用', statusClass: 'normal' },
  { id: 6, code: 'C006', type: '草莓', name: '章姬', desc: '口感香甜，果实较软', cycle: 150, status: '草稿', statusClass: 'draft' },
  { id: 7, code: 'C007', type: '辣椒', name: '线椒', desc: '细长型，辣味浓', cycle: 90, status: '启用', statusClass: 'normal' },
  { id: 8, code: 'C008', type: '辣椒', name: '螺丝椒', desc: '皱皮椒，风味独特', cycle: 100, status: '启用', statusClass: 'normal' },
];

export default function CropManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredCrops = cropData.filter(crop => {
    const matchSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) || crop.code.includes(searchTerm);
    const matchType = typeFilter === '全部' || crop.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil(filteredCrops.length / pageSize);
  const paginatedCrops = filteredCrops.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">作物管理</h1>
            <p className="text-gray-500">作物品种的添加、修改、删除</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cropData.length}</p>
              <p className="text-xs text-gray-500">作物品种</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cropData.filter(c => c.status === '启用').length}</p>
              <p className="text-xs text-gray-500">启用中</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cropData.filter(c => c.status === '停用').length}</p>
              <p className="text-xs text-gray-500">停用</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cropData.filter(c => c.status === '草稿').length}</p>
              <p className="text-xs text-gray-500">草稿</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">作物品种</label>
            <input
              type="text"
              placeholder="搜索作物品种..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">作物种类</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>番茄</option>
              <option>黄瓜</option>
              <option>草莓</option>
              <option>辣椒</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加作物
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">作物品种列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物种类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">品种名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">品种描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生长周期(天)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCrops.map((crop) => (
                <tr key={crop.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{crop.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{crop.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{crop.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{crop.desc}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{crop.cycle}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      crop.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      crop.statusClass === 'disabled' ? 'bg-gray-100 text-gray-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {crop.status}
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
            共 {filteredCrops.length} 条记录，第 {currentPage}/{totalPages} 页
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
