import { useState } from 'react';
import { Download, Banknote } from 'lucide-react';
import { SalaryTable } from './SalaryTable';
import { SalaryFilters } from './SalaryFilters';
import { SalarySlipModal } from './SalarySlipModal';
import { SalaryCalculateModal } from './SalaryCalculateModal';
import { SalaryExport } from './SalaryExport';
import { useSalary } from './hooks/useSalary';
import type { SalaryRecord, SalaryCalculateData } from './types';

/**
 * 工资管理页面容器
 */
export function SalaryPage() {
  const {
    data,
    total,
    pagination,
    filters,
    updateFilters,
    resetFilters,
    handlePageChange,
    handlePageSizeChange,
    calculateSalary,
  } = useSalary();

  // 详情弹窗状态
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    record: SalaryRecord | null;
  }>({
    open: false,
    record: null,
  });

  // 计算弹窗状态
  const [calculateModal, setCalculateModal] = useState<{
    open: boolean;
    record: SalaryRecord | null;
  }>({
    open: false,
    record: null,
  });

  // 导出弹窗状态
  const [exportModal, setExportModal] = useState<{
    open: boolean;
    record: SalaryRecord | null;
  }>({
    open: false,
    record: null,
  });

  // 查看详情
  const handleViewDetail = (record: SalaryRecord) => {
    setDetailModal({ open: true, record });
  };

  // 打开导出弹窗
  const handleExport = (record: SalaryRecord) => {
    setExportModal({ open: true, record });
  };

  // 打开计算弹窗
  const handleCalculate = (record: SalaryRecord) => {
    setCalculateModal({ open: true, record });
  };

  // 确认计算
  const handleCalculateConfirm = (record: SalaryRecord, data: SalaryCalculateData) => {
    const newSalary = calculateSalary(record, data);
    // 实际应用中这里会调用API更新数据
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">工资管理</h1>
            <p className="text-xs text-gray-500">管理员工工资、查看工资条</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <SalaryFilters filters={filters} onFilterChange={updateFilters} onReset={resetFilters} />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">待确认</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {data.filter((r) => r.status === '待确认').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">已确认</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {data.filter((r) => r.status === '已确认').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">已发放</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {data.filter((r) => r.status === '已发放').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">总记录数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
      </div>

      {/* 表格 */}
      <SalaryTable
        data={data}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onViewDetail={handleViewDetail}
        onCalculate={handleCalculate}
        onExport={handleExport}
      />

      {/* 工资条详情弹窗 */}
      <SalarySlipModal
        record={detailModal.record}
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, record: null })}
      />

      {/* 工资计算弹窗 */}
      <SalaryCalculateModal
        record={calculateModal.record}
        open={calculateModal.open}
        onClose={() => setCalculateModal({ open: false, record: null })}
        onConfirm={(data) => {
          if (calculateModal.record) {
            handleCalculateConfirm(calculateModal.record, data);
          }
        }}
      />

      {/* 工资条导出弹窗 */}
      <SalaryExport
        record={exportModal.record}
        open={exportModal.open}
        onClose={() => setExportModal({ open: false, record: null })}
      />
    </div>
  );
}
