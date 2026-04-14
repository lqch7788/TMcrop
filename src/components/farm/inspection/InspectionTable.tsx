import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

// 巡查记录类型（简化版）
interface InspectionRecord {
  id: string;
  recordCode: string;
  inspectionType?: 'farm' | 'equipment' | 'infrastructure' | 'other';
  inspectorName: string;
  greenhouseName?: string;
  equipmentName?: string;
  infrastructureName?: string;
  remarks?: string;
  checkDate: string;
  weather: string;
  temperature: number;
  humidity: number;
  // 新增字段
  status: string; // normal/critical
  issueCategories?: string[]; // 问题分类列表
  issuePresets?: string[]; // 快速勾选的问题
  issueText?: string;
  issuePhotos?: string[];
  feedbackUsers?: string[]; // 反馈人员
  expectedCompletion?: string; // 期望完成时间
  // 原有字段保留
  issues: string[];
  images?: string[];
  issueStatus?: 'pending' | 'processing' | 'resolved';
}

interface InspectionTableProps {
  records: InspectionRecord[];
  currentPage: number;
  pageSize: number;
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  onSelectRow: (index: number) => void;
  onSelectAll: () => void;
  onViewDetail: (record: InspectionRecord) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// 获取状态标签组件
function getStatusBadge(status: string) {
  switch (status) {
    case 'normal':
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">正常</span>;
    case 'warning':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">注意</span>;
    case 'attention':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">需关注</span>;
    case 'critical':
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">异常</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未知</span>;
  }
}

/**
 * 巡查记录表格组件
 * 负责表格展示、分页、行选择等功能
 */
export function InspectionTable({
  records,
  currentPage,
  pageSize,
  selectedRows,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  onSelectRow,
  onSelectAll,
  onViewDetail,
  onPageChange,
  onPageSizeChange,
}: InspectionTableProps) {
  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const showSelection = exportMode || batchEditMode || batchDeleteMode;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showSelection && (
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === records.length && records.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查编号</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查类型</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">提交人</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">位置/对象</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查日期</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">天气</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">温度(°C)</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">湿度(%)</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查结果</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">问题分类</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">问题照片</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">反馈人员</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record, idx) => (
              <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                {showSelection && (
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(idx)}
                      onChange={() => onSelectRow(idx)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  <button
                    onClick={() => onViewDetail(record)}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {record.recordCode}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  {record.inspectionType === 'farm' && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">种植</span>
                  )}
                  {record.inspectionType === 'equipment' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">设备</span>
                  )}
                  {record.inspectionType === 'infrastructure' && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">设施</span>
                  )}
                  {record.inspectionType === 'other' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">其他</span>
                  )}
                  {!record.inspectionType && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{record.inspectorName}</span>
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-900">
                      {record.inspectionType === 'farm' && record.greenhouseName}
                      {record.inspectionType === 'equipment' && record.equipmentName}
                      {record.inspectionType === 'infrastructure' && record.infrastructureName}
                      {record.inspectionType === 'other' && record.remarks}
                      {!record.inspectionType && record.greenhouseName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.checkDate}</td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.weather}</td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.temperature}</td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.humidity}</td>
                <td className="px-4 py-3 text-center">
                  {record.status === 'normal' ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">正常</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">异常</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.issueCategories && record.issueCategories.length > 0 ? (
                    <div className="flex gap-1 justify-center flex-wrap">
                      {record.issueCategories.slice(0, 2).map((cat, i) => {
                        const categoryLabels: Record<string, string> = {
                          disease: '病害',
                          pest: '虫害',
                          environment: '环境',
                          growth: '长势',
                          equipment: '设备',
                          other: '其他'
                        };
                        return (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">
                            {categoryLabels[cat] || cat}
                          </span>
                        );
                      })}
                      {record.issueCategories.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{record.issueCategories.length - 2}</span>
                      )}
                    </div>
                  ) : record.issuePresets && record.issuePresets.length > 0 ? (
                    <div className="flex gap-1 justify-center flex-wrap">
                      {record.issuePresets.slice(0, 2).map((preset, i) => (
                        <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">{preset}</span>
                      ))}
                      {record.issuePresets.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{record.issuePresets.length - 2}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  {record.issuePhotos && record.issuePhotos.length > 0 ? (
                    <div className="flex justify-center gap-1">
                      {record.issuePhotos.slice(0, 3).map((img: string, imgIdx: number) => (
                        <div key={imgIdx} className="w-8 h-8 rounded overflow-hidden bg-gray-100">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {record.issuePhotos.length > 3 && (
                        <span className="flex items-center justify-center w-8 h-8 text-xs text-gray-500">+{record.issuePhotos.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.feedbackUsers && record.feedbackUsers.length > 0 ? (
                    <span className="text-red-600">{record.feedbackUsers.length}人</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-xs truncate">
                  {record.remarks || <span className="text-gray-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showSelection && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={onSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedRows.length === records.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {records.length} 条</span>
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
  );
}

export default InspectionTable;
