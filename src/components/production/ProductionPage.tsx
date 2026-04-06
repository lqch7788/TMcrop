import { useState } from 'react';
import {
  Plus, Calendar, MapPin, Sprout,
  ChevronRight, ChevronLeft, FileText, Eye, Edit, Trash2, Search, Download, X
} from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { cropBatches, greenhouses, cropTypes, users, plantingModes } from '../../data/mockData';
import { CropBatch } from '../../types';

const stageColors: Record<string, string> = {
  seedling: 'bg-blue-100 text-blue-700',
  vegetative: 'bg-emerald-100 text-emerald-700',
  flowering: 'bg-purple-100 text-purple-700',
  fruiting: 'bg-amber-100 text-amber-700',
  harvest: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const stageProgress: Record<string, number> = {
  seedling: 15,
  vegetative: 40,
  flowering: 65,
  fruiting: 85,
  harvest: 100,
};

export default function ProductionPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState<CropBatch | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batches, setBatches] = useState<CropBatch[]>(cropBatches);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset filters
  const resetFilters = () => {
    setBatchCodeSearch('');
    setPlantingModeSearch('');
    setCropNameSearch('');
    setVarietySearch('');
    setGreenhouseSearch('');
    setStatusFilter('all');
  };

  // Search filters
  const [batchCodeSearch, setBatchCodeSearch] = useState('');
  const [plantingModeSearch, setPlantingModeSearch] = useState('');
  const [cropNameSearch, setCropNameSearch] = useState('');
  const [varietySearch, setVarietySearch] = useState('');
  const [greenhouseSearch, setGreenhouseSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    batchCode: '',
    cropName: '',
    variety: '',
    greenhouseId: '',
    plantingArea: '',
    startDate: '',
    expectedHarvestDate: '',
    targetYield: '',
    plantingMode: '',
    responsiblePerson: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  const filteredBatches = batches.filter((batch) => {
    const matchBatchCode = !batchCodeSearch || batch.batchCode.toLowerCase().includes(batchCodeSearch.toLowerCase());
    const matchPlantingMode = !plantingModeSearch || batch.plantingMode.toLowerCase().includes(plantingModeSearch.toLowerCase());
    const matchCropName = !cropNameSearch || batch.cropName.toLowerCase().includes(cropNameSearch.toLowerCase());
    const matchVariety = !varietySearch || batch.variety.toLowerCase().includes(varietySearch.toLowerCase());
    const matchGreenhouse = !greenhouseSearch || batch.greenhouseName.toLowerCase().includes(greenhouseSearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || batch.status === statusFilter;
    return matchBatchCode && matchPlantingMode && matchCropName && matchVariety && matchGreenhouse && matchStatus;
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.batchCode.trim()) newErrors.batchCode = '请输入批次编号';
    if (!formData.cropName) newErrors.cropName = '请选择作物';
    if (!formData.variety.trim()) newErrors.variety = '请输入品种';
    if (!formData.greenhouseId) newErrors.greenhouseId = '请选择温室';
    if (!formData.plantingArea) newErrors.plantingArea = '请输入种植面积';
    if (!formData.startDate) newErrors.startDate = '请选择定植日期';
    if (!formData.expectedHarvestDate) newErrors.expectedHarvestDate = '请选择预计采收日期';
    if (!formData.targetYield) newErrors.targetYield = '请输入目标产量';
    if (!formData.plantingMode) newErrors.plantingMode = '请选择种植模式';
    if (!formData.responsiblePerson) newErrors.responsiblePerson = '请选择负责人';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const greenhouse = greenhouses.find(g => g.id === formData.greenhouseId);
    const crop = cropTypes.find(c => c.name === formData.cropName);

    const newBatch: CropBatch = {
      id: `B${String(batches.length + 1).padStart(3, '0')}`,
      batchCode: formData.batchCode,
      cropName: formData.cropName,
      cropType: crop?.category || '',
      variety: formData.variety,
      greenhouseId: formData.greenhouseId,
      greenhouseName: greenhouse?.name || '',
      plantingArea: parseInt(formData.plantingArea),
      stage: 'seedling',
      stageName: '苗期',
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      targetYield: parseInt(formData.targetYield),
      actualYield: 0,
      status: 'planned',
      plantingMode: formData.plantingMode,
      responsiblePerson: formData.responsiblePerson
    };

    setBatches([newBatch, ...batches]);
    setShowCreateModal(false);
    setFormData({
      batchCode: '',
      cropName: '',
      variety: '',
      greenhouseId: '',
      plantingArea: '',
      startDate: '',
      expectedHarvestDate: '',
      targetYield: '',
      plantingMode: '',
      responsiblePerson: '',
      description: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    setShowCreateModal(false);
    setFormData({
      batchCode: '',
      cropName: '',
      variety: '',
      greenhouseId: '',
      plantingArea: '',
      startDate: '',
      expectedHarvestDate: '',
      targetYield: '',
      plantingMode: '',
      responsiblePerson: '',
      description: ''
    });
    setErrors({});
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredBatches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredBatches.map(b => b.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
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
    // Get selected data
    const selectedData = batches.filter(b => selectedRows.includes(b.id));
    const headers = ['批次编号', '种植模式', '作物名称', '作物品种', '种植区域', '种植面积', '定植日期', '预计采收', '生长阶段', '负责人', '目标产量', '实际产量'];
    const exportData = selectedData.map(row => ({
      '批次编号': row.batchCode,
      '种植模式': row.plantingMode,
      '作物名称': row.cropName,
      '作物品种': row.variety,
      '种植区域': row.greenhouseName,
      '种植面积': row.plantingArea,
      '定植日期': row.startDate,
      '预计采收': row.expectedHarvestDate,
      '生长阶段': row.stageName,
      '负责人': row.responsiblePerson,
      '目标产量': row.targetYield,
      '实际产量': row.actualYield
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
    const fileName = `生产计划_${new Date().toISOString().slice(0, 10)}.${extension}`;

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

  const generateBatchCode = () => {
    const year = new Date().getFullYear();
    const num = batches.length + 1;
    return `FQ${year}-${String(num).padStart(3, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产计划管理</h1>
            <p className="text-gray-500">管理种植批次、生产计划和技术方案</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '总批次', value: batches.length, color: 'bg-blue-500' },
          { label: '进行中', value: batches.filter(b => b.status === 'in_progress').length, color: 'bg-emerald-500' },
          { label: '已采收', value: batches.filter(b => b.stage === 'harvest').length, color: 'bg-amber-500' },
          { label: '待执行', value: batches.filter(b => b.status === 'planned').length, color: 'bg-gray-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 text-center mb-1">批次编号</label>
            <input
              type="text"
              placeholder="搜索批次编号"
              value={batchCodeSearch}
              onChange={(e) => setBatchCodeSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 text-center mb-1">种植模式</label>
            <input
              type="text"
              placeholder="搜索种植模式"
              value={plantingModeSearch}
              onChange={(e) => setPlantingModeSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 text-center mb-1">作物名称</label>
            <input
              type="text"
              placeholder="搜索作物名称"
              value={cropNameSearch}
              onChange={(e) => setCropNameSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 text-center mb-1">作物品种</label>
            <input
              type="text"
              placeholder="搜索作物品种"
              value={varietySearch}
              onChange={(e) => setVarietySearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 text-center mb-1">种植区域</label>
            <input
              type="text"
              placeholder="搜索种植区域"
              value={greenhouseSearch}
              onChange={(e) => setGreenhouseSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 text-center mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">全部状态</option>
              <option value="planned">待执行</option>
              <option value="in_progress">进行中</option>
              <option value="suspended">已暂停</option>
              <option value="completed">已完成</option>
            </select>
          </div>
          <div className="flex gap-2 ml-2">
            <button
              onClick={resetFilters}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              重置
            </button>
            <button
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>
        </div>
      </div>

      {/* 生产计划列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">生产计划列表</h3>
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
            <thead className="bg-gray-50">
              <tr>
                {exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredBatches.length && filteredBatches.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">批次编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">种植模式</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">种植区域</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">种植面积</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">定植日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">预计采收</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生长阶段</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">负责人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">目标产量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">实际产量</th>
                {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBatches.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  {exportMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(batch.id)}
                        onChange={() => handleSelectRow(batch.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{batch.batchCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{batch.plantingMode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{batch.cropName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{batch.variety}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{batch.greenhouseName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{batch.plantingArea} m²</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{batch.startDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{batch.expectedHarvestDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColors[batch.stage]}`}>
                      {batch.stageName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{batch.responsiblePerson}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{batch.targetYield} kg</td>
                  <td className="px-4 py-3 text-sm text-emerald-600">{batch.actualYield} kg</td>
                  {!exportMode && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedBatch(batch)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
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
                  {selectedRows.length === filteredBatches.length ? '全不选' : '全选'}
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
            <span className="text-sm text-gray-500">共 {filteredBatches.length} 条</span>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {Math.ceil(filteredBatches.length / pageSize)}</span>
            <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredBatches.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredBatches.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Batch Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleClose}
        title="创建种植批次"
        size="lg"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="批次编号" required error={errors.batchCode}>
              <div className="flex gap-2">
                <Input
                  value={formData.batchCode}
                  onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                  placeholder="例如：FQ2024-001"
                  error={!!errors.batchCode}
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, batchCode: generateBatchCode() })}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
                >
                  自动生成
                </button>
              </div>
            </FormField>

            <FormField label="作物类型" required error={errors.cropName}>
              <Select
                value={formData.cropName}
                onChange={(e) => {
                  const crop = cropTypes.find(c => c.name === e.target.value);
                  setFormData({
                    ...formData,
                    cropName: e.target.value,
                    variety: crop?.varieties[0] || ''
                  });
                }}
                options={cropTypes.map(c => ({ value: c.name, label: c.name }))}
              />
            </FormField>

            <FormField label="作物品种" required error={errors.variety}>
              <Input
                value={formData.variety}
                onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                placeholder="例如：红果番茄"
              />
            </FormField>

            <FormField label="种植温室" required error={errors.greenhouseId}>
              <Select
                value={formData.greenhouseId}
                onChange={(e) => setFormData({ ...formData, greenhouseId: e.target.value })}
                options={greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name }))}
              />
            </FormField>

            <FormField label="种植面积 (m²)" required error={errors.plantingArea}>
              <Input
                type="number"
                value={formData.plantingArea}
                onChange={(e) => setFormData({ ...formData, plantingArea: e.target.value })}
                placeholder="例如：1000"
              />
            </FormField>

            <FormField label="种植模式" required error={errors.plantingMode}>
              <Select
                value={formData.plantingMode}
                onChange={(e) => setFormData({ ...formData, plantingMode: e.target.value })}
                options={plantingModes.map(m => ({ value: m.name, label: m.name }))}
              />
            </FormField>

            <FormField label="定植日期" required error={errors.startDate}>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </FormField>

            <FormField label="预计采收日期" required error={errors.expectedHarvestDate}>
              <Input
                type="date"
                value={formData.expectedHarvestDate}
                onChange={(e) => setFormData({ ...formData, expectedHarvestDate: e.target.value })}
              />
            </FormField>

            <FormField label="目标产量 (kg)" required error={errors.targetYield}>
              <Input
                type="number"
                value={formData.targetYield}
                onChange={(e) => setFormData({ ...formData, targetYield: e.target.value })}
                placeholder="例如：10000"
              />
            </FormField>

            <FormField label="负责人" required error={errors.responsiblePerson}>
              <Select
                value={formData.responsiblePerson}
                onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                options={users.filter(u => ['manager', 'supervisor', 'technician'].includes(u.role)).map(u => ({ value: u.name, label: u.name }))}
              />
            </FormField>
          </div>

          <FormField label="备注说明">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="输入相关的备注信息..."
            />
          </FormField>
        </div>
      </Modal>

      {/* Batch Detail Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">批次详情</h3>
              <button onClick={() => setSelectedBatch(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-gray-500 uppercase">批次编号</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.batchCode}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">种植模式</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.plantingMode}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">作物名称</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.cropName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">作物品种</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.variety}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">种植区域</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.greenhouseName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">种植面积</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.plantingArea} m²</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">定植日期</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.startDate}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">预计采收</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.expectedHarvestDate}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">生长阶段</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.stageName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">负责人</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.responsiblePerson}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">目标产量</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedBatch.targetYield} kg</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">实际产量</label>
                  <p className="text-sm font-medium text-emerald-600 mt-1">{selectedBatch.actualYield} kg</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">生长进度</h4>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                    style={{ width: `${stageProgress[selectedBatch.stage]}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {['苗期', '生长期', '开花期', '结果期', '采收期'].map((stage, index) => (
                    <span key={stage} className={`text-xs ${selectedBatch.stage === ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest'][index] ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                      {stage}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setSelectedBatch(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">关闭</button>
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">查看工单</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Format Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExportModal(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
                <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-4">已选择 {selectedRows.length} 条数据</p>
                <div className="space-y-3">
                  {[
                    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
                    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
                    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
                  ].map((format) => (
                    <label
                      key={format.value}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                        exportFormat === format.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="exportFormat"
                        value={format.value}
                        checked={exportFormat === format.value}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{format.label}</p>
                        <p className="text-xs text-gray-500">{format.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowExportModal(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  取消
                </button>
                <button onClick={handleConfirmExport} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  导出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
