import { useState } from 'react';
import {
  Search, Plus, Warehouse, Calendar, User, Package, ChevronDown, Filter, X, ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { harvestRecords as initialRecords, cropBatches, greenhouses, users } from '../../../data/mockData';
import { Modal, FormField, Input, Select, Textarea } from '../../ui/Modal';

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

  const warehouses = [
    { id: 'W001', name: '冷藏库A区' },
    { id: 'W002', name: '冷藏库B区' },
    { id: 'W003', name: '常温库' },
  ];

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
    const selectedWarehouse = warehouses.find(w => w.id === newRecord.warehouseId);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Warehouse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">采收入库</h1>
            <p className="text-gray-500">管理采收记录、品质分级和入库操作</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '本月采收批次', value: harvestRecords.length, icon: Package, color: 'bg-emerald-500' },
          { label: '总采收量', value: harvestRecords.reduce((sum, r) => sum + r.harvestQuantity, 0), icon: Warehouse, color: 'bg-blue-500', unit: 'kg' },
          { label: 'A级占比', value: harvestRecords.length > 0 ? Math.round(harvestRecords.filter(r => r.grade === 'A').length / harvestRecords.length * 100) : 0, icon: Package, color: 'bg-amber-500', unit: '%' },
          { label: '待入库', value: harvestRecords.filter(r => r.status !== 'stored').length, icon: Warehouse, color: 'bg-purple-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}{stat.unit || ''}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 搜索卡片 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 采收单号 */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">采收单号</label>
            <input
              type="text"
              value={searchFilters.harvestCode}
              onChange={(e) => setSearchFilters({ ...searchFilters, harvestCode: e.target.value })}
              placeholder="请输入采收单号"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 批次信息 */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">批次信息</label>
            <input
              type="text"
              value={searchFilters.batchCode}
              onChange={(e) => setSearchFilters({ ...searchFilters, batchCode: e.target.value })}
              placeholder="请输入批次号"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 采收区域 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">采收区域</label>
            <select
              value={searchFilters.greenhouseId}
              onChange={(e) => setSearchFilters({ ...searchFilters, greenhouseId: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部</option>
              {greenhouses.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* 作物名称 */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">作物名称</label>
            <input
              type="text"
              value={searchFilters.cropName}
              onChange={(e) => setSearchFilters({ ...searchFilters, cropName: e.target.value })}
              placeholder="请输入作物名称"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 品质等级 */}
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">品质等级</label>
            <select
              value={searchFilters.grade}
              onChange={(e) => setSearchFilters({ ...searchFilters, grade: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部</option>
              <option value="A">A级</option>
              <option value="B">B级</option>
              <option value="C">C级</option>
            </select>
          </div>

          {/* 采收人员 */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">采收人员</label>
            <input
              type="text"
              value={searchFilters.harvesterName}
              onChange={(e) => setSearchFilters({ ...searchFilters, harvesterName: e.target.value })}
              placeholder="请输入采收人员"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 入库仓库 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">入库仓库</label>
            <select
              value={searchFilters.warehouseId}
              onChange={(e) => setSearchFilters({ ...searchFilters, warehouseId: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* 状态 */}
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={searchFilters.status}
              onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部</option>
              <option value="harvested">已采收</option>
              <option value="graded">已分级</option>
              <option value="stored">已入库</option>
            </select>
          </div>

          {/* 按钮行 */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              重置
            </button>
            <button
              onClick={handleSearch}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>
        </div>
      </div>

      {/* Harvest Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">采收入库记录表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <button onClick={() => setShowExportModal(true)} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <button onClick={handleExportClick} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
              <Download className="w-4 h-4" />
              导出
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {exportMode && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
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
                  {exportMode && (
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
          {exportMode && (
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
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
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
      {showExportModal && (
        <>
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExportModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {[
                { value: 'excel', label: 'Excel 文件 (.xlsx)', icon: '📊' },
                { value: 'csv', label: 'CSV 文件 (.csv)', icon: '📄' },
                { value: 'word', label: 'Word 文件 (.docx)', icon: '📝' },
              ].map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    exportFormat === format.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-lg">{format.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{format.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowExportModal(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
              <button onClick={handleConfirmExport} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                导出
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
