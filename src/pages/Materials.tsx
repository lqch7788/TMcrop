/**
 * 仓库物料页面主组件
 * 仓库物料库存管理
 *
 * 拆分后的结构：
 * - types/materials.types.ts - 类型定义
 * - hooks/useMaterials.ts - 状态管理和业务逻辑
 * - components/Materials/MaterialsFilters.tsx - 筛选器组件
 * - components/Materials/MaterialsTable.tsx - 物料表格组件
 * - components/Materials/MaterialsCodeGenerator.tsx - 编码生成器
 * - components/Materials/MaterialsModals/AddInboundModal.tsx - 新增入库弹窗
 * - components/Materials/MaterialsModals/ExportFormatModal.tsx - 导出格式弹窗
 */
import { Package, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useMaterials } from './hooks/useMaterials';
import MaterialsFilters from './components/Materials/MaterialsFilters';
import MaterialsTable from './components/Materials/MaterialsTable';
import MaterialsCodeGenerator from './components/Materials/MaterialsCodeGenerator';
import AddInboundModal from './components/Materials/MaterialsModals/AddInboundModal';
import ExportFormatModal from './components/Materials/MaterialsModals/ExportFormatModal';
import InboundTable from '../components/materials/InboundTable';

export default function Materials() {
  const {
    activeTab,
    setActiveTab,
    code,
    name,
    category,
    supplier,
    location,
    searchBigCategory,
    searchMidCategory,
    searchSubCategory,
    showLowStock,
    setCode,
    setName,
    setCategory,
    setSupplier,
    setLocation,
    setSearchBigCategory,
    setSearchMidCategory,
    setSearchSubCategory,
    setShowLowStock,
    handleReset,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    inboundPage,
    inboundPageSize,
    setInboundPage,
    setInboundPageSize,
    showAddModal,
    setShowAddModal,
    exportMode,
    selectedRows,
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExportClick,
    handleSelectAll,
    handleSelectRow,
    handleConfirmExport,
    handleCancelExport,
    handleDoExport,
    setShowExportModal,
    newInbound,
    codeError,
    nameError,
    handleCategoryChange,
    generateOrderCode,
    checkCodeDuplicate,
    checkNameDuplicate,
    handleSaveInbound,
    handleCloseModal,
    codeGen,
    codeGenCollapsed,
    codeGenError,
    codeGenSuccess,
    copySuccess,
    handleCodeGenCategoryChange,
    getCodeGenMidCategories,
    getCodeGenSubCategories,
    handleCodeGen,
    handleVerifyCode,
    handleCopyCode,
    setCodeGenCollapsed,
    can,
    canCreate,
    canExport,
    filteredMaterials,
    lowStockCount,
    inboundRecords,
    bigCategories,
    simpleCategories,
  } = useMaterials();

  // 处理低库存按钮点击
  const handleLowStockClick = () => {
    setShowLowStock(!showLowStock);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">仓库物料</h1>
              <p className="text-gray-500">仓库物料库存管理</p>
            </div>
          </div>
          {lowStockCount > 0 && (
            <Button
              variant={showLowStock ? 'destructive' : 'secondary'}
              onClick={handleLowStockClick}
              className={`flex items-center gap-2 ${
                showLowStock ? '' : 'text-amber-700 hover:text-amber-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">库存不足</span>
              <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">{lowStockCount}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'secondary'}
          onClick={() => { setActiveTab('overview'); setCurrentPage(1); }}
        >
          物料库存
        </Button>
        <Button
          variant={activeTab === 'inbound' ? 'default' : 'secondary'}
          onClick={() => { setActiveTab('inbound'); setCurrentPage(1); }}
        >
          物料入库
        </Button>
      </div>

      {/* 物料库存 */}
      {activeTab === 'overview' && (
        <>
          {/* 筛选器 */}
          <MaterialsFilters
            code={code}
            name={name}
            category={category}
            supplier={supplier}
            location={location}
            searchBigCategory={searchBigCategory}
            searchMidCategory={searchMidCategory}
            searchSubCategory={searchSubCategory}
            showLowStock={showLowStock}
            exportMode={exportMode}
            selectedRows={selectedRows}
            filteredMaterials={filteredMaterials}
            canExport={canExport}
            bigCategories={bigCategories}
            simpleCategories={simpleCategories}
            onCodeChange={setCode}
            onNameChange={setName}
            onCategoryChange={setCategory}
            onSupplierChange={setSupplier}
            onLocationChange={setLocation}
            onSearchBigCategoryChange={setSearchBigCategory}
            onSearchMidCategoryChange={setSearchMidCategory}
            onSearchSubCategoryChange={setSearchSubCategory}
            onShowLowStockChange={setShowLowStock}
            onReset={handleReset}
            onExportClick={handleExportClick}
            onConfirmExport={handleConfirmExport}
            onCancelExport={handleCancelExport}
            onSelectAll={handleSelectAll}
          />

          {/* 库存表格 */}
          <MaterialsTable
            filteredMaterials={filteredMaterials}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            exportMode={exportMode}
            selectedRows={selectedRows}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectRow}
          />
        </>
      )}

      {/* 物料入库 */}
      {activeTab === 'inbound' && (
        <>
          {/* 编码生成器 */}
          <MaterialsCodeGenerator
            codeGen={codeGen}
            collapsed={codeGenCollapsed}
            error={codeGenError}
            success={codeGenSuccess}
            copySuccess={copySuccess}
            bigCategories={bigCategories}
            onCodeGenChange={handleCodeGenCategoryChange}
            onGenerate={handleCodeGen}
            onVerify={handleVerifyCode}
            onCopy={handleCopyCode}
            onToggleCollapse={() => setCodeGenCollapsed(!codeGenCollapsed)}
            getMidCategories={getCodeGenMidCategories}
            getSubCategories={getCodeGenSubCategories}
          />

          {/* 入库记录表格 */}
          <InboundTable
            records={inboundRecords}
            currentPage={inboundPage}
            pageSize={inboundPageSize}
            canCreate={canCreate}
            canEdit={canCreate}
            can={can}
            onPageChange={setInboundPage}
            onPageSizeChange={setInboundPageSize}
            onAddClick={() => setShowAddModal(true)}
          />
        </>
      )}

      {/* 新增入库弹窗 */}
      <AddInboundModal
        show={showAddModal}
        newInbound={newInbound}
        codeError={codeError}
        nameError={nameError}
        onClose={handleCloseModal}
        onSave={handleSaveInbound}
        onNewInboundChange={handleCategoryChange}
        onGenerateOrderCode={generateOrderCode}
        onCheckCodeDuplicate={checkCodeDuplicate}
        onCheckNameDuplicate={checkNameDuplicate}
      />

      {/* 导出格式弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedRowsCount={selectedRows.length}
        onClose={() => setShowExportModal(false)}
        onExportFormatChange={setExportFormat}
        onDoExport={handleDoExport}
      />
    </div>
  );
}
