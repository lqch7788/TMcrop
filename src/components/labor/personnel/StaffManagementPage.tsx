/**
 * 员工信息管理页面组件
 */
import { useState } from 'react';
import { Users, Plus, Download, Pencil, Trash2 } from 'lucide-react';
import { Worker } from '../../../types';
import { useWorkers } from '../../common/settings';
import { PersonnelFilters, PersonnelTable, useWorkerPersonnel } from './index';
import { PersonnelDetailModal } from './PersonnelDetailModal';
import { PersonnelFormModal } from './PersonnelFormModal';
import { BatchEditModal, DeleteWarningModal, ExportFormatModal } from './modals';

export function StaffManagementPage() {
  const { workers } = useWorkers();

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerList, setWorkerList] = useState<Worker[]>(workers);

  // Batch Edit state
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedWorkerIds, setEditedWorkerIds] = useState<string[]>([]);
  const [editedWorkers, setEditedWorkers] = useState<Record<string, Partial<Worker>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // Batch Delete state
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Export state
  const [exportMode, setExportMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  const {
    filters,
    filteredWorkers,
    stats,
    departments,
    setSearchTerm,
    setDepartmentFilter,
    setStatusFilter,
  } = useWorkerPersonnel({ workers: workerList });

  const handleViewWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowDetailModal(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowFormModal(true);
  };

  const handleDeleteWorker = (worker: Worker) => {
    if (window.confirm(`确认删除员工 ${worker.name} (${worker.workerId}) 吗？`)) {
      setWorkerList(prev => prev.filter(w => w.id !== worker.id));
    }
  };

  const handleAddWorker = () => {
    setSelectedWorker(null);
    setShowFormModal(true);
  };

  const handleSaveWorker = (worker: Worker) => {
    if (workerList.some(w => w.id === worker.id)) {
      setWorkerList(prev => prev.map(w => w.id === worker.id ? worker : w));
    } else {
      setWorkerList(prev => [...prev, worker]);
    }
    setShowFormModal(false);
  };

  // Batch Edit handlers
  const handleBatchEditClick = () => {
    setBatchEditMode(true);
  };

  const handleCancelBatchEdit = () => {
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedWorkerIds([]);
    setEditedWorkers({});
    setSelectedRecordId('');
  };

  const handleConfirmBatchEdit = () => {
    const updatedWorkers = [...workerList];
    editedWorkerIds.forEach(id => {
      const index = updatedWorkers.findIndex(w => w.id.toString() === id);
      if (index !== -1 && editedWorkers[id]) {
        updatedWorkers[index] = { ...updatedWorkers[index], ...editedWorkers[id] };
      }
    });
    setWorkerList(updatedWorkers);
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedWorkerIds([]);
    setEditedWorkers({});
    setSelectedRecordId('');
  };

  // Batch Delete handlers
  const handleBatchDeleteClick = () => {
    setBatchDeleteMode(true);
  };

  const handleCancelBatchDelete = () => {
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleConfirmBatchDelete = () => {
    const indicesToDelete = new Set(selectedRows);
    const remainingWorkers = workerList.filter((_, index) => {
      const filteredIndex = filteredWorkers.findIndex(w => w.id === workerList[index].id);
      return !indicesToDelete.has(filteredIndex);
    });
    setWorkerList(remainingWorkers);
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // Export handlers
  const handleExportClick = () => {
    setExportMode(true);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  };

  const handleDoExport = async () => {
    const selectedData = filteredWorkers.filter((_, index) => selectedRows.includes(index));
    const headers = ['工号', '姓名', '部门', '班组', '岗位', '技能等级', '联系方式', '合同状态', '入职日期', '状态'];
    const exportData = selectedData.map(w => ({
      '工号': w.workerId,
      '姓名': w.name,
      '部门': w.department,
      '班组': w.team,
      '岗位': w.position,
      '技能等级': w.skillLevel,
      '联系方式': w.phone,
      '合同状态': w.contractStatus,
      '入职日期': w.hireDate,
      '状态': w.status,
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `员工信息_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: exportFormat.toUpperCase() + ' Files', accept: { [mimeType]: ['.' + extension] } }]
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

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredWorkers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredWorkers.map((_, index) => index));
    }
  };

  const handleSelectRow = (index: number) => {
    if (selectedRows.includes(index)) {
      setSelectedRows(selectedRows.filter(i => i !== index));
    } else {
      setSelectedRows([...selectedRows, index]);
    }
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">员工信息管理</h1>
            <p className="text-xs text-gray-500">园区员工信息管理</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">员工总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inService}</p>
              <p className="text-xs text-gray-500">在职</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.left}</p>
              <p className="text-xs text-gray-500">离职</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">★</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.retired}</p>
              <p className="text-xs text-gray-500">退休</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选组件 */}
      <PersonnelFilters
        searchTerm={filters.searchTerm}
        departmentFilter={filters.departmentFilter}
        statusFilter={filters.statusFilter}
        departments={departments}
        onSearchChange={setSearchTerm}
        onDepartmentChange={setDepartmentFilter}
        onStatusChange={setStatusFilter}
      />

      {/* 操作栏 */}
      <div className="flex justify-end">
        {batchEditMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBatchEditModal(true)}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              确认编辑
            </button>
            <button
              onClick={handleCancelBatchEdit}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              取消
            </button>
          </div>
        ) : batchDeleteMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteWarning(true)}
              className="h-10 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              确认删除
            </button>
            <button
              onClick={handleCancelBatchDelete}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              取消
            </button>
          </div>
        ) : exportMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              确认导出
            </button>
            <button
              onClick={handleCancelExport}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleBatchEditClick}
              className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              编辑
            </button>
            <button
              onClick={handleBatchDeleteClick}
              className="h-10 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
            <button
              onClick={handleExportClick}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <button
              onClick={handleAddWorker}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增员工
            </button>
          </div>
        )}
      </div>

      {/* 表格组件 */}
      <PersonnelTable
        workers={filteredWorkers}
        onViewWorker={handleViewWorker}
        onEditWorker={handleEditWorker}
        onDeleteWorker={handleDeleteWorker}
        showBatchSelect={batchEditMode || batchDeleteMode || exportMode}
        selectedRows={selectedRows}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
      />

      {/* 详情弹窗 */}
      {showDetailModal && (
        <PersonnelDetailModal
          worker={selectedWorker}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* 表单弹窗 */}
      {showFormModal && (
        <PersonnelFormModal
          worker={selectedWorker}
          onSave={handleSaveWorker}
          onClose={() => setShowFormModal(false)}
        />
      )}

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        workers={filteredWorkers}
        editedWorkerIds={editedWorkerIds}
        editedWorkers={editedWorkers}
        selectedWorkerId={selectedRecordId}
        onSelectedWorkerIdChange={setSelectedRecordId}
        onEditedWorkersChange={setEditedWorkers}
        onEditedWorkerIdsChange={setEditedWorkerIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleConfirmBatchEdit}
        departments={departments}
        positions={['技术员', '生产主管', '普工', '仓库管理员', '质检员']}
        teams={['一班', '二班', '三班', '四班']}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmBatchDelete}
      />

      {/* 导出格式弹窗 */}
      <ExportFormatModal
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

export default StaffManagementPage;
