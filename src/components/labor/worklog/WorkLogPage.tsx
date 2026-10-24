import { useState, useMemo, useCallback, useEffect } from 'react';
import { Download, Edit2, Trash2, X } from 'lucide-react';

import { useWorkLogStore } from '@/stores/useWorkLogStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { WorkLogFilters } from './WorkLogFilters';
import { WorkLogTable } from './WorkLogTable';
import { WorkLogDetailModal } from './WorkLogDetailModal';
import { WorkLogFormModal } from './WorkLogFormModal';
import { WorkLogBatchEditModal } from './WorkLogBatchEditModal';
import type { WorkLog, WorkLogFilters as WorkLogFiltersType, PaginationInfo } from './types';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { Label } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

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

  const content = (
    <>
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {exportFormats.map((format) => (
          <Label
            key={format.value}
            onClick={() => onFormatChange(format.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${exportFormat === format.value ? 'border-emerald-600' : 'border-gray-400'}`}>
              {exportFormat === format.value && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </Label>
        ))}
      </div>
    </>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button onClick={onConfirm}><Download className="w-4 h-4" /> 导出</Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="选择导出格式" size="md" showFooter={true} footer={footer}>
      {content}
    </UnifiedModal>
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

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button variant="destructive" onClick={onConfirm}><Trash2 className="w-4 h-4" /> 确认删除</Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="删除工作日志警告" size="sm" showFooter={true} footer={footer}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <span className="text-red-600 text-2xl">!</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">删除工作日志警告</h3>
        </div>
      </div>
      <div className="text-sm text-gray-600 space-y-3">
        <p>确定要删除选中的 <strong>{selectedCount}</strong> 个工作日志吗？</p>
        <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
      </div>
    </UnifiedModal>
  );
}

/**
 * 我的工作日志页面主容器组件
 *
 * 2026-10-24：数据源从 usePersistentWorkLogs 改为 useWorkLogStore（后端 work_logs）。
 *   原实现读的是 INITIAL_WORK_LOGS 里的 7 条硬编码 mock，只在写操作时"双写"后端：
 *   新建的日志刷新即消失，且与农事任务中心读到的真实数据完全脱节。
 *   同时按当前登录用户过滤 —— 本 tab 名为「我的工作日志」。
 *   （测试阶段所有操作人统一是管理员陆启闯，所以过滤后仍能看到全部真实日志。）
 */
export function WorkLogPage() {
  const storeWorkLogs = useWorkLogStore((s) => s.workLogs);
  const fetchWorkLogs = useWorkLogStore((s) => s.fetchWorkLogs);
  const addWorkLogToStore = useWorkLogStore((s) => s.addWorkLog);
  const updateWorkLogInStore = useWorkLogStore((s) => s.updateWorkLog);
  const deleteWorkLogFromStore = useWorkLogStore((s) => s.deleteWorkLog);

  const currentUser = useAuthStore((s) => s.currentUser);
  const myName = currentUser?.realName || currentUser?.username || '';

  useEffect(() => {
    void fetchWorkLogs();
  }, [fetchWorkLogs]);

  // 只保留当前登录用户名下的日志；取不到用户时不过滤，避免页面空白
  const workLogs = useMemo(
    () => (myName ? storeWorkLogs.filter((log) => log.worker === myName) : storeWorkLogs),
    [storeWorkLogs, myName]
  );

  // 筛选条件状态
  const [filters, setFilters] = useState<WorkLogFiltersType>({
    date: '',
    worker: '',
    greenhouse: '',
  });

  // 分页状态（total 不存 state，由 filteredData.length 派生）
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });

  // 选中日志用于查看详情
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 表单弹窗状态
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 根据筛选条件过滤数据
  const filteredData = useMemo(() => {
    return workLogs.filter(log => {
      if (filters.date && log.date !== filters.date) return false;
      if (filters.worker && log.worker !== filters.worker) return false;
      if (filters.greenhouse && log.greenhouse !== filters.greenhouse) return false;
      return true;
    });
  }, [workLogs, filters]);

  // 分页后的数据
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination.currentPage, pagination.pageSize]);

  // 传给表格的分页信息
  // 2026-10-24：total 改为派生值 —— 原实现用 useMemo 在渲染期 setPagination，
  //   每次过滤结果变化都触发一次额外渲染，且 total 永远是上一轮的值。
  const tablePagination = useMemo(
    () => ({ currentPage: pagination.currentPage, pageSize: pagination.pageSize, total: filteredData.length }),
    [pagination.currentPage, pagination.pageSize, filteredData.length]
  );

  // 切换页码
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  // 切换每页条数
  const handlePageSizeChange = (size: number) => {
    setPagination(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  };

  // 保存工作日志（2026-10-24：改走 Store → 后端；新建时作业人默认当前用户）
  const handleSave = useCallback((data: Partial<WorkLog>) => {
    if (data.id) {
      void updateWorkLogInStore(String(data.id), data);
    } else {
      void addWorkLogToStore({ ...data, worker: data.worker || myName });
    }
    // 2026-10-24：对齐 V2.0 —— 保存成功后关闭表单弹窗（原先不关，需手动×）
    setIsFormOpen(false);
  }, [addWorkLogToStore, updateWorkLogInStore, myName]);

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedLogs, setEditedLogs] = useState<Record<string, Partial<WorkLog>>>({});

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

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(log => log.id));
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
    setBatchDeleteMode(false);
    setShowDeleteWarning(true);
  };

  const handleDeleteConfirm = () => {
    // 批量删除选中的日志
    selectedRows.forEach(id => void deleteWorkLogFromStore(String(id)));
    setSelectedRows([]);
    setShowDeleteWarning(false);
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
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = filteredData.filter(log => selectedRows.includes(log.id));
    const headers = ['日志编号', '日期', '工人', '天气', '温度', '作物', '大棚', '生长状况', '工作内容', '问题描述', '处理措施'];
    const exportData = selectedData.map(row => ({
      '日志编号': row.code,
      '日期': row.date,
      '工人': row.worker,
      '天气': row.weather,
      '温度': row.temperature,
      '作物': row.crop,
      '大棚': row.greenhouse,
      '生长状况': row.growthStatus,
      '工作内容': row.tasks,
      '问题描述': row.problems,
      '处理措施': row.solutions,
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

    const fileName = `工作日志_${todayLocal()}.${extension}`;
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
  };

  // 批量编辑
  const handleBatchEdit = () => {
    if (selectedRows.length === 0) return;
    setShowBatchEditModal(true);
  };

  const handleBatchEditConfirm = (edited: Record<string, Partial<WorkLog>>) => {
    // 2026-10-24：对齐 V2.0 WorkLogPage.vue handleBatchEditConfirm —— 按 id 逐条调
    //   updateWorkLog 落库；原先只关弹窗，点「发布」后编辑全部丢失
    Object.entries(edited).forEach(([id, updates]) => {
      void updateWorkLogInStore(String(id), updates);
    });
    setShowBatchEditModal(false);
    setEditedLogs({});
    setBatchEditMode(false);
    setSelectedRows([]);
  };

  return (
    <div className="space-y-6">
      {/* 筛选栏 */}
      <WorkLogFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
      />

      {/* 数据表格 */}
      <WorkLogTable
        data={paginatedData as WorkLog[]}
        pagination={tablePagination}
        showCheckbox={exportMode || batchEditMode || batchDeleteMode}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onViewDetail={handleViewDetail}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : handleAdd}
        onBatchEditClick={exportMode ? undefined : (batchEditMode ? handleBatchEdit : () => { setBatchEditMode(true); setSelectedRows([]); })}
        onBatchDeleteClick={exportMode ? undefined : (batchDeleteMode ? handleBatchDelete : () => { setBatchDeleteMode(true); setSelectedRows([]); })}
        onExportClick={batchEditMode || batchDeleteMode ? undefined : (exportMode ? handleConfirmExport : handleExportClick)}
      />

      {/* 批量操作提示栏 */}
      {(batchEditMode || batchDeleteMode || exportMode) && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="text-sm text-gray-600">
            已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
            {batchEditMode && '（点击批量编辑进入编辑模式）'}
            {batchDeleteMode && '（仅待执行状态可删除）'}
          </div>
          <div className="flex gap-2">
            {batchEditMode && (
              <>
                <Button
                  size="sm"
                  variant="blue"
                  onClick={handleBatchEdit}
                  disabled={selectedRows.length === 0}
                >
                  <Edit2 className="w-4 h-4" /> 批量编辑
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCancelBatch}
                >
                  <X className="w-4 h-4" /> 取消
                </Button>
              </>
            )}
            {batchDeleteMode && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={selectedRows.length === 0}
                >
                  <Trash2 className="w-4 h-4" /> 确认删除
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCancelBatch}
                >
                  <X className="w-4 h-4" /> 取消
                </Button>
              </>
            )}
            {exportMode && (
              <>
                <Button
                  size="sm"
                  onClick={handleConfirmExport}
                  disabled={selectedRows.length === 0}
                >
                  <Download className="w-4 h-4" /> 确认导出
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCancelExport}
                >
                  <X className="w-4 h-4" /> 取消
                </Button>
              </>
            )}
          </div>
        </div>
      )}

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
      <WorkLogBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        logs={filteredData}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleBatchEditConfirm}
      />
    </div>
  );
}
