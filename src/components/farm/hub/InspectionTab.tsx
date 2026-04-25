/**
 * 农事任务中心 - 巡查记录Tab
 * 样式与 TaskDispatchPage 统一
 */

import React from 'react';
import { InspectionRecord } from '../../../types';
import { Plus, Eye, Edit, QrCode } from 'lucide-react';

// 巡查类型配置
const INSPECTION_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'farm', label: '种植巡查' },
  { value: 'equipment', label: '设备巡查' },
  { value: 'infrastructure', label: '设施巡查' },
  { value: 'other', label: '其他巡查' },
];

// 状态配置
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-100', text: 'text-green-700', label: '正常' },
  attention: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '需关注' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: '异常' },
};

interface InspectionTabProps {
  inspections: InspectionRecord[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  filters: { status: string; type: string; area: string; search: string };
  onFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
  onViewInspection?: (recordId: string) => void;
}

/**
 * 巡查记录Tab组件
 */
export function InspectionTab({
  inspections,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  filters,
  onFilterChange,
  onResetFilters,
  onViewInspection,
}: InspectionTabProps) {
  return (
    <div>
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">巡查类型:</span>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {INSPECTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">状态:</span>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">全部状态</option>
            <option value="normal">正常</option>
            <option value="attention">需关注</option>
            <option value="critical">异常</option>
          </select>
        </div>
        <button
          onClick={onResetFilters}
          className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          重置
        </button>
      </div>

      {/* 快捷操作 */}
      <div className="mb-4 p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-emerald-700">快捷操作:</span>
          <button
            onClick={() => window.location.href = '/inspection'}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" />
            新建巡查
          </button>
          <button className="px-3 py-1 text-sm text-emerald-600 hover:text-emerald-700">
            查看巡查计划
          </button>
          <button className="px-3 py-1 text-sm text-emerald-600 hover:text-emerald-700">
            巡查统计
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <QrCode className="w-5 h-5" />
          扫码录入
        </div>
      </div>

      {/* 巡查列表 */}
      {inspections.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <p>暂无巡查记录</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === inspections.length && inspections.length > 0}
                    onChange={() => selectedIds.length === inspections.length ? onClearSelection() : onSelectAll()}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查编号</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查类型</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">区域</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查员</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查时间</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">发现问题</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {inspections.map((inspection) => {
                const statusConfig = STATUS_CONFIG[inspection.status] || STATUS_CONFIG.normal;
                const typeLabel = INSPECTION_TYPES.find(t => t.value === inspection.inspectionType)?.label || '种植巡查';
                const issueCount = inspection.issues?.length || 0;
                return (
                  <tr key={inspection.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(inspection.id)}
                        onChange={() => onToggleSelect(inspection.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{inspection.recordCode}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{typeLabel}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{inspection.greenhouseName || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{inspection.inspectorName || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {inspection.checkDate} {inspection.checkTime}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {issueCount > 0 ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          inspection.status === 'critical' ? 'bg-red-100 text-red-700' :
                          inspection.status === 'attention' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {issueCount}个问题
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">无</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {onViewInspection ? (
                          <button
                            onClick={() => onViewInspection(inspection.id)}
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            详情
                          </button>
                        ) : (
                          <button
                            onClick={() => window.location.href = `/inspection?recordId=${inspection.id}`}
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            查看
                          </button>
                        )}
                        <button
                          onClick={() => window.location.href = `/inspection?recordId=${inspection.id}`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {inspections.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">共 {inspections.length} 条记录</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50" disabled>
              上一页
            </button>
            <span className="px-3 py-1 text-sm">第 1/1 页</span>
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50" disabled>
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InspectionTab;
