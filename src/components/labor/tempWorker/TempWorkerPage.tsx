import { Users, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTempWorker } from './hooks/useTempWorker';
import { TempWorkerFilters } from './TempWorkerFilters';
import { TempWorkerTable } from './TempWorkerTable';
import { TempWorkerDetailModal } from './TempWorkerDetailModal';
import { TempWorkerFormModal } from './TempWorkerFormModal';

/**
 * 临时工快速入职页面主容器组件
 */
export function TempWorkerPage() {
  const navigate = useNavigate();
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
    handleDelete,
  } = useTempWorker();

  // 处理查看详情
  const handleViewDetail = (record: typeof selectedRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  // 处理编辑
  const handleEdit = (record: typeof selectedRecord) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  };

  // 处理新建
  const handleAdd = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  // 处理搜索
  const handleSearch = () => {
    // 搜索逻辑由 useTempWorker hook 的筛选状态管理
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">临时工管理</h1>
              <p className="text-gray-500">临时工快速入职与信息管理</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/team')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <UsersRound className="w-5 h-5" />
            班组分配
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <TempWorkerFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />

      {/* 数据表格 */}
      <TempWorkerTable
        data={data}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 详情弹窗 */}
      <TempWorkerDetailModal
        record={selectedRecord}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* 表单弹窗 */}
      <TempWorkerFormModal
        record={selectedRecord}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
