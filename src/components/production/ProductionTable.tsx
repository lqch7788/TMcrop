import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CropBatch, PlanType, PlanTypeColors, PlanTypeLabels } from '../../types';
import { batchStatusColors, batchStatusLabels } from './constants';

interface ProductionTableProps {
  filteredBatches: CropBatch[];
  currentPage: number;
  pageSize: number;
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  selectedRows: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectRow: (id: number) => void;
  onSelectAll: () => void;
  onBatchSelectAll: () => void;
  onBatchDeleteSelectAll: () => void;
  onBatchCodeClick: (batch: CropBatch) => void;
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
  totalCount,
}: ProductionTableProps) {
  const pageCount = Math.ceil(filteredBatches.length / pageSize);
  const displayedBatches = filteredBatches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Check states for select all
  const allSelectedForExport = selectedRows.length === filteredBatches.length && filteredBatches.length > 0;
  const allSelectedForBatchEdit = selectedRows.length === filteredBatches.filter(b => b.batchStatus !== 'completed' && b.batchStatus !== 'cancelled').length;
  const allSelectedForBatchDelete = selectedRows.length === filteredBatches.filter(b => b.batchStatus === 'draft').length;

  const getRowClassName = (batch: CropBatch) => {
    let className = 'hover:bg-blue-100 transition-colors ';
    if (batchEditMode && (batch.batchStatus === 'completed' || batch.batchStatus === 'cancelled')) {
      className += 'bg-gray-50 ';
    }
    if (batchDeleteMode && batch.batchStatus !== 'draft') {
      className += 'bg-gray-100 ';
    }
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
                  <input
                    type="checkbox"
                    checked={allSelectedForExport}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              {batchEditMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={allSelectedForBatchEdit}
                    onChange={onBatchSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              {batchDeleteMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={allSelectedForBatchDelete}
                    onChange={onBatchDeleteSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物品种</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">场地/供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">开始时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预计结束</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">目标数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">发布人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">发布时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">当前状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">版本号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划文件</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {displayedBatches.map((batch) => (
              <tr key={batch.id} className={getRowClassName(batch)}>
                {exportMode && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(batch.id)}
                      onChange={() => onSelectRow(batch.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                {batchEditMode && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(batch.id)}
                      onChange={() => {
                        if (batch.batchStatus !== 'completed' && batch.batchStatus !== 'cancelled') {
                          onSelectRow(batch.id);
                        }
                      }}
                      disabled={batch.batchStatus === 'completed' || batch.batchStatus === 'cancelled'}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                    />
                  </td>
                )}
                {batchDeleteMode && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(batch.id)}
                      onChange={() => {
                        if (batch.batchStatus === 'draft') {
                          onSelectRow(batch.id);
                        }
                      }}
                      disabled={batch.batchStatus !== 'draft'}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                  <button
                    onClick={() => onBatchCodeClick(batch)}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    title="点击查看详情"
                  >
                    {batch.batchCode}
                  </button>
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
                  {batch.planType === PlanType.SEED_BREEDING
                    ? batch.supplierName || '-'
                    : batch.planType === PlanType.SEEDLING
                    ? batch.seedlingSiteName || batch.greenhouseName || '-'
                    : batch.greenhouseName || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.startDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.expectedHarvestDate || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.responsiblePerson}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                  {batch.planType === PlanType.SEED_BREEDING
                    ? `${batch.seedQuantity || 0} ${batch.unit || 'kg'}`
                    : batch.planType === PlanType.SEEDLING
                    ? `${batch.targetSeedlingCount || 0} 株`
                    : `${batch.targetYield || 0} kg`}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.publisher || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{batch.publishDate || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${batchStatusColors[batch.batchStatus || 'draft']}`}>
                    {batchStatusLabels[batch.batchStatus || 'draft']}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">V1.0</td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">-</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {batch.planDetailFileName ? (
                    <button
                      onClick={() => {
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
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                      title="点击下载生产计划文件"
                    >
                      {batch.planDetailFileName}
                    </button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Selection footer */}
        {exportMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button onClick={onSelectAll} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                {allSelectedForExport ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
        {batchEditMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button onClick={onBatchSelectAll} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                {allSelectedForBatchEdit ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
        {batchDeleteMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button onClick={onBatchDeleteSelectAll} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                {allSelectedForBatchDelete ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项（仅草稿状态可删除）</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination - 固定在表格外部底部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {filteredBatches.length} 条</span>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">{currentPage} / {pageCount || 1}</span>
          <button
            onClick={() => onPageChange(Math.min(pageCount || 1, currentPage + 1))}
            disabled={currentPage >= pageCount}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
