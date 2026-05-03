import { useState } from 'react';
import { Download, Banknote, Plus } from 'lucide-react';
import { SalaryTable } from './SalaryTable';
import { SalaryFilters } from './SalaryFilters';
import { SalarySlipModal } from './SalarySlipModal';
import { SalaryCalculateModal } from './SalaryCalculateModal';
import { SalaryExport } from './SalaryExport';
import { SalaryFormModal } from './SalaryFormModal';
import { BatchEditModal, DeleteWarningModal, ExportFormatModal } from './modals';
import { useSalary } from './hooks/useSalary';
import { useAuthPermission } from '../../../hooks/usePermission';
import type { SalaryRecord, SalaryCalculateData } from './types';

/**
 * 工资管理页面容器
 */
export function SalaryPage() {
  // 权限检查 - 人工管理模块权限
  const { can } = useAuthPermission();
  const canCreate = can('PROC_LABOR', 'create');
  const canEdit = can('PROC_LABOR', 'edit');
  const canDelete = can('PROC_LABOR', 'delete');
  const canExport = can('PROC_LABOR', 'export');

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
    addSalaryRecord,
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

  // 新增弹窗状态
  const [addModal, setAddModal] = useState(false);

  // 批量选择状态
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // Batch Edit state
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<SalaryRecord>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // Batch Delete state
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

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

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map((r) => r.id));
    }
  };

  // 选择/取消选择单行
  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((r) => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 导出相关操作
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    const selectedData = data.filter(r => selectedRows.includes(r.id));
    const headers = ['工号', '姓名', '月份', '计算方式', '基本工资', '加班费', '奖金', '扣款', '实发工资', '状态'];
    const exportData = selectedData.map(row => ({
      '工号': row.staffId,
      '姓名': row.staffName,
      '月份': row.month,
      '计算方式': row.calcType,
      '基本工资': row.baseSalary.toFixed(2),
      '加班费': row.overtimePay.toFixed(2),
      '奖金': row.bonuses.toFixed(2),
      '扣款': (row.deductions + row.lateDeductions + row.absenceDeductions + row.socialSecurity + row.housingFund + row.personalTax).toFixed(2),
      '实发工资': row.netSalary.toFixed(2),
      '状态': row.status,
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `工资记录_${new Date().toISOString().slice(0, 10)}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  // 批量编辑操作
  const handleBatchEditClick = () => {
    setBatchEditMode(true);
  };

  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  const handleBatchEditConfirm = () => {
    setShowBatchEditModal(true);
  };

  const handleConfirmBatchEdit = () => {
    // Apply edits - in real app would update backend
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // 批量删除操作 - 点击"删除"按钮时进入批量选择模式
  const handleBatchDeleteClick = () => {
    setBatchDeleteMode(true);
  };

  // 点击"确认删除"按钮时显示警告弹窗
  const handleConfirmDelete = () => {
    if (selectedRows.length > 0) {
      setShowDeleteWarning(true);
    }
  };

  const handleConfirmBatchDelete = () => {
    // Delete selected records - in real app would update backend
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // 新增记录
  const handleAdd = (formData: Omit<SalaryRecord, 'id'>) => {
    addSalaryRecord(formData);
  };

  // 判断是否显示复选框
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">工资管理</h1>
              <p className="text-xs text-gray-500">管理员工工资、查看工资条</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canExport && (
              <button
                onClick={handleExportClick}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => setAddModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <SalaryFilters
        filters={filters}
        onFilterChange={updateFilters}
        onReset={resetFilters}
      />

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
        showCheckbox={showCheckbox}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onViewDetail={handleViewDetail}
        onCalculate={handleCalculate}
        onExport={handleExport}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onShowExportModal={() => setShowExportModal(true)}
        onBatchEditClick={handleBatchEditClick}
        onBatchDeleteClick={handleBatchDeleteClick}
        onBatchEditConfirm={handleBatchEditConfirm}
        onConfirmDelete={handleConfirmDelete}
        onCancelBatch={handleCancelBatch}
        onExportClick={handleExportClick}
        onAddClick={() => setAddModal(true)}
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

      {/* 新增弹窗 */}
      <SalaryFormModal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        onConfirm={handleAdd}
        title="新建工资记录"
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onFormatChange={setExportFormat}
        onConfirm={handleConfirmExport}
        onClose={() => setShowExportModal(false)}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={data}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleConfirmBatchEdit}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}