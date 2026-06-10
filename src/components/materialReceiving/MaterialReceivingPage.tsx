import React, { useState, useMemo } from 'react';
import { useMaterialReceiving } from '../../hooks/materialReceiving/useMaterialReceiving';
import { MaterialReceivingHeader } from './MaterialReceivingHeader';
import ApplicationTab from './ApplicationTab';
import ExecuteTab from './ExecuteTab';
import StatisticsTab from './StatisticsTab';
import { CostTabSwitcher } from '../cost/CostTabSwitcher';
import { materialReceivingDetails, materialExecuteDetails } from '../../data/materialReceivingData';
import type { MaterialReceivingRecord, ExecuteMaterialItem } from '../../types/materialReceiving';
import { todayLocal } from '../../lib/dateUtils';

export const MaterialReceivingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('application');
  const mr = useMaterialReceiving();

  // 成本核算Tab组件
  if (activeTab === 'cost') {
    return (
      <div className="space-y-6">
        <MaterialReceivingHeader activeTab={activeTab} onTabChange={setActiveTab} />
        <CostTabSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MaterialReceivingHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'application' && (
          <ApplicationTab
            // 状态
            searchCode={mr.searchCode}
            searchApplicant={mr.searchApplicant}
            searchBatchCode={mr.searchBatchCode}
            searchWarehouse={mr.searchWarehouse}
            statusFilter={mr.statusFilter}
            currentPage={mr.currentPage}
            pageSize={mr.pageSize}
            selectedRows={mr.selectedRows}
            expandedRows={mr.expandedRows}
            exportMode={mr.exportMode}
            // 状态设置函数
            setSearchCode={mr.setSearchCode}
            setSearchApplicant={mr.setSearchApplicant}
            setSearchBatchCode={mr.setSearchBatchCode}
            setSearchWarehouse={mr.setSearchWarehouse}
            setStatusFilter={mr.setStatusFilter}
            setCurrentPage={mr.setCurrentPage}
            setPageSize={mr.setPageSize}
            setSelectedRows={mr.setSelectedRows}
            setExpandedRows={mr.setExpandedRows}
            setExportMode={mr.setExportMode}
            // 弹窗状态
            showDetailModal={mr.showDetailModal}
            showEditModal={mr.showEditModal}
            showDeleteConfirm={mr.showDeleteConfirm}
            showAddModal={mr.showAddModal}
            showVoidModal={mr.showVoidModal}
            showEditAlert={mr.showEditAlert}
            showEditWarning={mr.showEditWarning}
            showDeleteWarning={mr.showDeleteWarning}
            showBatchEditModal={mr.showBatchEditModal}
            showBatchDeleteConfirm={mr.showBatchDeleteConfirm}
            showExportTypeModal={mr.showExportTypeModal}
            setShowDetailModal={mr.setShowDetailModal}
            setShowEditModal={mr.setShowEditModal}
            setShowDeleteConfirm={mr.setShowDeleteConfirm}
            setShowAddModal={mr.setShowAddModal}
            setShowVoidModal={mr.setShowVoidModal}
            setShowEditAlert={mr.setShowEditAlert}
            setShowEditWarning={mr.setShowEditWarning}
            setShowDeleteWarning={mr.setShowDeleteWarning}
            setShowBatchEditModal={mr.setShowBatchEditModal}
            setShowBatchDeleteConfirm={mr.setShowBatchDeleteConfirm}
            setShowExportTypeModal={mr.setShowExportTypeModal}
            // 选中记录
            selectedRecord={mr.selectedRecord}
            setSelectedRecord={mr.setSelectedRecord}
            deletingId={mr.deletingId}
            setDeletingId={mr.setDeletingId}
            editAlertMessage={mr.editAlertMessage}
            setEditAlertMessage={mr.setEditAlertMessage}
            voidReason={mr.voidReason}
            setVoidReason={mr.setVoidReason}
            // 批量编辑状态
            batchEditMode={mr.batchEditMode}
            setBatchEditMode={mr.setBatchEditMode}
            batchEditedRecords={mr.batchEditedRecords}
            setBatchEditedRecords={mr.setBatchEditedRecords}
            currentBatchEditIndex={mr.currentBatchEditIndex}
            setCurrentBatchEditIndex={mr.setCurrentBatchEditIndex}
            // 表单状态
            editForm={mr.editForm}
            setEditForm={mr.setEditForm}
            addForm={mr.addForm}
            setAddForm={mr.setAddForm}
            exportFileType={mr.exportFileType}
            setExportFileType={mr.setExportFileType}
            // 回调函数
            onView={mr.handleView}
            onEdit={mr.handleEdit}
            onDelete={mr.handleDeleteClick}
            onReset={mr.handleReset}
            onToggleExpand={mr.toggleExpandRow}
            onSelectAll={mr.handleSelectAll}
            onSelectRow={mr.handleSelectRow}
            onExportClick={mr.handleExportClick}
            onCancelExport={mr.handleCancelExport}
            onConfirmExport={mr.confirmExport}
            onSaveEdit={mr.handleSaveEdit}
            onCancelEdit={() => mr.setShowEditModal(false)}
            onVoidApply={mr.handleVoidApply}
            onSubmitVoid={mr.submitVoidApply}
            onSaveAdd={mr.handleSaveAdd}
            onCancelAdd={mr.handleCancelAdd}
            onEditAddMaterial={mr.handleEditAddMaterial}
            onEditRemoveMaterial={mr.handleEditRemoveMaterial}
            onEditMaterialChange={mr.handleEditMaterialChange}
            onAddMaterial={mr.handleAddMaterial}
            onRemoveMaterial={mr.handleRemoveMaterial}
            onMaterialChange={mr.handleMaterialChange}
            confirmDelete={mr.confirmDelete}
            // 数据
            data={mr.data}
            filteredData={mr.filteredData}
            totalPages={mr.totalPages}
          />
        )}

        {activeTab === 'execute' && (
          <ExecuteTabWrapper activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        {activeTab === 'statistics' && (
          <StatisticsTab />
        )}
      </div>
    </div>
  );
};

// ExecuteTab包装器组件 - 用于整合ExecuteTab的props
interface ExecuteTabWrapperProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ExecuteTabWrapper: React.FC<ExecuteTabWrapperProps> = ({ activeTab }) => {
  const [searchCode, setSearchCode] = useState('');
  const [searchApplicant, setSearchApplicant] = useState('');
  const [searchBatchCode, setSearchBatchCode] = useState('');
  const [searchWarehouse, setSearchWarehouse] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [exportMode, setExportMode] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);
  const [exportFileType, setExportFileType] = useState('xlsx');
  const [selectedRecord, setSelectedRecord] = useState<typeof materialExecuteDetails[0] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [selectedApplicationCode, setSelectedApplicationCode] = useState('');
  const [selectedMaterialIndices, setSelectedMaterialIndices] = useState<Set<number>>(new Set());
  const [materialActualQuantities, setMaterialActualQuantities] = useState<Record<number, number>>({});
  const [materialPool, setMaterialPool] = useState<ExecuteMaterialItem[]>([]);

  const [editForm, setEditForm] = useState({
    date: '',
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    productionBatchCode: '',
    executeStatus: '',
    materials: [] as ExecuteMaterialItem[]
  });

  const [addForm, setAddForm] = useState({
    code: '',
    date: todayLocal(),
    applicant: '',
    warehouseLocation: '仓库A区',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return materialExecuteDetails.filter(item => {
      if (searchCode && !item.code.toLowerCase().includes(searchCode.toLowerCase())) return false;
      if (searchApplicant && !item.applicant.toLowerCase().includes(searchApplicant.toLowerCase())) return false;
      if (searchBatchCode && !item.productionBatchCode.toLowerCase().includes(searchBatchCode.toLowerCase())) return false;
      if (searchWarehouse && !item.warehouseLocation.toLowerCase().includes(searchWarehouse.toLowerCase())) return false;
      if (statusFilter !== 'all' && item.executeStatus !== statusFilter) return false;
      return true;
    });
  }, [searchCode, searchApplicant, searchBatchCode, searchWarehouse, statusFilter]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // 回调函数
  const handleReset = () => {
    setSearchCode('');
    setSearchApplicant('');
    setSearchBatchCode('');
    setSearchWarehouse('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const toggleExpandRow = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) setSelectedRows([]);
    else setSelectedRows(filteredData.map(item => item.id));
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    else setSelectedRows([...selectedRows, id]);
  };

  const handleExportClick = () => setShowExportTypeModal(true);
  const handleCancelExport = () => { setExportMode(false); setSelectedRows([]); };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  return (
    <ExecuteTab
      searchCode={searchCode}
      searchApplicant={searchApplicant}
      searchBatchCode={searchBatchCode}
      searchWarehouse={searchWarehouse}
      statusFilter={statusFilter}
      currentPage={currentPage}
      pageSize={pageSize}
      selectedRows={selectedRows}
      expandedRows={expandedRows}
      exportMode={exportMode}
      setSearchCode={setSearchCode}
      setSearchApplicant={setSearchApplicant}
      setSearchBatchCode={setSearchBatchCode}
      setSearchWarehouse={setSearchWarehouse}
      setStatusFilter={setStatusFilter}
      setCurrentPage={setCurrentPage}
      setPageSize={setPageSize}
      setSelectedRows={setSelectedRows}
      setExpandedRows={setExpandedRows}
      setExportMode={setExportMode}
      showDetailModal={showDetailModal}
      showEditModal={showEditModal}
      showDeleteConfirm={showDeleteConfirm}
      showAddModal={showAddModal}
      showExportTypeModal={showExportTypeModal}
      setShowDetailModal={setShowDetailModal}
      setShowEditModal={setShowEditModal}
      setShowDeleteConfirm={setShowDeleteConfirm}
      setShowAddModal={setShowAddModal}
      setShowExportTypeModal={setShowExportTypeModal}
      selectedRecord={selectedRecord}
      setSelectedRecord={setSelectedRecord}
      deletingId={deletingId}
      setDeletingId={setDeletingId}
      batchEditMode={batchEditMode}
      setBatchEditMode={setBatchEditMode}
      showEditWarning={showEditWarning}
      setShowEditWarning={setShowEditWarning}
      showDeleteWarning={showDeleteWarning}
      setShowDeleteWarning={setShowDeleteWarning}
      showBatchEditModal={showBatchEditModal}
      setShowBatchEditModal={setShowBatchEditModal}
      showBatchDeleteConfirm={showBatchDeleteConfirm}
      setShowBatchDeleteConfirm={setShowBatchDeleteConfirm}
      editForm={editForm}
      setEditForm={setEditForm}
      addForm={addForm}
      setAddForm={setAddForm}
      exportFileType={exportFileType}
      setExportFileType={setExportFileType}
      selectedApplicationCode={selectedApplicationCode}
      setSelectedApplicationCode={setSelectedApplicationCode}
      selectedMaterialIndices={selectedMaterialIndices}
      setSelectedMaterialIndices={setSelectedMaterialIndices}
      materialActualQuantities={materialActualQuantities}
      setMaterialActualQuantities={setMaterialActualQuantities}
      materialPool={materialPool}
      setMaterialPool={setMaterialPool}
      onView={(item) => { setSelectedRecord(item); setShowDetailModal(true); }}
      onEdit={(item) => { setSelectedRecord(item); setEditForm({ date: item.date, applicant: item.applicant, warehouseLocation: item.warehouseLocation, reviewer: item.reviewer, productionBatchCode: item.productionBatchCode, executeStatus: item.executeStatus, materials: item.materials }); setShowEditModal(true); }}
      onDelete={(id) => { setDeletingId(id); setShowDeleteConfirm(true); }}
      onReset={handleReset}
      onToggleExpand={toggleExpandRow}
      onSelectAll={handleSelectAll}
      onSelectRow={handleSelectRow}
      onExportClick={handleExportClick}
      onCancelExport={handleCancelExport}
      onConfirmExport={() => { setShowExportTypeModal(false); setExportMode(false); setSelectedRows([]); }}
      onSaveEdit={() => setShowEditModal(false)}
      onCancelEdit={() => setShowEditModal(false)}
      onSaveAdd={() => setShowAddModal(false)}
      onCancelAdd={() => setShowAddModal(false)}
      onEditAddMaterial={() => setEditForm(prev => ({ ...prev, materials: [...prev.materials, { materialCode: '', materialName: '', batchNo: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }] }))}
      onEditRemoveMaterial={(index) => setEditForm(prev => ({ ...prev, materials: prev.materials.filter((_, i) => i !== index) }))}
      onEditMaterialChange={() => {}}
      onAddMaterial={() => setAddForm(prev => ({ ...prev, materials: [...prev.materials, { materialCode: '', materialName: '', batchNo: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }] }))}
      onRemoveMaterial={(index) => setAddForm(prev => ({ ...prev, materials: prev.materials.filter((_, i) => i !== index) }))}
      onMaterialChange={() => {}}
      onAddToMaterialPool={() => {}}
      onRemoveFromMaterialPool={() => {}}
      onUpdateMaterialPoolQuantity={() => {}}
      confirmDelete={confirmDelete}
      data={materialExecuteDetails}
      filteredData={filteredData}
      totalPages={totalPages}
      materialReceivingDetails={materialReceivingDetails}
    />
  );
};

export default MaterialReceivingPage;
