/**
 * 绩效考核页面容器
 */
import { useState } from 'react';
import { Award, TrendingUp, Users, Plus, Edit2, Trash2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { usePerformance } from './hooks/usePerformance';
import { PerformanceTable } from './PerformanceTable';
import { PerformanceDetailModal } from './PerformanceDetailModal';
import { PerformanceChart } from './PerformanceChart';
import { PerformanceFilters } from './PerformanceFilters';
import { PerformanceFormModal } from './PerformanceFormModal';
import { BatchEditModal, DeleteWarningModal, ExportFormatModal } from './modals';
import type { PerformanceRecord } from './types';

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

  // 批量选择状态
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // Batch Edit state
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<PerformanceRecord>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // Batch Delete state
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // 新增/编辑弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PerformanceRecord | null>(null);

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

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map((r) => r.id));
    }
  };

  // 选择/取消选择单行
  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((r) => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 导出相关操作
  const handleExportClick = () => {
    setExportMode(true);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = filteredData.filter(m => selectedRows.includes(m.id));
    const headers = ['工号', '姓名', '部门', '月份', '任务完成率', '出勤率', '工作质量', '安全规范', '协作态度', '综合得分', '排名', '状态'];
    const exportData = selectedData.map(row => ({
      '工号': row.staffId,
      '姓名': row.staffName,
      '部门': row.department,
      '月份': row.month,
      '任务完成率': `${row.taskCompletionRate}%`,
      '出勤率': `${row.attendanceRate}%`,
      '工作质量': `${row.workQuality}%`,
      '安全规范': `${row.safetyCompliance}%`,
      '协作态度': `${row.teamworkAttitude}%`,
      '综合得分': row.totalScore,
      '排名': row.rank || '-',
      '状态': row.status,
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `绩效考核_${new Date().toISOString().slice(0, 10)}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  // 批量编辑操作
  const handleBatchEditClick = () => {
    if (batchEditMode) {
      // 批量编辑模式下，直接显示批量编辑弹窗
      setShowBatchEditModal(true);
    } else {
      // 正常模式下，进入批量编辑模式
      setBatchEditMode(true);
    }
  };

  const handleCancelBatchEdit = () => {
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  const handleConfirmBatchEdit = () => {
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // 批量删除操作
  const handleBatchDeleteClick = () => {
    if (batchDeleteMode) {
      // 批量删除模式下，直接显示确认弹窗
      setShowDeleteWarning(true);
    } else {
      // 正常模式下，进入批量删除模式
      setBatchDeleteMode(true);
    }
  };

  const handleCancelBatchDelete = () => {
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleConfirmBatchDelete = () => {
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // 新增/编辑记录
  const handleAdd = (data: Omit<PerformanceRecord, 'id' | 'totalScore'>) => {
    // logger.info('新增考核记录:', data);
  };

  const handleEdit = (record: PerformanceRecord) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  const handleUpdate = (data: Omit<PerformanceRecord, 'id' | 'totalScore'>) => {
    // logger.info('更新考核记录:', data);
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  // 判断是否显示复选框
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;

  return (
    <div className="space-y-6">
      {/* 批量操作提示栏 */}
      {(batchEditMode || batchDeleteMode || exportMode) && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          <Button variant="secondary" onClick={handleCancelBatch}>
            <X className="w-4 h-4" />
            取消
          </Button>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-[#F2F6FA] rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">考核人数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.evaluated}</p>
              <p className="text-xs text-gray-500">已评估</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.avgScore}</p>
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
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onPageChange={(page) => setPagination({ currentPage: page })}
        onPageSizeChange={(size) => setPagination({ pageSize: size })}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onDelete={async (record) => {
          if (await showConfirm(`确定要删除 ${record.staffName} - ${record.month} 的考核记录吗？`)) {
            // 删除逻辑
          }
        }}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onShowExportModal={handleConfirmExport}
        onBatchEditClick={handleBatchEditClick}
        onBatchDeleteClick={handleBatchDeleteClick}
        onBatchExportClick={exportMode ? handleConfirmExport : () => setExportMode(true)}
        onCancelBatch={handleCancelBatch}
        onBatchEditMode={batchEditMode}
        onBatchDeleteMode={batchDeleteMode}
        onAddClick={() => setShowAddModal(true)}
      />

      {/* 详情弹窗 */}
      <PerformanceDetailModal
        record={selectedRecord}
        open={showDetailModal}
        onClose={handleCloseDetail}
      />

      {/* 新增弹窗 */}
      <PerformanceFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAdd}
        title="新建考核记录"
      />

      {/* 编辑弹窗 */}
      <PerformanceFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecord(null);
        }}
        onConfirm={handleUpdate}
        title="编辑考核记录"
        editingRecord={editingRecord}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onFormatChange={setExportFormat}
        onConfirm={handleDoExport}
        onClose={() => setShowExportModal(false)}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={filteredData}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleConfirmBatchEdit}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}
