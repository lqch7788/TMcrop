/**
 * 物料入库页面
 * 从原始 WarehouseInboundPage 拆分后重构，整合各子组件
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Download, ChevronDown, ChevronRight, X } from 'lucide-react';
import PageHeader from '@/components/warehouse/PageHeader';
import { Button } from '@/components/ui';
import { useWarehouseInbound } from './hooks/useWarehouseInbound';
import { WarehouseInboundFilters } from './components/WarehouseInboundFilters';
import { WarehouseInboundTable } from './components/WarehouseInboundTable';
import { WarehouseInboundCodeGen } from './components/WarehouseInboundCodeGen';
import {
  InboundDetailModal,
  InboundDeleteConfirmModal,
  InboundExportModal,
  InboundAddModal,
  InboundEditModal,
  InboundBatchEditModal,
} from './components/WarehouseInboundModals';

export default function WarehouseInboundPage() {
  const navigate = useNavigate();

  // 使用 Hook 管理所有状态和业务逻辑
  const {
    // 编码生成相关
    codeGenExpanded,
    setCodeGenExpanded,
    codeGen,
    codeGenError,
    codeGenSuccess,
    copySuccess,
    handleGenerateCode,
    handleCopyCode,
    handleResetCodeGen,
    handleCodeGenChange,

    // 分页相关
    inboundPage,
    setInboundPage,
    inboundPageSize,
    setInboundPageSize,
    totalPages,

    // 选择相关
    selectedRows,
    editMode,
    setEditMode,
    deleteMode,
    setDeleteMode,
    exportMode,
    setExportMode,

    // 弹窗相关 - 使用 set 方法关闭弹窗
    showInboundDetailModal,
    setShowInboundDetailModal,
    showInboundEditModal,
    setShowInboundEditModal,
    showInboundAddModal,
    setShowInboundAddModal,
    showInboundDeleteModal,
    setShowInboundDeleteModal,
    showBatchEditModal,
    setShowBatchEditModal,
    showExportModal,
    setShowExportModal,

    // 搜索筛选相关
    inboundSearchCode,
    setInboundSearchCode,
    inboundSearchSupplier,
    setInboundSearchSupplier,
    inboundSearchStatus,
    setInboundSearchStatus,
    inboundSearchMaterialName,
    setInboundSearchMaterialName,
    inboundSearchMaterialCode,
    setInboundSearchMaterialCode,
    resetSearchFilters,

    // 选中记录相关
    selectedInboundRecord,
    selectedInboundRecords,

    // 计算属性
    displayedRecords,
    selectedRecords,
    isAllSelected,
    filteredRecords,

    // 展开状态
    expandedRows,

    // 操作方法
    onSelectAll,
    onSelectRow,
    onCancelSelection,
    onConfirmExport,
    onViewRecord,
    onEditRecord,
    onBatchDeleteRecords,
    onConfirmInboundDelete,
    onSaveInboundEdit,
    onBatchSaveRecord,
    onAddRecord,
    onGenerateOrderCode,
    onSaveNewInbound,
    onConfirmEdit,
    onConfirmDelete,
    onToggleExpand,
  } = useWarehouseInbound();

  // 判断是否有任何模式激活
  const hasActiveMode = editMode || deleteMode || exportMode;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader title="物料入库" subtitle="物料入库记录管理" />

      {/* Tab切换按钮 + 编码规则 */}
      <div className="flex items-center gap-4">
        <div className="h-6 w-px bg-gray-500"></div>
        <Button
          size="sm"
          onClick={() => navigate('/code-rule')}
        >
          编码规则 &gt;&gt;
        </Button>
        <span className="text-base font-bold text-blue-600">物料编码生成</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCodeGenExpanded(!codeGenExpanded)}
          title={codeGenExpanded ? '收起' : '展开'}
        >
          {codeGenExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
        </Button>
      </div>

      {/* 编码规则生成器 */}
      {codeGenExpanded && (
        <WarehouseInboundCodeGen
          expanded={codeGenExpanded}
          onToggleExpand={() => setCodeGenExpanded(!codeGenExpanded)}
          codeGen={codeGen}
          onCodeGenChange={handleCodeGenChange}
          onGenerate={handleGenerateCode}
          onCopy={handleCopyCode}
          onReset={handleResetCodeGen}
          error={codeGenError}
          success={codeGenSuccess}
          copySuccess={copySuccess}
        />
      )}

      {/* 入库记录搜索栏 */}
      <WarehouseInboundFilters
        searchCode={inboundSearchCode}
        searchSupplier={inboundSearchSupplier}
        searchStatus={inboundSearchStatus}
        searchMaterialName={inboundSearchMaterialName}
        searchMaterialCode={inboundSearchMaterialCode}
        onSearchCodeChange={setInboundSearchCode}
        onSearchSupplierChange={setInboundSearchSupplier}
        onSearchStatusChange={setInboundSearchStatus}
        onSearchMaterialNameChange={setInboundSearchMaterialName}
        onSearchMaterialCodeChange={setInboundSearchMaterialCode}
        onReset={resetSearchFilters}
      />

      {/* 入库记录表格区域 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 表格头部工具栏 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          {/* 标题和选择信息 */}
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
            {hasActiveMode && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="link"
                  size="sm"
                  onClick={onSelectAll}
                >
                  {isAllSelected ? '全不选' : '全选'}
                </Button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 正常模式按钮 */}
            {!hasActiveMode ? (
              <>
                <Button size="sm" onClick={onAddRecord}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
                <Button size="sm" variant="blue" onClick={() => setEditMode(true)}>
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteMode(true)}>
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
                <Button size="sm" onClick={() => setExportMode(true)}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              </>
            ) : (
              <>
                {/* 编辑模式 */}
                {editMode && (
                  <>
                    <Button size="sm" variant="blue" onClick={onConfirmEdit}>
                      <Edit2 className="w-4 h-4" /> 确认编辑{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={onCancelSelection}>
                      <X className="w-4 h-4" /> 取消
                    </Button>
                  </>
                )}
                {/* 删除模式 */}
                {deleteMode && (
                  <>
                    <Button size="sm" variant="destructive" onClick={onConfirmDelete}>
                      <Trash2 className="w-4 h-4" /> 确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={onCancelSelection}>
                      <X className="w-4 h-4" /> 取消
                    </Button>
                  </>
                )}
                {/* 导出模式 */}
                {exportMode && (
                  <>
                    <Button size="sm" onClick={onConfirmExport}>
                      <Download className="w-4 h-4" />
                      确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={onCancelSelection}>
                      <X className="w-4 h-4" /> 取消选择
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* 表格组件 */}
        <WarehouseInboundTable
          records={filteredRecords}
          displayedRecords={displayedRecords}
          selectedRows={selectedRows}
          isAllSelected={isAllSelected}
          editMode={editMode}
          deleteMode={deleteMode}
          exportMode={exportMode}
          expandedRows={expandedRows}
          onToggleExpand={onToggleExpand}
          onSelectAll={onSelectAll}
          onSelectRow={onSelectRow}
          onViewRecord={onViewRecord}
          page={inboundPage}
          pageSize={inboundPageSize}
          totalPages={totalPages}
          totalCount={filteredRecords.length}
          onPageChange={setInboundPage}
          onPageSizeChange={setInboundPageSize}
        />
      </div>

      {/* 弹窗组件 */}
      <InboundDetailModal
        record={selectedInboundRecord}
        isOpen={showInboundDetailModal}
        onClose={() => setShowInboundDetailModal(false)}
      />

      <InboundEditModal
        record={selectedInboundRecord}
        isOpen={showInboundEditModal}
        onClose={() => setShowInboundEditModal(false)}
        onSave={onSaveInboundEdit}
      />

      <InboundAddModal
        isOpen={showInboundAddModal}
        onClose={() => setShowInboundAddModal(false)}
        onSave={onSaveNewInbound}
        onGenerateCode={onGenerateOrderCode}
        existingCodes={filteredRecords.map(r => r.code)}
      />

      <InboundDeleteConfirmModal
        records={selectedInboundRecords}
        isOpen={showInboundDeleteModal}
        onClose={() => setShowInboundDeleteModal(false)}
        onConfirm={onConfirmInboundDelete}
      />

      <InboundBatchEditModal
        records={selectedRecords}
        isOpen={showBatchEditModal}
        onClose={() => setShowBatchEditModal(false)}
        onSave={onBatchSaveRecord}
      />

      <InboundExportModal
        records={selectedRecords}
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setExportMode(false);
        }}
      />
    </div>
  );
}
