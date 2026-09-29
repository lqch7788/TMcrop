import { useState, useCallback, useMemo, useEffect } from 'react';
import { MaterialItem, ReturnRecord, RecordId, ReturnStatusClass, SearchForm, EditFormData, AddFormData } from '../types';
import { useMaterialReturnStore } from '../../../stores';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useDepartmentStore } from '../../../stores/useDepartmentStore';
import type { MaterialReturnRecord } from '../../../services/apiMaterialReturnService';
import { getReturnApproval, cancelReturnApproval } from '../../../services/apiMaterialReturnService';
import { submitReturnMaterialApproval } from '../../../services/approvalSubmitService';
import { todayLocal } from '@/lib/dateUtils';

// 初始搜索表单
const initialSearchForm: SearchForm = {
  code: '',
  material: '',
  applicant: '',
  status: 'all',
  department: 'all',
  dateFrom: '',
  dateTo: '',
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

/** 生成退料单号（格式：TL+日期+3位流水号） */
const generateReturnCode = (existingCodes: string[]): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `TL${year}${month}${day}`;

  let maxSeq = 0;
  existingCodes.forEach(code => {
    if (code.startsWith(datePrefix)) {
      const seqStr = code.substring(datePrefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  return `${datePrefix}${String(maxSeq + 1).padStart(3, '0')}`;
};

/** 统一用户提示（走全局通知 Store，无需 React Context） */
function notify(title: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info', description?: string): void {
  useNotificationStore.getState().addNotification({ title, description, variant });
}

/**
 * 提取后端允许更新的字段（2026-09-28）
 * 批量编辑缓存的每条是完整 ReturnRecord（含 id/createTime/updateTime 等只读字段），
 * 直接整体 PUT 会因后端列名白名单拒绝 `id` 而返回 400。此处只挑选可更新字段。
 */
function pickUpdatableFields(rec: ReturnRecord): Partial<ReturnRecord> {
  return {
    code: rec.code,
    date: rec.date,
    type: rec.type,
    applicant: rec.applicant,
    department: rec.department,
    warehouseLocation: rec.warehouseLocation,
    status: rec.status,
    statusClass: rec.statusClass,
    remark: rec.remark,
    operator: rec.operator,
    reviewer: rec.reviewer,
    reviewDate: rec.reviewDate,
    rejectReason: rec.rejectReason,
    materials: rec.materials,
  };
}

/**
 * Store 记录 → UI 记录规范化（2026-09-28 新增）
 * 后端返回的可选字段可能缺省，此处统一补默认值，保证 UI 层类型安全且不出现 undefined 渲染。
 */
function toReturnRecord(r: MaterialReturnRecord): ReturnRecord {
  return {
    id: r.id,
    code: r.code ?? '',
    date: r.date ?? '',
    type: r.type ?? '',
    applicant: r.applicant ?? '',
    department: r.department ?? '',
    warehouseLocation: r.warehouseLocation ?? '',
    status: r.status ?? '',
    statusClass: (r.statusClass ?? '') as ReturnStatusClass,
    remark: r.remark ?? '',
    operator: r.operator ?? '',
    reviewer: r.reviewer ?? '',
    reviewDate: r.reviewDate ?? '',
    rejectReason: r.rejectReason ?? '',
    materials: Array.isArray(r.materials) ? r.materials : [],
  };
}

/**
 * 退料明细保存前校验（2026-09-28 新增）
 * 返回错误文案，null 表示校验通过。后端亦有一层强制校验（数据闭环），此处为友好前置提示。
 */
function validateMaterials(materials: MaterialItem[], capByOriginalQuantity = true): string | null {
  if (!Array.isArray(materials) || materials.length === 0) return '请至少添加一条物料明细';
  for (const m of materials) {
    const name = m.materialName || m.materialCode || '未知物料';
    if (!String(m.materialCode || '').trim()) return '存在未填写物料编码的明细行';
    if (!String(m.sourceApplicationCode || '').trim()) return `物料 ${name} 缺少来源领料单号（退料必须基于已出库单据）`;
    const qty = Number(m.returnQuantity) || 0;
    if (qty <= 0) return `物料 ${name} 的退料数量必须大于 0`;
    // 超退校验：退料数量不得超过原领料单实发数量（quantity 字段记录出库实发量）
    const cap = Number(m.quantity) || 0;
    if (capByOriginalQuantity && cap > 0 && qty > cap) {
      return `物料 ${name} 退料数量 ${qty} 超过原领料量 ${cap}，请修正`;
    }
    if (!String(m.reason || '').trim()) return `物料 ${name} 请选择退料原因`;
  }
  return null;
}

export function useMaterialReturn() {
  // ========== 数据获取（从 Zustand Store）==========
  const {
    items: storeItems,
    isLoading,
    loadItems,
    addItem: storeAddItem,
    updateItem: storeUpdateItem,
    voidItem: storeVoidItem,
    deleteItem: storeDeleteItem,
    deleteItems: storeDeleteItems,
  } = useMaterialReturnStore();

  // 初始化加载（失败时通知用户，不静默）
  useEffect(() => {
    loadItems().catch((e: unknown) => {
      notify('加载退料列表失败', 'error', e instanceof Error ? e.message : undefined);
    });
  }, [loadItems]);

  // ========== 状态定义 ==========

  // 搜索状态
  const [searchForm, setSearchForm] = useState<SearchForm>(initialSearchForm);

  // 2026-09-28 新增：快捷筛选（我的申请 / 待我审批）
  const [myApplicationsOnly, setMyApplicationsOnly] = useState(false);
  const [pendingMyApproval, setPendingMyApproval] = useState(false);
  // 当前登录用户（快筛匹配 + 审批单申请人）
  const authUser = useAuthStore((s) => s.currentUser);
  const currentUserName = authUser?.realName || authUser?.username || '';
  // 用户/部门主数据（用于新增弹窗自动预填退料部门）
  const users = useUserStore((s) => s.users);
  const departments = useDepartmentStore((s) => s.departments);

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

  // 选中状态（id 统一为 RecordId：后端为字符串 id）
  const [selectedRecord, setSelectedRecord] = useState<ReturnRecord | null>(null);
  const [deletingId, setDeletingId] = useState<RecordId | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<RecordId>>(new Set());
  const [selectedRows, setSelectedRows] = useState<RecordId[]>([]);

  // 模式状态
  const [exportMode, setExportMode] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editAlertMessage, setEditAlertMessage] = useState('');
  const [exportFileType, setExportFileType] = useState('xlsx');

  // 批量编辑状态（key 统一为字符串形式的 id）
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<string, ReturnRecord>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 作废相关
  const [voidReason, setVoidReason] = useState('');

  // 表单状态
  const [editForm, setEditForm] = useState<EditFormData>(initialEditForm);
  const [addForm, setAddForm] = useState<AddFormData>(initialAddForm);
  // 2026-09-28 新增：提交中标记（防双击重复提交，对齐领料页 useApplicationTab 的 isSubmitting 标准）
  // 此前无锁，用户连续点保存会产生多条重复请求（浏览器日志曾见同一错误重复 5 次）
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 物料选择弹窗状态
  const [showMaterialSelectModal, setShowMaterialSelectModal] = useState(false);
  const [selectedSourceAppCode, setSelectedSourceAppCode] = useState('');

  // ========== 物料选择操作 ==========

  const handleOpenMaterialSelect = useCallback((sourceAppCode: string) => {
    setSelectedSourceAppCode(sourceAppCode);
    setShowMaterialSelectModal(true);
  }, []);

  const handleConfirmMaterialSelect = useCallback((materials: MaterialItem[]) => {
    setAddForm(prev => {
      // 去重：同一 (来源单号, 物料编码) 已存在则跳过，避免重复添加同一领料行的物料
      const existing = new Set(prev.materials.map(m => `${m.sourceApplicationCode}||${m.materialCode}`));
      const fresh = materials.filter(m => !existing.has(`${m.sourceApplicationCode}||${m.materialCode}`));
      return { ...prev, materials: [...prev.materials, ...fresh] };
    });
    setShowMaterialSelectModal(false);
    setSelectedSourceAppCode('');
  }, []);

  // ========== 数据处理 ==========

  // 过滤后的数据（统一规范化为 UI 记录类型）
  const filteredReturns = useMemo((): ReturnRecord[] => {
    return storeItems.map(toReturnRecord).filter(item => {
      if (searchForm.code && !String(item.code || '').toLowerCase().includes(searchForm.code.toLowerCase())) return false;
      if (searchForm.material && !item.materials.some(m => String(m.materialName || '').toLowerCase().includes(searchForm.material.toLowerCase()))) return false;
      if (searchForm.applicant && !String(item.applicant || '').toLowerCase().includes(searchForm.applicant.toLowerCase())) return false;
      if (searchForm.status !== 'all' && item.status !== searchForm.status) return false;
      if (searchForm.department !== 'all' && item.department !== searchForm.department) return false;
      // 日期范围（date 为 YYYY-MM-DD 文本，字符串比较即等价于日期比较）
      if (searchForm.dateFrom && String(item.date || '') < searchForm.dateFrom) return false;
      if (searchForm.dateTo && String(item.date || '') > searchForm.dateTo) return false;
      // 快捷筛选：我的申请（按申请人匹配当前登录用户）
      if (myApplicationsOnly && currentUserName && String(item.applicant || '') !== currentUserName) return false;
      // 快捷筛选：待我审批（pending 且审核人是我）
      if (pendingMyApproval) {
        const isPending = String(item.statusClass || '').toLowerCase() === 'pending';
        if (!isPending) return false;
        if (currentUserName && String(item.reviewer || '') !== currentUserName) return false;
      }
      return true;
    });
  }, [searchForm, storeItems, myApplicationsOnly, pendingMyApproval, currentUserName]);

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

  const toggleExpandRow = useCallback((id: RecordId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  // ========== 选择操作 ==========

  // 可删除/可编辑的状态：待审批、已审批、已驳回（已完成、已作废不可删除）
  const deletableStatuses = ['待审批', '已审批', '已驳回'];
  const isDeletable = (status: string) => deletableStatuses.includes(status);

  const handleSelectAll = useCallback(() => {
    // 导出模式：允许选择所有状态；删除/编辑模式：只能选择可编辑状态
    const filterFn = exportMode ? () => true : isDeletable;
    const selectableCount = filteredReturns.filter(item => filterFn(item.status)).length;
    if (selectedRows.length === selectableCount && selectableCount > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredReturns.filter(item => filterFn(item.status)).map(item => item.id));
    }
  }, [selectedRows.length, filteredReturns, exportMode]);

  const handleSelectRow = useCallback((id: RecordId) => {
    const item = filteredReturns.find(r => r.id === id);
    if (!item) return;
    // 导出模式：允许选择所有状态；删除/编辑模式：只能选择可删除/可编辑状态
    if (!exportMode && !isDeletable(item.status)) return;
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  }, [filteredReturns, exportMode]);

  // ========== 查看详情 ==========

  const handleView = useCallback((item: ReturnRecord) => {
    // 从 Store 取最新记录（避免展示打开弹窗时的陈旧快照）
    const latest = storeItems.find(r => r.id === item.id);
    setSelectedRecord(latest ? toReturnRecord(latest) : item);
    setShowDetailModal(true);
  }, [storeItems]);

  // ========== 编辑操作 ==========

  const handleEdit = useCallback((item: ReturnRecord) => {
    if (item.status !== '待审批') {
      // 2026-09-28 修复：必须同时记住目标记录——EditAlertModal 的「前往作废申请」
      // 依赖 selectedRecord 打开作废弹窗，此前未赋值导致点击后弹窗打不开（作废流程断链）
      setSelectedRecord(item);
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
    // 2026-09-28 新增：保存前校验（明细非空、数量>0、不超原领料量、原因必填）
    const invalid = validateMaterials(editForm.materials);
    if (invalid) {
      notify('无法保存', 'warning', invalid);
      return;
    }
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
    try {
      // 后端 PUT 返回完整记录，Store 已整行替换，无需再 reload
      await storeUpdateItem(selectedRecord.id, updates as Partial<ReturnRecord>);
      notify('退料单已更新', 'success');
      setShowEditModal(false);
      setSelectedRecord(null);
    } catch (e) {
      // 2026-09-28 修复：失败时保留弹窗并提示原因（此前静默关闭，用户误以为已保存）
      notify('更新退料单失败', 'error', e instanceof Error ? e.message : undefined);
    }
  }, [selectedRecord, editForm, storeUpdateItem]);

  // ========== 作废操作 ==========

  const handleVoidApply = useCallback((record?: ReturnRecord) => {
    const targetRecord = record || selectedRecord;
    if (!targetRecord) return;
    setSelectedRecord(targetRecord);
    setVoidReason('');
    setShowVoidModal(true);
  }, [selectedRecord]);

  /**
   * 提交作废申请（2026-09-28 修复：此前只 console.info 不调 API，作废完全无效）
   * 实现：把状态置为「已作废」并记录原因；后端状态感知逻辑会自动回收已恢复的库存。
   */
  const submitVoidApply = useCallback(async () => {
    if (!voidReason.trim()) {
      notify('请填写作废原因', 'warning');
      return;
    }
    if (!selectedRecord) return;
    try {
      await storeVoidItem(selectedRecord.id, voidReason.trim());
      notify('作废申请已提交', 'success', '该退料单已作废，库存已自动回收');
      setShowVoidModal(false);
      setVoidReason('');
      setSelectedRecord(null);
    } catch (e) {
      notify('作废失败', 'error', e instanceof Error ? e.message : undefined);
    }
  }, [voidReason, selectedRecord, storeVoidItem]);

  // ========== 删除操作 ==========

  const handleDeleteClick = useCallback((id: RecordId) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deletingId !== null) {
      try {
        await storeDeleteItem(deletingId);
        notify('退料单已删除', 'success');
      } catch (e) {
        notify('删除退料单失败', 'error', e instanceof Error ? e.message : undefined);
      }
    }
    setShowDeleteConfirm(false);
    setDeletingId(null);
  }, [deletingId, storeDeleteItem]);

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
      materials: prev.materials.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  }, []);

  // ========== 生成退料单号 ==========

  const handleGenerateCode = useCallback(() => {
    const existingCodes = storeItems.map(r => r.code);
    const newCode = generateReturnCode(existingCodes);
    setAddForm(prev => ({ ...prev, code: newCode }));
  }, [storeItems]);

  /**
   * 打开新增弹窗（2026-09-28 新增）—— 自动预填三项，减少必填漏填
   *  ① 退料单号：避免用户忘点「生成」导致保存被拒
   *  ② 申请人：默认当前登录用户（可改，支持代他人退料）
   *  ③ 退料部门：由当前用户的 departmentOid 反查部门名（查不到则留空由用户选）
   */
  const openAddModal = useCallback(() => {
    const code = generateReturnCode(storeItems.map(r => r.code));
    const applicant = currentUserName;
    let department = '';
    if (applicant) {
      const me = users.find(u => (u.name || u.real_name || '') === applicant);
      const deptOid = me?.departmentOid || me?.orgOid || '';
      if (deptOid) {
        department = departments.find(d => d.oid === deptOid || d.id === deptOid)?.name || '';
      }
    }
    setAddForm({ ...initialAddForm, code, applicant, department });
    setShowAddModal(true);
  }, [storeItems, currentUserName, users, departments]);

  // ========== 编辑物料操作 ==========

  const handleEditMaterialChange = useCallback((index: number, field: keyof MaterialItem, value: string | number) => {
    setEditForm(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
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
    // 防双击：提交中直接忽略后续点击（避免重复创建/重复报错刷屏）
    if (isSubmitting) return;
    // 2026-09-28 修复：所有校验失败均给出明确提示（此前静默 return，用户点保存毫无反应）
    if (!addForm.code) {
      notify('请先生成退料单号', 'warning');
      return;
    }
    const invalid = validateMaterials(addForm.materials);
    if (invalid) {
      notify('无法保存', 'warning', invalid);
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
    try {
      setIsSubmitting(true);
      // 库存恢复由后端在事务内统一完成（materials 主表 + batch_inventory 批次 + inventory_transaction 流水）
      const created = await storeAddItem(newRecord);
      // 2026-09-28 审批流接入：创建后立即提交审批（审批通过才恢复库存）
      try {
        const approvalResult = await submitReturnMaterialApproval({
          returnId: String(created.id),
          returnCode: created.code,
          // 2026-09-28：补全明细字段，供审批页展开行展示完整物料信息
          materials: addForm.materials.map(m => ({
            name: m.materialName || m.materialCode,
            quantity: Number(m.returnQuantity) || 0,
            materialCode: m.materialCode,
            spec: m.spec,
            unit: m.unit,
            unitPrice: Number(m.unitPrice) || 0,
            sourceApplicationCode: m.sourceApplicationCode,
            warehousePosition: m.warehousePosition,
            reason: m.reason,
          })),
          amount: addForm.materials.reduce(
            (s, m) => s + (Number(m.returnQuantity) || 0) * (Number(m.unitPrice) || 0), 0
          ),
          applicantId: addForm.applicant || currentUserName,
          applicantName: addForm.applicant || currentUserName,
          department: addForm.department,
        });
        if (approvalResult.autoApproveFailed) {
          // 2026-09-28：免审批自动通过失败时单据会卡在待审批（无审批人可审），
          // 必须把服务端返回的真实原因透出（如：物料不在库存主表导致联动回滚）
          notify('审批自动通过失败', 'error', approvalResult.message);
        } else {
          notify('退料单已提交审批', 'success', '审批通过后库存自动恢复');
        }
        // 同步后端最终状态（审批若配置为自动通过，状态与库存已在服务端完成）
        await loadItems().catch(() => { /* 同步失败不影响提交结果，下次刷新自愈 */ });
      } catch (approvalErr) {
        // 单据已创建成功、仅审批提交失败 → warning 级提示（可在列表中「重新提交」）
        notify('审批提交失败', 'warning',
          `退料单已创建，但未进入审批流程：${approvalErr instanceof Error ? approvalErr.message : '未知错误'}。可在列表中重新提交`);
      }
      setShowAddModal(false);
      setAddForm(initialAddForm);
    } catch (e) {
      // 失败时保留弹窗与表单内容，便于用户修正后重试
      notify('创建退料单失败', 'error', e instanceof Error ? e.message : undefined);
    } finally {
      // 无论成败都释放提交锁，避免失败后无法重试
      setIsSubmitting(false);
    }
  }, [addForm, storeAddItem, currentUserName, loadItems, isSubmitting]);

  const handleCancelAdd = useCallback(() => {
    setShowAddModal(false);
    setAddForm(initialAddForm);
  }, []);

  // ========== 审批操作（2026-09-28 新增）==========

  /** 撤回审批：作废审批单并把退料单退回草稿态（仅「待审批」可用） */
  const handleWithdraw = useCallback(async (item: ReturnRecord) => {
    if (String(item.statusClass || '').toLowerCase() !== 'pending') return;
    try {
      const approval = await getReturnApproval(item.id);
      if (approval && approval.status === 'pending') {
        await cancelReturnApproval(approval.id);
      }
      await storeUpdateItem(item.id, { status: '草稿', statusClass: 'draft' } as Partial<ReturnRecord>);
      notify('已撤回审批', 'success', '退料单已回到草稿状态，可修改后重新提交');
    } catch (e) {
      notify('撤回失败', 'error', e instanceof Error ? e.message : undefined);
    }
  }, [storeUpdateItem]);

  /** 重新提交审批（「草稿」或「已驳回」可用） */
  const handleResubmit = useCallback(async (item: ReturnRecord) => {
    try {
      const materials = item.materials || [];
      // 2026-09-28 修复：先置为待审批再提交，避免覆盖"审批自动通过"的联动结果
      // （此前顺序相反：提交后无条件置 pending，会把后端已置的 approved 冲掉，
      //  造成"审批单已通过、退料单仍待审批"的状态不一致）
      await storeUpdateItem(item.id, { status: '待审批', statusClass: 'pending' } as Partial<ReturnRecord>);
      await submitReturnMaterialApproval({
        returnId: String(item.id),
        returnCode: item.code,
        // 2026-09-28：补全明细字段，供审批页展开行展示完整物料信息
        materials: materials.map(m => ({
          name: m.materialName || m.materialCode,
          quantity: Number(m.returnQuantity) || 0,
          materialCode: m.materialCode,
          spec: m.spec,
          unit: m.unit,
          unitPrice: Number(m.unitPrice) || 0,
          sourceApplicationCode: m.sourceApplicationCode,
          warehousePosition: m.warehousePosition,
          reason: m.reason,
        })),
        amount: materials.reduce(
          (s, m) => s + (Number(m.returnQuantity) || 0) * (Number(m.unitPrice) || 0), 0
        ),
        applicantId: item.applicant || currentUserName,
        applicantName: item.applicant || currentUserName,
        department: item.department,
      });
      // 同步后端最终状态（审批若自动通过，状态与库存已在服务端完成）
      await loadItems().catch(() => { /* 同步失败不影响提交结果，下次刷新自愈 */ });
      notify('已重新提交审批', 'success');
    } catch (e) {
      notify('重新提交失败', 'error', e instanceof Error ? e.message : undefined);
    }
  }, [storeUpdateItem, currentUserName, loadItems]);

  /** 复制退料单：生成新单号 + 复制全部字段与物料明细，打开新增弹窗待确认 */
  const handleDuplicate = useCallback((item: ReturnRecord) => {
    setAddForm({
      ...initialAddForm,
      code: generateReturnCode(storeItems.map(r => r.code)),
      date: todayLocal(),
      type: item.type,
      applicant: item.applicant,
      department: item.department,
      warehouseLocation: item.warehouseLocation,
      remark: `复制自 ${item.code}`,
      operator: item.operator,
      materials: (item.materials || []).map(m => ({ ...m })),
    });
    setShowAddModal(true);
    notify('已复制退料单信息', 'info', '请确认数量后保存');
  }, [storeItems]);

  // ========== 批量编辑保存 ==========

  /**
   * 批量编辑保存全部（2026-09-28 修复）
   * 此前该函数只清空 UI 状态、不调用任何 API，用户编辑内容 100% 丢失。
   * 现逐条提交，单条失败不阻断其余（allSettled），最后汇总成功/失败数量。
   */
  const handleBatchSaveAll = useCallback(async () => {
    const entries = Object.entries(batchEditedRecords);
    if (entries.length === 0) {
      notify('没有需要保存的修改', 'info');
      setShowBatchEditModal(false);
      setBatchEditMode(false);
      setSelectedRows([]);
      setCurrentBatchEditIndex(0);
      return;
    }
    const results = await Promise.allSettled(
      // 只提交白名单字段：完整记录含 id 等只读字段，整体 PUT 会被后端列名校验拒绝（400）
      entries.map(([id, rec]) => storeUpdateItem(id, pickUpdatableFields(rec)))
    );
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length === 0) {
      notify(`已保存 ${entries.length} 条退料单`, 'success');
    } else {
      const firstMsg = (failed[0] as PromiseRejectedResult).reason;
      notify(
        `批量保存部分失败（成功 ${entries.length - failed.length} / 失败 ${failed.length}）`,
        'error',
        firstMsg instanceof Error ? firstMsg.message : undefined
      );
      // 保留失败项便于用户重试
      const failedIds = new Set(
        entries.filter((_, i) => results[i].status === 'rejected').map(([id]) => id)
      );
      setBatchEditedRecords(prev =>
        Object.fromEntries(Object.entries(prev).filter(([id]) => failedIds.has(id)))
      );
      setShowBatchEditModal(false);
      setBatchEditMode(false);
      setSelectedRows([]);
      setCurrentBatchEditIndex(0);
      return;
    }
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setBatchEditedRecords({});
    setCurrentBatchEditIndex(0);
  }, [batchEditedRecords, storeUpdateItem]);

  // ========== 导出操作 ==========

  const handleExportClick = useCallback(() => {
    setShowExportTypeModal(true);
  }, []);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  /** HTML/CSV 转义（防导出文件内的标记注入与 CSV 列错位） */
  const escapeHtmlCell = (v: unknown): string =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeCsvCell = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const confirmExport = useCallback(async () => {
    const exportData = filteredReturns.filter(item => selectedRows.includes(item.id));

    const headers = ['退料单号', '退料日期', '退料类型', '申请人', '操作人', '退料部门', '仓库位置', '审批状态', '审核人', '备注'];
    const fields = ['code', 'date', 'type', 'applicant', 'operator', 'department', 'warehouseLocation', 'status', 'reviewer', 'remark'];

    const materialHeaders = ['物料编码', '物料名称', '规格', '单位', '退料数量', '退料原因'];
    const materialFields = ['materialCode', 'materialName', 'spec', 'unit', 'returnQuantity', 'reason'];

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFileType === 'csv') {
      let csvContent = '﻿' + headers.join(',') + ',' + materialHeaders.join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => escapeCsvCell((row as unknown as Record<string, unknown>)[f])).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat, idx) => {
            const matRow = materialFields.map(f => escapeCsvCell((mat as unknown as Record<string, unknown>)[f])).join(',');
            if (idx === 0) csvContent += mainRow + ',' + matRow + '\n';
            else csvContent += ','.repeat(headers.length) + ',' + matRow + '\n';
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFileType === 'xlsx') {
      // 说明：以 HTML 表格承载，Excel 可直接打开；扩展名与 mimeType 保持 xls 语义一致
      let tableContent = `<html><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        const mainCells = fields.map(f => `<td>${escapeHtmlCell((row as unknown as Record<string, unknown>)[f])}</td>`).join('');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat, idx) => {
            const matCells = materialFields.map(f => `<td>${escapeHtmlCell((mat as unknown as Record<string, unknown>)[f])}</td>`).join('');
            if (idx === 0) tableContent += `<tr>${mainCells}${matCells}</tr>`;
            else tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${matCells}</tr>`;
          });
        } else {
          tableContent += `<tr>${mainCells}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
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
        const mainCells = fields.map(f => `<td>${escapeHtmlCell((row as unknown as Record<string, unknown>)[f])}</td>`).join('');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat, idx) => {
            const matCells = materialFields.map(f => `<td>${escapeHtmlCell((mat as unknown as Record<string, unknown>)[f])}</td>`).join('');
            if (idx === 0) tableContent += `<tr>${mainCells}${matCells}</tr>`;
            else tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${matCells}</tr>`;
          });
        } else {
          tableContent += `<tr>${mainCells}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `生产退料_${todayLocal()}.${extension}`;

    // 下载：优先 File System Access API，失败/不可用则回退 Blob 下载
    const downloadViaBlob = () => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };

    try {
      const win = window as unknown as {
        showSaveFilePicker?: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>;
      };
      if (win.showSaveFilePicker) {
        try {
          const handle = await win.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: exportFileType.toUpperCase() + ' Files', accept: { [mimeType]: ['.' + extension] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
        } catch (pickerErr) {
          // 用户主动取消不算失败；其余异常回退 Blob 下载
          if (!(pickerErr instanceof Error && pickerErr.name === 'AbortError')) {
            downloadViaBlob();
          } else {
            return; // 用户取消，不提示成功也不提示失败
          }
        }
      } else {
        downloadViaBlob();
      }
    } catch (err) {
      downloadViaBlob();
      if (err instanceof Error && err.name !== 'AbortError') {
        notify('导出方式异常，已改用浏览器下载', 'warning');
      }
    }

    notify(`已导出 ${exportData.length} 条退料单`, 'success');
    setShowExportTypeModal(false);
    setExportMode(false);
    setSelectedRows([]);
  }, [filteredReturns, selectedRows, exportFileType]);

  // ========== 批量操作 ==========

  /** 实际执行批量删除（后端单事务，全部成功或全部回滚） */
  const confirmBatchDelete = useCallback(async () => {
    if (selectedRows.length > 0) {
      try {
        await storeDeleteItems(selectedRows);
        notify(`已删除 ${selectedRows.length} 条退料单`, 'success');
      } catch (e) {
        notify('批量删除失败', 'error', e instanceof Error ? e.message : undefined);
      }
    }
    setShowBatchDeleteConfirm(false);
    setDeleteMode(false);
    setSelectedRows([]);
  }, [selectedRows, storeDeleteItems]);

  const handleBatchEditWarning = useCallback(() => {
    if (selectedRows.length === 0) {
      setBatchEditMode(false);
      notify('请先勾选要编辑的退料单', 'warning');
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
    isLoading,
    isSubmitting,
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

    // 2026-09-28 快捷筛选
    myApplicationsOnly,
    setMyApplicationsOnly,
    pendingMyApproval,
    setPendingMyApproval,

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

    // 2026-09-28 审批操作与复制
    handleWithdraw,
    handleResubmit,
    handleDuplicate,

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
    openAddModal,
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
    handleBatchSaveAll,
    setShowBatchEditModal,
    setShowBatchDeleteConfirm,
    confirmBatchDelete,
    setShowEditWarning,
    setShowDeleteWarning,
    setEditAlertMessage,
    setShowEditAlert,
  };
}
