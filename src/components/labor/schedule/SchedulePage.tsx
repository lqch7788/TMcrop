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
import { useSchedule } from './hooks/useSchedule';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ScheduleTable } from './ScheduleTable';
import { ShiftEditor } from './ShiftEditor';
import { SwapRequestModal, SwapRequestList } from './SwapRequestModal';
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

  // 新排班表单状态
  const [newSchedule, setNewSchedule] = useState({
    staffId: '',
    staffName: '',
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
        date: selectedDate,
        status: '已排班',
      });
      setShowAddModal(false);
      setNewSchedule({ staffId: '', staffName: '', shift: '早班', workZone: '' });
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
            <button
              onClick={() => setDisplayMode('calendar')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${displayMode === 'calendar' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              <CalendarDays className="w-4 h-4" />
              日历视图
            </button>
            <button
              onClick={() => setDisplayMode('table')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${displayMode === 'table' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              <List className="w-4 h-4" />
              表格视图
            </button>
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSwapModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Users className="w-4 h-4" />
              调班申请
            </button>
            <button
              onClick={() => setShowShiftEditor(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              班次设置
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增排班
            </button>
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
            <ScheduleTable
              scheduleList={scheduleList}
              shiftConfigs={shiftConfigs}
              onScheduleClick={handleScheduleClick}
            />
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
                  <button
                    onClick={() => cancelSchedule(selectedSchedule.id)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                  >
                    取消排班
                  </button>
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium text-gray-800">新增排班</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">选择员工</label>
                <select
                  value={newSchedule.staffId}
                  onChange={e => {
                    const staff = MOCK_STAFF.find(s => s.id === e.target.value);
                    setNewSchedule({
                      ...newSchedule,
                      staffId: e.target.value,
                      staffName: staff?.name || '',
                      workZone: staff?.workZone || '',
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择员工</option>
                  {MOCK_STAFF.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} - {staff.workZone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">选择班次</label>
                <select
                  value={newSchedule.shift}
                  onChange={e => setNewSchedule({ ...newSchedule, shift: e.target.value as ShiftType })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {shiftConfigs.map(config => (
                    <option key={config.name} value={config.name}>
                      {config.name} ({config.startTime}-{config.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">排班日期</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleAddSchedule}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulePage;
