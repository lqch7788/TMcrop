/**
 * 施肥数据表格组件
 * 列：施肥编号(链接→详情)、肥料名称(加粗)、肥料类型(Badge)、作物品种、
 *     温室位置、稀释比例、施肥量(绿色加粗)、总成本(amber)、
 *     施肥时间(日期时间)、数据来源(Badge)、操作员、操作区(查看/编辑/删除)
 * IoT记录行有绿色左边框，仅可查看不可编辑删除
 */
import React from 'react';
import { Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Plus, Download, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { FertilizerData } from '@/stores';
import { getDictItemName } from '@/stores/useDictionaryStore';
import IotDataIndicator, { IotDeviceStatus } from './IotDataIndicator';

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

// 简易分页
const PAGE_SIZE = 10;

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
  const totalPages = Math.ceil(data.length / PAGE_SIZE) || 1;
  const showCheckbox = operationMode === 'delete';
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const currentData = data.slice(startIdx, startIdx + PAGE_SIZE);

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
            <button
              onClick={onToggleStats}
              className="h-8 px-3 flex items-center gap-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              统计分析
              {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAdd}
            className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增
          </button>
          <button
            onClick={onBatchDeleteMode}
            className={`h-8 px-3 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${
              operationMode === 'delete'
                ? 'bg-red-700 text-white'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            批量删除
          </button>
          <button
            onClick={onExportMode}
            className="h-8 px-3 flex items-center gap-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">施肥编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">肥料名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">肥料类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物品种</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">温室位置</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">稀释比例</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">施肥量(kg)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总成本</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">施肥时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">数据来源</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作员</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 13 : 12} className="px-4 py-12 text-center text-gray-400">
                  暂无施肥记录
                </td>
              </tr>
            ) : (
              currentData.map((record) => {
                const isIot = record.dataSource === 'auto_iot';
                return (
                  <tr
                    key={record.id}
                    className={`hover:bg-emerald-50 transition-colors ${
                      isIot ? 'border-l-4 border-l-green-400' : ''
                    }`}
                  >
                    {showCheckbox && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    {/* 施肥编号 - 蓝色链接 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => onDetail(record)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
                        title="查看详情"
                      >
                        {record.fertilizerCode}
                      </button>
                    </td>
                    {/* 肥料名称 - 加粗 */}
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                      {record.fertilizerName}
                    </td>
                    {/* 肥料类型 - Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(record.fertilizerType)}`}>
                        {getFertilizerTypeLabel(record.fertilizerType)}
                      </span>
                    </td>
                    {/* 作物品种 */}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.cropName || '-'}
                    </td>
                    {/* 温室位置 */}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.greenhouseName || '-'}
                    </td>
                    {/* 稀释比例 */}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.dilutionRatio || '-'}
                    </td>
                    {/* 施肥量 - 绿色加粗 */}
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 whitespace-nowrap">
                      {record.quantity?.toLocaleString() || '0'} kg
                    </td>
                    {/* 总成本 - amber */}
                    <td className="px-4 py-3 text-sm font-medium text-amber-600 whitespace-nowrap">
                      {record.totalCost?.toLocaleString() || '0'} 元
                    </td>
                    {/* 施肥时间 */}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.fertilizeTime || '-'}
                    </td>
                    {/* 数据来源 - Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getSourceBadge(record.dataSource)}
                    </td>
                    {/* 操作员 */}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {record.operatorName || '-'}
                    </td>
                    {/* 操作区 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onDetail(record)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isIot && (
                          <>
                            <button
                              onClick={() => onEdit(record)}
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(record.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <span className="text-sm text-gray-500">共 {data.length} 条记录</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
