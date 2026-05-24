/**
 * 劳动风险预警页面容器
 */
import React, { useState } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, Download, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRisk } from './hooks/useRisk';
import { RiskDashboard } from './RiskDashboard';
import { RiskFilters } from './RiskFilters';
import { RiskAlertList } from './RiskAlertList';
import { RiskAlertDetailModal } from './RiskAlertDetailModal';
import { RiskFormModal } from './RiskFormModal';
import { RiskBatchEditModal } from './RiskBatchEditModal';
import { ExportFormatModal } from './ExportFormatModal';
import { DeleteWarningModal } from './DeleteWarningModal';
import type { RiskAlert } from './types';
import { showAlert, showConfirm } from '@/lib/dialogService';

export function RiskPage() {
  const { alerts, stats, filters, updateFilters, clearFilters, handleAlert, getAlertById } =
    useRisk();

  // 选中状态
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

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
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<RiskAlert>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RiskAlert | null>(null);

  // 选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === alerts.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(alerts.map(a => a.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleSelectAlert = (alert: RiskAlert) => {
    setSelectedAlert(alert);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedAlert(null);
  };

  const handleHandleAlert = (alertId: string, remarks: string) => {
    handleAlert(alertId, remarks);
    const updated = getAlertById(alertId);
    if (updated) {
      setSelectedAlert(updated);
    }
  };

  // 编辑记录
  const handleEdit = (alert: RiskAlert) => {
    setEditingRecord(alert);
    setShowEditModal(true);
  };

  // 删除记录
  const handleDelete = async (alert: RiskAlert) => {
    if (await showConfirm(`确定要删除 "${alert.title}" 吗？`)) {
      // 删除逻辑
    }
  };

  // 批量操作
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
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = alerts.filter(m => selectedRows.includes(m.id));
    const headers = ['预警等级', '预警类型', '预警标题', '预警内容', '部门', '员工', '状态', '创建时间'];
    const exportData = selectedData.map(row => ({
      '预警等级': row.level === 'warning' ? '一般提醒' : row.level === 'danger' ? '需要注意' : '紧急处理',
      '预警类型': row.alertTypeName,
      '预警标题': row.title,
      '预警内容': row.content,
      '部门': row.department || '',
      '员工': row.staffName || '',
      '状态': row.status === 'pending' ? '待处理' : '已处理',
      '创建时间': row.createTime,
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

    const fileName = `劳动风险预警_${new Date().toISOString().slice(0, 10)}.${extension}`;
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

  // 新增/编辑
  const handleAdd = (data: Omit<RiskAlert, 'id' | 'createTime'>) => {
    console.log('新增风险预警:', data);
  };

  const handleUpdate = (data: Omit<RiskAlert, 'id' | 'createTime'>) => {
    console.log('更新风险预警:', data);
  };

  // 判断是否显示复选框
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;

  return (
    <div className="space-y-6">
      {/* 筛选栏 */}
      {(batchEditMode || batchDeleteMode || exportMode) && (
        <div className="flex items-center gap-2 bg-white rounded-xl p-4 shadow-sm">
          <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          <Button variant="secondary" onClick={handleCancelBatch}>
            <X className="w-4 h-4" />
            取消
          </Button>
        </div>
      )}

      {/* 预警仪表盘 */}
      <RiskDashboard stats={stats} />

      {/* 预警列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">预警列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 筛选栏 */}
          <RiskFilters filters={filters} onUpdate={updateFilters} onClear={clearFilters} />

          {/* 预警列表 */}
          <RiskAlertList
            alerts={alerts}
            onSelectAlert={handleSelectAlert}
            showCheckbox={showCheckbox}
            exportMode={exportMode}
            batchEditMode={batchEditMode}
            batchDeleteMode={batchDeleteMode}
            selectedRows={selectedRows}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectRow}
            onBatchEditClick={batchEditMode ? () => setShowBatchEditModal(true) : () => setBatchEditMode(true)}
            onBatchDeleteClick={batchDeleteMode ? () => setShowDeleteWarning(true) : () => setBatchDeleteMode(true)}
            onBatchExportClick={exportMode ? handleConfirmExport : () => setExportMode(true)}
            onCancelBatch={handleCancelBatch}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* 预警详情弹窗 */}
      <RiskAlertDetailModal
        alert={selectedAlert}
        open={detailModalOpen}
        onClose={handleCloseDetail}
        onHandle={handleHandleAlert}
      />

      {/* 新增弹窗 */}
      <RiskFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAdd}
        title="新建风险预警"
      />

      {/* 编辑弹窗 */}
      <RiskFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecord(null);
        }}
        onConfirm={handleUpdate}
        title="编辑风险预警"
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
      <RiskBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={alerts}
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
