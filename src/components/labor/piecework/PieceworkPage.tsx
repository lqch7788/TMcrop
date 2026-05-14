import React, { useState } from 'react';
import { Plus, Download, Filter, RefreshCw, Users, Package, Coins, Edit2, Trash2, Upload } from 'lucide-react';
import { usePiecework } from './hooks/usePiecework';
import { PieceworkTable } from './PieceworkTable';
import { PieceworkFormModal } from './PieceworkFormModal';
import { PieceworkBatchEditModal } from './PieceworkBatchEditModal';
import type { PieceRate, PieceworkFormData } from './types';
import { useTempWorkerStore } from '@/stores/useTempWorkerStore';
import { taskOptions } from './hooks/usePiecework';
import { Button } from '@/components/ui/button';

// 导出格式弹窗
interface ExportFormatModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onFormatChange: (format: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ExportFormatModal({ isOpen, exportFormat, selectedCount, onFormatChange, onClose, onConfirm }: ExportFormatModalProps) {
  if (!isOpen) return null;

  const exportFormats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
            <div className="space-y-3">
              {exportFormats.map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    exportFormat === format.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => onFormatChange(e.target.value)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{format.label}</p>
                    <p className="text-xs text-gray-500">{format.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button onClick={onConfirm}>导出</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 删除确认弹窗
interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteWarningModal({ isOpen, selectedCount, onClose, onConfirm }: DeleteWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">删除计件工资记录</h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-3 mb-6">
            <p>确定要删除选中的 <strong>{selectedCount}</strong> 条计件工资记录吗？</p>
            <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<PieceRate>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PieceRate | null>(null);

  // 打开详情弹窗
  const handleViewDetail = (record: PieceRate) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (record: PieceRate) => {
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  // 删除记录
  const handleDelete = (record: PieceRate) => {
    if (window.confirm(`确定要删除计件记录 "${record.workerName} - ${record.taskName}" 吗？`)) {
      // 删除逻辑
    }
  };

  // 关闭所有弹窗
  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setSelectedRecord(null);
  };

  // 提交新增
  const handleFormConfirm = (formData: PieceworkFormData) => {
    const workers = useTempWorkerStore.getState().workers;
    const worker = workers.find((w) => w.id === formData.workerId);
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

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map(r => r.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    setShowDeleteWarning(true);
  };

  const handleDeleteConfirm = () => {
    // 执行批量删除
    setSelectedRows([]);
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
  };

  // 导出
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
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
    const selectedData = data.filter(r => selectedRows.includes(r.id));
    const headers = ['日期', '员工', '任务', '单位', '数量', '单价', '合计', '状态'];
    const exportData = selectedData.map(row => ({
      '日期': row.workDate,
      '员工': row.workerName,
      '任务': row.taskName,
      '单位': row.unit,
      '数量': row.quantity,
      '单价': row.unitPrice.toFixed(2),
      '合计': row.total.toFixed(2),
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

    const fileName = `计件工资_${new Date().toISOString().slice(0, 10)}.${extension}`;
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

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">计件工资管理</h1>
              <p className="text-xs text-gray-500">管理临时工计件工资记录</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {}}
            >
              <Upload className="w-4 h-4" />
              导入
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportClick}
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4" />
              新建
            </Button>
          </div>
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
          <Button
            variant="ghost"
            onClick={resetFilters}
          >
            <RefreshCw className="w-3 h-3" />
            重置
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <PieceworkTable
          data={data}
          showCheckbox={exportMode || batchEditMode || batchDeleteMode}
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          selectedRows={selectedRows}
          onViewDetail={handleViewDetail}
          onEdit={handleEdit}
          onConfirm={handleConfirm}
          onDelete={handleDelete}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          onBatchEditClick={batchEditMode ? () => setShowBatchEditModal(true) : () => setBatchEditMode(true)}
          onBatchDeleteClick={batchDeleteMode ? handleBatchDelete : () => setBatchDeleteMode(true)}
          onBatchExportClick={exportMode ? handleConfirmExport : () => setExportMode(true)}
          onCancelBatch={handleCancelBatch}
          onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : () => setShowAddModal(true)}
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
            <Button
              variant="secondary"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              上一页
            </Button>
            <Button
              variant="secondary"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= Math.ceil(total / pagination.pageSize)}
            >
              下一页
            </Button>
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
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRecord(null);
                }}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteConfirm}
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
      <PieceworkBatchEditModal
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
        onConfirm={() => {
          setShowBatchEditModal(false);
          handleCancelBatch();
        }}
        onConfirmNext={() => {
          if (selectedRecordId && !editedRecordIds.includes(selectedRecordId)) {
            setEditedRecordIds([...editedRecordIds, selectedRecordId]);
          }
          const currentIndex = selectedRows.findIndex(r => r === selectedRecordId);
          const nextRecord = selectedRows[currentIndex + 1];
          if (nextRecord) {
            setSelectedRecordId(nextRecord);
          } else {
            setShowBatchEditModal(false);
            handleCancelBatch();
          }
        }}
      />
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