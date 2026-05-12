import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Settings,
  Plus,
  List,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchedule } from './hooks/useSchedule';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ScheduleTable } from './ScheduleTable';
import { ShiftEditor } from './ShiftEditor';
import { SwapRequestModal, SwapRequestList } from './SwapRequestModal';
import { ScheduleAddModal, ScheduleBatchEditModal, DeleteWarningModal, ExportFormatModal } from './modals';
import type { ScheduleRecord, ShiftType, Staff } from './types';

// 模拟员工列表
const MOCK_STAFF: Staff[] = [
  { id: 'S001', name: '张三', workZone: 'A区' },
  { id: 'S002', name: '李四', workZone: 'B区' },
  { id: 'S003', name: '王五', workZone: 'A区' },
  { id: 'S004', name: '赵六', workZone: 'C区' },
  { id: 'S005', name: '钱七', workZone: 'B区' },
  { id: 'S006', name: '孙八', workZone: 'A区' },
  { id: 'S007', name: '周九', workZone: 'C区' },
  { id: 'S008', name: '吴十', workZone: 'B区' },
];

export function SchedulePage() {
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
    cancelSchedule,
    submitSwapRequest,
    handleSwapRequest,
  } = useSchedule();

  // UI状态
  const [showShiftEditor, setShowShiftEditor] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [displayMode, setDisplayMode] = useState<'calendar' | 'table'>('calendar');
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // 批量编辑状态
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<ScheduleRecord>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 导出状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 新排班表单状态
  const [newSchedule, setNewSchedule] = useState({
    staffId: '',
    staffName: '',
    date: '',
    shift: '早班' as ShiftType,
    workZone: '',
  });

  // 处理排班点击
  const handleScheduleClick = (record: ScheduleRecord) => {
    setSelectedSchedule(record);
  };

  // 处理添加排班
  const handleAddSchedule = () => {
    if (!newSchedule.staffId || !newSchedule.date) {
      alert('请选择员工和日期');
      return;
    }
    const staff = MOCK_STAFF.find(s => s.id === newSchedule.staffId);
    if (staff) {
      addSchedule({
        ...newSchedule,
        staffName: staff.name,
        status: '已排班',
      });
      setShowAddModal(false);
      setNewSchedule({ staffId: '', staffName: '', date: '', shift: '早班', workZone: '' });
    }
  };

  // 处理调班申请提交
  const handleSwapSubmit = (data: {
    requesterId: string;
    requesterName: string;
    targetId: string;
    targetName: string;
    originalDate: string;
    targetDate: string;
    reason: string;
  }) => {
    submitSwapRequest(data);
  };

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === scheduleList.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(scheduleList.map(r => r.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  // 确认删除
  const handleConfirmDelete = () => {
    if (selectedRows.length === 0) return;
    // 删除选中项
    selectedRows.forEach(id => {
      cancelSchedule(id);
    });
    handleCancelBatch();
  };

  // 批量编辑相关处理
  const handleBatchEditClick = () => {
    if (batchEditMode) {
      // 已经在批量编辑模式，打开批量编辑弹窗
      setShowBatchEditModal(true);
    } else {
      // 进入批量编辑模式
      setBatchEditMode(true);
    }
  };

  const handleConfirmBatchEdit = () => {
    // 保存编辑结果
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // 确认（下一个）- 保存当前记录并选择下一条
  const handleConfirmNext = () => {
    // 将当前记录标记为已编辑
    if (selectedRecordId && !editedRecordIds.includes(selectedRecordId)) {
      setEditedRecordIds([...editedRecordIds, selectedRecordId]);
    }

    // 找到下一条未编辑的记录
    const selectedRecords = selectedRows.map(id => scheduleList.find(r => r.id === id)).filter(Boolean) as ScheduleRecord[];
    const currentIndex = selectedRecords.findIndex(r => r.id.toString() === selectedRecordId);
    const nextUneditedRecord = selectedRecords.find((r, idx) => {
      return idx > currentIndex && !editedRecordIds.includes(r.id.toString());
    });

    if (nextUneditedRecord) {
      // 选择下一条未编辑的记录
      setSelectedRecordId(nextUneditedRecord.id.toString());
    } else {
      // 如果没有更多未编辑的记录，关闭弹窗
      setShowBatchEditModal(false);
      setBatchEditMode(false);
      setSelectedRows([]);
      setEditedRecordIds([]);
      setEditedRecords({});
      setSelectedRecordId('');
    }
  };

  // 确认导出
  const handleConfirmExport = () => {
    if (selectedRows.length === 0) return;
    handleDoExport();
  };

  // 执行导出
  const handleDoExport = async () => {
    const selectedData = scheduleList.filter(s => selectedRows.includes(s.id));
    const headers = ['日期', '员工', '班次', '工作区域', '开始时间', '结束时间', '状态', '签到时间', '签退时间'];

    const exportData = selectedData.map(row => {
      const shiftConfig = shiftConfigs.find(c => c.name === row.shift);
      return {
        '日期': row.date,
        '员工': row.staffName,
        '班次': row.shift,
        '工作区域': row.workZone,
        '开始时间': shiftConfig?.startTime || '',
        '结束时间': shiftConfig?.endTime || '',
        '状态': row.status,
        '签到时间': row.checkIn || '-',
        '签退时间': row.checkOut || '-',
      };
    });

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

    const fileName = `排班记录_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
    } catch (err) {
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportModal(false);
    handleCancelBatch();
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">排班调度中心</h1>
            <p className="text-xs text-gray-500">管理员工排班、班次设置和调班申请</p>
          </div>
        </div>
      </div>

      {/* 快捷操作栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* 左侧操作 */}
          <div className="flex items-center gap-2">
            <Button
              variant={displayMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('calendar')}
            >
              <CalendarDays className="w-4 h-4" />
              日历视图
            </Button>
            <Button
              variant={displayMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('table')}
            >
              <List className="w-4 h-4" />
              表格视图
            </Button>
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSwapModal(true)}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Users className="w-4 h-4" />
              调班申请
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShiftEditor(true)}
            >
              <Settings className="w-4 h-4" />
              班次设置
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4" />
              新增排班
            </Button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日排班</p>
              <p className="text-xl font-bold text-gray-800">
                {scheduleList.filter(s => s.date === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">本周已执行</p>
              <p className="text-xl font-bold text-gray-800">
                {scheduleList.filter(s => s.status === '已执行' && weekDateRange.includes(s.date)).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待调班申请</p>
              <p className="text-xl font-bold text-gray-800">
                {swapRequests.filter(r => r.status === '待审批').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <List className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">本月排班总数</p>
              <p className="text-xl font-bold text-gray-800">
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

      {/* 主内容区 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 日历/表格视图 */}
        <div className="col-span-2">
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
                onScheduleClick={handleScheduleClick}
                showCheckbox={exportMode || batchEditMode || batchDeleteMode}
                exportMode={exportMode}
                batchEditMode={batchEditMode}
                batchDeleteMode={batchDeleteMode}
                selectedRows={selectedRows}
                onSelectAll={handleSelectAll}
                onSelectRow={handleSelectRow}
                onAddClick={() => setShowAddModal(true)}
                onBatchEditClick={handleBatchEditClick}
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
                      alert('请先选择要导出的数据');
                      return;
                    }
                    setShowExportModal(true);
                  } else {
                    // 进入导出模式
                    setExportMode(true);
                  }
                }}
                onCancelBatchEdit={handleCancelBatch}
                onCancelBatchDelete={handleCancelBatch}
              />

              {/* 批量操作提示栏 */}
              {(batchEditMode || batchDeleteMode || exportMode) && (
                <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
                    {batchEditMode && '（点击批量编辑进入编辑模式）'}
                    {batchDeleteMode && '（确认删除选中的记录）'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelBatch}
                  >
                    取消
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 排班详情 */}
          {selectedSchedule && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-800 mb-3">排班详情</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">员工:</span>
                  <span className="font-medium text-gray-800">{selectedSchedule.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">日期:</span>
                  <span className="text-gray-800">{selectedSchedule.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">班次:</span>
                  <span className="font-medium text-gray-800">{selectedSchedule.shift}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">工作区:</span>
                  <span className="text-gray-800">{selectedSchedule.workZone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">状态:</span>
                  <span className={`
                    px-2 py-0.5 rounded text-xs
                    ${selectedSchedule.status === '已排班' ? 'bg-blue-100 text-blue-700' : ''}
                    ${selectedSchedule.status === '已执行' ? 'bg-green-100 text-green-700' : ''}
                    ${selectedSchedule.status === '已取消' ? 'bg-gray-100 text-gray-600' : ''}
                  `}>
                    {selectedSchedule.status}
                  </span>
                </div>
                {selectedSchedule.checkIn && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">签到:</span>
                    <span className="text-green-600">{selectedSchedule.checkIn}</span>
                  </div>
                )}
                {selectedSchedule.checkOut && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">签退:</span>
                    <span className="text-red-600">{selectedSchedule.checkOut}</span>
                  </div>
                )}
              </div>
              {selectedSchedule.status === '已排班' && (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelSchedule(selectedSchedule.id)}
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    取消排班
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 调班申请列表 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800">调班申请</h3>
              <span className="text-xs text-gray-500">
                {swapRequests.filter(r => r.status === '待审批').length} 待处理
              </span>
            </div>
            <SwapRequestList
              requests={swapRequests}
              onHandle={handleSwapRequest}
            />
          </div>

          {/* 班次图例 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium text-gray-800 mb-3">班次图例</h3>
            <div className="space-y-2">
              {shiftConfigs.map(config => (
                <div key={config.name} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${config.color}`} />
                  <span className="text-sm text-gray-600">{config.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {config.startTime}-{config.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 模态框 */}
      {showShiftEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ShiftEditor
            shiftConfigs={shiftConfigs}
            onUpdateConfig={updateShiftConfig}
            onClose={() => setShowShiftEditor(false)}
          />
        </div>
      )}

      {showSwapModal && (
        <SwapRequestModal
          staffList={MOCK_STAFF}
          onSubmit={handleSwapSubmit}
          onClose={() => setShowSwapModal(false)}
        />
      )}

      {/* 新增排班弹窗 */}
      <ScheduleAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSchedule}
        formData={newSchedule}
        staffList={MOCK_STAFF}
        shiftConfigs={shiftConfigs}
        onFormChange={(field, value) => setNewSchedule(prev => ({ ...prev, [field]: value }))}
      />

      {/* 批量编辑弹窗 */}
      <ScheduleBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={scheduleList}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleConfirmBatchEdit}
        onConfirmNext={handleConfirmNext}
        shiftConfigs={shiftConfigs}
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

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />
    </div>
  );
}

export default SchedulePage;
