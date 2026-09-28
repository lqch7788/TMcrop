/**
 * 物料库存页面
 * 数据来源：Zustand Store → enhancedApiClient → API
 * 无缓存层，直接调用 API（V2.1 铁律：禁用 IndexedDB / localStorage / persist）
 */

import { useState, useMemo, useEffect } from 'react';
import { MaterialFilters, MaterialFiltersState, filterMaterials, Material } from '../../components/warehouse/MaterialFilters';
import { MaterialsTable } from '../../components/warehouse/MaterialsTable';
import { MaterialDetailModal } from '../../components/warehouse/MaterialDetailModal';
import { MaterialEditModal, MaterialDeleteConfirmModal } from '../../components/warehouse/MaterialEditModal';
import { MaterialBatchEditModal } from '../../components/warehouse/MaterialBatchEditModal';
import { BatchEditWarningModal } from '../../components/warehouse/BatchEditWarningModal';
import { BatchDeleteConfirmDialog } from '../../components/warehouse/BatchDeleteConfirmDialog';
import { MaterialExportModal } from '../../components/warehouse/MaterialExportModal';
import { MaterialCreateModal } from '../../components/warehouse/MaterialCreateModal';
import PageHeader from '../../components/warehouse/PageHeader';
import ActionToolbar from '../../components/warehouse/ActionToolbar';
import { useWarehouseMaterialStore } from '../../stores';
import { todayLocal } from '@/lib/dateUtils';
import { categoryConfig } from '../../types/warehouseInbound.types';
// 2026-09-27 修复（P2-10）：导出改用真正的 .xlsx（此前 HTML 伪装 .xls，Excel 打开弹格式警告）
import { exportXlsx } from '@/services/exporters';
import { showAlert } from '@/lib/dialogService';

