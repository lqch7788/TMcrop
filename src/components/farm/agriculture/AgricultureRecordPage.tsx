/**
 * 农事操作记录页面
 * 实现数据闭环：任务派发、临时任务、手动录入的操作记录统一展示
 * 支持折叠行展示子记录、来源筛选、进度列
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/table';
import {
  Leaf, Search, Plus, Download, ChevronDown, ChevronRight,
  X, Pencil, Trash2, Sprout, Droplets, AlertTriangle
} from 'lucide-react';
import { useOperationRecords, SOURCE_CONFIG, type FarmOperationRecord, type FarmOperationRecordChild } from '../../../hooks/useOperationRecords';
import { useTasks } from '../../../hooks/useTasks';
import { useTempTasks } from '../../../hooks/useTempTasks';
import { FARM_OPERATION_TYPES } from '../../../types/farm/common';
import { AddOperationRecordModal, ExportFormatModal, DeleteWarningModal } from './modals';
// 引入权限控制 Hook
import { useAuthPermission } from '../../../hooks/usePermission';

// ========== 引入组件（组件化重构） ==========
import {
  AgricultureRecordPageHeader,
  AgricultureRecordFilterToolbar,
  AgricultureRecordTableToolbar,
  AgricultureRecordPagination,
} from './components';

// ============================================
// 来源类型选项（从配置导入，供辅助函数使用）
// ============================================
const SOURCE_OPTIONS = Object.entries(SOURCE_CONFIG).map(([value, config]) => ({
  value: value as keyof typeof SOURCE_CONFIG,
  label: config.label,
}));

// ============================================
// 状态选项（供辅助函数使用）
// ============================================
const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待执行' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

// ============================================
// 操作类型选项（从类型定义导入，供辅助函数使用）
// ============================================
const TYPE_OPTIONS = [
  { value: '', label: '全部' },
  ...FARM_OPERATION_TYPES.map(t => ({ value: t.value, label: t.label })),
];

export default function AgricultureRecordPage() {
  // 使用统一操作记录 Hook
  const {
    records,
    setRecords,
    expandedIds,
    toggleChildren,
    getFilteredRecords,
  } = useOperationRecords();

  // 任务验收 Hook
  const { acceptTaskCompletion } = useTasks();
  // 临时任务验收 Hook
  const { acceptCompletion, rejectCompletion } = useTempTasks();

  // 权限检查 Hook - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  // PROC_FARM: 农事管理工序权限 - 已取消，直接设置为 true
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选状态
  const [filters, setFilters] = useState({
    sourceType: '' as '' | 'task' | 'tempTask' | 'manual' | 'inspection',
    operationType: '',
    status: '',
    greenhouseId: '',
    operatorId: '',
    dateFrom: '',
    dateTo: '',
    searchText: '',
  });

  // 批量选择状态
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 新增弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);

  // 筛选后的记录
  const filteredRecords = useMemo(() => {
    let result = getFilteredRecords({
      sourceType: filters.sourceType || undefined,
      status: filters.status || undefined,
      operationType: filters.operationType || undefined,
      greenhouseId: filters.greenhouseId || undefined,
      operatorId: filters.operatorId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    });

    // 搜索文本筛选
    if (filters.searchText) {
      const text = filters.searchText.toLowerCase();
      result = result.filter(r =>
        r.recordCode.toLowerCase().includes(text) ||
        r.cropName.toLowerCase().includes(text) ||
        r.greenhouseName.toLowerCase().includes(text) ||
        r.operatorName.toLowerCase().includes(text) ||
        (r.sourceCode && r.sourceCode.toLowerCase().includes(text))
      );
    }

    return result;
  }, [records, filters, getFilteredRecords]);

  // 分页记录
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 统计数据
  const stats = useMemo(() => {
    return {
      total: records.length,
      task: records.filter(r => r.sourceType === 'task').length,
      tempTask: records.filter(r => r.sourceType === 'tempTask').length,
      manual: records.filter(r => r.sourceType === 'manual').length,
    };
  }, [records]);

  // ============================================
  // 事件处理
  // ============================================

  // 重置筛选
  const handleReset = () => {
    setFilters({
      sourceType: '',
      operationType: '',
      status: '',
      greenhouseId: '',
      operatorId: '',
      dateFrom: '',
      dateTo: '',
      searchText: '',
    });
    setCurrentPage(1);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedRows.length === filteredRecords.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredRecords.map(r => r.id));
    }
  };

  // 选择行
  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(r => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 确认删除
  const handleConfirmDelete = () => {
    // 实际删除逻辑
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // 导出
  const handleExport = () => {
    setShowExportModal(true);
  };

  // 确认导出
  const handleConfirmExport = () => {
    // 实际导出逻辑
    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  // 验收通过记录
  const handleAcceptRecord = (record: FarmOperationRecord) => {
    if (!record.sourceId || !record.sourceType) {
      alert('该记录无法验收：缺少来源信息');
      return;
    }

    if (record.sourceType === 'task') {
      acceptTaskCompletion(record.sourceId);
    } else if (record.sourceType === 'tempTask') {
      acceptCompletion(record.sourceId);
    } else {
      alert('该类型记录不支持快速验收');
      return;
    }

    // 触发刷新 - 通过 setRecords 重新渲染组件
    setRecords(r => [...r]);
  };

  // 驳回记录
  const handleRejectRecord = (record: FarmOperationRecord) => {
    if (!record.sourceId || !record.sourceType) {
      alert('该记录无法驳回：缺少来源信息');
      return;
    }

    const reason = prompt('请输入驳回原因：');
    if (reason === null) return; // 用户取消

    if (record.sourceType === 'task') {
      // useTasks 暂未实现驳回方法，可后续扩展
      alert('任务驳回功能暂未实现，请在任务中心处理');
    } else if (record.sourceType === 'tempTask') {
      // 使用 hook 返回的 rejectCompletion
      rejectCompletion(record.sourceId, reason);
      // 触发刷新 - 通过 setRecords 重新渲染组件
      setRecords(r => [...r]);
    }
  };

  // ============================================
  // 辅助函数
  // ============================================

  // 获取操作类型标签
  const getOperationTypeLabel = (type: string) => {
    const found = FARM_OPERATION_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.label || status;
  };

  // 获取来源标签
  const getSourceLabel = (sourceType: string) => {
    return SOURCE_CONFIG[sourceType as keyof typeof SOURCE_CONFIG]?.label || sourceType;
  };

  // 获取来源颜色
  const getSourceColor = (sourceType: string) => {
    return SOURCE_CONFIG[sourceType as keyof typeof SOURCE_CONFIG]?.color || 'text-gray-600';
  };

  // 操作类型 Badge
  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'planting': 'bg-green-100 text-green-700',
      'irrigation': 'bg-blue-100 text-blue-700',
      'fertilization': 'bg-amber-100 text-amber-700',
      'pest_control': 'bg-red-100 text-red-700',
      'pruning': 'bg-purple-100 text-purple-700',
      'harvest': 'bg-orange-100 text-orange-700',
      'weeding': 'bg-emerald-100 text-emerald-700',
      'other': 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colors[type] || colors['other']}`}>
        {getOperationTypeLabel(type)}
      </span>
    );
  };

  // 状态 Badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'completed': { label: '已完成', className: 'bg-green-100 text-green-700' },
      'in_progress': { label: '进行中', className: 'bg-blue-100 text-blue-700' },
      'pending': { label: '待执行', className: 'bg-amber-100 text-amber-700' },
      'waiting_acceptance': { label: '待验收', className: 'bg-orange-100 text-orange-700' },
      'rejected': { label: '已驳回', className: 'bg-red-100 text-red-700' },
      'cancelled': { label: '已取消', className: 'bg-gray-100 text-gray-700' },
    };
    const s = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>;
  };

  // 进度条
  const getProgressBar = (progress?: number) => {
    if (progress === undefined) return <span className="text-gray-400">-</span>;
    const color = progress === 100 ? 'bg-green-500' : 'bg-blue-500';
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-gray-600">{progress}%</span>
      </div>
    );
  };

  // 渲染子记录
  const renderChildren = (children: FarmOperationRecordChild[]) => {
    return (
      <TableRow>
        <TableCell colSpan={12} className="px-4 py-0 bg-blue-50">
          <div className="py-2 pl-8 space-y-2">
            {children.map((child, index) => (
              <div key={child.id} className="flex items-start gap-4 text-sm">
                {/* 连接线 */}
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white" />
                  {index < children.length - 1 && <div className="w-0.5 h-8 bg-blue-200" />}
                </div>
                {/* 内容 */}
                <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-gray-500">{child.operationDate}</div>
                  <div className="col-span-1 text-gray-500">{child.time || '-'}</div>
                  <div className="col-span-2 font-medium text-gray-700">{child.operatorName}</div>
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {child.operationTypeName}
                    </span>
                    {child.area && <span className="ml-1 text-gray-500">({child.area})</span>}
                  </div>
                  <div className="col-span-2">{getProgressBar(child.progress)}</div>
                  <div className="col-span-1 text-gray-600">
                    {child.workload ? `${child.workload}${child.unit || ''}` : '-'}
                  </div>
                  <div className="col-span-2 text-gray-500 truncate" title={child.remarks || ''}>
                    {child.remarks || child.rejectReason || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AgricultureRecordPageHeader stats={stats} />

      {/* 筛选工具栏 */}
      <AgricultureRecordFilterToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        onAdd={() => setShowAddModal(true)}
        canCreate={canCreate}
      />

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 表头工具栏 */}
        <AgricultureRecordTableToolbar
          batchDeleteMode={batchDeleteMode}
          selectedRowsCount={selectedRows.length}
          onBatchDelete={() => setBatchDeleteMode(true)}
          onCancelBatchDelete={() => { setBatchDeleteMode(false); setSelectedRows([]); }}
          onExport={handleExport}
          canDelete={canDelete}
          canExport={canExport}
        />

        {/* 表格 */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow className="hover:bg-transparent">
                {batchDeleteMode && (
                  <TableHead className="py-3 text-center font-semibold text-white w-12">
                    <Input
                      type="checkbox"
                      checked={selectedRows.length === filteredRecords.length && filteredRecords.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white"
                    />
                  </TableHead>
                )}
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">操作单号</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">来源</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">来源编号</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">操作类型</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">作物/区域</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">操作人员</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">操作日期</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">进度</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">状态</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">备注</TableHead>
                <TableHead className="py-3 text-center font-semibold text-white whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={batchDeleteMode ? 12 : 11} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => (
                  <React.Fragment key={record.id}>
                    {/* 主记录行 */}
                    <TableRow className="hover:bg-blue-50 transition-colors">
                      {batchDeleteMode && (
                        <TableCell className="px-4 py-3 text-center">
                          <Input
                            type="checkbox"
                            checked={selectedRows.includes(record.id)}
                            onChange={() => handleSelectRow(record.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {record.children && record.children.length > 0 && (
                            <Button
                              onClick={() => toggleChildren(record.id)}
                              variant="ghost"
                              size="icon"
                            >
                              {expandedIds.has(record.id) ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                          )}
                          <span className="font-medium text-gray-900 text-sm">{record.recordCode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${getSourceColor(record.sourceType)}`}>
                          {getSourceLabel(record.sourceType)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-blue-600">
                        {record.sourceCode || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                        {getTypeBadge(record.operationType)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{record.cropName}</div>
                          <div className="text-gray-500 text-xs">{record.greenhouseName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-gray-900 whitespace-nowrap">
                        {record.operatorName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-gray-600 whitespace-nowrap">
                        {record.operationDate}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                        {getProgressBar(record.progress)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="text-sm text-gray-500 max-w-[150px] truncate" title={record.remarks || ''}>
                          {record.remarks || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {record.status === 'waiting_acceptance' && (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => handleAcceptRecord(record)}
                              variant="link"
                              size="sm"
                              className="text-green-600 hover:bg-green-50"
                              title="审核通过"
                            >
                              通过
                            </Button>
                            <Button
                              onClick={() => handleRejectRecord(record)}
                              variant="link"
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                              title="审核驳回"
                            >
                              驳回
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {/* 子记录行（折叠） */}
                    {record.children && record.children.length > 0 && expandedIds.has(record.id) && (
                      renderChildren(record.children)
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <AgricultureRecordPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={filteredRecords.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* 新增操作记录弹窗 */}
      <AddOperationRecordModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
