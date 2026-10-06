import { Eye, Edit, Trash2 } from 'lucide-react';
import { Material } from './MaterialFilters';
import { daysUntilExpiry, EXPIRY_WARN_DAYS } from '@/lib/dateUtils';
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

  // 2026-09-27 修复分页条数失效：此前容器固定 maxHeight: calc(100vh - 400px) + 内层纵向滚动，
  // 数据虽按 pageSize 渲染（20/50 行）但超出固定高度的行被内部滚动隐藏，用户看到"始终 10 条"。
  // 改为自然撑开（与物料入库页行为一致），由页面整体滚动
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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

      <div style={{ overflowX: 'auto' }}>
        <Table className="w-full" style={{ minWidth: '1600px', tableLayout: 'fixed' }}>
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
              {/* 2026-10-06 P1 修复：supplierId 之前弹窗可改但列表看不到——加列 */}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">供应商ID</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">存放位置</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">批次号</TableHead>
              {/* 2026-09-29 修复日期被截断：原 w-24(96px) 扣 px-4 后内容区仅 64px，放不下 "2026-03-26"(约 71px) */}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-28">生产日期</TableHead>
              {/* 有效期至：还需容纳临期/过期后缀（如 "⚠已过期" / "⚠3天"），故比生产日期更宽 */}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-44">有效期至</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">备注</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-32">最后更新时间</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">数据状态</TableHead>
              {/* 2026-08-10：每行操作列，下沉编辑按钮（原仅依赖工具栏批量编辑入口） */}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-20">操作</TableHead>
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
                {/* 2026-09-27：阈值属物料主数据（不在入库明细填）——未设置时显式提示，避免"0=不预警"被隐没 */}
                <TableCell
                  className="px-4 py-3 text-sm truncate"
                  title={item.minStock > 0 ? `最低 ${item.minStock}` : '未设置最低库存阈值：设置后才会触发"库存不足"预警'}
                >
                  {item.minStock > 0
                    ? <span className="text-gray-600">{item.minStock}</span>
                    : <span className="text-amber-500 text-xs">未设置</span>}
                </TableCell>
                <TableCell
                  className="px-4 py-3 text-sm truncate"
                  title={item.maxStock > 0 ? `最高 ${item.maxStock}` : '未设置最高库存阈值'}
                >
                  {item.maxStock > 0
                    ? <span className="text-gray-600">{item.maxStock}</span>
                    : <span className="text-amber-500 text-xs">未设置</span>}
                </TableCell>
                {/* 2026-09-27 修复：price 为 null 时 .replace 崩溃（一行坏数据炸整页）——防御式兜底 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.price || ''}>{(item.price || '').replace('元', '')}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.supplier}>{item.supplier}</TableCell>
                {/* 2026-10-06 P1 修复：supplierId 列（悬停 title 显示完整 ID） */}
                <TableCell className="px-4 py-3 text-sm text-gray-500 font-mono truncate" title={item.supplierId || ''}>
                  {item.supplierId || '-'}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.location}>{item.location}</TableCell>
                {/* 2026-09-27 多批次方案 A：批次号 + "共 N 批"徽章（批次数来自 batch_inventory 聚合，
                    主表仍是按 code 唯一总量行不拆行；批次明细在详情弹窗"批次明细"tab 查看） */}
                <TableCell className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate" title={item.batchNo}>{item.batchNo}</span>
                    {(item.batchCount ?? 0) > 1 && (
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs whitespace-nowrap"
                        title={`该物料共 ${item.batchCount} 个有效批次，点击编码查看批次明细`}
                      >
                        共 {item.batchCount} 批
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.productionDate}>{item.productionDate}</TableCell>
                {/* 有效期至：优先显示"最早有效批次效期"（FEFO 视角），无批次效期时回退主表值；30 天内临期红字（与领料模块 EXPIRY_WARN_DAYS 一致） */}
                {(() => {
                  const shown = item.earliestExpiry || item.expiryDate;
                  const days = daysUntilExpiry(shown);
                  const isWarn = days !== null && days >= 0 && days < EXPIRY_WARN_DAYS;
                  const isExpired = days !== null && days < 0;
                  return (
                    <TableCell
                      className={`px-4 py-3 text-sm truncate ${isWarn || isExpired ? 'text-red-600 font-medium' : 'text-gray-600'}`}
                      title={
                        item.earliestExpiry && item.earliestExpiry !== item.expiryDate
                          ? `最早有效批次效期 ${item.earliestExpiry}${isExpired ? '（已过期）' : isWarn ? `（${days} 天后到期）` : ''}｜最近入库批次 ${item.expiryDate || '-'}`
                          : shown
                      }
                    >
                      {shown}
                      {isExpired ? ' ⚠已过期' : isWarn ? ` ⚠${days}天` : ''}
                    </TableCell>
                  );
                })()}
                {/* 2026-09-27 新增：备注列（入库明细备注落主数据后可在此查看） */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 truncate" title={item.remarks}>{item.remarks}</TableCell>
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
                {/* 操作列：行内编辑 + 删除按钮（2026-08-10 下沉自工具栏） */}
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="编辑"
                        onClick={() => onEdit(item)}
                      >
                        <Edit className="w-4 h-4 text-emerald-600" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="删除"
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
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
