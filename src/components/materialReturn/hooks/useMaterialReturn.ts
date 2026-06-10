import { useState, useCallback, useMemo, useEffect } from 'react';
import { MaterialItem, ReturnRecord, SearchForm, EditFormData, AddFormData } from '../types';
import { useMaterialReturnStore } from '../../../stores';
import { todayLocal } from '@/lib/dateUtils';

// 初始搜索表单
const initialSearchForm: SearchForm = {
  code: '',
  material: '',
  warehouse: '',
  applicant: '',
  status: 'all',
  department: 'all',
};

// 初始编辑表单
const initialEditForm: EditFormData = {
  date: '',
  type: '',
  applicant: '',
  department: '',
  warehouseLocation: '',
  status: '',
  remark: '',
  operator: '',
  reviewer: '',
  reviewDate: '',
  rejectReason: '',
  materials: [],
};

// 初始新增表单
const initialAddForm: AddFormData = {
  code: '',
  date: todayLocal(),
  type: '生产退料',
  applicant: '',
  department: '',
  warehouseLocation: '',
  remark: '',
  operator: '',
  reviewer: '',
  reviewDate: '',
  rejectReason: '',
  materials: [],
};

// 生成退料单号（格式：TL+日期+3位流水号）
const generateReturnCode = (existingCodes: string[]): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `TL${year}${month}${day}`;

  // 查找当天最大的流水号
  let maxSeq = 0;
  existingCodes.forEach(code => {
    if (code.startsWith(datePrefix)) {
      const seqStr = code.substring(datePrefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `${datePrefix}${String(nextSeq).padStart(3, '0')}`;
};

export function useMaterialReturn() {
  // ========== 数据获取（从 Zustand Store）==========
  const {
    items: storeItems,
    isLoading,
    loadItems,
    addItem: storeAddItem,
    updateItem: storeUpdateItem,
    deleteItem: storeDeleteItem,
    deleteItems: storeDeleteItems,
  } = useMaterialReturnStore();

  // 初始化加载
  useEffect(() => { loadItems(); }, [loadItems]);

  // ========== 状态定义 ==========

  // 搜索状态
  const [searchForm, setSearchForm] = useState<SearchForm>(initialSearchForm);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 模态框状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);

  // 选中状态
  const [selectedRecord, setSelectedRecord] = useState<ReturnRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // 模式状态
  const [exportMode, setExportMode] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editAlertMessage, setEditAlertMessage] = useState('');
  const [exportFileType, setExportFileType] = useState('xlsx');

  // 批量编辑状态
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<number, ReturnRecord>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 作废相关
  const [voidReason, setVoidReason] = useState('');

  // 表单状态
  const [editForm, setEditForm] = useState<EditFormData>(initialEditForm);
  const [addForm, setAddForm] = useState<AddFormData>(initialAddForm);

  // 物料选择弹窗状态
  const [showMaterialSelectModal, setShowMaterialSelectModal] = useState(false);
  const [selectedSourceAppCode, setSelectedSourceAppCode] = useState('');

  // ========== 物料选择操作 ==========

  const handleOpenMaterialSelect = useCallback((sourceAppCode: string) => {
    setSelectedSourceAppCode(sourceAppCode);
    setShowMaterialSelectModal(true);
  }, []);

  const handleConfirmMaterialSelect = useCallback((materials: MaterialItem[]) => {
    setAddForm(prev => ({
      ...prev,
      materials: [...prev.materials, ...materials],
    }));
    // 关闭弹窗后清除选择状态
    setShowMaterialSelectModal(false);
    setSelectedSourceAppCode('');
  }, []);

  // ========== 数据处理 ==========

  // 过滤后的数据
  const filteredReturns = useMemo(() => {
    return storeItems.filter(item => {
      if (searchForm.code && !item.code.toLowerCase().includes(searchForm.code.toLowerCase())) return false;
      if (searchForm.material && !item.materials.some(m => m.materialName.toLowerCase().includes(searchForm.material.toLowerCase()))) return false;
      if (searchForm.warehouse && !item.warehouseLocation.toLowerCase().includes(searchForm.warehouse.toLowerCase())) return false;
      if (searchForm.applicant && !item.applicant.toLowerCase().includes(searchForm.applicant.toLowerCase())) return false;
      if (searchForm.status !== 'all' && item.status !== searchForm.status) return false;
      if (searchForm.department !== 'all' && item.department !== searchForm.department) return false;
      return true;
    });
  }, [searchForm, storeItems]);

  const totalPages = Math.ceil(filteredReturns.length / pageSize);

  // ========== 搜索操作 ==========

  const updateSearchField = useCallback((field: keyof SearchForm, value: string) => {
    setSearchForm(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setSearchForm(initialSearchForm);
    setCurrentPage(1);
  }, []);

  // ========== 展开/折叠行 ==========

  const toggleExpandRow = useCallback((id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // ========== 选择操作 ==========

  // 可删除的状态：待审批、已审批、已驳回（已完成、已作废不可删除）
  const deletableStatuses = ['待审批', '已审批', '已驳回'];
  const isDeletable = (status: string) => deletableStatuses.includes(status);

  const handleSelectAll = useCallback(() => {
    // 导出模式：允许选择所有状态；删除/编辑模式：只能选择可编辑状态
    const filterFn = exportMode ? () => true : isDeletable;
    if (selectedRows.length === filteredReturns.filter(item => filterFn(item.status)).length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredReturns.filter(item => filterFn(item.status)).map(item => item.id));
    }
  }, [selectedRows.length, filteredReturns, exportMode]);

  const handleSelectRow = useCallback((id: number) => {
    const item = filteredReturns.find(r => r.id === id);
    if (!item) return;
    // 导出模式：允许选择所有状态；删除/编辑模式：只能选择可删除/可编辑状态
    if (!exportMode && !isDeletable(item.status)) return;
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  }, [filteredReturns, exportMode]);

  // ========== 查看详情 ==========

  const handleView = useCallback((item: ReturnRecord) => {
    setSelectedRecord(item);
    setShowDetailModal(true);
  }, []);

  // ========== 编辑操作 ==========

  const handleEdit = useCallback((item: ReturnRecord) => {
    if (item.status !== '待审批') {
      setEditAlertMessage(`该退料单当前状态为「${item.status}」，非待审批状态无法编辑。如需处理，可选择「作废申请」。`);
      setShowEditAlert(true);
      return;
    }
    setSelectedRecord(item);
    setEditForm({
      date: item.date,
      type: item.type,
      applicant: item.applicant,
      department: item.department,
      warehouseLocation: item.warehouseLocation,
      status: item.status,
      remark: item.remark || '',
      operator: item.operator || '',
      reviewer: item.reviewer || '',
      reviewDate: item.reviewDate || '',
      rejectReason: item.rejectReason || '',
      materials: [...item.materials],
    });
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedRecord) return;
    const updates = {
      date: editForm.date,
      type: editForm.type,
      applicant: editForm.applicant,
      department: editForm.department,
      warehouseLocation: editForm.warehouseLocation,
      status: editForm.status,
      remark: editForm.remark,
      operator: editForm.operator,
      reviewer: editForm.reviewer,
      reviewDate: editForm.reviewDate,
      rejectReason: editForm.rejectReason,
      materials: editForm.materials,
    };
    await storeUpdateItem(selectedRecord.id, updates as any);
    await loadItems();
    setShowEditModal(false);
  }, [selectedRecord, editForm, storeUpdateItem, loadItems]);

  // ========== 作废操作 ==========

  const handleVoidApply = useCallback((record?: ReturnRecord) => {
    const targetRecord = record || selectedRecord;
    if (!targetRecord) return;
    setSelectedRecord(targetRecord);
    setVoidReason('');
    setShowVoidModal(true);
  }, [selectedRecord]);

  const submitVoidApply = useCallback(() => {
    if (!voidReason.trim()) {
      // 作废申请需要填写作废原因
      return;
    }
    setShowVoidModal(false);
    console.info('退料单作废申请已提交');
  }, [voidReason]);

  // ========== 删除操作 ==========

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deletingId !== null) {
      await storeDeleteItem(deletingId);
      await loadItems();
    }
    setShowDeleteConfirm(false);
    setDeletingId(null);
  }, [deletingId, storeDeleteItem, loadItems]);

  // ========== 新增操作 ==========

  const handleAddMaterial = useCallback(() => {
    const newMaterial: MaterialItem = {
      sourceApplicationCode: '',
      materialCode: '',
      category: '',
      materialName: '',
      spec: '',
      unit: '',
      returnQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      reason: '',
      remark: '',
    };
    setAddForm(prev => ({ ...prev, materials: [...prev.materials, newMaterial] }));
  }, []);

  const handleRemoveMaterial = useCallback((index: number) => {
    setAddForm(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  }, []);

  const handleMaterialChange = useCallback((index: number, field: keyof MaterialItem, value: string | number) => {
    setAddForm(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  }, []);

  // ========== 生成退料单号 ==========

  const handleGenerateCode = useCallback(() => {
    const existingCodes = storeItems.map(r => r.code);
    const newCode = generateReturnCode(existingCodes);
    setAddForm(prev => ({ ...prev, code: newCode }));
  }, [storeItems]);

  // ========== 编辑物料操作 ==========

  const handleEditMaterialChange = useCallback((index: number, field: keyof MaterialItem, value: string | number) => {
    setEditForm(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  }, []);

  const handleEditAddMaterial = useCallback(() => {
    const newMaterial: MaterialItem = {
      sourceApplicationCode: '',
      materialCode: '',
      category: '',
      materialName: '',
      spec: '',
      unit: '',
      returnQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      reason: '',
      remark: '',
    };
    setEditForm(prev => ({ ...prev, materials: [...prev.materials, newMaterial] }));
  }, []);

  const handleEditRemoveMaterial = useCallback((index: number) => {
    setEditForm(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSaveAdd = useCallback(async () => {
    if (!addForm.code) {
      // 新增退料单需要先生成退料单号
      return;
    }
    const newRecord: Omit<ReturnRecord, 'id'> = {
      code: addForm.code,
      date: addForm.date,
      type: addForm.type,
      applicant: addForm.applicant,
      department: addForm.department,
      warehouseLocation: addForm.warehouseLocation,
      status: '待审批',
      statusClass: 'pending',
      remark: addForm.remark,
      operator: addForm.operator,
      reviewer: addForm.reviewer,
      reviewDate: '',
      rejectReason: '',
      materials: addForm.materials,
    };
    await storeAddItem(newRecord as any);
    await loadItems();
    setShowAddModal(false);
    setAddForm(initialAddForm);
  }, [addForm, storeAddItem, loadItems]);

  const handleCancelAdd = useCallback(() => {
    setShowAddModal(false);
    setAddForm(initialAddForm);
  }, []);

  // ========== 导出操作 ==========

  const handleExportClick = useCallback(() => {
    setShowExportTypeModal(true);
  }, []);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  const confirmExport = useCallback(async () => {
    const exportData = filteredReturns.filter(item => selectedRows.includes(item.id));

    const headers = ['退料单号', '退料日期', '退料类型', '申请人', '操作人', '退料部门', '仓库位置', '审批状态', '审核人', '备注'];
    const fields = ['code', 'date', 'type', 'applicant', 'operator', 'department', 'warehouseLocation', 'status', 'reviewer', 'remark'];

    const materialHeaders = ['物料编码', '物料名称', '规格', '单位', '退料数量', '退料原因'];
    const materialFields = ['materialCode', 'materialName', 'spec', 'unit', 'quantity', 'reason'];

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFileType === 'csv') {
      let csvContent = '\uFEFF' + headers.join(',') + ',' + materialHeaders.join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => `"${(row as any)[f] || ''}"`).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            }
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFileType === 'word') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `生产退料_${todayLocal()}.${extension}`;

    try {
      const win = window as unknown as { showSaveFilePicker?: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }> };
      if (win.showSaveFilePicker) {
        const handle = await win.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFileType.toUpperCase() + ' Files',
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
    } catch (err) {
      // 导出失败
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportTypeModal(false);
    setExportMode(false);
    setSelectedRows([]);
  }, [filteredReturns, selectedRows, exportFileType]);

  // ========== 批量操作 ==========

  const handleBatchDeleteConfirm = useCallback(() => {
    if (selectedRows.length === 0) {
      // 批量删除需要先选择要删除的记录
      setShowBatchDeleteConfirm(false);
      return;
    }
    setShowBatchDeleteConfirm(true);
  }, [selectedRows.length]);

  // 实际执行批量删除
  const confirmBatchDelete = useCallback(async () => {
    if (selectedRows.length > 0) {
      await storeDeleteItems(selectedRows);
      await loadItems();
    }
    setShowBatchDeleteConfirm(false);
    setDeleteMode(false);
    setSelectedRows([]);
  }, [selectedRows, storeDeleteItems, loadItems]);

  const handleBatchEditWarning = useCallback(() => {
    if (selectedRows.length === 0) {
      // 批量编辑需要先选择要编辑的记录
      setBatchEditMode(false);
    } else {
      setShowBatchEditModal(true);
    }
  }, [selectedRows.length]);

  return {
    // 状态
    searchForm,
    currentPage,
    pageSize,
    totalPages,
    filteredReturns,
    showDetailModal,
    showEditModal,
    showDeleteConfirm,
    showAddModal,
    showVoidModal,
    showBatchEditModal,
    showBatchDeleteConfirm,
    showEditAlert,
    showEditWarning,
    showDeleteWarning,
    showExportTypeModal,
    selectedRecord,
    deletingId,
    expandedRows,
    selectedRows,
    exportMode,
    batchEditMode,
    deleteMode,
    editAlertMessage,
    exportFileType,
    batchEditedRecords,
    currentBatchEditIndex,
    voidReason,
    editForm,
    addForm,
    setAddForm,
    showMaterialSelectModal,
    selectedSourceAppCode,

    // 搜索操作
    updateSearchField,
    handleReset,

    // 分页操作
    setCurrentPage,
    setPageSize,

    // 展开/折叠
    toggleExpandRow,

    // 选择操作
    handleSelectAll,
    handleSelectRow,
    setSelectedRows,

    // 查看详情
    handleView,
    setShowDetailModal,

    // 编辑
    handleEdit,
    setEditForm,
    handleSaveEdit,
    setShowEditModal,
    handleEditMaterialChange,
    handleEditAddMaterial,
    handleEditRemoveMaterial,

    // 作废
    handleVoidApply,
    submitVoidApply,
    setVoidReason,
    setShowVoidModal,

    // 删除
    handleDeleteClick,
    confirmDelete,
    setShowDeleteConfirm,

    // 新增
    handleAddMaterial,
    handleRemoveMaterial,
    handleMaterialChange,
    handleSaveAdd,
    handleCancelAdd,
    setShowAddModal,
    handleOpenMaterialSelect,
    handleConfirmMaterialSelect,
    handleGenerateCode,
    setShowMaterialSelectModal,

    // 导出
    handleExportClick,
    handleCancelExport,
    confirmExport,
    setExportFileType,
    setShowExportTypeModal,
    setExportMode,

    // 批量编辑
    setBatchEditMode,
    setDeleteMode,
    setBatchEditedRecords,
    setCurrentBatchEditIndex,
    handleBatchEditWarning,
    setShowBatchEditModal,
    setShowBatchDeleteConfirm,
    confirmBatchDelete,
    setShowEditWarning,
    setShowDeleteWarning,
    setEditAlertMessage,
    setShowEditAlert,
  };
}