export default function WarehouseOverviewPage() {
  // Zustand Store 数据
  const { items: allMaterials, loadItems, addItem, updateItem, deleteItem, deleteItems } = useWarehouseMaterialStore();

  // 初始化加载
  useEffect(() => { loadItems(); }, [loadItems]);

  // 筛选状态
  const [filters, setFilters] = useState<MaterialFiltersState>({
    code: '', name: '', supplier: '', location: '',
    searchBigCategory: '', searchMidCategory: '', searchSubCategory: '', showLowStock: false,
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 选择/模式状态
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  // 筛选数据
  const filteredMaterials = useMemo(() => filterMaterials(allMaterials, filters), [allMaterials, filters]);

  // 低库存数量
  const lowStockCount = useMemo(() => allMaterials.filter(m => m.quantity < m.minStock).length, [allMaterials]);

  // 选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === filteredMaterials.length) setSelectedRows([]);
    else setSelectedRows(filteredMaterials.map(m => m.id));
  };
  const handleSelectRow = (id: number) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };
  const handleCancelSelection = () => {
    setExportMode(false); setBatchEditMode(false); setDeleteMode(false); setSelectedRows([]);
  };

  // UI 状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchEditWarning, setShowBatchEditWarning] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPrefillName, setCreatePrefillName] = useState<string | undefined>(undefined);
  const [createExpandCodeGen, setCreateExpandCodeGen] = useState(false);
  const [batchEditedMaterials, setBatchEditedMaterials] = useState<Record<number, any>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // 读 URL 参数：支持 MaterialAutocomplete "去添加" 链接 deep link
  // 用法：/warehouse-overview?new=1&prefillName=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      setCreatePrefillName(params.get('prefillName') || undefined);
      setCreateExpandCodeGen(true);
      setShowCreateModal(true);
      // 清理 URL 参数，避免刷新重复触发
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // 筛选变化
  const handleFiltersChange = (newFilters: MaterialFiltersState) => {
    setFilters(newFilters); setCurrentPage(1);
  };

  // 删除操作（通过Store调用API）
  const handleConfirmDelete = async (id: number) => {
    await deleteItem(id);
    await loadItems();
  };

  const handleBatchDelete = async (ids: number[]) => {
    await deleteItems(ids);
    await loadItems();
  };

  // 导出处理（2026-09-27 修复：HTML 伪装 .xls → 真 .xlsx；未选中行时导出当前筛选的全部数据）
  const handleDoExport = async () => {
    const rowsToExport = selectedRows.length > 0
      ? filteredMaterials.filter(m => selectedRows.includes(m.id))
      : filteredMaterials;
    if (rowsToExport.length === 0) {
      showAlert('没有可导出的数据');
      return;
    }
    const headers = ['物料编码', '物料名称', '分类', '规格', '条形码', '单位', '库存数量', '最低库存', '最高库存', '单价', '供应商', '存放位置', '批次号', '生产日期', '有效期至', '备注', '数据状态'];
    const rows = rowsToExport.map(m => ({
      '物料编码': m.code,
      '物料名称': m.name,
      '分类': m.category,
      '规格': m.specification,
      // 2026-09-27 补齐：此前导出缺 条形码/批次号/生产日期/有效期至/备注 5 列（表格已展示）
      '条形码': m.barcode,
      '单位': m.unit,
      '库存数量': m.quantity,
      '最低库存': m.minStock,
      '最高库存': m.maxStock,
      '单价': m.price,
      '供应商': m.supplier,
      '存放位置': m.location,
      '批次号': m.batchNo,
      '生产日期': m.productionDate,
      '有效期至': m.expiryDate,
      '备注': m.remarks || '',
      '数据状态': m.dataStatus,
    }));
    try {
      await exportXlsx({ filename: `物料汇总表_${todayLocal()}.xlsx`, headers, rows });
    } catch (e) {
      showAlert(`导出失败：${e instanceof Error ? e.message : '未知错误'}`);
    }
    setShowExportModal(false); setExportMode(false); setSelectedRows([]);
  };

  // 查看/编辑/删除操作
  const handleView = (material: Material) => { setSelectedMaterial(material); setShowDetailModal(true); };
  const handleEdit = (material: Material) => { setSelectedMaterial(material); setShowEditModal(true); };
  const handleDelete = (material: Material) => { setSelectedMaterial(material); setShowDeleteModal(true); };

  const handleConfirmDeleteAction = () => {
    if (selectedMaterial) handleConfirmDelete(selectedMaterial.id);
    setShowDeleteModal(false); setSelectedMaterial(null);
  };

  const handleSaveEdit = async (material: Material) => {
    await updateItem(material.id, material);
    await loadItems();
    setShowEditModal(false); setSelectedMaterial(null);
  };

  // ActionToolbar callbacks
  const handleLowStockToggle = () => handleFiltersChange({ ...filters, showLowStock: !filters.showLowStock });
  const handleBatchEditClick = () => setShowBatchEditWarning(true);
  // 2026-09-28 修复：工具栏"删除"点击后直接进入复选框（勾选）模式，与物料入库/流转记录页一致。
  // 此前先弹"批量删除警告"弹窗，用户看不到复选框、误以为点一下就把数据删了；
  // 最终删除仍由 BatchDeleteConfirmDialog 二次确认把关。
  const handleEnterDeleteMode = () => {
    setSelectedRows([]);
    setDeleteMode(true);
  };
  const handleExport = () => { setExportMode(true); setSelectedRows([]); };
  const handleConfirmBatchEdit = () => {
    if (selectedRows.length === 1) {
      const material = filteredMaterials.find(m => m.id === selectedRows[0]);
      if (material) { setSelectedMaterial(material); setShowEditModal(true); setBatchEditMode(false); setSelectedRows([]); }
    } else { setShowBatchEditModal(true); }
  };
  const handleCancelBatchEdit = () => { setBatchEditMode(false); setSelectedRows([]); };

  // 批量编辑保存全部：遍历 batchEditedMaterials 调 updateItem，再刷新列表
  // 修复：原 onSaveAll 只关弹窗不真保存，编辑后列表信息不变
  const handleSaveBatchAll = async () => {
    const editedIds = Object.keys(batchEditedMaterials);
    // 边界：没编辑任何东西直接关闭
    if (editedIds.length === 0) {
      setShowBatchEditModal(false);
      setBatchEditMode(false);
      setSelectedRows([]);
      setBatchEditedMaterials({});
      setCurrentBatchEditIndex(0);
      return;
    }
    // 顺序保存每条编辑（顺序即可，不并发——后端是 SQLite）
    for (const idStr of editedIds) {
      const id = Number(idStr);
      const updates = batchEditedMaterials[id];
      if (updates && Object.keys(updates).length > 0) {
        await updateItem(id, updates);
      }
    }
    // 刷新列表拿后端最新数据（避免乐观更新和后端实际不一致）
    await loadItems();
    // 关闭 + 重置 state
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setBatchEditedMaterials({});
    setCurrentBatchEditIndex(0);
  };
  // 点"确认删除"：未勾选任何行时给出提示，避免弹出"删除 0 个"的空确认框
  const handleConfirmBatchDeleteAction = () => {
    if (selectedRows.length === 0) {
      showAlert('请先勾选要删除的物料');
      return;
    }
    setShowBatchDeleteConfirm(true);
  };
  const handleCancelDeleteAction = () => { setDeleteMode(false); setSelectedRows([]); };
  const handleConfirmExportClick = () => setShowExportModal(true);
  const handleCancelExportAction = () => { setExportMode(false); setSelectedRows([]); };

  // 新建物料（"+ 新增" 按钮 + URL deep link 都会走这里）
  const handleAdd = () => {
    setCreatePrefillName(undefined);
    setCreateExpandCodeGen(false);
    setShowCreateModal(true);
  };

  // 新建成功：刷新列表（addItem 内部已 push 进 store，loadItems 是为了同步后端最新数据）
  const handleCreateSuccess = async (_material: Material) => {
    await loadItems();
  };

  // 批量删除确认
  const handleBatchDeleteConfirm = () => {
    handleBatchDelete(selectedRows);
    setShowBatchDeleteConfirm(false); setDeleteMode(false); setSelectedRows([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="物料库存" subtitle="仓库物料库存一览" />

      <MaterialFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        lowStockCount={lowStockCount}
        onLowStockClick={handleLowStockToggle}
        categoryConfig={categoryConfig}
      />

      <ActionToolbar
        title="物料汇总表"
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows}
        lowStockCount={lowStockCount}
        filters={filters}
        onLowStockToggle={handleLowStockToggle}
        onBatchEdit={handleBatchEditClick}
        onDelete={handleEnterDeleteMode}
        onExport={handleExport}
        onConfirmBatchEdit={handleConfirmBatchEdit}
        onCancelBatchEdit={handleCancelBatchEdit}
        onConfirmDelete={handleConfirmBatchDeleteAction}
        onCancelDelete={handleCancelDeleteAction}
        onConfirmExport={handleConfirmExportClick}
        onCancelExport={handleCancelExportAction}
        onAdd={handleAdd}
      />

      <MaterialsTable
        materials={filteredMaterials}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedRows={selectedRows}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancelSelection={handleCancelSelection}
        onConfirmExport={handleConfirmExportClick}
      />

      <MaterialDetailModal
        material={selectedMaterial}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />

      <MaterialEditModal
        material={selectedMaterial}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />

      <MaterialDeleteConfirmModal
        material={selectedMaterial}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDeleteAction}
      />

      <BatchDeleteConfirmDialog
        isOpen={showBatchDeleteConfirm}
        selectedMaterials={filteredMaterials.filter(m => selectedRows.includes(m.id))}
        onClose={() => { setShowBatchDeleteConfirm(false); setDeleteMode(false); setSelectedRows([]); }}
        onConfirm={handleBatchDeleteConfirm}
      />

      <MaterialBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        filteredMaterials={filteredMaterials}
        batchEditedMaterials={batchEditedMaterials}
        currentBatchEditIndex={currentBatchEditIndex}
        onClose={() => { setShowBatchEditModal(false); setBatchEditedMaterials({}); setCurrentBatchEditIndex(0); }}
        onMaterialSelect={(idx) => setCurrentBatchEditIndex(idx)}
        onFieldChange={(materialId, field, value) => {
          const currentMaterial = filteredMaterials.find(m => m.id === materialId);
          const currentData = batchEditedMaterials[materialId] || currentMaterial || {};
          setBatchEditedMaterials({
            ...batchEditedMaterials,
            [materialId]: { ...currentData, [field]: value }
          });
        }}
        onSaveAll={handleSaveBatchAll}
        onNext={() => {
          const nextIndex = currentBatchEditIndex + 1;
          if (nextIndex < selectedRows.length) {
            setCurrentBatchEditIndex(nextIndex);
          } else {
            setCurrentBatchEditIndex(0);
          }
        }}
      />

      <BatchEditWarningModal
        isOpen={showBatchEditWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowBatchEditWarning(false)}
        onConfirm={() => {
          setShowBatchEditWarning(false);
          setBatchEditMode(true);
        }}
      />

      <MaterialExportModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length > 0 ? selectedRows.length : filteredMaterials.length}
        exportFormat={exportFormat}
        onClose={() => setShowExportModal(false)}
        onFormatChange={setExportFormat}
        onExport={handleDoExport}
      />

      <MaterialCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        prefillName={createPrefillName}
        defaultExpandCodeGen={createExpandCodeGen}
      />
    </div>
  );
}
