// MaterialTable 组件 - 物料统计表格
// 显示领料统计表的完整数据
import { Download, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import type { MaterialStatItem } from '../types/statisticsTab.types';

interface MaterialTableProps {
  /** 过滤后的物料统计数据 */
  data: MaterialStatItem[];
  /** 当前页码 */
  currentPage: number;
  /** 每页条数 */
  pageSize: number;
  /** 导出模式 */
  exportMode: boolean;
  /** 选中的行 */
  selectedRows: number[];
  /** 设置当前页码 */
  onPageChange: (page: number) => void;
  /** 设置每页条数 */
  onPageSizeChange: (size: number) => void;
  /** 全选处理 */
  onSelectAll: () => void;
  /** 行选择变化处理 */
  onRowSelectChange: (idx: number, checked: boolean) => void;
  /** 设置导出模式 */
  onExportModeChange: (mode: boolean) => void;
  /** 确认导出 */
  onExportConfirm: () => void;
  /** 取消导出 */
  onCancelExport: () => void;
  /** 查看明细 */
  onViewDetail: (record: MaterialStatItem) => void;
}

export function MaterialTable({
  data,
  currentPage,
  pageSize,
  exportMode,
  selectedRows,
  onPageChange,
  onPageSizeChange,
  onSelectAll,
  onRowSelectChange,
  onExportModeChange,
  onExportConfirm,
  onCancelExport,
  onViewDetail,
}: MaterialTableProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">领料统计表</h3>
        <div className="flex gap-2">
          {exportMode ? (
            <>
              <Button size="sm" onClick={onExportConfirm}>
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button size="sm" variant="secondary" onClick={onCancelExport}>
                <X className="w-4 h-4" /> 取消
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => onExportModeChange(true)}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-3 py-3 text-left text-sm font-semibold w-12">
                  <Checkbox
                    checked={selectedRows.length === data.length && data.length > 0}
                    onCheckedChange={() => onSelectAll()}
                  />
                </th>
              )}
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">物料编号</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">物料名称</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">分类</th>
              <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">单位</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">领料部门</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">用途/区域</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">领料人</th>
              <th className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">领料次数</th>
              <th className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">总数量</th>
              <th className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">实际数量</th>
              <th className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">总金额(元)</th>
              {!exportMode && (
                <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-400">
            {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item, idx) => {
              const globalIdx = (currentPage - 1) * pageSize + idx;
              return (
                <tr key={idx} className="hover:bg-blue-100 transition-colors">
                  {exportMode && (
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selectedRows.includes(globalIdx)}
                        onCheckedChange={(checked) => onRowSelectChange(globalIdx, checked === true)}
                      />
                    </td>
                  )}
                  <td className="px-3 py-3 text-sm font-mono text-blue-600 whitespace-nowrap">{item.materialCode}</td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.materialName}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.category}</td>
                  <td className="px-3 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{item.unit}</td>
                  <td className="px-3 py-3 text-sm font-mono text-cyan-600 whitespace-nowrap">{item.productionPlanBatchCode}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.requisitionDepartment}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.usageArea}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.requisitioner}</td>
                  <td className="px-3 py-3 text-sm text-right font-medium text-blue-600 whitespace-nowrap">{item.requisitionCount}</td>
                  <td className="px-3 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">{item.totalQuantity.toLocaleString()}</td>
                  <td className="px-3 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">{item.actualQuantity.toLocaleString()}</td>
                  <td className="px-3 py-3 text-sm text-right font-bold text-emerald-600 whitespace-nowrap">¥{item.totalAmount.toLocaleString()}</td>
                  {!exportMode && (
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(item)}
                      >
                        <Eye className="w-4 h-4" /> 查看明细
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
