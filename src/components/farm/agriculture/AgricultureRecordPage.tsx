import { useState } from 'react';
import { Sprout, Droplets, Leaf, AlertTriangle, ChevronLeft, ChevronRight, Search, Plus, Download, Calendar, MapPin, User, Package, X, Pencil, Trash2 } from 'lucide-react';
import { usePersistentWorkLogs } from '../../../hooks/usePersistentWorkLogs';
import { BatchEditModal, DeleteWarningModal, ExportFormatModal } from './modals';
// 导入农事管理 Mock 数据（消除硬编码）
import { farmOperationRecords, greenhouseOptions, operatorOptions, materialOptions, workloadUnitOptions } from '../../../data/farmMockData';
import { FARM_OPERATION_TYPES } from '../../../types/farm/common';
import type { FarmOperationRecord } from '../../../data/farmMockData';

// FarmOperationRecord 转换为组件内部使用的记录格式
interface OperationRecord {
  id: string;
  code: string;
  type: string;
  cropName: string;
  variety: string;
  greenhouse: string;
  greenhouseId: string;
  area: number;
  operator: string;
  operatorId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  workload: number;
  unit: string;
  materials: string[];
  status: string;
  remarks: string;
  // 数据闭环关联字段
  relatedTaskId?: string;
  relatedTaskCode?: string;
  batchId?: string;
  batchCode?: string;
}

// 将 Mock 数据格式转换为组件内部格式
const convertToOperationRecord = (record: FarmOperationRecord): OperationRecord => ({
  id: record.id,
  code: record.recordCode,
  type: record.operationTypeName,
  cropName: record.cropName,
  variety: record.variety || '',
  greenhouse: record.greenhouseName,
  greenhouseId: record.greenhouseId,
  area: 0, // 原数据结构无此字段
  operator: record.operatorName,
  operatorId: record.operatorId,
  date: record.operationDate,
  startTime: record.startTime,
  endTime: record.endTime,
  duration: record.duration,
  workload: record.workload,
  unit: record.unit,
  materials: record.materials || [],
  status: record.status,
  remarks: record.remarks || '',
  relatedTaskId: record.relatedTaskId,
  relatedTaskCode: record.relatedTaskCode,
  batchId: record.batchId,
  batchCode: record.batchCode,
});

