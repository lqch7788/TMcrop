/**
 * 指标数据页面主组件
 * 管理各类生产管理指标
 *
 * 拆分后的结构：
 * - types/indicators.types.ts - 类型定义
 * - hooks/useIndicators.ts - 状态管理和业务逻辑
 * - components/Indicators/IndicatorsFilters.tsx - 筛选器组件
 * - components/Indicators/IndicatorsTable.tsx - 表格组件
 * - components/Indicators/IndicatorsPanels.tsx - 分类管理面板
 * - components/Indicators/IndicatorsAnalyzePanel.tsx - 达成分析面板
 * - components/Indicators/IndicatorsEvaluatePanel.tsx - 考核评价面板
 * - components/Indicators/IndicatorsModals/*.tsx - 弹窗组件
 */
import { Award, BarChart3, Download, PieChart, Plus, Target, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { useIndicators } from './hooks/useIndicators';
import IndicatorsFilters from './components/Indicators/IndicatorsFilters';
import IndicatorsTable from './components/Indicators/IndicatorsTable';
import CategoryPanel from './components/Indicators/IndicatorsPanels';
import AnalyzePanel from './components/Indicators/IndicatorsAnalyzePanel';
import EvaluatePanel from './components/Indicators/IndicatorsEvaluatePanel';
import CreateModal from './components/Indicators/IndicatorsModals/CreateModal';
import DetailModal from './components/Indicators/IndicatorsModals/DetailModal';
import DeleteModal from './components/Indicators/IndicatorsModals/DeleteModal';
import ExportModal from './components/Indicators/IndicatorsModals/ExportModal';

export default function Indicators() {
  const {
    evaluationData,
    analyzeData,
    categorySummary,
    searchKeyword,
    categoryFilter,
    setSearchKeyword,
    setCategoryFilter,
    activeTab,
    setActiveTab,
    showModal,
    modalType,
    selectedIndicator,
    handleAdd,
    handleEvaluate,
    handleCloseModal,
    handleSave,
    showDeleteModal,
    deleteItem,
    handleDeleteConfirm,
    handleCloseDeleteModal,
    exportMode,
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExport,
    handleExportConfirm,
    handleDoExport,
    handleCancelExport,
    handleCloseExportModal,
    selectedIds,
    currentPage,
    pageSize,
    totalPages,
    paginatedIndicators,
    filteredIndicators,
    handlePageChange,
    handlePageSizeChange,
    handleSelectAll,
    handleToggleSelect,
    handleView,
    handleAnalyze,
    handleEdit,
    handleDelete,
  } = useIndicators();

  return (
    <div className="space-y-6">
      {/* Page Header - 页面头部，与基地总览页面保持一致 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">指标数据</h1>
              <p className="text-gray-500">管理各类生产管理指标</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEvaluate}
            >
              <Award className="w-4 h-4" />考核评价
            </Button>
            {!exportMode ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4" />导出
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExportConfirm}
                >
                  <Download className="w-4 h-4" />确认导出{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelExport}
                >
                  <X className="w-4 h-4" /> 取消
                </Button>
              </>
            )}
            <Button
              variant="blue"
              size="sm"
              onClick={handleAdd}
            >
              <Plus className="w-4 h-4" />新增指标
            </Button>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-xl p-1 shadow-sm">
        <TabsList className="grid w-full grid-cols-4 gap-1 p-1 bg-gray-100/80 rounded-xl">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />指标列表
          </TabsTrigger>
          <TabsTrigger value="category" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />分类管理
          </TabsTrigger>
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <Target className="w-4 h-4" />达成分析
          </TabsTrigger>
          <TabsTrigger value="evaluate" className="flex items-center gap-2">
            <Award className="w-4 h-4" />考核评价
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <IndicatorsFilters
            searchKeyword={searchKeyword}
            categoryFilter={categoryFilter}
            onSearchChange={setSearchKeyword}
            onCategoryChange={setCategoryFilter}
          />

          <IndicatorsTable
            indicators={paginatedIndicators}
            selectedIds={selectedIds}
            exportMode={exportMode}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            totalCount={filteredIndicators.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSelectAll={handleSelectAll}
            onToggleSelect={handleToggleSelect}
            onView={handleView}
            onAnalyze={handleAnalyze}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="category" className="mt-4">
          <CategoryPanel
            categorySummary={categorySummary}
            indicators={paginatedIndicators}
          />
        </TabsContent>

        <TabsContent value="analyze" className="mt-4">
          <AnalyzePanel analyzeData={analyzeData} />
        </TabsContent>

        <TabsContent value="evaluate" className="mt-4">
          <EvaluatePanel evaluationData={evaluationData} />
        </TabsContent>
      </Tabs>

      {/* 创建/编辑弹窗 */}
      <CreateModal
        isOpen={showModal && (modalType === 'add' || modalType === 'edit')}
        indicator={selectedIndicator}
        onClose={handleCloseModal}
        onSave={handleSave}
      />

      {/* 详情/分析/评价弹窗 */}
      <DetailModal
        isOpen={showModal && (modalType === 'view' || modalType === 'analyze' || modalType === 'evaluate')}
        indicator={selectedIndicator}
        modalType={modalType}
        onClose={handleCloseModal}
      />

      {/* 删除确认弹窗 */}
      <DeleteModal
        isOpen={showDeleteModal}
        item={deleteItem}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
      />

      {/* 导出弹窗 */}
      <ExportModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedIds.length}
        totalCount={filteredIndicators.length}
        onClose={handleCloseExportModal}
        onFormatChange={setExportFormat}
        onConfirm={handleDoExport}
      />
    </div>
  );
}
