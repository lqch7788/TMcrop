import { useState } from 'react';
import {
  Plus, Eye, Download, Pencil, Trash2, Scan, X, ThumbsUp, ThumbsDown,
  MapPin, Camera, Package, Mic
} from 'lucide-react';
import { inspectionRecords as initialRecords, greenhouses, users, cropTypes, cropBatches, equipmentRecords, infrastructureRecords, iotSensors } from '../../../data/mockData';
import QRScanner, { QRData } from '../../common/QRScanner';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { useProblemDispatch } from '../../../hooks/useProblemDispatch';
import { useLocalStorage, STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import { BatchEditModal, DeleteWarningModal, DetailInspectionModal } from './modals';
import { InspectionSearch } from './InspectionSearch';
import { InspectionTable } from './InspectionTable';
import { CreateInspectionModal } from './modals/CreateInspectionModal';

// ========== 引入组件（组件化重构） ==========
import { InspectionPageHeader, InspectionToolbar } from './components';
import { Modal } from '../../ui/Modal';
// 导入农事管理类型定义（消除硬编码）
import { WEATHER_OPTIONS, CROP_STATUS_OPTIONS } from '../../../types/farm/common';

export default function InspectionPage() {
  // 问题记录持久化 Hook - 同步巡查管理问题到每日问题汇总
  const { problems, addProblem, forceRefresh } = usePersistentProblems();
  // 问题流转操作 Hook
  const { approveProblemCompletion, rejectAcceptance, getTaskForProblem, getProblemFlowRecords } = useProblemDispatch();
  // 任务数据（用于获取实际处理进度）
  const [tasks] = useLocalStorage<any[]>(STORAGE_KEYS.TASKS, []);

  // 验收弹窗状态 - 只存 problemId，实时获取最新数据
  const [acceptanceModal, setAcceptanceModal] = useState({
    isOpen: false,
    problemId: null as number | null,
  });
  const [acceptanceComment, setAcceptanceComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // 强制刷新状态 - 用于刷新 problems 数据
  const [refreshKey, setRefreshKey] = useState(0);

  // Inspection Records State - 使用 localStorage 持久化
  const [inspectionRecords, setInspectionRecords] = useLocalStorage(
    STORAGE_KEYS.INSPECTION_RECORDS,
    initialRecords
  );

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
    problemStatus: '',
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
    issueSeverity: '中等' as '轻微' | '中等' | '严重',
    issuePhotos: [] as string[],
    feedbackUsers: [] as string[],
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
    // 获取当前用户名，然后从users数组中找到对应的用户ID
    const currentUsername = localStorage.getItem('username') || '';
    const currentUser = users.find(u => u.name === currentUsername);
    const defaultInspectorId = currentUser?.id || '';

    setNewRecord(prev => ({
      ...prev,
      recordCode: generateRecordCode(),
      checkDate: new Date().toISOString().split('T')[0],
      checkTime: new Date().toTimeString().slice(0, 5),
      inspectorId: defaultInspectorId,
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
    // 问题处理状态筛选
    if (searchFilters.problemStatus) {
      const problem = problems.find(p => p.id === record.problemId);
      if (problem?.status !== searchFilters.problemStatus) return false;
    }
    return true;
  });

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchFilters({
      recordCode: '',
      inspectorName: '',
      inspectionType: '',
      startDate: '',
      endDate: '',
      status: '',
      problemStatus: '',
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

  // 验收通过
  const handleApproveAcceptance = () => {
    if (!acceptanceModal.problemId) return;
    approveProblemCompletion(
      acceptanceModal.problemId,
      'U001',
      '系统管理员',
      acceptanceComment || '验收通过'
    );
    // 刷新问题数据并关闭弹窗
    forceRefresh();
    setAcceptanceModal({ isOpen: false, problemId: null });
    setAcceptanceComment('');
  };

  // 返工（退回问题分派）
  const handleRejectToDispatch = (reason: string) => {
    if (!acceptanceModal.problemId) return;
    rejectAcceptance(
      acceptanceModal.problemId,
      'U001',
      '系统管理员',
      reason
    );
    // 刷新问题数据并关闭弹窗
    forceRefresh();
    setAcceptanceModal({ isOpen: false, problemId: null });
    setRejectionReason('');
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

    /**
     * 业务规则：问题推送逻辑
     * ========================================
     * 巡查记录仅在以下全部条件满足时才会推送至【问题分派模块】和【每日问题汇总】：
     *   1. feedbackRequired = true（用户勾选了"需要反馈"）
     *   2. feedbackUsers.length > 0（至少选择了一位反馈人员）
     *   3. inspectionResult 存在且 inspectionResult !== 'normal'（巡查结果为"异常"）
     *
     * 业务说明：
     *   - 巡查结果为"正常"或未设置时，说明未发现问题，无需创建问题单进行分派处理
     *   - 即使巡查结果为"异常"，如果不选择反馈人员，也不会创建问题单
     *   - 推送后问题单状态为"待处理"，等待分派员指派执行人
     *
     * 相关数据流：
     *   巡查记录 → ProblemEntry → 问题分派 → TaskDispatchTask
     * ========================================
     */
    let newProblemId: number | undefined;
    if (newRecord.feedbackRequired && newRecord.feedbackUsers.length > 0 && newRecord.inspectionResult && newRecord.inspectionResult !== 'normal') {
      // 合并预设问题 + 文本描述
      const presetIssues = newRecord.issuePresets?.join('、') || '';
      const issueText = presetIssues + (newRecord.issueText ? (presetIssues ? '；' + newRecord.issueText : newRecord.issueText) : '');

      // 获取反馈人员姓名
      const feedbackUserNames = newRecord.feedbackUsers
        .map(id => users.find(u => u.id === id)?.name || id)
        .join('、');

      // 判断严重程度（优先使用表单选择，否则根据问题文本自动推导）
      let severity: '轻微' | '中等' | '严重' = newRecord.issueSeverity || '中等';
      if (!newRecord.issueSeverity) {
        const allIssueText = issueText + newRecord.issueText;
        if (allIssueText.includes('严重') || allIssueText.includes('灰霉') || allIssueText.includes('病毒')) {
          severity = '严重';
        } else if (allIssueText.includes('蚜虫') || allIssueText.includes('病') || allIssueText.includes('虫')) {
          severity = '中等';
        }
      }

      // 添加问题并获取返回的 problemId
      newProblemId = addProblem({
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
        // 来源追踪字段
        sourceModule: 'inspection',
        sourceId: newRecord.recordCode,
      });
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
      issueSeverity: newRecord.issueSeverity || '中等',
      issuePhotos: newRecord.issuePhotos || [],
      feedbackUsers: newRecord.feedbackUsers || [],
      remarks: newRecord.remarks,
      equipmentId: equipmentId || undefined,
      equipmentName: equipmentName || undefined,
      infrastructureId: infrastructureId || undefined,
      infrastructureName: infrastructureName || undefined,
      // 关联问题ID
      problemId: newProblemId,
    };

    setInspectionRecords([record, ...inspectionRecords]);

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
      issueSeverity: '中等' as '轻微' | '中等' | '严重',
      issuePhotos: [] as string[],
      feedbackUsers: [] as string[],
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
      <InspectionPageHeader />

      {/* 搜索卡片 - 使用独立组件 */}
      <InspectionSearch
        filters={searchFilters}
        onFiltersChange={setSearchFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* 巡查记录表格 - 使用独立组件 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <InspectionToolbar
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          onCreate={handleOpenCreateModal}
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
          problems={problems}
          tasks={tasks}
          onAcceptance={(problem) => { setAcceptanceModal({ isOpen: true, problemId: problem.id }); }}
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

      {/* 问题验收弹窗 */}
      <Modal
        isOpen={acceptanceModal.isOpen}
        onClose={() => {
          setAcceptanceModal({ isOpen: false, problemId: null });
          setAcceptanceComment('');
          setRejectionReason('');
        }}
        title="问题验收"
        size="xl"
      >
        {acceptanceModal.problemId && (
          <div className="space-y-4">
            {/* 实时获取最新问题数据 */}
            {(() => {
              const problem = problems.find(p => p.id === acceptanceModal.problemId);
              if (!problem) return null;
              return (
                <>
                  {/* 处理结果信息 */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">处理人</span>
                      <span className="text-sm font-medium">{problem.handler || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">处理日期</span>
                      <span className="text-sm font-medium">{problem.handleDate || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">处理结果</span>
                    </div>
                    <div className="bg-white rounded p-3 text-sm">
                      {problem.handleResult || '无处理结果'}
                    </div>
                  </div>

                  {/* 返工次数提示 */}
                  {(problem.reworkCount ?? 0) > 0 && (
                    <div className={`text-sm p-3 rounded-lg border ${
                      (problem.reworkCount ?? 0) >= 2
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      <div className="font-medium">
                        {(problem.reworkCount ?? 0) >= 2
                          ? '⚠️ 已返工多次，将退回问题分派页面重新分派'
                          : `已返工${problem.reworkCount}次，再次返工将退回问题分派`
                        }
                      </div>
                    </div>
                  )}

                  {/* 执行人反馈详情 */}
                  {(() => {
                    // 找到最后一个 submit 类型的流转记录，提取 feedbackData
                    const submitRecord = [...(problem.flowRecords || [])]
                      .reverse()
                      .find(r => r.action === 'submit');
                    const feedbackData = submitRecord?.feedbackData;
                    if (!feedbackData) return null;

                    return (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">执行人反馈详情</h4>
                        <div className="space-y-4">
                          {/* GPS 位置 */}
                          {feedbackData.gpsLocation && (
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                              <MapPin className="w-5 h-5 text-emerald-600" />
                              <div className="flex-1">
                                <div className="text-xs text-emerald-600 mb-1">GPS 位置</div>
                                <div className="text-sm font-mono text-gray-800">
                                  {feedbackData.gpsLocation.lat.toFixed(6)}, {feedbackData.gpsLocation.lng.toFixed(6)}
                                </div>
                              </div>
                              <a
                                href={`https://maps.google.com/?q=${feedbackData.gpsLocation.lat},${feedbackData.gpsLocation.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600"
                              >
                                查看地图
                              </a>
                            </div>
                          )}

                          {/* 作业前照片 */}
                          {feedbackData.photosBefore && feedbackData.photosBefore.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Camera className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">作业前照片 ({feedbackData.photosBefore.length}张)</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {feedbackData.photosBefore.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`作业前照片${idx + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => window.open(img, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 作业后照片 */}
                          {feedbackData.photosAfter && feedbackData.photosAfter.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Camera className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-gray-700">作业后照片 ({feedbackData.photosAfter.length}张)</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {feedbackData.photosAfter.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`作业后照片${idx + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => window.open(img, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 物资编码 */}
                          {feedbackData.materialCode && (
                            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                              <Package className="w-5 h-5 text-purple-600" />
                              <div className="flex-1">
                                <div className="text-xs text-purple-600 mb-1">物资编码</div>
                                <div className="text-sm font-mono text-gray-800">{feedbackData.materialCode}</div>
                              </div>
                            </div>
                          )}

                          {/* 语音备注 */}
                          {feedbackData.voiceNote && (
                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                              <Mic className="w-5 h-5 text-red-600" />
                              <div className="flex-1">
                                <div className="text-xs text-red-600 mb-1">语音备注</div>
                                <div className="text-sm text-gray-800">已录制语音</div>
                              </div>
                              <audio controls className="h-8">
                                <source src={feedbackData.voiceNote} type="audio/webm" />
                              </audio>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 流转记录 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">处理流转记录</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(problem.flowRecords || []).map((record: any) => (
                        <div key={record.id} className="flex gap-3 text-xs">
                          <span className="text-gray-400 whitespace-nowrap">
                            {new Date(record.actionTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-medium text-gray-700">{record.operatorName}</span>
                          <span className="text-gray-500">
                            {record.action === 'report' && '上报问题'}
                            {record.action === 'dispatch' && '分派任务'}
                            {record.action === 'accept' && '接单'}
                            {record.action === 'reject' && '拒绝'}
                            {record.action === 'submit' && '提交反馈'}
                            {record.action === 'approve' && '验收通过'}
                            {record.action === 'reject_acceptance' && '验收返工'}
                          </span>
                          {record.comment && <span className="text-gray-400">- {record.comment}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 验收操作 */}
                  <div className="border-t pt-4">
                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={() => handleApproveAcceptance()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        验收通过
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('请输入返工原因：');
                          if (reason) {
                            handleRejectToDispatch(reason);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        返工
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      通过：问题关闭，流转结束 | 返工：第1次给原执行人，第2次退分派重分
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
