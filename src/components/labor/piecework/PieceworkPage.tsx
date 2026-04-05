import React, { useState } from 'react';
import { Plus, Download, Filter, RefreshCw, Users, Package, Coins } from 'lucide-react';
import { usePiecework } from './hooks/usePiecework';
import { PieceworkTable } from './PieceworkTable';
import { PieceworkFormModal } from './PieceworkFormModal';
import type { PieceRate, PieceworkFormData } from './types';
import { mockTempWorkers } from '../tempWorker/mockData';
import { taskOptions } from './hooks/usePiecework';

export const PieceworkPage: React.FC = () => {
  const {
    data,
    total,
    stats,
    pagination,
    filters,
    updateFilters,
    resetFilters,
    handlePageChange,
    handlePageSizeChange,
    addRecord,
    updateRecordStatus,
  } = usePiecework();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PieceRate | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 处理新增/编辑确认
  const handleFormConfirm = (formData: PieceworkFormData) => {
    const worker = mockTempWorkers.find((w) => w.id === formData.workerId);
    const task = taskOptions.find((t) => t.id === formData.taskId);

    if (!worker || !task) return;

    addRecord({
      workerId: formData.workerId,
      workerName: worker.name,
      taskId: formData.taskId,
      taskName: task.name,
      unit: formData.unit,
      quantity: formData.quantity,
      unitPrice: formData.unitPrice,
      workDate: formData.workDate,
      status: '待确认',
      creatorId: 'admin',
      creatorName: '管理员',
      remarks: formData.remarks,
    });

    setShowAddModal(false);
  };

  // 确认记录
  const handleConfirm = (record: PieceRate) => {
    updateRecordStatus(record.id, '已确认');
  };

  // 查看详情
  const handleViewDetail = (record: PieceRate) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  // 导出计件工资记录
  const handleExport = () => {
    const headers = ['日期', '员工', '任务', '单位', '数量', '单价', '合计', '状态'];
    const rows = data.map(item => [
      item.workDate,
      item.workerName,
      item.taskName,
      item.unit,
      item.quantity.toString(),
      item.unitPrice.toFixed(2),
      item.total.toFixed(2),
      item.status
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `计件工资_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">计件工资管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理临时工计件工资记录</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            新建计件
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="计件工人"
          value={stats.totalWorkers}
          color="blue"
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="总数量"
          value={stats.totalQuantity.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="总工资"
          value={`¥${stats.totalAmount.toLocaleString()}`}
          color="emerald"
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="人均工资"
          value={`¥${stats.avgAmountPerWorker.toFixed(2)}`}
          color="purple"
        />
      </div>

      {/* 筛选区域 */}
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">筛选条件</span>
          </div>
          <input
            type="text"
            placeholder="员工姓名"
            value={filters.workerName || ''}
            onChange={(e) => updateFilters({ workerName: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="任务名称"
            value={filters.taskName || ''}
            onChange={(e) => updateFilters({ taskName: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <input
            type="date"
            placeholder="开始日期"
            value={filters.startDate || ''}
            onChange={(e) => updateFilters({ startDate: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <input
            type="date"
            placeholder="结束日期"
            value={filters.endDate || ''}
            onChange={(e) => updateFilters({ endDate: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <select
            value={filters.status || ''}
            onChange={(e) => updateFilters({ status: e.target.value as PieceRate['status'] || undefined })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">全部状态</option>
            <option value="待确认">待确认</option>
            <option value="已确认">已确认</option>
            <option value="已发放">已发放</option>
          </select>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className="w-3 h-3" />
            重置
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <PieceworkTable
          data={data}
          onViewDetail={handleViewDetail}
          onConfirm={handleConfirm}
        />

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            共 {total} 条记录，第 {pagination.currentPage} / {Math.ceil(total / pagination.pageSize)} 页
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= Math.ceil(total / pagination.pageSize)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 新建/编辑弹窗 */}
      <PieceworkFormModal
        record={selectedRecord}
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedRecord(null);
        }}
        onConfirm={handleFormConfirm}
      />

      {/* 详情弹窗 */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">计件详情</h3>
            </div>
            <div className="p-4 space-y-3">
              <DetailRow label="员工" value={selectedRecord.workerName} />
              <DetailRow label="任务" value={selectedRecord.taskName} />
              <DetailRow label="单位" value={selectedRecord.unit} />
              <DetailRow label="数量" value={selectedRecord.quantity.toLocaleString()} />
              <DetailRow label="单价" value={`¥${selectedRecord.unitPrice.toFixed(2)}`} />
              <DetailRow label="合计" value={`¥${selectedRecord.total.toFixed(2)}`} className="text-emerald-600 font-semibold" />
              <DetailRow label="工作日期" value={selectedRecord.workDate} />
              <DetailRow label="状态" value={selectedRecord.status} />
              <DetailRow label="创建人" value={selectedRecord.creatorName} />
              <DetailRow label="创建时间" value={selectedRecord.createTime} />
              {selectedRecord.remarks && (
                <DetailRow label="备注" value={selectedRecord.remarks} />
              )}
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 统计卡片组件
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

// 详情行组件
const DetailRow: React.FC<{
  label: string;
  value: string;
  className?: string;
}> = ({ label, value, className = '' }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={`text-gray-900 ${className}`}>{value}</span>
  </div>
);

export default PieceworkPage;
