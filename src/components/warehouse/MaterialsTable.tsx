import { ChevronLeft, ChevronRight, Eye, Edit, Trash2 } from 'lucide-react';
import { Material } from './MaterialFilters';
import { Button } from '../ui/button';

interface MaterialsTableProps {
  materials: Material[];
  currentPage: number;
  pageSize: number;
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  deleteMode: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onView: (material: Material) => void;
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
  onCancelSelection: () => void;
  onConfirmExport: () => void;
  // 权限控制 props
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

export function MaterialsTable({
  materials,
  currentPage,
  pageSize,
  selectedRows,
  exportMode,
  batchEditMode,
  deleteMode,
  onPageChange,
  onPageSizeChange,
  onSelectAll,
  onSelectRow,
  onView,
  onEdit,
  onDelete,
  onCancelSelection,
  onConfirmExport,
  // 权限控制 props - 默认为 true 以兼容无权限配置的情况
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
}: MaterialsTableProps) {
  const totalPages = Math.ceil(materials.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, materials.length);
  const displayedMaterials = materials.slice(startIdx, endIdx);

  const isAllSelected = materials.length > 0 && selectedRows.length === materials.length;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ maxHeight: 'calc(100vh - 400px)', display: 'flex', flexDirection: 'column' }}>
      {/* 操作栏 - 编辑/删除/导出模式下显示 */}
      {(exportMode || batchEditMode || deleteMode) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-emerald-600 hover:text-emerald-700 p-0 h-auto">
              {isAllSelected ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <table className="w-full" style={{ minWidth: '1500px', tableLayout: 'fixed' }}>
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {(exportMode || batchEditMode || deleteMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">物料编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">物料名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-40">分类</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">规格型号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">条形码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-16">单位</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">库存数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">最低库存</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">最高库存</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">单价（元）</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">存放位置</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">批次号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">生产日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">有效期至</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">最后更新时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">数据状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {displayedMaterials.map((item) => (
              <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                {(exportMode || batchEditMode || deleteMode) && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => onSelectRow(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td
                  className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline whitespace-nowrap"
                  onClick={() => onView(item)}
                >
                  {item.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.specification}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.barcode}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.unit}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <span className={`font-medium ${item.quantity < item.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.minStock}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.maxStock}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.price.replace('元', '')}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.supplier}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.location}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.batchNo}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.productionDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.expiryDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.lastUpdateTime ? item.lastUpdateTime.slice(0, 10) : ''}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    item.dataStatus === '启用' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.dataStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {materials.length} 条</span>
          <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">{currentPage} / {totalPages}</span>
          <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
