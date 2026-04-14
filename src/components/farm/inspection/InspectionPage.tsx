import { useState } from 'react';
import {
  Plus, Eye, Download, Pencil, Trash2, Scan, X
} from 'lucide-react';
import { inspectionRecords as initialRecords, greenhouses, users, cropTypes, cropBatches, equipmentRecords, infrastructureRecords, iotSensors } from '../../../data/mockData';
import QRScanner, { QRData } from '../../common/QRScanner';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { BatchEditModal, DeleteWarningModal, DetailInspectionModal } from './modals';
import { InspectionSearch } from './InspectionSearch';
import { InspectionTable } from './InspectionTable';
import { CreateInspectionModal } from './modals/CreateInspectionModal';
// 导入农事管理类型定义（消除硬编码）
import { WEATHER_OPTIONS, CROP_STATUS_OPTIONS } from '../../../types/farm/common';

export default function InspectionPage() {
  // 问题记录持久化 Hook - 同步巡查管理问题到每日问题汇总
  const { addProblem } = usePersistentProblems();

  // Inspection Records State
  const [inspectionRecords, setInspectionRecords] = useState([...initialRecords]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search state
  const [searchFilters, setSearchFilters] = useState({
    recordCode: '',
    inspectorName: '',
    inspectionType: '',
    startDate: '',
    endDate: '',
    status: '',
  });

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

  // Create Inspection Record Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    recordCode: '',
    inspectionType: 'farm' as 'farm' | 'equipment' | 'infrastructure' | 'other',
    greenhouseId: '',
    cropName: '',
    inspectorId: '',
    batchId: '',
    batchCode: '',
    checkDate: new Date().toISOString().split('T')[0],
    checkTime: new Date().toTimeString().slice(0, 5),
    duration: 0,
    weather: '晴',
    temperature: 0,
    humidity: 0,
    cropStatus: '良好',
    plantHeight: 0,
    leafCount: 0,
    // 新增巡查结果字段
    inspectionResult: 'normal' as 'normal' | 'abnormal',
    feedbackRequired: false,
    issueCategories: [] as string[],
    issuePresets: [] as string[],
    issueText: '',
    issuePhotos: [] as string[],
    feedbackUsers: [] as string[],
    expectedCompletion: '',
    remarks: '',
    // 设备保养专用
    equipmentId: '',
    equipmentName: '',
    // 基础设施巡检专用
    infrastructureId: '',
    infrastructureName: '',
    // 环境参数（种植区域巡查专用）
    airTemperature: 0,
    airHumidity: 0,
    lightIntensity: 0,
    co2Concentration: 0,
    soilTemperature: 0,
    soilMoisture: 0,
    soilEc: 0,
    soilPh: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 生成巡查编号：XT + 年月日 + 三位流水号
  const generateRecordCode = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    // 找到当天的最大流水号
    const todayRecords = inspectionRecords.filter(r => r.recordCode.includes(dateStr));
    const maxSeq = todayRecords.reduce((max, r) => {
      const seq = parseInt(r.recordCode.split('-')[1] || '0');
      return seq > max ? seq : max;
    }, 0);
    const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
    return `XT${dateStr}-${nextSeq}`;
  };

  // 打开新增弹窗时自动生成编号
  const handleOpenCreateModal = () => {
    setNewRecord(prev => ({
      ...prev,
      recordCode: generateRecordCode(),
      checkDate: new Date().toISOString().split('T')[0],
      checkTime: new Date().toTimeString().slice(0, 5),
      inspectorId: 'U013', // 默认巡查人员：陆启闯
    }));
    setIsCreateModalOpen(true);
  };

  // Detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // QR Scanner modal state
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // QR扫描成功处理
  const handleQRScanSuccess = (data: QRData) => {
    // 获取该温室的传感器数据用于自动填充环境参数
    const sensors = iotSensors.filter(s => s.greenhouseId === data.code);
    const envParams = {
      airTemperature: sensors.find(s => s.type === 'air_temp')?.value || 0,
      airHumidity: sensors.find(s => s.type === 'air_humidity')?.value || 0,
      soilTemperature: sensors.find(s => s.type === 'soil_temp')?.value || 0,
      soilMoisture: sensors.find(s => s.type === 'soil_moisture')?.value || 0,
      lightIntensity: sensors.find(s => s.type === 'light')?.value || 0,
      co2Concentration: sensors.find(s => s.type === 'co2')?.value || 0,
      soilEc: sensors.find(s => s.type === 'soil_ec')?.value || 0,
      soilPh: sensors.find(s => s.type === 'soil_ph')?.value || 0,
    };

    if (data.type === 'farm') {
      const greenhouse = greenhouses.find(g => g.id === data.code);
      setNewRecord(prev => ({
        ...prev,
        inspectionType: 'farm',
        greenhouseId: data.code,
        cropName: '',
        equipmentId: '',
        equipmentName: '',
        infrastructureId: '',
        infrastructureName: '',
        ...envParams,
      }));
    } else if (data.type === 'equipment') {
      const equipment = equipmentRecords.find(e => e.id === data.code);
      setNewRecord(prev => ({
        ...prev,
        inspectionType: 'equipment',
        greenhouseId: equipment?.greenhouseId || '',
        equipmentId: data.code,
        equipmentName: data.name,
        infrastructureId: '',
        infrastructureName: '',
        ...envParams,
      }));
    } else if (data.type === 'infrastructure') {
      const infrastructure = infrastructureRecords.find(i => i.id === data.code);
      setNewRecord(prev => ({
        ...prev,
        inspectionType: 'infrastructure',
        greenhouseId: infrastructure?.greenhouseId || '',
        equipmentId: '',
        equipmentName: '',
        infrastructureId: data.code,
        infrastructureName: data.name,
        ...envParams,
      }));
    }
    setIsQRScannerOpen(false);
  };

  // 从类型定义导入选项配置（消除硬编码）
  const weatherOptions = WEATHER_OPTIONS.map(w => w.label);
  const cropStatusOptions = CROP_STATUS_OPTIONS.map(s => s.label);

  // Filter records based on search
  const filteredRecords = inspectionRecords.filter(record => {
    if (searchFilters.recordCode && !record.recordCode.includes(searchFilters.recordCode)) return false;
    if (searchFilters.inspectionType && record.inspectionType !== searchFilters.inspectionType) return false;
    if (searchFilters.inspectorName && !record.inspectorName.includes(searchFilters.inspectorName)) return false;
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
    // 导出字段与表格显示列保持一致
    const headers = ['巡查编号', '巡查类型', '巡查人员', '位置/对象', '巡查日期', '天气', '温度(°C)', '湿度(%)', '发现问题', '问题照片', '问题处理', '状态'];
    const exportData = selectedData.map(row => ({
      '巡查编号': row.recordCode,
      '巡查类型': row.inspectionType === 'farm' ? '种植' : row.inspectionType === 'equipment' ? '设备' : row.inspectionType === 'infrastructure' ? '设施' : row.inspectionType === 'other' ? '其他' : '-',
      '巡查人员': row.inspectorName,
      '位置/对象': row.inspectionType === 'farm' ? row.greenhouseName : row.inspectionType === 'equipment' ? row.equipmentName : row.inspectionType === 'infrastructure' ? row.infrastructureName : row.remarks || '-',
      '巡查日期': row.checkDate,
      '天气': row.weather,
      '温度(°C)': row.temperature,
      '湿度(%)': row.humidity,
      '发现问题': (row.issues && row.issues.length > 0) ? row.issues.join('; ') : '-',
      '问题照片': (row.images && row.images.length > 0) ? `有${row.images.length}张照片` : '-',
      '问题处理': row.issueStatus === 'resolved' ? '已解决' : row.issueStatus === 'processing' ? '处理中' : row.issueStatus === 'pending' ? '待处理' : '-',
      '状态': row.status === 'normal' ? '正常' : row.status === 'warning' ? '注意' : row.status === 'critical' ? '异常' : row.status === 'attention' ? '需关注' : '-'
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
    const fileName = `巡查巡检_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
    const updatedRecords = [...inspectionRecords];
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
        // Find inspector name if inspectorId changed
        if (editedRecords[id].inspectorId && editedRecords[id].inspectorId !== record.inspectorId) {
          const user = users.find(u => u.id === editedRecords[id].inspectorId);
          updatedRecords[index] = {
            ...updatedRecords[index],
            inspectorName: user?.name || record.inspectorName,
          };
        }
      }
    });
    setInspectionRecords(updatedRecords);
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
    const remainingRecords = inspectionRecords.filter((_, index) => {
      // Map filtered index back to original records index
      const filteredIndex = filteredRecords.findIndex(r => r.id === inspectionRecords[index].id);
      return !indicesToDelete.has(filteredIndex);
    });
    setInspectionRecords(remainingRecords);
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newRecord.checkDate) newErrors.checkDate = '请选择巡查日期';

    // 根据巡查类型验证不同字段
    if (newRecord.inspectionType === 'farm') {
      if (!newRecord.greenhouseId) newErrors.greenhouseId = '请选择巡查区域';
      if (!newRecord.cropName) newErrors.cropName = '请选择作物名称';
    } else if (newRecord.inspectionType === 'equipment') {
      if (!newRecord.equipmentId) newErrors.equipmentId = '请选择设备';
    } else if (newRecord.inspectionType === 'infrastructure') {
      if (!newRecord.infrastructureId) newErrors.infrastructureId = '请选择基础设施';
    } else if (newRecord.inspectionType === 'other') {
      if (!newRecord.remarks) newErrors.remarks = '请输入其他说明';
    }

    if (newRecord.temperature < -50 || newRecord.temperature > 100) newErrors.temperature = '温度数值不合理';
    if (newRecord.humidity < 0 || newRecord.humidity > 100) newErrors.humidity = '湿度数值不合理';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateRecord = () => {
    if (!validateForm()) return;

    const selectedUser = users.find(u => u.id === newRecord.inspectorId);
    const selectedBatch = cropBatches.find(b => b.id === newRecord.batchId);

    // 根据巡查类型获取不同的位置信息
    let greenhouseId = '';
    let greenhouseName = '';
    let cropName = '';
    let equipmentId = '';
    let equipmentName = '';
    let infrastructureId = '';
    let infrastructureName = '';

    if (newRecord.inspectionType === 'farm') {
      const selectedGreenhouse = greenhouses.find(g => g.id === newRecord.greenhouseId);
      greenhouseId = newRecord.greenhouseId;
      greenhouseName = selectedGreenhouse?.name || '';
      cropName = newRecord.cropName;
    } else if (newRecord.inspectionType === 'equipment') {
      const selectedEquipment = equipmentRecords.find(e => e.id === newRecord.equipmentId);
      greenhouseId = selectedEquipment?.greenhouseId || '';
      greenhouseName = selectedEquipment?.location || '';
      equipmentId = newRecord.equipmentId;
      equipmentName = selectedEquipment?.name || '';
    } else if (newRecord.inspectionType === 'infrastructure') {
      const selectedInfrastructure = infrastructureRecords.find(i => i.id === newRecord.infrastructureId);
      greenhouseId = selectedInfrastructure?.greenhouseId || '';
      greenhouseName = selectedInfrastructure?.location || '';
      infrastructureId = newRecord.infrastructureId;
      infrastructureName = selectedInfrastructure?.name || '';
    } else if (newRecord.inspectionType === 'other') {
      // 其他类型不需要关联温室/设备
    }

    const record = {
      id: inspectionRecords.length + 1,
      recordCode: newRecord.recordCode,
      inspectionType: newRecord.inspectionType,
      greenhouseId,
      greenhouseName,
      cropName,
      inspectorId: newRecord.inspectorId,
      inspectorName: selectedUser?.name || '',
      batchId: newRecord.batchId || undefined,
      batchCode: selectedBatch?.batchCode || undefined,
      checkDate: newRecord.checkDate,
      checkTime: newRecord.checkTime,
      duration: newRecord.duration || undefined,
      weather: newRecord.weather,
      temperature: newRecord.temperature,
      humidity: newRecord.humidity,
      cropStatus: newRecord.cropStatus,
      plantHeight: newRecord.plantHeight || undefined,
      leafCount: newRecord.leafCount || undefined,
      // 根据巡查结果设置状态
      status: newRecord.inspectionResult === 'normal' ? 'normal' : 'critical',
      // 问题相关字段更新
      issueCategories: newRecord.issueCategories || [],
      issuePresets: newRecord.issuePresets || [],
      issueText: newRecord.issueText || '',
      issuePhotos: newRecord.issuePhotos || [],
      feedbackUsers: newRecord.feedbackUsers || [],
      expectedCompletion: newRecord.expectedCompletion || undefined,
      remarks: newRecord.remarks,
      equipmentId: equipmentId || undefined,
      equipmentName: equipmentName || undefined,
      infrastructureId: infrastructureId || undefined,
      infrastructureName: infrastructureName || undefined,
    };

    setInspectionRecords([record, ...inspectionRecords]);

    // 如果需要反馈，同步到问题记录（用于每日问题汇总）
    if (newRecord.feedbackRequired && newRecord.feedbackUsers.length > 0) {
      // 合并预设问题 + 文本描述
      const presetIssues = newRecord.issuePresets?.join('、') || '';
      const issueText = presetIssues + (newRecord.issueText ? (presetIssues ? '；' + newRecord.issueText : newRecord.issueText) : '');

      // 获取反馈人员姓名
      const feedbackUserNames = newRecord.feedbackUsers
        .map(id => users.find(u => u.id === id)?.name || id)
        .join('、');

      // 判断严重程度
      let severity: '轻微' | '中等' | '严重' = '轻微';
      const allIssueText = issueText + newRecord.issueText;
      if (allIssueText.includes('严重') || allIssueText.includes('灰霉') || allIssueText.includes('病毒')) {
        severity = '严重';
      } else if (allIssueText.includes('蚜虫') || allIssueText.includes('病') || allIssueText.includes('虫')) {
        severity = '中等';
      }

      addProblem({
        greenhouseId: newRecord.greenhouseId,
        greenhouseName: greenhouseName,
        cropName: cropName,
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
        issueText: issueText || newRecord.issueText || '未描述具体问题',
        issueSeverity: severity,
        status: '待处理',
        remarks: newRecord.remarks + (feedbackUserNames ? `\n反馈人员：${feedbackUserNames}` : ''),
        images: newRecord.issuePhotos || [],
      });
    }

    setIsCreateModalOpen(false);
    setNewRecord({
      recordCode: '',
      inspectionType: 'farm',
      greenhouseId: '',
      cropName: '',
      inspectorId: '',
      batchId: '',
      batchCode: '',
      checkDate: new Date().toISOString().split('T')[0],
      checkTime: new Date().toTimeString().slice(0, 5),
      duration: 0,
      weather: '晴',
      temperature: 0,
      humidity: 0,
      cropStatus: '良好',
      plantHeight: 0,
      leafCount: 0,
      inspectionResult: 'normal',
      feedbackRequired: false,
      issueCategories: [] as string[],
      issuePresets: [] as string[],
      issueText: '',
      issuePhotos: [],
      feedbackUsers: [],
      expectedCompletion: '',
      remarks: '',
      equipmentId: '',
      equipmentName: '',
      infrastructureId: '',
      infrastructureName: '',
      airTemperature: 0,
      airHumidity: 0,
      lightIntensity: 0,
      co2Concentration: 0,
      soilTemperature: 0,
      soilMoisture: 0,
      soilEc: 0,
      soilPh: 0,
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
      recordCode: '',
      inspectionType: 'farm',
      greenhouseId: '',
      cropName: '',
      inspectorId: '',
      batchId: '',
      batchCode: '',
      checkDate: new Date().toISOString().split('T')[0],
      checkTime: new Date().toTimeString().slice(0, 5),
      duration: 0,
      weather: '晴',
      temperature: 0,
      humidity: 0,
      cropStatus: '良好',
      plantHeight: 0,
      leafCount: 0,
      // 巡查结果字段 - 修复：关闭弹窗时正确重置
      inspectionResult: 'normal' as 'normal' | 'abnormal',
      feedbackRequired: false,
      issueCategories: [] as string[],
      issuePresets: [] as string[],
      issueText: '',
      issuePhotos: [] as string[],
      feedbackUsers: [] as string[],
      expectedCompletion: '',
      remarks: '',
      issueStatus: 'pending',
      newImages: [],
      equipmentId: '',
      equipmentName: '',
      infrastructureId: '',
      infrastructureName: '',
      // 环境参数
      airTemperature: 0,
      airHumidity: 0,
      lightIntensity: 0,
      co2Concentration: 0,
      soilTemperature: 0,
      soilMoisture: 0,
      soilEc: 0,
      soilPh: 0,
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
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">巡查管理</h1>
            <p className="text-gray-500">人工巡查记录管理</p>
          </div>
        </div>
      </div>

      {/* 搜索卡片 - 使用独立组件 */}
      <InspectionSearch
        filters={searchFilters}
        onFiltersChange={setSearchFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* 巡查记录表格 - 使用独立组件 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">巡查记录列表</h3>
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
              <button
                onClick={handleOpenCreateModal}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
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
        <InspectionTable
          records={filteredRecords}
          currentPage={currentPage}
          pageSize={pageSize}
          selectedRows={selectedRows}
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          onSelectRow={(idx) => {
            // 将当前页索引转换为 filteredRecords 的真实索引
            const realIndex = (currentPage - 1) * pageSize + idx;
            if (!selectedRows.includes(realIndex)) {
              setSelectedRows([...selectedRows, realIndex]);
            } else {
              setSelectedRows(selectedRows.filter(i => i !== realIndex));
            }
          }}
          onSelectAll={() => {
            if (selectedRows.length === filteredRecords.length) {
              setSelectedRows([]);
            } else {
              setSelectedRows(filteredRecords.map((_, i) => i));
            }
          }}
          onViewDetail={(record) => { setSelectedRecord(record); setIsDetailModalOpen(true); }}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>

      {/* Create Inspection Record Modal */}
      <CreateInspectionModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateRecord}
        newRecord={newRecord}
        onNewRecordChange={setNewRecord}
        errors={errors}
        generateRecordCode={generateRecordCode}
        onImageUpload={handleImageUpload}
        onRemoveImage={removeImage}
        greenhouses={greenhouses}
        users={users}
        cropTypes={cropTypes}
        cropBatches={cropBatches}
        equipmentRecords={equipmentRecords}
        infrastructureRecords={infrastructureRecords}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
      />

      {/* 巡查记录详情弹窗 */}
      <DetailInspectionModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
      />

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />

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
                      : 'border-gray-300 hover:border-emerald-300'
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
        users={users}
        cropTypes={cropTypes}
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
