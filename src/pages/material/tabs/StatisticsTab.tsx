// StatisticsTab 组件 - 领料统计页面主组件
// 负责组合所有子组件，呈现完整的统计页面功能
// 2026-09-26: 删除 AI 助手（AIPanel）—— 功能已在智能任务中心存在，不应放在这里
import { Calendar, BarChart2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

// 导入hook
import { useStatisticsTab } from './hooks/useStatisticsTab';

// 导入子组件
import { MonthlyDashboard, CategorySummaryCards } from './components/MonthlyDashboard';
import { MonthlyFilters } from './components/MonthlyFilters';
import { MonthlyTable } from './components/MonthlyTable';
import { MaterialFilters } from './components/MaterialFilters';
import { MaterialTable } from './components/MaterialTable';
import { MaterialTopRanking } from './components/MaterialTopRanking';
import { Pagination } from '@/components/ui';

// 弹窗组件
import { ExportTypeModal } from '../../../components/materialReceiving/modals/ExportTypeModal';
import { StatDetailModal } from '../../../components/materialReceiving/modals/StatDetailModal';

// ============================================
// 领料统计页面主组件
// ============================================
export default function StatisticsTab() {
  // 使用自定义hook管理所有状态和逻辑
  const hook = useStatisticsTab();

  // ============================================
  // 辅助函数 - 用于表格行选择
  // ============================================
  const handleRowSelectChange = (idx: number, checked: boolean) => {
    if (checked) {
      hook.setStatSelectedRows([...hook.statSelectedRows, idx]);
    } else {
      hook.setStatSelectedRows(hook.statSelectedRows.filter(r => r !== idx));
    }
  };

  // ============================================
  // JSX - 统计Tab内容
  // ============================================
  return (
    <>
      {/* Tab切换 - 子Tab（2026-09-27 用户要求：两个子 tab 紧凑分段控件，不再分散） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-4 pb-3 mb-4">
        <div className="flex items-center justify-between">
          {/* 紧凑分段控件：月度汇总 / 分类汇总 */}
          <div className="inline-flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { hook.setStatActiveTab('monthly'); hook.setStatCurrentPage(1); }}
              className={`text-sm font-semibold ${
                hook.statActiveTab === 'monthly'
                  ? 'bg-white shadow-sm text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              月度汇总
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { hook.setStatActiveTab('material'); hook.setStatCurrentPage(1); }}
              className={`text-sm font-semibold ${
                hook.statActiveTab === 'material'
                  ? 'bg-white shadow-sm text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              分类汇总
            </Button>
          </div>
          {/* 2026-09-27 审计修复（B2）：数据刷新按钮——申请/出库操作后手动刷新统计 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => hook.refreshStatistics()}
            disabled={hook.statRefreshing}
            className="text-gray-500 hover:text-gray-700"
            title="刷新统计数据"
          >
            <RefreshCw className={`w-4 h-4 ${hook.statRefreshing ? 'animate-spin' : ''}`} />
            {hook.statRefreshing ? '刷新中...' : '刷新'}
          </Button>
        </div>

        <div className="px-6 pt-6 pb-0">
          {/* 仪表盘 - 仅月度汇总Tab显示 */}
          {hook.statActiveTab === 'monthly' && (
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-6 mb-6 shadow-lg shadow-cyan-500/10">
              {/* 仪表盘主体 */}
              <MonthlyDashboard
                yearFilter={hook.statYearFilter}
                selectedMonth={hook.selectedMonth}
                onMonthChange={hook.setSelectedMonth}
                yearCategories={hook.statYearCategorySummary}
                yearAmount={hook.statYearCategorySummary.reduce((sum: number, c: any) => sum + c.amount, 0)}
              />
              {/* 分类汇总卡片（按年联动，2026-09-27 A1） */}
              <CategorySummaryCards yearCategories={hook.statYearCategorySummary} />
            </div>
          )}

          {/* 月度筛选表单 - 月度汇总Tab专用 */}
          {hook.statActiveTab === 'monthly' && (
            <MonthlyFilters
              yearFilter={hook.statYearFilter}
              monthFilter={hook.statMonthFilter}
              deptFilter={hook.statMonthlyDeptFilter}
              deptOptions={hook.monthlyDeptOptions}
              onYearChange={hook.setStatYearFilter}
              onMonthChange={hook.setStatMonthFilter}
              onDeptChange={hook.setStatMonthlyDeptFilter}
              onReset={hook.handleStatReset}
              onPageChange={hook.setStatCurrentPage}
              onExpandedMonthsChange={hook.resetExpandedMonths}
            />
          )}

          {/* 物料筛选器 - 使用StatSearchBar组件 */}
          {hook.statActiveTab === 'material' && (
            <MaterialFilters
              materialSearch={hook.statMaterialSearch}
              departmentFilter={hook.statDepartmentFilter}
              dateRange={hook.statDateRange}
              categoryFilter={hook.statCategoryFilter}
              warehouseFilter={hook.statWarehouseFilter}
              supplierFilter={hook.statSupplierFilter}
              productionPlanFilter={hook.statProductionPlanFilter}
              usageAreaFilter={hook.statUsageAreaFilter}
              requisitionerFilter={hook.statRequisitionerFilter}
              quickFilterPeriod={hook.statQuickFilterPeriod}
              filterOptions={hook.filterOptions}
              onMaterialSearchChange={hook.setStatMaterialSearch}
              onDepartmentChange={hook.setStatDepartmentFilter}
              onDateRangeChange={hook.setStatDateRange}
              onCategoryChange={hook.setStatCategoryFilter}
              onWarehouseChange={hook.setStatWarehouseFilter}
              onSupplierChange={hook.setStatSupplierFilter}
              onProductionPlanChange={hook.setStatProductionPlanFilter}
              onUsageAreaChange={hook.setStatUsageAreaFilter}
              onRequisitionerChange={hook.setStatRequisitionerFilter}
              onQuickFilterChange={hook.handleStatQuickFilter}
              onReset={hook.handleStatReset}
            />
          )}

          {/* 月度汇总表格 - 按物料分类统计（折叠模式） */}
          {hook.statActiveTab === 'monthly' && (
            <MonthlyTable
              yearFilter={hook.statYearFilter}
              monthFilter={hook.statMonthFilter}
              expandedMonths={hook.expandedMonths}
              sortConfig={hook.sortConfig}
              exportMode={hook.statExportMode}
              selectedRows={hook.statSelectedRows}
              monthSummaries={hook.getSortedMonthSummaries()}
              getMonthStats={hook.getMonthStats}
              getCategoryStats={hook.getCategoryStats}
              onToggleExpand={hook.toggleMonthExpand}
              onSort={hook.handleMonthSort}
              onSelectAll={hook.handleStatSelectAll}
              onRowSelectChange={handleRowSelectChange}
              getAllMonthKeys={hook.getAllMonthKeys}
              onExportConfirm={hook.handleStatExportConfirm}
              onCancelExport={hook.handleStatCancelExport}
              onExportModeChange={hook.setStatExportMode}
            />
          )}

          {/* 2026-09-27 审计缺功能补完（B7）：物料领用 TOP10 排行 */}
          {hook.statActiveTab === 'material' && (
            <MaterialTopRanking data={hook.materialStatFilteredData} />
          )}

          {/* 物料汇总表格 */}
          {hook.statActiveTab === 'material' && (
            <MaterialTable
              data={hook.materialStatFilteredData}
              currentPage={hook.statCurrentPage}
              pageSize={hook.statPageSize}
              exportMode={hook.statExportMode}
              selectedRows={hook.statSelectedRows}
              onPageChange={hook.setStatCurrentPage}
              onPageSizeChange={hook.setStatPageSize}
              onSelectAll={hook.handleMaterialStatSelectAll}
              onRowSelectChange={handleRowSelectChange}
              onExportModeChange={hook.setStatExportMode}
              onExportConfirm={hook.handleMaterialStatExportConfirm}
              onCancelExport={hook.handleMaterialStatCancelExport}
              onViewDetail={(record) => {
                hook.setStatSelectedRecord(record);
                hook.setStatShowDetailModal(true);
              }}
            />
          )}

          {/* 分页组件 */}
          {hook.statActiveTab === 'material' && (
            <Pagination
              currentPage={hook.statCurrentPage}
              totalPages={Math.ceil(hook.materialStatFilteredData.length / hook.statPageSize) || 1}
              pageSize={hook.statPageSize}
              onPageChange={hook.setStatCurrentPage}
              onPageSizeChange={hook.setStatPageSize}
              pageSizeOptions={[10, 20, 50]}
              showPageSize
            />
          )}
        </div>
      </div>

      {/* 导出格式选择弹窗 */}
      <ExportTypeModal
        isOpen={hook.statShowExportTypeModal}
        exportFileType={hook.statExportFileType}
        onChange={hook.setStatExportFileType}
        onConfirm={hook.statExportTarget === 'monthly' ? hook.confirmStatExport : hook.confirmMaterialStatExport}
        onClose={() => hook.setStatShowExportTypeModal(false)}
      />

      {/* 详情查看弹窗 */}
      <StatDetailModal
        isOpen={hook.statShowDetailModal}
        record={hook.statSelectedRecord}
        onClose={() => hook.setStatShowDetailModal(false)}
      />
    </>
  );
}
