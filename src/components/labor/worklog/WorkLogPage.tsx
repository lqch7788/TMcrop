import { BookMarked } from 'lucide-react';
import { useWorkLog } from './hooks/useWorkLog';
import { WorkLogFilters } from './WorkLogFilters';
import { WorkLogTable } from './WorkLogTable';
import { WorkLogDetailModal } from './WorkLogDetailModal';
import { WorkLogFormModal } from './WorkLogFormModal';

/**
 * 工作日志页面主容器组件
 */
export function WorkLogPage() {
  const {
    data,
    filters,
    pagination,
    setFilters,
    setPage,
    setPageSize,
    selectedLog,
    setSelectedLog,
    isDetailOpen,
    setIsDetailOpen,
    isFormOpen,
    setIsFormOpen,
    handleSave,
  } = useWorkLog();

  // 处理查看详情
  const handleViewDetail = (log: typeof selectedLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  // 处理新建
  const handleAdd = () => {
    setSelectedLog(null);
    setIsFormOpen(true);
  };

  // 处理搜索
  const handleSearch = () => {
    // 实际项目中这里会根据筛选条件过滤数据
    // 搜索逻辑由 useWorkLog hook 的筛选状态管理
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">工作日志</h1>
            <p className="text-xs text-gray-500">工人每日工作记录与问题反馈</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <WorkLogFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />

      {/* 数据表格 */}
      <WorkLogTable
        data={data}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onViewDetail={handleViewDetail}
      />

      {/* 详情弹窗 */}
      <WorkLogDetailModal
        log={selectedLog}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* 表单弹窗 */}
      <WorkLogFormModal
        log={selectedLog}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
