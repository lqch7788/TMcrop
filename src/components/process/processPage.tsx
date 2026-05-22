import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

export interface Process {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
  bonus: number;
  status: string;
  statusClass: string;
}

const processData: Process[] = [
  { id: 1, code: 'P001', name: '整地', unit: '亩', price: 150, bonus: 10, status: '启用', statusClass: 'normal' },
  { id: 2, code: 'P002', name: '播种', unit: '亩', price: 200, bonus: 15, status: '启用', statusClass: 'normal' },
  { id: 3, code: 'P003', name: '浇水', unit: '亩', price: 80, bonus: 5, status: '启用', statusClass: 'normal' },
  { id: 4, code: 'P004', name: '施肥', unit: '亩', price: 120, bonus: 8, status: '启用', statusClass: 'normal' },
  { id: 5, code: 'P005', name: '病虫害防治', unit: '亩', price: 180, bonus: 12, status: '启用', statusClass: 'normal' },
  { id: 6, code: 'P006', name: '搭架', unit: '亩', price: 250, bonus: 15, status: '停用', statusClass: 'disabled' },
  { id: 7, code: 'P007', name: '修剪', unit: '亩', price: 160, bonus: 10, status: '启用', statusClass: 'normal' },
  { id: 8, code: 'P008', name: '采收', unit: '亩', price: 300, bonus: 20, status: '启用', statusClass: 'normal' },
];

export function ProcessPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(processData.length / pageSize);
  const paginatedData = processData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <ScrollText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工序管理</h1>
            <p className="text-gray-500">自定义生产工序及单价设置</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{processData.length}</p>
              <p className="text-xs text-gray-500">工序总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{processData.filter(p => p.status === '启用').length}</p>
              <p className="text-xs text-gray-500">启用中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{processData.filter(p => p.status === '停用').length}</p>
              <p className="text-xs text-gray-500">停用</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-end">
          <Button variant="default">
            <Plus className="w-4 h-4" />
            添加工序
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">工序列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工序编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工序名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">对应单位</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工序单价(元)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">奖励比例(%)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((proc) => (
                <tr key={proc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{proc.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{proc.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{proc.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{proc.price}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{proc.bonus}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      proc.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {proc.status}
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
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {processData.length} 条记录，第 {currentPage}/{totalPages} 页
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

export default ProcessPage;
