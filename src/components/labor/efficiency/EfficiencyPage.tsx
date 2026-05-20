/**
 * 人效分析页面容器
 */

import React, { useState } from 'react';
import { TrendingUp, Plus, Edit2, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EfficiencyDashboard } from './EfficiencyDashboard';
import { EfficiencyChart } from './EfficiencyChart';
import { EfficiencyTable } from './EfficiencyTable';
import { EfficiencyFilters } from './EfficiencyFilters';
import { EfficiencyFormModal } from './EfficiencyFormModal';
import { EfficiencyBatchEditModal } from './EfficiencyBatchEditModal';
import { ExportFormatModal } from './ExportFormatModal';
import { DeleteWarningModal } from './DeleteWarningModal';
import { useEfficiency } from './hooks/useEfficiency';
import { EfficiencyMetrics } from './types';
import { showAlert, showConfirm } from '@/lib/dialogService';

export const EfficiencyPage: React.FC = () => {
  const {
    data,
    trendData,
    summaryMetrics,
    filters,
    departments,
    updateFilters,
  } = useEfficiency();

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<EfficiencyMetrics>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EfficiencyMetrics | null>(null);

  // 重置筛选条件
  const handleReset = () => {
    updateFilters({
      startDate: '2023-05',
      endDate: '2024-04',
      department: '全部',
    });
  };

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map(m => m.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 查看详情
  const handleViewDetail = (record: EfficiencyMetrics) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  // 编辑记录
  const handleEdit = (record: EfficiencyMetrics) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  // 删除记录
  const handleDelete = async (record: EfficiencyMetrics) => {
    if (await showConfirm(`确定要删除 ${record.date} - ${record.department} 的记录吗？`)) {
      // 删除逻辑
    }
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

  // 导出
  const handleExportClick = () => {
    setExportMode(true);
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
    const selectedData = data.filter(m => selectedRows.includes(m.id));
    const headers = ['月份', '部门', '总人数', '总产出', '人均产出', '总工时', '工时效率', '任务达成率', '出勤率', '人工成本率', '技能覆盖率'];
    const exportData = selectedData.map(row => ({
      '月份': row.date,
      '部门': row.department,
      '总人数': row.totalWorkers,
      '总产出': row.totalOutput,
      '人均产出': row.avgOutputPerWorker.toFixed(1),
      '总工时': row.totalHours,
      '工时效率': `${(row.avgEfficiency * 100).toFixed(1)}%`,
      '任务达成率': `${(row.taskCompletionRate * 100).toFixed(1)}%`,
      '出勤率': `${(row.attendanceRate * 100).toFixed(1)}%`,
      '人工成本率': `${(row.laborCostRate * 100).toFixed(1)}%`,
      '技能覆盖率': `${(row.skillCoverage * 100).toFixed(1)}%`,
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

    const fileName = `人效分析_${new Date().toISOString().slice(0, 10)}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 新增记录
  const handleAdd = (formData: Omit<EfficiencyMetrics, 'id'>) => {
    console.log('新增人效记录:', formData);
  };

  // 编辑记录
  const handleUpdate = (formData: Omit<EfficiencyMetrics, 'id'>) => {
    console.log('更新人效记录:', formData);
  };

  // 判断是否显示复选框
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">人效分析</h1>
              <p className="text-xs text-gray-500">查看各部门人效指标及趋势分析</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportClick}
            >
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
            <Button
              variant="default"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              新增
            </Button>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <EfficiencyFilters
        filters={filters}
        departments={departments}
        onFilterChange={updateFilters}
        onReset={handleReset}
      />

      {/* 核心指标仪表盘 */}
      <EfficiencyDashboard metrics={summaryMetrics} />

      {/* 趋势图表 */}
      <div className="mb-6">
        <EfficiencyChart data={trendData} />
      </div>

      {/* 详细数据表格 */}
      <EfficiencyTable
        data={data}
        showCheckbox={showCheckbox}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onBatchEditClick={batchEditMode ? () => setShowBatchEditModal(true) : () => setBatchEditMode(true)}
        onBatchDeleteClick={batchDeleteMode ? () => setShowDeleteWarning(true) : () => setBatchDeleteMode(true)}
        onBatchExportClick={exportMode ? handleConfirmExport : () => setExportMode(true)}
        onCancelBatch={handleCancelBatch}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : () => setShowAddModal(true)}
      />

      {/* 新增弹窗 */}
      <EfficiencyFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAdd}
        title="新建人效记录"
      />

      {/* 编辑弹窗 */}
      <EfficiencyFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecord(null);
        }}
        onConfirm={handleUpdate}
        title="编辑人效记录"
        editingRecord={editingRecord}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />

      {/* 批量编辑弹窗 */}
      <EfficiencyBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={data}
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
};

export default EfficiencyPage;
