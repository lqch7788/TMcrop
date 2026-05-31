import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/Pagination';
import { showConfirm } from '@/lib/dialogService';
import { CropBatch, PlanType, PlanTypeColors, PlanTypeLabels } from '../../types';
import { batchStatusColors, batchStatusLabels } from './constants';

interface ProductionTableProps {
  filteredBatches: CropBatch[];
  currentPage: number;
  pageSize: number;
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  selectedRows: string[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectRow: (id: string) => void;
  onSelectAll: () => void;
  onBatchSelectAll: () => void;
  onBatchDeleteSelectAll: () => void;
  onBatchCodeClick: (batch: CropBatch) => void;
  onEdit: (batch: CropBatch) => void;
  onDelete: (batch: CropBatch) => void;
  totalCount: number;
}

export function ProductionTable({
  filteredBatches,
  currentPage,
  pageSize,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  selectedRows,
  onPageChange,
  onPageSizeChange,
  onSelectRow,
  onSelectAll,
  onBatchSelectAll,
  onBatchDeleteSelectAll,
  onBatchCodeClick,
  onEdit,
  onDelete,
  totalCount,
}: ProductionTableProps) {
  const displayedBatches = filteredBatches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Check states for select all
  const allSelectedForExport = selectedRows.length === filteredBatches.length && filteredBatches.length > 0;
  const allSelectedForBatchEdit = selectedRows.length === filteredBatches.filter(b => b.batchStatus !== 'completed' && b.batchStatus !== 'cancelled').length;
  // 所有批次都可以删除
  const deletableBatches = filteredBatches;
  const allSelectedForBatchDelete = selectedRows.length === deletableBatches.length;

  const getRowClassName = (batch: CropBatch) => {
    let className = 'hover:bg-blue-100 transition-colors ';
    if (batchEditMode && (batch.batchStatus === 'completed' || batch.batchStatus === 'cancelled')) {
      className += 'bg-gray-50 ';
    }
    // 所有状态都可以删除，移除灰色背景限制
    return className;
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelectedForExport}
                    onCheckedChange={() => onSelectAll()}
                  />
                </th>
              )}
              {batchEditMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelectedForBatchEdit}
                    onCheckedChange={() => onBatchSelectAll()}
                  />
                </th>
              )}
              {batchDeleteMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelectedForBatchDelete}
                    onCheckedChange={() => onBatchDeleteSelectAll()}
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物品种</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植区域</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">开始时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预计结束</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">目标产量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">发布人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">发布时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">当前状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">关联订单</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划文件</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {displayedBatches.map((batch) => (
              <tr key={batch.id} className={getRowClassName(batch)}>
                {exportMode && (
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedRows.includes(batch.id)}
                      onCheckedChange={() => onSelectRow(batch.id)}
                    />
                  </td>
                )}
                {batchEditMode && (
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedRows.includes(batch.id)}
                      onCheckedChange={() => {
                        if (batch.batchStatus !== 'completed' && batch.batchStatus !== 'cancelled') {
                          onSelectRow(batch.id);
                        }
                      }}
                      disabled={batch.batchStatus === 'completed' || batch.batchStatus === 'cancelled'}
                    />
                  </td>
                )}
                {batchDeleteMode && (
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedRows.includes(batch.id)}
                      onCheckedChange={() => onSelectRow(batch.id)}
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={() => onBatchCodeClick(batch)} title="点击查看详情">
                    {batch.batchCode}
                  </Button>
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {batch.planType && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PlanTypeColors[batch.planType]?.bg} ${PlanTypeColors[batch.planType]?.text}`}>
                      {PlanTypeLabels[batch.planType]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{batch.cropName}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.variety}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {batch.greenhouseName || batch.supplierName || batch.seedlingSiteName || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.startDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.expectedHarvestDate || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.responsiblePerson}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                  {`${batch.targetYield || 0} ${batch.unit || 'kg'}`}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.publisher || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.publishDate || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${batchStatusColors[batch.batchStatus || 'draft']}`}>
                    {batchStatusLabels[batch.batchStatus || 'draft']}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.orderCode || '-'}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {batch.planDetailFileName ? (
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" title="点击下载生产计划文件" onClick={() => {
                      // 下载生产计划文件
                      const fileName = batch.planDetailFileName!;
                      const isDocx = fileName.endsWith('.docx');
                      const content = batch.planDetail || `# ${batch.batchCode}\n\n批次号：${batch.batchCode}\n作物名称：${batch.cropName}\n作物品种：${batch.variety}\n种植区域：${batch.greenhouseName}\n种植面积：${batch.plantingArea} m²\n种植模式：${batch.plantingMode}\n负责人：${batch.responsiblePerson}\n开始时间：${batch.startDate}\n预计结束时间：${batch.expectedHarvestDate}\n目标产量：${batch.targetYield} kg\n当前状态：${batchStatusLabels[batch.batchStatus || 'draft']}`;
                      const blob = new Blob([content], {
                        type: isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/markdown'
                      });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}>
                      {batch.planDetailFileName}
                    </Button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {batch.batchStatus !== 'completed' && batch.batchStatus !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(batch)}
                        className="text-gray-600 hover:text-blue-600"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (await showConfirm(`确定要删除生产计划 ${batch.batchCode} 吗？`)) {
                          onDelete(batch);
                        }
                      }}
                      className="text-gray-600 hover:text-red-600"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Selection footer */}
        {exportMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onSelectAll}>
                {allSelectedForExport ? '全不选' : '全选'}
              </Button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
        {batchEditMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBatchSelectAll}>
                {allSelectedForBatchEdit ? '全不选' : '全选'}
              </Button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
        {batchDeleteMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBatchDeleteSelectAll}>
                {allSelectedForBatchDelete ? '全不选' : '全选'}
              </Button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项（草稿/已作废可删除）</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination - 使用标准分页组件 */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / pageSize) || 1}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[10, 20, 50]}
        showPageSize
      />
    </div>
  );
}
