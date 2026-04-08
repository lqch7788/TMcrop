/**
 * 绩效考核页面容器
 */
import { useState } from 'react';
import { Award, TrendingUp, Users } from 'lucide-react';
import { usePerformance } from './hooks/usePerformance';
import { PerformanceTable } from './PerformanceTable';
import { PerformanceDetailModal } from './PerformanceDetailModal';
import { PerformanceChart } from './PerformanceChart';
import { PerformanceFilters } from './PerformanceFilters';

export function PerformancePage() {
  const {
    filters,
    pagination,
    selectedRecord,
    showDetailModal,
    filteredData,
    paginatedData,
    totalPages,
    totalCount,
    setFilters,
    setPagination,
    handleViewDetail,
    handleCloseDetail,
    handleResetFilters,
  } = usePerformance();

  // 计算统计数据
  const stats = {
    total: filteredData.length,
    evaluated: filteredData.filter((r) => r.status === '已评估').length,
    avgScore:
      filteredData.length > 0
        ? Math.round(
            filteredData.reduce((sum, r) => sum + r.totalScore, 0) / filteredData.length
          )
        : 0,
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">绩效考核</h1>
            <p className="text-xs text-gray-500">员工绩效考核评分与排名</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">考核人数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.evaluated}</p>
              <p className="text-xs text-gray-500">已评估</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.avgScore}</p>
              <p className="text-xs text-gray-500">平均得分</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <PerformanceFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* 图表 */}
      <PerformanceChart records={filteredData.slice(0, 5)} />

      {/* 表格 */}
      <PerformanceTable
        records={paginatedData}
        currentPage={pagination.currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pagination.pageSize}
        onPageChange={(page) => setPagination({ currentPage: page })}
        onPageSizeChange={(size) => setPagination({ pageSize: size })}
        onViewDetail={handleViewDetail}
      />

      {/* 详情弹窗 */}
      <PerformanceDetailModal
        record={selectedRecord}
        open={showDetailModal}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
