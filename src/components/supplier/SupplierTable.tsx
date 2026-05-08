// 供应商表格组件
import { ChevronLeft, ChevronRight, Eye, Edit, Trash2 } from 'lucide-react';
import { Supplier } from './types';
import { getSupplierTypeName } from './data';
import { Button } from '../../components/ui/button';

interface SupplierTableProps {
  suppliers: Supplier[];
  currentPage: number;
  pageSize: number;
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

export default function SupplierTable({
  suppliers,
  currentPage,
  pageSize,
  selectedRows,
  exportMode,
  batchEditMode,
  onPageChange,
  onPageSizeChange,
  onSelectAll,
  onSelectRow,
  onView,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  const totalPages = Math.ceil(suppliers.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, suppliers.length);
  const displayedSuppliers = suppliers.slice(startIdx, endIdx);

  const isAllSelected = suppliers.length > 0 && selectedRows.length === suppliers.length;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ maxHeight: 'calc(100vh - 420px)', display: 'flex', flexDirection: 'column' }}>
      {/* 操作栏 */}
      {(exportMode || batchEditMode) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              {isAllSelected ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <table className="w-full" style={{ minWidth: '1400px', tableLayout: 'fixed' }}>
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {(exportMode || batchEditMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">供应商编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-40">供应商名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">供应类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">供应商属性</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">联系人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-28">移动电话</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">所属组织</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">所在地区</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">创建时间</th>
              {!exportMode && !batchEditMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {displayedSuppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-blue-100 transition-colors">
                {(exportMode || batchEditMode) && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(supplier.id)}
                      onChange={() => onSelectRow(supplier.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline whitespace-nowrap" onClick={() => onView(supplier)}>
                  {supplier.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">{supplier.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{getSupplierTypeName(supplier.supplierType)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{supplier.supplierAttribute}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{supplier.contact}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{supplier.mobilePhone}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{supplier.organization}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    supplier.status === '合作中' ? 'bg-green-100 text-green-700' :
                    supplier.status === '暂停' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {supplier.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{supplier.province} {supplier.city}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{supplier.createDate}</td>
                {!exportMode && !batchEditMode && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onView(supplier)} title="查看">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(supplier)} title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(supplier)} title="删除">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                )}
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
          <span className="text-sm text-gray-500">共 {suppliers.length} 条</span>
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
