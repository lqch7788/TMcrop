/**
 * 育苗筛选工具栏组件
 */

import React, { useState } from 'react';
import { Search, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { SeedlingFilters } from '../../../../types/crop';
import { Button } from '@/components/ui/button';

interface SeedlingFilterProps {
  filters: SeedlingFilters;
  onChange: (filters: SeedlingFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  cropNames: Array<{ value: string; label: string }>;
  seedlingTypes: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}

export function SeedlingFilter({
  filters,
  onChange,
  onSearch,
  onReset,
  cropNames,
  seedlingTypes,
  sites,
  statusOptions
}: SeedlingFilterProps) {
  // More展开状态
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 作物品种 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">作物品种</label>
          <select
            value={filters.cropName}
            onChange={(e) => onChange({ ...filters, cropName: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {cropNames.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 育苗批号 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">育苗批号</label>
          <input
            type="text"
            value={filters.seedlingCode}
            onChange={(e) => onChange({ ...filters, seedlingCode: e.target.value })}
            placeholder="请输入育苗批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 育苗方式 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">育苗方式</label>
          <select
            value={filters.seedlingType}
            onChange={(e) => onChange({ ...filters, seedlingType: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {seedlingTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* 种源批号 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">种源批号</label>
          <input
            type="text"
            value={filters.sourceCode}
            onChange={(e) => onChange({ ...filters, sourceCode: e.target.value })}
            placeholder="请输入种源批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 温室场地 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">温室场地</label>
          <select
            value={filters.siteName}
            onChange={(e) => onChange({ ...filters, siteName: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {sites.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 状态 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2">
          <Button
            variant="blue"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? (
              <>
                <ChevronUp className="w-4 h-4" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                More
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>

      {/* 展开的更多筛选条件 */}
      {showMore && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 items-end">
            {/* 开始日期 */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 结束日期 */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 记录人员 */}
            <div className="flex-1 min-w-[120px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">记录人员</label>
              <input
                type="text"
                value={filters.createBy}
                onChange={(e) => onChange({ ...filters, createBy: e.target.value })}
                placeholder="请输入记录人员"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 初始数量范围（新增） */}
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">初始数量范围</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={filters.initialCountMin ?? ''}
                  onChange={(e) => onChange({ ...filters, initialCountMin: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最小"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  value={filters.initialCountMax ?? ''}
                  onChange={(e) => onChange({ ...filters, initialCountMax: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最大"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 成苗数量范围（新增） */}
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">成苗数量范围</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={filters.survivalCountMin ?? ''}
                  onChange={(e) => onChange({ ...filters, survivalCountMin: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最小"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  value={filters.survivalCountMax ?? ''}
                  onChange={(e) => onChange({ ...filters, survivalCountMax: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最大"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 损耗数量范围（新增） */}
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">损耗数量范围</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={filters.lossCountMin ?? ''}
                  onChange={(e) => onChange({ ...filters, lossCountMin: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最小"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  value={filters.lossCountMax ?? ''}
                  onChange={(e) => onChange({ ...filters, lossCountMax: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最大"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 剩余数量范围（新增） */}
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">剩余数量范围</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={filters.surplusMin ?? ''}
                  onChange={(e) => onChange({ ...filters, surplusMin: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最小"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  value={filters.surplusMax ?? ''}
                  onChange={(e) => onChange({ ...filters, surplusMax: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最大"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 成苗率范围（新增） */}
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">成苗率范围(%)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={filters.survivalRateMin ?? ''}
                  onChange={(e) => onChange({ ...filters, survivalRateMin: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最小"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  value={filters.survivalRateMax ?? ''}
                  onChange={(e) => onChange({ ...filters, survivalRateMax: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最大"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 损耗率范围（新增） */}
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">损耗率范围(%)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={filters.lossRateMin ?? ''}
                  onChange={(e) => onChange({ ...filters, lossRateMin: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最小"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  value={filters.lossRateMax ?? ''}
                  onChange={(e) => onChange({ ...filters, lossRateMax: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="最大"
                  className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
