import { CalendarDays } from 'lucide-react';
import { useLeave } from './hooks/useLeave';
import { LeaveFilters } from './LeaveFilters';
import { LeaveTable } from './LeaveTable';
import { LeaveDetailModal } from './LeaveDetailModal';
import { LeaveFormModal } from './LeaveFormModal';
import { LeaveQuotaCard, getMockLeaveQuota } from './LeaveQuota';

/**
 * 请假管理页面主容器组件
 */
export function LeavePage() {
  const {
    data,
    filters,
    pagination,
    setFilters,
    setPage,
    setPageSize,
    selectedRecord,
    setSelectedRecord,
    isDetailOpen,
    setIsDetailOpen,
    isFormOpen,
    setIsFormOpen,
    handleSave,
    handleApprove,
    handleReject,
  } = useLeave();

  // 处理查看详情
  const handleViewDetail = (record: typeof selectedRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  // 处理新建
  const handleAdd = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  // 处理审批
  const handleApproveClick = (record: typeof selectedRecord) => {
    if (record) {
      handleApprove(record);
    }
  };

  // 处理驳回
  const handleRejectClick = (record: typeof selectedRecord) => {
    if (record) {
      handleReject(record);
    }
  };

  // 处理搜索
  const handleSearch = () => {
    // 搜索逻辑由 useLeave hook 的筛选状态管理
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">请假管理</h1>
            <p className="text-xs text-gray-500">员工请假申请与审批管理</p>
          </div>
        </div>
      </div>

      {/* 请假配额卡片 */}
      <LeaveQuotaCard quota={getMockLeaveQuota('S001', '张三')} />

      {/* 筛选栏 */}
      <LeaveFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />

      {/* 数据表格 */}
      <LeaveTable
        data={data}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onViewDetail={handleViewDetail}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
      />

      {/* 详情弹窗 */}
      <LeaveDetailModal
        record={selectedRecord}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
      />

      {/* 表单弹窗 */}
      <LeaveFormModal
        record={selectedRecord}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
