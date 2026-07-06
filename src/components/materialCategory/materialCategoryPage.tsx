import { useEffect, useMemo, useState } from 'react';
import { Edit, Eye, Plus, RotateCcw, Search, Tags } from 'lucide-react';
import { Button, Pagination } from '@/components/ui';
import { useMaterialCodeRuleStore } from '@/stores/useMaterialCodeRuleStore';

export interface MaterialCategory {
  id: string;
  code: string;
  name: string;
  level: string;
  parent: string;
  prefix: string;
  itemCount: number;
  description: string;
}

export function MaterialCategoryPage() {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // V2.1 铁律：分类数据必须从 API 走，禁止硬编码 mock
  const categories = useMaterialCodeRuleStore((s) => s.categories);
  const isLoading = useMaterialCodeRuleStore((s) => s.isLoading);
  const loadCategories = useMaterialCodeRuleStore((s) => s.loadCategories);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 把树形结构拍平成列表展示：每行展示一级（big/mid/sub），父级显示完整路径
  const flatCategories: MaterialCategory[] = useMemo(() => {
    const rows: MaterialCategory[] = [];
    for (const big of categories) {
      rows.push({
        id: big.code,
        code: big.code,
        name: big.name,
        level: '大类',
        parent: '-',
        prefix: big.code,
        itemCount: big.midCategories.length,
        description: big.nameEn || '',
      });
      for (const mid of big.midCategories) {
        const parentKey = big.code + mid.code;
        rows.push({
          id: parentKey,
          code: mid.code,
          name: mid.name,
          level: '中类',
          parent: `${big.code} ${big.name}`,
          prefix: parentKey,
          itemCount: mid.subCategories.length,
          description: '',
        });
        for (const sub of mid.subCategories) {
          rows.push({
            id: parentKey + sub.code,
            code: sub.code,
            name: sub.name,
            level: '小类',
            parent: `${parentKey} ${mid.name}`,
            prefix: parentKey + sub.code,
            itemCount: 0,
            description: '',
          });
        }
      }
    }
    return rows;
  }, [categories]);

  // 客户端筛选（保留原有交互）
  const filtered = useMemo(() => {
    return flatCategories.filter((c) => {
      if (name && !c.name.includes(name)) return false;
      if (level !== '全部' && c.level !== level) return false;
      return true;
    });
  }, [flatCategories, name, level]);

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
            <Button variant="warning" onClick={() => { setName(''); setLevel('全部'); }}>
              <RotateCcw className="w-4 h-4" /> 重置
            </Button>
            <Button onClick={() => { setCurrentPage(1); }}>
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
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">包含子项数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {isLoading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">加载中...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">暂无数据</td>
                </tr>
              ) : (
                filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((category) => (
                  <tr key={category.id} className="hover:bg-blue-100 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{category.code}</td>
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
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{category.prefix}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{category.itemCount}</td>
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
                ))
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / pageSize) || 1}
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