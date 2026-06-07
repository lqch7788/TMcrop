import { Eye, Edit, Trash2 } from 'lucide-react';
import { Material } from './MaterialFilters';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

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
        <Table className="w-full" style={{ minWidth: '1500px', tableLayout: 'fixed' }}>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {(exportMode || batchEditMode || deleteMode) && (
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">物料编号</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">物料名称</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-40">分类</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">规格型号</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">条形码</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-16">单位</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">库存数量</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">最低库存</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">最高库存</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">单价（元）</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">供应商</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">存放位置</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">批次号</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">生产日期</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">有效期至</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">最后更新时间</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">数据状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {displayedMaterials.map((item) => (
              <TableRow key={item.id} className="hover:bg-blue-100 transition-colors">
                {(exportMode || batchEditMode || deleteMode) && (
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Checkbox
                      checked={selectedRows.includes(item.id)}
                      onCheckedChange={() => onSelectRow(item.id)}
                      className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                    />
                  </TableCell>
                )}
                <TableCell
                  className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline truncate"
                  title={`${item.code}（点击查看详情）`}
                  onClick={() => onView(item)}
                >
                  {item.code}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.name}>{item.name}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.category}>{item.category}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.specification}>{item.specification}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.barcode}>{item.barcode}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.unit}>{item.unit}</TableCell>
                <TableCell className="px-4 py-3 text-sm truncate">
                  <span
                    className={`font-medium ${item.quantity < item.minStock ? 'text-red-600' : 'text-gray-900'}`}
                    title={`库存 ${item.quantity}（最低 ${item.minStock}）`}
                  >
                    {item.quantity}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={`最低 ${item.minStock}`}>{item.minStock}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={`最高 ${item.maxStock}`}>{item.maxStock}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.price}>{item.price.replace('元', '')}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.supplier}>{item.supplier}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.location}>{item.location}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.batchNo}>{item.batchNo}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.productionDate}>{item.productionDate}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.expiryDate}>{item.expiryDate}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.lastUpdateTime}>
                  {item.lastUpdateTime ? item.lastUpdateTime.slice(0, 10) : ''}
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    item.dataStatus === '启用' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`} title={item.dataStatus}>
                    {item.dataStatus}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={(size) => { onPageSizeChange(size); onPageChange(1); }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
