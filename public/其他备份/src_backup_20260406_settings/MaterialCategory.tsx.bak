import { useState } from 'react';
import { Tags, Plus, Search, Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

const materialCategories = [
  { id: 1, code: 'M001', name: '种子种苗', level: '大类', parent: '-', prefix: 'ZZ', itemCount: 25, description: '各类农作物种子' },
  { id: 2, code: 'M002', name: '肥料', level: '大类', parent: '-', prefix: 'FL', itemCount: 45, description: '化肥、有机肥等' },
  { id: 3, code: 'M003', name: '农药', level: '大类', parent: '-', prefix: 'NJ', itemCount: 68, description: '杀虫剂、杀菌剂等' },
  { id: 4, code: 'M004', name: '农膜', level: '大类', parent: '-', prefix: 'NM', itemCount: 15, description: '大棚膜、地膜等' },
  { id: 5, code: 'M005', name: '包装材料', level: '大类', parent: '-', prefix: 'BZ', itemCount: 32, description: '包装箱、标签等' },
];

export default function MaterialCategory() {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Tags className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">物资分类管理</h1>
            <p className="text-gray-500">物资分类体系与编码规则</p>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入分类名称"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">级别</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>大类</option>
              <option>中类</option>
              <option>小类</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              重置
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新增分类
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">物资分类列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">分类编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">分类名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">级别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">父级分类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物资编码前缀</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">包含物资数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">备注</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materialCategories.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{category.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{category.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      category.level === '大类' ? 'bg-green-100 text-green-700' :
                      category.level === '中类' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {category.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{category.parent}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{category.prefix}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{category.itemCount}种</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{category.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">每页</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-200 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-500">条</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">共 {materialCategories.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(materialCategories.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(materialCategories.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(materialCategories.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
