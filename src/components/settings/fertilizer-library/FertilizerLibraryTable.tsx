/**
 * 肥料知识库表格组件
 * 列：编码、肥料名称、肥料类型Badge、分类、功能说明、操作（编辑/删除）
 * 支持折叠展开规格明细
 */
import React from 'react';
import { Eye, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { FertilizerLibrary } from '@/stores';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { getDictItemName } from '@/stores';

interface FertilizerLibraryTableProps {
  data: FertilizerLibrary[];
  isLoading: boolean;
  onDetail: (record: FertilizerLibrary) => void;
  onEdit: (record: FertilizerLibrary) => void;
  onDelete: (id: string) => void;
  // 导出模式相关
  exportMode?: boolean;
  selectedRows?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
}

// 施肥时期 Badge 颜色
const getApplicationTimingBadge = (timing: string) => {
  switch (timing) {
    case 'base':
      return { bg: 'bg-amber-100', text: 'text-amber-700', label: '底肥' };
    case 'dressing':
      return { bg: 'bg-green-100', text: 'text-green-700', label: '追肥' };
    case 'foliar':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: '叶面肥' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: timing };
  }
};

// 施肥时期渲染（支持多选，用逗号分隔）
const getApplicationTimingLabel = (timing: string) => {
  if (!timing) return '-';
  const timings = timing.split(',').map(t => t.trim()).filter(Boolean);
  if (timings.length === 0) return '-';
  return (
    <div className="flex flex-wrap gap-1">
      {timings.map((t, idx) => {
        const badge = getApplicationTimingBadge(t);
        return (
          <span
            key={idx}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
          >
            {badge.label}
          </span>
        );
      })}
    </div>
  );
};

// 获取肥料类型标签（使用字典翻译）
const getFertilizerTypeLabel = (type: string) => {
  if (!type) return '-';
  const label = getDictItemName('fertilizer_type', type);
  return label || type;
};

export function FertilizerLibraryTable({
  data,
  isLoading,
  onDetail,
  onEdit,
  onDelete,
  exportMode = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
}: FertilizerLibraryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  // 切换展开/折叠
  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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
      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
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
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-8"></TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">编码</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">肥料名称</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">肥料类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">施肥时期</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">当前库存</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">功能说明</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">规格数</TableHead>
              {!exportMode && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  暂无肥料记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => (
                <React.Fragment key={record.id}>
                  {/* 主数据行 */}
                  <TableRow
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
                    {/* 展开/折叠按钮 */}
                    <TableCell className="px-4 py-3 whitespace-nowrap w-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(record.id)}
                        className="text-gray-500 hover:text-amber-600"
                        title={expandedRows.has(record.id) ? '收起' : '展开'}
                      >
                        {expandedRows.has(record.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    {/* 编码 */}
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
                    {/* 肥料名称 - 加粗 */}
                    <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                      {record.fertilizerName || '-'}
                    </TableCell>
                    {/* 肥料类型 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {getFertilizerTypeLabel(record.fertilizerType || '')}
                    </TableCell>
                    {/* 施肥时期 - Badge */}
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {getApplicationTimingLabel(record.applicationTiming || '')}
                    </TableCell>
                    {/* 当前库存 (G11 V1.1) */}
                    <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                      {(() => {
                        const stock = record.currentStock ?? 0;
                        const colorClass = stock === 0
                          ? 'text-red-600 font-semibold'
                          : stock < 50
                            ? 'text-amber-600 font-semibold'
                            : 'text-emerald-600 font-semibold';
                        return (
                          <span className={colorClass} title={stock === 0 ? '库存为零，无法施肥' : stock < 50 ? '库存偏低' : '库存充足'}>
                            {stock} kg
                          </span>
                        );
                      })()}
                    </TableCell>
                    {/* 功能说明 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                      {record.functionDesc || '-'}
                    </TableCell>
                    {/* 规格数 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.specs?.length || 0}
                    </TableCell>
                    {!exportMode && (
                      /* 操作区 */
                      <TableCell className="px-4 py-3 whitespace-nowrap">
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
                  {/* 展开行 - 规格明细 */}
                  {expandedRows.has(record.id) && (
                    <TableRow key={`${record.id}-expanded`} className="bg-amber-50/50">
                      <TableCell colSpan={9} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-semibold text-amber-800 mb-2">规格明细</div>
                          {(record.specs && record.specs.length > 0) ? (
                            <table className="w-full border border-amber-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#FFFBEB]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">品牌名称</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">成份与含量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">生产厂家</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">建议用量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">单位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">稀释比例</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">产品批次</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">生产日期</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">过期日期</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-amber-800">备注</th>
                                  <th className="px-3 py-2 text-right text-sm font-semibold text-amber-800">单价 (元/单位)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100">
                                {record.specs.map((spec, idx) => (
                                  <tr key={idx} className="hover:bg-amber-100/30">
                                    <td className="px-3 py-2 text-sm text-amber-700">{spec.brandName || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700">{spec.specContent || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700">{spec.manufacturer || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700">{spec.suggestedDosage || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700">{getDictItemName('dosage_unit', spec.dosageUnit || '') || spec.dosageUnit || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700">{spec.suggestedRatio || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700 font-mono">{(spec as any).batchNumber || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700">{(spec as any).productionDate || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700">{(spec as any).expirationDate || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-amber-700">{spec.remark || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-right font-mono text-amber-900 font-semibold">
                                      {(spec as any).unitPrice != null && (spec as any).unitPrice > 0
                                        ? `${Number((spec as any).unitPrice).toFixed(2)}`
                                        : <span className="text-amber-400">-</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-amber-600 text-center py-4">暂无规格明细</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
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
