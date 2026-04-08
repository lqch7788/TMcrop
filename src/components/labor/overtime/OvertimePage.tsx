import { Clock } from 'lucide-react';
import { useOvertime } from './hooks/useOvertime';
import { OvertimeFilters } from './OvertimeFilters';
import { OvertimeTable } from './OvertimeTable';
import { OvertimeDetailModal } from './OvertimeDetailModal';
import { OvertimeFormModal } from './OvertimeFormModal';
import type { OvertimeRecord } from './types';

/**
 * 加班管理页面主容器组件
 */
export function OvertimePage() {
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
  } = useOvertime();

  // 处理查看详情
  const handleViewDetail = (record: OvertimeRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  // 处理新建
  const handleAdd = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  // 处理审批
  const handleApproveClick = (record: OvertimeRecord) => {
    if (record) {
      handleApprove(record);
    }
  };

  // 处理驳回
  const handleRejectClick = (record: OvertimeRecord) => {
    if (record) {
      handleReject(record);
    }
  };

  // 处理搜索
  const handleSearch = () => {
    // 搜索逻辑由 useOvertime hook 的筛选状态管理
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">加班管理</h1>
            <p className="text-xs text-gray-500">员工加班申请与审批管理</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">待审批</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {data.filter((r) => r.status === '待审批').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">已审批</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {data.filter((r) => r.status === '已审批').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">已驳回</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {data.filter((r) => r.status === '已驳回').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">总记录数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pagination.total}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <OvertimeFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />

      {/* 数据表格 */}
      <OvertimeTable
        data={data}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onViewDetail={handleViewDetail}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
      />

      {/* 详情弹窗 */}
      <OvertimeDetailModal
        record={selectedRecord}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
      />

      {/* 表单弹窗 */}
      <OvertimeFormModal
        record={selectedRecord}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export default OvertimePage;
