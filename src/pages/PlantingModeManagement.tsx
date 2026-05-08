import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDictionaries } from '../components/common/settings/SettingsDataProvider';
import { Button } from '../components/ui/button';

export default function PlantingModeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // 从 SettingsDataProvider 获取种植模式字典数据
  const { getDictItems } = useDictionaries();
  const plantModes = useMemo(() => {
    const modes = getDictItems('planting_mode');
    // 转换为页面所需的格式
    return modes.map((mode, index) => ({
      id: index + 1,
      code: mode.code,
      name: mode.name,
      type: mode.category || '种植模式',
      crops: '-',
      tempRange: '-',
      humidityRange: '-',
      lightRequirement: '-',
      greenhouses: '-',
      status: mode.status === 'active' ? '启用中' : '停用',
      statusClass: mode.status === 'active' ? 'normal' : 'disabled',
    }));
  }, [getDictItems]);

  const filteredModes = useMemo(() => {
    return plantModes.filter(mode => {
      const matchSearch = mode.name.toLowerCase().includes(searchTerm.toLowerCase()) || mode.code.includes(searchTerm);
      const matchStatus = statusFilter === '全部' || mode.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [plantModes, searchTerm, statusFilter]);

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
            <Button variant="default">
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button variant="default">
              <Plus className="w-4 h-4" />
              新增模式
            </Button>
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
          <div className="text-sm text-gray-500">
            共 {filteredModes.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
