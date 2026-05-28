/**
 * 农事任务中心 - 巡查记录Tab（完整功能版）
 * 集成独立巡查页面的所有功能
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useProblemStore } from '../../../stores/useProblemStore';
import { useProblemDispatch } from '../../../hooks/useProblemDispatch';
import { useInspectionDataStore, useProductionPlanStore, useDictionaryStore, getDictItems, useFarmTaskStore } from '../../../stores';
import { InspectionSearch, InspectionSearchFilters } from './components/InspectionSearch';
import { InspectionToolbar } from './components/InspectionToolbar';
import { CreateInspectionModal } from './modals/CreateInspectionModal';
import { DetailInspectionModal } from './modals/DetailInspectionModal';
import { InspectionAcceptanceModal } from './modals/InspectionAcceptanceModal';
import { BatchEditModal } from './modals/BatchEditModal';
import { DeleteWarningModal } from './modals/DeleteWarningModal';
import { InspectionRecord } from '../../../types';
import { useIotStore, getDevicesByGreenhouse, useEquipmentStore, useInfrastructureStore } from '../../../stores';
import { useUserStore, useGreenhouseStore } from '../../../stores';
import QRScanner, { QRData } from '../../common/QRScanner';
import { Button } from '@/components/ui/button';
import { Input } from '../../ui/input';
import { Label } from '@/components/ui';
import { MapPin, Camera, Package, Mic } from 'lucide-react';
import { InspectionTable } from '../inspection/InspectionTable';

// 巡查类型配置
const INSPECTION_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'farm', label: '种植巡查' },
  { value: 'equipment', label: '设备巡查' },
  { value: 'infrastructure', label: '设施巡查' },
  { value: 'other', label: '其他巡查' },
];

// 状态配置
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-100', text: 'text-green-700', label: '正常' },
  attention: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '需关注' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: '异常' },
};

// 初始筛选条件
const INITIAL_FILTERS: InspectionSearchFilters = {
  recordCode: '',
  inspectorName: '',
  inspectionType: 'all',
  startDate: '',
  endDate: '',
  status: 'all',
  problemStatus: 'all',
};

interface InspectionTabProps {
  // 来自 hub 的数据
  inspections: InspectionRecord[];
  // 统计信息
  stats?: {
    total: number;
    normal: number;
    attention: number;
    abnormal: number;
  };
  // 筛选状态
  filters: InspectionSearchFilters;
  onFilterChange: (key: keyof InspectionSearchFilters, value: string) => void;
  onResetFilters: () => void;
  // 分页状态
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // 模式状态
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  onToggleExportMode: () => void;
  onToggleBatchEditMode: () => void;
  onToggleBatchDeleteMode: () => void;
  // 选择状态
  selectedRows: number[];
  onToggleSelectRow: (index: number) => void;
  onSelectAll: (total: number) => void;
  onClearSelection: () => void;
  // 弹窗状态
  detailRecordId: string | null;
  onViewDetail: (recordId: string) => void;
  onCloseDetail: () => void;
  isCreateModalOpen: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
  // 问题相关
  problems: any[];
  onReportProblem: (record: InspectionRecord) => void;
  onAcceptProblem: (problem: any) => void;
  // 批量操作回调
  onBatchDelete: (ids: string[]) => void;
  onBatchEdit: (ids: string[]) => void;
}

/**
 * 巡查记录Tab组件（完整功能版）
 */
