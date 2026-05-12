/**
 * 员工信息管理页面组件
 */
import { useState } from 'react';
import { Users, Plus, Download, Pencil, Trash2 } from 'lucide-react';
import { Worker } from '../../../types';
import { useAuthPermission } from '../../../hooks/usePermission';
import { PersonnelFilters, PersonnelTable, useWorkerPersonnel } from './index';
import { PersonnelDetailModal } from './PersonnelDetailModal';
import { PersonnelFormModal } from './PersonnelFormModal';
import { BatchEditModal, DeleteWarningModal, ExportFormatModal } from './modals';
import { Button } from '@/components/ui/button';

// 模拟员工数据（后续迁移到SQLite数据库）
const initialWorkers: Worker[] = [
  { id: '1', workerId: 'A001', name: '张伟民', gender: '男', age: 35, department: '生产部', position: '普工', phone: '138****1234', status: '在职' },
  { id: '2', workerId: 'A002', name: '李明轩', gender: '女', age: 28, department: '技术部', position: '技术员', phone: '139****5678', status: '在职' },
  { id: '3', workerId: 'A003', name: '王建国', gender: '男', age: 42, department: '生产部', position: '生产主管', phone: '136****9012', status: '在职' },
  { id: '4', workerId: 'A004', name: '赵俊杰', gender: '女', age: 30, department: '技术部', position: '技术员', phone: '137****3456', status: '在职' },
  { id: '5', workerId: 'A005', name: '钱文涛', gender: '男', age: 25, department: '生产部', position: '普工', phone: '135****7890', status: '在职' },
  { id: '6', workerId: 'A006', name: '孙晓峰', gender: '女', age: 33, department: '后勤部', position: '仓库管理员', phone: '134****2345', status: '在职' },
];

export function StaffManagementPage() {
  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerList, setWorkerList] = useState<Worker[]>(initialWorkers);

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
