import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface PlantMode {
  id: number;
  code: string;
  name: string;
  type: string;
  crops: string;
  tempRange: string;
  humidityRange: string;
  lightRequirement: string;
  greenhouses: string;
  status: string;
  statusClass: string;
}

const plantModes: PlantMode[] = [
  { id: 1, code: 'PM001', name: '春季番茄高产模式', type: '季节性模式', crops: '番茄', tempRange: '20-28', humidityRange: '60-75', lightRequirement: '中等', greenhouses: '1号棚,2号棚', status: '启用中', statusClass: 'normal' },
  { id: 2, code: 'PM002', name: '夏季黄瓜耐热模式', type: '季节性模式', crops: '黄瓜', tempRange: '25-32', humidityRange: '70-85', lightRequirement: '高', greenhouses: '3号棚', status: '启用中', statusClass: 'normal' },
  { id: 3, code: 'PM003', name: '冬季草莓促成模式', type: '季节性模式', crops: '草莓', tempRange: '15-22', humidityRange: '65-80', lightRequirement: '低', greenhouses: '4号棚,5号棚', status: '停用', statusClass: 'disabled' },
  { id: 4, code: 'PM004', name: '辣椒越夏栽培模式', type: '越夏模式', crops: '辣椒', tempRange: '22-30', humidityRange: '55-70', lightRequirement: '高', greenhouses: '-', status: '草稿', statusClass: 'draft' },
  { id: 5, code: 'PM005', name: '叶菜类快菜模式', type: '速生模式', crops: '生菜,小白菜', tempRange: '18-25', humidityRange: '70-85', lightRequirement: '中', greenhouses: '6号棚', status: '启用中', statusClass: 'normal' },
];

export function PlantingModePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredModes = plantModes.filter(mode => {
    const matchSearch = mode.name.toLowerCase().includes(searchTerm.toLowerCase()) || mode.code.includes(searchTerm);
    const matchStatus = statusFilter === '全部' || mode.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredModes.length / pageSize);
  const paginatedModes = filteredModes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">种植模式管理</h1>
            <p className="text-gray-500">温室种植模式配置与管理</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{plantModes.length}</p>
              <p className="text-xs text-gray-500">种植模式</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{plantModes.filter(m => m.status === '启用中').length}</p>
              <p className="text-xs text-gray-500">启用中</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{plantModes.filter(m => m.status === '停用' || m.status === '草稿').length}</p>
              <p className="text-xs text-gray-500">未启用</p>
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
              placeholder="搜索模式名称、编号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>启用中</option>
              <option>停用</option>
              <option>草稿</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新增模式
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">种植模式列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">模式编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">模式名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">模式类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">适用作物</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">温度范围(°C)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">湿度范围(%)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">光照要求</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">关联大棚</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedModes.map((mode) => (
                <tr key={mode.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{mode.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mode.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mode.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mode.crops}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mode.tempRange}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mode.humidityRange}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mode.lightRequirement}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mode.greenhouses}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      mode.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      mode.statusClass === 'disabled' ? 'bg-gray-100 text-gray-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {mode.status}
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
            共 {filteredModes.length} 条记录，第 {currentPage}/{totalPages} 页
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

export default PlantingModePage;
