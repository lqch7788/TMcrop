import { useState } from 'react';
import { Edit, Eye, Plus, RotateCcw, Search, Tags } from 'lucide-react';
import { Button } from '@/components/ui';
import { Pagination } from '@/components/ui';

export interface MaterialCategory {
  id: number;
  code: string;
  name: string;
  level: string;
  parent: string;
  prefix: string;
  itemCount: number;
  description: string;
}

const materialCategories: MaterialCategory[] = [
  { id: 1, code: 'M001', name: '种子种苗', level: '大类', parent: '-', prefix: 'ZZ', itemCount: 25, description: '各类农作物种子' },
  { id: 2, code: 'M002', name: '肥料', level: '大类', parent: '-', prefix: 'FL', itemCount: 45, description: '化肥、有机肥等' },
  { id: 3, code: 'M003', name: '农药', level: '大类', parent: '-', prefix: 'NJ', itemCount: 68, description: '杀虫剂、杀菌剂等' },
  { id: 4, code: 'M004', name: '农膜', level: '大类', parent: '-', prefix: 'NM', itemCount: 15, description: '大棚膜、地膜等' },
  { id: 5, code: 'M005', name: '包装材料', level: '大类', parent: '-', prefix: 'BZ', itemCount: 32, description: '包装箱、标签等' },
];

export function MaterialCategoryPage() {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
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
            <Button variant="secondary"><RotateCcw className="w-4 h-4" /> 重置</Button>
            <Button>
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button>
              <Plus className="w-4 h-4" />
              新增分类
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">物资分类列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">分类编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">分类名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">级别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">父级分类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物资编码前缀</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">包含物资数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {materialCategories.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((category) => (
                <tr key={category.id} className="hover:bg-blue-100 transition-colors">
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
                      <Button variant="ghost" size="icon" title="查看">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* 分页 */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(materialCategories.length / pageSize) || 1}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              pageSizeOptions={[10, 20, 50]}
              showPageSize
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaterialCategoryPage;
