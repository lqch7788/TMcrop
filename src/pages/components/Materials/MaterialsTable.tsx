/**
 * 仓库物料表格组件
 * 显示物料库存列表
 */
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Pagination } from '@/components/ui/Pagination';
import type { Material } from '../../types/materials.types';

interface MaterialsTableProps {
  filteredMaterials: Material[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
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
  const totalPages = Math.ceil(filteredMaterials.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMaterials = filteredMaterials.slice(startIndex, startIndex + pageSize);

  return (
    <>
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-3 py-3 text-left text-sm font-semibold w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedMaterials.length && paginatedMaterials.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-white text-emerald-600"
                  />
                </th>
              )}
              <th className="px-3 py-3 text-left text-sm font-semibold">物料编号</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">物料名称</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">分类</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">单位</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">库存数量</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">最低库存</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">单价</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">供应商</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">存放位置</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedMaterials.map((material) => (
              <tr
                key={material.id}
                className={`hover:bg-emerald-50 transition-all ${
                  exportMode && selectedRows.includes(material.id) ? 'bg-emerald-50' : ''
                }`}
              >
                {exportMode && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(material.id)}
                      onChange={() => onSelectRow(material.id)}
                      className="w-4 h-4 rounded border-gray-400 text-emerald-600"
                    />
                  </td>
                )}
                <td className="px-3 py-3 text-sm text-gray-600 font-mono">{material.code}</td>
                <td className="px-3 py-3 text-sm font-medium text-gray-900">{material.name}</td>
                <td className="px-3 py-3 text-sm text-gray-600">{material.category}</td>
                <td className="px-3 py-3 text-sm text-gray-600">{material.unit}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${material.quantity < material.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {material.quantity}
                    </span>
                    {material.quantity < material.minStock && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-600">{material.minStock}</td>
                <td className="px-3 py-3 text-sm text-gray-600">{material.price}</td>
                <td className="px-3 py-3 text-sm text-gray-600">{material.supplier}</td>
                <td className="px-3 py-3 text-sm text-gray-600">{material.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMaterials.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {filteredMaterials.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            showPageSize={true}
          />
        </div>
      )}
    </>
  );
}
