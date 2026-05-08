import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, Plus, Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

export interface PlantArea {
  id: number;
  code: string;
  name: string;
  type: string;
  area: number;
  currentCrop: string;
  mode: string;
  manager: string;
  status: string;
  statusClass: string;
}

const plantAreas: PlantArea[] = [
  { id: 1, code: 'A001', name: '1号棚', type: '温室大棚', area: 1500, currentCrop: '番茄', mode: '春季番茄高产模式', manager: '张伟民', status: '使用中', statusClass: 'normal' },
  { id: 2, code: 'A002', name: '2号棚', type: '温室大棚', area: 1200, currentCrop: '黄瓜', mode: '夏季黄瓜耐热模式', manager: '李明轩', status: '使用中', statusClass: 'normal' },
  { id: 3, code: 'A003', name: '3号棚', type: '温室大棚', area: 1800, currentCrop: '草莓', mode: '冬季草莓促成模式', manager: '王建国', status: '空闲', statusClass: 'info' },
  { id: 4, code: 'A004', name: '4号棚', type: '温室大棚', area: 1000, currentCrop: '-', mode: '-', manager: '-', status: '维护中', statusClass: 'warning' },
  { id: 5, code: 'A005', name: '5号棚', type: '温室大棚', area: 1600, currentCrop: '辣椒', mode: '辣椒越夏栽培模式', manager: '赵俊杰', status: '使用中', statusClass: 'normal' },
];

export function PlantAreaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredAreas = plantAreas.filter(area => {
    const matchSearch = area.name.toLowerCase().includes(searchTerm.toLowerCase()) || area.code.includes(searchTerm);
    const matchStatus = statusFilter === '全部' || area.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredAreas.length / pageSize);
  const paginatedAreas = filteredAreas.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">种植区域管理</h1>
            <p className="text-gray-500">大棚与种植区域的基础信息管理</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{plantAreas.length}</p>
              <p className="text-xs text-gray-500">区域总数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{plantAreas.filter(a => a.status === '使用中').length}</p>
              <p className="text-xs text-gray-500">使用中</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{plantAreas.filter(a => a.status === '维护中').length}</p>
              <p className="text-xs text-gray-500">维护中</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{plantAreas.filter(a => a.status === '空闲').length}</p>
              <p className="text-xs text-gray-500">空闲</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">区域名称</label>
            <input
              type="text"
              placeholder="搜索区域名称..."
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
              <option>使用中</option>
              <option>空闲</option>
              <option>维护中</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="default">
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button variant="default">
              <Plus className="w-4 h-4" />
              新增区域
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">种植区域列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">区域编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">区域名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">区域类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">面积(㎡)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">当前作物</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">种植模式</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">负责人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedAreas.map((area) => (
                <tr key={area.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{area.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{area.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{area.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{area.area}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{area.currentCrop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{area.mode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{area.manager}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      area.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      area.statusClass === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {area.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="查看">
                        <Eye className="w-4 h-4" />
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
            共 {filteredAreas.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                size="sm"
              >
                {i + 1}
              </Button>
            ))}
            <Button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              variant="ghost"
              size="icon"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlantAreaPage;
