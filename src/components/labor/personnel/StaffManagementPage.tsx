/**
 * 员工信息管理页面组件
 * 架构：useWorkerStore (Zustand Store → API) + useWorkerPersonnel (筛选Hook)
 */
import { useState, useEffect } from 'react';
import { Users, Plus, Download, Pencil, Trash2 } from 'lucide-react';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { Worker } from '../../../types';
import { useWorkerStore } from '@/stores/useWorkerStore';
import { PersonnelFilters, PersonnelTable, useWorkerPersonnel } from './index';
import { PersonnelDetailModal } from './PersonnelDetailModal';
import { PersonnelFormModal } from './PersonnelFormModal';
import { BatchEditModal, DeleteWarningModal, ExportFormatModal } from './modals';
import { Button } from '@/components/ui/button';

export function StaffManagementPage() {
  // 权限检查 - 已取消，所有人可使用所有功能
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

  const { workers: storeWorkers, loadWorkers } = useWorkerStore();

  // 本地 CRUD 状态（Store 不支持 mutation 时的临时方案）
  const [workerList, setWorkerList] = useState<Worker[]>([]);

  // 初次加载：从 Store 获取数据
  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  // 同步 Store 数据到本地状态
  useEffect(() => {
    if (storeWorkers.length > 0) {
      setWorkerList(storeWorkers);
    }
  }, [storeWorkers]);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

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
    isLoading,
    setSearchTerm,
    setDepartmentFilter,
    setStatusFilter,
  } = useWorkerPersonnel();

  const handleViewWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowDetailModal(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowFormModal(true);
  };

  const handleDeleteWorker = async (worker: Worker) => {
    if (await showConfirm(`确认删除员工 ${worker.name} (${worker.workerId}) 吗？`)) {
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
      showAlert('请先选择要导出的数据');
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
      // logger.error('Export failed:', err);
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
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-700">{stats.total}</p>
              <p className="text-xs text-blue-600">员工总数</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-green-600 text-sm">✓</span>
            </div>
            <div>
              <p className="text-lg font-bold text-green-700">{stats.inService}</p>
              <p className="text-xs text-green-600">在职</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-100 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-gray-600 text-sm">○</span>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-700">{stats.left}</p>
              <p className="text-xs text-gray-600">离职</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-amber-600 text-sm">★</span>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-700">{stats.retired}</p>
              <p className="text-xs text-amber-600">退休</p>
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
            <Button
              onClick={() => setShowBatchEditModal(true)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              确认编辑
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancelBatchEdit}
              className="gap-2"
            >
              取消
            </Button>
          </div>
        ) : batchDeleteMode ? (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteWarning(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              确认删除
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancelBatchDelete}
              className="gap-2"
            >
              取消
            </Button>
          </div>
        ) : exportMode ? (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowExportModal(true)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              确认导出
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancelExport}
              className="gap-2"
            >
              取消
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="default"
                onClick={handleBatchEditClick}
                className="gap-2"
              >
                <Pencil className="w-4 h-4" />
                编辑
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={handleBatchDeleteClick}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            )}
            {canExport && (
              <Button
                onClick={handleExportClick}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            )}
            {canCreate && (
              <Button
                onClick={handleAddWorker}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                新增员工
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 表格组件 */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
          加载中...
        </div>
      ) : (
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
      )}

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