export default function AgricultureRecordPage() {
  // 持久化工单 Hook - 同步农事操作到工作日志
  const { addWorkLog } = usePersistentWorkLogs();

  // 农事操作记录状态 - 从 Mock 数据导入
  const [operationRecords, setOperationRecords] = useState<OperationRecord[]>(
    farmOperationRecords.map(convertToOperationRecord)
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchFilters, setSearchFilters] = useState({
    code: '',
    type: '',
    cropName: '',
    greenhouseId: '',
    operatorName: '',
    status: '',
  });
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // Batch Edit state
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, any>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // Batch Delete state
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);
  const [otherMaterial, setOtherMaterial] = useState('');
  const [newRecord, setNewRecord] = useState({
    type: '',
    cropName: '',
    variety: '',
    greenhouse: '',
    operator: '',
    date: '',
    startTime: '',
    endTime: '',
    workload: '',
    unit: '株',
    materials: [] as string[],
    otherMaterial: '',
    remarks: '',
  });

  // 从 Mock 数据导入的选项配置（消除硬编码）
  // greenhouseOptions: { value, label, type, area }[]
  // operatorOptions: { value, label, role, roleName }[]
  // materialOptions: string[]
  // workloadUnitOptions: { value, label }[]

  // 转换 workloadUnitOptions 为字符串数组（兼容原有组件接口）
  const unitOptions = workloadUnitOptions.map(u => u.label);

  // 转换 greenhouseOptions 为字符串数组（兼容原有组件接口）
  const greenhouseOptionsStr = greenhouseOptions.map(g => g.label);

  // 转换 operatorOptions 为字符串数组（兼容原有组件接口）
  const operatorOptionsStr = operatorOptions.map(o => o.label);

  const handleAddClick = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setMaterialDropdownOpen(false);
    setOtherMaterial('');
    setNewRecord({
      type: '',
      cropName: '',
      variety: '',
      greenhouse: '',
      operator: '',
      date: '',
      startTime: '',
      endTime: '',
      workload: '',
      unit: '株',
      materials: [],
      otherMaterial: '',
      remarks: '',
    });
  };

  const handleMaterialChange = (material: string) => {
    if (newRecord.materials.includes(material)) {
      setNewRecord({ ...newRecord, materials: newRecord.materials.filter(m => m !== material) });
    } else {
      setNewRecord({ ...newRecord, materials: [...newRecord.materials, material] });
    }
  };

  const handleSaveRecord = () => {
    // 计算工作时长
    let workHours = 0;
    if (newRecord.startTime && newRecord.endTime) {
      const [sh, sm] = newRecord.startTime.split(':').map(Number);
      const [eh, em] = newRecord.endTime.split(':').map(Number);
      workHours = (eh * 60 + em - sh * 60 - sm) / 60;
    }

    // 判断是否有问题（备注中包含关键词）
    const hasProblems = newRecord.remarks.includes('问题') || newRecord.remarks.includes('异常') || newRecord.remarks.includes('发现');

    // 同步到工作日志（用于每日工单汇总）
    addWorkLog({
      code: `WL${newRecord.date.replace(/-/g, '')}${String(Date.now()).slice(-3)}`,
      date: newRecord.date,
      worker: newRecord.operator,
      weather: '晴', // 默认值
      temperature: '25°C', // 默认值
      crop: newRecord.cropName,
      greenhouse: newRecord.greenhouse,
      growthStatus: '良好',
      tasks: newRecord.type + (newRecord.remarks ? ` - ${newRecord.remarks.slice(0, 20)}` : ''),
      problems: hasProblems ? newRecord.remarks : '无',
      solutions: hasProblems ? '已记录' : '-',
      batchId: undefined,
      taskId: undefined,
      batchCode: undefined,
    });

    console.log('Saving new record and syncing to work log:', newRecord);
    setShowAddModal(false);
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredRecords.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredRecords.map(r => r.id));
    }
  };

  const handleSelectRow = (id: string) => {
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
    handleActualExport();
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
    const updatedRecords = [...operationRecords];
    editedRecordIds.forEach(id => {
      const index = updatedRecords.findIndex(r => r.id.toString() === id);
      if (index !== -1 && editedRecords[id]) {
        updatedRecords[index] = { ...updatedRecords[index], ...editedRecords[id] };
      }
    });
    setOperationRecords(updatedRecords);
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
    // Delete selected records
    const indicesToDelete = new Set(selectedRows);
    const remainingRecords = operationRecords.filter((_, index) => {
      const filteredIndex = filteredRecords.findIndex(r => r.id === operationRecords[index].id);
      return !indicesToDelete.has(filteredIndex);
    });
    setOperationRecords(remainingRecords);
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleActualExport = () => {
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    // Get selected data - use index-based selection from paginated records
    const selectedData = paginatedRecords.filter((_, index) => selectedRows.includes(index));
    const headers = ['操作单号', '操作类型', '作物名称', '品种', '操作区域', '操作人员', '操作日期', '操作面积', '状态', '备注'];
    const exportData = selectedData.map(row => ({
      '操作单号': row.code,
      '操作类型': row.type,
      '作物名称': row.cropName,
      '品种': row.variety,
      '操作区域': row.greenhouse,
      '操作人员': row.operator,
      '操作日期': row.date,
      '操作面积': `${row.workload}${row.unit}`,
      '状态': row.status === 'completed' ? '已完成' : row.status === 'in_progress' ? '进行中' : row.status === 'pending' ? '待执行' : '已取消',
      '备注': row.remarks
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
    } else if (exportFormat === 'xlsx' || exportFormat === 'excel') {
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
    const fileName = `农事操作记录_${new Date().toISOString().slice(0, 10)}.${extension}`;

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

  const handleCloseExportModal = () => {
    setShowExportModal(false);
  };

  // 从类型定义导入操作类型选项（消除硬编码）
  const typeOptions = FARM_OPERATION_TYPES.map(t => t.label);

  // 从类型定义导入状态选项（消除硬编码）
  const statusOptions = [
    { value: '', label: '全部' },
    { value: 'pending', label: '待执行' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ];

  const filteredRecords = operationRecords.filter(record => {
    if (searchFilters.code && !record.code.includes(searchFilters.code)) return false;
    if (searchFilters.type && record.type !== searchFilters.type) return false;
    if (searchFilters.cropName && !record.cropName.includes(searchFilters.cropName)) return false;
    if (searchFilters.greenhouseId && record.greenhouseId !== searchFilters.greenhouseId) return false;
    if (searchFilters.operatorName && !record.operator.includes(searchFilters.operatorName)) return false;
    if (searchFilters.status && record.status !== searchFilters.status) return false;
    return true;
  });

  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      '定植': 'bg-green-100 text-green-700',
      '灌溉': 'bg-blue-100 text-blue-700',
      '施肥': 'bg-amber-100 text-amber-700',
      '病虫害防治': 'bg-red-100 text-red-700',
      '修剪': 'bg-purple-100 text-purple-700',
      '采收': 'bg-orange-100 text-orange-700',
      '中耕除草': 'bg-emerald-100 text-emerald-700',
      '其他': 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colors[type] || colors['其他']}`}>
        {type}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'completed': { label: '已完成', className: 'bg-green-100 text-green-700' },
      'in_progress': { label: '进行中', className: 'bg-blue-100 text-blue-700' },
      'pending': { label: '待执行', className: 'bg-amber-100 text-amber-700' },
      'cancelled': { label: '已取消', className: 'bg-gray-100 text-gray-700' },
    };
    const s = statusMap[status] || statusMap['pending'];
    return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">农事操作记录</h1>
            <p className="text-gray-500">追踪记录所有农业生产活动</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{operationRecords.filter(r => r.type === '定植').length}</p>
              <p className="text-xs text-gray-500">定植记录</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{operationRecords.filter(r => r.type === '灌溉').length}</p>
              <p className="text-xs text-gray-500">灌溉记录</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{operationRecords.filter(r => r.type === '施肥').length}</p>
              <p className="text-xs text-gray-500">施肥记录</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{operationRecords.filter(r => r.type === '病虫害防治').length}</p>
              <p className="text-xs text-gray-500">病虫害防治</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索卡片 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">操作单号</label>
            <input
              type="text"
              value={searchFilters.code}
              onChange={(e) => setSearchFilters({ ...searchFilters, code: e.target.value })}
              placeholder="请输入操作单号"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
            <select
              value={searchFilters.type}
              onChange={(e) => setSearchFilters({ ...searchFilters, type: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部</option>
              {typeOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
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
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">操作区域</label>
            <select
              value={searchFilters.greenhouseId}
              onChange={(e) => setSearchFilters({ ...searchFilters, greenhouseId: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部</option>
              <option value="玻璃温室A区">玻璃温室A区</option>
              <option value="玻璃温室B区">玻璃温室B区</option>
              <option value="玻璃温室C区">玻璃温室C区</option>
              <option value="日光温室1号">日光温室1号</option>
              <option value="日光温室2号">日光温室2号</option>
              <option value="日光温室3号">日光温室3号</option>
              <option value="塑料大棚1号">塑料大棚1号</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">操作人员</label>
            <input
              type="text"
              value={searchFilters.operatorName}
              onChange={(e) => setSearchFilters({ ...searchFilters, operatorName: e.target.value })}
              placeholder="请输入操作人员"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={searchFilters.status}
              onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {statusOptions.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setSearchFilters({ code: '', type: '', cropName: '', greenhouseId: '', operatorName: '', status: '' }); setCurrentPage(1); }}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
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
              onClick={handleAddClick}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>
        </div>
      </div>

      {/* 农事操作记录表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">农事操作记录表</h3>
          {(exportMode || batchEditMode || batchDeleteMode) ? (
            <div className="flex items-center gap-2">
              {exportMode && (
                <>
                  <button onClick={handleConfirmExport} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
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
                {(exportMode || batchEditMode || batchDeleteMode) && <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredRecords.length && filteredRecords.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作单号</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作类型</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">作物名称</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">品种</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作区域</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作人员</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作日期</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作面积</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">使用物料</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginatedRecords.map((r) => (
                <tr key={r.id} className="hover:bg-blue-100 transition-colors">
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(r.id)}
                        onChange={() => handleSelectRow(r.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-center font-medium text-gray-900 whitespace-nowrap">{r.code}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getTypeBadge(r.type)}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 whitespace-nowrap">{r.cropName}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{r.variety}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{r.greenhouse}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 whitespace-nowrap">{r.operator}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 whitespace-nowrap">{r.workload}{r.unit}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex justify-center gap-1 flex-wrap">
                      {r.materials.length > 0 ? r.materials.slice(0, 2).map((m, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{m}</span>
                      )) : <span className="text-xs text-gray-400">-</span>}
                      {r.materials.length > 2 && <span className="text-xs text-gray-400">+{r.materials.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 max-w-[150px] truncate whitespace-nowrap" title={r.remarks}>{r.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(exportMode || batchEditMode || batchDeleteMode) && (
          <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleSelectAll}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {selectedRows.length === filteredRecords.length ? '全不选' : '全选'}
            </button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        )}
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

      {/* 新增农事操作记录弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">新增农事操作记录</h3>
              <button onClick={handleCloseAddModal} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作类型 <span className="text-red-500">*</span></label>
                  <select
                    value={newRecord.type}
                    onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">请选择</option>
                    {typeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">作物名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newRecord.cropName}
                    onChange={(e) => setNewRecord({ ...newRecord, cropName: e.target.value })}
                    placeholder="请输入作物名称"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">品种</label>
                  <input
                    type="text"
                    value={newRecord.variety}
                    onChange={(e) => setNewRecord({ ...newRecord, variety: e.target.value })}
                    placeholder="请输入品种"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作区域 <span className="text-red-500">*</span></label>
                  <select
                    value={newRecord.greenhouse}
                    onChange={(e) => setNewRecord({ ...newRecord, greenhouse: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">请选择</option>
                    {greenhouseOptions.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作人员 <span className="text-red-500">*</span></label>
                  <select
                    value={newRecord.operator}
                    onChange={(e) => setNewRecord({ ...newRecord, operator: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">请选择</option>
                    {operatorOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作日期 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={newRecord.date}
                    onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={newRecord.startTime}
                    onChange={(e) => setNewRecord({ ...newRecord, startTime: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input
                    type="time"
                    value={newRecord.endTime}
                    onChange={(e) => setNewRecord({ ...newRecord, endTime: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作数量</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newRecord.workload}
                      onChange={(e) => setNewRecord({ ...newRecord, workload: e.target.value })}
                      placeholder="数量"
                      className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={newRecord.unit}
                      onChange={(e) => setNewRecord({ ...newRecord, unit: e.target.value })}
                      className="w-20 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    >
                      {workloadUnitOptions.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">使用物料</label>
                  <div className="relative">
                    <div
                      onClick={() => setMaterialDropdownOpen(!materialDropdownOpen)}
                      className="w-full min-h-[40px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white cursor-pointer flex items-center flex-wrap gap-1"
                    >
                      {newRecord.materials.length === 0 ? (
                        <span className="text-gray-400">请选择物料</span>
                      ) : (
                        newRecord.materials.map(m => (
                          <span key={m} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                            {m}
                          </span>
                        ))
                      )}
                    </div>
                    {materialDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {materialOptions.map(m => (
                          <label
                            key={m}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={newRecord.materials.includes(m)}
                              onChange={() => handleMaterialChange(m)}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-2"
                            />
                            <span className="text-sm text-gray-700">{m}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {newRecord.materials.includes('其他') && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={otherMaterial}
                        onChange={(e) => setOtherMaterial(e.target.value)}
                        placeholder="请输入其他物料"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    value={newRecord.remarks}
                    onChange={(e) => setNewRecord({ ...newRecord, remarks: e.target.value })}
                    placeholder="请输入备注信息"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseAddModal}
                className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSaveRecord}
                className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleActualExport}
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
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        greenhouseOptions={greenhouseOptionsStr}
        operatorOptions={operatorOptionsStr}
        unitOptions={unitOptions}
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
