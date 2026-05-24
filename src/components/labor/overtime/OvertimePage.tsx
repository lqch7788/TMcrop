import { useState } from 'react';
import { Clock } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import { useOvertime } from './hooks/useOvertime';
import { OvertimeFilters } from './OvertimeFilters';
import { OvertimeTable } from './OvertimeTable';
import { OvertimeDetailModal } from './OvertimeDetailModal';
import { OvertimeFormModal } from './OvertimeFormModal';
import { OvertimeBatchEditModal, OvertimeDeleteWarningModal, OvertimeExportFormatModal } from './modals';
import { Button } from '@/components/ui/button';
import type { OvertimeRecord, OvertimeFormData } from './types';

/**
 * 加班管理页面主容器组件
 */
export function OvertimePage() {
  const {
    data,
    filters,
    pagination,
    setFilters,
    setPage,
    setPageSize,
    selectedRecord,
    setSelectedRecord,
    isDetailOpen,
    setIsDetailOpen,
    isFormOpen,
    setIsFormOpen,
    handleSave,
    handleApprove,
    handleReject,
  } = useOvertime();

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // 批量编辑状态
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<OvertimeRecord>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 处理查看详情
  const handleViewDetail = (record: OvertimeRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  // 处理新建
  const handleAdd = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  // 处理审批
  const handleApproveClick = (record: OvertimeRecord) => {
    if (record) {
      handleApprove(record);
    }
  };

  // 处理驳回
  const handleRejectClick = (record: OvertimeRecord) => {
    if (record) {
      handleReject(record);
    }
  };

  // 处理搜索
  const handleSearch = () => {
    // 搜索逻辑由 useOvertime hook 的筛选状态管理
  };

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map(r => r.id.toString()));
    }
  };

  const handleSelectRow = (id: string | number) => {
    const stringId = id.toString();
    if (selectedRows.includes(stringId)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== stringId));
    } else {
      setSelectedRows([...selectedRows, stringId]);
    }
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // 批量编辑相关处理
  const handleBatchEditClick = () => {
    if (batchEditMode) {
      // 已经在批量编辑模式，打开批量编辑弹窗
      if (selectedRows.length === 0) {
        showAlert('请先选择要编辑的记录');
        return;
      }
      setSelectedRecordId(selectedRows[0]);
      setShowBatchEditModal(true);
    } else {
      // 进入批量编辑模式
      setBatchEditMode(true);
    }
  };

  const handleConfirmBatchEdit = () => {
    // 应用编辑结果
    editedRecordIds.forEach(id => {
      const editedData = editedRecords[id];
      if (editedData) {
        const record = data.find(r => r.id.toString() === id);
        if (record) {
          handleSave({ ...record, ...editedData } as OvertimeFormData);
        }
      }
    });
    setShowBatchEditModal(false);
    handleCancelBatch();
  };

  const handleConfirmBatchDelete = () => {
    if (selectedRows.length === 0) return;
    // 执行删除
    selectedRows.forEach(id => {
      const record = data.find(r => r.id.toString() === id);
      if (record) {
        handleReject(record); // 使用 handleReject 模拟删除/取消
      }
    });
    setShowDeleteWarning(false);
    handleCancelBatch();
  };

  // 确认导出
  const handleConfirmExport = () => {
    if (selectedRows.length === 0) return;
    handleDoExport();
  };

  // 执行导出
  const handleDoExport = async () => {
    const selectedData = data.filter(s => selectedRows.includes(s.id.toString()));
    const headers = ['员工姓名', '日期', '加班类型', '时长(小时)', '加班费(元)', '状态', '原因', '备注'];

    const exportData = selectedData.map(row => ({
      '员工姓名': row.staffName,
      '日期': row.date,
      '加班类型': row.type,
      '时长(小时)': row.hours,
      '加班费(元)': row.totalPay ? `¥${row.totalPay.toFixed(2)}` : '-',
      '状态': row.status,
      '原因': row.reason,
      '备注': row.remarks || '',
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

    const fileName = `加班记录_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportModal(false);
    handleCancelBatch();
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3">
          <p className="text-sm text-gray-500">待审批</p>
          <p className="text-lg font-bold text-amber-600 mt-1">
            {data.filter((r) => r.status === '待审批').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-sm text-gray-500">已审批</p>
          <p className="text-lg font-bold text-blue-600 mt-1">
            {data.filter((r) => r.status === '已审批').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-sm text-gray-500">已驳回</p>
          <p className="text-lg font-bold text-red-600 mt-1">
            {data.filter((r) => r.status === '已驳回').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-sm text-gray-500">总记录数</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{pagination.total}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <OvertimeFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />

      {/* 数据表格 */}
      <OvertimeTable
        data={data}
        pagination={pagination}
        showCheckbox={exportMode || batchEditMode || batchDeleteMode}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onViewDetail={handleViewDetail}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : handleAdd}
        onBatchEditClick={handleBatchEditClick}
        onBatchDeleteClick={() => {
          if (batchDeleteMode) {
            // 在批量删除模式下，显示确认删除弹窗
            if (selectedRows.length === 0) {
              showAlert('请先选择要删除的记录');
              return;
            }
            setShowDeleteWarning(true);
          } else {
            // 进入批量删除模式
            setBatchDeleteMode(true);
          }
        }}
        onBatchExportClick={() => {
          if (exportMode) {
            // 在导出模式下，显示导出格式选择弹窗
            if (selectedRows.length === 0) {
              showAlert('请先选择要导出的数据');
              return;
            }
            setShowExportModal(true);
          } else {
            // 进入导出模式
            setExportMode(true);
          }
        }}
        onCancelBatchEdit={handleCancelBatch}
        onCancelBatchDelete={handleCancelBatch}
        onCancelExport={handleCancelBatch}
      />

      {/* 批量操作提示栏 */}
      {(batchEditMode || batchDeleteMode || exportMode) && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="text-sm text-gray-600">
            已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
            {batchEditMode && '（点击批量编辑进入编辑模式）'}
            {batchDeleteMode && '（确认删除选中的记录）'}
          </div>
          <Button variant="outline" size="sm" onClick={handleCancelBatch}>
            取消
          </Button>
        </div>
      )}

      {/* 详情弹窗 */}
      <OvertimeDetailModal
        record={selectedRecord}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
      />

      {/* 表单弹窗 */}
      <OvertimeFormModal
        record={selectedRecord}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />

      {/* 批量编辑弹窗 */}
      <OvertimeBatchEditModal
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
        onConfirm={handleConfirmBatchEdit}
        onConfirmNext={() => {
          // 保存当前记录并选择下一条
          if (selectedRecordId && !editedRecordIds.includes(selectedRecordId)) {
            setEditedRecordIds([...editedRecordIds, selectedRecordId]);
          }

          const currentIndex = selectedRows.findIndex(r => r === selectedRecordId);
          const nextRecord = selectedRows[currentIndex + 1];

          if (nextRecord) {
            setSelectedRecordId(nextRecord);
          } else {
            // 如果没有更多记录，关闭弹窗
            setShowBatchEditModal(false);
            handleCancelBatch();
          }
        }}
      />

      {/* 删除确认弹窗 */}
      <OvertimeDeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmBatchDelete}
      />

      {/* 导出格式选择弹窗 */}
      <OvertimeExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />
    </div>
  );
}

export default OvertimePage;