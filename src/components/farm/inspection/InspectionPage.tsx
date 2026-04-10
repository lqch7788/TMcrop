import { useState } from 'react';
import {
  Search, Plus, Eye, AlertTriangle, MapPin, Calendar, User, Camera, X, ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { inspectionRecords as initialRecords, greenhouses, users, cropTypes } from '../../../data/mockData';
import { Modal, FormField } from '../../ui/Modal';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';

export default function InspectionPage() {
  // 问题记录持久化 Hook - 同步巡田监测问题到每日问题汇总
  const { addProblem } = usePersistentProblems();

  // Inspection Records State
  const [inspectionRecords, setInspectionRecords] = useState([...initialRecords]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search state
  const [searchFilters, setSearchFilters] = useState({
    inspectorName: '',
    greenhouseId: '',
    cropName: '',
    startDate: '',
    endDate: '',
    status: '',
  });

  // Export state
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // Create Inspection Record Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    greenhouseId: '',
    cropName: '',
    inspectorId: '',
    checkDate: new Date().toISOString().split('T')[0],
    checkTime: new Date().toTimeString().slice(0, 5),
    weather: '晴',
    temperature: 0,
    humidity: 0,
    cropStatus: '良好',
    plantHeight: 0,
    leafCount: 0,
    issueText: '',
    newImages: [] as string[],
    remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const weatherOptions = ['晴', '多云', '阴', '雨', '雪', '雾'];
  const cropStatusOptions = ['良好', '一般', '较差', '有病虫害'];

  // Filter records based on search
  const filteredRecords = inspectionRecords.filter(record => {
    if (searchFilters.inspectorName && !record.inspectorName.includes(searchFilters.inspectorName)) return false;
    if (searchFilters.greenhouseId && record.greenhouseId !== searchFilters.greenhouseId) return false;
    if (searchFilters.cropName && !record.cropName.includes(searchFilters.cropName)) return false;
    if (searchFilters.startDate && record.checkDate < searchFilters.startDate) return false;
    if (searchFilters.endDate && record.checkDate > searchFilters.endDate) return false;
    if (searchFilters.status && record.status !== searchFilters.status) return false;
    return true;
  });

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchFilters({
      inspectorName: '',
      greenhouseId: '',
      cropName: '',
      startDate: '',
      endDate: '',
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
    const headers = ['巡检单号', '巡检人员', '巡检区域', '作物名称', '巡检日期', '作物状态', '天气', '温度', '湿度'];
    const exportData = selectedData.map(row => ({
      '巡检单号': row.recordCode,
      '巡检人员': row.inspectorName,
      '巡检区域': row.greenhouseName,
      '作物名称': row.cropName,
      '巡检日期': row.checkDate,
      '作物状态': row.cropStatus,
      '天气': row.weather,
      '温度': row.temperature,
      '湿度': row.humidity
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
    const fileName = `巡田巡检_${new Date().toISOString().slice(0, 10)}.${extension}`;

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newRecord.greenhouseId) newErrors.greenhouseId = '请选择巡田区域';
    if (!newRecord.cropName) newErrors.cropName = '请选择作物名称';
    if (!newRecord.inspectorId) newErrors.inspectorId = '请选择巡田人员';
    if (!newRecord.checkDate) newErrors.checkDate = '请选择巡田日期';
    if (newRecord.temperature < -50 || newRecord.temperature > 100) newErrors.temperature = '温度数值不合理';
    if (newRecord.humidity < 0 || newRecord.humidity > 100) newErrors.humidity = '湿度数值不合理';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateRecord = () => {
    if (!validateForm()) return;

    const selectedGreenhouse = greenhouses.find(g => g.id === newRecord.greenhouseId);
    const selectedUser = users.find(u => u.id === newRecord.inspectorId);

    const record = {
      id: inspectionRecords.length + 1,
      greenhouseId: newRecord.greenhouseId,
      greenhouseName: selectedGreenhouse?.name || '',
      cropName: newRecord.cropName,
      inspectorId: newRecord.inspectorId,
      inspectorName: selectedUser?.name || '',
      checkDate: newRecord.checkDate,
      checkTime: newRecord.checkTime,
      weather: newRecord.weather,
      temperature: newRecord.temperature,
      humidity: newRecord.humidity,
      cropStatus: newRecord.cropStatus,
      plantHeight: newRecord.plantHeight || undefined,
      leafCount: newRecord.leafCount || undefined,
      status: 'normal' as const,
      issues: newRecord.issueText ? [newRecord.issueText] : [],
      images: newRecord.newImages,
      remarks: newRecord.remarks,
    };

    setInspectionRecords([record, ...inspectionRecords]);

    // 如果有异常问题，同步到问题记录（用于每日问题汇总）
    if (newRecord.issueText && newRecord.issueText.trim() !== '') {
      // 判断严重程度
      let severity: '轻微' | '中等' | '严重' = '轻微';
      if (newRecord.issueText.includes('严重') || newRecord.issueText.includes('灰霉') || newRecord.issueText.includes('病毒')) {
        severity = '严重';
      } else if (newRecord.issueText.includes('蚜虫') || newRecord.issueText.includes('病') || newRecord.issueText.includes('虫')) {
        severity = '中等';
      }

      addProblem({
        greenhouseId: newRecord.greenhouseId,
        greenhouseName: selectedGreenhouse?.name || '',
        cropName: newRecord.cropName,
        inspectorId: newRecord.inspectorId,
        inspectorName: selectedUser?.name || '',
        checkDate: newRecord.checkDate,
        checkTime: newRecord.checkTime,
        weather: newRecord.weather,
        temperature: newRecord.temperature,
        humidity: newRecord.humidity,
        cropStatus: newRecord.cropStatus,
        plantHeight: newRecord.plantHeight || undefined,
        leafCount: newRecord.leafCount || undefined,
        issueText: newRecord.issueText,
        issueSeverity: severity,
        status: '待处理',
        remarks: newRecord.remarks,
        images: newRecord.newImages,
      });
    }

    setIsCreateModalOpen(false);
    setNewRecord({
      greenhouseId: '',
      cropName: '',
      inspectorId: '',
      checkDate: new Date().toISOString().split('T')[0],
      checkTime: new Date().toTimeString().slice(0, 5),
      weather: '晴',
      temperature: 0,
      humidity: 0,
      cropStatus: '良好',
      plantHeight: 0,
      leafCount: 0,
      issueText: '',
      newImages: [],
      remarks: '',
    });
    setErrors({});
  };

  const handleDetailClick = (record: any) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentCount = newRecord.newImages.length;
    const remainingSlots = 6 - currentCount;
    if (remainingSlots <= 0) {
      alert('最多只能添加6张照片');
      return;
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setNewRecord(prev => ({
          ...prev,
          newImages: [...prev.newImages, result]
        }));
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setNewRecord(prev => ({
      ...prev,
      newImages: prev.newImages.filter((_, i) => i !== index)
    }));
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setNewRecord({
      greenhouseId: '',
      cropName: '',
      inspectorId: '',
      checkDate: new Date().toISOString().split('T')[0],
      checkTime: new Date().toTimeString().slice(0, 5),
      weather: '晴',
      temperature: 0,
      humidity: 0,
      cropStatus: '良好',
      plantHeight: 0,
      leafCount: 0,
      issueText: '',
      newImages: [],
      remarks: '',
    });
    setErrors({});
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">正常</span>;
      case 'warning':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">注意</span>;
      case 'attention':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">注意</span>;
      case 'critical':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">告警</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未知</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">巡田监测</h1>
            <p className="text-gray-500">人工巡田记录管理</p>
          </div>
        </div>
      </div>

      {/* 搜索卡片 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 监测人员 */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">监测人员</label>
            <input
              type="text"
              value={searchFilters.inspectorName}
              onChange={(e) => setSearchFilters({ ...searchFilters, inspectorName: e.target.value })}
              placeholder="请输入监测人员"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 监测区域 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">监测区域</label>
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

          {/* 监测日期(起) */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">监测日期(起)</label>
            <input
              type="date"
              value={searchFilters.startDate}
              onChange={(e) => setSearchFilters({ ...searchFilters, startDate: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 监测日期(止) */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">监测日期(止)</label>
            <input
              type="date"
              value={searchFilters.endDate}
              onChange={(e) => setSearchFilters({ ...searchFilters, endDate: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
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
              <option value="normal">正常</option>
              <option value="attention">需关注</option>
              <option value="critical">异常</option>
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
              新增记录
            </button>
          </div>
        </div>
      </div>

      {/* 巡田记录表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">巡田记录列表</h3>
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
                {exportMode && <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredRecords.length && filteredRecords.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">监测人员</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">监测区域</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">作物名称</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">监测日期</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">天气</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">温度(°C)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">湿度(%)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">作物状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">发现问题</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">问题照片</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record, idx) => (
                <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                  {exportMode && (
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(idx)}
                        onChange={() => handleSelectRow(idx)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-gray-900">{record.inspectorName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span className="text-gray-900">{record.greenhouseName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.cropName}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.checkDate}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.weather}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.temperature}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.humidity}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.cropStatus}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.issues.length > 0 ? (
                      <div className="flex gap-1 justify-center flex-wrap">
                        {record.issues.slice(0, 2).map((issue, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">{issue}</span>
                        ))}
                        {record.issues.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{record.issues.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {record.images && record.images.length > 0 ? (
                      <div className="flex justify-center gap-1">
                        {record.images.slice(0, 3).map((img: string, idx: number) => (
                          <div key={idx} className="w-8 h-8 rounded overflow-hidden bg-gray-100">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {record.images.length > 3 && (
                          <span className="flex items-center justify-center w-8 h-8 text-xs text-gray-500">+{record.images.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(record.status)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleDetailClick(record)}
                      className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                    >
                      详情
                    </button>
                  </td>
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
              className="px-2 py-1 border border-gray-200 rounded text-sm"
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

      {/* Create Inspection Record Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        title="新增记录"
        size="lg"
        onSubmit={handleCreateRecord}
        submitText="提交记录"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="巡田区域" required error={errors.greenhouseId}>
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
            <FormField label="作物名称" required error={errors.cropName}>
              <select
                value={newRecord.cropName}
                onChange={(e) => setNewRecord({ ...newRecord, cropName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择作物</option>
                {cropTypes.map(crop => (
                  <option key={crop.id} value={crop.name}>{crop.name}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="巡田人员" required error={errors.inspectorId}>
              <select
                value={newRecord.inspectorId}
                onChange={(e) => setNewRecord({ ...newRecord, inspectorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择人员</option>
                {users.filter(u => u.role === 'technician' || u.role === 'supervisor').map(user => (
                  <option key={user.id} value={user.id}>{user.name} - {user.roleName}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="巡田日期" required error={errors.checkDate}>
              <input
                type="date"
                value={newRecord.checkDate}
                onChange={(e) => setNewRecord({ ...newRecord, checkDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
            <FormField label="巡田时间">
              <input
                type="time"
                value={newRecord.checkTime}
                onChange={(e) => setNewRecord({ ...newRecord, checkTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="天气">
              <select
                value={newRecord.weather}
                onChange={(e) => setNewRecord({ ...newRecord, weather: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {weatherOptions.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </FormField>
            <FormField label="温度(°C)" required error={errors.temperature}>
              <input
                type="number"
                step="0.1"
                value={newRecord.temperature}
                onChange={(e) => setNewRecord({ ...newRecord, temperature: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
            <FormField label="湿度(%)" required error={errors.humidity}>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={newRecord.humidity}
                onChange={(e) => setNewRecord({ ...newRecord, humidity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="作物状态">
              <select
                value={newRecord.cropStatus}
                onChange={(e) => setNewRecord({ ...newRecord, cropStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {cropStatusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>
            <FormField label="株高(cm)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={newRecord.plantHeight || ''}
                onChange={(e) => setNewRecord({ ...newRecord, plantHeight: parseFloat(e.target.value) || 0 })}
                placeholder="选填"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
            <FormField label="叶片数">
              <input
                type="number"
                min="0"
                value={newRecord.leafCount || ''}
                onChange={(e) => setNewRecord({ ...newRecord, leafCount: parseInt(e.target.value) || 0 })}
                placeholder="选填"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
          </div>

          <FormField label="发现问题">
            <textarea
              value={newRecord.issueText}
              onChange={(e) => setNewRecord({ ...newRecord, issueText: e.target.value })}
              placeholder="请描述发现的问题"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </FormField>

          <FormField label="备注">
            <textarea
              value={newRecord.remarks}
              onChange={(e) => setNewRecord({ ...newRecord, remarks: e.target.value })}
              placeholder="请输入巡田备注"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </FormField>

          {/* 问题照片上传 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">问题照片 (最多6张)</label>
            <div className="space-y-3">
              <div className="flex gap-3 flex-wrap">
                {newRecord.newImages.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                    <img src={img} alt={`问题照片${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {newRecord.newImages.length < 6 && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">添加</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500">已添加 {newRecord.newImages.length}/6 张照片</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* 巡田记录详情弹窗 */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="记录详情"
        size="lg"
      >
        {selectedRecord && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">监测人员</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.inspectorName}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">监测区域</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.greenhouseName}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">作物名称</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.cropName}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">监测日期</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.checkDate}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">天气</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.weather}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">温度</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.temperature}°C</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">湿度</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.humidity}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">作物状态</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.cropStatus}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">状态</span>
                {getStatusBadge(selectedRecord.status)}
              </div>
              {selectedRecord.plantHeight && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">株高</span>
                  <span className="text-sm font-medium text-gray-900">{selectedRecord.plantHeight} cm</span>
                </div>
              )}
              {selectedRecord.leafCount && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">叶片数</span>
                  <span className="text-sm font-medium text-gray-900">{selectedRecord.leafCount} 片</span>
                </div>
              )}
            </div>

            {/* 生长环境参数 */}
            {(selectedRecord.airTemperature || selectedRecord.soilTemperature) && (
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-3">生长环境参数</h4>
                <div className="grid grid-cols-2 gap-6">
                  {/* 空气环境参数 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">空气环境参数</h5>
                    <div className="space-y-3">
                      {selectedRecord.airTemperature && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600">空气温度</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedRecord.airTemperature}°C</span>
                        </div>
                      )}
                      {selectedRecord.airHumidity && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600">空气湿度</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedRecord.airHumidity}%</span>
                        </div>
                      )}
                      {selectedRecord.lightIntensity && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600">光照强度</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedRecord.lightIntensity} Lux</span>
                        </div>
                      )}
                      {selectedRecord.co2Concentration && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600">CO2浓度</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedRecord.co2Concentration} ppm</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 土壤环境参数 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">土壤环境参数</h5>
                    <div className="space-y-3">
                      {selectedRecord.soilTemperature && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600">土壤温度</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedRecord.soilTemperature}°C</span>
                        </div>
                      )}
                      {selectedRecord.soilMoisture && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600">土壤湿度</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedRecord.soilMoisture}%</span>
                        </div>
                      )}
                      {selectedRecord.soilEc && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600">土壤EC值</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedRecord.soilEc} mS/cm</span>
                        </div>
                      )}
                      {selectedRecord.soilPh && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600">土壤PH值</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedRecord.soilPh}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 发现问题 */}
            {selectedRecord.issues && selectedRecord.issues.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-3">发现问题</h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedRecord.issues.map((issue: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full">{issue}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 问题照片 */}
            {selectedRecord.images && selectedRecord.images.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-3">问题照片 (最多6张)</h4>
                <div className="grid grid-cols-3 gap-3">
                  {selectedRecord.images.slice(0, 6).map((img: string, idx: number) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={img} alt={`问题照片${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 备注 */}
            {selectedRecord.remarks && (
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-3">备注</h4>
                <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{selectedRecord.remarks}</p>
              </div>
            )}
          </div>
        )}
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
