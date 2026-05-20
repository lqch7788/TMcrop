/**
 * 施肥数据表格组件
 * 列：施肥编号(链接→详情)、肥料名称(加粗)、肥料类型(Badge)、作物品种、
 *     温室位置、稀释比例、施肥量(绿色加粗)、总成本(amber)、
 *     施肥时间(日期时间)、数据来源(Badge)、操作员、操作区(查看/编辑/删除)
 * IoT记录行有绿色左边框，仅可查看不可编辑删除
 */
import React from 'react';
import { Eye, Edit2, Trash2, Plus, Download, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { FertilizerData } from '@/stores';
import { getDictItemName } from '@/stores/useDictionaryStore';
import IotDataIndicator, { IotDeviceStatus } from './IotDataIndicator';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/table';
import { Pagination } from '../../ui/Pagination';

interface FertilizerTableProps {
  data: FertilizerData[];
  isLoading: boolean;
  operationMode: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDetail: (record: FertilizerData) => void;
  onEdit: (record: FertilizerData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onBatchDeleteMode: () => void;
  onExportMode: () => void;
  iotDevices?: IotDeviceStatus[];
  iotLoading?: boolean;
  showStats?: boolean;
  onToggleStats?: () => void;
}

export function FertilizerTable({
  data,
  isLoading,
  operationMode,
  selectedIds,
  onSelectionChange,
  onDetail,
  onEdit,
  onDelete,
  onAdd,
  onBatchDeleteMode,
  onExportMode,
  iotDevices = [],
  iotLoading = false,
  showStats = false,
  onToggleStats,
}: FertilizerTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const showCheckbox = operationMode === 'delete';
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  // 全选/取消
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(data.map((it) => it.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((k) => k !== id));
    }
  };

  // 数据来源 Badge 样式
  const getSourceBadge = (source: string) => {
    if (source === 'auto_iot') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          IoT自动
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        手动
      </span>
    );
  };

  // 获取肥料类型显示名
  const getFertilizerTypeLabel = (code: string): string => {
    return getDictItemName('fertilizer_type', code) || code;
  };

  // 肥料类型 Badge 颜色
  const getTypeBadgeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'organic': 'bg-emerald-100 text-emerald-700',
      'inorganic': 'bg-blue-100 text-blue-700',
      'biological': 'bg-purple-100 text-purple-700',
      'compound': 'bg-amber-100 text-amber-700',
      'trace': 'bg-cyan-100 text-cyan-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头操作栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">施肥记录列表</h3>
          <IotDataIndicator devices={iotDevices} loading={iotLoading} />
          {onToggleStats && (
            <Button
              size="sm"
              onClick={onToggleStats}
            >
              <BarChart3 className="w-4 h-4" />
              统计分析
              {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onAdd}
          >
            <Plus className="w-4 h-4" />
            新增
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onBatchDeleteMode}
            className={operationMode === 'delete' ? 'bg-red-700' : ''}
          >
            <Trash2 className="w-4 h-4" />
            批量删除
          </Button>
          <Button
            size="sm"
            onClick={onExportMode}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow className="hover:bg-transparent">
              {showCheckbox && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">施肥编号</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">肥料名称</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">肥料类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">作物品种</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">温室位置</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">稀释比例</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">施肥量</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">总成本</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">施肥时间</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">数据来源</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作员</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 13 : 12} className="px-4 py-12 text-center text-gray-400">
                  暂无施肥记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => {
                const isIot = record.dataSource === 'auto_iot';
                return (
                  <TableRow
                    key={record.id}
                    className={`hover:bg-emerald-50 transition-colors ${
                      isIot ? 'border-l-4 border-l-green-400' : ''
                    }`}
                  >
                    {showCheckbox && (
                      <TableCell className="px-4 py-3">
                        <Input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </TableCell>
                    )}
                    {/* 施肥编号 - 蓝色链接 */}
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => onDetail(record)}
                        className="font-mono p-0 h-auto"
                        title="查看详情"
                      >
                        {record.fertilizerCode}
                      </Button>
                    </TableCell>
                    {/* 肥料名称 - 加粗 */}
                    <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                      {record.fertilizerName}
                    </TableCell>
                    {/* 肥料类型 - Badge */}
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(record.fertilizerType)}`}>
                        {getFertilizerTypeLabel(record.fertilizerType)}
                      </span>
                    </TableCell>
                    {/* 作物品种 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.cropName || '-'}
                    </TableCell>
                    {/* 温室位置 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.greenhouseName || '-'}
                    </TableCell>
                    {/* 稀释比例 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.dilutionRatio || '-'}
                    </TableCell>
                    {/* 施肥量 - 绿色加粗 */}
                    <TableCell className="px-4 py-3 text-sm font-bold text-emerald-600 whitespace-nowrap">
                      {record.quantity?.toLocaleString() || '0'} {record.unit || 'kg'}
                    </TableCell>
                    {/* 总成本 - amber */}
                    <TableCell className="px-4 py-3 text-sm font-medium text-amber-600 whitespace-nowrap">
                      {record.totalCost?.toLocaleString() || '0'} 元
                    </TableCell>
                    {/* 施肥时间 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.fertilizeTime || '-'}
                    </TableCell>
                    {/* 数据来源 - Badge */}
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {getSourceBadge(record.dataSource)}
                    </TableCell>
                    {/* 操作员 */}
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.operatorName || '-'}
                    </TableCell>
                    {/* 操作区 */}
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
                        {!isIot && (
                          <>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
