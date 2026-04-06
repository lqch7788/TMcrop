import { Plus, Download, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { Supplier } from './types';
import { getSupplierTypeName } from './data';

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
  onAdd: () => void;
  onBatchEdit: () => void;
  onBatchDelete: () => void;
  onCancelBatch: () => void;
  onExport: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
}

export function SupplierTable({
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
  onAdd,
  onBatchEdit,
  onBatchDelete,
  onCancelBatch,
  onExport,
  onConfirmExport,
  onCancelExport,
}: SupplierTableProps) {
  const totalPages = Math.ceil(suppliers.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, suppliers.length);
  const displayedSuppliers = suppliers.slice(startIdx, endIdx);
  const isAllSelected = suppliers.length > 0 && selectedRows.length === suppliers.length;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">供应商列表</h3>
        {exportMode ? (
          <div className="flex gap-2">
            <button onClick={onConfirmExport} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
              <Download className="w-4 h-4" />
              确认导出
            </button>
            <button onClick={onCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              取消
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {!batchEditMode && (
              <>
                <button
                  onClick={onAdd}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
                <button
                  onClick={onBatchEdit}
                  className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  编辑
                </button>
                <button
                  onClick={onBatchDelete}
                  className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  删除
                </button>
              </>
            )}
            {batchEditMode && (
              <>
                <button
                  onClick={onBatchEdit}
                  className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  确认编辑
                </button>
                <button
                  onClick={onBatchDelete}
                  className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
                <button
                  onClick={onCancelBatch}
                  className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
              </>
            )}
            <button onClick={onExport} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 'max-content' }}>
            <thead className="bg-gray-50">
            <tr>
              {(exportMode || batchEditMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">所属组织</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应物资类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商属性</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">联系人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">移动电话</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作电话</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">传真号码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">国家</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">省份</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">城市</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">详细地址</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">开户行</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">银行卡号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">创建时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">备注</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedSuppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
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
                <td
                  className="px-4 py-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  onClick={() => onView(supplier)}
                >
                  {supplier.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.organization}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{getSupplierTypeName(supplier.supplierType)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.supplierAttribute}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.contact}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.mobilePhone}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.workPhone}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.fax}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.country}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.province}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.city}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.address}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    supplier.status === '合作中' ? 'bg-green-100 text-green-700' :
                    supplier.status === '暂停' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {supplier.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.bankName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.bankCardNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.createDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{supplier.remarks}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onEdit(supplier)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(exportMode || batchEditMode) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={onSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {isAllSelected ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
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
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