export function InspectionTab({
  inspections,
  stats,
  filters,
  onFilterChange,
  onResetFilters,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  onToggleExportMode,
  onToggleBatchEditMode,
  onToggleBatchDeleteMode,
  selectedRows,
  onToggleSelectRow,
  onSelectAll,
  onClearSelection,
  detailRecordId,
  onViewDetail,
  onCloseDetail,
  isCreateModalOpen,
  onOpenCreateModal,
  onCloseCreateModal,
  problems,
  onReportProblem,
  onAcceptProblem,
  onBatchDelete,
  onBatchEdit,
}: InspectionTabProps) {
  // 使用 Zustand stores 获取用户和温室数据
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loadGreenhouses = useGreenhouseStore((state) => state.loadGreenhouses);

  const storePlans = useProductionPlanStore((state) => state.plans);
  const fetchPlans = useProductionPlanStore((state) => state.fetchPlans);
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);
  // IoT/设备/设施 Store
  const devices = useIotStore((state) => state.devices);
  const fetchDevices = useIotStore((state) => state.fetchDevices);
  const equipment = useEquipmentStore((state) => state.equipment);
  const fetchEquipment = useEquipmentStore((state) => state.fetchEquipment);
  const infrastructures = useInfrastructureStore((state) => state.infrastructures);
  const fetchInfrastructures = useInfrastructureStore((state) => state.fetchInfrastructures);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
    if (storePlans.length === 0) {
      fetchPlans();
    }
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
    if (devices.length === 0) {
      fetchDevices();
    }
    if (equipment.length === 0) {
      fetchEquipment();
    }
    if (infrastructures.length === 0) {
      fetchInfrastructures();
    }
  }, [users.length, loadUsers, greenhouses.length, loadGreenhouses, storePlans.length, fetchPlans, dictionaries.length, loadDictionaries, devices.length, fetchDevices, equipment.length, fetchEquipment, infrastructures.length, fetchInfrastructures]);

  // 从Store计算生产批次和作物类型
  const cropBatches = useMemo(() => storePlans.map(p => ({
    id: p.id,
    batchCode: p.batchCode,
    batchStatus: (p as any).batchStatus || (p as any).status,
    planType: (p as any).planType,
    planTypeName: (p as any).planTypeName,
    cropName: (p as any).cropName || (p as any).cropTypeName,
    variety: (p as any).variety,
    plantingMode: (p as any).plantingMode,
    targetYield: (p as any).targetYield,
  })), [storePlans]);

  const cropTypes = useMemo(() =>
    getDictItems('crop_category').map(d => ({ value: d.dictLabel, label: d.dictLabel, name: d.dictLabel })),
    [dictionaries]
  );

  // 巡查数据 Zustand Store - 替代 localStorage
  const storeRecords = useInspectionDataStore((state) => state.records);
  const fetchRecords = useInspectionDataStore((state) => state.fetchRecords);
  const createStoreRecord = useInspectionDataStore((state) => state.createRecord);
  const updateStoreRecord = useInspectionDataStore((state) => state.updateRecord);
  const deleteStoreRecord = useInspectionDataStore((state) => state.deleteRecord);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 本地巡查记录状态：从 prop 初始化，prop 变化时同步
  // 使用 useMemo 确保新记录排在前面（按 create_time 降序）
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>(() => {
    return inspections.sort((a, b) =>
      new Date(b.createTime || b.create_time || 0).getTime() -
      new Date(a.createTime || a.create_time || 0).getTime()
    );
  });
  useEffect(() => {
    // 将新的 inspections 排序后更新到本地状态
    const sortedInspections = [...inspections].sort((a, b) =>
      new Date(b.createTime || b.create_time || 0).getTime() -
      new Date(a.createTime || a.create_time || 0).getTime()
    );
    setInspectionRecords(sortedInspections);
  }, [inspections]);

  // 问题相关 Hook (V2.0: API 数据层)
  const createProblem = useProblemStore((s) => s.createProblem);
  const fetchProblems = useProblemStore((s) => s.fetchProblems);
  const storeProblems = useProblemStore((s) => s.problems);

  // ?? Store ? prop ??????? Store ????????
  const mergedProblems = useMemo(() => {
    if (storeProblems.length > 0) return storeProblems;
    return problems;
  }, [storeProblems, problems]);
  const { approveProblemCompletion, rejectAcceptance } = useProblemDispatch();

  // 任务数据（用于获取实际处理进度，从 Zustand Store 读取）
  const tasks = useFarmTaskStore((s) => s.tasks);

  // 获取默认巡查人员（避免硬编码）
  const defaultInspector = useMemo(() => {
    // 优先使用第一个用户，避免硬编码特定ID
    return users[0] || { id: 'U001', name: '待分配' };
  }, []);

  // 弹窗状态
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 批量编辑相关状态
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<InspectionRecord>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 新建表单状态
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
    inspectionResult: 'normal' as 'normal' | 'abnormal',
    feedbackRequired: false,
    issueCategories: [] as string[],
    issuePresets: [] as string[],
    issueText: '',
    issueSeverity: '中等' as '轻微' | '中等' | '严重',
    issuePhotos: [] as string[],
    newImages: [] as string[],  // 新建时上传的图片
    feedbackUsers: [] as string[],
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验收弹窗状态
  const [acceptanceModal, setAcceptanceModal] = useState({
    isOpen: false,
    problemId: null as number | null,
  });
  const [acceptanceComment, setAcceptanceComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // QR Scanner 弹窗状态
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // QR扫描成功处理
  const handleQRScanSuccess = useCallback((data: QRData) => {
    // 获取该温室的传感器数据用于自动填充环境参数（从 IoT Store 获取）
    const currentDevices = useIotStore.getState().devices.filter(d => d.greenhouseId === data.code);
    const envParams = {
      airTemperature: currentDevices.find(d => d.type === 'air_temp')?.value || 0,
      airHumidity: currentDevices.find(d => d.type === 'air_humidity')?.value || 0,
      soilTemperature: currentDevices.find(d => d.type === 'soil_temp')?.value || 0,
      soilMoisture: currentDevices.find(d => d.type === 'soil_moisture')?.value || 0,
      lightIntensity: currentDevices.find(d => d.type === 'light')?.value || 0,
      co2Concentration: currentDevices.find(d => d.type === 'co2')?.value || 0,
      soilEc: currentDevices.find(d => d.type === 'soil_ec')?.value || 0,
      soilPh: currentDevices.find(d => d.type === 'soil_ph')?.value || 0,
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
      const eq = useEquipmentStore.getState().equipment.find(e => e.id === data.code);
      setNewRecord(prev => ({
        ...prev,
        inspectionType: 'equipment',
        greenhouseId: eq?.greenhouseId || '',
        equipmentId: data.code,
        equipmentName: data.name,
        infrastructureId: '',
        infrastructureName: '',
        ...envParams,
      }));
    } else if (data.type === 'infrastructure') {
      const infra = useInfrastructureStore.getState().infrastructures.find(i => i.id === data.code);
      setNewRecord(prev => ({
        ...prev,
        inspectionType: 'infrastructure',
        greenhouseId: infra?.greenhouseId || '',
        equipmentId: '',
        equipmentName: '',
        infrastructureId: data.code,
        infrastructureName: data.name,
        ...envParams,
      }));
    }
    setIsQRScannerOpen(false);
  }, []);

  // 生成巡查编号
  const generateRecordCode = useCallback(() => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const todayRecords = inspectionRecords.filter(r => r.recordCode.includes(dateStr));
    const maxSeq = todayRecords.reduce((max, r) => {
      const seq = parseInt(r.recordCode.split('-')[1] || '0');
      return seq > max ? seq : max;
    }, 0);
    const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
    return `XT${dateStr}-${nextSeq}`;
  }, [inspectionRecords]);

  // 过滤后的数据
  const filteredRecords = useMemo(() => {
    return inspectionRecords.filter(record => {
      // 巡查编号筛选
      if (filters.recordCode && !record.recordCode?.toLowerCase().includes(filters.recordCode.toLowerCase())) {
        return false;
      }
      // 提交人筛选
      if (filters.inspectorName && !record.inspectorName?.toLowerCase().includes(filters.inspectorName.toLowerCase())) {
        return false;
      }
      // 巡查类型筛选
      if (filters.inspectionType !== 'all' && record.inspectionType !== filters.inspectionType) {
        return false;
      }
      // 巡查日期起筛选
      if (filters.startDate && record.checkDate < filters.startDate) {
        return false;
      }
      // 巡查日期止筛选
      if (filters.endDate && record.checkDate > filters.endDate) {
        return false;
      }
      // 状态筛选
      if (filters.status !== 'all' && record.status !== filters.status) {
        return false;
      }
      // 问题处理状态筛选
      if (filters.problemStatus !== 'all') {
        const problem = mergedProblems.find(p => p.id === record.problemId);
        const problemStatusMap: Record<string, string> = {
          '待处理': 'pending',
          '处理中': 'processing',
          '待验收': 'pending',
          '已处理': 'resolved',
        };
        const mappedStatus = problemStatusMap[filters.problemStatus];
        if (mappedStatus && problem?.status !== mappedStatus) {
          return false;
        }
      }
      return true;
    });
  }, [inspectionRecords, filters, mergedProblems]);

  // 分页后的数据
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // 选中的 ID 数组
  const selectedIds = useMemo(() => {
    return selectedRows.map(idx => paginatedRecords[idx]?.id).filter(Boolean);
  }, [selectedRows, paginatedRecords]);

  // 详情记录
  const detailRecord = useMemo(() => {
    return inspectionRecords.find(r => r.id?.toString() === detailRecordId?.toString()) || null;
  }, [inspectionRecords, detailRecordId]);

  // 打开新建弹窗
  const handleOpenCreateModal = () => {
    // 只有在数据为空时才填充默认值，保留扫码结果的数据
    setNewRecord(prev => ({
      ...prev,
      recordCode: prev.recordCode || generateRecordCode(),
      checkDate: prev.checkDate || new Date().toISOString().split('T')[0],
      checkTime: prev.checkTime || new Date().toTimeString().slice(0, 5),
      inspectorId: prev.inspectorId || defaultInspector.id, // 默认巡查人员
    }));
    onOpenCreateModal();
  };

  // 打开扫码弹窗
  const handleOpenQRScanner = () => {
    setIsQRScannerOpen(true);
  };

  // 关闭新建弹窗
  const handleCloseCreateModal = () => {
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
      issueCategories: [],
      issuePresets: [],
      issueText: '',
      issueSeverity: '中等',
      issuePhotos: [],
      newImages: [],
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
    onCloseCreateModal();
  };

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentCount = newRecord.newImages.length;
    const remainingSlots = 6 - currentCount;
    if (remainingSlots <= 0) {
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

  // 移除图片
  const removeImage = (index: number) => {
    setNewRecord(prev => ({
      ...prev,
      newImages: prev.newImages.filter((_, i) => i !== index)
    }));
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newRecord.checkDate) newErrors.checkDate = '请选择巡查日期';

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

  // 创建巡查记录
  const handleCreateRecord = async () => {
    if (!validateForm()) return;

    const selectedUser = users.find(u => u.id === newRecord.inspectorId);
    const selectedBatch = cropBatches.find(b => b.id === newRecord.batchId);

    // 根据巡查类型获取位置信息
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
      const selectedEquipment = useEquipmentStore.getState().equipment.find(e => e.id === newRecord.equipmentId);
      greenhouseId = selectedEquipment?.greenhouseId || '';
      greenhouseName = selectedEquipment?.location || '';
      equipmentId = newRecord.equipmentId;
      equipmentName = selectedEquipment?.name || '';
    } else if (newRecord.inspectionType === 'infrastructure') {
      const selectedInfrastructure = useInfrastructureStore.getState().infrastructures.find(i => i.id === newRecord.infrastructureId);
      greenhouseId = selectedInfrastructure?.greenhouseId || '';
      greenhouseName = selectedInfrastructure?.location || '';
      infrastructureId = newRecord.infrastructureId;
      infrastructureName = selectedInfrastructure?.name || '';
    }

    // 问题推送逻辑 (V2.0: 通过 API Store 创建问题)
    let newProblemId: number | undefined;
    // ????????????????????????"??"??????
    if (newRecord.feedbackRequired && newRecord.feedbackUsers.length > 0 && newRecord.inspectionResult === 'abnormal') {
      const presetIssues = newRecord.issuePresets?.join('、') || '';
      const issueText = presetIssues + (newRecord.issueText ? (presetIssues ? '；' + newRecord.issueText : newRecord.issueText) : '');

      const feedbackUserNames = newRecord.feedbackUsers
        .map(id => users.find(u => u.id === id)?.name || id)
        .join('、');

      let severity: '轻微' | '中等' | '严重' = newRecord.issueSeverity || '中等';
      if (!newRecord.issueSeverity) {
        const allIssueText = issueText + newRecord.issueText;
        if (allIssueText.includes('严重') || allIssueText.includes('灰霉') || allIssueText.includes('病毒')) {
          severity = '严重';
        } else if (allIssueText.includes('蚜虫') || allIssueText.includes('病') || allIssueText.includes('虫')) {
          severity = '中等';
        }
      }

      // V2.0: 通过 API Store 创建问题（替换 localStorage addProblem）
      const createdProblem = await createProblem({
        problem_code: `PD${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-3)}`,
        greenhouseId: newRecord.greenhouseId,
        greenhouseName: greenhouseName,
        cropName: cropName,
        inspectorId: newRecord.inspectorId,
        inspectorName: selectedUser?.name || '',
        checkDate: newRecord.checkDate,
        checkTime: newRecord.checkTime,
        weather: newRecord.weather,
        temperature: newRecord.temperature || 0,
        humidity: newRecord.humidity || 0,
        cropStatus: newRecord.cropStatus,
        plantHeight: newRecord.plantHeight || 0,
        leafCount: newRecord.leafCount || 0,
        issueText: issueText || newRecord.issueText || '未描述具体问题',
        issueSeverity: severity,
        status: '待处理' as any,
        remarks: newRecord.remarks + (feedbackUserNames ? `\n反馈人员：${feedbackUserNames}` : ''),
        images: newRecord.issuePhotos || [] as any,
        sourceModule: 'inspection',
        sourceId: newRecord.recordCode,
        flowRecords: [{
          id: `FR-${Date.now()}`,
          problemId: 0, // 将在创建后更新
          operatorId: newRecord.inspectorId,
          operatorName: selectedUser?.name || '',
          action: 'report',
          fromStatus: '',
          toStatus: '待处理',
          actionTime: new Date().toISOString(),
        }] as any,
      });
      if (createdProblem) {
        newProblemId = createdProblem.id as number;
      }
    }

    const record = {
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
      status: newRecord.inspectionResult === 'normal' ? 'normal' : 'critical',
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
      problemId: newProblemId,
    };

    // 先关闭弹窗，让用户看到反馈
    handleCloseCreateModal();

    // 持久化到后端（通过 Zustand Store），等待完成
    createStoreRecord(record)
      .then(() => {
        console.log('[InspectionTab] 巡查记录创建成功，重新加载数据');
        fetchRecords();
      })
      .catch((error) => {
        console.error('[InspectionTab] 巡查记录创建失败:', error);
      });
  };

  // 导出处理
  const handleConfirmExport = () => {
    if (selectedIds.length === 0) {
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = async () => {
    const selectedData = filteredRecords.filter((_, index) => selectedRows.includes(index));
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
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // 导出失败时仍尝试使用备用方式下载
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    onToggleExportMode();
    onClearSelection();
    setShowExportModal(false);
  };

  // 批量编辑确认
  const handleConfirmBatchEdit = () => {
    const updatedRecords = [...inspectionRecords];
    editedRecordIds.forEach(id => {
      const index = updatedRecords.findIndex(r => r.id.toString() === id);
      if (index !== -1 && editedRecords[id]) {
        const record = updatedRecords[index];
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
    // 持久化到后端（通过 Zustand Store）
    editedRecordIds.forEach(id => {
      if (editedRecords[id]) {
        updateStoreRecord(id, editedRecords[id]);
      }
    });
    setShowBatchEditModal(false);
    onToggleBatchEditMode();
    onClearSelection();
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // 批量删除确认
  const handleConfirmBatchDelete = () => {
    const indicesToDelete = new Set(selectedRows);
    const remainingRecords = inspectionRecords.filter((_, index) => {
      const filteredIndex = filteredRecords.findIndex(r => r.id === inspectionRecords[index].id);
      return !indicesToDelete.has(filteredIndex);
    });
    // 获取要删除的记录 ID
    const deletedIds = inspectionRecords
      .filter((_, index) => {
        const filteredIndex = filteredRecords.findIndex(r => r.id === inspectionRecords[index].id);
        return indicesToDelete.has(filteredIndex);
      })
      .map(r => r.id);
    setInspectionRecords(remainingRecords);
    // 持久化到后端（通过 Zustand Store）
    deletedIds.forEach(id => {
      deleteStoreRecord(id);
    });
    setShowDeleteWarning(false);
    onToggleBatchDeleteMode();
    onClearSelection();
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
    fetchProblems();
    setAcceptanceModal({ isOpen: false, problemId: null });
    setAcceptanceComment('');
  };

  // 返工
  const handleRejectToDispatch = (reason: string) => {
    if (!acceptanceModal.problemId) return;
    rejectAcceptance(
      acceptanceModal.problemId,
      'U001',
      '系统管理员',
      reason
    );
    fetchProblems();
    setAcceptanceModal({ isOpen: false, problemId: null });
  };

  // 总页数
  const totalPages = Math.ceil(filteredRecords.length / pageSize);

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <InspectionSearch
        filters={filters}
        onFiltersChange={(newFilters) => {
          Object.entries(newFilters).forEach(([key, value]) => {
            onFilterChange(key as keyof InspectionSearchFilters, value);
          });
        }}
        onSearch={() => {}}
        onReset={onResetFilters}
      />

      {/* 工具栏 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <InspectionToolbar
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          stats={stats}
          onCreate={handleOpenCreateModal}
          onBatchEdit={onToggleBatchEditMode}
          onBatchDelete={onToggleBatchDeleteMode}
          onExport={onToggleExportMode}
          onConfirmExport={handleConfirmExport}
          onCancelExport={onToggleExportMode}
          onConfirmBatchEdit={() => setShowBatchEditModal(true)}
          onCancelBatchEdit={() => {
            onToggleBatchEditMode();
            onClearSelection();
            setEditedRecordIds([]);
            setEditedRecords({});
            setSelectedRecordId('');
          }}
          onConfirmBatchDelete={() => setShowDeleteWarning(true)}
          onCancelBatchDelete={() => {
            onToggleBatchDeleteMode();
            onClearSelection();
          }}
        />

        {/* 表格 - 使用与巡查记录页面完全一致的组件 */}
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
              // 使用回调方式更新 selection
              onToggleSelectRow(realIndex);
            } else {
              onToggleSelectRow(realIndex);
            }
          }}
          onSelectAll={() => {
            if (selectedRows.length === filteredRecords.length) {
              onClearSelection();
            } else {
              onSelectAll(filteredRecords.length);
            }
          }}
          onViewDetail={(record) => { onViewDetail(record.id?.toString() || ''); }}
          onPageChange={onPageChange}
          onPageSizeChange={(size) => { onPageSizeChange(size); }}
          problems={mergedProblems}
          tasks={tasks}
          onAcceptance={(problem) => { setAcceptanceModal({ isOpen: true, problemId: problem.id }); }}
        />
      </div>

      {/* 新建弹窗 */}
      <CreateInspectionModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
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
        equipmentRecords={equipment}
        infrastructureRecords={infrastructures}
        onOpenQRScanner={handleOpenQRScanner}
      />

      {/* 详情弹窗 */}
      <DetailInspectionModal
        isOpen={!!detailRecord}
        onClose={onCloseDetail}
        record={detailRecord}
        onAcceptProblem={(problemId) => {
          setAcceptanceModal({ isOpen: true, problemId });
        }}
      />

      {/* 批量编辑弹窗 */}
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
        equipmentRecords={equipment}
        infrastructureRecords={infrastructures}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmBatchDelete}
      />

      {/* 导出格式弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">选择导出格式</h2>
            <div className="space-y-3 mb-6">
              {[
                { value: 'excel', label: 'Excel 文件 (.xlsx)', icon: '📊' },
                { value: 'csv', label: 'CSV 文件 (.csv)', icon: '📄' },
                { value: 'word', label: 'Word 文件 (.docx)', icon: '📝' },
              ].map((format) => (
                <Label
                  key={format.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    exportFormat === format.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-400 hover:border-emerald-300'
                  }`}
                >
                  <Input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-lg">{format.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{format.label}</span>
                </Label>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowExportModal(false)}
              >
                取消
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDoExport}
              >
                导出
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />

      {/* 问题验收弹窗 - 使用统一风格的验收弹窗组件 */}
      {acceptanceModal.problemId && (
        (() => {
          const problem = mergedProblems.find(p => p.id === acceptanceModal.problemId);
          if (!problem) return null;
          return (
            <InspectionAcceptanceModal
              isOpen={acceptanceModal.isOpen}
              problem={problem}
              records={problem.flowRecords || []}
              isLoadingRecords={false}
              onAccept={(comments) => {
                handleApproveAcceptance();
              }}
              onReject={(reason) => {
                handleRejectToDispatch(reason);
              }}
              onClose={() => {
                setAcceptanceModal({ isOpen: false, problemId: null });
                setAcceptanceComment('');
                setRejectionReason('');
              }}
            />
          );
        })()
      )}
    </div>
  );
}

export default InspectionTab;
