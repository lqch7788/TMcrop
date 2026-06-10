// useApplicationTab Hook
// 提取 ApplicationTab 的所有状态和业务逻辑
// V1.2 升级：数据从 Zustand Store 获取，CRUD 通过 API 操作
import { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';

import { MaterialItem, MaterialReceivingRecord } from '@/types/materialReceiving';
import { Approval, ApprovalType, ApprovalStatus } from '@/types/approval';
import { useApprovalContext } from '@/contexts/ApprovalContext';
import type { UseApplicationTabReturn } from '../types/applicationTab.types';
import { useMaterialRequestDataStore, useUserStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

// 默认新增表单初始状态
const getDefaultAddForm = () => ({
  code: '',
  date: todayLocal(),
  applicant: '',
  department: '',
  warehouseLocation: '',
  plantArea: '',
  reviewer: '',
  productionBatchCode: '',
  batchRemark: '',
  materials: [] as MaterialItem[]
});

/**
 * ApplicationTab Hook
 * 管理领料申请单的所有状态和业务逻辑
 * V1.2 升级：数据从 Zustand Store 获取，所有 CRUD 操作通过 API 持久化
 */
export function useApplicationTab(): UseApplicationTabReturn {
  // 获取审批上下文（用于联动）
  const approvalContext = useApprovalContext();

  // 数据从 Zustand Store 获取（无缓存层，直接调 API，V2.1 铁律）
  const {
    items: materialData,
    isLoading,
    loadItems,
    addItem: storeAddItem,
    updateItem: storeUpdateItem,
    deleteItem: storeDeleteItem,
  } = useMaterialRequestDataStore();

  // 初始化加载数据
  useEffect(() => { loadItems(); }, [loadItems]);

  // ============================================
  // 用户ID到名称的映射（使用 useUserStore 替代直接调用 authorityService）
  // ============================================
  const userStoreUsers = useUserStore((s) => s.users);
  const loadUsers = useUserStore((s) => s.loadUsers);

  useEffect(() => {
    if (userStoreUsers.length === 0) loadUsers();
  }, [loadUsers, userStoreUsers.length]);

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    userStoreUsers.forEach((u) => {
      map[u.oid] = u.name;
    });
    return map;
  }, [userStoreUsers]);

  // ============================================
  // 搜索状态
  // ============================================
  const [searchCode, setSearchCode] = useState('');
  const [searchApplicant, setSearchApplicant] = useState('');
  const [searchBatchCode, setSearchBatchCode] = useState('');
  const [searchWarehouse, setSearchWarehouse] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ============================================
  // 导出模式状态
  // ============================================
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);
  const [exportFileType, setExportFileType] = useState('xlsx');

  // ============================================
  // 详情/编辑/新增弹窗状态
  // ============================================
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaterialReceivingRecord | null>(null);

  // ============================================
  // 删除确认状态
  // ============================================
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ============================================
  // 展开行状态
  // ============================================
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // ============================================
  // 作废弹窗状态
  // ============================================
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // ============================================
  // 编辑提醒弹窗状态
  // ============================================
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [editAlertMessage, setEditAlertMessage] = useState('');

  // ============================================
  // 批量编辑模式状态
  // ============================================
  const [batchEditMode, setBatchEditMode] = useState<'edit' | 'delete' | null>(null);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<number, MaterialReceivingRecord>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // ============================================
  // 编辑表单状态
  // ============================================
  const [editForm, setEditForm] = useState<{
    date: string;
    applicant: string;
    department: string;
    warehouseLocation: string;
    plantArea: string;
    reviewer: string;
    productionBatchCode: string;
    status: string;
    materials: MaterialItem[];
  }>({
    date: '',
    applicant: '',
    department: '',
    warehouseLocation: '',
    plantArea: '',
    reviewer: '',
    productionBatchCode: '',
    status: '',
    materials: [] as MaterialItem[]
  });

  // ============================================
  // 新增表单状态
  // ============================================
  const [addForm, setAddForm] = useState(getDefaultAddForm());

  // ============================================
  // 过滤后的数据
  // ============================================
  const filteredData = useMemo(() => {
    return materialData.filter(item => {
      if (searchCode && !item.code.toLowerCase().includes(searchCode.toLowerCase())) return false;
      if (searchApplicant && !item.applicant.toLowerCase().includes(searchApplicant.toLowerCase())) return false;
      if (searchBatchCode && !item.productionBatchCode.toLowerCase().includes(searchBatchCode.toLowerCase())) return false;
      if (searchWarehouse && !item.warehouseLocation.toLowerCase().includes(searchWarehouse.toLowerCase())) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [materialData, searchCode, searchApplicant, searchBatchCode, searchWarehouse, statusFilter]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // ============================================
  // 重置搜索
  // ============================================
  const handleReset = () => {
    setSearchCode('');
    setSearchApplicant('');
    setSearchBatchCode('');
    setSearchWarehouse('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // ============================================
  // 展开/折叠行
  // ============================================
  const toggleExpandRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  // ============================================
  // 全选
  // ============================================
  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  // ============================================
  // 选择单行
  // ============================================
  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // ============================================
  // 导出
  // ============================================
  const handleExportClick = () => {
    setShowExportTypeModal(true);
  };

  const confirmExport = async () => {
    const exportData = materialData.filter(item => selectedRows.includes(item.id));

    const headers = ['领料单号', '日期', '申领人', '仓库地点', '审核人', '生产批次号', '状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'productionBatchCode', 'status'];

    const materialHeaders = ['物料编码', '物料名称', '批次号', '规格', '单位', '申领数量', '当前库存', '单价(元)', '小计(元)', '仓库货位', '备注'];
    const materialFields = ['materialCode', 'materialName', 'batchNo', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'unitPrice', 'warehousePosition', 'warehousePosition', 'remark'];

    let content: string | Uint8Array = '';
    let mimeType = '';
    let extension = '';

    if (exportFileType === 'csv') {
      let csvContent = '﻿' + headers.join(',') + ',' + materialHeaders.join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => `"${(row as any)[f] || ''}"`).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
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
      const aoa: any[][] = [];
      aoa.push([...headers, ...materialHeaders]);
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            const rowData: any[] = [];
            if (idx === 0) {
              fields.forEach(f => { rowData.push((row as any)[f]); });
            } else {
              fields.forEach(() => { rowData.push(''); });
            }
            materialFields.forEach(f => { rowData.push(mat[f]); });
            aoa.push(rowData);
          });
        } else {
          const rowData: any[] = [];
          fields.forEach(f => { rowData.push((row as any)[f]); });
          materialFields.forEach(() => { rowData.push(''); });
          aoa.push(rowData);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '领料单');

      const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      content = new Uint8Array(xlsxBuffer);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
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

    const fileName = `生产领料_${todayLocal()}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
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
      console.error('Export failed:', err);
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
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // ============================================
  // 查看详情
  // ============================================
  const handleView = (item: MaterialReceivingRecord) => {
    setSelectedRecord(item);
    setShowDetailModal(true);
  };

  // ============================================
  // 编辑
  // ============================================
  const handleEdit = (item: MaterialReceivingRecord) => {
    if (item.status !== '待审批') {
      setEditAlertMessage(`该领料单当前状态为「${item.status}」，非待审批状态无法编辑。如需处理，可选择「作废申请」。`);
      setShowEditAlert(true);
      return;
    }
    setSelectedRecord(item);
    setEditForm({
      date: item.date,
      applicant: item.applicant,
      department: item.department,
      warehouseLocation: item.warehouseLocation,
      plantArea: item.plantArea,
      reviewer: item.reviewer,
      productionBatchCode: item.productionBatchCode,
      status: item.status,
      materials: [...item.materials],
    });
    setShowEditModal(true);
  };

  // ============================================
  // 编辑弹窗 - 添加物料行
  // ============================================
  const handleEditAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      batchNo: '',
      spec: '',
      unit: '',
      category: '',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: ''
    };
    setEditForm({ ...editForm, materials: [...editForm.materials, newMaterial] });
  };

  // ============================================
  // 编辑弹窗 - 删除物料行
  // ============================================
  const handleEditRemoveMaterial = (index: number) => {
    const newMaterials = [...editForm.materials];
    newMaterials.splice(index, 1);
    setEditForm({ ...editForm, materials: newMaterials });
  };

  // ============================================
  // 编辑弹窗 - 更新物料行（函数式 setState，避免连续多次调用互相覆盖）
  // ============================================
  const handleEditMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    setEditForm((prev) => {
      const newMaterials = [...prev.materials];
      newMaterials[index] = { ...newMaterials[index], [field]: value };
      return { ...prev, materials: newMaterials };
    });
  };

  // ============================================
  // 删除确认（单条删除）
  // ============================================
  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    // 调用 API 删除记录
    if (deletingId !== null) {
      await storeDeleteItem(deletingId);
      await loadItems();
    }
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  // ============================================
  // 批量删除（勾选后确认删除多条记录）
  // ============================================
  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) return;
    // 逐条调用 API 删除
    for (const id of selectedRows) {
      await storeDeleteItem(id);
    }
    // 重新加载数据
    await loadItems();
    // 关闭弹窗、退出批量模式、清空选中
    setShowBatchDeleteConfirm(false);
    setShowDeleteWarning(false);
    setBatchEditMode(null);
    setSelectedRows([]);
  };

  // ============================================
  // 保存编辑（重新提交）
  // ============================================
  const handleSaveEdit = async () => {
    if (!selectedRecord) return;

    const updates = {
      date: editForm.date,
      applicant: editForm.applicant,
      department: editForm.department,
      warehouseLocation: editForm.warehouseLocation,
      plantArea: editForm.plantArea,
      reviewer: editForm.reviewer,
      productionBatchCode: editForm.productionBatchCode,
      status: '待审批',
      statusClass: 'pending',
      materials: editForm.materials.map(m => ({ ...m, actualQuantity: 0 })),
    };

    await storeUpdateItem(selectedRecord.id, updates as any);
    await loadItems();

    setShowEditModal(false);
    await showAlert('编辑已保存，领料单已重新提交，等待审批');
  };

  // ============================================
  // 作废申请按钮点击
  // ============================================
  const handleVoidApply = () => {
    if (!selectedRecord) return;
    setVoidReason('');
    setShowVoidModal(true);
  };

  // ============================================
  // 提交作废申请
  // ============================================
  const submitVoidApply = async () => {
    if (!voidReason.trim()) {
      await showAlert('请填写作废原因');
      return;
    }
    if (!selectedRecord) return;

    await storeUpdateItem(selectedRecord.id, { status: '已作废', statusClass: 'voided' } as any);
    await loadItems();

    setShowVoidModal(false);
    setShowEditModal(false);
  };

  // ============================================
  // 添加物料行
  // ============================================
  const handleAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      batchNo: '',
      spec: '',
      unit: '',
      category: '',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: ''
    };
    setAddForm({ ...addForm, materials: [...addForm.materials, newMaterial] });
  };

  // ============================================
  // 删除物料行
  // ============================================
  const handleRemoveMaterial = (index: number) => {
    const newMaterials = [...addForm.materials];
    newMaterials.splice(index, 1);
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // ============================================
  // 更新物料行（函数式 setState，避免连续多次调用互相覆盖）
  // ============================================
  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    setAddForm((prev) => {
      const newMaterials = [...prev.materials];
      newMaterials[index] = { ...newMaterials[index], [field]: value };
      return { ...prev, materials: newMaterials };
    });
  };

  // ============================================
  // 生成领料单号
  // ============================================
  const handleGenerateAddCode = () => {
    const newCode = `LL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(materialData.length + 1).padStart(3, '0')}`;
    setAddForm({ ...addForm, code: newCode });
  };

  // ============================================
  // 保存新增
  // ============================================
  const handleSaveAdd = async () => {
    if (!addForm.applicant) {
      await showAlert('请选择申请人');
      return;
    }
    if (addForm.materials.length === 0) {
      await showAlert('请添加至少一个物料');
      return;
    }

    // 从用户映射中获取申请人中文名称
    const applicantName = userMap[addForm.applicant] || addForm.applicant;
    const reviewerName = userMap[addForm.reviewer] || addForm.reviewer;

    // 通过 Zustand Store 调用 API 创建记录（V2.1 铁律：API 直连无缓存）
    const newRecord = await storeAddItem({
      date: addForm.date,
      applicant: applicantName,
      department: addForm.department,
      warehouseLocation: addForm.warehouseLocation,
      plantArea: addForm.plantArea,
      reviewer: reviewerName,
      productionBatchCode: addForm.productionBatchCode,
      materials: addForm.materials.map(m => ({ ...m, actualQuantity: 0 })),
    });

    if (!newRecord) {
      await showAlert('保存领料单失败，请重试');
      return;
    }

    // 同步创建审批记录（核心联动功能）
    if (approvalContext) {
      try {
        const approval: Approval = {
          id: `MAT-AP-${Date.now()}`,
          code: newRecord.code,
          type: ApprovalType.MATERIAL_REQUEST,
          typeName: '领料单',
          category: 'business',
          title: `${applicantName}的领料申请`,
          description: `申请从${addForm.warehouseLocation}领取物料，用于${addForm.plantArea}`,
          applicantId: addForm.applicant,
          applicantName: applicantName,
          applicantDepartment: addForm.department,
          applyDate: addForm.date,
          applyTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          currentStep: 1,
          totalSteps: 1,
          approvers: [{
            userId: addForm.reviewer,
            userName: reviewerName,
            role: '审批人',
            order: 1,
            status: 'pending'
          }],
          records: [],
          status: ApprovalStatus.PENDING,
          priority: 'normal',
          reminderCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notificationSent: false,
          materials: addForm.materials.map(m => ({
            materialId: m.materialCode,
            materialCode: m.materialCode,
            materialName: m.materialName,
            requestedQuantity: m.requestedQuantity,
            unit: m.unit
          })),
          businessLink: {
            type: 'material',
            requestId: String(newRecord.id),
            requestCode: newRecord.code,
            plantArea: addForm.plantArea,
            warehouseLocation: addForm.warehouseLocation,
            batchCode: addForm.productionBatchCode,
            materials: addForm.materials.map(m => ({
              materialId: m.materialCode,
              materialCode: m.materialCode,
              materialName: m.materialName,
              requestedQuantity: m.requestedQuantity,
              unit: m.unit
            }))
          }
        };
        await approvalContext.addApproval(approval);
      } catch (error) {
        console.error('创建审批记录失败:', error);
      }
    }

    setShowAddModal(false);
    setAddForm(getDefaultAddForm());
  };

  // ============================================
  // 取消新增
  // ============================================
  const handleCancelAdd = () => {
    setShowAddModal(false);
    setAddForm(getDefaultAddForm());
  };

  // ============================================
  // 返回所有状态和函数
  // ============================================
  return {
    // 搜索筛选状态
    searchCode,
    setSearchCode,
    searchApplicant,
    setSearchApplicant,
    searchBatchCode,
    setSearchBatchCode,
    searchWarehouse,
    setSearchWarehouse,
    statusFilter,
    setStatusFilter,

    // 分页状态
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    // 导出状态
    exportMode,
    setExportMode,
    selectedRows,
    setSelectedRows,
    showExportTypeModal,
    setShowExportTypeModal,
    exportFileType,
    setExportFileType,

    // 弹窗状态
    showDetailModal,
    setShowDetailModal,
    showEditModal,
    setShowEditModal,
    showAddModal,
    setShowAddModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showVoidModal,
    setShowVoidModal,
    showEditAlert,
    setShowEditAlert,
    showBatchEditModal,
    setShowBatchEditModal,
    showBatchDeleteConfirm,
    setShowBatchDeleteConfirm,
    showEditWarning,
    setShowEditWarning,
    showDeleteWarning,
    setShowDeleteWarning,

    // 选中记录
    selectedRecord,
    setSelectedRecord,
    deletingId,
    setDeletingId,

    // 展开行
    expandedRows,
    toggleExpandRow,

    // 作废状态
    voidReason,
    setVoidReason,

    // 批量编辑状态
    batchEditMode,
    setBatchEditMode,
    batchEditedRecords,
    setBatchEditedRecords,
    currentBatchEditIndex,
    setCurrentBatchEditIndex,

    // 编辑提醒
    editAlertMessage,
    setEditAlertMessage,

    // 编辑表单
    editForm,
    setEditForm,

    // 新增表单
    addForm,
    setAddForm,

    // 过滤后的数据
    materialData,
    filteredData,
    totalPages,

    // 处理函数
    handleReset,
    handleSelectAll,
    handleSelectRow,
    handleExportClick,
    confirmExport,
    handleCancelExport,
    handleView,
    handleEdit,
    handleEditAddMaterial,
    handleEditRemoveMaterial,
    handleEditMaterialChange,
    handleDeleteClick,
    confirmDelete,
    handleBatchDelete,
    handleSaveEdit,
    handleVoidApply,
    submitVoidApply,
    handleAddMaterial,
    handleRemoveMaterial,
    handleMaterialChange,
    handleGenerateAddCode,
    handleSaveAdd,
    handleCancelAdd,

    // 2026-06-04 V2.1 铁律：批量编辑保存后调 loadItems 刷新（DB 唯一真相）
    loadItems,
  };
}
