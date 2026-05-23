import { useState } from 'react';
import { Users, UsersRound, Plus, Edit, Trash2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTempWorker } from './hooks/useTempWorker';
import { TempWorkerFilters } from './TempWorkerFilters';
import { TempWorkerTable } from './TempWorkerTable';
import { TempWorkerDetailModal } from './TempWorkerDetailModal';
import { TempWorkerFormModal } from './TempWorkerFormModal';
import { TempWorkerBatchEditModal } from './TempWorkerBatchEditModal';
import { Button } from '@/components/ui/button';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Label } from '@/components/ui/label';
import { showAlert } from '@/lib/dialogService';

// 导出格式弹窗
interface ExportFormatModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onFormatChange: (format: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ExportFormatModal({ isOpen, exportFormat, selectedCount, onFormatChange, onClose, onConfirm }: ExportFormatModalProps) {
  const exportFormats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>取消</Button>
      <Button onClick={onConfirm}>导出</Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter={true}
      footer={footer}
    >
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {exportFormats.map((format) => (
          <Label
            key={format.value}
            onClick={() => onFormatChange(format.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${exportFormat === format.value ? 'border-emerald-600' : 'border-gray-400'}`}>
              {exportFormat === format.value && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </Label>
        ))}
      </div>
    </UnifiedModal>
  );
}

// 删除确认弹窗
interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteWarningModal({ isOpen, selectedCount, onClose, onConfirm }: DeleteWarningModalProps) {
  const footer = (
    <div className="flex gap-3">
      <Button variant="secondary" onClick={onClose}>取消</Button>
      <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="删除临时工警告"
      size="md"
      showFooter={true}
      footer={footer}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <span className="text-red-600 text-2xl">!</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">删除临时工警告</h3>
        </div>
      </div>
      <div className="text-sm text-gray-600 space-y-3">
        <p>确定要删除选中的 <strong>{selectedCount}</strong> 个临时工吗？</p>
        <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
      </div>
    </UnifiedModal>
  );
}

/**
 * 临时工快速入职页面主容器组件
 */
export function TempWorkerPage() {
  const navigate = useNavigate();
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
    handleDelete,
  } = useTempWorker();

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 批量编辑状态
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<typeof data[0]>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 处理查看详情
  const handleViewDetail = (record: typeof selectedRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  // 处理编辑
  const handleEdit = (record: typeof selectedRecord) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  };

  // 处理新建
  const handleAdd = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  // 处理搜索
  const handleSearch = () => {
    // 搜索逻辑由 useTempWorker hook 的筛选状态管理
  };

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map(r => r.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    setShowDeleteWarning(true);
  };

  const handleDeleteConfirm = () => {
    // 从列表移除
    selectedRows.forEach(id => handleDelete(data.find(r => r.id === id)));
    setSelectedRows([]);
    setShowDeleteWarning(false);
  };

  // 导出
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
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
    const selectedData = data.filter(r => selectedRows.includes(r.id));
    const headers = ['工号', '姓名', '类型', '合同类型', '技能数', '状态', '入职日期'];
    const exportData = selectedData.map(row => ({
      '工号': row.employeeCode,
      '姓名': row.name,
      '类型': row.workerType,
      '合同类型': row.contractType,
      '技能数': row.skillTags.length,
      '状态': row.status,
      '入职日期': row.joinDate,
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

    const fileName = `临时工_${new Date().toISOString().slice(0, 10)}.${extension}`;
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

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">临时工管理</h1>
              <p className="text-gray-500">临时工快速入职与信息管理</p>
            </div>
          </div>
          <Button variant="blue" onClick={() => navigate('/team')}>
            <UsersRound className="w-4 h-4" />
            班组分配
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <TempWorkerFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />

      {/* 数据表格 */}
      <TempWorkerTable
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
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : handleAdd}
        onBatchEditClick={batchEditMode ? () => setShowBatchEditModal(true) : () => setBatchEditMode(true)}
        onBatchDeleteClick={batchDeleteMode ? handleBatchDelete : () => setBatchDeleteMode(true)}
        onBatchExportClick={exportMode ? handleConfirmExport : () => setExportMode(true)}
        onCancelBatchEdit={handleCancelBatch}
        onCancelBatchDelete={handleCancelBatch}
        onCancelExport={handleCancelExport}
      />

      {/* 详情弹窗 */}
      <TempWorkerDetailModal
        record={selectedRecord}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* 表单弹窗 */}
      <TempWorkerFormModal
        record={selectedRecord}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteConfirm}
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
      <TempWorkerBatchEditModal
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
        onConfirm={() => {
          setShowBatchEditModal(false);
          handleCancelBatch();
        }}
        onConfirmNext={() => {
          if (selectedRecordId && !editedRecordIds.includes(selectedRecordId)) {
            setEditedRecordIds([...editedRecordIds, selectedRecordId]);
          }
          const currentIndex = selectedRows.findIndex(r => r === selectedRecordId);
          const nextRecord = selectedRows[currentIndex + 1];
          if (nextRecord) {
            setSelectedRecordId(nextRecord);
          } else {
            setShowBatchEditModal(false);
            handleCancelBatch();
          }
        }}
      />
    </div>
  );
}
