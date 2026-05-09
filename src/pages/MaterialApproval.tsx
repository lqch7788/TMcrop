// ============================================================
// 物料审批页面
// 文件路径：src/pages/MaterialApproval.tsx
// 功能：领料审批、退料审批、采购审批的统一管理
// 使用真实数据：从ApprovalContext获取
// ============================================================

import { Package, CheckCircle, XCircle, Clock, ClipboardList } from 'lucide-react';
import { useMaterialApproval } from './hooks/useMaterialApproval';
import {
  MaterialApprovalFilters,
  MaterialApprovalTable,
  DetailModal,
  RejectModal
} from './components/MaterialApproval';

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

    getCategoryByCode,
    getStatusBadge,
    getReturnStatusBadge,
    getReturnType,
  } = useMaterialApproval();

  // 权限检查
  const canApprove = true;

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
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">物料审批</h1>
            <p className="text-gray-500">领料、退料、采购审批流程管理</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">总申请数</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-500">待审批</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-xs text-gray-500">已通过</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-xs text-gray-500">已拒绝</p>
            </div>
          </div>
        </div>
      </div>

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
