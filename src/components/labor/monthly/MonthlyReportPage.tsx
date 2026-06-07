/**
 * 月报页面容器组件
 */

import { useState } from 'react';
import { BarChart3, Plus, Edit2, Trash2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { useMonthlyReport } from './hooks/useMonthlyReport';
import { MonthlyReportFilters } from './MonthlyReportFilters';
import { MonthlyStatsCards } from './MonthlyStatsCards';
import { MonthlyReportChart } from './MonthlyReportChart';
import { MonthlyReportTable } from './MonthlyReportTable';
import { MonthlyReportFormModal } from './MonthlyReportFormModal';
import { MonthlyReportBatchEditModal } from './MonthlyReportBatchEditModal';
import { ExportFormatModal } from './ExportFormatModal';
import { DeleteWarningModal } from './DeleteWarningModal';
import type { MonthlyReport } from './types';

export function MonthlyReportPage() {
  const {
    reports,
    month,
    setMonth,
    dept,
    setDept,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    exportMode,
    setExportMode,
    selectedRows,
    handleSelectAll,
    handleSelectRow,
    handleConfirmExport,
    handleCancelExport,
    totalPages,
    paginatedReports,
    currentStats,
    showExportModal,
    setShowExportModal,
    exportFormat,
    setExportFormat,
  } = useMonthlyReport();

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<MonthlyReport>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyReport | null>(null);

  // 处理导出点击
  const handleExportClick = () => {
    setExportMode(true);
  };

  // 批量编辑
  const handleBatchEditClick = () => {
    setBatchEditMode(true);
  };

  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  const handleBatchEditConfirm = () => {
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // 批量删除
  const handleBatchDeleteClick = () => {
    setBatchDeleteMode(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // 编辑记录
  const handleEdit = (report: MonthlyReport) => {
    setEditingRecord(report);
    setShowEditModal(true);
  };

  // 删除记录
  const handleDelete = async (report: MonthlyReport) => {
    if (await showConfirm(`确定要删除 "${report.month} - ${report.dept}" 吗？`)) {
      // 删除逻辑
    }
  };

  // 新增/编辑
  const handleAdd = (data: Omit<MonthlyReport, 'id'>) => {
    // logger.info('新增月报:', data);
  };

  const handleUpdate = (data: Omit<MonthlyReport, 'id'>) => {
    // logger.info('更新月报:', data);
  };

  // 确认导出
  const handleBatchExportClick = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 判断是否显示复选框
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;

  return (
    <div className="space-y-6">
      {/* 筛选栏 */}
      <MonthlyReportFilters
        month={month}
        onMonthChange={setMonth}
        dept={dept}
        onDeptChange={setDept}
        onSearch={() => {}}
        onGenerate={() => {}}
      />

      {/* 统计卡片 */}
      <MonthlyStatsCards stats={currentStats} />

      {/* 图表 */}
      <MonthlyReportChart reports={reports} />

      {/* 表格 */}
      <MonthlyReportTable
        reports={reports}
        paginatedReports={paginatedReports}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onExportClick={handleExportClick}
        onCancelExport={handleCancelExport}
        onShowExportModal={handleBatchExportClick}
        onBatchEditClick={batchEditMode ? () => setShowBatchEditModal(true) : () => setBatchEditMode(true)}
        onBatchDeleteClick={batchDeleteMode ? () => setShowDeleteWarning(true) : () => setBatchDeleteMode(true)}
        onBatchExportClick={handleBatchExportClick}
        onCancelBatch={handleCancelBatch}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : () => setShowAddModal(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新增弹窗 */}
      <MonthlyReportFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAdd}
        title="新建月报"
      />

      {/* 编辑弹窗 */}
      <MonthlyReportFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecord(null);
        }}
        onConfirm={handleUpdate}
        title="编辑月报"
        editingRecord={editingRecord}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* 导出格式弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />

      {/* 批量编辑弹窗 */}
      <MonthlyReportBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={reports}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleBatchEditConfirm}
      />
    </div>
  );
}
