/**
 * 工人考勤 - 页面容器组件
 * 负责组合所有子组件，提供统一的页面结构
 * 排班对比：读取排班数据，展示计划出勤 vs 实际打卡对比
 */
import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useWorkerAttendance } from './hooks/useWorkerAttendance';
import { WorkerAttendanceFilters } from './WorkerAttendanceFilters';
import { WorkerAttendanceTable } from './WorkerAttendanceTable';
import { WorkerAttendanceExport } from './WorkerAttendanceExport';
import { BatchEditModal, DeleteWarningModal, ExportFormatModal, DetailModal } from './modals';
import { AttendanceRecord } from './types';
import { useDepartmentStore, useAttendanceStore, useScheduleStore } from '../../../stores';
import { todayLocal } from '../../../lib/dateUtils';

// 编辑记录的类型
type EditedRecordsMap = Record<string, Partial<AttendanceRecord>>;

export function WorkerAttendancePage() {
  const {
    // 数据
    filters,
    pagination,
    exportMode,
    selectedRows,
    exportFormat,
    showExportModal,

    // 导出数据
    filteredData,
    paginatedData,
    totalPages,

    // 操作方法
    setFilters,
    setPagination,
    setExportMode,
    setExportFormat,
    setShowExportModal,
    setSelectedRows,

    // 选择操作
    handleSelectAll,
    handleSelectRow,

    // 导出操作
    handleExportClick,
    handleCancelExport,
    handleConfirmExport,
  } = useWorkerAttendance();

  // Batch Edit state
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<EditedRecordsMap>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // Batch Delete state
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // Detail modal state
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Data state for local editing
  const [attendanceData, setAttendanceData] = useState(filteredData);

  // 从Zustand store获取部门列表
  const departments = useDepartmentStore((state) => state.departments);
  const loadDepartments = useDepartmentStore((state) => state.loadDepartments);

  useEffect(() => {
    if (departments.length === 0) {
      loadDepartments();
    }
  }, [departments.length, loadDepartments]);

  // 转换为页面需要的格式（包含"全部"选项）
  const departmentOptions = ['全部', ...departments.map(d => d.name)];

  // ========== 排班对比数据（从农事管理模块读取排班，只读对比） ==========
  const scheduleStore = useScheduleStore();
  const todayStr = todayLocal();

  useEffect(() => {
    if (scheduleStore.schedules.length === 0) {
      scheduleStore.fetchSchedules();
    }
  }, []);

  // 计算今日排班 vs 考勤对比
  const scheduleComparison = useMemo(() => {
    const todaySchedules = scheduleStore.schedules.filter(s => s.date === todayStr);
    const scheduledIds = new Set(todaySchedules.map(s => s.staffId));
    const todayAttendance = attendanceData.filter(r => r.date === todayStr);
    const checkedInIds = new Set(todayAttendance.filter(r => r.checkIn).map(r => r.workerId));

    // 在班人数（有排班的）
    const scheduledCount = scheduledIds.size;
    // 已打卡人数
    const checkedInCount = todayAttendance.filter(r => r.checkIn).length;
    // 排班但未打卡（缺勤）
    const absentCount = [...scheduledIds].filter(id => !checkedInIds.has(id)).length;
    // 未排班但打卡（临时到岗）
    const unscheduledCount = todayAttendance.filter(r => r.checkIn && !scheduledIds.has(r.workerId)).length;

    return { scheduledCount, checkedInCount, absentCount, unscheduledCount };
  }, [scheduleStore.schedules, attendanceData, todayStr]);

  // Batch Edit handlers
  const handleBatchEditClick = () => {
    if (selectedRows.length === 0) return;
    setBatchEditMode(true);
  };

  // 当批量编辑弹窗打开时，自动选中第一条记录
  const openBatchEditModal = () => {
    if (selectedRows.length === 0) return;
    setShowBatchEditModal(true);
    // 自动选中第一条选中的记录
    const firstRecord = filteredData.find(r => selectedRows.includes(r.id));
    if (firstRecord) {
      setSelectedRecordId(firstRecord.id.toString());
    }
  };

  const handleCancelBatchEdit = () => {
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  const handleConfirmBatchEdit = () => {
    // 应用所有编辑到 Store（乐观更新）
    const updateAttendance = useAttendanceStore.getState().updateAttendance;
    Object.entries(editedRecords).forEach(([id, updates]) => {
      updateAttendance(id, updates);
    });
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // 确认（下一个）- 保存当前记录并选择下一条
  const handleConfirmNext = () => {
    // 保存当前编辑到 Store
    if (selectedRecordId && editedRecords[selectedRecordId]) {
      useAttendanceStore.getState().updateAttendance(selectedRecordId, editedRecords[selectedRecordId]);
    }
    // 将当前记录标记为已编辑
    if (selectedRecordId && !editedRecordIds.includes(selectedRecordId)) {
      setEditedRecordIds([...editedRecordIds, selectedRecordId]);
    }

    // selectedRows 是记录ID数组，需通过ID查找记录
    const selectedRecords = selectedRows
      .map(id => filteredData.find(r => r.id === id))
      .filter(Boolean) as AttendanceRecord[];
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

  // Detail view handler
  const handleViewDetail = (record: AttendanceRecord) => {
    setDetailRecord(record);
    setShowDetailModal(true);
  };

  // Batch Delete handlers
  const handleBatchDeleteClick = () => {
    if (selectedRows.length === 0) return;
    setBatchDeleteMode(true);
  };

  const handleCancelBatchDelete = () => {
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleConfirmBatchDelete = () => {
    // Delete selected records - in real app would update backend
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setPagination({ currentPage: page });
  };

  // 处理每页条数变化
  const handlePageSizeChange = (size: number) => {
    setPagination({ pageSize: size, currentPage: 1 });
  };

  // 处理确认导出（带模态框）
  const handleConfirmWithModal = () => {
    handleConfirmExport();
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  return (
    <div className="space-y-6">
      {/* 今日排班对比卡片（数据来自农事管理-排班调度） */}
      <div className="bg-white rounded-lg p-3 border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">今日排班对比（{todayStr}）</span>
          <span className="text-xs text-gray-400">数据来源：农事管理 → 排班调度</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">计划在班</span>
            </div>
            <div className="text-lg font-bold text-blue-700">{scheduleComparison.scheduledCount}<span className="text-xs font-normal text-blue-500 ml-1">人</span></div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-600 font-medium">已打卡</span>
            </div>
            <div className="text-lg font-bold text-emerald-700">{scheduleComparison.checkedInCount}<span className="text-xs font-normal text-emerald-500 ml-1">人</span></div>
          </div>
          <div className="bg-red-50 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600 font-medium">排班缺勤</span>
            </div>
            <div className="text-lg font-bold text-red-700">{scheduleComparison.absentCount}<span className="text-xs font-normal text-red-500 ml-1">人</span></div>
          </div>
          <div className="bg-amber-50 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600 font-medium">临时到岗</span>
            </div>
            <div className="text-lg font-bold text-amber-700">{scheduleComparison.unscheduledCount}<span className="text-xs font-normal text-amber-500 ml-1">人</span></div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <WorkerAttendanceFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* 考勤表格 */}
      <WorkerAttendanceTable
        data={paginatedData}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalCount={filteredData.length}
        totalPages={totalPages}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onShowExportModal={() => setShowExportModal(true)}
        onBatchEditClick={() => {
          if (batchEditMode) {
            // 在批量编辑模式下，打开批量编辑弹窗（自动选中第一条）
            openBatchEditModal();
          } else {
            // 进入批量编辑模式
            setBatchEditMode(true);
          }
        }}
        onBatchDeleteClick={() => {
          if (batchDeleteMode) {
            // 在批量删除模式下，确认删除
            setShowDeleteWarning(true);
          } else {
            // 进入批量删除模式
            setBatchDeleteMode(true);
          }
        }}
        onExportClick={() => {
          if (exportMode) {
            // 在导出模式下
            if (selectedRows.length === 0) {
              // 没有选中时，取消导出模式
              handleCancelBatch();
            } else {
              // 有选中时，显示导出格式选择弹窗
              setShowExportModal(true);
            }
          } else {
            // 进入导出模式
            handleExportClick();
          }
        }}
        onCancelBatchEdit={handleCancelBatchEdit}
        onCancelBatchDelete={handleCancelBatchDelete}
        onViewDetail={handleViewDetail}
      />

      {/* 批量操作提示栏 */}
      {(batchEditMode || batchDeleteMode || exportMode) && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="text-sm text-gray-600">
            已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
            {batchEditMode && '（点击批量编辑进入编辑模式）'}
            {batchDeleteMode && '（确认删除选中的记录）'}
          </div>
        </div>
      )}

      {/* 导出格式选择模态框 */}
      <WorkerAttendanceExport
        show={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onFormatChange={setExportFormat}
        onConfirm={handleConfirmWithModal}
        onCancel={() => setShowExportModal(false)}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={filteredData}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleConfirmBatchEdit}
        onConfirmNext={handleConfirmNext}
        departments={departmentOptions}
      />

      {/* 详情弹窗 */}
      <DetailModal
        isOpen={showDetailModal}
        record={detailRecord}
        onClose={() => {
          setShowDetailModal(false);
          setDetailRecord(null);
        }}
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
