import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, Calculator, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBudget } from './hooks/useBudget';
import { BudgetChart } from './BudgetChart';
import { BudgetInputForm } from './BudgetInputForm';
import { BudgetTable } from './BudgetTable';
import { BudgetFormModal } from './BudgetFormModal';
import { BudgetBatchEditModal } from './BudgetBatchEditModal';
import { ExportFormatModal } from './ExportFormatModal';
import { DeleteWarningModal } from './DeleteWarningModal';
import type { BudgetWarning, MonthlyBudget } from './types';

export const BudgetPage: React.FC = () => {
  const {
    input,
    output,
    selectedYear,
    setSelectedYear,
    updateInput,
    resetInput,
  } = useBudget();

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<MonthlyBudget>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyBudget | null>(null);

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === output.monthlyBudget.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(output.monthlyBudget.map(m => m.month));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 查看详情
  const handleViewDetail = (record: MonthlyBudget) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  // 编辑记录
  const handleEdit = (record: MonthlyBudget) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  // 删除记录
  const handleDelete = (record: MonthlyBudget) => {
    if (window.confirm(`确定要删除 ${record.month} 的预算记录吗？`)) {
      // 删除逻辑
    }
  };

  // 批量编辑
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
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // 批量删除
  const handleBatchDeleteClick = () => {
    setBatchDeleteMode(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // 导出
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = output.monthlyBudget.filter(m => selectedRows.includes(m.month));
    const headers = ['月份', '总成本(万元)', '正式工(万元)', '临时工(万元)', '社保(万元)', '福利(万元)', '人数', '采收量(万斤)', '单位成本'];
    const exportData = selectedData.map(row => ({
      '月份': row.month,
      '总成本(万元)': (row.laborCost / 10000).toFixed(2),
      '正式工(万元)': (row.formalWorkerCost / 10000).toFixed(2),
      '临时工(万元)': (row.tempWorkerCost / 10000).toFixed(2),
      '社保(万元)': (row.socialSecurity / 10000).toFixed(2),
      '福利(万元)': (row.benefits / 10000).toFixed(2),
      '人数': row.headcount,
      '采收量(万斤)': (row.yieldPrediction / 10000).toFixed(2),
      '单位成本': `¥${row.costPerUnit.toFixed(2)}`,
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

    const fileName = `月度预算_${new Date().toISOString().slice(0, 10)}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 新增记录
  const handleAdd = (data: Omit<MonthlyBudget, 'costPerUnit'>) => {
    // 新增逻辑
    console.log('新增预算:', data);
  };

  // 编辑记录
  const handleUpdate = (data: Omit<MonthlyBudget, 'costPerUnit'>) => {
    // 更新逻辑
    console.log('更新预算:', data);
  };

  // 判断是否显示复选框
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;

  // 预警级别颜色
  const warningColors: Record<BudgetWarning['level'], string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    critical: 'bg-red-50 border-red-200 text-red-700',
  };

  const warningIcons: Record<BudgetWarning['level'], React.ReactNode> = {
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    critical: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">工资预算预测</h1>
              <p className="text-xs text-gray-500">基于种植批次计划的人工成本预算分析</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportClick}>
              <Download className="w-4 h-4" />
              导出
            </Button>
            <Button variant="default" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
          </div>
        </div>
      </div>

      {/* 预警信息 */}
      {output.warnings.length > 0 && (
        <div className="space-y-2">
          {output.warnings.map((warning, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${warningColors[warning.level]}`}
            >
              {warningIcons[warning.level]}
              <span className="text-sm">{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* 左侧：参数设置 */}
        <div className="col-span-1">
          <BudgetInputForm
            input={input}
            onUpdate={updateInput}
            onReset={resetInput}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>

        {/* 右侧：图表 */}
        <div className="col-span-2 space-y-4">
          <BudgetChart
            monthlyData={output.monthlyBudget}
            quarterlyData={output.quarterlyBudget}
          />
        </div>
      </div>

      {/* 年度汇总 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedYear}年度预算汇总</h3>
        <div className="grid grid-cols-5 gap-4">
          <SummaryCard
            label="年度总成本"
            value={`${(output.yearlyBudget.totalLaborCost / 10000).toFixed(2)}万元`}
            subValue={`¥${output.yearlyBudget.totalLaborCost.toLocaleString()}`}
            color="emerald"
          />
          <SummaryCard
            label="正式工成本"
            value={`${(output.yearlyBudget.formalWorkerCost / 10000).toFixed(2)}万元`}
            subValue={`占比${((output.yearlyBudget.formalWorkerCost / output.yearlyBudget.totalLaborCost) * 100).toFixed(1)}%`}
            color="blue"
          />
          <SummaryCard
            label="临时工成本"
            value={`${(output.yearlyBudget.tempWorkerCost / 10000).toFixed(2)}万元`}
            subValue={`占比${((output.yearlyBudget.tempWorkerCost / output.yearlyBudget.totalLaborCost) * 100).toFixed(1)}%`}
            color="amber"
          />
          <SummaryCard
            label="预计总采收量"
            value={`${(output.yearlyBudget.totalYield / 10000).toFixed(2)}万斤`}
            subValue={`人均${(output.yearlyBudget.totalYield / output.yearlyBudget.avgHeadcount).toFixed(0)}斤/人`}
            color="purple"
          />
          <SummaryCard
            label="平均单位成本"
            value={`¥${output.yearlyBudget.avgCostPerUnit.toFixed(2)}/斤`}
            subValue={`预警阈值${input.warningThreshold}%`}
            color="gray"
          />
        </div>

        {/* 季度分布 */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">季度成本分布</h4>
          <div className="grid grid-cols-4 gap-4">
            {output.quarterlyBudget.map((quarter) => (
              <div key={quarter.quarter} className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">{quarter.quarter}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {(quarter.laborCost / 10000).toFixed(2)}万元
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  用工{quarter.headcount}人 | 采收{quarter.yieldPrediction.toLocaleString()}斤
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 月度明细表 */}
      <BudgetTable
        data={output.monthlyBudget}
        showCheckbox={showCheckbox}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onBatchEditClick={batchEditMode ? () => setShowBatchEditModal(true) : () => setBatchEditMode(true)}
        onBatchDeleteClick={batchDeleteMode ? () => setShowDeleteWarning(true) : () => setBatchDeleteMode(true)}
        onBatchExportClick={exportMode ? handleConfirmExport : () => setExportMode(true)}
        onCancelBatch={handleCancelBatch}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : () => setShowAddModal(true)}
      />

      {/* 新增弹窗 */}
      <BudgetFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAdd}
        title="新建月度预算"
      />

      {/* 编辑弹窗 */}
      <BudgetFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecord(null);
        }}
        onConfirm={handleUpdate}
        title="编辑月度预算"
        editingRecord={editingRecord}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />

      {/* 批量编辑弹窗 */}
      <BudgetBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={output.monthlyBudget}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleBatchEditConfirm}
      />
    </div>
  );
};

// 汇总卡片组件
const SummaryCard: React.FC<{
  label: string;
  value: string;
  subValue: string;
  color: string;
}> = ({ label, value, subValue, color }) => {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]} mb-2`}>
        {label}
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subValue}</div>
    </div>
  );
};

export default BudgetPage;