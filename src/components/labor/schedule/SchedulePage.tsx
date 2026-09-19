import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Calendar, CalendarDays, Clock, Download, List, Plus, Settings, Users, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { useSchedule } from './hooks/useSchedule';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ScheduleTable } from './ScheduleTable';
import { ShiftEditor } from './ShiftEditor';
import { SwapRequestModal } from './SwapRequestModal';
import { SwapRequestList } from './SwapRequestList';
import { ScheduleAddModal, ScheduleEditModal, CheckInModal, DeleteWarningModal, ExportFormatModal } from './modals';
import type { ScheduleRecord, ScheduleRecordLike } from './types';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { useScheduleStore } from '@/stores';

// 获取规范的员工名称（兼容 snake_case 与 camelCase）
function getStaffName(record: ScheduleRecordLike): string {
  return record.staffName || record.staff_name || '-';
}

// 获取规范的工作区域（兼容 snake_case 与 camelCase）
function getWorkZone(record: ScheduleRecordLike): string {
  return record.workZone || record.work_zone || '-';
}

export function SchedulePage() {
  const [searchParams] = useSearchParams();
  // URL 参数 teamId 用于过滤排班占用
  const teamIdFilter = searchParams.get('teamId') ?? undefined;

  const {
    scheduleList,
    shiftConfigs,
    staffList,
    swapRequests,
    selectedDate,
    viewMode,
    weekDateRange,
    monthDateRange,
    setSelectedDate,
    setViewMode,
    updateShiftConfig,
    addSchedule,
    deleteSchedule,
    cancelSchedule,
    submitSwapRequest,
    handleSwapRequest,
    // 2026-09-18 修复 C-8：订阅错误状态（此前页面完全不展示后端失败）
    error: scheduleError,
  } = useSchedule();

  // URL 参数 teamId：触发按班组过滤的排班占用拉取
  // 调用 store action（hook 未暴露 fetchOccupations，直接 getState 调用符合架构铁律）
  useEffect(() => {
    if (selectedDate) {
      void useScheduleStore.getState().fetchOccupations(selectedDate, teamIdFilter);
    }
  }, [selectedDate, teamIdFilter]);

  // UI状态
  const [showShiftEditor, setShowShiftEditor] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [displayMode, setDisplayMode] = useState<'calendar' | 'table'>('table');
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleRecord | null>(null);
  // 2026-09-14：签到/签退弹窗
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  // 2026-09-14：行尾发起调班时预填的 requester（ScheduleRecord）
  const [swapRequester, setSwapRequester] = useState<ScheduleRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // 批量操作状态（2026-09-15：移除批量编辑相关 state，仅保留删除/导出）
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  // 2026-09-15：调班申请独立的导出模式（与排班记录导出互不干扰，复用 ExportFormatModal）
  const [swapExportMode, setSwapExportMode] = useState(false);
  const [selectedSwapRows, setSelectedSwapRows] = useState<string[]>([]);
  // 2026-09-15：被调班过的排班，点击行尾「查看调班」图标 → 弹窗显示 swap_request 详情
  const [swapDetailRecord, setSwapDetailRecord] = useState<ScheduleRecord | null>(null);

  // 导出状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 处理排班点击（2026-09-15：行尾"编辑"按钮点击 → 打开单条编辑弹窗）
  const handleScheduleClick = (record: ScheduleRecord) => {
    setSelectedSchedule(record);
    setShowEditModal(true);
  };

  // 处理调班申请提交
  const handleSwapSubmit = async (data: {
    requesterId: string;
    requesterName: string;
    targetId: string;
    targetName: string;
    targetType: 'staff' | 'team';
    originalDate: string;
    targetDate: string;
    reason: string;
  }) => {
    try {
      await submitSwapRequest(data);
      showAlert('调班申请已提交');
    } catch (err) {
      showAlert(`提交调班申请失败：${(err as Error).message}`);
    }
  };

  // 取消排班（2026-09-19：先弹窗让用户确认，再执行；失败时提示）
  // 背景：此前点一下操作列的图标就立即取消，无二次确认，误触即改状态。
  const handleCancelSchedule = async (record: ScheduleRecord) => {
    const who = getStaffName(record);
    const ok = await showConfirm(
      `确定取消「${who} ${record.date} ${record.shift}」的排班吗？\n` +
      '取消后该排班状态变为「已取消」，记录仍保留，可通过编辑改回。',
    );
    if (!ok) return;
    try {
      await cancelSchedule(record.id);
    } catch (err) {
      showAlert(`取消排班失败：${(err as Error).message}`);
    }
  };

  // 处理调班申请审批（包一层 catch，请求失败时提示用户）
  const handleSwapRequestWithAlert = async (id: string, status: '已同意' | '已拒绝') => {
    try {
      await handleSwapRequest(id, status);
    } catch (err) {
      showAlert(`处理调班申请失败：${(err as Error).message}`);
    }
  };

  // 批量选择操作
  // 2026-09-19 修复 C2 / M13：作用域改为"表格当前筛选结果"（由 ScheduleTable 传入 ids），
  // 不再按整个 scheduleList（那样会选中被筛掉的、用户看不见的记录）。
  // 切换逻辑改为可加可减：该集合已全选则移除，否则并入（跨页累加不会互相覆盖）。
  const handleSelectAll = (ids: string[]) => {
    setSelectedRows(prev => {
      const allIn = ids.length > 0 && ids.every(id => prev.includes(id));
      return allIn ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]));
    });
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 2026-09-15：调班申请导出模式（与排班记录同套交互）
  // 2026-09-19 修复 C2 / M13：与 handleSelectAll 同样，作用域改为当前 tab 筛选结果
  const handleSelectAllSwap = (ids: string[]) => {
    setSelectedSwapRows(prev => {
      const allIn = ids.length > 0 && ids.every(id => prev.includes(id));
      return allIn ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]));
    });
  };

  const handleSelectRowSwap = (id: string) => {
    if (selectedSwapRows.includes(id)) {
      setSelectedSwapRows(selectedSwapRows.filter(rowId => rowId !== id));
    } else {
      setSelectedSwapRows([...selectedSwapRows, id]);
    }
  };

  const handleCancelSwapBatch = () => {
    setSwapExportMode(false);
    setSelectedSwapRows([]);
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  // 确认删除（批量操作，任一失败则提示并中止）
  const handleConfirmDelete = async () => {
    if (selectedRows.length === 0) return;
    // 删除选中项
    try {
      for (const id of selectedRows) {
        await deleteSchedule(id);
      }
    } catch (err) {
      showAlert(`删除排班失败：${(err as Error).message}`);
      return;
    }
    handleCancelBatch();
  };

  // 批量编辑相关处理（2026-09-15：已删除，编辑功能下沉到每行）
  // handleBatchEditClick / handleConfirmBatchEdit / handleConfirmNext 已移除

  // 确认导出（排班记录）
  const handleConfirmExport = () => {
    if (selectedRows.length === 0) return;
    handleDoExport();
  };

  // 2026-09-15：执行导出（排班记录）
  const handleDoExport = async () => {
    const selectedData = scheduleList.filter(s => selectedRows.includes(s.id));
    const headers = ['日期', '员工', '班次', '工作区域', '开始时间', '结束时间', '状态', '签到时间', '签退时间'];

    const exportData = selectedData.map(row => {
      const shiftConfig = shiftConfigs.find(c => c.name === row.shift);
      return {
        '日期': row.date,
        '员工': getStaffName(row),
        '班次': row.shift,
        '工作区域': getWorkZone(row),
        '开始时间': shiftConfig?.startTime || '',
        '结束时间': shiftConfig?.endTime || '',
        '状态': row.status,
        '签到时间': row.checkIn || '-',
        '签退时间': row.checkOut || '-',
      };
    });

    await doExport({
      exportData,
      headers,
      fileNamePrefix: '排班记录',
      onDone: () => {
        setShowExportModal(false);
        handleCancelBatch();
      },
    });
  };

  // 2026-09-15：调班申请导出（与排班记录走同一套格式选择/下载流程）
  const handleConfirmSwapExport = () => {
    if (selectedSwapRows.length === 0) return;
    handleDoSwapExport();
  };

  const handleDoSwapExport = async () => {
    const selectedData = swapRequests.filter(r => selectedSwapRows.includes(r.id));
    const headers = ['申请时间', '状态', '申请人', '调班对象', '原日期', '目标日期', '原因'];

    const exportData = selectedData.map(r => ({
      '申请时间': r.createTime,
      '状态': r.status,
      '申请人': r.requesterName,
      '调班对象': r.targetName,
      '原日期': r.originalDate,
      '目标日期': r.targetDate,
      '原因': r.reason || '',
    }));

    await doExport({
      exportData,
      headers,
      fileNamePrefix: '调班申请',
      onDone: () => {
        setShowExportModal(false);
        handleCancelSwapBatch();
      },
    });
  };

  /**
   * 通用导出函数（2026-09-15 提取）：排班记录与调班申请共用格式选择/下载逻辑
   * @param exportData - 已规范化的导出数据（属性名=表头）
   * @param headers - 列顺序（与 exportData 属性对应）
   * @param fileNamePrefix - 文件名前缀（如「排班记录」「调班申请」）
   * @param onDone - 下载完成后的回调（关闭弹窗、清空状态）
   */
  const doExport = async ({
    exportData,
    headers,
    fileNamePrefix,
    onDone,
  }: {
    exportData: Record<string, string | number>[];
    headers: string[];
    fileNamePrefix: string;
    onDone: () => void;
  }) => {
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `${fileNamePrefix}_${todayLocal()}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // 直接下载失败时，降级为 Blob 下载
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    onDone();
  };

  return (
    <div className="space-y-4">
      {/* 2026-09-18 修复 C-8：排班数据加载失败时展示错误横幅（此前静默失败，用户只看到空表格） */}
      {scheduleError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-red-800">排班数据加载失败</div>
            <div className="text-xs text-red-700 mt-0.5">{scheduleError}</div>
          </div>
        </div>
      )}

      {/* 页面标题 - 紧凑型标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">排班调度</h1>
            <p className="text-gray-500">员工排班管理与调班申请</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 - 淡彩底 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">今日排班</p>
              <p className="text-lg font-bold text-gray-800">
                {scheduleList.filter(s => s.date === todayLocal()).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">本周已执行</p>
              <p className="text-lg font-bold text-gray-800">
                {scheduleList.filter(s => s.status === '已执行' && weekDateRange.includes(s.date)).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">待调班申请</p>
              <p className="text-lg font-bold text-gray-800">
                {swapRequests.filter(r => r.status === '待审批').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <List className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">本月排班总数</p>
              <p className="text-lg font-bold text-gray-800">
                {scheduleList.filter(s => {
                  const date = new Date(s.date);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作栏 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* 左侧操作 */}
          <div className="flex items-center gap-2">
            <Button
              variant={displayMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('table')}
            >
              <List className="w-4 h-4" />
              表格视图
            </Button>
            <Button
              variant={displayMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('calendar')}
            >
              <CalendarDays className="w-4 h-4" />
              日历视图
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区（2026-09-14：单列布局，表格占满宽度） */}
      <div className="space-y-4">
        <div>
          {displayMode === 'calendar' ? (
            <ScheduleCalendar
              viewMode={viewMode}
              selectedDate={selectedDate}
              weekDateRange={weekDateRange}
              monthDateRange={monthDateRange}
              scheduleList={scheduleList}
              shiftConfigs={shiftConfigs}
              onDateChange={setSelectedDate}
              onViewModeChange={setViewMode}
              onScheduleClick={handleScheduleClick}
            />
          ) : (
            <>
              <ScheduleTable
                scheduleList={scheduleList}
                shiftConfigs={shiftConfigs}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onScheduleClick={handleScheduleClick}
                showCheckbox={exportMode || batchDeleteMode}
                exportMode={exportMode}
                batchDeleteMode={batchDeleteMode}
                selectedRows={selectedRows}
                onSelectAll={handleSelectAll}
                onSelectRow={handleSelectRow}
                onAddClick={() => setShowAddModal(true)}
                onExport={() => setExportMode(true)}
                onBatchDeleteClick={() => {
                  if (batchDeleteMode) {
                    // 在批量删除模式下，显示确认删除弹窗
                    setShowDeleteWarning(true);
                  } else {
                    // 进入批量删除模式
                    setBatchDeleteMode(true);
                  }
                }}
                onBatchExportClick={() => {
                  if (exportMode) {
                    // 在导出模式下，显示导出格式选择弹窗
                    if (selectedRows.length === 0) {
                      showAlert('请先选择要导出的数据');
                      return;
                    }
                    setShowExportModal(true);
                  } else {
                    // 进入导出模式
                    setExportMode(true);
                  }
                }}
                onCancelBatchDelete={handleCancelBatch}
                onCancelBatchExport={handleCancelBatch}
                // 2026-09-14：行尾操作列回调
                onCheckInClick={(record) => {
                  setSelectedSchedule(record);
                  setShowCheckInModal(true);
                }}
                onCancelRowClick={handleCancelSchedule}
                onSwapRowClick={(record) => {
                  // 2026-09-14：行尾发起调班，自动预填 requester = 当前员工
                  setSwapRequester(record);
                  setShowSwapModal(true);
                }}
                // 2026-09-15：被调班过的排班点击「查看调班详情」图标
                onShowSwapDetail={(record) => setSwapDetailRecord(record)}
                onShiftConfigClick={() => setShowShiftEditor(true)}
              />

              {/* 批量操作提示栏（2026-09-15：删除批量编辑相关文案） */}
              {(batchDeleteMode || exportMode) && (
                <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
                    {batchDeleteMode && '（确认删除选中的记录）'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelBatch}
                  >
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 2026-09-14：表格下方放调班申请列表（替代侧边栏） */}
        {displayMode === 'table' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">调班申请</h3>
              <span className="text-xs text-gray-500">
                {swapRequests.filter(r => r.status === '待审批').length} 待处理
              </span>
            </div>
            <SwapRequestList
              requests={swapRequests}
              onHandle={handleSwapRequestWithAlert}
              // 2026-09-15：与排班记录导出完全一致的受控模式
              exportMode={swapExportMode}
              selectedRows={selectedSwapRows}
              onSelectAll={handleSelectAllSwap}
              onSelectRow={handleSelectRowSwap}
              onEnterExportMode={() => {
                // 2026-09-19 修复 M7：进入导出模式不再预选全部（原为 swapRequests.map(...)，
                // 忽略当前 tab 筛选，导出的范围与用户所见不符）。与排班记录侧保持一致：
                // 从空选择开始，由用户用表头全选或逐行勾选。
                setSwapExportMode(true);
                setSelectedSwapRows([]);
              }}
              onConfirmExport={() => {
                if (selectedSwapRows.length === 0) {
                  showAlert('请先选择要导出的数据');
                  return;
                }
                setShowExportModal(true);
              }}
              onCancelExport={handleCancelSwapBatch}
            />
          </div>
        )}
      </div>

      {/* 模态框 */}
      <UnifiedModal
        isOpen={showShiftEditor}
        onClose={() => setShowShiftEditor(false)}
        title="班次设置"
        size="lg"
        showFooter={false}
      >
        <ShiftEditor
          shiftConfigs={shiftConfigs}
          onUpdateConfig={updateShiftConfig}
        />
      </UnifiedModal>

      {showSwapModal && (
        <SwapRequestModal
          staffList={staffList}
          initialRequester={swapRequester ? { id: swapRequester.staffId, name: swapRequester.staffName || '' } : null}
          onSubmit={handleSwapSubmit}
          onClose={() => { setShowSwapModal(false); setSwapRequester(null); }}
        />
      )}

      {/* 签到 / 签退弹窗（2026-09-14 新增） */}
      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        schedule={selectedSchedule}
      />

      {/* 新增排班弹窗（含个人/班组双模式，2026-09-13 重构） */}
      <ScheduleAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        staffList={staffList}
        shiftConfigs={shiftConfigs}
        defaultDate={selectedDate}
      />

      {/* 单条编辑弹窗（2026-09-15：行尾"编辑"按钮点击触发） */}
      <ScheduleEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        schedule={selectedSchedule}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={() => {
          handleConfirmDelete();
          setShowDeleteWarning(false);
        }}
      />

      {/* 2026-09-15：调班详情弹窗（从被调班过的排班点「查看调班」图标进入） */}
      <UnifiedModal
        isOpen={!!swapDetailRecord}
        onClose={() => setSwapDetailRecord(null)}
        title="调班详情"
        size="lg"
        showFooter={true}
        footer={(
          <Button variant="outline" size="sm" onClick={() => setSwapDetailRecord(null)}>
            <X className="w-4 h-4" /> 关闭
          </Button>
        )}
      >
        {swapDetailRecord && (() => {
          // 查找对应的 swap_request
          const swap = swapRequests.find(r => r.id === swapDetailRecord.swapRecordId);
          return (
            <div className="space-y-4 text-sm">
              {/* 当前排班（已被调班过的最新状态） */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="font-medium text-blue-800 mb-2">当前排班（调班生效后）</div>
                <div className="grid grid-cols-2 gap-2 text-blue-700">
                  <span>员工：{swapDetailRecord.staffName || swapDetailRecord.staffId}</span>
                  <span>班次：{swapDetailRecord.shift}</span>
                  <span>日期：{swapDetailRecord.date}</span>
                  <span>工作区域：{swapDetailRecord.workZone || '-'}</span>
                </div>
              </div>
              {swap ? (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                    <div className="font-medium text-orange-800 mb-2">调班审批信息</div>
                    <div className="grid grid-cols-2 gap-2 text-orange-700">
                      <span>申请人：{swap.requesterName}</span>
                      <span>调班对象：{swap.targetName}</span>
                      <span>原日期：{swap.originalDate}</span>
                      <span>目标日期：{swap.targetDate || '—'}</span>
                      <span>状态：{swap.status}</span>
                      <span>申请时间：{swap.createTime}</span>
                    </div>
                    {swap.reason && (
                      <div className="mt-2 text-orange-700">
                        <span className="font-medium">调班原因：</span>{swap.reason}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>💡 该排班（id: {swapDetailRecord.id}）因调班申请（id: {swap.id}）审批通过而发生变更。</p>
                  </div>
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-xs">
                  ⚠ 未找到对应的调班申请记录（id: {swapDetailRecord.swapRecordId}），可能已被清理。
                </div>
              )}
            </div>
          );
        })()}
      </UnifiedModal>

      {/* 导出格式选择弹窗（2026-09-15：onConfirm 根据当前导出模式路由到对应处理函数） */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={swapExportMode ? selectedSwapRows.length : selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={swapExportMode ? handleConfirmSwapExport : handleConfirmExport}
      />
    </div>
  );
}

export default SchedulePage;
