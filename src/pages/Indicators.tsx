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
import { BarChart3, Download, Plus, Award, PieChart, Target } from 'lucide-react';
import { Button } from '../components/ui/button';
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
import { useToast } from '../contexts/ToastContext';

export default function Indicators() {
  const { toast } = useToast();
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
    showDeleteModal,
    deleteItem,
    handleDeleteConfirm,
    handleCloseDeleteModal,
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExport,
    handleExportConfirm,
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

  // 保存操作
  const handleSave = () => {
    handleCloseModal();
    toast.success('保存成功');
  };

  return (
    <div className="p-6 bg-[#F2F6FA] min-h-screen">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
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
              onClick={handleEvaluate}
              className="flex items-center gap-2"
            >
              <Award className="w-4 h-4" />考核评价
            </Button>
            <Button
              variant="default"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />导出{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </Button>
            <Button
              variant="blue"
              onClick={handleAdd}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />新增指标
            </Button>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
        <div className="flex border-b border-gray-200">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 ${activeTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : ''}`}
          >
            <BarChart3 className="w-4 h-4" />指标列表
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('category')}
            className={`flex items-center gap-2 ${activeTab === 'category' ? 'text-blue-600 border-b-2 border-blue-600' : ''}`}
          >
            <PieChart className="w-4 h-4" />分类管理
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('analyze')}
            className={`flex items-center gap-2 ${activeTab === 'analyze' ? 'text-blue-600 border-b-2 border-blue-600' : ''}`}
          >
            <Target className="w-4 h-4" />达成分析
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('evaluate')}
            className={`flex items-center gap-2 ${activeTab === 'evaluate' ? 'text-blue-600 border-b-2 border-blue-600' : ''}`}
          >
            <Award className="w-4 h-4" />考核评价
          </Button>
        </div>
      </div>

      {/* 指标列表 */}
      {activeTab === 'list' && (
        <div>
          <IndicatorsFilters
            searchKeyword={searchKeyword}
            categoryFilter={categoryFilter}
            onSearchChange={setSearchKeyword}
            onCategoryChange={setCategoryFilter}
          />

          <IndicatorsTable
            indicators={paginatedIndicators}
            selectedIds={selectedIds}
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
        </div>
      )}

      {/* 分类管理 */}
      {activeTab === 'category' && (
        <CategoryPanel
          categorySummary={categorySummary}
          indicators={paginatedIndicators}
        />
      )}

      {/* 达成分析 */}
      {activeTab === 'analyze' && (
        <AnalyzePanel analyzeData={analyzeData} />
      )}

      {/* 考核评价 */}
      {activeTab === 'evaluate' && (
        <EvaluatePanel evaluationData={evaluationData} />
      )}

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
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
