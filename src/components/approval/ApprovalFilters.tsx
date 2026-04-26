// ============================================================
// 审批筛选组件
// 文件路径：src/components/approval/ApprovalFilters.tsx
// 组件化结构：统一的审批筛选条件
// ============================================================

import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { ApprovalFilters, ApprovalType, ApprovalStatus } from '../../types/approval';

interface ApprovalFiltersProps {
  filters: ApprovalFilters;
  onChange: (filters: Partial<ApprovalFilters>) => void;
  onReset: () => void;
}

const approvalTypeOptions: { value: ApprovalType; label: string }[] = [
  { value: ApprovalType.MATERIAL_REQUEST, label: '领料单' },
  { value: ApprovalType.PURCHASE_REQUEST, label: '采购申请' },
  { value: ApprovalType.PRODUCTION_PLAN, label: '生产计划' },
  { value: ApprovalType.HARVEST_REQUEST, label: '采收申请' },
  { value: ApprovalType.RETURN_MATERIAL, label: '退料单' },
  { value: ApprovalType.LEAVE, label: '请假' },
  { value: ApprovalType.OVERTIME, label: '加班' },
  { value: ApprovalType.TRANSFER, label: '调岗' },
  { value: ApprovalType.RESIGNATION, label: '离职' },
];

const statusOptions: { value: ApprovalStatus; label: string }[] = [
  { value: ApprovalStatus.DRAFT, label: '草稿' },
  { value: ApprovalStatus.PENDING, label: '待审批' },
  { value: ApprovalStatus.APPROVED, label: '已通过' },
  { value: ApprovalStatus.PARTIALLY_APPROVED, label: '部分通过' },
  { value: ApprovalStatus.REJECTED, label: '已拒绝' },
  { value: ApprovalStatus.CANCELLED, label: '已撤回' },
];

const categoryOptions: { value: 'business' | 'hr' | 'quality'; label: string }[] = [
  { value: 'business', label: '业务审批' },
  { value: 'hr', label: 'HR审批' },
  { value: 'quality', label: '质量审批' },
];

const priorityOptions: { value: 'low' | 'normal' | 'high' | 'urgent'; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '加急' },
];

export function ApprovalFilters({ filters, onChange, onReset }: ApprovalFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localKeyword, setLocalKeyword] = useState(filters.keyword || '');

  const handleKeywordSearch = () => {
    onChange({ keyword: localKeyword });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleKeywordSearch();
    }
  };

  const toggleArrayFilter = <T extends string>(
    key: keyof ApprovalFilters,
    value: T,
    currentValues?: T[]
  ) => {
    const current = currentValues || [];
    const newValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ [key]: newValues.length > 0 ? newValues : undefined });
  };

  const hasActiveFilters =
    filters.keyword ||
    (filters.type?.length ?? 0) > 0 ||
    (filters.status?.length ?? 0) > 0 ||
    (filters.category?.length ?? 0) > 0 ||
    (filters.priority?.length ?? 0) > 0 ||
    filters.startDate ||
    filters.endDate;

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
      {/* 基础搜索 */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">关键词搜索</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索审批单标题、申请人、单号..."
              value={localKeyword}
              onChange={(e) => setLocalKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <button
          onClick={handleKeywordSearch}
          className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          搜索
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-10 px-4 border rounded-lg text-sm font-medium flex items-center gap-2 ${
            showAdvanced || hasActiveFilters
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          高级筛选
        </button>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="h-10 px-4 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            清除筛选
          </button>
        )}
      </div>

      {/* 高级筛选 */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* 审批类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">审批类型</label>
            <div className="flex flex-wrap gap-2">
              {approvalTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleArrayFilter('type', option.value, filters.type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.type?.includes(option.value)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 审批状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">审批状态</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleArrayFilter('status', option.value, filters.status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.status?.includes(option.value)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 类别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">审批类别</label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleArrayFilter('category', option.value, filters.category)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.category?.includes(option.value)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleArrayFilter('priority', option.value, filters.priority)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.priority?.includes(option.value)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 日期范围 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onChange({ startDate: e.target.value || undefined })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onChange({ endDate: e.target.value || undefined })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalFilters;
