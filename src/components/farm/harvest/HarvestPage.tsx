import { useState } from 'react';
import {
  Search, Plus, Warehouse, Calendar, User, Package, ChevronDown, Filter, X, ChevronLeft, ChevronRight, Download, Pencil, Trash2
} from 'lucide-react';
import { harvestRecords as initialRecords, cropBatches, greenhouses, users } from '../../../data/mockData';
import { warehouseOptions } from '../../../data/farmMockData';
import { Modal, FormField, Input, Select, Textarea } from '../../ui/Modal';
import { BatchEditModal, DeleteWarningModal, ExportFormatModal } from './modals';

// ========== 引入组件（组件化重构） ==========
import {
  HarvestPageHeader,
  HarvestStatsCards,
  HarvestFilterToolbar,
  HarvestTableToolbar,
} from './components';

export default function HarvestPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search state
  const [searchFilters, setSearchFilters] = useState({
    harvestCode: '',
    batchCode: '',
    greenhouseId: '',
    cropName: '',
    grade: '',
    harvesterName: '',
    warehouseId: '',
    status: '',
  });

  // Harvest Records State
  const [harvestRecords, setHarvestRecords] = useState([...initialRecords]);

  // Export state
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // Batch Edit state
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, any>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // Batch Delete state
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // Filter records based on search
  const filteredRecords = harvestRecords.filter(record => {
    if (searchFilters.harvestCode && !record.harvestCode.includes(searchFilters.harvestCode)) return false;
    if (searchFilters.batchCode && !record.batchCode.includes(searchFilters.batchCode)) return false;
    if (searchFilters.greenhouseId && record.greenhouseId !== searchFilters.greenhouseId) return false;
    if (searchFilters.cropName && !record.cropName.includes(searchFilters.cropName)) return false;
    if (searchFilters.grade && record.grade !== searchFilters.grade) return false;
    if (searchFilters.harvesterName && !record.harvesterNames.some(name => name.includes(searchFilters.harvesterName))) return false;
    if (searchFilters.warehouseId && record.warehouseId !== searchFilters.warehouseId) return false;
    if (searchFilters.status && record.status !== searchFilters.status) return false;
    return true;
  });

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchFilters({
      harvestCode: '',
      batchCode: '',
      greenhouseId: '',
      cropName: '',
      grade: '',
      harvesterName: '',
      warehouseId: '',
      status: '',
    });
    setCurrentPage(1);
  };

  const handleExportClick = () => {
    setExportMode(true);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    // Get selected data - use index-based selection from filtered records
    const selectedData = filteredRecords.filter((_, index) => selectedRows.includes(index));
    const headers = ['采收单号', '批次信息', '采收区域', '采收量', '品质等级', '采收人员', '入库仓库', '状态'];
    const exportData = selectedData.map(row => ({
      '采收单号': row.harvestCode,
      '批次信息': row.batchCode,
      '采收区域': row.greenhouseName,
      '采收量': `${row.harvestQuantity} ${row.unit}`,
      '品质等级': row.grade,
      '采收人员': row.harvesterNames.join(', '),
      '入库仓库': row.warehouseName,
      '状态': row.status === 'harvested' ? '已采收' : row.status === 'graded' ? '已分级' : '已入库'
    }));

    // Create content based on format
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      // CSV format
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      // Excel format (as HTML table)
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      // Word format (as HTML)
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    // Try to use showSaveFilePicker for Chrome/Edge (allows user to choose save location)
    const fileName = `采收入库_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
        // Fallback for browsers without showSaveFilePicker
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
      // Fallback
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Reset states
    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // Batch Edit handlers
  const handleBatchEditClick = () => {
    setBatchEditMode(true);
  };

  const handleCancelBatchEdit = () => {
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  const handleConfirmBatchEdit = () => {
    // Apply all edits
    const updatedRecords = [...harvestRecords];
    editedRecordIds.forEach(id => {
      const index = updatedRecords.findIndex(r => r.id.toString() === id);
      if (index !== -1 && editedRecords[id]) {
        const record = updatedRecords[index];
        // Find greenhouse name if greenhouseId changed
        if (editedRecords[id].greenhouseId && editedRecords[id].greenhouseId !== record.greenhouseId) {
          const gh = greenhouses.find(g => g.id === editedRecords[id].greenhouseId);
          updatedRecords[index] = {
            ...record,
            ...editedRecords[id],
            greenhouseName: gh?.name || record.greenhouseName,
          };
        } else {
          updatedRecords[index] = { ...record, ...editedRecords[id] };
        }
        // Find warehouse name if warehouseId changed
        if (editedRecords[id].warehouseId && editedRecords[id].warehouseId !== record.warehouseId) {
          const wh = warehouseOptions.find(w => w.value === editedRecords[id].warehouseId);
          updatedRecords[index] = {
            ...updatedRecords[index],
            warehouseName: wh?.label || record.warehouseName,
          };
        }
        // Find batch cropName if batchCode changed
        if (editedRecords[id].batchCode && editedRecords[id].batchCode !== record.batchCode) {
          const batch = cropBatches.find(b => b.batchCode === editedRecords[id].batchCode);
          updatedRecords[index] = {
            ...updatedRecords[index],
            cropName: batch?.cropName || record.cropName,
          };
        }
      }
    });
    setHarvestRecords(updatedRecords);
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
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
    // Delete selected records (using index from filtered records)
    const indicesToDelete = new Set(selectedRows);
    const remainingRecords = harvestRecords.filter((_, index) => {
      // Map filtered index back to original records index
      const filteredIndex = filteredRecords.findIndex(r => r.id === harvestRecords[index].id);
      return !indicesToDelete.has(filteredIndex);
    });
    setHarvestRecords(remainingRecords);
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredRecords.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredRecords.map((_, index) => index));
    }
  };

  const handleSelectRow = (index: number) => {
    if (selectedRows.includes(index)) {
      setSelectedRows(selectedRows.filter(i => i !== index));
    } else {
      setSelectedRows([...selectedRows, index]);
    }
  };

  // Create Harvest Record Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    batchCode: '',
    greenhouseId: '',
    harvestDate: new Date().toISOString().split('T')[0],
    harvestQuantity: 0,
    grade: 'A',
    warehouseId: '',
    harvesterIds: [] as string[],
    remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 转换 warehouseOptions 为 BatchEditModal 期望的格式 { id, name }[]
  const warehousesForModal = warehouseOptions.map(w => ({ id: w.value, name: w.label }));

  const generateHarvestCode = () => {
    const date = new Date();
    const code = `HS${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    return code;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newRecord.batchCode) newErrors.batchCode = '请选择采收批次';
    if (!newRecord.greenhouseId) newErrors.greenhouseId = '请选择采收区域';
    if (!newRecord.harvestDate) newErrors.harvestDate = '请选择采收日期';
    if (newRecord.harvestQuantity <= 0) newErrors.harvestQuantity = '请输入采收数量';
    if (!newRecord.warehouseId) newErrors.warehouseId = '请选择入库仓库';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateRecord = () => {
    if (!validateForm()) return;

    const selectedBatch = cropBatches.find(b => b.batchCode === newRecord.batchCode);
    const selectedGreenhouse = greenhouses.find(g => g.id === newRecord.greenhouseId);
    const selectedWarehouse = warehouseOptions.find(w => w.value === newRecord.warehouseId);
    const selectedHarvesters = users.filter(u => newRecord.harvesterIds.includes(u.id));

    const record = {
      id: harvestRecords.length + 1,
      harvestCode: generateHarvestCode(),
      batchCode: newRecord.batchCode,
      cropName: selectedBatch?.cropName || '',
      greenhouseId: newRecord.greenhouseId,
      greenhouseName: selectedGreenhouse?.name || '',
      harvestDate: newRecord.harvestDate,
      harvestQuantity: newRecord.harvestQuantity,
      unit: 'kg',
      grade: newRecord.grade,
      warehouseId: newRecord.warehouseId,
      warehouseName: selectedWarehouse?.name || '',
      harvesterIds: newRecord.harvesterIds,
      harvesterNames: selectedHarvesters.map(u => u.name),
      status: 'harvested' as const,
      remarks: newRecord.remarks,
    };

    setHarvestRecords([record, ...harvestRecords]);
    setIsCreateModalOpen(false);
    setNewRecord({
      batchCode: '',
      greenhouseId: '',
      harvestDate: new Date().toISOString().split('T')[0],
      harvestQuantity: 0,
      grade: 'A',
      warehouseId: '',
      harvesterIds: [],
      remarks: '',
    });
    setErrors({});
  };

  const toggleHarvester = (userId: string) => {
    const currentIds = newRecord.harvesterIds;
    if (currentIds.includes(userId)) {
      setNewRecord({ ...newRecord, harvesterIds: currentIds.filter(id => id !== userId) });
    } else {
      setNewRecord({ ...newRecord, harvesterIds: [...currentIds, userId] });
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setNewRecord({
      batchCode: '',
      greenhouseId: '',
      harvestDate: new Date().toISOString().split('T')[0],
      harvestQuantity: 0,
      grade: 'A',
      warehouseId: '',
      harvesterIds: [],
      remarks: '',
    });
    setErrors({});
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">A级</span>;
      case 'B': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">B级</span>;
      case 'C': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">C级</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'harvested': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">已采收</span>;
      case 'graded': return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">已分级</span>;
      case 'stored': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">已入库</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <HarvestPageHeader />

      {/* Stats */}
      <HarvestStatsCards records={harvestRecords} />

      {/* 搜索卡片 */}
      <HarvestFilterToolbar
        searchFilters={searchFilters}
        greenhouses={greenhouses}
        warehouseOptions={warehouseOptions}
        onFiltersChange={setSearchFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        onCreate={() => setIsCreateModalOpen(true)}
      />

      {/* Harvest Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <HarvestTableToolbar
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          onCreate={() => setIsCreateModalOpen(true)}
          onBatchEdit={handleBatchEditClick}
          onBatchDelete={handleBatchDeleteClick}
          onExport={handleExportClick}
          onConfirmExport={() => setShowExportModal(true)}
          onCancelExport={handleCancelExport}
          onConfirmBatchEdit={() => setShowBatchEditModal(true)}
          onCancelBatchEdit={handleCancelBatchEdit}
          onConfirmBatchDelete={() => setShowDeleteWarning(true)}
          onCancelBatchDelete={handleCancelBatchDelete}
        />
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">采收入库记录表</h3>
          {(exportMode || batchEditMode || batchDeleteMode) ? (
            <div className="flex gap-2">
              {exportMode && (
                <>
                  <button onClick={() => setShowExportModal(true)} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    确认导出
                  </button>
                  <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    取消
                  </button>
                </>
              )}
              {batchEditMode && (
                <>
                  <button onClick={() => setShowBatchEditModal(true)} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                    <Pencil className="w-4 h-4" />
                    确认编辑
                  </button>
                  <button onClick={handleCancelBatchEdit} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    取消
                  </button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <button onClick={() => setShowDeleteWarning(true)} className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1">
                    <Trash2 className="w-4 h-4" />
                    确认删除
                  </button>
                  <button onClick={handleCancelBatchDelete} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    取消
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleBatchEditClick} className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
                <Pencil className="w-4 h-4" />
                编辑
              </button>
              <button onClick={handleBatchDeleteClick} className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1">
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button onClick={handleExportClick} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(exportMode || batchEditMode || batchDeleteMode) && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredRecords.length && filteredRecords.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">批次信息</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收区域</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">品质等级</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收人员</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库仓库</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record, idx) => (
                <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(idx)}
                        onChange={() => handleSelectRow(idx)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-blue-600 underline cursor-pointer">{record.harvestCode}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{record.cropName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{record.batchCode}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.greenhouseName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{record.harvestQuantity}</span>
                    <span className="text-gray-500 text-sm ml-1">{record.unit}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{getGradeBadge(record.grade)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      {record.harvesterNames.map((name, i) => (
                        <span key={i} className="text-sm text-gray-900">{name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.warehouseName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(record.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(exportMode || batchEditMode || batchDeleteMode) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {selectedRows.length === filteredRecords.length ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredRecords.length} 条</span>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {Math.ceil(filteredRecords.length / pageSize) || 1}</span>
            <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredRecords.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredRecords.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Harvest Record Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        title="采收登记"
        size="lg"
        onSubmit={handleCreateRecord}
        submitText="提交登记"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="采收批次" required error={errors.batchCode}>
              <select
                value={newRecord.batchCode}
                onChange={(e) => setNewRecord({ ...newRecord, batchCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择批次</option>
                {cropBatches.map(batch => (
                  <option key={batch.id} value={batch.batchCode}>{batch.batchCode} - {batch.cropName}</option>
                ))}
              </select>
            </FormField>
            <FormField label="采收区域" required error={errors.greenhouseId}>
              <select
                value={newRecord.greenhouseId}
                onChange={(e) => setNewRecord({ ...newRecord, greenhouseId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择区域</option>
                {greenhouses.map(gh => (
                  <option key={gh.id} value={gh.id}>{gh.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="采收日期" required error={errors.harvestDate}>
              <input
                type="date"
                value={newRecord.harvestDate}
                onChange={(e) => setNewRecord({ ...newRecord, harvestDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
            <FormField label="采收数量(kg)" required error={errors.harvestQuantity}>
              <input
                type="number"
                min="0"
                step="0.1"
                value={newRecord.harvestQuantity}
                onChange={(e) => setNewRecord({ ...newRecord, harvestQuantity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="品质等级">
              <select
                value={newRecord.grade}
                onChange={(e) => setNewRecord({ ...newRecord, grade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="A">A级 (优质)</option>
                <option value="B">B级 (良好)</option>
                <option value="C">C级 (一般)</option>
              </select>
            </FormField>
            <FormField label="入库仓库" required error={errors.warehouseId}>
              <select
                value={newRecord.warehouseId}
                onChange={(e) => setNewRecord({ ...newRecord, warehouseId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择仓库</option>
                {warehouseOptions.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="采收人员">
            <div className="relative">
              <div
                className="w-full min-h-[42px] px-3 py-2 border border-gray-200 rounded-lg bg-white cursor-pointer flex items-center justify-between"
                onClick={() => {
                  const dropdown = document.getElementById('harvester-dropdown');
                  if (dropdown) dropdown.classList.toggle('hidden');
                }}
              >
                <span className="text-sm text-gray-700">
                  {newRecord.harvesterIds.length > 0
                    ? `${newRecord.harvesterIds.length} 人已选择`
                    : '请选择采收人员'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
              <div id="harvester-dropdown" className="hidden absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                {users.filter(u => u.role === 'worker' || u.role === 'technician').map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={newRecord.harvesterIds.includes(user.id)}
                      onChange={() => toggleHarvester(user.id)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </FormField>

          <FormField label="备注">
            <textarea
              value={newRecord.remarks}
              onChange={(e) => setNewRecord({ ...newRecord, remarks: e.target.value })}
              placeholder="请输入采收备注"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </FormField>
        </div>
      </Modal>

      {/* Export Format Modal */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={filteredRecords}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleConfirmBatchEdit}
        greenhouses={greenhouses}
        warehouses={warehousesForModal}
        users={users}
        cropBatches={cropBatches}
      />

      {/* Delete Warning Modal */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}
