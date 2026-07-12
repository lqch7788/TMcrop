/**
 * 肥料库表格组件（扁平化 2026-07-12）
 * 单行 18 列：编码 / 肥料名称 / 品牌 / 肥料类型 / 施肥时期 / 当前库存 / 单价 / 功能说明 /
 *          成份与含量 / 生产厂家 / 建议用量 / 单位 / 稀释比例 / 产品批次 / 生产日期 / 过期日期 / 备注 / 操作
 * 容器 overflow-x-auto，超宽时底部出现横向滚动条
 * 每条记录 = 一条 spec，含所有下沉字段
 */
import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { FertilizerSpec } from '@/stores';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { getDictItemName } from '@/stores';

interface FertilizerLibraryTableProps {
  data: FertilizerSpec[];
  isLoading: boolean;
  onDetail: (record: FertilizerSpec) => void;
  onEdit: (record: FertilizerSpec) => void;
  onDelete: (id: string) => void;
  exportMode?: boolean;
  selectedRows?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
}

// 列数常量（用于 colSpan）
// 非导出模式：18 列（含操作）；导出模式：17 列（不含操作）+ 1 列 checkbox = 18
const TOTAL_COLS = 18;

const getApplicationTimingBadge = (timing: string) => {
  switch (timing) {
    case 'base': return { bg: 'bg-amber-100', text: 'text-amber-700', label: '底肥' };
    case 'dressing': return { bg: 'bg-green-100', text: 'text-green-700', label: '追肥' };
    case 'foliar': return { bg: 'bg-blue-100', text: 'text-blue-700', label: '叶面肥' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: timing };
  }
};

const getTimingBadges = (timing: string) => {
  if (!timing) return '-';
  const timings = timing.split(',').map(t => t.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {timings.map((t, idx) => {
        const badge = getApplicationTimingBadge(t);
        return (
          <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        );
      })}
    </div>
  );
};

const getFertilizerTypeLabel = (type: string) => {
  if (!type) return '-';
  const label = getDictItemName('fertilizer_type', type);
  return label || type;
};

export function FertilizerLibraryTable({ data, isLoading, onDetail, onEdit, onDelete, exportMode = false, selectedRows = [], onSelectRow, onSelectAll }: FertilizerLibraryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 横向滚动容器：列数 18，超宽时底部自动出滚动条 */}
      <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
        <Table style={{ minWidth: '1800px' }}>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow className="hover:bg-transparent">
              {exportMode && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 text-white border-white rounded focus:ring-white"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">编码</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">肥料名称</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">品牌</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">肥料类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">施肥时期</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap text-right">当前库存 (kg)</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap text-right">单价 (元/单位)</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">功能说明</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">成份与含量</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">生产厂家</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">建议用量</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">单位</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">稀释比例</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">产品批次</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">生产日期</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">过期日期</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">备注</TableHead>
              {!exportMode && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap sticky right-0 bg-blue-600 z-10">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={TOTAL_COLS} className="px-4 py-12 text-center text-gray-400">
                  暂无肥料记录
                </TableCell>
              </TableRow>
            ) : currentData.map((record) => (
              <TableRow
                key={record.id}
                className={`hover:bg-amber-50 transition-colors ${selectedRows.includes(record.id) ? 'bg-amber-50' : ''}`}
              >
                {exportMode && (
                  <TableCell className="px-4 py-3 whitespace-nowrap w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(record.id)}
                      onChange={() => onSelectRow?.(record.id)}
                      className="w-4 h-4 text-amber-600 border-gray-400 rounded focus:ring-amber-500"
                    />
                  </TableCell>
                )}
                {/* 1. 编码 */}
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onDetail(record)}
                    className="font-mono p-0 h-auto text-blue-600"
                    title="查看详情"
                  >
                    {record.fertilizerCode || '-'}
                  </Button>
                </TableCell>
                {/* 2. 肥料名称 */}
                <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                  {record.fertilizerName || '-'}
                </TableCell>
                {/* 3. 品牌 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.brandName || '主品牌'}
                </TableCell>
                {/* 4. 肥料类型 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {getFertilizerTypeLabel(record.fertilizerType || '')}
                </TableCell>
                {/* 5. 施肥时期 */}
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  {getTimingBadges(record.applicationTiming || '')}
                </TableCell>
                {/* 6. 当前库存 */}
                <TableCell className="px-4 py-3 text-sm whitespace-nowrap text-right font-mono">
                  {(() => {
                    const stock = record.stockQuantity ?? 0;
                    const colorClass = stock === 0
                      ? 'text-red-600 font-semibold'
                      : stock < 50
                        ? 'text-amber-600 font-semibold'
                        : 'text-emerald-600 font-semibold';
                    return (
                      <span className={colorClass} title={stock === 0 ? '库存为零' : stock < 50 ? '库存偏低' : '库存充足'}>
                        {stock.toFixed(2)}
                      </span>
                    );
                  })()}
                </TableCell>
                {/* 7. 单价 */}
                <TableCell className="px-4 py-3 text-sm text-right font-mono whitespace-nowrap">
                  {record.unitPrice != null && record.unitPrice > 0
                    ? Number(record.unitPrice).toFixed(2)
                    : <span className="text-gray-400">-</span>}
                </TableCell>
                {/* 8. 功能说明 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate" title={record.functionDesc || ''}>
                  {record.functionDesc || '-'}
                </TableCell>
                {/* 9. 成份与含量 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={record.specContent || ''}>
                  {record.specContent || '-'}
                </TableCell>
                {/* 10. 生产厂家 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={record.manufacturer || ''}>
                  {record.manufacturer || '-'}
                </TableCell>
                {/* 11. 建议用量 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-mono">
                  {record.suggestedDosage || '-'}
                </TableCell>
                {/* 12. 单位 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {getDictItemName('dosage_unit', record.dosageUnit || '') || record.dosageUnit || '-'}
                </TableCell>
                {/* 13. 稀释比例 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-mono">
                  {record.suggestedRatio || '-'}
                </TableCell>
                {/* 14. 产品批次 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-mono" title={record.batchNumber || ''}>
                  {record.batchNumber || '-'}
                </TableCell>
                {/* 15. 生产日期 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.productionDate || '-'}
                </TableCell>
                {/* 16. 过期日期 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.expirationDate || '-'}
                </TableCell>
                {/* 17. 备注 */}
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={record.remark || ''}>
                  {record.remark || '-'}
                </TableCell>
                {/* 18. 操作（粘性列，水平滚动时锁定右侧） */}
                {!exportMode && (
                  <TableCell className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDetail(record)}
                        className="text-gray-500 hover:text-blue-600"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(record)}
                        className="text-gray-500 hover:text-amber-600"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(record.id)}
                        className="text-gray-500 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}