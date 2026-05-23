// ============================================================
// 物料审批页面
// 文件路径：src/pages/MaterialApproval.tsx
// 功能：领料审批、退料审批、采购审批的统一管理
// 使用真实数据：从ApprovalContext获取
// ============================================================

import { useState } from 'react';
import { Package, CheckCircle, XCircle, Clock, ClipboardList } from 'lucide-react';
import { useMaterialApproval } from './hooks/useMaterialApproval';
import { Approval, ApprovalStatus } from '@/types/approval';
import { showConfirm } from '@/lib/dialogService';
import {
  MaterialApprovalFilters,
  MaterialApprovalTable,
  DetailModal,
  RejectModal
} from './components/MaterialApproval';
import { KpiCard, KpiCardGrid } from '@/components/summary';

export default function MaterialApproval() {
  const {
    stats,
    tabs,

    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    searchApplicant,
    setSearchApplicant,
    searchBatchCode,
    setSearchBatchCode,
    searchDepartment,
    setSearchDepartment,
    searchDateStart,
    setSearchDateStart,
    searchDateEnd,
    setSearchDateEnd,

    currentPage,
    setCurrentPage,
    totalPages,
    filteredData,
    paginatedData,

    expandedRows,
    toggleExpandRow,

    detailModal,
    handleViewDetail,
    handleCloseDetail,

    rejectModal,
    setRejectReason,
    handleRejectClick,
    handleConfirmReject,
    handleCancelReject,

    handleApprove,
    approve,
    reject,

    getCategoryByCode,
    getStatusBadge,
    getReturnStatusBadge,
    getReturnType,
    getCurrentData,
  } = useMaterialApproval();

  // 权限检查
  const canApprove = true;

  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 批量操作处理
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      const pendingIds = paginatedData
        .filter(d => d.status === ApprovalStatus.PENDING)
        .map(d => d.id);
      setSelectedIds(new Set(pendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    if (await showConfirm(`确定要批量通过 ${selectedIds.size} 项审批吗？`)) {
      selectedIds.forEach(id => approve(id));
      setSelectedIds(new Set());
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    if (await showConfirm(`确定要批量拒绝 ${selectedIds.size} 项审批吗？`)) {
      selectedIds.forEach(id => reject(id, '批量拒绝'));
      setSelectedIds(new Set());
    }
  };

  const handleExport = () => {
    if (selectedIds.size === 0) return;
    const selectedData = paginatedData.filter(d => selectedIds.has(d.id));
    const exportData = selectedData.map(d => ({
      单号: d.code,
      标题: d.title,
      申请人: d.applicantName,
      部门: d.applicantDepartment,
      申请时间: d.applyDate,
      状态: d.status
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `物料审批_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取待审批数据用于批量操作栏
  const pendingApprovals = getCurrentData.filter(d => d.status === ApprovalStatus.PENDING);

  // 重置筛选
  const handleReset = () => {
    setSearchTerm('');
    setSearchApplicant('');
    setSearchDepartment('全部');
    setSearchBatchCode('');
    setSearchDateStart('');
    setSearchDateEnd('');
    setStatusFilter('全部');
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">物料审批</h1>
              <p className="text-gray-500">领料、退料、采购审批流程管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <KpiCardGrid columns={4} compact>
        <KpiCard
          icon={<ClipboardList className="w-4 h-4 text-white" />}
          label="总申请数"
          value={stats.total}
          colorScheme="blue"
          compact
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-white" />}
          label="待审批"
          value={stats.pending}
          colorScheme="amber"
          compact
        />
        <KpiCard
          icon={<CheckCircle className="w-4 h-4 text-white" />}
          label="已通过"
          value={stats.approved}
          colorScheme="emerald"
          compact
        />
        <KpiCard
          icon={<XCircle className="w-4 h-4 text-white" />}
          label="已拒绝"
          value={stats.rejected}
          colorScheme="red"
          compact
        />
      </KpiCardGrid>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as typeof activeTab);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 筛选区域 */}
      <MaterialApprovalFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchApplicant={searchApplicant}
        setSearchApplicant={setSearchApplicant}
        searchBatchCode={searchBatchCode}
        setSearchBatchCode={setSearchBatchCode}
        searchDepartment={searchDepartment}
        setSearchDepartment={setSearchDepartment}
        searchDateStart={searchDateStart}
        setSearchDateStart={setSearchDateStart}
        searchDateEnd={searchDateEnd}
        setSearchDateEnd={setSearchDateEnd}
        onReset={handleReset}
      />

      {/* 数据表格 */}
      <MaterialApprovalTable
        paginatedData={paginatedData}
        filteredData={filteredData}
        tabs={tabs}
        activeTab={activeTab}
        expandedRows={expandedRows}
        currentPage={currentPage}
        totalPages={totalPages}
        canApprove={canApprove}
        setActiveTab={setActiveTab}
        setCurrentPage={setCurrentPage}
        toggleExpandRow={toggleExpandRow}
        handleViewDetail={handleViewDetail}
        handleRejectClick={handleRejectClick}
        approve={handleApprove}
        getStatusBadge={getStatusBadge}
        getReturnStatusBadge={getReturnStatusBadge}
        getReturnType={getReturnType}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onBatchApprove={handleBatchApprove}
        onBatchReject={handleBatchReject}
        onExport={handleExport}
      />

      {/* 详情弹窗 */}
      <DetailModal
        show={detailModal.show}
        item={detailModal.item}
        activeTab={activeTab}
        onClose={handleCloseDetail}
        onApprove={handleApprove}
        onRejectClick={handleRejectClick}
        getStatusBadge={getStatusBadge}
        getCategoryByCode={getCategoryByCode}
      />

      {/* 拒绝原因弹窗 */}
      <RejectModal
        show={rejectModal.show}
        item={rejectModal.item}
        reason={rejectModal.reason}
        onReasonChange={setRejectReason}
        onConfirm={handleConfirmReject}
        onCancel={handleCancelReject}
      />
    </div>
  );
}
