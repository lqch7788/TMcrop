// 物料管理表格组件
import { Eye, Edit, Download } from 'lucide-react';
import { Button } from '../ui/button';

interface MaterialsTableProps {
  filteredMaterials: Array<{
    id: number;
    code: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    minStock: number;
    price: string;
    supplier: string;
    location: string;
  }>;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // 导出模式
  exportMode: boolean;
  selectedRows: number[];
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
}

export default function MaterialsTable({
  filteredMaterials,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  exportMode,
  selectedRows,
  onSelectAll,
  onSelectRow,
}: MaterialsTableProps) {
  const totalPages = Math.ceil(filteredMaterials.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredMaterials.length);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredMaterials.length && filteredMaterials.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">分类</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">单位</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">最低库存</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">单价</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">存放位置</th>
              {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {filteredMaterials.slice(startIdx, endIdx).map((item) => (
              <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                {exportMode && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => onSelectRow(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`font-medium ${item.quantity < item.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.minStock}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.price}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.supplier}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
                {!exportMode && (
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
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 导出模式底部栏 */}
        {exportMode && selectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onSelectAll}>
                {selectedRows.length === filteredMaterials.length ? '全不选' : '全选'}
              </Button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {filteredMaterials.length} 条</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
